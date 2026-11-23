import { describe, expect, test } from 'bun:test';
import { parseDate, parseTime } from '../src/parse.ts';

describe('parseDate', () => {
	test('parses a calendar date at midnight UTC', () => {
		expect(parseDate('2024-11-23').toISOString()).toBe('2024-11-23T00:00:00.000Z');
	});

	test('rejects other forms', () => {
		expect(() => parseDate('23/11/2024')).toThrow(SyntaxError);
	});

	test('rejects days that are not in the calendar', () => {
		expect(() => parseDate('2023-02-29')).toThrow(
			'Cannot parse date "2023-02-29" as it must be a day in the calendar: current value rolls over to 2023-03-01'
		);
	});
});

describe('parseTime', () => {
	test('parses hours and minutes', () => {
		expect(parseTime('09:05')).toEqual({ hours: 9, minutes: 5 });
		expect(parseTime('7:30')).toEqual({ hours: 7, minutes: 30 });
	});

	test('rejects other forms', () => {
		expect(() => parseTime('9.30')).toThrow(SyntaxError);
	});
});
