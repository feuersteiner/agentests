import assert from 'node:assert/strict';
import { test } from 'node:test';
import { missingFields, parseFrontmatter } from './frontmatter.mjs';

test('reads the fields and the body', () => {
  const { data, body } = parseFrontmatter('---\nsubject: Welcome\npreheader: Hi\n---\nHello');
  assert.deepEqual(data, { subject: 'Welcome', preheader: 'Hi' });
  assert.equal(body, 'Hello');
});

test('a text without front matter has no fields', () => {
  assert.deepEqual(parseFrontmatter('# Title').data, {});
});

test('reports missing and empty fields', () => {
  assert.deepEqual(missingFields({ subject: 'Welcome', preheader: '' }, ['subject', 'preheader']), [
    'preheader',
  ]);
});
