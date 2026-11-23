import { resolve } from 'node:path';
import { datasetDirectory } from './dataset.ts';
import type { HarnessSettings } from './harness.ts';
import { pricesFile } from './prices.ts';
import type { ProveSettings } from './prove.ts';
import { arms, defaultRulesPerRun, gates, isGateArm } from './types.ts';
import type { Arm } from './types.ts';

/** The options both `benchmark` and `benchmark:pilot` take, for `parseArgs`. */
export const harnessOptions = {
	arm: { type: 'string', multiple: true },
	concurrency: { type: 'string' },
	dataset: { type: 'string' },
	prices: { type: 'string' },
	'openai-upstream': { type: 'string' },
	'jev-upstream': { type: 'string' },
	'timeout-minutes': { type: 'string' },
	'agent-budget-usd': { type: 'string' },
	'judge-budget-usd': { type: 'string' },
	'rules-per-run': { type: 'string' }
} as const;

/** What `parseArgs` returns for `harnessOptions`. */
export interface HarnessValues {
	arm?: string[];
	concurrency?: string;
	dataset?: string;
	prices?: string;
	'openai-upstream'?: string;
	'jev-upstream'?: string;
	'timeout-minutes'?: string;
	'agent-budget-usd'?: string;
	'judge-budget-usd'?: string;
	'rules-per-run'?: string;
}

/** The shared options' help lines. */
export const harnessHelp = [
	'  --arm <arm>                 baseline, skill, luna or jev; repeatable; default all four',
	'  --concurrency <n>           runs side by side; default 4',
	'  --timeout-minutes <n>       wall-clock limit of one agent run; default 20',
	"  --agent-budget-usd <n>      the agent's --max-budget-usd; default 3",
	"  --judge-budget-usd <n>      the judge's --max-budget-usd; default 1",
	`  --rules-per-run <n>         rules a skill or gate run holds: its own and same-domain companions; default ${defaultRulesPerRun}`,
	'  --dataset <folder>          the dataset folder; default benchmark/v1/workbench/dataset',
	'  --prices <file>             the prices file; default benchmark/v1/workbench/prices.yaml',
	`  --openai-upstream <url>     where the proxy sends luna's decisions; default ${gates.luna.upstream}`,
	`  --jev-upstream <url>        where the proxy sends jev's decisions; default ${gates.jev.upstream}`
].join('\n');

/** A positive number from an option, or the default when it is absent. */
const toPositive = (
	name: string,
	value: string | undefined,
	fallback: number,
	whole = false
): number => {
	if (value === undefined) return fallback;
	const number = Number(value);
	if (!Number.isFinite(number) || number <= 0 || (whole && !Number.isInteger(number)))
		throw new Error(`--${name} takes a positive ${whole ? 'whole ' : ''}number, not "${value}"`);
	return number;
};

/** The arms `--arm` names, in the canonical order, or all four. */
const toArms = (values: string[] | undefined): Arm[] => {
	if (!values?.length) return [...arms];
	for (const value of values)
		if (!(arms as readonly string[]).includes(value))
			throw new Error(`Unknown --arm "${value}"; use ${arms.join(', ')}`);
	return arms.filter((arm) => values.includes(arm));
};

/** An upstream base URL from an option, or the real one. */
const toUpstream = (name: string, value: string | undefined, fallback: string): string => {
	if (value === undefined) return fallback;
	if (!/^https?:\/\/[^/]/.test(value))
		throw new Error(`--${name} takes an http or https URL, not "${value}"`);
	return value.replace(/\/$/, '');
};

/** The settings the shared options give, every one but the tests and the seed. */
export const toSettings = (
	values: HarnessValues
): Omit<HarnessSettings, 'tests' | 'seed' | 'entries'> => ({
	arms: toArms(values.arm),
	concurrency: toPositive('concurrency', values.concurrency, 4, true),
	datasetDirectory: values.dataset === undefined ? datasetDirectory : resolve(values.dataset),
	pricesFile: values.prices === undefined ? pricesFile : resolve(values.prices),
	upstreams: {
		luna: toUpstream('openai-upstream', values['openai-upstream'], gates.luna.upstream),
		jev: toUpstream('jev-upstream', values['jev-upstream'], gates.jev.upstream)
	},
	timeoutMinutes: toPositive('timeout-minutes', values['timeout-minutes'], 20),
	agentBudgetUsd: toPositive('agent-budget-usd', values['agent-budget-usd'], 3),
	judgeBudgetUsd: toPositive('judge-budget-usd', values['judge-budget-usd'], 1),
	rulesPerRun: toPositive('rules-per-run', values['rules-per-run'], defaultRulesPerRun, true)
});

/** The options `benchmark:prove` takes, for `parseArgs`. */
export const proveOptions = {
	entry: { type: 'string', multiple: true },
	arm: { type: 'string', multiple: true },
	concurrency: { type: 'string' },
	dataset: { type: 'string' },
	prices: { type: 'string' },
	'openai-upstream': { type: 'string' },
	'jev-upstream': { type: 'string' },
	toolchain: { type: 'string' }
} as const;

/** What `parseArgs` returns for `proveOptions`. */
export type ProveValues = Pick<
	HarnessValues,
	'arm' | 'concurrency' | 'dataset' | 'prices' | 'openai-upstream' | 'jev-upstream'
> & { entry?: string[]; toolchain?: string };

/** The prove options' help lines. */
export const proveHelp = [
	'  --entry <rule-id>           prove this entry; repeatable; default every entry of the dataset',
	'  --arm <arm>                 luna or jev; repeatable; default both',
	'  --concurrency <n>           evals of one entry run side by side; default 4',
	'  --dataset <folder>          the dataset folder; default benchmark/v1/workbench/dataset',
	'  --prices <file>             the prices file; default benchmark/v1/workbench/prices.yaml',
	`  --openai-upstream <url>     where the proxy sends luna's decisions; default ${gates.luna.upstream}`,
	`  --jev-upstream <url>        where the proxy sends jev's decisions; default ${gates.jev.upstream}`,
	'  --toolchain <folder>        reuse the packed core/ in this folder, or prepare it there once; default a new one per proof'
].join('\n');

/** The settings the prove options give, every one but the entries. */
export const toProveSettings = (values: ProveValues): Omit<ProveSettings, 'entries'> => {
	const chosen = toArms(values.arm?.length ? values.arm : ['luna', 'jev']);
	const gateArms = chosen.filter(isGateArm);
	if (gateArms.length !== chosen.length)
		throw new Error(
			'benchmark:prove takes --arm luna or --arm jev, the arms with a decision model'
		);
	return {
		arms: gateArms,
		concurrency: toPositive('concurrency', values.concurrency, 4, true),
		datasetDirectory: values.dataset === undefined ? datasetDirectory : resolve(values.dataset),
		pricesFile: values.prices === undefined ? pricesFile : resolve(values.prices),
		upstreams: {
			luna: toUpstream('openai-upstream', values['openai-upstream'], gates.luna.upstream),
			jev: toUpstream('jev-upstream', values['jev-upstream'], gates.jev.upstream)
		},
		...(values.toolchain === undefined ? {} : { toolchain: resolve(values.toolchain) })
	};
};
