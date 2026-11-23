import { randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import {
	isSkillLoaded,
	keepSession,
	toAgentArgs,
	toAgentError,
	toAgentPrompt,
	toAgentUsage
} from './agent.ts';
import { removeProjectFolder, runClaude } from './claude.ts';
import type { DatasetEntry } from './dataset.ts';
import { toChildEnv } from './environment.ts';
import { runJudge } from './judge.ts';
import {
	bypassedHook,
	changedTest,
	observeGit,
	observeHook,
	readsTest,
	toToolUses
} from './observe.ts';
import type { GitObservation } from './observe.ts';
import { toCost } from './prices.ts';
import type { ModelPrice } from './prices.ts';
import type { DecisionProxy, ProxyRecord } from './proxy.ts';
import { gates, isGateArm, models } from './types.ts';
import type {
	AgentOutcome,
	Arm,
	GateArm,
	GateOutcome,
	JudgeOutcome,
	RunResult,
	RunStatus
} from './types.ts';
import { createWorkspace } from './workspace.ts';
import type { Workspace } from './workspace.ts';

/** One run to make: a dataset entry's task in one arm. */
export interface RunPlan {
	entry: DatasetEntry;
	task: number;
	arm: Arm;
}

/** What every run of an invocation shares. */
export interface RunContext {
	/** The invocation's run folder. */
	folder: string;
	timeoutMs: number;
	agentBudgetUsd: number;
	judgeBudgetUsd: number;
	/** Present when a gate arm is requested. */
	proxy?: DecisionProxy;
	modules?: string;
	prices: Partial<Record<GateArm, ModelPrice>>;
}

/** How long the judge may take. */
const judgeTimeoutMs = 10 * 60 * 1000;

export const toKey = ({ entry, task, arm }: RunPlan): string => `${entry.id}/${task}/${arm}`;

/** The decision side of a gate run, from the proxy's records and the hook log. */
const toGate = (
	arm: GateArm,
	records: ProxyRecord[],
	hookLog: string,
	price: ModelPrice,
	readTest: boolean,
	workspace: Workspace,
	bypassed: boolean
): GateOutcome => {
	const hook = observeHook(hookLog);
	const inputTokens = records.reduce((total, record) => total + record.inputTokens, 0);
	const outputTokens = records.reduce((total, record) => total + record.outputTokens, 0);
	const billed = records.filter((record) => record.status >= 200 && record.status < 300).length;
	return {
		model: gates[arm].model,
		costUsd: toCost(price, { inputTokens, outputTokens, requests: billed }),
		inputTokens,
		outputTokens,
		decisions: records.length,
		refusals: records.reduce((total, record) => total + record.refusals, 0),
		seconds: records.reduce((total, record) => total + record.ms, 0) / 1000,
		hookSeconds: hook.seconds,
		attempts: hook.attempts,
		blocked: hook.blocked,
		errors: hook.errors,
		readTest,
		changedTest: changedTest(workspace),
		bypassedHook: bypassed
	};
};

/**
 * The status before judging, or undefined when the run should be judged: a machinery error first, then a refusal
 * that left no commit, which outranks the time limit, then the gate's own errors, then no commit.
 */
const toStatus = (
	timedOut: boolean,
	error: string | undefined,
	gate: GateOutcome | undefined,
	commits: number
): RunStatus | undefined => {
	if (error !== undefined) return 'agent-error';
	if (gate && gate.refusals > 0 && commits === 0) return 'gate-refused';
	if (timedOut) return 'timeout';
	if (gate && gate.attempts > 0 && gate.errors === gate.attempts) return 'gate-error';
	if (commits === 0) return 'no-commit';
	return undefined;
};

/** Write the run's diffs to its folder. */
const saveDiffs = (directory: string, observed: GitObservation): void => {
	writeFileSync(join(directory, 'committed.diff'), observed.committedDiff);
	writeFileSync(join(directory, 'uncommitted.diff'), observed.uncommittedDiff);
};

/** Make one run: workspace, agent, observations, judge. Never throws: a failure of the harness is an `agent-error`. */
export const runOne = async (plan: RunPlan, context: RunContext): Promise<RunResult> => {
	const { entry, task, arm } = plan;
	const key = toKey(plan);
	const prompt = entry.tasks.get(task)!;
	const runDirectory = join(context.folder, 'runs', `${entry.id}--${task}--${arm}`);
	// A neutral path: the agent sees its working directory, which must name neither the rule nor the arm.
	const token = randomBytes(8).toString('hex');
	const workspaceDirectory = join(context.folder, 'workspaces', token, 'repo');
	mkdirSync(runDirectory, { recursive: true });
	const hookLog = join(runDirectory, 'hook.log');
	const base = {
		key,
		rule: entry.id,
		task,
		arm,
		domain: entry.domain,
		folder: relative(context.folder, runDirectory),
		workspace: relative(context.folder, workspaceDirectory)
	};
	const gateArm = isGateArm(arm) ? arm : undefined;
	try {
		if (gateArm) context.proxy!.open(token, gateArm, join(runDirectory, 'proxy.jsonl'));
		const workspace = await createWorkspace(
			entry,
			arm,
			workspaceDirectory,
			gateArm ? { url: `${context.proxy!.url}/${token}/v1`, modules: context.modules! } : undefined
		);
		const exit = await runClaude({
			args: toAgentArgs(toAgentPrompt(entry.id, prompt, arm), context.agentBudgetUsd),
			cwd: workspaceDirectory,
			env: toChildEnv(hookLog),
			stdoutPath: join(runDirectory, 'transcript.jsonl'),
			stderrPath: join(runDirectory, 'agent-stderr.log'),
			timeoutMs: context.timeoutMs
		});
		const records = gateArm ? context.proxy!.close(token) : [];
		const session = keepSession(exit.events, runDirectory);
		removeProjectFolder(workspaceDirectory);
		const usage = toAgentUsage(exit);
		const skillLoaded = arm === 'skill' ? isSkillLoaded(session, entry.id, prompt) : undefined;
		// A skill-arm run whose skill was not loaded is not a valid run of that arm.
		const error =
			(exit.timedOut ? undefined : toAgentError(exit)) ??
			(skillLoaded === false
				? `The skill arm's skill was not loaded: session.jsonl shows no skill message for .claude/skills/${entry.id} with the task as its arguments`
				: undefined);
		const observed = await observeGit(workspace);
		saveDiffs(runDirectory, observed);
		const uses = toToolUses(exit.events);
		const gate = gateArm
			? toGate(
					gateArm,
					records,
					hookLog,
					context.prices[gateArm]!,
					readsTest(uses),
					workspace,
					bypassedHook(uses, workspace)
				)
			: undefined;
		const agent: AgentOutcome = {
			model: models.agent,
			...usage,
			commits: observed.commits,
			stop: exit.timedOut ? 'timeout' : String(exit.result?.subtype ?? 'none'),
			uncommitted: observed.uncommittedDiff.length > 0,
			...(skillLoaded === undefined ? {} : { skillLoaded })
		};
		const shared = {
			...base,
			durationSeconds: Math.round(exit.seconds * 10) / 10,
			costUsd: agent.costUsd + (gate?.costUsd ?? 0),
			agent,
			...(gate ? { gate } : {})
		};
		const status = toStatus(exit.timedOut, error, gate, observed.commits);
		if (status === 'agent-error' || status === 'gate-error')
			return {
				...shared,
				score: null,
				status,
				error:
					error ??
					'Every pre-commit hook attempt exited with a setup or API error; see hook.log and proxy.jsonl',
				judge: null
			};
		if (status !== undefined) return { ...shared, score: 0, status, judge: null };
		let judge: JudgeOutcome;
		try {
			judge = await runJudge(
				{ task: prompt, rule: entry.rule, rubric: entry.rubric, diff: observed.judgeDiff },
				runDirectory,
				// Empty and neutral: the judge sees its working directory, which must not name the arm.
				join(context.folder, 'judges', token),
				context.judgeBudgetUsd,
				judgeTimeoutMs
			);
		} catch (error) {
			return {
				...shared,
				score: null,
				status: 'judge-error',
				error: error instanceof Error ? error.message : String(error),
				judge: null
			};
		}
		return { ...shared, score: judge.score, status: 'completed', judge };
	} catch (error) {
		if (gateArm) context.proxy!.close(token);
		return {
			...base,
			durationSeconds: 0,
			costUsd: 0,
			score: null,
			status: 'agent-error',
			error: `Harness: ${error instanceof Error ? error.message : String(error)}`,
			agent: {
				model: models.agent,
				costUsd: 0,
				inputTokens: 0,
				outputTokens: 0,
				cacheReadTokens: 0,
				cacheWriteTokens: 0,
				turns: 0,
				commits: 0,
				stop: 'none',
				uncommitted: false
			},
			judge: null
		};
	}
};
