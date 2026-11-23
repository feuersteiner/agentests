import { beforeEach, expect, test } from 'bun:test';
import { seed } from '../src/seed.ts';
import { call } from './helpers.ts';

beforeEach(seed);

test('GET /profile returns the signed-in user', async () => {
	const res = await call('GET', '/profile', { token: 'tok_ben' });
	expect(res.status).toBe(200);
	expect(res.body).toMatchObject({ id: 'usr_2', displayName: 'Ben Okafor', role: 'member' });
});

test('a request without a session gets 401', async () => {
	const res = await call('GET', '/profile');
	expect(res.status).toBe(401);
});

test('an unknown route gets 404', async () => {
	const res = await call('GET', '/nothing-here', { token: 'tok_ben' });
	expect(res.status).toBe(404);
});
