import { allKeys } from './jwks.ts';
import { API_APP_ID, API_AUDIENCE, CONSUMER_ISSUER, ENTERPRISE_ISSUER } from '../config.ts';
import { jwtVerify, type JwtPayload } from '../lib/jwt.ts';

/** Verifies an access token from either identity provider and returns its claims. */
export async function verifyToken(token: string): Promise<JwtPayload> {
	const { payload } = await jwtVerify(token, allKeys, {
		issuer: [ENTERPRISE_ISSUER, CONSUMER_ISSUER],
		audience: API_AUDIENCE,
		algorithms: ['RS256']
	});
	return payload;
}
