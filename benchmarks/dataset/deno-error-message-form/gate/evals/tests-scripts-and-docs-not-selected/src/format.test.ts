import { expect, test } from 'bun:test';
import { formatDuration } from './format.ts';

test('rejects a precision of 9', () => {
	expect(() => formatDuration(1_000, { precision: 9 })).toThrow(RangeError);
});

test('a failing fake clock', () => {
	const clock = () => {
		throw new Error('clock broke.');
	};
	expect(clock).toThrow('clock broke.');
});
