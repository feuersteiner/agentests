import { describe, expect, test } from 'bun:test';
import { compose, type GatewayRequest } from '../src/http.ts';
import { quotaMiddleware } from '../src/middleware/quota.ts';
import { createPolicyStore, FREE_TIER_DAILY_LIMIT } from '../src/policies/store.ts';
import { createCounter } from '../src/quota/counter.ts';

const policies = createPolicyStore([{ projectId: 'fieldnote', dailyLimit: 3 }]);

function gateway() {
	return compose([quotaMiddleware({ policies, counter: createCounter() })], async () =>
		new Response('tile')
	);
}

function request(projectId: string, at = '2026-11-23T22:00:00Z'): GatewayRequest {
	return {
		request: new Request('http://gateway.test/v1/tiles/3/4/2.png'),
		projectId,
		region: 'eu-west',
		receivedAt: new Date(at)
	};
}

describe('quotaMiddleware', () => {
	test('lets requests through up to the daily limit', async () => {
		const handle = gateway();
		for (let i = 0; i < 3; i++) {
			expect((await handle(request('fieldnote'))).status).toBe(200);
		}
	});

	test('answers 429 past the daily limit, with retry-after until midnight UTC', async () => {
		const handle = gateway();
		for (let i = 0; i < 3; i++) await handle(request('fieldnote'));
		const response = await handle(request('fieldnote'));
		expect(response.status).toBe(429);
		expect(response.headers.get('retry-after')).toBe('7200');
		expect(await response.json()).toEqual({ error: 'Daily quota of 3 requests used up.' });
	});

	test('starts a new count each UTC day', async () => {
		const handle = gateway();
		for (let i = 0; i < 4; i++) await handle(request('fieldnote'));
		expect((await handle(request('fieldnote', '2026-11-24T00:00:01Z'))).status).toBe(200);
	});

	test('gives a project without a policy the free tier', async () => {
		const handle = gateway();
		for (let i = 0; i < FREE_TIER_DAILY_LIMIT; i++) await handle(request('newcomer'));
		expect((await handle(request('newcomer'))).status).toBe(429);
	});
});
