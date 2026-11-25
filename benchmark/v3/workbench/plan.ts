import { lstatSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sha256 } from '../../v2/workbench/dossier.ts';
import { freezeProducerCases, makeProducerPrompt } from '../../v2/workbench/six-protocol.ts';
import type { ProducerCase } from '../../v2/workbench/six-protocol.ts';
import { gradedPrompt } from '../../v2/workbench/graded-provider.ts';
import type { SixTrial } from '../../v2/workbench/six-run.ts';
import { GATE_CRITERION, GATE_THRESHOLD } from './gate.ts';

export const hash = (value: unknown): string => sha256(JSON.stringify(value));
export const treatments = ['A', 'B', 'C'] as const;
export type Treatment = (typeof treatments)[number];
export const fixedCaseIds = ['complex-support-01', 'complex-support-02'];
export const settings = {
	model: 'gpt-6.1-terra',
	timeoutMs: 300_000,
	concurrency: 24,
	maxErrors: 3,
	producerLimit: 36,
	gateLimit: 36,
	judgeLimit: 12,
	logicalCallLimit: 84,
	httpAttemptLimit: 156,
	gateHttpAttemptLimit: 3,
	retries: 0,
	sdkRetryPolicy:
		'installed ai SDK defaults to 2 retries; proxy forwards at most 3 attempts including initial request',
	bounded: { openaiProducerReview: 4, lunaGate: 2, jevGate: 2 },
	maxDrafts: 3,
	maxOutputTokens: 16384,
	skill: false,
	unavailableTelemetry: [
		'loggingDurationMs',
		'loggingBytes',
		'evidenceWriteDurationMs',
		'producerReviewerWireResponseBytes'
	]
} as const;
export interface Trial extends SixTrial {
	arm: Treatment;
	gateModel: 'luna' | 'jev';
	queuedAt?: string;
	startedAt?: string;
	finishedAt?: string;
}
export interface CallRecord {
	id: number;
	trialId: string;
	role: 'producer' | 'gate' | 'reviewer';
	queuedAt: string;
	startedAt?: string;
	finishedAt?: string;
	state: 'queued' | 'running' | 'completed' | 'failed' | 'uncertain';
	packetSha256: string;
	inputBytes: number;
	httpAttempts: number;
	httpAttemptsKnown: boolean;
}
export interface Index {
	version: 3;
	runId: string;
	kind: 'controlled-pilot';
	externalSpendingCapConfirmed: boolean;
	createdAt: string;
	planHash: string;
	snapshot: string;
	settings: typeof settings;
	jobs: Trial[];
	calls: CallRecord[];
	httpAttempts: number;
	startedAt?: string;
	finishedAt?: string;
	stoppedReason: string | null;
}
export const pilotCases = (): ProducerCase[] => {
	const all = freezeProducerCases();
	return fixedCaseIds.map((id) => {
		const found = all.find((c) => c.id === id);
		if (!found) throw new Error('Missing fixed input');
		return found;
	});
};
const sourceIdentity = (): Record<string, string> => {
	const root = fileURLToPath(new URL('../../../', import.meta.url));
	const files = ['bun.lock', 'package.json', 'core/package.json'];
	const walk = (dir: string, all: boolean): void => {
		for (const name of readdirSync(resolve(root, dir)).sort()) {
			const path = `${dir}/${name}`,
				stat = lstatSync(resolve(root, path));
			if (stat.isSymbolicLink()) throw new Error('Symlink in runtime identity');
			if (stat.isDirectory()) {
				if (all) walk(path, true);
			} else if (stat.isFile() && (all || name.endsWith('.ts') || name === 'package.json'))
				files.push(path);
		}
	};
	walk('core/dist', true);
	walk('benchmark/v2/workbench', false);
	walk('benchmark/v3/workbench', false);
	return Object.fromEntries(files.sort().map((p) => [p, sha256(readFileSync(resolve(root, p)))]));
};
export const safeRunId = (id: string): void => {
	if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,100}$/u.test(id)) throw new Error('Unsafe run ID');
};
export const makePlan = (
	runId: string,
	cases = pilotCases(),
	externalSpendingCapConfirmed = false
): Index => {
	safeRunId(runId);
	if (cases.length !== 2 || cases.some((c, i) => c.id !== fixedCaseIds[i]))
		throw new Error('Expected fixed two-case input order');
	const blocks = cases.flatMap((c) => (['luna', 'jev'] as const).map((gate) => ({ c, gate })));
	const jobs = blocks.flatMap(({ c, gate }, block) =>
		treatments.map((_, n): Trial => {
			const arm = treatments[(block + n) % 3]!;
			return {
				id: `${c.id}--${gate}--${arm}--r1`,
				caseId: c.id,
				gateModel: gate,
				arm,
				repeat: 1,
				status: 'pending',
				drafts: [],
				attempts: [],
				judgeState: 'pending'
			};
		})
	);
	const snapshot = JSON.stringify({
		protocol: 'controlled-feedback-v3',
		externalSpendingCapConfirmed,
		cases,
		treatments,
		settings,
		jobOrder: jobs.map(({ id, caseId, gateModel, arm, repeat }) => ({
			id,
			caseId,
			gateModel,
			arm,
			repeat
		})),
		source: sourceIdentity(),
		runtime: { bun: Bun.version, platform: process.platform, arch: process.arch },
		producerPrompts: cases.map((c) => makeProducerPrompt(c, false)),
		judgePrompt: gradedPrompt,
		gate: {
			criterion: GATE_CRITERION,
			threshold: GATE_THRESHOLD,
			models: { luna: 'gpt-6-luna', jev: 'jev-latest' }
		},
		logger: { A: 'console.log', B: 'per-instance no-op', C: 'per-instance no-op' },
		reviewer: { model: settings.model, maxOutputTokens: settings.maxOutputTokens, blind: true }
	});
	return {
		version: 3,
		runId,
		kind: 'controlled-pilot',
		externalSpendingCapConfirmed,
		createdAt: new Date().toISOString(),
		planHash: sha256(snapshot),
		snapshot,
		settings: structuredClone(settings),
		jobs,
		calls: [],
		httpAttempts: 0,
		stoppedReason: null
	};
};
