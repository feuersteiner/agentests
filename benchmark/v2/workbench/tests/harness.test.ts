import { describe, expect, spyOn, test } from 'bun:test';
import { readFileSync, readdirSync } from 'node:fs';
import { main } from '../cli.ts';
import { defaultModelsFile, loadModels, packageEvidence, preparePilot } from '../data.ts';
import type { CaseRecord, Expectation } from '../data.ts';
import { createEvaluator } from '../evaluate.ts';
import { joinExpectations, summarize } from '../metrics.ts';
import type { Observation } from '../metrics.ts';

const expectations: Record<string, Expectation> = {
	good: { verdict: 'pass', rationale: 'Synthetic unit fixture' },
	bad: { verdict: 'fail', rationale: 'Synthetic unit fixture' }
};
const observation = (caseId: string, actual: 'pass' | 'fail' | null, repeat = 1): Observation => {
	const base = {
		model: 'unit',
		caseId,
		repeat,
		inputSha256: 'unit',
		latencyMs: 10,
		logicalDecisionCalls: 1,
		costUsd: null,
		usage: null,
		telemetryUnavailableReason: 'Unit fixture'
	};
	return actual === null
		? {
				...base,
				status: 'inference-error',
				actual: null,
				score: null,
				error: 'Offline failure fixture'
			}
		: { ...base, status: 'completed', actual, score: actual === 'pass' ? 0.9 : 0.1 };
};

describe('consequential reporting logic', () => {
	test('errors stay out of classification denominators and label disagreement', () => {
		const rows = [
			observation('good', 'pass'),
			observation('good', 'fail'),
			observation('bad', 'pass'),
			observation('bad', 'fail'),
			observation('bad', null)
		];
		const result = summarize(rows, expectations, 1);
		expect(result.attempted).toBe(5);
		expect(result.inferenceErrors).toBe(1);
		expect(result.confusion).toEqual({
			truePositive: 1,
			falsePositive: 1,
			trueNegative: 1,
			falseNegative: 1
		});
		expect(result.accuracy).toEqual({ numerator: 2, denominator: 4, value: 0.5 });
		expect(result.falseAlarmRate).toEqual({ numerator: 1, denominator: 2, value: 0.5 });
		expect(result.missedViolationRate).toEqual({ numerator: 1, denominator: 2, value: 0.5 });
		expect(joinExpectations(rows, expectations).at(-1)?.matches).toBeNull();
	});

	test('all-error and absent-class rates are unavailable, never perfect or zero', () => {
		const result = summarize(
			[observation('good', null), observation('bad', null)],
			expectations,
			1
		);
		expect(result.completed).toBe(0);
		expect(result.accuracy.value).toBeNull();
		expect(result.falseAlarmRate.value).toBeNull();
		expect(result.missedViolationRate.value).toBeNull();
		expect(result.meanCompletedLatencyMs).toBeNull();
		expect(result.costUsd).toBeNull();
		expect(result.usage).toBeNull();
		expect(
			summarize([observation('good', 'pass')], expectations, 1).missedViolationRate.value
		).toBeNull();
	});

	test('consistency counts only complete successful repeat groups', () => {
		const complete = [
			observation('good', 'pass', 1),
			observation('good', 'pass', 2),
			observation('bad', 'pass', 1),
			observation('bad', 'fail', 2)
		];
		expect(summarize(complete, expectations, 2).consistency).toEqual({
			unanimousCases: 1,
			eligibleCases: 2,
			incompleteCases: 0,
			value: 0.5
		});
		expect(
			summarize([...complete.slice(0, 3), observation('bad', null, 2)], expectations, 2).consistency
		).toEqual({ unanimousCases: 1, eligibleCases: 1, incompleteCases: 1, value: 1 });
		expect(summarize(complete, expectations, 1).consistency.value).toBeNull();
	});
});

describe('offline boundary and input separation', () => {
	test('all five packets exclude labels, rationale, case IDs, and extra annotations', () => {
		const records = JSON.parse(
			readFileSync(new URL('../../pilot/cases.json', import.meta.url), 'utf8')
		) as CaseRecord[];
		expect(records.length).toBe(5);
		for (const record of records) {
			const contaminated = {
				...record,
				expected: 'DO_NOT_LEAK',
				rationale: 'DO_NOT_LEAK',
				context: { ...record.context, reviewerNotes: 'DO_NOT_LEAK' }
			};
			const normal = packageEvidence(record);
			expect(packageEvidence(contaminated)).toEqual(normal);
			expect(normal.packet).not.toContain('DO_NOT_LEAK');
			expect(normal.packet).not.toContain(record.id);
			expect(Object.keys(JSON.parse(normal.packet))).toEqual(['context', 'completedReply']);
		}
	});

	test('default, validate, help, and run --dry-run never fetch or create output', async () => {
		const originalFetch = globalThis.fetch;
		const log = spyOn(console, 'log').mockImplementation(() => {});
		const resultsDirectory = new URL('../../results/', import.meta.url);
		const before = readdirSync(resultsDirectory).sort();
		let calls = 0;
		const forbidden = () => {
			calls++;
			throw new Error('Network forbidden in offline verification');
		};
		globalThis.fetch = Object.assign(forbidden, { preconnect: forbidden });
		try {
			expect(preparePilot().inputs).toHaveLength(5);
			for (const args of [
				[],
				['validate'],
				['--help'],
				['run', '--dry-run', '--models', 'luna,jev', '--repeat', '3']
			])
				expect(await main(args)).toBe(0);
			expect(calls).toBe(0);
			expect(readdirSync(resultsDirectory).sort()).toEqual(before);
		} finally {
			globalThis.fetch = originalFetch;
			log.mockRestore();
		}
	});

	test('a rejected transport in the genuine runtime is an error, never a fail verdict', async () => {
		const originalFetch = globalThis.fetch;
		let calls = 0;
		// Intercept every fetch; no socket or real credential is used. 401 prevents SDK retries.
		globalThis.fetch = Object.assign(
			async () => {
				calls++;
				return new Response(
					JSON.stringify({ error: { message: 'OFFLINE_TEST_ONLY', type: 'authentication_error' } }),
					{
						status: 401,
						headers: { 'content-type': 'application/json' }
					}
				);
			},
			{
				preconnect: () => {
					throw new Error('Preconnect forbidden in offline verification');
				}
			}
		);
		try {
			const pilot = preparePilot();
			const config = loadModels(defaultModelsFile, pilot.manifest.threshold).luna!;
			const evaluate = createEvaluator('luna', config, pilot.test, {
				OPENAI_API_KEY: 'offline-placeholder'
			});
			const row = await evaluate(pilot.inputs[0]!, 1);
			expect(calls).toBe(1);
			expect(row.status).toBe('inference-error');
			expect(row.actual).toBeNull();
			expect(row.score).toBeNull();
			expect(JSON.stringify(row)).not.toContain('OFFLINE_TEST_ONLY');
			expect(JSON.stringify(row)).not.toContain('offline-placeholder');
			expect(row.logicalDecisionCalls).toBe(1);
		} finally {
			globalThis.fetch = originalFetch;
		}
	});
});
