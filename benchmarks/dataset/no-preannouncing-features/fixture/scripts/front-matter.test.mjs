import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFrontMatter } from './front-matter.mjs';

test('reads a title and a description', () => {
	const text = '---\ntitle: Pricing\ndescription: Plans and prices.\n---\n\n# Pricing\n';
	assert.deepEqual(readFrontMatter(text), { title: 'Pricing', description: 'Plans and prices.' });
});
