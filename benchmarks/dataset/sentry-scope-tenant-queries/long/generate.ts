// Writes the long material of this entry's long task: the support tickets that Beacon support passed to the
// beacon-api team between 3 August and 30 October 2026, one Markdown file each, under support/escalations/.
// Deterministic: fixed seeds, no clock, no network.
//   bun long/generate.ts <workspace root>
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** How many tickets to write. Everything else is derived from it. */
const ITEMS = 293;

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
	const out = [...items];
	for (let i = out.length - 1; i > 0; i--) {
		const j = Math.floor(r() * (i + 1));
		[out[i], out[j]] = [out[j]!, out[i]!];
	}
	return out;
};
const pad = (value: number, width = 2) => String(value).padStart(width, '0');
const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);
const fmt = (value: number) => String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const hex = (r: Rand, length: number) => Array.from({ length }, () => '0123456789abcdef'[int(r, 0, 15)]).join('');

// ---------------------------------------------------------------------------------------------------------
// Dates. Everything happens in 2026, before the export on 16 November.
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WDL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const utc = (ms: number) => new Date(ms);
const stamp = (ms: number) => {
	const d = utc(ms);
	return `${WD[d.getUTCDay()]} ${d.getUTCDate()} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
};
const clock = (ms: number) => `${pad(utc(ms).getUTCHours())}:${pad(utc(ms).getUTCMinutes())}`;
const dayMonth = (ms: number) => `${utc(ms).getUTCDate()} ${MONL[utc(ms).getUTCMonth()]}`;
const fullDay = (ms: number) => `${WDL[utc(ms).getUTCDay()]} ${dayMonth(ms)}`;
const ymd = (ms: number) => `${utc(ms).getUTCFullYear()}-${pad(utc(ms).getUTCMonth() + 1)}-${pad(utc(ms).getUTCDate())}`;
const isoMicro = (r: Rand, ms: number) => `${ymd(ms)}T${clock(ms)}:${pad(utc(ms).getUTCSeconds())}.${pad(int(r, 1, 999999), 6)}+00:00`;
const isoZ = (ms: number) => `${ymd(ms)}T${clock(ms)}:${pad(utc(ms).getUTCSeconds())}Z`;
const httpDate = (ms: number) => {
	const d = utc(ms);
	return `${WD[d.getUTCDay()]}, ${pad(d.getUTCDate())} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()} ${clock(ms)}:${pad(d.getUTCSeconds())} GMT`;
};
const midnight = (ms: number) => ms - (ms % DAY);
const FIRST_DAY = Date.UTC(2026, 7, 3);
const LAST_DAY = Date.UTC(2026, 9, 30);
const EXPORT = Date.UTC(2026, 10, 16);
/** beacon-api 0.4.0: the alerts list, and slugs made from the name. */
const RELEASE = Date.UTC(2026, 8, 15, 9, 40);
const TLS_CUTOFF = Date.UTC(2026, 8, 1);
const CLOCKS_BACK = Date.UTC(2026, 9, 25);
const openDays: number[] = [];
for (let day = FIRST_DAY; day <= LAST_DAY; day += DAY) if (utc(day).getUTCDay() !== 0) openDays.push(day);

// ---------------------------------------------------------------------------------------------------------
// People and places.
const firstNames = ['Ruth', 'Imani', 'Sofia', 'Helen', 'Priya', 'Agnes', 'Mei', 'Clara', 'Tanvi', 'Joanna', 'Esther', 'Leonie', 'Grainne', 'Adaeze', 'Marta', 'Fiona', 'Noor', 'Beatriz', 'Kirsty', 'Hana', 'Dorota', 'Ayesha', 'Daniel', 'Tariq', 'Mateo', 'Graham', 'Ifeanyi', 'Lukas', 'Sanjay', 'Ross', 'Viktor', 'Aled', 'Jonah', 'Rafael', 'Neil', 'Kwabena', 'Pavel', 'Omar', 'Benedict', 'Hiro', 'Stuart', 'Emeka', 'Callan', 'Anton', 'Linnea', 'Yusra', 'Tomasz', 'Eliska'];
const surnames = ['Okafor', 'Lindgren', 'Ashworth', 'Mbeki', 'Fairclough', 'Rasmussen', 'Doyle', 'Varga', 'Kapoor', 'Hollis', 'Ferreira', 'Quinlan', 'Ahmadi', 'Sutherland', 'Novak', 'Pemberton', 'Adeyemi', 'Carrick', 'Matsuda', 'Bellamy', 'Oduya', 'Szabo', 'Rourke', 'Gallagher', 'Wainwright', 'Nwosu', 'Eklund', 'Prescott', 'Haddad', 'Moreau', 'Kowalczyk', 'Brennan'];
const heads = ['Kestrel', 'Larkspur', 'Tidewater', 'Copperline', 'Northgate', 'Bluefin', 'Saltmarsh', 'Ironbark', 'Fernhill', 'Quayside', 'Redwing', 'Silverbirch', 'Ashcombe', 'Brightwater', 'Hollowell', 'Juniper', 'Moorfield', 'Oakhurst', 'Pinecrest', 'Stonebridge', 'Westerly', 'Marigold', 'Thornbury', 'Elmstead', 'Gannet', 'Halyard'];
const tails = ['Freight', 'Health', 'Pay', 'Labs', 'Travel', 'Learning', 'Energy', 'Logistics', 'Retail', 'Ticketing', 'Insurance', 'Robotics', 'Analytics', 'Games', 'Foods', 'Property', 'Media', 'Mobility', 'Clinics', 'Software', 'Lettings', 'Rail'];
const titles = ['Platform engineer', 'Backend developer', 'Site reliability engineer', 'Engineering manager', 'CTO', 'DevOps lead', 'Lead developer', 'Head of engineering', 'Full-stack developer', 'Infrastructure engineer', 'QA lead', 'Mobile developer', 'Technical lead', 'Operations engineer'];
const agents = ['Nadia', 'Kwame', 'Lotte', 'Rhys', 'Paloma', 'Jun', 'Moira', 'Tobias'];
const engineers = ['Ines', 'Callum', 'Devika', 'Mattias'];
type TeamKey = 'pipeline' | 'uptime' | 'web' | 'notify' | 'billing' | 'sdk';
const teams: Record<TeamKey, [string, string]> = {
	pipeline: ['the pipeline team', 'Bogdan'],
	uptime: ['the uptime team', 'Saoirse'],
	web: ['the web app team', 'Arjun'],
	notify: ['the notifications team', 'Femi'],
	billing: ['the billing team', 'Helga'],
	sdk: ['the SDK team', 'Yusuf']
};
const projectBases = ['Web app', 'Checkout', 'Payments API', 'iOS app', 'Android app', 'Marketing site', 'Admin portal', 'Booking engine', 'Public API', 'Search service', 'Notifications worker', 'Data pipeline', 'Warehouse scanner', 'Driver app', 'Partner portal', 'Billing service', 'Reporting', 'Mobile backend', 'Inventory sync', 'Kiosk', 'Help centre', 'Pricing engine', 'Media uploads', 'Order service', 'Scheduler', 'Customer portal', 'Email sender', 'Image resizer', 'Recommendations', 'Timetable feed', 'Loyalty', 'Gateway'];
const qualifiers = ['', ' EU', ' US', ' v2', ' legacy', ' worker', ' beta', ' internal'];
const lowerNames = ['iOS widget', 'eCommerce', 'iPad kiosk', 'macOS agent', 'webhooks relay', 'admin tools', 'cron jobs', 'tvOS app'];
const punctNames = ['Acme & Co. Shop', "Partners' Portal", 'Checkout (EU)', 'Web / Mobile API', 'R&D Tools', 'Q4 Campaign: Landing', 'Ops - Night Shift', 'Shop.com Mirror', 'Click & Collect', 'Returns (new!)'];
const accentNames: [string, string, string][] = [
	['Zürich Kiosk', 'Zürich', 'German'],
	['Café Bookings', 'Lyon', 'French'],
	['Ålesund Ferries', 'Ålesund', 'Norwegian'],
	['Kraków Office', 'Kraków', 'Polish'],
	['Düsseldorf Ops', 'Düsseldorf', 'German'],
	['São Paulo Checkout', 'São Paulo', 'Portuguese'],
	['Göteborg Scanner', 'Göteborg', 'Swedish'],
	['Señal App', 'Valencia', 'Spanish'],
	['Malmö Depot', 'Malmö', 'Swedish'],
	['Crème Rewards', 'Montréal', 'French']
];
const alertNames = ['Error spike', '5xx rate', 'Checkout failures', 'Slow p95', 'New issue in release', 'Payment timeouts', 'Queue backlog', 'Login errors', 'Fatal errors', 'Worker crashes', 'Upload failures', 'Search errors'];
const regionsChecked = ['Frankfurt', 'London', 'Virginia', 'Oregon', 'Singapore', 'Sydney'];
const zones = ['Europe/London', 'Europe/Berlin', 'Europe/Amsterdam', 'Europe/Dublin', 'Europe/Madrid', 'Europe/Stockholm'];
const jobs = ['invoice-export', 'stock-sync', 'nightly-rollup', 'feed-import', 'reindex', 'payout-batch', 'report-mailer', 'backfill-prices'];
const channels = ['alerts', 'ops-alerts', 'oncall', 'incidents', 'eng-alerts', 'beacon'];
const devices = ['kiosk tablet', 'handheld scanner', 'in-store till', 'van tablet', 'ticket machine'];
const dashboardsNames = ['Engineering overview', 'Release health', 'Office screen', 'Checkout errors', 'Ops weekly', 'Mobile crashes', 'On-call'];
const widgetNames = ['Errors by release', 'Events per hour', 'Crash-free sessions', 'Top issues', 'Errors by environment', 'Slowest endpoints'];
const javaVersions = ['Java 7 (1.7.0_80)', 'Java 7 (1.7.0_95)', 'Java 7 (1.7.0_121)'];
const loggers = ['app.errors', 'checkout', 'root', 'api.views', 'worker.tasks'];
const wrappers: [string, string][] = [['raise_for_upstream', 'app/utils/upstream.py'], ['fail', 'lib/errors.py'], ['report_and_raise', 'core/errors.py'], ['check_response', 'app/http/helpers.py']];
const nightMessages = ['Skipped record: missing SKU', 'Row rejected: price is empty', 'Could not match supplier code', 'Skipping order with no lines', 'Duplicate row ignored'];
const plans = [['Team', 2_000_000, 129, 1000], ['Business', 10_000_000, 499, 5000]] as const;
const currencies = [['$', 'US dollars'], ['€', 'euros'], ['£', 'pounds']] as const;

/** The API's slugs, made as beacon-api makes them. */
const slugify = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '-');
/** The slug a person would expect. */
const tidySlug = (name: string) =>
	name
		.normalize('NFKD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
const API = 'https://beacon.harbourlight.example';
const MAIL = 'beacon.harbourlight.example';

// ---------------------------------------------------------------------------------------------------------
// Types.
type Area = 'events' | 'alerts' | 'uptime checks' | 'dashboards' | 'projects and the API' | 'account and billing';
type Outcome = 'answered' | 'waiting' | 'team' | 'owe' | 'request' | 'released';
type Slots = Record<string, string>;
interface Proj {
	id: number;
	name: string;
	slug: string;
	created: number;
	iso: string;
	platform: string;
	events: number;
}
interface AlertRow {
	id: number;
	projectId: number;
	name: string;
	threshold: number;
	muted: boolean;
}
interface Ctx {
	projects: Proj[];
	alerts: AlertRow[];
	/** The time of the message the output is pasted into. */
	now: number;
	/** The main topic's id when the ticket ends with another team, else empty. */
	teamFor: string;
}
type Art = (r: Rand, s: Slots, x: Ctx) => string;

// ---------------------------------------------------------------------------------------------------------
// Pasted output.
const fence = (lines: string[], lang = '') => ['```' + lang, ...lines, '```'].join('\n');
const table = (head: string[], rows: string[][]) =>
	[`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`, ...rows.map((row) => `| ${row.join(' | ')} |`)].join('\n');
const indent = (text: string, by: string) => text.split('\n').map((line) => by + line).join('\n');
const cut = <T>(items: T[], head: number, tail: number): (T | null)[] => (items.length <= head + tail + 1 ? items : [...items.slice(0, head), null, ...items.slice(-tail)]);
const listJson = (items: (object | null)[], by: string) => {
	const parts = items.map((item) => (item === null ? `${by}...` : indent(JSON.stringify(item, null, 2), by)));
	return parts.map((part, i) => (i < parts.length - 1 && items[i] !== null ? `${part},` : part)).join('\n');
};
const pagesOf = (total: number, perPage: number) => Math.floor(total / perPage) + 1;
const pageJson = (items: (object | null)[], page: number, perPage: number, total: number) =>
	`{\n  "results": ${items.length ? `[\n${listJson(items, '    ')}\n  ]` : '[]'},\n  "page": ${page},\n  "per_page": ${perPage},\n  "pages": ${pagesOf(total, perPage)},\n  "total": ${total}\n}`;
const projectJson = (p: Proj) => ({ id: p.id, slug: p.slug, name: p.name, created_at: p.iso });
const byName = (x: Ctx) => [...x.projects].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
const isoMs = (ms: number) => `${ymd(ms)}T${clock(ms)}:${pad(utc(ms).getUTCSeconds())}.${pad(ms % 1000, 3)}Z`;
const logTime = (ms: number) => `${ymd(ms)} ${clock(ms)}:${pad(utc(ms).getUTCSeconds())},${pad(ms % 1000, 3)}`;
const orgPath = (s: Slots, path: string) => `${API}/api/organizations/${s.org}${path}`;
const excs: [string, string, string, string][] = [
	['KeyError', "'currency'", 'app/payments/quote.py', 'rate = rates[payload["currency"]]'],
	['TimeoutError', 'upstream did not answer within 10s', 'app/clients/stock.py', 'return self._call("GET", f"/levels/{sku}")'],
	['ValueError', "invalid literal for int() with base 10: ''", 'app/forms/booking.py', 'seats = int(form["seats"])'],
	['ConnectionError', 'Connection refused', 'app/clients/mailer.py', 'self.smtp.send_message(message)'],
	['ZeroDivisionError', 'division by zero', 'app/reports/margins.py', 'margin = (price - cost) / price'],
	['JSONDecodeError', 'Expecting value: line 1 column 1 (char 0)', 'app/clients/carrier.py', 'return response.json()']
];
const created = (r: Rand, s: Slots, x: Ctx, name: string, body: string, id = Number(s.newId)): string => {
	const at = x.now - int(r, 20, 240) * MIN;
	return fence([
		`$ curl -si -X POST "${orgPath(s, '/projects/')}" \\`,
		`    -H "Content-Type: application/json" -d '${body}'`,
		'HTTP/1.1 201 Created',
		'Content-Type: application/json',
		`Date: ${httpDate(at)}`,
		'',
		JSON.stringify({ id, slug: slugify(name), name, created_at: isoMicro(r, at) }, null, 2)
	]);
};
const pyTrace = (r: Rand, frames: [string, number, string, string][], last: string) =>
	['Traceback (most recent call last):', ...frames.flatMap(([file, line, fn, code]) => [`  File "/srv/app/${file}", line ${line}, in ${fn}`, `    ${code}`]), last].join('\n');
const uptimeRows = (s: Slots, from: number, count: number, row: (at: number, region: string, i: number) => string[]) => {
	const regions = s.checkRegions!.split(', ');
	return Array.from({ length: count }, (_, i) => row(from + Math.floor(i / 3) * MIN + (i % 3) * 7000, regions[i % 3]!, Math.floor(i / 3)));
};

const arts: Record<string, Art> = {
	projectsPage: (r, s, x) => {
		const list = byName(x);
		return fence([`$ curl -s "${orgPath(s, '/projects/')}" | jq .`, pageJson(cut(list.slice(0, 25).map(projectJson), 4, 2), 1, 25, list.length)]);
	},
	emptyLastPage: (r, s, x) => {
		const list = byName(x);
		const pp = Number(s.perPage);
		const right = Number(s.pagesRight);
		return fence([
			`$ curl -s "${orgPath(s, `/projects/?page=${right}&per_page=${pp}`)}" | jq .`,
			pageJson(cut(list.slice((right - 1) * pp, right * pp).map(projectJson), 2, 1), right, pp, list.length),
			`$ curl -s "${orgPath(s, `/projects/?page=${right + 1}&per_page=${pp}`)}" | jq .`,
			pageJson([], right + 1, pp, list.length)
		]);
	},
	createProject: (r, s, x) => created(r, s, x, s.punctName!, `{"name": "${s.punctName}"}`),
	createAccent: (r, s, x) => created(r, s, x, s.accentName!, `{"name": "${s.accentName}"}`),
	createIgnoredSlug: (r, s, x) => created(r, s, x, s.name9!, `{"name": "${s.name9}", "slug": "${s.wantSlug}"}`, Number(s.newId2)),
	caseOrder: (r, s, x) => fence([`$ curl -s "${orgPath(s, '/projects/?per_page=100')}" | jq -r '.results[].name'`, ...byName(x).map((p) => p.name)]),
	slugPath404: (r, s, x) =>
		fence([
			`$ curl -si "${orgPath(s, `/projects/${s.slug}/`)}"`,
			'HTTP/1.1 404 Not Found',
			'Content-Type: application/json',
			`Date: ${httpDate(x.now - int(r, 3, 40) * MIN)}`,
			'',
			'{"detail": "Not found"}',
			'',
			`$ curl -s "${orgPath(s, '/projects/?per_page=100')}" | jq -c '.results[] | select(.slug == "${s.slug}")'`,
			JSON.stringify(projectJson(x.projects.find((p) => p.slug === s.slug)!))
		]),
	duplicateCreate: (r, s, x) =>
		fence([
			`$ curl -si -X POST "${orgPath(s, '/projects/')}" \\`,
			`    -H "Content-Type: application/json" -d '{"name": "${s.dupName}"}'`,
			'HTTP/1.1 400 Bad Request',
			'Content-Type: application/json',
			`Date: ${httpDate(x.now - int(r, 3, 90) * MIN)}`,
			'',
			'{"detail": "A project with this name already exists"}',
			'',
			`$ curl -s "${orgPath(s, '/projects/?per_page=100')}" | jq '.results[] | select(.name == "${s.dupExisting}")'`,
			JSON.stringify(projectJson(x.projects.find((p) => p.name === s.dupExisting)!), null, 2)
		]),
	alertsList: (r, s, x) => {
		const rows = x.alerts.filter((a) => a.projectId === Number(s.pid)).sort((a, b) => (a.name < b.name ? -1 : 1));
		return fence([`$ curl -s "${orgPath(s, `/projects/${s.pid}/alerts/`)}" | jq .`, JSON.stringify(rows.map((a) => ({ id: a.id, project_id: a.projectId, name: a.name, threshold: a.threshold, is_muted: a.muted })), null, 2)]);
	},
	goParseError: (r, s, x) => {
		let at = x.now - int(r, 60, 600) * MIN;
		const lines = byName(x)
			.slice(0, int(r, 3, 6))
			.map((p) => `${isoZ((at += int(r, 1, 3) * 1000))} ERROR catalog-sync: decode project ${p.id}: parsing time "${p.iso}" as "2006-01-02T15:04:05.000000Z": cannot parse "+00:00" as "Z"`);
		return [fence(lines), 'and the layout in our client:', fence([`const beaconTimeLayout = "2006-01-02T15:04:05.000000Z"`], 'go')].join('\n\n');
	},
	tlsError: (r, s, x) =>
		fence([
			`${logTime(x.now - int(r, 30, 300) * MIN)} ERROR [project-sync] Request to ${API} failed`,
			'javax.net.ssl.SSLHandshakeException: Received fatal alert: protocol_version',
			'\tat sun.security.ssl.Alerts.getSSLException(Alerts.java:192)',
			'\tat sun.security.ssl.Alerts.getSSLException(Alerts.java:154)',
			'\tat sun.security.ssl.SSLSocketImpl.recvAlert(SSLSocketImpl.java:2023)',
			'\tat sun.security.ssl.SSLSocketImpl.readRecord(SSLSocketImpl.java:1125)',
			'\tat sun.security.ssl.SSLSocketImpl.performInitialHandshake(SSLSocketImpl.java:1375)',
			'\tat sun.security.ssl.SSLSocketImpl.startHandshake(SSLSocketImpl.java:1403)',
			'\tat sun.net.www.protocol.https.HttpsClient.afterConnect(HttpsClient.java:559)',
			'\tat sun.net.www.protocol.https.HttpsURLConnectionImpl.connect(HttpsURLConnectionImpl.java:153)',
			`\tat com.${s.pkg}.beacon.BeaconClient.listProjects(BeaconClient.java:${int(r, 40, 140)})`,
			`\tat com.${s.pkg}.sync.ProjectSync.run(ProjectSync.java:${int(r, 20, 90)})`,
			'\tat java.util.concurrent.Executors$RunnableAdapter.call(Executors.java:511)'
		]),
	rateLimitHeaders: (r, s, x) => {
		const at = x.now - int(r, 10, 200) * MIN;
		const wait = int(r, 8, 52);
		return fence([
			'HTTP/1.1 429 Too Many Requests',
			`Date: ${httpDate(at)}`,
			'Content-Type: application/json',
			`Retry-After: ${wait}`,
			'X-RateLimit-Limit: 120',
			'X-RateLimit-Remaining: 0',
			`X-RateLimit-Reset: ${Math.floor(at / 1000) + wait}`,
			'',
			`{"detail": "Request was throttled. Expected available in ${wait} seconds."}`
		]);
	},
	sdkDebugSample: (r, s, x) => {
		let at = x.now - int(r, 30, 300) * MIN;
		const step = () => logTime((at += int(r, 1, 900)));
		const lines = [
			`${step()} [beacon] DEBUG: Setting up integrations (with default = True)`,
			`${step()} [beacon] DEBUG: Enabling integration: logging`,
			`${step()} [beacon] DEBUG: Enabling integration: ${s.framework}`,
			`${step()} [beacon] DEBUG: Could not parse sample rate '0,25' from BEACON_SAMPLE_RATE, using 0.0`,
			`${step()} [beacon] DEBUG: Options: release=${s.release} environment=production sample_rate=0.0`
		];
		for (let i = int(r, 4, 8); i > 0; i--) {
			at += int(r, 2000, 90000);
			lines.push(`${step()} [beacon] DEBUG: Discarding event ${hex(r, 32)}: sampled out (sample_rate=0.0)`);
		}
		lines.push(`${step()} [beacon] DEBUG: Flushing transport: 0 events queued`);
		return fence(lines);
	},
	dupEvents: (r, s, x) => {
		const at = x.now - int(r, 60, 900) * MIN;
		const [type, value] = pick(r, excs);
		const common = { level: 'error', release: s.release, environment: 'production', server_name: `web-${int(r, 1, 6)}`, platform: 'python', exception: { values: [{ type, value }] }, sdk: { name: 'beacon.python', version: s.pyVersion } };
		const first = { event_id: hex(r, 32), timestamp: isoMs(at), logger: s.logger, message: `Unhandled error in /${pick(r, ['checkout', 'orders', 'bookings', 'api/quote'])}`, ...common };
		const second = { event_id: hex(r, 32), timestamp: isoMs(at + int(r, 2, 9)), ...common };
		return [
			fence([JSON.stringify(first, null, 2)]),
			fence([JSON.stringify(second, null, 2)]),
			fence(
				[
					'beacon.init(',
					'    dsn=os.environ["BEACON_DSN"],',
					'    release=os.environ.get("APP_RELEASE"),',
					'    environment=os.environ.get("APP_ENV", "production"),',
					`    traces_sample_rate=${pick(r, ['0.1', '0.05', '0.2'])},`,
					')',
					'',
					'',
					'@app.errorhandler(Exception)',
					'def handle_unexpected(error):',
					'    log.exception("Unhandled error in %s", request.path)',
					'    beacon.capture_exception(error)',
					'    return render_template("500.html"), 500'
				],
				'python'
			)
		].join('\n\n');
	},
	sourcemapUpload: (r, s, x) => {
		const files = ['main', 'vendor', 'checkout', 'account', 'search', 'runtime'].slice(0, int(r, 3, 6)).map((name) => `${name}.${hex(r, 8)}.js`);
		return fence([
			`$ npx beacon-cli sourcemaps upload --release "${s.uploadRelease}" ./dist/static/js`,
			`> Found ${files.length * 2} files`,
			`> Analyzing ${files.length * 2} sources`,
			`> Uploading source maps for release ${s.uploadRelease}`,
			'',
			'Source Map Upload Report',
			'  Minified Scripts',
			...files.map((file) => `    ~/static/js/${file} (sourcemap at ${file}.map)`),
			'  Source Maps',
			...files.map((file) => `    ~/static/js/${file}.map`),
			'',
			`> Upload complete in ${int(r, 2, 19)}.${int(r, 0, 9)}s`
		]);
	},
	skewEvents: (r, s, x) =>
		[0, 1]
			.map((i) => {
				const received = x.now - int(r, 30, 2000) * MIN;
				const offset = (i === 0 ? int(r, 3, 40) : -int(r, 300, 900)) * HOUR + int(r, 0, 59) * MIN;
				return fence([
					JSON.stringify(
						{ event_id: hex(r, 32), timestamp: isoMs(received + offset), received: isoMs(received), level: 'error', message: pick(r, ['Printer not responding', 'Payment terminal timeout', 'Barcode lookup failed', 'Could not sync basket']), server_name: `${s.deviceShort}-${pad(int(r, 1, 80), 3)}`, release: s.release, environment: 'production' },
						null,
						2
					)
				]);
			})
			.join('\n\n'),
	sdkDebug413: (r, s, x) => {
		let at = x.now - int(r, 60, 900) * MIN;
		const id = hex(r, 32);
		const step = () => logTime((at += int(r, 1, 400)));
		return fence([
			`${step()} [beacon] DEBUG: Preparing event ${id}: exception=UploadRejected`,
			`${step()} [beacon] DEBUG: Event ${id} extra keys: request_body, content_type, user_agent, upload_id`,
			`${step()} [beacon] DEBUG: Event ${id} size ${s.kb} KB (request_body ${Number(s.kb) - int(r, 6, 14)} KB)`,
			`${step()} [beacon] DEBUG: Sending event ${id}`,
			`${step()} [beacon] WARNING: Event ${id} was rejected: HTTP 413 Payload Too Large`,
			`${step()} [beacon] DEBUG: Dropping event ${id}, not retrying a rejected event`
		]);
	},
	ingest429: (r, s, x) => {
		const lines: string[] = [];
		let at = Number(s.incidentMs);
		for (let i = 0; i < int(r, 8, 12); i++) {
			at += int(r, 2, 9) * MIN + int(r, 0, 59999);
			lines.push(`${logTime(at)} [beacon] WARNING: Rate limited by server (HTTP 429), retry after ${pick(r, [30, 45, 60])}s; dropped ${int(r, 120, 2400)} events`);
		}
		return fence(lines);
	},
	levelEvent: (r, s, x) =>
		fence([
			`${logTime(x.now - int(r, 60, 600) * MIN)} [beacon] DEBUG: Sending event ${hex(r, 32)}:`,
			JSON.stringify({ level: 'WARN', logger: pick(r, ['com.' + s.pkg + '.orders', 'stock', 'billing.sync', 'app']), message: pick(r, ['Retrying carrier request (attempt 2)', 'Price list is 3 days old', 'Slow response from stock service', 'Falling back to cached rates']), release: s.release, environment: 'production', server_name: `app-${int(r, 1, 9)}` }, null, 2)
		]),
	groupingStacks: (r, s, x) => {
		const [fn, file] = [s.wrapper!, s.wrapperFile!];
		const pickTwo = shuffle(r, excs).slice(0, 2);
		return pickTwo
			.map(([type, value, where, code], i) =>
				fence([
					pyTrace(
						r,
						[
							[`app/${pick(r, ['views', 'tasks', 'api'])}/${pick(r, ['orders', 'checkout', 'stock', 'quotes'])}.py`, int(r, 20, 200), pick(r, ['create_order', 'run', 'post', 'refresh']), `result = ${where.split('/').pop()!.replace('.py', '')}.handle(payload)`],
							[where, int(r, 10, 120), 'handle', code],
							[file, int(r, 12, 60), fn, `raise UpstreamError(str(error)) from error`]
						],
						`app.errors.UpstreamError: ${type}: ${value}`
					)
				])
			)
			.join('\n\n');
	},
	envEvent: (r, s, x) =>
		fence([
			JSON.stringify(
				{ event_id: hex(r, 32), timestamp: isoMs(x.now - int(r, 30, 900) * MIN), level: 'error', message: pick(r, ['Test card declined', 'Seed data missing for demo shop', 'Feature flag service unreachable', 'Sandbox carrier returned 500']), environment: 'production', server_name: `stg-${pick(r, ['web', 'app', 'api'])}-${int(r, 1, 4)}`, release: s.release, tags: { region: pick(r, ['eu-west-1', 'eu-central-1']), image: `registry.${s.domain}/app:${s.release}` } },
				null,
				2
			)
		]),
	initTraceback: (r, s, x) =>
		x.teamFor === 'sdk-upgrade'
			? fence([
					pyTrace(
						r,
						[
							['app/__init__.py', int(r, 10, 30), '<module>', 'beacon.init(dsn=os.environ["BEACON_DSN"], stack_traces=True)'],
							['.venv/lib/python3.11/site-packages/beacon/client.py', int(r, 100, 300), 'init', 'integration.setup_once()'],
							['.venv/lib/python3.11/site-packages/beacon/integrations/gevent.py', int(r, 20, 80), 'setup_once', 'if gevent.monkey.is_module_patched("threading"):']
						],
						"AttributeError: module 'gevent.monkey' has no attribute 'is_module_patched'"
					)
				])
			: [
					fence([pyTrace(r, [['wsgi.py', 5, '<module>', 'from app import create_app'], ['app/__init__.py', int(r, 10, 30), '<module>', 'beacon.init(']], "TypeError: init() got an unexpected keyword argument 'attach_stacktrace'")]),
					fence(['beacon.init(', '    dsn=os.environ["BEACON_DSN"],', '    release=os.environ.get("APP_RELEASE"),', '    attach_stacktrace=True,', `    traces_sample_rate=${pick(r, ['0.1', '0.25'])},`, ')'], 'python')
				].join('\n\n'),
	alertCounts: (r, s, x) => {
		const t = Number(s.threshold);
		const peak = Number(s.peak);
		const start = Number(s.incidentMs);
		const peakAt = int(r, 3, 12);
		const rows = Array.from({ length: 20 }, (_, i) => [clock(start + i * MIN), String(i === peakAt ? peak : Math.max(1, peak - int(r, 1, Math.max(2, Math.floor(peak / 2)))))]);
		return [table(['Setting', 'Value'], [['Name', s.alert!], ['Project', s.project!], ['Counts', 'error and fatal events'], ['Threshold', `${t} events in one minute`], ['Environment', 'all'], ['Muted', 'no'], ['Notify', `Slack #${s.channel}, email`]]), `Events per minute during the outage, from the project's chart:`, table(['Minute (UTC)', 'Events'], rows)].join('\n\n');
	},
	alertNightly: (r, s, x) =>
		table(
			['Night', 'Fired (UTC)', 'Recovered', 'Peak per minute', 'Top message'],
			Array.from({ length: 7 }, (_, i) => {
				const night = midnight(x.now) - (7 - i) * DAY;
				const fired = night + Number(s.nightHour) * HOUR + int(r, 0, 9) * MIN;
				return [fullDay(night), clock(fired), clock(fired + int(r, 2, 6) * MIN), String(Number(s.threshold) + int(r, 5, 140)), s.nightMsg!];
			})
		),
	mutedTwo: (r, s, x) =>
		table(
			['Project', 'Alert id', 'Name', 'Threshold', 'Muted', 'Last notification'],
			[
				[s.stagingProject!, s.alertId2!, s.alert!, s.threshold!, 'yes', dayMonth(x.now - 2 * DAY)],
				[s.project!, s.alertId!, s.alert!, s.threshold!, 'no', `${dayMonth(x.now - int(r, 1, 3) * HOUR)}, ${clock(x.now - int(r, 1, 3) * HOUR)}`]
			]
		),
	slackDelivery: (r, s, x) => {
		const fired = Number(s.firedMs);
		const team = x.teamFor === 'slack-delay';
		const rows = Array.from({ length: int(r, 5, 8) }, (_, i) => {
			const at = fired + i * int(r, 0, 2) * MIN;
			const sent = at + Number(s.delay) * MIN + i * int(r, 10, 90) * 1000;
			return [pick(r, alertNames), clock(at), clock(sent), team ? '200 ok' : `429 rate_limited (${int(r, 2, 9)} retries)`, team ? 'queued until ' + clock(sent - int(r, 0, 1) * MIN) : 'sent after retry'];
		});
		return table(['Alert', 'Fired', 'Posted to Slack', 'Slack answered', 'Note'], rows);
	},
	pagerdutyLog: (r, s, x) => {
		const at = x.now - int(r, 4, 40) * HOUR;
		const team = x.teamFor === 'pagerduty';
		return table(
			['Time (UTC)', 'Event', 'Integration key', 'PagerDuty answered'],
			[
				[`${dayMonth(at)} ${clock(at)}`, 'trigger', `…${s.key1}`, '202 Accepted'],
				[`${dayMonth(at)} ${clock(at + 1 * MIN)}`, 'acknowledge (from PagerDuty)', '-', '-'],
				[`${dayMonth(at)} ${clock(at + int(r, 12, 70) * MIN)}`, 'resolve', `…${team ? s.key1 : s.key2}`, team ? '400 Bad Request: "event_action" is invalid' : '202 Accepted']
			]
		);
	},
	tfHistory: (r, s, x) =>
		table(
			['When (UTC)', 'Change', 'Made by'],
			[3, 2, 1].flatMap((back) => {
				const day = midnight(x.now) - back * DAY;
				return [
					[`${dayMonth(day)} ${pad(int(r, 9, 16))}:${pad(int(r, 0, 59))}`, `threshold ${s.threshold} → ${s.newT}`, s.full!],
					[`${dayMonth(day + DAY)} ${s.tfTime}`, `threshold ${s.newT} → ${s.threshold}`, `API (${s.tfUser})`]
				];
			}).slice(back3(r))
		),
	emailLog: (r, s, x) => {
		const at = x.now - int(r, 2, 8) * HOUR;
		const team = x.teamFor === 'alert-email';
		return table(
			['Time (UTC)', 'To', 'Status', 'Mail server answered'],
			[s.email!, `${s.colleagueFirst!.toLowerCase()}@${s.domain}`, `oncall@${s.domain}`].map((to, i) => [clock(at + i * 1000), to, team ? 'refused' : 'delivered', team ? `550 5.7.23 SPF check failed for ${MAIL}` : `250 2.0.0 Ok: queued as ${hex(r, 10).toUpperCase()}`])
		);
	},
	uptimeRegion: (r, s, x) => {
		const start = Number(s.incidentMs);
		return table(
			['Time (UTC)', 'Region', 'Status', 'Response time', 'Result'],
			uptimeRows(s, start, 15, (at, region) => (region === s.badRegion ? [clock(at), region, '503 (challenge page)', `${int(r, 40, 140)} ms`, 'down'] : [clock(at), region, '200', `${int(r, 90, 380)} ms`, 'up']))
		);
	},
	uptimeFlap: (r, s, x) => {
		const start = Number(s.incidentMs);
		return table(
			['Time (UTC)', 'Region', 'Status', 'Response time', 'Result'],
			uptimeRows(s, start, 18, (at, region, i) =>
				region === s.slowRegion ? (i % 2 === 0 ? [clock(at), region, 'timeout', `${s.timeout} s`, 'down'] : [clock(at), region, '200', `${int(r, 6200, 9700)} ms`, 'up']) : [clock(at), region, '200', `${int(r, 120, 390)} ms`, 'up']
			)
		);
	},
	digCert: (r, s, x) =>
		[
			fence([`$ dig +short ${s.host} A`, s.ipv4!, `$ dig +short ${s.host} AAAA`, s.ipv6!]),
			table(
				['Certificate seen by the check', ''],
				[
					['Subject', `CN=${s.host}`],
					['Issuer', "C=US, O=Let's Encrypt, CN=R11"],
					['Valid from', dayMonth(x.now - 83 * DAY) + ' 2026'],
					['Valid until', dayMonth(x.now + Number(s.days) * DAY) + ' 2026'],
					['Address checked', s.ipv6!]
				]
			)
		].join('\n\n'),
	maintWindow: (r, s, x) => table(['Setting', 'Value'], [['Check', s.monitor!], ['Repeats', `weekly, ${s.mDay}`], ['Starts', `${s.mStartUtc} UTC`], ['Lasts', `${s.mHours} hours`], ['Time zone', 'not set (UTC)'], ['Created', `${dayMonth(Date.UTC(2026, 5, int(r, 2, 28)))} by ${s.colleague}`]]),
	uptimeMonthly: (r, s, x) =>
		table(
			['', 'Value'],
			[
				['Checks run', fmt(int(r, 128000, 131000))],
				['Failed checks outside maintenance', String(int(r, 2, 14))],
				['Maintenance windows', `${s.mhours} hours`],
				['Uptime, maintenance left out', `${s.truePct}%`],
				['Status page figure', `${s.pct}%`]
			]
		),
	heartbeatPings: (r, s, x) =>
		[
			table(['Setting', 'Value'], [['Heartbeat', `${s.job} (nightly)`], ['Expected', `daily at ${s.hbExpected} UTC`], ['Grace period', `${s.grace} minutes`], ['Alert', `Slack #${s.channel}`]]),
			table(
				['Night', 'Ping received (UTC)', 'Result'],
				Array.from({ length: 6 }, (_, i) => {
					const night = midnight(x.now) - (6 - i) * DAY;
					const late = i >= 2;
					return [dayMonth(night), late ? `${s.hbActualHour}:${pad(int(r, 10, 55))}` : `${s.hbExpectedHour}:${pad(int(r, 1, Number(s.grace) - 1))}`, late ? 'late, alerted' : 'on time'];
				})
			)
		].join('\n\n'),
	dashboardJson: (r, s, x) =>
		fence([
			JSON.stringify(
				{
					title: s.dashboard,
					time_range: '90d',
					widgets: [
						{ type: 'line', title: s.widget, metric: 'events', group_by: 'release', projects: [s.project] },
						{ type: 'number', title: 'Errors today', metric: 'events', projects: [s.project] },
						{ type: 'table', title: 'Top issues', metric: 'issues', limit: 10, projects: [s.project] },
						{ type: 'line', title: 'Crash-free sessions', metric: 'sessions.crash_free', projects: [s.project] }
					].slice(0, int(r, 2, 4)),
					auto_refresh: '1m'
				},
				null,
				2
			)
		]),
	dashboardBig: (r, s, x) => {
		const projects = shuffle(r, x.projects).slice(0, Number(s.nProj2)).map((p) => p.name);
		const kinds = ['line', 'bar', 'number', 'table', 'line', 'area'];
		const metrics = ['events', 'issues', 'sessions.crash_free', 'events.by_level', 'releases', 'users_affected'];
		const widgets = Array.from({ length: Number(s.nWidgets) }, (_, i) => `    {"type": "${pick(r, kinds)}", "title": "${pick(r, widgetNames)}${i > 5 ? ` (${projects[i % projects.length]})` : ''}", "metric": "${pick(r, metrics)}", "projects": ${JSON.stringify(i > 5 ? [projects[i % projects.length]] : projects.slice(0, 4))}}`);
		return fence(['{', `  "title": "${s.dashboard}",`, '  "time_range": "90d",', '  "auto_refresh": "1m",', '  "widgets": [', widgets.join(',\n'), '  ]', '}']);
	},
	dashboardHistory: (r, s, x) => {
		const day = midnight(x.now) - int(r, 1, 3) * DAY;
		return table(
			['Version', 'Saved (UTC)', 'By', 'Widgets'],
			[
				['v' + (Number(s.version) - 2), `${dayMonth(day - 6 * DAY)} ${pad(int(r, 9, 17))}:${pad(int(r, 0, 59))}`, s.colleague!, String(Number(s.dWidgets) - 2)],
				['v' + (Number(s.version) - 1), `${dayMonth(day)} ${s.time}`, s.full!, s.dWidgets!],
				['v' + s.version, `${dayMonth(day)} ${s.time2}`, s.colleague!, String(Number(s.dWidgets) - 2)]
			]
		);
	},
	usageDaily: (r, s, x) => {
		const month = Number(s.monthIndex);
		const daysIn = new Date(Date.UTC(2026, month + 1, 0)).getUTCDate();
		const rows = Array.from({ length: daysIn }, (_, i) => {
			const day = i + 1;
			const spike = day === Number(s.spikeDay);
			const own = spike ? Number(s.spikeEvents) : Number(s.normalEvents) + int(r, -8000, 9000);
			return [`${day} ${MON[month]}`, fmt(own + int(r, 20000, 60000)), fmt(own)];
		});
		return table(['Day', 'All projects', s.project!], rows);
	},
	quotaEmails: (r, s, x) =>
		[0, 1]
			.map((i) => {
				const p = pick(r, x.projects);
				const pct = pick(r, [50, 75, 90]);
				return fence([
					`From: Beacon <usage@${MAIL}>`,
					`Date: ${httpDate(x.now - (i + 1) * int(r, 20, 40) * HOUR)}`,
					`Subject: ${p.name} has used ${pct}% of its event quota`,
					'',
					`${p.name} (${s.org}) has used ${pct}% of the ${fmt(Number(s.share))} events set aside for it this month.`,
					`Your organization as a whole has used ${s.usedPct}% of its quota.`,
					'',
					`Usage: ${API}/settings/usage`
				]);
			})
			.join('\n\n')
};
/** How many rows of a three-day history to show: all of it, or the last four. */
function back3(r: Rand) {
	return chance(r, 0.5) ? 0 : 2;
}

// ---------------------------------------------------------------------------------------------------------
// Topics. Each is one matter a customer raises: their first words about it, what support asks for, the
// exchanges that follow, and how it can end. A ticket has one main matter and often smaller ones on the side.
type Turn = [string, string, Art?];
interface Topic {
	id: string;
	area: Area;
	weight: number;
	subjects: string[];
	/** The customer's first message about it, two ways. */
	open: [string, string];
	/** The topic as a quick side question, and its answer. */
	quick: [string, string];
	/** Support's first answer, which asks for something; `need` names it for reminders. */
	reply: string;
	need: string;
	/** Support's note when it passes the ticket to the API team. */
	escalate: string;
	/** In order: the customer sends what was asked for, the cause is found, then follow-up questions. */
	turns: Turn[];
	/** The customer's message when it worked. */
	fixed?: [string, string];
	outcomes: Outcome[];
	/** The API team's answer when the matter is another team's, and its note to that team. */
	team?: { key: TeamKey; reply: string; handover: string };
	/** A last question that ends as a feature request, and the answer. */
	request?: [string, string];
	/** The API team's last word on a bug it still has to fix. */
	owe?: string;
	/** For a feature in the next release: the answer before it, and the message on release day. */
	released?: [string, string, Art];
	after?: number;
	noSide?: boolean;
	/** Adds what the topic needs to the organization, for any ticket that mentions it. */
	prep?: (r: Rand, s: Slots, x: Ctx) => void;
	/** Adjusts the organization when the topic is the ticket's main matter. */
	finish?: (r: Rand, s: Slots, x: Ctx) => void;
}

const addProject = (r: Rand, x: Ctx, name: string, created?: number): Proj => {
	const existing = x.projects.find((p) => p.name === name);
	if (existing) return existing;
	const at = created ?? Date.UTC(2025, int(r, 0, 11), int(r, 1, 28), int(r, 8, 18), int(r, 0, 59), int(r, 0, 59));
	const platform = /iOS|iPad|macOS|tvOS/.test(name) ? 'swift' : /Android|Driver/.test(name) ? 'kotlin' : /Web app|site|portal|Help|Kiosk|Shop|Landing/i.test(name) ? 'javascript' : pick(r, ['python', 'python', 'node', 'go', 'java']);
	const project: Proj = { id: int(r, 3000, 9800), name, slug: slugify(name), created: at, iso: isoMicro(r, at), platform, events: created === undefined ? int(r, 2000, 400000) : int(r, 0, 3) };
	while (x.projects.some((p) => p.id === project.id)) project.id += 1;
	x.projects.push(project);
	return project;
};
const fillTo = (r: Rand, x: Ctx, ok: (count: number) => boolean) => {
	let n = 0;
	while (!ok(x.projects.length)) addProject(r, x, `${pick(r, projectBases)}${pick(r, [' EU', ' US', ' v2', ' legacy', ' beta', ' internal', ' APAC', ' sandbox'])}${n++ > 12 ? ' ' + n : ''}`);
};

const topics: Topic[] = [
	{
		id: 'paging-25',
		area: 'projects and the API',
		weight: 3,
		subjects: ['API only returns 25 projects', 'Project sync is missing projects', 'Missing projects in the API response'],
		open: [
			`Our nightly job that copies the list of Beacon projects into our service catalogue has started missing projects. We have {nproj} projects in our organization and the job only ever sees 25 of them. It ran fine for months and nobody has touched the script.`,
			`We pull our projects from the API to build a status board for the office screen, and for a while now only some of them show up. Is there a limit on how many projects the API returns? We have {nproj}.`
		],
		quick: [`Does the API return projects in a fixed order?`, `Yes, by project name.`],
		reply: `Thanks for the details. Could you send the exact request the job makes and the top of the response it gets back? The JSON is fine. Then we can see what the API is telling it.`,
		need: 'the request the job makes and the top of the response',
		escalate: `Customer's project sync only sees 25 of their {nproj} projects. Script unchanged for months. Could someone look at what the project list returns for {org}?`,
		turns: [
			[`Here's the request and what comes back. I've cut the list down, but there are 25 entries in "results".`, `Thanks, that explains it. The project list has been paged since 0.3.0 in July: it returns 25 projects a page unless you ask for another per_page, and the response says where you are with "page", "pages" and "total". Your organization has {nproj} projects, so they come back over {pagesDefault} pages. The job needs to ask for page=2 and onwards until it reaches "pages", or ask for a bigger page with per_page.`, arts.projectsPage],
			[`That would explain why it broke around the end of July. Is it safe to ask for per_page=200 and be done with it?`, `It works, and with {nproj} projects you'd get everything on one page. We'd still read "pages" and loop, so that the job keeps working as you add projects. A loop over pages 1 to "pages" with a per_page of 50 or 100 is a handful of requests at most.`],
			[`Does the order stay the same between pages? I don't want a project to appear twice if someone creates one while the job runs.`, `The list is ordered by project name, so a project created during the run can shift the later pages by one. If that matters, read every page first and drop duplicates by "id" before writing to your catalogue.`],
			[`Last one: is "total" the number of projects in the whole organization or on this page?`, `In the whole organization. "results" holds the page itself, and "total" counts everything across the pages.`]
		],
		fixed: [`Changed the job to loop over the pages and it picked up all {nproj} projects last night. Thanks for spotting it so quickly.`, `That was it. The status board shows every project again, thank you.`],
		request: [`Could the API send a Link header with the next page, like GitHub does? Our HTTP library follows those on its own.`, `Not today; paging is only in the body. I've logged a feature request for Link headers on paged lists, with your use case, so the team weighs it next time they work on paging.`],
		outcomes: ['answered', 'answered', 'answered', 'request', 'waiting'],
		noSide: true,
		finish: (r, s, x) => fillTo(r, x, (n) => n > 25 && n % 25 !== 0)
	},
	{
		id: 'paging-extra',
		area: 'projects and the API',
		weight: 3,
		subjects: ['Extra empty page from the projects API', 'Project list says there is one more page than there is', '"pages" off by one?', 'Last page of the project list is always empty'],
		open: [
			`Our inventory script walks the project list page by page, using "pages" from the response. Every run it makes one request too many, and the last one comes back with an empty "results" list. It's harmless for us, but it trips a check that expects every page to have something on it.`,
			`I think the "pages" number in the project list is wrong. We have {total} projects and ask for {perPage} a page, which should be {pagesRight} pages, but the API says {pagesWrong} and the last page is empty.`
		],
		quick: [`What's the default page size for the project list?`, `25 projects a page, unless you ask for another per_page.`],
		reply: `Thanks for reporting it. Could you send the request for the last page and the response you get, with the numbers as the API reports them? That lets us try exactly the same thing.`,
		need: 'the request for the last page and the response to it',
		escalate: `Customer says the project list reports one page more than it has, and the last page comes back empty. They have {total} projects and use per_page={perPage}. Looks like it may be ours.`,
		turns: [
			[`Here's the last page with projects on it, and the one after it that the API says exists.`, `Thanks, that's very clear. We tried the same thing with {total} projects and per_page={perPage} on our staging copy and got the same answer: "pages" says {pagesWrong} when it should say {pagesRight}. It happens whenever the total is an exact multiple of per_page; with any other total the count is right. So it's a bug in the API, not in your script.`, arts.emptyLastPage],
			[`Good to know it's not us. Is there a workaround in the meantime?`, `The simplest is to stop when a page comes back with fewer results than per_page, or with none, rather than relying on "pages". Your check could also allow an empty page when it's the last one. Both keep working after the fix.`],
			[`Will the fix change anything else in the response?`, `No. "results", "page", "per_page" and "total" stay as they are; only "pages" changes, and only when the total divides exactly.`]
		],
		owe: `I've filed it with the API team's bugs, and I'll update this ticket when the fix is released. It's a small change, but it isn't in a release yet.`,
		outcomes: ['owe', 'owe', 'owe', 'owe', 'waiting'],
		noSide: true,
		finish: (r, s, x) => {
			const perPage = pick(r, [10, 20, 25, 5]);
			fillTo(r, x, (n) => n >= perPage * 2 && n % perPage === 0);
			s.perPage = String(perPage);
		}
	},
	{
		id: 'slug-hyphens',
		area: 'projects and the API',
		weight: 3,
		after: RELEASE + DAY,
		subjects: ['Project slug full of hyphens', 'Odd slug for a new project', 'Slug looks broken', 'Hyphens in project slugs'],
		open: [
			`We created a project called "{punctName}" through the API this morning and its slug came back as "{punctSlug}". It goes into URLs on our internal wiki and it looks broken. Is that expected?`,
			`New projects with punctuation in their names get slugs with runs of hyphens and a hyphen on the end. "{punctName}", for example, became "{punctSlug}". Our older projects don't look like that.`
		],
		quick: [`Can a project's name be changed after it's created?`, `Yes, in the web app under the project's settings. The slug stays as it was made.`],
		reply: `Thanks for the example. Could you send the request you used to create the project and the full response, so we can try the same name?`,
		need: 'the create request and its response',
		escalate: `Slugs with runs of hyphens for names with punctuation: "{punctName}" gave "{punctSlug}". Customer expected something like "{goodSlug}".`,
		turns: [
			[`Here's the request and the response.`, `Thanks. We get the same slug for that name. Since 0.4.0 the slug is made from the name, and at the moment every character that isn't a letter or a digit turns into its own hyphen, so the spaces and punctuation each leave one, and nothing tidies up the ends. "{goodSlug}" is what it should give. That's a bug on our side.`, arts.createProject],
			[`Can we change the slug ourselves until then?`, `Not through the API: the slug is set when the project is created. If the slug matters for your wiki links, a name without punctuation, such as "{plainName}", gives a clean slug today. Projects you've already created keep their slug when the fix goes out, so links to them won't break.`],
			[`Is the slug what the web app's URLs use as well?`, `The web app's project pages use the slug, yes, so they'll show the same hyphens until the fix. The API's paths use the numeric project id instead.`]
		],
		owe: `The fix is with the API team now, and I'll write here once it's in a release. It hasn't got a date yet, but it's a small one.`,
		outcomes: ['owe', 'owe', 'owe', 'owe', 'waiting'],
		noSide: true,
		prep: (r, s, x) => {
			addProject(r, x, s.punctName!, x.now - int(r, 2, 6) * HOUR).id = Number(s.newId);
		}
	},
	{
		id: 'slug-accents',
		area: 'projects and the API',
		weight: 3,
		after: RELEASE + DAY,
		subjects: ['Accented letters missing from slug', 'Slug drops accented letters', 'Project slug for "{accentName}" looks wrong'],
		open: [
			`Our team in {city} created a project called "{accentName}" and the slug came out as "{accentSlug}". The accented letter has turned into a hyphen. We'd have expected "{accentGood}", or at least something readable.`,
			`Slugs seem to choke on accented letters. "{accentName}" got the slug "{accentSlug}". Half our project names are in {language}, so this will keep happening.`
		],
		quick: [`Where do I find a project's numeric id?`, `It's the "id" in the project list response, and the web app shows it in the project's settings, next to the slug.`],
		reply: `Thanks for the example. Could you tell me whether the project was created in the web app or through the API, and if it was the API, send the request and the response?`,
		need: 'how the project was created, and the request and response if it was through the API',
		escalate: `Accented letters become hyphens in slugs: "{accentName}" gave "{accentSlug}". Customer has many {language} names.`,
		turns: [
			[`Through the API, from our provisioning script. Here's what it sent and got back.`, `Thanks. We see the same thing: the slug keeps only the letters a to z and digits, and anything else, accented letters included, becomes a hyphen. "{accentGood}" is what it should be. It's a bug in how the API makes slugs, and it isn't specific to your organization.`, arts.createAccent],
			[`Is there anything we can do in the meantime?`, `If the slug matters, create the project with the name written without the accent, then change the name in the web app afterwards; the slug stays as it was made, and the name is free to change. Projects already created keep their slug when the fix lands.`],
			[`Does the web app do the same when you create a project there?`, `It goes through the same API, so yes, the same slug comes out.`]
		],
		owe: `I've added your example to the bug, and I'll update this ticket when the fix is released.`,
		outcomes: ['owe', 'owe', 'owe', 'waiting'],
		noSide: true,
		prep: (r, s, x) => {
			addProject(r, x, s.accentName!, x.now - int(r, 2, 6) * HOUR).id = Number(s.newId);
		}
	},
	{
		id: 'case-order',
		area: 'projects and the API',
		weight: 2,
		subjects: ['Project list sort order', 'Projects with lower-case names listed last', 'API project order is not alphabetical'],
		open: [
			`The project list from the API isn't in alphabetical order for us. "{lowerName}" comes after "{lastUpper}", right at the end, instead of in its place. Our engineers notice because the picker in our deploy tool reads it straight from the API.`,
			`Small thing, but the projects come back in an odd order: everything with a capital first letter, then the ones that start with a small letter, like "{lowerName}". Is the list meant to be sorted?`
		],
		quick: [`Can the project list be sorted by creation date?`, `Not at the moment: it's always ordered by name. Each project has "created_at", so you can sort by that on your side.`],
		reply: `Thanks for flagging it. Could you send a response that shows the order? The whole list, if it's short enough.`,
		need: 'a response that shows the order',
		escalate: `Project list puts names starting with a small letter after all the capitalised ones ("{lowerName}" last). Customer's deploy tool shows it as is.`,
		turns: [
			[`Here it is, names only.`, `Thanks. The list is sorted by name, but the sort treats capital and small letters as different, so every name that starts with a capital comes before any that starts with a small letter. That's why "{lowerName}" is at the end. People expect A to Z whatever the case, and so do we; it's a bug.`, arts.caseOrder],
			[`Fine. We can sort on our side for now.`, `That's the right workaround: sort by name, ignoring case, after you've read every page. Paging follows the API's own order, so read all the pages before you sort.`]
		],
		owe: `I've filed it with the API team, and I'll write here when the sort order is fixed in a release.`,
		outcomes: ['owe', 'owe', 'owe', 'waiting'],
		noSide: true,
		finish: (r, s, x) => {
			addProject(r, x, s.lowerName!);
			s.lastUpper = byName(x).filter((p) => /^[A-Z]/.test(p.name)).at(-1)!.name;
		}
	},
	{
		id: 'slug-path',
		area: 'projects and the API',
		weight: 2,
		subjects: ['404 from the project endpoint', 'Project detail returns Not found', 'Cannot fetch one project through the API'],
		open: [
			`I'm trying to get a single project from the API and I only ever get a 404 saying "Not found". The project definitely exists: I can see it in the web app and in the project list.`,
			`GET on /projects/{slug}/ gives us "Not found" for every project, even ones we created a minute ago. The project list works fine, so the organization part of the URL is right.`
		],
		quick: [`Is there a single call that returns one project?`, `Yes: GET /api/organizations/<org_slug>/projects/<project_id>/ returns one project with its id, slug, name and created_at.`],
		reply: `Sorry about that. Could you send the exact URL you're calling, with the response?`,
		need: `the exact URL you're calling and the response`,
		escalate: `Customer gets 404 "Not found" for single projects that exist and show in the list. Can someone have a look?`,
		turns: [
			[`This is the call, and what it returns. The project is there in the list.`, `Thanks, that's it: the URL has the project's slug, "{slug}", where the API expects the project's numeric id. The id is the "id" in the list response; for {project} it's {pid}. That part of the path only matches digits, so a slug never reaches the project endpoint at all, and you get the general "Not found".`, arts.slugPath404],
			[`Ah. With the id it works. Is there a way to look a project up by its slug, though? Our config files only have slugs.`, `Not directly. The usual way is to read the project list once, build a map from slug to id and keep it in your script. With {nproj} projects that's {pagesDefaultReq} at the default page size.`],
			[`Does a project's id ever change?`, `No. It's fixed when the project is created, so the map only needs updating when you add projects. The slug doesn't change either.`]
		],
		fixed: [`Using the ids now and everything works. Thanks for the quick answer.`, `Built the slug-to-id map as you suggested. All good.`],
		request: [`Would you consider letting the path take a slug as well? It would save everyone the lookup.`, `I've logged it as a feature request for the API team, with your example. There's no date, but it's on the list the team plans from.`],
		outcomes: ['answered', 'answered', 'answered', 'request', 'request', 'waiting']
	},
	{
		id: 'duplicate-name',
		area: 'projects and the API',
		weight: 2,
		after: RELEASE + DAY,
		subjects: ['"A project with this name already exists"', 'Cannot create a project', 'Project creation fails with 400'],
		open: [
			`Our provisioning script can't create a project called "{dupName}". The API answers 400, "A project with this name already exists", but there is no project with that name; the closest we have is "{dupExisting}".`,
			`Creating a project fails with "A project with this name already exists". We checked the list and there's no project by that name, though there is one called "{dupExisting}".`
		],
		quick: [`Do project names have to be different from each other?`, `Their slugs do, within an organization, so names that give the same slug count as the same name.`],
		reply: `Thanks. Could you send the create request and the response, and the entry for "{dupExisting}" from the project list?`,
		need: `the create request and response, and the list entry for "{dupExisting}"`,
		escalate: `Create project "{dupName}" refused as a duplicate; customer only has "{dupExisting}". Probably the slug, but please confirm.`,
		turns: [
			[`Here you go.`, `Thanks, that shows it. The check is on the slug rather than the name: "{dupName}" and "{dupExisting}" both give the slug "{dupSlug}", and two projects in one organization can't share a slug, because the web app's URLs use it. The message says "name" because that's what you sent, which is admittedly confusing.`, arts.duplicateCreate],
			[`Makes sense. So any name that turns into the same slug is taken?`, `Yes. Capitals, spaces and hyphens all fold into the same slug, so "Web App", "web-app" and "WEB APP" are the same as far as the check goes. A name with a different word in it, such as "{dupAlt}", goes through.`],
			[`We'll rename then. Will "{dupAlt}" give a sensible slug?`, `It gives "{dupAltSlug}". You can work out a slug before you create a project: lower-case the name and replace anything that isn't a letter or a digit with a hyphen.`]
		],
		fixed: [`Created it as "{dupAlt}". Thanks for explaining.`, `Renamed it and it went through. The error message could be clearer, but we know now.`],
		request: [`Could the error say which project it clashes with? That would have saved us a day.`, `Fair point. I've logged a feature request to name the clashing project in that message.`],
		outcomes: ['answered', 'answered', 'answered', 'request', 'request'],
		prep: (r, s, x) => {
			addProject(r, x, s.dupExisting!);
		}
	},
	{
		id: 'alerts-endpoint',
		area: 'projects and the API',
		weight: 2,
		subjects: ['Listing alerts through the API', 'Is there an API for alerts?', 'Alerts endpoint'],
		open: [
			`We'd like our deploy pipeline to check whether a project has any alerts set up before a service is marked production-ready. I can't find an endpoint for alerts in the API docs; is there one?`,
			`Is there a way to read a project's alerts through the API? We keep a spreadsheet of every alert and its threshold, and keeping it up to date by hand is getting old.`
		],
		quick: [`What does "threshold" mean on an alert?`, `The number of matching events within one minute that makes the alert fire.`],
		reply: `Thanks for asking. Let me check with the API team where this stands, and I'll come back to you.`,
		need: 'which project you would start with',
		escalate: `Customer wants to read a project's alerts through the API. Where are we with that?`,
		turns: [
			[`Thanks. For reference, the project we'd start with is {project}, id {pid}.`, `There is, since 0.4.0 on 15 September: GET /api/organizations/{org}/projects/{pid}/alerts/ returns every alert of the project, ordered by name, with its id, threshold and whether it's muted. This is what it returns for {project} today:`, arts.alertsList],
			[`That's exactly what we need. Is "threshold" the number of events per minute?`, `Yes, it's the number of matching events in one minute that makes the alert fire, the same number you see on the alert's page in the web app.`],
			[`And "is_muted": true means it won't tell anyone?`, `Right. A muted alert still evaluates, so its history keeps filling, but it sends no notifications until it's unmuted.`]
		],
		fixed: [`Wired it into the pipeline this morning; it already caught a service with no alerts. Thanks.`, `Works a treat, the spreadsheet fills itself now.`],
		released: [
			`There isn't one in the current release, but there will be in the next: 0.4.0 adds GET /api/organizations/{org}/projects/<project_id>/alerts/, which returns every alert of a project with its name, threshold and whether it's muted. It's planned for the middle of September, and I'll write here when it's out.`,
			`0.4.0 went out this morning. GET /api/organizations/{org}/projects/{pid}/alerts/ now returns the alerts of {project} with their names, thresholds and muted state. Here's what it gives today; let me know if it covers what you need.`,
			arts.alertsList
		],
		outcomes: ['answered'],
		noSide: true
	},
	{
		id: 'slug-ignored',
		area: 'projects and the API',
		weight: 2,
		after: RELEASE + 2 * DAY,
		subjects: ['Slug we send is ignored', 'Project created with the wrong slug', 'Terraform keeps recreating a project'],
		open: [
			`Since about the middle of September, projects our Terraform module creates come back with a different slug from the one we send. We send "{wantSlug}" and get "{gotSlug}". Terraform then wants to recreate the project on every run.`,
			`The slug we pass when creating a project no longer seems to do anything. We asked for "{wantSlug}" and the project got "{gotSlug}".`
		],
		quick: [`Which fields does the create-project call take?`, `Just "name". The slug is made from the name.`],
		reply: `Thanks. Could you send the create request your module makes and the response, so we can compare them?`,
		need: 'the create request and the response',
		escalate: `Customer's slug in the create request is ignored: sent "{wantSlug}", got "{gotSlug}". Their Terraform loops on it.`,
		turns: [
			[`Here's the request and the response.`, `Thanks. This is the 0.4.0 change from 15 September: project slugs are now made from the project's name, and a "slug" in the request is ignored. "{gotSlug}" is what the name "{name9}" gives. Nothing is wrong with the project itself.`, arts.createIgnoredSlug],
			[`So if we want "{wantSlug}" we have to name the project to match?`, `Yes. A name such as "{wantName}" gives "{wantSlug}". In your module, drop the slug argument and read the slug from the response instead, so Terraform stops seeing a difference.`],
			[`Will the projects we already have keep the slugs we gave them?`, `Yes. Only projects created since 0.4.0 get their slug from the name; nothing changed on the older ones.`]
		],
		fixed: [`Dropped the slug from the module and the plan is clean again. Thanks.`, `Renamed the two new projects and removed the argument. All quiet now.`],
		request: [`Could the API reject the "slug" field with an error instead of ignoring it? We'd have caught this on day one.`, `I've logged that as a feature request: answering 400 for fields the create call doesn't take. No date yet.`],
		outcomes: ['answered', 'answered', 'answered', 'request', 'request'],
		prep: (r, s, x) => {
			addProject(r, x, s.name9!, x.now - int(r, 2, 6) * HOUR).id = Number(s.newId2);
		}
	},
	{
		id: 'created-at',
		area: 'projects and the API',
		weight: 2,
		subjects: ['Date parsing error on created_at', 'created_at format changed?', 'Cannot parse project timestamps'],
		open: [
			`Our Go service that reads projects from the API fails to parse "created_at". The value looks like "{iso}" and our parser expects a Z at the end.`,
			`What format is "created_at" in? Our importer chokes on it: it gets "{iso}" and complains about the offset.`
		],
		quick: [`What time zone are the API's timestamps in?`, `UTC, written with an explicit +00:00 offset.`],
		reply: `Thanks. Could you send the error your parser gives, and the layout or format string it uses?`,
		need: `the parser's error and the format it expects`,
		escalate: `Customer can't parse created_at from the project list; asks whether the format changed.`,
		turns: [
			[`Here's the error from the logs.`, `Thanks. "created_at" is ISO 8601 in UTC, with microseconds and an explicit +00:00 offset rather than a Z. Your layout has a literal Z, so it can't match "+00:00". Both mean UTC; the layout just needs to accept an offset.`, arts.goParseError],
			[`Has it always been like that?`, `Yes, since project creation was added in 0.2.0. Nothing about the field has changed.`],
			[`Which layout should we use in Go?`, `time.RFC3339Nano parses it, offset and microseconds included, and time.RFC3339 does too.`]
		],
		fixed: [`Switched to RFC3339Nano and the importer is happy. Thanks.`, `Fixed on our side, thanks for the pointer.`],
		outcomes: ['answered', 'answered', 'answered', 'waiting']
	},
	{
		id: 'tls',
		area: 'projects and the API',
		weight: 2,
		after: TLS_CUTOFF + DAY,
		subjects: ['SSL handshake errors calling the API', 'API calls fail from our build server', 'protocol_version error'],
		open: [
			`Since the start of September one of our servers can't reach the Beacon API at all. Every call fails with an SSL handshake error. Our other machines are fine.`,
			`One of our older services gets "Received fatal alert: protocol_version" when it calls the API. It worked in August.`
		],
		quick: [`Which TLS versions does the API accept?`, `TLS 1.2 and 1.3.`],
		reply: `Sorry for the trouble. Could you send the full error, and tell me which language and version the failing machine runs?`,
		need: 'the full error and the runtime the machine uses',
		escalate: `TLS handshake failures from one of the customer's services since September. Probably the cut-off, but please check.`,
		turns: [
			[`It's an old Java service, {java}. Here's the error.`, `Thanks, that explains it. On 1 September we stopped accepting TLS 1.0 and 1.1 on the API, as announced in July, and that Java offers TLS 1.0 by default. The handshake fails before any request is sent, which is why nothing reaches us.`, arts.tlsError],
			[`Can we fix that without upgrading Java? That box is due to be replaced next year.`, `On that version you can turn TLS 1.2 on with the -Dhttps.protocols=TLSv1.2 option at start-up. If the service uses its own HTTP client, it may need the protocol set there as well. Upgrading is better in the long run, but that gets you going.`],
			[`Will you be dropping TLS 1.2 any time soon?`, `Not that we know of. TLS 1.2 and 1.3 are both supported, and any change would be announced months ahead.`]
		],
		fixed: [`Added the flag and the service talks to the API again. Thanks.`, `That was it. We've also put the upgrade on next quarter's list.`],
		outcomes: ['answered', 'answered', 'answered', 'waiting']
	},
	{
		id: 'api-429',
		area: 'projects and the API',
		weight: 2,
		subjects: ['429 Too Many Requests from the API', 'API rate limit', 'Rate limited while syncing projects'],
		open: [
			`Our sync job started getting 429 responses from the API halfway through its run. It fetches every project and then each project's details, one request after another.`,
			`What are the rate limits on the API? We're seeing "429 Too Many Requests" from a script that reads our projects.`
		],
		quick: [`Is there a limit on API requests?`, `Yes, 120 requests a minute for each organization; a 429 says how long to wait in "Retry-After".`],
		reply: `Thanks. Could you send the response headers of one of the 429s, and tell me roughly how many requests the job makes in a run?`,
		need: 'the headers of one of the 429 responses and the number of requests in a run',
		escalate: `Customer's sync job gets 429s from the API part-way through. Please confirm limits and advise.`,
		turns: [
			[`About {reqs} requests in a couple of minutes. Here are the headers of one.`, `Thanks. The API allows 120 requests a minute for each organization, and the headers show the job reaching that; "Retry-After" says how many seconds to wait. At {reqs} requests in two minutes the job will hit it every run.`, arts.rateLimitHeaders],
			[`What's the best way to stay under it?`, `Ask for bigger pages, so the project list needs fewer requests, and when you do get a 429, wait the number of seconds in "Retry-After" rather than retrying straight away. Spreading the per-project calls over a few minutes also does it.`],
			[`Is the limit higher on the Business plan?`, `No, it's the same on every plan.`]
		],
		fixed: [`Added a wait on 429 and bigger pages, and the job ran through cleanly. Thanks.`, `Spread the calls out and no more 429s. Cheers.`],
		request: [`Would you raise the limit for us? 120 a minute is tight for a company our size.`, `The limit is the same for everyone at the moment, so I can't raise it for one organization, but I've logged a feature request with your numbers for the API team to consider.`],
		outcomes: ['answered', 'answered', 'answered', 'request', 'request']
	},
	{
		id: 'sample-rate',
		area: 'events',
		weight: 2,
		subjects: ['No events since our deploy', 'Dashboard flat since {pastday}', 'Beacon stopped receiving errors', 'Is the API dropping our events?'],
		open: [
			`Since our deploy of {release} on {pastday}, Beacon shows almost nothing for {project}. The dashboard is flat and the API still lists the project as normal, so I assume something on your side has stopped counting our events.`,
			`We've had no errors in Beacon from {project} since {pastday}. Either our code got very good overnight or the events are going missing somewhere between us and you. Nothing changed in Beacon on our side.`
		],
		quick: [`How do I see what the SDK is doing?`, `Start the process with BEACON_DEBUG=1 and the SDK logs what it does with each event.`],
		reply: `Thanks for flagging it. Could you send the SDK's debug output from one process of the new release? Starting it with BEACON_DEBUG=1 prints what the SDK does with each event.`,
		need: `the SDK's debug output from one process of the new release`,
		escalate: `No events from {project} since the {release} deploy; customer thinks we're dropping them. Could the API team check what's arriving for this project?`,
		turns: [
			[`Here's the debug output from one of the web processes.`, `Thanks, that shows it. The SDK starts with a sample rate of 0.0, so it drops every event before sending it. Your environment sets BEACON_SAMPLE_RATE to "0,25", with a comma, and the SDK reads a value it can't parse as zero. With "0.25" you'd keep a quarter of your events, which I think was the plan.`, arts.sdkDebugSample],
			[`A comma. Our new deploy template came from the Berlin office, that'll be it. So nothing was lost on your side?`, `Nothing reached us to lose: the events were dropped inside your processes. That's also why the project looks normal in the API. The project is fine; it just isn't hearing from the new release.`],
			[`Can we get the events from the last few days back somehow?`, `I'm afraid not. They were never sent, so there's nothing to get back. From the moment the setting is fixed, events will flow again.`]
		],
		fixed: [`Fixed the variable and events are pouring in again. Embarrassing, but thanks for finding it.`, `That was it. We've also added a check for it to the deploy template.`],
		team: {
			key: 'sdk',
			reply: `Thanks, that shows what happened: the SDK starts with a sample rate of 0.0 because BEACON_SAMPLE_RATE is set to "0,25", with a comma, so it drops every event before sending it. Writing "0.25" gets your events flowing today. The SDK shouldn't quietly read "0,25" as zero, though, and that part is the SDK team's, so I've passed this ticket to {mate} with your debug output.`,
			handover: `{sdkName} reads BEACON_SAMPLE_RATE="0,25" as 0.0 and drops every event, with only a debug line. Customer lost several days of events from {project}. Could it warn loudly, or refuse the value?`
		},
		outcomes: ['answered', 'answered', 'answered', 'waiting', 'team'],
		prep: (r, s, x) => {
			s.framework = pick(r, ['flask', 'django', 'fastapi', 'celery']);
		}
	},
	{
		id: 'duplicates',
		area: 'events',
		weight: 2,
		subjects: ['Every error counted twice', 'Duplicate events', 'Event counts doubled', 'Alert firing far too often'],
		open: [
			`Every error from {project} shows up twice in Beacon, a few milliseconds apart. Our alert thresholds were set with the old numbers, so now they fire far too often.`,
			`Event counts for {project} doubled from one day to the next. When I look at single errors, each one is there twice, with the same message and the same stack.`
		],
		quick: [`Does the logging integration add breadcrumbs as well as events?`, `Yes: records below the event level become breadcrumbs on the next event.`],
		reply: `Thanks. Could you send the JSON of two of the doubled events (the "Event JSON" link on each), and the part of your code that sets up the SDK?`,
		need: 'the JSON of two doubled events and the SDK set-up code',
		escalate: `Every event from {project} arrives twice. Could we be storing them twice? Could someone check?`,
		turns: [
			[`Here are the two events, and our set-up is below.`, `Thanks. The two events aren't one send stored twice: the first has "logger": "{logger}" and came in through the logging integration, the second came from your own capture_exception call in the error handler. Since beacon-python 2.6 the logging integration is on by default and sends every record at error level as an event, so an error that you log and also capture is sent twice.`, arts.dupEvents],
			[`Ah, we upgraded the SDK last week. Which one should we turn off?`, `Either works. If you want to keep the explicit capture, set the logging integration's event level to None, so it only adds breadcrumbs. If you'd rather rely on logging, take the capture call out of the handler.`],
			[`Did the doubles count towards our quota?`, `They did. You're well under your quota this month, so it makes no difference to the bill.`]
		],
		fixed: [`Turned the logging events off and the counts are back to normal.`, `Removed the capture call; one event per error again. Thanks.`],
		request: [`Could Beacon spot these pairs and keep only one? Others must have been caught by the same default.`, `There isn't a way to merge them today. I've logged it as a feature request, and the SDK team know about the default.`],
		outcomes: ['answered', 'answered', 'answered', 'waiting', 'request']
	},
	{
		id: 'sourcemaps',
		area: 'events',
		weight: 2,
		subjects: ['Stack traces unreadable', 'Minified stack traces', 'Source maps not applied'],
		open: [
			`Stack traces from our front end ({project}) have all been minified since we moved to the new build: every frame is "main.js" line 1. We upload the source maps from CI as before.`,
			`JavaScript errors in Beacon show minified code, even though our CI uploads source maps for every release. It worked until about {pastday}.`
		],
		quick: [`Do source maps need uploading for every release?`, `Yes. They're matched to the release name on the event, so each release needs its own upload.`],
		reply: `Thanks. Could you send the output of the upload step from one CI run, and the release name your app sends with its events?`,
		need: `the upload step's output and the release name the app sends`,
		escalate: `Front-end events for {project} show minified frames; customer uploads maps from CI. Not sure whether the upload API or processing is at fault.`,
		turns: [
			[`Here's the upload step. The app sends release "{release}".`, `Thanks, that's it. The maps were uploaded for release "{uploadRelease}", with a v, and the app reports "{release}" without one. Beacon only applies maps uploaded under the exact release name on the event, so these events find none. The new build script adds the v when it tags the release.`, arts.sourcemapUpload],
			[`Can we just upload them again under the right name?`, `Yes. Upload the same files with the release set to "{release}", and events from then on come out readable. Events that already came in stay minified, because they're processed once, when they arrive.`],
			[`Is there a way to check, before a release goes out, that the maps match?`, `The upload tool has a --validate option that compares the maps with the files and prints the release name it used, so a check in CI can read that line.`]
		],
		fixed: [`Uploaded again under the right name and the new errors are readable. Thanks.`, `Fixed the tag in the build script, all good now.`],
		team: {
			key: 'pipeline',
			reply: `Thanks. The release names match and the upload went through, so the API side of it looks right. Applying the maps to events happens in the event pipeline, which is the pipeline team's, so I've passed this to {mate} with your upload output.`,
			handover: `Maps for {project} uploaded under the same release name the events carry ("{release}"), upload succeeded, frames still minified. Can you check processing?`
		},
		outcomes: ['answered', 'answered', 'answered', 'waiting', 'team', 'team'],
		prep: (r, s, x) => {
			s.uploadRelease = x.teamFor === 'sourcemaps' ? s.release! : `v${s.release}`;
		}
	},
	{
		id: 'clock-skew',
		area: 'events',
		weight: 1,
		subjects: ['Events dated in the future', 'Wrong times on events', 'Event timestamps off by hours'],
		open: [
			`Some events from {project} are dated hours or even days in the future, which messes up our charts: today's chart has a spike tonight that hasn't happened yet.`,
			`The times on events from our {device}s are all over the place. Some are from tomorrow, a few from last year. Our servers' events look fine.`
		],
		quick: [`Which time does the event list show, the event's or when it arrived?`, `The event's own time. When it arrived is in the event's details, as "received".`],
		reply: `Thanks. Could you send the JSON of two of the oddly dated events (the "Event JSON" link on each)?`,
		need: 'the JSON of two of the oddly dated events',
		escalate: `Events from {project} carry timestamps in the future and the past; customer suspects us. Can the API team check how we date events?`,
		turns: [
			[`Here are two of them.`, `Thanks. Both events have a "timestamp" set by the device itself, and Beacon keeps the time the SDK sends, so the time on the event is the device's clock. The "received" time shows when they reached us, and it's right in both. These look like {device}s whose clocks are wrong.`, arts.skewEvents],
			[`That's possible: a batch of them was set up without network time. Can Beacon use the received time instead?`, `Not as a project setting today. For devices you can't fix quickly, you can remove the event's own timestamp in the SDK's before_send hook, and Beacon then dates the event when it receives it.`],
			[`Does a wrong clock affect alerts too?`, `No. Alerts count events by the time they were received; only the charts and the event list use the event's own time.`]
		],
		fixed: [`Turned on network time on the devices and the new events are dated correctly.`, `Added the before_send change; today's chart looks sane again.`],
		request: [`Could there be a project setting to always use the received time? We'll never control every device's clock.`, `I've logged that as a feature request for the pipeline and API teams.`],
		outcomes: ['answered', 'answered', 'answered', 'request', 'request'],
		prep: (r, s, x) => {
			s.deviceShort = s.device!.split(' ').at(-1)!.replace('tablet', 'tab');
		}
	},
	{
		id: 'too-large',
		area: 'events',
		weight: 1,
		subjects: ['Events rejected with 413', 'Some errors never arrive', 'Payload too large'],
		open: [
			`Some errors from {project} never show up in Beacon. Our logs show the SDK getting "413 Payload Too Large" back for them.`,
			`We're missing events for one particular failure in {project}: the upload endpoint of our app. Other errors arrive fine.`
		],
		quick: [`Is there a size limit on events?`, `Yes, 200 KB per event.`],
		reply: `Thanks. Could you send the SDK's debug lines for one of the missing events? BEACON_DEBUG=1 prints the size of each event it sends.`,
		need: `the SDK's debug lines for one of the missing events`,
		escalate: `Some events from {project} rejected with 413. Customer asks what the API's size limit is and why.`,
		turns: [
			[`Here's the output for one of them.`, `Thanks. That event is {kb} KB, and Beacon accepts events of up to 200 KB, so it's turned away at the door. Most of the size is in "extra": your handler attaches the whole request body, which for the upload endpoint is the uploaded file.`, arts.sdkDebug413],
			[`Of course, the upload body. What's the best way to keep the useful part?`, `Attach only what helps you debug: the file's name, size and type, not its contents. The before_send hook is a good place to trim "extra" for every event.`],
			[`Is the 200 KB limit per event or per request? The SDK sends batches sometimes.`, `Per event. A batch can hold several events of up to 200 KB each.`]
		],
		fixed: [`Trimmed the extra data and the upload errors come through now. Thanks.`, `All good, the missing events are arriving.`],
		outcomes: ['answered', 'answered', 'answered', 'waiting']
	},
	{
		id: 'ingest-limit',
		area: 'events',
		weight: 2,
		subjects: ['Events rate limited during an outage', 'Lost events during our incident', '429 from the event endpoint'],
		open: [
			`During our outage on {pastday}, Beacon stopped taking events from {project} after the first few minutes: the SDK logged 429s for over an hour. That was exactly when we needed the data.`,
			`We got rate limited by Beacon in the middle of an incident. Is there a limit on events per minute, and can we raise it?`
		],
		quick: [`Do events that get rate limited count towards our quota?`, `No, only accepted events count.`],
		reply: `Sorry that happened at the worst moment. Could you tell me the time window and send a few of the SDK's log lines with the 429s?`,
		need: `the time window and a few of the SDK's log lines`,
		escalate: `{project} hit 429s on event intake during the customer's outage. They want to know about limits; may turn into a plan question.`,
		turns: [
			[`It was {pastday} from about {incidentTime} UTC, for an hour or so. Log lines below.`, `Thanks. Your plan allows {rateLimit} events a minute for each project, and in that hour {project} sent over {spike} a minute: the same error, retried in a tight loop by your job runner. Beacon takes events up to the limit and turns the rest away with a 429.`, arts.ingest429],
			[`So the retry loop flooded it. What can we do so that the important events still get through next time?`, `Two things. Give that error a sample rate, or use the SDK's rate limit option, so that one error can't use up the whole minute; and fix the retry loop, which will have hurt your queue as well. Then other errors still have room under the limit.`],
			[`Do the events you turned away count towards the quota?`, `No. Only events we accept count.`]
		],
		fixed: [`Added the rate limit option and fixed the retry loop. Thanks for the clear answer.`, `Understood, all changed. Thanks.`],
		team: {
			key: 'billing',
			reply: `Thanks. In that hour {project} sent over {spike} events a minute, past your plan's limit of {rateLimit} a minute for each project, so the rest were turned away with 429s. A higher limit means a change of plan or a temporary raise, and both are for the billing team to arrange, so I've passed this to {mate}.`,
			handover: `Customer wants a higher per-project event limit after an incident on {pastday}; currently {rateLimit}/min on {plan}. Please talk them through the options.`
		},
		request: [`Could Beacon keep a sample of what it turned away, so that we at least see the shape of it?`, `Not today. I've logged it as a feature request.`],
		outcomes: ['answered', 'answered', 'team', 'team', 'request']
	},
	{
		id: 'levels',
		area: 'events',
		weight: 1,
		subjects: ['Warnings show as errors', 'Every event is level error', 'Log levels wrong in Beacon'],
		open: [
			`Every event from {project} arrives with level "error", including the ones we log as warnings. Our alerts can't tell the two apart.`,
			`In Beacon all our events have the level error, even plain warnings. Is the level being ignored?`
		],
		quick: [`Which levels does Beacon know?`, `debug, info, warning, error and fatal. Anything else is stored as error.`],
		reply: `Thanks. Could you send what your app sends for one event that should be a warning, and tell me how your logging is wired to the SDK?`,
		need: 'one warning event as your app sends it, and how your logging is wired to the SDK',
		escalate: `Events from {project} all stored with level error, warnings included. Could be how we read the level.`,
		turns: [
			[`Here's the payload our handler sends for one of them, from its debug log. We send through our own handler, which passes on the record's level name.`, `Thanks. The event has "level": "WARN". Beacon knows five levels, debug, info, warning, error and fatal, and stores anything else as error, which is the default. Your handler passes on the name your logging library uses, WARN, and that isn't one of the five.`, arts.levelEvent],
			[`So we need to turn WARN into warning ourselves?`, `Yes, in your handler: WARN to warning, and if you use them, TRACE to debug and CRITICAL to fatal. The SDK's own logging integration does that, which is why most projects never see it.`],
			[`Will the events already stored as error change?`, `No, they keep the level they arrived with. New events will have the right one.`]
		],
		fixed: [`Mapped the levels and warnings are warnings again. Thanks.`, `Fixed in our handler. Cheers.`],
		request: [`Could Beacon accept WARN as well? It's what half the logging libraries call it.`, `Fair point. I've logged a feature request to accept common names such as WARN and CRITICAL.`],
		outcomes: ['answered', 'answered', 'answered', 'request', 'request']
	},
	{
		id: 'grouping',
		area: 'events',
		weight: 1,
		subjects: ['Different errors merged into one issue', 'Grouping is wrong', 'Unrelated errors grouped together'],
		open: [
			`Beacon puts completely different errors from {project} into one issue. A timeout, a KeyError and a bad form value all sit under the same title.`,
			`One issue in {project} has collected {groupCount} events that have nothing to do with each other. It's impossible to see what's new.`
		],
		quick: [`Can I merge two issues by hand?`, `Yes: select both in the issue list and choose Merge.`],
		reply: `Thanks. Could you send the stack traces of two events from that issue that you think should be separate?`,
		need: 'the stack traces of two events that should be separate',
		escalate: `Customer says unrelated errors from {project} land in one issue and asks whether the API merges them.`,
		turns: [
			[`Here are two of them.`, `Thanks. Both stacks end in the same frame of your code, {wrapper} in {wrapperFile}, and Beacon groups by the deepest frame in your own code. So every error that passes through that helper lands in the same issue, whatever the error was.`, arts.groupingStacks],
			[`That's our error helper; everything goes through it. Can we tell Beacon to look past it?`, `Yes. Mark the file as not part of your app in the project's settings, under "Stack trace rules", or with the SDK's in_app_exclude option. Grouping then uses the next frame down, which is where the errors really differ.`],
			[`Will that split the existing issue?`, `No, existing events stay where they are. New events group the new way, so you'll see a new issue appear for each kind of error.`]
		],
		fixed: [`Excluded the helper and the new events split nicely.`, `Done, separate issues now. Thanks.`],
		request: [`Could Beacon spot helpers like ours on its own?`, `Not today; I've logged it as a feature request with your example.`],
		outcomes: ['answered', 'answered', 'answered', 'request']
	},
	{
		id: 'environment',
		area: 'events',
		weight: 1,
		subjects: ['Staging events marked as production', 'Wrong environment on events', 'Production alerts firing from staging'],
		open: [
			`Our production alerts for {project} keep firing on errors from staging. Looking closer, the staging events carry the environment "production".`,
			`Events from our staging servers show up as production in Beacon, so the production dashboard is full of test noise.`
		],
		quick: [`Can an alert apply to one environment only?`, `Yes. Each alert has an environment setting, and "all" is the default.`],
		reply: `Thanks. Could you tell me how the SDK gets its environment, and send the JSON of one staging event?`,
		need: 'how the SDK gets its environment and the JSON of one staging event',
		escalate: `Staging events for {project} stored as production. Customer suspects we overwrite the environment.`,
		turns: [
			[`It reads BEACON_ENVIRONMENT. Here's an event from a staging box.`, `Thanks. The event says "environment": "production" and the server name is a staging host, so the value came from the process. Your Dockerfile sets BEACON_ENVIRONMENT=production when the image is built, and the same image runs in staging, where nothing overrides it.`, arts.envEvent],
			[`Of course, we build once and promote. Where should we set it?`, `In each environment's deployment rather than in the image, so the same image picks up "staging" or "production" from wherever it runs.`],
			[`Can we fix the events that already came in with the wrong environment?`, `No, events keep what they arrived with. The noise will drop out of the dashboard's time range.`]
		],
		fixed: [`Moved the variable to the deployments; staging shows as staging now.`, `Fixed, and the production alerts are quiet again.`],
		outcomes: ['answered', 'answered', 'answered', 'waiting']
	},
	{
		id: 'sdk-upgrade',
		area: 'events',
		weight: 1,
		subjects: ['App crashes after the SDK upgrade', 'Error on start-up after upgrading', 'beacon-python 3.0 breaks our app'],
		open: [
			`After upgrading to beacon-python 3.0, our {project} service won't start: it crashes in beacon.init.`,
			`We upgraded the SDK and the app now dies on start-up. Rolling back fixes it. Is 3.0 broken?`
		],
		quick: [`Where are the SDK's upgrade notes?`, `Each SDK's changelog has an "Upgrading" section for every major version.`],
		reply: `Sorry about that. Could you send the full traceback and your call to init?`,
		need: 'the full traceback and the init call',
		escalate: `{project} crashes in init after the SDK 3.0 upgrade. Could someone confirm whether it's the SDK or how they call it?`,
		turns: [
			[`Here's the traceback, and the call.`, `Thanks. 3.0 renamed the "attach_stacktrace" argument to "stack_traces", as the upgrade notes say, and init no longer takes the old name. Your call still passes attach_stacktrace=True, which is what raises the TypeError.`, arts.initTraceback],
			[`We missed that in the notes. Anything else renamed?`, `"request_bodies" became "max_request_body_size". If you don't set it, the rename above is the only change your call needs.`],
			[`Will 2.x keep getting fixes?`, `It gets bug fixes until the end of March; new work goes into 3.x.`]
		],
		fixed: [`Renamed the argument and it starts fine. Thanks.`, `All working on 3.0 now.`],
		team: {
			key: 'sdk',
			reply: `Thanks. Your init call is right for 3.0, and the traceback ends inside the SDK's own gevent support, so this looks like a bug in 3.0 itself. SDK problems go to the SDK team, so I've passed it to {mate} with the traceback.`,
			handover: `beacon-python 3.0 crashes in init under gevent for this customer; their call matches the 3.0 docs. Traceback in the ticket.`
		},
		outcomes: ['answered', 'answered', 'answered', 'team', 'team']
	},
	{
		id: 'alert-window',
		area: 'alerts',
		weight: 2,
		subjects: ['Alert did not fire during an outage', 'Missed alert', 'Why did our alert stay quiet?'],
		open: [
			`Our alert "{alert}" on {project} didn't fire during {pastday}'s outage. We had hundreds of errors over about twenty minutes and nobody was told.`,
			`We had a twenty-minute outage and Beacon didn't alert anyone. The alert is on, it isn't muted, and the threshold is {threshold}.`
		],
		quick: [`How quickly does an alert fire once it's over the threshold?`, `Within a minute of the minute that crossed it.`],
		reply: `Sorry, that's exactly what alerts are meant to catch. Could you tell me roughly when the outage started, and send the alert's settings as the web app shows them?`,
		need: `the outage's start time and the alert's settings`,
		escalate: `Alert "{alert}" (id {alertId}) on {project} didn't fire during an outage on {pastday}. Customer asks whether alert evaluation is broken.`,
		turns: [
			[`It started around {incidentTime} UTC. Here are the settings, and the project's chart for those minutes.`, `Thanks. The threshold of {threshold} means {threshold} matching events within one minute. During the outage the errors were spread out: the busiest minute had {peak}, under the threshold, even though the total over twenty minutes was far higher. So the alert did what it was set to do, but the setting didn't fit this kind of failure.`, arts.alertCounts],
			[`I see. We set {threshold} thinking it was per hour. What should it be?`, `Look at the busiest minute of a normal day for that project and set it a little above that. From its history, {project} rarely goes over {normal} a minute, so something like {suggest} would have fired within the first few minutes.`],
			[`Will changing the threshold in the web app reset anything?`, `No. The history stays, and the new threshold applies from the next minute.`]
		],
		fixed: [`Lowered it to {suggest}; it fired on a small blip this morning, which is what we wanted.`, `Changed it, thanks. Much clearer now.`],
		request: [`Could alerts look at a longer window than one minute? That's how we think about outages.`, `Not today. I've logged a feature request for longer windows, with your example.`],
		outcomes: ['answered', 'answered', 'answered', 'request', 'request']
	},
	{
		id: 'nightly-alert',
		area: 'alerts',
		weight: 1,
		subjects: ['Alert fires every night', 'Nightly false alarm', 'Woken up by Beacon every night'],
		open: [
			`"{alert}" on {project} fires every night at about {nightTime} UTC and wakes whoever is on call. By the morning there's nothing wrong.`,
			`We get an alert from Beacon at night, every night, and it's always a false alarm. People are starting to ignore Beacon alerts in general, which is worse.`
		],
		quick: [`Can an alert ignore warnings?`, `Alerts count errors and fatals by default; warnings only if you tick "include warnings".`],
		reply: `Thanks. Could you send the alert's history for the last week, and one of the events from a night it fired?`,
		need: `the alert's history for the last week and one event from a night it fired`,
		escalate: `Alert "{alert}" fires nightly for {project}; customer says nothing is wrong and asks whether alert timing is off.`,
		turns: [
			[`Here's the history; the top message is the same every night.`, `Thanks. The events that trip it each night come from your nightly job, {job}: "{nightMsg}". The job logs that at error level for every record it skips, and on a normal night it skips a few hundred within a couple of minutes, which crosses the threshold.`, arts.alertNightly],
			[`Those skips are expected. How do we keep them out of the alert?`, `Either log the skips at warning level, so the alert, which counts errors, leaves them out, or give the job its own environment, say "batch", and set the alert to production only. The first is the smaller change.`],
			[`Would muting the alert at night be easier?`, `It would, but then a real problem at night would be missed as well. Changing the level keeps the alert useful.`]
		],
		fixed: [`Changed the job's skips to warnings and last night was quiet.`, `Done, no more night-time alarms. Thanks.`],
		outcomes: ['answered', 'answered', 'answered', 'waiting']
	},
	{
		id: 'muted-twin',
		area: 'alerts',
		weight: 1,
		subjects: ['Muted alert still sends notifications', 'Muting does not work', 'Still getting alerts after muting'],
		open: [
			`I muted "{alert}" yesterday because we know about the problem and are fixing it, but it keeps posting to Slack.`,
			`Muting doesn't seem to work. We muted "{alert}" and still get the notifications.`
		],
		quick: [`Does muting an alert stop it being evaluated?`, `No. It still evaluates and keeps its history; it just doesn't notify anyone.`],
		reply: `Thanks. Could you send the link to the alert you muted, and one of the notifications you got after muting it?`,
		need: 'the link to the alert you muted and a notification that came after',
		escalate: `Customer muted alert "{alert}" but still gets notifications. Could the API team check its muted state?`,
		turns: [
			[`Here's the link I used and the latest Slack message. I've put both alerts side by side as well.`, `Thanks. You muted "{alert}" on the {stagingProject} project, and the notifications come from the alert of the same name on {project}. Both projects have an alert called "{alert}", and the one on {project} is still unmuted.`, arts.mutedTwo],
			[`Same name, of course. So I need to mute the one on {project}?`, `Yes. Its page is under {project}, Alerts. Muting it stops its notifications straight away, and unmuting it later starts them again.`],
			[`Can we name alerts so this doesn't happen again?`, `Names are free text, so a prefix with the environment, such as "[prod] {alert}", is what most teams do.`]
		],
		fixed: [`Muted the right one, quiet now. Thanks.`, `My mistake, all sorted.`],
		outcomes: ['answered', 'answered', 'answered', 'waiting']
	},
	{
		id: 'slack-delay',
		area: 'alerts',
		weight: 2,
		subjects: ['Slack notifications late', 'Alerts reach Slack minutes late', 'Delayed alert messages'],
		open: [
			`Our alerts reach Slack {delay} minutes or more after they fire. The alert's history shows the right time, but the message in #{channel} turns up much later.`,
			`Beacon alerts arrive late in Slack, sometimes by over {delay} minutes. Email is on time.`
		],
		quick: [`Can one alert notify both Slack and email?`, `Yes, add both under the alert's Notifications.`],
		reply: `Thanks. Could you send one late notification with the time the alert fired and the time the message appeared in Slack?`,
		need: `one late notification with both times`,
		escalate: `Slack notifications delayed for {co}; customer asked us whether the API is slow. Probably notifications, but checking.`,
		turns: [
			[`One from this morning: fired at {firedTime}, in Slack at {lateTime}. Here's the delivery log from the alert's page.`, `Thanks. The delivery log shows Slack answering "rate limited" for your webhook: {nAlerts} alerts post to the same channel through one webhook, and Slack accepts about one message a second on each. When several fire together the messages queue up and go out one by one, with retries.`, arts.slackDelivery],
			[`So we're just sending too many to one channel?`, `In bursts, yes. Turning on "Group notifications" on the busiest alerts sends one message a minute that lists all of them, or you can give each team's alerts their own channel and webhook.`],
			[`Will grouping hide anything?`, `No. The grouped message lists every alert that fired in that minute, with links.`]
		],
		fixed: [`Turned on grouping; messages arrive within a minute now.`, `Split the channels, no more delays. Thanks.`],
		team: {
			key: 'notify',
			reply: `Thanks. The delivery log shows Slack answering straight away and never refusing, so the messages are leaving us late: they sit in our notification queue first. That queue is the notifications team's, so I've passed this to {mate}.`,
			handover: `Slack messages for {co} leave our queue {delay}+ minutes after the alert fires; Slack answers 200 every time. Delivery log in the ticket.`
		},
		outcomes: ['answered', 'answered', 'team', 'team']
	},
	{
		id: 'pagerduty',
		area: 'alerts',
		weight: 1,
		subjects: ['PagerDuty incidents stay open', 'Recovered alerts not resolving in PagerDuty', 'PagerDuty integration'],
		open: [
			`When a Beacon alert recovers, the PagerDuty incident it opened stays open, so our on-call engineer has to close it by hand.`,
			`PagerDuty incidents from Beacon never resolve on their own any more. They used to.`
		],
		quick: [`Does Beacon resolve PagerDuty incidents when an alert recovers?`, `Yes, it sends a resolve when the alert goes back under its threshold.`],
		reply: `Thanks. Could you send the integration's delivery log for one alert that opened and then recovered? It's on the alert's page, under Notifications.`,
		need: 'the delivery log for one alert that opened and recovered',
		escalate: `PagerDuty incidents from alerts of {co} don't resolve on their own. Customer thinks the alert state in the API is wrong.`,
		turns: [
			[`Here's the log for "{alert}".`, `Thanks. The trigger and the resolve both went out, but with two different integration keys: the trigger with the key ending {key1}, the resolve with the old one ending {key2}. The alert was set up before you replaced the PagerDuty service on {pdDate}, and its resolve step still has the old key.`, arts.pagerdutyLog],
			[`We did rebuild the service. How do I update it?`, `Open the alert, then Notifications, PagerDuty, and save it once with the current integration key. That updates both steps together.`],
			[`Do other alerts have the same problem?`, `Any alert set up before {pdDate} that hasn't been saved since will. The integration's page lists the alerts using each key.`]
		],
		fixed: [`Saved the alerts again and incidents resolve on their own.`, `Fixed, thanks.`],
		team: {
			key: 'notify',
			reply: `Thanks. The log shows the resolve going to the right key and PagerDuty refusing it with an error we don't handle, so the resolve is dropped. That's the notifications team's, so I've passed this to {mate}.`,
			handover: `PagerDuty resolves for {co} refused with "event_action is invalid"; we drop them without retrying. Log in the ticket.`
		},
		outcomes: ['answered', 'answered', 'team', 'waiting']
	},
	{
		id: 'terraform-revert',
		area: 'alerts',
		weight: 1,
		subjects: ['Alert threshold keeps changing back', 'Threshold reset itself', 'Alert settings revert overnight'],
		open: [
			`Something keeps putting the threshold of "{alert}" back to {threshold}. I changed it to {newT} in the web app and it was {threshold} again the next morning.`,
			`Alert settings on {project} revert overnight. We change them and they change back.`
		],
		quick: [`Is there a Terraform provider for Beacon?`, `Yes, harbourlight/beacon on the Terraform registry; it covers projects and alerts.`],
		reply: `Thanks. Could you send the alert's change history? It's on the alert's page, under History.`,
		need: `the alert's change history`,
		escalate: `Threshold of alert "{alert}" reverts after the customer edits it. They ask if the API resets it.`,
		turns: [
			[`Here it is.`, `Thanks. Each change back was made through the API by your "{tfUser}" integration at about {tfTime} UTC, which looks like a scheduled Terraform run. Terraform has {threshold} in its configuration, so it sets the alert back to that every time it runs.`, arts.tfHistory],
			[`That's our platform team's nightly apply. So we should change it in Terraform?`, `Yes. Change the threshold in the Terraform configuration and let the next run apply it. Alerts that Terraform manages are best changed only there.`],
			[`Can we tell from the web app which alerts Terraform manages?`, `Alerts created by Terraform carry a "managed by Terraform" label on their page, as long as the module sets it, which recent versions do.`]
		],
		fixed: [`Changed it in Terraform and it stuck this time.`, `Sorted it with our platform team. Thanks.`],
		request: [`Could the web app warn before someone edits an alert that Terraform manages?`, `I've logged that as a feature request for the web app team.`],
		outcomes: ['answered', 'answered', 'answered', 'request']
	},
	{
		id: 'alert-email',
		area: 'alerts',
		weight: 1,
		subjects: ['Alert emails not arriving', 'No emails from Beacon alerts', 'Alert emails gone missing'],
		open: [
			`Our team stopped getting alert emails from Beacon around {pastday}. Slack notifications still come through.`,
			`Alert emails don't reach some of us any more. Slack is fine.`
		],
		quick: [`Which address do alert emails come from?`, `alerts@${MAIL}.`],
		reply: `Thanks. Could you send the delivery log for one alert email that didn't arrive? It's on the alert's page, under Notifications, Email.`,
		need: `the delivery log for one alert email that didn't arrive`,
		escalate: `Alert emails not arriving for {co}. Probably mail delivery, but the customer asked the API team.`,
		turns: [
			[`Here's the log for this morning's alert.`, `Thanks. We handed the emails to your mail server and it took them ("250 queued"), so they left us fine. After that your mail gateway decides, and messages taken and then not delivered usually end up in quarantine. Your IT team can search it for alerts@${MAIL}.`, arts.emailLog],
			[`IT found them in quarantine, all of them. Why would they suddenly be caught?`, `From the headers IT sent, your gateway started scoring messages with many links on {gwDate}, and alert emails carry a link for each event. Adding alerts@${MAIL} to the gateway's safe senders is the usual fix.`],
			[`Is there a plain-text version of the alert email?`, `Yes. In your notification settings you can choose "plain text, fewer links" for alert emails.`]
		],
		fixed: [`IT added the sender and the emails are back.`, `All arriving again. Thanks.`],
		team: {
			key: 'notify',
			reply: `Thanks. The log shows your mail server refusing our messages with "550 SPF check failed", so they never left us. Our sending set-up is the notifications team's, so I've passed this to {mate} to look at our records.`,
			handover: `Alert emails to {domain} refused with 550 SPF fail since {pastday}. Please check our sending records.`
		},
		outcomes: ['answered', 'answered', 'team', 'waiting']
	},
	{
		id: 'checker-blocked',
		area: 'uptime checks',
		weight: 2,
		subjects: ['Uptime check says down but the site is up', 'False downtime alerts', 'Outage reported that did not happen'],
		open: [
			`Beacon says {monitor} was down for {mins} minutes last night. It wasn't: our own logs and the load balancer show it up the whole time.`,
			`We keep getting downtime alerts for {monitor} from Beacon, and every time we look, the site is fine.`
		],
		quick: [`Which regions do uptime checks run from?`, `Frankfurt, London, Virginia, Oregon, Singapore and Sydney; each check uses three of them.`],
		reply: `Thanks. Could you send the check's results for one of the "down" periods? The check's page has a table of results with the region of each.`,
		need: `the check's results for one of the "down" periods`,
		escalate: `Uptime check for {monitor} reports down while the customer says it's up. They asked whether the API reports status wrongly.`,
		turns: [
			[`Here are the results from last night.`, `Thanks. Every failed result is from {badRegion}, where your site answered with a 503 challenge page, while the other regions got a 200. So the site was up, but it turned our checker in {badRegion} away. That pattern usually means a firewall or bot rule catching our checker's addresses there.`, arts.uptimeRegion],
			[`Our CDN did add a bot rule last week. What addresses do you check from?`, `They're on the "Checker addresses" page of the docs, by region, and they're the same for every customer. Letting them through the bot rule, or letting our checker's user agent "BeaconUptime/2" through, fixes it.`],
			[`Will the downtime come off our uptime figure?`, `You can mark the period as a false alarm on the check's page, and it's left out of the uptime figure and the status page.`]
		],
		fixed: [`Let your checkers through and no false alarms since.`, `Fixed the bot rule. Thanks.`],
		outcomes: ['answered', 'answered', 'answered', 'waiting']
	},
	{
		id: 'flapping',
		area: 'uptime checks',
		weight: 1,
		subjects: ['Flapping uptime check', 'Check goes up and down all day', 'Timeouts from one region'],
		open: [
			`Our check on {monitor} flips between up and down a dozen times a day. Each "down" lasts a minute or two.`,
			`Beacon keeps flipping {monitor} between up and down. Customers aren't complaining, but on-call is getting tired.`
		],
		quick: [`What's the default timeout for an uptime check?`, `10 seconds; it can go up to 30.`],
		reply: `Thanks. Could you send the results table for one of the down blips?`,
		need: 'the results for one of the down blips',
		escalate: `Uptime check on {monitor} flaps several times a day; customer suspects our checker.`,
		turns: [
			[`Here's one from this afternoon.`, `Thanks. Each failure is a timeout at {timeout} seconds from {slowRegion}, and responses from there are slow even when they pass, six to ten seconds against under 400 ms elsewhere. It looks as if requests from {slowRegion} reach an origin that's slow to start, and the slowest run past the timeout.`, arts.uptimeFlap],
			[`Our CDN does send that region to a smaller origin. Can we make the check more forgiving?`, `Yes: raise the timeout to 30 seconds, or set the check to report down only when two regions fail at once. Either stops single slow responses from paging anyone.`],
			[`Would checking less often help?`, `Not with flapping: the slow responses would still fail, just less often. The two-region setting is the one aimed at it.`]
		],
		fixed: [`Set it to two regions; no flaps since.`, `Raised the timeout and fixed the origin; all steady.`],
		request: [`Could the check retry once before reporting down?`, `There's no retry option today; I've logged it as a feature request.`],
		outcomes: ['answered', 'answered', 'answered', 'request']
	},
	{
		id: 'stale-cert',
		area: 'uptime checks',
		weight: 1,
		subjects: ['Certificate expiry warning is wrong', 'SSL expiry alert, but we renewed', 'Wrong certificate date'],
		open: [
			`Beacon warns that the certificate for {host} expires in {days} days. We renewed it a month ago; browsers show the new one, valid until next year.`,
			`We keep getting certificate expiry warnings for {host}, even though the certificate was renewed.`
		],
		quick: [`How early does Beacon warn about a certificate expiring?`, `30 days ahead, then at 14 and 3.`],
		reply: `Thanks. Could you send the certificate details from the check's last result, and the output of "dig {host} A" and "dig {host} AAAA"?`,
		need: `the check's certificate details and the dig output`,
		escalate: `Certificate warning for {host} after renewal. Customer asks whether we cache certificates.`,
		turns: [
			[`Here are both.`, `Thanks, that shows it. {host} has an AAAA record pointing at {ipv6}, an old server, and our checkers prefer IPv6 when a name has it. That server still has the old certificate. Browsers on your network use IPv4, which goes to the new server.`, arts.digCert],
			[`We forgot the AAAA record when we moved. Remove it, I take it?`, `Either remove it or point it at the new server. Once DNS has caught up, the next check reads the new certificate and the warning clears.`],
			[`Can the check use IPv4 only?`, `Yes, there's an "IPv4 only" option in the check's settings, but fixing the record is better, since some of your visitors use IPv6 too.`]
		],
		fixed: [`Removed the old record and the warning is gone.`, `Fixed the DNS, thanks.`],
		outcomes: ['answered', 'answered', 'answered', 'waiting']
	},
	{
		id: 'maintenance-dst',
		area: 'uptime checks',
		weight: 2,
		after: CLOCKS_BACK + DAY,
		subjects: ['Maintenance window ignored', 'Alerts during scheduled maintenance', 'Maintenance window off by an hour'],
		open: [
			`Our weekly maintenance window didn't work this week: Beacon paged us during the last hour of our work, as if nothing was planned.`,
			`Since the weekend the maintenance window for {monitor} seems to end an hour early. We got alerts for the last hour of our work.`
		],
		quick: [`Can maintenance windows repeat?`, `Yes: daily, weekly or monthly.`],
		reply: `Thanks. Could you send the window's settings as they show on the check's page?`,
		need: `the maintenance window's settings`,
		escalate: `Maintenance window for {monitor} not honoured since the weekend. Customer asks whether the API returns the wrong times.`,
		turns: [
			[`Here they are.`, `Thanks. The window is saved as {mStartUtc} UTC, because it was set up in the summer as {mStartLocal} local time and stored in UTC. Since the clocks went back on 25 October, {mStartUtc} UTC is {mStartWinter} local time, so the window now starts and ends an hour early, and the last hour of your work falls after it.`, arts.maintWindow],
			[`So it'll be wrong every spring and autumn?`, `Only for windows stored in UTC. If you edit the window and set its time zone to {tz}, it follows the local clock through the changes.`],
			[`Do we need to change all our windows?`, `Every window created before 1 October is in UTC, so those, yes. Newer ones ask for a time zone.`]
		],
		fixed: [`Set the time zone on all three windows. Thanks.`, `Fixed, the window starts on time now.`],
		request: [`Could you convert the old windows for everyone? We can't be the only ones.`, `I've logged that as a feature request with the uptime team.`],
		outcomes: ['answered', 'answered', 'answered', 'request']
	},
	{
		id: 'status-percent',
		area: 'uptime checks',
		weight: 1,
		subjects: ['Status page uptime is wrong', 'Uptime percentage does not match', 'Status page figure too low'],
		open: [
			`Our public status page shows {pct}% uptime last month for {monitor}, but adding up the outages ourselves we get well above 99.9%.`,
			`The uptime figure on our status page doesn't match the check's own history. Customers are asking about it.`
		],
		quick: [`Can a status page show more than one check?`, `Yes. Each component shows one check, and a page can have as many components as you like.`],
		reply: `Thanks. Could you send the check's monthly summary from its page, and the figure the status page shows?`,
		need: `the check's monthly summary and the status page figure`,
		escalate: `Status page uptime for {monitor} lower than the check history suggests. Customer asked the API team.`,
		turns: [
			[`Here are both, side by side.`, `Thanks. The status page counts maintenance windows as downtime unless the component is set to leave them out, and you had {mhours} hours of maintenance last month. Leaving those out gives the {truePct}% you worked out.`, arts.uptimeMonthly],
			[`Where do we change that?`, `In the status page settings: open the component and tick "Leave out maintenance windows". The figures for past months are worked out again straight away.`],
			[`Do periods marked as false alarms count?`, `No, false alarms are always left out.`]
		],
		fixed: [`Ticked it and the page shows {truePct}% now. Thanks.`, `Fixed, and the questions have stopped.`],
		team: {
			key: 'uptime',
			reply: `Thanks. Your maintenance windows are already left out, and the check's own history gives {truePct}%, so the status page is working the figure out wrongly. Status pages are the uptime team's, so I've passed it to {mate}.`,
			handover: `Status page shows {pct}% for {monitor} last month; check history gives {truePct}% with maintenance left out. Looks like a calculation bug.`
		},
		outcomes: ['answered', 'answered', 'team', 'team']
	},
	{
		id: 'heartbeat',
		area: 'uptime checks',
		weight: 1,
		subjects: ['Heartbeat alerts though the job ran', 'Cron heartbeat missed', 'Heartbeat late every night'],
		open: [
			`Our heartbeat for the nightly {job} job alerts every night that the ping is late, but the job runs and pings every time.`,
			`The heartbeat for our {job} job keeps alerting "missed", even though our logs show the ping going out.`
		],
		quick: [`How does a heartbeat check work?`, `Your job requests the heartbeat's URL when it runs, and Beacon alerts if a ping doesn't arrive within the schedule plus the grace period.`],
		reply: `Thanks. Could you send the heartbeat's settings and the last few pings it received?`,
		need: `the heartbeat's settings and the last few pings`,
		escalate: `Heartbeat for the customer's {job} job alerts nightly though pings arrive. Asked whether the API times them wrongly.`,
		turns: [
			[`Here are both.`, `Thanks. The heartbeat expects a ping at {hbExpected} UTC with {grace} minutes' grace, and the pings now arrive after {hbActualHour}:00. Your job sends its ping when it finishes, and since it started processing more records it finishes later, past the grace period.`, arts.heartbeatPings],
			[`True, the job got slower when we added the new supplier's data. Should we ping at the start instead?`, `A ping at the start tells you it started, and a second ping at the end to the "/complete" URL tells you it finished; the heartbeat can then alert on either. Or simply widen the grace period to cover the longer run.`],
			[`Is there a maximum grace period?`, `Up to 24 hours, so there's plenty of room.`]
		],
		fixed: [`Widened the grace period; no false alarms since.`, `Moved to start and finish pings, works well.`],
		outcomes: ['answered', 'answered', 'answered', 'waiting']
	},
	{
		id: 'chart-series',
		area: 'dashboards',
		weight: 1,
		subjects: ['Dashboard chart empty', 'Widget shows no data', 'Chart blank for the last 90 days'],
		open: [
			`One of the widgets on our "{dashboard}" dashboard is empty whenever we pick a range longer than a week. With shorter ranges it shows data.`,
			`The "{widget}" chart on our dashboard goes blank for the last 90 days but works for 7 days.`
		],
		quick: [`How many series can one chart show?`, `Up to 50; tables can show more rows.`],
		reply: `Thanks. Could you send the dashboard's JSON (Dashboard settings, Export JSON)?`,
		need: `the dashboard's JSON`,
		escalate: `Widget on the "{dashboard}" dashboard of {co} is empty for long ranges. Customer asks whether the API returns the data.`,
		turns: [
			[`Here it is.`, `Thanks. The widget groups by release, and over 90 days {project} has had {nReleases} releases. A chart shows at most 50 series, and when there are more than that, the web app shows nothing instead of the first 50.`, arts.dashboardJson],
			[`Any way round it?`, `Group by environment instead, or show the ten busiest releases with the widget's "Top N" option; both stay under the limit.`],
			[`Is 50 a fixed limit?`, `Yes, for one chart. Tables can show more rows.`]
		],
		fixed: [`Switched to the top 10 releases and it shows again.`, `Grouped by environment, chart is back.`],
		team: {
			key: 'web',
			reply: `Thanks. The dashboard is fine, and the data is there for the whole range; the chart should show the first 50 releases and doesn't, which is a bug in the web app. That's the web app team's, so I've passed it to {mate}.`,
			handover: `"{dashboard}" widget grouped by release goes blank with more than 50 series instead of showing 50. Dashboard JSON in the ticket.`
		},
		outcomes: ['answered', 'answered', 'team', 'team']
	},
	{
		id: 'slow-dashboard',
		area: 'dashboards',
		weight: 1,
		subjects: ['Dashboard takes a minute to load', 'Slow dashboard', 'Dashboard gives up loading'],
		open: [
			`Our "{dashboard}" dashboard takes close to a minute to load and sometimes gives up with "Some widgets could not load".`,
			`The dashboard we put on the office screen loads more slowly every week. It's unusable in the mornings now.`
		],
		quick: [`How often does a dashboard refresh on its own?`, `Every minute by default; you can choose 5 or 15 minutes, or off.`],
		reply: `Thanks. Could you send the dashboard's JSON, and tell me which time range you normally view it with?`,
		need: `the dashboard's JSON and the usual time range`,
		escalate: `Dashboard "{dashboard}" for {co} loads very slowly. Customer suspects the API.`,
		turns: [
			[`Here's the JSON. We look at the last 90 days.`, `Thanks. The dashboard has {nWidgets} widgets, and each one reads 90 days of events across up to {nProj2} projects when it loads, all at the same moment. That's a lot of work to do in one go.`, arts.dashboardBig],
			[`What would you suggest?`, `Split it: a 24-hour dashboard for the office screen, and the 90-day charts on a second dashboard that people open when they need them. Widgets that show the same thing in two ways can go too.`],
			[`Does the auto-refresh make it worse?`, `It does: the screen loads every widget again every minute. Every five minutes is plenty for a wall display.`]
		],
		fixed: [`Split it into two dashboards; the office one loads in seconds.`, `Trimmed it down, much faster.`],
		team: {
			key: 'web',
			reply: `Thanks. {nWidgets} widgets over 90 days should still load in a few seconds, and in our traces the data comes back quickly and it's the page itself that stalls, so I've passed this to {mate} on the web app team.`,
			handover: `Dashboard "{dashboard}" ({nWidgets} widgets) takes about a minute; data requests return in seconds, then the page stalls. JSON in the ticket.`
		},
		outcomes: ['answered', 'answered', 'team']
	},
	{
		id: 'last-save',
		area: 'dashboards',
		weight: 1,
		subjects: ['Widgets disappeared from our dashboard', 'Dashboard changes lost', 'Our edits to the dashboard vanished'],
		open: [
			`Two widgets I added to "{dashboard}" on {pastday} have disappeared. I definitely saved.`,
			`Changes to our dashboard keep vanishing. I add a widget, save, and the next day it's gone.`
		],
		quick: [`Does a dashboard keep its old versions?`, `Yes, every save is kept under Dashboard settings, History.`],
		reply: `Thanks. Could you send the dashboard's history (Dashboard settings, History)?`,
		need: `the dashboard's history`,
		escalate: `Widgets vanish from dashboard "{dashboard}". Customer wonders whether the API loses saves.`,
		turns: [
			[`Here it is.`, `Thanks. Your save at {time} added the widgets, and {colleague} saved the dashboard a little later, at {time2}, from a copy opened before your change. A save replaces the whole dashboard, so that save put back the version without your widgets.`, arts.dashboardHistory],
			[`So whoever saves last wins?`, `Yes. The history keeps every version, so you can get yours back: open the version from {time} and choose Restore, then add back anything {colleague} changed.`],
			[`Will restoring a version change the dashboard's link?`, `No, the link stays the same.`]
		],
		fixed: [`Restored my version and redid {colleague}'s change. Thanks.`, `Got them back from the history.`],
		request: [`Could the web app warn when a colleague has saved the dashboard since you opened it?`, `I've logged a feature request for that with the web app team.`],
		outcomes: ['answered', 'answered', 'answered', 'request', 'request']
	},
	{
		id: 'overage',
		area: 'account and billing',
		weight: 2,
		subjects: ['Invoice higher than usual', 'Unexpected overage charge', 'Question about our {month} invoice'],
		open: [
			`Our invoice for {month} is {invoiceTotal}, against the {planPrice} we normally pay. There's an "event overage" line we've never seen before. Is the API counting our events correctly?`,
			`We were charged an overage this month. Could you explain where it comes from? I can't square it with what we usually send.`
		],
		quick: [`What happens when we go over our monthly event quota?`, `Events keep being accepted and the extra is billed as overage, unless you've turned on hard caps.`],
		reply: `Thanks. Let me look at your usage for the month and come back to you.`,
		need: 'the invoice number',
		escalate: `Overage on the {month} invoice for {co}. Customer suspects we counted wrongly.`,
		turns: [
			[`Thanks. If it helps, our usage page shows a big jump around the {spikeDayOrd}.`, `Thanks, that matches. On {spikeDay} {month} {project} sent {spikeEventsFmt} events in a day, against a normal {normalEventsFmt}: the same error from one release, sent in a loop. That day alone took you past the monthly quota, and the overage is the events above it.`, arts.usageDaily],
			[`That was the bad release we rolled back. Is there anything we can do about the charge?`, `The overage stands for {month}, but spike protection would have capped it: with it on, a project that sends more than ten times its normal volume in an hour is held at that level. It's under Settings, Usage, and it costs nothing.`],
			[`Does spike protection drop events we'd want?`, `Only the excess in that hour. Everything up to ten times the normal volume still comes in.`]
		],
		fixed: [`Turned on spike protection. We'll take the charge, lesson learned.`, `Understood, and spike protection is on now. Thanks for explaining.`],
		team: {
			key: 'billing',
			reply: `Thanks, that matches: on {spikeDay} {month} {project} sent {spikeEventsFmt} events, the same error sent in a loop, and that took you past the quota. Whether any of the overage can be credited is up to the billing team, so I've passed this to {mate}.`,
			handover: `Overage on the {month} invoice for {co} from a one-day spike ({spikeEventsFmt} events from a release loop). Customer asks for a credit.`
		},
		outcomes: ['team', 'team', 'team', 'answered', 'answered']
	},
	{
		id: 'quota-emails',
		area: 'account and billing',
		weight: 1,
		subjects: ['Too many quota emails', 'Quota warning emails every day', 'Usage warnings'],
		open: [
			`We get a quota warning email from Beacon almost every day this month: 50%, then 75%, then again. Is something wrong with how usage is counted?`,
			`Why are we getting so many usage warning emails? The numbers in them don't seem to add up.`
		],
		quick: [`Where can we see our usage for the month?`, `Settings, Usage, with a daily breakdown by project.`],
		reply: `Thanks. Could you forward two of the emails, so I can see which warnings they are?`,
		need: 'two of the warning emails',
		escalate: `Customer gets many quota warning emails and asks whether usage counting is off.`,
		turns: [
			[`Here are two from this week.`, `Thanks. They're warnings for different projects: each project has its own share of the quota, and you get an email when any project passes 50, 75 or 90% of its share. With {nproj} projects that's a lot of emails, though the organization as a whole is at {usedPct}%.`, arts.quotaEmails],
			[`We don't need warnings for each project. Can we turn them off?`, `Yes: under Settings, Usage, "Warn me about", choose "organization only". You'll still get the organization-wide warnings at 75 and 90%.`],
			[`Does a project's share stop it sending once it's used up?`, `No, it's only used for the warnings unless you turn on hard caps, which you haven't.`]
		],
		fixed: [`Changed it to organization only. Much quieter.`, `Done, thanks.`],
		request: [`Could the warnings come as one daily digest instead?`, `I've logged that as a feature request for the billing team.`],
		outcomes: ['answered', 'answered', 'answered', 'request']
	}
];

// ---------------------------------------------------------------------------------------------------------
// Shared parts of a conversation.
const backstories = [
	`Some context: we're {seats} engineers at {co} and Beacon is the first place we look when something breaks.`,
	`We've used Beacon for about {years} years and it's usually rock solid, so this surprised us.`,
	`I look after our tooling at {co}, so Beacon questions tend to land on my desk.`,
	`Apologies if this is already in the docs; I had a look and couldn't find it.`,
	`We're in the middle of a big release week, so I'd be grateful for a quick look.`,
	`I'm fairly new to {co} and inherited our Beacon set-up from a colleague who has left, so bear with me.`,
	`We run most of our services on Kubernetes in {cloudRegion}, in case that matters.`,
	`This came up in our on-call review this morning and I said I'd ask you.`
];
const firstGreetings = ['Hi,', 'Hello,', 'Hi Beacon team,', 'Hello support,', 'Hi there,', ''];
const custSignoffs = ['Thanks,\n{first}', 'Many thanks,\n{full}\n{title}, {co}', 'Cheers,\n{first}', 'Best regards,\n{full}\n{title}\n{co}', '{first}', 'Kind regards,\n{full}'];
const replySignoffs = ['Thanks,\n{first}', '{first}', 'Cheers, {first}', '', 'Thanks again,\n{first}'];
const agentSignoffs = ['Best,\n{agent}\nBeacon Support', 'Thanks,\n{agent}', 'All the best,\n{agent} | Beacon Support', 'Kind regards,\n{agent}\nBeacon Support'];
const engSignoffs = ['{eng}\nBeacon API team', 'Thanks,\n{eng}', 'Best,\n{eng} (API team)', 'Cheers,\n{eng}'];
const engIntros = [`I'm {eng} from the API team; {agent} asked me to take a look.`, `{eng} here, from the API team. {agent} passed your ticket to me.`, `I work on Beacon's API, and I've picked up your ticket from {agent}.`];
const agentIntros = [`Thanks for getting in touch.`, `Thanks for the clear description; it helps a lot.`, `Sorry for the wait, it's been a busy morning here.`, `Thanks for reaching out about this.`];
const custAcks = [`Thanks, that helps.`, `OK, understood.`, `Right.`, `Thanks for the quick reply.`, `Ah, I see.`, `Makes sense.`, `Great, thanks.`];
const vagueSubjects = ['Help please', 'API question', 'Problem with Beacon', 'Urgent: production issue', '(no subject)', 'Quick question', 'Something odd', 'A couple of questions'];
const holdings = [`Good question. Let me check with a colleague and come back to you.`, `Let me look into that properly and get back to you.`, `I want to be sure before I answer, so give me a little time on that one.`];
const notes = [
	`Checked {org} in the admin tool: {plan} plan, {nproj} projects, nothing unusual in the last 30 days.`,
	`{co} have been with us since {since}; first ticket from them this quarter.`,
	`Tried the same on our test organization and couldn't make it happen straight away.`,
	`Customer sounds pressed for time. Prioritising.`,
	`Similar question came up last week; the docs page doesn't cover it well.`,
	`Usage for {org} is normal: {usedFmt} events in the last 30 days, {usedPct}% of the plan.`
];
const escalateLeads = [`Escalating to the API team: `, `Passing this to the API team. `, `API team, could one of you take this? `, `Sending to the API queue. `];
const pickups = [`Picked up. Looking at {org} now.`, `Taking this one; I'll reply to the customer directly.`, `Mine. Will look this afternoon.`, `On it.`];
const waitNotes = [`Looked at {org} from our side and nothing stands out. We need {need} before we can say more.`, `Nothing obvious in our logs for {org}. Can support chase {need}? Can't go further without it.`];
const nudges1 = [`Just checking in. When you have a moment, we still need {need} to look any further. We'll pick it up as soon as it arrives.`, `Following up on my last message: could you send {need}? No rush; I just want to make sure it didn't get buried.`, `I don't want this to fall through the cracks. If you can send {need}, the API team can carry on from there.`];
const nudges2 = [`I haven't heard back, so I'll assume things are fine for now. If it's still a problem, reply here with {need} and we'll take it from there.`, `One last nudge from me. Whenever you're ready, reply to this email and the ticket comes back to us with everything above.`];
const thanksLines = [`Thanks, I'll look out for it.`, `Great, thank you.`, `Appreciated, thanks.`, `Thanks for the quick help.`, `OK, thanks for letting me know.`];
const closings = [`Great to hear. Reply here if it comes back.`, `Glad that did it!`, `Thanks for letting us know.`, `Good news. Thanks for your patience.`];
const mateAcks = [`Hi {first}, {mate} from {team} here. I've picked this up and will write once I've had a proper look.`, `Hello {first}, this is {mate} from {team}. Thanks for your patience; I'm looking into it and will update you here.`];
const sideFirst = [`While I have you, something else:`, `Unrelated, but while you look at that:`, `One more thing while I wait for that:`, `Separate question, if that's all right:`];
const sideNext = [`Another thing while I'm here.`, `And something else has come up.`, `Last one, I promise:`];
const quickLeads = [`Thanks! While I have you, the real reason I wrote:`, `Great, thanks. The other thing, and really why I got in touch:`, `Perfect. Now the thing that's actually been bothering us.`];
const backLeads = [`Back to the original problem:`, `On the first question:`, `Back to where we started:`, `And on the main issue:`];
const okAck = [`Thanks, that's clear.`, `Good to know, thanks.`, `OK, we'll do that for now.`];

// ---------------------------------------------------------------------------------------------------------
// One ticket.
interface Item {
	who: 'c' | 'a' | 'e' | 'note' | 'enote' | 'mate';
	paras: string[];
	art?: Art;
	/** Paragraphs after the pasted output. */
	after?: string[];
	slots?: Slots;
	wait?: 'long' | 'release';
}

for (const topic of topics)
	for (const outcome of topic.outcomes)
		if ((outcome === 'team' && !topic.team) || (outcome === 'request' && !topic.request) || (outcome === 'owe' && !topic.owe) || (outcome === 'answered' && !topic.fixed))
			throw new Error(`topic ${topic.id} can end "${outcome}" but has no text for it`);
const totalWeight = topics.reduce((sum, topic) => sum + topic.weight, 0);
const weighted = (r: Rand) => {
	let left = r() * totalWeight;
	for (const topic of topics) if ((left -= topic.weight) < 0) return topic;
	return topics.at(-1)!;
};
const ack = (r: Rand, text: string, allowed: boolean) => (allowed && !/^(Thanks|Thank|Great|OK|Ah|Right|Here)/.test(text) && chance(r, 0.3) ? [pick(r, custAcks)] : []);
const ordinal = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th'}`;
const summerOffset: Record<string, number> = { 'Europe/London': 1, 'Europe/Dublin': 1, 'Europe/Berlin': 2, 'Europe/Amsterdam': 2, 'Europe/Madrid': 2, 'Europe/Stockholm': 2 };
const dupPairs: [string, string][] = [['Web app', 'Web-App'], ['Data pipeline', 'DATA PIPELINE'], ['Help centre', 'help-centre'], ['Order service', 'Order-Service'], ['Media uploads', 'media uploads'], ['Customer portal', 'Customer-Portal']];

const ticket = (index: number) => {
	const r = mulberry32(0x5c09e4a1 + index * 104729);
	const openDay = openDays[Math.floor((index * openDays.length) / ITEMS)]!;
	const openMs = openDay + int(r, 7 * 60, 21 * 60) * MIN;
	const fits = (topic: Topic) => !topic.after || openDay >= topic.after;
	let main = weighted(r);
	while (!fits(main)) main = weighted(r);
	let outcome: Outcome = pick(r, main.outcomes);
	if (main.released && openMs < RELEASE) outcome = 'released';
	const partial = outcome === 'team' || outcome === 'waiting';

	// Other matters: a quick question, and up to three smaller matters discussed in full.
	const used = new Set<Topic>([main]);
	const sideOk = (topic: Topic) => fits(topic) && !topic.noSide && !!topic.fixed && topic.outcomes.includes('answered') && ![...used].some((other) => other.area === topic.area);
	const takeSide = () => {
		const topic = pick(r, topics.filter(sideOk));
		used.add(topic);
		return topic;
	};
	const fulls = Array.from({ length: partial ? pick(r, [1, 2, 2, 3]) : pick(r, [0, 1, 1, 2, 2, 3]) }, () => takeSide());
	const quickTopic = chance(r, 0.65) ? pick(r, topics.filter((topic) => fits(topic) && !used.has(topic))) : undefined;
	const sidesEarly = partial || chance(r, 0.45);

	// The organization.
	const head = pick(r, heads);
	const tail = pick(r, tails);
	const co = `${head} ${tail}`;
	const domain = `${(head + tail).toLowerCase()}.example`;
	const plan = main.id === 'overage' ? plans[0] : pick(r, [plans[0], plans[0], plans[1]]);
	const x: Ctx = { projects: [], alerts: [], now: openMs, teamFor: outcome === 'team' ? main.id : '' };
	for (const name of shuffle(r, projectBases).slice(0, int(r, 5, 20))) addProject(r, x, name);
	const [mainProject, ...others] = shuffle(r, x.projects);
	const twinOf = (project: Proj) => {
		const twin = addProject(r, x, `${project.name} staging`);
		twin.platform = project.platform;
		return twin;
	};
	const staging = twinOf(mainProject!);
	const first = pick(r, firstNames);
	const last = pick(r, surnames);
	const colleague = `${pick(r, firstNames.filter((name) => name !== first))} ${pick(r, surnames)}`;
	const tz = pick(r, zones);
	const [accentName, accentCity, language] = pick(r, accentNames);
	const punctName = pick(r, punctNames);
	const [dupExisting, dupName] = pick(r, dupPairs);
	const name9 = `${pick(r, projectBases)} ${pick(r, ['Next', 'Two', 'Live', 'Edge'])}`;
	const initials = co.split(' ').map((word) => word[0]).join('');
	const pastMs = openDay - int(r, 2, 6) * DAY;
	const incidentMs = pastMs + int(r, 8, 20) * HOUR + int(r, 0, 59) * MIN;
	const threshold = int(r, 40, 150);
	const peak = int(r, Math.round(threshold * 0.55), threshold - 4);
	const normal = int(r, 3, Math.max(4, Math.round(peak * 0.3)));
	const nightHour = int(r, 1, 4);
	const firedMs = openMs - int(r, 2, 5) * HOUR;
	const delay = int(r, 12, 35);
	const regions3 = shuffle(r, regionsChecked).slice(0, 3);
	const mStartLocal = int(r, 21, 23);
	const truePct = 99.9 + int(r, 1, 9) / 100;
	const mhours = int(r, 6, 14);
	const hbHour = int(r, 1, 4);
	const lastMonth = utc(openDay).getUTCMonth() - 1;
	const spikeEvents = int(r, 1_200_000, 2_600_000);
	const normalEvents = int(r, 8000, 25000);
	const cur = pick(r, currencies);
	const overageCost = Math.round(((spikeEvents + 30 * (normalEvents + 20000) - plan[1]) / 10000) * 1.5);
	const dTime = int(r, 9 * 60, 16 * 60);
	const maxId = () => Math.max(...x.projects.map((p) => p.id));
	const s: Slots = {
		first,
		last,
		full: `${first} ${last}`,
		email: `${first.toLowerCase()}.${last.toLowerCase()}@${domain}`,
		title: pick(r, titles),
		co,
		org: slugify(co),
		domain,
		pkg: (head + tail).toLowerCase(),
		agent: pick(r, agents),
		eng: pick(r, engineers),
		team: main.team ? teams[main.team.key][0] : '',
		mate: main.team ? teams[main.team.key][1] : '',
		seats: String(int(r, 6, 140)),
		years: String(int(r, 2, 5)),
		since: `${MONL[int(r, 0, 11)]} ${int(r, 2020, 2025)}`,
		cloudRegion: pick(r, ['eu-west-1', 'eu-central-1', 'europe-west2', 'us-east-1']),
		plan: plan[0],
		rateLimit: fmt(plan[3]),
		spike: fmt(plan[3] * int(r, 3, 9)),
		project: mainProject!.name,
		pid: String(mainProject!.id),
		slug: mainProject!.slug,
		iso: mainProject!.iso,
		stagingProject: staging.name,
		release: `${int(r, 1, 9)}.${int(r, 0, 30)}.${int(r, 0, 9)}`,
		pastday: WDL[utc(pastMs).getUTCDay()]!,
		pyVersion: `2.${int(r, 6, 9)}.${int(r, 0, 4)}`,
		jsVersion: `5.${int(r, 0, 6)}.${int(r, 0, 3)}`,
		sdkName: 'beacon-python',
		framework: 'flask',
		logger: pick(r, loggers),
		java: pick(r, javaVersions),
		reqs: String(int(r, 180, 420)),
		kb: String(int(r, 260, 900)),
		incidentMs: String(incidentMs),
		incidentTime: clock(incidentMs),
		alert: pick(r, alertNames),
		alertId: String(int(r, 200, 9000)),
		alertId2: String(int(r, 200, 9000)),
		threshold: String(threshold),
		peak: String(peak),
		normal: String(normal),
		suggest: String(Math.min(peak - 2, normal + int(r, 3, 10))),
		newT: String(Math.max(5, threshold + pick(r, [-25, -15, 20, 30, 50]))),
		nightHour: String(nightHour),
		nightTime: `${pad(nightHour)}:${pad(int(r, 0, 30))}`,
		job: pick(r, jobs),
		nightMsg: pick(r, nightMessages),
		delay: String(delay),
		firedMs: String(firedMs),
		firedTime: clock(firedMs),
		lateTime: clock(firedMs + delay * MIN),
		nAlerts: String(int(r, 18, 60)),
		channel: pick(r, channels),
		key1: hex(r, 4),
		key2: hex(r, 4),
		pdDate: dayMonth(openDay - int(r, 20, 60) * DAY),
		tfUser: pick(r, ['terraform', 'platform-terraform', 'tf-ci']),
		tfTime: `${pad(int(r, 1, 5))}:${pad(int(r, 0, 59))}`,
		colleague,
		colleagueFirst: colleague.split(' ')[0]!,
		gwDate: dayMonth(openDay - int(r, 5, 15) * DAY),
		monitor: `https://${pick(r, ['www.', 'shop.', 'app.', ''])}${domain}/${pick(r, ['', 'health', 'login', 'checkout'])}`,
		host: `${pick(r, ['www', 'api', 'shop', 'app'])}.${domain}`,
		mins: String(int(r, 4, 40)),
		checkRegions: regions3.join(', '),
		badRegion: pick(r, regions3),
		slowRegion: pick(r, regions3),
		timeout: '10',
		days: String(int(r, 5, 25)),
		ipv4: `203.0.113.${int(r, 2, 250)}`,
		ipv6: `2001:db8:${hex(r, 4)}::${int(r, 2, 99)}`,
		tz,
		mDay: pick(r, WDL.slice(1, 6)),
		mStartLocal: `${mStartLocal}:00`,
		mStartUtc: `${mStartLocal - summerOffset[tz]!}:00`,
		mStartWinter: `${mStartLocal - 1}:00`,
		mHours: String(int(r, 2, 4)),
		truePct: truePct.toFixed(2),
		pct: (truePct - (mhours / 720) * 100).toFixed(2),
		mhours: String(mhours),
		hbExpectedHour: pad(hbHour),
		hbExpected: `${pad(hbHour)}:00`,
		hbActualHour: pad(hbHour + 1),
		grace: String(pick(r, [10, 15, 20, 30])),
		dashboard: pick(r, dashboardsNames),
		widget: pick(r, widgetNames),
		nReleases: String(int(r, 52, 140)),
		nWidgets: String(int(r, 18, 34)),
		dWidgets: String(int(r, 6, 14)),
		version: String(int(r, 12, 60)),
		time: clock(dTime * MIN),
		time2: clock((dTime + int(r, 4, 50)) * MIN),
		month: MONL[lastMonth]!,
		monthIndex: String(lastMonth),
		spikeDay: String(int(r, 3, 26)),
		spikeEvents: String(spikeEvents),
		spikeEventsFmt: fmt(spikeEvents),
		normalEvents: String(normalEvents),
		normalEventsFmt: fmt(normalEvents),
		invoiceTotal: `${cur[0]}${fmt(plan[2] + overageCost)}`,
		planPrice: `${cur[0]}${plan[2]}`,
		device: pick(r, devices),
		deviceShort: 'device',
		wrapper: '',
		wrapperFile: '',
		groupCount: String(int(r, 80, 900)),
		punctName,
		punctSlug: slugify(punctName),
		goodSlug: tidySlug(punctName),
		plainName: punctName.replace(/&/g, 'and').replace(/[^A-Za-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim(),
		accentName,
		accentSlug: slugify(accentName),
		accentGood: tidySlug(accentName),
		city: accentCity,
		language,
		lowerName: pick(r, lowerNames),
		lastUpper: '',
		dupExisting,
		dupName,
		dupSlug: slugify(dupExisting),
		dupAlt: `${dupExisting} ${pick(r, ['Next', 'Two', 'Plus'])}`,
		dupAltSlug: '',
		name9,
		gotSlug: slugify(name9),
		wantSlug: `${initials.toLowerCase()}-${slugify(name9)}`,
		wantName: `${initials} ${name9}`,
		newId: '',
		newId2: ''
	};
	[s.wrapper, s.wrapperFile] = pick(r, wrappers);
	s.dupAltSlug = slugify(s.dupAlt!);
	s.spikeDayOrd = ordinal(Number(s.spikeDay));
	s.newId = String(maxId() + int(r, 1, 40));
	s.newId2 = String(Number(s.newId) + int(r, 1, 9));

	// Smaller matters are about other projects of the organization.
	const sideSlots = new Map<Topic, Slots>();
	fulls.forEach((topic, i) => {
		const project = others[i % Math.max(1, others.length)] ?? mainProject!;
		const twin = twinOf(project);
		sideSlots.set(topic, { ...s, project: project.name, pid: String(project.id), slug: project.slug, iso: project.iso, stagingProject: twin.name });
	});
	main.prep?.(r, s, x);
	for (const topic of fulls) topic.prep?.(r, sideSlots.get(topic)!, x);
	main.finish?.(r, s, x);
	for (const project of x.projects)
		for (const name of shuffle(r, alertNames).slice(0, int(r, 1, 4))) x.alerts.push({ id: int(r, 200, 9800), projectId: project.id, name, threshold: int(r, 5, 200), muted: chance(r, 0.15) });
	x.alerts = x.alerts.filter((alert) => alert.name !== s.alert || (alert.projectId !== mainProject!.id && alert.projectId !== staging.id));
	x.alerts.push({ id: Number(s.alertId), projectId: mainProject!.id, name: s.alert!, threshold, muted: false }, { id: Number(s.alertId2), projectId: staging.id, name: s.alert!, threshold, muted: true });
	const nproj = x.projects.length;
	const usedShare = main.id === 'overage' ? int(r, 105, 140) : int(r, 22, 80);
	const rawTotal = x.projects.reduce((sum, p) => sum + p.events, 0);
	const target = (plan[1] * usedShare) / 100 + int(r, 1, 9999) * int(r, 1, 7);
	for (const p of x.projects) p.events = p.events < 10 ? p.events : Math.max(40, Math.round((p.events * target) / rawTotal));
	const perPage = Number(s.perPage ?? 25);
	Object.assign(s, {
		nproj: String(nproj),
		total: String(nproj),
		pagesDefault: String(Math.ceil(nproj / 25)),
		pagesDefaultReq: Math.ceil(nproj / 25) === 1 ? 'one request' : `${Math.ceil(nproj / 25)} requests`,
		perPage: String(perPage),
		pagesRight: String(Math.ceil(nproj / perPage)),
		pagesWrong: String(Math.ceil(nproj / perPage) + 1),
		nProj2: String(Math.min(nproj, int(r, 6, 14))),
		usedFmt: fmt(x.projects.reduce((sum, p) => sum + p.events, 0)),
		usedPct: String(usedShare),
		share: String(Math.round(plan[1] / nproj))
	});
	const derived = ['nproj', 'total', 'pagesDefault', 'pagesDefaultReq', 'perPage', 'pagesRight', 'pagesWrong', 'nProj2', 'usedFmt', 'usedPct', 'share', 'lastUpper'];
	for (const slots of sideSlots.values()) for (const key of Object.keys(s)) if (!(key in slots) || derived.includes(key)) slots[key] = s[key]!;

	const fillWith = (slots: Slots) => (text: string): string =>
		text.replace(/\{(\w+)\}/g, (_, key: string) => {
			const value = slots[key];
			if (value === undefined) throw new Error(`no slot ${key} in "${text.slice(0, 60)}"`);
			return value;
		});
	const fill = fillWith(s);
	s.need = fill(main.need);

	// The conversation, as a list of messages.
	const items: Item[] = [];
	let carry: string[] = [];
	const c = (paras: string[], art?: Art, slots?: Slots, after?: string[]) => {
		items.push({ who: 'c', paras: [...carry, ...paras], art, slots, after });
		carry = [];
	};
	const a = (paras: string[], slots?: Slots, wait?: 'long') => items.push({ who: 'a', paras, slots, wait });
	const e = (paras: string[], art?: Art, wait?: 'long' | 'release') => items.push({ who: 'e', paras, art, wait });
	const note = (text: string) => items.push({ who: 'note', paras: [text] });
	const enote = (text: string) => items.push({ who: 'enote', paras: [text] });
	let escalated = false;
	const escalate = () => {
		if (escalated) return;
		escalated = true;
		note(pick(r, escalateLeads) + main.escalate);
		if (chance(r, 0.45)) enote(pick(r, pickups));
	};
	const sides = () =>
		fulls.forEach((topic, position) => {
			const slots = sideSlots.get(topic)!;
			c([pick(r, position === 0 ? sideFirst : sideNext), pick(r, topic.open)], undefined, slots);
			a([topic.reply], slots);
			for (const [ask, answer, art] of topic.turns) {
				c([...ack(r, ask, !carry.length), ask], art, slots);
				a([answer], slots);
			}
			carry = [fillWith(slots)(pick(r, topic.fixed!))];
		});

	// Opening.
	const opening = [...(chance(r, 0.5) ? [pick(r, backstories)] : []), pick(r, main.open)];
	let quickUsed = !quickTopic;
	if (quickTopic && chance(r, 0.4)) {
		quickUsed = true;
		if (chance(r, 0.5)) {
			c([`Two things, if I may. First, a quick one: ${quickTopic.quick[0]}`, `The bigger one:`, ...opening]);
			a([`On your quick question: ${quickTopic.quick[1]}`, `On the bigger one: ${main.reply}`]);
		} else {
			c([quickTopic.quick[0]]);
			a([quickTopic.quick[1]]);
			c([pick(r, quickLeads), ...opening]);
			a([main.reply]);
		}
	} else {
		c(opening);
		a([...(!main.reply.startsWith('Thanks') && !main.reply.startsWith('Sorry') && chance(r, 0.5) ? [pick(r, agentIntros)] : []), main.reply]);
	}
	if (chance(r, 0.35)) note(pick(r, notes));
	if (outcome === 'waiting' || chance(r, 0.5)) escalate();

	const [given, cause, ...rest] = main.turns;
	if (outcome === 'waiting') {
		enote(pick(r, waitNotes));
		sides();
		if (carry.length) c([]);
		a([pick(r, nudges1)], undefined, 'long');
		if (chance(r, 0.6)) a([pick(r, nudges2)], undefined, 'long');
	} else {
		if (sidesEarly) sides();
		const quickLater = !quickUsed && chance(r, 0.7) ? quickTopic!.quick : undefined;
		const answerArt = main.id === 'alerts-endpoint';
		const aside = quickLater ? [`Unrelated, but ${lowerFirst(quickLater[0])}`] : [];
		const artGiven = answerArt ? undefined : given![2];
		c([...ack(r, given![0], !carry.length), given![0], ...(artGiven ? [] : aside)], artGiven, undefined, artGiven ? aside : undefined);
		escalate();
		const also = quickLater ? [`And on your other question: ${quickLater[1]}`] : [];
		if (outcome === 'team') {
			e([main.team!.reply, ...also]);
			enote(`Passing to ${s.team}: ${main.team!.handover}`);
			if (chance(r, 0.4)) c([pick(r, thanksLines)]);
			if (chance(r, 0.45)) items.push({ who: 'mate', paras: [pick(r, mateAcks)] });
		} else if (outcome === 'released') {
			e([main.released![0], ...also]);
			c([pick(r, thanksLines)]);
			if (!sidesEarly) sides();
			e([main.released![1]], main.released![2], 'release');
			c([pick(r, main.fixed!)]);
			if (chance(r, 0.5)) e([pick(r, closings)]);
		} else {
			e([given![1], ...also], answerArt ? given![2] : undefined);
			if (!sidesEarly) sides();
			c([...(carry.length ? [pick(r, backLeads)] : ack(r, cause![0], true)), cause![0]]);
			if (chance(r, 0.3)) {
				e([pick(r, holdings)]);
				e([cause![1]], undefined, 'long');
			} else e([cause![1]]);
			if (rest.length >= 2 && chance(r, 0.35)) {
				c([rest[0]![0], rest[1]![0]]);
				e([rest[0]![1], rest[1]![1]]);
			} else for (const [ask, answer] of rest.slice(0, outcome === 'owe' ? 1 : 2)) {
				c([ask]);
				e([answer]);
			}
			if (outcome === 'answered') {
				c([pick(r, main.fixed!)]);
				if (chance(r, 0.55)) (chance(r, 0.5) ? a : (paras: string[]) => e(paras))([pick(r, closings)]);
			} else if (outcome === 'owe') {
				if (chance(r, 0.5)) {
					c([pick(r, okAck)]);
					e([main.owe!]);
				} else items.at(-1)!.paras.push(main.owe!);
				if (chance(r, 0.5)) c([pick(r, thanksLines)]);
			} else {
				c([main.request![0]]);
				e([main.request![1]]);
				if (chance(r, 0.45)) c([pick(r, thanksLines)]);
			}
		}
	}
	if (carry.length) c([]);

	// Times. Customers write at any hour from 07:00; support and the API team answer on weekdays, 08:00 to 18:00.
	// Late tickets get shorter gaps, so that every conversation ends before the export.
	const schedule = (scale: number): number[] => {
		const rt = mulberry32(0x71e5 + index * 7907);
		let now = openMs;
		const gap = (low: number, high: number) => Math.max(1, Math.round(int(rt, low, high) * scale));
		const workHours = (start: number) => {
			for (;;) {
				const d = utc(now);
				const hour = d.getUTCHours();
				if (d.getUTCDay() === 0 || d.getUTCDay() === 6 || hour >= 18) now = midnight(now) + DAY + start * HOUR + int(rt, 5, 70) * MIN;
				else if (hour < start) now = midnight(now) + start * HOUR + int(rt, 5, 70) * MIN;
				else break;
			}
		};
		return items.map((item, position) => {
			if (position > 0) {
				if (item.wait === 'long') now += gap(2 * 24 * 60, 4 * 24 * 60) * MIN;
				if (item.wait === 'release') now = Math.max(now, RELEASE + int(rt, 20, 200) * MIN);
				if (item.who === 'c') {
					now += gap(12, 1300) * MIN;
					if (utc(now).getUTCHours() < 7) now += 7 * HOUR;
				} else if (item.who === 'note' || item.who === 'enote') {
					now += int(rt, 2, 40) * MIN;
					workHours(item.who === 'enote' ? 9 : 8);
				} else {
					now += gap(10, 280) * MIN;
					workHours(item.who === 'a' ? 8 : 9);
				}
			}
			return now;
		});
	};
	let times = schedule(1);
	for (const scale of [0.6, 0.4, 0.25, 0.15, 0.08]) if (times.at(-1)! >= EXPORT - 3 * DAY) times = schedule(scale);

	// The file.
	const out: string[] = [];
	const subject = quickTopic && quickUsed && chance(r, 0.35) ? pick(r, quickTopic.subjects) : chance(r, 0.18) ? pick(r, vagueSubjects) : pick(r, main.subjects);
	const number = 31840 + index * 3 + int(r, 0, 2);
	const channel = pick(r, ['email', 'email', 'web form', 'in-app form']);
	const busiest = [...x.projects].sort((p, q) => q.events - p.events);
	const used30 = busiest.reduce((sum, p) => sum + p.events, 0);
	out.push(`# Ticket ${number}: ${fill(subject)}`, '');
	out.push(
		table(
			['Field', 'Value'],
			[
				['Opened', `${stamp(openMs)}, by ${channel}`],
				['From', `${s.full} <${s.email}>`],
				['Role', s.title!],
				['Organization', `${co} (${s.org})`],
				['Plan', `${plan[0]}, ${fmt(plan[1])} events a month`],
				['Data region', pick(r, ['EU', 'EU', 'US'])],
				['Projects', String(nproj)],
				['Events, last 30 days', fmt(used30)],
				['SDKs seen, last 30 days', [`beacon-python ${s.pyVersion}`, `beacon-js ${s.jsVersion}`, ...(chance(r, 0.4) ? [`beacon-go 1.${int(r, 2, 9)}.${int(r, 0, 5)}`] : []), ...(chance(r, 0.25) ? [`beacon-java 4.${int(r, 0, 4)}.${int(r, 0, 9)}`] : [])].join(', ')],
				['Customer since', s.since!]
			]
		),
		''
	);
	if (chance(r, 0.6)) {
		const shown = busiest.slice(0, 10);
		out.push(`### Busiest projects, last 30 days`, '', table(['Id', 'Name', 'Slug', 'Platform', 'Events'], shown.map((p) => [String(p.id), p.name, p.slug, p.platform, fmt(p.events)])), ...(nproj > 10 ? ['', `and ${nproj - 10} more.`] : []), '');
	}
	out.push('## Conversation', '');
	let lastStaff = '';
	let engSpoke = false;
	let agentSpoke = false;
	items.forEach((item, position) => {
		const at = times[position]!;
		x.now = at;
		const slots = item.slots ?? s;
		const f = fillWith(slots);
		const body: string[] = [];
		if (item.who === 'c') {
			out.push(`### ${s.full} · ${stamp(at)}`, '');
			const greeting = position === 0 ? pick(r, firstGreetings) : pick(r, [`Hi ${lastStaff},`, `${lastStaff},`, '', 'Hi again,', `Hello ${lastStaff},`]);
			if (greeting) body.push(greeting);
			body.push(...item.paras.map(f));
			if (item.art) body.push(item.art(r, slots, x));
			if (item.after) body.push(...item.after.map(f));
			const signoff = f(pick(r, position === 0 ? custSignoffs : replySignoffs));
			if (signoff) body.push(signoff);
		} else if (item.who === 'a') {
			out.push(`### ${s.agent} (Beacon Support) · ${stamp(at)}`, '');
			body.push(f(agentSpoke ? pick(r, ['Hi {first},', 'Hello {first},', 'Hi again {first},']) : pick(r, ['Hi {first},', 'Hello {first},'])), ...item.paras.map(f), f(pick(r, agentSignoffs)));
			agentSpoke = true;
			lastStaff = s.agent!;
		} else if (item.who === 'e') {
			out.push(`### ${s.eng} (Beacon API team) · ${stamp(at)}`, '');
			body.push(f('Hi {first},'), ...(engSpoke ? [] : [f(pick(r, engIntros))]), ...item.paras.map(f));
			if (item.art) body.push(item.art(r, slots, x));
			body.push(f(pick(r, engSignoffs)));
			engSpoke = true;
			lastStaff = s.eng!;
		} else if (item.who === 'note') {
			out.push(`### Internal note by ${s.agent} · ${stamp(at)}`, '');
			body.push(...item.paras.map(f));
		} else if (item.who === 'enote') {
			out.push(`### Internal note by ${s.eng} (API team) · ${stamp(at)}`, '');
			body.push(...item.paras.map(f));
		} else {
			out.push(`### ${s.mate} (Beacon, ${s.team!.replace(/^the /, '')}) · ${stamp(at)}`, '');
			body.push(...item.paras.map(f), s.mate!);
		}
		out.push(body.join('\n\n'), '');
	});
	if (times.at(-1)! >= EXPORT) throw new Error(`ticket ${number} runs past the export: ${stamp(times.at(-1)!)}`);
	return { name: `${number}.md`, text: out.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n', main: main.id, outcome };
};

const folder = join(root, 'support', 'escalations');
mkdirSync(folder, { recursive: true });
for (let index = 0; index < ITEMS; index++) {
	const { name, text } = ticket(index);
	writeFileSync(join(folder, name), text);
}
writeFileSync(
	join(folder, 'README.md'),
	`# Escalations to the API team\n\nThe ${ITEMS} tickets that Beacon support passed to the API team between 3 August and 30 October 2026, one file\neach, as the help desk exported them on 16 November. Each file holds the organization panel support saw when the\nticket came in and the whole conversation, with internal notes. The export does not keep the help desk's tags or\nstatuses.\n`
);
