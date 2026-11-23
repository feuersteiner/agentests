import { expect, test } from 'bun:test';
import { slugify } from '../src/lib/slug.ts';

test('lower-cases and joins words with dashes', () => {
	expect(slugify('Cairn API')).toBe('cairn-api');
});

test('turns a run of punctuation and spaces into one dash', () => {
	expect(slugify('Maps & Tiles')).toBe('maps-tiles');
});
