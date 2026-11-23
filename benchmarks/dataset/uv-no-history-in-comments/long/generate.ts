// Writes the long material of this entry's long task: the questions Larkfield colleagues sent the data desk
// between 7 September and 13 November 2026, one Markdown file each, under docs/data-questions/, as the shared
// inbox exported them, without labels or statuses. Deterministic: fixed seeds, no clock, no network.
//   bun long/generate.ts <workspace root>
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** How many questions to write. Dates, numbers and the share of each topic all follow from it. */
const ITEMS = 192;

const root = process.argv[2];
if (!root) throw new Error('Usage: bun long/generate.ts <dir>');

const mulberry32 = (seed: number) => () => {
	seed = (seed + 0x6d2b79f5) | 0;
	let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
	t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
type Rand = () => number;
const int = (r: Rand, low: number, high: number) => low + Math.floor(r() * (high - low + 1));
const pick = <T>(r: Rand, items: readonly T[]): T => items[Math.floor(r() * items.length)]!;
const chance = (r: Rand, p: number) => r() < p;
const shuffle = <T>(r: Rand, items: readonly T[]): T[] => {
	const copy = [...items];
	for (let i = copy.length - 1; i > 0; i--) {
		const j = Math.floor(r() * (i + 1));
		[copy[i], copy[j]] = [copy[j]!, copy[i]!];
	}
	return copy;
};
/** A stable number for a name, so that a customer keeps its plan, region and owner from question to question. */
const hash = (text: string) => [...text].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);
const pad = (value: number) => String(value).padStart(2, '0');
const round2 = (value: number) => Math.round(value * 100) / 100;
const grouped = (value: number) => String(value).replace(/\B(?=(\d{3})+$)/g, ',');
const money = (value: number) => `${value < 0 ? '−' : ''}£${Math.abs(value).toFixed(2).replace(/\B(?=(\d{3})+\.)/g, ',')}`;
const plain = (value: number) => value.toFixed(2);

// Time is kept in minutes since 00:00 on 1 September 2026, UK local time.
const EPOCH = Date.UTC(2026, 8, 1);
const DAY = 1440;
const LAST_MESSAGE = 80 * DAY + 17 * 60; // Friday 20 November, 17:00, the day of the export
const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const at = (minutes: number) => new Date(EPOCH + minutes * 60000);
const weekday = (m: number) => dayNames[at(m).getUTCDay()]!;
const monthOf = (m: number) => at(m).getUTCMonth();
const clock = (m: number) => `${pad(at(m).getUTCHours())}:${pad(at(m).getUTCMinutes())}`;
const iso = (m: number) => at(m).toISOString().slice(0, 10);
const compact = (m: number) => iso(m).replaceAll('-', '');
const dayMonth = (m: number) => `${at(m).getUTCDate()} ${monthNames[monthOf(m)]!}`;
const shortDate = (m: number) => `${at(m).getUTCDate()} ${monthNames[monthOf(m)]!.slice(0, 3)}`;
const longDate = (m: number) => `${weekday(m)} ${dayMonth(m)}`;
const stamp = (m: number) => `${weekday(m).slice(0, 3)} ${shortDate(m)}, ${clock(m)}`;
const ukDate = (m: number) => `${pad(at(m).getUTCDate())}/${pad(monthOf(m) + 1)}/2026`;
const isWeekend = (m: number) => at(m).getUTCDay() % 6 === 0;
const minuteOfDay = (m: number) => ((m % DAY) + DAY) % DAY;
const startOfDay = (m: number) => m - minuteOfDay(m);
const shiftWorkdays = (m: number, days: number) => {
	let d = startOfDay(m);
	const step = days < 0 ? -DAY : DAY;
	for (let left = Math.abs(days); left > 0; ) {
		d += step;
		if (!isWeekend(d)) left--;
	}
	return d;
};
/** The same moment, or the next office minute after it. */
const office = (r: Rand, m: number) => {
	let t = m;
	if (minuteOfDay(t) > 17 * 60 + 40) t = startOfDay(t) + DAY + 8 * 60 + int(r, 10, 80);
	if (minuteOfDay(t) < 8 * 60) t = startOfDay(t) + 8 * 60 + int(r, 10, 80);
	while (isWeekend(t)) t += DAY;
	return t;
};
/** The most recent day before `m` that falls on the given weekday, 0 for Sunday. */
const lastWeekday = (m: number, day: number) => {
	let d = startOfDay(m) - DAY;
	while (at(d).getUTCDay() !== day) d -= DAY;
	return d;
};
const workdays: number[] = [];
for (let d = 6; d <= 73; d++) if (!isWeekend(d * DAY)) workdays.push(d * DAY);

// People.
interface Person {
	full: string;
	first: string;
	role: string;
	team: string;
}
const person = (full: string, role: string, team: string): Person => ({ full, first: full.split(' ')[0]!, role, team });
const askers: Record<string, Person[]> = {
	finance: [person('Helen Brodie', 'financial controller', 'finance'), person('Anika Patel', 'management accountant', 'finance'), person('Gwen Tallis', 'finance analyst', 'finance')],
	receivables: [person('Joe Whitcombe', 'accounts receivable', 'finance'), person('Rhys Doherty', 'credit control', 'finance')],
	sales: [person('Liam Carver', 'sales director', 'sales'), person('Tariq Aziz', 'account manager', 'sales'), person('Beth Lowry', 'account manager', 'sales'), person('Callum Reid', 'account manager', 'sales'), person('Joanna Pell', 'account manager', 'sales')],
	accountManagers: [person('Tariq Aziz', 'account manager', 'sales'), person('Beth Lowry', 'account manager', 'sales'), person('Callum Reid', 'account manager', 'sales'), person('Joanna Pell', 'account manager', 'sales')],
	success: [person('Nadia Brooks', 'customer success', 'success'), person('Femi Adebayo', 'customer success', 'success'), person('Isla Grant', 'onboarding', 'success')],
	marketing: [person('Owen Pryce', 'marketing', 'marketing'), person('Lisa Tanner', 'marketing', 'marketing')],
	leadership: [person('Catherine Lyle', 'managing director', 'leadership'), person('Simon Achterberg', 'finance director', 'leadership')],
	pricing: [person('Marek Novak', 'pricing', 'pricing')],
	starters: [person('Priyanka Shah', 'finance analyst', 'finance'), person('Tom Ferris', 'account manager', 'sales'), person('Aisha Bello', 'customer success', 'success'), person('Ollie Grant', 'marketing executive', 'marketing')]
};
const managers: Record<string, string> = { finance: 'Helen Brodie', sales: 'Liam Carver', success: 'Maya Lindqvist', marketing: 'Rosa Delgado', leadership: 'Catherine Lyle', pricing: 'Simon Achterberg' };
const managerRoles: Record<string, string> = { 'Helen Brodie': 'financial controller', 'Liam Carver': 'sales director', 'Maya Lindqvist': 'head of customer success', 'Rosa Delgado': 'head of marketing', 'Catherine Lyle': 'managing director', 'Simon Achterberg': 'finance director' };
const deskPeople = [person('Priya Raman', 'data desk', 'data'), person('Dafydd Hughes', 'data desk', 'data')];
const others: Record<string, Person> = {
	l: person('Ruth Okoye', 'data desk lead', 'data'),
	b: person('Kofi Mensah', 'BI', 'data'),
	f: person('Martin Kell', 'finance systems', 'finance'),
	s: person('Sana Iqbal', 'sales operations', 'sales'),
	i: person('Josh Barnard', 'IT service desk', 'it'),
	p: person('Eleanor Voss', 'data protection', 'legal'),
	r: person('Joe Whitcombe', 'accounts receivable', 'finance')
};
const owners = ['Grace Fenwick', 'Tariq Aziz', 'Beth Lowry', 'Callum Reid', 'Joanna Pell', 'Matt Oduya'];
const leavers = ['Dev Chauhan', 'Holly Marsh', 'Ben Okafor-Reid'];
const colleagues = ['Sophie', 'Aaron', 'Mina', 'Greg', 'Leah', 'Tom'];

// Customers. The first five are the ones in data/sample.csv.
const plans = ['Essentials', 'Business', 'Business Plus'] as const;
const prices: Record<string, [number, number]> = { Essentials: [49, 52], Business: [129, 136], 'Business Plus': [249, 262] };
const regions: Record<string, string[]> = {
	North: ['LS6 2QT', 'HG1 4AX', 'YO10 3DD', 'NE2 1PR', 'BD9 5LN'],
	Midlands: ['NG7 2RD', 'DE22 1HL', 'LE2 3FQ', 'CV4 8JB'],
	'South West': ['BS6 5EW', 'EX4 4QJ', 'TA1 3NX', 'PL4 6AB'],
	'London & South East': ['SE15 4QF', 'N16 7UH', 'RH10 1DA', 'ME14 2LL'],
	Scotland: ['EH7 5QZ', 'G12 8QQ', 'AB24 3FX'],
	Wales: ['CF24 4HQ', 'SA1 8EN', 'LL57 2DG']
};
const regionNames = Object.keys(regions);
interface Customer {
	name: string;
	id: string;
	plan: string;
	region: string;
	postcode: string;
	owner: string;
	monthly: number;
	created: string;
}
const customerNames = ['Okafor Fabrics', 'Brandt & Lowe', 'Hillview Dental', 'Maren Cycles', 'Tessaly Print', 'Pembury Joinery', 'Ashgrove Vets', 'Calder Accountancy', 'Nettlebed Florists', 'Quayside Opticians', 'Rook & Finch Solicitors', 'Silverdale Physio', 'Thornbury Bakery', 'Wexcombe Garage', 'Yardley Architects', 'Bramwell Estates', 'Copperfield Dental', 'Dunmore Logistics', 'Elmstead Nursery', 'Foxglove Interiors', 'Greystone Builders', 'Harrow Lane Surgery', 'Ivybridge Pharmacy', 'Juniper Yoga Studio', 'Kestrel Couriers', 'Linden Hotel', 'Millbrook Kitchens', 'Northgate Motors', 'Orchard Lettings', 'Parkside Pharmacy', 'Quill & Ink Stationers', 'Redwood Tutors', 'Saltash Marine', 'Tidewell Plumbing', 'Upland Farm Shop', 'Vale Recruitment', 'Willow Care Homes', 'Yewtree Accountants', 'Abbeyfield Print', 'Birchall & Sons', 'Castleton Glass', 'Delph Engineering', 'Easton Bridal', 'Fernside Veterinary', 'Glenmoor Distillery', 'Hartwell Pet Supplies', 'Café Lumière', 'Nørgaard Design', 'Brasserie Élan', 'Kingsmead Opticians', 'Lowther Removals', 'Marsh & Pike Surveyors', 'Oakhanger Brewery', 'Penrose Gallery', 'Riverbank Dental', 'Stourton Builders'];
const fixedIds = ['c-101', 'c-102', 'c-104', 'c-107', 'c-109'];
const fixedCreated = ['2026-03-02', '2026-03-02', '2026-03-05', '', '2026-03-09'];
const customers: Customer[] = customerNames.map((name, i) => {
	const h = hash(name);
	const plan = plans[h % 3]!;
	const region = regionNames[(h >>> 4) % regionNames.length]!;
	const codes = regions[region]!;
	const created = i < 5 ? fixedCreated[i]! : `202${3 + ((h >>> 9) % 3)}-${pad(1 + ((h >>> 12) % 12))}-${pad(1 + ((h >>> 16) % 27))}`;
	return { name, id: i < 5 ? fixedIds[i]! : `c-${1000 + ((i * 397) % 3900)}`, plan, region, postcode: codes[(h >>> 7) % codes.length]!, owner: owners[(h >>> 11) % owners.length]!, monthly: prices[plan]![0] + [0, 12, 18, 30][(h >>> 14) % 4]!, created };
});
const escapedNames = customers.filter((c) => c.name.includes('&'));
const accentNames = customers.filter((c) => /[^\x00-\x7f]/.test(c.name));
const mojibake = (text: string) => [...new TextEncoder().encode(text)].map((b) => (b < 128 ? String.fromCharCode(b) : b === 0xc3 ? 'Ã' : b === 0xa9 ? '©' : b === 0xa8 ? '¨' : b === 0xb8 ? '¸' : b === 0x89 ? '‰' : b === 0xab ? '«' : '·')).join('');

// One question's context: who asked, about whom, and the figures its pasted output and its messages share.
interface Ctx {
	r: Rand;
	open: number;
	asker: Person;
	desk: Person;
	cust: Customer;
	near: Customer[];
	date: number;
	renew: number;
	weekly: number;
	n: number;
	amounts: number[];
	diff: number;
	ledger: number;
	count: number;
	invs: string[];
	v: Record<string, string>;
	/** When the message being written was sent. */
	now: number;
}
const invoiceNumber = (m: number, k: number) => `INV-${208000 + Math.floor(m / DAY) * 37 + k}`;
const previousMonth = (m: number, back: number) => monthNames[(monthOf(m) + 12 - back) % 12]!;

// Pasted output. Every block is built from the question's own figures.
const psql = (query: string, cols: string[], rows: (string | number)[][]) => {
	const cells = rows.map((row) => row.map((cell) => String(cell)));
	const numeric = cols.map((_, i) => cells.length > 0 && cells.every((row) => row[i] === '' || /^-?[\d.]+$/.test(row[i]!)));
	const widths = cols.map((col, i) => Math.max(col.length, ...cells.map((row) => row[i]!.length)));
	const centre = (text: string, width: number) => {
		const left = Math.floor((width - text.length) / 2);
		return ' '.repeat(left) + text + ' '.repeat(width - text.length - left);
	};
	const line = (parts: string[]) => parts.map((part) => ` ${part} `).join('|').replace(/\s+$/, '');
	return ['```text', `warehouse=> ${query}`, line(cols.map((col, i) => centre(col, widths[i]!))), widths.map((w) => '-'.repeat(w + 2)).join('+'), ...cells.map((row) => line(row.map((cell, i) => (numeric[i] ? cell.padStart(widths[i]!) : cell.padEnd(widths[i]!))))), `(${rows.length} ${rows.length === 1 ? 'row' : 'rows'})`, '```'].join('\n');
};
const table = (cols: string[], rows: (string | number)[][], right: number[] = []) =>
	[`| ${cols.join(' | ')} |`, `| ${cols.map((_, i) => (right.includes(i) ? '---:' : '---')).join(' | ')} |`, ...rows.map((row) => `| ${row.join(' | ')} |`)].join('\n');
const block = (lines: string[], kind = 'text') => ['```' + kind, ...lines, '```'].join('\n');
const csvCell = (value: string) => (/[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value);
const csv = (cols: string[], rows: string[][]) => block([cols.join(','), ...rows.map((row) => row.map(csvCell).join(','))], 'csv');

const nightFiles = (c: Ctx, m: number) => {
	const day = Math.floor(m / DAY);
	const first = at(m).getUTCDate() === 1 || (at(m).getUTCDate() <= 3 && at(m).getUTCDay() === 1);
	return [
		['billing/accounts', 'id', 'created_at', 4060 + day * 2 + int(c.r, 0, 6), 'billing.accounts', 'replace'],
		['billing/invoices', 'invoice_id', 'issued_on', first ? 3980 + int(c.r, 0, 160) : int(c.r, 18, 160), 'billing.invoices', 'merge'],
		['billing/payments', 'payment_id', 'received_on', int(c.r, 40, 420), 'billing.payments', 'merge'],
		['billing/credit_notes', 'credit_note_id', 'issued_on', int(c.r, 0, 14), 'billing.credit_notes', 'merge'],
		['crm/accounts', 'id', 'renewal_on', 4110 + day * 2 + int(c.r, 0, 9), 'crm.accounts', 'replace'],
		['crm/deals', 'deal_id', 'closed_on', 2290 + day + int(c.r, 0, 20), 'crm.deals', 'replace']
	] as [string, string, string, number, string, string][];
};
/** The nightly load's log for the files of data day `m`, fetched early the next morning. `broken` may replace the
 * lines of one file; its lines carry no time, and `FETCH` stands for the usual fetch line. */
const nightLog = (c: Ctx, m: number, broken?: (file: string, rows: number, name: string) => string[] | undefined) => {
	const lines = [`nightly-load ${iso(m + DAY)} on ops-etl-01`];
	let sec = 2 * 3600 + int(c.r, 0, 90);
	const timed = (line: string) => {
		lines.push(`${pad(Math.floor(sec / 3600))}:${pad(Math.floor(sec / 60) % 60)}:${pad(sec % 60)} ${line}`);
		sec += int(c.r, 0, 2);
	};
	for (const [file, , , rows, target, mode] of nightFiles(c, m)) {
		const name = `${file}_${compact(m)}.csv`;
		const fetched = `fetch  ${name.padEnd(34)} ${file.startsWith('crm') ? 'api ' : 'sftp'}  ${grouped(rows * int(c.r, 88, 131))} bytes`;
		const custom = broken?.(file, rows, name);
		for (const line of custom ?? [fetched, `clean  Wrote ${rows} rows to clean/${name}`, `load   ${target.padEnd(34)} ${String(rows).padStart(6)} rows  ${mode}`]) timed(line === 'FETCH' ? fetched : line);
		sec += int(c.r, 4, 30);
	}
	timed('done   dashboards refresh at 06:00');
	return block(lines);
};
const monthFirst = (open: number, back: number) => {
	const index = monthOf(open) - back;
	const year = 2026 + Math.floor(index / 12);
	return `${year}-${pad((((index % 12) + 12) % 12) + 1)}-01`;
};
const monthFirstMinutes = (open: number, back: number) => {
	const first = monthFirst(open, back);
	return (Date.UTC(Number(first.slice(0, 4)), Number(first.slice(5, 7)) - 1, 1) - EPOCH) / 60000;
};
/** Minutes of the first working day of the month `back` months before the one holding `open`. */
const firstWorkday = (open: number, back: number) => {
	let m = monthFirstMinutes(open, back);
	while (isWeekend(m)) m += DAY;
	return m;
};
/** A customer's monthly invoices, oldest first, then the two invoices the question is about, dated `c.date`. */
const invoiceRows = (c: Ctx, cust: Customer, count: number) => {
	const rows: [string, string, number, number, number, string][] = [];
	for (let k = count - 3; k >= 0; k--) {
		const net = cust.monthly + (chance(c.r, 0.25) ? int(c.r, 5, 60) : 0);
		rows.push([invoiceNumber(monthFirstMinutes(c.open, k), int(c.r, 1, 36)), monthFirst(c.open, k), net, round2(net * 0.2), round2(net * 1.2), k === 0 ? 'open' : 'paid']);
	}
	for (const inv of [c.invs[1]!, c.invs[0]!]) {
		const net = int(c.r, 35, 240);
		rows.push([inv, iso(c.date), net, round2(net * 0.2), round2(net * 1.2), 'open']);
	}
	return rows;
};

type PasteFn = (c: Ctx) => string;
const pastes: Record<string, PasteFn> = {
	revenueMonths: (c) => {
		const earlier = [round2(c.ledger - int(c.r, 4000, 16000) + c.r()), round2(c.ledger - int(c.r, -9000, 9000) + c.r())];
		return table(['Month', 'Revenue dashboard', 'Ledger', 'Difference'], [[c.v.month3!, money(earlier[0]!), money(earlier[0]!), money(0)], [c.v.month2!, money(earlier[1]!), money(earlier[1]!), money(0)], [c.v.month!, money(c.ledger - c.diff), money(c.ledger), money(-c.diff)]], [1, 2, 3]);
	},
	creditNotes: (c) =>
		psql(`select count(*), sum(amount) from billing.credit_notes where issued_on >= '${c.v.monthStart}' and issued_on < '${c.v.monthEnd}';`, ['count', 'sum'], [[c.n, plain(c.diff)]]) +
		'\n\n' +
		psql(`select credit_note_id, account_id, issued_on, amount from billing.credit_notes where issued_on >= '${c.v.monthStart}' order by amount desc limit 5;`, ['credit_note_id', 'account_id', 'issued_on', 'amount'], [...c.amounts].sort((a, b) => b - a).slice(0, 5).map((amount, k) => [`CN-${4100 + int(c.r, 0, 300) + k}`, c.near[k % c.near.length]!.id, c.v.monthStart!.slice(0, 8) + pad(int(c.r, 1, 28)), plain(amount)])),
	loadLogSecond: (c) => nightLog(c, monthFirstMinutes(c.open, 0)),
	loadLogFail: (c) =>
		nightLog(c, c.date, (file, _rows, name) =>
			file === 'billing/invoices' ? [`fetch  ${name.padEnd(34)} sftp  ${grouped(c.n * int(c.r, 95, 120))} bytes`, `clean  exports/${name}: row ${int(c.r, 2, c.n + 1)}: bad date '${ukDate(c.date)}'`, `skip   billing.invoices                   clean failed, table left as it was`] : undefined
		),
	loadLogShort: (c) =>
		nightLog(c, c.date, (file, rows, name) =>
			file === 'billing/invoices' ? [`fetch  ${name.padEnd(34)} sftp  WARNING transfer ended early: ${grouped(rows * 41)} of ${grouped(rows * 109)} bytes`, `clean  Wrote ${Math.floor(rows * 0.37)} rows to clean/${name}`, `load   billing.invoices                   ${String(Math.floor(rows * 0.37)).padStart(6)} rows  merge`] : undefined
		),
	loadLogPack: (c) =>
		nightLog(c, firstWorkday(c.open, 1) - DAY, (file, _rows, name) =>
			file === 'crm/accounts' ? [`fetch  ${name.padEnd(34)} api   ERROR 503 from CRM API after 3 attempts`, `skip   crm.accounts                       no file, table left as it was`] : undefined
		),
	loadLogCrmDown: (c) =>
		nightLog(c, c.date, (file, _rows, name) =>
			file.startsWith('crm/') ? [`fetch  ${name.padEnd(34)} api   ERROR 503 from CRM API after 3 attempts`, `skip   ${file.replace('/', '.').padEnd(34)} no file, table left as it was`] : undefined
		),
	loadLogDisk: (c) =>
		nightLog(c, c.date, (file, _rows, name) =>
			file.startsWith('crm/') ? [`fetch  ${name.padEnd(34)} api   ERROR writing /srv/exports/${name}: No space left on device`, `skip   ${file.replace('/', '.').padEnd(34)} no file, table left as it was`] : undefined
		),
	loadLast: (c) => nightLog(c, startOfDay(c.now) - DAY),
	refreshTimes: (c) =>
		table(['View', 'Rebuilt', 'Rows', 'Status'], ['revenue_monthly', 'renewals', 'collections', 'account_owner', 'account_changes', 'commission_owner', 'account_prices', 'postcode_region'].map((view, k) => [`reporting.${view}`, `05:${pad(31 + k * 2 + int(c.r, 0, 1))}`, grouped([48, 1210, 2390, 4810, 152, 4190, 4150, 2630][k]! + int(c.r, 0, 40)), 'ok']), [2]),
	countsWeek: (c) =>
		table(['Night', 'billing.invoices', 'billing.payments', 'billing.credit_notes', 'crm.accounts', 'crm.deals'], [5, 4, 3, 2, 1].map((back) => {
			const day = shiftWorkdays(c.now, -back);
			const files = nightFiles(c, day);
			return [iso(day), ...files.slice(1).map((file) => grouped(file[3]))];
		}), [1, 2, 3, 4, 5]),
	appendRun: (c) => block([`$ whload billing.invoices clean/billing/invoices_${compact(c.date)}.csv --append`, `Loaded ${int(c.r, 40, 160)} rows into billing.invoices (append)`, `$ whload billing.invoices clean/billing/invoices_${compact(c.date)}.csv --merge`, `Merged 0 new rows into billing.invoices`]),
	billingScreen: (c) => table(['Invoice', 'Date', 'Net', 'VAT', 'Total', 'Status'], invoiceRows(c, c.cust, c.count).map(([inv, date, net, vat, total, status]) => [inv, date, money(net), money(vat), money(total), status]), [2, 3, 4]),
	entityRows: (c) => table(['Invoice', 'Entity', 'Issued', 'Total'], invoiceRows(c, c.cust, c.count).map(([inv, date, , , total], k, all) => [inv, k >= all.length - 2 ? 'Larkfield Connect Ltd' : 'Larkfield Ltd', date, money(total)]), [3]),
	twoAccounts: (c) =>
		psql(`select id, customer, owner, plan, created_at, renewal_on from crm.accounts where customer ilike '${c.cust.name.split(' ')[0]}%';`, ['id', 'customer', 'owner', 'plan', 'created_at', 'renewal_on'], [[c.cust.id, c.cust.name, c.v.owner!, c.cust.plan, c.cust.created, c.v.renewIso!], [c.v.dupId!, c.cust.name, c.v.owner2!, c.cust.plan, c.v.iso!, c.v.renewIso!]]),
	twoAccountsInvoices: (c) =>
		psql(`select account_id, count(*), min(issued_on), max(issued_on), sum(total) from billing.invoices where account_id in ('${c.cust.id}', '${c.v.dupId}') group by 1;`, ['account_id', 'count', 'min', 'max', 'sum'], [[c.cust.id, c.count + 6, monthFirst(c.open, c.count + 5), monthFirst(c.open, 0), plain(round2(c.cust.monthly * 1.2 * (c.count + 6)))], [c.v.dupId!, c.count - 1, monthFirst(c.open, c.count - 2), monthFirst(c.open, 0), plain(round2(c.cust.monthly * 1.2 * (c.count - 1)))]]),
	ownerRows: (c) =>
		psql(`select account_id, owner, valid_from, valid_to from reporting.account_owner where account_id = '${c.cust.id}' order by valid_from;`, ['account_id', 'owner', 'valid_from', 'valid_to'], [[c.cust.id, c.v.owner3!, `2024-${pad(int(c.r, 2, 9))}-01`, '2025-11-30'], [c.cust.id, c.v.owner2!, '2025-12-01', ''], [c.cust.id, c.v.owner!, c.v.iso!, '']]),
	renewalDup: (c) => {
		const rows = c.near.slice(0, int(c.r, 3, 7)).map((cust, k) => [cust.name, cust.id, cust.owner, cust.plan, iso(c.renew + (k + 1) * 2 * DAY), money(cust.monthly * 12)]);
		rows.splice(int(c.r, 0, rows.length), 0, [c.cust.name, c.cust.id, c.v.owner!, c.cust.plan, c.v.renewIso!, money(c.cust.monthly * 12)], [c.cust.name, c.v.dupId!, c.v.dupOwner!, c.cust.plan, c.v.renewIso!, money(c.cust.monthly * 12)]);
		return table(['Account', 'Id', 'Owner', 'Plan', 'Renews', 'Annual value'], rows, [5]);
	},
	overdueList: (c) => {
		const rows = c.near.slice(0, int(c.r, 6, 10)).map((cust) => {
			const days = int(c.r, 8, 64);
			return [cust.name, invoiceNumber(startOfDay(c.open) - (days + 30) * DAY, int(c.r, 1, 36)), iso(startOfDay(c.open) - days * DAY), days, money(round2(cust.monthly * 1.2))];
		});
		rows.sort((a, b) => Number(b[3]) - Number(a[3]));
		rows.splice(int(c.r, 0, 2), 0, [c.cust.name, c.v.inv!, c.v.dueIso!, Number(c.v.days), money(round2(c.cust.monthly * 1.2))]);
		return table(['Customer', 'Invoice', 'Due', 'Days overdue', 'Amount'], rows, [3, 4]);
	},
	payments: (c) => psql(`select payment_id, invoice_id, received_on, amount, method from billing.payments where invoice_id = '${c.v.inv}';`, ['payment_id', 'invoice_id', 'received_on', 'amount', 'method'], []),
	paymentsMatched: (c) => psql(`select payment_id, invoice_id, received_on, amount, method from billing.payments where invoice_id = '${c.v.inv}';`, ['payment_id', 'invoice_id', 'received_on', 'amount', 'method'], [[`PAY-${int(c.r, 610000, 690000)}`, c.v.inv!, c.v.paidIso!, plain(round2(c.cust.monthly * 1.2)), 'bacs']]),
	paymentsSplit: (c) => {
		const id = `PAY-${int(c.r, 610000, 690000)}`;
		const total = round2(c.cust.monthly * 1.2);
		const part = round2(total * (0.3 + c.r() * 0.4));
		return psql(`select p.payment_id, p.invoice_id, p.amount, a.part from billing.payments p join billing.payment_parts a using (payment_id) where p.invoice_id = '${c.v.inv}';`, ['payment_id', 'invoice_id', 'amount', 'part'], [[id, c.v.inv!, plain(total), plain(part)], [id, c.v.inv!, plain(total), plain(round2(total - part))]]);
	},
	ownerList: (c) => psql(`select id, customer, owner from crm.accounts where id in (${c.near.slice(0, Math.min(c.n, 9)).map((cust) => `'${cust.id}'`).join(', ')});`, ['id', 'customer', 'owner'], c.near.slice(0, Math.min(c.n, 9)).map((cust) => [cust.id, cust.name, c.v.ownerShown!])),
	exportOwners: (c) => csv(['id', 'customer', 'owner', 'region', 'plan', 'created_at', 'renewal_on'], c.near.slice(0, 5).map((cust) => [cust.id, cust.name, c.v.leaver!, cust.region, cust.plan, cust.created, iso(c.open + int(c.r, 20, 300) * DAY)])),
	crmUsers: (c) => {
		const surname = c.asker.full.split(' ')[1]!.toLowerCase();
		return table(['User', 'Email', 'Active', 'Accounts owned'], [[c.asker.full, `${c.asker.first.toLowerCase()}.${surname}@larkfield.example`, 'yes', int(c.r, 30, 70)], [c.asker.full, `${c.asker.first.toLowerCase()[0]}${surname}@larkfield.example`, 'yes', c.n]], [3]);
	},
	dateCompare: (c) =>
		table(['Account', 'Renewal in CRM', 'Renewal on dashboard'], [c.cust, ...c.near.slice(0, 4)].map((cust, k) => {
			const m = k === 0 ? c.renew : c.open + (20 + k * 9 + int(c.r, 0, 6)) * DAY;
			return [cust.name, iso(m), k % 2 === 0 ? iso(m - DAY) : iso(m)];
		})),
	exportUtc: (c) => block([`$ grep '^${c.cust.id},' exports/crm/accounts_${compact(startOfDay(c.open) - DAY)}.csv`, `${c.cust.id},${csvCell(c.cust.name)},${c.cust.owner},${c.cust.region},${c.cust.plan},${c.cust.created},${c.v.renewMinus}`, '', `$ crm-cli accounts get ${c.cust.id} --fields renewal_on`, `renewal_on: ${c.v.renewIso}T00:00:00+01:00`]),
	churnMonths: (c) =>
		table(['Month', 'Accounts at start', 'Closed', 'Churn'], [c.v.month3!, c.v.month2!, c.v.month!].map((month, k) => {
			const start = 4040 + k * 40 + int(c.r, 0, 20);
			const closed = k === 2 ? 30 + c.n * 4 : int(c.r, 28, 41);
			return [month, grouped(start), closed, `${((closed / start) * 100).toFixed(1)}%`];
		}), [1, 2, 3]),
	closeReasons: (c) => {
		const d = int(c.r, 0, 3);
		const [competitor, ceased, price] = [int(c.r, 9, 14), int(c.r, 5, 8), int(c.r, 3, 5)];
		return psql(`select close_reason, count(*) from crm.accounts where closed_on >= '${c.v.monthStart}' and closed_on < '${c.v.monthEnd}' group by 1 order by 2 desc;`, ['close_reason', 'count'], [['data cleanup', c.n * 4 - d], ['moved to competitor', competitor], ['ceased trading', ceased], ['price', price], ['other', 30 + d - competitor - ceased - price]].sort((a, b) => Number(b[1]) - Number(a[1])));
	},
	closeReasonsReal: (c) => {
		const [ceased, price] = [int(c.r, 6, 10), int(c.r, 4, 7)];
		return psql(`select close_reason, count(*) from crm.accounts where closed_on >= '${c.v.monthStart}' and closed_on < '${c.v.monthEnd}' group by 1 order by 2 desc;`, ['close_reason', 'count'], [['moved to competitor', 12 + c.n * 3], ['ceased trading', ceased], ['price', price], ['other', 18 + c.n - ceased - price]].sort((a, b) => Number(b[1]) - Number(a[1])));
	},
	planChanges: (c) => psql(`select change, count(*) from reporting.account_changes where month = '${c.v.monthStart}' group by 1 order by 1;`, ['change', 'count'], [['closed', 30 + c.n * 4], ['new', int(c.r, 45, 70) + c.n * 4], ['plan change', 0]]),
	vatQuarter: (c) => {
		const output = int(c.r, 210000, 236000) + round2(c.r());
		return table(['', 'VAT return', 'Warehouse', 'Difference'], [['Box 1, VAT due on sales', money(output), money(output + c.diff), money(c.diff)], ['Box 6, total sales ex VAT', money(round2(output * 5)), money(round2(output * 5)), money(0)]], [1, 2, 3]);
	},
	vatLines: (c) => psql(`select invoice_id, net, vat, round(net * 0.2, 2) as at_20 from billing.invoices where invoice_id = '${c.v.inv}';`, ['invoice_id', 'net', 'vat', 'at_20'], [[c.v.inv!, plain(c.cust.monthly), plain(0), plain(round2(c.cust.monthly * 0.2))]]),
	exportIndustry: (c) => csv(['id', 'customer', 'owner', 'region', 'plan', 'industry', 'created_at', 'renewal_on'], c.near.slice(0, 6).map((cust, k) => [cust.id, cust.name, cust.owner, cust.region, cust.plan, k % 3 === 2 ? '' : pick(c.r, ['Healthcare', 'Legal', 'Retail', 'Hospitality', 'Construction', 'Professional services', 'Manufacturing']), cust.created, iso(c.open + int(c.r, 20, 300) * DAY)])),
	exportInvoicesShifted: (c) =>
		csv(['invoice_id', 'account_id', 'issued_on', 'due_on', 'net', 'discount', 'vat', 'total', 'currency', 'status'], c.near.slice(0, 5).map((cust, k) => {
			const net = cust.monthly;
			const discount = k % 2 === 1 ? round2(net * 0.1) : 0;
			return [invoiceNumber(c.date, k * 3 + 2), cust.id, iso(c.date), iso(c.date + 30 * DAY), plain(net), plain(discount), plain(round2((net - discount) * 0.2)), plain(round2((net - discount) * 1.2)), 'GBP', 'issued'];
		})),
	totalsShifted: (c) =>
		psql(`select invoice_id, net, vat, total from billing.invoices where issued_on = '${iso(c.date)}' order by invoice_id limit 5;`, ['invoice_id', 'net', 'vat', 'total'], c.near.slice(0, 5).map((cust, k) => {
			const discount = k % 2 === 1 ? round2(cust.monthly * 0.1) : 0;
			return [invoiceNumber(c.date, k * 3 + 2), plain(cust.monthly), plain(discount), plain(round2((cust.monthly - discount) * 0.2))];
		})),
	draftInvoices: (c) => {
		const issued = 4100 + int(c.r, 0, 200);
		return psql(`select status, count(*), count(total) as with_total from billing.invoices where issued_on >= '${c.v.monthEnd}' group by 1 order by 1;`, ['status', 'count', 'with_total'], [['draft', c.n, 0], ['issued', issued, issued], ['pro-forma', int(c.r, 2, 9), 0]]);
	},
	contactCounts: (c) => table(['', 'Contacts'], [['CRM, Contacts page', c.v.crmPage!], ['Warehouse, crm.contacts', c.v.whContacts!]], [1]),
	contactsRun: (c) => {
		const file = `contacts_${compact(c.weekly)}.csv`;
		const all = 11700 + Math.floor(c.weekly / DAY) * 6;
		return block([`$ wc -l exports/crm/${file}`, `${all + 1} exports/crm/${file}`, `$ grep -A2 'crm/contacts' /etc/weekly-load/files.conf`, 'crm/contacts:', '    key: account_id', '    table: crm.contacts', `$ python -m csvtool clean exports/crm/${file} /tmp/contacts.csv --key contact_id`, `Wrote ${all} rows to /tmp/contacts.csv`]);
	},
	garbledAmp: (c) => psql(`select id, customer from crm.accounts where customer like '%&amp;%' or customer like '%&#39;%' order by 1 limit 6;`, ['id', 'customer'], escapedNames.map((cust) => [cust.id, cust.name.replaceAll('&', '&amp;')]).concat([[`c-${int(c.r, 2000, 4800)}`, 'O&#39;Connell Electrical']]).slice(0, 6)),
	garbledMojibake: (c) => psql(`select id, customer from billing.accounts where customer like '%Ã%' order by 1;`, ['id', 'customer'], accentNames.map((cust) => [cust.id, mojibake(cust.name)]).concat([[`c-${int(c.r, 2000, 4800)}`, mojibake('Zoë Hart Ceramics')]])),
	subscriptions: (c) => table(['Subscription', 'Dashboard', 'Schedule', 'Recipients', 'Last sent'], [['Weekly figures', 'Board pack', 'Mon 07:30', c.v.listName!, iso(lastWeekday(c.now, 1))], ['Collections weekly', 'Collections', 'Mon 08:00', 'ar@', iso(lastWeekday(c.now, 1))], ['Renewals digest', 'Renewals', 'Fri 16:00', 'sales-managers@', iso(lastWeekday(c.now, 5))]]),
	boardCounts: (c) => table(['Pack', 'Active customers', 'Taken on'], [[c.v.month2!, grouped(4021 + c.n), `${iso(firstWorkday(c.open, 1))} 09:10`], [c.v.month!, grouped(4021 + c.n + int(c.r, 60, 120)), `${iso(firstWorkday(c.open, 0))} 08:45`]], [1]),
	dealList: (c) => table(['Deal', 'Customer', 'Stage', 'Value', 'Closed'], c.near.slice(0, int(c.r, 5, 8)).map((cust, k) => [`D-${int(c.r, 7100, 7900)}`, cust.name, c.v.stagePaste === 'po' && k % 3 === 1 ? 'Closed Won – awaiting PO' : 'Closed Won', money(cust.monthly * 12), iso(c.date - k * 3 * DAY)]), [3]),
	stageCounts: (c) => psql(`select stage, count(*) from crm.deals where closed_on >= '${c.v.monthStart}' group by 1 order by 1;`, ['stage', 'count'], [['Closed Lost', int(c.r, 14, 30)], ['Closed Won', int(c.r, 40, 70)], ['Negotiation', int(c.r, 10, 25)], ['Proposal', int(c.r, 20, 40)]]),
	segmentCounts: (c) => table(['Plan', ...regionNames], plans.map((plan) => [plan, ...regionNames.map((region) => int(c.r, 60, region === 'Scotland' || region === 'Wales' ? 160 : 420))]), [1, 2, 3, 4, 5, 6]),
	dupInvoices: (c) => psql(`select invoice_id, count(*) from billing.invoices where issued_on = '${iso(c.date)}' group by 1 having count(*) > 1 order by 1 limit 6;`, ['invoice_id', 'count'], Array.from({ length: 6 }, (_, k) => [invoiceNumber(c.date, k * 5 + 1), 2])),
	reissued: (c) => table(['Invoice', 'Issued', 'Total', 'Status'], [[c.v.inv!, iso(c.date - 2 * DAY), money(round2(c.cust.monthly * 1.2 + 18)), 'credited'], [`${c.v.inv}-R`, iso(c.date), money(round2(c.cust.monthly * 1.2)), 'open']], [2]),
	currencyTotals: (c) => psql(`select currency, count(*), sum(total) from billing.invoices where issued_on >= '${c.v.monthStart}' and issued_on < '${c.v.monthEnd}' group by 1 order by 1;`, ['currency', 'count', 'sum'], [['EUR', int(c.r, 120, 190), plain(round2(c.diff * 7.4))], ['GBP', int(c.r, 4000, 4200), plain(round2(c.ledger))]]),
	blankCurrency: (c) => psql(`select currency, count(*) from billing.invoices where account_id in (select id from billing.accounts where country = 'IE') group by 1 order by 1;`, ['currency', 'count'], [['', c.n * 9], ['EUR', int(c.r, 300, 900)]]),
	regionRows: (c) => table(['Account', 'Postcode', 'Region on dashboard', 'Expected'], [[c.cust.name, c.cust.postcode, c.v.regionShown!, c.cust.region], ...c.near.slice(0, 3).map((cust, k) => [cust.name, cust.postcode, k < 2 ? 'Unknown' : cust.region, cust.region])]),
	priceCheck: (c) => psql(`select id, customer, plan, monthly_price, contract from reporting.account_prices where monthly_price in (49, 129, 249) order by 1 limit 6;`, ['id', 'customer', 'plan', 'monthly_price', 'contract'], c.near.slice(0, 6).map((cust) => [cust.id, cust.name, cust.plan, plain(prices[cust.plan]![0]), c.v.priceKind === 'fixed' ? 'fixed 24m' : 'rolling, legacy list'])),
	testAccounts: (c) => psql(`select id, customer, created_at, total from billing.accounts where customer ilike '%test%' or customer ilike '%demo%' or customer ilike '%training%';`, ['id', 'customer', 'created_at', 'total'], [['c-3990', 'Larkfield Test Ltd', '2024-02-12', plain(c.diff)], ['c-4012', 'TRAINING - do not invoice', '2025-06-03', plain(round2(c.diff / 3))], ['c-4377', 'Larkfield Demo Account', '2026-01-19', plain(round2(c.diff / 5))]]),
	renewalBlank: (c) => psql(`select id, customer, owner, created_at, renewal_on from crm.accounts where renewal_on is null order by created_at limit 6;`, ['id', 'customer', 'owner', 'created_at', 'renewal_on'], c.near.slice(0, 6).map((cust) => [cust.id, cust.name, cust.owner, cust.created || `2022-0${int(c.r, 1, 9)}-14`, ''])),
	balanceRows: (c) => table(['Account', 'Invoiced', 'Paid', 'Credit notes', 'Balance'], [[c.cust.name, money(c.count * c.cust.monthly * 1.2), money((c.count + 1) * c.cust.monthly * 1.2), money(0), money(-c.cust.monthly * 1.2)]], [1, 2, 3, 4]),
	excelView: (c) => table(['A', 'B', 'C', 'D'], [['id', 'customer', 'created_at', 'total'], ...c.near.slice(0, 4).map((cust) => [cust.id, cust.name, cust.created ? `${cust.created.slice(8)}/${cust.created.slice(5, 7)}/${cust.created.slice(0, 4)}` : '', String(cust.monthly * 1.2)])])
};

// Shared parts.
const greetings = ['Hi data desk,', 'Hi all,', 'Morning,', 'Hello,', 'Hi both,', 'Afternoon all,'];
const contexts = [
	'I’m covering for {colleague} this week, so apologies if this has already come up.',
	'We close the month on {day}, so I’m checking everything twice.',
	'I may well be missing something obvious, so apologies in advance.',
	'This came up in the Monday meeting and I said I’d find out.',
	'Not urgent today, but I’d like to understand it before the quarter closes.',
	'I tried to work this out myself first but I’ve gone round in circles.'
];
const askerSign = ['{first}', 'Thanks,\n{first}', 'Cheers,\n{first}', 'Many thanks,\n{full}\n{Role}, Larkfield', 'Thanks\n{first}\n\nSent from my phone', 'Thanks in advance,\n{first}'];
const askerShortSign = ['{first}', 'Thanks, {first}', 'Cheers, {first}', 'Thanks\n{first}'];
const deskSign = ['{desk}', 'Thanks,\n{desk}', '{desk}\nData desk'];
const evidence = ['For reference, this is what I found:', 'Here’s the query and what it returned, in case it’s useful:', 'What I was looking at, if you want to see it:', 'For the record:'];
const closings = ['Shout if anything looks off.', 'Let me know if you see anything else odd.', 'Happy to go through it on a call if that’s easier.', 'Any questions, just reply here.'];
const acks = ['Thanks, {first}.', 'Thanks for flagging this.', 'Thanks for the detail.', 'Thanks for raising it.'];
const plans2 = ['Leave it with me.', 'I’ll trace it through and come back to you.', 'I’ll dig in later today.', 'I’ll take a look as soon as I can.'];
const chasers = ['Any news on this one?', 'Sorry to chase, but I need this fairly soon.', 'Just checking this hasn’t got lost. No rush if it’s in hand.', 'Hi, any update? I’ve been asked about it again.', 'Bumping this one, sorry.'];
const holding = ['I’ve asked {team} to take a look, and I’ll come back to you as soon as I hear.', 'Still on this. I need {team} to check something on their side, and I’ll update you when they have.', 'Not forgotten. I’m waiting to hear from {team} and I’ll be back in touch.'];
const firstLooks: Record<string, [string[], string]> = {
	load: [['Last night’s load ran clean: every file fetched, cleaned and loaded, with row counts in line with the rest of the week.', 'Started with last night’s load. Nothing failed and nothing was skipped.', 'Load log for last night first, in case something fell over. It didn’t.'], 'loadLast'],
	refresh: [['Dashboards refreshed at 06:00 as usual, and every reporting view rebuilt without errors.', 'Checked this morning’s refresh: on time, no failed views.', 'Reporting views all rebuilt this morning; nothing stale.'], 'refreshTimes'],
	counts: [['Rows loaded over the last five nights look normal for the time of month.', 'Nightly row counts for the past week, for comparison. Nothing out of line.'], 'countsWeek']
};
interface Tangent {
	q: string;
	a: string;
	then?: string;
}
const tangents: Tangent[] = [
	{ q: 'Separate thing: is there a list somewhere of what each column in the warehouse means?', a: 'On the columns: there’s a data dictionary on the ops wiki under Warehouse, then Tables. It covers billing.* and crm.* in full; the reporting views are thinner, and Kofi is filling those in.', then: 'Found the data dictionary, thanks.' },
	{ q: 'Also, could I be added to the weekly figures email?', a: 'I’ve added you to the weekly figures email. The next one goes out on Monday at 07:30.', then: 'And the weekly email arrived, thank you.' },
	{ q: 'Unrelated: I couldn’t get into the dashboards one Sunday morning recently. Is that expected?', a: 'On the Sunday: if it was the first Sunday of the month, yes. The warehouse is patched then between 07:00 and 09:00, and the dashboards are unavailable while it is.' },
	{ q: 'While I have you, can the Collections dashboard be filtered by account manager?', a: 'Collections does have an owner filter. It’s under “More filters” at the top right, collapsed by default.', then: 'Found the owner filter too, that’s a big help.' },
	{ q: 'One more: when is the warehouse refreshed? I can never remember whether it’s overnight or hourly.', a: 'The warehouse is loaded once a night: the exports are fetched from 02:00 and the dashboards refresh at 06:00, so anything entered today shows tomorrow morning.' },
	{ q: 'Is it all right to share a dashboard link with a customer? One has asked for their usage figures.', a: 'Please don’t share dashboard links outside Larkfield: the dashboards show every customer. If a customer needs figures, send them an export of their own rows and nothing else.' },
	{ q: 'Could I get the Renewals dashboard as a spreadsheet every Monday?', a: 'You can set that up yourself: the bell icon on any dashboard sends you an export on the day and time you choose.', then: 'Subscribed to Renewals, thanks for the tip.' },
	{ q: 'Who do I ask about changing a customer’s billing address? Billing won’t let me.', a: 'Address changes in billing are done by finance systems: Martin, or anyone on the finance systems inbox.' },
	{ q: 'The Accounts dashboard has a tile called “MRR (adj.)”. What’s adjusted about it?', a: 'On “MRR (adj.)”: it leaves out one-off charges and credit notes for disputes, so it shows recurring revenue only. The info icon on the tile says the same.' },
	{ q: 'By the way, my dashboard login keeps signing me out after an hour.', a: 'The dashboards sign you out after an hour without activity. That’s an IT policy for every system with customer data, so I can’t change it for one person, sorry.' },
	{ q: 'Last thing: is there somewhere I can try things out without breaking the shared dashboards?', a: 'There’s a collection called Scratch where anyone can save their own questions and charts. The shared dashboards are read-only for most people, so you can’t break them anyway.', then: 'I’ve started playing in Scratch already.' },
	{ q: 'Do you know when this month’s invoices will be final? Finance mentioned a rerun.', a: 'Finance close each month on the fourth working day; after the next morning’s load that month’s invoices don’t change.' }
];

// Topics. A question follows one path of one topic. Nothing about the topic, the cause or the outcome is written
// into the file except through the messages themselves.
type Who = 'a' | 'd' | 'n' | 'l' | 'b' | 'f' | 's' | 'i' | 'p' | 'r' | 'm' | 'x';
type Msg = [Who, string];
interface Path {
	detail: string[];
	paste?: string;
	look: string[];
	lookPaste?: string;
	extra?: string;
	ends: Msg[][];
	/** Whom the desk waits on, if it sends a holding reply. */
	team?: string;
	/** Values this path fixes, filled like the messages. */
	set?: Record<string, string>;
	/** The invoices the question is about were raised on the day it was asked. */
	today?: boolean;
	/** The day the question is about is this many working days before it was asked. */
	back?: number;
}
interface Topic {
	/** The earliest day a question on this topic can be opened, as YYYY-MM-DD. */
	since?: string;
	/** What the desk may check first, before it finds the cause: keys of `firstLooks`. */
	checks?: string[];
	/** Why the asker needs it: an extra paragraph of the question. */
	why?: string[];
	/** A message the asker forwards: [introduction, quoted text, first name of its sender if a colleague]. */
	forwards?: [string, string, string?][];
	/** A follow-up the asker may raise once the main matter is settled, with the desk's answer. */
	after?: [string, string][];
	from: string[];
	shows?: string;
	subjects: string[];
	open: string[];
	more: string[];
	ask: string[];
	paths: Path[];
}

const topics: Topic[] = [
	// 1. Revenue and the ledger.
	{
		from: ['finance', 'finance', 'leadership'],
		forwards: [['From Simon this morning:', 'The revenue line in the draft pack doesn’t match what we closed for {month}. Can you get to the bottom of it before the review? I don’t want to explain a difference to the board that turns out to be a reporting quirk.', 'Simon']],
		checks: ['load', 'refresh'],
		why: ['The pack goes to the leadership team first and then to the board, and the revenue chart is the first page. If the dashboard is wrong, so is the chart, and so is the revenue per customer figure on page three.', 'We’re also about to start using the dashboard for the monthly forecast, so I want to be sure it agrees with the ledger before anyone relies on it.'],
		after: [['While you’re here: when the ledger and the dashboard do agree, is there anything else I should check before I use the dashboard’s monthly figures in the pack?', 'The two things worth a glance are the refresh time at the bottom of the dashboard, which should be 06:00 that morning, and whether finance has closed the month, which happens on the fourth working day. After both, the monthly figures don’t move.'], ['Is there a way to see revenue by plan as well as the total? The board asked last time.', 'The table under the tile can be grouped by plan: click the “Group by” control at its top left. It uses the same view as the tile, so the totals agree.']],
		shows: 'revenueMonths',
		subjects: ['Revenue dashboard vs ledger for {month}', '{month} revenue doesn’t tie', 'Revenue for {month} looks low', 'Difference between the revenue tile and the ledger'],
		open: [
			'I’m putting the {month} management pack together and the Revenue dashboard shows {dashRev} for the month, while the ledger has {ledgerRev}. That’s {diff} out, which is too much to wave through. Can you tell me which one is right? I’ve assumed the ledger, because that’s what the auditors look at, but the pack uses the dashboard’s charts.',
			'Hopefully a quick one. Revenue for {month} on the dashboard is {diff} lower than what finance has closed in the ledger. {month2} agreed to the penny, so something is different between the two months. Is the warehouse missing something?',
			'The board pack goes out on {day} and the revenue line doesn’t agree with the ledger for {month}. I’d rather not put a footnote on it if there’s a simple explanation.'
		],
		more: ['If it’s a known thing, just tell me which number to use and I’ll stop worrying.', 'Simon will ask about it at the review on {day}, so I’d like to understand it before then.', 'I’ve checked the ledger side twice and I’m confident in it.'],
		ask: ['Which part of the dashboard are you reading: the monthly tile at the top, or the table underneath? And is your ledger figure by invoice date and net of credit notes?', 'Happy to dig in. So that I compare like with like: is the ledger number by invoice date, and does it include credit notes raised in the month? And did you take the dashboard figure today or earlier in the week?'],
		paths: [
			{
				detail: ['It’s the tile at the top, and yes, the ledger is by invoice date and net of credit notes. We raised quite a few credit notes in {month} for customers who were billed twice for an add-on, if that helps.', 'Monthly tile, taken this morning. The ledger is by invoice date and net of credit notes, which is how we always report it.'],
				look: ['Billing has {n} credit notes dated in {month}, totalling {diff}, and every one of them is in billing.credit_notes. reporting.revenue_monthly reads billing.invoices only, so they are never subtracted. The difference matches to the penny. Earlier months had a handful of small credit notes each, which is why nobody noticed.'],
				lookPaste: 'creditNotes',
				team: 'Kofi in BI',
				ends: [
					[['b', 'Kofi here. Confirmed: the revenue view sums invoices and nothing else. I’ve made reporting.revenue_monthly subtract credit notes in the month they’re dated, and refreshed the dashboard. {month} shows {ledgerRev}, and the months before it moved by a few hundred pounds each, all within pennies of the ledger.'], ['a', 'That ties. Thank you both. I’ll say in the pack that the earlier months were restated slightly.']],
					[['d', 'Found it: the dashboard’s revenue view doesn’t subtract credit notes, and {month} had {n} of them, totalling exactly {diff}. Kofi has corrected the view, and the tile matches the ledger. The earlier months moved slightly for the same reason; none by more than a few hundred pounds.'], ['a', 'Perfect, it matches. Thanks for sorting it so quickly.']]
				]
			},
			{
				detail: ['The tile, which I looked at on the 1st. The ledger includes {n} invoices that finance raised on the 1st and dated back to the last day of {month}, in case that matters.'],
				look: ['The {n} invoices dated back to the end of {month} were created in billing on the morning of the 1st, after that night’s export, and arrived with the next night’s load. {first} read the tile on the 1st, before they were in. Today the tile and the ledger agree.'],
				lookPaste: 'loadLogSecond',
				ends: [[['d', 'Nothing is missing: it’s timing. The invoices dated back to {month} were raised on the morning of the 1st, after that night’s export had run, so they reached the warehouse with the following night’s load. The tile shows {ledgerRev} for {month} today, the same as the ledger. At month end the figures are complete from the morning of the 2nd.'], ['a', 'Ah, that makes sense, and it matches today. I’ll take the figures on the 2nd in future.']]]
			},
			{
				detail: ['Tile at the top. The ledger is by invoice date and net of credit notes. The odd thing is that when I break it down by week, the whole difference sits in one week.'],
				look: ['billing.invoices has nothing issued on {date}. The load log for that night shows the clean stopping on a bad date and the invoices load being skipped. Finance systems re-exported that day’s file by hand after the billing outage, and the dates in it are dd/mm/yyyy. The next night’s file only held the next day’s invoices, so {dayOf} has been missing ever since.'],
				lookPaste: 'loadLogFail',
				team: 'finance systems',
				ends: [[['f', 'Martin here. Yes, that was the manual export after the outage on {dateShort}. I opened it in Excel to check it and saved it, which rewrote the dates. Sorry. There’s a fresh export from billing on the SFTP drop, untouched.'], ['d', 'Thanks, Martin. I’ve loaded {dayOf} from the fresh file: {n} invoices in. {first}, the tile shows {ledgerRev} for {month}, matching the ledger. The gap was one day of invoices that never reached the warehouse.'], ['a', 'Brilliant, it ties out. Thanks for the quick turnaround.']]]
			}
		]
	},
	// 2. One customer twice on the renewals list.
	{
		from: ['success', 'success', 'accountManagers'],
		checks: ['load', 'refresh'],
		why: ['We’re trying to call every customer at least six weeks before renewal this year, so the list is my work plan for the next month.', 'The renewal value for the quarter goes into the forecast Liam sends to Catherine, and I’d hate it to be inflated by one customer.'],
		after: [['Can the Renewals dashboard show the date of the last renewal call? It would save me keeping a separate sheet.', 'Not yet: renewal calls are logged as activities in the CRM, and activities aren’t in the warehouse. If you log them with the “Renewal call” type, we can add a last-call date once activities are exported. I’ve noted it as a request.']],
		shows: 'renewalDup',
		subjects: ['{acct} twice on the renewals list', 'Duplicate on the Renewals dashboard', 'Why is {acct} listed twice?', 'Renewals for {renewMonth}: one customer showing twice'],
		open: [
			'The Renewals dashboard lists {acct} twice for {renewMonth}, with the same renewal date. I nearly booked two renewal calls with them. Is the dashboard double counting? If it is, our renewal value for the quarter is overstated as well.',
			'Going through my renewals for next quarter, and {acct} is on there twice. I don’t want to chase a customer twice, and I definitely don’t want to send them two renewal quotes. Can you check which one is real?',
			'Small thing but it’s bugging me: {acct} appears twice on the renewals list for {renewMonth}. Everyone else appears once.'
		],
		more: ['I’ve pasted the rows around it.', 'Renewal calls for {renewMonth} start next week.', 'Liam uses the quarter total in his forecast, so I thought I’d better ask.'],
		ask: ['Are the two lines identical, or do the ids, owners or plans differ? I’ll check them against the CRM.', 'Could you tell me the ids on the two lines? That tells me whether it’s two accounts or one account counted twice.'],
		paths: [
			{
				detail: ['Different ids: {id} and {dupId}. Same plan and the same owner, as far as I can see.'],
				look: ['{id} and {dupId} are separate CRM accounts with separate contracts and invoices: one for the main premises and one for the second site that opened in the spring. Billing has them as two accounts with different billing addresses. Not a duplicate.'],
				lookPaste: 'twoAccountsInvoices',
				set: { dupOwner: '{owner}' },
				ends: [[['d', 'They’re two genuine accounts: {acct} has a second site with its own contract, invoices and billing address, and both renew in {renewMonth}. The dashboard lists them separately because they are separate. The site address is in the account name in billing but not in the CRM; Sana can add it there if you want them easier to tell apart.'], ['a', 'Ah, of course, the new site. I’ll ask Sana to rename them. Thanks!']]]
			},
			{
				detail: ['Same id on both lines, {id}. The only difference is the owner: one line says {owner}, the other {owner2}.'],
				look: ['{id} appears twice in reporting.renewals because reporting.account_owner has two open rows for it: the reassignment from {owner2} to {owner} on {dateShort} added a new row and left the old one open. {n} other accounts have the same overlap.'],
				lookPaste: 'ownerRows',
				team: 'Kofi in BI',
				set: { dupId: '{id}', dupOwner: '{owner2}' },
				ends: [[['b', 'My view, sorry. The owner table keeps every assignment, and the renewals view joins to all of them without checking dates. I’ve restricted it to the current assignment and refreshed. {acct} appears once, under {owner}. The quarter’s renewal value dropped by {renewalDrop}, which was the double counting.'], ['d', '{first}, it was the renewals view, not the CRM. {acct} appears once, under {owner}, and the quarter’s renewal value has come down by {renewalDrop}, because {n} other accounts were being counted twice as well.'], ['a', 'Thank you. I’ll let Liam know the renewals number has moved.']]]
			},
			{
				detail: ['Two ids: {id} and {dupId}. {dupId} has no invoices that I can see, and I don’t recognise it.'],
				look: ['{dupId} was created in the CRM on {dateShort} by {owner2}, with the same name and postcode as {id}. No contract and no invoices, but the renewal date was copied across. Looks like a duplicate made while logging a call. It has to be merged in the CRM; we can’t fix it downstream.'],
				lookPaste: 'twoAccounts',
				team: 'sales operations',
				set: { dupOwner: '{owner}' },
				ends: [[['d', 'It’s a duplicate in the CRM: {dupId} was created on {dateShort} with the same details, probably while someone logged a call, and it carries a copy of the renewal date. I’ve asked Sana to merge it into {id}. Once she has, the next night’s load drops it from the dashboard.'], ['s', 'Sana here. I’ll merge it, but the merge moves activities across as well, and I want to check with {owner2} first that nothing on {dupId} needs keeping. It will be next week.'], ['a', 'No problem, thanks both. I’ll ignore the second line until then.']]]
			}
		]
	},
	// 3. Invoices missing for one customer.
	{
		from: ['receivables', 'finance', 'sales'],
		forwards: [['This is what they sent:', 'Hello, we have received a statement showing {amount} outstanding, but by our records we have paid everything up to last month. Could you send us a list of the invoices you think are unpaid, with dates? Our accountant needs it before our year end.\n\nKind regards\nAccounts, {acct}'], ['Their email, for context:', 'Hi, your statement doesn’t include the two invoices we received recently, so we don’t know whether they’ve been cancelled or whether the statement is out of date. Please confirm what we owe before we pay anything else.\n\nThanks\n{acct}']],
		checks: ['load'],
		why: ['The customer is disputing what they owe, and I want to send them a full list of what we’ve invoiced this year, with dates and amounts.', 'I build my statement runs from the warehouse because billing can only print one account at a time.'],
		after: [['Is there a quick way for me to check that an invoice has reached the warehouse, without asking you?', 'The Collections dashboard has a search box at the top that takes an invoice number. If it finds nothing, the invoice either was raised today or hasn’t been loaded; if it was raised before today, that’s the moment to ask us.']],
		shows: 'billingScreen',
		subjects: ['Missing invoices for {acct}', '{acct} invoices not in the warehouse', 'Invoices not showing on Collections', 'Can’t find two invoices'],
		open: [
			'A customer, {acct}, has queried their statement and I wanted to check what we’ve invoiced them. Billing shows {count} invoices, but the warehouse only has {fewer}. Is the load missing some? I use the warehouse because billing won’t filter by date range.',
			'I can’t find {acct}’s two most recent invoices anywhere on the Collections dashboard. Billing definitely has them: I can see them on screen. Has something broken?',
			'Is the invoices table complete? {acct} is asking about two invoices and I can only see the older ones in the warehouse. Here’s what billing shows.'
		],
		more: ['They’re waiting for an answer, so anything you can find would help.', 'I don’t know whether it’s just them or a wider problem.', 'If the table is incomplete I need to know before I send statements on {day}.'],
		ask: ['Which invoice numbers can you see in billing but not on the dashboard, and roughly when were they raised?', 'Could you send me the invoice numbers that are missing? I’ll trace them through the load.'],
		paths: [
			{
				detail: ['The ones missing are {inv} and {inv2}, both raised in the last few weeks. Now I look, they have a different letterhead from the others.'],
				look: ['{inv} and {inv2} belong to Larkfield Connect Ltd, the second billing entity set up in the summer for the connectivity contracts. The nightly export from billing covers the main entity only. {n} invoices on Connect so far, none of them in the warehouse.'],
				lookPaste: 'entityRows',
				team: 'finance systems',
				ends: [[['f', 'Martin here. Right: the export job is set up per entity, and nobody added the new one. I can add it, but the file comes out with a different column order because Connect uses the newer invoice template. I’ll send a sample first so you can set up the load.'], ['d', '{first}, they’re on Larkfield Connect, the second billing entity, whose invoices aren’t exported to the warehouse yet. Martin is setting up the export, and once the load is mapped they’ll appear. Until then billing is the only place to see them, sorry.'], ['f', 'Sample is on the shared drive. To run it nightly I need a slot with the billing vendor, and the first they’ve offered is the week after next.']]]
			},
			{
				detail: ['{inv} and {inv2}. They were both raised this morning, I think.'],
				look: ['Both invoices were raised in billing this morning. Tonight’s export brings them in; Collections refreshes at 06:00 from the night’s load, so it can’t show anything raised during the day. Nothing missing from the earlier months.'],
				today: true,
				ends: [[['d', 'Nothing is missing: the warehouse is loaded once a night, so an invoice raised today appears tomorrow morning. {inv} and {inv2} will be on Collections after tonight’s load, and the older ones are all there. For anything same-day, billing is the place to look.'], ['a', 'That’s fine. I didn’t realise it was overnight only. Thanks!']]]
			},
			{
				detail: ['The missing ones are {inv} and {inv2}. Both dated {dayOf}.'],
				look: ['The invoices file for {dayOf} is short. The SFTP transfer from billing that night ended early, and the file stops part way through a row. The clean padded that last row and the load took what was there: about a third of the day’s invoices. Fetched the file again from billing: full row count.'],
				lookPaste: 'loadLogShort',
				ends: [[['d', 'The invoices file for {dayOf} arrived cut off: the transfer from billing ended early, so the warehouse got only the first part of the day. I’ve fetched it again and reloaded that day, and {acct}’s invoices are there. I’ve asked Martin whether the export can write a row count we can check against.'], ['f', 'Done: from tonight the export writes a .count file beside each CSV.'], ['a', 'Thanks, I can see them now.']]]
			}
		]
	},
	// 4. The overdue list shows invoices that were paid.
	{
		from: ['receivables'],
		forwards: [['What they wrote back:', 'We paid {inv} by bank transfer and have the remittance to prove it. This is the second reminder we’ve had this year for something already paid. Please check before sending these.\n\nOffice manager, {acct}'], ['Their reply to the reminder:', 'Your reminder says {inv} is overdue. Our bank shows the payment leaving our account. Can you look into it? We’d rather not be chased for things we’ve paid.\n\n{acct}']],
		checks: ['load', 'counts'],
		why: ['Every reminder that goes to a customer who has already paid costs us goodwill, and two customers complained last month.', 'Rhys and I split the list by customer name, so if it is wrong we both chase the wrong people.'],
		after: [['Could Collections show the date a payment was received, as well as the invoice? It would help when customers say they paid.', 'Kofi says he can add the payment date and method as columns on Collections; he’ll do it in the next round of dashboard changes, which is usually the first week of the month.']],
		shows: 'overdueList',
		subjects: ['Collections list shows paid invoices', '{acct} chased for an invoice they paid', 'Overdue report wrong?', 'Before I send reminders'],
		open: [
			'{acct} rang me quite annoyed because we sent them a reminder for {inv}, which they say they paid on {dateShort}. The Collections dashboard still shows it as {days} days overdue. If the dashboard is wrong, the {n} reminders I’m about to send might be wrong too.',
			'Before I send this week’s reminders: a few of the invoices on the overdue list I’m fairly sure have been paid, {inv} for one. Can you check the list is up to date?',
			'Our overdue figure looks higher than it should for the time of year. {acct} for example shows {days} days overdue, and I’m sure they pay by direct transfer every month.'
		],
		more: ['I hold the reminders until I hear from you.', 'Reminders go out on {day}.', 'Helen wants the overdue total for the month-end pack as well.'],
		ask: ['Do you know how {acct} paid, and does billing itself show {inv} as paid?', 'Could you check {inv} in billing and tell me what it shows there? If billing has it as paid and we don’t, it’s on our side.'],
		paths: [
			{
				detail: ['Billing shows it paid on {paidDay}, by bank transfer.'],
				set: { paidDay: '{yesterday}', paidIso: '{yesterdayIso}' },
				look: ['The payment for {inv} reached the bank on {paidDay} but was matched in billing the next morning, after that night’s export. It arrived with the following load and Collections shows it paid today. Bank transfers are always matched a day after they land, so a list taken first thing always includes the previous day’s transfers.'],
				lookPaste: 'paymentsMatched',
				ends: [[['d', 'Nothing is wrong with the list, but it is a day behind for bank transfers: finance match them in billing the morning after they land, and the warehouse picks them up the night after that. {inv} shows paid today. Before sending reminders, it’s worth checking billing for anything paid in the last two days.'], ['a', 'Good to know. I’ll check billing for the last two days before each run. Thanks.']]]
			},
			{
				detail: ['Billing shows it paid, but as part of one payment that covered three invoices. They paid {amount} in one go.'],
				look: ['No payment rows for {inv} in billing.payments. The billing export writes payments with a single invoice reference, and a payment allocated across several invoices is left out of the file altogether. {n} such payments since the start of {month2}, so their invoices stay open in the warehouse.'],
				lookPaste: 'payments',
				team: 'finance systems',
				ends: [[['d', 'It’s the billing export: a payment that covers several invoices isn’t written to the file at all, so those invoices stay open in the warehouse. {n} payments are affected since {month2}. I’ve asked Martin whether the export can write one row per allocation. Until then, please check billing for anything on the list from customers who pay several invoices at once.'], ['f', 'Martin here. The payments export is a vendor report and I can’t change its query myself. I’ve raised it with them, and I’ll come back when I have a date.'], ['a', 'OK, thanks both. I’ll check billing by hand for now.']]]
			},
			{
				detail: ['I’m reading it from my own sheet, which I download from the dashboard. I last downloaded it on {dateShort}.'],
				look: ['Collections today shows {inv} as paid on {paidDay}. {first}’s sheet is a download from {dateShort}, before the payment. Nothing wrong with the dashboard.'],
				ends: [[['d', 'The dashboard is right today: {inv} shows paid on {paidDay}. Your sheet is a download from {dateShort}, before that payment arrived. If you download it again on the morning you send reminders, it will be current as of the night before. Or you can subscribe to Collections and have a fresh copy sent each Monday.'], ['a', 'Oh, my fault entirely. I’ll set up the subscription. Thanks!']]]
			}
		]
	},
	// 5. Owner not updated after a reassignment.
	{
		from: ['accountManagers'],
		checks: ['load', 'refresh'],
		why: ['Commission is paid on the accounts you own, and Liam signs it off from the dashboard, so it matters which name is on them.', 'I also use the dashboard to plan my account reviews, and at the moment half my book is missing from it.'],
		after: [['Does the owner change also affect the Renewals dashboard, or only Sales performance?', 'Renewals reads the current owner from the same CRM table, so it follows the CRM as soon as the warehouse has the change. Only the commission figures use the owner on the 1st of the month.']],
		shows: 'ownerList',
		subjects: ['My accounts still under {leaver}', 'Owner not updated on the Sales dashboard', 'Account reassignment not showing', 'Commission report shows the wrong owner'],
		open: [
			'{n} accounts were reassigned to me from {leaver} in the CRM on {dateShort}, when {leaver} moved to the partnerships team, but the Sales performance dashboard doesn’t credit me with them. That matters, because it feeds the commission report. The CRM shows me as owner on all of them.',
			'Quick one: the accounts I took over from {leaver} aren’t counted under my name on the Sales performance dashboard. The CRM is right. Is the warehouse behind?',
			'The Sales performance dashboard is wrong for a batch of accounts that moved to me on {dateShort}. They still count for someone else.'
		],
		more: ['A few of them are below, from a query Kofi showed me.', 'Liam signs off commission on {day}.', 'I don’t mind which month they count in, I just want it right.'],
		ask: ['Can you send me a couple of the account ids, and say how the reassignment was done: one by one, or in bulk by sales ops?', 'Was the reassignment done by you, account by account, or by Sana in bulk?'],
		paths: [
			{
				detail: ['Sana did them in bulk. {id} is one of them.'],
				look: ['crm.accounts.owner holds {leaver} for all {n}. The CRM export takes the owner column from the “original owner” field, not the current owner. A bulk reassignment changes the current owner only, so the export never sees it. One-by-one reassignments update both, which is why this hasn’t shown before.'],
				lookPaste: 'exportOwners',
				team: 'sales operations',
				ends: [[['s', 'Sana here. The export template was mapped to the wrong field when the CRM was set up, it seems. I’ve pointed it at the current owner, and tonight’s export will carry the right names.'], ['d', '{first}, it was the CRM export, which picked up the original owner rather than the current one. Sana has corrected it, and from tomorrow morning the dashboard shows you as owner on all {n}. The commission report reads the same table, so it follows.'], ['a', 'Great, I can see them under my name now. Thanks.']]]
			},
			{
				detail: ['I did them myself yesterday, account by account.'],
				back: 1,
				set: { ownerShown: '{full}' },
				look: ['The CRM export has {first} as owner for all {n}, and crm.accounts agrees. The Sales performance dashboard credits owners as at the 1st of the month, as agreed with finance for commission; reporting.commission_owner is a snapshot taken on the 1st. They move to {first} on the 1st of next month.'],
				ends: [[['d', 'The warehouse is up to date: crm.accounts has you as owner. The Sales performance dashboard credits each account to its owner on the 1st of the month, which is how finance and sales agreed to calculate commission, so a reassignment made on {dateShort} counts from the 1st of next month. If Liam wants an exception for these {n}, that’s a decision for him and finance rather than a data change.'], ['a', 'Ah, I didn’t know about the 1st-of-the-month rule. That’s fair enough. I’ll mention it to Liam.']]]
			},
			{
				detail: ['Sana did them. One of them is {id}.'],
				set: { ownerShown: '{full}' },
				look: ['crm.accounts shows {full} as owner on all {n}, so the warehouse has the change. But the CRM has two users called {full}: the one {first} uses, and an older one created when {first} joined. The {n} accounts were reassigned to the older user. Both show the same name, which is why it looked right, but the commission report matches owners by email, so they count for the old user.'],
				lookPaste: 'crmUsers',
				team: 'sales operations',
				ends: [[['d', 'The accounts went to the wrong one of your two CRM users: there’s an older user with your name, created when you joined, and the reassignment picked that one. The commission report matches by email, so it can’t credit you. I’ve asked Sana to move them to your current user and close the old one.'], ['s', 'I can move them, but closing a user needs IT, and I want to check nothing else is assigned to it first. I’ll do both together next week.']]]
			}
		]
	},
	// 6. Renewal dates a day out.
	{
		from: ['success', 'sales', 'finance'],
		forwards: [['The customer’s note:', 'Just to let you know that your renewal reminder gives our renewal date as a day before the date in our contract. Not a big deal, but we’d like the paperwork to agree, and our finance director asked me to check which is right.\n\n{acct}']],
		checks: ['load', 'refresh'],
		why: ['Renewal reminders go out automatically sixty days before the renewal date, and a customer has already asked why theirs came early.', 'I’m about to share the calendar with the whole success team, so I want the dates right first.'],
		shows: 'dateCompare',
		subjects: ['Renewal dates a day out', 'Contract dates wrong by one day', 'Dates on the dashboard shifted?', 'Renewal date for {acct}'],
		open: [
			'The renewal dates on the dashboard are a day earlier than in the CRM for some accounts. {acct} renews on {renewIso} in the CRM but the dashboard says the day before. Not all of them, maybe half.',
			'I’ve been building a renewals calendar from the dashboard and a customer pointed out that we’ve got their date wrong by a day. When I checked a few more, several are a day early.',
			'Is there something odd about dates in the warehouse? My renewal reminders went out a day early for a couple of customers.'
		],
		more: ['A few examples below.', 'Not a disaster, but customers notice.', 'I want to fix the calendar before I share it with the team.'],
		ask: ['Which date in the CRM are you comparing with: the renewal date field, or the contract start date?', 'Could you tell me which CRM field you’re reading, and send an account where it’s a day out?'],
		paths: [
			{
				detail: ['The renewal date field. {acct} is one: {renewIso} in the CRM.'],
				look: ['The CRM export writes renewal_on as {renewMinus} for {acct}. The CRM stores dates as midnight local time, and the export converts them to UTC before writing the date, so any date in British Summer Time comes out a day early. Winter dates are right, which is why it’s only some.'],
				lookPaste: 'exportUtc',
				team: 'sales operations',
				ends: [[['s', 'Sana here. Found the setting: the export’s time zone was UTC. I’ve set it to Europe/London, and tonight’s export should have the right dates.'], ['d', '{first}, it was the CRM export: it converted dates to UTC, which moves any date in summer time back a day. Sana has changed the setting, and from tomorrow the dashboard matches the CRM. Dates outside summer time were never affected.'], ['a', 'Brilliant, thank you. I’ll rebuild the calendar tomorrow.']]]
			},
			{
				detail: ['The contract start date, actually. The renewal is a year after it, isn’t it?'],
				look: ['Dashboard renewal = crm.accounts.renewal_on, which is the last day of the contract term. {first} compares with the anniversary of the contract start, which is the day after. Every annual contract will look a day out on that comparison. Nothing wrong.'],
				ends: [[['d', 'The dashboard shows the last day of the contract, which is what the CRM’s renewal date field holds. The anniversary of the start date is the day after that, so against the start date every annual contract looks a day early. For a renewals calendar the renewal date field is the one to use; reminders can go out before the last day.'], ['a', 'That makes sense. I’ll use the renewal date field. Sorry for the false alarm.']]]
			}
		]
	},
	// 7. A jump in churn.
	{
		from: ['leadership', 'success', 'finance'],
		forwards: [['From Catherine:', 'Can someone tell me what happened with churn in {month} before the board? It looks like a step change, and I want to know whether we have a problem in one region or everywhere.', 'Catherine']],
		checks: ['refresh', 'counts'],
		why: ['Churn is one of the three numbers the board looks at every month, next to revenue and new business.', 'If it is real, I need to know which customers so the success team can call them before the end of the quarter.'],
		after: [['Could the Accounts dashboard show churn by region as well? It would have saved us a day.', 'Kofi can add a region breakdown under the churn tile; it’s a small change and should be there by the end of next week.']],
		shows: 'churnMonths',
		subjects: ['Churn spike in {month}?', '{month} churn looks wrong', 'Churn figure for the board', 'Closed accounts in {month}'],
		open: [
			'Churn for {month} on the Accounts dashboard is nearly double the usual. Before I take this to the board I need to know whether it’s real. If it is, I want to know who left and why.',
			'The closed accounts figure for {month} has jumped. We haven’t had a wave of cancellations that I know of, and the team would have told me. Is the dashboard counting something it shouldn’t?',
			'Can you sanity-check {month}’s churn? It looks very high.'
		],
		more: ['The board meets on {day}.', 'I’d like to see the list of closed accounts as well.', 'Nobody on the success team recognises the number.'],
		ask: ['Do you have a sense of which accounts you expected to see? I’ll pull the closed accounts for {month} and see what stands out.', 'I’ll pull the list. Is the board figure taken from the Accounts dashboard tile, or from the monthly table?'],
		paths: [
			{
				detail: ['From the tile. I expected thirty-odd, not this.'],
				look: ['{month}’s closed accounts include a large batch closed with the reason “data cleanup”: sales ops closed dormant and duplicate accounts in the CRM in one go. They had no contract and no invoices. The Accounts dashboard counts every closure as churn.'],
				lookPaste: 'closeReasons',
				team: 'Kofi in BI',
				ends: [[['b', 'Kofi here. I’ve excluded closures with the reason “data cleanup” from the churn measure, since those accounts were never customers. {month}’s churn is back in line with the months before it.'], ['d', 'The extra closures were the CRM tidy-up: Sana’s team closed dormant and duplicate accounts with the reason “data cleanup”, and the dashboard counted them as churn. Kofi has excluded that reason, and {month} looks normal. The real closures are in the attached list if you want to read through them.'], ['a', 'Thank you, that’s a relief. I’ll use the corrected figure.']]]
			},
			{
				detail: ['The monthly table. I was expecting the usual number.'],
				look: ['The extra closures are all accounts that moved plan in {month}: the plan change closes the old subscription and opens a new one, and reporting.account_changes counts the first as a closure and the second as new business. Net effect on the customer count is nil.'],
				lookPaste: 'planChanges',
				team: 'Kofi in BI',
				ends: [[['b', 'Kofi: confirmed. I’ve made the view treat a closure followed by a new subscription for the same account within a day as a plan change, not churn. {month} is back to normal, and new business has dropped by the same number.'], ['d', 'It was plan changes counted as churn and new business at once. Kofi has corrected the view, and both figures for {month} are normal. It started in {month} because that’s when the pricing team moved customers onto the new plans.'], ['a', 'Good, thanks. I’ll take the corrected figure to the board.']]]
			},
			{
				detail: ['From the tile. I’d have guessed thirty or so.'],
				look: ['Went through the closed accounts one by one. All genuine: contract ended, account closed by finance after the last invoice, reasons recorded by the account managers. A cluster from the {region} region with the reason “moved to competitor”. No data problem.'],
				lookPaste: 'closeReasonsReal',
				ends: [[['d', 'I’ve been through every closed account for {month}, and they’re genuine: each had a contract that ended, a final invoice and a reason recorded by its account manager. The jump is mostly in {region}, where a cluster left for a competitor. The list is on the shared drive with the reasons.'], ['a', 'That’s what I was afraid of. Thanks for checking so thoroughly; I’ll take it up with Liam.']]]
			}
		]
	},
	// 8. The VAT return and the warehouse.
	{
		since: '2026-10-01',
		from: ['finance'],
		checks: ['refresh'],
		why: ['We file the return from the ledger, but the auditors asked last year that we reconcile it to an independent source, and the warehouse is the closest thing we have.'],
		shows: 'vatQuarter',
		subjects: ['VAT return vs warehouse', 'Q3 VAT figures differ', 'VAT on the invoices table', 'Box 1 doesn’t match'],
		open: [
			'I’m reconciling the VAT return for the quarter to July–September against the warehouse, and box 1 differs by {diff}. Sales ex VAT agrees, so it’s only the VAT. Which is right?',
			'Before we file: VAT due on sales from the warehouse is {diff} higher than the return. I’d like to understand why before I sign it off.',
			'The VAT figure I get from the invoices table doesn’t match the return. Is there something about how VAT is loaded that I should know?'
		],
		more: ['The return is due on {day}.', 'The difference is small, but I can’t file a return I can’t explain.', 'I used the Revenue dashboard’s VAT column.'],
		ask: ['Did you take the warehouse figure from the dashboard’s VAT column, or sum billing.invoices.vat yourself?', 'Which figure did you use on our side: the dashboard, or a query of your own?'],
		paths: [
			{
				detail: ['I summed the vat column myself, invoice by invoice.'],
				look: ['Billing works out VAT per line and rounds each line. The return works it out on the invoice total. Over the quarter that gives a few pence per invoice; {diff} across all invoices is the right size for it. Nothing wrong with the data.'],
				ends: [[['d', 'Both are right in their own way: billing works out VAT on each line and rounds each one, and the return uses the invoice total, so they differ by a penny or two per invoice. {diff} across the quarter is about what you’d expect. Finance agreed with the auditors last year that the return figure is the one to file.'], ['a', 'Thanks, that matches what I half remembered. I’ll note it on the reconciliation.']]]
			},
			{
				detail: ['The dashboard’s VAT column.'],
				look: ['The Revenue dashboard’s VAT column is computed as 20% of net in reporting.revenue_monthly rather than taken from billing.invoices.vat. Zero-rated invoices, such as {acct}’s, get VAT they don’t have. The exported vat column is right.'],
				lookPaste: 'vatLines',
				team: 'Kofi in BI',
				ends: [[['b', 'Kofi here. Guilty: the view works VAT out from net. I’ve made it read the vat column from billing, and box 1 from the dashboard matches the return to the penny.'], ['d', '{first}, the dashboard was working VAT out as 20% of net, which is wrong for zero-rated invoices. Kofi has made it use the VAT billing exports, and the dashboard agrees with the return.'], ['a', 'Great, thanks. I’ll file as it is.']]]
			}
		]
	},
	// 9. A request for a new field.
	{
		from: ['marketing', 'sales', 'leadership', 'success'],
		why: ['At the moment we split customers by plan and region only, and the campaigns that do best are the ones aimed at one trade.', 'Customer success think churn differs a lot between trades, but nobody can prove it without the field.'],
		after: [['Once it’s in, could it also be a filter on the Renewals dashboard?', 'Yes. Kofi adds new account fields to the Accounts and Renewals filters as a matter of course, usually the week after they arrive.']],
		subjects: ['Can we get sector into the warehouse?', 'Industry field for accounts', 'Adding a column to the accounts table', 'Number of employees per customer'],
		open: [
			'We’d like to split the customer base by sector for the spring campaign: dental, legal, retail, hospitality and so on. Is that something the warehouse can give us?',
			'Could the accounts table carry the customer’s industry? I want to see churn by industry, and at the moment I do it by hand from the names, which is hopeless.',
			'Is there any way to get company size into the warehouse? Even rough bands would help with targeting.'
		],
		more: ['I don’t need it this week, but sometime this quarter would be great.', 'Catherine asked for it at the planning day.', 'Happy to help define the categories.'],
		ask: ['Do you know whether the CRM holds this already? If it does, it’s a matter of adding it to the export; if not, someone has to collect it first.', 'Is this something account managers record in the CRM today? That decides how hard it is.'],
		paths: [
			{
				detail: ['I think there’s a sector dropdown on the account page, yes.'],
				look: ['The CRM has an Industry field, filled in for about {pct}% of accounts. It isn’t in the accounts export template. Sales ops own the template.'],
				team: 'sales operations',
				ends: [[['d', 'The CRM has an Industry field, filled in for about {pct}% of accounts, but it isn’t in the export we receive. I’ve asked Sana to add it to the template. Once it arrives, adding it to the warehouse is quick, since the clean passes new columns straight through.'], ['s', 'Sana here. Happy to, but template changes go through the CRM change board, which meets on the first Tuesday of the month. I’ve put it on the agenda.'], ['a', 'Thanks both. I’ll wait for the change board.']]]
			},
			{
				detail: ['Yes, it’s on the account page.'],
				look: ['Industry is in the CRM for {pct}% of accounts. Asked Sana to add it to the export template; done the same day. Added the column to the load mapping for crm.accounts.'],
				extra: 'exportIndustry',
				ends: [[['s', 'Industry is in the export from tonight.'], ['d', 'Done: crm.accounts has an industry column from this morning, and Kofi has added it as a filter on the Accounts dashboard. It’s filled in for about {pct}% of accounts; the rest are blank until account managers fill them in.'], ['a', 'Fantastic, that was quick. Thank you!']]]
			},
			{
				detail: ['I don’t think so. Nobody records it, as far as I know.'],
				look: ['No such field in the CRM or billing. Could be bought from a data supplier or collected by account managers. Needs someone to decide which, and to own it.'],
				ends: [[['d', 'Neither the CRM nor billing holds it, so there’s nothing to load yet. It could be collected by account managers at renewal, or bought from a data supplier and matched on company number. Either is fine by us, but someone has to decide which and own it. Could you take that to {mgr}? Once there’s a field in the CRM, we can add it within a week.'], ['x', 'Automatic reminder sent to {first} after five working days without a reply.']]]
			}
		]
	},
	// 10. Totals that look wrong after a change to the export.
	{
		from: ['finance', 'receivables'],
		checks: ['load'],
		why: ['The overdue total goes into the cash forecast every Monday, so a drop like this changes what we tell the bank.', 'I noticed because the totals on my statement run didn’t match the invoices the customers have.'],
		subjects: ['Invoice totals look odd since {dateShort}', 'Totals column has the VAT in it?', 'Wrong totals on the invoices table', 'Invoices with no total'],
		open: [
			'Since {dateShort} the totals in billing.invoices look far too small. An invoice of {amount} shows a total equal to the VAT. Has something changed?',
			'I’ve got invoices in the warehouse where the total is blank or tiny. The ones from before {dateShort} look fine.',
			'Something odd: my overdue total has dropped by a lot in a week, and when I look at the invoices behind it the totals don’t make sense.'
		],
		more: ['I’ve stopped using the table until I hear from you.', 'Collections is affected too.', 'It might be nothing, but it’s a big swing.'],
		ask: ['Could you send a couple of invoice numbers, and tell me what billing shows as their total?', 'Which invoices? A few numbers would help me trace them.'],
		paths: [
			{
				detail: ['Anything issued from {dateShort} onwards. Billing shows the right totals.'],
				look: ['From {dateShort} the billing export has a new discount column between net and vat. The loader maps the invoices file by column position, so every column after net is shifted: discount lands in vat, vat in total. The clean doesn’t mind a new column; the loader does.'],
				lookPaste: 'exportInvoicesShifted',
				extra: 'totalsShifted',
				ends: [[['d', 'Billing added a discount column to the invoices export on {dateShort}, and our loader matched columns by position rather than name, so from then on the VAT landed in the total. I’ve made the loader match columns by name and reloaded every invoice since {dateShort}. Totals are right, and Collections is back to normal.'], ['f', 'Martin: sorry, I should have warned you about the new column. I’ll send a note to the data desk before any export change from now on.'], ['a', 'Thanks both, the totals look right.']]]
			},
			{
				detail: ['A few from this month with no total at all.'],
				look: ['The invoices with no total are drafts and pro-formas. Billing exports them with status draft or pro-forma and an empty total, because they haven’t been issued. {n} of them this month. Collections already filters to status issued.'],
				lookPaste: 'draftInvoices',
				ends: [[['d', 'The ones with no total are drafts and pro-formas, which billing exports with an empty total because they haven’t been issued yet. If you filter on status = ‘issued’ they drop out; Collections already does that, so its figures aren’t affected.'], ['a', 'Of course, the drafts. Thanks, I’ll add the filter to my query.']]]
			}
		]
	},
	// 11. Fewer contacts in the warehouse than in the CRM.
	{
		from: ['marketing', 'success'],
		why: ['The newsletter goes to billing contacts and decision makers, and last time it only reached one person per customer, which marketing didn’t think was right.', 'We’re planning a survey of every contact, not only the main one, so I need the full list.'],
		after: [['How often is the contacts table updated? The CRM changes every day.', 'Contacts are loaded once a week, on Saturday night, because the export is large and nothing on the dashboards needs it daily. If you need a fresher copy for a mailing, ask us on the day and we can run it by hand.']],
		shows: 'contactCounts',
		subjects: ['Contacts missing from the warehouse', 'Fewer contacts than the CRM?', 'CRM contacts vs warehouse', 'Contact count looks low'],
		open: [
			'The CRM says we have {crmPage} contacts, but crm.contacts in the warehouse has {whContacts}. I was going to use it for the newsletter list. Is the table incomplete?',
			'The CRM lists more contacts at {acct} than the warehouse does, and it’s the same for the other customers I tried. Is that deliberate?',
			'Quick one: why is the contact count in the warehouse so much lower than in the CRM?'
		],
		more: ['I don’t want to send the newsletter to a partial list.', 'I need billing contacts and decision makers both.', 'Counts below, from this morning.'],
		ask: ['Do you know whether the CRM count includes archived contacts and people who’ve opted out?', 'Which CRM figure are you comparing with: the total on the Contacts page, or a report?'],
		paths: [
			{
				detail: ['The total on the Contacts page. It doesn’t say anything about archived.'],
				look: ['crm.contacts has exactly one row per account. The export has the full set of contacts. The weekly contacts load cleans the file with --key account_id instead of contact_id, so every contact after the first at each account is dropped as a repeat. Run by hand with --key contact_id: every contact kept.'],
				lookPaste: 'contactsRun',
				set: { whContacts: '{accountRows}' },
				ends: [[['d', 'The weekly contacts load had the wrong key for the file: it treated the account as the identifier, so only the first contact at each account was kept. I’ve set the key to contact_id and reloaded, and crm.contacts has every contact. It looks as though it has been that way since contacts were added to the load in the spring, so anything built on the table may have been missing people.'], ['a', 'Wow, OK. Thanks for finding it. I’ll rebuild the newsletter list.']]]
			},
			{
				detail: ['The total on the Contacts page, which includes everyone, I think.'],
				look: ['The Contacts page total includes archived contacts and contacts who have opted out of all contact. The export leaves both out by design. Active contacts in the CRM = rows in crm.contacts, give or take today’s additions.'],
				ends: [[['d', 'The table is complete. The CRM’s Contacts page counts archived contacts and people who have opted out of all contact; the export leaves both out on purpose, and the active ones match the warehouse to within today’s additions. For a newsletter list, crm.contacts is the right starting point.'], ['a', 'Ah, that explains it, and it’s the right set for me anyway. Thanks.']]]
			}
		]
	},
	// 12. Customer names garbled.
	{
		from: ['marketing', 'receivables', 'success'],
		forwards: [['What the customer sent back:', 'Our statement arrived with our company name printed wrongly. Could you correct it on your system? We file your statements with our own records and the name needs to match.\n\nThanks\n{acct}']],
		checks: ['load'],
		why: ['The names go on letters, statements and mailing labels, so customers see them.', 'We also match on customer name in a couple of finance spreadsheets, and those matches break when the names change.'],
		subjects: ['Customer names garbled', 'Funny characters in names', 'Names wrong on the dashboards', 'Strange symbols in customer names'],
		open: [
			'Some customer names in the warehouse look broken. {acct} comes out with odd symbols in the middle. It’s going to look terrible on the mailing labels.',
			'I’ve noticed a few names on the Accounts dashboard with strange characters. Can that be fixed?',
			'Our statements are pulled from the warehouse, and a customer has just sent one back with their name mangled.'
		],
		more: ['It’s only a handful as far as I can see.', 'I’ve corrected a couple by hand in my spreadsheet, but that won’t last.', 'The CRM shows the names correctly.'],
		ask: ['Which table or dashboard are you seeing them on, and could you paste one or two exactly as they appear?', 'Could you copy a couple of the names exactly as they show?'],
		paths: [
			{
				detail: ['On the Accounts dashboard, which I think reads the CRM. Names with an ampersand come out with “amp;” in them.'],
				look: ['The CRM export writes &, apostrophes and some accents as HTML entities: &amp;, &#39;. It started with the CRM release of {dateShort}. The names in the CRM itself are fine.'],
				lookPaste: 'garbledAmp',
				team: 'sales operations',
				ends: [[['s', 'Sana: the vendor knows; it’s a bug in their latest release. They say the fix will be in next month’s release, with no date.'], ['d', 'It’s the CRM export, which writes ampersands and apostrophes as web codes since the CRM’s last release. The vendor is fixing it in a future release. In the meantime Kofi has made the reporting views turn the codes back into characters, so the dashboards show names properly. The raw crm.accounts table still has the codes until the vendor’s fix.'], ['a', 'That’s fine for me, the dashboards are what I use. Thanks.']]]
			},
			{
				detail: ['In billing.accounts, and on statements. Accented names come out as two odd letters each.'],
				look: ['billing.accounts has accented names double-encoded, starting with the billing upgrade on {dateShort}. The export’s character set setting reverted to Western European in the upgrade and the file is converted twice.'],
				lookPaste: 'garbledMojibake',
				team: 'finance systems',
				ends: [[['f', 'Martin here. Found it: the upgrade reset the export character set. I’ve set it back to UTF-8, and tonight’s file should be clean.'], ['d', '{first}, it was the billing export, whose character setting was reset by the billing upgrade. Martin has put it back. billing.accounts is replaced every night, so tomorrow’s table has the names right, and statements generated after that will too.'], ['a', 'Perfect, I’ll regenerate the statement tomorrow. Thanks.']]]
			}
		]
	},
	// 13. The weekly figures email.
	{
		from: ['leadership', 'leadership', 'finance'],
		checks: ['refresh'],
		why: ['The leadership meeting starts at 9 on Monday and we go through the email page by page.'],
		subjects: ['Weekly figures email didn’t arrive', 'No board pack email on Monday', 'Missing the weekly numbers'],
		open: [
			'I didn’t get the weekly figures email on Monday. Has it stopped? I rely on it for the leadership meeting.',
			'The Monday numbers email hasn’t arrived for two weeks now. Is it me or everyone?',
			'Did the weekly figures go out this week? Nobody in leadership seems to have had it.'
		],
		more: ['I’ve checked my junk folder.', 'Not urgent, I can open the dashboard, but I like having it in my inbox.', 'Others have said the same.'],
		ask: ['Did you receive it the week before? And do you know whether anyone else had it this week?', 'I’ll check the subscription. Is it the email from the dashboards with the PNG attached, or the PDF?'],
		paths: [
			{
				detail: ['I had it until a couple of weeks ago. The PNG one.'],
				look: ['The weekly figures subscription is still addressed to the old leadership list, which IT retired last month. It has gone out every Monday into a list that no longer delivers.'],
				lookPaste: 'subscriptions',
				set: { listName: 'leadership-team@ (retired)' },
				ends: [[['d', 'The email still went to the old leadership list, which IT retired last month, so it was going nowhere. Kofi has pointed the subscription at the new list and sent this week’s by hand, so you should have it now.'], ['a', 'Got it, thank you.']]]
			},
			{
				detail: ['I had it last week. I don’t know about the others.'],
				look: ['Subscription sent on Monday at 07:30 to the right list; the mail server shows delivery to the gateway. The gateway quarantined it: messages from the dashboards with attachments are held since the mail filter change.'],
				lookPaste: 'subscriptions',
				team: 'IT',
				ends: [[['d', 'The email went out on time, but the company mail filter held it in quarantine: messages from the dashboards with attachments are being held since IT changed the filter. I’ve asked IT to allow the dashboard sender.'], ['i', 'Josh, IT service desk. Logged. Allowing a sender needs sign-off from information security, and they review requests on Thursdays. I’ll update here after that.']]]
			}
		]
	},
	// 14. The board pack's customer count.
	{
		from: ['leadership', 'finance'],
		forwards: [['Catherine’s note:', 'One of the board asked why the customer count went up by more than the new business figure. Can you find out for me before the next meeting? A one-line answer is fine.', 'Catherine']],
		checks: ['refresh'],
		why: ['Revenue per customer is in the pack too, so if the customer count is wrong, so is that.', 'A board member asked about it directly, and I want to give a clear answer at the next meeting.'],
		shows: 'boardCounts',
		subjects: ['Active customers in the board pack', 'Customer count changed between packs', 'Why did active customers jump?'],
		open: [
			'The {month} board pack says we have more active customers than the {month2} pack by far more than our new business. Did something change in how we count?',
			'Catherine asked me why active customers went up so much between the last two board packs. New business doesn’t explain it. Can you help me answer?',
			'Active customers in the board pack moved more than I can explain from new and closed accounts.'
		],
		more: ['I need an answer I can give the board.', 'I’ve pasted the two figures.', 'It matters because we quote revenue per customer as well.'],
		ask: ['When did you take each figure, and from which tile?', 'Both from the Board pack dashboard’s headline tile?'],
		paths: [
			{
				detail: ['Both from the headline tile, on the first working day of each month.'],
				look: ['Kofi changed the definition of active on the Board pack dashboard during {month}: paused accounts now count as active. That accounts for nearly all of the jump. The tile’s info icon says so, but nothing on the pack itself does.'],
				ends: [[['b', 'Kofi here. Yes, my change, sorry: paused accounts still pay a reduced fee, so finance asked for them to be counted as active. I should have told the board pack’s readers. I’ve added a note under the tile, and the monthly table shows both definitions side by side for the last six months.'], ['d', 'The definition changed during {month}: paused accounts count as active now. On the old definition the increase matches new business less closures. Kofi has added a note under the tile and a table with both figures, so you can show the board either.'], ['a', 'That explains it. I’ll show both in the pack with a sentence about the change.']]]
			},
			{
				detail: ['From the tile, but I took last month’s early in the morning.'],
				look: ['{month2}’s figure was taken at 09:10 on the first working day of {month}. The CRM API was down overnight, so that morning’s load skipped crm.accounts and the tile showed the accounts as they were the day before, without the ones added on the last day of {month2}. Recomputed for that date, the figure is higher. {month}’s figure is right.'],
				lookPaste: 'loadLogPack',
				ends: [[['d', 'The {month2} figure was the odd one: it was taken on a morning when the CRM accounts load had been skipped, so it missed the accounts added on the last day of the month. Recomputed for the same date, {month2} is higher, and the increase to {month} is in line with new business. {month}’s figure is right.'], ['a', 'Thanks. I’ll restate last month’s figure in a footnote.']]]
			}
		]
	},
	// 15. Deals missing from the commission report.
	{
		from: ['accountManagers'],
		checks: ['load', 'refresh'],
		why: ['Commission is paid with the next month’s salary, so if anything is missing I need it fixed before Liam signs off.', 'It is not the first month I think this has happened, so I’d like to understand how the report counts deals.'],
		shows: 'dealList',
		subjects: ['Deals missing from my commission report', 'Commission report short', 'Closed deals not counted', 'Commission for {month}'],
		open: [
			'My commission report for {month} is missing deals I closed. I count {n} closed-won in the CRM, and the report has fewer. Can you check?',
			'Two of my bigger deals from {month} aren’t on the commission report. They’re closed won in the CRM.',
			'The commission report doesn’t match what I see in the CRM. Am I reading it wrong?'
		],
		more: ['My deals from the CRM below.', 'Liam signs off on {day}.', 'It’s a decent chunk of my bonus, so I’d like to get it right.'],
		ask: ['Which deals are missing, and what stage do they show in the CRM exactly?', 'Could you list the deals you think are missing, with their stage?'],
		paths: [
			{
				detail: ['The ones closed in the last week of {month}. All closed won.'],
				look: ['The commission report counts a deal when its first invoice is issued, as agreed with finance. The missing deals are closed won but invoicing starts on the contract start date, next month. They’ll appear on next month’s report.'],
				ends: [[['d', 'They’re not lost: the commission report counts a deal when its first invoice is issued, which is the rule agreed with finance, and these customers’ contracts start next month. They’ll be on next month’s report. Finance can confirm the rule if you want it in writing.'], ['a', 'Ah, I forgot about the invoice rule. Fine, thanks.']]]
			},
			{
				detail: ['The ones at “Closed Won – awaiting PO”.'],
				look: ['crm.deals has no rows at stage “Closed Won – awaiting PO”. The deals export filters on stage names in a fixed list, and that stage was added in the CRM over the summer without being added to the export. {n} deals in that stage at the moment.'],
				lookPaste: 'stageCounts',
				team: 'sales operations',
				set: { stagePaste: 'po' },
				ends: [[['d', 'Deals at “Closed Won – awaiting PO” aren’t exported to the warehouse at all: the stage was added in the CRM over the summer but not to the export’s list. I’ve asked Sana to add it.'], ['s', 'Sana: I’ll add it, but I want Liam to confirm that “awaiting PO” should count for commission before I do, since finance treat it as not yet won. Asked him.'], ['a', 'OK. I’ll chase Liam too.']]]
			},
			{
				detail: ['These ones. Closed won, all in {month}.'],
				look: ['Every deal {first} listed is on the commission report. {first}’s saved question filters on created date, not closed date, so the deals created before {month} don’t appear in it.'],
				ends: [[['d', 'All of them are on the commission report itself. The difference is in your saved question in Scratch, which filters on the date the deal was created rather than the date it closed, so deals opened before {month} drop out. If you change the filter to closed_on, the counts agree.'], ['a', 'You’re right, my filter was wrong. Thanks, sorry for the bother.']]]
			}
		]
	},
	// 16. A customer list for a campaign.
	{
		from: ['marketing'],
		why: ['The add-on is only worth offering to customers with more than a handful of staff, which is why Business and Business Plus.', 'We have budget for one mailing this quarter, so I want the audience right.'],
		after: [['Could I get the same counts each month without asking? I’d like to track the plans over time.', 'You can: the Accounts dashboard has a plan-by-region table, and the bell icon will send it to you on the first of each month.']],
		subjects: ['Customer list for the autumn campaign', 'Business Plus customers by region', 'Counts for a mailing', 'Segment list for an email'],
		open: [
			'We’re planning an email to Business Plus and Business customers outside London, offering the new backup add-on. Could you give me counts by plan and region, and then the list?',
			'Can I get a list of customers on the Business plan with their main contact, for a campaign?',
			'For planning: how many customers do we have on each plan in each region?'
		],
		more: ['The campaign goes out in three weeks.', 'Counts first, then the list once we’ve agreed the audience.', 'I can take a CSV.'],
		ask: ['Do you need contact details as well as the counts, and is the email marketing or a service message?', 'Is it a marketing email? If so I’ll need to check consent before I send contacts.'],
		paths: [
			{
				detail: ['Counts first please. Contacts later, and it’s a service message about their existing plan.'],
				look: ['Counts from crm.accounts by plan and region. Service message, so the account’s main contact is fine. List saved to the marketing folder.'],
				ends: [[['d', 'Counts are below and the list of main contacts is in the marketing folder on the shared drive. Since it’s a service message about their plan, main contacts are fine. Let me know if you need it cut differently.\n\n{P:segmentCounts}'], ['a', 'Perfect, thank you!']]]
			},
			{
				detail: ['It’s a marketing email, yes.'],
				look: ['Marketing consent sits in the CRM’s marketing preferences, which aren’t exported. Can’t send contacts for a marketing email without it. Counts sent.'],
				team: 'data protection',
				ends: [[['d', 'Counts are below. For the contacts, marketing consent is held in the CRM’s marketing preferences, which aren’t in the warehouse, so I can’t tell you who has agreed to marketing email. I’ve asked Sana and Eleanor whether the preferences can be exported.\n\n{P:segmentCounts}'], ['p', 'Eleanor here. Exporting consent is fine in principle, but I want a short note of what will be kept, for how long and who can see it before anything is set up. {first}, could you and Sana draft one?'], ['a', 'Will do. I’ll send it over next week.']]]
			}
		]
	},
	// 17. The same invoice twice.
	{
		from: ['finance', 'receivables'],
		checks: ['refresh'],
		why: ['I can’t send statements with doubled balances, and the run is due this week.'],
		subjects: ['Same invoice twice', 'Invoices doubled?', 'Duplicate invoice lines', 'Customer balance looks double'],
		open: [
			'Revenue for {dateShort} looks too high, and some invoices seem to appear twice in billing.invoices.',
			'{acct}’s balance on Collections looks double what I’d expect, and I think it’s because one of their invoices appears twice.',
			'Some invoices appear twice in the warehouse. I noticed because a customer’s balance looked double.'
		],
		more: ['I haven’t checked other days.', 'Collections may be affected too.', 'Could you take a look before I send statements?'],
		ask: ['Do the two copies have exactly the same number, or does one have a suffix?', 'Exactly the same invoice number on both rows?'],
		paths: [
			{
				detail: ['Exactly the same, every column. Here’s what I ran.'],
				paste: 'dupInvoices',
				look: ['{dateShort} was reloaded by hand after a fetch problem, and the loader was run with --append instead of the usual merge, so the day’s invoices went in a second time. Only {dateShort} affected; every other day has one row per invoice.'],
				lookPaste: 'appendRun',
				ends: [[['d', 'My fault: when I reloaded {dateShort} last week I ran the loader in append mode instead of merge, so every invoice from that day went in twice. I’ve removed the second copies, and revenue and Collections for that day are right. I’ve also made the loader refuse append mode for invoices.'], ['a', 'Thanks, the numbers look right.']]]
			},
			{
				detail: ['Not quite: one is {inv}, the other is {inv}-R. Both rows below.'],
				paste: 'reissued',
				look: ['{inv} was credited and reissued as {inv}-R with a corrected total. Both are genuine; the first is marked credited, and its credit note cancels it. No duplicate.'],
				ends: [[['d', 'They’re two invoices: {inv} was credited and reissued as {inv}-R with the corrected amount. The original is marked credited and its credit note cancels it, so the customer only owes the reissued one. If you filter out status ‘credited’ you’ll see one per customer.'], ['a', 'Makes sense, thanks.']]]
			}
		]
	},
	// 18. Euro invoices.
	{
		from: ['finance', 'leadership'],
		checks: ['load', 'refresh'],
		why: ['We have about a hundred and fifty Irish customers, so it isn’t a rounding error.'],
		after: [['Should the board pack show Irish revenue separately?', 'That’s for finance to decide, but the Revenue dashboard can split by currency already, using the “Currency” filter. Kofi can add a separate line if you want one in the pack.']],
		shows: 'currencyTotals',
		subjects: ['Irish customers’ totals look inflated', 'EUR invoices in the revenue figure', 'Currency on the revenue dashboard'],
		open: [
			'Revenue for {month} on the dashboard is higher than the ledger, and the difference seems to be the Irish customers. Are euros being added as pounds?',
			'The Revenue dashboard is ahead of finance’s number for {month}, which never happens. I think it’s the euro invoices.',
			'Is currency handled anywhere in the warehouse? Some invoices look too big.'
		],
		more: ['Query below.', 'I want to check before the pack goes out on {day}.', 'Our Irish accounts are invoiced in euros by Larkfield Ltd’s Dublin branch.'],
		ask: ['Which figure are you comparing: the tile, or your own query of billing.invoices?', 'From the dashboard tile, or from the table?'],
		paths: [
			{
				detail: ['The dashboard tile.'],
				look: ['reporting.revenue_monthly sums billing.invoices.total across currencies. EUR invoices are added at face value as if they were pounds. The currency column is exported correctly.'],
				team: 'Kofi in BI',
				ends: [[['b', 'Kofi here. Right, I never converted. The view converts EUR at finance’s month-end rate now, from the rates sheet finance keep. {month} matches the ledger.'], ['d', 'The dashboard was adding euro invoices as if they were pounds. Kofi has made it convert at finance’s month-end rate, and {month} matches the ledger.'], ['a', 'Thanks, all good.']]]
			},
			{
				detail: ['My own query, by currency.'],
				look: ['Irish accounts migrated from the old billing system in 2024 have a blank currency on their older invoices. The views treat blank as GBP. {n} accounts affected. Billing has the right currency on screen; the export reads a field that wasn’t filled during migration.'],
				lookPaste: 'blankCurrency',
				team: 'finance systems',
				ends: [[['d', 'Invoices for Irish accounts that came over from the old billing system have no currency in the export, and the warehouse treats a blank as pounds. Kofi has made the views take the account’s currency when the invoice has none, which fixes the totals. I’ve asked Martin whether the field can be filled in billing itself.'], ['f', 'Martin: it can, but it’s a bulk update the vendor has to run for us. I’ve asked for a quote.']]]
			}
		]
	},
	// 19. New accounts missing after the clocks changed.
	{
		from: ['success', 'sales'],
		why: ['New customers get a welcome call within three working days, and the list on the dashboard is how we know who to call.'],
		subjects: ['New accounts missing', 'Accounts created this week not in the warehouse', 'Onboarding list missing new customers', 'Warehouse behind?'],
		open: [
			'The onboarding list on the Accounts dashboard is missing customers who signed up in the last couple of days. They’re in the CRM. Is something stuck?',
			'Three new customers from this week aren’t on any dashboard yet. I need them for the welcome calls.',
			'Is the warehouse behind? My new accounts aren’t showing, and one of them has been in the CRM since the day before yesterday.'
		],
		more: ['Welcome calls are due within three working days.', 'Not sure whether it’s just my accounts.', 'The ids are on the onboarding sheet if you need them.'],
		ask: ['Which accounts, and when were they created in the CRM?', 'Could you give me the ids, and when they were created? I’ll check the last few loads.'],
		paths: [
			{
				detail: ['Anything created yesterday, as far as I can tell. The older ones are there.'],
				look: ['crm.accounts this morning is the same as yesterday’s. Last night’s CRM files never reached ops-etl-01: the disk the exports land on filled up just after the billing files arrived, so both CRM fetches failed and the CRM tables were left as they were. Old exports haven’t been cleared since the archive job moved to the new server in the summer.'],
				lookPaste: 'loadLogDisk',
				back: 1,
				ends: [[['d', 'It was our nightly load: the disk the exports land on filled up last night, so the CRM files couldn’t be fetched and the CRM tables stayed as they were the day before. I’ve cleared out old exports and run the load again by hand, and the new accounts are on the dashboard. The weekly clear-out is running again, so it shouldn’t fill up the same way.'], ['a', 'They’re there, thanks.']]]
			},
			{
				detail: ['Three from {dateShort}: {acct} and two others.'],
				back: 1,
				look: ['The CRM’s API was down overnight after {dateShort} (vendor incident), so the next morning’s load got no CRM files and kept the previous day’s tables. The following night’s load picked everything up, and all three accounts are there today.'],
				lookPaste: 'loadLogCrmDown',
				ends: [[['d', 'The CRM had an outage overnight after {dateShort}, so the next morning’s load had no CRM files and kept the previous day’s accounts. The following night’s load caught up, and all three accounts are on the dashboard today. Nothing needs doing.'], ['a', 'Lovely, thanks.']]]
			}
		]
	},
	// 20. Access to the warehouse.
	{
		from: ['starters'],
		subjects: ['Access to the warehouse', 'Can I get a login for the dashboards?', 'Read access for a new starter', 'Dashboard access'],
		open: [
			'I’ve joined the {team} team and would like access to the dashboards and the warehouse, read only. Who do I ask?',
			'I started on Monday and {mgrFirst} says I’ll need the Accounts and Collections dashboards. How do I get access?',
			'I need read access to the warehouse to run a few queries for {mgrFirst}. Is that possible?'
		],
		more: ['I don’t need to change anything.', 'Mostly the Accounts dashboard.', 'Happy to do any training needed.'],
		ask: ['Access needs your manager’s approval. Who is your manager, and do you need the dashboards only or SQL access too?', 'No problem. Could your manager reply here to approve, and do you need SQL or just the dashboards?'],
		paths: [
			{
				detail: ['Dashboards and SQL please. My manager is {mgr}; I’ve copied them in.'],
				look: ['{first} isn’t in any warehouse group yet. Needs {mgrFirst}’s approval on the thread before I add them.'],
				ends: [[['m', 'Approved, thanks. Dashboards and SQL are fine.'], ['d', 'Thanks, {mgrFirst}. {first}, you’re in the warehouse readers group and can sign in to the dashboards with your usual login. The data dictionary is on the ops wiki, and the Scratch collection is yours to experiment in.'], ['a', 'All working, thank you.']]]
			},
			{
				detail: ['Just the dashboards. My manager is {mgr}.'],
				look: ['No approval from {mgr} yet. Can’t grant without it.'],
				ends: [[['d', 'Thanks. I need {mgrFirst} to approve before I can add you; a reply on this thread from {mgrFirst} is enough.'], ['a', 'I’ll ask {mgrFirst}.'], ['x', 'Automatic reminder sent to {first} after five working days without a reply.']]]
			}
		]
	},
	// 21. A negative balance.
	{
		from: ['success', 'accountManagers'],
		forwards: [['Their email:', 'Your portal shows us in credit. If that’s right we’d like the money back rather than carried forward, please. If it isn’t right, could you explain what the credit is for?\n\nFinance, {acct}']],
		checks: ['load', 'refresh'],
		why: ['The customer is being very polite about it, but I’d like to give them a straight answer.'],
		shows: 'balanceRows',
		subjects: ['{acct} shows a negative balance', 'Credit balance on {acct}?', 'Customer in credit?'],
		open: [
			'The Accounts dashboard shows {acct} with a negative balance. Do we owe them money? They’re asking for a refund and I don’t know what to tell them.',
			'{acct} shows in credit on the dashboard, but billing shows nothing outstanding either way. Which is right?',
			'Odd one: a customer of mine has a negative balance.'
		],
		more: ['Row from the dashboard below.', 'I’ve a call with them on {day}.', 'I don’t want to promise a refund that isn’t due.'],
		ask: ['Does billing show any credit notes or payments that look unusual for them?', 'Do you know of any credit note or overpayment on the account?'],
		paths: [
			{
				detail: ['Billing has a credit note from a couple of months ago, for {amount}.'],
				look: ['The credit note for {amount} is in billing.credit_notes but isn’t allocated to any invoice, and the customer’s later payment covered the invoice in full. So the customer really is in credit. Allocation or refund is for accounts receivable.'],
				team: 'accounts receivable',
				ends: [[['d', 'The dashboard is right: {acct} has a credit note for {amount} that was never set against an invoice, and they then paid the invoice in full, so they are in credit. Whether to refund it or carry it forward is for accounts receivable; I’ve passed it to Joe.'], ['r', 'Joe here. Thanks. I’ll contact them about a refund or carrying it forward once I’ve checked the original dispute; I’m out until {day}, so it will be after that.']]]
			},
			{
				detail: ['Nothing unusual. One payment split into two parts.'],
				look: ['The Accounts dashboard balance joins payments to invoices, and a payment split into two parts is subtracted twice. {n} accounts show a negative balance for that reason. billing.payments is right.'],
				lookPaste: 'paymentsSplit',
				team: 'Kofi in BI',
				ends: [[['b', 'Kofi here. Fixed: the balance sums payments once per payment, not once per part. {acct} shows zero.'], ['d', 'The dashboard was subtracting a split payment twice. Kofi has fixed the balance, and {acct} shows nothing owed either way, as in billing. Nothing is due to the customer.'], ['a', 'Great, I’ll tell them. Thanks.']]]
			}
		]
	},
	// 22. Accounts in the wrong region.
	{
		from: ['sales', 'leadership', 'marketing'],
		checks: ['refresh'],
		why: ['Regional targets for next year are being set from these numbers, so the split matters.'],
		shows: 'regionRows',
		subjects: ['Accounts in the wrong region', 'Region for {acct}', 'Why is {acct} in “Unknown”?'],
		open: [
			'Some accounts on the regional sales dashboard show region “Unknown”, and a couple look to be in the wrong region. {acct} for example.',
			'The regional split looks off: a chunk of accounts are in Unknown.',
			'{acct} is a {region} customer but shows somewhere else on the dashboard.'
		],
		more: ['Examples below.', 'It affects the regional targets.', 'I can send more examples.'],
		ask: ['Where does the dashboard get the region from, as far as you know? I’ll check both the CRM field and our postcode lookup.', 'Could you tell me what region the CRM shows for {acct}?'],
		paths: [
			{
				detail: ['The CRM shows the right region.'],
				look: ['The regional dashboard maps postcodes to regions with reporting.postcode_region, and the lookup was built from a list two years old. New-build postcodes aren’t in it and fall into Unknown. {n} accounts affected.'],
				team: 'Kofi in BI',
				set: { regionShown: 'Unknown' },
				ends: [[['b', 'Kofi: I’ve rebuilt the postcode lookup from the current postcode list. No accounts are in Unknown any more.'], ['d', 'It was our postcode lookup, which was missing newer postcodes. Kofi has rebuilt it, and every account has a region on the dashboard.'], ['a', 'Thanks, much better.']]]
			},
			{
				detail: ['The CRM shows the wrong one too: it says {region2}.'],
				set: { regionShown: '{region2}' },
				look: ['crm.accounts.region for {acct} is {region2}, typed in by hand. The postcode says {region}. The region field in the CRM is free to edit; {n} accounts disagree with their postcode.'],
				team: 'sales operations',
				ends: [[['d', 'The CRM itself has the wrong region for {acct}: the field is typed by hand, and {n} accounts disagree with their postcodes. I’ve sent Sana the list.'], ['s', 'Sana: I’ll correct them and look at filling the field from the postcode automatically, but I want the account managers to check the list first in case some are deliberate. I’ve sent it round.']]]
			}
		]
	},
	// 23. The October price rise.
	{
		since: '2026-10-05',
		from: ['pricing', 'finance'],
		why: ['The rise was announced to customers in August, so anyone still on the old price should either be on a fixed contract or be corrected.'],
		subjects: ['Check: October price rise applied?', 'Accounts not on the new prices', 'Price rise check'],
		open: [
			'The price rise took effect on 1 October. Could you check that every account’s October invoice is at the new price, and list any that aren’t?',
			'Finance want assurance that the October price rise went through for everyone. Can the warehouse tell us?',
			'I’ve spotted an October invoice at the old price. Are there others?'
		],
		more: ['Essentials goes from £49 to £52, Business from £129 to £136 and Business Plus from £249 to £262.', 'I need this for the pricing review.', 'A list would be ideal.'],
		ask: ['Should accounts on fixed-price contracts be left out? They keep their price until renewal.', 'I’ll run the check. Do you want accounts on fixed-price contracts in the list?'],
		paths: [
			{
				detail: ['Include them, but mark them.'],
				set: { priceKind: 'fixed' },
				look: ['{n} accounts invoiced at the old price in October. All of them are on fixed-price contracts that keep their price until renewal. Every rolling contract is at the new price.'],
				lookPaste: 'priceCheck',
				ends: [[['d', 'Every rolling contract was invoiced at the new price in October. {n} accounts are still at the old price, and all of them are on fixed-price contracts that keep their price until renewal. The list is on the shared drive with their renewal dates.'], ['a', 'Perfect, that’s exactly what I needed.']]]
			},
			{
				detail: ['Leave them out.'],
				set: { priceKind: 'rolling' },
				look: ['{n} rolling-contract accounts invoiced at the old price in October. All on the legacy price list from before 2024, which the bulk update in billing didn’t cover.'],
				lookPaste: 'priceCheck',
				team: 'finance systems',
				ends: [[['d', 'Leaving out fixed-price contracts, {n} accounts were invoiced at the old price. They’re all on the legacy price list, which the bulk update in billing didn’t touch. I’ve passed the list to Martin.'], ['f', 'Martin: confirmed. I’ll move them to the current price list, but I need {first} and {mgrFirst} to decide whether to back-bill October or start from November. Until then I’ve left them as they are.']]]
			}
		]
	},
	// 24. Test accounts in the figures.
	{
		from: ['finance', 'leadership'],
		checks: ['refresh'],
		why: ['The revenue by customer table is in the board pack this month.'],
		shows: 'testAccounts',
		subjects: ['“Larkfield Test” in the revenue figures', 'Test accounts on the dashboard', 'Revenue includes demo accounts?'],
		open: [
			'I’ve just noticed “Larkfield Test Ltd” among our top customers on the Revenue dashboard. Are test accounts counted in revenue?',
			'Revenue by customer includes some accounts that look like test or training ones.',
			'Some accounts in the warehouse are obviously not real customers.'
		],
		more: ['Query below.', 'It’s not much money, but it looks bad in the pack.', 'I don’t know who created them.'],
		ask: ['I’ll check billing. Do you know whether finance raise real invoices on them?', 'Do you know what they’re used for?'],
		paths: [
			{
				detail: ['I think they’re used for training new starters on billing.'],
				look: ['Three billing accounts used for training, with real invoices raised and then credited. They count in revenue because the views don’t exclude them. No flag in billing to mark them.'],
				team: 'Kofi in BI',
				ends: [[['b', 'Kofi: I’ve excluded the three accounts by id in the reporting views. Revenue drops by {diff} over the year.'], ['d', 'They’re training accounts in billing, with real invoices raised and credited. Kofi has excluded them from the reporting views, so they no longer appear in revenue.'], ['a', 'Thanks.']]]
			},
			{
				detail: ['No idea.'],
				look: ['Three test and training accounts in billing. Excluding by id would miss the next one. Asked finance systems to mark test accounts in billing so the export carries a flag.'],
				team: 'finance systems',
				ends: [[['d', 'They’re test and training accounts. Rather than leave them out by name, I’ve asked Martin to mark them in billing so the export carries a flag we can filter on.'], ['f', 'Martin: billing has a “non-trading” flag. I’ll set it on all three, but adding it to the export needs the vendor. Request raised.']]]
			}
		]
	},
	// 25. Renewal dates missing.
	{
		from: ['success', 'accountManagers'],
		checks: ['load'],
		why: ['If an account has no renewal date, nobody calls it before renewal, and it renews or leaves without us noticing.'],
		shows: 'renewalBlank',
		subjects: ['Renewal dates missing', 'Blank renewal dates for some accounts', 'Accounts with no renewal date'],
		open: [
			'Some accounts on the Renewals dashboard have no renewal date at all, so they never show up in a renewal month. Are dates being lost?',
			'I’ve found customers with a blank renewal date in the warehouse.',
			'Why do some accounts have no renewal date?'
		],
		more: ['Examples below.', 'I worry we’re missing renewals.', 'They’re mostly older customers.'],
		ask: ['Do these accounts have a renewal date in the CRM?', 'Are they blank in the CRM as well?'],
		paths: [
			{
				detail: ['Blank in the CRM too.'],
				look: ['Accounts created before the CRM was introduced in 2023 were imported without contract dates. {n} accounts on annual contracts have no renewal date. Someone has to find the contracts and enter them.'],
				ends: [[['d', 'They’re blank in the CRM itself: accounts imported when the CRM was set up came over without contract dates. {n} annual-contract accounts are affected. Only the account managers can find the contracts and enter the dates; I’ve sent the list to Liam to share out.'], ['a', 'Thanks. I’ll do mine this week.']]]
			},
			{
				detail: ['Blank there too, but they’re monthly customers.'],
				look: ['All blank ones are rolling monthly contracts, which have no renewal date by design. The CRM leaves the renewal date empty for them, and the export passes the blank through.'],
				ends: [[['d', 'All the blank ones are rolling monthly contracts, which don’t have a renewal date: they continue until the customer gives notice. Nothing is lost. The Renewals dashboard has a filter for annual contracts if you want to hide them.'], ['a', 'Of course. Thanks.']]]
			}
		]
	},
	// 26. A download that opens oddly in Excel.
	{
		from: ['receivables', 'success', 'marketing', 'finance'],
		shows: 'excelView',
		subjects: ['Download opens strangely in Excel', 'Dates wrong when I open the export', 'Spreadsheet from the dashboard is all in one column'],
		open: [
			'When I download the Accounts table and open it in Excel, the dates are a mess. Some are dd/mm and some look like text.',
			'The CSV from the dashboard opens with everything in one column.',
			'Is there a trick to opening the dashboard downloads in Excel?'
		],
		more: ['Screenshot pasted below as text.', 'Colleagues have the same problem.', 'It was fine last month.'],
		ask: ['How are you opening it: double-clicking the file, or importing it from Excel?', 'Do you double-click the download, or use Excel’s import?'],
		paths: [
			{
				detail: ['Double-clicking.'],
				look: ['The download is a normal CSV with ISO dates. Double-clicking makes Excel guess the format, which turns some dates into dd/mm and leaves others as text. Import with Data > From Text and set the date column to YMD.'],
				ends: [[['d', 'The file is fine; it’s Excel guessing when you double-click. If you import it with Data, From Text/CSV, and set the date column to YMD, the dates come through correctly. A one-page guide is on the ops wiki.'], ['a', 'That worked. Thanks!']]]
			},
			{
				detail: ['Double-clicking, and it was fine until a few weeks ago.'],
				look: ['{first}’s dashboard profile language is set to German, so downloads use semicolons. Excel in English expects commas.'],
				ends: [[['d', 'Your dashboard profile was set to German, which makes downloads use semicolons. Kofi has set it back to English, and downloads open normally.'], ['a', 'No idea how that happened. Thanks!']]]
			}
		]
	}
];

// One question.
interface Plan {
	topic: Topic;
	path: Path;
	open: number;
}
const thread = (index: number, plan: Plan, number: number) => {
	const r = mulberry32(7919 * (index + 1) + 104729);
	const { topic, path } = plan;
	const team = pick(r, topic.from);
	const asker = pick(r, askers[team]!);
	const desk = pick(r, deskPeople);
	const pool = shuffle(r, customers);
	const cust = pool[0]!;
	const near = pool.slice(2, 14);
	const open = office(r, plan.open + 8 * 60 + int(r, 20, 560));
	const date = path.today ? startOfDay(open) + 9 * 60 : shiftWorkdays(open, -(path.back ?? int(r, 2, 9)));
	let weekly = startOfDay(open) - DAY;
	while (at(weekly).getUTCDay() !== 6) weekly -= DAY;
	const n = int(r, 4, 28);
	const amounts = Array.from({ length: n }, () => round2(30 + r() * 420));
	const diff = round2(amounts.reduce((a, b) => a + b, 0));
	const ledger = round2(int(r, 362000, 396000) + r());
	const count = int(r, 6, 11);
	const invs = [invoiceNumber(date, int(r, 1, 36)), invoiceNumber(date - int(r, 1, 3) * DAY, int(r, 1, 36))];
	const ownerA = team === 'sales' && asker.role === 'account manager' ? asker.full : cust.owner;
	const ownerB = pick(r, owners.filter((o) => o !== ownerA));
	const ownerC = pick(r, owners.filter((o) => o !== ownerA && o !== ownerB));
	const monthIndex = monthOf(open);
	const monthStartOf = (back: number) => `2026-${pad(((monthIndex + 12 - back) % 12) + 1)}-01`;
	const renew = startOfDay(open) + int(r, 35, 110) * DAY;
	const paid = shiftWorkdays(date, int(r, 0, 2));
	const overdue = int(r, 9, 47);
	const mgr = asker.team === 'leadership' ? 'Catherine Lyle' : managers[asker.team]!;
	const v: Record<string, string> = {
		first: asker.first,
		full: asker.full,
		role: asker.role,
		Role: asker.role.charAt(0).toUpperCase() + asker.role.slice(1),
		team: asker.team === 'success' ? 'customer success' : asker.team,
		desk: desk.first,
		acct: cust.name,
		id: cust.id,
		dupId: `c-${int(r, 2100, 4900)}`,
		plan: cust.plan,
		region: cust.region,
		region2: pick(r, regionNames.filter((name) => name !== cust.region)),
		owner: ownerA,
		owner2: ownerB,
		owner3: ownerC,
		dupOwner: ownerB,
		listName: 'leadership@',
		ownerShown: '',
		stagePaste: '',
		regionShown: 'Unknown',
		leaver: pick(r, leavers),
		colleague: pick(r, colleagues),
		mgr: mgr === asker.full ? 'Simon Achterberg' : mgr,
		mgrFirst: (mgr === asker.full ? 'Simon Achterberg' : mgr).split(' ')[0]!,
		month: previousMonth(open, 1),
		month2: previousMonth(open, 2),
		month3: previousMonth(open, 3),
		monthStart: monthStartOf(1),
		monthEnd: monthStartOf(0),
		renewMonth: monthNames[monthOf(renew)]!,
		renewalDay: iso(renew),
		renewIso: iso(renew),
		renewMinus: iso(renew - DAY),
		date: longDate(date),
		dateShort: shortDate(date),
		dayOf: dayMonth(date),
		iso: iso(date),
		paidDay: longDate(paid),
		paidIso: iso(paid),
		dueIso: iso(startOfDay(open) - overdue * DAY),
		yesterday: longDate(shiftWorkdays(open, -1)),
		yesterdayIso: iso(shiftWorkdays(open, -1)),
		lastInvoice: `2026-${pad(monthIndex + 1)}-01`,
		day: weekday(shiftWorkdays(open, int(r, 1, 4))),
		n: String(n),
		count: String(count),
		fewer: String(count - 2),
		days: String(overdue),
		pct: String(int(r, 52, 81)),
		diff: money(diff),
		ledgerRev: money(ledger),
		dashRev: money(round2(ledger - diff)),
		amount: money(round2(cust.monthly * 1.2 * int(r, 2, 4))),
		inv: invs[0]!,
		inv2: invs[1]!,
		priceKind: 'rolling'
	};
	v.renewalDrop = money(round2((n + 1) * (1500 + r() * 900)));
	const dayNumber = Math.floor(open / DAY);
	v.crmPage = grouped(11700 + dayNumber * 6 + 3800 + dayNumber * 3);
	v.whContacts = grouped(11700 + dayNumber * 6 - int(r, 2, 30));
	v.accountRows = grouped(4110 + dayNumber * 2 - int(r, 2, 9));
	const c: Ctx = { r, open, asker, desk, cust, near, date, renew, weekly, n, amounts, diff, ledger, count, invs, v, now: open };
	// A block pasted twice in one question, by the desk in its note and again in its answer, is the same block.
	const pasted = new Map<string, string>();
	const f = (text: string): string =>
		text.replace(/\{(P:)?([A-Za-z0-9]+)\}/g, (_, isPaste: string | undefined, key: string) => {
			if (isPaste) {
				if (!pasted.has(key)) pasted.set(key, pastes[key]!(c));
				return pasted.get(key)!;
			}
			const value = v[key];
			if (value === undefined) throw new Error(`no value for {${key}} in question ${number}`);
			return value;
		});
	v.ownerShown = v.leaver!;
	for (const [key, value] of Object.entries(path.set ?? {})) v[key] = f(value);

	const messages: string[] = [];
	let t = open;
	const say = (who: Who, body: string) => {
		const p = who === 'a' ? asker : who === 'd' || who === 'n' ? desk : who === 'm' ? person(v.mgr!, managerRoles[v.mgr!]!, asker.team) : others[who];
		if (who === 'x') messages.push(`_${body}_ · ${stamp(t)}`);
		else if (who === 'n') messages.push(`**${p!.full}** · internal note · ${stamp(t)}\n\n${body}`);
		else messages.push(`**${p!.full}** (${who === 'a' ? asker.role : who === 'd' ? 'data desk' : p!.role}) · ${stamp(t)}\n\n${body}`);
	};
	const advance = (who: Who) => {
		const before = t;
		if (who === 'n') t = office(r, t + int(r, 10, 200));
		else if (who === 'x') t = shiftWorkdays(t, 5) + minuteOfDay(t);
		else t = office(r, t + int(r, 15, who === 'a' ? 900 : 500));
		if (t > LAST_MESSAGE) t = before + int(r, 4, 30);
		c.now = t;
	};
	const askerBody = (paragraphs: string[], opening: boolean) => {
		const parts: string[] = [];
		const fitting = greetings.filter((greeting) => (minuteOfDay(t) < 12 * 60 ? !greeting.startsWith('Afternoon') : !greeting.startsWith('Morning')));
		if (opening ? chance(r, 0.85) : chance(r, 0.45)) parts.push(opening ? pick(r, fitting) : `Hi ${desk.first},`);
		const thanked = !opening && /thank/i.test(paragraphs.at(-1)!);
		parts.push(...paragraphs, f(thanked ? '{first}' : pick(r, opening ? askerSign : askerShortSign)));
		return parts.join('\n\n');
	};
	const pendingSide: string[] = [];
	const deskBody = (paragraphs: string[], more = false) => {
		const extra = pendingSide.splice(0);
		const closing = more && chance(r, 0.4) ? [pick(r, closings)] : [];
		const hello = /^(Hi|Hello|Morning|Thanks|Sorry)\b/.test(paragraphs[0]!) || paragraphs[0]!.startsWith(`${asker.first},`) ? [] : [pick(r, [`Hi ${asker.first},`, `Hello ${asker.first},`, `Hi ${asker.first},`])];
		const signs = paragraphs.some((paragraph) => /^Thanks/.test(paragraph)) ? deskSign.filter((sign) => !sign.startsWith('Thanks')) : deskSign;
		return [...hello, ...paragraphs, ...extra, ...closing, f(pick(r, signs))].join('\n\n');
	};
	const otherBody = (who: Who, text: string) => {
		const name = who === 'm' ? v.mgrFirst! : others[who]?.first ?? '';
		return who === 'x' || text.startsWith(name) ? text : `${text}\n\n${name}`;
	};

	// 1. The question.
	// Lines that name the asker as a third person are left out of their own question.
	const own = (texts: string[] | undefined) => (texts ?? []).filter((text) => !new RegExp(`\\b${asker.first}\\b`).test(text));
	const tangent = chance(r, 0.45) ? pick(r, tangents) : undefined;
	const opening = [f(pick(r, own(topic.open).length ? own(topic.open) : topic.open))];
	if (chance(r, 0.45)) opening.unshift(f(pick(r, contexts).replace('{colleague}', v.colleague!)));
	const why = own(topic.why);
	if (why.length && chance(r, 0.6)) opening.push(f(pick(r, why)));
	const forward = topic.forwards && chance(r, 0.6) ? pick(r, topic.forwards) : undefined;
	if (forward && forward[2] !== asker.first) opening.push(`${forward[0]}\n\n${f(forward[1]).split('\n').map((line) => (line ? `> ${line}` : '>')).join('\n')}`);
	const more = own(topic.more);
	if (more.length && chance(r, 0.8)) opening.push(f(pick(r, more)));
	if (topic.shows && chance(r, 0.9)) opening.push(f(`{P:${topic.shows}}`));
	if (tangent) opening.push(tangent.q);
	say('a', askerBody(opening, true));

	// 2. The desk asks.
	advance('d');
	const ask = f(pick(r, topic.ask));
	say('d', deskBody([`${f(pick(r, acks))} ${ask}${chance(r, 0.4) ? ` ${pick(r, plans2)}` : ''}`, ...(tangent ? [tangent.a] : [])], true));

	// 3. The answer, and perhaps a second matter.
	advance('a');
	const side = chance(r, 0.5) ? pick(r, tangents.filter((x) => x !== tangent)) : undefined;
	const answer = [f(pick(r, path.detail))];
	if (path.paste) answer.push(f(`{P:${path.paste}}`));
	if (side) {
		answer.push(side.q);
		pendingSide.push(side.a);
	}
	say('a', askerBody(answer, false));

	// 4. The desk looks, perhaps first where the cause is not.
	if (topic.checks && chance(r, 0.85)) {
		const keys = shuffle(r, topic.checks).slice(0, chance(r, 0.5) ? 2 : 1);
		for (const key of keys) {
			advance('n');
			const [texts, paste] = firstLooks[key]!;
			say('n', `${pick(r, texts)}\n\n${f(`{P:${paste}}`)}`);
		}
	}
	advance('n');
	const note = [f(pick(r, path.look))];
	if (path.lookPaste) note.push(f(`{P:${path.lookPaste}}`));
	if (path.extra) note.push(f(`{P:${path.extra}}`));
	say('n', note.join('\n\n'));

	// 5. Sometimes a wait, always when a second matter would otherwise go unanswered.
	const end = pick(r, path.ends);
	const answered = end.some(([who]) => who === 'd');
	if ((path.team && chance(r, 0.6)) || (pendingSide.length && !answered)) {
		advance('d');
		say('d', deskBody([f(pick(r, holding).replaceAll('{team}', path.team ?? 'the right people'))], true));
		if (chance(r, 0.5)) {
			advance('a');
			say('a', askerBody([f(pick(r, chasers))], false));
		}
	}

	// 6. The end. The desk may show the asker what it found.
	const thanks = side?.then && chance(r, 0.6) ? side.then : '';
	let shown = !path.lookPaste || /^(loadLog|appendRun)/.test(path.lookPaste) || !chance(r, 0.6);
	end.forEach(([who, body], i) => {
		advance(who);
		let text = f(body);
		if (who === 'd' && !shown && !text.includes('```') && !text.includes('| ---')) {
			text += `\n\n${pick(r, evidence)}\n\n${f(`{P:${path.lookPaste}}`)}`;
			shown = true;
		}
		if (who === 'a') say('a', askerBody(i === end.length - 1 && thanks ? [text, thanks] : [text], false));
		else if (who === 'd') say('d', deskBody([text]));
		else say(who, otherBody(who, text));
	});

	// 7. Sometimes a follow-up once the main matter is settled.
	const later = topic.after && chance(r, 0.5) ? pick(r, topic.after) : chance(r, 0.3) ? (([x]) => (x ? [x.q, x.a] : undefined))(shuffle(r, tangents).filter((x) => x !== tangent && x !== side)) : undefined;
	if (later && end.at(-1)![0] !== 'x') {
		const [q, a] = later;
		advance('a');
		say('a', askerBody([f(q)], false));
		advance('d');
		say('d', deskBody([f(a)]));
	}

	const subject = f(pick(r, topic.subjects));
	const channel = pick(r, ['by email', 'by email', 'through the data desk form', 'forwarded from the #data-questions channel']);
	return [`# DQ-${number}: ${subject}`, `From ${asker.full} (${asker.role}) · ${longDate(open)}, ${clock(open)} · ${channel}`, ...messages.map((message) => `---\n\n${message}`)].join('\n\n') + '\n';
};

// Which topic and path each question follows: topics are dealt in rounds, each round in a new order, and the paths
// of a topic in turn, so that two questions on one topic end differently until its paths run out.
const order = mulberry32(20260907);
const schedule: Plan[] = [];
const used = new Map<Topic, number>();
const deck: Topic[] = [];
for (let index = 0; index < ITEMS; index++) {
	const open = workdays[Math.floor((index * workdays.length) / ITEMS)]!;
	const allowed = (topic: Topic) => !topic.since || iso(open) >= topic.since;
	if (!deck.some(allowed)) deck.push(...shuffle(order, topics));
	const topic = deck.splice(deck.findIndex(allowed), 1)[0]!;
	const seen = used.get(topic) ?? 0;
	used.set(topic, seen + 1);
	schedule.push({ topic, path: topic.paths[(seen + topics.indexOf(topic)) % topic.paths.length]!, open });
}

const folder = join(root, 'docs', 'data-questions');
mkdirSync(folder, { recursive: true });
let number = 1140;
schedule.forEach((plan, index) => {
	number += int(order, 1, 3);
	writeFileSync(join(folder, `dq-${number}.md`), thread(index, plan, number));
});
writeFileSync(
	join(folder, 'README.md'),
	`# Data desk questions, 7 September to 13 November 2026\n\nThe ${ITEMS} questions colleagues sent the data desk in these ten weeks, one file each, exported from the shared inbox on\n20 November 2026 before it moved to the service desk tool. The export kept the messages and the desk's internal\nnotes, but not the labels, statuses or assignees. Numbers missing from the sequence were spam, out-of-office replies\nor merged into another question. Query results and logs in internal notes are as the desk pasted them.\n`
);
