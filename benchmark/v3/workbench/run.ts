import {
	existsSync,
	lstatSync,
	mkdirSync,
	readFileSync,
	realpathSync,
	renameSync,
	writeFileSync
} from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sha256 } from '../../v2/workbench/dossier.ts';
import { generateDraft, validateProducerCandidate } from '../../v2/workbench/six-provider.ts';
import { evaluateGraded } from '../../v2/workbench/graded-provider.ts';
import { makeJudgePacket, makeProducerPrompt } from '../../v2/workbench/six-protocol.ts';
import type { ProducerCase } from '../../v2/workbench/six-protocol.ts';
import type { ProducerResult } from '../../v2/workbench/six-run.ts';
import type { GateResult } from './gate.ts';
import { evaluateGate } from './gate.ts';
import { hash, makePlan, pilotCases, settings } from './plan.ts';
import type { Index, Trial, CallRecord } from './plan.ts';
import { Semaphore } from './scheduler.ts';

export const resultRoot = fileURLToPath(new URL('../results/raw/', import.meta.url));
export const readIndex = (directory: string): Index => {
	const canonical = resolve(directory),
		path = resolve(canonical, 'index.json');
	if (realpathSync(canonical) !== canonical || lstatSync(path).isSymbolicLink())
		throw new Error('Unsafe invocation path');
	const index = JSON.parse(readFileSync(path, 'utf8')) as Index;
	if (
		index.version !== 3 ||
		sha256(index.snapshot) !== index.planHash ||
		!Array.isArray(index.jobs) ||
		!Array.isArray(index.calls)
	)
		throw new Error('Invalid v3 index');
	return index;
};
export interface RunOptions {
	plan: Index;
	allowPaid: boolean;
	externalSpendingCapConfirmed: boolean;
	cases?: ProducerCase[];
	root?: string;
	env?: Record<string, string | undefined>;
	generate?: typeof generateDraft;
	gate?: typeof evaluateGate;
	judge?: typeof evaluateGraded;
	log?: (message: string) => void;
	onProgress?: (index: Index) => void;
}
/** New invocations only: persisted uncertain calls are never automatically replayed. */
export const runPilot = async (
	options: RunOptions
): Promise<{ index: Index; directory: string }> => {
	if (options.allowPaid !== true || options.externalSpendingCapConfirmed !== true)
		throw new Error('Explicit --allow-paid and --external-spending-cap-confirmed are required');
	const cases = options.cases ?? pilotCases();
	const expected = makePlan(options.plan.runId, cases, options.externalSpendingCapConfirmed);
	if (
		expected.planHash !== options.plan.planHash ||
		JSON.stringify(options.plan.settings) !== JSON.stringify(expected.settings) ||
		JSON.stringify(options.plan.jobs) !== JSON.stringify(expected.jobs) ||
		options.plan.calls.length ||
		options.plan.httpAttempts
	)
		throw new Error('Plan must be fresh and unchanged');
	const env = options.env ?? process.env;
	const openai = env.OPENAI_API_KEY,
		jev = env.TYPESAFE_AI_API_KEY;
	if (!openai || !jev || /[\s"\\]/u.test(openai + jev))
		throw new Error('Both in-memory provider credentials required');
	const root = resolve(options.root ?? resultRoot),
		directory = resolve(root, `controlled-${expected.runId}`);
	mkdirSync(root, { recursive: true, mode: 0o700 });
	if (realpathSync(root) !== root || existsSync(directory))
		throw new Error('Unsafe or existing run directory; automatic replay is prohibited');
	mkdirSync(directory, { mode: 0o700 });
	const index = expected;
	const redact = (text: string): string =>
		[openai, jev].reduce((out, key) => out.split(key).join('[REDACTED]'), text);
	const save = (): void => {
		const target = resolve(directory, 'index.json'),
			temp = `${target}.tmp`;
		for (const path of [target, temp])
			if (existsSync(path) && lstatSync(path).isSymbolicLink())
				throw new Error('Unsafe index path');
		writeFileSync(temp, redact(JSON.stringify(index, null, 2)), { mode: 0o600 });
		renameSync(temp, target);
		options.onProgress?.(index);
	};
	writeFileSync(
		resolve(directory, 'plan.json'),
		JSON.stringify({ planHash: index.planHash, snapshot: JSON.parse(index.snapshot) }, null, 2),
		{ flag: 'wx', mode: 0o600 }
	);
	const bounded = {
		openai: new Semaphore(settings.bounded.openaiProducerReview),
		luna: new Semaphore(settings.bounded.lunaGate),
		jev: new Semaphore(settings.bounded.jevGate)
	};
	let errors = 0;
	const stop = (reason: string): void => {
		index.stoppedReason ??= reason;
	};
	const failure = (errorCode?: string | null): void => {
		errors++;
		if (['insufficient_quota', 'billing_hard_limit_reached'].includes(errorCode ?? ''))
			stop('quota-exhausted');
		if (errors >= settings.maxErrors) stop('error-budget');
	};
	const call = async <T>(
		j: Trial,
		role: CallRecord['role'],
		packet: string,
		fn: (signal: AbortSignal, beforeHttp: () => void) => Promise<T>
	): Promise<T> => {
		const limit =
			role === 'producer'
				? settings.producerLimit
				: role === 'gate'
					? settings.gateLimit
					: settings.judgeLimit;
		if (
			index.calls.length >= settings.logicalCallLimit ||
			index.calls.filter((c) => c.role === role).length >= limit
		) {
			stop('logical-call-budget');
			throw new Error('Budget');
		}
		const record: CallRecord = {
			id: index.calls.length + 1,
			trialId: j.id,
			role,
			queuedAt: new Date().toISOString(),
			state: 'queued',
			packetSha256: sha256(packet),
			inputBytes: Buffer.byteLength(packet),
			httpAttempts: 0,
			httpAttemptsKnown: false
		};
		index.calls.push(record);
		save();
		const execute = async (): Promise<T> => {
			record.startedAt = new Date().toISOString();
			record.state = 'running';
			save();
			const controller = new AbortController();
			let timer: ReturnType<typeof setTimeout> | undefined;
			const timeout = new Promise<never>((_, reject) => {
				timer = setTimeout(() => {
					controller.abort();
					reject(new Error('Timed out'));
				}, settings.timeoutMs);
			});
			const beforeHttp = (): void => {
				if (
					controller.signal.aborted ||
					index.httpAttempts >= settings.httpAttemptLimit ||
					(role === 'gate' && record.httpAttempts >= settings.gateHttpAttemptLimit)
				) {
					stop('http-attempt-budget-or-aborted');
					throw new Error('HTTP budget');
				}
				index.httpAttempts++;
				record.httpAttempts++;
				record.httpAttemptsKnown = true;
				save();
			};
			try {
				const result = await Promise.race([fn(controller.signal, beforeHttp), timeout]);
				record.state =
					typeof result === 'object' &&
					result !== null &&
					'status' in result &&
					!['completed', 'pass', 'fail'].includes(String(result.status))
						? 'failed'
						: 'completed';
				return result;
			} catch {
				record.state = 'uncertain';
				stop('uncertain-call-no-replay');
				throw new Error('Provider outcome unknown; automatic replay suppressed');
			} finally {
				clearTimeout(timer);
				controller.abort();
				record.finishedAt = new Date().toISOString();
				save();
			}
		};
		return j.arm === 'C'
			? bounded[role === 'gate' ? j.gateModel : 'openai'].run(execute)
			: execute();
	};
	const profile = (beforeHttp: () => void) => ({
		api: 'openai' as const,
		url: 'https://api.openai.com/v1',
		model: settings.model,
		apiKeyEnv: 'OPENAI_API_KEY',
		apiKey: openai,
		maxOutputTokens: settings.maxOutputTokens,
		fetch: ((...args: Parameters<typeof fetch>) => {
			beforeHttp();
			return fetch(...args);
		}) as typeof fetch
	});
	const caseMap = new Map(cases.map((c) => [c.id, c]));
	const trial = async (j: Trial): Promise<void> => {
		const c = caseMap.get(j.caseId)!;
		j.startedAt = new Date().toISOString();
		j.status = 'running';
		save();
		const messages: { role: 'user' | 'assistant'; content: string }[] = [
			{ role: 'user', content: makeProducerPrompt(c, false) }
		];
		try {
			while (j.drafts.length < settings.maxDrafts && !index.stoppedReason) {
				const startedAt = new Date().toISOString();
				const marker = { status: 'running', startedAt, finishedAt: '' } as ProducerResult;
				j.attempts.push(marker);
				save();
				const result = await call(j, 'producer', JSON.stringify(messages), (signal, beforeHttp) =>
					(options.generate ?? generateDraft)(
						profile(beforeHttp),
						structuredClone(messages),
						signal
					)
				);
				Object.assign(marker, result, { finishedAt: new Date().toISOString() });
				if (result.status !== 'completed' || !result.candidate) {
					j.status = 'failed';
					failure(result.errorCode);
					save();
					break;
				}
				validateProducerCandidate(result.candidate);
				const draft = {
					candidate: result.candidate,
					sha256: hash(result.candidate),
					producer: marker
				} as Trial['drafts'][number];
				j.drafts.push(draft);
				messages.push({ role: 'assistant', content: JSON.stringify(result.candidate) });
				j.gateRunning = true;
				draft.gateDraftSha256 = draft.sha256;
				save();
				const packet = JSON.stringify({
					task: c.task,
					rubric: c.rubric,
					context: c.context,
					draft: draft.candidate
				});
				draft.gate = await call(j, 'gate', packet, (signal, beforeHttp) =>
					(options.gate ?? evaluateGate)({
						model: j.gateModel,
						packet,
						signal,
						env,
						beforeHttpAttempt: beforeHttp,
						log: j.arm === 'A' ? (options.log ?? console.log) : () => {}
					})
				);
				j.gateRunning = false;
				if (draft.gate.status === 'error') {
					j.status = 'failed';
					failure((draft.gate as GateResult).errorCode);
					save();
					break;
				}
				if (draft.gate.status === 'pass' || j.drafts.length === settings.maxDrafts) {
					j.status = 'completed';
					save();
					break;
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
		} catch {
			j.status = 'interrupted';
			const last = j.attempts.at(-1);
			if (last?.status === 'running') {
				last.status = 'interrupted-unknown';
				last.finishedAt = new Date().toISOString();
				last.error = 'Outcome unknown; automatic replay suppressed.';
			}
			stop('uncertain-call-no-replay');
		} finally {
			j.finishedAt = new Date().toISOString();
			save();
		}
	};
	const review = async (j: Trial): Promise<void> => {
		const draft = j.drafts.at(-1)!;
		j.judgeState = 'running';
		j.judgeDraftSha256 = draft.sha256;
		const packet = makeJudgePacket(caseMap.get(j.caseId)!, draft.candidate);
		j.judgePacketSha256 = sha256(packet);
		save();
		try {
			j.judge = await call(j, 'reviewer', packet, (signal, beforeHttp) =>
				(options.judge ?? evaluateGraded)(profile(beforeHttp), packet, signal)
			);
			j.judgeState = j.judge.status === 'completed' ? 'completed' : 'failed';
			if (j.judgeState === 'failed') failure(j.judge.errorCode);
		} catch {
			j.judgeState = 'interrupted';
			stop('uncertain-call-no-replay');
		}
		save();
	};
	const pool = async (items: Trial[], fn: (j: Trial) => Promise<void>): Promise<void> => {
		let cursor = 0;
		await Promise.all(
			Array.from({ length: settings.concurrency }, async () => {
				while (cursor < items.length && !index.stoppedReason) await fn(items[cursor++]!);
			})
		);
	};
	index.startedAt = new Date().toISOString();
	save();
	// One repeat gives one trial per isolated case/provider/treatment cohort. The
	// baseline worker pool and final-review barrier remain explicit; this pilot
	// checks mechanics, and cannot estimate scheduling throughput effects.
	for (const j of index.jobs) {
		if (index.stoppedReason) break;
		j.queuedAt = new Date().toISOString();
		await pool([j], trial);
		if (!index.stoppedReason && j.drafts.length) await pool([j], review);
	}
	index.finishedAt = new Date().toISOString();
	save();
	return { index, directory };
};
