import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { lookup, screens } from '../src/screens.js';

const en = JSON.parse(readFileSync(new URL('../locales/en.json', import.meta.url), 'utf8'));

test('every screen title and hint has a string', () => {
	for (const screen of screens) {
		assert.equal(typeof lookup(en, screen.title), 'string', screen.title);
		if (screen.hint) assert.equal(typeof lookup(en, screen.hint), 'string', screen.hint);
	}
});

test('every empty state has an illustration, a title and a body', () => {
	for (const screen of screens.filter((item) => item.empty)) {
		const empty = lookup(en, screen.empty);
		for (const field of ['illustration', 'illustrationAlt', 'title', 'body'])
			assert.equal(typeof empty[field], 'string', `${screen.empty}.${field}`);
	}
});
