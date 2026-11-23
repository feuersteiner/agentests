import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkEmail, checkPage, parseFrontMatter } from './check-content.mjs';

const PAGE = `---
title: Sleep sounds
description: Rain, waves and brown noise, mixed the way you like them.
---

# Sleep sounds
`;

test('parseFrontMatter reads the fields', () => {
	assert.deepEqual(parseFrontMatter(PAGE), {
		title: 'Sleep sounds',
		description: 'Rain, waves and brown noise, mixed the way you like them.'
	});
});

test('parseFrontMatter returns null for a file without front matter', () => {
	assert.equal(parseFrontMatter('# Sleep sounds\n'), null);
});

test('checkPage accepts a complete page', () => {
	assert.deepEqual(checkPage(PAGE), []);
});

test('checkPage reports a missing description', () => {
	assert.deepEqual(checkPage('---\ntitle: Sleep sounds\n---\n'), ['missing description']);
});

test('checkPage reports a long description', () => {
	const text = `---\ntitle: Sleep sounds\ndescription: ${'a'.repeat(161)}\n---\n`;
	assert.deepEqual(checkPage(text), ['description is over 160 characters']);
});

test('checkEmail accepts an email with a subject and a preheader', () => {
	const text = '---\nsubject: Welcome to Lullo\npreheader: Set up your routine.\n---\n';
	assert.deepEqual(checkEmail(text), []);
});

test('checkEmail reports a missing subject', () => {
	assert.deepEqual(checkEmail('---\npreheader: Set up your routine.\n---\n'), ['missing subject']);
});
