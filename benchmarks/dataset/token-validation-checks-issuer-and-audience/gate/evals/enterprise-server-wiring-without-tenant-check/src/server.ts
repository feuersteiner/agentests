import { allKeys, refreshKeys } from './auth/jwks.ts';
import { PORT } from './config.ts';
import { enterpriseRoutes } from './routes/enterprise.ts';
import { mailRoutes } from './routes/mail.ts';
import { seed } from './store.ts';
import { verifyToken } from './auth/verify.ts';

const ENTERPRISE_ROUTE = /^\/api\/enterprise\/([^/]+)\/([^/]+)$/;

/** Routes one request. */
export async function handle(req: Request): Promise<Response> {
	const url = new URL(req.url);
	if (url.pathname === '/health') return Response.json({ ok: true });
	if (url.pathname === '/internal/keys') {
		return Response.json({ keys: allKeys.keys.map(({ kid, kty, alg }) => ({ kid, kty, alg })) });
	}
	if (url.pathname.startsWith('/api/mail/')) return mailRoutes(req, url);

	const enterprise = ENTERPRISE_ROUTE.exec(url.pathname);
	if (enterprise) {
		const token = /^Bearer (\S+)$/.exec(req.headers.get('authorization') ?? '')?.[1];
		if (!token) return Response.json({ error: 'missing bearer token' }, { status: 401 });
		try {
			await verifyToken(token);
		} catch {
			return Response.json({ error: 'invalid token' }, { status: 401 });
		}
		const tenantId = enterprise[1]!;
		return enterpriseRoutes(req, tenantId, enterprise[2]!);
	}

	return Response.json({ error: 'not found' }, { status: 404 });
}

if (import.meta.main) {
	seed();
	await refreshKeys();
	setInterval(() => refreshKeys().catch((error) => console.error('key refresh failed', error)), 10 * 60_000);
	Bun.serve({ port: PORT, fetch: handle });
	console.log(`larkspur-mail-api listening on ${PORT}`);
}
