import type { RequestContext } from '../context.ts';
import { getJson, setJson } from '../cache.ts';
import { selectOrders, type OrderRow } from '../db.ts';

export interface ReportParams {
	/** First day included, YYYY-MM-DD. */
	from?: string;
	/** Last day included, YYYY-MM-DD. */
	to?: string;
	region?: string;
}

/** A report before masking and formatting: money in cents, dates as YYYY-MM-DD. */
export interface Table {
	columns: string[];
	rows: (string | number)[][];
}

export const MONEY_COLUMNS = new Set(['revenue', 'margin']);
export const DATE_COLUMNS = new Set(['placed on']);

const ORDERS_TTL_SECONDS = 10 * 60;

/**
 * All of the organisation's orders, from Redis when they were read from the warehouse in the last
 * 10 minutes. The params are applied afterwards, so one entry serves every report of the
 * organisation.
 */
async function organisationOrders(orgId: string): Promise<OrderRow[]> {
	const key = `orders:v1:${orgId}`;
	const cached = await getJson<{ orgId: string; rows: OrderRow[] }>(key);
	if (cached !== null && cached.orgId === orgId) return cached.rows;
	const rows = await selectOrders(orgId);
	await setJson(key, { orgId, rows }, ORDERS_TTL_SECONDS);
	return rows;
}

/** The caller's organisation's orders that match the params. */
export async function fetchOrders(ctx: RequestContext, params: ReportParams): Promise<OrderRow[]> {
	const rows = await organisationOrders(ctx.orgId);
	return rows.filter(
		(row) =>
			(params.from === undefined || row.placedOn >= params.from) &&
			(params.to === undefined || row.placedOn <= params.to) &&
			(params.region === undefined || row.region === params.region)
	);
}

/** Removes the margin column unless the caller is in finance or an admin, and masks customer emails for everyone but admins. */
export function maskColumns(ctx: RequestContext, table: Table): Table {
	const seesMargin = ctx.roles.includes('finance') || ctx.roles.includes('admin');
	const seesCustomers = ctx.roles.includes('admin');
	const keep = table.columns.map((column) => column !== 'margin' || seesMargin);
	const customer = table.columns.indexOf('customer');
	return {
		columns: table.columns.filter((_, i) => keep[i]),
		rows: table.rows.map((row) =>
			row
				.map((value, i) => (i === customer && !seesCustomers ? maskEmail(String(value)) : value))
				.filter((_, i) => keep[i])
		)
	};
}

/** Formats money and dates for the caller's locale; every cell becomes a string. */
export function formatTable(ctx: RequestContext, table: Table, currency: string): { columns: string[]; rows: string[][] } {
	return {
		columns: table.columns,
		rows: table.rows.map((row) =>
			row.map((value, i) => {
				const column = table.columns[i]!;
				if (MONEY_COLUMNS.has(column)) return formatMoney(Number(value), currency, ctx.locale);
				if (DATE_COLUMNS.has(column)) return formatDate(String(value), ctx.locale);
				return String(value);
			})
		)
	};
}

export function formatMoney(cents: number, currency: string, locale: string): string {
	return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(cents / 100);
}

export function formatDate(isoDate: string, locale: string): string {
	return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(
		new Date(`${isoDate}T00:00:00Z`)
	);
}

/** "jonas@kranich.example" becomes "j***@kranich.example". */
export function maskEmail(email: string): string {
	const at = email.indexOf('@');
	return at < 1 ? '***' : `${email[0]}***${email.slice(at)}`;
}
