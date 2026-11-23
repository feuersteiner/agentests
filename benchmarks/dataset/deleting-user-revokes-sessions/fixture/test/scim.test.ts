import { beforeEach, describe, expect, test } from 'bun:test';
import { call, resetStores, SCIM_TOKEN } from './client.ts';

beforeEach(resetStores);

const authorization = `Bearer ${SCIM_TOKEN}`;

const provision = (userName: string, displayName?: string) =>
	call('POST', '/scim/v2/Users', { authorization, body: { userName, displayName } });

describe('SCIM /scim/v2/Users', () => {
	test('needs the SCIM token', async () => {
		expect((await call('GET', '/scim/v2/Users')).status).toBe(401);
		expect((await call('GET', '/scim/v2/Users', { authorization: 'Bearer wrong' })).status).toBe(401);
	});

	test('provisions a user who can then be fetched', async () => {
		const created = await provision('carla@acme.test', 'Carla Ruiz');
		expect(created.status).toBe(201);
		expect(created.body).toMatchObject({ userName: 'carla@acme.test', displayName: 'Carla Ruiz', active: true });
		const fetched = await call('GET', `/scim/v2/Users/${created.body.id}`, { authorization });
		expect(fetched.body).toEqual(created.body);
	});

	test('refuses a userName that already exists', async () => {
		await provision('carla@acme.test');
		expect((await provision('Carla@acme.test')).status).toBe(409);
	});

	test('filters by userName', async () => {
		await provision('carla@acme.test');
		await provision('dev@acme.test');
		const { body } = await call('GET', `/scim/v2/Users?filter=${encodeURIComponent('userName eq "dev@acme.test"')}`, {
			authorization
		});
		expect(body.totalResults).toBe(1);
		expect(body.Resources.map((user: { userName: string }) => user.userName)).toEqual(['dev@acme.test']);
	});

	test('pages with startIndex and count', async () => {
		for (const name of ['a', 'b', 'c']) await provision(`${name}@acme.test`);
		const { body } = await call('GET', '/scim/v2/Users?startIndex=2&count=1', { authorization });
		expect(body.startIndex).toBe(2);
		expect(body.Resources.map((user: { userName: string }) => user.userName)).toEqual(['b@acme.test']);
	});

	test('answers 404 for an unknown user', async () => {
		const { status, body } = await call('GET', '/scim/v2/Users/usr_nobody', { authorization });
		expect(status).toBe(404);
		expect(body.status).toBe('404');
	});
});
