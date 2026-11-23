// Writes the long material of this entry's long tasks: every ticket that reached the Brambleway platform desk
// between 14 September and 13 November 2026, from partner stores that run Shopcore and from Brambleway's own
// customer care, one Markdown file each, under support/platform-desk/.
// Deterministic: fixed seeds, no clock, no network.
//   bun long/generate.ts <workspace root>
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** How many tickets to write. Everything else is derived from it. */
const ITEMS = 290;

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
const shuffle = <T>(r: Rand, items: readonly T[]): T[] => {
	const out = [...items];
	for (let i = out.length - 1; i > 0; i--) {
		const j = Math.floor(r() * (i + 1));
		[out[i], out[j]] = [out[j]!, out[i]!];
	}
	return out;
};
type Slots = Record<string, string>;
type Art = (r: Rand, s: Slots) => string;
const fill = (text: string, s: Slots): string =>
	text.replace(/\{(\w+)\}/g, (_, key: string) => {
		const value = s[key];
		if (value === undefined) throw new Error(`no slot {${key}} in: ${text.slice(0, 90)}`);
		return value;
	});

// ---------------------------------------------------------------------------------------------------------
// Dates. Tickets open on working days from Monday 14 September to Friday 13 November 2026; the export ran on
// Saturday 21 November, so nothing is later than the Friday before.
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
const dayMonth = (ms: number) => `${utc(ms).getUTCDate()} ${MONL[utc(ms).getUTCMonth()]}`;
const iso = (ms: number) => utc(ms).toISOString().replace(/\.\d{3}Z$/, 'Z');
const logTime = (ms: number) => utc(ms).toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' +0000');
const midnight = (ms: number) => ms - (ms % DAY);
const FIRST_DAY = Date.UTC(2026, 8, 14);
const LAST_DAY = Date.UTC(2026, 10, 13);
const LIMIT = Date.UTC(2026, 10, 20, 17, 30);
const openDays: number[] = [];
for (let day = FIRST_DAY; day <= LAST_DAY; day += DAY) if (utc(day).getUTCDay() % 6 !== 0) openDays.push(day);
const isWorkday = (ms: number) => utc(ms).getUTCDay() % 6 !== 0;
/** The same moment, or the next working morning when it falls outside 08:30 to 17:45 on a weekday. */
const office = (r: Rand, ms: number) => {
	const hour = (ms % DAY) / HOUR;
	if (isWorkday(ms) && hour >= 8.5 && hour <= 17.75) return ms;
	let day = midnight(ms) + (hour > 17.75 ? DAY : 0);
	while (!isWorkday(day)) day += DAY;
	return day + 8.5 * HOUR + int(r, 0, 70) * MIN;
};

// ---------------------------------------------------------------------------------------------------------
// People.
const firstF = ['Ruth', 'Imani', 'Sofia', 'Helen', 'Priya', 'Agnes', 'Mei', 'Clara', 'Tanvi', 'Joanna', 'Esther', 'Leonie', 'Grainne', 'Adaeze', 'Marta', 'Wendy', 'Fiona', 'Noor', 'Beatriz', 'Kirsty', 'Yolanda', 'Hana', 'Rebecca', 'Dorota', 'Aoife', 'Lucy', 'Bronwen', 'Elif'];
const firstM = ['Daniel', 'Tariq', 'Mateo', 'Graham', 'Ifeanyi', 'Lukas', 'Sanjay', 'Ross', 'Viktor', 'Aled', 'Jonah', 'Rafael', 'Neil', 'Kwabena', 'Pavel', 'Gareth', 'Omar', 'Benedict', 'Hiro', 'Stuart', 'Emeka', 'Callan', 'Duncan', 'Anton', 'Cormac', 'Dylan', 'Bilal', 'Teodor'];
const surnames = ['Okafor', 'Lindgren', 'Ashworth', 'Mbeki', 'Fairclough', 'Rasmussen', 'Doyle', 'Varga', 'Kapoor', 'Hollis', 'Ferreira', 'Quinlan', 'Ahmadi', 'Sutherland', 'Novak', 'Pemberton', 'Adeyemi', 'Carrick', 'Matsuda', 'Bellamy', 'Oduya', 'Szabo', 'Rourke', 'Gallagher', 'Wainwright', 'Nwosu', 'Eklund', 'Prescott', 'Moran', 'Iqbal', 'Thorne', 'Delaney'];
const desk = ['Joel Marsh', 'Anika Patel', 'Femi Adebayo', 'Ines Duarte', 'Rowan Kerr', 'Saskia Brandt'];
const careAgents = [['Keeley', 'Lawson'], ['Dev', 'Sharma'], ['Sunita', 'Rao'], ['Callum', 'Reid'], ['Mairead', 'Coyle'], ['Bethan', 'Price']] as const;
type TeamKey = 'fulfilment' | 'storefront' | 'payments' | 'partners' | 'agency';
const teams: Record<Exclude<TeamKey, 'agency'>, [string, string]> = {
	fulfilment: ['Gethin Morgan', 'the fulfilment team'],
	storefront: ['Priscilla Adjei', 'the storefront team'],
	payments: ['Lotte Visscher', 'the payments team'],
	partners: ['Hannah Coates', 'partner success']
};

// ---------------------------------------------------------------------------------------------------------
// Stores. Brambleway's own three storefronts, then the partner stores that run Shopcore.
type Cc = 'GB' | 'IE' | 'US' | 'NL' | 'FR' | 'DE' | 'NO';
interface Store {
	name: string;
	domain: string;
	town: string;
	cc: Cc;
	cur: 'GBP' | 'EUR' | 'USD';
	prefix: string;
	version: string;
	rails: string;
	ruby: string;
	goods: string[];
	people: [string, string][];
	agency?: string;
	own?: boolean;
	b2b?: boolean;
	since: string;
}
const OWN: Store[] = [
	{ name: 'Brambleway UK', domain: 'brambleway.example', town: 'Sheffield', cc: 'GB', cur: 'GBP', prefix: 'BW', version: '3.4.0', rails: '7.2.1', ruby: '3.3.5', goods: ['oak bench', 'linen duvet set', 'enamel planter', 'garden hose reel', 'stoneware dinner set'], people: [['Marcus Webb', 'Developer, storefront team'], ['Leah Odum', 'Developer, storefront team']], own: true, since: '2023' },
	{ name: 'Brambleway Ireland', domain: 'brambleway.example/ie', town: 'Dublin', cc: 'IE', cur: 'EUR', prefix: 'BWI', version: '3.4.0', rails: '7.2.1', ruby: '3.3.5', goods: ['wool throw', 'copper kettle', 'raised bed kit', 'rattan lamp'], people: [['Leah Odum', 'Developer, storefront team'], ['Marcus Webb', 'Developer, storefront team']], own: true, since: '2024' },
	{ name: 'Brambleway US', domain: 'brambleway.example/us', town: 'Boston', cc: 'US', cur: 'USD', prefix: 'BWU', version: '3.4.0', rails: '7.2.1', ruby: '3.3.5', goods: ['teak side table', 'cast iron skillet', 'cedar planter', 'quilted bedspread'], people: [['Marcus Webb', 'Developer, storefront team'], ['Leah Odum', 'Developer, storefront team']], own: true, since: '2025' }
];
const PARTNERS: Store[] = [
	{ name: 'Hollin & Reed', domain: 'hollinandreed.example', town: 'Leeds', cc: 'GB', cur: 'GBP', prefix: 'HR', version: '3.4.0', rails: '7.1.5', ruby: '3.2.4', goods: ['waffle bath towel', 'ceramic table lamp', 'jute rug', 'glass carafe'], people: [['Tom Ashby', 'Lead developer'], ['Kirsty Hale', 'Operations manager']], since: '2024' },
	{ name: 'Tidewater Outfitters', domain: 'tidewater.example', town: 'Cork', cc: 'IE', cur: 'EUR', prefix: 'TW', version: '3.4.0', rails: '7.1.3', ruby: '3.2.2', goods: ['waxed jacket', 'merino base layer', 'wading boots', 'dry bag'], people: [['Siobhan Murray', 'Ecommerce manager'], ['Eoin Walsh', 'Operations lead']], agency: 'Fieldnote Digital', since: '2023' },
	{ name: 'Larkspur Books', domain: 'larkspurbooks.example', town: 'Bristol', cc: 'GB', cur: 'GBP', prefix: 'LB', version: '3.4.0', rails: '7.1.5', ruby: '3.3.1', goods: ['signed first edition', 'book bundle', 'tote bag', 'gift voucher card'], people: [['Martha Penrose', 'Owner'], ['Josh Kemble', 'Shop manager']], agency: 'Kiln Studio', since: '2024' },
	{ name: 'Copperleaf Tea', domain: 'copperleaf.example', town: 'Edinburgh', cc: 'GB', cur: 'GBP', prefix: 'CT', version: '3.4.0', rails: '7.2.0', ruby: '3.3.4', goods: ['loose leaf sampler', 'cast iron teapot', 'matcha whisk set', 'tea caddy'], people: [['Ailsa Grant', 'Developer'], ['Fraser Lyle', 'Founder']], since: '2025' },
	{ name: 'Maison Ardoise', domain: 'maisonardoise.example', town: 'Lyon', cc: 'FR', cur: 'EUR', prefix: 'MA', version: '3.4.0', rails: '7.1.4', ruby: '3.2.3', goods: ['copper saucepan', 'slate cheese board', 'carbon steel pan', 'linen apron'], people: [['Camille Roux', 'Lead developer'], ['Hugo Bernard', 'Head of operations']], since: '2024' },
	{ name: 'Fernhill Garden Supply', domain: 'fernhillgarden.example', town: 'Portland', cc: 'US', cur: 'USD', prefix: 'FG', version: '3.4.0', rails: '7.2.1', ruby: '3.3.5', goods: ['cedar raised bed', 'drip irrigation kit', 'seed starting tray', 'pruning saw'], people: [['Wes Calloway', 'Developer'], ['Dana Ruiz', 'Fulfillment lead']], since: '2025' },
	{ name: 'Quayside Cycles', domain: 'quaysidecycles.example', town: 'Rotterdam', cc: 'NL', cur: 'EUR', prefix: 'QC', version: '3.4.0', rails: '7.1.3', ruby: '3.2.2', goods: ['cargo bike', 'pannier set', 'dynamo light', 'frame lock'], people: [['Sanne de Vries', 'Shop owner'], ['Joris Bakker', 'Workshop and shipping']], agency: 'Overcast Labs', since: '2023' },
	{ name: 'Saltmarsh Pottery', domain: 'saltmarshpottery.example', town: 'Norwich', cc: 'GB', cur: 'GBP', prefix: 'SP', version: '3.3.1', rails: '7.1.3', ruby: '3.2.2', goods: ['hand-thrown jug', 'speckled bowl set', 'bud vase', 'pottery class voucher'], people: [['Imogen Bright', 'Owner'], ['Ollie Fenn', 'Studio assistant']], agency: 'Kiln Studio', since: '2024' },
	{ name: 'Northwind Coffee Roasters', domain: 'northwindcoffee.example', town: 'Minneapolis', cc: 'US', cur: 'USD', prefix: 'NW', version: '3.4.0', rails: '7.1.5', ruby: '3.3.0', goods: ['single origin beans', 'burr grinder', 'subscription box', 'pour-over kettle'], people: [['Grant Lindqvist', 'Engineering lead'], ['Maya Okonkwo', 'Customer experience']], since: '2024' },
	{ name: 'Kittiwake Kids', domain: 'kittiwakekids.example', town: 'Galway', cc: 'IE', cur: 'EUR', prefix: 'KK', version: '3.4.0', rails: '7.1.4', ruby: '3.2.4', goods: ['knitted cardigan', 'wooden stacking toy', 'rain suit', 'sleep sack'], people: [['Roisin Keane', 'Co-founder'], ['Declan Flood', 'Operations']], agency: 'Fieldnote Digital', since: '2025' },
	{ name: 'Granite & Grain', domain: 'graniteandgrain.example', town: 'Aberdeen', cc: 'GB', cur: 'GBP', prefix: 'GG', version: '3.4.0', rails: '7.2.0', ruby: '3.3.4', goods: ['25 kg flour sack', 'proving baskets (case of 20)', 'deck oven stone', 'bakery labels (5000 roll)'], people: [['Callum Ritchie', 'Developer'], ['Morag Duthie', 'Trade accounts manager']], b2b: true, since: '2024' },
	{ name: 'Harbourlight', domain: 'harbourlight.example', town: 'Hamburg', cc: 'DE', cur: 'EUR', prefix: 'HL', version: '3.4.0', rails: '7.1.5', ruby: '3.3.1', goods: ['LED panel (pack of 10)', 'track lighting kit', 'emergency exit sign', 'warehouse high bay'], people: [['Jonas Albrecht', 'Software developer'], ['Frieda Krause', 'Key accounts']], b2b: true, since: '2023' },
	{ name: 'Oakhaven Furniture', domain: 'oakhaven.example', town: 'Burlington', cc: 'US', cur: 'USD', prefix: 'OH', version: '3.4.0', rails: '7.2.1', ruby: '3.3.5', goods: ['walnut dining table', 'maple bookcase', 'cherry rocking chair', 'oak bed frame'], people: [['Eli Brandt', 'Developer'], ['Corinne Masse', 'Operations director']], since: '2025' },
	{ name: 'Fjell & Fen', domain: 'fjellogfen.example', town: 'Bergen', cc: 'NO', cur: 'EUR', prefix: 'FF', version: '3.4.0', rails: '7.1.4', ruby: '3.2.3', goods: ['down sleeping bag', 'trekking poles', 'wool hat', 'stove set'], people: [['Ingrid Solberg', 'Developer'], ['Magnus Holm', 'Store manager']], since: '2025' },
	{ name: 'Brightwater Aquatics', domain: 'brightwater.example', town: 'Cardiff', cc: 'GB', cur: 'GBP', prefix: 'BA', version: '3.3.1', rails: '7.1.3', ruby: '3.2.2', goods: ['planted aquarium kit', 'canister filter', 'LED aquarium light', 'water test kit'], people: [['Rhys Pugh', 'Developer'], ['Nia Beddoe', 'Shop manager']], since: '2024' }
];

// ---------------------------------------------------------------------------------------------------------
// Addresses, by country: [town, postcode], streets and second lines in the local order.
const towns: Record<Cc, [string, string][]> = {
	GB: [['Leeds', 'LS6 2QT'], ['York', 'YO10 4BP'], ['Bristol', 'BS3 1RL'], ['Norwich', 'NR2 3HG'], ['Edinburgh', 'EH7 5JA'], ['Cardiff', 'CF24 4QR'], ['Sheffield', 'S11 8YB'], ['Brighton', 'BN2 9QE'], ['Glasgow', 'G12 8DS'], ['Manchester', 'M14 5RT']],
	IE: [['Cork', 'T12 X8F4'], ['Galway', 'H91 E2K7'], ['Dublin 8', 'D08 VF8H'], ['Limerick', 'V94 T2YC'], ['Kilkenny', 'R95 P2X3']],
	US: [['Portland, OR', '97214'], ['Minneapolis, MN', '55408'], ['Austin, TX', '78704'], ['Denver, CO', '80205'], ['Madison, WI', '53703'], ['Burlington, VT', '05401']],
	NL: [['Rotterdam', '3011 AB'], ['Utrecht', '3512 JC'], ['Amsterdam', '1013 KP'], ['Groningen', '9711 LM']],
	FR: [['Lyon', '69002'], ['Paris', '75011'], ['Nantes', '44000'], ['Bordeaux', '33000']],
	DE: [['Hamburg', '20095'], ['Köln', '50667'], ['München', '80331'], ['Leipzig', '04109']],
	NO: [['Bergen', '5003'], ['Oslo', '0556'], ['Trondheim', '7011']]
};
const streets: Record<Cc, (r: Rand) => string> = {
	GB: (r) => `${int(r, 2, 140)} ${pick(r, ['Station Road', 'Mill Lane', 'Victoria Street', 'Chapel Walk', 'Harbour Row', 'Albert Terrace', 'Queens Drive', 'Bridge Street', 'Kelvin Way', 'Marlborough Crescent'])}`,
	IE: (r) => `${int(r, 1, 90)} ${pick(r, ['Main Street', 'Strand Road', 'Patrick Street', 'Church Lane', 'Dominick Street'])}`,
	US: (r) => `${int(r, 100, 4800)} ${pick(r, ['SE Belmont St', 'Lyndale Ave S', 'Oak Hill Dr', 'N Williams Ave', 'Elm Street', 'Pine St'])}`,
	NL: (r) => `${pick(r, ['Witte de Withstraat', 'Oudegracht', 'Lindengracht', 'Nieuwe Binnenweg'])} ${int(r, 2, 180)}`,
	FR: (r) => `${int(r, 1, 60)} ${pick(r, ['rue des Remparts', "rue de l'Abbaye", 'avenue Jean Jaurès', 'quai Saint-Vincent'])}`,
	DE: (r) => `${pick(r, ['Lange Reihe', 'Schanzenstraße', 'Gneisenaustraße', 'Hohe Straße'])} ${int(r, 1, 120)}`,
	NO: (r) => `${pick(r, ['Kong Oscars gate', 'Thormøhlens gate', 'Markveien', 'Bakklandet'])} ${int(r, 1, 80)}`
};
const seconds: Record<Cc, (r: Rand) => string> = {
	GB: (r) => pick(r, [`Flat ${int(r, 1, 24)}`, `Flat ${int(r, 1, 6)}${pick(r, ['A', 'B', 'C'])}`, `Apartment ${int(r, 10, 64)}`, `Unit ${int(r, 2, 18)}`, `Flat ${int(r, 0, 3)}/${pick(r, ['L', 'R'])}`]),
	IE: (r) => pick(r, [`Apartment ${int(r, 1, 40)}`, `Flat ${int(r, 1, 9)}`, `Unit ${int(r, 2, 12)}`]),
	US: (r) => pick(r, [`Apt ${int(r, 1, 6)}${pick(r, ['A', 'B', 'C', 'D'])}`, `Suite ${int(r, 100, 450)}`, `Unit ${int(r, 2, 30)}`]),
	NL: (r) => pick(r, [`${int(r, 1, 4)}e verdieping`, `huis ${pick(r, ['A', 'B'])}`, `Unit ${int(r, 2, 9)}`]),
	FR: (r) => pick(r, [`Bâtiment ${pick(r, ['A', 'B', 'C'])}, ${int(r, 1, 5)}e étage`, `Appartement ${int(r, 2, 40)}`]),
	DE: (r) => pick(r, [`${int(r, 1, 5)}. OG`, `Hinterhaus, ${int(r, 1, 4)}. OG`, `Wohnung ${int(r, 2, 30)}`]),
	NO: (r) => pick(r, [`Leilighet H0${int(r, 1, 4)}0${int(r, 1, 4)}`, `${int(r, 1, 4)}. etasje`])
};
const carriers: Record<Cc, string[]> = {
	GB: ['Royal Mail', 'DPD', 'Evri', 'Parcelforce'],
	IE: ['An Post', 'DPD Ireland', 'Fastway'],
	US: ['USPS', 'UPS', 'FedEx'],
	NL: ['PostNL', 'DHL'],
	FR: ['Colissimo', 'Chronopost'],
	DE: ['DHL', 'Hermes'],
	NO: ['Posten', 'Bring']
};
const SYM: Record<string, string> = { USD: '$', EUR: '€', GBP: '£' };
/** An amount as Shopcore 3.4.0's Money.format prints it: no thousands separator, floor division for negatives. */
const shop = (cents: number, cur: string) => {
	const units = Math.floor(cents / 100);
	return `${SYM[cur]}${units}.${pad(cents - units * 100)}`;
};
/** An amount the way a person writes it. */
const plain = (cents: number, cur: string) => {
	const abs = Math.abs(cents);
	const units = String(Math.floor(abs / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
	return `${cents < 0 ? '-' : ''}${SYM[cur]}${units}.${pad(abs % 100)}`;
};

// ---------------------------------------------------------------------------------------------------------
// Pasted output.
const table = (head: string[], rows: string[][]) =>
	[`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`, ...rows.map((row) => `| ${row.join(' | ')} |`)].join('\n');
const fence = (lines: string[], lang = '') => ['```' + lang, ...lines, '```'].join('\n');
const ip = (r: Rand) => `${int(r, 31, 212)}.${int(r, 1, 254)}.${int(r, 1, 254)}.${int(r, 1, 254)}`;
const ms = (r: Rand, low: number, high: number) => `${int(r, low, high)}ms`;
const gems = (s: Slots) => `shopcore (${s.version})`;
const FRAMES = [
	'actionpack|action_controller/metal/basic_implicit_render.rb:6|send_action',
	'actionpack|abstract_controller/base.rb:226|process_action',
	'actionpack|action_controller/metal/rendering.rb:193|process_action',
	'activesupport|active_support/callbacks.rb:121|block in run_callbacks',
	'actionpack|abstract_controller/callbacks.rb:258|process_action',
	'actionpack|action_controller/metal/rescue.rb:27|process_action',
	'actionpack|action_controller/metal/instrumentation.rb:76|block in process_action',
	'activesupport|active_support/notifications.rb:210|block in instrument',
	'activerecord|active_record/railties/controller_runtime.rb:39|process_action',
	'actionpack|abstract_controller/base.rb:163|process',
	'actionpack|action_dispatch/routing/route_set.rb:52|dispatch',
	'actionpack|action_dispatch/journey/router.rb:53|block in serve',
	'actionpack|action_dispatch/middleware/show_exceptions.rb:32|call',
	'railties|rails/rack/logger.rb:41|call_app',
	'rack|rack/runtime.rb:24|call',
	'puma|puma/request.rb:100|handle_request'
];
const framework = (r: Rand, s: Slots, n: number) =>
	FRAMES.slice(0, n + int(r, 3, 7)).map((frame) => {
		const [gem, file, method] = frame.split('|');
		return `${gem} (${gem === 'rack' ? '3.1.8' : gem === 'puma' ? '6.4.3' : s.rails}) lib/${file}:in '${method}'`;
	});
/** Unrelated requests around the one that matters, as a real log has them. */
const traffic = (r: Rand, s: Slots, n: number) => {
	let back = Number(s.logMs);
	const times = Array.from({ length: n }, () => (back -= int(r, 2, 40) * 1000)).reverse();
	return times.map((when) => {
		const at = logTime(when);
		const path = pick(r, ['/', `/products/${s.slug}`, '/basket', '/shopcore/addresses', '/account/orders', '/search?q=' + pick(r, ['gift', 'sale', 'blue', 'set']), `/collections/${pick(r, ['new', 'autumn', 'bestsellers'])}`]);
		return `Started GET "${path}" for ${ip(r)} at ${at}\nCompleted 200 OK in ${ms(r, 18, 240)} (Views: ${int(r, 5, 120)}.${int(r, 1, 9)}ms | ActiveRecord: ${int(r, 1, 40)}.${int(r, 1, 9)}ms | Allocations: ${int(r, 2000, 60000)})`;
	}).join('\n').split('\n');
};
/** The orders a reporter lists as affected. */
const affected = (r: Rand, s: Slots, what: string) =>
	table(['Order', 'Placed', 'Customer', 'Total', what], Array.from({ length: int(r, 4, 10) }, () => [
		`${s.prefix}-${Number(s.orderNo) - int(r, 10, 4000)}`,
		dayMonth(Number(s.openMs) - int(r, 2, 20) * DAY),
		`${pick(r, firstF.concat(firstM))} ${pick(r, surnames).charAt(0)}.`,
		shop(int(r, Number(s.affectedLow ?? 1200), Number(s.affectedHigh ?? 38000)), s.cur),
		pick(r, s.affectedWhat!.split('|'))
	]));
/** The desk tool's summary of a store. */
const glance = (r: Rand, s: Slots) =>
	table(['Store at a glance', ''], [
		['Orders, last 30 days', String(int(r, 300, 9000))],
		['Desk tickets this year', String(int(r, 2, 30))],
		['Support plan', pick(r, ['Standard', 'Standard', 'Priority'])],
		[s.own ? 'Looked after by' : 'Partner manager', s.own ? 'Brambleway storefront team' : 'Hannah (partner success)'],
		['Last deploy seen', dayMonth(Number(s.openMs) - int(r, 1, 12) * DAY)]
	]);
const label = (r: Rand, s: Slots, lines: string[], width = 38) => {
	const service = pick(r, ['Tracked 48', 'Tracked 24', 'Standard', 'Next Day', 'Ground', 'Signed For']);
	return fence([
		`${s.carrier} ${service} · ${s.order} · printed ${s.printed}`,
		`+${'-'.repeat(width + 2)}+`,
		...lines.map((line) => `| ${line.slice(0, width).padEnd(width)} |`),
		`+${'-'.repeat(width + 2)}+`,
		`Weight ${int(r, 2, 190) / 10} kg   Parcel 1 of ${pick(r, ['1', '1', '1', '2'])}   Ref ${s.order}`
	]);
};
const lines4 = (s: Slots, country: string) => [s.sfull, s.line1, `${s.postcode} ${s.city}`, country];
const console_ = (lines: string[]) => {
	let n = 0;
	return fence(lines.map((line) => (line.startsWith('=>') ? line : `irb(main):${String(++n).padStart(3, '0')}> ${line}`)));
};
const addressHash = (s: Slots, extra: Slots = {}) => {
	const fields: Slots = { name: s.sfull, line1: s.line1, line2: s.line2, city: s.city, postcode: s.postcode, country: s.cc, ...extra };
	return `=> {${Object.entries(fields).map(([k, v]) => `"${k}"=>${v === 'nil' ? 'nil' : `"${v}"`}`).join(', ')}}`;
};

const arts: Record<string, Art> = {
	careOrder: (r, s) => {
		const lines = Array.from({ length: int(r, 1, 4) }, (_, i) => [i === 0 ? s.product! : pick(r, s.goods!.split('|')), int(r, 1, 2), int(r, 900, 24000)] as const);
		const total = lines.reduce((sum, [, qty, cents]) => sum + qty * cents, 0) + pick(r, [0, 0, 495, 695]);
		return [
			table(['Item', 'Qty', 'Price'], lines.map(([name, qty, cents]) => [name, String(qty), shop(cents, s.cur)])),
			table(['Order', s.order!], [
				['Placed', s.placedStamp!],
				['Status', s.status!],
				['Total', shop(total, s.cur)],
				['Paid with', pick(r, ['Visa ending ', 'Mastercard ending ', 'Amex ending ']) + int(r, 1000, 9999)],
				['Deliver to', s.oneLine!],
				['Delivery', `${s.carrier}, ${pick(r, ['tracked', 'standard', 'next day', 'signed for'])}`]
			])
		].join('\n\n');
	},
	labelNoFlat: (r, s) => label(r, s, lines4(s, s.cc)),
	addressConsole: (r, s) =>
		console_([
			`a = Shopcore::UserAddress.find(${int(r, 10000, 99999)})`,
			`a.slice(:name, :line1, :line2, :city, :postcode, :country)`,
			addressHash(s),
			`a.label_lines`,
			`=> ${JSON.stringify(lines4(s, s.cc))}`
		]),
	carrierReject: (r, s) =>
		[
			fence(
				JSON.stringify(
					{
						status: 422,
						request_id: `req_${int(r, 100000, 999999)}${pick(r, ['a', 'f', 'k', 'q'])}${int(r, 10, 99)}`,
						shipment_reference: s.order,
						errors: [{ field: 'recipient.address.country_code', code: 'INVALID_COUNTRY_CODE', message: `Country code must be two upper-case letters (ISO 3166-1 alpha-2); received "${s.lc}"` }]
					},
					null,
					2
				).split('\n'),
				'json'
			),
			`Address as Shopcore has it: ${s.sfull}, ${s.line1}, ${s.postcode} ${s.city}, country "${s.lc}".`,
			`Failed bookings since ${s.since}: ${int(r, 9, 70)} of ${int(r, 300, 1400)}.`
		].join('\n\n'),
	labelUS: (r, s) =>
		[
			label(r, s, lines4(s, 'US')),
			console_([`addr.slice(:city, :postcode, :country)`, `=> {"city"=>"${s.city}", "postcode"=>"${s.postcode}", "country"=>"US"}`])
		].join('\n\n'),
	labelLong: (r, s) =>
		[
			label(r, s, [s.sfull, s.longLine, `${s.postcode} ${s.city}`, s.cc], 30),
			`What the address book has for line 1: "${s.longLine}" (${s.longLine.length} characters). The address box on our template is ${int(r, 28, 32)} characters wide at the font size we use.`
		].join('\n\n'),
	encoding: (r, s) =>
		[
			console_([`a = Shopcore::UserAddress.find(${int(r, 10000, 99999)})`, `a.label_lines`, `=> ${JSON.stringify([s.accented, s.line1, `${s.postcode} ${s.city}`, s.cc])}`, `a.label_lines.first.encoding`, `=> #<Encoding:UTF-8>`]),
			`And what came out of the printer:`,
			label(r, s, [s.accented.replace(/[^\x00-\x7f]/g, '?'), s.line1, `${s.postcode} ${s.city}`, s.cc])
		].join('\n\n'),
	labelCompany: (r, s) => {
		const rows = Array.from({ length: int(r, 4, 8) }, (_, i) => [
			`${s.prefix}-${Number(s.orderNo) - i * int(r, 3, 40)}`,
			pick(r, ['Crumb & Co', 'The Loaf Lab', 'Hearth Bakery', 'Northfield Hotel', 'Skene Street Café', 'Kasse Nord', 'Hafenbüro West', 'Lagerhalle 7']),
			i === 0 ? s.sfull! : pick(r, ['Receiving dept', s.sfull!, `${s.sfull} (accounts)`, 'Goods in']),
			pick(r, ['', `c/o ${pick(r, ['Riverside Business Park', 'Unit 4, Dyce Estate', 'Speicherstadt Block O'])}`, '']),
			i === 0 ? 'Refused at reception' : pick(r, ['Refused at reception', 'Left with security', 'Returned to depot', 'Delivered'])
		]);
		return [table(['Order', 'Buyer', 'Name on the address', 'Second line', 'Delivered to'], rows), label(r, { ...s, order: rows[0]![0]! }, lines4(s, s.cc))].join('\n\n');
	},
	paramsLog: (r, s) =>
		fence([
			...traffic(r, s, int(r, 2, 6)),
			`Started POST "/shopcore/addresses" for ${ip(r)} at ${s.logTime}`,
			`Processing by Shopcore::AddressesController#create as HTML`,
			`  Parameters: {"authenticity_token"=>"[FILTERED]", "address"=>{"name"=>"${s.sfull}", "line1"=>"${s.line1}", "address_line_2"=>"${s.line2}", "city"=>"${s.city}", "postcode"=>"${s.postcode}", "country"=>"${s.cc}"}, "commit"=>"Save address"}`,
			`Unpermitted parameter: :address_line_2. Context: { controller: Shopcore::AddressesController, action: create, request: #<ActionDispatch::Request POST "https://${s.domain}/shopcore/addresses" for ${ip(r)}> }`,
			`  TRANSACTION (0.2ms)  BEGIN`,
			`  Shopcore::UserAddress Create (1.${int(r, 1, 9)}ms)  INSERT INTO "shopcore_user_addresses" ("user_id", "name", "line1", "line2", "city", ...) VALUES (${int(r, 1000, 90000)}, '${s.sfull}', '${s.line1}', NULL, '${s.city}', ...)`,
			`  TRANSACTION (0.${int(r, 3, 9)}ms)  COMMIT`,
			`Redirected to https://${s.domain}/shopcore/addresses`,
			`Completed 302 Found in ${ms(r, 22, 90)} (ActiveRecord: ${int(r, 2, 9)}.${int(r, 1, 9)}ms | Allocations: ${int(r, 6000, 14000)})`
		]),
	countryNames: (r, s) =>
		[
			console_([`Shopcore::UserAddress.group(:country).count.sort_by { -_2 }.first(6)`, `=> ${JSON.stringify(shuffle(r, [[s.cc, int(r, 4000, 20000)], [s.countryName, int(r, 300, 3000)], [s.lcName, int(r, 20, 200)], [s.cc.toLowerCase(), int(r, 5, 80)], ['UK', int(r, 10, 150)], ['Ireland', int(r, 5, 90)]]).sort((a, b) => Number(b[1]) - Number(a[1])))}`]),
			`From our checkout log: "No shipping rate for country '${s.countryName}' (address ${int(r, 10000, 99999)})" ${int(r, 12, 60)} times since ${s.since}.`
		].join('\n\n'),
	signinTrace: (r, s) =>
		fence([
			...traffic(r, s, int(r, 2, 6)),
			`Started GET "/shopcore/addresses" for ${ip(r)} at ${s.logTime}`,
			`Processing by Shopcore::AddressesController#index as HTML`,
			`Completed 500 Internal Server Error in ${ms(r, 3, 15)} (ActiveRecord: 0.0ms | Allocations: ${int(r, 900, 2400)})`,
			``,
			`NoMethodError (undefined method 'id' for nil):`,
			``,
			`${gems(s)} app/controllers/shopcore/addresses_controller.rb:24:in 'Shopcore::AddressesController#current_addresses'`,
			`${gems(s)} app/controllers/shopcore/addresses_controller.rb:4:in 'Shopcore::AddressesController#index'`,
			...framework(r, s, int(r, 3, 5))
		]),
	postcodeForm: (r, s) =>
		[
			fence([`name      ${pick(r, firstF)} ${s.sfull!.split(' ').slice(1).join(' ')}`, `line1     ${s.foreignLine1}`, `line2     ${s.foreignLine2}`, `city      ${s.foreignCity}`, `postcode  (empty)`, `country   ${s.foreignCc}`]),
			`What the page showed: "1 error prohibited this address from being saved: Postcode can't be blank".`
		].join('\n\n'),
	addressList: (r, s) =>
		[
			table(['As listed', 'Saved', 'Used for'], shuffle(r, [
				[s.nick1, `${pick(r, ['March', 'May', 'July'])} 2025`, `${int(r, 2, 3)} orders, last in ${pick(r, ['January', 'February', 'April'])}`],
				[s.nick2, `${pick(r, ['June', 'August'])} 2026`, `${int(r, 4, 12)} orders, including this one`],
				[s.nick3, `${pick(r, ['2024', 'November 2025'])}`, `${int(r, 2, 3)} gift orders`]
			]).sort((a, b) => (a[0]! < b[0]! ? -1 : 1))),
			`Checkout preselects the first address in the list.`
		].join('\n\n'),
	moneyConsole: (r, s) =>
		console_([`order = Shopcore::Order.find_by(number: "${s.order}")`, `order.total_cents`, `=> ${s.bigCents}`, `order.currency`, `=> "${s.cur}"`, `order.total`, `=> "${shop(Number(s.bigCents), s.cur)}"`]),
	invoice: (r, s) => {
		const rows = Array.from({ length: int(r, 4, 9) }, () => {
			const qty = int(r, 4, 120);
			const unit = int(r, 1500, 48000);
			return [pick(r, s.goods.split('|')), String(qty), shop(unit, s.cur), shop(qty * unit, s.cur)];
		});
		const total = rows.reduce((sum, row) => sum + Number(row[1]) * Number(row[2]!.replace(/[^\d]/g, '')), 0);
		return [`From the order confirmation email for ${s.order}:`, table(['Item', 'Qty', 'Unit price', 'Line total'], rows), `**Order total: ${shop(total, s.cur)}** (payment terms: 30 days)`].join('\n\n');
	},
	refundCare: (r, s) =>
		[
			`The refund email the shopper got:`,
			fence([`Subject: Your refund for order ${s.order}`, ``, `We've refunded part of your order:`, `  ${s.product} (returned)`, ``, `Amount refunded: ${shop(-Number(s.refundCents), s.cur)}`, `To: ${pick(r, ['Visa', 'Mastercard', 'Amex'])} ending ${int(r, 1000, 9999)}`, `It can take 3 to 5 working days to reach your account.`]),
			`And the payment provider's record of the same refund:`,
			table(['Refund', 'Amount', 'Currency', 'Status', 'Created'], [[`re_${int(r, 1000000, 9999999)}${pick(r, ['Kx', 'Qa', 'Wd'])}`, (Number(s.refundCents) / 100).toFixed(2), s.cur, 'succeeded', s.refundStamp]])
		].join('\n\n'),
	creditNotes: (r, s) =>
		table(['Credit note', 'Order', 'Our accounts say', 'Shopcore page says'], Array.from({ length: int(r, 5, 10) }, (_, i) => {
			const cents = int(r, 105, 9890);
			return [`CN-${int(r, 1000, 1400) + i}`, `${s.prefix}-${int(r, 20000, 40000)}`, plain(-cents, s.cur), shop(-cents, s.cur)];
		})),
	currencyTrace: (r, s) =>
		fence([
			...traffic(r, s, int(r, 2, 6)),
			`Started GET "/products/${s.slug}" for ${ip(r)} at ${s.logTime}`,
			`Processing by ProductsController#show as HTML`,
			`  Rendered products/_price.html.erb (Duration: ${int(r, 1, 9)}.${int(r, 1, 9)}ms)`,
			`Completed 500 Internal Server Error in ${ms(r, 20, 80)}`,
			``,
			`ArgumentError (unknown currency: ${s.newCur}):`,
			``,
			`${gems(s)} lib/shopcore/money.rb:7:in 'block in Shopcore::Money.format'`,
			`${gems(s)} lib/shopcore/money.rb:7:in 'Hash#fetch'`,
			`${gems(s)} lib/shopcore/money.rb:7:in 'Shopcore::Money.format'`,
			`${gems(s)} app/models/shopcore/product.rb:15:in 'Shopcore::Product#price'`,
			`app/views/products/_price.html.erb:${int(r, 2, 12)}`,
			...framework(r, s, int(r, 2, 4))
		]),
	ownDivision: (r, s) =>
		[
			`From our listing template, app/views/products/_tile.html.erb:`,
			fence([`<div class="tile__price">`, `  ${SYM[s.cur]}<%= product.price_cents / 100.0 %>`, `</div>`], 'erb'),
			table(['Product', 'price_cents', 'Listing shows', 'Product page shows'], Array.from({ length: int(r, 4, 7) }, () => {
				const cents = int(r, 3, 90) * 100 + pick(r, [0, 50, 90, 20]);
				return [pick(r, s.goods.split('|')), String(cents), `${SYM[s.cur]}${cents / 100}`, shop(cents, s.cur)];
			}))
		].join('\n\n'),
	rounding: (r, s) =>
		table(['Order', 'Lines', 'Shopcore total', 'Charged by the provider', 'Difference'], Array.from({ length: int(r, 5, 10) }, () => {
			const cents = int(r, 1500, 30000);
			const diff = pick(r, [1, -1, 1, 0, 2]);
			return [`${s.prefix}-${int(r, 20000, 40000)}`, String(int(r, 2, 9)), shop(cents, s.cur), shop(cents + diff, s.cur), diff === 0 ? '-' : `${diff > 0 ? '+' : ''}${diff}p`];
		})),
	api404: (r, s) =>
		fence([
			...traffic(r, s, int(r, 2, 6)),
			`Started GET "/shopcore/api/orders/${s.order}" for ${ip(r)} at ${s.logTime}`,
			`Processing by Shopcore::Api::OrdersController#show as JSON`,
			`  Parameters: {"number"=>"${s.order}"}`,
			`  Shopcore::Order Load (${int(r, 1, 4)}.${int(r, 1, 9)}ms)  SELECT "shopcore_orders".* FROM "shopcore_orders" WHERE "shopcore_orders"."user_id" = $1 AND "shopcore_orders"."number" = $2 LIMIT $3  [["user_id", ${s.staffId}], ["number", "${s.order}"], ["LIMIT", 1]]`,
			`Completed 404 Not Found in ${ms(r, 4, 20)} (ActiveRecord: ${int(r, 1, 4)}.${int(r, 1, 9)}ms | Allocations: ${int(r, 1500, 4000)})`,
			``,
			`ActiveRecord::RecordNotFound (Couldn't find Shopcore::Order):`
		]),
	apiText: (r, s) =>
		[
			fence(JSON.stringify({ number: s.order, status: 'paid', total: shop(Number(s.totalCents), s.cur), placed_at: s.placedIso }, null, 2).split('\n'), 'json'),
			`And the app's crash report:`,
			fence(pick(r, [
				[`Fatal error: typeMismatch(Swift.Double, Swift.DecodingError.Context(codingPath: [CodingKeys(stringValue: "total", intValue: nil)], debugDescription: "Expected to decode Double but found a string instead.", underlyingError: nil))`, `  at OrderDetailViewModel.load() (OrderDetailViewModel.swift:${int(r, 40, 120)})`],
				[`com.squareup.moshi.JsonDataException: Expected a double but was STRING at path $.total`, `  at com.${s.prefix.toLowerCase()}.app.orders.OrderRepository.fetch(OrderRepository.kt:${int(r, 30, 90)})`],
				[`TypeError: order.total.toFixed is not a function`, `    at formatTotal (src/screens/OrderScreen.tsx:${int(r, 20, 99)}:31)`]
			]))
		].join('\n\n'),
	webhooks: (r, s) =>
		table(['Delivered', 'Event', 'Endpoint', 'Response', 'Attempts'], Array.from({ length: int(r, 5, 10) }, (_, i) => [
			`${s.sinceShort} ${pad(int(r, 8, 22))}:${pad(int(r, 0, 59))}`,
			pick(r, ['payment_intent.succeeded', 'charge.succeeded', 'payment_intent.succeeded']),
			`https://${s.domain}/webhooks/payments`,
			i === 0 && chance(r, 0.3) ? '200 OK' : pick(r, ['401 Unauthorized: signature mismatch', '401 Unauthorized: signature mismatch', '404 Not Found']),
			String(int(r, 1, 8))
		])),
	paidCase: (r, s) =>
		[
			fence([
				`Started POST "/webhooks/payments" for ${ip(r)} at ${s.logTime}`,
				`Processing by PaymentWebhooksController#create as JSON`,
				`  Shopcore::Order Load (0.${int(r, 4, 9)}ms)  SELECT "shopcore_orders".* FROM "shopcore_orders" WHERE "shopcore_orders"."number" = $1 LIMIT $2  [["number", "${s.order}"], ["LIMIT", 1]]`,
				`Completed 422 Unprocessable Entity in ${ms(r, 10, 40)}`,
				``,
				`ActiveRecord::RecordInvalid (Validation failed: State is not included in the list):`,
				``,
				`app/controllers/payment_webhooks_controller.rb:${int(r, 14, 30)}:in 'PaymentWebhooksController#create'`
			]),
			`The line it points at:`,
			fence([`order.update!(state: "${s.badState}", paid_at: Time.current)`], 'ruby')
		].join('\n\n'),
	cancelShipped: (r, s) =>
		table(['Order', 'Shipped', 'Cancelled by customer', 'Refunded'], Array.from({ length: int(r, 4, 8) }, () => {
			const shipped = midnight(Number(s.openMs)) - int(r, 3, 24) * DAY + int(r, 8 * 60, 15 * 60) * MIN;
			const cancelled = shipped + int(r, 2 * 60, 50 * 60) * MIN;
			return [`${s.prefix}-${int(r, 20000, 40000)}`, stamp(shipped), stamp(cancelled), plain(int(r, 1800, 26000), s.cur)];
		})),
	openScope: (r, s) => {
		const cart = int(r, 900, 4000);
		const placed = int(r, 40, 300);
		const paid = int(r, 30, 260);
		return console_([`Shopcore::Order.open.count`, `=> ${cart + placed + paid}`, `Shopcore::Order.open.group(:state).count`, `=> {"cart"=>${cart}, "placed"=>${placed}, "paid"=>${paid}}`, `Shopcore::Order.open.where(state: "cart").where("updated_at < ?", 30.days.ago).count`, `=> ${Math.floor(cart * (0.6 + r() * 0.3))}`]);
	},
	statusTimeline: (r, s) =>
		[
			table(['When', 'Order history'], [[s.placedStamp, 'placed'], [s.paidStamp, 'paid'], ['-', '(nothing since)']]),
			table(['When', `${s.carrier} tracking`], [[s.collected, 'Collected from Brambleway Sheffield DC'], [s.outFor, 'Out for delivery'], [s.delivered, `Delivered, ${pick(r, ['left in porch', 'signed for by ' + s.sfirst, 'handed to resident'])}`]])
		].join('\n\n'),
	skuDup: (r, s) => {
		const goods = s.goods!.split('|');
		const rows = Array.from({ length: int(r, 5, 9) }, (_, i) => {
			const name = i === 1 ? `${goods[0]} (${pick(r, ['large', 'blue', 'XL', 'pack of 2'])})` : i === 0 ? goods[0]! : pick(r, goods);
			return `${s.prefix}-${s.skuBase}${i < 2 ? '' : `-${i}`},${name},${int(r, 4, 90)}.${pick(r, ['00', '50', '95'])},${s.cur}`;
		});
		const total = int(r, 300, 1000);
		const failed = int(r, 6, 40);
		return [fence(['sku,name,price,currency', ...rows], 'csv'), fence([`Row 3: Validation failed: Sku has already been taken`, `Imported ${total - failed} of ${total} rows; ${failed} failed (see above)`])].join('\n\n');
	},
	priceTiny: (r, s) =>
		[
			fence([`sku,name,price_cents`, ...Array.from({ length: int(r, 4, 8) }, () => `${s.prefix}-${int(r, 1000, 9999)},${pick(r, s.goods.split('|'))},${int(r, 4, 80)}.${pick(r, ['00', '50', '99', '25'])}`)], 'csv'),
			console_([`p = Shopcore::Product.find_by(sku: "${s.sku}")`, `p.price_cents`, `=> ${s.tinyCents}`, `p.price`, `=> "${shop(Number(s.tinyCents), s.cur)}"`])
		].join('\n\n'),
	currencyDefault: (r, s) =>
		console_([`p = Shopcore::Product.find_by(sku: "${s.sku}")`, `p.currency`, `=> "USD"`, `p.price`, `=> "${shop(Number(s.priceCents), 'USD')}"`, `Shopcore::Product.group(:currency).count`, `=> {"${s.cur}"=>${int(r, 200, 900)}, "USD"=>${int(r, 20, 160)}}`, `Shopcore::Product.where(currency: "USD").minimum(:created_at)`, `=> ${s.syncStart}`]),
	skuBlank: (r, s) =>
		fence([`ActiveRecord::RecordInvalid: Validation failed: Sku can't be blank`, `  from app/admin/bundles_controller.rb:${int(r, 18, 44)}:in 'Admin::BundlesController#create'`, ``, `params: {"product"=>{"name"=>"${pick(r, s.goods.split('|'))} ${pick(r, ['gift set', 'sample', 'starter bundle'])}", "price_cents"=>"${int(r, 900, 9000)}", "currency"=>"${s.cur}", "sku"=>""}}`]),
	promo: (r, s) =>
		table(['Basket', s.order], [['Code entered', s.code], ['Result', pick(r, ['"This code is not valid for items already on sale"', '"This code has expired"', '"Minimum spend not reached"'])], ['Items', `${int(r, 2, 6)}, of which ${int(r, 1, 2)} on sale`], ['Subtotal', shop(Number(s.totalCents), s.cur)]]),
	nilLabel: (r, s) =>
		fence([
			...traffic(r, s, int(r, 2, 6)),
			`Started GET "/checkout/${s.order}/confirmation" for ${ip(r)} at ${s.logTime}`,
			`Processing by Checkout::ConfirmationsController#show as HTML`,
			`  Rendered checkout/confirmations/show.html.erb within layouts/application (Duration: ${int(r, 5, 30)}.${int(r, 1, 9)}ms)`,
			`Completed 500 Internal Server Error in ${ms(r, 30, 90)}`,
			``,
			`ActionView::Template::Error (undefined method 'label_lines' for nil):`,
			`    ${int(r, 10, 30)}:   <h3>Delivering to</h3>`,
			`    ${int(r, 31, 40)}:   <% order.shipping_address.label_lines.each do |line| %>`,
			``,
			`app/views/checkout/confirmations/show.html.erb:${int(r, 31, 40)}`,
			...framework(r, s, int(r, 2, 4))
		]),
	dispatchEmail: (r, s) =>
		[
			fence([`Subject: Your Brambleway order ${s.order} is on its way`, ``, `Good news, your order has left our warehouse.`, ``, `Delivering to:`, `  ${s.sfull}`, `  ${s.workLine}`, `  ${s.city}`, ``, `Track it: https://track.example/${s.carrier.replace(/\s/g, '').toLowerCase()}/${int(r, 100000000, 999999999)}`]),
			`The order itself, in the admin, says: deliver to ${s.oneLine}.`
		].join('\n\n')
};

// ---------------------------------------------------------------------------------------------------------
// Topics. Each is one matter a ticket can be about, with text of its own. The area is never written into a
// ticket: it is what the matter turns out to concern once the desk has found the cause.
type Area = 'address book' | 'shipping labels' | 'amounts and prices' | 'orders' | 'products' | 'none';
type Outcome = 'fix' | 'work' | 'change' | 'team' | 'quiet';
interface Topic {
	key: string;
	area: Area;
	via: 'care' | 'partner';
	weight: number;
	only?: (store: Store) => boolean;
	subjects: string[];
	/** The reporter's first words: a partner's message, or the shopper's message that care quotes. */
	open: [string, string];
	/** Care only: what care checked before escalating. */
	checked?: string;
	ask: [string, string];
	/** What the desk asked for, as a noun phrase, for a reminder. */
	need: string;
	give: string;
	art: Art;
	find: string;
	more?: [string, string][];
	quick: [string, string];
	/** What the reporter has to do, after "you'll need to". */
	fix?: string;
	fixed?: [string, string];
	work?: string;
	accept?: [string, string];
	/** The change to Shopcore, as a noun phrase, and the desk's message when it logs it. */
	change?: string;
	changeMsg?: string;
	team?: TeamKey;
	handover?: string;
	/** The team's message when it sorts the matter itself. */
	teamFix?: string;
	teamNeed?: string;
	outcomes: Outcome[];
}
const v34 = (store: Store) => store.version === '3.4.0';
const isUS = (store: Store) => store.cc === 'US';
const notUS = (store: Store) => store.cc !== 'US';

const topics: Topic[] = [
	{
		key: 'label-second-line-care',
		area: 'shipping labels',
		via: 'care',
		weight: 3,
		only: notUS,
		subjects: ['Parcel returned to sender', 'Order came back undelivered', 'Courier could not find the flat'],
		open: [
			`My order {order} came back to you marked "address incomplete". The address in my account is right, I've checked it twice: {line2}, {line1}, {city}. I live in a block of {n2} flats and the courier obviously had no idea which one was mine. Can you send it out again, and tell me what went wrong so it doesn't happen with the next one?`,
			`This is the second time a parcel from you hasn't reached me. The tracking says "addressee not known at this address" and it's now on its way back to your warehouse. My saved address on your site has my flat number in it, so I don't understand how it got lost. I'd like the order resent, and I'd like to know whether I should be typing my address differently.`
		],
		checked: `I looked at the shopper's saved addresses in the admin and the flat number is there, in the second address line. We've reshipped at our cost and told the shopper we're looking into it. What I can't work out is where the flat number went between the address book and the parcel. The warehouse says they print exactly what the site gives them.`,
		ask: [
			`Thanks for the detail. Could you ask the warehouse for the label that went on the returned parcel, or the label preview from their print queue for {order}? I want to see exactly what Shopcore handed over.`,
			`Sorry for the shopper's trouble. Can you get me a copy of the label from the returned parcel? A photo is fine, or the preview from the warehouse print queue. That tells us whether the address was lost before or after printing.`
		],
		need: 'a copy of the label from the returned parcel',
		give: `The warehouse sent the preview from their print queue. This is what went on the parcel:`,
		art: (r, s) => arts.labelNoFlat!(r, s),
		find: `That explains it. The label has the name, the street, the postcode and town, and the country, and nothing from the second address line. That part is Shopcore rather than the warehouse: the label helper builds the lines from the first address line and never looks at the second, so every address that keeps a flat or unit number in line 2 goes out without it. The shopper did nothing wrong, and neither did the warehouse.`,
		more: [
			[`Is it only this shopper, or everyone with a flat number?`, `Everyone whose flat or unit number is in the second line. Shoppers who typed "Flat 3, 22 Station Road" into the first line are fine, which is why it hasn't shown up more often. I've asked fulfilment for a count of returns to flats since the middle of September.`],
			[`Should we tell shoppers to put the flat number on the first line?`, `Not as a general message, please. It gets the label right but makes the address book harder to read, and the form asks for the flat in the second line. For a shopper who has already had a parcel come back, it's a fair suggestion while the label is wrong.`],
			[`The shopper asked whether we'll cover the cost of the second delivery attempt {she} paid for.`, `That's a care decision, but from our side the fault was ours, not {hers}, so I'd say yes. Nothing on the platform stops you refunding the delivery charge in the admin.`]
		],
		quick: [`Does the shipping label include the second address line?`, `Not at the moment. The label is the name, the first address line, the postcode and town, and the country. It's a known gap and it's on the board.`],
		work: `Until the label carries the second line, the quickest thing is to move the flat number into the first line of the shopper's saved address, for example "{line2}, {line1}". The label then has it, and the address still reads correctly. If the shopper agrees, care can make the change in the admin.`,
		accept: [`The shopper was happy for us to change it and we've done it. The resent parcel printed with the flat number this time.`, `OK. We've put the flat number on the first line with the shopper's agreement, and we'll do the same for anyone else who rings in about this until it's fixed.`],
		change: 'the shipping label to include the second address line when it is set',
		changeMsg: `I've logged it on the platform board as a Shopcore bug, with this ticket and the label preview attached. The fix itself is small. I'll update this ticket when it's released and the storefronts are running it. Until then the warehouse can't add the line by hand, because they print in batches.`,
		team: 'fulfilment',
		handover: `Label for {order} printed without the second address line, because Shopcore's label leaves line 2 out. Can fulfilment check whether the print template can add line 2 from the order's address in the meantime?`,
		teamFix: `We've added a step to the print template that puts the second address line back in from the order's address whenever the label from the site doesn't have it. It went live this morning, and the reshipped parcel for {order} printed with the flat number on it.`,
		teamNeed: 'the order numbers of the other parcels care knows came back from flats',
		outcomes: ['change', 'work', 'team', 'change']
	},
	{
		key: 'label-second-line-partner',
		area: 'shipping labels',
		via: 'partner',
		weight: 3,
		only: (store) => v34(store) && notUS(store),
		subjects: ['Flat numbers missing on shipping labels', 'Labels missing part of the address', 'Returned parcels, all to flats'],
		open: [
			`Our warehouse flagged that labels printed for {store} orders are missing flat and unit numbers. We've had {n1} parcels come back in the last fortnight, all of them to flats. Our address form has a second line for exactly this and customers are filling it in. Is this something in our setup or in Shopcore?`,
			`We print shipping labels with Shopcore::AddressLabel.lines, and {carrier} has started returning parcels to flats as undeliverable. I've looked at a few of the addresses and the flat number is there in the address book. Could someone on the desk take a look before it gets worse in the run-up to Christmas?`
		],
		ask: [
			`Could you send me one affected address as it's stored, and the label lines Shopcore returns for it? From a console on your store, the address record and its label_lines would do.`,
			`Can you pick one of the returned parcels and send me the stored address and what label_lines gives for it? A console session pasted into the ticket is perfect.`
		],
		need: 'one affected address and its label lines',
		give: `Here's one from this morning's returns:`,
		art: (r, s) => arts.addressConsole!(r, s),
		find: `Thanks, that settles it. The address has the flat number in line2 and label_lines comes back without it. The label helper takes the name, line1, the postcode and city, and the country, and never looks at line2. So nothing is wrong with your form or your data: every address that keeps its flat or unit number in the second line prints without it.`,
		more: [
			[`Does that mean every label we've printed since we started using it is missing the second line?`, `Every label for an address that has a second line, yes. Addresses where the customer typed everything into the first line are fine. If you can, look at the returns from the last few weeks: I'd expect them to be mostly flats.`],
			[`Is it safe for us to build our own label from the address fields instead?`, `Yes. AddressLabel.lines is a convenience, and nothing else in Shopcore depends on you using it. If you build your own, keep the same order so the carrier's address parsing still works.`]
		],
		quick: [`Does AddressLabel.lines work with objects that aren't UserAddress records?`, `Yes, with anything that responds to name, line1, line2, city, postcode and country. A plain Struct works, which is how the tests use it.`],
		work: `Until it's fixed, the simplest thing on your side is to build the label yourselves: take label_lines and put line2 back in after the street when it's present. It's three lines of Ruby where you call the helper now, and you can take them out again once Shopcore does it.`,
		accept: [`Done, our print job now adds line2 itself. The first labels from the new job look right.`, `We've patched it in our print code as you suggested and the warehouse is happy again. Thanks for the quick answer.`],
		change: 'the shipping label to include the second address line when it is set',
		changeMsg: `It's a Shopcore bug and I've logged it on the platform board with your example attached. I'll post here when a release has the fix.`,
		outcomes: ['change', 'work', 'work', 'quiet']
	},
	{
		key: 'label-country-case',
		area: 'shipping labels',
		via: 'partner',
		weight: 3,
		only: v34,
		subjects: ['{carrier} rejecting bookings', 'Carrier API errors on new shipments', 'Shipments failing at booking'],
		open: [
			`Since {weekday} a share of our shipments fail when we book them with {carrier}. It isn't all of them, maybe one in {k}. The failures all carry the same error about the recipient's country. Our code passes the label lines more or less straight into the carrier's booking call.`,
			`We're getting rejected bookings from {carrier} for some orders. Our ops team re-keys them by hand and they go through, so the addresses must be fine. Nothing has changed on our side recently except that we now take the address from Shopcore's label helper.`
		],
		ask: [
			`Could you paste one of the rejected booking responses, and the address it was for as Shopcore has it?`,
			`Can you send me the carrier's full response for one failed booking, with the address it belonged to?`
		],
		need: 'one rejected booking response and its address',
		give: `Here's one rejection from the booking log, with the address beside it:`,
		art: (r, s) => arts.carrierReject!(r, s),
		find: `The carrier wants the country as an upper-case ISO code, and this one went over as "{lc}". Shopcore's label prints the country exactly as it was typed into the address book, so anyone who typed it in lower case gets a lower-case code on the label and in your booking call. A booking keyed in by hand goes through because whoever types it uses capitals.`,
		more: [
			[`Why are only some customers affected?`, `Because only some of them typed the country themselves. If your form sends "{cc}" from a fixed list, those addresses are fine. Addresses saved before you had the list, or through a phone-order screen, keep whatever was typed.`],
			[`Will the carrier accept "{cc}" with a space after it? We've seen a couple of those too.`, `Most carriers trim it, {carrier} included as far as I know, but it's worth stripping whitespace on your side at the same time.`]
		],
		quick: [`Does Shopcore check the country code when an address is saved?`, `Only that one is there. It doesn't check the format or the case.`],
		fix: `upper-case the country before it goes into the booking call, and correct the {n2} saved addresses that have a lower-case code with a one-off update in a console`,
		fixed: [`Both done. Today's bookings all went through, including two that had failed yesterday.`, `We upper-case it in the booking code now and ran the update on the saved addresses. No rejections since. Thanks!`],
		work: `For now, upper-case the country in your booking code before the call goes out. It's a one-word change and you don't need to touch the saved addresses for it.`,
		accept: [`Makes sense. We've added the upcase in the booking code and that's good enough for us.`, `Fine, we'll do that on our side. No more rejections since this morning's deploy.`],
		change: 'the shipping label to print the country code in capitals',
		changeMsg: `The label should print the code in capitals whatever was typed, and I've logged that against Shopcore with your example. I'll update the ticket when it's out.`,
		outcomes: ['change', 'fix', 'work', 'quiet']
	},
	{
		key: 'label-us-order',
		area: 'shipping labels',
		via: 'partner',
		weight: 2,
		only: (store) => isUS(store) && v34(store),
		subjects: ['Address order on US labels', 'Labels look wrong for US addresses', 'USPS sorting delays'],
		open: [
			`Our labels print the ZIP code before the city, like a European address. {carrier} is still delivering most of them, but our fulfillment partner says some get pulled for manual sorting, which adds a day or two. Is there a way to get the US order?`,
			`A customer sent us a photo of her parcel and asked why her address looks "backwards". The ZIP comes first and the state is tacked on after the city. It's our first holiday season on Shopcore and I'd like to get this right before volumes go up.`
		],
		ask: [
			`Could you send me a label as printed and the address it came from? A photo of the label is fine.`,
			`Can you paste the label text for one of these and the stored city, postcode and country for the address?`
		],
		need: 'a printed label and its address',
		give: `Here's the label from the photo, typed out, and the address fields:`,
		art: (r, s) => arts.labelUS!(r, s),
		find: `Thanks. Shopcore's label always puts the postcode before the town, the way most European carriers want it. US addresses want the city, the state and then the ZIP on one line. The label helper doesn't know about countries at all, so a US address gets the European order, with your customers' state stuck to the city because that's where your form saves it.`,
		more: [[`Is anyone else seeing this?`, `Every store that ships to the US with Shopcore's label. Some of them build the last line themselves for US addresses, which is what I'd suggest for now.`]],
		quick: [`Does the label know about different countries' address formats?`, `No. It uses one format for every country: the postcode, then the town.`],
		work: `For US shipments, build the last line yourselves from the city and the postcode, in the US order, and use Shopcore's lines for the rest. Your carrier's address validation will tidy the state up.`,
		accept: [`OK, we've done that and the labels look like American labels now. The fulfillment folks are happy.`, `Done on our side. It's a small special case in our print code, so we can live with it.`],
		change: 'the shipping label to use the US order (city, state and ZIP on one line) for US addresses',
		changeMsg: `It's a real gap in Shopcore and I've logged it with your label attached. When it lands, US addresses will print in the US order without anything on your side.`,
		outcomes: ['work', 'change', 'work']
	},
	{
		key: 'label-long-lines',
		area: 'shipping labels',
		via: 'partner',
		weight: 2,
		only: v34,
		subjects: ['Label text cut off', 'Thermal labels cutting off street names', 'Addresses cut short on labels'],
		open: [
			`Some of our labels come out with the end of the street missing. It's always the long ones: house names, business parks, that kind of thing. {carrier} usually works it out, but we had {n1} parcels delayed last week and one sent to the wrong town.`,
			`Our new thermal printer cuts off long address lines. The address looks complete in the order screen and in the address book, but on the 4x6 label the street stops halfway. Could Shopcore be sending the lines short?`
		],
		ask: [
			`Could you send me a label where it happened and the first address line as it's stored?`,
			`Can you paste one cut-off label and tell me how wide the address box on your label template is?`
		],
		need: 'a cut-off label and the stored address line',
		give: `Here's one from yesterday, and the stored line:`,
		art: (r, s) => arts.labelLong!(r, s),
		find: `Shopcore hands over the whole line; the label lines are just the address fields, untouched and unwrapped. The cut happens in your label template: the address box has a fixed width and clips whatever doesn't fit. Short addresses fit, long ones lose their end.`,
		more: [[`Couldn't Shopcore wrap the long lines for us?`, `It could, but it doesn't know how wide your label is, and every printer and template is different. Wrapping in the template is the reliable place to do it.`]],
		quick: [`Is there a length limit on address lines in Shopcore?`, `Only the database's string limit, which no real address gets near. The address book accepts whatever the customer types.`],
		fix: `switch the address box in your label template from clipping to shrink-to-fit, or let it wrap onto a second line`,
		fixed: [`Shrink-to-fit did it. Long lines come out in a slightly smaller font and the carrier's scanner reads them fine.`, `We set the box to wrap and reprinted the last batch. All complete now.`],
		team: 'agency',
		handover: `Label template on {domain} clips long address lines. Asked the store's agency to set the address box to wrap or shrink to fit.`,
		teamFix: `We've changed the address box on the label template to shrink long lines to fit, and tested it with the longest addresses in the store. It's live now.`,
		teamNeed: 'the printer model and the label size you print on',
		outcomes: ['fix', 'fix', 'team', 'quiet']
	},
	{
		key: 'label-encoding',
		area: 'none',
		via: 'partner',
		weight: 2,
		only: v34,
		subjects: ['Question marks on labels', 'Accented names print wrong', 'Strange characters on shipping labels'],
		open: [
			`Names with accents come out wrong on our shipping labels: "{accented}" printed with question marks where the accents should be. It looks careless, and one customer has already complained. The names look fine on the website.`,
			`Since we started printing labels from Shopcore, anything with an accent or a special character turns into a question mark on the label. Our customers in {town} have a lot of those. Is the label helper stripping them?`
		],
		ask: [
			`Could you send me what label_lines returns for one of these addresses, and what the printer produced for it?`,
			`Can you check one affected address in a console, label_lines and its encoding, and paste it here with the printed label?`
		],
		need: 'the label lines for one affected address',
		give: `Here's the console output for one customer, and what came out of the printer:`,
		art: (r, s) => arts.encoding!(r, s),
		find: `Shopcore's side is fine: the label lines are proper UTF-8 with every accent in place. The question marks come in afterwards, when the print server turns the text into something the printer understands. That usually means the printer, or its driver, is set to a single-byte code page and replaces anything it can't map.`,
		more: [[`Our printer is a {printer}. Does that tell you anything?`, `Those support UTF-8, but it's off out of the box on most of them. It's a setting on the printer or in the driver, usually called the code page or character set.`]],
		quick: [`Do the label lines come back in UTF-8?`, `Yes. They're the address fields as stored, which are UTF-8 like the rest of the database.`],
		fix: `set the printer's character set to UTF-8, in the driver settings or on the printer's own menu, and reprint a test label`,
		fixed: [`Found the setting in the driver: it was on Windows-1252. Switched to UTF-8 and the accents print now.`, `That was it. Our warehouse lead changed the code page on both printers and the names come out right.`],
		team: 'agency',
		handover: `Accents become question marks between Shopcore's label lines and the printer on {domain}. Passed to the store's agency, who set up their print server.`,
		teamFix: `We found the print server was converting the job to ASCII before sending it to the printer. We've changed it to pass UTF-8 through and the accents print correctly now.`,
		outcomes: ['fix', 'team', 'fix']
	},
	{
		key: 'label-company',
		area: 'shipping labels',
		via: 'partner',
		weight: 2,
		only: (store) => Boolean(store.b2b) && v34(store),
		subjects: ['Company name on labels', 'Trade deliveries refused at reception', 'Business deliveries going astray'],
		open: [
			`Our trade customers are mostly businesses in shared buildings, and receptions keep refusing our parcels because the label has a person's name and no company. {n1} came back last month. Our buyers put the company somewhere in the address, but it never seems to make it onto the label.`,
			`Deliveries to business parks are a mess. Drivers can't find the right unit because the label only has a name, and receptionists don't know who half our buyers' staff are. Is there any way to get the company name on the label?`
		],
		ask: [
			`Could you send me a few of the refused deliveries with the addresses as your buyers entered them?`,
			`Can you show me how a handful of these addresses look in the address book, and the label one of them got?`
		],
		need: 'a few refused deliveries with their addresses',
		give: `Here's last month's list, and the label for the first one:`,
		art: (r, s) => arts.labelCompany!(r, s),
		find: `Shopcore's addresses have no company field, so your buyers have improvised: some put the company in the name, some in the second line, and some nowhere. The label prints the name and the first line, so a company in the name survives, but one in the second line never reaches the label.`,
		more: [[`Is a company field something Shopcore might add?`, `It's come up before from trade stores. I'll add your case to it, but I can't promise when.`]],
		quick: [`Do Shopcore addresses have a company field?`, `No. There's the name, two address lines, the city, the postcode and the country.`],
		work: `For now, ask trade buyers to enter the address name as "Person, Company", for example "Receiving, Northfield Hotel". It goes on the first line of the label and drivers and receptions can work with it. You could also prefill it from the buyer's account when they add an address.`,
		accept: [`We've changed the hint on our address form and prefilled it for trade accounts. Fewer refusals already.`, `Fine, we'll do that. Our account managers are telling the big buyers this week.`],
		change: 'a company line on addresses and on the shipping label',
		changeMsg: `I've logged a company line on addresses and labels as a Shopcore change, with your list attached. I'll let you know when it's scheduled.`,
		outcomes: ['work', 'change', 'change']
	},
	{
		key: 'postcode-required',
		area: 'address book',
		via: 'care',
		weight: 2,
		subjects: ['Cannot save delivery address', 'Address form will not accept my address', 'Gift delivery abroad'],
		open: [
			`I'm trying to send a gift to my sister in {foreignName} and your site won't save her address. It keeps saying the postcode can't be blank, but they don't have postcodes there. I've tried leaving it empty and I've tried a space. What am I supposed to put?`,
			`Your address form is refusing my daughter's address in {foreignName}. There is no postcode where she lives, it simply isn't a thing, and the form won't let me continue without one. I've been trying for twenty minutes and I'm about to give up and order somewhere else.`
		],
		checked: `We do ship to {foreignName} from this storefront. I tried saving the address from the admin and got the same error. I haven't told the shopper to invent a postcode because I don't know what that does further down the line.`,
		ask: [
			`Thanks. Could you send me exactly what the shopper typed and the error the page showed? The form log in the admin has both.`,
			`Could you paste the address as the shopper entered it, and the error message? I want to see whether it's the postcode alone.`
		],
		need: 'the address the shopper typed and the error',
		give: `From the form log:`,
		art: (r, s) => arts.postcodeForm!(r, s),
		find: `It's the postcode alone. Shopcore requires a postcode on every address, whatever the country, and {foreignName} has no postcodes, so the address can never be saved as it is. Nothing the shopper did wrong.`,
		more: [[`Will a made-up postcode cause problems with the courier?`, `For {foreignName}, couriers ignore the field, so a placeholder doesn't hurt the delivery. It does show on the label, which looks odd but works.`]],
		quick: [`Is the postcode required for every country?`, `Yes, at the moment Shopcore requires one for every address.`],
		work: `For now, care can save the address with "000" as the postcode; the courier ignores it for {foreignName}. If the shopper would rather do it from the form, typing the same works.`,
		accept: [`Done, the shopper has placed the order with "000" in the postcode. The shopper wasn't thrilled, but it's through.`, `We've saved it from the admin with the placeholder and the order's gone through. We'll use the same for anyone else.`],
		change: 'the postcode to be optional for countries that have no postcodes',
		changeMsg: `The real fix is to let the postcode be blank for countries without postcodes, and I've logged it against Shopcore with this case. Until it's out, the placeholder will get orders through.`,
		team: 'storefront',
		handover: `Shoppers can't save addresses in {foreignName}: Shopcore requires a postcode. Asking the storefront team whether checkout can fill a placeholder for countries without postcodes.`,
		teamFix: `We've added a placeholder postcode for the countries on our shipping list that don't use one, filled in behind the scenes at checkout. It's live, and care has confirmed the shopper's order went through.`,
		outcomes: ['work', 'change', 'team', 'change']
	},
	{
		key: 'address-order',
		area: 'address book',
		via: 'care',
		weight: 2,
		subjects: ['Order sent to the wrong address', 'Parcel went to my old flat', 'Wrong delivery address chosen'],
		open: [
			`My order went to {nick1} instead of home. I'm sure I didn't choose that address. It's the second time this has happened and the parcel is now sitting somewhere I can't get to this week.`,
			`Why does your checkout keep picking the wrong address? I have three saved and it always goes for the one I use least. I only noticed after the dispatch email that it had gone to {nick1} again.`
		],
		checked: `I checked the order: the address on it is the one the shopper says {she} didn't pick. {She} has three saved addresses and is adamant {she} never changed the selection at checkout.`,
		ask: [
			`Could you send me how the shopper's addresses are listed, with when each was saved and last used?`,
			`Can you pull the shopper's address book from the admin, in the order it lists, and which one each recent order used?`
		],
		need: "the shopper's address list",
		give: `Here's the address book as it lists, from the admin:`,
		art: (r, s) => arts.addressList!(r, s),
		find: `That's it: the address book lists addresses by their name, alphabetically, and checkout preselects the first one in the list. "{nick1}" sorts before "{nick2}", so it's preselected every time, however rarely it's used. The shopper didn't pick it; {she} just didn't change it.`,
		more: [[`Can the shopper choose which address comes first?`, `Not directly. The list is always alphabetical by the name the shopper gave the address.`]],
		quick: [`In what order does the address book list addresses?`, `Alphabetically, by the name each address was saved under.`],
		work: `The quickest fix for this shopper is to change the names of {her} saved addresses so the one {she} uses most sorts first, for example "1 Home". Care can do it in the admin with the shopper's agreement.`,
		accept: [`{She} was fine with that. We've changed the names and {her} next order picked home.`, `Done with the shopper's agreement. Slightly silly, but it works.`],
		change: 'a default address that the address book lists first and checkout preselects',
		changeMsg: `A default address the shopper chooses, listed first, is the proper answer, and I've logged it as a Shopcore change with this ticket attached.`,
		team: 'storefront',
		handover: `Checkout preselects the first address in the book, which is alphabetical. Asking the storefront team whether checkout could preselect the address used on the shopper's last order instead.`,
		teamFix: `Checkout now preselects the address used on the shopper's last order, and only falls back to the first in the list for a first order. Live since this morning.`,
		outcomes: ['work', 'change', 'team']
	},
	{
		key: 'form-second-line',
		area: 'none',
		via: 'partner',
		weight: 3,
		only: notUS,
		subjects: ['Flat numbers missing on shipping labels', 'Second address line not showing up', 'Labels missing part of the address'],
		open: [
			`Parcels to flats keep coming back to us. The customers swear they entered their flat number, and our address form has a second line for it, but the flat number is nowhere on the label. I assume the label helper is losing it somewhere?`,
			`Our customers fill in the second address line, but it isn't on the labels, and {carrier} returned {n1} parcels to flats this month. Is that a known Shopcore thing?`
		],
		ask: [
			`Could you look up one affected address in a console and send me what's stored, line2 included?`,
			`Before we look at the label, can you check what one of these addresses has in line2? A console session is fine.`
		],
		need: 'what one affected address has stored in line2',
		give: `Here's the request from the customer's last address save, from our logs, since line2 turned out to be empty:`,
		art: (r, s) => arts.paramsLog!(r, s),
		find: `That's the answer, and it's earlier than the label. Your address form sends the second line as "address_line_2", but Shopcore's address book only accepts "line2", so Rails leaves the value out as an unpermitted parameter and line2 is saved empty. The label can't print what was never saved.`,
		more: [[`So it's our form, not Shopcore?`, `The form, yes. It looks like your theme was built against a different field name. Every address saved through it since then has an empty second line.`], [`Can we get the lost flat numbers back?`, `Not from Shopcore, since they were never stored. If your logs go back far enough, the parameters are in there, as you can see above.`]],
		quick: [`Which fields does the address form accept?`, `name, line1, line2, city, postcode and country, under "address".`],
		fix: `change the field name in your address form from address_line_2 to address[line2], and ask the customers with open orders to flats to check their address`,
		fixed: [`Changed the field and saved a test address: line2 is stored now. We've emailed the customers with open orders.`, `Fixed in our theme. New addresses keep their flat numbers. Thanks for spotting it in the log.`],
		team: 'agency',
		handover: `The address form on {domain} posts address_line_2, which Shopcore doesn't permit, so line2 is never saved. Passed to the store's agency, who built the theme.`,
		teamFix: `We've corrected the field name in the theme's address form and checked that line2 is saved. Sorry, that one was ours from the redesign in the summer.`,
		teamNeed: 'access to the staging site so we can test the form',
		outcomes: ['fix', 'team', 'fix', 'quiet']
	},
	{
		key: 'country-names',
		area: 'address book',
		via: 'partner',
		weight: 2,
		subjects: ['No shipping rate at checkout', 'Checkout says we do not deliver to the UK', 'Shipping rates missing for some customers'],
		open: [
			`Some customers get "we don't deliver to this country" at checkout, for addresses in our own country. Most people get through fine. It started a few weeks ago, as far as we can tell.`,
			`Our shipping-rate lookup fails for a slice of saved addresses and those customers can't check out. The addresses look normal to us. Has anything changed in how Shopcore stores the country?`
		],
		ask: [
			`Could you send me a count of saved addresses by country, and the error your rate lookup logs?`,
			`Can you run a count of addresses grouped by country and paste it with a line from your checkout log?`
		],
		need: 'a count of addresses by country',
		give: `Here's the count, and the line from our checkout log:`,
		art: (r, s) => arts.countryNames!(r, s),
		find: `Nothing changed in Shopcore. The country is stored exactly as your form sends it, and your form must have sent the full country name for a while, because you have addresses with "{countryName}" next to the ones with "{cc}". Your rate lookup only knows the codes, so the full names find no rate.`,
		more: [[`Our agency changed the country picker in August. Could that be it?`, `Very likely. If the picker sent the label instead of the value for a while, that's exactly the pattern above.`]],
		quick: [`Does Shopcore normalise the country when an address is saved?`, `No, it stores what it's given.`],
		fix: `make the country picker send the two-letter code again, and update the saved addresses that have full names to the matching codes`,
		fixed: [`Picker fixed and {n2} addresses updated to codes. Checkout works for all of them now.`, `The picker is fixed and the update has run. No more failed rate lookups since yesterday.`],
		change: 'the address book to accept only two-letter country codes',
		changeMsg: `I've also logged a Shopcore change to accept only two-letter codes in the address book, so a form can't store anything else. That's the longer-term fix.`,
		outcomes: ['fix', 'fix', 'change']
	},
	{
		key: 'address-signed-out',
		area: 'address book',
		via: 'partner',
		weight: 1,
		subjects: ['Error page on the address book', 'Address book 500s', 'Server error on /shopcore/addresses'],
		open: [
			`Our error tracker shows a steady trickle of 500s from /shopcore/addresses, a few dozen a day. Customers who are signed in seem fine. Is this a Shopcore bug?`,
			`We had a report that the "My addresses" link in our footer sometimes leads to an error page. I can reproduce it in a private window. The page works when I'm signed in.`
		],
		ask: [
			`Could you send me the full error and backtrace for one of these requests?`,
			`Can you paste one of the 500s from your logs, with the backtrace?`
		],
		need: 'the backtrace of one of the errors',
		give: `Here's one:`,
		art: (r, s) => arts.signinTrace!(r, s),
		find: `The address book expects a signed-in customer, because it lists the current customer's addresses. When nobody is signed in there's no current user, and it fails as you see. Shopcore leaves sign-in to the store, so the engine's routes need to sit behind your authentication.`,
		more: [[`Shouldn't Shopcore redirect to the sign-in page itself?`, `It can't know where your sign-in page is or how your authentication works. Most stores mount the engine inside an authenticated block in their routes.`]],
		quick: [`Does Shopcore handle sign-in?`, `No. It uses the store's current_user and expects the store to make sure there is one.`],
		fix: `put the engine's routes behind your sign-in, for example by mounting it inside your authenticated block in config/routes.rb, so signed-out visitors are sent to sign in first`,
		fixed: [`Moved the mount inside our authenticate block. Signed-out visitors now land on the sign-in page and the errors have stopped.`, `Done. The 500s are gone and the footer link takes people to sign in first.`],
		team: 'agency',
		handover: `The address book on {domain} is reachable signed out and fails without a current user. Passed to the store's agency to put the engine's routes behind sign-in.`,
		teamFix: `We've moved the engine's mount inside the store's authenticated routes. Signed-out visitors are redirected to sign in, and the errors stopped after the deploy.`,
		outcomes: ['fix', 'team']
	},
	{
		key: 'thousands',
		area: 'amounts and prices',
		via: 'partner',
		weight: 3,
		only: (store) => Boolean(store.b2b) || ['BW', 'BWU', 'OH', 'QC', 'MA', 'HR'].includes(store.prefix),
		subjects: ['Large order totals hard to read', 'Trade customer paid the wrong amount', 'Totals without commas'],
		open: [
			`One of our trade customers paid {wrongAmount} against an order of {rightAmount}. Their accounts team says they misread the total on the order email. Looking at it, I can see why: big amounts come out as one long string of digits. Can Shopcore format them properly?`,
			`Our larger customers keep asking us to confirm order totals by phone because they can't read them on the confirmation page. Anything over a thousand turns into a run of digits with no separators. It's making us look amateurish to people who spend a lot with us.`
		],
		ask: [
			`Could you send me an example: the order, its total in cents, and what the page or email shows?`,
			`Can you paste a console check of one large order's total, and the email it went out in if you have it?`
		],
		need: 'an example order with its total',
		give: `Here's one:`,
		art: (r, s) => (chance(r, 0.5) ? arts.moneyConsole!(r, s) : arts.invoice!(r, s)),
		find: `That's how Shopcore formats amounts at the moment: the units, a point and the cents, with no thousands separators. It's fine for most baskets and hard to read for trade orders like yours. Nothing is wrong in your store; it's Money.format.`,
		more: [[`Is it only emails, or everywhere Shopcore shows an amount?`, `Everywhere: product prices, order totals and the orders API all go through the same formatter.`]],
		quick: [`Does Money.format use thousands separators?`, `Not at the moment. Large amounts come out as one run of digits.`],
		work: `For the order emails and pages where big totals appear, you can format the amount in your own templates with Rails' number_to_currency on total_cents divided by 100, which does add separators. Leave the rest on Shopcore's format.`,
		accept: [`We've switched the order email and the account pages to number_to_currency. Our trade team is relieved.`, `OK, we've done it in our templates for now. It'll do until Shopcore formats them itself.`],
		change: 'thousands separators in formatted amounts',
		changeMsg: `It should have separators, and I've logged it against Shopcore with your example attached. It's a small change, so I'd expect it in an early release; I'll update here.`,
		team: 'partners',
		handover: `{store} had a trade customer underpay because a large total printed without separators. Shopcore change logged; asking partner success to talk to the store about the customer.`,
		teamFix: `I've spoken to {first}. The customer has paid the difference, and the store is formatting large totals in its own email template until Shopcore does it. Nothing more needed from us.`,
		outcomes: ['change', 'work', 'change', 'team']
	},
	{
		key: 'negative-refund-care',
		area: 'amounts and prices',
		via: 'care',
		weight: 2,
		subjects: ['Refund amount wrong', 'Was I refunded or charged?', 'Refund email shows the wrong figure'],
		open: [
			`I returned the {product} and your email says you refunded {shownRefund}. I paid {rightRefund} for it. Is the email wrong, or the refund? And why is there a minus sign in front of the number, does that mean you've taken money?`,
			`Your refund email for my return doesn't make sense. The amount doesn't match what I paid, and it has a minus in the middle of it. My bank hasn't shown anything yet so I can't check. Please explain what you've actually done.`
		],
		checked: `The payment provider shows the right refund, {rightRefund}, succeeded. So the money is right and the email is wrong. I've told the shopper the refund is correct, but I can't explain the figure in the email.`,
		ask: [
			`Thanks. Could you send me the email the shopper got and the provider's record of the refund?`,
			`Can you paste the refund email and the refund as the payment provider shows it?`
		],
		need: 'the refund email and the provider record',
		give: `Both here:`,
		art: (r, s) => arts.refundCare!(r, s),
		find: `The refund is right and the email is wrong, and it's Shopcore's formatter. It doesn't handle negative amounts: it rounds the units down and adds the cents back, so -{rightPlain} comes out as {shownRefund}. Every refund email built from a negative amount has the same problem.`,
		more: [[`How many refund emails have gone out like this?`, `Every partial refund since the email started using the shared formatter, which I think is September. Full refunds use a different template.`]],
		quick: [`Does Money.format handle negative amounts?`, `Not correctly at the moment: the figure comes out wrong, not just the sign.`],
		work: `Until the email is fixed, care can tell shoppers who ask that the refund itself is right and only the figure in the email is wrong. The payment provider's record in the admin shows the true amount, and it's what reaches their account.`,
		accept: [`Thanks, I've told the shopper and added a line to our saved replies.`, `OK, we'll use that line for anyone who asks until the email is fixed.`],
		change: 'negative amounts formatted correctly, with the minus sign first',
		changeMsg: `It's a Shopcore bug and I've logged it. The fix is small. Until it's released, refund emails will keep showing the wrong figure, so care may want a line ready for shoppers who ask.`,
		team: 'storefront',
		handover: `Refund emails on the storefronts show the wrong figure: Shopcore formats negative amounts wrongly. Asking the storefront team whether the refund email can format the positive amount with "refunded" wording.`,
		teamFix: `The refund email now formats the refunded amount as a positive number ("We've refunded {rightRefund}") instead of passing the negative one through. It's live for all three storefronts.`,
		teamNeed: 'a list of the refund emails care has had complaints about, so we can check them',
		outcomes: ['change', 'team', 'team', 'work']
	},
	{
		key: 'negative-credit-notes',
		area: 'amounts and prices',
		via: 'partner',
		weight: 2,
		subjects: ['Credit notes show wrong amounts', 'Accountant query about credit notes', 'Negative amounts look wrong'],
		open: [
			`Our accountant flagged that the credit notes on our site don't match the figures in our books. It's not just the sign being in an odd place: the numbers themselves are off. Positive amounts are all fine.`,
			`We're reconciling {lastMonth} and every credit note on the customer account pages is wrong by a little. Our bookkeeping export from the payment provider is right. The site shows something else.`
		],
		ask: [
			`Could you send me a few credit notes with the amount your books have and the amount the page shows?`,
			`Can you pick a handful of credit notes and paste both figures side by side?`
		],
		need: 'a few credit notes with both figures',
		give: `Here are the ones the accountant picked out:`,
		art: (r, s) => arts.creditNotes!(r, s),
		find: `It's Shopcore's formatter. It doesn't handle negative amounts: it rounds the units down and then adds the cents back as if the amount were positive, so a credit of 5.05 shows as -6.95, with the minus after the symbol. Your books are right; only the display is wrong.`,
		more: [[`Is the stored amount right?`, `Yes. The cents stored in your database are correct; it's only the text the formatter produces.`]],
		quick: [`Why does a negative amount show as "{sym}-6.95" for -505 cents?`, `Because Money.format doesn't handle negative amounts yet. It's a known bug.`],
		work: `Until it's fixed, format credit notes yourselves: take the absolute value, format it with Shopcore, and put the minus in front. That's one line in the credit note template.`,
		accept: [`Done, and the accountant has signed off {lastMonth}. Thanks for the clear explanation.`, `We've patched the template. Credit notes match the books again.`],
		change: 'negative amounts formatted correctly, with the minus sign first',
		changeMsg: `It's a Shopcore bug and I've logged it with your examples. I'll update here when there's a release with the fix.`,
		outcomes: ['change', 'work', 'work', 'quiet']
	},
	{
		key: 'unknown-currency',
		area: 'amounts and prices',
		via: 'partner',
		weight: 2,
		subjects: ['{newCur} prices crash the product page', 'Launching in a new market', 'Error after adding {newCur} prices'],
		open: [
			`We're opening to customers in {newMarket} and added {newCur} prices to a test product. Its page now throws a 500. The same product in {cur} is fine. Is {newCur} not supported?`,
			`Our {newMarket} launch is in three weeks and the first product we priced in {newCur} breaks the product page. I'd like to know whether this is going to be a quick fix or whether we need a plan B.`
		],
		ask: [
			`Could you send me the error and backtrace from the product page?`,
			`Can you paste the 500 from your logs, backtrace included?`
		],
		need: 'the backtrace from the product page',
		give: `Here it is:`,
		art: (r, s) => arts.currencyTrace!(r, s),
		find: `Shopcore's formatter only knows three currencies: US dollars, euros and pounds. Anything else raises "unknown currency", which is what you're seeing. Nothing is wrong with your product; {newCur} just isn't one of the three.`,
		more: [[`How hard would it be to add {newCur}?`, `Not hard for the symbol itself, but some currencies put the symbol after the amount, and we'd want to get that right for each one.`]],
		quick: [`Which currencies does Money.format support?`, `US dollars, euros and pounds. Anything else raises an error.`],
		work: `For the launch, either price {newMarket} in euros for now, which many stores do, or format {newCur} prices in your own view and leave Shopcore's price method for the three it knows.`,
		accept: [`We'll launch in euros and revisit. Not ideal, but it keeps the date.`, `We've written a small helper for {newCur} in our views. Product pages work again.`],
		change: '{newCur} in Money.format',
		changeMsg: `I've logged {newCur} as a Shopcore change with your launch date on it. I can't promise it lands before then, so it's worth having the plan B ready.`,
		team: 'partners',
		handover: `{store} wants {newCur} for a {newMarket} launch. Shopcore change logged. Asking partner success whether this affects the store's launch plans with us.`,
		teamFix: `I've talked it through with {first}. They're launching {newMarket} in euros and will switch once Shopcore supports {newCur}. Nothing more needed for now.`,
		outcomes: ['change', 'work', 'team', 'change']
	},
	{
		key: 'own-division',
		area: 'none',
		via: 'partner',
		weight: 2,
		subjects: ['Prices showing with one decimal', 'Prices look odd on the listing page', 'Product listing shows {sym}12.5'],
		open: [
			`On our category pages some prices show as "{sym}12.5" instead of "{sym}12.50", and round amounts show as "{sym}24.0". The product page itself is fine. Is Shopcore's price formatter doing something odd?`,
			`A customer pointed out that our listing pages show prices with one decimal place. It's only some products. I'd like to sort it before our autumn sale goes out.`
		],
		ask: [
			`Could you send me the part of your listing template that prints the price, and a few products with what each page shows?`,
			`Can you paste how the listing template outputs the price, and a couple of examples?`
		],
		need: 'the listing template and some examples',
		give: `Here's the template and a few examples:`,
		art: (r, s) => arts.ownDivision!(r, s),
		find: `The listing template doesn't use Shopcore's formatter: it divides price_cents by 100.0 itself and prints the float, which loses trailing zeros. The product page uses product.price, which is why it's right there.`,
		more: [[`Why would someone write it like that?`, `It was probably quicker at the time. It looks right for prices like 12.99, which is why nobody noticed.`]],
		quick: [`Is there a method that gives a product's formatted price?`, `Yes, product.price returns it as text, with the currency symbol.`],
		fix: `use product.price in the listing template instead of dividing price_cents yourselves`,
		fixed: [`Changed the tile to product.price and the listing looks right now. Thanks.`, `Fixed, deployed, and the sale emails went out with proper prices.`],
		team: 'agency',
		handover: `The listing template on {domain} prints price_cents / 100.0 instead of product.price. Passed to the store's agency.`,
		teamFix: `We've switched the listing tiles to product.price and checked the search results page, which had the same pattern. Both deployed.`,
		outcomes: ['fix', 'fix', 'team']
	},
	{
		key: 'rounding',
		area: 'none',
		via: 'partner',
		weight: 1,
		subjects: ['Order totals a penny out', 'Totals do not match the payment provider', 'Rounding differences on orders'],
		open: [
			`Our finance team found orders where the total on the site is a penny or two different from what the payment provider charged. It's a small number of orders, but it breaks our reconciliation every week. Is Shopcore rounding something?`,
			`Some of our orders don't reconcile: the provider charged a cent more or less than the order total. I've no idea which side is right.`
		],
		ask: [
			`Could you send me a few of the orders with both figures and how many lines each had?`,
			`Can you pull a few mismatched orders with the Shopcore total, the amount charged and the number of lines?`
		],
		need: 'a few mismatched orders',
		give: `Here are last week's:`,
		art: (r, s) => arts.rounding!(r, s),
		find: `Shopcore doesn't round anything: it stores the total in cents that your checkout gives it and formats it. The difference comes from the two sides calculating tax differently. Most often the store rounds VAT on each line and adds the lines up, while the amount sent to the provider is worked out from the order total. On orders with several lines the two can differ by a cent or two.`,
		more: [[`Which one is right?`, `Either can be, as long as you're consistent. Your accountant will have a preference; most UK stores round per line.`]],
		quick: [`Does Shopcore calculate tax?`, `No. It stores the totals the store gives it.`],
		fix: `calculate the amount you send the payment provider from the same per-line figures as the order total`,
		fixed: [`Our developer changed the payment call to use the order total. This week reconciles exactly.`, `Fixed on our side; no mismatches since.`],
		team: 'agency',
		handover: `{store}'s checkout sends the provider a total calculated differently from the order's. Passed to the store's agency.`,
		teamFix: `We've changed the checkout to send the provider the order's own total. No mismatches in the orders since the deploy.`,
		outcomes: ['fix', 'team', 'quiet']
	},
	{
		key: 'api-staff-lookup',
		area: 'orders',
		via: 'partner',
		weight: 2,
		subjects: ['Orders API returns 404 for real orders', 'Cannot look up customer orders', 'Order lookup not found'],
		open: [
			`Our customer service tool looks up orders through /shopcore/api/orders/:number, and it returns 404 for orders that definitely exist. I can see them in the database. It worked when we tested it with our own orders.`,
			`We built a small order lookup for our customer service staff on top of the orders API, and it says "not found" for almost every order they search for. Has the API changed?`
		],
		ask: [
			`Could you send me the log for one lookup that returned 404?`,
			`Can you paste the request log for one of the failed lookups?`
		],
		need: 'the log of one failed lookup',
		give: `Here's one from this morning:`,
		art: (r, s) => arts.api404!(r, s),
		find: `The orders API is the shopper's own view: it only finds orders that belong to the signed-in user, so it can't find a customer's order when one of your staff is signed in. That's why it worked with your own orders when you tested it. It hasn't changed; it was built that way so shoppers can only see their own orders.`,
		more: [[`Could there be a staff mode on the API?`, `I'd rather not add one to an endpoint that's open to shoppers. Staff tools are much safer built inside your admin, behind your own staff sign-in.`]],
		quick: [`Can the orders API return orders of other users?`, `No. It only returns orders that belong to the signed-in user.`],
		fix: `build the staff lookup on Shopcore::Order directly in your admin, behind your staff sign-in, instead of calling the shopper-facing API`,
		fixed: [`Rebuilt it in the admin on Shopcore::Order and it finds everything now.`, `Done. Our staff use the admin lookup and it works for every order.`],
		work: `If you need something today, your staff can look orders up in a Rails console or your database tool by number, until the admin page is built.`,
		accept: [`OK, we'll use the console for now and build the admin page next sprint.`, `Fine. Our team lead does lookups for the others until we've built it properly.`],
		outcomes: ['fix', 'work', 'fix']
	},
	{
		key: 'api-total-text',
		area: 'orders',
		via: 'partner',
		weight: 2,
		only: v34,
		subjects: ['App crashes on the order screen', 'Orders API total is a string', 'Order totals in our app'],
		open: [
			`Our new mobile app crashes when a customer opens an order. The developer says the orders API sends the total as text, and the app expects a number. Is that intentional?`,
			`We're building a mobile app on the orders API and the order screen fails to load. It seems to choke on the total. Can you confirm what type it is?`
		],
		ask: [
			`Could you send me a response from the API and the app's error?`,
			`Can you paste one order's JSON as the app receives it, and the crash report?`
		],
		need: "an API response and the app's error",
		give: `Here they are:`,
		art: (r, s) => arts.apiText!(r, s),
		find: `It is intentional: the API returns the total as formatted text, with the currency symbol, ready to show to the shopper. It doesn't give the amount as a number or the currency separately. So the app needs to treat it as text.`,
		more: [[`Can we get the amount in cents from the API too?`, `Not today. It's a reasonable ask for anyone building an app or reporting on the API, and I'll pass it on.`]],
		quick: [`What type is the total in the orders API?`, `Text: the amount formatted with its currency symbol.`],
		work: `For now, have the app show the total as the text it receives, which is what it's meant for. If you need the number for calculations, take it from your own backend rather than parsing the text.`,
		accept: [`The app shows the text now and doesn't crash. We'll do the maths on our backend.`, `OK, we've changed the model to a string. Works fine for display.`],
		change: 'the orders API to return the total in cents and the currency next to the formatted text',
		changeMsg: `I've logged a Shopcore change to add the amount in cents and the currency to the orders API, alongside the text total, with your case attached.`,
		outcomes: ['work', 'change', 'work']
	},
	{
		key: 'stuck-in-cart',
		area: 'none',
		via: 'partner',
		weight: 2,
		subjects: ['Paid orders stuck in cart', 'Customers charged but no order', 'Orders not moving to placed'],
		open: [
			`Since {weekday}, some customers are charged but their order stays as a cart in their account and never reaches us as placed. Customers are emailing to ask where their order is. Has something changed in Shopcore?`,
			`We've got paid orders that Shopcore still thinks are carts. Customers see the money gone from their account and nothing in their order history. Today it's {n1} of them.`
		],
		ask: [
			`Could you send me the payment provider's webhook deliveries for the affected orders?`,
			`Can you check the webhook delivery log in your payment provider's dashboard and paste the recent ones?`
		],
		need: "the payment provider's webhook deliveries",
		give: `Here's the delivery log from the provider's dashboard:`,
		art: (r, s) => arts.webhooks!(r, s),
		find: `The payment provider's webhooks to your store are failing, so your store never hears that the payment went through and never places the order. Shopcore only moves an order on when your code calls place!, which happens in your webhook handler. The 401s say the signature check fails: usually a webhook secret that was rotated in the dashboard but not in your store's configuration.`,
		more: [[`Can we replay the failed ones?`, `Yes, the provider's dashboard lets you resend a webhook. Once the secret is right, resending them will place those orders.`]],
		quick: [`When does an order move from cart to placed?`, `When the store calls place! on it, usually after payment is confirmed.`],
		fix: `update the webhook signing secret in your store's configuration to match the provider's dashboard, then resend the failed webhooks`,
		fixed: [`Someone had rotated the secret during a security review. Updated it, resent the failed webhooks, and all {n1} orders are placed now.`, `That was it. The secret is fixed and the stuck orders went through after the resend.`],
		team: 'agency',
		handover: `Payment webhooks to {domain} fail with signature mismatch, so orders stay in cart. Passed to the store's agency, who manage the store's configuration.`,
		teamFix: `We've updated the webhook secret, which was rotated during a security review, and resent the failed deliveries. All affected orders are placed now.`,
		teamNeed: 'access to the payment provider dashboard',
		outcomes: ['fix', 'team', 'team', 'quiet']
	},
	{
		key: 'paid-case',
		area: 'orders',
		via: 'partner',
		weight: 1,
		subjects: ['Validation error when marking orders paid', 'Payment webhook failing with 422', 'State is not included in the list'],
		open: [
			`Our payment webhook handler started failing after our developer refactored it. Every call errors with "State is not included in the list". Orders stay placed and never move to paid.`,
			`We get a validation error whenever our code tries to mark an order as paid. I've checked that "paid" is one of Shopcore's states. What else could it be?`
		],
		ask: [
			`Could you send me the error from your logs and the line that sets the state?`,
			`Can you paste the full error and the code that updates the order?`
		],
		need: 'the error and the code that sets the state',
		give: `Here's the log and the line:`,
		art: (r, s) => arts.paidCase!(r, s),
		find: `The states are case-sensitive. Shopcore's order states are all lower case, and your handler sets "{badState}", which isn't one of them, so the validation refuses it.`,
		more: [[`Is there a method we should call instead of setting the state?`, `For placing there's place!, for cancelling there's cancel!. For paid there's no method yet, so setting state to "paid" is the way.`]],
		quick: [`Which states can a Shopcore order have?`, `cart, placed, paid, shipped and cancelled, all lower case.`],
		fix: `set the state to "paid" in lower case in your webhook handler, then resend the failed webhooks from the provider`,
		fixed: [`Fixed the case and resent the webhooks. All paid now. Embarrassing, but thanks.`, `That was it. Our developer fixed it and the orders moved to paid.`],
		outcomes: ['fix', 'fix']
	},
	{
		key: 'cancel-shipped',
		area: 'orders',
		via: 'partner',
		weight: 2,
		subjects: ['Customers cancelling orders after dispatch', 'Cancel button on shipped orders', 'Refunds for orders already sent'],
		open: [
			`Customers can cancel orders that have already shipped. Our account page shows a cancel button, it calls Shopcore's cancel!, and it works whatever state the order is in. We've refunded {n1} orders this month for goods that were already on their way.`,
			`We've had a run of customers cancelling after we've sent the parcel and then keeping it. Our refund process is automatic on cancel. Is Shopcore supposed to allow cancelling a shipped order?`
		],
		ask: [
			`Could you send me the affected orders with when they shipped and when they were cancelled?`,
			`Can you list a few of these orders with the shipping and cancellation times?`
		],
		need: 'the affected orders with their times',
		give: `Here they are:`,
		art: (r, s) => arts.cancelShipped!(r, s),
		find: `Shopcore's cancel! sets the order to cancelled whatever state it's in; it doesn't check whether it has shipped. So your cancel button works on shipped orders because nothing stops it.`,
		more: [[`Is that deliberate?`, `I don't think so. There's a reason to cancel a paid order before it ships, but not one that's already shipped.`]],
		quick: [`Can cancel! be called on a shipped order?`, `At the moment, yes. It doesn't check the state.`],
		work: `For now, only show the cancel button for orders that are placed or paid, and check the state in your controller before calling cancel!. That closes it from your side.`,
		accept: [`Done: the button only shows for placed and paid orders, and the controller checks too.`, `We've added the check in our controller. No more late cancellations.`],
		change: 'Order#cancel! to refuse orders that have already shipped',
		changeMsg: `I've logged it as a Shopcore change: cancel! should refuse a shipped order. I'll update this ticket when it's released.`,
		outcomes: ['change', 'work', 'work']
	},
	{
		key: 'open-scope',
		area: 'orders',
		via: 'partner',
		weight: 1,
		subjects: ['Open orders count looks wrong', 'Dashboard shows thousands of open orders', 'Open orders report'],
		open: [
			`Our ops dashboard says we have nearly {n3} open orders. We ship within two days, so we should have a hundred or so. The dashboard uses Shopcore's open scope.`,
			`Our warehouse team uses Order.open for their daily list, and it's full of orders nobody has paid for. Is the scope broken?`
		],
		ask: [
			`Could you send me a count of the open scope grouped by state?`,
			`Can you run Order.open grouped by state in a console and paste it?`
		],
		need: 'a count of open orders by state',
		give: `Here you go:`,
		art: (r, s) => arts.openScope!(r, s),
		find: `The open scope includes carts as well as placed and paid orders, and most of your "open orders" are abandoned carts. It isn't broken, but it means "not finished" rather than "waiting to ship".`,
		more: [[`Why would carts count as open?`, `For shopper-facing pages: a cart is something the shopper hasn't finished. It's less useful for a warehouse list.`]],
		quick: [`Does Order.open include carts?`, `Yes: carts, placed and paid orders.`],
		work: `For the warehouse list, use orders whose state is placed or paid instead of the open scope. It's one line in your dashboard query.`,
		accept: [`Changed the dashboard and the number makes sense now.`, `Done. The warehouse list is down to what actually needs shipping.`],
		change: 'a scope for orders waiting to ship, without carts',
		changeMsg: `I've logged a Shopcore change for a scope of orders waiting to ship, since you're not the first to read open that way.`,
		outcomes: ['work', 'work', 'change']
	},
	{
		key: 'status-not-shipped',
		area: 'none',
		via: 'care',
		weight: 2,
		subjects: ['Order still says paid after delivery', 'My order page is wrong', 'Order status not updating'],
		open: [
			`My parcel arrived on {weekday} but your website still says the order is paid, not shipped. I want to return one item and the returns page says I can't until the order has shipped.`,
			`My order {order} came days ago and the account page still says it hasn't shipped. I'm trying to leave a review and it won't let me. Can you update it?`
		],
		checked: `The carrier says delivered. Our order history says paid, and nothing after it. Care can't change the state from the admin.`,
		ask: [
			`Could you send me the order's history and the carrier's tracking events?`,
			`Can you paste the order history from the admin next to the tracking?`
		],
		need: 'the order history and tracking',
		give: `Here's both:`,
		art: (r, s) => arts.statusTimeline!(r, s),
		find: `The order never got a shipped update. On the storefronts, an order is marked shipped when the warehouse system tells the storefront that the parcel has left, and for this order that message never arrived. So it's the warehouse integration rather than Shopcore.`,
		more: [[`Is it just this order?`, `I'll ask fulfilment, but I'd expect a batch: when one message goes missing, it's usually a whole run of them.`]],
		quick: [`Who marks an order as shipped on the storefronts?`, `The warehouse system, through the storefront's integration. Shopcore just stores the state.`],
		team: 'fulfilment',
		handover: `{order} delivered by {carrier} but still paid in the storefront; no shipped update arrived from the warehouse system. Can fulfilment check the integration and resend?`,
		teamFix: `A batch of shipped messages failed on {weekday} when the integration's queue backed up. We've resent them, and {order} and {n2} other orders are shipped now.`,
		teamNeed: 'any other order numbers care has had this for',
		outcomes: ['team', 'team', 'team']
	},
	{
		key: 'sku-duplicate',
		area: 'products',
		via: 'partner',
		weight: 2,
		subjects: ['Product import failing', 'Sku has already been taken', 'Import errors on the new range'],
		open: [
			`We're importing the new season's range from our supplier's sheet and a chunk of rows fail with "Sku has already been taken". The products don't exist yet, so I don't see how the SKU can be taken.`,
			`Our import fails for {n2} of the supplier's products. All the same error, about the SKU being taken. We tried a test import last week, could something be left over from that?`,
		],
		ask: [
			`Could you send me a few rows that fail and the import's error output?`,
			`Can you paste the failing rows and what the import says about them?`
		],
		need: 'a few failing rows and the errors',
		give: `Here are the first few rows and the output:`,
		art: (r, s) => arts.skuDup!(r, s),
		find: `The supplier's sheet uses one SKU for more than one product: the variants share their parent's SKU. Shopcore needs every product to have its own SKU, so the first row imports and the later ones with the same SKU fail.`,
		more: [[`Our supplier says variants share a SKU in their system.`, `That's common for suppliers. Your store needs its own SKU for each variant, even if you keep the supplier's code alongside it.`]],
		quick: [`Do SKUs have to be unique?`, `Yes, every product needs its own.`],
		fix: `give each variant its own SKU before importing, for example by adding the size or colour to the supplier's code`,
		fixed: [`We added a suffix for each variant and the whole sheet imported.`, `Done, the range is in. Thanks.`],
		outcomes: ['fix', 'fix', 'quiet']
	},
	{
		key: 'price-tiny',
		area: 'products',
		via: 'partner',
		weight: 1,
		subjects: ['Imported prices far too low', 'Products priced at pennies', 'Prices wrong after import'],
		open: [
			`After yesterday's import, every product shows a price of a few pence. A {product} for {sym}0.{lowCents}! Luckily we noticed before any orders came in. The sheet has the right prices.`,
			`Our new range went live with prices a hundred times too small. We've taken the category offline for now. What did we do wrong?`
		],
		ask: [
			`Could you send me a few rows of the sheet and one product as it's stored?`,
			`Can you paste some rows from the import sheet and check one imported product in a console?`
		],
		need: 'some rows of the sheet and one stored product',
		give: `Here they are:`,
		art: (r, s) => arts.priceTiny!(r, s),
		find: `The sheet has prices in {cur} units, like 12.50, and they went into price_cents, which holds whole cents or pence. The import turned 12.50 into 12. So every price is a hundredth of what it should be.`,
		quick: [`What unit does price_cents use?`, `Whole cents (or pence): 1250 for 12.50.`],
		fix: `multiply the prices by 100 when importing, or put a price_cents heading in the sheet with the amounts in cents, and run the import again for the range`,
		fixed: [`Re-ran it with the prices in cents. Range is live again with the right prices.`, `Fixed and re-imported. Thanks for the fast answer.`],
		outcomes: ['fix', 'fix']
	},
	{
		key: 'currency-default',
		area: 'products',
		via: 'partner',
		weight: 2,
		only: notUS,
		subjects: ['Dollar signs on our prices', 'Some products show the wrong currency', 'Prices in US dollars'],
		open: [
			`Some of our products show prices with a dollar sign. We only sell in {cur}. It seems to be the products that came over from our product information system this autumn.`,
			`Customers are asking whether we've started charging in dollars. Some product pages show "$" in front of the price. The amounts are right, just the symbol is wrong.`
		],
		ask: [
			`Could you check the currency on one affected product and send me a count of products by currency?`,
			`Can you paste one affected product's currency and a count by currency?`
		],
		need: 'a count of products by currency',
		give: `Here's the console output:`,
		art: (r, s) => arts.currencyDefault!(r, s),
		find: `Products that are created without a currency get US dollars, because that's Shopcore's default for products. Your product sync creates products without setting the currency, so every product it creates is in dollars.`,
		more: [[`Is there a store-wide setting for the default currency?`, `Not yet; the default is fixed at US dollars.`]],
		quick: [`What currency does a product get if none is set?`, `US dollars.`],
		fix: `set the currency in your product sync, and update the existing products the sync created to {cur}`,
		fixed: [`Sync fixed and {n2} products updated to {cur}. All the right symbol now.`, `Done. The sync sends the currency and we've corrected the rest.`],
		change: 'a store-wide default currency for new products',
		changeMsg: `I've also logged a Shopcore change for a default currency per store, so a sync that forgets the currency gets the store's own.`,
		outcomes: ['fix', 'fix', 'change']
	},
	{
		key: 'sku-required',
		area: 'products',
		via: 'partner',
		weight: 1,
		subjects: ['Cannot create gift sets', 'Sku can\'t be blank', 'Bundles without SKUs'],
		open: [
			`We want to sell gift sets made up of products we already stock, and samples that we don't track in the warehouse. Neither has a SKU, and Shopcore won't save them. Is there a way round it?`,
			`Our admin won't save a bundle product because "Sku can't be blank". Bundles don't have a SKU in our warehouse system.`
		],
		ask: [
			`Could you send me the error and what you're submitting?`,
			`Can you paste the error with the parameters your admin sends?`
		],
		need: 'the error and the parameters',
		give: `Here it is:`,
		art: (r, s) => arts.skuBlank!(r, s),
		find: `Shopcore requires every product to have a SKU, and a unique one. A bundle or a sample is still a product to Shopcore, so it needs one, even if your warehouse never sees it.`,
		quick: [`Can a product be saved without a SKU?`, `No, every product needs a unique SKU.`],
		work: `Give bundles and samples SKUs of their own that your warehouse will never use, for example {prefix}-SET-001 and {prefix}-SAMPLE-001. Many stores do this.`,
		accept: [`OK, we've added a SET- range for bundles. Works.`, `Fine, we'll use our own codes for them.`],
		change: 'products without a SKU, for bundles and samples',
		changeMsg: `I've logged it as a Shopcore change, but I'd go with the codes for now.`,
		outcomes: ['work', 'work', 'change']
	},
	{
		key: 'promo-code',
		area: 'none',
		via: 'care',
		weight: 2,
		subjects: ['Discount code not working', 'Promo code rejected at checkout', 'Code from your email does not work'],
		open: [
			`The code {code} from your email isn't working. It says it isn't valid for items already on sale, but the email didn't say anything about that. I've got {n1} things in my basket.`,
			`Your checkout won't accept my discount code. I've typed it carefully several times. Can you apply it for me or tell me why it doesn't work?`
		],
		checked: `The shopper's basket has a mix of sale and full-price items. The email didn't mention sale items. Care can't apply codes manually.`,
		ask: [
			`Could you send me the basket and the message the shopper sees?`,
			`Can you paste what the basket shows when the code is entered?`
		],
		need: 'the basket and the message',
		give: `Here's the basket:`,
		art: (r, s) => arts.promo!(r, s),
		find: `Codes and offers on the storefronts are the storefront team's promotions, not Shopcore; Shopcore never sees the code. The message comes from the promotion's rules, so the question is whether this code should exclude sale items.`,
		quick: [`Does Shopcore handle discount codes?`, `No, codes and offers are the storefront's own.`],
		team: 'storefront',
		handover: `{code} rejected for a shopper with sale items in the basket; the email didn't mention the exclusion. Promotions are the storefront team's. Can you check the code's rules?`,
		teamFix: `The code was set up to exclude sale items, which the email should have said. We've changed it to apply to full-price items in a mixed basket, and the shopper's order went through with the discount.`,
		teamNeed: 'the email campaign the shopper got the code from',
		outcomes: ['team', 'team']
	},
	{
		key: 'nil-label',
		area: 'none',
		via: 'partner',
		weight: 1,
		only: v34,
		subjects: ['Confirmation page error', 'Error after checkout for collection orders', 'undefined method label_lines'],
		open: [
			`Some customers get an error page right after paying, instead of the confirmation. The order goes through fine. It seems to be the click-and-collect orders.`,
			`We see "undefined method label_lines for nil" in our error tracker since we added collection in store. Is the label helper broken?`
		],
		ask: [
			`Could you send me the error with the template line it points at?`,
			`Can you paste one of the errors, backtrace and all?`
		],
		need: 'the error with its backtrace',
		give: `Here's one:`,
		art: (r, s) => arts.nilLabel!(r, s),
		find: `The error comes from your confirmation template, which asks the order's shipping address for its label lines. Collection orders have no shipping address, so there's nothing to ask. The label helper is fine; the template needs to handle orders without an address.`,
		quick: [`Does every order need a shipping address?`, `Not in Shopcore. Orders don't require one.`],
		fix: `show the delivery address in the confirmation template only when the order has one, and the collection details otherwise`,
		fixed: [`Wrapped it in a check. Collection orders get their confirmation page now.`, `Fixed and deployed. No more errors.`],
		team: 'agency',
		handover: `The confirmation template on {domain} calls label_lines on a nil address for collection orders. Passed to the store's agency.`,
		teamFix: `We've changed the confirmation page to show the collection details for collection orders. Deployed this afternoon.`,
		outcomes: ['fix', 'team']
	},
	{
		key: 'dispatch-email-address',
		area: 'none',
		via: 'care',
		weight: 1,
		subjects: ['Dispatch email shows the wrong address', 'Which address is my parcel going to?', 'Worried my order is going to work'],
		open: [
			`I chose home delivery but the dispatch email says the parcel is going to my work address. Which is it? I'm not at work this week.`,
			`Your email says my order is going to an address I didn't choose. Please make sure it comes to the address I selected.`
		],
		checked: `The order in the admin has the home address, as the shopper chose. The email has another of the shopper's saved addresses.`,
		ask: [
			`Could you send me the email and the address on the order?`,
			`Can you paste the dispatch email with the address on the order?`
		],
		need: 'the email and the order address',
		give: `Here's the email:`,
		art: (r, s) => arts.dispatchEmail!(r, s),
		find: `The parcel goes to the order's address, which is right. The dispatch email is the storefront's, and it takes the first address in the shopper's address book instead of the address on the order. So the email is wrong, not the delivery.`,
		quick: [`Does the dispatch email come from Shopcore?`, `No, the storefront sends it.`],
		team: 'storefront',
		handover: `The dispatch email for {order} shows the first saved address, not the order's. Can the storefront team point the email at the order's address?`,
		teamFix: `The dispatch email now uses the order's delivery address. Fixed and deployed; we've checked it against today's orders.`,
		work: `Until the email is changed, care can reassure shoppers who ask: the parcel goes to the address on the order, which care can see in the admin, whatever the email says.`,
		accept: [`Thanks, I've told the shopper and added a line to our saved replies.`, `OK. The shopper is happy now that we've confirmed the address.`],
		outcomes: ['team', 'team', 'work']
	}
];
for (const topic of topics)
	for (const outcome of topic.outcomes) {
		const needs = { fix: [topic.fix, topic.fixed], work: [topic.work, topic.accept], change: [topic.change, topic.changeMsg], team: [topic.team, topic.handover, topic.teamFix], quiet: [] }[outcome];
		if (needs.some((field) => !field)) throw new Error(`topic ${topic.key} lacks the text for ${outcome}`);
	}

// ---------------------------------------------------------------------------------------------------------
// The words around the matters.
const countryNames: Record<Cc, string> = { GB: 'United Kingdom', IE: 'Ireland', US: 'United States', NL: 'Netherlands', FR: 'France', DE: 'Germany', NO: 'Norway' };
const longLines: Record<Cc, string[]> = {
	GB: ['Unit 14, Riverside Industrial Estate, Bridge Road', 'The Old Granary, Lower Farm Business Park', 'Flat 22, Marlborough Court, 118 Kensington Road', 'Llwyn Celyn, Heol y Fferm, Pentrefelin'],
	IE: ['Unit 7, Ballincollig Business Park, Link Road', 'The Coach House, Ardnacrusha Lower, Castleconnell'],
	US: ['1450 Northwest Industrial Parkway Building C', '3200 Old Settlers Boulevard, Ridgeview Commons'],
	NL: ['Bedrijventerrein De Hoek, Kruisweg 801-805 Unit 12', 'Wilhelminakade 9, Hotel New York, Kantoor 4'],
	FR: ['Résidence Les Jardins du Parc, 14 avenue du Général Leclerc', 'Zone Artisanale des Grandes Terres, 7 rue Ampère'],
	DE: ['Gewerbepark Nord, Halle 3, Industriestraße 112', 'Hinterhof links, Gebäude B, Bahrenfelder Chaussee 49'],
	NO: ['Kjøpmannsgaten 34, Bakgården, inngang C', 'Sandviksboder 18, Næringsbygg 2, 3. etasje']
};
const accented: Record<Cc, string[]> = {
	GB: ['Zoë Brontë-Hall', 'Dafydd Siôn Rhys', 'Chloë Ní Dhuibhir', 'Renée Ashcroft'],
	IE: ['Siobhán Ó Ceallaigh', 'Seán Ó Briain', 'Órla Ní Mhaoláin', 'Pádraig Mac Aodha'],
	US: ['José Peña', 'Zoë Martínez', 'Inés Muñoz'],
	NL: ['Anaïs van Dijk', 'Joël Brüning', 'Daniël Ruijs'],
	FR: ['Hélène Lefèvre', 'François Dupré', 'Gaëlle Bénard'],
	DE: ['Jürgen Müller', 'Björn Weiß', 'Käthe Großmann'],
	NO: ['Bjørn Sæther', 'Åse Løvås', 'Sølvi Hågensen']
};
const printers = ['Zebra ZD421', 'Brother QL-1110', 'Rollo X1040', 'Zebra GK420d', 'TSC DA210', 'Dymo 5XL'];
const markets: [string, string][] = [['CHF', 'Switzerland'], ['SEK', 'Sweden'], ['DKK', 'Denmark'], ['PLN', 'Poland'], ['CAD', 'Canada'], ['NOK', 'Norway']];
const abroad = [
	['Hong Kong', 'HK', 'Flat 12B, Tower 3, Harbour View Gardens', '28 Tai Hang Road', 'Causeway Bay'],
	['the United Arab Emirates', 'AE', 'Villa 14, Street 23', 'Al Barsha 2', 'Dubai'],
	['Qatar', 'QA', 'Building 41, Street 870', 'Zone 66', 'Doha'],
	['Panama', 'PA', 'Edificio Mar Azul, Apto 9C', 'Calle 50', 'Panama City']
] as const;
/** For some matters the reporter lists the orders affected: an intro, the last heading, its values. */
const affectedBy: Record<string, [string, string, string]> = {
	'label-second-line-partner': ['The returns so far:', 'What happened', 'Returned to us|Returned to us|Redelivered after a phone call|Still with the carrier'],
	'form-second-line': ['The returns so far:', 'What happened', 'Returned to us|Returned to us|Customer collected from the depot'],
	'label-country-case': ["Yesterday's failed bookings:", 'Booking', 'Rejected|Rejected|Re-keyed by hand'],
	'label-long-lines': ['The ones we know about:', 'What happened', 'Delayed two days|Sent to the wrong depot|Delivered'],
	'label-us-order': ['The ones our fulfillment partner flagged:', 'Status', 'Manual sort|Manual sort|Delivered a day late'],
	'stuck-in-cart': ['The customers who have written in so far:', 'Shows as', 'cart'],
	'thousands': ['The orders that were queried:', 'Queried by', 'their accounts team|phone|email'],
	'paid-case': ['Orders stuck since the change:', 'State', 'placed'],
	'api-staff-lookup': ['Lookups that failed this morning:', 'Lookup', '404 Not Found'],
	'nil-label': ['Errors from yesterday:', 'Delivery', 'Click and collect']
};
const localNames: Partial<Record<Cc, [string[], string[], string[]]>> = {
	FR: [['Camille', 'Léa', 'Manon', 'Inès'], ['Julien', 'Thomas', 'Antoine', 'Hugo'], ['Martin', 'Bernard', 'Moreau', 'Laurent', 'Girard', 'Fontaine', 'Rousseau']],
	DE: [['Lena', 'Anna', 'Katrin', 'Miriam'], ['Jonas', 'Felix', 'Tobias', 'Lukas'], ['Schmidt', 'Becker', 'Hoffmann', 'Wagner', 'Krüger', 'Neumann', 'Vogel']],
	NL: [['Sanne', 'Lotte', 'Femke', 'Noor'], ['Daan', 'Bram', 'Thijs', 'Ruben'], ['de Jong', 'Visser', 'van den Berg', 'Smit', 'Mulder', 'Bos', 'Vermeulen']],
	NO: [['Ingrid', 'Kari', 'Silje', 'Marte'], ['Håkon', 'Eirik', 'Sindre', 'Ola'], ['Hansen', 'Johansen', 'Berg', 'Haugen', 'Dahl', 'Lie', 'Strand']],
	IE: [['Aoife', 'Niamh', 'Ciara', 'Sinéad'], ['Cian', 'Oisín', 'Darragh', 'Eoin'], ['Murphy', 'Kelly', "O'Sullivan", 'Byrne', 'Ryan', 'Walsh', 'McCarthy']]
};
const agencyPeople: Record<string, string> = { 'Fieldnote Digital': 'Nadia Quirke', 'Kiln Studio': 'Ben Arkwright', 'Overcast Labs': 'Pim Jansen' };
const rubyTime = (at: number) => {
	const d = utc(at);
	return `${WD[d.getUTCDay()]}, ${pad(d.getUTCDate())} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}.${String(d.getUTCMilliseconds()).padStart(3, '0')}000000 UTC +00:00`;
};

/** The facts of one matter: a shopper, an address, an order, amounts. A side matter gets a fresh set. */
const matterSlots = (r: Rand, store: Store, open: number): Slots => {
	const local = localNames[store.cc];
	const female = chance(r, 0.55);
	const sfirst = local && chance(r, 0.75) ? pick(r, local[female ? 0 : 1]) : pick(r, female ? firstF : firstM);
	const sfull = `${sfirst} ${local && chance(r, 0.75) ? pick(r, local[2]) : pick(r, surnames)}`;
	const [city, postcode] = pick(r, towns[store.cc]);
	const line1 = streets[store.cc](r);
	const line2 = seconds[store.cc](r);
	const orderNo = store.own ? int(r, 100000, 399999) : int(r, 20000, 69999);
	const refundCents = int(r, 1, 90) * 100 + int(r, 5, 95);
	const bigCents = store.b2b ? int(r, 1200000, 9800000) : int(r, 110000, 950000);
	const tinyCents = int(r, 4, 89);
	const placed = open - int(r, 1, 9) * DAY - int(r, 1, 600) * MIN;
	const logAt = open - int(r, 1, 40) * HOUR - int(r, 1, 3500) * 1000;
	const [nick1, nick3] = [pick(r, ['Allotment', 'Aunt Jo', 'Brother Sam', 'Gran', 'Dad', 'Cottage', 'Beach hut']), pick(r, ['Work', 'Office', 'Studio', 'Parents', 'Sister'])];
	const foreign = pick(r, abroad);
	const market = store.cc === 'NO' ? markets[5]! : store.cc === 'US' ? markets[4]! : pick(r, markets.slice(0, 4));
	return {
		sfirst,
		sfull,
		she: female ? 'she' : 'he',
		She: female ? 'She' : 'He',
		her: female ? 'her' : 'his',
		hers: female ? 'hers' : 'his',
		line1,
		line2,
		city,
		postcode,
		oneLine: `${line2}, ${line1}, ${city} ${postcode}`,
		workLine: streets[store.cc](r),
		order: `${store.prefix}-${orderNo}`,
		orderNo: String(orderNo),
		product: pick(r, store.goods),
		totalCents: String(int(r, 1800, 42000)),
		bigCents: String(bigCents),
		rightAmount: plain(bigCents, store.cur),
		wrongAmount: plain(Math.round(bigCents / 1000) * 100, store.cur),
		refundCents: String(refundCents),
		shownRefund: shop(-refundCents, store.cur),
		rightRefund: plain(refundCents, store.cur),
		rightPlain: plain(refundCents, store.cur),
		priceCents: String(int(r, 4, 300) * 100 + pick(r, [0, 50, 95, 99])),
		tinyCents: String(tinyCents),
		lowCents: pad(tinyCents),
		sku: `${store.prefix}-${int(r, 1000, 9999)}`,
		skuBase: String(int(r, 1000, 9999)),
		slug: pick(r, store.goods).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
		placedStamp: stamp(placed),
		paidStamp: stamp(placed + int(r, 1, 20) * MIN),
		collected: stamp(placed + int(r, 18, 40) * HOUR),
		outFor: stamp(placed + int(r, 41, 60) * HOUR),
		delivered: stamp(placed + int(r, 61, 66) * HOUR),
		placedIso: iso(placed),
		refundStamp: stamp(open - int(r, 1, 3) * DAY - int(r, 1, 500) * MIN),
		printed: `${dayMonth(open - int(r, 3, 8) * DAY)} ${pad(int(r, 7, 11))}:${pad(int(r, 0, 59))}`,
		logMs: String(logAt),
		logTime: logTime(logAt),
		nick1,
		nick2: 'Home',
		nick3,
		accented: pick(r, accented[store.cc]),
		longLine: pick(r, longLines[store.cc]),
		foreignName: foreign[0],
		foreignCc: foreign[1],
		foreignLine1: foreign[2],
		foreignLine2: foreign[3],
		foreignCity: foreign[4],
		newCur: market[0],
		newMarket: market[1],
		code: pick(r, ['AUTUMN15', 'WELCOME10', 'GARDEN20', 'COSY25', 'FRIENDS15', 'HOMEWEEK']),
		syncStart: rubyTime(open - int(r, 20, 70) * DAY - int(r, 1, 900) * MIN),
		staffId: String(int(r, 2, 40)),
		badState: pick(r, ['Paid', 'PAID', 'Paid']),
		status: 'shipped'
	};
};

const greetFirst = ['Hi,', 'Hello,', 'Hi desk,', 'Hello platform team,', 'Hi all,', ''];
const greetLater = ['Hi {agent},', '{agent},', '', 'Hi again,', 'Hello {agent},', 'Thanks {agent}.'];
const repSign = ['Thanks,\n{first}', 'Cheers,\n{first}', '{first}', 'Best,\n{full}\n{title}, {store}', 'Thanks,\n{full}', '', 'Kind regards,\n{first}'];
const careGreet = ['Hi desk,', 'Hi {agent},', 'Hello,', ''];
const careSign = ['{first}', 'Thanks, {first}', '{first}\nCustomer care', 'Thanks,\n{first} (care)'];
const deskGreetFirst = ['Hi {first},', 'Hello {first},', 'Hi {first}, thanks for raising this.', 'Thanks {first}.'];
const deskGreet = ['Hi {first},', 'Thanks {first}.', 'Hello again {first},', '{first},', 'Hi {first},', ''];
const deskSign = ['{agent}', 'Thanks,\n{agent}', 'Best,\n{agentFull}\nBrambleway platform desk', 'Cheers,\n{agent}', '{agent}, platform desk'];
const fixLeads = ["To sort it, you'll need to", "The fix is on your side: you'll need to", "So you'll need to", "What you'll need to do is", 'The way out is to'];
const closers = ["Great, thanks for confirming. I'll close this one.", 'Good to hear. Closing the ticket; reply here if it comes back.', 'Thanks for letting me know.', "Glad that's sorted.", 'Perfect. Shout if anything else comes up.'];
const sideLeads = ['Something else while I have you.', 'Separately, another thing.', 'A different question.', 'Also, unrelated.', 'While I have you, one more thing.', 'Another one for you, if that is OK.'];
const waitLeads = ["I'll need to get that from {who}, so give me a day or so. Meanwhile, a different question.", "I'll dig that out tomorrow. In the meantime, something else has come up.", 'Getting that for you. While I wait, another question.', "That's with {who}, so it'll be a day. Something unrelated in the meantime."];
const askNext = ['What can we do in the meantime?', 'Is there anything we can do now?', 'Understood. Is there a way round it for now?', 'OK. What would you suggest?'];
const askChange = ['Is it something you will fix?', 'So what happens now?', 'Will Shopcore change this?', 'Can it be fixed in Shopcore?'];
const waitAck = ["Thanks. Please let us know when it's out.", "OK, we'll wait for the release then.", 'Understood. Keep us posted.', "Thanks, that's clear. We'll watch this ticket.", 'Fine by us. Let us know.'];
const surveyNotes = ['Quick and clear.', 'Took a while but got there.', 'Very helpful, thanks {agent}.', '', 'Would rather have had a fix than a workaround.', 'Friendly and knew the code.', ''];
const genericSubjects = ['Question from {store}', 'Order {order}', 'Help please', 'Shopcore question', 'A few issues on our side', 'A couple of things', 'Customers affected', 'Issue on {domain}'];
const careSubjects = ['Escalation: order {order}', 'Shopper complaint, order {order}', 'Care escalation', "Please help with {sfirst}'s order", 'From care: {sfull}'];
const generalQuick: [string, string][] = [
	['Does Shopcore work with Rails 7.2?', 'Yes. Shopcore supports Rails 7.1 and later, and several stores run it on 7.2.'],
	['Can we mount the address book somewhere other than /shopcore/addresses?', 'Yes. Mount the engine at whatever path you like in your routes, for example "/account", and the address book moves with it.'],
	['Where can we see what changed in each release?', 'In CHANGELOG.md, in the gem and in the repository on GitHub.'],
	['Is there a way to hear when a new Shopcore version comes out?', 'Watch the releases of the GitHub repository. Partner success also mentions them in the partner newsletter.'],
	['What hours is the desk staffed?', 'Weekdays from 08:30 to 17:45 UK time. Partners on the support plan can use the on-call number for outages outside those hours.'],
	['Which Ruby versions do you support?', 'Ruby 3.1 and later.'],
	['Do you have a sandbox store we can test against?', 'Not a shared one. Most partners run Shopcore in their own staging environment.'],
	['Can we get a summary of our tickets each month?', 'Yes, partner success can send one. Ask Hannah and she will set it up.']
];
const careQuick: [string, string][] = [
	['Where can care see which Shopcore version the storefronts run?', 'On the platform status page, under Components.'],
	['Who should care ask about delivery charges?', "Fulfilment, or the storefront team if it's about what checkout charges."],
	['Does the desk take tickets at the weekend?', 'No, weekdays only. Anything urgent at the weekend goes to the storefront on-call.'],
	['Can care change the state of an order in the admin?', 'Not at the moment. Ask the desk or the storefront team.']
];

// ---------------------------------------------------------------------------------------------------------
// One ticket.
type Role = 'rep' | 'desk' | 'note' | 'team' | 'tool';
type Gap = 'reply' | 'quick' | 'note' | 'team' | 'later' | 'reminder';
interface Msg {
	role: Role;
	body: string;
	gap: Gap;
	who?: string;
}

const weighted = (r: Rand, list: Topic[]) => {
	let roll = r() * list.reduce((sum, topic) => sum + topic.weight, 0);
	for (const topic of list) if ((roll -= topic.weight) < 0) return topic;
	return list.at(-1)!;
};

const ticket = (index: number, number: number): string => {
	const r = mulberry32(90_001 + index * 7_919);
	const openDay = openDays[Math.floor((index * openDays.length) / ITEMS)]!;
	const open = office(r, openDay + int(r, 8 * 60 + 35, 17 * 60 + 20) * MIN);

	// The main matter, and a store it fits.
	let main = weighted(r, topics);
	const storesFor = (topic: Topic) =>
		(topic.via === 'care' ? OWN : [...PARTNERS, ...PARTNERS, ...OWN]).filter((store) => !topic.only || topic.only(store));
	while (storesFor(main).length === 0) main = weighted(r, topics);
	const store = pick(r, storesFor(main));
	const care = main.via === 'care';
	const careAgent = pick(r, careAgents);
	const person = pick(r, store.people);
	const agentFull = pick(r, desk);
	const s: Slots = {
		store: store.name,
		domain: store.domain,
		town: store.town,
		cur: store.cur,
		sym: SYM[store.cur]!,
		prefix: store.prefix,
		version: store.version,
		rails: store.rails,
		ruby: store.ruby,
		goods: store.goods.join('|'),
		agency: store.agency ?? 'their agency',
		agent: agentFull.split(' ')[0]!,
		agentFull,
		first: care ? careAgent[0] : person[0].split(' ')[0]!,
		full: care ? `${careAgent[0]} ${careAgent[1]}` : person[0],
		title: care ? 'Customer care' : person[1],
		cc: store.cc,
		lc: store.cc.toLowerCase(),
		countryName: countryNames[store.cc],
		lcName: countryNames[store.cc].toLowerCase(),
		carrier: pick(r, carriers[store.cc]),
		printer: pick(r, printers),
		n1: String(int(r, 3, 9)),
		n2: String(int(r, 11, 64)),
		n3: String(int(r, 1200, 4800)),
		k: String(int(r, 5, 20)),
		weekday: WDL[utc(open - int(r, 1, 4) * DAY).getUTCDay()]!,
		since: dayMonth(open - int(r, 3, 12) * DAY),
		sinceShort: `${utc(open - int(r, 1, 3) * DAY).getUTCDate()} ${MON[utc(open).getUTCMonth()]}`,
		openMs: String(open),
		own: store.own ? 'yes' : '',
		who: pick(r, care ? ['the warehouse', 'the shopper', 'the payments people'] : person[1].includes('eveloper') ? ['our warehouse', 'our ops team', 'a colleague'] : [store.agency ?? 'our developer', 'our developer', 'IT', 'a colleague']),
		lastMonth: MONL[utc(open).getUTCMonth() - 1]!,
		plat: String(int(r, 2100, 2499)),
		...matterSlots(r, store, open)
	};
	if (main.key === 'status-not-shipped') s.status = 'paid';
	const team = (key: TeamKey): [string, string] | undefined =>
		key === 'agency' ? (store.agency ? [agencyPeople[store.agency]!, store.agency] : undefined) : teams[key];
	const outcomes = main.outcomes.filter((outcome) => outcome !== 'team' || (main.team && team(main.team) && !(store.own && main.team === 'partners')));
	const outcome = pick(r, outcomes.length ? outcomes : ['quiet' as Outcome]);

	const rep = (text: string, first = false): Msg => {
		const greet = first ? pick(r, care ? careGreet : greetFirst) : pick(r, greetLater);
		const sign = pick(r, care ? careSign : repSign);
		return { role: 'rep', gap: 'reply', body: [greet, text, sign].filter(Boolean).join('\n\n') };
	};
	const deskMsg = (text: string, first = false): Msg => ({ role: 'desk', gap: 'reply', body: [pick(r, first ? deskGreetFirst : deskGreet), text, pick(r, deskSign)].filter(Boolean).join('\n\n') });
	const note = (text: string): Msg => ({ role: 'note', gap: 'note', body: text });
	const quote = (text: string) => text.split('\n').map((line) => `> ${line}`).join('\n');
	const giveText = (topic: Topic, slots: Slots) =>
		!care && store.agency && chance(r, 0.6) && topic.via === 'partner'
			? fill(pick(r, ['I asked our developers at {agency} and they sent this over:', '{agency}, who build our site, pulled this for me:', 'Our agency, {agency}, sent this:']), slots)
			: fill(topic.give, slots);

	// The opening.
	const msgs: Msg[] = [];
	if (care) {
		const intro = pick(r, ['Escalating from the care queue.', 'Passing this one up from care.', 'One for the desk, please.', 'Could the desk look at this one?']);
		const from = pick(r, ['{sfull} wrote to us about order {order}:', '{sfull} emailed about order {order}:', 'From {sfull}, about order {order}:']);
		msgs.push(rep([intro + ' ' + from, quote(pick(r, main.open)), main.checked ?? '', arts.careOrder!(r, s)].filter(Boolean).join('\n\n'), true));
	} else {
		const context = chance(r, 0.4) ? ' ' + pick(r, ['We run Shopcore {version} on Rails {rails}.', "We're on Shopcore {version}.", 'For reference, Shopcore {version}, Rails {rails}, Ruby {ruby}.']) : '';
		const list = affectedBy[main.key];
		if (list) s.affectedWhat = list[2];
		if (main.key === 'thousands') [s.affectedLow, s.affectedHigh] = [String(Math.round(Number(s.bigCents) / 4)), String(Number(s.bigCents) * 2)];
		const attached = list && chance(r, 0.85) ? `\n\n${list[0]}\n\n${affected(r, s, list[1])}` : '';
		msgs.push(rep(pick(r, main.open) + context + attached, true));
	}
	msgs.push(deskMsg(pick(r, main.ask), true));
	if (chance(r, 0.55))
		msgs.push(
			note(
				pick(r, ['Checked {domain}: Shopcore {version} on Rails {rails}, Ruby {ruby}.', 'Store details: {store}, Shopcore {version}, Rails {rails}.', 'Looked {store} up: Shopcore {version}, nothing unusual in the account.']) +
					pick(r, [' No other open tickets from the store.', ' Nothing on the status page for that window.', " The store's last ticket was a while ago.", ' No deploys of ours in that window.', '']) +
					(!care && chance(r, 0.6) ? `\n\n${glance(r, s)}` : '')
			)
		);

	// A side matter, raised while the main one waits or after it is answered.
	// Matters of one area each, and never two takes on the same symptom (the label helper and a store's own
	// form both lose the second line). Tickets opened late in the period have less time for more matters.
	const daysLeft = (LIMIT - open) / DAY;
	const sideCount = Math.min(pick(r, care ? [0, 1, 1, 1, 2, 2] : [0, 1, 1, 1, 2, 2, 2, 2, 3, 3]), Math.floor(daysLeft / 3.5));
	const family = (topic: Topic) => (topic.key.includes('second-line') ? 'second-line' : topic.area);
	const sideTopics: Topic[] = [];
	for (const topic of shuffle(r, topics))
		if (sideTopics.length < sideCount && topic.via === main.via && (topic.fix || topic.work) && (!topic.only || topic.only(store)) && ![main, ...sideTopics].some((other) => family(other) === family(topic) || other.area === topic.area))
			sideTopics.push(topic);
	const sideSegment = (topic: Topic, lead: string): Msg[] => {
		const s2: Slots = { ...s, ...matterSlots(r, store, open) };
		const opening = care ? `${lead} Another shopper, ${s2.sfull}, wrote in about order ${s2.order}:\n\n${quote(fill(pick(r, topic.open), s2))}` : `${lead} ${fill(pick(r, topic.open), s2)}`;
		const solve = topic.fix && (!topic.work || chance(r, 0.5)) ? `${pick(r, fixLeads)} ${fill(topic.fix, s2)}.` : fill(topic.work!, s2);
		const ok = topic.fix && solve.includes(fill(topic.fix, s2)) ? topic.fixed! : topic.accept!;
		const out = [
			rep(opening),
			deskMsg(fill(pick(r, topic.ask), s2)),
			rep(`${giveText(topic, s2)}\n\n${topic.art(r, s2)}`),
			deskMsg(`${fill(topic.find, s2)}\n\n${solve}`)
		];
		if (topic.more && chance(r, 0.6)) {
			const [q, a] = pick(r, topic.more);
			out.push(rep(fill(q, s2)), deskMsg(fill(a, s2)));
		}
		out.push(rep(fill(pick(r, ok), s2)));
		return out;
	};

	// The main matter answered: what the reporter sends, then the cause.
	const answer = (): Msg[] => {
		const out: Msg[] = [rep(`${giveText(main, s)}\n\n${main.art(r, s)}`)];
		return out;
	};
	const mores = shuffle(r, main.more ?? []).slice(0, int(r, Math.min(1, (main.more ?? []).length), (main.more ?? []).length));
	const moreMsgs = (): Msg[] => mores.flatMap(([q, a]) => [rep(fill(q, s)), deskMsg(fill(a, s))]);
	const quicks = shuffle(r, [...topics.filter((topic) => topic.via === main.via && topic.key !== main.key).map((topic) => topic.quick), ...(care ? careQuick : generalQuick.filter(([q, a]) => !store.own || !/partner/.test(q + a)))]).slice(0, Math.min(pick(r, [1, 1, 2, 2, 3]), Math.floor(daysLeft / 2)));
	const quickMsgs = (pair: [string, string]): Msg[] => [
		{ ...rep(pick(r, ['Quick one while I think of it. ', 'Unrelated question. ', 'Also, a small one. ', 'One more question. ', '', '']) + fill(pair[0], s)), gap: 'quick' },
		deskMsg(fill(pair[1], s))
	];

	const usedSides = [...sideTopics];
	const quietEarly = outcome === 'quiet' && (!main.fix || chance(r, 0.4));
	const waitingFirst = sideTopics.length > 0 && (quietEarly || chance(r, 0.5));
	if (waitingFirst) msgs.push(...sideSegment(sideTopics.shift()!, fill(pick(r, waitLeads), s)));
	const ending: Msg[] = [];
	const findText = fill(main.find, s);
	const logged = () => note(`Logged on the platform board as PLAT-${s.plat}: ${fill(main.change!, s)}. Linked this ticket.`);
	if (quietEarly) {
		// They never send what the desk asked for.
		for (const topic of sideTopics) msgs.push(...sideSegment(topic, pick(r, sideLeads)));
		for (const pair of quicks.slice(0, 1)) msgs.push(...quickMsgs(pair));
		msgs.push(deskMsg(pick(r, [`Whenever you have ${main.need}, send it over and I'll pick up your first question.`, `Glad that one's sorted. For your original question I still need ${main.need} when you get a chance.`, `Back to where we started: I can't go further without ${main.need}.`])));
		ending.push({ role: 'tool', gap: 'reminder', body: `Reminder sent to ${s.full}: "We're waiting for your reply on this ticket."` });
		if (chance(r, 0.6)) ending.push({ ...note(pick(r, ['No reply yet. Leaving it open for another week.', 'Still nothing back. Keeping it open.', 'Chased once. Leaving open.'])), gap: 'later' });
	} else {
		// The cause, and what the desk does about it straight away.
		msgs.push(...answer());
		if (outcome === 'fix' || outcome === 'quiet') msgs.push(deskMsg(`${findText}\n\n${pick(r, fixLeads)} ${fill(main.fix!, s)}.`));
		else msgs.push(deskMsg(findText));
		msgs.push(...moreMsgs());
		const [teamPerson, name] = outcome === 'team' ? team(main.team!)! : ['', ''];
		const signed = teamPerson.split(' ')[0]!;
		if (outcome === 'work') msgs.push(rep(pick(r, askNext)), deskMsg(fill(main.work!, s)));
		if (outcome === 'change' || (outcome === 'team' && main.team === 'partners')) {
			if (chance(r, 0.6)) msgs.push(rep(pick(r, askChange)));
			msgs.push(deskMsg(fill(main.changeMsg!, s)), logged());
			if (outcome === 'change') msgs.push(rep(pick(r, waitAck)));
		}
		if (outcome === 'team') {
			const intro = { fulfilment: 'who run the print queue and the warehouse integration', storefront: 'who look after the storefronts', payments: 'who look after payments', partners: "who look after the store's plans with us", agency: '' }[main.team!];
			msgs.push(note(fill(main.handover!, s)));
			msgs.push(deskMsg(main.team !== 'agency' ? `I've ${main.team === 'partners' ? 'also ' : ''}passed this to ${name}, ${intro}. ${signed} will reply here.` : `This needs a change on your site, so I've passed it to ${name}, since they look after your code. ${signed} will pick it up on this ticket.`));
		}

		// Everything else the ticket raises, then the last word on the first matter.
		for (const topic of sideTopics) msgs.push(...sideSegment(topic, pick(r, sideLeads)));
		for (const pair of quicks) msgs.push(...quickMsgs(pair));
		const others = usedSides.length > 0 || quicks.length > 0;
		const back = others ? pick(r, ['Back to the first thing. ', 'On the original question again. ', 'About the first problem. ', 'Back to what I first wrote about. ', 'Going back to my first message. ']) : '';
		if (outcome === 'fix') {
			ending.push(rep(back + fill(pick(r, main.fixed!), s)));
			ending.push(deskMsg(pick(r, closers)));
			if (!care && chance(r, 0.35)) ending.push({ role: 'tool', gap: 'note', body: `Satisfaction survey from ${s.full}: ${pick(r, ['5', '5', '4', '4', '3'])} out of 5.${((said) => (said ? ` "${said}"` : ''))(fill(pick(r, surveyNotes), s))}` });
		} else if (outcome === 'quiet') {
			if (others) ending.push(deskMsg(`${pick(r, ['Just checking on your first question:', 'Coming back to the first issue:', 'One last thing on where we started:'])} did you get a chance to ${fill(main.fix!, s)}?`));
			ending.push({ role: 'tool', gap: 'reminder', body: `Reminder sent to ${s.full}: "Did the suggested change sort it out? Let us know either way."` });
			if (chance(r, 0.5)) ending.push({ ...note(pick(r, ['No reply. Leaving it open in case it comes back.', 'Nothing back yet. Leaving open.'])), gap: 'later' });
		} else if (outcome === 'work') {
			ending.push(rep(back + fill(pick(r, main.accept!), s)));
			if (chance(r, 0.5)) ending.push(deskMsg(pick(r, closers)));
		} else if (outcome === 'change') {
			if (others || chance(r, 0.4)) {
				ending.push({ ...rep(pick(r, ['Any news on the change you logged for us?', 'Is there a date yet for the fix you logged?', 'Just checking whether the change you logged has a date yet.'])), gap: 'later' });
				ending.push(deskMsg(`Not yet. It's on the board as PLAT-${s.plat}, and I'll post here as soon as a release has it.`));
			}
		} else {
			const internal = main.team !== 'agency';
			const variant = pick(r, main.change && (main.team === 'fulfilment' || main.team === 'storefront') ? ['fix', 'fix', 'need', 'later', 'later', 'back'] : ['fix', 'fix', 'need', 'later', 'later']);
			const by = `${teamPerson} (${internal ? `Brambleway ${name.replace(/^the /, '')}` : name})`;
			if (variant === 'fix') {
				ending.push({ role: 'team', gap: 'team', who: by, body: `Hi ${s.first},\n\n${fill(main.teamFix!, s)}\n\n${signed}` });
				ending.push(rep(pick(r, ['Thanks, all good here.', 'Brilliant, thank you both.', 'Confirmed, that has fixed it.', 'Thanks! Checked and it works.'])));
			} else if (variant === 'need') {
				ending.push({ role: 'team', gap: 'team', who: by, body: `Hi ${s.first},\n\nI'm looking at this. Could you send me ${fill(main.teamNeed ?? 'a couple more examples, with order numbers', s)}? Then I can get it sorted.\n\n${signed}` });
				ending.push({ role: 'tool', gap: 'reminder', body: `Reminder sent to ${s.full}: "${signed} is waiting for your reply on this ticket."` });
			} else if (variant === 'later') {
				ending.push({ role: 'team', gap: 'team', who: by, body: `Hi ${s.first},\n\nThanks, we've picked this up. ${pick(r, ["It's on our list for the next sprint", "We'll get to it after the current release", "It's next in our queue", "We're planning it for the week after next"])}, and I'll update this ticket when it's done.\n\n${signed}` });
				if (chance(r, 0.5)) ending.push(rep(pick(r, ['Thanks.', 'Great, thank you.', 'OK, thanks for the update.'])));
			} else {
				ending.push({ role: 'team', gap: 'team', who: by, body: `Hi ${s.agent},\n\nWe've had a look, and this isn't something we can patch on our side: it comes from Shopcore itself. Handing it back to the desk.\n\n${signed}` });
				ending.push(deskMsg(fill(main.changeMsg!, s)), logged());
				if (chance(r, 0.6)) ending.push(rep(pick(r, waitAck)));
			}
		}
	}
	msgs.push(...ending);

	// Times: replies within office hours, compressed for tickets opened near the end of the period.
	const times = (scale: number) => {
		let at = open;
		return msgs.map((msg, i) => {
			if (i === 0) return at;
			const gap = { reply: int(r, 25, 1500), quick: int(r, 10, 240), note: int(r, 1, 12), team: int(r, 600, 4000), later: int(r, 5000, 11000), reminder: int(r, 4000, 6500) }[msg.gap];
			at = at + Math.max(1, Math.round(gap * scale)) * MIN;
			if (msg.gap !== 'note' && scale > 0.05) at = office(r, at);
			return at;
		});
	};
	let when = times(1);
	for (const scale of [0.6, 0.4, 0.25, 0.15, 0.1, 0.04]) if (when.at(-1)! > LIMIT) when = times(scale);

	// The page.
	let subject = pick(r, main.subjects);
	const roll = r();
	if (roll < 0.15 && usedSides.length) subject = pick(r, usedSides[0]!.subjects);
	else if (roll < 0.38) subject = pick(r, care ? careSubjects : genericSubjects);
	const header = care
		? table(['Field', 'Value'], [
				['Opened', `${stamp(open)}, escalated from the care queue`],
				['From', `${s.full}, Brambleway customer care <care@brambleway.example>`],
				['Store', `${store.name} storefront (${store.domain})`],
				['Order', s.order!],
				['Assigned to', agentFull]
			])
		: table(['Field', 'Value'], [
				['Opened', `${stamp(open)}, ${pick(r, ['from the partner portal', 'by email', 'by email', 'from the partner portal'])}`],
				['From', `${s.full} <${s.full.split(' ')[0]!.toLowerCase()}@${store.domain.split('/')[0]}>`],
				['Store', `${store.name} (${store.domain}), ${store.town}${store.own ? '' : `, partner since ${store.since}`}`],
				['Store runs', `Shopcore ${store.version}, Rails ${store.rails}, Ruby ${store.ruby}`],
				...(store.agency ? [['Site built by', store.agency]] : []),
				['Assigned to', agentFull]
			]);
	const earlier =
		!care && chance(r, 0.35)
			? `\n\n### Earlier tickets from this store\n\n${table(['Ticket', 'Opened', 'Subject'], [...new Set(Array.from({ length: int(r, 1, 3) }, () => FIRST_DAY - int(r, 4, 170) * DAY))].sort((a, b) => a - b).map((day) => {
					// One store's ticket of one day reads the same in every file. Before 3.4.0 there was no label
					// helper and no text total, so only older kinds of matter.
					const which = [...OWN, ...PARTNERS].indexOf(store);
					const rr = mulberry32(Math.round(day / DAY) * 31 + which);
					const topic = pick(rr, topics.filter((t) => t.via === 'partner' && (!t.only || t.only({ ...PARTNERS[0]!, version: '3.3.1' }))));
					const perDay = (4 * ITEMS) / ((LAST_DAY - FIRST_DAY) / DAY + 1);
					return [`DESK-${4711 - Math.round(((FIRST_DAY - day) / DAY) * perDay) - ((which * 7) % 19)}`, dayMonth(day), fill(pick(rr, topic.subjects), { ...s, ...matterSlots(rr, store, open) })];
				}))}`
			: '';
	const author = (msg: Msg) => {
		if (msg.role === 'rep') return care ? `${s.full} (Brambleway customer care)` : `${s.full} (${store.name})`;
		if (msg.role === 'desk') return `${agentFull} (platform desk)`;
		if (msg.role === 'note') return `Internal note by ${agentFull}`;
		if (msg.role === 'team') return msg.who!;
		return 'Desk tool';
	};
	const conversation = msgs.map((msg, i) => `### ${author(msg)} · ${stamp(when[i]!)}\n\n${fill(msg.body, s)}`).join('\n\n');
	return `# DESK-${number}: ${fill(subject, s)}\n\n${header}${earlier}\n\n## Conversation\n\n${conversation}\n`;
};

// ---------------------------------------------------------------------------------------------------------
const folder = join(root, 'support', 'platform-desk');
mkdirSync(folder, { recursive: true });
writeFileSync(
	join(folder, 'README.md'),
	`# Platform desk tickets\n\nExported from the desk tool on Saturday 21 November 2026: every ticket the Brambleway platform desk opened between Monday 14 September and Friday 13 November 2026, one file per ticket, named by its number. Partner stores raise tickets from the partner portal or by email; Brambleway customer care escalates shoppers' problems with the storefronts from the care queue.\n\nEach file has the ticket's header and its whole conversation, internal notes and the desk tool's own messages included. The desk's labels and statuses were not part of the export.\n`
);
for (let index = 0; index < ITEMS; index++) {
	const number = 4711 + index * 4 + mulberry32(17 + index)() * 4 | 0;
	writeFileSync(join(folder, `DESK-${number}.md`), ticket(index, number));
}
