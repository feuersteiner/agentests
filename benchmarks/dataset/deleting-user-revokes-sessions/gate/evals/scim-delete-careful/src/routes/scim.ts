import { apiKeys } from '../auth/apiKeys.ts';
import { sessions } from '../auth/sessions.ts';
import { json, Router, type Handler } from '../http.ts';
import { users, type User } from '../users/repo.ts';

// SCIM 2.0 provisioning (RFC 7644), for customers whose identity provider, such as Okta or
// Entra ID, creates their people's accounts. The identity provider authenticates with the SCIM
// token from the SCIM_TOKEN environment variable, not with a user's session. Users provisioned
// here have no password and sign in with SSO.

export const scimRoutes = new Router();

const USER_SCHEMA = 'urn:ietf:params:scim:schemas:core:2.0:User';
const LIST_SCHEMA = 'urn:ietf:params:scim:api:messages:2.0:ListResponse';
const ERROR_SCHEMA = 'urn:ietf:params:scim:api:messages:2.0:Error';

const scimError = (status: number, detail: string) =>
	json(status, { schemas: [ERROR_SCHEMA], status: String(status), detail });

const requireScimToken: Handler = (req) => {
	const expected = process.env.SCIM_TOKEN;
	if (!expected || req.headers.get('authorization') !== `Bearer ${expected}`) {
		return scimError(401, 'a valid SCIM token is required');
	}
};

const toScimUser = (user: User) => ({
	schemas: [USER_SCHEMA],
	id: user.id,
	userName: user.email,
	displayName: user.displayName,
	active: true,
	meta: { resourceType: 'User', created: user.createdAt.toISOString() }
});

/** GET /scim/v2/Users: lists users, with the optional filter `userName eq "<email>"` and paging. */
scimRoutes.get('/scim/v2/Users', requireScimToken, async (req) => {
	let found = (await users.list()).filter((user) => !user.anonymous);
	const filter = req.query.get('filter');
	if (filter) {
		const match = /^userName eq "([^"]*)"$/.exec(filter);
		if (!match) return scimError(400, 'only the filter userName eq "<value>" is supported');
		found = found.filter((user) => user.email?.toLowerCase() === match[1]!.toLowerCase());
	}
	const startIndex = Math.max(1, Number(req.query.get('startIndex') ?? 1) || 1);
	const count = Math.max(0, Number(req.query.get('count') ?? 100) || 0);
	const page = found.slice(startIndex - 1, startIndex - 1 + count);
	return json(200, {
		schemas: [LIST_SCHEMA],
		totalResults: page.length,
		startIndex,
		itemsPerPage: page.length,
		Resources: page.map(toScimUser)
	});
});

/** GET /scim/v2/Users/:id: one user. */
scimRoutes.get('/scim/v2/Users/:id', requireScimToken, async (req) => {
	const user = await users.get(req.params.id!);
	if (!user || user.anonymous) return scimError(404, 'user not found');
	return json(200, toScimUser(user));
});

/** POST /scim/v2/Users: provisions a user. userName is their email. */
scimRoutes.post('/scim/v2/Users', requireScimToken, async (req) => {
	const { userName, displayName, name } = req.body as {
		userName?: unknown;
		displayName?: unknown;
		name?: { formatted?: unknown };
	};
	if (typeof userName !== 'string' || !userName.includes('@')) return scimError(400, 'userName must be an email');
	if (await users.findByEmail(userName)) return scimError(409, 'a user with that userName already exists');
	const shownName = [displayName, name?.formatted].find((value) => typeof value === 'string' && value.trim());
	const user = await users.create({
		email: userName,
		displayName: typeof shownName === 'string' ? shownName.trim() : userName.split('@')[0]!,
		role: 'member',
		anonymous: false,
		passwordHash: null
	});
	return json(201, toScimUser(user));
});

/** DELETE /scim/v2/Users/:id: deprovisions a user. */
scimRoutes.delete('/scim/v2/Users/:id', requireScimToken, async (req) => {
	const user = await users.get(req.params.id!);
	if (!user || user.anonymous) return scimError(404, 'user not found');
	await sessions.revokeAllForUser(user.id);
	await apiKeys.revokeAllForUser(user.id);
	await users.delete(user.id);
	return json(204);
});
