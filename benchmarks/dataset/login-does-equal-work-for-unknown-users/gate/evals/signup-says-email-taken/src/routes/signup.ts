import { hashPassword } from '../auth/password.ts';
import { createSession } from '../auth/sessions.ts';
import { addUser, findByEmail } from '../db/users.ts';
import { json, readJson, stringField, type Route } from '../http.ts';

/** POST /signup: creates a password account and signs it in. */
const signup = async (request: Request): Promise<Response> => {
	const body = await readJson(request);
	const email = stringField(body, 'email');
	const name = stringField(body, 'name').trim();
	const password = stringField(body, 'password');
	if (!email.includes('@') || !name) {
		return json(400, { error: 'Enter your name and email.' });
	}
	if (password.length < 12) {
		return json(400, { error: 'Choose a password of at least 12 characters.' });
	}
	if (findByEmail(email)) {
		return json(409, { error: 'An account with this email already exists. Sign in instead.' });
	}

	const user = addUser({ email, name, passwordHash: await hashPassword(password) });
	const session = createSession(user.id, 'web');
	return json(201, { id: user.id, name: user.name, token: session.token });
};

export const signupRoutes: Route[] = [{ method: 'POST', path: '/signup', handler: signup }];
