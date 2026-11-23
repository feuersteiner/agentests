import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatPostcode } from './format-postcode.mjs';

test('upper-cases a postcode and adds the space', () => {
  assert.equal(formatPostcode('sw1a1aa'), 'SW1A 1AA');
});

test('keeps a postcode that is already formatted', () => {
  assert.equal(formatPostcode('EC1A 1BB'), 'EC1A 1BB');
});
