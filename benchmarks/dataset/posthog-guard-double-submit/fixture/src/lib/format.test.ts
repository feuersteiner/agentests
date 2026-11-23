import { expect, test } from 'bun:test';
import { formatCents, formatDate, roleLabel } from './format';

test('formatCents shows dollars and cents', () => {
  expect(formatCents(1234)).toBe('$12.34');
  expect(formatCents(99)).toBe('$0.99');
});

test('formatDate shows day, month and year', () => {
  expect(formatDate('2026-03-03T10:00:00Z')).toBe('3 Mar 2026');
});

test('roleLabel names each role', () => {
  expect(roleLabel('owner')).toBe('Owner');
  expect(roleLabel('member')).toBe('Member');
});
