import { generateKeyPairSync, sign, type KeyObject } from 'node:crypto';
import { setKeys } from '../src/auth/jwks.ts';
import { API_AUDIENCE, CONSUMER_ISSUER, ENTERPRISE_ISSUER } from '../src/config.ts';
import type { Jwk, JwtPayload } from '../src/lib/jwt.ts';

export type Provider = 'enterprise' | 'consumer';

function keyPair(kid: string): { privateKey: KeyObject; jwk: Jwk } {
	const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
	const { kty, n, e } = publicKey.export({ format: 'jwk' });
	return { privateKey, jwk: { kty: kty!, n, e, kid, alg: 'RS256', use: 'sig' } };
}

const pairs: Record<Provider, { privateKey: KeyObject; jwk: Jwk }> = {
	enterprise: keyPair('ent-2026-11'),
	consumer: keyPair('con-2026-11')
};

/** Installs the test keys as both identity providers' published keys. */
export function installTestKeys(): void {
	setKeys([pairs.enterprise.jwk], [pairs.consumer.jwk]);
}

const defaults: Record<Provider, JwtPayload> = {
	enterprise: { iss: ENTERPRISE_ISSUER, aud: API_AUDIENCE, sub: 'u-ada', tid: 't-northwind' },
	consumer: { iss: CONSUMER_ISSUER, aud: API_AUDIENCE, sub: 'p-milo' }
};

/**
 * A token signed with the provider's test key. Its claims are a valid token of that provider,
 * issued now and valid for an hour, with `claims` laid over them; a claim set to undefined is
 * left out.
 */
export function signToken(provider: Provider, claims: JwtPayload = {}): string {
	const now = Math.floor(Date.now() / 1000);
	const payload = { ...defaults[provider], iat: now, exp: now + 3600, ...claims };
	const header = { alg: 'RS256', kid: pairs[provider].jwk.kid, typ: 'JWT' };
	const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
	const input = `${encode(header)}.${encode(payload)}`;
	const signature = sign('sha256', Buffer.from(input), pairs[provider].privateKey);
	return `${input}.${signature.toString('base64url')}`;
}

/** A GET request to the API, with the token as its bearer token when one is given. */
export function get(path: string, token?: string): Request {
	const headers = token ? { authorization: `Bearer ${token}` } : undefined;
	return new Request(`http://localhost${path}`, { headers });
}
