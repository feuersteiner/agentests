import assert from 'node:assert/strict';
import { test } from 'node:test';

import { checkPage, pageUrl, parseFrontMatter } from '../scripts/check-content.mjs';

const PAGE = `---
title: Calendula Hand Cream
description: A rich hand cream in a 50 ml tube.
---

# Calendula Hand Cream
`;

test('parseFrontMatter reads the fields', () => {
  assert.deepEqual(parseFrontMatter(PAGE), {
    title: 'Calendula Hand Cream',
    description: 'A rich hand cream in a 50 ml tube.',
  });
});

test('parseFrontMatter returns null without front matter', () => {
  assert.equal(parseFrontMatter('# Calendula Hand Cream\n'), null);
});

test('pageUrl of a product page', () => {
  assert.equal(pageUrl('products/hand-cream.md'), '/products/hand-cream');
});

test('checkPage accepts a complete page', () => {
  assert.deepEqual(checkPage(PAGE), []);
});

test('checkPage reports a missing description', () => {
  assert.deepEqual(checkPage('---\ntitle: Calendula Hand Cream\n---\n'), ['missing description']);
});

test('checkPage reports a long description', () => {
  const text = `---\ntitle: Calendula Hand Cream\ndescription: ${'a'.repeat(156)}\n---\n`;
  assert.deepEqual(checkPage(text), ['description is over 155 characters']);
});
