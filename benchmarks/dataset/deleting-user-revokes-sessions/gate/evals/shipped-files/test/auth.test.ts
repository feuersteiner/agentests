import { beforeEach, describe, expect, test } from 'bun:test';
import { call, resetStores, signUp } from './client.ts';

beforeEach(resetStores);

describe('sign-up and sign-in', () => {
	test('signing up returns a working session', async () => {
		const { status, body } = await call('POST', '/auth/signup', {
			body: { email: 'ana@example.com', password: 'correct horse battery', displayName: 'Ana' }
		});
		expect(status).toBe(201);
		expect(body.user).toMatchObject({ email: 'ana@example.com', displayName: 'Ana', anonymous: false });
		expect((await call('GET', '/account', { token: body.token })).status).toBe(200);
	});

	test('an email can have only one account', async () => {
		await signUp('ana@example.com');
		const { status } = await call('POST', '/auth/signup', {
			body: { email: 'ANA@example.com', password: 'correct horse battery' }
		});
		expect(status).toBe(409);
	});

	test('logs in with the right password only', async () => {
		await signUp('ana@example.com');
		const ok = await call('POST', '/auth/login', { body: { email: 'ana@example.com', password: 'correct horse battery' } });
		expect(ok.status).toBe(200);
		expect(ok.body.token).toBeString();
		const wrong = await call('POST', '/auth/login', { body: { email: 'ana@example.com', password: 'wrong password!' } });
		expect(wrong.status).toBe(401);
		const unknown = await call('POST', '/auth/login', { body: { email: 'zoe@example.com', password: 'wrong password!' } });
		expect(unknown).toEqual(wrong);
	});

	test('logging out ends that session only', async () => {
		const { token } = await signUp('ana@example.com');
		const other = await call('POST', '/auth/login', { body: { email: 'ana@example.com', password: 'correct horse battery' } });
		expect((await call('POST', '/auth/logout', { token })).status).toBe(204);
		expect((await call('GET', '/account', { token })).status).toBe(401);
		expect((await call('GET', '/account', { token: other.body.token })).status).toBe(200);
	});
});

describe('anonymous users', () => {
	test('can sign in without an account and make boards', async () => {
		const { status, body } = await call('POST', '/auth/anonymous');
		expect(status).toBe(201);
		expect(body.user).toMatchObject({ email: null, anonymous: true });
		const board = await call('POST', '/boards', { token: body.sessionToken, body: { title: 'Trying it out' } });
		expect(board.status).toBe(201);
	});

	test('linking signs in to the real account', async () => {
		const { user } = await signUp('ana@example.com');
		const anonymous = await call('POST', '/auth/anonymous');
		const { status, body } = await call('POST', '/auth/link', {
			token: anonymous.body.sessionToken,
			body: { email: 'ana@example.com', password: 'correct horse battery' }
		});
		expect(status).toBe(200);
		expect(body.user.id).toBe(user.id);
		expect((await call('GET', '/account', { token: body.token })).body.id).toBe(user.id);
	});

	test('linking needs the right password', async () => {
		await signUp('ana@example.com');
		const anonymous = await call('POST', '/auth/anonymous');
		const { status } = await call('POST', '/auth/link', {
			token: anonymous.body.sessionToken,
			body: { email: 'ana@example.com', password: 'not the password' }
		});
		expect(status).toBe(401);
	});

	test('only an anonymous user can link', async () => {
		const { token } = await signUp('ana@example.com');
		await signUp('ben@example.com');
		const { status } = await call('POST', '/auth/link', {
			token,
			body: { email: 'ben@example.com', password: 'correct horse battery' }
		});
		expect(status).toBe(400);
	});
});
