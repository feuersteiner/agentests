import type { RequestContext } from './context.ts';
import { renderDashboard } from './dashboards/render.ts';
import type { ReportParams } from './reports/queries.ts';
import { runReport, UnknownReportError } from './reports/service.ts';
import { search } from './search/service.ts';

export interface ApiResponse {
	status: number;
	body: unknown;
}

/** Answers one GET request to the analytics API. The server turns a thrown error into a 500. */
export async function handle(ctx: RequestContext, url: URL): Promise<ApiResponse> {
	if (url.pathname === '/search') {
		const q = url.searchParams.get('q')!;
		return { status: 200, body: { hits: await search(ctx, q) } };
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
