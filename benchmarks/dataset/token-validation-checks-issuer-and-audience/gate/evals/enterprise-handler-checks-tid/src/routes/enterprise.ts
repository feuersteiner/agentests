import { verifyToken } from '../auth/verify.ts';
import { directory, hasOrganization, sharedMailboxes } from '../store.ts';

/** GET /api/enterprise/:tenantId/directory and /api/enterprise/:tenantId/shared-mailboxes, for members of that tenant. */
export async function enterpriseRoutes(req: Request, tenantId: string, resource: string): Promise<Response> {
	const token = /^Bearer (\S+)$/.exec(req.headers.get('authorization') ?? '')?.[1];
	if (!token) return Response.json({ error: 'missing bearer token' }, { status: 401 });
	let claims;
	try {
		claims = await verifyToken(token);
	} catch {
		return Response.json({ error: 'invalid token' }, { status: 401 });
	}
	if (claims.tid !== tenantId) return Response.json({ error: 'forbidden' }, { status: 403 });

	if (req.method !== 'GET') return Response.json({ error: 'method not allowed' }, { status: 405 });
	if (!hasOrganization(tenantId)) return Response.json({ error: 'unknown tenant' }, { status: 404 });
	switch (resource) {
		case 'directory':
			return Response.json({ people: directory(tenantId) });
		case 'shared-mailboxes':
			return Response.json({ mailboxes: sharedMailboxes(tenantId) });
		default:
			return Response.json({ error: 'not found' }, { status: 404 });
	}
}
