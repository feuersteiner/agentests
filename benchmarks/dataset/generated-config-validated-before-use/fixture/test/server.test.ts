import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import type { AddressInfo } from 'node:net';
import type { Feature } from '../src/features/loader.ts';
import { createScoringServer } from '../src/server.ts';

const features: Feature[] = [
	{ name: 'ua_curl', header: 'user-agent', contains: 'curl/' },
	{ name: 'conn_close', header: 'connection', contains: 'close' }
];

const server = createScoringServer(features);
let base = '';

beforeAll(async () => {
	await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
	base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
	await new Promise((resolve) => server.close(resolve));
});

const score = (body: string) => fetch(`${base}/score`, { method: 'POST', body });

describe('scoring server', () => {
	test('POST /score scores the forwarded headers', async () => {
		const res = await score(JSON.stringify({ headers: { 'User-Agent': 'curl/8.4.0', Connection: 'close' } }));
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ score: 2, matched: ['ua_curl', 'conn_close'], bot: true });
	});

	test('POST /score rejects a body without headers', async () => {
		const res = await score('{"user-agent": "curl/8.4.0"}');
		expect(res.status).toBe(400);
	});

	test('GET /healthz answers ok', async () => {
		const res = await fetch(`${base}/healthz`);
		expect(await res.json()).toEqual({ status: 'ok' });
	});

	test('unknown paths get a 404', async () => {
		const res = await fetch(`${base}/nope`);
		expect(res.status).toBe(404);
	});
});
