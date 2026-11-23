// Tidewell's warehouse tables. Production reads them from Postgres; this in-memory copy, with two
// organisations, backs the tests and local runs.

export interface OrderRow {
	orgId: string;
	orderId: string;
	/** YYYY-MM-DD */
	placedOn: string;
	region: string;
	customerEmail: string;
	status: 'paid' | 'refunded';
	revenueCents: number;
	marginCents: number;
	currency: string;
}

export interface SearchDocument {
	orgId: string;
	id: string;
	title: string;
	body: string;
	/** Board packs, salary bands and the like. */
	restricted: boolean;
}

export interface Widget {
	title: string;
	reportId: string;
	params: Record<string, string>;
}

export interface Dashboard {
	orgId: string;
	id: string;
	title: string;
	widgets: Widget[];
}

const orders: OrderRow[] = [
	{ orgId: 'org_lumen', orderId: 'L-1001', placedOn: '2026-03-02', region: 'north', customerEmail: 'jonas@kranich.example', status: 'paid', revenueCents: 125000, marginCents: 41000, currency: 'EUR' },
	{ orgId: 'org_lumen', orderId: 'L-1002', placedOn: '2026-03-17', region: 'south', customerEmail: 'mia@feldweg.example', status: 'paid', revenueCents: 89900, marginCents: 22500, currency: 'EUR' },
	{ orgId: 'org_lumen', orderId: 'L-1003', placedOn: '2026-03-31', region: 'north', customerEmail: 'ole@hafenblick.example', status: 'refunded', revenueCents: 45000, marginCents: 9000, currency: 'EUR' },
	{ orgId: 'org_lumen', orderId: 'L-1004', placedOn: '2026-04-03', region: 'south', customerEmail: 'lea@sonnhalde.example', status: 'paid', revenueCents: 230000, marginCents: 70500, currency: 'EUR' },
	{ orgId: 'org_brook', orderId: 'B-2001', placedOn: '2026-03-05', region: 'north', customerEmail: 'amir@millrace.example', status: 'paid', revenueCents: 54000, marginCents: 16000, currency: 'GBP' },
	{ orgId: 'org_brook', orderId: 'B-2002', placedOn: '2026-03-21', region: 'north', customerEmail: 'cath@weirside.example', status: 'paid', revenueCents: 78000, marginCents: 25500, currency: 'GBP' },
	{ orgId: 'org_brook', orderId: 'B-2003', placedOn: '2026-04-11', region: 'south', customerEmail: 'tom@fordhouse.example', status: 'paid', revenueCents: 31000, marginCents: 8000, currency: 'GBP' }
];

const documents: SearchDocument[] = [
	{ orgId: 'org_lumen', id: 'doc-l1', title: 'Q1 sales review', body: 'Revenue in the north region grew on repeat orders; the south region was flat.', restricted: false },
	{ orgId: 'org_lumen', id: 'doc-l2', title: 'Board pack: Q1 sales and pricing', body: 'Proposed price rises for the north region and the margin targets behind them.', restricted: true },
	{ orgId: 'org_brook', id: 'doc-b1', title: 'Sales playbook', body: 'How the north region team qualifies a lead before the first call.', restricted: false },
	{ orgId: 'org_brook', id: 'doc-b2', title: 'Salary bands 2026', body: 'Bands for the sales team in the north region and the south region.', restricted: true }
];

const dashboards: Dashboard[] = [
	{
		orgId: 'org_lumen',
		id: 'dash-sales',
		title: 'Sales overview',
		widgets: [
			{ title: 'Revenue by region', reportId: 'revenue-by-region', params: {} },
			{ title: 'March orders', reportId: 'orders', params: { from: '2026-03-01', to: '2026-03-31' } }
		]
	},
	{
		orgId: 'org_brook',
		id: 'dash-north',
		title: 'North region',
		widgets: [{ title: 'North orders', reportId: 'orders', params: { region: 'north' } }]
	}
];

let warehouseQueries = 0;

/** The organisation's orders. Each call is one warehouse query. */
export async function selectOrders(orgId: string): Promise<OrderRow[]> {
	warehouseQueries += 1;
	return orders.filter((row) => row.orgId === orgId).map((row) => ({ ...row }));
}

/** The organisation's searchable documents. Each call is one warehouse query. */
export async function selectDocuments(orgId: string): Promise<SearchDocument[]> {
	warehouseQueries += 1;
	return documents.filter((doc) => doc.orgId === orgId).map((doc) => ({ ...doc }));
}

/** The organisation's dashboard with this id, or undefined. */
export async function selectDashboard(orgId: string, id: string): Promise<Dashboard | undefined> {
	return dashboards.find((dashboard) => dashboard.orgId === orgId && dashboard.id === id);
}

/** How many warehouse queries have run since the process started. */
export function warehouseQueryCount(): number {
	return warehouseQueries;
}
