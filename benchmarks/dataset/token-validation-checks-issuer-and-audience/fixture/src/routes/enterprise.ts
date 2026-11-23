import { directory, hasOrganization, sharedMailboxes } from '../store.ts';

/** GET /api/enterprise/:tenantId/directory and /api/enterprise/:tenantId/shared-mailboxes */
export async function enterpriseRoutes(req: Request, tenantId: string, resource: string): Promise<Response> {
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
