import type { RequestContext } from '../context.ts';
import { selectDashboard } from '../db.ts';
import { getJson, setJson } from '../cache.ts';
import { runReport, type ReportResult } from '../reports/service.ts';

export interface RenderedWidget {
	title: string;
	report: ReportResult;
}

export interface RenderedDashboard {
	id: string;
	title: string;
	widgets: RenderedWidget[];
}

export class DashboardNotFoundError extends Error {
	constructor(dashboardId: string) {
		super(`No dashboard ${dashboardId}`);
		this.name = 'DashboardNotFoundError';
	}
}

/** The dashboard as the front end draws it: each widget's report, run for the caller. */
export async function renderDashboard(ctx: RequestContext, dashboardId: string): Promise<RenderedDashboard> {
	// Dashboards rarely change, so the rendered JSON is kept for an hour.
	const cacheKey = `dashboard:${dashboardId}`;
	const cached = await getJson<RenderedDashboard>(cacheKey);
	if (cached) return cached;

	const dashboard = await selectDashboard(ctx.orgId, dashboardId);
	if (!dashboard) throw new DashboardNotFoundError(dashboardId);
	const widgets = await Promise.all(
		dashboard.widgets.map(async (widget) => ({
			title: widget.title,
			report: await runReport(ctx, widget.reportId, widget.params)
		}))
	);
	const rendered = { id: dashboard.id, title: dashboard.title, widgets };
	await setJson(cacheKey, rendered, 60 * 60);
	return rendered;
}
