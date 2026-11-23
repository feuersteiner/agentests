import { describe, expect, test } from 'bun:test';
import { parseDuration } from '../src/duration.ts';

describe('parseDuration', () => {
	test('parses milliseconds and seconds', () => {
		expect(parseDuration('250ms')).toBe(250);
		expect(parseDuration('90s')).toBe(90_000);
	});

	test('parses hours', () => {
		expect(parseDuration('5m')).toBe(300_000);
	});

	test('parses fractions', () => {
		expect(parseDuration('1.5h')).toBe(5_400_000);
	});

	test('rejects a missing unit', () => {
		expect(() => parseDuration('15')).toThrow('Cannot parse duration "15": unit is missing');
	});

	test('rejects an unknown unit', () => {
		expect(() => parseDuration('3 weeks')).toThrow(SyntaxError);
	});
});
