import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { checkFile, listMarkdown } from './check-content.mjs';

test('accepts a page with a title and a description', () => {
	const text = '---\ntitle: Saver\ndescription: Cash savings at 3.10% AER.\n---\n';
	assert.deepEqual(checkFile('content/landing/saver.md', text), []);
});

test('reports a page without a description', () => {
	assert.deepEqual(checkFile('content/landing/saver.md', '---\ntitle: Saver\n---\n'), [
		'missing description'
	]);
});

test('reports a description over the limit', () => {
	const text = `---\ntitle: Saver\ndescription: ${'a'.repeat(156)}\n---\n`;
	assert.deepEqual(checkFile('content/landing/saver.md', text), [
		'description is over 155 characters'
	]);
});

test('asks an email for a subject and a preheader', () => {
	assert.deepEqual(checkFile('emails/welcome.md', '---\nsubject: Welcome\n---\n'), [
		'missing preheader'
	]);
});

test('reports a file without front matter', () => {
	assert.deepEqual(checkFile('content/push/saver-rate.md', '## Push notification\n'), [
		'no front matter'
	]);
});

test('lists the Markdown files of a folder', () => {
	const folder = mkdtempSync(join(tmpdir(), 'kestrel-'));
	for (const name of ['b.md', 'a.md', 'notes.txt']) writeFileSync(join(folder, name), '');
	assert.deepEqual(listMarkdown(folder), [join(folder, 'a.md'), join(folder, 'b.md')]);
});
