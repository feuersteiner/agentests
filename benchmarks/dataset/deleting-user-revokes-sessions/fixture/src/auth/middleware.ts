import { json, type Handler } from '../http.ts';
import { users } from '../users/repo.ts';
import { apiKeys } from './apiKeys.ts';
import { sessions, toAuthUser } from './sessions.ts';

/**
 * Lets a request through when it is signed in, and sets req.user. It accepts a session token,
 * `Authorization: Bearer <token>`, and takes the user from the session, or an API key,
 * `Authorization: ApiKey <key>`, and loads the key's owner.
 */
export const requireUser: Handler = async (req) => {
	const [scheme, credential] = (req.headers.get('authorization') ?? '').split(' ');
	if (scheme === 'Bearer' && credential) {
		const session = await sessions.get(credential);
		if (session) {
			req.user = session.user;
			req.sessionToken = credential;
			return;
		}
	}
	if (scheme === 'ApiKey' && credential) {
		const key = await apiKeys.verify(credential);
		const owner = key && (await users.get(key.userId));
		if (owner) {
			req.user = toAuthUser(owner);
			return;
		}
	}
	return json(401, { error: 'sign in first' });
};

/** As requireUser, and answers 403 unless the user is an admin. */
export const requireAdmin: Handler = async (req) => {
	const denied = await requireUser(req);
	if (denied) return denied;
	if (req.user!.role !== 'admin') return json(403, { error: 'admins only' });
};
