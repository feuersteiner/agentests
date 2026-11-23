import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatDate } from './format-date.mjs';

test('writes the day, the month name and the year', () => {
	assert.equal(formatDate('2026-11-19'), '19 November 2026');
});
