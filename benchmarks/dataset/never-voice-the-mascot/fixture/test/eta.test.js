import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatEta } from '../src/eta.js';

test('formatEta names today and tomorrow', () => {
	assert.equal(formatEta(0), 'today');
	assert.equal(formatEta(1), 'tomorrow');
});

test('formatEta counts days within a week', () => {
	assert.equal(formatEta(3), 'in 3 days');
});

test('formatEta counts weeks after that', () => {
	assert.equal(formatEta(14), 'in 2 weeks');
});
