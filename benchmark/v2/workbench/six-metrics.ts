import type { SixIndex } from './six-run.ts';
import { sixArms } from './six-protocol.ts';
import { sha256 } from './dossier.ts';
import type { GradedAssessment } from './graded-contract.ts';

interface Measurement {
	inputTokens: number | null;
	outputTokens: number | null;
	actualCostUsd: number | null;
	latencyMs: number | null;
	responseModel?: string | null;
}
type GateCheck = Measurement & { status: string; httpAttempts: number | null };
/** One row per planned trial, including failures and pending trials. */
export interface AnalysisTrial {
	id: string;
	caseId: string;
	arm: string;
	repeat: number;
	status: string;
	attempts: number;
	runtimeMs: number | null;
	producerStatuses?: string[];
	producerCalls?: Measurement[];
	gateChecks?: GateCheck[];
	judgeCalls?: Measurement[];
	judgeState?: string;
	usage: { inputTokens: number | null; outputTokens: number | null; actualCostUsd: number | null };
	gate: { status: 'pass' | 'fail' | 'error'; draftSha256: string } | null;
	draftSha256: string | null;
	judge: { status: string; draftSha256: string; assessment: GradedAssessment | null } | null;
}
const dispositionOrder = ['hold-for-review', 'revise', 'ready'] as const;
const sumKnown = (xs: (number | null)[]) =>
	xs.length && xs.every((x) => x !== null) ? xs.reduce<number>((a, b) => a + b!, 0) : null;
const assessment = (t: AnalysisTrial) =>
	t.judge?.status === 'completed' && t.draftSha256 !== null && t.judge.draftSha256 === t.draftSha256
		? t.judge.assessment
		: null;
const sameGateDraft = (t: AnalysisTrial) =>
	t.gate && t.draftSha256 !== null && t.gate.draftSha256 === t.draftSha256;
const quality = (a: GradedAssessment) => a.integrated.disposition;
const ratio = (n: number, d: number) => (d ? n / d : null);
const measurements = (calls: Measurement[]) => {
	const field = (key: 'inputTokens' | 'outputTokens' | 'actualCostUsd' | 'latencyMs') => {
		const values = calls.map((c) => c[key]);
		return {
			total: sumKnown(values),
			knownCalls: values.filter((x) => x !== null).length,
			unknownCalls: values.filter((x) => x === null).length
		};
	};
	const models = calls.map((c) => c.responseModel ?? 'unknown');
	return {
		calls: calls.length,
		inputTokens: field('inputTokens'),
		outputTokens: field('outputTokens'),
		latencyMs: field('latencyMs'),
		actualCostUsd: field('actualCostUsd'),
		responseModels: Object.fromEntries(
			[...new Set(models)].sort().map((m) => [m, models.filter((x) => x === m).length])
		)
	};
};

export const analyzeSixTrials = (trials: AnalysisTrial[]) => {
	const arms = Object.fromEntries(
		sixArms.map(({ id, gate }) => {
			const rows = trials.filter((t) => t.arm === id);
			const judged = rows.filter((t) => assessment(t));
			const distributions: Record<string, Record<string, number>> = {};
			for (const t of judged)
				for (const [dimension, value] of Object.entries(assessment(t)!.dimensions)) {
					distributions[dimension] ??= { '0': 0, '1': 0, '2': 0, '3': 0 };
					distributions[dimension]![String(value.grade)]!++;
				}
			const dispositions = Object.fromEntries(
				dispositionOrder.map((d) => [d, judged.filter((t) => quality(assessment(t)!) === d).length])
			);
			const gateRows = rows.filter((t) => sameGateDraft(t));
			const gatePass = gateRows.filter((t) => t.gate!.status === 'pass');
			const gateFail = gateRows.filter((t) => t.gate!.status === 'fail');
			const judgedRejected = gateFail.filter((t) => assessment(t));
			const eligiblePass = gatePass.filter((t) => assessment(t));
			const eligibleFail = gateFail.filter((t) => assessment(t));
			const misses = eligiblePass.filter(
				(t) => assessment(t)!.integrated.hardBreaches.length > 0
			).length;
			const falseAlarms = eligibleFail.filter((t) => {
				const a = assessment(t)!;
				return quality(a) === 'ready' && a.integrated.hardBreaches.length === 0;
			}).length;
			const cases = [...new Set(rows.map((t) => t.caseId))].sort().map((caseId) => {
				const assessments = rows
					.filter((t) => t.caseId === caseId)
					.map(assessment)
					.filter((a): a is GradedAssessment => !!a);
				const values = assessments.map(quality);
				return {
					caseId,
					judged: values.length,
					dispositions: values,
					allThreeSame: values.length === 3 ? new Set(values).size === 1 : null
				};
			});
			const producerCalls = rows.flatMap((t) => t.producerCalls ?? []),
				gateCalls = rows.flatMap((t) => t.gateChecks ?? []),
				judgeCalls = rows.flatMap((t) => t.judgeCalls ?? []);
			return [
				id,
				{
					planned: rows.length,
					completed: rows.filter((t) => t.status === 'completed').length,
					incomplete: rows.filter((t) => t.status !== 'completed').length,
					statuses: Object.fromEntries(
						[...new Set(rows.map((t) => t.status))]
							.sort()
							.map((s) => [s, rows.filter((t) => t.status === s).length])
					),
					judgeStatuses: Object.fromEntries(
						[...new Set(rows.map((t) => t.judge?.status ?? t.judgeState ?? 'missing'))]
							.sort()
							.map((s) => [
								s,
								rows.filter((t) => (t.judge?.status ?? t.judgeState ?? 'missing') === s).length
							])
					),
					producerStatuses: Object.fromEntries(
						[...new Set(rows.flatMap((t) => t.producerStatuses ?? []))]
							.sort()
							.map((s) => [
								s,
								rows.flatMap((t) => t.producerStatuses ?? []).filter((x) => x === s).length
							])
					),
					gateChecks: Object.fromEntries(
						[...new Set(gateCalls.map((g) => g.status))]
							.sort()
							.map((s) => [s, gateCalls.filter((g) => g.status === s).length])
					),
					roles: {
						producer: measurements(producerCalls),
						gate: {
							...measurements(gateCalls),
							httpAttempts: sumKnown(gateCalls.map((c) => c.httpAttempts)),
							httpAttemptsKnownCalls: gateCalls.filter((c) => c.httpAttempts !== null).length
						},
						judge: measurements(judgeCalls)
					},
					submitted: rows.filter((t) => t.draftSha256 !== null).length,
					judged: judged.length,
					unjudged: rows.length - judged.length,
					accepted: gate ? gatePass.length : null,
					rejected: gate ? gateFail.length : null,
					gateErrors: gate ? gateRows.filter((t) => t.gate!.status === 'error').length : null,
					gatePassObservedProbability: ratio(gatePass.length, gatePass.length + gateFail.length),
					dispositions,
					dimensions: distributions,
					cases,
					judgeSupportedBreachTrials: judged.filter(
						(t) => assessment(t)!.integrated.hardBreaches.length > 0
					).length,
					missedBreachDisagreements: misses,
					missedBreachEligible: eligiblePass.length,
					missedBreachRate: ratio(misses, eligiblePass.length),
					provisionalFalseAlarmCandidates: falseAlarms,
					falseAlarmEligible: eligibleFail.length,
					falseAlarmRate: ratio(falseAlarms, eligibleFail.length),
					rejectedJudgeDispositions: Object.fromEntries(
						dispositionOrder.map((d) => [
							d,
							judgedRejected.filter((t) => quality(assessment(t)!) === d).length
						])
					),
					attempts: rows.reduce((n, t) => n + t.attempts, 0),
					runtimeMs: sumKnown(rows.map((t) => t.runtimeMs)),
					inputTokens: sumKnown(rows.map((t) => t.usage.inputTokens)),
					outputTokens: sumKnown(rows.map((t) => t.usage.outputTokens)),
					actualCostUsd: sumKnown(rows.map((t) => t.usage.actualCostUsd))
				}
			];
		})
	);
	const comparisons = Object.fromEntries(
		sixArms
			.filter((a) => a.id !== 'prompt')
			.map(({ id }) => {
				const pairs = trials
					.filter((t) => t.arm === id)
					.flatMap((t) => {
						const baseline = trials.find(
							(b) => b.arm === 'prompt' && b.caseId === t.caseId && b.repeat === t.repeat
						);
						const a = assessment(t),
							b = baseline && assessment(baseline);
						return a && b
							? [{ caseId: t.caseId, repeat: t.repeat, baseline: quality(b), arm: quality(a) }]
							: [];
					});
				const caseIds = [
					...new Set(trials.filter((t) => t.arm === id).map((t) => t.caseId))
				].sort();
				const cases = caseIds.map((caseId) => {
					const p = pairs.filter((x) => x.caseId === caseId);
					return {
						caseId,
						pairedRepeats: p.length,
						wins: p.filter(
							(x) => dispositionOrder.indexOf(x.arm) > dispositionOrder.indexOf(x.baseline)
						).length,
						ties: p.filter((x) => x.arm === x.baseline).length,
						losses: p.filter(
							(x) => dispositionOrder.indexOf(x.arm) < dispositionOrder.indexOf(x.baseline)
						).length
					};
				});
				return [
					id,
					{
						plannedPairs: trials.filter((t) => t.arm === id).length,
						pairedRepeats: pairs.length,
						missingPairs: trials.filter((t) => t.arm === id).length - pairs.length,
						cases
					}
				];
			})
	);
	return {
		interpretation:
			'Model-judge disagreements are not human ground truth. Judge every final draft, including rejected drafts. Gate pass is binary, not a grade; ordinal grades are distributions, never interval means. Repeated trials are grouped by case, not independent situations. Baseline has one draft while gated arms allow up to three, confounding compute and attempts. Existing breach-control anchors do not label new drafts.',
		arms,
		comparisons
	};
};

/** Normalize the private runner index without exposing prompts, feedback or draft contents. */
export const analyzeSixIndex = (index: SixIndex) => {
	const number = (x: unknown): number | null =>
		typeof x === 'number' && Number.isFinite(x) && x >= 0 ? x : null;
	const rows: AnalysisTrial[] = index.jobs.map((j) => {
		const last = j.drafts.at(-1);
		const producerCalls = j.attempts.map((a) => ({
			inputTokens: number(a.usage?.inputTokens),
			outputTokens: number(a.usage?.outputTokens),
			actualCostUsd: number(a.actualCostUsd),
			latencyMs: ['running', 'interrupted-unknown'].includes(a.status) ? null : number(a.latencyMs),
			responseModel: a.responseModel
		}));
		const durations = j.attempts.map((a) => {
			const n = Date.parse(a.finishedAt) - Date.parse(a.startedAt);
			return Number.isFinite(n) && n >= 0 ? n : null;
		});
		return {
			id: j.id,
			caseId: j.caseId,
			arm: j.arm,
			repeat: j.repeat,
			status: j.status,
			attempts: j.attempts.length,
			runtimeMs: sumKnown(durations),
			producerStatuses: j.attempts.map((a) => a.status),
			producerCalls,
			usage: {
				inputTokens: sumKnown(producerCalls.map((u) => u.inputTokens)),
				outputTokens: sumKnown(producerCalls.map((u) => u.outputTokens)),
				actualCostUsd: sumKnown(producerCalls.map((u) => u.actualCostUsd))
			},
			gateChecks: j.drafts.flatMap<GateCheck>((d) =>
				d.gate
					? [
							{
								status: d.gate.status,
								latencyMs: sumKnown(d.gate.telemetry.map((t) => number(t.durationMs))),
								inputTokens: number(d.gate.usage.inputTokens),
								outputTokens: number(d.gate.usage.outputTokens),
								actualCostUsd: null,
								httpAttempts: d.gate.telemetry.length
							}
						]
					: d.gateDraftSha256
						? [
								{
									status: 'unknown',
									latencyMs: null,
									inputTokens: null,
									outputTokens: null,
									actualCostUsd: null,
									httpAttempts: null
								}
							]
						: []
			),
			judgeState: j.judgeState,
			judgeCalls: j.judge
				? [
						{
							inputTokens: number(j.judge.usage?.inputTokens),
							outputTokens: number(j.judge.usage?.outputTokens),
							actualCostUsd: number(j.judge.actualCostUsd),
							latencyMs: number(j.judge.latencyMs),
							responseModel: j.judge.responseModel
						}
					]
				: j.judgeState !== 'pending'
					? [
							{
								inputTokens: null,
								outputTokens: null,
								actualCostUsd: null,
								latencyMs: null,
								responseModel: null
							}
						]
					: [],
			gate:
				last?.gate && last.gateDraftSha256
					? { status: last.gate.status, draftSha256: last.gateDraftSha256 }
					: null,
			draftSha256:
				last && sha256(JSON.stringify(last.candidate)) === last.sha256 ? last.sha256 : null,
			judge:
				j.judge && j.judgeDraftSha256
					? {
							status: j.judge.status,
							draftSha256: j.judgeDraftSha256,
							assessment: j.judge.assessment
						}
					: null
		};
	});
	return {
		runId: index.runId,
		kind: index.kind,
		planHash: index.planHash,
		configuredProducerAndJudgeModel: index.settings.model,
		...analyzeSixTrials(rows)
	};
};
export const reportSix = analyzeSixIndex;
