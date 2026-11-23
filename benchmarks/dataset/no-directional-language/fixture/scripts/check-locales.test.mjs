import assert from 'node:assert/strict';
import { test } from 'node:test';
import { findEmpty } from './check-locales.mjs';

test('reports an empty top-level string', () => {
  assert.deepEqual(findEmpty({ title: '', body: 'Text' }), ['title']);
});

test('reports an empty nested string by its dotted path', () => {
  assert.deepEqual(findEmpty({ editor: { logic: { tab: 'Logic', empty: '' } } }), [
    'editor.logic.empty',
  ]);
});

test('reports nothing when every string has text', () => {
  assert.deepEqual(findEmpty({ nav: { forms: 'Forms' } }), []);
});
