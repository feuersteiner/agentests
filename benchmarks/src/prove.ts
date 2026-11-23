import { randomBytes } from 'node:crypto';
import { cpSync, mkdirSync, readdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { join, sep } from 'node:path';
import { runProcess } from './command.ts';
import type { DatasetEntry } from './dataset.ts';
import { toChildEnv } from './environment.ts';
import {
	checkGates,
	formatUsd,
	pool,
	readRepository,
	runsDirectory,
	stopOn,
	toColumns
} from './harness.ts';
import { toCost } from './prices.ts';
import type { ModelPrice } from './prices.ts';
import { startProxy } from './proxy.ts';
import type { DecisionProxy } from './proxy.ts';
import { prepareToolchain } from './toolchain.ts';
import { gates } from './types.ts';
import type { GateArm } from './types.ts';
import { toConfig } from './workspace.ts';

/** Everything one proof needs. */
export interface ProveSettings {
	entries: DatasetEntry[];
	arms: GateArm[];
	/** Evals of one entry that run side by side. */
	concurrency: number;
	datasetDirectory: string;
	pricesFile: string;
	upstreams: Record<GateArm, string>;
}

/** An eval's outcome: the Test's, or `refused` when a decision was refused, worth 0, or `error` for any other failure. */
export type ProofOutcome = 'pass' | 'fail' | 'skip' | 'refused' | 'error';

/** One eval proved on one decision model. */
export interface EvalProof {
	eval: string;
	expected: string;
	actual: ProofOutcome;
	matches: boolean;
	error?: string;
	decisions: number;
	refusals: number;
	inputTokens: number;
	outputTokens: number;
	costUsd: number;
	seconds: number;
}

/** One entry's evals proved on one decision model, with their totals. */
export interface ArmProof {
	model: string;
	matches: number;
	total: number;
	refused: number;
	errors: number;
	decisions: number;
	inputTokens: number;
	outputTokens: number;
	costUsd: number;
	evals: EvalProof[];
}

/** What every eval of a proof shares. */
interface ProofContext {
	folder: string;
	proxy: DecisionProxy;
	modules: string;
	prices: Partial<Record<GateArm, ModelPrice>>;
}

/** How long one eval may take before it is killed and reported as an error. */
const evalTimeoutMs = 5 * 60 * 1000;

/** The line the eval orchestrator logs for an eval: `✓` or `✗`, the expected and the actual outcome. */
const outcomeLine = /[✓✗] Expected (\w+), got (\w+)/;

/** The eval folders of an entry's Test, sorted by name. */
const listEvals = (entry: DatasetEntry): string[] =>
	readdirSync(join(entry.directory, 'gate', 'evals'), { withFileTypes: true })
		.filter((item) => item.isDirectory())
		.map((item) => item.name)
		.sort();

/** The outcome an eval's `eval.yaml` expects. */
const readExpected = (entry: DatasetEntry, name: string): string => {
	const parsed: unknown = Bun.YAML.parse(
		readFileSync(join(entry.directory, 'gate', 'evals', name, 'eval.yaml'), 'utf8')
	);
	const expect = (parsed as { expect?: unknown } | null)?.expect;
	return typeof expect === 'string' ? expect : 'unknown';
};

/** The first `Error: ...` line of the package's output, or its last lines. */
const toErrorText = (stdout: string, stderr: string): string => {
	const text = `${stderr}\n${stdout}`;
	return (
		/^Error: .*$/m.exec(text)?.[0] ?? text.trim().split('\n').slice(-3).join(' | ').slice(0, 500)
	);
};

/**
 * Prove one eval on one decision model: a folder holding the Test with only this eval, so a refusal or an error
 * on it cannot stop the others, run with `npx agentests eval` through the proxy.
 */
const proveEval = async (
	entry: DatasetEntry,
	arm: GateArm,
	name: string,
	context: ProofContext
): Promise<EvalProof> => {
	const token = randomBytes(8).toString('hex');
	const directory = join(context.folder, entry.id, arm, name);
	const repo = join(directory, 'repo');
	const gate = join(entry.directory, 'gate');
	const evals = join(gate, 'evals');
	const kept = join(evals, name);
	cpSync(gate, join(repo, '.agents', 'tests', entry.id), {
		recursive: true,
		filter: (source) =>
			!source.startsWith(`${evals}${sep}`) || source === kept || source.startsWith(`${kept}${sep}`)
	});
	writeFileSync(
		join(repo, 'agentests.config.yaml'),
		toConfig(arm, `${context.proxy.url}/${token}/v1`)
	);
	symlinkSync(context.modules, join(repo, 'node_modules'));
	context.proxy.open(token, arm, join(directory, 'proxy.jsonl'));
	const started = performance.now();
	const exit = await runProcess(
		'npx',
		['agentests', 'eval', entry.id],
		repo,
		toChildEnv(),
		evalTimeoutMs
	);
	const seconds = Math.round((performance.now() - started) / 100) / 10;
	const records = context.proxy.close(token);
	writeFileSync(join(directory, 'output.log'), `${exit.stdout}\n${exit.stderr}`);
	const expected = readExpected(entry, name);
	const match = outcomeLine.exec(exit.stdout);
	const refusals = records.reduce((total, record) => total + record.refusals, 0);
	const inputTokens = records.reduce((total, record) => total + record.inputTokens, 0);
	const outputTokens = records.reduce((total, record) => total + record.outputTokens, 0);
	const billed = records.filter((record) => record.status >= 200 && record.status < 300).length;
	const actual: ProofOutcome =
		refusals > 0
			? 'refused'
			: (exit.code === 0 || exit.code === 1) && match
				? (match[2] as ProofOutcome)
				: 'error';
	return {
		eval: name,
		expected,
		actual,
		matches: actual === expected,
		...(actual === 'refused' || actual === 'error'
			? { error: toErrorText(exit.stdout, exit.stderr) }
			: {}),
		decisions: records.length,
		refusals,
		inputTokens,
		outputTokens,
		costUsd: toCost(context.prices[arm]!, { inputTokens, outputTokens, requests: billed }),
		seconds
	};
};

/** The totals of an entry's evals on one model. */
const toArmProof = (arm: GateArm, evals: EvalProof[]): ArmProof => {
	const sum = (field: 'decisions' | 'inputTokens' | 'outputTokens' | 'costUsd') =>
		evals.reduce((total, proof) => total + proof[field], 0);
	return {
		model: gates[arm].model,
		matches: evals.filter((proof) => proof.matches).length,
		total: evals.length,
		refused: evals.filter((proof) => proof.actual === 'refused').length,
		errors: evals.filter((proof) => proof.actual === 'error').length,
		decisions: sum('decisions'),
		inputTokens: sum('inputTokens'),
		outputTokens: sum('outputTokens'),
		costUsd: sum('costUsd'),
		evals
	};
};

/** One entry on one model as a heading and a table of its evals. */
const toReport = (id: string, arm: GateArm, proof: ArmProof): string =>
	[
		`${id} on ${arm} (${proof.model}): ${proof.matches} of ${proof.total} eval(s) match` +
			`${proof.refused ? `, ${proof.refused} refused` : ''}${proof.errors ? `, ${proof.errors} error(s)` : ''}; ` +
			`${proof.decisions} decision call(s), ${proof.inputTokens} input and ${proof.outputTokens} output token(s), ${formatUsd(proof.costUsd)} USD`,
		toColumns([
			['eval', 'expected', 'actual', 'match', 'decisions', 'error'],
			...proof.evals.map((item) => [
				item.eval,
				item.expected,
				item.actual,
				item.matches ? 'yes' : 'no',
				String(item.decisions),
				item.error ?? ''
			])
		]),
		''
	].join('\n');

/**
 * Prove every entry's evals on every requested decision model, one eval at a time per folder, and write
 * `proof.json` in an invocation folder under the runs directory after each eval. Makes decision calls only.
 */
export const runProof = async (settings: ProveSettings): Promise<void> => {
	const { keys, prices, problems } = checkGates(settings.arms, settings.pricesFile);
	stopOn(problems);
	const folder = join(runsDirectory, `prove-${new Date().toISOString().replace(/[:.]/g, '-')}`);
	mkdirSync(folder, { recursive: true });
	console.log(`Proof folder: ${folder}`);
	console.log('Preparing the agentests toolchain (npm pack of core/, installed once)');
	const modules = await prepareToolchain(join(folder, 'toolchain'));
	const proxy = startProxy(settings.upstreams, keys);
	const proof: Record<string, Partial<Record<GateArm, ArmProof>>> = {};
	const manifest = {
		startedAt: new Date().toISOString(),
		repository: await readRepository(),
		dataset: settings.datasetDirectory,
		prices: {
			file: settings.pricesFile,
			...Object.fromEntries(settings.arms.map((arm) => [gates[arm].model, prices[arm]]))
		},
		upstreams: Object.fromEntries(settings.arms.map((arm) => [arm, settings.upstreams[arm]])),
		concurrency: settings.concurrency
	};
	const file = join(folder, 'proof.json');
	const write = (extra: Record<string, unknown> = {}) =>
		writeFileSync(
			file,
			`${JSON.stringify({ ...manifest, ...extra, entries: proof }, null, '\t')}\n`
		);
	try {
		for (const entry of settings.entries)
			for (const arm of settings.arms) {
				const names = listEvals(entry);
				const results: EvalProof[] = [];
				console.log(`Proving ${entry.id} on ${arm}: ${names.length} eval(s)`);
				await pool(names, settings.concurrency, async (name, index) => {
					results[index] = await proveEval(entry, arm, name, { folder, proxy, modules, prices });
					(proof[entry.id] ??= {})[arm] = toArmProof(arm, results.filter(Boolean));
					write();
				});
				const done = toArmProof(arm, results);
				(proof[entry.id] ??= {})[arm] = done;
				write();
				console.log(toReport(entry.id, arm, done));
			}
		write({ finishedAt: new Date().toISOString() });
	} finally {
		await proxy.stop();
	}
	console.log(`Proof: ${file}`);
};
