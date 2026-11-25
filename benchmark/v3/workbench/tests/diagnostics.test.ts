import { describe, expect, test } from 'bun:test';
import {
	auditSixIndex,
	auditV3Index,
	exportBlindedSample,
	profileSixIndex,
	profileV3Index
} from '../diagnostics.ts';
import type { DiagnosticIndex } from '../diagnostics.ts';
import type { Index as V3Index, Trial as V3Trial } from '../plan.ts';
import { dimensionIds, sha256 } from '../../../v2/workbench/dossier.ts';
import { freezeProducerCases, makeJudgePacket } from '../../../v2/workbench/six-protocol.ts';
import type { SixTrial, ProducerResult } from '../../../v2/workbench/six-run.ts';
import type { GradedAssessment } from '../../../v2/workbench/graded-contract.ts';
import type { GradedResult } from '../../../v2/workbench/graded-provider.ts';

const c = freezeProducerCases()[0]!;
const candidate = (text = 'A synthetic reply for offline diagnostics.') => ({
	externalReply: [{ id: 'reply-01', text }],
	internalPlan: [{ id: 'plan-01', text: 'A synthetic internal plan.' }]
});
const attempt = (draft = candidate()): ProducerResult => ({
	status: 'completed',
	candidate: draft,
	startedAt: '2026-01-01T00:00:00Z',
	finishedAt: '2026-01-01T00:00:01Z',
	latencyMs: 1000,
	httpStatus: 200,
	requestId: null,
	responseModel: 'synthetic-producer',
	usage: { inputTokens: null, outputTokens: null, totalTokens: null, cachedInputTokens: null },
	actualCostUsd: null,
	retryAfterMs: null,
	error: null,
	errorCode: null,
	rawResponse: null
});
const assessment: GradedAssessment = {
	schemaVersion: '1.0',
	dimensions: Object.fromEntries(
		dimensionIds.map((id) => [
			id,
			{
				grade: 3,
				rationale: 'Synthetic offline assessment.',
				evidenceIds: ['E01'],
				candidateSpans: ['reply-01'],
				confidence: { level: 'medium', rationale: 'Synthetic confidence.' }
			}
		])
	) as GradedAssessment['dimensions'],
	integrated: {
		disposition: 'ready',
		rationale: 'Synthetic offline integrated assessment.',
		hardBreaches: [],
		evidenceIds: ['E01'],
		candidateSpans: ['reply-01'],
		uncertainties: [
			{
				question: 'Synthetic question?',
				impact: 'Synthetic impact.',
				neededToResolve: 'Synthetic evidence.',
				evidenceIds: ['E01']
			}
		],
		tradeoffs: [
			{
				dimensions: ['policyAuthority', 'supportUsefulness'],
				explanation: 'Synthetic tradeoff.',
				evidenceIds: ['E01'],
				candidateSpans: ['reply-01']
			}
		],
		acceptableAlternatives: [
			{ description: 'Synthetic alternative.', limits: 'Synthetic limits.', evidenceIds: ['E01'] }
		],
		confidence: { level: 'medium', rationale: 'Synthetic confidence.' }
	}
};
const judge = (): GradedResult => ({
	status: 'completed',
	assessment,
	latencyMs: 20,
	httpStatus: 200,
	requestId: null,
	responseModel: 'synthetic-judge',
	usage: { inputTokens: null, outputTokens: null, totalTokens: null, cachedInputTokens: null },
	actualCostUsd: null,
	retryAfterMs: null,
	error: null,
	rawResponse: null,
	strategy: 'synthetic-offline'
});
const trial = (id = 'private-trial-prompt-luna-r1'): SixTrial => {
	const draft = candidate(),
		hash = sha256(JSON.stringify(draft)),
		producer = attempt(draft);
	return {
		id,
		caseId: c.id,
		arm: 'prompt-luna',
		repeat: 1,
		status: 'completed',
		attempts: [producer],
		drafts: [
			{
				candidate: draft,
				sha256: hash,
				producer,
				gateDraftSha256: hash,
				gate: {
					status: 'fail',
					scores: [{ id: 'responsible-support-draft', score: 0.4, threshold: 0.8 }],
					findings: [
						{ id: 'responsible-support-draft', criterion: 'synthetic', score: 0.4, threshold: 0.8 }
					],
					usage: { inputTokens: null, outputTokens: null },
					telemetry: [
						{
							path: '/decisions',
							status: 429,
							durationMs: 5,
							inputTokens: null,
							outputTokens: null,
							refusals: 0
						},
						{
							path: '/decisions',
							status: 200,
							durationMs: 10,
							inputTokens: null,
							outputTokens: null,
							refusals: 0
						}
					]
				}
			}
		],
		judge: judge(),
		judgeState: 'completed',
		judgeDraftSha256: hash,
		judgePacketSha256: sha256(makeJudgePacket(c, draft))
	};
};
const index = (jobs = [trial()]): DiagnosticIndex => {
	const snapshot = JSON.stringify({ cases: [c], arms: [{ id: 'prompt-luna', gate: 'luna' }] });
	return {
		runId: 'synthetic-private-run',
		kind: 'measured',
		snapshot,
		planHash: sha256(snapshot),
		settings: { model: 'synthetic' },
		jobs
	};
};
const v3Index = (): V3Index => {
	const jobs = (['luna', 'jev'] as const).flatMap((gateModel) =>
		(['A', 'B', 'C'] as const).map(
			(arm) =>
				({
					...trial(`${gateModel}-${arm}`),
					arm,
					gateModel
				}) as V3Trial
		)
	);
	const snapshot = JSON.stringify({
		cases: [c],
		jobOrder: jobs.map(({ id, caseId, gateModel, arm, repeat }) => ({
			id,
			caseId,
			gateModel,
			arm,
			repeat
		}))
	});
	return {
		...index(jobs),
		version: 3,
		kind: 'controlled-pilot',
		snapshot,
		planHash: sha256(snapshot),
		calls: [],
		createdAt: '2026-01-01T00:00:00Z',
		startedAt: '2026-01-01T00:00:00Z',
		finishedAt: '2026-01-01T00:00:10Z',
		httpAttempts: 0,
		stoppedReason: null
	} as unknown as V3Index;
};

describe('offline six-arm evidence diagnostics', () => {
	test('exhaustively enumerates same-final-draft disagreements and exact strata', () => {
		const x = index([trial('one'), trial('two'), trial('three')]);
		x.jobs[2]!.judge!.assessment = {
			...assessment,
			integrated: { ...assessment.integrated, disposition: 'revise' }
		};
		const audit = auditSixIndex(x);
		expect(audit.disagreements.map((r) => r.trialId)).toEqual(['one', 'two']);
		expect(audit.finalRejectedObserved).toBe(3);
		expect(audit.verifiedRejectedAndJudged).toBe(3);
		expect(audit.strata.provider).toEqual([
			{ value: 'luna', trials: 3, verifiedRejectedAndJudged: 3, disagreements: 2 }
		]);
		expect(audit.strata.score[0]!.disagreements).toBe(2);
	});
	test('excludes altered candidates, wrong gate/judge bindings, packet and snapshot hashes', () => {
		const mutations = [
			(x: DiagnosticIndex) => {
				x.jobs[0]!.drafts[0]!.candidate.externalReply[0]!.text += 'changed';
			},
			(x: DiagnosticIndex) => {
				x.jobs[0]!.drafts[0]!.gateDraftSha256 = 'wrong';
			},
			(x: DiagnosticIndex) => {
				x.jobs[0]!.judgeDraftSha256 = 'wrong';
			},
			(x: DiagnosticIndex) => {
				x.jobs[0]!.judgePacketSha256 = 'wrong';
			},
			(x: DiagnosticIndex) => {
				x.planHash = 'wrong';
			},
			(x: DiagnosticIndex) => {
				x.jobs[0]!.judgeState = 'interrupted';
			}
		];
		for (const mutate of mutations) {
			const x = index();
			mutate(x);
			expect(auditSixIndex(x).disagreements).toHaveLength(0);
		}
	});
	test('keeps rejected missing judgments and gate failures outside quality denominators', () => {
		const x = index([trial('missing'), trial('error')]);
		delete x.jobs[0]!.judge;
		x.jobs[0]!.judgeState = 'failed';
		x.jobs[1]!.drafts[0]!.gate!.status = 'error';
		const audit = auditSixIndex(x);
		expect(audit.finalRejectedObserved).toBe(1);
		expect(audit.verifiedRejectedAndJudged).toBe(0);
		expect(audit.trials).toHaveLength(2);
		expect(audit.trials[0]!.exclusions).toContain('final-judge-binding-or-assessment-unverified');
	});
	test('revalidates the frozen assessment contract rather than trusting status or hash bindings alone', () => {
		const x = index();
		x.jobs[0]!.judge!.assessment = { ...assessment, dimensions: {} } as GradedAssessment;
		const audit = auditSixIndex(x);
		expect(audit.disagreements).toHaveLength(0);
		expect(audit.verifiedRejectedAndJudged).toBe(0);
		expect(audit.trials[0]!.exclusions).toContain('final-judge-contract-invalid');
	});
	test('exports full frozen packets with opaque IDs, no control metadata, and a separate private key', () => {
		const x = index([trial('identifies-arm-luna'), trial('identifies-arm-jev')]);
		x.jobs[1]!.drafts[0]!.gate!.status = 'pass';
		const before = JSON.stringify(x),
			output = exportBlindedSample(x, { salt: 'private-test-salt-1234' });
		expect(output.review.samples).toHaveLength(2);
		for (const sample of output.review.samples) {
			expect(Object.keys(sample).sort()).toEqual([
				'candidate',
				'context',
				'normativeRubric',
				'opaqueId',
				'task'
			]);
			expect(sample.opaqueId).toMatch(/^[a-f0-9]{64}$/u);
			expect(sample.context).toEqual(c.context);
			expect(sample.candidate).toEqual(candidate());
		}
		const serialized = JSON.stringify(output.review);
		for (const hidden of [
			'identifies-arm-luna',
			'identifies-arm-jev',
			'synthetic-private-run',
			'prompt-luna',
			'synthetic-judge',
			'gateDraftSha256',
			'judgeDisposition'
		])
			expect(serialized).not.toContain(hidden);
		expect(output.privateKey.mapping.map((m) => m.trialId).sort()).toEqual([
			'identifies-arm-jev',
			'identifies-arm-luna'
		]);
		expect(JSON.stringify(x)).toBe(before);
		expect(
			exportBlindedSample(x, { salt: 'private-test-salt-1234', limit: 1 }).review.samples
		).toHaveLength(1);
		expect(
			exportBlindedSample(x, { salt: 'another-private-salt-5678' }).review.samples[0]!.opaqueId
		).not.toBe(output.review.samples[0]!.opaqueId);
	});
	test('never substitutes current fixtures for an altered frozen context', () => {
		const x = index(),
			snapshot = JSON.parse(x.snapshot) as { cases: (typeof c)[] };
		snapshot.cases[0]!.context[0]!.content += '\nFrozen synthetic evidence edit.';
		x.snapshot = JSON.stringify(snapshot);
		x.planHash = sha256(x.snapshot);
		expect(auditSixIndex(x).disagreements).toHaveLength(0);
		const review = exportBlindedSample(x, { salt: 'private-test-salt-1234' }).review.samples[0]!;
		expect((review.context as typeof c.context)[0]!.content).toContain(
			'Frozen synthetic evidence edit.'
		);
	});
	test('labels revisions as descriptive and flags missing first-draft quality', () => {
		const x = index(),
			j = x.jobs[0]!,
			final = j.drafts[0]!;
		const firstCandidate = candidate('First, different synthetic draft.'),
			producer = attempt(firstCandidate);
		j.drafts.unshift({
			candidate: firstCandidate,
			sha256: sha256(JSON.stringify(firstCandidate)),
			producer
		});
		j.attempts.unshift(producer);
		const revision = auditSixIndex(x).revisions[0]!;
		expect(revision.firstDraftQualityAvailable).toBe(false);
		expect(revision.finalDraftQualityAvailable).toBe(true);
		expect(revision.qualityChange).toBeNull();
		expect(revision.changes.find((r) => r.field === 'externalReply')!.changed).toBe(true);
		j.drafts[0] = structuredClone(final);
		expect(auditSixIndex(x).revisions[0]!.firstDraftQualityAvailable).toBe(true);
	});
	test('separates HTTP gate retries, role service sums, 429 and unknown wall/queue times', () => {
		const profile = profileSixIndex(index());
		expect(profile.producer.attempts).toBe(1);
		expect(profile.producer.serviceDurationSumMs).toBe(1000);
		expect(profile.gate.logicalEvaluations).toBe(1);
		expect(profile.gate.httpAttempts).toBe(2);
		expect(profile.gate.httpRetries).toBe(1);
		expect(profile.gate.observed429).toBe(1);
		expect(profile.gate.serviceDurationSumMs).toBe(15);
		expect(profile.judge.serviceDurationSumMs).toBe(20);
		expect(profile.batchWallMs).toBeNull();
		expect(profile.gate.logicalWallDurationMs).toBeNull();
		expect(profile.producer.queueWaitMs).toBeNull();
		const x = index();
		x.jobs[0]!.attempts[0]!.status = 'interrupted-unknown';
		delete x.jobs[0]!.drafts[0]!.gate;
		delete x.jobs[0]!.judge;
		x.jobs[0]!.judgeState = 'interrupted';
		const unknown = profileSixIndex(x);
		expect(unknown.producer.serviceDurationSumMs).toBeNull();
		expect(unknown.gate.httpAttempts).toBeNull();
		expect(unknown.gate.httpRetries).toBeNull();
		expect(unknown.judge.serviceDurationSumMs).toBeNull();
	});
	test('pairs v3 treatments within provider and frozen situation without ranking dispositions', () => {
		const x = v3Index();
		x.jobs.find((j) => j.id === 'luna-B')!.judge!.assessment = {
			...assessment,
			integrated: { ...assessment.integrated, disposition: 'hold-for-review' }
		};
		x.jobs.find((j) => j.id === 'jev-B')!.judge!.assessment = {
			...assessment,
			integrated: { ...assessment.integrated, disposition: 'revise' }
		};
		x.jobs = x.jobs.filter((j) => j.id !== 'jev-C');
		const audit = auditV3Index(x);
		expect(audit.plannedTrials).toBe(6);
		expect(audit.missingPlannedTrialIds).toEqual(['jev-C']);
		expect(audit.comparisons[0]!.readyPairs).toBe(2);
		expect(audit.comparisons[0]!.pairs.map((p) => p.readyDelta)).toEqual([-1, -1]);
		expect(audit.comparisons[0]!.dispositionTransitions['["ready","hold-for-review"]']).toBe(1);
		expect(audit.comparisons[0]!.dispositionTransitions['["ready","revise"]']).toBe(1);
		expect(audit.comparisons[1]!.missingQualityPairs).toBe(1);
		expect(audit.comparisons[1]!.missingOrDuplicateTrialPairs).toBe(1);
		expect(audit.treatments.find((t) => t.treatment === 'C')!.planned).toBe(2);
		expect(audit.treatments.find((t) => t.treatment === 'C')!.missingTrials).toBe(1);
		expect(audit.strata.provider.map((p) => p.value).sort()).toEqual(['jev', 'luna']);
		x.jobs[0]!.gateModel = 'jev';
		expect(auditV3Index(x).trials[0]!.exclusions).toContain('frozen-trial-assignment-mismatch');
	});
	test('profiles v3 ledger queue waits and batch wall separately from service sums', () => {
		const x = v3Index();
		x.calls = [
			{
				id: 1,
				trialId: 'luna-A',
				role: 'producer',
				queuedAt: '2026-01-01T00:00:00Z',
				startedAt: '2026-01-01T00:00:02Z',
				finishedAt: '2026-01-01T00:00:03Z',
				state: 'completed',
				packetSha256: 'synthetic',
				inputBytes: 1,
				httpAttempts: 1,
				httpAttemptsKnown: true
			},
			{
				id: 2,
				trialId: 'luna-A',
				role: 'gate',
				queuedAt: '2026-01-01T00:00:03Z',
				startedAt: '2026-01-01T00:00:04Z',
				finishedAt: '2026-01-01T00:00:08Z',
				state: 'completed',
				packetSha256: 'synthetic',
				inputBytes: 1,
				httpAttempts: 2,
				httpAttemptsKnown: true
			},
			{
				id: 3,
				trialId: 'luna-A',
				role: 'reviewer',
				queuedAt: '2026-01-01T00:00:08Z',
				state: 'queued',
				packetSha256: 'synthetic',
				inputBytes: 1,
				httpAttempts: 0,
				httpAttemptsKnown: false
			}
		];
		x.httpAttempts = 3;
		const profile = profileV3Index(x);
		expect(profile.batchWallMs).toBe(10000);
		expect(profile.producer.ledger.queueWait.totalMs).toBe(2000);
		expect(profile.gate.ledger.harnessElapsed.totalMs).toBe(4000);
		expect(profile.gate.ledger.httpRetries).toBe(1);
		expect(profile.judge.ledger.queueWait.totalMs).toBeNull();
		expect(profile.judge.ledger.httpAttempts).toBeNull();
		expect(profile.gate.service.serviceDurationSumMs).toBe(90);
		expect(profile.actualCostUsd.producer).toBeNull();
		expect(profile.actualCostUsd.gate).toBeNull();
	});
});
