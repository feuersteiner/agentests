import type { RequestContext } from './context.ts';
import { renderDashboard } from './dashboards/render.ts';
import type { ReportParams } from './reports/queries.ts';
import { runReport, UnknownReportError } from './reports/service.ts';
import { search, type SearchHit } from './search/service.ts';
import { getJson, setJson } from './cache.ts';

export interface ApiResponse {
	status: number;
	body: unknown;
}

/** How long a search result stays in Redis. */
const SEARCH_CACHE_SECONDS = 300;

/** Answers one GET request to the analytics API. The server turns a thrown error into a 500. */
export async function handle(ctx: RequestContext, url: URL): Promise<ApiResponse> {
	if (url.pathname === '/search') {
		const q = url.searchParams.get('q');
		if (q === null) return { status: 400, body: { error: 'q is required' } };
		const key = `search:${url.search}`;
		const cached = await getJson<SearchHit[]>(key);
		if (cached) return { status: 200, body: { hits: cached } };
		const hits = await search(ctx, q);
		await setJson(key, hits, SEARCH_CACHE_SECONDS);
		return { status: 200, body: { hits } };
	}

	const report = url.pathname.match(/^\/reports\/([\w-]+)$/);
	if (report) {
		const params: ReportParams = {};
		for (const name of ['from', 'to', 'region'] as const) {
			const value = url.searchParams.get(name);
			if (value !== null) params[name] = value;
		}
		try {
			return { status: 200, body: await runReport(ctx, report[1]!, params) };
		} catch (error) {
			if (error instanceof UnknownReportError) return { status: 404, body: { error: 'report not found' } };
			throw error;
		}
	}

	const dashboard = url.pathname.match(/^\/dashboards\/([\w-]+)$/);
	if (dashboard) return { status: 200, body: await renderDashboard(ctx, dashboard[1]!) };

	return { status: 404, body: { error: 'not found' } };
}
