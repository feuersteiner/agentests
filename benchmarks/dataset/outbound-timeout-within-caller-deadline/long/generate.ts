// Writes the long material of this entry's long task: the tickets that Pellham Supply's trade desk handled about
// prices, quotes and invoices on the trade storefront between 1 September and 13 November 2026, one Markdown file
// each, under support/trade-desk/. Deterministic: fixed seeds, no clock, no network.
//   bun long/generate.ts <workspace root>
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** How many tickets to write. Everything else is derived from it. */
const ITEMS = 300;

const root = process.argv[2];
if (!root) throw new Error('Usage: bun long/generate.ts <dir>');

const mulberry32 = (seed: number) => () => {
	seed = (seed + 0x6d2b79f5) | 0;
	let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
	t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
type Rand = () => number;
// Slots hold the strings a ticket's text is filled from, and a few numbers and lists its pasted output needs.
type Slots = Record<string, any>;
type Art = (r: Rand, s: Slots) => string;
const int = (r: Rand, low: number, high: number) => low + Math.floor(r() * (high - low + 1));
const pick = <T>(r: Rand, items: readonly T[]): T => items[Math.floor(r() * items.length)]!;
const chance = (r: Rand, p: number) => r() < p;
const pad = (value: number) => String(value).padStart(2, '0');
const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);
const shuffle = <T>(r: Rand, items: readonly T[]) => {
	const out = [...items];
	for (let i = out.length - 1; i > 0; i--) {
		const j = Math.floor(r() * (i + 1));
		[out[i], out[j]] = [out[j]!, out[i]!];
	}
	return out;
};

// ---------------------------------------------------------------------------------------------------------
// Dates. Everything happens in 2026, before the export on 16 November. Times are the desk's local time.
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WDL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const utc = (ms: number) => new Date(ms);
const midnight = (ms: number) => ms - (ms % DAY);
const stamp = (ms: number) => {
	const d = utc(ms);
	return `${WD[d.getUTCDay()]} ${d.getUTCDate()} ${MON[d.getUTCMonth()]} 2026, ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
};
const dayMonth = (ms: number) => `${utc(ms).getUTCDate()} ${MONL[utc(ms).getUTCMonth()]}`;
const shortDay = (ms: number) => `${utc(ms).getUTCDate()} ${MON[utc(ms).getUTCMonth()]}`;
const fullDay = (ms: number) => `${WDL[utc(ms).getUTCDay()]} ${dayMonth(ms)}`;
const FIRST_DAY = Date.UTC(2026, 8, 1);
const LAST_OPEN = Date.UTC(2026, 10, 6);
const LIMIT = Date.UTC(2026, 10, 13, 17, 0);
const LABOR_DAY = Date.UTC(2026, 8, 7);
const PRICE_RISE = Date.UTC(2026, 9, 1);
const RENUMBERED = Date.UTC(2026, 7, 10);
const deskDay = (ms: number) => {
	const wd = utc(ms).getUTCDay();
	return wd >= 1 && wd <= 5 && midnight(ms) !== LABOR_DAY;
};
const openDays: number[] = [];
for (let day = FIRST_DAY; day <= LAST_OPEN; day += DAY) if (deskDay(day) || utc(day).getUTCDay() === 6) openDays.push(day);
/** The next working day at or after ms, as midnight. */
const nextDeskDay = (ms: number) => {
	let day = midnight(ms);
	while (!deskDay(day)) day += DAY;
	return day;
};
/** A working day n working days after the day of ms. */
const workdaysAfter = (ms: number, n: number) => {
	let day = midnight(ms);
	for (let left = n; left > 0; ) {
		day += DAY;
		if (deskDay(day)) left--;
	}
	return day;
};

// ---------------------------------------------------------------------------------------------------------
// Money, as the invoices and the storefront show it.
const sep = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const usd = (cents: number) => `${cents < 0 ? '-' : ''}$${sep(Math.trunc(Math.abs(cents) / 100))}.${pad(Math.abs(cents) % 100)}`;
/** The total line of the price box, which drops the leading zero of the cents. */
const shown = (cents: number) => `$${sep(Math.trunc(cents / 100))}.${Math.abs(cents % 100)}`;
const pct = (rate: number) => `${+(rate * 100).toFixed(3)}%`;

// ---------------------------------------------------------------------------------------------------------
// The catalogue: code, description, sold by, pieces in the pack (0 when sold singly), list price in cents, the code
// it had before the catalogue was renumbered in August.
type Product = { sku: string; desc: string; unit: string; pack: number; list: number; old: string; long?: boolean; added?: boolean };
const P = (sku: string, desc: string, unit: string, pack: number, list: number, old: string, extra: Partial<Product> = {}): Product => ({ sku, desc, unit, pack, list, old, ...extra });
const catalogue: Product[] = [
	P('BOLT-M8', 'hex bolt M8 x 50, A2 stainless', 'bolt', 0, 485, 'HB8-50-SS'),
	P('BOLT-M10', 'hex bolt M10 x 60, A2 stainless', 'bolt', 0, 612, 'HB10-60-SS'),
	P('BOLT-M12', 'hex bolt M12 x 80, grade 8.8, hot-dip galvanized', 'bolt', 0, 538, 'HB12-80-HDG'),
	P('NUT-M10', 'hex nut M10, A2 stainless', 'box', 100, 1890, 'HN10-SS'),
	P('WSHR-M12', 'flat washer M12, galvanized', 'box', 200, 2240, 'FW12-HDG'),
	P('ANCH-38', 'wedge anchor 3/8 x 3 in, zinc', 'box', 50, 3675, 'WA-375-3'),
	P('ANCH-12', 'wedge anchor 1/2 x 4-1/4 in, zinc', 'box', 25, 4410, 'WA-500-425'),
	P('ROD-38', 'threaded rod 3/8-16 x 10 ft, zinc', 'length', 0, 1145, 'ATR-375-10'),
	P('ROD-12', 'threaded rod 1/2-13 x 10 ft, zinc', 'length', 0, 1798, 'ATR-500-10'),
	P('STRUT-158', 'strut channel 1-5/8 in x 10 ft, 12 ga, pre-galvanized', 'length', 0, 3460, 'CH-158-12G'),
	P('STRUT-NUT-38', 'spring nut 3/8 in for strut', 'box', 50, 4125, 'SN-375'),
	P('CLMP-BEAM-38', 'beam clamp for 3/8 in rod', 'box', 25, 5390, 'BC-375'),
	P('SCRW-TEK-12', 'self-drilling screw #12 x 1 in, hex washer head', 'box', 1000, 6840, 'SD12-1-HWH'),
	P('SCRW-DECK-3', 'deck screw #10 x 3 in, coated', 'box', 350, 4296, 'DS10-3-C'),
	P('CONC-14', 'concrete screw 1/4 x 2-3/4 in', 'box', 100, 3120, 'CS-250-275'),
	P('LAG-516', 'lag screw 5/16 x 4 in, hot-dip galvanized', 'box', 50, 2786, 'LS-312-4'),
	P('EPXY-10', 'anchoring epoxy, 10 oz cartridge', 'cartridge', 0, 2650, 'AE-10'),
	P('RIV-316', 'blind rivet 3/16 in, aluminum', 'box', 500, 3316, 'BR-188-AL'),
	P('BIT-SDS-12', 'SDS-plus drill bit 1/2 x 12 in', 'bit', 0, 1460, 'DB-SDS-500'),
	P('HNGR-CLV-2', 'clevis hanger 2 in, galvanized', 'hanger', 0, 396, 'CLH-2-G'),
	P('SEIS-CBL', 'seismic brace cable kit, 10 ft', 'kit', 0, 5870, 'SBK-10'),
	P('WASH-FEN-38', 'fender washer 3/8 x 1-1/2 in, zinc', 'box', 100, 1366, 'FNW-375'),
	P('NUT-CPL-38', 'coupling nut 3/8-16, zinc', 'box', 25, 1980, 'CN-375'),
	P('STRUT-158-20', 'strut channel 1-5/8 in x 20 ft, 12 ga, pre-galvanized', 'length', 0, 6650, 'CH-158-12G-20', { long: true }),
	P('ROD-12-20', 'threaded rod 1/2-13 x 20 ft, zinc', 'length', 0, 3420, 'ATR-500-20', { long: true }),
	P('ANCH-58', 'wedge anchor 5/8 x 6 in, zinc', 'box', 10, 3890, '', { added: true }),
	P('STRUT-158-SS', 'strut channel 1-5/8 in x 10 ft, 316 stainless', 'length', 0, 18900, '', { added: true }),
	P('ROD-58-SS', 'threaded rod 5/8-11 x 10 ft, 316 stainless', 'length', 0, 14250, '', { added: true }),
	P('EPXY-20', 'anchoring epoxy, 20 oz cartridge, high strength', 'cartridge', 0, 4876, '', { added: true })
];
const regular = catalogue.filter((p) => !p.long && !p.added);
const boxed = regular.filter((p) => p.pack > 0);
const ADDED_DAY = Date.UTC(2026, 8, 14);
const packOf = (p: Product) => (p.pack ? `box of ${sep(p.pack)}` : p.unit);
const pieceNoun = (p: Product) => (p.sku.startsWith('ANCH') ? 'anchors' : p.sku.startsWith('NUT') ? 'nuts' : p.sku.startsWith('WSHR') || p.sku.startsWith('WASH') ? 'washers' : p.sku.startsWith('RIV') ? 'rivets' : p.sku.startsWith('STRUT-NUT') ? 'spring nuts' : p.sku.startsWith('CLMP') ? 'clamps' : 'screws');
/** A sensible order quantity of a product. */
const qtyOf = (r: Rand, p: Product) =>
	p.unit === 'box' ? int(r, 2, 60) : p.unit === 'length' ? int(r, 8, 160) : p.unit === 'cartridge' ? int(r, 6, 96) : p.unit === 'kit' ? int(r, 4, 40) : p.unit === 'bit' ? int(r, 3, 24) : int(r, 40, 1600);

// Trade price levels and their discounts off list.
const tiers: [string, number][] = [
	['Trade A', 0.18],
	['Trade B', 0.12],
	['Trade C', 0.07]
];
const priceAt = (p: Product, discount: number) => Math.round(p.list * (1 - discount));

// ---------------------------------------------------------------------------------------------------------
// Places. The tax service's rate is one per state.
type State = { code: string; name: string; rate: number; cities: string[]; area: string[]; zips: [number, number]; branch: string; rep: string };
const states: State[] = [
	{ code: 'CA', name: 'California', rate: 0.0725, cities: ['Modesto', 'Stockton', 'Lodi', 'Tracy', 'Sacramento', 'Merced', 'Roseville', 'Elk Grove', 'Turlock', 'Manteca', 'Hayward', 'San Jose', 'Livermore', 'Galt'], area: ['209', '916', '510', '408'], zips: [94203, 95386], branch: 'Stockton', rep: 'Curtis Bower' },
	{ code: 'NV', name: 'Nevada', rate: 0.0685, cities: ['Reno', 'Sparks', 'Carson City', 'Fernley', 'Minden', 'Gardnerville'], area: ['775'], zips: [89402, 89523], branch: 'Sparks', rep: 'Dale Prentiss' },
	{ code: 'AZ', name: 'Arizona', rate: 0.056, cities: ['Phoenix', 'Mesa', 'Tempe', 'Chandler', 'Glendale', 'Gilbert', 'Scottsdale', 'Casa Grande'], area: ['602', '480', '623'], zips: [85003, 85395], branch: 'Tempe', rep: 'Yesenia Ortiz' },
	{ code: 'OR', name: 'Oregon', rate: 0, cities: ['Portland', 'Salem', 'Tualatin', 'Hillsboro', 'Beaverton', 'Gresham', 'Oregon City', 'McMinnville'], area: ['503', '971'], zips: [97002, 97310], branch: 'Tualatin', rep: 'Owen Lindqvist' },
	{ code: 'WA', name: 'Washington', rate: 0.065, cities: ['Vancouver', 'Camas', 'Longview', 'Battle Ground', 'Washougal'], area: ['360'], zips: [98601, 98686], branch: 'Tualatin', rep: 'Owen Lindqvist' },
	{ code: 'ID', name: 'Idaho', rate: 0.06, cities: ['Boise', 'Nampa', 'Meridian', 'Caldwell', 'Eagle', 'Mountain Home'], area: ['208'], zips: [83605, 83716], branch: 'Boise', rep: 'Shawn Kimball' },
	{ code: 'UT', name: 'Utah', rate: 0.061, cities: ['Salt Lake City', 'Ogden', 'Provo', 'Sandy', 'Layton', 'Orem', 'West Valley City'], area: ['801', '385'], zips: [84003, 84606], branch: 'Salt Lake City', rep: 'Shawn Kimball' },
	{ code: 'NM', name: 'New Mexico', rate: 0.04875, cities: ['Albuquerque', 'Santa Fe', 'Rio Rancho', 'Los Lunas', 'Bernalillo'], area: ['505'], zips: [87001, 87508], branch: 'Albuquerque', rep: 'Yesenia Ortiz' }
];
const stateOf = (code: string) => states.find((st) => st.code === code)!;
const stateWeights = ['CA', 'CA', 'CA', 'CA', 'CA', 'CA', 'NV', 'NV', 'AZ', 'AZ', 'OR', 'OR', 'WA', 'ID', 'UT', 'NM'];
// Days on which a state's rate in the tax table was keyed wrong, and what it was keyed as.
const taxSlips: { code: string; from: number; to: number; wrong: number }[] = [
	{ code: 'NV', from: Date.UTC(2026, 8, 21), to: Date.UTC(2026, 8, 25), wrong: 0.0865 },
	{ code: 'ID', from: Date.UTC(2026, 9, 2), to: Date.UTC(2026, 9, 9), wrong: 0.065 },
	{ code: 'UT', from: Date.UTC(2026, 9, 19), to: Date.UTC(2026, 9, 23), wrong: 0.071 },
	{ code: 'AZ', from: Date.UTC(2026, 10, 2), to: Date.UTC(2026, 10, 6), wrong: 0.065 }
];
/** The rate the tax table held for a state on a day. */
const rateOn = (code: string, day: number) => {
	const slip = taxSlips.find((x) => x.code === code && day >= x.from && day < x.to);
	return slip ? slip.wrong : stateOf(code).rate;
};
const branchPeople: Record<string, string> = { Stockton: 'Hector Villanueva', Sparks: 'Bree Tolliver', Tempe: 'Ramon Echols', Tualatin: 'Gwen Aldana', Boise: 'Lyle Hammond', 'Salt Lake City': 'Tess Okafor', Albuquerque: 'Ruben Archuleta' };
const branchNames = Object.keys(branchPeople);

// ---------------------------------------------------------------------------------------------------------
// People.
const firstF = ['Ana', 'Maribel', 'Denise', 'Kristen', 'Lupe', 'Tamara', 'Shauna', 'Erin', 'Rochelle', 'Mei', 'Jolene', 'Patrice', 'Gabriela', 'Heather', 'Nikki', 'Carmen', 'Becky', 'Yvonne', 'Trish', 'Alondra', 'Kelsey', 'Monique', 'Darlene', 'Priya'];
const firstM = ['Rick', 'Jesse', 'Travis', 'Manny', 'Doug', 'Kyle', 'Armando', 'Brent', 'Cody', 'Hank', 'Ray', 'Dustin', 'Terrell', 'Sergio', 'Wade', 'Phil', 'Luis', 'Garrett', 'Vince', 'Tony', 'Marcus', 'Duane', 'Kenji', 'Aaron'];
const surnames = ['Delgado', 'Hollister', 'McCready', 'Nakamura', 'Okonkwo', 'Ferreira', 'Brandt', 'Castillo', 'Pruitt', 'Yazzie', 'Sandoval', 'Whitlock', 'Hagen', 'Tran', 'Mendoza', 'Kowalski', 'Benally', 'Ashby', 'Gutierrez', 'Lindgren', 'Rasmussen', 'Fairbanks', 'Oyelaran', 'Duarte', 'Pham', 'Strickland', 'Velasquez', 'Brennan'];
const heads = ['Delgado', 'Sierra', 'Bayline', 'Tri-Valley', 'Hollister', 'Ridgeway', 'Cascade', 'Desert Sun', 'Granite', 'Redwood', 'Summit', 'Copper State', 'High Desert', 'Delta', 'Foothill', 'Pacific Crest', 'Mesa Verde', 'Lakeside', 'Northgate', 'Timberline', 'Ironwood', 'Silver State', 'Valley Oak', 'Basin', 'Canyon', 'Big Sky'];
const tails = ['Mechanical', 'Fire Protection', 'Electric', 'Steel Erectors', 'HVAC', 'Plumbing', 'Builders', 'Construction', 'Solar', 'Fabrication', 'Concrete', 'Framing', 'Seismic', 'Facilities', 'Ag Services', 'Millwrights', 'Roofing', 'Signs', 'Utilities', 'Contractors'];
const titles = ['Purchasing manager', 'Buyer', 'Project manager', 'Estimator', 'Office manager', 'Owner', 'Foreman', 'Operations manager', 'Purchasing agent', 'Shop manager', 'Accounts payable', 'Superintendent', 'Senior estimator', 'Project coordinator'];
const deskAgents = ['Rosa', 'Dwayne', 'Keiko', 'Luis', 'Bethany', 'Tomasz', 'Aaliyah', 'Grant'];
const deskLead = 'Marisol';
const jobs = ['a school gym', 'a warehouse retrofit', 'a tenant improvement', 'a parking structure', 'a solar carport', 'a seismic retrofit of an old cannery', 'a cold-storage building', 'a hospital wing', 'a data hall fit-out', 'a winery expansion', 'a distribution center', 'a church hall', 'a fire station', 'a county library', 'an almond processing plant', 'a medical office building', 'a transit maintenance shop', 'a high school science block'];
const competitors = ['Fastenal', 'A local supply house', 'Grainger', 'An online supplier', 'White Cap', 'A distributor in Sacramento'];
const streets = ['Industrial Way', 'Commerce Drive', 'Airport Road', 'Railroad Avenue', 'Mill Street', 'Business Park Drive', 'Frontage Road', 'Yosemite Avenue', 'Main Street', 'Quarry Road'];

// The teams the desk passes things to: their name in the text, the person who answers, and their label.
const teams: Record<string, { name: string; person: string; label: string }> = {
	pricing: { name: 'the pricing team', person: 'Wendell Ostrowski', label: 'Pellham pricing' },
	tax: { name: 'the tax team', person: 'Anjali Rao', label: 'Pellham tax' },
	accounts: { name: 'credit and accounts', person: 'Corinne Haddad', label: 'Pellham credit and accounts' },
	dispatch: { name: 'dispatch', person: '', label: 'Pellham dispatch' },
	sales: { name: 'your sales rep', person: '', label: 'Pellham sales' },
	purchasing: { name: 'purchasing', person: 'Nadine Kerr', label: 'Pellham purchasing' }
};

// ---------------------------------------------------------------------------------------------------------
// Pasted output.
const table = (head: string[], rows: string[][]) =>
	[`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`, ...rows.map((row) => `| ${row.join(' | ')} |`)].join('\n');
const fence = (lines: string[]) => ['```', ...lines, '```'].join('\n');
const col = (text: string, width: number) => text.padEnd(width);

const arts: Record<string, Art> = {
	/** The price box as the customer copied it off the product page. */
	box: (r, s) =>
		fence([
			`${s.bSku ?? s.sku}   ${s.bDesc ?? s.desc}`,
			`Sold by: ${s.bPack ?? s.pack}`,
			`Signed in as ${s.email}`,
			`Deliver to: ${s.siteLabel}`,
			`Quantity: ${s.bQty ?? s.qty}`,
			'',
			`${col('Subtotal', 10)}${s.bSub ?? s.sub}`,
			`${col('Tax', 10)}${s.bTax ?? s.tax}`,
			`${col('Total', 10)}${s.bTotal ?? s.box}`
		]),
	/** An invoice, with its lines in s.lines as [product, quantity, unit price in cents]. */
	invoice: (r, s) => {
		const lines: [Product, number, number][] = s.lines;
		const sub = lines.reduce((sum, [, q, c]) => sum + q * c, 0);
		const freight = Number(s.freightC ?? 0);
		const rate = s.invRate ?? s.rateN;
		const exempt = (s.invExempt ?? s.exempt) === 'yes';
		const tax = exempt ? 0 : Math.round(sub * rate);
		const extra = Number(s.extraC ?? 0);
		const rows = lines.map(([p, q, c]) => [p.sku, p.desc, sep(q), usd(c), usd(q * c)]);
		rows.push(['', '', '', 'Subtotal', usd(sub)]);
		if (freight) rows.push(['', '', '', `Delivery, zone ${s.zone ?? 2}`, usd(freight)]);
		if (extra) rows.push(['', '', '', 'Long-length delivery', usd(extra)]);
		rows.push(['', '', '', exempt ? 'Sales tax (exempt)' : `Sales tax ${pct(rate)}`, usd(tax)]);
		rows.push(['', '', '', '**Total**', `**${usd(sub + freight + extra + tax)}**`]);
		return [`Invoice ${s.inv} · ${s.invDate} · order ${s.order} · ${s.acct} ${s.co}`, '', table(['Item', 'Description', 'Qty', 'Unit price', 'Amount'], rows)].join('\n');
	},
	/** The account's prices for a list of products. */
	priceList: (r, s) => {
		const products: Product[] = s.listProducts;
		return [`Prices for ${s.acct} ${s.co} (${s.tier}), from the pricing system`, '', table(['Item', 'Description', 'Sold by', 'List', 'Your price'], products.map((p) => [p.sku, p.desc, packOf(p), usd(p.list), usd(priceAt(p, s.disc))]))].join('\n');
	},
	/** The rep's list of agreed contract prices, as the customer forwarded it, with the line keyed wrong. */
	contractList: (r, s) => {
		const others: Product[] = s.contractOthers;
		const rows = shuffle(r, [...others.map((p) => [p.sku, p.desc, usd(Math.round(priceAt(p, s.disc) * 0.93))]), [s.sku, s.desc, s.contract]]);
		return [`> From: ${s.rep}`, `> Subject: ${s.co} pricing from ${s.contractStart}`, '>', `> Thanks for your time on ${s.reviewDay}. As agreed, these prices apply from ${s.contractStart}:`, '>', ...table(['Item', 'Description', 'Price'], rows).split('\n').map((line) => `> ${line}`)].join('\n');
	},
	/** The pricing system's record of a product on the account's list. */
	priceRec: (r, s) =>
		fence([
			`Item ${s.sku}  ${s.desc}`,
			`Price list ${s.tier} (${s.acct})`,
			`List price      ${s.list}`,
			`Account price   ${s.price}`,
			`Quantity breaks (none)`,
			``,
			`Changes`,
			`${col(s.lastDay, 10)}break ${s.bq}+ at ${s.breakPrice}   (price list load)`,
			`${col(s.dropDay, 10)}record updated, breaks cleared   (item update)`
		]),
	/** A saved order list that still uses the old codes. */
	savedList: (r, s) => {
		const products: Product[] = s.savedProducts;
		const rows = products.map((p, i) => (i < s.oldK ? [p.old, p.desc, usd(p.list), p.sku, usd(priceAt(p, s.disc))] : [p.sku, p.desc, usd(priceAt(p, s.disc)), p.sku, usd(priceAt(p, s.disc))]));
		return [`Saved list "${s.listName}" (${s.acct}), with the code each line should use`, '', table(['Code on list', 'Description', 'Price today', 'Current code', 'Your price'], rows)].join('\n');
	},
	/** The exemption certificate the desk has on file. */
	cert: (r, s) =>
		fence([
			`Exemption certificate on file for ${s.acct}`,
			`Type        ${s.certType}`,
			`Permit no.  ${s.permit}`,
			`Signed by   ${s.certSigner}`,
			`Received    ${s.certFrom}`,
			`Valid to    ${s.certEnd}`
		]),
	/** Invoices since a date, with their tax. */
	invoiceList: (r, s) => [table(['Invoice', 'Date', 'Goods', 'Sales tax', 'Total'], s.invRows), '', `Total tax on these: ${s.credit}`].join('\n'),
	/** The account's delivery sites. */
	sites: (r, s) => [`Delivery sites on ${s.acct} ${s.co}`, '', table(['Site', 'Address', 'City', 'State', 'Added'], s.siteRows)].join('\n'),
	/** Logins attached to the company's accounts. */
	logins: (r, s) =>
		[
			`Logins for ${s.co}`,
			'',
			table(['Login', 'Name', 'Account', 'Price list', 'Last sign-in'], [
				[s.email, s.full, `${s.hqAcct} (head office)`, s.hqTier, s.lastIn],
				[s.mateEmail, s.mateName, `${s.acct} (${s.city})`, s.tier, s.lastIn2],
				[s.mgrEmail, s.branchMgr, `${s.acct} (${s.city})`, s.tier, s.lastIn3]
			])
		].join('\n'),
	/** The rep's email about the new price level, as forwarded. */
	repMail: (r, s) =>
		[`> From: ${s.rep}`, `> Sent: ${s.repSent}`, `> Subject: Your account review`, '>', `> Hi ${s.first}, thanks again for making time for the review. Your spend over the last twelve months puts ${s.co} in ${s.tierNew}, so you'll see the better prices from ${s.tierStart}. Let me know if you have any questions.`, '>', `> ${s.repFirst}`].join('\n'),
	/** The credit application's progress. */
	application: (r, s) =>
		table(['Step', 'Status'], [
			['Application form', `received ${s.appDay}`],
			['Resale certificate', s.appCert],
			[`Trade reference: ${s.refA}`, 'emailed, no answer yet'],
			[`Trade reference: ${s.refB}`, 'emailed, no answer yet'],
			[`Trade reference: ${s.refC}`, `answered ${s.refDay}`],
			['Credit limit', 'not set']
		]),
	/** The delivery rate card for a branch. */
	rates: (r, s) =>
		[
			`Delivery from ${s.branch} (box truck, liftgate)`,
			'',
			table(['Zone', 'Distance from the branch', 'Charge', 'Free over'], [
				['1', 'up to 25 miles', '$45.00', '$500.00'],
				['2', '25 to 60 miles', '$85.00', '$750.00'],
				['3', '60 to 120 miles', '$140.00', '$1,500.00'],
				['4', 'over 120 miles', 'quoted', 'quoted']
			]),
			'',
			'Long lengths over 12 ft go by flatbed, with a surcharge. Collection from the branch is free.'
		].join('\n'),
	/** Stock of a product at each branch. */
	stock: (r, s) => table(['Branch', 'On hand', 'Allocated', 'Free', 'Next supplier delivery'], s.stockRows),
	/** A formal quote from September, as the customer pasted it. */
	quoteDoc: (r, s) =>
		fence([`PELLHAM SUPPLY · QUOTATION ${s.oldQt}`, `Date ${s.oldQtDay}   Valid 30 days`, `To ${s.co} (${s.acct})`, '', `${col(s.sku, 14)}${col(s.desc, 56)}${col(sep(s.qtyN), 7)}${s.oldPrice}`, '', `Prices exclude delivery and sales tax.`]),
	/** The rep's PDF price list, as the customer copied it. */
	pdfList: (r, s) => {
		const products: Product[] = s.listProducts;
		return [`Pellham Supply price list, ${s.pdfDate}`, '', table(['Item', 'Description', 'Price'], products.map((p, i) => [p.sku, p.desc, i === 0 ? s.pdfPrice : usd(Math.round(priceAt(p, s.disc) * s.pdfFactor))]))].join('\n');
	},
	/** A competitor's quote, as the customer pasted it. */
	compQuote: (r, s) =>
		fence([`QUOTE ${s.compRef}`, `Customer: ${s.co}`, `Job: ${s.job.replace(/^an? /, '')}`, '', `${col('Item', 40)}${col('Qty', 8)}${col('Unit', 10)}Ext`, `${col(s.compDesc, 40)}${col(sep(s.qtyN), 8)}${col(s.compPrice, 10)}${s.compExt}`, '', `Valid 14 days. Freight extra.`]),
	/** A formal quote the desk made. */
	formalQuote: (r, s) =>
		fence([
			`PELLHAM SUPPLY · QUOTATION ${s.qt}`,
			`Valid 30 days from the date of issue`,
			`To ${s.co}, ${s.coAddr}`,
			`Job ${s.job.replace(/^an? /, '')}, ${s.city}`,
			'',
			`${col(s.sku, 14)}${col(s.desc, 56)}${col(sep(s.qtyN), 7)}${col(s.price, 10)}${s.sub}`,
			`${col(s.sku2, 14)}${col(s.desc2, 56)}${col(s.qty2, 7)}${col(s.price2, 10)}${s.sub2}`,
			`${col('DELIVERY', 14)}${col(`zone ${s.zone} from ${s.branch}`, 56)}${col('1', 7)}${col(s.charge, 10)}${s.charge}`,
			'',
			`${col('', 77)}${col('Goods', 10)}${s.goods}`,
			`${col('', 77)}${col('Delivery', 10)}${s.charge}`,
			`${col('', 77)}${col('Tax', 10)}${s.qtTax}`,
			`${col('', 77)}${col('Total', 10)}${s.qtTotal}`
		]),
	/** The customer's PO, built line by line from the price box. */
	poTable: (r, s) => [`PO ${s.po} (${s.co})`, '', table(['Line', 'Item', 'Qty', 'Goods', 'Tax from the website', 'Line total'], s.poRows), '', `PO total ${s.poTotal}; invoice ${s.inv} total ${s.invTotal}.`].join('\n'),
	/** The tax table's history for a state, from the tax team. */
	taxTable: (r, s) => table(['State', 'Rate', 'From', 'Keyed by'], [[s.st, s.rightPct, '1 January', 'tax team'], [s.st, s.wrongPct, s.incStart, 'tax table update']])
};

// ---------------------------------------------------------------------------------------------------------
// Topics. Slots in braces are filled per ticket. A ticket's main matter is one topic; a smaller matter raised on
// the way is another. Where the problem really lay (cat) and how a ticket can end (outs) are never written out:
// they follow from what the desk finds and from the ticket's last messages.
type Outcome = 'sorted' | 'credit' | 'team' | 'customer' | 'change';
type Cat = 'api' | 'price' | 'tax' | 'account' | 'delivery' | 'none';
type Turn = [string, string, Art?];
interface Topic {
	key: string;
	cat: Cat;
	w: number;
	outs: Outcome[];
	/** Sets up the account in a way another matter cannot share, so it is never a smaller matter. */
	mainOnly?: boolean;
	/** No smaller matter can come up alongside it. */
	alone?: boolean;
	ok?: (day: number) => boolean;
	setup: (r: Rand, s: Slots, out: Outcome) => void;
	subj: string[];
	open: string[];
	quick: [string, string];
	reply: string;
	turns: Turn[];
	more?: [string, string][];
	/** An internal note after the desk's first finding. */
	note?: [string, Art?];
	/** For 'customer': how many turns come before the desk asks, and what it asks for, after "I need you to". */
	actAt?: number;
	act?: string;
	/** Why the desk needs it, said once when it asks. */
	why?: string;
	/** The desk's last words after the customer's reply, when the usual closings don't fit. */
	closing?: string;
	/** The customer's message that does what the desk asked, before these outcomes. */
	gave?: [string, Outcome[]];
	/** Never handed to a team before it is sorted or credited. */
	noVia?: boolean;
	done?: [string, string];
	credit?: string;
	team?: [string, string];
	push?: string;
	change?: string;
	changeNote?: string;
}

const fine = (total: number) => total % 100 >= 10;
/** Pasted output that comes from Pellham's own systems, so the desk pastes it, not the customer. */
const deskArts = new Set<Art>([arts.priceRec, arts.savedList, arts.cert, arts.sites, arts.logins, arts.application, arts.rates, arts.stock, arts.priceList, arts.formalQuote, arts.taxTable]);
const setItem = (s: Slots, p: Product, prefix = '') => {
	s[`${prefix}sku`] = p.sku;
	s[`${prefix}desc`] = p.desc;
	s[`${prefix}pack`] = packOf(p);
	s[`${prefix}unit`] = p.pack ? 'box' : p.unit;
	s[`${prefix}list`] = usd(p.list);
};
/** Prices a quantity of a product as the price box would, and fills the slots for it. */
const quote = (r: Rand, s: Slots, p: Product, opts: { price?: number; ok?: (total: number) => boolean; q?: (r: Rand) => number } = {}) => {
	const price = opts.price ?? priceAt(p, s.disc);
	let qty = 0;
	let sub = 0;
	let tax = 0;
	for (let i = 0; i < 400; i++) {
		qty = opts.q ? opts.q(r) : qtyOf(r, p);
		sub = Math.round(price * qty);
		tax = Math.round(sub * s.rateN);
		if ((opts.ok ?? fine)(sub + tax)) break;
	}
	setItem(s, p);
	Object.assign(s, { product: p, priceC: price, price: usd(price), qtyN: qty, qty: Number.isInteger(qty) ? sep(qty) : String(qty), subC: sub, sub: usd(sub), taxC: tax, tax: usd(tax), totalC: sub + tax, total: usd(sub + tax), box: shown(sub + tax) });
	s.lines = [[p, qty, price]];
};
const others = (r: Rand, p: Product, low: number, high: number) => shuffle(r, regular.filter((x) => x.sku !== p.sku)).slice(0, int(r, low, high));
const taxable = (r: Rand, s: Slots) => {
	if (!s.rateN) place(r, s, pick(r, ['CA', 'CA', 'NV', 'AZ', 'WA']));
};
const typo = (r: Rand, sku: string) => {
	const i = int(r, 1, Math.max(1, sku.indexOf('-') - 2));
	return sku.slice(0, i) + sku[i + 1] + sku[i] + sku.slice(i + 2);
};
const credit = (s: Slots, cents: number) => {
	s.creditC = cents;
	s.credit = usd(cents);
};
const zoneCharge = [0, 4500, 8500, 14000];
const zoneFree = [0, 50000, 75000, 150000];

const topics: Topic[] = [
	{
		key: 'format',
		cat: 'api',
		w: 4,
		outs: ['change'],
		setup: (r, s) => {
			quote(r, s, pick(r, regular), { ok: (t) => t % 100 >= 1 && t % 100 <= 9 });
			s.right = usd(s.totalC);
		},
		subj: [`Total on the website doesn't add up`, 'Price box total', 'Website total vs invoice', 'Which total is right?', 'Figures on {sku}'],
		open: [
			`I priced {qty} x {sku} on your site this morning. The box says subtotal {sub} and tax {tax}, and the total underneath says {box}. My calculator makes those two {right}. Which is it? I'd rather not put the wrong figure in front of my customer.`,
			`Small thing, but it's driving our bookkeeper mad. The total on your website doesn't match what we get billed. We ordered {qty} of the {desc} ({sku}) and the site said {box}, then the invoice came in at {right}. Are we paying for something the site doesn't show?`,
			`Your price box seems to think {sub} plus {tax} is {box}. I checked it three times. Is the tax line wrong or the total?`
		],
		quick: [`Is the total in the price box before or after sales tax?`, `After. The box shows the subtotal, then the sales tax for the state you're delivering to, and the total is the two together.`],
		reply: `Thanks for flagging it, and sorry for the confusion. Could you send me exactly what the price box showed, copied off the page or as a screenshot, and the order number if you placed the order? Then I can put the two side by side.`,
		turns: [
			[`Copied straight off the page below. The order went in as {order}.`, `Thanks, that's very clear. The invoice for {order} is {right}: the subtotal plus the tax, to the cent. So you were billed correctly, and it's the total line in the box that's off. It looks as if it loses the zero at the start of the cents, so {right} comes out as {box}. Let me check that with our web people before I tell you anything more.`, arts.box],
			[`So the website's wrong? How long has it been like that?`, `It is. I tried a few products myself, and it only happens when the cents are under ten: anything from .01 to .09 loses its zero, so .05 shows as .5, which anyone would read as fifty cents. The subtotal and tax lines are right every time; only the total line does it. I can't tell you how long, but I've seen it on an older ticket too.`]
		],
		more: [
			[`Has anyone actually been charged the wrong amount because of it?`, `No. Orders are invoiced from the subtotal and tax, never from the figure on the total line, so the invoice is always right. It's a display fault, which I know is little comfort when you've quoted a customer off it.`],
			[`I've got a bid out with a figure I took from that box. Should I worry?`, `Look at the cents of the total you used. If they were under ten, the true total is lower than the figure you read, by less than a dollar, so you haven't underbid. If you send me the product and quantity I'll confirm the exact figure.`],
			[`Can I trust the subtotal and tax lines in the meantime?`, `Yes. Those two are always right, and added together they give you the exact figure that goes on the invoice.`]
		],
		push: `OK. Is somebody going to fix it, or do we just live with it?`,
		change: `I've passed it to our storefront platform team, who look after the quote behind the price box. They've confirmed the total line drops that zero, it's on their list to fix, and your ticket is attached so you hear when it's done. Until then, the subtotal plus the tax is what your invoice will say.`,
		changeNote: `Jonas (storefront platform) confirms the quote API formats the total itself and drops the leading zero of the cents: {right} shows as {box}. Logged with them as a fix to the total; this ticket is linked.`
	},
	{
		key: 'quantity',
		cat: 'api',
		w: 2,
		outs: ['change'],
		setup: (r, s) => {
			const p = shuffle(r, regular.filter((x) => x.pack > 0 || x.unit === 'length')).find((x) => priceAt(x, s.disc) % 2 === 0) ?? boxed[0]!;
			quote(r, s, p, { q: (rr) => int(rr, 3, 30) + 0.5 });
			s.qtyUp = String(Math.ceil(s.qtyN));
			s.invSub = usd(s.priceC * Math.ceil(s.qtyN));
			s.lines = [[p, Math.ceil(s.qtyN), s.priceC]];
		},
		subj: ['Half a box?', `Invoice doesn't match the website`, 'Quantity question', 'Charged for more than I ordered', 'Order {order}'],
		open: [
			`I typed {qty} into the quantity for {sku} because we only needed half of one more to finish the job, and the website gave me a price for {qty}: {sub} plus tax. The invoice has come through for {qtyUp} at {invSub}. If you can't sell half a {unit}, why does the website quote me for one?`,
			`We've been billed for {qtyUp} of {sku} when the site quoted {qty}. I know it's only half a {unit}, but our PM approved the figure off the website and now I have to explain the difference to him.`
		],
		quick: [`Can I order a single length of rod instead of a bundle?`, `Yes. Rod and strut are sold by the single length, so a quantity of 1 is one length, and you can order any whole number of them.`],
		reply: `Thanks for explaining, and sorry for the muddle. Could you send me the order number, and what the price box showed when you priced it? I'd like to see exactly what it quoted.`,
		turns: [
			[`Order {order}. This is what the box said:`, `Thanks. {sku} is only sold by the whole {unit}, so when the order came through with {qty}, our order system rounded it up to {qtyUp}, and that's what was picked and invoiced. The price box shouldn't have taken {qty} in the first place: it priced half a {unit} as if we sold one. That part is on us, not you.`, arts.box],
			[`So what do I tell my PM about the difference?`, `That the website priced a half {unit}, which we don't sell, and the order system rounded it up. The {qtyUp} on the invoice is what was delivered, at your normal price of {price}. I've checked with our web people, and at the moment the box will take anything at all, even a quantity of zero or a fraction.`]
		],
		more: [
			[`Is that why my colleague got a price of nothing last week? He thought the site was broken.`, `Very likely. A quantity of 0 gets a price of nothing at all, rather than a message asking for a real quantity. It's the same fault.`],
			[`What happens if someone types a minus by accident?`, `I tried that too, and the box gives a negative amount. Nothing can be ordered that way, because the basket refuses it, but it's another thing the price box shouldn't accept.`]
		],
		change: `I've reported it to our storefront platform team, who look after the quote behind the price box, and they agree it should only take whole quantities and say so when you type anything else. It's on their list, with your ticket attached. In the meantime, whole numbers only in that box, and the price you see is the price you'll pay.`,
		changeNote: `Raised with Elif (storefront platform): the quote API takes quantities like {qty}, 0 and negatives and prices them. Agreed it should refuse anything that isn't a whole number from 1 up; on their list, ticket linked.`
	},
	{
		key: 'exempt-quote',
		cat: 'api',
		w: 2,
		outs: ['change'],
		mainOnly: true,
		setup: (r, s) => {
			taxable(r, s);
			s.exempt = 'yes';
			quote(r, s, pick(r, regular));
			s.certEnd = `${pick(r, ['31 March', '30 June', '31 August', '28 February'])} ${pick(r, ['2027', '2028', '2029'])}`;
		},
		subj: ['Tax on our quotes', `We're tax exempt`, 'Why does the website add tax?', 'Sales tax showing on the website'],
		open: [
			`We're set up as tax exempt with you (resale, the certificate has been on file for years) but the price box on the website adds sales tax to everything. Our estimators take the total straight into their bids, so every bid we've sent this month is {ratePct} too high. Can you take the tax off our account?`,
			`Quick one: the website is showing tax on our prices. {qty} {sku} comes up as {sub} plus {tax} tax. Our invoices never have tax on them, so which is right?`
		],
		quick: [`Do you take resale certificates from other states?`, `Yes. We keep one certificate per state on each account, and each covers deliveries into its own state. We ask for fresh ones every three years.`],
		reply: `Thanks for getting in touch. Let me check your account. Could you send me a recent invoice number and what the price box showed for the same product, so I can compare the two?`,
		turns: [
			[`Invoice {inv}, and the box for the same thing today:`, `Thanks. Your exemption is on file and in date: your certificate runs to {certEnd}, and invoice {inv} has no tax on it, which is right. So you aren't paying tax and won't be. What's wrong is the price box: it works the tax out from the delivery state alone and doesn't look at whether the account is exempt, so it shows {ratePct} to everyone delivering to {st}.`, arts.box],
			[`So it's been like this the whole time? Nobody told us.`, `I'm afraid so, as far as I can tell. I've asked our web people and they confirm the box has never known about exemptions. Your invoices have always been right; it's the figure on the page that's been too high.`]
		],
		more: [
			[`What should the estimators use for now?`, `The subtotal line. For your account that's the full price you'll be billed for the goods, before any delivery.`],
			[`Will our invoices change?`, `No. Invoices are worked out by the order system, which does check the exemption. Nothing about how you're billed changes.`]
		],
		push: `Fine, but our estimators shouldn't have to remember to ignore half the box.`,
		change: `Agreed, and I've raised it with our storefront platform team, who look after the quote behind the price box. They agree the box should leave the tax off for exempt accounts, and it's on their list now, with your ticket attached so you hear when it changes. Until then, please use the subtotal line for bids: it's what you'll be billed.`,
		changeNote: `Elif (storefront platform) confirms the quote API looks up the rate by delivery state only and never sees the account's exemption, so exempt accounts always see tax. Logged with them: leave tax off for exempt accounts. Ticket linked.`
	},
	{
		key: 'unit-price',
		cat: 'api',
		w: 2,
		outs: ['change'],
		setup: (r, s) => {
			const p = pick(r, regular);
			quote(r, s, p, { ok: (t) => fine(t) && t % 7 !== 0 });
			s.perUnit = `$${(s.totalC / s.qtyN / 100).toFixed(4)}`;
			s.listProducts = [p, ...others(r, p, 4, 7)];
		},
		subj: ['Unit price?', 'Need unit prices for a bid', 'Price per piece', 'Website only shows totals'],
		open: [
			`I'm filling in a bid form that asks for the unit price of every line, and your website only gives me totals. I've been dividing the total by the quantity, but {qty} of {sku} gives me {perUnit} each, which can't be right. Where do I find our actual unit price?`,
			`Is there any way to see the price per {unit} on the website? I priced {qty} of {sku} and got a total of {total}. The GC wants unit prices on the schedule of values, not totals.`
		],
		quick: [`Can you email me a price list for our account?`, `Yes. I can send your account's current prices as a spreadsheet, either for everything you've bought in the last year or for a list of products you give me.`],
		reply: `Happy to help with that. Which products are on the bid form? If you send me the list, I'll give you your unit prices for each.`,
		turns: [
			[`Here's the list off the form. It's mostly fixings.`, `Thanks. Here are your unit prices for those, from your account's price list. The reason the division didn't work is that the total in the price box includes sales tax, so dividing it by the quantity gives you the price plus {ratePct}. Dividing the subtotal line would get you there, but the unit price itself isn't shown anywhere in the box.`, arts.priceList],
			[`That's a lot of digging for something the website must already know.`, `It does know it: the box works the subtotal out from the unit price. It just doesn't show it. You're not the first to ask, and I'd rather the box showed it than have you email me for every bid.`]
		],
		more: [[`Do these prices hold for a while? The bid closes on {bidDay}.`, `They're your current prices and there's no change planned for those products that I know of. If you need them held for a set period, I can turn the list into a formal quote that's good for 30 days.`]],
		change: `I've asked our storefront platform team, who look after the quote behind the price box, to show the unit price next to the subtotal. They've put it on their list, and your ticket is attached so you hear when it's there. Until then, send me any list and I'll come back with unit prices the same day.`,
		changeNote: `Logged with Jonas (storefront platform): customers want the unit price in the price box; the quote API only gives the subtotal, tax and total. Ticket linked.`
	},
	{
		key: 'contract-missing',
		cat: 'price',
		w: 3,
		outs: ['sorted', 'credit', 'credit', 'team'],
		setup: (r, s) => {
			const p = pick(r, regular);
			quote(r, s, p);
			const start = s.day - int(r, 8, 30) * DAY;
			const contract = Math.round(s.priceC * (0.88 + 0.06 * r()));
			const ordersN = int(r, 1, 4);
			const qtyO = Array.from({ length: ordersN }, () => qtyOf(r, p)).reduce((a, b) => a + b, 0);
			Object.assign(s, { contractC: contract, contract: usd(contract), contractStart: dayMonth(start), reviewDay: dayMonth(start - int(r, 5, 20) * DAY), skuTypo: typo(r, p.sku), contractOthers: others(r, p, 4, 6), ordersN: String(ordersN), qtyO: sep(qtyO), diff: usd(s.priceC - contract) });
			const diff = (s.priceC - contract) * qtyO;
			credit(s, diff + (s.exempt === 'yes' ? 0 : Math.round(diff * s.rateN)));
		},
		subj: ['Contract prices not showing', 'Price on {sku}', 'Our new prices?', 'Wrong price after our review', 'Pricing question'],
		open: [
			`We sat down with {rep} on {reviewDay} and agreed new prices on our regular lines from {contractStart}. Most of them are showing on the website, but {sku} still comes up at {price}, which is the old figure. We buy a lot of it, so it matters.`,
			`The price box is still giving me {price} for {sku}. My understanding from {repFirst} is that it went to {contract} on {contractStart}. Has something not been loaded?`
		],
		quick: [`Who do I talk to about adding a product to our contract?`, `Your sales rep, {rep}. Contract prices are agreed with the rep and then loaded by our pricing team, usually within two working days of the rep sending them over.`],
		reply: `Thanks for letting me know. Could you send me {repFirst}'s confirmation of the new prices, or the list you agreed, so I can check what was loaded against what was agreed?`,
		turns: [
			[`Here's the list {repFirst} sent after the meeting.`, `Thanks. I've compared it with your account in the pricing system. Everything on the list is loaded except {sku}: there's an entry for a code that's one character off, {skuTypo}, which isn't a product we sell, so the website falls back to your standard {tier} price for {sku}. It looks like a typing slip when the contract was keyed in.`, arts.contractList],
			[`OK, so can it be fixed?`, `Yes. Contract prices can only be changed by the pricing team, so I've sent them the details with {repFirst}'s list attached. It's a straightforward correction.`]
		],
		more: [
			[`Have we been paying the old price on the orders since then?`, `On {sku} only, yes. I can see {ordersN} orders with it since {contractStart}, {qtyO} in all, at {price}.`],
			[`Are any of the other contract lines likely to be wrong?`, `I checked each line on the list against the system, and the rest match, prices and start date.`]
		],
		done: [`Wendell in pricing has corrected the entry, so {sku} now shows {contract} on the website, from {contractStart} as agreed. Could you check it from your side?`, `Just looked and it's showing {contract} now. Thank you.`],
		credit: `The pricing team has corrected the entry, so {sku} shows {contract} from today. I've also raised a credit note for the difference on the orders since {contractStart}: {qtyO} at {diff} less each, which comes to {credit} with the tax. It'll show on your next statement as {cn}.`,
		team: ['pricing', `Contract for {acct} has {skuTypo} instead of {sku}, so the website shows the {tier} price {price} rather than the agreed {contract} from {contractStart}. Rep's list attached. Customer has {ordersN} orders with {sku} since then; please correct the entry and say whether we credit the difference.`]
	},
	{
		key: 'uom',
		cat: 'price',
		w: 2,
		outs: ['sorted', 'sorted', 'team'],
		setup: (r, s) => {
			const p = shuffle(r, boxed).find((x) => s.rateN > 0 || (priceAt(x, s.disc) * x.pack) % 100 !== 0) ?? boxed[0]!;
			quote(r, s, p);
			const each = s.priceC * p.pack;
			let q = int(r, 2, 12);
			for (let k = 0; k < 40 && !fine(each * q + Math.round(each * q * s.rateN)); k++) q++;
			Object.assign(s, { highEach: usd(each), bQty: String(q), bSub: usd(each * q), bTax: usd(Math.round(each * q * s.rateN)), bTotal: shown(each * q + Math.round(each * q * s.rateN)), qty: String(q), packN: sep(p.pack) });
			s.highSub = s.bSub;
			s.update = s.day >= PRICE_RISE && s.day < PRICE_RISE + 8 * DAY ? 'the October price update' : `last week's price file`;
		},
		subj: ['Price on {sku} looks crazy', 'Is this right??', 'Price jumped on anchors', 'Website price for {sku}'],
		open: [
			`Either the price of {desc} has gone through the roof or your website's broken. {sku} was {price} a box last time, and today the site wants {highSub} for {qty} boxes. That's {highEach} a box.`,
			`Can someone look at {sku}? The price box is quoting {highEach} per box. I'm fairly sure we pay about {price}.`
		],
		quick: [`Do you sell wedge anchors by the piece?`, `Only the larger sizes. The 3/8 and 1/2 inch wedge anchors are sold by the box; the 5/8 inch and up come in smaller boxes, and the big structural ones by the piece.`],
		reply: `That does look wrong, so thanks for catching it before ordering. Which account are you signed in with, and could you paste what the price box shows? I'll check it against the pricing system.`,
		turns: [
			[`Signed in as {email}, account {acct}. Here's the box:`, `Thanks. Your price for {sku} is {price} a box and hasn't changed. What changed is the unit: when {update} was loaded, {sku} was set to be priced per piece instead of per box, so the box multiplies your box price by the {packN} pieces in it. It's the same for every account, not just yours.`, arts.box],
			[`Has anyone actually been charged that?`, `No. Lines over a set amount are held for a check before they're released, and nothing at that price has gone through. A couple of other customers priced it this week and didn't order.`]
		],
		more: [[`I need {qty} boxes for {jobDay}. Can I order today?`, `Yes. I can put the order in for you by hand at {price} a box, or you can wait until the website shows the right price and order there.`]],
		done: [`The pricing team has set {sku} back to per box, and the website shows {price} a box again. Sorry for the fright.`, `All good now, I can see {price}. Order going in this afternoon.`],
		team: ['pricing', `{sku} has been priced per piece since {update}, so the price box multiplies the box price by {packN} ({highEach} a box). Affects all accounts. Please set it back to per box.`]
	},
	{
		key: 'break-missing',
		cat: 'price',
		w: 2,
		outs: ['sorted', 'sorted', 'team'],
		setup: (r, s) => {
			const p = pick(r, regular);
			const bq = p.unit === 'box' ? 20 : p.unit === 'length' ? 50 : p.unit === 'cartridge' ? 48 : p.unit === 'kit' || p.unit === 'bit' ? 24 : 500;
			quote(r, s, p, { q: (rr) => Math.round(bq * (1.1 + rr() * 1.5)) });
			const breakC = Math.round(s.priceC * 0.92);
			const last = s.day - int(r, 40, 80) * DAY;
			Object.assign(s, { bq: sep(bq), breakPrice: usd(breakC), breakSub: usd(breakC * s.qtyN), lastMonth: MONL[utc(last).getUTCMonth()], qtyO: sep(Math.round(bq * (1 + r()))), dropDay: shortDay(s.day - int(r, 3, 20) * DAY), lastDay: '1 Jul' });
		},
		subj: ['Quantity price not showing', 'Price break?', 'Price for {qty} {sku}', 'Volume pricing', 'Bulk price on {sku}'],
		open: [
			`Our price list has {sku} at {breakPrice} once you buy {bq} or more, but the price box gives me {price} each for {qty}, the same as if I bought ten. Has the break been taken off?`,
			`I'm pricing {qty} {sku} for {job} and the website isn't giving me the quantity price. The last time we bought that many it was cheaper per {unit}.`
		],
		quick: [`Do quantity breaks count per order or per line?`, `Per line. Two lines of the same product on one order are added together, but different products don't count towards each other's break.`],
		reply: `Thanks. Could you send me the order where you last got the quantity price, or the price list you're going from? Then I can see which break you should be getting.`,
		turns: [
			[`It was order {order2}, back in {lastMonth}.`, `Thanks, that's what I needed. On {order2} you got {breakPrice} for {qtyO}, so the break at {bq} was there then. In the pricing system today, {sku} has no break at all on your list: it was cleared when the product's record was updated on {dropDay}. The other products on your list kept theirs.`, arts.priceRec],
			[`So I've been paying full price since then?`, `Only if you bought {bq} or more in one line, and I can't see an order like that since {dropDay}, so you haven't lost anything yet. It's this quote that would have cost you.`]
		],
		more: [[`Can you price my {qty} at the break for now?`, `Yes. I can put the order in by hand at {breakPrice}, or you can wait for the website to show it.`]],
		note: [`Checked the other items updated on {dropDay}: only {sku} lost its breaks.`],
		done: [`The pricing team has put the break back on {sku}, so {qty} now prices at {breakPrice} each on the website. I've checked it from your account.`, `Just checked and it's right now, {breakSub} for {qty}. Thanks.`],
		team: ['pricing', `{sku} lost its {bq}+ break on {acct}'s list when the item was updated on {dropDay} (it was {breakPrice}; last used on {order2}). Customer is pricing {qty} now. Please restore the break.`]
	},
	{
		key: 'old-code',
		cat: 'price',
		w: 2,
		outs: ['sorted', 'credit', 'customer'],
		setup: (r, s) => {
			const p = pick(r, regular);
			quote(r, s, p);
			const saved = [p, ...others(r, p, 4, 8)];
			const oldK = saved.length - int(r, 0, 2);
			const ordersN = int(r, 3, 11);
			Object.assign(s, { old: p.old, listP: usd(p.list), listName: pick(r, ['Weekly shop order', 'Strut and rod', 'Yard restock', 'Service vans', 'Standard fixings', 'Job box', 'Monthly stock']), savedProducts: saved, oldK, ordersN: String(ordersN) });
			s.oldCount = oldK === saved.length ? `All of them, every one of the ${saved.length} lines on "${s.listName}"` : `Most of them: ${oldK} of the ${saved.length} lines on "${s.listName}"`;
			credit(s, saved.slice(0, oldK).reduce((sum, x) => sum + (x.list - priceAt(x, s.disc)) * int(r, 2, 10), 0));
		},
		subj: ['Two prices for the same bolt?', 'Reorder list prices', 'Why is {old} dearer than {sku}?', 'Price difference on our reorder', 'Saved list'],
		open: [
			`We reorder from a saved list on your website and the prices on it have crept up. {old} shows {listP}, but if I search for the same thing I get {sku} at {price}. Same product as far as I can see. What's going on?`,
			`Our buyer noticed that the item code on our standing order, {old}, costs us more than {sku}, which looks like the exact same {desc}. Which one should we be ordering?`
		],
		quick: [`Can I share a saved list with someone else at our company?`, `Yes. Open the list, choose Share, and pick anyone who signs in under your account. They can order from it but not change it.`],
		reply: `Good catch. Which saved list is it, and roughly when did you set it up? I'll look at the codes on it.`,
		turns: [
			[`It's the one called "{listName}". We set it up a couple of years ago.`, `Thanks. That list was made before our catalogue was renumbered in August, so it still uses the old codes. The old codes still work, so that nobody's orders broke overnight, but they only carry the standard list price. Your account's prices moved to the new codes, so {old} costs you {listP} and {sku} costs you {price}, for the same {unit}.`, arts.savedList],
			[`How many of the things on our list are old codes?`, `{oldCount}. The table above shows the current code for each.`]
		],
		more: [[`Have we been paying list price on all of those since August?`, `On orders from that list, yes. I can see {ordersN} orders from it since the renumbering.`]],
		actAt: 2,
		act: `change the item codes in your own purchasing system too, and let me know when that's done`,
		why: `The PO template your office keys from still has the old codes, so orders keyed from it would keep coming in under them. Once they're changed, I'll credit the difference since August.`,
		done: [`The quickest fix is to swap the codes on the list, and I've done it for you on "{listName}": every line now uses the current code and your own price. Could you open it and check it looks right?`, `Opened it and the prices look like ours again. Thanks.`],
		credit: `I've swapped the codes on "{listName}", so every line uses the current code and your own price. And as the old codes were never meant to cost you more, I've credited the difference on the {ordersN} orders from that list since August: {credit}, on credit note {cn}.`
	},
	{
		key: 'call-for-price',
		cat: 'price',
		w: 2,
		outs: ['sorted', 'team'],
		ok: (day) => day > ADDED_DAY + 2 * DAY,
		setup: (r, s) => {
			quote(r, s, pick(r, catalogue.filter((p) => p.added)));
			s.addedDay = dayMonth(ADDED_DAY);
		},
		subj: ['Call for price?', 'No price on {sku}', `Can't order {sku} online`, 'Price for {desc}'],
		open: [
			`The website says "Call for price" on {sku} when I'm signed in. I can see the product and the description, just no price, and I can't add it to the basket. I need {qty} for {job}.`,
			`Why does {sku} say Call for price? My colleague says it showed a price when he looked at it signed out.`
		],
		quick: [`Can I see prices without signing in?`, `Signed out, the website shows list prices. Signed in, it shows your account's own prices, so it's worth signing in before you price anything.`],
		reply: `Sorry about that. Let me look at {sku} on your account. In the meantime, how many do you need and when? I can quote you by phone or email if it's pressing.`,
		turns: [
			[`{qty}, delivered to {city} by {jobDay} if possible.`, `Thanks. {sku} was added to the catalogue on {addedDay}, and new products are added to each trade price list separately. It's on the list price list, which is why your colleague saw a price signed out, but it hasn't been added to your account's {tier} list yet. When a product isn't on an account's list, the website shows Call for price rather than guessing.`],
			[`Can you just give me a price then?`, `Yes: at your {tier} discount it would be {price} a {unit}, so {sub} for {qty} before tax. I can put an order in by hand at that price today if you'd like.`]
		],
		more: [[`Are there other new products we can't see?`, `Four products were added on {addedDay}, all larger anchors, stainless strut and rod, and the bigger epoxy. I'll make sure they're all added, not just this one.`]],
		done: [`The pricing team has added {sku} and the other new products to your {tier} list, so they show your prices on the website now and you can order them there.`, `Thanks, it's showing {price} now and I've put the order in.`],
		team: ['pricing', `{sku} (added {addedDay}) isn't on the {tier} price list, so {acct} sees Call for price. Please add it and the other new products from that day to the trade lists. I've quoted {price} by email in the meantime.`]
	},
	{
		key: 'cert-expired',
		cat: 'tax',
		w: 3,
		outs: ['customer', 'customer', 'credit', 'credit', 'team'],
		mainOnly: true,
		setup: (r, s) => {
			taxable(r, s);
			quote(r, s, pick(r, regular));
			const end = s.day - int(r, 14, 45) * DAY;
			const n = int(r, 2, 5);
			const rows: string[][] = [];
			let tax = 0;
			for (let i = 0; i < n; i++) {
				const goods = int(r, 18000, 260000);
				const t = Math.round(goods * s.rateN);
				tax += t;
				const when = end + Math.round(((i + 1) * (s.day - end)) / (n + 1));
				if (i === 0) s.firstTaxed = dayMonth(when);
				rows.push([`INV-${int(r, 700000, 789999)}`, shortDay(when), usd(goods), usd(t), usd(goods + t)]);
			}
			const old = `${pick(r, [...firstF, ...firstM])} ${pick(r, surnames)}`;
			Object.assign(s, { certEnd: dayMonth(end), invRows: rows, invN: String(n), inv: rows.at(-1)![0], invTax: rows.at(-1)![3], oldContact: old, oldContactFirst: old.split(' ')[0], certType: `${s.stName} resale certificate`, permit: `${int(r, 100, 999)}-${int(r, 100000, 999999)}`, certSigner: old, certFrom: `${dayMonth(end - int(r, 0, 20) * DAY)} 2023`, newEnd: `${dayMonth(s.day)} 2029` });
			credit(s, tax);
		},
		subj: ['Tax on our invoices', 'Why are we being charged sales tax?', 'Invoice {inv}', 'Tax exempt account', 'Sales tax?'],
		open: [
			`Our last few invoices have sales tax on them, and we're a reseller, so they shouldn't. Nothing has changed on our side. Can you look into it and credit the tax back?`,
			`Accounts payable flagged invoice {inv}: there's {invTax} of sales tax on it. We've never paid tax with Pellham. Did something change?`
		],
		quick: [`Do you charge sales tax on orders we collect from the branch?`, `Yes. Tax on a collected order is worked out for the state of the branch it's collected from, whatever state your yard is in.`],
		reply: `Thanks for raising it. Could you send me the invoice numbers you've noticed it on? I'll check them against your account's tax settings.`,
		turns: [
			[`These are the ones AP found:`, `Thanks. Your account was exempt on the strength of your resale certificate, and the one we hold expired on {certEnd}. When a certificate lapses, the order system starts charging tax on the next order, which is what happened from {firstTaxed}. We send reminders before it's due, but ours went to {oldContact}, who I think has left.`, arts.invoiceList],
			[`{oldContactFirst} left in the spring, yes. What do you need from us?`, `A new resale certificate, signed and dated, with your seller's permit number on it. Once the tax team has it, they'll put the exemption back on the account, and we can credit the tax on the invoices since {certEnd}.`, arts.cert]
		],
		more: [[`Does it have to be your form, or will the state one do?`, `The state's own form is fine, and it's what most customers send. Any version will do as long as it has your permit number and is signed.`]],
		actAt: 2,
		act: `send us a new signed resale certificate with your seller's permit number on it`,
		gave: [`Here's the new certificate, signed by our controller this morning.`, ['sorted', 'credit', 'team']],
		done: [`Thanks for the certificate. The tax team has put it on file, valid to {newEnd}, and your exemption is back on the account from today, so your next invoices will have no tax on them.`, `Great, thanks for sorting it so quickly.`],
		credit: `Thanks for the certificate. The tax team has filed it, valid to {newEnd}, and the exemption is back on the account. I've also credited the tax charged since {certEnd}: {credit} across {invN} invoices, on credit note {cn}.`,
		team: ['tax', `Certificate received from {acct}; the old one expired {certEnd}. Please file it, restore the exemption, and confirm the credit of {credit} tax on the {invN} invoices since then.`]
	},
	{
		key: 'rate-wrong',
		cat: 'tax',
		w: 14,
		outs: ['credit', 'team'],
		mainOnly: true,
		ok: (day) => taxSlips.some((x) => day > x.from && day < x.to),
		setup: (r, s) => {
			const slip = taxSlips.find((x) => s.day > x.from && s.day < x.to)!;
			place(r, s, slip.code);
			quote(r, s, pick(r, regular));
			const right = Math.round(s.subC * stateOf(slip.code).rate);
			Object.assign(s, { wrongPct: pct(slip.wrong), rightPct: pct(stateOf(slip.code).rate), incStart: dayMonth(slip.from), invDate: shortDay(slip.from + DAY * Math.max(0, Math.floor((s.day - slip.from) / DAY) - 1)) });
			credit(s, s.taxC - right);
		},
		subj: ['Tax rate looks high', 'Sales tax on our invoice', '{st} tax rate?', 'Tax question', 'Invoice {inv}'],
		open: [
			`The tax on our quotes and our last invoice is {wrongPct}. {stName}'s rate is {rightPct}. Unless something changed that I missed, you're charging too much.`,
			`Our bookkeeper says the sales tax on invoice {inv} works out at {wrongPct}, which isn't a rate we've ever paid in {stName}. Could someone check?`
		],
		quick: [`Do you charge tax on delivery?`, `Not when delivery is shown as its own line on the invoice, which ours always is.`],
		reply: `Thanks for the sharp eye. Could you send me a copy of the invoice, or the figures on it? I'll check the rate we have for {stName}.`,
		turns: [
			[`Invoice {inv}:`, `Thanks. You're right: the rate on it is {wrongPct}, and {stName}'s is {rightPct}. Our tax table was updated on {incStart} and the {stName} rate went in as {wrongPct}. Every order delivered to {stName} since then has been charged at it, and the price box on the website shows it too.`, arts.invoice],
			[`So it's not just us?`, `No, it's every {stName} delivery since {incStart}. I've told the tax team so they can correct the table, and they'll work out the refunds for every account affected.`]
		],
		more: [[`Will you refund the difference or take it off the next invoice?`, `A credit note, so your accounts people can match it to the invoice it belongs to.`]],
		note: [`Tax table for {st}, from Anjali:`, arts.taxTable],
		credit: `The tax team has corrected the {stName} rate to {rightPct}, and quotes and orders use it again. I've credited the extra tax on invoice {inv}: {credit}, on credit note {cn}.`,
		team: ['tax', `{stName} rate keyed as {wrongPct} on {incStart} instead of {rightPct}. {acct} overcharged {credit} on {inv}. Please correct the table and refund the accounts affected.`]
	},
	{
		key: 'cert-wrong-state',
		cat: 'tax',
		w: 2,
		outs: ['customer', 'sorted', 'credit'],
		mainOnly: true,
		setup: (r, s) => {
			taxable(r, s);
			s.exempt = 'yes';
			const st2 = pick(r, states.filter((x) => x.code !== s.st && x.rate > 0));
			const city2 = pick(r, st2.cities);
			quote(r, s, pick(r, regular));
			const rate2 = rateOn(st2.code, s.day);
			const tax2 = Math.round(s.subC * rate2);
			Object.assign(s, { st2: st2.code, st2Name: st2.name, city2, rate2Pct: pct(rate2), invRate: rate2, invExempt: 'no', invTax: usd(tax2), siteAddr2: `${int(r, 100, 9999)} ${pick(r, streets)}`, certType: `${s.stName} resale certificate`, permit: `${int(r, 100, 999)}-${int(r, 100000, 999999)}`, certSigner: s.full, certFrom: `${dayMonth(s.day - int(r, 200, 700) * DAY)} ${pick(r, ['2024', '2025'])}`, certEnd: `${dayMonth(s.day + int(r, 200, 700) * DAY)} 2028` });
			credit(s, tax2);
		},
		subj: ['Tax on our {st2} job', 'Exempt in {st2}?', 'Sales tax on a job delivery', 'Invoice {inv} tax'],
		open: [
			`We're tax exempt with you, but the order we had delivered to our job in {city2}, {st2} came with {invTax} of tax on it. Same account, same certificate. What's different?`,
			`Our {st2Name} job got charged sales tax on invoice {inv}. Is our exemption only good in {stName}?`
		],
		quick: [`Can we have a separate account for a joint venture?`, `Yes. A joint venture usually gets its own account, with its own terms and tax set-up. Credit and accounts can send you the application.`],
		reply: `Thanks. Let me check the account. Could you send me the invoice number and the job's delivery address?`,
		turns: [
			[`Invoice {inv}, delivered to {siteAddr2}, {city2} {st2}.`, `Thanks. The certificate we hold for you is a resale certificate from {stName}, and an exemption only covers deliveries into the state that issued it. For deliveries into {st2Name} we need an exemption certificate from {st2Name} as well, so the order system charged {st2Name} tax at {rate2Pct}, which is what it has to do without one.`, arts.cert],
			[`We're reselling those materials to the owner, same as we do in {stName}. We'd just never had a job over there before.`, `That makes sense. Then a certificate from {st2Name} is all that's missing. Most of our customers who work in more than one state send us one for each.`]
		],
		actAt: 2,
		act: `send us an exemption certificate from {st2Name} for your company`,
		gave: [`Our controller signed the {st2Name} certificate this morning. It's attached.`, ['credit']],
		done: [`If you're installing rather than reselling on that job, the tax is due either way, so it's worth checking with your controller before you send a certificate.`, `Checked with our controller: on that job we're installing, not reselling, so the tax is right after all. Sorry for the bother.`],
		credit: `Thanks for the {st2Name} certificate. The tax team has added it, so deliveries to {st2Name} are exempt from now on, and I've credited the tax on {inv}: {credit}, on credit note {cn}.`
	},
	{
		key: 'region-wrong',
		cat: 'account',
		w: 3,
		outs: ['sorted', 'credit', 'customer', 'team'],
		mainOnly: true,
		setup: (r, s) => {
			const pairs = ([['Reno', 'NV', 'CA'], ['Sparks', 'NV', 'CA'], ['Carson City', 'NV', 'CA'], ['Mesa', 'AZ', 'CA'], ['Gilbert', 'AZ', 'NV'], ['Portland', 'OR', 'ID'], ['Salem', 'OR', 'WA'], ['Albuquerque', 'NM', 'AZ'], ['Boise', 'ID', 'WA']] as const).filter(([, code, rec]) => rateOn(code, s.day) === stateOf(code).rate && rateOn(rec, s.day) === stateOf(rec).rate);
			const [city, code, recorded] = pick(r, pairs);
			place(r, s, code, city);
			const wrong = rateOn(recorded, s.day);
			const right = rateOn(code, s.day);
			s.rateN = wrong;
			s.ratePct = pct(wrong);
			s.siteLabel = `${s.siteName}, ${s.siteAddr}, ${city} ${recorded}`;
			const addedMs = s.day - int(r, 60, 400) * DAY;
			Object.assign(s, { wrongSt: recorded, wrongName: stateOf(recorded).name, wrongPct: pct(wrong), rightPct: pct(right), siteAdded: `${MONL[utc(addedMs).getUTCMonth()]} ${utc(addedMs).getUTCFullYear() === 2026 ? 'this year' : 'last year'}`, invN: String(int(r, 4, 28)) });
			s.siteRows = [[s.siteName, s.siteAddr, city, recorded, `${shortDay(addedMs)} ${utc(addedMs).getUTCFullYear()}`]];
			quote(r, s, pick(r, regular));
			credit(s, Math.round(int(r, 800000, 9000000) * (wrong - right)));
		},
		subj: ['Tax rate on our account', 'Wrong state?', 'Sales tax looks off', 'Our address', 'Tax on invoices'],
		open: [
			`The tax on our invoices and on your website is {wrongPct}, which is the {wrongName} rate. We're in {city}, {stName}. Is our account set up in the wrong state?`,
			`Our accountant noticed we're being charged {wrongPct} sales tax, but we're based in {stName} and everything goes to our own yard there. Could you check our account details?`
		],
		quick: [`Can we add a second contact to receive invoices?`, `Yes. Send me their name and email address and I'll add them to the account as an invoice contact.`],
		reply: `Thanks for flagging it. Could you confirm the full address of the site you usually have deliveries sent to? I'll compare it with what's on the account.`,
		turns: [
			[`{siteAddr}, {city}, {st} {zip}.`, `Thanks. On the account, that site is recorded with {wrongSt} as the state instead of {st}. The street and city are right, which is why deliveries arrive, but tax is worked out from the state, so every order and every quote for that site has used the {wrongName} rate.`, arts.sites],
			[`How long has it been like that?`, `Since the site was added, in {siteAdded}. I can see {invN} invoices for that site since then.`]
		],
		actAt: 2,
		act: `confirm the address in writing from someone who can sign for the account`,
		why: `Changing a site's state also changes the tax on everything sent there, so we need it from the account holder.`,
		done: [`The state on the site has been corrected to {st}, so quotes and orders for it use the {stName} rate now.`, `Thanks. Our accountant says she'd rather sort out the past invoices on our side, so no need to credit anything.`],
		credit: `The state on the site has been corrected to {st}, and I've credited the tax difference on the {invN} invoices since it was added: {credit}, on credit note {cn}.`,
		team: ['accounts', `{acct}'s main site {siteAddr}, {city} is recorded as {wrongSt} instead of {st}, so tax is at the {wrongName} rate. Please correct the site and advise on credit for the {invN} invoices since {siteAdded}.`]
	},
	{
		key: 'wrong-branch',
		cat: 'account',
		w: 2,
		outs: ['sorted', 'customer', 'team'],
		mainOnly: true,
		alone: true,
		setup: (r, s) => {
			const [hqTier, hqDisc] = pick(r, [['List', 0], ['Trade C', 0.07]] as const);
			s.tier = pick(r, ['Trade A', 'Trade B']);
			s.disc = s.tier === 'Trade A' ? 0.18 : 0.12;
			quote(r, s, pick(r, regular));
			const mate = `${pick(r, firstF.filter((x) => x !== s.first))} ${pick(r, surnames)}`;
			const mgr = `${pick(r, firstM.filter((x) => x !== s.first))} ${pick(r, surnames)}`;
			Object.assign(s, { hqTier, hqTierText: hqTier === 'List' ? 'list prices' : hqTier, mgrFirst: mgr.split(' ')[0], hqAcct: `c_${int(r, 100, 1999)}`, hqPrice: usd(priceAt(s.product, hqDisc)), mateName: mate, mateEmail: `${mate.split(' ')[0]!.toLowerCase()}@${s.domain}`, branchMgr: mgr, mgrEmail: `${mgr.split(' ')[0]!.toLowerCase()}@${s.domain}`, lastIn: shortDay(s.day), lastIn2: shortDay(s.day - int(r, 0, 3) * DAY), lastIn3: shortDay(s.day - int(r, 2, 20) * DAY) });
			s.panelAcct = `${s.hqAcct}, ${s.co} (head office)`;
		},
		subj: ['Prices higher than my colleagues see', 'Different prices for the same company?', 'My login shows the wrong prices', 'Price check'],
		open: [
			`I'm the new buyer at our {city} branch. When I sign in, the prices I see are higher than the ones on our branch's invoices. {sku} shows {hqPrice} for me, and the last invoice had {price}. Am I looking at the wrong thing?`,
			`Two of us at {co} priced the same thing on your website and got different answers. Mine says {hqPrice} for {sku}, {mateName}'s says {price}. We sit in the same office.`
		],
		quick: [`Can I see past invoices on the website?`, `Yes, under Account, then Invoices. You'll see the last two years for the account you're signed in under.`],
		reply: `Thanks for explaining. Could you tell me the email address you sign in with, and the account number on your branch's invoices? I suspect your login is attached to a different account.`,
		turns: [
			[`I sign in as {email}. The invoices say {acct}.`, `That's it. Your login is attached to {hqAcct}, your head office account, rather than {acct}, your branch's. Each has its own price list: the branch is on {tier} and head office on {hqTierText}, so you've been seeing head office prices. Anyone who signs in under head office would see the same.`, arts.logins],
			[`Does that mean anything I order goes to head office?`, `It would, yes, so it's good you asked before ordering. Moving a login to another account needs the account holder's say-so, so I'll need {branchMgr} or someone at head office to confirm it.`]
		],
		actAt: 2,
		act: `ask {mgrFirst} to email me confirming you should order on the branch account`,
		why: `We need that from the account holder before we move a login.`,
		gave: [`I've asked {mgrFirst} to email you, and he says it's sent.`, ['sorted', 'team']],
		done: [`Thanks, {mgrFirst}'s email came through. Your login is now attached to {acct}, so you'll see your branch's prices next time you sign in.`, `Just signed in again and the prices match our invoices now. Thank you.`],
		team: ['accounts', `{email} is attached to head office {hqAcct} but buys for branch {acct}. {branchMgr} has confirmed by email; please move the login.`]
	},
	{
		key: 'tier-not-moved',
		cat: 'account',
		w: 2,
		outs: ['sorted', 'credit', 'team'],
		mainOnly: true,
		setup: (r, s) => {
			const old = pick(r, [1, 2]);
			s.tier = tiers[old]![0];
			s.disc = tiers[old]![1];
			quote(r, s, pick(r, regular));
			const start = s.day >= Date.UTC(2026, 9, 8) ? Date.UTC(2026, 9, 1) : s.day >= Date.UTC(2026, 8, 10) ? Date.UTC(2026, 8, 1) : Date.UTC(2026, 7, 1);
			const ordersN = int(r, 1, 6);
			Object.assign(s, { tierOld: s.tier, tierNew: tiers[old - 1]![0], newPrice: usd(priceAt(s.product, tiers[old - 1]![1])), tierStart: dayMonth(start), reviewMonth: MONL[utc(start).getUTCMonth() - 1], repSent: `${shortDay(start - int(r, 6, 20) * DAY)} 2026`, ordersN: String(ordersN) });
			credit(s, Math.round(int(r, 150000, 1800000) * (tiers[old - 1]![1] - tiers[old]![1])));
		},
		subj: ['Our new discount', 'Prices after our review', 'Still on the old prices?', 'Account review', 'New price level'],
		open: [
			`At our account review in {reviewMonth}, {repFirst} told us we'd move up to {tierNew} pricing from {tierStart}. We're well past that and the website prices haven't changed. {sku} is still {price}.`,
			`Has our account been moved to the new discount level yet? {repFirst} said it would be done by {tierStart}, and our invoices look the same as before.`
		],
		quick: [`How is our discount level decided?`, `By what the account spent with us over the last twelve months, reviewed once a year with your rep. The levels are Trade A, B and C, A being the best.`],
		reply: `Thanks. Could you forward me {repFirst}'s email about the new level, if you have it? I'll check what's on the account.`,
		turns: [
			[`Here's what {repFirst} sent:`, `Thanks. {repFirst}'s email says {tierNew} from {tierStart}, but the account is still on {tierOld}. A change of level needs a request from the rep to credit and accounts, and I can't find one for your account, so I think it simply never got sent.`, arts.repMail],
			[`What would {sku} be on the new level?`, `{newPrice} instead of {price}, and the other products move by about the same proportion.`]
		],
		done: [`Credit and accounts have moved you to {tierNew} from today, so the website shows the new prices. I checked the orders since {tierStart}, and they were all on products with contract prices, so the level made no difference to them.`, `Great, I see {newPrice} on {sku}. Thanks.`],
		credit: `Credit and accounts have moved you to {tierNew}, backdated to {tierStart}, and I've credited the difference on the orders since then: {credit} across {ordersN} orders, on credit note {cn}.`,
		team: ['sales', `{acct} was promised {tierNew} from {tierStart} at its review but is still on {tierOld}; there's no change request on file. Please send the request to credit and accounts and confirm the backdating.`]
	},
	{
		key: 'new-account',
		cat: 'account',
		w: 2,
		outs: ['customer', 'customer', 'sorted'],
		mainOnly: true,
		alone: true,
		setup: (r, s) => {
			s.tier = 'List';
			s.disc = 0;
			s.newAccount = true;
			quote(r, s, pick(r, regular));
			const days = int(r, 6, 20);
			const refs = shuffle(r, ['Western States Electric', 'Valley Building Supply', 'Pacific Steel & Wire', 'Capitol Lumber', 'Sunstate Equipment', 'Ferguson', 'Central Concrete Supply', 'Basin Rentals']);
			Object.assign(s, { appDay: dayMonth(s.day - days * DAY), appAgo: days < 9 ? 'last week' : days < 13 ? 'about ten days ago' : 'a couple of weeks ago', refA: refs[0], refB: refs[1], refC: refs[2], refDay: shortDay(s.day - int(r, 1, days - 2) * DAY), appCert: s.rateN ? 'not supplied' : 'not needed', tierAfter: pick(r, ['Trade B', 'Trade C']) });
		},
		subj: ['Trade prices?', 'New account', 'Website shows retail prices', 'Account application', 'Our discount'],
		open: [
			`We opened our trade account with you {appAgo} and I'm still seeing list prices on the website. {sku} shows {list}. Our rep said we'd be on trade prices.`,
			`Just set up our login. Is there a reason the prices are the same as when I'm signed out? I was expecting a trade discount.`
		],
		quick: [`Can we pay by card instead of on account?`, `Yes, card payments are taken on every account, trade or not, online or over the phone.`],
		reply: `Welcome to Pellham, and thanks for getting in touch. Let me check where your application has got to. When did you send the form in?`,
		turns: [
			[`We filled the form in on {appDay}.`, `Thanks, I've found it. Your account is open, but it's still going through credit approval, and until that's done it stays on list prices. Credit and accounts have your form, but two of the three trade references haven't come back yet.`, arts.application],
			[`What do they need?`, `Either your references to answer credit and accounts' email, or two different references. Most customers give their other main suppliers.`]
		],
		actAt: 2,
		act: `send two more trade references, or ask {refA} and {refB} to answer the email from credit and accounts`,
		gave: [`I've chased {refA} and {refB}, and both say they've answered now.`, ['sorted']],
		done: [`Your account has been approved and is on {tierAfter} from today, so you'll see trade prices next time you sign in.`, `Lovely, I can see them now. Thanks for chasing.`]
	},
	{
		key: 'new-site',
		cat: 'account',
		w: 2,
		outs: ['sorted', 'customer'],
		mainOnly: true,
		setup: (r, s) => {
			const st2 = chance(r, 0.6) ? pick(r, states.filter((x) => x.code !== s.st && x.rate !== s.rateN)) : stateOf(s.st);
			const city2 = pick(r, st2.cities.filter((c) => c !== s.city));
			const contact = `${pick(r, [...firstM, ...firstF])} ${pick(r, surnames)}`;
			quote(r, s, pick(r, regular));
			Object.assign(s, { st2: st2.code, st2Name: st2.name, city2, zip2: String(int(r, st2.zips[0], st2.zips[1])), siteAddr2: `${int(r, 100, 9999)} ${pick(r, streets)}`, rate2Pct: pct(rateOn(st2.code, s.day)), siteContact: contact, sitePhone: `(${pick(r, st2.area)}) 555-01${pad(int(r, 10, 99))}`, siteName2: `${city2} job`, branch2: st2.branch, taxNote: st2.code === s.st ? `It's in {stName} too, so the tax stays at {ratePct}` : `When you choose it in the price box, the quote uses the {st2Name} rate, {rate2Pct}` });
		},
		subj: ['Delivering to a new job', `Can't pick our job site`, 'Add a delivery address', 'Quote for a job in {city2}'],
		open: [
			`We've got a new job in {city2}, {st2}, starting {jobDay}, and the website only lets me pick our existing sites as the delivery address. How do I add the job?`,
			`How do we add a delivery address? I'm pricing materials for {job} in {city2} and the price box only offers our yard in {city}.`
		],
		quick: [`Can deliveries go to a job site without anyone there to sign?`, `Yes, if you leave instructions with the order. The driver takes a photo of where the goods were left, and you can see it with the delivery.`],
		reply: `Congratulations on the new job. Adding a site is quick: could you send me the full address, the name and phone number of the person on site, and any delivery instructions?`,
		turns: [
			[`{siteAddr2}, {city2} {st2} {zip2}. Site contact is {siteContact}, {sitePhone}.`, `Thanks. I've added it as a delivery site on your account. {taxNote}.`],
			[`Will the prices change for a different site?`, `Only the tax can. Your prices are the same wherever you deliver; the delivery charge depends on the distance from the branch, which is {branch2} for {city2}.`]
		],
		actAt: 0,
		act: `send me the site address and the name and number of the person on site`,
		done: [`The site is on the account as "{siteName2}", and I've checked it shows up as a choice in the price box under your login.`, `Found it, thanks. That's all I needed.`]
	},
	{
		key: 'delivery-cost',
		cat: 'delivery',
		w: 5,
		outs: ['sorted', 'sorted', 'change', 'change', 'team'],
		setup: (r, s) => {
			quote(r, s, pick(r, regular));
			const zone: number = s.zoneN;
			Object.assign(s, { zone: String(zone), charge: usd(zoneCharge[zone]!), threshold: usd(zoneFree[zone]!), pallets: String(int(r, 1, 4)), delivered: s.subC >= zoneFree[zone]! ? `nothing for delivery, as it's over ${usd(zoneFree[zone]!)}` : `${usd(zoneCharge[zone]!)} for delivery` });
		},
		subj: ['Delivery cost?', 'Delivered price for a bid', 'How much to deliver to {city}?', 'Freight to site', 'Bid pricing'],
		open: [
			`I'm putting a bid together for {job} and need a delivered price. The website gives me the materials, {sub} for the {sku}, but nothing about delivery. What would it cost to get it to {city}?`,
			`How do I find out what delivery will cost before I order? The price box gives me the price and the tax and then nothing. For a bid I need the whole number.`,
			`Do you have a delivery price list? I price jobs like {job} most weeks and I'm always guessing at the freight.`
		],
		quick: [`What's the cut-off for next-day delivery?`, `Orders placed by 2 p.m. go out on the next day's route from your branch, as long as everything is in stock there.`],
		reply: `Happy to help. Delivery depends on the branch, the distance and the size of the load. What's the delivery address, and roughly what's on the order: weight, or how many pallets?`,
		turns: [
			[`{city}, {zip}. It's {qty} {sku} plus some odds and ends, maybe {pallets} pallets.`, `Thanks. That's zone {zone} from {branch}, so {charge} for a standard delivery, and free if the order is over {threshold} before tax. Here's the rate card, so you can work out future bids yourself.`, arts.rates],
			[`So if we're over {threshold} it's free?`, `Yes, as long as it all comes from one branch on one delivery. If part of it has to come from another branch it can be split, and then each part counts on its own.`]
		],
		more: [
			[`Does a forklift come with the truck?`, `Our trucks have a liftgate, which handles pallets up to 2,500 lb. If the site needs a forklift, say so when you order and we'll send a truck with a truck-mounted forklift for a small extra charge.`],
			[`Can you deliver on a Saturday?`, `Not on the regular routes. We can quote a Saturday delivery for a full truck, through dispatch.`]
		],
		done: [`So for your bid: {sub} for the materials, {delivered}, plus tax on the materials. If the bid turns into an order, mention this ticket and I'll make sure it goes on one delivery.`, `Perfect, that's what I needed. Thanks.`],
		team: ['dispatch', `Customer bidding {job}, {city} {zip}, about {pallets} pallets including {qty} {sku}. Please quote delivery and say which truck it needs.`],
		push: `Thanks. Honestly, it'd be easier if the website just told us. We price dozens of these a week and can't call you every time.`,
		change: `That's fair, and you're not the only one asking. I've passed your request to our storefront platform team, who are working on putting the delivery cost and the number of days into the price box, and I've added your ticket so you hear when it's there. Until then, the rate card above is the quickest way.`,
		changeNote: `Another request for delivery cost and days in the price box. Logged with Jonas (storefront platform), ticket linked.`
	},
	{
		key: 'freight-invoice',
		cat: 'delivery',
		w: 4,
		outs: ['sorted', 'sorted', 'change', 'change'],
		setup: (r, s) => {
			const zone: number = s.zoneN;
			quote(r, s, pick(r, regular), { ok: (t) => fine(t) && t < zoneFree[zone]! * 1.05 && t > 9000 });
			if (s.subC >= zoneFree[zone]!) quote(r, s, s.product, { q: () => Math.max(1, Math.floor((zoneFree[zone]! - 2000) / s.priceC)), ok: () => true });
			Object.assign(s, { zone: String(zone), charge: usd(zoneCharge[zone]!), freightC: zoneCharge[zone]!, threshold: usd(zoneFree[zone]!), invTotal: usd(s.subC + zoneCharge[zone]! + (s.exempt === 'yes' ? 0 : s.taxC)) });
		},
		subj: ['Invoice higher than the website', 'Extra charge on invoice {inv}', 'Why is the invoice more?', 'Delivery charge', 'Invoice {inv}'],
		open: [
			`Invoice {inv} is {charge} more than the website said when I ordered. The price box said {total} and the invoice says {invTotal}. Where's the extra from?`,
			`There's a delivery charge of {charge} on invoice {inv}. Nobody told us about a delivery charge, and the website didn't show one.`
		],
		quick: [`Can I collect from the branch instead?`, `Of course. Choose "Collect" at checkout and the order is held at the {branch} counter. Collection is free.`],
		reply: `Sorry for the surprise. Let me pull up invoice {inv} and come back to you.`,
		turns: [
			[`Here it is, so you don't have to dig.`, `Thanks. The difference is the delivery line: {charge} for zone {zone} from {branch}. The price box shows the materials and the tax on them, and delivery is added when the order is dispatched. Your order was {sub} before tax, under the {threshold} for free delivery to your zone.`, arts.invoice],
			[`Nobody mentions that anywhere.`, `It's in the trade terms and on the checkout page, but you're right that the price box doesn't show it, and that's the figure most people go by.`]
		],
		more: [[`What would we have needed to order to get it free?`, `Anything over {threshold} before tax, on one delivery from {branch}. Adding things to an order that's already been placed works too, up until it's picked.`]],
		done: [`If it helps, orders over {threshold} to your site are delivered free, so it can be worth grouping smaller orders. I've also put a note on the account so the desk mentions the charge when you order by phone.`, `Fair enough, we'll group them up from now on. Thanks for explaining.`],
		push: `I get it, but the box should tell us. That's where we look.`,
		change: `I agree. Our storefront platform team are adding the delivery cost and days to the price box, and I've attached your ticket so you hear when it's live. Until then, the zone charges are on the rate card in the trade terms, and I'm happy to send it over.`,
		changeNote: `Customer wants delivery shown in the price box. Added to the request with Jonas (storefront platform).`
	},
	{
		key: 'lead-time',
		noVia: true,
		cat: 'delivery',
		w: 3,
		outs: ['sorted', 'sorted', 'team'],
		setup: (r, s, out) => {
			const p = pick(r, regular);
			quote(r, s, p, { q: (rr) => qtyOf(rr, p) * int(rr, 3, 6) });
			const q = s.qtyN;
			const branches = shuffle(r, branchNames.filter((b) => b !== s.branch));
			const b2 = branches[0]!;
			const enough = out !== 'team';
			const free1 = Math.floor(q * (enough ? 0.3 + 0.4 * r() : 0.1 + 0.2 * r()));
			const free2 = enough ? q - free1 + int(r, 0, Math.ceil(q / 3)) : Math.floor(q * (0.1 + 0.2 * r()));
			const next = fullDay(workdaysAfter(s.day, int(r, 8, 16)));
			const rows = [[s.branch, free1 + int(r, 0, 40), free1], [b2, free2 + int(r, 0, 30), free2], ...branches.slice(1).map((b) => [b, int(r, 0, 12), 0])].map(([b, hand, freeN]) => [String(b), sep(Number(hand)), sep(Number(hand) - Number(freeN)), sep(Number(freeN)), b === s.branch && !enough ? next : '']);
			s.stockRows = rows;
			const freeAll = sep(free1 + free2);
			Object.assign(s, { branch2: b2, freeAll, nextDay: next, arriveIn: pick(r, ['three working days', 'four working days', 'five working days']) });
			s.stockLine = enough
				? `${s.branch} has ${sep(free1)} free and ${b2} has ${sep(free2)}, so between them we have the ${s.qty}. We'd move what's needed from ${b2} to ${s.branch} on the next transfer and deliver it all together: it would reach you ${s.arriveIn} after you order.`
				: `Across all our branches we only have ${freeAll} free, short of the ${s.qty}, and the next supplier delivery to ${s.branch} isn't due until ${next}. I'm asking purchasing whether that can be brought forward.`;
			s.t2c = enough ? `Can you hold them for us? We'll order once the contract is signed.` : `What can you send now?`;
			s.t2d = enough ? `I can hold them for five working days from today. After that they go back on general sale.` : `The ${freeAll} we have, if a part delivery helps you make a start, and the rest when the supplier's delivery lands.`;
		},
		subj: ['When can you deliver?', 'Stock of {sku}', 'Delivery date for {qty} {sku}', 'Availability', 'Do you have {sku}?'],
		open: [
			`The website gives me a price for {qty} {sku} but no idea when I'd get them. We need them on site in {city} for {jobDay}. Can you do it?`,
			`Do you have {qty} {sku} in stock? I need to know before I commit to a start date with the GC.`
		],
		quick: [`Can I see stock levels on the website?`, `Not at the moment. The desk can check every branch for you, by phone or email.`],
		reply: `Let me check stock for you. Is it all going to {city}?`,
		turns: [
			[`All to {city}. Any day before {jobDay} is fine.`, `Thanks. {stockLine}`, arts.stock],
			[`{t2c}`, `{t2d}`]
		],
		done: [`Your order is in and the transfer is booked, so the full {qty} will reach {city} {arriveIn} from today.`, `Great, thanks for checking.`],
		team: ['purchasing', `{acct} needs {qty} {sku} by {jobDay}; we have {freeAll} free across the branches. Can the supplier delivery due {nextDay} be brought forward?`]
	},
	{
		key: 'long-lengths',
		cat: 'delivery',
		w: 3,
		outs: ['credit', 'credit', 'sorted', 'change'],
		setup: (r, s) => {
			quote(r, s, pick(r, catalogue.filter((p) => p.long)), { q: (rr) => int(rr, 6, 60) });
			const zone: number = s.zoneN;
			const surcharge = pick(r, [9500, 12000, 14000]);
			Object.assign(s, { zone: String(zone), freightC: s.subC >= zoneFree[zone]! ? 0 : zoneCharge[zone]!, extraC: surcharge, surcharge: usd(surcharge), normal: s.subC >= zoneFree[zone]! ? 'when an order that size is normally delivered free' : 'on top of the normal charge' });
			credit(s, surcharge);
		},
		subj: ['Surcharge on delivery', 'What is the long-length charge?', 'Extra on invoice {inv}', 'Invoice {inv} question'],
		open: [
			`There's a {surcharge} "long-length delivery" charge on invoice {inv}. What is it? It wasn't on the website and nobody said anything when I ordered.`,
			`We ordered {qty} of the 20 ft {sku} and got charged {surcharge} extra for delivery, {normal}. Is that right?`
		],
		quick: [`Can you cut strut to length?`, `Yes, at the {branch} counter, for a small charge per cut. Cut pieces can't be returned.`],
		reply: `Sorry it came as a surprise. Let me look at invoice {inv}.`,
		turns: [
			[`Thanks, it's below.`, `Anything over 12 feet can't go on our box trucks, so it goes on a flatbed, and the flatbed carries a {surcharge} surcharge on top of the zone charge. The 20 ft lengths of {sku} on your order are why it went that way. The surcharge is in the trade terms, but it isn't shown in the price box or at checkout.`, arts.invoice],
			[`If we'd known, we'd have ordered the 10 ft and joined them. That's what we usually do.`, `That would have gone on a box truck without the surcharge, yes.`]
		],
		credit: `As nobody warned you, I've credited the surcharge: {surcharge}, on credit note {cn}. I've also put a note on the account so the desk mentions it whenever 20 ft lengths are ordered.`,
		done: [`Next time, if you'd rather avoid it, the 10 ft lengths with couplers are the way, or you can collect long lengths from the {branch} yard for nothing.`, `OK, understood. We'll collect next time.`],
		push: `Can't the website tell you that before you order?`,
		change: `It should. Our storefront platform team are adding delivery costs and days to the price box, and I've asked for the flatbed surcharge to be part of it. Your ticket is attached so you hear when it's live.`,
		changeNote: `Asked Jonas (storefront platform) for the flatbed surcharge to be included when delivery goes into the price box. Ticket linked.`
	},
	{
		key: 'pack-size',
		cat: 'none',
		w: 3,
		outs: ['sorted'],
		setup: (r, s) => {
			const p = pick(r, boxed.filter((x) => x.pack >= 50));
			let pieces = int(r, 150, 2000);
			for (let k = 0; k < 60 && !fine(priceAt(p, s.disc) * pieces + Math.round(priceAt(p, s.disc) * pieces * s.rateN)); k++) pieces = int(r, 150, 2000);
			const boxes = Math.ceil(pieces / p.pack);
			quote(r, s, p, { q: () => boxes, ok: () => true });
			const big = s.priceC * pieces;
			Object.assign(s, { pieces: sep(pieces), boxes: String(boxes), pieceNoun: pieceNoun(p), bigSub: usd(big), bigPieces: sep(pieces * p.pack), bQty: sep(pieces), bSub: usd(big), bTax: usd(Math.round(big * s.rateN)), bTotal: shown(big + Math.round(big * s.rateN)) });
		},
		subj: ['Price for {pieceNoun} is crazy', 'Is this price right?', '{sku} price', 'Website price way off'],
		open: [
			`I need {pieces} {pieceNoun} and the website wants {bigSub} for them. That's more than our whole job. What am I doing wrong?`,
			`Priced {pieces} of {sku} on the website: {bigSub} plus tax. Last order we paid nowhere near that. Has the price gone up?`
		],
		quick: [`Can I buy a part box?`, `Not of the boxed products, I'm afraid: they're sold by the whole box only.`],
		reply: `Thanks for checking before ordering. I think I know what's happened. Could you paste what the price box shows?`,
		turns: [
			[`Here:`, `Thanks, that confirms it. {sku} is sold by the {pack}, so the quantity in the price box is a number of boxes: {pieces} gets you {pieces} boxes, which is {bigPieces} {pieceNoun}. For {pieces} {pieceNoun} you'd want {boxes} boxes, which comes to {sub} before tax.`, arts.box],
			[`Ha. That makes more sense. It doesn't say boxes anywhere near the quantity, though.`, `It says "Sold by: {pack}" under the description, but you're not the first to miss it.`]
		],
		done: [`So {boxes} boxes, {sub} plus tax. Shall I put the order in for you?`, `Yes please, {boxes} boxes to the usual address.`],
		closing: `Done: that's order {order}, on the next route from {branch}.`
	},
	{
		key: 'price-rise',
		noVia: true,
		cat: 'none',
		w: 4,
		outs: ['sorted', 'credit', 'team'],
		ok: (day) => day > PRICE_RISE + DAY,
		setup: (r, s) => {
			quote(r, s, pick(r, regular.filter((p) => p.unit !== 'cartridge' && p.unit !== 'bit')));
			const old = Math.round(s.priceC / (1.04 + 0.03 * r()));
			const qtDay = Date.UTC(2026, 8, int(r, 2, 22));
			const diff = (s.priceC - old) * s.qtyN;
			Object.assign(s, { oldPrice: usd(old), pctUp: `${Math.round((s.priceC / old - 1) * 100)}%`, oldQt: `QT-${int(r, 30000, 34999)}`, oldQtDay: dayMonth(qtDay), poDay: dayMonth(Math.min(qtDay + int(r, 3, 20) * DAY, PRICE_RISE - DAY)), mainContact: `${pick(r, [...firstF, ...firstM])} ${s.last}` });
			credit(s, diff + (s.exempt === 'yes' ? 0 : Math.round(diff * s.rateN)));
		},
		subj: ['Price went up?', 'Price on {sku} higher than last month', 'Our quote from September', 'Price increase', 'Price check on {sku}'],
		open: [
			`{sku} was {oldPrice} when I priced it in September. Today it's {price}. Has the price gone up, or is something wrong with our account?`,
			`We have a quote from you from September for {qty} {sku}, and the website is now {pctUp} higher. Our customer has already accepted our price on the back of yours.`
		],
		quick: [`Do you send notice of price changes?`, `Yes, by email to every account's main contact a month ahead, and they're on the website under News.`],
		reply: `Thanks. Could you send me the September quote or order you're comparing with?`,
		turns: [
			[`Here it is:`, `Thanks. That was before the price change on 1 October: most fasteners and strut went up between 4 and 7 percent because of steel and zinc costs, and {sku} went up {pctUp}. The letter about it went out on 1 September. Your account and your discount haven't changed; it's the list price underneath that moved.`, arts.quoteDoc],
			[`I don't remember seeing a letter.`, `It went to {mainContact}, the main contact on the account. I've forwarded you a copy.`]
		],
		done: [`So the price box is right, I'm afraid: {price} is your price from 1 October.`, `OK, thanks for explaining. I'll update our estimate.`],
		push: `Our PO for this was raised on {poDay}, against that quote. Shouldn't the quote price stand?`,
		credit: `You're right: the quote was good for 30 days and your PO was within them. I've credited the difference on the order: {credit} with the tax, on credit note {cn}.`,
		team: ['sales', `{acct} has a job priced off September figures for {sku} and wants to talk about a job price. Please call {first}.`]
	},
	{
		key: 'rep-pdf',
		noVia: true,
		cat: 'none',
		w: 2,
		outs: ['sorted', 'team'],
		setup: (r, s) => {
			const p = pick(r, regular);
			quote(r, s, p);
			const factor = 0.91 + 0.05 * r();
			const issues = [...(s.tier !== 'Trade A' ? [[`for Trade A accounts, not ${s.tier} like yours`, 'September']] : []), ...(s.day > PRICE_RISE + DAY ? [['from before the price change on 1 October', 'August']] : []), ['from last year, before your current price level', 'November 2025']];
			const [issue, date] = pick(r, issues);
			Object.assign(s, { pdfFactor: factor, pdfPrice: usd(Math.round(s.priceC * factor)), pdfIssue: issue, pdfDate: date, listProducts: [p, ...others(r, p, 3, 6)] });
		},
		subj: [`Price list doesn't match the website`, 'Which price is right?', 'Price list from {repFirst}', 'Website vs price list'],
		open: [
			`{repFirst} sent us a price list as a PDF and the website doesn't match it. {sku} is {pdfPrice} on the list and {price} on the website. Which one do we pay?`,
			`Our estimator has been using the price list {repFirst} sent and the website prices are higher on almost everything. Can you explain?`
		],
		quick: [`How often do your prices change?`, `At most twice a year, with a month's notice. Your account's current prices are always the ones on the website when you're signed in.`],
		reply: `Thanks. Could you send me the PDF, or the part you're using, so I can see what it's based on?`,
		turns: [
			[`Here's the first page. It says {pdfDate} at the top.`, `Thanks. That list is {pdfIssue}, so its prices aren't yours today. The website shows your account's current prices, and those are what you'll be invoiced.`, arts.pdfList],
			[`So the website is right?`, `Yes, for your account the website is right.`]
		],
		done: [`I've sent you a fresh price list for your account, as a spreadsheet, with today's prices.`, `Thanks, that's what our estimator needed.`],
		team: ['sales', `{repFirst}, {acct}'s estimator is using a price list ({pdfDate}) that's {pdfIssue}. Could you send them a current one?`]
	},
	{
		key: 'competitor',
		cat: 'none',
		w: 2,
		outs: ['team', 'team', 'sorted'],
		setup: (r, s) => {
			const p = pick(r, regular);
			quote(r, s, p, { q: (rr) => qtyOf(rr, p) * 2 });
			const comp = Math.round(s.priceC * (0.86 + 0.08 * r()));
			Object.assign(s, { comp: pick(r, competitors), compPrice: usd(comp), compExt: usd(comp * s.qtyN), compRef: `Q${int(r, 100000, 999999)}`, compDesc: `${s.desc.split(',')[0]} (equal)`, jobPrice: usd(Math.round((comp + s.priceC) / 2)), jobRef: `JP-${int(r, 1000, 9999)}` });
		},
		subj: ['Price match?', 'Better price on {sku}', 'Can you beat this?', 'Competing quote'],
		open: [
			`{comp} has quoted us {compPrice} a {unit} for {sku}, against your {price}. We'd rather buy from you. Can you match it for {qty}?`,
			`Can you do better on {qty} {sku}? Your website says {sub}, and we've got a quote for less.`
		],
		quick: [`Do you give a discount for paying early?`, `Yes: two percent off the invoice if it's paid within ten days, on accounts with Net 30 terms.`],
		reply: `Thanks for giving us the chance. Could you send me the other quote? Job prices are agreed by your rep, and they'll want to see it.`,
		turns: [
			[`Here's their quote:`, `Thanks. I can't change prices on the desk, but I've sent it to {rep}, who agrees job prices for your area. It helps that it's a single job with a set quantity.`, arts.compQuote],
			[`When will {repFirst} get back to me? We price the job on Friday.`, `I've marked it for this week, and {repFirst} usually calls within a working day.`]
		],
		done: [`{repFirst} has agreed a job price of {jobPrice} for the {qty}, and it's loaded against your account for this job as {jobRef}. Give that reference with the order and it'll be applied.`, `Brilliant, thanks to you both.`],
		team: ['sales', `{acct} has a competing quote at {compPrice} for {qty} {sku} (ours {price}). Please call {first} about a job price; they price the job on Friday.`]
	},
	{
		key: 'formal-quote',
		cat: 'none',
		w: 2,
		outs: ['sorted', 'sorted', 'customer'],
		setup: (r, s) => {
			const p2 = pick(r, regular);
			const q2 = qtyOf(r, p2);
			const zone: number = s.zoneN;
			let p = pick(r, regular);
			while (p.sku === p2.sku) p = pick(r, regular);
			quote(r, s, p);
			s.sku2 = p2.sku;
			s.desc2 = p2.desc;
			const sub2 = priceAt(p2, s.disc) * q2;
			const goods = s.subC + sub2;
			const tax = Math.round(goods * s.rateN);
			Object.assign(s, { qty2: sep(q2), price2: usd(priceAt(p2, s.disc)), sub2: usd(sub2), zone: String(zone), charge: usd(zoneCharge[zone]!), goods: usd(goods), qtTax: usd(tax), qtTotal: usd(goods + tax + zoneCharge[zone]!), qt: `QT-${int(r, 35000, 39999)}`, coAddr: `${int(r, 100, 9999)} ${pick(r, streets)}, ${s.city} ${s.st} ${s.zip}` });
		},
		subj: ['Formal quote please', 'Quote on letterhead?', 'Need a written quote', 'Quote for {job}'],
		open: [
			`Our client wants a formal quote with your name on it, not a screenshot of the website. Can you send one for {qty} {sku} and {qty2} {sku2}, delivered to {city}?`,
			`Is there a way to download a quote from the website? The price box is fine for us, but the owner's rep wants a proper document with a quote number, for {qty} {sku} and {qty2} {sku2}.`
		],
		quick: [`How long does a formal quote stay good for?`, `Thirty days from the date on it, unless it says otherwise.`],
		reply: `Of course. The price box is a price check rather than a quote, so I'll make you a proper one. Could you confirm the job name and the address it should be made out to?`,
		turns: [
			[`The job is {job}; make it out to {co}, {coAddr}.`, `Thanks. Here's your quote, {qt}. It's good for 30 days from today, and you can order against it by giving the quote number.`, arts.formalQuote],
			[`Does it include delivery?`, `It does: delivery to {city} is on it as its own line.`]
		],
		actAt: 0,
		act: `send me the job name and the address the quote should be made out to`,
		done: [`If anything on it needs changing, tell me and I'll reissue it under the same number.`, `It's perfect, thanks. I've sent it on.`]
	},
	{
		key: 'rounding',
		cat: 'none',
		mainOnly: true,
		w: 2,
		outs: ['sorted'],
		setup: (r, s) => {
			taxable(r, s);
			let rows: string[][] = [];
			let diff = 0;
			for (let i = 0; i < 200 && (diff < 1 || diff > 2); i++) {
				const ps = shuffle(r, regular).slice(0, 3);
				const lines = ps.map((p) => [p, qtyOf(r, p), priceAt(p, s.disc)] as [Product, number, number]);
				const goods = lines.map(([, q, c]) => q * c);
				const taxes = goods.map((g) => Math.round(g * s.rateN));
				const total = goods.reduce((a, b) => a + b, 0);
				const invTax = Math.round(total * s.rateN);
				diff = invTax - taxes.reduce((a, b) => a + b, 0);
				rows = lines.map(([p, q], k) => [String(k + 1), p.sku, sep(q), usd(goods[k]!), usd(taxes[k]!), usd(goods[k]! + taxes[k]!)]);
				s.lines = lines;
				s.poTotal = usd(total + taxes.reduce((a, b) => a + b, 0));
				s.invTotal = usd(total + invTax);
			}
			Object.assign(s, { poRows: rows, diffC: diff === 1 ? 'one cent' : 'two cents' });
			setItem(s, s.lines[0][0]);
		},
		subj: ['Invoice a cent off', 'Tax rounding?', 'Penny difference on {inv}', 'Small difference on an invoice'],
		open: [
			`This is petty, I know, but our AP system won't match invoice {inv} because it's {diffC} more than our PO. The PO was built from your website, one line at a time.`,
			`Can you explain why the tax on invoice {inv} is {diffC} different from adding up the tax your website gave for each line?`
		],
		quick: [`Can you put our PO number on every invoice?`, `Yes. Enter it at checkout, or tell us when you order by phone, and it's printed on the invoice and the delivery note.`],
		reply: `Not petty at all if it holds up your AP system. Could you send me the PO lines so I can compare them with the invoice?`,
		turns: [
			[`PO lines below:`, `Thanks. The difference is rounding. The price box works out the tax for each product on its own and rounds it to the cent, and your PO adds up three rounded figures. The invoice works out the tax on the whole order and rounds once. Both are done correctly, but they can differ by a cent or two.`, arts.poTable],
			[`So which one is right?`, `The invoice. Tax is due on the order as a whole, so that's the figure to pay.`]
		],
		done: [`If it helps your AP system, I can note the account so the desk sends a pro forma invoice for each PO before it's raised. Then the PO matches to the cent.`, `That would help, yes please. Thanks for explaining.`]
	},
	{
		key: 'credit-hold',
		cat: 'account',
		w: 2,
		outs: ['customer', 'sorted', 'team'],
		mainOnly: true,
		setup: (r, s) => {
			quote(r, s, pick(r, regular));
			const due = s.day - int(r, 32, 60) * DAY;
			const ap = `${pick(r, firstF)} ${pick(r, surnames)}`;
			Object.assign(s, { overInv: `INV-${int(r, 700000, 789999)}`, overAmt: usd(int(r, 40000, 900000)), overDue: dayMonth(due), apName: ap, apFirst: ap.split(' ')[0], apEmail: `${ap.split(' ')[0]!.toLowerCase()}@${s.domain}`, paidDay: dayMonth(due - int(r, 1, 6) * DAY) });
		},
		subj: [`Can't check out`, `Website won't let me order`, 'Account on hold?', 'Problem ordering {sku}'],
		open: [
			`I can see our prices on the website fine, but when I go to check out it says the account can't take orders at the moment and to contact you. I need {qty} {sku} for {job}. What's going on?`,
			`The price box works, it gave me {sub} for {qty} {sku}, but the basket won't let me place the order. It says to call the trade desk.`
		],
		quick: [`Can someone else at our company place orders on our account?`, `Yes, anyone with a login on the account. The account holder can add logins by emailing us the person's name and email address.`],
		reply: `Sorry for the hassle. Let me look at the account. Who looks after paying our invoices on your side? I may need to talk to them.`,
		turns: [
			[`That's {apName} in our office, {apEmail}.`, `Thanks. The account is on hold for new orders because invoice {overInv} for {overAmt} is more than 30 days past its due date of {overDue}. Prices still show, which is why the price box works, but orders are held until it's paid. Nothing else on the account has changed.`],
			[`That's strange. {apFirst} is usually on top of our invoices.`, `It may be a payment we haven't matched. If {apFirst} can send me the remittance, with the date and the amount, I'll have credit and accounts look for it.`]
		],
		note: [`Statement for {acct}: {overInv} for {overAmt}, due {overDue}, unpaid. Everything else paid on time.`],
		more: [
			[`Will this happen again?`, `Only if an invoice goes more than 30 days past its due date. Credit and accounts email a reminder at 15 days, so it's worth making sure those reach {apFirst}.`],
			[`Can you put this order in by hand in the meantime?`, `I'm afraid not while the hold is on; it applies to phone orders as well.`]
		],
		actAt: 2,
		act: `have {apFirst} send me the remittance for {overInv}, or pay it`,
		gave: [`{apFirst} has sent the remittance. It went out on {paidDay}, by bank transfer.`, ['sorted', 'team']],
		done: [`Credit and accounts found the payment: it came in on {paidDay} with the wrong invoice number on it, so it hadn't been matched. It's matched now, the hold is off, and you can order again.`, `Just placed the order. Much appreciated.`],
		team: ['accounts', `{acct} is on hold for {overInv} ({overAmt}). Customer says it was paid on {paidDay} by bank transfer; remittance attached. Please find and match the payment and lift the hold.`]
	},
	{
		key: 'collected-tax',
		cat: 'none',
		w: 2,
		outs: ['sorted'],
		mainOnly: true,
		setup: (r, s) => {
			if (!['CA', 'NV', 'WA'].includes(s.st)) place(r, s, 'CA');
			const [branch, code] = s.st === 'WA' ? ['Tualatin', 'OR'] : s.st === 'NV' ? ['Stockton', 'CA'] : ['Sparks', 'NV'];
			quote(r, s, pick(r, regular));
			const rate = rateOn(code, s.day);
			Object.assign(s, { colBranch: branch, colName: stateOf(code).name, colPct: pct(rate), invRate: rate, invTax: usd(Math.round(s.subC * rate)) });
		},
		subj: ['Tax on invoice {inv}', `Invoice doesn't match the website`, 'Different tax rate?', 'Question about invoice {inv}'],
		open: [
			`The price box gave me {tax} tax on our order, and invoice {inv} has {invTax}. Same goods, same day. Why the difference?`,
			`Our invoice {inv} has a different tax rate from what the website showed when I priced it. The website said {ratePct}, and the invoice says {colPct}.`
		],
		quick: [`Do you keep copies of the delivery notes we sign?`, `Yes, for seven years. Ask the desk and we'll send a copy of any signed delivery note.`],
		reply: `Thanks for asking. Could you tell me how the order reached you: delivered, or collected from one of our branches?`,
		turns: [
			[`One of our guys picked it up at {colBranch} on his way back from a job. Here's the invoice.`, `That explains it. Tax on a collected order is worked out for the state of the branch it's collected from, so an order collected at {colBranch} is taxed at the {colName} rate, {colPct}. The price box shows the tax for the delivery site you've chosen, your {siteName} in {city}, so it showed {stName}'s {ratePct}.`, arts.invoice],
			[`So neither of them is wrong?`, `Neither. The invoice is right for an order collected at {colBranch}, and the price box would have been right if it had been delivered.`]
		],
		more: [
			[`Can the website price a collection?`, `Not at the moment; it always prices for a delivery site. If you know you'll collect, the desk can tell you the tax for that branch.`],
			[`Would it be the same if he'd collected at {branch}?`, `Then it would be the {stName} rate, the same as the website showed.`]
		],
		done: [`If your team collects from other branches often, tell me and I'll note the account so we flag the tax when the order is placed.`, `No need, it was a one-off. Thanks for explaining.`]
	}
];

// Further questions a customer asks once the cause is clear, by topic.
const moreQuestions: Record<string, [string, string][]> = {
	format: [
		[`Does the same thing happen on the quotes you email?`, `No. Written quotes come out of our order system, which prints every amount in full. It's only the total line in the price box.`],
		[`Is it the same when I use the website on my phone?`, `Yes. There's no separate app; the website on a phone uses the same price box, so the same total line.`]
	],
	quantity: [
		[`Can the website at least tell me a product is sold whole?`, `It does, under the description: "Sold by: {pack}". It's easy to miss, which is why the box should refuse anything that isn't a whole number.`],
		[`Will the order system always round up like that?`, `Yes, always up, so you never get less than you asked for. It's worth checking the quantity before you place the order.`]
	],
	'exempt-quote': [
		[`Does the tax on the quote matter if we order through the website?`, `No. The basket and the invoice both use your exemption. Only the price box shows the tax.`],
		[`Can you send me a copy of the certificate you have on file? Our auditors asked.`, `Of course. I've attached the copy we hold, valid to {certEnd}.`]
	],
	'unit-price': [
		[`Do the prices on the list include tax?`, `No, they're before tax, the same as the subtotal line in the price box.`],
		[`Can you send that list every month without me asking?`, `Yes. I've set it to go to you on the first working day of each month, for the products on this list.`]
	],
	'contract-missing': [
		[`Will the new prices show on orders we place by phone too?`, `Yes. Phone orders, website orders and the price box all read the same prices, so once the entry is right they all are.`],
		[`How long is the contract good for?`, `Twelve months from {contractStart}, as {repFirst}'s list says. {repFirst} will be in touch before then to review it.`]
	],
	uom: [
		[`Is it just {sku}, or are other boxed items affected?`, `Only {sku}. I checked the other boxed products on your account and they're priced per box as they should be.`],
		[`Should I tell my team not to use the website for now?`, `Only for {sku}. Everything else on the website is priced correctly.`]
	],
	'break-missing': [
		[`Are there breaks on other things we buy?`, `Yes, on most of the bolts, anchors and rod on your list, usually from a few boxes or a few hundred pieces. They show in the price list I can send you.`],
		[`Would two smaller orders add up to the break?`, `No, the break counts per line on a single order, so two smaller orders are each priced on their own.`]
	],
	'old-code': [
		[`Will the old codes stop working at some point?`, `Yes. They'll be switched off at the end of the year, with a notice a month before to every account that still uses them.`],
		[`Does our other saved list have the same problem?`, `I checked: your other saved lists were made after August and already use the current codes.`]
	],
	'call-for-price': [
		[`Can I get an account price on something that isn't on the website at all?`, `Yes. Special-order items are quoted by the desk; send me the manufacturer's part number and the quantity.`],
		[`Why didn't the website just show the list price?`, `List price shown to a trade account would look like your price, and then the invoice wouldn't match. Call for price is the safer of the two.`]
	],
	'cert-expired': [
		[`Will future reminders go to me?`, `Yes. I've made you the tax contact on the account, so the next reminder comes to {email}.`],
		[`Can we email the certificate, or does it need to be posted?`, `Email is fine: a scan or a PDF of the signed form, sent to this ticket.`]
	],
	'rate-wrong': [
		[`Do we need to do anything about our own returns?`, `Not from our side. Once the extra tax is credited back, your accountant can treat the credit note like any other.`],
		[`Has the website been showing the wrong rate too?`, `Yes, since {incStart}, for anyone delivering to {stName}. It reads the same tax table as the order system.`]
	],
	'cert-wrong-state': [
		[`Does the {st2Name} certificate need renewing on the same schedule?`, `Yes, every three years, the same as your {stName} one. We'll remind you a month before.`],
		[`Will the website show tax for the {st2Name} job either way?`, `It will, I'm afraid. The price box adds the delivery state's tax for every account and doesn't look at exemptions. Your invoices are the ones that count.`]
	],
	'region-wrong': [
		[`Would the website have shown the {wrongName} rate too?`, `Yes. The price box uses the same state, so it's shown {wrongPct} for that site all along.`],
		[`Is anything else on the account wrong?`, `Not that I can see. The contacts, the terms and your price level all match what we'd expect.`]
	],
	'wrong-branch': [
		[`Can I see both accounts from one login?`, `Not at the moment: a login belongs to one account. If you need to buy for head office as well, we can set you up with a second login.`],
		[`Will my saved lists move with me?`, `Yes, saved lists belong to the login, so they come with you. The prices on them change to the branch's.`]
	],
	'tier-not-moved': [
		[`Does the new level apply to contract items too?`, `No. Contract prices stay as agreed; the level changes the price of everything else.`],
		[`When is our next review?`, `Same time next year. {repFirst} will be in touch a month before.`]
	],
	'new-account': [
		[`Can we order at list price for now and get the difference back later?`, `I'm afraid not: orders are invoiced at the price on the account on the day. If something is pressing, I'd hold it for a day or two until approval comes through.`],
		[`Do we need to send a resale certificate?`, `Only if you resell what you buy from us. If you do, send one with the references, and the account will be set up as exempt from the start.`]
	],
	'new-site': [
		[`Can we give the site a name so the drivers know what to look for?`, `Yes. I'll put the job name on the site, and it prints on the delivery note.`],
		[`Will the site disappear once the job's finished?`, `Only if you ask. Sites stay on the account until someone removes them, so it's worth telling us when the job wraps up.`]
	],
	'delivery-cost': [
		[`Can I collect part of it and have the rest delivered?`, `Yes. Collected lines are free, but they don't count towards the free-delivery amount.`],
		[`Is there a charge for a second drop on the same day?`, `Yes, each drop is charged by its own zone. If both sites are in the same zone and on one route, dispatch can usually combine them for one charge.`]
	],
	'freight-invoice': [
		[`Is the charge the same from every branch?`, `The zones are measured from your branch, {branch}, and the charge for each zone is the same at every branch.`],
		[`Couldn't someone have told me when I ordered online?`, `Checkout shows the delivery charge before you place the order. It's the price box that doesn't, and that's the figure you were going by.`]
	],
	'lead-time': [
		[`Would it come straight to the site?`, `Yes, from {branch} on the regular route, with the driver calling ahead if you leave a number with the order.`],
		[`Can you check stock for other things on our list too?`, `Of course. Send me the list and I'll check each line at every branch.`]
	],
	'long-lengths': [
		[`Do the 10 ft lengths go on the box truck?`, `Yes, anything up to 12 feet does, at the normal zone charge.`],
		[`Is the surcharge per length or per delivery?`, `Per delivery, however many long lengths are on it.`]
	],
	'pack-size': [
		[`Is it the same for the other boxed items?`, `Yes, everything sold by the box is priced per box: anchors, nuts, washers, screws and rivets.`],
		[`How do I know how many are in a box?`, `It's on the line under the description, "Sold by:" and the count. For {sku} it's a {pack}.`]
	],
	'price-rise': [
		[`Will there be another rise in the spring?`, `Nothing is announced. If there is one, you'll get a month's notice, the same as this time.`],
		[`Did everything go up?`, `No, mostly steel and zinc products. Epoxy, drill bits and rivets didn't change.`]
	],
	'rep-pdf': [
		[`Can I get the spreadsheet in the same layout as {repFirst}'s list?`, `Yes. I'll send it with the same columns, so your estimator can swap it straight in.`],
		[`Will the website always match what we're invoiced?`, `Yes, when you're signed in. Signed out, it shows list prices.`]
	],
	competitor: [
		[`Can the job price cover later orders for the same job?`, `Yes, if {repFirst} sets it up that way: a job price usually holds until the job's quantity has been ordered.`],
		[`Do you need their quote in writing, or is a screenshot enough?`, `A screenshot is fine, as long as it shows the product, the quantity and the supplier.`]
	],
	'formal-quote': [
		[`Can the quote show our client's name instead of ours?`, `It has to be made out to your account, but I can add your client's name and the job under it.`],
		[`If we order part of it, does the rest stay at the quoted price?`, `Yes, for the 30 days, as long as each order gives the quote number.`]
	],
	rounding: [
		[`Will the invoice always come out higher?`, `No, it can go either way by a cent or two, depending on how the rounding falls.`],
		[`Can you round per line on our invoices instead?`, `I'm afraid not: the order system works the tax out on the whole order for every account.`]
	]
};
for (const topic of topics) topic.more = [...(topic.more ?? []), ...(moreQuestions[topic.key] ?? [])];

// ---------------------------------------------------------------------------------------------------------
// Shared parts of a conversation.
const backstories = [
	`We're based in {city} and buy most of our fixings from you.`,
	`I've just taken over purchasing from {oldBuyer}, so bear with me.`,
	`We're pricing a big job this week, so I'm going through a lot of your site.`,
	`I'm doing the month-end checks on our supplier invoices.`,
	`First time writing in. Normally I'd just call the {branch} counter.`,
	`We're in the middle of {job} and ordering from you most days.`,
	`Our office manager asked me to send this one in.`
];
const alsoLeads = [`Also, `, `One more thing: `, `And while I'm writing, `, `Separately, `];
const sideLeadsEarly = [`I'll dig that out and send it over. While I do, something else:`, `I need to ask our office for that, so give me a day. Meanwhile, a different question.`, `Will do. In the meantime, one more thing.`];
const sideLeadsLater = [`One more thing while I have you.`, `Different subject:`, `Also, while I think of it:`, `Something else came up this morning.`];
const custAcks = [`Thanks, that helps.`, `OK, understood.`, `Right.`, `Thanks for the quick reply.`, `Ah, I see.`, `Makes sense.`, `Great, thanks.`];
const deskIntros = [`Thanks for getting in touch.`, `Thanks for the clear description; it helps a lot.`, `Sorry for the delay, it's been a busy morning on the desk.`, `Thanks for reaching out about this.`];
const willDos = [`OK, I'll sort that out {when}.`, `Right, I'll get on to it {when}.`, `Thanks, leave it with me. I'll get it to you {when}.`, `Will do, probably {when}.`];
const willSends = [`I'll get those details to you {when}.`, `I've asked our office for them and will send them {when}.`, `Leave it with me, I'll send them over {when}.`];
const whens = ['tomorrow', 'this afternoon', 'on Monday', 'after our Friday meeting', 'later this week'];
const actLines = [`So, to put this right, I need you to {act}.{why} Once that's in, I can finish it off.`, `The next step is with you, I'm afraid: I need you to {act}.{why} Reply here when it's done.`];
const nudges1 = [`Just checking in on this. When you have a moment, I still need you to {act}, and then I can finish it off.`, `Following up on my last email: I still need you to {act}. No rush, I just want to make sure it didn't get buried.`];
const nudges2 = [`I haven't heard back, so I'll leave this open for now. Whenever you're ready, reply here and it comes straight back to me with everything above.`, `One last nudge from me: as soon as you {act}, I can put this right. Reply to this email and it comes back to me.`];
const passLines = [`I've passed this to {teamName}, who look after it. {mateFirst} will be in touch with you directly.`, `This needs {teamName}, so I've handed it over with everything above. {mateFirst} will pick it up and come back to you.`];
const mateAcks = [`Hi {first}, {mateFirst} from {teamShort} here. I've got this from the desk and I'm looking into it; I'll update you here.`, `Hello {first}, this is {mateFirst} in {teamShort}. Thanks for your patience. I'm on it and will come back to you once it's done.`];
const repAcks = [`Hi {first}, {repFirst} here. {agent} passed this on to me. Let me look at the numbers and I'll call you this week.`, `{first}, thanks for sending this. Sorry it landed with the desk; it should have come to me. I'll sort it out and get back to you.`];
const custNews = [`Any news on this?`, `Just checking where this has got to.`, `Hi, is there an update on this?`];
const mateStill = [`Still on it, {first}. I'll update you as soon as I have an answer.`, `Not forgotten. There's one more check to do and then I'll come back to you.`];
const closings = [`Glad that's sorted. I'll close this, but reply here if anything else comes up.`, `Good to hear. Thanks for bearing with us.`, `Thanks for letting me know.`, `Great. Have a good rest of the week.`];
const creditThanks = [`Thanks, appreciated.`, `Great, thank you. I'll let AP know.`, `Thanks for sorting that out.`];
const changeAcks = [`OK. Please do let me know when it's fixed.`, `Thanks, good to know it's being looked at.`, `Thanks for following up on it.`];
const custSignoffs = ['Thanks,\n{first}', 'Thanks,\n{full}\n{title}, {co}', '{first}', 'Regards,\n{full}\n{co}\n{phone}', 'Cheers,\n{first}'];
const replySignoffs = ['Thanks,\n{first}', '{first}', '', 'Thanks again,\n{first}'];
const deskSignoffs = ['Thanks,\n{agent}\nPellham Supply trade desk', '{agent} | Trade desk | (209) 555-0100', 'Best,\n{agent}', 'Kind regards,\n{agent}\nTrade desk, Pellham Supply'];
const vagueSubjects = ['Question', 'Quick question', 'Pricing', 'Help please', '(no subject)', 'Website', 'Account question', 'Re: your invoice'];

/** Puts the customer's main site in a state. */
const place = (r: Rand, s: Slots, code: string, city?: string) => {
	const st = stateOf(code);
	Object.assign(s, { st: code, stName: st.name, city: city ?? pick(r, st.cities), zip: String(int(r, st.zips[0], st.zips[1])), phone: `(${pick(r, st.area)}) 555-01${pad(int(r, 10, 99))}`, rateN: rateOn(code, s.day), branch: st.branch, rep: st.rep, repFirst: st.rep.split(' ')[0], siteName: pick(r, ['Yard', 'Main yard', 'Shop', 'Warehouse', 'Office and yard']), siteAddr: `${int(r, 100, 9999)} ${pick(r, streets)}` });
	s.ratePct = pct(s.rateN);
	s.zoneN = s.city === st.branch ? 1 : int(r, 1, 3);
	s.siteLabel = `${s.siteName}, ${s.siteAddr}, ${s.city} ${code}`;
	s.siteRows = [[s.siteName, s.siteAddr, s.city, code, `${shortDay(s.day - int(r, 400, 2400) * DAY)} ${pick(r, ['2019', '2020', '2021', '2022', '2023'])}`]];
};

const totalWeight = topics.reduce((sum, t) => sum + t.w, 0);
const weighted = (r: Rand) => {
	let left = r() * totalWeight;
	for (const t of topics) if ((left -= t.w) < 0) return t;
	return topics.at(-1)!;
};
/** Keys a smaller matter must not inherit from the main one. */
const mainKeys = ['invRate', 'invExempt', 'bSku', 'bDesc', 'bPack', 'bQty', 'bSub', 'bTax', 'bTotal', 'freightC', 'extraC', 'lines', 'credit', 'creditC'];

interface Item {
	who: 'c' | 'a' | 'note' | 'mate';
	paras: string[];
	art?: string;
	/** Paragraphs after the pasted output. */
	after?: string[];
	gap?: 'later' | 'nudge';
	mate?: string;
}

const ticket = (index: number) => {
	const r = mulberry32(0x9a7e1d00 + index * 7919);
	const day = openDays[Math.floor((index * openDays.length) / ITEMS)]!;
	const number = 52100 + index * 9 + int(r, 0, 6);
	let main = weighted(r);
	while (main.ok && !main.ok(day)) main = weighted(r);
	let outcome = pick(r, main.outs);
	const channel = pick(r, ['email', 'email', 'email', 'email', 'web form', 'web form', 'phone', 'phone']);

	// Who and where.
	const female = chance(r, 0.45);
	const first = pick(r, female ? firstF : firstM);
	const last = pick(r, surnames);
	const head = pick(r, heads);
	const tail = pick(r, tails);
	const co = `${head} ${tail}`;
	const domain = `${(head + tail.split(' ')[0]).toLowerCase().replace(/[^a-z]/g, '')}.example`;
	const [tier, disc] = pick(r, tiers);
	const s: Slots = {
		day,
		first,
		last,
		full: `${first} ${last}`,
		email: `${first.toLowerCase()}@${domain}`,
		domain,
		title: pick(r, titles),
		co,
		acct: `c_${int(r, 100, 1999)}`,
		tier,
		disc,
		agent: pick(r, deskAgents),
		lead: deskLead,
		job: pick(r, jobs),
		today: dayMonth(day),
		order: `SO-${int(r, 450000, 489999)}`,
		order2: `SO-${int(r, 400000, 449999)}`,
		inv: `INV-${int(r, 790000, 869999)}`,
		invDate: shortDay(day - int(r, 1, 12) * DAY),
		cn: `CN-${int(r, 20400, 22999)}`,
		po: `PO-${int(r, 1000, 99999)}`,
		jobDay: fullDay(day + int(r, 12, 26) * DAY),
		bidDay: dayMonth(day + int(r, 14, 28) * DAY),
		oldBuyer: `${pick(r, [...firstF, ...firstM])} ${pick(r, surnames)}`,
		when: pick(r, whens),
		exempt: 'no'
	};
	place(r, s, pick(r, stateWeights));
	main.setup(r, s, outcome);
	const fillWith = (slots: Slots) => (text: string): string =>
		text.replace(/\{(\w+)\}/g, (_, key: string) => {
			const value = slots[key];
			if (value === undefined) throw new Error(`ticket ${number} (${main.key}): no slot ${key} in "${text.slice(0, 60)}"`);
			return String(value);
		});
	const fill = fillWith(s);
	const signoff = pick(r, deskSignoffs);
	// A slot's text may itself hold slots, as new-site's taxNote does.
	for (const key of ['taxNote']) if (typeof s[key] === 'string') s[key] = fill(s[key]);

	// Smaller matters and a quick question.
	const used = new Set<Topic>([main]);
	const cats = new Set<Cat>([main.cat]);
	const sides: { topic: Topic; slots: Slots }[] = [];
	const sideCount = main.alone ? 0 : pick(r, [0, 1, 1, 1, 2, 2, 2, 2, 3, 3]);
	for (let i = 0; i < sideCount; i++) {
		const pool = topics.filter((t) => !t.mainOnly && !cats.has(t.cat) && (!t.ok || t.ok(day)) && (t.done || t.change));
		if (!pool.length) break;
		const topic = pick(r, pool);
		used.add(topic);
		cats.add(topic.cat);
		const slots: Slots = { ...s };
		for (const key of mainKeys) delete slots[key];
		slots.jobDay = fullDay(day + int(r, 24, 38) * DAY);
		slots.bidDay = dayMonth(day + int(r, 22, 34) * DAY);
		topic.setup(r, slots, 'sorted');
		for (const key of ['taxNote']) if (typeof slots[key] === 'string') slots[key] = fillWith(slots)(slots[key]);
		sides.push({ topic, slots });
	}
	const quickTopic = chance(r, 0.7) ? pick(r, topics.filter((t) => !used.has(t))) : undefined;
	const quick = quickTopic ? ([fill(quickTopic.quick[0]), fill(quickTopic.quick[1])] as const) : undefined;
	const quickInOpen = !!quick && chance(r, 0.45);

	// The team the ticket goes to, if it does.
	const viaTeam = !!main.team && !main.noVia && (outcome === 'sorted' || outcome === 'credit') && chance(r, 0.35);
	if (main.team) {
		const key = main.team[0];
		const t = teams[key]!;
		const person = key === 'sales' ? s.rep : key === 'dispatch' ? branchPeople[s.branch]! : t.person;
		Object.assign(s, { teamName: key === 'sales' ? `your sales rep, ${s.rep}` : key === 'dispatch' ? `dispatch at ${s.branch}` : t.name, mateFull: person, mateFirst: person.split(' ')[0], teamShort: key === 'dispatch' ? `${s.branch} dispatch` : t.label.replace(/^Pellham /, ''), teamLabel: t.label });
	}
	if (main.act) s.act = fill(main.act);
	s.why = main.why ? ` ${fill(main.why)}` : '';

	// The conversation.
	const items: Item[] = [];
	let carry: string[] = [];
	const c = (paras: string[], art?: string, after?: string[]) => {
		items.push({ who: 'c', paras: [...carry, ...paras], art, after });
		carry = [];
	};
	const a = (paras: string[], gap?: Item['gap'], art?: string) => items.push({ who: 'a', paras, gap, art });
	/** One exchange: the customer's words, the desk's answer, and the pasted output on whichever side has it. */
	const exchange = (turn: Turn, f: (text: string) => string, slots: Slots, lead: string[] = [], after: string[] = [], answerAfter: string[] = []) => {
		const art = artOf(turn, slots);
		const desk = !!turn[2] && deskArts.has(turn[2]);
		c([...lead, f(turn[0])], desk ? undefined : art, after.length ? after : undefined);
		a([f(turn[1]), ...answerAfter], undefined, desk ? art : undefined);
	};
	const note = (paras: string[], art?: string) => items.push({ who: 'note', paras, art });
	const mate = (paras: string[]) => items.push({ who: 'mate', paras, mate: s.mateFull });
	const artOf = (turn: Turn, slots: Slots) => (turn[2] ? turn[2](r, slots) : undefined);
	const ack = () => (!carry.length && chance(r, 0.3) ? [pick(r, custAcks)] : []);

	c([...(chance(r, 0.4) ? [fill(pick(r, backstories))] : []), fill(pick(r, main.open)), ...(quickInOpen ? [pick(r, alsoLeads) + lowerFirst(quick![0])] : [])]);
	a([...(channel === 'phone' ? [`Thanks for your call earlier.`] : chance(r, 0.5) ? [pick(r, deskIntros)] : []), fill(main.reply), ...(quickInOpen ? [`On your other question: ${quick![1]}`] : [])]);

	if (chance(r, 0.35) && !s.newAccount) {
		const rows = Array.from({ length: int(r, 3, 5) }, (_, k) => {
			const when = day - (k * 9 + int(r, 2, 8)) * DAY;
			const paid = when + int(r, 12, 29) * DAY;
			return [`INV-${int(r, 700000, 869999)}`, shortDay(when), usd(int(r, 12000, 520000)), paid >= day ? `open, due ${shortDay(when + 30 * DAY)}` : `paid ${shortDay(paid)}`];
		});
		note([pick(r, [`Looked at the account before replying. Recent invoices:`, `Account is in good standing; nothing overdue. Last invoices, for reference:`, `Checked the account first. Latest invoices:`])], table(['Invoice', 'Date', 'Total', 'Status'], rows));
	}
	const played = outcome === 'customer' ? main.actAt ?? main.turns.length : main.turns.length;
	const sideAt = int(r, 0, played);
	const quickAt = quick && !quickInOpen ? int(r, 0, Math.max(0, played - 1)) : -1;
	const runSide = (side: { topic: Topic; slots: Slots }, early: boolean) => {
		const f = fillWith(side.slots);
		const t = side.topic;
		const open = f(pick(r, t.open));
		c([early ? `${pick(r, sideLeadsEarly)} ${open}` : `${pick(r, sideLeadsLater)} ${open}`]);
		a([f(t.reply)]);
		exchange(t.turns[0]!, f, side.slots, ack());
		const end = f(t.done ? t.done[0] : t.change!);
		if (t.more && chance(r, 0.4)) {
			const [q, ans] = pick(r, t.more);
			exchange(t.turns[1]!, f, side.slots);
			c([...ack(), f(q)]);
			a([f(ans), end]);
		} else exchange(t.turns[1]!, f, side.slots, [], [], [end]);
		carry = t.done ? [f(t.done[1])] : [pick(r, changeAcks)];
	};
	for (let i = 0; i <= played; i++) {
		if (i === sideAt) sides.forEach((side, k) => runSide(side, i === 0 && k === 0 && main.reply.includes('?')));
		if (i === played) break;
		const turn = main.turns[i]!;
		const withQuick = i === quickAt;
		exchange(turn, fill, s, ack(), withQuick ? [`Unrelated, but ${lowerFirst(quick![0])}`] : [], withQuick ? [`And on your other question: ${quick![1]}`] : []);
		if (i === 0 && main.note && chance(r, 0.6)) note([fill(main.note[0])], main.note[1] ? main.note[1](r, s) : undefined);
	}
	if (played === main.turns.length && main.more) for (const [q, ans] of shuffle(r, main.more).slice(0, pick(r, [1, 2, 2, 3, 3]))) {
		c([...ack(), fill(q)]);
		a([fill(ans)]);
	}

	if (main.gave && main.gave[1].includes(outcome)) c([...ack(), fill(main.gave[0])]);
	const handover = () => {
		a([fill(pick(r, passLines))]);
		note([fill(main.team![1])]);
		mate([fill(pick(r, main.team![0] === 'sales' ? repAcks : mateAcks))]);
	};
	const finish = (paras: string[], reply: string[]) => {
		if (carry.length) c([]);
		a(paras, 'later');
		c(reply);
		if (main.closing) a([fill(main.closing)]);
		else if (chance(r, 0.5)) a([pick(r, closings)]);
	};
	if (outcome === 'sorted') {
		if (viaTeam) handover();
		finish([fill(main.done![0])], [fill(main.done![1])]);
	} else if (outcome === 'credit') {
		if (viaTeam) handover();
		if (main.key === 'price-rise') {
			c([...ack(), fill(main.push!)]);
			a([fill(main.credit!)]);
		} else {
			if (carry.length) c([]);
			a([fill(main.credit!)], 'later');
		}
		note([fill(`Credit note {cn} raised for {credit}; approved by {lead}.`)]);
		if (chance(r, 0.75)) c([pick(r, creditThanks)]);
	} else if (outcome === 'team') {
		if (carry.length) c([]);
		handover();
		if (chance(r, 0.5)) {
			c([pick(r, custNews)]);
			mate([fill(pick(r, mateStill))]);
		}
	} else if (outcome === 'customer') {
		if (played > 0) a([fill(pick(r, actLines))]);
		if (played === 0 || chance(r, 0.6)) c([fill(pick(r, played === 0 ? willSends : willDos))]);
		a([fill(pick(r, nudges1))], 'nudge');
		if (chance(r, 0.55)) a([fill(pick(r, nudges2))], 'nudge');
	} else {
		if (main.push && chance(r, 0.6)) c([...ack(), fill(main.push)]);
		else if (carry.length) c([]);
		a([fill(main.change!)], items.at(-1)?.who === 'c' ? undefined : 'later');
		note([fill(main.changeNote!)]);
		if (chance(r, 0.6)) c([pick(r, changeAcks)]);
	}
	if (carry.length) c([]);

	// When each message was written: the desk works weekdays, 07:00 to 16:45; customers write Monday to Saturday.
	const schedule = (attempt: number) => {
		const t = mulberry32(0x5c4ed000 + index * 104729 + attempt);
		const scale = [1, 0.5, 0.25, 0.1][attempt] ?? 0.05;
		const toDesk = (ms: number) => {
			const h = ms - midnight(ms);
			if (deskDay(ms) && h >= 7 * HOUR && h < 16.75 * HOUR) return ms;
			const startDay = deskDay(ms) && h < 7 * HOUR ? midnight(ms) : nextDeskDay(midnight(ms) + DAY);
			return startDay + 7 * HOUR + int(t, 0, 100) * MIN;
		};
		const toCustomer = (ms: number) => {
			const h = ms - midnight(ms);
			const wd = utc(ms).getUTCDay();
			if (wd !== 0 && h >= 6 * HOUR && h < 20.5 * HOUR) return ms;
			let next = h < 6 * HOUR && wd !== 0 ? midnight(ms) : midnight(ms) + DAY;
			if (utc(next).getUTCDay() === 0) next += DAY;
			return next + 6 * HOUR + int(t, 10, 180) * MIN;
		};
		const gap = (low: number, high: number) => Math.round(int(t, low, high) * scale) * MIN;
		const times: number[] = [];
		let at = channel === 'phone' ? toDesk(day + int(t, 7 * 60, 16 * 60) * MIN) : toCustomer(day + int(t, 6 * 60 + 30, 19 * 60 + 30) * MIN);
		items.forEach((item, i) => {
			if (i > 0) {
				const before = items[i - 1]!;
				if (item.who === 'note') at += int(t, 2, 30) * MIN;
				else if (item.who === 'c') at = toCustomer(at + gap(10, 1700));
				else if (item.who === 'mate') at = toDesk(at + gap(60, 1800));
				else if (item.gap === 'nudge') at = toDesk(at + gap(3 * 1440, 5 * 1440));
				else if (item.gap === 'later') at = toDesk(at + gap(240, 3000));
				else if (before.who === 'c') at = toDesk(at + gap(15, 300));
				else at = toDesk(at + gap(20, 240));
			}
			times.push(at);
		});
		return times;
	};
	let times = schedule(0);
	for (let attempt = 1; times.at(-1)! >= LIMIT && attempt < 6; attempt++) times = schedule(attempt);
	while (times.at(-1)! >= LIMIT && items.at(-1)?.gap === 'nudge' && items.filter((x) => x.gap === 'nudge').length > 1) {
		items.pop();
		times = schedule(5);
	}
	if (times.at(-1)! >= LIMIT) throw new Error(`ticket ${number} runs past the export: ${stamp(times.at(-1)!)}`);

	// The file.
	const subject = fill(
		quickInOpen && chance(r, 0.4) && quick![0].length < 72 ? quick![0] : chance(r, 0.2) ? pick(r, vagueSubjects) : pick(r, main.subj)
	);
	const out: string[] = [`# Ticket ${number}: ${subject}`, ''];
	const sites = (s.siteRows as string[][]).map((row) => `${row[0]}: ${row[2]} ${row[3]}`);
	if (chance(r, 0.4) && !s.newAccount) sites.push(`Job site: ${pick(r, stateOf(s.st).cities.filter((x) => x !== s.city))} ${s.st}`);
	out.push(
		table(['Field', 'Value'], [
			['Opened', `${stamp(times[0]!)}, by ${channel}`],
			['From', `${s.full}, ${s.title}, ${s.email}, ${s.phone}`],
			['Account', s.panelAcct ?? `${s.acct}, ${s.co}`],
			['Delivery sites', sites.join('; ')],
			['Branch', `${s.branch}; sales rep ${s.rep}`],
			['Terms', s.newAccount ? 'not set' : `Net 30, trade account since ${int(r, 2004, 2024)}`],
			['Desk', s.agent]
		]),
		''
	);
	out.push('### Orders in the last 90 days', '');
	if (s.newAccount) out.push('No orders yet.', '');
	else {
		const n = int(r, 2, 6);
		const rows: string[][] = [];
		for (let i = 0; i < n; i++) {
			const when = day - Math.round(((n - i) * 85 * DAY) / (n + 1)) - int(r, 0, 3) * DAY;
			rows.push([`SO-${int(r, 400000, 489999)}`, shortDay(when), String(int(r, 1, 14)), usd(int(r, 9000, 640000)), chance(r, 0.2) ? `Collected at ${s.branch}` : `${s.siteName}, ${s.city}`]);
		}
		out.push(table(['Order', 'Date', 'Lines', 'Value', 'Delivered to'], rows), '');
	}
	out.push('## Conversation', '');
	let deskSpoke = false;
	items.forEach((item, i) => {
		const at = times[i]!;
		const body: string[] = [];
		if (i === 0 && channel === 'phone') {
			out.push(`### Phone call · ${stamp(at)}`, '');
			body.push(`Call taken by ${s.agent}. ${s.full} from ${s.co} called about the following; their words as near as I could get them:`, ...item.paras.map((p) => `> ${p}`), `Said I'd look into it and email back.`);
		} else if (i === 0 && channel === 'web form') {
			out.push(`### Web form · ${stamp(at)}`, '');
			body.push(`**Name:** ${s.full}\n**Company:** ${s.co}\n**Account number:** ${s.panelAcct ? s.hqAcct : s.acct}\n**Email:** ${s.email}\n**Phone:** ${s.phone}`, '**Message:**', ...item.paras);
		} else if (item.who === 'c') {
			out.push(`### ${s.full} · ${stamp(at)}`, '');
			const greeting = pick(r, i === 0 ? ['Hi,', 'Hello,', 'Hi there,', 'Good morning,', ''] : ['Hi {agent},', '{agent},', '', 'Hi again,', 'Hello {agent},']);
			if (greeting && !(i === 0 && greeting === 'Good morning,' && at - midnight(at) >= 12 * HOUR)) body.push(fill(greeting));
			body.push(...item.paras);
			if (item.art) body.push(item.art);
			if (item.after) body.push(...item.after);
			const signoff = fill(pick(r, i === 0 ? custSignoffs : replySignoffs));
			if (signoff) body.push(signoff);
		} else if (item.who === 'a') {
			out.push(`### ${s.agent}, trade desk · ${stamp(at)}`, '');
			const replying = items[i - 1]?.who === 'c';
			body.push(fill(pick(r, !deskSpoke ? ['Hi {first},', 'Hello {first},'] : replying ? ['Hi {first},', 'Hello again {first},', 'Hi {first},', 'Hello {first},', 'Hi {first}, thanks for getting back to me.', '{first},'] : ['Hi {first},', 'Hello {first},', 'Hi again {first},'])), ...item.paras, ...(item.art ? [item.art] : []), fill(chance(r, 0.25) ? '{agent}' : signoff));
			deskSpoke = true;
		} else if (item.who === 'note') {
			out.push(`### Internal note · ${s.agent} · ${stamp(at)}`, '');
			body.push(...item.paras);
			if (item.art) body.push(item.art);
		} else {
			out.push(`### ${item.mate} (${s.teamLabel}) · ${stamp(at)}`, '');
			body.push(...item.paras, item.mate!.split(' ')[0]!);
		}
		out.push(body.join('\n\n'), '');
	});
	return { name: `${number}.md`, text: out.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n', main, outcome };
};

const folder = join(root, 'support', 'trade-desk');
mkdirSync(folder, { recursive: true });
for (let index = 0; index < ITEMS; index++) {
	const { name, text } = ticket(index);
	writeFileSync(join(folder, name), text);
}
writeFileSync(
	join(folder, 'README.md'),
	`# Trade desk tickets\n\nThe tickets the trade desk handled about prices, quotes and invoices on the trade storefront between\n1 September and 13 November 2026, one file each, as the help desk exported them on 16 November. Each file\nholds the account panel the desk saw when the ticket came in and the whole conversation: emails, web forms,\ncall notes, internal notes and replies from other teams. The export does not keep the help desk's tags or\nstatuses.\n`
);
