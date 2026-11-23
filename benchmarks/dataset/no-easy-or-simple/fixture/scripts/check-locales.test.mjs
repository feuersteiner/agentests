import assert from 'node:assert/strict';
import { test } from 'node:test';
import { findEmpty } from './check-locales.mjs';

test('reports an empty string', () => {
	assert.deepEqual(findEmpty({ title: '', body: 'Text' }), ['title']);
});

test('reports a string of spaces', () => {
	assert.deepEqual(findEmpty({ title: '  ' }), ['title']);
});
