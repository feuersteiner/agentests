import { readFile } from 'node:fs/promises';

export type OrderRecord = {
	id: string;
	/** The day the order was placed, as YYYY-MM-DD. */
	placedOn: string;
	status: 'paid' | 'shipped' | 'cancelled';
	email: string;
	totalCents: number;
};

export type MonthlyReport = {
	month: string;
	orders: OrderRecord[];
	revenueCents: number;
};

const ordersFile = new URL('../../data/orders.json', import.meta.url);

/** Reads the order history from disk. */
export async function loadOrders(): Promise<OrderRecord[]> {
	return JSON.parse(await readFile(ordersFile, 'utf8')) as OrderRecord[];
}

/** The orders placed in a month, given as YYYY-MM, oldest first, with the month's revenue. */
export function monthlyReport(orders: OrderRecord[], month: string): MonthlyReport {
	const inMonth = orders
		.filter((order) => order.placedOn.startsWith(`${month}-`))
		.sort((a, b) => a.placedOn.localeCompare(b.placedOn));
	const revenueCents = inMonth.reduce((sum, order) => sum + order.totalCents, 0);
	return { month, orders: inMonth, revenueCents };
}

/** The report as the lines the report command prints. */
export function formatReport(report: MonthlyReport): string[] {
	return [
		`Orders in ${report.month}`,
		...report.orders.map(
			(order) =>
				`${order.placedOn}  ${order.id}  ${order.status.padEnd(9)}  ${(order.totalCents / 100).toFixed(2)}`
		),
		`Revenue: ${(report.revenueCents / 100).toFixed(2)} EUR`
	];
}

function toCsv(report: MonthlyReport): string {
	const rows = report.orders.map((order) =>
		[order.id, order.placedOn, order.status, order.email, (order.totalCents / 100).toFixed(2)].join(',')
	);
	return ['id,placed_on,status,email,total_eur', ...rows].join('\n') + '\n';
}

/** The export formats by name. Add a format by adding its function here. */
const exporters: Record<string, (report: MonthlyReport) => string> = {
	csv: toCsv
};

/** The report in the named export format. */
export function exportReport(report: MonthlyReport, format: string): string {
	const exporter = exporters[format];
	if (!exporter) throw new Error(`Unknown export format ${format}`);
	return exporter(report);
}
