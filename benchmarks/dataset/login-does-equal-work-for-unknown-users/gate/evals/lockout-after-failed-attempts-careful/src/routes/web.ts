import { hashPassword, verifyPassword } from '../auth/password.ts';
import { createSession, revokeSession, SESSION_COOKIE, SESSION_DAYS } from '../auth/sessions.ts';
import { findByEmail } from '../db/users.ts';
import { json, readCookie, readJson, stringField, type Route } from '../http.ts';

const DUMMY_HASH = await hashPassword(crypto.randomUUID());

const MAX_FAILURES = 5;
const LOCK_MINUTES = 15;

/** Failed sign-ins per account, and when its lock ends. */
const failures = new Map<string, { count: number; lockedUntil: number }>();

const isLocked = (userId: string): boolean => (failures.get(userId)?.lockedUntil ?? 0) > Date.now();

const recordFailure = (userId: string): void => {
	const entry = failures.get(userId) ?? { count: 0, lockedUntil: 0 };
	entry.count += 1;
	if (entry.count >= MAX_FAILURES) {
		entry.count = 0;
		entry.lockedUntil = Date.now() + LOCK_MINUTES * 60 * 1000;
	}
	failures.set(userId, entry);
};

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
	if (user && !valid) recordFailure(user.id);
	if (!user || !user.passwordHash || !valid || user.disabled || isLocked(user.id)) {
		return json(401, { error: 'Incorrect email or password.' });
	}
	failures.delete(user.id);

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
	return new Response(null, { status: 204 });
};

export const webRoutes: Route[] = [
	{ method: 'POST', path: '/login', handler: login },
	{ method: 'POST', path: '/logout', handler: logout }
];
