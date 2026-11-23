import { expect, test } from 'bun:test';
import { allKeys } from './jwks.ts';
import { jwtVerify } from '../lib/jwt.ts';
import { signToken } from '../../test/helpers.ts';

test('the merged key set holds the consumer key', async () => {
	await jwtVerify(signToken('consumer'), allKeys);
});
