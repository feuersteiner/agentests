import { hashPassword, verifyPassword } from '../auth/password.ts';
import { createSession, findSession, SESSION_COOKIE } from '../auth/sessions.ts';
import { createList, listsForUser } from '../db/lists.ts';
import { findByEmail, findById, type User } from '../db/users.ts';
import { json, readCookie, readJson, stringField, type Route } from '../http.ts';

/** The signed-in account, from `Authorization: Bearer <token>` or the web app's session cookie. */
const currentUser = (request: Request): User | undefined => {
	const header = request.headers.get('authorization') ?? '';
	const token = header.startsWith('Bearer ')
		? header.slice('Bearer '.length)
		: readCookie(request, SESSION_COOKIE);
	const session = token ? findSession(token) : undefined;
	const user = session ? findById(session.userId) : undefined;
	return user && !user.disabled ? user : undefined;
};

const notSignedIn = (): Response => json(401, { error: 'Not signed in.' });

/** POST /login: the mobile app's sign-in. Answers with a session token for `Authorization: Bearer`. */
const login = async (request: Request): Promise<Response> => {
	const body = await readJson(request);
	const email = stringField(body, 'email');
	const password = stringField(body, 'password');
	if (!email.trim() || !password) {
		return json(400, { error: 'Enter your email and password.' });
	}

	const user = findByEmail(email);
	const hash = user?.passwordHash ?? (await hashPassword(crypto.randomUUID()));
	const valid = await verifyPassword(password, hash);
	if (!user || !user.passwordHash || user.disabled || !valid) {
		return json(401, { error: 'Incorrect email or password.' });
	}

	const session = createSession(user.id, 'mobile');
	return json(200, { token: session.token, expiresAt: session.expiresAt });
};

/** The API's routes; the server serves them under /api. */
export const apiRoutes: Route[] = [
	{ method: 'POST', path: '/login', handler: login },
	{
		method: 'GET',
		path: '/me',
		handler: async (request) => {
			const user = currentUser(request);
			if (!user) return notSignedIn();
			return json(200, { id: user.id, name: user.name, email: user.email });
		}
	},
	{
		method: 'GET',
		path: '/lists',
		handler: async (request) => {
			const user = currentUser(request);
			if (!user) return notSignedIn();
			const lists = listsForUser(user.id).map((list) => ({
				id: list.id,
				title: list.title,
				itemCount: list.items.length,
				updatedAt: list.updatedAt
			}));
			return json(200, { lists });
		}
	},
	{
		method: 'POST',
		path: '/lists',
		handler: async (request) => {
			const user = currentUser(request);
			if (!user) return notSignedIn();
			const title = stringField(await readJson(request), 'title').trim();
			if (!title) return json(400, { error: 'Give the list a title.' });
			const list = createList(user.id, title);
			return json(201, { id: list.id, title: list.title });
		}
	}
];
