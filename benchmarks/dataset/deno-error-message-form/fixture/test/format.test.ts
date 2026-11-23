import { describe, expect, test } from 'bun:test';
import { formatDate, formatDuration } from '../src/format.ts';

describe('formatDuration', () => {
	test('uses the largest unit that fits', () => {
		expect(formatDuration(5_400_000)).toBe('1.5 h');
		expect(formatDuration(250)).toBe('250 ms');
	});

	test('rounds to the precision', () => {
		expect(formatDuration(100_000, { precision: 0 })).toBe('2 min');
		expect(formatDuration(100_000, { precision: 2 })).toBe('1.67 min');
	});

	test('writes German labels and decimals', () => {
		expect(formatDuration(5_400_000, { locale: 'de' })).toBe('1,5 Std.');
	});
});

describe('formatDate', () => {
	test('writes the UTC calendar date', () => {
		expect(formatDate(new Date(Date.UTC(2024, 10, 23)))).toBe('2024-11-23');
	});
});
