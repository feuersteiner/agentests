// Writes the long material of this entry's long task: the tickets that Meridian Maps developer support
// handled between 5 October and 13 November 2026, one Markdown file each, under docs/developer-tickets/.
// Deterministic: fixed seeds, no clock, no network.
//   bun long/generate.ts <workspace root>
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** How many tickets to write. Everything else is derived from it. */
const ITEMS = 240;

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
const pad = (value: number) => String(value).padStart(2, '0');
const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);
const thousands = (value: number) => String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

// ---------------------------------------------------------------------------------------------------------
// Dates. Everything happens in 2026, before the export on 20 November.
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
	return `${WD[d.getUTCDay()]} ${d.getUTCDate()} ${MON[d.getUTCMonth()]} 2026, ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
};
const clock = (ms: number) => `${pad(utc(ms).getUTCHours())}:${pad(utc(ms).getUTCMinutes())}`;
const dayMonth = (ms: number) => `${utc(ms).getUTCDate()} ${MONL[utc(ms).getUTCMonth()]}${utc(ms).getUTCFullYear() === 2026 ? '' : ` ${utc(ms).getUTCFullYear()}`}`;
const fullDay = (ms: number) => `${WDL[utc(ms).getUTCDay()]} ${dayMonth(ms)}`;
const midnight = (ms: number) => ms - (ms % DAY);
const httpDate = (ms: number) => {
	const d = utc(ms);
	return `${WD[d.getUTCDay()]}, ${pad(d.getUTCDate())} ${MON[d.getUTCMonth()]} 2026 ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} GMT`;
};
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 19) + 'Z';
const untilMidnight = (ms: number) => Math.ceil((midnight(ms) + DAY - ms) / 1000);
const FIRST_DAY = Date.UTC(2026, 9, 5);
const LAST_DAY = Date.UTC(2026, 10, 13);
const EXPORT = Date.UTC(2026, 10, 20);
const RELEASES = [Date.UTC(2026, 9, 6), Date.UTC(2026, 10, 3)];
const openDays: number[] = [];
for (let day = FIRST_DAY; day <= LAST_DAY; day += DAY) if (utc(day).getUTCDay() % 6 !== 0) openDays.push(day);

// ---------------------------------------------------------------------------------------------------------
// People, places and plans.
const firstF = ['Aoife', 'Bettina', 'Camille', 'Divya', 'Elena', 'Femi', 'Gemma', 'Harriet', 'Isla', 'Jana', 'Keziah', 'Lotte', 'Maryam', 'Niamh', 'Olga', 'Paula', 'Rosa', 'Siobhan', 'Tamsin', 'Ulla', 'Vera', 'Willemijn', 'Yasmin', 'Zara'];
const firstM = ['Alasdair', 'Bram', 'Cillian', 'Dev', 'Erik', 'Fergus', 'Gustavo', 'Hamish', 'Idris', 'Jasper', 'Kieran', 'Laurens', 'Mihai', 'Nikhil', 'Oisin', 'Pieter', 'Rory', 'Samir', 'Theo', 'Umar', 'Wouter', 'Xavier', 'Yusuf', 'Zac'];
const surnames = ['Achterberg', 'Brennan', 'Castell', 'Dlamini', 'Everard', 'Fitzgerald', 'Gunawardena', 'Hedlund', 'Iqbal', 'Jansen', 'Kowalczyk', 'Lafferty', 'McAllister', 'Nakamura', 'Ogunleye', 'Pereira', 'Quigley', 'Rahman', 'Strand', 'Tiernan', 'Van Dijk', 'Whitlock', 'Yilmaz', 'Zielinski', 'Abernethy', 'Bakshi', 'Coulter', 'Delacroix'];
const agents = ['Anouk', 'Chidi', 'Freya', 'Mateus', 'Saskia', 'Joel', 'Wen', 'Padraig'];
const engineers = ['Ravi', 'Elif', 'Tomasz'];
const teamPeople: Record<string, string> = {
	'the map data team': 'Ines',
	'the geocoding team': 'Bogdan',
	'the cartography team': 'Saoirse',
	'the billing team': 'Hamid',
	'the accounts team': 'Lena',
	'the maps API team': 'Tobias',
	'the platform team': 'Elif',
	'the legal team': 'Ophelia',
	'the sales team': 'Marcus',
	'the mobile SDK team': 'Yuki'
};
const heads = ['Tidewater', 'Kestrel', 'Northgate', 'Bluebell', 'Copperleaf', 'Saltmarsh', 'Granite', 'Wayfarer', 'Lantern', 'Brightwater', 'Pinecrest', 'Ironbridge', 'Meadowlark', 'Quayside', 'Redfern', 'Silverbirch', 'Thistle', 'Upland', 'Vantage', 'Willowmere', 'Ashby', 'Cobble', 'Driftwood', 'Elmstead'];
/** A kind of company, what its users see the map in, what it puts on the map, and the page the map is on. */
const kinds: [string, string, string, string][] = [
	['Couriers', 'courier app', 'drop-off points', 'tracking'],
	['Surveys', 'survey app', 'survey sites', 'job sheet'],
	['Taxis', 'driver app', 'pick-up points', 'booking'],
	['Lettings', 'property search', 'flats to let', 'search results'],
	['Trails', 'walking app', 'trailheads', 'route planner'],
	['Bikes', 'bike-share app', 'docking stations', 'station finder'],
	['Waste Services', 'collection rounds app', 'bin collection points', 'round planner'],
	['Utilities', 'field crew app', 'meter locations', 'work order'],
	['Events', 'event map', 'stages and stalls', 'venue'],
	['Deliveries', 'delivery tracking page', 'customer addresses', 'order status'],
	['Coaches', 'coach tracking app', 'coach stops', 'live journey'],
	['Tours', 'walking tour app', 'tour stops', 'tour'],
	['Removals', 'booking site', 'collection addresses', 'quote'],
	['Fleet', 'fleet dashboard', 'vans', 'live fleet'],
	['Insurance', 'claims app', 'claim addresses', 'claim'],
	['Volunteers', 'volunteer map', 'volunteer shifts', 'shift finder'],
	['Outdoor', 'store finder', 'shops', 'store finder'],
	['Car Club', 'car club app', 'car bays', 'find a car'],
	['Drones', 'flight planning tool', 'flight areas', 'flight plan'],
	['Estates', 'estate agency site', 'homes for sale', 'property'],
	['Home Care', 'home visits app', 'client homes', 'visit list'],
	['Ferries', 'sailings app', 'terminals', 'departures']
];
const titles = ['Lead developer', 'CTO', 'Backend engineer', 'Mobile developer', 'Head of engineering', 'Founder', 'Full-stack developer', 'Platform engineer', 'Product manager', 'Frontend developer', 'Data engineer', 'Engineering manager', 'Operations manager', 'Solutions architect'];
/** City, country, UTC offset in November, latitude, longitude, a town nearby, a rural area nearby, a river. */
interface City {
	name: string;
	country: string;
	offset: number;
	lat: number;
	lon: number;
	near: string;
	rural: string;
	river: string;
	europe: boolean;
	cur: string;
}
const city = (name: string, country: string, offset: number, lat: number, lon: number, near: string, rural: string, river: string, cur: string): City => ({ name, country, offset, lat, lon, near, rural, river, europe: lon > -11 && lon < 15 && lat > 36, cur });
const cities: City[] = [
	city('Leeds', 'United Kingdom', 0, 53.8, -1.55, 'Wakefield', 'the Yorkshire Dales', 'the Aire', '£'),
	city('Bristol', 'United Kingdom', 0, 51.45, -2.59, 'Bath', 'the Mendips', 'the Avon', '£'),
	city('Glasgow', 'United Kingdom', 0, 55.86, -4.25, 'Paisley', 'the Trossachs', 'the Clyde', '£'),
	city('Norwich', 'United Kingdom', 0, 52.63, 1.3, 'Wymondham', 'the Broads', 'the Wensum', '£'),
	city('Dublin', 'Ireland', 0, 53.35, -6.26, 'Bray', 'the Wicklow Mountains', 'the Liffey', '€'),
	city('Galway', 'Ireland', 0, 53.27, -9.05, 'Oranmore', 'Connemara', 'the Corrib', '€'),
	city('Rotterdam', 'the Netherlands', 1, 51.92, 4.48, 'Schiedam', 'the Hoeksche Waard', 'the Maas', '€'),
	city('Utrecht', 'the Netherlands', 1, 52.09, 5.12, 'Zeist', 'the Utrechtse Heuvelrug', 'the Vecht', '€'),
	city('Porto', 'Portugal', 0, 41.15, -8.61, 'Matosinhos', 'the Douro valley', 'the Douro', '€'),
	city('Ghent', 'Belgium', 1, 51.05, 3.72, 'Merelbeke', 'the Meetjesland', 'the Scheldt', '€'),
	city('Aarhus', 'Denmark', 1, 56.16, 10.2, 'Skanderborg', 'the lake district around Silkeborg', 'the Aarhus river', '€'),
	city('Auckland', 'New Zealand', 13, -36.85, 174.76, 'Manukau', 'the Waitakere Ranges', 'the Tamaki estuary', 'NZ$'),
	city('Wellington', 'New Zealand', 13, -41.29, 174.78, 'Lower Hutt', 'the Wairarapa', 'the Hutt River', 'NZ$'),
	city('Sydney', 'Australia', 11, -33.87, 151.21, 'Parramatta', 'the Blue Mountains', 'the Parramatta River', 'A$'),
	city('Melbourne', 'Australia', 11, -37.81, 144.96, 'Geelong', 'the Dandenong Ranges', 'the Yarra', 'A$'),
	city('Brisbane', 'Australia', 10, -27.47, 153.03, 'Ipswich', 'the Scenic Rim', 'the Brisbane River', 'A$'),
	city('Singapore', 'Singapore', 8, 1.29, 103.85, 'Jurong', 'the Central Catchment', 'the Kallang River', 'S$'),
	city('Toronto', 'Canada', -5, 43.65, -79.38, 'Mississauga', 'the Oak Ridges Moraine', 'the Don', 'US$'),
	city('Philadelphia', 'the United States', -5, 39.95, -75.17, 'Camden', 'Bucks County', 'the Schuylkill', 'US$'),
	city('Denver', 'the United States', -7, 39.74, -104.99, 'Aurora', 'the Front Range', 'the South Platte', 'US$')
];
const apac = cities.filter((c) => c.offset >= 8);
const europe = cities.filter((c) => c.europe);
/** The three projects in the gateway's own policies file, with the plan their daily limit belongs to. */
const known = [
	{ co: 'Harbour Taxis', proj: 'harbour-taxis', kind: 2, city: 'Galway', plan: 3 },
	{ co: 'Fieldnote', proj: 'fieldnote', kind: 1, city: 'Philadelphia', plan: 1 },
	{ co: 'Loop Cycling', proj: 'loop-cycling', kind: 5, city: 'Utrecht', plan: 2 }
];
const plans: [string, number, number][] = [
	['Free', 1000, 0],
	['Starter', 20000, 49],
	['Growth', 60000, 190],
	['Scale', 250000, 640]
];
const libs = ['Leaflet 1.9.4', 'Leaflet 1.9.3', 'Leaflet 1.8.0'];
const sdks = ['the iOS SDK 4.3', 'the Android SDK 3.8', 'the iOS SDK 4.2', 'the Android SDK 3.7'];
const monitors = ['Pingdom', 'UptimeRobot', 'Datadog Synthetics', 'Better Stack', 'StatusCake'];
const streetNames = ['Station Road', 'Church Street', 'Mill Lane', 'High Street', 'Victoria Road', 'Park Avenue', 'Bridge Street', 'Market Square', 'Queen Street', 'Harbour Road'];
const renames: [string, string][] = [
	['Gasworks Lane', 'Riverside Walk'],
	['Old Mill Road', 'Ada Lovelace Way'],
	['Depot Street', 'Linden Street'],
	['Cattle Market', 'Market Yard'],
	['Station Approach', 'Platform Way'],
	['Tannery Lane', 'Weavers Row']
];
const events = ['the half marathon', 'the Christmas market', 'the light festival', 'the food festival', 'the 10K fun run', 'the regatta', 'the bonfire night display', 'the cyclocross championship'];
const whens = ['tomorrow', 'this afternoon', 'on Monday', 'after our stand-up', 'later this week', 'before the weekend'];

type Area = 'map tiles' | 'geocoding' | 'keys and quotas' | 'billing and accounts' | 'own code';
type Outcome = 'resolved' | 'workaround' | 'change' | 'team' | 'quiet' | 'act';
type Slots = Record<string, string>;
type Art = (r: Rand, s: Slots) => string;
type Turn = [string, string, Art?];

interface Topic {
	area: Area;
	weight: number;
	subjects: string[];
	/** The developer's first message about it, two ways. */
	open: [string, string];
	/** The topic as a quick side question, and its answer. */
	quick: [string, string];
	/** Support's first answer, which asks for something. */
	reply: string;
	/** Exchanges in order. The first gives what the reply asked for and asks for one more thing (`need`); the
	 * second finds the cause; the rest are follow-up questions. A third element is pasted output. */
	turns: Turn[];
	need: string;
	/** The cause, as a clause, for a colleague who finds it later. */
	cause: string;
	/** What the developer has to do, after "you'll need to". */
	act: string;
	/** The developer's message when it worked. */
	fixed: [string, string];
	/** Why the developer cannot apply the fix yet, support's way round it, and the developer taking it. */
	stuck: string;
	workaround: string;
	accept: [string, string];
	/** Changes to meridian-gateway the developer may ask for at the end, each with their words for it. */
	change?: [keyof typeof changes, string][];
	team: string;
	/** The internal note when the ticket is handed to the team. */
	handover: string;
	place?: 'apac' | 'europe' | 'offset';
	after?: number;
	usage?: 'over' | 'low';
	/** The outcomes the topic allows; all of them when absent. */
	outcomes?: Outcome[];
	/** Only the team can sort it, so a sorted ticket has been through the team. */
	viaTeamOnly?: boolean;
}

// ---------------------------------------------------------------------------------------------------------
// Pasted output. An art may record what it shows in a slot that the next message reads.
const table = (head: string[], rows: string[][]) =>
	[`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`, ...rows.map((row) => `| ${row.join(' | ')} |`)].join('\n');
const fence = (lines: string[], lang = '') => ['```' + lang, ...lines, '```'].join('\n');
const API = 'https://api.meridianmaps.com';
const tileXY = (lat: number, lon: number, z: number): [number, number] => {
	const n = 2 ** z;
	const rad = (lat * Math.PI) / 180;
	return [Math.floor(((lon + 180) / 360) * n), Math.floor(((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n)];
};
const near = (r: Rand, value: number, spread: number) => (value + (r() - 0.5) * spread).toFixed(5);
const num = (s: Slots, key: string) => Number(s[key]);
const hostLine = (r: Rand) => `gw-${int(r, 1, 6)}`;
const uaBrowser = (r: Rand) =>
	pick(r, [
		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36',
		'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
		'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
		'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36'
	]);

/** Requests by UTC hour for one day, shaped by what the developer's service does. */
const hourly = (r: Rand, s: Slots, profile: 'shift' | 'flat' | 'peak' | 'event') => {
	const offset = num(s, 'offset');
	const limit = num(s, 'limitN');
	const rows: string[][] = [];
	let used = 0;
	let peak = 0;
	let total = 0;
	let runOut = -1;
	for (let hour = 0; hour < 24; hour++) {
		const local = (hour + offset + 24) % 24;
		let tiles = 0;
		let geo = 0;
		if (profile === 'shift') {
			const day = Math.round(limit * 0.025);
			if (local === 7) tiles = num(s, 'prefetch') * num(s, 'crews');
			else if (local > 7 && local < 18) tiles = Math.round(day * (0.6 + r() * 0.8));
			else tiles = int(r, 0, 40);
			geo = local >= 7 && local < 18 ? Math.round(day * (0.05 + r() * 0.1)) : int(r, 0, 6);
		} else if (profile === 'flat') {
			const day = Math.round(limit * 0.02);
			tiles = num(s, 'perHour') + (local >= 8 && local < 18 ? Math.round(day * (0.6 + r() * 0.8)) : int(r, 0, 12));
			geo = local >= 8 && local < 18 ? Math.round(day * (0.05 + r() * 0.15)) : int(r, 0, 3);
		} else {
			const shape = local >= 9 && local <= 13 ? 1 : local >= 7 && local <= 18 ? 0.5 : local >= 6 && local <= 21 ? 0.15 : 0.03;
			const scale = profile === 'event' ? num(s, 'peakN') : (limit * 1.5) / 9;
			tiles = Math.round(scale * shape * (0.8 + r() * 0.4));
			geo = Math.round(tiles / int(r, 20, 50));
		}
		const sum = tiles + geo;
		if (profile === 'peak') {
			const served = Math.max(0, Math.min(sum, limit - used));
			if (served < sum && runOut < 0) {
				runOut = hour;
				s.runOut = `${pad(hour)}:${pad(Math.min(59, Math.floor((served / sum) * 60)))}`;
			}
			used += served;
			rows.push([`${pad(hour)}:00`, thousands(Math.round((served * tiles) / Math.max(1, sum))), thousands(served - Math.round((served * tiles) / Math.max(1, sum))), thousands(sum - served)]);
		} else rows.push([`${pad(hour)}:00`, thousands(tiles), thousands(geo), thousands(sum)]);
		peak = Math.max(peak, sum);
		total += sum;
	}
	s.peak = thousands(Math.round(peak / 100) * 100);
	s.estTotal = thousands(Math.round(total / 1000) * 1000);
	return profile === 'peak' ? table(['Hour (UTC)', 'Tiles', 'Geocoding', 'Answered 429'], rows) : table(['Hour (UTC)', 'Tiles', 'Geocoding', 'Total'], rows);
};

/** A map library's tile layer, as the developer pasted it. */
const tileLayer = (variant: 'zoom' | 'retina' | 'subdomains' | 'swapped'): Art => (r, s) => {
	const url = variant === 'subdomains' ? `https://{s}.api.meridianmaps.com/v1/tiles/{z}/{x}/{y}.png?key=` : variant === 'swapped' ? `${API}/v1/tiles/{z}/{y}/{x}.png?key=` : `${API}/v1/tiles/{z}/{x}/{y}.png?key=`;
	const opts = [variant === 'zoom' ? '\tmaxZoom: 19,' : `\tmaxZoom: ${int(r, 17, 18)},`, ...(variant === 'subdomains' ? ["\tsubdomains: 'abc',"] : []), ...(variant === 'retina' ? ['\ttileSize: 256,'] : []), "\tattribution: '© Meridian Maps, © OpenStreetMap contributors'"];
	const name = pick(r, ['MAP_KEY', 'config.mapKey', 'window.MERIDIAN_KEY']);
	return fence([`const map = L.map('map').setView([${s.lat}, ${s.lon}], ${int(r, 11, 14)});`, '', `L.tileLayer('${url}' + ${name}, {`, ...opts, '}).addTo(map);'], 'js');
};

/** A geocoding response. */
const geocodeJson = (variant: 'ambiguous' | 'unit' | 'order' | 'point'): Art => (r, s) => {
	const lat = num(s, 'lat');
	const lon = num(s, 'lon');
	const result = (label: string, type: string, la: number, lo: number, confidence: number) => {
		const a = near(r, la, 0.04);
		const o = near(r, lo, 0.04);
		return `    { "label": "${label}", "type": "${type}", "lat": ${a}, "lon": ${o}, "point": [${o}, ${a}], "confidence": ${confidence.toFixed(2)} }`;
	};
	const query = variant === 'unit' ? `Flat+${s.houseLow},+${s.houseHigh}+${s.streetQ},+${s.city}` : variant === 'point' ? `${s.houseHigh}+${s.streetQ},+${s.city}` : s.streetQ;
	const rows =
		variant === 'ambiguous'
			? [result(`${s.street}, ${s.town2}`, 'street', lat + 0.6, lon - 0.4, 0.74), result(`${s.street}, ${s.city}`, 'street', lat, lon, 0.71), result(`${s.street}, ${s.town3}`, 'street', lat - 1.1, lon + 0.8, 0.66)]
			: variant === 'unit'
				? [result(`${s.houseLow} ${s.street}, ${s.city}`, 'address', lat, lon, 0.88), result(`${s.street}, ${s.city}`, 'street', lat, lon, 0.52)]
				: variant === 'order'
					? [result(`${s.street} (bus stop), ${s.city}`, 'stop', lat, lon, 0.81), result(`${s.street}, ${s.city}`, 'street', lat, lon, 0.79), result(`${s.street} car park, ${s.city}`, 'place', lat, lon, 0.6)]
					: [result(`${s.houseHigh} ${s.street}, ${s.city}`, 'address', lat, lon, 0.95)];
	return fence([`GET /v1/geocode?q=${query}`, '', '{', '  "results": [', rows.join(',\n'), '  ]', '}'], 'json');
};

const arts: Record<string, Art> = {
	curlAnon: (r, s) => {
		const today = midnight(num(s, 'nowMs')) + int(r, 9 * 60 + 5, 10 * 60 + 55) * MIN;
		const at = today < num(s, 'nowMs') ? today : today - DAY;
		const [x, y] = tileXY(num(s, 'lat'), num(s, 'lon'), 15);
		return [
			'Request (copied as cURL):',
			fence([`curl '${API}/v1/tiles/15/${x}/${y}.png' \\`, `  -H 'accept: image/avif,image/webp,image/png,*/*' \\`, `  -H 'referer: https://${s.site}/' \\`, `  -H 'user-agent: ${uaBrowser(r)}'`]),
			'Response:',
			fence(['HTTP/2 429', 'content-type: application/json;charset=utf-8', `retry-after: ${untilMidnight(at)}`, `date: ${httpDate(at)}`, 'content-length: 49', '', '{"error":"Daily quota of 1000 requests used up."}'])
		].join('\n\n');
	},
	curlOwn: (r, s) => {
		const at = num(s, 'nowMs') - int(r, 6, 14) * HOUR;
		return fence([
			`$ curl -i '${API}/v1/geocode?q=${s.streetQ}+${s.city}&key=sk_live_${s.keyTail2}'`,
			'HTTP/2 429',
			'content-type: application/json;charset=utf-8',
			`retry-after: ${untilMidnight(at)}`,
			`date: ${httpDate(at)}`,
			'',
			`{"error":"Daily quota of ${s.limitN} requests used up."}`
		]);
	},
	hourlyShift: (r, s) => hourly(r, s, 'shift'),
	hourlyFlat: (r, s) => hourly(r, s, 'flat'),
	hourlyPeak: (r, s) => hourly(r, s, 'peak'),
	hourlyEvent: (r, s) => hourly(r, s, 'event'),
	retryCode: (r, s) =>
		chance(r, 0.5)
			? fence(
					[
						`const MAX_ATTEMPTS = ${s.attempts};`,
						'',
						'export async function fetchWithRetry(url: string, attempt = 1): Promise<Response> {',
						'\tconst response = await fetch(url);',
						'\tif (response.status === 429 && attempt < MAX_ATTEMPTS) {',
						"\t\tconst wait = Number(response.headers.get('retry-after') ?? 1);",
						'\t\tawait sleep(wait); // sleep(ms)',
						'\t\treturn fetchWithRetry(url, attempt + 1);',
						'\t}',
						'\treturn response;',
						'}'
					],
					'ts'
				)
			: fence(
					[
						`MAX_ATTEMPTS = ${s.attempts}`,
						'',
						'def get_with_retry(session, url, params):',
						'    for attempt in range(MAX_ATTEMPTS):',
						'        resp = session.get(url, params=params, timeout=10)',
						'        if resp.status_code != 429:',
						'            return resp',
						"        wait = int(resp.headers.get('retry-after', '1'))",
						'        time.sleep(wait / 1000)  # header is in ms',
						'    return resp'
					],
					'python'
				),
	scraperLog: (r, s) => {
		const lines: string[] = [];
		let at = midnight(num(s, 'nowMs') - int(r, 1, 3) * DAY) + int(r, 2, 20) * HOUR + int(r, 0, 59) * MIN;
		const words = ['rue', 'calle', 'via', 'strasse', 'avenida', 'ulica', 'rua', 'gatan'];
		for (let i = 0; i < int(r, 7, 11); i++) {
			at += int(r, 1, 4) * 1000;
			lines.push(`${iso(at)} ${hostLine(r)} GET /v1/geocode?q=${pick(r, words)}+${int(r, 1, 400)} 200 ${int(r, 600, 1900)}B ${int(r, 40, 210)}ms project=${s.proj} key=sk_live_${s.keyTail2} ua="python-requests/2.32.3" src=${pick(r, ['203.0.113.', '198.51.100.'])}${int(r, 2, 250)}`);
		}
		return fence(lines);
	},
	tileLayerZoom: tileLayer('zoom'),
	tileLayerRetina: tileLayer('retina'),
	tileLayerSubdomains: tileLayer('subdomains'),
	tileLayerSwapped: tileLayer('swapped'),
	geocodeAmbiguous: geocodeJson('ambiguous'),
	geocodeUnit: geocodeJson('unit'),
	geocodeOrder: geocodeJson('order'),
	geocodePoint: geocodeJson('point'),
	reverseJson: (r, s) => {
		const distance = int(r, 38, 70);
		s.revDist = String(Math.round(distance / 10) * 10);
		const lat = near(r, num(s, 'lat'), 0.02);
		const lon = near(r, num(s, 'lon'), 0.02);
		return fence([`GET /v1/reverse?lat=${lat}&lon=${lon}`, '', '{', '  "results": [', `    { "label": "${s.houseLow} ${s.farStreet}, ${s.city}", "type": "address", "distance_m": ${distance}, "confidence": 0.83 },`, `    { "label": "${s.houseHigh} ${s.street}, ${s.city}", "type": "address", "distance_m": ${int(r, 75, 140)}, "confidence": 0.8 }`, '  ]', '}'], 'json');
	},
	javaTrace: (r, s) =>
		fence([
			`${iso(num(s, 'nowMs') - int(r, 2, 30) * HOUR)} WARN  [geocode-worker-${int(r, 1, 8)}] c.${s.pkg}.maps.GeocodeClient - request failed, giving up`,
			'java.net.SocketException: Connection reset',
			'\tat java.base/sun.nio.ch.NioSocketImpl.implRead(NioSocketImpl.java:318)',
			'\tat java.base/sun.nio.ch.NioSocketImpl.read(NioSocketImpl.java:346)',
			'\tat java.base/java.net.Socket$SocketInputStream.read(Socket.java:1099)',
			'\tat org.apache.hc.core5.http.impl.io.SessionInputBufferImpl.fillBuffer(SessionInputBufferImpl.java:149)',
			'\tat org.apache.hc.client5.http.impl.classic.InternalExecRuntime.execute(InternalExecRuntime.java:212)',
			`\tat com.${s.pkg}.maps.GeocodeClient.lookup(GeocodeClient.java:${int(r, 60, 140)})`
		]),
	poolConfig: (r, s) =>
		fence(
			[
				'PoolingHttpClientConnectionManager pool = PoolingHttpClientConnectionManagerBuilder.create()',
				`\t.setMaxConnTotal(${int(r, 20, 80)})`,
				`\t.setMaxConnPerRoute(${int(r, 10, 40)})`,
				`\t.setConnectionTimeToLive(TimeValue.ofMinutes(${int(r, 20, 60)}))`,
				'\t.build();',
				'',
				`client = HttpClients.custom()`,
				'\t.setConnectionManager(pool)',
				`\t.evictIdleConnections(TimeValue.ofMinutes(${s.idleMin}))`,
				'\t.build();'
			],
			'java'
		),
	safariConsole: (r, s) =>
		fence([
			`[Error] Preflight response is not successful. Status code: 401`,
			`[Error] Fetch API cannot load ${API}/v1/geocode?q=${s.streetQ}&key=pk_live_${s.keyTail} due to access control checks.`,
			`[Error] Failed to load resource: Preflight response is not successful. Status code: 401 (geocode, line 0)`,
			`[Error] TypeError: Load failed`
		]),
	fetchSnippet: (r, s) =>
		fence(
			[
				'export async function geocode(query: string) {',
				`\tconst url = new URL('${API}/v1/geocode');`,
				"\turl.searchParams.set('q', query);",
				"\turl.searchParams.set('key', import.meta.env.PUBLIC_MAP_KEY);",
				'\tconst response = await fetch(url, {',
				`\t\theaders: { 'X-Client-Version': '${s.appv}', 'X-Session': sessionId() }`,
				'\t});',
				'\treturn (await response.json()).results;',
				'}'
			],
			'ts'
		),
	invoiceTable: (r, s) =>
		table(
			['Line', 'Detail', 'Amount'],
			[
				[`${s.plan} plan, ${s.limit} requests a day`, '1 to 31 October', `${s.cur}${s.price}.00`],
				['Requests in the period', s.monthUsed!, 'included'],
				['VAT', s.vatRate!, `${s.cur}${s.vat}`],
				['Total', '', `${s.cur}${s.total}`],
				['Invoice', `INV-2026-${s.invoiceNo}, ${s.invoiceAddress}`, `due ${s.dueDate}`]
			]
		),
	usageCompare: (r, s) => {
		const rows: string[][] = [];
		for (let d = 6; d >= 0; d--) {
			const day = midnight(num(s, 'nowMs')) - (d + 1) * DAY;
			const theirs = int(r, Math.round(num(s, 'limitN') * 0.35), Math.round(num(s, 'limitN') * 0.6));
			const ours = Math.round(theirs * (day >= num(s, 'date1Ms') ? 0.52 + r() * 0.08 : 0.97 + r() * 0.03));
			rows.push([`${WD[utc(day).getUTCDay()]} ${dayMonth(day)}`, thousands(ours), thousands(theirs)]);
		}
		return table(['Day (UTC)', 'Our metric', 'Your usage page'], rows);
	},
	monthEdges: (r, s) => {
		const rows: string[][] = [];
		const daily = num(s, 'dailyUse');
		const share = Math.abs(num(s, 'offset')) / 24;
		const days = [Date.UTC(2026, 8, 30), Date.UTC(2026, 9, 1), Date.UTC(2026, 9, 2), Date.UTC(2026, 9, 29), Date.UTC(2026, 9, 30), Date.UTC(2026, 9, 31), Date.UTC(2026, 10, 1)];
		let previous = Math.round(daily * (0.8 + r() * 0.4));
		for (const day of days) {
			const weekend = utc(day).getUTCDay() % 6 === 0;
			const ours = Math.round(daily * (weekend ? 0.35 : 0.85 + r() * 0.3));
			const theirs = Math.round(ours * (1 - share) + previous * share);
			rows.push([`${WD[utc(day).getUTCDay()]} ${dayMonth(day)}`, thousands(theirs), thousands(ours)]);
			previous = ours;
		}
		return table(['Day', `Our log (${s.city} time)`, 'Your usage page (UTC)'], rows);
	},
	pyBatch: (r, s) =>
		fence(
			[
				'import csv, os, time, requests',
				'',
				'KEY = os.environ["MERIDIAN_KEY"]',
				'',
				`with open("${s.importFile}") as f, open("geocoded.csv", "w") as out:`,
				'    writer = csv.writer(out)',
				'    for row in csv.DictReader(f):',
				'        r = requests.get("https://api.meridianmaps.com/v1/geocode",',
				'                         params={"q": row["address"], "key": KEY}, timeout=10)',
				'        r.raise_for_status()',
				'        best = r.json()["results"][0]',
				'        writer.writerow([row["id"], best["lat"], best["lon"]])',
				`        time.sleep(${pick(r, ['0.2', '0.1', '0.5'])})`
			],
			'python'
		),
	kotlinLoader: (r, s) =>
		fence(
			[
				'fun loadVisibleTiles(tiles: List<TileId>) = tileExecutor.execute {',
				'    for (tile in tiles) {',
				'        val bitmap = client.newCall(request(tile)).execute().use { decode(it.body.bytes()) }',
				'        tileCache.put(tile, bitmap)',
				'        mapView.postInvalidate()',
				'    }',
				'}'
			],
			'kotlin'
		),
	harSequential: (r, s) => {
		const rows: string[][] = [];
		const [x, y] = tileXY(num(s, 'lat'), num(s, 'lon'), 14);
		let t = 0;
		for (let i = 0; i < int(r, 8, 12); i++) {
			const took = int(r, 150, 400);
			rows.push([String(i + 1), `/v1/tiles/14/${x + (i % 4) - 1}/${y + Math.floor(i / 4) - 1}.png`, '200', `starts at ${t} ms, takes ${took} ms`]);
			t += took + int(r, 3, 15);
		}
		return table(['#', 'Request', 'Status', 'Timing'], rows);
	},
	harSubdomains: (r, s) => {
		const rows: string[][] = [];
		const [x, y] = tileXY(num(s, 'lat'), num(s, 'lon'), 14);
		for (let i = 0; i < int(r, 8, 12); i++) {
			const tx = x + (i % 4) - 1;
			const ty = y + Math.floor(i / 4) - 1;
			const sub = 'abc'[(tx + ty) % 3]!;
			rows.push([String(i + 1), `${sub}.api.meridianmaps.com/v1/tiles/14/${tx}/${ty}.png`, sub === 'a' ? '200' : '(failed) net::ERR_NAME_NOT_RESOLVED', sub === 'a' ? `${int(r, 30, 90)} ms` : `${int(r, 2, 9)} ms`]);
		}
		return table(['#', 'Request', 'Status', 'Time'], rows);
	},
	reactSnippet: (r, s) =>
		fence(
			[
				`export function ${s.component}({ items, filters }: Props) {`,
				'\tconst map = useMap();',
				'',
				'\tuseEffect(() => {',
				`\t\tconst layer = L.tileLayer(\`${API}/v1/tiles/{z}/{x}/{y}.png?key=\${MAP_KEY}\`);`,
				'\t\tlayer.addTo(map);',
				'\t\treturn () => layer.remove();',
				'\t});',
				'',
				'\treturn <Markers items={items} filters={filters} />;',
				'}'
			],
			'tsx'
		),
	monitorTable: (r, s) => {
		const places = ['London', 'Frankfurt', 'Virginia', 'Oregon', 'Singapore', 'Sydney', 'São Paulo', 'Tokyo'];
		const rows: string[][] = [];
		for (let i = 0; i < num(s, 'nMon'); i++) rows.push([`${s.monitor} check ${i + 1}`, places[i]!, `every ${s.interval} s`, `${API}/v1/tiles/0/0/0.png?key=pk_live_${s.keyTail}`]);
		return table(['Check', 'From', 'Interval', 'URL'], rows);
	},
	jobLog: (r, s) => {
		const lines: string[] = [];
		const now = num(s, 'nowMs');
		const day = midnight(now) - ((utc(now).getUTCDay() + 5) % 7) * DAY - (utc(now).getUTCDay() === 2 ? 7 * DAY : 0);
		let at = day + 2 * HOUR - int(r, 4, 8) * MIN;
		let id = int(r, 100000, 900000);
		for (let i = 0; i < 12; i++) {
			if (i === 3) at = day + 2 * HOUR + int(r, 1, 4) * MIN;
			if (i === 8) at = day + 2 * HOUR + 20 * MIN + int(r, 1, 3) * MIN;
			at += int(r, 20, 90) * 1000;
			const inWindow = at >= day + 2 * HOUR && at < day + 2 * HOUR + 20 * MIN;
			lines.push(`${iso(at)} geocode id=${(id += int(r, 1, 9))} -> ${inWindow ? '503 Service Unavailable (written to failures.csv)' : '200 OK'}`);
		}
		return fence(lines);
	},
	clientConfig: (r, s) =>
		fence(
			[
				`const geocoder = axios.create({ baseURL: '${API}/v1', timeout: ${s.timeoutMs} });`,
				'axiosRetry(geocoder, {',
				`\tretries: ${int(r, 2, 3)},`,
				"\tretryCondition: (error) => isNetworkOrIdempotentRequestError(error) || error.code === 'ECONNABORTED',",
				'\tretryDelay: axiosRetry.exponentialDelay',
				'});',
				'',
				'geocoder.interceptors.response.use((response) => {',
				"\tmetrics.increment('meridian.geocode.requests');",
				'\treturn response;',
				'});'
			],
			'js'
		),
	keysTable: (r, s) =>
		table(
			['Key', 'Kind', 'Created', 'Last used', 'State'],
			[
				[`pk_live_${s.keyTail}…`, 'browser', s.keyCreated!, 'today', 'active'],
				[`sk_live_${s.keyTail2}…`, 'server', s.keyCreated2!, s.lastUsedServer!, 'active'],
				...(s.revoked ? [[`pk_live_${s.keyTail3}…`, 'browser', s.keyCreated3!, s.revoked, 'revoked']] : []),
				...(!s.revoked && chance(r, 0.5) ? [[`pk_test_${s.keyTail3}…`, 'browser', s.keyCreated2!, `${int(r, 3, 40)} days ago`, 'active']] : [])
			]
		),
	encodedLog: (r, s) =>
		fence([
			`${iso(num(s, 'nowMs') - int(r, 1, 5) * HOUR)} GET /v1/geocode?q=${s.doubleEncoded} -> 200, 0 results`,
			`${iso(num(s, 'nowMs') - int(r, 1, 5) * HOUR + 4000)} GET /v1/geocode?q=${s.doubleEncodedB} -> 200, 0 results`
		]),
	projectsTable: (r, s) =>
		table(
			['Project', 'Plan', 'Daily limit', 'Created', 'Used yesterday'],
			[
				[s.proj!, s.plan!, s.limit!, s.keyCreated!, thousands(num(s, 'limitN') + int(r, 40, 900))],
				[s.proj2!, s.plan2!, s.limit2!, s.keyCreated2!, thousands(int(r, 40, 900))]
			]
		),
	searchLog: (r, s) => {
		const word = s.searchWord!;
		const rows: string[][] = [];
		for (let i = 1; i <= word.length; i++) rows.push([String(i), `/v1/geocode?q=${encodeURIComponent(word.slice(0, i)).replace(/%20/g, '+')}&key=pk_live_${s.keyTail}`, '200', `${int(r, 60, 240)} ms`]);
		return table(['#', 'Request', 'Status', 'Time'], rows);
	},
	markerSnippet: (r, s) =>
		fence(
			[
				`for (const ${s.thing} of ${s.thing}s) {`,
				`\tconst { results } = await geocode(${s.thing}.address);`,
				`\tL.marker(results[0].point).bindPopup(${s.thing}.name).addTo(map);`,
				'}'
			],
			'js'
		)
};

// ---------------------------------------------------------------------------------------------------------
// Changes to meridian-gateway that developers ask for: the platform team's note, and what support then tells
// the developer.
const changes = {
	quotaHeader: {
		notes: [
			`Read this one through. We don't send anything like that today: the gateway only says anything about the count when it answers 429. A header on every response with what's left of the day would be a change to meridian-gateway, and it's been asked for before; I've added this ticket to it on our list. No date yet, so please don't promise one.`,
			`{first} wants the remaining allowance on every response. Fair, and not the first time: it needs a change in meridian-gateway, which only mentions the count when it answers 429. Added to our list with this ticket number. Nothing scheduled.`
		],
		tell: `I asked the platform team, who look after the gateway in front of our APIs. Today the only time we say anything about the count is the 429 itself, so there's no way to see the requests left on each response. They agree it would be useful: it's on their list as a change to the gateway, with your ticket attached. I can't give you a date yet, so I'll keep this ticket open and write when it's out.`
	},
	usageEndpoint: {
		notes: [
			`Today's count only exists inside the gateway; the usage page gets it from billing the next morning. An endpoint that gives a project its count so far today would mean a change to meridian-gateway. Several customers have asked; I've put this ticket on the list with the others. No date.`,
			`Asked for a lot lately: a way for a project to read its own count for today. The gateway would have to answer it, since nothing else knows the live number. Added to our list for meridian-gateway, linked to this ticket. Not scheduled.`
		],
		tell: `I took this to the platform team, who run the gateway that does the counting. At the moment the live count for today only exists inside the gateway, and the usage page shows it with a delay, so there's nothing your systems can ask. A way to read today's count is on their list as a change to the gateway, and your ticket is linked to it. There's no date yet; I'll leave this open and let you know when it lands.`
	},
	projectIn429: {
		notes: [
			`Good point from {first}. The 429 body only says the limit, so a team whose requests are being counted as keyless can't tell. Naming the project in the body is a small change to meridian-gateway; added to our list with this ticket. No date.`,
			`The 429 body gives the limit and nothing else, which is how this one took two days. Putting the project's name in it would need a change to meridian-gateway. On the list now, with this ticket. Not scheduled yet.`
		],
		tell: `I passed your suggestion to the platform team, who look after the gateway that sends the 429. They agree the message should say which project the request was counted against, and it's now on their list as a change to the gateway, with your ticket attached. No date yet, but I'll keep the ticket open and tell you when it changes.`
	},
	resetHeader: {
		notes: [
			`retry-after is the only thing a 429 says about when the count starts again, and only as seconds. Sending the reset as a time, on the 429 or on every response, would be a change to meridian-gateway. Added to our list with this ticket. No date.`,
			`{first} would like the time the daily count starts again, as a timestamp. Reasonable; it needs a change in meridian-gateway, since that's where the 429 and its headers come from. On our list, linked to this ticket.`
		],
		tell: `I asked the platform team about this. At the moment retry-after, in seconds, is the only thing we send, and only with a 429. Sending the time the count starts again as a timestamp is on their list now as a change to the gateway, with your ticket attached. I don't have a date for it; I'll keep the ticket open and let you know.`
	},
	preflight: {
		notes: [
			`Preflights reach us without a key, so the auth layer turns them away before the gateway sees them, and a browser call with custom headers can never work. Answering OPTIONS at the gateway, without counting it, is a change to meridian-gateway plus a small one in the auth layer's routing. Added to our list. No date.`,
			`Another preflight one. The gateway would have to answer OPTIONS itself, with the right access-control headers, before anything counts it. It's on our list for meridian-gateway now, with this ticket number. Not scheduled.`
		],
		tell: `I took this to the platform team. Today a preflight reaches us without your key and is turned away before it gets anywhere, so a browser call with custom headers can't work. Answering preflights properly, without counting them against your limit, is on their list as a change to the gateway, and your ticket is attached. I can't promise a date; I'll keep this open and tell you when it's done.`
	},
	no5xxCount: {
		notes: [
			`The gateway counts each request as it arrives, before it knows what the maps API will answer, so a 503 in the maintenance window still costs the customer. Not counting requests the maps API answers with a 5xx is a change to meridian-gateway. Added to our list with this ticket. No date.`,
			`{first} asks that failed requests not count. They count today because the gateway counts on arrival. It would need a change to meridian-gateway; it's on our list now, linked here. Nothing scheduled.`
		],
		tell: `I raised this with the platform team, who run the gateway that does the counting. At the moment a request is counted when it arrives, before anyone knows what the answer will be, so failed requests count too. They agree that's not ideal, and leaving out requests our side fails is on their list as a change to the gateway, with your ticket attached. No date yet; I'll keep the ticket open and let you know.`
	},
	retryAfter503: {
		notes: [
			`During the Tuesday window the maps API answers 503 with no retry-after, and the gateway passes it on as it is. Adding a retry-after that points at the end of the window would be a change to meridian-gateway. Added to our list with this ticket. No date.`,
			`The 503s in the maintenance window go out with no hint of when to come back. The gateway could add retry-after on its way through; that's a change to meridian-gateway, on our list now, linked to this ticket.`
		],
		tell: `I asked the platform team about this. The 503s during the maintenance window go out without a retry-after today, so your job runner has nothing to go on. Adding one that points at the end of the window is on their list as a change to the gateway, with your ticket attached. I don't have a date; I'll keep the ticket open and write when it's in.`
	}
};

// ---------------------------------------------------------------------------------------------------------
// What developers write in about. {x}, {y}, {z}, {r} and {s} stand for themselves, as in tile templates.
const topics: Topic[] = [
	{
		area: 'keys and quotas',
		weight: 3,
		usage: 'low',
		subjects: ['Tiles stop loading mid-morning', 'Live map goes grey every day', 'Production map stops working, test site fine'],
		open: [
			`The map on our live site stops loading new tiles most mornings, somewhere between nine and eleven UTC. Our test site uses the same {proj} project and keeps working all day. When it happens, panning shows grey squares where the new tiles should be, and the browser's network tab shows the tile requests coming back with a 429.`,
			`Since our release on {date1}, the map on {site} works for an hour or two each morning and then stops loading tiles. We're on the {plan} plan with {limit} requests a day, and the usage page says we use about a tenth of that, so I don't see how the quota can be used up.`
		],
		quick: [`Do tile requests and geocoding requests come out of the same daily allowance?`, `They do. Every request a project makes counts once against its daily limit, whether it's a tile or a geocode.`],
		reply: `Sorry the map is letting you down. A 429 from us means a daily count has gone past its limit, so the first job is to find out which count. Could you copy one of the failing tile requests from the network tab, with its response, and send it over? "Copy as cURL" plus the response body is ideal.`,
		turns: [
			[`Here's one of the failing requests and what came back.`, `Thanks, that tells me a lot. The body says "Daily quota of 1000 requests used up", and 1,000 isn't your limit: it's the allowance shared by every request that reaches us without a key. Your test site's requests carry the key, and this one has no key parameter at all. Could you send me the tile URL template as it ends up in the live page's source?`, arts.curlAnon],
			[`This is what's in the live page source: ${API}/v1/tiles/{z}/{x}/{y}.png. Our code definitely adds the key, I've looked at it twice.`, `That's the cause. The live template ends at ".png" with nothing after it, so every tile request from the live site arrives without a key and is counted with all the other keyless requests. Those share 1,000 a day between them, which is why the allowance runs out mid-morning. Your code reads the key when the bundle is built, and it looks as if the release pipeline built it without one; the test pipeline has it, so the test site is fine.`],
			[`Why doesn't the usage page show the keyless requests against our project?`, `Because nothing in them says they're yours. Without a key a request belongs to no project, so it can't appear on your usage page or count against your {limit}.`],
			[`Is it all right for the key to sit in the page source like that?`, `Browser keys are made to be seen; that's why they start with pk_. Keep it to tiles and geocoding from the page, and give anything that runs on your servers its own sk_ key, so the two can be replaced separately.`]
		],
		need: 'the tile URL template as it ends up in the live page source',
		cause: `the live bundle was built without the key, so the site's tile requests reach us without one and are counted against the 1,000 a day shared by keyless requests`,
		act: `add the key to the release pipeline's build settings and rebuild the live bundle`,
		fixed: [`Rebuilt with the key and the live map has been fine all morning. I can't believe it was the pipeline all along.`, `That was it. The release job had no key set. The requests carry it now and the 429s have stopped.`],
		stuck: `We can't push a new build to production until our release window next {day}; the change board won't let one through before then.`,
		workaround: `Until then, one thing that helps: the tile template is a plain string in the built bundle, so your ops team can write the key into the deployed file on the server by hand. Several customers have done that in the same spot, and it disappears with the next proper build.`,
		accept: [`Ops patched the file on the server and the map works again. We'll fix the pipeline properly in the release.`, `Fine, we'll do the hand fix today and sort out the pipeline next {day}.`],
		change: [['projectIn429', `One request, though: could the 429 say which project the request was counted against? We spent two days staring at our own usage page because nothing told us these requests weren't ours.`]],
		team: 'the platform team',
		handover: `Live site {site} gets 429s with the keyless allowance message every morning; their test site on the same project is fine. Could you look in the edge log for keyless requests with this referer and confirm where they come from?`
	},
	{
		area: 'keys and quotas',
		weight: 2,
		place: 'apac',
		usage: 'over',
		subjects: ['Daily limit resets at lunchtime?', 'Quota starts again at the wrong time', 'When does the daily count reset?'],
		open: [
			`We're in {city} and our daily limit seems to start again at {resetLocal} our time, in the middle of the working day. Our crews start at seven and use most of the allowance by late morning, then the count starts again just as the afternoon gets going, so some days we run out before lunch and other days we finish with thousands to spare.`,
			`Could you explain how the daily limit works? This morning our app got 429s from about ten until {resetLocal}, and then it started working again by itself. Nobody here touched anything. We're based in {city}.`
		],
		quick: [`Is there a status page for the APIs?`, `There is: status.meridianmaps.com. You can follow it by email or RSS, and planned maintenance is announced there a week ahead.`],
		reply: `Thanks for the detail. The daily count runs on the UTC day, which is why it starts again at {resetLocal} for you. Before I suggest anything, could you send me your requests by hour for a typical day? The usage page in the console can export them.`,
		turns: [
			[`Here's yesterday by hour, from the console export. The times are UTC.`, `That shows the pattern clearly. Your working day in {city} straddles midnight UTC, and there's one hour with several thousand tile requests, at seven in the morning your time, that looks like something fetching ahead. Could you tell me what the app does when a crew starts a shift?`, arts.hourlyShift],
			[`At the start of a shift the app downloads the tiles for the crew's whole day of jobs, so they can work where there's no signal.`, `Then that's what uses up the allowance before {resetLocal}. One crew's download comes to about {prefetch} tiles, and with {crews} crews starting at seven the morning downloads alone take a big share of your {limit}. The count then starts again at midnight UTC, in the middle of your day, which is why the afternoons have plenty.`],
			[`Can you move our reset to midnight our time?`, `I'm afraid not: every project's count runs on the UTC day, and the retry-after on a 429 always counts down to midnight UTC. What you can change is when the heavy part happens.`],
			[`If we download the evening before instead, does it count against the next day?`, `It counts on the UTC day it happens. Your evening is already the next UTC day, so a download at six in the evening in {city} counts against the day that runs until {resetLocal} tomorrow.`]
		],
		need: 'what the app does when a crew starts a shift',
		cause: `the app's start-of-shift downloads for every crew use most of the day's allowance before midnight UTC, which is {resetLocal} in {city}`,
		act: `move the start-of-shift download to just after {resetLocal}, or spread it over the evening before`,
		fixed: [`We moved the downloads to run after {resetLocal} and haven't seen a 429 since. Thanks for explaining it so clearly.`, `Shifted the downloads to the evening and the crews got through the whole week without a single 429.`],
		stuck: `Moving the download means a new version of the app, and getting that through both app stores and onto the crews' phones takes us a few weeks.`,
		workaround: `In the meantime the crews can start the download from the app's menu, as you mentioned, so if the supervisors ask half of them to download after {resetLocal} the day before, the morning load halves without a new version.`,
		accept: [`The supervisors are on board. Half the crews download the afternoon before from now on, until the new version is out.`, `That'll do for now. We'll split the crews and fix it properly in the next version.`],
		change: [
			['resetHeader', `It would help if the response told our app when the count starts again, as a time rather than a number of seconds. The app shows it to the crews and the seconds confuse everyone.`],
			['usageEndpoint', `Could our app ask you how much of today's allowance is left? The supervisors could then see it on their dashboard and hold the downloads back when it's low.`]
		],
		team: 'the sales team',
		handover: `Customer in {city} runs out of daily allowance before {resetLocal} local on busy days, with a big spike at 07:00 local. They may need a bigger plan or a different schedule; could you talk them through the options?`
	},
	{
		area: 'own code',
		weight: 2,
		usage: 'over',
		subjects: ['Thousands of 429s in our logs', 'App keeps hammering the API after a 429', 'retry-after not respected?'],
		open: [
			`Yesterday our servers logged more than {big} responses with status 429 from your API in about twenty minutes. Our client is supposed to respect retry-after, so I don't understand how we could have sent anything like that many requests.`,
			`We keep seeing waves of 429s that go on for minutes, far more of them than we have users. Our client is meant to back off when it gets a 429, and it doesn't seem to.`
		],
		quick: [`Which time zone are the days on the usage page in?`, `UTC. Each day on the usage page and on the invoice runs from midnight to midnight UTC.`],
		reply: `Sorry about the noise in your logs. A 429 from us means the project has used its daily allowance, and asking again before the time in retry-after won't get a different answer. Could you send me the part of your client that handles retry-after? The few lines that read the header and wait are enough.`,
		turns: [
			[`Here's the retry code.`, `Thanks. The code reads retry-after and treats it as milliseconds, but ours is in seconds, so a value of {retrySec}, which means about {retryHours} hours, becomes a wait of {retrySec} milliseconds, a little over {retrySecShort} seconds. How many attempts does the client make before it gives up, and does every copy of the app do the same?`, arts.retryCode],
			[`It makes {attempts} attempts, and yes, every user's app runs the same code.`, `That accounts for it. When the project reached its limit at {time} UTC, every open app tried each of its requests {attempts} times, a few seconds apart, and every attempt got a 429 as well, so a few hundred users, each loading a screenful of tiles, made {big} requests in twenty minutes. None of that counts against tomorrow, but it fills your logs and uses your users' mobile data.`],
			[`Do the 429s themselves count against our quota?`, `The count goes up for every request that arrives, but once you're over the limit it makes no difference: everything until midnight UTC gets a 429 either way.`],
			[`So what should the client do after a 429?`, `Stop asking until the time in retry-after has passed, and tell the user the map is unavailable until then. With a daily limit there's nothing to gain from trying sooner.`]
		],
		need: 'how many attempts the client makes before it gives up',
		cause: `the client reads retry-after as milliseconds, so after a 429 every copy of the app tries again within seconds instead of waiting until midnight UTC`,
		act: `convert retry-after from seconds before waiting, and stop asking after a 429 until that time has passed`,
		fixed: [`Fixed the units and stopped it asking again after a 429. Our logs have been quiet since.`, `It was the milliseconds. The new build waits properly and the waves of 429s have stopped.`],
		stuck: `The fix is in the next app version, but most of our users won't update for weeks.`,
		workaround: `Until the update spreads, the extra attempts don't cost you anything against the limit. If it's the log noise that hurts, send 429s from our API to a log stream of their own, so they don't bury everything else.`,
		accept: [`Fair enough. We've split the 429s into their own stream and we'll wait for the update.`, `That's fine. It's only noise, and the new version goes out next {day}.`],
		change: [['quotaHeader', `Could you send the number of requests left with every response? Then the app could slow down before it reaches zero instead of finding out from a 429.`]],
		team: 'the platform team',
		handover: `Customer saw over {big} 429s in twenty minutes on {proj}. Their client looks like it tries again within seconds. Can you look at the edge log for {proj} around {time} UTC yesterday and confirm the pattern?`
	},
	{
		area: 'keys and quotas',
		weight: 2,
		usage: 'over',
		subjects: ['Our app stops when the website is busy', 'Allowance used up by the wrong app', 'Can we split our daily limit?'],
		open: [
			`Our {appKind} and our public website both show maps. On busy days the {appKind} starts failing in the afternoon while the website carries on, and the people using the app are the ones who really need the map. Is there any way to make sure the app is served first?`,
			`When our marketing team ran a campaign last week, the {appKind} stopped loading maps by mid-afternoon on both days of the campaign. Is that a coincidence?`
		],
		quick: [`Can one account have more than one project?`, `Yes. An account can hold as many projects as you need, each with its own keys, plan and daily limit. The accounts team sets them up.`],
		reply: `Thanks for getting in touch. My first guess is that the app and the website are drawing on the same daily allowance, but I'd like to be sure before I suggest anything. Could you tell me which keys the website and the app each use? The first few characters of each are enough.`,
		turns: [
			[`Both start pk_live_{keyTail}. I think we've only ever had the one.`, `Thanks, so both are on project {proj}, sharing its {limit} a day. For the days the app failed, could you send me the project's requests by hour? I'd like to see when the allowance ran out and what was using it.`],
			[`Here's the first campaign day by hour, from the usage export.`, `That confirms it. The allowance ran out at {runOut} UTC, and the website's traffic was three to four times its usual level from the moment the campaign emails went out. Every visitor to the website loads a map, so the campaign spent the allowance the {appKind} relies on later in the day.`, arts.hourlyPeak],
			[`So what are our options?`, `The usual answer is two projects: one for the website and one for the {appKind}, each with its own key and its own daily limit. Then a busy day on the website can only use up the website's share.`],
			[`Does a second project cost extra?`, `Each project has its own plan. Many customers keep the app on its current plan and put the website on a smaller one; the sales team can quote for whatever split suits you.`]
		],
		need: `the project's requests by hour for the days the app failed`,
		cause: `the website and the {appKind} share project {proj} and its key, so a busy day on the website uses the allowance the app needs`,
		act: `ask the accounts team for a second project, move the website onto its key, and choose a plan for each`,
		fixed: [`The website has its own project now and the {appKind} sailed through this week's campaign. Thanks for working it out.`, `Split done. The app has its own key and allowance, and the website can be as busy as it likes.`],
		stuck: `A second key means a new release of the website, and we're in a code freeze until next {day}.`,
		workaround: `Until the freeze ends, you could keep the map on the website's busiest pages as a still image with a "show map" button. That cuts the website's tile requests a lot without a release of the app.`,
		accept: [`Marketing grumbled, but the landing pages show a still map for now. We'll split the projects after the freeze.`, `We'll do the still-image trick on the campaign pages until the freeze ends.`],
		change: [['usageEndpoint', `Is there a way for our own systems to see how much of the day's allowance is left? We'd like to warn someone before it runs out, not after.`]],
		team: 'the accounts team',
		handover: `Customer's website and {appKind} share one project ({proj}) and one key, and the app runs out of allowance on busy website days. Could you talk them through a second project for the website, and the keys?`
	},
	{
		area: 'keys and quotas',
		weight: 2,
		usage: 'over',
		subjects: ['Usage spike we cannot explain', 'Is someone else using our key?', 'Requests on days our app was offline'],
		open: [
			`Our usage page shows {big2} requests on Saturday, and our app was in maintenance all weekend with nobody using it. On a normal weekend day we do about {normal}.`,
			`Our app's map stopped working on Sunday afternoon with 429s. We have a few hundred users and have never come anywhere near our limit before.`
		],
		quick: [`How do I see which of our keys a request used?`, `The usage page can split any day by key: choose "Group by key" above the chart.`],
		reply: `That does look odd, and I'm glad you wrote in straight away. Could you send me the keys on the project as they appear on the Keys page? The page only shows the start of each key, so it's safe to paste.`,
		turns: [
			[`Here's the Keys page.`, `Thanks. Nearly all of the weekend's requests came in on the server key, sk_live_{keyTail2}, not the browser key your app uses. Is that server key used anywhere other than your own servers, for example in a script, a demo, or a repository other people can see?`, arts.keysTable],
			[`Oh no. Our intern built a demo last summer and I've just found it on GitHub, public, with the server key in a config file.`, `That explains it. I looked at the requests on that key: since {date1} they've come from addresses at a hosting company, with a Python user agent, geocoding long lists of addresses in several languages. Someone found the key in the repository and has been using your allowance for their own work.`, arts.scraperLog],
			[`What should we do first?`, `Make a new server key on the Keys page, put it on your servers, and then revoke the old one. Taking the file out of the repository isn't enough on its own, because the key stays in the history.`],
			[`Will we be charged for the extra requests?`, `No. Plans have a fixed price, and requests over the limit get a 429 rather than a bill, so the only cost was the allowance itself on the days it ran out.`]
		],
		need: 'whether the server key is used anywhere other than your own servers',
		cause: `the server key was published in a public demo repository, and someone has been using it for their own geocoding since {date1}`,
		act: `make a new server key, put it on your servers, revoke the old one and take the demo repository down`,
		fixed: [`New key in, old one revoked, demo deleted. The usage page is back to normal. Thanks for spotting it so fast.`, `Done. The weekend numbers dropped straight back to where they should be.`],
		stuck: `The old key is built into a reporting tool our finance team uses, and its supplier can't change it until next month.`,
		workaround: `Then revoke it as soon as the tool is updated, and meanwhile give the tool a key of its own on a separate project with a small plan. Whoever has the leaked key can then only use up that project's allowance, not your app's.`,
		accept: [`Sensible. The accounts team set up a small project for the finance tool, and the app is safe on its own key.`, `We'll do that. It contains the damage until the supplier catches up.`],
		team: 'the accounts team',
		handover: `Weekend spike on {proj} came in on the server key, while their app uses the browser key. Customer is looking for where the server key might be exposed. Could you look at where that traffic comes from and help them replace the key?`
	},
	{
		area: 'own code',
		weight: 2,
		subjects: ['Usage page shows twice what we send', 'Request counts look doubled', 'Are you counting our requests twice?'],
		open: [
			`Our own metrics say we made about {ours} geocoding requests yesterday, and your usage page says {theirs}. That's close to double, and at that rate we'll reach our limit long before we planned to.`,
			`I think the usage figures are wrong. We count every request we send, and since {date1} your numbers have been running at almost twice ours.`
		],
		quick: [`How long do you keep the usage history?`, `Thirteen months by day, and the last 30 days by hour.`],
		reply: `Thanks for comparing the two so carefully; it makes this much easier. We count each request when it reaches us, so a gap usually means some requests leave your side without being counted there. Could you send me how your HTTP client is set up for our API, including any timeout and retry settings?`,
		turns: [
			[`Here's the client setup.`, `Thanks. The timeout is {timeoutMs} milliseconds and the client tries again after a timeout, while your metric counts only the responses that arrive. Could you tell me what changed around {date1}? Something new in the queries, or in where the calls are made from?`, arts.clientConfig],
			[`On {date1} we started sending full addresses with flat numbers and the town, instead of just the street. Here's the comparison by day.`, `That's it. Longer, more detailed queries take us longer to answer, often two to three seconds, and your client gives up at {timeoutMs} milliseconds and sends the same request again. Both reach us and both are counted, but your metric only sees the one that comes back. I can see it in our log too: pairs of identical queries about two seconds apart.`, arts.usageCompare],
			[`So the first request still gets answered?`, `Yes. We finish the work and send the result, but your client has stopped listening, so the answer is thrown away.`],
			[`What timeout do you suggest?`, `Ten seconds suits geocoding: almost every answer comes back in under three, and the rare slow one is worth waiting for rather than paying for twice.`]
		],
		need: 'what changed around {date1}',
		cause: `the client times out after {timeoutMs} milliseconds and tries again, so slower geocoding answers are requested twice and both requests count`,
		act: `raise the client's timeout to ten seconds and count every attempt in your metrics, repeats included`,
		fixed: [`Timeout raised to ten seconds and our numbers match yours to within a few dozen. Thanks for getting to the bottom of it.`, `That was it. Since the change the usage page and our dashboard agree.`],
		stuck: `The client config lives in a shared library that four teams use, and changing it needs everyone's sign-off.`,
		workaround: `Then for now you could set a longer timeout just for geocoding calls, where your code calls the library, if it lets you pass one per request. Most HTTP libraries do.`,
		accept: [`The library takes a per-request timeout, so geocoding calls get ten seconds and nobody else is affected. Good enough until the shared change goes through.`, `We'll pass a longer timeout on the geocoding calls until the library is changed.`],
		change: [['quotaHeader', `Could each response carry the number of requests left today? We'd rather watch it go down in our own metrics than compare two usage pages.`]],
		team: 'the platform team',
		handover: `Customer's usage page shows nearly twice their own count for {proj}. I suspect repeats after a short client timeout. Can you look in the edge log for duplicate geocoding queries on {proj}?`
	},
	{
		area: 'own code',
		weight: 2,
		subjects: ['Thousands of requests at night', 'Our usage never drops below {perHour} an hour', 'Where do our night-time requests come from?'],
		open: [
			`Our app is only used in office hours, but the usage page shows about {perHour} requests every hour through the night as well, weekends included. It adds up to a good chunk of our daily limit, and I can't think what would be calling you at three in the morning.`,
			`We're getting close to our daily limit far earlier than our user numbers would suggest. Looking at the hourly view, there's a steady stream of requests even when everyone is asleep.`
		],
		quick: [`Does a tile at zoom 0 count the same as any other tile?`, `Yes. Every tile counts as one request, whatever its zoom.`],
		reply: `Steady traffic at night is usually a machine rather than people, so let's find it. Could you export your requests by hour for one day and send them over?`,
		turns: [
			[`Here's yesterday by hour.`, `Thanks. There's a floor of almost exactly {perHour} tile requests in every hour, day and night, with your users' traffic on top of it in office hours. Something is fetching tiles on a fixed timer. Do you have uptime monitoring or health checks pointed at our API?`, arts.hourlyFlat],
			[`Our ops team set up checks in {monitor} a while back. Here's the list.`, `That's the floor: {nMon} checks, each fetching a tile every {interval} seconds, comes to {perHour} requests an hour and {perDay} a day. In our log every one of them is the same world tile at zoom 0, with {monitor}'s user agent.`, arts.monitorTable],
			[`We do want to know if your API goes down, though.`, `Of course. status.meridianmaps.com has an API of its own that you can poll for free, and it doesn't count against your limit. If you'd also like to know that your key works, one check from one place every five minutes costs 288 requests a day.`],
			[`Would every five minutes be often enough?`, `For most teams, yes. Anything that lasts longer than a few minutes shows on the status page as well, usually within ten.`]
		],
		need: 'whether you have uptime monitoring or health checks pointed at our API',
		cause: `{nMon} uptime checks in {monitor} each fetch a tile every {interval} seconds, which comes to {perDay} requests a day`,
		act: `point the uptime checks at the status page's API, or cut them to one check every five minutes`,
		fixed: [`Ops moved the checks to the status page and the night-time floor has gone. We've got a lot of allowance back.`, `Cut the checks down to one every five minutes. The usage graph finally looks like our users.`],
		stuck: `The checks belong to a contractor who looks after our infrastructure, and changing them is a billable job we need approval for.`,
		workaround: `In the meantime you could give the checks their own key on a separate project with the free plan. They'd keep working, and they'd stop eating into your app's allowance straight away; the contractor only has to change the key in the URL.`,
		accept: [`The free project for the checks went in today. Approval for the proper change is pending, but the allowance is ours again.`, `Good idea. We'll move the checks onto a free project until the contract change is approved.`],
		change: [['usageEndpoint', `What we really wanted was a way to see that our key works and how much allowance is left, without using it up. Could you add something like that?`]],
		team: 'the platform team',
		handover: `Customer sees a flat {perHour} requests an hour on {proj}, day and night. Looks like monitoring. Could you check the user agents on {proj}'s tile requests overnight?`
	},
	{
		area: 'keys and quotas',
		weight: 2,
		subjects: ['Extra requests for {event}', 'Temporary limit increase', 'Big day coming up'],
		open: [
			`We run the live map for {event} in {city} on {eventDate}. Last year the map had about {eventLoad} requests on the day, well over our {plan} limit of {limit}. Can we have a higher limit for that day?`,
			`A heads-up: {event} is on {eventDate} and our {appKind} is the official map for it. We'd rather not find out at noon that we've run out. What can we do?`
		],
		quick: [`Do you have a test key that doesn't count against our limit?`, `Test keys count like any other key, but you can make a separate project for testing so it never eats into the live one.`],
		reply: `Thanks for the warning; it's much easier when we hear in advance. A higher limit for a day is arranged by the sales team, and I can get the details together for them. Could you send me last year's numbers by hour for the day, or your best estimate?`,
		turns: [
			[`Here's our estimate by hour, based on last year.`, `Thanks. That peaks at around {peak} an hour and comes to roughly {estTotal} for the day. One question before I pass it on: is the map shown anywhere other than your own site and app, for example embedded on a partner's page?`, arts.hourlyEvent],
			[`Now you mention it, the local paper embedded our map in its live coverage last year, and they've asked to again.`, `That's probably where last year's peak came from. An embed loads the map for every reader of the page, whether they look at it or not, and a live page during {event} has a lot of readers. With the embed I'd ask for {raise} for the day; without it, about half that.`],
			[`Will the higher limit drop back by itself afterwards?`, `The accounts team sets it the day before and puts it back the morning after, so you don't need to do anything. It applies to whole UTC days.`],
			[`And what will it cost?`, `It's a one-off charge for the extra day, which the sales team will quote once they have the numbers. It's usually much less than a month on the bigger plan.`]
		],
		need: 'whether the map is shown anywhere other than your own site and app',
		cause: `the event day needs about {raise} requests, mostly because the local paper embeds the map in its live coverage`,
		act: `confirm the numbers with the sales team and sign their quote for the day`,
		fixed: [`The quote came this morning and we've signed it. The higher limit is booked for {eventDate}. Thanks for making it painless.`, `All agreed: {raise} for the day of {event}. That's a weight off.`],
		stuck: `Our budget for the event is already spent, so we can't pay for anything extra this year.`,
		workaround: `Then the cheapest option is to ask the paper to show a still image of the map with a link to your live page, rather than the live map itself. That takes most of the peak away, and your own site and app should fit within {limit}.`,
		accept: [`The paper is happy with a still image and a link. We'll stay within our limit and try for the budget next year.`, `Good idea. We'll ask them to link to us instead of embedding.`],
		team: 'the sales team',
		viaTeamOnly: true,
		handover: `Customer expects about {estTotal} requests for {event} on {eventDate} (normally {limit} a day), going by last year. Could you quote a one-day increase and ask the accounts team to set it?`
	},
	{
		area: 'keys and quotas',
		weight: 2,
		usage: 'low',
		subjects: ['403 on older app versions', 'Old app versions lost the map', 'Forbidden errors since our key clean-up'],
		open: [
			`Since {date1}, people on older versions of our {appKind} see a grey map with no streets at all. The current version, {appv}, is fine. The requests from the older versions come back 403.`,
			`We're getting app store reviews saying the map has stopped working. It only seems to hit people who haven't updated in a while.`
		],
		quick: [`Can we give a key a name, so we know which app it's for?`, `Yes: click the key on the Keys page and fill in the Label box. Labels are only shown to your team.`],
		reply: `Sorry about the reviews; that's never fun. A 403 comes from our authentication layer and means the key isn't accepted. Could you send me the Keys page, so I can see which keys the project has and when each was last used?`,
		turns: [
			[`Here's the Keys page.`, `Thanks. Only one browser key is active, and it was made on {keyCreated}. Could you tell me which app version started using it, and whether anyone has revoked a key recently?`, arts.keysTable],
			[`The key was new in {appv}. And yes, I tidied up the Keys page on {date1} and revoked the old browser key, because I thought nothing used it any more.`, `That's the cause. Every version before {appv} has the old key built in, so since it was revoked on {date1} our authentication layer refuses their requests with a 403. Our records show the old key was still in use by about {pct}% of your users the day before.`],
			[`Can the old key come back?`, `A revoked key can be restored by the accounts team for up to 30 days after it was revoked, so yes, if you'd like it back.`],
			[`How do we avoid this next time?`, `Before revoking a key, look at its "Last used" date on the Keys page. If it's recent, something still depends on it.`]
		],
		need: 'which app version started using the new key, and whether anyone has revoked a key recently',
		cause: `the old browser key, still built into every version before {appv}, was revoked on {date1}, so those versions get a 403`,
		act: `release a version that asks people on old versions to update, then revoke the old key once its use has dropped away`,
		fixed: [`The old key is back and the older versions have their maps again. We'll leave it until hardly anyone uses it.`, `Restored, and the reviews have calmed down. Lesson learnt about the Last used column.`],
		stuck: `We'd rather not bring the old key back as it was, because an old build of the app leaked onto a modding forum.`,
		workaround: `Then the safest middle way is to restore it on a project of its own with a small daily limit. Old versions get a working map while people update, and the most it can cost you is that small allowance.`,
		accept: [`That's a good compromise. The old key is back on a small project and we'll revoke it for good in the new year.`, `We'll go with the small project for the old key.`],
		team: 'the accounts team',
		viaTeamOnly: true,
		handover: `Older versions of the customer's {appKind} get 403 since about {date1}, and the Keys page shows a browser key revoked that day. Could you see whether that key is still in use and talk to them about restoring it?`
	},
	{
		area: 'own code',
		weight: 2,
		subjects: ['Geocoding fails from the browser', 'Error calling geocode from our web page', 'Address search works locally, not live'],
		open: [
			`Our address search works when I run the site locally, but on {site} every geocoding call fails in the browser. The tiles load fine on the same page with the same key.`,
			`We've moved our address search from our server into the browser to save a round trip, and now it fails in every browser we try. Tiles are fine.`
		],
		quick: [`Do you have a JavaScript client for geocoding?`, `Not an official one. The API is a single GET request, so most teams use fetch directly; the docs have examples for fetch and axios.`],
		reply: `Thanks for the report. Tiles working while geocoding fails from the same page usually comes down to how the browser sends the request rather than the key. Could you send me what the browser console shows when a search fails?`,
		turns: [
			[`Here's the console, from Safari.`, `Thanks. The browser is sending a preflight request before the real one, and the preflight gets a 401. Browsers only do that for requests with custom headers or an unusual content type. Could you send me the code that makes the geocoding call?`, arts.safariConsole],
			[`Here's the function.`, `Found it. The X-Client-Version and X-Session headers make the browser send an OPTIONS request first, without your key, to ask whether those headers are allowed. Our authentication layer answers a request without a key with a 401, the browser takes that as a no, and the real request is never sent. Tiles are plain image requests with no custom headers, so they never need a preflight.`, arts.fetchSnippet],
			[`Why does it work locally?`, `Locally your dev server passes the call on to us from Node, and only browsers send preflights. Live, the browser calls us directly.`],
			[`Can we put the version somewhere else?`, `Yes. Add it as a query parameter, such as &client=web-{appv}. We ignore parameters we don't recognise, and it will show in our logs if you ever need us to look.`]
		],
		need: 'the code that makes the geocoding call',
		cause: `the call sends custom headers, so the browser sends a preflight request without the key, which gets a 401, and the real request is never made`,
		act: `remove the custom headers from the geocoding call and send the version as a query parameter`,
		fixed: [`Dropped the headers and search works in every browser. Thanks for spotting that.`, `Moved the version into the query string and it all works on the live site now.`],
		stuck: `Our analytics people rely on those headers, so I can't drop them without a fight.`,
		workaround: `Then keep the geocoding call on your server for now, as it was before, and send the headers from there. Only browsers send preflights, so the server route works with any headers you like.`,
		accept: [`We've put the server route back for now. A bit slower, but it works.`, `Fine, we'll keep the server route until analytics can live without the headers.`],
		change: [['preflight', `Could your side answer the preflight properly instead? Plenty of APIs do, and we'd rather keep the headers.`]],
		team: 'the platform team',
		handover: `Browser geocoding from {site} fails: the preflight requests get a 401 from our auth layer. Could you confirm what happens to OPTIONS requests and advise them?`
	},
	{
		area: 'geocoding',
		weight: 2,
		subjects: ['Night batch fails every Tuesday', '503 errors around two in the morning', 'Geocoding unavailable at night'],
		open: [
			`Our nightly job geocodes new customer addresses at two in the morning UTC, and on Tuesdays a chunk of it fails with 503 errors. The rest of the week it runs cleanly.`,
			`Every week a few hundred of our overnight geocoding requests fail with "Service Unavailable". We've only just noticed that it's always the same night.`
		],
		quick: [`Is there a batch endpoint for geocoding?`, `Not at the moment; each address is one GET request. Running a few requests side by side is fine.`],
		reply: `Sorry about the failed runs. Could you send me a piece of the job's log from a night when it failed, with the times of the failures?`,
		turns: [
			[`Here's last Tuesday's log around the failures.`, `Thanks. Every failure falls between 02:00 and 02:20 UTC, and everything before and after is fine. Does the job try a failed address again later, or does it write it down and move on?`, arts.jobLog],
			[`It writes it to a failures file and moves on. Someone reruns the file by hand on Wednesday mornings, when they remember.`, `Then that's the whole story. The maps API has a weekly maintenance window on Tuesdays from 02:00 to 02:20 UTC, while the geocoding index is swapped for the new one, and during it geocoding answers 503. It's on the status page, but it's easy to miss. Your job starts at two, so it runs straight into the window every week.`],
			[`Do the failed requests count against our limit?`, `Yes. Every request that reaches the gateway counts, whatever the maps API answers.`],
			[`Can we be told when the window moves?`, `Follow planned maintenance on status.meridianmaps.com; changes to the window are announced there a week ahead.`]
		],
		need: 'whether the job tries a failed address again later',
		cause: `the job starts at 02:00 UTC on Tuesdays, inside the maps API's weekly maintenance window, when geocoding answers 503`,
		act: `start the job at 02:30 UTC, or have it rerun the failures after the window`,
		fixed: [`Moved the job to half past two. A clean run this Tuesday for the first time in months.`, `We added a second pass at three o'clock and the failures file was clean this week.`],
		stuck: `The job's start time is fixed by the data warehouse load, which nobody here can change.`,
		workaround: `Then a second pass at the end of the job will do it: anything that failed between 02:00 and 02:20 gets another go once the window is over. It's a few lines in most job runners.`,
		accept: [`We've added the second pass. Not elegant, but the failures file was clean this week.`, `A second pass it is. Thanks.`],
		change: [
			['no5xxCount', `That seems unfair, though. Could requests that fail on your side stop counting against our limit?`],
			['retryAfter503', `Could the 503 at least say when to try again? Our job runner would wait by itself if the response told it how long.`]
		],
		team: 'the maps API team',
		handover: `Customer's nightly batch fails with 503s on Tuesdays between 02:00 and 02:20 UTC, which looks like the maintenance window. Could you confirm and advise them on timing?`
	},
	{
		area: 'own code',
		weight: 1,
		subjects: ['Connection reset errors from our Java service', 'Intermittent "Connection reset"', 'First request after a quiet spell fails'],
		open: [
			`Our backend, a Java service, gets "Connection reset" on roughly one geocoding request in fifty. Trying again straight away always works, which makes it hard to pin down.`,
			`We see sporadic SocketExceptions when calling geocode from our server, mostly first thing in the morning and after lunch. Is something on your side dropping connections?`
		],
		quick: [`Do you support HTTP/2?`, `Yes, on api.meridianmaps.com, and HTTP/1.1 as well. Clients choose when they connect.`],
		reply: `Thanks for the clear description. Could you send me the stack trace from one of the failures?`,
		turns: [
			[`Here's one from this morning.`, `Thanks. The reset happens as your client starts reading the response, which points at a connection that was already closed when the request went out. Could you send me how the connection pool is set up?`, arts.javaTrace],
			[`Here's the pool setup.`, `That's it. Your pool keeps idle connections for {idleMin} minutes, and our load balancer closes a connection after 60 seconds without traffic. When a quiet spell lasts longer than a minute, the next request goes out on a connection we've already closed and gets a reset. It's commonest after quiet spells, which matches your mornings and lunchtimes.`, arts.poolConfig],
			[`Why does trying again always work?`, `The broken connection is thrown away, so the second attempt opens a fresh one.`],
			[`Is 60 seconds going to change?`, `Not that I know of. It's the same for every customer, and the docs list it under connection limits.`]
		],
		need: 'how the connection pool is set up',
		cause: `the client keeps idle connections for {idleMin} minutes, while our load balancer closes them after 60 seconds, so the first request after a quiet spell goes out on a closed connection`,
		act: `evict idle connections after 30 seconds, and try once more on a connection reset`,
		fixed: [`Set the idle eviction to 30 seconds and we haven't had a single reset in a week.`, `That was it. Thirty-second eviction and the resets are gone.`],
		stuck: `That service is owned by another team, and they won't release until next sprint.`,
		workaround: `Until then, one more attempt on "Connection reset" in your own calling code covers it: the broken connection is gone by then, so the second attempt always opens a fresh one.`,
		accept: [`We've wrapped the call with one more attempt on a reset. The other team will change the pool next sprint.`, `That'll hold us until their release.`],
		team: 'the platform team',
		handover: `Customer's Java client gets connection resets after idle periods; probably their pool outliving our 60-second idle timeout. Could you confirm the load balancer's idle timeout and look for resets from {proj}?`
	},
	{
		area: 'own code',
		weight: 1,
		subjects: ['Map looks scrambled', 'Tiles in the wrong places', 'Patchwork map on our new page'],
		open: [
			`Our new map page shows a patchwork: the tiles load, but they don't line up, and there's sea and farmland where {city} should be. The old page, which uses the same key, is fine.`,
			`The tiles on our new page all load, but they look like they're from somewhere else entirely, jumbled up like a badly made jigsaw. I've checked the key three times.`
		],
		quick: [`What's the highest zoom you serve?`, `Zoom 19 in towns and cities, and zoom 16 in most of the countryside.`],
		reply: `Since the tiles themselves load, the key is fine; this sounds like the coordinates in the tile URLs. Could you send me the code that sets up the tile layer on the new page?`,
		turns: [
			[`Here's the tile layer setup.`, `Thanks. The template has {y} before {x}, and our URLs are zoom, then x, then y. Could you also send me a couple of the tile URLs from the network tab, so I can see what's being asked for?`, arts.tileLayerSwapped],
			[`Here's one that should be our street: /v1/tiles/14/{tileY}/{tileX}.png. The ones next to it look just as wrong.`, `That confirms it. With x and y swapped, every tile is asked for at a mirror-image place: that URL is a tile from another continent entirely, and tiles that should sit side by side come from places far apart, hence the patchwork. Swap them back and the map will line up.`],
			[`Do the wrong tiles count against our limit?`, `They do: every tile requested counts, whether or not it's the one you meant, so the broken page has been costing you a little allowance as well.`],
			[`Where would the wrong order have come from?`, `Some services use the TMS scheme, which counts y from the bottom, and examples written for them often have the numbers in a different order. Ours follows the usual web scheme.`]
		],
		need: 'a couple of the tile URLs from the network tab',
		cause: `the tile template on the new page has y before x, so every tile is asked for at the wrong place`,
		act: `change the tile template to zoom, x, y`,
		fixed: [`Swapped them back and the map lines up perfectly. Slightly embarrassed, thanks.`, `That was it. The tiles are all where they should be now.`],
		stuck: `The template comes from a config service another team owns, and they deploy on Thursdays.`,
		workaround: `Until Thursday you could swap the two numbers in your own code before the template is used; the layer then asks for the right tiles, and you can take the swap out when the config is fixed.`,
		accept: [`We've put a temporary swap in our code until the config is fixed on Thursday.`, `A temporary swap will do until their deploy.`],
		team: 'the maps API team',
		handover: `Customer's new page shows tiles from the wrong places; their template has {y} before {x}. Could you confirm from the maps API side that nothing else is wrong?`
	},
	{
		area: 'own code',
		weight: 2,
		subjects: ['Map flickers and our requests tripled', 'Map reloads whenever someone ticks a filter', 'Request count jumped after our redesign'],
		open: [
			`Since our redesign went live on {date1}, the map on our {page} page flashes whenever anything on the page changes, and our daily request count has roughly tripled with the same number of visitors.`,
			`Our usage has gone from about {normal} a day to {big2} since we rebuilt the front end in React, and the map visibly reloads every time someone ticks a filter.`
		],
		quick: [`Can I preload tiles for the area around the user?`, `Most map libraries can keep a ring of tiles around the view; in Leaflet it's the keepBuffer option. Each preloaded tile counts as a request.`],
		reply: `Thanks for the clear description. A flash followed by a reload usually means the map's tile layer is being made again, which fetches every visible tile again. Could you send me the component that adds the tile layer?`,
		turns: [
			[`Here's the component.`, `Thanks. The effect that adds the tile layer has no dependency list, so React runs it after every render: it removes the layer and adds a brand-new one each time. How often does that component render when someone uses the filters?`, arts.reactSnippet],
			[`I logged it: about {renders} times per filter change, because the list and the counters all update.`, `Then that's the tripling. Each render throws away the layer and fetches every visible tile again, usually {tilesView} or so on your page, so one filter change can cost a few hundred tile requests. The flash is the new layer drawing over the old one.`],
			[`What's the right way to write it?`, `Make the layer once, when the map is made, and leave it alone afterwards. Give your effect [] as its dependency list, or keep the layer in a ref and only change its URL when the style really changes.`],
			[`Would some of those requests have come from the browser cache?`, `Some of them, which is why it tripled rather than going up tenfold. Tiles can be cached for a day, but a new layer can ask again before the browser has finished storing the first copies.`]
		],
		need: 'how often the component renders when someone uses the filters',
		cause: `the effect that adds the tile layer runs after every render, so each filter change rebuilds the layer and fetches every visible tile again`,
		act: `make the tile layer once and give the effect [] as its dependency list`,
		fixed: [`One-line fix in the end. The flashing has stopped and our usage is back where it was before the redesign.`, `Done, and the request count dropped back the same day. Thanks.`],
		stuck: `The map component comes from a design system package another team maintains, and their next release is weeks away.`,
		workaround: `Until then, wrapping the map in React.memo with a comparison that ignores the filter props stops most of the re-renders from reaching it. It's not the real fix, but it cuts the extra requests a lot.`,
		accept: [`React.memo around the map took most of the extra requests away. The design system team will fix the effect in their next release.`, `We'll use the memo wrapper until the package is fixed.`],
		team: 'the platform team',
		handover: `Customer's request count tripled after a React redesign; looks like the tile layer is made again on every render. Could you check the edge log for repeated tile requests from {site}?`
	},
	{
		area: 'own code',
		weight: 1,
		place: 'europe',
		subjects: ['Markers in the wrong place', 'All our pins are in the sea', 'Geocoded points show up off Africa'],
		open: [
			`We geocode our {things} and drop a pin for each one on the map. Every pin ends up in the Indian Ocean, off the coast of East Africa, instead of around {city}.`,
			`Your geocoder seems to give us the wrong coordinates: every result lands thousands of kilometres from the address, somewhere in the sea.`
		],
		quick: [`How precise are the coordinates you return?`, `Five decimal places, which is about a metre. For an address the point is the entrance where we know it, and otherwise the middle of the building.`],
		reply: `Points landing in the sea, thousands of kilometres from addresses in {country}, usually mean latitude and longitude have changed places somewhere. Could you send me one geocoding response for an address you know, exactly as it comes back?`,
		turns: [
			[`Here's the response for our office.`, `Thanks. The response is right: the lat and lon fields put it in {city}. The point array holds the same two numbers the other way round, longitude first, as GeoJSON does. Could you send me the lines that turn a result into a marker?`, arts.geocodePoint],
			[`Here's the loop that adds the markers.`, `That's it. The code passes results[0].point to L.marker, and Leaflet wants latitude first. With the numbers the other way round, a point near {city} becomes a point just south of the equator in the Indian Ocean. Use [result.lat, result.lon] instead of point and the pins will land where they should.`, arts.markerSnippet],
			[`Why is the point array there at all?`, `For GeoJSON tools and for maps that take longitude first, such as MapLibre. It saves people building it themselves.`],
			[`Is the order going to change?`, `No. The lat and lon fields and the point in GeoJSON order are fixed for v1.`]
		],
		need: 'the lines that turn a result into a marker',
		cause: `the code passes the point array, which is longitude first, to Leaflet, which wants latitude first`,
		act: `build each marker from result.lat and result.lon instead of the point array`,
		fixed: [`Pins are all back on dry land. Thanks, and sorry for blaming your geocoder.`, `Changed it to lat and lon and every pin is in the right place.`],
		stuck: `That loop is in a white-label app our reseller builds for us, and they release monthly.`,
		workaround: `Then until their release you can turn the point round where it leaves your own code: if you control the geocoding wrapper, return [lat, lon] in point and the reseller's loop will draw the pins correctly.`,
		accept: [`We control the wrapper, so we've turned the point round there for now. The reseller will fix the loop next month.`, `The wrapper change works. Thanks for the idea.`],
		team: 'the geocoding team',
		handover: `Customer's geocoded pins all land in the Indian Ocean; looks like lat/lon order in their marker code, but could you confirm the responses for {proj} are right?`
	},
	{
		area: 'own code',
		weight: 1,
		subjects: ['Two tiles in three never load', 'Patchy map, most tiles fail', 'Tiles failing on our new site'],
		open: [
			`On our new site only about a third of the map tiles load; the rest stay grey. The old site, with the same key, loads every tile.`,
			`We copied a map setup from an example online and now most tiles never arrive. The ones that do look perfect.`
		],
		quick: [`Is there a limit on how many tiles a browser can load at once?`, `Not from us. Browsers limit connections to one host, but over HTTP/2 that rarely matters for tiles.`],
		reply: `Sorry about the patchy map. Could you send me what the browser's network tab shows for a few of the tiles, both the ones that work and the ones that don't?`,
		turns: [
			[`Here's the network tab, filtered to tiles.`, `Thanks, that's very telling. The tiles that work come from a.api.meridianmaps.com, and the ones that fail go to b. and c. and never get as far as us: the browser can't find those hosts at all. Could you send me the code that sets up the tile layer?`, arts.harSubdomains],
			[`Here it is.`, `There it is: the template starts with {s}. and sets subdomains to 'abc', which is how some other tile services spread requests over three hosts. We only have api.meridianmaps.com; a.api.meridianmaps.com still exists for an old SDK, which is why one tile in three works.`, arts.tileLayerSubdomains],
			[`Should we keep using a. for some of them?`, `No, please use api.meridianmaps.com for everything. The a. host is kept only for old SDK versions and won't be there for ever.`],
			[`Will loading everything from one host be slower?`, `Not noticeably. The API speaks HTTP/2, so the browser fetches many tiles over one connection at once.`]
		],
		need: 'the code that sets up the tile layer',
		cause: `the tile template uses {s}. subdomains copied from another service, and only a.api.meridianmaps.com exists, so two tiles in three go to hosts that don't exist`,
		act: `change the template to api.meridianmaps.com without {s} and remove the subdomains option`,
		fixed: [`Took the {s} out and every tile loads. Thanks.`, `Fixed. All tiles from api.meridianmaps.com now and the map is complete.`],
		stuck: `The new site is built by an agency and they've gone quiet until next week.`,
		workaround: `If you can edit the page's settings, setting subdomains to just 'a' gets every tile loading in the meantime, since that host still answers. Please move to api.meridianmaps.com properly when the agency is back, though.`,
		accept: [`Subdomains set to 'a' and the map is whole again. The agency will do it properly next week.`, `We'll use 'a' until the agency can change the template.`],
		team: 'the maps API team',
		handover: `Customer's tiles only load from a.api.meridianmaps.com; b. and c. don't resolve. Is the a. alias still meant to be there, and for how long?`
	},
	{
		area: 'map tiles',
		weight: 2,
		subjects: ['Grey squares when zooming in out of town', 'Map goes grey at high zoom', 'Detail in the countryside'],
		open: [
			`When our users zoom right in around {rural}, the map turns into grey squares. In {city} itself it's fine at every zoom. Our users work outdoors, so the countryside matters more to us than the town.`,
			`Our people in the field say the map "falls apart" when they zoom in on rural sites. Zooming back out one or two levels brings it back.`
		],
		quick: [`Do you have aerial imagery as well as the street map?`, `Not at the moment. The tiles are the street map in three styles: standard, night and outdoor.`],
		reply: `Thanks for the report. Grey squares at high zoom only outside town usually means the map is asking for a zoom level we don't have for that area. Could you send me the code that sets up your tile layer?`,
		turns: [
			[`Here's our tile layer.`, `Thanks. The layer asks for tiles up to zoom 19 everywhere. Could you tell me the zoom level and the rough place where it first goes grey for your users?`, arts.tileLayerZoom],
			[`Around {rural} it goes grey at zoom 17 and beyond.`, `That matches our coverage: we have zoom 17 to 19 for towns and cities, and outside them the most detailed level is 16. Above that we have nothing to send, so your map shows grey. Leaflet can stretch the most detailed tile it has instead: set maxNativeZoom to 16 and keep maxZoom at 19, and users can still zoom right in, with the zoom 16 tiles enlarged.`],
			[`Will the enlarged tiles look blurry?`, `A little at 19, since it's the zoom 16 image at eight times the size, but roads and paths stay where they are. Most outdoor apps work that way.`],
			[`Is more detail planned for the countryside?`, `The map data team publishes a coverage plan each spring; I don't know of a date for {rural}.`]
		],
		need: 'the zoom level and the rough place where it first goes grey',
		cause: `the layer asks for zoom 17 to 19 everywhere, and outside towns the most detailed tiles we have are zoom 16`,
		act: `set maxNativeZoom to 16 on the tile layer and leave maxZoom at 19`,
		fixed: [`maxNativeZoom did it. Everyone can zoom all the way in now, and nobody minds the slight blur.`, `That's exactly what we needed. No more grey squares.`],
		stuck: `Enlarged tiles won't do for us, I'm afraid. Our surveyors need real detail at field level.`,
		workaround: `Until there's more detail out there, the enlarged tiles at least keep the map usable, and your surveyors can mark points by GPS rather than by eye. I've asked the map data team to note {rural} as an area customers need.`,
		accept: [`We'll use the enlarged tiles for now and hope {rural} makes the coverage plan.`, `Fine as a stopgap. Thanks for passing it on.`],
		team: 'the map data team',
		handover: `Customer's map goes grey at high zoom outside town; their layer asks for zoom 19 everywhere. Could you confirm our coverage for their area and whether more detail is planned?`
	},
	{
		area: 'map tiles',
		weight: 1,
		subjects: ['Map looks blurry on new laptops', 'Fuzzy map on phones', 'Sharper tiles?'],
		open: [
			`Our map looks noticeably blurry on MacBooks and newer phones, while the text on the rest of the page is crisp. On an ordinary office monitor it looks fine.`,
			`A customer sent us a screenshot of our map next to a competitor's on an iPhone, and ours is clearly fuzzier. Is there a sharper version of the tiles?`
		],
		quick: [`Do sharper tiles use more data?`, `Each one is about three times the size of an ordinary tile, which is noticeable on a slow phone connection.`],
		reply: `There is: every tile comes in a double-resolution version for high-density screens. Could you send me how your tile layer is set up, so I can show you where it goes?`,
		turns: [
			[`Here's the tile layer.`, `Thanks. The template asks for the ordinary 256-pixel tiles, which a high-density screen enlarges to twice their size, hence the blur. Which map library and version are you using? How you ask for the sharp tiles depends on it.`, arts.tileLayerRetina],
			[`It's {lib}, on the web.`, `Then add {r} after {y} in the template, so it ends in {y}{r}.png, and set detectRetina to true. The library fills in @2x on high-density screens and nothing on others, and we send 512-pixel tiles for @2x.`],
			[`Does an @2x tile count as more than one request?`, `No. It's one request like any other tile, just a bigger image.`],
			[`Can we use @2x everywhere to keep things simple?`, `You can, but ordinary screens would download three times the data for no visible gain, so the {r} placeholder is the better choice.`]
		],
		need: 'which map library and version you use',
		cause: `the tile layer asks for 256-pixel tiles, which high-density screens enlarge and blur`,
		act: `add {r} to the tile template and set detectRetina`,
		fixed: [`Added {r} and the map is pin-sharp on every screen we have. Thanks!`, `Night and day. The map finally looks as crisp as the rest of the page.`],
		stuck: `Our app wraps an old version of the library that doesn't know about {r}, and upgrading it is a bigger job than we can take on this quarter.`,
		workaround: `In that case you can choose the template in your own code: if window.devicePixelRatio is above 1, use a template with @2x written in, and otherwise the plain one. It's two lines and does the same job.`,
		accept: [`Two lines it was. Sharp on retina screens, and the library upgrade can wait.`, `We'll pick the template ourselves until we can upgrade.`],
		team: 'the cartography team',
		handover: `Customer's tiles look blurry on high-density screens; I've suggested @2x. They're asking whether every style, night included, has @2x tiles. Can you confirm?`
	},
	{
		area: 'own code',
		weight: 2,
		subjects: ['Tiles very slow in our Android app', 'Map takes ages to fill in', 'Slow tile loading, are your servers busy?'],
		open: [
			`In our Android app the map fills in one tile at a time, like a slow jigsaw, and takes eight or ten seconds to finish on a good connection. The same area in a browser loads in under a second. Is something slow about your servers for mobile requests?`,
			`Our users complain that the map in the app is sluggish. It's worst when they pan quickly: the grey squares take ages to fill.`
		],
		quick: [`Do you serve tiles as WebP?`, `Not yet; tiles are PNG. Smaller formats are on the maps API team's list.`],
		reply: `Sorry to hear the app feels slow. A browser loading the same area in under a second suggests our side is answering quickly, so I'd like to look at how the app asks for tiles. Could you capture the tile requests while the map fills in, with their start times and durations?`,
		turns: [
			[`Here's a capture from the app's network inspector.`, `Thanks, that's very clear. Each tile takes 150 to 400 milliseconds, which is normal, but each one only starts when the one before it has finished: they run one after another, never side by side. Could you send me the code that loads the visible tiles?`, arts.harSequential],
			[`Here's our tile loader.`, `That's the cause. The loop waits for each tile to download and decode before it asks for the next, so a screen of {tilesView} tiles takes {tilesView} round trips end to end. A browser fetches six or more at a time. Start the downloads together, with six to eight at once, and the map will fill in about as fast as the browser does.`, arts.kotlinLoader],
			[`Will more requests at once count against our limit any differently?`, `No. It's the same tiles, so the same number of requests, just sooner.`],
			[`Is there anything else we should do on Android?`, `Keep one HTTP client for the whole app so connections are reused, and keep decoded tiles in a memory cache sized for two or three screens.`]
		],
		need: 'the code that loads the visible tiles',
		cause: `the app's tile loader downloads tiles one after another, waiting for each before starting the next`,
		act: `download the visible tiles in parallel, six to eight at a time`,
		fixed: [`Parallel downloads went out in today's build and the map fills in about as fast as the website. Thank you.`, `Six at a time and it's like a different app. Users have noticed already.`],
		stuck: `Rewriting the loader means a release, and our Android developer is on leave for two weeks.`,
		workaround: `Until then, a bigger memory cache helps more than you'd think: most panning goes back over tiles the user has just seen, and those wouldn't need fetching again. It's one number in your settings.`,
		accept: [`We've raised the cache size and panning back and forth is much better. The loader rewrite can wait until he's back.`, `The bigger cache will do until the rewrite.`],
		team: 'the mobile SDK team',
		handover: `Customer's own Android tile loader is slow because it fetches tiles one at a time. They asked whether our Android SDK would do this for them. Can you advise?`
	},
	{
		area: 'map tiles',
		weight: 2,
		subjects: ['Street names out of date', 'Old street name still on the map', 'Map shows a renamed street'],
		open: [
			`{oldName} in {city} was renamed {newName} {renamedWhen}, and your map still shows the old name. Our customers type the new name and then can't find it on the map.`,
			`A user pointed out that the map has the wrong name for a street near our office. The council renamed it a while ago.`
		],
		quick: [`How often do you update the map data?`, `There's a full data release on the first Tuesday of each month, and smaller label corrections go out weekly.`],
		reply: `Thanks for letting us know. Could you send me the street's old and new names, and a tile or a point where the old name shows?`,
		turns: [
			[`It's {oldName}, now {newName}. It shows on the tile at zoom 16 around {latR}, {lonR}.`, `Thanks, I can see the old name on the tiles. If you search for "{newName}" in geocoding, does it find the street, or nothing?`],
			[`Searching for {newName} finds it, in the right place. Only the label on the map is old.`, `That's the cause, then. The rename reached our geocoding data in the last release, but the map labels come from a different source, which hadn't picked it up by the cut-off for the release on {release}. So search knows the new name and the tiles still show the old one.`],
			[`When will the map catch up?`, `The next full release is on the first Tuesday of next month, and the map data team can push a single label correction sooner than that if it's urgent.`],
			[`Can we report these ourselves in future?`, `Yes: there's a "Report a map problem" form in the console, and reports go straight to the map data team.`]
		],
		need: 'whether searching for the new name in geocoding finds the street',
		cause: `the rename reached the geocoding data but not the map labels before the cut-off for the last release`,
		act: `report the street through the map problem form so the label correction can be scheduled`,
		fixed: [`We sent it in through the map problem form, and the new name was on the map within the week. Thanks.`, `Reported it through the form as you suggested; {newName} shows on the map this morning.`],
		stuck: `We can't wait a month: the street is the main entrance to our new depot, and drivers keep driving past it.`,
		workaround: `Until the label changes, your app could show the street name from geocoding in the address card next to the pin, since geocoding already has {newName}. People then see the right name where they read it.`,
		accept: [`We'll show the geocoded name in the card. Good enough until the label changes.`, `That works for us for now.`],
		team: 'the map data team',
		handover: `{oldName} in {city} was renamed {newName}, but the map still shows the old name. Can you push a label correction?`
	},
	{
		area: 'map tiles',
		weight: 1,
		outcomes: ['team', 'team', 'workaround', 'quiet', 'act'],
		subjects: ['Labels hard to read on the night style', 'Night style contrast', 'Street names too faint at night'],
		open: [
			`We use the night style for our {appKind} at night, and our drivers say the street names are very hard to read, especially on the smaller roads. Is there a way to make them stronger?`,
			`Our accessibility audit found that the minor road labels on the night style don't have enough contrast against the background.`
		],
		quick: [`Can we choose the language of the labels?`, `Yes: add lang= to the tile URL with a two-letter code. Where we have no name in that language, the local name is shown.`],
		reply: `Thanks for passing that on; label contrast matters a lot to people reading a map on the move. Could you tell me which style you request exactly, and at which zoom levels the labels are hardest to read?`,
		turns: [
			[`We request style=night, and it's worst between zoom 14 and 16.`, `Thanks. At 14 to 16 the minor road labels on the night style are a mid-grey on a deep blue-grey, which is on the faint side. Could you send me a tile reference where it's at its worst, so the cartography team has an example?`],
			[`Here's one: zoom 15 around {latR}, {lonR}. The road names in the middle are the problem.`, `Thanks, I can see it. The minor road labels there come out at about 3.2 to 1 against the background, where most accessibility guidance asks for 4.5 to 1. That's a choice in the style rather than anything in your setup, so it's one for the cartography team.`],
			[`Is there another style that would be better in the meantime?`, `The outdoor style has stronger labels at those zooms, but it's light, so it won't suit night driving.`],
			[`Would the cartography team change the style for everyone?`, `They review the styles twice a year, and accessibility reports carry weight. I can't promise what they'll decide.`]
		],
		need: 'a tile reference where the labels are at their worst',
		cause: `the minor road labels on the night style have a contrast of about 3.2 to 1 at zoom 14 to 16, which is a choice in the style`,
		act: `send the cartography team your audit's figures through the style feedback form in the console`,
		fixed: [`The cartography team darkened the background a touch and the labels are much clearer. Our drivers noticed straight away.`, `The night style labels are noticeably stronger since this week's update. Thank you.`],
		stuck: `We can't wait for a design review; the drivers are out every night.`,
		workaround: `Then in the meantime, many night-driving apps show the map one zoom level further in than usual: on the night style the labels at 17 are larger and bolder and much easier to read.`,
		accept: [`We've moved the drivers' view in by one zoom level and they say it's readable. We'll wait for the review.`, `One level closer works for now. Thanks.`],
		team: 'the cartography team',
		viaTeamOnly: true,
		handover: `Customer says the night style's minor road labels are hard to read at zoom 14 to 16 (style=night). Could you look at it and reply to them?`
	},
	{
		area: 'map tiles',
		weight: 1,
		outcomes: ['resolved', 'resolved', 'team', 'quiet', 'act'],
		subjects: ['Can we move the map credits?', 'Attribution on small screens', 'Do we have to show the copyright line?'],
		open: [
			`Our designer would like to take the "© Meridian Maps, © OpenStreetMap contributors" line off the map and put it on our About page instead. It covers part of the map on small phones. Is that allowed?`,
			`In our {appKind} the credit line at the bottom of the map wraps onto two lines on small screens and hides the street names underneath. What are we allowed to do with it?`
		],
		quick: [`Can we change the colours of the map?`, `Not on the tiles themselves, but there are three styles to choose from: standard, night and outdoor.`],
		reply: `Good question, and thanks for asking before changing it. Could you describe how the credit looks on the smallest screen you support?`,
		turns: [
			[`On a 360-pixel-wide phone it wraps onto two lines and covers about 30 pixels at the bottom of the map.`, `Thanks. The credit has to stay on the map itself, visible without leaving the page, but it doesn't have to be full length all the time. Which map library does the app use? Some have a compact version built in.`],
			[`It's {lib}.`, `Then you're in luck: the attribution control can be shown as a small "i" button that opens the full credit when tapped. That's within our terms and the OpenStreetMap licence, as long as the button is on the map and the full text is one tap away. Moving the credit to an About page isn't, I'm afraid.`],
			[`Can we make the text smaller instead?`, `Yes, as long as it stays legible. Around 10 pixels is the smallest most people can read.`],
			[`Does the same apply in our printed reports?`, `Printed maps need the credit printed on the page too, near the map; the "i" button only works on screens.`]
		],
		need: 'which map library the app uses',
		cause: `the credit line wraps on small screens, and the terms allow a compact credit on the map but not moving it off the map`,
		act: `change the attribution control to its compact form, with the full credit one tap away`,
		fixed: [`The compact credit looks much better, and our designer is happy. Thanks for the quick answer.`, `We've gone with the "i" button. It's tidy and the streets are visible again.`],
		stuck: `Our designer still wants it off the map entirely.`,
		workaround: `I'm afraid that's the one thing the licence doesn't allow; the compact button is as small as it can get.`,
		accept: [`Understood, we'll go with the button.`, `Fair enough.`],
		team: 'the legal team',
		handover: `Customer asks whether they can move the map credit off the map, because it covers part of the map on small screens. Could you confirm for them in writing what they may do?`
	},
	{
		area: 'billing and accounts',
		weight: 1,
		outcomes: ['resolved', 'resolved', 'team', 'team', 'quiet', 'act'],
		subjects: ['Keeping tiles on the device', 'Offline maps for our crews', 'Are we allowed to store tiles?'],
		open: [
			`Our {appKind} is used in places with no signal, so we'd like to download the tiles for an area in advance and keep them on the phone. Is that allowed on our plan, and how long can we keep them?`,
			`Before we build an offline mode: can we keep your tiles on our users' devices? I've read the terms twice and can't tell.`
		],
		quick: [`Do downloaded tiles count against the daily limit?`, `Yes, each tile counts when it's downloaded, offline use or not. Showing it again from the phone's storage doesn't count.`],
		reply: `Thanks for asking first. The short answer is yes, within limits, but the details depend on how much you'd keep. Could you tell me roughly how big an area each user would download, and how many users would do it?`,
		turns: [
			[`Each user would take their working area for the week, roughly {areaKm} square kilometres, down to zoom 16. We have about {users} users.`, `Thanks. At zoom 16 that's about {areaTiles} tiles per user each week. Would the tiles stay on the phone after the week, or be cleared when the next week's area comes down?`],
			[`We'd clear them each week. Nobody needs last week's area.`, `Then you're within the standard terms: tiles may be kept on a user's device for up to 30 days, for use in your app by that user, as long as they aren't shared between devices or exported. The downloads count against your daily limit like any other request, so the download days need room for them.`],
			[`What if a user needs an area kept longer, say for a long project?`, `Beyond 30 days, or for a whole county at once, you'd need the offline licence, which is an add-on to the Scale plan. The sales team can tell you more.`],
			[`Can we download over Wi-Fi at night to save mobile data?`, `Yes, any time. The tiles count on the UTC day they're downloaded.`]
		],
		need: 'whether the tiles would stay on the phone after the week',
		cause: `keeping each user's weekly area on the device for under 30 days is within the standard terms, and longer storage needs the offline licence`,
		act: `clear stored tiles after 30 days at most and plan the downloads within the daily limit`,
		fixed: [`That's all we needed to know. We'll build the offline mode to clear tiles weekly.`, `Clear answer, thank you. We'll keep it to a week.`],
		stuck: ``,
		workaround: ``,
		accept: [``, ``],
		team: 'the legal team',
		handover: `Customer wants to keep tiles on users' devices for offline use, about {areaTiles} per user each week. Could you confirm in writing what the standard terms allow?`
	},
	{
		area: 'geocoding',
		weight: 3,
		subjects: ['Geocoder returns the wrong town', 'Addresses ending up in another city', 'Wrong results for common street names'],
		open: [
			`When we search for "{street}", the geocoder often returns the one in {town2} instead of the one in {city}, even though all our customers are in and around {city}.`,
			`About one address in twenty comes back in the wrong town. It's always the common names: {street}, High Street and so on.`
		],
		quick: [`Is there a limit on the length of a query?`, `Up to 250 characters. Anything longer is cut off at 250 before it's matched.`],
		reply: `Sorry for the confusion that's causing. Could you send me the full request for one of the wrong results, exactly as your code sends it, and what comes back?`,
		turns: [
			[`Here's one, the request and the response.`, `Thanks. The query is just the street name, with no town or country, so the geocoder has nothing to choose between the streets of that name, and it ranks the bigger place first. Do your addresses have a town or postcode that could go in the query, or are you searching on the street alone on purpose?`, arts.geocodeAmbiguous],
			[`The street alone. The town is in a separate field and we never thought to send it.`, `That's the cause. Add the town to the query, and pass country={cc} so nothing comes back from abroad. If you'd rather not change the query, near={latR},{lonR} tells the geocoder to prefer results near {city}, and that alone sorts out most of these.`],
			[`Does near= stop results from further away completely?`, `No, it only ranks nearby results higher. If you want nothing outside an area, use bbox= with the corners of the area instead.`],
			[`Do the extra parameters cost anything?`, `No. A geocode request counts once, whatever parameters it has.`]
		],
		need: 'whether your addresses have a town or postcode that could go in the query',
		cause: `the queries contain only the street name, so the geocoder ranks the biggest place with that street first`,
		act: `add the town and country={cc} to the queries, or pass near= with {city}'s coordinates`,
		fixed: [`Added the town and the country, and the wrong towns have gone. Thanks.`, `near= did it. We haven't had a result in the wrong town since.`],
		stuck: `The address form is part of a supplier's system and we can't change what it sends this year.`,
		workaround: `If you can't change the query, compare the town in each result with your own town field and take the first result that matches; the right one is almost always in the first three.`,
		accept: [`We match on the town in our own code now. Clumsy, but it works.`, `That'll do until the supplier's system is replaced.`],
		team: 'the geocoding team',
		handover: `Customer's street-only queries return the biggest town with that street name. Could you advise them, and say whether ranking could take a project's usual area into account?`
	},
	{
		area: 'geocoding',
		weight: 2,
		subjects: ['Flat numbers confuse the geocoder', 'Addresses with flat numbers land at the wrong end of the street', 'Wrong house number matched'],
		open: [
			`Addresses with a flat number in front, like "Flat {houseLow}, {houseHigh} {street}", come back at the wrong end of the street. Without the flat number they're spot on.`,
			`Our drivers keep being sent to the wrong end of long streets, and it's always addresses in blocks of flats.`
		],
		quick: [`Do you return postcodes in the results?`, `Yes, in the postcode field, wherever the country has postcodes.`],
		reply: `Thanks for spotting the pattern; that helps a lot. Could you send me one such address as you send it, and the result you get back?`,
		turns: [
			[`Here's one: the query was "Flat {houseLow}, {houseHigh} {street}, {city}".`, `Thanks. The geocoder has read the flat number, {houseLow}, as the house number and matched number {houseLow} on {street}, at the other end of the street. Do all your flat addresses start with the word "Flat", or do you also get "Apartment", "Unit" and so on?`, arts.geocodeUnit],
			[`Mostly "Flat", some "Apt" and "Unit", and a few written like "3/12".`, `Then that's the cause: when the flat number comes first, the geocoder takes the first number it finds as the house number. The geocoding team knows about it and it's on their list. Until then, the reliable fix is to move the flat part to the end of the query, after the town, where it's ignored, or take it off before sending.`],
			[`Will taking it off lose us anything?`, `Not for the pin: we place addresses by building, not by flat, so the point is the same either way.`],
			[`What about the "3/12" ones?`, `The same: send "12 {street}" and keep the 3 for your own records.`]
		],
		need: 'whether all your flat addresses start with the word "Flat"',
		cause: `when the flat number comes first in the query, the geocoder reads it as the house number`,
		act: `take the flat or unit part off the front of the query before sending it`,
		fixed: [`We strip the flat part before geocoding now and the drivers are going to the right doors.`, `Moved the flat to the end of the query and every test address lands correctly.`],
		stuck: `Our dispatchers need the flat on the label, and our system only stores the address as one line.`,
		workaround: `Keep the full line for the label and send a trimmed copy for the pin: the label never has to come from us, so nothing your dispatchers see changes.`,
		accept: [`Trimmed copy for the pin, full line for the label. Works for us until the geocoder learns about flats.`, `We'll send the trimmed copy. Thanks.`],
		team: 'the geocoding team',
		handover: `Flat numbers at the start of a query are read as house numbers ("Flat {houseLow}, {houseHigh} {street}"). Customer asks when this will be fixed. Can you give them an update?`
	},
	{
		area: 'own code',
		weight: 1,
		subjects: ['Addresses with accents return nothing', 'No results for some street names', 'Geocoding fails on special characters'],
		open: [
			`Any address with an accent or a special letter returns no results, for example "{accentPlace}". Plain addresses work perfectly.`,
			`Some searches for our {things} return nothing at all, and they all seem to have letters like ø, é or ú in them.`
		],
		quick: [`Do you accept POST for geocoding?`, `No, geocoding is GET only, with the query in the q parameter.`],
		reply: `Thanks, that's a very useful clue. Could you send me the request URL exactly as it leaves your code for one of the failing addresses?`,
		turns: [
			[`Here's what our request log shows for "{accentPlace}".`, `Thanks. The query in that URL has been encoded twice: the letter has become %25C3..., where it should be %C3.... We decode the query once, so we're searching for the literal text with percent signs in it, which matches nothing. Could you send me the lines that build the URL?`, arts.encodedLog],
			[`We call encodeURIComponent on the address and then pass it to URLSearchParams.`, `That's the cause: URLSearchParams encodes the value itself, so the address is encoded once by you and once more by it. Pass the raw address to URLSearchParams and leave the encoding to it.`],
			[`Why did plain addresses work, then?`, `A space encoded twice becomes %2520, which we read as "%20", and the matcher drops symbols it doesn't recognise. Letters beyond plain ASCII don't survive that.`],
			[`Is there a quick way to test a query?`, `The console has a geocoding playground under Tools that shows the request it sends; comparing its URL with yours shows the difference straight away.`]
		],
		need: 'the lines that build the URL',
		cause: `the address is encoded with encodeURIComponent and then again by URLSearchParams, so letters beyond ASCII arrive encoded twice`,
		act: `pass the raw address to URLSearchParams without encoding it first`,
		fixed: [`Took out our own encoding and "{accentPlace}" finds it first time. Thanks.`, `That was it. Every accented address we've tried works now.`],
		stuck: `The encoding happens in a shared helper half our services use, and nobody wants to touch it this close to a release.`,
		workaround: `Then for the geocoding call alone you can build the URL by hand rather than through the helper: '${API}/v1/geocode?q=' + encodeURIComponent(address), once, and nothing else.`,
		accept: [`We've given the geocoding call its own URL builder. The shared helper can wait.`, `Building it by hand for geocoding works. Thanks.`],
		team: 'the geocoding team',
		handover: `Customer's queries with accented letters return nothing; they arrive double-encoded. Could you confirm we decode once and suggest anything for them?`
	},
	{
		area: 'keys and quotas',
		weight: 2,
		usage: 'over',
		subjects: ['Import job stops every night', '429s during our address import', 'Geocoding our old records'],
		open: [
			`We're geocoding the {imported} addresses from our old system, and the job stops with 429s after a few hours every night. It picks up again the next day and then stops again.`,
			`Our one-off import keeps getting "Daily quota of {limitN} requests used up". At this rate it'll take weeks.`
		],
		quick: [`Can we keep the coordinates you return in our own database?`, `Yes. Results from geocoding can be stored for as long as you're a customer and used within your own service.`],
		reply: `Thanks for the details. Could you send me one of the 429 responses and a rough idea of how the job works?`,
		turns: [
			[`Here's a 429 from last night. The job reads a CSV and geocodes each row.`, `Thanks. The 429 is the project's daily limit of {limit}, and with {imported} addresses that's {days} days of the whole allowance, leaving nothing for your live service. Could you send me the script, or the part that makes the requests?`, arts.curlOwn],
			[`Here's the loop.`, `Thanks. Each row is geocoded as it comes, so an address that appears many times is geocoded every time. In a customer database that's usually a lot: if you sort the file by address, I'd expect a large share of repeats. Geocoding each distinct address once and joining the results back would cut the job down considerably.`, arts.pyBatch],
			[`You're right, {dupPct}% of the rows are repeats. That's embarrassing.`, `Not at all, it's the most common thing we see with imports. That leaves {unique} distinct addresses, which can be spread over a few nights while keeping half the allowance free for the live service.`],
			[`Can we run it faster in the meantime?`, `The limit is per UTC day, so speed doesn't help once it's reached. Running it in the hours your live service is quiet keeps the two out of each other's way.`]
		],
		need: 'the part of the script that makes the requests',
		cause: `the import geocodes every row, repeats included, so it needs {days} days of the project's whole daily allowance`,
		act: `geocode each distinct address once and spread the import over several nights`,
		fixed: [`Deduplicated the file and the import finished in three nights without touching the live service. Thanks.`, `Done: distinct addresses only, spread over the week, and not one 429 for the live service.`],
		stuck: `We have to finish the import by {date}, and even without the repeats it won't fit.`,
		workaround: `Then ask the sales team for a higher limit for the week of the import; it's a one-off charge, and the limit goes back to {limit} afterwards.`,
		accept: [`We've taken the higher limit for the week. Expensive lesson, but we'll make the deadline.`, `A week's increase it is. Thanks for the pointer.`],
		change: [['quotaHeader', `It would help if every response said how many requests are left today. The job could stop at a safe margin instead of running into the wall.`]],
		team: 'the sales team',
		handover: `Customer is importing {imported} addresses on {plan} ({limit} a day) and runs into the limit every night. Could you talk them through a temporary increase?`
	},
	{
		area: 'geocoding',
		weight: 1,
		subjects: ['Reverse geocoding gives the address across the river', 'Wrong street from coordinates', 'Nearest address is on the other bank'],
		open: [
			`Our drivers' app uses reverse geocoding to show the street they've stopped in. Along {river} it often gives an address on the other bank, which can be a twenty-minute drive away.`,
			`When we turn GPS positions into addresses, about one in ten comes back with a street that's close as the crow flies but on the far side of the river.`
		],
		quick: [`How many results does reverse geocoding return?`, `Up to ten, with limit=; without it you get one.`],
		reply: `Thanks for the clear description. Could you send me one of the positions that gave the wrong side, with what you got back?`,
		turns: [
			[`Here's one from yesterday.`, `Thanks. The first result is on {farStreet}, about {revDist} metres away across {river}, and the street the driver was actually in comes second, a little further off. Reverse geocoding ranks purely by straight-line distance. Do your drivers stop on the road itself, or in car parks and yards set back from it?`, arts.reverseJson],
			[`Mostly yards and loading bays, set back from the street.`, `Then that explains it: from a yard set back from the street, the nearest address can be across the water. Ask for three results with limit=3, and take the one on the street your route has for that stop.`],
			[`Can't the geocoder know about the river?`, `Not today: it doesn't consider how you'd get somewhere, only how far away it is. The geocoding team has had requests for it.`],
			[`Would sending the driver's heading help?`, `Not at the moment; reverse geocoding only takes the position.`]
		],
		need: 'whether your drivers stop on the road itself or in yards set back from it',
		cause: `reverse geocoding ranks by straight-line distance, so from yards set back from the street the nearest address can be across {river}`,
		act: `ask for three results and take the one that matches the stop on the route`,
		fixed: [`Three results and a match against the route: the far-bank addresses have gone. Thanks.`, `limit=3 and picking by route works a treat.`],
		stuck: `Our app doesn't know the route, only the position, so we can't choose between results.`,
		workaround: `Then prefer the result on the same side as the driver's last few positions: if they've been on one bank for a while, they haven't crossed. It's crude, but it gets rid of most of the wrong ones.`,
		accept: [`We use the last positions to pick the bank now. Not perfect, but far fewer complaints.`, `We'll try the last-positions trick.`],
		team: 'the geocoding team',
		handover: `Reverse geocoding near {river} picks addresses across the water for this customer. Could you advise them?`
	},
	{
		area: 'geocoding',
		weight: 2,
		after: Date.UTC(2026, 9, 7),
		subjects: ['Geocoder results changed this week', 'First result is now a bus stop', 'Search results different since the update'],
		open: [
			`Since {release}, searching for some of our addresses gives a bus stop or a car park as the first result instead of the street, and our app takes the first result. Nothing has changed on our side.`,
			`Something changed in geocoding recently: a handful of our searches now come back with odd first results, like "{street} (bus stop)".`
		],
		quick: [`Are the data releases announced anywhere?`, `Yes, in the changelog in the docs and on the status page, a week before each release.`],
		reply: `Thanks for the report, and sorry for the surprise. Could you send me one query and the response you get now?`,
		turns: [
			[`Here's one.`, `Thanks. Since the release on {release} the geocoder returns bus stops and car parks as well as addresses and streets, and when the query is only a street name, a stop with that name can score a little higher. Does your app ever want places like stops, or always streets and addresses?`, arts.geocodeOrder],
			[`Always addresses or streets. We deliver to doors, not bus stops.`, `Then add type=address,street to the query, and the geocoder will only return those. That brings back exactly what you had before the release. The release notes mention the new result types, but I appreciate nobody reads those for fun.`],
			[`Will other new types appear in future?`, `Possibly. With type= set, new types never reach you unless you add them.`],
			[`Should we look at the confidence score too?`, `It's worth it: anything under about 0.6 is usually a guess, and showing those to a person to confirm saves trouble.`]
		],
		need: 'whether your app ever wants places like stops',
		cause: `since the release on {release} geocoding also returns stops and car parks, and the app takes the first result without looking at its type`,
		act: `add type=address,street to the queries`,
		fixed: [`type=address,street and we're back to normal. Thanks for the quick answer.`, `That fixed it. No more bus stops.`],
		stuck: `The query string is built by a mobile app that's already in the stores, and the next version is weeks away.`,
		workaround: `Then in the meantime your server could pick the first result whose type is address or street from the list, if the app's results pass through it; the right one is nearly always second.`,
		accept: [`Our server filters the results for now. The app gets the type parameter in the next version.`, `Filtering on the server will do for now.`],
		team: 'the geocoding team',
		handover: `Since {release}, street-only queries sometimes return a stop first for this customer. Could you explain the change to them?`
	},
	{
		area: 'own code',
		weight: 2,
		usage: 'over',
		subjects: ['Quota runs out since our new search box', 'Requests up five times this month', 'Search uses far more requests than expected'],
		open: [
			`Since we added an address search box to our {page} page, our usage has gone up about five times and we've hit the daily limit twice this week. We only get a few hundred searches a day.`,
			`Our geocoding requests have gone through the roof since we put an address search on our {page} page on {date1}, and we're now getting 429s by the afternoon. I can't see why a few hundred searches would need that many.`
		],
		quick: [`Is there an autocomplete endpoint?`, `Not yet; geocoding is for complete queries. Many customers build a type-ahead on top of it with a short delay.`],
		reply: `Thanks for writing in. When usage jumps after a search box goes live, the first thing I look at is how often the box calls us. Could you open the network tab, search for one address the way a user would, and send me the geocoding requests that appear?`,
		turns: [
			[`Here are the requests from typing "{searchWord}" into the box.`, `Thanks, that shows it straight away: one request for every letter typed, {searchLen} requests for one search, and each counts against your limit. Was the box meant to wait until the user stops typing?`, arts.searchLog],
			[`It was meant to. I see the delay was lost when we moved the box into the new header component.`, `That's the cause. Without the wait, every keystroke is a geocoding request, so a few hundred searches become several thousand requests, and the partial queries rarely find anything useful anyway. With a wait of 300 milliseconds after the last keystroke, and nothing sent until three letters are typed, most searches come down to one or two requests.`],
			[`Do the partial queries do any harm apart from the count?`, `Only that the results jump about while the user types, which some people find confusing.`],
			[`Should we cache searches as well?`, `It helps if the same places are searched often, such as your own {things}. Results can be stored for as long as you're a customer.`]
		],
		need: 'whether the box was meant to wait until the user stops typing',
		cause: `the search box sends a geocoding request for every keystroke because its delay was lost in a redesign`,
		act: `restore the 300-millisecond wait and send nothing until three letters are typed`,
		fixed: [`Put the delay back and our usage dropped to a fifth overnight. Thanks for spotting it.`, `Fixed. Three letters and 300 milliseconds, and the 429s have stopped.`],
		stuck: `The header component is shared with our other sites and frozen until the new year.`,
		workaround: `Then a cheaper change might be possible outside the component: if the page passes the search function in, wrap that function in a debounce before handing it over. The component stays as it is.`,
		accept: [`The search function is passed in, so we debounced it on our side. Usage is down to normal.`, `Wrapping the function works. Thanks.`],
		team: 'the geocoding team',
		handover: `Customer's search box sends a geocoding request for every keystroke ({searchLen} for one search). Could you advise them on building a type-ahead on geocoding, and say whether anything is planned for it?`
	},
	{
		area: 'billing and accounts',
		weight: 2,
		place: 'europe',
		after: Date.UTC(2026, 10, 2),
		viaTeamOnly: true,
		outcomes: ['team', 'team', 'resolved', 'resolved', 'quiet', 'act'],
		subjects: ['Invoice needs our new company details', 'Wrong VAT number on invoice', 'Purchase order number on invoices'],
		open: [
			`Our October invoice has our old company address and no VAT number, and our finance team won't pay it as it is. Could it be reissued?`,
			`Our accounts department needs a purchase order number on every invoice from now on. How do we add one, and can last month's be redone?`
		],
		quick: [`Can invoices go to a shared mailbox instead of me?`, `Yes: the account owner can set a billing email under Billing, Details. It can be any address.`],
		reply: `Of course. Could you send me the details as they should appear: company name, address, VAT number and any purchase order number?`,
		turns: [
			[`Here they are: {co}, {street2}, {city}; VAT number {vatNo}; purchase order {po}.`, `Thanks. I've updated the billing details, so November's invoice will carry them. For October's, could you confirm the invoice number, so I ask for the right one to be reissued?`],
			[`It's this one.`, `Thanks, that's the one. Reissuing an invoice that's already been sent is done by the billing team, because it means cancelling the old one with a credit note and issuing a new one. The VAT will show as reverse charge now that we have your number.`, arts.invoiceTable],
			[`Will the due date change?`, `The new invoice gets a fresh 30 days from the day it's issued.`],
			[`Can we pay by bank transfer instead of card?`, `On yearly plans, yes; on monthly plans payment is by card. The billing team can move you to yearly if that suits.`]
		],
		need: 'the number of the October invoice',
		cause: `October's invoice was issued before the new company details and VAT number were on the account`,
		act: `look over the reissued invoice and pass it to your finance team`,
		fixed: [`Got the reissued invoice and finance have paid it. Thanks for the quick turnaround.`, `The new invoice is perfect, and it's paid. Thank you.`],
		stuck: ``,
		workaround: ``,
		accept: [``, ``],
		team: 'the billing team',
		handover: `Please reissue {co}'s October invoice with the new details: {street2}, {city}, VAT number {vatNo}, purchase order {po}.`
	},
	{
		area: 'billing and accounts',
		weight: 2,
		usage: 'over',
		outcomes: ['resolved', 'resolved', 'team', 'team', 'quiet', 'act'],
		subjects: ['Upgraded but still limited', 'Still getting 429s after upgrading', 'Upgrade not taking effect?'],
		open: [
			`We upgraded from {plan} to {plan2} yesterday afternoon, and this morning we hit 429s at the old limit of {limit}. Has the upgrade not gone through?`,
			`I paid for the {plan2} plan on {date2}, but our app is still being told "Daily quota of {limitN} requests used up".`
		],
		quick: [`Is an upgrade charged for the whole month?`, `No: an upgrade is charged pro rata for the days left in the billing period, and the next invoice shows the difference on its own line.`],
		reply: `Sorry about that; an upgrade should apply within a few minutes. Could you send me the Projects page from the console, so I can see each project's plan?`,
		turns: [
			[`Here's the Projects page.`, `Thanks, that explains a lot. The upgrade went onto {proj2}, which is now on {plan2}, but the 429s are on {proj}, which is still on {plan}. Which project does your live app use?`, arts.projectsTable],
			[`The live app is {proj}. {proj2} is our old test project; I must have had it selected when I upgraded.`, `That's what happened, then: the console upgrades whichever project is selected at the top of the page. The billing team can move the upgrade across to {proj} and refund the difference on {proj2}, and the new limit takes effect a few minutes after the change.`],
			[`Can we do the move ourselves?`, `You can upgrade {proj} yourself straight away and ask for {proj2} to go back to {plan}; the billing team then sorts out the money. That's the quickest way to get the live app its new limit.`],
			[`Will we be charged twice in the meantime?`, `Only for a day or two, and the billing team refunds the difference in full.`]
		],
		need: 'which project your live app uses',
		cause: `the upgrade went onto the old test project {proj2} instead of the live project {proj}`,
		act: `upgrade {proj} yourself, after which {proj2} goes back on {plan} and the difference is refunded`,
		fixed: [`I've upgraded the right project and the app went straight past the old limit this morning. Thanks.`, `Upgraded {proj}, and no 429s today. Good to know which project the console picks.`],
		stuck: ``,
		workaround: ``,
		accept: [``, ``],
		team: 'the billing team',
		handover: `Customer upgraded to {plan2}, but the 429s are on {proj}, which is still on {plan}; the upgrade shows on {proj2}. Could you look at the account and sort out which project should have it?`
	},
	{
		area: 'billing and accounts',
		weight: 1,
		viaTeamOnly: true,
		outcomes: ['team', 'team', 'resolved', 'act', 'quiet'],
		subjects: ['Discount for charities?', 'Pricing for a charity', 'Pricing for a community project'],
		open: [
			`We're a registered charity running a {appKind} for volunteers, and the {plan2} plan is more than our budget allows. Do you offer any discount for charities?`,
			`Our project is run by volunteers and funded by grants. Is there any special pricing for organisations like ours?`
		],
		quick: [`Can we pay yearly?`, `Yes. Yearly plans cost ten months for twelve.`],
		reply: `Thanks for asking, and for the work you do. There is a programme for registered charities, which the sales team runs. Could you tell me your charity's registration number and roughly how many requests a day you expect?`,
		turns: [
			[`Our registration number is {charityNo}. We expect around {expect} requests a day, more at weekends.`, `Thanks. At {expect} a day you'd fit within {plan2}. The charity programme takes 50% off any plan for registered charities. Do you also need to show the map on partners' websites, or only on your own?`],
			[`Only ours, and the volunteers' phones.`, `Then the standard charity terms cover everything. The discount applies from the next billing date once the sales team has confirmed your registration, and it's reviewed once a year.`],
			[`What do you need from us for the review?`, `Just confirmation that you're still registered; the sales team emails a month before.`],
			[`Can we start on the free plan while that's sorted?`, `Yes: the free plan gives you 1,000 requests a day with no card, and moving up keeps the same project and key.`]
		],
		need: `whether you need to show the map on partners' websites`,
		cause: `registered charities can have 50% off any plan through the charity programme, which the sales team approves`,
		act: `send the sales team your charity's registration certificate`,
		fixed: [`The discount came through this morning. That makes all the difference to us, thank you.`, `Approved and on the account. Thank you so much.`],
		stuck: ``,
		workaround: ``,
		accept: [``, ``],
		team: 'the sales team',
		handover: `Registered charity ({charityNo}) asking for the charity discount on {plan2}, about {expect} requests a day. Could you approve it and set it up?`
	},
	{
		area: 'billing and accounts',
		weight: 1,
		viaTeamOnly: true,
		outcomes: ['team', 'team', 'resolved', 'act', 'quiet'],
		subjects: ['Transferring the account to a colleague', 'Our account owner has left', 'Change of account owner'],
		open: [
			`The colleague who set up our Meridian account, {ownerName}, left the company last month, and the account is still in his name. How do we move it to me?`,
			`I need to take over our Meridian account. The current owner, {ownerName}, has left, and nobody else can see billing.`
		],
		quick: [`Can more than one person be an owner?`, `There's one owner per account, but any number of admins, who can do everything except close the account or change the owner.`],
		reply: `Of course. The safest route depends on whether the current owner can still sign in. Can {ownerFirst} still get into the account?`,
		turns: [
			[`No, his email was closed when he left.`, `Thanks. Then we'll do it with a confirmation from your company instead of his approval. Could you send me a short note from a director, from your company's domain, saying you should take over the account?`],
			[`Our managing director has emailed it from her address; you should have it now.`, `Got it, thanks. With the owner's mailbox closed, the accounts team makes the change once they've confirmed the director's note, and you'll get an email asking you to accept ownership.`],
			[`Will anything stop working during the change?`, `No. Keys, projects and plans stay exactly as they are; only the person who owns the account changes.`],
			[`Should we change anything once I'm the owner?`, `It's worth adding a second admin, so you're never in this position again, and making sure the billing email goes somewhere someone reads.`]
		],
		need: 'a note from a director saying you should take over the account',
		cause: `the account owner has left and can't sign in, so the change needs a director's confirmation`,
		act: `accept the ownership email and add a second admin`,
		fixed: [`I've accepted the ownership email and added a second admin. All sorted, thanks.`, `I'm the owner now, and there's a second admin as you suggested. Thanks for the help.`],
		stuck: ``,
		workaround: ``,
		accept: [``, ``],
		team: 'the accounts team',
		handover: `Account owner {ownerName} has left {co} and his mailbox is closed. {full} wants to take over the account. Could you take them through the change?`
	},
	{
		area: 'billing and accounts',
		weight: 1,
		place: 'offset',
		after: Date.UTC(2026, 10, 2),
		subjects: ['Invoice shows more requests than we made', `Monthly totals don't match`, 'Usage on the invoice looks too high'],
		open: [
			`October's invoice says we made {monthTheirs} requests, and our own logs say {monthOurs}. The difference is {diff} requests, and I'd like to understand it before our finance team asks.`,
			`Our monthly request totals never match the invoice. Some months we're higher, some months you are.`
		],
		quick: [`Can we get usage as CSV?`, `Yes: the usage page has an export button that gives a CSV by day or by hour.`],
		reply: `Thanks for comparing them. Before anything else: which time zone does your logging use when it decides which month a request belongs to?`,
		turns: [
			[`Our logs are in {city} time, I believe.`, `Thanks. Ours are in UTC, so our month starts at midnight UTC, which is {monthStartLocal} in {city}. Could you send me your daily totals for the first and last few days of October?`],
			[`Here are our totals for those days, next to yours.`, `That's the difference. Your October starts and ends {offsetAbs} hours away from ours, so the hours at each end fall in different months on the two sides, and they add up to the gap you're seeing. Over a year it evens out, which is why some months you're higher and some months we are.`, arts.monthEdges],
			[`Can we have the invoice in our time zone?`, `Not the invoice, I'm afraid; it's UTC for every customer. The usage export can be shifted to your time zone, though, which makes comparing much easier.`],
			[`Does the daily limit work in UTC too?`, `Yes, every daily count runs from midnight to midnight UTC.`]
		],
		need: 'your daily totals for the first and last few days of October',
		cause: `the logs count months in {city} time and the invoice in UTC, so the hours at each end of the month fall in different months`,
		act: `compare against the usage export shifted to UTC, or shift your own logs to UTC for billing`,
		fixed: [`Shifted our report to UTC and it matches the invoice to the request. Finance are happy.`, `With the export in our time zone the totals line up. Thanks for explaining.`],
		stuck: `Our finance system only takes local-time figures, and I can't change it.`,
		workaround: `Then use the usage export shifted to your time zone for finance, and treat the invoice's total as the figure that's billed; the plan's price doesn't depend on the count anyway.`,
		accept: [`True, the price is fixed. We'll reconcile against the shifted export from now on.`, `That's enough for finance. Thanks.`],
		change: [['usageEndpoint', `Could we get today's count from an API as well? We'd like to reconcile automatically every night rather than by hand once a month.`]],
		team: 'the billing team',
		handover: `Customer's October total differs from the invoice; their logs count months in {city} time. Could you send them a note on how billing counts the month?`
	}
];

// ---------------------------------------------------------------------------------------------------------
// Shared parts of a conversation.
const backstories = [
	`We're a team of {devs} developers at {co}, and the map is the heart of our {appKind}.`,
	`Some background: I'm the {titleLower} at {co}, and I look after everything that talks to your API.`,
	`We moved to Meridian from another provider in {since}, and it's been smooth until now.`,
	`I inherited this integration from a colleague who has left, so bear with me if I get the terms wrong.`,
	`Our {appKind} has about {users} active users, most of them in and around {city}.`,
	`We're a small company and I'm the only developer, so I'd be grateful for a nudge in the right direction.`,
	`We've been on the {plan} plan since {since} and this is the first time I've had to write in.`,
	`For context, we call the API from a Node service and from the {appKind} itself.`,
	`I'm writing on behalf of the {co} engineering team; we use both tiles and geocoding.`,
	`We launched our new {appKind} a few weeks ago and it's been busier than we expected, which is a nice problem to have.`
];
const firstGreetings = ['Hi,', 'Hello,', 'Hi there,', 'Hello Meridian team,', 'Hi support,', ''];
const replyGreetings = ['Hi {agent},', '{agent},', '', 'Hi again,', 'Hello {agent},', 'Hi {agent},'];
const custSignoffs = ['Thanks,\n{first}', 'Many thanks,\n{full}\n{title}, {co}', 'Cheers,\n{first}', 'Best regards,\n{full}\n{title}\n{co}', '{first}', 'Kind regards,\n{full}', 'Thanks in advance,\n{first} ({co})'];
const replySignoffs = ['Thanks,\n{first}', '{first}', 'Cheers, {first}', '', 'Thanks again,\n{first}', '— {first}'];
const agentGreetings = ['Hi {first},', 'Hello {first},', 'Hi {first}, thanks for writing in.'];
const agentGreetingsLater = ['Hi {first},', 'Hello again {first},', 'Hi {first}, thanks for getting back to me.', 'Hello {first},', 'Hi {first},'];
const agentSignoffs = ['Best,\n{agent}\nMeridian developer support', 'Thanks,\n{agent}', 'All the best,\n{agent} | Meridian Maps', 'Speak soon,\n{agent}', 'Kind regards,\n{agent}\nDeveloper support, Meridian Maps'];
const agentIntros = [`Thanks for getting in touch.`, `Thanks for the detailed report; it helps a lot.`, `Sorry for the wait, it's been a busy morning here.`, `Thanks for reaching out about this.`, `Thanks for building on Meridian, and for telling us when something gets in the way.`];
const custAcks = [`Thanks, that helps.`, `OK, understood.`, `Right.`, `Thanks for the quick reply.`, `Ah, I see.`, `Makes sense.`, `Thank you, that's clearer than the docs.`, `Great, thanks.`];
const vagueSubjects = ['Help please', 'A few questions', 'API question', 'Problem with the map', 'Following up', '(no subject)', 'Re: Your Meridian Maps account', 'Quick question', 'Urgent'];
const holdings = [`Thanks, let me look into this properly and come back to you.`, `Thanks for that. I want to check something with a colleague before I answer, so bear with me.`, `Got it, thank you. I'll look at your project's traffic and come back to you.`];
const notes = [
	`Looked up {proj}: {plan} plan, {limit} a day, customer since {since}. Nothing unusual on the account.`,
	`{co} came over from another provider this year, going by the account history. Worth looking after.`,
	`Tried the same request with our own test project: it works as expected there.`,
	`Similar question from another customer last week; the docs page on this could be clearer.`,
	`Sales asked to be kept posted on {co}: they're talking about a bigger plan.`,
	`Customer sounds pressed for time. Prioritising.`
];
const engNotes = [
	`Had a quick look at {proj} in the edge log as asked: requests arrive and are answered normally, no errors from our side in the last 24 hours.`,
	`Nothing odd for {proj} on the gateway side. Counts for the last few days match the usage page.`,
	`Looked at {proj}'s traffic for yesterday: all answered within normal times. Nothing for us here.`
];
const passLines = [
	`I've passed this to {team}, who can look at it more closely than I can. They'll reply on this ticket, so their answer will come to you by email.`,
	`I've asked {team} to take this one, as it needs someone with more access than I have. They'll pick it up from here and write to you on this ticket.`,
	`This needs {team}, so I've handed it to them with everything above. You'll hear from them on this ticket.`
];
const mateAcks = [`Hi {first}, {mate} from {team} here. I've picked this up and will be in touch once I've had a proper look.`, `Hello {first}, this is {mate} from {team}. Thanks for your patience; I'm looking at it now and will update you here.`];
const actLines = [
	`So the next step is on your side: you'll need to {act}. Once that's done it should behave, but reply here if it doesn't.`,
	`From here it's with you: you'll need to {act}. I'll keep the ticket open in case you need anything.`,
	`To sum up, you'll need to {act}. Let me know how you get on.`
];
const willDos = [`OK, I'll do that {when} and let you know.`, `Will do. It needs a colleague's sign-off, so I'll ask {when}.`, `Thanks. I'll try that {when}.`, `Understood. I'll get on to it {when} and report back.`];
const thanksLines = [`Thanks, I'll look out for it.`, `Great, thank you.`, `Appreciated, thanks.`, `Thanks, speak then.`];
const closings = [`Great to hear. I'll close this, but reply to this email if anything comes back.`, `Glad that did it!`, `Brilliant, thanks for letting me know.`, `Good news. Happy building.`];
const changeHolds = [`That's a fair request. It would be a change to the gateway in front of our APIs, so let me ask the platform team, who look after it, and come back to you.`, `Good suggestion. That's the platform team's area, since they run the gateway, so I'll put it to them and let you know what they say.`];
const nudges1 = [`Just checking in. When you have a moment, I still need {need} to get any further. I'll pick it up as soon as it arrives.`, `Following up on my last message: could you send me {need}? No rush, I just want to make sure it didn't get buried.`, `I don't want this to fall through the cracks. If you can send me {need}, I can carry on from there.`];
const nudges2 = [`I haven't heard back, so I'll assume things are fine for now. If it's still a problem, reply here with {need} and I'll take it from there.`, `One last nudge from me. Whenever you're ready, reply to this email and the ticket comes back to me with everything above.`];
const chatHellos = [`Hi {first}, I'm {agent} from Meridian developer support. Let me read your message.`, `Hello {first}, {agent} here. Thanks for waiting.`, `Hi {first}! {agent} from support. Give me a second to catch up on what you wrote.`];
const chatHandoffs = [`I'll keep this ticket open, so you can reply to the email copy of this chat with anything else.`, `If anything else comes up, reply to the email copy of this chat and it comes straight back to me.`];
const accented = ['Søndergade', 'Praça da Liberdade', 'Dún Laoghaire', 'Königsallee', 'Rue de l’Église', 'Ålborgvej', 'Avenida da Boavista, São Mamede', 'Rua Júlio Dinis', 'Place du Marché, Liège', 'Strøget'];
const countryCodes: Record<string, string> = { 'United Kingdom': 'gb', Ireland: 'ie', 'the Netherlands': 'nl', Portugal: 'pt', Belgium: 'be', Denmark: 'dk', 'New Zealand': 'nz', Australia: 'au', Singapore: 'sg', Canada: 'ca', 'the United States': 'us' };
const bigTowns: Record<string, string[]> = { gb: ['London', 'Birmingham', 'Manchester'], ie: ['Dublin', 'Cork', 'Limerick'], nl: ['Amsterdam', 'The Hague', 'Eindhoven'], pt: ['Lisbon', 'Braga', 'Coimbra'], be: ['Antwerp', 'Brussels', 'Bruges'], dk: ['Copenhagen', 'Odense', 'Aalborg'], nz: ['Christchurch', 'Hamilton', 'Dunedin'], au: ['Perth', 'Adelaide', 'Canberra'], sg: ['Jurong', 'Woodlands', 'Tampines'], ca: ['Montreal', 'Vancouver', 'Ottawa'], us: ['Chicago', 'Houston', 'Phoenix'] };
const vatRates: Record<string, number> = { gb: 20, ie: 23, nl: 21, pt: 23, be: 21, dk: 25 };

// ---------------------------------------------------------------------------------------------------------
// One ticket.
interface Item {
	who: 'c' | 'a' | 'note' | 'mate' | 'eng';
	paras: string[];
	art?: () => string;
	wait?: 'long';
}

const totalWeight = topics.reduce((sum, topic) => sum + topic.weight, 0);
const weighted = (r: Rand) => {
	let left = r() * totalWeight;
	for (const topic of topics) if ((left -= topic.weight) < 0) return topic;
	return topics.at(-1)!;
};
const placeOk = (topic: Topic, c: City) =>
	!topic.place || (topic.place === 'apac' && c.offset >= 8) || (topic.place === 'europe' && c.europe) || (topic.place === 'offset' && c.offset !== 0);
const hex = (r: Rand, length: number) => Array.from({ length }, () => '0123456789abcdef'[int(r, 0, 15)]).join('');

const ticket = (index: number) => {
	const r = mulberry32(0x6a7e2000 + index * 104729);
	const openDay = openDays[Math.floor((index * openDays.length) / ITEMS)]!;
	const knownCo = index % 29 === 13 ? known[Math.floor(index / 29) % known.length] : undefined;
	const knownCity = knownCo ? cities.find((c) => c.name === knownCo.city) : undefined;
	let main = weighted(r);
	while ((main.after && openDay < main.after) || (knownCity && !placeOk(main, knownCity))) main = weighted(r);
	const c = knownCity ?? pick(r, cities.filter((candidate) => placeOk(main, candidate)));
	let outcome = pick(r, ['resolved', 'resolved', 'resolved', 'resolved', 'workaround', 'workaround', 'change', 'change', 'team', 'team', 'quiet', 'quiet', 'act'] as Outcome[]);
	if (outcome === 'change' && !main.change) outcome = pick(r, ['resolved', 'workaround', 'team', 'quiet', 'act'] as Outcome[]);
	if (main.change && chance(r, 0.25)) outcome = 'change';
	if (main.outcomes && !main.outcomes.includes(outcome)) outcome = pick(r, main.outcomes);
	const viaTeam = (outcome === 'resolved' || outcome === 'act') && (main.viaTeamOnly ? outcome === 'resolved' || chance(r, 0.5) : chance(r, 0.25));
	const partial = outcome === 'team' || outcome === 'quiet' || viaTeam;
	const channel = pick(r, ['email', 'email', 'email', 'console chat', 'console chat', 'web form']);

	// Other matters the developer raises: a quick question, and up to two smaller matters discussed in full.
	const used = new Set<Topic>([main]);
	const sideOk = (topic: Topic) => ![...used].some((other) => other.area === topic.area) && placeOk(topic, c) && !(topic.after && openDay < topic.after) && !topic.viaTeamOnly && !topic.outcomes;
	const takeSide = (): Topic | undefined => {
		const open = topics.filter(sideOk);
		const topic = open.length ? pick(r, open) : undefined;
		if (topic) used.add(topic);
		return topic;
	};
	const quick = chance(r, 0.65) ? takeSide() : undefined;
	const fullCount = partial ? pick(r, [1, 2, 2, 3]) : pick(r, [0, 1, 1, 2, 2, 3]);
	const fulls = Array.from({ length: fullCount }, () => takeSide()).filter((topic): topic is Topic => !!topic);
	const sidesEarly = partial || chance(r, 0.4);

	// Who and where.
	const female = chance(r, 0.5);
	const first = pick(r, female ? firstF : firstM);
	const last = pick(r, surnames);
	const kindIndex = knownCo ? knownCo.kind : int(r, 0, kinds.length - 1);
	const [tail, appKind, things, page] = kinds[kindIndex]!;
	const head = pick(r, heads);
	const co = knownCo ? knownCo.co : `${head} ${tail}`;
	const proj = knownCo ? knownCo.proj : `${head}-${tail.split(' ')[0]}`.toLowerCase();
	const domain = `${proj.replace(/-/g, '')}.example`;
	const planIndex = knownCo ? knownCo.plan : pick(r, [1, 1, 1, 2, 2, 2, 3]);
	const [plan, limitN, price] = plans[planIndex]!;
	const [plan2, limit2N] = planIndex < 3 ? [plans[planIndex + 1]![0], plans[planIndex + 1]![1]] : ['Enterprise', 1000000];
	const cc = countryCodes[c.country]!;
	const agent = pick(r, agents);
	const eng = pick(r, engineers);
	const openMs = openDay + ((((int(r, 8 * 60, 18 * 60) - c.offset * 60) % 1440) + 1440) % 1440) * MIN;
	const date1Ms = openDay - int(r, 5, 20) * DAY;
	const timeMs = openDay - DAY + int(r, 10 * 60, 17 * 60 + 59) * MIN;
	const retrySec = untilMidnight(timeMs);
	const crews = int(r, 8, 24);
	const combos: [number, number][] = [];
	for (const n of [3, 4, 5, 6, 8]) for (const interval of [10, 15, 20, 30, 60]) if ((n * 86400) / interval >= limitN * 0.15 && (n * 86400) / interval <= limitN * 0.6) combos.push([n, interval]);
	const [nMon, interval] = combos.length ? pick(r, combos) : [3, 60];
	const eventLoadN = Math.round((limitN * (2 + r() * 2)) / 1000) * 1000;
	const importedN = int(r, 80, 400) * 1000;
	const dup = int(r, 55, 80);
	const dailyUse = Math.round(limitN * (0.3 + r() * 0.3));
	const monthTheirs = dailyUse * 31 + int(r, 0, 999);
	const diff = Math.round(dailyUse * (0.15 + r() * 0.3));
	const monthOurs = monthTheirs + (chance(r, 0.5) ? diff : -diff);
	const areaKm = int(r, 15, 60);
	const cos = Math.cos((c.lat * Math.PI) / 180);
	const town2 = pick(r, bigTowns[cc]!.filter((town) => town !== c.name));
	const accent = pick(r, accented);
	const vatRate = vatRates[cc] ?? 0;
	const sinceMs = Date.UTC(2026, 9 - int(r, 3, 30), 1);
	const keyMs = Math.max(sinceMs + int(r, 1, 20) * DAY, openDay - int(r, 60, 400) * DAY);
	const usedQ10 = () => [...used].some((topic) => topic.subjects[0] === '403 on older app versions');
	const s: Slots = {
		x: '{x}',
		y: '{y}',
		z: '{z}',
		r: '{r}',
		s: '{s}',
		first,
		last,
		full: `${first} ${last}`,
		email: `${first.toLowerCase()}@${domain}`,
		title: pick(r, titles),
		co,
		proj,
		proj2: `${proj}-${pick(r, ['test', 'old', 'staging', 'dev'])}`,
		pkg: proj.replace(/-/g, ''),
		site: `www.${domain}`,
		appKind,
		things,
		thing: pick(r, ['site', 'stop', 'branch', 'job', 'property', 'depot']),
		page,
		city: c.name,
		country: c.country,
		cc,
		lat: String(c.lat),
		lon: String(c.lon),
		latR: (c.lat + (r() - 0.5) * 0.02).toFixed(3),
		lonR: (c.lon + (r() - 0.5) * 0.02).toFixed(3),
		town2,
		town3: pick(r, bigTowns[cc]!.filter((town) => town !== c.name && town !== town2)),
		rural: c.rural,
		river: c.river,
		street: '',
		streetQ: '',
		farStreet: '',
		street2: `${int(r, 1, 220)} ${pick(r, streetNames)}`,
		houseLow: String(int(r, 2, 9)),
		houseHigh: String(int(r, 40, 180)),
		offset: String(c.offset),
		offsetAbs: String(Math.abs(c.offset)),
		resetLocal: `${pad((24 + c.offset) % 24)}:00`,
		monthStartLocal: c.offset > 0 ? `${pad(c.offset)}:00 on the 1st` : `${pad(24 + c.offset)}:00 the evening before`,
		cur: c.cur,
		plan,
		limit: thousands(limitN),
		limitN: String(limitN),
		plan2,
		limit2: thousands(limit2N),
		price: String(price),
		agent,
		eng,
		team: main.team,
		mate: teamPeople[main.team]!,
		lib: pick(r, libs),
		appv: `${int(r, 2, 6)}.${int(r, 0, 12)}.${int(r, 0, 5)}`,
		keyTail: hex(r, 4),
		keyTail2: hex(r, 4),
		keyTail3: hex(r, 4),
		keyCreated: dayMonth(keyMs),
		keyCreated2: dayMonth(Math.max(sinceMs, keyMs - int(r, 30, 200) * DAY)),
		keyCreated3: dayMonth(Math.max(sinceMs, keyMs - int(r, 200, 400) * DAY)),
		lastUsedServer: pick(r, ['today', 'yesterday', 'today']),
		revoked: '',
		monitor: pick(r, monitors),
		nMon: String(nMon),
		interval: String(interval),
		perHour: thousands((nMon * 3600) / interval),
		perDay: thousands((nMon * 86400) / interval),
		timeoutMs: pick(r, ['1500', '2000']),
		idleMin: String(int(r, 5, 15)),
		attempts: String(int(r, 3, 6)),
		time: clock(timeMs),
		retrySec: String(retrySec),
		retryHours: String(Math.round(retrySec / 3600)),
		retrySecShort: String(Math.round(retrySec / 1000)),
		big: thousands(int(r, 20, 90) * 1000 + int(r, 0, 999)),
		big2: thousands(limitN + int(r, 1000, 20000)),
		normal: thousands(Math.round(limitN * (0.08 + r() * 0.15))),
		ours: '',
		theirs: '',
		prefetch: String(Math.round((limitN * 0.45) / crews / 10) * 10),
		crews: String(crews),
		peakN: String(Math.round(eventLoadN / 9.6)),
		peak: '',
		estTotal: '',
		runOut: '15:00',
		revDist: '50',
		event: pick(r, events),
		eventDate: fullDay(openDay + int(r, 20, 40) * DAY),
		eventLoad: thousands(eventLoadN),
		raise: thousands(Math.round((eventLoadN * 1.2) / 10000) * 10000),
		renders: String(int(r, 4, 9)),
		tilesView: String(int(r, 20, 35)),
		component: pick(r, ['StoreMap', 'ResultsMap', 'FleetMap', 'SearchMap', 'StationMap', 'CoverageMap']),
		imported: thousands(importedN),
		days: String(Math.ceil(importedN / limitN)),
		dupPct: String(dup),
		unique: thousands(Math.round((importedN * (100 - dup)) / 100 / 100) * 100),
		importFile: pick(r, ['customers_export.csv', 'legacy_addresses.csv', 'crm_dump.csv', 'addresses_2019_2026.csv']),
		date: fullDay(openDay + int(r, 6, 18) * DAY),
		day: pick(r, ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']),
		when: pick(r, whens),
		date1: dayMonth(date1Ms),
		date1Ms: String(date1Ms),
		date2: dayMonth(openDay - int(r, 1, 4) * DAY),
		release: dayMonth([...RELEASES].reverse().find((day) => day < openDay) ?? RELEASES[0]!),
		searchWord: pick(r, ['Kingsway', 'Castle Street', 'Riverside', 'Albert Road', 'Westgate', 'Mill Lane']),
		searchLen: '',
		accentPlace: accent,
		doubleEncoded: encodeURIComponent(encodeURIComponent(accent)),
		doubleEncodedB: encodeURIComponent(encodeURIComponent(pick(r, accented.filter((place) => place !== accent)))),
		areaKm: String(areaKm),
		areaTiles: thousands(Math.round(((areaKm / (0.373 * cos * cos)) * 4) / 3 / 10) * 10),
		users: thousands(int(r, 40, 900)),
		devs: String(int(r, 2, 30)),
		since: `${MONL[utc(sinceMs).getUTCMonth()]} ${utc(sinceMs).getUTCFullYear()}`,
		charityNo: String(int(r, 1000000, 1199999)),
		expect: thousands(Math.round((limit2N * (0.3 + r() * 0.4)) / 100) * 100),
		ownerName: '',
		ownerFirst: pick(r, firstM.filter((name) => name !== first)),
		vatNo: `${cc.toUpperCase()}${int(r, 100000000, 999999999)}`,
		po: `PO-${int(r, 10000, 99999)}`,
		invoiceNo: String(int(r, 10000, 99999)),
		invoiceAddress: `${int(r, 1, 220)} ${pick(r, streetNames)}, ${c.name}`,
		vatRate: `${vatRate}%`,
		vat: (price * vatRate / 100).toFixed(2),
		total: (price * (1 + vatRate / 100)).toFixed(2),
		monthUsed: thousands(monthTheirs),
		dueDate: '1 December',
		dailyUse: String(dailyUse),
		monthTheirs: thousands(monthTheirs),
		monthOurs: thousands(monthOurs),
		diff: thousands(diff),
		pct: String(int(r, 8, 30)),
		oldName: '',
		newName: '',
		renamedWhen: pick(r, ['in August', 'in September', 'over the summer', 'in July']),
		nowMs: String(openMs)
	};
	const [street, farStreet] = [pick(r, streetNames), pick(r, streetNames)];
	s.street = street;
	s.farStreet = farStreet === street ? 'Quay Street' : farStreet;
	s.streetQ = street.replace(/ /g, '+');
	s.searchLen = String(s.searchWord!.length);
	const [tileX, tileY] = tileXY(c.lat, c.lon, 14);
	s.tileX = String(tileX);
	s.tileY = String(tileY);
	s.titleLower = s.title!.toLowerCase();
	s.ownerName = `${s.ownerFirst} ${pick(r, surnames)}`;
	const theirs = Math.round(limitN * (0.4 + r() * 0.2));
	s.theirs = thousands(theirs);
	s.ours = thousands(Math.round(theirs * (0.52 + r() * 0.06)));
	[s.oldName, s.newName] = pick(r, renames);
	if (usedQ10()) s.revoked = s.date1!;
	const fill = (text: string): string =>
		text.replace(/\{(\w+)\}/g, (_, key: string) => {
			const value = s[key];
			if (value === undefined) throw new Error(`no slot ${key} in "${text.slice(0, 60)}"`);
			return value;
		});
	s.need = fill(main.need);

	// The conversation, as a list of messages.
	const items: Item[] = [];
	let carry: string[] = [];
	const cust = (paras: string[], art?: () => string) => {
		items.push({ who: 'c', paras: [...carry, ...paras], art });
		carry = [];
	};
	const sup = (paras: string[], wait?: 'long') => items.push({ who: 'a', paras, wait });
	const artOf = (turn: Turn) => (turn[2] ? () => turn[2]!(r, s) : undefined);
	const exchange = (turn: Turn, extra?: [string, string]) => {
		cust([...(!carry.length && chance(r, 0.35) ? [pick(r, custAcks)] : []), turn[0], ...(extra ? [`Unrelated, but ${lowerFirst(extra[0])}`] : [])], artOf(turn));
		sup(extra ? [turn[1], `And on your other question: ${extra[1]}`] : [turn[1]]);
	};
	// A smaller matter, from the developer's first words about it to its last follow-up; their next message then
	// starts by saying it worked.
	const subThread = (topic: Topic) => {
		sup([topic.reply]);
		topic.turns.forEach((turn) => exchange(turn));
		carry = [pick(r, topic.fixed)];
	};
	const sides = () =>
		fulls.forEach((topic, position) => {
			const lead =
				position === 0
					? pick(r, [`I'll dig that out and come back to you. In the meantime, something else:`, `I need to ask a colleague for that, so give me a day or so. Meanwhile, a different question:`, `I'll get that to you. While I do, one more thing:`])
					: pick(r, [`Another thing while I have you.`, `Next question, if that's all right:`, `Something else has come up as well.`]);
			cust([lead, pick(r, topic.open)]);
			subThread(topic);
		});
	const opening = [...(chance(r, 0.55) ? [pick(r, backstories)] : []), pick(r, main.open)];
	let quickUsed = !quick;
	if (quick && chance(r, 0.4)) {
		quickUsed = true;
		if (chance(r, 0.5)) {
			cust([`Two things, if I may. First, a quick one: ${lowerFirst(quick.quick[0])}`, `The bigger one:`, ...opening]);
			sup([`On your quick question: ${quick.quick[1]}`, `On the bigger one: ${main.reply}`]);
		} else {
			cust([quick.quick[0]]);
			sup([quick.quick[1]]);
			cust([pick(r, [`Thanks! While I have you, the real reason I got in touch:`, `Great, thanks. The other thing, and really why I wrote:`, `Perfect. Now the thing that's actually been bothering us.`]), ...opening]);
			sup([main.reply]);
		}
	} else {
		cust(opening);
		sup([...(!main.reply.startsWith('Thanks') && chance(r, 0.5) ? [pick(r, agentIntros)] : []), main.reply]);
	}
	if (chance(r, 0.35)) items.push({ who: 'note', paras: [pick(r, notes)] });

	const [given, cause, ...rest] = main.turns;
	const quickLater = !quickUsed && chance(r, 0.7) ? quick!.quick : undefined;
	if (sidesEarly) sides();
	exchange(given!, quickLater);
	if (!partial) {
		if (!sidesEarly) sides();
		if (chance(r, 0.3)) {
			cust([cause![0]], artOf(cause!));
			sup([pick(r, holdings)]);
			if (chance(r, 0.4)) items.push({ who: 'eng', paras: [pick(r, engNotes)] });
			sup([cause![1]], 'long');
		} else exchange(cause!);
		if (rest.length >= 2 && chance(r, 0.35)) {
			cust([rest[0]![0], rest[1]![0]]);
			sup([rest[0]![1], rest[1]![1]]);
			rest.slice(2).forEach((turn) => exchange(turn));
		} else rest.forEach((turn) => exchange(turn));
	}

	const handOver = () => {
		items.push({ who: 'note', paras: [`Passing to ${main.team}: ${main.handover}`] });
		sup([pick(r, passLines)]);
	};
	const mateFinds = () =>
		items.push({ who: 'mate', paras: [`Hi {first}, {mate} from {team} here.`, `I've had a look, and ${main.cause}. To sort it, you'll need to ${main.act}.`], wait: 'long' });
	const change = main.change ? pick(r, main.change) : undefined;
	if (outcome === 'resolved') {
		if (viaTeam) {
			handOver();
			mateFinds();
		}
		cust([pick(r, main.fixed)]);
		if (chance(r, 0.6)) sup([pick(r, closings)]);
	} else if (outcome === 'workaround') {
		cust([main.stuck]);
		sup([main.workaround]);
		cust([pick(r, main.accept)]);
		if (chance(r, 0.4)) sup([pick(r, closings.slice(1))]);
	} else if (outcome === 'change') {
		cust([...(chance(r, 0.6) ? [pick(r, main.fixed)] : []), change![1]]);
		sup([pick(r, changeHolds)]);
		const spec = changes[change![0]];
		items.push({ who: 'eng', paras: [pick(r, spec.notes)] });
		sup([spec.tell], 'long');
		if (chance(r, 0.5)) cust([pick(r, thanksLines)]);
	} else if (outcome === 'act') {
		if (viaTeam) {
			handOver();
			mateFinds();
		} else sup([pick(r, actLines).replace('{act}', main.act)]);
		cust([pick(r, willDos)]);
	} else if (outcome === 'team') {
		handOver();
		if (chance(r, 0.4)) cust([pick(r, thanksLines)]);
		if (chance(r, 0.4)) items.push({ who: 'mate', paras: [pick(r, mateAcks)] });
	} else {
		items.push({ who: 'a', paras: [pick(r, nudges1)], wait: 'long' });
		if (chance(r, 0.6)) items.push({ who: 'a', paras: [pick(r, nudges2)], wait: 'long' });
	}

	// Times. Developers write at any hour; support answers on weekdays, 08:00 to 18:00 UTC. Late tickets get
	// shorter gaps, so that every conversation ends before the export.
	const schedule = (scale: number): number[] => {
		const rt = mulberry32(0x7135 + index * 7907);
		let now = openMs;
		const gap = (low: number, high: number) => Math.max(1, Math.round(int(rt, low, high) * scale));
		const workHours = () => {
			for (;;) {
				const d = utc(now);
				const hour = d.getUTCHours();
				if (d.getUTCDay() === 0 || d.getUTCDay() === 6 || hour >= 18) now = midnight(now) + DAY + 8 * HOUR + int(rt, 5, 70) * MIN;
				else if (hour < 8) now = midnight(now) + 8 * HOUR + int(rt, 5, 70) * MIN;
				else break;
			}
		};
		return items.map((item, position) => {
			if (position > 0) {
				if (item.wait === 'long') now += gap(2 * 24 * 60, 4 * 24 * 60) * MIN;
				if (item.who === 'c') {
					now += gap(12, 1300) * MIN;
					const local = (utc(now).getUTCHours() + c.offset + 24) % 24;
					if (scale < 0.2) {
						// Late tickets: no waiting for the developer's morning.
					} else if (local < 7) now += (7 - local) * HOUR + int(rt, 0, 90) * MIN;
					else if (local >= 23) now += (31 - local) * HOUR + int(rt, 0, 90) * MIN;
				}
				else if (item.who === 'note' || item.who === 'eng') {
					now += int(rt, 2, 25) * MIN;
					if (item.who === 'eng') workHours();
				} else {
					now += gap(10, 280) * MIN;
					workHours();
				}
			}
			return now;
		});
	};
	let times = schedule(1);
	for (const scale of [0.6, 0.4, 0.25, 0.15, 0.08, 0.04, 0.02]) if (times.at(-1)! >= EXPORT - 6 * HOUR) times = schedule(scale);

	// How many of the first messages happen in a chat window: whole exchanges, ending with support.
	let chatUntil = 0;
	if (channel === 'console chat') {
		chatUntil = Math.min(items.length, 2 + 2 * int(r, 1, 2));
		while (chatUntil > 0 && (items[chatUntil - 1]!.who !== 'a' || items.slice(0, chatUntil).some((item) => item.who !== 'c' && item.who !== 'a'))) chatUntil--;
	}

	// The file.
	const out: string[] = [];
	const subject = quick && quickUsed && chance(r, 0.4) ? pick(r, quick.subjects) : chance(r, 0.2) ? pick(r, vagueSubjects) : pick(r, main.subjects);
	const number = 7310 + index * 3 + int(r, 0, 2);
	out.push(`# DS-${number}: ${fill(subject)}`, '');
	const uses = [chance(r, 0.4) ? `tiles (${s.lib} on the web, ${pick(r, sdks)})` : `tiles (${s.lib})`, 'geocoding', ...(chance(r, 0.3) ? ['reverse geocoding'] : [])];
	out.push(
		table(
			['Field', 'Value'],
			[
				['Opened', `${stamp(openMs)}, by ${channel}`],
				['From', `${s.full} <${s.email}>, ${s.title}`],
				['Company', `${co}, ${c.name}, ${c.country}`],
				['Project', `\`${proj}\`, ${plan} plan, ${s.limit} requests a day`],
				['Customer since', s.since!],
				['Uses', uses.join(', ')]
			]
		),
		''
	);
	if (chance(r, 0.35)) {
		const earlier: string[][] = [];
		let at = openDay - int(r, 15, 50) * DAY;
		for (let i = int(r, 1, 3); i > 0 && at > sinceMs; i--) {
			const other = pick(r, topics.filter((topic) => !used.has(topic) && !topic.place && !topic.after));
			earlier.push([`DS-${number - Math.round(((openDay - at) / DAY) * 17) + int(r, -4, 4)}`, dayMonth(at), fill(pick(r, other.subjects))]);
			at -= int(r, 20, 90) * DAY;
		}
		if (earlier.length) out.push('### Earlier tickets from this account', '', table(['Ticket', 'Opened', 'Subject'], earlier.reverse()), '');
	}
	const usageRows: string[][] = [];
	const overDays = main.usage === 'over' ? int(r, 1, 3) : 0;
	for (let d = 7; d >= 1; d--) {
		const day = openDay - d * DAY;
		const weekend = utc(day).getUTCDay() % 6 === 0;
		const share = main.usage === 'low' ? 0.06 + r() * 0.1 : (weekend ? 0.15 : 0.3) + r() * 0.3;
		const over = d <= overDays;
		const requests = over ? limitN : Math.round(limitN * share);
		usageRows.push([`${WD[utc(day).getUTCDay()]} ${dayMonth(day)}`, thousands(requests), thousands(Math.round(requests * (0.04 + r() * 0.2))), over ? thousands(Math.round(limitN * (0.02 + r() * 0.3))) : '0']);
	}
	out.push('### Usage, last 7 days (console)', '', table(['Day (UTC)', 'Requests', 'Of which geocoding', 'Answered 429'], usageRows), '');
	out.push('## Conversation', '');
	if (chatUntil > 0) {
		out.push(`### Console chat with ${agent} · ${stamp(times[0]!)}`, '');
		const lines: string[] = [];
		items.slice(0, chatUntil).forEach((item, position) => {
			s.nowMs = String(times[position]!);
			const who = item.who === 'c' ? first : agent;
			const at = clock(times[0]! + (position * 3 + int(r, 0, 2)) * MIN);
			if (position === 1) lines.push(`**${at} ${agent}:** ${fill(pick(r, chatHellos))}`);
			item.paras.forEach((para) => lines.push(`**${at} ${who}:** ${fill(para)}`));
			if (item.art) lines.push(item.art());
		});
		if (chatUntil < items.length) lines.push(`**${clock(times[0]! + (chatUntil * 3 + 2) * MIN)} ${agent}:** ${fill(pick(r, chatHandoffs))}`);
		out.push(lines.join('\n\n'), '');
		const shift = times[0]! + (chatUntil * 3 + 10) * MIN;
		for (let position = chatUntil; position < times.length; position++) if (times[position]! < shift) times[position] = shift + position * MIN;
	}
	let previousAgent = '';
	let agentSpoke = chatUntil > 0;
	items.slice(chatUntil).forEach((item, offset) => {
		const position = chatUntil + offset;
		const at = times[position]!;
		s.nowMs = String(at);
		const body: string[] = [];
		if (item.who === 'c') {
			out.push(`### ${s.full} · ${stamp(at)}`, '');
			const greeting = fill(pick(r, position === 0 ? (utc(at).getUTCHours() < 12 ? [...firstGreetings, 'Good morning,'] : firstGreetings) : replyGreetings));
			if (greeting) body.push(greeting);
			const quoted = previousAgent.split(/(?<=[.?!])\s/).find((sentence) => sentence.length > 40);
			if (quoted && chance(r, 0.25)) body.push(`> ${quoted}`);
			body.push(...item.paras.map(fill));
			if (item.art) body.push(item.art());
			const signoff = fill(pick(r, position === 0 ? custSignoffs : replySignoffs));
			if (signoff) body.push(signoff);
		} else if (item.who === 'a') {
			out.push(`### ${agent} (Meridian developer support) · ${stamp(at)}`, '');
			const afterCustomer = items[position - 1]?.who === 'c';
			const thanked = /thank/i.test(item.paras[0]!.split(/(?<=[.?!])\s/)[0]!);
			const greetings = (!agentSpoke ? agentGreetings : afterCustomer ? agentGreetingsLater : ['Hi {first},', 'Hello {first},']).filter((line) => !thanked || !/thank/.test(line));
			body.push(fill(pick(r, greetings)), ...item.paras.map(fill), fill(pick(r, agentSignoffs)));
			previousAgent = fill([...item.paras].sort((x, y) => y.length - x.length)[0]!);
			agentSpoke = true;
		} else if (item.who === 'note') {
			out.push(`### Internal note by ${agent} · ${stamp(at)}`, '');
			body.push(...item.paras.map(fill));
		} else if (item.who === 'eng') {
			out.push(`### Internal note by ${eng} (platform team) · ${stamp(at)}`, '');
			body.push(...item.paras.map(fill));
		} else {
			out.push(`### ${s.mate} (Meridian, ${main.team.replace(/^the /, '')}) · ${stamp(at)}`, '');
			body.push(...item.paras.map(fill), s.mate!);
		}
		out.push(body.join('\n\n'), '');
	});
	const final = times.at(-1)!;
	if (final >= EXPORT) throw new Error(`ticket ${number} runs past the export: ${stamp(final)}`);
	return { name: `DS-${number}.md`, text: out.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n' };
};

const folder = join(root, 'docs', 'developer-tickets');
mkdirSync(folder, { recursive: true });
for (let index = 0; index < ITEMS; index++) {
	const { name, text } = ticket(index);
	writeFileSync(join(folder, name), text);
}
writeFileSync(
	join(folder, 'README.md'),
	`# Developer support tickets\n\nThe ${ITEMS} tickets that Meridian Maps developer support handled between 5 October and 13 November 2026, one\nfile each, as the help desk exported them on 20 November. Each file holds the account panel the agent saw when the\nticket came in and the whole conversation, console chats included, with internal notes. The export does not keep\nthe help desk's tags or statuses.\n`
);
