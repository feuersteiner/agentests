import { expect, test } from 'bun:test';
import { formatCents } from '../src/money.ts';

test('groups thousands', () => {
	expect(formatCents(123456)).toBe('$1,234.56');
});

test('formats dollars and cents', () => {
	expect(formatCents(99950)).toBe('$999.50');
	expect(formatCents(44187)).toBe('$441.87');
});
