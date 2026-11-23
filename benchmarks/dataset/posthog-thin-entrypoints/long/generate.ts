// Writes the long material of this entry's long tasks: every ticket Larkspur customer care handled about orders,
// baskets and deliveries between 14 September and 13 November 2026, one Markdown file each, under
// customer-care/tickets/, with a README for the folder. Deterministic: fixed seeds, no clock, no network.
//   bun long/generate.ts <workspace root>
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** How many tickets to write. Everything else is derived from it. */
const ITEMS = 266;

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
const lowerFirst = (text: string) => (/^[A-Z][a-z]/.test(text) && !/^(I|I'm|I've|I'll|I'd)\b/.test(text) ? text.charAt(0).toLowerCase() + text.slice(1) : text);
const upperFirst = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const euro = (cents: number) => `€${Math.floor(cents / 100).toLocaleString('en-IE')}.${pad(cents % 100)}`;
const NUM = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const num = (n: number) => NUM[n] ?? String(n);

// ---------------------------------------------------------------------------------------------------------------
// Dates. Tickets arrive from Monday 14 September to Friday 13 November 2026; the export ran on 20 November.
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WDL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const at = (ms: number) => new Date(ms);
const midnight = (ms: number) => ms - (ms % DAY);
const hhmm = (ms: number) => `${pad(at(ms).getUTCHours())}:${pad(at(ms).getUTCMinutes())}`;
const stamp = (ms: number) => `${WD[at(ms).getUTCDay()]} ${at(ms).getUTCDate()} ${MON[at(ms).getUTCMonth()]} ${at(ms).getUTCFullYear()}, ${hhmm(ms)}`;
const dayMonth = (ms: number) => `${at(ms).getUTCDate()} ${MONL[at(ms).getUTCMonth()]}${at(ms).getUTCFullYear() === 2026 ? '' : ` ${at(ms).getUTCFullYear()}`}`;
const fullDay = (ms: number) => `${WDL[at(ms).getUTCDay()]} ${dayMonth(ms)}`;
const monthYear = (ms: number) => `${MONL[at(ms).getUTCMonth()]} ${at(ms).getUTCFullYear()}`;
const iso = (r: Rand, ms: number) => `${new Date(ms).toISOString().slice(0, 19)}.${String(int(r, 0, 999999)).padStart(6, '0')}+00:00`;
const FIRST_DAY = Date.UTC(2026, 8, 14);
const LAST_DAY = Date.UTC(2026, 10, 13);
const EXPORT = Date.UTC(2026, 10, 20, 9);
const openDays: number[] = [];
for (let day = FIRST_DAY; day <= LAST_DAY; day += DAY) if (at(day).getUTCDay() !== 0) openDays.push(day);

/** Care works Monday to Saturday, 08:30 to 17:45. */
const workTime = (r: Rand, ms: number) => {
	let t = ms;
	for (let guard = 0; guard < 8; guard++) {
		const hour = at(t).getUTCHours() + at(t).getUTCMinutes() / 60;
		if (at(t).getUTCDay() === 0) t = midnight(t) + DAY + (8.5 * 60 + int(r, 0, 70)) * MIN;
		else if (hour < 8.5) t = midnight(t) + (8.5 * 60 + int(r, 0, 70)) * MIN;
		else if (hour >= 17.75) t = midnight(t) + DAY + (8.5 * 60 + int(r, 0, 70)) * MIN;
		else return t;
	}
	return t;
};
/** Customers write between 07:00 and 23:30. */
const awakeTime = (r: Rand, ms: number) => {
	const hour = at(ms).getUTCHours() + at(ms).getUTCMinutes() / 60;
	if (hour < 7) return midnight(ms) + (7 * 60 + int(r, 0, 150)) * MIN;
	if (hour >= 23.5) return midnight(ms) + DAY + (7 * 60 + int(r, 0, 150)) * MIN;
	return ms;
};

// ---------------------------------------------------------------------------------------------------------------
// People and places.
const firstNames = ['Aoife', 'Siobhán', 'Orla', 'Sinéad', 'Gráinne', 'Maeve', 'Clodagh', 'Eimear', 'Deirdre', 'Fiona', 'Karen', 'Margaret', 'Joanna', 'Agnieszka', 'Ana', 'Laura', 'Sarah', 'Rachel', 'Bríd', 'Úna', 'Helena', 'Patricia', 'Mairéad', 'Chloe', 'Ewa', 'Lucy', 'Conor', 'Cian', 'Darragh', 'Pádraig', 'Eoin', 'Ronan', 'Fergal', 'Brian', 'Liam', 'Seán', 'Kieran', 'Barry', 'Tadhg', 'Gerry', 'Piotr', 'Marco', 'Ahmed', 'Rory', 'Dónal', 'Colm', 'Niall', 'Shane', 'Mark', 'Oluwaseun'];
const surnames = ['Brennan', 'Murphy', "O'Sullivan", 'Walsh', 'McCarthy', 'Byrne', 'Ryan', "O'Connor", 'Doyle', 'Kavanagh', 'Fitzgerald', 'Quinn', 'Lynch', 'Nolan', 'Hennessy', 'Farrell', 'Dunne', 'Kowalska', 'Nowak', 'Costa', 'Okafor', 'Daly', 'Keane', 'Moran', 'Carroll', 'Galvin', 'Hegarty', 'Tierney', 'Mulcahy', 'Duggan', 'Power', 'Foley', 'Ní Bhriain', 'Mac Giolla', 'Ferreira', 'Barrett', 'Cullinane', 'Lawlor', 'Sheehy', 'Kinsella'];
const agents = ['Ciara', 'Declan', 'Niamh', 'Tomás', 'Róisín', 'Kevin', 'Aisling', 'Priya'];
const staff = { wh: ['Mick', 'Joanne', 'Dariusz'], pay: ['Helen', 'Brendan'], web: ['Oisín', 'Laura'], ord: ['Sam', 'Nora'], acc: ['Grace', 'Ultan'], trade: ['Fionnuala'] };
const places = [['Cork', 'T12'], ['Ballincollig', 'P31'], ['Galway', 'H91'], ['Limerick', 'V94'], ['Kilkenny', 'R95'], ['Sligo', 'F91'], ['Wexford', 'Y35'], ['Dublin 6', 'D06'], ['Dublin 7', 'D07'], ['Dublin 15', 'D15'], ['Athlone', 'N37'], ['Ennis', 'V95'], ['Tralee', 'V92'], ['Drogheda', 'A92'], ['Bray', 'A98'], ['Letterkenny', 'F92'], ['Waterford', 'X91'], ['Castlebar', 'F23'], ['Navan', 'C15'], ['Mullingar', 'N91'], ['Carlow', 'R93'], ['Clonakilty', 'P85'], ['Westport', 'F28'], ['Dungarvan', 'X35'], ['Naas', 'W91'], ['Tullamore', 'R35']] as const;
const streets = ['Church Road', 'Main Street', 'Oakfield Drive', 'Strand Road', 'Mill Lane', 'The Crescent', 'College View', 'Ard na Gréine', 'Sycamore Close', 'Station Road', 'Bóthar na Trá', 'Willow Park', 'Castle Street', 'Riverside Walk', 'Hazel Grove', 'Abbey Court', 'Greenfield Avenue', 'Lios na Mara', 'Friary Lane', 'Harbour View'];
const mailHosts = ['inbox.example', 'mailbox.example', 'post.example', 'webmail.example', 'homemail.example'];
const tradeHeads = ['The Copper Kettle', 'Harbour Lights', 'Salt & Fern', 'The Linen Room', 'Brook Street', 'Clover', 'Wildflower', 'The Old Bakery', 'Saltwater', 'Hawthorn House', 'Driftwood', 'Little Acorn', 'The Larder', 'Seaview', 'Marram'];
const tradeTails = ['Café', 'Guesthouse', 'Gift Shop', 'Hotel', 'Interiors', 'Deli', 'B&B', 'Coffee Co.', 'Bistro', 'Homeware'];
const depots = ['Little Island depot in Cork', 'Ballycoolin hub in Dublin', 'Athlone depot', 'Oranmore depot in Galway', 'Raheen depot in Limerick', 'Portlaoise sort centre'];
const occasions = ["my sister's birthday on Saturday", 'a housewarming next week', 'a wedding present', "my mother's seventieth", 'a leaving present for a colleague', 'a christening on Sunday', 'my daughter moving into her first flat', 'our anniversary on Friday'];
const safePlaces = ['Left in porch', 'Left with neighbour', 'Left in safe place: behind side gate', 'Left in safe place: meter box', 'Handed to resident', 'Left at front door'];
const neighbourFinds = [
	'my neighbour two doors up had it all along. The driver gave it to her and never left a card',
	'it was behind the wheelie bin, under a bag of compost my partner had put there',
	'the people across the road took it in and only got back from holidays this morning',
	'it was in the meter box, which I honestly did not know opened',
	'it was at the shop at the end of the road. They take parcels in for the whole estate, apparently'
];
const phones = ['087', '086', '085', '083', '089'];
const codeChars = 'ACDEFHKNPRTVWXY0123456789';

// ---------------------------------------------------------------------------------------------------------------
// The catalogue, in cents, as the order service stores it.
interface Product {
	slug: string;
	name: string;
	plural?: string;
	cents: number;
	kind: string;
	fragile?: boolean;
	big?: boolean;
	multi?: boolean;
	alt?: string;
}
const products: Product[] = [
	{ slug: 'mug-stoneware-sage', name: 'sage stoneware mug', cents: 1200, kind: 'mug', fragile: true, multi: true, alt: 'mug-stoneware-slate' },
	{ slug: 'mug-stoneware-slate', name: 'slate stoneware mug', cents: 1200, kind: 'mug', fragile: true, multi: true, alt: 'mug-stoneware-oat' },
	{ slug: 'mug-stoneware-oat', name: 'oat stoneware mug', cents: 1200, kind: 'mug', fragile: true, multi: true, alt: 'mug-stoneware-sage' },
	{ slug: 'lamp-ashwood-table', name: 'ashwood table lamp', cents: 6400, kind: 'lamp', fragile: true, big: true },
	{ slug: 'lamp-brass-reading', name: 'brass reading lamp', cents: 8900, kind: 'lamp', fragile: true, big: true },
	{ slug: 'shade-linen-30', name: 'linen lampshade', cents: 2800, kind: 'shade' },
	{ slug: 'bulb-e27-warm', name: 'warm-white LED bulb', cents: 600, kind: 'bulb', multi: true },
	{ slug: 'teatowel-linen-stripe', name: 'striped linen tea towel', cents: 1100, kind: 'textile', multi: true },
	{ slug: 'throw-wool-herringbone', name: 'herringbone wool throw', cents: 7900, kind: 'throw', big: true, alt: 'throw-wool-charcoal' },
	{ slug: 'throw-wool-charcoal', name: 'charcoal wool throw', cents: 7900, kind: 'throw', big: true, alt: 'throw-wool-herringbone' },
	{ slug: 'cushion-cover-rust', name: 'rust cushion cover', cents: 2400, kind: 'textile', multi: true, alt: 'cushion-cover-moss' },
	{ slug: 'cushion-cover-moss', name: 'moss cushion cover', cents: 2400, kind: 'textile', multi: true, alt: 'cushion-cover-rust' },
	{ slug: 'planter-ceramic-small', name: 'small ceramic planter', cents: 1800, kind: 'pot', fragile: true },
	{ slug: 'planter-ceramic-large', name: 'large ceramic planter', cents: 3600, kind: 'pot', fragile: true },
	{ slug: 'vase-bud-celadon', name: 'celadon bud vase', cents: 2200, kind: 'vase', fragile: true },
	{ slug: 'bowl-serving-speckle', name: 'speckled serving bowl', cents: 3400, kind: 'bowl', fragile: true },
	{ slug: 'plate-side-speckle', name: 'speckled side plate', cents: 1400, kind: 'plate', fragile: true, multi: true },
	{ slug: 'board-oak-serving', name: 'oak serving board', cents: 4200, kind: 'wood' },
	{ slug: 'candle-soy-fig', name: 'fig soy candle', cents: 1600, kind: 'candle', multi: true, alt: 'candle-soy-cedar' },
	{ slug: 'candle-soy-cedar', name: 'cedar soy candle', cents: 1600, kind: 'candle', multi: true, alt: 'candle-soy-fig' },
	{ slug: 'print-a3-harbour', name: 'harbour print', cents: 3000, kind: 'print' },
	{ slug: 'frame-oak-a3', name: 'oak A3 frame', cents: 2600, kind: 'frame', fragile: true },
	{ slug: 'jug-pouring-cream', name: 'cream pouring jug', cents: 2600, kind: 'jug', fragile: true },
	{ slug: 'teapot-stoneware-slate', name: 'slate stoneware teapot', cents: 4800, kind: 'teapot', fragile: true },
	{ slug: 'napkins-linen-set4', name: 'set of linen napkins', plural: 'sets of linen napkins', cents: 2200, kind: 'textile', multi: true },
	{ slug: 'basket-seagrass', name: 'seagrass basket', cents: 3800, kind: 'basket', big: true },
	{ slug: 'rug-jute-120', name: 'jute rug', cents: 9500, kind: 'rug', big: true },
	{ slug: 'clock-wall-oak', name: 'oak wall clock', cents: 5600, kind: 'clock', fragile: true, big: true },
	{ slug: 'coasters-cork-set6', name: 'set of cork coasters', plural: 'sets of cork coasters', cents: 900, kind: 'small' },
	{ slug: 'tumbler-glass-smoke', name: 'smoked glass tumbler', cents: 900, kind: 'glass', fragile: true, multi: true }
];
const bySlug = new Map(products.map((product) => [product.slug, product]));
const product = (slug: string) => bySlug.get(slug)!;
const plural = (p: Product) => p.plural ?? `${p.name}s`;
const article = (text: string) => (/^[aeiou]/i.test(text) ? `an ${text}` : `a ${text}`);
const phrase = (p: Product, qty: number) => (qty === 1 ? article(p.name) : `${num(qty)} ${plural(p)}`);
const damages: Record<string, [string, string][]> = {
	mug: [['one of the mugs is in three pieces', 'a mug broken into three pieces in the box'], ['the handle has come off one of the mugs', 'a mug with its handle snapped off']],
	lamp: [['the base has a crack running up from the switch', 'the lamp base with a crack from the switch to the top'], ['the neck is bent and the bulb holder rattles', 'the lamp lying on its side, the neck bent at the joint']],
	pot: [['there is a chip out of the rim the size of a thumbnail', 'the planter rim with a chip out of it'], ['it is cracked from the rim right down one side', 'a crack running down the side of the planter']],
	vase: [['the neck has broken clean off', 'the vase in two pieces, neck and body']],
	bowl: [['there is a hairline crack across the bottom, and it leaks', 'the bowl upside down, a thin crack across the base']],
	plate: [['two of the plates are chipped on the edge', 'two plates side by side, each with a chip on the rim']],
	frame: [['the glass is smashed', 'the frame with the glass shattered inside it']],
	jug: [['the spout is chipped', 'a close-up of the chipped spout']],
	teapot: [['the lid is broken in two', 'the teapot lid in two halves']],
	clock: [['the glass front is cracked and the second hand has come loose', 'the clock face with a cracked front, the second hand loose']],
	glass: [['two of the tumblers are smashed', 'broken glass in the bottom of the box']]
};

// ---------------------------------------------------------------------------------------------------------------
// Orders, as the order service keeps them.
interface Line {
	slug: string;
	qty: number;
}
interface OrderRec {
	id: number;
	status: 'pending' | 'paid' | 'shipped';
	lines: Line[];
	goods: number;
	ship: number;
	total: number;
	created: number;
	paid?: number;
	shipped?: number;
}
const EPOCH = Date.UTC(2023, 2, 1);
/** Order ids grow by about fifteen a day. */
const orderIdAt = (ms: number) => 1200 + Math.floor(((ms - EPOCH) / DAY) * 15.3);
const goodsOf = (lines: Line[]) => lines.reduce((sum, line) => sum + line.qty * product(line.slug).cents, 0);
/** Flat shipping of 5.00, free from 50.00 of goods. */
const shippingFor = (goods: number) => (goods >= 5000 ? 0 : 500);
const makeOrder = (r: Rand, lines: Line[], created: number, status: OrderRec['status'], shipDays = int(r, 1, 2)): OrderRec => {
	const goods = goodsOf(lines);
	const ship = shippingFor(goods);
	const order: OrderRec = { id: orderIdAt(created) + int(r, 0, 9), status, lines, goods, ship, total: goods + ship, created };
	if (status !== 'pending') order.paid = created + int(r, 1, 9) * MIN + int(r, 0, 59) * 1000;
	if (status === 'shipped') order.shipped = workTime(r, order.paid! + shipDays * DAY - int(r, 0, 5) * HOUR);
	return order;
};
const orderWords = (lines: Line[]) => {
	const parts = lines.map((line) => phrase(product(line.slug), line.qty));
	return parts.length === 1 ? parts[0]! : `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}`;
};

// ---------------------------------------------------------------------------------------------------------------
// Pasted output.
const table = (head: string[], rows: string[][]) =>
	[`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`, ...rows.map((row) => `| ${row.join(' | ')} |`)].join('\n');
const fence = (lines: string[], lang = '') => [`\`\`\`${lang}`, ...lines, '```'].join('\n');

interface Ctx {
	r: Rand;
	s: Record<string, string>;
	order: OrderRec;
	order2?: OrderRec;
	history: OrderRec[];
	now: number;
	cust: number;
	cart: number;
	cartLines: Line[];
	payId: string;
	courier: string;
	tracking: string;
	trade: boolean;
}
type Art = (c: Ctx, arg: string) => string;

const orderJson = (c: Ctx, o: OrderRec) => {
	const r = c.r;
	const lines = [
		'{',
		`  "id": ${o.id},`,
		`  "customer_id": ${c.cust},`,
		`  "status": "${o.status}",`,
		`  "total_cents": ${o.total},`,
		`  "shipping_cents": ${o.ship},`,
		`  "paid_at": ${o.paid ? `"${iso(r, o.paid)}"` : 'null'},`,
		`  "shipped_at": ${o.shipped ? `"${iso(r, o.shipped)}"` : 'null'},`,
		'  "items": ['
	];
	o.lines.forEach((line, index) => {
		lines.push('    {', `      "product": "${line.slug}",`, `      "quantity": ${line.qty},`, `      "unit_price_cents": ${product(line.slug).cents}`, `    }${index < o.lines.length - 1 ? ',' : ''}`);
	});
	lines.push('  ]', '}');
	return fence(lines, 'json');
};
const carrierEvents = (c: Ctx, kind: string) => {
	const r = c.r;
	const out = c.order.shipped ?? c.now - 2 * DAY;
	const depot = c.s.depot!;
	const rows: string[][] = [];
	const add = (ms: number, event: string, where: string) => rows.push([dayMonth(ms), hhmm(ms), event, where]);
	add(out, 'Collected from sender', 'Larkspur, Little Island');
	add(out + int(r, 2, 4) * HOUR, 'Sorted', pick(r, ['Portlaoise sort centre', 'Little Island depot in Cork']));
	const arrived = midnight(out) + DAY + int(r, 4 * 60, 6 * 60) * MIN;
	add(arrived, 'Arrived at delivery depot', depot);
	if (kind === 'stuck') {
		add(midnight(arrived) + int(r, 12 * 60, 15 * 60) * MIN, 'Delayed: high volumes at depot', depot);
		add(midnight(arrived) + DAY + int(r, 5 * 60, 7 * 60) * MIN, 'Held at depot', depot);
	} else {
		const delivered = Number(c.s.deliveredMs);
		add(midnight(delivered) + int(r, 7 * 60, 8 * 60 + 30) * MIN, 'Out for delivery', depot);
		add(delivered, kind === 'card' ? 'Delivery attempted: no answer, card left' : `Delivered: ${c.s.safePlace}`, c.s.town!);
	}
	return table(['Date', 'Time', 'Event', 'Where'], rows);
};
const arts: Record<string, Art> = {
	json: (c, arg) => {
		const o = c.order;
		if (arg === 'paid' && o.status === 'pending') Object.assign(o, { status: 'paid', paid: c.now - int(c.r, 2, 40) * MIN });
		if (arg === 'shipped' && o.status !== 'shipped') Object.assign(o, { status: 'shipped', shipped: c.now - int(c.r, 2, 40) * MIN });
		return orderJson(c, o);
	},
	json2: (c) => orderJson(c, c.order2!),
	tracking: (c, arg) => `${c.courier} tracking ${c.tracking}:\n\n${carrierEvents(c, arg || 'delivered')}`,
	payment: (c, arg) => {
		const r = c.r;
		const o = arg === 'second' ? c.order2! : c.order;
		const failed = arg === 'failed';
		const when = arg === 'second' ? o.created + 4 * MIN : o.paid ?? o.created + 3 * MIN;
		return fence([
			`Payment      ${arg === 'second' ? c.payId.replace(/.{4}$/, 'k2qe') : c.payId}`,
			`Description  Larkspur order ${o.id}`,
			`Amount       ${euro(o.total)}`,
			`Card         ${pick(r, ['Visa', 'Mastercard', 'Visa'])} ending ${c.s.card4} (${pick(r, ['debit', 'debit', 'credit'])})`,
			`3-D Secure   ${failed ? pick(r, ['failed: not completed in time', 'failed: rejected by issuer']) : 'passed'}`,
			`Status       ${failed ? 'failed' : 'succeeded'}`,
			`Created      ${stamp(when)}`,
			failed ? `Decline      ${pick(r, ['authentication_required', 'do_not_honour', 'insufficient_funds'])}` : `Settled      ${dayMonth(when + 2 * DAY)}`
		]);
	},
	refund: (c, arg) => {
		const o = c.order;
		const unit = product(o.lines[0]!.slug).cents;
		const amount = arg === 'total' ? o.total : arg === 'ship' ? o.ship || 500 : arg === 'unit' ? unit : arg === 'part' ? Number(c.s.retQtyN) * unit : o.lines[0]!.qty * unit;
		return fence([
			`Refund       rf_${c.payId.slice(4, 14)}${pad(int(c.r, 10, 99))}`,
			`Payment      ${c.payId}`,
			`Amount       ${euro(amount)} of ${euro(o.total)}`,
			`Reason       requested_by_customer`,
			`Status       ${arg === 'old' && c.s.refundFailed ? 'failed: card expired' : 'succeeded'}`,
			`Created      ${stamp(arg === 'old' ? Number(c.s.refundMs) : c.now - int(c.r, 1, 9) * MIN)}`,
			`ARN          ${c.s.arn}`
		]);
	},
	pack: (c) => {
		const r = c.r;
		const o = c.order;
		const bins = o.lines.map((line) => `  ${line.qty} x ${line.slug.padEnd(24)} bin ${pick(r, ['A', 'B', 'C', 'D'])}${pad(int(r, 1, 30))}`);
		return fence([
			`Order ${o.id} · bench ${int(r, 1, 4)} · packed by ${c.s.wh}`,
			...bins,
			`Weight ${(int(r, 40, 400) / 100).toFixed(2)} kg · box ${pick(r, ['S', 'M', 'L', 'XL'])} · ${c.courier} ${c.tracking}`,
			`Label printed ${((t) => `${dayMonth(t)} ${hhmm(t)}`)(o.shipped ? o.shipped - int(r, 20, 90) * MIN : workTime(r, o.paid! + DAY))}`,
			`Scanned out  ${o.shipped ? `${dayMonth(o.shipped)} ${hhmm(o.shipped)}` : 'not scanned'}`
		]);
	},
	cart: (c) => {
		const lines = ['{', `  "id": ${c.cart},`, `  "customer_id": ${c.cust},`, `  "status": "open",`, `  "updated_at": "${iso(c.r, c.now - int(c.r, 1, 50) * HOUR)}",`, '  "items": ['];
		c.cartLines.forEach((line, index) => lines.push(`    {"product": "${line.slug}", "quantity": ${line.qty}}${index < c.cartLines.length - 1 ? ',' : ''}`));
		lines.push('  ]', '}');
		return fence(lines, 'json');
	},
	unpaid: (c) => {
		const r = c.r;
		const rows = [c.order, ...(c.order2 ? [c.order2] : [])].map((o) => ({ id: o.id, cust: c.cust, created: o.created }));
		for (let k = int(r, 3, 7); k > 0; k--) {
			const created = c.order.created + int(r, -20, 6) * DAY + int(r, 0, 600) * MIN;
			rows.push({ id: orderIdAt(created) + int(r, 0, 9), cust: int(r, 40, 9300), created });
		}
		rows.sort((a, b) => a.created - b.created);
		return fence(rows.map((row) => `${row.id}\tcustomer ${row.cust}\tcreated ${iso(r, row.created)}`));
	},
	statement: (c) => {
		const r = c.r;
		const orders = [...c.history.filter((o) => o.created > c.order.created - 120 * DAY), c.order];
		return table(
			['Order', 'Placed', 'Amount', 'Paid'],
			orders.map((o) => [String(o.id), dayMonth(o.created), euro(o.total), o.paid ? `${dayMonth(o.paid)}, ${pick(r, ['bank transfer', 'bank transfer', 'card'])}` : 'not yet'])
		);
	},
	error: (c, arg) => {
		const messages: Record<string, string> = {
			qty: 'Sorry, we could not update your basket. (quantity must be at least 1)',
			customer: `Sorry, something went wrong placing your order. (unknown customer ${c.s.newCust})`,
			paid: `Sorry, we could not take your payment. (order ${c.order.id} is ${c.order.status}, not pending)`
		};
		return `[Screenshot: ${pick(c.r, ['phone, Safari', 'laptop, Chrome', 'phone, Chrome', 'tablet'])}]\n\n> ${messages[arg]}`;
	},
	photos: (c) => {
		const r = c.r;
		const p = product(c.order.lines[0]!.slug);
		const shot = (damages[p.kind] ?? damages.pot!)[Number(c.s.damageIndex)]![1];
		const n = int(r, 2001, 9800);
		return [`Attachments: IMG_${n}.jpg (${(int(r, 18, 46) / 10).toFixed(1)} MB), IMG_${n + 1}.jpg (${(int(r, 18, 46) / 10).toFixed(1)} MB)`, '', `- IMG_${n}: ${shot}.`, `- IMG_${n + 1}: the outer box, ${pick(r, ['no visible damage', 'one corner crushed', 'a tear along the top', 'wet along one side'])}, label ${c.tracking}.`].join('\n');
	},
	receipt: (c) => {
		const o = c.order;
		const rows = o.lines.map((line) => [product(line.slug).name, String(line.qty), euro(product(line.slug).cents), euro(line.qty * product(line.slug).cents)]);
		rows.push(['Delivery', '', '', euro(o.ship)], ['**Total**', '', '', `**${euro(o.total)}**`], ['of which VAT at 23%', '', '', euro(Math.round((o.total * 23) / 123))]);
		return `Larkspur Home Ltd · VAT IE 3418726PH · receipt for order ${o.id}, paid ${dayMonth(o.paid ?? c.now)}\n\n${table(['Item', 'Qty', 'Unit', 'Amount'], rows)}`;
	},
	stock: (c) => {
		const r = c.r;
		const slugs = [...new Set([c.order.lines[0]!.slug, ...products.filter((p) => p.multi).map((p) => p.slug)])].slice(0, int(r, 4, 7));
		return table(['Product', 'In stock', 'Next delivery'], slugs.map((slug) => [slug, String(int(r, 0, 140)), chance(r, 0.5) ? dayMonth(c.now + int(r, 5, 30) * DAY) : '-']));
	},
	accounts: (c) => {
		const s = c.s;
		return table(
			['Customer', 'Name', 'Email', 'Synced'],
			[[s.oldCust!, s.full!, s.oldEmail!, dayMonth(Number(s.oldSinceMs))], [s.cust!, s.full!, s.email!, dayMonth(Number(s.sinceMs))]]
		);
	},
	remittance: (c) => fence([`REMITTANCE ADVICE · ${c.s.shop}`, `Paid to       Larkspur Home Ltd`, `Amount        ${euro(c.order.total)}`, `Value date    ${dayMonth(c.now - int(c.r, 3, 9) * DAY)}`, `Reference     ${pick(c.r, ['LARKSPUR', `INV ${c.order.id - int(c.r, 30, 300)}`, c.s.shop!.toUpperCase().slice(0, 18), 'STOCK ORDER'])}`, `From account  IE${int(c.r, 10, 99)} ${pick(c.r, ['AIBK', 'BOFI', 'IPBS'])} **** **** ${int(c.r, 1000, 9999)}`]),
	mine: (c) =>
		table(
			['Order', 'Status', 'Total'],
			[...c.history, c.order].map((o) => [String(o.id), { pending: 'Waiting for payment', paid: 'Being packed', shipped: 'Shipped' }[o.status], euro(o.total)])
		),
	returnform: (c) => {
		const p = product(c.order.lines[0]!.slug);
		return table(['Field', 'Answer'], [['Order', String(c.order.id)], ['Item', p.name], ['Quantity', c.s.retQty!], ['Reason', c.s.reason!], ['Condition', pick(c.r, ['Unused, in original packaging', 'Unused, packaging opened', 'Used once'])], ['Refund to', 'Original card']]);
	},
	claim: (c) => fence([`Claim ${pick(c.r, ['BPC', 'CLM'])}-${int(c.r, 100000, 999999)}`, `Consignment   ${c.tracking}`, `Declared      ${euro(c.order.goods)}`, `Type          ${c.s.claimType}`, `Opened        ${stamp(c.now - int(c.r, 2, 30) * MIN)}`, `Status        awaiting carrier review (up to 10 working days)`])
};

// ---------------------------------------------------------------------------------------------------------------
// What customers write about. Each topic is a script: one message per line, `X|text`, where X is C (customer),
// c (customer, short), A (care agent), N (internal note), W (warehouse), P (finance), B (web team), O (orders
// team), X (accounts team), S (trade sales) or K (courier). A leading ? makes a line optional, a leading + puts
// days before it, `a || b` picks one, {name} fills a slot and [[name:arg]] pastes output.
type Status = 'none' | 'pending' | 'paid' | 'shipped';
interface Path {
	s: string[];
	open?: string[];
	reply?: string[];
	status?: Status;
	set?: Record<string, string>;
}
interface Topic {
	key: string;
	weight: number;
	status: Status;
	pick?: 'fragile' | 'big2' | 'multi' | 'several' | 'under50' | 'variant' | 'trade' | 'tradeBig' | 'fixable';
	age: [number, number];
	trade?: boolean;
	form: string;
	subjects: string[];
	open: string[];
	reply: string[];
	mid?: string[];
	paths: Path[];
	/** A follow-up question about the matter, and its answer. */
	more?: [string, string];
	quick: [string, string];
}

const topics: Topic[] = [
	{
		key: 'nondelivery',
		weight: 12,
		status: 'shipped',
		age: [3, 9],
		form: 'Delivery',
		subjects: ['Parcel not here', 'Order {order}', 'Where is my order?', 'Delivered?? Not here', 'Missing delivery', 'Refund?'],
		open: [
			`My order {order} says it was delivered on {deliveredDay} but nothing has arrived. I was working from home all day and nobody knocked. Can you find out where it went?`,
			`The tracking for my order shows delivered, but there is no parcel here: not at the door, not in the porch, not in the bin shed, and the neighbours on both sides haven't seen it. It's {items}.\n\nIf it can't be found I suppose I'll need a refund, but I'd much rather have the things.`,
			`Can you check on order {order}? The text from {courier} said it was delivered on {deliveredDay}, but I've been in and out and can't find it anywhere.`
		],
		reply: [
			`I'm sorry it hasn't turned up. I can see the parcel was handed to {courier} on {shippedDay}. Could you confirm the address you were expecting it at, with the Eircode? Drivers sometimes leave parcels in a safe place or with a neighbour without leaving a card.`,
			`Thanks for letting us know, and sorry for the worry. Before I chase {courier}, could you confirm the delivery address and Eircode, and whether anyone else at home might have taken it in?`
		],
		mid: [
			`c|It's {addr}, {eircode}. Nobody else was in. || {addr}, {eircode}, same as the last order. No card through the door.`,
			`N|[[tracking:delivered]]`,
			`A|Thanks, {first}. {courier} have it as delivered at {delTime} on {deliveredDay}, with the note "{safePlace}". I've asked them for the driver's GPS location and the delivery photo, which usually takes a working day or two. I'll come back to you as soon as I hear.`
		],
		paths: [
			{ s: [`C|Mystery solved: {neighbourFind}. Sorry for the bother!`, `?A|No bother at all, I'm glad it turned up. Enjoy everything, and I'll tell {courier} so the driver leaves a card next time.`] },
			{
				s: [
					`K|We have reviewed the delivery of consignment {tracking}. The proof of delivery photo was taken at {wrongAddr}. The driver has been spoken to. A claim can be raised by the sender through the business portal.`,
					`A|{courier} have come back: the photo shows the parcel at {wrongAddr}, so it went to the wrong house. Our warehouse team handle courier claims and replacements, so I've passed it to them with everything {courier} sent. They'll be in touch with you once the claim is lodged.`,
					`N|Handed to {wh} at the warehouse with the photo, the tracking and the claim link.`,
					`?c|Thanks, I'll wait to hear from them.`
				]
			},
			{
				s: [
					`K|The driver confirms the parcel was left at the address in a safe place at the rear of the property. GPS location matches the delivery address. No further action.`,
					`C|There's no safe place at the back. It's a terrace and we don't have a back garden, just a yard with a locked gate. I've checked again. It isn't here.`,
					`N|Customer is sure. Not worth arguing with {courier} over one parcel; asked {wh} to send a replacement and we'll claim separately.`,
					`W|Replacement for {order} packed and handed to {courier} this afternoon, tracking {tracking2}. Same items as the original.`,
					`A|I'm sorry about the runaround. We've sent a replacement today, tracking {tracking2}, and we'll take the claim up with {courier} ourselves. It should be with you in one to three working days.`,
					`C|It came this morning, and the driver actually knocked this time. Thanks for sorting it.`
				]
			},
			{
				s: [
					`K|To investigate further we require a signed declaration of non-receipt from the recipient. Please ask the recipient to complete the attached form and return it within 7 days.`,
					`A|{courier} won't open an investigation without a signed non-receipt declaration from you, sorry. I've attached the form. Could you fill it in, sign it and send it back to me? As soon as I have it I can get a claim going and talk to the warehouse about a replacement.`,
					`?+A|Just checking in on the declaration form for {courier}. I can't move the claim on without it, so whenever you get a moment.`
				]
			}
		],
		more: [`Will this happen again next time? I order from you fairly often.`, `I hope not. I've added a note to your account asking for parcels to be handed over or left with a card, and the warehouse prints it on your labels.`],
		quick: [`The tracking on my last parcel said delivered while it was still in the van. Does that happen a lot?`, `It happens now and then: some drivers scan a whole street as delivered at the first stop. It nearly always arrives the same day, but if it doesn't, tell us and we'll chase it.`]
	},
	{
		key: 'notshipped',
		weight: 10,
		status: 'paid',
		age: [6, 11],
		form: 'Delivery',
		subjects: ['Order not sent', 'Order {order}', 'Still being packed?', 'When will my order ship?', 'Quick question'],
		open: [
			`I ordered {items} on {orderDay} and the website still says "Being packed". It's been over a week now, and I need it for {occasion}. Has it been forgotten?`,
			`Order {order}. Paid on {paidDay}, no dispatch email, no tracking, nothing. Is there a problem with it?`,
			`Just wondering what's happening with order {order}. I paid on {paidDay} and normally your things arrive within a couple of days, but this time there's been nothing at all.`
		],
		reply: [
			`Sorry for the wait, {first}. I can see order {order} was paid on {paidDay} and hasn't been marked as shipped yet, which is longer than it should be. Let me check with the warehouse and come back to you today.`,
			`Thanks for chasing, and sorry it's taking so long. Order {order} is paid but not marked as sent. I'm checking with the warehouse now.`
		],
		mid: [`N|[[json]] Asked {wh} on the warehouse channel.`],
		paths: [
			{
				s: [
					`W|Found it. It was packed on {packDay} and went out with that evening's collection, but the label never got scanned at the bench, so it was never marked as shipped. Marked it now. [[pack]]`,
					`N|[[json:shipped]]`,
					`A|Good news: your order did leave us, on {packDay}, but it was never scanned out, so the website kept saying "Being packed" and you never got the dispatch email. It's with {courier}, tracking {tracking}, and it should be with you in the next day or two. Sorry for the worry.`,
					`?C|It arrived this morning, just in time. Thanks for chasing it.`
				]
			},
			{
				s: [
					`W|The {prod} is out of stock. We're waiting on the next delivery from the maker, due around {restockDay}. Everything else in the order is on the shelf.`,
					`A|I'm sorry, I should have caught this sooner: the {prod} is out of stock until about {restockDay}, which is why the order is still waiting. We can hold the whole order until then, or send the rest now and the {prod} when it arrives, at no extra delivery cost. Which would you prefer?`,
					`?+A|Just checking whether you'd like us to send the rest of your order now or wait for the {prod}. Nothing will go out until I hear from you.`
				]
			},
			{
				s: [
					`W|The {prod} is out of stock until around {restockDay}. The rest is here.`,
					`A|I'm sorry, the {prod} has sold out and the next delivery is due around {restockDay}. We can hold the whole order, or send the rest now and the {prod} later, at no extra cost. Which would you prefer?`,
					`C|Send the rest now please, and the {prod} when you can.`,
					`W|Rest of {order} sent today, {courier} {tracking}. The {prod} is on the reserve list for the next delivery.`,
					`A|Done: everything except the {prod} left today with {courier}, tracking {tracking}. The {prod} is reserved for you and will follow as soon as the delivery comes in, around {restockDay}.`
				]
			},
			{
				s: [
					`W|Not on the bench and not in the shipped pile. I'll go through the pick lists and come back to you.`,
					`A|The warehouse can't find your order on the packing benches, so {wh} is going through the pick lists to see where it went. I've left it with the warehouse team, who'll write to you here as soon as they find it.`,
					`N|Left with {wh}. If it hasn't turned up by the end of the week we resend.`
				]
			}
		],
		more: [`Will I get an email when it's sent?`, `Yes, an email with the tracking link goes out as soon as the parcel is scanned out at the warehouse.`],
		quick: [`How long do orders usually take to leave you?`, `Most leave the warehouse the next working day, and lamps and rugs within two. If an order hasn't been marked as sent after three working days, it's worth asking us.`]
	},
	{
		key: 'damaged',
		weight: 12,
		status: 'shipped',
		pick: 'fragile',
		age: [1, 6],
		form: 'A product',
		subjects: ['Damaged item', 'Broken in the post', 'Order {order}', 'Not happy', 'Return'],
		open: [
			`The {prod} from order {order} arrived today and {damage}. The box looked fine from the outside, so I think it happened before it was packed, or in the box.`,
			`Afraid my parcel came damaged: {damage}. It was meant for {occasion}, so I'm a bit gutted.`,
			`Unpacked my order last night and {damage}. Really disappointing, as I've been waiting for it for a while.`
		],
		reply: [
			`I'm sorry, that's not how it should have reached you. Could you send me a photo of the damage and one of the outside of the box, with the label? We don't need anything back.`,
			`Oh no, sorry about that. If you can send a couple of photos, one of the {prod} and one of the box, I'll get it sorted straight away.`
		],
		paths: [
			{
				s: [
					`C|Photos attached. [[photos]]`,
					`A|Thanks, {first}, that's clear enough. I've asked the warehouse to send a replacement {prod} today, packed with extra padding this time. No need to send the broken one back; please recycle it carefully.`,
					`W|Replacement {prod} for {order} out today, double-boxed. {courier} {tracking2}.`,
					`?A|Your replacement is on its way: {courier} tracking {tracking2}.`,
					`?C|Arrived today in one piece. Thanks for being so quick about it.`
				]
			},
			{
				s: [
					`C|Photos attached. [[photos]] To be honest I'd rather have the money back than wait for another one; it was for {occasion} and that's been and gone.`,
					`A|Of course. I've refunded {lineAmt} for the {prod} to your card ending {card4} just now. It usually shows within three to five working days.`,
					`N|Refunded in Tillwise: [[refund:line]] Added to the refunds sheet for finance.`,
					`?c|Grand, thanks for sorting it so quickly.`
				]
			},
			{
				s: [
					`+A|Just checking in: could you send a photo of the damage and the box when you get a chance? Once I have them I can send a replacement straight away.`,
					`?+A|I'll keep this ticket open for another week. Reply here with the photos whenever suits and I'll get a replacement out.`
				]
			},
			{
				s: [
					`C|Photos attached. [[photos]]`,
					`W|None left that aren't seconds. Next batch due around {restockDay}. Leave it with me: I'll reserve one and contact the customer when it lands.`,
					`A|Thank you for the photos. The {prod} has sold out since your order, so I've passed this to {wh} in the warehouse, who has reserved one from the next batch, due around {restockDay}, and will contact you directly when it ships.`,
					`?C|OK, thanks. I'll wait to hear from them.`
				]
			}
		],
		more: [`Should I keep the box, in case the courier wants to see it?`, `No need. Your photos are enough for us, so the box can go in the recycling.`],
		quick: [`Do you pack the stoneware in plastic?`, `No plastic at all: paper honeycomb around each piece and recycled card boxes. Breakages are rare, but if anything arrives damaged, send us a photo and we replace it.`]
	},
	{
		key: 'wrongitem',
		weight: 8,
		status: 'shipped',
		pick: 'variant',
		age: [1, 6],
		form: 'Returns and refunds',
		subjects: ['Wrong item', 'Wrong colour sent', 'Order {order}', 'Mix-up', 'Exchange'],
		open: [
			`I ordered {prodA} but I've been sent {wrongA}. The packing slip is right, it's just what's in the box that isn't. Can you swap it?`,
			`Small mix-up with order {order}: there's {wrongA} in the box instead of the {prod} I ordered. I'd like the {prod}, please.`,
			`I've opened my parcel and it's {wrongA}, not the {prod} I picked. I double-checked my order confirmation and it definitely says {prod}.`
		],
		reply: [`Sorry about that, {first}. Before I sort it, could you confirm everything else in the order was right?`, `Apologies for the mix-up. Was the rest of the order correct?`],
		mid: [`c|Yes, the rest is all fine. || Everything else is right, just that one.`, `N|[[pack]]`],
		paths: [
			{
				s: [
					`A|Thanks. I've asked the warehouse to send the right {prod} today, and you're welcome to keep the {wrong} with our apologies; bringing it back would cost more than it's worth.`,
					`W|Correct item for {order} out today, {courier} {tracking2}.`,
					`?C|The right one came today. And thanks for letting me keep the other one, it's gone to my sister.`
				]
			},
			{
				s: [
					`A|Thanks. I've emailed you a free returns label for the {wrong}; once it's dropped at a Brightpost point, the warehouse sends the {prod} the same day.`,
					`?+A|Just checking whether you've had a chance to drop the return off. The swap goes out as soon as the label is scanned.`
				]
			},
			{
				s: [
					`A|Thanks. This is the second mix-up between these two this month, so I've asked the warehouse to check the shelves before sending yours.`,
					`W|Both bins had the wrong labels. Doing a full count of that shelf this afternoon; I'll send the customer's replacement once the count is done and write to them myself.`,
					`A|The warehouse found the shelf labels had been swapped, which explains it. They're recounting this afternoon, and {wh} will send your {prod} and write to you as soon as that's done.`
				]
			},
			{
				s: [
					`A|Thanks. I've emailed you a free returns label for the {wrong}; once it's dropped at a Brightpost point, the warehouse sends the {prod} the same day.`,
					`C|Dropped it off this morning on my way to work.`,
					`W|Return for {order} scanned at the drop-off point. Swap sent, {courier} {tracking2}.`,
					`A|Your return has been scanned and the {prod} is on its way: {courier} {tracking2}.`
				]
			}
		],
		more: [`Do I need to keep the packing slip?`, `No, we have everything on our side, so there's no need.`],
		quick: [`Can I swap a colour if I change my mind?`, `Yes, within 30 days of paying, as long as it's unused. Use the returns form and say which colour you'd like instead.`]
	},
	{
		key: 'missingitem',
		weight: 8,
		status: 'shipped',
		pick: 'multi',
		age: [1, 5],
		form: 'Delivery',
		subjects: ['Item missing', 'Something missing from my order', 'Order {order}', 'Parcel arrived', 'Only part of my order'],
		open: [
			`My order came today but the {missing} isn't in the box. Everything else is there, and the packing slip lists it.`,
			`Got my parcel, thanks, but one thing's missing: {missingA}. Is it coming separately?`,
			`Order {order} arrived, but the {missing} isn't in it. Should I wait for another parcel?`
		],
		reply: [`Thanks for letting me know. Let me check the packing record for order {order} and come back to you.`, `Sorry about that, {first}. I'll look at how order {order} was packed.`],
		mid: [`N|[[pack]]`],
		paths: [
			{
				s: [
					`A|The pack record has the {missing} going into the same box as the rest. Small things are sometimes wrapped inside something bigger, or lie flat under the paper at the bottom. Could you have one more look before I send another?`,
					`C|Found it! It was flat at the bottom under the paper. Sorry!`,
					`?A|No need to apologise, it happens all the time. Enjoy everything.`
				]
			},
			{
				s: [
					`A|The pack record shows the {missing} as packed, but I believe you; it happens. I've asked the warehouse to send it today.`,
					`W|{missing} for {order} sent on its own, {courier} {tracking2}.`,
					`?c|Got it, thanks.`
				]
			},
			{
				s: [
					`A|The pack record has the {missing} in the same box as the rest. It's sometimes wrapped inside something bigger or flat under the paper. Could you have one more look before I send another?`,
					`+A|Just checking whether the {missing} turned up when you looked again. If not, tell me and I'll send another.`
				]
			},
			{
				s: [
					`A|The pack record has it in the same box. Could you have one more look, in case it's flat under the paper?`,
					`C|Definitely not here. I've emptied the box and gone through all the paper.`,
					`A|Thanks for checking. The warehouse weighs parcels at the bench, so they can tell from the weight whether it was in there. I've passed it to them to look into, and they'll write to you with what they find and send the {missing}.`,
					`N|Passed to {wh} with the parcel weight question.`
				]
			}
		],
		more: [`Will I be charged delivery again for it?`, `No, anything we send to put an order right goes free.`],
		quick: [`If I order two things, do they come in one box?`, `Usually, yes. Lamps and rugs go separately with Corrib Couriers, so an order with one of those can come as two parcels.`]
	},
	{
		key: 'address',
		weight: 6,
		status: 'paid',
		age: [0, 0],
		form: 'Delivery',
		subjects: ['Change of address', 'Wrong address!', 'Order {order}', 'URGENT', 'Delivery address'],
		open: [
			`I've just ordered and realised it's going to my old address. Can you change it to {addr}, {eircode}, before it goes out? Order {order}.`,
			`Help, I put the wrong address on order {order}. I moved in August and the website filled in the old one. New address is {addr}, {eircode}.`
		],
		reply: [`Thanks for catching it so quickly, {first}. Let me check with the warehouse whether it's been packed yet.`, `No problem, {first}. I'll ask the warehouse right away whether it's left yet.`],
		paths: [
			{
				s: [
					`W|Not picked yet. Changed the label to the new address.`,
					`A|All done: the warehouse hadn't packed it yet, so it'll go to {addr}. You might want to update the address in your account too, so the next order doesn't do the same.`,
					`?c|Will do, thanks a million.`
				]
			},
			{
				s: [
					`W|Already on the {courier} van, left this morning.`,
					`A|I'm afraid it had already left with {courier} this morning. The warehouse team can ask {courier} to redirect it, so I've passed it to them. They'll let you know once it's confirmed; if the redirect fails, the parcel comes back to us and we send it out again at no cost.`,
					`N|Passed to {wh} for a redirect request with {courier}.`
				]
			},
			{
				s: [
					`A|To make sure it goes to the right place, could you send the full new address as you'd like it on the label, including the house name if there is one? The address you sent doesn't match the Eircode in our address checker.`,
					`N|Asked {wh} to hold {order} until the customer confirms the address.`,
					`?+A|Just a reminder that the order is on hold until I have the address. Reply whenever you can and I'll release it.`
				]
			},
			{
				s: [
					`W|Already left with {courier} this morning.`,
					`A|It had already left with {courier}, so I've asked them to redirect it. That usually works within the same county.`,
					`K|Redirect request for consignment {tracking} accepted. New delivery address applied.`,
					`A|{courier} have accepted the redirect, so it'll come to {addr}, probably a day later than planned.`,
					`?c|Brilliant, thank you!`
				]
			}
		],
		more: [`Will the tracking link still work?`, `Yes, the tracking number stays the same, and it updates once the change goes through.`],
		quick: [`Can I change the address on an order once it's placed?`, `If it hasn't been packed, yes; reply to your confirmation email straight away and we'll change the label.`]
	},
	{
		key: 'courierdelay',
		weight: 7,
		status: 'shipped',
		age: [4, 9],
		form: 'Delivery',
		subjects: ['Tracking not moving', 'Parcel stuck', 'Order {order}', 'Is my parcel lost?', 'Delivery'],
		open: [
			`My order {order} has said "Arrived at delivery depot" for days and hasn't moved. Is it lost?`,
			`Can you check on my parcel? The tracking hasn't changed in four days and {courier} won't answer the phone.`,
			`Is there any news on order {order}? The tracking has been stuck at the depot since the weekend.`
		],
		reply: [`Sorry for the wait. I'll check the tracking and chase {courier}.`, `Thanks, {first}. Let me look at where it is and get on to {courier}.`],
		mid: [`N|[[tracking:stuck]]`],
		paths: [
			{
				s: [
					`A|{courier} have told us their {depot} fell badly behind after the weekend, and they're clearing it now. Your parcel is on a van for tomorrow. If it isn't with you by Friday, tell me and I'll send a replacement.`,
					`C|It finally turned up, a bit squashed but all fine inside. Thanks.`
				]
			},
			{
				s: [
					`K|We are unable to locate consignment {tracking}. It has been marked as missing in our network. Please raise a claim through the business portal.`,
					`A|I'm sorry, {courier} have now said they can't find the parcel. Our warehouse team handle these claims and will send you a replacement; I've passed everything to them and they'll be in touch.`,
					`N|Passed to {wh}: missing at depot, claim needed, customer wants the same items. [[claim]]`
				],
				set: { claimType: 'Lost in network' }
			},
			{
				s: [
					`A|{courier} say a delivery was attempted and the parcel went back to their {depot}, where they'll hold it for five working days. You can collect it there with photo ID, or rebook a delivery on their site with the tracking number {tracking}.`,
					`?+A|Just checking whether you managed to collect or rebook the parcel. {courier} send it back to us if it isn't collected by the end of the week.`
				]
			}
		],
		more: [`Is there any compensation for the delay?`, `The courier doesn't offer any, I'm afraid, but if it doesn't arrive in time for when you need it, tell me and we'll make it right.`],
		quick: [`Which courier do you use?`, `We use Brightpost for most parcels, and Corrib Couriers for lamps, rugs and anything big, who text you to choose a day.`]
	},
	{
		key: 'doublecharge',
		weight: 8,
		status: 'paid',
		age: [0, 3],
		form: 'Payment',
		subjects: ['Charged twice', 'Double payment', 'Order {order}', 'Two payments taken', 'Payment problem'],
		open: [
			`I've been charged twice for my order: two payments of {total} on my card on {paidDay}. Please refund one.`,
			`My banking app shows two payments to Larkspur for the same amount. I only meant to place one order, {order}. Can you look into it?`,
			`Two payments of {total} have come out of my account for order {order}. I only pressed Pay once, I think. Could you check and refund the extra one?`
		],
		reply: [`Sorry for the worry, {first}. Could you tell me the last four digits of the card, so I can find both payments?`, `I'm sorry about that, {first}. To find both payments, could you tell me the last four digits of the card you used?`],
		mid: [`c|It ends in {card4}. || Card ending {card4}.`],
		paths: [
			{
				s: [
					`N|Only one payment succeeded: [[payment]] The first attempt was authorised and released when the customer tried again.`,
					`A|Thanks. Only one payment went through on our side. The other is a hold from the first attempt, which your bank releases on its own, usually within five working days; it never leaves your account. If it's still there next week, let me know.`,
					`+C|You were right, the second one has disappeared. Thanks.`
				]
			},
			{
				s: [
					`N|Two orders a few minutes apart, both paid: [[json]] [[json2]] [[payment:second]]`,
					`A|You're right: the checkout created two orders, {order} and {order2}, and both were paid. I've refunded {total} for {order2} in full, and asked the warehouse to send only {order}.`,
					`N|Refunded {order2} in Tillwise. It still shows as paid in the lookup, so I've emailed {wh} to keep it off the bench.`,
					`?C|Thank you, I can see the refund pending already.`
				]
			},
			{
				s: [
					`N|Only one payment in Tillwise for card {card4}. Nothing else from us that day.`,
					`A|I can only see one payment from us on your card. The second may be from a different shop with a similar name, or a hold. I've passed it to our finance team, who can see the bank's side of things, and they'll get back to you directly.`,
					`P|Picked up. Will compare against the settlement report for that day and reply to the customer.`
				]
			},
			{
				s: [
					`N|Only one payment for card {card4}.`,
					`A|I can only see one payment from us. Could you send a screenshot of the two payments from your banking app, with the amounts and the descriptions? That will show me what the second one is.`,
					`?+A|Just following up: if you can send the screenshot of the two payments, I'll get to the bottom of it.`
				]
			}
		],
		more: [`Will this happen again if I use the same card?`, `It shouldn't. If the payment page seems to hang, wait a minute and check My orders before trying again.`],
		quick: [`Why does my card show a pending payment from you when I didn't finish checking out?`, `That's a hold your bank puts on while the payment is checked. If the payment isn't completed, the bank releases it within a few days and nothing is taken.`]
	},
	{
		key: 'paidpending',
		weight: 9,
		status: 'pending',
		age: [0, 2],
		form: 'Payment',
		subjects: ['Paid but says waiting for payment', 'Order {order}', 'Payment', 'Do I need to pay again?', 'Help'],
		open: [
			`I paid for my order earlier and the money has been taken, but the website still says "Waiting for payment". Do I need to pay again?`,
			`Order {order} says waiting for payment but I've already paid; it's gone from my account. I don't want to be charged twice.`,
			`Bit confused: my card was charged {total} for order {order}, but My orders says I haven't paid. Which is right?`
		],
		reply: [`Please don't pay again, {first}. Let me check the payment side and come back to you.`, `Thanks for checking before paying again, {first}; please don't. I'll look at what happened to the payment.`],
		paths: [
			{
				s: [
					`N|[[payment]] Paid fine; the order never got marked. Asked {pay} to mark it paid.`,
					`P|Marked {order} as paid. [[json:paid]]`,
					`A|Your payment went through, but our order system never heard about it, so the order stayed at "Waiting for payment". Finance have marked it as paid now, and it'll be packed within a day.`,
					`?c|Thanks for sorting that.`
				]
			},
			{
				s: [
					`N|[[payment:failed]] What the customer sees is the bank's hold for the failed attempt.`,
					`A|The payment didn't complete: the bank's security check timed out, so what you can see is a hold that will drop off in a few days. Your order is still there and waiting. Could you try paying again from the order page in My orders? If it fails again, try a different card and let me know.`,
					`?+A|Just checking whether you managed to pay for order {order}. It's waiting for you in My orders.`
				]
			},
			{
				s: [
					`N|No payment in Tillwise for this order or this card in the last week.`,
					`A|I can't see any payment for this order on our side, so I've passed it to our finance team, who can trace it from the bank's end. They'll come back to you on this ticket. Please don't pay again in the meantime.`,
					`P|On it. I'll check the day's settlement file and reply to the customer.`
				]
			},
			{
				s: [
					`N|[[payment]] The payment went through on a second order, {order2}, which is paid. {order} is the first attempt and still pending.`,
					`A|Your payment did go through, but on a second order: the checkout started a new order when you went back to pay. {order2} is paid and will be packed, so you don't need to do anything. {order} is the first attempt; you won't be charged for it, but it will keep showing as "Waiting for payment" in My orders.`,
					`C|Can you delete the unpaid one? I don't want to pay it by mistake.`,
					`A|I'm afraid we can't remove or cancel an unpaid order at the moment; there's no way to do it in our order system yet. I've asked the orders team for it, as you're not the only one. If you ever did pay it by mistake, we'd refund it straight away.`,
					`O|Noted. Cancelling unpaid orders is on the list; no date yet.`
				]
			}
		],
		more: [`Will the delivery be later because of this?`, `Maybe a day later than usual, but it goes out as soon as the payment side is sorted.`],
		quick: [`My order said "Waiting for payment" for a few minutes after I paid. Is that normal?`, `For a minute or two, yes, while the payment is confirmed. If it still says that an hour later, let us know.`]
	},
	{
		key: 'declined',
		weight: 6,
		status: 'pending',
		age: [0, 1],
		form: 'Payment',
		subjects: ['Card declined', 'Payment keeps failing', 'Checkout not working', 'Three orders?', 'Problem paying'],
		open: [
			`I tried to pay three times earlier and the card kept failing, and now I have orders saying "Waiting for payment". I don't want three of everything! My card works everywhere else.`,
			`Your checkout keeps saying my payment failed. I tried my debit card and then my credit card. Is something wrong on your side?`
		],
		reply: [`Sorry for the hassle, {first}. Let me look at the payment attempts and come back to you.`, `Thanks for letting us know, {first}, and sorry for the trouble. I'll look at what happened with each attempt.`],
		mid: [`N|[[payment:failed]]`],
		paths: [
			{
				s: [
					`A|The payments were declined by your bank's security check rather than on our side. Banks sometimes block a first payment to a new shop. If you approve it in your banking app, or ring the bank, it should go through. You won't be charged for the failed attempts.`,
					`?+A|Just checking whether you managed to get the payment through. Your order is still waiting in My orders.`
				]
			},
			{
				s: [
					`A|The payments were declined by your bank's security check, not by us. If you approve it in your banking app or ring the bank, it should go through, and you won't be charged for the failed attempts.`,
					`C|Rang the bank, they had blocked it as suspicious. Paid now and it went through.`,
					`N|[[json:paid]]`,
					`?A|Great, it's through and will be packed tomorrow.`
				]
			},
			{
				s: [
					`A|The payments were declined by your bank's security check, not by us. Approving it in your banking app usually does it, and the failed attempts won't be charged.`,
					`C|Paid with my partner's card in the end and that worked. But now My orders shows the paid one plus the failed ones. Can you get rid of the failed ones?`,
					`A|I'm sorry, I can't: the order system has no way to cancel or remove an unpaid order yet. They won't be charged or sent, and I've told the orders team you'd like them gone. I'll come back to you when it's possible.`,
					`N|Another request for cancelling unpaid orders. Added to the list for {ord}.`
				]
			}
		],
		more: [`Is it safe to keep trying?`, `Yes. Failed attempts are never charged; at most they show as holds that your bank releases.`],
		quick: [`Do you take Revolut cards?`, `We do. Any Visa or Mastercard works, including Revolut, and Apple Pay and Google Pay too.`]
	},
	{
		key: 'transfer',
		weight: 5,
		status: 'pending',
		pick: 'trade',
		trade: true,
		age: [6, 18],
		form: 'Payment',
		subjects: ['Payment sent', 'Order {order} not delivered', 'Stock order', '{shop}: order', 'Bank transfer'],
		open: [
			`We paid for order {order} by bank transfer on {transferDay} but your website still says it's waiting for payment, and the stock hasn't arrived. We need it for the weekend.`,
			`Hi, {shop} here. We sent payment for our last order a week ago and haven't had a delivery. Can you check?`
		],
		reply: [`Thanks, {first}. Bank transfers are matched by our finance team; let me check with them.`, `Sorry for the delay, {first}. Finance match the bank transfers, so I'll check with them now.`],
		mid: [`N|[[json]]`],
		paths: [
			{
				s: [
					`P|Found it: it came in on {transferDay} without the order number, under "{shopUpper}". Matched and marked as paid now.`,
					`N|[[json:paid]]`,
					`A|Finance found your transfer; it came in without the order number, so it wasn't matched automatically. The order is marked as paid and the warehouse will send it tomorrow. If you put the order number in the reference next time, it's matched the same day.`,
					`?c|Will do. Thanks for the quick turnaround.`
				]
			},
			{
				s: [
					`A|Finance can't see the transfer yet. Could you send the remittance advice so they can trace it?`,
					`C|Here you go. [[remittance]]`,
					`A|Thanks. I've passed the remittance to our finance team, who'll trace the payment with the bank and confirm with you directly; they release the order as soon as it's found.`,
					`N|Passed to {pay} with the remittance.`
				]
			},
			{
				s: [
					`A|Finance can't see a transfer for this amount yet. Could you send the remittance advice or a screenshot from your bank, so they can trace it?`,
					`?+A|Just checking in on the remittance for order {order}. Once finance can match it, the order goes out the next day.`
				]
			}
		],
		more: [`Can we pay by card next time instead, to avoid this?`, `Yes, trade orders can be paid by card at the checkout, and they go out the next day.`],
		quick: [`What reference should we use when we pay by transfer?`, `The order number on its own is best, for example 18450. Finance then match it the same day.`]
	},
	{
		key: 'shippingcharge',
		weight: 8,
		status: 'paid',
		pick: 'under50',
		age: [1, 1],
		form: 'Payment',
		subjects: ['Delivery charge', 'Why was I charged delivery?', 'Order {order}', 'Free delivery?', 'Overcharged'],
		open: [`Why was I charged {ship} delivery on order {order}? I thought delivery was free over €50.`, `I've been charged for delivery, but the banner on the website says free delivery over fifty euro. Can you check order {order}?`, `Small thing, but order {order} has a {ship} delivery charge on it, and I was sure I'd get free delivery. Have I misread something?`],
		reply: [`Thanks, {first}, let me have a look at the order.`, `Let me check that for you, {first}.`],
		paths: [
			{
				s: [
					`A|Free delivery starts when the goods come to €50.00. Your order came to {goods} of goods, so the {ship} delivery charge applied. I know it's close!`,
					`C|Ah, I see. I thought it was €50 including delivery. Fair enough.`
				]
			},
			{
				open: [`I placed two orders yesterday, {order2} and {order}, because I forgot something the first time. I've paid delivery twice. Together they're well over €50. Can you refund one?`],
				s: [
					`N|Both orders paid, neither packed yet. [[json2]] [[json]]`,
					`A|Both orders were still waiting to be packed, so I've asked the warehouse to send them together and refunded the {ship} delivery on {order}. It should show on your card in a few days.`,
					`N|Refunded in Tillwise: [[refund:ship]] Told {wh} to pack {order} and {order2} together.`,
					`?c|That's very fair, thank you.`
				]
			},
			{
				s: [
					`A|Free delivery starts at €50.00 of goods, and your order came to {goods}. It hasn't been packed yet: if you'd like to add something to reach €50, place a second order today and I'll refund this one's delivery and have them packed together. Let me know.`,
					`N|Asked {wh} to hold {order} until tomorrow.`,
					`?+A|Just checking whether you'd like to add anything before your order is packed; otherwise it'll go out as it is tomorrow.`
				]
			}
		],
		more: [`Does the €50 include VAT?`, `Yes, all our prices include VAT, so it's €50.00 of goods as shown in the basket.`],
		quick: [`Is delivery free if I spend over €50?`, `Yes: delivery is €5.00, and free when the goods come to €50.00 or more.`]
	},
	{
		key: 'return',
		weight: 12,
		status: 'shipped',
		age: [8, 24],
		form: 'Returns and refunds',
		subjects: ['Return', 'Returning an item', 'Order {order}', 'Refund please', 'Not for me'],
		open: [`I'd like to return the {prod} from order {order}: {reasonText}. How do I do that?`, `Hi, the {prod} isn't quite what I expected; {reasonText}. Can I send it back for a refund?`, `The {prod} from order {order} isn't right for us: {reasonText}. What's the easiest way to send it back?`],
		reply: [`Of course. Could you fill in the returns form? I've attached the link. Once it's in I'll email a free returns label.`, `No problem at all. If you fill in the returns form at the link I've attached, I'll send you a free returns label as soon as it comes in.`],
		mid: [
			`N|Returns form in: [[returnform]]`,
			`A|Thanks, I've emailed you the returns label. Drop the parcel at any Brightpost point; once it reaches us we refund the {prod} to your card.`
		],
		paths: [
			{
				s: [
					`+W|Return for {order} in: {prod}, unused, back on the shelf.`,
					`N|[[refund:line]]`,
					`A|Your return has arrived and I've refunded {lineAmt} for the {prod} to your card ending {card4}.{shipNote} It usually shows on your statement within three to five working days.`,
					`?c|Got it, thanks for making it easy.`
				]
			},
			{ s: [`+A|Just checking whether you've had a chance to send the {prod} back. The label lasts 30 days, and the refund goes through as soon as it reaches us.`] },
			{
				s: [
					`+W|Return for {order} arrived, but the {prod} is marked and scuffed; we can't put it back on the shelf. I'll look at it properly and email the customer with photos.`,
					`A|Your return has arrived, but the warehouse found marks on the {prod}, so they're having a closer look before the refund. {wh} will write to you with what they found.`
				]
			}
		],
		more: [`Do I need the original box?`, `It helps, but any sturdy box is fine, as long as it's well padded.`],
		quick: [`How long do I have to return something?`, `30 days from when you paid, for anything unused. Faulty items are different; tell us whenever it happens.`]
	},
	{
		key: 'latereturn',
		weight: 7,
		status: 'shipped',
		age: [36, 70],
		form: 'Returns and refunds',
		subjects: ['Return', 'Can I still return this?', 'Order {order}', 'Refund', 'Return an item'],
		open: [`I'd like to return the {prod} I bought from you in {orderMonth}. Can you send me a label?`, `Can I still send back the {prod} from order {order}? I've only just got around to it.`, `Is it too late to return the {prod} from order {order}? I've only just found the time to deal with it.`],
		reply: [`Thanks, {first}. Let me check the order.`, `Let me have a look at order {order}, {first}.`],
		mid: [`N|Paid {paidDay}, {daysPaid} days ago.`],
		paths: [
			{
				s: [
					`A|Your order was paid on {paidDay}, more than 30 days ago, so I can't refund it, I'm afraid. What I can do is swap it for something else of the same price or less. Would that help?`,
					`C|OK, fair enough. Could I swap it for {altA}?`,
					`A|Done. Send the {prod} back with the label I've attached, and the warehouse will send the {alt} as soon as it's scanned.`,
					`+W|Swap for {order}: return scanned, {alt} sent, {courier} {tracking2}.`,
					`?c|Got the {alt}, thanks.`
				]
			},
			{
				s: [
					`A|Your order was paid on {paidDay}, which is more than 30 days ago, so a refund isn't possible. I can swap it for something else of the same price or less, if that's any use.`,
					`?+A|Just checking whether you'd like to swap the {prod} for something else. Tell me what and I'll send a returns label.`
				]
			},
			{
				s: [
					`A|Your order was paid on {paidDay}, more than 30 days ago, so I can't refund it. I could swap it for something else of the same price or less.`,
					`C|To be honest the reason I want to send it back is that it doesn't work properly: {fault}.`,
					`A|Ah, that's different: a fault isn't a change of mind, and the 30 days don't come into it. I've passed it to the warehouse team, who look at faulty items, and they'll arrange a repair or a replacement with you.`,
					`N|Passed to {wh}: fault reported {daysPaid} days after payment.`
				]
			}
		],
		more: [`Does the 30 days count from when I ordered or when it arrived?`, `From when you paid, which for most orders is the day you ordered.`],
		quick: [`If something breaks after a couple of months, what happens?`, `Tell us and send a photo. Faults are covered well beyond the 30 days, and we repair or replace.`]
	},
	{
		key: 'cancelpaid',
		weight: 8,
		status: 'paid',
		age: [0, 0],
		form: 'Something else',
		subjects: ['Cancel order', 'Please cancel', 'Order {order}', 'Cancel my order please', 'Mistake'],
		open: [`Please cancel order {order}. I ordered it on my phone without realising my partner had already bought the same thing.`, `Can I cancel my order? I placed it about an hour ago. Order {order}.`, `I'd like to cancel order {order}, please, if it hasn't gone yet. I've found what I needed locally.`],
		reply: [`Let me check with the warehouse whether it's been packed, {first}.`, `I'll check straight away whether the warehouse has started on it, {first}.`],
		paths: [
			{
				s: [
					`W|Not picked. Pulled the pick slip.`,
					`N|Refunded in full, delivery included, as nothing had gone out: [[refund:total]] {order} still shows as paid in the lookup, so I've asked {wh} to keep it off the bench.`,
					`A|All cancelled: the warehouse hadn't started on it, and I've refunded the full {total}, delivery included. It'll show on your card in three to five working days. You may still see the order as "Being packed" in your account for a while; it won't be sent.`,
					`?C|Thanks. It still says Being packed today but I'll trust you!`
				]
			},
			{
				s: [
					`W|Already packed and handed over at the morning collection. Can't get it back now.`,
					`A|I'm sorry, it was packed and handed to {courier} before I could stop it. The warehouse team will ask {courier} to send it back to us, and once it's back they'll arrange the refund with you. I've passed it to them.`,
					`N|Passed to {wh} to ask {courier} for a return to sender.`
				]
			},
			{
				s: [
					`W|Not picked yet. Holding it.`,
					`A|Good timing: the warehouse is holding it. Before I cancel, could you confirm you want the whole order cancelled, rather than keeping part of it?`,
					`C|Hmm, let me check with my partner, they might want some of it. I'll come back to you tonight.`,
					`?+A|Just checking: should I cancel all of order {order}, or only part of it? The warehouse is holding it until I hear from you.`
				]
			}
		],
		more: [`Will I still get emails about the order?`, `You might get the automatic ones for a day or so; you can ignore them.`],
		quick: [`Can I cancel an order after I've paid?`, `Yes, if it hasn't been packed: reply to your confirmation email as soon as you can and we'll stop it and refund you in full.`]
	},
	{
		key: 'refundlate',
		weight: 7,
		status: 'shipped',
		age: [14, 26],
		form: 'Returns and refunds',
		subjects: ['Refund not received', 'Where is my refund?', 'Order {order}', 'Still waiting', 'Refund'],
		open: [`You refunded my return on {refundDay}; the email said three to five days, and it's still not on my card. Can you check?`, `Still waiting for my refund for order {order}. It's been over a week since you said it was done.`, `I was told my refund for order {order} went through on {refundDay}, but there's nothing on my statement. Could you look into it?`],
		reply: [`Sorry for the wait, {first}. Let me look at the refund.`, `Sorry it hasn't turned up yet, {first}. I'll check the refund on our side.`],
		mid: [`N|[[refund:old]]`],
		paths: [
			{
				s: [
					`A|The refund of {lineAmt} left us on {refundDay}. Banks can take up to ten working days to show it. Here's the reference your bank can use to trace it: {arn}.`,
					`C|Found it! It was on my statement as "TILLWISE*LARKSPUR", and I was looking for Larkspur. Sorry!`
				]
			},
			{
				set: { refundFailed: 'yes' },
				s: [
					`A|The refund bounced, as the card it was going back to has expired or been replaced. Our finance team can pay it by bank transfer instead, so I've passed it to them. They'll contact you for your bank details.`,
					`P|Picked up. Will email the customer for an IBAN through the secure form.`
				]
			},
			{
				set: { refundFailed: 'yes' },
				s: [
					`A|The refund bounced, because the card has expired or been replaced. We can send it by bank transfer instead: could you enter your IBAN and the name on the account in the secure form I've linked?`,
					`?+A|Just checking in: once I have your bank details, the refund can go out by transfer the same day.`
				]
			}
		],
		quick: [`How long do refunds take to show?`, `Usually three to five working days after we send them, sometimes up to ten, depending on the bank.`]
	},
	{
		key: 'partialreturn',
		weight: 6,
		status: 'shipped',
		pick: 'several',
		age: [6, 22],
		form: 'Returns and refunds',
		subjects: ['Returning some of my order', 'Return', 'Order {order}', 'Partial return', 'Too many'],
		open: [
			`I bought {qty} {prods} and I'd like to send {retWord} back; they don't go with our table as well as I'd hoped. Can I get a refund for those?`,
			`Could I return {retWord} of the {qty} {prods} from order {order}? I over-ordered for a party that's now smaller than planned.`
		],
		reply: [`Of course, {first}. I've emailed you a returns label; pop the {retWord} in the post and I'll refund them when they arrive.`, `Of course. I've emailed you a returns label for the {retWord}; once they reach us, I'll refund them.`],
		paths: [
			{
				s: [
					`+W|Return for {order}: {retWord} {prods}, fine, restocked.`,
					`N|[[refund:part]]`,
					`A|They've arrived, and I've refunded {retAmt} for the {retWord} {prods} to your card. The rest of the order stays as it is.`,
					`?c|Thanks a million.`
				]
			},
			{
				s: [
					`+W|Return for {order} arrived with only one {prod} in it, not {retWord}. Checking the returns bags again; I'll update the customer myself.`,
					`A|The parcel reached us, but the warehouse found only one {prod} in it, so they're checking the returns bags before refunding. {wh} will write to you once they've looked.`
				]
			},
			{ s: [`+A|Just checking whether the {prods} are on their way back. The refund goes through as soon as they reach us.`] }
		],
		more: [`Do I need to send the box they came in?`, `No, any sturdy box is fine, as long as they're well wrapped.`],
		quick: [`Can I return part of an order?`, `Yes, anything unused within 30 days of paying, even one item from a set. We refund what comes back.`]
	},
	{
		key: 'basketold',
		weight: 6,
		status: 'shipped',
		age: [14, 50],
		form: 'My account',
		subjects: ['Basket not emptying', 'Old items in basket', 'Basket problem', 'Website issue', 'Nearly ordered twice'],
		open: [
			`Every time I log in, my basket has the {cartProd} in it, which I bought weeks ago. I keep nearly ordering it again.`,
			`Is my basket broken? It's full of things from my last order in {orderMonth}. I thought it would be empty after I paid.`,
			`Every time I go to the website my basket is full of old things I've already bought, like the {cartProd}. Can you clear it?`
		],
		reply: [`Thanks, {first}. Let me look at your basket.`, `Sorry about that. I'll have a look at your basket, {first}.`],
		mid: [`N|[[cart]] Still open, with what was in it before order {order}.`],
		paths: [
			{
				s: [
					`A|You're right: when you pay, your basket stays as it was instead of being emptied, and that old basket is what you see when you log in. It's not something I can clear from here. I've asked the team that looks after orders to clear old baskets, and I'll let you know when it's done. Until then, please check the basket before you pay.`,
					`O|Yes, baskets are never closed at the moment. Old ones should be cleared after a while; it's on our list.`,
					`?c|OK, thanks for explaining.`
				]
			},
			{
				s: [
					`A|Your old basket was kept after you paid, so it shows up again when you log in. If you press "Start a new basket" at the bottom of the basket page, you get an empty one and the old one stops showing.`,
					`C|That worked, thanks. Odd that it doesn't do that by itself, though.`
				]
			},
			{
				s: [
					`A|I can see the old basket on your account, but I can't change baskets from our side. I've passed it to our web team, who look after the basket on the website, and they'll get back to you.`,
					`B|Taking a look. It's the old basket being picked up after login; I'll reply to the customer when I know more.`
				]
			}
		],
		more: [`Is my card saved in the basket?`, `No, we never store card details; the payment page is run by our payment provider.`],
		quick: [`Why is there still something in my basket from last time?`, `The basket isn't emptied after you pay at the moment. "Start a new basket" at the bottom of the basket page gives you a clean one.`]
	},
	{
		key: 'basketremove',
		weight: 6,
		status: 'shipped',
		age: [10, 60],
		form: 'Something else',
		subjects: ['Cannot remove item from basket', 'Basket error', 'How do I delete something from my basket?', 'Website problem', 'Error'],
		open: [
			`I can't take anything out of my basket. When I press the minus button to go down to zero, I get an error.`,
			`How do I remove something from my basket? There's no bin icon, and setting the number to 0 gives an error message.`
		],
		reply: [`Sorry about that, {first}. Could you tell me what's in the basket and which item you're trying to take out?`, `Sorry for the hassle, {first}. Which item is it, and what does the error say?`],
		mid: [`C|It's the {cartProd}. Here's what I get: [[error:qty]]`, `N|[[cart]]`],
		paths: [
			{
				s: [
					`A|Thanks. I'm afraid there's no way to take a single item out of a basket at the moment; the number can go down, but not to zero. I've asked the orders team to add it, and I'll let you know when it's done. In the meantime, "Start a new basket" gives you an empty one to fill again.`,
					`O|Taking an item out of a basket isn't possible yet. Added to the list.`,
					`?C|Bit of a pain, but OK. Thanks.`
				]
			},
			{
				s: [
					`A|Thanks. There's no way to take one item out at the moment, sorry, but "Start a new basket" at the bottom of the basket page gives you an empty one, and you can add back what you want.`,
					`C|Started a new basket and ordered what I wanted. Thanks.`
				]
			},
			{
				s: [
					`A|Thanks. The error comes up on the basket page of the website, so I've passed it to our web team to look at. They'll come back to you here.`,
					`B|Got it. I'll look at how the minus button behaves at zero and reply.`
				]
			}
		],
		more: [`Will the error stop me checking out?`, `No, it only appears when you try to go down to zero; checking out works as normal.`],
		quick: [`Is there a way to save a basket for later?`, `Your basket stays on your account when you log out, so it'll be there next time.`]
	},
	{
		key: 'basketdouble',
		weight: 6,
		status: 'paid',
		pick: 'big2',
		age: [0, 1],
		form: 'Returns and refunds',
		subjects: ['Ordered two by mistake', 'Order {order}', 'Wrong quantity', 'Only wanted one', 'Refund one item'],
		open: [`I've just noticed I ordered two {prods} instead of one. I must have pressed Add twice. Can I get one refunded?`, `Order {order} has 2 x {prod}. I only wanted one! The basket must have added it twice.`],
		reply: [`No problem, {first}. Let me check where the order is.`, `Easily done, {first}. I'll check whether the order has been packed yet.`],
		paths: [
			{
				s: [
					`W|Not packed yet. Will send just the one.`,
					`N|Refunded one in Tillwise: [[refund:unit]]`,
					`A|Caught it in time: the warehouse will send one {prod}, and I've refunded {unit} for the other. In case it helps, pressing Add on something already in the basket adds another one rather than doing nothing.`,
					`?c|Ah, that explains it. Thanks!`
				]
			},
			{
				s: [
					`W|Packed and sealed, it's on the trolley for this afternoon's collection.`,
					`A|It was already packed and goes out this afternoon, I'm afraid. When it arrives, send one back with the returns label I've attached, and I'll refund {unit} as soon as it reaches us.`,
					`+W|One {prod} back from {order}, restocked.`,
					`N|[[refund:unit]]`,
					`A|The {prod} is back with us and I've refunded {unit} to your card.`
				]
			},
			{
				s: [
					`W|Packed and sealed already, going out with today's collection.`,
					`A|It had already been packed, so both will arrive. Send one back with the returns label I've attached and I'll refund {unit} as soon as it reaches us.`,
					`?+A|Just checking whether you've sent the second {prod} back; the refund goes through as soon as it reaches us.`
				]
			}
		],
		more: [`Will the delivery charge change?`, `No, the order is well over €50 either way, so delivery stays free.`],
		quick: [`If I press Add twice, do I get two?`, `Yes, pressing Add on something already in your basket adds one more, so it's worth a look at the basket before paying.`]
	},
	{
		key: 'history',
		weight: 6,
		status: 'shipped',
		age: [2, 9],
		form: 'My account',
		subjects: ['Order missing from My orders', 'Did my order go through?', 'Order {order}', 'Account', 'Recent order not showing'],
		open: [`I can't find my latest order in My orders. Did it go through? I got a confirmation email for {order}.`, `Where has my recent order gone? My orders only seems to show old things from {firstYear}.`],
		reply: [`Thanks, {first}. Your order {order} did go through. Let me check what My orders is showing.`, `Thanks, {first}. Order {order} went through fine; I'll check why you can't see it.`],
		mid: [`N|My orders for this customer, as the website shows it: [[mine]]`],
		paths: [
			{
				s: [
					`A|Found it: My orders lists the oldest order first, so your latest one is at the very bottom, below the older ones. If you scroll down, it's there.`,
					`C|Found it, but with all those orders it takes ages to scroll. Could the newest be at the top? I reorder the same things every month.`,
					`A|I agree, and it's meant to be that way round. I've asked the orders team to change it and I'll let you know when it's done.`,
					`O|Yes, the list comes back oldest first; it's meant to be newest first. On our list.`
				]
			},
			{
				s: [
					`A|Found it: My orders lists the oldest first at the moment, so your latest order is right at the bottom. Scroll down and it's there.`,
					`C|Found it, at the bottom. All good, thanks.`
				]
			},
			{
				s: [
					`A|My orders is showing your oldest order first, which isn't right. I've passed it to our web team, who look after that page. Your order {order} is fine and on its way.`,
					`B|I'll check how the page sorts what it gets and reply to the customer.`
				]
			}
		],
		more: [`Can I search My orders by order number?`, `Not at the moment, but the confirmation email for each order has a link straight to it.`],
		quick: [`Can I see orders I placed as a guest?`, `Only if you made an account with the same email address afterwards; then they appear in My orders.`]
	},
	{
		key: 'orderdate',
		weight: 6,
		status: 'shipped',
		age: [10, 120],
		form: 'My account',
		subjects: ['Order date', 'Proof of purchase', 'Order {order}', 'Warranty', 'Date of order'],
		open: [
			`I need the date I placed order {order} for a warranty claim on the {prod}, but the order page doesn't show it anywhere. Can you tell me?`,
			`My company reimburses home office purchases, but they need the order date. Your order page shows the items and the total but no date. Where do I find it?`
		],
		reply: [`Thanks for getting in touch, {first}.`, `Happy to help, {first}.`],
		paths: [
			{
				s: [
					`A|You placed order {order} on {orderDay}, and it was paid the same day. The confirmation email we sent that day also has the date at the top, if you need something in writing.`,
					`C|Perfect, the confirmation email will do. Thanks.`
				]
			},
			{
				s: [
					`A|You placed order {order} on {orderDay}, and it was paid the same day.`,
					`C|Thanks, but my company needs it on the order page itself, as they want a screenshot of it. Is there any way to add the date?`,
					`A|I'm sorry, the order page can't show it at the moment: the order system doesn't pass the date on to the website yet. I've asked the orders team to add it, and I'll let you know when it's there.`,
					`O|Right, the date an order was placed isn't in what the order lookup sends back. On the list.`
				]
			},
			{
				s: [
					`A|It was placed on {orderDay}. If your employer needs a formal invoice with the date and our VAT number, our finance team can issue one, so I've passed it to them.`,
					`P|Will send an invoice with the order date to the customer.`
				]
			}
		],
		more: [`Does the receipt show the date too?`, `Yes, the VAT receipt shows the date it was paid, which for most orders is the same day.`],
		quick: [`Does the order page show when I ordered?`, `Not at the moment, I'm afraid. Your confirmation email has the date, and we're happy to confirm it by email.`]
	},
	{
		key: 'unknowncustomer',
		weight: 6,
		status: 'none',
		age: [0, 0],
		form: 'My account',
		subjects: ['Cannot check out', 'Error at checkout', 'New account not working', 'Website not letting me order', 'Something went wrong'],
		open: [
			`I made an account earlier today, but when I try to check out it says something went wrong. I've tried three times.`,
			`Your website won't let me place an order. The error says unknown customer. I literally just signed up!`
		],
		reply: [`Sorry about that, {first}. Could you send a screenshot of the error?`, `Sorry for the trouble, {first}. Could you send me a screenshot of the message you get?`],
		mid: [`c|[[error:customer]]`, `N|Customer {newCust} isn't in the order system yet. The account was created at {signupTime} today.`],
		paths: [
			{
				s: [
					`A|Your new account hasn't reached our order system yet, which is why the checkout says it doesn't know you. That normally takes minutes, so something has held it up. I've passed it to our accounts team, who'll get it through and let you know.`,
					`X|Sync for {newCust} failed on a duplicate email from an old guest checkout. Looking at it.`
				]
			},
			{
				s: [
					`A|Your new account hasn't reached our order system yet; it usually catches up within the hour. Could you try again later today?`,
					`C|Tried again after lunch and it worked. Order placed!`
				]
			},
			{
				s: [
					`A|Your new account hasn't reached our order system yet, which is why the checkout doesn't know you. I've asked our accounts team to look.`,
					`X|Fixed: an old guest checkout had the same email. Synced now.`,
					`A|The accounts team have fixed it; you should be able to check out now.`,
					`C|Just ordered, thanks!`
				]
			}
		],
		more: [`Will my basket still be there?`, `Yes, your basket is kept, so you won't need to fill it again.`],
		quick: [`If I make an account, can I order straight away?`, `Usually within a few minutes. If the checkout says it doesn't recognise you, wait a little and try again, or tell us.`]
	},
	{
		key: 'twoaccounts',
		weight: 5,
		status: 'shipped',
		age: [4, 30],
		form: 'My account',
		subjects: ['My orders have disappeared', 'Two accounts', 'Account problem', 'Old orders gone', 'Merge accounts'],
		open: [
			`I changed my email address last month and now My orders only shows my newest order. All my old orders have disappeared.`,
			`I think I have two accounts with you. My new order is on one and the old ones aren't. Can you merge them?`
		],
		reply: [`Thanks, {first}. Let me look up both email addresses.`, `Thanks, {first}. I'll check both addresses against our records.`],
		mid: [`N|Two customer records: [[accounts]]`],
		paths: [
			{
				s: [
					`A|You do have two accounts, one under each address, and your older orders are on the first one. Merging accounts is done by our accounts team, so I've passed it to them; they'll confirm with you before they change anything.`,
					`X|Will merge {oldCust} into {cust} once the customer confirms by email.`
				]
			},
			{
				s: [
					`A|You have two accounts, one for each email address. If you log in with {oldEmail}, you'll see your older orders there. Most people just keep both.`,
					`C|Logged in with my old email and there they are. That's fine, I don't need them merged.`
				]
			},
			{
				s: [
					`A|You have two accounts, one for each address. Before the accounts team can merge them, they need you to confirm from the old address too. Could you send a short email from {oldEmail} saying you'd like them merged?`,
					`?+A|Just a reminder: once we have the email from your old address, the merge takes a day.`
				]
			}
		],
		more: [`Will my saved addresses move over too?`, `Addresses stay with each account, but it only takes a minute to add them again.`],
		quick: [`If I change my email, do I lose my order history?`, `You shouldn't. Change it under Account, Details rather than signing up again, and everything stays together.`]
	},
	{
		key: 'receipt',
		weight: 6,
		status: 'shipped',
		age: [2, 40],
		form: 'Something else',
		subjects: ['VAT receipt', 'Invoice please', 'Order {order}', 'Receipt for work', 'Invoice'],
		open: [`Could you send me a VAT receipt for order {order}? It's for work.`, `I need an invoice with our company name on it for order {order}, please. Our accounts team won't accept the order confirmation.`],
		reply: [`Of course, {first}.`, `Happy to help with that, {first}.`],
		paths: [
			{ s: [`A|Here's a VAT receipt for order {order}: [[receipt]] If you need the company name on it as well, tell me and I'll ask finance for an invoice.`, `c|That's all I need, thanks.`] },
			{
				s: [
					`A|An invoice with a company name comes from our finance team, so I've passed your request on with the order details. They usually send it within two working days.`,
					`P|Will issue an invoice in the company name and email it.`
				]
			},
			{
				s: [
					`A|What company name and address should go on it, and do you have a VAT number you'd like included?`,
					`?+A|Just checking in: once I have the company name and address, finance can send the invoice the same day.`
				]
			}
		],
		more: [`Can you send receipts automatically in future?`, `The order confirmation works as a receipt for most purposes; for a VAT invoice in a company name, just ask us each time.`],
		quick: [`Do your receipts show VAT?`, `Yes, every receipt shows the VAT at 23%. If you need an invoice with a company name, finance can issue one.`]
	},
	{
		key: 'credit',
		weight: 5,
		status: 'pending',
		pick: 'tradeBig',
		trade: true,
		age: [1, 4],
		form: 'Payment',
		subjects: ['Order on hold', 'Credit limit?', 'Order {order}', '{shop}: stock order not sent', 'Call from your finance team'],
		open: [
			`Someone from your finance team rang to say our order {order} is on hold because it's over our credit limit. Nobody told us we had a limit. What do we need to do?`,
			`Our stock order hasn't been sent and we've been told it's "over the limit". We've ordered from you for two years. Can you release it?`
		],
		reply: [`Thanks, {first}. Let me check the account with finance.`, `Sorry for the surprise, {first}. I'll look at the account with finance and come back to you.`],
		mid: [`N|Credit limit {limit}, trusted: {trusted}. Order {order} is {total}, {overBy} over the limit. On account: [[statement]]`],
		paths: [
			{
				s: [
					`A|Your account has a credit limit of {limit}, and this order is {total}, so finance held it to check before sending. Changes to a limit go through our trade sales team, so I've passed your request to {trade}, who'll call you.`,
					`S|Will ring them this afternoon about raising the limit.`
				]
			},
			{
				s: [
					`P|Long-standing customer, always pays on time. Approved this one; releasing {order}.`,
					`A|Finance have approved this order and it'll go out tomorrow. For future orders over {limit}, it's worth asking trade sales to review your limit.`,
					`?c|Great, thanks for the quick turnaround.`
				]
			},
			{
				s: [
					`A|Your account has a limit of {limit}, and the order is {total}. Finance can release it straight away if you pay for it up front, by card or transfer, or trade sales can review your limit, which takes a few days. Which would you prefer?`,
					`?+A|Just checking how you'd like to go ahead with order {order}. It stays on hold until I hear from you.`
				]
			}
		],
		more: [`Do you need anything from us, like accounts or references?`, `Not for now; trade sales will tell you if they need anything for a review.`],
		quick: [`Do trade accounts have a spending limit?`, `Yes, every trade account has a credit limit; trade sales can review it if you regularly order more.`]
	},
	{
		key: 'unpaidreminder',
		weight: 5,
		status: 'pending',
		pick: 'trade',
		trade: true,
		age: [10, 30],
		form: 'Payment',
		subjects: ['Reminder: already paid', 'Payment reminder', 'Order {order}', '{shop}: we paid this', 'Account query'],
		open: [
			`We got a reminder that order {order} is unpaid. We paid it on {transferDay}. Please check before sending more reminders.`,
			`Your reminder email says we owe {total} for order {order}. I'm fairly sure we paid that. Can you confirm?`
		],
		reply: [`Sorry about that, {first}. Let me check with finance.`, `Sorry for the reminder, {first}. I'll check the payment with finance.`],
		mid: [`N|On Monday's unpaid list from ops: [[unpaid]]`],
		paths: [
			{
				s: [
					`P|Found the transfer: it came in without the order number and was sitting unmatched. Matched now and {order} marked as paid.`,
					`N|[[json:paid]]`,
					`A|You were right. The payment came in but couldn't be matched, as it had no order number. Finance have matched it, and {order} now shows as paid. Sorry for the reminder.`
				]
			},
			{
				s: [
					`A|I can't see a payment against {order} yet, so I've passed it to our finance team with your payment date. They'll check the bank and reply to you directly.`,
					`P|Checking the bank statement for {transferDay}.`
				]
			},
			{
				s: [
					`A|Finance can't find the payment yet. Could you send the remittance or the bank reference for the transfer?`,
					`?+A|Following up: once we have the remittance, finance can match it and stop the reminders.`
				]
			},
			{
				s: [
					`A|Finance can't find the payment yet. Could you send the remittance advice for the transfer?`,
					`C|Here it is. [[remittance]]`,
					`P|Matched, thanks. {order} marked as paid.`,
					`A|Thanks, that did it. Finance have matched it and the order shows as paid.`
				]
			}
		],
		more: [`Can you send us a statement of the account?`, `Finance send statements at the start of each month, but they can send one now if you need it.`],
		quick: [`When do the unpaid reminders go out?`, `Finance send them on Mondays for trade orders that are still unpaid after 14 days.`]
	},
	{
		key: 'bulkquote',
		weight: 5,
		status: 'shipped',
		pick: 'trade',
		trade: true,
		age: [10, 60],
		form: 'A product',
		subjects: ['Trade quote', 'Large order', 'Quote please', '{shop}: new opening', 'Bulk order'],
		open: [
			`We're opening a second premises in the spring and would like about {bulkN} {bulkProds}, plus side plates to match. Is there a trade price for that many, and how long would it take?`,
			`Could you quote us for {bulkN} {bulkProds}? We'd want them before Christmas.`
		],
		reply: [`Thanks, {first}, lovely to hear you're expanding.`, `Thanks for thinking of us, {first}.`],
		paths: [
			{
				s: [
					`A|For quantities like that, our trade sales team quotes directly, as it depends on the next firing. I've passed your request to {trade}, who'll come back to you with prices and dates.`,
					`S|Will quote: {bulkN} {bulkProds}. Checking the next firing date with the potter.`
				]
			},
			{ s: [`N|[[stock]]`, `A|We have enough on the shelf for that, at the trade prices on your account, with free delivery. You can order them in the usual way and they'll go out the next working day.`, `C|Perfect. I've placed the order just now.`] },
			{
				s: [
					`A|Happy to. Could you tell me how many of each colour you'd like? The potter fires each colour separately, so it changes the lead time.`,
					`?+A|Just checking in on the colours for your quote; once I have them, trade sales can confirm a date.`
				]
			}
		],
		more: [`Is there a minimum order for trade prices?`, `No minimum; trade prices apply to everything on a trade account.`],
		quick: [`Do you sell wholesale?`, `We do, through trade accounts for cafés, shops and guesthouses. Trade sales can set one up.`]
	},
	{
		key: 'abandoned',
		weight: 6,
		status: 'pending',
		age: [12, 70],
		form: 'Payment',
		subjects: ['Unpaid order on my account', 'Will I be charged?', 'Order {order}', 'Waiting for payment?', 'Question about an old order'],
		open: [
			`I just noticed My orders has an order from {orderMonth} that says "Waiting for payment". I never finished that one. Will I be charged for it?`,
			`There's an unpaid order on my account, {order}. Is it going to be sent and charged? I didn't mean to place it.`
		],
		reply: [`Thanks, {first}. Let me look at that order.`, `Thanks for asking, {first}. I'll look at that order now.`],
		mid: [`N|[[json]] Started at checkout, never paid.`],
		paths: [
			{
				s: [
					`A|No, you won't be charged and nothing will be sent. When you go to pay, our checkout creates the order first, and if the payment isn't finished it stays as "Waiting for payment". It's harmless.`,
					`C|Phew, thanks. That's all I wanted to know.`
				]
			},
			{
				s: [
					`A|You won't be charged and nothing will be sent: the checkout creates the order before payment, and this one was never paid.`,
					`C|Can you remove it, then? It looks like I owe you money every time I log in.`,
					`A|I'd like to, but our order system has no way to cancel or remove an unpaid order yet. I've added your request to the ones we've passed to the orders team, and I'll let you know when it's possible.`,
					`O|Same as the others: cancelling unpaid orders isn't possible yet. On the list.`
				]
			},
			{
				s: [
					`A|You won't be charged: the checkout creates the order before payment, and this one was never paid, so nothing will be sent either.`,
					`C|Actually, I do still want the things in it. Can I just pay for it now?`,
					`A|Yes: open it in My orders and press Pay now. It'll be packed the next working day.`,
					`N|[[json:paid]]`,
					`?c|Paid, thanks!`
				]
			}
		],
		more: [`Does the unpaid order hold stock back from other people?`, `No, stock is only set aside once an order is paid.`],
		quick: [`What does "Waiting for payment" mean on an old order?`, `It's a checkout that was started but never paid. Nothing is charged or sent for it.`]
	},
	{
		key: 'fixable',
		weight: 8,
		status: 'shipped',
		pick: 'fixable',
		age: [3, 30],
		form: 'A product',
		subjects: ['Faulty item', 'Refund request', 'Order {order}', 'Not working', 'Is this normal?'],
		open: [`I think the {prod} I got from you is faulty: {symptom}. Can I get a refund?`, `Is the {prod} meant to be like this? {symptomU}.`, `The {prod} isn't right: {symptom}. Should I send it back?`],
		reply: [`Sorry to hear that, {first}. Before we go down the refund route, one thing to try: {advice}`],
		paths: [
			{ s: [`C|{fixed}`] },
			{
				s: [
					`C|Tried that, no difference at all.`,
					`A|Thanks for trying. That does sound like a fault, so I've passed it to the warehouse team, who deal with faulty items. They'll arrange a replacement and a collection for the faulty one.`,
					`W|Will send a replacement and book a collection with the customer.`
				]
			},
			{ s: [`+A|Just checking whether that helped. If not, let me know and we'll get a replacement out.`] }
		],
		more: [`Is it still under guarantee, just in case?`, `Yes, faults are covered for two years from delivery.`],
		quick: [`Do the lamps come with a bulb?`, `The table lamps don't; they take a standard E27 screw bulb, up to 40 W, or any LED equivalent.`]
	},
	{
		key: 'gift',
		weight: 6,
		status: 'shipped',
		age: [1, 6],
		form: 'Delivery',
		subjects: ['Gift message', 'Sent as a gift', 'Order {order}', 'Gift', 'Disappointed'],
		open: [`I sent the {prod} as a gift to my aunt and added a message at checkout, but there was no card in the box, and the packing slip had the prices on it!`],
		reply: [`Oh no, I'm sorry, {first}.`],
		paths: [
			{
				s: [
					`A|The gift message should have been printed on the packing slip, without prices, and the warehouse missed the gift option on your order. I've asked them to post a handwritten card with your message to your aunt today.`,
					`W|Card written and posted.`,
					`+C|She got the card and loved it. Thanks!`
				]
			},
			{
				s: [
					`A|The gift option should have meant a card with your message and a slip without prices. I've passed it to the warehouse team so they can find out why it was missed and post a card with your message.`,
					`N|Passed to {wh} with the message text.`
				]
			},
			{
				status: 'paid',
				open: [`Is it possible to send order {order} to my friend's address as a gift, with a note? I've already paid.`],
				reply: [`Happy to help with that, {first}.`],
				s: [
					`A|Yes, the warehouse hasn't packed it yet. Could you send me your friend's full address with the Eircode, and the message you'd like on the card?`,
					`N|Asked {wh} to hold {order}.`,
					`?+A|Just a reminder: the order is on hold until I have the address and the message.`
				]
			},
			{
				status: 'paid',
				open: [`Could order {order} go to my friend instead of me, as a gift? I'd like a little note in it too.`],
				reply: [`Of course, {first}.`],
				s: [
					`A|Yes, it hasn't been packed yet. Could you send me your friend's address with the Eircode, and the message for the card?`,
					`C|It's {giftAddr}. Message: "Happy birthday, love from {first}".`,
					`W|Changed the label and added the card.`,
					`A|All set: it goes to your friend tomorrow, with your card and no prices on the slip.`
				]
			}
		],
		more: [`Can the warehouse add gift wrap?`, `We don't wrap, but the gift option leaves out the prices and adds a card with your message.`],
		quick: [`Can I add a gift message?`, `Yes: tick "This is a gift" at checkout, and the slip goes in without prices, with your message on a card.`]
	}
];

/** Side questions with nothing to do with the main matter. */
const asides: [string, string][] = [
	[`Is the stoneware dishwasher safe?`, `Yes, all our stoneware is dishwasher and microwave safe. The glaze can dull a little over the years in very hot washes, so a cooler cycle keeps it brighter.`],
	[`Do you deliver to the islands?`, `We do. Brightpost deliver to the Aran Islands, Arranmore, Tory, Bere and the other inhabited islands, usually a day or two later than the mainland, at the same price.`],
	[`Can I collect from you instead of paying for delivery?`, `Not at the moment, I'm afraid. We're a warehouse rather than a shop, so everything goes out by courier.`],
	[`When will the oat mugs be back?`, `The next firing is due in about three weeks. If you add yourself to the back-in-stock email on the product page, you'll hear the day they're back.`],
	[`How should I wash the linen tea towels?`, `At 40 degrees; they soften with every wash. Skip the fabric conditioner, as it stops linen absorbing.`],
	[`Do you have a shop I can visit?`, `Not yet; we're online only, from the warehouse in Little Island.`],
	[`Do you ship to Northern Ireland?`, `Not at the moment. We stopped shipping outside the Republic because of the paperwork, but we'd like to bring it back.`],
	[`Will the wool throw pill?`, `A little in the first weeks, as wool does. A fabric comb takes it off and it settles down.`],
	[`Are the candles vegan?`, `Yes: soy wax, cotton wicks, and scents free of animal products.`],
	[`Can I pay by bank transfer?`, `For trade accounts, yes. For everyone else we take cards, Apple Pay and Google Pay at the checkout.`],
	[`What size is the large planter?`, `24 cm across and 22 cm high inside, with a drainage hole and a cork plug if you'd rather keep it closed.`],
	[`Can the oak board go in the dishwasher?`, `No, please hand-wash it and oil it now and then with food-safe oil; the dishwasher dries the oak out and it can split.`],
	[`Do you sell gift cards?`, `Yes, from €20 to €150, sent by email. They're on the Gifts page.`],
	[`Do the prints come framed?`, `No, the A3 prints come rolled in a tube; the oak frame is sold separately and fits them exactly.`],
	[`Is the jute rug OK on underfloor heating?`, `Yes, it's fine on underfloor heating; we'd suggest a non-slip underlay on tiles.`],
	[`How long do the soy candles burn?`, `About 45 hours. Let the top melt to the edge on the first burn and it burns evenly to the end.`],
	[`Do you do the herringbone throw in green?`, `Only in oat and charcoal at the moment; the weaver is making a moss green for the spring.`],
	[`Can I add something to an order I've already placed?`, `An order can't be changed once it's placed, but if you place a second one the same day, the warehouse will try to pack them together.`],
	[`Is there any plastic in your packaging?`, `None. Boxes are recycled card, padding is paper and the tape is paper too, so it can all go in the recycling.`],
	[`Will there be a Christmas sale?`, `We don't usually do sales, but there's free gift wrapping from the first of December.`],
	[`Are the speckled plates the same as the ones in the photos?`, `Each one is a little different, as the speckles come from the clay, but they're all from the same glaze.`],
	[`Does the brass lamp have a dimmer?`, `No, it has an on/off switch on the cable, but it works with a dimmable LED bulb on a dimmer plug.`],
	[`Do you have a newsletter?`, `Yes, once a month, with new pieces and restocks. You can sign up at the bottom of any page.`],
	[`Where are your mugs made?`, `By a pottery in West Cork that we've worked with since we started.`]
];

/** For the faulty-item topic: what the customer sees, what to try, and the reply when it worked. */
const fixes: Record<string, [string, string, string][]> = {
	lamp: [[`it doesn't turn on at all; I've tried two sockets`, `the lamps don't come with a bulb, and they need an E27 screw bulb of 40 W or less. A bayonet bulb from an older lamp sits in the holder but doesn't connect.`, `It was the bulb! I'd used one from the old lamp. Works perfectly with the right one.`], [`it flickers after a few minutes`, `check the bulb is screwed in firmly and that it's an LED rated for enclosed shades; some cheaper LEDs flicker when they warm up.`, `Swapped the bulb for one of yours and the flicker is gone. Thanks.`]],
	candle: [[`it has burnt a hole down the middle and the rest of the wax isn't melting`, `that's tunnelling, which happens when the first burn is too short. Burn it for three hours so the whole top melts to the edge, and it evens itself out.`, `Did the long burn and it's levelled off. Thanks!`]],
	clock: [[`it stopped after two days`, `the clock comes with a trial battery that's often weak. A fresh AA battery usually sorts it, with the flat end against the spring.`, `New battery and it's ticking away. Thanks.`]],
	throw: [[`it's shedding all over the sofa`, `new wool throws shed a little at first. Give it a good shake outside and a cool wash on the wool cycle, and it settles down after a week or two.`, `Washed it and it's much better. Thanks!`]]
};
const faults: Record<string, string> = {
	lamp: 'the switch only works if I hold it down',
	clock: 'it loses ten minutes a day',
	throw: 'there is a hole in the weave along one edge',
	mug: 'the glaze has crazed all over the inside',
	teapot: 'the lid rattles and the spout drips down the side',
	rug: 'the edging is coming away along one side'
};

// ---------------------------------------------------------------------------------------------------------------
// Shared parts of a conversation.
const firstGreetings = ['Hi,', 'Hello,', 'Hi there,', 'Hello Larkspur,', 'Hi folks,', 'Dear Larkspur team,', ''];
const laterGreetings = ['Hi {agent},', '{agent},', 'Hi again,', 'Hello {agent},', '', 'Thanks {agent}.'];
const firstSignoffs = ['Thanks,\n{first}', 'Many thanks,\n{full}', 'Regards,\n{full}', '{first}', 'Kind regards,\n{full}\n{phone}', 'Thanks a million,\n{first}', 'Best,\n{first} {initial}.'];
const tradeSignoffs = ['Thanks,\n{first}\n{shop}', 'Kind regards,\n{full}\n{shop}\n{phone}', 'Regards,\n{first}, {shop}'];
const laterSignoffs = ['Thanks,\n{first}', '{first}', 'Cheers, {first}', '', 'Thanks again,\n{first}'];
const agentGreetings = ['Hi {first},', 'Hello {first},', 'Hi {first}, thanks for getting in touch.', 'Dear {first},'];
const agentLaterGreetings = ['Hi {first},', 'Hello again {first},', 'Hi {first}, thanks for getting back to me.', 'Hello {first},', 'Hi {first},'];
const agentSignoffs = ['Kind regards,\n{agent}\nLarkspur Customer Care', 'Thanks,\n{agent}', 'Best wishes,\n{agent} | Larkspur', 'All the best,\n{agent}', 'Talk soon,\n{agent}\nCustomer Care, Larkspur'];
const agentIntros = ['Thanks for getting in touch.', 'Thanks for your email, and sorry for the trouble.', "Sorry for the wait; we've had a busy few days.", 'Thanks for writing in.', 'Thanks for the clear description; it helps a lot.'];
const custAcks = ['Thanks for coming back to me.', 'OK, thanks.', 'Right, thanks.', 'Ah, I see.', 'Thanks for looking into it.', 'Great, thank you.'];
const sideLeads = ['Also, ', 'Unrelated, but ', 'While I have you: ', 'One more thing: ', 'Another question: ', 'Oh, and '];
const sideAnswers = ['On your other question: ', 'And to answer your other question: ', 'About the other thing you asked: ', 'As for your other question: ', ''];
const vagueSubjects = ['Order {order}', 'Question about my order', 'Hello', 'Help please', '(no subject)', 'Re: Your Larkspur order', 'Re: Your order is on its way'];
const chatHellos = ["Hi {first}, I'm {agent} from Larkspur Customer Care. Let me have a read of that.", 'Hello {first}, {agent} here. Thanks for waiting.', 'Hi {first}! {agent} from customer care. Give me a second to catch up.'];
const chatByes = ["I'll keep this ticket open, so you can reply to the email copy of this chat with anything else.", 'If anything else comes up, reply to the email copy of this chat and it comes straight back to me.'];
const forms = ['Delivery', 'Returns and refunds', 'Payment', 'My account', 'A product', 'Something else'];
const teams: Record<string, [string, string]> = { W: ['wh', 'warehouse'], P: ['pay', 'finance'], B: ['web', 'web team'], O: ['ord', 'orders team'], X: ['acc', 'accounts team'], S: ['trade', 'trade sales'] };
const reasons = [
	['the colour is much darker than in the photos', 'Colour not as expected'],
	["it's smaller than I thought it would be", 'Too small'],
	["it doesn't go with the room after all", 'Changed my mind'],
	['I was given one as a present the same week', 'Received as a gift'],
	["it's too big for the space I had in mind", 'Too big']
];

// ---------------------------------------------------------------------------------------------------------------
// One ticket.
const someProduct = (r: Rand, test: (p: Product) => boolean) => pick(r, products.filter(test));
const extraLines = (r: Rand, taken: Line[], count: number) => {
	for (let k = 0; k < count; k++) {
		const p = someProduct(r, (q) => !taken.some((line) => line.slug === q.slug) && q.kind !== 'rug');
		taken.push({ slug: p.slug, qty: p.multi ? int(r, 1, 3) : 1 });
	}
	return taken;
};
const linesFor = (r: Rand, how: Topic['pick']): Line[] => {
	switch (how) {
		case 'fragile': {
			const p = someProduct(r, (q) => !!q.fragile);
			return extraLines(r, [{ slug: p.slug, qty: p.multi ? int(r, 2, 4) : 1 }], int(r, 0, 2));
		}
		case 'big2':
			return extraLines(r, [{ slug: someProduct(r, (q) => !!q.big && q.cents >= 5000).slug, qty: 2 }], int(r, 0, 1));
		case 'multi':
			return extraLines(r, [{ slug: someProduct(r, () => true).slug, qty: 1 }], int(r, 1, 3));
		case 'several':
			return extraLines(r, [{ slug: someProduct(r, (q) => !!q.multi).slug, qty: int(r, 3, 6) }], int(r, 0, 1));
		case 'variant': {
			const p = someProduct(r, (q) => !!q.alt);
			return extraLines(r, [{ slug: p.slug, qty: p.multi ? int(r, 1, 4) : 1 }], int(r, 0, 2));
		}
		case 'fixable':
			return extraLines(r, [{ slug: someProduct(r, (q) => q.kind in fixes).slug, qty: 1 }], int(r, 0, 1));
		case 'under50':
			for (let attempt = 0; attempt < 60; attempt++) {
				const lines = extraLines(r, [{ slug: someProduct(r, (q) => q.cents < 4000).slug, qty: 1 }], int(r, 1, 3));
				const goods = goodsOf(lines);
				if (goods >= 3800 && goods < 5000) return lines;
			}
			return [{ slug: 'mug-stoneware-sage', qty: 2 }, { slug: 'candle-soy-fig', qty: 1 }, { slug: 'coasters-cork-set6', qty: 1 }];
		case 'trade':
		case 'tradeBig': {
			const lines: Line[] = [];
			const pool = products.filter((q) => q.multi || q.kind === 'teapot' || q.kind === 'jug' || q.kind === 'bowl');
			for (let k = int(r, 2, 4); k > 0 || (how === 'tradeBig' && goodsOf(lines) < 110000); k--) {
				const p = pick(r, pool.filter((q) => !lines.some((line) => line.slug === q.slug)));
				lines.push({ slug: p.slug, qty: p.cents >= 2500 ? int(r, 4, 12) : int(r, 6, 36) });
			}
			return lines;
		}
		default: {
			const p = someProduct(r, (q) => q.kind !== 'bulb');
			return extraLines(r, [{ slug: p.slug, qty: p.multi ? int(r, 1, 3) : 1 }], int(r, 0, 2));
		}
	}
};


const fill = (text: string, s: Record<string, string>) => text.replace(/\{(\w+)\}/g, (whole, name: string) => s[name] ?? whole);
const firstSentence = (text: string) => {
	const body = text.split('\n\n').find((part) => part.length > 30 && !/^[|`>\-]/.test(part)) ?? text;
	const match = body.match(/^.*?[.?!](?=\s|$)/);
	const sentence = (match ? match[0] : body).trim();
	return sentence.length > 25 ? sentence : '';
};
const plain = (text: string) => text.normalize('NFD').replace(/[^A-Za-z]/g, '').toLowerCase();
const agentClosers = [`If there's anything else, just reply to this email.`, `Let me know if I can help with anything else.`, `Any problems, just reply here and it comes straight back to me.`, `Thanks for your patience with this.`];
const backstories = [
	`We've ordered from you a good few times and never had a problem before.`,
	`I'm not great with websites, so apologies if I've missed something obvious.`,
	`It's the first time I've ordered from you; a friend recommended you.`,
	`I'm writing from my phone, so excuse the typos.`,
	`I did try the help pages first but couldn't find an answer.`,
	`I'm ordering for my elderly mother, so the account is in my name but things go to her.`,
	`We've just moved house, so everything is a bit chaotic here at the moment.`,
	`Sorry if this has been asked a hundred times.`
];
const earlyLeads = [`Something else while you're looking into it:`, `While I have you, a separate thing:`, `A different question in the meantime:`, `Unrelated, but while I'm writing:`];
const lateLeads = [`Another thing, while I have you:`, `One more thing, sorry:`, `Separate question:`, `While I have you, something else has come up:`, `Something different this time:`];
const backCustomer = [`Back to my order {order}. `, `Sorry, back to the first thing. `, `About my first question. `, ''];
const backAgent = [`Back to order {order} now. `, `Now, about order {order}. `, `Then your first question, about order {order}. `];
const backPlain = [`Back to your first question now. `, `Now, your first question. `, `Then the first thing you asked about. `];
const pastSubjects = ['Where is my order?', 'Gift wrap', 'Return', 'Question about the lamps', 'Change of address', 'Invoice', 'Delivery to the islands', 'Broken mug', 'Restock date', 'Order {id}', 'Payment failed', 'Size of the planters'];
const newsletters = ['Newsletter: new autumn pieces', 'Back in stock: oat mugs', 'Newsletter: the West Cork pottery', 'Back in stock: herringbone throws', 'Newsletter: gift guide'];

interface Base {
	r: Rand;
	received: number;
	trade: boolean;
	cust: number;
	sinceMs: number;
	limitCents: number;
	history: OrderRec[];
	s: Record<string, string>;
}
interface Matter {
	topic: Topic;
	path: Path;
	order: OrderRec;
	extra: OrderRec[];
	s: Record<string, string>;
	ctx: Ctx;
}

/** One matter of a ticket: its order, any second order the story needs, and its slots. */
const buildMatter = (b: Base, topic: Topic, path: Path, taken: Set<number>): Matter => {
	const r = b.r;
	const received = b.received;
	const key = topic.key;
	const status = path.status ?? topic.status;
	const lines = linesFor(r, topic.pick);
	const created = midnight(received - int(r, topic.age[0], topic.age[1]) * DAY) + int(r, 7 * 60, 22 * 60 + 30) * MIN;
	const order = makeOrder(r, lines, Math.min(Math.max(created, b.sinceMs + DAY), received - 25 * MIN), status === 'none' ? 'pending' : status, key === 'courierdelay' ? 1 : int(r, 1, 2));
	if (order.shipped && order.shipped > received - 3 * HOUR) {
		const early = workTime(r, order.paid! + 2 * HOUR);
		order.shipped = early < received - HOUR ? early : order.paid! + Math.floor((received - order.paid!) / 2);
	}
	while (taken.has(order.id)) order.id += 3;
	taken.add(order.id);
	const main = product(lines[0]!.slug);
	let order2: OrderRec | undefined;
	const extra: OrderRec[] = [];
	const story = [...(path.open ?? topic.open), ...(topic.mid ?? []), ...path.s].join('\n');
	if (story.includes('order2') || key === 'declined') {
		if (key === 'shippingcharge') {
			order2 = makeOrder(r, linesFor(r, 'under50'), order.created - int(r, 20, 90) * MIN, 'paid');
			order2.id = order.id - int(r, 1, 6);
		} else {
			order2 = makeOrder(r, lines, order.created + int(r, 3, 25) * MIN, key === 'declined' ? 'pending' : 'paid');
			order2.id = order.id + int(r, 1, 4);
		}
		extra.push(order2);
		if (key === 'declined') {
			const third = makeOrder(r, lines, order2.created + int(r, 2, 9) * MIN, 'pending');
			third.id = order2.id + int(r, 1, 3);
			extra.push(third);
		}
	}
	if (key === 'abandoned')
		for (let k = int(r, 1, 2); k > 0; k--) {
			const later = makeOrder(r, linesFor(r, undefined), order.created + int(r, 4, 10) * DAY * k, 'shipped');
			if (later.created < received - 2 * DAY) extra.push(later);
		}
	for (const o of extra) taken.add(o.id);

	const shipped = order.shipped ?? received - DAY;
	let delivered = midnight(shipped) + int(r, 1, 2) * DAY + int(r, 10 * 60, 17 * 60 + 30) * MIN;
	if (delivered > received - 2 * HOUR) delivered = midnight(shipped) + DAY + int(r, 10 * 60, 16 * 60) * MIN;
	if (delivered > received - HOUR) delivered = shipped + Math.floor((received - shipped) / 2);
	const big = !!main.big;
	const courier = big ? 'Corrib Couriers' : 'Brightpost';
	const tracking = () => (big ? `CC-${int(r, 1000000, 9999999)}` : `BP${int(r, 100000000, 999999999)}IE`);
	const cheaper = products.filter((q) => q.cents <= main.cents && q.slug !== main.slug && q.kind !== main.kind);
	const alt = main.alt ? product(main.alt) : pick(r, cheaper.length ? cheaper : products.filter((q) => q.kind !== main.kind));
	const missing = product((lines[1] ?? lines[0]!).slug);
	const damageList = damages[main.kind] ?? damages.pot!;
	const damageIndex = int(r, 0, damageList.length - 1);
	const fix = pick(r, fixes[main.kind] ?? fixes.lamp!);
	const reason = pick(r, reasons);
	const qtyN = lines[0]!.qty;
	const retQtyN = qtyN >= 3 ? int(r, 2, qtyN - 1) : 1;
	const refundMs = workTime(r, received - int(r, 6, 12) * DAY);
	const prevOrder = b.history.filter((o) => o.created < order.created).at(-1);
	const cartLines: Line[] = prevOrder && key === 'basketold' ? prevOrder.lines.map((line) => ({ ...line })) : extraLines(r, [], int(r, 1, 3));
	const s: Record<string, string> = {
		...b.s,
		overBy: euro(Math.max(0, order.total - b.limitCents)),
		order: String(order.id),
		order2: order2 ? String(order2.id) : '',
		items: orderWords(lines),
		prod: main.name,
		prodA: article(main.name),
		prods: plural(main),
		qty: num(qtyN),
		unit: euro(main.cents),
		lineAmt: euro(qtyN * main.cents),
		goods: euro(order.goods),
		ship: euro(order.ship),
		total: euro(order.total),
		shipNote: order.ship ? ` The ${euro(order.ship)} delivery charge isn't refunded, as the order had already been sent.` : '',
		orderDay: fullDay(order.created),
		orderMonth: MONL[at(order.created).getUTCMonth()]!,
		paidDay: fullDay(order.paid ?? order.created),
		shippedDay: fullDay(shipped),
		packDay: fullDay(workTime(r, (order.paid ?? order.created) + DAY)),
		deliveredDay: fullDay(delivered),
		deliveredMs: String(delivered),
		delTime: hhmm(delivered),
		daysPaid: String(Math.floor((received - (order.paid ?? order.created)) / DAY)),
		courier,
		depot: pick(r, depots),
		occasion: pick(r, occasions),
		damage: damageList[damageIndex]![0],
		damageIndex: String(damageIndex),
		safePlace: pick(r, safePlaces),
		neighbourFind: pick(r, neighbourFinds),
		cartProd: product(cartLines[0]!.slug).name,
		alt: alt.name,
		altA: article(alt.name),
		wrong: alt.name,
		wrongA: phrase(alt, qtyN),
		missing: missing.name,
		missingA: article(missing.name),
		restockDay: fullDay(received + int(r, 8, 24) * DAY),
		card4: String(int(r, 1000, 9999)),
		arn: `7${Array.from({ length: 22 }, () => int(r, 0, 9)).join('')}`,
		refundDay: fullDay(refundMs),
		refundMs: String(refundMs),
		retQtyN: String(retQtyN),
		retWord: num(retQtyN),
		retQty: String(retQtyN),
		retAmt: euro(retQtyN * main.cents),
		reason: reason[1]!,
		reasonText: reason[0]!,
		claimType: 'Not delivered',
		transferDay: fullDay(Math.max(order.created + DAY, received - int(r, 3, 9) * DAY)),
		symptom: fix[0],
		symptomU: upperFirst(fix[0]),
		advice: fix[1],
		fixed: fix[2],
		fault: faults[main.kind] ?? 'something is wrong with it that I only noticed recently'
	};
	Object.assign(s, path.set ?? {});
	const ctx: Ctx = {
		r,
		s,
		order,
		order2,
		history: b.history,
		now: received,
		cust: b.cust,
		cart: 4100 + Math.floor((received - Date.UTC(2025, 5, 1)) / DAY) * 9 + int(r, 0, 8),
		cartLines,
		payId: `pay_${Array.from({ length: 14 }, () => pick(r, 'abcdefghijkmnpqrstuvwxyz0123456789'.split(''))).join('')}`,
		courier,
		tracking: tracking(),
		trade: b.trade
	};
	s.tracking = ctx.tracking;
	s.tracking2 = tracking();
	return { topic, path, order, extra, s, ctx };
};

const mentions = (topic: Topic, text: string) => [...topic.open, ...(topic.mid ?? []), ...topic.paths.flatMap((p) => [...p.s, ...(p.open ?? [])])].some((line) => line.includes(text));
const retail = (topic: Topic) => !topic.trade && !['unknowncustomer', 'twoaccounts', 'history'].includes(topic.key);
const forTrade = (topic: Topic) => !!topic.trade || ['damaged', 'missingitem', 'wrongitem', 'notshipped', 'receipt', 'courierdelay', 'nondelivery', 'fixable'].includes(topic.key);

const writeTicket = (index: number, topic: Topic, path: Path) => {
	const r = mulberry32(0x1a2c5e00 + index * 104729);
	const day = openDays[Math.floor((index * openDays.length) / ITEMS)]!;
	const received = day + int(r, 7 * 60 + 10, 21 * 60 + 40) * MIN;
	const number = 40210 + index * 6 + int(r, 0, 4);
	const trade = !!topic.trade;
	const fresh = topic.key === 'unknowncustomer';

	// The customer and their earlier orders.
	const first = pick(r, firstNames);
	const last = pick(r, surnames);
	const [town, routing] = pick(r, places);
	const shop = trade ? `${pick(r, tradeHeads)} ${pick(r, tradeTails)}` : '';
	const email = trade
		? `${pick(r, ['orders', 'hello', 'accounts', plain(first)])}@${plain(shop).slice(0, 18)}.example`
		: `${pick(r, [`${plain(first)}.${plain(last)}`, `${plain(first)}${int(r, 1, 99)}`, `${plain(first)[0]}${plain(last)}`, `${plain(last)}.${plain(first)}`])}@${pick(r, mailHosts)}`;
	const code = () => `${routing} ${pick(r, codeChars.slice(0, 15).split(''))}${Array.from({ length: 3 }, () => pick(r, codeChars.split(''))).join('')}`;
	const house = int(r, 1, 64);
	const street = pick(r, streets);
	const newCust = String(int(r, 9400, 9690));
	const cust = fresh ? Number(newCust) : int(r, 300, 9400);
	const moved = topic.key === 'twoaccounts';
	const sinceMs = fresh ? received - int(r, 40, 300) * MIN : topic.key === 'history' ? Date.UTC(2023, 3, 1) + int(r, 0, 700) * DAY : moved ? midnight(received) - int(r, 25, 60) * DAY + int(r, 9 * 60, 21 * 60) * MIN : Date.UTC(2023, 3, 1) + int(r, 0, 1050) * DAY;
	const limitCents = topic.key === 'credit' ? pick(r, [50000, 100000]) : trade ? pick(r, [50000, 100000, 150000, 250000]) : 50000;
	const trusted = trade && topic.key !== 'credit' && chance(r, 0.2);
	const history: OrderRec[] = [];
	const past = fresh || moved ? 0 : topic.key === 'history' ? int(r, 6, 10) : trade ? int(r, 2, 6) : pick(r, [0, 0, 1, 1, 2, 3, 4]);
	for (let k = 0; k < past; k++) {
		const when = sinceMs + int(r, 0, Math.max(1, Math.floor((received - 75 * DAY - sinceMs) / DAY))) * DAY + int(r, 8 * 60, 22 * 60) * MIN;
		const old = makeOrder(r, trade ? linesFor(r, 'trade') : linesFor(r, undefined), Math.min(when, received - 75 * DAY), chance(r, 0.08) && topic.key !== 'history' ? 'pending' : 'shipped');
		history.push(old);
	}
	history.sort((a, b) => a.created - b.created);
	const agent = pick(r, agents);
	const base: Base = {
		r,
		received,
		trade,
		cust,
		sinceMs,
		limitCents,
		history,
		s: {
			first,
			last,
			full: `${first} ${last}`,
			initial: last[0]!,
			email,
			phone: `${pick(r, phones)} ${int(r, 100, 999)} ${int(r, 1000, 9999)}`,
			cust: String(cust),
			since: monthYear(sinceMs),
			sinceMs: String(sinceMs),
			town,
			addr: `${house} ${street}, ${town}`,
			eircode: code(),
			giftAddr: ((place) => `${int(r, 1, 80)} ${pick(r, streets)}, ${place[0]}, ${place[1]} ${pick(r, ['K', 'X', 'R', 'E'])}${int(r, 100, 999)}`)(pick(r, places)),
			wrongAddr: `${house + pick(r, [-2, 2, 4, 6, 1])} ${street}`,
			shop,
			shopUpper: shop.toUpperCase(),
			limit: euro(limitCents),
			trusted: trusted ? 'yes' : 'no',
			agent,
			agent2: pick(r, agents.filter((name) => name !== agent)),
			wh: pick(r, staff.wh),
			pay: pick(r, staff.pay),
			web: pick(r, staff.web),
			ord: pick(r, staff.ord),
			acc: pick(r, staff.acc),
			trade: pick(r, staff.trade),
			newCust,
			signupTime: hhmm(sinceMs),
			oldCust: String(int(r, 300, Math.max(301, cust - 1))),
			oldEmail: `${plain(first)}.${plain(last)}@${pick(r, ['oldmail.example', 'work.example', 'college.example'])}`,
			oldSinceMs: String(Date.UTC(2023, 3, 1) + int(r, 0, 800) * DAY),
			bulkN: String(pick(r, [40, 48, 60, 72, 96, 120])),
			bulkProds: plural(pick(r, products.filter((q) => q.multi && q.fragile && q.kind !== 'glass'))),
			firstYear: String(at(history[0]?.created ?? sinceMs).getUTCFullYear())
		}
	};

	// The main matter, and up to three others the customer raises on the way. Each matter's order is dated from
	// the day it is raised, so the orders come after the messages are laid out.
	const plan: Matter[] = [{ topic, path } as Matter];
	for (let k = fresh ? 0 : pick(r, [1, 2, 2, 2, 3, 3, 3]); k > 0; k--) {
		const other = pick(r, topics.filter((t) => (trade ? forTrade(t) : retail(t)) && !plan.some((m) => m.topic === t)));
		plan.push({ topic: other, path: pick(r, other.paths) } as Matter);
	}
	const mainMatter = plan[0]!;

	// The channel, and the messages before times.
	const chatOk = at(received).getUTCHours() >= 9 && at(received).getUTCHours() < 17;
	const channel = chatOk && chance(r, 0.16) ? 'Chat' : chance(r, 0.08) ? 'Phone (voicemail)' : chance(r, 0.3) ? 'Web form' : 'Email';
	interface Msg {
		who: string;
		text: string;
		long: boolean;
		at: number;
		m: Matter;
	}
	const msgs: Msg[] = [];
	const push = (m: Matter, spec: string, prefix = '') => {
		let optional = false;
		let long = false;
		while (spec[0] === '?' || spec[0] === '+') {
			if (spec[0] === '?') optional = true;
			else long = true;
			spec = spec.slice(1);
		}
		if (optional && !chance(r, 0.55)) return false;
		const bar = spec.indexOf('|');
		const who = spec.slice(0, bar);
		const text = prefix + pick(r, spec.slice(bar + 1).split(' || '));
		const prev = msgs.at(-1);
		if (who === 'A' && prev?.who === 'A' && prev.m === m && !long) prev.text += `\n\n${text}`;
		else msgs.push({ who, text, long, at: 0, m });
		return true;
	};
	/** A matter's script: care's first reply, sometimes a look at the order, the shared middle, then the path with
	 * the customer's follow-up question after care's first message in it. */
	const script = (m: Matter, late: boolean) => {
		const story = [...(m.topic.mid ?? [])];
		const pasted = [...story, ...m.path.s].some((line) => line.includes('[[json'));
		const lookup = !pasted && mentions(m.topic, '{order}') && chance(r, 0.8) ? pick(r, ['N|[[json]]', 'N|Lookup for {order}: [[json]]', 'N|Order {order} as the lookup has it: [[json]]']) : '';
		const tail = [...m.path.s];
		const firstA = tail.findIndex((line) => /^[?+]*A\|/.test(line));
		if (m.topic.more && firstA >= 0 && firstA < tail.length - 1 && chance(r, 0.85)) tail.splice(firstA + 1, 0, `C|${m.topic.more[0]}`, `A|${m.topic.more[1]}`);
		const lines = [`A|${pick(r, m.path.reply ?? m.topic.reply)}`, ...story, ...tail];
		if (/^A\|/.test(lines[1] ?? '')) lines.splice(0, 2, `${lines[0]}\n\n${lines[1]!.slice(2)}`);
		if (lookup) lines.splice(1, 0, lookup);
		while (!late && lines.length > 2 && /^\??\+A\|/.test(lines.at(-1)!)) lines.pop();
		return lines;
	};
	const opening = (m: Matter, late: boolean) => {
		const prev = msgs.at(-1)!;
		msgs.push({ who: 'C', text: `${pick(r, late ? lateLeads : earlyLeads)}\n\n${pick(r, m.path.open ?? m.topic.open)}`, long: late && prev.who === 'A' && chance(r, 0.6), at: 0, m });
	};
	const story = script(mainMatter, true);
	msgs.push({ who: 'open', text: `${channel !== 'Phone (voicemail)' && !trade && chance(r, 0.35) ? `${pick(r, backstories)}\n\n` : ''}${pick(r, path.open ?? topic.open)}`, long: false, at: 0, m: mainMatter });
	push(mainMatter, story[0]!);
	const early = plan.length > 1 && chance(r, 0.5) ? plan[1]! : undefined;
	if (early) {
		opening(early, false);
		for (const line of script(early, false)) push(early, line);
	}
	const ordered = mentions(topic, '{order}');
	let backC = !!early;
	let backA = !!early;
	for (const line of story.slice(1)) {
		const who = line.replace(/^[?+]+/, '')[0]!;
		const customer = who === 'C' || who === 'c';
		const prefix = backC && customer ? pick(r, ordered ? backCustomer : backCustomer.slice(1)) : backA && who === 'A' ? pick(r, ordered ? backAgent : backPlain) : '';
		if (!push(mainMatter, line, prefix)) continue;
		if (customer) backC = false;
		if (who === 'A') backA = false;
	}
	for (const m of plan.slice(1).filter((other) => other !== early)) {
		opening(m, true);
		for (const line of script(m, true)) push(m, line);
	}

	// Side questions, asked in a customer message and answered in care's next reply.
	const pool = [...asides, ...topics.filter((other) => !plan.some((m) => m.topic === other)).map((other) => other.quick)];
	const used = new Set<string>();
	let sides = pick(r, [1, 1, 2, 2, 3, 3, 4]);
	for (let k = 0; k < msgs.length && sides > 0; k++) {
		const m = msgs[k]!;
		if (!['open', 'C', 'c'].includes(m.who) || !chance(r, k === 0 ? 0.3 : 0.5)) continue;
		const reply = msgs.slice(k + 1).find((other) => other.who === 'A' || ['C', 'c'].includes(other.who));
		if (!reply || reply.who !== 'A') continue;
		let side = pick(r, pool);
		for (let guard = 0; used.has(side[0]) && guard < 10; guard++) side = pick(r, pool);
		if (used.has(side[0])) continue;
		used.add(side[0]);
		m.text += `\n\n${pick(r, sideLeads)}${lowerFirst(side[0])}`;
		const lead = pick(r, sideAnswers);
		reply.text += `\n\n${lead}${lead ? lowerFirst(side[1]) : side[1]}`;
		sides--;
	}

	// Times.
	const timing = (factor: number) => {
		const rt = mulberry32(0x5eed + index * 7);
		let t = received;
		msgs[0]!.at = t;
		for (let k = 1; k < msgs.length; k++) {
			const m = msgs[k]!;
			const prev = msgs[k - 1]!.who;
			const gap = (low: number, high: number) => Math.round(int(rt, low, high) * factor) * MIN;
			if (k === 1 && channel === 'Chat') t += int(rt, 2, 9) * MIN;
			else if (m.who === 'A') t = workTime(rt, t + (m.long ? gap(3 * 1440, 5 * 1440) : ['open', 'C', 'c'].includes(prev) ? gap(25, 330) : gap(10, 150)));
			else if (m.who === 'C' || m.who === 'c') t = awakeTime(rt, t + (m.long ? gap(2 * 1440, 6 * 1440) : gap(60, 30 * 60)));
			else if (m.who === 'N') t = ['open', 'C', 'c'].includes(prev) ? workTime(rt, t + gap(20, 240)) : t + int(rt, 3, 45) * MIN;
			else if (m.who === 'K') t = workTime(rt, t + gap(18 * 60, 54 * 60));
			else t = workTime(rt, t + (m.long ? gap(3 * 1440, 7 * 1440) : gap(40, 26 * 60)));
			m.at = t;
		}
		return t;
	};
	for (let factor = 1, guard = 0; timing(factor) > EXPORT - 18 * HOUR && guard < 14; guard++) factor *= 0.7;

	// The orders, now that each matter has a day.
	const taken = new Set(history.map((o) => o.id));
	for (const m of plan) Object.assign(m, buildMatter({ ...base, received: msgs.find((msg) => msg.m === m)!.at }, m.topic, m.path, taken));
	const s = mainMatter.s;
	const listed = [...history, ...plan.flatMap((m) => [m.order, ...m.extra])].filter((o) => o.created < received).sort((a, b) => a.id - b.id);

	// Render: the header, the customer's record, their orders and the emails we sent them.
	const out: string[] = [];
	const dropdown = chance(r, 0.55) ? topic.form : pick(r, forms);
	const subject = channel === 'Chat' ? `Chat with ${s.full}` : channel === 'Web form' ? `Web form: ${dropdown}` : channel === 'Phone (voicemail)' ? `Voicemail from ${s.phone}` : fill(chance(r, 0.7) ? pick(r, topic.subjects) : pick(r, vagueSubjects), s);
	out.push(`# Ticket ${number}: ${subject}`, '');
	out.push(
		table(
			['Field', 'Value'],
			[
				['Received', stamp(received)],
				['Channel', channel],
				['Requester', `${s.full} <${email}>`],
				['Customer', `${cust}, account since ${s.since}${trade ? `, trade account (${shop})` : ''}`],
				['Credit limit', `${s.limit} (trusted: ${s.trusted})`],
				['Assignee', agent]
			]
		),
		''
	);
	const earlier = fresh ? 0 : pick(r, [0, 0, 1, 1, 2, 3]);
	if (earlier) {
		const rows = Array.from({ length: earlier }, () => sinceMs + int(r, 1, Math.max(2, Math.floor((received - sinceMs) / DAY) - 3)) * DAY)
			.sort((a, b) => a - b)
			.map((when) => [String(40210 - Math.floor((received - when) / DAY) * 9 - int(r, 1, 8)), dayMonth(when), pick(r, pastSubjects).replace('{id}', String(orderIdAt(when) - int(r, 1, 30)))]);
		out.push('### Earlier tickets from this customer', '', table(['Ticket', 'Opened', 'Subject'], rows), '');
	}
	out.push('## Orders on the account', '', 'As the order lookup listed them when the ticket came in.', '');
	if (listed.length === 0) out.push('No orders on the account yet.', '');
	else
		out.push(
			table(
				['Order', 'Status', 'Goods', 'Delivery', 'Total', 'Paid', 'Shipped'],
				listed.map((o) => {
					const paid = o.paid && o.paid < received ? o.paid : 0;
					const sent = paid && o.shipped && o.shipped < received ? o.shipped : 0;
					return [String(o.id), sent ? 'shipped' : paid ? 'paid' : 'pending', euro(o.goods), euro(o.ship), euro(o.total), paid ? dayMonth(paid) : '-', sent ? dayMonth(sent) : '-'];
				})
			),
			''
		);
	const mails: [number, string, string][] = [];
	for (const o of listed.filter((o) => o.created > received - 80 * DAY)) {
		if (o.paid && o.paid < received) mails.push([o.paid + int(r, 1, 3) * MIN, 'Order confirmation', String(o.id)]);
		if (o.shipped && o.shipped < received) mails.push([o.shipped + int(r, 5, 50) * MIN, 'Your order is on its way', String(o.id)]);
	}
	for (let k = fresh ? 0 : int(r, 0, 2); k > 0; k--) mails.push([workTime(r, received - int(r, 2, 60) * DAY), pick(r, newsletters), '-']);
	if (mails.length) {
		mails.sort((a, b) => a[0] - b[0]);
		out.push('### Emails sent to the customer', '', table(['Sent', 'Email', 'Order', 'Opened'], mails.map(([when, what, id]) => [stamp(when), what, id, chance(r, 0.7) ? 'yes' : 'no'])), '');
	}
	out.push('## Messages', '');

	// Render: the messages.
	const expand = (msg: Msg, text: string) => {
		msg.m.ctx.now = msg.at;
		return fill(text.replace(/\]\] /g, ']]'), msg.m.s)
			.replace(/\[\[(\w+)(?::(\w+))?\]\]/g, (_whole, name: string, arg?: string) => `\n\n${arts[name]!(msg.m.ctx, arg ?? '')}\n\n`)
			.replace(/[ \t]+\n/g, '\n')
			.replace(/\n{3,}/g, '\n\n')
			.trim();
	};
	const who = trade ? `${s.full}, ${shop}` : s.full!;
	let lastAgentText = '';
	let lastCloser = '';
	let agentSpoke = false;
	for (let k = 0; k < msgs.length; k++) {
		const m = msgs[k]!;
		const body = expand(m, m.text);
		const head = (label: string) => `### ${label} · ${stamp(m.at)}`;
		if (m.who === 'open') {
			if (channel === 'Chat') {
				const bubbles = body.split(/(?<=[.?!])\s+(?=[A-Z"])|\n\n/).filter(Boolean);
				let t = m.at;
				const lines = bubbles.map((bubble) => `**${first}** (${hhmm((t += int(r, 0, 1) * MIN))}): ${bubble}`);
				lines.push(`**${agent}** (${hhmm((t += int(r, 1, 3) * MIN))}): ${fill(pick(r, chatHellos), s)}`);
				const reply = msgs[1]!;
				const replyText = expand(reply, reply.text);
				for (const part of replyText.split('\n\n')) lines.push(`**${agent}** (${hhmm((t += int(r, 1, 3) * MIN))}): ${part}`);
				lines.push(`**${agent}** (${hhmm((t += MIN))}): ${pick(r, chatByes)}`, `**${first}** (${hhmm((t += MIN))}): ${pick(r, ['Thanks.', 'OK, thanks!', 'Great, thank you.', 'Perfect.'])}`);
				out.push(head('Chat transcript'), '', lines.join('\n\n'), '', `_Chat ended after ${Math.max(4, Math.round((t - m.at) / MIN))} minutes; an email copy went to the customer._`, '');
				lastAgentText = replyText;
				agentSpoke = true;
				k = 1;
				continue;
			}
			if (channel === 'Web form') {
				out.push(head('Web form'), '', table(['Field', 'Value'], [['Name', s.full!], ['Email', email], ['Order number', fresh || chance(r, 0.3) ? '' : s.order!], ['What is it about?', dropdown]]), '', body, '');
			} else if (channel === 'Phone (voicemail)') {
				out.push(head('Voicemail, transcribed'), '', `"Hi, this is ${s.full}${trade ? `, from ${shop}` : ''}. ${body.replace(/\n\n/g, ' ')} You can ring me back on ${s.phone}. Thanks, bye."`, '');
			} else {
				out.push(head(who), '', [fill(pick(r, firstGreetings), s), body, fill(pick(r, trade ? tradeSignoffs : firstSignoffs), s)].filter(Boolean).join('\n\n'), '');
			}
			continue;
		}
		if (m.who === 'A') {
			const greeting = fill(pick(r, agentSpoke ? agentLaterGreetings : agentGreetings), s);
			const intro = !agentSpoke ? (channel === 'Phone (voicemail)' ? 'Thanks for your voicemail. I thought email would be easiest, so you have this in writing.' : chance(r, 0.5) ? pick(r, agentIntros) : '') : '';
			let named = greeting.includes(first) && body.indexOf(`, ${first}`) >= 0 && body.indexOf(`, ${first}`) < 150 ? body.replace(`, ${first}`, '') : body;
			if (/thanks/i.test(greeting)) named = named.replace(/^Thanks[.!] /, '');
			let closer = chance(r, 0.4) ? pick(r, agentClosers) : '';
			if (closer === lastCloser || (closer.startsWith('Thanks for your patience') && !agentSpoke)) closer = '';
			lastCloser = closer || lastCloser;
			const footer = chance(r, 0.3) ? '\n--\nLarkspur Home · Little Island, Co. Cork · Customer care Monday to Saturday, 8:30 to 17:45' : '';
			out.push(head(`${agent} (Larkspur Customer Care)`), '', [greeting, intro, named, closer, fill(pick(r, agentSignoffs), s) + footer].filter(Boolean).join('\n\n'), '');
			lastAgentText = named;
			agentSpoke = true;
		} else if (m.who === 'C') {
			const quoted = lastAgentText && chance(r, 0.3) ? firstSentence(lastAgentText) : '';
			const quote = quoted ? `> ${quoted}` : '';
			const hello = fill(pick(r, laterGreetings), s);
			const ack = lastAgentText && !quote && !hello.startsWith('Thanks') && chance(r, 0.25) ? pick(r, custAcks) : '';
			out.push(head(who), '', [hello, quote, ack ? `${ack} ${body}` : body, fill(pick(r, laterSignoffs), s)].filter(Boolean).join('\n\n'), '');
		} else if (m.who === 'c') {
			out.push(head(who), '', chance(r, 0.5) ? `${body}\n\n${first}` : body, '');
		} else if (m.who === 'N') {
			out.push(head(`Internal note by ${agent}`), '', body, '');
		} else if (m.who === 'K') {
			out.push(head(`Email from ${m.m.ctx.courier}`), '', `${body}\n\n${m.m.ctx.courier} Customer Operations`, '');
		} else {
			const [slot, label] = teams[m.who]!;
			out.push(head(`Note from ${s[slot]} (${label})`), '', body, '');
		}
	}
	const dir = join(root, 'customer-care', 'tickets');
	mkdirSync(dir, { recursive: true });
	writeFileSync(join(dir, `${number}.md`), out.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n');
};

// ---------------------------------------------------------------------------------------------------------------
// The tickets: topics in a fixed, shuffled rota, and each topic's paths taken in turn.
const rota: Topic[] = topics.flatMap((topic) => Array.from({ length: topic.weight }, () => topic));
const shuffle = mulberry32(0xc0ffee);
for (let k = rota.length - 1; k > 0; k--) {
	const j = Math.floor(shuffle() * (k + 1));
	[rota[k], rota[j]] = [rota[j]!, rota[k]!];
}
const seen = new Map<string, number>();
for (let index = 0; index < ITEMS; index++) {
	const topic = rota[index % rota.length]!;
	const turn = seen.get(topic.key) ?? 0;
	seen.set(topic.key, turn + 1);
	writeTicket(index, topic, topic.paths[(turn + topic.key.length) % topic.paths.length]!);
}

writeFileSync(
	join(root, 'customer-care', 'tickets', 'README.md'),
	`# Customer care tickets

Every ticket Larkspur customer care handled between 14 September and 13 November 2026 that mentions an order,
a basket, a payment or a delivery: ${ITEMS} tickets, one file each, named by ticket number. Exported from the help
desk on 20 November 2026.

Each file starts with the requester's record from the accounts sync, their earlier tickets, the orders on their
account as the order lookup listed them when the ticket came in, and the emails the shop had sent them. Then come
the messages in the order they were sent: the customer's emails, web forms, chat transcripts and voicemails,
care's replies, and the internal notes from care, the warehouse, finance, the web team, the orders team, the
accounts team and trade sales.

The export keeps the messages and the internal notes. It leaves out the tags, the ticket statuses and the
satisfaction scores, which the help desk keeps elsewhere.

Amounts in messages are in euro, VAT included. Order details pasted from the order lookup show amounts in cents
and times in UTC.
`
);
