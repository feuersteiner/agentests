import { createInterface } from 'node:readline';
import {
	existsSync,
	lstatSync,
	mkdirSync,
	readFileSync,
	readdirSync,
	realpathSync,
	renameSync,
	writeFileSync
} from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDossierSuite } from '../../v2/workbench/dossier-suite.ts';
import { packageDossier, sha256 } from '../../v2/workbench/dossier.ts';
import { evaluateGraded } from '../../v2/workbench/graded-provider.ts';
import { compileIsolatedCriteria } from './isolated-criteria.ts';
import { runIsolatedJudge } from './isolated-judge.ts';
import type { IsolatedCheckResult, IsolatedJudgeResult } from './isolated-judge.ts';
import {
	createIsolatedTransport,
	ISOLATED_EVIDENCE_PROMPT,
	ISOLATED_EVIDENCE_SCHEMA,
	ISOLATED_TRANSPORT_VERSION
} from './isolated-transport.ts';
import type { IsolatedHttpRecord } from './isolated-transport.ts';

export const isolatedPilotSettings = {
	protocol: 'isolated-judge-calibration-v1',
	model: 'gpt-6.2-astra',
	baselineModel: 'gpt-6.1-terra',
	caseId: 'complex-support-01',
	candidateIds: ['p01', 'p04'],
	criteriaPerCandidate: 24,
	maxIsolatedHttp: 48,
	maxBaselineHttp: 2,
	maxCompletionTokens: 6144,
	timeoutMs: 180000,
	concurrency: 2,
	passThreshold: 0.8,
	failThreshold: 0.2,
	pricing: 'Unavailable; token/call ceilings are enforced, not a dollar estimate.'
} as const;
const sourceIdentity = () => {
	const root = fileURLToPath(new URL('../../../', import.meta.url));
	const paths = [
		'bun.lock',
		'core/package.json',
		...[
			'isolated-cli.ts',
			'isolated-criteria.ts',
			'isolated-judge.ts',
			'isolated-transport.ts'
		].map((p) => `benchmark/v3/workbench/${p}`)
	];
	const walk = (directory: string, typescriptOnly: boolean): void => {
		for (const name of readdirSync(resolve(root, directory)).sort()) {
			if (name === 'node_modules' || name === '.git') continue;
			const path = `${directory}/${name}`,
				stat = lstatSync(resolve(root, path));
			if (stat.isSymbolicLink()) throw new Error('Symlink in runtime identity');
			if (stat.isDirectory()) walk(path, typescriptOnly);
			else if (stat.isFile() && (!typescriptOnly || name.endsWith('.ts'))) paths.push(path);
		}
	};
	walk('core/dist', false);
	walk('benchmark/v2/workbench', true);
	return Object.fromEntries(
		paths.sort().map((path) => [path, sha256(readFileSync(resolve(root, path)))])
	);
};
export const makeIsolatedPilotPlan = () => {
	const dossier = loadDossierSuite().find(
		(d) => d.task.scenarioId === isolatedPilotSettings.caseId
	);
	if (!dossier) throw new Error('Frozen calibration situation unavailable');
	const packets = packageDossier(dossier);
	const jobs = isolatedPilotSettings.candidateIds.map((id) => {
		const item = packets.find((p) => p.candidateId === id);
		if (!item) throw new Error('Frozen calibration candidate unavailable');
		const compiled = compileIsolatedCriteria(item.packet);
		return {
			candidateId: id,
			packet: item.packet,
			packetSha256: sha256(item.packet),
			criterionSetSha256: sha256(JSON.stringify(compiled.criteria)),
			criteria: compiled.criteria,
			coverage: compiled.coverage
		};
	});
	const snapshot = JSON.stringify({
		settings: isolatedPilotSettings,
		jobs,
		source: sourceIdentity(),
		transport: {
			version: ISOLATED_TRANSPORT_VERSION,
			schema: ISOLATED_EVIDENCE_SCHEMA,
			prompt: ISOLATED_EVIDENCE_PROMPT
		},
		runtime: { bun: Bun.version, platform: process.platform, arch: process.arch },
		interpretation:
			'Two synthetic development controls. Different model and decomposition are bundled; this is not a causal ablation or held-out accuracy measurement.'
	});
	return { snapshot, planHash: sha256(snapshot), jobs };
};

interface PilotJob {
	candidateId: string;
	checks: IsolatedCheckResult[];
	isolation?: IsolatedJudgeResult;
	baseline?: Awaited<ReturnType<typeof evaluateGraded>>;
	activeCriterion?: string;
	baselineState?: 'running' | 'completed' | 'failed' | 'interrupted-unknown';
	baselineStartedAt?: string;
	baselineFinishedAt?: string;
}
export interface IsolatedPilotIndex {
	version: 1;
	runId: string;
	status: 'running' | 'completed' | 'stopped';
	startedAt: string;
	finishedAt: string | null;
	planHash: string;
	snapshot: string;
	stoppedReason: string | null;
	jobs: PilotJob[];
	http: IsolatedHttpRecord[];
	baselineHttpAttempts: number;
}
const safeRunId = (id: string) => {
	if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,100}$/u.test(id)) throw new Error('Unsafe run ID');
};

/** A fresh bounded development calibration. No resume or automatic provider replay. */
export const runIsolatedCalibration = async (options: {
	runId: string;
	apiKey: string;
	root?: string;
	/** Offline fault tests only; production callers use the native implementations. */
	dependencies?: { judge?: typeof runIsolatedJudge; baseline?: typeof evaluateGraded };
}) => {
	safeRunId(options.runId);
	if (!options.apiKey || /[\s"\\]/u.test(options.apiKey))
		throw new Error('Invalid in-memory credential');
	const plan = makeIsolatedPilotPlan();
	const root = resolve(options.root ?? fileURLToPath(new URL('../results/raw/', import.meta.url)));
	mkdirSync(root, { recursive: true, mode: 0o700 });
	if (realpathSync(root) !== root) throw new Error('Unsafe result root');
	const directory = resolve(root, `isolated-${options.runId}`);
	if (existsSync(directory)) throw new Error('Run exists; no replay is permitted');
	mkdirSync(directory, { mode: 0o700 });
	const index: IsolatedPilotIndex = {
		version: 1,
		runId: options.runId,
		status: 'running',
		startedAt: new Date().toISOString(),
		finishedAt: null,
		planHash: plan.planHash,
		snapshot: plan.snapshot,
		stoppedReason: null,
		jobs: [],
		http: [],
		baselineHttpAttempts: 0
	};
	const redact = (value: unknown) =>
		JSON.stringify(value, null, 2).split(options.apiKey).join('[REDACTED]') + '\n';
	const save = () => {
		const path = resolve(directory, 'index.json'),
			temp = `${path}.tmp`;
		for (const file of [path, temp])
			if (existsSync(file) && lstatSync(file).isSymbolicLink())
				throw new Error('Unsafe evidence path');
		writeFileSync(temp, redact(index), { mode: 0o600 });
		renameSync(temp, path);
	};
	writeFileSync(
		resolve(directory, 'plan.json'),
		redact({ planHash: plan.planHash, snapshot: JSON.parse(plan.snapshot) }),
		{ mode: 0o600, flag: 'wx' }
	);
	save();
	const controller = new AbortController();
	const transport = createIsolatedTransport({
		apiKey: options.apiKey,
		model: isolatedPilotSettings.model,
		maxRequests: isolatedPilotSettings.maxIsolatedHttp,
		maxCompletionTokens: isolatedPilotSettings.maxCompletionTokens,
		timeoutMs: isolatedPilotSettings.timeoutMs,
		concurrency: isolatedPilotSettings.concurrency,
		signal: controller.signal,
		onRecord: (record) => {
			index.http.push(record);
			if (record.error) {
				index.stoppedReason ??= record.errorCode ?? record.error;
				controller.abort();
			}
			save();
		}
	});
	try {
		const outcomes = await Promise.allSettled(
			plan.jobs.map(async (job) => {
				try {
					if (index.stoppedReason) return;
					const state: PilotJob = { candidateId: job.candidateId, checks: [] };
					index.jobs.push(state);
					save();
					const decision = {
						api: 'openai' as const,
						model: isolatedPilotSettings.model,
						url: transport.url,
						apiKeyEnv: 'JUDGE_PLACEHOLDER',
						concurrency: 1
					};
					state.isolation = await (options.dependencies?.judge ?? runIsolatedJudge)({
						packet: job.packet,
						directory: resolve(directory, job.candidateId),
						config: {
							ignore: [],
							decision,
							reasoning: decision,
							select: { threshold: 0.8 },
							assert: { threshold: 0.8 }
						},
						env: transport.env,
						signal: controller.signal,
						onCriterionStart: (criterion) => {
							state.activeCriterion = criterion.id;
							save();
						},
						onResult: (check) => {
							state.checks.push(check);
							if (check.acceptance === 'error' || check.acceptance === 'not-run') {
								index.stoppedReason ??= check.error ?? 'native-check-incomplete';
								controller.abort();
							}
							save();
							console.log(`${job.candidateId} ${check.id}: ${check.acceptance}`);
						}
					});
					delete state.activeCriterion;
					save();
					if (index.stoppedReason || controller.signal.aborted) return;
					state.baselineState = 'running';
					state.baselineStartedAt = new Date().toISOString();
					save();
					try {
						state.baseline = await (options.dependencies?.baseline ?? evaluateGraded)(
							{
								api: 'openai',
								url: 'https://api.openai.com/v1',
								model: isolatedPilotSettings.baselineModel,
								apiKeyEnv: 'OPENAI_API_KEY',
								apiKey: options.apiKey,
								maxOutputTokens: isolatedPilotSettings.maxCompletionTokens,
								fetch: (async (...args: Parameters<typeof fetch>) => {
									if (
										controller.signal.aborted ||
										index.baselineHttpAttempts >= isolatedPilotSettings.maxBaselineHttp
									)
										throw new Error('Baseline call cap');
									index.baselineHttpAttempts++;
									save();
									return fetch(...args);
								}) as typeof fetch
							},
							job.packet,
							AbortSignal.any([
								controller.signal,
								AbortSignal.timeout(isolatedPilotSettings.timeoutMs)
							])
						);
						state.baselineState = state.baseline.status === 'completed' ? 'completed' : 'failed';
					} catch (error) {
						state.baselineState = 'interrupted-unknown';
						throw error;
					} finally {
						state.baselineFinishedAt = new Date().toISOString();
						save();
					}
					if (state.baseline.status !== 'completed') {
						index.stoppedReason ??= state.baseline.errorCode ?? state.baseline.status;
						controller.abort();
					}
					save();
				} catch (error) {
					index.stoppedReason ??= 'candidate-interrupted-or-unknown-no-replay';
					controller.abort();
					throw error;
				}
			})
		);
		if (outcomes.some((outcome) => outcome.status === 'rejected'))
			throw new Error('Candidate evaluation interrupted');
	} catch {
		index.stoppedReason ??= 'interrupted-or-unknown-no-replay';
	} finally {
		await transport.stop();
		const complete =
			index.jobs.length === plan.jobs.length &&
			plan.jobs.every((planned) => {
				const matches = index.jobs.filter((job) => job.candidateId === planned.candidateId);
				const job = matches[0];
				return (
					matches.length === 1 &&
					job?.checks.length === isolatedPilotSettings.criteriaPerCandidate &&
					new Set(job.checks.map((check) => check.id)).size === planned.criteria.length &&
					planned.criteria.every((criterion) =>
						job.checks.some(
							(check) =>
								check.id === criterion.id && !['error', 'not-run'].includes(check.acceptance)
						)
					) &&
					job.isolation?.calls === isolatedPilotSettings.criteriaPerCandidate &&
					job.baselineState === 'completed' &&
					job.baseline?.status === 'completed'
				);
			}) &&
			index.http.filter((record) => record.forwarded).length ===
				isolatedPilotSettings.maxIsolatedHttp &&
			index.baselineHttpAttempts === isolatedPilotSettings.maxBaselineHttp;
		if (!complete) index.stoppedReason ??= 'incomplete-calibration-no-replay';
		index.finishedAt = new Date().toISOString();
		index.status = index.stoppedReason ? 'stopped' : 'completed';
		save();
	}
	const report = {
		runId: index.runId,
		status: index.status,
		stoppedReason: index.stoppedReason,
		planHash: index.planHash,
		interpretation:
			'Synthetic development controls, not human gold or held-out accuracy. Stronger model and decomposition changed together. Exact quotes establish provenance, not entailment.',
		isolatedHttpAttempts: index.http.filter((r) => r.forwarded).length,
		blockedAttempts: index.http.filter((r) => !r.forwarded).length,
		baselineHttpAttempts: index.baselineHttpAttempts,
		actualCostUsd: null,
		jobs: index.jobs.map((j) => ({
			candidateId: j.candidateId,
			checks: j.checks.length,
			isolatedDimensions: j.isolation?.dimensions ?? null,
			isolatedIntegrated: j.isolation?.integrated ?? null,
			baselineDisposition: j.baseline?.assessment?.integrated.disposition ?? null,
			baselineDimensions: j.baseline?.assessment?.dimensions ?? null
		}))
	};
	writeFileSync(resolve(directory, 'report.json'), redact(report), { mode: 0o600, flag: 'wx' });
	return { directory, index, report };
};

const readCredential = async (): Promise<string> => {
	const input = createInterface({ input: process.stdin, terminal: false });
	try {
		const line = await new Promise<string>((resolve, reject) => {
			input.once('line', resolve);
			input.once('close', () => reject(new Error('Credential input ended')));
		});
		const value: unknown = JSON.parse(line);
		if (
			typeof value !== 'object' ||
			value === null ||
			!('OPENAI_API_KEY' in value) ||
			typeof value.OPENAI_API_KEY !== 'string'
		)
			throw new Error('Invalid credential input');
		return value.OPENAI_API_KEY;
	} finally {
		input.close();
	}
};
export const isolatedHelp = `Isolated agentests judge calibration
validate: freeze two unchanged development candidates and 24 native Tests each, offline.
run --run-id ID --allow-paid --credentials-stdin: run at most 48 isolated + 2 baseline HTTP calls.
Credentials are read from one stdin JSON line, never a file. Disable terminal echo before entering it.
Strong judge: gpt-6.2-astra. Original judge comparator: gpt-6.1-terra.
Each request is capped at 6144 completion tokens. No retries are forwarded. No resume command.
Output remains private under ignored v3 results. No dollar estimate is implied by call limits.`;
export const isolatedMain = async (args = process.argv.slice(2)): Promise<number> => {
	if (!args.length || ['help', '--help', '-h'].includes(args[0]!)) {
		console.log(isolatedHelp);
		return 0;
	}
	if (args.length === 1 && args[0] === 'validate') {
		const plan = makeIsolatedPilotPlan();
		console.log(
			JSON.stringify(
				{
					planHash: plan.planHash,
					candidates: plan.jobs.length,
					settings: isolatedPilotSettings,
					uncovered: plan.jobs.map((j) => compileIsolatedCriteria(j.packet).uncovered)
				},
				null,
				2
			)
		);
		return 0;
	}
	if (
		args.length !== 5 ||
		args[0] !== 'run' ||
		args[1] !== '--run-id' ||
		args[3] !== '--allow-paid' ||
		args[4] !== '--credentials-stdin'
	)
		throw new Error('Expected run --run-id ID --allow-paid --credentials-stdin');
	const result = await runIsolatedCalibration({ runId: args[2]!, apiKey: await readCredential() });
	console.log(
		JSON.stringify({
			directory: result.directory,
			status: result.index.status,
			stoppedReason: result.index.stoppedReason
		})
	);
	return result.index.status === 'completed' ? 0 : 1;
};
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
	isolatedMain()
		.then((code) => {
			process.exitCode = code;
		})
		.catch(() => {
			console.error(
				'Isolated calibration failed; no automatic replay. Inspect private index when present.'
			);
			process.exitCode = 1;
		});
