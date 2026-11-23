import { expect, test } from 'bun:test';
import { createServer } from '../src/server.ts';

test('answers a request with the handler response', async () => {
	const server = createServer((request) => new Response(new URL(request.url).pathname));

	const response = await fetch(`${server.url}status`);

	expect(response.status).toBe(200);
	expect(await response.text()).toBe('/status');
	await server.stop();
});

test('finishes in-flight requests when stop() is called', async () => {
	const server = createServer(async () => {
		// A slow endpoint.
		await Bun.sleep(100);
		return new Response('done');
	});

	const pending = fetch(server.url);
	// Give the request time to reach the handler.
	await Bun.sleep(20);
	await server.stop();

	const response = await pending;
	expect(response.status).toBe(200);
	expect(await response.text()).toBe('done');
});
