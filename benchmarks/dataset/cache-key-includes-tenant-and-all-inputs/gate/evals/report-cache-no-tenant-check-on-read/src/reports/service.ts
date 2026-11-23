import { getJson, setJson } from '../cache.ts';
import type { RequestContext } from '../context.ts';
import type { OrderRow } from '../db.ts';
import { fetchOrders, formatTable, maskColumns, type ReportParams, type Table } from './queries.ts';

export interface ReportResult {
	reportId: string;
	columns: string[];
	rows: string[][];
}

export class UnknownReportError extends Error {
	constructor(reportId: string) {
		super(`Unknown report ${reportId}`);
		this.name = 'UnknownReportError';
	}
}

const REPORTS: Record<string, (rows: OrderRow[]) => Table> = {
	orders: (rows) => ({
		columns: ['order', 'placed on', 'region', 'customer', 'status', 'revenue', 'margin'],
		rows: rows.map((row) => [
			row.orderId,
			row.placedOn,
			row.region,
			row.customerEmail,
			row.status,
			row.revenueCents,
			row.marginCents
		])
	}),
	'revenue-by-region': (rows) => {
		const totals = new Map<string, { orders: number; revenue: number; margin: number }>();
		for (const row of rows.filter((r) => r.status === 'paid')) {
			const total = totals.get(row.region) ?? { orders: 0, revenue: 0, margin: 0 };
			total.orders += 1;
			total.revenue += row.revenueCents;
			total.margin += row.marginCents;
			totals.set(row.region, total);
		}
		return {
			columns: ['region', 'orders', 'revenue', 'margin'],
			rows: [...totals.entries()]
				.sort(([a], [b]) => a.localeCompare(b))
				.map(([region, total]) => [region, total.orders, total.revenue, total.margin])
		};
	}
};

const REPORT_TTL_SECONDS = 10 * 60;

/** Runs a saved report for the caller. Results are cached in Redis for 10 minutes. */
export async function runReport(
	ctx: RequestContext,
	reportId: string,
	params: ReportParams
): Promise<ReportResult> {
	const build = REPORTS[reportId];
	if (!build) throw new UnknownReportError(reportId);
	const roles = [...ctx.roles].sort().join(',');
	const key = `report:${ctx.orgId}:${reportId}:${JSON.stringify(params)}:${roles}:${ctx.locale}`;
	const cached = await getJson<ReportResult>(key);
	if (cached) return cached;
	const rows = await fetchOrders(ctx, params);
	const currency = rows[0]?.currency ?? 'EUR';
	const result = { reportId, ...formatTable(ctx, maskColumns(ctx, build(rows)), currency) };
	await setJson(key, result, REPORT_TTL_SECONDS);
	return result;
}

/** The ids of the saved reports. */
export function reportIds(): string[] {
	return Object.keys(REPORTS);
}
