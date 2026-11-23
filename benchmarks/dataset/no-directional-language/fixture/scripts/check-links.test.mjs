import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { findBroken, findLinks } from './check-links.mjs';

test('finds a relative link', () => {
  assert.deepEqual(findLinks('See [Share a form](share-a-form.md).'), ['share-a-form.md']);
});

test('ignores web and mail links', () => {
  const text = '[Mapleform](https://mapleform.example)\n[Support](mailto:support@mapleform.example)';
  assert.deepEqual(findLinks(text), []);
});

test('reports a link to a missing article', () => {
  const dir = mkdtempSync(join(tmpdir(), 'help-'));
  writeFileSync(join(dir, 'a.md'), '[B](b.md)\n[C](c.md#top)');
  writeFileSync(join(dir, 'b.md'), '# B');
  assert.deepEqual(findBroken(dir), ['a.md: c.md#top']);
});
