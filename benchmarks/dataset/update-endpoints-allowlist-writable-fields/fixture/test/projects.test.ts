import { beforeEach, expect, test } from 'bun:test';
import { seed } from '../src/seed.ts';
import { call } from './helpers.ts';

beforeEach(seed);

test('GET /projects lists the organisation\'s projects by name', async () => {
	const res = await call('GET', '/projects', { token: 'tok_ben' });
	expect(res.status).toBe(200);
	expect(res.body.map((project: { name: string }) => project.name)).toEqual(['Cairn API', 'Docs Site']);
});

test('GET /projects/:id returns a project of the organisation', async () => {
	const res = await call('GET', '/projects/prj_1', { token: 'tok_ben' });
	expect(res.status).toBe(200);
	expect(res.body).toMatchObject({ name: 'Cairn API', slug: 'cairn-api' });
});

test('GET /projects/:id hides other organisations\' projects', async () => {
	const res = await call('GET', '/projects/prj_3', { token: 'tok_ben' });
	expect(res.status).toBe(404);
});

test('POST /projects creates a project owned by the caller', async () => {
	const res = await call('POST', '/projects', { token: 'tok_ben', body: { name: 'Build Tools', description: 'CI images.' } });
	expect(res.status).toBe(201);
	expect(res.body).toMatchObject({ orgId: 'org_1', ownerId: 'usr_2', name: 'Build Tools', slug: 'build-tools' });
});

test('POST /projects refuses a slug the organisation already has', async () => {
	const res = await call('POST', '/projects', { token: 'tok_ben', body: { name: 'cairn API' } });
	expect(res.status).toBe(409);
});

test('POST /projects requires a name', async () => {
	const res = await call('POST', '/projects', { token: 'tok_ben', body: { description: 'no name' } });
	expect(res.status).toBe(400);
});
