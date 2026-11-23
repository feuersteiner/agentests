// Writes the long material of this entry's long tasks: the support tickets that Tidewell support escalated to the
// analytics team between 5 January and 13 March 2026, one Markdown file each, under docs/escalations/.
// Deterministic: fixed seeds, no clock, no network.
//   bun long/generate.ts <workspace root>
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** How many tickets to write. Dates, numbering and everything else follow from it. */
const ITEMS = 348;

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
const shuffle = <T>(r: Rand, items: readonly T[]): T[] => {
	const copy = [...items];
	for (let i = copy.length - 1; i > 0; i--) {
		const j = Math.floor(r() * (i + 1));
		[copy[i], copy[j]] = [copy[j]!, copy[i]!];
	}
	return copy;
};
const cap = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const pad = (value: number, width = 2) => String(value).padStart(width, '0');
const hex = (r: Rand, width: number) => Math.floor(r() * 16 ** width).toString(16).padStart(width, '0');

// ---------------------------------------------------------------------------------------------------------------
// Calendar. Tickets open on working days from 5 January to 13 March 2026; threads run on working days after that.

const iso = (d: Date) => d.toISOString().slice(0, 10);
const at = (date: string) => new Date(`${date}T12:00:00Z`);
const holidays = new Set(['2026-04-03', '2026-04-06']);
const isWorkday = (date: string) => {
	const day = at(date).getUTCDay();
	return day >= 1 && day <= 5 && !holidays.has(date);
};
const addDays = (date: string, days: number) => {
	const d = at(date);
	d.setUTCDate(d.getUTCDate() + days);
	return iso(d);
};
const addWork = (date: string, days: number) => {
	let out = date;
	for (let left = days; left > 0; ) {
		out = addDays(out, 1);
		if (isWorkday(out)) left--;
	}
	return out;
};
const subWork = (date: string, days: number) => {
	let out = date;
	for (let left = days; left > 0; ) {
		out = addDays(out, -1);
		if (isWorkday(out)) left--;
	}
	return out;
};
const workdays: string[] = [];
for (let d = '2026-01-05'; d <= '2026-03-13'; d = addDays(d, 1)) if (isWorkday(d)) workdays.push(d);

const monthsEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const shortMonths: Record<string, string[]> = {
	en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
	nl: ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'],
	fr: ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'],
	sv: ['jan.', 'feb.', 'mars', 'apr.', 'maj', 'juni', 'juli', 'aug.', 'sep.', 'okt.', 'nov.', 'dec.'],
	da: ['jan.', 'feb.', 'mar.', 'apr.', 'maj', 'jun.', 'jul.', 'aug.', 'sep.', 'okt.', 'nov.', 'dec.'],
	pl: ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru']
};
/** 14 Jan 2026: how the helpdesk shows dates. */
const disp = (date: string) => `${Number(date.slice(8))} ${shortMonths.en![Number(date.slice(5, 7)) - 1]} ${date.slice(0, 4)}`;
/** A date as a report formats it for a locale. */
const localDate = (date: string, locale: string) => {
	const [y, m, d] = [date.slice(0, 4), Number(date.slice(5, 7)), Number(date.slice(8))];
	if (locale.startsWith('de')) return `${pad(d)}.${pad(m)}.${y}`;
	if (locale === 'da-DK') return `${d}. ${shortMonths.da![m - 1]} ${y}`;
	const lang = locale.slice(0, 2);
	return `${d} ${(shortMonths[lang] ?? shortMonths.en!)[m - 1]} ${y}`;
};
const ordinal = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th'}`;
const longDate = (date: string) => `${Number(date.slice(8))} ${monthsEn[Number(date.slice(5, 7)) - 1]}`;

// ---------------------------------------------------------------------------------------------------------------
// Money as a report formats it.

const symbols: Record<string, string> = { GBP: '£', EUR: '€', CHF: 'CHF', SEK: 'kr', DKK: 'kr.', PLN: 'zł' };
const group = (digits: string, sep: string) => digits.replace(/\B(?=(\d{3})+$)/g, sep);
const money = (cents: number, cur: string, locale: string): string => {
	const abs = Math.abs(Math.round(cents));
	const whole = String(Math.floor(abs / 100));
	const dec = pad(abs % 100);
	const sym = symbols[cur]!;
	switch (locale) {
		case 'en-GB':
		case 'en-IE':
			return cur === 'GBP' || cur === 'EUR' ? `${sym}${group(whole, ',')}.${dec}` : `${cur} ${group(whole, ',')}.${dec}`;
		case 'de-CH':
			return `${cur} ${group(whole, '’')}.${dec}`;
		case 'nl-NL':
			return `${sym} ${group(whole, '.')},${dec}`;
		case 'de-DE':
		case 'de-AT':
		case 'da-DK':
			return `${group(whole, '.')},${dec} ${sym}`;
		default:
			return `${group(whole, ' ')},${dec} ${sym}`;
	}
};
const count = (value: number) => group(String(value), ',');

// ---------------------------------------------------------------------------------------------------------------
// Customers. Each organisation keeps the same contacts across its tickets.

type Lang = 'en' | 'de' | 'nl' | 'fr' | 'sv' | 'da' | 'pl';
type Role = 'viewer' | 'analyst' | 'finance' | 'admin';
interface Org {
	index: number;
	name: string;
	id: string;
	prefix: string;
	cur: string[];
	locale: string;
	lang: Lang;
	regions: string[];
	zone: string;
}
const zones: Record<string, string> = {
	'en-GB': 'Europe/London', 'en-IE': 'Europe/Dublin', 'de-DE': 'Europe/Berlin', 'de-AT': 'Europe/Vienna', 'de-CH': 'Europe/Zurich',
	'nl-NL': 'Europe/Amsterdam', 'fr-FR': 'Europe/Paris', 'sv-SE': 'Europe/Stockholm', 'da-DK': 'Europe/Copenhagen', 'pl-PL': 'Europe/Warsaw'
};
const localeNames: Record<string, string> = {
	'en-GB': 'English (United Kingdom)', 'en-IE': 'English (Ireland)', 'en-US': 'English (United States)', 'de-DE': 'Deutsch (Deutschland)',
	'de-AT': 'Deutsch (Österreich)', 'de-CH': 'Deutsch (Schweiz)', 'nl-NL': 'Nederlands (Nederland)', 'fr-FR': 'Français (France)',
	'sv-SE': 'Svenska (Sverige)', 'da-DK': 'Dansk (Danmark)', 'pl-PL': 'Polski (Polska)'
};
const orgs: Org[] = [
	['Harrow & Pike Interiors', 'harrowpike', 'HP', 'GBP', 'en-GB', 'north south midlands scotland'],
	['Falkenried Leuchten', 'falkenried', 'FL', 'EUR', 'de-DE', 'nord süd west ost'],
	['Vossberg Fahrräder', 'vossberg', 'VB', 'EUR', 'de-DE', 'nord sued online'],
	['Huis ter Duin Wonen', 'huisterduin', 'HD', 'EUR', 'nl-NL', 'noord zuid randstad'],
	['Calder Valley Outdoor', 'caldervalley', 'CV', 'GBP', 'en-GB', 'north south online'],
	['Maison Ferrand', 'ferrand', 'MF', 'EUR', 'fr-FR', 'nord sud idf'],
	['Fjällgården Design', 'fjallgarden', 'FG', 'SEK EUR', 'sv-SE', 'norr syd stockholm export'],
	['Brightwater Garden Supplies', 'brightwater', 'BW', 'GBP', 'en-GB', 'north south east west'],
	['Kowalski Meble', 'kowalskimeble', 'KM', 'PLN EUR', 'pl-PL', 'polnoc poludnie export'],
	['Alpenrose Käserei', 'alpenrose', 'AR', 'CHF EUR', 'de-CH', 'deutschschweiz romandie export'],
	['Ballycastle Woollens', 'ballycastle', 'BC', 'EUR GBP', 'en-IE', 'north south online uk'],
	['Wiener Papeterie', 'wienerpapeterie', 'WP', 'EUR', 'de-AT', 'wien west sued'],
	['Saltire Coffee Roasters', 'saltire', 'SC', 'GBP', 'en-GB', 'scotland north south'],
	['Nordhavn Cykler', 'nordhavn', 'NC', 'DKK EUR', 'da-DK', 'sjaelland jylland export'],
	['Pennant Books', 'pennant', 'PB', 'GBP', 'en-GB', 'wales north south'],
	['Moerland Bloemen', 'moerland', 'MB', 'EUR', 'nl-NL', 'noord zuid export'],
	['Rheinfeld Weinhandel', 'rheinfeld', 'RW', 'EUR', 'de-DE', 'nord süd online'],
	['Thornbury Ceramics', 'thornbury', 'TC', 'GBP EUR', 'en-GB', 'north south export'],
	['Atelier Blanc', 'atelierblanc', 'AB', 'EUR', 'fr-FR', 'nord sud paris'],
	['Greywell Pet Supplies', 'greywell', 'GP', 'GBP', 'en-GB', 'north south midlands'],
	['Hafenkontor Tee', 'hafenkontor', 'HK', 'EUR', 'de-DE', 'nord süd west'],
	['Ashgrove Kitchens', 'ashgrove', 'AK', 'GBP', 'en-GB', 'north south east'],
	['Björkvik Textil', 'bjorkvik', 'BT', 'SEK', 'sv-SE', 'norr syd vast'],
	['Corran Distillery', 'corran', 'CD', 'GBP EUR', 'en-GB', 'scotland england export'],
	['Tulpenhof Kaas', 'tulpenhof', 'TK', 'EUR', 'nl-NL', 'noord zuid oost'],
	['Feldmark Bio', 'feldmark', 'FB', 'EUR', 'de-DE', 'nord süd ost west'],
	['Quayside Cycles', 'quayside', 'QC', 'GBP', 'en-GB', 'north south online'],
	['Hollins Stationery', 'hollins', 'HS', 'GBP', 'en-GB', 'north south trade'],
	['Bergquell Getränke', 'bergquell', 'BQ', 'EUR', 'de-DE', 'nord süd gastro'],
	['Kilnworth Glass', 'kilnworth', 'KG', 'GBP', 'en-GB', 'north south trade'],
	['Zeeland Zeilmakers', 'zeeland', 'ZZ', 'EUR', 'nl-NL', 'zeeland randstad export'],
	['Mira Ceramika', 'miraceramika', 'MC', 'PLN', 'pl-PL', 'polnoc poludnie centrum'],
	['Elbstrand Möbel', 'elbstrand', 'EM', 'EUR', 'de-DE', 'nord süd online'],
	['Copperfield Lighting', 'copperfield', 'CL', 'GBP', 'en-GB', 'north south trade'],
	['Lumière et Fils', 'lumierefils', 'LF', 'EUR', 'fr-FR', 'nord sud ouest'],
	['Strandvejen Living', 'strandvejen', 'SL', 'DKK', 'da-DK', 'sjaelland jylland fyn']
].map(([name, slug, prefix, cur, locale, regions], index) => ({
	index,
	name: name!,
	id: `org_${slug}`,
	prefix: prefix!,
	cur: cur!.split(' '),
	locale: locale!,
	lang: locale!.slice(0, 2) as Lang,
	regions: regions!.split(' '),
	zone: zones[locale!]!
}));

// First and last names by language, paired by position, so that no two organisations share a contact. An underscore joins a
// surname of two words.
const names: Record<Lang, [string, string]> = {
	en: ['Selina Owen Hattie Daniel Fiona Gareth Priya Tom Niamh Callum Jess Martin Rachel Ben Leah Imran Gemma Stuart Aisha Rhys Kirsty Joel Megan Samir Lucy Craig Yasmin Duncan Holly Ewan Zara Neil Freya Adam Bethan Kieran Mollie Tariq Isla Grant Eleanor Dev', 'Hart Pryce Brennan Okoro Mackay Lloyd Raman Whitcombe Doyle Reid Abara Cole Osei Hartley Summers Shah Tolley Fraser Begum Morgan Lennox Parry Ashworth Malik Fenwick Doherty Hussain Munro Baxter Sinclair Ahmed Garside Ellison Whitaker Pugh Gallacher Rowntree Qadir Buchanan Heald Corbyn Patel'],
	de: ['Katrin Jannik Miriam Lukas Svenja Florian Anja Tobias Sabine Matthias Ulrike Deniz Heike Moritz Carina Benedikt Julia Sven Nadine Felix Petra Kai Lena Ralf Birte Timo Elke', 'Vogel Albrecht Stein Hartmann Koch Brandt Weiß Engel Kraus Roth Seidel Kaya Lorenz Pohl Wendt Haas Keller Böhm Arnold Busch Franke Lehmann Ziegler Vogt Martens Ernst Schuster'],
	nl: ['Femke Joost Lotte Pieter Anouk Bram Sanne Ruben Eva Thijs Iris Daan', 'de_Vries Bakker Visser Smit Jansen Mulder Peeters Dekker van_Dijk Bos Meijer Hendriks'],
	fr: ['Claire Mathieu Élodie Julien Camille Nicolas Sophie Antoine Margaux', 'Dubois Laurent Moreau Petit Roux Garnier Lefèvre Fontaine Chevalier'],
	sv: ['Linnea Oskar Maja Erik Ida Gustav', 'Berg Holm Lund Sjöberg Nyström Ekman'],
	da: ['Mette Rasmus Signe Anders Freja Mikkel', 'Kjær Holt Dahl Bech Lund Thomsen'],
	pl: ['Agnieszka Piotr Kasia Marek Ewa Tomasz', 'Nowak Zieliński Wójcik Lewandowski Kamińska Dąbrowski']
};
const titles: [string, Role][] = [
	['Finance Manager', 'finance'], ['BI Analyst', 'analyst'], ['Managing Director', 'admin'], ['Data Analyst', 'analyst'], ['Head of Finance', 'finance'],
	['Sales Operations Lead', 'analyst'], ['E-commerce Manager', 'viewer'], ['Operations Director', 'admin'], ['Controller', 'finance'], ['Office Manager', 'viewer'], ['IT Manager', 'admin']
];
interface Person {
	first: string;
	full: string;
	title: string;
	role: Role;
}
const contacts = (org: Org): Person[] => {
	const rank = orgs.filter((other) => other.lang === org.lang).indexOf(org);
	const [firsts, lasts] = names[org.lang].map((list) => list.split(' ').map((name) => name.replace('_', ' ')));
	return [0, 1, 2].map((k) => {
		const first = firsts![rank * 3 + k]!;
		const last = lasts![rank * 3 + k]!;
		const [title, role] = titles[(org.index * 2 + k * 3) % titles.length]!;
		return { first, full: `${first} ${last}`, title, role };
	});
};

const agents = ['Marta', 'Kwabena', 'Ines', 'Hester', 'Tomasz', 'Aoife'];
const engineers = ['Ravi Natarajan', 'Elin Sundberg', 'Joaquín Ferreyra', 'Ngozi Eze', 'Pavel Hrubý'];
const buyers = ['anna', 'j.owen', 'sophie.k', 'mkeller', 'r.patel', 'lotte', 'hb', 'claire.d', 'tomas', 'nina.w', 'g.ross', 'evans', 'liv', 'k.berg', 'paul', 'f.amari', 'dee', 'marco'];
const mailDomains = ['post.example', 'inbox.example', 'mailbox.example', 'web.example', 'net.example', 'home.example'];

// ---------------------------------------------------------------------------------------------------------------
// Pasted output: report rows, pipelines, run histories, logs and stack traces.

interface Row {
	id: string;
	date: string;
	region: string;
	email: string;
	status: 'paid' | 'refunded';
	rev: number;
	margin: number;
	cur: string;
}
const rowsFor = (x: X, from: string, to: string, n: number, opts: { regions?: string[]; curs?: string[]; refunds?: number } = {}): Row[] => {
	const r = x.r;
	const span = Math.max(0, Math.round((at(to).getTime() - at(from).getTime()) / 86400000));
	let id = int(r, 20000, 69000);
	const dates = Array.from({ length: n }, () => addDays(from, int(r, 0, span))).sort();
	return dates.map((date) => {
		id += int(r, 1, 40);
		const rev = int(r, 18, 2400) * 100 + pick(r, [0, 0, 50, 95, 99]);
		return {
			id: `${x.org.prefix}-${id}`,
			date,
			region: pick(r, opts.regions ?? x.org.regions),
			email: `${pick(r, buyers)}@${pick(r, mailDomains)}`,
			status: r() < (opts.refunds ?? 0.1) ? 'refunded' : 'paid',
			rev,
			margin: Math.round(rev * (0.18 + r() * 0.22)),
			cur: pick(r, opts.curs ?? [x.org.cur[0]!])
		};
	});
};
const mask = (email: string) => `${email[0]}***${email.slice(email.indexOf('@'))}`;
/** The orders report as the requester sees it: masked by their role, formatted by their locale, in the first row's currency. */
const ordersCells = (x: X, rows: Row[]): [string[], string[][]] => {
	const seesMargin = x.role === 'finance' || x.role === 'admin';
	const cur = rows[0]?.cur ?? 'EUR';
	const columns = ['order', 'placed on', 'region', 'customer', 'status', 'revenue', ...(seesMargin ? ['margin'] : [])];
	const cells = rows.map((row) => [
		row.id,
		localDate(row.date, x.locale),
		row.region,
		x.role === 'admin' ? row.email : mask(row.email),
		row.status,
		money(row.rev, cur, x.locale),
		...(seesMargin ? [money(row.margin, cur, x.locale)] : [])
	]);
	return [columns, cells];
};
const ordersReport = (x: X, rows: Row[], style: 'table' | 'json') => render('orders', ...ordersCells(x, rows), style);
const regionCells = (x: X, rows: Row[]): [string[], string[][]] => {
	const seesMargin = x.role === 'finance' || x.role === 'admin';
	const cur = rows[0]?.cur ?? 'EUR';
	const totals = new Map<string, { n: number; rev: number; margin: number }>();
	for (const row of rows.filter((item) => item.status === 'paid')) {
		const total = totals.get(row.region) ?? { n: 0, rev: 0, margin: 0 };
		total.n += 1;
		total.rev += row.rev;
		total.margin += row.margin;
		totals.set(row.region, total);
	}
	const columns = ['region', 'orders', 'revenue', ...(seesMargin ? ['margin'] : [])];
	const cells = [...totals.entries()]
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([region, t]) => [region, String(t.n), money(t.rev, cur, x.locale), ...(seesMargin ? [money(t.margin, cur, x.locale)] : [])]);
	return [columns, cells];
};
const regionReport = (x: X, rows: Row[], style: 'table' | 'json') => render('revenue-by-region', ...regionCells(x, rows), style);
/** GET /dashboards/:id as the browser's network tab shows it. */
const dashboardJson = (x: X, id: string, title: string, widgets: [string, Row[]][]) => {
	const q = (value: string) => JSON.stringify(value);
	const widget = ([name, rows]: [string, Row[]]) => {
		const [columns, cells] = regionCells(x, rows);
		return ['    {', `      "title": ${q(name)},`, '      "report": {', '        "reportId": "revenue-by-region",', `        "columns": [${columns.map(q).join(', ')}],`, '        "rows": [', cells.map((row) => `          [${row.map(q).join(', ')}]`).join(',\n'), '        ]', '      }', '    }'].join('\n');
	};
	return ['```json', '{', `  "id": ${q(id)},`, `  "title": ${q(title)},`, '  "widgets": [', widgets.map(widget).join(',\n'), '  ]', '}', '```'].join('\n');
};
const documents: [string, string][] = [
	['Q4 review', 'Sales grew in every region except the south, where the shop refit closed the store for three weeks in November.'],
	['Price list 2026', 'Prices below apply from 1 February. Trade customers keep their agreed discount on every line unless stated.'],
	['Holiday rota, spring', 'Please book Easter leave by the end of February. Shop staff swap shifts through their manager, not the rota sheet.'],
	['Returns policy for trade customers', 'Trade customers may return unopened stock within 60 days. Opened stock is credited at the discretion of the account manager.'],
	['Supplier onboarding checklist', 'Before the first purchase order, every supplier needs bank details checked by finance and a signed code of conduct.'],
	['Delivery cut-off times', 'Orders placed before 14:00 leave the warehouse the same day. Orders for the islands and the Highlands add two days.'],
	['Manager handbook', 'This handbook covers opening and closing, cash handling, staff rotas and what to do when the alarm goes off at night.'],
	['Spring range brief', 'The spring range has 42 new lines, mostly in the garden and outdoor categories, landing in shops from the second week of March.'],
	['Warehouse safety induction', 'Everyone who works in the warehouse completes this induction on their first day, including agency staff and drivers.'],
	['Trade account terms', 'Trade accounts are invoiced monthly and pay within 30 days. Accounts more than 60 days overdue are put on hold.'],
	['Marketing calendar', 'Campaigns for the year by month, with the owner of each and the date the artwork has to reach the printers.'],
	['Shop opening hours', 'Standard hours are 09:00 to 17:30, Monday to Saturday. Bank holiday hours are agreed with each shop manager in advance.'],
	['Packaging guidelines', 'Use the recycled boxes for every parcel under 5 kg. Fragile items go in the double-wall boxes with paper fill, never plastic.'],
	['Customer service scripts', 'Opening lines, holding lines and closing lines for phone and chat, with the escalation route for complaints.'],
	['Expenses policy', 'Claims go in through the expenses form by the fifth working day of the month, with a receipt for anything over ten pounds.'],
	['New starter checklist', 'Everything a manager needs to arrange before a new starter arrives: account, keys, uniform, induction and a buddy.']
];
const searchJson = (x: X, hits: [string, string][]) =>
	'```json\n' + (hits.length ? `{\n  "hits": [\n${hits.map(([title, body]) => `    { "id": "doc-${int(x.r, 1000, 9999)}", "title": ${JSON.stringify(title)}, "snippet": ${JSON.stringify(body.slice(0, 80))} }`).join(',\n')}\n  ]\n}` : '{\n  "hits": []\n}') + '\n```';
const cp1252: Record<number, string> = { 0x80: '€', 0x82: '‚', 0x84: '„', 0x85: '…', 0x89: '‰', 0x8a: 'Š', 0x8c: 'Œ', 0x91: '‘', 0x92: '’', 0x93: '“', 0x94: '”', 0x96: '–', 0x97: '—', 0x99: '™', 0x9a: 'š', 0x9c: 'œ', 0x9f: 'Ÿ' };
/** UTF-8 text as Excel shows it when it reads the file as Windows-1252. */
const garble = (text: string) => [...new TextEncoder().encode(text)].map((b) => (b >= 0x80 && b < 0xa0 ? cp1252[b] ?? '?' : String.fromCharCode(b))).join('');
const render = (reportId: string, columns: string[], cells: string[][], style: 'table' | 'json'): string => {
	if (style === 'table')
		return [`| ${columns.join(' | ')} |`, `| ${columns.map(() => '---').join(' | ')} |`, ...cells.map((row) => `| ${row.join(' | ')} |`)].join('\n');
	const q = (value: string) => JSON.stringify(value);
	return ['```json', '{', `  "reportId": ${q(reportId)},`, `  "columns": [${columns.map(q).join(', ')}],`, '  "rows": [', cells.map((row) => `    [${row.map(q).join(', ')}]`).join(',\n'), '  ]', '}', '```'].join('\n');
};
const table = (head: string[], rows: string[][]) =>
	[`| ${head.join(' | ')} |`, `| ${head.map((h) => (/^(rows|took|count|orders|errors)/i.test(h) ? '---:' : '---')).join(' | ')} |`, ...rows.map((row) => `| ${row.join(' | ')} |`)].join('\n');

interface Step {
	id: string;
	op: 'load' | 'filter' | 'sum';
	args: Record<string, string>;
	inputs: string[];
}
const load = (id = 'orders', tableName = 'orders'): Step => ({ id, op: 'load', args: { table: tableName }, inputs: [] });
const filter = (id: string, field: string, equals: string, input: string): Step => ({ id, op: 'filter', args: { field, equals }, inputs: [input] });
const sum = (id: string, field: string, by: string, input: string): Step => ({ id, op: 'sum', args: { field, by }, inputs: [input] });
const pipelineJson = (id: string, steps: Step[]) => {
	const q = (value: string) => JSON.stringify(value);
	const line = (s: Step) =>
		`    { "id": ${q(s.id)}, "op": ${q(s.op)}, "args": { ${Object.entries(s.args).map(([k, v]) => `${q(k)}: ${q(v)}`).join(', ')} }, "inputs": [${s.inputs.map(q).join(', ')}] }`;
	return ['```json', '{', `  "id": ${q(id)},`, '  "steps": [', steps.map(line).join(',\n'), '  ]', '}', '```'].join('\n');
};
/** The pipeline page's run history, newest first. */
const runHistory = (x: X, day: string, runs: number, failing: (i: number) => string | undefined, took: () => string) => {
	const rows: string[][] = [];
	const hour = int(x.r, 9, 16);
	for (let i = 0; i < runs; i++) {
		const h = hour - i;
		const date = h < 0 ? addDays(day, -1) : day;
		const message = failing(i);
		rows.push([`${disp(date)}, ${pad((h + 24) % 24)}:00`, message ? 'failed' : 'succeeded', took(), message ?? '']);
	}
	return table(['Run', 'Status', 'Took', 'Message'], rows);
};
const stepCounts = (rows: [string, string, number][]) => table(['Step', 'Op', 'Rows out'], rows.map(([id, op, n]) => [id, op, count(n)]));
const outputJson = (rows: Record<string, string | number | null>[]) => '```json\n[\n' + rows.map((row) => `  ${JSON.stringify(row)}`).join(',\n') + '\n]\n```';
const accessLog = (x: X, day: string, lines: [string, number][], spread = 3600) => {
	let second = int(x.r, 8 * 3600, 15 * 3600);
	const user = () => `u-${hex(x.r, 6)}`;
	const users = [user(), user(), user()];
	const out = lines.map(([path, status]) => {
		second += int(x.r, 20, spread);
		const time = `${pad(Math.floor(second / 3600) % 24)}:${pad(Math.floor(second / 60) % 60)}:${pad(second % 60)}.${pad(int(x.r, 0, 999), 3)}`;
		return `${day}T${time}Z GET ${path} ${status} ${status === 500 ? int(x.r, 2, 9) : int(x.r, 12, 240)}ms org=${x.org.id} user=${pick(x.r, users)} req=${hex(x.r, 8)}`;
	});
	return '```text\n' + out.join('\n') + '\n```';
};
const stack = (lines: string[]) => '```text\n' + lines.join('\n') + '\n```';
const srv = '/srv/tidewell-analytics/src';
const sql = (query: string, head: string[], rows: string[][]) => {
	const widths = head.map((h, i) => Math.max(h.length, ...rows.map((row) => row[i]!.length)));
	const line = (cells: string[]) => ' ' + cells.map((c, i) => c.padStart(widths[i]!)).join(' | ');
	return ['```text', `warehouse=> ${query}`, line(head), '-' + widths.map((w) => '-'.repeat(w)).join('-+-') + '-', ...rows.map(line), `(${rows.length} row${rows.length === 1 ? '' : 's'})`, '```'].join('\n');
};

// ---------------------------------------------------------------------------------------------------------------
// Topics. `area` and the outcome of a ticket are never written into a file: they are only in the conversation.

type Area = 'reports' | 'dashboards' | 'search' | 'pipelines' | 'other';
type Outcome = 'answered' | 'fixed' | 'bug' | 'request' | 'waiting';
interface X {
	r: Rand;
	org: Org;
	who: Person;
	role: Role;
	locale: string;
	opened: string;
	s: Record<string, string>;
}
interface Topic {
	area: Area;
	orgs?: (org: Org) => boolean;
	slots?: (x: X) => Record<string, string>;
	allow?: (x: X) => Outcome[];
	subjects: string[];
	open: string[];
	ask: string[];
	more: string[];
	look: string[];
	follow: [string, string][];
	waitFor: string[];
	/** What the customer tried before writing in. */
	tried: string[];
	/** What the customer pastes. */
	art?: (x: X) => string;
	/** Whether a second paste of the same kind makes sense, as another example. */
	repeat?: boolean;
	/** What the engineer pastes in the internal note. */
	proof?: (x: X) => string;
	/** Each ending is a script: one message per line, "C:" customer, "S:" support, "N:" support's internal note, "E:" the engineer's internal note; " ¶ " breaks paragraphs. */
	end: Partial<Record<Exclude<Outcome, 'waiting'>, string[]>>;
}
const multi = (org: Org) => org.cur.length > 1;
const abroad = (org: Org) => org.zone !== 'Europe/London' && org.zone !== 'Europe/Dublin';

const topics: Topic[] = [
	// 1. The end date of a report is left out.
	{
		area: 'reports',
		repeat: true,
		slots: (x) => {
			const lost = int(x.r, 3, 19);
			return { lost: String(lost), kept: String(int(x.r, 40, 400)) };
		},
		subjects: ['{pmShort} figures do not match our shop', 'Orders missing from the orders report', 'Report total lower than our shop system', 'Last day of the month missing?', 'Dashboard numbers short again'],
		open: [
			'We run the orders report every month with the first and last day of the month as the dates, and the total never matches our shop system. For {pm} we are {lost} orders short. I went through them one by one, and every order that is missing was placed on {pmToDisp}.',
			'If I enter {pmFromDisp} to {pmToDisp} in the orders report, nothing from {pmToDisp} itself appears, although we took orders that day. When I set the end date one day later, the orders are there. Is the end date supposed to be left out?',
			'The "{pmShort} orders" widget on our sales dashboard shows fewer orders than our shop reports for the same month, {lost} fewer this time. Finance reconcile the month against the bank, and they have asked me to find out why it never agrees.'
		],
		ask: [
			'Could you send the exact dates you entered and one order number that is missing, so that we can look it up?',
			'Which dates are you using? If you copy the address from your browser bar while the report is open, we can see exactly what was asked for.'
		],
		more: [
			'The dates were {pmFrom} and {pmTo}. One of the missing orders is {orderId}, placed on {pmToDisp} for {amount}.',
			'The address bar says /reports/orders?from={pmFrom}&to={pmTo}. Here is the end of what the report gave us: the last order in it is from {pmToPrevDisp}, and our shop shows {lost} more on {pmToDisp}.'
		],
		look: [
			'The warehouse has {lost} orders for {orgId} with placed_on {pmTo}, so the nightly load has them. The report for {pmFrom} to {pmTo} returns {kept} rows and none from the {pmToDay}; with {pmToNext} as the end date it returns all of them. Looking at the date filter next.',
			'The warehouse has {lost} orders for {orgId} on {pmTo}, and the report returns none of them with that as its end date. Same with any end date I try.'
		],
		follow: [
			['Is it only the orders report, or does revenue-by-region do the same?', 'Both reports use the same date filter, so they behave the same way. The dashboard widgets run the same reports, which is why the widget is short as well.'],
			['Should we set the end date one day later for now?', 'Yes, that gives you the whole period. Leave the start date as it is: the start date is already included.']
		],
		tried: ['I checked that the orders are in our shop system with the right dates, and they are.', 'I tried revenue-by-region for the same dates, and it is short in the same way.'],
		waitFor: ['the dates you entered and one missing order number', 'the address of the report page with the dates in it'],
		art: (x) => ordersReport(x, rowsFor(x, x.s.pmToMinus3!, x.s.pmToPrev!, int(x.r, 5, 9)), 'table'),
		proof: (x) => sql(`select placed_on, count(*) from orders where org_id = '${x.org.id}' and placed_on >= '${x.s.pmToPrev}' group by 1 order by 1;`, ['placed_on', 'count'], [[x.s.pmToPrev!, String(int(x.r, 4, 30))], [x.s.pmTo!, x.s.lost!], [x.s.pmToNext!, String(int(x.r, 2, 25))]]),
		end: {
			bug: [
				'E: Found it: the report filter compares placed_on with `<` against `to`, so the end date is excluded, while the report page and the help centre both call it the last day included. This is ANL-233; linked this ticket to it. Not fixed yet.\nS: Hi {first}, our engineers have confirmed that reports currently leave out the orders placed on the end date. That is a fault on our side: the end date is meant to be included. It is logged as a bug, and your ticket is attached to it so that you hear when it is fixed. ¶ Until then, please set the end date one day later than the last day you want.\nC: That explains three months of arguments with finance. We will add the extra day until you tell us otherwise.',
				'E: Same cause as the other end-date tickets this quarter: the end date is treated as exclusive in the reports service. Linked to ANL-233, which is still open.\nS: Thank you for your patience, {first}. This is a known fault: a report leaves out the orders placed on its end date. Our engineers are working from one bug report for everyone who has raised it, and your ticket is now attached to it. ¶ In the meantime, using the day after your last day as the end date gives the right figures.\nC: A bit surprised this is known and not fixed, to be honest, but thanks for the workaround.'
			]
		}
	},
	// 2. A report covering two currencies formats every amount in one of them.
	{
		area: 'reports',
		repeat: true,
		orgs: multi,
		subjects: ['Wrong currency on reports', 'Revenue far too high on some days', '{cur2} orders shown as {cur1}', 'Totals do not make sense'],
		open: [
			'We sell in {cur1} and {cur2}. In the orders report every amount carries the {cur1} format, including the orders our {cur2} shop took, so a {cur2} order of {amtNative} shows as {amtWrong}. The revenue-by-region totals then add the two together as if they were the same money.',
			'Since we started selling in {cur2}, the revenue figures in the reports look far too high in some regions. Looking closer, the {cur2} orders are shown as if they were {cur1}, and on days when the {cur2} shop has the first order of the period it is the other way round.'
		],
		ask: ['Does this happen on every report, or only when the period includes orders in both currencies?', 'Could you send the rows of one affected report, with the order numbers, so that we can compare them with the warehouse?'],
		more: [
			'Only when both shops have orders in the period. If I filter to {region2}, where only the {cur2} shop sells, the amounts are shown in {cur2} and look right.',
			'Here are a few rows from this morning. {orderId} was paid in {cur2}.'
		],
		look: [
			'Their orders for the period are in both currencies, and the warehouse has the right currency on every row. The report formats every amount in the table with a single currency.',
			'Checked {orderId}: currency {cur2} in the warehouse, shown in {cur1} format in the report. The revenue-by-region totals add the cents of both currencies.'
		],
		follow: [
			['Is the money itself right, just with the wrong symbol?', 'The amount of each order is right; only the symbol and format are wrong. The totals in revenue-by-region are wrong, though, because they add the two currencies together.'],
			['Can we at least see which orders were in which currency?', 'The warehouse holds the currency of every order, but the reports do not show it as a column today.']
		],
		tried: ['I checked the shop: each order has the right currency there.', 'I tried another browser and another user, and the amounts look the same.'],
		waitFor: ['an answer on whether it happens only when both currencies are in the period', 'the rows of one affected report with the order numbers'],
		art: (x) => ordersReport(x, rowsFor(x, x.s.weekAgo!, x.opened, int(x.r, 6, 10), { curs: [x.org.cur[0]!, x.org.cur[1]!] }), 'table'),
		proof: (x) => sql(`select order_id, currency, revenue_cents from orders where org_id = '${x.org.id}' and placed_on = '${x.s.weekAgo}' order by order_id;`, ['order_id', 'currency', 'revenue_cents'], rowsFor(x, x.s.weekAgo!, x.s.weekAgo!, int(x.r, 3, 6), { curs: [x.org.cur[0]!, x.org.cur[1]!] }).map((row) => [row.id, row.cur, String(row.rev)])),
		end: {
			bug: [
				'E: The reports service takes the currency of the first row and formats the whole table with it, and the totals ignore currency altogether. Linked to ANL-241. It needs a decision on how mixed currencies should be shown, so there is no date.\nS: Hi {first}, our engineers have confirmed the fault: when a report covers orders in more than one currency, every amount is shown in one of them, and the totals add them together. It is logged, and your ticket is attached to it. ¶ Until it is fixed, filtering a report by a region that sells in one currency gives correct figures for that region.\nC: Thank you. We will split the figures by region for the board pack until then.'
			],
			request: [
				'E: Reports were built for one currency per organisation, and {orgId} is one of the few with two. Showing both properly needs a currency column and totals per currency, which is new work rather than a fix. Raised it with product as a request.\nS: Hi {first}, I have an answer from the team. Our reports were designed around a single currency per organisation, so orders in a second currency are shown in the first one. Supporting both properly means new work, and I have logged it as a feature request with your example attached. I am sorry it is not a quicker answer.\nC: Disappointing, but thanks for being straight about it. Please count us as very interested.'
			]
		}
	},
	// 3. The region filter matches exactly.
	{
		area: 'reports',
		slots: (x) => {
			const bad = pick(x.r, [cap(x.s.region!), x.s.region!.toUpperCase()]);
			return { bad, badUrl: encodeURIComponent(bad), regionUrl: encodeURIComponent(x.s.region!) };
		},
		subjects: ['Region filter shows nothing', 'Empty report for {bad}', 'Regional links broken?', 'Filter by region not working'],
		open: [
			'The orders report comes back empty when I ask for {bad} as the region, but there are definitely orders there. Without the filter I can see plenty of them.',
			'Each of our regional managers has a link to the orders report for their own region. {colleague}\'s link, for {bad}, has shown an empty report since we set them up, while the others work.'
		],
		ask: ['How do you choose the region: from the list on the report page, or in a link?', 'Could you send the link you use, exactly as it is?'],
		more: [
			'It is a link our intranet builds: /reports/orders?region={badUrl}. The others are built the same way, from the names in our staff directory.',
			'We typed the links into a spreadsheet when we set them up. This one is /reports/orders?region={badUrl}&from={pmFrom}.'
		],
		look: ['Their order rows have region "{region}". The link asks for "{bad}". The filter compares the value exactly, so nothing matches.', 'No fault in the report: region "{bad}" has no rows for {orgId}; region "{region}" has {n} hundred-odd this quarter.'],
		follow: [
			['Why does it not just ignore capitals?', 'The region filter compares the value exactly as it is stored, the same way the rest of the reports do.'],
			['Where do the region names come from in the first place?', 'From your shop data, as the connection sends it each night. We store the names as they arrive.']
		],
		tried: ['I tried the same link with the other regions, and they all work.', 'I checked that the region exists by running the report without a filter.'],
		waitFor: ['a word on how you choose the region', 'the exact link that shows the empty report'],
		art: (x) => '```text\n' + `https://app.tidewell.example/reports/orders?region=${x.s.badUrl}\n\n0 orders match these filters.` + '\n```',
		proof: (x) => sql(`select region, count(*) from orders where org_id = '${x.org.id}' group by 1 order by 1;`, ['region', 'count'], x.org.regions.map((region) => [region, String(int(x.r, 300, 4000))])),
		end: {
			answered: [
				'S: Hi {first}, we found it. The region filter matches the region exactly as it is stored, and your orders are stored as "{region}", while the link asks for "{bad}". If you change the link to region={regionUrl}, the rows appear.\nC: Changed it and it works. Thanks, and sorry for the trouble.',
				'S: Thanks for waiting, {first}. The link is the cause: it asks for "{bad}", and the orders are stored with the region "{region}". The filter has to match exactly, capitals included. {colleague} will see the orders once the link says region={regionUrl}.\nC: Fixed in the spreadsheet. Everything shows now.'
			],
			request: [
				'S: Hi {first}, the filter compares the region exactly, and your orders are stored as "{region}", so a link asking for "{bad}" finds nothing. Changing the link fixes it.\nC: Thanks, that worked. Could the filter not ignore capitals, though? We will make this mistake again with the next manager.\nS: That is a fair point. I have logged it as a feature request for the reports team, with your example.'
			]
		}
	},
	// 4. A script asks for a report under the wrong name.
	{
		area: 'reports',
		slots: (x) => {
			const good = pick(x.r, ['revenue-by-region', 'orders']);
			const bad = good === 'orders' ? pick(x.r, ['order', 'Orders', 'orders-report']) : pick(x.r, ['revenue_by_region', 'Revenue-by-region', 'revenue-by-regions', 'revenue-region']);
			return { good, bad };
		},
		subjects: ['Export script failing with 404', '"report not found"', 'Nightly export stopped', 'API returns 404 since this week'],
		open: [
			'Our nightly script that pulls the {good} report into our finance workbook has failed every night since {weekday}. It gets a 404 with "report not found". Nothing has changed on our side, as far as I know.',
			'I am trying to fetch the {good} report from a small script, and I get {"error":"report not found"} back. The same report opens fine in the web app.'
		],
		ask: ['Could you send the address the script requests, with the dates if there are any? Please leave out anything that looks like a password or a session cookie.', 'Could you send the script\'s output for the last few nights?'],
		more: ['It calls https://api.tidewell.example/reports/{bad}?from={pmFrom}&to={pmToNext}, signed in as our reporting user.', 'Here is the output of the last few nights.'],
		look: ['The script asks for /reports/{bad}. The saved reports are "orders" and "revenue-by-region"; anything else answers 404 report not found, which is what they get.', 'Their requests: /reports/{bad}, every night at 02:00, all 404. No request for /reports/{good} since {weekday}.'],
		follow: [
			['Is there a list of report names somewhere?', 'There are two saved reports, "orders" and "revenue-by-region", written exactly like that. The API page of the help centre lists them.'],
			['Does the script need anything else, such as a version in the address?', 'No. The address is the report name and, if you want them, the from, to and region parameters.']
		],
		tried: ['I tried the same address in the browser, and it gives the same error.', 'I checked that the reporting user can still sign in to the web app, and it can.'],
		waitFor: ['the address the script requests', 'the script\'s output from the last few nights'],
		art: (x) => {
			const lines: string[] = [];
			let day = subWork(x.opened, 4);
			for (let i = 0; i < int(x.r, 4, 7); i++, day = addDays(day, 1)) lines.push(`${day} 02:00:${pad(int(x.r, 1, 9))} fetch ${x.s.bad} -> 404 {"error":"report not found"}`, `${day} 02:00:${pad(int(x.r, 10, 20))} workbook not updated`);
			return '```text\n' + lines.join('\n') + '\n```';
		},
		proof: (x) => accessLog(x, subWork(x.opened, 1), Array.from({ length: int(x.r, 3, 5) }, () => [`/reports/${x.s.bad}?from=${x.s.pmFrom}&to=${x.s.pmToNext}`, 404] as [string, number]), 20),
		end: {
			answered: [
				'S: Hi {first}, the script asks for a report called "{bad}", and the report is called "{good}". The name has to match exactly, dashes and capitals included. With /reports/{good} it will work again.\nC: Found it. {colleague} tidied the script on {weekday} and changed the name. It should run tonight.\nC: Confirmed, last night\'s run worked. Thanks.',
				'S: Thanks, {first}, that showed it. The address says /reports/{bad}, and the report\'s name is "{good}". Change that one word and the script will get the report again.\nC: Embarrassing. That was my edit. All working now.'
			],
			request: [
				'S: Hi {first}, the script asks for a report called "{bad}", and the report is called "{good}". The name has to match exactly. With /reports/{good} it will work again.\nC: Thanks, fixed. Could the error say which reports exist? It would have saved us a day.\nS: Good idea. I have logged it as a feature request for the API team.'
			]
		}
	},
	// 5. The orders report includes refunds; revenue-by-region does not.
	{
		area: 'reports',
		repeat: true,
		slots: (x) => {
			const b = int(x.r, 400, 9000) * 1000;
			const refunds = int(x.r, 3, 24);
			const back = int(x.r, 150, 900) * refunds * 10;
			return { refunds: String(refunds), amtA: money(b + back, x.org.cur[0]!, x.locale), amtB: money(b, x.org.cur[0]!, x.locale) };
		},
		subjects: ['Orders report and revenue report disagree', 'Two reports, two totals', 'Which revenue figure is right?', 'Revenue difference between reports'],
		open: [
			'The orders report and the revenue-by-region report give different revenue for the same dates. For {pm} the revenue column of the orders report adds up to {amtA}, and revenue-by-region says {amtB}. Which one should go in our monthly pack?',
			'I am confused by two of your reports. {colleague} adds up the orders report in a spreadsheet and gets {amtA} for {pm}; revenue-by-region gives {amtB} for the same month.'
		],
		ask: ['Were any of the orders in that period refunded?', 'Which dates and which region did you use for each report?'],
		more: ['Yes, {refunds} of them, as far as I can see. Here are a few rows.', 'The whole of {pm} for both, no region. And yes, there were refunds, {refunds} I think.'],
		look: ['The difference between their two totals is exactly the revenue of the refunded orders in {pm}.', 'Summed their {pm} orders by status in the warehouse. The gap between the two figures matches the refunded ones to the cent.'],
		follow: [
			['So which one is right?', 'Both are, for what each shows. For revenue you keep, revenue-by-region is the figure to use.'],
			['Does revenue-by-region leave anything else out?', 'Only refunded orders. Every paid order in the period counts, in whichever region it was placed.']
		],
		tried: ['I checked the dates on both reports twice.', 'I added up the orders report again in case the spreadsheet formula was wrong, and it was not.'],
		waitFor: ['an answer on whether any orders in the period were refunded', 'the dates and region you used for each report'],
		art: (x) => ordersReport(x, rowsFor(x, x.s.pmFrom!, x.s.pmTo!, int(x.r, 6, 10), { refunds: 0.35 }), 'table'),
		proof: (x) => sql(`select status, count(*), sum(revenue_cents) from orders where org_id = '${x.org.id}' and placed_on between '${x.s.pmFrom}' and '${x.s.pmTo}' group by 1;`, ['status', 'count', 'sum'], [['paid', String(int(x.r, 120, 900)), String(int(x.r, 400000, 9000000))], ['refunded', x.s.refunds!, String(int(x.r, 4000, 90000))]]),
		end: {
			answered: [
				'S: Hi {first}, the difference is the refunds. The orders report lists every order in the period with its status, refunded ones included, so adding up its revenue column counts them. Revenue-by-region counts paid orders only. The {refunds} refunded orders in {pm} make up the whole difference.\nC: Of course. Thank you, I will tell {colleague} to leave the refunds out first.'
			],
			request: [
				'S: Hi {first}, the difference is the refunds. The orders report lists every order with its status, refunded ones included; revenue-by-region counts paid orders only.\nC: That makes sense. Could revenue-by-region show the refunds as a column of their own, though? Finance want both figures side by side.\nS: I have logged that as a feature request for the reports team, with your example.'
			]
		}
	},
	// 6. Order dates are UTC dates.
	{
		area: 'reports',
		repeat: true,
		orgs: abroad,
		slots: (x) => {
			const date = subWork(x.opened, int(x.r, 2, 8));
			const minute = int(x.r, 2, 55);
			return { day: date, dayDisp: disp(date), prevDisp: disp(addDays(date, -1)), time: `00:${pad(minute)}`, utc: `23:${pad(minute)}` };
		},
		subjects: ['Order on the wrong day', 'Daily figures off by one order', 'Midnight orders counted on the previous day', 'Order dates wrong?'],
		open: [
			'An order we took at {time} on {dayDisp} shows as placed on {prevDisp} in the orders report. It throws out our daily figures, because our shop counts it on {dayDisp}.',
			'Our daily sales by date never quite match the shop. The difference is always the orders placed just after midnight, which your reports put on the day before.'
		],
		ask: ['Which time zone is your shop set to?', 'Could you send an order number or two, with the time the shop shows for them?'],
		more: ['{zone}. We are an hour ahead of London in winter.', 'Order {orderId}, {time} on {dayDisp} by our shop\'s clock. The shop is set to {zone}.'],
		look: ['placed_on comes from the nightly load, which turns the shop\'s timestamp into a date in UTC. {orderId}: {time} in {zone} is {utc} UTC on the previous day.', 'Checked their connection settings and the raw order from the shop: {time} local time, stored as the previous date.'],
		follow: [
			['Does that affect the monthly figures too?', 'Only at the edges: an order placed in the first hour of a month in your time zone counts towards the month before.'],
			['Is that the same for every customer?', 'Yes, every organisation\'s order dates are dates in UTC.']
		],
		tried: ['I checked the order in the shop, and the time is definitely just after midnight.', 'I looked at a few other days, and it is always the orders placed just after midnight.'],
		waitFor: ['the time zone your shop is set to', 'an order number and the time your shop shows for it'],
		art: (x) => {
			const rows = rowsFor(x, addDays(x.s.day!, -3), addDays(x.s.day!, 1), int(x.r, 6, 9));
			rows.splice(Math.floor(rows.length / 2), 0, { ...rows[0]!, id: x.s.orderId!, date: addDays(x.s.day!, -1), status: 'paid' });
			return ordersReport(x, rows.sort((a, b) => a.date.localeCompare(b.date)), 'table');
		},
		proof: (x) => sql(`select order_id, shop_created_at, placed_on from orders where org_id = '${x.org.id}' and order_id = '${x.s.orderId}';`, ['order_id', 'shop_created_at', 'placed_on'], [[x.s.orderId!, `${x.s.day}T${x.s.time}:${pad(int(x.r, 0, 59))}+01:00`, addDays(x.s.day!, -1)]]),
		end: {
			answered: [
				'S: Hi {first}, the dates in reports are dates in UTC, for every customer, so an order placed in the first hour of the day in {zone} counts on the day before. {orderId} was placed at {time} your time, which is {utc} UTC the previous evening. Nothing is lost: it is counted, one day earlier than your shop counts it.\nC: Understood. I will explain it to finance; they can live with it now that they know.'
			],
			request: [
				'S: Hi {first}, the dates in reports are dates in UTC, so an order placed at {time} in {zone} counts on the day before.\nC: Could we not have the dates in our own time zone? We are not in London.\nS: That is not possible today. I have logged a feature request for a time zone setting per organisation, with your example.\nC: Thank you. Please let us know if it happens.'
			]
		}
	},
	// 7. A saved report that does not exist.
	{
		area: 'reports',
		slots: (x) => {
			const [want, desc, cols, how] = pick(x.r, [
				['top customers', 'the customers who spent most in the period, with their number of orders', 'customer, orders, revenue', 'the orders report for the period, sorted by customer in a spreadsheet, gives the same thing'],
				['monthly revenue', 'revenue for each month of the year side by side', 'month, orders, revenue', 'revenue-by-region run once per month and pasted side by side gives the figures, if not the layout'],
				['refunds by region', 'refunded orders and their value, by region', 'region, refunds, refunded revenue', 'the orders report filtered to one region lists the refunds with their status, so they can be counted'],
				['average order value', 'the average value of a paid order, by region', 'region, average order', 'revenue-by-region already gives the paid orders and the revenue per region, and one divided by the other is the average'],
				['first and repeat orders', 'how much revenue comes from first orders and how much from repeat customers', 'type, orders, revenue', 'the orders report lists the customer of each order, so a spreadsheet can tell first orders from repeat ones']
			] as const);
			return { want, desc, cols, how };
		},
		subjects: ['Request: {want} report', 'Can we have a {want} report?', 'New report?', 'Report for {want}'],
		open: [
			'Is there a way to get a {want} report? We would like {desc}. At the moment {colleague} builds it every month from the orders report in a spreadsheet, and it takes most of a morning.',
			'Our management team has asked for {desc}. I could not find a report that does it. Am I missing something?'
		],
		ask: ['Could you tell me which columns you would want, and how often you would look at it?', 'How would you use it: on a dashboard, in an export, or both?'],
		more: ['Monthly, for the management meeting. The columns would be {cols}, for the whole organisation and per region.', 'On a dashboard, ideally, with {cols} as the columns. We look at it every Monday.'],
		look: ['No saved report does this. It is possible by hand from the orders report.', 'Checked with product: nothing like it is planned for this quarter. {orgId} is the second customer to ask for {want} this year.'],
		follow: [
			['Can we build our own reports?', 'Not today. Saved reports are built by Tidewell; you choose the dates and region when you run them.'],
			['How long does a new report usually take?', 'It depends on the queue. Reports that several customers ask for go first.']
		],
		tried: ['I looked through the list of saved reports and the help centre.', 'I tried to get there with the orders report on a dashboard, but there is nowhere to group the rows.'],
		waitFor: ['the columns you would want and how often you would look at it', 'a word on whether you would use it on a dashboard, in an export or both'],
		end: {
			request: [
				'E: Logged on the product board as a request, with their columns and use. No commitment on timing.\nS: Hi {first}, there is no saved report for {want} today. I have logged your request with the columns you described, so that product can weigh it with the others. I cannot promise a date, but I will let you know if it is scheduled.\nC: Thank you, that is all I can ask.'
			],
			answered: [
				'S: Hi {first}, there is no saved report for {want}, but {how}. If that is not good enough, tell me and I will raise a request.\nC: That will do for now. {colleague} says it is quicker than what she was doing.'
			]
		}
	},
	// 8. Money and dates formatted for another locale.
	{
		area: 'reports',
		repeat: true,
		slots: (x) => {
			const other = pick(x.r, ['en-US', 'de-CH', 'sv-SE', 'de-DE', 'en-GB', 'fr-FR', 'nl-NL'].filter((locale) => locale !== x.org.locale));
			const shown = other === 'en-US' ? 'en-GB' : other;
			const cents = int(x.r, 1000, 900000);
			const changed = subWork(x.opened, int(x.r, 3, 9));
			return {
				otherCode: shown,
				other: localeNames[other]!,
				own: localeNames[x.org.locale]!,
				sampleOther: other === 'en-US' ? `${x.org.cur[0] === 'GBP' ? '£' : x.org.cur[0] === 'EUR' ? '€' : x.org.cur[0] + ' '}${group(String(Math.floor(cents / 100)), ',')}.${pad(cents % 100)}` : money(cents, x.org.cur[0]!, shown),
				sampleOwn: money(cents, x.org.cur[0]!, x.org.locale),
				dateOther: other === 'en-US' ? `${shortMonths.en![Number(x.s.weekAgo!.slice(5, 7)) - 1]} ${Number(x.s.weekAgo!.slice(8))}, ${x.s.weekAgo!.slice(0, 4)}` : localDate(x.s.weekAgo!, shown),
				dateOwn: localDate(x.s.weekAgo!, x.org.locale),
				changed: disp(changed)
			};
		},
		subjects: ['Strange number format in reports', 'Commas and dots swapped', 'Amounts look wrong for one user', 'Our workbook cannot read the amounts any more'],
		open: [
			'Since {weekday} the amounts in my reports look like {sampleOther} instead of {sampleOwn}, and the dates have changed too, to {dateOther}. I have not changed any settings that I know of.',
			'One of our analysts, {colleague}, sees amounts as {sampleOther} and dates as {dateOther}, while the rest of us see {sampleOwn} and {dateOwn}. When she pastes figures into our workbook, they come out as text.'
		],
		ask: ['Could you check the language and region in the profile, under the name at the top right, and tell me what it says?', 'Does it happen on every report and dashboard for that person, or only in some places?'],
		more: ['It says {other}. I did not choose that.', 'Everywhere, reports and dashboards. The profile says {other}.'],
		look: ['Reports for this user are formatted for {other}, which is the locale on the user\'s profile. Checking the account history for where it came from.', 'The user\'s profile locale is {other}; everyone else at {orgId} has {own}.'],
		follow: [
			['Does the format change the numbers themselves?', 'No. Only the way they are written changes; the amounts are the same.'],
			['Why do reports not just use one format for everyone?', 'Each person sees money and dates in the language and region of their profile, so that people in different countries can read them naturally.']
		],
		tried: ['I signed out and back in, and nothing changed.', 'I tried another browser, and it looks the same there.'],
		waitFor: ['what the language and region in the profile say', 'a word on whether it happens on every report and dashboard'],
		art: (x) => ordersReport({ ...x, locale: x.s.otherCode! }, rowsFor(x, x.s.weekAgo!, x.opened, int(x.r, 5, 8)), 'table'),
		end: {
			fixed: [
				'E: The locale came from the user import on {changed}: their staff file had a language column, and the import mapped it to the profile locale. Set the user back to {own} and checked the rest of {orgId}; nobody else was changed.\nS: Hi {first}, this was on our side. When your users were imported on {changed}, the import set the language on the profile to {other}. We have put it back to {own}, and reports show the usual format again.\nC: All back to normal. Thank you!'
			],
			answered: [
				'S: Hi {first}, reports format money and dates in the language and region set on each person\'s profile. The profile was switched to {other} on {changed}, from the profile page itself, perhaps by accident. Choosing {own} under the name at the top right brings the usual format back.\nC: That was it. I must have clicked it when I changed my password. Thank you.'
			],
			request: [
				'S: Hi {first}, reports format money and dates in the language and region of each person\'s profile, and this profile is set to {other}. Choosing {own} there brings the usual format back.\nC: Done, thanks. Could exports give plain numbers whatever the profile says? Our workbook breaks every time someone has a different setting.\nS: That is a sensible request. I have logged it for the team.'
			]
		}
	},
	// 9. A deleted dashboard answers with a server error.
	{
		area: 'dashboards',
		slots: (x) => {
			const [title, id] = pick(x.r, [['Weekly trading', 'dash-weekly'], ['Regional overview', 'dash-regions'], ['Board summary', 'dash-board'], ['Sales overview', 'dash-sales'], ['Shop managers', 'dash-shops'], ['Trade accounts', 'dash-trade']] as const);
			return { dash: title, dashId: id, deleted: disp(subWork(x.opened, int(x.r, 2, 6))) };
		},
		subjects: ['"Something went wrong" on a dashboard', 'Dashboard will not open', 'Error when opening {dash}', 'Bookmark broken'],
		open: [
			'Several of our people get "Something went wrong" when they open the {dash} dashboard from their bookmarks. Our other dashboards open fine.',
			'Since {weekday}, the link to our {dash} dashboard in our weekly email just shows an error page. It worked the week before.'
		],
		ask: ['Could you send the link from one of the bookmarks?', 'Does it fail for everyone, or only for some people?'],
		more: ['For everyone who has the bookmark. The link is https://app.tidewell.example/dashboards/{dashId}.', 'Everyone. Now that I look, I do not see {dash} in the list of dashboards at all.'],
		look: ['Access log for {orgId}: every GET /dashboards/{dashId} since {deleted} answers 500. The audit trail shows the dashboard was deleted on {deleted} by {colleague}.', 'The dashboard {dashId} no longer exists for {orgId}: deleted on {deleted}. The requests for it fail with a 500.'],
		follow: [
			['Can you bring it back?', 'A deleted dashboard cannot be restored, but it can be rebuilt from the same saved reports in a few minutes.'],
			['Who deleted it?', 'The audit trail shows {colleague}, on {deleted}. Any admin of your organisation can see the trail under Settings.']
		],
		tried: ['I tried another browser, and from home, and it is the same.', 'I restarted my computer, for what it is worth, and it made no difference.'],
		waitFor: ['the link from one of the bookmarks', 'a word on whether it fails for everyone or only for some people'],
		art: (x) => '```text\n' + `https://app.tidewell.example/dashboards/${x.s.dashId}\n\nSomething went wrong\nWe could not load this page. Please try again in a few minutes.\nReference: ${hex(x.r, 8)}` + '\n```',
		proof: (x) =>
			accessLog(x, subWork(x.opened, 1), Array.from({ length: int(x.r, 3, 6) }, () => [`/dashboards/${x.s.dashId}`, 500] as [string, number])) +
			'\n\n' +
			stack([`DashboardNotFoundError: No dashboard ${x.s.dashId}`, `    at renderDashboard (${srv}/dashboards/render.ts:26:28)`, `    at handle (${srv}/routes.ts:35:56)`]),
		end: {
			bug: [
				'E: So the 500 is renderDashboard throwing DashboardNotFoundError, which the API does not turn into a 404; the web app can only show its generic error page. Linked to ANL-256, open.\nS: Hi {first}, the {dash} dashboard was deleted on {deleted}, which is why the bookmarks fail. It cannot be restored, but you can rebuild it from the same reports. ¶ The error page should have said that the dashboard no longer exists, instead of "Something went wrong". That part is a fault on our side; it is logged as a bug, and I have attached your ticket so that you hear when it is fixed.\nC: Ah. {colleague} thought it was a copy. We will rebuild it, and thanks for logging the error page.'
			],
			answered: [
				'S: Hi {first}, I have found it: the {dash} dashboard was deleted on {deleted} by {colleague}, so the bookmarks point to something that no longer exists. Deleted dashboards cannot be restored, but you can rebuild it from the same reports under Dashboards, New.\nC: Mystery solved, {colleague} was tidying up. We will rebuild it. Thanks.'
			]
		}
	},
	// 10. A widget shows a different figure from the report.
	{
		area: 'dashboards',
		repeat: true,
		slots: (x) => {
			const b = int(x.r, 300, 9000) * 1000;
			return {
				widget: pick(x.r, ['Revenue by region', 'Paid revenue', 'Regional revenue', 'Revenue this month']),
				dash: pick(x.r, ['Sales overview', 'Weekly trading', 'Management']),
				amtA: money(Math.round(b * (0.3 + x.r() * 0.4)), x.org.cur[0]!, x.locale),
				amtB: money(b, x.org.cur[0]!, x.locale)
			};
		},
		subjects: ['Dashboard and report show different numbers', 'Widget total wrong?', '"{widget}" widget does not match the report', 'Which figure is right?'],
		open: [
			'The "{widget}" widget on our {dash} dashboard shows {amtA}, and when I run revenue-by-region myself for the same month I get {amtB}. Which is right?',
			'Our sales team trusts the dashboard, finance trusts the report, and they disagree. The widget "{widget}" is much lower than revenue-by-region for {pm}.'
		],
		ask: ['Which dashboard is it, and what dates do you use when you run the report yourself?', 'Could you open the widget\'s settings and tell me what filters it has?'],
		more: ['The {dash} dashboard. I ran revenue-by-region for {pmFromDisp} to {pmToDisp}, no region.', 'I cannot see any filters on it, but I may be looking in the wrong place. The report I ran had the whole of {pm}.'],
		look: ['The widget\'s saved filters: region "{region}" and the dates of {pm}. The report the customer runs has no region.', 'Widget on {dash}: report revenue-by-region, params {"region": "{region}"}. The figure matches the report filtered to {region}.'],
		follow: [
			['Do widgets keep their own filters, then?', 'Yes. Each widget runs its report with the filters saved on it, which can differ from what you choose when you run the report yourself.'],
			['Can I see a widget\'s filters without editing it?', 'Not at the moment: they are shown when you edit the widget.']
		],
		tried: ['I ran the report twice to be sure.', 'I checked the dates on the dashboard, and they cover the whole month.'],
		waitFor: ['the name of the dashboard and the dates you used for the report', 'the filters shown in the widget\'s settings'],
		proof: (x) => '```json\n' + JSON.stringify({ title: x.s.widget, reportId: 'revenue-by-region', params: { from: x.s.pmFrom, to: x.s.pmTo, region: x.s.region } }, null, 2) + '\n```',
		art: (x) => regionReport(x, rowsFor(x, x.s.pmFrom!, x.s.pmTo!, int(x.r, 8, 14), { refunds: 0.05 }), 'table'),
		end: {
			answered: [
				'S: Hi {first}, the widget has filters of its own: it is set to the region "{region}", while you ran the report for every region. The widget\'s figure is right for {region}, and the report\'s for the whole organisation. Editing the widget shows its filters, and you can remove the region there if the widget should cover everything.\nC: I had no idea widgets kept their own filters. That explains it. Thank you.'
			],
			fixed: [
				'E: The region filter is not one the customer set. It came from the move to saved reports in the autumn: their old widget had a map view zoomed to {region}, and the migration turned that into a region filter. Removed it after confirming with the customer, and checked their other widgets; all as built.\nS: Hi {first}, this was a slip on our side. When dashboards moved to saved reports in the autumn, the "{widget}" widget was given a region filter, {region}, that nobody at {org} set. We have removed it, and the widget now agrees with the report.\nC: Thank you. Glad to know it was not us.'
			],
			request: [
				'S: Hi {first}, the widget has filters of its own: it is set to the region "{region}", while you ran the report for every region. Editing the widget shows its filters.\nC: Found it, thanks. Could the widget show its filters on the dashboard itself? Nobody would ever think to look.\nS: I agree it would help. I have logged it as a request for the dashboards team.'
			]
		}
	},
	// 11. Linking a widget to its report.
	{
		area: 'dashboards',
		slots: (x) => ({ dash: pick(x.r, ['Sales overview', 'Weekly trading', 'Shop managers', 'Regional overview']) }),
		subjects: ['Click through from a dashboard to the report?', 'Link widgets to the full report', 'Drill down from a widget', 'Feature question: widget links'],
		open: [
			'Is there a way to click through from a dashboard widget to the full report behind it? Our managers look at the dashboard and then ask me for the detail, and I have to work out which report and filters the widget uses.',
			'Feature question: when someone clicks a widget on a dashboard, can it open the report it comes from, with the same filters? It seems the obvious thing to do and nothing happens.'
		],
		ask: ['Which dashboards would you use this on most?', 'Would opening the report in a new tab be enough, or do you want the detail on the dashboard itself?'],
		more: ['Mainly {dash}. The managers would use it daily.', 'A new tab would be perfect. {dash} is the one that matters.'],
		look: ['The rendered dashboard carries each widget\'s title and its report output, but not which report it ran, so the web app has nothing to link to.', 'Talked to the web app team: they can build the link easily once they know each widget\'s report.'],
		follow: [
			['Is this something other customers have asked for?', 'Yes, a few. It comes up whenever a dashboard is shared with people who do not build reports themselves.'],
			['Could we at least see the report\'s name on the widget?', 'The widget shows the title you gave it. The report and filters are shown when you edit the widget.']
		],
		tried: ['I looked in the dashboard settings and found nothing like it.', 'I tried clicking the widget title and the figures, and nothing happens.'],
		waitFor: ['the dashboards you would use this on', 'a word on whether a link that opens the report in a new tab would do'],
		art: (x) => dashboardJson(x, `dash-${x.s.dash!.split(' ')[0]!.toLowerCase()}`, x.s.dash!, [['Revenue by region', rowsFor(x, x.s.pmFrom!, x.s.pmTo!, int(x.r, 6, 10), { refunds: 0 })], [`${x.s.pmShort} revenue`, rowsFor(x, x.s.pmFrom!, x.s.pmTo!, int(x.r, 4, 8), { refunds: 0 })]]),
		end: {
			request: [
				'E: The web app team agree it is worth doing; it needs the API to send each widget\'s report id first. Logged as a request on both sides; not scheduled.\nS: Hi {first}, I have checked with the team. Widgets cannot link to their reports today, and making it possible needs changes in two places. I have logged it as a feature request with your use case, and I will let you know if it is scheduled.\nC: Thanks, please do.'
			],
			answered: [
				'S: Hi {first}, widgets cannot link to their report yet. The quickest route for now: editing a widget shows its report and filters, and running that report under Reports with the same filters gives the full detail.\nC: That will do. I will put the filters on a crib sheet for the managers.'
			]
		}
	},
	// 12. Printing a dashboard.
	{
		area: 'dashboards',
		slots: (x) => ({ dash: pick(x.r, ['Board summary', 'Management', 'Sales overview', 'Monthly pack']), browser: pick(x.r, ['Edge, with Ctrl+P', 'Chrome, from the File menu', 'Safari on a Mac', 'Firefox, Ctrl+P']) }),
		subjects: ['Printing a dashboard cuts widgets off', 'PDF of dashboard for board pack', 'Print layout broken', 'Dashboard to PDF'],
		open: [
			'When I print the {dash} dashboard to PDF for the board pack, the right-hand widgets are cut off and the tables run over two pages.',
			'Every month I put the {dash} dashboard into our board pack as a PDF, and every month I spend half an hour fixing the layout in a PDF editor because the widgets do not fit the page.'
		],
		ask: ['Which browser do you print from, and do you use the browser\'s own print command or the Print button on the dashboard?', 'How many widgets does the dashboard have, and are any of them tables?'],
		more: ['{browser}. I did not know there was a Print button.', '{browser}. Six widgets, two of them long tables.'],
		look: ['Printed their layout from staging with the browser\'s own print and with the dashboard\'s Print button. The browser print uses the screen layout and cuts off the third column.', 'Nothing broken here: the browser print command uses the screen layout, which is wider than a page.'],
		follow: [
			['Can the PDF have our logo on it?', 'Not at the moment; the print layout shows the dashboard\'s title and the date it was printed.'],
			['Does the print show the same figures as the screen?', 'Yes, the same widgets with the same filters, run at the moment you print.']
		],
		tried: ['I tried shrinking the page to 70 percent in the print settings, but then the text is too small to read.', 'I tried portrait and landscape, and both cut something off.'],
		waitFor: ['the browser you print from, and how', 'the number of widgets on the dashboard, and whether any are tables'],
		end: {
			answered: [
				'S: Hi {first}, the browser\'s own print uses the screen layout, which is too wide for a page. The Print button at the top right of the dashboard switches to a print layout: landscape, one widget per row, and tables kept on one page where they fit.\nC: That is much better. Thank you.'
			],
			request: [
				'S: Hi {first}, the browser\'s own print uses the screen layout, which is too wide for a page. The Print button at the top right of the dashboard gives a layout made for paper.\nC: Better, thanks. What we would really like is the dashboard emailed to the board as a PDF on the first of each month.\nS: That is not something we offer yet. I have logged it as a feature request.'
			]
		}
	},
	// 13. A search request without q.
	{
		area: 'search',
		repeat: true,
		slots: (x) => ({ tool: pick(x.r, ['SharePoint', 'Confluence', 'our own intranet', 'Notion']), errors: String(int(x.r, 40, 600)) }),
		subjects: ['Errors from search', 'Search returns 500 for our intranet', 'Intranet search box errors', 'HTTP 500 on /search'],
		open: [
			'Our intranet on {tool} has a search box that sends the words to your search. Since we added it, our IT team sees errors in their logs whenever someone opens the intranet page before typing anything.',
			'{colleague} from our IT team reports about {errors} errors a day from your search address, all 500s. The searches people actually type seem to work fine.'
		],
		ask: ['Could your IT team send one of the failing requests, with its time?', 'Do the errors happen for particular searches, or at particular moments, such as when a page loads?'],
		more: ['Here is what they sent me.', 'They say it happens when the page loads. Here is an extract of their log.'],
		look: ['Every failing request from {orgId} is /search with no q at all. The requests with q answer 200.', 'Their 500s are all GET /search without a q parameter, about {errors} a day. Reproduced on staging.'],
		follow: [
			['Is our intranet doing something wrong?', 'It sends a search with no words when the page loads, which is unusual, but our search should answer that with a clear message rather than an error.'],
			['Do the errors cost us anything, such as a limit on requests?', 'No, there is no limit that they count against.']
		],
		tried: ['Our IT team checked that the address is right.', 'The searches with words in them work, so it is not the connection.'],
		waitFor: ['one of the failing requests with its time', 'a word on when the errors happen'],
		art: (x) => {
			const lines: string[] = [];
			let minute = int(x.r, 480, 600);
			for (let i = 0; i < int(x.r, 5, 8); i++) {
				minute += int(x.r, 1, 40);
				const empty = x.r() < 0.6;
				lines.push(`${subWork(x.opened, 1)} ${pad(Math.floor(minute / 60))}:${pad(minute % 60)}:${pad(int(x.r, 0, 59))} search-widget GET https://api.tidewell.example/search${empty ? '' : `?q=${pick(x.r, ['holiday+rota', 'price+list', 'returns', 'q1+review', 'supplier+terms'])}`} -> ${empty ? '500 Internal Server Error' : '200 OK'}`);
			}
			return '```text\n' + lines.join('\n') + '\n```';
		},
		proof: (x) => stack(['TypeError: null is not an object (evaluating \'q.toLowerCase\')', `    at search (${srv}/search/service.ts:15:16)`, `    at handle (${srv}/routes.ts:16:46)`]),
		end: {
			bug: [
				'E: handle() reads q with a non-null assertion and search() calls toLowerCase on null, so a request without q is a 500. It should be a 400 that says q is required. Linked to ANL-262; not fixed yet.\nS: Hi {first}, our engineers confirmed that a search request without any words fails with a server error instead of a clear message. That is a fault on our side, and it is logged; your ticket is attached to the bug. ¶ Your intranet can avoid it in the meantime by sending a search only once someone has typed something.\nC: Thanks. {colleague} will change the search box, and we will look out for your fix.'
			],
			answered: [
				'S: Hi {first}, the errors come from searches with no words at all: your intranet page sends one as it loads. If it sends a search only once someone has typed something, the errors stop.\nC: {colleague} has changed it, and the errors have gone from the log. Thanks.'
			]
		}
	},
	// 14. Search matches each word as part of the text.
	{
		area: 'search',
		slots: (x) => {
			const [searched, doc, stem] = pick(x.r, [
				['invoices', 'Invoice approval process', 'invoice'],
				['deliveries', 'Delivery cut-off times', 'deliver'],
				['pricing', 'Price list 2026', 'pric'],
				['suppliers', 'Supplier onboarding checklist', 'supplier'],
				['managers', 'Manager handbook', 'manager'],
				['holidays', 'Holiday rota, spring', 'holiday']
			] as const);
			return { searched, doc, stem };
		},
		subjects: ['Search cannot find an obvious document', 'Search unreliable', 'Search for "{searched}" finds nothing', 'Missing search results'],
		open: [
			'Searching for "{searched}" finds nothing, but we have a document called "{doc}". Searching for "{stem}" finds it, which seems backwards.',
			'Our team says search is unreliable. Example: "{searched}" gives no results, although "{doc}" is exactly what they want.'
		],
		ask: ['Could you send two or three other searches that did not find what was expected?', 'Is the document marked as restricted, or can everyone open it?'],
		more: ['Other examples from the team: "returns forms" and "opening hours shops".', 'It is not restricted; everyone can open it. {colleague} also had trouble with "{searched} 2026".'],
		look: ['Search matches each word of the query as part of a document\'s title or text. "{stem}" is inside "{searched}", but "{searched}" is not inside "{doc}".', 'Works as built: every word of q has to appear somewhere in the title or body; "{searched}" does not.'],
		follow: [
			['Does it matter whether I use capitals?', 'No, search ignores capitals.'],
			['Does the order of the words matter?', 'No. Every word has to appear somewhere in the document, in any order.']
		],
		tried: ['I tried with capitals and without.', 'I checked that the document is not restricted; everyone can open it.'],
		waitFor: ['two or three other searches that did not find what was expected', 'a word on whether the document is restricted'],
		art: (x) => `GET /search?q=${x.s.searched}\n\n${searchJson(x, [])}\n\nGET /search?q=${x.s.stem}\n\n${searchJson(x, shuffle(x.r, documents).slice(0, int(x.r, 1, 3)).concat([[x.s.doc!, documents.find(([t]) => t.startsWith(x.s.doc!.split(' ')[0]!))?.[1] ?? 'See the attached process and the people to contact for each step.']]))}`,
		end: {
			answered: [
				'S: Hi {first}, search looks for each word you type inside the title and text of a document. "{stem}" is part of "{searched}", but "{searched}" is not part of "{doc}", so the shorter form finds more. Searching for the start of a word, such as "{stem}", finds every form of it.\nC: Good tip. I will pass it on to the team.'
			],
			request: [
				'S: Hi {first}, search looks for each word you type inside the title and text of a document, so "{searched}" does not match "{doc}", while "{stem}" does.\nC: Understood, but nobody will remember that. Could search handle plurals and other forms itself?\nS: I have logged that as a feature request for the search team, with your examples.'
			]
		}
	},
	// 15. The order of search results.
	{
		area: 'search',
		repeat: true,
		slots: (x) => ({ newest: pick(x.r, ['Q4 review', 'Price changes from March', 'Spring range brief', 'Returns policy update', 'New starter checklist']), hits: String(int(x.r, 14, 60)) }),
		subjects: ['Search results in a strange order', 'Newest documents at the bottom', 'Search ordering', 'Can search show newest first?'],
		open: [
			'Search gives us the oldest documents first. "{newest}", which we wrote last week, is at the bottom of {hits} results.',
			'Is there a way to sort search results? When I search for anything common, the page is full of documents from years ago, and the current ones are at the end.'
		],
		ask: ['Which words did you search for?', 'Roughly how many documents does your organisation have in search?'],
		more: ['"review", or "price". Anything common.', 'About {n} hundred, going back to 2019.'],
		look: ['Search returns matches in the order the documents were added; there is no ranking or sorting.', 'Confirmed their {hits} matches come back oldest first, which is the order of the documents table.'],
		follow: [['Do more words help?', 'Yes. Every word has to match, so each extra word narrows the results.'], ['Can we archive old documents so that they drop out?', 'Not in Tidewell; documents come from your connected drive, so removing them there removes them here.']],
		tried: ['I tried adding the year, which helps a little.', 'I looked for a sort option on the results page and could not find one.'],
		waitFor: ['the words you searched for', 'a rough count of the documents you have in search'],
		art: (x) => searchJson(x, [...shuffle(x.r, documents).slice(0, int(x.r, 5, 9)), [x.s.newest!, 'Written last week. Replaces the earlier version, which should no longer be used.']]),
		end: {
			answered: [
				'S: Hi {first}, search lists matching documents in the order they were added, oldest first. Adding a second word that the document you want contains, such as a year or a name, narrows the list quickly.\nC: OK, that helps. Thanks.'
			],
			request: [
				'S: Hi {first}, search lists matching documents in the order they were added; there is no sorting today.\nC: That is a shame. Newest first, or best match first, would make search useful for us.\nS: I have logged that as a feature request with your example.'
			]
		}
	},
	// 16. Search snippets.
	{
		area: 'search',
		repeat: true,
		slots: (x) => ({ word: pick(x.r, ['deposit', 'notice period', 'pallet', 'warranty', 'carriage']) }),
		subjects: ['Search snippet not useful', 'Show where the word appears', 'Search preview text', 'Snippet under each result'],
		open: [
			'The text under each search result is always the start of the document, not the part with the word I searched for. With long documents it tells me nothing.',
			'When I search for "{word}", every result shows the first line of the document underneath, so I have to open each one to see whether it is the right one.'
		],
		ask: ['Which documents does this matter most for?', 'Would a few words around the match be enough, or do you want the whole paragraph?'],
		more: ['Our contracts and policies, which are long.', 'A few words around the match would be plenty.'],
		look: ['The snippet is the first 80 characters of the body, whatever was searched for.'],
		follow: [['Is the title searched as well as the text?', 'Yes, both.'], ['Can I search for a phrase in quotes?', 'Not as a phrase: each word is matched on its own.']],
		tried: ['I tried searching for a longer phrase, which makes no difference to the preview.', 'I looked for a setting for the preview text and found none.'],
		waitFor: ['the documents this matters most for', 'a word on how much text around the match you would want'],
		art: (x) => `GET /search?q=${x.s.word!.replace(' ', '+')}\n\n${searchJson(x, shuffle(x.r, documents).slice(0, int(x.r, 3, 6)))}`,
		end: {
			answered: [
				'S: Hi {first}, the text under each result is the start of the document, by design, not the place where your words appear. For long documents, adding a second word narrows the results so that fewer need opening.\nC: Fair enough. Thanks for explaining.'
			],
			request: [
				'S: Hi {first}, the text under each result is the start of the document, not the place where your words appear.\nC: Could it show the words around the match instead? That is what every other search does.\nS: I have logged it as a feature request for the search team.'
			]
		}
	},
	// 17. A step reads an input that no earlier step produces.
	{
		area: 'pipelines',
		slots: (x) => {
			const region = x.s.region!;
			const variant = int(x.r, 0, 2);
			if (variant === 0) {
				const bad = pick(x.r, ['paid', 'paid_orders', 'Paid-orders', 'paidorders']);
				return {
					pipe: 'paid-orders-by-region', reader: 'by-region', bad, good: 'paid-orders', err: 'undefined is not an object (evaluating \'row of inputs[0]\')', line: '54:15',
					steps: JSON.stringify([load(), filter('paid-orders', 'status', 'paid', 'orders'), sum('by-region', 'revenueCents', 'region', bad)]),
					cause: 'the step that produces the paid orders is called "paid-orders"', fix: 'change its input to "paid-orders"'
				};
			}
			if (variant === 1) {
				const bad = pick(x.r, ['order', 'Orders', 'all-orders']);
				return {
					pipe: `${region}-paid`, reader: region, bad, good: 'orders', err: 'undefined is not an object (evaluating \'inputs[0].filter\')', line: '49:18',
					steps: JSON.stringify([load(), filter(region, 'region', region, bad), sum('total', 'revenueCents', 'status', region)]),
					cause: 'the load step is called "orders"', fix: 'change its input to "orders"'
				};
			}
			return {
				pipe: 'weekly-paid-by-region', reader: 'by-region', bad: 'paid', good: 'paid', err: 'undefined is not an object (evaluating \'row of inputs[0]\')', line: '54:15',
				steps: JSON.stringify([load(), sum('by-region', 'revenueCents', 'region', 'paid'), filter('paid', 'status', 'paid', 'orders')]),
				cause: '"paid" comes after "by-region", and a step can only read the steps above it', fix: 'move "paid" above "by-region"'
			};
		},
		subjects: ['Pipeline failing every hour', 'Pipeline error I do not understand', '"undefined is not an object"', 'Our new pipeline never runs', 'Help with a pipeline error'],
		open: [
			'Our {pipe} pipeline has failed on every run since {weekday}. The run history says only "{err}", which means nothing to me.',
			'I built a new pipeline this morning, {pipe}, and it fails straight away with "TypeError: {err}". The template I started from runs fine.',
			'Could someone explain this error? The pipeline page shows a red "failed" on {pipe} for every hourly run since {weekday}, with the message "{err}".'
		],
		ask: ['Could you send the pipeline as it is now? The Export button on the pipeline page gives text you can paste.', 'Did anything change in the pipeline on the day it started failing?'],
		more: ['Here it is, as exported.', '{colleague} edited it on {weekday}, but only to tidy the names. Here is the export.'],
		look: [
			'Their step "{reader}" lists "{bad}" as its input, and {cause}. The runner hands the step nothing, and it fails inside the step with the TypeError.',
			'Run history: every hourly run since {weekday} fails at step "{reader}". It reads "{bad}"; {cause}.'
		],
		follow: [
			['Why does the error not say which step is wrong?', 'It should. The message comes from deep inside the step instead of from a check before the run.'],
			['Did the failed runs change anything in our derived tables?', 'No. A failed run writes nothing; the tables keep the output of the last run that succeeded.']
		],
		tried: ['I compared it with the template, and the steps look the same to me.', 'I tried running it by hand with the Run now button, and it fails the same way.'],
		waitFor: ['the pipeline as the Export button gives it', 'a word on what was changed in the pipeline before it started failing'],
		art: (x) => pipelineJson(x.s.pipe!, JSON.parse(x.s.steps!) as Step[]) + '\n\n' + runHistory(x, x.opened, int(x.r, 3, 6), () => x.s.err, () => `0.${int(x.r, 1, 6)} s`),
		proof: (x) => stack([`TypeError: ${x.s.err}`, `    at runStep (${srv}/pipelines/runner.ts:${x.s.line})`, `    at runPipeline (${srv}/pipelines/runner.ts:37:28)`, '    at runHourly (/srv/tidewell-scheduler/src/hourly.ts:58:23)']),
		end: {
			answered: [
				'S: Hi {first}, the step "{reader}" reads from "{bad}", and {cause}. If you {fix}, the pipeline runs.\nC: Done, and the next run worked. Thank you.',
				'S: Thanks for the export, {first}. The problem is the input of "{reader}": it reads "{bad}", and {cause}. {Fix}, and the next hourly run will succeed.\nC: That did it. {colleague} says sorry.'
			],
			bug: [
				'E: Customer can fix their pipeline, but the message is the real problem: when a step lists an input that no earlier step produces, the runner passes undefined into the step, and the user gets a TypeError instead of being told which step and which input are wrong. Linked to ANL-270; not fixed.\nS: Hi {first}, the step "{reader}" reads from "{bad}", and {cause}; if you {fix}, the pipeline will run. ¶ The error should have told you that in plain words. Our engineers have logged it as a fault, and your ticket is attached to it, so you will hear when the message is improved.\nC: Changed, and it runs. And yes, a clearer message would have saved me a morning.'
			]
		}
	},
	// 18. A pipeline asks for a table other than orders.
	{
		area: 'pipelines',
		slots: (x) => {
			const [tableName, goal] = pick(x.r, [
				['refunds', 'refunds by region, every week'],
				['returns', 'returned orders by region'],
				['customers', 'the number of customers in each region'],
				['invoices', 'unpaid invoices by region'],
				['order_lines', 'revenue per product'],
				['products', 'which products sell in which region']
			] as const);
			const derived = tableName === 'refunds' || tableName === 'returns';
			return {
				table: tableName, goal, stepId: pick(x.r, ['start', tableName, 'source', 'load']),
				reply: derived
					? `a pipeline can load one table, orders, and ${tableName} are orders with the status "refunded". Load orders, add a filter step with field "status" and equals "refunded", and put your sum after it.`
					: `pipelines can only load the orders table. ${cap(goal)} cannot be built from it, I am afraid, because we do not load that data from your shop.`,
				thanks: derived ? 'Works perfectly. Thank you.' : 'Understood. We will keep doing that one in a spreadsheet.'
			};
		},
		allow: (x) => (x.s.table === 'refunds' || x.s.table === 'returns' ? ['answered'] : ['request', 'answered']),
		subjects: ['Pipeline cannot load {table}', '"unknown table"', 'Which tables can a pipeline use?', 'New pipeline fails at the first step'],
		open: [
			'I tried to build a pipeline that starts from our {table}, and it fails at once with "Step {stepId}: unknown table {table}".',
			'Which tables can a pipeline load? I assumed {table} would be there, since we see it in the shop, but the run says unknown table.'
		],
		ask: ['What would you like the pipeline to produce in the end?', 'Could you send the pipeline as the Export button gives it?'],
		more: ['We want {goal}. Here is what I have so far.', 'The aim is {goal}. The export is below.'],
		look: ['Load steps can read the orders table only; "{table}" fails with unknown table, as it should.', 'The first step of their pipeline loads "{table}". Only orders can be loaded.'],
		follow: [['Will more tables come?', 'Product is looking at it, but there is no date.'], ['Can a pipeline read another pipeline\'s output?', 'Not today: a pipeline starts from the orders table.']],
		tried: ['I tried writing the table name in capitals, in case that mattered.', 'I looked in the help centre for a list of tables but did not find one.'],
		waitFor: ['a word on what the pipeline should produce in the end', 'the pipeline as the Export button gives it'],
		art: (x) => pipelineJson(`${x.s.table}-by-region`, [load(x.s.stepId, x.s.table), sum('by-region', 'revenueCents', 'region', x.s.stepId!)]) + '\n\n' + runHistory(x, x.opened, int(x.r, 2, 4), () => `Step ${x.s.stepId}: unknown table ${x.s.table}`, () => `0.0${int(x.r, 1, 9)} s`),
		end: {
			answered: ['S: Hi {first}, {reply}\nC: {thanks}'],
			request: [
				'E: Their goal needs data we do not load from the shop at all. Added their use to the request for more pipeline tables.\nS: Hi {first}, pipelines can only load the orders table at the moment, and {table} are not loaded from your shop at all. I have added your use case to the feature request for more tables.\nC: Pity. Please keep us posted.'
			]
		}
	},
	// 19. A filter step that matches nothing.
	{
		area: 'pipelines',
		slots: (x) => {
			const region = x.s.region!;
			const [field, equals, realField, realValue] = pick(x.r, [
				['Status', 'paid', 'status', 'paid'],
				['status', 'Paid', 'status', 'paid'],
				['state', 'paid', 'status', 'paid'],
				['region', cap(region), 'region', region]
			] as const);
			return { field, equals, realField, realValue, loaded: String(int(x.r, 400, 9000)), pipe: pick(x.r, ['paid-by-region', 'my-paid-revenue', 'regional-paid', 'paid-revenue-copy']) };
		},
		subjects: ['Filter step returns nothing', 'Pipeline output empty', 'Copied template gives an empty table', 'Pipeline produces no rows'],
		open: [
			'The filter step of our {pipe} pipeline returns no rows at all, although the step before it loads {loaded} orders.',
			'I copied your paid-revenue-by-region template and changed the filter, and now every run produces an empty table. The runs all say succeeded.'
		],
		ask: ['Could you export the pipeline and send it to me?', 'What did you change in the filter?'],
		more: ['Here is the export, and the row counts from the last run.', 'Only the filter. Export below.'],
		look: ['Filter step args: field "{field}", equals "{equals}". The rows have the field "{realField}" with values such as "{realValue}". The filter compares exactly, so nothing passes.', 'Load gives {loaded} rows, the filter 0. Its field and value do not match the rows exactly.'],
		follow: [['Where can I see the field names?', 'The help centre\'s pipeline page lists the fields of an order row: orderId, placedOn, region, customerEmail, status, revenueCents, marginCents and currency.'], ['Why did the run say succeeded?', 'Because nothing failed: the filter ran and found no rows that match.']],
		tried: ['I ran it by hand, and the load step definitely gives rows.', 'I tried removing the filter, and then the sum works, but with the refunded orders included.'],
		waitFor: ['the pipeline as the Export button gives it', 'a word on what you changed in the filter'],
		art: (x) => pipelineJson(x.s.pipe!, [load(), filter('paid', x.s.field!, x.s.equals!, 'orders'), sum('by-region', 'revenueCents', 'region', 'paid')]) + '\n\n' + stepCounts([['orders', 'load', Number(x.s.loaded)], ['paid', 'filter', 0], ['by-region', 'sum', 0]]),
		end: {
			answered: [
				'S: Hi {first}, the filter compares the field and the value exactly as they are in the rows. Your step asks for "{field}" equal to "{equals}", and the rows have "{realField}" with values such as "{realValue}". With field "{realField}" and equals "{realValue}", the rows come through.\nC: That was it. Output looks right now. Thank you.'
			],
			request: [
				'S: Hi {first}, the filter compares exactly: your step asks for "{field}" equal to "{equals}", and the rows have "{realField}" with "{realValue}". Changing the step fixes it.\nC: Fixed, thank you. Could the filter ignore capitals, or warn when a field does not exist? It reported success with nothing in it.\nS: Both reasonable. I have logged them as a feature request.'
			]
		}
	},
	// 20. A sum step over a field the rows do not have.
	{
		area: 'pipelines',
		slots: (x) => ({ bad: pick(x.r, ['revenue', 'Revenue', 'revenue_cents', 'amount', 'total']), pipe: pick(x.r, ['paid-revenue-by-region', 'region-totals', 'weekly-revenue', 'revenue-split']) }),
		subjects: ['Pipeline totals are empty', '"null" in pipeline output', 'Sum step not adding up', 'Totals missing'],
		open: [
			'The totals column of our {pipe} output is empty for every region. The regions are right; only the numbers are missing.',
			'After I edited the sum step of {pipe}, the output shows the regions with "null" next to each one.'
		],
		ask: ['Could you send the pipeline as exported, and the output you get?', 'What did you change in the sum step?'],
		more: ['Here are both.', 'I renamed the field to something clearer. Export and output below.'],
		look: ['The sum step adds up "{bad}", which the order rows do not have; the amount is "revenueCents". Every total comes out as NaN, which the derived table stores as null.', 'Ran their pipeline on staging: totals null for every group. The field "{bad}" is not in the rows.'],
		follow: [['Why are the amounts in cents?', 'Amounts are kept in the smallest unit of the currency so that totals add up exactly. Divide by 100 for the amount.'], ['Can I rename the column in the output?', 'Not today: the output column has the name of the field that was summed.']],
		tried: ['I ran it by hand twice, with the same result.', 'I checked the regions in the output, and they are all there.'],
		waitFor: ['the pipeline as exported and the output you get', 'a word on what was changed in the sum step'],
		art: (x) => pipelineJson(x.s.pipe!, [load(), filter('paid', 'status', 'paid', 'orders'), sum('by-region', x.s.bad!, 'region', 'paid')]) + '\n\n' + outputJson(x.org.regions.map((region) => ({ region, [x.s.bad!]: null }))),
		end: {
			answered: [
				'S: Hi {first}, the sum step adds up a field called "{bad}", and the order rows do not have one: the amount is in "revenueCents". With field "revenueCents", the totals come back.\nC: Changed back, and the totals are there. Thanks.'
			],
			bug: [
				'E: Customer fixed it. The runner should refuse a field the rows do not have instead of writing nulls into the derived table. Linked to ANL-274, open.\nS: Hi {first}, the sum step adds up "{bad}", and the rows have no such field: the amount is "revenueCents". Changing the field brings the totals back. ¶ The pipeline should have told you the field does not exist instead of writing empty totals. That is logged as a fault, with your ticket attached.\nC: Fixed on our side. Agreed on the message.'
			]
		}
	},
	// 21. Grouping a sum by more than one field.
	{
		area: 'pipelines',
		slots: (x) => {
			const [by, second] = pick(x.r, [['region,month', 'month'], ['region, currency', 'currency'], ['region+status', 'status'], ['region;placedOn', 'day']] as const);
			return { by, second };
		},
		subjects: ['Sum by two fields?', 'Group by region and {second}', 'Pipeline gives one row called undefined', 'Grouping question'],
		open: [
			'We want paid revenue by region and by {second} in one pipeline. I tried "by": "{by}" and got a single row called "undefined".',
			'Can a sum step group by more than one field? We need revenue per region per {second}, and the obvious way does not work.'
		],
		ask: ['What would you do with the result: a dashboard, or a download?', 'Could you send the pipeline you tried?'],
		more: ['A download, for our own spreadsheet. Here is what I tried.', 'Here it is. The output is the single undefined row.'],
		look: ['The sum step groups by exactly one field; "{by}" is taken as one field name, which no row has, so everything lands in one group.', 'One group, "undefined", holding the total of every paid order. Works as built.'],
		follow: [['Is there a month field at all?', 'No. Each order has placedOn, the date it was placed.'], ['Can a pipeline have several sum steps?', 'Yes, and the output of each step is kept.']],
		tried: ['I tried a comma, a space and a plus between the field names.', 'I looked for a second grouping field in the step editor and found none.'],
		waitFor: ['a word on what you would do with the result', 'the pipeline you tried'],
		art: (x) => pipelineJson('paid-by-region-and-' + x.s.second, [load(), filter('paid', 'status', 'paid', 'orders'), sum('grouped', 'revenueCents', x.s.by!, 'paid')]) + '\n\n' + outputJson([{ [x.s.by!]: 'undefined', revenueCents: int(x.r, 900000, 90000000) }]),
		end: {
			request: [
				'E: Grouping by several fields, and by month, would both be new in the sum step. Logged as a request.\nS: Hi {first}, a sum step groups by one field only, and "{by}" is read as the name of a single field, which is why you get one row called undefined. Grouping by several fields is a reasonable thing to want, and I have logged it as a feature request.\nC: Thanks. We will do the second grouping in the spreadsheet for now.'
			],
			answered: [
				'S: Hi {first}, a sum step groups by one field only. You can still get there in one pipeline: add a filter for each value of {second} that you need, with a sum by region after each, and the output of every step is kept.\nC: That works, if a little long. Thank you.'
			]
		}
	},
	// 22. The paid revenue template adds two currencies together.
	{
		area: 'pipelines',
		repeat: true,
		orgs: multi,
		subjects: ['Template pipeline total too high', 'paid-revenue-by-region gives wrong totals', 'Pipeline revenue does not match our accounts', 'Revenue pipeline question'],
		open: [
			'The paid-revenue-by-region pipeline we installed from your templates gives a {region} total far above what our accounts show.',
			'We sell in {cur1} and {cur2}, and the paid-revenue-by-region template seems to add the two together. Is there a version that keeps them apart?'
		],
		ask: ['Do you take orders in more than one currency in that region?', 'Could you send the output of the last run?'],
		more: ['Yes, {region} has both {cur1} and {cur2} orders. Output below.', 'Here is this morning\'s output.'],
		look: ['{orgId} has paid orders in {cur1} and {cur2} in {region}. The template filters on status and sums revenueCents by region, across currencies.', 'Their {region} total is the {cur1} and {cur2} cents added together.'],
		follow: [['Does the template know about currencies at all?', 'No. It filters paid orders and sums by region; each order\'s currency is in its row, but the template does not use it.'], ['Can I change an installed template?', 'Yes. Your installed copy is your own pipeline, and you can add or change steps.']],
		tried: ['I compared the pipeline with revenue-by-region, which shows the same total.', 'I checked the paid orders in the shop, and the {cur1} total there is much lower.'],
		waitFor: ['an answer on whether that region takes orders in more than one currency', 'the output of the last run'],
		proof: (x) => sql(`select currency, count(*), sum(revenue_cents) from orders where org_id = '${x.org.id}' and region = '${x.s.region}' and status = 'paid' group by 1;`, ['currency', 'count', 'sum'], x.org.cur.map((cur) => [cur, String(int(x.r, 40, 900)), String(int(x.r, 100000, 20000000))])),
		art: (x) => outputJson(x.org.regions.map((region) => ({ region, revenueCents: int(x.r, 200000, 40000000) }))),
		end: {
			answered: [
				'S: Hi {first}, the template sums every paid order by region, whatever its currency, so {region} adds {cur1} and {cur2} together. In your copy, add a filter step on "currency" before the sum, one for each currency, each followed by its own sum by region.\nC: Done, and the {cur1} figures now match our accounts. Thank you.'
			],
			request: [
				'S: Hi {first}, the template sums every paid order by region whatever its currency, so {region} adds {cur1} and {cur2} together. A filter on currency before the sum keeps them apart.\nC: Thanks. Could you offer a template that does that? We cannot be the only customer with two currencies.\nS: You are not. I have logged a request for a currency-aware template.'
			]
		}
	},
	// 23. An operation pipelines do not have.
	{
		area: 'pipelines',
		slots: (x) => {
			const [op, need] = pick(x.r, [
				['count', 'count orders per region rather than add up revenue'],
				['average', 'the average order value per region'],
				['top', 'the ten biggest orders each week'],
				['between', 'only the orders between two dates'],
				['join', 'our orders joined to our own product list']
			] as const);
			return { op, need };
		},
		allow: (x) => (x.s.op === 'count' ? ['answered', 'request'] : ['request']),
		subjects: ['New pipeline operation?', 'Can a pipeline do {op}?', 'Pipeline operations', 'Question about pipeline steps'],
		open: [
			'Is there a way to get {need} in a pipeline? The only operations I can find are load, filter and sum.',
			'We would like a pipeline that gives us {need}. Is there a step for that, or a way to combine the existing ones?'
		],
		ask: ['What would the result be used for?', 'How often would you need it?'],
		more: ['A weekly figure for our trading meeting.', 'Every day, ideally, in a derived table our BI tool reads.'],
		look: ['Pipelines have three operations, load, filter and sum. Nothing gives {op}.', 'Checked: no combination of load, filter and sum gives {need}.'],
		follow: [['Are more operations planned?', 'There is a list of requested operations, and yours is now on it. No dates yet.'], ['Can we write our own step?', 'Not today: the steps are the ones Tidewell provides.']],
		tried: ['I looked through the step editor and the help centre.', 'I tried to make the sum step count, by adding up a field that is always 1, but there is no such field.'],
		waitFor: ['a word on what the result would be used for', 'a word on how often you would need it'],
		end: {
			request: [
				'E: Added {op} to the list of requested pipeline operations, with their use case.\nS: Hi {first}, pipelines only have load, filter and sum today, and none of them gives {need}. I have added your request to the list of operations customers have asked for, with your use case. I will let you know if it is scheduled.\nC: Thank you.'
			],
			answered: [
				'S: Hi {first}, there is no count step, but the revenue-by-region report already gives the number of paid orders in each region, next to the revenue. If you need it on a dashboard, a widget with that report shows it.\nC: I had not noticed the orders column. That is exactly what we need.'
			]
		}
	},
	// 24. When pipelines run.
	{
		area: 'pipelines',
		repeat: true,
		slots: (x) => ({ hh: pad(int(x.r, 6, 9)), mins: String(int(x.r, 2, 6)) }),
		subjects: ['When do pipelines run?', 'Pipeline timing', 'Daily pipeline instead of hourly?', 'Figures change during our meeting'],
		open: [
			'Our pipelines run every hour, but our finance team want their figures to change only once a day, before the {hh}:30 meeting, not during it.',
			'At what minute do pipelines run? Our BI tool reads the derived tables at {hh}:00, and sometimes it gets this hour\'s output and sometimes last hour\'s.'
		],
		ask: ['Which pipelines does this concern?', 'At what time does your BI tool read the tables?'],
		more: ['All three of ours, but mostly the revenue one.', 'At {hh}:00 exactly, every day.'],
		look: ['The scheduler starts every organisation\'s pipelines at the top of each hour. Theirs finish within {mins} minutes of the hour.', 'Run history: started on the hour every hour, finished at :0{mins} at the latest.'],
		follow: [['Can we run a pipeline by hand?', 'Yes, the Run now button on the pipeline page starts one straight away.'], ['Does a run at night cost us anything?', 'No, runs are included whatever the time.']],
		tried: ['I looked at the run history, and the finishing times vary by a minute or two.', 'I tried the Run now button before the meeting, but the next hourly run changes the figures again.'],
		waitFor: ['the names of the pipelines this concerns', 'the time your BI tool reads the tables'],
		art: (x) => runHistory(x, x.opened, int(x.r, 5, 8), () => undefined, () => `${int(x.r, 1, Number(x.s.mins))} min ${pad(int(x.r, 0, 59))} s`),
		end: {
			answered: [
				'S: Hi {first}, pipelines start at the top of each hour and yours finish within a few minutes. If your BI tool reads the tables at quarter past instead of on the hour, it will always get that hour\'s output.\nC: Moved it to quarter past. Problem solved.'
			],
			request: [
				'S: Hi {first}, pipelines run every hour for every customer, and the schedule cannot be changed per pipeline today. I have logged a feature request for a daily schedule with a chosen time.\nC: Thanks. We will take a copy of the figures at {hh}:00 ourselves until then.'
			]
		}
	},
	// 25. Sending pipeline output elsewhere.
	{
		area: 'pipelines',
		slots: (x) => ({ dest: pick(x.r, ['Google Sheets', 'BigQuery', 'Snowflake', 'Power BI']) }),
		subjects: ['Send pipeline output to {dest}?', 'Export derived tables automatically', 'Pipeline output to another system', 'Integration question'],
		open: [
			'Can the output of our pipelines go straight into {dest}? At the moment {colleague} downloads the derived tables every morning and uploads them by hand.',
			'We would like our derived tables to land in {dest} after each run. Is there an integration?'
		],
		ask: ['Which pipelines would you want to send, and how often?', 'Is a daily file enough, or does it need to be after every run?'],
		more: ['Two of them, once a day is plenty.', 'After every run would be ideal, but daily would do.'],
		look: ['No export of derived tables to other systems exists; the pipeline page offers a CSV download only.'],
		follow: [['Can the download be done with a script?', 'Not in a supported way today.'], ['Is there a webhook when a run finishes?', 'No, not at the moment.']],
		tried: ['I looked in the pipeline settings and under Settings, Connections.', 'I asked our IT team, and they say they would need an address to fetch the file from.'],
		waitFor: ['the pipelines you would send, and how often', 'a word on whether a daily file would do'],
		end: {
			request: [
				'S: Hi {first}, there is no automatic export of derived tables yet; the CSV download on the pipeline page is the only way out. I have logged a feature request for sending them to {dest}, with your use.\nC: Thanks. Please let us know if it happens.'
			],
			answered: [
				'S: Hi {first}, there is no automatic export today; the pipeline page has a Download CSV button for each derived table, which is what {colleague} is using. Some customers save the upload step by letting {dest} import the CSV from a shared folder on a schedule.\nC: Good idea, our IT team will set that up.'
			]
		}
	},
	// 26. Finding out late that a pipeline failed.
	{
		area: 'pipelines',
		slots: (x) => ({ pipe: pick(x.r, ['paid-revenue-by-region', 'refunds-by-region', 'weekly-paid', 'north-paid']), badTable: pick(x.r, ['orders_2026', 'orders-archive', 'Orders', 'orders_live']), since: disp(subWork(x.opened, int(x.r, 3, 8))) }),
		subjects: ['Email when a pipeline fails?', 'Pipeline failed for days without us noticing', 'Failure notifications', 'Pipeline alert'],
		open: [
			'We only noticed today that our {pipe} pipeline has failed since {since}. Can we get an email when a pipeline fails?',
			'Our derived table had not changed for days, and it turns out {pipe} has been failing since {since}. Two questions: why, and how do we hear about it next time?'
		],
		ask: ['Could you send the run history of the pipeline?', 'Did anyone change the pipeline around {since}?'],
		more: ['Here is the run history.', 'Possibly; {colleague} was making changes that week. Run history below.'],
		look: ['Every run since {since} fails at the load step: the table was changed to "{badTable}", and only "orders" can be loaded.', 'The load step was edited on {since} to read "{badTable}". Unknown table on every run since.'],
		follow: [['Can the pipeline page show failures more clearly?', 'Failed runs are marked in red in the run history, but there is nothing on the main page yet.'], ['Will the missed runs be made up?', 'The next successful run computes everything from the current orders, so nothing is missing once it runs.']],
		tried: ['I looked for a notifications setting and found none.', 'I checked my spam folder in case alerts were going there.'],
		waitFor: ['the run history of the pipeline', 'a word on whether anyone changed the pipeline around {since}'],
		art: (x) => runHistory(x, x.opened, int(x.r, 4, 7), () => `Step orders: unknown table ${x.s.badTable}`, () => `0.0${int(x.r, 1, 9)} s`),
		end: {
			request: [
				'S: Hi {first}, the pipeline has failed since {since} because its load step asks for the table "{badTable}", and only "orders" can be loaded; changing it back fixes it. There are no failure emails yet, and I have logged a feature request for them.\nC: Fixed the step, thanks. And yes, please, to the emails.'
			],
			answered: [
				'S: Hi {first}, the load step asks for "{badTable}" since {since}, and only "orders" can be loaded. Changing it back fixes it, and the next run brings everything up to date. For next time, failed runs show in red in the run history on the pipeline page.\nC: Changed it back, and the run worked. We will check the page on Mondays.'
			]
		}
	},
	// 27. Characters garbled in a CSV export.
	{
		area: 'other',
		repeat: true,
		orgs: (org) => /[^\x00-\x7f]/.test(money(12345, org.cur[0]!, org.locale)),
		slots: (x) => {
			const word = money(int(x.r, 1000, 250000), x.org.cur[0]!, x.org.locale);
			return { word, garbled: garble(word) };
		},
		subjects: ['CSV export has strange characters', 'Export garbled in Excel', 'Special characters broken in export', 'Encoding problem'],
		open: [
			'When I open the CSV export of the orders report in Excel, the amounts come out with odd characters in front of them: "{word}" turns into "{garbled}", and the column will not add up.',
			'Our exports look broken in Excel: every currency sign and accented letter turns into two or three odd characters, so "{word}" becomes "{garbled}".'
		],
		ask: ['How do you open the file: by double-clicking it, or through Excel\'s import?', 'Which version of Excel do you use?'],
		more: ['By double-clicking it. Excel from Microsoft 365, on Windows.', 'Double-click, on a Mac. Numbers shows it correctly, Excel does not.'],
		look: ['The export is UTF-8. Excel on double-click reads a CSV without a byte order mark in the system code page, which garbles anything outside ASCII.', 'Opened their export in a text editor: UTF-8, correct characters. The garbling happens in Excel.'],
		follow: [['Is the file itself broken?', 'No. The file is correct; it is how Excel opens it that garbles the characters.'], ['Would an Excel file instead of CSV avoid it?', 'Yes, but we only offer CSV at the moment.']],
		tried: ['I tried saving the file again from the web app.', 'I opened it in Notepad, and there the names look right.'],
		waitFor: ['a word on how you open the file', 'the version of Excel you use'],
		art: (x) => {
			const [columns, cells] = ordersCells(x, rowsFor(x, x.s.weekAgo!, x.opened, int(x.r, 4, 7)));
			return '```text\n' + [columns, ...cells].map((row) => garble(row.map((c) => (c.includes(',') ? `"${c}"` : c)).join(','))).join('\n') + '\n```';
		},
		end: {
			answered: [
				'S: Hi {first}, the file is correct, but Excel guesses the wrong character set when you double-click a CSV. Open Excel first, choose Data, From Text/CSV, pick the file, and choose "65001: Unicode (UTF-8)" as the file origin. The names then come out as they should.\nC: That works. A bit fiddly, but fine.'
			],
			request: [
				'S: Hi {first}, the file is correct, but Excel guesses the wrong character set on double-click. Importing it through Data, From Text/CSV with UTF-8 chosen shows the names correctly.\nC: Thanks. Could the export be made so that double-clicking works? Half our staff will not remember the import steps.\nS: I have logged a feature request for an export that Excel opens correctly on its own.'
			]
		}
	},
	// 28. Signed out too often.
	{
		area: 'other',
		slots: (x) => ({ mins: pick(x.r, ['15', '20', '30']), idp: pick(x.r, ['Microsoft Entra', 'Okta', 'Google Workspace', 'JumpCloud']) }),
		subjects: ['Logged out all the time', 'Session expires too quickly', 'Losing work when signed out', 'Sign-in timeout'],
		open: [
			'Our analysts get signed out every {mins} minutes or so while they build dashboards, and lose what they were doing.',
			'Is there a way to stay signed in longer? I lost a half-built dashboard twice yesterday when Tidewell signed me out in the middle of it.'
		],
		ask: ['Do you sign in with a Tidewell password, or through your company\'s single sign-on?', 'Is it everyone at your organisation, or some people?'],
		more: ['Through single sign-on, {idp}.', 'Everyone, as far as I know. We sign in with {idp}.'],
		look: ['{orgId} signs in through {idp}. Their sign-in settings show an idle timeout of {mins} minutes.', 'Sessions for {orgId} end after {mins} minutes without activity. Checking where the {mins} minutes comes from.'],
		follow: [['Does a dashboard save as we go?', 'Not until you select Save, which is why the sign-out loses changes.'], ['Will staying signed in longer weaken our security?', 'The standard setting signs people out after 8 hours of inactivity, which most customers use.']],
		tried: ['I ticked "keep me signed in", but it makes no difference.', 'I tried another browser, and it happens there too.'],
		waitFor: ['a word on how you sign in', 'a word on whether it affects everyone at your organisation'],
		proof: (x) => {
			const lines: string[] = [];
			let minute = int(x.r, 480, 560);
			for (let i = 0; i < int(x.r, 4, 7); i++, minute += int(x.r, 30, 70)) lines.push(`${subWork(x.opened, 1)}T${pad(Math.floor(minute / 60))}:${pad(minute % 60)}:${pad(int(x.r, 0, 59))}Z session ended reason=idle idle_minutes=${x.s.mins} org=${x.org.id} user=u-${hex(x.r, 6)}`);
			return '```text\n' + lines.join('\n') + '\n```';
		},
		end: {
			fixed: [
				'E: {orgId} had an idle timeout of {mins} minutes in their sign-in settings, set when the account was created, and nobody at {org} remembers asking for it. Their admin confirmed by email; set to the standard 8 hours.\nS: Hi {first}, your organisation\'s sign-in settings on our side had an idle timeout of {mins} minutes, left over from when the account was set up. With your admin\'s agreement we have changed it to the standard 8 hours, so the sign-outs should stop.\nC: Thank you! A whole afternoon without being signed out.'
			],
			answered: [
				'S: Hi {first}, the sign-outs come from your single sign-on: {idp} ends the session after {mins} minutes, and Tidewell follows what it says. Your IT team can change the session length there.\nC: Spoke to IT; they have lengthened it. All good now.'
			]
		}
	},
	// 29. API documentation.
	{
		area: 'other',
		subjects: ['Is there API documentation?', 'Pulling reports into our warehouse', 'API question', 'Documentation for developers'],
		open: [
			'Is there documentation for your API? We want to pull report data into our own data warehouse every night.',
			'Our developer wants to read your reports from a script. Where can he find out which addresses exist and what they return?'
		],
		ask: ['Which data do you need: reports, search, dashboards, or all of them?', 'How would the script sign in?'],
		more: ['Mainly the orders report, nightly.', 'With a user we would create for it, I suppose.'],
		look: ['They want the reports. GET /reports/:id with from, to and region; the help centre has the page.'],
		follow: [['Do you have a list of the endpoints?', 'Yes: GET /reports/:id with from, to and region, GET /search with q, and GET /dashboards/:id.'], ['Is the data in the API the same as in the web app?', 'Yes. The web app shows exactly what the API returns.']],
		tried: ['I looked in the help centre but only found pages about the web app.', 'I opened the report address in the browser while signed in, and it gives JSON, so I assume there is an API of some kind.'],
		waitFor: ['the data you need from the API', 'a word on how the script would sign in'],
		end: {
			answered: [
				'S: Hi {first}, the API page in the help centre describes the three endpoints: GET /reports/:id with from, to and region, GET /search with q, and GET /dashboards/:id. Reports come back as columns and rows, formatted for the signed-in user. That should be all your developer needs.\nC: Perfect, thank you.'
			],
			request: [
				'S: Hi {first}, the API page in the help centre describes the endpoints: GET /reports/:id, GET /search and GET /dashboards/:id.\nC: Thanks. Our developer asks whether there is an OpenAPI file he could generate a client from.\nS: Not yet. I have logged that as a request for the API team.'
			]
		}
	},
	// 30. Orders from a second shop not arriving.
	{
		area: 'other',
		slots: (x) => {
			const since = subWork(x.opened, int(x.r, 4, 9));
			return { shop: pick(x.r, ['wholesale portal', 'second web shop', 'marketplace shop', 'pop-up shop till']), since: disp(since), sinceIso: since, loaded: String(int(x.r, 30, 900)) };
		},
		subjects: ['Orders from our {shop} missing', 'Reports missing a whole shop', 'No new orders from one shop', 'Data from one shop stopped'],
		open: [
			'Our reports have had no orders from our {shop} since {since}. The orders from the main shop are all there.',
			'Our {shop} took plenty of orders last week, and none of them are in Tidewell. The main shop is fine.'
		],
		ask: ['Has anything changed in the {shop} recently, such as a new password or a new administrator?', 'Can you see the {shop} under Settings, Connections, and what does it say?'],
		more: ['Not that I know of. Connections shows it with a grey dot.', 'Nothing has changed on our side. The connection is listed, without an error.'],
		look: ['No {orgId} orders from the {shop} connection after {since}. The main shop\'s connection loads every night as normal.', 'The {shop} connection has not loaded since {since}. Checking why.'],
		follow: [['Will the missing orders come in later?', 'Yes. Once the connection loads again, it fetches everything since its last successful load.'], ['Do we need to do anything in the reports?', 'No. The reports read whatever is in the warehouse.']],
		tried: ['I checked the shop, and the orders are definitely there.', 'I looked at Settings, Connections, and nothing says there is an error.'],
		waitFor: ['a word on whether anything has changed in the {shop} recently', 'what Settings, Connections shows for the {shop}'],
		proof: (x) => {
			const rows: string[][] = [];
			for (let d = subWork(x.opened, 10); d < x.opened; d = addWork(d, 1)) rows.push([disp(d), 'main shop', count(int(x.r, 20, 400)), d < x.s.sinceIso! ? x.s.shop! : '', d < x.s.sinceIso! ? count(int(x.r, 5, 90)) : '']);
			return table(['Night of', 'Connection', 'Orders loaded', 'Connection', 'Orders loaded'], rows);
		},
		end: {
			fixed: [
				'E: The {shop} connection was paused on {since} on our side, during the connector upgrade, and never resumed. Resumed it and reloaded from {since}: {loaded} orders loaded.\nS: Hi {first}, this was our doing: the connection to your {shop} was paused on {since} during maintenance on our side and was not switched back on. It is running again, and the {loaded} orders since then are now in your reports.\nC: Thank you, all there now.'
			],
			answered: [
				'E: The {shop} connection fails authorisation since {since}: the shop has withdrawn our access. Only the customer can grant it again.\nS: Hi {first}, the {shop} stopped letting us in on {since}, which usually means someone removed Tidewell\'s access in the shop\'s settings. Reconnecting it under Settings, Connections fixes it, and the missing orders are fetched on the next load.\nC: {colleague} had removed old apps from the shop that week. Reconnected, and the orders are back.'
			]
		}
	},
	// 31. Orders with no region.
	{
		area: 'other',
		repeat: true,
		slots: (x) => ({ k: String(int(x.r, 8, 40)), field: pick(x.r, ['delivery address county', 'shipping region', 'delivery state']) }),
		subjects: ['Orders with no region', 'Blank region in revenue-by-region', 'Empty line in the region report', 'Region missing on some orders'],
		open: [
			'About one order in {k} in our reports has no region at all, so revenue-by-region shows a line with an empty name at the top.',
			'Revenue-by-region has a row with no name, and it is not small. Where do those orders come from?'
		],
		ask: ['Could you send two or three order numbers without a region?', 'Do those orders have anything in common, such as collection in store or a particular country?'],
		more: ['Here are some: {orderId} and two others from the same day. I think they are collection orders.', 'Mostly orders from abroad, as far as I can tell. {orderId} is one.'],
		look: ['{orderId} arrives from the shop with an empty {field}; the region comes from that field.', 'The region column is mapped from the shop\'s {field}. Empty for {orderId} and about 1 in {k} of their orders.'],
		follow: [['Can we fill in the region ourselves?', 'Not in Tidewell. The region is taken from your shop data at each load.'], ['Will old orders be corrected too?', 'Any change to the mapping applies when the orders are next loaded.']],
		tried: ['I checked a few of those orders in the shop.', 'I looked for a way to edit the region in Tidewell but found none.'],
		waitFor: ['two or three order numbers without a region', 'a word on whether those orders have anything in common'],
		art: (x) => regionReport(x, rowsFor(x, x.s.pmFrom!, x.s.pmTo!, int(x.r, 12, 20), { regions: [...x.org.regions, ''], refunds: 0 }), 'table'),
		end: {
			fixed: [
				'E: Our mapping for their shop reads the billing address, not the delivery address, for {field}; collection orders have no billing county. Corrected the mapping and reloaded their orders for the quarter; the blank region is gone.\nS: Hi {first}, this was a mapping mistake on our side: we took the region from the wrong part of the address. It is corrected, your orders have been reloaded, and the empty line has gone from revenue-by-region.\nC: Great, thank you.'
			],
			answered: [
				'S: Hi {first}, those orders arrive from your shop with no {field}, which is where the region comes from. Collection orders often have none. If your shop fills that field for them, for example with the store\'s own region, they will be counted there from the next load.\nC: Makes sense. We will set a default in the shop.'
			]
		}
	}
];

// ---------------------------------------------------------------------------------------------------------------
// Shared parts of a ticket.

const greetings = ['Hi,', 'Hello,', 'Hi there,', 'Good morning,', 'Hello Tidewell team,', 'Dear support,'];
const replyGreetings = ['Hi {agent},', 'Hello {agent},', 'Dear {agent},', '{agent},', 'Hi again,'];
const signs = ['Thanks,\n{first}', 'Best regards,\n{full}\n{title}, {org}', 'Many thanks,\n{first}', 'Cheers,\n{first}', 'Kind regards,\n{full}'];
const backstories = [
	'We have a board meeting on {weekday} and these numbers go into the pack.',
	'I took over the reporting from a colleague who left in December, so forgive me if this is obvious.',
	'I looked through the help centre first but could not find anything that matched.',
	'This is the first time I have had to contact you, so I hope this is the right address.',
	'{colleague} usually deals with Tidewell, but she is away until next week.',
	'We are a small team, and I am the only one who uses Tidewell in any depth.',
	'I raised this in the chat on {weekday}, and the person there asked me to email instead.',
	'Our year end is coming up, so I would be grateful for a quick look.',
	'Apologies for the long email; I wanted to give you everything at once.',
	'It is not urgent, but it has happened often enough now that I want to ask.',
	'I mentioned this to our account manager at the review last month, and she suggested writing in.',
	'We only moved to Tidewell in the autumn, so we are still learning our way around.'
];
const pasteIntros = ['Here is what I see:', 'This is what the page shows:', 'Copied from the page:', 'Pasted below:', 'For reference:'];
const acks = ['Thanks for getting in touch.', 'Thank you for the clear description.', 'Thanks for your message.', 'Sorry for the slow reply; we have had a busy few days.', 'Thanks, and sorry you have run into this.', 'Thank you for writing in, and for all the detail.'];
const supportSigns = ['{agent}\nTidewell support', 'Best wishes,\n{agent}', 'Kind regards,\n{agent}, Tidewell support', '{agent}'];
const escalations = [
	'Passing this to analytics. Customer\'s details and paste are above.',
	'Escalating: I could not explain this from the help centre. Over to analytics.',
	'For analytics, please. {org} has been with us since 2024; {first} is their main contact.',
	'Not one I can answer. Analytics, could you take a look? The customer expects a reply this week.',
	'Escalating to analytics with everything the customer sent. I have told them we are looking into it.'
];
const holds = [
	'Thank you. I have passed this to our analytics team with everything you sent, and I will come back to you as soon as they have had a look.',
	'Thank you, that is very helpful. Our engineers are looking at it now.',
	'Thanks for the detail. I have asked the team that looks after this part of Tidewell to investigate, and I will keep you posted.'
];
const guessBug = ['From what I can see so far, this looks like a fault on our side, so I have asked the team to look at it.', 'I think you may have found a bug. I will pass it on with your example.'];
const guessFine = ['As far as I can tell this is working as intended, but let me check with the team before I say so for certain.', 'My first thought is that this is expected behaviour, but I would rather the team confirmed it.'];
const chasers = ['Any news on this?', 'Just checking where this has got to.', 'Is there any update? We have our numbers meeting on {weekday}.', 'Sorry to chase. Has anyone had a chance to look?'];
const chaseReplies = ['Sorry for the wait. The team is on it, and I expect an answer in the next day or two.', 'Not yet, I am afraid, but it is with the right people. I will update you as soon as I hear.', 'Thanks for your patience. The engineer looking at it has asked me for nothing more, which usually means an answer is close.'];
const sides: [string, string][] = [
	['can I change the name of a dashboard after it has been created?', 'Yes: open the dashboard, select its title and type the new one.'],
	['is there a status page we can follow?', 'There is, at status.tidewell.example, and you can subscribe to it by email.'],
	['our invoices should go to our accounts team from next month. Who do I tell?', 'I have passed that to our billing colleagues, who will confirm by email.'],
	['do you run training sessions for new users?', 'There is an introductory webinar on the first Tuesday of each month; the link is in the help centre.'],
	['does the web app work on an iPad?', 'Yes, in Safari. Dashboards switch to a single column on narrow screens.'],
	['can I move a widget from one dashboard to another?', 'Not directly. Add a widget with the same report and filters to the other dashboard, then remove the old one.'],
	['is there a dark mode?', 'Not yet, though a few customers have asked for it.'],
	['when is the next release?', 'We release most weeks; notable changes are listed on the What\'s new page of the help centre.'],
	['how do I add a colleague to our account?', 'Anyone who is an admin in your organisation can invite people under Settings, Users.'],
	['can we change the colours of the charts?', 'Not at the moment; the charts use one palette for every customer.']
];
const engineerAsides = [
	'Unrelated: the help centre article for this still shows the old screenshots. Told docs.',
	'Staging was rebuilt on {weekday}, so anyone testing should re-import the demo organisation first.',
	'Took longer than it should have because the log search was slow again this morning.',
	'Pairing with support on the reply.'
];
const about = [
	'We use Tidewell mostly for the weekly trading figures and the monthly board pack.',
	'Most of our reporting runs through Tidewell now; the main dashboard is on the screen in the sales office all day.',
	'Tidewell is how the owners see the numbers each week, so I like to be sure they are right.',
	'We have used the reports since we joined and started on pipelines this winter.',
	'Our finance team and the regional managers are the main users; I look after the set-up.',
	'We send a summary from Tidewell to our investors every month.',
	'I am the person here who knows Tidewell best, which is not saying much.',
	'We run {n} shops and a web shop, and Tidewell brings them together for us.'
];
const colleagueNotes = [
	'Copying myself in, as I will be covering for {first} next week.',
	'One detail from my side: I see exactly the same thing on my own login.',
	'{first} asked me to add that several of us are waiting on this, so we would be grateful for an answer this week.',
	'I look after our side of this with {first}, so please keep me in the replies.',
	'I can confirm what {first} describes, in case a second pair of eyes helps.'
];
const checks: Record<Area, string[]> = {
	reports: ['Also checked last night\'s warehouse load for {orgId}: completed without errors, row counts in line with the week before.', 'Ran the same report for {orgId} over two other periods to make sure it is not one bad day. Same picture.', 'Nothing unusual in the reports service logs for {orgId} this week: no errors, normal response times.'],
	dashboards: ['Checked their other dashboards: they all render normally.', 'The web app logs for {orgId} show nothing else unusual this week.', 'Their dashboards were all moved to saved reports in the autumn along with everyone else\'s; nothing special about this account.'],
	search: ['Search for {orgId} otherwise looks normal: a few hundred searches this week, nearly all answered in under 50 ms.', 'Their documents were synced from their drive overnight, as usual.', 'Looked at a sample of their other searches from this week; nothing odd.'],
	pipelines: ['Their other pipelines ran normally all week.', 'The scheduler itself is fine: this morning\'s runs all started and finished on time.', 'Checked their run history back to the start of the month for anything else odd; nothing.'],
	other: ['Nothing else unusual on the account: connections loading nightly, users signing in normally.', 'Checked the account history for recent changes; nothing beyond what is mentioned above.', 'Asked the platform team whether anything changed on our side that week; they say not.']
};
const pastSubjects = ['Invoice address change', 'Adding users for the new office', 'Training session booking', 'Connection to our shop after their upgrade', 'Password reset email not arriving', 'Renewal quote', 'Help with our first pipeline', 'Export to Excel', 'Report for the auditors', 'Dashboard for the shop managers', 'Moving our account to a new admin', 'Question about the autumn release', 'Two-step sign-in for our team', 'Order totals in the weekly email', 'Region names after our restructure', 'Removing a former employee'];
/** The customer panel the helpdesk printed at the top of each ticket. It is the same for every ticket of one organisation. */
const panel = (org: Org): string => {
	const r = mulberry32(0x0c0ffee + org.index * 131);
	const connections = pick(r, ['main shop', 'main shop, wholesale portal', 'web shop, shop tills', 'main shop, marketplace shop', 'web shop', 'web shop, second web shop']);
	const head = table(['Customer since', 'Plan', 'Users', 'Connections', 'Pipelines', 'Default locale'], [[`${monthsEn[int(r, 0, 11)]} ${int(r, 2022, 2024)}`, pick(r, ['Essentials', 'Standard', 'Standard', 'Plus']), String(int(r, 4, 60)), connections, String(int(r, 1, 7)), org.locale]]);
	const past: string[][] = [];
	let number = int(r, 24000, 25500);
	let date = `2025-0${int(r, 1, 3)}-${pad(int(r, 1, 28))}`;
	for (let i = int(r, 1, 5); i > 0; i--) {
		number += int(r, 300, 1500);
		date = addDays(date, int(r, 20, 70));
		if (date > '2025-12-19') break;
		past.push([String(number), disp(date), pick(r, pastSubjects)]);
	}
	return past.length ? `${head}\n\nTheir tickets in 2025:\n\n${table(['Ticket', 'Opened', 'Subject'], past)}` : head;
};
const reproIntros = ['Reproduced on staging with the demo organisation:', 'Same on staging, with the demo organisation set up like theirs:', 'What I get on staging with an equivalent set-up:'];
const againIntros = ['Here is another example:', 'And another one, so you have two to compare:', 'The same thing again:'];
const earlyIntros = ['A quick one first, before the real reason I am writing.', 'Two things, if I may. The small one first:', 'First, something that has puzzled us for a while.'];
const mainIntros = ['Now the main thing.', 'The main reason I am writing is this.', 'Now the reason I am really writing.'];
const bridges = ['While you look into that, a different question.', 'Something else, while I have you.', 'Unrelated to the above, but I may as well ask here.', 'Another thing came up this morning.'];
const waitAsks = ['One thing would help us finish this: {waitFor}. Could you send it when you have a moment?', 'Before we go further, we need one more thing from you: {waitFor}.'];
const reminders = [
	'Just following up on my message of {prev}: we still need {waitFor} before we can go further.',
	'I have not heard back, so I am keeping this ticket open for now. As soon as you send {waitFor}, we will pick it up.',
	'A gentle reminder that we are waiting for {waitFor}. No rush, but nothing will happen on our side until then.'
];
const awayReplies = ['Automatic reply: I am out of the office until {back} with limited access to email. For anything urgent, please contact {colleague}.', 'Automatic reply: thank you for your email. I am on leave until {back} and will reply when I return.'];

// ---------------------------------------------------------------------------------------------------------------
// One ticket.

const fill = (text: string, s: Record<string, string>) =>
	text.replace(/\{(\w+)\}/g, (whole, key: string) => {
		if (s[key] !== undefined) return s[key]!;
		const lower = key.charAt(0).toLowerCase() + key.slice(1);
		if (key !== lower && s[lower] !== undefined) return cap(s[lower]!);
		if (key.startsWith('"') || /^[a-z]+$/.test(key) === false) return whole;
		throw new Error(`missing slot ${key} in: ${text.slice(0, 60)}`);
	});

const ticket = (index: number, opened: string, number: number): string => {
	const r = mulberry32(0x7e1d0000 + index * 7919);
	const topic = topics[(index * 13 + int(r, 0, 5)) % topics.length]!;
	const pool = topic.orgs ? orgs.filter(topic.orgs) : orgs;
	const org = pick(r, pool);
	const people = contacts(org);
	const who = pick(r, people);
	const colleague = pick(r, people.filter((p) => p !== who));
	const agent = pick(r, agents);
	const eng = pick(r, engineers);
	const regions = shuffle(r, org.regions);
	const pmEnd = addDays(`${opened.slice(0, 7)}-01`, -1);
	const pmStart = `${pmEnd.slice(0, 7)}-01`;
	const weekAgo = subWork(opened, int(r, 3, 6));
	const s: Record<string, string> = {
		first: who.first, full: who.full, title: who.title, org: org.name, orgId: org.id, agent, eng, colleague: colleague.first,
		region: regions[0]!, Region: cap(regions[0]!), region2: regions[1]!, cur1: org.cur[0]!, cur2: org.cur[1] ?? org.cur[0]!, zone: org.zone,
		weekday: weekdayNames[at(subWork(opened, int(r, 1, 4))).getUTCDay()]!, n: String(int(r, 3, 19)),
		pm: `${monthsEn[Number(pmEnd.slice(5, 7)) - 1]} ${pmEnd.slice(0, 4)}`, pmShort: monthsEn[Number(pmEnd.slice(5, 7)) - 1]!,
		pmFrom: pmStart, pmTo: pmEnd, pmFromDisp: longDate(pmStart), pmToDisp: longDate(pmEnd), pmToDay: ordinal(Number(pmEnd.slice(8))),
		pmToNext: addDays(pmEnd, 1), pmToPrev: addDays(pmEnd, -1), pmToPrevDisp: longDate(addDays(pmEnd, -1)), pmToMinus3: addDays(pmEnd, -3),
		weekAgo, orderId: `${org.prefix}-${int(r, 20000, 69999)}`, amount: money(int(r, 2000, 240000), org.cur[0]!, org.locale)
	};
	const cents = int(r, 2000, 90000);
	s.amtNative = money(cents, s.cur2!, org.locale);
	s.amtWrong = money(cents, s.cur1!, org.locale);
	const x: X = { r, org, who, role: who.role, locale: org.locale, opened, s };
	const base = { ...s };
	Object.assign(s, topic.slots?.(x) ?? {});

	const allowed = topic.allow?.(x) ?? (Object.keys(topic.end) as Outcome[]);
	const choices: Outcome[] = [...allowed, ...allowed, 'waiting'];
	const outcome = choices[int(r, 0, choices.length - 1)]!;

	// Time moves forward through the thread, on working days.
	let day = opened;
	let minute = int(r, 8 * 60 + 5, 16 * 60);
	const later = (min: number, max: number) => {
		minute += int(r, min, max);
		while (minute > 17 * 60 + 40) {
			day = addWork(day, 1);
			minute = minute - 9 * 60 - int(r, 0, 90);
		}
		if (minute < 8 * 60) minute = 8 * 60 + int(r, 0, 50);
	};
	const nextDays = (min: number, max: number) => {
		const days = int(r, min, max);
		if (days === 0) return later(20, 240);
		day = addWork(day, days);
		minute = int(r, 8 * 60 + 10, 16 * 60);
	};
	const when = () => `${disp(day)}, ${pad(Math.floor(minute / 60))}:${pad(minute % 60)}`;
	const messages: string[] = [];
	const paragraphs = (text: string) => fill(text, s).split(' ¶ ');
	const customer = (body: string[], first = false) => {
		const greet = first ? pick(r, greetings) : r() < 0.6 ? fill(pick(r, replyGreetings), s) : '';
		const sign = first ? fill(pick(r, signs), s) : r() < 0.5 ? who.first : fill(pick(r, signs.slice(0, 4)), s);
		messages.push([`**${who.full}** (${org.name}) · ${when()}`, ...(greet ? [greet] : []), ...body, sign].join('\n\n'));
	};
	const support = (body: string[]) => messages.push([`**${agent}** (Tidewell support) · ${when()}`, `Hi ${who.first},`, ...body.map(cap), fill(pick(r, supportSigns), s)].join('\n\n'));
	const supportNote = (body: string[]) => messages.push([`**${agent}** (Tidewell support) · internal note · ${when()}`, ...body].join('\n\n'));
	const engineerNote = (body: string[]) => messages.push([`**${eng}** (analytics) · internal note · ${when()}`, ...body].join('\n\n'));
	const stripHi = (text: string) => cap(text.replace(/^(Hi|Hello) \{first\}, /, '').replace(/^(Thanks for waiting|Thank you for your patience|Thanks for the export|Thanks), \{first\}\. /, (_, thanks: string) => `${thanks}. `));

	// Other matters the customer raises in the same ticket, which support settles without the engineers.
	const extras: { open: string; tried: string; art: string; answer: string[]; reply: string; subject: string }[] = [];
	const howMany = pick(r, [0, 1, 1, 2, 2, 2, 3, 3]);
	for (const other of shuffle(r, topics)) {
		if (extras.length >= howMany) break;
		if (other === topic || !other.end.answered || (other.orgs && !other.orgs(org))) continue;
		const s2: Record<string, string> = { ...base };
		const x2: X = { ...x, s: s2 };
		Object.assign(s2, other.slots?.(x2) ?? {});
		if (!(other.allow?.(x2) ?? ['answered']).includes('answered')) continue;
		const lines = pick(r, other.end.answered).split('\n');
		const answer = lines.find((line) => line.startsWith('S: '))!;
		const reply = lines.slice(lines.indexOf(answer) + 1).find((line) => line.startsWith('C: '));
		extras.push({
			open: fill(pick(r, other.open), s2),
			tried: r() < 0.4 ? fill(pick(r, other.tried), s2) : '',
			art: other.art && r() < 0.7 ? `${pick(r, pasteIntros)}\n\n${other.art(x2)}` : '',
			answer: fill(stripHi(answer.slice(3)), s2).split(' ¶ '),
			reply: reply ? fill(reply.slice(3), s2) : 'Thanks, that answers it.',
			subject: fill(pick(r, other.subjects), s2)
		});
	}
	const early = extras.length && r() < 0.4 ? extras.shift() : undefined;
	const subject = early && r() < 0.5 ? early.subject : fill(pick(r, topic.subjects), s);

	// 1. The customer writes in.
	const side = !early && r() < 0.3 ? pick(r, sides) : undefined;
	const sideFirst = side !== undefined && r() < 0.5;
	const open = fill(pick(r, topic.open), s);
	const first: string[] = sideFirst ? [`Two things, if I may. First, a quick one: ${side![0]}`, `Second, and this is the main reason I am writing. ${open}`] : [open];
	if (early) first.unshift(`${pick(r, earlyIntros)} ${early.open}`, ...(early.tried ? [early.tried] : []), ...(early.art ? [early.art] : []), pick(r, mainIntros));
	if (r() < 0.45) first.splice(sideFirst ? 1 : 0, 0, fill(pick(r, about), s));
	if (r() < 0.7) first.push(fill(pick(r, topic.tried), s));
	if (r() < 0.5) first.push(fill(pick(r, backstories), s));
	let artUsed = false;
	if (topic.art && r() < 0.5) {
		first.push(`${pick(r, pasteIntros)}\n\n${topic.art(x)}`);
		artUsed = true;
	}
	if (side && !sideFirst) first.push(`Also, unrelated: ${side[0]}`);
	customer(first, true);

	// 2. Support asks for what it needs.
	later(25, 200);
	const reply = [pick(r, acks)];
	if (early) reply.push('Your first question first.', ...early.answer, 'Now the main one.');
	const faultLike = 'answered' in topic.end && ('bug' in topic.end || 'fixed' in topic.end);
	if (faultLike && r() < 0.4 && outcome !== 'waiting') reply.push(pick(r, outcome === 'answered' ? guessBug : guessFine));
	const pair = int(r, 0, topic.ask.length - 1);
	reply.push(fill(topic.ask[pair]!, s));
	if (side) reply.push(`On your other question: ${side[1].startsWith('I ') ? side[1] : side[1].charAt(0).toLowerCase() + side[1].slice(1)}`);
	support(reply);

	const remind = (times: number, waitFor: string) => {
		let prev = disp(day);
		for (let i = 0; i < times; i++) {
			nextDays(3, 4);
			support([fill(pick(r, reminders), { ...s, prev, waitFor })]);
			if (i === 0 && r() < 0.3) {
				later(1, 3);
				messages.push([`**${who.full}** (${org.name}) · ${when()}`, fill(pick(r, awayReplies), { ...s, back: disp(addWork(day, int(r, 3, 8))) })].join('\n\n'));
			}
			prev = disp(day);
		}
	};
	if (outcome === 'waiting' && r() < 0.1) {
		remind(int(r, 1, 2), fill(topic.waitFor[pair]!, s));
		return finish(number, subject, org, who, opened, messages);
	}

	// 3. The customer answers.
	later(60, 600);
	const moreText = topic.more[pair] ?? pick(r, topic.more);
	const more = [...(early ? [early.reply] : []), fill(moreText, s)];
	if (topic.art && (!artUsed || topic.repeat)) more.push(artUsed ? `${pick(r, againIntros)}\n\n${topic.art(x)}` : topic.art(x));
	customer(more);
	if (r() < 0.3) {
		later(20, 300);
		messages.push([`**${colleague.full}** (${org.name}) · ${when()}`, fill(pick(r, colleagueNotes), s), colleague.first].join('\n\n'));
	}

	// 4. Support passes it on, and an engineer looks.
	later(5, 40);
	supportNote([fill(pick(r, escalations), s)]);
	if (r() < 0.7) {
		later(1, 10);
		support([fill(pick(r, holds), s)]);
	}
	nextDays(0, 2);
	const look = [fill(pick(r, topic.look), s)];
	if (topic.proof) look.push(topic.proof(x));
	else if (topic.art && r() < 0.7) look.push(`${pick(r, reproIntros)}\n\n${topic.art(x)}`);
	if (r() < 0.25) look.push(fill(pick(r, engineerAsides), s));
	engineerNote(look);
	if (r() < 0.5) {
		later(30, 300);
		engineerNote([fill(pick(r, checks[topic.area]), s)]);
	}

	// 5. Questions while the customer waits.
	for (const extra of extras) {
		later(60, 600);
		customer([`${pick(r, bridges)} ${extra.open}`, ...(extra.tried ? [extra.tried] : []), ...(extra.art ? [extra.art] : [])]);
		later(20, 240);
		support(extra.answer);
		if (r() < 0.6) {
			later(30, 400);
			customer([extra.reply]);
		}
	}
	const other = topic.ask.length > 1 && topic.more.length > 1 ? 1 - pair : -1;
	if (outcome !== 'waiting' && other >= 0 && r() < 0.5) {
		later(30, 200);
		support([`The engineer looking at this has one more question before going further. ${fill(topic.ask[other]!, s)}`]);
		later(60, 500);
		const again = [fill(topic.more[other]!, s)];
		if (topic.art) again.push(topic.art(x));
		customer(again);
	}
	if (r() < 0.3) {
		later(60, 500);
		customer([fill(pick(r, chasers), s)]);
		later(20, 120);
		support([pick(r, chaseReplies)]);
	}
	for (const [question, answer] of shuffle(r, topic.follow)) {
		if (r() < 0.4) continue;
		later(60, 400);
		customer([fill(question, s)]);
		later(20, 200);
		support([fill(answer, s)]);
	}

	// 6. How it ends.
	if (outcome === 'waiting') {
		const waitFor = fill(topic.waitFor[other >= 0 ? other : pair]!, s);
		later(60, 400);
		support([other >= 0 && r() < 0.6 ? `The engineer looking at this has one more question before going further. ${fill(topic.ask[other]!, s)}` : fill(pick(r, waitAsks), { ...s, waitFor })]);
		remind(int(r, 1, 2), waitFor);
	} else {
		const script = pick(r, topic.end[outcome]!);
		for (const line of script.split('\n')) {
			const kind = line.slice(0, 1);
			const text = line.slice(3);
			if (kind === 'E') {
				nextDays(0, 1);
				later(0, 120);
				engineerNote(paragraphs(text));
			} else if (kind === 'N') {
				later(5, 60);
				supportNote(paragraphs(text));
			} else if (kind === 'S') {
				later(10, 240);
				support(paragraphs(stripHi(text)));
			} else {
				later(30, 500);
				customer(paragraphs(text));
			}
		}
		// Now and then the customer asks something else once the matter is settled.
		if (r() < 0.25) {
			const [question, answer] = pick(r, sides.filter((item) => item !== side));
			later(20, 300);
			customer([`One more thing while I have you: ${question}`]);
			later(20, 200);
			support([answer]);
		}
	}
	return finish(number, subject, org, who, opened, messages);
};

const finish = (number: number, subject: string, org: Org, who: Person, opened: string, messages: string[]) =>
	[`# Ticket ${number}: ${subject}`, `${org.name} (${org.id}) · opened ${disp(opened)} by ${who.full}, ${who.title} · by email`, panel(org), ...messages.map((message) => `---\n\n${message}`)].join('\n\n') + '\n';

const folder = join(root, 'docs', 'escalations');
mkdirSync(folder, { recursive: true });
const order = mulberry32(20260105);
let number = 31200;
for (let index = 0; index < ITEMS; index++) {
	number += int(order, 4, 41);
	const opened = workdays[Math.floor((index * workdays.length) / ITEMS)]!;
	writeFileSync(join(folder, `${number}.md`), ticket(index, opened, number));
}
writeFileSync(
	join(folder, 'README.md'),
	`# Escalated tickets\n\nThe ${ITEMS} tickets that Tidewell support escalated to the analytics team between 5 January and 13 March 2026, one\nfile each, as the old helpdesk exported them: the messages to and from the customer, and the internal notes. The\nexport dropped the ticket fields: status, tags, assignee and priority. Pasted output is as its writer pasted it.\n`
);
