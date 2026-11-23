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

const SEARCH_TTL_SECONDS = 5 * 60;

interface CachedSearch {
	orgId: string;
	hits: SearchHit[];
}

/**
 * search() for the caller, cached for five minutes. The hits depend on the caller's organisation
 * and on whether they may see restricted documents, so both are in the key with the query.
 */
async function cachedSearch(ctx: RequestContext, q: string): Promise<SearchHit[]> {
	const audience = ctx.roles.includes('admin') ? 'admin' : 'member';
	const key = `search:v1:${ctx.orgId}:${audience}:${encodeURIComponent(q)}`;
	const hit = await getJson<CachedSearch>(key);
	if (hit !== null && hit.orgId === ctx.orgId) return hit.hits;
	const hits = await search(ctx, q);
	await setJson(key, { orgId: ctx.orgId, hits } satisfies CachedSearch, SEARCH_TTL_SECONDS);
	return hits;
}

/** Answers one GET request to the analytics API. The server turns a thrown error into a 500. */
export async function handle(ctx: RequestContext, url: URL): Promise<ApiResponse> {
	if (url.pathname === '/search') {
		const q = url.searchParams.get('q');
		if (q === null || q.trim() === '') return { status: 400, body: { error: 'q is required' } };
		return { status: 200, body: { hits: await cachedSearch(ctx, q) } };
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
