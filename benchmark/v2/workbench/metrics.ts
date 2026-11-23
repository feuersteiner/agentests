import type { Expectation, Verdict } from './data.ts';

interface BaseObservation {
	model: string;
	caseId: string;
	repeat: number;
	inputSha256: string;
	latencyMs: number;
	logicalDecisionCalls: number;
	costUsd: null;
	usage: null;
	telemetryUnavailableReason: string;
}
export type Observation = BaseObservation &
	(
		| { status: 'completed'; actual: Verdict; score: number }
		| { status: 'inference-error'; actual: null; score: null; error: string }
	);

const rate = (numerator: number, denominator: number): number | null =>
	denominator ? numerator / denominator : null;

/** Positive means a policy violation. Errors never enter a confusion-matrix denominator. */
export const summarize = (
	rows: Observation[],
	expectations: Record<string, Expectation>,
	plannedRepeats: number
) => {
	let truePositive = 0,
		falsePositive = 0,
		trueNegative = 0,
		falseNegative = 0;
	const completed = rows.filter((row) => row.status === 'completed');
	for (const row of completed) {
		const expected = expectations[row.caseId];
		if (!expected) throw new Error('Missing expected label at reporting time');
		if (expected.verdict === 'fail')
			if (row.actual === 'fail') truePositive++;
			else falseNegative++;
		else if (row.actual === 'fail') falsePositive++;
		else trueNegative++;
	}
	const repeatedGroups = Object.keys(expectations).map((id) =>
		rows.filter((row) => row.caseId === id)
	);
	const eligible =
		plannedRepeats < 2
			? []
			: repeatedGroups.filter(
					(group) =>
						group.length === plannedRepeats && group.every((row) => row.status === 'completed')
				);
	const consistent = eligible.filter(
		(group) => new Set(group.map((row) => row.actual)).size === 1
	).length;
	return {
		attempted: rows.length,
		completed: completed.length,
		inferenceErrors: rows.length - completed.length,
		completionRate: rate(completed.length, rows.length),
		confusion: { truePositive, falsePositive, trueNegative, falseNegative },
		accuracy: {
			numerator: truePositive + trueNegative,
			denominator: completed.length,
			value: rate(truePositive + trueNegative, completed.length)
		},
		falseAlarmRate: {
			numerator: falsePositive,
			denominator: trueNegative + falsePositive,
			value: rate(falsePositive, trueNegative + falsePositive)
		},
		missedViolationRate: {
			numerator: falseNegative,
			denominator: truePositive + falseNegative,
			value: rate(falseNegative, truePositive + falseNegative)
		},
		consistency: {
			unanimousCases: consistent,
			eligibleCases: eligible.length,
			incompleteCases: plannedRepeats < 2 ? 0 : repeatedGroups.length - eligible.length,
			value: rate(consistent, eligible.length)
		},
		meanCompletedLatencyMs: completed.length
			? completed.reduce((sum, row) => sum + row.latencyMs, 0) / completed.length
			: null,
		meanErrorLatencyMs:
			rows.length > completed.length
				? rows
						.filter((row) => row.status === 'inference-error')
						.reduce((sum, row) => sum + row.latencyMs, 0) /
					(rows.length - completed.length)
				: null,
		costUsd: null,
		usage: null,
		telemetryUnavailableReason:
			'The public agentests decision engine returns only a score; usage and billing are not exposed.'
	};
};

export const joinExpectations = (rows: Observation[], expectations: Record<string, Expectation>) =>
	rows.map((row) => {
		const expected = expectations[row.caseId];
		if (!expected) throw new Error('Missing expected label at reporting time');
		return {
			...row,
			expected: expected.verdict,
			rationale: expected.rationale,
			matches: row.status === 'completed' ? row.actual === expected.verdict : null
		};
	});
