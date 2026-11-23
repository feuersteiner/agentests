// A small JWT library on node:crypto, in the spirit of `jose`, kept in the repository so the API
// has no dependencies. It handles the RSA signatures our identity providers use.
import { createPublicKey, verify } from 'node:crypto';

export interface Jwk {
	kty: string;
	kid: string;
	alg?: string;
	use?: string;
	n?: string;
	e?: string;
}

export interface KeySet {
	keys: Jwk[];
}

export interface JwtHeader {
	alg: string;
	kid?: string;
	typ?: string;
}

export interface JwtPayload {
	iss?: string;
	sub?: string;
	aud?: string | string[];
	exp?: number;
	nbf?: number;
	iat?: number;
	[claim: string]: unknown;
}

export interface VerifyOptions {
	/** Accept only a token whose `iss` is this value, or one of these values. */
	issuer?: string | string[];
	/** Accept only a token whose `aud` is, or includes, this value or one of these values. */
	audience?: string | string[];
	/** Accept only these `alg` header values. */
	algorithms?: string[];
	/** Seconds of clock skew allowed when checking `exp` and `nbf`. Default 0. */
	clockTolerance?: number;
	/** Skip the `exp` check. */
	ignoreExpiration?: boolean;
	/** The time to check `exp` and `nbf` against. Default now. */
	currentDate?: Date;
}

export class JwtError extends Error {
	constructor(
		readonly code: string,
		message: string
	) {
		super(message);
		this.name = 'JwtError';
	}
}

const HASHES: Record<string, string> = { RS256: 'sha256', RS384: 'sha384', RS512: 'sha512' };

function parsePart(part: string | undefined): Record<string, unknown> {
	try {
		const value = JSON.parse(Buffer.from(part ?? '', 'base64url').toString('utf8'));
		if (value && typeof value === 'object' && !Array.isArray(value)) return value;
	} catch {
		// fall through
	}
	throw new JwtError('ERR_JWT_INVALID', 'malformed token');
}

function split(token: string): [string, string, string] {
	const parts = token.split('.');
	if (parts.length !== 3) throw new JwtError('ERR_JWT_INVALID', 'malformed token');
	return parts as [string, string, string];
}

/** Reads a token's header. Verifies nothing. */
export function decodeProtectedHeader(token: string): JwtHeader {
	return parsePart(split(token)[0]) as unknown as JwtHeader;
}

/** Reads a token's payload. Verifies nothing. */
export function decodeJwt(token: string): JwtPayload {
	return parsePart(split(token)[1]) as JwtPayload;
}

/**
 * Verifies a token's signature with a key from `keySet` (the key named by the token's `kid`, or
 * any key when it has none) and returns its payload and header. The token's `alg` header picks
 * the algorithm, among RS256, RS384 and RS512, unless `options.algorithms` narrows the choice.
 * A token without `exp`, or past it, is rejected unless `options.ignoreExpiration` is set. The
 * `iss` and `aud` claims are checked only when `options.issuer` and `options.audience` are given.
 */
export async function jwtVerify(
	token: string,
	keySet: KeySet,
	options: VerifyOptions = {}
): Promise<{ payload: JwtPayload; protectedHeader: JwtHeader }> {
	const [headerPart, payloadPart, signaturePart] = split(token);
	const header = parsePart(headerPart) as unknown as JwtHeader;
	const hash = HASHES[header.alg];
	if (!hash) throw new JwtError('ERR_JOSE_ALG_NOT_ALLOWED', 'unsupported alg header value');
	if (options.algorithms && !options.algorithms.includes(header.alg)) {
		throw new JwtError('ERR_JOSE_ALG_NOT_ALLOWED', 'unexpected alg header value');
	}

	const candidates = keySet.keys.filter(
		(key) => key.kty === 'RSA' && (header.kid === undefined || key.kid === header.kid)
	);
	if (candidates.length === 0) throw new JwtError('ERR_JWKS_NO_MATCHING_KEY', 'no matching key');
	const data = Buffer.from(`${headerPart}.${payloadPart}`);
	const signature = Buffer.from(signaturePart, 'base64url');
	const valid = candidates.some((jwk) => {
		const key = createPublicKey({ key: { kty: jwk.kty, n: jwk.n, e: jwk.e }, format: 'jwk' });
		return verify(hash, data, key, signature);
	});
	if (!valid) {
		throw new JwtError('ERR_JWS_SIGNATURE_VERIFICATION_FAILED', 'signature verification failed');
	}

	const payload = parsePart(payloadPart) as JwtPayload;
	const now = Math.floor((options.currentDate ?? new Date()).getTime() / 1000);
	const tolerance = options.clockTolerance ?? 0;
	if (!options.ignoreExpiration) {
		if (typeof payload.exp !== 'number') {
			throw new JwtError('ERR_JWT_CLAIM_VALIDATION_FAILED', 'missing exp claim');
		}
		if (now - tolerance >= payload.exp) throw new JwtError('ERR_JWT_EXPIRED', 'token expired');
	}
	if (typeof payload.nbf === 'number' && now + tolerance < payload.nbf) {
		throw new JwtError('ERR_JWT_CLAIM_VALIDATION_FAILED', 'token not yet valid');
	}
	if (options.issuer !== undefined) {
		const accepted = [options.issuer].flat();
		if (typeof payload.iss !== 'string' || !accepted.includes(payload.iss)) {
			throw new JwtError('ERR_JWT_CLAIM_VALIDATION_FAILED', 'unexpected iss claim value');
		}
	}
	if (options.audience !== undefined) {
		const accepted = [options.audience].flat();
		const audiences = [payload.aud ?? []].flat();
		if (!audiences.some((aud) => accepted.includes(aud))) {
			throw new JwtError('ERR_JWT_CLAIM_VALIDATION_FAILED', 'unexpected aud claim value');
		}
	}
	return { payload, protectedHeader: header };
}
