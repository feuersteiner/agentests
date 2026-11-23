import type { Domain } from './catalogue.ts';

/** The conditions every test runs in, in the order runs are listed. */
export const arms = ['baseline', 'skill', 'luna', 'jev'] as const;

/** One condition: the task alone, the task with a force-invoked skill, or the task behind an agentests gate. */
export type Arm = (typeof arms)[number];

/** An arm whose repository has the compiled Test and the pre-commit hook. */
export type GateArm = Extract<Arm, 'luna' | 'jev'>;

export const isGateArm = (arm: Arm): arm is GateArm => arm === 'luna' || arm === 'jev';

/** The Claude Code models of the agent and the judge. */
export const models = { agent: 'claude-sonnet-5-5', judge: 'claude-fable-5-2' } as const;

/** How a gate arm decides: the config's `decision` section, the real upstream, and the one path the proxy forwards. */
export interface Gate {
	api: 'openai' | 'jev';
	model: string;
	keyEnv: 'OPENAI_API_KEY' | 'TYPESAFE_AI_API_KEY';
	upstream: string;
	path: string;
}

/** The decision side of each gate arm, as `agentests init --decision openai` and `--decision jev` write it. */
export const gates: Record<GateArm, Gate> = {
	luna: {
		api: 'openai',
		model: 'gpt-6-luna',
		keyEnv: 'OPENAI_API_KEY',
		upstream: 'https://api.openai.com/v1',
		path: '/decisions'
	},
	jev: {
		api: 'jev',
		model: 'jev-latest',
		keyEnv: 'TYPESAFE_AI_API_KEY',
		upstream: 'https://api.typesafe.ai/v1',
		path: '/systemone'
	}
};

/**
 * How a run ended. `gate-refused` is a run with no commit in which the decision model refused a decision, the
 * refusal counted as an answer worth 0; `agent-error`, `gate-error` and `judge-error` are failures of the machinery
 * and have no score.
 */
export type RunStatus =
	| 'completed'
	| 'no-commit'
	| 'timeout'
	| 'gate-refused'
	| 'agent-error'
	| 'gate-error'
	| 'judge-error';

/** What the agent did and spent, from its final `result` event and from Git. */
export interface AgentOutcome {
	model: string;
	costUsd: number;
	/** Every input token, cache reads and writes included. */
	inputTokens: number;
	outputTokens: number;
	cacheReadTokens: number;
	cacheWriteTokens: number;
	turns: number;
	commits: number;
	/** The `result` event's `subtype`, such as `success`; `none` when the process left no `result` event. */
	stop: string;
	/** Whether changes were left uncommitted, tracked or untracked. */
	uncommitted: boolean;
	/** Skill arm only: whether the session shows the skill's body injected with the task as its arguments. */
	skillLoaded?: boolean;
}

/** What the gate saw and cost, from the hook log, the proxy log, the transcript and the files. */
export interface GateOutcome {
	model: string;
	costUsd: number;
	inputTokens: number;
	outputTokens: number;
	/** Decision requests forwarded, whatever their status. */
	decisions: number;
	/** Decisions the model refused; each makes the hook exit with a setup or API error. */
	refusals: number;
	/** Summed duration of the decision requests. */
	seconds: number;
	/** Summed wall time spent inside the pre-commit hook. */
	hookSeconds: number;
	attempts: number;
	blocked: number;
	errors: number;
	readTest: boolean;
	changedTest: boolean;
	bypassedHook: boolean;
}

/** The judge's answer and what it cost. */
export interface JudgeOutcome {
	model: string;
	score: number;
	taskDone: boolean;
	reason: string;
	costUsd: number;
}

/** One run: one test in one arm. */
export interface RunResult {
	/** `${rule}/${task}/${arm}`, also its key in `results.json`. */
	key: string;
	/** Agent start to agent exit, gate time included. */
	durationSeconds: number;
	/** The agent's cost plus the decision model's; the judge is not counted. */
	costUsd: number;
	/** 0 to 10; null only when the run could not be judged. */
	score: number | null;

	rule: string;
	task: number;
	arm: Arm;
	domain: Domain;
	status: RunStatus;
	/** The machinery's error, for `agent-error`, `gate-error` and `judge-error`. */
	error?: string;
	/** The run's folder of logs and answers, relative to the run folder. */
	folder: string;
	/** The agent's workspace, relative to the run folder. */
	workspace: string;

	agent: AgentOutcome;
	gate?: GateOutcome;
	judge: JudgeOutcome | null;
}
