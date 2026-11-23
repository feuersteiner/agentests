import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatDate, formatPrice } from './format.mjs';

test('formatPrice shows pounds and pence', () => {
	assert.equal(formatPrice(2450), '£24.50');
	assert.equal(formatPrice(1299), '£12.99');
});

test('formatPrice groups thousands', () => {
	assert.equal(formatPrice(123456), '£1,234.56');
});

test('formatDate gives the weekday, day and month', () => {
	assert.equal(formatDate('2026-12-15'), 'Tuesday 15 December');
	assert.equal(formatDate('2027-01-22'), 'Friday 22 January');
});
