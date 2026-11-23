import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { checkPage, listPages, parseFrontMatter } from './front-matter.mjs';

test('parses the fields of the front matter', () => {
  const text = '---\ntitle: Pricing\ndescription: Two plans.\n---\n\n# Pricing\n';
  assert.deepEqual(parseFrontMatter(text), { title: 'Pricing', description: 'Two plans.' });
});

test('keeps a colon inside a value', () => {
  const text = '---\ntitle: Kilowatch: pricing\n---\n';
  assert.deepEqual(parseFrontMatter(text), { title: 'Kilowatch: pricing' });
});

test('returns null without front matter', () => {
  assert.equal(parseFrontMatter('# Pricing\n'), null);
});

test('reports a missing description', () => {
  assert.deepEqual(checkPage('---\ntitle: Pricing\n---\n'), ['missing description']);
});

test('reports a description over the limit', () => {
  const text = `---\ntitle: Pricing\ndescription: ${'a'.repeat(161)}\n---\n`;
  assert.deepEqual(checkPage(text), ['description is over 160 characters']);
});

test('lists the landing pages in order', () => {
  const content = mkdtempSync(join(tmpdir(), 'content-'));
  mkdirSync(join(content, 'landing'));
  writeFileSync(join(content, 'landing', 'pricing.md'), '');
  writeFileSync(join(content, 'landing', 'home.md'), '');
  writeFileSync(join(content, 'landing', 'notes.txt'), '');
  assert.deepEqual(listPages(content), [
    join(content, 'landing', 'home.md'),
    join(content, 'landing', 'pricing.md'),
  ]);
});
