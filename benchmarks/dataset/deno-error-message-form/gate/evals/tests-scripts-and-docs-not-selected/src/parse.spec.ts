import { expect, test } from 'bun:test';
import { parseTime } from './parse.ts';

test('rejects 24:30', () => {
	expect(() => parseTime('24:30')).toThrow('Invalid time');
});

test('fake reader', () => {
	const read = () => Promise.reject(new Error('read failed.'));
	return expect(read()).rejects.toThrow();
});
