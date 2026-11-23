import { beforeEach, expect, test } from 'bun:test';
import { seed } from '../src/seed.ts';
import { call } from './helpers.ts';

beforeEach(seed);

test('GET /users lists the people in the caller\'s organisation', async () => {
	const res = await call('GET', '/users', { token: 'tok_ben' });
	expect(res.status).toBe(200);
	expect(res.body.map((user: { id: string }) => user.id).sort()).toEqual(['usr_1', 'usr_2', 'usr_4']);
});

test('an admin can change someone\'s role and bio', async () => {
	const res = await call('PATCH', '/admin/users/usr_2', { token: 'tok_mira', body: { role: 'admin', bio: 'Release manager.' } });
	expect(res.status).toBe(200);
	expect(res.body).toMatchObject({ id: 'usr_2', role: 'admin', bio: 'Release manager.', displayName: 'Ben Okafor' });
});

test('an admin cannot edit someone in another organisation', async () => {
	const res = await call('PATCH', '/admin/users/usr_3', { token: 'tok_mira', body: { bio: 'hi' } });
	expect(res.status).toBe(404);
});

test('a member cannot use the admin endpoint', async () => {
	const res = await call('PATCH', '/admin/users/usr_4', { token: 'tok_ben', body: { bio: 'hi' } });
	expect(res.status).toBe(403);
});

test('an unknown role is refused', async () => {
	const res = await call('PATCH', '/admin/users/usr_2', { token: 'tok_mira', body: { role: 'owner' } });
	expect(res.status).toBe(400);
});
