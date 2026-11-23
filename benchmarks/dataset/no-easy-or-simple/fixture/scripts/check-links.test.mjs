import assert from 'node:assert/strict';
import { test } from 'node:test';
import { findBrokenLinks, findLocalLinks } from './check-links.mjs';

test('finds links to other files and ignores websites and email addresses', () => {
	const text = '[a](publish-a-form.md) [b](https://example.com) [c](mailto:x@example.com)';
	assert.deepEqual(findLocalLinks(text), ['publish-a-form.md']);
});

test('reports a link whose file is missing', () => {
	const exists = (target) => target === 'publish-a-form.md';
	assert.deepEqual(findBrokenLinks('[a](publish-a-form.md) [b](gone.md)', exists), ['gone.md']);
});
