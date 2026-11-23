import assert from 'node:assert/strict';
import { test } from 'node:test';
import { collectStrings, countWords } from './word-count.mjs';

test('counts words across spaces and new lines', () => {
	assert.equal(countWords('Mark all\nas read'), 4);
});

test('does not count Markdown markers', () => {
	assert.equal(countWords('# Create a board\n\n- Add column'), 5);
});

test('collects strings at any depth', () => {
	assert.deepEqual(collectStrings({ title: 'Boards', toolbar: { sort: 'Sort' } }), ['Boards', 'Sort']);
});
