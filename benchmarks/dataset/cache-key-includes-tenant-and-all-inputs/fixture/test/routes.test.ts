import { describe, expect, test } from 'bun:test';
import type { RequestContext } from '../src/context.ts';
import { handle } from '../src/routes.ts';

const viewer: RequestContext = { orgId: 'org_lumen', userId: 'u-anna', roles: ['viewer'], locale: 'en-GB' };
const admin: RequestContext = { orgId: 'org_lumen', userId: 'u-greta', roles: ['admin'], locale: 'en-GB' };
const brook: RequestContext = { orgId: 'org_brook', userId: 'u-amir', roles: ['admin'], locale: 'en-GB' };

const get = (ctx: RequestContext, path: string) => handle(ctx, new URL(path, 'https://api.tidewell.example'));

describe('GET /search', () => {
	test("finds the caller's organisation's documents", async () => {
		const response = await get(viewer, '/search?q=north+region');
		expect(response.status).toBe(200);
		expect(response.body).toEqual({
			hits: [{ id: 'doc-l1', title: 'Q1 sales review', snippet: expect.any(String) }]
		});
	});

	test('shows restricted documents to admins only', async () => {
		const response = await get(admin, '/search?q=north');
		const hits = (response.body as { hits: { id: string }[] }).hits;
		expect(hits.map((hit) => hit.id)).toEqual(['doc-l1', 'doc-l2']);
	});
});

describe('GET /reports/:id', () => {
	test('runs the report with the query parameters', async () => {
		const response = await get(viewer, '/reports/orders?region=south');
		expect(response.status).toBe(200);
		expect((response.body as { rows: string[][] }).rows.map((row) => row[0])).toEqual(['L-1002', 'L-1004']);
	});

	test('answers 404 for an unknown report', async () => {
		expect(await get(viewer, '/reports/churn')).toEqual({ status: 404, body: { error: 'report not found' } });
	});
});

describe('GET /dashboards/:id', () => {
	test("renders each widget's report", async () => {
		const response = await get(brook, '/dashboards/dash-north');
		expect(response.status).toBe(200);
		const body = response.body as { title: string; widgets: { title: string; report: { rows: string[][] } }[] };
		expect(body.title).toBe('North region');
		expect(body.widgets[0]!.title).toBe('North orders');
		expect(body.widgets[0]!.report.rows.map((row) => row[0])).toEqual(['B-2001', 'B-2002']);
	});
});

test('answers 404 for an unknown path', async () => {
	expect(await get(viewer, '/nope')).toEqual({ status: 404, body: { error: 'not found' } });
});
