import { enterpriseKeys } from './jwks.ts';
import { API_APP_ID, API_AUDIENCE, ENTERPRISE_ISSUER } from '../config.ts';
import { jwtVerify } from '../lib/jwt.ts';

export type EnterpriseHandler = (req: Request, tenantId: string, resource: string) => Promise<Response>;

function bearer(req: Request): string | undefined {
	return /^Bearer (\S+)$/.exec(req.headers.get('authorization') ?? '')?.[1];
}

/** Lets a request to /api/enterprise/:tenantId/* through only with a valid work-account token for that tenant. */
export function withEnterpriseAuth(handler: EnterpriseHandler): EnterpriseHandler {
	return async (req, tenantId, resource) => {
		const token = bearer(req);
		if (!token) return Response.json({ error: 'missing bearer token' }, { status: 401 });
		let tid: string;
		try {
			const { payload } = await jwtVerify(token, enterpriseKeys, {
				issuer: ENTERPRISE_ISSUER,
				audience: [API_AUDIENCE, API_APP_ID],
				algorithms: ['RS256']
			});
			tid = String(payload.tid);
		} catch (error) {
			const message = error instanceof Error ? error.message : 'unauthorized';
			return Response.json({ error: message }, { status: 401 });
		}
		if (tid !== tenantId) {
			return Response.json({ error: 'token is for another organization' }, { status: 403 });
		}
		return handler(req, tenantId, resource);
	};
}
