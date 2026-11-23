import assert from 'node:assert/strict';
import { test } from 'node:test';
import { findMissing } from './missing-keys.mjs';

test('reports a key the translation does not have', () => {
	assert.deepEqual(findMissing({ title: 'Boards', back: 'Back' }, { title: 'Boards' }), ['back']);
});

test('reports nothing when the translation has every key', () => {
	assert.deepEqual(findMissing({ title: 'Inbox' }, { title: 'Posteingang' }), []);
});
