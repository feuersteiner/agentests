// Writes the long material of this entry's long tasks: the customer threads that Fernbank Seeds' shared inbox handled
// between 1 September and 13 November 2026, one Markdown file each, under support/inbox/.
// Deterministic: fixed seeds, no clock, no network.
//   bun long/generate.ts <workspace root>
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** How many threads to write. Everything else is derived from it. */
const ITEMS = 305;

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
const cap = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const pounds = (pence: number) => `£${Math.floor(pence / 100)}.${pad(pence % 100)}`;
const shuffled = <T>(r: Rand, items: readonly T[]): T[] => {
	const copy = [...items];
	for (let i = copy.length - 1; i > 0; i--) {
		const j = Math.floor(r() * (i + 1));
		[copy[i], copy[j]] = [copy[j]!, copy[i]!];
	}
	return copy;
};

// ---------------------------------------------------------------------------------------------------------
// Dates. Threads open between 1 September and 13 November 2026; the inbox was exported on 20 November.
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WDL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const utc = (ms: number) => new Date(ms);
const clock = (ms: number) => `${pad(utc(ms).getUTCHours())}:${pad(utc(ms).getUTCMinutes())}`;
const stamp = (ms: number) => `${WD[utc(ms).getUTCDay()]} ${utc(ms).getUTCDate()} ${MON[utc(ms).getUTCMonth()]} ${utc(ms).getUTCFullYear()}, ${clock(ms)}`;
const shortDay = (ms: number) => `${WD[utc(ms).getUTCDay()]} ${utc(ms).getUTCDate()} ${MON[utc(ms).getUTCMonth()]}`;
const dayMonth = (ms: number) => `${utc(ms).getUTCDate()} ${MONL[utc(ms).getUTCMonth()]}`;
const fullDay = (ms: number) => `${WDL[utc(ms).getUTCDay()]} ${dayMonth(ms)}`;
const monthYear = (ms: number) => `${MONL[utc(ms).getUTCMonth()]} ${utc(ms).getUTCFullYear()}`;
const midnight = (ms: number) => ms - (ms % DAY);
const FIRST_DAY = Date.UTC(2026, 8, 1);
const LAST_DAY = Date.UTC(2026, 10, 13);
const EXPORT = Date.UTC(2026, 10, 20);
const openDays: number[] = [];
for (let day = FIRST_DAY; day <= LAST_DAY; day += DAY) openDays.push(day);
/** The next weekday on or after `ms`, at midnight. */
const weekday = (ms: number) => {
	let day = midnight(ms);
	while (utc(day).getUTCDay() === 0 || utc(day).getUTCDay() === 6) day += DAY;
	return day;
};

// ---------------------------------------------------------------------------------------------------------
// People and places.
const firstF = ['Helen', 'Margaret', 'Priya', 'Sian', 'Ruth', 'Nkechi', 'Joanna', 'Alison', 'Freya', 'Bethan', 'Lorna', 'Mei', 'Catriona', 'Esther', 'Dilys', 'Amira', 'Rosalind', 'Kerry', 'Ingrid', 'Patience', 'Hannah', 'Gwen', 'Tessa', 'Yvonne', 'Shona', 'Lucy', 'Marjorie', 'Farah'];
const firstM = ['David', 'Graham', 'Rajesh', 'Owain', 'Stuart', 'Kwame', 'Peter', 'Alistair', 'Callum', 'Dewi', 'Martin', 'Jun', 'Hamish', 'Colin', 'Emrys', 'Tariq', 'Bernard', 'Neil', 'Lars', 'Femi', 'Simon', 'Gareth', 'Clive', 'Ewan', 'Raymond', 'Joe', 'Desmond', 'Imran'];
const surnames = ['Pritchard', 'Okonjo', 'Hartley', 'Mbeki', 'Llewellyn', 'Patel', 'Ferguson', 'Whitcombe', 'Nakamura', 'Ashby', 'Rowlands', 'Kowalczyk', 'Bradshaw', 'Osei', 'Thackeray', 'Lindqvist', 'Murray', 'Haddad', 'Pemberton', 'Garside', 'Evans', 'Quayle', 'Ridley', 'Achebe', 'Morgan', 'Sato', 'Fairbairn', 'Doherty', 'Kaur', 'Henshaw'];
const places = [
	['Ledbury', 'HR8'], ['Hereford', 'HR1'], ['Malvern', 'WR14'], ['Ludlow', 'SY8'], ['Leominster', 'HR6'], ['Abergavenny', 'NP7'],
	['Monmouth', 'NP25'], ['Stroud', 'GL5'], ['Cheltenham', 'GL50'], ['Worcester', 'WR2'], ['Shrewsbury', 'SY3'], ['Kendal', 'LA9'],
	['Hexham', 'NE46'], ['Frome', 'BA11'], ['Totnes', 'TQ9'], ['Bridport', 'DT6'], ['Whitby', 'YO21'], ['Harrogate', 'HG2'],
	['Ilkley', 'LS29'], ['Lewes', 'BN7'], ['Hebden Bridge', 'HX7'], ['Machynlleth', 'SY20'], ['Bakewell', 'DE45'], ['Penrith', 'CA11'],
	['Norwich', 'NR2'], ['Peebles', 'EH45'], ['Bideford', 'EX39'], ['Settle', 'BD24']
] as const;
const streetNames = ['Mill Lane', 'Orchard Close', 'Church Street', 'Station Road', 'The Green', 'Brook Street', 'Victoria Terrace', 'Hawthorn Way', 'Bridge End', 'Quarry Road', 'Chapel Row', 'Elm Grove', 'Park View', 'Westfield Avenue', 'Holly Bank', 'Tanners Walk'];
const mailHosts = ['inbox.example', 'postbox.example', 'mailhub.example', 'greenpost.example', 'homemail.example', 'letterbox.example'];
const letters = 'ABDEFGHJLNPQRSTUWXY';
const postcodeIn = (r: Rand, area: string) => `${area} ${int(r, 1, 9)}${letters[int(r, 0, letters.length - 1)]}${letters[int(r, 0, letters.length - 1)]}`;
const agentNames = ['Tomasz', 'Tomasz', 'Tomasz', 'Ama', 'Ama', 'Bridget'];

type Who = 'Rhys' | 'Della' | 'Ivo' | 'Bridget' | 'warehouse' | 'supplier';
/** People who answer in the thread themselves; the warehouse and the grower reach the customer through the agent. */
const mates: Partial<Record<Who, string>> = {
	Rhys: 'Rhys (Fernbank Seeds, head grower)',
	Della: 'Della (Fernbank Seeds, trade accounts)',
	Ivo: 'Ivo (Fernbank Seeds, website)',
	Bridget: 'Bridget (Fernbank Seeds)'
};

// ---------------------------------------------------------------------------------------------------------
// The catalogue: SKU, the name on the packing slip, the variety, what it is (plural), the price in pence.
const catalogue = [
	['PEA-01', 'Kelvedon Wonder pea', 'Kelvedon Wonder', 'peas', 295],
	['PEA-03', 'Hurst Green Shaft pea', 'Hurst Green Shaft', 'peas', 325],
	['PEA-05', 'Douce Provence pea', 'Douce Provence', 'peas', 295],
	['BEAN-02', 'Aquadulce Claudia broad bean', 'Aquadulce Claudia', 'broad beans', 315],
	['BEAN-04', 'Crimson Flowered broad bean', 'Crimson Flowered', 'broad beans', 375],
	['BEAN-07', 'Scarlet Emperor runner bean', 'Scarlet Emperor', 'runner beans', 349],
	['BEAN-09', 'Cobra climbing French bean', 'Cobra', 'French beans', 365],
	['GAR-03', 'Germidour garlic, 2 bulbs', 'Germidour', 'garlic', 650],
	['GAR-05', 'Elephant garlic, 1 bulb', 'Elephant', 'garlic', 595],
	['GAR-08', 'Solent Wight garlic, 2 bulbs', 'Solent Wight', 'garlic', 695],
	['ONI-04', 'Radar onion sets, 250 g', 'Radar', 'onion sets', 425],
	['ONI-06', 'Senshyu Yellow onion sets, 250 g', 'Senshyu Yellow', 'onion sets', 425],
	['SHA-01', 'Jermor shallot sets, 10', 'Jermor', 'shallots', 495],
	['SWP-11', 'Matucana sweet pea', 'Matucana', 'sweet peas', 295],
	['SWP-14', 'Cupani sweet pea', 'Cupani', 'sweet peas', 295],
	['SWP-17', 'High Scent sweet pea', 'High Scent', 'sweet peas', 345],
	['PAR-02', 'Tender and True parsnip', 'Tender and True', 'parsnips', 245],
	['PAR-05', 'Gladiator parsnip (F1)', 'Gladiator', 'parsnips', 325],
	['CAR-09', 'Autumn King carrot', 'Autumn King', 'carrots', 225],
	['CAR-12', 'Flyaway carrot (F1)', 'Flyaway', 'carrots', 345],
	['TOM-14', "Gardener's Delight tomato", "Gardener's Delight", 'tomatoes', 275],
	['TOM-18', 'Sungold tomato (F1)', 'Sungold', 'tomatoes', 425],
	['CHI-05', 'Hungarian Hot Wax chilli', 'Hungarian Hot Wax', 'chillies', 285],
	['CHI-07', 'Padron pepper', 'Padron', 'peppers', 295],
	['SQU-06', 'Crown Prince squash (F1)', 'Crown Prince', 'squashes', 395],
	['SQU-09', 'Uchiki Kuri squash', 'Uchiki Kuri', 'squashes', 325],
	['LET-12', 'Arctic King lettuce', 'Arctic King', 'lettuces', 225],
	['LET-15', 'Winter Density lettuce', 'Winter Density', 'lettuces', 225],
	['KAL-03', 'Nero di Toscana kale', 'Nero di Toscana', 'kale', 255],
	['SPI-08', 'Giant Winter spinach', 'Giant Winter', 'spinach', 235],
	['BEE-10', 'Boltardy beetroot', 'Boltardy', 'beetroot', 225],
	['LEE-06', 'Musselburgh leek', 'Musselburgh', 'leeks', 235],
	['CHA-02', 'Bright Lights chard', 'Bright Lights', 'chard', 265],
	['PSL-01', 'Giant of Italy parsley', 'Giant of Italy', 'parsley', 215],
	['GRM-01', 'Field bean green manure, 500 g', 'field bean', 'green manure', 695],
	['GRM-04', 'Grazing rye, 500 g', 'grazing rye', 'green manure', 595],
	['GRM-07', 'Phacelia, 100 g', 'phacelia', 'green manure', 450],
	['CAL-03', 'Indian Prince calendula', 'Indian Prince', 'calendula', 225],
	['COS-05', 'Purity cosmos', 'Purity', 'cosmos', 245],
	['MIC-01', 'Microgreens mix, 250 g', 'microgreens', 'mix', 795]
] as const;
type Sku = (typeof catalogue)[number][0];
const bySku = new Map(catalogue.map((row) => [row[0] as string, row]));
const autumnSkus: Sku[] = ['PEA-05', 'BEAN-02', 'BEAN-04', 'GAR-03', 'GAR-05', 'GAR-08', 'ONI-04', 'ONI-06', 'SHA-01', 'SWP-11', 'SWP-14', 'SWP-17', 'LET-12', 'LET-15', 'SPI-08', 'GRM-01', 'GRM-04', 'GRM-07'];
const anySkus = catalogue.map((row) => row[0]);
const fillerSku = (r: Rand) => (chance(r, 0.6) ? pick(r, autumnSkus) : pick(r, anySkus));
const DELIVERY = 320;
const FREE_FROM = 2500;

type Slots = Record<string, string>;
/** A matter's slots see the thread's slots through the prototype, so dates set on the thread show through. */
const useSku = (s: Slots, sku: string) => {
	const row = bySku.get(sku)!;
	s.sku = row[0];
	s.product = row[1];
	s.variety = row[2];
	s.kind = row[3];
	s.price = pounds(row[4]);
	s.pence = String(row[4]);
};
const fill = (text: string, s: Slots): string =>
	text.replace(/\{(\w+)\}/g, (_, key: string) => {
		const value = s[key];
		if (value === undefined) throw new Error(`no slot {${key}} in: ${text.slice(0, 80)}`);
		return value;
	});

// ---------------------------------------------------------------------------------------------------------
// Pasted things: courier scans, lists, tables. Each takes the matter's slots.
type Art = (r: Rand, s: Slots) => string;
const table = (head: string[], rows: string[][]) =>
	[`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`, ...rows.map((row) => `| ${row.join(' | ')} |`)].join('\n');
const fence = (lines: string[]) => ['```', ...lines, '```'].join('\n');
const hubs = ['Birmingham', 'Bristol', 'Warrington', 'Northampton', 'Swindon'];
const lineItems = (s: Slots) => (s.items ?? '').split('|').filter(Boolean);

const arts: Record<string, Art> = {
	tracking: (r, s) => {
		const t0 = Number(s.sentOutMs);
		const out = [`Parcelline · tracking number ${s.track}`, `Service: Standard 48 · Weight: ${(0.1 + r() * 0.9).toFixed(2)} kg`, ''];
		const at = (ms: number, text: string) => out.push(`${shortDay(ms).padEnd(11)} ${clock(ms)}  ${text}`);
		let t = t0 + int(r, 16 * 60, 18 * 60) * MIN;
		at(t, 'Collected from sender: Hollin Lane, Ledbury');
		t += int(r, 4 * 60, 6 * 60) * MIN;
		at(t, `Sorted at hub: ${pick(r, hubs)}`);
		if (s.trackKind === 'island') {
			t += int(r, 9, 12) * HOUR;
			at(t, 'Arrived at hub: Inverness');
			t += int(r, 20, 30) * HOUR;
			at(t, 'Held at hub: awaiting onward freight');
			t += int(r, 40, 70) * HOUR;
			at(t, 'Held at hub: awaiting onward freight');
			t += int(r, 20, 30) * HOUR;
			at(t, 'Departed hub: ferry freight');
		}
		t = midnight(t) + DAY + int(r, 4 * 60, 6 * 60) * MIN;
		at(t, `Arrived at delivery office: ${s.depot}`);
		t += int(r, 90, 150) * MIN;
		at(t, 'Out for delivery');
		t += int(r, 3 * 60, 7 * 60) * MIN;
		if (s.trackKind === 'wrong') at(t, `Delivered: left in safe place (${s.safeShort}). Recorded at ${s.wrongPostcode}`);
		else at(t, 'Delivered: handed to resident');
		return fence(out);
	},
	wetList: (r, s) =>
		table(
			['Packet', 'How it looks'],
			lineItems(s).map((name) => [name, name === s.product || chance(r, 0.4) ? pick(r, ['soaked, seeds swollen and stuck together', 'packet split, seeds loose in the bag', 'soggy, seeds look all right']) : pick(r, ['damp corner only', 'dry', 'dry, packet creased'])])
		),
	batch: (r, s) =>
		fence([`BRECON VALLEY GROWERS for FERNBANK SEEDS`, `${s.product}`, `Batch ${s.batch}   Packed ${pad(int(r, 1, 28))}/0${int(r, 8, 9)}/26`, `Store cool and dry. Plant out by end of November.`, `Grown in the UK. Plant passport: UK/GB-${int(r, 10000, 99999)}`]),
	sowingLog: (r, s) => {
		const rows: string[][] = [];
		const base = Number(s.sownMs);
		rows.push([dayMonth(base), `Sowed ${s.variety}`, s.sowHow!]);
		rows.push([dayMonth(base + int(r, 1, 3) * DAY), 'Weather', pick(r, ['heavy rain overnight', 'cold, frost on the car', 'dry and windy', 'mild, drizzle'])]);
		rows.push([dayMonth(base + int(r, 6, 9) * DAY), 'Checked', pick(r, ['nothing yet', 'nothing yet, soil crusted on top', 'nothing, a few holes in the row', 'one or two showing at the far end'])]);
		rows.push([dayMonth(base + int(r, 14, 18) * DAY), 'Checked', `${s.up} up in total`]);
		if (chance(r, 0.5)) rows.push([dayMonth(base + int(r, 21, 26) * DAY), 'Checked', 'no change']);
		return table(['Date', 'What', 'Notes'], rows);
	},
	packetBack: (r, s) =>
		fence([`${s.wrong!.toUpperCase()} ${s.kind!.toUpperCase()}`, `Sow: ${pick(r, ['March to May', 'September to November', 'February to April', 'April to June'])}   Harvest: ${pick(r, ['June to August', 'May to July', 'August to October'])}`, `Lot ${s.lot}   Packed for 2026   Germination ${s.germ}% (tested ${pick(r, ['July', 'August'])} 2026)`, `Fernbank Seeds · Ledbury · fernbankseeds.example`]),
	cropNotes: (r, s) =>
		table(
			['Plant', 'Planted out', 'What it produced'],
			[1, 2, 3, 4, 5, 6].slice(0, int(r, 3, 6)).map((n) => [`No. ${n}`, `${int(r, 10, 31)} ${pick(r, ['May', 'May', 'June'])}`, n === 1 || chance(r, 0.8) ? s.got! : `${s.got}, but fewer`])
		),
	packingSlip: (r, s) =>
		table(
			['Line on the slip', 'Qty', 'In the bag'],
			lineItems(s).map((name) => [name, String(name === s.product ? 1 : int(r, 1, 2)), name === s.product ? 'not there' : 'yes'])
		),
	count: (r, s) =>
		fence([`Counted on a white plate, twice:`, `  first count   ${s.counted}`, `  second count  ${Number(s.counted) + pick(r, [0, 0, 1, -1])}`, `Packet says: ${s.stated} seeds`, `Lot ${s.lot}`]),
	orderHistory: (_r, s) => s.ordersTable!,
	basket: (r, s) =>
		fence([
			'Your basket',
			...lineItems(s).map((name) => `  ${name.padEnd(36)} x${int(r, 1, 2)}`),
			`  Discount code: ${s.code}`,
			`  ! This code can't be used with your basket.`,
			`  Subtotal ${s.subtotal}   Delivery ${pounds(DELIVERY)}`
		]),
	invoice: (r, s) => {
		const rows = lineItems(s).map((name) => {
			const row = catalogue.find((item) => item[1] === name)!;
			return [name, '1', pounds(row[4]), pounds(row[4])];
		});
		return [
			`Invoice ${s.inv} · Fernbank Seeds, Ledbury`,
			`To: ${s.orgName}, c/o ${s.full}, ${s.street}, ${s.town} ${s.postcode}`,
			`Order ${s.order}, placed ${s.orderDate}`,
			'',
			table(['Item', 'Qty', 'Price', 'Amount'], rows)
		].join('\n');
	},
	groupOrder: (r, s) => {
		const members = shuffled(r, [...firstF, ...firstM]).slice(0, int(r, 7, 12));
		return table(
			['Member', 'Plot', 'Wants'],
			members.map((name) => [name, `${int(r, 1, 60)}${pick(r, ['', 'a', 'b'])}`, shuffled(r, autumnSkus).slice(0, int(r, 1, 3)).map((sku) => `${int(r, 1, 3)} × ${bySku.get(sku)![1]}`).join('; ')])
		);
	},
	schoolPO: (r, s) => {
		const skus = shuffled(r, ['PEA-01', 'BEAN-07', 'SWP-11', 'CAL-03', 'COS-05', 'BEE-10', 'LET-12', 'CHA-02', 'MIC-01'] as Sku[]).slice(0, int(r, 4, 6));
		let total = 0;
		const rows = skus.map((sku) => {
			const row = bySku.get(sku)!;
			const qty = int(r, 2, 8);
			total += qty * row[4];
			return [row[1], String(qty), pounds(row[4]), pounds(qty * row[4])];
		});
		return [`PURCHASE ORDER ${s.po}`, `${s.orgName} · Raised by ${s.full} · Budget code GRDN-${int(r, 10, 99)}`, '', table(['Item', 'Qty', 'Unit', 'Line'], rows), '', `Total ${pounds(total)} · Invoice to: Schools Finance, ${s.council}`].join('\n');
	},
	priceList: (r, _s) =>
		table(
			['Variety', 'Retail packet', 'Trade 100 g', 'Trade 1 kg'],
			shuffled(r, ['PEA-05', 'BEAN-02', 'LET-12', 'SPI-08', 'CHA-02', 'KAL-03', 'BEE-10', 'CAR-09', 'LET-15', 'PSL-01'] as Sku[])
				.slice(0, int(r, 5, 7))
				.map((sku) => {
					// A packet of peas or beans weighs about 50 g; of small seeds, a gram or two.
					const row = bySku.get(sku)!;
					const big = /^(PEA|BEAN)/.test(sku);
					return [row[1], pounds(row[4]), pounds(Math.round(row[4] * (big ? 1.4 : int(r, 3, 5)) / 5) * 5), pounds(Math.round(row[4] * (big ? 11 : int(r, 24, 32)) / 5) * 5)];
				})
		),
	soil: (r, s) => fence([`Soil test kit result, ${s.plotName}`, `  pH             ${(5.6 + r() * 2).toFixed(1)}`, `  Nitrogen       ${pick(r, ['low', 'low to medium', 'medium'])}`, `  Phosphorus     ${pick(r, ['medium', 'high'])}`, `  Potassium      ${pick(r, ['low', 'medium'])}`, `  Texture        ${s.soilKind}`]),
	nights: (r, s) =>
		table(
			['Night', 'Lowest', 'Notes'],
			[0, 1, 2, 3, 4, 5, 6].slice(0, int(r, 5, 7)).map((i) => [shortDay(Number(s.nowMs) - (7 - i) * DAY), `${int(r, -3, 6)}°C`, pick(r, ['clear', 'frost', 'rain', 'wind', 'fog', ''])])
		),
	sowPlan: (r, s) =>
		table(
			['What', 'When', 'Where'],
			shuffled(r, [['Chillies', 'mid January', 'heated propagator'], ['Sweet peas', 'October', 'cold frame'], ['Broad beans', 'November', 'deep pots, greenhouse'], ['Tomatoes', 'late February', 'windowsill'], ['Winter lettuce', 'September', 'greenhouse border'], ['Garlic', 'November', 'raised bed'], ['Onion sets', 'October', 'bed 3']]).slice(0, int(r, 4, 6))
		),
	libraryList: (r, _s) =>
		table(
			['Kind', 'Packets we have', 'Packets we need'],
			shuffled(r, [['Peas', int(r, 2, 12)], ['Beans', int(r, 0, 10)], ['Tomatoes', int(r, 5, 30)], ['Squash', int(r, 0, 6)], ['Lettuce', int(r, 2, 15)], ['Flowers for pollinators', int(r, 0, 8)], ['Herbs', int(r, 1, 9)]]).slice(0, int(r, 4, 6)).map(([kind, have]) => [String(kind), String(have), String(int(r, 10, 40))])
		),
	stand: (r, s) =>
		table(
			['Season', 'Packets sold', 'Best seller'],
			['Spring 2025', 'Autumn 2025', 'Spring 2026'].map((season) => [season, String(int(r, 300, 1400)), pick(r, ['tomatoes', 'sweet peas', 'salad leaves', 'runner beans', 'sunflowers'])])
		)
};

// ---------------------------------------------------------------------------------------------------------
// Topics. A thread has a main matter, often a quick question, and up to two smaller matters raised on the way.
// What a thread is really about and how it ended are never written down: they follow from the messages.
type Area = 'parcel' | 'seeds' | 'website' | 'advice' | 'trade' | 'other';
type Outcome = 'sorted' | 'sent' | 'owe' | 'passed' | 'quiet';
/** One exchange: what the customer says, what we answer, and a pasted thing (with 'a', pasted by us). */
type Turn = [string, string, string?, 'a'?];
interface Pass {
	who: Who;
	/** The internal note that hands the matter over. */
	note: string;
	/** The first message to the customer after the handover. */
	ack: string;
	/** Sometimes the matter comes back settled: the message, the customer's answer, and how it then ended. */
	back?: [string, string, 'sorted' | 'sent'];
}
interface Topic {
	key: string;
	area: Area;
	weight: number;
	/** Which order the matter is about: one sent out days ago, one placed just before the thread, an older one, or none. */
	order: 'recent' | 'fresh' | 'older' | 'none';
	skus?: readonly Sku[];
	setup?: (r: Rand, s: Slots) => void;
	/** Written on behalf of a school, society or business. */
	org?: boolean;
	/** As the main matter, where the customer lives: town, postcode area, region. Such a topic is never a smaller matter. */
	places?: readonly (readonly [string, string, string])[];
	/** The customer has no orders on record. */
	noOrders?: boolean;
	subjects: string[];
	/** The customer's first message about it, two ways. */
	open: [string, string];
	/** The matter raised later in a thread about something else. */
	side: string;
	/** The matter as a quick question, and our answer. */
	quick: [string, string];
	/** Our first answer, which asks for `need`. */
	reply: string;
	need: string;
	turns: Turn[];
	/** We sort it in the thread, and the customer says it worked. */
	fix?: [string, string];
	/** We send a refund or a replacement, and the customer thanks us. */
	send?: [string, string];
	/** A further request at the end, and what we then owe, after "I'll". */
	follow?: [string, string];
	pass?: Pass;
}

const topics: Topic[] = [
	{
		key: 'lost-parcel',
		area: 'parcel',
		weight: 3,
		order: 'recent',
		setup: (r, s) => {
			s.trackKind = 'wrong';
			[s.safe, s.safeShort] = pick(r, [['in the porch', 'porch'], ['behind the green bin', 'behind bin'], ['in the meter cupboard', 'meter box'], ['in the parcel box by the garage', 'parcel box'], ['by the back door', 'rear door']]);
			s.wrongHouse = pick(r, [`number ${int(r, 2, 60)}`, 'the house on the corner', 'the flats opposite', `number ${int(r, 2, 60)}a`]);
			s.wrongName = pick(r, ['Mrs ', 'Mr ', '']) + pick(r, surnames);
			s.wrongPostcode = s.postcode!.slice(0, -2) + pick(r, ['AB', 'DT', 'LH', 'PW', 'SR']);
		},
		subjects: ['Order {order} not arrived', "Parcel says delivered but it isn't here", 'Missing parcel', 'Where is my order?'],
		open: [
			`My order {order} shows as delivered on the tracking but nothing has turned up. I've looked round the front and the back and asked next door. It had the {variety} {kind} in it, which I wanted to get in this weekend.`,
			`The tracking for order {order} says the parcel was delivered on {deliveredDay}, but I was in all day and nobody came to the door. Could you look into it? I don't want to miss the sowing window for the {variety}.`
		],
		side: `My last parcel (order {order}) says delivered on the tracking, but I haven't got it. Is there any way to see where it was left?`,
		quick: [`Do you use the same courier for every order? Ours is hopeless round here.`, `Almost always: small parcels go with Parcelline from our warehouse at Hollin Lane, and only very heavy orders, seed potatoes in spring mostly, go by van.`],
		reply: `I'm sorry it hasn't reached you. The courier's scan says it was left {safe}. Could you have a look there, and if it isn't, send me the tracking page as you see it? Sometimes the postcode on their side tells us more than ours does.`,
		need: 'the tracking page as you see it',
		turns: [
			[`Nothing {safe}, I'm afraid. Here's what the tracking shows me:`, `Thanks. The last scan was logged against {wrongPostcode}, not {postcode}, so the driver's handset put it at a different address. That usually means the right street but the wrong house, or a house with a similar number.`, 'tracking'],
			[`There's {wrongHouse} a few doors down. Would that be it? I'll knock tonight.`, `That would fit. If it isn't there either, let me know and we'll take it from there; you shouldn't have to go house to house for it.`]
		],
		fix: [`Did the neighbours have it? If not, tell me and I'll arrange the next step today.`, `Found it! {wrongName} at {wrongHouse} had taken it in and put it in their shed, of all places. Everything's there and dry. Sorry to have bothered you.`],
		send: [`As it still hasn't turned up, I've asked the warehouse to send the same items again today, at no cost, and put a note on the label that it mustn't be left unattended. If the first parcel ever appears, please give it to someone at the allotment rather than posting it back.`, `That's very kind, thank you. The new one arrived this morning, handed to me at the door this time.`],
		follow: [`Thanks again. Could you ask the courier to tell its drivers which house is ours? It's not the first time.`, `ask Parcelline to put a note on your address for its drivers, and confirm once it's done`],
		pass: {
			who: 'warehouse',
			note: `Parcelline scanned {order} as delivered at {wrongPostcode}; the customer is at {postcode} and the neighbours don't have it. Asked Jo at Hollin Lane to open a missing-parcel claim and to hold off on a resend until the courier answers (they allow themselves five working days).`,
			ack: `I've asked our warehouse to open a claim with Parcelline. The courier gives itself five working days to trace a parcel, so I'll write again by {plusWeek} either way, with your parcel or with a replacement.`,
			back: [`Parcelline traced it: the driver left it at {wrongHouse}. They've collected it, and it goes back out on tomorrow's round with a signature needed.`, `It's here, thanks for chasing. A bit battered but all the packets are fine.`, 'sorted']
		}
	},
	{
		key: 'damaged-parcel',
		area: 'parcel',
		weight: 2,
		order: 'recent',
		setup: (r, s) => {
			s.damage = pick(r, ['soaked through', 'split along one side', 'crushed flat', 'torn open at the corner']);
		},
		subjects: ['Damaged parcel', 'Order {order} arrived wet', 'Packets ruined', 'Parcel in a state'],
		open: [
			`Order {order} came today but the bag was {damage} and several of the packets inside are soggy. The {variety} packet has gone to pulp and the seeds are stuck together. It had been left on the step in the rain, I think, though the courier's photo shows it dry.`,
			`I'm sorry to complain, but the parcel for order {order} arrived {damage}. The paper packets have soaked up water and some of the seeds look as if they've started to swell. Is there anything that can be done?`
		],
		side: `The last parcel arrived {damage}, and a couple of the packets got wet, the {variety} among them. Are they still usable?`,
		quick: [`Are your packets recyclable? I've been putting them in the paper bin.`, `Yes, the outer packets are paper and go in with paper recycling. The little inner bags for the tiny seeds are glassine, which most councils also take with paper.`],
		reply: `Sorry about that, it's not how they should arrive. Could you tell me which packets got wet, and how wet? Some seeds dry out fine if they haven't started to swell, and I'd rather replace the ones that are past saving than guess.`,
		need: 'a list of the wet packets',
		turns: [
			[`Here's what was in the bag and how it looks:`, `Thank you, that's very clear. The seeds that are only damp on the outside will be fine if you spread them on kitchen paper somewhere warm for a day or two. The ones that have swollen or stuck together won't keep, so those are the ones to replace.`, 'wetList'],
			[`Will the dried ones still come up as well as fresh ones?`, `They should, as long as they dry within a couple of days and don't go mouldy. Seeds take up water slowly; it's sitting wet for a week that does the harm.`]
		],
		fix: [`If you dry the {variety} and the others as I described and sow them as normal, they should be fine. If any don't come up, tell me and I'll replace them then.`, `I dried them on the shelf above the radiator and sowed a test pinch of the {variety} in a tray. Almost all of them are up, so no harm done. Thanks for the advice.`],
		send: [`I've sent replacements for the ones that swelled, in a padded envelope this time; they should be with you in two or three days. No need to send anything back.`, `They arrived this morning, perfectly dry. Thank you for sorting it so quickly.`],
		follow: [`Could the warehouse use padded envelopes for my address from now on? Our post goes on an open step.`, `ask the warehouse whether they can mark your address for padded envelopes, and confirm once it's set up`],
		pass: {
			who: 'warehouse',
			note: `Another wet parcel to an open doorstep. Asked Jo at Hollin Lane whether the thin mailing bags changed supplier in September, and to check the roll this one came from.`,
			ack: `I've asked the warehouse to look at how this one was packed. I want to know whether it's the bag or the doorstep before I send anything else the same way, so I'll be back in touch once I hear.`,
			back: [`The warehouse found the cause: a roll of mailing bags that weren't sealed properly at the seam. They've taken the roll out of use, and your replacements went out today in a padded envelope.`, `Thanks for explaining. The replacements came this morning and they're bone dry.`, 'sent']
		}
	},
	{
		key: 'slow-remote',
		area: 'parcel',
		weight: 1.5,
		order: 'recent',
		places: [['Stornoway', 'HS1', 'the Isle of Lewis'], ['Kirkwall', 'KW15', 'Orkney'], ['Lerwick', 'ZE1', 'Shetland'], ['Tobermory', 'PA75', 'the Isle of Mull'], ['Brodick', 'KA27', 'Arran'], ['Bowmore', 'PA43', 'Islay']],
		setup: (r, s) => {
			s.trackKind = 'island';
			s.remote = s.region!;
			s.days = String(int(r, 8, 11));
		},
		skus: ['GAR-03', 'GAR-08', 'ONI-04', 'ONI-06', 'SHA-01'],
		subjects: ['How long to {remote}?', 'Order {order} took {days} days', 'Delivery times', 'Island delivery'],
		open: [
			`Order {order} took {days} days to reach me here on {remote}, and the website said two to three working days. The {variety} {kind} were starting to shoot by the time they came. Is there anything quicker for addresses up here?`,
			`A question about delivery: we're on {remote} and your parcels take well over a week. The last one, order {order}, took {days} days, and the {kind} in it didn't enjoy the trip. Is the "2 to 3 working days" at the checkout meant for us too?`
		],
		side: `Also, is there a faster delivery option for {remote}? Our last parcel took {days} days.`,
		quick: [`Is it worth paying extra for tracked delivery up here?`, `For the islands it mostly buys you the tracking rather than speed; the parcel crosses on the same freight either way.`],
		reply: `Thanks for telling me. I can see the parcel left our warehouse on {sentOut}. Could you tell me what the tracking shows between then and the day it reached you? That tells us whether it's the mainland leg or the crossing that's slow.`,
		need: 'what the tracking shows for the journey',
		turns: [
			[`The tracking says this:`, `That explains it: the parcel sat at the mainland hub for days waiting for freight space, which the courier doesn't count against its estimate. The estimate on our website is for mainland addresses, and it shouldn't be showing it to you as it does.`, 'tracking'],
			[`So is there any way round it, or do I just order earlier?`, `Ordering earlier is honestly the best answer for bulbs and sets. Seed packets mind much less; they keep happily for weeks in the post.`]
		],
		fix: [`If you order the garlic and sets as soon as they're listed in September, they'll be with you before they start growing. And the {kind} you have will still grow if you plant them now; the shoots don't harm them.`, `That's helpful, thanks. I've planted them and most have rooted already. I'll get my order in earlier next year.`],
		send: [`As the {kind} arrived much later than we said, I've refunded the delivery charge on order {order}. It should show on your card in three to five working days.`, `That's a kind gesture and not necessary, but thank you.`],
		follow: [`Could you let me know if you ever find a faster way to get parcels out to the islands?`, `ask the warehouse whether Parcelline's island service is any quicker and let you know what they say`],
		pass: {
			who: 'Ivo',
			note: `The checkout tells island and Highland postcodes "2 to 3 working days", which isn't true for them. Ivo, could the estimate show the longer time for these postcodes?`,
			ack: `Hello {first}, Ivo here; I look after the Fernbank website. Thanks for flagging this. I'm changing the delivery estimate so that addresses on the islands and in the Highlands see the longer times before they order, and I'll let you know when it's live.`,
			back: [`Hello again {first}, Ivo here. The checkout now shows "5 to 10 working days" for postcodes on {remote}. Thanks again for raising it.`, `Brilliant, I've just seen it. Much better to know up front.`, 'sorted']
		}
	},
	{
		key: 'bulb-condition',
		area: 'seeds',
		weight: 2,
		order: 'recent',
		skus: ['GAR-03', 'GAR-05', 'GAR-08', 'ONI-04', 'ONI-06', 'SHA-01'],
		setup: (r, s) => {
			s.state = pick(r, ['soft at the base', 'already sprouting green shoots', 'grey and powdery on the outside', 'papery and light']);
			s.batch = `B${int(r, 2100, 2399)}`;
		},
		subjects: ['{variety} {kind} problem', 'Order {order}: bulbs', 'Are these OK to plant?', 'Query about my {kind}'],
		open: [
			`The {variety} {kind} from order {order} arrived yesterday and some of them are {state}. I've never had that before. Are they safe to plant, or should I throw them away?`,
			`Quick question about the {variety} {kind} I received (order {order}). Several are {state}. I don't want to put anything diseased into my beds; we had white rot on the allotment three years ago and it took ages to clear.`
		],
		side: `And some of the {variety} {kind} that came in my last order were {state}. Should I worry?`,
		quick: [`How deep should the {variety} go?`, `About twice its own height of soil over the tip: roughly 2 to 3 cm for sets, a little deeper for garlic cloves in light soil.`],
		reply: `Thanks for checking before planting. Could you describe the worst ones for me, and give me the batch number from the label on the net bag? It starts with a B and four digits.`,
		need: 'a description of the worst ones and the batch number from the net bag',
		turns: [
			[`The label says this:`, `Thank you. Shoots and a little softness at the base are normal at this time of year; they're telling you they want to be in the ground. Grey powder is different: that's mould, and those should go in the bin, not the compost.`, 'batch'],
			[`So plant the shooting ones and bin the mouldy ones?`, `Exactly. Plant the shooting ones within the week, tip just below the surface. Anything grey, or that feels hollow when you squeeze it, goes in the bin.`]
		],
		fix: [`So plant the firm and sprouting ones this week, with the tip just showing, and they'll catch up quickly.`, `Done. They're in, and the shoots are already a couple of centimetres taller. Thanks for putting my mind at rest.`],
		send: [`I've sent you a fresh net of {variety} from the new batch, which came in from the grower on Monday. Plant the good ones you already have as well; you'll just have extra.`, `The new net arrived and they're lovely and firm. Thanks very much.`],
		follow: [`Will you tell me if the grower finds anything wrong with that batch? I want to know whether to watch the bed.`, `let you know what the grower says about batch {batch}`],
		pass: {
			who: 'supplier',
			note: `Batch {batch} of {variety}: customer reports grey mould on several. Emailed Gwen at Brecon Valley Growers with the description and asked whether anyone else has reported it.`,
			ack: `I've sent your description to our grower, Brecon Valley, and asked them to check the batch; I'd rather know than guess. I'll write as soon as I hear back.`,
			back: [`Brecon Valley have checked batch {batch}: one pallet was stored in a damp corner of their barn. They've pulled it, and I've sent you a fresh net from the next batch.`, `Thanks for following it up properly. The new net is firm and dry.`, 'sent']
		}
	},
	{
		key: 'ireland',
		area: 'parcel',
		weight: 1,
		order: 'none',
		noOrders: true,
		places: [['Skibbereen', 'P81', 'County Cork'], ['Ennis', 'V95', 'County Clare'], ['Galway', 'H91', 'Galway'], ['Kilkenny', 'R95', 'Kilkenny'], ['Bray', 'A98', 'County Wicklow'], ['Sligo', 'F91', 'Sligo']],
		setup: (r, s) => {
			s.irePlace = s.region ?? pick(r, ['County Cork', 'County Clare', 'Galway', 'Kilkenny', 'County Wicklow', 'Sligo']);
		},
		subjects: ['Delivery to Ireland?', 'Can you send to {irePlace}?', 'Checkout will not take my address', 'Posting to the Republic'],
		open: [
			`I'm in {irePlace} and tried to order sweet peas and garlic, but the checkout won't take my address. Do you not post to the Republic any more? I used to order from you every autumn.`,
			`Hello from {irePlace}. A friend in Shropshire recommended you. Is there any way to get seeds sent here? The website stops me at the address page.`
		],
		side: `By the way, my sister in {irePlace} wants to order from you. Can you post there?`,
		quick: [`Do you post to Northern Ireland?`, `Yes, we post to Northern Ireland, with a plant passport label where the seeds need one; it adds a day or so.`],
		reply: `Thanks for writing, and sorry for the frustration. Since the plant health rules for sending seeds and bulbs from Great Britain to the EU changed, we haven't been able to post to the Republic: each parcel would need its own certificate from an inspector. Could you tell me which items you were after? Some of our growers sell in Ireland directly, and I may be able to point you to them.`,
		need: 'which items you were after',
		turns: [[`It's mostly the sweet peas, Matucana and Cupani, and some garlic for planting.`, `For the garlic, there's a grower in the Irish Midlands who sells some of the same varieties. For the sweet peas, the Matucana we sell comes from a breeder who also supplies a seed shop in Dublin. I'm not allowed to post them myself, I'm afraid.`], [`Is there really no way round it? Could I pay for the certificate myself?`, `I did ask: the inspection and certificate cost us about £70 for each parcel, whatever is in it, so for almost any order it would cost more than the seeds.`]],
		fix: [`The Dublin shop lists the Matucana under the breeder's name, so you should be able to order it there without trouble.`, `Found them, ordered, and they arrived in two days. Thank you for going to the trouble.`],
		follow: [`Will you let me know if you ever start posting to Ireland again?`, `keep your address on a note and write to you if we're ever able to post to Ireland again`],
		pass: {
			who: 'Bridget',
			note: `Another customer in the Republic asking. Bridget, you said you'd look at the inspection costs again this autumn; one more for the count.`,
			ack: `Hello {first}, this is Bridget; I own Fernbank. I'm looking again at whether we can post to Ireland through an inspected consolidation service. It won't be quick, but I've added you to the list of people I'll write to when I know.`
		}
	},
	{
		key: 'change-address',
		area: 'parcel',
		weight: 1.5,
		order: 'fresh',
		setup: (r, s) => {
			s.newStreet = `${int(r, 1, 90)} ${pick(r, streetNames)}`;
			s.newTown = s.town!;
			s.newPostcode = postcodeIn(r, s.postcode!.split(' ')[0]!);
			s.workName = pick(r, ['the surgery', 'the library', 'Greystones Garage', 'the parish office', 'the primary school', 'Wye Valley Joinery']);
		},
		subjects: ['Wrong address on order {order}', 'Change of address', 'Can you redirect my parcel?', 'Address for order {order}'],
		open: [
			`I've just realised order {order} went in with our old address. We moved two weeks ago and the website remembered the old one. Is it too late to change it? The new address is {newStreet}, {newTown}.`,
			`Could order {order} go to my work address instead of home? Nobody's in during the day and our courier leaves things in the street. It's {workName}, {newStreet}, {newTown}.`
		],
		side: `Could my last order, {order}, go to {newStreet}, {newTown} instead? We've just moved.`,
		quick: [`Can I change my saved address myself?`, `Yes: sign in, then Account, then Addresses. The one marked "default" is the one the checkout fills in.`],
		reply: `No problem; let me check whether it has left the warehouse yet. Could you confirm the full postcode for {newStreet}? I'd rather not get it wrong twice.`,
		need: 'the postcode for the new address',
		turns: [[`It's {newPostcode}.`, `Thanks. I've asked the warehouse to hold the parcel if it's still with them and to change the label; I'll let you know what they say.`], [`Will it still arrive this week? The {kind} need to go in soon.`, `It should: the warehouse sends out every afternoon, and a parcel held for a new label goes in the next collection.`]],
		fix: [`The warehouse changed the label and it went out this afternoon to {newStreet}. You should have it in a day or two.`, `It came today, to the right address. Thank you!`],
		send: [`It turns out the parcel had already gone to the old address and came back to us marked "not known at this address". I've sent it out again to {newStreet} and haven't charged for the second delivery.`, `It's arrived, thank you. Sorry for the trouble.`],
		follow: [`Could you also change the address on my account, so the next order goes to the right place?`, `update the default address on your account and confirm when it's done`],
		pass: {
			who: 'warehouse',
			note: `{order} had left Hollin Lane before I asked. Jo is asking Parcelline to redirect it; they charge us £4 and it isn't guaranteed.`,
			ack: `It had already left the warehouse by the time your message reached me, so I've asked them to get the courier to redirect it. That usually works, but not always. I'll let you know as soon as I hear.`,
			back: [`The courier redirected it and it should reach {newStreet} tomorrow. There's no charge to you.`, `It came this morning. Thanks so much.`, 'sorted']
		}
	},
	{
		key: 'germination-sowing',
		area: 'advice',
		weight: 3,
		order: 'older',
		skus: ['PAR-02', 'PAR-05', 'CAR-09', 'CAR-12', 'PSL-01', 'LET-15', 'SPI-08', 'BEE-10'],
		setup: (r, s) => {
			const [cause, tip] = pick(r, [
				['the soil was still below about 7°C when they went in, and the seed sat and rotted rather than waiting', 'wait until the soil has warmed, and cover the row with fleece for the first fortnight'],
				['the surface dried into a crust after the rain, which small seedlings cannot push through', 'water the drill before sowing, cover the seed with sieved compost rather than soil, and keep it damp until they show'],
				['the seed went in deeper than the packet suggests, and seeds that small have very little stored energy', 'sow no deeper than 1 cm and firm the soil gently with the back of a rake'],
				['the seedlings came up and were eaten the same night, so it looked as if nothing germinated', 'sow a pinch in a pot on the windowsill at the same time: if those come up and the row does not, it is slugs or woodlice']
			]);
			s.cause = cause;
			s.tip = tip;
			s.tipCap = cap(tip);
			s.rows = String(int(r, 2, 5));
			s.up = String(int(r, 0, 9));
			s.germ = String(int(r, 82, 95));
			s.test = String(int(r, 15, 19));
			s.sowHow = pick(r, ['direct, in drills, 2 cm deep', 'direct in the raised bed, raked in', 'in a seed tray in the cold frame', 'in the bed, then covered with a board for a week']);
		},
		subjects: ['{variety} {kind} not come up', 'Duff seeds?', 'Germination', 'Disappointed with the {variety}'],
		open: [
			`I sowed the {variety} {kind} on {sown}, {rows} rows of them, and I've had {up} seedlings in total. Everything else in the bed came up fine. I think the packet must have been a bad batch. Could you replace it?`,
			`Not very happy, I'm afraid. The {variety} {kind} I bought from you have been a complete failure: {up} plants from a whole packet. My neighbour's, from the garden centre, came up like cress. What's gone wrong?`
		],
		side: `Also, the {variety} {kind} I sowed on {sown} barely came up, {up} seedlings from {rows} rows. Is it me or the seed?`,
		quick: [`How long do {kind} take to show?`, `Anything from ten days to three weeks, depending on how warm the soil is; the colder it is, the longer they sit.`],
		reply: `I'm sorry they've let you down. Before I decide whether it's the seed, could you tell me how and when you sowed them: the date, how deep, straight into the ground or in trays, and what the weather did that fortnight? A page from your diary is perfect if you keep one.`,
		need: 'how and when you sowed them',
		turns: [
			[`Here's what I wrote down at the time:`, `Thank you, that's really useful. I've checked the batch: it tested at {germ}% in our own trays in August, well above the standard, so I don't think the seed was dead in the packet. From your notes, my guess is that {cause}.`, 'sowingLog'],
			[`I didn't know that. So what should I do differently?`, `Next time, {tip}. It makes more difference with {kind} than with almost anything else we sell.`]
		],
		fix: [`One way to settle it: put twenty of the seeds you have left on damp kitchen paper in a warm room. If most of them sprout within a week, the seed is fine and it was the conditions.`, `I did the kitchen paper test and {test} out of twenty sprouted in six days. So it was me after all! Thank you for explaining instead of just sending more.`],
		send: [`Even so, I've put a fresh packet of {variety} in the post so you can have another go with the tips above, no charge.`, `That's very generous, thank you. I'll follow your advice this time.`],
		follow: [`Do you have anything written down about sowing {kind}? The packet doesn't say much.`, `send you the longer growing sheet our head grower wrote for {kind}`],
		pass: {
			who: 'Rhys',
			note: `Customer's {variety} came up poorly; the batch tested at {germ}% in August. Rhys, could you look at their sowing notes and advise?`,
			ack: `Hello {first}, I'm Rhys, Fernbank's head grower. I've read your notes. I'd like to compare them with our own trial rows from the same weeks before I say anything definite, so give me a few days and I'll come back to you.`,
			back: [`Hello again {first}, Rhys here. Our own outdoor rows sown that week struggled too, and I'm fairly sure {cause}. The seed is fine. {tipCap}, and you'll see the difference.`, `Thanks Rhys, that's really helpful. I'll try again with your tips.`, 'sorted']
		}
	},
	{
		key: 'germination-lot',
		area: 'seeds',
		weight: 2,
		order: 'recent',
		skus: ['TOM-14', 'TOM-18', 'CHI-05', 'CHI-07', 'LET-12', 'KAL-03', 'CHA-02', 'LEE-06', 'COS-05'],
		setup: (r, s) => {
			s.lot = `L${int(r, 6100, 6899)}`;
			s.germ = String(int(r, 28, 46));
			s.cells = String(pick(r, [24, 40, 60]));
			s.up = String(int(r, 2, 9));
			s.sowHow = pick(r, ['modules, seed compost, heated propagator', 'seed tray, windowsill, lid on', 'modules in the greenhouse on a heat mat']);
		},
		subjects: ['{variety} {kind} failed', 'Problem with a packet', 'Germination of {variety}', 'Seeds not coming up'],
		open: [
			`The {variety} {kind} from order {order} haven't come up. I sowed them in modules in the greenhouse, with the same compost and heat mat as everything else, which is all up. {up} out of {cells} cells have a seedling.`,
			`I think there may be something wrong with the {variety} {kind}. I've sown them twice now, once in a tray and once in modules, and hardly any have come up. I've grown this variety from you before with no problem.`
		],
		side: `And the {variety} {kind} from the same order have barely come up: {up} out of {cells}.`,
		quick: [`Do you test every lot before you sell it?`, `Yes: every lot is tested in our own trays when it comes in, and again if we hold it for a second season.`],
		reply: `Sorry to hear that. Could you tell me the lot number printed on the back of the packet (it starts with L), and how you sowed them? I want to check it against our test records.`,
		need: 'the lot number from the packet and how you sowed them',
		turns: [
			[`The lot number is {lot}. I sowed them like this:`, `Thank you. Your sowing sounds fine. I've looked up lot {lot}: its August test came out lower than earlier lots. It passed, but only just, so I'm going to test what we still hold.`, 'sowingLog'],
			[`OK, thanks. Let me know.`, `I've had a tray of lot {lot} on the bench for nine days: {germ} out of a hundred have come up. That isn't good enough, and it isn't your sowing.`]
		],
		send: [`I've refunded the {price} for the packet and sent you one from the new lot, which tested at 91%. We've taken lot {lot} off sale.`, `Thank you for being so straightforward about it. The new packet is already showing seedlings after five days.`],
		follow: [`Could you let me know whether other people have had problems with that lot?`, `tell you how many other customers had lot {lot} once the warehouse has counted, and what we're doing for them`],
		pass: {
			who: 'supplier',
			note: `Lot {lot} of {variety} retested at {germ}%. Sent the result to Gwen at Brecon Valley and asked for their own figure and a replacement lot.`,
			ack: `I've sent our test result to the grower who supplied that lot and asked for their records. I'll come back to you as soon as they've answered; either way you won't be out of pocket.`,
			back: [`The grower confirmed lot {lot} was harvested in a wet week and should never have passed their own check. I've refunded the packet and sent one from the new lot.`, `Thanks for following it up. The replacement came today.`, 'sent']
		}
	},
	{
		key: 'wrong-variety',
		area: 'parcel',
		weight: 2,
		order: 'recent',
		setup: (r, s) => {
			const [sku, wrong] = pick(r, [['PEA-01', 'Hurst Green Shaft'], ['SWP-11', 'Cupani'], ['SWP-14', 'High Scent'], ['TOM-14', 'Sungold'], ['BEAN-02', 'Crimson Flowered'], ['LET-12', 'Winter Density'], ['PAR-02', 'Gladiator'], ['CAR-09', 'Flyaway'], ['CHI-05', 'Padron']] as const);
			useSku(s, sku);
			s.wrong = wrong;
			s.lot = `L${int(r, 6100, 6899)}`;
			s.germ = String(int(r, 85, 97));
			s.why = pick(r, ['it does well in our cold, windy garden', 'it was what my dad always grew', 'the village show schedule names it', 'it suits our short season', 'my wife is particular about it']);
		},
		subjects: ['Wrong seeds in order {order}', 'Not what I ordered', 'Packet mix-up?', 'Order {order}'],
		open: [
			`I ordered {variety} {kind} (order {order}) but the packet I received says {wrong} on the front. Could you check what I've actually got?`,
			`Small mix-up with order {order}: there's a packet of {wrong} where the {variety} should be. I'd chosen {variety} specially because {why}.`
		],
		side: `Oh, and order {order} had {wrong} in it instead of the {variety} I ordered.`,
		quick: [`Is {wrong} any good, as it happens?`, `It's a lovely variety in its own right, a little later than {variety} and a little taller.`],
		reply: `I'm sorry about that. Could you tell me what the back of the packet says, the lot number especially? That tells me whether one packet went in the wrong parcel or a whole box was mislabelled.`,
		need: 'what the back of the packet says',
		turns: [[`Here's the back:`, `Thanks. Lot {lot} is {wrong}, so the packet is labelled correctly; it simply went into your parcel instead of {variety}. That's a picking mistake at the warehouse, where the two sit side by side on the shelf.`, 'packetBack'], [`Are they similar enough that I could just sow the {wrong}?`, `They're both good, but {wrong} is a little later and a little taller. If you chose {variety} for a reason, it's worth having the right one.`]],
		send: [`I've posted a packet of {variety} today, first class. Keep the {wrong} with our apologies; it's worth growing.`, `The {variety} arrived this morning. Thank you, and I'll give the {wrong} a go too.`],
		follow: [`Could you make sure my next order is checked? I'm ordering the rest of next year's seeds in January.`, `put a note on your account so the warehouse double-checks your January order before it's packed`],
		pass: {
			who: 'warehouse',
			note: `{order}: {wrong} picked instead of {variety}. Asked Hollin Lane to check the shelf in case packets have been put back in the wrong slot, and to send the right packet.`,
			ack: `I've asked the warehouse to check the shelf, in case more packets have strayed, and to send you the right one. I'll confirm when it's on its way.`,
			back: [`The warehouse found six packets of {wrong} in the {variety} slot, all now moved. Your packet of {variety} went out this morning.`, `Got it, thank you. Good that it was caught for others too.`, 'sent']
		}
	},
	{
		key: 'not-true',
		area: 'seeds',
		weight: 1.5,
		order: 'older',
		setup: (r, s) => {
			const [sku, should, got] = pick(r, [
				['SQU-06', 'a pale blue-grey squash with orange flesh', 'green and striped, more like a marrow'],
				['TOM-14', 'small red cherry tomatoes', 'large yellow fruit the size of a fist'],
				['SWP-17', 'cream with a purple edge', 'plain white'],
				['BEAN-09', 'a climbing French bean', 'dwarf plants with flat purple pods'],
				['KAL-03', 'dark, blistered leaves', 'curly green kale'],
				['SQU-09', 'a bright orange onion-shaped squash', 'pale yellow and long']
			] as const);
			useSku(s, sku);
			s.should = should;
			s.got = got;
			s.lot = `L${int(r, 5200, 5999)}`;
		},
		subjects: ['{variety} not what it should be', 'Odd {kind} this year', 'Not true to type?', 'Strange crop'],
		open: [
			`I grew your {variety} {kind} this year and they've turned out nothing like the picture. {variety} should be {should}, but every plant is {got}. All from the same packet, bought in the spring.`,
			`Something odd happened with the {variety} {kind} I bought in the spring. The plants were healthy but the crop is {got}, not {should}. Have you had other reports?`
		],
		side: `Something else: my {variety} {kind} turned out {got} instead of {should}. Was the seed crossed?`,
		quick: [`Can I save seed from the {variety}?`, `Not true to type if it's an F1; the next generation goes back to its parents. Open-pollinated varieties you can save, given some distance from other varieties.`],
		reply: `That does sound wrong. Could you send me some notes on the plants and what they produced, and the lot number from the packet if you still have it? I'll check our records for that lot.`,
		need: 'notes on the plants and the lot number',
		turns: [[`The packet says lot {lot}. Here's what each plant did:`, `Thank you. That's clearly not {variety}. Lot {lot} came from a grower we've used for years, and I'm going to ask them what happened; a crossed or mixed lot is rare, but it happens in a wet year.`, 'cropNotes'], [`Will next year's packets come from the same grower?`, `Not from lot {lot}: that's withdrawn as of today. The next harvest comes from a different field, and we grow a row of it ourselves before we sell it.`]],
		send: [`I've refunded the packet, {price}, and added a £5 credit to your account for the season's trouble; it comes off your next order automatically.`, `That's very fair, thank you. I'll be ordering again in January.`],
		follow: [`I'd really like to know what went wrong, if you find out.`, `pass on what the grower says about lot {lot} when I hear`],
		pass: {
			who: 'supplier',
			note: `{variety} lot {lot}: customer's plants are {got}. Asked Gwen at Brecon Valley whether the seed crop was isolated properly and whether another variety was flowering nearby.`,
			ack: `I've written to the grower with your notes. It may take a week or two, as they'll want to check their field records. I'll write to you when they answer.`,
			back: [`The grower has written back: a neighbouring field had another variety in flower at the same time, and the distance wasn't enough that year. They've withdrawn the rest of the lot. I've refunded your packet.`, `Thanks for finding out, that's really interesting. And thank you for the refund.`, 'sent']
		}
	},
	{
		key: 'missing-item',
		area: 'parcel',
		weight: 2,
		order: 'recent',
		subjects: ['Missing packet from order {order}', 'Order {order} incomplete', 'Something missing', 'Parcel short'],
		open: [
			`My parcel came today (order {order}) but the {variety} isn't in it. Everything else on the packing slip is there.`,
			`Order {order} arrived, but I count one packet fewer than I paid for. The packing slip lists the {variety} {kind}, but there's no packet in the bag; I've checked all the folds.`
		],
		side: `Also, the {variety} was missing from my last parcel, order {order}.`,
		quick: [`Do you pack the bulbs separately?`, `Yes: garlic, onion and shallot sets come in their own box from the warehouse's bulb store, so an order with both arrives in two parcels.`],
		reply: `Sorry about that. Could you check one thing for me first: was there a second parcel? Orders with bulbs or green manure come in two, and the second can be a day behind. If not, I'll get it to you.`,
		need: 'whether a second parcel came',
		turns: [[`Just the one parcel, and here's the slip against what was in it:`, `Thanks for checking so carefully. The slip shows it was picked, so it either slipped out at packing or never went in. Either way it's ours to put right.`, 'packingSlip'], [`It's not urgent, but I'd like it before the weekend if possible.`, `Understood. Anything posted first class by Wednesday usually arrives by Friday.`]],
		fix: [`If it hasn't turned up by the weekend, tell me and I'll post one straight away.`, `Found it! It had slipped inside the folded packing slip. Sorry to have troubled you.`],
		send: [`I've posted the missing packet first class today. It should be with you in a day or two.`, `It came this morning, thank you.`],
		follow: [`While you're at it, could you tell me whether the {variety} need sowing before Christmas? I want to plan the beds.`, `check the sowing dates for the {variety} with our head grower and let you know`],
		pass: {
			who: 'warehouse',
			note: `{order}: {variety} missing though picked. Asked Hollin Lane to check the packing bench and send the packet.`,
			ack: `I've asked the warehouse to check the packing bench for your parcel and to send the packet. I'll let you know when it's on its way.`,
			back: [`The warehouse found your packet on the packing bench under a stack of envelopes. It went out first class today.`, `Received, thanks very much.`, 'sent']
		}
	},
	{
		key: 'low-count',
		area: 'seeds',
		weight: 1.5,
		order: 'recent',
		setup: (r, s) => {
			const [sku, stated, low] = pick(r, [['TOM-14', 30, 18], ['TOM-18', 10, 6], ['CHI-05', 20, 12], ['SWP-11', 25, 15], ['SQU-06', 8, 5], ['BEAN-07', 30, 19], ['COS-05', 100, 58]] as const);
			useSku(s, sku);
			s.stated = String(stated);
			s.counted = String(low + int(r, 0, 3));
			s.lot = `L${int(r, 6100, 6899)}`;
		},
		subjects: ['Packet contents', 'Short count in {variety}', 'How many seeds in a packet?', '{variety} packet'],
		open: [
			`The {variety} packet says it holds {stated} seeds. I counted {counted}. I know it says "about", but that's a big difference, particularly at {price} a packet.`,
			`Is it normal for the {variety} packet to have only {counted} seeds? The website says {stated}. I'm not trying to be awkward; I just want to plan my sowing properly.`
		],
		side: `And I counted only {counted} seeds in the {variety} packet; it says {stated}.`,
		quick: [`Why do some of your packets say "by weight"?`, `For very small seeds like carrots and lettuce we pack by weight, because counting a thousand seeds by hand isn't practical; the number on the website is the average for that weight.`],
		reply: `Thanks for counting; that's helpful. Could you tell me the lot number on the back? We count a sample of each lot when it's packed, and I'd like to check that one.`,
		need: 'the lot number',
		turns: [[`It's {lot}. Here's my count:`, `Thank you. Lot {lot} has larger seeds than usual, so packing by weight gave fewer per packet than we print; our own sample count for it was close to yours. The weight is right, but the number on the packet isn't, for this lot.`, 'count'], [`So should I expect fewer plants?`, `Not necessarily. Bigger seeds tend to germinate more strongly, and we test each lot for germination as well as counting it.`]],
		fix: [`Larger seeds usually mean stronger seedlings, so in practice you may well get as many plants. If you end up short, tell me and I'll top it up.`, `That makes sense, actually, and they're all up already. I'll leave it there. Thanks for explaining.`],
		send: [`I've posted a second packet so you have what the label promised, and some to spare.`, `It's arrived. Thank you, very generous.`],
		follow: [`Will you change the number on the website while this lot is selling?`, `ask Ivo to change the seed count on the website for lot {lot} and let you know when it's done`],
		pass: {
			who: 'Ivo',
			note: `Lot {lot} of {variety} averages {counted} seeds a packet against {stated} on the product page. Ivo, could the page give the lower figure while this lot is selling?`,
			ack: `Hello {first}, Ivo here; I look after the Fernbank website. I'll change the count shown for {variety} while this lot is on sale, and confirm when it's done.`,
			back: [`Hello again {first}, Ivo here. The page now says "{counted} to {stated} seeds, depending on lot". Thanks for spotting it.`, `Great, thank you.`, 'sorted']
		}
	},
	{
		key: 'hard-seed',
		area: 'advice',
		weight: 1.5,
		order: 'recent',
		skus: ['SWP-11', 'SWP-14', 'SWP-17'],
		setup: (r, s) => {
			s.sowedN = String(int(r, 16, 32));
			s.up = String(int(r, 4, 12));
		},
		subjects: ['Sweet peas not germinating', '{variety} sweet peas', 'Hard seeds?', 'Sweet pea question'],
		open: [
			`I sowed the {variety} sweet peas three weeks ago in root trainers in the cold frame, and only {up} of {sowedN} have come up. The rest are still hard little pellets when I dig them up. Are they dud?`,
			`About half of the {variety} seeds I sowed have done nothing at all. When I poke them they're exactly as they went in, rock hard. The other half are up and growing. Is that normal?`
		],
		side: `By the way, half my {variety} sweet peas are still hard as stones after three weeks.`,
		quick: [`Should I soak sweet peas before sowing?`, `Some people swear by it. We only soak the dark-seeded ones, and for a few hours at most, or they can rot.`],
		reply: `They're probably not dud. Some sweet pea seeds, the dark ones especially, have a very hard coat that won't take up water. Could you tell me what colour the ones that haven't moved are, and how you've been watering the trainers?`,
		need: "the colour of the seeds that haven't moved and how you've been watering",
		turns: [[`They're the dark, almost black ones. I water them from the bottom about twice a week.`, `That fits. Dark sweet pea seeds often have a coat that water can't get through. If you nick each one with nail clippers, on the side away from the little eye, they'll take up water within a day.`], [`Should I chip the pale ones too?`, `No need: the pale and speckled seeds take up water easily. Chipping is only for the dark, shiny ones that still look exactly as they went in.`]],
		fix: [`Try chipping a few of the hard ones and sowing them again. They should be up within ten days.`, `I chipped the hard ones and nearly all of them have come up now. Who knew! Thanks.`],
		send: [`As you've lost a few weeks, I've posted another packet, so you can sow a second batch now and still have strong plants by spring.`, `That's kind, thanks. I'll chip them before they go in this time.`],
		follow: [`Is there any way of knowing which varieties need chipping? I'm ordering more for next year.`, `send you a list of the sweet peas we sell that usually need chipping`],
		pass: {
			who: 'Rhys',
			note: `Hard-coated {variety}. Rhys, worth a word with them about overwintering too, as they sowed in autumn.`,
			ack: `Hello {first}, Rhys here, head grower at Fernbank. Nicking the dark seeds will sort the germination. I'll also send you a note on overwintering them in the cold frame, as autumn sowings need a bit of care through January.`,
			back: [`Hello again {first}, Rhys here. As promised: close the frame only on frosty nights, pinch the tips out at four pairs of leaves, and keep them on the dry side until March.`, `Thanks Rhys, I've printed that out for the shed wall.`, 'sorted']
		}
	},
	{
		key: 'damping-off',
		area: 'advice',
		weight: 1.5,
		order: 'recent',
		skus: ['LET-12', 'LET-15', 'SPI-08', 'MIC-01', 'CHA-02', 'KAL-03'],
		subjects: ['Seedlings keep dying', '{variety} seedlings collapsing', 'What am I doing wrong?', 'Seedlings falling over'],
		open: [
			`The {variety} {kind} I sowed in trays came up beautifully and then, over two days, most of them keeled over at the base as if they'd been pinched. I've lost two trays now. Is it something in the seed?`,
			`My {variety} seedlings are falling over. They look healthy, then the stem goes thin and dark just above the compost and they flop. Could the seed be carrying a disease?`
		],
		side: `Also, my {variety} seedlings keep collapsing at the base after they come up.`,
		quick: [`Should I use seed compost or multipurpose?`, `Seed compost for small seeds: it's finer and has less feed, which seedlings don't need for the first few weeks.`],
		reply: `What you're describing sounds like damping off, a fungus that lives in compost and water rather than in the seed. Could you tell me how you're watering, where the trays sit, and whether you reused trays or compost?`,
		need: "how you're watering and where the trays sit",
		turns: [[`I water them from above with a can most days, and they're on the kitchen windowsill above the radiator with a lid on to keep them warm. I washed last year's trays in the sink.`, `That's the recipe for damping off, I'm afraid: warm, still, wet air under the lid, and water on the stems. The fungus lives in old compost, in water butts and on trays that haven't been scrubbed.`], [`Can I save the seedlings that are still standing?`, `Possibly. Prick them out into fresh compost straight away, holding them by a leaf rather than the stem, and keep them on the dry side for a few days.`]],
		fix: [`Next tray: fresh compost, trays scrubbed in hot soapy water, water from below with tap water, and the lid off as soon as the first seedlings show. A small fan on low in the room helps too.`, `New tray done your way and not a single one has fallen over. Thank you!`],
		send: [`As you've lost two trays, I've posted a fresh packet of {variety} so you can start again properly.`, `That's very kind. The new ones are up and standing.`],
		follow: [`Do you sell anything for watering from below, like a capillary mat?`, `check whether we'll stock capillary matting next spring and let you know`],
		pass: {
			who: 'Rhys',
			note: `Damping off in {variety} trays on a windowsill over a radiator, lid on. Rhys, could you write to them? They've lost two trays.`,
			ack: `Hello {first}, I'm Rhys, Fernbank's head grower. I'll write you a fuller note on raising {kind} indoors at this time of year; the November light is the other half of the problem.`,
			back: [`Hello again {first}, Rhys here. In short: a south-facing sill without the radiator, lid off as soon as they show, water from below, and sow thinly so air moves between them.`, `Thanks Rhys. Moved them off the radiator and they're standing up straight.`, 'sorted']
		}
	},
	{
		key: 'seed-age',
		area: 'seeds',
		weight: 1,
		order: 'recent',
		skus: ['PEA-01', 'PEA-05', 'BEAN-07', 'TOM-14', 'CHI-05', 'SQU-09', 'COS-05', 'BEAN-09'],
		setup: (r, s) => {
			s.lot = `L${int(r, 4800, 5400)}`;
			s.germ = String(int(r, 84, 94));
			s.testMonth = pick(r, ['July', 'August', 'early September']);
		},
		subjects: ['Packed for date', 'Old seed?', '{variety} packet date', "Last year's packet?"],
		open: [
			`The {variety} {kind} I've just received say "packed for 2025" on the back. Is that old stock? I'd expect this year's seed at this price.`,
			`I've just noticed the {variety} packet in order {order} is dated for last season. Will it still be any good?`
		],
		side: `Also, the {variety} packet says "packed for 2025". Is it still all right?`,
		quick: [`How long do seeds keep?`, `It varies a lot: parsnips really only one season, peas and beans three or four years, tomatoes five or more if they're kept cool and dry.`],
		reply: `Good question. "Packed for" is the season a packet was filled for, and we keep a few varieties for two seasons when they keep well. Could you tell me the lot number? Then I can tell you exactly when it was last tested.`,
		need: 'the lot number',
		turns: [[`It's {lot}.`, `Lot {lot} was tested again in {testMonth} at {germ}%, well above the legal minimum for {kind}. So it's fine to sow, but I understand wanting this season's seed.`], [`Does it matter that the packet sat in a warehouse for a year?`, `Our seed store is kept cool and dry for exactly that reason; seed loses its life fastest in warm, damp air. A year there makes very little difference to peas and beans.`]],
		fix: [`I'd sow it with confidence, and if the germination disappoints, tell me and I'll replace it straight away.`, `Fair enough, that's reassuring. I'll sow it as planned.`],
		send: [`I've swapped it for this season's lot, posted today; keep the other packet too.`, `Thanks, that's arrived. Appreciated.`],
		follow: [`Could the website say which season a packet is from?`, `pass the idea to Ivo and let you know whether he can add the season to the product pages`]
	},
	{
		key: 'close-account',
		area: 'website',
		weight: 1,
		order: 'older',
		subjects: ['Delete my account', 'Please remove my details', 'Account closure', 'Closing my account'],
		open: [
			`Please delete my Fernbank account. I'm not unhappy with the seeds; I'm just cutting down the number of accounts I have online.`,
			`I'd like my account closed and my details removed. Before you do: will that delete my order history? I need this year's orders for my allotment association's accounts.`
		],
		side: `One more thing: could you close my account once my last order has arrived? I won't be ordering for a while.`,
		quick: [`Do you keep my card details?`, `No: card details stay with our payment provider. We only ever see the last four digits and the expiry month.`],
		reply: `Of course. Before I close it: closing the account removes your name, your email address and the sign-in. Your past orders stay in our books without your name attached, because we have to keep sales records for six years. Is that all right, and would you like a copy of your order history first?`,
		need: "whether you'd like a copy of your order history first",
		turns: [[`Yes please, a copy would be useful. Then go ahead.`, `Here's your order history as it stands today:`, 'orderHistory', 'a'], [`Will I still be able to order as a guest later on?`, `Yes, any time: guest orders don't need an account, and you can open a new account whenever you like.`]],
		fix: [`Your account is now closed. The sign-in and your contact details are gone, and the orders are kept without your name.`, `Thanks for doing that so promptly.`],
		follow: [`Will I still get the printed catalogue in January? I'd like that to stop too.`, `check that your address is off the catalogue posting list, which is kept separately, and confirm`],
		pass: {
			who: 'Ivo',
			note: `Account closure: there's a second account under an older email address with the same name and postcode. Ivo, could you check and close both?`,
			ack: `Hello {first}, Ivo here; I look after the website. There seems to be a second account in your name under an older email address. I'll check it's yours and close both, and confirm when that's done.`,
			back: [`Hello again {first}, Ivo here. Both accounts are closed now.`, `Thank you.`, 'sorted']
		}
	},
	{
		key: 'discount-code',
		area: 'website',
		weight: 2,
		order: 'recent',
		setup: (r, s) => {
			[s.code, s.codeDeal, s.codeAmount] = pick(r, [['ALLOT10', '10% off seeds for allotment society members', '£1.85'], ['SOWMORE', '£3 off when you spend £20 on seeds', '£3.00'], ['AUTUMN15', '15% off autumn sowing', '£2.40'], ['FERNCLUB', 'free delivery on any seed order', '£3.20']]);
			s.subtotal = pounds(int(r, 1400, 2400));
		},
		subjects: ['Discount code not working', '{code} rejected', 'Promo code', 'Code from the leaflet'],
		open: [
			`I tried to use the code {code} from your autumn leaflet, but the checkout says it isn't valid. I went ahead and paid full price (order {order}) because I wanted the garlic before it sold out. Can the discount still be applied?`,
			`The code {code} doesn't work at the checkout. It just says "This code can't be used with your basket". The leaflet says {codeDeal}, and I did order seeds (order {order}).`
		],
		side: `Also, the code {code} wouldn't go through on order {order}.`,
		quick: [`Do your codes work on sale items?`, `Most don't; leaflet and website codes are for full-price items only, unless the code says otherwise.`],
		reply: `Thanks for letting me know. Could you tell me what was in the basket when you tried it? Some codes have a minimum spend or leave out certain items, and the message isn't very clear about which.`,
		need: 'what was in the basket',
		turns: [[`Here's the basket as it was:`, `Thanks. {code} is for seed packets only, and your basket was mostly bulbs and sets, which the code leaves out, so the seed part came to less than the minimum. The message should have said so.`, 'basket'], [`Is there a list somewhere of what the code covers?`, `It's in the small print on the back of the leaflet: seed packets and green manure, not bulbs, sets or gift vouchers. I agree it's easy to miss.`]],
		fix: [`If you add one more seed packet next time, the code will apply; I've tried it with a test basket and it goes through.`, `Ah, that makes sense. I'll know for next time. Thank you.`],
		send: [`As the leaflet didn't make that clear, I've refunded what the code would have taken off, {codeAmount}, to your card.`, `That's very fair, thank you.`],
		follow: [`Could the leaflet say clearly that bulbs are left out?`, `pass that on to Bridget, who writes the leaflet, and let you know what she says`],
		pass: {
			who: 'Ivo',
			note: `{code} is turning away mixed baskets that should qualify. Ivo, could you check how the minimum is counted?`,
			ack: `Hello {first}, Ivo here; I set up the codes on the website. It looks as though {code} counts the whole basket against the rules rather than just the seeds. I'm looking into it and will write when it's fixed.`,
			back: [`Hello again {first}, Ivo here. {code} now works on mixed baskets, and I've refunded the {codeAmount} it should have taken off your order.`, `Brilliant, thanks Ivo.`, 'sent']
		}
	},
	{
		key: 'page-price',
		area: 'website',
		weight: 1,
		order: 'recent',
		skus: ['GRM-01', 'GRM-04', 'GRM-07', 'GAR-03', 'GAR-08', 'MIC-01'],
		setup: (r, s) => {
			const base = Number(s.pence);
			s.pageP = pounds(base * 2 - int(r, 40, 90));
			s.basketP = pounds(base * 2);
			s.diff = pounds(Number(s.basketP.replace(/[£.]/g, '')) - Number(s.pageP.replace(/[£.]/g, '')));
			s.priceDay = dayMonth(Number(s.openMs) - int(r, 14, 30) * DAY);
		},
		subjects: ['Price changed in the basket', 'Wrong price at checkout?', '{variety} price', 'Pricing question'],
		open: [
			`The {variety} page says {pageP} for the double size, but when I put it in the basket it went up to {basketP}. Which is right?`,
			`I think there's a pricing error: the double size of {variety} shows {pageP} on the product page but {basketP} in the basket. I've ordered anyway (order {order}), but I thought you should know.`
		],
		side: `By the way, the {variety} page shows {pageP} for the double size but the basket charged {basketP}.`,
		quick: [`Is the double size cheaper per gram?`, `A little, yes: it works out about 8% cheaper than two single packs.`],
		reply: `Thanks for flagging it. Could you tell me which size you chose and whether you changed anything on the page before adding it? I want to try the same steps myself.`,
		need: 'which size you chose and the steps you took',
		turns: [[`I picked the double size from the drop-down, changed the quantity to 1, then added it.`, `Thanks, I can repeat it. Prices went up on {priceDay}, and the product page is still showing the old price for the double size; the basket uses the new one.`], [`How long has the page been wrong?`, `Since the price change on {priceDay}, as far as I can tell, and only for the double sizes.`]],
		fix: [`I've corrected the price on the product page in the shop's back office, so the two now agree.`, `Thanks for sorting that.`],
		send: [`As you ordered at the price the page showed, I've refunded the difference of {diff} to your card.`, `Thank you, that's fair.`],
		follow: [`Could you check whether any other pages have the old prices? I was about to order the garlic as well.`, `go through the other double-size pages this week and write back once they're all checked`],
		pass: {
			who: 'Ivo',
			note: `Double-size prices on some product pages didn't pick up the {priceDay} change; the basket did. Ivo, could you check all the size options?`,
			ack: `Hello {first}, Ivo here; I look after the website. It looks as though the price change didn't reach the size options on some pages. I'm going through them all and will let you know when they're right.`,
			back: [`Hello again {first}, Ivo here. All the size options now show the current prices. I've also refunded you the {diff} difference.`, `Thank you both.`, 'sent']
		}
	},
	{
		key: 'invoice',
		area: 'website',
		weight: 1.5,
		order: 'recent',
		setup: (r, s) => {
			s.inv = `FB-${String(int(r, 140, 460)).padStart(6, '0')}`;
			s.orgName = pick(r, [`${s.town} Allotment Society`, `${pick(r, surnames)} Cut Flowers`, `${s.town} Community Garden`, `The ${pick(r, ['Walled', 'Kitchen', 'Old Rectory', 'Orchard'])} Garden Trust`, `${pick(r, ['Upper', 'Lower', 'Little'])} ${pick(r, ['Brook', 'Marsh', 'Down'])} Market Garden`]);
		},
		subjects: ['VAT invoice please', 'Invoice for order {order}', 'Receipt for our treasurer', 'Invoice needed'],
		open: [
			`Could I have a proper invoice for order {order}? It was for our shared plot, and our treasurer needs one with the right name on it: {orgName}.`,
			`I need an invoice for order {order} for my business accounts; it's for {orgName}. The packing slip doesn't show your company details.`
		],
		side: `And could I have an invoice for order {order}, made out to {orgName}?`,
		quick: [`Can I get an invoice for every order automatically?`, `Yes: there's a box at the checkout, "Send me an invoice", and the invoice comes with the order from then on.`],
		reply: `Happy to. Could you confirm the name and address you'd like on it? Once an invoice has a number it can't be reissued to a different name, so I'd like to get it right first time.`,
		need: 'the name and address for the invoice',
		turns: [[`Please put {orgName}, care of me, at {street}, {town}.`, `Thank you. Here's how it reads:`, 'invoice', 'a'], [`Does it need to show VAT?`, `Seeds for food crops are zero-rated, so those lines show 0%; flower seeds carry VAT, and the invoice shows it separately for those lines.`]],
		fix: [`I've attached invoice {inv} as a PDF. It has our company details and the name and address you gave me.`, `Perfect, thank you. That's exactly what was needed.`],
		follow: [`Could you do the same for our two spring orders?`, `make invoices for the two spring orders on your account and send them by the end of the week`],
		pass: {
			who: 'Della',
			note: `{orgName} wants invoices for this and earlier orders. Della, worth setting them up as an account?`,
			ack: `Hello {first}, Della here; I look after trade and society accounts. I'll prepare the invoice and set {orgName} up as an account, so that future orders are invoiced to it without you having to ask.`,
			back: [`Hello again {first}, Della here. Invoice {inv} is attached, and the account is set up: from your next order, invoices go to {orgName} automatically.`, `Thank you, that will save a lot of hassle.`, 'sorted']
		}
	},
	{
		key: 'guest-orders',
		area: 'website',
		weight: 1.5,
		order: 'recent',
		setup: (r, s) => {
			s.oldEmail = `${s.first!.toLowerCase()}${int(r, 10, 99)}@${pick(r, mailHosts)}`;
		},
		subjects: ["Can't log in", 'Account not recognised', 'Where are my orders?', 'Login problem'],
		open: [
			`I'm trying to sign in to see my past orders, but the site says there's no account with my email address. I've ordered from you several times, the last one only recently (order {order}).`,
			`Your website doesn't recognise my email. I definitely ordered from you in the spring and again this autumn. Has my account been deleted?`
		],
		side: `Also, the website says there's no account for my email address, though I've ordered several times.`,
		quick: [`Do I need an account to order?`, `No, you can check out as a guest; an account just lets you see past orders and saves your address.`],
		reply: `Sorry for the confusion. Could you tell me whether you made an account when you ordered, or went through "check out as a guest"? Guest orders aren't linked to a sign-in, which would explain it.`,
		need: 'whether you checked out as a guest',
		turns: [[`I don't remember choosing. Maybe guest?`, `That's it: your orders are all guest orders, under {email}, so there's nothing to sign in to yet.`], [`Will my address come across too?`, `Not from guest orders, I'm afraid. Add it once in your account and the checkout fills it in from then on.`]],
		fix: [`If you create an account with the same email address, the website links your earlier guest orders to it automatically, so you'll see all of them.`, `Done, and all my orders are there. Thanks!`],
		follow: [`One of my older orders was under a previous address, {oldEmail}. Can that be added too?`, `ask Ivo to move the order under {oldEmail} onto your account and confirm when it's done`],
		pass: {
			who: 'Ivo',
			note: `Guest orders under two email addresses, {email} and {oldEmail}. Ivo, could you put them all under one account?`,
			ack: `Hello {first}, Ivo here; I look after the website. Some of your orders are under {oldEmail}, so I'll bring them together under one account and let you know when it's done.`,
			back: [`Hello again {first}, Ivo here. All your orders are now under {email}; sign in with that and you'll see them.`, `Thanks Ivo, I can see them all.`, 'sorted']
		}
	},
	{
		key: 'back-in-stock',
		area: 'other',
		weight: 1.5,
		order: 'older',
		skus: ['BEAN-04', 'GAR-05', 'SHA-01', 'SWP-17', 'GRM-07', 'CHI-07', 'SQU-06'],
		setup: (r, s) => {
			s.when = dayMonth(Number(s.openMs) + int(r, 14, 40) * DAY);
			s.alt = ({ 'BEAN-04': 'Aquadulce Claudia', 'GAR-05': 'Solent Wight', 'SHA-01': 'Radar onion sets', 'SWP-17': 'Matucana', 'GRM-07': 'grazing rye', 'CHI-07': 'Hungarian Hot Wax', 'SQU-06': 'Uchiki Kuri' } as Record<string, string>)[s.sku!]!;
		},
		subjects: ['When will {variety} be back?', '{variety} out of stock', 'Back in stock?', 'Sold out'],
		open: [
			`Is the {variety} coming back this season? It's been showing as out of stock for weeks, and it's the one I've been waiting for.`,
			`I'd hoped to order {variety} {kind}, but it's showing as sold out. Do you know when you'll have more? I bought it last year and it did really well.`
		],
		side: `Is there any news on the {variety}? It's still showing as sold out.`,
		quick: [`Why do some things sell out so early?`, `Mostly because our growers save only so much of each variety, and a wet harvest can halve it.`],
		reply: `Thanks for asking. Our grower's harvest of {variety} came in late this year. Do you need it for sowing or planting this autumn, or would spring do? That changes what I'd suggest.`,
		need: 'whether you need it this autumn or in spring',
		turns: [[`I was hoping to get it in this autumn, ideally.`, `Then it's tight: the new harvest reaches us around {when}. If that's too late, {alt} is the closest thing we have in now.`], [`Is the {alt} as good?`, `It's very close, and just as reliable. Most people who try it in a sold-out year end up growing both.`]],
		fix: [`The grower sent an early part of the harvest, and the {variety} is back on sale as of this morning.`, `Ordered within ten minutes of reading this. Thank you!`],
		follow: [`Do you know whether you'll have more next autumn? I'd like to plan ahead.`, `ask the grower how much {variety} they plan to grow next year and let you know`],
		pass: {
			who: 'supplier',
			note: `Customer waiting on {variety}. Asked Gwen at Brecon Valley for a firmer date for the new harvest.`,
			ack: `I've asked the grower for a firmer date, as their last estimate was vague. I'll let you know what they say.`,
			back: [`The grower says the {variety} will be cleaned and packed by {when}, and we'll have it on sale the same week.`, `Thanks, I'll look out for it.`, 'sorted']
		}
	},
	{
		key: 'broad-beans',
		area: 'advice',
		weight: 2,
		order: 'recent',
		skus: ['BEAN-02', 'BEAN-04'],
		subjects: ['Autumn sowing broad beans', '{variety} question', 'Mice and broad beans', 'When to sow?'],
		open: [
			`I've got a packet of {variety} from you and I'm thinking of sowing them this autumn for the first time. When's the latest I can sow, and should they be covered over winter? We're on a fairly exposed site outside {town}.`,
			`Last autumn I sowed broad beans in November and something dug up every single one. I'd like to try again with the {variety} I've just bought. Any tips?`
		],
		side: `Separately, I've got your {variety} broad beans for autumn sowing. Pots or straight in the ground?`,
		quick: [`Do broad beans need support?`, `Autumn-sown ones do, as they get tall and top-heavy by May: a string around canes at the corners of the row is enough.`],
		reply: `Good choice. Could you tell me what your soil is like, and whether the site gets wet in winter? Beans sown in autumn stand cold well but hate sitting in water.`,
		need: 'what your soil is like and whether it gets wet in winter',
		turns: [
			[`It's heavy clay, and the bottom of the plot does stay wet.`, `Then I'd sow in deep pots or root trainers in a cold frame or unheated greenhouse at the end of October, and plant them out when they're about 10 cm tall. Sown straight into cold wet clay they tend to rot, and mice find them more easily too.`],
			[`What about the mice?`, `Mice find beans by smell. Pots raised off the ground help, and some growers put holly leaves in the drill. Nothing is perfect, but raising them in pots does most of the work.`]
		],
		fix: [`So: deep pots in the cold frame now, out in March or whenever they're 10 cm tall, and fleece on hand for the worst frosts.`, `I sowed them in deep pots in the cold frame and every one has come up, with no mice so far. Thanks!`],
		follow: [`Do you have a guide to overwintering broad beans and peas?`, `send you our sheet on overwintering broad beans and peas`],
		pass: {
			who: 'Rhys',
			note: `Autumn broad beans on wet clay, mice last year. Rhys, could you give them your view on sowing in situ against pots?`,
			ack: `Hello {first}, I'm Rhys, Fernbank's head grower. On heavy clay I'd always start them in pots, but let me check the soil temperature figures from our own beds this week and send you dates that suit your area.`,
			back: [`Hello again {first}, Rhys here. Our beds were at 9°C last week, so sow in pots now and plant out from late February on a mild spell.`, `Perfect, thank you.`, 'sorted']
		}
	},
	{
		key: 'garlic-clay',
		area: 'advice',
		weight: 1.5,
		order: 'recent',
		skus: ['GAR-03', 'GAR-05', 'GAR-08'],
		setup: (r, s) => {
			s.soilKind = pick(r, ['heavy clay', 'clay loam', 'silty, sticky when wet']);
			s.plotName = pick(r, ['plot 14', 'the back garden', 'bed 3', 'the long border']);
		},
		subjects: ['Garlic on clay', 'Planting the {variety}', 'Garlic advice', 'Which garlic for our soil?'],
		open: [
			`I've ordered the {variety} garlic and I'm worried about our soil, which is {soilKind}. Last time I grew garlic the cloves rotted over winter. Should I plant in pots or wait until spring?`,
			`Is it too late to plant the {variety} garlic I bought? And our ground is {soilKind}, which I'm told garlic hates. What would you do?`
		],
		side: `Also, how would you plant the {variety} garlic in {soilKind}?`,
		quick: [`Should I split the garlic bulbs before planting?`, `Yes, just before planting: separate the cloves, keep the papery skin on, and plant the biggest ones.`],
		reply: `Garlic likes a cold winter, so autumn is the right time, but it does hate sitting wet. Could you tell me how the ground drains, or send the result of a soil test if you've done one?`,
		need: 'how the ground drains, or a soil test',
		turns: [
			[`We did a test kit last month:`, `Thanks. The soil itself is fine for garlic; it's the drainage. On clay I'd plant on a ridge, or in a raised bed with grit worked into the top 15 cm, and set each clove on a pinch of sharp sand.`, 'soil'],
			[`How late can I leave it?`, `Before Christmas is ideal. In a very wet November, start the cloves in modules in a cold frame and plant them out in February.`]
		],
		fix: [`So: ridges or a raised bed, grit in the top, a pinch of sand under each clove, and no later than mid December.`, `I made two ridges and planted the cloves in them, and the green tips are through already. Thanks for the help.`],
		follow: [`Would a different garlic suit our soil better next year?`, `ask Rhys which of our garlics did best on his clay beds this year and let you know`],
		pass: {
			who: 'Rhys',
			note: `Garlic on {soilKind}. Rhys, you grew all three on the heavy beds this year: which would you suggest?`,
			ack: `Hello {first}, Rhys here, Fernbank's head grower. I'll dig out my notes from the heavy-soil beds and tell you which of our garlics held up best there.`,
			back: [`Hello again {first}, Rhys here. On our clay beds Germidour and Solent Wight did best; Elephant garlic sulked. Plant on ridges either way.`, `Thanks Rhys, that's useful for next year.`, 'sorted']
		}
	},
	{
		key: 'seed-saving',
		area: 'advice',
		weight: 1.5,
		order: 'older',
		skus: ['BEAN-07', 'PEA-01', 'TOM-14', 'BEAN-09', 'PEA-05'],
		subjects: ['Saving my own seed', 'Can I save seed from {variety}?', 'Seed saving question', 'F1 or not?'],
		open: [
			`I want to start saving my own seed, starting with the {variety} {kind} I grew from your packet this year. Will they come true, and how do I keep them true in future?`,
			`Which of your varieties can I save seed from? I grew the {variety} this year and it was the best I've had. Is it an F1?`
		],
		side: `Can I save seed from the {variety} {kind}, by the way?`,
		quick: [`How do I store saved seed?`, `Dry it thoroughly, then keep it in paper envelopes in an airtight tin somewhere cool. The fridge door is fine.`],
		reply: `Seed saving is a great thing to get into. Could you tell me what else you grow near the {variety}, and roughly how far away? Whether saved seed comes true depends on that more than anything.`,
		need: 'what else grows near the {variety}, and how far away',
		turns: [[`Next to them on the allotment there's another plot with {kind} of a different kind, maybe ten metres away.`, `{variety} is open-pollinated, so seed you save will come true as long as it isn't crossed. For {kind}, ten metres is usually enough for peas, beans and tomatoes, which mostly pollinate themselves; squash and sweetcorn need far more.`], [`What about the squash on the plot next door?`, `Squash crosses easily over long distances, so saved squash seed rarely comes true on an allotment. Peas, beans and tomatoes are the ones to start with.`]],
		fix: [`So: pick the best plants, leave the pods or fruit to ripen fully on the plant, dry the seed indoors and store it in paper.`, `I saved a jar from the healthiest plants, dried on the windowsill. Already labelled for next spring. Thank you!`],
		follow: [`Do you have a list of which of your varieties are open-pollinated?`, `send you a list of the open-pollinated varieties in the catalogue`],
		pass: {
			who: 'Rhys',
			note: `Customer starting seed saving with {variety}. Rhys, could you send them your isolation notes?`,
			ack: `Hello {first}, Rhys here, head grower at Fernbank. I'll send you the notes we use on our own trial ground for keeping varieties apart; they're more practical than most books.`,
			back: [`Hello again {first}, Rhys here; my notes are below. In short: peas and beans 3 metres, tomatoes 5, squash 500 or hand-pollinate and bag the flowers.`, `Thanks, that's really clear.`, 'sorted']
		}
	},
	{
		key: 'green-manure',
		area: 'advice',
		weight: 1.5,
		order: 'recent',
		skus: ['GRM-01', 'GRM-04', 'GRM-07'],
		setup: (r, s) => {
			s.beds = String(int(r, 3, 8));
			s.soilKind = pick(r, ['sandy loam', 'heavy clay', 'stony, free-draining', 'silty']);
			s.plotName = pick(r, ['plot 7', 'the lower beds', 'half plot 22b', 'the old orchard bed']);
		},
		subjects: ['Green manure for winter', 'Covering beds over winter', 'Which green manure?', 'Winter cover on the allotment'],
		open: [
			`Our allotment committee wants every plot covered over winter this year. I have {beds} beds that will be empty from the end of October. What would you suggest? I've bought some {variety} but I'm not sure it was the right choice.`,
			`What's the best green manure to sow now? I've got {beds} beds that are coming clear, and the soil is {soilKind}.`
		],
		side: `Also, I've got {beds} beds coming clear. Is the {variety} I bought the right green manure for now?`,
		quick: [`Can I sow green manure where the garlic will go?`, `Better not: garlic goes in now and wants the bed to itself. Sow the green manure in the beds that will hold spring crops.`],
		reply: `Good idea: bare soil loses a lot of its goodness over winter. Could you tell me what's going into those beds next spring, and send a soil test if you've done one? Some green manures are hard to dig in before an early sowing.`,
		need: 'what goes into those beds in spring',
		turns: [
			[`Here's our soil test. Next year the beds will have potatoes, onions and carrots.`, `Thanks. For the potato and onion beds, grazing rye is the toughest and holds the soil best; dig it in three weeks before planting. For the carrots, I'd use phacelia, which dies back in hard frost and leaves a fine surface for small seed.`, 'soil'],
			[`And the {variety} I already bought?`, `Use it where something hungry goes next year, like the potatoes: field beans add nitrogen. It's not wasted at all.`]
		],
		fix: [`So: rye or field beans in the potato and onion beds, phacelia in the carrot bed, all sown before mid November.`, `All sown, and the rye is already a green fuzz. Thanks for the help.`],
		follow: [`Could you tell me exactly when to dig each one in next spring?`, `send you a spring calendar for digging in each green manure`],
		pass: {
			who: 'Rhys',
			note: `Allotment holder planning green manure across {beds} beds on {soilKind}. Rhys, could you give dates for digging in?`,
			ack: `Hello {first}, I'm Rhys, Fernbank's head grower. I'll send you sowing and digging-in dates for each bed once I've looked at what our own rye did on similar soil.`,
			back: [`Hello again {first}, Rhys here. Sow by mid November; dig the rye in by mid March and the field beans by early April. Phacelia mostly sorts itself out in a frost.`, `Thank you, very clear.`, 'sorted']
		}
	},
	{
		key: 'chillies-early',
		area: 'advice',
		weight: 1,
		order: 'older',
		skus: ['CHI-05', 'CHI-07', 'TOM-18'],
		subjects: ['Sowing chillies early', 'Heat mat question', 'Chilli advice', 'When to start the {variety}?'],
		open: [
			`I'm planning next year already. When should I sow the {variety} if I have a heated propagator but no greenhouse heating? Last year mine only ripened in October.`,
			`I've overwintered last year's {variety} plants indoors, but they're looking leggy and sad. Should I keep them or start again from seed in January?`
		],
		side: `Also, a planning question: when should I start the {variety} next year?`,
		quick: [`Do chillies need a heat mat?`, `It helps a lot: most chilli seed wants 25°C or so to germinate, which a windowsill in January rarely manages.`],
		reply: `Good to plan ahead. Could you tell me how much light the plants will get after germination, and where they'll grow on: windowsill, porch or cold greenhouse?`,
		need: 'how much light they get and where they grow on',
		turns: [
			[`A south-facing windowsill, then the unheated greenhouse from May. Here's what I'm planning for the year:`, `That works. Sow the {variety} in mid January on the heat mat, move them off it as soon as they're up, and turn the pots daily so they don't lean. Without a grow light, sowing before January just gives you leggy plants.`, 'sowPlan'],
			[`And the leggy old plants?`, `Cut them back to a few buds in late February and pot them on; overwintered plants often fruit earlier than seedlings.`]
		],
		fix: [`So: mid-January sowing on the heat mat, off it once up, windowsill until May, and prune the old plants in late February.`, `Thanks, I've written that into the calendar. I'll let you know how they do.`],
		follow: [`Would a grow light be worth it? I'd buy one from you if you sold them.`, `ask Bridget whether we're likely to stock grow lights in the spring and let you know`],
		pass: {
			who: 'Rhys',
			note: `Planning chilli sowings without a heated greenhouse. Rhys, any tips on timings?`,
			ack: `Hello {first}, Rhys here, head grower at Fernbank. I'll send you the dates we use for our own chillies and peppers in the unheated tunnel.`
		}
	},
	{
		key: 'winter-salad',
		area: 'advice',
		weight: 1,
		order: 'recent',
		skus: ['LET-12', 'LET-15', 'SPI-08', 'CHA-02', 'KAL-03'],
		subjects: ['Winter salads', 'Growing {variety} over winter', 'Salad leaves under cover', 'Too late for {variety}?'],
		open: [
			`I've bought the {variety} {kind} to grow in my unheated greenhouse over winter. Is it too late to sow now, and should I sow in the border or in trays?`,
			`My {variety} {kind} came up well in September but they've stopped growing entirely. Have I done something wrong?`
		],
		side: `And is it too late to sow the {variety} {kind} in the greenhouse?`,
		quick: [`Do winter salads need feeding?`, `Very little: a handful of compost in the border before sowing is enough until spring.`],
		reply: `Not at all. Could you tell me how cold the greenhouse gets at night? A max-min thermometer reading for the last week or so is ideal.`,
		need: 'how cold the greenhouse gets at night',
		turns: [[`Here are the last few nights:`, `Thanks. That's fine for {variety}: they'll stand a few degrees of frost under glass. They stop growing in the short days whatever you do, and pick up again from February. That's normal, not something you've done.`, 'nights'], [`Should I water them much over winter?`, `Very little: in the morning, only when the top of the border is dry, and keep the leaves dry. Wet leaves and cold nights are what rots them.`]],
		fix: [`So: sow now in modules, plant into the border at four leaves, water sparingly, and pick the outer leaves from February.`, `Thank you. I'll stop worrying about them and wait for February.`],
		follow: [`Could you suggest something that does grow through the winter?`, `put together a short list of what grows through winter under cold glass and send it over`],
		pass: {
			who: 'Rhys',
			note: `Winter salads in an unheated greenhouse. Rhys, could you write to them about what grows in the short days?`,
			ack: `Hello {first}, Rhys here, head grower at Fernbank. I'll send you a note on what grows through December and January under cold glass; it's a shorter list than most people hope.`
		}
	},
	{
		key: 'allotment-group',
		area: 'trade',
		weight: 2,
		order: 'none',
		org: true,
		setup: (r, s) => {
			s.orgName = `${pick(r, [s.town, `${s.town} ${pick(r, ['Road', 'Lane', 'Park'])}`, `${pick(r, ['North', 'Upper', 'Old'])} ${s.town}`])} Allotment Society`;
			s.members = String(int(r, 18, 60));
			s.groupTotal = pounds(int(r, 140, 420) * 100 + int(r, 0, 99));
		},
		subjects: ['Group order for {orgName}', 'Society discount?', 'Bulk order from our allotment society', 'Autumn group order'],
		open: [
			`I'm the secretary of {orgName}. We have {members} plot holders and we'd like to put in one order for autumn garlic, onion sets and broad beans. Do you offer a society discount, and could it all come in one delivery to our trading hut?`,
			`Our allotment society ({orgName}) usually buys its seed from a garden centre, but a few members swear by you. Could you give us a price for a group order? I've attached what people have asked for so far.`
		],
		side: `Also, I've been asked by {orgName} whether you do a society discount for a group order.`,
		quick: [`Do you give talks to allotment societies?`, `Rhys, our head grower, does a few each winter, mostly within an hour of Ledbury. Ask and we'll see what we can do.`],
		reply: `We'd be glad to. Societies get 15% off packets and sets on one order of £100 or more, delivered to one address. Could you send me the list of what members want, with quantities? I'll price it up.`,
		need: 'the list of what members want, with quantities',
		turns: [[`Here's the list so far:`, `Thank you, that's clear. With the society discount the whole list comes to {groupTotal}, delivered free to your trading hut. Garlic and sets come in a separate box from the packets.`, 'groupOrder'], [`Can members pay the society rather than you, so it's one payment?`, `Yes: the society pays one invoice and collects from members however suits you. Most societies do exactly that.`]],
		fix: [`I've placed the order on the society's account at the discounted price; you'll get one invoice, and the two boxes should arrive next week.`, `Both boxes arrived and everyone's collected their share. Thank you. We'll definitely do this again in spring.`],
		follow: [`Could you send us a formal quote first? The committee meets on {plusWeek} and has to approve anything over £100.`, `send a formal quote for {groupTotal} in time for the committee on {plusWeek}`],
		pass: {
			who: 'Della',
			note: `Group order from {orgName}, about {groupTotal} after discount. Della, can you set them up as a society account and invoice them?`,
			ack: `Hello {first}, Della here; I look after trade and society accounts. I'll set {orgName} up with a society account and send the quote and an invoice, so your treasurer can pay by bank transfer.`,
			back: [`Hello again {first}, Della here. The society account is set up and the order is placed. Your treasurer has the invoice, and the boxes go out on Monday.`, `Thanks Della, that all went smoothly.`, 'sorted']
		}
	},
	{
		key: 'school-po',
		area: 'trade',
		weight: 1.5,
		order: 'none',
		org: true,
		setup: (r, s) => {
			s.orgName = `${pick(r, ["St Mary's", 'Brookside', 'Hill Top', 'Castle View', 'Riverside', 'Holy Trinity', 'Meadow Bank'])} ${pick(r, ['Primary School', 'C of E Primary', 'Junior School', 'Academy'])}`;
			s.po = `PO-${int(r, 10000, 99999)}`;
			s.council = pick(r, ['Herefordshire Council', 'Shropshire Council', 'Gloucestershire County Council', 'Worcestershire County Council', 'Monmouthshire County Council']);
		},
		subjects: ['Purchase order {po}', 'School seed order', 'Order for our school garden', 'Invoice for school order'],
		open: [
			`I run the gardening club at {orgName}. We'd like to order seeds for the spring term, but the school can't pay by card: we need to send a purchase order and pay on invoice. Is that possible?`,
			`Our school garden ({orgName}) has a small budget to spend before the end of the financial year. Can you accept a purchase order from the council, and invoice them rather than us?`
		],
		side: `And for the school where I teach, {orgName}: can you take a purchase order instead of a card payment?`,
		quick: [`Which seeds are easiest for children?`, `Peas, runner beans, sunflowers and radishes: big seeds, quick results. Calendula is a good flower for small hands.`],
		reply: `Yes, we take purchase orders from schools and councils. Could you send me the purchase order with the items and quantities, and tell me where the invoice should go?`,
		need: 'the purchase order and where the invoice should go',
		turns: [[`Here's the order. The invoice goes to the council's schools finance team.`, `Thank you, that's all I need. I'll put the order through on account and send the invoice to {council} quoting {po}.`, 'schoolPO'], [`Could the children visit your trial beds in the summer term?`, `Rhys would love that; the beds are at their best in June. Let me know a couple of dates nearer the time.`]],
		fix: [`The order went out today on account, and the invoice has gone to {council}'s schools finance team quoting {po}.`, `The parcel came this morning and the children have already sorted all the packets into seed tins. Thank you!`],
		follow: [`Could you also send a paper copy of the invoice to the school office? Our bursar likes a copy on file.`, `post a paper copy of the invoice to the school office this week`],
		pass: {
			who: 'Della',
			note: `{orgName}, purchase order {po}, invoice to {council}. Della, can you open an account for the school?`,
			ack: `Hello {first}, Della here; I look after trade and school accounts. I'll open an account for {orgName}, put the order through and send the invoice to {council}. I'll let you know when it's gone.`,
			back: [`Hello again {first}, Della here. The account is open, the order went out this morning, and the invoice has gone to the council quoting {po}.`, `Thank you, Della. The children will be delighted.`, 'sorted']
		}
	},
	{
		key: 'trade-account',
		area: 'trade',
		weight: 1.5,
		order: 'none',
		org: true,
		setup: (r, s) => {
			s.orgName = `${pick(r, ['Brook', 'Hollow', 'Wildacre', 'Coldharbour', 'Elmtree', 'Moorside', 'Long Meadow'])} ${pick(r, ['Market Garden', 'Farm', 'Growers', 'Veg Co-op', 'Plot'])}`;
			s.acres = pick(r, ['an acre and a half', 'two acres', 'half an acre', 'three acres']);
		},
		subjects: ['Trade prices?', 'Wholesale enquiry', 'Account for {orgName}', 'Larger quantities'],
		open: [
			`We run {orgName}, {acres} of no-dig vegetables for a box scheme. We're looking for a seed supplier for salad, chard and kale in larger quantities than packets. Do you do trade prices?`,
			`I'm setting up {orgName}, {acres}, selling at two farmers' markets. Could you tell me whether you supply seed by weight, and on what terms?`
		],
		side: `Separately, I'm starting {orgName} next year. Do you sell seed in larger quantities?`,
		quick: [`Is your seed organic?`, `About a third of our range is certified organic; the catalogue marks those varieties.`],
		reply: `We do: we supply a number of market gardens in 100 g and 1 kg sizes on a trade account. Could you tell me roughly what you'd need over a season, so I can send the right prices?`,
		need: 'roughly what you would need over a season',
		turns: [[`Mostly salad leaves, chard, kale and beetroot, with some peas for shoots. Probably a few kilos over the year in all.`, `That's well within what we do. Here are this season's trade prices for the varieties you mention:`, 'priceList', 'a']],
		fix: [`I've opened a trade account for {orgName}: thirty days to pay on invoice, free delivery over £60. You can order through the website with your trade login from today.`, `Login works and the first order's in. Thanks for making it so easy.`],
		follow: [`Could you send a sample of the salad mix before we order a whole kilo?`, `post you a 25 g sample of the salad mix this week`],
		pass: {
			who: 'Della',
			note: `New market garden, {orgName}, interested in a trade account. Della, over to you.`,
			ack: `Hello {first}, Della here; I look after Fernbank's trade accounts. I'll send you the application form and our terms, and once it's back the account can be open within a day.`,
			back: [`Hello again {first}, Della here. The account for {orgName} is open: thirty days on invoice, free delivery over £60.`, `Thanks Della. We'll place our first order this week.`, 'sorted']
		}
	},
	{
		key: 'garden-centre',
		area: 'trade',
		weight: 1,
		order: 'none',
		org: true,
		setup: (r, s) => {
			s.orgName = `${pick(r, ['Wyeside', 'Orchard Barn', 'Malvern Hills', 'Teme Valley', 'Brockhampton', 'Severn View'])} ${pick(r, ['Garden Centre', 'Nursery', 'Plant Centre'])}`;
		},
		subjects: ['Stocking Fernbank packets', 'Retail enquiry from {orgName}', 'Display stand?', 'Wholesale packets'],
		open: [
			`I manage {orgName}. Several customers have asked whether we sell Fernbank seeds. Do you supply garden centres, and do you provide a display stand?`,
			`We're reviewing our seed range at {orgName} for next spring and would like to try a small range of yours. What are your terms for shops?`
		],
		side: `On another subject: I manage {orgName}. Do you supply shops?`,
		quick: [`Do you sell gift tins of seeds?`, `Only at Christmas, and they sold out last year; we're making more this year from mid November.`],
		reply: `Thank you for thinking of us. We supply a small number of independent garden centres. Could you tell me roughly how many packets you sell in a season, and how much space you'd give a stand?`,
		need: 'how many packets you sell in a season and the space for a stand',
		turns: [[`Here are our seed sales for the last three seasons. We could give a stand about a metre wide by the tills.`, `That's a good fit for our smaller stand, which holds sixty varieties. Shops buy at 40% off the packet price, with a minimum first order of £250.`, 'stand']],
		fix: [`I've sent the shop terms and a suggested range of sixty varieties for spring. The stand can come with the first order in January.`, `Thanks. We've signed the terms and placed the order for January.`],
		follow: [`Could someone visit to talk through the range before we decide?`, `ask Bridget to arrange a visit to {orgName} in December and confirm a date`],
		pass: {
			who: 'Bridget',
			note: `{orgName} interested in a stand. Bridget, you look after shop accounts: want to take this one?`,
			ack: `Hello {first}, this is Bridget; I own Fernbank and look after our shop accounts myself. I'd love to come and see the space. I'll suggest a couple of dates once I've seen the December diary.`,
			back: [`Hello again {first}, Bridget here. Lovely to meet you on Thursday. As agreed, the stand and sixty varieties go out in the second week of January.`, `Thanks Bridget, looking forward to it.`, 'sorted']
		}
	},
	{
		key: 'donation',
		area: 'other',
		weight: 1.5,
		order: 'none',
		org: true,
		setup: (r, s) => {
			s.orgName = `${s.town} ${pick(r, ['Seed Library', 'Community Garden', 'Food Growing Network', 'Seed Swap', "Men's Shed Garden"])}`;
			s.eventDay = pick(r, ['in late January', 'on the first Saturday in February', 'in early March', 'at the spring fair']);
		},
		subjects: ['Seed donation request', 'Supporting {orgName}', 'Seed swap', 'Could you help our seed library?'],
		open: [
			`I volunteer with {orgName}. We're holding a seed swap {eventDay} and wondered whether you'd be able to donate some packets, perhaps end-of-season stock?`,
			`{orgName} lends seed to people starting out, and our shelves are looking bare. Would Fernbank consider a donation? We'd credit you on our posters and social media.`
		],
		side: `On a different note, I help run {orgName}. Do you ever donate seed?`,
		quick: [`Do you sponsor village shows?`, `We give a few prizes each year, usually seed vouchers; the list fills up by February.`],
		reply: `We do help a few groups each year, mostly with packets from the previous season, which still germinate well. Could you tell me what you have and what you're short of?`,
		need: "what you have and what you're short of",
		turns: [[`Here's the current state of the library:`, `Thank you, that's really helpful. We can help with most of the gaps, especially peas, beans and flowers for pollinators.`, 'libraryList']],
		fix: [`Bridget has agreed to a box of last season's packets, about sixty in all, mostly the kinds you're short of. It's going out this week.`, `The box arrived and our volunteers were thrilled. Thank you so much; you'll be on every poster.`],
		follow: [`Could you also send a few copies of your growing guides? People always ask how to sow things.`, `send you a bundle of the printed growing guides with the next post`],
		pass: {
			who: 'Bridget',
			note: `{orgName} asking for donated packets for a swap {eventDay}. Bridget, it's your call on donations.`,
			ack: `Hello {first}, this is Bridget; I own Fernbank. I'm glad to help. Let me see what's left from last season once the stocktake is done, and I'll write with what we can send.`,
			back: [`Hello again {first}, Bridget here. A box of about sixty packets went out today, chosen from your list of gaps.`, `Thank you so much, Bridget.`, 'sent']
		}
	},
	{
		key: 'packaging',
		area: 'other',
		weight: 1,
		order: 'recent',
		subjects: ['Plastic packaging', 'Your mailing bags', 'Packaging question', 'Can the bags be recycled?'],
		open: [
			`I love your seeds, but the grey mailing bag order {order} came in is plastic, and so are the little bags inside the packets. Is there a plan to go plastic-free? It seems at odds with the rest of what you do.`,
			`Can the mailing bag your parcels come in be recycled? It doesn't say. And are the small inner bags plastic too?`
		],
		side: `Also, are your mailing bags recyclable? It doesn't say on them.`,
		quick: [`Are the packets printed with ink that's safe for compost?`, `Yes, vegetable-based inks; the packets can go in the compost if they're torn up.`],
		reply: `Fair question. The inner bags are glassine, which is paper, not plastic; it just looks shiny. The mailing bags are recycled polythene, which goes with carrier bags at supermarket collection points. Could you tell me which you'd prefer to see: paper mailing bags, or no inner bags at all?`,
		need: "which you'd prefer to see",
		turns: [[`Paper mailing bags, definitely. The inner bags I didn't realise were paper!`, `Thank you; that matches what most customers say. The trouble with paper mailers has been wet doorsteps, but we're testing a waxed paper one this winter.`], [`Could I send the mailing bags back to you for reuse?`, `Kind of you to offer, but the postage would outweigh the saving. The supermarket collection point is the best home for them for now.`]],
		fix: [`Good news: the warehouse switches to paper mailing bags from the first of December, now that the waxed ones have passed the doorstep test.`, `That's great news, thank you for listening.`],
		follow: [`Could you let me know how the paper bag trial goes?`, `write to you when we decide on the paper mailing bags after the trial`],
		pass: {
			who: 'Bridget',
			note: `Customer asking about plastic mailing bags. Bridget, you wanted to hear these for the packaging decision.`,
			ack: `Hello {first}, this is Bridget; I own Fernbank. Thank you for writing: we're deciding on mailing bags for next year at the moment, and comments like yours count. I'll let you know what we decide.`
		}
	},
	{
		key: 'catalogue',
		area: 'other',
		weight: 1.5,
		order: 'older',
		subjects: ['Printed catalogue', '2027 catalogue', 'Paper catalogue please', 'Catalogue request'],
		open: [
			`Will there be a printed catalogue for 2027? I much prefer to sit with a paper copy and a pencil than to scroll through the website. Please could I have one?`,
			`I didn't get a paper catalogue last winter, though I'd ordered several times. Are you still printing them? I'd like one for next year, and one for my neighbour if possible.`
		],
		side: `Also, please could I have a copy of the printed catalogue when it's out?`,
		quick: [`When does the new catalogue come out?`, `The printed one goes out in the first week of January; the website gets the new varieties at the same time.`],
		reply: `Yes, the 2027 catalogue goes out in the first week of January. Could you confirm the address you'd like it sent to? The catalogue list is kept separately from orders.`,
		need: "the address you'd like it sent to",
		turns: [[`It's {street}, {town} {postcode}. And my neighbour is at the next number along.`, `Thank you, I've added you both to the list.`], [`Will it have the new varieties in it?`, `Yes: about thirty new ones for 2027, including two new sweet peas and a tomato from our own trials that stood up well to blight.`]],
		fix: [`You're both on the posting list, and the catalogues will reach you in early January.`, `Lovely, thank you. Something to look forward to after Christmas.`],
		follow: [`Could you also send last year's catalogue if there are any spares? I'd like to compare.`, `look for a spare 2026 catalogue and post it if we have one`],
		pass: {
			who: 'Bridget',
			note: `Customer didn't get last winter's catalogue though on the list. Bridget, can you check with the printers' mailing house?`,
			ack: `Hello {first}, this is Bridget. I'm checking with the mailing house why yours didn't arrive last winter, so it doesn't happen again. I'll confirm once I know.`,
			back: [`Hello again {first}, Bridget here. Your address had been entered with the wrong postcode last year; it's corrected, and the 2027 catalogue will reach you in January.`, `Thank you for getting to the bottom of it.`, 'sorted']
		}
	},
	{
		key: 'organic',
		area: 'other',
		weight: 1.5,
		order: 'older',
		subjects: ['Are your seeds organic?', 'Seed treatments', 'Organic certification', 'Question about the {variety}'],
		open: [
			`Are your seeds treated with anything? I'm on an organic allotment site and we're not allowed to use treated seed. The {variety} packet doesn't say.`,
			`Is the {variety} seed certified organic? Our site rules say organic seed where available, and I want to be sure before I sow.`
		],
		side: `Also, is the {variety} seed treated with anything? Our site is organic.`,
		quick: [`Do you sell any pelleted seed?`, `Only a few carrots and parsnips are pelleted, and the packets say so; the coating is clay, not a chemical treatment.`],
		reply: `None of our seed is chemically treated. Some of it is certified organic and some isn't. Could you tell me what your site's rules require exactly? Some say "untreated", some say "certified organic".`,
		need: "what your site's rules require",
		turns: [[`The rules say "organic seed if available, otherwise untreated".`, `Then you're fine either way. {variety} isn't certified organic this season, as the organic crop failed, but it's untreated, which your rules allow.`], [`How would I know next year which ones are certified?`, `The website gives the certificate number on each certified variety's page, and the catalogue marks them with a leaf.`]],
		fix: [`So you can use the {variety} as it is, and the catalogue marks the certified organic varieties with a leaf symbol for next time.`, `Thank you, that's very clear. I'll show the committee.`],
		follow: [`Could you put it in writing for our site committee, on headed paper?`, `post a short letter on headed paper confirming that our seed is untreated`],
		pass: {
			who: 'Rhys',
			note: `Organic site asking about {variety}. Rhys, can you confirm the status of this season's lot?`,
			ack: `Hello {first}, Rhys here, head grower. I'll check the certificates for this season's {variety} and confirm exactly what it is.`,
			back: [`Hello again {first}, Rhys here. This season's {variety} is untreated but not certified, as the organic grower's crop failed. Next season's should be certified again.`, `Thanks for checking, Rhys.`, 'sorted']
		}
	},
	{
		key: 'gift',
		area: 'other',
		weight: 1,
		order: 'fresh',
		setup: (r, s) => {
			s.giftFor = pick(r, ['my dad', 'my mum', 'my sister', 'a friend who has just got an allotment', 'my grandmother']);
			s.giftName = pick(r, [...firstF, ...firstM]);
		},
		subjects: ['Gift order {order}', 'Gift message', 'Order {order} is a present', 'Can you hide the prices?'],
		open: [
			`Order {order} is a birthday present for {giftFor}, going straight to them. Is there any way to add a note and leave the prices off the packing slip?`,
			`I've just sent order {order} to {giftFor} as a gift and realised there's no gift option. Could you put a little card in? It should just say "Happy birthday {giftName}, love from {first}".`
		],
		side: `Oh, and order {order} is a gift for {giftFor}. Can the prices come off the slip?`,
		quick: [`Do you sell gift vouchers?`, `Yes, from £10 up, by email or printed on a card; they're on the website under Gifts.`],
		reply: `Happy to help. Could you tell me exactly what you'd like the note to say? I'll ask the warehouse before it's packed.`,
		need: "exactly what you'd like the note to say",
		turns: [[`"Happy birthday {giftName}, enjoy the new plot! Love, {first}."`, `Lovely. I've asked the warehouse to put a card in with that message and to leave the prices off the slip.`], [`Will it arrive by Saturday? The birthday's on Sunday.`, `If it goes out tomorrow afternoon it should arrive on Friday or Saturday; I've asked the warehouse to send it first class.`]],
		fix: [`The warehouse confirmed it went out with the card and a slip without prices.`, `{giftName} rang to say thank you. They loved the card. Thanks so much!`],
		follow: [`Could you add a gift option to the website for next time?`, `pass the idea of a gift option to Ivo and let you know if it's on the way`],
		pass: {
			who: 'warehouse',
			note: `Gift order {order}, card and no prices on the slip. Asked Jo at Hollin Lane to catch it before it's packed.`,
			ack: `I've asked the warehouse to catch your parcel before it's packed. I'll let you know whether they managed it.`,
			back: [`The warehouse caught it in time: it went out this morning with your card and without prices on the slip.`, `Fantastic, thank you!`, 'sorted']
		}
	},
];

// ---------------------------------------------------------------------------------------------------------
// The words around the matters.
const backstories = [
	'We took on an allotment in the spring and this is our first autumn on it.',
	"I've grown from your seeds for about five years now.",
	'My partner and I garden a small plot behind the house.',
	"I'm fairly new to growing from seed, so forgive me if this is obvious.",
	"I garden on a windy hillside, so I'm fussy about varieties.",
	"I look after my mother's garden now that she can't manage it herself.",
	'This is only my second order with you.',
	'I share a plot with two friends and I do the ordering.',
	'We grow most of our own vegetables on a half plot and a back garden.'
];
const custGreetings = ['Hi,', 'Hello,', 'Hello Fernbank,', 'Dear Fernbank Seeds,', 'Hi there,', '', 'Good afternoon,'];
const replyGreetings = ['Hi {to},', 'Dear {to},', '', 'Hello again,', 'Hi again,', '{to},', 'Hello {to},'];
const custSignoffs = ['Thanks,\n{first}', 'Many thanks,\n{full}', 'Best wishes,\n{first}', 'Kind regards,\n{full}', '{first}', 'Regards,\n{full}', 'Cheers,\n{first}'];
const replySignoffs = ['Thanks,\n{first}', '{first}', 'Thanks again,\n{first}', '', 'Best,\n{first}', ''];
const agentGreetings = ['Hello {first},', 'Hi {first},', 'Dear {first},'];
const agentGreetingsLater = ['Hi {first},', 'Hello again {first},', 'Thanks {first},', 'Hello {first},', '{first},'];
const agentSignoffs = ['Best wishes,\n{agent}\nFernbank Seeds', 'Thanks,\n{agent}', 'Kind regards,\n{agent} | Fernbank Seeds customer care', 'Happy growing,\n{agent}', '{agent}\nFernbank Seeds'];
const agentIntros = ['Thanks for writing.', 'Sorry for the slow reply; autumn is our busiest time for parcels.', 'Thanks for getting in touch about this.', 'Thanks for the detail; it really helps.', 'Thank you for letting us know.', ''];
const custAcks = ['Thanks, that helps.', 'Thanks for the quick reply.', 'Right, I see.', 'OK, understood.', 'That makes sense.', 'Thank you.', 'Ah, interesting.'];
const transitions = ['While I have you: ', "Something else, if you don't mind. ", 'Oh, and one more thing. ', 'A different question: ', 'Before I forget: ', ''];
const connected = /^(Also|And|By the way|One more thing|Oh, and|Something else|Separately|On another subject|On a different note|Unrelated|Is there any news)/;
const lead = (r: Rand, text: string) => (connected.test(text) ? '' : pick(r, transitions));
const holdLines = ["I'll dig that out at the weekend. Meanwhile, ", "I'll have a look next time I'm at the plot. In the meantime, ", "I'll find it tonight. ", 'Will do when I get a minute. '];
const answerLeads = ['On your other question: ', 'And to your other point: ', 'As for the other thing: ', '', ''];
const nudges1 = [
	'Just checking in: when you have a moment, could you send me {need}? Then I can take this further.',
	"Following up on my last message: could you send me {need}? No rush; I just want to make sure it didn't get buried.",
	"I don't want this to slip through the cracks. If you can send me {need}, I'll pick it straight up."
];
const nudges2 = [
	"I haven't heard back, so I'll assume things are fine for now. If not, just reply here with {need} and I'll take it from there.",
	"One last nudge from me. Whenever you're ready, reply to this message and it comes back to me with everything above."
];
const oweLines = ["Leave that with me: I'll {owe}.", "Good idea. I'll {owe}.", "I'll {owe}, and I'll keep this thread open until then.", "Of course. I'll {owe}."];
const thanksLines = ["Thanks, I'll look out for it.", 'Great, thank you.', 'Much appreciated.', 'Thanks, speak then.'];
const closings = ["Glad that did it. I'll leave it there, but reply here if anything else comes up.", 'Brilliant, thanks for letting me know.', 'Good news! Happy growing.', 'Thanks for letting me know; enjoy them.'];
const waitLines = ["Thanks, I'll wait to hear.", "Thank you, that's good of you.", 'Great, thanks.', 'OK, thanks for passing it on.'];
const interims = ["A quick update: I'm still waiting to hear back, but I haven't forgotten you.", 'Still on it; I should have an answer for you next week.'];
const endLeads = ['Thanks for looking into it. What happens now?', 'OK. What do you suggest?', 'Thanks. So what next?', 'Understood. What would you do?', 'Right, thanks. Where does that leave me?', 'I see. Thanks for checking.'];
const asides: Record<number, string[]> = {
	8: ["The squash have been enormous this year, so I can't complain.", "We're still picking runner beans, believe it or not.", 'The wasps have been dreadful on the plums.', 'The tomatoes finally ripened just as the blight arrived.'],
	9: ['The leaves are coming down fast here.', 'We had our first frost this week.', 'The clocks go back soon, so the evenings at the plot are nearly over.', 'Our apple tree has outdone itself this year.'],
	10: ['It has rained nearly every day for a fortnight here.', 'The plot is mostly mud at the moment.', 'We had the bonfire on the allotment last weekend.', "I've finally put the greenhouse to bed for the winter."]
};
const anyAsides = ['Sorry for the long message.', "Apologies for the slow reply; it's been a busy week.", "I'm writing this from the shed, so excuse the typos."];
const earlierSubjects = ['Sowing dates for sweet peas', 'Missing packet', 'Seed potato varieties', 'Change of address', 'Tomato blight question', 'Order query', 'Gift voucher not working', 'Catalogue request', 'Parsnip germination', 'Invoice please', 'Wrong onion sets', 'Runner beans not setting', 'Parcel not arrived', 'Leek rust', 'Delivery to my allotment', 'Sweetcorn varieties', 'Discount code', 'Courgettes not fruiting'];
/** Questions about the shop that come up in passing, and our answers. */
const shopQuestions: [string, string][] = [
	['Do you have a shop I could visit?', 'Not a shop as such, but the trial beds near Ledbury are open on the first Saturday of each month from May to September, and we sell packets there.'],
	['Do you deliver on Saturdays?', "Parcelline delivers on Saturdays in most towns, but we can't choose the day; parcels leave the warehouse Monday to Friday."],
	['How long do you keep seed before selling it?', "Most is sold in the season it's harvested for; a few varieties that keep well we hold for a second season, after testing them again."],
	['Is there a minimum order?', 'No minimum: one packet is fine, though delivery is only free from £25.'],
	['Do you sell seed potatoes?', "Yes, from January, delivered by van; they're too heavy for the post."],
	["Can I send back seeds I haven't opened?", "Yes, within 30 days and unopened. Post them back with a note of the order number and we'll refund the packets."],
	['Where are your seeds grown?', "About two thirds in the UK, mostly in Herefordshire, Lincolnshire and Wales; the rest come from growers in the Netherlands and France we've worked with for years."],
	['Do you sell plug plants?', "No, only seed, bulbs and sets. We'd rather do a few things well."],
	['When do you start sending out spring orders?', 'From the second week of January for seed, and from February for onion sets and shallots.'],
	['Is there a good book on growing from seed you would recommend?', 'Rhys swears by an old allotment handbook, but honestly the backs of the packets and our growing sheets cover most of it.'],
	['Do your packets have sowing instructions on the back?', 'Yes, every one: when to sow, how deep, spacing and when to expect a harvest. The website has the longer version.'],
	['Can I order by phone?', "Yes, on weekday mornings; whoever answers puts the order through the website for you while you're on the line."]
];
const sideLeads = ['OK, thank you.', 'Thanks, that helps.', 'Thanks for checking.', 'Understood.', 'Thank you.'];
const vagueSubjects = ['Question', 'A few things', 'Hello', 'Order query', '(no subject)', 'Help please', 'Re: your autumn leaflet', 'Following up'];
const lookups = ['Looked up {order}: placed {orderDate}, left Hollin Lane {sentOut}, Parcelline {track}.', '{order}: placed {orderDate}, sent out {sentOut} ({track}). Nothing else on the account this month.', 'Order {order} placed {orderDate}; the warehouse marked it sent on {sentOut}.'];

// ---------------------------------------------------------------------------------------------------------
// One thread.
/** A minor paragraph is a stock one-liner, dropped when its message joins another. */
type Para = { text: string; s: Slots; minor?: boolean };
/** 'later' is the customer reporting how something went, which takes days. */
type Gap = 'open' | 'cust' | 'later' | 'agent' | 'note' | 'mate' | 'nudge' | 'back' | 'interim';
interface Msg {
	who: 'c' | 'a' | 'note' | 'mate';
	mate?: Who;
	paras: Para[];
	art?: () => string;
	gap: Gap;
	/** 0 for the main matter, n for the nth smaller matter. */
	block: number;
	/** The message already brings up a new matter. */
	raised?: boolean;
}

const totalWeight = topics.reduce((sum, topic) => sum + topic.weight, 0);
const weighted = (r: Rand) => {
	let left = r() * totalWeight;
	for (const topic of topics) if ((left -= topic.weight) < 0) return topic;
	return topics.at(-1)!;
};
const outcomesOf = (topic: Topic): Outcome[] => [
	...(topic.fix ? (['sorted', 'sorted'] as Outcome[]) : []),
	...(topic.send ? (['sent', 'sent'] as Outcome[]) : []),
	...(topic.follow && (topic.fix || topic.send) ? (['owe', 'owe'] as Outcome[]) : []),
	...(topic.pass ? (['passed', 'passed'] as Outcome[]) : []),
	'quiet'
];
const slug = (text: string) => text.toLowerCase().replace(/[^a-z]+/g, '');
const orderEpoch = Date.UTC(2024, 0, 1);
/** A date in a table: the year only when it isn't 2026. */
const tableDay = (ms: number) => dayMonth(ms) + (utc(ms).getUTCFullYear() < 2026 ? ` ${utc(ms).getUTCFullYear()}` : '');

const thread = (index: number) => {
	const r = mulberry32(0x5eed0f00 + index * 7919);
	const number = 4100 + index * 7 + Math.floor(mulberry32(index + 31)() * 6);
	const openDay = openDays[Math.floor((index * openDays.length) / ITEMS)]!;

	// The matters.
	const main = weighted(r);
	const outcome = pick(r, outcomesOf(main));
	const used = new Set<Topic>([main]);
	// Smaller matters are about something else than the main one, so that what the thread is about stays clear.
	const sideOk = (topic: Topic) => !used.has(topic) && topic.area !== main.area && !topic.org && !topic.places && (topic.fix || topic.send);
	const take = () => {
		const topic = pick(r, topics.filter(sideOk));
		used.add(topic);
		return topic;
	};
	// Someone who cannot order from us has nothing else to raise about orders, and a thread that starts close to the
	// export has less time for other matters.
	const daysLeft = (EXPORT - openDay) / DAY;
	const room = main.noOrders ? 0 : daysLeft < 12 ? 0 : daysLeft < 20 ? 1 : daysLeft < 30 ? 2 : 3;
	const sides = Array.from({ length: Math.min(room, pick(r, outcome === 'quiet' ? [1, 2, 2] : [2, 2, 3, 3])) }, take);
	const quicks = Array.from({ length: main.noOrders ? 0 : pick(r, [0, 1, 1, 2]) }, take);

	// Who writes.
	const female = chance(r, 0.55);
	const first = pick(r, female ? firstF : firstM);
	const last = pick(r, surnames);
	const [town, area, region] = main.places ? pick(r, main.places) : [...pick(r, places), undefined];
	const base: Slots = {
		first,
		last,
		full: `${first} ${last}`,
		email: `${pick(r, [`${first}.${last}`, `${first[0]}${last}`, `${first}${last}`, `${last}.${first}`])}`.toLowerCase().replace(/[^a-z.]/g, '') + `@${pick(r, mailHosts)}`,
		town,
		postcode: postcodeIn(r, area),
		street: `${int(r, 1, 120)} ${pick(r, streetNames)}`,
		year: '2026',
		openMs: String(openDay)
	};
	if (region) base.region = region;
	const notBridget = (main.pass?.who === 'Bridget' && outcome === 'passed') || sides.some((topic) => topic.pass?.who === 'Bridget');
	base.agent = pick(r, notBridget ? agentNames.filter((name) => name !== 'Bridget') : agentNames);

	// Each matter has slots of its own, over the thread's.
	const matter = (topic: Topic) => {
		const s: Slots = Object.create(base);
		useSku(s, topic.skus ? pick(r, topic.skus) : fillerSku(r));
		topic.setup?.(r, s);
		return s;
	};
	const ms = matter(main);
	const sideSlots = sides.map(matter);
	const quickSlots = quicks.map(matter);

	// Orders on record: one for each matter about an order, and a few others.
	interface Order { placed: number; lines: [string, number][]; sent: number }
	const orders: Order[] = [];
	const orderOf = new Map<Slots, Order>();
	const newOrder = (placed: number, sku?: string, fresh = false): Order => {
		const lines: [string, number][] = sku ? [[sku, 1]] : [];
		for (let i = int(r, sku ? 0 : 1, 4); i > 0; i--) {
			const extra = fillerSku(r);
			if (!lines.some(([other]) => other === extra)) lines.push([extra, int(r, 1, 3)]);
		}
		const sent = fresh ? weekday(openDay + int(r, 1, 2) * DAY) : weekday(placed + int(r, 1, 2) * DAY);
		const order = { placed, lines: shuffled(r, lines), sent: sent + int(r, 13 * 60, 16 * 60) * MIN };
		orders.push(order);
		return order;
	};
	const attach = (topic: Topic, s: Slots) => {
		if (topic.order === 'none') return;
		const recent = topic.order === 'recent';
		const shared = recent && orders.find((order) => order.placed > openDay - 14 * DAY && order.sent < openDay);
		let order: Order;
		if (shared && chance(r, 0.5)) {
			order = shared;
			if (!order.lines.some(([sku]) => sku === s.sku)) order.lines.push([s.sku!, 1]);
		} else {
			const back = topic.order === 'fresh' ? int(r, 0, 1) : recent ? int(r, 4, 12) : int(r, 30, 230);
			const placed = openDay - back * DAY + int(r, 7 * 60, topic.order === 'fresh' ? 9 * 60 : 22 * 60) * MIN;
			order = newOrder(placed, s.sku, topic.order === 'fresh');
		}
		orderOf.set(s, order);
	};
	attach(main, ms);
	sides.forEach((topic, i) => attach(topic, sideSlots[i]!));
	quicks.forEach((topic, i) => attach(topic, quickSlots[i]!));
	const personal = main.noOrders ? false : main.org ? chance(r, 0.3) : true;
	if (personal) for (let i = int(r, main.order === 'none' ? 0 : 1, 4); i > 0; i--) newOrder(openDay - int(r, 20, 700) * DAY + int(r, 7 * 60, 22 * 60) * MIN);
	orders.sort((a, b) => a.placed - b.placed);
	const ids: number[] = [];
	for (const order of orders) ids.push(Math.max(8200 + Math.floor(((order.placed - orderEpoch) / DAY) * 3.1), (ids.at(-1) ?? 0) + 1) + int(r, 0, 2));
	const totalOf = (order: Order) => {
		const goods = order.lines.reduce((sum, [sku, qty]) => sum + qty * bySku.get(sku)![4], 0);
		return goods + (goods < FREE_FROM ? DELIVERY : 0);
	};
	const ordersTable = orders.length
		? table(
				['Order', 'Placed', 'Lines', 'Total', 'Sent out'],
				orders.map((order, i) => [`#${ids[i]}`, tableDay(order.placed), order.lines.map(([sku, qty]) => `${qty} × ${bySku.get(sku)![1]}`).join('; '), pounds(totalOf(order)), dayMonth(order.sent)])
			)
		: '';
	for (const s of [ms, ...sideSlots, ...quickSlots]) {
		s.ordersTable = ordersTable || 'No orders under this email address.';
		const order = orderOf.get(s) ?? orders.at(-1);
		if (!order) {
			s.order = 'my last order';
			continue;
		}
		const i = orders.indexOf(order);
		s.order = `#${ids[i]}`;
		s.orderMs = String(order.placed);
		s.orderDate = dayMonth(order.placed);
		s.sentOutMs = String(order.sent);
		s.sentOut = dayMonth(order.sent);
		s.deliveredDay = fullDay(weekday(order.sent + DAY));
		s.track = `PL${String(Math.floor(r() * 1e9)).padStart(9, '0')}GB`;
		s.depot ??= s.town!;
		s.trackKind ??= 'normal';
		s.items = order.lines.map(([sku]) => bySku.get(sku)![1]).join('|');
	}
	for (const [topic, s] of [[main, ms], ...sides.map((topic, i) => [topic, sideSlots[i]] as const)] as [Topic, Slots][]) {
		if (topic.key === 'germination-sowing' || topic.key === 'germination-lot') {
			const offset = topic.key === 'germination-sowing' ? int(r, 5, 25) : int(r, 2, 6);
			s.sownMs = String(midnight(Number(s.orderMs ?? openDay - 40 * DAY)) + offset * DAY);
			s.sown = dayMonth(Number(s.sownMs));
		}
	}

	// The main matter.
	const msgs: Msg[] = [];
	const P = (text: string, s: Slots = ms): Para => ({ text, s });
	const minor = (text: string): Para => ({ text, s: ms, minor: true });
	const say = (who: Msg['who'], gap: Gap, paras: Para[], art?: () => string, mate?: Who) => msgs.push({ who, gap, paras, art, mate, block: 0 });
	const artOf = (name: string | undefined, s: Slots) => (name ? () => arts[name]!(r, s) : undefined);
	const opening: Para[] = [];
	if (!main.org && chance(r, 0.6)) opening.push(P(pick(r, backstories)));
	opening.push(P(pick(r, main.open)));
	say('c', 'open', opening);
	msgs[0]!.raised = true;
	if ((main.order === 'recent' || main.order === 'older') && chance(r, 0.35)) say('note', 'note', [P(pick(r, lookups))]);
	say('a', 'agent', [P(main.reply)]);
	let final = outcome;
	let endStart = msgs.length;
	if (outcome === 'quiet') {
		say('a', 'nudge', [P(pick(r, nudges1).replace('{need}', main.need))]);
		if (chance(r, 0.7)) say('a', 'nudge', [P(pick(r, nudges2).replace('{need}', main.need))]);
	} else {
		for (const [said, answer, art, by] of main.turns) {
			say('c', 'cust', [P(said)], by ? undefined : artOf(art, ms));
			say('a', 'agent', [P(answer)], by ? artOf(art, ms) : undefined);
		}
		endStart = msgs.length;
		if (outcome !== 'passed' && chance(r, 0.6)) say('c', 'cust', [minor(pick(r, endLeads))]);
		if (outcome === 'sorted') {
			say('a', 'agent', [P(main.fix![0])]);
			say('c', 'later', [P(main.fix![1])]);
			if (chance(r, 0.4)) say('a', 'agent', [P(pick(r, closings))]);
		} else if (outcome === 'sent') {
			say('a', 'agent', [P(main.send![0])]);
			say('c', 'later', [P(main.send![1])]);
			if (chance(r, 0.25)) say('a', 'agent', [P(pick(r, closings))]);
		} else if (outcome === 'owe') {
			const done = main.fix && main.send ? pick(r, [main.fix, main.send]) : (main.fix ?? main.send)!;
			say('a', 'agent', [P(done[0])]);
			say('c', 'later', [P(done[1]), P(main.follow![0])]);
			say('a', 'agent', [P(pick(r, oweLines).replace('{owe}', main.follow![1]))]);
			if (chance(r, 0.5)) say('c', 'cust', [minor(pick(r, thanksLines))]);
		} else {
			const pass = main.pass!;
			const inside = mates[pass.who] !== undefined;
			say('note', 'note', [P(pass.note)]);
			say(inside ? 'mate' : 'a', 'mate', [P(pass.ack)], undefined, inside ? pass.who : undefined);
			if (pass.back && chance(r, 0.4)) {
				if (chance(r, 0.4)) say('c', 'cust', [minor(pick(r, waitLines))]);
				say(inside ? 'mate' : 'a', 'back', [P(pass.back[0])], undefined, inside ? pass.who : undefined);
				say('c', pass.back[2] === 'sent' ? 'later' : 'cust', [P(pass.back[1])]);
				final = pass.back[2];
			} else {
				if (chance(r, 0.5)) say('c', 'cust', [minor(pick(r, waitLines))]);
				if (chance(r, 0.3)) say(inside ? 'mate' : 'a', 'interim', [P(pick(r, interims))], undefined, inside ? pass.who : undefined);
			}
		}
	}

	// The smaller matters, raised while the main one is under way and settled before it ends. Each goes in whole,
	// between two steps of the main matter, and no message brings up more than one new matter.
	sides.forEach((topic, i) => {
		const s = sideSlots[i]!;
		const block = i + 1;
		const done = topic.fix && topic.send ? pick(r, [topic.fix, topic.send]) : (topic.fix ?? topic.send)!;
		const raise = pick(r, [topic.side, topic.side, ...topic.open.filter((text) => !text.startsWith('Hello'))]);
		const flow: Msg[] = [
			{ who: 'c', gap: 'cust', block, raised: true, paras: [{ text: lead(r, raise) + raise, s }] },
			{ who: 'a', gap: 'agent', block, paras: [{ text: topic.reply, s }] }
		];
		const turns = chance(r, 0.75) ? topic.turns : topic.turns.slice(0, 1);
		for (const [said, answer, art, by] of turns) {
			flow.push({ who: 'c', gap: 'cust', block, paras: [{ text: said, s }], art: by ? undefined : artOf(art, s) });
			flow.push({ who: 'a', gap: 'agent', block, paras: [{ text: answer, s }], art: by ? artOf(art, s) : undefined });
		}
		if (flow.length > 4 && chance(r, 0.8)) {
			flow[2]!.paras.push({ text: topic.quick[0], s });
			flow[3]!.paras.push({ text: topic.quick[1], s });
		}
		if (chance(r, 0.5)) flow.push({ who: 'c', gap: 'cust', block, paras: [{ text: pick(r, sideLeads), s, minor: true }] });
		flow.push({ who: 'a', gap: 'agent', block, paras: [{ text: done[0], s }] });
		if (chance(r, 0.75)) flow.push({ who: 'c', gap: 'later', block, paras: [{ text: done[1], s }] });
		const mainAt = (at: number, who: Msg['who']) => msgs[at]?.block === 0 && msgs[at]!.who === who;
		const merges = msgs.map((_, at) => (at >= 2 && mainAt(at, 'c') && !msgs[at]!.raised && mainAt(at + 1, 'a') && at + 1 < endStart ? at : -1)).filter((at) => at >= 0);
		if (merges.length && chance(r, 0.5)) {
			const at = pick(r, merges);
			msgs[at]!.paras.push(...flow[0]!.paras);
			msgs[at]!.raised = true;
			msgs[at + 1]!.paras.push({ text: pick(r, answerLeads) + flow[1]!.paras[0]!.text, s });
			msgs.splice(at + 2, 0, ...flow.slice(2));
			endStart += flow.length - 2;
		} else {
			const after = msgs.map((_, at) => (at >= 1 && at < endStart && mainAt(at, 'a') ? at : -1)).filter((at) => at >= 0);
			const at = (after.length ? pick(r, after.slice(0, 3)) : 1) + 1;
			msgs.splice(at, 0, ...flow);
			endStart += flow.length;
		}
	});
	const free = (at: number, lower: number) => at >= lower && msgs[at]!.who === 'c' && !msgs[at]!.raised && msgs[at + 1]?.who === 'a' && at + 1 < endStart;
	const ownPairs = msgs.map((msg, at) => (msg.block === 0 && free(at, 2) ? at : -1)).filter((at) => at >= 0);
	if (ownPairs.length && chance(r, 0.85)) {
		const at = pick(r, ownPairs);
		msgs[at]!.paras.push(P(main.quick[0]));
		msgs[at + 1]!.paras.push(P(main.quick[1]));
	}
	const passing = [
		...quicks.map((topic, i) => [topic.quick[0], topic.quick[1], quickSlots[i]!] as const),
		...shuffled(r, shopQuestions).slice(0, main.noOrders ? 0 : pick(r, [0, 1, 1, 2])).map(([q, a]) => [q, a, ms] as const)
	];
	passing.forEach(([question, answer, s], i) => {
		const pairs = msgs.map((_, at) => (free(at, 1) ? at : -1)).filter((at) => at >= 0);
		const at = pairs.length && (i > 0 || chance(r, 0.5)) ? pick(r, pairs) : 0;
		if (at === 0 && i > 0) return;
		const asked = { text: (at === 0 ? '' : lead(r, question)) + question, s };
		if (at === 0 && chance(r, 0.5)) msgs[0]!.paras.splice(msgs[0]!.paras.length - 1, 0, asked);
		else msgs[at]!.paras.push(asked);
		msgs[at]!.raised = true;
		const reply = msgs.findIndex((msg, k) => k > at && msg.who === 'a');
		msgs[reply]!.paras.push({ text: pick(r, answerLeads) + answer, s });
	});
	// When the customer never sends what we asked for, the next thing they write puts it off.
	if (outcome === 'quiet') {
		const next = msgs.findIndex((msg, at) => at > 0 && msg.who === 'c');
		if (next > 0) {
			const hold = pick(r, holdLines);
			const rest = msgs[next]!.paras[0]!.text.replace(/^(While I have you: |Something else, if you don't mind\. |Oh, and one more thing\. |A different question: |Before I forget: )/, '');
			msgs[next]!.paras[0]!.text = hold + (hold.endsWith(', ') && !/^I\b/.test(rest) ? rest.charAt(0).toLowerCase() + rest.slice(1) : rest);
		}
	}
	// Two messages in a row from the customer become one.
	for (let i = msgs.length - 1; i > 0; i--) {
		const [before, msg] = [msgs[i - 1]!, msgs[i]!];
		if (msg.who === 'c' && before.who === 'c' && !(before.art && msg.art)) {
			before.paras.push(...msg.paras);
			if (before.paras.some((para) => !para.minor)) before.paras = before.paras.filter((para) => !para.minor);
			before.art ??= msg.art;
			msgs.splice(i, 1);
		}
	}

	// When each message was written. Late threads are compressed so that they end before the export. A phone call
	// is taken in office hours.
	const channel = main.org ? pick(r, ['Email', 'Email', 'Contact form on the website']) : pick(r, ['Email', 'Email', 'Email', 'Email', 'Contact form on the website', 'Contact form on the website', 'Phone call']);
	const opened = channel === 'Phone call' ? weekday(openDay) + int(r, 9 * 60, 16 * 60 + 30) * MIN : openDay + int(r, 6 * 60 + 30, 22 * 60 + 30) * MIN;
	const times = (squeeze: number) => {
		const tr = mulberry32(number * 131);
		const work = (ms: number) => {
			const day = utc(ms).getUTCDay();
			const minutes = utc(ms).getUTCHours() * 60 + utc(ms).getUTCMinutes();
			if (day === 0 || day === 6) return weekday(ms) + int(tr, 8 * 60, 10 * 60) * MIN;
			if (minutes > 17 * 60 + 15) return weekday(midnight(ms) + DAY) + int(tr, 8 * 60, 10 * 60) * MIN;
			if (minutes < 8 * 60) return midnight(ms) + int(tr, 8 * 60, 9 * 60 + 30) * MIN;
			return ms;
		};
		const awake = (ms: number) => {
			const minutes = utc(ms).getUTCHours() * 60 + utc(ms).getUTCMinutes();
			if (minutes >= 23 * 60) return midnight(ms) + DAY + int(tr, 7 * 60, 9 * 60) * MIN;
			if (minutes < 6 * 60 + 30) return midnight(ms) + int(tr, 7 * 60, 9 * 60) * MIN;
			return ms;
		};
		const span = (low: number, high: number) => Math.max(4, Math.round(int(tr, low, high) * squeeze));
		const out: number[] = [];
		let at = opened;
		for (const msg of msgs) {
			if (msg.gap === 'open') at = opened;
			else if (msg.gap === 'note') at = work(at + span(8, 90) * MIN);
			else if (msg.gap === 'cust') at = awake(at + span(45, 30 * 60) * MIN);
			else if (msg.gap === 'later') at = awake(at + Math.max(20 * 60, span(2 * 24 * 60, 5 * 24 * 60)) * MIN);
			else if (msg.gap === 'agent') at = work(at + span(30, 8 * 60) * MIN);
			else if (msg.gap === 'mate') at = work(at + span(18 * 60, 50 * 60) * MIN);
			else if (msg.gap === 'nudge') at = work(at + span(4 * 24 * 60, 6 * 24 * 60) * MIN);
			else if (msg.gap === 'back') at = work(at + span(3 * 24 * 60, 7 * 24 * 60) * MIN);
			else at = work(at + span(4 * 24 * 60, 6 * 24 * 60) * MIN);
			out.push(at);
		}
		return out;
	};
	let squeeze = 1;
	let when = times(squeeze);
	while (when.at(-1)! > EXPORT - 8 * HOUR) {
		squeeze *= 0.75;
		if (squeeze < 0.02) throw new Error(`thread ${number} cannot end before the export`);
		when = times(squeeze);
	}

	// The subject line: usually the main matter's, sometimes a smaller matter's, sometimes nothing useful.
	const roll = r();
	const subject =
		roll < 0.6 || (!sides.length && roll < 0.75) ? fill(pick(r, main.subjects), ms) : roll < 0.8 && sides.length ? fill(pick(r, sides[0]!.subjects), sideSlots[0]!) : pick(r, vagueSubjects);
	const from = main.org ? `${base.full}, ${ms.orgName} <${first.toLowerCase()}@${slug(ms.orgName!)}.example>` : `${base.full} <${base.email}>`;

	const earlier: string[][] = [];
	if (orders.length > 1) {
		let day = orders[0]!.placed;
		for (let i = int(r, 0, 5); i > 0; i--) {
			day += int(r, 20, Math.max(21, Math.floor((openDay - day) / DAY / 2))) * DAY;
			if (day >= openDay - 7 * DAY) break;
			earlier.push([tableDay(day), pick(r, earlierSubjects), pick(r, ['Tomasz', 'Ama', 'Bridget', 'Rhys'])]);
		}
	}
	const out: string[] = [
		`# Thread ${number}: ${subject}`,
		'',
		table(['', ''], [
			['Opened', stamp(opened)],
			['From', from],
			['Came in by', channel],
			['Customer since', orders.length ? monthYear(orders[0]!.placed) : 'new customer'],
			['Delivery address', orders.length ? `${base.street}, ${base.town} ${base.postcode}` : 'none on record']
		]),
		'',
		'### Orders on record',
		'',
		ordersTable || 'No orders under this email address.',
		'',
		...(earlier.length ? ['### Earlier threads', '', table(['Opened', 'Subject', 'Answered by'], earlier), ''] : []),
		'## Messages',
		''
	];
	let agentSpoke = false;
	let lastAgent: string[] = [];
	base.to = base.agent!;
	/** A pasted thing goes under the paragraph that introduces it. */
	const withArt = (body: string[], art?: () => string) => {
		if (!art) return body;
		const at = body.findIndex((line) => line.endsWith(':'));
		return [...body.slice(0, at < 0 ? body.length : at + 1), art(), ...body.slice(at < 0 ? body.length : at + 1)];
	};
	msgs.forEach((msg, position) => {
		const at = when[position]!;
		base.nowMs = String(at);
		base.plusWeek = fullDay(weekday(at + 7 * DAY));
		const body = msg.paras.map((para) => fill(para.text, para.s)).filter(Boolean);
		const text: string[] = [];
		if (msg.who === 'c') {
			if (position === 0 && channel === 'Phone call') {
				out.push(`### Phone call, noted by ${base.agent} · ${stamp(at)}`, '');
				text.push(`${base.first} rang; I said I'd reply by email so it's all in writing. What ${base.first} told me, more or less word for word:`, body.map((line) => `> ${line}`).join('\n>\n'));
			} else {
				out.push(`### ${base.full} · ${stamp(at)}`, '');
				if (position === 0 && channel !== 'Email') text.push(`_Sent with the contact form. Order number: ${main.order !== 'none' && ms.order?.startsWith('#') ? ms.order : 'left blank'}_`);
				const greeting = fill(pick(r, position === 0 ? custGreetings : replyGreetings), base);
				if (greeting && !(position === 0 && channel !== 'Email')) text.push(greeting);
				const quoted = [...lastAgent].sort((x, y) => y.length - x.length)[0]?.split(/(?<=[.?!])\s/).find((sentence) => sentence.length > 50);
				if (position > 0 && quoted && chance(r, 0.2)) text.push(`> ${quoted}`);
				else if (position > 0 && body[0]!.length > 60 && chance(r, 0.3)) text.push(pick(r, custAcks));
				text.push(...withArt(body, msg.art));
				if (chance(r, 0.18)) text.push(pick(r, chance(r, 0.75) ? asides[utc(at).getUTCMonth()]! : anyAsides));
				const signoff = fill(pick(r, position === 0 ? custSignoffs : replySignoffs), base);
				if (signoff && !(position === 0 && channel !== 'Email')) text.push(signoff);
			}
		} else if (msg.who === 'a') {
			out.push(`### ${base.agent} (Fernbank Seeds) · ${stamp(at)}`, '');
			text.push(fill(pick(r, agentSpoke ? agentGreetingsLater : agentGreetings), base));
			if (!agentSpoke && !/^(Thank|Sorry)/.test(body[0]!)) {
				const intro = pick(r, agentIntros);
				if (intro) text.push(intro);
			}
			text.push(...withArt(body, msg.art));
			text.push(fill(pick(r, agentSignoffs), base));
			agentSpoke = true;
			lastAgent = body;
			base.to = base.agent!;
		} else if (msg.who === 'note') {
			out.push(`### Internal note by ${base.agent} · ${stamp(at)}`, '');
			text.push(...body);
		} else {
			out.push(`### ${mates[msg.mate!]} · ${stamp(at)}`, '');
			text.push(...body, msg.mate!);
			lastAgent = body;
			base.to = msg.mate!;
		}
		out.push(text.join('\n\n'), '');
	});
	return { name: `${number}.md`, text: out.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n', area: main.area, final };
};

const folder = join(root, 'support', 'inbox');
mkdirSync(folder, { recursive: true });
for (let index = 0; index < ITEMS; index++) {
	const { name, text } = thread(index);
	writeFileSync(join(folder, name), text);
}
writeFileSync(
	join(folder, 'README.md'),
	`# Shared inbox export\n\nThe customer threads that the Fernbank Seeds shared inbox handled between 1 September and 13 November 2026, one\nfile per thread, as exported on 20 November. Each file holds the order panel the inbox showed beside the thread and\nevery message in it: emails, contact-form messages, notes of phone calls, internal notes, and replies from Rhys,\nDella, Ivo and Bridget. The export does not keep the inbox's labels or the open and closed flags.\n`
);
