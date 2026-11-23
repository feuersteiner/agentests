import { test } from 'node:test';
import assert from 'node:assert/strict';
import { format } from '../src/index.js';

test('formats hours and minutes', () => {
  assert.equal(format(5_400_000), '1h 30m');
});

test('skips empty units', () => {
  assert.equal(format(86_400_000 + 1_000), '1d 1s');
});

test('shows milliseconds only when asked', () => {
  assert.equal(format(1_250), '1s');
  assert.equal(format(1_250, { ms: true }), '1s 250ms');
});

test('keeps the sign of a negative span', () => {
  assert.equal(format(-90_000), '-1m 30s');
});

test('rejects a non-finite span', () => {
  assert.throws(() => format(Number.NaN), TypeError);
});
