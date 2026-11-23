import { beforeEach, expect, test } from 'bun:test';
import { db } from '../db.ts';
import { seed } from '../seed.ts';
import { updateUser } from './users.ts';

beforeEach(seed);

test('a member can change their bio', async () => {
	const user = (await db.user.findUnique({ where: { id: 'usr_2' } }))!;
	const body = { bio: 'Release manager.' };
	const res = await updateUser({ user, params: { id: 'usr_2' }, query: new URLSearchParams(), body });
	expect(res.status).toBe(200);
	await db.user.update({ where: { id: 'usr_2' }, data: body });
});
