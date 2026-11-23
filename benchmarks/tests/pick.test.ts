import { describe, expect, test } from 'bun:test';
import { loadTests } from '../src/catalogue.ts';
import type { BenchmarkTest } from '../src/catalogue.ts';
import { pickTests, seededRandom } from '../src/pick.ts';
import { readTriage } from './helpers/research.ts';

/** A test of `rule` at task position `task`, with placeholder fields. */
const testOf = (rule: string, task: number): BenchmarkTest => ({
	rule,
	domain: 'dev',
	file: 'research/rules.yaml',
	verdict: 'as-is',
	task,
	prompt: `${rule} ${task}`
});

/** `rule#task` for each pick, to compare picks. */
const keysOf = (picks: BenchmarkTest[]): string[] =>
	picks.map((pick) => `${pick.rule}#${pick.task}`);

const seeds = Array.from({ length: 500 }, (_, index) => index);

describe('seededRandom', () => {
	test('repeats the same sequence for the same seed', () => {
		const first = seededRandom(42);
		const second = seededRandom(42);
		const sequence = Array.from({ length: 5 }, () => first());
		expect(Array.from({ length: 5 }, () => second())).toEqual(sequence);
	});

	test('gives numbers in [0, 1)', () => {
		const random = seededRandom(7);
		for (let index = 0; index < 1000; index++) {
			const value = random();
			expect(value).toBeGreaterThanOrEqual(0);
			expect(value).toBeLessThan(1);
		}
	});
});

describe('pickTests', () => {
	const triage = readTriage();
	const tests = loadTests();

	test('gives the same pick for the same seed', () => {
		expect(pickTests(tests, 3, seededRandom(1234))).toEqual(
			pickTests(tests, 3, seededRandom(1234))
		);
	});

	test('gives different picks for different seeds', () => {
		const picks = seeds.slice(0, 20).map((seed) => keysOf(pickTests(tests, 3, seededRandom(seed))));
		expect(new Set(picks.map((keys) => keys.join(' '))).size).toBe(20);
	});

	test('picks 3 tests of 3 different rules', () => {
		for (const seed of seeds) {
			const picks = pickTests(tests, 3, seededRandom(seed));
			expect(picks).toHaveLength(3);
			expect(new Set(picks.map((pick) => pick.rule)).size).toBe(3);
		}
	});

	test('never picks a dropped rule or a task its usable_tasks leaves out', () => {
		const entries = new Map(triage.rules.map((entry) => [entry.id, entry]));
		for (const seed of seeds)
			for (const pick of pickTests(tests, 3, seededRandom(seed))) {
				const entry = entries.get(pick.rule)!;
				expect(entry.verdict).not.toBe('drop');
				expect(entry.usable_tasks ?? [1, 2, 3, 4]).toContain(pick.task);
			}
	});

	test('draws each pick with the injected random source', () => {
		const pool = [testOf('a', 1), testOf('a', 2), testOf('b', 1), testOf('c', 1)];
		expect(keysOf(pickTests(pool, 2, () => 0))).toEqual(['a#1', 'b#1']);
		expect(keysOf(pickTests(pool, 2, () => 0.99))).toEqual(['c#1', 'b#1']);
	});

	test('picks one test of each rule when there are as many rules as picks', () => {
		const pool = [...[1, 2, 3, 4].map((task) => testOf('a', task)), testOf('b', 1), testOf('c', 1)];
		for (const seed of seeds.slice(0, 50)) {
			const rules = pickTests(pool, 3, seededRandom(seed)).map((pick) => pick.rule);
			expect(rules.sort()).toEqual(['a', 'b', 'c']);
		}
	});

	test('throws when there are fewer usable rules than picks', () => {
		const pool = [testOf('a', 1), testOf('a', 2), testOf('b', 1)];
		expect(() => pickTests(pool, 3, seededRandom(1))).toThrow(
			'Cannot pick 3 tests of different rules from 2 usable rule(s)'
		);
	});
});
