import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatHour, formatSize } from './format.mjs';

test('formats bytes, kilobytes and gigabytes', () => {
	assert.equal(formatSize(500), '500 B');
	assert.equal(formatSize(1536), '1.5 KB');
	assert.equal(formatSize(20 * 1024 ** 3), '20 GB');
});

test('formats an afternoon hour', () => {
	assert.equal(formatHour(14), '14:00');
});
