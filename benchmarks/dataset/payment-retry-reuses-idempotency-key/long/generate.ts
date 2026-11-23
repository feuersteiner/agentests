// Writes the long material of this entry's long tasks: the refund cases Fernhill Market's Customer Care team handled
// between 7 September and 13 November 2026, one Markdown file each, under docs/refund-cases/, as the help desk
// exported them on 20 November: the order panel care saw and the whole conversation, without tags or statuses.
// Deterministic: fixed seeds, no clock, no network.
//   bun long/generate.ts <workspace root> [--labels]   (--labels prints each case's topic and ending, for checking)
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** How many cases to write. Dates, case numbers and each topic's share all follow from it. */
const ITEMS = 391;

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
	const copy = [...items];
	for (let i = copy.length - 1; i > 0; i--) {
		const j = Math.floor(r() * (i + 1));
		[copy[i], copy[j]] = [copy[j]!, copy[i]!];
	}
	return copy;
};
const cap = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const pad = (value: number) => String(value).padStart(2, '0');

// ---------------------------------------------------------------------------------------------------------------
// Dates, in UK local time kept as UTC milliseconds. Care works Monday to Saturday, 08:00 to 18:00.
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const WD = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MO = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const at = (ms: number) => new Date(ms);
const dow = (ms: number) => at(ms).getUTCDay();
const hm = (ms: number) => `${pad(at(ms).getUTCHours())}:${pad(at(ms).getUTCMinutes())}`;
const dm = (ms: number) => `${at(ms).getUTCDate()} ${MO[at(ms).getUTCMonth()]}`;
const wdm = (ms: number) => `${WD[dow(ms)]} ${dm(ms)}`;
const stamp = (ms: number) => `${WD[dow(ms)]!.slice(0, 3)} ${at(ms).getUTCDate()} ${MO[at(ms).getUTCMonth()]!.slice(0, 3)} 2026, ${hm(ms)}`;
const midnight = (ms: number) => ms - (ms % DAY);
/** The day `n` working days after `ms`: Monday to Saturday when `saturday`, else Monday to Friday. */
const workdays = (ms: number, n: number, saturday = false) => {
	let day = midnight(ms);
	while (n > 0) {
		day += DAY;
		if (dow(day) !== 0 && (saturday || dow(day) !== 6)) n--;
	}
	return day;
};
const FIRST = Date.UTC(2026, 8, 7);
const LAST = Date.UTC(2026, 10, 13);
const EXPORT = Date.UTC(2026, 10, 20, 12);

// ---------------------------------------------------------------------------------------------------------------
// The shop: its makers and what they make, with prices in pounds.
const makers: [string, string][] = [
	['Hartcliffe Pottery', 'Bea'],
	['Tor Ceramics', 'Owen'],
	['Lune Linen', 'Agnieszka'],
	['Hollins Forge', 'Rhys'],
	['Brindle & Oak', 'Callum'],
	['Calder Roasters', 'Joe'],
	['Wren Apiaries', 'Martha'],
	['Pippin Kitchen', 'Sunita'],
	['Ostro Oils', 'Nikos'],
	['Hearth & Wick', 'Leah'],
	['Saltmarsh Chocolate', 'Iain'],
	['Kestle', 'Dana'],
	['Moor Tea Company', 'Anil'],
	['the Fernhill packing team', 'Lorna']
];
type Kind = 'ceramic' | 'bottle' | 'jar' | 'honey' | 'chocolate' | 'coffee' | 'tea' | 'pantry' | 'linen' | 'knife' | 'tool' | 'electric' | 'candle' | 'hamper' | 'engraved' | 'club';
interface Product {
	name: string;
	short: string;
	gbp: number;
	kind: Kind;
	maker: number;
	set?: number;
	plural?: boolean;
	colour?: string;
	alt?: string;
	fault?: string;
	parts?: [string, number][];
}
const products: Product[] = [
	{ name: 'Hartcliffe stoneware teapot, 1.2 litre', short: 'teapot', gbp: 38, kind: 'ceramic', maker: 0 },
	{ name: 'Tor mugs, speckled oat, set of four', short: 'mugs', gbp: 44, kind: 'ceramic', maker: 1, set: 4, plural: true, colour: 'speckled oat', alt: 'slate blue' },
	{ name: 'Marsh glaze serving bowl, large', short: 'serving bowl', gbp: 52, kind: 'ceramic', maker: 1 },
	{ name: 'Porthleven dinner plates, sea green, set of four', short: 'plates', gbp: 64, kind: 'ceramic', maker: 1, set: 4, plural: true, colour: 'sea green', alt: 'chalk white' },
	{ name: 'Hand-thrown pasta bowls, pair', short: 'pasta bowls', gbp: 36, kind: 'ceramic', maker: 0, set: 2, plural: true },
	{ name: 'Celadon jug, 1 litre', short: 'jug', gbp: 29, kind: 'ceramic', maker: 0 },
	{ name: 'Arbequina olive oil, 500 ml', short: 'olive oil', gbp: 16.5, kind: 'bottle', maker: 8 },
	{ name: 'Aged balsamic vinegar, 250 ml', short: 'balsamic vinegar', gbp: 14, kind: 'bottle', maker: 8 },
	{ name: 'Wildflower honey, 340 g', short: 'honey', gbp: 9.5, kind: 'honey', maker: 6 },
	{ name: 'Seville orange marmalade, 340 g', short: 'marmalade', gbp: 6.75, kind: 'jar', maker: 7 },
	{ name: 'Damson jam, 340 g', short: 'damson jam', gbp: 6.5, kind: 'jar', maker: 7 },
	{ name: 'Spiced pear chutney, 300 g', short: 'pear chutney', gbp: 5.95, kind: 'jar', maker: 7 },
	{ name: 'Sea salt caramel chocolate, three bars', short: 'chocolate', gbp: 13.5, kind: 'chocolate', maker: 10 },
	{ name: 'Dark chocolate and hazelnut slab', short: 'chocolate slab', gbp: 9, kind: 'chocolate', maker: 10 },
	{ name: 'Fernhill house blend coffee beans, 1 kg', short: 'house blend', gbp: 28, kind: 'coffee', maker: 5 },
	{ name: 'Guji natural coffee beans, 250 g', short: 'Guji beans', gbp: 11.5, kind: 'coffee', maker: 5, plural: true },
	{ name: 'Second-flush Darjeeling, 100 g caddy', short: 'Darjeeling', gbp: 12, kind: 'tea', maker: 12 },
	{ name: 'Smoked sea salt flakes, 250 g', short: 'salt flakes', gbp: 7.5, kind: 'pantry', maker: 13, plural: true },
	{ name: 'Oat and rosemary crackers', short: 'crackers', gbp: 4.25, kind: 'pantry', maker: 7, plural: true },
	{ name: 'Fernhill shortbread tin', short: 'shortbread', gbp: 8.95, kind: 'pantry', maker: 13 },
	{ name: 'Stonewashed linen tablecloth, oat, 150 × 250 cm', short: 'tablecloth', gbp: 68, kind: 'linen', maker: 2, colour: 'oat', alt: 'sage' },
	{ name: 'Linen apron, rust', short: 'apron', gbp: 32, kind: 'linen', maker: 2, colour: 'rust', alt: 'olive' },
	{ name: 'Waffle tea towels, set of three', short: 'tea towels', gbp: 18, kind: 'linen', maker: 2, set: 3, plural: true },
	{ name: 'Linen napkins, natural, set of six', short: 'napkins', gbp: 34, kind: 'linen', maker: 2, set: 6, plural: true, colour: 'natural', alt: 'charcoal' },
	{ name: "Carbon-steel chef's knife, 20 cm", short: 'knife', gbp: 89, kind: 'knife', maker: 3 },
	{ name: 'Cast-iron skillet, 26 cm', short: 'skillet', gbp: 49, kind: 'tool', maker: 3 },
	{ name: 'Copper butter warmer', short: 'butter warmer', gbp: 58, kind: 'tool', maker: 3 },
	{ name: 'Olive-wood chopping board, large', short: 'chopping board', gbp: 46, kind: 'tool', maker: 4 },
	{ name: 'Beechwood spoon set', short: 'spoon set', gbp: 19, kind: 'tool', maker: 4 },
	{ name: 'Kestle burr coffee grinder', short: 'grinder', gbp: 129, kind: 'electric', maker: 11, fault: 'the burrs were packed solid with oil from a very dark roast, and the motor cuts out on purpose when it meets that much resistance' },
	{ name: 'Kestle gooseneck kettle, 1 litre', short: 'kettle', gbp: 79, kind: 'electric', maker: 11, fault: 'the contacts on the base were coated in limescale, so the kettle was not sitting properly on its power connection' },
	{ name: 'Fig leaf soy candle, large', short: 'candle', gbp: 26, kind: 'candle', maker: 9 },
	{ name: 'Beeswax pillar candles, pair', short: 'pillar candles', gbp: 18, kind: 'candle', maker: 9, plural: true },
	{ name: 'Harvest Table hamper', short: 'hamper', gbp: 85, kind: 'hamper', maker: 13, parts: [['farmhouse cheddar', 9.5], ['oatcakes', 4.25], ['pear chutney', 5.95], ['pressed apple juice', 6.5]] },
	{ name: 'Afternoon Tea hamper', short: 'hamper', gbp: 65, kind: 'hamper', maker: 13, parts: [['Darjeeling', 12], ['strawberry jam', 6.5], ['shortbread', 8.95]] },
	{ name: 'Little Pantry gift box', short: 'gift box', gbp: 40, kind: 'hamper', maker: 13, parts: [['smoked salt', 7.5], ['chocolate', 9], ['olive oil', 16.5]] },
	{ name: 'Engraved oak serving board', short: 'serving board', gbp: 55, kind: 'engraved', maker: 4 },
	{ name: 'Coffee Club, monthly box', short: 'Coffee Club box', gbp: 22, kind: 'club', maker: 5 }
];

// ---------------------------------------------------------------------------------------------------------------
// Where orders go. EU orders ship from a partner in Venlo, US orders from one in Edison; both charge in local money.
interface Region {
	id: 'uk' | 'eu' | 'ch' | 'us';
	sym: string;
	rate: number;
	towns: [string, string][];
	wh: string;
	staff: string[];
	standard: [string, string][];
	express: [string, string];
	ship: number;
	free: number;
	expressCost: number;
	transit: [number, number];
	firsts: string[];
	lasts: string[];
	domains: string[];
	retAddr: string;
	dropoff: string;
	retServices: string[];
	streets: string[];
}
const ukFirst = ['Ruth', 'Imogen', 'Sophie', 'Helen', 'Priya', 'Aisha', 'Megan', 'Clare', 'Fiona', 'Joanna', 'Kirsty', 'Harriet', 'Bethan', 'Niamh', 'Gemma', 'Rachel', 'Daniel', 'Tom', 'Graham', 'Ifan', 'Ross', 'Stuart', 'Neil', 'Omar', 'Callum', 'Gareth', 'Rhodri', 'Matt', 'Simon', 'Kwame', 'Hamish', 'Moira'];
const regions: Record<Region['id'], Region> = {
	uk: {
		id: 'uk', sym: '£', rate: 1,
		towns: [['Leeds', 'LS6'], ['Bath', 'BA2'], ['Frome', 'BA11'], ['Norwich', 'NR2'], ['Cardiff', 'CF24'], ['Edinburgh', 'EH9'], ['Brighton', 'BN1'], ['York', 'YO31'], ['Bristol', 'BS6'], ['Exeter', 'EX4'], ['Manchester', 'M20'], ['Belfast', 'BT9'], ['Inverness', 'IV2'], ['Shrewsbury', 'SY3'], ['Lewes', 'BN7'], ['Hexham', 'NE46'], ['Stroud', 'GL5']],
		wh: 'Shepton Mallet', staff: ['Gary', 'Lorna', 'Dev', 'Shona'],
		standard: [['Royal Mail Tracked 48', 'Royal Mail'], ['Evri 48', 'Evri']], express: ['DPD Next Day', 'DPD'],
		ship: 395, free: 5000, expressCost: 795, transit: [1, 3],
		firsts: ukFirst,
		lasts: ['Okafor', 'Ashworth', 'Fairclough', 'Doyle', 'Kapoor', 'Hollis', 'Quinlan', 'Sutherland', 'Pemberton', 'Carrick', 'Bellamy', 'Gallagher', 'Wainwright', 'Prescott', 'Morgan', 'Lloyd', 'Begum', 'Shah', 'Hughes', 'Fraser', 'Mensah', 'Thornton'],
		domains: ['gmail.com', 'outlook.com', 'btinternet.com', 'icloud.com', 'yahoo.co.uk', 'hotmail.co.uk'],
		retAddr: 'Fernhill Market Returns, Unit 4, Townsend Yard, Shepton Mallet BA4 5RW',
		dropoff: 'Post Office', retServices: ['Royal Mail Tracked 48', 'Evri', 'InPost'],
		streets: ['Mill Lane', 'Church Street', 'Victoria Road', 'Orchard Close', 'Station Road', 'Kingsway', 'Belmont Terrace', 'Hill View']
	},
	eu: {
		id: 'eu', sym: '€', rate: 1.16,
		towns: [['Utrecht', 'Netherlands'], ['Haarlem', 'Netherlands'], ['Ghent', 'Belgium'], ['Antwerp', 'Belgium'], ['Cologne', 'Germany'], ['Hamburg', 'Germany'], ['Lyon', 'France'], ['Nantes', 'France'], ['Dublin', 'Ireland'], ['Galway', 'Ireland'], ['Milan', 'Italy'], ['Porto', 'Portugal'], ['Vienna', 'Austria'], ['Copenhagen', 'Denmark']],
		wh: 'Venlo', staff: ['Sanne', 'Joost', 'Mila'],
		standard: [['PostNL', 'PostNL'], ['DHL Parcel', 'DHL'], ['GLS', 'GLS']], express: ['DHL Express', 'DHL'],
		ship: 650, free: 6000, expressCost: 1450, transit: [2, 4],
		firsts: ['Anouk', 'Sanne', 'Lotte', 'Marie', 'Camille', 'Giulia', 'Ines', 'Lena', 'Sofie', 'Aoife', 'Siobhan', 'Katrin', 'Elif', 'Jan', 'Thijs', 'Luca', 'Mathieu', 'Jonas', 'Pieter', 'Ciarán', 'Bram', 'Florian', 'Matteo', 'Freya'],
		lasts: ['de Jong', 'Visser', 'Janssens', 'Peeters', 'Müller', 'Schneider', 'Moreau', 'Laurent', 'Rossi', 'Bianchi', 'Ferreira', "O'Brien", 'Murphy', 'Byrne', 'Andersen', 'Weber', 'Novak', 'Kowalski'],
		domains: ['gmail.com', 'outlook.com', 'ziggo.nl', 'telenet.be', 'web.de', 'orange.fr', 'eircom.net', 'gmx.at'],
		retAddr: 'Fernhill Market Returns, c/o Brightline Fulfilment, Celsiusweg 12, 5928 PR Venlo, Netherlands',
		dropoff: 'DHL ServicePoint', retServices: ['PostNL', 'DHL Parcel', 'bpost'],
		streets: []
	},
	ch: {
		id: 'ch', sym: '€', rate: 1.16,
		towns: [['Zurich', 'Switzerland'], ['Basel', 'Switzerland'], ['Bern', 'Switzerland'], ['Oslo', 'Norway'], ['Bergen', 'Norway']],
		wh: 'Venlo', staff: ['Sanne', 'Joost', 'Mila'],
		standard: [['PostNL International', 'PostNL'], ['DHL Parcel International', 'DHL']], express: ['DHL Express', 'DHL'],
		ship: 1250, free: 1_000_000, expressCost: 2400, transit: [3, 6],
		firsts: ['Nina', 'Lea', 'Ingrid', 'Silje', 'Marco', 'Lukas', 'Henrik', 'Ola', 'Beat', 'Anja'],
		lasts: ['Keller', 'Brunner', 'Meier', 'Hansen', 'Johansen', 'Berg', 'Steiner', 'Lund'],
		domains: ['bluewin.ch', 'gmail.com', 'online.no', 'outlook.com'],
		retAddr: 'Fernhill Market Returns, c/o Brightline Fulfilment, Celsiusweg 12, 5928 PR Venlo, Netherlands',
		dropoff: 'post office', retServices: ['Swiss Post', 'Posten'],
		streets: []
	},
	us: {
		id: 'us', sym: '$', rate: 1.27,
		towns: [['Brooklyn', 'NY'], ['Portland', 'OR'], ['Austin', 'TX'], ['Chicago', 'IL'], ['Asheville', 'NC'], ['Boston', 'MA'], ['Denver', 'CO'], ['Oakland', 'CA'], ['Minneapolis', 'MN'], ['Savannah', 'GA'], ['Burlington', 'VT'], ['Ann Arbor', 'MI']],
		wh: 'Edison', staff: ['Marisol', 'Derek', 'Tanisha'],
		standard: [['UPS Ground', 'UPS'], ['USPS Priority Mail', 'USPS']], express: ['UPS 2nd Day Air', 'UPS'],
		ship: 850, free: 7500, expressCost: 1800, transit: [2, 5],
		firsts: ['Ashley', 'Dana', 'Keisha', 'Lauren', 'Maria', 'Jenna', 'Courtney', 'Erin', 'Tanya', 'Tyler', 'Marcus', 'Kevin', 'Brandon', 'Luis', 'Josh', 'Andre', 'Ryan', 'Nate', 'Hannah', 'Grace'],
		lasts: ['Johnson', 'Ramirez', 'Nguyen', 'Patel', 'Brooks', 'Sullivan', 'Kim', 'Carter', 'Hernandez', 'Washington', 'Coleman', 'Reyes', 'Fischer', 'Park', 'Goldberg'],
		domains: ['gmail.com', 'yahoo.com', 'icloud.com', 'hotmail.com', 'outlook.com', 'comcast.net'],
		retAddr: 'Fernhill Market Returns, c/o Lakeside Fulfillment, 41 Meridian Road, Edison, NJ 08817',
		dropoff: 'UPS Store', retServices: ['UPS Ground', 'USPS'],
		streets: ['Maple Avenue', 'Oak Street', 'Elm Court', 'Fulton Street', 'Willow Drive', 'Pine Street']
	}
};
const agents = ['Hollie', 'Marcus', 'Inés', 'Priya', 'Tomasz', 'Saoirse', 'Femi', 'Kit'];
const LEAD = 'Rosalind';
const amount = (region: Region, gbp: number) => (region.id === 'uk' ? Math.round(gbp * 100) : Math.round(gbp * region.rate * 2) * 50);
const money = (region: Region, minor: number) => `${minor < 0 ? '-' : ''}${region.sym}${(Math.abs(minor) / 100).toFixed(2).replace(/\B(?=(\d{3})+\.)/g, ',')}`;
/** Where each carrier's parcels pass through, and street names by country for the regions that span several. */
const depots: Record<string, string[]> = {
	'Royal Mail': ['Bristol Mail Centre', 'Swindon Mail Centre', 'Warrington Mail Centre'],
	Evri: ['the Evri hub in Rugby', 'the Evri hub in Barnsley'],
	DPD: ['the DPD hub in Hinckley', 'the DPD depot in Oldbury'],
	PostNL: ['the PostNL sorting centre in Nieuwegein', 'the PostNL hub in Amsterdam'],
	DHL: ['the DHL hub in Duisburg', 'the DHL hub in Brussels'],
	GLS: ['the GLS depot in Neuenstein', 'the GLS hub in Hamburg'],
	UPS: ['the UPS hub in Secaucus', 'the UPS Worldport in Louisville'],
	USPS: ['the USPS facility in Kearny', 'the USPS network distribution center in Chicago']
};
const countryStreets: Record<string, string[]> = {
	Netherlands: ['Lindenlaan', 'Kerkstraat', 'Molenweg'], Belgium: ['Kerkstraat', 'Rue des Tanneurs', 'Veldstraat'], Germany: ['Hauptstraße', 'Lindenstraße'],
	France: ['Rue des Tanneurs', 'Rue Victor Hugo'], Ireland: ['Main Street', 'Church Road'], Italy: ['Via Garibaldi', 'Via Roma'], Portugal: ['Rua do Almada', 'Rua das Flores'],
	Austria: ['Hauptstraße', 'Gartengasse'], Denmark: ['Nørregade', 'Strandvejen'], Switzerland: ['Bahnhofstrasse', 'Seefeldstrasse'], Norway: ['Storgata', 'Thereses gate']
};

// ---------------------------------------------------------------------------------------------------------------
// Messages. Each holds a few ways of saying the same thing; braces are slots filled per case.
type Who = 'c' | 'a' | 'note' | 'wh' | 'maker' | 'lead';
type Slots = Record<string, string>;
interface Msg {
	who: Who;
	v: string[];
	art?: string;
	wait?: boolean;
	p?: number;
}
const say = (who: Who) => (v: string | string[], extra: Partial<Msg> = {}): Msg => ({ who, v: [v].flat(), ...extra });
const c = say('c');
const a = say('a');
const n = say('note');
const w = say('wh');
const mk = say('maker');

interface Line {
	product: Product;
	qty: number;
	unit: number;
}
interface Case {
	r: Rand;
	region: Region;
	s: Slots;
	lines: Line[];
	main: Line;
	shipCost: number;
	discount: number;
	total: number;
	captured: number;
	authorised: number;
	placed: number;
	shipped: number;
	delivered: number;
	open: number;
	packed: number;
	collected: number;
	arrived: number;
}

const firstGreetings = ['Hello,', 'Hi there,', 'Hi,', 'Dear Fernhill,', 'Hello Fernhill team,', 'Dear Customer Care,', ''];
const replyGreetings = ['Hi {agent},', 'Hello {agent},', 'Thanks {agent}.', 'Hi,', '', 'Dear {agent},', 'Hi {agent}, thanks for your reply.'];
const unpromptedGreetings = ['Hi {agent},', 'Hello {agent},', 'Hi,', '', 'Hi there,'];
const custSignoffs = ['{first}', 'Thanks,\n{first}', 'Best wishes,\n{full}', 'Kind regards,\n{full}', 'Many thanks,\n{first}', 'Cheers, {first}', 'Thank you,\n{full}', 'All the best,\n{first}'];
const replySignoffs = ['{first}', 'Thanks, {first}', 'Thanks so much,\n{first}', '', 'Best,\n{first}', '{initial}'];
const agentFirst = ['Hi {first},', 'Hello {first},', 'Dear {first},', 'Hi {first}, thanks for getting in touch.', 'Hello {first}, thank you for your email.', 'Hi {first}, thanks for writing to us.'];
const agentLater = ['Hi {first},', 'Hello {first},', 'Thanks, {first}.', 'Hi {first}, thanks for coming back to me.', 'Hi {first}, thank you.'];
const agentAgain = ['Hi {first},', 'Hello {first},', 'Hi {first}, a quick update.', 'Hello {first}, just a note to follow up.'];
const agentSignoffs = ['Best wishes,\n{agent}\nFernhill Market Customer Care', 'Kind regards,\n{agent}\nCustomer Care · Fernhill Market\nMonday to Saturday, 8am to 6pm · fernhillmarket.com/help', 'Thanks,\n{agent}\nFernhill Market · Customer Care\nWe reply within one working day.', 'Kind regards,\n{agent} | Fernhill Care', 'Thanks,\n{agent}', 'All the best,\n{agent}, Fernhill Market', 'Warm wishes,\n{agent}\nCustomer Care, Fernhill Market', '{agent}\nFernhill Care'];

const backstories = [
	`I've been a customer for a couple of years and this is the first time I've had to write in.`,
	`This was my first order with you, after a friend wouldn't stop talking about your shop.`,
	`I'm writing on behalf of my mother, who placed the order but doesn't really do email.`,
	`Sorry to be writing with a problem, as I love what you sell.`,
	`I came across you in a magazine gift guide last Christmas and have ordered a few times since.`,
	`My order number is {order}, in case you need it.`,
	`We bought from your stall at the Frome market years ago and were so pleased to find you online.`
];
const vagueOpenings = [
	`I need to speak to someone about my order {order}. It isn't what I expected at all and I'm not very happy.`,
	`Could someone get in touch about order {order}, please? There's a problem with it and I'd like it sorted.`,
	`I'd like a refund on my recent order, please. Can you tell me how I go about it?`,
	`I have an issue with my last order. What's the best way to explain it to you?`
];
const vagueReplies = [
	`I'm sorry to hear something's not right. Could you tell me a little more about what's happened, so I can work out how best to help?`,
	`Sorry to hear that. Of course we'll help. Could you tell me what the problem is, and which items it affects?`
];
const vagueLeads = [`Sorry, I should have explained.`, `Of course.`, `Thanks for coming back so quickly.`, `Apologies, I wrote that in a hurry.`];
const vagueSubjects = ['Order {order}', 'Problem with my order', 'Refund please', 'Complaint', 'Re: Your Fernhill order has shipped', 'Not happy', 'Help please'];

/** Quick questions on other things, with care's answer. */
const quicks: [string, string][] = [
	[`is the rust linen apron coming back? It's been sold out for weeks.`, `the rust aprons are due back from Lune Linen in early December. If you click "tell me when it's back" on the page, you'll get an email the day they arrive.`],
	[`do you ship to Japan? My brother lives in Osaka and I'd love to send him something.`, `not yet, but soon: we start shipping to Japan in December, with prices in yen. I've added you to the list for the launch email.`],
	[`do you do gift wrapping?`, `we do. Tick "gift wrap" at checkout and we'll wrap it in recycled paper with a handwritten tag, for {wrap}.`],
	[`is the Hartcliffe teapot dishwasher safe? I've been eyeing one up.`, `Hartcliffe say their stoneware will survive the dishwasher, but they recommend washing by hand to keep the glaze at its best.`],
	[`can I buy a gift card from you?`, `yes, we sell digital gift cards from {gift} upwards, emailed on the day you choose. They're under Gifts on the website.`],
	[`is there anywhere I can see your things in person?`, `we still have a stall at the Frome Independent market on the first Sunday of most months, which is where Fernhill started. Otherwise we're online only.`],
	[`when will the Christmas hampers be on the website?`, `they go on sale on 16 November. Last order dates for Christmas are on the delivery page.`],
	[`are your candles vegan?`, `the soy candles are; the beeswax ones obviously aren't. None of Hearth & Wick's fragrances are tested on animals.`],
	[`how long does the olive oil keep once it's open?`, `Ostro say about three months once opened, kept somewhere cool and dark, and eighteen months unopened.`],
	[`is the chef's knife all right for a left-hander?`, `yes. Hollins Forge grind both sides of the blade evenly, so it works the same in either hand.`],
	[`do you do trade prices? I run a small café.`, `we do for some of our makers. Our trade team would love to hear from you at trade@fernhillmarket.com.`],
	[`where are the Tor mugs made?`, `in Owen's workshop on Dartmoor. Each one is thrown and glazed by hand, which is why no two are quite alike.`],
	[`what are your last posting dates for Christmas?`, `for standard delivery, 17 December in the UK, 10 December to the EU and 8 December to the US. Express runs a few days later.`],
	[`is the cast-iron skillet pre-seasoned?`, `it is, with a thin coat of rapeseed oil, so it's ready to use. Hollins Forge include a card on keeping it seasoned.`]
];

/** Smaller matters a customer raises along the way, none of them about money back. The engine adds a lead-in. */
const sideLeads = ['Something else while I have you.', 'Unrelated, but a quick question.', "One more thing, if you don't mind.", "While I'm writing:", 'A different subject:', 'Also,', ''];
const sides: Msg[][] = [
	[
		c([`We're moving house at the end of the month. If I change my address in my account, will that cover everything, or do I need to tell you as well?`, `we're moving in a few weeks. Is changing the address in my account enough, or should I let you know separately?`]),
		a(`Changing it in your account is all you need to do; every order from then on will use it. Anything already on its way still goes to the old address, so if you order before the move, let me know and I'll keep an eye on it.`),
		c(`Great, I'll update it once we've moved in.`, { p: 0.6 })
	],
	[
		c([`The {carrier} driver threw a parcel over our side gate last week. Not your fault at all, but you might want to know.`, `I wanted to mention that {carrier} left my last parcel on the pavement outside the house, in the rain. Not your doing, but I thought you'd want to know.`]),
		a(`Thank you for telling me. I've passed it on to our account manager at {carrier} with your postcode; they do act on these, and it helps them to know where it happened.`)
	],
	[
		c(`Could you take my old email address, {oldEmail}, off your newsletter list? I don't use it any more and I'd rather everything came to this one.`),
		a(`Done: I've taken {oldEmail} off the list, and the newsletter will come to this address from now on. One that's already scheduled may still go to the old one this week.`)
	],
	[
		c(`I placed another order this morning, {order2}, as a present for my dad. Could you add a note saying "Happy 70th, Dad, with love from all of us"?`),
		a(`What a lovely thing to send. I've added that note to {order2}, and it'll be written by hand on a card in the box.`),
		c(`Thank you, he'll love that.`, { p: 0.5 })
	],
	[
		c([`I'm looking for a present for a friend who bakes a lot. Any ideas for under {budget}?`, `can you suggest something for a keen cook, around {budget}? It's for my brother-in-law, who has everything.`]),
		a(`A few favourites: the Brindle & Oak beechwood spoons, Pippin Kitchen's damson jam with a tin of our shortbread, or the waffle tea towels. The spoons and the tea towels together come in just under {budget}.`),
		c(`Spoons and tea towels it is. Thanks for the ideas!`, { p: 0.6 })
	],
	[
		c(`I can't log in to my account on my phone. It says my password is wrong, but the same password works on my laptop.`),
		a(`That usually means your phone has an old password saved and is filling it in for you. If you clear the saved one in your phone's settings and type the password in by hand, it should work. If not, tell me which browser you use and I'll look into it.`),
		c(`That was it, thank you. Sorted.`, { p: 0.7 })
	],
	[
		c(`Could you let me know when the Celadon jugs are back in stock? The page just says sold out.`),
		a(`They're due back from Hartcliffe in {later}. I've put your name on the list, so you'll get an email the day they're back.`)
	],
	[
		c(`For future orders, is there a way to ask couriers to leave parcels with the shop next door? I'm out at work most days.`),
		a(`There is: anything you type in the delivery note box at checkout is printed on the label. Something like "If out, please leave with the shop at number 12" works well with most couriers.`)
	],
	[
		c([`On a happier note, the {other} I bought in the summer is wonderful. Please tell the maker!`, `I meant to say last time: the {other} I bought from you in the spring gets used every day. Please pass that on.`]),
		a(`I will, thank you! Makers love hearing that, and I'll send your words on today.`)
	],
	[
		c(`We're thinking of ordering about forty Little Pantry boxes as Christmas presents for our staff. Is there a discount for that many?`),
		a(`There is: ten per cent off orders of twenty-five or more of the same box, and we can print your logo on the tags. I've copied in our trade team, who'll put a quote together for you this week.`),
		c(`Brilliant, I'll look out for it.`, { p: 0.5 })
	],
	[
		c(`Please don't put a printed receipt in parcels I send as presents. My aunt saw exactly what I'd spent!`),
		a(`Oops, sorry about that. I've changed your account so receipts are only ever emailed, never printed in the parcel.`)
	],
	[
		c(`Could you send me a VAT invoice for this order? It's going through the business, {company}.`),
		a(`Of course, here it is with {company} on it. You can also download one from the order page in your account whenever you need it.`, { art: 'invoice' }),
		c(`Perfect, thanks.`, { p: 0.5 })
	],
	[
		c(`Could my next order go to my office? Do I just add a second address?`),
		a(`Yes, just add it as a second address at checkout. If your office has a reception, put its opening hours in the delivery note, as couriers often come early.`)
	],
	[
		c([`How should I look after an olive-wood board? Mine is looking a bit dry and pale.`, `what's the best way to look after a wooden chopping board? Ours has gone rather grey.`]),
		a(`Rub it with a little food-safe mineral oil or a beeswax board butter once a month, and never put it in the dishwasher or leave it soaking. Brindle & Oak make a board butter that works well, and it brings the colour back within a day or so.`),
		c(`Thanks, I'll get some of that.`, { p: 0.5 })
	],
	[
		c([`Is your packaging recyclable? I had a lot of paper and one plastic sleeve.`, `I try to avoid plastic. How much of your packaging can go in the recycling?`]),
		a(`All our paper and boxes are recycled and recyclable. The sleeves for glass bottles are the one plastic we still use, and we're testing a card version this winter.`)
	],
	[
		c(`How much is delivery to the US? I'd like to send something to my cousin in Boston.`),
		a(`Orders to the US go from our partner in New Jersey, so delivery is $8.50, or free over $75, and there are no import charges for your cousin to pay.`)
	],
	[
		c(`My other order, {order2}, says it was sent on Monday but the tracking hasn't changed since. Should I worry?`),
		a(`I've had a look, and it is moving: the tracking just hadn't updated overnight. It's due with you by {eta}.`, { art: 'otherTrack' }),
		c(`Phew, thanks for checking.`, { p: 0.5 })
	],
	[
		c([`Could you check where my other order, {order2}, has got to? It should have come by now.`, `Can I still change the address on my other order, {order2}? I'll be at my parents' that week.`]),
		a([`Of course. Here's where it is: it's with {wh} and due to be collected this afternoon, so it should be with you in a couple of days.`, `Here's what I can see for it. It hasn't left {wh} yet, so I can still change the address; just send me the new one.`], { art: 'other' }),
		c([`Thanks, that's reassuring.`, `Great, thank you. I'll keep an eye out.`], { p: 0.7 })
	],
	[
		c(`Could you tell me how much is left on my gift card? The code ends in {gc4}.`),
		a(`There's {gcLeft} left on it, and it's valid until {gcEnd}. It's applied at checkout automatically if you're logged in.`, { art: 'giftcard' })
	]
];

/** Asked after the outcome, about how it reaches the customer. */
const followUps: Record<string, Msg[][]> = {
	refund: [
		[c(`Thanks. The card I paid with has expired since, though. Will the money still reach me?`), a(`It will. When a card is replaced, the bank passes refunds on to the new card on the same account. If it hasn't shown within ten working days, let me know and I'll send you the payment details to give your bank.`)],
		[c(`How will it show on my statement? My partner keeps an eye on our account and I don't want them to think it's another purchase!`), a(`It shows as FERNHILL MARKET, like the original payment, marked as a refund or a credit depending on your bank.`)],
		[c(`Is there any way to speed it up? It's been an expensive month.`), a(`I'm afraid it's in your bank's hands once it's left us. Most banks show it within three days, and none should take longer than ten.`)]
	],
	replace: [
		[c(`Will I need to be in to sign for it?`), a(`No, it doesn't need a signature. {carrier} will leave it in a safe place or with a neighbour, and you can choose which from the tracking link.`)],
		[c(`Will it come with the same courier as before?`), a(`It will, by {service}, and the dispatch email has the tracking link.`)]
	],
	voucher: [
		[c(`Can I use the voucher on things in the sale?`), a(`Yes, on anything except gift cards, and you can spread it over more than one order.`)],
		[c(`Does the voucher run out?`), a(`It lasts twelve months, and you'll get a reminder a few weeks before it ends.`)]
	]
};
/** A second round some outcomes get before the case closes, with the outcome's own words kept for the end. */
const seconds: Record<string, Msg[]> = {
	replace: [c([`The replacement hasn't arrived yet. Could you check where it is?`, `Just checking: is the new one on its way? I haven't had a dispatch email.`]), a(`Here's where it is. It left {wh} yesterday and should be with you by {eta}.`, { art: 'resent' })],
	voucher: [c([`I tried the voucher code at checkout and it says it isn't valid. Am I doing something wrong?`, `The code doesn't seem to work. It says "not recognised".`]), a(`Sorry about that: it needs to be typed with the dashes, and you need to be logged in with the email address on your account. I've checked and it's live, so it should work now.`), c([`That worked, thanks!`, `Got it, it's gone through now.`])]
};
/** What the first reply may add, by the kind of problem the customer described. */
const policies: Partial<Record<Cat, string[]>> = {
	damaged: [`Anything that arrives damaged or turns out to be faulty is our responsibility, not yours, so you won't be out of pocket whatever we decide.`, `When something is damaged or faulty, we always offer a replacement or a refund, and you never pay to send anything back.`],
	wrong: [`Mix-ups like this are rare, but when they happen we cover all the postage both ways.`, `If something's missing or wrong, we put it right at our cost.`],
	lost: [`Until a parcel reaches you, it's our responsibility, so please don't worry about the cost.`, `Parcels do sometimes go astray for a few days, but if it doesn't turn up we'll make sure you aren't out of pocket.`],
	unwanted: [`Our returns window is thirty days from delivery for anything unused.`, `The returns policy is on the Help page, but in short: thirty days from delivery for anything unused, and food only if it's faulty.`]
};
const purposes = [
	`I'd been looking at it on your website for months before I finally ordered.`,
	`I chose you because I wanted something from a small maker rather than a big chain.`,
	`I'm not usually one to complain, so I almost didn't write.`,
	`My partner thinks I'm making a fuss, but I'd rather ask.`,
	`I'd recommended you to two friends the week before, which makes this a bit awkward.`,
	`We're having family to stay for the first time in the new house next month, which is partly why I ordered.`,
	`Everything else I've had from you has been lovely, so this was a surprise.`
];
const chit = [
	`Sorry for the slow reply; it's been a hectic week with the children back at school.`,
	`Apologies for the delay, I've been away for a few days.`,
	`Thanks for getting back to me so quickly.`,
	`Writing this on my phone on the train, so excuse any typos.`,
	`I've just got in from work and seen your email.`,
	`Sorry, your email went into my spam folder and I've only just seen it.`
];
const reassures = [
	`You can reply to this email at any time and it comes straight back to me.`,
	`I've made a note on your account, so whoever picks up your next message will know the background.`,
	`I'll keep this case open until it's all sorted, so you won't need to explain it to anyone else.`,
	`If anything changes on your side in the meantime, just let me know.`
];

/** What a customer may add to the first message, by the kind of problem they describe. */
const stories: Record<Cat, string[]> = {
	damaged: [`I opened it on the kitchen table with my daughter watching, so there were a few tears as well.`, `The courier left it on the doorstep in the rain, though I don't know whether that matters.`, `I've put everything back in the box for now in case you need to see it.`, `Parcels often arrive battered round here, so I'm not blaming you.`],
	wrong: [`I checked the order confirmation to make sure it wasn't me, and it definitely says what I ordered.`, `I've left everything in the box and haven't used any of it.`, `It's not a disaster, but I'd like it sorted before the weekend if possible.`],
	lost: [`I've asked at the post office and they told me to contact you, as the sender.`, `My neighbours have been very good about checking, but nobody has it.`, `I work from home, so I'm fairly sure I'd have heard the door.`],
	unwanted: [`Everything is still in its wrapping, and I've kept the box.`, `I'm sorry to be a nuisance; I should have read the description more carefully.`, `It's nothing wrong with the quality, just my own choice.`],
	pricing: [`It's not a huge amount, but it's the principle.`, `I'd rather check than just let it go.`],
	other: [`I'd appreciate a quick answer, as it's been on my mind.`, `I'm sure there's a simple explanation.`]
};
/** Care's standard paragraphs, added to a message that matches. */
const macros: [RegExp, string, number][] = [
	[/refunded \{refund\}|refunded the/, `Refunds go back to the card you paid with. Most banks show them within three to five working days, a few take up to ten, and they appear as FERNHILL MARKET.`, 0.4],
	[/prepaid label|label is attached|returns label/, `To send it back:\n\n1. Pack it in its original box if you still have it, or in something sturdy with plenty of padding.\n2. Print the label and stick it over any old labels on the box.\n3. Drop it at any {dropoff} and keep the receipt until we've confirmed it's arrived.\n4. We'll email you when {wh} have checked it in, usually within three working days of it arriving.`, 0.65],
	[/opened a claim|investigation|look for it/, `In case it helps, this is how it works from here: {carrier} search the depot and the driver's last route, which can take up to ten working days, and most parcels turn up in that time. If it doesn't, the claim is between us and {carrier}, and you won't need to do anything.`, 0.55],
	[/send me a couple of photos|send me a photo|send a photo|photos of/, `If you can, please include the item itself, the inside of the box with its packing, and the outside of the box with the label showing.`, 0.4],
	[/voucher on your account|voucher to your account/, `Vouchers are used at checkout: type the code in the box under your basket. They cover anything except gift cards.`, 0.45],
	[/send you a replacement|sent you the|sending you a new|sent your order out|send it to the right address/, `You'll get a dispatch email with the tracking link the same evening.`, 0.45]
];

/** Questions customers ask while a case is under way, with care's answer, and the categories they fit. */
const asides: [Cat[], string[], string[]][] = [
	[['damaged', 'wrong', 'lost', 'other'], [`When do you think you'll know?`, `How long does this usually take?`, `Roughly when should I expect to hear back?`], [`I'd expect to hear by {by}, and I'll write as soon as I do.`, `Usually a couple of working days. I'll update you by {by} either way.`]],
	[['damaged', 'wrong'], [`Should I keep everything for now, or can I throw the packaging away?`, `Do you need me to keep the box?`], [`Please keep it all until we've settled things; we sometimes need to show it to the courier.`, `Hold on to it for now, if you don't mind. I'll tell you as soon as you can recycle it.`]],
	[['lost'], [`Is there a number for {carrier} I could ring myself?`, `Would it help if I called {carrier}?`], [`It's quicker if we deal with them, as the parcel is ours until it reaches you. I'll chase them for you.`, `Thanks for offering, but {carrier} will only talk to the sender about a missing parcel, so leave it with me.`]],
	[['unwanted'], [`Will I get the delivery charge back as well?`, `Do I get the postage back?`], [`For part of an order, the original delivery charge stays, as the rest still needed sending. If the whole order comes back within fourteen days, we refund that too.`, `The original delivery is refunded when the whole order comes back within fourteen days; return postage is yours unless something was wrong with the item.`]],
	[['pricing'], [`Is this a problem with the website?`, `Has anyone else had this?`], [`I'm checking the order log now, which shows exactly what the basket did when you paid.`, `I'm looking at the log for your order first, and I'll tell you what I find.`]]
];
const approvals = [`Asking {lead} to sign off {refund}, as it's over my limit.`, `{lead}, OK to refund {refund} on this one?`, `Refund of {refund} needs a lead's OK; asked {lead}.`];
const approved = [`Fine by me. Go ahead.`, `Approved. Thanks for checking.`, `Yes, go ahead, and please add a note about what happened.`, `OK from me.`];
const stockNotes = [`Checked stock: {stock} at {wh}.`, `{wh} confirm {stock} on the shelf.`, `Stock check: {stock} available.`];

const holdings = [
	`I'm still waiting to hear back from {wh}. I've chased them this afternoon and will come back to you by {by}.`,
	`Sorry for the wait. I've chased this up and expect an answer by {by}; I'll be in touch as soon as I have it.`,
	`Just to let you know I haven't forgotten you. I'm waiting on {wh} and will update you by {by} at the latest.`
];
const chasers = [`Hi, just checking in on this. Is there any news?`, `Sorry to chase, but is there an update?`, `Hello, I haven't heard anything for a few days. Could someone let me know where things are?`, `Any news on this, please?`];
const thanks = [`Thank you, that's great.`, `Brilliant, thanks for your help.`, `Thanks for sorting this out so quickly.`, `Much appreciated, thank you.`, `Thank you, you've been really helpful.`, `That's perfect, thanks.`];
const closings = [`You're very welcome. I'll close the case now, but just reply here if anything else comes up.`, `Glad that's sorted. Enjoy the rest of your order!`, `Thanks for being so patient, {first}. Have a lovely week.`, `My pleasure. Take care, and thanks for shopping with us.`];
const relations = ['sister', 'mother', 'best friend', 'aunt', 'father', 'brother', 'grandmother', 'neighbour', 'goddaughter', 'oldest friend'];
const occasions = ['birthday', 'anniversary', 'housewarming', 'retirement do', 'wedding'];
const companies = ['Ashgrove Dental Practice', 'Harbour Lane Architects', 'Two Rivers Bakery', 'Kestrel Studio Ltd'];

// ---------------------------------------------------------------------------------------------------------------
// Pasted output: what care saw in the back office, the couriers' tracking and the warehouses' notes.
const table = (head: string[], rows: string[][]) =>
	[`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`, ...rows.map((row) => `| ${row.join(' | ')} |`)].join('\n');
const fence = (lines: string[]) => ['```', ...lines, '```'].join('\n');
const at2 = (day: number, r: Rand, low: number, high: number) => day + int(r, low * 60, high * 60) * MIN;
const lineName = (line: Line) => `${line.qty} × ${line.product.name}`;
const binOf = (r: Rand) => `${pick(r, ['A', 'B', 'C', 'D', 'L', 'P'])}-${pad(int(r, 1, 40))}`;

const tracking = (k: Case, how: string): string => {
	const { r, region } = k;
	const [service, carrier] = [k.s.service!, k.s.carrier!];
	const depot = k.s.depot!;
	const rows: string[][] = [];
	const ev = (ms: number, where: string, what: string) => rows.push([`${stamp(ms).replace(' 2026,', '')}`, where, what]);
	ev(k.collected, region.wh, `Collected by ${carrier}`);
	ev(midnight(k.collected) + 21 * HOUR + int(r, 0, 150) * MIN, depot, 'Sorted');
	if (how === 'stuck') {
		ev(at2(k.shipped + DAY, r, 4, 7), depot, 'Held at depot');
		ev(at2(k.shipped + 2 * DAY, r, 6, 9), depot, 'Held at depot');
		return table(['When', 'Where', 'What'], rows);
	}
	if (how === 'customs') {
		ev(at2(k.shipped + DAY, r, 9, 14), depot, 'Arrived in destination country');
		ev(at2(k.shipped + 2 * DAY, r, 8, 11), depot, `Held: import charges of ${k.s.duty} due from recipient`);
		ev(midnight(Number(k.s.nowMs)) - DAY + int(r, 9 * 60, 14 * 60) * MIN, depot, 'Recipient declined to pay import charges');
		ev(midnight(Number(k.s.nowMs)) - DAY + int(r, 15 * 60, 19 * 60) * MIN, depot, 'Returning to sender');
		return table(['When', 'Where', 'What'], rows);
	}
	if (how === 'late') ev(at2(k.shipped + DAY, r, 5, 8), depot, 'Delayed: missed onward connection');
	const local = `${k.s.town} delivery office`;
	const last = k.delivered;
	ev(at2(last, r, 5, 6.5), local, 'Arrived at delivery office');
	ev(at2(last, r, 7, 8.5), local, 'Out for delivery');
	if (how === 'returned') {
		ev(k.arrived, k.s.town!, 'Unable to deliver: address not found');
		ev(at2(last + DAY, r, 6, 9), local, 'Returning to sender');
		return table(['When', 'Where', 'What'], rows);
	}
	const left = how === 'safe' ? `Delivered, left ${k.s.left}` : pick(r, ['Delivered, signed for by resident', 'Delivered, handed to resident', 'Delivered to front door']);
	ev(k.arrived, k.s.town!, left);
	return table(['When', 'Where', 'What'], rows);
};

const pickList = (k: Case, how: string): string => {
	const { r } = k;
	const packer = pick(r, ['Dan W.', 'Ellie M.', 'Kasia P.', 'Jordan T.', 'Ben A.', 'Rosa K.']);
	const out = [`Pick list ${k.s.order} · packed ${dm(k.packed)} ${hm(k.packed)} by ${packer}`];
	k.lines.forEach((line, i) => {
		const bin = binOf(r);
		let state = 'scanned';
		if (i === 0 && how === 'short') state = 'not scanned (bin empty at pick)';
		if (i === 0 && how === 'wrong') state = `scanned bin label ${bin.slice(0, 2)}${pad(Number(bin.slice(2)) + 1)}, item not scanned`;
		if (i === 0 && how === 'split') state = 'scanned · parcel 2';
		out.push(`  ${lineName(line).padEnd(54)} bin ${bin.padEnd(5)}  ${state}`);
	});
	const boxes = how === 'split' ? 2 : 1;
	for (let b = 1; b <= boxes; b++) out.push(`Parcel ${b} of ${boxes} · ${(int(r, 6, 48) / 10).toFixed(1)} kg · box ${pick(r, ['S1', 'M2', 'M3', 'L1'])} · fill: ${pick(r, ['paper', 'paper', 'card shred', 'paper and corner guards'])}`);
	return fence(out);
};

const returnIn = (k: Case, how: string): string => {
	const { r } = k;
	const when = Number(k.s.nowMs);
	const condition = how === 'fault' ? pick(r, ['washed once; shrinkage as described', 'used; fault as the customer described']) : how === 'used' ? pick(r, ['used: washed, creased, no tags', 'used: marks on the surface, cleaned', 'used: signs of use, not resaleable']) : how === 'broken' ? 'arrived broken; sent in a padded envelope with no inner packing' : pick(r, ['unused, in original packaging', 'unused, tags on', 'unused, outer sleeve slightly scuffed']);
	return fence([
		`Return received · ${k.region.wh} · ${dm(when)} ${hm(when)}`,
		`Order        ${k.s.order}`,
		`Items        ${lineName(k.main)}`,
		`Condition    ${condition}`,
		`Restock      ${how === 'ok' ? 'yes' : how === 'fault' ? 'no, back to the maker' : 'no'}`,
		`Checked by   ${k.s.whp}`
	]);
};

const arts: Record<string, (k: Case) => string> = {
	photos: (k) => {
		const first = int(k.r, 1000, 9800);
		return `[Attached: ${Array.from({ length: int(k.r, 2, 3) }, (_, i) => `IMG_${first + i}.jpg`).join(', ')}]`;
	},
	video: (k) => `[Attached: VID_${int(k.r, 1000, 9800)}.mp4, 0:${pad(int(k.r, 12, 48))}]`,
	safe: (k) => tracking(k, 'safe'),
	signed: (k) => tracking(k, 'signed'),
	stuck: (k) => tracking(k, 'stuck'),
	late: (k) => tracking(k, 'late'),
	returned: (k) => tracking(k, 'returned'),
	customs: (k) => tracking(k, 'customs'),
	split: (k) => tracking(k, 'split'),
	pick: (k) => pickList(k, 'ok'),
	pickShort: (k) => pickList(k, 'short'),
	pickWrong: (k) => pickList(k, 'wrong'),
	pickSplit: (k) => pickList(k, 'split'),
	returnOk: (k) => returnIn(k, 'ok'),
	returnUsed: (k) => returnIn(k, 'used'),
	returnBroken: (k) => returnIn(k, 'broken'),
	returnFault: (k) => returnIn(k, 'fault'),
	batch: (k) =>
		fence([`Batch ${k.s.batch} · made ${k.s.made} · best before ${k.s.bestBefore}`, `Jars filled ${int(k.r, 240, 600)} · sold ${int(k.r, 90, 230)} · other reports ${int(k.r, 0, 1)}`, `Kept back for checking: 6 jars, opened ${dm(Number(k.s.nowMs) - DAY)}: all fine`]),
	roast: (k) => fence([`${k.main.product.name}`, `Roasted ${k.s.roast} · best within eight weeks of roasting`, `Lot ${k.s.batch}`]),
	listing: (k) => fence([`Listing as it was   ${k.main.product.name} · fits tables up to 190 cm long, seating six`, `Measured on shelf   150 × 220 cm (three checked)`, `Label sewn in       150 × 250 cm`]),
	statement: (k) =>
		table(
			['Date', 'Description', 'Amount', 'Status'],
			[
				[dm(k.placed), 'FERNHILL MARKET', money(k.region, k.authorised), 'on hold'],
				[dm(k.shipped), 'FERNHILL MARKET', money(k.region, k.captured), 'paid'],
				[dm(k.shipped + DAY), pick(k.r, k.region.id === 'uk' ? ['TESCO STORES 2241', 'SAINSBURYS S/MKT', 'CO-OP GROUP 120'] : k.region.id === 'us' ? ['WHOLE FOODS MKT', 'CVS/PHARMACY 0412', 'SHELL OIL 5741'] : ['ALBERT HEIJN 1043', 'LIDL 0472', 'CARREFOUR MARKET']), money(k.region, int(k.r, 800, 6400)), 'paid']
			]
		),
	club: (k) =>
		fence([`Coffee Club · ${k.s.full}`, `Started      ${pick(k.r, ['February', 'March', 'April', 'May'])} 2026`, `Box          Guji natural and house blend, 250 g each, monthly`, `Cut-off      five days before each box is sent`, `Cancelled    ${k.s.cancelDay} ${k.s.cancelTime}`, `Last box     packed ${dm(k.shipped)}, sent by ${k.s.service}`]),
	receipt: (k) => fence([`${k.s.retService} · ${k.s.town} · ${k.s.posted}`, `1 item · tracked`, `Tracking no.  ${k.s.retTrack}`, `To            Fernhill Market Returns, ${k.region.wh}`]),
	checkout: (k) =>
		fence([`Basket at checkout, from the order log`, `  Subtotal        ${k.s.subtotal}`, `  Code entered    ${k.s.code} at ${hm(k.placed - 2 * MIN)}`, `  Discount        none`, `  Delivery        ${k.s.ship}`, `  Total paid      ${k.s.total}`]),
	claim: (k) =>
		fence([`Claim ${k.s.claimNo} · ${k.s.carrier} · opened ${dm(Number(k.s.nowMs))}`, `Parcel        ${k.s.track}`, `Reason        ${k.s.claimWhy}`, `Value         ${k.s.total}`, `Answer due    ${k.s.soon}`]),
	dispatch: (k) =>
		[`> **Your Fernhill order ${k.s.order} is on its way**`, `>`, `> Hi ${k.s.first}, good news: your order left ${k.region.wh} today with ${k.s.service}.`, `>`, ...k.lines.map((line) => `> ${line.qty} × ${line.product.name}`), `>`, `> Track your parcel: https://track.fernhillmarket.com/${k.s.order}`, `> Questions? Just reply to this email.`].join('\n'),
	resent: (k) => {
		const now = Number(k.s.nowMs);
		return table(['When', 'Where', 'What'], [[stamp(now - DAY - 6 * HOUR).replace(' 2026,', ''), k.region.wh, `Collected by ${k.s.carrier}`], [stamp(now - DAY - 2 * HOUR).replace(' 2026,', ''), k.s.depot!, 'Sorted'], [stamp(now - 3 * HOUR).replace(' 2026,', ''), k.s.depot!, 'In transit']]);
	},
	proof: (k) => fence([`Proof of delivery · ${k.s.carrier} · ${k.s.track}`, `Delivered     ${stamp(k.arrived)}`, `Left          ${k.s.left}`, `Photo         ${pick(k.r, ['parcel on a step beside a blue door', 'parcel beside a doormat and a plant pot', 'parcel in a porch with a bicycle', 'parcel by a grey front door'])}`, `Location      ${int(k.r, 40, 900)} m from the delivery address`]),
	otherTrack: (k) => {
		const now = Number(k.s.nowMs);
		return table(['When', 'Where', 'What'], [[stamp(now - 3 * DAY + 2 * HOUR).replace(' 2026,', ''), k.region.wh, 'Collected'], [stamp(now - 3 * DAY + 6 * HOUR).replace(' 2026,', ''), k.s.depot!, 'Sorted'], [stamp(now - 2 * HOUR).replace(' 2026,', ''), k.s.depot!, 'In transit to delivery office']]);
	},
	giftcard: (k) => fence([`Gift card ending ${k.s.gc4}`, `Bought by     ${pick(k.r, ['a friend', 'a family member', 'the customer'])} on ${dm(Number(k.s.nowMs) - int(k.r, 60, 300) * DAY)}`, `Used on       FM-${int(k.r, 160000, 199999)}`, `Balance       ${k.s.gcLeft}`, `Valid until   ${k.s.gcEnd}`]),
	confirmation: (k) => [`> **Thank you for your order, ${k.s.first}**`, `>`, `> Order ${k.s.order}, placed ${dm(k.placed)}`, `>`, ...k.lines.map((line) => `> ${line.product.name} × ${line.qty}: ${money(k.region, line.unit * line.qty)}`), `> Delivery: ${k.s.ship}`, `> Total: ${k.s.total}`, `>`, `> We'll email you when it's on its way.`].join('\n'),
	label: (k) => fence([`Returns label · ${k.s.order}`, `Service       ${k.region.id === 'us' ? 'UPS Ground, prepaid' : k.region.id === 'uk' ? 'Royal Mail Tracked Returns 48' : 'DHL Parcel Return Connect'}`, `Label code    ${k.s.labelCode}`, `Use by        ${k.s.soon}`, `Drop off      any ${k.region.dropoff}; no printer needed with the code`, `Returns to    Fernhill Market Returns, ${k.region.wh}`]),
	other: (k) => {
		const now = Number(k.s.nowMs);
		const r = mulberry32(Number(k.s.card4) * 31);
		const lines = shuffle(r, products.filter((p) => !['electric', 'club', 'engraved'].includes(p.kind))).slice(0, int(r, 1, 3));
		const rows = lines.map((p) => [p.name, '1', money(k.region, amount(k.region, p.gbp))]);
		const placed = now - int(r, 1, 3) * DAY - int(r, 1, 9) * HOUR;
		return `Order ${k.s.order2}\n\n${table(['Item', 'Qty', 'Price'], rows)}\n\n${table(['When', 'Event'], [[stamp(placed).replace(' 2026,', ''), 'Order placed on the website'], [stamp(placed + MIN).replace(' 2026,', ''), 'Order confirmation email sent'], [stamp(placed + 14 * HOUR).replace(' 2026,', ''), `Sent to ${k.region.wh}`]])}`;
	},
	invoice: (k) => {
		const rows = k.lines.map((line) => {
			const gross = line.unit * line.qty;
			const rated = ['ceramic', 'linen', 'knife', 'tool', 'electric', 'candle', 'engraved', 'chocolate', 'hamper'].includes(line.product.kind);
			const net = rated ? Math.round(gross / 1.2) : gross;
			return [line.product.name, String(line.qty), money(k.region, net), rated ? '20%' : '0%', money(k.region, gross - net), money(k.region, gross)];
		});
		if (k.shipCost) rows.push(['Delivery', '1', money(k.region, Math.round(k.shipCost / 1.2)), '20%', money(k.region, k.shipCost - Math.round(k.shipCost / 1.2)), money(k.region, k.shipCost)]);
		return `VAT invoice for ${k.s.order}, ${k.s.company}, ${dm(k.shipped)} 2026 · Fernhill Market Ltd, VAT GB 318 4471 26\n\n${table(['Item', 'Qty', 'Net', 'VAT rate', 'VAT', 'Total'], rows)}`;
	}
};

// ---------------------------------------------------------------------------------------------------------------
// Topics: why the customer wrote, and the ways a case on it can end. The case's own text never names the reason
// or the outcome; a reader has to follow it to the last message.
type Cat = 'damaged' | 'wrong' | 'lost' | 'unwanted' | 'pricing' | 'other';
type Out = 'refund' | 'replace' | 'voucher' | 'none' | 'open';
type Refund = 'all' | 'main' | 'item' | 'price' | 'unit' | 'pct' | 'ship' | 'diff' | 'missing' | 'goods' | 'lessfee' | 'drop';
interface End {
	out: Out;
	refund?: Refund;
	pct?: number;
	need?: 'set' | 'noset' | 'colour';
	ago?: [number, number];
	pre?: (k: Case) => void;
	msgs: Msg[];
}
interface Topic {
	id: string;
	cat: Cat;
	weight: number;
	goods: Kind[];
	only?: string[];
	regions?: Region['id'][];
	multi?: boolean;
	qty?: number;
	express?: boolean;
	ago?: [number, number];
	undelivered?: boolean;
	hold?: boolean;
	replyArt?: string;
	subjects: string[];
	open: string[];
	reply: string[];
	mid?: Msg[];
	ends: End[];
}

/** The customer refuses a parcel held for import charges, and care shows where it has got to. */
const refuse = [c([`I'll refuse it, then.`, `In that case I'll refuse it. I'd rather not pay that much on top.`]), a(`Understood. Here's where it is now:`, { art: 'customs', wait: true })];
const refundLine = `I've refunded {refund} to your card ending {card4}; it usually shows within three to five working days, depending on your bank.`;

const topics: Topic[] = [
	{
		id: 'broken', cat: 'damaged', weight: 3, goods: ['ceramic'], ago: [3, 9],
		subjects: ['{Short} arrived broken', 'Broken {short}', 'Damaged in the post', 'Order {order}'],
		open: [
			`My order {order} came on {delivered} and {one} was broken when I unpacked it. The box looked fine from the outside, but inside there were shards of glaze all through the paper. I'd been looking forward to this for weeks, so it was a bit of a let-down.`,
			`I'm sorry to say that {one} arrived in pieces. The outer box has a dent in one corner, so I'm guessing it was dropped somewhere along the way. I haven't thrown anything away yet. What would you like me to do?`,
			`Bad news, I'm afraid: {one} arrived with a crack running right across the base. I only noticed when I lifted it out of the paper and a piece came away in my hand.`,
			`I've just unwrapped my parcel and {one} is cracked right through, with a chunk missing from the rim. There was plenty of paper round everything, so I don't think it was badly packed; it must have taken a knock on the way.`
		],
		reply: [
			`I'm so sorry {one} arrived broken; that's not how anything from {maker} should reach you. Could you send me a couple of photos, one of the damage and one of the box it came in, with the label showing if possible? That lets me raise it with {carrier} and work out the quickest way to put it right.`,
			`Oh no, I'm sorry to hear that. Before I sort out what happens next, would you mind sending photos of the broken piece and of the outer box? We use them to see whether the packing or the journey was to blame, and {carrier} ask for them too.`
		],
		mid: [
			c([`Photos attached. The second one shows the corner of the box where it's been crushed.`, `Here you go. I've kept all the pieces in the box in case you need them.`, `Two photos attached. You can see the crack runs from the handle right down to the base.`], { art: 'photos' }),
			n([`Photos show a clean break and a crushed corner on the outer box. Single-wall box, paper fill. Flagged to {whp} at {wh}: third breakage from this box size this month.`, `Looks like a drop in transit: crushed corner, and the break is on the same side. Packing looks reasonable in the photos.`], { p: 0.7 }),
			w(`Hi {agent}, thanks for the photos. That box size has been struggling with the heavier stoneware, so from today we're packing {maker}'s pieces in the sturdier corrugated boxes with corner guards.`, { p: 0.35, wait: true })
		],
		ends: [
			{ out: 'replace', msgs: [
				a(`Thank you, that's really helpful. I've asked {wh} to send you a replacement today by {service}, at no cost, and you don't need to send the broken one back; please recycle what you can. You'll get a dispatch email this evening.`),
				c([`The replacement came this morning, very well wrapped this time, and it's lovely. Thank you for sorting it so quickly.`, `New one arrived safe and sound. Thanks so much.`])
			] },
			{ out: 'refund', refund: 'main', msgs: [
				a(`Thank you for those. I went to send you a replacement, but {wh} tell me the last one went out yesterday and {maker} won't have more until {restock}. I can put one aside for you from the next batch, or refund you now if you'd rather not wait. Which would you prefer?`),
				c([`{restock} is too long, I'm afraid; it was meant for a dinner next month. A refund is fine.`, `I'd rather have the refund, thanks. I may order one when they're back.`]),
				a(`Of course. ${refundLine} There's no need to return the broken one.`)
			] },
			{ out: 'refund', refund: 'unit', need: 'set', msgs: [
				a(`Thanks for the photos. As the rest of the set arrived fine, I can either send a replacement for the broken piece or refund it. {maker} make each one by hand, so a replacement won't match the others exactly; some customers like that and some don't.`),
				c([`I'd rather they matched, so a refund for the broken one is best. Thanks for explaining.`, `Honestly the glaze varies so much I'd rather not mix them. Could you refund the broken one instead?`]),
				a(`Of course. I've refunded {refund}, the price of one piece of the set, to your card ending {card4}.`)
			] },
			{ out: 'refund', refund: 'main', need: 'noset', msgs: [
				a(`Thank you for those. I've asked {wh} to send you a replacement today by {service}, packed in a heavier box this time, and there's no need to send the broken one back.`),
				c([`I'm sorry to say the replacement arrived this morning and it's cracked as well, in almost the same place. I don't think I want to risk a third.`, `The new one came today and it's chipped on the rim. I'm starting to think it isn't meant to be!`], { wait: true, art: 'photos' }),
				a(`I'm so sorry, {first}. That's not good enough from us. Rather than send another, ${refundLine} Please keep or recycle both; there's nothing to send back.`)
			] },
			{ out: 'open', msgs: [
				a(`Thank you. Because of the value of the order, {carrier} want to see the damaged piece before they settle the claim, so I've booked them to collect it on {by}. Once they have it, I'll send your replacement straight away. I'm sorry this is taking longer than it should.`),
				c([`OK, I'll leave it in the porch for them.`, `That's fine, I'm working from home that day so someone will be in.`]),
				n(`Collection booked with {carrier} for {by}. Replacement to go out as soon as they've collected.`)
			] }
		]
	},
	{
		id: 'leak', cat: 'damaged', weight: 2, goods: ['bottle'], multi: true, ago: [2, 6],
		subjects: ['Leaking parcel', 'Oil everywhere', 'Order {order} arrived soaked', 'Broken bottle'],
		open: [
			`The bottle of {short} in my order broke on the way and everything else in the box is soaked through. The {short2} {is2} covered in it and the box was falling apart when the courier handed it over.`,
			`I'm afraid the {short} leaked all over the rest of my order. The cap is still on tight, so I think the bottle cracked near the bottom. The smell in my hallway this morning was quite something.`
		],
		reply: [
			`Oh dear, I'm sorry, that sounds horrible to unpack. Could you tell me which items were spoiled, and send a photo if you still have the box? Glass is meant to travel in its own sleeve, so I want to find out what happened at {wh}.`,
			`I'm so sorry. Could you send me a photo of the box and tell me what's been spoiled? Bottles should be packed upright in a moulded sleeve, so something has gone wrong.`
		],
		mid: [
			c([`Photo attached. Everything that was in the box with it has oil on it, and I don't think the {short2} can be saved.`, `Here's the box. The paper soaked most of it up, but the {short2} {is2} stained right through.`], { art: 'photos' }),
			w(`Hi {agent}, I've checked the pick list. The {short} should have gone in a moulded sleeve, but we'd run out of sleeves that afternoon and the packer used paper wrap. That's on us; more sleeves arrived the next morning.`, { wait: true, art: 'pick' })
		],
		ends: [
			{ out: 'refund', refund: 'all', msgs: [
				a(`Thanks, {first}, and apologies for the mess. As nothing in the parcel survived, I've refunded the whole order, {refund}, to your card ending {card4}. Please don't send anything back.`),
				c([`That's very kind, thank you. I'll be back once my hallway stops smelling of olives.`, `Thank you, that's more than fair.`])
			] },
			{ out: 'replace', msgs: [
				a(`Thanks for the photo. I've asked {wh} to send the whole order out fresh today, with the {short} in a proper sleeve this time. There's no need to return anything.`),
				c([`The new parcel arrived, everything in one piece. Thank you!`, `All arrived perfectly this time. Thanks for being so quick.`])
			] },
			{ out: 'refund', refund: 'item', msgs: [
				a(`Thanks. From your photo the other things look as if they'll wash, so I've refunded the {short}, {refund}, to your card ending {card4}. If anything turns out not to wash, tell me and I'll sort that too.`),
				c([`That's fine, everything else washed up all right in the end. Thanks.`, `Thanks. The {short2} came out of the wash fine, so we're all square.`])
			] }
		]
	},
	{
		id: 'electric', cat: 'damaged', weight: 2, goods: ['electric'], ago: [18, 38],
		subjects: ['{Short} stopped working', 'Faulty {short}', 'Warranty question', '{Short} not working after three weeks'],
		open: [
			`My {short} stopped working properly after about three weeks. It switches on, the light comes on, and then nothing happens. I've only been using it once a day or so, so I don't think it's been overworked.`,
			`I bought the {short} from you last month and it's already playing up. Some mornings it works, some mornings it doesn't, and today it wouldn't do anything at all. Is there a warranty on it?`
		],
		reply: [
			`I'm sorry to hear that. {maker} give two years' warranty on the {short}, and we handle it for you in the first two months. Before I send it to them, could you try two things: unplug it for ten minutes, and check that it's seated properly on its base? It's surprising how often that sorts it. If not, a short video of what it does would help them a lot.`
		],
		mid: [
			c([`I tried both and nothing changed. Here's a video of what happens when I switch it on.`, `No luck with either, I'm afraid. Video attached, so you can see what I mean.`], { art: 'video' }),
			n(`Sent the video to {makerp} at {maker}.`, { p: 0.6 }),
			mk(`Hi {agent}, thanks for the video. It's hard to tell from that alone. Could the customer send it to us? We'll test it the day it arrives and tell you within two working days. Prepaid label attached.`, { wait: true }),
			a(`{maker} would like to test it themselves. I've attached a prepaid label: please pack it in its original box if you still have it, and drop it at any {dropoff}.`),
			c([`Sent it off this morning. Fingers crossed.`, `Dropped it off at lunchtime. Thanks for arranging it.`])
		],
		ends: [
			{ out: 'replace', msgs: [
				mk(`Hi {agent}, we've tested the {short}: there's a loose connection on the control board, which we see now and then in that batch. We'll send a new one to the customer today, so there's nothing for you to do.`, { wait: true }),
				a(`Good news: {maker} found a fault and are sending you a new {short} today, straight from them. I'm sorry you've been without it.`),
				c([`New one arrived and works perfectly. Thanks for chasing them.`, `The replacement came yesterday. All good, thank you.`], { p: 0.8 })
			] },
			{ out: 'refund', refund: 'main', msgs: [
				mk(`Hi {agent}, we've found a fault on the control board. We'd normally replace it, but we have none in stock until {restock}. Happy for you to refund the customer, and we'll credit you.`, { wait: true }),
				a(`{maker} confirmed the fault but can't replace it until {restock}. Rather than keep you waiting that long, I've refunded {refund} to your card ending {card4}.`),
				c([`That's fair, thank you. I'll go back to the old one in the cupboard for now.`, `Thanks, that's the right call.`], { p: 0.7 })
			] },
			{ out: 'none', msgs: [
				mk(`Hi {agent}, we've tested it and it works as it should: {fault}. We've cleaned it and are posting it back today with a note on how to avoid it.`, { wait: true }),
				a(`{maker} have tested your {short} and couldn't find a fault: {fault}. They've cleaned it and posted it back to you today, with a few tips. I hope that's all right.`),
				c([`Well, that's a bit embarrassing, but good to know. It's back and working, so no need for anything else.`, `Ah. Lesson learned! It arrived back this morning and works fine.`])
			] },
			{ out: 'open', msgs: [
				a(`{maker} have it now and have promised me an answer by {by}. I'll come back to you as soon as I hear, and if it can't be fixed we'll replace it or refund you, whichever you'd prefer.`),
				c([`Thanks. If it comes to it I'd rather have a new one.`, `OK, thanks for keeping me posted.`], { p: 0.6 })
			] }
		]
	},
	{
		id: 'shrank', cat: 'damaged', weight: 2, goods: ['linen'], ago: [9, 26],
		subjects: ['{Short} shrank in the wash', 'Linen quality', 'Disappointed with my {short}', 'Colour ran'],
		open: [
			`I washed the {short} for the first time at 40 and {they} came out noticeably smaller, and the colour has run onto the white things in the same load. I followed the label as far as I know. Is that normal for linen?`,
			`Really disappointed with the {short}. One wash and {they} {has} shrunk so much I can hardly use {them}. I paid {price}, which isn't cheap, and I expected {them} to last for years.`
		],
		reply: [
			`I'm sorry, that's not what you should expect from {maker}'s linen. A little softening and about three per cent shrinkage is normal on the first wash, but not more than that. Could you measure {them} for me and tell me what temperature and spin you used? The label inside should also have a small batch number, which would help.`
		],
		mid: [
			c([`{They} {has} lost about {shrink} per cent on the length. I washed at 40 on a normal cycle and tumble-dried on low. The label says batch {batch}.`, `Measured this morning: about {shrink} per cent shorter than when {they} arrived. 40 degrees, dried on the line. The batch on the label is {batch}.`])
		],
		ends: [
			{ out: 'refund', refund: 'pct', pct: 30, msgs: [
				mk(`Hi {agent}, batch {batch} was the first from a new mill and we've had one other report like this. It shouldn't shrink that much at 40. We'll cover whatever you decide.`, { wait: true }),
				a(`Thank you. {maker} agree that's more than it should shrink. As a goodwill gesture I've refunded {refund}, thirty per cent of the price, to your card ending {card4}, and you're welcome to keep {them}. If you'd rather return {them} for a full refund, just say.`),
				c([`That's fair, I'll keep {them} for everyday use. Thanks.`, `Thank you, I'm happy with that.`])
			] },
			{ out: 'voucher', msgs: [
				mk(`Hi {agent}, that batch came from a new mill and a couple have shrunk more than they should. Do whatever you think is fair and we'll split it with you.`, { wait: true }),
				a(`Thanks for measuring. {maker} agree it's shrunk more than it should, and I'd like to make up for it. I've put a {voucher} voucher on your account, code {vcode}.`),
				c([`Thank you, that's kind. I've had my eye on the {other} anyway.`, `That's lovely, thanks. I'll put it towards something for Christmas.`])
			] },
			{ out: 'refund', refund: 'main', msgs: [
				a(`Thank you. That's well beyond normal, so I'd like it back for {maker} to look at, and I'll refund you in full. A prepaid returns label is attached.`),
				c([`Posted it today.`, `It's in the post.`]),
				w(`Return in for {order}.`, { wait: true, art: 'returnFault' }),
				a(`Your {short} {has} arrived back with us, so ${refundLine}`)
			] },
			{ out: 'none', msgs: [
				c([`Actually, I've just checked with my partner, who did the wash, and it went in at 60 with the towels. So that may be our fault, not yours. Sorry!`, `I owe you an apology: my son put {them} in with his football kit on a hot wash. I've only just found out.`]),
				a(`Thanks for being honest about that. At that temperature linen will shrink like that, so I can't call it a fault, but I've passed on to {maker} that the care label is hard to read, which a few people have said.`),
				c([`Fair enough. Lesson learned.`, `Understood, thanks for being nice about it.`], { p: 0.7 })
			] }
		]
	},
	{
		id: 'knife', cat: 'damaged', weight: 1, goods: ['knife'], ago: [8, 20],
		subjects: ['Chipped knife', 'Knife blade damaged', 'Problem with my chef’s knife'],
		open: [
			`I've had the {short} about ten days and there's already a small chip in the edge, near the tip. I've only used it on a wooden board and I wash it by hand. For {price} I expected better.`,
			`The blade on my new {short} has a nick in it, and there are a few brown spots near the handle. Have I been sent a faulty one?`
		],
		reply: [
			`I'm sorry to hear that. {maker} make these from carbon steel, which takes a very sharp edge but needs a bit more care than stainless. Could you send a close-up photo of the edge, and tell me what it was cutting when you noticed? I'll show {makerp} at {maker}.`
		],
		mid: [c([`Photo attached. I noticed it after cutting up a butternut squash, which was hard going.`, `Here's a photo. I think it happened when I was taking a chicken apart.`], { art: 'photos' })],
		ends: [
			{ out: 'none', msgs: [
				mk(`Hi {agent}, from the photo that's a small roll in the edge, not a crack: the kind you get from twisting the blade in something hard. Not a fault in the steel. We'd happily regrind it for free, which takes about a week, and it'll come back sharper than new. The spots are surface rust and will polish off.`, { wait: true }),
				a(`{maker} say it's a small roll in the edge rather than a fault, and they'll regrind it for free. I've attached a prepaid label; it'll be back with you in about a week.`),
				c(`OK, that's a good offer. I'll send it.`),
				c([`The knife is back and it's sharper than when I bought it. Thank you.`, `Got it back today, looks brand new. Thanks.`], { wait: true })
			] },
			{ out: 'replace', msgs: [
				mk(`Hi {agent}, the chip runs into the blade rather than along the edge, which suggests a hard spot from the heat treatment. Please replace it and send the old one back to us so we can check the batch.`, { wait: true }),
				a(`{maker} think the steel may have a flaw, so I'm sending you a new {short} today, with a label for the old one.`),
				c([`New knife arrived. Thanks for dealing with it so well.`, `The new one's here and it's lovely. The old one went back yesterday.`])
			] },
			{ out: 'refund', refund: 'main', msgs: [
				c(`To be honest I'd rather have a stainless knife I don't have to worry about. Could I return it?`),
				a(`Of course. Send it back with the attached label, and I'll refund you in full when it arrives.`),
				a(`It's back with us, and ${refundLine}`, { wait: true })
			] }
		]
	},
	{
		id: 'mould', cat: 'damaged', weight: 2, goods: ['jar'], ago: [6, 30],
		subjects: ['Mould in jar', '{Short} gone off', 'Food quality complaint', 'Not very pleasant'],
		open: [
			`I opened the {short} this morning and there was mould on the top under the lid. The best-before date is next year and the seal popped when I opened it, so I don't think it was anything I did.`,
			`Not a very pleasant start to the day: the jar of {short} from my last order had a layer of mould when I opened it. I've kept the jar and the lid. Could you look into it?`
		],
		reply: [
			`I'm really sorry, that shouldn't happen. Could you send me a photo of the label with the batch code and best-before date? {maker} will want to check the rest of that batch straight away.`,
			`Oh no, I'm so sorry. Please don't eat any of it. Could you send a photo of the lid, where the batch code is printed? {maker} will want to know at once.`
		],
		mid: [
			c([`Photo attached. The code on the lid is {batch}.`, `Here you go. It says {batch} and best before {bestBefore}.`], { art: 'photos' }),
			mk(`Hi {agent}, thanks for this. We've opened six jars from batch {batch} and they're all fine, so it looks like a single jar where the seal didn't take. We'd like to cover it, of course.`, { wait: true, art: 'batch' })
		],
		ends: [
			{ out: 'refund', refund: 'price', msgs: [
				a(`{maker} have checked the batch and the rest is fine, so it looks like one bad jar. I've refunded {refund} for it to your card ending {card4}. Please throw it away.`),
				c([`Thanks for checking. Good to know it was just the one.`, `Thank you, that's reassuring.`], { p: 0.7 })
			] },
			{ out: 'replace', msgs: [
				a(`{maker} have checked the rest of the batch and it's fine, so it seems to be one jar. I've asked {wh} to send you a fresh jar from a different batch, free of charge.`),
				c([`Got the new jar. Lovely as ever.`, `New jar arrived yesterday, thanks.`])
			] },
			{ out: 'voucher', msgs: [
				a(`{maker} have checked the batch and only your jar seems affected. I've added a {voucher} voucher to your account, code {vcode}, to make up for it, which is a bit more than the jar cost.`),
				c([`Thanks, that's generous.`, `That's kind, thank you.`])
			] }
		]
	},
	{
		id: 'honey', cat: 'damaged', weight: 1, goods: ['honey'], ago: [20, 40],
		subjects: ['Honey gone hard', 'Has my honey gone off?', 'Problem with honey'],
		open: [
			`The honey I bought has gone solid and grainy in the jar. It was runny when it arrived. Has it gone off? It's only about a month old and I'd like a refund if it has.`,
			`Is the honey meant to look like this? It's turned cloudy and set hard, almost like sugar. I'm not sure whether it's safe to eat.`
		],
		reply: [
			`Thanks for asking before throwing it away! What you're describing is crystallisation. Raw honey like {maker}'s does it naturally, especially as the weather cools; it hasn't gone off and is perfectly safe to eat. If you stand the jar in warm, not boiling, water for twenty minutes, it'll turn runny.`
		],
		ends: [
			{ out: 'none', msgs: [c([`Oh, how interesting, I had no idea. The warm water worked a treat. Thank you, and please ignore my request for a refund!`, `Who knew! It's runny now. Sorry for the fuss and thanks for the tip.`]), a(closings, { p: 0.5 })] },
			{ out: 'voucher', msgs: [
				c(`I tried that and it worked, but to be honest I'd bought it as a present and it looked a bit sorry for itself. Is there anything you can do?`),
				a(`Of course. I've put a {voucher} voucher on your account, code {vcode}, so you can pick a fresh jar for your present.`),
				c(`Thank you, that's really kind.`, { p: 0.7 })
			] },
			{ out: 'refund', refund: 'price', msgs: [
				c(`I've tried the warm water and it's still grainy, and I just don't like it set. Could I have a refund?`),
				a(`I understand. It isn't a fault, but I don't want you stuck with honey you don't enjoy, so I've refunded {refund} for the jar to your card ending {card4}.`)
			] }
		]
	},
	{
		id: 'stale', cat: 'damaged', weight: 1, goods: ['coffee'], ago: [3, 10],
		subjects: ['Old coffee', 'Roast date', 'Coffee tastes stale'],
		open: [
			`The coffee I received has a roast date of {roast}, which is over two months ago, and it tastes flat. I thought you sold freshly roasted coffee?`,
			`Not sure if I'm being fussy, but the {short} taste{s} stale, and the bag says it was roasted on {roast}.`
		],
		reply: [`You're not being fussy at all. {maker} roast for us every week, so a bag that old shouldn't have left {wh}. Could you send a photo of the label? I'll find out how it happened.`],
		mid: [
			c(`Here's the label.`, { art: 'roast' }),
			w(`Hi {agent}, found it: a box of bags from that roast was put back on the shelf behind the new stock after a stock count. We've cleared the lot out.`, { wait: true })
		],
		ends: [
			{ out: 'replace', msgs: [
				a(`Thanks. {wh} found an old box that had been put back behind the new stock, and they've cleared it out. I've sent you a fresh bag, roasted this week, at no cost.`),
				c([`Fresh bag arrived and it's lovely. Thank you.`, `That's much more like it. Thanks!`], { wait: true })
			] },
			{ out: 'refund', refund: 'item', msgs: [
				a(`Thanks. {wh} found an old box behind the new stock and have cleared it out. ${refundLine}`),
				c(`Thanks. I'll give it another go next month.`, { p: 0.6 })
			] },
			{ out: 'open', msgs: [
				a(`Thank you. {maker} would like to send you a fresh bag straight from the roastery with their next roast on {by}, and I'll let you know when it's on its way.`),
				c(`Lovely, thank you.`, { p: 0.6 })
			] }
		]
	},
	{
		id: 'crushed', cat: 'damaged', weight: 1, goods: ['hamper'], ago: [2, 5],
		subjects: ['Gift box arrived crushed', 'Damaged gift', 'Presentation'],
		open: [
			`The {short} I sent my {relation} arrived with the lid crushed and the ribbon hanging off. The things inside seem fine, but you can't give someone a present looking like that.`,
			`I'm a bit upset: the {short} I'd bought for a friend's {occasion} turned up looking as if it had been sat on. Nothing inside is broken, as far as I can tell, but it looks awful.`
		],
		reply: [`I'm sorry. With a present, how it looks is half the point. Could you send a photo, so I can show {carrier} and {wh}?`],
		mid: [c(`Photo attached. It was in an outer box, but that's crushed too.`, { art: 'photos' })],
		ends: [
			{ out: 'voucher', msgs: [a(`Thank you. I've put a {voucher} voucher on your account, code {vcode}, and I'm posting you a fresh box and ribbon today so you can repack it.`), c(`That's thoughtful, thank you.`, { p: 0.7 })] },
			{ out: 'refund', refund: 'pct', pct: 15, msgs: [a(`Thanks for the photo. I've refunded {refund}, fifteen per cent of the price, to your card ending {card4}, as the contents are fine but the presentation isn't what you paid for.`), c(`OK, thanks.`, { p: 0.5 })] },
			{ out: 'replace', msgs: [a(`Thank you. I've sent a whole new {short} today by {service}. Give that one, and keep the contents of this one for yourself.`), c(`That's incredibly generous, thank you!`)] }
		]
	},
	{
		id: 'variant', cat: 'wrong', weight: 2, goods: ['ceramic', 'linen'], ago: [2, 7],
		subjects: ['Wrong colour', 'Not what I ordered', 'Order {order} mix-up'],
		open: [
			`I ordered the {short} in {colour}, but what came was {alt}. The packing slip says {colour}, so I think someone just picked the wrong one off the shelf.`,
			`Wrong colour, I'm afraid! The {short} in my parcel {is} {alt}, not the {colour} I chose.`
		],
		reply: [`Sorry about that, {first}. Let me check with {wh} what happened, and then I'll get the right one to you.`],
		mid: [w(`Hi {agent}, the two colours sit in neighbouring bins and the picker scanned the bin label instead of the item.`, { wait: true, art: 'pickWrong' })],
		ends: [
			{ out: 'replace', need: 'colour', msgs: [
				a(`Thanks for your patience. {wh} have found the mix-up, and I've sent you the {colour} {short} today by {service}. A returns label for the {alt} one is attached; there's no rush.`),
				c([`The right colour arrived, thanks, and I've sent the wrong one back.`, `All sorted: the {colour} came yesterday and the {alt} is on its way back to you.`], { wait: true })
			] },
			{ out: 'refund', refund: 'main', need: 'colour', msgs: [
				a(`Sorry for the wait. I've sent you the {colour} {short} today by {service}, with a returns label for the {alt} one.`),
				c(`The second parcel has come, and it's {alt} as well! I've checked the label on the box and it says {colour}. At this point I think I'd just like my money back.`, { wait: true }),
				w(`Hi {agent}, I'm sorry: the {colour} stock on the shelf turned out to have {alt} items inside the {colour} packaging. We've pulled the lot for checking.`, { wait: true }),
				a(`I'm really sorry. {wh} found that the stock itself was mixed up inside its packaging, so another swap could go the same way. ${refundLine} I've attached a label for both parcels.`)
			] },
			{ out: 'refund', refund: 'pct', pct: 25, need: 'colour', msgs: [
				c(`Actually, now I've had {them} out for a day, I quite like the {alt}. Is there any chance I could keep {them}?`),
				a(`Of course. As it was our mistake, I've refunded {refund}, a quarter of the price, so you can keep {them} with our apologies.`),
				c(`That's great, thanks!`, { p: 0.6 })
			] },
			{ out: 'refund', refund: 'main', need: 'colour', msgs: [
				c(`I needed {them} for my {relation}'s {occasion} on Saturday and I don't think a swap will arrive in time. Could I send {them} back for a refund instead?`),
				a(`I understand. I've attached a prepaid label, and ${refundLine} I haven't waited for {them} to come back.`)
			] },
			{ out: 'open', need: 'colour', msgs: [
				a(`{wh} are out of {colour} until {restock}. I've reserved one for you from the next delivery and will send it as soon as it lands; please keep the {alt} one until then.`),
				c(`OK, that's fine. I'll wait.`, { p: 0.7 })
			] }
		]
	},
	{
		id: 'missing', cat: 'wrong', weight: 3, goods: ['ceramic', 'jar', 'linen', 'tool', 'candle', 'tea', 'coffee'], multi: true, ago: [1, 5],
		subjects: ['Item missing', 'Something missing from my parcel', 'Incomplete order', 'Order {order}'],
		open: [
			`My parcel arrived on {delivered}, but the {short} {was}n't in it. Everything else was there, and the packing slip lists it.`,
			`The box came this morning with everything except the {short}. The slip inside has it ticked as packed, which is odd.`,
			`I've opened my order and I'm missing the {short}. I've been through all the packing paper and it isn't there.`,
			`Quick one: the {short} from order {order} didn't come. Is it on its way separately, or has it been left out?`
		],
		reply: [`Thanks for letting me know. Let me check with {wh} before anything else; I'll come back to you as soon as I hear.`, `Sorry about that. I'll check with {wh} what was packed and come back to you today if I can.`],
		ends: [
			{ out: 'none', msgs: [
				w(`Hi {agent}, the {short} went as a separate parcel; it was packed from the other end of the warehouse and collected the same afternoon, but it's been sitting at {depot}. {carrier} have it moving and expect to deliver by {eta}.`, { wait: true, art: 'pickSplit' }),
				a(`Good news: the {short} {was} sent as a separate parcel. It was held up at {depot}, but it's moving and should be with you by {eta}. Sorry we didn't make that clearer in your dispatch email.`),
				c([`It's just arrived, thank you! Panic over.`, `Second parcel came this morning. Thanks!`])
			] },
			{ out: 'replace', msgs: [
				w(`Hi {agent}, the pick list shows the {short} {was}n't scanned, so it was never packed. Sorry.`, { wait: true, art: 'pickShort' }),
				a(`{wh} confirm it was missed at packing. I've sent the {short} out today by {service}, and it should be with you by {eta}.`),
				c(`Arrived this morning, thanks.`, { p: 0.8 })
			] },
			{ out: 'refund', refund: 'item', msgs: [
				w(`Hi {agent}, the {short} {was}n't scanned at packing, and we've since sold the last one.`, { wait: true, art: 'pickShort' }),
				a(`{wh} confirm it was missed at packing, and we've now sold out. I've refunded {refund} for the {short} to your card ending {card4}. I'm sorry.`),
				c(`Ah well, thanks for sorting it.`, { p: 0.6 })
			] },
			{ out: 'none', msgs: [c([`Before you do anything: I've just found it! It was tucked inside the box the {short2} came in. Sorry to waste your time.`, `Please ignore my last message. My husband had unpacked it and put it away without telling me.`]), a(`No problem at all, I'm glad it turned up!`, { p: 0.7 })] }
		]
	},
	{
		id: 'hamper', cat: 'wrong', weight: 2, goods: ['hamper'], ago: [2, 6],
		subjects: ['Hamper missing items', 'Incomplete hamper', 'Gift order {order}'],
		open: [
			`I sent the {item} to my {relation} and they say there was no {missingName} in it, even though it's listed on the website. It's a bit embarrassing; they sent me a photo and it looks rather bare.`,
			`My {relation} received the {short} I ordered yesterday and was thrilled, but mentioned there wasn't any {missingName}. I'd checked the description before I bought it.`
		],
		reply: [`I'm so sorry; a hamper should never arrive short. Could you forward me the photo, so I can see what was in it? I'll check with {wh}, who pack them by hand.`],
		mid: [
			c(`Here's the photo they sent me.`, { art: 'photos' }),
			w(`Hi {agent}, we ran out of the {missingName} part-way through the afternoon this one was packed, and the packer should have held it back. Sorry.`, { wait: true })
		],
		ends: [
			{ out: 'replace', msgs: [a(`{wh} ran short of the {missingName} that afternoon. I've sent it straight to your {relation} today, with a note from us explaining.`), c(`They got it, and loved the note. Thanks.`, { wait: true })] },
			{ out: 'refund', refund: 'missing', msgs: [
				c(`Could you just refund the difference? I don't want to make a fuss with them.`),
				a(`Of course. I've refunded {refund}, the value of the {missingName}, to your card ending {card4}.`)
			] },
			{ out: 'voucher', msgs: [a(`{wh} ran short that day. As well as sending the {missingName} on, I've put a {voucher} voucher on your account, code {vcode}, for the trouble.`), c(`That's very kind, thank you.`)] }
		]
	},
	{
		id: 'size', cat: 'wrong', weight: 1, goods: ['linen'], only: ['tablecloth'], ago: [4, 15],
		subjects: ['Tablecloth too small', 'Wrong size', 'Measurements'],
		open: [`The tablecloth I ordered was listed as 150 × 250 cm, but it measures 150 × 220. It doesn't reach the ends of our table. Have I been sent the wrong one?`],
		reply: [`Thanks for measuring it. Let me check the listing and the stock with {wh}.`],
		mid: [w(`Hi {agent}, I've measured three from the shelf and they're all 150 × 220, though the label says 150 × 250. So it's the batch, not the picker.`, { wait: true, art: 'listing' }), n(`Listing changed to 150 × 220 until {maker} confirm.`, { p: 0.7 })],
		ends: [
			{ out: 'refund', refund: 'main', msgs: [
				a(`You're right: that batch came out shorter than listed. I've attached a prepaid label, and I'll refund you as soon as it's on its way back.`),
				c(`Dropped it off this morning.`),
				a(`Thanks. {retService} have scanned your return, so ${refundLine}`)
			] },
			{ out: 'refund', refund: 'pct', pct: 20, msgs: [c(`It does fit our kitchen table, actually. Could I keep it for a bit less?`), a(`Of course. I've refunded {refund}, twenty per cent of the price, to your card ending {card4}.`)] },
			{ out: 'open', msgs: [a(`{maker} are cutting new ones at the right length, due in {restock}. I'll send you one as soon as they arrive; keep this one until then.`), c(`That's fine, thanks.`, { p: 0.6 })] }
		]
	},
	{
		id: 'engraving', cat: 'wrong', weight: 1, goods: ['engraved'], ago: [1, 4],
		subjects: ['Engraving wrong', 'Spelling on serving board', 'Urgent: wedding present'],
		open: [`The serving board has arrived and the engraving says "{engraved}". I asked for "{asked}". It's a wedding present for Saturday!`],
		reply: [`Oh no. Let me check exactly what was typed on the order, and I'll come straight back to you.`],
		ends: [
			{ out: 'replace', msgs: [n(`Order note says "{asked}". Engraver's slip.`), a(`It was our mistake: the order says "{asked}". {maker} are making a new one today and I'll send it by express, so it's with you by Friday.`), c(`It arrived Friday morning and it's perfect. Phew.`, { wait: true })] },
			{ out: 'refund', refund: 'all', msgs: [n(`Order note says "{asked}". Engraver's slip; can't be remade in time.`), a(`It was our mistake. A new one can't be ready before Saturday, so ${refundLine} Please keep the board.`), c(`Thank you, that's a kind way to deal with it.`, { p: 0.7 })] },
			{ out: 'none', msgs: [
				n(`Order note says "{engraved}", exactly as engraved.`),
				a(`I've checked, and the engraving matches what was typed at checkout, letter for letter. I'm sorry, I know that's not what you wanted to hear. {maker} can make a new one at cost, {atCost}, by Friday if that helps.`),
				c(`Oh no, you're right, that's my typo. Yes please, I'll take you up on that.`)
			] }
		]
	},
	{
		id: 'safe', cat: 'lost', weight: 3, goods: ['ceramic', 'linen', 'tool', 'candle', 'coffee', 'tea', 'hamper', 'jar'], ago: [1, 4],
		subjects: ['Parcel not received', 'Says delivered but nothing here', 'Where is my order?', 'Order {order} not arrived'],
		open: [
			`The tracking says my parcel was delivered on {delivered}, but nothing has turned up. I've checked with the neighbours on both sides and looked round the back. Can you help?`,
			`I've had an email saying my parcel was delivered at lunchtime, but I was in all day and nobody came to the door. Could you find out where it went?`,
			`{carrier} say order {order} was delivered and left in a safe place, but I've no idea where that would be. There's nothing here.`
		],
		reply: [`I'm sorry, that's frustrating. Below is what {carrier} have for it. Does the place it mentions mean anything to you? If not, I'll open a claim with {carrier}; they ask us to wait two working days in case it turns up, which parcels often do.`, `Sorry to hear that. I've pasted {carrier}'s tracking below. Do you recognise where they say they left it? If it doesn't turn up in two working days, I'll open a claim with them.`],
		replyArt: 'safe',
		mid: [
			n(`{carrier}'s proof of delivery:`, { art: 'proof', p: 0.7 }),
			c([`I don't recognise that at all, and nobody here took it in.`, `No, nothing like that here. I've checked the bins and asked next door.`, `That doesn't match anywhere at our house, I'm afraid.`])
		],
		ends: [
			{ out: 'none', msgs: [c([`Mystery solved: a neighbour three doors down had taken it in and only just got back from holiday. Sorry for the bother!`, `Found it! It was behind the planter by the front step, which I'd walked past several times.`]), a(closings, { p: 0.5 })] },
			{ out: 'replace', msgs: [a(`I've opened a claim with {carrier}, but I don't want you waiting on them, so I've sent your order out from {wh} today by {service}.`), c(`The new parcel arrived, thank you.`, { wait: true })] },
			{ out: 'refund', refund: 'all', msgs: [c(`I needed it for this weekend, so I'd rather just have a refund and buy something locally.`), a(`I completely understand. ${refundLine} I'll deal with {carrier}; you don't need to do anything else.`)] },
			{ out: 'open', msgs: [
				a(`I've opened a claim with {carrier}. They give themselves until {soon}. If it hasn't turned up by then, I'll send a replacement or refund you, whichever you'd prefer.`),
				c(`OK, thanks. Fingers crossed it turns up.`, { p: 0.7 })
			] }
		]
	},
	{
		id: 'stuck', cat: 'lost', weight: 2, goods: ['ceramic', 'linen', 'tool', 'candle', 'coffee', 'jar', 'electric', 'bottle'], undelivered: true, ago: [7, 12],
		subjects: ['Parcel stuck', 'Tracking not moving', 'Is my order lost?', 'Still waiting for order {order}'],
		open: [
			`My order hasn't moved for over a week. The tracking just says it's at {depot}. Is it lost?`,
			`Where is my parcel? It was meant to arrive days ago, and the tracking hasn't changed since {stuckDay}.`
		],
		reply: [`Sorry about this. I can see it's been sitting at {depot} since {stuckDay}, as below. I've asked {carrier} to look for it and will come back to you by {by}.`, `I'm sorry it's taking so long. The tracking below shows it hasn't left {depot} since {stuckDay}. I've asked {carrier} to find it and will update you by {by}.`],
		replyArt: 'stuck',
		mid: [c(chasers, { p: 0.5, wait: true })],
		ends: [
			{ out: 'none', msgs: [c([`It's just turned up! The box is a bit battered but everything's fine. Thanks anyway.`, `Good news, it arrived this morning. No need to do anything.`]), a(`Oh, that's a relief. Enjoy it, and sorry for the wait.`, { p: 0.6 })] },
			{ out: 'replace', msgs: [a(`{carrier} can't find it in the depot, so I've sent your order out from {wh} today by {service}. If the first one ever arrives, please let me know.`, { wait: true }), c(`The new one arrived. Thanks.`, { wait: true })] },
			{ out: 'refund', refund: 'all', msgs: [c(`Honestly, I'd rather just have my money back at this point.`), a(`Of course. ${refundLine}`)] },
			{ out: 'refund', refund: 'all', msgs: [
				a(`{carrier} can't find it, so I've sent your order out from {wh} today by {service}, and I'll keep chasing the first one.`, { wait: true }),
				c(`The tracking for the new parcel has been stuck at {depot} for four days now too. Is there something wrong with that depot? I'd rather just have a refund at this point.`, { wait: true }),
				a(`I'm so sorry; two parcels stuck in one place is very unusual, and I've raised it with {carrier}'s account manager. I've stopped both parcels, and ${refundLine} If either one does reach you, please tell me and I'll send a returns label.`)
			] },
			{ out: 'open', msgs: [a(`{carrier} have opened an investigation and promise an answer by {soon}. If they haven't found it by then, I'll replace it or refund you; just let me know which you'd prefer.`, { wait: true }), c(`A replacement would be best if it comes to that.`)] }
		]
	},
	{
		id: 'late', cat: 'lost', weight: 2, goods: ['ceramic', 'linen', 'candle', 'hamper', 'tool', 'tea'], express: true, ago: [1, 3],
		subjects: ['Express delivery late', 'Paid for next day', 'Late delivery', 'Missed the {occasion}'],
		open: [
			`I paid {express} for express delivery so my order would arrive for my {relation}'s {occasion}. It came on {delivered}, after the {occasion} had been and gone. I'd like the delivery charge back at least.`,
			`Express delivery isn't much use when it arrives after the event. I ordered on {placed} for the {occasion}, paid extra for speed, and it turned up on {delivered}.`
		],
		reply: [`I'm sorry, I can see how disappointing that is. Let me look at the tracking and the order, and I'll come back to you today.`],
		ends: [
			{ out: 'refund', refund: 'ship', msgs: [
				a(`It left {wh} on time but missed a connection at {depot}, so you didn't get the service you paid for. I've refunded the {express} delivery charge to your card ending {card4}.`, { art: 'late' }),
				c(`Thank you, that's fair.`, { p: 0.7 })
			] },
			{ out: 'voucher', msgs: [
				a(`It was held up at {depot}. I'm sorry it spoiled the surprise. I've put a {voucher} voucher on your account, code {vcode}, for next time.`, { art: 'late' }),
				c(`Thanks, I appreciate that.`, { p: 0.7 })
			] },
			{ out: 'none', msgs: [
				n(`Order placed {placed} at {placedTime}, after the 14:00 cut-off for express, so it went out the next working day. Arrived on the day {carrier} promised from then.`),
				a(`I've looked into it, and your order came in at {placedTime}, after our 14:00 cut-off for express, so it went out the next working day and arrived when {carrier} said it would. I know that's not what you hoped to hear. The cut-off is shown at checkout, but I've passed on that it could be clearer.`),
				c([`I see. I didn't spot that. Fair enough.`, `Oh. I suppose that's that, then.`])
			] }
		]
	},
	{
		id: 'address', cat: 'lost', weight: 1, goods: ['ceramic', 'linen', 'tool', 'candle', 'jar', 'coffee'], undelivered: true, ago: [9, 14],
		subjects: ['Order never arrived', 'Still waiting', 'Where is order {order}?'],
		open: [`My order never came. It's been nearly two weeks now and I'm starting to wonder whether it was sent at all.`, `I ordered on {placed} and nothing has arrived. Could you check what's happened?`],
		reply: [`Sorry about that. I've looked it up: {carrier} tried to deliver it on {delivered} but couldn't find the address, and it's on its way back to {wh}. The address on the order is {badAddr}. Is that right?`],
		replyArt: 'returned',
		mid: [
			c([`Oh no. It should be {goodAddr}. I must have typed it wrong.`, `That's not quite right: it's {goodAddr}. My fault, I think.`])
		],
		ends: [
			{ out: 'replace', msgs: [
				a(`No harm done. Once it's back with {wh}, I'll send it to the right address at no extra charge, and I've corrected the address on your account.`),
				a(`It's back, and on its way to you by {service}.`, { wait: true }),
				c(`Arrived! Thank you for not charging me for my own typo.`, { wait: true })
			] },
			{ out: 'refund', refund: 'goods', msgs: [
				c(`Could I have a refund instead? I've since bought one locally.`),
				a(`Of course. As the address was mistyped, I've refunded the goods, {refund}, but not the {ship} delivery, which {carrier} have charged us for both ways. I hope that's understandable.`),
				c(`That's fair. Thanks.`, { p: 0.6 })
			] },
			{ out: 'open', msgs: [a(`{carrier} say it'll be back with {wh} by {soon}. As soon as it lands I'll send it to the right address, at no extra charge.`), c(`Thanks so much.`, { p: 0.6 })] }
		]
	},
	{
		id: 'customs', cat: 'other', weight: 1, goods: ['ceramic', 'linen', 'tool', 'electric', 'hamper'], regions: ['ch'], undelivered: true, ago: [5, 9],
		subjects: ['Import charges', 'Unexpected fees', 'Why do I have to pay to receive my order?'],
		open: [
			`{carrier} want {duty} in import charges before they'll deliver my parcel. Nobody told me there would be extra charges when I ordered, and I don't want to pay that on top.`,
			`I've had a card through the door saying I owe {duty} in duty and fees for my order from you. That's a lot on top of what I paid.`
		],
		reply: [`I'm sorry for the surprise. Orders to {country} leave the EU at the border, so {carrier} collect import VAT and a handling fee on delivery. The checkout should have said so clearly, and I'll find out why it didn't stand out. If you'd rather not pay, you can refuse the parcel and it will come back to us.`],
		ends: [
			{ out: 'refund', refund: 'all', msgs: [...refuse, w(`Hi {agent}, the parcel for {order} is back with us, unopened.`, { wait: true }), a(`Your parcel has come back to {wh}, so I've refunded the whole order, {refund}, to your card ending {card4}.`)] },
			{ out: 'refund', refund: 'lessfee', msgs: [...refuse, w(`Hi {agent}, the parcel for {order} is back with us, unopened. {carrier} charged {retfee} for the return.`, { wait: true }), a(`Your parcel is back with {wh}. I've refunded {refund}, which is the order less the {retfee} {carrier} charged us to bring it back, as our delivery terms for {country} set out.`), c(`Not ideal, but I understand.`, { p: 0.6 })] },
			{ out: 'open', msgs: [...refuse, a(`{carrier} say the parcel is on its way back to {wh}, which can take two weeks from {country}. I'll refund you as soon as it arrives.`, { wait: true })] },
			{ out: 'none', msgs: [c(`Thanks for explaining. I've decided to pay it, as I do want the things. But please make the charges clearer for the next person.`), a(`That's fair, and I've passed it on to the web team. Enjoy your order.`)] }
		]
	},
	{
		id: 'change', cat: 'unwanted', weight: 3, goods: ['ceramic', 'linen', 'tool', 'candle', 'electric'], ago: [5, 22],
		subjects: ['Return', 'How do I send something back?', 'Returning part of order {order}', 'Change of mind'],
		open: [
			`I'd like to return the {short} from order {order}. {They} {is} lovely, but {they} really {does} not go with our kitchen. Unused and still in the packaging. How do I go about it?`,
			`The {short} arrived yesterday and {they} {is} beautifully made, but my partner had already bought {one2} for the house without telling me. Can I return {them}?`,
			`Can I send back the {short}? It was a bit of an impulse buy and I've changed my mind. Sorry!`,
			`Having seen the {short} in real life, {they} {is} bigger than I expected and there's nowhere to put {them}. Could I return {them}?`
		],
		reply: [`Of course. You have thirty days from delivery to return anything unused. Please pack it securely and send it to:\n\n{retAddr}\n\nwith a note of your order number. Return postage is yours to pay, and I'd suggest a tracked service. I'll refund you as soon as it arrives.`],
		mid: [c([`Sent it today by {retService}, tracking number {retTrack}.`, `It's in the post, tracked: {retTrack}.`])],
		ends: [
			{ out: 'refund', refund: 'item', msgs: [w(`Return in for {order}.`, { wait: true, art: 'returnOk' }), a(`Your return has arrived and I've refunded {refund} for the {short} to your card ending {card4}.`), c(thanks, { p: 0.5 })] },
			{ out: 'refund', refund: 'all', ago: [3, 6], msgs: [w(`Return in for {order}, whole order.`, { wait: true, art: 'returnOk' }), a(`Your return has arrived. As it's the whole order, back within fourteen days, I've included the original delivery charge, so ${refundLine}`)] },
			{ out: 'none', msgs: [c(`Actually, scrap that: my sister has fallen in love with it, so I'm giving it to her instead. Sorry for the trouble!`), a(`No trouble at all. I hope she enjoys it!`)] },
			{ out: 'open', msgs: [a(`Thanks for letting me know. I'll refund you as soon as it reaches {wh}.`)] },
			{ out: 'none', msgs: [
				w(`Return in for {order}, but it's been used and can't go back on the shelf.`, { wait: true, art: 'returnUsed' }),
				a(`I'm sorry, but {wh} tell me the {short} {has} been used, so I can't accept it as a return under our policy. I'll post it back to you free of charge.`),
				c(`Fine. Not what I'd hoped, but fine.`, { p: 0.7 })
			] }
		]
	},
	{
		id: 'gift', cat: 'unwanted', weight: 1, goods: ['ceramic', 'linen', 'candle', 'tool'], ago: [8, 20],
		subjects: ['Returning a present', 'Gift return', 'Exchange?'],
		open: [`I was given the {short} as a present, ordered from you by {giver}. {They} {is} lovely, but I already have {one2}. Could I exchange or return {them}? I'd rather {giver} didn't know, if possible!`],
		reply: [`Thank you for getting in touch, and we can do that quietly. Refunds go back to the card that paid, so the usual option for a present is a voucher for the full value instead. Would that suit you?`],
		ends: [
			{ out: 'voucher', pre: (k) => (k.s.voucher = money(k.region, k.main.unit * k.main.qty)), msgs: [
				c(`A voucher would be perfect.`),
				a(`Lovely. Please send {them} to:\n\n{retAddr}\n\nand I'll email you a voucher as soon as {they} arrive{s}.`),
				a(`{They} arrived back today, so I've emailed you a voucher for {voucher}, code {vcode}.`, { wait: true })
			] },
			{ out: 'refund', refund: 'item', msgs: [c(`Actually, {giver} found out and says just to refund her card; she'd rather that.`), a(`No problem. Once it's back I'll refund the card that paid.`), a(`It's arrived, so I've refunded {refund} to the card that paid, ending {card4}.`, { wait: true })] },
			{ out: 'open', msgs: [c(`A voucher would be perfect.`), a(`Lovely. Please post {them} to:\n\n{retAddr}\n\nand I'll email you a voucher for the full value as soon as {they} arrive{s}.`)] }
		]
	},
	{
		id: 'food', cat: 'unwanted', weight: 1, goods: ['coffee', 'tea', 'jar'], ago: [2, 8],
		subjects: ['Return food item', 'Ordered the wrong thing', 'Can I send this back?'],
		open: [`I've realised I ordered the wrong {short}. It's still sealed. Can I send it back for a refund?`, `Is it possible to return the {short}? It's unopened, but it turns out I can't have it on my new diet.`],
		reply: [`I'm sorry, but we can't take food back unless it's faulty, for hygiene reasons: once it's left us we can't be sure how it's been stored. It's in our returns policy, though I know that's not much comfort.`],
		ends: [
			{ out: 'none', msgs: [c(`That makes sense. I'll give it to a friend.`), a(`That sounds like a good home for it.`, { p: 0.5 })] },
			{ out: 'voucher', msgs: [c(`That's a shame, it wasn't cheap.`), a(`I understand. I can't refund it, but as a one-off I've put a {voucher} voucher on your account, code {vcode}.`), c(`Thank you, that's kind.`, { p: 0.6 })] },
			{ out: 'refund', refund: 'price', msgs: [n(`{lead} OK'd an exception: regular customer, sealed, only a few days.`), a(`I've had a word with my team lead and we'll make an exception this time, as it's sealed and you've only had it a few days. Keep it or give it away; I've refunded {refund} to your card ending {card4}.`)] }
		]
	},
	{
		id: 'retlost', cat: 'unwanted', weight: 1, goods: ['ceramic', 'linen', 'tool', 'candle'], ago: [24, 36],
		subjects: ['Refund for my return?', 'Return not processed', 'Did you get my return?'],
		open: [`I sent back the {short} nearly three weeks ago and I haven't had a refund. Have you received it?`, `I returned part of order {order} on {posted} and still haven't heard anything. Could you check?`],
		reply: [`Let me check. I can't see a return for {order} at {wh} yet. Do you have the tracking number or the receipt from when you posted it?`],
		mid: [c(`Here's the receipt.`, { art: 'receipt' })],
		ends: [
			{ out: 'refund', refund: 'item', msgs: [a(`Thanks. {retService} show it delivered to our returns address, so it's somewhere in our building. I've refunded {refund} now rather than keep you waiting while we look for it.`)] },
			{ out: 'open', msgs: [a(`The tracking stops at the sorting office, so I've asked {retService} to trace it. They take up to ten working days. If it hasn't turned up by {soon}, I'll refund you on the strength of your receipt.`), c(`OK, thank you.`, { p: 0.6 })] },
			{ out: 'refund', refund: 'item', msgs: [w(`Hi {agent}, found it: it had been booked in against the wrong order. Fine to refund.`, { wait: true }), a(`Found it! It had been booked in against another order. I've refunded {refund} to your card ending {card4}. Sorry for the wait.`)] }
		]
	},
	{
		id: 'retbroken', cat: 'unwanted', weight: 1, goods: ['ceramic'], ago: [12, 25],
		subjects: ['Return refund reduced', 'Partial refund on my return?', 'Complaint about return'],
		open: [`I returned the {short} last week as I'd changed my mind, and today I got an email saying it arrived broken and you won't refund the full amount. It was fine when I posted it!`],
		reply: [`I'm sorry for the upset. Let me look at what {wh} found.`],
		mid: [n(`What {wh} logged:`, { art: 'returnBroken' }), c(`I didn't have a box that size, so I wrapped it in a jumper inside the envelope. I thought that would be enough.`)],
		ends: [
			{ out: 'refund', refund: 'pct', pct: 50, msgs: [a(`I can see you did your best to protect it. As the return label didn't say how to pack it, I've refunded {refund}, half the price, which I hope is fair.`), c(`It's better than nothing. Thanks.`, { p: 0.6 })] },
			{ out: 'none', msgs: [a(`I'm sorry, but as it was broken on the way back to us I can't refund it. I can post the pieces back if you'd like them for a claim with {retService}.`), c(`No, don't bother. I'll take it up with them.`)] },
			{ out: 'voucher', msgs: [a(`I'm sorry this happened. I can't refund a return that arrived broken, but I've put a {voucher} voucher on your account, code {vcode}, as a gesture.`), c(`OK, thanks.`, { p: 0.6 })] }
		]
	},
	{
		id: 'code', cat: 'pricing', weight: 2, goods: ['ceramic', 'linen', 'tool', 'candle', 'hamper', 'coffee'], ago: [1, 6],
		subjects: ['Discount code not applied', 'Charged full price', 'Code {code}', 'Overcharged'],
		open: [
			`I used the code {code} at checkout, but my order confirmation shows I've been charged full price. Could you take the discount off?`,
			`Your newsletter code {code} didn't come off order {order}. I definitely typed it in, because I remember the box going green.`,
			`I think I've been overcharged on my last order. It came to {total}, which seems a lot for what it was.`
		],
		reply: [`Let me look at the order for you.`, `Thanks, {first}, I'll check the order log and come back to you.`],
		ends: [
			{ out: 'refund', refund: 'diff', msgs: [a(`I can see the code was entered, but the basket didn't refresh before you paid, so it never came off. I've refunded {refund}, the {codePct} per cent, to your card ending {card4}.`, { art: 'checkout' }), c(thanks, { p: 0.6 })] },
			{ out: 'none', msgs: [a(`I'm sorry, {code} ended on {codeEnd}, before you placed the order, so it wasn't valid any more. I know that's annoying.`), c([`Oh, I missed that. Never mind.`, `Fair enough, my mistake.`])] },
			{ out: 'none', msgs: [a(`I've checked, and the code doesn't apply to things that are already reduced in the autumn sale, which is what you bought. It says so under the code box, but in small print, I admit.`), c(`OK, fair enough.`, { p: 0.7 })] },
			{ out: 'voucher', msgs: [a(`The code had expired by the time you ordered, I'm afraid, but as you're a regular I've put a {voucher} voucher on your account, code {vcode}, instead.`), c(`That's nice of you, thanks.`, { p: 0.6 })] }
		]
	},
	{
		id: 'drop', cat: 'pricing', weight: 1, goods: ['ceramic', 'linen', 'tool', 'electric'], ago: [3, 13],
		subjects: ['Price went down', 'Sale price', 'Can I have the difference?'],
		open: [`I bought the {short} on {placed} for {price}, and now it's {newPrice} in your autumn sale. Can I have the difference back?`],
		reply: [`Thanks for asking. We do match our own sale prices for seven days after an order. Let me check the dates.`],
		ends: [
			{ out: 'refund', refund: 'drop', msgs: [a(`You ordered within seven days of the sale starting, so I've refunded the difference, {refund}, to your card ending {card4}.`), c(`Brilliant, thank you!`, { p: 0.7 })] },
			{ out: 'none', msgs: [a(`I'm sorry: your order was more than seven days before the sale started, so it's outside our price promise.`), c(`Ah well, it was worth asking.`)] },
			{ out: 'voucher', msgs: [a(`Your order was just outside our seven days, I'm afraid, but it's close enough that I've put a {voucher} voucher on your account, code {vcode}.`), c(`Thank you, that's fair.`, { p: 0.6 })] }
		]
	},
	{
		id: 'offer', cat: 'pricing', weight: 1, goods: ['jar'], qty: 3, ago: [2, 8],
		subjects: ['3 for 2 not applied', 'Jam offer', 'Overcharged for preserves'],
		open: [`Your website says 3 for 2 on jams and preserves, but I bought three jars of {short} and was charged for all three.`],
		reply: [`Thanks for flagging it. Let me check the order and the offer dates.`],
		ends: [
			{ out: 'refund', refund: 'price', msgs: [a(`You're right: the offer didn't come off at checkout. I've refunded {refund}, the price of one jar, to your card ending {card4}.`), c(thanks, { p: 0.6 })] },
			{ out: 'none', msgs: [a(`The offer started on {offerStart}, the day after your order, so it didn't apply to it, I'm afraid.`), c(`Typical! OK, thanks for checking.`)] },
			{ out: 'voucher', msgs: [a(`The offer started the day after you ordered, so it didn't apply, but I've put a {voucher} voucher on your account, code {vcode}, so you're not out of pocket.`), c(`That's very fair. Thanks!`, { p: 0.6 })] }
		]
	},
	{
		id: 'cancel', cat: 'other', weight: 2, goods: ['ceramic', 'linen', 'tool', 'candle', 'electric', 'hamper'], ago: [1, 4],
		subjects: ['Cancelled but sent anyway', 'Cancellation', 'Order {order} should have been cancelled'],
		open: [`I cancelled order {order} the morning after placing it, but it's been sent anyway and I've been charged {total}. I emailed to cancel at {cancelTime} on {cancelDay}.`, `Why has my order been sent? I emailed on {cancelDay} at {cancelTime} to cancel it, well before it went out.`],
		reply: [`I'm sorry. I can see your email, but {wh} had already packed the order by the time it reached us:`],
		mid: [n(`Cancellation email came in at {cancelTime} on {cancelDay}; the order was packed at {packedTime} and collected that afternoon.`, { art: 'pick' })],
		ends: [
			{ out: 'refund', refund: 'all', msgs: [
				a(`If you send it back unopened, I'll refund everything, delivery included. A prepaid label is attached.`),
				c(`Posted it back this morning.`),
				a(`It's back with us, so ${refundLine}`, { wait: true })
			] },
			{ out: 'none', msgs: [a(`If you'd still like to return it, I'll send a prepaid label and refund everything once it's back.`), c(`Oh well, now that it's here I'll keep it. It was more that I'd ordered without asking my partner!`), a(`Ha, I hope it wins them over. Enjoy it!`, { p: 0.7 })] },
			{ out: 'open', msgs: [a(`If you send it back unopened, I'll refund everything, delivery included, as soon as it's back with {wh}. A prepaid label is attached.`), c(`OK, I'll post it tomorrow.`, { p: 0.7 })] }
		]
	},
	{
		id: 'hold', cat: 'other', weight: 1, goods: ['ceramic', 'linen', 'tool', 'candle'], multi: true, hold: true, ago: [3, 8],
		subjects: ['Still charged for out-of-stock item', 'Bank shows full amount', 'Refund for item not sent'],
		open: [`The {short} in my order {was} out of stock and you said it wouldn't be sent, but my bank still shows the full {authorisedAmt}. When do I get the money back for it?`, `I was told the {short} {was}n't available and the rest of my order would come without it. The rest has arrived, but I can't see any money back for the {short}. Could you check?`],
		reply: [`Thanks for asking. When you order, your bank holds the full amount, and we only take payment for what we send, when it ships. So for anything we don't send, the hold should simply drop off, usually within seven days. Could you tell me what your banking app shows? That'll tell us whether there's anything to refund.`],
		mid: [c([`This is what my banking app shows:`, `Here's a copy of the last few lines:`], { art: 'statement' })],
		ends: [
			{ out: 'none', msgs: [
				a(`Thanks, that's helpful. The first line is the hold for the whole order, {authorisedAmt}, from the day you ordered. The second is the payment we actually took when the parcel left {wh}, {capturedAmt}, which doesn't include the {short}. The hold will disappear on its own, so you won't pay for the {short} at all.`),
				c([`It's gone from my statement this morning. Thanks for explaining!`, `My bank says the same. I didn't know that's how it worked. Thanks.`], { wait: true })
			] },
			{ out: 'refund', refund: 'item', pre: (k) => (k.captured = k.authorised), msgs: [
				n(`Checked: {wh} marked the {short} out of stock after payment had been taken for the whole order.`),
				a(`Thank you, and I owe you an apology. {wh} only marked the {short} out of stock after the payment for your order had been taken, so you were charged for it after all. I've refunded {refund} to your card ending {card4}.`),
				c(`Thanks for looking properly.`, { p: 0.6 })
			] }
		]
	},
	{
		id: 'unknown', cat: 'other', weight: 1, goods: ['ceramic', 'linen', 'tool', 'electric', 'hamper'], ago: [1, 3],
		subjects: ['Payment I don’t recognise', 'Unknown charge', 'FERNHILL MKT on my statement'],
		open: [`There's a payment on my card to FERNHILL MKT for {total} that I don't recognise. I haven't ordered anything from you. Please explain.`],
		reply: [`I'm sorry for the worry. I can see order {order}, placed on {placed} for delivery to {otherTown}, in the name {orderName}. Does that mean anything to you? If not, I'll stop what I can and we'll sort out a refund.`],
		ends: [
			{ out: 'none', msgs: [c(`How embarrassing: it was my partner ordering a surprise for my birthday. Please ignore me, and don't tell them I spoiled it!`), a(`Your secret's safe with me. Happy early birthday!`)] },
			{ out: 'refund', refund: 'all', msgs: [c(`No, I don't know that name or address at all.`), n(`Delivery to a parcel locker; account opened the same day. Account closed; customer is talking to their bank.`), a(`Thank you. ${refundLine} I've closed the account the order came from. Please let your bank know as well.`)] },
			{ out: 'open', msgs: [c(`No, I've never heard of them.`), a(`Thank you. I've asked {carrier} to stop the parcel. As soon as it's back with us, I'll refund you in full. Please let your bank know too.`)] }
		]
	},
	{
		id: 'allergen', cat: 'other', weight: 1, goods: ['chocolate'], ago: [3, 12],
		subjects: ['Allergy warning missing', 'Nut allergy', 'Labelling'],
		open: [`My son has a nut allergy, and I checked the label on the {short} before giving him some. It doesn't mention nuts, but the small print on the maker's website says it's made where hazelnuts are handled. He's fine, luckily, but this needs fixing.`],
		reply: [`Thank you for telling us, and I'm so glad he's all right. I've taken the {short} off sale while I check with {maker}.`],
		mid: [mk(`Hi {agent}, the customer is right: our new labels dropped the "may contain" line by mistake. We've reprinted, and we're relabelling all your stock this week.`, { wait: true })],
		ends: [
			{ out: 'refund', refund: 'item', msgs: [a(`{maker} have confirmed the label left out the warning, and new labels are on the way. I've refunded {refund} for the {short} to your card ending {card4}.`), c(`Thank you for taking it seriously.`, { p: 0.7 })] },
			{ out: 'refund', refund: 'all', msgs: [c(`I'd rather send the whole order back, to be honest; I'm a bit shaken.`), a(`I completely understand. I've refunded the whole order, {refund}, to your card ending {card4}, and you don't need to send anything back.`)] },
			{ out: 'open', msgs: [a(`{maker} have confirmed it. I've asked {wh} to send you a correctly labelled one as soon as the new labels arrive, on {by}, at no cost.`), c(`Thank you.`, { p: 0.6 })] }
		]
	},
	{
		id: 'club', cat: 'other', weight: 1, goods: ['club'], ago: [1, 3],
		subjects: ['Coffee Club after cancelling', 'Subscription', 'Cancelled but box still came'],
		open: [`I cancelled my Coffee Club subscription on {cancelDay}, but another box has arrived and I've been charged {price}.`, `Why have I had another Coffee Club box? I cancelled on {cancelDay}, and I've been charged for it.`],
		reply: [`Let me look at your subscription.`, `Sorry about the confusion. I'll check your subscription and come back to you.`],
		mid: [n(`Subscription panel:`, { art: 'club' })],
		ends: [
			{ out: 'refund', refund: 'all', msgs: [a(`Your cancellation came in before the cut-off, so this box shouldn't have been sent, but it had already been packed. ${refundLine} Please enjoy the coffee.`), c(`Oh, lovely. Thank you!`, { p: 0.6 })] },
			{ out: 'none', msgs: [a(`Your cancellation came in on {cancelDay}, after the cut-off five days before each box is sent, so this month's box had already gone. Your subscription has ended now and there won't be any more boxes.`), c(`I see. I'll enjoy this one, then.`)] },
			{ out: 'voucher', msgs: [a(`Your cancellation came in just after the cut-off, so this box had already gone. As it was so close, I've put a {voucher} voucher on your account, code {vcode}.`), c(`Thanks, that's kind.`, { p: 0.6 })] }
		]
	},
	{
		id: 'recall', cat: 'other', weight: 1, goods: ['ceramic'], only: ['jug'], ago: [60, 100],
		subjects: ['Celadon jug recall', 'Re: An important note about your Celadon jug', 'Jug recall'],
		open: [`I got your email about the Celadon jugs. Mine was bought in the summer and has a stamp on the bottom. What should I do?`],
		reply: [`Thanks for checking. Please stop using it for now. Hartcliffe found that handles from one batch can crack when the jug is full of hot liquid. Could you send a photo of the stamp on the base? If it's from that batch, we'll refund it in full, or send one from the new batch.`],
		mid: [c(`Photo attached.`, { art: 'photos' })],
		ends: [
			{ out: 'refund', refund: 'main', msgs: [a(`Thanks, that's one of the affected batch. ${refundLine} There's no need to return it; please put it in your recycling.`), c(`Thanks for being so thorough.`, { p: 0.6 })] },
			{ out: 'replace', msgs: [c(`I'd like a replacement, please. It's my favourite jug.`), a(`Of course. The new ones arrived early, so yours is on its way today by {service}.`), c(`Got it, thank you!`, { wait: true })] },
			{ out: 'none', msgs: [a(`Thanks for the photo. Your stamp reads {batch}, which isn't one of the affected batches, so your jug is fine to use.`), c(`Phew, thanks.`)] },
			{ out: 'open', msgs: [c(`A replacement would be lovely.`), a(`Of course. The new batch is due in {restock}, and I've reserved one for you.`)] }
		]
	}
];

/** Steps a case may pass through on its way, by topic: `before` goes after care's first reply, `after` after the topic's own middle. */
const phases: { topics: string[]; before?: boolean; msgs: Msg[] }[] = [
	{ topics: ['leak', 'crushed'], msgs: [n(`Asked {wh} how {order} was packed.`), w([`Hi {agent}, nothing unusual on our side for {order}: right box for the contents, and it was signed off at {packedTime}. Pick list below.`, `Hi {agent}, I've pulled the pick list for {order}. It went out in the usual box with paper fill, packed and checked by the morning shift.`], { wait: true, art: 'pick' })] },
	{ topics: ['safe', 'stuck'], msgs: [n([`Two working days with nothing; raised a claim with {carrier}.`, `Raised a claim with {carrier} for tracking {track}. Their acknowledgement:`], { wait: true, art: 'claim' })] },
	{ topics: ['change'], before: true, msgs: [c([`Do I need the original box? I think we recycled it.`, `Should I put anything in the parcel, like the delivery note?`, `Is there a returns form to fill in, or do I just send it?`]), a([`Any sturdy box is fine, as long as it's well padded. Just put a note inside with your name and order number.`, `A note with your name and order number is all we need, so the team at {wh} can match it to your order.`, `There's no form: a note with your order number inside the parcel is enough.`])] },
	{ topics: ['variant', 'missing'], before: true, msgs: [c([`Here's a photo of what came, next to the packing slip.`, `I've taken a photo of everything that was in the box, laid out on the table.`, `Photo attached, in case it helps.`], { art: 'photos' })] },
	{ topics: ['code', 'drop', 'offer'], before: true, msgs: [c([`Here's my order confirmation, in case it helps.`, `I've pasted the confirmation email below.`], { art: 'confirmation' })] },
	{ topics: ['electric', 'knife', 'shrank'], msgs: [c([`Is there anything else you need from me in the meantime?`, `Thanks. Should I keep using it until we know?`]), a([`Nothing for now, thanks. I'll be in touch as soon as I've heard from {maker}.`, `I'd stop using it for now, just to be safe. I'll come back to you as soon as {maker} have had a look.`])] },
	{ topics: ['address', 'retlost'], msgs: [n([`Checked with {wh}: nothing back yet for {order}. Set a reminder for {by}.`, `Reminder set to check for the parcel at {wh} on {by}.`])] }
];

// ---------------------------------------------------------------------------------------------------------------
// Which topic and ending each case follows. Topics are dealt in rounds, each round in a new order, and a topic's
// endings in turn, so that two cases on one topic end differently until its endings run out. Cases still open at
// the export are all from the last four weeks.
interface Plan {
	topic: Topic;
	end: End;
	index: number;
}
const SPAN = Math.round((LAST - FIRST) / DAY) + 1;
const dayOf = (index: number) => FIRST + Math.floor((index * SPAN) / ITEMS) * DAY;
const dealer = mulberry32(20260907);
const deck: Topic[] = [];
const uses = new Map<Topic, number>();
const plans: Plan[] = [];
for (let index = 0; index < ITEMS; index++) {
	if (!deck.length) deck.push(...shuffle(dealer, topics.flatMap((topic) => Array<Topic>(topic.weight).fill(topic))));
	const topic = deck.shift()!;
	const seen = uses.get(topic) ?? 0;
	uses.set(topic, seen + 1);
	const turn = seen + topics.indexOf(topic);
	let end = topic.ends[turn % topic.ends.length]!;
	if (end.out === 'open' && dayOf(index) < Date.UTC(2026, 9, 19)) end = topic.ends[(turn + 1) % topic.ends.length]!;
	plans.push({ topic, end, index });
}

// ---------------------------------------------------------------------------------------------------------------
// One case: the order, its dates and amounts, then the conversation.
const back = (ms: number, n: number) => {
	let day = midnight(ms);
	while (n > 0) {
		day -= DAY;
		if (dow(day) !== 0 && dow(day) !== 6) n--;
	}
	return day;
};
const weekday = (ms: number) => (dow(ms) === 0 ? ms + DAY : dow(ms) === 6 ? ms + 2 * DAY : ms);
const typo = (word: string) => (word.length < 4 ? `${word}e` : `${word.slice(0, 2)}${word[3]}${word[2]}${word.slice(4)}`);

const build = ({ topic, end, index }: Plan) => {
	const r = mulberry32(0x5f3e1 + index * 7919);
	const weights: [Region['id'], number][] = [['uk', 52], ['eu', 30], ['us', 18]];
	let roll = r() * 100;
	const regionId = topic.regions ? pick(r, topic.regions) : weights.find(([, weight]) => (roll -= weight) < 0)![0];
	const region = regions[regionId];
	const need = end.need ?? '';
	const pool = products.filter(
		(p) =>
			topic.goods.includes(p.kind) &&
			(!topic.only || topic.only.includes(p.short)) &&
			(need !== 'set' || p.set) &&
			(need !== 'colour' || p.colour) &&
			(need !== 'noset' || !p.set) &&
			(topic.id !== 'broken' || end.refund !== 'main' || !p.set) &&
			(topic.id !== 'address' || amount(region, p.gbp) < region.free)
	);
	const product = pick(r, pool);
	const qty = topic.qty ?? (product.kind === 'jar' && chance(r, 0.4) ? 2 : 1);
	const lines: Line[] = [{ product, qty, unit: amount(region, product.gbp) }];
	const extrasWanted = topic.multi ? int(r, 1, 3) : end.refund === 'all' && topic.id === 'change' ? 0 : ['address', 'club', 'engraving', 'unknown'].includes(topic.id) ? 0 : pick(r, [0, 0, 1, 1, 2, 3]);
	const others = shuffle(r, products.filter((p) => p !== product && !['electric', 'hamper', 'engraved', 'club'].includes(p.kind) && p.short !== product.short));
	for (const extra of others.slice(0, extrasWanted)) lines.push({ product: extra, qty: extra.kind === 'jar' && chance(r, 0.3) ? 2 : 1, unit: amount(region, extra.gbp) });
	const subtotal = lines.reduce((sum, line) => sum + line.unit * line.qty, 0);
	const shipCost = product.kind === 'club' ? 0 : topic.express ? region.expressCost : subtotal >= region.free ? 0 : region.ship;
	const total = subtotal + shipCost;
	const main = lines[0]!;

	// Dates. `ago` counts days from delivery (or, for a parcel that never arrived, from dispatch) to the first message.
	const open = dayOf(index) + int(r, 7 * 60, 22 * 60 + 30) * MIN;
	const ago = end.ago ?? topic.ago ?? [1, 6];
	const transit = int(r, region.transit[0], region.transit[1]);
	let placed: number;
	let shipped: number;
	let delivered: number;
	if (topic.express) {
		delivered = weekday(midnight(open) - int(r, ago[0], ago[1]) * DAY);
		if (delivered >= midnight(open)) delivered = back(open, 1);
		if (end.out === 'none') {
			shipped = back(delivered, 1);
			placed = back(shipped, 1) + int(r, 14 * 60 + 10, 22 * 60) * MIN;
		} else {
			shipped = back(delivered, 3);
			placed = shipped + int(r, 8 * 60, 13 * 60 + 30) * MIN;
		}
	} else if (topic.undelivered) {
		shipped = weekday(midnight(open) - int(r, ago[0], ago[1]) * DAY);
		if (shipped >= midnight(open)) shipped = back(open, 1);
		placed = back(shipped, chance(r, 0.6) ? 1 : 0) + int(r, 7 * 60, 23 * 60) * MIN;
		if (placed >= shipped + 15 * HOUR) placed -= DAY;
		delivered = workdays(shipped, transit);
	} else {
		delivered = midnight(open) - int(r, ago[0], ago[1]) * DAY;
		if (dow(delivered) === 0) delivered -= DAY;
		if (delivered >= midnight(open)) delivered = midnight(open) - DAY * (dow(open) === 1 ? 2 : 1);
		shipped = back(delivered, transit);
		placed = back(shipped, chance(r, 0.6) ? 1 : 0) + int(r, 7 * 60, 23 * 60) * MIN;
		if (placed >= shipped + 15 * HOUR) placed -= DAY;
	}
	if (topic.id === 'cancel') placed = back(shipped, 1) + int(r, 18 * 60, 23 * 60) * MIN;
	const packed = Math.max(placed + 40 * MIN, midnight(shipped) + int(r, 9 * 60, 13 * 60) * MIN);
	const collected = Math.max(packed + 90 * MIN, midnight(shipped) + int(r, 15 * 60, 17 * 60 + 30) * MIN);
	const arrived = midnight(delivered) + int(r, 9 * 60 + 30, 16 * 60) * MIN;
	const k: Case = { r, region, s: {}, lines, main, shipCost, discount: 0, total, captured: topic.hold ? total - main.unit * main.qty : total, authorised: total, placed, shipped, delivered, open, packed, collected, arrived };
	end.pre?.(k);

	// Slots.
	const [town, area] = pick(r, region.towns);
	const first = pick(r, region.firsts);
	const last = pick(r, region.lasts);
	const plural = !!product.plural;
	const second = lines[1]?.product ?? pick(r, products.filter((p) => p.kind === 'pantry'));
	const [maker, makerp] = makers[product.maker]!;
	const code = pick(r, [['WELCOME10', 10], ['AUTUMN15', 15], ['NEWS10', 10], ['FRIENDS15', 15]] as const);
	const vouch = Math.max(5, Math.round((main.unit / 100) * 0.45 / 5) * 5);
	const part = product.parts ? pick(r, product.parts) : (['oatcakes', 4.25] as [string, number]);
	const newUnit = Math.round((main.unit * 0.8) / 50) * 50;
	const streetNo = int(r, 12, 98);
	const street = pick(r, region.streets.length ? region.streets : countryStreets[area]!);
	const couple = [pick(r, ukFirst), pick(r, [...region.firsts, ...ukFirst])] as const;
	const date = `${int(r, 3, 28)} ${pick(r, ['October', 'November', 'December'])} 2026`;
	const service = topic.express ? region.express : pick(r, region.standard);
	const retfee = int(r, 15, 24) * 100;
	const orderNo = 200000 + Math.floor((placed - Date.UTC(2026, 5, 1)) / DAY) * 60 + int(r, 0, 59);
	const plain = (name: string) => name.toLowerCase().normalize('NFD').replace(/[^a-z]/g, '');
	const s: Slots = {
		first, last, full: `${first} ${last}`, initial: `${first} ${last.charAt(0)}.`,
		email: `${pick(r, [`${plain(first)}.${plain(last)}`, `${plain(first).charAt(0)}${plain(last)}`, `${plain(first)}${plain(last)}`, `${plain(first)}.${plain(last)}${int(r, 1, 99)}`])}@${pick(r, region.domains)}`,
		agent: pick(r, agents), lead: LEAD,
		order: `FM-${orderNo}`, order2: `FM-${orderNo + int(r, 2000, 9000)}`,
		item: product.name, short: product.short, Short: cap(product.short),
		price: money(region, main.unit),
		they: plural ? 'they' : 'it', They: plural ? 'They' : 'It', them: plural ? 'them' : 'it', is: plural ? 'are' : 'is', was: plural ? 'were' : 'was',
		has: plural ? 'have' : 'has', does: plural ? 'do' : 'does', s: plural ? '' : 's', one: product.set ? `one of the ${product.short}` : `the ${product.short}`,
		one2: plural ? 'some' : 'one', short2: second.short, is2: second.plural ? 'are' : 'is',
		subtotal: money(region, subtotal), total: money(region, total), ship: shipCost ? money(region, shipCost) : 'free', express: money(region, region.expressCost),
		service: service[0], carrier: service[1],
		placed: wdm(k.placed), placedTime: hm(k.placed), delivered: wdm(delivered),
		town, country: area, wh: region.wh, whp: pick(r, region.staff), maker, makerp,
		card4: String(int(r, 1000, 9999)),
		code: code[0], codePct: String(code[1]), codeEnd: wdm(k.placed - int(r, 2, 9) * DAY),
		voucher: `${region.sym}${vouch}`, vcode: `FERN-${int(r, 1000, 9999)}-${pick(r, ['K', 'M', 'R', 'T', 'W'])}${int(r, 10, 99)}`,
		restock: pick(r, ['December', 'January', 'early December', 'mid-January', 'the second week of December']), later: pick(r, ['December', 'January']),
		batch: `${pick(r, ['L', 'D', 'B', 'K'])}26${pad(int(r, 6, 9))}-${int(r, 1, 9)}`, made: dm(shipped - int(r, 40, 90) * DAY), bestBefore: `${pick(r, ['June', 'August', 'September', 'October'])} 2027`,
		roast: dm(shipped - int(r, 62, 85) * DAY), shrink: String(int(r, 7, 12)), fault: product.fault ?? 'it was working as it should',
		relation: pick(r, relations), occasion: pick(r, occasions), giver: pick(r, ['Auntie Jean', 'my godmother', 'my sister-in-law', 'a colleague', 'my mum']),
		missingName: part[0], colour: product.colour ?? 'oat', alt: product.alt ?? 'sage',
		duty: area === 'Norway' ? `NOK ${int(r, 310, 690)}` : `CHF ${int(r, 28, 64)}.${pad(int(r, 0, 19) * 5)}`, retfee: money(region, retfee),
		retAddr: region.retAddr, retService: pick(r, region.retServices), retTrack: `${pick(r, ['TT', 'JD', 'H0', '1Z'])}${int(r, 1000, 9999)} ${int(r, 1000, 9999)} ${int(r, 100, 999)}`,
		posted: dm(delivered + int(r, 2, 5) * DAY), dropoff: region.dropoff, depot: region.id === 'ch' ? (area === 'Norway' ? 'customs at Oslo Gardermoen' : 'customs at Basel') : pick(r, depots[service[1]]!), stuckDay: wdm(shipped + 2 * DAY),
		asked: `${couple[0]} & ${couple[1]}, ${date}`, engraved: `${couple[0]} & ${typo(couple[1])}, ${date}`, atCost: money(region, amount(region, 22)),
		newPrice: money(region, newUnit), offerStart: wdm(k.placed + DAY), cancelTime: hm(k.placed + int(r, 35, 80) * MIN), cancelDay: dm(shipped - 2 * DAY),
		otherTown: pick(r, region.towns.filter(([t]) => t !== town))[0], orderName: `${pick(r, region.firsts)} ${pick(r, region.lasts.filter((l) => l !== last))}`,
		authorisedAmt: money(region, k.authorised), capturedAmt: money(region, k.captured),
		badAddr: `${String(streetNo).split('').reverse().join('')} ${street}, ${town}`, goodAddr: `${streetNo} ${street}, ${town}`,
		company: pick(r, companies), wrap: money(region, amount(region, 3.5)), gift: `${region.sym}${region.id === 'uk' ? 10 : 15}`, budget: `${region.sym}${region.id === 'uk' ? 40 : 50}`,
		oldEmail: `${first.toLowerCase().normalize('NFD').replace(/[^a-z]/g, '')}${int(r, 70, 99)}@${pick(r, ['hotmail.com', 'yahoo.com', 'aol.com'])}`,
		other: pick(r, products.filter((p) => p !== product && p.kind !== 'club' && !p.plural && !p.set)).short, nowMs: String(open), by: '', soon: '', eta: '',
		gc4: String(int(r, 1000, 9999)), gcLeft: money(region, int(r, 3, 70) * 50), gcEnd: `${pick(r, MO)} 2027`,
		track: `${pick(r, ['JD', 'H0', 'TT', '1Z', '9400'])}${int(r, 1000, 9999)}${int(r, 1000, 9999)}${int(r, 10, 99)}`, claimNo: `CL-${int(r, 100000, 999999)}`, stock: `${int(r, 2, 30)} × ${product.parts ? part[0] : product.short}`, left: pick(r, ['in a safe place (porch)', 'in a safe place (behind the bin)', 'at the front door', 'with a neighbour', 'in a safe place (side gate)']), labelCode: `${pick(r, ['RM', 'QR', 'DH', 'UP'])}-${int(r, 1000, 9999)}-${int(r, 1000, 9999)}`,
		claimWhy: topic.undelivered ? 'not delivered: no scans for several days' : 'shown as delivered, not received'
	};
	if (topic.id === 'unknown' && end.out === 'none') {
		s.orderName = `${pick(r, region.firsts.filter((f) => f !== first))} ${last}`;
		s.otherTown = town;
	}
	if (topic.id === 'cancel') {
		s.cancelTime = hm(packed + int(r, 30, 150) * MIN);
		s.cancelDay = wdm(shipped);
	}
	s.packedTime = hm(packed);
	if (topic.id === 'club') s.cancelDay = dm(end.out === 'refund' ? shipped - 9 * DAY : shipped - int(r, 1, 3) * DAY);
	if (topic.id === 'gift' && end.out === 'voucher') s.voucher = money(region, main.unit * main.qty);
	k.s = s;
	const mainLine = main.unit * main.qty;
	const refunds: Record<Refund, () => number> = {
		all: () => k.captured,
		main: () => (lines.length === 1 ? k.captured : mainLine),
		item: () => mainLine,
		price: () => main.unit,
		unit: () => Math.round(main.unit / (product.set ?? 1)),
		pct: () => Math.round((mainLine * (end.pct ?? 0)) / 100 / 50) * 50,
		ship: () => shipCost,
		diff: () => Math.round((subtotal * code[1]) / 100),
		missing: () => amount(region, part[1]),
		goods: () => k.captured - shipCost,
		lessfee: () => k.captured - retfee,
		drop: () => (main.unit - newUnit) * main.qty
	};
	const refund = end.refund ? refunds[end.refund]() : 0;
	s.refund = money(region, refund);
	const outcome = end.out === 'refund' ? (refund === k.captured ? 'refunded in full' : 'refunded in part') : end.out;
	return { k, outcome, refund };
};

// ---------------------------------------------------------------------------------------------------------------
// The conversation, then the file.
interface Item {
	who: Who;
	paras: string[];
	art?: string;
	wait?: boolean;
	to?: string;
	busy?: boolean;
}
const write = (plan: Plan) => {
	const { topic, end, index } = plan;
	const { k, outcome, refund } = build(plan);
	const { r, s, region } = k;
	const take = (m: Msg): Item[] => (m.p !== undefined && !chance(r, m.p) ? [] : [{ who: m.who, paras: [pick(r, m.v)], art: m.art, wait: m.wait }]);
	const items: Item[] = [];
	const quick = chance(r, 0.75) ? pick(r, quicks) : undefined;
	let quickDone = !quick;
	const buyer = !['unknown', 'gift'].includes(topic.id);
	const opening = [...(buyer && chance(r, 0.4) ? [pick(r, backstories)] : []), pick(r, topic.open), ...(buyer && chance(r, 0.45) ? [pick(r, stories[topic.cat])] : []), ...(buyer && chance(r, 0.35) ? [pick(r, purposes)] : [])];
	const shows = buyer && !topic.undelivered && topic.id !== 'club' && chance(r, 0.45) ? pick(r, ['dispatch', 'dispatch', 'confirmation']) : undefined;
	const vague = chance(r, 0.24);
	if (vague) {
		items.push({ who: 'c', paras: [pick(r, vagueOpenings)] });
		items.push({ who: 'a', paras: [pick(r, vagueReplies)] });
		items.push({ who: 'c', paras: [pick(r, vagueLeads), ...opening, ...(shows ? [shows === 'dispatch' ? "Here's the dispatch email, in case it helps:" : "Here's my order confirmation, in case it helps:"] : [])], art: shows });
	} else items.push({ who: 'c', paras: [...opening, ...(shows ? [shows === 'dispatch' ? "I've pasted the dispatch email below." : "I've pasted my order confirmation below."] : [])], art: shows });
	const reply = [pick(r, topic.reply)];
	const policy = policies[topic.cat];
	if (policy && !['honey', 'retbroken', 'retlost', 'food', 'customs', 'engraving', 'size'].includes(topic.id) && chance(r, 0.55)) reply.push(pick(r, policy));
	if (quick && chance(r, 0.4)) {
		items.at(-1)!.paras.push(`Also, while I'm writing: ${quick[0]}`);
		items.at(-1)!.busy = true;
		reply.push(`On your other question: ${quick[1]}`);
		quickDone = true;
	}
	const replyAt = items.length;
	const showsTracking = ['broken', 'leak', 'crushed', 'variant', 'missing', 'hamper', 'size'].includes(topic.id) && chance(r, 0.65);
	items.push({ who: 'a', paras: reply, art: showsTracking ? 'signed' : topic.replyArt });
	if (chance(r, 0.35)) {
		{
			const rows: string[][] = [];
			let when = Date.UTC(2024, int(r, 0, 11), int(r, 1, 28));
			for (let i = int(r, 2, 7); i > 0 && when < k.placed - 20 * DAY; i--) {
				const no = 120000 + Math.floor((when - Date.UTC(2024, 0, 1)) / DAY) * 90 + int(r, 0, 89);
				rows.push([`${dm(when)} ${at(when).getUTCFullYear()}`, `FM-${no}`, money(region, amount(region, int(r, 12, 140))), pick(r, ['', '', '', 'gift wrap', 'express', 'to another address', 'newsletter code', 'gift message'])]);
				when += int(r, 30, 160) * DAY;
			}
			if (rows.length) items.push({ who: 'note', paras: [`Order history for ${s.full}:\n\n${table(['Date', 'Order', 'Total', 'Note'], rows)}`] });
		}
	}
	const phase = phases.find((p) => p.topics.includes(topic.id));
	const phased = phase && chance(r, 0.8) ? phase.msgs.flatMap(take) : [];
	const add = (list: Item[]) => {
		for (const item of list) {
			if (item.who === 'c' && items.at(-1)?.who === 'c' && !item.wait && !item.art) items.at(-1)!.paras.push(...item.paras);
			else items.push(item);
		}
	};
	if (phase?.before) add(phased);
	add((topic.mid ?? []).flatMap(take));
	if (!phase?.before) add(phased);
	// Smaller matters and the customer's questions go in where the customer is not being waited on: after a message
	// of care's that asks them nothing, or folded into a message the customer writes anyway.
	const idle = (i: number) => items[i]!.who === 'a' && i >= replyAt && !/[?:]/.test(items[i]!.paras.join(' ').replace(/https?:/g, '')) && items[i + 1]?.who !== 'a' && items[i + 1]?.who !== 'c';
	const insert = (extra: Item[]) => {
		const spots = items.map((item, i) => i).filter(idle);
		const folds = items.map((item, i) => i).filter((i) => i > 0 && items[i]!.who === 'c' && items[i + 1]?.who === 'a' && !items[i]!.busy && !(extra[1]?.art && items[i + 1]!.art));
		extra[0]!.busy = true;
		if (spots.length && (chance(r, 0.75) || !folds.length)) items.splice(pick(r, spots) + 1, 0, ...extra);
		else if (folds.length && extra.length >= 2) {
			const i = pick(r, folds);
			items[i]!.busy = true;
			items[i]!.paras.push(...extra[0]!.paras.map((para) => para.replace(/^(?:Something else while I have you\.|Unrelated, but a quick question\.|One more thing, if you don't mind\.|A different subject:|While I'm writing:|Also,)? ?(I[ ']|.)/, (_, first: string) => `Also, unrelated: ${first.length > 1 ? first : first.toLowerCase()}`)));
			items[i + 1]!.paras.push(...extra[1]!.paras.map((para) => `${pick(r, ['On your other question:', 'As for your other question:', 'And on the other thing:'])} ${para.charAt(0).toLowerCase()}${para.slice(1)}`));
			items[i + 1]!.art ??= extra[1]!.art;
		} else items.push(...extra);
	};
	let usedOrder2 = false;
	const sidePool = shuffle(r, sides.filter((side) => region.id === 'uk' || !side[0]!.v[0]!.includes('VAT')));
	for (const side of sidePool.slice(0, pick(r, [1, 2, 2, 2, 3, 3]))) {
		const mentions = side.some((m) => m.v.some((v) => v.includes('{order2}')));
		if (mentions && usedOrder2) continue;
		usedOrder2 ||= mentions;
		const extra = side.flatMap(take);
		const lead = pick(r, sideLeads);
		const first = extra[0]!.paras[0]!;
		extra[0]!.paras[0] = /^(On a|I meant)/.test(first) ? first : !lead ? cap(first) : /[,:]$/.test(lead) ? `${lead} ${/^I[ ']/.test(first) ? first : first.charAt(0).toLowerCase() + first.slice(1)}` : `${lead} ${cap(first)}`;
		insert(extra);
	}
	const fitting = asides.filter(([cats]) => cats.includes(topic.cat));
	for (const [, questions, answers] of shuffle(r, fitting).slice(0, pick(r, [0, 1, 1]))) {
		const spots = items.map((item, i) => i).filter(idle);
		if (spots.length) items.splice(pick(r, spots) + 1, 0, { who: 'c', paras: [pick(r, questions)] }, { who: 'a', paras: [pick(r, answers)] });
	}
	const endItems = end.msgs.flatMap(take);
	const threshold = amount(region, 40);
	const refundAt = endItems.findIndex((item) => item.who === 'a' && item.paras.some((para) => para.includes('{refund}')));
	if (end.out === 'refund' && refundAt >= 0 && refund >= threshold && chance(r, 0.8)) endItems.splice(refundAt, 0, { who: 'note', paras: [pick(r, approvals)] }, { who: 'lead', paras: [pick(r, approved)] });
	const replaceAt = endItems.findIndex((item) => item.who === 'a');
	if (end.out === 'replace' && replaceAt >= 0 && chance(r, 0.6)) endItems.splice(replaceAt, 0, { who: 'note', paras: [pick(r, stockNotes)] });
	if (end.out === 'replace' && endItems[0]?.who === 'a' && chance(r, 0.4)) endItems.unshift({ who: 'a', paras: [`Before I arrange anything, can I check the delivery address is still ${s.goodAddr}?`] }, { who: 'c', paras: [pick(r, [`Yes, that's still right.`, `Yes, same address, thanks.`, `That's right, yes.`])] });
	if (chance(r, 0.22)) {
		const at = endItems.findIndex((item) => item.wait && (item.who === 'wh' || item.who === 'maker'));
		if (at > 0) endItems.splice(at, 0, { who: 'c', paras: [pick(r, chasers)], wait: true }, { who: 'a', paras: [pick(r, holdings)] });
	}
	const endAt = items.length;
	items.push(...endItems);
	const second = seconds[end.out];
	if (second && chance(r, 0.45)) {
		const last = items.length - 1;
		const tail = items[last]!.who === 'c' && last > replyAt ? items.splice(last, 1) : [];
		items.push(...second.flatMap(take).map((item, i) => (i === 0 ? { ...item, wait: true } : item)), ...tail);
	}
	const follow = followUps[end.out];
	if (follow && topic.id !== 'hamper' && chance(r, 0.75)) {
		const [question, answer] = pick(r, follow).map((m) => pick(r, m.v));
		const sent = end.out === 'replace' ? items.findIndex((item, i) => i >= endAt && item.who === 'a' && /send|sent|sending|on its way/.test(item.paras.join(' '))) : -1;
		if (sent >= 0) items.splice(sent + 1, 0, { who: 'c', paras: [question!] }, { who: 'a', paras: [answer!] });
		else if (end.out !== 'replace') {
			if (items.at(-1)!.who === 'c') items.at(-1)!.paras.push(question!);
			else items.push({ who: 'c', paras: [question!] });
			items.push({ who: 'a', paras: [answer!] });
		}
	}
	if (end.out !== 'open') {
		const lastWho = items.at(-1)!.who;
		if (lastWho === 'a' && chance(r, 0.5)) {
			items.push({ who: 'c', paras: [pick(r, thanks)] });
			if (chance(r, 0.4)) items.push({ who: 'a', paras: [pick(r, closings)] });
		} else if (lastWho === 'c' && chance(r, 0.45)) items.push({ who: 'a', paras: [pick(r, closings)] });
	}
	if (!quickDone && chance(r, 0.6)) {
		const asks = items.map((item, i) => i).filter((i) => i > replyAt && items[i]!.who === 'c' && items[i + 1]?.who === 'a' && !items[i]!.busy);
		if (asks.length) {
			const i = pick(r, asks);
			items[i]!.busy = true;
			items[i]!.paras.push(`Oh, and one more thing: ${quick![0]}`);
			items[i + 1]!.paras.push(`And on your other question: ${quick![1]}`);
		}
	}
	const later = (who: Who) => items.map((item, i) => i).filter((i) => i > replyAt && items[i]!.who === who);
	if (chance(r, 0.35)) {
		const spots = later('c').filter((i) => i < items.length - 1);
		if (spots.length) items[pick(r, spots)]!.paras.unshift(pick(r, chit));
	}
	if (chance(r, 0.35)) {
		const spots = later('a');
		if (spots.length) items[pick(r, spots)]!.paras.push(pick(r, reassures));
	}
	if (chance(r, 0.35)) {
		const second = pick(r, quicks.filter((q) => q !== quick));
		const asks = items.map((item, i) => i).filter((i) => i > replyAt && items[i]!.who === 'c' && items[i + 1]?.who === 'a' && !items[i]!.busy);
		if (asks.length) {
			const i = pick(r, asks);
			items[i]!.busy = true;
			items[i]!.paras.push(`Before I forget, ${second[0]}`);
			items[i + 1]!.paras.push(`To answer your question: ${second[1]}`);
		}
	}
	const labelled = items.find((item) => item.who === 'a' && !item.art && item.paras.some((para) => /prepaid (returns )?label/.test(para)));
	if (labelled && chance(r, 0.7)) labelled.art = 'label';
	for (const [pattern, text, p] of macros) {
		const i = items.findIndex((item) => item.who === 'a' && item.paras.some((para) => pattern.test(para)));
		if (i >= 0 && chance(r, p)) items[i]!.paras.push(text);
	}
	const handover = chance(r, 0.12) ? pick(r, agents.filter((name) => name !== s.agent)) : '';
	if (handover) {
		const spots = items.map((item, i) => i).filter((i) => i > replyAt + 1 && items[i]!.who === 'a');
		if (spots.length > 1) items.splice(spots[1]!, 0, { who: 'note', paras: [pick(r, [`Handing this one to ${handover} while I'm off for a few days.`, `${handover}, could you pick this up? I'm on leave from tomorrow.`, `Over to ${handover} from here; I'm moving to the trade inbox this week.`])], to: handover });
	}

	// Times. Customers write from 07:00 to 23:00; care answers within its hours; warehouses and makers take days.
	const schedule = (scale: number) => {
		const rt = mulberry32(0x7a11 + index * 104729);
		let now = k.open;
		const gap = (low: number, high: number) => Math.max(1, Math.round(int(rt, low, high) * scale)) * MIN;
		const careHours = () => {
			for (let guard = 0; guard < 10; guard++) {
				const hour = at(now).getUTCHours();
				if (dow(now) === 0 || hour >= 18) now = midnight(now) + DAY + 8 * HOUR + int(rt, 5, 60) * MIN;
				else if (hour < 8) now = midnight(now) + 8 * HOUR + int(rt, 5, 60) * MIN;
				else break;
			}
		};
		return items.map((item, i) => {
			if (i > 0) {
				if (item.wait) now += gap(1500, 4000);
				if (item.who === 'c') {
					now += gap(15, 1500);
					const hour = at(now).getUTCHours();
					if (hour < 7) now += (7 - hour) * HOUR + int(rt, 0, 50) * MIN;
					if (hour >= 23) now += 8 * HOUR;
				} else if (item.who === 'note') now += int(rt, 2, 30) * MIN;
				else {
					now += gap(12, 300);
					careHours();
				}
			}
			return now;
		});
	};
	let times = schedule(1);
	for (const scale of [0.6, 0.4, 0.25, 0.15, 0.08, 0.04]) if (times.at(-1)! >= EXPORT) times = schedule(scale);
	if (times.at(-1)! >= EXPORT) throw new Error(`case ${index} runs past the export`);

	const fill = (text: string) =>
		text.replace(/\{(\w+)\}/g, (_, key: string) => {
			const value = s[key];
			if (value === undefined) throw new Error(`no slot ${key} in "${text.slice(0, 70)}" (${topic.id})`);
			return value;
		});
	const setNow = (ms: number) => {
		s.nowMs = String(ms);
		s.by = WD[dow(workdays(ms, int(r, 1, 3), true))]!;
		s.soon = wdm(workdays(ms, int(r, 6, 9)));
		s.eta = wdm(workdays(ms, int(r, 1, 3)));
	};

	// The file.
	const number = 30400 + index * 3 + int(r, 0, 2);
	const channel = pick(r, ['email', 'email', 'email', 'email', 'web form', 'web form', 'chat']);
	const subject = vague && chance(r, 0.6) ? pick(r, vagueSubjects) : pick(r, topic.subjects);
	const out: string[] = [];
	setNow(k.open);
	const place = region.id === 'uk' ? `${s.town} ${s.country}` : `${s.town}, ${s.country}`;
	const shipTo = topic.id === 'unknown' ? `${s.orderName}, ${s.otherTown}` : `${s.full}, ${s.goodAddr}${region.id === 'uk' ? ` ${s.country}` : `, ${s.country}`}`;
	out.push(`# Case ${number}: ${fill(subject)}`, '');
	out.push(`- Opened: ${stamp(k.open)}, by ${channel}`, `- From: ${s.full} <${s.email}>, ${place}`, `- Order: ${s.order}`, `- Handled by: ${s.agent}`, '');
	const orders = int(r, 1, 14);
	const since = Date.UTC(2026, 6, 1) - (orders > 1 ? int(r, 60, 1400) : int(r, 0, 50)) * DAY;
	out.push('## Customer', '', table(['Customer since', 'Orders', 'Spent', 'Newsletter', 'Saved addresses'], [[`${MO[at(since).getUTCMonth()]} ${at(since).getUTCFullYear()}`, String(orders), money(region, k.total + (orders - 1) * amount(region, int(r, 25, 90))), pick(r, ['yes', 'yes', 'no']), String(int(r, 1, 3))]]), '');
	if (orders > 1) {
		const recent: string[][] = [];
		let when = k.placed - int(r, 20, 60) * DAY;
		for (let i = Math.min(orders - 1, int(r, 2, 7)); i > 0; i--) {
			recent.push([`${dm(when)} ${at(when).getUTCFullYear()}`, `FM-${200000 + Math.floor((when - Date.UTC(2026, 5, 1)) / DAY) * 60 + int(r, 0, 59)}`, String(int(r, 1, 4)), money(region, amount(region, int(r, 14, 150))), pick(r, ['delivered', 'delivered', 'delivered', 'delivered, gift wrap', 'delivered to another address', 'collected at the Frome market'])]);
			when -= int(r, 25, 140) * DAY;
		}
		out.push('### Earlier orders', '', table(['Placed', 'Order', 'Items', 'Total', 'Note'], recent), '');
	}
	if (chance(r, 0.25)) out.push(`Account note: ${pick(r, ['prefers email to phone.', 'trade account (café), invoices to the accounts address.', 'receipts by email only, never in the parcel.', 'sends a lot of presents to other addresses.', 'hard of hearing, so please do not phone.', 'asked for no marketing calls.'])}`, '');
	const rows = k.lines.map((line, i) => [`${line.product.name}${i === 0 && topic.hold ? ' (not sent: out of stock)' : ''}`, String(line.qty), money(region, line.unit * line.qty)]);
	rows.push([`Delivery, ${s.service}`, '', s.ship!], ['**Total**', '', `**${s.total}**`]);
	const paid = topic.hold ? `${money(region, k.captured)} of ${money(region, k.authorised)} authorised` : money(region, k.captured);
	out.push(`## Order ${s.order}, from the back office`, '', table(['Item', 'Qty', 'Price'], rows), '');
	out.push(`Ship to ${shipTo} · ${s.service}, tracking ${s.track} · payment captured, ${paid}`, '');
	const events: [number, string][] = [
		[k.placed, topic.id === 'club' ? 'Coffee Club box created from subscription' : `Order placed on the website (${pick(r, ['phone', 'desktop', 'tablet', 'phone'])})`],
		[k.placed, `Payment authorised, ${money(region, k.authorised)}`],
		[k.placed + MIN, topic.id === 'club' ? 'Box contents email sent' : 'Order confirmation email sent']
	];
	const sentTo = Math.min(k.packed - 30 * MIN, Math.max(k.placed + 10 * MIN, midnight(k.shipped) + int(r, 6 * 60, 8 * 60) * MIN));
	events.push([sentTo, `Sent to ${region.wh}`]);
	if (topic.hold) events.push([sentTo + int(r, 10, 40) * MIN, `${k.main.product.name} marked out of stock; customer emailed`]);
	events.push([k.packed, k.lines.length > 1 ? `Picked and packed, ${k.lines.length} lines` : 'Picked and packed']);
	events.push([k.collected, `Collected by ${s.carrier}; payment captured, ${paid}`]);
	events.push([k.collected + int(r, 5, 40) * MIN, 'Dispatch email sent']);
	if (topic.id === 'address') events.push([k.arrived, `Could not deliver: address not found (${s.carrier})`]);
	else if (!topic.undelivered) {
		events.push([k.arrived, `Delivered (${s.carrier})`]);
		if (chance(r, 0.7)) events.push([k.arrived + int(r, 3, 20) * MIN, 'Delivery email sent']);
	}
	out.push('### Order events', '', table(['When', 'Event'], events.filter(([when]) => when < k.open).sort((x, y) => x[0] - y[0]).map(([when, what]) => [stamp(when).replace(' 2026,', ''), what])), '');
	out.push('## Messages', '');
	let chatUntil = 0;
	if (channel === 'chat') {
		chatUntil = Math.min(items.length, pick(r, [2, 4]));
		while (chatUntil > 0 && (items[chatUntil - 1]!.who !== 'a' || items.slice(0, chatUntil).some((item) => item.who !== 'c' && item.who !== 'a' || item.art))) chatUntil--;
	}
	if (chatUntil > 0) {
		out.push(`### Chat with ${s.agent} · ${stamp(times[0]!)}`, '');
		const lines: string[] = [];
		items.slice(0, chatUntil).forEach((item, i) => {
			const who = item.who === 'c' ? s.first : s.agent;
			const t = hm(times[0]! + (i * 3 + int(r, 0, 2)) * MIN);
			if (i === 1) lines.push(`**${t} ${s.agent}:** ${fill(pick(r, ['Hi {first}, thanks for waiting. Let me have a look.', 'Hello {first}! Give me a moment to read that.', 'Hi {first}, I can help with that.']))}`);
			item.paras.forEach((para) => lines.push(`**${t} ${who}:** ${fill(para)}`));
		});
		if (chatUntil < items.length) lines.push(`**${hm(times[0]! + chatUntil * 3 * MIN + 2 * MIN)} ${s.agent}:** ${fill(pick(r, ["I'll carry on by email from here, so you have it all in writing.", "I'll follow this up by email, so keep an eye on your inbox.", "I'll pick this up by email once I've checked a few things."]))}`);
		out.push(lines.join('\n\n'), '');
		const shift = times[0]! + (chatUntil * 3 + 15) * MIN;
		for (let i = chatUntil; i < times.length; i++) if (times[i]! < shift) times[i] = shift + i * MIN;
	}
	let agentSpoke = chatUntil > 0;
	let lastAgent = '';
	const said = new Set<string>();
	/** A greeting this case has not used yet, where there is one. */
	const fresh = (pool: string[]) => {
		const unused = pool.filter((line) => !said.has(line) || line.length < 14);
		const line = pick(r, unused.length ? unused : pool);
		said.add(line);
		return line;
	};
	items.slice(chatUntil).forEach((item, offset) => {
		const i = chatUntil + offset;
		const time = times[i]!;
		setNow(time);
		const body: string[] = [];
		if (item.who === 'c') {
			out.push(`### ${s.full} · ${stamp(time)}`, '');
			if (i === 0 && channel === 'web form') body.push(fence([`Name           ${s.full}`, `Order number   ${s.order}`, `Topic          ${pick(r, ['Something else', 'My order', 'Something else'])}`]));
			const thanked = /^Thank/.test(item.paras[0] ?? '');
			const greeting = fill(fresh(i === 0 ? firstGreetings : thanked ? ['Hi {agent},', 'Hello {agent},', ''] : items[i - 1]?.who === 'a' ? replyGreetings : unpromptedGreetings));
			if (greeting) body.push(greeting);
			const quoted = lastAgent.split('\n').flatMap((para) => para.split(/(?<=[.?!])\s/)).find((sentence) => sentence.length > 50 && !sentence.includes(':'));
			if (quoted && chance(r, 0.1)) body.push(`> ${quoted}`);
			lastAgent = '';
			const paras = item.paras.map(fill);
			const intro = paras.findIndex((para) => para.endsWith(':'));
			if (item.art) paras.splice(intro >= 0 ? intro + 1 : paras.length, 0, arts[item.art]!(k));
			body.push(...paras);
			const signoff = fill(pick(r, i === 0 ? custSignoffs : replySignoffs));
			if (signoff) body.push(signoff);
		} else if (item.who === 'a') {
			out.push(`### ${s.agent} (Fernhill Care) · ${stamp(time)}`, '');
			const thanked = /^Thank/.test(item.paras[0] ?? '');
			const before = items.slice(0, i).filter((other) => other.who !== 'note').at(-1)?.who;
			const paras = item.paras.map(fill);
			if (item.art === 'signed') paras.push(fill(`For reference, this is what {carrier} have for the parcel:`));
			const intro = paras.findIndex((para) => para.endsWith(':'));
			lastAgent = paras.filter((para) => !para.endsWith(':')).join('\n');
			if (item.art) paras.splice(intro >= 0 ? intro + 1 : paras.length, 0, arts[item.art]!(k));
			body.push(fill(fresh(thanked ? ['Hi {first},', 'Hello {first},', 'Dear {first},'] : !agentSpoke ? agentFirst : before === 'c' ? agentLater : agentAgain)), ...paras);
			body.push(fill(pick(r, agentSignoffs)));
			agentSpoke = true;
		} else if (item.who === 'note') {
			out.push(`### Internal note by ${s.agent} · ${stamp(time)}`, '');
			body.push(...item.paras.map(fill));
			if (item.art) body.push(arts[item.art]!(k));
			if (item.to) s.agent = item.to;
		} else {
			const from = item.who === 'wh' ? `${s.whp} (${region.wh})` : item.who === 'maker' ? `${s.makerp} (${s.maker})` : `${LEAD} (Care lead)`;
			out.push(`### ${from} · ${stamp(time)}`, '');
			body.push(...item.paras.map(fill));
			if (item.art) body.push(arts[item.art]!(k));
			body.push(item.who === 'wh' ? s.whp! : item.who === 'maker' ? s.makerp! : LEAD);
		}
		out.push(body.join('\n\n'), '');
	});
	const text = out.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
	return { name: `case-${number}.md`, text, label: [number, topic.id, topic.cat, outcome, s.refund].join('\t') };
};

const folder = join(root, 'docs', 'refund-cases');
mkdirSync(folder, { recursive: true });
const labels: string[] = [];
for (const plan of plans) {
	const { name, text, label } = write(plan);
	writeFileSync(join(folder, name), text);
	labels.push(label);
}
writeFileSync(
	join(folder, 'README.md'),
	`# Refund cases, 7 September to 13 November 2026\n\nThe ${ITEMS} cases Customer Care's help desk filed under refunds in these ten weeks, one file each, exported on\n20 November. Each file has the order as the back office showed it when the case was opened, then every message on\nthe case: the customer's, care's, internal notes, and notes from the warehouses and makers. The export keeps no\ntags or statuses. Cards appear by their last four digits only.\n`
);
if (process.argv[3] === '--labels') console.log(labels.join('\n'));
