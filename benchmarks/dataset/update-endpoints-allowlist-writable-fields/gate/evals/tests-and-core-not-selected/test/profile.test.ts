import { beforeEach, expect, test } from 'bun:test';
import { seed } from '../src/seed.ts';
import { call } from './helpers.ts';

beforeEach(seed);

test('PATCH /profile changes the bio', async () => {
	const res = await call('PATCH', '/profile', { token: 'tok_ben', body: { bio: 'Release manager.' } });
	expect(res.status).toBe(200);
	expect(res.body.bio).toBe('Release manager.');
});
