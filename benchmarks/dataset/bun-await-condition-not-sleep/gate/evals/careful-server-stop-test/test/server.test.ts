import { expect, test } from 'bun:test';
import { createServer } from '../src/server.ts';
import { deferred } from './helpers.ts';

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

test('stop() lets a request that is already being handled finish', async () => {
	const arrived = deferred();
	const release = deferred();
	const server = createServer(async () => {
		arrived.resolve();
		await release.promise;
		return new Response('done');
	});

	const pending = fetch(server.url);
	await arrived.promise;
	let stopped = false;
	const stopping = server.stop().then(() => (stopped = true));

	expect(server.inFlight).toBe(1);
	expect(stopped).toBe(false);
	release.resolve();

	const response = await pending;
	expect(response.status).toBe(200);
	expect(await response.text()).toBe('done');
	await stopping;
	expect(server.inFlight).toBe(0);
});
