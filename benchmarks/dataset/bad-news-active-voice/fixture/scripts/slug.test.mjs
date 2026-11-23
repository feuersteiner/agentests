import assert from 'node:assert/strict';
import { test } from 'node:test';
import { slugify } from './slug.mjs';

test('joins the words of a title with hyphens', () => {
	assert.equal(slugify('Pension reports are here'), 'pension-reports-are-here');
});
