import assert from 'node:assert/strict';
import { test } from 'node:test';
import { slugify } from './slugify.mjs';

test('lowercases and hyphenates words', () => {
	assert.equal(slugify('Publish a form'), 'publish-a-form');
});

test('keeps digits', () => {
	assert.equal(slugify('Add 2 owners'), 'add-2-owners');
});
