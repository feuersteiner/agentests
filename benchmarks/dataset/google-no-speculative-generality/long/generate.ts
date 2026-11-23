// Writes the long material of this entry's long tasks: every conversation in Fernhill Roasters' shared inbox,
// hello@fernhill.example, that started between 3 August and 6 November 2026, one Markdown file each, under
// inbox/hello/, as the shared inbox tool exported them: messages and the team's internal notes, without folders,
// tags or assignees. Deterministic: fixed seeds, no clock, no network.
//   bun long/generate.ts <workspace root>
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** How many conversations to write. Their dates, numbers and the share of each topic all follow from it. */
const ITEMS = 248;

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
/** A stable number for a name, so that a café keeps its contact, its order and its delivery day in every thread. */
const hash = (text: string) => [...text].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);
const cap = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const pad = (value: number) => String(value).padStart(2, '0');
const euros = (cents: number) => `${(cents / 100).toFixed(2)} EUR`;
const money = (value: number) => value.toFixed(2);
const slug = (text: string) =>
	text
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z]/g, '');
const numberWords = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const inWords = (n: number) => numberWords[n] ?? String(n);

// Time is kept in minutes since 00:00 on 1 August 2026, Dutch local time.
const EPOCH = Date.UTC(2026, 7, 1);
const DAY = 1440;
const dayOf = (iso: string) => Math.round((Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) - EPOCH) / 60000);
const FIRST_DAY = dayOf('2026-08-03');
const LAST_DAY = dayOf('2026-11-06');
const LAST_MESSAGE = dayOf('2026-11-12') + 17 * 60;
/** Release 1.2.0: from this day the shipped email carries the tracking code. */
const TRACKING_IN_EMAIL = dayOf('2026-10-06');
/** The day Marit bought the Colombian decaf lot. */
const DECAF_BOUGHT = dayOf('2026-09-21');
const at = (m: number) => new Date(EPOCH + m * 60000);
const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const dow = (m: number) => at(m).getUTCDay();
const weekday = (m: number) => dayNames[dow(m)]!;
const month = (m: number) => monthNames[at(m).getUTCMonth()]!;
const clock = (m: number) => `${pad(at(m).getUTCHours())}:${pad(at(m).getUTCMinutes())}`;
const minuteOfDay = (m: number) => ((m % DAY) + DAY) % DAY;
const startOfDay = (m: number) => m - minuteOfDay(m);
const dateLong = (m: number) => `${weekday(m)} ${at(m).getUTCDate()} ${month(m)}`;
const dateShort = (m: number) => `${at(m).getUTCDate()} ${month(m).slice(0, 3)}`;
const dayMonth = (m: number) => `${at(m).getUTCDate()} ${month(m)}`;
const stamp = (m: number) => `${weekday(m).slice(0, 3)} ${dateShort(m)}, ${clock(m)}`;
const stampLong = (m: number) => `${dateLong(m)} 2026, ${clock(m)}`;
const numeric = (m: number) => `${pad(at(m).getUTCDate())}-${pad(at(m).getUTCMonth() + 1)}-2026`;
/** The first day at or after `m` (as its start) that is one of `days` (0 is Sunday). */
const nextOn = (m: number, days: number[]) => {
	let d = startOfDay(m);
	while (!days.includes(dow(d))) d += DAY;
	return d;
};
/** The next moment at or after `m` in office hours: weekdays 08:30 to 17:30, and Saturdays for the roastery shop. */
const office = (r: Rand, m: number, saturdays: boolean) => {
	let t = m;
	for (;;) {
		const open = (dow(t) >= 1 && dow(t) <= 5) || (saturdays && dow(t) === 6);
		const mod = minuteOfDay(t);
		if (open && mod >= 510 && mod <= 1050) return t;
		if (open && mod < 510) return startOfDay(t) + 510 + int(r, 0, 80);
		t = startOfDay(t) + DAY + 510 + int(r, 0, 100);
		if (minuteOfDay(t) > 1050) t = startOfDay(t) + 1000;
	}
};
/** Outside people write between 07:00 and 23:00. */
const waking = (r: Rand, m: number) => {
	const mod = minuteOfDay(m);
	if (mod < 420) return startOfDay(m) + 420 + int(r, 0, 150);
	if (mod > 1380) return startOfDay(m) + DAY + 430 + int(r, 0, 200);
	return m;
};

// Fernhill Roasters: a roastery with a shop on the premises, cafés and offices it supplies, and the online shop.
type StaffKey = 'marit' | 'femke' | 'daan' | 'youssef';
const staff: Record<StaffKey, { first: string; last: string; line: string }> = {
	marit: { first: 'Marit', last: 'Hoekstra', line: 'Fernhill Roasters' },
	femke: { first: 'Femke', last: 'Dijkstra', line: 'Fernhill Roasters · cafés and wholesale' },
	daan: { first: 'Daan', last: 'Visser', line: 'Fernhill Roasters · roastery shop' },
	youssef: { first: 'Youssef', last: 'Amrani', line: 'Fernhill Roasters · online orders' }
};

interface Product {
	name: string;
	cents: number;
}
const house250: Product = { name: 'House Blend 250 g', cents: 790 };
const house1000: Product = { name: 'House Blend 1 kg', cents: 2650 };
const ethiopia: Product = { name: 'Ethiopia Guji 250 g', cents: 1180 };
const colombia: Product = { name: 'Colombia Huila 250 g', cents: 1090 };
const grinder: Product = { name: 'Hand Grinder', cents: 6400 };
const coffees = [house250, house1000, ethiopia, colombia];

// Outside people.
const firstNames = ['Anouk', 'Bram', 'Sanne', 'Thijs', 'Lieke', 'Ruben', 'Noor', 'Jasper', 'Fleur', 'Sem', 'Iris', 'Milan', 'Eva', 'Lars', 'Yara', 'Tim', 'Esther', 'Koen', 'Maud', 'Niels', 'Priya', 'Omar', 'Hannah', 'Mateo', 'Chloé', 'Ahmed', 'Sofia', 'Lukas', 'Ayla', 'Pieter', 'Zeynep', 'Gijs', 'Marloes', 'Kofi', 'Elif', 'Wouter', 'Saskia', 'Daniel', 'Leila', 'Hugo', 'Roos', 'Victor'];
const lastNames = ['de Vries', 'Jansen', 'Bakker', 'Visscher', 'Smit', 'Meijer', 'de Boer', 'Mulder', 'de Groot', 'Bos', 'Vos', 'Peters', 'Hendriks', 'van Leeuwen', 'Dekker', 'Brouwer', 'Wagenaar', 'Dijkman', 'Kok', 'Jacobs', 'van der Linden', 'Schouten', 'Willems', 'van Dam', 'Kuipers', 'Postma', 'Verhoeven', 'Haddou', 'Yilmaz', 'Okafor', 'Rossi', 'Novak', 'Fischer', 'Lindqvist', 'Moreau', 'O’Brien', 'Kaur', 'Santos', 'Nguyen', 'Kowalski'];
const mailHosts = ['example.com', 'example.net', 'example.org'];
const streets = ['Bremstraat', 'Jasmijnstraat', 'Merelstraat', 'Kanaalstraat', 'Lessinglaan', 'Prins Hendriklaan', 'Ooftstraat', 'Kievitdwarsstraat', 'Willem van Noortstraat', 'Laan van Nieuw Guinea', 'Sterrenburg', 'Abstederdijk', 'Cartesiusweg', 'Lauwerecht', 'Amsterdamsestraatweg', 'Weerdsingel', 'Burgemeester Reigerstraat', 'Vleutenseweg'];
const towns = ['Groningen', 'Zwolle', 'Maastricht', 'Leiden', 'Arnhem', 'Deventer', 'Haarlem', 'Breda', 'Nijmegen', 'Alkmaar', 'Den Bosch', 'Leeuwarden'];
const areas = ['Lombok', 'Oudwijk', 'Zuilen', 'Wittevrouwen', 'Ondiep', 'Leidsche Rijn', 'Tuinwijk', 'Overvecht', 'Kanaleneiland', 'the city centre', 'the station area', 'Hoograven'];

interface Person {
	first: string;
	name: string;
	email: string;
}
const person = (r: Rand): Person => {
	const first = pick(r, firstNames);
	const last = pick(r, lastNames);
	const host = pick(r, mailHosts);
	const forms = [`${slug(first)}.${slug(last)}`, `${slug(first)}${slug(last).slice(0, 1)}`, `${slug(first).slice(0, 1)}${slug(last)}`, `${slug(first)}.${slug(last)}${int(r, 70, 99)}`];
	return { first, name: `${first} ${last}`, email: `${pick(r, forms)}@${host}` };
};

// The cafés, lunchrooms and bakeries Fernhill supplies every week.
interface Business {
	org: string;
	area: string;
	contact: [string, string];
	role: string;
	/** For offices: what they do and how many people work there. */
	what?: string;
	people?: number;
}
const cafes: Business[] = [
	{ org: 'Koffiehuis De Wit', area: 'Lombok', contact: ['Sanne', 'de Wit'], role: 'owner' },
	{ org: 'Café Brandpunt', area: 'Oudwijk', contact: ['Jesse', 'Vermeulen'], role: 'manager' },
	{ org: 'Lunchroom Het Pakhuis', area: 'Zuilen', contact: ['Karin', 'Hofman'], role: 'owner' },
	{ org: 'Espressobar Molenkade', area: 'Wittevrouwen', contact: ['Bilal', 'Aziz'], role: 'head barista' },
	{ org: 'Café De Zwaluw', area: 'Ondiep', contact: ['Marieke', 'Scholten'], role: 'owner' },
	{ org: 'Bakkerij Zoet & Zout', area: 'Tuinwijk', contact: ['Rik', 'Lammers'], role: 'baker and owner' },
	{ org: 'Boekcafé Het Leeshuis', area: 'the city centre', contact: ['Ineke', 'Prins'], role: 'manager' },
	{ org: 'Koffiebar Spoor 9', area: 'the station area', contact: ['Dewi', 'Hartono'], role: 'owner' },
	{ org: 'Lunchcafé Groenhof', area: 'Leidsche Rijn', contact: ['Tom', 'Evers'], role: 'manager' },
	{ org: 'Brasserie De Kaai', area: 'Overvecht', contact: ['Nadia', 'El Idrissi'], role: 'owner' },
	{ org: 'Café Wilgenhof', area: 'Kanaleneiland', contact: ['Stijn', 'Bouwman'], role: 'owner' },
	{ org: 'Het Zonnige Hoekje', area: 'Hoograven', contact: ['Fatma', 'Kaya'], role: 'owner' }
];
const offices: Business[] = [
	{ org: 'Studio Lindeboom', what: 'an architects’ studio', people: 18, area: 'Oudwijk', contact: ['Merel', 'Lindeboom'], role: 'partner' },
	{ org: 'Van Asch Accountants', what: 'an accountancy firm', people: 26, area: 'the station area', contact: ['Hans', 'Klaassen'], role: 'office manager' },
	{ org: 'Kade 9 Coworking', what: 'a coworking space', people: 60, area: 'Zuilen', contact: ['Sven', 'Bakx'], role: 'community manager' },
	{ org: 'Fysio De Linde', what: 'a physiotherapy practice', people: 9, area: 'Wittevrouwen', contact: ['Ellen', 'Mol'], role: 'practice manager' },
	{ org: 'Drukkerij Mulder & Zn', what: 'a printing firm', people: 14, area: 'Ondiep', contact: ['Gert', 'Mulder'], role: 'director' },
	{ org: 'Noorderlicht Software', what: 'a software company', people: 35, area: 'Leidsche Rijn', contact: ['Aisha', 'Bello'], role: 'office manager' }
];
const delis: Business[] = [
	{ org: 'De Kaaskamer', area: 'Wittevrouwen', contact: ['Joost', 'Vink'], role: 'owner' },
	{ org: 'Versmarkt Ten Hove', area: 'Leidsche Rijn', contact: ['Annemiek', 'ten Hove'], role: 'owner' },
	{ org: 'Kruidenier Noord', area: 'Zuilen', contact: ['Mehmet', 'Demir'], role: 'owner' },
	{ org: 'Boerderijwinkel De Hoeve', area: 'Groenekan, just outside the city', contact: ['Grietje', 'Boersma'], role: 'farmer and shopkeeper' },
	{ org: 'Wijnhandel Vonk', area: 'the city centre', contact: ['Ludo', 'Vonk'], role: 'owner' }
];
const newCafeNames = ['Café Morgenrood', 'Koffiebar De Tuinkamer', 'Lunchroom Pier 4', 'Het Veerhuis', 'Café Kleine Boom', 'Espresso Zuidzijde', 'Het Atelier', 'Bakery Bloem', 'Koffiebar Oost 12', 'De Werkplaats', 'Lunchroom Lindenhof', 'Café Op de Hoek'];
const bagSuppliers: Business[] = [
	{ org: 'Verpakkingen Noord', area: 'Zwolle', contact: ['Ilse', 'Brouwer'], role: 'account manager' },
	{ org: 'Kraftpak Packaging', area: 'Tilburg', contact: ['Thomas', 'Greve'], role: 'sales' }
];
const importers: Business[] = [
	{ org: 'Bergwater Green Coffee', area: 'Amsterdam', contact: ['Robin', 'Veenstra'], role: 'trader' },
	{ org: 'Origin Lane Imports', area: 'Antwerp', contact: ['Amara', 'Mensah'], role: 'sales' }
];
const technicians: Business[] = [{ org: 'Vlam & Trommel Service', area: 'Apeldoorn', contact: ['Henk', 'Overbeek'], role: 'service engineer' }];
const press = ['De Stadsgids', 'the coffee blog Zwart & Heet', 'the podcast Lokaal Gebrand', 'the Lombok neighbourhood paper', 'Eten in de Stad, a food magazine'];
const charities = ['Basisschool De Regenboog', 'the food bank in Zuilen', 'Hockeyclub Oudwijk', 'the neighbourhood association in Lombok', 'Stichting Buurtkeuken', 'the parents’ committee of Montessorischool Noord'];
const markets = ['Winterfair Lombok', 'the Christmas market in Zuilen', 'the Sunday market at the old tram depot', 'the Oudwijk street fair'];
const studies = ['hospitality management', 'food technology', 'business administration', 'communication and media', 'nutrition and dietetics'];
const groups = ['a class of hospitality students', 'our book club', 'a group of eight from the allotment society', 'my Dutch language class', 'a few colleagues from the hospital', 'the Scouts’ senior group'];
const lostItems = ['a grey wool scarf', 'a black umbrella with a wooden handle', 'my reading glasses in a green case', 'a child’s blue mitten', 'a bunch of keys with a bottle opener on the ring', 'a phone charger'];

// The online shop's orders. F-1001 was placed on 2 June 2026, the day the shop opened; F-1041 to F-1046 are the
// orders in data/orders.json, with their customers, dates and totals. Roasting is on Tuesdays and Thursdays, and
// online orders go out with PostNL the day after, on Wednesdays and Fridays.
interface Line {
	qty: number;
	product: Product;
}
interface Order {
	id: string;
	placed: number;
	who: Person;
	lines: Line[];
	cents: number;
	shipped: number | null;
	street: string;
	/** Taken by a thread, or kept out of every thread. */
	used: boolean;
}
const shipAfter = (r: Rand, placed: number) => nextOn(startOfDay(placed) + DAY, [3, 5]) + int(r, 15 * 60 + 40, 16 * 60 + 50);
const book: Order[] = [];
for (let n = 1001; n <= 1040; n++) {
	const r = mulberry32(5000 + n);
	const placed = dayOf('2026-06-02') + Math.round(((n - 1001) * 115) / 39) * DAY + int(r, 7 * 60, 23 * 60);
	const lines: Line[] = [];
	if (r() < 0.3) lines.push({ qty: 1, product: grinder });
	for (const product of shuffle(r, coffees).slice(0, int(r, 1, lines.length ? 1 : 2))) lines.push({ qty: product === house1000 ? 1 : int(r, 1, 3), product });
	book.push({ id: `F-${n}`, placed, who: person(r), lines, cents: lines.reduce((sum, line) => sum + line.qty * line.product.cents, 0), shipped: shipAfter(r, placed), street: `${pick(r, streets)} ${int(r, 2, 140)}`, used: false });
}
const fixtureOrder = (n: number, iso: string, minute: number, who: Person, lines: Line[], shipped: boolean, street: string): Order => {
	const placed = dayOf(iso) + minute;
	return { id: `F-${n}`, placed, who, lines, cents: lines.reduce((sum, line) => sum + line.qty * line.product.cents, 0), shipped: shipped ? shipAfter(mulberry32(5000 + n), placed) : null, street, used: true };
};
const ines: Person = { first: 'Ines', name: 'Ines', email: 'ines@example.com' };
const tomas: Person = { first: 'Tomas', name: 'Tomas', email: 'tomas@example.com' };
const mira: Person = { first: 'Mira', name: 'Mira', email: 'mira@example.com' };
const joris: Person = { first: 'Joris', name: 'Joris', email: 'joris@example.com' };
book.push(
	fixtureOrder(1041, '2026-09-28', 19 * 60 + 12, ines, [{ qty: 1, product: house1000 }], true, 'Kievitdwarsstraat 31'),
	fixtureOrder(1042, '2026-10-02', 8 * 60 + 47, tomas, [{ qty: 1, product: grinder }, { qty: 1, product: house250 }], true, 'Cartesiusweg 7'),
	fixtureOrder(1043, '2026-10-09', 10 * 60 + 5, mira, [{ qty: 1, product: ethiopia }], false, 'Ooftstraat 58'),
	fixtureOrder(1044, '2026-10-17', 14 * 60 + 33, ines, [{ qty: 1, product: house1000 }, { qty: 1, product: house250 }], true, 'Kievitdwarsstraat 31'),
	fixtureOrder(1045, '2026-10-30', 21 * 60 + 2, joris, [{ qty: 2, product: house250 }], false, 'Weerdsingel 102'),
	fixtureOrder(1046, '2026-11-03', 7 * 60 + 51, tomas, [{ qty: 2, product: ethiopia }], false, 'Cartesiusweg 7')
);
const orderById = (id: string) => book.find((order) => order.id === id)!;
const trackingCode = (order: Order) => `3SFERN${String(+order.id.slice(2) - 1000).padStart(4, '0')}`;
const itemsText = (order: Order) => {
	const parts = order.lines.map((line) => (line.product === grinder ? 'the hand grinder' : `${line.qty === 1 ? 'a bag' : `${inWords(line.qty)} bags`} of ${line.product.name}`));
	return parts.length === 1 ? parts[0]! : `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}`;
};

// Who writes in. A thread's outside party comes from its topic; an order brings its own customer.
type PartyKind = 'person' | 'cafe' | 'office' | 'deli' | 'newcafe' | 'bags' | 'importer' | 'technician' | 'applicant' | 'press' | 'charity' | 'neighbour' | 'market' | 'student' | 'organiser';
interface Party {
	first: string;
	name: string;
	email: string;
	/** The organisation, for the signature and the {org} placeholder. */
	org: string;
	role: string;
	area: string;
	biz?: Business;
	formal: boolean;
}
// Businesses write from their own domain.
const domainOf = (org: string) => {
	let domain = '';
	for (const word of org.replace(/^(Café|Koffiehuis|Lunchroom|Lunchcafé|Espressobar|Koffiebar|Boekcafé|Brasserie|Bakkerij|Espresso|Bakery)\s+/, '').split(' ')) if (domain.length < 7) domain += slug(word);
	return domain;
};
const fromBusiness = (biz: Business): Party => ({
	first: biz.contact[0],
	name: `${biz.contact[0]} ${biz.contact[1]}`,
	email: `${slug(biz.contact[0])}@${domainOf(biz.org)}.example`,
	org: biz.org,
	role: biz.role,
	area: biz.area,
	biz,
	formal: false
});
const partyOf = (r: Rand, kind: PartyKind): Party => {
	const p = person(r);
	const plain = (org: string, role: string, formal: boolean): Party => ({ ...p, org, role, area: pick(r, areas), formal });
	switch (kind) {
		case 'person':
			return plain('', '', false);
		case 'cafe':
			return fromBusiness(pick(r, cafes));
		case 'office':
			return fromBusiness(pick(r, offices));
		case 'deli':
			return fromBusiness(pick(r, delis));
		case 'newcafe': {
			const org = pick(r, newCafeNames);
			return { ...p, email: `${slug(p.first)}@${domainOf(org)}.example`, org, role: 'owner', area: pick(r, areas), formal: false };
		}
		case 'bags':
			return { ...fromBusiness(pick(r, bagSuppliers)), formal: true };
		case 'importer':
			return { ...fromBusiness(pick(r, importers)), formal: true };
		case 'technician':
			return { ...fromBusiness(technicians[0]!), formal: true };
		case 'applicant':
			return plain('', '', r() < 0.5);
		case 'press':
			return plain(pick(r, press), pick(r, ['reporter', 'editor', 'writer', 'presenter']), true);
		case 'charity':
			return plain(pick(r, charities), pick(r, ['volunteer', 'secretary', 'chair', 'parent volunteer']), false);
		case 'neighbour':
			return plain('', '', r() < 0.5);
		case 'market':
			return plain(pick(r, markets), 'organiser', true);
		case 'student':
			return plain('', pick(r, studies), r() < 0.6);
		case 'organiser':
			return plain('', '', false);
	}
};

// Stable facts about a café: its weekly House Blend, a second coffee, and its delivery day.
const wholesale = { house: 19.5, colombia: 23.5, ethiopia: 26 };
const cafeFacts = (biz: Business) => {
	const h = hash(biz.org);
	const second = h % 3 === 0 ? 'Ethiopia Guji' : 'Colombia Huila';
	return { kg: 4 + (h % 9), second, secondKg: 1 + ((h >>> 4) % 3), deliv: ['Tuesday', 'Wednesday', 'Thursday', 'Friday'][(h >>> 8) % 4]!, secondPrice: second === 'Ethiopia Guji' ? wholesale.ethiopia : wholesale.colombia };
};

// Pasted material: forwarded shop emails, tracking pages, bank lines, invoices, delivery notes and tables.
type PasteKind = 'shipped' | 'order' | 'trackNeighbour' | 'trackStuck' | 'trackReturned' | 'bank' | 'bankTwice' | 'recipe' | 'standing' | 'standingNew' | 'route' | 'invoice' | 'deliveriesReturned' | 'deliveriesSigned' | 'classList' | 'classFull' | 'greenOffer' | 'decafOffer' | 'bagQuote' | 'bagPrices' | 'availability' | 'companyInvoice' | 'serviceReport' | 'grinderLoans' | 'stockCount' | 'priceList' | 'retailSheet' | 'trainingPlan' | 'marketInfo' | 'account' | 'shopMonth' | 'brewGuide' | 'packingLog';
interface Ctx {
	r: Rand;
	v: Record<string, string>;
	open: number;
	order?: Order;
	party: Party;
	/** The time of the message the paste goes into. */
	now: number;
}
const quote = (lines: string[]) => lines.map((line) => (line ? `> ${line}` : '>')).join('\n');
const table = (head: string[], align: string[], rows: string[][]) => [`| ${head.join(' | ')} |`, `| ${align.join(' | ')} |`, ...rows.map((row) => `| ${row.join(' | ')} |`)].join('\n');
const orderMail = (order: Order) =>
	quote([
		'**From:** Fernhill Roasters <orders@fernhill.example>',
		`**Subject:** Your Fernhill order ${order.id}`,
		`**Date:** ${dayMonth(order.placed)} 2026 at ${clock(order.placed + 1)}`,
		'',
		`Hello ${order.who.name},`,
		'',
		'Thank you for your order.',
		'',
		...order.lines.map((line) => `${line.qty} x ${line.product.name}: ${euros(line.qty * line.product.cents)}`),
		'',
		`Total: ${euros(order.cents)}`
	]);
const shippedMail = (order: Order) => {
	const shipped = order.shipped!;
	return quote([
		'**From:** Fernhill Roasters <orders@fernhill.example>',
		`**Subject:** Your Fernhill order ${order.id} has shipped`,
		`**Date:** ${dayMonth(shipped)} 2026 at ${clock(shipped)}`,
		'',
		`Hello ${order.who.name},`,
		'',
		shipped >= TRACKING_IN_EMAIL ? `Your order is on it's way. The tracking code is ${trackingCode(order)}.` : "Your order is on it's way."
	]);
};
const trackRows = (r: Rand, shipped: number, end: 'neighbour' | 'stuck' | 'returned', neighbour: string) => {
	const rows: string[][] = [];
	let t = shipped + int(r, 5, 40);
	const add = (status: string, gap: number) => {
		rows.push([stamp(t), status]);
		t += gap;
	};
	add('Parcel registered by the sender', int(r, 150, 280));
	add('Parcel received at the sorting centre', int(r, 400, 520));
	add('Parcel sorted', int(r, 60, 200));
	if (end === 'neighbour') {
		add('Parcel is on its way to the delivery area', int(r, 120, 200));
		add('The driver is on the way', int(r, 120, 300));
		add(`Delivered at the neighbours (no. ${neighbour})`, 0);
	} else if (end === 'stuck') {
		add('Parcel is at the depot', int(r, 1300, 1500));
		add('Parcel is at the depot', int(r, 1300, 1500));
		add('Parcel is being investigated', 0);
	} else {
		add('The driver is on the way', int(r, 100, 240));
		add('Address incomplete or incorrect, parcel could not be delivered', int(r, 900, 1100));
		add('Parcel is on its way back to the sender', int(r, 1200, 1500));
		add('Returned to the sender', 0);
	}
	return table(['When', 'Status'], ['---', '---'], rows);
};
const recipes = [
	['- Coffee: {g} g, ground at {clicks} clicks', '- Water: {w} g, from the kettle as soon as it clicks off', '- French press, four minutes, then I push the plunger down', '- No stirring'],
	['- {g} g of coffee in the V60 with a white paper filter', '- {w} g of water at about 92 degrees', '- Bloom with 40 g, then pour the rest in two goes', '- It drains in about 1:50', '- Grinder at {clicks} clicks'],
	['- Moka pot, the three-cup size, filled to the top of the basket', '- Hot water from the kettle in the bottom, just under the valve', '- Medium heat, lid open, off the heat when it starts to splutter', '- Grind about {clicks} clicks'],
	['- Espresso machine at home, double basket', '- {dose} g in, about {out} g out in {secs} seconds', '- Grinder on setting {setting}', '- I flush the group head before every shot']
];
const pasteOf = (x: Ctx, kind: PasteKind | undefined): string => {
	if (!kind) return '';
	const { r, v, order } = x;
	switch (kind) {
		case 'order':
			return orderMail(order!);
		case 'shipped':
			return shippedMail(order!);
		case 'trackNeighbour':
			return trackRows(r, order!.shipped!, 'neighbour', v.nn!);
		case 'trackStuck':
			return trackRows(r, order!.shipped!, 'stuck', '');
		case 'trackReturned':
			return trackRows(r, order!.shipped!, 'returned', '');
		case 'bank':
		case 'bankTwice': {
			const amount = `-${money(order!.cents / 100)}`;
			const day = numeric(order!.placed);
			const rows = [[day, 'FERNHILL ROASTERS UTRECHT', amount, kind === 'bank' ? 'Pending' : 'Booked'], [day, 'FERNHILL ROASTERS UTRECHT', amount, 'Booked']];
			const before = [numeric(order!.placed - DAY * int(r, 1, 2)), pick(r, ['ALBERT HEIJN 1428', 'NS GROEP IZ REIZIGERS', 'BOL.COM', 'JUMBO UTRECHT', 'ETOS 7731']), `-${money(int(r, 300, 6800) / 100)}`, 'Booked'];
			return table(['Date', 'Description', 'Amount', 'Status'], ['---', '---', '---:', '---'], [...rows, before]);
		}
		case 'recipe':
			return fill((v.brewer ? recipes[+v.brewer]! : pick(r, recipes)).join('\n'), { g: String(int(r, 14, 22)), w: String(int(r, 23, 34) * 10), clicks: String(int(r, 9, 30)), dose: String(int(r, 16, 20)), out: String(int(r, 30, 46)), secs: String(int(r, 18, 34)), setting: String(int(r, 3, 12)) });
		case 'standing':
		case 'standingNew': {
			const facts = cafeFacts(x.party.biz!);
			const changed = kind === 'standingNew';
			const kg = changed && v.kg2 ? +v.kg2 : facts.kg;
			const day = changed && v.change === 'day' ? v.newday! : facts.deliv;
			const rows = [['House Blend', '1 kg', String(kg), day], [facts.second, '1 kg', String(facts.secondKg), day]];
			if (changed && v.change === 'filter') rows.push(['Ethiopia Guji', '1 kg', v.small!, day]);
			const total = rows.reduce((sum, row) => sum + +row[2]!, 0);
			return `${table(['Coffee', 'Bag', 'Bags a week', 'Delivery'], ['---', '---', '---:', '---'], rows)}\n\n${changed ? `From ${v.date}: ${total} kg a week.` : `${total} kg a week in all.`}`;
		}
		case 'route': {
			const day = v.newday!;
			const regular = [...cafes, ...offices, ...delis].filter((biz) => biz !== x.party.biz && cafeFacts(biz).deliv === day).map((biz) => [biz.org, biz.area, String(cafeFacts(biz).kg + cafeFacts(biz).secondKg)]);
			const others = shuffle(r, [['Hotel Nieuwegracht', 'the city centre'], ['Restaurant Oost', 'Oudwijk'], ['Bakkerij Korenaar', 'Zuilen'], ['Lunchroom De Kas', 'Leidsche Rijn'], ['Theatercafé De Gaard', 'the city centre'], ['Sportpark kantine Maarschalkerweerd', 'Oudwijk']]).map(([org, area]) => [org!, area!, String(int(r, 3, 9))]);
			const stops = [...regular, ...others].slice(0, int(r, 6, 8)).map((stop, i) => [String(i + 1), stop[0]!, stop[1]!, `${pad(7 + Math.floor((i * 25) / 60))}:${pad((i * 25) % 60)}`, stop[2]!]);
			return `${day} round, as it is now:\n\n${table(['Stop', 'Customer', 'Where', 'Drop by', 'kg'], ['---:', '---', '---', '---', '---:'], stops)}`;
		}
		case 'invoice': {
			const facts = cafeFacts(x.party.biz!);
			const rows: string[][] = [];
			let subtotal = 0;
			v.deliveryDays!.split(',').forEach((day, i) => {
				const dn = `DN-${v.dns!.split(',')[i]}`;
				const house = facts.kg * wholesale.house;
				const second = facts.secondKg * facts.secondPrice;
				subtotal += house + second;
				rows.push([dateShort(+day), dn, 'House Blend', String(facts.kg), money(wholesale.house), money(house)]);
				rows.push([dateShort(+day), dn, facts.second, String(facts.secondKg), money(facts.secondPrice), money(second)]);
			});
			const vat = Math.round(subtotal * 9) / 100;
			return `Invoice ${v.invoice} · ${x.party.org} · ${v.invEnd}\n\n${table(['Date', 'Delivery note', 'Coffee', 'kg', 'Per kg', 'Amount'], ['---', '---', '---', '---:', '---:', '---:'], rows)}\n\nSubtotal ${money(subtotal)} EUR · VAT 9% ${money(vat)} EUR · Total ${money(subtotal + vat)} EUR · payment within 14 days`;
		}
		case 'deliveriesReturned':
		case 'deliveriesSigned': {
			const facts = cafeFacts(x.party.biz!);
			const signers = [x.party.first, pick(r, firstNames), pick(r, firstNames)];
			const rows = v.deliveryDays!.split(',').map((day, i) => {
				const dn = `DN-${v.dns!.split(',')[i]}`;
				const goods = `${facts.kg} kg House Blend, ${facts.secondKg} kg ${facts.second}`;
				if (kind === 'deliveriesReturned' && String(i) === v.badIndex) return [dn, dateLong(+day), `${goods}: wrong bags loaded, taken back`, '—'];
				return [dn, dateLong(+day), goods, pick(r, signers)];
			});
			return table(['Note', 'Date', 'Delivered', 'Signed by'], ['---', '---', '---', '---'], rows);
		}
		case 'classList':
		case 'classFull': {
			const places = kind === 'classFull' ? 8 : int(r, 2, 6);
			const rows: string[][] = [];
			let left = places;
			while (left > 0) {
				const seats = Math.min(left, int(r, 1, 2));
				left -= seats;
				const p = person(r);
				rows.push([p.name, String(seats), dateShort(x.open - int(r, 2, 30) * DAY), pick(r, ['in the shop', 'by email', 'by phone', 'gift voucher'])]);
			}
			return `Home brewing class, ${v.sat}, 10:00 to 12:30 (8 places):\n\n${table(['Name', 'Places', 'Booked', 'How'], ['---', '---:', '---', '---'], rows)}`;
		}
		case 'greenOffer':
		case 'decafOffer': {
			const lots = [
				['Colombia, Huila, Finca El Mirador', 'washed', '35 × 70 kg', 'spot', 'El Mirador'],
				['Colombia, Huila, La Plata growers’ group', 'washed', '20 × 70 kg', 'afloat', 'La Plata'],
				['Ethiopia, Guji, Hambela', 'natural', '24 × 60 kg', 'spot', 'Hambela natural'],
				['Ethiopia, Guji, Shakiso', 'washed', '30 × 60 kg', 'afloat', 'Shakiso'],
				['Brazil, Sul de Minas, Fazenda Boa Vista', 'pulped natural', '50 × 60 kg', 'spot', 'Brazil'],
				['Peru, Cajamarca, cooperative lot', 'washed', '40 × 69 kg', 'shipment December', 'Peru'],
				['Kenya, Nyeri, Gatomboya', 'washed', '12 × 60 kg', 'spot', 'Kenya'],
				['Guatemala, Huehuetenango, small producers', 'washed', '25 × 69 kg', 'afloat', 'Guatemala'],
				['Rwanda, Nyamasheke, Gitesi', 'washed', '18 × 60 kg', 'spot', 'Rwanda']
			];
			const offered = shuffle(r, lots).slice(0, int(r, 4, 6));
			v.lotPick = offered.slice(0, 2).map((lot) => lot[4]).join(' and the ');
			const rows = offered.map((lot) => [lot[0]!, lot[1]!, lot[2]!, money(int(r, 640, 1150) / 100), String(int(r, 83, 88) + pick(r, [0, 0.25, 0.5, 0.75])), lot[3]!]);
			if (kind === 'decafOffer') rows.unshift(['Colombia, Huila, decaffeinated with mountain water', 'washed, then decaffeinated', '15 × 70 kg', money(int(r, 980, 1090) / 100), '84.25', 'spot']);
			return `${table(['Lot', 'Process', 'Bags', 'EUR per kg', 'Score', 'Position'], ['---', '---', '---', '---:', '---:', '---'], rows)}\n\nPrices ex warehouse ${x.party.area}, excluding VAT. Samples on request.`;
		}
		case 'bagQuote':
		case 'bagPrices': {
			const items = [
				['Kraft valve bag, 250 g, printed one colour', 186, 1000],
				['Kraft valve bag, 1 kg, printed one colour', 312, 500],
				['Home-compostable valve bag, 250 g, unprinted', 241, 1000],
				['Home-compostable valve bag, 1 kg, unprinted', 398, 500],
				['Tin ties, gold, 10 cm', 21, 2000],
				['Labels, round, 60 mm, roll of 1,000', 48, 5]
			] as const;
			const rows = items.map(([item, cents, min]) => {
				const now = (cents * (100 + int(r, -4, 4))) / 100;
				return kind === 'bagPrices' ? [item, money(now), money((now * (100 + int(r, 5, 8))) / 100), String(min)] : [item, money(now), String(min), `${int(r, 2, 6)} weeks`];
			});
			return kind === 'bagPrices'
				? table(['Item', 'EUR per 1,000 now', 'From 1 January', 'Minimum order'], ['---', '---:', '---:', '---:'], rows)
				: table(['Item', 'EUR per 1,000', 'Minimum order', 'Lead time'], ['---', '---:', '---:', '---'], rows);
		}
		case 'availability': {
			const rows = dayNames.slice(1).concat('Sunday').map((day) => [day, r() < 0.3 ? 'not available' : pick(r, ['all day', 'from 12:00', 'until 14:00', 'from 16:00', 'mornings', 'from 9:30'])]);
			return table(['Day', 'Available'], ['---', '---'], rows);
		}
		case 'companyInvoice': {
			const rows = order!.lines.map((line) => {
				const rate = line.product === grinder ? 21 : 9;
				const gross = line.qty * line.product.cents;
				const net = Math.round(gross / (1 + rate / 100));
				return [line.product.name, String(line.qty), euros(net), `${rate}%`, euros(gross - net), euros(gross)];
			});
			return `Invoice ${v.invoice} · ${dayMonth(x.now)} 2026\nTo: ${v.company}, ${v.companyStreet}, VAT ${v.vat}\nFor order ${order!.id} of ${dayMonth(order!.placed)} 2026, paid\n\n${table(['Item', 'Qty', 'Excl. VAT', 'VAT', 'VAT amount', 'Incl. VAT'], ['---', '---:', '---:', '---:', '---:', '---:'], rows)}\n\nTotal ${euros(order!.cents)}, paid in full.`;
		}
		case 'serviceReport': {
			const rows = [
				['Drum bearings', pick(r, ['greased', 'checked, fine', 'slight play, keep an eye on it'])],
				['Burner and gas train', pick(r, ['cleaned and tested', 'nozzle replaced', 'checked, fine'])],
				['Afterburner', pick(r, ['cleaned, catalyst at end of life', 'cleaned', 'temperature probe replaced'])],
				['Chaff collector', pick(r, ['emptied, seal replaced', 'cleaned', 'door hinge loose, tightened'])],
				['Exhaust pipe', pick(r, ['swept, 3 mm of deposit', 'swept', 'swept, bend at roof heavily soiled'])],
				['Cooling tray', pick(r, ['stirring arm adjusted', 'checked, fine'])]
			];
			return `Last service, ${dayMonth(x.open - int(r, 300, 360) * DAY)} 2025:\n\n${table(['Part', 'Done'], ['---', '---'], rows)}`;
		}
		case 'grinderLoans': {
			const rows = shuffle(r, cafes)
				.slice(0, 6)
				.map((biz) => [biz.org, pick(r, ['espresso grinder, 64 mm burrs', 'espresso grinder, 75 mm burrs', 'batch brew grinder']), `${int(r, 2019, 2025)}`, pick(r, ['serviced in spring', 'burrs replaced last year', 'no service yet', 'serviced in January'])]);
			return table(['Café', 'Grinder on loan', 'Since', 'Notes'], ['---', '---', '---', '---'], rows);
		}
		case 'stockCount': {
			const rows = [
				['Colombia Huila, washed', `${int(r, 3, 9)} × 70 kg`],
				['Ethiopia Guji, natural', `${int(r, 2, 6)} × 60 kg`],
				['Brazil, for the House Blend', `${int(r, 4, 10)} × 60 kg`],
				['Guatemala, for the House Blend', `${int(r, 2, 6)} × 69 kg`]
			];
			return table(['Green coffee in the store', 'Bags'], ['---', '---'], rows);
		}
		case 'priceList':
			return `${table(['Coffee', 'Good for', 'EUR per kg', 'Bag'], ['---', '---', '---:', '---'], [
				['House Blend', 'espresso and milk drinks', money(wholesale.house), '1 kg'],
				['Colombia Huila', 'espresso, filter', money(wholesale.colombia), '1 kg'],
				['Ethiopia Guji', 'filter and batch brew', money(wholesale.ethiopia), '1 kg']
			])}\n\nPrices exclude VAT (9%). Delivery in the city is free with a standing order of 4 kg a week or more; a grinder on loan and staff training are included.`;
		case 'retailSheet':
			return `${table(['Coffee', 'Bag', 'Your price', 'Shop price'], ['---', '---', '---:', '---:'], [house250, house1000, ethiopia, colombia].map((p) => [p.name.replace(/ (250 g|1 kg)$/, ''), p.name.endsWith('1 kg') ? '1 kg' : '250 g', money(Math.round((p.cents * 2) / 3) / 100), money(p.cents / 100)]))}\n\nPrices include VAT. Invoiced monthly; delivered with the van on the café rounds.`;
		case 'trainingPlan':
			return table(['Time', 'What'], ['---', '---'], [
				['8:30', 'Coffee and introductions; how the House Blend is put together'],
				['8:45', 'Dialling in: dose, yield and time, and tasting the difference'],
				['9:30', 'Milk: texture, temperature and pouring'],
				['10:15', 'Cleaning the machine and the grinder at the end of the day'],
				['10:30', 'Questions, and a coffee for the road']
			]);
		case 'marketInfo':
			return table(['', ''], ['---', '---'], [
				['Date', v.marketDate!],
				['Hours', `${pick(r, ['11:00 to 18:00', '12:00 to 19:00', '10:00 to 17:00'])}, setting up from ${pick(r, ['8:30', '9:00'])}`],
				['Stall', `3 × 3 m, ${pick(r, ['gazebo provided', 'bring your own gazebo', 'under the covered hall'])}`],
				['Power', pick(r, ['16 A, one socket', 'two sockets, 230 V', '16 A, shared with the next stall'])],
				['Fee', '75 EUR, payable in advance'],
				['Visitors last year', `about ${int(r, 18, 45) * 100}`]
			]);
		case 'shopMonth': {
			const rows: string[][] = [];
			for (let d = nextOn(x.now + DAY, [4, 6]); rows.length < 7; d += DAY) {
				const date = at(d).getUTCDate();
				if (dow(d) === 4 && date <= 7) rows.push([dateLong(d), 'Cupping evening: taste six coffees side by side', '19:00 to 21:00', '25.00 EUR']);
				else if (dow(d) === 4) rows.push([dateLong(d), 'Roasting day: watch through the window', 'from 9:00', 'free']);
				else if (dow(d) === 6 && Math.floor((d - dayOf('2026-08-01')) / DAY / 7) % 2 === 0) rows.push([dateLong(d), 'Home brewing class: filter, French press and moka pot', '10:00 to 12:30', '35.00 EUR']);
				else if (dow(d) === 6) rows.push([dateLong(d), d >= dayOf('2026-10-01') ? 'Spiced filter coffee on the bar' : 'Cold brew on the bar', 'all day', '']);
				if (dow(d) === 0 && at(d).getUTCMonth() === 11) rows.push([dateLong(d), 'Christmas Sunday opening', '12:00 to 17:00', '']);
			}
			return `${table(['Day', 'What', 'When', 'Price'], ['---', '---', '---', '---:'], rows)}\n\nThe shop is open Wednesday to Saturday, 9:00 to 17:00. Classes are booked by email or in the shop and paid on the day.`;
		}
		case 'brewGuide':
			return table(['Brewer', 'Coffee', 'Water', 'Grind on our hand grinder', 'Time'], ['---', '---:', '---:', '---', '---'], [
				['French press', '30 g', '500 g', '24 to 26 clicks', '4 minutes, then press slowly'],
				['V60 or other pour-over', '15 g', '250 g', '16 to 20 clicks', '2:30 to 3:00 in all'],
				['Filter machine', '60 g', '1 litre', '18 to 22 clicks', 'as the machine runs'],
				['Moka pot (3 cups)', 'fill the basket level', 'to just under the valve', '12 to 15 clicks', 'off the heat as it splutters'],
				['Espresso', '18 g', '36 to 40 g out', 'too fine for the hand grinder to adjust well', '27 to 30 seconds']
			]);
		case 'packingLog': {
			const day = startOfDay(order!.shipped!);
			const parcels = book.filter((o) => o.shipped !== null && startOfDay(o.shipped) === day);
			const rows = parcels.map((o, i) => [o.id, o.lines.map((line) => `${line.qty} × ${line.product.name}`).join(', '), `${(o.lines.reduce((sum, line) => sum + line.qty * (line.product === grinder ? 890 : line.product === house1000 ? 1060 : 275), 0) + 180) / 1000} kg`, trackingCode(o), clock(day + 14 * 60 + 20 + i * int(r, 6, 14))]);
			return `Packing log, ${dateLong(day)} (PostNL collection at 16:30):\n\n${table(['Order', 'Contents', 'Weight', 'Label', 'Packed'], ['---', '---', '---:', '---', '---'], rows)}`;
		}
		case 'account': {
			const facts = cafeFacts(x.party.biz!);
			const monthly = (facts.kg * wholesale.house + facts.secondKg * facts.secondPrice) * 1.09 * 4.3;
			const rows = [3, 2, 1].map((back) => {
				const m = at(x.open).getUTCMonth() - back;
				const late = back === 1 && r() < 0.3;
				return [`FR-2026-${String(300 + m * 40 + (hash(x.party.org) % 37)).padStart(4, '0')}`, monthNames[m]!, `${money(monthly * (0.9 + r() * 0.2))} EUR`, late ? 'open' : `paid ${int(r, 5, 20)} ${monthNames[m + 1]!.slice(0, 3)}`];
			});
			return `${x.party.org}, café account since ${2019 + (hash(x.party.org) % 6)}. Standing order: ${facts.kg} kg House Blend and ${facts.secondKg} kg ${facts.second}, delivered on ${facts.deliv}s.\n\n${table(['Invoice', 'Month', 'Amount', 'Status'], ['---', '---', '---:', '---'], rows)}`;
		}
	}
};

/** Fills {placeholders}; a placeholder without a value is a mistake in this file, so it throws. */
const fill = (text: string, values: Record<string, string>) =>
	text.replace(/\{(\w+)\}/g, (_, key: string) => {
		const value = values[key];
		if (value === undefined) throw new Error(`No value for {${key}} in: ${text.slice(0, 80)}`);
		return value;
	});

// Who speaks: the outside party, the topic's staff member (reply or internal note), the second staff member
// (reply or note), or the party's mailbox answering by itself.
type Who = 'c' | 's' | 'S' | 'n' | 'N' | 'o';
type Msg = [Who, string];
type Area = 'online' | 'wholesale' | 'shop' | 'supplier' | 'other';
interface Path {
	/** The openings, by index, that the path can follow; any when left out. */
	opens?: number[];
	/** Whether the path fits the thread's values, such as which change a café asks for. */
	when?: (v: Record<string, string>) => boolean;
	/** The first and last day, as YYYY-MM-DD, on which a thread can take this path. */
	since?: string;
	until?: string;
	/** The party's answer to the staff member's question; left out when they never answer it. */
	detail?: string[];
	paste?: PasteKind;
	/** An internal note after the answer, with what was found. */
	look?: string[];
	lookPaste?: PasteKind;
	/** A note from the second staff member after the first one's. */
	second?: string[];
	/** Days that pass before the ending, for endings that follow a visit or a delivery. */
	gap?: [number, number];
	ends: Msg[][];
}
interface Topic {
	/** For the generator's own bookkeeping; nothing of it is written. */
	key: string;
	area: Area;
	party: PartyKind;
	staff: StaffKey;
	second: StaffKey;
	since?: string;
	until?: string;
	/** A request that cannot wait: no small talk, no second matter, and a quick reply. */
	urgent?: boolean;
	/** At most this many threads on the topic. */
	max?: number;
	/** The thread is about an online order: shipped `min` to `max` days before, or placed that day. */
	order?: { from: 'shipped' | 'placed'; min: number; max: number; grinder?: boolean };
	subjects: string[];
	open: string[];
	more?: string[];
	/** Pasted under the opening message. */
	shows?: PasteKind;
	showsIntro?: string[];
	/** The staff member's first reply, a question; left out when the first reply is the ending. */
	ask?: string[];
	paths: Path[];
	values?: (x: Ctx) => void;
	/** Pasted, with one of its intros, under the first reply of the ending, in a share `p` of threads. */
	reply?: { kind: PasteKind; intro: string[]; p: number };
	/** Pasted under the internal note, in addition to the path's own paste, in a share `p` of threads. */
	note?: { kind: PasteKind; p: number };
}

const greetings = ['Hi', 'Hello', 'Hi there', 'Dear Fernhill Roasters', 'Hello Fernhill', 'Hoi', 'Good morning', 'Hi Fernhill team', 'Dear all', 'Hi all'];
const replySign = ['{first}', 'All the best,\n{first}', 'Cheers,\n{first}', 'Groetjes,\n{first}', '{first}'];
const casualSign = ['Thanks,\n{first}', 'Thank you!\n{first}', 'Groetjes,\n{first}', 'Best,\n{name}', 'Cheers,\n{first}', 'Thanks in advance,\n{name}', '{first}', 'All the best,\n{first}'];
const formalSign = ['Kind regards,\n{name}\n{role}, {org}', 'Best regards,\n\n{name}\n{org}', 'With kind regards,\n\n{name}\n{role} · {org}'];
const bizSign = ['Thanks!\n{first}\n{org}', 'Groetjes,\n{first} ({org})', 'Thanks,\n{name}\n{org}', 'Cheers,\n{first}, {org}'];
const footers = ['Sent from my iPhone', 'Sent from my phone, excuse the typos', 'Verstuurd vanaf mijn telefoon'];
const staffSign = ['{me}\n{line}', 'Best wishes,\n{me}', 'Groetjes,\n{me}\n{line}', 'Thanks,\n{me}', 'Kind regards,\n{me} {meLast}\n{line}', 'All the best,\n{me}'];
const acks = ['Thanks for getting in touch.', 'Thanks for your email.', 'Thank you for writing.', 'Thanks for letting us know.', '', ''];
const chasers = ['Hi again, any news on this?', 'Just checking you got my last email.', 'Sorry to chase, but I haven’t heard back yet.', 'Any update? No stress, just wondering.', 'Hello, is there any news? I don’t want it to fall through the cracks.'];
const holding = [
	'Thanks, {first}. I need to check with {other} first, and I’ll come back to you by {day}.',
	'Let me look into this properly; I’ll get back to you on {day}.',
	'I’m checking with {other} and will write as soon as we’ve talked.',
	'Got it, thank you. I’m looking into it and will be in touch by {day} at the latest.'
];
const outOfOffice = [
	'Thank you for your email. I am out of the office until {back} and will reply when I’m back. For anything urgent, please call us.',
	'Automatic reply: I’m on leave until {back}. Your email will not be forwarded, but I will read it when I return.',
	'Thanks for your message! I’m away until {back} with very little access to email.'
];

interface Side {
	q: string;
	a: string;
	then?: string;
}
const personSides: Side[] = [
	{ q: 'Unrelated, but are you open on Sundays? I keep coming by on a Sunday and finding the door shut.', a: 'Sundays: no, I’m afraid. The roastery shop is open Wednesday to Saturday, 9 to 5, and on the Sundays in December before Christmas.', then: 'Good to know about the Sundays in December.' },
	{ q: 'Also, do you sell gift vouchers? My sister’s birthday is coming up.', a: 'Gift vouchers: yes, in the roastery shop, for any amount from 10 EUR. They’re not in the online shop, but we can post one if you pay by bank transfer.', then: 'I’ll pick up a voucher next time I’m in.' },
	{ q: 'Can I bring the empty bags back to you? It feels wasteful to throw them away.', a: 'Empty bags: yes please. There’s a box by the shop door, and our bag supplier takes them back and recycles the valves and the foil separately.' },
	{ q: 'While I have you: which of your coffees would you recommend for a moka pot?', a: 'For a moka pot I’d go for the Colombia Huila: it stays sweet and chocolatey when it’s brewed strong.', then: 'I’ll try the Colombia in the moka pot.' },
	{ q: 'Is the House Blend good as espresso, or is it more of a filter coffee?', a: 'The House Blend was made for espresso first, but it’s good in a filter too. Most of the cafés we supply use it for their espresso.' },
	{ q: 'Do you have a stamp card or anything like that in the shop?', a: 'A stamp card: yes, in the roastery shop. Every tenth 250 g bag is free; ask for a card at the counter.' },
	{ q: 'Is there somewhere to park near the roastery?', a: 'Parking: there are paid spaces on the street right outside, free after 18:00 and on Sundays. Most people come by bike.' },
	{ q: 'Are your coffees organic, by the way?', a: 'Organic: the Ethiopia Guji is certified; the others aren’t, but we buy them from the same importers every year and know where they come from.' },
	{ q: 'How long do the beans keep once the bag is open?', a: 'Once the bag is open, the beans are at their best for about three weeks if you squeeze the air out and close it with the tin tie. No need for the fridge.' },
	{ q: 'Can I come and watch you roast some time?', a: 'Roasting: we roast on Tuesday and Thursday mornings, and you can watch through the window from the shop. Thursday is the better day, as the shop is open then.', then: 'I’ll come by on a Thursday to watch the roasting.' },
	{ q: 'Do you sell green beans? A friend roasts at home in an old popcorn machine.', a: 'Green beans: not usually, but Marit can spare a kilo or two of the Colombia. Ask in the shop; it’s 12.00 EUR a kilo.' },
	{ q: 'Is the hand grinder any good for espresso?', a: 'For espresso the hand grinder isn’t ideal: it goes fine enough, but small changes are hard to make. It’s at its best for filter, French press and moka pot.' },
	{ q: 'One more question: is the 1 kg bag the same coffee as the 250 g, just bigger?', a: 'The 1 kg House Blend is exactly the same coffee as the 250 g bag, from the same roasts. It works out cheaper per gram and keeps fine if you decant some into a jar.' },
	{ q: 'Do you take cards in the shop? I never carry cash.', a: 'Cards: yes, the shop takes cards and phone payments, and cash if you have it.' },
	{ q: 'Is it alright to bring the dog into the shop?', a: 'Dogs are very welcome in the shop; there’s a water bowl by the door.', then: 'The dog says thank you.' },
	{ q: 'What’s the difference between the Ethiopia and the Colombia, in plain words?', a: 'In plain words: the Ethiopia is fruity and light, a bit like tea with blueberries; the Colombia is rounder, with chocolate and caramel. If you take milk, the Colombia.' }
];
const bizSides: Side[] = [
	{ q: 'Separately: could you send the {prevMonth} invoice again? Our bookkeeper says she never got it.', a: 'I’ve sent the {prevMonth} invoice again, to you and to your bookkeeper.', then: 'The invoice has arrived, thanks.' },
	{ q: 'And could the driver use the back door? He keeps coming to the front in the middle of service.', a: 'I’ve told Youssef about the back door and put a note on the delivery sheet.' },
	{ q: 'One more thing: are you closed between Christmas and New Year? We need to plan our order.', a: 'Christmas: we roast as usual until 23 December and again from 5 January. Deliveries in Christmas week move a day earlier; I’ll confirm the dates in December.' },
	{ q: 'Also, the tamper you lent us has a crack in the handle. No hurry, but could you bring a new one some time?', a: 'I’ll bring a new tamper with your next delivery.', then: 'Thanks for the tamper.' },
	{ q: 'Could we have a few of the little cards about the coffee for the counter? Customers keep asking where it comes from.', a: 'I’ll put a stack of the coffee cards in with the next delivery.' },
	{ q: 'By the way, what is your VAT number? Our accountant asks.', a: 'Our VAT number is NL861427553B01; it’s at the bottom of every invoice too.' },
	{ q: 'Is there a minimum for a top-up order mid-week? We sometimes run short on Fridays.', a: 'Top-ups: no minimum, but they go with the next van round, so let us know by the afternoon before.' }
];
const tangents: [string, string][] = [
	['We met at the Oudwijk street fair in June, by the way; you gave me a taste of the Guji.', 'I remember the street fair well: it rained all afternoon and we sold out of cold brew anyway.'],
	['Your shop smells amazing every time I cycle past.', 'Thank you! Roasting days are the best for that.'],
	['A friend who works at Café Brandpunt introduced me to your coffee.', 'Say hello to your friend from us!'],
	['Sorry for the long email, I’m on a train with nothing else to do.', 'No need to apologise for a long email!'],
	['I tried the Colombia for the first time last month and it’s my new favourite.', 'Glad you like the Colombia; it’s ours too this season.'],
	['I hope this is the right address; it’s the only one on your website.', 'This is the right address: it reaches all of us.'],
	['My English is not perfect, I hope this is clear.', 'Your English is perfectly clear.']
];
const intros: Record<'person' | 'business' | 'formal', string[]> = {
	person: [
		'I’ve been buying your beans for about a year, first at the Saturday shop and now online.',
		'We live in {area} and walk past the roastery most weekends.',
		'I’m fairly new to proper coffee, so forgive me if this is an obvious question.',
		'My partner and I got hooked on your Colombia after a friend brought us a bag.',
		'I hope you don’t mind me writing to this address.',
		'I’m one of the regulars in the shop on Saturdays, the one who always asks for the Ethiopia.',
		'A colleague who swears by your House Blend gave me this address.'
	],
	business: ['Hope all is well at the roastery!', 'Busy week here: the students are back and the terrace is still full.', 'Quick one from us, in between customers.', 'Hope you had a good summer.', 'All good here, the new menu is going down well.'],
	formal: ['I hope this email finds you well.', 'Thank you for your time on the phone last week.', 'I hope all is well in Utrecht.']
};
const closings = ['Let me know if there’s anything else.', 'Speak soon.', 'Any questions, just reply here.', 'Have a good week.', 'Hope that helps.'];
const personTalks: Msg[][] = [
	[['c', 'Oh, and something else: is there room at the cupping evening on the first Thursday of {month}? I went in the spring and loved it.'], ['s', 'The cupping evening: yes, there’s room on the first Thursday of {month}, 19:00 to 21:00, 25.00 EUR. Shall I put your name down?'], ['c', 'Yes please, just me.'], ['s', 'Done, you’re on the list.']],
	[['c', 'Another question while I have you: my brother is getting married in {month} and they want coffee as favours for the guests, about 80 tiny bags. Is that something you’d do?'], ['s', 'For the wedding favours: we can’t fill bags that small ourselves, but we can roast 4 kg of whatever they like and they can fill the bags with it. Ask them to get in touch with Daan.'], ['c', 'Thanks, I’ll pass that on.']],
	[['c', 'Also, my grinder at home is an old blade one. Is your hand grinder much better, honestly?'], ['s', 'Honestly, yes: a blade grinder chops the beans into dust and chunks, while the hand grinder crushes them evenly between two burrs. The difference is bigger than between our coffees!'], ['c', 'Sold. I’ll get one next time.']],
	[['c', 'And a silly one: why do your bags have a little round valve on the front?'], ['s', 'Not silly at all: fresh coffee gives off gas for days after roasting. The valve lets it out without letting air in, so the bag doesn’t puff up and the beans stay fresh.'], ['c', 'I always wondered. Thanks!']],
	[['c', 'Last thing: do you have a coffee that isn’t too strong for my mother? She finds most coffee bitter.'], ['s', 'For your mother I’d try the Ethiopia Guji: it’s light and fruity, with hardly any bitterness, especially as filter coffee.'], ['c', 'I’ll get her a bag.']],
	[['c', 'By the way, could I book a table in your shop for a small birthday coffee morning, eight people, on a Saturday?'], ['s', 'On Saturdays the shop is too busy to keep a table free, I’m afraid, but a private class on a Thursday afternoon or a Sunday morning works well for groups. Would that be of interest?'], ['c', 'Hmm, maybe. I’ll think about it.']],
	[['c', 'Also, I bought a 1 kg bag in the shop last month and can’t finish it in time. Can I freeze it?'], ['s', 'Freezing works well if you divide it into portions for a week each in airtight bags, and take out one portion at a time without letting it thaw and refreeze.'], ['c', 'Great tip, thanks.']],
	[['c', 'Oh, and is the House Blend the one they use at Café Brandpunt? I love their flat white.'], ['s', 'Yes, Café Brandpunt uses our House Blend for all their espresso drinks.'], ['c', 'Then that’s what I’m buying!']],
	[['c', 'One more question: do you still have the cold brew you sold in the summer?'], ['s', 'The cold brew was a summer thing, I’m afraid; it’ll be back in May. In winter Daan does a spiced filter coffee on Saturdays instead.'], ['c', 'I’ll have to try that.']],
	[['c', 'And can I pay for a class with a gift voucher I got for my birthday?'], ['s', 'Yes, the gift vouchers can be used for everything in the shop, classes included.'], ['c', 'Perfect.']],
	[['c', 'Unrelated question: my partner has started roasting at home in a frying pan, and the results are, let’s say, mixed. Is there any way he could see a real roast?'], ['s', 'Tell him to come on a Thursday morning: if it’s quiet, Marit is happy to talk him through a batch from the start, and he’ll see why the pan is such hard work.'], ['c', 'He’ll be thrilled, thank you.']],
	[['c', 'Also, I noticed the House Blend tastes a bit different from the bag I bought in spring. Has it changed?'], ['s', 'Well spotted: we change one of the coffees in the blend when a new crop comes in. Since August it has a Guatemalan coffee in it instead of a Peruvian one, which makes it a little rounder. The idea is that it stays recognisably the same blend.'], ['c', 'I like it even more, so no complaints.']],
	[['c', 'While I have you: what water do you use in the shop? Our tap water is very hard and I wonder whether it matters.'], ['s', 'It matters more than people think. In the shop we use filtered water; at home an ordinary filter jug already makes a big difference with hard water, and it’s kinder to your kettle too.'], ['c', 'I’ll dig out the old filter jug.']],
	[['c', 'Also, do you sell the little scales you use in the shop for weighing coffee?'], ['s', 'We don’t sell scales, I’m afraid, but any kitchen scale that weighs to the gram will do. Ours came from the kitchen shop around the corner.'], ['c', 'OK, I’ll have a look there.']],
	[['c', 'Oh, one more thing: do you have paper filters for a V60? The supermarket here doesn’t sell them.'], ['s', 'We do: packs of 100 white filters for 6.50 EUR in the shop. They’re not in the online shop, but I can put a pack in with your next order if you ask in the email.'], ['c', 'Yes please, next time.']],
	[['c', 'Also, someone told me you give a discount if I bring my own tin. Is that true?'], ['s', 'Not quite: we don’t sell loose coffee, so there’s nothing to put in a tin. What we do have is the stamp card, and the box for empty bags by the door.'], ['c', 'Ah, I must have mixed you up with the tea shop.']]
];
const bizTalks: Msg[][] = [
	[['c', 'Separate question: could you bring a few 250 g bags of the Ethiopia with the next delivery? Customers keep asking whether they can buy the coffee to take home.'], ['s', 'Happy to. How many would you like? They’re at the shop price less a third, so you can sell them at the shop price.'], ['c', 'Let’s start with six.'], ['s', 'Six Ethiopia 250 g with the next delivery, then.']],
	[['c', 'And one more thing: our milk supplier has stopped delivering in the city. Do you know anyone good for organic milk?'], ['s', 'Several of our cafés use the dairy farm in Groenekan; they deliver twice a week. I’ll send you their number.'], ['c', 'Brilliant, thank you.']],
	[['c', 'Also, could we have the invoices by email only from now on, to our bookkeeper?'], ['s', 'Done: the invoices go to your bookkeeper by email from now on, and the paper copy stops.'], ['c', 'Thanks!']],
	[['c', 'While I have you: can the delivery come before 8:00 during the Christmas market weeks? The street is closed to traffic after 8.'], ['s', 'For the market weeks: yes, Youssef can come before 8:00. Let me know the exact dates nearer the time.'], ['c', 'Will do.']],
	[['c', 'Oh, and our new barista wants to know the recipe you use for the House Blend as espresso.'], ['s', 'For the House Blend we use 18 g in, about 38 g out, in 27 to 30 seconds, at 93 degrees. Start there and taste.'], ['c', 'Passing it on, thanks.']],
	[['c', 'Also: could I bring my team to the roastery one afternoon? They’d love to see where the coffee comes from.'], ['s', 'Of course: bring them any Thursday afternoon, after the roasting. Marit loves showing people round.'], ['c', 'Great, I’ll pick a date with them.']],
	[['c', 'One more thing: the labels on the bags look a bit different lately. Has anything changed in the blend?'], ['s', 'Nothing has changed in the House Blend itself; we only have a new label printer, which is why the label looks a little different.'], ['c', 'Good, just checking!']],
	[['c', 'Also, is it possible to get a few empty jute sacks? We want to use them as decoration in the window.'], ['s', 'Of course: we have a pile of them from the green coffee. I’ll put five in with the next delivery.'], ['c', 'Lovely, thanks!']],
	[['c', 'Another thing: one of our regulars asked whether your coffee is fair trade. What should we tell her?'], ['s', 'Tell her we buy through two importers who pay well above the fair trade minimum and tell us which farms the coffee comes from. Only the Ethiopia has a certificate, the organic one; for the rest it’s the importers’ own direct relationships. I can send you a short text for the menu if that helps.'], ['c', 'A short text would be great.'], ['s', 'Here you are: “Our coffee is roasted in Utrecht by Fernhill Roasters, who buy directly through importers that know every farm by name.” Change it as you like.']],
	[['c', 'Also, the delivery driver last week was someone new. Is Youssef alright?'], ['s', 'Youssef is fine, he was on holiday for a week. Marit drove the van in the meantime, and he’s back on the round now.'], ['c', 'Glad to hear it, say hi from us.']],
	[['c', 'Quick one: could we pay by direct debit instead of transfer from now on? It saves us remembering.'], ['s', 'Yes: I’ll send you the direct debit form. Once it’s signed, we take the amount ten days after each invoice.'], ['c', 'Great, I’ll sign it as soon as it arrives.']],
	[['c', 'Also, would you have a spare bag of the House Blend for a staff tasting we’re doing on Monday? I can pay for it with the next invoice.'], ['s', 'Of course: a 1 kg bag goes with Youssef on the next round, on the invoice as normal.'], ['c', 'Thanks!']]
];
const supplierTalks: Msg[][] = [
	[['c', 'On another matter: we are holding an open day at our warehouse on Friday 27 November. You and your team are very welcome.'], ['s', 'Thank you for the invitation. I’ll try to come, and I may bring Femke.']],
	[['c', 'Also, our invoice of last month is still open in our books. Could you check whether it has been paid?'], ['s', 'I’ve checked: it was paid on the 3rd, and I’ve sent you the payment confirmation.'], ['c', 'Found it, thank you.']],
	[['c', 'By the way, our bank details change from 1 December; the new account number will be on every invoice from then on. Please update your records.'], ['s', 'Thanks for the warning. I’ve updated your details in our bookkeeping from 1 December.']],
	[['c', 'And please note our new opening hours for collections in December: we close at 15:00 on Fridays.'], ['s', 'Noted, thank you.']]
];
const otherTalks: Record<string, Msg[][]> = {
	press: [
		[['c', 'Could you also send a photo of the roastery, ideally with the roaster in it? Landscape, as large as you have.'], ['s', 'I’ve attached three photos: the roaster, the shop, and the green coffee store. Use whichever you like, credit “Fernhill Roasters”.'], ['c', 'Perfect, thank you.']],
		[['c', 'One more question: how do you spell your surname, and what is your exact role?'], ['s', 'Marit Hoekstra, owner and head roaster.']]
	],
	charity: [
		[['c', 'Would you mind if we put your name on the poster as one of the sponsors?'], ['s', 'Not at all, that would be lovely.']],
		[['c', 'Could you also send a few lines about the shop for the programme booklet?'], ['s', 'Here you are: “Fernhill Roasters roasts coffee in small batches in Utrecht. Come and watch on a Thursday morning, or join a brewing class on Saturday.”'], ['c', 'Thank you, that’s perfect.']]
	],
	market: [
		[['c', 'Do you need a parking permit for your van on the day? We have a few for stallholders.'], ['s', 'Yes please, one permit for the van would be great.'], ['c', 'I’ll put it in the post with the stall number.']],
		[['c', 'Also, will you need a water connection for the coffee machine?'], ['s', 'No, we bring our own water. Power is what we need.']]
	],
	applicant: [
		[['c', 'May I ask what the hourly pay is, and whether the job includes Sundays?'], ['s', 'It’s 14.50 EUR an hour, and no Sundays except four in December.'], ['c', 'Thank you, that sounds good.']],
		[['c', 'Also, I don’t have a barista certificate. Is that a problem?'], ['s', 'Not at all: we train everyone ourselves.']]
	],
	student: [
		[['c', 'Could I mention Fernhill by name in my report, or would you prefer to stay anonymous?'], ['s', 'You can use our name, as long as you send us the part you write about us before you hand it in.'], ['c', 'Of course, I’ll send it.']]
	],
	organiser: [],
	neighbour: [[['c', 'Also, the van sometimes blocks our driveway in the mornings. Could the driver park a bit further up?'], ['s', 'I’m sorry about that. I’ve asked Youssef to use the loading space in front of the roastery from now on.'], ['c', 'Thank you.']]]
};
const contexts: Record<'person' | 'business', string[]> = {
	person: [
		'We work from home three days a week now, so we get through far more coffee than we used to.',
		'Since the baby arrived, coffee is more or less what keeps this household going.',
		'I only drink one cup a day, so it has to be a good one.',
		'We have a small espresso machine at home that my husband looks after like a pet.',
		'I’ve started making coffee for my colleagues on Monday mornings, and they’ve become quite demanding.',
		'My father was a coffee buyer for forty years, and even he likes your Guji.',
		'We moved here from Lisbon last year, and good coffee was the first thing I went looking for.',
		'I’m trying to drink less but better coffee this year.'
	],
	business: [
		'We’ve just taken on two new people for the winter.',
		'The terrace closes at the end of the month, so things should quieten down a little.',
		'We’re doing a lot of lunches for offices at the moment, which means more coffee too.',
		'The new menu has been out for three weeks and the coffee is selling better than ever.',
		'It’s been a mad few weeks with the students back.'
	]
};

// Topics. A thread follows one path of one topic, with a second matter and a remark mixed in. Nothing about its
// topic, its area or how it ended is written into the file except through the messages themselves.
const decafNews = (when: number) =>
	when < DECAF_BOUGHT
		? pick(mulberry32(when), [
				'Not yet, but you’re not the first to ask. We’re tasting decaf samples from two importers at the moment, and if one of them is good enough we’ll roast it this autumn.',
				'Not at the moment. We’ve never found a decaf we were happy to put our name on, but there are samples on the tasting table right now, so it may well happen this autumn.'
			])
		: pick(mulberry32(when), [
				'Not yet, but very soon: we’ve bought a Colombian decaf, decaffeinated with water rather than solvents, and the trial roasts are going well. It should be in the online shop in November.',
				'Almost: there are sacks of a Colombian decaf in our store room, and we’re roasting trial batches every Thursday. The plan is to have it in the online shop in November, as a Decaf Blend in 250 g bags.'
			]);

/** Only one importer offers the decaf lot that Marit buys. */
let decafOffered = false;

const topics: Topic[] = [
	{
		key: 'parcel',
		note: { kind: 'packingLog', p: 0.5 },
		area: 'online',
		party: 'person',
		staff: 'youssef',
		second: 'marit',
		order: { from: 'shipped', min: 2, max: 8 },
		subjects: ['Where is my order?', 'Order {order} not arrived', 'Still waiting for my coffee', 'Parcel?', 'Has my order been sent?'],
		open: [
			'I ordered on {orderDate} ({order}) and had the email saying it was on its way, but nothing has arrived. {trackline} Could you tell me where it is?',
			'My order {order} still hasn’t come. It’s a birthday present for my partner and the birthday is on {day}, so I’m getting a bit nervous. {trackline}',
			'Quick one: has order {order} actually been sent? I got the shipped email on {shipDay}, but I’ve been working from home all week and nobody has rung the bell. {trackline}'
		],
		more: ['I paid on the same day, so it isn’t the payment as far as I can tell.', 'A friend who orders from you says parcels usually come the next day, which is why I’m asking.', 'It’s only {items}, so I know it’s not the end of the world.'],
		shows: 'shipped',
		showsIntro: ['This is the email I got:', 'For reference, the email:', 'Here is the shipping email:'],
		ask: [
			'Sorry it hasn’t turned up yet. Parcels from us go with PostNL; I’ll look it up now. Could you confirm the address it should have gone to? Something may have gone wrong there.',
			'Thanks for letting us know, and sorry for the wait. I’m checking with PostNL now. Could you also ask your neighbours and tell me the delivery address? PostNL often leaves parcels next door without a card.'
		],
		paths: [
			{
				detail: ['The address is right: {street}. I’ll knock on a few doors tonight.', 'Yes, {street} is correct. I didn’t get a card, but I’ll ask around.'],
				look: ['PostNL {code}: delivered {shipNext}, to the neighbours at no. {nn}, signed “{sig}”.', 'Tracking {code} says delivered next door, no. {nn}, on {shipNext}.'],
				lookPaste: 'trackNeighbour',
				ends: [
					[['s', 'Good news: PostNL says it was delivered on {shipNext} to number {nn}, signed by “{sig}”. The tracking code is {code} if you want to check. Could you try them?'], ['c', 'Found it! Number {nn} had it in their hallway the whole time and forgot to tell me. Thanks for checking, and sorry for the fuss.']],
					[['s', 'It was delivered next door, at number {nn}, on {shipNext}. Tracking code for reference: {code}.'], ['c', 'Got it, thank you. My neighbour was very apologetic.'], ['s', 'Glad it turned up. Enjoy the coffee!']]
				]
			},
			{
				detail: ['The address is {street}. Nobody nearby has it, I’ve asked on both sides.', '{street}, that’s right. None of the neighbours has it.'],
				look: ['{code} stuck at the depot since {shipNext}. Opened an enquiry with PostNL; they can’t find it. We send a new one.'],
				lookPaste: 'trackStuck',
				ends: [
					[['s', 'I’m sorry: the parcel has been sitting at the PostNL depot since {shipNext} and now they can’t find it. We’ll send a new one with the next roast, so it should reach you on {arrive}. You don’t need to do anything.'], ['c', 'That’s kind, thank you. I’ll let you know when it arrives.']],
					[['s', 'Sorry for the trouble: PostNL has lost it somewhere at the depot. I’ve sent a new parcel today; the tracking code is {code2}. If the first one turns up after all, keep it with our compliments.'], ['c', 'The new one came this morning, thank you! Lovely coffee as always.']]
				]
			},
			{
				detail: ['Oh. I may have typed our old address: we moved last month. The new one is {street}.', 'Hmm, it should be {street}, but now I think about it, my browser fills in the old flat automatically.'],
				look: ['{code} came back to us yesterday: address unknown. The parcel is on the shelf in the packing room.'],
				lookPaste: 'trackReturned',
				ends: [
					[['s', 'That explains it: PostNL couldn’t deliver to the old address and the parcel came back to us yesterday. I can send it again to {street}, or you can collect it from the roastery shop, Wednesday to Saturday, 9 to 5. Which would you prefer?']],
					[['s', 'That’s it: the parcel went to the old address and came back here. Shall I post it again to {street}, or would you rather pick it up from the shop?'], ['c', 'I’ll pick it up on Saturday, that’s easiest.'], ['s', 'It’s behind the counter with your name on it.']]
				]
			},
			{
				detail: ['Never mind! It arrived this morning, just after I wrote. Sorry to bother you.', 'Ignore me, it was delivered an hour ago. PostNL was just slow.'],
				ends: [[['s', 'No bother at all. PostNL was slower than usual this week. Enjoy the coffee!']], [['s', 'Glad it’s there. Enjoy!'], ['c', 'Already on my second cup.']]]
			}
		],
		values: (x) => {
			const o = x.order!;
			x.v.trackline =
				o.shipped! >= TRACKING_IN_EMAIL
					? pick(x.r, ['The tracking code in the email says it’s been sorted, and nothing since.', 'The tracking page hasn’t changed in days.'])
					: pick(x.r, ['There’s no tracking code in the email, so I can’t check myself.', 'The email doesn’t give a tracking number, so I have no idea where to look.', 'There’s no track and trace in the email, which would have helped.']);
		}
	},
	{
		key: 'damaged',
		note: { kind: 'packingLog', p: 0.5 },
		area: 'online',
		party: 'person',
		staff: 'youssef',
		second: 'marit',
		order: { from: 'shipped', min: 1, max: 6 },
		subjects: ['Damaged parcel', 'Bag split open', 'Coffee everywhere', 'Problem with order {order}', 'Arrived broken'],
		open: [
			'My order arrived today, but the bag of {coffee} had split along the bottom and the beans were loose in the box. The rest is fine.',
			'The parcel for order {order} came this afternoon and the box was crushed on one side. The valve on the {coffee} bag has popped out and the bag is half empty.',
			'Just opened my parcel and there’s coffee all over the inside of the box. The {coffee} bag has a tear near the top; it looks as if something sharp went through the cardboard.'
		],
		more: ['I don’t want to make a big deal of it, but I’d rather not drink beans that have been rolling around in a cardboard box.', 'It was meant as a present, which makes it a bit awkward.', 'The box had a PostNL sticker on it saying “damaged in transit, repacked”, for what it’s worth.'],
		ask: [
			'I’m sorry, that’s not how it should arrive. Could you send a photo of the bag and the box? It helps us with the claim to PostNL and tells us whether our packing is to blame.',
			'Thank you for telling us, and sorry. Would you mind sending a photo or two of the box and the bag? Then we’ll sort out a new bag straight away.'
		],
		paths: [
			{
				detail: ['Photos attached: the box, and the split bag.', 'Here you go, two photos. The cardboard is torn right through at the corner.'],
				look: ['Photos: box crushed at the corner, tear right through the bag. Damage on the way, not our packing. Claim filed with PostNL, ref. {claim}. Replacement goes with the next roast.'],
				ends: [
					[['s', 'Thanks, that’s clearly damage on the way. A new bag of {coffee} goes out on {ship} with the next roast. Keep or bin the old one, whichever you like.'], ['c', 'It arrived today, perfectly fine this time. Thanks for the quick help!']],
					[['s', 'Thank you, the photos say it all: the box took a knock somewhere at PostNL. A new {coffee} goes out on {ship}.'], ['c', 'Thank you, very kind.']]
				]
			},
			{
				detail: ['Photos attached. The box looks fine actually, it’s just the bag.', 'Two photos attached. Funny thing is, the box isn’t damaged at all.'],
				look: ['Photos show the bottom seam of the bag split, box fine. That’s the bags again: third one this month from the last delivery.'],
				second: ['Yes, the last delivery of 250 g bags has weak bottom seams. I’ve written to Verpakkingen Noord about it.'],
				ends: [[['s', 'Thanks for the photos. This one is our fault: the bag split along its seam, and we’ve had a few from the same delivery. We’re sending you a new {coffee}, with a 250 g House Blend to make up for it. It goes out on {ship}.'], ['c', 'Oh, that’s generous, thank you!']]]
			},
			{
				detail: ['Photos attached. Honestly, I’d prefer a refund for that bag rather than a new one: I’m away for two weeks from Monday.'],
				ends: [[['s', 'Of course. I’ve refunded {coffeePrice} to the account you paid from; it takes three to five working days to show. Have a good trip!'], ['c', 'Thank you, that’s fine.']]]
			},
			{
				gap: [5, 8],
				ends: [[['s', 'Hi {first}, just checking in: if you can send a photo of the damaged bag, we’ll send a replacement straight away.']], [['s', 'Hello {first}, we haven’t had the photo yet. No need for anything fancy, a phone picture of the bag is enough, and then a new one goes out with the next roast.']]]
			}
		]
	},
	{
		key: 'wrong',
		note: { kind: 'packingLog', p: 0.7 },
		area: 'online',
		party: 'person',
		staff: 'youssef',
		second: 'marit',
		order: { from: 'shipped', min: 1, max: 6 },
		subjects: ['Wrong coffee in my parcel', 'Order {order}: mix-up?', 'Not what I ordered', 'Small problem with my order'],
		open: [
			'I ordered {items}, but there was a bag of {received} in the box instead of the {coffee}. Not a disaster, but I bought the {coffee} for a reason.',
			'The parcel came today, thank you, but I think there’s been a mix-up. I ordered {items}, and one of the bags is {received}.',
			'Order {order} arrived this morning. The order email says {coffee}, but the label on the bag says {received}.'
		],
		more: ['The bags themselves are fine and the roast date is from this week.', 'I’ve not opened anything, so I can send it back if you need me to.', 'My husband says I should just drink it, but I’m stubborn.'],
		shows: 'order',
		showsIntro: ['This is what I ordered:', 'The order email, for reference:'],
		ask: ['Sorry about that! Could you tell me the roast date on the label of the bag you received? Then I can see which batch went in by mistake.', 'Oh no, sorry. Could you read me the roast date on the label of the wrong bag, so I can work out what happened on the packing bench?'],
		paths: [
			{
				detail: ['It says {received}, roasted on {roastDay}.', 'Roasted {roastDay}, {received}.'],
				look: ['Packed {order} on {shipDay} next to another order and swapped the bags. Sending the {coffee} on {ship}.'],
				ends: [
					[['s', 'That was my mistake: I had two orders on the bench and swapped the bags. Please keep the {received}, and I’m sending the {coffee} on {ship}.'], ['c', 'Lovely, thanks. The {received} is going down very well, by the way.']],
					[['s', 'My mistake, sorry: two orders on the bench at once. Keep the {received}; the {coffee} goes out on {ship}.'], ['c', 'It came today, thank you!']]
				]
			},
			{
				detail: ['It says {received}. Actually, don’t worry about it. I’ve been meaning to try it anyway.'],
				ends: [[['s', 'That’s kind of you. Since the bags aren’t the same price, I’ve settled the difference of {diff} with the account you paid from anyway.'], ['c', 'No need, but thank you!']]]
			},
			{
				gap: [6, 9],
				ends: [[['s', 'Hi {first}, I never heard back about the label. If you still want the {coffee}, just reply here and I’ll send it with the next roast.']]]
			}
		],
		values: (x) => {
			const wanted = x.order!.lines.find((line) => line.product !== grinder)!.product;
			const received = wanted === colombia ? ethiopia : wanted === ethiopia ? colombia : pick(x.r, [colombia, ethiopia]);
			x.v.received = received.name;
			x.v.diff = euros(Math.abs(received.cents - wanted.cents));
			x.v.roastDay = dateLong(nextOn(x.order!.shipped! - 2 * DAY, [2, 4]));
		}
	},
	{
		key: 'cancel',
		urgent: true,
		area: 'online',
		party: 'person',
		staff: 'youssef',
		second: 'marit',
		order: { from: 'placed', min: 0, max: 1 },
		subjects: ['Cancel order {order}', 'Wrong coffee ordered', 'Can I change my order?', 'Mistake in my order', 'Please cancel'],
		open: [
			'I’ve just ordered {items} ({order}) and realised I picked the wrong one: I meant the {other250}. Can you change it, or cancel the order so I can place it again?',
			'Sorry, I ordered {items} earlier today, but I’ve just found a bag of the same in the cupboard that I’d forgotten about. Could you cancel order {order} if it hasn’t gone yet?',
			'Could you please cancel {order}? My partner ordered the same coffee yesterday without telling me.'
		],
		more: ['I paid already, so I suppose it needs a refund.', 'No rush if it’s easier to do tomorrow.', 'Sorry for the trouble.'],
		paths: [
			{
				look: ['{order} not packed yet. Cancelled, refunded {total}.'],
				ends: [[['s', 'Done: order {order} is cancelled, and {total} is on its way back to the account you paid from. It usually shows within three to five working days.'], ['c', 'Thank you, that was quick!']], [['s', 'No problem: {order} is cancelled and refunded in full ({total}).'], ['c', 'Great, thanks.']]]
			},
			{
				opens: [0],
				look: ['{order}: swapped {coffee} for the {other250} before packing, difference settled.'],
				ends: [[['s', 'I’ve swapped it for the {other250} before packing, and settled the difference with your account. It goes out on {ship} with the next roast.'], ['c', 'Perfect, thank you.']]]
			},
			{
				look: ['{order} already went with this afternoon’s PostNL collection.'],
				ends: [
					[['s', 'I’m sorry, it left with this afternoon’s collection. When it arrives you can send it back unopened to the roastery, and we’ll refund it as soon as it’s here. Or keep it and we’ll refund half: whichever you prefer.'], ['c', 'I’ll send it back, thanks. Is there a form?'], ['s', 'No form needed, just put a note with your name inside.']]
				]
			}
		],
		values: (x) => {
			const wanted = x.order!.lines.find((line) => line.product !== grinder)!.product;
			x.v.other250 = (wanted === colombia ? ethiopia : colombia).name;
		}
	},
	{
		key: 'grinder',
		reply: { kind: 'brewGuide', intro: ['Our grind guide, for reference:', 'These are the settings we use in the shop:'], p: 0.5 },
		area: 'online',
		party: 'person',
		staff: 'youssef',
		second: 'marit',
		order: { from: 'shipped', min: 5, max: 60, grinder: true },
		subjects: ['Hand grinder question', 'Grinder problem', 'Grinder handle keeps coming off', 'Uneven grind', 'Hand grinder wobbles'],
		open: [
			'I bought the hand grinder from you a few weeks ago (order {order}). It worked well at first, but now the handle keeps slipping off halfway through and I have to push it back on every few turns.',
			'I’m struggling with the hand grinder I bought from you. However I set it, I get a mix of powder and big chunks, and my coffee is muddy and bitter at the same time.',
			'Since last week the hand grinder makes a scraping sound and the burr seems to wobble when I turn it. It’s only a few weeks old.'
		],
		more: ['I grind about 30 g every morning, nothing heavy.', 'I’ve cleaned it with a brush like the leaflet says.', 'It’s a shame, because I was really enjoying the ritual.'],
		ask: [
			'Sorry to hear that. Could you tell me how many clicks you have it set to, counting from fully closed, and what you brew with? And if you can, a photo of the grounds next to a coin.',
			'Thanks for writing. A couple of questions first: which brewer do you use, and how far from fully closed is it set? A photo of the burr from above would help too.'
		],
		paths: [
			{
				detail: ['I use a French press and it’s set to about 12 clicks.', 'Moka pot, and honestly I don’t know about clicks, I just turned it until it felt right. Photo of the grounds attached.'],
				ends: [
					[['s', 'That’s too fine for what you’re doing, which is why you get dust as well as chunks. Close it fully, then open it 24 to 26 clicks for a French press, or about 15 for the moka pot. And check the little nut under the handle is tight: if it works loose, the burr moves while you grind.'], ['c', 'Tightened the nut and opened it up a lot. Night and day! Thank you.']],
					[['s', 'Two things, I think: the setting is much too fine for that brewer, and the nut under the handle has probably worked loose, which lets the burr move. Tighten the nut by hand, close the grinder fully and count 24 clicks back from there.'], ['c', 'The nut was almost off! Fixed now, and the coffee is much better.'], ['s', 'Great to hear.']]
				]
			},
			{
				detail: ['It’s at 20 clicks, for pour-over. Photo attached: you can see the burr sits at an angle.', 'Pour-over, about 18 clicks. Here’s a photo, the lower burr is clearly crooked.'],
				look: ['Photo shows the lower burr tilted: the bearing has gone. A fault, not wear. Our grinder supplier is out of stock until the {nextweek}.'],
				second: ['I’ve asked the supplier for a replacement as soon as the new stock lands. If it isn’t here by the end of that week, we give the customer our shop demo grinder.'],
				ends: [[['s', 'Thank you, the photo shows the bottom burr sitting crooked, which is a fault, not something you did. Our supplier has new grinders coming in the {nextweek}. As soon as they arrive I’ll send you a new one, and you can send the old one back in the same box.'], ['c', 'OK, thanks. I’ll use my old blade grinder until then.']]]
			},
			{
				detail: ['French press, around 16 clicks. Photo attached.'],
				ends: [[['s', 'Sorry it’s been such a struggle. If you’d rather not bother with it, you can return it for the full 64.00 EUR.'], ['c', 'I think I’ll return it, I’ve gone off the idea of grinding by hand.'], ['s', 'That’s fine. Send it to the roastery address in its box, and I’ll refund it the day it arrives.']]]
			},
			{
				detail: ['A V60, at about 14 clicks.'],
				gap: [5, 9],
				ends: [[['s', 'Try opening it to about 22 clicks and make sure the nut under the handle is tight; that usually solves it.'], ['s', 'Hi {first}, did the change help? If the grind is still uneven, a photo would let us see whether something is wrong with the burr.']]]
			}
		]
	},
	{
		key: 'charged',
		area: 'online',
		party: 'person',
		staff: 'youssef',
		second: 'marit',
		order: { from: 'shipped', min: 0, max: 20 },
		subjects: ['Charged twice?', 'Double payment for order {order}', 'Payment question', 'Two payments'],
		open: [
			'My bank shows two payments of {total} to Fernhill Roasters on {orderDate}, but I only placed one order ({order}). Could you check?',
			'I think I paid twice for order {order}. The first attempt seemed to fail, so I tried again, and now there are two payments on my account.'
		],
		more: ['The coffee arrived fine, by the way.', 'I only noticed when I did my monthly budget.'],
		ask: ['Let me look into it. Could you tell me whether both payments say “booked”, or whether one is still pending? A copy of the two lines from your banking app is fine.', 'Sorry about that. I’ll check our payments now. Could you copy the two lines from your banking app for me, with their status?'],
		paths: [
			{
				detail: ['One says pending and the other booked, now that I look closely:', 'Here they are:'],
				paste: 'bank',
				look: ['Payment provider: one payment of {total} for {order}, and one failed attempt that was never taken. The pending line will drop off by itself.'],
				ends: [[['s', 'We only received one payment. The second line is a reservation from the attempt that failed, and your bank releases it by itself, usually within a few days.'], ['c', 'It’s gone this morning. Thanks for explaining.']], [['s', 'Good news: only one payment reached us. The pending line is the failed attempt, and your bank will drop it within a few working days.']]]
			},
			{
				detail: ['Both are booked:', 'Here you go, both booked:'],
				paste: 'bankTwice',
				look: ['Two payments taken for {order}, {total} each. Refunded the second one.'],
				ends: [[['s', 'You’re right, both payments came through. I’ve refunded one of them; you should see it within three to five working days.'], ['c', 'Thank you!']]]
			},
			{
				detail: ['Both booked, see below.'],
				paste: 'bankTwice',
				look: ['Two payments taken for {order}. I can’t do refunds, Marit has the login. Marit, can you refund one {total}?'],
				second: ['Will do it on Monday, I’m at the importer’s tasting day until then.'],
				ends: [[['s', 'Both payments did come through, sorry. The refund of {total} will be done on Monday, when Marit is back in the office.'], ['c', 'OK, thanks for letting me know.']]]
			}
		]
	},
	{
		key: 'invoice-request',
		area: 'online',
		party: 'person',
		staff: 'marit',
		second: 'youssef',
		order: { from: 'shipped', min: 2, max: 50 },
		subjects: ['Invoice for order {order}', 'Receipt with VAT', 'Company invoice please', 'Invoice request'],
		open: [
			'I bought {items} for our office (order {order}), and our bookkeeper needs a proper invoice with our company name and the VAT shown separately. The order email doesn’t have that. Could you send one?',
			'Could I get a VAT invoice for order {order}? I paid myself, but the company pays me back and they want it on paper with their details.'
		],
		more: ['Sorry for the admin!', 'Our finance team is very strict about this, unfortunately.'],
		ask: ['Of course. Could you send me the company name, address and VAT number exactly as they should appear?', 'No problem. Which name, address and VAT number should go on it?'],
		paths: [
			{
				detail: ['{company}\n{companyStreet}\nVAT {vat}'],
				ends: [[['s', 'Here it is, attached as a PDF, and copied below as well:\n\n{paste:companyInvoice}'], ['c', 'Perfect, thanks!']]]
			},
			{
				detail: ['It’s {company}, {companyStreet}, VAT number {vat}.'],
				ends: [[['s', 'Thanks. I do the invoices on Fridays, so you’ll have it by the end of {fri}.'], ['c', 'Great, no hurry.']]]
			},
			{
				detail: ['It’s {company}, {companyStreet}. I’ll have to ask finance for the VAT number; I don’t know it by heart.'],
				ends: [[['s', 'No problem, I’ll make it as soon as I have the VAT number.']], [['s', 'Thanks. Send me the VAT number when you have it and I’ll make the invoice the same day.'], ['c', 'Will do.']]]
			}
		],
		values: (x) => {
			x.v.company = pick(x.r, ['Bureau Kleinjan', 'Groenvelt Advies', 'Studio Raaf', 'Hofstede Vertalingen', 'Kanters & Bloem', 'De Rooij Installatie']);
			x.v.companyStreet = `${pick(x.r, streets)} ${int(x.r, 1, 90)}, Utrecht`;
			x.v.vat = `NL${int(x.r, 100000000, 999999999)}B01`;
			x.v.invoice = `FR-2026-${int(x.r, 300, 520)}`;
		}
	},
	{
		key: 'confirmation',
		urgent: true,
		area: 'online',
		party: 'person',
		staff: 'youssef',
		second: 'marit',
		order: { from: 'placed', min: 0, max: 1 },
		subjects: ['No confirmation email', 'Did my order go through?', 'Order confirmation', 'Payment but no email'],
		open: ['I paid for an order a little while ago but never got a confirmation email. Did it go through? I don’t want to order twice.', 'Hello, I placed an order earlier ({items}) and the money has left my account, but no email has come. Nothing in spam either.'],
		ask: ['Let me look. Under which name and email address did you order?', 'Could you tell me the name and email you used? Then I’ll find it.'],
		paths: [
			{
				detail: ['{name}, and it should have gone to {email}.', 'Under {name}, {email}.'],
				look: ['Found it: {order}, paid. Email address on the order is {typo}: a typo. Corrected it and forwarded the confirmation.'],
				ends: [[['s', 'Found it: order {order}, paid. The email address on it had a small typo ({typo}), so the confirmation went nowhere. I’ve corrected it, and here is the confirmation:\n\n{orderMail}'], ['c', 'Ah, my fat fingers. Thanks!']]]
			},
			{
				detail: ['{name}, {email}.'],
				look: ['{order} is there, paid, address correct. The mail service says delivered at {placedClock}.'],
				ends: [[['s', 'Your order {order} came through fine, and the confirmation went out at {placedClock}. Some work mail filters hold our emails in quarantine rather than spam. Here it is again:\n\n{orderMail}'], ['c', 'Found it in quarantine indeed. All good.']]]
			}
		],
		values: (x) => {
			const at = x.v.email!.indexOf('@');
			x.v.typo = `${x.v.email!.slice(0, at)}@${x.v.email!.slice(at + 1).replace('example', pick(x.r, ['exmaple', 'examle', 'exampel']))}`;
			x.v.placedClock = clock(x.order!.placed + 1);
			x.v.orderMail = orderMail(x.order!);
		}
	},
	{
		key: 'apostrophe',
		area: 'online',
		party: 'person',
		staff: 'marit',
		second: 'youssef',
		max: 2,
		since: '2026-08-20',
		subjects: ['A small thing', 'Lovely coffee, one niggle', 'Your shipping email'],
		open: [
			'Just a note to say the Guji is the best coffee I’ve had this year. Also, and forgive the English teacher in me: your shipping email says “on it’s way”. It should be “its”.',
			'Compliments on the House Blend; we’re on our third bag. Small thing: the email saying the order has shipped has “it’s” where it should be “its”. Sorry, I can’t unsee these things.'
		],
		paths: [{ ends: [[['s', 'Thank you, on both counts! You’re quite right about the apostrophe; I’ll get it fixed.'], ['c', 'Ha, no problem. Keep roasting!']], [['s', 'Ouch, you’re right. Thanks for pointing it out so kindly; it will be fixed.']]] }]
	},
	{
		key: 'ground',
		reply: { kind: 'shopMonth', intro: ['Here’s what’s on in the shop in the coming weeks, if you’re coming by:', 'If you do come by, this is what’s on in the shop:'], p: 0.4 },
		area: 'online',
		party: 'person',
		staff: 'youssef',
		second: 'daan',
		subjects: ['Ground coffee?', 'Can I buy it ground?', 'Pre-ground', 'Question about grinding', 'Filter coffee'],
		open: [
			'I’d love to order your House Blend, but I don’t have a grinder. Do you sell it ground? I can’t find anything about it on the website.',
			'My mother drinks filter coffee from a machine and has no grinder. I want to send her a kilo of the House Blend. Could it be ground for filter?',
			'Is there a way to get the Ethiopia ground for a moka pot? I bought beans once from another shop and ended up with a jar I couldn’t use.'
		],
		more: ['I know freshly ground is better, but I’m not buying a grinder for one person.', 'Sorry if this is a daft question.'],
		ask: ['Happy to help. Are you near enough to come by the shop?', 'Thanks for asking! Are you in Utrecht, or further away?'],
		paths: [
			{ opens: [0, 2], detail: ['Yes, I live in {area}, ten minutes by bike.', 'I’m in town; I work near the station.'], ends: [[['s', 'The online shop only sends whole beans, because ground coffee goes flat within days in the post. But if you can come to the roastery shop, we grind any bag for you while you wait, set for your brewer. We’re open Wednesday to Saturday, 9 to 5.'], ['c', 'Lovely, I’ll come by on Saturday then.']]] },
			{ opens: [0, 2], detail: ['No, I live in {town}, so coming by is a long way.', 'I’m in {town}, I’m afraid.'], ends: [[['s', 'We only send whole beans: ground coffee loses most of what makes it nice within a week or so. Our hand grinder is 64.00 EUR and lasts for years, but I understand if that’s too much for one person.'], ['c', 'Fair enough, I’ll think about the grinder. Thanks for the honest answer.']]] },
			{ opens: [1], detail: ['It would have to be posted: she lives in {town}.'], ends: [[['s', 'I’m afraid we only post whole beans; ground coffee in the post would be stale by the time it’s drunk, and we’d rather not send that out under our name.'], ['c', 'That’s a pity, but I understand. She’ll stick to her supermarket coffee then.']]] }
		]
	},
	{
		key: 'decaf',
		reply: { kind: 'shopMonth', intro: ['Here’s what’s on in the shop in the coming weeks, if you’re ever nearby:'], p: 0.3 },
		area: 'online',
		party: 'person',
		staff: 'marit',
		second: 'daan',
		max: 6,
		subjects: ['Decaf?', 'Do you have decaf?', 'Decaffeinated coffee', 'Caffeine-free', 'Question about decaf'],
		open: [
			'I’ve been told to cut down on caffeine, which is a real shame because your Colombia is my favourite. Do you have a decaf, or plan to?',
			'We’re expecting our first baby in {month} and I’m off caffeine until then. Is there a decaf I could order from you? Everything from the supermarket tastes like cardboard.',
			'My husband can’t have caffeine after lunch. Do you sell a decaf, even if it’s only in the roastery shop?',
			'Do you have a decaf for the evenings? I drink two cups of the House Blend every morning and would happily have a third after dinner if it didn’t keep me awake.'
		],
		paths: [
			{ ends: [[['s', '{decafNews} Shall I let you know when it’s there?'], ['c', 'Yes please! Thank you.']], [['s', '{decafNews} I’ve made a note to email you the day it’s available.'], ['c', 'Wonderful, thanks.']]] },
			{ ends: [[['s', '{decafNews} In the meantime, some people mix the House Blend half and half with a supermarket decaf, which gets you halfway there.'], ['c', 'Good idea, I’ll try that. I’ll keep an eye on the website.']]] },
			{ since: '2026-10-01', ends: [[['s', '{decafNews} If you’re near the roastery, come and taste the trial roast on a Saturday; Daan has it on the bar.'], ['c', 'I will, thanks. Saturday it is.']]] }
		],
		values: (x) => {
			x.v.decafNews = decafNews(x.open);
		}
	},
	{
		key: 'gift',
		reply: { kind: 'shopMonth', intro: ['And if your father is ever in town, this is what’s on in the shop:', 'For your own diary, what’s on in the shop in the coming weeks:'], p: 0.2 },
		area: 'online',
		party: 'person',
		staff: 'youssef',
		second: 'daan',
		subjects: ['Sending a present', 'Gift for my father', 'Order as a gift', 'Card with an order?'],
		open: [
			'I want to send a bag of the Ethiopia to my father in {town} for his birthday on {date}. Can it go straight to him, with a little note inside?',
			'My sister has just moved into her first flat in {town}, and I want to send her the hand grinder and a bag of House Blend. Could you add a handwritten card? And leave out anything with the price on it, please.',
			'Is it possible to order for someone else, with a message? It’s a thank-you to a colleague in {town} who covered for me for a month.'
		],
		ask: ['Lovely idea. By when does it need to arrive, and do you know how they make their coffee? Then I can suggest the right bag.', 'What a nice present. When should it be there, and what do they brew with?'],
		paths: [
			{ detail: ['By {date}, ideally. A filter machine, I think, and always black.', 'Some time before {date}. A French press, as far as I know.'], ends: [[['s', 'Of course. Place the order as usual, then email us the address it should go to and the message you’d like on the card; we write them by hand. The order email goes to you, and there’s nothing with a price on it in the box.'], ['c', 'Lovely, I’ll order tonight and send you the address and the message straight after.']]] },
			{ detail: ['It really has to be there by {date}. A French press, I think.'], ends: [[['s', 'We roast on Tuesdays and Thursdays and post the day after, so to reach {town} by {date} you’d need to order by {orderBy}. A card is no problem: email us the text and the address once you’ve ordered.'], ['c', 'That’s too tight for me, I’m afraid, I’ll find something locally. Next time!']]] },
			{ detail: ['No rush, some time next week is fine. A moka pot.'], ends: [[['s', 'Yes, happily: order as usual and email us where it should go and what the card should say.'], ['c', 'Done: I’ve ordered. The card should say “{note}” The address is {giftStreet}, {town}.'], ['s', 'Lovely. The card is written and it goes out on {ship}.']]] }
		],
		values: (x) => {
			x.v.orderBy = dateLong(nextOn(+x.v.dateMinutes! - 3 * DAY, [1, 3]) - DAY);
			x.v.note = ['Happy birthday, Papa! Drink it slowly.', 'Welcome home! Now you have no excuse not to invite me for coffee.', 'Thank you for everything this month. I owe you more than coffee.'][+x.v.openIndex!]!;
			x.v.giftStreet = `${pick(x.r, streets)} ${int(x.r, 2, 90)}`;
		}
	},
	{
		key: 'subscription',
		reply: { kind: 'shopMonth', intro: ['This is what’s on in the shop in the coming weeks:'], p: 0.35 },
		area: 'online',
		party: 'person',
		staff: 'marit',
		second: 'daan',
		max: 5,
		subjects: ['Subscription?', 'Regular delivery', 'Coffee every month', 'Standing order for home?'],
		open: [
			'Do you do a subscription? I get through a kilo of House Blend about every three weeks and keep forgetting to order until the tin is empty.',
			'I’d like a bag of whatever single origin you have delivered every month. Is that something you do?',
			'Could I set up a standing order like the cafés have, but for home? Two bags of Colombia a fortnight would be perfect.'
		],
		paths: [
			{ ends: [[['s', 'Not at the moment, I’m afraid: every online order is packed by hand as it comes in. Plenty of our regulars just put a reminder in their phone. If you live nearby, the roastery shop keeps a list of regulars and we can put a bag aside for you to collect.'], ['c', 'The reminder will have to do. Thanks!']]] },
			{
				ends: [
					[['s', 'We don’t post subscriptions, but if you’re in town, the roastery shop can put your bags aside every week or two for you to pick up. Shall I ask Daan to add you?'], ['c', 'That would be perfect: two Colombia every other Saturday, starting {sat}?'], ['S', 'Done, you’re on the Saturday list: two Colombia Huila every other week, from {sat}. Pay when you collect.']]
				]
			},
			{ ends: [[['s', 'We don’t post subscriptions, I’m afraid. If you’re ever near the roastery, we could put a bag aside for you every week or two to collect. Would that suit you?']]] }
		]
	},
	{
		key: 'brewing',
		reply: { kind: 'brewGuide', intro: ['Here is the guide we give out in the shop:', 'Our starting points for each brewer, for reference:'], p: 0.7 },
		area: 'online',
		party: 'person',
		staff: 'daan',
		second: 'marit',
		subjects: ['Sour coffee', 'Help with brewing', 'Ethiopia tastes strange', 'Bitter espresso', 'Advice please'],
		open: [
			'I bought a bag of the Ethiopia Guji last week and it tastes really sour in my French press. Everyone raves about it, so I must be doing something wrong.',
			'Our House Blend espresso has gone very bitter since we got a new machine at home. Same beans, same grinder.',
			'I’ve just started with pour-over and my cups are thin and watery whatever I do. Any tips for the Colombia?'
		],
		ask: ['Happy to help. Could you tell me your recipe: how much coffee, how much water, how long, and roughly how fine you grind?', 'Let’s sort it out. What’s your recipe at the moment: grams of coffee, grams of water, time, and the grind?'],
		values: (x) => {
			x.v.brewer = ['0', '3', '1'][+x.v.openIndex!]!;
		},
		paths: [
			{
				opens: [0, 2],
				detail: ['Here’s what I do:', 'This is my recipe at the moment:'],
				paste: 'recipe',
				ends: [
					[['s', 'Thanks, that helps. You’re using too little coffee for that much water, and the grind is on the coarse side, so the water rushes through and picks up the sour notes without the sweetness. Try 6 g of coffee for every 100 g of water, a little finer, and water just off the boil.'], ['c', 'Tried it this morning and it’s a different coffee. Thank you!']],
					[['s', 'From your recipe, I’d go a few clicks finer and let it brew a little longer: at the moment it’s under-extracted, which tastes thin and sour. Hotter water helps as well, 94 degrees or straight off the boil after half a minute.'], ['c', 'Much better already. I owe you one.']]
				]
			},
			{
				opens: [0, 2],
				detail: ['This is what I’ve been doing:'],
				paste: 'recipe',
				ends: [[['s', 'Your recipe looks fine on paper, so I’d change the grind first: a little finer, and see what happens. Our home brewing class on {sat} covers exactly this, if you’d like to come and try it hands-on.'], ['c', 'Could you put me down for the class on {sat}?'], ['s', 'You’re booked: {sat}, 10:00 to 12:30, 35.00 EUR, paid on the day. Bring your own grinder if you like.']]]
			},
			{
				opens: [0, 2],
				detail: ['My recipe:'],
				paste: 'recipe',
				gap: [5, 9],
				ends: [[['s', 'Try a finer grind and slightly hotter water first; that solves it nine times out of ten.'], ['s', 'Hi {first}, I was curious whether the finer grind helped. If not, bring the beans and your grinder to the shop one Saturday and we’ll look at it together.']]]
			},
			{
				opens: [1],
				detail: ['This is what we do now:', 'Our routine with the new machine:'],
				paste: 'recipe',
				ends: [[['s', 'Thanks, that helps. Bitterness usually means the coffee is over-extracted, and new machines often run hotter or slower than the old one. Go a step or two coarser, so the shot runs in about 28 seconds, and if the machine lets you, set it to 92 or 93 degrees.'], ['c', 'Two steps coarser did it. Much sweeter now, thank you!']]]
			},
			{
				opens: [1],
				detail: ['Here it is:'],
				paste: 'recipe',
				gap: [5, 9],
				ends: [[['s', 'Try going a step coarser, so the shot runs a little faster; bitterness usually means it runs too long.'], ['s', 'Hi {first}, did the coarser grind help? If not, bring the machine’s manual to the shop on a Saturday and we’ll go through the settings together.']]]
			}
		]
	},

	// Cafés, offices and shops Fernhill supplies.
	{
		key: 'standing',
		area: 'wholesale',
		party: 'cafe',
		staff: 'femke',
		second: 'youssef',
		subjects: ['Standing order', 'Change to our weekly order', 'Our order from {date}', 'Delivery day', 'Weekly coffee'],
		open: ['{openText}'],
		more: ['Everything else can stay as it is.', 'Let me know if that’s a problem for the van.', 'Sorry for the short notice!'],
		shows: 'standing',
		showsIntro: ['Our order as it is now, from your last email:', 'For reference, what we have now:'],
		ask: ['Happy to. Just to check: from the delivery on {date}, and the rest stays the same?', 'No problem at all. Is that from {date}, and should the rest of the order stay as it is?'],
		paths: [
			{
				detail: ['Yes, from {date}, and the rest stays the same.', 'Exactly, everything else unchanged.'],
				look: ['Changed the delivery sheet for {org} from {date}.', 'Updated {org} on the delivery sheet and told Youssef.'],
				ends: [[['s', 'Done. This is your standing order from {date}:\n\n{standingNew}'], ['c', 'Perfect, thanks Femke!']], [['s', 'All changed from {date}; you’ll see it on the next delivery note.'], ['c', 'Great, thank you.']]]
			},
			{
				when: (v) => v.change === 'day',
				detail: ['Yes, from {date}. The rest can stay as it is.'],
				look: ['{newday} round is full: the van can’t take another stop before 10. Tuesday has room.'],
				lookPaste: 'route',
				second: ['Confirmed, {newday} is full until one of the cafés stops. I can fit them in on Tuesday before 9:30.'],
				ends: [[['s', 'The {newday} round is full, I’m afraid: the van is at capacity. Youssef could come on Tuesday morning before 9:30 instead. Would that work for you?']], [['s', 'I’m sorry, there’s no room on the {newday} round at the moment. Tuesday before 9:30 is possible. Shall we do that?'], ['c', 'Let me ask the team who can be there that early. I’ll let you know.']]]
			},
			{
				detail: ['That’s right.', 'Yes please, from {date}.'],
				ends: [[['s', 'All changed from {date}. Because it changes your monthly amount, I’ll send you an updated invoice schedule by the end of the week.'], ['c', 'Thanks, Femke.']]]
			},
			{
				detail: ['Yes, from {date}. Everything else the same.'],
				ends: [[['s', 'Changed from {date}; you’ll see it on the next delivery note.'], ['c', 'Great. One more thing: our customers keep asking for decaf. Do you have one? We’d take 2 kg a week.'], ['s', '{decafCafe} I’ll add 2 kg to your order as soon as it’s ready.'], ['c', 'Perfect.']]]
			}
		],
		values: (x) => {
			const facts = cafeFacts(x.party.biz!);
			x.v.change = pick(x.r, ['kg', 'kg', 'day', 'filter']);
			x.v.kg2 = String(facts.kg + int(x.r, 2, 4));
			x.v.newday = pick(x.r, ['Tuesday', 'Wednesday', 'Thursday', 'Friday'].filter((day) => day !== facts.deliv));
			x.v.small = String(int(x.r, 2, 3));
			x.v.openText =
				x.v.change === 'kg'
					? pick(x.r, [x.open < dayOf('2026-10-01') ? 'Now that the students are back, we’re going through a lot more coffee.' : 'Now that it’s getting colder, we’re selling a lot more coffee.', 'Our weekend brunch has taken off, and we keep running out of House Blend by Saturday.']) + ' Could we go from {kg} to {kg2} kg of House Blend a week, starting with the delivery on {date}?'
					: x.v.change === 'day'
						? pick(x.r, ['Could we move our delivery from {deliv} to {newday}? Our new baker starts early on {newday}s, so there’s always someone to take it in. From {date}, if possible.', 'We’re closing on {deliv}s from now on, so the delivery can’t come then any more. Could it move to {newday}, starting {date}?'])
						: 'We’re adding a filter coffee to the menu from {month}. Could you add {small} kg of the Ethiopia Guji to our weekly order, starting {date}?';
			if (x.v.change !== 'kg') x.v.kg2 = String(facts.kg);
			x.v.date = dateLong(nextOn(x.open + int(x.r, 8, 11) * DAY, [dayNames.indexOf(x.v.change === 'day' ? x.v.newday : facts.deliv)]));
			x.v.standingNew = pasteOf(x, 'standingNew');
		}
	},
	{
		key: 'invoice',
		area: 'wholesale',
		party: 'cafe',
		staff: 'femke',
		second: 'youssef',
		subjects: ['Invoice {invoice}', 'Question about our invoice', 'Invoice doesn’t match', 'Overcharged?', 'Our {invMonth} invoice'],
		open: [
			'Our invoice {invoice} for {invMonth} charges us for {billed} kg of House Blend, but by our count we only had {had} kg delivered. Could you check?',
			'Something doesn’t add up on invoice {invoice}: there are {count} deliveries on it, and I’m fairly sure one of them never reached us. Can you have a look?'
		],
		more: ['I’ve held back the payment until we know.', 'I’ve paid the rest already.', 'It’s probably our mistake, but I’d like to be sure.'],
		shows: 'invoice',
		showsIntro: ['The invoice:', 'Here is the invoice as we received it:'],
		ask: ['Thanks, {first}. Let me check the delivery notes. Do you remember roughly which week it was?', 'Sorry about that. I’ll go through the delivery notes; do you know which delivery you think is missing?'],
		paths: [
			{
				detail: ['I think it was the {dnDate} one: I remember the van came very late that week.', 'Probably {dnDate}. We had no House Blend left by the Friday.'],
				look: ['Checked the delivery notes: on {dnDate} the wrong bags went out and came back with the van. Never taken off the invoice.'],
				lookPaste: 'deliveriesReturned',
				second: ['Yes, I remember: that was the morning the labels got mixed up. I brought everything back the same day.'],
				ends: [[['s', 'You’re right, sorry: on {dnDate} the van brought the wrong bags and took them back, but they stayed on the invoice. I’ll put a credit of {credit} on your next invoice.'], ['c', 'Thanks for sorting it.']]]
			},
			{
				detail: ['It must have been the {dnDate} delivery. I don’t remember signing for anything that day.'],
				look: ['Delivery notes show the {dnDate} delivery was taken back unopened. Credit note made.'],
				lookPaste: 'deliveriesReturned',
				ends: [[['s', 'You’re quite right: the delivery of {dnDate} went back with the van and should never have been invoiced. The credit note for {credit} is attached; you can take it off the payment.'], ['c', 'Lovely, I’ve paid the rest today.']]]
			},
			{
				detail: ['I’m not sure, to be honest. I just counted the boxes in the store room.', 'Somewhere in the middle of the month, I think.'],
				look: ['All {count} delivery notes signed. {dnDate} signed by {signer}.'],
				lookPaste: 'deliveriesSigned',
				ends: [[['s', 'I’ve checked the delivery notes, and all {count} deliveries were signed for; the one on {dnDate} by {signer}. Could it have ended up in the store room?'], ['c', 'Found them. Our new kitchen help put two boxes in the dry store behind the flour. Sorry, Femke!']], [['s', 'All {count} delivery notes are signed, the {dnDate} one by {signer}. Could you ask around?'], ['c', 'Mystery solved: they were in the cellar. Apologies, I’ll pay today.']]]
			}
		],
		values: (x) => {
			const facts = cafeFacts(x.party.biz!);
			const monthStart = Date.UTC(2026, at(x.open).getUTCMonth() - 1, 1);
			const first = Math.round((monthStart - EPOCH) / 60000);
			const days: number[] = [];
			for (let d = nextOn(first, [dayNames.indexOf(facts.deliv)]); at(d).getUTCMonth() === at(first).getUTCMonth(); d += 7 * DAY) days.push(d);
			const bad = int(x.r, 0, days.length - 1);
			x.v.deliveryDays = days.join(',');
			let dn = 2100 + Math.round((first - dayOf('2026-07-01')) / DAY) * 6 + int(x.r, 0, 5);
			x.v.dns = days.map(() => (dn += int(x.r, 11, 19))).join(',');
			x.v.invoice = `FR-2026-${String(380 + int(x.r, 0, 160)).padStart(4, '0')}`;
			x.v.invMonth = month(first);
			x.v.invEnd = `${new Date(Date.UTC(2026, at(first).getUTCMonth() + 1, 0)).getUTCDate()} ${month(first)} 2026`;
			x.v.count = inWords(days.length);
			x.v.billed = String(facts.kg * days.length);
			x.v.had = String(facts.kg * (days.length - 1));
			x.v.badIndex = String(bad);
			x.v.dnDate = dateLong(days[bad]!);
			x.v.signer = pick(x.r, [x.party.first, pick(x.r, firstNames)]);
			x.v.credit = `${money((facts.kg * wholesale.house + facts.secondKg * facts.secondPrice) * 1.09)} EUR`;
		}
	},
	{
		key: 'loaner',
		area: 'wholesale',
		party: 'cafe',
		staff: 'femke',
		second: 'marit',
		subjects: ['Grinder making a noise', 'Problem with the espresso grinder', 'Grinder broken!', 'Help: grinder', 'Our grinder'],
		open: [
			'The espresso grinder you lent us has started making a horrible grinding noise, and the dose is all over the place: 16 g one shot, 21 g the next. We’re getting through it, but it’s stressful on a busy morning.',
			'Our grinder stopped completely this morning, right in the middle of the rush. It hums, but nothing comes out. We’re using a hand grinder, which is not fun.',
			'The grind on the espresso grinder keeps drifting coarser during the day, and the baristas are adjusting it every hour. Is that normal?'
		],
		more: ['We clean it every evening like you showed us.', 'Can someone come and look?'],
		ask: ['Oh no. Could you send a short video of it, and tell me whether it happens with every dose or only now and then?', 'Sorry to hear that. Can you send a video? Then I know whether to send the technician or come myself.'],
		paths: [
			{
				opens: [0],
				detail: ['Video attached. It’s with every dose, a sort of crunching.', 'It’s every time. Sending a video now.'],
				look: ['Called {first}: something stuck between the burrs, by the sound of it. Talked them through taking the top burr carrier off.'],
				ends: [[['s', 'As we found on the phone: a small stone between the burrs, probably from the last bag, with old coffee caked in behind it. Now that it’s cleaned out, it should be fine. Let me know if the noise comes back.'], ['c', 'Running perfectly again. Thank you so much for the quick call.']]]
			},
			{
				opens: [0, 1],
				detail: ['Video attached. It’s getting worse by the hour.', 'Here’s the video. It started yesterday afternoon.'],
				look: ['Motor bearing, by the sound of the video they sent. Booked Karim from Baristech for {date}, morning.'],
				lookPaste: 'grinderLoans',
				ends: [[['s', 'From the video it sounds like the motor bearing. I’ve booked our technician, Karim, for {date} in the morning; he’ll bring a spare grinder, so you’re not stuck if yours has to go to the workshop.'], ['c', 'Thanks, we’ll manage until then.']]]
			},
			{
				opens: [0, 1],
				detail: ['Video attached, but it has now stopped completely.'],
				look: ['Took the spare grinder from the roastery over in the van; theirs goes to Baristech.'],
				second: ['Fine. The spare’s burrs are new, so tell them to start two steps coarser than usual.'],
				ends: [[['s', 'The spare grinder is in, and yours has gone for repair. Its burrs are new, so start two steps coarser than usual. No charge: it’s part of the loan.'], ['c', 'Lifesaver, thank you!']]]
			},
			{
				opens: [2],
				detail: ['Video attached. The adjustment collar seems to turn by itself.', 'Here’s a video. If you watch the collar, it creeps round.'],
				ends: [[['s', 'From the video it’s the adjustment collar: its locking screw has worked loose, so the vibration turns it coarser. Tighten the small screw under the collar with an Allen key and it should hold. If it doesn’t, I’ll come by.'], ['c', 'Tightened it this morning and it hasn’t moved since. Thanks!']]]
			},
			{
				opens: [2],
				detail: ['Video attached. It drifts most in the afternoon, when the machine is hot.'],
				look: ['Sounds like the burrs are worn: the grinder is six years old and has never had new ones. Ordered a set; Karim can fit them on {date}.'],
				ends: [[['s', 'I think the burrs are simply worn out: that grinder has never had new ones. I’ve ordered a set, and Karim, our technician, will fit them on {date}.'], ['c', 'Great, thanks Femke.']]]
			}
		]
	},
	{
		key: 'newcafe',
		reply: { kind: 'priceList', intro: ['Our café price list:', 'The prices, for reference:'], p: 0.7 },
		area: 'wholesale',
		party: 'newcafe',
		staff: 'femke',
		second: 'marit',
		subjects: ['Coffee for our new café', 'Wholesale enquiry', 'Looking for a roaster', 'New café in {area}', 'Supplying our lunchroom'],
		open: [
			'We’re opening {org}, a small café in {area}, in {month}: about 30 seats, breakfast and lunch. A friend recommended you. Could you tell us how you work with cafés and what it would cost?',
			'I’m taking over {org} in {area} from the current owner in {month} and want to change the coffee. We go through roughly {kg} kg a week. Do you supply cafés our size?',
			'We run a bakery in {area} with a coffee corner and want to serve proper espresso. We have no idea where to start: machine, grinder, beans. Can you help?'
		],
		ask: ['Thanks for thinking of us! The easiest is to come by the roastery for a tasting, so you can try the House Blend and the single origins as espresso and filter. Would {dayA} or {dayB} afternoon work? And roughly how much coffee do you expect to use a week?', 'We’d love to. Could you tell me roughly how much coffee you expect to use a week, and whether you already have a machine and a grinder?'],
		paths: [
			{
				detail: ['{dayA} works, we’ll come with the two of us. We think about {kg} kg a week.', 'About {kg} kg a week, we think, and we have a machine but no grinder yet. {dayB} afternoon is fine.'],
				gap: [6, 9],
				look: ['Tasting with {first} went well; they chose the House Blend for espresso. Standing order from {date2}: {kg} kg, delivery on {deliv}s. Lending them a grinder.'],
				ends: [[['s', 'Lovely to meet you last week. As agreed: {kg} kg of House Blend every {deliv}, starting {date2}, with one of our grinders on loan and a training morning for your staff before you open.'], ['c', 'Thank you, we’re very excited!']]]
			},
			{
				detail: ['About {kg} kg a week, we hope. We have a machine already.', 'Probably {kg} kg a week once we’re going. No grinder yet.'],
				ends: [[['s', 'I’ve put two 250 g samples in the post, the House Blend and the Colombia, with our café price list. Have a taste and let me know what you think.']], [['s', 'Thanks! Samples of the House Blend and the Colombia are on their way, with the price list. Let me know once you’ve tried them.'], ['c', 'Thank you, we’ll taste them this weekend.']]]
			},
			{
				opens: [0, 2],
				detail: ['Honestly, probably 2 or 3 kg a month to start; we’re very small.'],
				ends: [[['s', 'At that amount the weekly van doesn’t really work, for us or for you. What several small places do is buy 1 kg bags in the roastery shop at the café price; just mention you have a café.'], ['c', 'Fair enough, that sounds sensible. We’ll come to the shop.']]]
			},
			{
				detail: ['Maybe {kg} kg a week. Could you send prices first?'],
				gap: [6, 10],
				ends: [[['s', 'Here is our café price list, as promised. Let me know if you’d like to come for a tasting.'], ['s', 'Hi {first}, just checking whether you had a chance to look at the price list. Happy to arrange a tasting whenever suits you.']]]
			}
		],
		values: (x) => {
			x.v.kg = String(int(x.r, 4, 12));
			x.v.deliv = pick(x.r, ['Tuesday', 'Wednesday', 'Thursday', 'Friday']);
		}
	},
	{
		key: 'training',
		reply: { kind: 'trainingPlan', intro: ['This is how the morning usually goes:', 'The plan for the morning:'], p: 0.7 },
		area: 'wholesale',
		party: 'cafe',
		staff: 'femke',
		second: 'marit',
		subjects: ['Training for new staff', 'Barista training', 'Training session?', 'Our new baristas'],
		open: [
			'We have {n} new people starting this month who have never made an espresso. Could you do a training morning like the one you did when we started?',
			'Our milk is a disaster since our head barista left. Is a refresher training something you can do, and does it cost anything?'
		],
		ask: ['Of course: training is included for cafés we supply. How many people, and which mornings suit you? We usually do it at the roastery, before 11.', 'Happy to, and it’s free for the cafés we supply. How many people would come, and which mornings are good?'],
		paths: [
			{ detail: ['{n} people. {dayA} or {dayB} would be best.'], ends: [[['s', 'Let’s do {dayA}, 8:30 at the roastery. Two hours: dialling in, milk, and cleaning at the end of the day.'], ['c', 'Great, they’ll be there.']]] },
			{ detail: ['{n} of them. Any morning except Monday.'], ends: [[['s', 'Thanks. I’ll check with Marit when the training bar is free and send you two or three dates by {fri}.'], ['c', 'Thank you!']]] },
			{ gap: [5, 8], ends: [[['s', 'Hi {first}, shall we find a date for the training? Just send me a couple of mornings that suit your team.']]] }
		]
	},
	{
		key: 'office',
		reply: { kind: 'priceList', intro: ['Our prices for businesses:', 'The price list, for reference:'], p: 0.6 },
		area: 'wholesale',
		party: 'office',
		staff: 'femke',
		second: 'youssef',
		subjects: ['Coffee for our office', 'Office supply', 'Beans for the team', 'Delivery to an office?'],
		open: [
			'We’re {what} with {people} people in {area}, and we’ve just bought a bean-to-cup machine. Could you deliver beans every week or two, with an invoice?',
			'Our office manager left and I’ve inherited the coffee. We buy supermarket beans and everybody complains. Could we buy from you instead? We’re {people} people.'
		],
		ask: ['Happy to. How many cups do you think you get through in a day, and which machine is it? Then I can suggest a coffee and an amount.'],
		paths: [
			{ detail: ['About {cups} cups a day, I’d guess. It’s a {machine}.'], ends: [[['s', 'At that rate, {okg} kg of House Blend every two weeks should do it. I’ve put you on the {deliv} round from {date}, every other week, invoiced monthly.'], ['c', 'Perfect. The team will be thrilled.']]] },
			{ detail: ['Roughly {cups} cups a day, on a {machine}.'], ends: [[['s', 'I’d suggest {okg} kg of House Blend every two weeks; our price list is attached.'], ['c', 'Thanks. I need to run it past our director first, and I’ll get back to you.']]] },
			{ opens: [1], detail: ['We don’t actually have a machine yet. Could you supply one as well?'], ends: [[['s', 'We don’t supply or lease machines, I’m afraid; for that you’d need a coffee machine company. If you get one with a built-in grinder, we’d gladly supply the beans.'], ['c', 'Understood. We’ll go with the lease company’s coffee for now then.']]] },
			{ detail: ['Maybe {cups} cups a day. It’s a {machine}.'], ends: [[['s', 'Thanks. I’ll put together a proposal with two coffees to try and send it by {fri}.'], ['c', 'Great, thank you.']]] }
		],
		values: (x) => {
			const people = x.party.biz!.people!;
			x.v.cups = String(Math.round(people * 2.5));
			x.v.okg = String(Math.max(2, Math.round((people * 2.5 * 10 * 8) / 1000)));
			x.v.machine = pick(x.r, ['bean-to-cup machine with a built-in grinder', 'fully automatic machine, about two years old', 'big automatic machine the lease company put in']);
		}
	},
	{
		key: 'deli',
		reply: { kind: 'retailSheet', intro: ['Our retail prices:', 'The retail price sheet:'], p: 0.7 },
		area: 'wholesale',
		party: 'deli',
		staff: 'femke',
		second: 'marit',
		subjects: ['Selling your coffee in our shop', 'Retail bags', 'Stockist enquiry', 'Your 250 g bags'],
		open: [
			'We run {org}, a shop in {area}, and customers keep asking for local coffee. Would you sell us your 250 g bags to resell?',
			'A customer brought one of your bags into {org} and asked whether we could stock it. Do you sell to shops, and on what terms?'
		],
		ask: ['Thanks for thinking of us! How many bags a month do you think you would sell, and is there room for a small shelf card next to them?', 'Lovely to hear. Roughly how many bags a month do you think you’d sell? Then I can suggest a first order.'],
		paths: [
			{ detail: ['Hard to say: twenty or thirty bags a month to start. A shelf card is fine.', 'Maybe twenty a month, more around Christmas.'], ends: [[['s', 'Lovely. Retail bags are at the shop price less a third, invoiced monthly, and we deliver with the van on {deliv}s. Shall I start you with 12 House Blend and 6 Colombia?'], ['c', 'Yes, let’s do that.'], ['s', 'Done: first delivery on {date}.']]] },
			{ detail: ['Maybe fifteen a month. Yes to the shelf card.', 'Twenty or so, I’d guess.'], ends: [[['s', 'We’d love that. I’ll send you our retail price sheet and the shelf cards by {fri}.'], ['c', 'Thank you!']]] },
			{ gap: [6, 10], ends: [[['s', 'Hi {first}, just checking: did you get a chance to think about how many bags you might sell? Then I can put together a first order.']]] },
			{ detail: ['Maybe twenty a month. Could you send prices first?'], gap: [6, 10], ends: [[['s', 'Here is our retail price sheet. Shall I put together a first order?'], ['s', 'Hi {first}, just checking you got the price sheet. Let me know if you’d like to give it a try.']]] }
		]
	},
	// The roastery shop and its classes.
	{
		key: 'class',
		reply: { kind: 'shopMonth', intro: ['Here’s everything else on in the shop in the coming weeks:', 'For the rest of the programme:'], p: 0.5 },
		area: 'shop',
		party: 'person',
		staff: 'daan',
		second: 'marit',
		subjects: ['Home brewing class', 'Booking for {sat}', 'Coffee workshop', 'Class booking', 'Places in the class?'],
		open: ['{openText}'],
		paths: [
			{ when: (v) => v.variant === 'public', look: ['{sat}: places left, two more is fine.'], lookPaste: 'classList', ends: [[['s', 'You’re booked: two places in the home brewing class on {sat}, 10:00 to 12:30, 35.00 EUR each, paid in the shop on the day.'], ['c', 'Wonderful, thank you!']]] },
			{ when: (v) => v.variant === 'public', look: ['{sat} is full.'], lookPaste: 'classFull', ends: [[['s', 'I’m sorry, {sat} is full. I’ve put you on the waiting list and will tell you if a place frees up; or there’s room on {sat2}.'], ['c', 'The waiting list, please: {sat2} doesn’t work for us.']]] },
			{ when: (v) => v.variant === 'public', look: ['{sat} is full; {sat2} has room.'], lookPaste: 'classFull', ends: [[['s', 'I’m sorry, {sat} is full, but there are places on {sat2}. Would that work?'], ['c', '{sat2} is fine, put us down.'], ['s', 'Done: two places on {sat2}, 10:00 to 12:30.']]] },
			{ when: (v) => v.variant === 'private', ends: [[['s', 'Happy to. A private class is 220.00 EUR for up to eight people, on a Thursday afternoon or a Sunday morning. Which dates would suit you?']]] },
			{ when: (v) => v.variant === 'private', ends: [[['s', 'Happy to. A private class is 220.00 EUR for up to eight people, on a Thursday afternoon or a Sunday morning.'], ['c', 'Thursday afternoon would be best. Could we do the second Thursday of {month}?'], ['s', 'Pencilled in: the second Thursday of {month}, 14:00 to 16:30. Pay on the day.']]] }
		],
		values: (x) => {
			x.v.variant = x.r() < 0.75 ? 'public' : 'private';
			x.v.openText =
				x.v.variant === 'public'
					? pick(x.r, ['Are there still two places in the home brewing class on {sat}? It’s a present for my partner.', 'I’d like to book the home brewing class on {sat} for myself and a friend. Is there room?', 'My daughter has just bought her first pour-over set and wants to learn to use it properly. Could we both come to the class on {sat}?'])
					: 'Could you run a private class for six colleagues? It’s for a team outing in {month}.';
		}
	},
	{
		key: 'lost',
		area: 'shop',
		party: 'person',
		staff: 'daan',
		second: 'marit',
		max: 3,
		subjects: ['Lost property', 'Did I leave something?', 'Left behind in the shop', 'Long shot'],
		open: ['I think I left {item} at the roastery shop on Saturday. Has anyone found it?', 'Long shot: did anyone hand in {item}? I was in the shop last week and haven’t seen it since.'],
		ask: ['Let me have a look. Roughly what time were you in, and where were you sitting?'],
		paths: [
			{ detail: ['Around eleven, at the long table by the bar.', 'Late afternoon, by the window.'], ends: [[['s', 'Yes! It’s behind the counter with a note on it. Come and get it any time we’re open, Wednesday to Saturday, 9 to 5.'], ['c', 'Thank you so much, I’ll come on {day}.']]] },
			{ detail: ['Just before closing, at the bar.'], ends: [[['s', 'Found it: it was on the windowsill by the bar. It’s behind the counter now.'], ['c', 'Picked it up this morning. Thanks!']]] },
			{ detail: ['Around lunchtime, at one of the small tables.'], ends: [[['s', 'I’ve looked everywhere, including the box under the counter, but no sign of it, I’m sorry. Nothing like it has been handed in.'], ['c', 'Thanks for looking anyway.']]] }
		]
	},
	{
		key: 'visit',
		reply: { kind: 'shopMonth', intro: ['For reference, this is what’s on in the coming weeks:'], p: 0.3 },
		area: 'shop',
		party: 'organiser',
		staff: 'daan',
		second: 'marit',
		subjects: ['Visit to the roastery', 'Group visit', 'Can we see the roasting?', 'Outing in {month}'],
		open: ['I’m organising an outing for {group}, about {groupSize} people. Could we visit the roastery and see how coffee is roasted?', 'Would it be possible to bring {group} to watch the roasting one morning? We’re about {groupSize}.'],
		ask: ['What a nice idea. Who is in the group, and how much time would you have?', 'Lovely. How long would you like to stay, and is there anything in particular the group wants to see?'],
		paths: [
			{ when: (v) => +v.groupSize! <= 8, detail: ['All adults, and we’d have about an hour and a half.', 'Mixed ages; we have the whole morning.'], ends: [[['s', 'We’d love to have you. Thursday mornings are best: we roast from 9, and Marit can show you round and do a small tasting at the end. Would {thu} work?'], ['c', '{thu} is perfect. We’ll be there at 9.'], ['s', 'Lovely, see you then. It gets warm near the roaster, so dress in layers.']]] },
			{ when: (v) => +v.groupSize! > 8, detail: ['There are {groupSize} of us in the end, all adults. An hour would do.'], ends: [[['s', 'I’m sorry, but {groupSize} is more than the roastery can safely hold around a hot roaster: eight is our limit. Could you come in two groups, on two Thursdays?'], ['c', 'That makes it complicated for us. We’ll find something else this time, but thanks.']]] },
			{ detail: ['An hour or so, and mostly the roasting itself.'], ends: [[['s', 'Happy to. Thursday mornings work best, when we roast. Which Thursday would suit your group?']]] }
		],
		values: (x) => {
			x.v.groupSize = String(int(x.r, 5, 16));
		}
	},
	{
		key: 'putaside',
		reply: { kind: 'shopMonth', intro: ['And this is what’s on in the shop in the coming weeks:'], p: 0.3 },
		area: 'shop',
		party: 'person',
		staff: 'daan',
		second: 'marit',
		subjects: ['Can you put a bag aside?', 'Collecting on Saturday', 'Reserve some bags', 'Christmas presents'],
		open: ['{openText}'],
		paths: [
			{ when: (v) => v.variant === 'aside', ends: [[['s', 'Done: two 1 kg House Blend with your name on them, behind the counter for {sat}.'], ['c', 'Thank you!']], [['s', 'Of course. They’ll be behind the counter for {sat}, with your name on.']]] },
			{ when: (v) => v.variant === 'christmas', ends: [[['s', 'Of course. We’ll roast them in the week of 14 December and tie a ribbon on each. Could you pick them up from 17 December?'], ['c', 'Perfect, the 17th it is.']]] },
			{ when: (v) => v.variant === 'christmas', ends: [[['s', 'Lovely idea. Could you confirm how many bags, and the latest day you need them? Then I’ll put them in the roast plan.']]] }
		],
		values: (x) => {
			x.v.variant = x.open >= dayOf('2026-10-01') && x.r() < 0.6 ? 'christmas' : 'aside';
			x.v.openText =
				x.v.variant === 'aside'
					? pick(x.r, ['Could you put aside two 1 kg bags of House Blend for me to collect on {sat}? Last time you’d sold out by the time I came in.', 'I’ll be in town on {sat}. Could you keep two kilos of the House Blend for me? I’m always too late.'])
					: pick(x.r, ['I’d like {xmas} bags of the Ethiopia as Christmas presents for my team, to collect in December. Is that possible, and could you tie a ribbon on them?', 'Could I order {xmas} bags of House Blend for our staff Christmas boxes? We’d collect them in the week before Christmas.']);
			x.v.xmas = String(int(x.r, 8, 24));
		}
	},
	{
		key: 'taste',
		area: 'online',
		party: 'person',
		staff: 'marit',
		second: 'daan',
		subjects: ['{coffeeName} tastes different', 'Odd bag?', 'Not the usual taste', 'Has something changed?'],
		open: ['{openText}'],
		more: ['I brew it exactly the same way as always.', 'I’ve still got half the bag left.', 'My partner noticed it too, so it isn’t just me.'],
		ask: ['Thanks for telling us; we’d rather know. Could you tell me the roast date on the bag, and how you’ve been keeping it?', 'Sorry to hear that. What’s the roast date printed on the bag, and when did you open it?'],
		paths: [
			{
				when: (v) => v.coffeeName === 'House Blend',
				detail: ['Roasted on {roastDate}. It’s in its own bag, in the cupboard.', '{roastDate}, and I opened it the day I bought it.'],
				look: ['Roast log for {roastDate}: one {coffeeName} batch ran hot, the bean probe was playing up. Most of it was held back, but a few bags went into the shop.'],
				second: ['I’ll keep a fresh bag behind the counter with their name on it.'],
				ends: [[['s', 'You were right: one batch that day roasted darker than it should have, because a temperature probe was playing up. Sorry! Bring the bag to the shop, or just give your name at the counter, and Daan will give you a fresh one.'], ['c', 'That’s very fair, thank you. I’ll come by on Saturday.']]]
			},
			{
				when: (v) => v.coffeeName !== 'House Blend',
				detail: ['The roast date is {roastDate}. I keep the beans in a glass jar on the windowsill; it looks nice in the kitchen.'],
				ends: [[['s', 'I think the windowsill is the culprit: light and the warmth of the sun make beans go stale in a week or two. A tin, or the bag itself in a cupboard, keeps them much longer. The roast date is fine.'], ['c', 'Oops. Moved to the cupboard, and the next bag stays in its bag.']]]
			},
			{
				since: '2026-09-15',
				when: (v) => v.coffeeName !== 'House Blend',
				detail: ['{roastDate}, opened last week.', 'It says {roastDate}. Opened on Sunday.'],
				ends: [[['s', 'Nothing is wrong with the bag: the {coffeeName} has been from the new crop since September, and it tastes a little different from last year’s. Most people prefer it, but not everyone does. If you miss the old taste, the Colombia is closest to it at the moment.'], ['c', 'Ah, that explains it. I’ll give it another go, and try the Colombia next.']]]
			},
			{ gap: [6, 9], ends: [[['s', 'Hi {first}, I never heard back about the roast date. If the bag still tastes off, bring it into the shop and we’ll swap it.']]] }
		],
		values: (x) => {
			const [name, text] = pick(x.r, [
				['House Blend', 'The last bag of House Blend I bought in the shop tastes much darker than usual, almost burnt. Has something changed, or did I get an odd batch?'],
				['Colombia', 'I’ve been drinking your Colombia for months, but the bag I bought last week tastes flat, as if it’s old.'],
				['Ethiopia', 'Has the Ethiopia changed? It used to taste of blueberries and now it tastes of, well, nothing much.']
			] as const);
			x.v.coffeeName = name;
			x.v.openText = text;
			x.v.roastDate = dateLong(nextOn(x.open - int(x.r, 9, 20) * DAY, [2, 4]));
		}
	},
	{
		key: 'pause',
		area: 'wholesale',
		party: 'cafe',
		staff: 'femke',
		second: 'youssef',
		subjects: ['Pausing our order', 'Closed for renovation', 'No deliveries for a few weeks', 'Our standing order'],
		open: ['We’re closing for {weeks} weeks from {date2} for a new kitchen. Could you pause our deliveries in that time?', 'Bad news: the landlord is renovating the building and we have to close from {date2}, probably for {weeks} weeks. What happens to our standing order?'],
		ask: ['Thanks for letting me know in good time. Do you know yet when you’ll reopen, and would you like a last delivery the week before?'],
		paths: [
			{ detail: ['We reopen on {reopen}. A last small delivery would be good, half the usual.'], ends: [[['s', 'All arranged: a half delivery on {deliv} before you close, then nothing until you reopen, and the full order again from {reopen}. Good luck with the work!'], ['c', 'Thank you, Femke!']]] },
			{ detail: ['We don’t know yet; the builder is vague. Could you send us an invoice for what we’ve had so far before we close? Our bookkeeper wants it settled.'], ends: [[['s', 'Of course. I’ll pause the order from {date2} and send you the invoice up to then by {fri}.'], ['c', 'Great, thanks.']]] },
			{ detail: ['No idea yet, I’m afraid. I’ll tell you as soon as we know.'], ends: [[['s', 'No problem: I’ve paused the deliveries from {date2}. Let me know when you have a date, and we’ll start again the week you reopen.']]] }
		],
		values: (x) => {
			x.v.weeks = inWords(int(x.r, 3, 6));
			x.v.reopen = dateLong(nextOn(x.open + int(x.r, 35, 55) * DAY, [1]));
		}
	},
	{
		key: 'overdue',
		area: 'wholesale',
		party: 'cafe',
		staff: 'femke',
		second: 'marit',
		subjects: ['Re: Payment reminder {invoice}', 'Your reminder', 'Invoice {invoice}'],
		open: ['{openText}'],
		paths: [
			{ when: (v) => v.variant === 'forgot', ends: [[['s', 'No problem, thanks for letting me know.'], ['c', 'Paid just now.'], ['s', 'Received, thank you!']], [['s', 'Thanks, {first}. This week is fine.']]] },
			{ when: (v) => v.variant === 'parts', ends: [[['s', 'Of course: half now and half with the next invoice is fine. Thanks for being upfront about it.'], ['c', 'Thank you, that helps a lot. The first half is on its way.']]] },
			{ when: (v) => v.variant === 'paid', look: ['Found it: their payment came in on {paidDay} with another invoice number in the description, booked against the wrong invoice. Corrected.'], ends: [[['s', 'You’re right, and I’m sorry: your payment arrived on {paidDay}, but with another invoice number in the description, so it was booked against the wrong invoice. All sorted now; please ignore the reminder.'], ['c', 'Phew, thanks for checking.']]] },
			{ when: (v) => v.variant === 'paid', look: ['Nothing from them for {invoice} in the bank since the invoice went out.'], ends: [[['s', 'I’ve been through the bank statements and can’t find it, I’m afraid. Could you send me the date and the account it was paid from? Then I’ll look again.']]] }
		],
		values: (x) => {
			x.v.variant = pick(x.r, ['forgot', 'parts', 'paid']);
			x.v.invoice = `FR-2026-${String(380 + int(x.r, 0, 160)).padStart(4, '0')}`;
			x.v.paidDay = dateLong(nextWeekday(x.open - int(x.r, 8, 16) * DAY));
			x.v.openText =
				x.v.variant === 'forgot'
					? 'Sorry, we got your reminder about invoice {invoice}. It completely slipped through; things have been chaotic here. I’ll pay it this week.'
					: x.v.variant === 'parts'
						? 'We received your reminder for invoice {invoice}. To be honest, it has been a quiet few months and money is tight. Could we pay it in two parts?'
						: 'Your reminder about {invoice} surprised me: I’m sure we paid it at the start of the month. Could you check again?';
		}
	},
	{
		key: 'corporate',
		area: 'shop',
		party: 'person',
		staff: 'daan',
		second: 'femke',
		since: '2026-09-25',
		max: 6,
		subjects: ['Christmas gifts for our staff', 'Corporate gifts', 'Christmas presents for {people} people', 'Gift boxes?'],
		open: ['I work at {company}, and we’re looking for a Christmas present for our {people} staff. Would you do gift boxes with coffee, or vouchers?', 'Our HR team would like to give everyone a bag of coffee and a voucher for one of your classes at Christmas. We are {people} people. Is that possible, and what would it cost?'],
		ask: ['What a nice idea. What budget per person did you have in mind, and when would you need them?'],
		paths: [
			{ detail: ['About 25 EUR a person, and we’d need them by 15 December.'], ends: [[['s', 'That works well: a 250 g bag of your choice and a voucher for the cupping evening fits that budget nicely. I’ll send you a proposal with two or three choices by {fri}.'], ['c', 'Lovely, I’ll wait for that.']]] },
			{ detail: ['Around 20 EUR each. Mid-December would be ideal.'], ends: [[['s', 'For 20 EUR we can do a 250 g bag of the Ethiopia or the Colombia with a handwritten card, in a box. For {people} people that’s {corpTotal} EUR, ready to collect on 16 December.'], ['c', 'Perfect, let’s do that. Please go ahead.'], ['s', 'Done: {people} boxes for 16 December, in the roast plan, with the invoice to follow.']]] },
			{ detail: ['We don’t have a budget yet; I need to ask our director first.'], ends: [[['s', 'No problem. Let me know the budget when you have it, and I’ll make a proposal.']]] },
			{ detail: ['About 8 EUR each. We’re {people} here, plus our clients, so 150 in all, delivered to three offices.'], ends: [[['s', 'I’m afraid that’s more than we can manage before Christmas at that price: 150 boxes, roasted and packed by hand in our busiest month. With more notice, another year, we’d love to.'], ['c', 'Understood, thanks for being honest.']]] }
		],
		values: (x) => {
			x.v.company = pick(x.r, ['a design agency in the city centre', 'an engineering firm in Lage Weide', 'the municipality’s youth services', 'a law firm on the Maliebaan', 'a translation agency', 'an IT company in Papendorp']);
			x.v.people = String(int(x.r, 14, 40));
			x.v.corpTotal = money(+x.v.people * 20);
		}
	},
	{
		key: 'collab',
		area: 'other',
		party: 'person',
		staff: 'marit',
		second: 'daan',
		max: 5,
		subjects: ['Collaboration?', 'An idea', 'Working together', 'Coffee {product}'],
		open: ['{openText}'],
		ask: ['That sounds fun! How much coffee would you need, and when?', 'Interesting! Tell me more: roughly how much coffee, and for when?'],
		paths: [
			{ detail: ['About 3 kg for a first batch in {month}.'], ends: [[['s', 'Let’s do it. Come by on a Thursday to taste the coffees with me, and we’ll roast your 3 kg for the day you need them.'], ['c', 'Brilliant, see you on {thu}.']]] },
			{ detail: ['Not sure yet; we’re still testing.'], ends: [[['s', 'Come and pick up a bag of each to test with, then, and let me know the amounts when you know them.']]] },
			{ detail: ['Quite a lot, actually: 40 kg a month, and we’d want our own label on the coffee.'], ends: [[['s', 'That’s more than we can roast alongside our cafés, and we don’t sell our coffee under other people’s labels, I’m afraid. A smaller batch with both our names on it would be lovely, though, if that’s ever of interest.'], ['c', 'Understood. We’ll keep it in mind.']]] },
			{ detail: ['Maybe 5 kg to start, around {month}.'], ends: [[['s', 'Sounds good. Let me think about which coffee would work best, and I’ll come back to you with a suggestion and a price by {fri}.'], ['c', 'Great, looking forward to it.']]] }
		],
		values: (x) => {
			const [product, text] = pick(x.r, [
				['stout', 'We’re a small brewery in {area} and would love to brew a coffee stout with your Ethiopia for the winter. Would you be interested in a collaboration?'],
				['chocolate', 'I make chocolate in small batches and have been thinking about a coffee bar made with your beans. Could we talk?'],
				['ice cream', 'We make ice cream in {area} and want a coffee flavour for next season, with beans from a local roaster. Interested?'],
				['liqueur', 'We distil fruit liqueurs and would like to make a coffee liqueur with a local roaster. Is that something you’d consider?']
			] as const);
			x.v.product = product;
			x.v.openText = text;
		}
	},
	// Suppliers.
	{
		key: 'bags',
		area: 'supplier',
		party: 'bags',
		staff: 'marit',
		second: 'youssef',
		subjects: ['Your order of valve bags', 'Delivery delay', 'Prices from 1 January', 'Compostable bags', 'Re: bag order'],
		open: ['{openText}'],
		paths: [
			{ when: (v) => v.variant === 'delay', look: ['Bags count: about 900 of the 250 g left, enough for three weeks. Fine if it doesn’t slip again.'], ends: [[['s', 'Thanks for letting me know. We have enough for about three weeks, so {date2} is fine, but please don’t let it slip any further.'], ['c', 'Understood. I’ll let you know straight away if anything changes.']]] },
			{ when: (v) => v.variant === 'delay', look: ['Only about 400 of the 250 g bags left: ten days at most.'], ends: [[['s', 'Two weeks is tight: we’ll run out of 250 g bags before then. Could you send part of the order earlier, say 1,000 bags?'], ['c', 'I’ll ask the warehouse and come back to you tomorrow.']]] },
			{ when: (v) => v.variant === 'prices', ends: [[['s', 'Thanks, {first}. We’ll order for the first half of next year before 15 December, then; I’ll send you the order in the next few weeks.'], ['c', 'Thank you, Marit.']]] },
			{ when: (v) => v.variant === 'compostable', ends: [[['s', 'Thanks, {first}. Yes, please send samples of both sizes; we’d like to test whether they keep the coffee fresh for six weeks.'], ['c', 'The samples will go out this week.']]] },
			{ when: (v) => v.variant === 'compostable', ends: [[['s', 'Thanks for sending these. At almost a third more per bag we can’t switch this year, but please keep us in mind if the price comes down.'], ['c', 'Of course, thank you for considering it.']]] },
			{ ends: [[['s', 'Thanks, {first}. While I have you: several 250 g bags from your last delivery have split along the bottom seam, with customers’ coffee all over the parcel. Could you look into that batch?'], ['c', 'I’m sorry to hear that. Could you send me the batch number from the box label and a few of the split bags? Then I’ll have it checked.'], ['s', 'The batch number is {batch}; five split bags go in the post today.']]] }
		],
		values: (x) => {
			x.v.variant = pick(x.r, ['delay', 'prices', 'compostable']);
			x.v.openText =
				x.v.variant === 'delay'
					? 'Your order of 3,000 kraft valve bags (250 g, printed) is delayed by about two weeks, because our film supplier has had a breakdown. The new expected delivery is {date2}. Our apologies for the inconvenience.'
					: x.v.variant === 'prices'
						? `From 1 January our prices for valve bags go up, because paper and film have become more expensive. The new prices are below. Orders placed before 15 December are still at the current prices.\n\n${pasteOf(x, 'bagPrices')}`
						: `As discussed at the trade fair, here are the details of our home-compostable valve bags, next to the bags you buy now. We can send samples in 250 g and 1 kg.\n\n${pasteOf(x, 'bagQuote')}`;
			x.v.batch = `VB-${int(x.r, 24000, 26999)}`;
		}
	},
	{
		key: 'importer',
		area: 'supplier',
		party: 'importer',
		staff: 'marit',
		second: 'youssef',
		subjects: ['Current offer', 'New arrivals', 'Your contract {contract}', 'Samples', 'Offer: new crop Colombia'],
		open: ['{openText}'],
		paths: [
			{ when: (v) => v.variant === 'offer', ends: [[['s', 'Thanks, {first}. Could you send 300 g samples of the {lotPick}? We’re looking at the House Blend for next year.'], ['c', 'The samples go out tomorrow.']], [['s', 'Thanks for the offer. Samples of the {lotPick}, please.'], ['c', 'Will do. You should have it by the end of the week.']]] },
			{ when: (v) => v.variant === 'decaf', ends: [[['s', 'Thanks, {first}. Yes please, a sample of the decaf: we’ve been looking for a good one for a long time.'], ['c', 'It goes out tomorrow.'], ['s', '@later Sample tasted: it’s the first decaf we’ve really liked. We’ll take five bags; please send the contract.'], ['c', 'Wonderful. The contract is attached; delivery to your roastery in about three weeks.'], ['s', 'Signed and sent back. Thank you!']]] },
			{ when: (v) => v.variant === 'offer', ends: [[['s', 'Thanks for the offer. We’re well covered until the spring, so nothing this time.'], ['c', 'Understood. I’ll send the next offer in January.']]] },
			{ when: (v) => v.variant === 'delay', look: ['Guji in the store below. About three weeks of roasting, fine.'], lookPaste: 'stockCount', ends: [[['s', 'Thanks for letting me know. We have enough Guji for about three weeks, so it should be fine, but please tell me straight away if it slips again.'], ['c', 'Will do.']]] },
			{ when: (v) => v.variant === 'delay', look: ['Two bags of Guji left; that won’t last ten days.'], lookPaste: 'stockCount', ends: [[['s', 'That’s a problem for us: we have two bags left. Could you deliver four bags from your warehouse stock in the meantime and take them off the contract?'], ['c', 'I’ll check what we have in the warehouse and come back to you.']]] }
		],
		values: (x) => {
			x.v.variant = !decafOffered && x.open >= dayOf('2026-08-20') && x.open < DECAF_BOUGHT - 6 * DAY ? 'decaf' : pick(x.r, ['offer', 'offer', 'delay']);
			if (x.v.variant === 'decaf') decafOffered = true;
			x.v.contract = `${x.party.org.slice(0, 2).toUpperCase()}-26-${int(x.r, 100, 480)}`;
			x.v.bags = String(int(x.r, 6, 12));
			x.v.openText =
				x.v.variant === 'offer'
					? `Please find below our current spot and afloat offer. The new Colombian crop has just arrived and is tasting very well this year. Let me know if you would like samples.\n\n${pasteOf(x, 'greenOffer')}`
					: x.v.variant === 'decaf'
						? `You asked us in the spring about a decaf. We now have a Colombian lot from Huila, decaffeinated with mountain water, no solvents. It is at the top of our offer below; I can send a sample this week.\n\n${pasteOf(x, 'decafOffer')}`
						: 'Your contract {contract} (Ethiopia Guji, natural, {bags} × 60 kg) has been held at Antwerp for a customs inspection. We now expect it at our warehouse around {date2}, about ten days later than planned.';
		}
	},
	{
		key: 'service',
		area: 'supplier',
		party: 'technician',
		staff: 'marit',
		second: 'youssef',
		max: 3,
		subjects: ['Annual service of your roaster', 'Afterburner', 'Service visit', 'Your roaster'],
		open: ['It is almost a year since the last service of your roaster. Shall we plan the annual service? I am in your area in the {nextweek}.', 'Following your phone call: the afterburner catalyst is probably at the end of its life. A replacement costs about 1,850 EUR excluding VAT, plus half a day of work. Shall I order one?'],
		shows: 'serviceReport',
		showsIntro: ['For reference, last year’s report:'],
		paths: [
			{ opens: [0], ends: [[['s', 'Yes please. Any day that week except Tuesday and Thursday, which are our roast days. Wednesday would be ideal.'], ['c', 'Wednesday it is, from 8:00. I’ll need about five hours.']]] },
			{ opens: [0], ends: [[['s', 'Thanks, {first}. That week is difficult for us; could you do the week after instead?'], ['c', 'I’ll check my diary and let you know.']]] },
			{ opens: [1], ends: [[['s', 'Before I decide, could you send me a written quote, with the part and the work separately?'], ['c', 'I’ll send the quote this week.']]] },
			{ opens: [1], ends: [[['s', 'Yes, please go ahead.'], ['c', 'Will do. Could you send me the serial number from the plate on the back of the roaster and a photo of the afterburner? Then I can order the right part.']]] }
		]
	},
	// Everything else.
	{
		key: 'job',
		area: 'other',
		party: 'applicant',
		staff: 'daan',
		second: 'marit',
		subjects: ['Application', 'Job?', 'Weekend work', 'Open application', 'Do you need help?'],
		open: [
			'I’m a student and would love to work in your shop on Saturdays. I’ve worked as a barista for two years in a café in {town}.',
			'I saw that you have an online shop now and wondered whether you need help with packing. I’m free most weekdays and can start right away.',
			'I’m looking for a job in specialty coffee and would love to learn roasting. Could I send you my CV?'
		],
		shows: 'availability',
		showsIntro: ['When I’m free:', 'My availability:'],
		ask: ['Thanks for your email! Could you tell me a bit more about your experience, and which days you could work?'],
		paths: [
			{ opens: [0], detail: ['Saturdays are best, and Wednesday afternoons too. I’m used to busy service.', 'I’m free all week except Mondays, and I learn fast.'], ends: [[['s', 'Thanks! We are looking for someone on Saturdays from {month}. Would you like to come for a trial shift on {sat}, 9:00 to 13:00? It’s paid.'], ['c', 'Yes! I’ll be there.']]] },
			{ detail: ['I can do any day, and I’ve worked in hospitality for a few years.'], ends: [[['s', 'Thank you for your interest. We have no vacancy at the moment, I’m afraid, and we’re too small to train people from scratch. I’ll keep your email, and write to you if that changes.'], ['c', 'Thank you for letting me know.']]] },
			{ detail: ['Fridays and Saturdays, mostly. I’ve worked in two cafés, one of them in {town}.'], ends: [[['s', 'Thanks! Could you send your CV as well? Then Marit and I will have a look.']]] },
			{ gap: [5, 9], ends: [[['s', 'We’d like to invite you for a short chat at the roastery; would {day} afternoon work?'], ['s', 'Hi {first}, just checking whether you saw my email about a chat.']]] }
		]
	},
	{
		key: 'press',
		area: 'other',
		party: 'press',
		staff: 'marit',
		second: 'daan',
		max: 5,
		subjects: ['Interview request', 'Local roasters', 'Samples for a review', 'A few questions'],
		open: [
			'I’m writing a piece for {org} on independent roasters in the city and would love to talk to you. Could I visit for half an hour some time in the next two weeks?',
			'I write for {org} and review coffees from small roasters. Would you send me two of your coffees to try? I’d write about them honestly.',
			'We’re putting together a piece for {org} about the shops in your street. Could you answer a few questions by email and send a photo of the roastery?'
		],
		ask: ['Thanks for thinking of us! What is the piece about exactly, and when does it come out?', 'Sounds interesting. Can you tell me a bit more: how long a piece, and when it appears?'],
		paths: [
			{ opens: [0], detail: ['It’s a series on small food makers in the city, for the {month} issue.', 'About 800 words and a photo, out in {month}.'], ends: [[['s', 'With pleasure. Thursday mornings are best, when we’re roasting: {thu} at 10:00?'], ['c', 'Perfect, see you then.']]] },
			{ opens: [1], detail: ['Short reviews, two or three a month, with a score out of ten.'], ends: [[['s', 'Happy to: a bag of the Ethiopia Guji and one of the Colombia went in the post today.'], ['c', 'Thank you! I’ll send you the link when it’s up.']]] },
			{ detail: ['A longer piece, and we’d need about two hours with you and a photographer.'], ends: [[['s', 'Thanks for thinking of us. It’s a busy time with the Christmas preparations, so we’ll pass this time.'], ['c', 'No problem, maybe another time.']]] },
			{ opens: [2], detail: ['A short Q&A, out in {month}.'], ends: [[['s', 'Of course. Send me the questions and I’ll answer them this week.']]] },
			{ opens: [0, 2], detail: ['A short interview by email, published in {month}.'], ends: [[['s', 'Of course.'], ['c', 'Great, here are my questions: how did you start, where do your beans come from, what makes a good roast, and how has it gone since the online shop opened?'], ['s', 'Thanks, I’ll answer them by {fri}, with a photo.']]] }
		]
	},
	{
		key: 'donation',
		area: 'other',
		party: 'charity',
		staff: 'daan',
		second: 'marit',
		subjects: ['Raffle prize?', 'Request for a donation', 'Fundraiser on {sat}', 'Supporting our event'],
		open: ['We’re holding a raffle at {org}’s autumn fair on {sat} and are asking local businesses for prizes. Would you be willing to donate something?', 'We at {org} are organising a fundraising breakfast on {sat}. Could you donate coffee for about 60 people?'],
		ask: ['Thanks for asking. When would you need it, and where should it go?', 'Thanks for thinking of us. By when do you need it?'],
		paths: [
			{ opens: [1], detail: ['Any day that week is fine; the school office is open every morning.'], ends: [[['s', 'Happy to help: we’ll roast 2 kg of House Blend for the breakfast, ground for your coffee urns. I’ll drop it off on {day}.'], ['c', 'Fantastic, thank you!']]] },
			{ opens: [0], detail: ['By the Friday before, if possible. You could leave it at the school office.', 'Any time before the day; I can also come and pick it up.'], ends: [[['s', 'Of course: we’ll put together a gift bag with two coffees and a mug. I’ll drop it off on {day}.'], ['c', 'That’s wonderful, thank you so much!']]] },
			{ detail: ['Any day that week; I can come and collect it.'], ends: [[['s', 'Happy to help: a kilo of House Blend and a voucher for the brewing class. Come and collect it from the shop whenever suits you.'], ['c', 'Collected this morning. Thank you so much!']]] },
			{ detail: ['The week before, ideally. It’s our biggest event of the year.'], ends: [[['s', 'Thanks again for asking. We get a lot of requests and have already given this season’s donations to two school fairs, so we have to say no this time. Good luck with it!'], ['c', 'Understood, thanks for replying.']]] }
		]
	},
	{
		key: 'neighbour',
		area: 'other',
		party: 'neighbour',
		staff: 'marit',
		second: 'daan',
		max: 3,
		subjects: ['Smoke from the roastery', 'The smell', 'Roasting mornings', 'Chimney'],
		open: [
			'I live a few doors down from the roastery. Over the last few weeks there has been a lot of smoke from your chimney on Tuesday and Thursday mornings, and our washing smells of burnt coffee. Is something wrong?',
			'We love having you in the street, but the smell on roasting days has become much stronger lately, and on Thursday the smoke came in through our bedroom window.'
		],
		ask: ['Thank you for telling us, and I’m sorry. Could you tell me roughly when it was worst? We roast from about 8 until noon.'],
		paths: [
			{ detail: ['Mostly around ten, I think. Thursday was the worst.', 'Early, before nine, on both days.'], look: ['The afterburner catalyst is worn, I think. Asked Henk from Vlam & Trommel to come and check.'], ends: [[['s', 'Thanks. The afterburner, which cleans the smoke, needs a new part; the engineer is coming on {date}. I’ll let you know once it’s done. Until then we’ll roast early, before 9.'], ['c', 'Thanks for the quick and honest answer.']]] },
			{ detail: ['Last Thursday, mid-morning.'], ends: [[['s', 'I’m sorry about that. The engineer replaced the worn part of our afterburner on Wednesday, so it should already be much better. If you notice smoke again, please tell me straight away. And come by for a coffee, on us.'], ['c', 'It has indeed been much better this week. Thanks, and we’ll take you up on the coffee.']]] }
		]
	},
	{
		key: 'market',
		area: 'other',
		party: 'market',
		staff: 'daan',
		second: 'marit',
		since: '2026-09-01',
		max: 4,
		subjects: ['Invitation: {org}', 'Stall at {org}', 'Will you join us again?', 'Market on {marketDate}'],
		shows: 'marketInfo',
		showsIntro: ['The details:', 'In short:'],
		open: ['We’d like to invite Fernhill Roasters to have a stall at {org} on {marketDate}. Stalls are 3 by 3 metres, with power, and the fee is 75 EUR. Please let us know by {date2}.', 'Last year your stall was a hit with visitors. Will you join us again at {org} on {marketDate}?'],
		paths: [
			{ ends: [[['s', 'We’d love to. Please put us down for a stall with power: we’ll bring the espresso machine.'], ['c', 'Great! You’re on the list. Please pay the fee by {date2}; the details are on the attached form.']]] },
			{ ends: [[['s', 'Thanks for thinking of us. December is our busiest month in the roastery, and we can’t spare anyone for a whole day, so we’ll skip it this year.'], ['c', 'A pity, but understood.']]] },
			{ ends: [[['s', 'We’re interested. Could you send the site plan and the times for setting up? Then we’ll decide.']]] }
		],
		values: (x) => {
			x.v.marketDate = dateLong(nextOn(dayOf('2026-11-28') + int(x.r, 0, 3) * 7 * DAY, [0, 6]));
		}
	},
	{
		key: 'student',
		area: 'other',
		party: 'student',
		staff: 'daan',
		second: 'marit',
		max: 4,
		subjects: ['Research project', 'Questions for my thesis', 'Student project', 'Short interview?'],
		open: ['I study {role} and I’m doing a project on how small food businesses sell online. Could I ask you a few questions by email, or come by for twenty minutes?', 'For my thesis in {role}, I’m interviewing local roasters about where they buy their coffee. Would you have half an hour in the next few weeks?'],
		paths: [
			{ opens: [1], ends: [[['s', 'Of course. Send the questions and I’ll answer them.'], ['c', 'Thank you! Here they are: which importers you buy from, how you choose a coffee, and whether you visit the farms.'], ['s', 'Here are my answers: two importers, one in Amsterdam and one in Antwerp; we taste samples side by side and choose the ones we like best; and no, we can’t afford to travel, but our importers do. Good luck!']]] },
			{ opens: [0], ends: [[['s', 'Of course. Send the questions and I’ll answer them.'], ['c', 'Thank you! Here they are: how many orders you get online, what is hardest about it, and what customers ask for most.'], ['s', 'Here are my answers: a handful a week; packing on time around the roasting; and decaf. Good luck with the project!']]] },
			{ ends: [[['s', 'Thanks for asking. We’re a small team in a busy season, so I’m afraid we can’t help this time. Good luck!']]] },
			{ ends: [[['s', 'Happy to help. Could you send the questions first, so I can see how long it would take?']]] }
		]
	}
];

// One conversation.
interface Plan {
	topic: Topic;
	open: number;
	/** Threads on this topic before this one, so that its paths are taken in turn. */
	seen: number;
	order?: Order;
	/** An old order whose shipped email the person answered, to write about something else. */
	replyTo?: Order;
	/** For the pinned threads about the orders in data/orders.json. */
	pathIndex?: number;
	openIndex?: number;
}
const nextWeekday = (m: number) => nextOn(m, [1, 2, 3, 4, 5]);

const thread = (index: number, plan: Plan, number: number, earlier: (email: string) => number[]): string => {
	const r = mulberry32(7100 + index * 7919);
	const { topic } = plan;
	const me = staff[topic.staff];
	const two = staff[topic.second];
	const customer = plan.order?.who ?? plan.replyTo?.who;
	const party: Party = customer ? { ...customer, org: '', role: '', area: pick(r, areas), formal: false } : partyOf(r, topic.party);
	const open = plan.open;
	const v: Record<string, string> = {
		first: party.first,
		name: party.name,
		email: party.email,
		org: party.org,
		role: party.role,
		area: party.area,
		other: two.first,
		town: pick(r, towns),
		street: plan.order?.street ?? `${pick(r, streets)} ${int(r, 2, 140)}`,
		month: monthNames[at(open).getUTCMonth() + 1]!,
		prevMonth: monthNames[at(open).getUTCMonth() - 1]!,
		n: inWords(int(r, 2, 4)),
		group: pick(r, groups),
		item: pick(r, lostItems),
		decafNews: decafNews(open),
		decafCafe:
			open < DECAF_BOUGHT
				? 'We don’t have one yet, but Marit is tasting samples and hopes to roast one this autumn.'
				: 'We’ve bought a Colombian decaf and the trial roasts are going well; it should be ready in November.'
	};
	// Dates ahead are fixed when a message first mentions them, counted from that message.
	let t = open;
	const lazy = (key: string, make: (now: number) => string) => {
		let value: string | undefined;
		Object.defineProperty(v, key, { configurable: true, get: () => (value ??= make(t)), set: (next: string) => (value = next) });
	};
	const [dateIn, date2In, meetIn, backIn] = [int(r, 6, 9), int(r, 14, 20), int(r, 2, 3), int(r, 2, 5)];
	lazy('dateMinutes', (now) => String(nextWeekday(now + dateIn * DAY)));
	lazy('date', () => dateLong(+v.dateMinutes!));
	lazy('date2', (now) => dateLong(nextWeekday(now + date2In * DAY)));
	lazy('dayA', (now) => weekday(nextWeekday(now + meetIn * DAY)));
	lazy('dayB', (now) => weekday(nextWeekday(nextWeekday(now + meetIn * DAY) + DAY)));
	lazy('satMinutes', (now) => String(nextOn(now + 3 * DAY, [6])));
	lazy('sat', () => dateLong(+v.satMinutes!));
	lazy('sat2', () => dateLong(+v.satMinutes! + 14 * DAY));
	lazy('thu', (now) => dateLong(nextOn(now + 4 * DAY, [4])));
	lazy('fri', (now) => dateLong(nextOn(now + DAY, [5])));
	lazy('nextweek', (now) => `week of ${dayMonth(nextOn(now + 7 * DAY, [1]))}`);
	lazy('backMinutes', (now) => String(nextWeekday(now + backIn * DAY)));
	lazy('back', () => dateLong(+v.backMinutes!));
	if (party.biz) {
		const facts = cafeFacts(party.biz);
		Object.assign(v, { kg: String(facts.kg), deliv: facts.deliv, second: facts.second, secondKg: String(facts.secondKg), people: String(party.biz.people ?? ''), what: party.biz.what ?? '' });
	}
	const order = plan.order;
	if (order) {
		const coffee = order.lines.find((line) => line.product !== grinder)?.product ?? house250;
		Object.assign(v, {
			order: order.id,
			orderDate: dateLong(order.placed),
			orderDay: weekday(order.placed),
			items: itemsText(order),
			total: euros(order.cents),
			coffee: coffee.name,
			coffeePrice: euros(coffee.cents),
			code: trackingCode(order),
			code2: `3SFERN${String(int(r, 7000, 9999))}`,
			claim: `PNL-${int(r, 400000, 999999)}`,
			nn: String(int(r, 2, 120)),
			sig: pick(r, ['M. de Jong', 'Bakker', 'J.P.', 'van Rijn', 'S. Öztürk', 'Anja', 'K. Hendriks'])
		});
		if (order.shipped) Object.assign(v, { shipDay: weekday(order.shipped), shipDate: dateLong(order.shipped), shipNext: dateLong(nextWeekday(order.shipped + DAY)) });
	}
	// The opening, then the path: pinned, or the next in turn among those that fit this thread.
	const openIndex = plan.openIndex ?? int(r, 0, topic.open.length - 1);
	v.openIndex = String(openIndex);
	const x: Ctx = { r, v, open, order, party, now: open };
	topic.values?.(x);
	const iso = (m: number) => at(m).toISOString().slice(0, 10);
	const fits = (path: Path) =>
		(!path.since || iso(open) >= path.since) && (!path.until || iso(open) <= path.until) && (!path.when || path.when(v)) && (!path.opens || path.opens.includes(openIndex));
	const fitting = topic.paths.filter(fits);
	const candidates = fitting.length ? fitting : topic.paths.filter((item) => !item.opens || item.opens.includes(openIndex));
	const path = plan.pathIndex !== undefined ? topic.paths[plan.pathIndex]! : candidates[(plan.seen + topics.indexOf(topic)) % candidates.length]!;

	const dayGap = int(r, 1, 2);
	const f = (text: string) => {
		text = text.replace(/\{paste:(\w+)\}/g, (_, kind: string) => paste(kind as PasteKind));
		const ship = nextOn(t + DAY, [3, 5]);
		const relative = { day: weekday(nextWeekday(t + dayGap * DAY)), day2: weekday(nextWeekday(nextWeekday(t + dayGap * DAY) + DAY)), ship: weekday(ship), arrive: weekday(nextOn(ship + DAY, [2, 3, 4, 5, 6])) };
		return fill(fill(text, Object.assign(Object.create(v) as Record<string, string>, relative)), v);
	};
	const paste = (kind: PasteKind | undefined) => {
		x.now = t;
		return pasteOf(x, kind);
	};
	const messages: string[] = [];
	const labels: Record<Who, string> = {
		c: `**${party.name}** <${party.email}>`,
		s: `**${me.first} ${me.last}** (Fernhill Roasters)`,
		S: `**${two.first} ${two.last}** (Fernhill Roasters)`,
		n: `**${me.first}** · internal note`,
		N: `**${two.first}** · internal note`,
		o: `**${party.name}** <${party.email}> · automatic reply`
	};
	let last = 'c' as Who;
	let staffWrote = false;
	let quoted = '';
	const quotes = r() < (party.formal ? 0.3 : 0.55);
	const say = (who: Who, body: string) => {
		const quote = who === 'c' && quotes && quoted && r() < 0.75 ? `\n\n${quoted}` : '';
		messages.push(`${labels[who]} · ${stamp(t)}\n\n${body.trim()}${quote}`);
		if (who === 's' || who === 'S') {
			const writer = who === 's' ? me : two;
			quoted = `On ${dateLong(t)} 2026 at ${clock(t)}, ${writer.first} ${writer.last} <hello@fernhill.example> wrote:\n\n${body.trim().split('\n').map((line) => (line ? `> ${line}` : '>')).join('\n')}`;
			staffWrote = true;
		}
		if (who === 'c') quoted = '';
		last = who;
	};
	/** Moves the clock to the next message; `quick` for a reply in the same conversation of the day. */
	const advance = (who: Who, quick: boolean) => {
		const before = t;
		const reply = who === 's' || who === 'S';
		if (who === 'c') t = waking(r, t + (quick ? int(r, 15, 400) : int(r, 25, 1500)));
		else if (reply) t = office(r, t + (quick || topic.urgent ? int(r, 10, 150) : int(r, 20, 650)), (who === 's' ? topic.staff : topic.second) === 'daan');
		else if (who === 'o') t += int(r, 1, 2);
		else t = office(r, t + int(r, 5, 240), false);
		if (t > LAST_MESSAGE) t = before + int(r, 4, 40);
	};
	const business = Boolean(party.biz) || party.formal;
	const custBody = (paragraphs: string[], opening: boolean) => {
		const parts: string[] = [];
		if (opening) {
			if (r() < 0.85) parts.push(`${party.formal ? pick(r, ['Dear Fernhill Roasters', 'Dear Fernhill team', 'Dear Marit']) : pick(r, greetings.filter((g) => minuteOfDay(t) < 720 || !g.includes('morning')))},`);
		} else if (r() < 0.75) parts.push(party.formal ? `Dear ${staffWrote ? me.first : 'all'},` : `${pick(r, ['Hi', 'Hello', 'Hoi', 'Hi again'])}${staffWrote ? ` ${me.first}` : ''},`);
		parts.push(...paragraphs.filter(Boolean));
		const signs = party.formal ? (party.org ? formalSign : ['Kind regards,\n{name}', 'Best regards,\n\n{name}']) : party.biz ? (opening ? bizSign : ['{first}\n{org}', 'Groetjes,\n{first} ({org})', 'Cheers,\n{first}, {org}', '{first}']) : opening ? casualSign : replySign;
		parts.push(f(pick(r, signs)));
		if (!party.formal && r() < 0.12) parts.push(pick(r, footers));
		return parts.join('\n\n');
	};
	const pending: string[] = [];
	const staffBody = (who: 's' | 'S', paragraphs: string[], ending = false) => {
		const writer = who === 's' ? me : two;
		const named = new RegExp(`^(Thanks|Thank you|Hi|Hello|Dear),? ${party.first}\\b`).test(paragraphs[0] ?? '');
		const hello = named ? '' : party.formal ? `Dear ${party.first},` : pick(r, [`Hi ${party.first},`, `Hello ${party.first},`, `Hi ${party.first},`]);
		const extra = pending.splice(0);
		const closing = ending && !paragraphs.at(-1)!.trimEnd().endsWith('?') && r() < 0.4 ? [pick(r, closings)] : [];
		return [...(hello ? [hello] : []), ...paragraphs.filter(Boolean), ...extra, ...closing, fill(pick(r, staffSign), { me: writer.first, meLast: writer.last, line: writer.line })].join('\n\n');
	};
	const holdingReply = () => {
		advance('s', false);
		say('s', staffBody('s', [f(pick(r, holding))]));
	};

	// 1. The opening message, with a remark, a second matter and something pasted.
	const chatty = !topic.urgent;
	const customerKind = (topic.party === 'person' && topic.area !== 'other') || (Boolean(party.biz) && topic.area !== 'supplier');
	const sides = (!chatty ? [] : party.biz && topic.area !== 'supplier' ? bizSides : customerKind || topic.party === 'organiser' ? personSides : []).filter((item) => !item.a.includes(me.first));
	const tangent = chatty && customerKind && !party.biz && r() < 0.3 ? pick(r, tangents) : undefined;
	const side = sides.length && r() < 0.6 ? pick(r, sides) : undefined;
	const side2 = side && r() < 0.5 ? pick(r, sides.filter((other) => other !== side)) : undefined;
	const opening = [f(topic.open[openIndex]!)];
	if (chatty && customerKind && !party.formal && r() < 0.5) opening.unshift(f(pick(r, contexts[business ? 'business' : 'person'])));
	if (chatty && (customerKind || party.formal) && r() < 0.65) opening.unshift(f(pick(r, intros[party.formal ? 'formal' : business ? 'business' : 'person'])));
	if (topic.more) for (const more of shuffle(r, topic.more).slice(0, r() < 0.8 ? int(r, 1, 2) : 0)) opening.push(f(more));
	if (tangent) opening.push(tangent[0]);
	const showable = topic.shows && (topic.shows !== 'shipped' || order?.shipped) && r() < 0.85;
	if (showable) opening.push(`${pick(r, topic.showsIntro ?? ['For reference:'])}\n\n${paste(topic.shows)}`);
	const sideInOpening = side && (!topic.ask || !path.detail) && r() < 0.8;
	if (sideInOpening) {
		opening.push(f(side.q));
		pending.push(f(side.a));
	}
	if (tangent) pending.unshift(tangent[1]);
	say('c', custBody(opening, true));

	// 2. A question back, and the answer, which may raise the second matter.
	if (topic.ask) {
		advance('s', false);
		const ask = f(pick(r, topic.ask));
		say('s', staffBody('s', [/^(Thanks|Thank you|Sorry|Of course|Happy|Let|Oh no|What|Lovely|Interesting|That)/.test(ask) ? ask : [pick(r, acks), ask].filter(Boolean).join(' ')]));
		if (business && r() < 0.12) {
			advance('o', false);
			say('o', f(pick(r, outOfOffice)));
			t = Math.max(t, Math.min(+v.backMinutes! + int(r, 8 * 60, 11 * 60), LAST_MESSAGE - 20 * 60));
		}
		if (path.detail) {
			advance('c', false);
			const answer = [f(pick(r, path.detail)), paste(path.paste)];
			const asked = side && !sideInOpening ? side : side2;
			if (asked) {
				answer.push(f(asked.q));
				pending.push(f(asked.a));
			}
			say('c', custBody(answer, false));
		}
	}

	// A second matter or two, raised while the first is being looked into, each settled in a few messages.
	const talks = (
		!chatty ? [] : party.biz && topic.area !== 'supplier' ? bizTalks : topic.area === 'supplier' ? supplierTalks : customerKind || topic.party === 'organiser' ? personTalks : (otherTalks[topic.party] ?? [])
	).filter((talk) => !talk.some(([who, text]) => who === 's' && text.includes(me.first)));
	const chosen = shuffle(r, talks).slice(0, r() < 0.85 ? (r() < 0.5 ? 2 : 1) : 0);
	const runTalks = (list: Msg[][]) => {
		for (const talk of list) {
			talk.forEach(([who, body], i) => {
				advance(who, i > 0);
				if (who === 'c') say('c', custBody([i === 0 && last !== 'c' ? cap(f(body).replace(/^(Oh, and |And |Also, |Also: )/, (m) => (m.startsWith('Also') ? 'Another thing: ' : ''))) : f(body)], false));
				else say('s', staffBody('s', [f(body)]));
			});
		}
	};
	// When the party has the last word on the first matter, the second comes up afterwards; otherwise while it waits.
	const end = pick(r, path.ends);
	const after = end.at(-1)![0] === 'c' && r() < 0.7;
	if (!after) {
		if (chosen.length && !staffWrote) holdingReply();
		runTalks(chosen);
	}

	// 3. Sometimes a holding reply and a chaser; then what the team found.
	if (chatty && path.look && last !== 's' && r() < 0.45) {
		holdingReply();
		if (r() < 0.5) {
			advance('c', false);
			say('c', custBody([pick(r, chasers)], false));
		}
	}
	if (path.look) {
		advance('n', false);
		const more = !path.lookPaste && order && r() < 0.7 ? `From the orders mailbox:\n\n${orderMail(order)}` : !path.lookPaste && party.biz && topic.party === 'cafe' && r() < 0.85 ? paste('account') : '';
		const extra = topic.note && r() < topic.note.p ? paste(topic.note.kind) : '';
		say('n', [f(pick(r, path.look)), paste(path.lookPaste), extra, more].filter(Boolean).join('\n\n'));
	}
	if (path.second) {
		advance('N', false);
		say('N', f(pick(r, path.second)));
	}

	// 4. The ending. Two replies from the team in a row are a follow-up some days later.
	/** Days pass, but the export was made on 13 November. */
	const wait = (days: number) => {
		t = Math.max(t, Math.min(t + days * DAY, LAST_MESSAGE - 9 * 60));
	};
	if (path.gap) wait(int(r, path.gap[0], path.gap[1]));
	let attach = topic.reply && r() < topic.reply.p * 1.25 ? topic.reply : undefined;
	end.forEach(([who, body], i) => {
		const followUp = i > 0 && (who === 's' || who === 'S') && (end[i - 1]![0] === 's' || end[i - 1]![0] === 'S');
		if (followUp) wait(int(r, 4, 7));
		if (body.startsWith('@later ')) wait(int(r, 5, 9));
		advance(who, false);
		let text = f(body.replace(/^@later /, ''));
		if (attach && who === 's') {
			text += `\n\n${pick(r, attach.intro)}\n\n${paste(attach.kind)}`;
			attach = undefined;
		}
		if (who === 'c') say('c', custBody(i === end.length - 1 && side?.then && r() < 0.5 ? [text, f(side.then)] : [text], false));
		else if (who === 's' || who === 'S') say(who, staffBody(who, [text], i === end.length - 1 || end[i + 1]![0] === 'c'));
		else say(who, text);
	});
	if (after) runTalks(chosen);

	const subject = plan.replyTo && r() < 0.7 ? `Re: Your Fernhill order ${plan.replyTo.id} has shipped` : f(pick(r, topic.subjects));
	const before = earlier(party.email);
	const shopOrders = book.filter((o) => o.who.email === party.email && o.placed < open).map((o) => o.id);
	const contact = [
		party.biz ? `${party.name}, ${party.role}, ${party.org} (${party.area})` : party.org ? `${party.name}, ${party.org}` : party.name,
		shopOrders.length ? `shop orders ${shopOrders.join(', ')}` : '',
		before.length ? `earlier conversations ${before.join(', ')}` : ''
	].filter(Boolean);
	return [`# ${subject}`, `hello@fernhill.example · conversation ${number} · started ${stampLong(open)}\nContact: ${contact.join(' · ')}`, ...messages.map((message) => `---\n\n${message}`)].join('\n\n') + '\n';
};

// Which topic each thread follows. The four orders in data/orders.json that someone wrote about are pinned to
// their dates; F-1045 and F-1046 had not shipped when the inbox was exported and stay out.
const findOrder = (open: number, need: NonNullable<Topic['order']>) => {
	const fit = book.filter((o) => {
		if (o.used || (need.grinder && !o.lines.some((line) => line.product === grinder))) return false;
		if (need.from === 'placed') return o.placed >= open - 1.5 * DAY && o.placed <= open + 0.5 * DAY;
		return o.shipped !== null && open - o.shipped >= need.min * DAY && open - o.shipped <= need.max * DAY;
	});
	return fit.sort((a, b) => b.placed - a.placed)[0];
};
const dealer = mulberry32(20260803);
const span = (LAST_DAY - FIRST_DAY) / DAY + 1;
const plans: (Plan | undefined)[] = Array.from({ length: ITEMS }, () => undefined);
const opens = Array.from({ length: ITEMS }, (_, i) => FIRST_DAY + Math.floor((i * span) / ITEMS) * DAY + int(dealer, 7 * 60, 22 * 60));
const pins: { iso: string; minute: number; key: string; order: string; pathIndex: number; openIndex: number }[] = [
	{ iso: '2026-10-02', minute: 9 * 60 + 41, key: 'parcel', order: 'F-1041', pathIndex: 0, openIndex: 0 },
	{ iso: '2026-10-09', minute: 10 * 60 + 38, key: 'cancel', order: 'F-1043', pathIndex: 0, openIndex: 1 },
	{ iso: '2026-10-13', minute: 20 * 60 + 15, key: 'grinder', order: 'F-1042', pathIndex: 0, openIndex: 1 },
	{ iso: '2026-10-22', minute: 18 * 60 + 2, key: 'damaged', order: 'F-1044', pathIndex: 0, openIndex: 0 }
];
const used = new Map<Topic, number>();
const take = (topic: Topic) => {
	const seen = used.get(topic) ?? 0;
	used.set(topic, seen + 1);
	return seen;
};
for (const pin of pins) {
	const when = dayOf(pin.iso) + pin.minute;
	let best = -1;
	opens.forEach((o, i) => {
		if (!plans[i] && (best < 0 || Math.abs(o - when) < Math.abs(opens[best]! - when))) best = i;
	});
	const topic = topics.find((item) => item.key === pin.key)!;
	plans[best] = { topic, open: when, seen: take(topic), order: orderById(pin.order), pathIndex: pin.pathIndex, openIndex: pin.openIndex };
}
const replyTopics = new Set(['ground', 'decaf', 'gift', 'subscription', 'brewing', 'class', 'lost', 'putaside', 'apostrophe']);
let deck: Topic[] = [];
for (let i = 0; i < ITEMS; i++) {
	if (plans[i]) continue;
	let open = opens[i]!;
	const iso = at(open).toISOString().slice(0, 10);
	const allowed = (topic: Topic) =>
		(!topic.since || iso >= topic.since) && (!topic.until || iso <= topic.until) && (!topic.max || (used.get(topic) ?? 0) < topic.max) && (!topic.order || Boolean(findOrder(open, topic.order)));
	if (!deck.some(allowed)) deck = [...deck, ...shuffle(dealer, topics)];
	const topic = deck.splice(deck.findIndex(allowed), 1)[0]!;
	const plan: Plan = { topic, open, seen: take(topic) };
	if (topic.order) {
		const order = findOrder(open, topic.order)!;
		order.used = true;
		plan.order = order;
		if (topic.order.from === 'placed') plan.open = order.placed + int(dealer, 25, 200);
	} else if (replyTopics.has(topic.key) && dealer() < 0.25) {
		const old = findOrder(open, { from: 'shipped', min: 8, max: 80 });
		if (old) {
			old.used = true;
			plan.replyTo = old;
		}
	}
	plans[i] = plan;
	open = plan.open;
}

const folder = join(root, 'inbox', 'hello');
mkdirSync(folder, { recursive: true });
const ordered = plans.map((plan, index) => ({ plan: plan!, index })).sort((a, b) => a.plan.open - b.plan.open);
let number = 3104;
const seenBy = new Map<string, number[]>();
for (const { plan, index } of ordered) {
	number += int(dealer, 1, 3);
	let email = '';
	const text = thread(index, plan, number, (address) => {
		email = address;
		return [...(seenBy.get(address) ?? [])];
	});
	seenBy.set(email, [...(seenBy.get(email) ?? []), number]);
	writeFileSync(join(folder, `conversation-${number}.md`), text);
}
writeFileSync(
	join(folder, 'README.md'),
	`# hello@fernhill.example, 3 August to 6 November 2026\n\nThe ${ITEMS} conversations in the shared inbox that started between 3 August and 6 November 2026, one file\neach, exported from the shared inbox tool on 13 November. The export kept the messages and the team's internal\nnotes, but not the folders, the tags or who each conversation was assigned to. Numbers missing from the\nsequence were spam, newsletters or the shop's own order emails. Attachments are not included; where someone\npasted an email or a table into a message, it is kept as they pasted it.\n`
);
