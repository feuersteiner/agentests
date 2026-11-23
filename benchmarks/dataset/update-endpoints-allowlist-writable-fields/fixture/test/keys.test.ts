import { beforeEach, expect, test } from 'bun:test';
import { seed } from '../src/seed.ts';
import { call, NEW_KEY, NEW_KEY_FINGERPRINT } from './helpers.ts';

beforeEach(seed);

test('GET /keys lists only the signed-in user\'s keys', async () => {
	const res = await call('GET', '/keys', { token: 'tok_ben' });
	expect(res.status).toBe(200);
	expect(res.body.map((key: { id: string }) => key.id).sort()).toEqual(['key_1', 'key_2']);
});

test('POST /keys adds a key with its fingerprint', async () => {
	const res = await call('POST', '/keys', { token: 'tok_ben', body: { title: 'tablet', key: NEW_KEY } });
	expect(res.status).toBe(201);
	expect(res.body).toMatchObject({ userId: 'usr_2', title: 'tablet', key: NEW_KEY, fingerprint: NEW_KEY_FINGERPRINT });
});

test('POST /keys drops the comment from the stored key', async () => {
	const res = await call('POST', '/keys', { token: 'tok_ben', body: { title: 'tablet', key: `${NEW_KEY} ben@tablet` } });
	expect(res.status).toBe(201);
	expect(res.body.key).toBe(NEW_KEY);
});

test('POST /keys rejects text that is not a public key', async () => {
	const res = await call('POST', '/keys', { token: 'tok_ben', body: { title: 'tablet', key: 'ssh-ed25519 not-base64!' } });
	expect(res.status).toBe(400);
});

test('POST /keys rejects a key that is already in use', async () => {
	await call('POST', '/keys', { token: 'tok_ben', body: { title: 'tablet', key: NEW_KEY } });
	const res = await call('POST', '/keys', { token: 'tok_mira', body: { title: 'mine', key: NEW_KEY } });
	expect(res.status).toBe(409);
});

test('DELETE /keys/:id removes the key', async () => {
	const res = await call('DELETE', '/keys/key_1', { token: 'tok_ben' });
	expect(res.status).toBe(204);
	const left = await call('GET', '/keys', { token: 'tok_ben' });
	expect(left.body.map((key: { id: string }) => key.id)).toEqual(['key_2']);
});

test('DELETE /keys/:id cannot remove someone else\'s key', async () => {
	const res = await call('DELETE', '/keys/key_3', { token: 'tok_ben' });
	expect(res.status).toBe(404);
});
