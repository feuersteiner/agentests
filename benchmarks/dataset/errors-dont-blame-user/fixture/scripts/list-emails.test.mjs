import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFrontmatter } from './list-emails.mjs';

test('reads the subject and the preheader', () => {
	const text = '---\nsubject: Payroll is scheduled\npreheader: 4 employees\n---\n\nHi,\n';
	assert.deepEqual(readFrontmatter(text), {
		subject: 'Payroll is scheduled',
		preheader: '4 employees'
	});
});
