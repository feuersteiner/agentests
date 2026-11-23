import { app } from '../src/app.ts';
import { apiKeys } from '../src/auth/apiKeys.ts';
import { boards } from '../src/boards/repo.ts';
import { MemoryRedis, useRedis } from '../src/redis.ts';
import { users } from '../src/users/repo.ts';

// Helpers shared by the test files: a fresh set of stores, and requests to the app.

export const SCIM_TOKEN = 'scim-test-token';

/** Empties every store; call it in beforeEach. */
export function resetStores(): void {
	useRedis(new MemoryRedis());
	users.reset();
	boards.reset();
	apiKeys.reset();
	process.env.SCIM_TOKEN = SCIM_TOKEN;
}

interface CallOptions {
	/** A session token, sent as `Authorization: Bearer <token>`. */
	token?: string;
	/** An API key, sent as `Authorization: ApiKey <key>`. */
	apiKey?: string;
	/** A whole Authorization header, for SCIM. */
	authorization?: string;
	body?: unknown;
}

/** Sends one request to the app and returns its status and parsed JSON body. */
export async function call(
	method: string,
	path: string,
	options: CallOptions = {}
): Promise<{ status: number; body: any }> {
	const headers = new Headers();
	if (options.token) headers.set('authorization', `Bearer ${options.token}`);
	if (options.apiKey) headers.set('authorization', `ApiKey ${options.apiKey}`);
	if (options.authorization) headers.set('authorization', options.authorization);
	const init: RequestInit = { method, headers };
	if (options.body !== undefined) init.body = JSON.stringify(options.body);
	const response = await app.fetch(new Request(`http://larchwood.test${path}`, init));
	const text = await response.text();
	return { status: response.status, body: text ? JSON.parse(text) : undefined };
}

/** Signs up a member and returns their token and user. */
export async function signUp(email: string, password = 'correct horse battery') {
	const { body } = await call('POST', '/auth/signup', { body: { email, password } });
	return body as { token: string; user: { id: string; email: string; displayName: string } };
}

/** Signs up an admin and returns their token and user. */
export async function signUpAdmin(email = 'support@larchwood.test') {
	const { user } = await signUp(email);
	await users.update(user.id, { role: 'admin' });
	const { body } = await call('POST', '/auth/login', { body: { email, password: 'correct horse battery' } });
	return body as { token: string; user: { id: string } };
}
