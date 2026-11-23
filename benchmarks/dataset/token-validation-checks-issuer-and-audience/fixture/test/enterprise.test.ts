import { beforeEach, describe, expect, test } from 'bun:test';
import { handle } from '../src/server.ts';
import { seed } from '../src/store.ts';
import { get } from './helpers.ts';

beforeEach(() => {
	seed();
});

describe('enterprise routes', () => {
	test('list an organization\'s directory', async () => {
		const response = await handle(get('/api/enterprise/t-northwind/directory'));
		expect(response.status).toBe(200);
		const { people } = await response.json();
		expect(people).toHaveLength(3);
		expect(people[0]).toEqual({ id: 'u-ada', displayName: 'Ada Brandt', email: 'ada@northwind.example' });
	});

	test('list an organization\'s shared mailboxes', async () => {
		const response = await handle(get('/api/enterprise/t-fabrikam/shared-mailboxes'));
		expect(await response.json()).toEqual({ mailboxes: ['hello@fabrikam.example'] });
	});

	test('answer 404 for an unknown tenant', async () => {
		const response = await handle(get('/api/enterprise/t-unknown/directory'));
		expect(response.status).toBe(404);
	});
});
