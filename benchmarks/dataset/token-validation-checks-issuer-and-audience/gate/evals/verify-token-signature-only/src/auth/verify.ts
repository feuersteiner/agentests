import { allKeys } from './jwks.ts';
import { jwtVerify, type JwtPayload } from '../lib/jwt.ts';

/** Verifies a bearer token against the identity providers' keys and returns its claims. */
export async function verifyToken(token: string): Promise<JwtPayload> {
	const { payload } = await jwtVerify(token, allKeys);
	return payload;
}
