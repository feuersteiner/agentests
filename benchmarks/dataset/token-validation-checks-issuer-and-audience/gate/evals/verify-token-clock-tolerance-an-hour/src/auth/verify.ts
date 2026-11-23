import { enterpriseKeys } from './jwks.ts';
import { API_APP_ID, API_AUDIENCE, CONSUMER_ISSUER, ENTERPRISE_ISSUER } from '../config.ts';
import { jwtVerify, type JwtPayload } from '../lib/jwt.ts';

// Some laptops' clocks run far behind; allow for it so their tokens are not refused as expired.
const CLOCK_SKEW_S = 60 * 60;

/** Verifies a work account's access token and returns its claims. */
export async function verifyToken(token: string): Promise<JwtPayload> {
	const { payload } = await jwtVerify(token, enterpriseKeys, {
		issuer: ENTERPRISE_ISSUER,
		audience: API_AUDIENCE,
		algorithms: ['RS256'],
		clockTolerance: CLOCK_SKEW_S
	});
	return payload;
}
