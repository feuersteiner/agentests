import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseFrontMatter } from './front-matter.mjs';

test('reads the fields of the front matter', () => {
	const text = '---\ntitle: Easy Access Saver\ndescription: Cash savings at 3.10% AER.\n---\n\n# Saver\n';
	assert.deepEqual(parseFrontMatter(text), {
		title: 'Easy Access Saver',
		description: 'Cash savings at 3.10% AER.'
	});
});

test('keeps a colon inside a value', () => {
	assert.deepEqual(parseFrontMatter('---\ntitle: Rates: what changed\n---\n'), {
		title: 'Rates: what changed'
	});
});

test('returns null for a file without front matter', () => {
	assert.equal(parseFrontMatter('# Saver\n'), null);
});

test('returns null when the front matter is never closed', () => {
	assert.equal(parseFrontMatter('---\ntitle: Saver\n'), null);
});
