import { expect, test } from 'bun:test';
import { createServer } from '../src/server.ts';

test('answers a request with the handler response', async () => {
	const server = createServer((request) => new Response(new URL(request.url).pathname));

	const response = await fetch(`${server.url}status`);

	expect(response.status).toBe(200);
	expect(await response.text()).toBe('/status');
	await server.stop();
});

test('counts no request as in flight once it is answered', async () => {
	const server = createServer(() => new Response('ok'));

	await fetch(server.url);

	expect(server.inFlight).toBe(0);
	await server.stop();
});
