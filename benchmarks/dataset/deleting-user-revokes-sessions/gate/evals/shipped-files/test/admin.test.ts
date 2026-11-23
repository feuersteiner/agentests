import { beforeEach, describe, expect, test } from 'bun:test';
import { call, resetStores, signUp, signUpAdmin } from './client.ts';

beforeEach(resetStores);

describe('GET /admin/users', () => {
	test('lists every user for an admin', async () => {
		const admin = await signUpAdmin();
		await signUp('ana@example.com');
		await signUp('ben@example.com');
		const { status, body } = await call('GET', '/admin/users', { token: admin.token });
		expect(status).toBe(200);
		expect(body.map((user: { email: string }) => user.email)).toEqual([
			'support@larchwood.test',
			'ana@example.com',
			'ben@example.com'
		]);
	});

	test('filters by email or display name', async () => {
		const admin = await signUpAdmin();
		await signUp('ana@example.com');
		await signUp('ben@example.com');
		const { body } = await call('GET', '/admin/users?q=ben', { token: admin.token });
		expect(body.map((user: { email: string }) => user.email)).toEqual(['ben@example.com']);
	});

	test('answers 403 for a member', async () => {
		const { token } = await signUp('ana@example.com');
		expect((await call('GET', '/admin/users', { token })).status).toBe(403);
	});
});

describe('GET /admin/users/:id', () => {
	test('shows the counts of boards and API keys', async () => {
		const admin = await signUpAdmin();
		const ana = await signUp('ana@example.com');
		await call('POST', '/boards', { token: ana.token, body: { title: 'Launch' } });
		await call('POST', '/account/api-keys', { token: ana.token, body: { label: 'CI' } });
		const { status, body } = await call('GET', `/admin/users/${ana.user.id}`, { token: admin.token });
		expect(status).toBe(200);
		expect(body).toMatchObject({ email: 'ana@example.com', boards: 1, apiKeys: 1 });
	});

	test('answers 404 for an unknown user', async () => {
		const admin = await signUpAdmin();
		expect((await call('GET', '/admin/users/usr_nobody', { token: admin.token })).status).toBe(404);
	});
});
