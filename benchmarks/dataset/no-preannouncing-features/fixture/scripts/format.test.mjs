import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatPrice, readingTime, slugify } from './format.mjs';

test('slugifies a two-word title', () => {
	assert.equal(slugify('Getting started'), 'getting-started');
});

test('reads 600 words in 3 minutes', () => {
	assert.equal(readingTime('word '.repeat(600)), '3 min read');
});

test('formats a whole price', () => {
	assert.equal(formatPrice(5), '$5');
});
