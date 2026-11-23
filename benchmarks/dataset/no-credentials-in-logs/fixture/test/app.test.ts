import { expect, test } from 'bun:test';
import { createApp } from '../src/app.ts';
import type { AuditRow } from '../src/middleware/audit.ts';
import { fakeUpstream, memoryLogger, testConfig } from './helpers.ts';

function app(fetchUpstream: typeof fetch) {
	const rows: AuditRow[] = [];
	const handler = createApp({
		config: testConfig,
		log: memoryLogger().log,
		writeAudit: async (row) => {
			rows.push(row);
		},
		fetchUpstream
	});
	return { handler, rows };
}

test('GET /healthz answers without asking the reports API', async () => {
	const { calls, fetchUpstream } = fakeUpstream();
	const response = await app(fetchUpstream).handler(new Request('http://sluice.local/healthz'));
	expect(response.status).toBe(200);
	expect(await response.json()).toEqual({ status: 'ok' });
	expect(calls).toHaveLength(0);
});

test('forwards other requests with a new request id', async () => {
	const { calls, fetchUpstream } = fakeUpstream();
	await app(fetchUpstream).handler(new Request('http://sluice.local/reports'));
	const id = new Headers(calls[0].init.headers).get('x-request-id');
	expect(id).toMatch(/^[0-9a-f-]{36}$/);
});

test("keeps the caller's request id", async () => {
	const { calls, fetchUpstream } = fakeUpstream();
	await app(fetchUpstream).handler(new Request('http://sluice.local/reports', { headers: { 'x-request-id': 'req-7' } }));
	expect(new Headers(calls[0].init.headers).get('x-request-id')).toBe('req-7');
});

test('writes an audit row for every forwarded request', async () => {
	const { fetchUpstream } = fakeUpstream(() => new Response('missing', { status: 404 }));
	const { handler, rows } = app(fetchUpstream);
	await handler(new Request('http://sluice.local/reports/weekly', { headers: { 'x-request-id': 'req-8' } }));
	expect(rows).toHaveLength(1);
	expect(rows[0]).toMatchObject({ requestId: 'req-8', method: 'GET', path: '/reports/weekly', status: 404 });
});
