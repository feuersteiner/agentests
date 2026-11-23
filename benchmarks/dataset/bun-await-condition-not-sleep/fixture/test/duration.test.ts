import { expect, test } from 'bun:test';
import { parseDuration } from '../src/duration.ts';

test.each([
	['250ms', 250],
	['5s', 5_000],
	[' 30s ', 30_000]
])('parses %p', (text, expected) => {
	expect(parseDuration(text)).toBe(expected);
});

test('rejects a number without a unit', () => {
	expect(() => parseDuration('250')).toThrow('Not a duration');
});
