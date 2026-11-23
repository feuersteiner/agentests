import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { toAgentArgs } from './agent.ts';
import { killAll } from './claude.ts';
import { runCommand } from './command.ts';
import { findSkillPlaceholders } from './dataset.ts';
import type { DatasetEntry } from './dataset.ts';
import { pickCompanions } from './companions.ts';
import { readKeys } from './environment.ts';
import { toJudgeArgs } from './judge.ts';
import { loadPrices } from './prices.ts';
import type { ModelPrice } from './prices.ts';
import { startProxy } from './proxy.ts';
import type { DecisionProxy } from './proxy.ts';
import { runOne, toKey } from './run.ts';
import type { RunContext, RunPlan } from './run.ts';
import { arms as allArms, gates, isGateArm, models } from './types.ts';
import type { Arm, GateArm, RunResult } from './types.ts';
import { prepareToolchain } from './toolchain.ts';

/** One test to run: a dataset entry and one of its tasks. */
export interface PlannedTest {
	entry: DatasetEntry;
	task: number;
}

/** Everything one invocation needs. */
export interface HarnessSettings {
	tests: PlannedTest[];
	/** The whole dataset, which each test's companions are drawn from. */
	entries: DatasetEntry[];
	/** How many rules a skill-arm or gate-arm run holds: the test's own and its companions. */
	rulesPerRun: number;
	arms: Arm[];
	concurrency: number;
	datasetDirectory: string;
	pricesFile: string;
	upstreams: Record<GateArm, string>;
	timeoutMinutes: number;
	agentBudgetUsd: number;
	judgeBudgetUsd: number;
	/** The pilot's seed, when the tests were picked. */
	seed?: number;
}

/** Where every invocation's run folder goes, outside the repository. */
export const runsDirectory = join(tmpdir(), 'agentests-benchmark');

const repositoryDirectory = join(import.meta.dirname, '..', '..');

/** What the gate arms need, and every problem that stops them. */
export interface GateCheck {
	keys: Partial<Record<GateArm, string>>;
	prices: Partial<Record<GateArm, ModelPrice>>;
	problems: string[];
}

/** Throw one error listing `problems`, when there are any, before anything runs. */
export const stopOn = (problems: string[]): void => {
	if (problems.length)
		throw new Error(
			`Cannot start; nothing was run:\n${problems.map((problem) => `  - ${problem}`).join('\n')}`
		);
};

/** The real keys and prices of the requested gate arms, with a problem for each one missing. */
export const checkGates = (gateArms: GateArm[], pricesFile: string): GateCheck => {
	if (gateArms.length === 0) return { keys: {}, prices: {}, problems: [] };
	const found = readKeys();
	const problems: string[] = [];
	let prices: ReturnType<typeof loadPrices> | undefined;
	try {
		prices = loadPrices(pricesFile);
	} catch (error) {
		problems.push(error instanceof Error ? error.message : String(error));
	}
	const keys: Partial<Record<GateArm, string>> = {};
	const known: Partial<Record<GateArm, ModelPrice>> = {};
	for (const arm of gateArms) {
		const { keyEnv, model } = gates[arm];
		const key = found[keyEnv];
		if (key) keys[arm] = key;
		else problems.push(`the ${arm} arm needs ${keyEnv} in the environment or the root .env`);
		if (!prices) continue;
		const price = prices.models[model];
		if (price) known[arm] = price;
		else
			problems.push(
				price === null
					? `the ${arm} arm needs a price for ${model}, which ${pricesFile} gives as unknown`
					: `the ${arm} arm needs a price for ${model}, which ${pricesFile} lacks`
			);
	}
	return { keys, prices: known, problems };
};

/**
 * A problem for each argument placeholder in a skill the skill arm would load: Claude Code replaces it with a
 * word of the prompt, so the agent would get other text than the dataset's.
 */
const checkSkills = (plans: RunPlan[]): string[] =>
	plans.some((plan) => plan.arm === 'skill')
		? [
				...new Set(
					plans
						.filter((plan) => plan.arm === 'skill')
						.flatMap((plan) => [plan.entry, ...plan.companions])
				)
			].flatMap((entry) =>
				findSkillPlaceholders(entry).map(
					(found) =>
						`${entry.id}: skill/SKILL.md ${found} is an argument placeholder to Claude Code, which would replace it with a word of the prompt; escape it as \\$ so the skill arm gets the text as written`
				)
			)
		: [];

/** The repository's commit, and whether its working tree differs from it. */
export const readRepository = async () => ({
	commit: (await runCommand('git', ['rev-parse', 'HEAD'], repositoryDirectory)).trim(),
	dirty: (await runCommand('git', ['status', '--porcelain'], repositoryDirectory)).trim().length > 0
});

/** Run `work` over `items`, at most `limit` at a time. */
export const pool = async <T>(
	items: T[],
	limit: number,
	work: (item: T, index: number) => Promise<void>
) => {
	let next = 0;
	const worker = async () => {
		while (next < items.length) {
			const index = next++;
			await work(items[index]!, index);
		}
	};
	await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
};

export const formatUsd = (value: number): string => value.toFixed(4);

/** Rows as aligned columns, the first row the header. */
export const toColumns = (rows: string[][]): string => {
	const widths = rows[0]!.map((_, column) => Math.max(...rows.map((row) => row[column]!.length)));
	return rows
		.map((row) =>
			row
				.map((cell, column) => cell.padEnd(widths[column]!))
				.join('  ')
				.trimEnd()
		)
		.join('\n');
};

/** The results as a small table: one line per run, with a column of refusals when there are any. */
const toTable = (results: RunResult[]): string => {
	const refused = results.some((result) => (result.gate?.refusals ?? 0) > 0);
	return toColumns([
		[
			'run',
			'status',
			'score',
			'seconds',
			'cost USD',
			'judge USD',
			'blocked',
			...(refused ? ['refused'] : [])
		],
		...results.map((result) => [
			result.key,
			result.status,
			result.score === null ? '-' : String(result.score),
			result.durationSeconds.toFixed(0),
			formatUsd(result.costUsd),
			result.judge ? formatUsd(result.judge.costUsd) : '-',
			result.gate ? `${result.gate.blocked}/${result.gate.attempts}` : '-',
			...(refused ? [result.gate ? String(result.gate.refusals) : '-'] : [])
		])
	]);
};

/** One progress line for a finished run. */
const toDoneLine = (result: RunResult): string =>
	[
		`done  ${result.key}: ${result.status}`,
		`score ${result.score ?? '-'}`,
		`${result.durationSeconds.toFixed(0)} s`,
		`${formatUsd(result.costUsd)} USD`,
		...(result.agent.skillLoaded === undefined
			? []
			: [result.agent.skillLoaded ? 'skill loaded' : 'skill not loaded']),
		...(result.gate ? [`${result.gate.blocked} of ${result.gate.attempts} commit(s) blocked`] : []),
		...(result.gate?.refusals ? [`${result.gate.refusals} decision(s) refused`] : []),
		...(result.error ? [`error: ${result.error.split('\n')[0]}`] : [])
	].join(', ');

/**
 * Run every planned test in every requested arm and write the run folder: `run.json`, a folder per run,
 * `results.json` after each finished run, then a zip of it all beside it, without `node_modules`.
 */
export const runBenchmark = async (settings: HarnessSettings): Promise<void> => {
	const gateArms = allArms.filter(
		(arm): arm is GateArm => isGateArm(arm) && settings.arms.includes(arm)
	);
	const { keys, prices, problems } = checkGates(gateArms, settings.pricesFile);
	const plans: RunPlan[] = settings.tests.flatMap(({ entry, task }) => {
		const companions = pickCompanions(entry, task, settings.entries, settings.rulesPerRun - 1);
		return allArms
			.filter((arm) => settings.arms.includes(arm))
			.map((arm) => ({ entry, task, arm, companions }));
	});
	stopOn([...problems, ...checkSkills(plans)]);
	const claudeVersion = (await runCommand('claude', ['--version'], repositoryDirectory)).trim();
	const runId = new Date().toISOString().replace(/[:.]/g, '-');
	const folder = join(runsDirectory, runId);
	mkdirSync(folder, { recursive: true });
	const timeoutMs = settings.timeoutMinutes * 60 * 1000;
	const manifest = {
		runId,
		startedAt: new Date().toISOString(),
		repository: await readRepository(),
		claudeCode: claudeVersion,
		models: {
			agent: models.agent,
			judge: models.judge,
			judgeFallback: `${models.judgeFallback} at ${models.judgeFallbackEffort} effort`,
			...Object.fromEntries(gateArms.map((arm) => [arm, gates[arm].model]))
		},
		seed: settings.seed ?? null,
		prices: gateArms.length
			? {
					file: settings.pricesFile,
					...Object.fromEntries(gateArms.map((arm) => [gates[arm].model, prices[arm]]))
				}
			: null,
		concurrency: settings.concurrency,
		timeoutMinutes: settings.timeoutMinutes,
		agentBudgetUsd: settings.agentBudgetUsd,
		judgeBudgetUsd: settings.judgeBudgetUsd,
		rulesPerRun: settings.rulesPerRun,
		dataset: settings.datasetDirectory,
		upstreams: Object.fromEntries(gateArms.map((arm) => [arm, settings.upstreams[arm]])),
		commands: {
			agent: ['claude', ...toAgentArgs('<prompt>', settings.agentBudgetUsd)],
			judge: ['claude', ...toJudgeArgs(settings.judgeBudgetUsd), '< judge-prompt.md']
		},
		runs: plans.map(toKey),
		companions: Object.fromEntries(
			settings.tests.map(({ entry, task }) => [
				`${entry.id}/${task}`,
				plans
					.find((plan) => plan.entry === entry && plan.task === task)
					?.companions.map((c) => c.id) ?? []
			])
		)
	};
	const writeManifest = (extra: Record<string, unknown> = {}) =>
		writeFileSync(
			join(folder, 'run.json'),
			`${JSON.stringify({ ...manifest, ...extra }, null, '\t')}\n`
		);
	writeManifest();
	console.log(`Run folder: ${folder}`);
	console.log(`${plans.length} run(s), ${settings.concurrency} at a time`);

	let proxy: DecisionProxy | undefined;
	const interrupt = () => {
		killAll();
		void proxy?.stop();
		console.error(`Interrupted; results so far are in ${join(folder, 'results.json')}`);
		process.exit(130);
	};
	process.once('SIGINT', interrupt);
	process.once('SIGTERM', interrupt);
	try {
		let modules: string | undefined;
		if (gateArms.length) {
			console.log('Preparing the agentests toolchain (npm pack of core/, installed once)');
			modules = await prepareToolchain(join(folder, 'toolchain'));
			proxy = startProxy(settings.upstreams, keys);
			console.log(`Decision proxy on ${proxy.url}`);
		}
		const context: RunContext = {
			folder,
			timeoutMs,
			agentBudgetUsd: settings.agentBudgetUsd,
			judgeBudgetUsd: settings.judgeBudgetUsd,
			proxy,
			modules,
			prices,
			judge: { model: models.judge }
		};
		const results = new Map<string, RunResult>();
		const writeResults = () =>
			writeFileSync(
				join(folder, 'results.json'),
				`${JSON.stringify(
					Object.fromEntries(
						plans.flatMap((plan) => {
							const result = results.get(toKey(plan));
							return result ? [[result.key, result]] : [];
						})
					),
					null,
					'\t'
				)}\n`
			);
		writeResults();
		await pool(plans, settings.concurrency, async (plan, index) => {
			const counter = `[${index + 1}/${plans.length}]`;
			console.log(`${counter} start ${toKey(plan)}`);
			const result = await runOne(plan, context);
			results.set(result.key, result);
			writeResults();
			console.log(`${counter} ${toDoneLine(result)}`);
		});
		writeManifest({
			finishedAt: new Date().toISOString(),
			judgeFellBackAt: context.judge.fellBackAt ?? null
		});
		console.log('');
		console.log(toTable(plans.map((plan) => results.get(toKey(plan))!)));
	} finally {
		process.off('SIGINT', interrupt);
		process.off('SIGTERM', interrupt);
		await proxy?.stop();
	}
	const zip = `${folder}.zip`;
	await runCommand(
		'zip',
		['-q', '-r', '-y', zip, basename(folder), '-x', '*/node_modules', '*/node_modules/*'],
		dirname(folder)
	);
	console.log('');
	console.log(`Results: ${join(folder, 'results.json')}`);
	console.log(`Archive: ${zip}`);
};
