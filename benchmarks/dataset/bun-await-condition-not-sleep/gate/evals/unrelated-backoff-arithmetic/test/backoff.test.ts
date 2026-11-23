import { expect, test } from 'bun:test';
import { backoffDelay } from '../src/backoff.ts';

test.each([
	[1, 100],
	[2, 200],
	[3, 400],
	[4, 800]
])('attempt %p backs off for %p ms', (attempt, delayMs) => {
	expect(backoffDelay(attempt, { baseMs: 100, maxDelayMs: 5_000 })).toBe(delayMs);
});

test('never exceeds the maximum delay', () => {
	expect(backoffDelay(20, { baseMs: 100, maxDelayMs: 5_000 })).toBe(5_000);
});

test('rejects attempt zero', () => {
	expect(() => backoffDelay(0, { baseMs: 100, maxDelayMs: 5_000 })).toThrow('attempt must be at least 1');
});
