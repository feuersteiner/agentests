import { expect, spyOn, test } from 'bun:test';
import { existsSync, mkdtempSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { makeIsolatedPilotPlan, runIsolatedCalibration, isolatedMain } from '../isolated-cli.ts';
import { compileIsolatedCriteria } from '../isolated-criteria.ts';
import { deriveIsolatedAssessment } from '../isolated-judge.ts';
import type { IsolatedCheckResult } from '../isolated-judge.ts';
import type { evaluateGraded } from '../../../v2/workbench/graded-provider.ts';
type Options = Parameters<typeof runIsolatedCalibration>[0];
type Judge = NonNullable<NonNullable<Options['dependencies']>['judge']>;
const withRoot = async (run: (root: string) => Promise<void>) => {
	const root = realpathSync(mkdtempSync(join(tmpdir(), 'isolated-cli-offline-')));
	const log = spyOn(console, 'log').mockImplementation(() => {});
	try {
		await run(root);
	} finally {
		log.mockRestore();
		rmSync(root, { recursive: true, force: true });
	}
};
const syntheticJudge: Judge = async (options) => {
	const compiled = compileIsolatedCriteria(options.packet);
	const checks: IsolatedCheckResult[] = compiled.criteria.map(
		({ id, kind, dimensionId, level, breachCode }) => ({
			id,
			kind,
			dimensionId,
			level,
			breachCode,
			score: 0.9,
			acceptance: 'pass',
			nativeFlagged: false,
			startedAt: null,
			finishedAt: null,
			error: null
		})
	);
	for (const check of checks) await options.onResult?.(check);
	return {
		...deriveIsolatedAssessment(checks),
		packetSha256: compiled.packetSha256,
		criterionSetSha256: 'synthetic',
		checks,
		calls: 24,
		maxCalls: 24,
		coverage: compiled.coverage,
		capabilities: compiled.capabilities
	};
};
const baseline: typeof evaluateGraded = async () => ({
	status: 'completed',
	assessment: null,
	latencyMs: 0,
	requestId: null,
	responseModel: 'offline',
	usage: { inputTokens: null, outputTokens: null, cachedInputTokens: null, totalTokens: null },
	actualCostUsd: null,
	httpStatus: 200,
	retryAfterMs: null,
	error: null,
	rawResponse: null,
	strategy: 'offline-only'
});
test('plan freezes transitive compiled core and workbench source identity', () => {
	const plan = makeIsolatedPilotPlan(),
		snapshot = JSON.parse(plan.snapshot);
	expect(
		Object.keys(snapshot.source).filter((path) => path.startsWith('core/dist/')).length
	).toBeGreaterThan(40);
	expect(snapshot.source['benchmark/v2/workbench/dossier-suite.ts']).toMatch(/^[a-f0-9]{64}$/);
	expect(Object.keys(snapshot.source).some((path) => path.includes('/loader/test/parse.'))).toBe(
		true
	);
	expect(plan.jobs.map((j) => j.candidateId)).toEqual(['p01', 'p04']);
});
test('unsafe IDs, credentials and missing paid flag fail before artifacts or stdin', async () =>
	withRoot(async (root) => {
		for (const [runId, apiKey] of [
			['../escape', 'offline'],
			['invalid', 'key"quote'],
			['invalid', 'key\\slash'],
			['invalid', 'key\tspace']
		])
			await expect(
				runIsolatedCalibration({ root, runId: runId!, apiKey: apiKey! })
			).rejects.toThrow();
		expect(existsSync(join(root, 'isolated-invalid'))).toBe(false);
		await expect(
			isolatedMain(['run', '--run-id', 'offline', '--credentials-stdin'])
		).rejects.toThrow('Expected run');
	}));
test('native error without a transport error aborts and prevents baselines', async () =>
	withRoot(async (root) => {
		let baselines = 0;
		const result = await runIsolatedCalibration({
			root,
			runId: 'native-error',
			apiKey: 'offline',
			dependencies: {
				judge: async (options) => {
					const { id, kind, dimensionId, level, breachCode } = compileIsolatedCriteria(
						options.packet
					).criteria[0]!;
					await options.onResult?.({
						id,
						kind,
						dimensionId,
						level,
						breachCode,
						score: null,
						acceptance: 'error',
						nativeFlagged: null,
						startedAt: null,
						finishedAt: null,
						error: 'reason-engine-error'
					});
					expect(options.signal?.aborted).toBe(true);
					return syntheticJudge({ ...options, onResult: undefined });
				},
				baseline: async (...args) => {
					baselines++;
					return baseline(...args);
				}
			}
		});
		expect(baselines).toBe(0);
		expect(result.index.status).toBe('stopped');
		expect(result.index.stoppedReason).toBe('reason-engine-error');
	}));
test('candidate rejection aborts sibling while allSettled drains it', async () =>
	withRoot(async (root) => {
		let jobs = 0,
			siblingStopped = false;
		const result = await runIsolatedCalibration({
			root,
			runId: 'task-error',
			apiKey: 'offline',
			dependencies: {
				judge: async (options) => {
					if (++jobs === 1) throw new Error('offline candidate failure');
					if (!options.signal?.aborted)
						await new Promise<void>((done) =>
							options.signal?.addEventListener('abort', () => done(), { once: true })
						);
					siblingStopped = options.signal?.aborted === true;
					return syntheticJudge({ ...options, onResult: undefined });
				},
				baseline
			}
		});
		expect(siblingStopped).toBe(true);
		expect(result.index.status).toBe('stopped');
		expect(result.index.baselineHttpAttempts).toBe(0);
	}));
test('baseline markers precede calls and missing HTTP evidence cannot falsely complete', async () =>
	withRoot(async (root) => {
		let markers = 0;
		const result = await runIsolatedCalibration({
			root,
			runId: 'markers',
			apiKey: 'offline',
			dependencies: {
				judge: syntheticJudge,
				baseline: async (...args) => {
					const saved = JSON.parse(readFileSync(join(root, 'isolated-markers/index.json'), 'utf8'));
					const running = saved.jobs.filter(
						(job: { baselineState?: string }) => job.baselineState === 'running'
					);
					expect(running.length).toBeGreaterThan(0);
					expect(
						running.every((job: { baselineStartedAt?: string }) => !!job.baselineStartedAt)
					).toBe(true);
					markers++;
					return baseline(...args);
				}
			}
		});
		expect(markers).toBe(2);
		expect(
			result.index.jobs.every(
				(job) => job.baselineState === 'completed' && !!job.baselineFinishedAt
			)
		).toBe(true);
		expect(result.index.status).toBe('stopped');
		expect(result.index.stoppedReason).toBe('incomplete-calibration-no-replay');
	}));
