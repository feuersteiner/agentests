import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatMoney, maskCard } from '../src/format.js';

test('formatMoney groups thousands', () => {
	assert.equal(formatMoney(1234.56), '€1,234.56');
});

test('formatMoney shows whole amounts with two decimals', () => {
	assert.equal(formatMoney(80), '€80.00');
});

test('maskCard hides all but four digits', () => {
	assert.match(maskCard('4242 4242 4242 4242'), /^•••• \d{4}$/);
});
