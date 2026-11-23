import type { RequestContext } from '../context.ts';
import { selectDashboard } from '../db.ts';
import { getJson, setJson } from '../cache.ts';
import { runReport, type ReportResult } from '../reports/service.ts';

export interface RenderedWidget {
	title: string;
	reportId: string;
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

const DASHBOARD_TTL_SECONDS = 15 * 60;

/** Each widget is a runReport result, so the rendering depends on who asks as well as on the dashboard. */
function dashboardKey(ctx: RequestContext, dashboardId: string): string {
	const roles = [...ctx.roles].sort().join('+');
	return `dashboard:v1:${ctx.orgId}:${dashboardId}:${roles}:${ctx.locale}`;
}

/** The dashboard as the front end draws it: each widget's report, run for the caller. Cached for 15 minutes. */
export async function renderDashboard(ctx: RequestContext, dashboardId: string): Promise<RenderedDashboard> {
	const key = dashboardKey(ctx, dashboardId);
	const cached = await getJson<{ orgId: string; dashboard: RenderedDashboard }>(key);
	if (cached?.orgId === ctx.orgId) return cached.dashboard;

	const dashboard = await selectDashboard(ctx.orgId, dashboardId);
	if (!dashboard) throw new DashboardNotFoundError(dashboardId);
	const widgets = await Promise.all(
		dashboard.widgets.map(async (widget) => ({
			title: widget.title,
			reportId: widget.reportId,
			report: await runReport(ctx, widget.reportId, widget.params)
		}))
	);
	const rendered = { id: dashboard.id, title: dashboard.title, widgets };
	await setJson(key, { orgId: ctx.orgId, dashboard: rendered }, DASHBOARD_TTL_SECONDS);
	return rendered;
}
