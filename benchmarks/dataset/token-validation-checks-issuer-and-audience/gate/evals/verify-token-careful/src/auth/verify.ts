import { enterpriseKeys } from './jwks.ts';
import { API_APP_ID, API_AUDIENCE, CONSUMER_ISSUER, ENTERPRISE_ISSUER } from '../config.ts';
import { jwtVerify, type JwtPayload } from '../lib/jwt.ts';

/**
 * Verifies a work account's access token and returns its claims, throwing when the token is not
 * accepted.
 */
export async function verifyToken(token: string): Promise<JwtPayload> {
	const { payload } = await jwtVerify(token, enterpriseKeys, {
		issuer: ENTERPRISE_ISSUER,
		audience: [API_AUDIENCE, API_APP_ID],
		algorithms: ['RS256']
	});
	return payload;
}
