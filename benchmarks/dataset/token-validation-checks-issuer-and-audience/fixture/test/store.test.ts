import { beforeEach, describe, expect, test } from 'bun:test';
import { listFolders, listMessages, preview, searchMessages, seed } from '../src/store.ts';

beforeEach(() => {
	seed();
});

describe('store', () => {
	test('a new user gets the standard folders', () => {
		expect(listFolders('u-new')).toEqual(['Inbox', 'Sent', 'Drafts']);
	});

	test('messages come newest first', () => {
		expect(listMessages('u-ada', 'Inbox').map((message) => message.id)).toEqual(['m-2', 'm-1']);
	});

	test('search finds a word in the body', () => {
		expect(searchMessages('u-ada', 'Dock Street').map((message) => message.id)).toEqual(['m-2']);
	});

	test('an empty search finds nothing', () => {
		expect(searchMessages('u-ada', '')).toEqual([]);
	});

	test('a short body is its own preview', () => {
		expect(preview('See you at 3.')).toBe('See you at 3.');
	});
});
