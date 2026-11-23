import type { BenchmarkTest } from './catalogue.ts';

/** A source of numbers in [0, 1) that the same seed always repeats: mulberry32, on a 32-bit seed. */
export const seededRandom = (seed: number): (() => number) => {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let mixed = Math.imul(state ^ (state >>> 15), state | 1);
		mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
		return ((mixed ^ (mixed >>> 14)) >>> 0) / 0x100000000;
	};
};

/** `count` tests, each drawn uniformly from the tests whose rule is not yet picked, so no two share a rule. */
export const pickTests = (
	tests: BenchmarkTest[],
	count: number,
	random: () => number
): BenchmarkTest[] => {
	const rules = new Set(tests.map((test) => test.rule)).size;
	if (rules < count)
		throw new Error(`Cannot pick ${count} tests of different rules from ${rules} usable rule(s)`);
	const picks: BenchmarkTest[] = [];
	let pool = tests;
	while (picks.length < count) {
		const pick = pool[Math.floor(random() * pool.length)]!;
		picks.push(pick);
		pool = pool.filter((test) => test.rule !== pick.rule);
	}
	return picks;
};
