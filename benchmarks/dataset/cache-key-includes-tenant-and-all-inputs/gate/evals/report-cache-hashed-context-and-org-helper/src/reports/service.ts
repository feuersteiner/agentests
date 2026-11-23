import { createHash } from 'node:crypto';
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

const TEN_MINUTES = 600;

/** The value stored under key if it was stored for this organisation; anything else is a miss. */
async function getForOrg<T>(orgId: string, key: string): Promise<T | null> {
	const entry = await getJson<{ orgId: string; value: T }>(key);
	return entry !== null && entry.orgId === orgId ? entry.value : null;
}

async function setForOrg(orgId: string, key: string, value: unknown, ttlSeconds: number): Promise<void> {
	await setJson(key, { orgId, value }, ttlSeconds);
}

/** Runs a saved report for the caller, from Redis when the same report was run in the last 10 minutes. */
export async function runReport(
	ctx: RequestContext,
	reportId: string,
	params: ReportParams
): Promise<ReportResult> {
	const build = REPORTS[reportId];
	if (!build) throw new UnknownReportError(reportId);
	const fingerprint = createHash('sha256')
		.update(
			JSON.stringify({
				orgId: ctx.orgId,
				roles: [...ctx.roles].sort(),
				locale: ctx.locale,
				reportId,
				params
			})
		)
		.digest('base64url');
	const key = `report:${fingerprint}`;
	const hit = await getForOrg<ReportResult>(ctx.orgId, key);
	if (hit) return hit;
	const rows = await fetchOrders(ctx, params);
	const currency = rows[0]?.currency ?? 'EUR';
	const result = { reportId, ...formatTable(ctx, maskColumns(ctx, build(rows)), currency) };
	await setForOrg(ctx.orgId, key, result, TEN_MINUTES);
	return result;
}

/** The ids of the saved reports. */
export function reportIds(): string[] {
	return Object.keys(REPORTS);
}
