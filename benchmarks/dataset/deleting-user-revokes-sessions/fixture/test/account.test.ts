import { beforeEach, describe, expect, test } from 'bun:test';
import { call, resetStores, signUp } from './client.ts';

beforeEach(resetStores);

describe('GET /account', () => {
	test("returns the signed-in user's profile", async () => {
		const { token, user } = await signUp('ana@example.com');
		const { status, body } = await call('GET', '/account', { token });
		expect(status).toBe(200);
		expect(body).toMatchObject({ id: user.id, email: 'ana@example.com', displayName: 'ana', anonymous: false });
	});

	test('answers 401 without a session', async () => {
		expect((await call('GET', '/account')).status).toBe(401);
	});
});

describe('PATCH /account', () => {
	test('changes the display name', async () => {
		const { token } = await signUp('ana@example.com');
		const { status, body } = await call('PATCH', '/account', { token, body: { displayName: 'Ana Lima' } });
		expect(status).toBe(200);
		expect(body.displayName).toBe('Ana Lima');
		expect((await call('GET', '/account', { token })).body.displayName).toBe('Ana Lima');
	});

	test('answers 400 for a missing display name', async () => {
		const { token } = await signUp('ana@example.com');
		expect((await call('PATCH', '/account', { token, body: {} })).status).toBe(400);
	});
});

describe('API keys', () => {
	test('a new key authenticates requests and is listed without its secret', async () => {
		const { token, user } = await signUp('ana@example.com');
		const created = await call('POST', '/account/api-keys', { token, body: { label: 'CI' } });
		expect(created.status).toBe(201);
		expect(created.body.key).toStartWith('lw_');

		expect((await call('GET', '/account', { apiKey: created.body.key })).body.id).toBe(user.id);
		const listed = await call('GET', '/account/api-keys', { token });
		expect(listed.body).toEqual([{ id: created.body.id, label: 'CI', createdAt: expect.any(String), lastUsedAt: expect.any(String) }]);
	});

	test('a revoked key stops working', async () => {
		const { token } = await signUp('ana@example.com');
		const { body: key } = await call('POST', '/account/api-keys', { token, body: { label: 'CI' } });
		expect((await call('DELETE', `/account/api-keys/${key.id}`, { token })).status).toBe(204);
		expect((await call('GET', '/account', { apiKey: key.key })).status).toBe(401);
		expect((await call('GET', '/account/api-keys', { token })).body).toEqual([]);
	});

	test("cannot revoke someone else's key", async () => {
		const ana = await signUp('ana@example.com');
		const ben = await signUp('ben@example.com');
		const { body: key } = await call('POST', '/account/api-keys', { token: ana.token, body: { label: 'CI' } });
		expect((await call('DELETE', `/account/api-keys/${key.id}`, { token: ben.token })).status).toBe(404);
		expect((await call('GET', '/account', { apiKey: key.key })).status).toBe(200);
	});
});
