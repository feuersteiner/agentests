import assert from 'node:assert/strict';
import { test } from 'node:test';
import { listMacros, readMacro } from './list-macros.mjs';

test('readMacro reads the title and a single tag', () => {
	const macro = readMacro('---\ntitle: Where is my box?\ntags: delivery\n---\n\nHi\n');
	assert.deepEqual(macro, { title: 'Where is my box?', tags: ['delivery'] });
});

test('readMacro gives an empty macro without front matter', () => {
	assert.deepEqual(readMacro('Hi\n'), { title: '', tags: [] });
});

test('listMacros sorts by title', () => {
	const lines = listMacros([
		'---\ntitle: Where is my box?\ntags: delivery\n---\n',
		'---\ntitle: Pause my subscription\ntags: account\n---\n'
	]);
	assert.deepEqual(lines, ['Pause my subscription [account]', 'Where is my box? [delivery]']);
});
