import assert from 'node:assert/strict';
import { test } from 'node:test';

import { formatPrice } from './format-price.mjs';

test('formats whole pounds without pence', () => {
  assert.equal(formatPrice(1900), '£19');
  assert.equal(formatPrice(3500), '£35');
});

test('formats pounds and pence', () => {
  assert.equal(formatPrice(1925), '£19.25');
});
