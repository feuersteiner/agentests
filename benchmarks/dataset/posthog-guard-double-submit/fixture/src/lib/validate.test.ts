import { expect, test } from 'bun:test';
import { isCouponCode, isValidEmail } from './validate';

test('isValidEmail accepts an ordinary address', () => {
  expect(isValidEmail('ana@example.com')).toBe(true);
});

test('isValidEmail rejects an address without a domain', () => {
  expect(isValidEmail('ana@')).toBe(false);
  expect(isValidEmail('ana.example.com')).toBe(false);
});

test('isCouponCode accepts capital letters and digits', () => {
  expect(isCouponCode('SPRING25')).toBe(true);
  expect(isCouponCode('abc')).toBe(false);
});
