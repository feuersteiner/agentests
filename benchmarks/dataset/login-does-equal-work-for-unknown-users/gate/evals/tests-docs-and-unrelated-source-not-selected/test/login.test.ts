import { beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { hashPassword } from '../src/auth/password.ts';
import { clearSessions, findSession } from '../src/auth/sessions.ts';
import { addUser, clearUsers } from '../src/db/users.ts';
import { handle } from '../src/server.ts';

const post = (path: string, body?: unknown, headers: Record<string, string> = {}) =>
	handle(
		new Request(`http://sorrel.test${path}`, {
			method: 'POST',
			headers: { 'content-type': 'application/json', ...headers },
			body: body === undefined ? undefined : JSON.stringify(body)
		})
	);

const sessionToken = (response: Response): string | undefined =>
	/sorrel_session=([^;]+)/.exec(response.headers.get('set-cookie') ?? '')?.[1];

let adaHash: string;

beforeAll(async () => {
	adaHash = await hashPassword('correct horse battery');
});

beforeEach(() => {
	clearUsers();
	clearSessions();
	addUser({ email: 'ada@example.com', name: 'Ada', passwordHash: adaHash });
	addUser({ email: 'grace@example.com', name: 'Grace', ssoProvider: 'google' });
});

describe('POST /login', () => {
	test('signs in with the right password and sets the session cookie', async () => {
		const response = await post('/login', {
			email: ' Ada@Example.com',
			password: 'correct horse battery'
		});
		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject({ name: 'Ada' });
		expect(response.headers.get('set-cookie')).toContain('HttpOnly');
		const token = sessionToken(response);
		expect(token && findSession(token)?.client).toBe('web');
	});

	test('refuses a wrong password', async () => {
		const response = await post('/login', { email: 'ada@example.com', password: 'wrong' });
		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: 'Incorrect email or password.' });
		expect(response.headers.get('set-cookie')).toBeNull();
	});

	test('refuses an email without an account', async () => {
		const response = await post('/login', { email: 'nobody@example.com', password: 'anything' });
		expect(response.status).toBe(401);
	});

	test('tells an account that signs in with Google to use Google', async () => {
		const response = await post('/login', { email: 'grace@example.com', password: 'anything' });
		expect(response.status).toBe(409);
		expect(await response.json()).toEqual({ error: 'This account signs in with Google.' });
	});

	test('asks for both fields', async () => {
		const response = await post('/login', { email: 'ada@example.com' });
		expect(response.status).toBe(400);
	});
});

describe('POST /logout', () => {
	test('ends the session', async () => {
		const login = await post('/login', {
			email: 'ada@example.com',
			password: 'correct horse battery'
		});
		const token = sessionToken(login)!;
		const response = await post('/logout', undefined, { cookie: `sorrel_session=${token}` });
		expect(response.status).toBe(204);
		expect(findSession(token)).toBeUndefined();
	});
});
