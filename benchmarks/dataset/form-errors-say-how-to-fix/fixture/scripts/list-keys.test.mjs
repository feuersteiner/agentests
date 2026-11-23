import { test } from 'node:test';
import assert from 'node:assert/strict';
import { listKeys } from './list-keys.mjs';

test('lists top-level and nested keys as dotted paths', () => {
  assert.deepEqual(listKeys({ title: 'Apply', nav: { home: 'Home', help: 'Help' } }), [
    'title',
    'nav.home',
    'nav.help'
  ]);
});

test('lists nothing for an empty file', () => {
  assert.deepEqual(listKeys({}), []);
});
