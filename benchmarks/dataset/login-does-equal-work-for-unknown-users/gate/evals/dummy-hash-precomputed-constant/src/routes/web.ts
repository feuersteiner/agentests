import { verifyPassword } from '../auth/password.ts';
import { createSession, revokeSession, SESSION_COOKIE, SESSION_DAYS } from '../auth/sessions.ts';
import { findByEmail } from '../db/users.ts';
import pkg from '../../package.json';
import { json, readCookie, readJson, stringField, type Route } from '../http.ts';

/** argon2id hash of a random password nobody knows, made once instead of at every startup. */
const DUMMY_HASH =
	'$argon2id$v=19$m=65536,t=2,p=1$SrD2zOQHcTd+pjL3FoLBki9I0SHxCUN82C+TkZiPR8U$gQngLXNmAF6AB2ckFN8rYnG2sPtvhtVKVG4exuruMps';

/** POST /login: the web app's sign-in form. Answers with the account's name and sets the session cookie. */
const login = async (request: Request): Promise<Response> => {
	const body = await readJson(request);
	const email = stringField(body, 'email');
	const password = stringField(body, 'password');
	if (!email.trim() || !password) {
		return json(400, { error: 'Enter your email and password.' });
	}

	const user = findByEmail(email);
	const valid = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
	if (!user || !user.passwordHash || !valid) {
		return json(401, { error: 'Incorrect email or password.' });
	}

	const session = createSession(user.id, 'web');
	const maxAge = SESSION_DAYS * 24 * 60 * 60;
	return json(
		200,
		{ id: user.id, name: user.name },
		{
			'Set-Cookie': `${SESSION_COOKIE}=${session.token}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=Lax`
		}
	);
};

/** POST /logout: ends the session of the cookie. */
const logout = async (request: Request): Promise<Response> => {
	const token = readCookie(request, SESSION_COOKIE);
	if (token) revokeSession(token);
	return new Response(null, {
		status: 204,
		headers: { 'Set-Cookie': `${SESSION_COOKIE}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax` }
	});
};

export const webRoutes: Route[] = [
	{ method: 'POST', path: '/login', handler: login },
	{ method: 'POST', path: '/logout', handler: logout },
	{ method: 'GET', path: '/healthz', handler: async () => json(200, { ok: true, version: pkg.version }) }
];
