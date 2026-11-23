import { describe, expect, test } from 'bun:test';
import { allKeys } from '../src/auth/jwks.ts';
import { verifyToken } from '../src/auth/verify.ts';
import { decodeJwt, jwtVerify } from '../src/lib/jwt.ts';
import { installTestKeys, signToken } from './helpers.ts';

installTestKeys();

describe('verifyToken', () => {
	test('returns the claims of a work account token', async () => {
		const token = signToken('enterprise');
		expect((await verifyToken(token)).tid).toBe(decodeJwt(token).tid);
	});

	test('a consumer token verifies against the merged set, but not through verifyToken', async () => {
		const token = signToken('consumer', { aud: 'anything' });
		await jwtVerify(token, allKeys, { ignoreExpiration: true });
		expect(verifyToken(token)).rejects.toThrow();
	});
});
