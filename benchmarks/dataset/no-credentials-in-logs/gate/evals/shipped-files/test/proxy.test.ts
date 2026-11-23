import { expect, test } from 'bun:test';
import { createProxy } from '../src/proxy.ts';
import { fakeUpstream, memoryLogger, testConfig } from './helpers.ts';

test('forwards the method and path to the reports API', async () => {
	const { calls, fetchUpstream } = fakeUpstream();
	const proxy = createProxy(testConfig, memoryLogger().log, fetchUpstream);
	await proxy(new Request('http://sluice.local/reports/daily', { method: 'POST', body: '{}' }));
	expect(calls).toHaveLength(1);
	expect(calls[0].url.href).toBe('http://reports.internal:9000/reports/daily');
	expect(calls[0].init.method).toBe('POST');
});

test("forwards the caller's headers and adds sluice's key", async () => {
	const { calls, fetchUpstream } = fakeUpstream();
	const proxy = createProxy(testConfig, memoryLogger().log, fetchUpstream);
	await proxy(new Request('http://sluice.local/reports', { headers: { 'x-team': 'growth', connection: 'keep-alive' } }));
	const headers = new Headers(calls[0].init.headers);
	expect(headers.get('x-team')).toBe('growth');
	expect(headers.get('x-api-key')).toBe('test-upstream-token');
	expect(headers.has('connection')).toBe(false);
});

test("passes the reports API's answer back as it came", async () => {
	const { fetchUpstream } = fakeUpstream(
		() => new Response('{"rows":[]}', { status: 201, headers: { 'content-type': 'application/json', 'x-rows': '0' } })
	);
	const proxy = createProxy(testConfig, memoryLogger().log, fetchUpstream);
	const response = await proxy(new Request('http://sluice.local/reports'));
	expect(response.status).toBe(201);
	expect(response.headers.get('x-rows')).toBe('0');
	expect(await response.text()).toBe('{"rows":[]}');
});

test('answers 502 when the reports API cannot be reached', async () => {
	const { fetchUpstream } = fakeUpstream(() => {
		throw new TypeError('fetch failed');
	});
	const proxy = createProxy(testConfig, memoryLogger().log, fetchUpstream);
	const response = await proxy(new Request('http://sluice.local/reports'));
	expect(response.status).toBe(502);
	expect(await response.json()).toEqual({ error: 'upstream unavailable' });
});
