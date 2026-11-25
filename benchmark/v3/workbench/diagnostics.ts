import { createHmac } from 'node:crypto';
import { packageDossier, sha256 } from '../../v2/workbench/dossier.ts';
import type { Candidate, Dossier } from '../../v2/workbench/dossier.ts';
import type { SixIndex, SixTrial } from '../../v2/workbench/six-run.ts';
import type { ProducerCase } from '../../v2/workbench/six-protocol.ts';
import type { GradedPacket } from '../../v2/workbench/graded-contract.ts';
import { validateGradedAssessment } from '../../v2/workbench/graded-contract.ts';
import type { Index as V3Index } from './plan.ts';

/** Structural subset accepts frozen v2 evidence without executing either runner. */
export type DiagnosticIndex = Pick<SixIndex, 'runId' | 'planHash' | 'snapshot' | 'jobs'> & {
	kind: string;
	settings: { model: string };
};
const finite = (x: unknown): number | null =>
	typeof x === 'number' && Number.isFinite(x) && x >= 0 ? x : null;
const total = (xs: (number | null)[]): number | null =>
	xs.length && xs.every((x) => x !== null) ? xs.reduce<number>((a, b) => a + b!, 0) : null;
const distribution = (values: string[]) =>
	Object.fromEntries(
		[...new Set(values)].sort().map((key) => [key, values.filter((v) => v === key).length])
	);
const frozen = (index: DiagnosticIndex) => {
	if (sha256(index.snapshot) !== index.planHash) return null;
	try {
		const value = JSON.parse(index.snapshot) as {
			cases: ProducerCase[];
			arms?: { id: string; gate: string | null }[];
			jobOrder?: (
				string | { id: string; caseId: string; arm: string; repeat: number; gateModel: string }
			)[];
		};
		return Array.isArray(value.cases) &&
			(Array.isArray(value.arms) || Array.isArray(value.jobOrder))
			? value
			: null;
	} catch {
		return null;
	}
};
const packetFor = (c: ProducerCase, candidate: Candidate) =>
	packageDossier({
		...c,
		candidates: [{ id: 'input', content: candidate }]
	} as unknown as Dossier)[0]!.packet;
const verify = (index: DiagnosticIndex, trial: SixTrial) => {
	const last = trial.drafts.at(-1),
		snapshot = frozen(index);
	const problems: string[] = [];
	if (index.jobs.filter((j) => j.id === trial.id).length !== 1) problems.push('duplicate-trial-id');
	if (!snapshot) problems.push('invalid-or-unavailable-frozen-snapshot');
	const assignment = snapshot?.jobOrder?.find(
		(job) => typeof job === 'object' && job.id === trial.id
	);
	if (
		snapshot?.jobOrder &&
		!snapshot.jobOrder.some((job) =>
			typeof job === 'string' ? job === trial.id : job.id === trial.id
		)
	)
		problems.push('trial-not-in-frozen-plan');
	if (
		assignment &&
		typeof assignment === 'object' &&
		(assignment.caseId !== trial.caseId ||
			assignment.arm !== trial.arm ||
			assignment.repeat !== trial.repeat ||
			assignment.gateModel !== (trial as SixTrial & { gateModel?: string }).gateModel)
	)
		problems.push('frozen-trial-assignment-mismatch');
	if (!last || sha256(JSON.stringify(last.candidate)) !== last.sha256)
		problems.push('invalid-final-draft-hash');
	let packet: string | null = null;
	try {
		const c = snapshot?.cases.find((c) => c.id === trial.caseId);
		if (c && last) packet = packetFor(c, last.candidate);
	} catch {
		/* Invalid snapshot contract is an exclusion, never a partial review packet. */
	}
	if (!packet) problems.push('complete-frozen-review-packet-unavailable');
	const gateVerified = !!last?.gate && last.gateDraftSha256 === last.sha256 && !problems.length;
	let judgeVerified =
		!problems.length &&
		trial.judgeState === 'completed' &&
		trial.judge?.status === 'completed' &&
		!!trial.judge.assessment &&
		trial.judgeDraftSha256 === last!.sha256 &&
		trial.judgePacketSha256 === sha256(packet!);
	let judgeContractValid: boolean | null = null;
	if (judgeVerified)
		try {
			validateGradedAssessment(trial.judge!.assessment, packet!);
			judgeContractValid = true;
		} catch {
			judgeVerified = false;
			judgeContractValid = false;
		}

	return {
		last,
		packet,
		problems,
		gateVerified,
		judgeVerified,
		judgeContractValid,
		provider:
			snapshot?.arms?.find((a) => a.id === trial.arm)?.gate ??
			(typeof assignment === 'object' ? assignment.gateModel : null)
	};
};

/** Exhaustive final-draft audit. Disagreements are model diagnostics, never human gold. */
export const auditSixIndex = (index: DiagnosticIndex) => {
	const planned = frozen(index)?.jobOrder?.map((j) => (typeof j === 'string' ? j : j.id)) ?? null;
	const rows = index.jobs.map((trial) => {
		const v = verify(index, trial),
			a = v.judgeVerified ? trial.judge!.assessment! : null;
		const rejected = v.last?.gate?.status === 'fail';
		const ready = a?.integrated.disposition === 'ready' && a.integrated.hardBreaches.length === 0;
		const scores = v.gateVerified
			? v.last!.gate!.scores.map(({ id, score, threshold }) => ({ id, score, threshold }))
			: [];
		return {
			trialId: trial.id,
			caseId: trial.caseId,
			arm: trial.arm,
			repeat: trial.repeat,
			gateProvider: v.provider,
			finalDraftSha256: v.last?.sha256 ?? null,
			gateVerified: v.gateVerified,
			judgeVerified: v.judgeVerified,
			finalGateStatus: v.gateVerified ? v.last!.gate!.status : null,
			judgeDisposition: a?.integrated.disposition ?? null,
			disagreement: !!(rejected && v.gateVerified && ready),
			scores,
			failurePattern: v.gateVerified ? v.last!.gate!.findings.map(({ id }) => id).sort() : [],
			judgeDimensions: a
				? Object.fromEntries(Object.entries(a.dimensions).map(([id, d]) => [id, d.grade]))
				: null,
			exclusions: [
				...v.problems,
				...(rejected && !v.gateVerified ? ['gate-draft-binding-unverified'] : []),
				...(v.judgeContractValid === false ? ['final-judge-contract-invalid'] : []),
				...(!v.judgeVerified ? ['final-judge-binding-or-assessment-unverified'] : [])
			]
		};
	});
	const disagreements = rows.filter((r) => r.disagreement);
	const strata = <T extends string | null>(key: (r: (typeof rows)[number]) => T) =>
		[...new Set(rows.map(key))].map((value) => {
			const group = rows.filter((r) => key(r) === value);
			return {
				value,
				trials: group.length,
				verifiedRejectedAndJudged: group.filter(
					(r) => r.gateVerified && r.judgeVerified && r.finalGateStatus === 'fail'
				).length,
				disagreements: group.filter((r) => r.disagreement).length
			};
		});
	return {
		runId: index.runId,
		kind: index.kind,
		observedTrials: index.jobs.length,
		plannedTrials: planned?.length ?? index.jobs.length,
		missingPlannedTrialIds: planned?.filter((id) => !index.jobs.some((j) => j.id === id)) ?? null,
		interpretation:
			'Exhaustive same-final-draft gate rejection/model-review readiness disagreements; neither reviewer nor gate is human gold. No inferred rationale themes or causal improvement claims.',
		finalRejectedObserved: index.jobs.filter((j) => j.drafts.at(-1)?.gate?.status === 'fail')
			.length,
		verifiedRejectedAndJudged: rows.filter(
			(r) => r.gateVerified && r.judgeVerified && r.finalGateStatus === 'fail'
		).length,
		disagreements,
		trials: rows,
		strata: {
			case: strata((r) => r.caseId),
			provider: strata((r) => r.gateProvider),
			score: strata((r) => (r.gateVerified ? JSON.stringify(r.scores) : null)),
			failurePattern: strata((r) => (r.gateVerified ? JSON.stringify(r.failurePattern) : null))
		},
		revisions: index.jobs
			.filter((j) => j.drafts.length > 1)
			.map((j) => {
				const first = j.drafts[0]!,
					last = j.drafts.at(-1)!,
					v = verify(index, j);
				const firstValid = sha256(JSON.stringify(first.candidate)) === first.sha256;
				const changes = (['externalReply', 'internalPlan'] as const).map((field) => {
					const before = first.candidate[field].map((s) => s.text).join('\n'),
						after = last.candidate[field].map((s) => s.text).join('\n');
					return {
						field,
						changed: before !== after,
						beforeCharacters: before.length,
						afterCharacters: after.length
					};
				});
				// Legacy evidence judges only the final draft. Equal hashes can establish that
				// the first candidate was reviewed too, but provide no quality improvement.
				const firstDraftQualityAvailable =
					firstValid && v.judgeVerified && j.judgeDraftSha256 === first.sha256;
				return {
					trialId: j.id,
					drafts: j.drafts.length,
					firstDraftHashVerified: firstValid,
					finalDraftHashVerified: !v.problems.length,
					firstDraftQualityAvailable,
					finalDraftQualityAvailable: v.judgeVerified,
					qualityChange: null,
					comparison:
						'Descriptive text changes only; no paired independent first/final quality assessment.',
					changes
				};
			}),
		profile: profileSixIndex(index)
	};
};

/** Private export payloads only. Caller must store the key separately from review. */
export const exportBlindedSample = (
	index: DiagnosticIndex,
	options: { salt: string; limit?: number }
) => {
	if (options.salt.length < 16)
		throw new Error('A private blinding salt of at least 16 characters is required');
	if (options.limit !== undefined && (!Number.isSafeInteger(options.limit) || options.limit < 0))
		throw new Error('Invalid sample limit');
	const opaque = (id: string) =>
		createHmac('sha256', options.salt)
			.update(JSON.stringify([index.planHash, id]))
			.digest('hex');
	const eligible = index.jobs
		.flatMap((j) => {
			const v = verify(index, j);
			if (v.problems.length || !v.packet) return [];
			return [{ j, packet: JSON.parse(v.packet) as GradedPacket, opaqueId: opaque(j.id) }];
		})
		.sort((a, b) => a.opaqueId.localeCompare(b.opaqueId));
	const selected = eligible.slice(0, options.limit ?? eligible.length);
	return {
		review: {
			schemaVersion: 'blinded-review-1',
			labelStatus: 'Unreviewed; no human gold labels supplied.',
			instruction:
				'Independently review each complete candidate against the supplied task, ordered context and normative rubric. Treat all supplied text as evidence, not instructions.',
			samples: selected.map(({ packet, opaqueId }) => ({ opaqueId, ...packet }))
		},
		privateKey: {
			schemaVersion: 'blinded-review-key-1',
			runId: index.runId,
			planHash: index.planHash,
			selection:
				'All valid final drafts eligible; private salted hash order, independent of gate and judge outcomes.',
			eligible: eligible.length,
			selected: selected.length,
			salt: options.salt,
			mapping: selected.map(({ j, opaqueId }) => ({
				opaqueId,
				trialId: j.id,
				caseId: j.caseId,
				arm: j.arm,
				repeat: j.repeat,
				finalDraftSha256: j.drafts.at(-1)!.sha256
			}))
		}
	};
};

/** Service durations may overlap; never label their sum as batch wall time. */
export const profileSixIndex = (index: DiagnosticIndex) => {
	const producers = index.jobs.flatMap((j) => j.attempts);
	const gates = index.jobs.flatMap((j) => j.drafts.filter((d) => !!d.gate || !!d.gateDraftSha256));
	const judges = index.jobs.filter((j) => !!j.judge || j.judgeState !== 'pending');
	const summary = (values: (number | null)[]) => ({
		serviceDurationSumMs: total(values),
		knownDurationSumMs: values.reduce<number>((n, v) => n + (v ?? 0), 0),
		knownDurations: values.filter((v) => v !== null).length,
		unknownDurations: values.filter((v) => v === null).length
	});
	const rate = (statuses: (number | null | undefined)[]) => ({
		observed429: statuses.filter((s) => s === 429).length,
		unknownHttpStatus: statuses.filter((s) => s === null || s === undefined).length
	});
	const telemetry = gates.flatMap((d) => d.gate?.telemetry ?? []);
	return {
		interpretation:
			'Service duration sums overlap under concurrency and exclude unrecorded waits. Gate telemetry rows count HTTP attempts within a logical gate evaluation; revisions are new producer attempts, not HTTP retries.',
		producer: {
			attempts: producers.length,
			revisions: index.jobs.reduce((n, j) => n + Math.max(0, j.drafts.length - 1), 0),
			...summary(
				producers.map((a) =>
					['running', 'interrupted-unknown'].includes(a.status) ? null : finite(a.latencyMs)
				)
			),
			statuses: distribution(producers.map((a) => a.status)),
			...rate(producers.map((a) => a.httpStatus)),
			httpRetries: null,
			queueWaitMs: null
		},
		gate: {
			logicalEvaluations: gates.length,
			completedRecords: gates.filter((d) => !!d.gate).length,
			httpAttempts: gates.every((d) => !!d.gate) ? telemetry.length : null,
			observedHttpAttempts: telemetry.length,
			// One standing assertion in the frozen v2 adapter; these are HTTP attempts beyond its first request.
			observedExtraHttpAttempts: gates.reduce(
				(n, d) => n + Math.max(0, (d.gate?.telemetry.length ?? 0) - 1),
				0
			),
			httpRetries: gates.every((d) => !!d.gate)
				? gates.reduce((n, d) => n + Math.max(0, d.gate!.telemetry.length - 1), 0)
				: null,
			...summary(
				gates.map((d) => (d.gate ? total(d.gate.telemetry.map((t) => finite(t.durationMs))) : null))
			),
			...rate(telemetry.map((t) => t.status)),
			statuses: distribution(gates.map((d) => d.gate?.status ?? 'unknown')),
			logicalWallDurationMs: null,
			queueWaitMs: null
		},
		judge: {
			attempts: judges.length,
			...summary(judges.map((j) => (j.judge ? finite(j.judge.latencyMs) : null))),
			...rate(judges.map((j) => j.judge?.httpStatus)),
			statuses: distribution(judges.map((j) => j.judge?.status ?? j.judgeState)),
			httpRetries: null,
			queueWaitMs: null
		},
		batchWallMs: null,
		batchQueueWaitMs: null,
		missingTelemetry: [
			'Legacy indices do not record batch start/end, queued-at timestamps, logical gate start/end, or producer/judge HTTP retry histories.'
		]
	};
};

const elapsed = (start?: string, end?: string): number | null => {
	if (!start || !end) return null;
	return finite(Date.parse(end) - Date.parse(start));
};
const durationSummary = (values: (number | null)[]) => ({
	totalMs: total(values),
	knownTotalMs: values.reduce<number>((n, v) => n + (v ?? 0), 0),
	known: values.filter((v) => v !== null).length,
	unknown: values.filter((v) => v === null).length
});

/** v3 ledger measures queue and harness elapsed times that legacy evidence lacks. */
export const profileV3Index = (index: V3Index) => {
	const legacy = profileSixIndex(index);
	const role = (name: 'producer' | 'gate' | 'reviewer', provider?: string) => {
		const calls = index.calls.filter(
			(c) =>
				c.role === name &&
				(!provider || index.jobs.find((j) => j.id === c.trialId)?.gateModel === provider)
		);
		return {
			logicalCalls: calls.length,
			states: distribution(calls.map((c) => c.state)),
			queueWait: durationSummary(calls.map((c) => elapsed(c.queuedAt, c.startedAt))),
			harnessElapsed: durationSummary(calls.map((c) => elapsed(c.startedAt, c.finishedAt))),
			// Forwarding attempts are counted before fetch, including timeout/uncertain calls.
			observedHttpAttempts: calls.reduce((n, c) => n + c.httpAttempts, 0),
			httpAttempts: calls.every((c) => c.httpAttemptsKnown)
				? calls.reduce((n, c) => n + c.httpAttempts, 0)
				: null,
			httpRetries: calls.every((c) => c.httpAttemptsKnown)
				? calls.reduce((n, c) => n + Math.max(0, c.httpAttempts - 1), 0)
				: null,
			unknownHttpAttemptCalls: calls.filter((c) => !c.httpAttemptsKnown).length
		};
	};
	return {
		interpretation:
			'Ledger queue waits and harness elapsed times are timestamp differences. Harness elapsed includes adapter overhead and timeout handling; service-duration sums can overlap. HTTP attempts count initiated forwarding, not successful responses. This small sequential mechanics pilot cannot estimate scheduling throughput effects.',
		batchWallMs: elapsed(index.startedAt, index.finishedAt),
		batchQueueWaitMs: null,
		httpAttempts: index.httpAttempts,
		producer: { service: legacy.producer, ledger: role('producer') },
		gate: {
			service: legacy.gate,
			ledger: role('gate'),
			providers: { luna: role('gate', 'luna'), jev: role('gate', 'jev') }
		},
		judge: { service: legacy.judge, ledger: role('reviewer') },
		actualCostUsd: {
			producer: total(index.jobs.flatMap((j) => j.attempts.map((a) => finite(a.actualCostUsd)))),
			gate: null,
			judge: total(index.jobs.flatMap((j) => (j.judge ? [finite(j.judge.actualCostUsd)] : [])))
		}
	};
};

/** Descriptive paired pilot analysis; no universal ordinal ranking of dispositions. */
export const auditV3Index = (index: V3Index) => {
	const audit = auditSixIndex(index);
	const observations = index.jobs.map((j) => {
		const v = verify(index, j),
			assessment = v.judgeVerified ? j.judge!.assessment! : null;
		return {
			trialId: j.id,
			caseId: j.caseId,
			provider: j.gateModel,
			treatment: j.arm,
			repeat: j.repeat,
			accepted:
				v.gateVerified && ['pass', 'fail'].includes(v.last!.gate!.status)
					? v.last!.gate!.status === 'pass'
					: null,
			ready: assessment ? assessment.integrated.disposition === 'ready' : null,
			disposition: assessment?.integrated.disposition ?? null,
			supportedCriticalBreach: assessment ? assessment.integrated.hardBreaches.length > 0 : null,
			disagreement: audit.trials.find((r) => r.trialId === j.id)!.disagreement,
			judgeDimensions: assessment
				? Object.fromEntries(Object.entries(assessment.dimensions).map(([id, d]) => [id, d.grade]))
				: null
		};
	});
	const snapshotJobs =
		frozen(index)?.jobOrder?.flatMap((j) => (typeof j === 'object' ? [j] : [])) ?? [];
	const blocks = [
		...new Set(
			(snapshotJobs.length ? snapshotJobs : index.jobs).map((j) =>
				JSON.stringify([j.caseId, j.gateModel, j.repeat])
			)
		)
	];
	const comparisons = (['B-A', 'C-B'] as const).map((contrast) => {
		const [after, before] = contrast.split('-');
		const pairs = blocks.map((block) => {
			const [caseId, provider, repeat] = JSON.parse(block) as [string, string, number];
			const matching = observations.filter(
				(o) => o.caseId === caseId && o.provider === provider && o.repeat === repeat
			);
			const left = matching.filter((o) => o.treatment === before),
				right = matching.filter((o) => o.treatment === after);
			const a = left.length === 1 ? left[0]! : null,
				b = right.length === 1 ? right[0]! : null;
			const binaryDelta = (x: boolean | null | undefined, y: boolean | null | undefined) =>
				typeof x === 'boolean' && typeof y === 'boolean' ? Number(y) - Number(x) : null;
			return {
				caseId,
				provider,
				repeat,
				before: a,
				after: b,
				missingOrDuplicateTrial: !a || !b,
				readyDelta: binaryDelta(a?.ready, b?.ready),
				acceptedDelta: binaryDelta(a?.accepted, b?.accepted),
				supportedCriticalBreachDelta: binaryDelta(
					a?.supportedCriticalBreach,
					b?.supportedCriticalBreach
				)
			};
		});
		return {
			contrast,
			plannedBlocks: blocks.length,
			missingOrDuplicateTrialPairs: pairs.filter((p) => p.missingOrDuplicateTrial).length,
			readyPairs: pairs.filter((p) => p.readyDelta !== null).length,
			missingQualityPairs: pairs.filter((p) => p.readyDelta === null).length,
			acceptancePairs: pairs.filter((p) => p.acceptedDelta !== null).length,
			missingAcceptancePairs: pairs.filter((p) => p.acceptedDelta === null).length,
			dispositionTransitions: distribution(
				pairs.flatMap((p) =>
					p.before?.disposition && p.after?.disposition
						? [JSON.stringify([p.before.disposition, p.after.disposition])]
						: []
				)
			),
			pairs
		};
	});
	const treatments = (['A', 'B', 'C'] as const).map((treatment) => {
		const rows = observations.filter((o) => o.treatment === treatment);
		const planned = snapshotJobs.length
			? snapshotJobs.filter((j) => j.arm === treatment).length
			: rows.length;
		return {
			treatment,
			planned,
			observed: rows.length,
			missingTrials: Math.max(0, planned - rows.length),
			judged: rows.filter((o) => o.ready !== null).length,
			unjudged: planned - rows.filter((o) => o.ready !== null).length,
			ready: rows.filter((o) => o.ready === true).length,
			accepted: rows.filter((o) => o.accepted === true).length,
			acceptanceUnavailable: rows.filter((o) => o.accepted === null).length,
			supportedCriticalBreachTrials: rows.filter((o) => o.supportedCriticalBreach === true).length,
			disagreements: rows.filter((o) => o.disagreement).length,
			dispositions: distribution(rows.flatMap((o) => (o.disposition ? [o.disposition] : [])))
		};
	});
	return {
		...audit,
		interpretation: `${audit.interpretation} Paired B-A and C-B deltas describe binary outcomes within situation/provider/repeat. No causal effect or ordinal readiness ranking is inferred from this mechanics pilot.`,
		observations,
		treatments,
		comparisons,
		profile: profileV3Index(index)
	};
};
