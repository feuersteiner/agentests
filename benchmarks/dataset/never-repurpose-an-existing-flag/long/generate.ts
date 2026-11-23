// Writes the long material of this entry's long task: the escalations that larkspur-router's on-call engineer took
// in #router-oncall between 15 September and 13 November 2026, one Markdown file each, under docs/oncall/, as the
// incident tool exported them, without severities, causes or resolutions. Deterministic: fixed seeds, no clock, no
// network.
//   bun long/generate.ts <workspace root>
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** How many escalations to write. Dates, numbers and the share of each topic all follow from it. */
const ITEMS = 195;

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
const group = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const pad = (n: number, width = 2) => String(n).padStart(width, '0');
const firstName = (name: string) => name.split(' ')[0]!;

// Time is kept in milliseconds of New York wall-clock time, stored as if it were UTC.
const MIN = 60_000;
const DAY = 1440 * MIN;
const FIRST = Date.UTC(2026, 8, 15); // Tuesday 15 September, the day after 1.8.0
const LAST = Date.UTC(2026, 10, 13); // Friday 13 November
const WEEK0 = Date.UTC(2026, 8, 14); // the Monday the rota week starts on
const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const at = (t: number) => new Date(t);
const hm = (t: number) => `${pad(at(t).getUTCHours())}:${pad(at(t).getUTCMinutes())}`;
const hms = (t: number) => `${hm(t)}:${pad(at(t).getUTCSeconds())}`;
const stamp = (t: number) => `${hms(t)}.${pad(at(t).getUTCMilliseconds(), 3)}`;
const weekday = (t: number) => dayNames[at(t).getUTCDay()]!;
const dayMonth = (t: number) => `${at(t).getUTCDate()} ${monthNames[at(t).getUTCMonth()]}`;
const journal = (t: number) => `${monthNames[at(t).getUTCMonth()]!.slice(0, 3)} ${pad(at(t).getUTCDate())}`;
const midnight = (t: number) => t - (t % DAY);
const minuteOfDay = (t: number) => Math.floor((t % DAY) / MIN);
const isWeekday = (t: number) => at(t).getUTCDay() % 6 !== 0;
const addWeekdays = (t: number, n: number) => {
	let d = midnight(t);
	while (n > 0) {
		d += DAY;
		if (isWeekday(d)) n--;
	}
	return d;
};
const weekdayBefore = (t: number, n: number) => {
	let d = midnight(t);
	while (n > 0) {
		d -= DAY;
		if (isWeekday(d)) n--;
	}
	return d;
};
const tradingDays: number[] = [];
for (let d = FIRST; d <= LAST; d += DAY) if (isWeekday(d)) tradingDays.push(d);

// People.
const rota = ['Dana Whitfield', 'Ravi Subramanian', 'Imogen Clarke', 'Kofi Mensah', 'Lena Hartmann'];
const onCall = (t: number) => rota[(((Math.floor((midnight(t) - WEEK0) / (7 * DAY)) % rota.length) + rota.length) % rota.length)]!;
const lead = 'Marcus Feld';
const toolsDevs = ['Yusuf Karaca', 'Beth Ostrowski', 'Arun Pillai'];
const platformEngineers = ['Hiro Tanabe', 'Siobhan Reilly'];
const opsAnalysts = ['Carla Mendes', 'Pete Lazarus'];
const formerContacts = ['Gary Whelan', 'Ruth Abernathy', 'Simon Achebe'];
const clients = ['Harrow County Pension', 'Bellwether Endowment', 'Tamsin Capital', 'Northgate Teachers’ Fund', 'Aldous Asset Management', 'Corran Foundation'];

interface Desk {
	key: string;
	name: string;
	tool: string;
	traders: string[];
	venue: string;
	limit: number;
	host: string;
	context: string[];
}
const desks: Desk[] = [
	{ key: 'program', name: 'program trading', tool: 'Basketeer', traders: ['Priya Raman', 'Owen Gallagher', 'Nadia Petrov'], venue: 'XNYS', limit: 50000, host: 'rtr-a', context: ['We have the {client} transition basket going out today, so every minute counts.', 'The rebalance baskets for {client} are today and I need to know we’re clear.', 'We’re working a {n2}-name basket for {client} today.'] },
	{ key: 'cash', name: 'cash trading', tool: 'Ledger', traders: ['Sofia Marchetti', 'Jamal Wright', 'Colm Brennan'], venue: 'XNYS', limit: 50000, host: 'rtr-a', context: ['{client} is on the phone asking where their order is.', 'This is a care order for {client}, and they watch every print.', 'It’s a busy day and the client is waiting on us.'] },
	{ key: 'etf', name: 'ETF trading', tool: 'Primer', traders: ['Hannah Lindqvist', 'Victor Osei', 'Ines Duarte'], venue: 'XNYS', limit: 250000, host: 'rtr-b', context: ['We have creations to hedge for {client} today.', 'Our quotes on the screen depend on these going out on time.', 'We have a big redemption for {client} today.'] },
	{ key: 'indexarb', name: 'index arbitrage', tool: 'Arbiter', traders: ['Tariq Haddad', 'Elena Sokolova', 'Ben Adair'], venue: 'XNYS', limit: 50000, host: 'rtr-a', context: ['The spread only lasts minutes, so anything slow costs us money.', 'We’re running the futures roll today.', 'The arbitrage book is live and the legs need to go together.'] },
	{ key: 'hedging', name: 'options hedging', tool: 'Hedgehog', traders: ['Mei Tanaka', 'Luis Ortega', 'Grace Kim'], venue: 'XNAS', limit: 20000, host: 'rtr-b', context: ['Our delta hedges go out automatically, so I only notice when the book drifts.', 'It’s an expiry week, and the hedges matter more than usual.', 'The options book is moving a lot today.'] },
	{ key: 'riskarb', name: 'risk arbitrage', tool: 'Merger', traders: ['Gwen Albright', 'Samir Bose'], venue: 'XNYS', limit: 25000, host: 'rtr-b', context: ['We’ve been on the broker’s system for years and it’s time to move.'] }
];
const liveDesks = ['program', 'cash', 'etf', 'indexarb', 'hedging'];
const sessionsOf: Record<string, string[]> = { 'rtr-a': ['XNYS-1', 'XNYS-2', 'XNAS-2'], 'rtr-b': ['XNYS-3', 'XNAS-1'], 'rtr-uat': ['XTST-1'] };

type Quote = [string, number];
const stocks: Quote[] = [
	['IBM', 182.5], ['MSFT', 410.0], ['AAPL', 228.4], ['JPM', 241.1], ['XOM', 118.3], ['KO', 69.85], ['PFE', 26.4], ['CAT', 372.15],
	['DIS', 112.6], ['GE', 186.2], ['HD', 401.75], ['WMT', 82.45], ['INTC', 22.85], ['CSCO', 58.3], ['BA', 154.9], ['NKE', 74.2],
	['MRK', 98.6], ['CVX', 151.4], ['GS', 512.3], ['UNH', 528.9], ['PG', 168.2], ['MMM', 131.5], ['ORCL', 176.4], ['AMD', 152.3],
	['NVDA', 138.6], ['F', 10.85], ['BAC', 43.7], ['C', 67.2], ['T', 27.1], ['VZ', 41.3], ['PEP', 158.9], ['ABT', 117.4]
];
const etfs: Quote[] = [['SPY', 568.2], ['QQQ', 489.1], ['IWM', 221.4], ['XLF', 46.3], ['XLE', 91.2], ['GLD', 245.7], ['EEM', 44.8], ['TLT', 92.6], ['XLK', 231.5], ['DIA', 421.3]];
const longNames: [string, string][] = [['BRKBCLASSB', 'BRK.B'], ['BFBCLASSB', 'BF.B'], ['GOOGLCLASSA', 'GOOGL'], ['LENBCLASSB', 'LEN.B'], ['HEIACLASSA', 'HEI.A'], ['MOGACLASSA', 'MOG.A']];
const listings = ['KLRA', 'VNTX', 'HBRW', 'QELO', 'ZUNO'];

// What a topic's messages can fill in. Every key is set for every escalation; topics add their own in `prep`.
type V = Record<string, string>;
interface Ctx {
	r: Rand;
	v: V;
	desk: Desk;
	dep: string;
	host: string;
	venue: string;
	limit: number;
	universe: Quote[];
	sym: Quote;
	sym2: Quote;
	idBase: number;
	start: number;
	x: Record<string, any>;
}

// Pasted output. Each returns a block of text built from the escalation's own numbers.
const fence = (lines: string[], lang = 'text') => '```' + lang + '\n' + lines.join('\n') + '\n```';
const drift = (r: Rand, price: number) => (price * (1 + (r() - 0.5) * 0.01)).toFixed(2);
const lot = (r: Rand) => pick(r, [100, 100, 200, 300, 500, 500, 800, 1000, 1200, 1500, 2000, 2500, 3000, 5000]);
const side = (r: Rand) => (r() < 0.55 ? 'B' : 'S');

/** Moves every timestamp at the start of a line by `delta` milliseconds, so that a log ends where it should. */
const shiftLines = (lines: string[], delta: number) =>
	lines.map((line) => {
		const m = /^(\d\d):(\d\d):(\d\d)\.(\d{3})/.exec(line);
		if (!m) return line;
		const ms = ((Number(m[1]) * 60 + Number(m[2])) * 60 + Number(m[3])) * 1000 + Number(m[4]) + delta;
		return stamp(ms) + line.slice(12);
	});
const lastTime = (lines: string[]) => {
	for (let i = lines.length - 1; i >= 0; i--) {
		const m = /^(\d\d):(\d\d):(\d\d)\.(\d{3})/.exec(lines[i]!);
		if (m) return ((Number(m[1]) * 60 + Number(m[2])) * 60 + Number(m[3])) * 1000 + Number(m[4]);
	}
	return 0;
};
/** Logs of what led to a report end shortly before it was opened; logs of the present end when they are pasted. */
const anchor = (c: Ctx, t: number) => (Math.min(t, c.start + 30_000) % DAY) - int(c.r, 3_000, 40_000);

const routeLog = (c: Ctx, t: number, kind: string) => {
	const { r } = c;
	const lines: string[] = [];
	const count = int(r, 14, 24);
	let clock = t - int(r, 60, 240) * 1000;
	const host = kind === 'uat' || kind === 'testuat' ? 'rtr-uat' : c.host;
	const dep = kind === 'uat' || kind === 'testuat' ? 'uat' : c.dep;
	const special = new Set<number>();
	const wanted = kind === 'limit' ? int(r, 2, 3) : kind === 'zero' ? int(r, 3, 5) : kind === 'symbol' ? int(r, 2, 4) : kind === 'one' ? 1 : 0;
	while (special.size < wanted) special.add(int(r, 2, count - 2));
	let id = c.idBase;
	let gapDone = false;
	for (let i = 0; i < count; i++) {
		clock += int(r, 40, kind === 'test' || kind === 'testuat' ? 2500 : 9000);
		if (kind === 'gap' && !gapDone && i === Math.floor(count / 2)) {
			clock += c.x.gapMinutes * MIN;
			gapDone = true;
		}
		id += int(r, 1, 40);
		const [sym, price] = pick(r, kind === 'plain' ? c.universe.filter(([name]) => name !== c.sym[0]) : c.universe);
		const px = drift(r, price);
		let level = 'INFO ';
		let text = `routed id=${id} ${sym} ${side(r)} ${lot(r)} @${px} -> ${c.venue}`;
		if (kind === 'test' || kind === 'testuat') {
			const [tsym, tprice] = pick(r, etfs);
			level = 'WARN ';
			text = `rejected id=${id} ${tsym} ${side(r)} ${pick(r, [100, 200, 500])} @${drift(r, tprice)}: TEST orders are not allowed here`;
		} else if (kind === 'uat') {
			text = `routed id=${id} ${sym} ${side(r)} ${pick(r, [100, 200, 500])} @${px} -> SIMULATOR`;
		} else if (special.has(i)) {
			if (kind === 'limit') {
				level = 'WARN ';
				text = `rejected id=${id} ${c.sym[0]} ${side(r)} ${c.x.logQty} @${drift(r, c.sym[1])}: quantity ${c.x.logQty} is outside the limit of ${c.x.logLimit} shares`;
			} else if (kind === 'zero') {
				level = 'WARN ';
				text = `rejected id=${id} ${sym} ${side(r)} 0 @${px}: quantity 0 is outside the limit of ${c.limit} shares`;
			} else if (kind === 'symbol') {
				text = `routed id=${id} ${c.x.sent} ${side(r)} ${lot(r)} @${c.x.cutPrice} -> ${c.venue}`;
			} else if (kind === 'one') {
				text = `routed id=${c.v.id} ${c.sym[0]} B ${c.v.qtyRaw} @${drift(r, c.sym[1])} -> ${c.venue}`;
			}
		}
		lines.push(`${stamp(clock)} ${host} ${dep.padEnd(8)} ${level} ${text}`);
	}
	if (kind === 'gap') {
		const first = /^(\d\d):(\d\d)/.exec(lines[0]!)!;
		const moved = shiftLines(lines, (12 * 60 - Number(first[1]) * 60 - Number(first[2])) * MIN + int(r, 1, 20) * 1000);
		return fence([`$ logq --service larkspur-router@${dep} --from ${c.x.gapFromLong} --limit ${count}`, ...moved]);
	}
	return fence(kind === 'plain' || kind === 'uat' ? lines : shiftLines(lines, anchor(c, t) - lastTime(lines)));
};

/** The same basket lines routed twice, the second time a minute or so later, or a second tranche of other sizes. */
const routeTwice = (c: Ctx, t: number) => {
	const { r } = c;
	const lines = shuffle(r, c.universe).slice(0, int(r, 6, 10)).map(([sym, price]) => [sym, side(r), lot(r), drift(r, price)] as const);
	const out: string[] = [];
	let clock = t - int(r, 120, 200) * 1000;
	let id = c.idBase;
	for (const round of [0, 1]) {
		for (const [sym, s, qty, px] of lines) {
			clock += int(r, 3, 40);
			id += int(r, 1, 6);
			const size = round === 1 && c.x.tranche ? qty * pick(r, [2, 3]) : qty;
			out.push(`${stamp(clock)} ${c.host} ${c.dep.padEnd(8)} INFO  routed id=${id} ${sym} ${s} ${size} @${px} -> ${c.venue}`);
		}
		clock += int(r, 45, 90) * 1000;
	}
	return fence(out);
};

/** One order's way through the router and the venue, for a question about a single order. */
const historyLog = (c: Ctx, t: number) => {
	const { r } = c;
	const [sym, price] = c.sym2;
	const id = c.v.id2!;
	const qty = lot(r) * pick(r, [1, 2, 4]);
	let clock = weekdayBefore(t, 1) + int(r, 600, 900) * MIN + int(r, 0, 59999);
	const px = c.x.limitPx ?? drift(r, price);
	const fillPx = c.x.fillPx ?? px;
	const sess = c.v.sess!;
	const lines = [`$ logq --service larkspur-router@${c.dep} --order ${id} --day ${dayMonth(clock).replace(' ', '-')}`];
	lines.push(`${stamp(clock)} ${c.host} ${c.dep.padEnd(8)} INFO  received id=${id} from ${c.v.ip}`);
	lines.push(`${stamp(clock)} ${c.host} ${c.dep.padEnd(8)} INFO  routed id=${id} ${sym} ${side(r)} ${qty} @${px} -> ${c.venue}`);
	clock += int(r, 1, 4);
	lines.push(`${stamp(clock)} ${sess} <- ack id=${id}`);
	let left = qty;
	while (left > 0) {
		const part = Math.min(left, pick(r, [100, 200, 300, 500, 500, 1000]));
		left -= part;
		clock += int(r, 200, 90000);
		lines.push(`${stamp(clock)} ${sess} <- fill id=${id} ${part} @${fillPx}${left ? '' : ' (done)'}`);
	}
	return fence(lines);
};

const venueLog = (c: Ctx, t: number, kind: string) => {
	const { r } = c;
	const lines: string[] = [];
	const sess = c.v.sess!;
	let clock = t - int(r, 30, 200) * 1000;
	let id = c.idBase + int(r, 100, 900);
	const next = () => {
		clock += int(r, 30, 4000);
		id += int(r, 1, 30);
		return stamp(clock);
	};
	if (kind === 'session') {
		for (let i = 0; i < int(r, 3, 5); i++) lines.push(`${next()} ${sess} -> new id=${id} ${pick(r, c.universe)[0]} ${side(r)} ${lot(r)}`, `${stamp(clock + int(r, 1, 3))} ${sess} <- ack id=${id}`);
		const silent = clock + int(r, 2000, 3000);
		lines.push(`${stamp(silent)} ${sess} heartbeat late (1/3)`, `${stamp(silent + 1000)} ${sess} heartbeat late (2/3)`, `${stamp(silent + 2000)} ${sess} heartbeat late (3/3)`);
		lines.push(`${stamp(silent + 2004)} ${sess} logout: no heartbeat from counterparty`, `${stamp(silent + 2011)} ${sess} holding ${int(r, 2, 6)} orders for resend`);
		clock = silent + int(r, 4000, 30000);
		lines.push(`${stamp(clock)} ${sess} connect ${c.v.gw} ok`, `${stamp(clock + 40)} ${sess} logon accepted, seq ${int(r, 40000, 90000)}`, `${stamp(clock + 52)} ${sess} resending held orders`);
		for (let i = 0; i < int(r, 2, 4); i++) lines.push(`${next()} ${sess} <- ack id=${id}`);
	} else if (kind === 'cancel') {
		for (let i = 0; i < int(r, 3, 6); i++) lines.push(`${next()} ${sess} -> new id=${id} ${pick(r, c.universe)[0]} ${side(r)} ${lot(r)}`, `${stamp(clock + int(r, 1, 3))} ${sess} <- ack id=${id}`);
		lines.push(`${next()} ${sess} -> cancel id=${c.x.cancelId}`);
		c.x.cancelAt = clock;
		if (c.x.cancelAnswered) lines.push(`${stamp(clock + 2)} ${sess} <- reject cancel id=${c.x.cancelId} "unknown order id"`);
		else for (const wait of [10, 30, 60]) lines.push(`${stamp(clock + wait * 1000)} ${sess} cancel id=${c.x.cancelId} pending ${wait} s`);
		for (let i = 0; i < int(r, 2, 4); i++) lines.push(`${next()} ${sess} -> new id=${id} ${pick(r, c.universe)[0]} ${side(r)} ${lot(r)}`, `${stamp(clock + int(r, 1, 3))} ${sess} <- ack id=${id}`);
	} else if (kind === 'tls' || kind === 'logon') {
		for (let i = 0; i < int(r, 3, 5); i++) {
			lines.push(`${next()} ${sess} connect ${c.v.gw} ok`);
			if (kind === 'tls') lines.push(`${stamp(clock + 18)} ${sess} TLS handshake failed: ${c.x.tlsError}`, `${stamp(clock + 19)} ${sess} retry in 30 s`);
			else lines.push(`${stamp(clock + 31)} ${sess} logon rejected: invalid credentials (user LRKUAT01)`, `${stamp(clock + 33)} ${sess} retry in 60 s`);
			clock += kind === 'tls' ? 30000 : 60000;
		}
	} else {
		const why: Record<string, string> = {
			unknown: c.x.venueReject ?? 'unknown symbol',
			halt: 'security halted',
			throttle: 'message rate exceeded',
			dup: 'duplicate order id',
			band: 'price outside band',
			closed: 'market closed',
			selfmatch: 'cancelled: self-match prevented'
		};
		const count = int(r, 10, 18);
		let dupId = c.x.dupBase ?? 0;
		for (let i = 0; i < count; i++) {
			const own = kind === 'unknown' ? c.x.sent : kind === 'halt' || kind === 'band' || kind === 'selfmatch' ? c.sym[0] : pick(r, c.universe)[0];
			const rid = kind === 'dup' ? (dupId += i ? int(r, 1, 3) : 0) : id;
			lines.push(`${next()} ${sess} -> new id=${rid} ${own} ${side(r)} ${lot(r)}`);
			const rejected = kind === 'unknown' || kind === 'halt' || kind === 'band' || kind === 'closed' || r() < (kind === 'throttle' ? 0.45 : kind === 'selfmatch' ? 0.4 : 0.6);
			lines.push(`${stamp(clock + int(r, 1, 4))} ${sess} <- ${rejected ? `reject id=${rid} "${why[kind]}"` : `ack id=${rid}`}`);
		}
	}
	if (kind === 'cancel') return fence(shiftLines(lines, (c.x.t0 % DAY) + int(r, 800, 2500) - c.x.cancelAt));
	return fence(kind === 'tls' || kind === 'logon' ? lines : shiftLines(lines, anchor(c, t) - lastTime(lines)));
};

const latency = (c: Ctx, t: number, kind: string) => {
	const { r } = c;
	const rows = ['| Minute | Orders | p50 (µs) | p99 (µs) | Max (µs) |', '| ------ | ------ | -------- | -------- | -------- |'];
	const rowCount = int(r, 13, 16);
	const start = t - rowCount * MIN;
	const base = kind === 'volume' ? 4 : 1;
	for (let m = 0; m < rowCount; m++) {
		const minute = start + m * MIN;
		const open = minuteOfDay(minute) === 570;
		const spike = (kind === 'disk' && m >= rowCount - 5 && m <= rowCount - 2) || (kind === 'daily' && open);
		const orders = Math.round((minuteOfDay(minute) < 575 && minuteOfDay(minute) >= 570 ? 1400 : 600) * base * (0.7 + r() * 0.6));
		const p50 = spike ? int(r, 700, 2400) : int(r, 31, 48) + (kind === 'volume' ? int(r, 4, 12) : 0);
		const p99 = spike ? int(r, 3800, 9800) : int(r, 120, 260) + (kind === 'volume' ? int(r, 600, 1500) : 0);
		rows.push(`| ${hm(minute)} | ${group(orders)} | ${group(p50)} | ${group(p99)} | ${group(p99 + int(r, 200, spike ? 40000 : 3000))} |`);
	}
	return rows.join('\n');
};

const settingsFile = (c: Ctx) => {
	const s = c.x.settings ?? { venue: c.venue, max_order_qty: c.limit, test_orders_allowed: c.dep === 'uat' };
	const body = Object.entries(s).map(([key, value], i, all) => `  "${key}": ${typeof value === 'string' ? `"${value}"` : value}${i < all.length - 1 ? ',' : ''}`);
	return fence([`$ cat /etc/larkspur-router/${c.dep}.json`, '{', ...body, '}']);
};

const startup = (c: Ctx, t: number) => {
	const { r } = c;
	const day = journal(t);
	const unit = `larkspur-router@${c.dep}.service`;
	const error: Record<string, string> = {
		typo: 'ValueError: unknown settings: max_order_qy',
		extra: 'ValueError: unknown settings: log_level',
		perm: `PermissionError: [Errno 13] Permission denied: '/etc/larkspur-router/${c.dep}.json'`
	};
	const lines: string[] = [];
	let clock = t - int(r, 3, 8) * MIN;
	let pid = int(r, 20000, 60000);
	for (let attempt = 1; attempt <= int(r, 2, 4); attempt++) {
		lines.push(`${day} ${hms(clock)} ${c.host} systemd[1]: Starting ${unit} - Larkspur order router (${c.dep})...`);
		lines.push(`${day} ${hms(clock + 900)} ${c.host} larkspur-router[${pid}]: loading settings from /etc/larkspur-router/${c.dep}.json`);
		lines.push(`${day} ${hms(clock + 950)} ${c.host} larkspur-router[${pid}]: ${error[c.x.startup]}`);
		lines.push(`${day} ${hms(clock + 990)} ${c.host} systemd[1]: ${unit}: Main process exited, code=exited, status=1/FAILURE`);
		clock += 10000;
		lines.push(`${day} ${hms(clock)} ${c.host} systemd[1]: ${unit}: Scheduled restart job, restart counter is at ${attempt}.`);
		pid += int(r, 3, 40);
	}
	return fence([`$ journalctl -u ${unit} --since "${hm(t - 9 * MIN)}"`, ...lines]);
};

const decodeErrors = (c: Ctx, t: number) => {
	const { r } = c;
	const lines: string[] = [];
	let clock = t - int(r, 40, 90) * 1000;
	let id = c.idBase;
	for (let i = 0; i < int(r, 12, 19); i++) {
		clock += int(r, 300, 6000);
		if (r() < 0.45) {
			lines.push(`${stamp(clock)} ${c.host} ${c.dep.padEnd(8)} ERROR decode failed for message from ${c.v.ip}:${int(r, 40000, 60000)}: struct.error: unpack requires a buffer of 27 bytes`);
			lines.push(`${stamp(clock + 1)} ${c.host} ${c.dep.padEnd(8)} INFO  closed connection from ${c.v.ip}`);
		} else {
			id += int(r, 1, 30);
			const [sym, price] = pick(r, c.universe);
			lines.push(`${stamp(clock)} ${c.host} ${c.dep.padEnd(8)} INFO  routed id=${id} ${sym} ${side(r)} ${lot(r)} @${drift(r, price)} -> ${c.venue}`);
		}
	}
	return fence(lines);
};

const hostCheck = (c: Ctx, t: number, kind: string) => {
	const { r } = c;
	if (kind === 'boot') {
		const tz = t >= Date.UTC(2026, 10, 1, 2) ? 'EST' : 'EDT';
		const isoDay = (when: number) => `2026-${pad(at(when).getUTCMonth() + 1)}-${pad(at(when).getUTCDate())}`;
		const booted = c.x.rebooted ? t - int(r, 9, 25) * MIN - int(r, 0, 59) * 1000 : t - 12 * DAY - int(r, 60, 600) * MIN;
		const before = booted - int(r, 15, 40) * DAY;
		const ago = c.x.rebooted ? `${Math.round((t - booted - 40000) / MIN)}min ago` : '1 week 5 days ago';
		return fence([
			'$ last -x reboot | head -3',
			`reboot   system boot  5.14.0-427.${c.x.rebooted ? 42 : 37}.1.el9_4 ${dayNames[at(booted).getUTCDay()]!.slice(0, 3)} ${journal(booted)} ${hm(booted)}   still running`,
			`reboot   system boot  5.14.0-427.${c.x.rebooted ? 37 : 31}.1.el9_4 ${dayNames[at(before).getUTCDay()]!.slice(0, 3)} ${journal(before)} ${hm(before)} - ${hm(booted)}`,
			`$ systemctl status larkspur-router@${c.dep} --no-pager | head -3`,
			`● larkspur-router@${c.dep}.service - Larkspur order router (${c.dep})`,
			'     Loaded: loaded (/etc/systemd/system/larkspur-router@.service; enabled; preset: disabled)',
			`     Active: active (running) since ${dayNames[at(booted).getUTCDay()]!.slice(0, 3)} ${isoDay(booted)} ${hms(booted + 40000)} ${tz}; ${ago}`
		]);
	}
	if (kind === 'disk')
		return fence([
			`$ df -h /var/log /opt /`,
			'Filesystem                 Size  Used Avail Use% Mounted on',
			`/dev/mapper/vg0-varlog      ${int(r, 40, 80)}G   ${int(r, 40, 80)}G     0 100% /var/log`,
			`/dev/mapper/vg0-opt         ${int(r, 20, 40)}G  ${int(r, 4, 9)}.${int(r, 1, 9)}G   ${int(r, 10, 30)}G  ${int(r, 18, 35)}% /opt`,
			`/dev/mapper/vg0-root        ${int(r, 30, 50)}G  ${int(r, 8, 14)}G   ${int(r, 15, 30)}G  ${int(r, 30, 45)}% /`,
			'$ ls -lhS /var/log/larkspur-router | head -4',
			`-rw-r----- 1 router router ${int(r, 9, 30)}G ${journal(t)} ${hm(t)} ${c.dep}.log`,
			`-rw-r----- 1 router router ${int(r, 3, 8)}.${int(r, 1, 9)}G ${journal(t - 3 * DAY)} 23:59 ${c.dep}.log.1`,
			`-rw-r----- 1 router router ${int(r, 3, 8)}.${int(r, 1, 9)}G ${journal(t - 4 * DAY)} 23:59 ${c.dep}.log.2`
		]);
	if (kind === 'mem') {
		const rows = ['| Time | RSS (MB) | Orders since start |', '| ---- | -------- | ------------------ |'];
		let rss = int(r, 180, 240);
		let orders = 0;
		for (let clock = midnight(t) + 6 * 60 * MIN; clock <= t; clock += 60 * MIN) {
			rows.push(`| ${hm(clock)} | ${group(rss)} | ${group(orders)} |`);
			rss += c.x.mbPerHalfHour * 2 + int(r, -8, 12);
			orders += int(r, 3000, 18000);
		}
		return rows.join('\n');
	}
	if (kind === 'ntp') {
		const bad = c.x.ntpBad;
		return fence([
			'$ chronyc tracking',
			`Reference ID    : ${bad ? '00000000 ()' : `0A2A0${int(r, 1, 4)}0${int(r, 1, 9)} (ntp${int(r, 1, 2)}.ny4.larkspur.internal)`}`,
			`Stratum         : ${bad ? 0 : 3}`,
			`System time     : 0.0${bad ? `${int(r, 38, 95)}${int(r, 100000, 999999)}` : `000${int(r, 10, 90)}${int(r, 100, 999)}`} seconds ${r() < 0.5 ? 'fast' : 'slow'} of NTP time`,
			`Last offset     : ${bad ? '+0.000000000' : `+0.0000${int(r, 10, 99)}${int(r, 100, 999)}`} seconds`,
			`Frequency       : ${int(r, 2, 19)}.${int(r, 100, 999)} ppm ${r() < 0.5 ? 'fast' : 'slow'}`,
			`Leap status     : ${bad ? 'Not synchronised' : 'Normal'}`,
			'$ chronyc sources',
			'MS Name/IP address         Stratum Poll Reach LastRx Last sample',
			bad ? `^? ntp-old.dc2.larkspur.internal 0   10     0     -     +0ns[   +0ns] +/-    0ns` : `^* ntp1.ny4.larkspur.internal     2   6   377    ${int(r, 10, 60)}   +${int(r, 2, 40)}us[ +${int(r, 2, 40)}us] +/-  ${int(r, 100, 900)}us`
		]);
	}
	return fence([
		`$ openssl x509 -in /etc/larkspur-router/tls/${c.host}-client.pem -noout -subject -issuer -enddate`,
		`subject=CN = ${c.host}.ny4.larkspur.internal, O = Larkspur Securities LLC`,
		'issuer=CN = Larkspur Internal Issuing CA 2, O = Larkspur Securities LLC',
		`notAfter=${journal(t)} 04:00:00 2026 GMT`,
		`$ date -u`,
		`${dayNames[at(t).getUTCDay()]!.slice(0, 3)} ${journal(t)} ${hms(t + 4 * 3600000)} UTC 2026`
	]);
};

const recon = (c: Ctx) => {
	const { r } = c;
	const rows = ['| Deployment | Router count | Drop copy | Difference |', '| ---------- | ------------ | --------- | ---------- |'];
	for (const key of liveDesks) {
		const drop = int(r, 9000, 60000);
		const diff = key === c.dep ? c.x.diff : 0;
		rows.push(`| ${key} | ${group(drop + diff)} | ${group(drop)} | ${diff} |`);
	}
	return rows.join('\n');
};

/** Orders a disruption touched, by deployment, for market operations' daily report. */
const impact = (c: Ctx) => {
	const { r } = c;
	const rows = ['| Deployment | Orders in the window | Held or refused | Resent by the desk |', '| ---------- | -------------------- | --------------- | ------------------ |'];
	const others = shuffle(r, liveDesks.filter((key) => key !== c.dep)).slice(0, int(r, 1, 3));
	for (const key of [c.dep, ...others]) {
		const hit = key === c.dep ? int(r, 3, 40) : c.x.wide ? int(r, 0, 12) : 0;
		rows.push(`| ${key} | ${group(int(r, 30, 900))} | ${hit} | ${Math.max(0, hit - int(r, 0, 3))} |`);
	}
	return rows.join('\n');
};

/** Yesterday's rejects by reason, for a question from risk or compliance. */
const reasons = (c: Ctx) => {
	const { r } = c;
	const rows = ['| Reason | Where | Orders |', '| ------ | ----- | ------ |'];
	const all: [string, string, number][] = [
		['quantity outside the limit', 'router', int(r, 0, 9)],
		['TEST orders are not allowed here', 'router', int(r, 0, 3)],
		['price outside band', 'venue', int(r, 2, 60)],
		['security halted', 'venue', int(r, 0, 40)],
		['message rate exceeded', 'venue', int(r, 0, 12)],
		['unknown symbol', 'venue', int(r, 0, 5)],
		['duplicate order id', 'venue', int(r, 0, 2)]
	];
	for (const [reason, where, n] of all) if (n > 0) rows.push(`| ${reason} | ${where} | ${n} |`);
	return rows.join('\n');
};

/** The trader's own screen of recent orders; rows for the order in question carry the topic's status. */
const blotter = (c: Ctx, t: number) => {
	const { r } = c;
	const rows = ['| Time | Symbol | Side | Qty | Limit | Filled | Status |', '| ---- | ------ | ---- | --- | ----- | ------ | ------ |'];
	const count = int(r, 6, 10);
	const own = new Set<number>();
	if (c.x.blotterStatus) for (let k = c.x.blotterStatus === 'Rejected' ? int(r, 1, 3) : 1; k > 0; k--) own.add(count - k);
	const times: number[] = [];
	for (let back = t - int(r, 20, 90) * 1000; times.length < count; back -= int(r, 1, 4) * MIN + int(r, 0, 59) * 1000) times.unshift(back);
	for (let i = 0; i < count; i++) {
		const clock = times[i]!;
		const mine = c.x.blotterAfter !== undefined ? minuteOfDay(clock) >= c.x.blotterAfter : own.has(i);
		const [sym, price] = mine ? c.sym : pick(r, c.universe);
		const qty = mine ? Number(c.v.qty!.replace(/,/g, '')) : lot(r) * pick(r, [1, 1, 2, 5]);
		const status = mine ? c.x.blotterStatus : pick(r, ['Filled', 'Filled', 'Filled', 'Working', 'Part filled', 'Cancelled']);
		const filled = status === 'Filled' ? qty : status === 'Part filled' ? Math.floor(qty / 200) * 100 : 0;
		rows.push(`| ${hms(clock)} | ${sym} | ${side(r) === 'B' ? 'Buy' : 'Sell'} | ${group(qty)} | ${drift(r, price)} | ${group(filled)} | ${status} |`);
	}
	return rows.join('\n');
};

const alertBlock = (c: Ctx, t: number) => {
	const [name, value] = c.x.alert as [string, string];
	return fence([
		`FIRING   ${name}`,
		`host     ${c.host}.ny4`,
		`service  larkspur-router@${c.dep}`,
		`value    ${value}`,
		`since    ${hms(t - int(c.r, 60, 200) * 1000)} ET`,
		`runbook  wiki/router/alerts#${name}`
	]);
};

const ciLog = (c: Ctx, kind: string) => {
	const { r } = c;
	const job = int(r, 18000, 24000);
	if (kind === 'missing')
		return fence([
			`Running job ${job} (test) on runner ci-linux-${int(r, 1, 9)}, image python-ci:latest`,
			'$ python3 -m pip install --no-index --find-links /cache/wheels -e .',
			'Successfully installed larkspur-router-1.8.0',
			'$ python3 -m pytest',
			'/usr/local/bin/python3: No module named pytest',
			'ERROR: Job failed: exit code 1'
		]);
	return fence([
		`Running job ${job} (test) on runner ci-linux-${int(r, 1, 9)}, branch ${c.x.branch}`,
		'$ python3 -m pytest',
		'============================= test session starts ==============================',
		'platform linux -- Python 3.12.6, pytest-8.3.3, pluggy-1.5.0',
		'rootdir: /builds/larkspur-router',
		'configfile: pyproject.toml',
		'collected 0 items / 1 error',
		'==================================== ERRORS ====================================',
		`_________________ ERROR collecting tests/${c.x.badFile} _________________`,
		`E   ModuleNotFoundError: No module named '${c.x.badModule}'`,
		'!!!!!!!!!!!!!!!!!!!! Interrupted: 1 error during collection !!!!!!!!!!!!!!!!!!!!!',
		'ERROR: Job failed: exit code 2'
	]);
};

const pastes: Record<string, (c: Ctx, t: number) => string> = {
	'route:limit': (c, t) => routeLog(c, t, 'limit'),
	'route:test': (c, t) => routeLog(c, t, c.dep === 'uat' ? 'testuat' : 'test'),
	'route:zero': (c, t) => routeLog(c, t, 'zero'),
	'route:symbol': (c, t) => routeLog(c, t, 'symbol'),
	'route:uat': (c, t) => routeLog(c, t, 'uat'),
	'route:one': (c, t) => routeLog(c, t, 'one'),
	'route:gap': (c, t) => routeLog(c, t, 'gap'),
	'route:plain': (c, t) => routeLog(c, t, 'plain'),
	'history': (c, t) => historyLog(c, t),
	'venue:unknown': (c, t) => venueLog(c, t, 'unknown'),
	'venue:halt': (c, t) => venueLog(c, t, 'halt'),
	'venue:throttle': (c, t) => venueLog(c, t, 'throttle'),
	'venue:dup': (c, t) => venueLog(c, t, 'dup'),
	'venue:band': (c, t) => venueLog(c, t, 'band'),
	'venue:closed': (c, t) => venueLog(c, t, 'closed'),
	'venue:cancel': (c, t) => venueLog(c, t, 'cancel'),
	'venue:selfmatch': (c, t) => venueLog(c, t, 'selfmatch'),
	'route:twice': (c, t) => routeTwice(c, t),
	'venue:session': (c, t) => venueLog(c, t, 'session'),
	'venue:tls': (c, t) => venueLog(c, t, 'tls'),
	'venue:logon': (c, t) => venueLog(c, t, 'logon'),
	'latency': (c, t) => latency(c, t, c.x.latency ?? 'flat'),
	'settings': (c) => settingsFile(c),
	'startup': (c, t) => startup(c, t),
	'decode': (c, t) => decodeErrors(c, t),
	'host:disk': (c, t) => hostCheck(c, t, 'disk'),
	'host:mem': (c, t) => hostCheck(c, t, 'mem'),
	'host:ntp': (c, t) => hostCheck(c, t, 'ntp'),
	'host:cert': (c, t) => hostCheck(c, t, 'cert'),
	'host:boot': (c, t) => hostCheck(c, t, 'boot'),
	'recon': (c) => recon(c),
	'impact': (c) => impact(c),
	'reasons': (c) => reasons(c),
	'blotter': (c, t) => blotter(c, t),
	'ci': (c) => ciLog(c, c.x.ci)
};

// Topics. An escalation follows one path of one topic. The title names the first symptom; what caused it and how it
// ended are only in the messages, mostly the later ones.
type Who = 'r' | 'q' | 'o' | 'L' | 't' | 'p' | 'n' | 'm' | 'c' | 'k' | 'd' | 'w' | 'x' | 'b' | '~';
type Msg = [Who, string | string[], string?];
interface Path {
	desk?: string[];
	uat?: boolean;
	/** Overrides the topic's `impact`. */
	impact?: boolean;
	turn: Msg[];
	ends: Msg[][];
}
interface Topic {
	titles: string[];
	opener: 'desk' | 'pager' | 'tools' | 'ops' | 'compliance' | 'platform' | 'self';
	desks?: string[];
	uat?: boolean;
	/** Minutes after midnight between which the escalation opens. */
	when: [number, number];
	saturday?: boolean;
	/** Other desks may have been touched too. */
	wide?: boolean;
	/** Orders were held or refused, so market operations may ask how many. */
	impact?: boolean;
	/** Nobody from another desk would ask whether they are touched. */
	quiet?: boolean;
	/** The trader may paste their screen; rows for the order in question show this status (empty for none). */
	blotter?: string;
	open: string[];
	ack: string[];
	look: Msg[][];
	paths: Path[];
	prep?: (c: Ctx, path: number) => void;
}

const topics: Topic[] = [
	{
		titles: ['Order rejected at the size limit', '{sym} order refused by the router', 'Rejects on a full-size {sym} order', 'Router throwing back a {sym} clip'],
		opener: 'desk',
		desks: ['program', 'cash', 'indexarb', 'etf'],
		when: [585, 930],
		open: [
			'We just had an order for {sym}, {qty} shares, refused by the router: the reason says the quantity is outside the limit. The desk sheet says we can send up to {limit} in one go and we size our clips to it, so I don’t understand what it’s complaining about. Can someone look before we try again?',
			'Router rejected {sym} twice in the last ten minutes, {qty} shares each time, “outside the limit”. We have another {n1} of these to work this afternoon and I need to know whether to cut them down or whether something is broken.',
			'Quick one, hopefully. {tool} sent {qty} {sym} and the router threw it back with a limit reject. Every smaller order today went through fine. Is our limit lower than we were told? The sheet says {limit}.'
		],
		ack: ['Looking. Can you give me the order id, or the time it went out, so I can find it in the {dep} log?', 'On it. Roughly when did the first one go, and was it from {tool}?'],
		look: [
			[['r', ['First one was about {time0}, second a few minutes later. Same size both times as far as I can see.', 'Ids should be in the log under {dep}; it was just before {time0}.']], ['o', ['Found them. Here is the {dep} log around that time:', 'Here is what the router saw:'], 'route:limit']],
			[['r', 'It was {tool}, about {time0}. The reject screen only shows the text, not an id.'], ['o', 'No need, I have them. The {dep} log:', 'route:limit'], ['r', 'So it really was the router and not the venue?'], ['o', ['Yes, these never left the building. The question is why the router thinks they’re too big.', 'Yes, the router refused them before they went anywhere. Working out why.']]]
		],
		paths: [
			{
				turn: [
					['o', ['So the rejects are real, and they come from the router, not from {tool}. route() only lets an order through when its quantity is below the limit, so an order for exactly {limit} fails. The README describes the setting as the largest order the router accepts, and every desk reads it that way.', 'I’ve read the check in route(). It treats the limit as a ceiling the order has to stay under, so {limit} on the nose is refused and one share less goes through. That is the router getting it wrong: the setting is documented as the largest order we accept.']],
					['r', ['That can’t have been like this for long, surely. We’ve sent big clips all year.', 'How has nobody hit this before?']],
					['o', ['It has been like this since the limit was added. Most clips are well under it; your desk only started sizing exactly at the limit this month.', 'Most orders are nowhere near the limit, so nobody noticed. The only orders it catches are ones sized exactly at the limit, and those started when the desk began cutting at the maximum.']],
					['r', ['So what do we do this afternoon? I still have orders to work.', 'Fine, but the client wants the rest done today. Options?']],
					['o', ['For today, send {limitMinus} and put the last share on the next clip, or size every clip at {limitMinus}. Both go through. I don’t want to raise the limit in the settings file, because that would let {limitPlus} through too, and risk would not thank me.', 'Cheapest is to size the clips one share under, at {limitMinus}. Raising the setting would let bigger orders through as well, which isn’t mine to decide.']]
				],
				ends: [
					[['r', 'Okay, we’ll size at {limitMinus} until you tell us otherwise.'], ['L', ['I’ve put the off-by-one on the router list for the next release, with a test for both sizes. Until it ships the desks keep the workaround; {o}, please post it in router-announce so the other desks know.', 'Agreed it is ours. The fix is small, but it goes in the next release rather than as a hotfix: nobody is stuck while they size one share under. Leaving this open until then.']], ['o', 'Posted the workaround in router-announce.']],
					[['r', 'That works. Can you tell the program desk too? They size the same way.'], ['o', 'Done. I’ve also written it up for {L} so it gets fixed in the router rather than living on as a workaround.'], ['~', '1'], ['L', 'Read it. The fix and its tests go in with the next router release; the workaround stays until then.']],
					[['r', 'Clipping at {limitMinus}.'], ['~', '1'], ['o', 'The desk has sized at {limitMinus} all morning without a reject. The check itself still needs fixing; it’s with {L} for the next release.']]
				]
			},
			{
				desk: ['program', 'indexarb', 'cash'],
				turn: [
					['o', ['Look at the quantity in the log, though: the rejected order went out as {logQty} shares, not {limit}. The router is right to refuse that.', 'The log doesn’t agree with your screen. The order that was refused carried {logQty} shares, which is over the limit.']],
					['r', ['That’s not what my screen says. {tool} shows {limitK} on the ticket.', 'Strange. The ticket in {tool} says {limitK}, and that is what I typed.']],
					['t', ['That’ll be the display. The order ticket rounds the size to the nearest thousand when it shows it, but sends what the basket computed, and the basket adds the odd shares left over from the morning’s partial fills. We should never have rounded on that screen.', '{tool} shows sizes in thousands on the ticket, rounded. The real quantity was {logQty} because the residual from an earlier partial fill was added in. I’ll make the ticket show the exact number.']],
					['r', 'So {tool} has been showing me the wrong size all day?'],
					['t', 'Only when there was a residual to add. Most orders have none, which is why it looked right until you sized at the limit.']
				],
				ends: [
					[['o', 'So nothing to change on the router: it did what its settings say. Handing this to desk tools for the ticket display.'], ['t', 'Taken. It’s {tix} on our board and goes out with Friday’s {tool} release.']],
					[['r', 'Good to know. I’ll check the exact size in the order details until that’s fixed.'], ['t', 'Fix is in {tool} from {tomorrow} morning: the ticket shows the exact quantity and warns above the router limit.'], ['o', 'Thanks both. Nothing for the router here.']]
				]
			},
			{
				desk: ['etf'],
				turn: [
					['o', ['That is odd. {dep} should take orders up to 250,000 shares; the log says 25000. Let me look at the settings file on the host.', 'The ETF deployment is meant to take creations up to 250,000 shares, and the reject says 25000. Checking the file.'], 'settings'],
					['o', ['There it is: max_order_qty is 25000, a zero short. The file was rewritten when {hostShort} was rebuilt on {lastWeekday}, and whoever typed it back in dropped a digit.', 'Found it. The file says 25000, not 250000. It came back from a template after the host rebuild on {lastWeekday} and somebody retyped the number.']],
					['r', ['That explains why only the big ones failed. Can you fix it now?', 'So everything over 25,000 has been bouncing since then? That’s most of our creation orders.']],
					['L', 'How did that get past the checks after the rebuild?'],
					['o', 'There weren’t any. The rebuild notes say to restore the files, not to compare them with anything.']
				],
				ends: [
					[['o', 'Corrected to 250000 and restarted {dep} at {time}, between your orders. Please try again.'], ['r', 'Gone through. Thanks.'], ['L', 'Thanks {o}. The rebuild checklist now says to compare each settings file with the copy on the ops share before the router starts.']],
					[['o', 'Fixed: 250000 again, and the deployment restarted at {time}. I checked the other file on the host while I was there; it matches what we had before the rebuild.'], ['r', 'Resent, filled. Cheers.']]
				]
			}
		],
		prep: (c, path) => {
			c.x.logLimit = c.limit;
			c.x.logQty = c.limit;
			c.v.qty = group(c.limit);
			if (path === 1) c.x.logQty = c.limit + int(c.r, 12, 480);
			if (path === 2) {
				const qty = int(c.r, 6, 20) * 10000;
				c.x.logQty = qty;
				c.x.logLimit = 25000;
				c.v.qty = group(qty);
				c.x.settings = { venue: 'XNYS', max_order_qty: 25000, test_orders_allowed: false };
			}
			c.v.logQty = group(c.x.logQty);
		}
	},
	{
		titles: ['Orders timing out to {venue}', 'Session {sess} dropping', 'Nothing acknowledged by {venue} for a minute', 'Venue session alert on {hostShort}'],
		opener: 'pager',
		wide: true,
		impact: true,
		when: [575, 900],
		open: ['Session {sess} to {venue} reported down on {hostShort}.'],
		ack: ['Acked. The session is reconnecting by itself; checking whether any orders are stuck.', 'Mine. Looking at the gateway log now.'],
		look: [
			[['q', ['Is something wrong with {venue}? Three of our orders sat unacknowledged for most of a minute and {tool} timed them out.', 'We’re getting timeouts on {venue} from {tool}. Anything known?']], ['o', ['The session dropped and came back on its own; the orders were held, not lost. Gateway side:', 'Session {sess} dropped and reconnected. Here is the gateway log; nothing was sent twice.'], 'venue:session']],
			[['o', ['Gateway log for the last few minutes. The session missed three heartbeats, logged out and logged back on.', 'Here is what the gateway saw: heartbeats stop, then a logout, then a clean logon and a resend.'], 'venue:session'], ['q', ['Is that why {tool} showed three orders hanging?', 'That lines up with our orders hanging. Are they safe?']], ['o', 'They went out on the resend and were acknowledged. Nothing was lost.']]
		],
		paths: [
			{
				turn: [
					['o', 'Nothing changed on our side this morning, and the other session from {otherHost} to the same gateway stayed up, so I’ve asked the exchange’s connectivity desk whether they saw anything.'],
					['x', ['At {time0} our gateway {gw} failed over to its standby after a hardware fault. Sessions connected to it were logged out and could reconnect immediately. No orders were lost. We apologise for the disruption.', 'We can confirm a failover of gateway {gw} at {time0} following a fault on the primary unit. Connected sessions were disconnected for under a minute. Order state was preserved.']],
					['o', 'So it was the exchange’s own gateway, not us and not the line.'],
					['q', 'Do we need to do anything about the orders that hung?'],
					['o', 'No. They went out on the resend and were acknowledged; {tool} timed them out on screen only, so refresh the blotter and they show as working.']
				],
				ends: [
					[['q', 'Fine by me as long as nothing was lost.'], ['o', 'Nothing was: I matched every order from the window against the drop copy. Closing this; there is nothing for us to do.']],
					[['L', 'Thanks. Worth asking the exchange to tell us when this happens rather than waiting for us to ask.'], ['o', 'Asked. They say failovers go out in the next morning’s operations notice, and I’ve added router-oncall to that list.']]
				]
			},
			{
				turn: [
					['o', 'This is the {n1}th drop on {sess} this week, always this session, and the exchange sees nothing at their end. Bringing in network.'],
					['n', 'The cross-connect for {sess} shows CRC errors on our switch port, a steady trickle since Monday and a burst at {time0}. Looks like the optic or the patch lead. I can swap the optic in the next quiet window.'],
					['L', 'Can we keep the flow off that line until then?'],
					['n', 'I can move it onto the other cross-connect at the switch. It’s a little longer, but it’s clean.'],
					['o', 'Do that. The router doesn’t care which line the session uses, and nothing needs restarting on our side.']
				],
				ends: [
					[['~', '1'], ['n', 'Optic swapped at 16:40, after the close, and the session moved back. Zero errors on the port since.'], ['o', 'No drops today either. I’ll leave the alert as it is and close this.']],
					[['~', '1'], ['n', 'Swapped the optic after the close, but I still see a few errors this morning. The patch lead goes next; the data centre has a ticket for it.'], ['~', '2'], ['o', 'Dropped again at {time}, on the spare line this time, so maybe not the lead after all. Network are still waiting for the data centre.'], ['n', 'The data centre say Thursday night for the lead. I’ll look at the spare line meanwhile.']]
				]
			},
			{
				turn: [
					['o', 'Third time this month, at about the same time of day. The exchange sees nothing, and I can’t find anything in our logs before the heartbeats stop.'],
					['n', 'Clean on my side: no errors, no flaps, nothing in the switch logs at that time.'],
					['q', 'Is it worth us moving to another session around that time?'],
					['o', 'It wouldn’t help: the other session to that gateway goes quiet at the same moment.'],
					['L', 'Then we need a packet capture. Can we leave one running on the session interface for an hour around that time, every day for a week?']
				],
				ends: [
					[['o', 'Capture set up on {hostShort} from tomorrow.'], ['~', '3'], ['o', 'Dropped again at {time}, and the capture has it. Nothing obvious: the exchange simply stops sending heartbeats. I’ve sent them the file.'], ['~', '1'], ['o', 'The exchange is still looking. Another drop this morning.']],
					[['o', 'Capture running.'], ['~', '4'], ['o', 'Two more drops this week, both while the capture was running, and both start with the exchange going quiet. Their connectivity desk has the files and hasn’t found anything yet.']]
				]
			}
		],
		prep: (c) => {
			c.x.alert = ['venue_session_down', `session ${c.v.sess} state=DISCONNECTED (was LOGGED_ON)`];
		}
	},
	{
		titles: ['Test orders rejected', 'Router says test orders are not allowed', 'Integration run failing on rejects', '{tool} checks getting rejects'],
		opener: 'tools',
		when: [600, 1020],
		open: [
			'Our integration run for {tool} failed: every test order came back rejected with “TEST orders are not allowed here”. It passed on {lastWeekday}. Did something change on the UAT router?',
			'Afternoon. I’m running {tool}’s checks before Friday’s release and the router refuses every one of my test orders, same message each time: “TEST orders are not allowed here”. Is UAT broken?'
		],
		ack: ['Which host are you pointed at? UAT takes test orders; production never does.', 'Can you give me the host {tool} connects to, and an order id?'],
		look: [
			[['t', ['It should be UAT. Order ids around {id}.', 'The config says the UAT router. One of the ids is {id}.']], ['o', ['Here are those ids in the logs:', 'Found them:'], 'route:test']],
			[['t', 'The run log only says UAT. Ids around {id}, sent a few minutes ago.'], ['o', 'This is what came in with those ids:', 'route:test'], ['t', 'Every single one refused. That has never happened before.']]
		],
		paths: [
			{
				turn: [
					['o', 'Look at the host: those rejects are on {hostShort}, the production {dep} deployment, not UAT. {tool} was talking to production. Nothing went anywhere, because the router refuses test orders there, which is what the setting is for.'],
					['t', ['Ugh. The release branch picked up the production profile from the desk’s copy of the config. My mistake.', 'You’re right: the router host was set in the shell I started the run from. That one is on me.']],
					['o', 'Your run sent {n2} test orders to production in a couple of minutes, and all of them were refused. They will show in the desk’s reject report tomorrow, so warn them before they ask.'],
					['t', 'I’ll tell {r} now.']
				],
				ends: [
					[['t', 'Pointed back at UAT and the run is green. I’m adding a check to the run that refuses to start unless the host name has uat in it.'], ['o', 'Good. Nothing for the router.']],
					[['t', 'Fixed the profile; the run passes against UAT.'], ['L', 'Thanks for catching it. Worth a word with the desk: a run of the suite against production only ever gets rejects, but it fills their reject report.']]
				]
			},
			{
				uat: true,
				turn: [
					['o', 'These are on UAT, and UAT refuses them, which it shouldn’t. Checking the settings file.', 'settings'],
					['o', 'test_orders_allowed is missing from the UAT file, so it takes the default, which is false. The host was rebuilt on {lastWeekday} and the file came back from the template, which only has the venue in it.'],
					['t', 'Is anything else in that file missing?'],
					['o', 'The limit takes the default, which is what UAT always had. So it’s only the one key.']
				],
				ends: [
					[['o', 'Put test_orders_allowed back to true and restarted UAT at {time}. Try again?'], ['t', 'Green now, thanks.'], ['L', 'Second time a rebuild has eaten a settings file. I want them kept in the repository and copied out by the deploy, not typed in by hand. That’s a follow-up for us.']],
					[['o', 'Restored and restarted.'], ['t', 'All passing.'], ['o', 'Note for whoever picks this up: the settings files for every deployment should come from one place, because we keep losing them on rebuilds. I’ve raised it on the router backlog.']]
				]
			}
		],
		prep: (c, path) => {
			if (path === 1) c.x.settings = { venue: 'XNYS' };
		}
	},
	{
		titles: ['{dep} deployment not running on {hostShort}', 'Router down before the open', 'router_process_down on {hostShort}', 'No {dep} router this morning'],
		opener: 'pager',
		when: [370, 520],
		open: ['larkspur-router@{dep} is not running on {hostShort}.'],
		ack: ['Acked. It’s in a restart loop; looking at the journal.', 'Mine. systemd keeps restarting it and it keeps exiting.'],
		look: [
			[['o', ['Journal:', 'This is what it says each time it starts:'], 'startup'], ['q', ['Will we have it for the open? {tool} can’t connect.', 'Anything I should tell the desk? {tool} shows the router as down.']], ['o', 'It isn’t crashing in the routing code; it never gets as far as listening. It dies while loading its settings. Should be quick once I know why.']],
			[['q', '{tool} can’t find the router this morning. Is it down?'], ['o', ['Yes, {dep} is in a restart loop. Journal:', 'It is. Each start fails the same way:'], 'startup']]
		],
		paths: [
			{
				turn: [
					['o', 'It refuses the settings file because of a key it doesn’t know: max_order_qy, which is max_order_qty with a letter missing. Since 1.8.0 an unknown key stops the router instead of being ignored, which is why a typo like this used to go unnoticed.'],
					['o', 'Last night’s change window raised the {dep} limit for the rebalance, and the edit was made by hand on the host.'],
					['q', 'Was the higher limit applied, then, or not?'],
					['o', 'Not yet: the router never started with it. It will be once the key is spelled right.']
				],
				ends: [
					[['o', 'Fixed the key; the router was up at {time} and {tool} connected.'], ['q', 'Thanks, we’re fine for the open.'], ['L', 'This is what 1.8.0 was for: a typo stopping the router at six is better than a limit silently not applying all day. Still, I want a check that loads the file before a change window closes. On our list.']],
					[['o', 'Corrected and restarted; {dep} up at {time}.'], ['o', 'Follow-up for us: a dry run that loads every settings file on the host after any change, so the next typo is found in the window and not by the pager.']]
				]
			},
			{
				turn: [
					['o', 'It can’t read its settings file at all: permission denied on /etc/larkspur-router/{dep}.json. Nobody touched the file itself last night, according to the change calendar.'],
					['p', 'That’ll be the hardening run. It reset the permissions on everything under /etc that wasn’t on its list, and the router’s directory wasn’t on the list.'],
					['o', 'Will it have done the same on {otherHost}? Its deployments haven’t restarted since, so they wouldn’t notice until they do.'],
					['p', 'Same run, same list, so yes.']
				],
				ends: [
					[['p', 'Permissions put back on both hosts, and the directory is on the list now.'], ['o', 'Router up at {time}. Leaving the cause with platform; nothing changed in the router.']],
					[['p', 'Fixed on {hostShort}; doing {otherHost} too before anything restarts there.'], ['o', 'Up at {time}.'], ['p', 'The hardening list is updated, so the next run leaves the router alone.']]
				]
			},
			{
				turn: [
					['o', 'The file has a key the router doesn’t know: log_level. Someone added it last night, I assume to get more detail in the logs, but there is no such setting, and the router won’t start with a key it doesn’t know.'],
					['q', ['That was for us, sorry: {t} said it would help with the slow fills investigation.', 'Ah. {t} asked for that so we could see more in the logs.']],
					['t', 'My fault. I assumed the router read its log level from the settings file the way {tool} does.']
				],
				ends: [
					[['o', 'Took the key out; up at {time}. If you want a log level setting, ask for it on the router backlog and we’ll add it properly.'], ['t', 'Will do.'], ['L', 'Added a log level setting to the backlog as a request. Not this quarter.']],
					[['o', 'Removed it and restarted; {dep} is up.'], ['t', 'Raised it as a request instead. Sorry for the early start.']]
				]
			}
		],
		prep: (c, path) => {
			c.x.startup = ['typo', 'perm', 'extra'][path];
			c.x.alert = ['router_process_down', `unit state=activating (auto-restart), restarts=${int(c.r, 3, 9)}`];
		}
	},
	{
		titles: ['Orders in {longSym} bouncing', '{venue} refusing our {longSym} orders', 'Rejects on {longSym} all morning', 'Can’t get {longSym} done'],
		opener: 'desk',
		desks: ['cash', 'program', 'indexarb'],
		when: [580, 840],
		open: [
			'Every order we send in {longSym} comes back rejected by {venue}. Orders in everything else are fine. We have a client order to work in it today, so this is getting urgent.',
			'{venue} keeps rejecting {longSym}. It’s a real stock, it trades every day, and the client wants it done by the close. Is this us or them?'
		],
		ack: ['Looking. Do you have an order id?', 'Give me a couple of minutes with the logs.'],
		look: [
			[['r', 'The last one was a few minutes ago, from {tool}.'], ['o', 'Router side first:', 'route:symbol'], ['o', 'And what the venue said:', 'venue:unknown']],
			[['r', 'No id, but there were {n1} of them since {time0}.'], ['o', 'Here they are going out, and coming back:', 'venue:unknown'], ['r', 'Every one. What is it about this stock?']]
		],
		paths: [
			{
				turn: [
					['o', 'Look at the symbol the venue got: {cut}. {longSym} is {len} characters, and the order message has room for eight, so the end is cut off before it leaves, without any error. The venue has never heard of {cut}.'],
					['r', 'So it’s our symbol that’s wrong?'],
					['o', 'The venue knows it as {venueSym}. {tool} takes the long name from the security master, and nothing between {tool} and the venue stops a name that won’t fit.'],
					['r', 'How long has this been happening?'],
					['o', 'Whenever someone trades a share class with a long name, which isn’t often. I can see two more in the last month, both given up after a couple of tries.']
				],
				ends: [
					[['r', 'We’ll type {venueSym} by hand for now.'], ['o', 'That works; your next one went through. The real fix is for build_order to refuse a symbol longer than eight characters instead of letting it be cut short. I’ve written that up for the router backlog.'], ['L', 'Agreed. On the list for the next release.']],
					[['t', 'I can map share classes to the venue’s symbol in {tool}. Give me a day.'], ['~', '1'], ['t', 'Mapping is live in {tool}.'], ['o', 'Good. The router side still cuts long symbols short without a word, so that check is still owed by us; it’s on the backlog.']]
				]
			},
			{
				turn: [
					['o', 'The symbol arrived with a space on the end: “{sym} ”. {tool} sends whatever is in the box, and the message is padded after that, so the venue sees {sym} followed by a space and doesn’t recognise it.'],
					['r', 'I pasted it from a research note. Is that really all it is?'],
					['o', 'Yes. Every order you typed by hand went through; the pasted ones failed.']
				],
				ends: [
					[['t', '{tool} should trim the box. Taking that.'], ['o', 'Handing it to desk tools.'], ['~', '1'], ['t', '{tool} trims symbols as of this morning.']],
					[['r', 'Retyped it, done.'], ['t', 'I’ll make {tool} strip spaces when it builds the order.'], ['o', 'Nothing for the router here.']]
				]
			},
			{
				turn: [
					['o', 'The router sent {longSym} exactly as you typed it, and it is the right symbol. It only lists today, though, and {venue} doesn’t open it for trading until the IPO auction, which they now expect at {ipoTime}.'],
					['r', 'Nobody told us the auction was late.'],
					['o', 'The exchange’s notice went out at 10:05. Until the auction prints, every order in it is refused.']
				],
				ends: [
					[['r', 'Auction just printed, and the orders are going through.'], ['o', 'Good. Nothing wrong anywhere; closing.']],
					[['r', 'Fair enough. We’ll wait.'], ['o', 'It opened at {ipoTime}, and orders are filling. No change needed.']]
				]
			}
		],
		prep: (c, path) => {
			const [long, short] = pick(c.r, longNames);
			c.v.longSym = path === 0 ? long : path === 1 ? c.sym[0] : pick(c.r, listings);
			c.x.sent = path === 0 ? long.slice(0, 8) : path === 1 ? `"${c.sym[0]} "` : c.v.longSym;
			c.v.cut = long.slice(0, 8);
			c.v.len = String(long.length);
			c.v.venueSym = short;
			c.x.cutPrice = drift(c.r, int(c.r, 40, 400));
			c.x.venueReject = path === 2 ? 'security not open for trading' : 'unknown symbol';
			c.v.ipoTime = `${int(c.r, 12, 14)}:${pad(int(c.r, 0, 5) * 10)}`;
		}
	},
	{
		titles: ['Route latency alert at the open', 'route_latency_p99_high on {hostShort}', 'Slow routing on {dep}', 'Latency page, {dep}'],
		opener: 'pager',
		wide: true,
		when: [571, 578],
		open: ['p99 route latency on {dep} above threshold for two minutes.'],
		ack: ['Acked. Looking at the latency board.', 'Mine. Pulling the numbers.'],
		look: [
			[['o', ['Per-minute numbers from the router’s own timing:', 'Here is the last quarter of an hour, per minute:'], 'latency'], ['q', ['Is this why fills felt slow just now?', 'The desk says fills felt sticky for a couple of minutes. Related?']], ['o', 'Possibly. Give me a few minutes to see where the time goes.']],
			[['q', 'Anything going on? {tool} felt slow at the open.'], ['o', ['The router paged for it too. Per minute:', 'Yes, the router noticed as well:'], 'latency']]
		],
		paths: [
			{
				turn: [
					['o', 'The spike lines up with the log writes, not with order volume. {hostShort}’s log volume is full, and every log line waits on the disk.', 'host:disk'],
					['p', 'Rotation on that volume stopped on {lastWeekday} after a config push. I’ve cleared out the compressed files and fixed the rotation.'],
					['q', 'So was anything lost, or just slow?'],
					['o', 'Just slow. Every order went out; the slowest took about ten milliseconds instead of a fraction of one.']
				],
				ends: [
					[['o', 'Latency back to normal at {time}. Platform own the cause; I’ve asked them for a disk alert at 80 percent so we hear about it before the router does.'], ['p', 'Alert added.']],
					[['p', 'Space freed, and rotation fixed on both hosts.'], ['o', 'Numbers are normal again. Nothing to change in the router itself.']]
				]
			},
			{
				turn: [
					['o', 'Volume is four times a normal open: it’s an index rebalance day. Latency per order is where it always is at this volume; the threshold was set on a quiet week.'],
					['q', 'So the slowness we felt was the market, not you?'],
					['o', 'The router added nothing unusual. At this volume the venue is slower to acknowledge too.'],
					['L', 'Then the alert is wrong, not the router. Can we make it relative to volume?']
				],
				ends: [
					[['o', 'Not today. I’ve written it up for us: a threshold that scales with orders per minute. Until then this alert will fire on every heavy open.'], ['q', 'So nothing was slow on your side?'], ['o', 'Nothing out of the ordinary for the volume.']],
					[['o', 'Agreed. Silenced it for the rest of the open; the change to the alert is on our list.']]
				]
			},
			{
				turn: [
					['o', 'This is the {n1}th day in a row with the same shape: a few seconds of slow orders right at 09:30:00, then normal. Volume isn’t unusual and the host looks healthy.'],
					['q', 'It’s only a few seconds, but they’re the seconds we care about most.'],
					['L', 'Profile it. Can you get py-spy on it tomorrow at the open?']
				],
				ends: [
					[['~', '1'], ['o', 'Profiled this morning. The time goes somewhere between reading the message and logging the route, but the profile is too coarse to say where. Trying again with more samples tomorrow.'], ['~', '1'], ['o', 'Same spike again. Still not found.']],
					[['~', '2'], ['o', 'Two more mornings of profiles. Nothing conclusive, and the spike is still there at every open.']]
				]
			}
		],
		prep: (c, path) => {
			c.x.latency = ['disk', 'volume', 'daily'][path];
			c.x.alert = ['route_latency_p99_high', `p99 ${int(c.r, 31, 98) / 10} ms (threshold 1.5 ms for 2m)`];
		}
	},
	{
		titles: ['{venue} rejecting orders as duplicates', 'Duplicate order rejects', 'Orders bounced as duplicate ids', 'Half of {tool}’s orders refused'],
		opener: 'desk',
		blotter: 'Rejected',
		desks: ['indexarb', 'program', 'hedging'],
		impact: true,
		when: [600, 900],
		open: [
			'Since about {time0}, around half of our orders come back with “duplicate order id”. We haven’t sent anything twice, as far as I know.',
			'Getting duplicate id rejects on brand new orders. Nothing has changed on our side today. Can you see them?'
		],
		ack: ['Looking. Which deployment, {dep}?', 'Checking the venue’s replies now.'],
		look: [[['r', ['Yes, {dep}. Most of the afternoon’s orders.', 'It’s {dep}. Started a while ago.']], ['o', ['The router side looks ordinary: orders in, orders out.', 'From the router’s side they go out as normal:'], 'route:plain'], ['r', 'Then where are the rejects coming from?']]],
		paths: [
			{
				turn: [
					['o', ['The venue’s side:', 'Here is what {venue} sent back:'], 'venue:dup'],
					['o', 'The rejected ids are low numbers, {lowId} and up, and {venue} saw those same ids from you this morning. Did {tool} restart?'],
					['r', 'It crashed at about {time0} and we started it again.'],
					['t', 'Then that’s it: {tool} keeps its order id counter in memory and starts again from 1 after a restart. The router passes the id through untouched, and the venue remembers ids for the whole day.']
				],
				ends: [
					[['t', 'For today I’ve restarted it with an offset of a million, and there are no more duplicates. The proper fix, saving the counter, goes into {tool} next week.'], ['o', 'Handing this to desk tools. Nothing for the router.']],
					[['r', 'So until it’s fixed we mustn’t restart during the day?'], ['t', 'Restart if you must, but call me first and I’ll set the offset. The fix is on our board.'], ['o', 'Leaving this with desk tools.']]
				]
			},
			{
				impact: false,
				turn: [
					['o', 'I don’t see any duplicate rejects from the venue. Every order from {dep} this afternoon was acknowledged once. Where are you seeing them?'],
					['r', 'In the risk screen. It lists them as rejected duplicates.'],
					['m', 'The risk screen reads from the drop copy, and the drop copy feed replayed the morning after reconnecting at {time0}, so every order shows twice there. The orders themselves are fine.'],
					['r', 'So nothing was actually refused?'],
					['o', 'Nothing. The venue has every order once.']
				],
				ends: [
					[['m', 'The drop copy vendor has replayed it with the duplicates removed. I’ve asked them why it replayed at all.'], ['o', 'Nothing for the router; it’s with market operations.']],
					[['m', 'I’ll take it up with the vendor.'], ['~', '1'], ['m', 'The vendor says a failover on their side replayed the feed, and it’s fixed now.']]
				]
			}
		],
		prep: (c) => {
			c.x.dupBase = int(c.r, 1, 40);
			c.v.lowId = String(c.x.dupBase);
		}
	},
	{
		titles: ['Decode errors on {hostShort}', 'decode_errors_high on {dep}', 'Router dropping connections', 'Errors in the {dep} log every few seconds'],
		opener: 'pager',
		when: [560, 960],
		open: ['Decode errors on {dep} above 10 a minute.'],
		ack: ['Acked. The {dep} log is full of the same line.', 'Looking.'],
		look: [
			[['o', ['The log:', 'Every few seconds:'], 'decode'], ['o', ['The router cuts the connection and logs a bare struct.error with no clue what it received. Working out who {ip} is.', 'That error is decode() failing to unpack a message that isn’t 27 bytes long. It doesn’t say what it got, only that it wasn’t right. Finding out who {ip} is.']]],
			[['o', 'Here is the {dep} log. Orders from most clients route normally; one address keeps failing.', 'decode'], ['L', 'Who is {ip}?'], ['o', 'Not in our list of desk machines. Asking around.']]
		],
		paths: [
			{
				turn: [
					['t', '{ip} is the box running the new {tool} build. We rewrote the encoder in Java this sprint, and I bet it gets the symbol padding wrong.'],
					['t', 'Yes: it pads the symbol to seven characters, not eight, so every message is one short. Our tests passed because they only ran against our own decoder.'],
					['r', 'Is that why half my orders never went?'],
					['o', 'Yes. The router dropped the connection each time, and {tool} reconnected and tried the next one.']
				],
				ends: [
					[['t', 'Rolled {tool} back to the old encoder, and the errors stopped at {time}. Fix, and a test against the router’s own decoder, next week.'], ['o', 'Thanks. On our side, decode should say what length it expected and what it got, instead of a bare struct.error. That would have saved us half an hour. Writing it up.'], ['L', 'Yes please. Backlog.']],
					[['t', 'Fixed and redeployed.'], ['o', 'Errors gone. The bare struct.error is still worth fixing in the router so the next one is quicker; it’s on our list.']]
				]
			},
			{
				turn: [
					['p', '{ip} is the new load balancer in front of the router hosts. Its health check opens a connection and sends a short text probe every ten seconds.'],
					['o', 'So the router reads the probe, fails to unpack it and drops the connection. Harmless, but it buries real errors. Can the check just open the connection and close it?'],
					['p', 'It can. I copied the check from the web pool, which is why it talks.']
				],
				ends: [
					[['p', 'Switched the check to a plain TCP connect. Errors stopped at {time}.'], ['o', 'Thanks. Still owed on our side: decode should raise a proper error that gives the expected and actual length, so this kind of noise is obvious at a glance.']],
					[['p', 'Done, plain connect.'], ['o', 'Quiet now. I’ve put a note on the backlog that the router should name the expected and actual length when a message is the wrong size.']]
				]
			}
		],
		prep: (c) => {
			c.x.alert = ['decode_errors_high', `${int(c.r, 11, 40)} decode errors/min (threshold 10)`];
		}
	},
	{
		titles: ['{tool} can’t reach the router', 'Connection refused from {tool}', 'Router unreachable from the desk', 'No connection to {dep}'],
		opener: 'desk',
		when: [400, 900],
		open: [
			'{tool} says it can’t connect to the router: connection refused. It was fine yesterday, and nothing has changed on my machine as far as I know.',
			'Since {time0}, {tool} shows the router as disconnected and won’t reconnect. One or two others on the desk say the same.'
		],
		ack: ['Looking. The {dep} deployment itself is up and taking orders from other people.', 'Checking whether the router sees you at all.'],
		look: [[['o', ['The router is listening and busy with other people’s orders:', '{dep} itself is fine; here are the last few minutes:'], 'route:plain'], ['o', 'But nothing from your machine since {time0}. Can you tell me your machine’s address?'], ['r', 'IT says {ip}.']]],
		paths: [
			{
				turn: [
					['o', 'That address is in the new desk range. The router hosts only accept connections from the old one.'],
					['p', 'The desk moved to the new floor network last night. The firewall rule for the router hosts was on the change list and got missed.'],
					['r', 'Half the desk moved, half didn’t. That explains why it’s only some of us.']
				],
				ends: [
					[['p', 'Rule added for the new range.'], ['r', 'Connected again.'], ['o', 'Platform fixed it. Nothing changed on the router.']],
					[['p', 'Fixed, and I’ve checked the other hosts the desk uses.'], ['o', 'Confirmed with the desk that everyone is connected.']]
				]
			},
			{
				turn: [
					['o', 'That is a VPN address. Are you working from home today?'],
					['r', 'Yes, I’m out until Thursday.'],
					['o', 'The router doesn’t take connections from the VPN range, on purpose. Trading from home goes through the desk’s remote desktop, so the orders come from the office network.'],
					['r', 'Can’t you open it up for a couple of days?'],
					['k', 'No. That stays: no direct connections from home.']
				],
				ends: [
					[['r', 'Okay, I’ll use the remote desktop.'], ['o', 'Closing; no change.']],
					[['r', 'Understood. Could that be on the desk sheet?'], ['o', 'I’ll ask {L} to add it. Nothing to change on the router.']]
				]
			},
			{
				turn: [
					['o', 'Your address is fine, but the router never sees you try. Which {tool} build are you on?'],
					['r', 'The new one, installed this morning.'],
					['t', 'That build has the UAT router as its default. It should only do that for the test profile. Sorry.']
				],
				ends: [
					[['t', 'Pushed a corrected build; restart {tool} and it picks it up.'], ['r', 'Working.'], ['o', 'Handed to desk tools.']],
					[['t', 'Taking it. Workaround: choose the production profile in the settings dialog.'], ['o', 'Nothing for the router.']]
				]
			}
		],
		prep: (c, path) => {
			c.v.ip = path === 1 ? `10.200.${int(c.r, 10, 90)}.${int(c.r, 2, 250)}` : `10.${path === 0 ? 44 : 41}.${int(c.r, 2, 30)}.${int(c.r, 2, 250)}`;
		}
	},
	{
		titles: ['Order vanished from the blotter', 'Lost order in {sym}', 'Where did my {sym} order go?', 'Order missing from {tool}'],
		opener: 'desk',
		blotter: '',
		when: [600, 940],
		open: [
			'I sent {qty} {sym} at about {time0} and it has disappeared from {tool}. No fill, no reject, no cancel, just gone. Can you tell me whether the router ever saw it?',
			'An order of mine is missing. {sym}, buying {qty}, went out from {tool} a few minutes ago and is no longer on my screen.'
		],
		ack: ['Looking for it. Do you have the id?', 'Give me a minute in the log.'],
		look: [[['r', '{tool} doesn’t show it any more, so I have no id. {sym}, {qty} shares, around {time0}.'], ['o', ['Found it:', 'Here it is in the router log:'], 'route:one']]],
		paths: [
			{
				turn: [
					['o', 'The router routed it to {venue} and it filled in three prints within a second. So it did exactly what you asked; your blotter just never heard about the fills.'],
					['r', 'So I’m long {qty} {sym} and didn’t know it.'],
					['t', '{tool}’s fills subscription dropped at {time0} and reconnected without asking for what it missed, and it drops orders it can’t match up. I’ll fix the reconnect.']
				],
				ends: [
					[['t', 'Fixed: on reconnect it now asks for everything since the last message it saw. Rolling out tonight.'], ['r', 'Thanks. I’ve booked the fill by hand.'], ['o', 'Handed to desk tools.']],
					[['r', 'Booked it by hand. Good to know.'], ['t', 'Taken; it’s on our board.']]
				]
			},
			{
				turn: [
					['o', 'It went to {venue} and was cancelled {n1} minutes later, by a cancel from your own login on another screen.'],
					['r', 'Another screen... oh. I had the old ticket open on the second monitor and hit cancel all.']
				],
				ends: [[['r', 'Mystery solved. Sorry for the noise.'], ['o', 'No harm done. Closing.']], [['o', 'Happy to look any time. Nothing wrong here.']]]
			}
		],
		prep: (c) => {
			c.v.qty = group(lot(c.r) * pick(c.r, [1, 2, 4]));
			c.v.qtyRaw = c.v.qty.replace(',', '');
		}
	},
	{
		titles: ['Sessions not logging on before the open', 'venue_session_logon_failed on {hostShort}', 'No {venue} sessions at {time0}', 'Logon failures to {venue}'],
		opener: 'pager',
		wide: true,
		when: [250, 400],
		open: ['Session {sess} logon to {venue} failed on {hostShort}, 3 attempts.'],
		ack: ['Acked. The TLS handshake fails; looking.', 'Mine. The gateway log shows the handshake failing.'],
		look: [[['o', ['Gateway log:', 'Each attempt:'], 'venue:tls'], ['o', 'Every session on the host fails the same way, so it isn’t one gateway. We have until the open, but the desks start pre-market orders at seven.']]],
		paths: [
			{
				turn: [
					['o', 'Our client certificate expired at midnight UTC.', 'host:cert'],
					['p', 'The renewal job has been failing quietly since it moved to the new scheduler. I can issue one by hand now.'],
					['o', 'Please do. Both hosts use the same certificate.']
				],
				ends: [
					[['p', 'New certificate on both hosts at {time}.'], ['o', 'Sessions logged on at {time}, well before the open. Platform are adding an expiry alert at 30 days and fixing the renewal job.']],
					[['p', 'Renewed and installed.'], ['o', 'All sessions up. Leaving the renewal job with platform.']]
				]
			},
			{
				turn: [
					['o', 'Our certificate is fine until next year. It’s the other side: the exchange presents a certificate signed by an authority we don’t trust.'],
					['x', 'The new certificate authority for production gateways took effect this weekend, as announced in our technical notice of {noticeDate}. Customers needed to install the new root certificate beforehand.'],
					['o', 'We never saw the notice. It went to an address nobody reads any more.']
				],
				ends: [
					[['p', 'New root installed on both hosts.'], ['o', 'Sessions up at {time}. Follow-up for us: get router-oncall onto the exchange’s technical notice list so the next one doesn’t surprise us. I’ve asked {L} to sort out the address.']],
					[['p', 'Root installed.'], ['o', 'Logged on at {time}. We owe ourselves a subscription to those notices; it’s on the router backlog.']]
				]
			}
		],
		prep: (c, path) => {
			c.x.tlsError = path === 0 ? 'peer rejected our certificate (certificate expired)' : 'certificate verify failed: unable to get local issuer certificate';
			c.x.alert = ['venue_session_logon_failed', `session ${c.v.sess} logon attempts=3 last_error=tls`];
		}
	},
	{
		titles: ['Order timestamps don’t match the venue', 'Timestamp differences in the audit file', 'Clock question from compliance', 'Router times out of line with {venue}'],
		opener: 'compliance',
		when: [560, 900],
		open: [
			'Our audit report for {dateLast} shows times on {dep} orders about {drift} milliseconds away from the venue’s receive times, which is more than we can report without an explanation. Can the router team look?',
			'Hello. In yesterday’s reporting, order times for {dep} are about {drift} ms out against {venue}’s. The tolerance is 50 ms. Is the router clock wrong?'
		],
		ack: ['Checking the clock on the host now. Is it every order, or some of them?', 'Looking. Is the gap the same size all day?'],
		look: [
			[['c', ['Every order we sampled, and always in the same direction.', 'About the same all day, and every order we looked at.']], ['o', ['Clock status on {hostShort}:', 'chrony on {hostShort}:'], 'host:ntp']],
			[['c', 'Roughly the same on every order in the sample. I can send the sample if it helps.'], ['o', 'Not yet; the host first. chrony on {hostShort}:', 'host:ntp']]
		],
		paths: [
			{
				turn: [
					['o', '{hostShort} isn’t synchronised to anything: its time source is a server that was switched off in the data centre move. It has been drifting for days.'],
					['c', 'How many days?'],
					['o', 'Since the move, going by chrony’s own log. I’ll give you exact dates once it’s fixed.'],
					['L', 'Is {otherHost} on the same source?'],
					['o', 'No, {otherHost} was set up after the move and points at the new servers. Only {hostShort} is off.'],
					['p', 'Pointed chrony on {hostShort} back at the data centre’s time servers. It will step in a few minutes.']
				],
				ends: [
					[['o', 'The clock is back within a millisecond. The days it was wrong are {dateFrom} to today.'], ['c', 'Thanks. We will file a correction for those days; that part is ours. Please make sure clock drift pages someone.'], ['p', 'Drift alert added.']],
					[['p', 'Fixed, and a drift alert added for every host.'], ['c', 'I’ll take the correction from here.'], ['~', '1'], ['c', 'Correction filed for {dateFrom} onwards.']]
				]
			},
			{
				turn: [
					['o', 'The host clock is within a millisecond of the reference, so the router’s own times are good. Which time does your report use?'],
					['c', 'The order time in the audit file.'],
					['o', 'That isn’t ours. The audit file takes the order time from {tool}’s record, and {tool} stamps it with the trader’s PC clock. The router’s time is in its own log, and it agrees with the venue to within a millisecond.'],
					['c', 'So the PCs on the desk are {drift} ms out?'],
					['t', 'Some of them. Desk PCs sync to the office time server, which is a long way from the data centre’s. We never meant {tool}’s time to be the official one.']
				],
				ends: [
					[['c', 'Then the report should use the router’s time. I’ll take that up with the reporting team and desk tools.'], ['o', 'Handing it over; nothing wrong with the router clock.']],
					[['t', 'We can send the router’s time back to {tool} and store that instead. On our board.'], ['c', 'Good. I’ll note the explanation for {dateLast}.']]
				]
			}
		],
		prep: (c, path) => {
			c.x.ntpBad = path === 0;
			c.v.drift = String(int(c.r, 38, 95));
		}
	},
	{
		titles: ['Orders going to XNAS', 'Wrong venue for {desk} orders?', 'Why are our orders on XNAS?', 'Venue question on {dep}'],
		opener: 'desk',
		desks: ['hedging', 'etf'],
		when: [600, 900],
		open: [
			'All our fills today are on XNAS. I thought we sent everything to XNYS. Did someone change something?',
			'Just noticed every order from {tool} today went to XNAS. Is that right?'
		],
		ack: ['Checking the {dep} settings.', 'Let me look at the deployment.'],
		look: [[['o', ['Settings on the host:', 'The file:'], 'settings'], ['r', 'And they really all went there?'], ['o', 'Every one today:', 'route:plain']]],
		paths: [
			{
				desk: ['hedging'],
				turn: [
					['o', '{dep} sends to XNAS and has done since April. The desk asked for it; the request is in our tickets.'],
					['q', ['That’s right, {r}. We moved to XNAS in the spring for the rebates. You weren’t here yet.', 'Yes, we asked for that. Nothing is wrong.']]
				],
				ends: [[['r', 'Ah. Then never mind, and thanks.'], ['o', 'No problem. Closing.']], [['r', 'Fine, I’ll update my notes.'], ['o', 'Nothing to change.']]]
			},
			{
				desk: ['etf'],
				turn: [
					['o', 'That is the hedging desk’s file, not yours: XNAS and a limit of 20,000. When {dep} moved to {hostShort} on {lastWeekday}, its file was copied from the wrong deployment.'],
					['r', 'That would also explain the rejects on the bigger creations.'],
					['L', 'Is the hedging desk’s own file still right?'],
					['o', 'Yes, theirs is untouched; only ours was copied over.']
				],
				ends: [
					[['o', 'Put the right file back and restarted at {time}. Orders go to XNYS again, with the 250,000 limit.'], ['L', 'Another hand-copied settings file. Owed by us: settings files kept in the repository and deployed from it, so a move can’t pick up the wrong one.']],
					[['o', 'Fixed and restarted.'], ['r', 'Confirmed, back on XNYS.'], ['o', 'Raised the settings-in-the-repository change for us again.']]
				]
			}
		],
		prep: (c) => {
			c.venue = 'XNAS';
			c.x.settings = { venue: 'XNAS', max_order_qty: 20000, test_orders_allowed: false };
		}
	},
	{
		titles: ['Rejects on {sym} since {time0}', 'Can’t trade {sym}', 'Everything in {sym} refused', '{sym} orders bouncing'],
		quiet: true,
		opener: 'desk',
		blotter: 'Rejected',
		when: [600, 930],
		open: ['Nothing in {sym} has got through since {time0}. The venue rejects every order. Is the router all right?', 'All our {sym} orders are being rejected. Other names are fine.'],
		ack: ['Checking.', 'Looking at the venue’s replies.'],
		look: [
			[['o', ['The venue’s rejects:', 'Here is what {venue} sends back:'], 'venue:halt']],
			[['o', 'The router itself is routing everything else on {dep} normally:', 'route:plain'], ['o', 'And here is what {venue} says to the {sym} orders:', 'venue:halt']]
		],
		paths: [
			{
				turn: [
					['o', '{sym} is halted, news pending, since {time0}. The venue refuses everything until it reopens. The router is fine.'],
					['r', 'Nobody told the desk. Do you know when it reopens?'],
					['o', 'The exchange says a reopening auction at {reopen}.']
				],
				ends: [[['r', 'It reopened; orders going.'], ['o', 'Closing. Nothing wrong on our side.']], [['o', 'Reopened at {reopen}. Nothing for us.']]]
			},
			{
				turn: [
					['o', '{sym} is halted pending news, so the rejects themselves are expected. What isn’t is the number: {tool} has sent {n3} orders in {sym} in {n1} minutes, a fresh one after every reject. The venue has warned us about the message rate on that session.'],
					['r', 'I didn’t send those. It must be the auto-retry.'],
					['t', '{tool}’s retry logic treats a reject as a reason to try again a second later. It should stop on a halt. Taking it.']
				],
				ends: [
					[['r', 'Turned off auto-retry for now.'], ['t', 'The fix is on our board: no retry on a halt reject.'], ['o', 'Handed to desk tools.']],
					[['t', 'Hotfix out this evening.'], ['o', 'Leaving it with desk tools. The router passed every order and every reject as it should.']]
				]
			}
		],
		prep: (c) => {
			c.v.reopen = hm(c.start + int(c.r, 20, 45) * MIN);
		}
	},
	{
		titles: ['Reject rate alert on {venue}', 'Throttled by {venue}', 'venue_reject_rate_high, {dep}', 'Burst of rejects from {venue}'],
		opener: 'pager',
		impact: true,
		when: [580, 940],
		open: ['Venue rejects on {dep} above 5 percent for 3 minutes.'],
		ack: ['Acked.', 'Looking.'],
		look: [[['o', ['Rejects:', 'The venue’s reasons:'], 'venue:throttle'], ['o', 'All of them “message rate exceeded”. The session is being throttled.']]],
		paths: [
			{
				turn: [
					['o', 'Message counts by source show {tool} sending cancel-and-replace on the same {n1} orders many times a second.'],
					['r', 'That’s the algo on the fast names. It has always been busy.'],
					['t', 'The algo chases the quote, and on a fast stock it replaces faster than the venue acknowledges. I’ll cap it.']
				],
				ends: [
					[['t', 'Capped at five replaces a second per order; deployed at {time}.'], ['o', 'Rejects are back to normal. Handed to desk tools.']],
					[['r', 'Paused the algo.'], ['t', 'Fix tomorrow.'], ['~', '1'], ['t', 'Rate cap is in production.']]
				]
			},
			{
				turn: [
					['o', 'Our rate is normal for this time of day. Something changed at the venue. Asking them.'],
					['x', 'Session limits on gateway {gw} were set to the default by mistake during last night’s capacity work. We have restored your configured limit.']
				],
				ends: [[['o', 'Rejects stopped at {time}. The exchange’s mistake; nothing for us.']], [['L', 'Ask them to tell us before they touch our limits.'], ['o', 'Asked. They’ve apologised and say it was a one-off.']]]
			}
		],
		prep: (c) => {
			c.x.alert = ['venue_reject_rate_high', `rejects ${int(c.r, 6, 30)}% of new orders (threshold 5% for 3m)`];
		}
	},
	{
		titles: ['Need the size limit raised for today', 'Bigger orders for the rebalance', 'Limit request: {dep}', 'Can we send {bigQty} in one go?'],
		quiet: true,
		opener: 'desk',
		desks: ['program', 'indexarb', 'cash'],
		when: [480, 780],
		open: [
			'We have a {bigQty}-share order in {sym} for a client today, and the router stops anything over {limit}. Can you raise the limit for the day?',
			'Client block in {sym}, {bigQty} shares. Splitting it into {limit}-share pieces is a pain. Could the {dep} limit go up today?'
		],
		ack: ['The limit is a risk control, so it isn’t mine to change on my own. Asking risk.', 'I can change it, but not without risk saying yes. One moment.'],
		look: [
			[['k', ['What is it for, and for how long?', 'Who is the client and what’s the window?']], ['r', '{sym}, {bigQty} shares, worked over the afternoon. Just today.'], ['k', 'And why can’t it go in clips like every other big order?'], ['r', 'It can, but it’s {n2} clips, and every one is a chance to fat-finger it.']]
		],
		paths: [
			{
				turn: [
					['k', 'No. The limit is there for exactly this: one keystroke putting {bigQty} shares on the market. Work it in clips, or give it to the cash desk for the block facility.'],
					['r', 'It’s a lot of clips.'],
					['k', 'It is, and that’s the point. If the clips are the worry, {tool} can slice it for you.'],
					['t', 'It can: the slicer sends at most {limit} per child order and spaces them out. I can show you how.']
				],
				ends: [[['r', 'Fine, we’ll clip it with the slicer.'], ['o', 'Leaving the limit as it is.']], [['r', 'We’ll hand it to the cash desk.'], ['o', 'Closing; no change.']]]
			},
			{
				turn: [
					['k', 'Approved for today only, at {tempLimit}. Put it back before tomorrow’s open.'],
					['o', 'Raising {dep} to {tempLimit} and restarting between orders. Everyone else on {dep}, the router will be away for about ten seconds.', 'settings'],
					['q', 'Fine by us, nothing working right now.']
				],
				ends: [
					[['o', 'Done at {time}.'], ['r', 'Sent the first piece, through.'], ['~', '1'], ['o', 'Back to {limit} at 07:10, and checked.']],
					[['o', 'Changed and restarted.'], ['r', 'Done, thanks.'], ['~', '1'], ['o', 'Limit back to {limit} before the open.'], ['k', 'Thanks for putting it back.']]
				]
			}
		],
		prep: (c) => {
			c.v.bigQty = group(c.limit * int(c.r, 4, 10));
			const temp = c.limit * 2;
			c.v.tempLimit = group(temp);
			c.x.settings = { venue: c.venue, max_order_qty: temp, test_orders_allowed: false };
		}
	},
	{
		titles: ['End-of-day counts don’t match the drop copy', 'Reconciliation break on {dep}', '{diff} orders missing from the router count', 'Recon difference for {dateLast}'],
		opener: 'ops',
		when: [480, 600],
		open: [
			'Yesterday’s reconciliation has the router and the drop copy apart for {dep}. Difference of {diff}. Can you check?',
			'Morning. Recon break on {dep} for {dateLast}: the router count and the drop copy differ by {diff}. Everything else reconciles.'
		],
		ack: ['Looking. Which side is higher?', 'On it. Can you paste the table?'],
		look: [[['m', ['The recon:', 'Full table:'], 'recon'], ['m', 'The router has more than the drop copy. Usually that’s the other way round when something goes wrong.']]],
		paths: [
			{
				turn: [
					['o', 'The router count includes the orders it rejected, which never reach the venue and so are never on the drop copy. Yesterday {dep} rejected exactly {diff}.'],
					['m', 'The script is meant to filter those out. I’ll check why it didn’t.'],
					['m', 'Found it: the filter got lost when the script moved to the new reporting server.'],
					['o', 'Then every day since the move will be off by that day’s rejects. Worth rerunning them.']
				],
				ends: [[['m', 'Fixed and rerun; every day since the move reconciles to zero now.'], ['o', 'Nothing for the router.']], [['m', 'My problem, I’ll fix the script and rerun the week.'], ['o', 'Thanks. Closing on our side.']]]
			},
			{
				turn: [
					['o', 'The central log store really is missing lines: there’s a gap of {gapMinutes} minutes in the {dep} log there.', 'route:gap'],
					['o', 'The file on the host has every line, though. So the router logged them; they never reached the store.'],
					['m', 'Hang on: so the router has more orders than the store, and the store is what the recon reads?'],
					['o', 'Yes, the recon counts from the store. The router’s own number is right; the store’s is short.'],
					['p', 'The log shipper on {hostShort} crashed and was restarted by the watchdog {gapMinutes} minutes later. Whatever it hadn’t sent was lost from the store.']
				],
				ends: [
					[['p', 'I’ve re-shipped the missing window from the file, and fixed the shipper’s buffer so a restart doesn’t lose it.'], ['m', 'Recon closes now.'], ['o', 'Platform owned this one.']],
					[['p', 'Re-shipped.'], ['m', 'Recon closed with a note.']]
				]
			}
		],
		prep: (c) => {
			c.x.diff = int(c.r, 7, 60);
			c.v.diff = String(c.x.diff);
			c.x.gapMinutes = int(c.r, 6, 14);
			c.v.gapMinutes = String(c.x.gapMinutes);
			c.x.gapFromLong = `"${dayMonth(weekdayBefore(c.start, 1))} 12:00"`;
		}
	},
	{
		titles: ['Test orders hanging on UAT', 'Simulator not answering', 'UAT orders get no reply', 'No fills from the simulator'],
		opener: 'tools',
		uat: true,
		when: [600, 1000],
		open: [
			'Test orders on UAT go out and never come back. No fill, no reject, nothing. Started about {time0}, in the middle of {tool}’s regression run.',
			'The simulator seems dead. The UAT router accepts my test orders and then nothing comes back. I have a release to sign off this afternoon.'
		],
		ack: ['Looking at UAT.', 'Checking. Is it every order or only some?'],
		look: [
			[['o', ['The router routes them to the simulator without complaint:', 'UAT log:'], 'route:uat'], ['t', 'So they leave the router. Where do they go after that?']],
			[['t', 'Every order since {time0}.'], ['o', 'They do reach the router and it routes them on:', 'route:uat'], ['o', 'The router waits for the simulator’s reply, and none comes.']]
		],
		paths: [
			{
				turn: [
					['o', 'The router hands them over, but the simulator isn’t answering anyone. Asking its team.'],
					['w', ['We’re in a maintenance window until {simUntil}: new matching rules for the auction tests. It should have been announced; sorry.', 'Maintenance until {simUntil}, upgrading the simulator’s matching. The notice didn’t go out, my fault.']],
					['t', 'Can I keep running and let the orders queue?'],
					['w', 'No, anything sent now is dropped. Run again after {simUntil}.']
				],
				ends: [
					[['w', 'Back up.'], ['t', 'Fills coming back, run is green.'], ['o', 'Asked the simulator team to post their windows in router-oncall too.']],
					[['w', 'Up again at {simUntil}. We’ll announce windows in #uat from now on.'], ['o', 'Nothing in the router.']]
				]
			},
			{
				turn: [
					['o', 'The simulator is up and answering others. The UAT router is connecting to an address that isn’t the simulator any more: its connection log shows the old address timing out.'],
					['p', 'The simulator moved hosts last week, and the UAT DNS entry wasn’t updated. Other teams use the new name directly, which is why only you noticed.'],
					['t', 'Is that something we’ll need to change in {tool}?'],
					['o', 'No, only the router talks to the simulator. Once the name points at the right host, nothing else changes.']
				],
				ends: [[['p', 'DNS fixed.'], ['o', 'Router reconnected; fills are flowing.']], [['p', 'Updated, and I checked the other UAT names while I was there.'], ['t', 'Working.'], ['o', 'Platform’s fix.']]]
			}
		],
		prep: (c) => {
			c.v.simUntil = hm(c.start + int(c.r, 30, 90) * MIN);
		}
	},
	{
		titles: ['Weekend page: router heartbeat missing', 'router_heartbeat_missing on a Saturday', 'Saturday alert on {hostShort}', 'Heartbeat alert overnight'],
		quiet: true,
		opener: 'pager',
		saturday: true,
		when: [120, 600],
		open: ['No heartbeat from larkspur-router on {hostShort} for 5 minutes.'],
		ack: ['Acked from home. Logging in.', 'Mine. Logging in.'],
		look: [
			[['o', 'No orders on a Saturday, so nobody is hurt. Looking at what happened.'], ['L', 'Saw the page. Need me?'], ['o', 'Not yet. Give me ten minutes.'], ['o', 'The host:', 'host:boot']],
			[['o', 'Weekend, so nothing is trading. Checking the host before I wake anyone else.', 'host:boot'], ['L', 'Anything I can do from here?'], ['o', 'Not yet, thanks.']]
		],
		paths: [
			{
				turn: [
					['o', 'The host was rebooted at {time0}: kernel patches, according to its journal. The router came back by itself a few minutes later, so the heartbeat stopped for exactly as long as the reboot took.'],
					['p', 'Our patching window. It was in the change calendar; the silence for the router alerts wasn’t set.'],
					['L', 'Which is the third time this quarter.'],
					['p', 'I know. Whoever runs the window is meant to set it, and the checklist doesn’t say so.']
				],
				ends: [
					[['o', 'Router back after the reboot. Owed by us: set silences from the change calendar so that planned work doesn’t page.'], ['L', 'Agreed, on the list.'], ['~', '1'], ['o', 'Sessions logged on at the usual time this morning; nothing left from Saturday.']],
					[['o', 'All back. I’ve raised silences from the calendar for us, since nobody remembers to set them by hand.']]
				]
			},
			{
				turn: [
					['o', 'The router is up, uptime twelve days, and its heartbeat is going out. The monitoring host is the one that stopped listening: its disk filled.'],
					['L', 'So we were blind for how long?'],
					['o', 'About an hour. Nothing traded in that hour, but the same could happen on a weekday.'],
					['p', 'Cleared. Monitoring is back, and the router’s heartbeat shows again.']
				],
				ends: [[['o', 'Nothing for the router.'], ['p', 'I’ll add a disk alert on the monitoring host on Monday.']], [['p', 'Added a check on the monitoring host itself, watched from the other one.'], ['o', 'Closing.']]]
			}
		],
		prep: (c, path) => {
			c.x.alert = ['router_heartbeat_missing', 'last heartbeat 5m ago'];
			c.x.rebooted = path === 0;
		}
	},
	{
		titles: ['Risk arbitrage desk joining the router', 'New deployment for risk arbitrage', 'Onboarding request: risk arbitrage', 'Router for a new desk'],
		quiet: true,
		opener: 'desk',
		desks: ['riskarb'],
		when: [600, 900],
		open: ['The risk arbitrage desk is moving off the broker’s system and wants to send through our router from next month. What do you need from us?', 'We’d like the risk arbitrage desk on the router before year end. Where do we start?'],
		ack: ['A deployment of its own and a settings file. Which venue, and what size limit?'],
		look: [
			[['r', 'XNYS, and our biggest order is usually about 20,000 shares.'], ['o', 'Then a limit of 25,000, venue XNYS, no test orders in production. UAT first. This is what the file would hold:', 'settings'], ['r', 'And our tool? We’re having desk tools build one on the same client code as the others.'], ['t', 'Yes, {tool} uses the same sender as everyone else. It can point at UAT as soon as there’s a deployment.'], ['o', 'The deployment lives on rtr-b next to ETF and hedging; there’s room.']]
		],
		paths: [
			{
				turn: [['k', 'Fine at 25,000. Review after the first month.'], ['o', 'UAT deployment is up; {tool} can connect to it now.'], ['t', 'Connected. First test orders filled on the simulator.'], ['r', 'What happens if we send something over 25,000 by mistake?'], ['o', 'The router refuses it and says why; nothing reaches the venue.']],
				ends: [[['~', '3'], ['r', 'Tested all week on UAT.'], ['o', 'Production deployment live from {time}. Welcome aboard.']], [['~', '2'], ['o', 'Production deployment created, and the first orders went out at {time}.'], ['r', 'All filled. Thanks, everyone.']]]
			},
			{
				turn: [['k', 'Limit is fine.'], ['c', 'Before production I need the desk’s supervisory procedures updated for the new route, and a sign-off from the desk head.'], ['r', 'I’ll get them drafted.'], ['o', 'UAT can go up now regardless.']],
				ends: [[['o', 'UAT stays up meanwhile. Production waits for compliance.'], ['~', '4'], ['r', 'Still waiting for compliance; the procedures are with them.']], [['o', 'UAT is up; production waits for compliance’s sign-off.'], ['~', '3'], ['c', 'Procedures received; I’ll review them next week.']]]
			}
		]
	},
	{
		titles: ['Router CI failing', 'Pipeline red on larkspur-router', 'Tests won’t run in CI', 'CI broken since this morning'],
		opener: 'tools',
		when: [560, 1000],
		open: ['The router pipeline has failed on every run since about {time0}. I can’t merge anything.', 'CI on larkspur-router is red and I don’t think it’s my change. The tests pass locally.'],
		ack: ['Looking at the job.', 'Which job? Send me a link and I’ll look.'],
		look: [
			[['o', ['Job output:', 'The failing step:'], 'ci'], ['t', 'That’s not even getting to the tests, is it?']],
			[['t', 'Every run since {time0}. Link is in the merge request.'], ['o', 'Got it. The job:', 'ci'], ['o', 'It stops before a single test runs.']]
		],
		paths: [
			{
				turn: [
					['o', 'No: pytest isn’t installed in the runner image any more. The image was rebuilt overnight, and every repository that uses it is red, not just ours.'],
					['p', 'The new base image dropped the test extras. Pinning back to last week’s while we work out why.'],
					['t', 'Do I need to rerun anything?'],
					['p', 'Retry the job once the pin is in; I’ll say here.']
				],
				ends: [[['p', 'Pinned; runs are green.'], ['o', 'Nothing in the router code.']], [['p', 'Fixed image published.'], ['t', 'Merged.']]]
			},
			{
				turn: [
					['o', 'The failing runs are on your branch, not main, and the error is in a test module your branch adds: it imports a package that isn’t in the test extras. Main is green.'],
					['t', 'It passes locally because I have that package installed.'],
					['o', 'Either add it to the test extras in pyproject.toml, or do without it. The suite has managed with pytest alone so far.']
				],
				ends: [[['t', 'Ah, I forgot to add it. Sorry.'], ['o', 'No problem. Nothing broken.']], [['t', 'Dropped the import; green.']]]
			}
		],
		prep: (c, path) => {
			c.x.ci = path === 0 ? 'missing' : 'branch';
			c.x.branch = `${pick(c.r, ['beth', 'arun', 'yusuf'])}/${pick(c.r, ['reject-report', 'session-metrics', 'faster-logging'])}`;
			c.x.badFile = pick(c.r, ['test_report.py', 'test_metrics.py']);
			c.x.badModule = pick(c.r, ['hypothesis', 'freezegun']);
		}
	},
	{
		titles: ['Basket lines rejected by the router', 'Rejects on part of a basket', 'Some lines of a basket refused', 'Router rejecting basket orders'],
		opener: 'desk',
		desks: ['program', 'indexarb'],
		when: [580, 930],
		open: [
			'We sent a {n2}-line basket from {tool}, and a few lines came back rejected by the router, quantity outside the limit. They’re tiny orders, nowhere near the limit.',
			'Part of our basket was refused by the router just now: “outside the limit”. Most lines went, a handful didn’t, and none of them is big.'
		],
		ack: ['Looking.', 'Checking the {dep} log.'],
		look: [[['o', ['Log:', 'Here are the rejects among the rest of the basket:'], 'route:zero'], ['r', 'What’s the limit got to do with these?']]],
		paths: [
			{
				turn: [
					['o', 'Those lines went out with a quantity of zero. The router rejects zero as outside the limit, which is right, if a confusing message. The problem is earlier: build_order accepts a quantity of zero or less without complaint.'],
					['r', 'Why would {tool} send zero?'],
					['t', 'The basket weights round some lines down to nothing. We’ll filter zero lines in {tool} before they’re sent.']
				],
				ends: [
					[['t', 'Filter is live.'], ['o', 'Good. On the router side, build_order should refuse a quantity below 1 itself; it’s on our backlog.']],
					[['o', 'Written up for us: build_order should raise for a quantity below one instead of leaving the router to reject it.'], ['t', 'Our filter is in meanwhile.']]
				]
			},
			{
				turn: [['o', 'Those lines had a quantity of zero.'], ['r', 'Zero? Let me check the client’s file.'], ['r', 'The client’s basket file has blank quantities on those lines. {tool} reads blank as zero.'], ['o', 'Then the router did the right thing, if with an unhelpful message.']],
				ends: [[['r', 'Asked the client for a corrected file.'], ['o', 'Nothing for the router.']], [['t', 'We’ll make {tool} refuse a file with blank quantities.'], ['o', 'Handed to desk tools.']]]
			}
		]
	},
	{
		titles: ['Memory alert on {hostShort}', 'router_rss_high, {dep}', '{dep} router using too much memory', 'Memory growing on {dep}'],
		opener: 'pager',
		when: [780, 940],
		open: ['Resident memory of larkspur-router@{dep} above 2 GB.'],
		ack: ['Acked.', 'Looking.'],
		look: [
			[['o', ['Memory over the day:', 'RSS every hour since the start:'], 'host:mem'], ['o', 'It isn’t in danger yet; the host has plenty. But it shouldn’t grow like this.'], ['q', 'Should we be worried for the close?'], ['o', 'No. It has hours of headroom, and I’d restart it after the close anyway.']],
			[['q', 'We got told the router alarm went off. Anything for us?'], ['o', 'Not yet. Memory over the day:', 'host:mem'], ['o', 'It grows steadily with the orders, which it shouldn’t.']]
		],
		paths: [
			{
				turn: [
					['o', 'The growth started on {lastWeekday}, the day the {dep} unit was restarted with PYTHONTRACEMALLOC set for the slow-fills investigation. Tracemalloc keeps a trace of every allocation, and nobody took it out again.'],
					['t', 'That was me. I meant to take it out the next morning and didn’t.'],
					['L', 'Restart it without the override after the close. And whoever adds an override writes down when it comes out.']
				],
				ends: [[['o', 'I’ll take the override out at the close.'], ['~', '1'], ['o', 'Override removed and restarted after the close. Memory has been flat since.']], [['~', '1'], ['o', 'Restarted after the close without the override; flat all morning.'], ['L', 'Good. Added a line about overrides to the on-call notes.']]]
			},
			{
				turn: [
					['o', 'It grows about {mbph} MB an hour, every day, and goes back to normal after the nightly restart. Nothing changed on the host, and there is no override on the unit.'],
					['L', 'Has it always done this?'],
					['o', 'The graphs go back a month, and it’s there in all of them, a little worse on busy days.'],
					['L', 'Try tracemalloc on UAT with replayed traffic.']
				],
				ends: [
					[['~', '2'], ['o', 'Couldn’t reproduce it on UAT. Production still grows every day; the nightly restart covers it for now.']],
					[['~', '1'], ['o', 'Tracemalloc on UAT shows nothing. Still growing in production.'], ['L', 'Leave it open. We look again after the quarter.']]
				]
			}
		],
		prep: (c) => {
			c.x.mbPerHalfHour = int(c.r, 45, 80);
			c.v.mbph = String(c.x.mbPerHalfHour * 2);
			c.x.alert = ['router_rss_high', `rss ${int(c.r, 2050, 2600)} MB (threshold 2048 MB)`];
		}
	},
	{
		titles: ['Router slow this morning', 'Orders lagging', 'Everything feels slow', 'Slow acks on {dep}'],
		opener: 'desk',
		blotter: 'Pending',
		when: [600, 900],
		open: ['Is the router slow today? Orders take a couple of seconds to show as working in {tool}, and prices on the ticket seem behind.', 'Everything feels sluggish this morning. Orders seem to hang before they show up as working.'],
		ack: ['Checking our timings.', 'Let me look at the numbers.'],
		look: [[['o', ['Router timings are normal:', 'Per minute, nothing unusual:'], 'latency'], ['r', 'Then why does it feel like treacle?'], ['o', 'Let me look at what happens before and after the router.']]],
		paths: [
			{
				turn: [
					['o', 'The router decides in about 40 microseconds, same as always, and the venue acknowledges in the usual time. What you describe sounds like your prices, not us.'],
					['r', 'The prices do look stuck on a few names now that you say it.'],
					['d', 'The desk’s market data cache froze at {time0} and has been serving stale quotes. Restarting it.']
				],
				ends: [[['d', 'Restarted; quotes are live.'], ['r', 'Much better.'], ['o', 'Handed to market data.']], [['d', 'Cache restarted, and I’ve added an alarm for quotes that stop moving.'], ['o', 'Nothing for the router.']]]
			},
			{
				turn: [['o', 'Nothing slow on the router side, and other desks are fine. It looks local to {tool}.'], ['r', 'Everyone on the desk says the same, though.'], ['t', '{tool} is exporting the whole day’s orders to a spreadsheet for {q}, and the export runs on the screen’s own thread, so everything waits for it.']],
				ends: [[['t', 'Moving the export off that thread; fix in the next release.'], ['o', 'Nothing in the router.']], [['q', 'Sorry, that was my export.'], ['t', 'Not your fault. It goes off the screen thread in the next release.']]]
			}
		]
	},
	{
		titles: ['Can’t log on to the exchange’s test environment', 'UAT session to the exchange test system failing', 'Exchange certification test blocked', 'UAT logon refused by the exchange'],
		opener: 'self',
		uat: true,
		when: [600, 900],
		open: ['UAT can’t log on to the exchange’s test environment: logon rejected, invalid credentials. We need it for the certification test on {testDay}.', 'Heads-up for the team: UAT has been refused by the exchange’s test environment since this morning, invalid credentials. The certification test is on {testDay}.'],
		ack: [''],
		look: [[['o', 'Gateway log:', 'venue:logon'], ['L', 'Did anything change on our side?'], ['o', 'Not that I can find. The password in the vault was last changed in the summer. Asking the exchange.']]],
		paths: [
			{
				turn: [
					['x', 'Passwords on the test environment expire every 90 days. Yours expired on {dateLast}. A reset has been sent to the registered contact.'],
					['o', 'The registered contact is {former}, who left in the summer.'],
					['L', 'Then the reset went nowhere. I’ll ring them.']
				],
				ends: [[['L', 'I’ve had the contact changed to router-oncall and reset the password.'], ['o', 'UAT logged on at {time}. Password in the vault, and a reminder set for the next expiry.']], [['L', 'Contact changed; the reset comes to router-oncall now.'], ['o', 'Reset done, UAT logged on at {time}.']]]
			},
			{
				turn: [['x', 'The test environment is closed for an upgrade until {testDay}. Logons are refused until then.'], ['o', 'So nothing wrong with our credentials; the certification has to move.'], ['L', 'Did they announce the upgrade?'], ['o', 'In a notice we don’t receive. Same story as the certificates.']],
				ends: [[['o', 'Moved our test to the next window.']], [['L', 'Fine. Book the next slot, and get us on their notice list.'], ['o', 'Booked, and asked for the list.']]]
			}
		],
		prep: (c) => {
			c.v.testDay = weekday(addWeekdays(c.start, int(c.r, 2, 4)));
			c.v.former = pick(c.r, formerContacts);
		}
	},
	{
		titles: ['Orders refused as outside the price band', '{venue} price band rejects', 'Limit price rejects on {sym}', 'Rejects at the open: price band'],
		quiet: true,
		opener: 'desk',
		blotter: 'Rejected',
		when: [571, 620],
		open: ['A run of orders in {sym} was refused by {venue} at the open, “price outside band”. Our limits were right where the market was.', 'Price band rejects on {sym} just now. We priced off the screen. What’s going on?'],
		ack: ['Checking.', 'Looking at the venue’s replies.'],
		look: [[['o', ['Venue rejects:', 'Here is what came back:'], 'venue:band'], ['r', 'The router didn’t change our prices, did it?'], ['o', 'No, it passes the limit through as it gets it.']]],
		paths: [
			{
				turn: [['o', 'At the open {sym} came in {pct} percent down on news, and the band moved with it. Your limits were where the market was yesterday.'], ['r', 'Ah. That opening print was a shock.']],
				ends: [[['o', 'Nothing wrong; closing.']], [['r', 'Repriced, filling.'], ['o', 'Good. Nothing for us.']]]
			},
			{
				turn: [['o', 'Your limits were {pct} percent away from where {sym} was trading. {tool} prices the order from the desk’s quote cache.'], ['d', 'The cache for {sym} stopped updating at 09:29 after a feed reconnect. Fixed now.']],
				ends: [[['d', 'Fixed.'], ['o', 'Handed to market data.']], [['r', 'Prices look live again.'], ['d', 'Added an alarm for a symbol that stops updating.']]]
			}
		]
	},
	{
		titles: ['{venue} having problems; can we move?', 'Request to send {dep} elsewhere today', 'XNAS trouble: hedging orders', 'Temporary venue change for {dep}'],
		opener: 'desk',
		desks: ['hedging'],
		impact: true,
		wide: true,
		when: [600, 840],
		open: [
			'XNAS is timing out on half our hedges, and their status page says they’re investigating. Can we point {dep} at XNYS until they sort it out?',
			'Our hedges to XNAS keep failing. Other desks say XNYS is fine. Can the router send ours there for the rest of the day?'
		],
		ack: ['Checking the venue side first.', 'Let me see what XNAS is doing before I touch anything.'],
		look: [[['o', 'Our sessions to XNAS:', 'venue:session'], ['o', 'They keep dropping, and both lines show the same thing, so it isn’t one line.']]],
		paths: [
			{
				turn: [
					['x', 'We are experiencing intermittent disconnects on several order entry gateways. Engineers are working on it. Next update in 30 minutes.'],
					['o', 'Changing the venue in the {dep} settings needs risk’s nod and a restart, and the restart takes about ten seconds. {r}, are your hedges safe to pause for that?'],
					['r', 'Yes, do it now.'],
					['k', 'Fine for today. Back to XNAS once they confirm it’s fixed.'],
					['o', 'Changed {dep} to XNYS and restarted at {time}.', 'settings']
				],
				ends: [
					[['r', 'Hedges filling on XNYS.'], ['~', '1'], ['x', 'The disconnects were resolved at 15:40 after a faulty switch was replaced.'], ['o', 'Moved {dep} back to XNAS before the open, with risk’s agreement. Nothing left for us.']],
					[['r', 'Working, thanks.'], ['x', 'All gateways have been stable since {time}.'], ['o', 'Switched {dep} back to XNAS after the close.']]
				]
			},
			{
				turn: [
					['x', 'A gateway restarted at {time0} and has been stable since.'],
					['o', 'Our sessions agree: logged on and quiet for the last ten minutes.'],
					['k', 'Then no change. If it happens again, we talk.'],
					['r', 'Fair, it does look fine now.']
				],
				ends: [[['o', 'No change to {dep}. Watching the sessions for the rest of the day.'], ['~', '1'], ['o', 'Quiet for the rest of that day. Closing.']]]
			}
		],
		prep: (c) => {
			c.x.settings = { venue: 'XNYS', max_order_qty: 20000, test_orders_allowed: false };
		}
	},
	{
		titles: ['Platform asking to restart {hostShort} today', 'Urgent patch on the router hosts', 'Restart request during trading hours', 'Security patch for {hostShort}'],
		opener: 'platform',
		when: [600, 840],
		open: ['We have an urgent security patch for the router hosts, and the guidance is to apply it today. It needs a reboot. When can we have {hostShort}?', 'Security have rated a kernel patch urgent for {hostShort} and {otherHost}. It needs a reboot. Can we do it this afternoon?'],
		ack: ['Not during trading if it can be helped. How urgent is urgent?'],
		look: [
			[['p', 'The advisory is rated critical, but it needs local access to exploit, and the hosts are only reachable from the jump boxes.'], ['L', 'Then it can wait for the close. {o}, agree?'], ['o', 'Yes. A reboot during trading drops every session on the host, and the desks would have to resend whatever was working.'], ['p', 'Security are fine with after the close as long as it’s today.']]
		],
		paths: [
			{
				turn: [['p', 'After the close works. 16:30?'], ['o', 'Fine. I’ll warn the desks in router-announce. The deployments start by themselves after a reboot, so it needs nobody from us.'], ['r', 'Will we have it for the after-hours checks at five?'], ['o', 'It should be back well before then.']],
				ends: [[['p', 'Patched and rebooted at 16:41.'], ['o', 'Both deployments came back by themselves and the sessions logged on. Nothing else to do.']], [['~', '1'], ['o', 'Rebooted after the close; all sessions logged on at the usual time this morning.']]]
			},
			{
				turn: [['p', 'Security want it on both hosts by Friday.'], ['o', '{otherHost} can go tonight; {hostShort} has the rebalance tomorrow, so the night after.'], ['p', 'I’ll tell security.']],
				ends: [[['p', '{otherHost} done tonight.'], ['~', '2'], ['p', '{hostShort} still waiting; security are chasing.'], ['o', 'Tonight after the close, then.']]]
			}
		]
	},
	{
		titles: ['Fill price doesn’t match the limit', 'Wrong price on a {sym} fill?', 'Client asking about a {sym} fill price', 'Execution price query'],
		quiet: true,
		opener: 'desk',
		desks: ['cash', 'program'],
		when: [560, 900],
		open: ['{client} is asking why yesterday’s {sym} buy, order {id2}, shows a price of {fillPx} when their limit was {limitPx}. They think we changed their order. Did the router touch the price?', 'Client query: order {id2}, {sym}, limit {limitPx}, and they’re looking at {fillPx}. They want to know who changed it.'],
		ack: ['Let me look at the order.', 'The router doesn’t change prices, but let me check this one.'],
		look: [[['o', 'Here is its route and its fills:', 'history'], ['r', 'What am I looking at?'], ['o', 'The limit the router sent, the venue’s acknowledgement, and each fill with its price.']]],
		paths: [
			{
				turn: [
					['o', 'The router sent it with the client’s limit of {limitPx}, unchanged. The venue filled it at {fillPx}, better than the limit: someone was selling below it.'],
					['r', 'So the client got a better price and is complaining?'],
					['o', 'Looks that way. A buy limit is the most they pay, not the price they get.']
				],
				ends: [[['r', 'I’ll explain it to them.'], ['o', 'Closing.']], [['r', 'They’re happy now that it’s in their favour.'], ['o', 'Good. Nothing for us.']]]
			},
			{
				turn: [
					['o', 'The router sent {limitPx}, and it filled at {limitPx}. Where does {fillPx} come from?'],
					['r', 'The client’s execution report from us.'],
					['t', 'That report prints the arrival price in the price field for care orders. Known bug; the fix is in the next {tool} release.'],
					['r', 'How many clients got reports like that?']
				],
				ends: [[['t', 'Every care order since the last release. I’ll send the list.'], ['r', 'I’ll send corrected reports.'], ['o', 'Nothing for the router.']], [['t', 'A handful; I can send corrected reports today.'], ['o', 'Handed to desk tools.']]]
			}
		],
		prep: (c, path) => {
			c.sym2 = c.sym;
			const limitPx = drift(c.r, c.sym[1]);
			c.x.limitPx = limitPx;
			const fill = (Number(limitPx) - int(c.r, 2, 9) / 100).toFixed(2);
			c.x.fillPx = path === 0 ? fill : limitPx;
			c.v.limitPx = limitPx;
			c.v.fillPx = path === 0 ? fill : (Number(limitPx) + int(c.r, 3, 20) / 100).toFixed(2);
			c.v.sym2 = c.sym[0];
		}
	},
	{
		titles: ['Cancel not acknowledged', 'Can’t cancel a {sym} order', 'Order still working after cancel', 'Cancel pending for ages'],
		opener: 'desk',
		blotter: 'Cancel pending',
		when: [600, 940],
		open: ['I tried to cancel {qty} {sym} at {time0} and it is still showing as cancel pending. As far as I can tell the order is still working at the venue.', 'My {sym} order won’t cancel. {tool} says cancel pending and has for several minutes.'],
		ack: ['Looking.', 'Checking what went out.'],
		look: [[['o', 'Here is what went to {venue} and what came back:', 'venue:cancel'], ['r', 'So where is my cancel?']]],
		paths: [
			{
				turn: [
					['o', 'The cancel went out a second after you pressed it, and the venue hasn’t answered it. Other desks’ cancels on the same gateway are hanging too. Asking them.'],
					['x', 'Cancel processing on {gw} was delayed from {time0} because of a backlog. All cancels have now been processed in order.'],
					['r', 'Showing cancelled now. One partial fill went through before it.']
				],
				ends: [[['o', 'Venue side; nothing for us.']], [['L', 'Ask them for the exact window for the record.'], ['o', 'Asked, and added to the venue incidents list.']]]
			},
			{
				turn: [
					['o', 'The cancel {tool} sent names order {badId}, which isn’t one of yours today; the venue refused it as unknown, and your order is still working.'],
					['r', 'I definitely clicked on the {sym} row.'],
					['t', 'Our cancel takes the id from the screen row, and a sort can reorder the rows under the click. Ugh.']
				],
				ends: [[['r', 'Cancelled it again from the order details; done.'], ['t', 'Fix on our board.'], ['o', 'Handed to desk tools.']], [['t', 'Hotfix tonight: the cancel uses the selected order, not the row.'], ['o', 'Nothing in the router.']]]
			}
		],
		prep: (c, path) => {
			c.v.badId = String(c.idBase - int(c.r, 1000, 9000));
			c.x.cancelId = path === 0 ? Number(c.v.id) : Number(c.v.badId);
			c.x.cancelAnswered = path === 1;
		}
	},
	{
		titles: ['Orders refused after the close', 'Rejects just after four', 'Late orders bouncing', 'Can’t send after 16:00'],
		quiet: true,
		opener: 'desk',
		blotter: 'Rejected',
		when: [966, 990],
		open: ['Everything we send now comes back rejected. We have a client order to finish. Has the router stopped for the day?', 'Rejects on everything since four o’clock. Is the router closed?'],
		prep: (c) => {
			c.x.blotterAfter = 960;
		},
		ack: ['The router doesn’t stop; checking the venue’s replies.'],
		look: [[['o', 'Venue replies:', 'venue:closed']]],
		paths: [
			{
				turn: [['o', ['The regular session ended at 16:00, and the venue refuses day orders after the close. The router passes them on and passes the reject back.', 'It’s the venue, not us: the regular session closed at 16:00 and everything sent since is refused. The router only carries the answer back.']], ['r', 'We used to be able to trade until a quarter past.'], ['o', 'Not on this venue and not through the router, as far back as the logs go. Maybe the broker’s late session, before the desk moved over?']],
				ends: [[['r', 'Then it waits for tomorrow.'], ['o', 'Closing.']], [['t', 'We can warn in {tool} after 16:00. On our board.'], ['o', 'Handed to desk tools for the warning; nothing for the router.']]]
			},
			{
				turn: [
					['o', 'The venue closed at 16:00 and refuses anything sent since. That part is normal.'],
					['r', 'I know it’s closed. I thought the router would hold them and send them at the open.'],
					['o', 'It doesn’t keep anything overnight: an order goes out when it arrives, or it’s refused. {tool} has a park list for orders you want to send in the morning.'],
					['t', 'Right, the park list. It’s under the order menu, and it sends at 09:30 when you release it.']
				],
				ends: [[['r', 'Parked them. Thanks.'], ['o', 'Nothing wrong with the router. Closing.']], [['t', 'We’ll make {tool} offer the park list when someone sends after the close.'], ['o', 'Handed to desk tools.']]]
			}
		]
	}
];
topics.push(
	{
		titles: ['Orders cancelled by {venue} without us asking', 'Venue cancels on {sym}', 'Unexplained cancels from {venue}', 'Self-match cancels?'],
		quiet: true,
		opener: 'desk',
		desks: ['program', 'indexarb', 'hedging'],
		blotter: 'Cancelled',
		when: [600, 930],
		open: [
			'Some of our {sym} orders are being cancelled by the venue. We didn’t cancel them, and the reason in {tool} just says “cancelled by venue”.',
			'{venue} keeps cancelling our resting orders in {sym}. Nobody on the desk touched them. What is going on?'
		],
		ack: ['Looking at what the venue sent back.', 'Checking the venue’s messages for those orders.'],
		look: [[['o', ['The venue’s side:', 'Here are those orders and the venue’s replies:'], 'venue:selfmatch'], ['o', 'The cancels all say “self-match prevented”. The venue cancels a resting order when another order from the same firm would trade against it.']]],
		paths: [
			{
				turn: [
					['r', 'Against us? We were only buying.'],
					['o', 'The other side was another desk: {bDesk} was selling {sym} through the same firm identifier at the same moment. The venue won’t let the firm trade with itself, so it cancelled the resting order.'],
					['b', 'That’ll be our rebalance. We had {sym} to sell this afternoon.'],
					['L', 'That is the venue protecting us from wash trades, and it’s doing what it should. The desks need to talk to each other, not us.']
				],
				ends: [[['r', 'We’ll cross it internally with them instead.'], ['o', 'Nothing wrong in the router. Closing.']], [['b', 'We’ll warn the desk channel when we have a big sell list.'], ['o', 'Good. Nothing for us.']]]
			},
			{
				turn: [
					['r', 'Self-match with whom?'],
					['o', 'With yourselves: {tool} sent a sell in {sym} at {time0} that would have crossed your own resting buy. The same algorithm sent both.'],
					['t', 'The algo’s rebalancing leg and its hedging leg don’t know about each other. One buys while the other sells. It should net them first.'],
					['r', 'So we’ve been paying fees to cancel our own orders.']
				],
				ends: [[['t', 'Netting fix next week; until then the hedging leg waits for the other to finish.'], ['o', 'Handed to desk tools.']], [['t', 'Taken; it’s on our board.'], ['o', 'Nothing in the router.']]]
			}
		]
	},
	{
		titles: ['Unknown connections to the router port', 'Security question about {hostShort}', 'Who is connecting to the router from {ip}?', 'Scan alert on the router hosts'],
		opener: 'compliance',
		when: [560, 900],
		open: ['Security asked me to pass this on: their monitoring shows connections to the router’s order port on {hostShort} from {ip}, an address that isn’t on the list of desk machines. Can the router team say what it is?'],
		ack: ['Looking at what that address sent.', 'Checking the router’s side.'],
		look: [[['o', 'Every connection from that address fails to decode and is dropped. Nothing from it was ever routed:', 'decode'], ['L', 'So whatever it is, it didn’t place orders. Who owns {ip}?']]],
		paths: [
			{
				turn: [
					['p', '{ip} is security’s own scanner. They added the router hosts to the weekly scan last week and didn’t tell anyone.'],
					['o', 'That explains the probes: short messages that the router can’t read, every few seconds, then nothing.'],
					['c', 'I’ll tell security it’s their scanner. They may want to keep scanning; is that a problem?'],
					['o', 'Not for the routing, but it fills the log with decode errors. Outside trading hours would be kinder.']
				],
				ends: [[['c', 'Security will move the scan to Saturday mornings.'], ['o', 'Thanks. Nothing for the router.']], [['c', 'Passed on.'], ['L', 'Fine by us. Closing.']]]
			},
			{
				turn: [
					['t', '{ip} is a test box of ours. Someone pointed a load test at the production router by mistake instead of UAT.'],
					['o', 'It never got an order through: every message was malformed. But it shouldn’t be able to reach production at all.'],
					['p', 'The test range was allowed to the router hosts by an old rule. Removing it.']
				],
				ends: [[['p', 'Rule removed; that range can only reach UAT now.'], ['t', 'And the load test points at UAT.'], ['o', 'Platform closed the gap. Nothing changed in the router.']], [['p', 'Removed the rule.'], ['c', 'I’ll let security know it was internal and is closed.']]]
			}
		],
		prep: (c) => {
			c.v.ip = `10.${pick(c.r, [52, 60, 77])}.${int(c.r, 2, 30)}.${int(c.r, 2, 250)}`;
		}
	},
	{
		titles: ['Basket sent twice?', 'Duplicate basket from {tool}', 'Did we just send everything twice?', 'Double orders in {dep}'],
		quiet: true,
		opener: 'desk',
		desks: ['program', 'indexarb'],
		impact: true,
		when: [590, 930],
		open: ['I think I just sent the same basket twice from {tool}. Can you see whether the router got it twice? I need to know what to cancel, fast.', 'Help: it looks like our {n2}-line basket went out twice. Can you confirm from the router side?'],
		ack: ['Looking now. Cancel from {tool} as soon as you know which; the router can’t cancel for you.', 'Checking. Start cancelling the second set in {tool} if you can see it.'],
		look: [[['o', ['Two sets of the same names went through, about a minute apart:', 'I see two sets of orders in the same names, a minute or so apart:'], 'route:twice'], ['r', 'Cancelling the second set now.']]],
		paths: [
			{
				turn: [
					['o', 'The second set is still mostly working; a few lines filled before you got to them.'],
					['r', 'All cancelled. {n1} lines filled twice, and we’re trading out of those.'],
					['r', 'I pressed send, nothing seemed to happen, so I pressed it again.'],
					['t', '{tool} shows nothing until every line is acknowledged, which takes a few seconds for a basket that size. It should show progress and refuse a second send of the same basket.']
				],
				ends: [[['t', 'Duplicate check and a progress bar are on our board for the next release.'], ['o', 'Handed to desk tools. The router did as it was asked, twice.']], [['k', 'I need the list of double fills for the risk report.'], ['r', 'Sending it now.'], ['t', 'Duplicate-send check is in {tool} from {tomorrow}.']]]
			},
			{
				impact: false,
				turn: [
					['o', 'Look closer: the second set isn’t the same basket. Same names, but different quantities. Is it the next tranche?'],
					['r', 'Oh. {q} sent the second tranche from his screen without telling me.'],
					['q', 'I did, as planned. Sorry, I should have said in the desk channel.']
				],
				ends: [[['r', 'Nothing to cancel, then. I’ll put back what I cancelled.'], ['o', 'Nothing wrong anywhere. Closing.']], [['r', 'False alarm. Thanks for the quick look.'], ['o', 'No problem.']]]
			}
		],
		prep: (c, path) => {
			c.x.tranche = path === 1;
		}
	}
);

// Small matters raised on the way, answered in the on-call engineer's next message.
const asides: [string, string, boolean?][] = [
	['Unrelated, but is UAT up this afternoon? We’d like to try something after the close.', 'UAT is up and takes test orders, so go ahead after the close.'],
	['While I have you: who has the pager next week?', '{next}, from Monday morning.'],
	['Separate thing: can I get read access to the router logs myself?', 'That goes through the platform access form. Put {L} down as the approver.'],
	['Did release notes go out for 1.8.0? I never saw any.', 'They went to router-announce on 14 September. I’ll add you to the list.'],
	['Small thing: the router sessions board takes forever to load at the open.', 'Known. Platform are moving the dashboards to a new host this month.'],
	['Is there a way for us to see our own settings without asking you?', 'Not yet; the files live on the router hosts. Ask here and whoever is on call will paste them.'],
	['Also, our desk sheet still lists {prev} as the router contact.', 'The contact changes every week with the rota; #router-oncall always reaches whoever has the pager.', true],
	['Different topic: could we get a weekly list of our rejects?', 'Market operations already send one on Mondays. I’ll ask {m} to add you.', true],
	['One more: when is the next router release?', 'Nothing is scheduled yet. {L} posts dates in router-announce when there is one.'],
	['Our new joiner starts Monday. Does she need anything from you to use {tool}?', 'Nothing from the router team; desk tools set up {tool} logins.', true],
	['Are the times in the router log New York time?', 'Yes, Eastern, to the millisecond.']
];
const checkIns: [string, string][] = [
	['Need a hand?', 'All good for now, thanks.'],
	['Shout if you want another pair of eyes.', 'Will do.'],
	['I’m around if you need me.', 'Thanks, I think I have it.']
];
const bystanderAsks = ['Are we affected? {bTool} looks normal, but the desk is nervous.', 'Anything we should worry about on {bDesk}?', 'Seeing this from {bDesk}: is it just {dep}?'];
const bystanderWide = ['Possibly. Anything going through {sess} could have been held for a moment; check {bTool} for orders showing as pending.', 'It touches anything on {hostShort}, so maybe. Nothing was lost; refresh {bTool} if anything looks stuck.'];
const bystanderNarrow = ['No, this is only {dep}. {bDep} is routing normally.', 'Only {dep}. You’re fine.', 'Not you: {bDep} hasn’t seen anything unusual.'];
const statusUpdates = ['Update for anyone watching: we know what this is now; details above.', 'For the channel: cause found, see above. I’ll post again when it’s closed.', 'Quick update: no other desk needs to do anything about this.'];
const impactAsk: Msg[] = [['m', ['For the daily report: how many orders did this touch?', 'Can I have numbers for the ops report? Orders affected, by desk.']], ['o', ['Here is what I count for the window:', 'From the logs:'], 'impact'], ['m', ['Thanks, it’s in the report.', 'Got it, thanks.']]];
const blotterIntro = ['My screen for the last half hour:', 'Here’s what {tool} shows me:', 'From the blotter:'];
const pings: [string, string][] = [
	['Any news?', 'Still on it; I’ll post as soon as I know more.'],
	['Anything yet? I have people asking.', 'Close. Give me five minutes.'],
	['Still looking?', 'Yes, getting there.']
];
const thanks = ['Thanks for looking.', 'Appreciated, thanks.', 'Thanks for the quick replies.', 'Cheers.'];
const exchangeIntro = ['The exchange’s connectivity desk replied:', 'Reply from the exchange:', 'The exchange came back:'];

// Separate matters someone brings into the thread while it is open. Each settles itself within a few messages.
interface Side {
	msgs: Msg[];
	/** Shows the deployment's real settings file, so it can't sit beside a topic that shows another one. */
	settings?: boolean;
	/** Asks about a production deployment's own orders, so it doesn't fit UAT. */
	live?: boolean;
}
const sides: Side[] = [
	{ live: true, msgs: [['r', 'Separate thing while you’re in the logs: {client} is asking about yesterday’s order {id2} in {sym2}. Could you pull its route?'], ['o', 'Here it is:', 'history'], ['r', 'Perfect, that’s what they wanted.']] },
	{ live: true, msgs: [['c', 'Unrelated, but could someone send me yesterday’s rejects by reason for {dep}? It’s for the monthly review.'], ['o', 'Here you are:', 'reasons'], ['c', 'Thank you, that’s all I need.']] },
	{ msgs: [['p', 'Unrelated: we need to reboot {otherHost} for patches next week. Is any day better than another?'], ['o', 'After the close on Thursday is best. Please not on a rebalance day.'], ['p', 'Booked for Thursday at 17:30.']] },
	{ settings: true, msgs: [['m', 'While you’re on: can you confirm the {dep} limit is still {limit}? Our risk sheet says so and I’m checking it for the audit.'], ['o', 'Still {limit}:', 'settings'], ['m', 'Matches, thanks.']] },
	{ msgs: [['n', 'Heads-up for whoever is on call: the second cross-connect in NY4 has planned maintenance on Saturday from 02:00 to 04:00.'], ['o', 'Noted. Nothing trades then, so no action from us.']] },
	{ msgs: [['t', 'Not urgent: we’re releasing {tool} on Friday evening. Is anything changing on the router that we should know about?'], ['o', 'Nothing. There has been no router release since 1.8.0 in September.'], ['t', 'Great, thanks.']] },
	{ live: true, msgs: [['k', 'Quick one for the risk pack: what did the {dep} deployment refuse yesterday, and why?'], ['o', 'Yesterday’s rejects by reason, router and venue together:', 'reasons'], ['k', 'Fine, nothing there I need to explain.']] },
	{ msgs: [['w', 'Heads-up: the simulator gets an upgrade next Tuesday evening, so test orders on UAT will hang for about an hour.'], ['o', 'Thanks. I’ll mention it in router-announce.']] },
	{ msgs: [['m', 'Do we need to set anything up on the router for the half day after Thanksgiving?'], ['o', 'No. The router doesn’t know about market hours; the venue refuses orders once it closes. Nothing to configure.'], ['m', 'Good, one less thing.']] },
	{ live: true, msgs: [['c', 'Please keep the {dep} logs for {dateLast}: we have a regulatory inquiry about a client’s orders that day.'], ['o', 'Copied that day’s log to the retention share.'], ['c', 'Thank you.']] },
	{ msgs: [['p', 'Heads-up: we rotate the SSH host keys on the router hosts tomorrow, so expect a warning the first time you log in.'], ['o', 'Thanks for the warning.']] },
	{ msgs: [['r', 'While I have you: how do I read the router log lines? I keep being sent extracts and only half understand them.'], ['o', 'Time, host, deployment and level, then what happened: “routed” with the order id, symbol, side, quantity and limit price, and where it went, or “rejected” with the reason. Venue replies are separate lines with the session name.'], ['r', 'That helps, thanks.']] },
	{ msgs: [['L', 'When you have a moment, put this one in the weekly on-call notes.'], ['o', 'Will do.']] },
	{ msgs: [['b', 'Sorry to jump in: has anyone else seen {bTool} logging people out at lunchtime?'], ['o', 'Not that I know of. That sounds like one for desk tools; {t} is in here.'], ['t', 'Yes, a session timeout we changed last week. Putting it back tonight.']] },
	{ msgs: [['c', 'Reminder that the annual access review for the router hosts is due on Friday.'], ['o', 'Thanks. {L} has it in hand; I’ll make sure the on-call list is current.']] },
	{ msgs: [['L', 'Has anyone written up last week’s escalations for the monthly report?'], ['o', 'Not yet. I’ll do it this afternoon once this one is settled.']] },
	{ settings: true, msgs: [['k', 'While I think of it: can you send me the current limits for every deployment? The risk committee asks each quarter.'], ['o', 'program 50,000; cash 50,000; ETF 250,000; index arbitrage 50,000; options hedging 20,000. UAT runs on the default of 50,000.'], ['k', 'Thanks, same as last quarter.']] },
	{ msgs: [['t', 'Does anyone use the UAT logins at weekends? We want to reset them on Saturday.'], ['o', 'Not that I know of. Ask in #uat to be sure, since the simulator team sometimes test then.'], ['t', 'Will do.']] },
	{ live: true, msgs: [['m', 'Monthly question: can you send the {dep} order count for last month?'], ['o', 'About {monthCount} orders routed, and {monthRejects} refused by the router itself.'], ['m', 'Thanks.']] }
];

interface Plan {
	topic: Topic;
	path: number;
	day: number;
}

const escalation = (index: number, plan: Plan, number: number): string => {
	const r = mulberry32(48_611 + index * 7_919);
	const { topic } = plan;
	const path = topic.paths[plan.path]!;
	const deskKey = pick(r, path.desk ?? topic.desks ?? liveDesks);
	const desk = desks.find((d) => d.key === deskKey)!;
	const uat = path.uat ?? topic.uat ?? false;
	const dep = uat ? 'uat' : desk.key;
	const host = uat ? 'rtr-uat' : desk.host;
	let day = plan.day;
	if (topic.saturday) {
		while (at(day).getUTCDay() !== 6) day += DAY;
		if (day > LAST) day -= 7 * DAY;
	}
	const start = day + int(r, topic.when[0], topic.when[1]) * MIN + int(r, 0, 59) * 1000;
	const universe = desk.key === 'etf' ? etfs : stocks;
	const [sym, sym2] = shuffle(r, universe);
	const reporter = pick(r, desk.traders);
	const second = pick(r, desk.traders.filter((name) => name !== reporter));
	const otherKey = pick(r, liveDesks.filter((key) => key !== desk.key));
	const otherDesk = desks.find((d) => d.key === otherKey)!;
	const bystander = pick(r, otherDesk.traders);
	const tools = pick(r, toolsDevs);
	const platform = pick(r, platformEngineers);
	const ops = pick(r, opsAnalysts);
	const limit = uat ? 50000 : desk.limit;
	const venue = desk.venue;
	const sessions = sessionsOf[host]!.filter((s) => uat || s.startsWith(venue));
	const c: Ctx = { r, v: {}, desk, dep, host, venue, limit, universe, sym: sym!, sym2: sym2!, idBase: int(r, 4_100_000, 9_800_000), start, x: { wide: topic.wide } };
	const monthCount = int(r, 180, 900) * 1000 + int(r, 0, 999);
	const t0 = start - int(r, 2, 9) * MIN - int(r, 0, 59) * 1000;
	c.x.t0 = t0;
	c.v = {
		R: reporter, r: firstName(reporter), Q: second, q: firstName(second), desk: desk.name, tool: desk.tool, dep, host: `${host}.ny4`, hostShort: host,
		otherHost: host === 'rtr-a' ? 'rtr-b' : 'rtr-a', venue, sess: pick(r, sessions), limit: group(limit), limitMinus: group(limit - 1), limitPlus: group(limit + 1),
		limitK: `${limit / 1000}K`, sym: sym![0], sym2: sym2![0], qty: group(lot(r)), id: String(c.idBase + int(r, 3, 400)), id2: String(c.idBase - int(r, 20000, 90000)),
		L: firstName(lead), t: firstName(tools), p: firstName(platform), m: firstName(ops), next: firstName(onCall(start + 7 * DAY)), prev: firstName(onCall(start - 7 * DAY)),
		n1: String(int(r, 3, 6)), n2: String(int(r, 40, 180)), n3: String(int(r, 150, 900)), ip: `10.41.${int(r, 2, 30)}.${int(r, 2, 250)}`, gw: `GW-NY4-${pad(int(r, 1, 18))}`,
		tix: `DT-${int(r, 1200, 1900)}`, time0: hm(t0), lastWeekday: weekday(weekdayBefore(start, int(r, 1, 3))), dateLast: dayMonth(weekdayBefore(start, 1)),
		dateFrom: dayMonth(weekdayBefore(start, int(r, 3, 6))), pct: String(int(r, 4, 12)), noticeDate: dayMonth(start - int(r, 20, 40) * DAY), client: pick(r, clients),
		bDesk: `the ${otherDesk.name} desk`, bTool: otherDesk.tool, bDep: otherDesk.key, monthCount: group(monthCount), monthRejects: String(int(r, 3, 90))
	};
	topic.prep?.(c, plan.path);

	const people: Record<Exclude<Who, '~' | 'o' | 'x'>, string> = {
		r: `${reporter} (${desk.name})`,
		q: `${second} (${desk.name})`,
		b: `${bystander} (${otherDesk.name})`,
		L: `${lead} (router lead)`,
		t: `${tools} (desk tools)`,
		p: `${platform} (platform)`,
		n: 'Andre Duval (network)',
		m: `${ops} (market operations)`,
		c: 'Natalia Okafor (compliance)',
		k: 'Gideon Pryce (risk)',
		d: 'Felix Brandt (market data)',
		w: 'Wren Castillo (simulator)'
	};
	const gaps: Record<string, [number, number]> = { r: [1, 6], q: [1, 8], b: [1, 5], o: [1, 7], L: [3, 40], t: [3, 30], p: [4, 35], n: [5, 40], m: [5, 50], c: [10, 90], k: [3, 20], d: [3, 20], w: [3, 25], x: [20, 90] };
	const out: string[] = [];
	let t = start;
	let pendingAnswer = '';
	const fill = (text: string) =>
		text.replace(/\{(\w+)\}/g, (_, key: string) => {
			if (key === 'time') return hm(t);
			if (key === 'tomorrow') return weekday(addWeekdays(t, 1));
			const value = c.v[key];
			if (value === undefined) throw new Error(`no value for {${key}} in: ${text}`);
			return value;
		});
	const onCallLabel = () => `${onCall(t)} (router on call)`;
	const say = (who: Who, body: string | readonly string[], paste?: string, gap = true) => {
		if (who === '~') {
			t = addWeekdays(t, Number(body)) + int(r, 490, 650) * MIN + int(r, 0, 59) * 1000;
			c.v.o = firstName(onCall(t));
			out.push(`### ${weekday(t)} ${dayMonth(t)}`);
			return;
		}
		if (gap) {
			const [low, high] = gaps[who]!;
			const step = int(r, low, high);
			t += minuteOfDay(t) + step > 1290 ? MIN : step * MIN;
			t += int(r, 0, 59) * 1000 - (t % MIN);
		}
		let text = fill(typeof body === 'string' ? body : pick(r, body));
		if (who === 'o' && pendingAnswer) {
			text = text ? `${fill(pendingAnswer)}\n\n${text}` : fill(pendingAnswer);
			pendingAnswer = '';
		}
		const label = who === 'o' || who === 'x' ? onCallLabel() : people[who];
		if (who === 'x') text = `${pick(r, exchangeIntro)}\n\n> ${text}`;
		const block = [`**${hm(t)} · ${label}:**${text ? ` ${text}` : ''}`];
		if (paste) block.push(pastes[paste]!(c, t));
		out.push(block.join('\n\n'));
	};
	const run = (msgs: readonly Msg[]) => {
		for (const [who, body, paste] of msgs) say(who, body, paste);
	};

	c.v.o = firstName(onCall(start));
	// 1. The opening.
	let openText = fill(pick(r, topic.open));
	if (topic.opener === 'desk' && r() < 0.6) openText += ` ${fill(pick(r, desk.context))}`;
	c.x.blotterStatus = topic.blotter;
	if (topic.blotter !== undefined && r() < 0.7) openText += `\n\n${fill(pick(r, blotterIntro))}\n\n${blotter(c, t)}`;
	let opener = '';
	if (topic.opener === 'pager') {
		opener = 'the pager';
		out.push(`**${hm(t)} · Pager:** ${openText}\n\n${alertBlock(c, t)}`);
	} else {
		const who: Who = topic.opener === 'desk' ? 'r' : topic.opener === 'tools' ? 't' : topic.opener === 'ops' ? 'm' : topic.opener === 'compliance' ? 'c' : topic.opener === 'platform' ? 'p' : 'o';
		opener = who === 'o' ? onCallLabel() : people[who];
		say(who, openText, undefined, false);
	}
	const asker: Who = topic.opener === 'desk' ? 'r' : topic.opener === 'tools' ? 't' : topic.opener === 'ops' ? 'm' : topic.opener === 'compliance' ? 'c' : topic.opener === 'platform' ? 'p' : 'q';

	// 2. The on-call engineer picks it up, and the lead may check in.
	const ackText = pick(r, topic.ack);
	if (ackText) say('o', ackText);
	if (r() < 0.25) {
		const [ask, answer] = pick(r, checkIns);
		say('L', ask);
		say('o', answer);
	}

	// 3. The first look; someone from another desk may ask whether they are touched; a small matter on the way.
	run(pick(r, topic.look));
	if (!uat && !topic.quiet && (topic.wide || topic.opener === 'desk' || topic.opener === 'pager') && r() < (topic.wide ? 0.6 : 0.25)) {
		say('b', pick(r, bystanderAsks));
		say('o', pick(r, topic.wide ? bystanderWide : bystanderNarrow));
	}
	if (r() < 0.55) {
		const [question, answer] = pick(r, asides.filter(([q, , deskOnly]) => !(q.includes('UAT') && (uat || topic.titles[0]!.includes('Test orders'))) && !(deskOnly && asker !== 'r')));
		say(asker, question);
		pendingAnswer = answer;
	}

	if ((topic.opener === 'desk' || topic.opener === 'tools') && r() < 0.3) {
		const [ask, answer] = pick(r, pings);
		say(asker, ask);
		say('o', answer);
	}

	// 4. What it turns out to be. Meanwhile someone may bring a separate matter, and operations may want numbers.
	run(path.turn);
	if (r() < 0.3) say('o', pick(r, statusUpdates));
	const fits = shuffle(r, sides.filter((side) => !(side.settings && (c.x.settings || uat)) && !(side.live && uat)));
	if (r() < 0.9) run(fits[0]!.msgs);
	if (r() < 0.45) run(fits[1]!.msgs);
	if ((path.impact ?? topic.impact) && r() < 0.8) run(impactAsk);

	// 5. How it ends.
	run(pick(r, path.ends));
	if (pendingAnswer) say('o', '');
	if (topic.opener !== 'pager' && topic.opener !== 'self' && r() < 0.35) say(asker, pick(r, thanks));

	const title = fill(pick(r, topic.titles));
	const header = `# ESC-${number}: ${title}\n\nOpened in #router-oncall on ${weekday(start)} ${dayMonth(start)} 2026 at ${hm(start)} ET by ${opener}. On call: ${onCall(start)}.`;
	return [header, ...out].join('\n\n') + '\n';
};

// Which topic and path each escalation follows: topics are dealt in rounds, each round in a new order, and the paths
// of a topic in turn, so that two escalations on one topic end differently until its paths run out.
const order = mulberry32(20_260_915);
const plans: Plan[] = [];
const used = new Map<Topic, number>();
let deck: Topic[] = [];
for (let index = 0; index < ITEMS; index++) {
	if (deck.length === 0) deck = shuffle(order, topics);
	const topic = deck.pop()!;
	const seen = used.get(topic) ?? 0;
	used.set(topic, seen + 1);
	const day = tradingDays[Math.floor((index * tradingDays.length) / ITEMS)]!;
	plans.push({ topic, path: (seen + topics.indexOf(topic)) % topic.paths.length, day });
}

const folder = join(root, 'docs', 'oncall');
mkdirSync(folder, { recursive: true });
let number = 4100;
plans.forEach((plan, index) => {
	number += int(order, 1, 4);
	writeFileSync(join(folder, `esc-${number}.md`), escalation(index, plan, number));
});
writeFileSync(
	join(folder, 'README.md'),
	`# Router on-call escalations, 15 September to 13 November 2026\n\nThe ${ITEMS} escalations that larkspur-router's on-call engineer took in #router-oncall in these weeks, one file\neach, exported from the incident tool before the rota changes hands. The export kept the messages, the pasted\noutput and who was on call, but not the severity, cause and resolution fields, which were mostly left empty.\nTimes are New York time.\n`
);
