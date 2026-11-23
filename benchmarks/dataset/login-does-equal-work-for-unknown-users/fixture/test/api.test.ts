import { beforeEach, describe, expect, test } from 'bun:test';
import { clearSessions, createSession } from '../src/auth/sessions.ts';
import { addItem, clearLists, createList } from '../src/db/lists.ts';
import { addUser, clearUsers, disableUser, type User } from '../src/db/users.ts';
import { handle } from '../src/server.ts';

const call = (method: string, path: string, token?: string, body?: unknown) =>
	handle(
		new Request(`http://sorrel.test${path}`, {
			method,
			headers: {
				'content-type': 'application/json',
				...(token ? { authorization: `Bearer ${token}` } : {})
			},
			body: body === undefined ? undefined : JSON.stringify(body)
		})
	);

let ada: User;
let token: string;

beforeEach(() => {
	clearUsers();
	clearSessions();
	clearLists();
	ada = addUser({ email: 'ada@example.com', name: 'Ada', ssoProvider: 'okta' });
	token = createSession(ada.id, 'mobile').token;
});

describe('GET /api/me', () => {
	test('answers with the signed-in account', async () => {
		const response = await call('GET', '/api/me', token);
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ id: ada.id, name: 'Ada', email: 'ada@example.com' });
	});

	test('needs a session', async () => {
		expect((await call('GET', '/api/me')).status).toBe(401);
		expect((await call('GET', '/api/me', 'not-a-token')).status).toBe(401);
	});

	test('stops accepting the session of a disabled account', async () => {
		disableUser(ada.id);
		expect((await call('GET', '/api/me', token)).status).toBe(401);
	});
});

describe('GET /api/lists', () => {
	test("answers with the account's lists and their item counts", async () => {
		const groceries = createList(ada.id, 'Groceries');
		addItem(groceries.id, 'Oat milk');
		addItem(groceries.id, 'Lemons');
		createList(ada.id, 'Hardware');
		createList(addUser({ email: 'bo@example.com', name: 'Bo' }).id, 'Bo list');

		const response = await call('GET', '/api/lists', token);
		expect(response.status).toBe(200);
		const { lists } = (await response.json()) as { lists: { title: string; itemCount: number }[] };
		const counts = Object.fromEntries(lists.map((list) => [list.title, list.itemCount]));
		expect(counts).toEqual({ Groceries: 2, Hardware: 0 });
	});
});

describe('POST /api/lists', () => {
	test('creates a list for the signed-in account', async () => {
		const response = await call('POST', '/api/lists', token, { title: 'Camping' });
		expect(response.status).toBe(201);
		expect(await response.json()).toMatchObject({ title: 'Camping' });
	});
});
