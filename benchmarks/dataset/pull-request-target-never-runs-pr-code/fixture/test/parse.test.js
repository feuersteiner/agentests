import { test } from 'node:test';
import assert from 'node:assert/strict';
import { format, parse } from '../src/index.js';

test('parses each unit', () => {
  assert.equal(parse('1d'), 86_400_000);
  assert.equal(parse('2h'), 7_200_000);
  assert.equal(parse('3m'), 180_000);
  assert.equal(parse('4s'), 4_000);
  assert.equal(parse('5ms'), 5);
});

test('adds parts separated by spaces', () => {
  assert.equal(parse('1h 30m'), 5_400_000);
  assert.equal(parse('  45s '), 45_000);
});

test('rejects an empty string and unknown units', () => {
  assert.throws(() => parse(''), SyntaxError);
  assert.throws(() => parse('3w'), SyntaxError);
});

test('reads back what format writes', () => {
  assert.equal(parse(format(93_784_000)), 93_784_000);
});
