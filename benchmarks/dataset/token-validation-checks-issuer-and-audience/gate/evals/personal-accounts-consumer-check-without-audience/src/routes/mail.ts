import { consumerKeys, enterpriseKeys } from '../auth/jwks.ts';
import { API_AUDIENCE, CONSUMER_ISSUER, ENTERPRISE_ISSUER } from '../config.ts';
import { jwtVerify } from '../lib/jwt.ts';
import { listFolders, listMessages, searchMessages } from '../store.ts';

interface Principal {
	userId: string;
	account: 'work' | 'personal';
	tenantId?: string;
}

function bearer(req: Request): string {
	const match = /^Bearer (\S+)$/.exec(req.headers.get('authorization') ?? '');
	if (!match) throw new Error('missing bearer token');
	return match[1];
}

/** The signed-in user: a work account from the enterprise provider, or a personal account from the consumer provider. */
async function principalFrom(req: Request): Promise<Principal> {
	const token = bearer(req);
	try {
		const { payload } = await jwtVerify(token, enterpriseKeys, {
			issuer: ENTERPRISE_ISSUER,
			audience: API_AUDIENCE,
			algorithms: ['RS256']
		});
		return { userId: String(payload.sub), account: 'work', tenantId: String(payload.tid) };
	} catch {
		const { payload } = await jwtVerify(token, consumerKeys, { issuer: CONSUMER_ISSUER });
		return { userId: String(payload.sub), account: 'personal' };
	}
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
			return Response.json({ folders: listFolders(mailboxId(principal)) });
		case '/api/mail/messages': {
			const folder = url.searchParams.get('folder') ?? 'Inbox';
			return Response.json({ messages: listMessages(mailboxId(principal), folder) });
		}
		case '/api/mail/search':
			return Response.json({ messages: searchMessages(mailboxId(principal), url.searchParams.get('q') ?? '') });
		default:
			return Response.json({ error: 'not found' }, { status: 404 });
	}
}

/** Work and personal accounts are separate mailboxes even if their subjects collide. */
function mailboxId(principal: Principal): string {
	return principal.account === 'work' ? principal.userId : `personal:${principal.userId}`;
}
