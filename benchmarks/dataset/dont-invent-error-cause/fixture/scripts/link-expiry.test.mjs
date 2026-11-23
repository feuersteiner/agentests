import assert from 'node:assert/strict';
import { test } from 'node:test';
import { expiresOn } from './link-expiry.mjs';

test('a Free link sent on the first expires a week later', () => {
	assert.equal(expiresOn('2026-11-01', 7), '2026-11-08');
});
