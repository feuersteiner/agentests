import { describe, expect, test } from 'bun:test';
import { convertDuration, parseDuration } from '../src/duration.ts';

describe('convertDuration', () => {
	test('converts to minutes', () => {
		expect(convertDuration(90_000, 'm')).toBe(1.5);
	});

	test('throws on an unknown unit', () => {
		expect(() => convertDuration(1_000, 'fortnight')).toThrow('invalid unit');
	});

	test('passes a loader failure through', async () => {
		const load = async (): Promise<string> => {
			throw new Error('boom.');
		};
		await expect(load().then(parseDuration)).rejects.toThrow('boom.');
	});
});
