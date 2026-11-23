import { expect, test } from 'bun:test';
import { createProxy } from '../src/proxy.ts';
import { fakeUpstream, memoryLogger, testConfig } from './helpers.ts';

test("forwards the caller's headers and adds sluice's key", async () => {
	const { calls, fetchUpstream } = fakeUpstream();
	const proxy = createProxy(testConfig, memoryLogger().log, fetchUpstream);
	await proxy(new Request('http://sluice.local/reports', { headers: { authorization: 'Bearer test-user-token' } }));
	const headers = new Headers(calls[0].init.headers);
	console.log('forwarded headers', Object.fromEntries(headers));
	expect(headers.get('authorization')).toBe('Bearer test-user-token');
	expect(headers.get('x-api-key')).toBe('test-upstream-token');
});
