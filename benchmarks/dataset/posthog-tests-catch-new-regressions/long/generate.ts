// Writes the long material of this entry's long tasks: every ticket Larkspur's support desk handled between
// 6 October and 13 November 2026, one Markdown file each, under support/tickets/, as the old help desk exported
// them: messages and internal notes, without tags, statuses or assignees. Deterministic: fixed seeds, no clock,
// no network.
//   bun long/generate.ts <workspace root>
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** How many tickets to write. Dates, ticket numbers and the share of each topic all follow from it. */
const ITEMS = 216;

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
const pad = (value: number) => String(value).padStart(2, '0');
/** Cents as a plain amount, the way the order screens show it. */
const amount = (cents: number) => (cents / 100).toFixed(2);
const euro = (cents: number) => `€${amount(cents)}`;
/** Rounds a value given in hundredths of a cent half up to the cent, as checkout does since 0.4.0 (5 October). */
const roundCents = (hundredths: number) => Math.floor((hundredths + 50) / 100);
/** Rounds half to even, as checkout did before 0.4.0. */
const roundEven = (hundredths: number) => {
	const cents = Math.floor(hundredths / 100);
	const rest = hundredths - cents * 100;
	return rest > 50 || (rest === 50 && cents % 2 === 1) ? cents + 1 : cents;
};
const listOf = (items: string[]) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`);
const digits = (r: Rand, n: number) => Array.from({ length: n }, () => int(r, 0, 9)).join('');
const CODE_LETTERS = 'ACDEFHJKMNPQRTVWXY';
const mixed = (r: Rand, n: number) => Array.from({ length: n }, () => pick(r, [...`${CODE_LETTERS}2346789`])).join('');

// Time is kept in minutes since 00:00 on Thursday 1 October 2026, Irish local time.
const EPOCH = Date.UTC(2026, 9, 1);
const DAY = 1440;
const LAST_MESSAGE = 50 * DAY + 17 * 60; // Friday 20 November, 17:00
const at = (minutes: number) => new Date(EPOCH + minutes * 60000);
const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const weekday = (minutes: number) => dayNames[at(minutes).getUTCDay()]!;
const clock = (minutes: number) => `${pad(at(minutes).getUTCHours())}:${pad(at(minutes).getUTCMinutes())}`;
const dateShort = (minutes: number) => `${at(minutes).getUTCDate()} ${monthNames[at(minutes).getUTCMonth()]!.slice(0, 3)}`;
const dateLong = (minutes: number) => `${at(minutes).getUTCDate()} ${monthNames[at(minutes).getUTCMonth()]!}`;
const dateYear = (minutes: number) => `${dateLong(minutes)} ${at(minutes).getUTCFullYear()}`;
const dayDate = (minutes: number) => `${weekday(minutes)} ${dateLong(minutes)}`;
const stampShort = (minutes: number) => `${weekday(minutes).slice(0, 3)} ${dateShort(minutes)}, ${clock(minutes)}`;
const stampLong = (minutes: number) => `${weekday(minutes)} ${dateYear(minutes)}, ${clock(minutes)}`;
const minuteOfDay = (minutes: number) => ((minutes % DAY) + DAY) % DAY;
const startOfDay = (minutes: number) => minutes - minuteOfDay(minutes);
const isWeekend = (minutes: number) => at(minutes).getUTCDay() % 6 === 0;
/** Day `n` of October, or of November past 31. */
const onDay = (dayOfOctober: number) => (dayOfOctober - 1) * DAY;
/** The next weekday after `minutes`, by name. */
const nextWeekday = (minutes: number, ahead = 1) => {
	let m = startOfDay(minutes) + ahead * DAY;
	while (isWeekend(m)) m += DAY;
	return m;
};
/** Moves a time into support's hours: weekdays 08:45 to 17:30, Saturday mornings now and then. */
const office = (r: Rand, t: number) => {
	let m = t;
	for (let guard = 0; guard < 14; guard++) {
		const day = at(m).getUTCDay();
		const minute = minuteOfDay(m);
		if (day >= 1 && day <= 5 && minute >= 8 * 60 + 45 && minute <= 17 * 60 + 30) return m;
		if (day === 6 && minute >= 10 * 60 && minute <= 12 * 60 + 30 && r() < 0.5) return m;
		if (day >= 1 && day <= 5 && minute < 8 * 60 + 45) return startOfDay(m) + 8 * 60 + 45 + int(r, 0, 70);
		m = startOfDay(m) + DAY + 8 * 60 + 45 + int(r, 0, 70);
	}
	return m;
};
/** Moves a time into the hours a customer is awake. */
const waking = (r: Rand, t: number) => {
	const minute = minuteOfDay(t);
	if (minute < 7 * 60) return startOfDay(t) + 7 * 60 + int(r, 0, 150);
	if (minute > 23 * 60) return startOfDay(t) + DAY + 7 * 60 + int(r, 0, 150);
	return t;
};

// People at Larkspur.
const agents = ['Aoife', 'Ciarán', 'Nadia', 'Tom', 'Orla'];
const webTeam = ['Maeve Corrigan', 'Dara Okafor', 'Lukas Brandt'];
const dispatchTeam = ['Pádraig Nolan', 'Sinéad Walsh'];
const finance = 'Helen Byrne';
const marketing = 'Rory Quinlan';
const grower = 'Bridget Kearney';
const dataLead = 'Conor Moran';
const tradeSales = 'Gráinne Doyle';

// Customers.
const firstNames = ['Siobhán', 'Declan', 'Mairéad', 'Eoin', 'Gráinne', 'Fergal', 'Úna', 'Colm', 'Deirdre', 'Shane', 'Niamh', 'Barry', 'Ailbhe', 'Kieran', 'Róisín', 'Padraic', 'Clodagh', 'Dermot', 'Sorcha', 'Ronan', 'Bernadette', 'Tadhg', 'Fiona', 'Liam', 'Aisling', 'Marek', 'Joanna', 'Olusegun', 'Priya', 'Tomás', 'Hannah', 'Gerard', 'Yvonne', 'Brendan', 'Catríona', 'Ahmed', 'Monika', 'Eamon', 'Patricia', 'Vikram', 'Teresa', 'Noel', 'Sinéad', 'Anton', 'Margaret', 'Lorcan', 'Ewa', 'Chiamaka'];
const surnames = ['Murphy', 'Kelly', 'O’Sullivan', 'Walsh', 'Ryan', 'O’Brien', 'Byrne', 'O’Connor', 'McCarthy', 'Doherty', 'Lynch', 'Kavanagh', 'Brennan', 'Fitzgerald', 'Nolan', 'Hogan', 'Cullen', 'Moloney', 'Keane', 'Dunne', 'Flanagan', 'Nowak', 'Kowalski', 'Okafor', 'Sharma', 'Mulligan', 'Costello', 'Daly', 'Fennelly', 'Hegarty', 'Kinsella', 'MacNamara', 'Quigley', 'Phelan', 'Tierney', 'Garvey', 'Coughlan', 'Lenihan'];
const relations: [string, string][] = [['mother', 'she'], ['sister', 'she'], ['father', 'he'], ['brother', 'he'], ['best friend', 'she'], ['daughter', 'she'], ['son', 'he'], ['aunt', 'she'], ['godmother', 'she'], ['neighbour', 'he'], ['mother-in-law', 'she'], ['uncle', 'he']];
const providers = ['mailbox.example', 'postbox.example', 'inbox.example', 'letterbox.example', 'webpost.example'];
interface Town {
	town: string;
	county: string;
	key: string;
	hub: string;
	depot: string;
}
const towns: Town[] = [
	{ town: 'Ballincollig', county: 'Co. Cork', key: 'P31', hub: 'Portlaoise', depot: 'Little Island' },
	{ town: 'Swords', county: 'Co. Dublin', key: 'K67', hub: 'Ballycoolin', depot: 'Ballycoolin' },
	{ town: 'Rathmines', county: 'Dublin 6', key: 'D06', hub: 'Ballycoolin', depot: 'Ballycoolin' },
	{ town: 'Salthill', county: 'Galway', key: 'H91', hub: 'Athlone', depot: 'Oranmore' },
	{ town: 'Ennis', county: 'Co. Clare', key: 'V95', hub: 'Portlaoise', depot: 'Shannon' },
	{ town: 'Naas', county: 'Co. Kildare', key: 'W91', hub: 'Portlaoise', depot: 'Newbridge' },
	{ town: 'Kilkenny', county: 'Co. Kilkenny', key: 'R95', hub: 'Portlaoise', depot: 'Kilkenny' },
	{ town: 'Westport', county: 'Co. Mayo', key: 'F28', hub: 'Athlone', depot: 'Castlebar' },
	{ town: 'Dungarvan', county: 'Co. Waterford', key: 'X35', hub: 'Portlaoise', depot: 'Waterford' },
	{ town: 'Bray', county: 'Co. Wicklow', key: 'A98', hub: 'Ballycoolin', depot: 'Sandyford' },
	{ town: 'Athlone', county: 'Co. Westmeath', key: 'N37', hub: 'Athlone', depot: 'Athlone' },
	{ town: 'Tralee', county: 'Co. Kerry', key: 'V92', hub: 'Portlaoise', depot: 'Killarney' },
	{ town: 'Sligo', county: 'Co. Sligo', key: 'F91', hub: 'Athlone', depot: 'Sligo' },
	{ town: 'Drogheda', county: 'Co. Louth', key: 'A92', hub: 'Ballycoolin', depot: 'Dundalk' },
	{ town: 'Carlow', county: 'Co. Carlow', key: 'R93', hub: 'Portlaoise', depot: 'Carlow' },
	{ town: 'Letterkenny', county: 'Co. Donegal', key: 'F92', hub: 'Athlone', depot: 'Letterkenny' },
	{ town: 'Clonakilty', county: 'Co. Cork', key: 'P85', hub: 'Portlaoise', depot: 'Little Island' },
	{ town: 'Greystones', county: 'Co. Wicklow', key: 'A63', hub: 'Ballycoolin', depot: 'Sandyford' },
	{ town: 'Malahide', county: 'Co. Dublin', key: 'K36', hub: 'Ballycoolin', depot: 'Ballycoolin' },
	{ town: 'Castletroy', county: 'Limerick', key: 'V94', hub: 'Portlaoise', depot: 'Raheen' },
	{ town: 'Tullamore', county: 'Co. Offaly', key: 'R35', hub: 'Athlone', depot: 'Tullamore' },
	{ town: 'Wexford', county: 'Co. Wexford', key: 'Y35', hub: 'Portlaoise', depot: 'Enniscorthy' },
	{ town: 'Mullingar', county: 'Co. Westmeath', key: 'N91', hub: 'Athlone', depot: 'Athlone' },
	{ town: 'Skerries', county: 'Co. Dublin', key: 'K34', hub: 'Ballycoolin', depot: 'Ballycoolin' }
];
const streets = ['Ard na Gréine', 'Church Road', 'The Paddocks', 'Oakfield Avenue', 'Seaview Terrace', 'Millbrook Court', 'Ashgrove', 'Castle Park', 'Riverside Drive', 'Willow Lane', 'Station Road', 'Cnoc na Sí', 'Beechwood Close', 'Harbour View', 'Chapel Street', 'Orchard Rise', 'Bóthar na Trá', 'Fairgreen', 'Woodlawn Drive', 'Mill Lane'];
const eircode = (r: Rand, key: string) => `${key} ${pick(r, [...CODE_LETTERS])}${int(r, 1, 9)}${pick(r, [...CODE_LETTERS])}${int(r, 1, 9)}`;

// What Larkspur sells. `list` is how a customer names it in a sentence, `short` follows "the".
type Kind = 'bulbs' | 'roses' | 'hedging' | 'plants' | 'houseplants' | 'pots' | 'tools' | 'compost' | 'gifts' | 'xmas';
interface Product {
	name: string;
	list: string;
	short: string;
	cents: number;
	kind: Kind;
	/** Drops its leaves in autumn. */
	bare?: boolean;
}
const catalogue: Product[] = [
	{ name: 'Tulip ‘Ballerina’, 25 bulbs', list: '‘Ballerina’ tulips', short: '‘Ballerina’ tulips', cents: 1250, kind: 'bulbs' },
	{ name: 'Tulip ‘Queen of Night’, 25 bulbs', list: '‘Queen of Night’ tulips', short: '‘Queen of Night’ tulips', cents: 1300, kind: 'bulbs' },
	{ name: 'Daffodil ‘Tête-à-tête’, 50 bulbs', list: 'dwarf daffodils', short: 'dwarf daffodils', cents: 1450, kind: 'bulbs' },
	{ name: 'Narcissus ‘Thalia’, 25 bulbs', list: '‘Thalia’ narcissi', short: '‘Thalia’ narcissi', cents: 1200, kind: 'bulbs' },
	{ name: 'Allium ‘Purple Sensation’, 20 bulbs', list: 'alliums', short: 'alliums', cents: 1100, kind: 'bulbs' },
	{ name: 'Crocus mix, 100 corms', list: 'a bag of crocuses', short: 'crocuses', cents: 1500, kind: 'bulbs' },
	{ name: 'Snake’s head fritillary, 30 bulbs', list: 'fritillaries', short: 'fritillaries', cents: 1350, kind: 'bulbs' },
	{ name: 'Rose ‘Gertrude Jekyll’, bare-root', list: 'a ‘Gertrude Jekyll’ rose', short: '‘Gertrude Jekyll’ rose', cents: 1995, kind: 'roses', bare: true },
	{ name: 'Rose ‘Munstead Wood’, bare-root', list: 'a ‘Munstead Wood’ rose', short: '‘Munstead Wood’ rose', cents: 2150, kind: 'roses', bare: true },
	{ name: 'Rambling rose ‘Rambling Rector’, bare-root', list: 'a rambling rose', short: 'rambling rose', cents: 1800, kind: 'roses', bare: true },
	{ name: 'Beech hedging, 60–80 cm, bundle of 25', list: 'a bundle of beech hedging', short: 'beech hedging', cents: 6250, kind: 'hedging', bare: true },
	{ name: 'Hawthorn hedging, 40–60 cm, bundle of 50', list: 'a bundle of hawthorn hedging', short: 'hawthorn hedging', cents: 4500, kind: 'hedging', bare: true },
	{ name: 'Griselinia, 2 L pots, pack of 10', list: 'ten griselinia', short: 'griselinia', cents: 7900, kind: 'hedging' },
	{ name: 'Hydrangea ‘Annabelle’, 3 L pot', list: 'a hydrangea', short: 'hydrangea', cents: 1695, kind: 'plants', bare: true },
	{ name: 'Japanese maple ‘Bloodgood’, 5 L pot', list: 'a Japanese maple', short: 'Japanese maple', cents: 3400, kind: 'plants', bare: true },
	{ name: 'Lavender ‘Hidcote’, 9 cm pots, tray of 6', list: 'a tray of lavender', short: 'lavender', cents: 2100, kind: 'plants' },
	{ name: 'Hellebore ‘Christmas Carol’, 2 L pot', list: 'a hellebore', short: 'hellebore', cents: 1450, kind: 'plants' },
	{ name: 'Skimmia ‘Rubella’, 2 L pot', list: 'a skimmia', short: 'skimmia', cents: 1395, kind: 'plants' },
	{ name: 'Olive tree, 1.2 m, 15 L pot', list: 'an olive tree', short: 'olive tree', cents: 8900, kind: 'plants' },
	{ name: 'Clematis ‘Nelly Moser’, 2 L pot', list: 'a clematis', short: 'clematis', cents: 1650, kind: 'plants', bare: true },
	{ name: 'Monstera deliciosa, 17 cm pot', list: 'a monstera', short: 'monstera', cents: 2900, kind: 'houseplants' },
	{ name: 'Peace lily, 14 cm pot', list: 'a peace lily', short: 'peace lily', cents: 1950, kind: 'houseplants' },
	{ name: 'Christmas cactus, 12 cm pot', list: 'a Christmas cactus', short: 'Christmas cactus', cents: 1295, kind: 'houseplants' },
	{ name: 'Terracotta pot, 30 cm', list: 'a terracotta pot', short: 'terracotta pot', cents: 2400, kind: 'pots' },
	{ name: 'Glazed pot, midnight blue, 40 cm', list: 'a blue glazed pot', short: 'blue glazed pot', cents: 4900, kind: 'pots' },
	{ name: 'Glazed pot, sage green, 30 cm', list: 'a green glazed pot', short: 'green glazed pot', cents: 3600, kind: 'pots' },
	{ name: 'Zinc window box, 75 cm', list: 'a zinc window box', short: 'window box', cents: 3200, kind: 'pots' },
	{ name: 'Frost-proof planter, slate grey, 60 cm', list: 'a grey planter', short: 'grey planter', cents: 7900, kind: 'pots' },
	{ name: 'Border spade, ash handle', list: 'a border spade', short: 'spade', cents: 4400, kind: 'tools' },
	{ name: 'Bypass secateurs', list: 'a pair of secateurs', short: 'secateurs', cents: 2750, kind: 'tools' },
	{ name: 'Bulb planter, long handle', list: 'a bulb planter', short: 'bulb planter', cents: 1850, kind: 'tools' },
	{ name: 'Kneeler pad', list: 'a kneeler', short: 'kneeler', cents: 1200, kind: 'tools' },
	{ name: 'Gardening gloves, leather', list: 'leather gloves', short: 'gloves', cents: 950, kind: 'tools' },
	{ name: 'Peat-free compost, 40 L, pack of 3', list: 'three bags of compost', short: 'compost', cents: 2400, kind: 'compost' },
	{ name: 'Bulb fibre, 10 L', list: 'a bag of bulb fibre', short: 'bulb fibre', cents: 750, kind: 'compost' },
	{ name: 'Seed tin gift set', list: 'a seed tin', short: 'seed tin', cents: 2600, kind: 'gifts' },
	{ name: 'Gardener’s journal 2027', list: 'a gardener’s journal', short: 'journal', cents: 1600, kind: 'gifts' },
	{ name: 'Bird feeder, copper', list: 'a copper bird feeder', short: 'bird feeder', cents: 2200, kind: 'gifts' },
	{ name: 'Wreath-making kit', list: 'a wreath-making kit', short: 'wreath kit', cents: 3800, kind: 'gifts' },
	{ name: 'Nordmann fir, 6–7 ft, pre-order', list: 'a 6–7 ft Christmas tree', short: 'Christmas tree', cents: 6900, kind: 'xmas' },
	{ name: 'Nordmann fir, 5–6 ft, pre-order', list: 'a 5–6 ft Christmas tree', short: 'Christmas tree', cents: 5900, kind: 'xmas' },
	{ name: 'Christmas tree stand, cast iron', list: 'a tree stand', short: 'tree stand', cents: 3500, kind: 'xmas' }
];
const ofKind = (...kinds: Kind[]) => catalogue.filter((product) => kinds.includes(product.kind));

// Discount codes. Each takes its percentage off the whole order; one code per order, one use per customer.
interface Campaign {
	code: string;
	pct: number;
	from: number;
	to: number;
	what: string;
}
const campaigns: Campaign[] = [
	{ code: 'HARVEST15', pct: 15, from: onDay(-29), to: onDay(0), what: 'September harvest sale' },
	{ code: 'BULBS15', pct: 15, from: onDay(5), to: onDay(18), what: 'Bulb Fortnight' },
	{ code: 'AUTUMN20', pct: 20, from: onDay(16), to: onDay(19), what: 'autumn weekend sale' },
	{ code: 'GROW10', pct: 10, from: onDay(20), to: onDay(32), what: 'Halloween newsletter offer' },
	{ code: 'HEDGE15', pct: 15, from: onDay(33), to: onDay(46), what: 'hedging season launch' }
];
const misspelt: Record<string, string> = { HARVEST15: 'HARVEST51', BULBS15: 'BULB15', AUTUMN20: 'AUTUMM20', GROW10: 'GROWS10', HEDGE15: 'HEDGES15' };
const fakeCodes = ['LARKSPUR40', 'GARDEN30', 'LARK25OFF', 'PLANTS35', 'LKSPUR50'];
/** The autumn pot sale took 30% off the shelf price of the pots from 9 October to the end of 19 October. */
const SALE_TO = onDay(19);
const VOUCHERS_FROM = onDay(5); // gift vouchers went on sale with the new checkout
const HEDGING_FROM = onDay(33); // bare-root hedging is dispatched from 2 November
const ROSES_FROM = onDay(47); // bare-root roses are dispatched from 16 November
const TREES_FROM = onDay(40); // Christmas tree pre-orders opened on 9 November
const sizes: Record<string, [string, string, number]> = {
	'blue glazed pot': ['30 cm', '40 cm', 3300],
	'green glazed pot': ['20 cm', '30 cm', 2200],
	'terracotta pot': ['20 cm', '30 cm', 1400],
	'grey planter': ['40 cm', '60 cm', 5200],
	'window box': ['50 cm', '75 cm', 2400]
};
const rivals = ['the garden centre in {town}', 'Greenacres Garden Centre', 'a garden centre near us', 'an online shop in the UK', 'the big DIY shop on the ring road', 'a nursery in the next town'];

// Topics. A ticket follows one path of one topic. Nothing about the topic, its area or how it ended is written into
// the file except through the messages themselves.
// Who writes: c customer, a support's reply, n support's internal note, p support's note of a phone call, w web
// team, x dispatch, f finance, m marketing, g the head grower's note, G the head grower writing to the customer,
// d data protection, t trade sales' note, T trade sales writing to the customer, s the help desk itself.
type Who = 'c' | 'a' | 'n' | 'p' | 'w' | 'x' | 'f' | 'm' | 'g' | 'G' | 'd' | 't' | 'T' | 's';
type Msg = [Who, string];
type Paste = 'order' | 'record' | 'tracking' | 'payments' | 'coupon' | 'friends' | 'voucher' | 'emails' | 'signin' | 'refunds' | 'stock' | 'bank' | 'sessions' | 'proforma' | 'none';
type Deal = 'none' | 'coupon' | 'friends' | 'voucher';
interface Path {
	detail: string[];
	/** Pasted by the customer under the detail. */
	paste?: Paste;
	look: string[];
	lookWho?: Who;
	/** Pasted under the internal note; `order` when left out. */
	lookPaste?: Paste;
	ends: Msg[][];
	/** Whom support waits on, if it sends a holding reply. */
	team?: string;
	/** The ticket may end with a satisfaction survey. */
	happy?: boolean;
	/** The earliest day a ticket on this path can be opened. */
	since?: number;
	/** What the pasted records show, where a paste has several shapes. */
	state?: string;
	/** The discount on the order, where it matters. */
	deal?: Deal;
	/** Which code {code} names. */
	code?: 'expired' | 'live' | 'welcome' | 'fake';
	/** The last day a ticket on this path can be opened. */
	until?: number;
	/** The customer's first message, when the topic's would not fit this path. */
	open?: string[];
	/** What the order holds, when the topic's goods would not fit this path. */
	goods?: Kind[];
	/** Only plants that drop their leaves in autumn. */
	bare?: boolean;
	/** The order has a second line of one of these kinds. */
	second?: Kind[];
	/** The order was placed this many days before the ticket, when the topic's range would not fit this path. */
	placed?: [number, number];
}
interface Topic {
	since?: number;
	/** What the order holds: its first line is of one of these kinds. */
	goods: Kind[];
	/** The order's state when the customer writes. */
	status?: 'basket' | 'new' | 'dispatched' | 'delivered' | 'preorder' | 'voucher';
	/** The order was placed this many days before the ticket. */
	placed?: [number, number];
	/** Pasted by the customer in the first message. */
	shows?: Paste;
	/** The order's first line is the product whose name starts so. */
	first?: string;
	subjects: string[];
	/** The customer's first message, for paths without their own. */
	open?: string[];
	more: string[];
	ask: string[];
	paths: Path[];
}

const topics: Topic[] = [
	// A discount code refused at checkout.
	{
		goods: ['bulbs', 'pots', 'tools', 'plants', 'gifts'],
		status: 'basket',
		subjects: ['Discount code not working', 'Code rejected at checkout', 'your code doesnt work', 'Problem with promo code', 'Code says not valid'],
		open: [
			'I’m trying to use the code {code} at checkout and every time I press Apply it says “This code can’t be used on this order.” I’ve typed it in about ten times now. My basket has {items} in it and I’d like to get the order in this week.',
			'Your email said I could use {code} for {pct}% off, but the checkout won’t take it. It just says the code can’t be used on this order and gives no reason. Is it me or is it the website?',
			'Quick one: the discount code {code} isn’t being accepted. I’ve tried on my phone and on the laptop, signed in and not signed in. I haven’t paid yet because I don’t want to lose the discount.'
		],
		more: ['I’ve left everything in the basket for now.', 'It’s a bit frustrating, because the code was the reason I came back to the site.', 'The message on screen doesn’t say why, which doesn’t help.'],
		ask: [
			'Sorry about that. Could you tell me exactly how you’re typing the code, and which email address you’re signed in with? Codes are checked against the customer account, so that helps me see what checkout sees.',
			'Let me have a look. Which email address is your Larkspur account under? And could you copy the code exactly as you’re entering it, in case a character has crept in?'
		],
		paths: [
			{
				code: 'expired',
				state: 'expired',
				detail: ['It’s {email}, and I’m typing {code}, all capitals, same as in the email. I got the email a while ago and only got round to it now.', 'I’m signed in as {email}. The code is {code}, copied and pasted from your email.'],
				look: ['{code} ran from {codeFrom} to {codeEnd}; checkout is right to refuse it. Basket: {items}.', 'Code {code} ended {codeEnd}. Nothing wrong with the account.'],
				lookPaste: 'coupon',
				ends: [
					[['a', 'Thanks, {name}, I’ve found the reason: {code} was for our {campaign}, which ran from {codeFrom} to {codeEnd}, so it stopped working at midnight on the last day. I’m sorry the email didn’t make the end date clearer. As it has only just gone, I’ve made you a one-off code, {sorry}, for 10% off one order, valid until the end of January. It’s tied to your account, so sign in before you use it.'], ['c', 'That’s very decent of you, thank you. The new code worked and the order’s in.']],
					[['a', 'I’ve checked, and {code} was for the {campaign}, which ended on {codeEnd}, so the checkout is refusing it as expired. I’m sorry, I can’t bring an ended code back. There’s usually a new offer in the newsletter every few weeks.'], ['c', 'Fair enough, I should have read the small print. I’ll keep an eye out for the next one.'], ['a', 'Thanks for being so understanding.']]
				]
			},
			{
				code: 'live',
				detail: ['I’m signed in as {email}. I’m typing {typoCode}, I’m fairly sure that’s what was in the email.', 'Account is {email}. Code: {typoCode}.'],
				look: ['Customer is entering {typoCode}. The code is {code}, live until {codeEnd}.', '{typoCode} doesn’t exist; {code} does, live, unused by this account.'],
				lookPaste: 'coupon',
				ends: [
					[['a', 'I think I see it: the code is {code}, and you’ve been entering {typoCode}. Very easy to do, the font in that email isn’t the clearest. Try {code} and it should go straight through. It’s valid until the end of {codeEnd}.'], ['c', 'Oh for goodness’ sake, I misread it. It worked first time. Thanks, and sorry!']],
					[['a', 'One letter out: it’s {code}, not {typoCode}. If you enter it like that it will take {pct}% off the whole basket.'], ['c', 'Done, thank you. Order placed.'], ['a', 'Great. Enjoy the {product}!']]
				],
				happy: true
			},
			{
				code: 'welcome',
				detail: ['The email is {email}. I signed up to the newsletter last week and the welcome email gave me the code.', 'It’s {email}. I only joined the mailing list on {wday}, which is where the code came from.'],
				look: ['WELCOME10 is for a first order only. {email} has an earlier order, {order0}, from {order0Date}, so checkout refuses it.'],
				lookPaste: 'coupon',
				state: 'welcome',
				ends: [
					[['a', 'Thanks, {name}. The welcome code is for a first order only, and there’s an order from {order0Date} under {email}, so checkout won’t take it. I can see why that’s confusing when the welcome email only arrived last week, and I’ve passed that on.'], ['m', 'The welcome email goes to every new subscriber, whether or not they’ve ordered before. Skipping existing customers needs the sign-up form to look up orders first; asked the web team.'], ['c', 'OK. I didn’t remember that order at all, it was a present for my {relation}. I’ll go ahead without it.']],
					[['a', 'The welcome code only works on a first order, and there’s one from {order0Date} under {email}, so it won’t apply. I’m sorry, I know the email doesn’t say so.'], ['c', 'Seriously? One order, ages ago, and I’m not new any more? That seems a bit mean.'], ['a', 'I understand. I can’t change how the welcome code works, but I’ve made you a one-off code, {sorry}, for 10% off this order. Sign in before you use it.'], ['c', 'Thank you, that’s appreciated. All done.']]
				]
			},
			{
				code: 'live',
				state: 'used',
				detail: ['I’m signed in as {email}. It’s the account my {partnerRole} and I share.', '{email}. I think we both use the same account, actually.'],
				look: ['{code} is one use per customer, and it was used on {order0} on {order0Date} from this account.'],
				lookPaste: 'coupon',
				ends: [[['a', 'I’ve found it: {code} can be used once per account, and it was used on {order0Date} on order {order0}, from your account. Could that have been someone else in the house?'], ['c', 'Ah, that was {partner} buying the bird feeder. Mystery solved. We’ll do without.'], ['a', 'Glad we got to the bottom of it.']]]
			}
		]
	},
	// A code that wasn't entered before paying.
	{
		since: onDay(8),
		goods: ['bulbs', 'pots', 'plants', 'tools', 'compost'],
		status: 'new',
		placed: [0, 2],
		subjects: ['Forgot to use my discount code', 'Can I still get the discount?', 'Code not applied to my order', 'Missed the code box'],
		open: [
			'I placed order {order} on {placed} and only realised afterwards that I hadn’t put in my code {code}. Is there any way to have the discount taken off now? It’s {pct}%, so it isn’t nothing.',
			'Bit of a silly one. I had a discount code, {code}, all ready and then I went through the checkout on my phone and completely forgot to enter it. The order is {order}. Can you apply it after the fact?',
			'I ordered {items} on {placed} and I see now that no discount was taken off. I had the code {code} from your email. Did I do something wrong, or did the code not work?'
		],
		more: ['I’ve paid already, by card.', 'I’d rather not cancel and order again if I can avoid it, in case things go out of stock.', 'The confirmation email shows the full price.'],
		ask: [
			'Thanks for getting in touch. Could you confirm the email address the order was placed under, and where you got the code from? Some codes are tied to the newsletter, so I want to check it against the right account.',
			'No problem, let me look into it. Which email address did you order with, and was the code from our newsletter or from somewhere else?'
		],
		paths: [
			{
				code: 'live',
				deal: 'none',
				detail: ['It was {email}, and the code came in the newsletter.', '{email}. The code was in your newsletter, the one with the bulb planting guide.'],
				look: ['{code} was live when {order} was placed ({placed}) and this account hasn’t used it. No discount on the order. Asking finance to refund {pct}% of the items, {couponValue}.'],
				team: 'finance',
				ends: [
					[['f', 'Refunded {couponValue} to the {cardType} ending {card} against {order}.'], ['a', 'Good news: the code was valid when you ordered, so I’ve had the discount, {couponValue}, refunded to your card ending {card}. It can take three to five working days to show. The code is now marked as used on your account.'], ['c', 'Brilliant, thank you, that’s great service.']],
					[['f', 'Done: {couponValue} back to the card for {order}.'], ['a', 'All sorted: {couponValue}, the {pct}% the code would have taken off, is on its way back to your card. Allow a few working days for it to appear.'], ['c', 'Thanks a million.']]
				],
				happy: true
			},
			{
				code: 'expired',
				deal: 'none',
				detail: ['I used {email}. The code came in an email a while back, I think.', 'It was {email}. I found the code in an old newsletter.'],
				look: ['{code} ended {codeEnd}; {order} was placed {placed}, after it ended. Nothing to refund under the code.'],
				ends: [
					[['a', 'I’ve checked, and unfortunately {code} ended on {codeEnd}, before your order went through, so even if you’d entered it the checkout would have refused it. I’m sorry that’s not the answer you wanted. What I can do is give you {sorry}, 10% off your next order, valid until the end of January.'], ['c', 'Ah well, worth asking. Thanks for the code, I’ll use it for the roses.']],
					[['a', 'Sorry, {name}: {code} finished on {codeEnd}, and your order was placed after that, so there’s nothing I can refund against it.'], ['c', 'OK, thanks for checking anyway.']]
				]
			},
			{
				code: 'fake',
				deal: 'none',
				detail: ['I ordered with {email}. I got the code from one of those voucher websites, it was on a list of Larkspur codes.', 'It’s {email}. The code was on a deals site, it said “verified today”.'],
				look: ['No code {code} has ever existed here. Not ours.'],
				lookPaste: 'none',
				ends: [[['a', 'I’m afraid {code} isn’t one of our codes and never has been: some voucher websites list made-up codes to get clicks. Our real codes only come in our newsletter, in Friends emails or from us directly, so the price you paid is the right one. If you’d like the newsletter, there’s a sign-up box at the bottom of every page.'], ['c', 'Typical. Thanks for being straight with me.']]]
			},
			{
				code: 'live',
				deal: 'none',
				detail: ['I can’t find the email with the code now, I think I deleted it. And I may have ordered with my work address, actually, not this one.', 'Now I’m not sure which address I ordered with, I have three. Possibly my work one.'],
				look: ['{order} is under a different address from the one writing in. Can’t discuss it or refund to it until we hear from the address on the order.'],
				lookPaste: 'none',
				ends: [
					[['a', 'Order {order} is under a different email address from the one you’ve written from, so for security I need the request to come from that address. Could you reply from the email you ordered with? Then I’ll check whether the code can still be applied.'], ['s', 'Reminder sent to the customer after five days without a reply.']],
					[['a', 'The order is under another of your addresses, and I can only discuss an order with the address it was placed from. If you forward me the confirmation email from that inbox, I can take it from there.'], ['c', 'I’ll do it from work on Monday.']]
				]
			}
		]
	},
	// The Friends discount missing from an order.
	{
		goods: ['bulbs', 'plants', 'pots', 'tools', 'houseplants', 'compost'],
		status: 'dispatched',
		placed: [1, 6],
		subjects: ['Friends discount not applied', 'Where is my 5%?', 'Member discount missing', 'Friends of Larkspur', 'Didn’t get member discount'],
		open: [
			'I’m a Friend of Larkspur and I thought that meant 5% off every order, but my last order, {order}, was charged at full price. Have I misunderstood how it works?',
			'I’ve been ordering from you for years and joined Friends a while ago. Looking at my bank, I paid {paid} for {order}, which is the full price. I’m sure I got the 5% last time.',
			'Where is my Friends discount? Order {order} came to {paid}, and nothing was taken off.'
		],
		more: ['Not a fortune, but it adds up over a year of orders.', 'I don’t want to make a fuss, I just want to understand it before I order the bulbs for spring.', 'My friend who told me about Friends says hers always comes off.'],
		ask: [
			'Thanks for writing in. The Friends discount comes off at checkout when you’re signed in to the account that holds the membership. Could you tell me the email address your membership is under, and whether you were signed in when you ordered?',
			'Sorry about that, let me look. Could you confirm the email address you joined Friends with? Then I can compare the membership with the order.'
		],
		paths: [
			{
				deal: 'none',
				state: 'guest',
				detail: ['It’s {email}. I don’t remember signing in, to be honest. I think the site just asked for my email at the end.', '{email}. I’m not sure I was signed in, I just clicked through.'],
				look: ['{email}: Friend since {joined}, confirmed. {order} was placed as a guest with the same email, so no discount. Asking finance to refund the 5%, {friendsValue}.', 'Membership fine. {order} was a guest checkout, so checkout didn’t know it was a Friend. 5% would be {friendsValue}.'],
				lookPaste: 'friends',
				team: 'finance',
				ends: [
					[['f', 'Refunded {friendsValue} to the {cardType} ending {card} for {order}.'], ['a', 'That explains it: {order} went through as a guest checkout, so the system didn’t know it was you, even though the email is the same. As a one-off I’ve had the 5%, {friendsValue}, refunded to your card. For next time, if you sign in before you check out, the discount shows in the basket before you pay.'], ['c', 'Thank you! I’ll make sure to sign in from now on.']],
					[['a', 'I’ve found it: {order} was placed as a guest, without signing in, so the Friends discount couldn’t be applied. We can’t add it to a guest order afterwards, I’m afraid.'], ['c', 'That’s a bit mean, since it’s literally the same email. Can the website not just match it up?'], ['a', 'You’re not the first to ask, and I agree it should. I’ve added your ticket to the web team’s request to recognise Friends at guest checkout, so you’ll hear from us when it changes.'], ['w', 'Linked. Recognising Friends by email at guest checkout is on the list for after Christmas.']]
				]
			},
			{
				deal: 'none',
				state: 'unconfirmed',
				open: ['I joined Friends specifically for the discount, then placed an order the same week, and there’s no discount anywhere on the confirmation. Order {order}.', 'I signed up to Friends of Larkspur a few days before ordering, but {order} was charged at full price.'],
				detail: ['My email is {email}. I joined on the website a couple of weeks ago.', '{email}. I joined online, I remember ticking the box.'],
				look: ['{email} joined Friends {joined} but never clicked the confirmation link, so the membership isn’t active. Confirmation email delivered, not opened.'],
				lookPaste: 'friends',
				ends: [
					[['a', 'I’ve found it: you joined on {joined}, but the membership only starts once the link in the confirmation email is clicked, and that hasn’t happened yet. It may have gone to your spam folder. I’ve sent it again just now. Once you click it, the discount comes off every order. As your order came so soon after joining, I’ve also refunded the 5%, {friendsValue}, to your card.'], ['c', 'Found it in spam, clicked. Thanks for the refund, that’s kind.']],
					[['a', 'You joined on {joined}, but the membership needs the link in the confirmation email clicking before it starts, and it hasn’t been. I’ve sent the email again. After that, the 5% comes off automatically when you’re signed in.'], ['c', 'Done. Will I get the 5% on {order}?'], ['a', 'I can’t add it to an order placed before the membership started, I’m sorry, but every order from now on will have it.'], ['c', 'OK, understood.']]
				]
			},
			{
				deal: 'none',
				state: 'two',
				detail: ['Friends is under {email2}, but I might have ordered with {email}. I have two email addresses and use both.', 'I joined with {email2}, I think, and the order was {email}? I mix them up.'],
				look: ['Two accounts: {email2} (Friend since {joined}) and {email} (not a Friend). {order} was on the second. Asked the web team whether they can merge.'],
				lookPaste: 'friends',
				team: 'the web team',
				ends: [
					[['w', 'Merged customer {cust2} into {cust}: orders, addresses and the Friends membership are all under {email} now. {email2} stays as a sign-in address.'], ['a', 'The order was on your other account, which isn’t a Friend. The web team have now merged the two, so you can sign in with either address and the discount will come off. I’ve also had the 5% on {order}, {friendsValue}, refunded to your card.'], ['c', 'Perfect, that’s exactly what I needed. Thanks.']],
					[['w', 'Can’t merge accounts safely by hand: too much hangs off the order history. Self-service merging is planned for the new year.'], ['a', 'The order was on your other account, which isn’t a Friend. The web team can’t merge the two yet; it’s planned for the new year. Until then, if you sign in with {email2} before you order, the 5% will come off.'], ['c', 'OK, I’ll use the other email. A bit clunky, but fine.']]
				]
			},
			{
				deal: 'none',
				state: 'none',
				detail: ['I’m sure I signed up. It was at your stand at the garden show in the summer? Or maybe it was the newsletter.', 'It should be {email}. I filled in a card at the garden show in June.'],
				look: ['No Friends membership under {email} or under the surname. Newsletter subscriber since {joined}. Thinks the newsletter is Friends.'],
				lookPaste: 'friends',
				ends: [[['a', 'I’ve looked, and you’re signed up to our newsletter but not to Friends, which is separate. Friends is free: you join in your account under “Friends of Larkspur”, confirm your email, and from then on 5% comes off every order when you’re signed in. I can’t apply it to {order}, as you weren’t a member when you ordered, I’m afraid.'], ['c', 'Ah, I see. I’ve joined now. Thanks for explaining.']]]
			}
		]
	},
	// A gift voucher that hasn't arrived.
	{
		since: VOUCHERS_FROM + DAY,
		goods: ['gifts'],
		status: 'voucher',
		placed: [1, 5],
		subjects: ['Gift voucher not received', 'Voucher email never came', 'Where is the gift voucher?', 'Bought a voucher, nothing arrived'],
		open: [
			'I bought a {vamount} gift voucher for my {relation} on {placed} and {they} says nothing has arrived. Can you check where it went?',
			'My {relation} tells me the Larkspur voucher I bought hasn’t come. It was meant to be a birthday present and now I’m mortified.',
			'I ordered an e-voucher for {gift} last week. I was expecting to get a copy myself as well, but I haven’t seen anything either.'
		],
		more: ['The birthday is on {day}, so it’s getting tight.', 'I bought it on my phone, so it’s possible I typed something wrong.', 'It’s the first time I’ve bought a voucher from you.'],
		ask: [
			'Sorry about that. Could you tell me the email address you sent the voucher to? And did you choose a date for it to be sent, or send it straight away?',
			'Let me find it. Which email address was it going to, and did you pick a delivery date at checkout?'
		],
		paths: [
			{
				state: 'scheduled',
				detail: ['It was going to {gemail}. I don’t remember picking a date, but I did it in a hurry.', '{gemail}. I may have picked a date, I honestly can’t remember.'],
				look: ['Voucher {vcode} for {vamount}, bought {placed} on {order}, set to send on {sendDate}. Nothing wrong; a date was chosen at checkout.'],
				lookPaste: 'voucher',
				ends: [
					[['a', 'Good news: nothing’s lost. The voucher is set to send on {sendDate}, the date chosen at checkout, so it simply hasn’t gone yet. If you’d like it to go now instead, I can send it straight away, or I can leave it as it is.'], ['c', 'Oh, I must have tapped the date. Leave it then, that’s actually perfect timing. Thanks!']],
					[['a', 'The voucher is safe: it’s scheduled for {sendDate}, the date picked at checkout. Shall I send it now instead?'], ['c', 'Yes please, send it now.'], ['n', 'Sent {vcode} now to {gemail}.'], ['a', 'Done, it’s on its way to {gemail}, and a copy has gone to you.'], ['c', 'Got it, thanks!']]
				],
				happy: true
			},
			{
				state: 'bounced',
				detail: ['I sent it to {gemailTypo}, straight away.', 'It went to {gemailTypo}, I think. Immediately, not on a date.'],
				look: ['Voucher {vcode} sent {placed} to {gemailTypo}: bounced, no such mailbox. Probably meant {gemail}.'],
				lookPaste: 'emails',
				team: 'the web team',
				ends: [
					[['a', 'I think I’ve found it: the voucher went to {gemailTypo}, which bounced. Is the right address {gemail}? If you confirm, we’ll send it there.'], ['c', 'Yes! I missed a letter. Please send it to {gemail}.'], ['w', 'Changed the recipient of {vcode} to {gemail} and resent.'], ['a', 'Done: the voucher has gone to {gemail}. The code is the same, and it’s valid for twelve months from the day you bought it.'], ['c', 'Received, thank you so much.']]
				]
			},
			{
				state: 'delivered',
				detail: ['It was to {gemail}, sent straight away.', '{gemail}. I didn’t pick a date.'],
				look: ['Voucher {vcode} delivered to {gemail} on {placed}, not opened. Most likely in spam.'],
				lookPaste: 'emails',
				ends: [[['a', 'The voucher was delivered to {gemail} on {placed}, so it has arrived somewhere. Could {gift} check the spam or promotions folder for an email from Larkspur with “gift voucher” in the subject? I’ve also sent you a copy, so you could pass the code on yourself.'], ['c', 'Found in the junk folder. Panic over. Thank you!']]],
				happy: true
			},
			{
				state: 'declined',
				detail: ['It was to {gemail}. Now that I look, I never got a confirmation email myself either.', '{gemail}. Actually, I’m not sure I ever got a receipt.'],
				look: ['No voucher bought by {email}. Two declined payments on {placed} for {vamount}: the bank wanted approval in the app, which never came, and the basket was left. No voucher exists.'],
				lookPaste: 'payments',
				ends: [[['a', 'I’m sorry to say the voucher was never bought: the payment on {placed} was declined twice because your bank wanted it approved in your banking app, and it wasn’t, so the order never completed and nothing was charged. If you buy it again and approve the payment when the app asks, it will go straight through. You can choose to send it immediately.'], ['c', 'Oh no. I remember my phone buzzing and ignoring it. I’ve bought it again now and it’s gone. Thanks for getting to the bottom of it.']]]
			}
		]
	},
	// A gift voucher the checkout won't take.
	{
		since: VOUCHERS_FROM + 3 * DAY,
		goods: ['plants', 'pots', 'tools', 'bulbs', 'houseplants'],
		status: 'basket',
		subjects: ['Voucher code not accepted', 'Gift voucher won’t work', 'Problem using gift voucher', 'voucher not valid??'],
		open: [
			'I was given a Larkspur gift voucher for my birthday and I’m trying to use it, but the checkout says the code isn’t valid. The code starts {vprefix}. Could you check it?',
			'I have a gift voucher for {vamount} and I can’t get it to work. I’ve got {items} in my basket and it just won’t take the code.',
			'I’m trying to spend a gift voucher on your website and it keeps telling me the code can’t be used. It was a present, so I don’t know much about where it came from.'
		],
		more: ['I’ve copied it in rather than typing it, so I don’t think it’s a typo.', 'I’d hate to lose it, it was a lovely present.', 'I’ve tried on two different browsers.'],
		ask: [
			'Sorry for the trouble. Where on the checkout page are you entering it, and could you send me the full code? Then I can see whether it’s been used or whether something else is going on.',
			'Let me check the voucher. Could you send me the full code, and tell me which box you’re typing it into?'
		],
		paths: [
			{
				state: 'unused',
				detail: ['The code is {vcode}. I’m putting it in the box that says “Discount code”, on the basket page.', 'It’s {vcode}, and I’m entering it in the discount code box.'],
				look: ['Voucher {vcode}, {vamount}, unused, valid to {vexpiry}. Being entered in the discount code box.'],
				lookPaste: 'voucher',
				ends: [
					[['a', 'The voucher is fine: {vamount}, unused, valid until {vexpiry}. The trouble is the box. “Discount code” only takes percentage codes; gift vouchers go in the box underneath, “Gift voucher”, which appears on the payment step. Pop it in there and the amount will come off your order.'], ['c', 'Found it, it worked. You might want to make that clearer, I can’t be the first!'], ['a', 'You’re not, and I’ve passed that on.'], ['w', 'Noted, that’s the {nth} this month. One box for both kinds of code is on the list.']],
					[['a', 'Your voucher is valid: {vamount}, unused, until {vexpiry}. It just needs to go in the “Gift voucher” box on the payment step rather than the discount code box on the basket page.'], ['c', 'That was it. Thank you!']]
				],
				happy: true
			},
			{
				state: 'redeemed',
				detail: ['It’s {vcode}. It came in a card from my {relation}.', 'Code {vcode}. It was a present from my {relation}.'],
				look: ['Voucher {vcode} redeemed in full on {redeemDate} on {order0}, delivered to {town2}. Bought by {buyer}.'],
				lookPaste: 'voucher',
				ends: [
					[['a', 'That voucher was used on {redeemDate}, on an order delivered to {town2}. It may be that the person who bought it used it by mistake, or passed on the code before the card. I can’t share someone else’s order, but if you ask your {relation}, {they} will recognise it.'], ['c', 'Well, that’s a mystery. I’ll ask. Thanks for checking.']],
					[['a', 'The voucher was spent on {redeemDate}, on an order going to {town2}. I can’t say more about another customer’s order, but it might be worth a gentle word with your {relation}.'], ['c', 'Mystery solved: {they} used it on a pot for {their} own garden by mistake and has bought me a new one. Sorry for the bother!'], ['a', 'No bother at all. Enjoy the new one!']]
				]
			},
			{
				state: 'none',
				detail: ['It’s a card from your nursery shop, number {paperNo}, for {vamount}. It doesn’t have a code like the website ones.', 'It’s a paper card from the nursery, number {paperNo}, {vamount}, from a couple of years ago.'],
				look: ['Paper gift card {paperNo} from the nursery shop, {vamount}, unspent in the shop’s book. Not usable online. Asked finance to swap it for an online voucher.'],
				lookPaste: 'none',
				team: 'finance',
				ends: [[['f', 'Issued online voucher {vcode} for {vamount} in exchange for nursery card {paperNo}; the card is cancelled in the shop’s book.'], ['a', 'The paper cards from the nursery shop can’t be used on the website, but we’ve swapped yours: here’s an online voucher, {vcode}, for the same {vamount}, valid for twelve months. Enter it in the “Gift voucher” box on the payment step. The paper card has been cancelled, so you can recycle it.'], ['c', 'That’s great, thank you. Order placed.']]],
				happy: true
			},
			{
				state: 'pair',
				detail: ['I actually have two, {vcode} and {vcode2}, both for {vamount}, from two different people. The first one works, but then I can’t add the second.', 'There are two codes, {vcode} and {vcode2}. One goes in and then the other is refused.'],
				look: ['Both vouchers valid. Checkout takes one gift voucher per order.'],
				lookPaste: 'voucher',
				team: 'finance',
				ends: [[['a', 'Both vouchers are fine; the checkout only takes one gift voucher per order. If you’d like to use both at once, finance can combine them into one voucher for the total. Shall I ask them?'], ['c', 'Yes please, that would be ideal.'], ['f', 'Combined {vcode} and {vcode2} into {vcode3} for {vdouble}; the two old codes are closed.'], ['a', 'Done: your new voucher is {vcode3}, for {vdouble}, and the two old codes no longer work. It keeps the earlier of the two expiry dates.'], ['c', 'Brilliant, thank you!']]]
			}
		]
	},
	// A price that changed between the basket and the payment.
	{
		goods: ['pots'],
		status: 'new',
		placed: [0, 3],
		subjects: ['Price changed at checkout', 'Price went up overnight', 'Charged more than the price shown', 'Sale price not honoured'],
		open: [
			'I put the {saleItem} in my basket during your pot sale, when it was {salePrice}, and when I came back to pay it was {fullPrice}. Is that right? Nothing in the basket said the price would change.',
			'I’ve just paid {paid} for order {order}, and I’m fairly sure the {saleItem} was cheaper when I added it. Can you check?',
			'Your website showed the {saleItem} at {salePrice} in the sale. I ordered it on {placed} and was charged {fullPrice} for it. I’d like the difference back, please.'
		],
		more: ['I had it in the basket for a couple of days while I measured the space.', 'I’ve a screenshot of the sale price on my phone, if it helps.', 'I didn’t notice until the confirmation came through.'],
		ask: [
			'Thanks for flagging it. Could you tell me roughly when you added it to the basket, and when you paid? Prices in a basket follow the website, so the timing matters.',
			'Let me look into that. When did you put it in the basket, and when did the order go through?'
		],
		paths: [
			{
				since: SALE_TO + 2 * DAY,
				until: SALE_TO + 12 * DAY,
				placed: [0, 1],
				deal: 'none',
				detail: ['I added it during the sale, the weekend before, and paid on {placed}. I didn’t realise the sale had an end date.', 'Added it while the sale was on, paid on {placed}.'],
				look: ['The autumn pot sale ended at midnight on {saleEnd}. {order} was placed {placed}, after it ended, so full price is correct. Difference would be {saleDiff}.'],
				ends: [
					[['a', 'I’ve checked: the autumn pot sale ended at midnight on {saleEnd}, and your order went through after that, so the website charged the full price. I can see that’s annoying when it sat in your basket at the sale price, so as a goodwill gesture I’ve had the difference, {saleDiff}, refunded to your card.'], ['f', 'Refunded {saleDiff} on {order}.'], ['c', 'That’s really fair of you, thank you.']],
					[['a', 'The pot sale ended at midnight on {saleEnd}, and your order went through after it, so the full price was right, I’m afraid. A basket doesn’t hold a price; it always shows the current one.'], ['c', 'I suppose that’s how sales work. Still, a warning in the basket would be nice.'], ['a', 'I agree, and I’ve passed that on.'], ['w', 'Showing “sale ends tonight” on basket lines is a small job; on the list.']]
				]
			},
			{
				deal: 'none',
				state: 'size',
				open: ['I ordered the {saleItem} on {placed} and was charged {fullPrice}, but the website said {salePrice}. Can you check?', 'I’ve just paid {paid} for order {order}, and the {saleItem} was {salePrice} on the website, not {fullPrice}. What happened?'],
				detail: ['I paid on {placed}. The product page said {salePrice}.', 'It said {salePrice} on the product page, I’m certain.'],
				look: ['{salePrice} was the price of the {smallSize} size; the order is for the {bigSize}, at {fullPrice}. Charged correctly.'],
				ends: [[['a', 'I think I can see what happened: {salePrice} was the price of the {smallSize} size, and your order is for the {bigSize}, which costs {fullPrice}. The page shows both sizes in one dropdown, which is easy to miss. If you’d prefer the smaller one, I can swap it and refund the difference before it’s dispatched.'], ['c', 'Oh no, you’re right, I chose the big one. Keep it as it is, it’s the one I wanted anyway.'], ['a', 'No problem at all. It will go out as ordered.']]]
			}
		]
	},
	// A customer who found it cheaper elsewhere.
	{
		goods: ['pots', 'tools', 'plants'],
		status: 'basket',
		subjects: ['Price match?', 'Cheaper elsewhere', 'Can you match this price', 'Same item, lower price'],
		open: [
			'I was about to order the {pmItem} from you at {pmPrice}, but {rival} has what looks like the same thing for {rivalPrice}. Do you price match? I’d rather buy from you if you can.',
			'Do you match prices? I’ve seen the {pmItem} for {rivalPrice} elsewhere, and you have it at {pmPrice}.',
			'Before I order: {rival} is selling the {pmItem} for {rivalPrice}. Is there any chance you could do the same?'
		],
		more: ['I like that you’re Irish and I’d prefer to support you.', 'It’s a big difference on one item.', 'I’ve bought from you before and was very happy.'],
		ask: [
			'Thanks for asking us first. Could you send me a link or a photo of the other listing? I’d like to be sure we’re comparing the same thing.',
			'Thanks for checking with us. Do you have a link to the other one, so I can compare?'
		],
		paths: [
			{
				detail: ['Here’s the listing: it’s the {pmItem}, same size as far as I can see.', 'Photo attached of their shelf label.'],
				look: ['Looks like the same item. We don’t price match.'],
				lookPaste: 'none',
				ends: [
					[['a', 'Thanks, {name}. I’m afraid we don’t price match: our prices are set to cover growing, careful packing and delivery to your door, and we can’t follow every shop’s offers. I understand if you’d rather buy it there.'], ['c', 'Fair enough, thanks for the honest answer. I’ll think about it.']],
					[['a', 'We don’t price match, I’m sorry. What I can say is that ours comes with our twelve-month guarantee, and delivery is free on orders over €60.'], ['c', 'OK, I’ll stick with you then. Order placed.']]
				]
			},
			{
				detail: ['It’s {rival}, here’s the link. It looks identical.', 'I saw it in the shop, here’s a photo of the label.'],
				look: ['Theirs is a {rivalSize}; ours is {ourSize}. Not the same product.'],
				lookPaste: 'none',
				ends: [[['a', 'Thanks for the link. I don’t think they’re the same: theirs is a {rivalSize}, and ours is {ourSize}, which is why the prices differ. We don’t price match in any case, but I hope that explains the gap.'], ['c', 'Ah, I didn’t spot that. That makes sense. I’ll go with yours.']]]
			},
			{
				detail: ['Sorry, I can’t find it again now. It was definitely cheaper though.', 'I don’t have the link any more, it was an ad on Instagram.'],
				look: ['No listing to compare. Not a Friend, no first order yet.'],
				lookPaste: 'none',
				ends: [[['a', 'No problem. We don’t price match, but as you haven’t ordered with us before, you can sign up to the newsletter at the bottom of any page and get a 10% code for a first order.'], ['c', 'Done, and the welcome code worked. Thanks!']]]
			}
		]
	},
	// A parcel that hasn't arrived.
	{
		goods: ['bulbs', 'plants', 'pots', 'tools', 'compost', 'houseplants'],
		status: 'dispatched',
		placed: [4, 9],
		subjects: ['Where is my order?', 'Parcel not delivered', 'Order not arrived', 'Tracking says delivered but nothing here', 'Still waiting'],
		open: [
			'I ordered {items} on {placed} and it still hasn’t arrived. The email said two to four working days. The tracking hasn’t changed since {wday}.',
			'Any idea where my order is? {order}. I’ve been in all week waiting for it.',
			'My order {order} should have come days ago. Can you find out where it is?'
		],
		more: ['There are plants in it, so I’m worried about them sitting in a van.', 'I took a day off for the delivery, which I can’t really do again.', 'I had the planting weekend planned around it.'],
		ask: [
			'Sorry about the wait. Let me check with the courier. Could you confirm the delivery address, with the Eircode, so I can compare it with what they have?',
			'I’ll chase it now. Could you confirm the address and Eircode it should be going to?'
		],
		paths: [
			{
				state: 'stuck',
				detail: ['It’s {address}.', '{address}, same as always.'],
				look: ['Tracking {tracking}: held at the {hub} hub since {wday}. Courier says a backlog after the storm; on a van tomorrow.'],
				lookPaste: 'tracking',
				ends: [[['a', 'The parcel has been held at the courier’s {hub} hub since {wday}, because of a backlog after the weekend’s storm. They tell me it’s on a van tomorrow. Plants travel in sealed boxes and are fine for a few extra days, but if anything looks unhappy when it arrives, send me a photo.'], ['c', 'It came this morning and everything looks fine. Thanks for chasing.']]],
				happy: true
			},
			{
				state: 'safe',
				open: ['The tracking for order {order} says delivered, but there’s nothing here. I’ve checked the porch, the shed and with the neighbours on one side.', 'I got a text saying my parcel was delivered on {delivered}, but nothing has come. Order {order}.'],
				detail: ['It’s {address}. Nobody rang the bell.', '{address}. I was in all day.'],
				look: ['Tracking says delivered {delivered}, left in safe place: behind side gate. Courier photo shows a green bin.'],
				lookPaste: 'tracking',
				ends: [[['a', 'The driver recorded leaving it “behind the side gate” on {delivered}, and their photo shows it beside a green bin. Could you have a look there?'], ['c', 'Found it! Behind the bins at the side of the house. I never go round there. Sorry!'], ['a', 'Not at all, glad it turned up.']]]
			},
			{
				state: 'lost',
				detail: ['It’s {address}.', '{address}, the house with the red door.'],
				look: ['Courier can’t find it; last scan at {hub} on {wday}. Declared lost. Asked dispatch to send again.'],
				lookPaste: 'tracking',
				team: 'our dispatch team',
				ends: [
					[['x', 'Re-sent {order} today on {tracking2}; claim opened with the courier for the first parcel.'], ['a', 'The courier has confirmed the parcel was lost at their depot, so we’ve sent your order again today, at no cost: the new tracking number is {tracking2}. I’m sorry for the wait.'], ['c', 'Thanks, the second one arrived fine.']],
					[['x', 'Everything on {order} is in stock except the {product}; re-sent the rest on {tracking2}. The {product} is back in on {restock}.'], ['a', 'The courier has lost the parcel, I’m sorry to say. We’ve sent everything again today on {tracking2}, apart from the {product}, which is out of stock until {restock}. Would you like us to send it then, or refund it?'], ['c', 'Please send it when it’s back. Thanks for sorting this.'], ['x', 'Noted: {product} for {order} to go out on {restock}.']]
				]
			},
			{
				state: 'returned',
				detail: ['It’s {address}. Oh, hang on, the Eircode on the confirmation is wrong. I think I typed {eircodeBad}.', '{address}. Although I see the confirmation email has {eircodeBad}, which isn’t ours.'],
				look: ['Order has Eircode {eircodeBad}; the customer’s is {eircode}. Driver couldn’t find it; parcel at the {depot} depot, held for five working days.'],
				lookPaste: 'tracking',
				ends: [
					[['a', 'That’s it: with the wrong Eircode the driver couldn’t find the house, and the parcel is now at the courier’s {depot} depot, where they’ll hold it until {day}. You can collect it there with the order number and photo ID, or I can ask them to redeliver to the corrected Eircode, which takes a couple of days. Which would you prefer?'], ['s', 'Reminder sent to the customer after five days without a reply.']],
					[['a', 'The wrong Eircode sent the driver astray, and the parcel is at their {depot} depot. I’ve given them the right one, {eircode}, and asked for it to be redelivered.'], ['c', 'Thanks, it arrived this afternoon.']]
				]
			}
		]
	},
	// Plants that arrived damaged, or look it.
	{
		goods: ['plants'],
		status: 'delivered',
		placed: [3, 8],
		subjects: ['Plants arrived damaged', 'Dead plant', 'Broken pot and squashed plant', 'Very disappointed with delivery', 'Order arrived in bad condition'],
		more: ['I’ve kept the box in case you need it.', 'I unpacked it straight away and watered it as the card said.', 'It was meant to be the centrepiece of the new bed.'],
		ask: [
			'I’m sorry it arrived like that. Could you send a photo of the plant, and one of the box if you still have it? That helps us work out what happened and what to do about it.',
			'Sorry to hear that. Could you send me a couple of photos, the plant and the packaging? Then I’ll get it sorted.'
		],
		paths: [
			{
				open: ['My order arrived on {delivered} and the box was crushed at one corner. The {product} has two broken stems and the pot it came in is cracked.', 'Order {order} came on {delivered} in a bad way: the box is squashed and the {product} is snapped.'],
				detail: ['Photos attached of both.', 'Here you go, three photos. You can see the corner of the box.'],
				look: ['Photos show the box crushed and two stems snapped. Damage in transit. Asked dispatch for a replacement.'],
				team: 'our dispatch team',
				ends: [[['x', 'Replacement {product} going out tomorrow on {tracking2}, packed with extra corners.'], ['a', 'Thanks for the photos. That’s damage in transit, so we’re sending a replacement {product} tomorrow, at no charge, on tracking {tracking2}. No need to send the damaged one back; if you cut the broken stems off, it may well recover.'], ['c', 'Replacement arrived and it’s lovely. Thanks for sorting it so quickly.']]],
				happy: true
			},
			{
				bare: true,
				open: ['I’m sorry to say the {product} I ordered looks dead. It arrived on {delivered} with most of its leaves already yellow, and more have dropped since. Very disappointing for the price.', 'The {product} from order {order} is dropping its leaves by the handful. It’s only been a few days. Is it dying?'],
				detail: ['Photo attached. It’s in the {room}, where it gets plenty of light.', 'Here’s a photo. I’ve had it in the {room} since it came.'],
				look: ['Photo shows a healthy {product} dropping its leaves for winter, as it should. Asked Bridget to reply.'],
				lookPaste: 'none',
				team: 'our head grower',
				ends: [[['G', 'Hello {name}, I’m the head grower at Larkspur. Your {product} is perfectly healthy: it’s deciduous, and in {month} it drops its leaves for winter, often all at once after being moved. If you scratch a stem gently with a fingernail and it’s green underneath, it’s alive. Keep it outside, where it wants to be, water only if the compost dries out, and you’ll see buds in March. If it hasn’t come into leaf by the end of April, write to us and we’ll replace it.'], ['c', 'Well, I feel silly. Green under the bark, as you said. It’s back outside. Thank you for the lesson!']]],
				happy: true
			},
			{
				deal: 'none',
				open: ['I’m sorry to say the {product} from order {order} looks very sorry for itself. Half the leaves are brown and it’s gone limp.', 'The {product} I ordered doesn’t look well at all. Can you help?'],
				detail: ['It came on {delivered}, but I was away, so it sat in the porch until I got back {n} days later. Photo attached.', 'Photo attached. I should say it was left outside for a few days while we were away.'],
				look: ['Delivered {delivered}; customer away, plant sat in its box for {n} days. Not the courier’s fault, but it looks rough. Half refund as goodwill?'],
				ends: [
					[['a', 'Thanks for the photo and for being upfront. A plant that spends {n} days in a closed box struggles, which isn’t something the courier caused, but as a gesture I’ve refunded half the price of the {product}, {half}, to your card. Bridget, our head grower, suggests trimming off anything brown, planting it out and watering it in: there’s every chance it comes back in spring.'], ['f', 'Refunded {half} on {order}.'], ['c', 'That’s more than fair. Fingers crossed for spring!']],
					[['a', 'Sorry, {name}: as it was left in the box for {n} days, we can’t treat it as damage in transit. Bridget suggests cutting back anything brown and planting it out; there’s a good chance it recovers.'], ['c', 'I understand. I’ll give it a go.']]
				]
			},
			{
				open: ['I received order {order} and I’m not happy. The {product} looks nothing like the photo on your site.', 'The {product} I ordered is much less impressive than your website made it look.'],
				detail: ['The photo shows it covered in flowers, and mine is basically sticks with a few leaves. Photo attached.', 'Photo attached. On the website it’s in full flower.'],
				look: ['Plant looks healthy, just cut back for winter. Website photo is the summer one.'],
				ends: [
					[['a', 'Thanks for the photo, and I understand the disappointment. Your {product} is healthy: plants are sent cut back and resting at this time of year, and the photo on the website shows one in flower in midsummer. You’ll see it look like the picture next year. If you’d rather not wait, you’re welcome to return it within 30 days for a refund.'], ['c', 'Fair enough, I’ll keep it and be patient.']],
					[['a', 'Your {product} is fine, just resting for winter; the website shows it in full summer flower. If you’d still prefer to send it back, I can arrange a return.'], ['c', 'I think I would, to be honest. I wanted something with colour now.'], ['a', 'No problem. I’ve emailed you a returns label; once it’s back with us, the {product} will be refunded to your card.'], ['s', 'Reminder sent to the customer after five days without a reply.']]
				]
			}
		]
	},
	// Something missing from a parcel, or the wrong thing in it.
	{
		goods: ['bulbs', 'pots', 'tools', 'plants', 'compost'],
		status: 'delivered',
		placed: [3, 8],
		subjects: ['Item missing from order', 'Wrong item sent', 'Only half my order arrived', 'Not what I ordered'],
		more: ['The box was sealed, so I don’t think anything fell out.', 'It’s a gift, so I’d like the whole thing together.', 'I’ve checked twice, including under the packing paper.'],
		ask: [
			'Sorry about that. Let me check how the order was packed and get back to you. Could you send a photo of the packing slip?',
			'Thanks for letting us know. Could you send me a photo of what arrived, and the packing slip if you have it?'
		],
		paths: [
			{
				state: 'split',
				second: ['plants'],
				open: ['My order {order} arrived on {delivered}, but the {missing} isn’t in the box. Everything else is there. Was it sent separately?', 'Only part of my order has come. The packing slip lists everything, but there’s no {missing}.'],
				detail: ['Photo of the slip attached.', 'Here’s the slip. It doesn’t say anything about a second parcel.'],
				look: ['Went in two parcels: the rest from the warehouse, the {missing} from the nursery. Second parcel on {tracking2}, due {day}.'],
				lookPaste: 'tracking',
				ends: [[['a', 'Good news: nothing’s missing. Your order went in two parcels, because the {missing} comes from our nursery and the rest from the warehouse. The second parcel is on its way, tracking {tracking2}, due on {day}. I’m sorry the slip didn’t say so.'], ['c', 'Arrived this morning. Thanks!']]]
			},
			{
				state: 'wrong',
				goods: ['bulbs'],
				open: ['I ordered {wanted} and I’ve been sent {sent} instead. I’m planting this weekend, so I really need the right ones.', 'Wrong bulbs in my order {order}: I asked for {wanted} and got {sent}.'],
				detail: ['Photo attached of the bags. They clearly say {sent}.', 'Here’s a photo: the label says {sent}.'],
				look: ['Picking error: {sent} sent in place of {wanted}. Asked dispatch to send the right ones; customer can keep the others.'],
				team: 'our dispatch team',
				ends: [[['x', 'Sent {wanted} today on {tracking2}. Bin labels swapped at the warehouse, fixed.'], ['a', 'So sorry, that was our mistake: two bins were mislabelled. The right {wanted} went out today on {tracking2}, and please keep the {sent} with our apologies; they’ll look lovely somewhere else in the garden.'], ['c', 'Oh, that’s generous. Thank you, they arrived in time for the weekend.']]],
				happy: true
			},
			{
				state: 'short',
				deal: 'none',
				second: ['plants', 'pots', 'tools'],
				open: ['My order {order} arrived on {delivered}, but the {missing} isn’t in the box. Everything else is there. Was it sent separately?', 'Only part of my order has come. There’s no {missing}, and I’ve checked under all the paper.'],
				detail: ['Photo attached. I did get an email about something, now that I think of it, but I didn’t read it properly.', 'Slip attached. I may have had an email about it, I get so many.'],
				look: ['{missing} was out of stock when picked; {missingPrice} refunded to the card on {refundDate}, with an email. Back in on {restock}.'],
				lookPaste: 'refunds',
				ends: [[['a', 'The {missing} was out of stock when your order was packed, so we refunded it, {missingPrice}, to your card on {refundDate}; that was the email you got. It’s due back in on {restock}. Would you like me to put you on the list to hear when it’s back?'], ['c', 'Yes please. Sorry, I should have read the email.'], ['a', 'Done. You’ll get an email the day it’s back.']]]
			}
		]
	},
	// A change of address or delivery day.
	{
		goods: ['plants', 'pots', 'hedging', 'gifts', 'bulbs'],
		status: 'new',
		placed: [0, 2],
		subjects: ['Change of delivery address', 'Can I change where my order goes?', 'Delivery date', 'Wrong address on order', 'Hold my order please'],
		more: ['Sorry for the trouble, it was a hectic week.', 'I only noticed when the confirmation came through.', 'Please let me know either way so I can make plans.'],
		ask: [
			'No problem, let me catch it before it goes. Could you confirm the full new address with the Eircode?',
			'I’ll check whether it has left yet. What’s the address, with the Eircode, it should go to?'
		],
		paths: [
			{
				open: ['I’ve just realised order {order} is going to my old address. We moved last month. Can you change it?', 'I sent a present to my {relation} but put my own address by mistake. Order {order}. Can it go to {them} instead?'],
				detail: ['It’s {newAddress}.', 'The address is {newAddress}.'],
				look: ['{order} not picked yet. Changed the address.', 'Not dispatched; address updated on {order}.'],
				ends: [[['a', 'All done: {order} hadn’t left yet, so I’ve changed the address to {newAddress}. You’ll get a dispatch email with tracking when it goes.'], ['c', 'Thank you, that’s a weight off.']]],
				happy: true
			},
			{
				state: 'dispatched',
				open: ['I’ve just realised order {order} is going to my old address. We moved last month. Can you change it?', 'I sent a present to my {relation} but put my own address by mistake. Order {order}. Can it go to {them} instead?'],
				detail: ['It’s {newAddress}.', '{newAddress}, please.'],
				look: ['Already dispatched on {tracking}. Asked dispatch to redirect with the courier.'],
				lookPaste: 'tracking',
				team: 'our dispatch team',
				ends: [
					[['x', 'Greenline agreed to redirect {tracking}; one extra day.'], ['a', 'The order had already left, but the courier has agreed to redirect it to {newAddress}. It will take one extra day.'], ['c', 'Brilliant, it’s arrived. Thanks for all the help.']],
					[['x', 'Greenline won’t redirect between depots. It will come back to us and we’ll send it again to the new address.'], ['a', 'The parcel had already gone, and the courier can’t redirect it, so it’s coming back to us and we’ll send it out again to {newAddress} as soon as it lands, at no cost to you. That adds about three working days. I’m sorry for the delay.'], ['c', 'OK, not ideal, but thanks for sorting it.'], ['x', 'Back in and re-sent on {tracking2}.']]
				]
			},
			{
				open: ['Could I have order {order} delivered on {day2} instead? I’m away until then and don’t want plants sitting on the doorstep.', 'Is there any way to delay order {order}? Nobody will be home until {day2}.'],
				detail: ['Please hold it until {day2}. Same address.', 'Hold it until {day2}, please. I’m home from then.'],
				look: ['Holding {order} until {day2}.'],
				team: 'our dispatch team',
				ends: [[['x', 'Hold on {order} until {day2}; plants are fine in the cold store.'], ['a', 'Done: we’re holding the order at the nursery and it will go out on {day2}, so it reaches you the day after. The plants will be kept in the cold store until then.'], ['c', 'Perfect, thanks.']]],
				happy: true
			}
		]
	},
	// An order of bare-root plants that hasn't been sent.
	{
		goods: ['roses', 'hedging'],
		status: 'preorder',
		placed: [5, 25],
		subjects: ['When will my roses be sent?', 'Order not dispatched yet', 'Still showing “processing”', 'Hedging delivery date', 'Has my order been forgotten?'],
		open: [
			'I ordered {items} on {placed} and the order still says “processing”. Has it been forgotten?',
			'When will my {product} be delivered? I need to be home for it, and to have the ground ready.',
			'It’s been weeks since I ordered and nothing has arrived. Order {order}. What’s going on?'
		],
		more: ['I didn’t see anything about a wait when I ordered.', 'I’ve dug the trench already.', 'My {relation} is coming to help plant it, so I need a date.'],
		ask: [
			'Sorry for the worry. Let me check the order. Is there a particular week you need it by?',
			'I’ll find out. Is there a date it needs to arrive by?'
		],
		paths: [
			{
				detail: ['No particular date, I just wanted to know it hadn’t been lost.', 'Not really, as long as it’s before Christmas.'],
				look: ['{order}: bare-root, dispatched from {season} with the rest of the season’s orders. Nothing wrong.'],
				ends: [[['a', 'Nothing’s been forgotten: the {product} is bare-root, which means it’s lifted from the field only once it’s dormant, and this season’s go out from {season}. Yours will be in the first batches, and you’ll get an email with tracking when it leaves.'], ['c', 'Ah, that makes sense. Thanks for explaining.']]],
				happy: true
			},
			{
				detail: ['I need it this week, honestly. I’ll cancel if it can’t come sooner.', 'If it can’t come now I’d rather cancel and get something from a garden centre.'],
				look: ['Can’t send bare-root before {season}. Customer wants to cancel. Cancelled; asked finance to refund {paid}.'],
				team: 'finance',
				ends: [[['a', 'I’m sorry, bare-root plants can’t be sent before {season}, because they’re still in the field. As you need it sooner, I’ve cancelled {order}.'], ['f', 'Refunded {paid} for cancelled {order}.'], ['a', 'The full {paid} is on its way back to your card. I hope we see you again in the spring.'], ['c', 'Thanks for being so quick about it.']]]
			},
			{
				goods: ['hedging'],
				until: HEDGING_FROM - 2 * DAY,
				detail: ['I’m away the week after next, so it needs to be either side of that.', 'I can do any day except the week after next.'],
				look: ['Large order; goes on a pallet with a booked day. Asked dispatch to book around the customer’s week away.'],
				team: 'our dispatch team',
				ends: [[['x', 'Booked {order} for {deliveryDay} with Fernway; they’ll text the morning before.'], ['a', 'Dispatch have booked your delivery for {deliveryDay}. It comes on a pallet with our freight courier, who will text you a two-hour slot the morning before.'], ['c', 'Perfect, I’ll be ready.']]]
			}
		]
	},
	// A return.
	{
		goods: ['pots', 'tools', 'gifts'],
		status: 'delivered',
		placed: [3, 12],
		subjects: ['Return', 'I’d like to return an item', 'Returning a pot', 'How do I send something back?', 'Not suitable, can I return?'],
		open: [
			'I’d like to return the {product} from order {order}. It’s much bigger than I expected and doesn’t suit the space. It’s unused, still in its wrapping.',
			'How do I return something? I ordered the {product} as a present and it turns out they already have one.',
			'The {product} I ordered isn’t what I hoped. Can I send it back?'
		],
		more: ['I have the original box.', 'It’s a lovely thing, just not right for us.', 'I couldn’t see a returns form on the website.'],
		ask: [
			'Of course. Is it unused, and do you still have the packaging? Then I’ll send you a returns label.',
			'No problem. Could you tell me whether it’s been used, and whether you’d like a refund or an exchange?'
		],
		paths: [
			{
				deal: 'none',
				detail: ['Unused, original packaging. A refund, please.', 'Never used, still wrapped. Refund please.'],
				look: ['Within 30 days, unused. Returns label sent.'],
				ends: [
					[['a', 'I’ve emailed you a prepaid returns label. Pack the {product} in its box, stick the label on, and drop it at any Greenline parcel point. Once it’s back with us, the {returnPrice} will be refunded to your card.'], ['c', 'Dropped it off this morning.'], ['f', 'Return received; refunded {returnPrice} on {order}.'], ['a', 'It’s arrived, and {returnPrice} is on its way back to your card. Thanks, {name}.']],
					[['a', 'I’ve emailed you a returns label. Once the {product} is back with us, we’ll refund {returnPrice} to your card.'], ['s', 'Reminder sent to the customer after five days without a reply.']]
				]
			},
			{
				deal: 'none',
				detail: ['I’ve used it once, to be honest, but it’s clean.', 'I did use it for a weekend, but it’s in perfect condition.'],
				look: ['Used. Policy is unused items only, unless faulty.'],
				lookPaste: 'none',
				ends: [
					[['a', 'Thanks for being honest. Our returns are for unused items, unless something is faulty, so I’m afraid we can’t take this one back.'], ['c', 'OK, I thought that might be the case. Thanks anyway.']],
					[['a', 'We can only take back unused items, unless something is faulty, I’m sorry.'], ['c', 'It does have a crack in the base, actually, I didn’t mention it because I thought it was me. Photo attached.'], ['a', 'That’s a fault, so it’s different: I’ll refund {returnPrice} now, and there’s no need to send it back.'], ['f', 'Refunded {returnPrice} on {order}, faulty, no return.']]
				]
			},
			{
				deal: 'none',
				goods: ['pots'],
				detail: ['Unused. Could I swap it for the smaller size instead?', 'Unused, still boxed. I’d like the next size down, please.'],
				look: ['Exchange for the smaller size; in stock. Label sent, swap goes out when the return arrives.'],
				team: 'our dispatch team',
				ends: [[['a', 'Of course. I’ve emailed a returns label, and as soon as the {product} is back, we’ll send the smaller one and refund the difference.'], ['x', 'Return in; smaller size out on {tracking2}; difference refunded.'], ['a', 'The return has arrived, the smaller one is on its way on {tracking2}, and the difference is back on your card.'], ['c', 'Thanks, all perfect.']]]
			}
		]
	},
	// A refund that hasn't shown up.
	{
		goods: ['pots', 'tools', 'gifts'],
		status: 'delivered',
		placed: [12, 25],
		subjects: ['Refund not received', 'Still no refund', 'Where is my money?', 'Refund?', 'Return sent, no refund'],
		more: ['I kept the post office receipt.', 'I’m not trying to be difficult, I just need to keep track of my money.', 'I’ve checked my bank every day.'],
		ask: [
			'Sorry for the wait. Let me check where it is. Which card did you pay with, and is it still the one you use?',
			'Let me find out. Could you confirm which card you paid with, the last four digits are enough?'
		],
		paths: [
			{
				deal: 'none',
				open: ['You emailed on {wday} to say my refund had been issued, but there’s still nothing on my card. Order {order}.', 'I’m still waiting for a refund of {returnPrice} for order {order}. It’s been ages.'],
				detail: ['The card ending {card}, still the same one.', 'It was the {cardType} ending {card}.'],
				look: ['Refund of {returnPrice} issued {refundDate} to card ending {card}, reference {refundRef}. Normal bank timing.'],
				lookPaste: 'refunds',
				ends: [[['a', 'The refund of {returnPrice} went to your card ending {card} on {refundDate}, reference {refundRef}. Banks usually take five to ten working days to show it, so it should appear within the next few days. If it hasn’t by {day2}, your bank can trace it with that reference.'], ['c', 'It’s just come through, thank you.']]]
			},
			{
				deal: 'none',
				open: ['I sent back the {product} two weeks ago and haven’t heard anything since. Has it arrived?', 'I’m still waiting for a refund of {returnPrice} for order {order}. I posted the {product} back to you ages ago.'],
				detail: ['The card ending {card}.', 'It was paid with my card ending {card}.'],
				state: 'warehouse',
				look: ['Return delivered to the warehouse on {returnIn} but never booked in. Found it on the shelf. Asked finance to refund now.'],
				lookPaste: 'tracking',
				team: 'finance',
				ends: [[['f', 'Refunded {returnPrice} on {order}; apologies note sent to the warehouse.'], ['a', 'I’m sorry, {name}: your return reached our warehouse on {returnIn}, but it wasn’t booked in, so the refund never started. It has now, and {returnPrice} is on its way to your card. As an apology for the wait, here’s a code for 10% off your next order: {sorry}.'], ['c', 'Thank you, I appreciate that.']]]
			},
			{
				deal: 'none',
				open: ['You emailed on {wday} to say my refund had been issued, but there’s still nothing on my card. Order {order}.', 'I’m still waiting for a refund of {returnPrice} for order {order}. It’s been ages.'],
				detail: ['It was my old card ending {card}, which expired last month. Is that a problem?', 'The one ending {card}, but that card has since been replaced.'],
				look: ['Refund went to the card ending {card} on {refundDate}; card since replaced. Bank should forward it to the new card.'],
				lookPaste: 'refunds',
				ends: [
					[['a', 'The refund went to the card ending {card} on {refundDate}. When a card is replaced, the bank passes refunds on to the new one, so it should still reach you; it can just take a little longer. If you ask your bank with reference {refundRef}, they can confirm.'], ['c', 'The bank found it and it’s in my account now. Thanks.']],
					[['a', 'It went to the old card ending {card} on {refundDate}. Your bank should forward it; reference {refundRef} will help them find it.'], ['c', 'I’ll ring them tomorrow and let you know.']]
				]
			}
		]
	}
];

topics.push(
	// Two payments for one order.
	{
		goods: ['bulbs', 'plants', 'pots', 'tools', 'houseplants', 'gifts'],
		status: 'new',
		placed: [0, 3],
		shows: 'bank',
		subjects: ['Charged twice', 'Two payments taken', 'Double charged for one order', 'Two amounts on my card'],
		open: [
			'I’ve been charged twice for order {order}: there are two payments of {paid} on my card. Please refund one.',
			'My bank app shows two payments to Larkspur on {placed}, both for {paid}. I only placed one order.',
			'Can you explain why I’ve paid for my order twice? I only got one confirmation email.'
		],
		more: ['Money is tight this month, so I’d appreciate it being sorted quickly.', 'I don’t want to have to go through my bank if I can help it.', 'The page did freeze for a moment when I pressed pay.'],
		ask: [
			'Sorry for the worry. Could you tell me the last four digits of the card, and whether both payments show as completed or one says “pending”?',
			'Let me look at the payments. Which card was it, the last four digits will do, and does your bank show either of them as pending?'
		],
		paths: [
			{
				state: 'held',
				detail: ['Card ending {card}. One of them does say pending, now that I look.', 'It’s the card ending {card}. The top one says pending.'],
				look: ['One payment captured for {order}. The other is the hold from a first attempt that failed authentication; never captured, the bank releases it.'],
				lookPaste: 'payments',
				ends: [
					[['a', 'You’ve only paid once. The first attempt on {placed} didn’t complete, but your bank put a hold on the money while it waited; that’s the “pending” line. It was never taken, and the bank releases it on its own, usually within five working days.'], ['c', 'It’s gone this morning. Thanks for explaining, I was worried.']],
					[['a', 'Only one payment was taken. The pending one is a hold from a first attempt that didn’t finish; your bank will drop it within a few working days, and it was never charged.'], ['c', 'Still there after a week. Should I be worried?'], ['a', 'It shouldn’t last that long. Your bank can release it straight away if you tell them the payment was never completed; I’ve sent you a letter confirming that, on our headed paper.'], ['c', 'The bank released it when I sent them your letter. Thanks.']]
				],
				happy: true
			},
			{
				state: 'twice',
				detail: ['Card ending {card}. Both say completed.', 'The card ending {card}. Neither is pending.'],
				look: ['Two orders, {order} and {order2}, a minute apart, same basket. Cancelled {order2} before picking; asked finance to refund it.'],
				lookPaste: 'payments',
				team: 'finance',
				ends: [[['f', 'Refunded {paid} for cancelled {order2}.'], ['a', 'There were two orders, a minute apart, with the same basket; the page must have gone through twice when it froze. I’ve cancelled the second, {order2}, before it was packed, and its {paid} is on its way back to your card. Your first order goes out as normal.'], ['c', 'Thank you for sorting it so fast.']]]
			},
			{
				state: 'two',
				open: ['My bank app shows two payments to Larkspur on {placed}, {paid} and {paid2}. I only placed one order.', 'There are two Larkspur payments on my card this week and I only ordered once. Order {order}.'],
				detail: ['Card ending {card}. Both completed.', 'Card ending {card}. Both look final.'],
				look: ['Two separate orders: {order} by this customer, {order2} placed from another account with the same card, delivered to {town2}.'],
				lookPaste: 'payments',
				ends: [[['a', 'Both payments are real orders, but different ones: {order} is yours, and the other, {order2}, was placed from a different account with the same card and is going to {town2}. Might someone else at home have ordered something?'], ['c', 'My {relation}! {They} borrowed my card for {their} Christmas presents. Sorry for wasting your time.'], ['a', 'Not at all. Glad it’s a happy explanation.']]]
			}
		]
	},
	// A payment that won't go through.
	{
		goods: ['plants', 'pots', 'bulbs', 'tools', 'houseplants', 'hedging'],
		status: 'basket',
		subjects: ['Payment keeps failing', 'Card declined', 'Can’t pay', 'Checkout error at payment', 'Problem paying'],
		open: [
			'Every time I try to pay, the page says my card was declined. My bank says they haven’t declined anything. I’ve tried three times now.',
			'I can’t get past the payment page. It spins for ages and then says “Payment could not be completed”. My basket has {items} in it.',
			'Your checkout won’t accept my card. It’s worked fine for years everywhere else.'
		],
		more: ['I’m worried I’ll end up paying three times.', 'I’d really like to get the order in this week.', 'I tried my husband’s card too, same result.'],
		ask: [
			'Sorry about that. Which device and browser are you using, and do you remember whether your bank asked you to approve anything?',
			'Let me check the payment attempts. Roughly when did you try, and on what device?'
		],
		paths: [
			{
				state: 'declined',
				detail: ['On my phone, around {time} on {wday}. The bank app did buzz, now that you mention it.', 'iPhone, on {wday}. Possibly the bank wanted something, I didn’t look.'],
				look: ['Three attempts, all declined: authentication not completed. Bank app approval timing out.'],
				lookPaste: 'payments',
				ends: [[['a', 'The attempts were declined because the bank’s approval step wasn’t completed: your bank sends a request to its app, and if it isn’t approved within a few minutes, the payment fails. Nothing was taken. If you try again with the app open, it should go through.'], ['c', 'That was it. Paid first time. Thanks!']]],
				happy: true
			},
			{
				state: 'blocked',
				detail: ['On the laptop, in Chrome. No message from the bank at all.', 'Laptop, on {wday}. Nothing from the bank.'],
				look: ['Declined by the issuer: card not enabled for online payments. Not our side.'],
				lookPaste: 'payments',
				ends: [
					[['a', 'The decline came from your card’s bank, which reported that the card isn’t set up for online payments. That’s usually a setting in your banking app, or a quick call to the bank. Nothing was charged.'], ['c', 'Spot on, the card had online payments turned off. Sorted, thanks.']],
					[['a', 'Your bank declined the payments, saying the card isn’t enabled for online use. Nothing was charged. It may be quickest to use another card.'], ['c', 'I used my other card and it went through. I’ll take it up with the bank.']]
				]
			},
			{
				state: 'fault',
				detail: ['Android phone, the Samsung browser. On {wday} afternoon.', 'On my Samsung tablet, {wday}.'],
				look: ['Payment page didn’t load the card form on the Samsung browser for a few hours on {wday}. Web team fixed it the same evening.'],
				lookPaste: 'payments',
				team: 'the web team',
				ends: [[['w', 'Confirmed: the card form failed in the Samsung browser from about 13:00 to 19:40 on {wday}, after a change to the payment page. Fixed that evening.'], ['a', 'It was our fault, I’m sorry: a change to the payment page stopped it working in the Samsung browser for a few hours on {wday}. It was fixed that evening, so it should work now. Nothing was charged for the failed attempts.'], ['c', 'Worked fine today. Thanks for letting me know.']]]
			},
			{
				state: 'declined',
				open: ['Before I order: do you take PayPal, or bank transfer, or anything that isn’t a card? My basket has {items} in it.', 'Is there any way to pay other than typing in my card details?'],
				detail: ['I just don’t like putting my card into websites since my card was copied last year.', 'My card was cloned last year and I’ve been wary ever since.'],
				look: ['Card only at the moment. Customer asking for another way to pay.'],
				lookPaste: 'none',
				ends: [[['a', 'At the moment we only take cards, I’m afraid, including Apple Pay and Google Pay, which don’t share your card number with us. Other ways to pay are something the web team is looking at for next year, and I’ve added your request.'], ['w', 'Linked to the payment-methods request; {nth} customer asking this autumn.'], ['c', 'OK. I’ll try Apple Pay.']]]
			}
		]
	},
	// A school or community group that pays by invoice.
	{
		goods: ['bulbs', 'tools', 'compost', 'hedging'],
		status: 'basket',
		subjects: ['Ordering for a school', 'Can we pay by invoice?', 'Purchase order for community garden', 'Bank transfer?', 'Order for our Tidy Towns group'],
		open: [
			'I’m ordering bulbs and tools for {group}, and our accounts can only be paid by bank transfer against an invoice. Is that possible?',
			'We’d like to order {items} for {group}’s planting day. We have a group bank account and can’t use a personal card. How do we pay?',
			'Can {group} pay by invoice? We get a grant, and the treasurer needs a proper invoice before paying.'
		],
		more: ['The planting day is on {day2}, with the children.', 'It would be around {basket}, maybe more if we can get the bulbs as well.', 'We’ve bought from you before, but always on someone’s card.'],
		ask: [
			'Lovely, thanks for thinking of us. We can do that. Could you send me the basket you’d like, the name and address for the invoice, and who should receive the goods?',
			'Yes, we can help. Could you send me what you’d like to order and the details for the invoice?'
		],
		paths: [
			{
				detail: ['The basket is {items}. Invoice to {group}, {town}, and deliver there too.', 'Here’s the list: {items}. Invoice to the treasurer, please, at {address}.'],
				look: ['Asked finance for a proforma for {basket}; goods go out when paid.'],
				lookPaste: 'proforma',
				team: 'finance',
				ends: [[['f', 'Proforma PF-{pf} for {basket} sent to the customer; goods reserved for 14 days.'], ['a', 'Finance have emailed you a proforma invoice, PF-{pf}, for {basket}. Once the transfer lands, we’ll send the order the same day. The items are reserved for 14 days.'], ['c', 'Thank you, I’ve passed it to the accounts office. They pay on Fridays.']]]
			},
			{
				detail: ['We’ll be ordering a lot more over the year, a few times a term.', 'We’d probably order every season, so an account would be easier.'],
				look: ['Regular orders: better as a trade account. Passed to Gráinne.'],
				lookPaste: 'none',
				team: 'our trade team',
				ends: [[['t', 'Picked up. Will call them about a trade account with 30-day invoices.'], ['T', 'Hello {name}, I look after trade and school accounts at Larkspur. For regular orders we can set you up with an account that’s invoiced monthly, with 30 days to pay. I’ve sent you the form; once it’s back, we can take your first order on account.'], ['c', 'Thanks, Gráinne, form attached.']]]
			},
			{
				detail: ['Actually, we can pay by card after all, but we need a VAT invoice afterwards.', 'We’ll pay by card in the end, but we need a VAT receipt for the grant.'],
				look: ['Paying by card; needs a VAT invoice after. Finance to send.'],
				lookPaste: 'none',
				team: 'finance',
				ends: [[['c', 'Order placed: {order}.'], ['f', 'VAT invoice for {order} emailed to the customer.'], ['a', 'Finance have emailed the VAT invoice for {order}. Enjoy the planting day!'], ['c', 'Perfect, thank you.']]]
			}
		]
	},
	// Trouble signing in.
	{
		goods: ['bulbs', 'plants', 'pots'],
		status: 'basket',
		subjects: ['Can’t log in', 'Password reset email not arriving', 'Locked out of my account', 'Forgot password', 'Sign in problem'],
		more: ['I have things in the basket I don’t want to lose.', 'I’m not great with computers, so bear with me.', 'I haven’t signed in since the new website went up.'],
		ask: [
			'Sorry about that. Which email address are you trying to sign in with?',
			'Let me check the account. Could you tell me the email address you use with us?'
		],
		paths: [
			{
				state: 'spam',
				open: ['I’ve asked for a password reset three times and no email has come. I’ve checked spam. I want to see my old orders before I order again.', 'Your password reset emails never arrive. I’ve tried four times today.'],
				detail: ['It’s {email}.', '{email}, I’ve had it for years.'],
				look: ['Reset emails sent to {email}, the last at {resetTime}, all delivered. Probably filtered.'],
				lookPaste: 'signin',
				ends: [[['a', 'The reset emails were delivered to {email}, the last at {resetTime}, so they’re somewhere in your mailbox. Some mail apps put them in a “Promotions” or “Other” tab rather than spam. They come from accounts@larkspur.example.'], ['c', 'Found them all in the Other folder. In now, thanks.']]],
				happy: true
			},
			{
				state: 'other',
				open: ['I can’t sign in. It says the email or password is wrong, and I’m sure it isn’t.', 'The website says it doesn’t recognise me, though I’ve ordered from you for years.'],
				detail: ['I’m using {email}.', 'It’s {email}.'],
				look: ['No account on {email}. Found one under {email2}, same name and address.'],
				lookPaste: 'signin',
				ends: [[['a', 'There’s no account under {email}, but there is one under {email2}, with your name and address. Could that be it?'], ['c', 'Yes, that’s my old address. Signed in. Thank you!']]]
			},
			{
				state: 'expired',
				open: ['The password reset link you sent says it has expired, and I clicked it straight away.', 'Every reset link I get says “This link has expired”. I click them the moment they arrive.'],
				detail: ['It’s {email}. I clicked the link in the email within a minute.', '{email}. The link failed straight away.'],
				look: ['Two resets requested a minute apart; the first link was used after the second was sent, so it had been replaced.'],
				lookPaste: 'signin',
				ends: [
					[['a', 'I can see what happened: two resets were requested a minute apart, and each new one cancels the one before, so the first email’s link no longer worked. If you request one more and use only that email, it will work.'], ['c', 'Worked this time. Thanks!']],
					[['a', 'Two reset links were sent, and only the newest one works. I’ve sent you a fresh one now; please use that and ignore the others.'], ['c', 'Still says expired. Honestly.'], ['w', 'Reset links opened in some mail apps’ built-in browsers are being visited twice, which uses them up. Fix in progress; workaround is to copy the link into the browser.'], ['a', 'The web team have found the cause: some mail apps open links twice. A fix is on its way. Until then, if you press and hold the link, copy it and paste it into your browser, it will work.'], ['c', 'That worked. Thanks for persisting.']]
				]
			}
		]
	},
	// Changing the email address on an account.
	{
		goods: ['plants', 'bulbs'],
		status: 'basket',
		subjects: ['Change my email address', 'New email', 'Update account email', 'Wrong email on my account'],
		open: [
			'I’m changing email provider and need to change the address on my Larkspur account to {email2}. I can’t see how to do it in the settings.',
			'My account is under my old work email, which I’m losing at the end of the month. How do I change it?',
			'I made a typo in my email when I signed up. Can you correct it?'
		],
		more: ['I don’t want to lose my order history or Friends membership.', 'I’d rather not have to set up a new account.', 'I can still sign in with the old one for now.'],
		ask: [
			'There isn’t a way to do that yourself yet, but we can change it. For security, could you reply from the new address, so we know it’s yours?',
			'We can change it for you. Could you send me a message from the new address, saying which account it’s for?'
		],
		paths: [
			{
				detail: ['Writing from {email2} now. The old one is {email}.', 'This is from {email2}. Please move my account from {email}.'],
				look: ['Request from {email2} for account {cust} ({email}). Passed to the web team.'],
				lookPaste: 'record',
				team: 'the web team',
				ends: [[['w', 'Changed the email on customer {cust} from {email} to {email2}.'], ['a', 'Done: your account now uses {email2}. Your orders, addresses and password are as they were.'], ['c', 'Brilliant, thank you.']]],
				happy: true
			},
			{
				detail: ['Sending this from {email2}.', 'This is the new one, {email2}.'],
				look: ['Request from {email2} for account {cust} ({email}). Web team say email changes will be self-service soon.'],
				lookPaste: 'record',
				team: 'the web team',
				ends: [[['w', 'We stopped changing emails by hand after the mix-up in September; self-service is in the next release, due early December.'], ['a', 'The web team are adding a way to change your email yourself in your account settings, due in early December, and they’d rather not change addresses by hand until then. Your old address keeps working for signing in in the meantime. I’ll write to you here when it’s ready.'], ['c', 'OK, I can live with that. Please let me know.']]]
			},
			{
				detail: ['It’s from my work account, I can’t get into my personal one here.', 'Writing from work, sorry, I’ll do it from home later.'],
				look: ['Reply came from a third address, not {email2}. Can’t change yet.'],
				lookPaste: 'none',
				ends: [[['a', 'Thanks. This reply came from a different address, so I can’t be sure the new one is yours yet. Could you send one line from {email2} itself when you’re home? Then I’ll get it changed.'], ['s', 'Reminder sent to the customer after five days without a reply.']]]
			}
		]
	},
	// A customer who wants their account and data deleted.
	{
		goods: ['bulbs', 'plants', 'gifts'],
		status: 'delivered',
		placed: [20, 120],
		subjects: ['Delete my account', 'Please remove my data', 'Close account', 'GDPR request'],
		open: [
			'Please delete my account and everything you hold about me. I don’t want to receive anything more from Larkspur.',
			'I’d like my account closed and my details removed. Can you confirm when it’s done?',
			'Under GDPR I’m asking you to erase my personal data.'
		],
		more: ['Nothing against you, I’m just cutting down.', 'I’ve moved abroad and won’t be ordering again.', 'I don’t know how you got my details in the first place.'],
		ask: [
			'Of course. So that we delete the right account, could you confirm the email address it’s under, and send the request from that address?',
			'We can do that. Please confirm the email address on the account, writing from that address if you can.'
		],
		paths: [
			{
				detail: ['It’s {email}, which is where I’m writing from.', 'This is from {email}, the one on the account.'],
				look: ['Request verified from {email}. Passed to Conor.'],
				lookPaste: 'record',
				team: 'our data protection officer',
				ends: [[['d', 'Deleted customer {cust}. Order records kept for six years for tax, without contact details. Confirmation sent.'], ['a', 'Your account is deleted, and you won’t hear from us again. We have to keep the bare record of past orders for six years for tax, but without your name, email or address attached.'], ['c', 'Thank you, that was quick.']]]
			},
			{
				detail: ['It’s {email}. And I only joined the newsletter at a show, I never had an account.', '{email}. I don’t think I ever ordered.'],
				look: ['No account, newsletter only, signed up at the garden show in June. Passed to Conor.'],
				lookPaste: 'none',
				team: 'our data protection officer',
				ends: [[['d', 'Newsletter-only contact; removed {email} from all lists and the show sign-up file.'], ['a', 'You were on our newsletter list from the garden show in June, where you filled in a card at our stand, but you never had an account. We’ve removed your address from every list and from the sign-up file.'], ['c', 'Ah, the show. Thanks for explaining.']]]
			},
			{
				state: 'elsewhere',
				detail: ['I’m writing from a different email, sorry; the account is {email}.', 'The account is under {email}, but I can’t access that inbox any more.'],
				look: ['Request from a different address. Need it from {email}, or ID.'],
				lookPaste: 'record',
				ends: [[['a', 'Thanks. As this message comes from a different address, could you send the request from {email} itself? If you no longer have access to it, Conor in data protection can verify you another way; just say so and he’ll be in touch.'], ['c', 'I’ll ask him to contact me. I really can’t get into the old one.'], ['d', 'Will verify by post to the address on the account.']]]
			}
		]
	},
	// Too many emails.
	{
		goods: ['bulbs', 'plants'],
		status: 'delivered',
		placed: [20, 90],
		subjects: ['Too many emails', 'Unsubscribe not working', 'Stop the emails please', 'Still getting newsletters'],
		open: [
			'I unsubscribed from your emails two weeks ago and I’m still getting them, sometimes two a day.',
			'Please stop sending me marketing emails. The unsubscribe link takes me to a page that says “Something went wrong”.',
			'I get an email from you almost every day now. Can I get fewer, rather than none?'
		],
		more: ['I don’t mind hearing about the bulbs once a year.', 'It’s getting a bit much.', 'I do still want to hear about my orders.'],
		ask: [
			'Sorry about that. Which email address are they coming to?',
			'I’ll sort that out. Could you tell me the address the emails arrive at?'
		],
		paths: [
			{
				state: 'broken',
				detail: ['{email}.', 'They come to {email}.'],
				look: ['Unsubscribe link broken for some addresses since the newsletter template changed on {wday}. Removed {email} by hand; marketing aware.'],
				lookPaste: 'emails',
				team: 'the marketing team',
				ends: [[['m', 'Unsubscribe page fixed this morning; all requests from the broken days processed by hand.'], ['a', 'You’re now off the marketing list, and you’ll only get emails about your own orders. The unsubscribe page had a fault for a few days, now fixed. I’m sorry about the extra emails in the meantime.'], ['c', 'Thanks, much appreciated.']]]
			},
			{
				state: 'lists',
				detail: ['{email}. I’d be happy with one a month.', 'It’s {email}. Fewer would be good.'],
				look: ['On three lists: newsletter, Friends offers, bulb list. No “fewer” option yet.'],
				lookPaste: 'emails',
				ends: [[['a', 'You’re on three lists: the weekly newsletter, Friends offers and the seasonal bulb list. There isn’t a “monthly” option yet, but I’ve taken you off the weekly newsletter and left the other two, which come about once a month between them. Marketing are looking at letting customers choose how often.'], ['m', 'Noted for the preference centre.'], ['c', 'That’s perfect, thanks.']]]
			},
			{
				state: 'second',
				detail: ['{email}, but the ones I want to stop are to my partner’s address.', 'It’s {email}. Actually, my partner gets them too, at another address.'],
				look: ['{email} unsubscribed already; the emails are going to a second address, which signed up separately.'],
				lookPaste: 'emails',
				ends: [[['a', 'Your address was unsubscribed on {wday}, and nothing has gone to it since. The ones still arriving go to a second address, which signed up separately. If {partner} clicks unsubscribe in one of those, or writes to us from that address, we’ll take it off too.'], ['c', 'Ah, I see. I’ll get {partner} to do it.']]]
			}
		]
	},
	// A plant care question.
	{
		goods: ['plants', 'houseplants', 'bulbs', 'roses'],
		status: 'delivered',
		placed: [5, 40],
		subjects: ['Question about my {product}', 'Plant advice please', 'Is this normal?', 'Help with planting', 'Care question'],
		more: ['Our garden is heavy clay and quite wet.', 'It’s in a pot by the back door, facing north.', 'I’m new to gardening.'],
		ask: [
			'Happy to help. I’ll ask our head grower, Bridget. Could you send a photo and tell me where it’s growing?',
			'Let me get our grower to have a look. Where is it, indoors or out, and how much light does it get?'
		],
		paths: [
			{
				goods: ['houseplants'],
				open: ['I bought the {product} from you a few weeks ago and I’m not sure I’m looking after it properly. The leaves are going {colour} at the edges. What should I do?', 'The leaves on my {product} are turning {colour}. Is it something I’m doing?'],
				detail: ['Photo attached. It’s indoors, on a windowsill above the radiator.', 'It’s inside, by the window, near the heating.'],
				look: ['Indoors above a radiator: dry air. Bridget to reply.'],
				lookPaste: 'none',
				team: 'our head grower',
				ends: [[['G', 'Hello {name}, Bridget here, Larkspur’s head grower. The {colour} edges are the dry heat from the radiator. Move it somewhere bright but away from the heating, water when the top few centimetres of compost are dry, and stand the pot on a tray of damp gravel. New leaves should come through healthy within a few weeks.'], ['c', 'Moved it this morning. Thank you, Bridget!']]]
			},
			{
				goods: ['plants', 'roses'],
				open: ['Quick question about the {product}: when should I plant it, and does it need full sun? The card in the box got wet and I can’t read it.', 'I have the {product} from you sitting in its pot. Where and when should it go in?'],
				detail: ['It’s still in its pot, outside. I haven’t planted it yet.', 'Not planted yet, it’s on the patio in the pot it came in.'],
				look: ['Planting question. Bridget to reply.'],
				lookPaste: 'none',
				team: 'our head grower',
				ends: [[['G', 'Hi {name}, Bridget from Larkspur. Now is a good time to plant: the soil is still warm. Choose a spot with at least half a day of sun, dig in a bucket of compost if your soil is heavy, plant it at the same depth it sits in the pot, and water it in well. After that, leave it alone until spring.'], ['c', 'Planted at the weekend. Thanks for the clear advice.']]]
			},
			{
				goods: ['plants'],
				open: ['Is it normal for the {product} to look like this? There are holes all over the leaves. Photo attached.', 'Something is eating my {product}. Is it a disease?'],
				detail: ['Photo attached. It’s outside in the border.', 'It’s out in the garden, photo attached.'],
				look: ['Photo shows slug damage, not disease.'],
				lookPaste: 'none',
				ends: [[['a', 'I showed your photo to Bridget, our head grower, and she says the holes are slugs, not disease: they love the mild, wet weather we’ve had. A ring of grit around the base helps, and the plant will grow away from it in spring. It’s otherwise healthy.'], ['c', 'Slugs, of course. Thanks!']]]
			}
		]
	},
	// Something out of stock.
	{
		goods: ['roses', 'plants', 'houseplants'],
		status: 'basket',
		subjects: ['When will this be back in stock?', 'Out of stock', 'Back in stock email', 'Still sold out?'],
		open: [
			'The {product} has been out of stock for weeks. Is it coming back? I signed up for the email but nothing has come.',
			'Will you be getting more {product}? I missed it last time.',
			'I got an email saying the {product} was back in stock, but when I clicked it, it was sold out again.'
		],
		more: ['It’s for a spot I’ve been planning all year.', 'I’d pay extra for it, honestly.', 'Nobody else seems to have it.'],
		ask: [
			'Let me check with the nursery. Is it the same size you saw before?',
			'I’ll find out. Do you need it by a particular date?'
		],
		paths: [
			{
				detail: ['Yes, the same one. No rush.', 'Same as before. Any time before spring.'],
				look: ['Due back on {restock}; {waiting} on the back-in-stock list, including this customer.'],
				lookPaste: 'stock',
				ends: [[['a', 'It’s due back on {restock}, and you’re on the list, so you’ll get an email that day. They tend to go within a day or two, so it’s worth acting on the email quickly.'], ['c', 'Thanks, I’ll keep an eye out.']]]
			},
			{
				state: 'gone',
				detail: ['I need it by {day2}, ideally.', 'I need it by {day2} if possible.'],
				look: ['Not grown this year; the grower lost the crop. Similar: {alternative}.'],
				lookPaste: 'stock',
				ends: [[['a', 'I’m sorry, we won’t have it this season: our grower lost the crop in the summer heat. Bridget suggests {alternative} instead, which is similar and in stock.'], ['c', 'Thanks, I’ll go with that.']]]
			},
			{
				state: 'rush',
				open: ['I got an email saying the {product} was back in stock, but when I clicked it, it was sold out again.', 'Your back-in-stock email for the {product} came, and twenty minutes later it was gone. What’s the point?'],
				detail: ['The email came on {wday} at about {time}, and it was gone by the time I clicked, twenty minutes later.', 'I clicked it within the hour and it was gone already.'],
				look: ['Back-in-stock emails go to everyone at once; {waiting} people for {stockIn} plants. Sold out in 14 minutes. Web team asked about first-come holds.'],
				lookPaste: 'stock',
				team: 'the web team',
				ends: [[['w', 'Holding a few for the earliest sign-ups is possible, but not before Christmas. Added the ticket to the request.'], ['a', 'I’m sorry: the email went to everyone on the list at once, and there were {waiting} people for {stockIn} plants, so it sold out within a quarter of an hour. The web team are looking at holding stock for the earliest sign-ups, though not before Christmas. You’re still on the list for the next delivery.'], ['c', 'Disappointing, but thanks for the honest explanation.']]]
			}
		]
	},
	// A landscaper or trade customer.
	{
		goods: ['hedging', 'plants', 'bulbs'],
		status: 'basket',
		subjects: ['Trade enquiry', 'Bulk order', 'Landscaper pricing', 'Large hedging order'],
		open: [
			'I’m a landscaper in {town} and I have a job needing about 300 beech hedging plants and 50 griselinia. Do you do trade prices or bulk delivery?',
			'We’re a garden design business and would like to buy from you regularly. Is there a trade account?',
			'I need a large quantity of bulbs, around 5,000, for a hotel’s grounds. Can you quote?'
		],
		more: ['The job starts on {day2}.', 'We currently buy from a wholesaler in the UK, but shipping has become a pain.', 'I’d need a VAT invoice.'],
		ask: [
			'Thanks for getting in touch. I’ll pass this to our trade team. Could you send your business name, VAT number and a phone number?',
			'That’s one for our trade team. Can you send your company details and the quantities you need?'
		],
		paths: [
			{
				detail: ['{business}, VAT IE{vat}. Phone {phone}.', 'It’s {business}. VAT number IE{vat}, mobile {phone}.'],
				look: ['Trade enquiry. Passed to Gráinne.'],
				lookPaste: 'none',
				team: 'our trade team',
				ends: [[['t', 'Called them. Quote sent; trade account form sent.'], ['T', 'Hello {name}, thanks for the chat earlier. As promised, the quote is attached, with delivery on a pallet included, and the account form. Once that’s back, we can invoice on 30 days.'], ['c', 'Thanks, Gráinne, I’ll go through it and come back to you.']]]
			},
			{
				detail: ['{business}. We’d want it delivered over three weeks, as the job goes.', '{business}. Staggered deliveries if possible.'],
				look: ['Staggered deliveries, large quantity. Gráinne to take it.'],
				lookPaste: 'none',
				team: 'our trade team',
				ends: [[['t', 'Can do three deliveries for this volume. Waiting on their dates.'], ['T', 'Hi {name}, we can do three deliveries for this quantity. Could you send me the dates you’d like, and I’ll book the pallets?'], ['s', 'Reminder sent to the customer after five days without a reply.']]]
			}
		]
	},
	// A website fault.
	{
		goods: ['bulbs', 'pots', 'plants', 'houseplants'],
		status: 'basket',
		subjects: ['Basket keeps emptying', 'Website problem', 'Can’t check out on my phone', 'Things disappearing from my basket'],
		more: ['I nearly gave up and went elsewhere.', 'It used to work fine.', 'I’ve cleared my cookies as someone suggested.'],
		ask: [
			'Sorry about that. Which phone or tablet, and which browser? Are you using a private browsing window?',
			'Let me pass this on. What device and browser are you on?'
		],
		paths: [
			{
				open: ['Every time I go back to my basket, it’s empty. I’ve added {items} three times now.', 'Your website keeps emptying my basket on my phone. It works on the laptop.'],
				detail: ['iPhone, Safari. And yes, I always use private browsing.', 'Safari on the iPhone, private mode.'],
				look: ['Safari private mode clears the basket between visits. Known; web team working on keeping baskets for signed-in customers.'],
				lookPaste: 'sessions',
				state: 'private',
				team: 'the web team',
				ends: [[['w', 'Yes: private mode doesn’t keep the basket. Saving baskets to the account for signed-in customers is planned for January.'], ['a', 'In Safari’s private browsing, the basket is forgotten whenever the window closes. If you use a normal window, or sign in, it will stay. The web team are working on saving baskets to your account, so they follow you between devices; that’s due in January.'], ['c', 'Normal window worked. Thanks.']]]
			},
			{
				open: ['I can’t get to the checkout on my iPad. The button does nothing.', 'The “Go to checkout” button doesn’t respond on my iPad. I’ve tried for two days.'],
				detail: ['iPad, an older one, with Safari.', 'It’s an iPad from about 2017.'],
				look: ['Older iPads: checkout button doesn’t respond after the new checkout went live. Web team aware.'],
				lookPaste: 'sessions',
				state: 'ipad',
				team: 'the web team',
				ends: [
					[['w', 'Confirmed on iOS 15. Fixed in this afternoon’s release.'], ['a', 'Thanks for reporting it. The new checkout had a fault on older iPads, and it has now been fixed. If you try again now, the button should work.'], ['c', 'It works now. Order placed.']],
					[['w', 'iOS 14 and older aren’t supported by the new checkout. We won’t fix that one, sorry.'], ['a', 'I’m sorry: the new checkout doesn’t support iPads as old as yours. If you have a phone or computer, it will work there, or you can order by phone on weekday mornings and we’ll put it through for you.'], ['c', 'I’ll ring tomorrow then.'], ['p', 'Took the order by phone: {order}, card payment over the phone.']]
				]
			}
		]
	},
	// Feedback on packaging.
	{
		goods: ['plants', 'pots', 'houseplants', 'bulbs'],
		status: 'delivered',
		placed: [3, 10],
		subjects: ['Packaging', 'So much plastic', 'Feedback on my delivery', 'A suggestion'],
		open: [
			'My order arrived on {delivered} in a box three times the size it needed to be, stuffed with plastic air pillows. For a garden company, that’s a bit disappointing.',
			'Just a bit of feedback: the plants were packed beautifully, but there was a lot of plastic. Is it recyclable?',
			'Everything arrived safely, thank you. But why is the compost wrapped in plastic inside a box?'
		],
		more: ['I don’t want a reply necessarily, I just wanted to say it.', 'Otherwise the order was perfect.', 'Most companies use paper now.'],
		ask: [
			'Thanks for taking the time. I’ll pass this to our dispatch team, who do the packing.',
			'Thank you for the feedback. I’ll share it with the people who pack the orders.'
		],
		paths: [
			{
				detail: ['Thanks.', 'Appreciated.'],
				look: ['Packing feedback. Passed to dispatch.'],
				team: 'our dispatch team',
				ends: [[['x', 'The pillows came from a stopgap supplier in October. Back to paper from next week.'], ['a', 'Dispatch tell me the plastic pillows were a stopgap while our paper supplier was out of stock, and they’re back to paper from next week. Thanks for raising it.'], ['c', 'Good to hear. Thanks.']]]
			},
			{
				detail: ['Thanks. Is the plastic recyclable at least?', 'Can I recycle it?'],
				look: ['Feedback; customer asks what can be recycled.'],
				ends: [[['a', 'The air pillows can go in the soft plastics recycling at most supermarkets, and the box and paper in the household recycling. Our big boxes are sized for the largest plants, which is why small orders rattle in them; dispatch are trialling smaller boxes this winter.'], ['c', 'Thanks for the detail.']]]
			}
		]
	},
	// A Christmas tree pre-order.
	{
		since: TREES_FROM,
		goods: ['xmas'],
		first: 'Nordmann fir, 6–7 ft',
		status: 'preorder',
		placed: [0, 3],
		subjects: ['Christmas tree delivery', 'Tree pre-order question', 'When will the tree come?', 'Christmas tree'],
		more: ['We’re away the weekend of the 12th.', 'Our ceiling is just under 2.4 m.', 'The children want it up on the 1st.'],
		ask: [
			'Thanks for ordering with us. Could you confirm your order number, and any days you can’t take a delivery?',
			'Happy to help. What’s your order number?'
		],
		paths: [
			{
				open: ['I’ve pre-ordered a {product} from you. When will it be delivered, and can I choose the day?', 'When does the Christmas tree arrive? We’re away one weekend in December.'],
				detail: ['It’s {order}. Any day except the weekend of the 12th.', '{order}. Not the 12th or 13th.'],
				look: ['Trees cut from 28 November, delivered from 1 December. Customer can pick a day on the booking link.'],
				ends: [[['a', 'The trees are cut from 28 November and delivered from 1 December. Next week you’ll get an email with a link to choose your delivery day; any day except the weekend of the 12th will be fine.'], ['c', 'Perfect, thank you.']]],
				happy: true
			},
			{
				deal: 'none',
				second: ['gifts', 'tools'],
				open: ['Can I change the size of my Christmas tree pre-order? I think the 6–7 ft will be too tall for our living room.', 'Our ceiling is lower than I thought. Can I swap the tree for a smaller one?'],
				detail: ['{order}. Please change it to the 5–6 ft.', 'It’s {order}. The smaller one, please.'],
				look: ['Changed to 5–6 ft; asked finance to refund the difference.'],
				team: 'finance',
				ends: [[['f', 'Refunded €10.00 on {order}: tree changed from 6–7 ft to 5–6 ft.'], ['a', 'Done: you now have the 5–6 ft tree, and the €10.00 difference is on its way back to your card.'], ['c', 'Great, thanks.']]]
			},
			{
				open: ['Is your Christmas tree freshly cut? Last year’s from somewhere else dropped everything by the 20th.', 'Before December comes: how fresh are your trees? We’ve had bad luck before.'],
				detail: ['It’s {order}. We just want to know it will last.', '{order}. I just want it to keep its needles.'],
				look: ['Freshness question. Trees cut to order.'],
				ends: [[['a', 'Our trees are cut at a farm in Wicklow no more than a few days before delivery, and Nordmann firs are the best at holding their needles. Saw a centimetre off the base when it arrives, stand it in water straight away, and keep it away from radiators, and it should look good well past Christmas.'], ['c', 'Thanks, that’s reassuring.']]]
			}
		]
	},
	// A present, and a message to go with it.
	{
		goods: ['plants', 'gifts', 'houseplants', 'bulbs'],
		status: 'new',
		placed: [0, 2],
		subjects: ['Gift message', 'Present for my {relation}', 'Can you add a note?', 'Please don’t include the price'],
		open: [
			'I’ve just ordered {items} as a present for my {relation}. I forgot to add a message. Can you add one?',
			'The order {order} is a gift. Please make sure the price isn’t on anything in the box.',
			'I ordered a present for my {relation}’s birthday on {day2}. Will it arrive in time, and can it have a card with it?'
		],
		more: ['It’s a big birthday.', '{They} is a keen gardener.', 'I’m hopeless at presents, so this matters.'],
		ask: [
			'Of course. What would you like the message to say?',
			'Happy to help. What would you like on the card?'
		],
		paths: [
			{
				detail: ['“Happy birthday, {gift}! Love, {name}”', '“With love from {name} and the gang.”'],
				look: ['Not dispatched yet; added the message and set it as a gift (no prices on the slip).'],
				ends: [[['a', 'Done: the message will be printed on a card in the box, and as it’s marked as a gift, the packing slip won’t show any prices. It goes out tomorrow.'], ['c', 'Thank you so much.']]],
				happy: true
			},
			{
				state: 'dispatched',
				detail: ['“Thinking of you. Love, {name}.”', 'Just “Love from {name}.”'],
				look: ['Already dispatched on {tracking}, so too late for the card. Will post a handwritten one.'],
				lookPaste: 'tracking',
				ends: [[['a', 'Your parcel had already gone, I’m afraid, but we don’t want it to arrive without a word: we’ve posted a handwritten card with your message to your {relation} today. Prices are never shown on our packing slips for gifts, and the slip shows only the items.'], ['c', 'What a lovely thing to do. Thank you.']]]
			}
		]
	},
	// An order the customer wants to cancel.
	{
		goods: ['plants', 'pots', 'bulbs', 'tools', 'hedging', 'houseplants'],
		status: 'new',
		placed: [0, 2],
		subjects: ['Cancel my order', 'Order by mistake', 'Please cancel', 'Changed my mind'],
		open: [
			'Please cancel order {order}. I ordered it by mistake on my phone.',
			'I’ve changed my mind about order {order}. Can I cancel it?',
			'Can you cancel my order {order}? My {relation} has just given me the same thing, so I don’t need it after all.'
		],
		more: ['I’d like the refund to my card, please.', 'Sorry for the bother.', 'I placed it in a hurry on my phone.'],
		ask: [
			'No problem, let me catch it before it’s packed. Could you confirm the email address on the order?',
			'I’ll check whether it’s been picked yet. Which email address did you use?'
		],
		paths: [
			{
				detail: ['It’s {email}.', '{email}.'],
				look: ['Not picked yet. Cancelled {order}; asked finance to refund {paid}.'],
				team: 'finance',
				ends: [[['f', 'Refunded {paid} for cancelled {order}.'], ['a', 'All cancelled, and {paid} is on its way back to your card; allow three to five working days.'], ['c', 'Thank you.']]],
				happy: true
			},
			{
				state: 'dispatched',
				detail: ['{email}.', 'It’s {email}, sorry.'],
				look: ['Already dispatched on {tracking}. Can be returned when it arrives.'],
				lookPaste: 'tracking',
				ends: [[['a', 'I’m sorry, it had already left our warehouse. When it arrives, you can send it back with the returns label I’ve emailed you, and we’ll refund it once it’s back with us. Plants can’t be returned, but everything else in the order can.'], ['c', 'OK, I’ll send it back.'], ['s', 'Reminder sent to the customer after five days without a reply.']]]
			}
		]
	},
	// A customer who paid more than they expected.
	{
		goods: ['bulbs', 'pots', 'plants', 'houseplants', 'tools'],
		status: 'dispatched',
		placed: [1, 4],
		subjects: ['Question about my order total', 'Overcharged?', 'Why did I pay {paid}?', 'Amount on my card'],
		open: [
			'I’ve been charged {paid} for order {order}, but I make it less than that. Can you explain?',
			'My card statement says {bankAmount} from Larkspur, which isn’t what the website said.',
			'Can someone explain my order total? It doesn’t add up to me.'
		],
		more: ['I’m probably missing something obvious.', 'I just like to understand what I’m paying for.', 'It’s not a lot, but still.'],
		ask: [
			'Of course, let me look at the order. Could you tell me which amount you expected, and where you saw it?',
			'Happy to go through it. What did you expect to pay?'
		],
		paths: [
			{
				deal: 'none',
				state: 'delivery',
				detail: ['I thought delivery was free. The items came to {itemsTotal}.', 'The items were {itemsTotal}. I didn’t expect anything on top.'],
				look: ['{order}: items {itemsTotal} plus delivery {delivery}, as the order is under €60. Charged correctly.'],
				ends: [[['a', 'The difference is delivery: it’s free on orders of €60 or more, and yours came to {itemsTotal}, so the standard {delivery} delivery was added. It’s shown on the last step of the checkout, but I know it’s easy to miss.'], ['c', 'Ah, I see. I’ll add a few more bulbs next time and get it free!']]]
			},
			{
				deal: 'none',
				state: 'currency',
				detail: ['I expected {paid}, as the website said. My bank shows {bankAmount}.', 'The site said {paid}. The bank took {bankAmount}.'],
				look: ['Charged {paid} in euro. The card is a sterling card, so the bank converted it and added its fee.'],
				ends: [[['a', 'We charged {paid}, in euro. Your card is in sterling, so your bank converted it and may have added its foreign-currency fee, which is why the figure on your statement is different. We can’t see or change that part, but your bank can tell you its rate and fee.'], ['c', 'Of course, it’s my UK card. Thanks.']]]
			},
			{
				deal: 'none',
				state: 'preorder',
				since: TREES_FROM,
				goods: ['xmas'],
				open: ['Why has {paid} already come out of my account? The Christmas tree isn’t coming until December.', 'I’ve been charged {paid} for order {order} already. Is that right?'],
				detail: ['I expected to pay for the tree when it was delivered, not now.', 'I thought the pre-order would be charged later.'],
				look: ['Pre-orders are charged when the order is placed. Customer expected payment on delivery.'],
				ends: [[['a', 'Pre-orders are paid for when they’re placed, and the item is then reserved for you; there’s nothing more to pay on delivery. If you’d rather not pay now, I can cancel and refund it, but the trees do sell out.'], ['c', 'No, keep it. I just didn’t realise. Thanks.']]]
			}
		]
	}
);

// Shared pieces, combined with every topic.
/** An aside in the customer's first message, and support's answer to it. */
const tangents: [string, string][] = [
	['P.S. The tulips I bought from you last year were glorious, so no pressure!', 'And thank you for the kind words about the tulips, that made our day.'],
	['Also, I love the new website, much easier on the phone.', 'Glad you like the new site!'],
	['(Sorry if this has gone to the wrong place, the contact page was a bit confusing.)', 'You’ve come to the right place, no worries.'],
	['By the way, is the nursery open to visitors at all? We’re often down that way.', 'On the nursery: we have open days in spring, and the Christmas shop opens there on Saturday 5 December.'],
	['My mother-in-law swears by your compost, for what it’s worth.', 'Please thank your mother-in-law from us!'],
	['Apologies for the essay.', 'Not at all, the detail helps.'],
	['I rang first but couldn’t get through.', 'Sorry you couldn’t get through on the phone; the lines are only open on weekday mornings for now.'],
	['Hope you’re all surviving the storm down there.', 'We survived the storm, thanks, apart from one polytunnel.']
];
/** A second matter the customer raises on the way, support's answer, and the customer's thanks for it. */
const sides: { q: string; a: string; then: string }[] = [
	{ q: 'While I have you: do you deliver on Saturdays?', a: 'On Saturdays: our parcel courier delivers Monday to Friday only, I’m afraid, though pallet deliveries can sometimes be booked for a Saturday morning.', then: 'Shame about Saturdays, but never mind.' },
	{ q: 'Also, are your terracotta pots frost-proof? I don’t want them cracking in January.', a: 'The terracotta pots are frost-resistant rather than frost-proof: they’re fine in an Irish winter if they’re raised on pot feet so they drain, but bring the smaller ones into a shed in a hard frost.', then: 'Good tip about the feet, thanks.' },
	{ q: 'Unrelated, but when do the bare-root roses come in?', a: 'Bare-root roses are dispatched from 16 November, once they’ve been lifted at the grower’s, and the season runs until March.', then: 'I’ll order a rose too, then.' },
	{ q: 'By the way, can I add a gift message to an order?', a: 'Yes: there’s a gift message box in the basket, just above the checkout button. The message is printed on a card, and gift orders never show prices on the packing slip.', then: 'Good to know about the gift messages.' },
	{ q: 'Do you sell compost in bulk bags?', a: 'We don’t do bulk bags, I’m afraid: the biggest is the 40-litre peat-free bag, in packs of three.', then: 'OK, three-packs it is.' },
	{ q: 'Is there any way to see my old orders? I want the same bulbs as last year.', a: 'Your past orders are under “Orders” in your account, each with a “Buy again” button, as long as we still sell the item.', then: 'Found the old orders, thanks.' },
	{ q: 'And do you have a printed catalogue? My dad doesn’t use the internet.', a: 'We stopped the printed catalogue last year, but we can post your dad a copy of the spring bulb list if you send us his address.', then: 'I’ll send Dad’s address over.' },
	{ q: 'Is the Christmas shop on at the nursery this year?', a: 'The Christmas shop at the nursery opens on Saturday 5 December, for that weekend only.', then: 'We’ll see you on the 5th!' },
	{ q: 'Can I collect from you instead of paying for delivery?', a: 'We don’t offer collection at the moment: everything goes out from the warehouse, which isn’t set up for visitors.', then: '' },
	{ q: 'My neighbour wants to know if you deliver to Northern Ireland.', a: 'We only deliver within the Republic for now, because plants need extra paperwork to cross the border.', then: 'I’ll let my neighbour know.' },
	{ q: 'How long do the gift vouchers last, out of interest?', a: 'Gift vouchers are valid for twelve months from the day they’re bought.', then: '' },
	{ q: 'Do you have any hedging that would do by the sea? We’re very exposed.', a: 'For an exposed coastal garden, Bridget recommends griselinia or escallonia over beech: both shrug off salt wind.', then: 'Griselinia it is, thanks.' },
	{ q: 'Is it worth joining Friends? I keep meaning to.', a: 'Friends is free to join in your account: you confirm your email, and from then on 5% comes off every order while you’re signed in, and you see the spring bulb list a week early.', then: 'I’ve joined Friends now.' },
	{ q: 'Is the peat-free compost any good for seeds?', a: 'Bridget uses the peat-free compost for seeds at the nursery, sieved and mixed with a handful of grit.', then: '' }
];
const contexts = [
	'We’ve just moved into a new build in {town} and we’re starting the garden from nothing.',
	'I’ve ordered from you a few times over the years and always been happy.',
	'I look after the garden at our community centre in {town}, so I order a fair bit.',
	'A friend recommended you, and she’s right, the plants are lovely.',
	'We run a small café in {town} with planters out front, and I do the ordering.',
	'I’m not very good with websites, so bear with me.',
	'I’m buying for my {relation}, who is a mad gardener and impossible to buy for.'
];
const situations = [
	'I’m away from {day}, so I’d love to get this sorted before then.',
	'Everything needs to be in the ground before the frosts, so timing matters.',
	'I’ve a lot on this week, so I’d appreciate a quick answer.',
	'I’m at work all day, but I check my email in the evenings.'
];
const closings = ['Let me know if there’s anything else.', 'Thanks again for your patience.', 'Sorry again for the bother.', 'Happy gardening!'];
const disclaimers = ['This email and any files transmitted with it are confidential and intended solely for the use of the individual to whom they are addressed.', 'Please consider the environment before printing this email.'];
const greetings = ['Hi', 'Hello', 'Hi there', 'Good morning', 'Morning', 'Dear Larkspur', 'Hello Larkspur team', 'Dia dhuit'];
const custSign = ['Thanks, {name}', 'Many thanks,\n{full}', '{name}', 'Kind regards,\n{full}', 'Thanks\n{name}\n\nSent from my iPhone', 'Best wishes,\n{full}\n{phone}', 'Le meas,\n{name}', 'Rgds\n{name}'];
const acks = ['Thanks for getting in touch.', 'Thanks for your message, and sorry for the trouble.', 'Thanks for writing in.', 'Sorry to hear that.', 'Thanks for the clear description.', ''];
const agentSign = ['Best wishes,\n{signer}', '{signer}\nLarkspur', 'Thanks,\n{signer}', 'Kind regards,\n{signer} at Larkspur', 'All the best,\n{signer}'];
const holding = [
	'Thanks for bearing with me. I’ve asked {team} to look into it, and I’ll come back to you by {dayAfter}.',
	'Quick update: this is with {team} now. I’ll be in touch as soon as I hear back.',
	'I’ve passed this to {team}, who can sort it from their side. I’ll let you know as soon as it’s done.'
];
const chasers = ['Any news on this?', 'Just checking you got my last message.', 'Sorry to chase, but I need to know by {day}.', 'Hello? It’s been a few days.', 'Any update? I’d like to get this sorted.'];
const resends = ['I sent this through the contact form as well, sorry if you get it twice.', 'Sending again in case the first one didn’t go through.', 'Forgot to say, my phone number is {phone} if that’s easier.'];
/** Garden chat a customer adds to a first message. */
const chat = [
	'We’re only two years into the garden, so everything is still an experiment.',
	'The garden is tiny, a courtyard really, so every pot counts.',
	'I lost half my pots to the frost last winter, so I’m starting again.',
	'This is all for the front garden, which has been a mess since the builders left.',
	'The hedge along the road is finally coming out this winter, and I want something better in its place.',
	'My husband thinks I order too many bulbs. He may be right.',
	'We’re on a hill facing the Atlantic, so everything has to be tough.',
	'I’m planting up the window boxes for the winter.',
	'My grandchildren are helping with the planting this year, which is half the fun.',
	'Our soil is heavy clay, so I’m going mostly for pots.'
];
/** Support's note of a call from the customer before the first reply. */
const calls = [
	'{name} rang to check we got the email. Told {name} we’d reply here today.',
	'Customer rang about this; the line dropped before I could take details. Replying by email.',
	'{name} rang and left a message on the support line asking us to reply by email.',
	'Call from {name}, same question as above. Said I’d look into it and write back.'
];
/** How a customer leads into a second question at the end. */
const afterwords = ['Oh, and one more thing, if you don’t mind:', 'While I have you:', 'One last question:', 'Before I forget:'];
const footers = ['', '', 'Larkspur customer care · larkspur.example\nPhone lines open weekdays, 9:00 to 12:30', 'Larkspur · plants grown in Kildare · larkspur.example'];
const surveys: [string, string][] = [['Great', 'Quick and friendly.'], ['Good', 'Sorted in the end, thanks.'], ['Great', '{agent} was brilliant.'], ['OK', 'Took a while but got there.'], ['Good', 'Clear answers.'], ['Great', 'Really helpful, thank you.'], ['Good', '']];
const groups = ['St Brigid’s National School', 'Scoil Mhuire', 'the {town} Tidy Towns committee', 'the {town} community garden', 'Gaelscoil na Mara', 'the {town} Men’s Shed'];
const businesses = ['{last} Landscapes', 'Green Room Garden Design', '{town} Garden Services', 'Fieldstone Landscaping', 'Hawthorn & Hazel Gardens'];
const rooms = ['conservatory', 'porch', 'kitchen', 'sitting room', 'hall'];

// Pasted records.
interface Line {
	product: Product;
	qty: number;
}
interface Order {
	number: string;
	placed: number;
	lines: Line[];
	subtotal: number;
	deal: Deal;
	campaign?: Campaign;
	voucher: number;
	total: number;
	delivery: number;
	paid: number;
	signedIn: boolean;
}
const orderTable = (order: Order) => {
	const rows = order.lines.map(({ product, qty }) => `| ${product.name} | ${qty} | ${amount(product.cents)} | ${amount(product.cents * qty)} |`);
	return ['| Item | Qty | Price | Line |', '| --- | ---: | ---: | ---: |', ...rows].join('\n');
};
const discountLine = (order: Order, vcode: string) => {
	const off = amount(order.subtotal - order.total);
	if (order.deal === 'coupon') return `Coupon ${order.campaign!.code} (${order.campaign!.pct}%) −${off}`;
	if (order.deal === 'friends') return `Friends 5% −${off}`;
	if (order.deal === 'voucher') return `Gift voucher ${vcode} −${off}`;
	return 'Discount 0.00';
};
const confirmation = (order: Order, first: string) =>
	[
		`> Thanks for your order, ${first}!`,
		'>',
		`> Order ${order.number} · ${dateYear(order.placed)}`,
		'>',
		...order.lines.map(({ product, qty }) => `> ${qty} × ${product.name}  ${amount(product.cents * qty)}`),
		'>',
		`> Items ${amount(order.subtotal)}${order.total < order.subtotal ? ` · ${order.deal === 'coupon' ? `Coupon ${order.campaign!.code}` : order.deal === 'friends' ? 'Friends 5%' : 'Gift voucher'} −${amount(order.subtotal - order.total)}` : ''} · Delivery ${amount(order.delivery)} · Paid ${amount(order.paid)}`,
		'>',
		'> We’ll email you again when your order is on its way. Plants are packed and sent from our nursery in Kildare; everything else from our warehouse.',
		'>',
		'> Larkspur · larkspur.example'
	].join('\n');
const trackingLog = (r: Rand, state: string, tracking: string, town: Town, dispatched: number, delivered: number) => {
	const back = state === 'warehouse';
	const rows: [number, string][] = [[dispatched + int(r, 60, 300), back ? `Handed in at Greenline parcel point, ${town.town}` : 'Collected from Larkspur, Kildare']];
	let t = startOfDay(dispatched) + 22 * 60 + int(r, 0, 90);
	rows.push([t, `At hub, ${town.hub}`]);
	if (state === 'stuck') {
		rows.push([t + int(r, 600, 900), `Delayed at hub, ${town.hub}: high volumes`]);
		rows.push([t + DAY + int(r, 300, 700), `Delayed at hub, ${town.hub}: high volumes`]);
	} else if (state === 'lost') {
		rows.push([t + int(r, 500, 800), `Sorted for depot, ${town.depot}`]);
		rows.push([t + 3 * DAY + int(r, 300, 600), 'Investigation opened: parcel not received at depot']);
	} else if (state === 'dispatched') {
		if (t + 600 < delivered) rows.push([t + int(r, 400, 600), `Sorted for depot, ${town.depot}`]);
	} else {
		t = startOfDay(delivered) + 6 * 60 + int(r, 0, 60);
		rows.push([t, `At delivery depot, ${back ? 'Newbridge' : town.depot}`]);
		rows.push([t + int(r, 60, 120), 'Out for delivery']);
		if (state === 'returned') {
			rows.push([startOfDay(delivered) + int(r, 11, 15) * 60 + int(r, 0, 59), 'Not delivered: address not found']);
			rows.push([startOfDay(delivered) + 19 * 60 + int(r, 0, 59), `Held at depot, ${town.depot}, for collection or redelivery`]);
		} else if (state === 'safe') rows.push([startOfDay(delivered) + int(r, 10, 16) * 60 + int(r, 0, 59), 'Delivered: left in safe place, behind side gate (photo taken)']);
		else if (state === 'warehouse') rows.push([startOfDay(delivered) + int(r, 10, 15) * 60 + int(r, 0, 59), 'Delivered: Larkspur warehouse, Kildare. Signed: P NOLAN']);
		else if (state !== 'dispatched') rows.push([startOfDay(delivered) + int(r, 10, 16) * 60 + int(r, 0, 59), `Delivered: signed for by ${pick(r, ['customer', 'neighbour at no. 4', 'customer at door', 'household member'])}`]);
	}
	return [`Greenline Couriers · ${tracking}`, '', ...rows.map(([when, what]) => `${stampShort(when).padEnd(18)} ${what}`)].join('\n');
};
const paymentLog = (r: Rand, state: string, when: number, cents: number, card: string, cardType: string, orders: [string, string], second: number) => {
	const rows: string[] = [];
	const time = (m: number) => `${stampShort(m)}:${pad(int(r, 0, 59))}`;
	let t = when;
	const row = (orderNo: string, money: number, result: string) => rows.push(`| ${time(t)} | ${orderNo} | ${cardType} ending ${card} | ${amount(money)} | ${result} |`);
	if (state === 'declined') {
		row('(not created)', cents, 'declined: bank approval not completed');
		t += int(r, 2, 6);
		row('(not created)', cents, 'declined: bank approval not completed');
		if (r() < 0.5) {
			t += int(r, 3, 9);
			row('(not created)', cents, 'declined: bank approval not completed');
		}
	} else if (state === 'blocked') {
		for (let i = 0; i < 3; i++, t += int(r, 1, 5)) row('(not created)', cents, 'declined by issuer: card not enabled for online payments');
	} else if (state === 'fault') {
		for (let i = 0; i < 3; i++, t += int(r, 2, 12)) row('(not created)', cents, 'error: card form did not load (browser not answering)');
	} else if (state === 'held') {
		row('(not created)', cents, 'authorisation held, then failed: authentication timed out');
		t += int(r, 3, 8);
		row(orders[0], cents, 'authorised; captured next morning');
	} else if (state === 'twice') {
		row(orders[0], cents, 'authorised; captured next morning');
		t += 1;
		row(orders[1], cents, 'authorised; captured next morning');
	} else if (state === 'two') {
		row(orders[0], cents, 'authorised; captured next morning');
		t += int(r, 90, 400);
		row(`${orders[1]} (other account)`, second, 'authorised; captured next morning');
	} else row(orders[0], cents, 'authorised; captured next morning');
	return ['| Time | Order | Card | Amount | Result |', '| --- | --- | --- | ---: | --- |', ...rows].join('\n');
};
const bankLines = (state: string, when: number, cents: number, second: number) => {
	const d = `${pad(at(when).getUTCDate())} ${monthNames[at(when).getUTCMonth()]!.slice(0, 3).toUpperCase()}`;
	const line = (money: number, note: string) => `${d}  LARKSPUR GARDEN  KILDARE IE  ${amount(money).padStart(7)}${note}`;
	if (state === 'held') return ['```', line(cents, '  PENDING'), line(cents, ''), '```'].join('\n');
	if (state === 'two') return ['```', line(cents, ''), line(second, ''), '```'].join('\n');
	return ['```', line(cents, ''), line(cents, ''), '```'].join('\n');
};

const historyTable = (r: Rand, latest: Order, before: [string, number][], statusNow: string, serialOn: (when: number) => number) => {
	const rows = [`| ${latest.number} | ${dateYear(latest.placed)} | ${latest.lines.reduce((sum, line) => sum + line.qty, 0)} | ${amount(latest.paid)} | ${statusNow} |`];
	let when = latest.placed;
	const extra = before.slice();
	for (let i = int(r, 1, 6); i > 0; i--) {
		when -= int(r, 12, 160) * DAY;
		extra.push([`LK-${serialOn(when) + int(r, 0, 200)}`, when]);
	}
	extra.sort((a, b) => b[1] - a[1]);
	for (const [number, placed] of extra) {
		const items = int(r, 1, 5);
		rows.push(`| ${number} | ${dateYear(placed)} | ${items} | ${amount(int(r, 18, 40) * 100 * Math.ceil(items / 2) + pick(r, [0, 50, 95, 25]))} | ${r() < 0.08 ? 'delivered, 1 item returned' : 'delivered'} |`);
	}
	return ['| Order | Placed | Items | Paid | Status |', '| --- | --- | ---: | ---: | --- |', ...rows].join('\n');
};

// Dates: the tickets are spread over 6 October to 13 November, fewer at weekends.
const openings: number[] = [];
for (let day = 5; day <= 43; day++) for (let i = 0; i < (isWeekend(day * DAY) ? 2 : 5); i++) openings.push(day * DAY);

const fill = (text: string, values: Record<string, string>): string =>
	text.replace(/\{(\w+)\}/g, (whole, key: string) => {
		const value = values[key];
		if (value === undefined) throw new Error(`no value for ${whole} in: ${text.slice(0, 80)}`);
		return value;
	});

interface Plan {
	topic: Topic;
	path: Path;
	open: number;
}
const ascii = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, '').toLowerCase();
const voucherCode = (r: Rand) => `LKV-${mixed(r, 4)}-${mixed(r, 4)}`;

const ticket = (index: number, plan: Plan, number: number): string => {
	const r = mulberry32(20261006 + index * 7919);
	const { topic, path } = plan;
	const open = plan.open + int(r, 7 * 60, 22 * 60 + 30);
	const state = path.state ?? '';

	// The customer.
	const first = pick(r, firstNames);
	const last = pick(r, surnames);
	const full = `${first} ${last}`;
	const local = pick(r, [`${ascii(first)}.${ascii(last)}`, `${ascii(first)}${ascii(last)}${int(r, 10, 99)}`, `${ascii(first).charAt(0)}${ascii(last)}`, `${ascii(first)}.${ascii(last).charAt(0)}`]);
	const email = `${local}@${pick(r, providers)}`;
	const email2 = `${pick(r, [`${ascii(first)}${ascii(last).charAt(0)}`, `${ascii(last)}.${ascii(first)}`, `${ascii(first)}${int(r, 1970, 1999)}`])}@${pick(r, providers)}`;
	const sender = state === 'elsewhere' ? email2 : email;
	const town = pick(r, towns);
	const town2 = pick(r, towns.filter((other) => other !== town));
	const code = eircode(r, town.key);
	const address = `${int(r, 1, 48)} ${pick(r, streets)}, ${town.town}, ${town.county} ${code}`;
	const [relation, pronoun] = pick(r, relations);
	const him = pronoun === 'he';
	const gift = pick(r, firstNames.filter((name) => name !== first));
	const phone = `08${int(r, 3, 9)} ${digits(r, 3)} ${digits(r, 4)}`;
	const card = digits(r, 4);
	const cardType = pick(r, ['Visa', 'Visa', 'Mastercard', 'Visa debit']);
	const device = pick(r, ['website, iPhone', 'website, Android phone', 'website, desktop', 'website, iPad', 'website, desktop']);
	const browser = /iP/.test(device) ? pick(r, ['Safari', 'Safari', 'Chrome']) : /Android/.test(device) ? pick(r, ['Chrome', 'Samsung Internet']) : pick(r, ['Chrome', 'Edge', 'Firefox', 'Safari']);

	// The order.
	const goods = path.goods ?? topic.goods;
	let pool = ofKind(...goods);
	if (goods.includes('roses') && goods.includes('hedging') && open > HEDGING_FROM - 2 * DAY) pool = ofKind('roses');
	if (path.bare) pool = pool.filter((product) => product.bare);
	if (topic.first) pool = pool.filter((product) => product.name.startsWith(topic.first!));
	if (state === 'delivery') pool = pool.filter((product) => product.cents < 3000);
	const firstProduct = pick(r, pool);
	const lines: Line[] = [{ product: firstProduct, qty: firstProduct.kind === 'bulbs' ? int(r, 1, 3) : 1 }];
	const second = path.second;
	if (second) lines.push({ product: pick(r, ofKind(...second).filter((product) => product !== firstProduct)), qty: 1 });
	const extras = state === 'delivery' || topic.status === 'voucher' ? 0 : int(r, second ? 0 : 0, second ? 2 : 3);
	const companions = ofKind('bulbs', 'tools', 'compost', 'pots', 'gifts').filter((product) => !lines.some((line) => line.product === product));
	for (const product of shuffle(r, companions).slice(0, extras)) lines.push({ product, qty: product.kind === 'bulbs' || product.kind === 'compost' ? int(r, 1, 2) : 1 });
	const range = path.placed ?? topic.placed ?? [1, 4];
	const placed = waking(r, startOfDay(open) - int(r, range[0], range[1]) * DAY + int(r, 8 * 60, 22 * 60));
	const placedAt = Math.min(placed, open - int(r, 40, 300));
	const subtotal = lines.reduce((sum, line) => sum + line.product.cents * line.qty, 0);
	const live = (when: number) => campaigns.filter((c) => c.from <= startOfDay(when) && startOfDay(when) <= c.to);
	let deal: Deal = path.deal ?? (topic.status === 'voucher' || topic.status === 'basket' ? 'none' : r() < 0.62 ? 'none' : r() < 0.55 ? 'coupon' : r() < 0.7 ? 'friends' : 'voucher');
	if (deal === 'voucher' && (placedAt < VOUCHERS_FROM || subtotal < 8000)) deal = 'none';
	if (deal === 'coupon' && live(placedAt).length === 0) deal = 'none';
	const campaign = deal === 'coupon' ? pick(r, live(placedAt)) : undefined;
	const usedVoucher = deal === 'voucher' ? pick(r, [1000, 2000, 2500]) : 0;
	const round = placedAt < VOUCHERS_FROM ? roundEven : roundCents;
	const total = deal === 'coupon' ? round(subtotal * (100 - campaign!.pct)) : deal === 'friends' ? round(subtotal * 95) : subtotal - usedVoucher;
	const delivery = total < 6000 ? 650 : 0;
	const serialOn = (when: number) => 300000 + Math.floor((when / DAY + 40) * 236);
	let serial = serialOn(placedAt) + int(r, 0, 200);
	const order: Order = { number: `LK-${serial}`, placed: placedAt, lines, subtotal, deal, campaign, voucher: usedVoucher, total, delivery, paid: total + delivery, signedIn: state !== 'guest' && r() < 0.8 };
	serial += int(r, 1, 3);
	const order2 = `LK-${serial}`;
	const dispatched = state === 'dispatched' ? Math.max(placedAt + 120, Math.min(office(r, placedAt + DAY), open - int(r, 30, 240))) : office(r, placedAt + DAY);
	const delivered = Math.min(office(r, dispatched + int(r, 1, 2) * DAY) + int(r, 60, 300), open - int(r, 120, 600));

	// Codes, vouchers and other facts the topic may need.
	const ended = campaigns.filter((c) => c.to < startOfDay(path.code === 'expired' && topic.status === 'new' ? placedAt : open));
	const expired = ended.at(-1)!;
	const active = live(topic.status === 'new' ? placedAt : open)[0] ?? live(open)[0] ?? campaigns[1]!;
	const fake = pick(r, fakeCodes);
	const named = path.code === 'expired' ? expired : path.code === 'live' ? active : undefined;
	const codeName = path.code === 'welcome' ? 'WELCOME10' : path.code === 'fake' ? fake : (named ?? active).code;
	const pct = path.code === 'welcome' ? 10 : path.code === 'fake' ? Number(fake.replace(/\D/g, '')) : (named ?? active).pct;
	const vamount = pick(r, [2000, 2500, 2500, 5000, 1000]);
	const vcode = voucherCode(r);
	const bought = topic.status === 'voucher' ? placedAt : Math.max(VOUCHERS_FROM, open - int(r, 3, 30) * DAY);
	const redeemed = bought + Math.floor((open - bought) * 0.6);
	const earlier = path.code === 'live' ? active.from + Math.floor((startOfDay(open) - active.from) / 2 / DAY) * DAY + int(r, 9 * 60, 21 * 60) : open - int(r, 90, 640) * DAY;
	const returnIn = open - int(r, 4, 5) * DAY;
	const resetAt = open - int(r, 20, 240);
	/** A day or so before the ticket, when the customer tried something: {wday} at {time}. */
	const tried = startOfDay(open - int(r, 1, 3) * DAY) + (state === 'fault' ? int(r, 13 * 60 + 10, 19 * 60 + 30) : int(r, 9 * 60, 21 * 60));
	const sale = Math.round((firstProduct.cents * 0.7) / 50) * 50;
	const sized = sizes[firstProduct.short];
	const salePrice = state === 'size' && sized ? sized[2] : sale;
	const restock = office(r, open + int(r, 8, 24) * DAY);
	const waiting = int(r, 30, 140);
	const alternativeOf = catalogue.filter((product) => product.kind === firstProduct.kind && product !== firstProduct);
	const rivalPrice = Math.round((firstProduct.cents * pick(r, [0.75, 0.8, 0.85])) / 100) * 100 - 1;
	const kindSizes: Record<string, [string, string]> = {
		pots: sized ? [`${sized[0]} pot`, `the ${sized[1]} one`] : ['smaller pot', 'a larger one'],
		plants: ['2-litre pot', 'in a 5-litre pot, a year older'],
		tools: ['lighter, pressed-steel version', 'forged steel with an ash handle']
	};
	const sizeWords = kindSizes[firstProduct.kind] ?? kindSizes.plants!;
	const twoAmount = subtotal + int(r, 5, 60) * 100 + 95;
	const refundDate = state === 'short' ? dispatched : open - int(r, 3, 9) * DAY;
	const seasonStart = firstProduct.kind === 'roses' ? ROSES_FROM : HEDGING_FROM;
	const values: Record<string, string> = {
		name: first,
		full,
		last,
		email,
		email2,
		cust: String(int(r, 21000, 68000)),
		cust2: String(int(r, 21000, 68000)),
		address,
		town: town.town,
		town2: town2.town,
		eircode: code,
		eircodeBad: `${town.key} ${code.slice(4, 6)}${code.slice(7, 8)}${code.slice(6, 7)}`,
		hub: town.hub,
		depot: town.depot,
		relation,
		they: pronoun,
		They: cap(pronoun),
		them: him ? 'him' : 'her',
		their: him ? 'his' : 'her',
		gift,
		gemail: `${ascii(gift)}.${ascii(last)}@${pick(r, providers)}`,
		partner: pick(r, firstNames.filter((name) => name !== first)),
		partnerRole: pick(r, ['husband', 'wife', 'partner']),
		partnerEmail: '',
		phone,
		card,
		cardType,
		order: order.number,
		order2,
		order0: `LK-${serialOn(earlier) + int(r, 0, 200)}`,
		order0Date: dateYear(earlier),
		placed: dayDate(placedAt),
		items: listOf(lines.map((line) => line.product.list)),
		product: firstProduct.short,
		paid: euro(order.paid),
		paid2: euro(twoAmount),
		itemsTotal: euro(subtotal),
		delivery: euro(650),
		basket: euro(subtotal),
		newAddress: `${int(r, 1, 60)} ${pick(r, streets)}, ${town2.town}, ${town2.county} ${eircode(r, town2.key)}`,
		bankAmount: state === 'currency' ? `£${amount(Math.round(order.paid * 0.874))}` : euro(order.paid),
		code: codeName,
		pct: String(pct),
		codeFrom: dateLong((named ?? active).from),
		codeEnd: dateLong((named ?? active).to),
		campaign: (named ?? active).what,
		typoCode: misspelt[(named ?? active).code]!,
		sorry: `LKS-${mixed(r, 4)}`,
		couponValue: euro(subtotal - roundCents(subtotal * (100 - pct))),
		friendsValue: euro(subtotal - roundCents(subtotal * 95)),
		joined: dateYear(state === 'unconfirmed' ? placedAt - int(r, 1, 4) * DAY : open - int(r, 40, 700) * DAY),
		vamount: euro(vamount),
		vcode,
		vcode2: voucherCode(r),
		vcode3: voucherCode(r),
		vdouble: euro(vamount * 2),
		vprefix: vcode.slice(0, 8),
		vexpiry: `${dateLong(bought)} 2027`,
		sendDate: `${int(r, 1, 23)} December`,
		redeemDate: dayDate(redeemed),
		paperNo: `NS-${digits(r, 5)}`,
		buyer: `${gift} ${pick(r, surnames)}`,
		saleItem: firstProduct.short,
		salePrice: euro(salePrice),
		fullPrice: euro(firstProduct.cents),
		saleDiff: euro(firstProduct.cents - sale),
		saleEnd: dayDate(SALE_TO),
		smallSize: sized?.[0] ?? 'smaller',
		bigSize: sized?.[1] ?? 'larger',
		pmItem: firstProduct.short,
		pmPrice: euro(firstProduct.cents),
		rival: pick(r, rivals).replace('{town}', town.town),
		rivalPrice: euro(rivalPrice),
		rivalSize: sizeWords[0],
		ourSize: sizeWords[1],
		tracking: `GL${digits(r, 9)}IE`,
		tracking2: `GL${digits(r, 9)}IE`,
		delivered: dayDate(delivered),
		missing: lines[1]?.product.short ?? firstProduct.short,
		missingPrice: euro(lines[1] ? lines[1].product.cents * lines[1].qty : firstProduct.cents),
		wanted: firstProduct.list,
		sent: pick(r, ofKind('bulbs').filter((product) => product !== firstProduct)).list,
		restock: dayDate(restock),
		waiting: String(waiting),
		stockIn: String(int(r, 12, Math.min(60, waiting - 5))),
		alternative: alternativeOf.length ? pick(r, alternativeOf).list : 'something similar',
		returnPrice: euro(firstProduct.cents),
		refundDate: dayDate(refundDate),
		returnIn: dayDate(returnIn),
		refundRef: `RF${digits(r, 8)}`,
		season: dateLong(seasonStart),
		deliveryDay: dayDate(nextWeekday(Math.max(open + int(r, 4, 9) * DAY, HEDGING_FROM))),
		half: euro(Math.round(firstProduct.cents / 2)),
		n: String(int(r, 3, 6)),
		room: pick(r, rooms),
		colour: pick(r, ['brown', 'yellow', 'crispy and brown']),
		month: monthNames[at(open).getUTCMonth()]!,
		wday: weekday(state === 'stuck' || state === 'lost' ? dispatched : tried),
		day: weekday(nextWeekday(open, int(r, 2, 4))),
		day2: dayDate(nextWeekday(open, int(r, 5, 11))),
		dayAfter: weekday(nextWeekday(open, 2)),
		time: clock(tried),
		resetTime: clock(resetAt),
		nth: `${pick(r, ['third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth'])}`,
		group: pick(r, groups).replace('{town}', town.town),
		business: pick(r, businesses).replace('{last}', last).replace('{town}', town.town),
		vat: `${digits(r, 7)}${pick(r, [...CODE_LETTERS])}`,
		pf: digits(r, 5),
		agent: '',
		team: path.team ?? 'the team'
	};
	values.gemailTypo = values.gemail!.replace(/^(\w)(\w)/, '$1');
	values.partnerEmail = `${ascii(values.partner!)}${pick(r, ['', '.' + ascii(last), String(int(r, 10, 99))])}@${pick(r, providers)}`;

	// Pasted records.
	const pasteOf = (paste: Paste | undefined): string => {
		switch (paste) {
			case undefined:
			case 'none':
				return '';
			case 'order': {
				if (topic.status === 'basket' || topic.status === 'voucher') return '';
				const signed = order.signedIn ? `signed in as ${email}` : `guest checkout, ${email}`;
				const status =
					state === 'preorder'
						? 'Status: pre-order, trees delivered from 1 December'
						: topic.status === 'new' && state !== 'dispatched'
						? 'Status: received, not yet picked'
						: topic.status === 'preorder'
							? firstProduct.kind === 'xmas'
								? 'Status: pre-order, trees delivered from 1 December'
								: `Status: waiting for the bare-root season, dispatched from ${dateLong(seasonStart)}`
							: topic.status === 'delivered'
								? `Status: delivered ${dayDate(delivered)}, Greenline Couriers ${values.tracking}`
								: `Status: dispatched ${dayDate(dispatched)}, Greenline Couriers ${values.tracking}`;
				const events: [number, string][] = [
					[placedAt, `placed (${device})`],
					[placedAt + 1, `payment authorised, ${cardType} ending ${card}`],
					[placedAt + 2, `order confirmation emailed to ${email}: delivered${r() < 0.7 ? ', opened' : ''}`],
					[startOfDay(placedAt) + DAY + 6 * 60 + int(r, 0, 40), 'payment captured']
				];
				const sent = state === 'preorder' || topic.status === 'preorder' ? false : topic.status !== 'new' || state === 'dispatched';
				if (sent) {
					const plants = order.lines.some((line) => ['plants', 'houseplants', 'roses', 'hedging'].includes(line.product.kind));
					events.push([dispatched - int(r, 120, 300), `picked at the ${plants ? 'nursery' : 'warehouse'}`], [dispatched - int(r, 20, 90), `packed, ${order.lines.length > 3 ? '2 boxes' : '1 box'}, ${(int(r, 18, 140) / 10).toFixed(1)} kg`], [dispatched, `handed to Greenline Couriers, ${values.tracking}`], [dispatched + 3, 'dispatch email sent']);
					if (topic.status === 'delivered') events.push([delivered, 'delivered (courier update)']);
				} else if (topic.status === 'preorder' || state === 'preorder') events.push([placedAt + 3, 'waiting for stock: pre-order']);
				return [`Order ${order.number} · placed ${stampLong(placedAt)} · ${signed}`, '', orderTable(order), '', `Items ${amount(subtotal)} · ${discountLine(order, values.vcode3!)} · Delivery ${amount(delivery)} · Paid ${amount(order.paid)}`, `Payment: ${cardType} ending ${card} · 3-D Secure ${state === 'held' ? 'passed on the second attempt' : pick(r, ['passed', 'passed', 'not asked'])} · risk check ${pick(r, ['low', 'low', 'low', 'medium'])}`, status, `Deliver to: ${full}, ${state === 'returned' ? address.replace(code, values.eircodeBad!) : address}`, '', 'Events:', ...events.sort((a, b) => a[0] - b[0]).map(([when, what]) => `- ${stampShort(when)}  ${what}`)].join('\n');
			}
			case 'record':
				return [`Customer ${values.cust} · ${full} · ${email} · ${phone}`, `Customer since ${dateYear(placedAt - int(r, 200, 1400) * DAY).replace(/^\d+ /, '')} · Friends: ${order.deal === 'friends' ? 'yes' : 'no'} · newsletter: ${r() < 0.6 ? 'yes' : 'no'}`, `Addresses: ${address}${r() < 0.3 ? ` · ${int(r, 2, 40)} ${pick(r, streets)}, ${town2.town}` : ''}`, historyTable(r, order, [], placedAt > open - 3 * DAY ? 'dispatched' : 'delivered', serialOn)].join('\n');
			case 'sessions': {
				const rows: string[] = [];
				let t = waking(r, open - int(r, 1500, 2400));
				const row = (what: string) => rows.push(`| ${stampShort(t)} | ${state === 'ipad' ? 'Safari 14, iPad' : 'Safari, iPhone, private window'} | ${what} |`);
				const shown = lines.slice(0, 3);
				for (let visit = 0; visit < (state === 'ipad' ? 2 : 3); visit++) {
					row(`session ${mixed(r, 6).toLowerCase()} started, not signed in`);
					for (const line of shown) {
						t += int(r, 1, 4);
						row(`basket: added ${line.product.name}`);
					}
					t += int(r, 2, 9);
					row(state === 'ipad' ? 'checkout button pressed: script error, no response' : 'session ended: window closed, basket cleared');
					t = waking(r, t + int(r, 90, 900));
				}
				return ['| Time | Browser | Event |', '| --- | --- | --- |', ...rows].join('\n');
			}
			case 'proforma': {
				const rate = (product: Product) => (['plants', 'roses', 'hedging', 'bulbs', 'houseplants', 'compost'].includes(product.kind) ? 13.5 : 23);
				const rows = lines.map(({ product, qty }) => `| ${product.name} | ${qty} | ${amount(product.cents)} | ${rate(product)}% | ${amount(product.cents * qty)} |`);
				const vat = lines.reduce((sum, { product, qty }) => sum + Math.round((product.cents * qty * rate(product)) / (100 + rate(product))), 0);
				return [`Proforma PF-${values.pf} · ${values.group} · ${dateYear(open)}`, '', '| Item | Qty | Price | VAT | Line |', '| --- | ---: | ---: | ---: | ---: |', ...rows, '', `Total ${amount(subtotal)} including VAT of ${amount(vat)} · delivery ${amount(subtotal < 6000 ? 650 : 0)} · pay by bank transfer to Larkspur Nurseries Ltd, quoting PF-${values.pf}`].join('\n');
			}
			case 'tracking': {
				const kind = state === 'warehouse' ? 'warehouse' : state === 'split' || state === 'dispatched' || topic.status === 'new' ? 'dispatched' : ['stuck', 'safe', 'lost', 'returned'].includes(state) ? state : 'delivered';
				const from = kind === 'warehouse' ? returnIn - 2 * DAY : state === 'split' ? office(r, open - DAY) : dispatched;
				return trackingLog(r, kind, state === 'split' ? values.tracking2! : values.tracking!, town, from, kind === 'warehouse' ? returnIn : kind === 'dispatched' ? open : delivered);
			}
			case 'payments': {
				const when = topic.status === 'basket' ? tried : placedAt;
				const money = topic.status === 'voucher' ? vamount : topic.status === 'basket' ? subtotal + (subtotal < 6000 ? 650 : 0) : order.paid;
				return paymentLog(r, state, when, money, card, cardType, [order.number, order2], twoAmount);
			}
			case 'bank':
				return bankLines(state, placedAt, order.paid, twoAmount);
			case 'coupon': {
				const shown = path.code === 'welcome' ? undefined : (named ?? active);
				const head = shown
					? `Coupon ${shown.code} · ${shown.pct}% off the order · valid ${dateYear(shown.from)} to ${dateYear(shown.to)} · one use per customer · ${int(r, 300, 2400).toLocaleString('en-IE')} uses`
					: `Coupon WELCOME10 · 10% off · first order only · one use per customer · ${int(r, 1500, 6000).toLocaleString('en-IE')} uses`;
				const mine =
					state === 'used'
						? `This customer (${email}): used on ${values.order0}, ${values.order0Date}`
						: state === 'welcome'
							? `This customer (${email}): ${int(r, 1, 4)} earlier orders, first ${values.order0} on ${values.order0Date}`
							: `This customer (${email}): not used`;
				return [head, mine, `Basket: ${values.items}, ${amount(subtotal)}`].join('\n');
			}
			case 'friends': {
				const rows = [`Customer ${values.cust} · ${full} · ${email} · customer since ${dateYear(open - int(r, 200, 1400) * DAY).replace(/^\d+ /, '')}`];
				if (state === 'guest') rows.push(`Friends of Larkspur: joined ${values.joined} · email confirmed: yes`);
				else if (state === 'unconfirmed') rows.push(`Friends of Larkspur: joined ${values.joined} · email confirmed: no (confirmation sent ${values.joined}, delivered, not opened)`);
				else if (state === 'two') rows.push('Friends of Larkspur: no', '', `Customer ${values.cust2} · ${full} · ${email2}`, `Friends of Larkspur: joined ${values.joined} · email confirmed: yes`);
				else rows.push('Friends of Larkspur: no', `Newsletter: subscribed ${values.joined} (garden show sign-up)`);
				rows.push('', `Order ${order.number} · ${dateShort(placedAt)} · ${order.signedIn && state !== 'guest' ? 'signed in' : 'guest checkout'} · items ${amount(subtotal)} · discount ${amount(subtotal - total)} · paid ${amount(order.paid)}`);
				return rows.join('\n');
			}
			case 'voucher': {
				const record = (vc: string, status: string) => `Gift voucher ${vc} · ${euro(vamount)} · bought ${dateYear(bought)}${topic.status === 'voucher' ? ` on ${order.number} by ${full}` : ` by ${values.buyer}`} · ${status} · expires ${values.vexpiry}`;
				if (state === 'scheduled') return [record(vcode, `to ${values.gemail}, send on ${values.sendDate} 2026: scheduled`), `Balance ${amount(vamount)}`].join('\n');
				if (state === 'redeemed') return [record(vcode, `redeemed in full ${values.redeemDate} on ${values.order0}, delivered to ${town2.town}`), 'Balance 0.00'].join('\n');
				if (state === 'pair') return [record(vcode, 'unused'), record(values.vcode2!, 'unused').replace(`bought ${dateYear(bought)} by ${values.buyer}`, `bought ${dateYear(Math.max(VOUCHERS_FROM, bought - int(r, 1, 6) * DAY))} by ${pick(r, firstNames)} ${pick(r, surnames)}`)].join('\n');
				return [record(vcode, 'unused'), `Balance ${amount(vamount)}`, `Tried at checkout: ${int(r, 2, 6)} times in the last day, in the discount code box`].join('\n');
			}
			case 'emails': {
				const rows: string[] = [];
				const row = (when: number, to: string, what: string, status: string) => rows.push(`| ${stampShort(when)} | ${to} | ${what} | ${status} |`);
				if (topic.status === 'voucher') {
					row(placedAt + 1, email, `Order confirmation ${order.number}`, 'delivered, opened');
					row(placedAt + 2, state === 'bounced' ? values.gemailTypo! : values.gemail!, `${first} has sent you a Larkspur gift voucher`, state === 'bounced' ? 'bounced: no such mailbox' : 'delivered, not opened');
				} else {
					let t = open - 16 * DAY;
					for (let i = 0; i < int(r, 5, 9); i++, t += int(r, 1, 3) * DAY) row(t, state === 'second' && (i % 2 === 1 || t > open - 9 * DAY) ? values.partnerEmail! : email, pick(r, ['Newsletter: what to plant this week', 'Friends: early access to the spring bulb list', 'The bulb list is open', 'Bare-root season starts soon', 'Last call: Bulb Fortnight ends tonight', 'Newsletter: putting the garden to bed']), 'delivered');
					if (state !== 'lists') rows.push(`Unsubscribe requests from ${email}: ${int(r, 1, 3)} (${dateShort(open - int(r, 8, 14) * DAY)}), status: ${state === 'broken' ? 'error, not processed' : 'processed'}`);
					if (state === 'lists') rows.push(`Lists for ${email}: weekly newsletter, Friends offers, seasonal bulb list`);
				}
				return ['| Sent | To | Email | Status |', '| --- | --- | --- | --- |', ...rows].join('\n');
			}
			case 'signin': {
				const rows: string[] = [];
				let t = resetAt - (state === 'spam' ? 2 * int(r, 30, 140) : 8);
				const row = (what: string, detail: string) => rows.push(`| ${stampShort(t)} | ${what} | ${detail} |`);
				if (state === 'other') {
					row('sign-in failed', `no account for ${email}`);
					t += int(r, 1, 4);
					row('password reset requested', `no account for ${email}; nothing sent`);
					t += int(r, 1, 6);
					row('sign-in failed', `no account for ${email}`);
				} else if (state === 'expired') {
					row('password reset requested', `email sent to ${email}, delivered`);
					t += 1;
					row('password reset requested', `email sent to ${email}, delivered; earlier link cancelled`);
					t += int(r, 1, 3);
					row('reset link opened', 'refused: link cancelled by a newer request');
				} else {
					for (let i = 0; i < 3; i++, t = Math.min(t + int(r, 30, 140), resetAt)) row('password reset requested', `email sent to ${email}, delivered`);
				}
				return ['| Time | Event | Detail |', '| --- | --- | --- |', ...rows].join('\n');
			}
			case 'refunds': {
				const rows = [`| ${dayDate(refundDate)} | ${order.number} | ${state === 'short' ? `out of stock: ${values.missing}` : `return received: ${firstProduct.name}`} | ${state === 'short' ? values.missingPrice!.slice(1) : amount(firstProduct.cents)} | ${cardType} ending ${card} | ${values.refundRef} |`];
				return ['| Date | Order | Reason | Amount | To | Reference |', '| --- | --- | --- | ---: | --- | --- |', ...rows].join('\n');
			}
			case 'stock':
				return [`${firstProduct.name} · in stock: 0 · ${state === 'gone' ? 'not available this season: crop failed at the grower' : `next delivery: ${dayDate(restock)}`}`, `Back-in-stock list: ${waiting} people${state === 'rush' ? ` · last delivery ${values.stockIn} plants, sold out in 14 minutes after the email` : ''}`].join('\n');
		}
	};

	// The thread.
	const agent = pick(r, agents);
	values.agent = agent;
	const dispatcher = pick(r, dispatchTeam);
	const web = pick(r, webTeam);
	const labels: Record<Who, string> = {
		c: `**${full}**`,
		a: `**${agent} (Larkspur support)**`,
		n: `**${agent} (Larkspur support)** · internal note`,
		p: `**${agent} (Larkspur support)** · phone call`,
		w: `**${web} (web team)** · internal note`,
		x: `**${dispatcher} (dispatch)** · internal note`,
		f: `**${finance} (finance)** · internal note`,
		m: `**${marketing} (marketing)** · internal note`,
		g: `**${grower} (head grower)** · internal note`,
		G: `**${grower} (head grower)**`,
		d: `**${dataLead} (data protection)** · internal note`,
		t: `**${tradeSales} (trade sales)** · internal note`,
		T: `**${tradeSales} (trade sales)**`,
		s: '**Help desk**'
	};
	const signers: Partial<Record<Who, string>> = { a: agent, G: grower.split(' ')[0]!, T: tradeSales.split(' ')[0]! };
	const straight = r() < 0.45;
	const plain = (text: string) => (straight ? text.replace(/[‘’]/g, "'").replace(/[“”]/g, '"') : text);
	const footer = pick(r, footers);
	const f = (text: string) => fill(text, values);
	let t = open;
	const messages: string[] = [];
	const say = (who: Who, body: string) => {
		const photos = who === 'c' && /(Photo|photo|Photos|photos) attached|three photos|Here’s a photo|Here’s the slip|Slip attached/.test(body) ? `\n\nAttachments: ${Array.from({ length: int(r, 1, 3) }, () => `IMG_${int(r, 1000, 9899)}.jpg (${(int(r, 14, 46) / 10).toFixed(1)} MB)`).join(', ')}` : '';
		messages.push(`${labels[who]} · ${stampShort(t)}\n\n${who === 'c' ? plain(body.trim()) : body.trim()}${photos}`);
	};
	let held = false;
	/** Whether the last step would have fallen after the export. */
	let overflow = false;
	const advance = (who: Who) => {
		const before = t;
		overflow = false;
		if (held && who !== 'a' && who !== 's') {
			t += int(r, 500, 2000);
			held = false;
		}
		if (who === 'c') t = waking(r, t + int(r, 30, 1600));
		else if (who === 's') t = office(r, startOfDay(t) + 5 * DAY + 9 * 60);
		else if (signers[who] || who === 'p') t = office(r, t + int(r, 25, 800));
		else t = office(r, t + int(r, 8, 320));
		if (t > LAST_MESSAGE) {
			overflow = true;
			t = before + int(r, 4, 30);
		}
	};
	const form = r() < 0.25;
	const custBody = (paragraphs: string[], opening: boolean) => {
		if (opening && form) return [`Name: ${full}`, `Email: ${sender}`, `Phone: ${r() < 0.5 ? phone : ''}`, `Order number: ${topic.status === 'basket' || topic.status === 'voucher' || r() < 0.3 ? '' : order.number}`, 'Message:', paragraphs.join('\n\n'), '', `Sent from: ${pick(r, ['/contact', '/account/orders', '/help/delivery', '/basket', '/help'])} · ${device.replace('website, ', '')}, ${browser}`].join('\n');
		const parts: string[] = [];
		const fitting = (opening ? greetings : greetings.slice(0, 5)).filter((greeting) => minuteOfDay(t) < 12 * 60 || !greeting.includes('orning'));
		if (r() < 0.8) parts.push(`${pick(r, fitting)}${pick(r, [',', ',', ''])}`);
		parts.push(...paragraphs, f(pick(r, opening ? custSign : custSign.slice(0, 4))));
		if (opening && r() < 0.18) parts.push(`--\n${pick(r, disclaimers)}`);
		return parts.join('\n\n');
	};
	const pendingSide: string[] = [];
	const agentBody = (who: Who, paragraphs: string[], more = false) => {
		const extra = who === 'a' ? pendingSide.splice(0) : [];
		const closing = more && r() < 0.5 ? [pick(r, closings)] : [];
		const hello = [`Hi ${first},`, `Hello ${first},`, `Hi ${first},`, `Dear ${first},`];
		return [...(/^(Hello|Hi) /.test(paragraphs[0]!) || paragraphs[0]!.slice(0, 40).includes(first) ? [] : [pick(r, hello)]), ...paragraphs, ...extra, ...closing, fill(pick(r, agentSign), { signer: signers[who]! }), ...(who === 'a' && footer ? [`--\n${footer}`] : [])].join('\n\n');
	};

	// 1. The customer writes in, perhaps as a reply to the order confirmation.
	const hasOrder = topic.status !== 'basket' && topic.status !== 'voucher';
	const reply = hasOrder && !form && r() < 0.3;
	const tangent = r() < 0.35 ? pick(r, tangents) : undefined;
	const opening = [f(pick(r, path.open ?? topic.open!))];
	if (r() < 0.55) opening.unshift(f(pick(r, contexts)));
	if (r() < 0.4) opening.splice(opening.length - 1, 0, pick(r, chat));
	const more = shuffle(r, topic.more);
	if (r() < 0.85) opening.push(f(more[0]!));
	if (r() < 0.35) opening.push(f(more[1]!));
	if (r() < 0.5) opening.push(f(pick(r, situations)));
	if (tangent) opening.push(tangent[0]);
	const early = !tangent && r() < 0.25 ? pick(r, sides) : undefined;
	if (early) opening.push(early.q);
	if (topic.shows) opening.push(`${pick(r, ['From my banking app:', 'This is what my bank shows:', 'Copied from my statement:'])}\n\n${pasteOf(topic.shows)}`);
	say('c', custBody(opening, true));
	if (reply) messages[messages.length - 1] += `\n\nOn ${weekday(placedAt).slice(0, 3)} ${dateShort(placedAt)} ${at(placedAt).getUTCFullYear()} at ${clock(placedAt + 2)}, Larkspur <orders@larkspur.example> wrote:\n\n${confirmation(order, first)}`;
	if (r() < 0.12) {
		t = waking(r, open + int(r, 20, 400));
		say('c', custBody([f(pick(r, resends))], false));
		t = office(r, t + int(r, 5, 60));
		say('s', `Ticket ${number + 1} from the same customer merged into this one.`);
	}

	// 2. Support asks, or rings first.
	if (r() < 0.12) {
		advance('p');
		say('p', f(pick(r, calls)));
	}
	advance('a');
	const ask = f(pick(r, topic.ask));
	const ack = /^(Thanks|Sorry|Thank you|Lovely|Of course|No problem|Happy|Let me|Yes)/.test(ask) ? '' : pick(r, acks);
	say('a', agentBody('a', [[ack, ask].filter(Boolean).join(' '), ...(tangent ? [tangent[1]] : []), ...(early ? [early.a] : [])], true));

	// 3. The customer answers, and may raise a second matter.
	advance('c');
	const side = r() < 0.75 ? pick(r, sides.filter((other) => other !== early)) : undefined;
	const answer = [f(pick(r, path.detail)), pasteOf(path.paste)].filter(Boolean);
	if (side) {
		answer.push(side.q);
		pendingSide.push(side.a);
	}
	say('c', custBody(answer, false));

	// 4. Someone looks.
	advance('n');
	const own = path.lookPaste ?? 'order';
	const record = hasOrder && !['friends', 'coupon', 'record'].includes(own) && !path.code && r() < 0.85;
	const recordText = record
		? [
				`Customer ${values.cust} · ${full} · ${email} · ${phone}`,
				`Customer since ${dateYear(placedAt - int(r, 200, 1400) * DAY).replace(/^\d+ /, '')} · Friends: ${order.deal === 'friends' ? 'yes' : 'no'} · newsletter: ${own === 'emails' || r() < 0.6 ? 'yes' : 'no'}${r() < 0.5 ? ` · earlier tickets: ${7380 - int(r, 150, 2600)} (${dateYear(open - int(r, 60, 500) * DAY)})` : ''}`,
				historyTable(r, order, [], topic.status === 'delivered' ? 'delivered' : topic.status === 'new' && state !== 'dispatched' ? 'received' : topic.status === 'preorder' || state === 'preorder' ? 'pre-order' : 'dispatched', serialOn)
			].join('\n')
		: '';
	const screen = hasOrder && !['order', 'none', 'record'].includes(own) && r() < 0.8 ? pasteOf('order') : '';
	say(path.lookWho ?? 'n', [cap(f(pick(r, path.look))), pasteOf(own), screen, recordText].filter(Boolean).join('\n\n'));

	// 5. Sometimes a wait; always when the second matter would otherwise go unanswered.
	const end = pick(r, path.ends);
	const answered = end.some(([who]) => who === 'a');
	const another = shuffle(r, sides).find((other) => other !== side && other !== early)!;
	const chase = () => {
		advance('c');
		const raise = answered && r() < 0.5;
		say('c', custBody([f(pick(r, chasers)), ...(raise ? [another.q] : [])], false));
		if (raise) pendingSide.push(another.a);
	};
	if ((path.team && r() < 0.7) || (pendingSide.length && !answered)) {
		advance('a');
		held = true;
		values.dayAfter = weekday(nextWeekday(t, 2));
		say('a', agentBody('a', [f(pick(r, holding)).replace('asked the team to', 'asked the right people to').replace('with the team now', 'with the right people now').replace('passed this to the team, who', 'passed this on to someone who')], true));
		if (r() < 0.55) chase();
	} else if (r() < 0.35) chase();

	// 6. The end.
	const thanks = side?.then && r() < 0.6 ? side.then : '';
	const late = end.at(-1)![0] === 'c' && r() < 0.35 ? shuffle(r, sides).find((other) => other !== side && other !== another && other !== early) : undefined;
	end.forEach(([who, body], i) => {
		advance(who);
		if (who === 's' && overflow) return;
		const text = f(body);
		if (who === 'c') say('c', custBody([text, ...(i === end.length - 1 && thanks ? [thanks] : []), ...(i === end.length - 1 && late ? [`${pick(r, afterwords)} ${late.q.replace(/^(While I have you: |Also, |Unrelated, but |And |By the way, )/, '').replace(/^(\w)(?=[a-z])/, (letter) => letter.toLowerCase())}`] : [])], false));
		else if (signers[who]) say(who, agentBody(who, [text]));
		else if (who === 'f' && /^Refunded/.test(text)) {
			const money = text.match(/€[\d.]+/)?.[0] ?? euro(order.paid);
			say(who, `${text}\n\n| Date | Order | Amount | To | Reference | Status |\n| --- | --- | ---: | --- | --- | --- |\n| ${dayDate(t)} | ${text.match(/LK-\d+/)?.[0] ?? order.number} | ${money.slice(1)} | ${cardType} ending ${card} | RF${digits(r, 8)} | sent to card processor |`);
		} else if (who === 'x' && /(Re-sent|Replacement|Sent |re-sent)/.test(text)) {
			const box = lines.filter((line) => !/Christmas tree/.test(line.product.short)).slice(0, int(r, 1, lines.length));
			say(who, `${text}\n\nShipment ${values.tracking2} · ${int(r, 1, 2)} box · ${(int(r, 12, 90) / 10).toFixed(1)} kg · booked ${stampShort(t)}, collection ${clock(office(r, startOfDay(t) + 16 * 60))}\n${box.map((line) => `- ${line.qty} × ${line.product.name}`).join('\n')}`);
		} else say(who, text);
	});
	if (late) {
		advance('a');
		say('a', agentBody('a', [late.a, pick(r, ['Let me know if there’s anything else.', 'Happy gardening!', 'Enjoy the garden!'])]));
	}
	if (path.happy && r() < 0.45) {
		advance('s');
		const [rating, comment] = pick(r, surveys);
		if (!overflow) say('s', `Satisfaction survey answered: ${rating}.${comment ? ` “${f(comment)}”` : ''}`);
	}

	const subject = reply ? `Re: Your Larkspur order ${order.number}` : f(pick(r, topic.subjects));
	const channel = form ? 'contact form on larkspur.example' : 'by email';
	return [`# Ticket ${number}: ${plain(subject)}`, `From ${full} <${sender}> · ${stampLong(open)} · ${channel}`, ...messages.map((message) => `---\n\n${message}`)].join('\n\n') + '\n';
};

// Which topic and path each ticket follows: topics are dealt in rounds, each round in a new order, and the paths of
// a topic in turn, so that two tickets on one topic end differently until its paths run out.
const order = mulberry32(20261106);
const plans: Plan[] = [];
const used = new Map<Topic, number>();
const deck: Topic[] = [];
const fits = (path: Path, open: number) => (!path.since || open >= path.since) && (!path.until || open <= path.until);
for (let index = 0; index < ITEMS; index++) {
	const open = openings[Math.floor((index * openings.length) / ITEMS)]!;
	const allowed = (topic: Topic) => (!topic.since || open >= topic.since) && topic.paths.some((path) => fits(path, open));
	if (!deck.some(allowed)) deck.push(...shuffle(order, topics));
	const topic = deck.splice(deck.findIndex(allowed), 1)[0]!;
	const seen = used.get(topic) ?? 0;
	used.set(topic, seen + 1);
	const start = seen + topics.indexOf(topic);
	const candidates = topic.paths.map((_, i) => topic.paths[(start + i) % topic.paths.length]!);
	plans.push({ topic, path: candidates.find((path) => fits(path, open))!, open });
}

const folder = join(root, 'support', 'tickets');
mkdirSync(folder, { recursive: true });
let number = 7380;
plans.forEach((plan, index) => {
	number += int(order, 2, 5);
	writeFileSync(join(folder, `ticket-${number}.md`), ticket(index, plan, number));
});
writeFileSync(
	join(folder, 'README.md'),
	`# Support tickets, 6 October to 13 November 2026\n\nThe ${ITEMS} tickets the support desk handled in these six weeks, one file each, exported from the old help desk before\nthe move. The export kept the messages and internal notes, but not the tags, statuses or assignees. Numbers missing\nfrom the sequence were spam or were merged into another ticket. Order screens, courier tracking and payment records in\ninternal notes are as support pasted them.\n`
);
