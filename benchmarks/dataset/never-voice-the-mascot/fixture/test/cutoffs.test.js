import assert from 'node:assert/strict';
import { test } from 'node:test';
import { carriersByCutoff, cutoffFor } from '../src/cutoffs.js';

test('cutoffFor returns the last sending day', () => {
	assert.equal(cutoffFor('postnl'), '2026-12-22');
	assert.equal(cutoffFor('nobody'), null);
});

test('carriersByCutoff lists the earliest first', () => {
	assert.deepEqual(carriersByCutoff(), ['ups', 'dhl', 'postnl']);
});
