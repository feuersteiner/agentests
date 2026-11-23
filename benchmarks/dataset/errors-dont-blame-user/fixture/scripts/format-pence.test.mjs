import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatPence } from './format-pence.mjs';

test('formats pounds and pence', () => {
	assert.equal(formatPence(123456), '£1,234.56');
});

test('formats an amount under a pound', () => {
	assert.equal(formatPence(75), '£0.75');
});
