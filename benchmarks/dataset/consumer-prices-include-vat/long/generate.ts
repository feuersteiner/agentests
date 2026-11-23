// Writes the long material of this entry's long tasks: the tickets that customers opened with Snapframe support
// between 5 October and 13 November 2026, one Markdown file each, under support/tickets/.
// Deterministic: fixed seeds, no clock, no network.
//   bun long/generate.ts <workspace root>
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** How many tickets to write. Everything else is derived from it. */
const ITEMS = 260;

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
const dayMonth = (ms: number) => `${utc(ms).getUTCDate()} ${MONL[utc(ms).getUTCMonth()]}`;
const short = (ms: number) => `${WD[utc(ms).getUTCDay()]} ${utc(ms).getUTCDate()} ${MON[utc(ms).getUTCMonth()]}`;
const fullDay = (ms: number) => `${WDL[utc(ms).getUTCDay()]} ${dayMonth(ms)}`;
const midnight = (ms: number) => ms - (ms % DAY);
const weekday = (ms: number) => utc(ms).getUTCDay() >= 1 && utc(ms).getUTCDay() <= 5;
/** The working day `n` working days after the day of `ms` (Monday to Friday). */
const addWork = (ms: number, n: number) => {
	let day = midnight(ms);
	for (let left = n; left > 0; ) if (weekday((day += DAY))) left--;
	return day;
};
const subWork = (ms: number, n: number) => {
	let day = midnight(ms);
	for (let left = n; left > 0; ) if (weekday((day -= DAY))) left--;
	return day;
};
const FIRST_DAY = Date.UTC(2026, 9, 5);
const LAST_DAY = Date.UTC(2026, 10, 13);
const EXPORT = Date.UTC(2026, 10, 20);
const openDays: number[] = [];
for (let day = FIRST_DAY; day <= LAST_DAY; day += DAY) if (utc(day).getUTCDay() !== 0) openDays.push(day);

// ---------------------------------------------------------------------------------------------------------
// People and places.
const firstF = ['Grace', 'Siobhan', 'Priya', 'Hannah', 'Moira', 'Aisha', 'Jo', 'Rachel', 'Ewa', 'Claire', 'Bronwen', 'Funmi', 'Lucy', 'Kirsty', 'Shabnam', 'Linda', 'Megan', 'Rosa', 'Tamsin', 'Yetunde', 'Fiona', 'Ngozi', 'Anna', 'Beth', 'Charlotte', 'Leanne'];
const firstM = ['Gareth', 'Imran', 'Dave', 'Kwame', 'Liam', 'Tomasz', 'Stuart', 'Rhys', 'Anil', 'Euan', 'Malcolm', 'Femi', 'Chris', 'Hamish', 'Paul', 'Ollie', 'Raj', 'Declan', 'Niall', 'Joseph', 'Ade', 'Martin', 'Sean', 'Dominic'];
const surnames = ['Okafor', 'Pritchard', 'McLeod', 'Bhatt', 'Kowalski', 'Hughes', 'Adeyemi', 'Fraser', 'Lennox', 'Moran', 'Chaudhry', 'Whitaker', 'Nwosu', 'Gillespie', 'Rees', 'Ashworth', 'Kaur', 'Doherty', 'Templeton', 'Osei', 'Brennan', 'Lowe', 'Sandhu', 'Mackintosh', 'Evans', 'Abbott', 'Quigley', 'Farouk', 'Bainbridge', 'Thornton'];
const providers = ['mailhub.example', 'letterbox.example', 'homepost.example', 'brightmail.example', 'inbox-uk.example', 'parkmail.example', 'hillside.example'];
const agents = ['Hollie', 'Arjun', 'Bethan', 'Tomek', 'Precious', 'Callum', 'Niamh', 'Seb'];
const teamPeople: Record<string, [string, string, string]> = {
	// team: [person, how they introduce themselves, how their messages are headed]
	'the print room': ['Declan', 'Declan from the print room', 'Snapframe print room'],
	'the frames workshop': ['Bridget', 'Bridget from the frames workshop', 'Snapframe frames workshop'],
	'the bindery': ['Oksana', 'Oksana from the bindery', 'Snapframe bindery'],
	dispatch: ['Marcus', 'Marcus from dispatch', 'Snapframe dispatch'],
	'the web team': ['Anika', 'Anika from the web team', 'Snapframe web team'],
	'the app team': ['Yusuf', 'Yusuf from the app team', 'Snapframe app team'],
	'the data protection team': ['Rhiannon', 'Rhiannon from the data protection team', 'Snapframe data protection'],
	'the lab manager': ['Gwen', 'Gwen, the lab manager', 'Snapframe lab manager']
};
const places = [['Leeds', 'LS6'], ['Bristol', 'BS3'], ['Norwich', 'NR2'], ['Cardiff', 'CF24'], ['York', 'YO10'], ['Sheffield', 'S11'], ['Brighton', 'BN2'], ['Swansea', 'SA1'], ['Belfast', 'BT7'], ['Exeter', 'EX4'], ['Carlisle', 'CA1'], ['Hull', 'HU5'], ['Nottingham', 'NG7'], ['Bath', 'BA2'], ['Durham', 'DH1'], ['Inverness', 'IV2'], ['Aberdeen', 'AB10'], ['Derry', 'BT48'], ['Truro', 'TR1'], ['Wrexham', 'LL11'], ['Stockport', 'SK4'], ['Dundee', 'DD2']] as const;
const islands = [['Orkney', 'Kirkwall', 'KW15', 'Inverness', 'Scrabster'], ['Lewis', 'Stornoway', 'HS1', 'Inverness', 'Ullapool'], ['Mull', 'Tobermory', 'PA75', 'Glasgow', 'Oban'], ['Arran', 'Brodick', 'KA27', 'Glasgow', 'Ardrossan'], ['Shetland', 'Lerwick', 'ZE1', 'Aberdeen', 'Aberdeen'], ['Islay', 'Bowmore', 'PA43', 'Glasgow', 'Kennacraig'], ['the Isles of Scilly', "St Mary's", 'TR21', 'Plymouth', 'Penzance']] as const;
const streets = ['14 Mill Lane', '3 Harbour Row', 'Flat 2, 41 Wellington Place', '22 Station Road', '7 Orchard Close', '58 Victoria Street', '1 The Green', '19 Ash Grove', 'Flat 6, Tannery Court', '33 Kingsway'];
const depots = ['Wakefield', 'Bristol', 'Peterborough', 'Warrington', 'Glasgow', 'Cardiff', 'Northampton', 'Gateshead'];
const iphones = ['iPhone 13', 'iPhone 14', 'iPhone 14 Pro', 'iPhone 15', 'iPhone 16', 'iPhone SE'];
const androids = ['Samsung Galaxy S23', 'Samsung Galaxy A54', 'Pixel 8', 'Pixel 7a', 'Motorola Edge 40', 'Xiaomi Redmi Note 13'];
const browsers = ['Firefox', 'Chrome', 'Edge'];
const cameras = [['Canon EOS R7', 'CR3'], ['Nikon Z6 II', 'NEF'], ['Sony a6400', 'ARW'], ['Fujifilm X-T5', 'RAF'], ['OM System E-M10', 'ORF']] as const;
const studios = ['Hartley & Rose Photography', 'Juniper Lane Studio', 'Tom Ashby Weddings', 'Wildflower Photo Co', 'Northlight Studio', 'Kemi Adebayo Photography', 'Saltmarsh Weddings'];
const subjects = ['our holiday in Crete', "my daughter's wedding", "the twins' first year", 'our trip to Skye', "Dad's 80th", 'the allotment through the seasons', 'our new puppy', 'sports day', 'our week in Pembrokeshire', 'the Lake District', "my nan's garden party", 'our honeymoon in Lisbon', 'the dog on the beach', 'the kids at the zoo', 'our camping trip in Northumberland', "Grandma's 90th", 'the school leavers\' do', 'our weekend in Whitby'];
const persons = ['my mum', 'my dad', 'my nan', 'my grandad', 'my sister', 'my best friend', 'my husband', 'my wife', 'my partner', 'my son', 'my daughter', 'my mother-in-law', 'my brother'];
const occasions = ['birthday', '60th birthday', '40th', 'wedding anniversary', 'retirement do', 'leaving party', 'christening', 'graduation', 'house-warming', 'golden wedding', '70th'];
const typos = [['Our first year with Alfie the Labardor', 'Our first year with Alfie the Labrador'], ['Congratualtions Priya and Sam', 'Congratulations Priya and Sam'], ['Skye, Septmber 2026', 'Skye, September 2026'], ['The Whitaker famliy at Christmas', 'The Whitaker family at Christmas'], ['Happy retirment, Mr Hughes', 'Happy retirement, Mr Hughes'], ["Ellie's frist birthday", "Ellie's first birthday"], ['Lisbon, our honeymoon in Portgual', 'Lisbon, our honeymoon in Portugal'], ['Nana Margeret at 90', 'Nana Margaret at 90'], ['Sports day, Year 6, Juy 2026', 'Sports day, Year 6, July 2026']] as const;
const albums = ['Crete 2026', 'Family', 'Summer!', 'Wedding pics', 'Kids', 'Holiday'];
const neighbours = ['number 14', 'number 23', 'the house opposite', 'number 9', 'the Hendersons at number 31', 'the flat across the landing'];
const qcNames = ['Kev', 'Shona', 'Dariusz', 'Amira', 'Pete', 'Lou'];

// ---------------------------------------------------------------------------------------------------------
// Products. Lead times are the working days an item spends in the lab, as docs/product-notes.md gives them.
type Area = 'prints' | 'framed' | 'canvas' | 'book' | 'mug' | 'delivery' | 'site';
type Product = 'prints' | 'framed' | 'canvas' | 'book' | 'mug';
const LEAD: Record<Product, number> = { prints: 2, framed: 4, canvas: 5, book: 5, mug: 3 };
const NOUN: Record<Product, string> = { prints: 'prints', framed: 'framed print', canvas: 'canvas', book: 'photo book', mug: 'mug' };
const products: Product[] = ['prints', 'framed', 'canvas', 'book', 'mug'];
const label = (r: Rand, product: Product): string => {
	if (product === 'prints') return `Classic prints, pack of 50 (${pick(r, ['lustre', 'lustre', 'lustre', 'gloss'])})${chance(r, 0.2) ? ' x 2' : ''}`;
	if (product === 'framed') return `A4 framed print (${pick(r, ['natural oak', 'black stain'])})`;
	if (product === 'canvas') return `A3 canvas print (${pick(r, ['image wrap', 'image wrap', 'white edges', 'black edges'])})`;
	if (product === 'book') return `Photo book, 20 pages${chance(r, 0.15) ? ' x 2' : ''}`;
	return `Photo mug (${pick(r, ['one photo', 'one photo', 'panorama', 'two photos'])})${chance(r, 0.25) ? ` x ${int(r, 2, 4)}` : ''}`;
};

type Outcome = 'resolved' | 'owe' | 'act' | 'team' | 'quiet';
type Stage = 'delivered' | 'lab' | 'hold' | 'transit' | 'none';
type Slots = Record<string, string>;
type Art = (r: Rand, s: Slots) => string;

interface Topic {
	area: Area;
	weight: number;
	/** Where the order the topic is about stands when the ticket opens; 'none' for no order. */
	stage: Stage;
	/** The order's first item, when the topic needs a particular one. */
	item?: string;
	/** The order holds a quick item and a slow one (the {fast} and {slow} slots). */
	mixed?: boolean;
	phone?: 'iphone' | 'android';
	island?: boolean;
	/** The topic's answers name days a few days ahead, so as the main matter it raises no other matter in full. */
	alone?: boolean;
	subjects: string[];
	/** The customer's first message about it, two ways. */
	open: [string, string];
	/** The topic as a quick side question, and its answer. */
	quick: [string, string];
	/** The agent's first answer to the opening, which asks for something. */
	reply: string;
	/** Exchanges in order. The first gives what the reply asked for and asks for one more thing; the second
	 * finds the cause; the rest are follow-up questions. A third element names a pasted artifact. */
	turns: [string, string, Art?][];
	/** What the agent asks for in the first turn, as a noun phrase. */
	need: string;
	/** The cause, as a clause, for a colleague who finds it later. */
	cause: string;
	/** What the customer has to do, after "you'll need to". */
	act: string;
	/** The customer's message when it is over; `ok` instead when it comes up on the side of another matter. */
	fixed: [string, string];
	ok?: string;
	/** How long the customer's last message comes after the agent's: a few days (something in the post), or a week
	 * and more (something made again in the lab, or ordered again). */
	endWait?: 'long' | 'remake';
	/** A further question at the end, and what the agent then owes, after "I'll". */
	follow: string;
	owe: string;
	team: string;
	/** The internal note when the ticket is handed to the team. */
	handover: string;
	noTeamFix?: boolean;
	outcomes?: Outcome[];
}

// ---------------------------------------------------------------------------------------------------------
// Pasted artifacts.
const table = (head: string[], rows: string[][]) =>
	[`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`, ...rows.map((row) => `| ${row.join(' | ')} |`)].join('\n');
const fence = (lines: string[]) => ['```', ...lines, '```'].join('\n');
const hm = (r: Rand, low = 7, high = 20) => `${pad(int(r, low, high))}:${pad(int(r, 0, 59))}`;
const img = (s: Slots, step: number) => `IMG_${Number(s.imgBase) + step}.${s.ext}`;
const ms = (s: Slots, key: string) => Number(s[`${key}Ms`]);
const otherOrder = (r: Rand, s: Slots) => `SF-${Number(s.order!.slice(3)) + pick(r, [-1, 1]) * int(r, 1, 40)}`;
const tracking = (r: Rand, s: Slots, end: string[][]) =>
	table(
		['When', 'Where', 'Event'],
		[
			[`${short(ms(s, 'left'))} ${hm(r, 15, 17)}`, 'Snapframe lab, Leeds', 'Parcel received from sender'],
			[`${short(ms(s, 'left'))} ${hm(r, 21, 23)}`, 'Wakefield hub', 'Sorted'],
			...end
		]
	);

const arts: Record<string, Art> = {
	exif: (r, s) =>
		table(
			['File', 'Taken', 'Camera', 'Pixels', 'Mode', 'Average brightness'],
			[0, 3, 4, 9, 12, 13].slice(0, int(r, 4, 6)).map((step) => [img(s, step), `${s.shotDay} ${hm(r, 19, 22)}`, s.phone!, s.phone!.startsWith('iPhone') ? '4032 x 3024' : '4080 x 3072', 'HDR', `${int(r, 11, 24)}%`])
		),
	crop: (r, s) =>
		table(
			['Photo', 'Photo shape', 'Print shape', 'Cut from the top', 'Cut from the bottom', 'Faces near the top edge'],
			[s.file!, s.file2!, img(s, 7), img(s, 11)].map((file, i) => [file, '4:3', '3:2 (6 x 4 in)', `${int(r, 5, 9)} mm`, `${int(r, 1, 4)} mm`, i < 2 ? 'yes' : pick(r, ['yes', 'no'])])
		),
	uploadsShared: (r, s) =>
		table(
			['File', 'Added from', 'Size', 'Pixels', 'Status'],
			[
				...[1, 2].map((step) => [img(s, step), 'Camera roll', `${(2 + r() * 3).toFixed(1)} MB`, '4032 x 3024', 'Printed']),
				...Array.from({ length: Number(s.missing) }, (_, i) => [`IMG_${int(r, 1000, 9999)}.JPG`, `Shared album "${s.album}"`, `${int(r, 38, 95)} KB`, pick(r, ['640 x 480', '512 x 384', '480 x 640']), 'Left out: too small to print']),
				[img(s, 3), 'Camera roll', `${(2 + r() * 3).toFixed(1)} MB`, '4032 x 3024', 'Printed']
			]
		),
	exif2: (r, s) =>
		table(
			['Photo', 'Pixels', 'File size', 'Came from', 'Quality at 6 x 4'],
			[
				[s.file!, '1600 x 1200', `${int(r, 160, 260)} KB`, 'WhatsApp', 'Low (amber warning shown)'],
				[s.file2!, '1600 x 1200', `${int(r, 160, 260)} KB`, 'WhatsApp', 'Low (amber warning shown)'],
				[img(s, 5), '4032 x 3024', `${(2 + r() * 2.5).toFixed(1)} MB`, 'Camera', 'Good'],
				[`IMG-2026${pad(int(r, 7, 9))}${pad(int(r, 1, 28))}-WA00${pad(int(r, 10, 99))}.jpg`, '1600 x 1200', `${int(r, 160, 260)} KB`, 'WhatsApp', 'Low (amber warning shown)'],
				[img(s, 8), '4032 x 3024', `${(2 + r() * 2.5).toFixed(1)} MB`, 'Camera', 'Good']
			]
		),
	orderlog: (r, s) => {
		const first = int(r, 30, 40);
		const minute = int(r, 10, 40);
		return fence([
			`Order ${s.order}: order page events`,
			`${short(ms(s, 'placed'))} 20:${pad(minute)}  Pack started: Classic prints, pack of 50`,
			`${short(ms(s, 'placed'))} 20:${pad(minute + 4)}  ${first} photos added`,
			`${short(ms(s, 'placed'))} 20:${pad(minute + 6)}  Finish set to Gloss`,
			`${short(ms(s, 'placed'))} 20:${pad(minute + 11)}  ${50 - first} photos added`,
			`${short(ms(s, 'placed'))} 20:${pad(minute + 11)}  Finish set to Lustre (default)`,
			`${short(ms(s, 'placed'))} 20:${pad(minute + 15)}  Summary shown`,
			`${short(ms(s, 'placed'))} 20:${pad(minute + 16)}  Order placed`
		]);
	},
	packing: (r, s) => {
		const base = int(r, 9, 14);
		const packer = pick(r, qcNames);
		return table(
			['Time', 'Bench', 'Order', 'Packed by', 'Label printed'],
			[
				[`${pad(base)}:0${int(r, 1, 4)}`, 'Packing 2', otherOrder(r, s), packer, `${pad(base)}:0${int(r, 5, 9)}`],
				[`${pad(base)}:1${int(r, 0, 3)}`, 'Packing 2', s.order2!, packer, `${pad(base)}:1${int(r, 4, 5)} (label for ${s.order})`],
				[`${pad(base)}:1${int(r, 6, 9)}`, 'Packing 2', s.order!, packer, `${pad(base)}:2${int(r, 0, 3)} (label for ${s.order2})`],
				[`${pad(base)}:3${int(r, 0, 9)}`, 'Packing 2', otherOrder(r, s), packer, `${pad(base)}:4${int(r, 0, 9)}`]
			]
		);
	},
	trackDoorstep: (r, s) =>
		tracking(r, s, [
			[`${short(addWork(ms(s, 'left'), 1))} ${hm(r, 5, 6)}`, `${s.depot} depot`, 'Arrived at depot'],
			[`${short(ms(s, 'delivered'))} ${hm(r, 7, 8)}`, `${s.depot} depot`, 'Out for delivery'],
			[`${short(ms(s, 'delivered'))} ${s.time}`, `${s.town} ${s.pc}`, 'Delivered: left at front door, photo taken']
		]),
	trackDamaged: (r, s) =>
		tracking(r, s, [
			[`${short(addWork(ms(s, 'left'), 1))} ${hm(r, 4, 6)}`, `${s.depot} depot`, 'Arrived at depot: parcel damaged, retaped'],
			[`${short(ms(s, 'delivered'))} ${hm(r, 7, 8)}`, `${s.depot} depot`, 'Out for delivery'],
			[`${short(ms(s, 'delivered'))} ${hm(r, 10, 16)}`, `${s.town} ${s.pc}`, 'Delivered: handed to customer']
		]),
	trackWrongDoor: (r, s) =>
		tracking(r, s, [
			[`${short(addWork(ms(s, 'left'), 1))} ${hm(r, 4, 6)}`, `${s.depot} depot`, 'Arrived at depot'],
			[`${short(ms(s, 'delivered'))} ${hm(r, 7, 8)}`, `${s.depot} depot`, 'Out for delivery'],
			[`${short(ms(s, 'delivered'))} ${s.time}`, `${s.town} ${s.pc}`, `Delivered: left in porch, photo taken (GPS ${s.meters} m from address)`]
		]),
	trackDepot: (r, s) => {
		const held: string[][] = [];
		for (let n = 1; n <= 6 && addWork(ms(s, 'left'), n) <= Number(s.nowMs); n++)
			held.push([`${short(addWork(ms(s, 'left'), n))} ${hm(r, 6, 9)}`, `${s.depot} depot`, n === 1 ? 'Arrived at depot' : 'Held at depot: onward service suspended (weather)']);
		return tracking(r, s, held);
	},
	picklist: (r, s) => {
		const picker = pick(r, qcNames);
		const rows = [
			`${otherOrder(r, s)}   A4    Natural oak    N2     ${picker}`,
			`${s.order}   A4    Black stain    N2     ${picker}`,
			`${otherOrder(r, s)}   A4    Black stain    B1     ${picker}`,
			`${otherOrder(r, s)}   A4    Natural oak    N2     ${picker}`
		];
		return fence([`Frames workshop pick list, ${short(ms(s, 'printed'))}`, `Order       Size  Frame          Rack   Picked by`, ...rows]);
	},
	qcFixings: (r, s) =>
		fence([
			`Packing note, ${short(ms(s, 'left'))}, bench 1`,
			`${hm(r, 9, 10)}  Fixings bags: last box opened`,
			`${hm(r, 11, 12)}  Fixings bags: none left, reorder chased`,
			`${hm(r, 14, 15)}  Fixings bags: delivery arrived, packing as normal`,
			`Frames packed without a bag between those times: ${int(r, 6, 14)}`
		]),
	qcFibre: (r, s) =>
		fence([`Frames workshop, light table check`, `Order      ${s.order}`, `Assembled  ${short(ms(s, 'printed'))} ${hm(r, 9, 16)}`, `Bench      ${int(r, 1, 3)}`, `Checked    not recorded`]),
	qcStaples: (r, s) =>
		fence([`Stretching record, ${short(ms(s, 'printed'))}`, `Order      ${s.order}`, `Stretcher  ${pick(r, qcNames)}`, `Staple gun  #${int(r, 2, 4)} (jammed twice that morning, serviced at ${hm(r, 12, 13)})`, `Corners    4 checked by hand: yes`]),
	hold: (r, s) =>
		fence([
			`Order ${s.order}: on hold`,
			`Reason        Professional photo check`,
			`Found         Watermark "${s.studio}", lower right, photo 1 of 1`,
			`Held by       ${pick(r, qcNames)}, ${short(ms(s, 'placed'))} ${hm(r, 9, 11)}`,
			`Customer told ${short(ms(s, 'placed'))} ${hm(r, 11, 12)}, by email`,
			`Released      not yet`
		]),
	canvasPreview: (r, s) =>
		table(
			['Part of the photo', 'How much', 'Where it ends up'],
			[
				['Outer strip, all four sides', '3 cm', 'Round the sides of the frame'],
				['Next strip in', '0.5 cm', 'On the front edge, may be slightly curved'],
				['Everything else', `${int(r, 22, 24)} x ${int(r, 35, 36)} cm`, 'On the front'],
				['People at the ends of your photo', `${int(r, 1, 3)}`, 'Partly in the outer strip']
			]
		),
	printlog: (r, s) =>
		table(
			['Time', 'Printer', 'Job', 'Note'],
			[
				[`${short(ms(s, 'printed'))} ${hm(r, 8, 10)}`, 'Printer 2', otherOrder(r, s), ''],
				[`${short(ms(s, 'printed'))} ${hm(r, 10, 12)}`, 'Printer 2', s.order!, ''],
				[`${short(ms(s, 'printed'))} ${hm(r, 12, 13)}`, 'Printer 2', otherOrder(r, s), ''],
				[`${short(ms(s, 'printed'))} ${hm(r, 14, 15)}`, 'Printer 2', '-', 'Blue ink low; nozzle check failed; recalibrated'],
				[`${short(ms(s, 'printed'))} ${hm(r, 16, 17)}`, 'Printer 2', otherOrder(r, s), 'After recalibration']
			]
		),
	bookLayouts: (r, s) =>
		table(
			['Layout', 'Photos a page', 'Photo size on the page', 'Photos in 20 pages'],
			[
				['Full page', '1', '21 x 21 cm', '20'],
				['Two side by side', '2', '10 x 21 cm', '40'],
				['Grid of four', '4', '10 x 10 cm', '80'],
				['Grid of six', '6', `7 x ${int(r, 9, 10)} cm`, '120']
			]
		),
	bookOrder: (r, s) =>
		table(
			['Page', 'Photo', 'Date stored in the photo', 'Camera'],
			[3, 7, 11, 15].map((page, i) => [String(page), img(s, page * 3), i === 1 ? `${int(r, 1, 28)} January 2019` : `${int(r, 1, 28)} ${pick(r, ['July', 'August'])} 2026`, i === 1 ? 'Compact camera' : s.phone!])
		),
	bookText: (r, s) =>
		table(
			['Page', 'Layout', 'Photos', 'Text'],
			[
				[String(Number(s.page) - 1), 'Full page', '1', ''],
				[s.page!, pick(r, ['Full page', 'Two side by side']), String(int(r, 1, 2)), `"${s.wrong}"`],
				[String(Number(s.page) + 1), 'Grid of four', '4', ''],
				['Cover', 'Photo and title', '1', `"${pick(r, ['Our year', 'Summer 2026', 'Memories', 'The best bits'])}"`]
			]
		),
	bindery: (r, s) =>
		table(
			['Run', 'Started', 'Glue temperature', 'Books', 'Note'],
			[
				['A', `${short(ms(s, 'printed'))} 07:${pad(int(r, 30, 59))}`, `${int(r, 138, 146)} °C`, String(int(r, 30, 60)), 'Below 160 °C: heater fault'],
				['B', `${short(ms(s, 'printed'))} 10:${pad(int(r, 0, 59))}`, `${int(r, 168, 176)} °C`, String(int(r, 40, 70)), ''],
				['C', `${short(ms(s, 'printed'))} 14:${pad(int(r, 0, 59))}`, `${int(r, 168, 176)} °C`, String(int(r, 30, 60)), '']
			]
		),
	coverLayout: (r, s) =>
		fence([
			`Cover sheet, photo book 21 x 21 cm`,
			`| wrap 1.5 | back 21 cm | spine 1.2 | front 21 cm | wrap 1.5 |`,
			`Photo placed on: whole sheet`,
			`Centre of photo: on the spine`,
			`Faces found in wrap or spine: ${int(r, 1, 2)}`
		]),
	pressLog: (r, s) =>
		table(
			['Press', 'Shift', 'Set to', 'Measured', 'Mugs pressed'],
			[
				['1', `${short(ms(s, 'printed'))} morning`, '200 °C', `${int(r, 198, 201)} °C`, String(int(r, 40, 80))],
				['2', `${short(ms(s, 'printed'))} morning`, '200 °C', `${int(r, 198, 201)} °C`, String(int(r, 40, 80))],
				['2', `${short(ms(s, 'printed'))} afternoon`, '200 °C', `${int(r, 176, 184)} °C`, String(int(r, 30, 70))],
				['1', `${short(ms(s, 'printed'))} afternoon`, '200 °C', `${int(r, 198, 201)} °C`, String(int(r, 40, 80))]
			]
		),
	mugLayout: (r, s) =>
		fence([
			`Mug design, panorama`,
			`Photo width        ${int(r, 6000, 9000)} px (wider than the mug)`,
			`Placed             centred automatically`,
			`Join in the photo  behind the handle, at ${int(r, 46, 54)}% across the photo`,
			`Greyed strip       ${int(r, 2, 3)} cm under the handle`
		]),
	timeline: (r, s) =>
		table(
			['Step', 'When'],
			[
				['Order placed', `${short(ms(s, 'placed'))}, ${hm(r, 18, 22)}`],
				[`${s.fast!.charAt(0).toUpperCase()}${s.fast!.slice(1)} printed`, short(addWork(ms(s, 'placed'), 1))],
				[`${s.slow!.charAt(0).toUpperCase()}${s.slow!.slice(1)} in production`, `until ${short(ms(s, 'left'))}`],
				['Order leaves the lab', `${short(ms(s, 'left'))} (planned)`],
				['Express delivery', `${short(ms(s, 'arrives'))} (planned)`]
			]
		),
	addressChange: (r, s) =>
		fence([`Order ${s.order}: delivery address`, `Was   ${s.full}, ${pick(r, streets)}, ${s.town2}`, `Now   ${s.full}, ${s.street}, ${s.town} ${s.pc}`, `By    ${s.agent} (support), ${short(Number(s.nowMs))}`, `Label not printed yet: yes`]),
	calendar: (r, s) =>
		table(
			['Day', 'What happens'],
			[
				[fullDay(ms(s, 'orderday')), 'You place the order'],
				[`${fullDay(addWork(ms(s, 'orderday'), 1))} to ${fullDay(ms(s, 'left2'))}`, `The ${s.slow} is made in the lab`],
				[fullDay(ms(s, 'left2')), 'It leaves the lab; we email the tracking link'],
				[`${fullDay(ms(s, 'arr1'))} or ${fullDay(ms(s, 'arr2'))}`, 'It arrives, with standard delivery']
			]
		),
	emailRemoval: (r, s) =>
		table(
			['Sent', 'Email', 'To', 'Result'],
			[
				[short(ms(s, 'removed') - 30 * DAY), 'Your photos will be removed in 30 days', s.email!, 'Delivered (spam folder)'],
				[short(ms(s, 'removed') - 7 * DAY), 'Your photos will be removed in 7 days', s.email!, 'Delivered (spam folder)'],
				[short(ms(s, 'removed')), `${int(r, 140, 620)} photos removed`, '-', 'Done']
			]
		),
	emailReset: (r, s) =>
		table(
			['Time', 'Request', 'Address typed', 'Result'],
			[int(r, 30, 48), int(r, 18, 29), int(r, 6, 17), int(r, 1, 5)].map((hours) => {
				const when = Number(s.nowMs) - hours * HOUR - int(r, 0, 59) * MIN;
				return [`${short(when)} ${clock(when)}`, 'Password reset', s.typo!, 'No account under this address, no email sent'];
			})
		),
	signins: (r, s) =>
		table(
			['When', 'Account', 'Signed in with', 'Device'],
			[
				[`${dayMonth(Number(s.nowMs) - int(r, 40, 90) * DAY)}`, s.email!, 'Email and password', s.phone!],
				[`${dayMonth(Number(s.nowMs) - int(r, 10, 39) * DAY)}`, s.email!, 'Email and password', `${pick(r, browsers)} on a laptop`],
				[`${dayMonth(Number(s.nowMs))}`, s.email2!, 'Google (new account created)', s.phone!]
			]
		),
	crash: (r, s) =>
		fence([
			`Snapframe for Android ${s.appv}, crash report`,
			`Device: ${s.phone}, Android ${int(r, 13, 15)}`,
			`Screen: PhotoPicker > AddToOrder`,
			`Error: picked item has no local file (cloud only), waited 30 s`,
			`Picked: ${int(r, 6, 40)} photos, ${int(r, 4, 30)} of them cloud only`,
			`Reports with the same error this week: ${int(r, 40, 300)}`
		]),
	dataRequest: (r, s) =>
		table(
			['Field', 'Value'],
			[
				['Request', 'Delete account and uploads'],
				['From', s.email!],
				['Checked against account address', 'Yes'],
				['Open orders', `${s.order} (left the lab ${dayMonth(ms(s, 'left'))})`],
				['Uploads held', String(int(r, 80, 2400))],
				['Deletion due', '14 days after the open order is delivered']
			]
		),
	uploadsRaw: (r, s) =>
		table(
			['File', 'Size', 'Status'],
			[0, 0, 1, 1, 2, 2, 3, 3].map((n, i) => {
				const raw = i % 2 === 1;
				return [`DSC_${Number(s.imgBase) + n}.${raw ? s.raw : 'JPG'}`, `${raw ? int(r, 24, 48) : int(r, 6, 14)} MB`, raw ? 'Waiting for conversion (99%)' : 'Uploaded'];
			})
		)
};

/** Where each artifact appears: in an internal note with this lead line, or in the agent's reply to the customer. */
const artPlaces: Record<string, [string, 'note' | 'reply']> = {
	exif: ['Photo details from the order page', 'note'],
	crop: ['Crop check for the order, from the order page', 'note'],
	uploadsShared: ['Upload record for the order', 'note'],
	exif2: ['Photo details for the order', 'note'],
	orderlog: ['Order page events, from the web team\'s log', 'note'],
	packing: ['Packing bench log, sent over by the lab', 'note'],
	trackDoorstep: ['Courier tracking', 'note'],
	trackDamaged: ['Courier tracking', 'note'],
	trackWrongDoor: ['Courier tracking, with the delivery scan', 'note'],
	trackDepot: ['Courier tracking', 'note'],
	picklist: ['Pick list from the frames workshop', 'note'],
	qcFixings: ['Packing note from the lab for that day', 'note'],
	qcFibre: ['From the frames workshop', 'note'],
	qcStaples: ['Stretching record from the frames workshop', 'note'],
	hold: ['Hold record', 'note'],
	canvasPreview: ['Edge check on the saved canvas design', 'note'],
	printlog: ['Print log from the print room', 'note'],
	bookLayouts: ['', 'reply'],
	bookOrder: ["Pages from the customer's project", 'note'],
	bookText: ["Pages from the customer's project", 'note'],
	bindery: ['Bindery run sheet for that day', 'note'],
	coverLayout: ['Cover check on the saved project', 'note'],
	pressLog: ['Mug press log', 'note'],
	mugLayout: ['Mug design as saved', 'note'],
	timeline: ['', 'reply'],
	addressChange: ['Address change', 'note'],
	calendar: ['', 'reply'],
	emailRemoval: ['Emails to the account', 'note'],
	emailReset: ['Reset requests for that address before the ticket came in', 'note'],
	signins: ['Sign-ins for this customer', 'note'],
	crash: ['Matching crash report from the app team\'s dashboard', 'note'],
	dataRequest: ['Request logged for the data protection team', 'note'],
	uploadsRaw: ["Upload record from the customer's last attempt", 'note']
};
const artPlace = new Map<Art, [string, 'note' | 'reply']>(Object.entries(arts).map(([name, art]) => [art, artPlaces[name]!]));
for (const name of Object.keys(arts)) if (!artPlaces[name]) throw new Error(`no place for artifact ${name}`);

// ---------------------------------------------------------------------------------------------------------
// Topics. Slots in braces are filled per ticket; {order} and the dates around it belong to the topic's own order.
const topics: Topic[] = [
	{
		area: 'prints',
		weight: 2,
		stage: 'delivered',
		subjects: ['Prints too dark', 'Photos much darker than on my phone', 'Disappointed with my prints'],
		open: [
			`My pack of prints arrived on {delivered} and a lot of them are much darker than they look on my phone. The ones from {subject} are the worst: you can hardly see faces in the evening shots. On my screen they look fine.`,
			`I've just opened my prints and I'm a bit gutted. About half of them are so dark they look as if they were taken at night, and they weren't. They're photos of {subject} and I wanted them for {person}'s {occasion}.`
		],
		quick: [`Can I have the prints with a white border?`, `Yes. On the order page, open a photo and choose "Add a white border". You can set it for every photo at once from the Options menu above the grid.`],
		reply: `Sorry they've come out darker than you hoped. Could you send me a photo of two or three of the prints next to the same pictures on your phone? Daylight by a window is best, so I can see the difference properly.`,
		turns: [
			[`Here you go: three of the prints on the kitchen table with my phone next to them, photos attached.`, `Thanks, that helps a lot. The prints look like the files to me, so I'd like to check the files themselves. Could you tell me which phone took them, and whether you edited them in an app before uploading?`],
			[`They're all from my {phone}. I didn't edit them, I just picked them from the camera roll.`, `That explains it. The {phone} takes evening photos in HDR and brightens them on the screen as you look at them, but the file it saves is a good deal darker. Our printers print the file as it is, so the prints match what the camera stored, not what the screen shows. The order page has a "Brighten dark photos" option for exactly this, and it was off for your order.`, arts.exif],
			[`Why isn't that option on all the time?`, `Because it lightens every photo, including the ones that are meant to be dark, like sunsets and candlelit shots. Most customers prefer to choose it themselves.`],
			[`If I order them again, can I brighten just some of them?`, `Yes. Tick the photos you want brightened in the grid, then choose "Brighten dark photos" from the Options menu. The rest stay as they are.`]
		],
		need: 'to know which phone took the photos, and whether they were edited before uploading',
		cause: `the photos were taken in HDR on a {phone}, which brightens them on screen while the saved files stay dark, and "Brighten dark photos" was off for the order`,
		act: `order the dark ones again with "Brighten dark photos" ticked for those photos`,
		fixed: [`The new ones came today with the brightening on and you can see everyone's faces now. Thanks for explaining it.`, `Reordered with the brightening, and they're lovely. Mystery solved.`],
		ok: `Thanks for explaining the dark prints; I'll use the brightening next time.`,
		endWait: 'remake',
		follow: `Is there any chance you could reprint the dark ones for me? I had no idea the option was there.`,
		owe: `ask the print room whether they can reprint the dark ones with the brightening on, and let you know by {day}`,
		team: 'the print room',
		handover: `Customer says about half of the prints in order {order} are much darker than on the phone. Photos are HDR from a {phone}. Can you check the files against the prints and see whether anything went wrong on our side?`
	},
	{
		area: 'prints',
		weight: 2,
		stage: 'delivered',
		subjects: ['Heads cut off', 'Prints cropped wrongly', 'Tops of heads missing on my prints'],
		open: [
			`Nearly every print in my last order has been cropped. In the group photos from {subject} the tops of people's heads are missing, and on one my dad has lost half his face. The photos aren't like that on my phone at all.`,
			`Why have my prints been cut down? I uploaded {count} photos and most of them have bits missing at the top and bottom compared with the originals.`
		],
		quick: [`Do you print square photos?`, `Not as prints yet. A square photo goes onto a 6 x 4 print with white space on two sides if you choose "Fit whole photo", or cropped to fill the print if you don't.`],
		reply: `Sorry about the missing heads, that's not what anyone wants from a group photo. Could you tell me the order number, and the names of one or two of the photos that came out cropped? The file names are on the order page under each photo.`,
		turns: [
			[`It's order {order}. Two of the worst are {file} and {file2}.`, `Thanks, I've found both. Before I say anything for certain, could you tell me which phone you took them on? It changes the shape of the photo.`],
			[`A {phone}, just the normal camera.`, `Then I know what happened. Your phone takes photos in a 4:3 shape and our prints are 6 x 4 inches, which is 3:2, so a strip has to come off the top and bottom for the photo to fill the print. The order page showed dotted crop lines on each photo, and in the group shots the heads were right at the top, outside those lines. Nothing went wrong in the lab: the prints match the crop the order page showed.`, arts.crop],
			[`I honestly didn't notice any dotted lines.`, `You're not the first to say so; they're faint on a phone. You can move the crop by dragging the photo inside its frame, or choose "Fit whole photo" so nothing is cut and you get a thin white strip on two sides instead.`],
			[`Does "Fit whole photo" work for every photo in one go?`, `Yes. Choose it from the Options menu above the grid and it applies to every photo in the order. You can still set single photos back to fill.`]
		],
		need: 'to know which phone the photos were taken on',
		cause: `the photos are 4:3 and the 6 x 4 prints are 3:2, so they were cropped to the lines the order page showed, and the heads were outside them`,
		act: `order the cropped photos again with "Fit whole photo", or with the crop moved down`,
		fixed: [`Redid them with "Fit whole photo" and everyone has their heads back. The white strip is hardly noticeable.`, `The second batch is perfect. I dragged each one down a bit before ordering.`],
		ok: `Thanks for explaining the crop lines; I'll use "Fit whole photo" from now on.`,
		endWait: 'remake',
		follow: `Could you reprint the worst few for me? I really didn't see the lines.`,
		owe: `ask the print room whether they can reprint the worst few as a one-off, and get back to you by {day}`,
		team: 'the print room',
		handover: `Prints in order {order} cropped at top and bottom; customer says heads are missing. Looks like the standard 4:3 to 3:2 cut, but could you check that the prints match the crop that was approved?`
	},
	{
		area: 'prints',
		weight: 1,
		stage: 'delivered',
		item: 'Classic prints, pack of 50 (lustre)',
		phone: 'iphone',
		subjects: ['Prints missing from my pack', 'Only got {got} prints', 'Some photos not printed'],
		open: [
			`I've counted my pack twice and there are only {got} prints, not 50. The photos that are missing are the ones my sister sent me from her holiday.`,
			`Some of my photos haven't been printed. I chose 50 for the pack and I've got {got}, and there's no note in the box saying why.`
		],
		quick: [`Can I put the same photo in a pack twice?`, `Yes. On the order page, open the photo and set "Copies" to 2 or more. Each copy counts as one of the 50.`],
		reply: `Sorry, a short pack is annoying, especially when you've chosen the photos with care. Could you give me the order number, and tell me roughly which photos are missing?`,
		turns: [
			[`Order {order}. The missing ones are the {missing} photos my sister shared with me. Everything from my own camera is there.`, `Thanks, that's a useful clue. Could you tell me how you got your sister's photos onto your phone before you uploaded them? A shared album, a message, AirDrop?`],
			[`She put them in a shared album called "{album}" and I added them from there.`, `That's it. Photos added straight from a shared album on an iPhone sometimes reach us as a small preview rather than the full photo. Our system read the {missing} as too small to print, and instead of stopping the order it printed the rest and left those out. It should have emailed you about them; the email was sent, but to {oldemail}, which is the address still on your account.`, arts.uploadsShared],
			[`That's my old address! How do I change it?`, `Under Account, then Details, choose "Change email". We send a link to the new address, and once you click it, everything goes there.`],
			[`How do I get proper copies of the photos from the shared album?`, `Open each one in the shared album, tap Share, then "Save to Photos". That saves the full photo to your own camera roll, and from there it uploads at full size.`]
		],
		need: 'to know how the missing photos got onto your phone before you uploaded them',
		cause: `the {missing} photos came from a shared iPhone album as previews too small to print, so they were left out, and the email about it went to an old address`,
		act: `save the {missing} photos to your camera roll from the shared album, upload them again, and update the email address on your account`,
		fixed: [`Saved them properly, uploaded them again and the {missing} prints arrived this morning. The pack is complete now.`, `All sorted. The missing prints came and the email address is the right one now.`],
		ok: `Thanks for getting to the bottom of the missing prints; I've saved the photos properly now.`,
		endWait: 'remake',
		follow: `Will the missing {missing} be printed and sent to me? The pack was meant to have 50.`,
		owe: `have the {missing} missing prints made and posted once you've uploaded the full photos, and email you when they leave the lab`,
		team: 'the print room',
		handover: `Order {order} went out with {got} prints instead of 50. The missing ones came from a shared iPhone album. Can you tell me why they were left out and whether the customer was told?`
	},
	{
		area: 'prints',
		weight: 1,
		stage: 'delivered',
		subjects: ['Blurry prints', 'Prints are fuzzy', 'Quality of my photos'],
		open: [
			`The prints from my last order are blurry. Not all of them, but the ones of {subject} look as if they were taken through a steamed-up window. I've used you for years and never had this before.`,
			`I'm not happy with the quality of my latest prints. A lot of them are fuzzy and blocky, especially the faces. Has something changed in the lab?`
		],
		quick: [`Can I order prints bigger than 6 x 4?`, `Not as classic prints: those are all 6 x 4 inches. For something bigger, have a look at the A4 framed print and the A3 canvas.`],
		reply: `Sorry they've disappointed you, especially after so many good orders. Could you give me the order number and the names of two or three of the fuzzy photos?`,
		turns: [
			[`Order {order}. {file} and {file2} are the worst.`, `Thanks. Both of those are much smaller files than your other photos. Do you know where they came from? Were they sent to you by someone else?`],
			[`Yes, my brother sent them on WhatsApp after the trip.`, `That's the reason. WhatsApp shrinks photos a lot before it sends them, so the copies on your phone hold about a tenth of the detail of the originals. That's plenty for a phone screen but not for a print. The order page showed an amber triangle on those photos to warn that they might print soft, but it doesn't stop the order.`, arts.exif2],
			[`Can your lab sharpen them?`, `We can't put back detail that isn't in the file, I'm afraid. The originals on your brother's phone will print perfectly, though.`],
			[`What's the best way for him to send me the originals?`, `Ask him to share them from Google Photos or iCloud with a link, or to email them as attachments with "Actual size" chosen. Either keeps the full photo.`]
		],
		need: 'to know where the fuzzy photos came from',
		cause: `the fuzzy photos were copies sent on WhatsApp, which shrinks them, and the order page's low-quality warning didn't stop the order`,
		act: `get the original photos from your brother, upload them and order those ones again`,
		fixed: [`Got the originals from my brother, reordered, and they're pin sharp. Thanks for working out what it was.`, `The new prints from the originals are perfect. I'll never print from WhatsApp again.`],
		ok: `Thanks for working out the blurry ones; I've asked my brother for the originals.`,
		endWait: 'remake',
		follow: `Could the order page stop me next time, rather than just showing a little triangle?`,
		owe: `pass that on to the web team as a suggestion and tell you by {day} what they say`,
		team: 'the print room',
		handover: `Customer reports soft, blocky prints in order {order}. Files look small (WhatsApp copies?) but could you check the prints against the files and confirm the printers are fine?`
	},
	{
		area: 'prints',
		weight: 1,
		stage: 'delivered',
		item: 'Classic prints, pack of 50 (lustre)',
		subjects: ['Wrong finish', 'Asked for gloss, got lustre', 'Prints not glossy'],
		open: [
			`I specifically chose gloss for my prints and they've come on the satin-looking paper. I wanted them glossy for {person}'s {occasion}; that was the whole point.`,
			`My prints aren't glossy, and I'm sure I picked gloss. Can you check what went wrong?`
		],
		quick: [`Is anything written on the back of the prints?`, `Each print has a small Snapframe mark and your order number on the back, nothing else.`],
		reply: `Sorry about that. Could you send me the order number? Then I can see what the order said when it reached the lab.`,
		turns: [
			[`It's {order}.`, `Thanks. The order reached the lab with lustre, which is why the prints are on lustre paper. Could you tell me what you did after choosing gloss? For example, did you add or swap any photos before placing the order?`],
			[`Yes, I chose gloss first, then went back and added more photos.`, `That's what did it. When you go back and add photos, the order page currently puts the finish back to lustre without telling you. The web team know about it and are working on it. So the lab printed exactly what the order said, but the order page let you down.`, arts.orderlog],
			[`So if I order again, how do I make sure it sticks?`, `Choose the finish last, just before you place the order, and check it on the summary screen, where it says "Finish: Gloss".`],
			[`Can I have gloss on some prints and lustre on others in one pack?`, `Not in one pack at the moment; the finish is for the whole pack.`]
		],
		need: 'to know what happened between choosing gloss and placing the order',
		cause: `going back to add photos put the finish back to lustre, a fault on the order page that the web team know about`,
		act: `order again with gloss chosen last and checked on the summary screen`,
		fixed: [`Ordered again, chose gloss at the very end, and they've come out shiny. Perfect.`, `Second pack is glossy. Thanks for the tip about doing it last.`],
		ok: `Thanks for explaining the gloss problem; I'll choose the finish last from now on.`,
		endWait: 'remake',
		follow: `As the fault was on your side, could you reprint the pack on gloss for me?`,
		owe: `ask the print room to reprint the pack on gloss, and email you once it's on its way`,
		team: 'the web team',
		handover: `Order {order} arrived at the lab with lustre, but the customer chose gloss and then added photos. Looks like the finish reset. Can you confirm from the order log?`
	},
	{
		area: 'prints',
		weight: 1,
		stage: 'delivered',
		endWait: 'remake',
		subjects: ['These are not my photos', 'Wrong prints in my parcel', "Someone else's photos"],
		open: [
			`I've just opened my Snapframe parcel and the prints in it aren't mine. They're of a family I don't know, a wedding by the look of it. My photos of {subject} aren't there at all.`,
			`Your lab has sent me somebody else's prints. I'm worried, because it means someone else may have mine, and some of them are of my children.`
		],
		quick: [`Can I collect an order from the lab in Leeds?`, `Not at the moment, sorry. Every order goes out by courier, and we deliver to every UK address.`],
		reply: `I'm so sorry. That's a serious mistake, and I understand why you're worried about your own photos. Please don't post the prints back yet. Could you tell me the order number on the label of the parcel, and the order number printed on the back of one of the prints?`,
		turns: [
			[`The label says {order}. The back of the prints says {order2}.`, `Thank you, that's exactly what I needed. Your prints and the other customer's were packed on the same bench within a few minutes of each other. Could you keep their prints somewhere safe for now? I'm asking the lab to find out where yours went.`],
			[`Of course. Please tell me where mine are.`, `The lab has found them. The two packs were swapped at the packing bench, so the other customer received yours. We've reached them, they haven't shared or kept anything, and the courier is collecting your prints from them. Yours are being reprinted from your uploads as well, so you'll have a fresh set either way.`, arts.packing],
			[`What should I do with the other family's prints?`, `We'll email you a returns label today. Put the prints in any envelope, stick the label on and drop it at a post office or a parcel locker. Please don't keep copies of them.`],
			[`Will this happen again? I don't love the idea of strangers seeing my kids.`, `The lab manager has changed the packing bench so that a second person checks each pack against its label before it's sealed. I'm sorry it took your order to show the gap.`]
		],
		need: 'the order number printed on the back of one of the prints',
		cause: `two packs were swapped at the packing bench, so each customer got the other's prints`,
		act: `post the other customer's prints back with the returns label and let us know when they're on their way`,
		fixed: [`My reprinted pack came today and the other prints have gone back. Thank you for being so quick about it.`, `Got my prints, and the wrong ones are in the post back to you. Thanks for handling it properly.`],
		ok: `Thank you for being so quick about the swapped prints.`,
		follow: `Could you confirm in writing that the other family hasn't kept any copies of my photos?`,
		owe: `get that confirmation from the lab manager in writing and send it to you by {day}`,
		team: 'the lab manager',
		handover: `Prints swapped: the customer on order {order} received the prints of order {order2}. Customer's photos include children. Please find the other pack and arrange the swap.`
	},
	{
		area: 'framed',
		weight: 2,
		stage: 'delivered',
		endWait: 'remake',
		subjects: ['Frame arrived damaged', 'Cracked frame', 'Broken framed print'],
		open: [
			`My framed print arrived this morning and the front is cracked right across the corner. The box looked fine from the outside. It was a present for {person}'s {occasion} on {date}, so I'm a bit stuck.`,
			`The A4 frame I ordered has arrived with a crack across the clear front. The print itself looks fine but I can't give it to anyone like this.`
		],
		quick: [`Is the front of the frame glass?`, `No, it's shatterproof acrylic, which is lighter than glass and safer to post and hang.`],
		reply: `I'm sorry, that's not how it should arrive, and particularly not with a present to give. Could you send me a photo of the crack, and one of the box it came in?`,
		turns: [
			[`Photos attached: the crack, and the box from two sides.`, `Thank you. The crack is in the acrylic front, and the corner of the box is dented on the inside, which tells me it took a knock on the way. Could you tell me whether the courier left the box somewhere or handed it to you?`],
			[`It was left on the doorstep; I wasn't in.`, `Thanks. The courier's record shows it was left at your door at {time} and photographed there, and the dent lines up with the corner it's standing on in their photo. So it was damaged before it reached you. I've asked the frames workshop to make you a new one from the same photo, and it leaves the lab in 4 working days.`, arts.trackDoorstep],
			[`Will it get to me before {date}?`, `It should: it leaves the lab in 4 working days, and standard delivery takes 2 to 3 working days after that.`],
			[`What do I do with the broken one?`, `Please recycle the frame and the box, and keep the print if you like it. We don't need it back.`]
		],
		need: 'to know whether the courier left the parcel or handed it to you',
		cause: `the frame was knocked on its way to you, as the courier's own doorstep photo shows`,
		act: `reply with the frame colour you'd like for the new one, natural oak or black stain, so the workshop can start`,
		fixed: [`The new frame came yesterday, beautifully wrapped this time, and it's already on the wall. Thank you.`, `Replacement arrived in one piece. Thanks for sorting it so quickly.`],
		ok: `Thanks for arranging the new frame.`,
		follow: `Can the new one come in a stronger box?`,
		owe: `ask dispatch to send the new one in the reinforced frame box and confirm by {day}`,
		team: 'dispatch',
		handover: `Framed print from order {order} arrived with cracked acrylic. Left on the doorstep; box dented at one corner. Please raise it with the courier and arrange the replacement.`
	},
	{
		area: 'framed',
		weight: 1,
		stage: 'delivered',
		item: 'A4 framed print (black stain)',
		endWait: 'remake',
		subjects: ['Wrong frame colour', 'Ordered black, got oak', 'Frame is the wrong colour'],
		open: [
			`I ordered my framed print in black and it's come in the light oak. It's going in a room where everything else is black, so it really stands out.`,
			`The frame on my A4 print is the wrong colour. I chose black stain for the photo of {subject}, and the one that came is natural oak.`
		],
		quick: [`Can the frame hang landscape as well as portrait?`, `Yes. The frame has fixings on two sides, so you can hang it either way. The fixings are in the box.`],
		reply: `Sorry about that. Could you give me the order number, so I can see which colour the order asked for?`,
		turns: [
			[`It's {order}.`, `Thanks. The order says black stain, so the frame should have been black. Could you check the label on the back of the frame? It's a small sticker with a letter on it.`],
			[`The sticker says N.`, `Thanks, that settles it. N is natural oak, so the workshop picked the frame from the wrong rack. That's our mistake, and I've asked them to make it again in black. You don't need to send the oak one back.`, arts.picklist],
			[`Can I keep the oak one? It might suit my sister's flat.`, `Of course, it's yours to keep.`],
			[`When will the black one be ready?`, `Framed prints leave the lab in 4 working days, then standard delivery takes 2 to 3 working days.`]
		],
		need: 'the letter on the sticker on the back of the frame',
		cause: `the workshop picked a natural oak frame from the wrong rack for an order that asked for black stain`,
		act: `check that the photo and crop for the new frame are still right on your order page, and reply to confirm`,
		fixed: [`The black frame arrived and it's exactly right. The oak one is going to my sister.`, `Got the black one today. Thanks!`],
		ok: `Thanks for sorting out the frame colour.`,
		follow: `Could you make sure the workshop knows, so it doesn't happen to someone else?`,
		owe: `tell the workshop lead about the mix-up and let you know by {day} what they change`,
		team: 'the frames workshop',
		handover: `Order {order} asked for black stain; the frame sent was natural oak (sticker N). Please remake in black and check the racks.`
	},
	{
		area: 'framed',
		weight: 1,
		stage: 'delivered',
		subjects: ['No fixings in the box', 'How do I hang my frame?', 'Missing screws'],
		open: [
			`My framed print arrived but there's nothing in the box to hang it with. The website says it comes ready to hang, with the fixings in the box. I've been through all the paper twice.`,
			`How am I meant to hang this frame? There are no hooks or screws with it, just the frame in its sleeve.`
		],
		quick: [`Can I clean the front of the frame with glass cleaner?`, `Better not: use a soft dry cloth, or one that's barely damp. Glass cleaner can cloud the acrylic.`],
		reply: `Sorry, the fixings should definitely be there. Could you check the back of the frame itself? Sometimes the little bag is taped inside the backing board. If it isn't there, tell me which kind of wall it's going on, as the fixings differ.`,
		turns: [
			[`Nothing taped to the back. It's going on a plasterboard wall in the hall.`, `Thanks. Could you send me a photo of the back of the frame? I want to check whether the hanging plates are fitted, or whether those are missing too.`],
			[`Here's the back, photo attached.`, `Thanks. The hanging plates are fitted, so it's only the bag of screws and wall plugs that's missing. The packing bench ran out of them for part of a shift on {left}, and a few frames went out without one. That's our fault, and I've put a new fixings bag in the post to you.`, arts.qcFixings],
			[`Will the plugs work in plasterboard?`, `The bag has two plasterboard fixings and two ordinary plugs, so either kind of wall is covered.`],
			[`How heavy is the frame, roughly?`, `About a kilo, so the plasterboard fixings hold it easily.`]
		],
		need: 'a photo of the back of the frame',
		cause: `the packing bench ran out of fixings bags during part of a shift and the frame went out without one`,
		act: `look out for the fixings bag in the post and tell us if it hasn't arrived in three working days`,
		fixed: [`The fixings came today and the frame is up. Thanks.`, `Bag of screws arrived, frame is on the wall. All good.`],
		ok: `Thanks for posting the fixings.`,
		endWait: 'long',
		follow: `Could you send a second set as well? I have another of your frames from last year that lost its screws in the move.`,
		owe: `post a second fixings bag with the first and email you once both are on their way`,
		team: 'dispatch',
		handover: `Framed print from order {order} arrived without the fixings bag. Hanging plates are fitted. Please post a fixings bag.`
	},
	{
		area: 'framed',
		weight: 1,
		stage: 'delivered',
		endWait: 'remake',
		subjects: ['Mark on my framed print', 'Hair inside the frame', 'Speck under the front'],
		open: [
			`There's a hair trapped under the front of my framed print, right across {person}'s face. I can't get at it from outside.`,
			`My new frame has a little speck of something under the clear front, and once you've seen it you can't stop seeing it.`
		],
		quick: [`Can I take the print out of the frame?`, `You can: the backing board has four turn clips. For a trapped speck we'd rather you didn't, though, as it's easy to scratch the acrylic.`],
		reply: `Sorry, that's annoying on a print you've chosen with care. Could you send me a close photo of the mark, ideally with the frame tilted towards the light?`,
		turns: [
			[`Photo attached.`, `Thanks. It looks like a fibre under the acrylic rather than something printed on the photo, but I'd like to be sure. Could you send one more photo straight on, without the tilt?`],
			[`Here's one straight on, attached.`, `That's clearly a fibre between the print and the acrylic: it casts a tiny shadow in the tilted photo and disappears straight on. It got in at the workshop when the frame was put together, and the light table check wasn't recorded for your frame. I've asked them to make it again and check it before it goes.`, arts.qcFibre],
			[`Do I need to send the first one back?`, `No, keep it or recycle it, whichever you prefer.`],
			[`Could the new one be black instead of oak?`, `Yes, I've changed the remake to black stain.`]
		],
		need: 'a photo of the mark straight on',
		cause: `a fibre got trapped between the print and the acrylic when the frame was put together`,
		act: `confirm whether the new frame should be natural oak or black stain`,
		fixed: [`New frame arrived and it's spotless. Thanks.`, `Perfect this time, not a speck. Thank you.`],
		ok: `Thanks for arranging the remake of the frame.`,
		follow: `Could the remake have the photo a touch lighter? It looked a little dark under the acrylic.`,
		owe: `ask the frames workshop whether they can lighten the photo a touch on the remake, and tell you by {day}`,
		team: 'the frames workshop',
		handover: `Fibre trapped under the acrylic of the framed print in order {order}. Customer's photos are on the ticket. Please remake and check under the light table.`
	},
	{
		area: 'framed',
		weight: 1,
		stage: 'hold',
		subjects: ['Order on hold?', 'Why has my order not been printed', 'Email about permission for my photo'],
		open: [
			`I got an email saying my framed print order is on hold because the photo might belong to a professional photographer. It's our wedding photo! Of course it's ours.`,
			`My order has been stuck "on hold" since {placed}. The email says something about copyright. I just want a frame of my own wedding photo.`
		],
		quick: [`Can you print a photo I've taken of an old printed photo?`, `Yes, as long as the copy is sharp. A photo taken in daylight, straight on and without glare prints well.`],
		reply: `Congratulations on the wedding, and sorry for the hold. The lab holds an order when a photo has a studio's name or watermark on it, because we can only print a professional's photo with the photographer's permission. Could you tell me who took the photo?`,
		turns: [
			[`Our photographer was {studio}. We have all the photos on a USB stick from them.`, `Thanks. Most wedding photographers give couples permission to print their photos for themselves, and it's usually in the contract or on a note with the USB stick. Could you have a look for anything like that?`],
			[`Found it: the contract says we can print them for personal use.`, `That's all we need. Could you send me a photo or scan of that page? I'll attach it to the order and the lab releases it the same day.`, arts.hold],
			[`Do I need to do this for every order with their photos?`, `No. Once it's on your account, the lab sees it on every order with photos from {studio}.`],
			[`Will the hold make it late?`, `Framed prints leave the lab 4 working days after the hold is released, then standard delivery takes 2 to 3 working days.`]
		],
		need: 'a copy of anything from the photographer that says you may print the photos',
		cause: `the lab held the order because the photo carries the {studio} watermark, and prints of a professional's photos need the photographer's permission`,
		act: `send us a photo or scan of the page of the contract that lets you print the photos`,
		fixed: [`Sent the contract page, the order was released and the frame arrived today. It looks stunning.`, `All released and delivered. Thanks for being so helpful about it.`],
		ok: `Thanks for sorting out the hold on the frame.`,
		endWait: 'remake',
		follow: `Could you check whether my other order, a canvas from the same wedding, will be held too?`,
		owe: `check your canvas order with the lab and tell you by {day} whether it's clear`,
		team: 'the lab manager',
		handover: `Order {order} on hold for a professional photo check: {studio} watermark on a wedding photo. Customer says they have the photographer's permission. Please review the hold.`
	},
	{
		area: 'canvas',
		weight: 2,
		stage: 'delivered',
		item: 'A3 canvas print (image wrap)',
		subjects: ['Faces on the side of my canvas', 'Canvas edges wrong', 'Disappointed with my canvas'],
		open: [
			`My canvas has arrived and two of the people in the photo are half round the side of it. From the front you only see half of each of them. It's {subject} and I was really looking forward to it.`,
			`The picture on my canvas goes round the edges, so the people at the ends of the group are on the sides. I didn't expect that at all.`
		],
		quick: [`Is the wood in the canvas frame sustainable?`, `The frame is pine from FSC-certified wood, and the canvas is stretched over it by hand in our lab.`],
		reply: `Sorry it isn't what you pictured. Could you tell me the order number? I'd like to see which edge option the order had.`,
		turns: [
			[`It's {order}.`, `Thanks. The order has "image wrap", which takes the outer 3 cm of the photo round the sides of the frame. In a group photo where people stand right to the edge, they end up on the sides. Could you tell me whether you saw the preview with the edges shaded?`],
			[`I saw some shading but I thought it was a border effect.`, `That's fair; the shading is easy to read as decoration. The preview was right, though: everything in the shaded strip goes round the side. For a photo like yours, white or black edges keep the whole photo on the front, and the sides are plain.`, arts.canvasPreview],
			[`If I go for white edges, does the photo get smaller?`, `The whole photo fits on the front, so it's a little smaller than with wrap, but nothing is cut off.`],
			[`Which do people usually pick, white or black?`, `About half and half. White looks light and modern; black suits darker photos and darker rooms.`]
		],
		need: 'to know whether the preview showed the edges shaded',
		cause: `the order used image wrap, which takes the outer 3 cm of the photo round the sides, and the people at the ends were in that strip`,
		act: `order the canvas again with white or black edges`,
		fixed: [`Reordered with white edges and the whole group is on the front. It's on the wall now.`, `Black edges this time, and it's perfect. Thanks for explaining the shading.`],
		ok: `Thanks for explaining the edges on the canvas; I'll go for white next time.`,
		endWait: 'remake',
		follow: `Could the preview make it clearer? Lots of people must miss it.`,
		owe: `send your point to the web team with your order as an example, and tell you by {day} what they say`,
		team: 'the frames workshop',
		handover: `Customer unhappy with image wrap on the canvas in order {order}: people at the ends are on the sides. Preview shading looks right, but could you check the stretch matched the preview?`
	},
	{
		area: 'canvas',
		weight: 1,
		stage: 'delivered',
		endWait: 'remake',
		subjects: ['Canvas is loose', 'Saggy canvas', 'Problem with the corner of my canvas'],
		open: [
			`The canvas I got last week has gone slack in the middle. When I tap it, it sounds like a drum with a hole in it, and there's a ripple across the bottom.`,
			`One corner of my canvas has come away from the frame and the canvas is loose. It's only been on the wall a few days.`
		],
		quick: [`Can I hang a canvas in a bathroom?`, `We wouldn't: steam can loosen the canvas over time. A hallway or living room is best.`],
		reply: `Sorry, a canvas should be tight from edge to edge. Could you send me photos of the front from the side, so the ripple shows, and of the back corner?`,
		turns: [
			[`Photos attached, the front at an angle and the back.`, `Thanks. Could you also tell me where it's hanging? Near a radiator, a window or in a damp room?`],
			[`Above the radiator in the living room.`, `Thanks. Heat from below does dry the frame a little, but not enough for what I'm seeing. In your photo of the back, two of the staples in the corner have missed the wood, so the canvas wasn't held properly at that corner from the start. That's a stretching fault in the workshop, and I've asked them to make you a new one.`, arts.qcStaples],
			[`Should I move it away from the radiator?`, `If you can, yes. It won't harm it quickly, but a canvas lasts longest away from direct heat.`],
			[`Do I need to send the old one back?`, `No, we don't need it.`]
		],
		need: 'to know where the canvas is hanging',
		cause: `two staples at one corner missed the wood when the canvas was stretched, so it was never held properly`,
		act: `confirm the edge option for the new canvas, and whether it should go to the same address`,
		fixed: [`The new canvas is drum-tight and hanging on a different wall. Thanks.`, `Replacement arrived and it's perfect.`],
		ok: `Thanks for arranging the new canvas.`,
		follow: `Could the new one go to my parents' address instead? It was a present for them.`,
		owe: `change the delivery address on the remake to your parents' and send you the tracking link once it leaves the lab`,
		team: 'the frames workshop',
		handover: `Canvas from order {order} has gone slack; two staples at one corner missed the frame. Please remake.`
	},
	{
		area: 'canvas',
		weight: 1,
		stage: 'delivered',
		endWait: 'remake',
		subjects: ['Canvas colours dull', 'Canvas looks faded', 'Colours not as bright as my prints'],
		open: [
			`I ordered prints and a canvas of the same photo of {subject}, and the canvas looks washed out next to the prints. The blues are grey and the whole thing looks flat.`,
			`Is the canvas meant to look this dull? The photo is very bright and colourful and the canvas looks as if it's been in the sun for a year.`
		],
		quick: [`Can I wipe the canvas if it gets dusty?`, `Yes, with a soft dry cloth or a feather duster. Don't use water on it.`],
		reply: `Sorry it's not as bright as you hoped. Could you send me a photo of the canvas next to one of the prints, in daylight?`,
		turns: [
			[`Here's the canvas and the print side by side by the window, attached.`, `Thanks. Some of that is the canvas itself: it's a textured cotton-blend with a matt surface, so colours always look softer than on lustre paper. But this looks flatter than I'd expect. Could you tell me the order number so I can check the print log?`],
			[`It's {order}.`, `Thanks. The log shows your canvas went through printer 2 on {printed}, and that afternoon the print room found that printer's blue ink was running low and recalibrated it. A few canvases from before the fix came out flat, yours among them. I've asked for it to be printed and stretched again.`, arts.printlog],
			[`Will the new one look like the prints?`, `Closer, yes, but still a little softer, because of the matt canvas. It won't look flat.`],
			[`Could the new one have black edges?`, `Yes, I've noted black edges on the remake.`]
		],
		need: 'the order number, to check the print log',
		cause: `the canvas was printed before printer 2 was recalibrated for low blue ink, so it came out flat`,
		act: `tell us whether the new canvas should keep the same edges as the first`,
		fixed: [`The new canvas is much richer. Thanks for checking the log.`, `Second canvas looks great, properly blue sky this time.`],
		ok: `Thanks for checking the print log on the canvas.`,
		follow: `Could you check whether my sister's canvas from the same week is affected? She ordered on her own account.`,
		owe: `check your sister's order against the print log once she's sent me the order number, and write to you both by {day}`,
		team: 'the print room',
		handover: `Canvas from order {order} looks flat next to the prints of the same photo. Printed on printer 2 on {printed}. Please check the calibration log and remake if affected.`
	},
	{
		area: 'book',
		weight: 2,
		stage: 'none',
		subjects: ['More pages?', 'Photo book page limit', 'Can I add pages to my book'],
		open: [
			`I'm making a photo book of {subject} and I've run out of pages at 20. I have far more photos than that. Is there a way to add more pages?`,
			`Is the photo book really only 20 pages? I'm trying to fit a year of {subject} into it and it won't let me add page 21.`
		],
		quick: [`What size is the photo book?`, `21 x 21 cm, square, with a hard cover and lay-flat pages.`],
		reply: `Thanks for asking. Extra pages aren't available yet, so every book has 20 pages. There are ways to fit more photos in, though. How many photos are you hoping to include, roughly?`,
		turns: [
			[`About {big} photos.`, `Thanks. With one photo a page you'd need far more than 20 pages, but the editor has layouts with two, four and six photos a page. Could you tell me whether you're using the editor on the website or in the app? The layouts are in different places.`],
			[`The website, on my laptop.`, `Then click any page, choose Layout at the top, and pick a grid. Six photos a page over 20 pages is 120 photos, and many people make two books, volume one and volume two, when a year won't fit in one.`, arts.bookLayouts],
			[`Will the small photos look all right in print?`, `At six a page each photo is about 7 cm across, which looks good if the photo is sharp. The editor warns you on any photo that's too small.`],
			[`Can I copy the book so the second one has the same cover?`, `Yes: on the Projects page, open the menu on the book and choose Duplicate. Then swap the photos inside.`]
		],
		need: 'to know whether you\'re using the editor on the website or in the app',
		cause: `photo books have 20 pages and extra pages aren't available yet, so the photos need multi-photo layouts or a second book`,
		act: `use the multi-photo layouts, or split the photos into two books with Duplicate`,
		fixed: [`Went with four a page and a second book for the summer. Both look lovely in the preview and they're ordered.`, `Six-photo grids did it, nearly everything is in. Thanks.`],
		follow: `Will there be more pages one day? I'd rather have one thick book.`,
		owe: `add your vote to the request for more pages and write to you if anything changes`,
		team: 'the bindery',
		handover: `Customer wants a photo book of more than 20 pages. Explained layouts and a second book. Could you note the request for extra pages?`,
		noTeamFix: true,
		outcomes: ['resolved', 'resolved', 'owe', 'act', 'quiet']
	},
	{
		area: 'book',
		weight: 1,
		stage: 'delivered',
		subjects: ['Pages in the wrong order', 'Photo book mixed up', "Book not in the order I made it"],
		open: [
			`My photo book has come and the pages are all over the place. I put it together in date order from {subject}, and the printed book jumps around.`,
			`Half the pages in my photo book are in the wrong order. Did the bindery put it together wrongly?`
		],
		quick: [`Can I put text on the cover?`, `Yes: click the cover in the editor and choose "Add title". You can add a line on the spine too.`],
		reply: `Sorry, that's frustrating after all the time you put into it. Could you give me the order number, and tell me one page that's in the wrong place?`,
		turns: [
			[`It's {order}. Page 7 should be page 15, for example: it's the last day of the trip.`, `Thanks. Could you open the book in your Projects and tell me what order the editor shows now? I'd like to know whether the book looks the same there as the printed one.`],
			[`Oh. The editor shows the same jumbled order as the printed book.`, `Then the bindery printed exactly what the project held. What happened is that the editor's Auto-arrange was switched on, and when you added your last photos it sorted the pages by the date stored in each photo. Some of yours came from a camera with its clock set wrongly, so they jumped to other places.`, arts.bookOrder],
			[`How do I stop that happening?`, `Switch off Auto-arrange in the editor's View menu before you move pages by hand. Then nothing moves unless you move it.`],
			[`Should I fix the dates on the photos?`, `You don't need to: with Auto-arrange off, the dates don't matter.`]
		],
		need: 'to know what page order the editor shows now',
		cause: `Auto-arrange was on and sorted the pages by the dates stored in the photos, some of which came from a camera with its clock wrong`,
		act: `switch off Auto-arrange, put the pages back in order and order the book again`,
		fixed: [`Turned Auto-arrange off, sorted the pages and the new book is right. Thanks.`, `Second book is in the right order. That setting is now off for good.`],
		ok: `Thanks for the tip about Auto-arrange.`,
		endWait: 'remake',
		follow: `As the editor moved them without asking, could the book be reprinted for me?`,
		owe: `ask the bindery whether they can reprint it once you've put the pages back, and tell you by {day}`,
		team: 'the bindery',
		handover: `Photo book in order {order} printed with pages out of order. The project shows the same order, so likely Auto-arrange. Could you confirm the book matched the project file?`
	},
	{
		area: 'book',
		weight: 1,
		stage: 'delivered',
		subjects: ['Spelling mistake in my book', 'Typo in photo book', 'Book has a mistake'],
		open: [
			`I've just spotted a spelling mistake in my photo book, on the page with the most important photo. I'm mortified, it's a present for {person}.`,
			`There's a typo in my photo book, in the caption on page {page}. Is there anything you can do?`
		],
		quick: [`Can I order a second copy of the same book?`, `Yes: open the book in Projects and order it again. It prints from the same pages.`],
		reply: `Oh no, sorry. Could you give me the order number and the page, and tell me how the caption should read?`,
		turns: [
			[`It's {order}, page {page}. It says "{wrong}" and should say "{right}".`, `Thanks. I've looked at the project, and the caption there says "{wrong}" as well. Could you tell me whether you went through the preview screen before ordering? It shows every page.`],
			[`I did look at the preview, but I must have missed it.`, `That's easy to do with small text. The book printed what the project held, so it isn't a fault in the bindery, but you can fix the caption in the editor and order the book again; the rest of the book stays as it is.`, arts.bookText],
			[`Is there a spell check in the editor?`, `There is: it underlines words it doesn't know in red. Names often slip through because they aren't in its dictionary.`],
			[`How long would a new book take?`, `Photo books leave the lab in 5 working days, then standard delivery takes 2 to 3 working days.`]
		],
		need: 'to know whether you went through the preview screen before ordering',
		cause: `the caption was misspelt in the project itself and the book printed what the project held`,
		act: `correct the caption in the editor and order the book again`,
		fixed: [`Corrected and reordered, and the new book is perfect. Phew.`, `New copy arrived with the right spelling. Thank you.`],
		ok: `Thanks for checking the caption in my book; I'll fix it in the editor.`,
		endWait: 'remake',
		follow: `Could the new one go straight to {person}? I won't see them before {date}.`,
		owe: `make sure the new book goes straight to {person} once you've ordered it, and send you the tracking link when it leaves the lab`,
		team: 'the bindery',
		handover: `Typo in the photo book in order {order}, page {page}. The preview was approved. Could you check whether anything can be done at the bindery?`,
		noTeamFix: true,
		outcomes: ['resolved', 'owe', 'owe', 'act', 'act', 'quiet']
	},
	{
		area: 'book',
		weight: 1,
		stage: 'delivered',
		endWait: 'remake',
		subjects: ['Book falling apart', 'Pages coming loose', 'Photo book binding'],
		open: [
			`The photo book I got from you is coming apart at the spine. Two pages are loose already, and we've only looked through it a few times.`,
			`The binding on my photo book has cracked and the middle pages have come away. Not what I expected from a hard cover.`
		],
		quick: [`Are the pages of the book glossy?`, `They're 170 gsm silk paper, which has a soft sheen rather than a full gloss.`],
		reply: `I'm sorry, a book should take far more than a few looks. Could you send me photos of the spine and the loose pages?`,
		turns: [
			[`Photos attached.`, `Thanks. Could you also tell me the order number? I'd like to check which day it was bound.`],
			[`{order}.`, `Thanks. Your book was bound on {printed}. The bindery found that the glue on that morning's first run hadn't reached temperature, and they've been remaking the books from it as customers get in touch. Yours is one of them, so I've asked for a new one.`, arts.bindery],
			[`Will the new one be exactly the same?`, `Yes, it prints from the same project, so every page is the same.`],
			[`Should I keep the loose one?`, `Keep it, recycle it, whatever you like. We don't need it back.`]
		],
		need: 'the order number',
		cause: `the book was bound on a morning when the glue hadn't reached temperature`,
		act: `check that the project in your account is the version you want printed, and reply to confirm`,
		fixed: [`The new book is solid, opens flat and nothing has moved. Thanks.`, `Replacement arrived and it's lovely.`],
		ok: `Thanks for arranging the new book.`,
		follow: `Were others from that day affected? My friend ordered one the same week.`,
		owe: `check your friend's order with the bindery once you send me her order number, and write back by {day}`,
		team: 'the bindery',
		handover: `Photo book from order {order} coming apart at the spine after a few looks. Bound {printed}. Please check against the glue fault and remake.`
	},
	{
		area: 'book',
		weight: 1,
		stage: 'delivered',
		subjects: ['Cover photo cut off', 'Title on the spine', 'Problem with my book cover'],
		open: [
			`The cover of my photo book has the photo split across the spine, so {person}'s face is half on the front and half on the back. In the editor it looked fine.`,
			`The title on my book cover isn't where I put it: it's partly round the edge.`
		],
		quick: [`Can I see a book before ordering one?`, `We can't post samples, but the editor's preview shows every page and the cover as they'll print.`],
		reply: `Sorry about the cover. Could you give me the order number, and a photo of the cover laid open flat?`,
		turns: [
			[`Order {order}. Photo of the open cover attached.`, `Thanks. The cover in the editor is one long sheet across the front, spine and back. Could you tell me whether you placed the photo on the whole sheet or on the front panel only?`],
			[`I dragged it onto the whole cover.`, `That explains it. On the whole sheet, the middle of the photo sits on the spine and the edges wrap round the board, about 1.5 cm on each side. The editor shows the spine and the wrap as grey lines, which are hard to see. The bindery printed it as placed.`, arts.coverLayout],
			[`So how do I put a photo on just the front?`, `Click the front panel and choose "Front only". The photo then fills the front and the spine takes a plain colour.`],
			[`Can the spine have text?`, `Yes, up to 30 characters, from the spine's own menu.`]
		],
		need: 'to know whether the photo went on the whole cover sheet or on the front panel only',
		cause: `the cover photo was placed across the whole sheet, so its middle sat on the spine and its edges wrapped round the board`,
		act: `move the cover photo onto the front panel only and order the book again`,
		fixed: [`Moved the photo to the front only and the new book looks right.`, `New cover is perfect, face and all.`],
		ok: `Thanks for explaining the cover layout.`,
		endWait: 'remake',
		follow: `Could the editor warn people when a face lands on the spine?`,
		owe: `pass that on to the web team with your book as the example and tell you by {day} what they say`,
		team: 'the bindery',
		handover: `Cover photo on the book in order {order} split across the spine. Probably placed on the full sheet. Could you check the cover file?`
	},
	{
		area: 'mug',
		weight: 2,
		stage: 'delivered',
		endWait: 'remake',
		subjects: ['Mug has faded', 'Photo on mug washed off', 'Dishwasher safe?'],
		open: [
			`The photo on the mug I got has faded badly after a few weeks. It says dishwasher safe, and that's all we've done with it.`,
			`My mug's picture is coming off. It's gone pale on one side and there's a patch near the handle where it's almost gone.`
		],
		quick: [`Can the mug go in the microwave?`, `Yes, it's plain white ceramic with no metal, so it's fine in the microwave.`],
		reply: `Sorry, that shouldn't happen after a few weeks. Could you send me a photo of the mug, and tell me the order number?`,
		turns: [
			[`Order {order}, photo attached.`, `Thanks. Could you tell me roughly how many times it's been through the dishwasher, and on which programme?`],
			[`Most days, on the eco programme.`, `Thanks. That's well within what it should take. Your mug was pressed on {printed}, and the print room found that one press ran cooler than set that afternoon, so the coating on some mugs didn't cure fully. Yours is one of those, so I've asked for a new one.`, arts.pressLog],
			[`Will the new one fade too?`, `It shouldn't. The press has been repaired, and every press is now checked with a test mug at the start of each shift.`],
			[`Could the new one have the panorama design instead?`, `Yes, I'll change the design on the remake if you send me the photo you'd like.`]
		],
		need: 'to know how often the mug has been washed, and on which programme',
		cause: `the mug was pressed on an afternoon when one press ran cooler than set, so its coating didn't cure fully`,
		act: `upload the photo you'd like on the new mug and tell me its name`,
		fixed: [`The new mug has been through the dishwasher a dozen times and still looks new.`, `Replacement arrived and it's perfect.`],
		ok: `Thanks for arranging a new mug.`,
		follow: `I gave three of these mugs as presents the same week. Will theirs fade as well?`,
		owe: `check the other mugs from that order against the press log and write to you by {day}`,
		team: 'the print room',
		handover: `Mug from order {order} faded after a few weeks on eco. Pressed {printed}. Please check against the cool press that day and remake.`
	},
	{
		area: 'mug',
		weight: 1,
		stage: 'delivered',
		item: 'Photo mug (panorama)',
		subjects: ['Mug design wrong', 'Handle in the middle of the photo', 'Panorama mug'],
		open: [
			`My panorama mug has the handle right over {person}'s face. The join in the photo is in the middle of the group.`,
			`The photo on my mug is in the wrong place: the handle sits over the best part of the picture.`
		],
		quick: [`Can I put two different photos on a mug?`, `Yes: choose the "Two photos" layout and you get one on each side of the handle.`],
		reply: `Sorry about that. Could you give me the order number? I'd like to see the design as it was saved.`,
		turns: [
			[`It's {order}.`, `Thanks, I can see the design. Could you tell me whether you moved the photo along in the mug preview, or left it where it landed?`],
			[`I left it where it was.`, `Thanks. With the panorama layout, the ends of the photo meet behind the handle, and the preview shows that part greyed out. Your photo was wider than the mug, so the editor centred it, and the middle of the group ended up at the handle. The mug was pressed as designed. Dragging the photo along in the preview moves the join.`, arts.mugLayout],
			[`Is there a way to see where the handle will be?`, `Yes: the preview has a small handle icon at the top, and the greyed strip below it is what the handle covers.`],
			[`Would a one-photo mug avoid the problem?`, `Yes: with one photo, it sits on the side away from the handle.`]
		],
		need: 'to know whether you moved the photo in the mug preview',
		cause: `the panorama photo was centred automatically and the middle of the group landed behind the handle, as the greyed strip in the preview showed`,
		act: `drag the photo along in the preview so the join sits between people, and order the mug again`,
		fixed: [`Moved the join to the edge of the sea and the new mug looks great.`, `Second mug is right, everyone's face is clear.`],
		ok: `Thanks for explaining the handle strip on the mug.`,
		endWait: 'remake',
		follow: `Could you do the new mug for me, as I didn't know about the handle strip?`,
		owe: `ask the print room whether they can press a new one as a one-off and let you know by {day}`,
		team: 'the print room',
		handover: `Panorama mug in order {order}: handle over the middle of the photo. Design was auto-centred. Could you check the press matched the design?`
	},
	{
		area: 'mug',
		weight: 1,
		stage: 'delivered',
		endWait: 'remake',
		subjects: ['Mug arrived broken', 'Handle snapped off', 'Smashed mug'],
		open: [
			`My mug arrived in pieces. The handle's snapped clean off and there's a crack down the side. The box rattled when the courier handed it over.`,
			`I've opened my order and the mug is chipped at the rim and cracked. I can't use it.`
		],
		quick: [`Can I order a mug with just text and no photo?`, `Not yet: every mug needs a photo. A plain photo with your text added in the editor works well.`],
		reply: `Sorry, that's a sad thing to open. Could you send me photos of the mug and of the box it came in?`,
		turns: [
			[`Photos attached.`, `Thank you. Could you tell me whether the box was damaged on the outside, or only the mug inside?`],
			[`The box has a big dent at one end.`, `Thanks, that fits the courier's scans: the parcel went through the {depot} depot, where it was scanned as damaged on arrival. So it broke on the way. I've asked the print room to press you a new one, and dispatch are taking it up with the courier.`, arts.trackDamaged],
			[`Do you want the broken one back?`, `No, please recycle it carefully.`],
			[`Can the new one be wrapped better?`, `I've asked dispatch to put it in the double-walled mug box this time.`]
		],
		need: 'to know whether the box was damaged on the outside',
		cause: `the parcel was damaged at the {depot} depot on its way to you`,
		act: `confirm that the photo for the new mug is the same as before, or send a new one`,
		fixed: [`New mug arrived in one piece. Thanks.`, `Replacement is perfect, thanks for the quick turnaround.`],
		ok: `Thanks for arranging the new mug.`,
		follow: `Could you send the new one to my work address? I'm not home in the day.`,
		owe: `change the address on the new mug to your work and email you the tracking link when it leaves`,
		team: 'dispatch',
		handover: `Mug from order {order} arrived broken; courier scanned it as damaged at {depot}. Please claim and send a replacement.`
	},
	{
		area: 'delivery',
		weight: 2,
		stage: 'delivered',
		subjects: ['Order says delivered but nothing came', 'Parcel not received', 'Where is my parcel?'],
		open: [
			`My tracking says my parcel was delivered on {delivered} at {time}, but nothing came. I was in all day. Nothing in the porch, nothing with the neighbours.`,
			`Tracking shows delivered but I haven't got anything. It's {person}'s {occasion} on {date} so I really need it.`
		],
		quick: [`Can I add a note for the courier for next time?`, `Yes: under Account, Addresses, each address has a "Notes for the courier" box, which goes on the label.`],
		reply: `Sorry, that's worrying. Could you look at the courier's delivery photo from the tracking link? It usually shows where the parcel was left.`,
		turns: [
			[`There's a photo of a parcel by a green door. My door is grey.`, `Thanks, that's useful. Could you tell me whether any of the houses near you has a green door?`],
			[`Yes, {neighbour} across the road.`, `Then the courier left it at the wrong house. I've asked dispatch to put a trace on it with the courier, and in the meantime could you knock across the road? The courier's GPS puts the drop {meters} metres from your address.`, arts.trackWrongDoor],
			[`I'll try this evening.`, `Thanks. If it isn't there, we'll reprint the order from your uploads, so you're not left without it.`],
			[`Could a reprint come any quicker?`, `It goes back through the lab like a new order, so it leaves in the usual time, and standard delivery takes 2 to 3 working days after that.`]
		],
		need: 'to know whether a house near you has a green door',
		cause: `the courier left the parcel at a house across the road, as their own photo and GPS show`,
		act: `ask at the house with the green door, and tell us whether the parcel is there`,
		fixed: [`It was across the road! The neighbour had it on the hall table. All good.`, `Found it two doors down. Thanks for spotting the door.`],
		follow: `Could the courier be told not to leave things on doorsteps on my street?`,
		owe: `add a note to your address so the courier hands the parcel over or takes it back, and confirm by {day}`,
		team: 'dispatch',
		handover: `Order {order} shows delivered but the customer has nothing. Courier's photo shows a different door. Please trace with the courier.`
	},
	{
		area: 'delivery',
		weight: 1,
		stage: 'lab',
		mixed: true,
		alone: true,
		subjects: ['Express delivery late', 'Chose express, still waiting', 'Order not here yet'],
		open: [
			`I chose express delivery on {placed} so the order would come the next day, and it still hasn't even left your lab. What's the point of express?`,
			`My order was meant to be express and it's been days. I need it for {date}.`
		],
		quick: [`Do you deliver to Northern Ireland?`, `Yes, to every UK address, including Northern Ireland, the Highlands and Islands and the Channel Islands.`],
		reply: `Sorry for the confusion and the wait. Could you give me the order number, so I can see where it is?`,
		turns: [
			[`It's {order}.`, `Thanks. Your order has a {slow} in it, which takes {slowdays} working days in the lab, and an order leaves when everything in it is ready. Could you tell me whether you need the whole order by {date}, or just part of it?`],
			[`Mainly the {fast}, if I'm honest.`, `That makes sense. Express means the order arrives the working day after it leaves the lab, instead of 2 to 3 working days with standard; it doesn't shorten the time in the lab. Your order leaves on {left}, so express brings it on {arrives}.`, arts.timeline],
			[`Can the {fast} come separately, ahead of the rest?`, `Not from inside one order, I'm afraid: an order is packed together. Next time, two separate orders would let the quicker item go first.`],
			[`So it will definitely arrive on {arrives}?`, `That's what the lab and the courier are both showing. I'll keep an eye on it.`]
		],
		need: 'to know whether you need the whole order by then, or only part of it',
		cause: `the order holds a {slow}, which takes {slowdays} working days in the lab, and express counts from when the order leaves the lab`,
		act: `look out for the tracking email when the order leaves on {left}`,
		fixed: [`Arrived this morning, as you said. Thanks for explaining it.`, `Got it today, in time. Thanks.`],
		ok: `Thanks for explaining how express works.`,
		endWait: 'long',
		follow: `Could the website say that express counts from when it leaves the lab? I really didn't get that.`,
		owe: `pass that to the web team for the delivery page and tell you by {day} what they say`,
		team: 'dispatch',
		handover: `Customer on order {order} expected express to mean next day from ordering; the order holds a {slow}. Please confirm it leaves on {left} and goes express.`
	},
	{
		area: 'delivery',
		weight: 1,
		stage: 'lab',
		alone: true,
		subjects: ['Wrong address on my order', 'Order going to my old house', 'Change delivery address'],
		open: [
			`I've just realised my order is going to my old address. I moved in {month} and the account still had the old one. Can you change it?`,
			`Help, I've sent my order to the wrong address! The confirmation shows my old flat in {town2}.`
		],
		quick: [`Can I save two addresses on my account?`, `Yes, as many as you like, under Account, Addresses. You choose one for each order.`],
		reply: `No problem, it happens a lot after a move. Could you give me the order number and the new address?`,
		turns: [
			[`Order {order}. The new address is {street}, {town} {pc}.`, `Thanks. Your order is still in the lab, so I can change it before it's packed. Could you confirm the name on the door should be {full}?`],
			[`Yes, that's right.`, `Done: the label will print with {street}, {town} {pc}. The lab packs your order on {left}, and the tracking email goes to you then.`, arts.addressChange],
			[`Will my account keep the old address as the default?`, `It will until you change it. Under Account, Addresses, set the new one as default and delete the old one.`],
			[`Can I check the address myself next time before it goes?`, `Yes: until the order is packed, the order page has "Change delivery address" under the order summary.`]
		],
		need: 'you to confirm the name on the door at the new address',
		cause: `the account still held the old address as its default when the order was placed`,
		act: `set the new address as the default on your account and delete the old one`,
		fixed: [`Parcel arrived at the new house. Thanks!`, `All here, at the right address. Brilliant.`],
		ok: `Thanks for changing the address on that order.`,
		endWait: 'long',
		follow: `Could you also check my other order from last month? I think that went to the old address too.`,
		owe: `look up your other order and tell you by {day} where it was delivered`,
		team: 'dispatch',
		handover: `Order {order} needs its delivery address changed to {street}, {town} {pc}. Please update before packing.`
	},
	{
		area: 'delivery',
		weight: 1,
		stage: 'none',
		alone: true,
		subjects: ['Will it arrive in time?', 'Delivery question', 'Need it by {dateWord}'],
		open: [
			`I want to order a {slow} as a present for {gift}. Will it arrive in time if I order it this week?`,
			`What's the latest I can order a {slow} and still have it by {dateWord}? It's going to {gtown}.`
		],
		quick: [`Can you deliver to a different address from mine?`, `Yes: choose or add any UK address for each order, and the parcel goes there.`],
		reply: `Lovely idea. Could you tell me which day you're planning to order, and whether anything else will go in the same order? An order leaves the lab when everything in it is ready.`,
		turns: [
			[`I'll order on {orderday}, and it'll be just the {slow}.`, `Thanks. Could you tell me the postcode it's going to? Then I can check the courier's route.`],
			[`{gpc}, in {gtown}.`, `Thanks, that's a standard route. A {slow} leaves the lab {slowdays} working days after the order is placed, and standard delivery takes 2 to 3 working days after that. So if you order on {orderday}, it leaves the lab on {left2} and arrives between {arr1} and {arr2}, in good time for {dateWord}.`, arts.calendar],
			[`And if I left it a few more days?`, `Each working day later moves it on by a working day. Express delivery arrives the working day after it leaves the lab, which takes a day or two off.`],
			[`Is there a cut-off time on the day?`, `Orders placed by 2pm count from that day; after that, from the next working day.`]
		],
		need: 'the postcode the {slow} is going to',
		cause: `a {slow} spends {slowdays} working days in the lab and then 2 to 3 working days with the courier, so ordering on {orderday} gets it there before {dateWord}`,
		act: `place the order by {orderday}, with only the {slow} in it`,
		fixed: [`Brilliant, I'll order on {orderday} then. Thanks for working it out.`, `That's perfect, thanks. Ordering now.`],
		follow: `Could you double-check with the lab that they're not busier than usual that week?`,
		owe: `check the lab's queue for that week and confirm by {day} that {left2} still holds`,
		team: 'the lab manager',
		handover: `Customer needs a {slow} delivered by {dateWord}, ordering {orderday}. Could you confirm the lab can keep to {slowdays} working days that week?`
	},
	{
		area: 'delivery',
		weight: 1,
		stage: 'transit',
		island: true,
		subjects: ['Parcel stuck', "Tracking hasn't moved", 'Order stuck at depot'],
		open: [
			`My parcel has been at the {depot} depot for days according to the tracking. It left your lab on {left}. I live on {island}, if that matters.`,
			`Tracking hasn't changed since {left}: it just says "Held at depot". Is it lost?`
		],
		quick: [`Can I get a text when my parcel leaves the lab?`, `We send an email with the tracking link when it leaves the lab. On the courier's tracking page you can ask them for texts too.`],
		reply: `Sorry it's sitting still. Could you give me the order number, so I can look at the courier's side?`,
		turns: [
			[`It's {order}.`, `Thanks. The courier shows it at {depot}, waiting for onward transport. Could you tell me whether you've had any other deliveries in the last few days? It helps me understand whether the whole route is held up.`],
			[`Nothing has come for anyone here this week, now you mention it.`, `That fits: the ferries from {port} were cancelled for most of the week in the storm, and the courier held every parcel for the islands at {depot} until they ran again. Your parcel is booked on the next sailing and should reach you within two working days of it.`, arts.trackDepot],
			[`Will the {item} be all right after sitting in a depot?`, `It's boxed and wrapped, and the depot is dry, so it should be fine. If anything is wrong when it arrives, reply with a photo and we'll reprint it.`],
			[`Is there a way to know about weather delays before I order?`, `The courier posts island delays on their status page, which the tracking page links to.`]
		],
		need: 'to know whether any other deliveries have reached you recently',
		cause: `the ferries from {port} were cancelled in a storm, and the courier held parcels for the islands at {depot}`,
		act: `keep an eye on the tracking, and tell us if it hasn't arrived two working days after the ferries run again`,
		fixed: [`It came on this morning's boat. All fine inside.`, `Arrived today, no damage. Thanks for finding out.`],
		ok: `Thanks for finding out about the ferries.`,
		endWait: 'long',
		follow: `Could you let me know when it's actually on a boat? The tracking is so vague.`,
		owe: `ask dispatch to watch the parcel and email you once it's on a sailing`,
		team: 'dispatch',
		handover: `Order {order} held at {depot} for {island}. Weather delay? Please check with the courier and keep the customer posted.`
	},
	{
		area: 'site',
		weight: 2,
		stage: 'none',
		subjects: ['Upload not working', "Photos won't upload", 'Stuck at 99%'],
		open: [
			`I'm trying to upload photos from my laptop and they get to 99% and then sit there. I've tried about ten times. It's {count} photos from my camera.`,
			`Your uploader keeps failing. Some photos go up and others just spin for ever. I've given up for tonight.`
		],
		quick: [`How many photos can I upload at once?`, `Up to 500 at a time on the website, and there's no limit on how many your account holds.`],
		reply: `Sorry, that's tedious. Could you tell me which browser you're using, and roughly how big the photo files are?`,
		turns: [
			[`{browser} on a Windows laptop. The photos are from my {camera} and some are about {mb} MB each.`, `Thanks. That's large but within what we take. Could you send me a screenshot of the upload screen when it sticks? The message under each photo tells me what's happening.`],
			[`Screenshot attached.`, `Thanks. The stuck ones are all RAW files, the .{raw} ones, not the JPEGs. Your camera saves both for each photo, and you selected the whole folder. We can't print RAW files, so the uploader waits for a conversion that never comes. The JPEGs went up fine.`, arts.uploadsRaw],
			[`So I just select the JPEGs?`, `Yes. In the file picker, sort by type and select only the .JPG files. They're the same photos.`],
			[`Will the JPEGs print as well as the RAW ones would?`, `Yes: the JPEGs from your camera hold far more detail than a print needs, even on a canvas.`]
		],
		need: 'a screenshot of the upload screen when it sticks',
		cause: `the stuck files were the camera's RAW files, which we can't print, and the uploader waited on them instead of saying so`,
		act: `select only the .JPG files when you upload`,
		fixed: [`Selected only the JPEGs and everything went up in a couple of minutes. Thanks.`, `All uploaded now. I'd never have guessed it was the RAW files.`],
		follow: `Could the uploader tell you it can't take RAW files, instead of spinning for ever?`,
		owe: `pass that on to the web team and tell you by {day} what they say`,
		team: 'the web team',
		handover: `Uploads stick at 99% for a customer on {browser}: RAW files from a {camera}. Could the uploader reject them with a message?`
	},
	{
		area: 'site',
		weight: 1,
		stage: 'none',
		subjects: ['My photos have gone', 'Uploads missing from my account', 'Where are my old photos?'],
		open: [
			`I logged in to reorder some prints of {subject} and all my old photos have gone from my account. There were hundreds.`,
			`My account is empty! I uploaded loads of photos and now there's nothing there except what I uploaded this month.`
		],
		quick: [`Can I download my photos back from my account?`, `Yes: select the photos on the Uploads page and choose Download. They come as a zip file.`],
		reply: `Sorry, that's a horrible thing to find. Could you tell me roughly when you uploaded the photos that are missing?`,
		turns: [
			[`Around {lastyear}, I think.`, `Thanks. Your uploads stay in your account for 12 months from the day you upload them, so photos from then would have been removed recently. Could you tell me which email address your account uses? I'd like to check whether we sent the reminders.`],
			[`{email}.`, `Thanks. We emailed reminders 30 days and 7 days before the photos were removed, and both went to {email}, but they landed in your spam folder. The photos were removed on {removed}, and I'm sorry to say we can't bring them back once they've gone.`, arts.emailRemoval],
			[`So they're gone for good?`, `From our side, yes. If they came from your phone, they may still be in its camera roll or its cloud backup.`],
			[`Can I keep photos longer than 12 months?`, `Not at the moment. Every upload stays 12 months, and ordering from a photo doesn't change that.`]
		],
		need: 'the email address your account uses',
		cause: `uploads are removed 12 months after upload, and the reminders went to a spam folder`,
		act: `look for the photos in your phone's camera roll and cloud backup, and upload them again`,
		fixed: [`Found them all in my phone's backup and uploaded them again. Panic over.`, `They were on my old laptop. Uploaded again, all good.`],
		follow: `Could you ask whether there's a backup of my photos anywhere on your side?`,
		owe: `ask the web team whether anything of yours is left in a backup and tell you by {day}`,
		team: 'the web team',
		handover: `Customer's uploads from more than 12 months ago are gone; reminders went to {email}. Customer asks whether a backup holds them.`
	},
	{
		area: 'site',
		weight: 1,
		stage: 'none',
		subjects: ['Two accounts', "Can't find my book project", 'My orders have vanished'],
		open: [
			`I can't see any of my past orders or the photo book I was halfway through. I signed in with Google today, if that's relevant.`,
			`My account looks brand new. No photos, no orders, nothing. I've used Snapframe for two years.`
		],
		quick: [`Can I change the name on my account?`, `Yes, under Account, Details. It's the name we use in our emails.`],
		reply: `Sorry, that must have been a shock. Could you tell me the email address you normally sign in with, and the one on the Google account you used today?`,
		turns: [
			[`Normally {email}. My Google account is {email2}.`, `Thanks. You have two accounts: one under {email}, with your photos and orders, and a new one made today when you signed in with Google as {email2}. Could you tell me which one you'd like to keep?`],
			[`The old one, with everything in it.`, `Then sign out, and sign in with {email} and your password, not the Google button. Everything is there. If you'd like to use Google sign-in, you can link it from Account, Sign-in methods, once you're in.`, arts.signins],
			[`Will the new empty account cause problems?`, `It won't, but I can ask the web team to remove it so you don't land in it by mistake.`],
			[`Can I link my Apple ID too?`, `Yes, from the same Sign-in methods page.`]
		],
		need: 'to know which of the two accounts you\'d like to keep',
		cause: `signing in with Google as {email2} made a second, empty account, while everything is on the account under {email}`,
		act: `sign in with {email} and link Google from Sign-in methods`,
		fixed: [`Signed in the old way and everything's there, book and all. Linked Google too.`, `Back in my proper account. Thanks!`],
		follow: `Could you remove the empty account so I don't do it again?`,
		owe: `ask the web team to remove the empty account and confirm by {day}`,
		team: 'the web team',
		handover: `Customer has two accounts, {email} (photos, orders) and {email2} (new, from Google sign-in). Please remove the empty one.`
	},
	{
		area: 'site',
		weight: 1,
		stage: 'none',
		subjects: ["Can't log in", 'Password reset email not arriving', 'Locked out of my account'],
		open: [
			`I've asked for a password reset four times and no email has come. I've checked spam. I need to get at my photos for {person}'s {occasion}.`,
			`I forgot my password and the reset email never arrives. Can you reset it for me?`
		],
		quick: [`Can I order without an account?`, `Not at the moment: every order belongs to an account, so your photos and tracking are in one place.`],
		reply: `Sorry you're locked out. For your security I can't set a password for you, but I can find out where the emails are going. Could you tell me the email address you typed into the reset form?`,
		turns: [
			[`{typo}`, `Thanks. There's no account under {typo}, which is why nothing arrives: we only send a reset email to an address we have. Could you tell me any other address you might have used when you signed up?`],
			[`Oh, it might be {email}.`, `That's the one: there's an account under {email} with your orders on it. The address you were typing had two letters swapped. If you ask for the reset with {email}, the email should arrive within a minute or two.`, arts.emailReset],
			[`Got it. Can I change my email to a different one once I'm in?`, `Yes, under Account, Details, choose "Change email".`],
			[`How long is the reset link good for?`, `An hour, and only the newest link works if you ask for several.`]
		],
		need: 'any other email address you might have signed up with',
		cause: `the address typed into the reset form had two letters swapped, so it matched no account`,
		act: `ask for the reset again with {email}`,
		fixed: [`Reset email came straight away this time. I'm in. Thanks.`, `All sorted, logged in and ordering.`],
		follow: `Could the reset page say when an address isn't recognised?`,
		owe: `pass that to the web team and let you know by {day} what they say`,
		team: 'the web team',
		handover: `Customer not receiving reset emails; typed {typo}, account is under {email}. Please confirm nothing else is blocking mail to {email}.`
	},
	{
		area: 'site',
		weight: 1,
		stage: 'none',
		phone: 'android',
		subjects: ['App keeps crashing', 'App closes when I pick photos', 'Android app problem'],
		open: [
			`The Snapframe app crashes every time I try to choose photos from Google Photos. It opens the picker, I choose, and then the app just closes.`,
			`Your app shuts down as soon as I add photos. It worked last month.`
		],
		quick: [`Is there an iPad app?`, `The iPhone app runs on an iPad too. Search for Snapframe in the App Store on the iPad.`],
		reply: `Sorry, that's annoying. Could you tell me which phone you have and the app version? It's at the bottom of the app's Settings page.`,
		turns: [
			[`{phone}, app version {appv}.`, `Thanks. Could you tell me whether the photos you choose are on the phone itself or only in Google Photos' cloud? Photos in the cloud show a small cloud icon in the picker.`],
			[`Most of them have the cloud icon, now you mention it.`, `That's the cause: in {appv}, choosing photos that are only in the cloud crashes the app while it waits for them to download. Photos on the phone work fine. The app team have a fix in the next version.`, arts.crash],
			[`What can I do until then?`, `Open Google Photos, select the photos and choose Download, so they're on the phone. Then pick them in our app.`],
			[`Or I could use the website?`, `Yes, the website takes photos from anywhere, Google Photos included.`]
		],
		need: 'to know whether the photos are on the phone or only in the cloud',
		cause: `version {appv} of the app crashes when the chosen photos are only in Google Photos' cloud`,
		act: `download the photos to the phone first, or update the app when the next version is out`,
		fixed: [`Downloaded them first and the app took them fine. Order placed.`, `Updated the app today and it doesn't crash any more.`],
		follow: `Can you tell me when the fixed version is out?`,
		owe: `email you when the app team release the fixed version`,
		team: 'the app team',
		handover: `App {appv} on a {phone} crashes when picking cloud-only Google Photos. Customer can make it happen every time. Please confirm it's the known crash.`
	},
	{
		area: 'site',
		weight: 1,
		stage: 'transit',
		subjects: ['Delete my account', 'Remove my photos please', 'Close my account'],
		open: [
			`Please delete my Snapframe account and all my photos. I don't want my pictures stored anywhere.`,
			`I'd like my account closed and everything removed, photos included. How do I do that?`
		],
		quick: [`If I delete my account, can I still track my last order?`, `Yes: the tracking link in your dispatch email works without an account.`],
		reply: `Of course. Before I start, I need to make sure the request comes from the account holder. Could you confirm that you're writing from the email address on the account?`,
		turns: [
			[`Yes, this is the address on the account.`, `Thanks, that matches. One question before I pass it on: you have an order, {order}, that left the lab on {left}. Would you like us to wait until it has arrived, in case something needs reprinting?`],
			[`Yes, wait until it's here.`, `Then the data protection team will delete the account and every photo 14 days after delivery, and email you when it's done.`, arts.dataRequest],
			[`Will you keep anything about me at all?`, `Only what we need to answer you if you write in about an old order: your name, the order numbers and the delivery address. No photos.`],
			[`Will I keep getting emails?`, `No. I've turned off all marketing emails already, and the only one you'll get is the confirmation of the deletion.`]
		],
		need: 'to know whether we should wait until the order has arrived',
		cause: `the deletion waits until order {order} has arrived, then the data protection team removes the account and its photos`,
		act: `confirm by email once the order has arrived safely, so the deletion can start`,
		fixed: [`Got the email saying everything's deleted. Thanks for making it painless.`, `Confirmation came through. Thank you.`],
		ok: `Thanks for setting up the deletion; I'll tell you when the order has arrived.`,
		endWait: 'remake',
		follow: `Can you confirm my photos are removed from your backups too?`,
		owe: `ask the data protection team when the backups are cleared and write to you by {day}`,
		team: 'the data protection team',
		handover: `Deletion request from {email}, checked against the account address. Wait until order {order} is delivered, then delete the account and uploads.`
	}
];

// ---------------------------------------------------------------------------------------------------------
// Shared parts of a conversation.
const backstories = [
	`I've ordered from you a few times and never had a problem before.`,
	`I've been a customer for years, so I was surprised by this.`,
	`I'm not very good with computers, so please bear with me.`,
	`My daughter set up the account for me and she's away at the moment.`,
	`I've recommended you to friends, so I'd like to get this sorted.`,
	`We print our photos with you every few months; the kids love choosing them.`,
	`I use the app on my phone for nearly everything, in case that matters.`,
	`I'm in no rush, but I'd like to understand what went wrong.`,
	`Sorry for the long message, I wanted to give you everything at once.`,
	`I'd normally just ring, but I couldn't find a phone number.`,
	`A friend recommended Snapframe and I've been really pleased until now.`
];
const firstGreetings = ['Hi,', 'Hello,', 'Hi there,', 'Dear Snapframe,', 'Hello Snapframe team,', ''];
const replyGreetings = ['Hi {agent},', '{agent},', '', 'Hi again,', 'Hello {agent},', 'Dear {agent},'];
const custSignoffs = ['Thanks,\n{first}', 'Many thanks,\n{full}', 'Cheers,\n{first}', 'Kind regards,\n{full}', '{first}', 'Thanks in advance,\n{first}', 'Best wishes,\n{full}\n\nSent from my phone'];
const replySignoffs = ['Thanks,\n{first}', '{first}', 'Cheers, {first}', '', 'Thanks again,\n{first}', '{first}', 'Thanks,\n{first}', '{first} x'];
const agentGreetings = ['Hi {first},', 'Hello {first},', 'Dear {first},'];
const agentGreetingsLater = ['Hi {first},', 'Hello again {first},', 'Hi {first}, thanks for getting back to me.', 'Hello {first},'];
const agentSignoffs = ['Best wishes,\n{agent}\nSnapframe Customer Care', 'Thanks,\n{agent}', 'Kind regards,\n{agent} | Snapframe', 'Speak soon,\n{agent}', 'All the best,\n{agent}\nSnapframe'];
const agentIntros = [`Thanks for getting in touch.`, `Thanks for your message.`, `Sorry for the slow reply; it's been a busy few days here.`, `Thanks for writing to us about this.`, `Thanks for ordering with us, and for telling us when something isn't right.`];
const custAcks = [`Thanks, that helps.`, `OK, understood.`, `Right.`, `Thanks for the quick reply.`, `Ah, I see.`, `That makes sense.`, `Oh, I didn't know that.`, `Great, thanks.`];
const vagueSubjects = ['Order problem', 'Help please', '(no subject)', 'Re: Your Snapframe order is on its way', 'Question', 'Not happy', 'Re: Welcome to Snapframe', 'My order', 'Urgent'];
const holdings = [`Thanks, let me look into this properly and come back to you.`, `Thanks for that. I want to check something with the lab before I answer, so bear with me.`, `Got it, thank you. I'll look at your order and come back to you.`];
const notes = [
	`Looked up {email} in the order system: customer since {since}, {orders} orders, no other tickets this year.`,
	`Customer has been with us a long time going by the order history. Worth looking after.`,
	`Same kind of thing came up on another ticket this week; keeping an eye out for a pattern.`,
	`Customer sounds upset in the first message. Prioritising.`,
	`Lab says it's a busy week, with the first Christmas orders coming in.`,
	`Checked the help article on this: it doesn't cover the case well. Will flag it to the content team.`
];
const passLines = [
	`I've passed this to {team}, who can look into your order more closely than I can. They'll reply on this ticket, so their answer will come to you by email.`,
	`I've asked {team} to take this one, as it needs someone in the lab who can see more than I can. They'll pick it up from here and write to you on this ticket.`,
	`This needs {team}, so I've handed it over with everything above. You'll hear from them on this ticket.`
];
const mateAcks = [`Hi {first}, {mateIntro} here. I've picked this up and will be in touch once I've had a proper look.`, `Hello {first}, this is {mateIntro}. Thanks for your patience; I'm looking at it now and will update you here.`];
const actLines = [
	`So the next step is on your side: you'll need to {act}. Reply here if anything isn't clear.`,
	`From here it's with you: you'll need to {act}. I'll keep the ticket open in case you need anything.`,
	`To sum up, you'll need to {act}. Let me know how you get on.`
];
const willDos = [`OK, I'll do that {when} and let you know.`, `Will do. I'll get my son to help me {when}.`, `Thanks. I'll try that {when}.`, `Understood. I'll get on to it {when}.`];
const whens = ['tomorrow', 'this evening', 'at the weekend', 'after work', 'later this week'];
const oweLines = [`Leave that with me. I'll {owe}.`, `Good question. Let me {owe}.`, `I'll {owe}, and I'll keep this ticket open until then.`];
const thanksLines = [`Thanks, I'll look out for it.`, `Great, thank you.`, `Appreciated, thanks.`, `Thanks, speak then.`];
const closings = [`Great to hear. I'll leave it there, but reply to this email if anything else comes up.`, `Glad that did it!`, `Lovely, thanks for letting me know.`, `Good news. Enjoy the photos.`];
const nudges1 = [`Just checking in. When you have a moment, I still need {need} to get any further. I'll pick it up as soon as I hear from you.`, `Following up on my last message: I still need {need} before I can go further. No rush, I just want to make sure it didn't get buried.`, `I don't want this to fall through the cracks. I still need {need}, and then I can carry on from there.`];
const nudges2 = [`I haven't heard back, so I'll assume things are fine for now. If it's still a problem, reply here and I'll take it from there.`, `One last nudge from me. Whenever you're ready, reply to this email and the ticket comes back to me with everything above.`];
const chatHellos = [`Hi {first}, I'm {agent} from Snapframe. Let me read your message.`, `Hello {first}, {agent} here. Thanks for waiting.`, `Hi {first}! {agent} from Snapframe Customer Care. Give me a second to catch up on what you wrote.`];
const chatHandoffs = [`I'll leave this ticket open, so you can reply to the email copy of this chat with anything else.`, `If anything else comes up, reply to the email copy of this chat and it comes straight back to me.`];

// ---------------------------------------------------------------------------------------------------------
// One ticket.
interface Item {
	who: 'c' | 'a' | 'note' | 'mate';
	paras: string[];
	art?: string;
	wait?: 'long' | 'remake';
}

const totalWeight = topics.reduce((sum, topic) => sum + topic.weight, 0);
const weighted = (r: Rand) => {
	let left = r() * totalWeight;
	for (const topic of topics) if ((left -= topic.weight) < 0) return topic;
	return topics.at(-1)!;
};
const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const swapTwo = (r: Rand, address: string) => {
	const [local, domain] = address.split('@') as [string, string];
	const at = int(r, 1, local.length - 3);
	return `${local.slice(0, at)}${local[at + 1]}${local[at]}${local.slice(at + 2)}@${domain}`;
};

const ticket = (index: number) => {
	const r = mulberry32(0x5afe0000 + index * 104729);
	const number = 70413 + index * 6 + int(r, 0, 4);
	const openDay = openDays[Math.floor((index * openDays.length) / ITEMS)]!;
	const main = weighted(r);
	let outcome = pick(r, ['resolved', 'resolved', 'resolved', 'owe', 'owe', 'act', 'act', 'team', 'team', 'quiet', 'quiet'] as Outcome[]);
	if (main.outcomes && !main.outcomes.includes(outcome)) outcome = pick(r, main.outcomes);
	// Something made again or ordered again late in the period cannot reach the customer before the export.
	if (main.endWait === 'remake' && outcome === 'resolved' && openDay > EXPORT - 18 * DAY) outcome = pick(r, ['owe', 'act', 'team'] as Outcome[]);
	const viaTeam = !main.noTeamFix && (outcome === 'resolved' || outcome === 'act') && chance(r, 0.3);
	const partial = outcome === 'team' || outcome === 'quiet' || viaTeam;
	const channel = pick(r, ['email', 'email', 'email', 'chat', 'chat', 'app', 'web form']);
	const saturday = utc(openDay).getUTCDay() === 6;
	const openMs = openDay + (channel === 'chat' ? int(r, saturday ? 9 * 60 : 8 * 60 + 15, saturday ? 12 * 60 + 15 : 17 * 60 + 15) : int(r, 7 * 60, 22 * 60)) * MIN;

	// Other matters the customer raises: a quick question, and up to three smaller matters discussed in full.
	const used = new Set<Topic>([main]);
	const sideOk = (topic: Topic) =>
		![...used].some((other) => other.area === topic.area || (other.phone && topic.phone && other.phone !== topic.phone) || (other.island && topic.island) || (other.mixed && topic.area === 'delivery'));
	// A matter about an order still in the lab or on its way only opens a ticket: raised days later, its dates would
	// no longer fit.
	const takeSide = (full: boolean) => {
		const topic = pick(r, topics.filter((topic) => sideOk(topic) && (!full || topic.stage === 'delivered' || topic.stage === 'none')));
		used.add(topic);
		return topic;
	};
	const quick = chance(r, 0.85) ? takeSide(false) : undefined;
	const fullCount = main.alone ? 0 : partial ? pick(r, [1, 2, 3, 3]) : pick(r, [1, 2, 2, 2, 3, 3]);
	const fulls = Array.from({ length: fullCount }, () => takeSide(true));
	const sidesEarly = partial || chance(r, 0.4);
	const threads = [main, ...fulls];

	// Who and where.
	const female = chance(r, 0.5);
	const first = pick(r, female ? firstF : firstM);
	const last = pick(r, surnames);
	const provider = pick(r, providers);
	const local = pick(r, [`${first}.${last}`, `${first}${last}`, `${first.charAt(0)}${last}${int(r, 10, 99)}`, `${first}${int(r, 70, 99)}`]).toLowerCase().replace(/[^a-z0-9.]/g, '');
	const email = `${local}@${provider}`;
	const islandTopic = threads.find((topic) => topic.island);
	const island = pick(r, islands);
	const place = pick(r, places);
	const [town, pc] = islandTopic ? [island[1], island[2]] : [place[0], place[1]];
	const wantsIphone = threads.some((topic) => topic.phone === 'iphone');
	const wantsAndroid = threads.some((topic) => topic.phone === 'android');
	const phone = wantsIphone ? pick(r, iphones) : wantsAndroid ? pick(r, androids) : pick(r, chance(r, 0.55) ? iphones : androids);
	const camera = pick(r, cameras);
	const agent = pick(r, agents);
	const slowProduct = pick(r, ['book', 'canvas', 'framed', 'framed'] as Product[]);
	const fastProduct = pick(r, ['prints', 'mug'] as Product[]);
	const deadlineSlow = pick(r, ['book', 'canvas', 'framed', 'mug'] as Product[]);
	const mixedTopic = threads.some((topic) => topic.mixed);
	const slow = mixedTopic ? slowProduct : deadlineSlow;
	const orderday = (() => {
		let day = openDay + (main.area === 'delivery' && main.stage === 'none' ? int(r, 1, 4) : int(r, 7, 12)) * DAY;
		while (!weekday(day)) day += DAY;
		return day;
	})();
	const left2 = addWork(orderday, LEAD[slow]);
	const arr1 = addWork(left2, 2);
	const arr2 = addWork(left2, 3);
	const christmas = openDay >= Date.UTC(2026, 10, 1) && chance(r, 0.6);
	const person = pick(r, persons);
	const occasion = pick(r, occasions);
	const giftDay = arr2 + int(r, 3, 12) * DAY;
	const typo = pick(r, typos);
	const page = int(r, 3, 18);
	const removedMs = openDay - int(r, 2, 20) * DAY;
	const missing = int(r, 2, 6);
	const s: Slots = {
		first,
		last,
		full: `${first} ${last}`,
		email,
		email2: `${first.toLowerCase()}.${last.toLowerCase()}${int(r, 1, 99)}@${pick(r, providers.filter((p) => p !== provider))}`,
		oldemail: `${first.toLowerCase()}${pick(r, ['', '.', '_'])}${last.toLowerCase()}@${pick(r, ['oldmail.example', 'unimail.example', 'workplace.example'])}`,
		agent,
		town,
		pc,
		street: pick(r, streets),
		town2: pick(r, places.filter((p) => p[0] !== town))[0],
		month: MONL[utc(openDay).getUTCMonth() - int(r, 1, 3)]!,
		gtown: '',
		gpc: '',
		island: island[0],
		depot: islandTopic ? island[3] : pick(r, depots),
		port: island[4],
		phone,
		ext: phone.startsWith('iPhone') ? 'HEIC' : 'jpg',
		appv: `4.${int(r, 8, 14)}.${int(r, 0, 3)}`,
		browser: pick(r, browsers),
		camera: camera[0],
		raw: camera[1],
		mb: String(int(r, 24, 48)),
		imgBase: String(int(r, 1200, 9800)),
		shotDay: `${int(r, 1, 28)} ${pick(r, ['Jul', 'Aug', 'Sep'])}`,
		file: '',
		file2: '',
		missing: String(missing),
		got: String(50 - missing),
		album: pick(r, albums),
		count: String(int(r, 30, 220)),
		big: String(int(r, 140, 400)),
		time: `${pad(int(r, 9, 17))}:${pad(int(r, 0, 59))}`,
		studio: pick(r, studios),
		neighbour: pick(r, neighbours),
		meters: String(int(r, 25, 90)),
		person,
		occasion,
		date: fullDay(openDay + int(r, 8, 20) * DAY),
		subject: pick(r, subjects),
		wrong: typo[0],
		right: typo[1],
		page: String(page),
		lastyear: `${MONL[utc(openDay).getUTCMonth()]} last year`,
		removed: dayMonth(removedMs),
		removedMs: String(removedMs),
		typo: swapTwo(r, email),
		day: pick(r, ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']),
		when: pick(r, whens),
		slow: NOUN[slow],
		slowdays: String(LEAD[slow]),
		fast: NOUN[fastProduct],
		orderday: fullDay(orderday),
		orderdayMs: String(orderday),
		left2: fullDay(left2),
		left2Ms: String(left2),
		arr1: fullDay(arr1),
		arr1Ms: String(arr1),
		arr2: fullDay(arr2),
		arr2Ms: String(arr2),
		gift: christmas ? `Christmas, for ${person}` : `${person}'s ${occasion} on ${fullDay(giftDay)}`,
		dateWord: christmas ? 'Christmas' : fullDay(giftDay),
		since: `${MONL[int(r, 0, 11)]} ${int(r, 2019, 2025)}`,
		orders: String(int(r, 2, 26)),
		nowMs: String(openMs),
		team: main.team,
		mate: teamPeople[main.team]![0],
		mateIntro: teamPeople[main.team]![1],
		need: ''
	};
	const giftPlace = pick(r, places.filter((p) => p[0] !== town));
	s.gtown = giftPlace[0];
	s.gpc = giftPlace[1];
	s.file = img(s, int(r, 1, 30));
	s.file2 = img(s, int(r, 31, 60));

	// The orders the threads are about, and a few older ones, for the customer panel.
	interface Order {
		number: string;
		placed: number;
		items: string[];
		status: string;
		slots: Slots;
	}
	const orderNumber = (placed: number) => `SF-${270000 + Math.floor((placed - Date.UTC(2026, 0, 1)) / DAY) * 97 + int(r, 0, 96)}`;
	const orders: Order[] = [];
	const orderFor = (topic: Topic): Slots => {
		if (topic.stage === 'none') return {};
		let items: string[];
		if (topic.mixed) items = [label(r, fastProduct), label(r, slowProduct)];
		else if (topic.area === 'delivery' || topic.area === 'site') items = [label(r, pick(r, products)), ...(chance(r, 0.4) ? [label(r, pick(r, products))] : [])];
		else items = [topic.item ?? label(r, topic.area as Product), ...(chance(r, 0.25) ? [label(r, pick(r, products.filter((p) => p !== topic.area)))] : [])];
		const lead = Math.max(...items.map((item) => LEAD[products.find((p) => item.toLowerCase().includes(p === 'prints' ? 'prints, pack' : p === 'framed' ? 'framed' : p === 'book' ? 'photo book' : p))!]));
		let placed: number;
		let left: number;
		let delivered = 0;
		let status: string;
		if (topic.stage === 'delivered') {
			delivered = subWork(openDay, int(r, 1, 8));
			left = subWork(delivered, int(r, 2, 3));
			placed = subWork(left, lead);
			status = `Delivered ${dayMonth(delivered)}`;
		} else if (topic.stage === 'transit') {
			left = subWork(openDay, int(r, 2, 4));
			placed = subWork(left, lead);
			status = 'With the courier';
		} else if (topic.stage === 'hold') {
			placed = subWork(openDay, int(r, 2, 3));
			left = addWork(openDay, lead);
			status = `On hold since ${dayMonth(placed)}`;
		} else {
			placed = subWork(openDay, int(r, topic.mixed ? 1 : 0, Math.min(lead - 1, 2)));
			left = addWork(placed, lead);
			if (left <= openDay) left = addWork(openDay, 1);
			status = 'In the lab';
		}
		const printed = left > openDay ? addWork(placed, 1) : subWork(left, 1);
		const number = orderNumber(placed);
		const own: Slots = {
			order: number,
			order2: '',
			placed: fullDay(placed),
			placedMs: String(placed),
			left: fullDay(left),
			leftMs: String(left),
			delivered: fullDay(delivered),
			deliveredMs: String(delivered),
			printed: fullDay(printed),
			printedMs: String(printed),
			arrives: fullDay(addWork(left, 1)),
			arrivesMs: String(addWork(left, 1)),
			item: items[0]!.replace(/ \(.*$/, '').replace(/^Classic prints.*/, 'prints').replace(/^A4 /, '').replace(/^A3 canvas print/, 'canvas').replace(/^Photo book.*/, 'photo book').replace(/^Photo mug/, 'mug').toLowerCase()
		};
		own.order2 = `SF-${Number(number.slice(3)) + pick(r, [-1, 1]) * int(r, 1, 12)}`;
		orders.push({ number, placed, items, status, slots: own });
		return own;
	};
	const own = new Map<Topic, Slots>();
	for (const topic of threads) own.set(topic, orderFor(topic));
	for (let i = int(r, 0, 3), back = openDay - int(r, 20, 60) * DAY; i > 0; i--, back -= int(r, 25, 120) * DAY) {
		if (back < Date.UTC(2026, 0, 10)) break;
		const items = [label(r, pick(r, products)), ...(chance(r, 0.3) ? [label(r, pick(r, products))] : [])];
		orders.push({ number: orderNumber(back), placed: back, items, status: `Delivered ${dayMonth(addWork(back, int(r, 5, 8)))}`, slots: {} });
	}
	orders.sort((x, y) => y.placed - x.placed);

	const fillWith = (topic: Topic | undefined) => (text: string): string =>
		text.replace(/\{(\w+)\}/g, (_, key: string) => {
			const value = (topic && own.get(topic)?.[key]) ?? s[key];
			if (value === undefined) throw new Error(`no slot ${key} in "${text.slice(0, 60)}"`);
			return value;
		});
	const fill = fillWith(undefined);
	const fillMain = fillWith(main);
	s.need = fillMain(main.need);

	// The conversation, as a list of messages.
	const items: Item[] = [];
	let carry: string[] = [];
	const c = (paras: string[], art?: string, wait?: Item['wait']) => {
		items.push({ who: 'c', paras: [...carry, ...paras], art, wait });
		carry = [];
	};
	const a = (paras: string[], wait?: Item['wait'], art?: string) => items.push({ who: 'a', paras, wait, art });
	/** The artifact of an exchange: an internal note before the agent's answer, or a table inside it. */
	const artOf = (topic: Topic, pair: [string, string, Art?]): [string | undefined, string | undefined] => {
		if (!pair[2]) return [undefined, undefined];
		const text = pair[2](r, { ...s, ...own.get(topic) });
		const [lead, where] = artPlace.get(pair[2])!;
		if (where === 'reply') return [undefined, text];
		items.push({ who: 'note', paras: [`${lead}:`, text] });
		return [text, undefined];
	};
	/** One exchange; the customer may first acknowledge the agent's last answer (not a question). */
	const turn = (topic: Topic, pair: [string, string, Art?], extra?: [string, string], ack = true) => {
		const f = fillWith(topic);
		c([...(ack && !carry.length && chance(r, 0.35) ? [pick(r, custAcks)] : []), f(pair[0]), ...(extra ? [`Unrelated, but ${lowerFirst(fill(extra[0]))}`] : [])]);
		const [, shown] = artOf(topic, pair);
		a(extra ? [f(pair[1]), `And on your other question: ${fill(extra[1])}`] : [f(pair[1])], undefined, shown);
	};
	// A smaller matter, from the customer's first words about it to its last follow-up; the customer's next message
	// then starts by saying it is settled.
	const subThread = (topic: Topic) => {
		a([fillWith(topic)(topic.reply)]);
		topic.turns.forEach((pair, position) => turn(topic, pair, undefined, position > 0));
		carry = [fillWith(topic)(topic.ok ?? pick(r, topic.fixed))];
	};
	const sides = () =>
		fulls.forEach((topic, position) => {
			const lead =
				position === 0
					? pick(r, [`I'll find that and come back to you. In the meantime, something else:`, `I need to dig that out, so give me a day or so. Meanwhile, a different question:`, `I'll look for that. While I do, one more thing:`])
					: pick(r, [`Another thing while I'm here.`, `Next question, if that's all right:`, `Something else has come up as well.`]);
			c([lead, fillWith(topic)(pick(r, topic.open))]);
			subThread(topic);
		});
	const opening = [...(chance(r, 0.5) ? [fill(pick(r, backstories))] : []), fillMain(pick(r, main.open))];
	const dispatchQuote =
		channel === 'email' && main.stage === 'delivered' && chance(r, 0.3)
			? [`> On ${fullDay(Number(own.get(main)!.leftMs))}, Snapframe wrote:\n> Order ${own.get(main)!.order} left our lab today.\n> Standard delivery takes 2 to 3 working days. If something is not right when it arrives, reply to this email with a photo and we will reprint it.`]
			: [];
	let quickUsed = !quick;
	if (quick && chance(r, 0.4)) {
		quickUsed = true;
		if (chance(r, 0.5)) {
			c([`Two things, if I may. First, a quick one: ${fill(quick.quick[0])}`, `The bigger one:`, ...opening]);
			a([`On your quick question: ${fill(quick.quick[1])}`, `On the bigger one: ${fillMain(main.reply)}`]);
		} else {
			c([fill(quick.quick[0])]);
			a([fill(quick.quick[1])]);
			c([pick(r, [`Thanks! While I have you, the real reason I got in touch:`, `Great, thanks. The other thing, and really why I wrote:`, `Perfect. Now the thing that's actually been bothering me.`]), ...opening]);
			a([fillMain(main.reply)]);
		}
	} else {
		c([...opening, ...dispatchQuote]);
		a([...(!main.reply.startsWith('Thanks') && chance(r, 0.5) ? [pick(r, agentIntros)] : []), fillMain(main.reply)]);
	}
	const mainOrder = own.get(main)!;
	if (chance(r, 0.35)) items.push({ who: 'note', paras: [fill(pick(r, notes.filter((note) => openDay >= Date.UTC(2026, 10, 1) || !note.includes('Christmas'))))] });
	else if (mainOrder.order && chance(r, 0.6)) {
		const placed = Number(mainOrder.placedMs);
		const left = Number(mainOrder.leftMs);
		const steps: [string, number][] = [
			['Placed', placed + int(r, 17, 21) * HOUR + int(r, 0, 59) * MIN],
			['Photos checked', placed + int(r, 22, 23) * HOUR + int(r, 0, 59) * MIN],
			['Sent to print', addWork(placed, 1) + int(r, 7, 9) * HOUR + int(r, 0, 59) * MIN],
			['Printed', Number(mainOrder.printedMs) + int(r, 10, 15) * HOUR + int(r, 0, 59) * MIN],
			['Quality check', left + int(r, 9, 11) * HOUR + int(r, 0, 59) * MIN],
			['Packed', left + int(r, 13, 14) * HOUR + int(r, 0, 59) * MIN],
			['Left the lab', left + 16 * HOUR + int(r, 0, 59) * MIN],
			['Delivered', Number(mainOrder.deliveredMs) + int(r, 9, 17) * HOUR + int(r, 0, 59) * MIN]
		];
		const rows = steps.filter(([step, when]) => when > 0 && when < openMs && !(step === 'Delivered' && main.stage !== 'delivered')).map(([step, when]) => [step, `${short(when)}, ${clock(when)}`]);
		items.push({ who: 'note', paras: [`Order ${mainOrder.order}, from the order system:`, table(['Step', 'When'], rows)] });
	}

	const [given, cause, ...rest] = main.turns;
	const quickLater = !quickUsed && chance(r, 0.7) ? quick!.quick : undefined;
	if (sidesEarly) sides();
	turn(main, given!, quickLater, false);
	if (!partial) {
		if (!sidesEarly) sides();
		if (chance(r, 0.3)) {
			c([fillMain(cause![0])]);
			a([pick(r, holdings)]);
			const [, shown] = artOf(main, cause!);
			a([fillMain(cause![1])], 'long', shown);
		} else turn(main, cause!);
		if (rest.length >= 2 && chance(r, 0.35)) {
			c([fillMain(rest[0]![0]), fillMain(rest[1]![0])]);
			a([fillMain(rest[0]![1]), fillMain(rest[1]![1])]);
			rest.slice(2).forEach((pair) => turn(main, pair));
		} else rest.forEach((pair) => turn(main, pair));
	}

	const handOver = () => {
		items.push({ who: 'note', paras: [`Passing to ${main.team}: ${fillMain(main.handover)}`] });
		a([fill(pick(r, passLines))]);
	};
	const mateFinds = () =>
		items.push({ who: 'mate', paras: [fill(`Hi {first}, {mateIntro} here.`), `I've looked into it, and ${fillMain(main.cause)}. To sort it, you'll need to ${fillMain(main.act)}.`], wait: 'long' });
	if (outcome === 'resolved') {
		if (viaTeam) {
			handOver();
			mateFinds();
		}
		c([fillMain(pick(r, main.fixed))], undefined, main.endWait);
		if (chance(r, 0.6)) a([pick(r, closings)]);
	} else if (outcome === 'owe') {
		const prefix = /^(That|Thanks|It|As|Since)/.test(main.follow) || carry.length ? [] : chance(r, 0.5) ? [pick(r, [`That's clear, thanks.`, `Thanks, that all makes sense now.`, `Good, that's that part understood.`])] : [];
		c([...prefix, fillMain(main.follow)]);
		a([pick(r, oweLines).replace('{owe}', fillMain(main.owe))]);
		if (chance(r, 0.5)) c([pick(r, thanksLines)]);
	} else if (outcome === 'act') {
		if (viaTeam) {
			handOver();
			mateFinds();
		} else a([pick(r, actLines).replace('{act}', fillMain(main.act))]);
		c([fill(pick(r, willDos))]);
	} else if (outcome === 'team') {
		handOver();
		if (chance(r, 0.4)) c([pick(r, thanksLines)]);
		if (chance(r, 0.4)) items.push({ who: 'mate', paras: [fill(pick(r, mateAcks))] });
	} else {
		items.push({ who: 'a', paras: [fill(pick(r, nudges1))], wait: 'long' });
		if (chance(r, 0.6)) items.push({ who: 'a', paras: [pick(r, nudges2)], wait: 'long' });
	}

	// Times. Customers write at any hour from 07:00 to 23:00; support answers on weekdays from 08:00 to 18:00 and on
	// Saturdays from 09:00 to 13:00. Late tickets get shorter gaps, so that every conversation ends before the export.
	const schedule = (scale: number): number[] => {
		const rt = mulberry32(0x71e5 + index * 7907);
		let now = openMs;
		const gap = (low: number, high: number) => Math.max(1, Math.round(int(rt, low, high) * scale));
		const workHours = () => {
			for (;;) {
				const d = utc(now);
				const hour = d.getUTCHours();
				const saturday = d.getUTCDay() === 6;
				if (d.getUTCDay() === 0 || hour >= (saturday ? 13 : 18)) now = midnight(now) + DAY + 8 * HOUR + int(rt, 5, 70) * MIN;
				else if (hour < (saturday ? 9 : 8)) now = midnight(now) + (saturday ? 9 : 8) * HOUR + int(rt, 5, 70) * MIN;
				else break;
			}
		};
		return items.map((item, position) => {
			if (position > 0) {
				if (item.wait === 'long') now += gap(2 * 24 * 60, 4 * 24 * 60) * MIN;
				if (item.wait === 'remake') now += gap(8 * 24 * 60, 11 * 24 * 60) * MIN;
				if (item.who === 'c') {
					now += gap(12, 1300) * MIN;
					const hour = utc(now).getUTCHours();
					if (hour < 7) now += 7 * HOUR;
					else if (hour >= 23) now += 9 * HOUR;
				} else if (item.who === 'note') {
					now += int(rt, 2, 25) * MIN;
					workHours();
				} else {
					now += gap(10, 280) * MIN;
					workHours();
				}
			}
			return now;
		});
	};
	let times = schedule(1);
	for (const scale of [0.6, 0.4, 0.25, 0.15, 0.08]) if (times.at(-1)! >= EXPORT - 6 * HOUR) times = schedule(scale);

	// How many of the first messages happen in a chat window: whole exchanges, ending with the agent.
	let chatUntil = 0;
	if (channel === 'chat') {
		chatUntil = Math.min(items.length, 2 + 2 * int(r, 1, 2));
		while (chatUntil > 0 && (items[chatUntil - 1]!.who !== 'a' || items.slice(0, chatUntil).some((item) => item.who === 'note' || item.who === 'mate'))) chatUntil--;
	}

	// The subject line: often the main matter, often not.
	const subjectPool = [
		...main.subjects.map(fillMain),
		...main.subjects.map(fillMain),
		...(quick && quickUsed ? quick.subjects.map(fillWith(quick)) : []),
		...(fulls[0] && sidesEarly ? fulls[0].subjects.map(fillWith(fulls[0])) : []),
		...vagueSubjects.slice(0, 4).map((subject) => (subject.startsWith('Re: Your') && main.stage !== 'delivered' ? 'Question about my order' : subject)),
		pick(r, vagueSubjects.slice(4))
	];
	const subject = channel === 'chat' ? `Chat with ${first}` : pick(r, subjectPool);

	// Write it out.
	const out: string[] = [`# Ticket ${number}: ${subject}`, ''];
	const device = channel === 'app' ? `${phone}, Snapframe app ${s.appv}` : channel === 'web form' ? `${pick(r, browsers.concat(['Safari']))} on ${pick(r, ['Windows 11', 'macOS 15', 'an iPad', 'ChromeOS'])}` : '';
	out.push(
		table(
			['Field', 'Value'],
			[
				['Opened', `${stamp(openMs)}, by ${channel === 'app' ? 'the app' : channel}`],
				['From', `${s.full} <${email}>`],
				['Customer since', s.since!],
				['Orders', String(Math.max(orders.length, Number(s.orders)))],
				['Delivery address', `${town} ${pc}`],
				...(device ? [['Device', device]] : [])
			]
		),
		''
	);
	if (orders.length) out.push('### Recent orders', '', table(['Order', 'Placed', 'Items', 'Status'], orders.map((order) => [order.number, dayMonth(order.placed), order.items.join('; '), order.status])), '');
	out.push('## Conversation', '');
	const attachments = (para: string) =>
		/attached/i.test(para) ? `_Attachments: ${Array.from({ length: /photos|screenshot/i.test(para) && !/Screenshot attached/.test(para) ? int(r, 2, 3) : 1 }, (_, i) => /Screenshot/.test(para) ? `Screenshot ${dayMonth(openMs)} at ${hm(r, 8, 22)}.png` : `${s.ext === 'HEIC' ? 'IMG' : 'PXL'}_${Number(s.imgBase) + 200 + i * int(r, 1, 4)}.${s.ext === 'HEIC' ? 'jpeg' : 'jpg'}`).join(', ')}_` : '';
	if (chatUntil > 0) {
		out.push(`### Chat with ${agent} · ${stamp(times[0]!)}`, '');
		const lines: string[] = [];
		items.slice(0, chatUntil).forEach((item, position) => {
			const who = item.who === 'c' ? first : agent;
			const at = clock(times[0]! + (position * 3 + int(r, 0, 2)) * MIN);
			if (position === 1) lines.push(`**${at} ${agent}:** ${fill(pick(r, chatHellos))}`);
			item.paras.forEach((para) => lines.push(`**${at} ${who}:** ${para}`));
			if (item.art) lines.push(item.art);
		});
		if (chatUntil < items.length) lines.push(`**${clock(times[0]! + (chatUntil * 3 + 2) * MIN)} ${agent}:** ${pick(r, chatHandoffs)}`);
		out.push(lines.join('\n\n'), '');
		const shift = times[0]! + (chatUntil * 3 + 10) * MIN;
		for (let position = chatUntil; position < times.length; position++) if (times[position]! < shift) times[position] = shift + position * MIN;
	}
	let previousAgent = '';
	let agentSpoke = chatUntil > 0;
	items.slice(chatUntil).forEach((item, offset) => {
		const position = chatUntil + offset;
		const at = times[position]!;
		const body: string[] = [];
		if (item.who === 'c') {
			out.push(`### ${s.full} · ${stamp(at)}`, '');
			const greeting = fill(pick(r, position === 0 ? (utc(at).getUTCHours() < 12 ? [...firstGreetings, 'Good morning,'] : firstGreetings) : replyGreetings));
			if (greeting) body.push(greeting);
			const quoted = previousAgent.split(/(?<=[.?!])\s/).find((sentence) => sentence.length > 40);
			if (quoted && chance(r, 0.25)) body.push(`> ${quoted}`);
			// A quoted email goes below the signature, as mail programs put it.
			const quotes = item.paras.filter((para) => para.startsWith('> On '));
			body.push(...item.paras.filter((para) => !quotes.includes(para)));
			const files = item.paras.map(attachments).filter(Boolean);
			if (item.art) body.push(item.art);
			const signoff = fill(pick(r, position === 0 ? custSignoffs : replySignoffs));
			if (signoff) body.push(signoff);
			if (channel === 'app' && position === 0) body.push(`Sent from the Snapframe app ${s.appv} on ${phone}`);
			body.push(...quotes, ...files);
		} else if (item.who === 'a') {
			out.push(`### ${agent} (Snapframe Customer Care) · ${stamp(at)}`, '');
			const afterCustomer = items[position - 1]?.who === 'c';
			body.push(fill(pick(r, !agentSpoke ? agentGreetings : afterCustomer ? agentGreetingsLater : ['Hi {first},', 'Hello {first},'])), ...item.paras, ...(item.art ? [item.art] : []), fill(pick(r, agentSignoffs)));
			previousAgent = [...item.paras].sort((x, y) => y.length - x.length)[0]!;
			agentSpoke = true;
		} else if (item.who === 'note') {
			out.push(`### Internal note by ${agent} · ${stamp(at)}`, '');
			body.push(...item.paras);
		} else {
			out.push(`### ${s.mate} (${teamPeople[main.team]![2]}) · ${stamp(at)}`, '');
			body.push(...item.paras, s.mate!);
		}
		out.push(body.join('\n\n'), '');
	});
	const final = times.at(-1)!;
	if (final >= EXPORT) throw new Error(`ticket ${number} runs past the export: ${stamp(final)}`);
	return { name: `${number}.md`, text: out.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n' };
};

const folder = join(root, 'support', 'tickets');
mkdirSync(folder, { recursive: true });
for (let index = 0; index < ITEMS; index++) {
	const { name, text } = ticket(index);
	writeFileSync(join(folder, name), text);
}
writeFileSync(
	join(folder, 'README.md'),
	`# Support tickets\n\nThe ${ITEMS} tickets that customers opened with Snapframe support between 5 October and 13 November 2026, one\nfile each, as the help desk exported them on 20 November. Each file holds the customer panel support saw when the ticket\ncame in, with the customer's recent orders, and the whole conversation, chats included, with internal notes\nand replies from the lab and the other teams. The export does not keep the help desk's tags or statuses.\n`
);
