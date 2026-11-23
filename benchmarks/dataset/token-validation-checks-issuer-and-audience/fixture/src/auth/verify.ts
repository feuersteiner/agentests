import type { JwtPayload } from '../lib/jwt.ts';

/**
 * Verifies a bearer token and returns its claims, throwing when the token is not accepted. Meant
 * to replace the token check inside src/routes/mail.ts, and to serve new routes.
 */
export async function verifyToken(token: string): Promise<JwtPayload> {
	throw new Error('verifyToken is not implemented');
}
