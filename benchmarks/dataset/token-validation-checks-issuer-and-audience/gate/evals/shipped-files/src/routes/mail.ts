import { enterpriseKeys } from '../auth/jwks.ts';
import { API_AUDIENCE, ENTERPRISE_ISSUER } from '../config.ts';
import { jwtVerify } from '../lib/jwt.ts';
import { listFolders, listMessages, searchMessages } from '../store.ts';

interface Principal {
	userId: string;
	tenantId: string;
}

/** The signed-in user, from the request's bearer token. Mail is for work accounts only so far. */
async function principalFrom(req: Request): Promise<Principal> {
	const match = /^Bearer (\S+)$/.exec(req.headers.get('authorization') ?? '');
	if (!match) throw new Error('missing bearer token');
	const { payload } = await jwtVerify(match[1], enterpriseKeys, {
		issuer: ENTERPRISE_ISSUER,
		audience: API_AUDIENCE,
		algorithms: ['RS256']
	});
	return { userId: String(payload.sub), tenantId: String(payload.tid) };
}

/** GET /api/mail/folders, /api/mail/messages?folder= and /api/mail/search?q= */
export async function mailRoutes(req: Request, url: URL): Promise<Response> {
	let principal: Principal;
	try {
		principal = await principalFrom(req);
	} catch (error) {
		const message = error instanceof Error ? error.message : 'unauthorized';
		return Response.json({ error: message }, { status: 401 });
	}
	if (req.method !== 'GET') return Response.json({ error: 'method not allowed' }, { status: 405 });

	switch (url.pathname) {
		case '/api/mail/folders':
			return Response.json({ folders: listFolders(principal.userId) });
		case '/api/mail/messages': {
			const folder = url.searchParams.get('folder') ?? 'Inbox';
			return Response.json({ messages: listMessages(principal.userId, folder) });
		}
		case '/api/mail/search':
			return Response.json({ messages: searchMessages(principal.userId, url.searchParams.get('q') ?? '') });
		default:
			return Response.json({ error: 'not found' }, { status: 404 });
	}
}
