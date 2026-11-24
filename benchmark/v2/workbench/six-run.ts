import {
	existsSync,
	mkdirSync,
	readFileSync,
	readdirSync,
	lstatSync,
	realpathSync,
	renameSync,
	writeFileSync
} from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sha256 } from './dossier.ts';
import type { Candidate } from './dossier.ts';
import { validateProducerCandidate, generateDraft } from './six-provider.ts';
import type { ProducerResult as ProviderResult } from './six-provider.ts';
import { evaluateGraded, gradedPrompt } from './graded-provider.ts';
import type { GradedResult } from './graded-provider.ts';
import { evaluateGate } from './six-gate.ts';
import type { GateResult } from './six-gate.ts';
import {
	freezeProducerCases,
	makeJudgePacket,
	makeProducerPrompt,
	sixArms
} from './six-protocol.ts';
import type { ProducerCase } from './six-protocol.ts';

export const sixRoot = fileURLToPath(new URL('../results/raw/', import.meta.url));
const model = 'gpt-6.1-terra';
const timeoutMs = 300_000;
const concurrency = 24;
const maxErrors = 20;
const producerLimit = 420;
const gateLimit = 360;
const judgeLimit = 180;
interface Message {
	role: 'user' | 'assistant';
	content: string;
}
export type ProducerResult = Omit<ProviderResult, 'status'> & {
	status: string;
	startedAt: string;
	finishedAt: string;
};
export interface SixDraft {
	candidate: Candidate;
	sha256: string;
	producer: ProducerResult;
	gate?: GateResult;
	gateDraftSha256?: string;
}
export interface SixTrial {
	id: string;
	caseId: string;
	arm: string;
	repeat: number;
	status: 'pending' | 'running' | 'completed' | 'failed' | 'interrupted';
	drafts: SixDraft[];
	attempts: ProducerResult[];
	judge?: GradedResult;
	judgeState: 'pending' | 'running' | 'completed' | 'failed' | 'interrupted';
	gateRunning?: boolean;
	judgeDraftSha256?: string;
	judgePacketSha256?: string;
}
export interface SixIndex {
	version: 1;
	runId: string;
	kind: 'measured' | 'smoke';
	createdAt: string;
	planHash: string;
	snapshot: string;
	settings: {
		model: string;
		timeoutMs: number;
		concurrency: number;
		maxErrors: number;
		producerLimit: number;
		gateLimit: number;
		judgeLimit: number;
		retries: number;
	};
	jobs: SixTrial[];
	stoppedReason: string | null;
}
const hash = (x: unknown) => sha256(JSON.stringify(x));
const redactGraded = (text: string, secrets: string[]) =>
	secrets.filter(Boolean).reduce((out, secret) => out.split(secret).join('[REDACTED]'), text);
const safeId = (id: string) => {
	if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,100}$/u.test(id)) throw new Error('Unsafe run ID');
};
const sourceHash = () => {
	const root = fileURLToPath(new URL('../../../', import.meta.url));
	const files = [
		'bun.lock',
		'package.json',
		'core/package.json',
		'benchmark/v2/workbench/package.json',
		...[
			'six-run.ts',
			'six-cli.ts',
			'six-protocol.ts',
			'six-gate.ts',
			'six-provider.ts',
			'six-metrics.ts',
			'dossier.ts',
			'dossier-suite.ts',
			'dossier-ids.ts',
			'graded-provider.ts',
			'graded-contract.ts'
		].map((p) => `benchmark/v2/workbench/${p}`)
	];
	const walk = (dir: string): void => {
		for (const name of readdirSync(resolve(root, dir)).sort()) {
			const p = `${dir}/${name}`,
				stat = lstatSync(resolve(root, p));
			if (stat.isSymbolicLink()) throw new Error('Symlink in frozen runtime');
			if (stat.isDirectory()) walk(p);
			else if (stat.isFile()) files.push(p);
		}
	};
	walk('core/dist');
	return Object.fromEntries(files.sort().map((p) => [p, sha256(readFileSync(resolve(root, p)))]));
};
export const makeSixPlan = (
	runId: string,
	kind: 'measured' | 'smoke',
	cases = freezeProducerCases()
): SixIndex => {
	safeId(runId);
	if (cases.length !== 10 || new Set(cases.map((c) => c.id)).size !== 10)
		throw new Error('Expected ten unique frozen situations');
	const selected = kind === 'smoke' ? cases.slice(0, 1) : cases;
	const settings = {
		model,
		timeoutMs,
		concurrency,
		maxErrors,
		producerLimit: kind === 'smoke' ? 14 : producerLimit,
		gateLimit: kind === 'smoke' ? 12 : gateLimit,
		judgeLimit: kind === 'smoke' ? 6 : judgeLimit,
		retries: 0
	};
	const jobs = selected.flatMap((c) =>
		sixArms.flatMap((a) =>
			Array.from({ length: kind === 'smoke' ? 1 : 3 }, (_, n): SixTrial => ({
				id: `${c.id}--${a.id}--r${n + 1}`,
				caseId: c.id,
				arm: a.id,
				repeat: n + 1,
				status: 'pending',
				drafts: [],
				attempts: [],
				judgeState: 'pending'
			}))
		)
	);
	const orderSeed = 'six-arm-interleave-v1';
	jobs.sort((a, b) => hash([orderSeed, a.id]).localeCompare(hash([orderSeed, b.id])));
	const snapshot = JSON.stringify({
		cases: selected,
		arms: sixArms,
		settings,
		orderSeed,
		jobOrder: jobs.map((j) => j.id),
		source: sourceHash(),
		producerPrompts: selected.map((c) => [
			makeProducerPrompt(c, false),
			makeProducerPrompt(c, true)
		]),
		judgePrompt: gradedPrompt,
		runtime: { bun: Bun.version, platform: process.platform, arch: process.arch },
		judgeProfile: {
			api: 'openai',
			url: 'https://api.openai.com/v1',
			model,
			protocol: 'full-graded-v1',
			maxOutputTokens: 16384
		}
	});
	return {
		version: 1,
		runId,
		kind,
		createdAt: new Date().toISOString(),
		planHash: sha256(snapshot),
		snapshot,
		settings,
		jobs,
		stoppedReason: null
	};
};
export const readSixIndex = (directory: string): SixIndex => {
	const index = JSON.parse(readFileSync(resolve(directory, 'index.json'), 'utf8')) as SixIndex;
	if (
		index.version !== 1 ||
		sha256(index.snapshot) !== index.planHash ||
		!Array.isArray(index.jobs)
	)
		throw new Error('Invalid index');
	return index;
};
export interface SixOptions {
	plan: SixIndex;
	cases?: ProducerCase[];
	resume?: boolean;
	root?: string;
	env?: Record<string, string | undefined>;
	onProgress?: (index: SixIndex) => void;
	generate?: typeof generateDraft;
	gate?: typeof evaluateGate;
	judge?: typeof evaluateGraded;
}
export const runSix = async (
	options: SixOptions
): Promise<{ index: SixIndex; directory: string }> => {
	const env = options.env ?? process.env;
	const openai = env.OPENAI_API_KEY,
		jev = env.TYPESAFE_AI_API_KEY;
	if (!openai || !jev || /[\r\n]/u.test(openai + jev))
		throw new Error('Both in-memory provider credentials required');
	const cases = options.cases ?? freezeProducerCases(),
		expected = makeSixPlan(options.plan.runId, options.plan.kind, cases);
	if (expected.planHash !== options.plan.planHash) throw new Error('Frozen plan mismatch');
	const root = resolve(options.root ?? sixRoot),
		directory = resolve(root, `six-${expected.runId}`);
	mkdirSync(root, { recursive: true, mode: 0o700 });
	if (
		realpathSync(root) !== root ||
		(existsSync(directory) &&
			(lstatSync(directory).isSymbolicLink() || realpathSync(directory) !== directory))
	)
		throw new Error('Unsafe result directory');
	let index = expected;
	if (options.resume) {
		index = readSixIndex(directory);
		if (
			index.planHash !== expected.planHash ||
			index.runId !== expected.runId ||
			index.kind !== expected.kind ||
			JSON.stringify(index.settings) !== JSON.stringify(expected.settings) ||
			JSON.stringify(index.jobs.map((j) => [j.id, j.caseId, j.arm, j.repeat])) !==
				JSON.stringify(expected.jobs.map((j) => [j.id, j.caseId, j.arm, j.repeat]))
		)
			throw new Error('Resume plan mismatch');
		const caseMapForResume = new Map(cases.map((c) => [c.id, c]));
		for (const j of index.jobs) {
			const arm = sixArms.find((a) => a.id === j.arm);
			if (
				!arm ||
				!Array.isArray(j.attempts) ||
				!Array.isArray(j.drafts) ||
				!['pending', 'running', 'completed', 'failed', 'interrupted'].includes(j.status) ||
				!['pending', 'running', 'completed', 'failed', 'interrupted'].includes(j.judgeState) ||
				j.attempts.length > (arm.gate ? 3 : 1) ||
				j.drafts.length > j.attempts.length
			)
				throw new Error('Invalid trial state');
			if (j.status === 'pending' && (j.attempts.length || j.drafts.length || j.gateRunning))
				throw new Error('Unsafe pending replay');
			if (
				j.status === 'completed' &&
				(!j.drafts.length ||
					j.attempts.length !== j.drafts.length ||
					j.gateRunning ||
					(arm.gate &&
						(!j.drafts.at(-1)?.gate ||
							j.drafts.at(-1)?.gate?.status === 'error' ||
							(j.drafts.at(-1)?.gate?.status === 'fail' && j.drafts.length !== 3))))
			)
				throw new Error('Invalid completion');
			if (
				j.attempts.some(
					(a, i) =>
						a.status === 'running' && (j.status !== 'running' || i !== j.attempts.length - 1)
				) ||
				j.drafts.slice(0, -1).some((d) => d.gate?.status !== 'fail') ||
				(!arm.gate && j.drafts.some((d) => d.gate || d.gateDraftSha256))
			)
				throw new Error('Invalid request history');
			if (
				j.gateRunning &&
				((j.status !== 'running' && j.status !== 'interrupted') ||
					!arm.gate ||
					!j.drafts.at(-1)?.gateDraftSha256 ||
					j.drafts.at(-1)?.gate)
			)
				throw new Error('Invalid gate state');
			for (const [i, d] of j.drafts.entries()) {
				validateProducerCandidate(d.candidate);
				if (
					hash(d.candidate) !== d.sha256 ||
					JSON.stringify(d.producer) !== JSON.stringify(j.attempts[i]) ||
					JSON.stringify(j.attempts[i]?.candidate) !== JSON.stringify(d.candidate) ||
					j.attempts[i]?.status !== 'completed' ||
					(d.gate && (!arm.gate || d.gateDraftSha256 !== d.sha256)) ||
					(d.gateDraftSha256 && d.gateDraftSha256 !== d.sha256)
				)
					throw new Error('Draft provenance mismatch');
			}
			if (j.judgeState === 'pending' && (j.judge || j.judgeDraftSha256 || j.judgePacketSha256))
				throw new Error('Unsafe judge replay');
			if (
				j.judgeState !== 'pending' &&
				(!j.drafts.length ||
					j.judgeDraftSha256 !== j.drafts.at(-1)?.sha256 ||
					j.judgePacketSha256 !==
						sha256(makeJudgePacket(caseMapForResume.get(j.caseId)!, j.drafts.at(-1)!.candidate)))
			)
				throw new Error('Judge packet mismatch');
			if (
				j.judgeState === 'completed' &&
				(!j.judge ||
					j.judge.status !== 'completed' ||
					j.judgeDraftSha256 !== j.drafts.at(-1)?.sha256)
			)
				throw new Error('Judge provenance mismatch');
			if (j.status === 'running' || j.gateRunning) {
				j.status = 'interrupted';
				const a = j.attempts.at(-1);
				if (a?.status === 'running') {
					a.status = 'interrupted-unknown';
					a.finishedAt = new Date().toISOString();
					a.error = 'Interrupted; outcome unknown and automatic replay suppressed.';
				}
			}
			if (j.judgeState === 'running') j.judgeState = 'interrupted';
		}
		if (
			index.jobs.reduce((n, j) => n + j.attempts.length, 0) > index.settings.producerLimit ||
			index.jobs.reduce((n, j) => n + j.drafts.filter((d) => d.gateDraftSha256).length, 0) >
				index.settings.gateLimit ||
			index.jobs.filter((j) => j.judgeState !== 'pending').length > index.settings.judgeLimit
		)
			throw new Error('Saved call budget exceeded');
	} else {
		if (existsSync(directory)) throw new Error('Run exists');
		mkdirSync(directory, { mode: 0o700 });
	}
	const secrets = [openai, jev];
	const save = () => {
		const target = resolve(directory, 'index.json');
		for (const p of [target, `${target}.tmp`])
			if (existsSync(p) && lstatSync(p).isSymbolicLink()) throw new Error('Unsafe index file');
		writeFileSync(`${target}.tmp`, redactGraded(JSON.stringify(index, null, 2), secrets), {
			mode: 0o600
		});
		renameSync(`${target}.tmp`, target);
		options.onProgress?.(index);
	};
	const caseMap = new Map(cases.map((c) => [c.id, c]));
	let errors = index.jobs.reduce(
		(n, j) =>
			n +
			j.attempts.filter((a) => a.status !== 'completed').length +
			j.drafts.filter((d) => d.gate?.status === 'error').length +
			(j.judgeState === 'failed' ? 1 : 0),
		0
	);
	let producers = index.jobs.reduce((n, j) => n + j.attempts.length, 0),
		gates = index.jobs.reduce((n, j) => n + j.drafts.filter((d) => d.gateDraftSha256).length, 0),
		judges = index.jobs.filter((j) => j.judgeState !== 'pending').length;
	const stop = (reason: string) => {
		index.stoppedReason ??= reason;
	};
	const timed = async <T>(fn: (signal: AbortSignal) => Promise<T>): Promise<T> => {
		const c = new AbortController();
		const t = setTimeout(() => c.abort(), timeoutMs);
		try {
			return await fn(c.signal);
		} finally {
			clearTimeout(t);
		}
	};
	save();
	const trial = async (j: SixTrial) => {
		const c = caseMap.get(j.caseId)!,
			arm = sixArms.find((a) => a.id === j.arm)!;
		const messages: Message[] = [{ role: 'user', content: makeProducerPrompt(c, arm.skill) }];
		// Completed drafts and their feedback reconstruct the same isolated conversation.
		for (const d of j.drafts) {
			messages.push({ role: 'assistant', content: JSON.stringify(d.candidate) });
			if (d.gate?.status === 'fail')
				messages.push({
					role: 'user',
					content: JSON.stringify({
						instruction:
							'Revise the complete draft in the same JSON format in response to these findings.',
						findings: d.gate.findings.map(({ id, criterion, score }) => ({ id, criterion, score }))
					})
				});
		}
		while (j.drafts.length < (arm.gate ? 3 : 1) && !index.stoppedReason) {
			if (producers >= index.settings.producerLimit) {
				stop('producer-call-budget');
				break;
			}
			producers++;
			j.status = 'running';
			const marker: ProducerResult = {
				status: 'running',
				startedAt: new Date().toISOString(),
				finishedAt: '',
				requestId: null,
				responseModel: null,
				usage: {
					inputTokens: null,
					outputTokens: null,
					cachedInputTokens: null,
					totalTokens: null
				},
				httpStatus: null,
				errorCode: null,
				actualCostUsd: null,
				rawResponse: null,
				candidate: null,
				latencyMs: 0,
				retryAfterMs: null,
				error: null
			};
			j.attempts.push(marker);
			save();
			const result = await timed((signal) =>
				(options.generate ?? generateDraft)(
					{
						api: 'openai',
						url: 'https://api.openai.com/v1',
						model,
						apiKeyEnv: 'OPENAI_API_KEY',
						apiKey: openai!,
						maxOutputTokens: 16384
					},
					messages,
					signal
				)
			);
			Object.assign(marker, result, { finishedAt: new Date().toISOString() });
			if (result.status !== 'completed' || !result.candidate) {
				errors++;
				j.status = 'failed';
				if (['insufficient_quota', 'billing_hard_limit_reached'].includes(result.errorCode ?? ''))
					stop('quota-exhausted');
				if (errors >= maxErrors) stop('error-budget');
				save();
				return;
			}
			const draft: SixDraft = {
				candidate: result.candidate,
				sha256: hash(result.candidate),
				producer: marker
			};
			j.drafts.push(draft);
			messages.push({ role: 'assistant', content: JSON.stringify(result.candidate) });
			save();
			if (!arm.gate) {
				j.status = 'completed';
				save();
				return;
			}
			if (gates >= index.settings.gateLimit) {
				stop('gate-call-budget');
				j.status = 'failed';
				save();
				return;
			}
			gates++;
			j.gateRunning = true;
			draft.gateDraftSha256 = draft.sha256;
			save();
			draft.gate = await timed((signal) =>
				(options.gate ?? evaluateGate)({
					model: arm.gate!,
					packet: JSON.stringify({
						task: c.task,
						rubric: c.rubric,
						context: c.context,
						draft: draft.candidate
					}),
					signal,
					env
				})
			);
			j.gateRunning = false;
			if (draft.gate.status === 'error') {
				errors++;
				j.status = 'failed';
				if (errors >= maxErrors) stop('error-budget');
				save();
				return;
			}
			if (draft.gate.status === 'pass' || j.drafts.length === 3) {
				j.status = 'completed';
				save();
				return;
			}
			messages.push({
				role: 'user',
				content: JSON.stringify({
					instruction:
						'Revise the complete draft in the same JSON format in response to these findings.',
					findings: draft.gate.findings.map(({ id, criterion, score }) => ({
						id,
						criterion,
						score
					}))
				})
			});
			save();
		}
	};
	const pool = async (items: SixTrial[], fn: (j: SixTrial) => Promise<void>) => {
		let cursor = 0;
		await Promise.all(
			Array.from({ length: concurrency }, async () => {
				while (cursor < items.length && !index.stoppedReason) {
					const j = items[cursor++]!;
					await fn(j);
				}
			})
		);
	};
	await pool(
		index.jobs.filter((j) => j.status === 'pending'),
		trial
	);
	// Deterministic hash order prevents fixed arm ordering from reaching the judge.
	const finalJobs = index.jobs
		.filter((j) => j.drafts.length && j.judgeState === 'pending')
		.sort((a, b) => hash(a.id).localeCompare(hash(b.id)));
	// A production failure must not exclude existing drafts from judging; quota/error stops remain hard stops.
	if (!index.stoppedReason)
		await pool(finalJobs, async (j) => {
			if (judges >= index.settings.judgeLimit) {
				stop('judge-call-budget');
				return;
			}
			judges++;
			j.judgeState = 'running';
			j.judgeDraftSha256 = j.drafts.at(-1)!.sha256;
			const packet = makeJudgePacket(caseMap.get(j.caseId)!, j.drafts.at(-1)!.candidate);
			j.judgePacketSha256 = sha256(packet);
			save();
			j.judge = await timed((signal) =>
				(options.judge ?? evaluateGraded)(
					{
						api: 'openai',
						url: 'https://api.openai.com/v1',
						model,
						apiKeyEnv: 'OPENAI_API_KEY',
						apiKey: openai,
						maxOutputTokens: 16384
					},
					packet,
					signal
				)
			);
			j.judgeState = j.judge.status === 'completed' ? 'completed' : 'failed';
			if (j.judgeState === 'failed') {
				errors++;
				if (['insufficient_quota', 'billing_hard_limit_reached'].includes(j.judge.errorCode ?? ''))
					stop('quota-exhausted');
				if (errors >= maxErrors) stop('error-budget');
			}
			save();
		});
	save();
	return { index, directory };
};
