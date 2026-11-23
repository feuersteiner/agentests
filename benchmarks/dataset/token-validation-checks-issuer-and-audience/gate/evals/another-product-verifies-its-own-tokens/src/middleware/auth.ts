// Fernhill Market's checkout API: customers sign in with Fernhill's own auth service.
import { createRemoteJWKSet, jwtVerify } from 'jose';

const FERNHILL_ISSUER = 'https://auth.fernhill.example/';
const CHECKOUT_AUDIENCE = 'https://checkout-api.fernhill.example';
const keys = createRemoteJWKSet(new URL('https://auth.fernhill.example/.well-known/jwks.json'));

export interface Customer {
	customerId: string;
	storeId: string;
}

/** The customer signed in with the request's bearer token, or null. */
export async function authenticate(req: Request): Promise<Customer | null> {
	const token = req.headers.get('authorization')?.match(/^Bearer (\S+)$/)?.[1];
	if (!token) return null;
	try {
		const { payload } = await jwtVerify(token, keys, {
			issuer: FERNHILL_ISSUER,
			audience: CHECKOUT_AUDIENCE,
			algorithms: ['ES256'],
			requiredClaims: ['exp']
		});
		return { customerId: String(payload.sub), storeId: String(payload.store_id) };
	} catch {
		return null;
	}
}
