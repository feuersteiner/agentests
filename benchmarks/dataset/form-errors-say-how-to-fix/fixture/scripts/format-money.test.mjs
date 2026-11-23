import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatPounds } from './format-money.mjs';

test('shows pounds with two decimal places', () => {
  assert.equal(formatPounds(45000), '£450.00');
});

test('shows an amount under a pound', () => {
  assert.equal(formatPounds(99), '£0.99');
});
