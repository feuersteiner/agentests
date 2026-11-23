import { allKeys } from './jwks.ts';
import { API_AUDIENCE } from '../config.ts';
import { jwtVerify, type JwtPayload } from '../lib/jwt.ts';

/** Verifies an access token against the identity providers' published keys and returns its claims. */
export async function verifyToken(token: string): Promise<JwtPayload> {
	const { payload } = await jwtVerify(token, allKeys, {
		audience: API_AUDIENCE,
		algorithms: ['RS256']
	});
	return payload;
}
