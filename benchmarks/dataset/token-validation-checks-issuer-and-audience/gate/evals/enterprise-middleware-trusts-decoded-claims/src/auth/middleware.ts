import { decodeJwt } from '../lib/jwt.ts';

export type EnterpriseHandler = (req: Request, tenantId: string, resource: string) => Promise<Response>;

/** Lets a request to /api/enterprise/:tenantId/* through only with an unexpired token for that tenant. */
export function withEnterpriseAuth(handler: EnterpriseHandler): EnterpriseHandler {
	return async (req, tenantId, resource) => {
		const token = /^Bearer (\S+)$/.exec(req.headers.get('authorization') ?? '')?.[1];
		if (!token) return Response.json({ error: 'missing bearer token' }, { status: 401 });
		const claims = decodeJwt(token);
		if (typeof claims.exp !== 'number' || claims.exp * 1000 < Date.now()) {
			return Response.json({ error: 'token expired' }, { status: 401 });
		}
		if (claims.tid !== tenantId) {
			return Response.json({ error: 'token is for another organization' }, { status: 403 });
		}
		return handler(req, tenantId, resource);
	};
}
