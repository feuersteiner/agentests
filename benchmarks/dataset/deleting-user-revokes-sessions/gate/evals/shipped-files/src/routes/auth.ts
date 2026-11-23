import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { requireUser } from '../auth/middleware.ts';
import { sessions, toAuthUser } from '../auth/sessions.ts';
import { json, Router } from '../http.ts';
import { users, type User } from '../users/repo.ts';

const hashPassword = (password: string): string => {
	const salt = randomBytes(16).toString('hex');
	return `${salt}:${scryptSync(password, salt, 32).toString('hex')}`;
};

const passwordMatches = (password: string, stored: string): boolean => {
	const [salt, hash] = stored.split(':');
	return timingSafeEqual(scryptSync(password, salt!, 32), Buffer.from(hash!, 'hex'));
};

/** Checked when no account matches, so that an unknown email takes as long as a wrong password. */
const DUMMY_HASH = hashPassword(randomBytes(16).toString('hex'));

/** The account with this email and password, or null. */
async function checkCredentials(email: unknown, password: unknown): Promise<User | null> {
	if (typeof email !== 'string' || typeof password !== 'string') return null;
	const user = await users.findByEmail(email);
	const matches = passwordMatches(password, user?.passwordHash ?? DUMMY_HASH);
	return user?.passwordHash && matches ? user : null;
}

export const authRoutes = new Router();

/** POST /auth/signup: creates an account and signs in to it. */
authRoutes.post('/auth/signup', async (req) => {
	const { email, password, displayName } = req.body;
	if (typeof email !== 'string' || !email.includes('@')) return json(400, { error: 'a valid email is required' });
	if (typeof password !== 'string' || password.length < 10) {
		return json(400, { error: 'the password needs at least 10 characters' });
	}
	if (await users.findByEmail(email)) return json(409, { error: 'that email already has an account' });
	const user = await users.create({
		email,
		displayName: typeof displayName === 'string' && displayName.trim() ? displayName.trim() : email.split('@')[0]!,
		role: 'member',
		anonymous: false,
		passwordHash: hashPassword(password)
	});
	const session = await sessions.create(toAuthUser(user));
	return json(201, { token: session.token, user: toAuthUser(user) });
});

/** POST /auth/login: signs in with an email and password. */
authRoutes.post('/auth/login', async (req) => {
	const user = await checkCredentials(req.body.email, req.body.password);
	if (!user) return json(401, { error: 'wrong email or password' });
	const session = await sessions.create(toAuthUser(user));
	return json(200, { token: session.token, user: toAuthUser(user) });
});

/** POST /auth/anonymous: signs in without an account, so a visitor can try boards first. */
authRoutes.post('/auth/anonymous', async () => {
	const user = await users.create({
		email: null,
		displayName: 'Anonymous',
		role: 'member',
		anonymous: true,
		passwordHash: null
	});
	const session = await sessions.create(toAuthUser(user));
	return json(201, { sessionToken: session.token, user: toAuthUser(user) });
});

/** POST /auth/link: an anonymous user signs in to their real account, and gets a session for it. */
authRoutes.post('/auth/link', requireUser, async (req) => {
	if (!req.user!.anonymous) return json(400, { error: 'only an anonymous user can link an account' });
	const account = await checkCredentials(req.body.email, req.body.password);
	if (!account) return json(401, { error: 'wrong email or password' });
	const session = await sessions.create(toAuthUser(account));
	return json(200, { token: session.token, user: toAuthUser(account) });
});

/** POST /auth/logout: ends the session the request was made with. */
authRoutes.post('/auth/logout', requireUser, async (req) => {
	if (!req.sessionToken) return json(400, { error: 'an API key cannot sign out' });
	await sessions.revoke(req.sessionToken);
	return json(204);
});
