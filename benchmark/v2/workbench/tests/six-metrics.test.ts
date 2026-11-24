import { describe, expect, test } from 'bun:test';
import { analyzeSixIndex, analyzeSixTrials, type AnalysisTrial } from '../six-metrics.ts';
import { sha256 } from '../dossier.ts';
import type { SixIndex } from '../six-run.ts';
import type { GradedAssessment } from '../graded-contract.ts';
const judge = (disposition: string, breaches = 0) =>
	({
		dimensions: { accuracy: { grade: 2 } },
		integrated: {
			disposition,
			hardBreaches: Array.from({ length: breaches }, () => ({ code: 'x' }))
		}
	}) as unknown as GradedAssessment;
const row = (patch: Partial<AnalysisTrial> = {}): AnalysisTrial => ({
	id: '1',
	caseId: 'case1',
	arm: 'prompt-luna',
	repeat: 1,
	status: 'completed',
	attempts: 2,
	runtimeMs: 100,
	usage: { inputTokens: 10, outputTokens: 4, actualCostUsd: null },
	gate: { status: 'fail', draftSha256: 'sha' },
	draftSha256: 'sha',
	judge: { status: 'completed', draftSha256: 'sha', assessment: judge('ready') },
	...patch
});
describe('six arm analysis', () => {
	test('keeps rejected drafts and counts only same-draft model disagreements', () => {
		const result = analyzeSixTrials([
			row(),
			row({ id: '2', gate: { status: 'fail', draftSha256: 'other' } }),
			row({
				id: '3',
				gate: { status: 'pass', draftSha256: 'sha' },
				judge: { status: 'completed', draftSha256: 'sha', assessment: judge('hold-for-review', 1) }
			})
		]).arms['prompt-luna']!;
		expect(result.provisionalFalseAlarmCandidates).toBe(1);
		expect(result.falseAlarmEligible).toBe(1);
		expect(result.missedBreachDisagreements).toBe(1);
		expect(result.judged).toBe(3);
		expect(result.rejectedJudgeDispositions.ready).toBe(1);
	});
	test('preserves failures, missing costs and comparisons within cases', () => {
		const result = analyzeSixTrials([
			row({ arm: 'prompt', gate: null, attempts: 1 }),
			row(),
			row({
				id: 'missing',
				repeat: 2,
				status: 'refusal',
				draftSha256: null,
				judge: null,
				gate: null,
				runtimeMs: null,
				usage: { inputTokens: null, outputTokens: null, actualCostUsd: null }
			})
		]);
		expect(result.arms['prompt-luna']!.statuses.refusal).toBe(1);
		expect(result.arms['prompt-luna']!.runtimeMs).toBeNull();
		expect(result.arms['prompt-luna']!.actualCostUsd).toBeNull();
		expect(result.comparisons['prompt-luna']!.cases[0]!.ties).toBe(1);
		expect(result.comparisons['prompt-luna']!.missingPairs).toBe(1);
	});
	test('excludes mismatched judge and leaves empty disagreement rates unknown', () => {
		const result = analyzeSixTrials([
			row({ judge: { status: 'completed', draftSha256: 'wrong', assessment: judge('ready') } })
		]).arms['prompt-luna']!;
		expect(result.judged).toBe(0);
		expect(result.falseAlarmRate).toBeNull();
		expect(result.missedBreachRate).toBeNull();
	});
	test('normalizes each role, tracks partial usage and actual HTTP retries', () => {
		const candidate = { externalReply: [], internalPlan: [] },
			hash = sha256(JSON.stringify(candidate));
		const usage = { inputTokens: 10, outputTokens: 4, cachedInputTokens: null, totalTokens: 14 };
		const attempt = {
			status: 'completed',
			startedAt: '2026-01-01T00:00:00Z',
			finishedAt: '2026-01-01T00:00:01Z',
			latencyMs: 900,
			usage,
			actualCostUsd: null,
			responseModel: 'gpt-6.1-terra'
		};
		const gate = {
			status: 'error',
			usage: { inputTokens: null, outputTokens: 2 },
			telemetry: [{ durationMs: 3 }, { durationMs: 5 }]
		};
		const index = {
			runId: 'test',
			kind: 'measured',
			planHash: 'hash',
			settings: { model: 'gpt-6.1-terra' },
			jobs: [
				{
					id: '1',
					caseId: 'case1',
					arm: 'prompt-luna',
					repeat: 1,
					status: 'failed',
					attempts: [attempt, { ...attempt, usage: { ...usage, inputTokens: null } }],
					drafts: [{ candidate, sha256: hash, gate, gateDraftSha256: hash }],
					judgeDraftSha256: hash,
					judge: {
						status: 'completed',
						assessment: judge('ready'),
						usage,
						latencyMs: 20,
						actualCostUsd: null,
						responseModel: null
					}
				}
			]
		} as unknown as SixIndex;
		const arm = analyzeSixIndex(index).arms['prompt-luna']!;
		expect(arm.roles.producer.inputTokens).toEqual({ total: null, knownCalls: 1, unknownCalls: 1 });
		expect(arm.roles.producer.outputTokens.total).toBe(8);
		expect(arm.roles.gate.httpAttempts).toBe(2);
		expect(arm.roles.gate.latencyMs.total).toBe(8);
		expect(arm.roles.gate.inputTokens.total).toBeNull();
		expect(arm.roles.judge.inputTokens.total).toBe(10);
		expect(arm.roles.judge.responseModels.unknown).toBe(1);
		expect(arm.roles.judge.actualCostUsd.total).toBeNull();
		expect(arm.gateErrors).toBe(1);
		expect(arm.judged).toBe(1);
		expect(arm.dimensions.accuracy!['2']).toBe(1);
		const interrupted = structuredClone(index);
		const job = interrupted.jobs[0]!;
		job.attempts[0]!.status = 'interrupted-unknown';
		delete job.drafts[0]!.gate;
		delete job.judge;
		job.judgeState = 'interrupted';
		const pending = analyzeSixIndex(interrupted).arms['prompt-luna']!;
		expect(pending.roles.producer.latencyMs.total).toBeNull();
		expect(pending.gateChecks.unknown).toBe(1);
		expect(pending.roles.gate.httpAttempts).toBeNull();
		expect(pending.roles.judge.calls).toBe(1);
		expect(pending.judgeStatuses.interrupted).toBe(1);
	});
});
