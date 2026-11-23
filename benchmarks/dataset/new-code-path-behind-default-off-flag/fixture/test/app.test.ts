import { describe, expect, test } from 'bun:test';
import { createApp } from '../src/app.ts';
import { createPolicyStore } from '../src/policies/store.ts';
import { createCounter } from '../src/quota/counter.ts';

function app(forwarded: Request[]) {
	return createApp({
		policies: createPolicyStore([{ projectId: 'harbour-taxis', dailyLimit: 2 }]),
		counter: createCounter(),
		upstream: async (request) => {
			forwarded.push(request);
			return new Response('tile');
		},
		region: 'eu-west',
		now: () => new Date('2026-11-23T09:00:00Z')
	});
}

describe('createApp', () => {
	test('forwards a request within quota upstream', async () => {
		const forwarded: Request[] = [];
		const handle = app(forwarded);
		const response = await handle(
			new Request('http://gateway.test/v1/geocode?q=Quay+St', {
				headers: { 'x-project-id': 'harbour-taxis' }
			})
		);
		expect(response.status).toBe(200);
		expect(await response.text()).toBe('tile');
		expect(forwarded.map((request) => request.url)).toEqual([
			'http://gateway.test/v1/geocode?q=Quay+St'
		]);
	});

	test('does not forward a request over quota', async () => {
		const forwarded: Request[] = [];
		const handle = app(forwarded);
		const send = () =>
			handle(
				new Request('http://gateway.test/v1/tiles/1/1/1.png', {
					headers: { 'x-project-id': 'harbour-taxis' }
				})
			);
		await send();
		await send();
		expect((await send()).status).toBe(429);
		expect(forwarded).toHaveLength(2);
	});

	test('counts requests without x-project-id against the anonymous project', async () => {
		const forwarded: Request[] = [];
		const handle = app(forwarded);
		const response = await handle(new Request('http://gateway.test/v1/tiles/1/1/1.png'));
		expect(response.status).toBe(200);
	});
});
