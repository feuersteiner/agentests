import { beforeEach, describe, expect, test } from 'bun:test';
import { handle } from '../src/server.ts';
import { seed } from '../src/store.ts';
import { get, installTestKeys, signToken } from './helpers.ts';

beforeEach(() => {
	seed();
	installTestKeys();
});

describe('mail routes', () => {
	test('list the signed-in user\'s folders', async () => {
		const response = await handle(get('/api/mail/folders', signToken('enterprise')));
		expect(response.status).toBe(200);
		expect((await response.json()).folders).toContain('Receipts');
	});

	test('list a folder\'s messages, newest first', async () => {
		const response = await handle(get('/api/mail/messages?folder=Inbox', signToken('enterprise')));
		const { messages } = await response.json();
		expect(messages.map((message: { id: string }) => message.id)).toEqual(['m-2', 'm-1']);
	});

	test('search subjects and bodies', async () => {
		const response = await handle(get('/api/mail/search?q=receipt', signToken('enterprise')));
		const { messages } = await response.json();
		expect(messages.map((message: { id: string }) => message.id)).toEqual(['m-3']);
	});

	test('turn away a request without a token', async () => {
		const response = await handle(get('/api/mail/folders'));
		expect(response.status).toBe(401);
	});

	test('turn away an expired token', async () => {
		const past = Math.floor(Date.now() / 1000) - 60;
		const response = await handle(get('/api/mail/folders', signToken('enterprise', { exp: past })));
		expect(response.status).toBe(401);
		expect((await response.json()).error).toBe('token expired');
	});

	test('turn away a personal account, until personal accounts launch', async () => {
		const response = await handle(get('/api/mail/folders', signToken('consumer')));
		expect(response.status).toBe(401);
	});
});
