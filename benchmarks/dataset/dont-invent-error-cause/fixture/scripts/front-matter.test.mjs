import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFrontMatter } from './front-matter.mjs';

test('reads a subject and a preheader', () => {
	const text = '---\nsubject: Your link expires tomorrow\npreheader: 3 downloads\n---\n\nHi,\n';
	assert.deepEqual(readFrontMatter(text), {
		subject: 'Your link expires tomorrow',
		preheader: '3 downloads'
	});
});
