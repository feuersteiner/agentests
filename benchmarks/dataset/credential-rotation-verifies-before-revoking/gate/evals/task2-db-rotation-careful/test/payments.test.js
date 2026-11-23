import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatAmount } from '../payments/src/index.js';

test('formatAmount shows pounds and pence', () => {
	assert.equal(formatAmount(1999, 'GBP'), '£19.99');
});

test('formatAmount shows euros', () => {
	assert.equal(formatAmount(500, 'EUR'), '€5.00');
});

test('formatAmount falls back to the currency code', () => {
	assert.equal(formatAmount(1250, 'CHF'), 'CHF 12.50');
});

test('formatAmount shows yen and won without decimals', () => {
	assert.equal(formatAmount(500, 'JPY'), '¥500');
	assert.equal(formatAmount(12000, 'KRW'), '₩12000');
});
