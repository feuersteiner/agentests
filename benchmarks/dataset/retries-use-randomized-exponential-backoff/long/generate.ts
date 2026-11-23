// Writes the long material of this entry's long tasks: the invoice queries that Kestrel Freight's customers sent to
// the credit control mailbox between 1 October and 13 November 2026, one Markdown file per thread, under
// docs/invoice-queries/, as finance exported them before the mailbox moves to a new tool: the messages and internal
// notes, without tags, statuses or owners. Deterministic: fixed seeds, no clock, no network.
//   bun long/generate.ts <workspace root>
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** How many queries to write. Dates, numbers and how often each topic comes up all follow from it. */
const ITEMS = 181;

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
/** A stable number for a name, so that a customer keeps its terms, people and numbers from query to query. */
const hash = (text: string) => [...text].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);
const pad = (value: number) => String(value).padStart(2, '0');
const thousands = (n: number) => String(n).replace(/\B(?=(\d{3})+$)/g, ',');
const plain = (amount: number) => (amount / 100).toFixed(2);
const eur = (amount: number) => `€${plain(amount).replace(/\B(?=(\d{3})+\.)/g, ',')}`;
/** An amount as the worker prints it in its log and its notifications: the euros as a Python float. */
const pyAmount = (amount: number) => (amount % 100 === 0 ? `${amount / 100}.0` : String(amount / 100));
const ascii = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss');

// Time is kept in minutes since 00:00 on 1 September 2026, Central European time.
const EPOCH = Date.UTC(2026, 8, 1);
const DAY = 1440;
const at = (minutes: number) => new Date(EPOCH + minutes * 60000);
const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const weekday = (m: number) => dayNames[at(m).getUTCDay()]!;
const clock = (m: number) => `${pad(at(m).getUTCHours())}:${pad(at(m).getUTCMinutes())}`;
const hhmm = (minuteOfDay: number) => `${pad(Math.floor(minuteOfDay / 60))}:${pad(minuteOfDay % 60)}`;
const monthOf = (m: number) => monthNames[at(m).getUTCMonth()]!;
const shortDate = (m: number) => `${at(m).getUTCDate()} ${monthOf(m).slice(0, 3)} 2026`;
const longDate = (m: number) => `${at(m).getUTCDate()} ${monthOf(m)} 2026`;
const stamp = (m: number) => `${weekday(m).slice(0, 3)} ${at(m).getUTCDate()} ${monthOf(m).slice(0, 3)}, ${clock(m)}`;
const stampLong = (m: number) => `${weekday(m)} ${longDate(m)}, ${clock(m)}`;
const iso = (m: number) => at(m).toISOString().slice(0, 10);
const numeric = (m: number, sep: string) => `${pad(at(m).getUTCDate())}${sep}${pad(at(m).getUTCMonth() + 1)}${sep}2026`;
const isWeekend = (m: number) => at(m).getUTCDay() % 6 === 0;
const minuteOfDay = (m: number) => ((m % DAY) + DAY) % DAY;
const startOfDay = (m: number) => m - minuteOfDay(m);
const workdayBefore = (m: number, n: number) => {
	let d = startOfDay(m);
	for (let i = 0; i < n; ) {
		d -= DAY;
		if (!isWeekend(d)) i++;
	}
	return d;
};
const workdayAfter = (m: number, n: number) => {
	let d = startOfDay(m);
	for (let i = 0; i < n; ) {
		d += DAY;
		if (!isWeekend(d)) i++;
	}
	return d;
};
const LAST_OPEN = 73 * DAY; // 13 November
const LAST_MESSAGE = 80 * DAY + 17 * 60; // 20 November, 17:00
const DUE_DATE_LIVE = 62 * DAY; // 2 November: from this day the billing API returns a due date with every invoice
/** The fuel surcharge of each month of 2026, set from the diesel index of the month before. */
const fuelRates = [13.2, 13.0, 13.4, 13.9, 14.3, 14.0, 13.8, 14.1, 14.5, 15.2, 16.0];

// People at Kestrel Freight.
const creditControl = ['Marloes', 'Daan', 'Annika', 'Femke'];
const depots: Record<string, [string, string]> = { NL: ['Rotterdam', 'Bram de Groot'], BE: ['Antwerp', 'Joris Peeters'], DE: ['Duisburg', 'Katrin Vogel'], FR: ['Lille', 'Élodie Martin'], LU: ['Lille', 'Élodie Martin'] };
const billingTeam = ['Ruth Okafor', 'Milan Novak'];
const invoicingTeam = ['Teun Bakker', 'Ines Moreau'];
const pricing = 'Elif Kaya';
const claims = 'Hugo Lambert';
const receivable = 'Pieter Smit';
const managers: Record<string, string> = { NL: 'Sanne Jacobs', BE: 'Wim Claessens', DE: 'Lukas Weber', FR: 'Claire Dubois', LU: 'Claire Dubois' };
const KESTREL_VAT = 'NL859317624B01';

// Customers: [name, legal form, slug, city, country, what they ship, the ERP their notifications go to, a second site].
type Country = 'NL' | 'BE' | 'DE' | 'FR' | 'LU';
interface Customer {
	name: string;
	form: string;
	slug: string;
	city: string;
	country: Country;
	goods: string;
	erp: string;
	city2: string;
}
const customers: Customer[] = (
	[
		['Van der Molen Meubelen', 'B.V.', 'vandermolen', 'Zwolle', 'NL', 'furniture', 'Exact Online', 'Kampen'],
		['Brauerei Lindner', 'GmbH', 'lindner', 'Krefeld', 'DE', 'beer in kegs and crates', '', 'Moers'],
		['Atelier Vasseur', 'SARL', 'vasseur', 'Roubaix', 'FR', 'rolls of fabric', 'Cegid', 'Tourcoing'],
		['Hoogland Tuinbouw', 'B.V.', 'hoogland', 'Naaldwijk', 'NL', 'plant pots and compost', '', 'Honselersdijk'],
		['Brink Fietsonderdelen', 'B.V.', 'brink', 'Apeldoorn', 'NL', 'bicycle parts', 'AFAS', 'Deventer'],
		['Druckerei Seifert', 'GmbH', 'seifert', 'Essen', 'DE', 'printed catalogues', 'SAP Business One', 'Bochum'],
		['Maison Garnier', 'SAS', 'garnier', 'Reims', 'FR', 'cases of wine', '', 'Épernay'],
		['Lumen Verlichting', 'B.V.', 'lumen', 'Eindhoven', 'NL', 'light fittings', 'Odoo', 'Veldhoven'],
		['Peintures Morel', 'SA', 'morel', 'Lille', 'FR', 'tins of paint', '', 'Seclin'],
		['Spielwaren Kühn', 'GmbH', 'kuehn', 'Düsseldorf', 'DE', 'toys', 'Business Central', 'Neuss'],
		['Zeeuwse Bakkerijmachines', 'B.V.', 'zeeuwsebm', 'Middelburg', 'NL', 'bakery machines', '', 'Goes'],
		['Vloeren Janssens', 'NV', 'janssens', 'Hasselt', 'BE', 'flooring', 'Odoo', 'Genk'],
		['Ostermann Recycling', 'GmbH', 'ostermann', 'Dortmund', 'DE', 'returned electronics', '', 'Unna'],
		['Koffiebranderij Brugge', 'BV', 'koffiebrugge', 'Bruges', 'BE', 'sacks of coffee', '', 'Zeebrugge'],
		['Papierwaren Hesse', 'GmbH', 'hesse', 'Mönchengladbach', 'DE', 'paper goods', 'SAP Business One', 'Viersen'],
		['Ardent Office Supplies', 'B.V.', 'ardent', 'Breda', 'NL', 'office furniture and supplies', 'Exact Online', 'Oosterhout'],
		['Brasserie Leclercq', 'SA', 'leclercq', 'Namur', 'BE', 'beer', '', 'Gembloux'],
		['Glasfabriek Oranje', 'B.V.', 'oranje', 'Leerdam', 'NL', 'glassware', '', 'Gorinchem'],
		['Sanitair Wouters', 'BV', 'wouters', 'Mechelen', 'BE', 'bathroom fittings', 'Business Central', 'Lier'],
		['Keramik Brandt', 'GmbH', 'brandt', 'Höhr-Grenzhausen', 'DE', 'ceramics', '', 'Koblenz'],
		['Literie Lefèvre', 'SARL', 'lefevre', 'Tourcoing', 'FR', 'mattresses', '', 'Wattrelos'],
		['Bouwmaterialen De Ridder', 'BV', 'deridder', 'Ghent', 'BE', 'building materials', '', 'Eeklo'],
		['Smits Diervoeding', 'B.V.', 'smits', 'Oss', 'NL', 'pet food', 'AFAS', 'Uden'],
		['Vélo Lux', 'Sàrl', 'velolux', 'Luxembourg', 'LU', 'bicycles', '', 'Esch-sur-Alzette'],
		['Sportartikel Weiß', 'GmbH', 'weiss', 'Cologne', 'DE', 'sports goods', 'Odoo', 'Leverkusen'],
		['Kantoorhuis Mulder', 'B.V.', 'mulder', 'Utrecht', 'NL', 'stationery', '', 'Nieuwegein'],
		['Teppich Hoffmann', 'GmbH', 'hoffmann', 'Aachen', 'DE', 'carpets', '', 'Eschweiler'],
		['Chocolaterie Mertens', 'NV', 'mertens', 'Antwerp', 'BE', 'chocolate', 'Exact Online', 'Mortsel'],
		['Imprimerie Lambert', 'SA', 'imprimerielambert', 'Liège', 'BE', 'printed matter', '', 'Herstal'],
		['Gartenmöbel Krüger', 'GmbH', 'krueger', 'Bielefeld', 'DE', 'garden furniture', 'SAP Business One', 'Gütersloh'],
		['Bakker Houtindustrie', 'B.V.', 'bakkerhout', 'Harderwijk', 'NL', 'timber', '', 'Ermelo'],
		['Électroménager Petit', 'SAS', 'petit', 'Valenciennes', 'FR', 'household appliances', 'Cegid', 'Denain'],
		['Groen Biologische Groothandel', 'B.V.', 'groenbio', 'Amersfoort', 'NL', 'organic dry foods', 'Exact Online', 'Soest'],
		['Ziegler Werkzeuge', 'GmbH', 'ziegler', 'Wuppertal', 'DE', 'tools', '', 'Solingen'],
		['Verhoeven Schoenen', 'B.V.', 'verhoeven', 'Waalwijk', 'NL', 'shoes', '', 'Kaatsheuvel'],
		['Rousseau Diffusion', 'SARL', 'rousseau', 'Arras', 'FR', 'books', '', 'Lens']
	] as const
).map(([name, form, slug, city, country, goods, erp, city2]) => ({ name, form, slug, city, country, goods, erp, city2 }));
const countryNames: Record<string, string> = { NL: 'Netherlands', BE: 'Belgium', DE: 'Germany', FR: 'France', LU: 'Luxembourg', CH: 'Switzerland', UK: 'United Kingdom' };
const countryAdjectives: Record<string, string> = { NL: 'Dutch', BE: 'Belgian', DE: 'German', FR: 'French', LU: 'Luxembourg' };
/** The language a customer writes its sign-off in: Flemish customers sign in Dutch, Walloon ones in French. */
const language = (c: Customer) => (c.country === 'BE' ? (['Namur', 'Liège'].includes(c.city) ? 'FR' : 'NL') : c.country === 'LU' ? 'FR' : c.country);
const givenNames: Record<string, string[]> = {
	NL: ['Joke', 'Marieke', 'Sander', 'Ruud', 'Ilse', 'Bas', 'Linda', 'Mark', 'Esther', 'Wouter', 'Anouk', 'Kees', 'Els', 'Koen', 'Griet', 'Bart'],
	DE: ['Sabine', 'Jörg', 'Petra', 'Thomas', 'Anja', 'Markus', 'Claudia', 'Stefan', 'Monika', 'Uwe', 'Julia', 'Frank'],
	FR: ['Sophie', 'Julien', 'Nathalie', 'Olivier', 'Camille', 'Thierry', 'Isabelle', 'Nicolas', 'Céline', 'Laurent', 'Aurélie', 'Benoît']
};
const familyNames: Record<string, string[]> = {
	NL: ['de Vries', 'Jansen', 'Bakker', 'Visser', 'Smit', 'Meijer', 'Mulder', 'de Boer', 'Bos', 'Vos', 'Peeters', 'Maes', 'Willems', 'Goossens'],
	DE: ['Müller', 'Schmidt', 'Schneider', 'Fischer', 'Becker', 'Hoffmann', 'Schäfer', 'Koch', 'Richter', 'Klein', 'Wolf', 'Neumann'],
	FR: ['Martin', 'Bernard', 'Thomas', 'Robert', 'Durand', 'Leroy', 'Moreau', 'Simon', 'Laurent', 'Lefebvre', 'Fontaine', 'Mercier']
};
const roles = ['Accounts payable', 'Finance manager', 'Logistics coordinator', 'Office manager', 'Controller', 'Purchasing', 'Bookkeeper', 'Head of finance', 'Shipping clerk', 'Accounts assistant'];
const payablesBox: Record<string, string> = { NL: 'crediteuren', DE: 'kreditoren', FR: 'fournisseurs' };

// Where the goods went: [consignee, city, country].
const consignees = (
	[
		['Wonen & Zo', 'Amersfoort', 'NL'], ['Kantoor Plus', 'The Hague', 'NL'], ['Tuincentrum De Linde', 'Ede', 'NL'], ['Bouwmarkt Kools', 'Venlo', 'NL'],
		['Sporthuis Dekker', 'Haarlem', 'NL'], ['Distributiecentrum Bleiswijk', 'Bleiswijk', 'NL'], ['Brico Lemaire', 'Charleroi', 'BE'],
		['Keukencentrum Vermeulen', 'Roeselare', 'BE'], ['Hotel des Ardennes', 'Durbuy', 'BE'], ['Woonwinkel Claes', 'Leuven', 'BE'],
		['Möbelhaus Rieger', 'Kassel', 'DE'], ['Getränke Hahn', 'Bochum', 'DE'], ['Fahrrad Becker', 'Münster', 'DE'], ['Spielzeugland Voss', 'Hanover', 'DE'],
		['Elektro Krause', 'Hamm', 'DE'], ['Lagerhaus Nord', 'Bremen', 'DE'], ['Le Comptoir du Vin', 'Paris', 'FR'], ['Magasin Leduc', 'Amiens', 'FR'],
		['Papeterie Morin', 'Rouen', 'FR'], ['Supermarché Bonnet', 'Metz', 'FR'], ['Maison du Vélo', 'Ettelbruck', 'LU'], ['Weinhandel Studer', 'Basel', 'CH'],
		['Bürohaus Meier', 'Zürich', 'CH'], ['Hartley Interiors', 'Birmingham', 'UK'], ['Northgate Trade Supplies', 'Manchester', 'UK']
	] as const
).map(([name, city, country]) => ({ name, city, country: country as string }));
const drivers = ['R. Kuipers', 'M. Wójcik', 'H. Demir', 'J. van Dam', 'P. Nowak', 'S. Lemaire', 'T. Krüger', 'A. Bakker', 'D. Ionescu', 'K. Janssen'];

// Topics. A query follows one path of one topic. Nothing about the topic, the cause or how it ended is written into
// the file except through the messages themselves.
type Flag =
	| 'heavy' | 'typo' | 'under' | 'pallets' | 'tail' | 'tailUsed' | 'standing' | 'early' | 'noslot' | 'toll' | 'timed' | 'customs'
	| 'vat21' | 'nonNL' | 'nlOnly' | 'erp' | 'zeroCent' | 'oddCent' | 'longTerms' | 'damage' | 'wrongScan' | 'secondSite' | 'portal'
	| 'phone' | 'rounding' | 'consPhoned' | 'sister' | 'rename' | 'fixedFuel' | 'allIn' | 'fixedRates' | 'misallocated' | 'paidOther'
	| 'crossed' | 'late' | 'discount' | 'ourMiss' | 'fee' | 'old' | 'returned' | 'reconcile';
/** c customer, a credit control, n credit control's note, o depot, b billing, w invoicing, p pricing, k/K claims, m/M account manager, f receivable, s mailbox. */
type Who = 'c' | 'a' | 'n' | 'o' | 'b' | 'w' | 'p' | 'k' | 'K' | 'm' | 'M' | 'f' | 's';
type Msg = [Who, string];
interface Path {
	flags?: Flag[];
	/** The customer's answer to credit control's question. */
	detail: string[];
	/** Pasted by the customer under the answer. */
	paste?: string;
	/** The note of the colleague who finds out. */
	look: string[];
	lookWho: Who;
	lookPaste?: string;
	ends: Msg[][];
}
interface Topic {
	flags?: Flag[];
	/** The first day a query on this topic can be opened, in minutes. */
	since?: number;
	subjects: string[];
	open: string[];
	more?: string[];
	/** Pasted by the customer under the first message. */
	shows?: string;
	ask: string[];
	/** Credit control's first note, usually before anyone knows the cause. */
	guess: string[];
	/** Pasted under that note; the invoice when left out. */
	guessPaste?: string;
	/** Teams credit control may ask first, before the one that finds out. */
	detour?: Who[];
	paths: Path[];
}

const topics: Topic[] = [
	// The price is higher than the customer expected for the weight.
	{
		flags: ['heavy'],
		subjects: ['Invoice {inv} too high', 'Price does not match quote', 'Query on invoice {inv}', 'Overcharge?', 'Freight cost {shp}'],
		open: [
			'Invoice {inv} for shipment {shp} came to {total}, but our buyer was quoted a lot less for these {palletsN} to {consCity}. We send this lane nearly every month and it has never cost this much. Can you check what happened?',
			'We received {inv} today. The freight line is much higher than what we normally pay for {consCity}. I compared it with the last three invoices for the same customer and they are all about a third of this one. Please explain or correct it.',
			'Our controller stopped invoice {inv} because it is far above budget for the lane. The goods were {palletsN} of {goods}, nothing special, and the freight is {base} before fuel. I cannot approve it like this.'
		],
		more: ['I have to post our {month} costs by {day}, so a quick answer would help.', 'We have put the invoice on hold until we hear from you; the others from this month are paid.', 'Our logistics coordinator {name2} can confirm the shipment details if you need them.'],
		shows: 'pdf',
		ask: [
			'Thank you for flagging it. Could you send me the quote your buyer received, or tell me which weight you expected to be charged for? Then I can compare it line by line.',
			'Thanks for writing. Before I dig in, which figure were you expecting? A copy of the quote or your order confirmation would be ideal.'
		],
		guess: [
			'First look: {inv} is priced at the October list for {weight} kg on this lane. They are probably comparing with September prices. Asking the depot to confirm the weight before I answer.',
			'Lane and rate look normal, current list. Could be the price review again; checking the weight on the booking first.'
		],
		detour: ['p'],
		paths: [
			{
				flags: ['typo', 'phone'],
				detail: [
					'The quote was for {lessWeight} kg, which is what the packing list says. I have put it below. Where does {weight} come from?',
					'Our packing list says {lessWeight} kg for the {palletsN}, see below. The invoice says {weight} kg, which is impossible for that many pallets of {goods}.'
				],
				paste: 'packing',
				lookWho: 'o',
				look: [
					'The phone booking for {shp} was keyed in by our desk as {weight} kg. The scale at {depot} logged {lessWeight} kg at collection. Our typo, sorry. The invoice should be on {lessWeight}.',
					'Checked the collection scan: {lessWeight} kg gross on the depot scale. The booking says {weight}; whoever took the call typed an extra digit. The customer is right.'
				],
				lookPaste: 'shipment',
				ends: [
					[['a', 'You were right, and I am sorry for the trouble. The weight was entered wrongly when the shipment was booked with our depot by phone: {weight} kg instead of {lessWeight} kg. I have raised credit note {cn} for the whole invoice and a new invoice, {newInv}, for {fixedTotal}, priced on {lessWeight} kg. Both are attached.'], ['c', 'Thank you, the new invoice matches the quote. I will pay {newInv} in this week’s run.']],
					[['a', 'Thanks for the packing list. Our depot confirms the scale at collection read {lessWeight} kg, so the weight on the booking was a typing mistake on our side. Credit note {cn} cancels {inv}, and {newInv} replaces it at {fixedTotal}.'], ['c', 'Received both. Approved and booked.'], ['a', 'Thanks for confirming. I will close this query.']]
				]
			},
			{
				flags: ['under', 'portal'],
				detail: ['The quote was based on {lowWeight} kg, which our warehouse entered in your portal.', '{lowWeight} kg, according to our warehouse. That is what they always enter for this product.'],
				lookWho: 'o',
				look: [
					'Scale at {depot} at collection: {weight} kg gross for {palletsN}. Customer declared {lowWeight}. We charge on the weighed weight under our conditions, so the invoice is right. The scale was certified in August; certificate on file.',
					'Depot scale says {weight} kg. They declared {lowWeight}. Looks like their warehouse enters the net weight of the goods, without pallets and packaging.'
				],
				lookPaste: 'shipment',
				ends: [
					[['a', 'Thanks, {name}. Our depot weighed the {palletsN} at collection at {weight} kg, against the {lowWeight} kg entered in the portal. Under our conditions we charge on the weighed weight. The difference looks like net against gross: pallets, wrapping and boxes add up quickly. The scale ticket is attached.'], ['c', 'I checked with our warehouse and they do enter the net weight. Fair enough, we will pay the invoice, and I have asked them to enter the gross weight from now on.']],
					[['a', 'Our scale at {depot} weighed the shipment at {weight} kg, and that is what we charge on; the portal had {lowWeight} kg. I suspect your warehouse enters the weight of the goods without the pallets.'], ['c', 'Our warehouse manager says the same. OK, we accept it. Can the portal show the weighed weight somewhere, so we see it before the invoice comes?'], ['a', 'Not yet, I am afraid, but I have passed the idea on to the team that runs the portal.']]
				]
			},
			{
				detail: ['I will ask our buyer for the quote, she is out today.', 'Let me find the quote. Our purchasing department keeps them, not us.'],
				lookWho: 'o',
				look: [
					'Booking says {weight} kg and the collection scan shows the same. Nothing wrong at our end that I can see, but I do not have the quote they are comparing with.',
					'Weight on the booking matches the depot scale. If they were quoted lower, it was for a lighter shipment or an old rate.'
				],
				ends: [
					[['a', 'Our depot weighed the pallets at {weight} kg, which is what the invoice is based on. When your buyer is back, please send me the quote and I will compare it with the invoice line by line.'], ['s', 'Automatic reminder sent to the customer after seven days without a reply.']],
					[['a', 'The weight we charged matches our scale at collection. Once I have the quote I can see where the difference comes from.'], ['c', 'Still looking for it, sorry. Our buyer is sure she has it somewhere. I will come back to you.']]
				]
			}
		]
	},
	// The fuel surcharge.
	{
		subjects: ['Fuel surcharge', 'Fuel surcharge on {inv}', 'Why is the fuel line so high?', 'Surcharge query', 'Question about {month} invoices'],
		open: [
			'All our {month} invoices have a fuel surcharge of {fuelPct}%. Earlier in the year it was lower. Who decides this percentage, and where can I see it?',
			'I am going through the invoices for {month} and the fuel surcharge on {inv} is {fuel} on a freight line of {base}. That is a lot. Is this correct?',
			'Can you explain the fuel surcharge on {inv}? Our management asked me why our transport costs went up this month, and it seems to be mostly this line.'
		],
		more: ['We get about {n0} of your invoices a month, so even a small difference adds up.', 'Our budget for next year is being prepared now, so I would also like to know what to expect.'],
		shows: 'pdf',
		ask: [
			'Thanks for your question. Do you have an agreement with us that sets the fuel surcharge, or do you ship on our general price list? That decides where the percentage comes from.',
			'Thank you. I will check it. Do you know whether your agreement with us mentions fuel? Some customers have a fixed percentage.'
		],
		guess: ['{fuelPct}% is the table rate for {month}. Probably just the monthly change; I will send them the table.', 'Fuel line looks normal for {month}. Checking their account for an agreement before answering.'],
		detour: ['b'],
		paths: [
			{
				detail: ['We ship on your price list as far as I know. I cannot find any agreement.', 'No agreement, we just use your standard rates.'],
				lookWho: 'p',
				look: [
					'No customer agreement on file for {cus}, so the published fuel table applies. {month}: {fuelPct}%, set from the diesel index of the month before. Table attached for the customer.',
					'General terms only. Fuel follows the monthly table; {fuelPct}% is right for a delivery in {month}.'
				],
				lookPaste: 'fuel',
				ends: [
					[['a', 'You ship on our general price list, so the fuel surcharge follows our monthly table. It is set from the published diesel index of the month before, and for deliveries in {month} it was {fuelPct}%. Here is this year’s table, so you can see how it moved:\n\n{@fuel}'], ['c', 'Thank you, that is clear. I will pass the table to our management.']],
					[['a', 'There is no separate agreement on your account, so the surcharge comes from our monthly fuel table, which follows the diesel index. {fuelPct}% is the rate for {month}. The table is attached, and it is updated on the first working day of each month.'], ['c', 'Thanks. Can you send me the new rate each month? It helps our budget.'], ['a', 'I have added you to the list that gets the table every month.']]
				]
			},
			{
				flags: ['fixedFuel'],
				detail: ['Yes, we signed an agreement with {amFirst} in {signMonth}. As far as I remember the fuel surcharge is fixed in it. The page is below.', 'We have an agreement with {am}. I am fairly sure it says the fuel percentage is fixed until the end of the year. The relevant clause is below.'],
				paste: 'contract',
				lookWho: 'p',
				look: [
					'Their agreement (clause 4.2) fixes fuel at {fixedPct}% until 31 December 2026. It was never loaded into the billing tariffs, so every invoice since it started used the monthly table. Loading it now; credit control will need to credit the difference on the open invoices.',
					'Customer is right: {fixedPct}% fixed in the agreement, not in billing. Tariff corrected today. List of their invoices attached.'
				],
				lookPaste: 'statement',
				ends: [
					[['a', 'You were right. Your agreement fixes the fuel surcharge at {fixedPct}%, but it was not set up in our billing, so your invoices used the monthly table. Our pricing team has corrected it for new invoices, and credit note {cn} covers the difference on the invoices since then, {fuelDiff} on {inv} alone. My apologies.'], ['c', 'Thank you for sorting it. Can you send the credit note to {email2} as well? Our bookkeeper processes them.'], ['a', 'Done, {email2} has a copy.']]
				]
			},
			{
				detail: ['I am not sure. There may be something from when we started with you. I will ask {name2}.', 'There might be. Our previous logistics manager negotiated with you, and he left in the summer.'],
				lookWho: 'p',
				look: ['Nothing on file except the general terms. If they have a signed agreement, we never got a copy. {fuelPct}% is right on the general table.', 'No agreement in our records. Table rate applied correctly.'],
				ends: [[['a', 'We have no agreement on file for your account, only our general terms, and under those {fuelPct}% is the right surcharge for {month}. If you find a signed agreement that says otherwise, please send me a copy and I will look at it.'], ['c', 'OK. {name2} thinks there was one; I am going through the files. I will send it when I find it.']]]
			}
		]
	},
	// The invoice names the wrong company of a group.
	{
		flags: ['sister'],
		subjects: ['Invoice addressed to wrong company', 'Wrong company name on invoice', 'Incorrect invoice address', '{inv} not for us', 'Please re-issue invoice'],
		open: [
			'We received invoice {inv}, but it is addressed to {sister}. That is our sister company; we are {entity}. Our accounts department cannot book an invoice in another company’s name.',
			'The invoice for shipment {shp} is made out to {sister}, not to us. The shipment was ours. Please send a corrected invoice.',
			'I think you have mixed up our two companies. {inv} has the name and VAT number of {sister}, but the goods came from our warehouse in {city}.'
		],
		shows: 'pdf',
		more: ['Our auditors are strict about this, so I cannot simply pay it.', 'The amount itself is fine.'],
		ask: [
			'Thank you. Could you tell me who booked the shipment and how: through the portal, by email or by phone? That tells me where the company was chosen.',
			'Thanks for letting me know. How was {shp} booked: through our portal, by email to the depot, or by phone?'
		],
		guess: ['Two accounts in this group: {cus} and {sisterCus}. Probably booked on the wrong one. Need to know who booked.', 'Likely a re-issue. Checking how the booking was made.'],
		detour: ['b'],
		paths: [
			{
				flags: ['phone'],
				detail: ['Our shipping clerk phoned it through to your {depot} depot, as always.', 'By phone with the depot. We never use the portal.'],
				lookWho: 'o',
				look: [
					'The booking was taken by phone from their clerk, who gave {co} as the shipper. Our desk picked the first match in the customer search, which is {sister}. Our mistake.',
					'Booked by our desk from their call; wrong customer picked from the list. The two names start the same.'
				],
				lookPaste: 'shipment',
				ends: [
					[['a', 'Thank you. The shipment was booked by our depot from your clerk’s call, and our desk picked {sister} from the customer list by mistake. I have cancelled {inv} with credit note {cn} and issued {newInv} to {entity}. Sorry for the extra work.'], ['c', 'Thanks, received. Could you make sure the depot uses the right account next time?'], ['a', 'Yes, {opsFirst} at the depot has added a note to both accounts so the desk sees the difference.']]
				]
			},
			{
				flags: ['portal'],
				detail: ['Through the portal, I believe. {name2} in our purchasing department did it.', 'The portal. Several people here have logins.'],
				lookWho: 'o',
				look: ['Portal booking made by {name2} while in the {sister} account; that login has access to both. Nothing wrong on our side, but we can re-issue.', 'Booked in the portal under {sister} by a user who can see both companies. They picked the wrong one.'],
				lookPaste: 'shipment',
				ends: [
					[['a', 'The shipment was booked in our portal by {name2}, whose login has access to both companies, and it was booked under {sister}. I have re-issued it anyway: credit note {cn} and new invoice {newInv} to {entity}. When booking, the company can be chosen at the top of the portal page.'], ['c', 'Ah, I see. I will tell {name2}. Thanks for re-issuing.']]
				]
			}
		]
	},
	// The customer's system needs a purchase order number.
	{
		subjects: ['Purchase order number missing', 'PO number on invoices', 'Invoices rejected by our system', 'Missing reference', 'Your invoices cannot be processed'],
		open: [
			'Since we moved to a new purchase-to-pay system in {prevMonth}, every invoice must carry our purchase order number, or it is rejected automatically. Your invoices, for example {inv}, have no PO number. Can you add it?',
			'Our invoice scanning rejects your invoices because there is no order reference on them. {n} of them are stuck now.',
			'Please put our PO number on your invoices. Without it our accounts payable team has to look up every shipment by hand, and they have stopped doing that.'
		],
		shows: 'apReject',
		more: ['The rejected invoices will not be paid until this is solved, I am afraid.', 'This is a group-wide rule, not something I can change on our side.'],
		ask: ['Thanks for explaining. Could you tell me where you give us the PO number when you book, so I can check it reaches us?', 'Thank you. Do you put the PO number in the booking, and if so, where?'],
		guess: ['Checking whether the reference on their bookings makes it to the invoice.', 'Shipment record should have the reference. Will see why it is not on the invoice.'],
		detour: ['o'],
		paths: [
			{
				flags: ['portal'],
				detail: ['Always in the "your reference" field of the portal. For {shp} it was {po}.', 'In the reference field when we book. {shp} had {po}.'],
				lookWho: 'w',
				look: [
					'The reference is on the booking but stops there. The invoice job the booking API sends us has the customer, the shipment and the amount, and that is all the worker passes to the billing API. To print it we need it on the job, in the worker and as a field in the billing API. Not a small change; noted for the next planning.',
					'Confirmed: the booking keeps {po}, but neither the job nor the billing API has a field for it, so the invoice cannot show it. Needs a change in booking, the worker and billing. Talking to {bilFirst} about it.'
				],
				lookPaste: 'api',
				ends: [
					[['a', 'I have checked with the team that runs our invoicing. Your PO numbers are saved with each booking, but they are not passed on to the invoice, so the PDF cannot show them. They are looking at changing that, but I do not have a date yet. Meanwhile I can send you a weekly list of invoices with the PO number of each, if that helps your team.'], ['c', 'A weekly list would help for now, thank you. But please let me know when the PO is on the invoice itself; the list is a manual step for us too.'], ['a', 'I will. The first list is attached.']],
					[['a', 'Your PO numbers reach us with every booking, but our invoices do not carry them yet: the reference stays in the booking system. Our invoicing team knows and wants to add it. Until then, here is a list of your open invoices with the PO of each:\n\n{@poList}'], ['c', 'That helps for these. We need it on the invoice in the long run, though.']]
				]
			},
			{
				detail: ['Actually, we do not raise purchase orders for transport. The new system just expects one on every invoice.', 'To be honest, our warehouse books without a PO; transport is not ordered that way here.'],
				lookWho: 'm',
				look: ['Spoke to their controller. Freight is not bought on POs at {co}; the new system has a list of suppliers exempt from PO matching, for energy and telecoms. They can add us.', 'Their system allows suppliers without POs. {co} can add Kestrel to that list; told their controller.'],
				ends: [
					[['a', 'Thanks. As you do not raise POs for transport, your account manager {am} spoke to your controller: suppliers without POs can be added to an exemption list in your new system, as you do for your utilities. Could you check that with your accounts payable team?'], ['c', 'Our AP team added Kestrel to the list this morning and the stuck invoices went through. Thanks for the idea.']]
				]
			}
		]
	},
	// The amount in the invoice notification.
	{
		flags: ['erp'],
		subjects: ['Invoice notifications rejected', '{erp} import of your invoices', 'Problem with invoice.created', 'Invoice feed', 'Notifications not importing'],
		open: [
			'Our {erp} import rejects some of the invoice.created notifications you send us, for example the one for {inv}. Most go through, so it took us a while to notice. Can you check what you send?',
			'Since we connected your invoice notifications to {erp}, some invoices do not come through. Is something wrong with the messages?',
			'Our IT partner says some of your invoice notifications cannot be read by {erp}. The invoice {inv} is one of them. Can someone look?'
		],
		more: ['We import about {n0} of your invoices a month this way.', 'The PDF of the same invoice arrives fine.'],
		ask: ['Thank you. Could you send me the message {erp} shows for {inv}, and the notification as you received it, so I can pass it on?', 'Thanks for the detail. Could you send me the exact message {erp} shows when it rejects one?'],
		guess: ['Not sure whose side this is. Passing to the invoicing team with their example.', 'Invoice amount in billing looks right. Could be how their side reads the notification. Asking the invoicing team.'],
		detour: ['b'],
		paths: [
			{
				flags: ['zeroCent'],
				detail: ['Here is the import message, and the notification below it:', 'This is what the import log says, with the message underneath:'],
				paste: 'erp',
				lookWho: 'w',
				look: [
					'Ours. The notification gets the amount from the worker, which turns cents into text by dividing by 100 and printing the number as it comes, so {amtCents} cents goes out as "{amtBug}" and whole amounts as "1200.0". The PDF is made by the billing API and is fine. Fixing it with the other changes to the notification that customers asked for.',
					'The worker formats the amount itself and drops the trailing zero: {amtCents} cents becomes "{amtBug}". Every amount whose cents end in 0 is affected. On our list.'
				],
				lookPaste: 'log',
				ends: [
					[['a', 'Thanks. Our invoicing team confirms the problem is on our side: the amount in the notification loses its trailing zero, so {total} is sent as "{amtBug}". The invoice itself is right. A correction is planned, but I do not have a date yet. Until then, the PDF is the reference for those invoices.'], ['c', 'OK. We will enter the rejected ones by hand for now. Please let us know when it is corrected.']],
					[['a', 'Our invoicing team has found it: the notification drops the last zero of the amount, which is our doing, not your import. They will correct it, and I will tell you when that is live.'], ['c', 'Thanks for the quick answer.'], ['n', 'Customer asked to be told when the amount format is corrected. Ask {devFirst} for the release.']]
				]
			},
			{
				flags: ['oddCent'],
				detail: ['Here is what {erp} says, and the notification:', 'The import log is below, with the notification.'],
				paste: 'erpLocale',
				lookWho: 'w',
				look: [
					'Our amount for {inv} is "{amtOk}", with a point as decimal separator, as in all our notifications. Their import reads it with a German number format and takes the point as a thousands separator. Nothing for us to change; their partner needs to set the format of the import.',
					'Notification is fine: "{amtOk}". Their import expects a comma before the cents.'
				],
				lookPaste: 'webhook',
				ends: [
					[['a', 'Our team checked the notification for {inv}: the amount is "{amtOk}", with a point before the cents, as in all our notifications. Your import seems to expect a comma. Your IT partner should be able to set the number format of the import to read a point.'], ['c', 'Our partner changed the setting and the rejected ones went through. Thank you.']]
				]
			}
		]
	},
	// The due date in the invoice notification.
	{
		flags: ['erp'],
		since: DUE_DATE_LIVE,
		subjects: ['Due date in invoice notifications', 'invoice.created: due date missing', 'Request: payment due date', 'Due date field', 'Notifications without due date'],
		open: [
			'Our {erp} creates a payable from each invoice.created notification you send. It needs a due date, and the notification does not have one, so our team types it in from the PDF. Your billing team told {name2} that the due date is now available. Can it be added?',
			'We are automating your invoices in {erp}. The notification has the amount and the invoice number, but no due date. Could you add it? Right now we work it out ourselves.',
			'Quick question about the invoice.created messages: is there a way to get the payment due date in them? We see it on the PDF.'
		],
		ask: ['Good question. Do you need the due date as a date, or would the payment terms in days do?', 'Thanks. I will find out. Would the due date alone be enough, or do you also need the invoice date?'],
		guess: ['Billing has had the due date since 2 November. Asking the invoicing team whether the notification can carry it.', 'Should be easy now that billing has the due date. Checking with the invoicing team.'],
		detour: ['b'],
		paths: [
			{
				detail: ['A date, please, in the same format as your other dates: YYYY-MM-DD.', 'The due date is what we need. Terms in days we could compute, but they differ between our companies.'],
				lookWho: 'w',
				look: [
					'The billing API sends due_date with every invoice since 2 November, but the worker does not read it yet, and the notification is built from what the worker keeps. Adding it to the invoice the worker reads is the first step, then the notification. On our list, with the shipment number customers asked for.',
					'Billing returns due_date now. The worker only keeps the fields it knows, so the date never reaches the notification. Planned.'
				],
				lookPaste: 'api',
				ends: [
					[['a', 'Our billing system has had the due date since the start of November, but it is not yet passed on to the notifications. The team that runs them has it planned, together with a few other fields customers asked for. I do not have a date yet; I will let you know.'], ['c', 'Thanks. Please do; we will keep typing them in until then.']],
					[['a', 'I asked our invoicing team. The due date exists in our billing since 2 November, but the notification does not include it yet. Adding it is planned. I have noted that you want it as YYYY-MM-DD.'], ['c', 'Great, thank you.'], ['n', 'Add {co} to the list of customers to tell when the notification carries the due date.']]
				]
			},
			{
				detail: ['Mostly because we are not sure how you count. Is it {terms} days from delivery or from the invoice date? Our system uses the delivery date.', 'Really we want to know which date your terms start from. We assumed delivery.'],
				lookWho: 'b',
				look: ['Terms run from the invoice date. Invoices are issued on the day of delivery, so the two are the same date; only invoices re-issued later differ.', 'Due date is invoice date plus terms. As the invoice is raised the day the shipment is delivered, delivery date works for them too, except for re-issues.'],
				lookPaste: 'api',
				ends: [
					[['a', 'Our terms run from the invoice date, and as each invoice is issued on the day of delivery, the two are the same day, so your calculation gives the right date. The only exception is an invoice we re-issue later, which gets a new date. With that, do you still need the due date in the notification?'], ['c', 'No, that is fine then. Thanks for checking.']]
				]
			}
		]
	},
	// The shipment in the invoice notification.
	{
		flags: ['erp'],
		subjects: ['Shipment number in notifications', 'Cannot match invoice.created to shipments', 'Notification: shipment reference', 'Matching invoices to deliveries', 'What is the job field?'],
		open: [
			'We receive your invoice.created notifications in {erp}, but we cannot match them to our deliveries. The message has a job number and an invoice number, but we know shipments only by the number on the delivery note. Could you add it?',
			'For our freight audit we match each invoice to a delivery. Your notifications do not say which shipment an invoice is for, and the job number means nothing to us.',
			'Is the "job" field in your invoice notification the shipment? It does not match any of the numbers on our delivery notes.'
		],
		shows: 'webhook',
		ask: ['Thank you. Which number do you have on your side: our shipment number, like {shp}, or your own order number?', 'Thanks for asking. Is it our shipment number you would match on, or your own order reference?'],
		guess: ['Job number is internal, not on any paper. Notification has no shipment. Asking the invoicing team.', 'They need shp_ numbers. Checking with the invoicing team whether the notification can include it.'],
		detour: ['b'],
		paths: [
			{
				detail: ['Your shipment number, like {shp}. It is on every delivery note and on the booking confirmation.', 'Your shipment numbers. Our receiving team scans them from the labels.'],
				lookWho: 'w',
				look: ['The worker has the shipment on the job, but the notification leaves it out: it carries the type, job, invoice, customer, amount and currency. Easy to add as "shipment". Several customers asked; on our list.', 'Shipment is known when the notification is built, just not in it. We will add it.'],
				ends: [
					[['a', 'Our invoicing team confirms the notification does not include the shipment number today, although we know it. They plan to add it. Until it is there, the PDF of each invoice shows the shipment number, and I can send you a weekly list of invoice and shipment numbers.'], ['c', 'Please send the list, and let me know when the field is added.'], ['a', 'Will do. This week’s list is attached.']]
				]
			},
			{
				detail: ['Our own order number would be best. We give it when we book, in the reference field.', 'Our order number. We put it in the reference field of every booking.'],
				lookWho: 'w',
				look: ['They want their own booking reference ({po}), which never leaves the booking system. Same request as the PO numbers on invoices: needs the reference on the job first. The shipment number alone would not help them.', 'Customer reference is not on the job, so neither the invoice nor the notification can carry it. Same change as the PO requests.'],
				ends: [[['a', 'I checked: your order reference stays with the booking and is not passed to invoicing, so neither the invoice nor the notification can show it yet. Our team is looking at carrying it through, as other customers asked for the same on their invoices. I will let you know when there is a date.'], ['c', 'OK, thank you. We will match by hand until then.']]]
			}
		]
	},
	// The signature of the invoice notification.
	{
		flags: ['erp'],
		subjects: ['Signature check does not pass', 'X-Signature does not match', 'Notification signature', 'Cannot verify your notifications', 'HMAC question'],
		open: [
			'We are setting up your invoice.created notifications in {erp}. Our developer cannot get the signature to match: the X-Signature header never equals what we compute with the secret {amFirst} gave us. Are we doing something wrong?',
			'Every notification you send is dropped by our middleware because the signature check does not pass. We use HMAC-SHA256 with the shared secret, as your documentation says.',
			'Our IT partner is connecting your invoice notifications and asks how the signature is calculated. Our check rejects every message.'
		],
		ask: ['Thank you. Could you send me one notification as you received it, headers included, and tell me what your check computes?', 'Thanks. Can you send a notification as it arrived, with its headers, so our team can look?'],
		guess: ['Probably the usual: signing the parsed JSON instead of the body as received. Asking the invoicing team to look at their example.', 'Signature is HMAC-SHA256 over the body. Need their example to say more.'],
		guessPaste: 'none',
		paths: [
			{
				detail: ['Here is one. Our developer parses the JSON, then computes the HMAC of it.', 'Below is the request as our gateway logged it.'],
				paste: 'webhook',
				lookWho: 'w',
				look: ['Their example verifies with our secret over the exact bytes received. They parse the body and encode it again before signing; spacing and key order change, so the hash does too. They need to sign the body as received.', 'Checked: our signature matches the body as sent. Their code re-encodes the JSON first.'],
				ends: [[['a', 'Our team checked your example: the signature is computed over the body exactly as it arrives, byte for byte. Your check seems to parse the JSON and encode it again before computing the HMAC, which changes the spacing and so the result. If your developer computes it over the body as received, it should match.'], ['c', 'That was it. Our developer changed it and the notifications are coming in. Thanks!']]]
			},
			{
				detail: ['Our developer found that our API gateway uses a header called X-Signature for its own checks and replaces yours. Could you use another name?', 'It turns out our gateway overwrites any X-Signature header with its own. Can you send it under a name with your company in it?'],
				lookWho: 'w',
				look: ['Generic header name clashes with their gateway. We have had this request before; the plan is to send it as X-Kestrel-Signature. Not done yet.', 'X-Signature is too generic, their gateway owns it. Renaming the header is planned.'],
				ends: [[['a', 'Our team confirms that the header name is the problem: your gateway uses X-Signature itself. They plan to send our signature under a name of its own, and you are not the first to ask. I will let you know when that is live.'], ['c', 'Thanks. We will leave the integration switched off until then.']]]
			},
			{
				detail: ['Example below. We use the secret exactly as {amFirst} emailed it.', 'Here is one. The secret is the one from {amFirst}’s email.'],
				paste: 'webhook',
				lookWho: 'w',
				look: ['Their example verifies with our secret. When I add a line break at the end of the secret, I get exactly the hash they compute. Copied from the email with the newline.', 'Signature is right. Their value matches our secret plus a trailing newline: copy and paste.'],
				ends: [[['a', 'Our team found it: the value your system computes matches our secret with a line break at the end, which probably came along when it was copied from the email. Without the line break the signature should match.'], ['c', 'Unbelievable, that was it. It works now. Thank you.']]]
			}
		]
	},
	// Pallets not exchanged.
	{
		flags: ['pallets'],
		subjects: ['Pallet exchange charge', 'Pallets charged on {inv}', 'Euro pallets', 'Pallet charge query', 'Wrong pallet charge'],
		open: [
			'Invoice {inv} has a charge of {palAmt} for {palMissingN} not exchanged. Our pallets are always exchanged at delivery; the driver takes the empty ones back. Please remove the charge.',
			'Why are we charged for pallets on {inv}? We exchange pallets with you as agreed.',
			'There is a pallet line on {inv} for {palMissingN}. As far as I know nothing went missing. Can you check?'
		],
		shows: 'pdf',
		ask: ['Thank you. I will check the delivery record. Do you know whether the consignee, {cons}, exchanged the pallets, or were they returned to us separately?', 'Thanks. Were the empty pallets handed over at the delivery address, or brought back to our depot later?'],
		guess: ['Pallet line from the delivery note: driver recorded {palMissing} not exchanged. Checking the ledger.', 'Charge comes from the delivery record. Will look at the pallet account before answering.'],
		detour: ['b'],
		paths: [
			{
				detail: ['At the delivery address, I think. {cons} usually has empties ready.', 'At {cons}, as always.'],
				lookWho: 'o',
				look: ['Delivery note for {shp}: {pallets} delivered, {palExchanged} exchanged, {palMissing} not, signed by the consignee’s staff. Driver wrote "no empties available". Charge is right.', 'Driver received only {palExchangedN} at {cons}, and their receiver signed for it.'],
				lookPaste: 'pod',
				ends: [[['a', 'I checked the delivery record for {shp}: the driver received {palExchangedN} at {cons}, not {pallets}, and their receiver signed the note. That is where the charge for {palMissingN} comes from. The proof of delivery is attached. If {cons} brings the pallets to our depot within 30 days, I will credit the charge.'], ['c', 'I spoke to {cons}; they did not have enough empties that day. We accept the charge.']]]
			},
			{
				detail: ['Our own driver brought them back to your {depot} depot the week after, with others.', 'We took a stack of empties back to the {depot} depot ourselves on {wday}.'],
				lookWho: 'o',
				look: ['They are right: the depot took {palReturned} pallets back from them on {wday}, but they were entered on another customer’s pallet account. Moved them over; their balance is even now.', 'Found the return: entered on the wrong pallet account at {depot}. Ledger corrected.'],
				lookPaste: 'pallets',
				ends: [[['a', 'You were right: the pallets you brought back to our {depot} depot were recorded on another account. That is corrected, and credit note {cn} for {palAmt} cancels the charge on {inv}.'], ['c', 'Thank you, that is what I expected.']]]
			},
			{
				detail: ['To be honest I do not know. {cons} is our customer and we would rather not bother them about pallets.', 'I do not know. We would prefer you to sort it out with {cons} directly.'],
				lookWho: 'o',
				look: ['Delivery note shows {palMissing} not exchanged at {cons}. Customer does not want to chase their own client. This is a commercial question for {am}.', 'Not exchanged at {cons}, signed. The customer will not take it up with them; for the account manager.'],
				lookPaste: 'pod',
				ends: [[['a', 'The delivery record shows {palMissingN} were not exchanged at {cons}, which is why they were charged. As you would rather not take this up with {cons} yourselves, I have passed it to your account manager, {am}, to agree how pallets for that address are handled.'], ['M', 'Hello {name}, {amFirst} here. I have your pallet question from credit control. Let me look at the deliveries to {cons} of the last few months and I will call you next week.']]]
			}
		]
	},
	// A tail-lift charge.
	{
		flags: ['tail'],
		subjects: ['Tail-lift charge', 'Tail-lift on {inv}', 'We did not order a tail-lift', 'Extra charge on {inv}', 'Query: delivery surcharge'],
		open: [
			'Invoice {inv} has a tail-lift charge of {tail}. {cons} has a loading dock, so no tail-lift was needed. Please credit it.',
			'We are charged {tail} for a tail-lift on shipment {shp}. We never ask for a tail-lift for that address.',
			'Can you explain the tail-lift line on {inv}? I do not think we booked one.'
		],
		shows: 'pdf',
		ask: ['Thanks. I will check the booking and the delivery. How was the shipment booked: in the portal or with our depot?', 'Thank you. Do you know who booked it, and how?'],
		guess: ['Tail-lift is on the invoice. Need to know who put it on the booking.', 'Checking the booking and whether the tail-lift was used.'],
		detour: ['p'],
		paths: [
			{
				flags: ['portal'],
				detail: ['In the portal, by our warehouse.', 'Our warehouse did it in the portal.'],
				lookWho: 'o',
				look: ['Portal booking, tail-lift ticked by the customer’s user. We send a tail-lift truck when it is booked; it was not needed at the dock. Charge stands under the price list: the service is charged as booked.', 'Booked with tail-lift in the portal. We sent a tail-lift vehicle accordingly.'],
				lookPaste: 'shipment',
				ends: [[['a', 'The shipment was booked in our portal with the tail-lift option ticked, so we sent a vehicle with a tail-lift. Under our price list the option is charged when it is booked, even if the dock made it unnecessary on the day. Your warehouse can leave the option off for {cons} in future.'], ['c', 'I asked our warehouse; they tick it for every address by habit. They will stop. We will pay this one.']]]
			},
			{
				flags: ['phone'],
				detail: ['By phone with your depot, I think.', 'Our clerk phoned it through to the {depot} depot.'],
				lookWho: 'o',
				look: ['Phone booking; the desk added a tail-lift because the previous booking for this customer had one. The customer did not ask for it, and the delivery note shows a dock delivery. Our mistake.', 'Desk copied the services from an older booking. No tail-lift asked for, none used.'],
				lookPaste: 'pod',
				ends: [[['a', 'You were right: the tail-lift was added by our depot when the booking was taken, and it was not used. Credit note {cn} for {tail} is attached.'], ['c', 'Thank you.']]]
			},
			{
				flags: ['tailUsed', 'portal'],
				detail: ['Through the portal. The warehouse says they did not tick it.', 'Our warehouse booked it and says no tail-lift.'],
				lookWho: 'o',
				look: ['Not on the booking, but the driver used his tail-lift: the dock at {cons} was closed for works and the receiver asked for unloading at the kerb. It is on the delivery note and signed. Charge is right.', 'Driver added it at delivery: no dock in use, receiver signed for unloading by tail-lift.'],
				lookPaste: 'pod',
				ends: [[['a', 'Your warehouse is right that the tail-lift was not booked. The driver used it on the day: the dock at {cons} was closed for building work, and their receiver asked for the goods to be unloaded at the kerb, which is noted and signed on the delivery note attached. That is why it was charged.'], ['c', 'I checked with {cons} and that is right. Fine, we accept it.']]]
			}
		]
	},
	// Standing time at the delivery address.
	{
		flags: ['standing'],
		subjects: ['Standing time charge', 'Standing time on {inv}', 'Hours charged at delivery', 'Disputed surcharge {inv}', 'Unloading charge'],
		open: [
			'Invoice {inv} includes {standingHours} hours of standing time at {cons}, {standing}. Unloading {palletsN} does not take {standingHours} hours. Please explain.',
			'We do not agree with the standing time on {inv}. Our customer {cons} says your driver came much earlier than agreed.',
			'There is a standing time line on {inv}. What is this, and why are we paying for it?'
		],
		shows: 'pdf',
		ask: ['Thanks. I will get the driver’s times from the delivery record. Was a delivery slot agreed with {cons}?', 'Thank you. Do you know if there was a fixed delivery time at {cons}?'],
		guess: ['Standing time from the times on the delivery note. Checking if the driver was in his slot.', 'Charge calculated from arrival and unloading on the delivery note. Need the slot.'],
		detour: ['p'],
		paths: [
			{
				detail: ['{slot}, as always.', 'The slot was {slot}.'],
				lookWho: 'o',
				look: ['Driver arrived {arrive}, inside the slot. Unloading started {unload}, left {leave}. First hour free, the rest charged. Correct.', 'In the slot, then kept standing for {standingHours} hours before unloading. Charge correct.'],
				lookPaste: 'pod',
				ends: [[['a', 'Our driver arrived at {cons} at {arrive}, inside your slot, and was not unloaded until {unload}; he left at {leave}. The first hour is free, and the rest is charged as standing time. The delivery note with the times, signed by their receiver, is attached.'], ['c', 'I see. I will raise it with {cons}; they were short of staff that week. We will pay.']]]
			},
			{
				flags: ['early'],
				detail: ['{slot}. {cons} says your driver was there at {arrive}.', 'The slot was {slot}. The driver came hours early.'],
				lookWho: 'o',
				look: ['Slot {slot} on the booking, driver arrived {arrive} and the clock started on arrival. Should only count from the start of the slot. Our mistake; credit it.', 'Driver arrived three hours before the slot. Standing time should not have been charged.'],
				lookPaste: 'pod',
				ends: [[['a', 'You are right. Our driver arrived three hours before the slot, and standing time should have been counted from the start of the slot, not from his arrival. Credit note {cn} for {standing} is attached.'], ['c', 'Thank you for checking so quickly.']]]
			},
			{
				flags: ['noslot'],
				detail: ['There was no slot. {cons} says they unload when they can.', 'No fixed slot, I believe.'],
				lookWho: 'o',
				look: ['No slot on the booking. Arrived {arrive}, unloaded from {unload}. Charge is as the price list says, but this address is a regular problem; better for {am} to agree something with them.', 'No slot; long standing time, as usual at this address. Commercial question.'],
				lookPaste: 'pod',
				ends: [[['a', 'There was no slot on the booking, and our driver stood for {standingHours} hours before he was unloaded, so the charge follows our price list. As this happens regularly at {cons}, I have asked your account manager, {am}, to discuss it with you.'], ['c', 'Fine, but we will not pay the standing time until we have spoken to {amFirst}.'], ['n', 'On hold for {am}. Reminders off for {inv}.']]]
			}
		]
	},
	// A reminder for an invoice the customer says it paid.
	{
		flags: ['old'],
		subjects: ['Reminder for paid invoice', 'Payment reminder {inv}', 'We already paid', 'Second reminder received', 'Reminder sent by mistake?'],
		open: [
			'We received a payment reminder for {inv}, but we paid it on {payDate}. Please check your records.',
			'Your reminder lists {inv} as overdue. We paid {total} on {payDate}.',
			'Why did we get a reminder? Everything up to the end of {prevMonth} is paid as far as we know.'
		],
		shows: 'reminder',
		ask: ['Thank you. Could you send me the payment details: date, amount and the reference you used?', 'Sorry about that. Can you send the remittance advice or the details of the payment?'],
		guess: ['{inv} open in the ledger. Checking unallocated payments.', 'No payment against {inv}. Asking {arFirst} to look at the bank.'],
		guessPaste: 'statement',
		paths: [
			{
				flags: ['misallocated'],
				detail: ['Remittance below.', 'Here is our payment advice.'],
				paste: 'remittance',
				lookWho: 'f',
				look: ['Found it: the payment of {total} on {payDate} was allocated to {inv2} instead of {inv}; similar amount, and the bank cut off the reference. Reallocated.', 'Payment arrived and was put on the wrong invoice. Moved to {inv}.'],
				lookPaste: 'bank',
				ends: [[['a', 'You are right, and sorry for the reminder. Your payment arrived on time, but we allocated it to another invoice. That is corrected, and {inv} is now shown as paid. Please ignore the reminder.'], ['c', 'Thank you.']]]
			},
			{
				flags: ['paidOther'],
				detail: ['We paid on {payDate}, reference {payRef}.', 'Reference was {payRef}, paid on {payDate}.'],
				lookWho: 'f',
				look: ['Payment {payRef} on {payDate} names {inv2}, which was already paid. So {inv2} is paid twice and {inv} is open. Customer can let us use it for {inv} or ask for a refund.', 'Their payment reference names {inv2}, now paid twice. {inv} is really open.'],
				lookPaste: 'bank',
				ends: [[['a', 'I found the payment: it names {inv2}, which you had already paid in {prevMonth}, so {inv2} is now paid twice and {inv} is still open. We can use the extra payment for {inv}, if you confirm that in writing, or refund it.'], ['c', 'Please use it for {inv}. I will confirm in writing once our controller agrees.'], ['s', 'Automatic reminder sent to the customer after seven days without a reply.']]]
			},
			{
				flags: ['crossed'],
				detail: ['We paid on {payDate}.', 'The payment went out on {payDate}.'],
				lookWho: 'f',
				look: ['Payment received {payDate}, allocated to {inv}. The reminder run was the day before. Nothing wrong.', 'Paid one day after the reminder run. They crossed.'],
				lookPaste: 'bank',
				ends: [[['a', 'Thank you. Your payment arrived on {payDate} and is allocated to {inv}. Our reminders went out the day before, so they crossed. Nothing is overdue on your account now.'], ['c', 'Good, thanks.']]]
			}
		]
	},
	// The company's name changed.
	{
		flags: ['rename'],
		subjects: ['New company name', 'Invoice in our old company name', 'Company name changed', 'Please update our details', 'Old name on invoices'],
		open: [
			'Since {renameMonth} our company is called {entity}, formerly {oldName}. Your invoices still use the old name, and our auditors will not accept them.',
			'Our name changed after the merger, but invoice {inv} is still addressed to {oldName}. Please correct it and re-issue the invoices since then.',
			'Can you update our company name? We are {entity} now.'
		],
		shows: 'pdf',
		ask: ['Thank you. Did you send us the change at the time? I cannot see it on the account yet. A registry extract would help.', 'Congratulations on the new name. Could you send me the registry extract that shows the change?'],
		guess: ['Account still on the old name. Need to see whether we were told.', 'Billing record says {oldName}. Checking if there was a notice.'],
		paths: [
			{
				detail: ['We wrote to you in {renameMonth}. I attach the letter again, with the extract.', 'Our finance director sent the notice in {renameMonth}. Here it is with the registry extract.'],
				paste: 'registry',
				lookWho: 'b',
				look: ['The notice came in and is in the customer file, but the name in the billing API was never changed, so every invoice since went out under {oldName}. Updated today; new invoices are right. The ones since {renameMonth} need re-issuing.', 'The name change reached us but was not entered in billing. Customer record corrected.'],
				ends: [[['a', 'You did tell us, and I apologise: the change reached us but was not entered in our billing system. It is corrected now, and every new invoice will show {entity}. I have re-issued the invoices since {renameMonth} under the new name; credit note {cn} cancels the old ones.'], ['c', 'Thank you, the auditors are happy.']]]
			},
			{
				detail: ['I am not sure anyone told you. The extract is below.', 'We may have forgotten to tell you. Here is the extract.'],
				paste: 'registry',
				lookWho: 'b',
				look: ['No notice on file before today. Updated the customer record from the extract; invoices from now on use {entity}. The older invoices were right when they were issued.', 'First we hear of it. Record updated today.'],
				ends: [[['a', 'Thank you for the extract. We had not been told about the change until now, so the invoices issued before today were right under the details we had. Our billing record is updated, and all new invoices will show {entity}. If your auditors need the older invoices re-issued anyway, let me know which ones.'], ['c', 'The new ones are enough. Thanks.']]]
			}
		]
	},
	// An invoice for a shipment the customer does not recognise.
	{
		subjects: ['Invoice for a shipment we did not send', 'Unknown shipment {shp}', 'Invoice {inv} not ours', 'Not our delivery', 'Please cancel {inv}'],
		open: [
			'We received invoice {inv} for shipment {shp}, but we have no record of it. Nothing was collected from us that day.',
			'Invoice {inv} is for a delivery to {cons}, but our order for {cons} was cancelled. Why are we invoiced?',
			'I cannot find shipment {shp} anywhere in our system. Please check {inv}.'
		],
		shows: 'pdf',
		ask: ['Thank you. I will check where the shipment went. Do you have a delivery or order number on your side that might match?', 'Thanks. Let me look at the delivery record. Can you tell me which deliveries you did have with us that week?'],
		guess: ['There is a delivery note for {shp}. Checking who signed.', 'Shipment delivered as far as our records go. Need the delivery note.'],
		detour: ['w'],
		paths: [
			{
				flags: ['wrongScan'],
				detail: ['We had {n} deliveries that week, all to other addresses.', 'Only {n} shipments that week, none to {cons}.'],
				lookWho: 'o',
				look: ['The driver scanned the label of another customer’s pallet and closed {shp} on it. The real {shp} was cancelled before collection. The goods delivered belong to another customer; the invoice should go to them.', 'Wrong label at delivery: {shp} was closed for goods that were not theirs. Cancel and bill the right customer.'],
				lookPaste: 'pod',
				ends: [[['a', 'You were right. Our driver scanned the wrong label at a delivery, so your cancelled shipment {shp} was closed as delivered and invoiced. Credit note {cn} cancels {inv} in full. Sorry for the confusion.'], ['c', 'Thanks for sorting it so quickly.']]]
			},
			{
				flags: ['secondSite'],
				detail: ['We do not know this shipment. Could it have gone from our {city2} site?', 'Not in our books. We have a second warehouse, but they would have told me.'],
				lookWho: 'o',
				look: ['Collected from their warehouse in {city2}, booked by a user there, delivered to {cons} and signed for. Invoice is right.', 'Booked by their second site. Delivered without any problem.'],
				lookPaste: 'shipment',
				ends: [[['a', 'I checked: {shp} was booked by your warehouse in {city2}, collected there and delivered to {cons}, who signed for it. The proof of delivery is attached. So the invoice is for a real delivery, just from your other site.'], ['c', 'You are right, {city2} booked it themselves. Sorry, I will ask them to tell us next time.']]]
			}
		]
	},
	// Damage, and the customer holds back payment.
	{
		flags: ['damage'],
		subjects: ['Damaged delivery', 'Payment on hold: damage', 'Goods damaged in transit', 'Claim and invoice {inv}', 'We will not pay {inv}'],
		open: [
			'Shipment {shp} arrived at {cons} with {damagedN} damaged. We will not pay invoice {inv} until this is settled.',
			'Part of the delivery on {inv} was broken on arrival. Please deduct the damage from the invoice.',
			'{cons} refused part of the delivery for {shp} because of damage. We are holding back payment of {inv}.'
		],
		shows: 'pdf',
		ask: ['I am sorry to hear that. Damage is handled by our claims team, separately from the invoice. Was the damage noted on the delivery note when it arrived?', 'Sorry about the damage. Was it written on the delivery note at the time, and do you have photos?'],
		guess: ['A claim, not an invoice mistake. What does the delivery note say?', 'Check the delivery note for a damage remark, then claims.'],
		paths: [
			{
				detail: ['Yes, the receiver wrote it on the note. The photos are with {cons}; I will ask for them.', 'It is on the delivery note, I think. I will get photos.'],
				lookWho: 'k',
				look: ['Delivery note records damage to {damagedN}, signed. The claim can go ahead once we have the claim form, photos and the invoice of the goods. The freight invoice stands.', 'Damage noted on the delivery note. Need the claim form and the value of the goods.'],
				lookPaste: 'pod',
				ends: [[['K', 'Hello {name}, I am {claimsFirst} from Kestrel claims. The damage is noted on the delivery note, which is good. To open the claim I need the claim form (attached), photos and your invoice for the damaged goods. The claim is settled separately; the freight invoice {inv} itself is correct and not part of it.'], ['c', 'Understood. I will send the form and the photos once {cons} gives them to me.']]]
			},
			{
				detail: ['Yes, it is on the delivery note, and photos are attached.', 'It is on the note. Photos attached.'],
				lookWho: 'k',
				look: ['Documents complete. Claim accepted for {damagedN}, settlement by bank transfer. The freight invoice is separate and due.', 'Claim accepted. Freight stays payable.'],
				lookPaste: 'pod',
				ends: [[['K', 'Hello {name}, {claimsFirst} from claims here. Thank you for the documents. We accept the claim for the {damaged} damaged pallets and will pay it separately by bank transfer. The freight invoice {inv} is not affected and stays payable.'], ['c', 'Thank you. We will release {inv} for payment.']]]
			}
		]
	},
	// One invoice a month instead of one per shipment.
	{
		subjects: ['Monthly invoice instead of one per shipment', 'Too many invoices', 'Request: collective invoice', 'One invoice per month?', 'Invoice consolidation'],
		open: [
			'We receive one invoice for every shipment, about {n0} a month. Processing them costs our team a lot of time. Can you send one invoice per month instead?',
			'Our accounts payable team asks whether you can combine your invoices into a weekly or monthly collective invoice. Other carriers do.',
			'Is it possible to get a single monthly invoice listing all shipments? {n0} invoices a month is too many for us.'
		],
		ask: ['Thank you for asking. Would a monthly statement with all invoices listed help, or does it have to be a single invoice?', 'I understand. Does it need to be one invoice, or would a monthly overview with all invoices and one payment work for you?'],
		guess: ['Billing does one invoice per shipment. Asking the billing team about collective invoices.', 'Not possible today, I think. Checking with billing.'],
		guessPaste: 'statement',
		paths: [
			{
				detail: ['It has to be one invoice. Our system books each invoice separately; that is the work.', 'One invoice. A statement does not help, the work is in booking each invoice.'],
				lookWho: 'b',
				look: ['Collective invoices are not supported: the worker creates one invoice per delivered shipment as each job arrives. Monthly invoicing would be a new flow in billing and in the worker. On the wish list for next year, no date.', 'One invoice per shipment by design. Several customers have asked for collective invoicing; not planned yet.'],
				ends: [[['a', 'I checked with our billing team: today each delivered shipment gets its own invoice, and there is no way to combine them. Several customers have asked for monthly invoices, and the team has it on their list, but there is no date yet. I have added your request.'], ['c', 'Pity. Please keep me informed.']]]
			},
			{
				detail: ['A statement with one payment would help, yes, if our bank can pay it in one go.', 'If we can pay everything at once from a monthly overview, that would already help a lot.'],
				lookWho: 'f',
				look: ['They can pay the whole statement in one transfer; we allocate it from the invoice list. Fine for us.', 'One payment against the monthly statement is fine; send statements on the first working day.'],
				ends: [[['a', 'We can send you a statement on the first working day of each month listing all open invoices, and you can pay it with one transfer quoting the statement date; we allocate it to the invoices. The {prevMonth} statement is below as an example.\n\n{@statement}'], ['c', 'That works for us. Thank you!']]]
			}
		]
	},
	// The invoices go to the wrong mailbox.
	{
		subjects: ['Invoices sent to the wrong person', 'Please change invoice email address', 'Missing invoices', 'We do not receive your invoices', 'Invoice email'],
		open: [
			'We just found out that your invoices still go to {oldContact}, who left us in the summer. That is why some were paid late. Please send them to {apEmail}.',
			'We have not received any invoices from you for weeks, but we know shipments were delivered. Have you stopped sending them?',
			'Who do you send our invoices to? Our accounts payable mailbox has nothing from you since {prevMonth}.'
		],
		ask: ['Thank you. Which address should invoices go to, and is it one address or several?', 'Sorry about that. I will check the email address on your account. Which address do you want us to use?'],
		guess: ['Checking the invoice address on the account and the mail log.', 'Invoice address on the account is {oldContactEmail}. Checking delivery.'],
		detour: ['w'],
		guessPaste: 'none',
		paths: [
			{
				detail: ['{apEmail}, please. One address is enough.', 'Send them to {apEmail}.'],
				lookWho: 'n',
				look: ['Account had {oldContactEmail}. The mail log shows the invoices delivered there without any problem, so their mail server still accepts it. Changed to {apEmail}.', 'Invoices delivered to {oldContactEmail} all along. Updated to {apEmail}.'],
				lookPaste: 'mail',
				ends: [[['a', 'Your invoices were going to {oldContactEmail}, which was the address on your account, and they were delivered there. I have changed it to {apEmail}, and I have sent copies of all invoices since {prevMonth} there as well.'], ['c', 'Received, thank you. We will tell you sooner next time.']]]
			},
			{
				detail: ['It should be {apEmail}, always has been.', '{apEmail}.'],
				lookWho: 'n',
				look: ['Account has {oldContactEmail}, and since {bounceDate} their mail server rejects it as unknown. Changed to {apEmail} and sent copies.', 'Mail to {oldContactEmail} rejected since {bounceDate}: user unknown.'],
				lookPaste: 'mailBounce',
				ends: [[['a', 'We were sending your invoices to {oldContactEmail}, and since {bounceDate} your mail server has been rejecting that address. I have changed it to {apEmail} and sent copies of every invoice since then.'], ['c', 'Yes, that mailbox was closed when {oldContact} left. Thanks.']]]
			},
			{
				detail: ['{apEmail}, and also my own address, please. Both of us need them.', 'Both {apEmail} and {email}, please.'],
				lookWho: 'b',
				look: ['The billing API keeps one invoice address per customer. Two addresses would need a change on our side; a few customers have asked. Set {apEmail} for now.', 'One address per customer only. Request noted.'],
				ends: [[['a', 'I have set {apEmail} as your invoice address. Our system can only send each invoice to one address at the moment; sending to two is something our billing team is looking at. Until then, a forwarding rule from {apEmail} would do it.'], ['c', 'OK, we will set up forwarding. Please tell me when two addresses are possible.']]]
			}
		]
	},
	// A fake request to pay into a new bank account.
	{
		subjects: ['Change of bank details?', 'Is this email from you?', 'New bank account for payments', 'Suspicious email', 'Urgent: bank details'],
		open: [
			'We received an email from "Kestrel Freight Accounts" saying your bank account has changed and asking us to pay our open invoices to a new account. Is this real? It is below.',
			'Someone sent us an email in your name with new bank details. Before we change anything: did you change your bank?',
			'Can you confirm your bank details? We received a request to pay {inv} to a different IBAN.'
		],
		shows: 'phish',
		ask: ['Thank you for checking with us first. Our bank details have not changed. Did you pay anything to the new account?', 'Please do not pay to that account: our bank details have not changed. Have any payments gone there?'],
		guess: ['Fake. The sender domain is not ours. Informing IT security.', 'Not from us. Checking whether they paid.'],
		guessPaste: 'none',
		paths: [
			{
				detail: ['No, nothing. We thought it was strange.', 'No, we stopped the change.'],
				lookWho: 'f',
				look: ['Not from us; the sender domain was registered last week. IT security has it. No payment made by the customer.', 'Fake request; the customer did not pay. Logged with IT security.'],
				ends: [[['a', 'Good. That email did not come from us; the sender’s address only looks like ours. Our bank details are as on every invoice, and we will never change them by email alone. Our IT security team has the details.'], ['c', 'Thanks for confirming.']]]
			},
			{
				detail: ['I am afraid a colleague paid {inv} and {inv2} there on {payDate}.', 'One payment went out on {payDate} before we noticed.'],
				lookWho: 'f',
				look: ['Customer paid {paidPhish} to the fake account. Told them to contact their bank at once for a recall and to report it to the police. Our invoices stay open; with me and IT security.', 'Paid to the fraudulent IBAN. Recall through their bank. Invoices remain open.'],
				ends: [[['a', 'I am sorry to hear that. Please contact your bank straight away and ask them to recall the payment, and report it to the police. The payment has not reached us, so the invoices are still open. Our receivables team ({arFirst}) and our IT security team have the case and will help your bank with anything it needs.'], ['c', 'Our bank has started a recall. We will let you know.']]]
			}
		]
	},
	// Customs costs for a delivery outside the EU.
	{
		flags: ['customs'],
		subjects: ['Customs charges', 'Import charges for {shp}', 'Duty invoiced to us', 'Delivery costs outside the EU', 'Unexpected customs invoice'],
		open: [
			'Besides the freight invoice we received {inv2} for customs: duty, import VAT and a clearance fee, {dutyTotal} in total. We did not expect this.',
			'Why are we charged import duty for the delivery to {cons}? I thought the customer pays that.',
			'Please explain the second invoice for shipment {shp}, the one with customs costs.'
		],
		ask: ['Thank you. What delivery terms did you agree with {cons}: do you deliver duty paid, or do they pay the import costs?', 'Thanks. Do you know the Incoterm of your sale to {cons}?'],
		guess: ['Disbursement invoice for import costs. Depends on the Incoterm on the booking.', 'Customs costs billed to the shipper as booked. Checking the terms.'],
		detour: ['b'],
		guessPaste: 'customs',
		paths: [
			{
				detail: ['I would have to ask our sales team. Most of our customers there buy delivered.', 'I think we deliver duty paid, but I am not sure.'],
				lookWho: 'o',
				look: ['Booking says DDP, so import duty and VAT are for the shipper. Our broker paid them at the border; the disbursement invoice is right.', 'DDP on the booking. Disbursements correct.'],
				lookPaste: 'shipment',
				ends: [[['a', 'The shipment was booked delivered duty paid, so the import costs are yours. Our broker paid the duty and import VAT at the border on your behalf, and the second invoice passes them on at cost, plus the clearance fee. The breakdown is below.\n\n{@customs}'], ['c', 'Our sales team confirms it was sold duty paid. OK.']]]
			},
			{
				detail: ['We sell to {cons} DAP: they pay the import costs. But your booking may say otherwise.', 'Our terms with {cons} are DAP.'],
				lookWho: 'o',
				look: ['Booking in the portal says DDP, entered by the customer. If it was DAP, the consignee should be billed. Need their written confirmation and the consignee’s EORI number to bill them.', 'DDP chosen in the portal by the customer. We can bill the consignee if they confirm DAP and send the consignee’s EORI.'],
				lookPaste: 'shipment',
				ends: [[['a', 'The booking was made as duty paid in our portal, so the costs came to you. If your sale was DAP, we can bill the import costs to {cons}, but we need your written confirmation of the terms and their EORI number.'], ['c', 'I will get the number from {cons} and send it with the confirmation.']]]
			}
		]
	},
	// German motorway toll.
	{
		flags: ['toll'],
		subjects: ['Toll charges', 'German toll on {inv}', 'Maut surcharge', 'What is the toll line?', 'Toll query'],
		open: [
			'Invoice {inv} has a German motorway toll of {toll}. We never had this on invoices before. What is it?',
			'Why do you charge toll separately? Your rate should include everything.',
			'There is a toll line on {inv} for {tollKm} km. Our delivery was only partly in Germany.'
		],
		shows: 'pdf',
		ask: ['Thank you. Do you have an agreement with us that sets an all-in rate, or do you ship on our price list?', 'Thanks. I will check. Is there an agreement with fixed all-in prices for your lanes?'],
		guess: ['Toll on every German leg, per the price list. Checking for an all-in agreement.', 'Toll per km on German motorways. Agreement?'],
		detour: ['b'],
		paths: [
			{
				detail: ['No, just the price list.', 'We use your price list.'],
				lookWho: 'p',
				look: ['Price list: German toll is charged on top, per motorway km, since the CO2 toll came in. {tollKm} km for this route is right.', 'Toll correct as listed, {tollKm} km on German motorways.'],
				ends: [[['a', 'On our price list, German motorway toll is charged on top of the freight rate for each kilometre driven on German motorways, as it depends on the route. For {shp} that was {tollKm} km. Your earlier invoices may not have had a German leg.'], ['c', 'Understood, thanks.']]]
			},
			{
				flags: ['allIn'],
				detail: ['Yes, our agreement has all-in rates for {consCity}. The page is below.', 'Our agreement with {amFirst} has all-in prices. Extract below.'],
				paste: 'contract',
				lookWho: 'p',
				look: ['The agreement has all-in rates for this lane, toll included. The billing tariff was set up without the all-in setting. Fixed; credit the toll lines since it started.', 'All-in agreed, tariff wrong. Corrected.'],
				ends: [[['a', 'You are right: your agreement has all-in rates for this lane, and our billing was not set up that way. It is corrected, and credit note {cn} covers the toll on {inv} and on the other invoices for this lane since the agreement started.'], ['c', 'Thanks for correcting it so quickly.']]]
			}
		]
	},
	// The October price review.
	{
		subjects: ['Rates increased?', 'Price increase not agreed', 'New rates on {inv}', 'October price change', 'Higher freight rates'],
		open: [
			'The freight on {inv} is higher than before for the same lane: {base} instead of about {oldBase}. We were not told of any price increase.',
			'Since October all our invoices are about {rise} higher. Was there a price increase?',
			'We noticed your rates went up. Who agreed this?'
		],
		shows: 'pdf',
		ask: ['Thank you. Our price list changed on 1 October. Do you have an agreement with fixed rates?', 'Thanks for asking. Is there an agreement with fixed rates for your account?'],
		guess: ['Annual review, plus {rise} from 1 October. Letter went out in August. Checking for fixed rates.', 'October list. Agreement?'],
		detour: ['b'],
		paths: [
			{
				detail: ['No agreement. And I never saw a letter.', 'Not that I know of.'],
				lookWho: 'p',
				look: ['General list customer. Review letter sent on 14 August to {oldContactEmail}. Plus {rise} is right.', 'Letter sent in August to their old contact. Rates correct.'],
				lookPaste: 'rates',
				ends: [[['a', 'Our price list is reviewed every year, and the new rates apply from 1 October. We wrote to all customers on 14 August; for your account the letter went to {oldContactEmail}. The rates for your usual lanes are below. I am sorry it did not reach you.\n\n{@rates}'], ['c', '{oldContact} has left, which explains it. Thanks for the table.']]]
			},
			{
				flags: ['fixedRates'],
				detail: ['Yes, our agreement says the rates are fixed until 31 December 2026.', 'Our agreement fixes the rates for this year. The page is below.'],
				paste: 'contract',
				lookWho: 'p',
				look: ['Rates fixed until 31 December in their agreement; the review should have skipped them. Excluded now; credit October.', 'Fixed rates until the end of the year. Our miss.'],
				ends: [[['a', 'You are right: your rates are fixed until 31 December 2026, and our price review should not have touched your account. It is corrected for new invoices, and credit note {cn} refunds the difference on your October invoices.'], ['c', 'Thank you.']]]
			},
			{
				detail: ['We know about the review, but {amFirst} promised to look at our rates because of our volumes. Nothing happened.', 'We were told our volumes would be taken into account.'],
				lookWho: 'm',
				look: ['Yes, I promised a volume review. Will propose new rates by {day}.', 'Pending my volume review; please pass it to me.'],
				ends: [[['a', 'I have passed your question to {am}, who is preparing the volume review of your rates. Until there is an agreement, the October list applies.'], ['M', 'Hello {name}, {amFirst} here. Sorry this took so long. I will send you a proposal for your main lanes by {day}.']]]
			}
		]
	},
	// A difference of a cent.
	{
		flags: ['nlOnly', 'rounding'],
		subjects: ['Difference of one cent', 'Invoice total does not match', '{inv}: rounding', 'Small difference', 'Calculation of {inv}'],
		open: [
			'Our system calculates {inv} at {totalPlus}; your invoice says {total}. One cent, but our system blocks the invoice.',
			'There is a one-cent difference between your invoice total and our calculation for {inv}.',
			'When I add up the lines of {inv} I get a different total. Can you check the calculation?'
		],
		shows: 'pdf',
		ask: ['Thank you. How does your system calculate it: VAT per line, or on the total?', 'Thanks. Could you send me your calculation?'],
		guess: ['Rounding. Billing rounds per line.', 'Rounding difference. Asking billing for the rule.'],
		paths: [
			{
				detail: ['VAT on the total.', 'Total first, then VAT.'],
				lookWho: 'b',
				look: ['Billing calculates VAT per line and rounds each line, then adds up. Their system takes VAT on the net total. A difference of a cent is expected. Both are allowed.', 'Per-line VAT rounding against VAT on the total. Normal.'],
				ends: [
					[['a', 'Our billing calculates the VAT on each line and rounds it there, then adds the lines; your system calculates VAT on the total. Both are correct ways to do it, but they can differ by a cent. Most systems have a tolerance setting for this.'], ['c', 'Our controller set a tolerance of two cents. Thanks.']],
					[['a', 'The difference comes from rounding: we round the VAT of every line, your system rounds the VAT of the total. Neither is wrong. Could your system accept a difference of a cent or two?'], ['c', 'Our IT says it can. They will change it this week.'], ['a', 'Thanks. If the invoice is still blocked after that, let me know.']]
				]
			}
		]
	},
	// An early payment discount the customer took.
	{
		flags: ['old', 'discount'],
		subjects: ['Short payment', 'Remaining balance on {inv}', 'Payment discount', 'Underpaid invoice?', '{inv} not fully paid'],
		open: [
			'Your statement shows {disc} open on {inv}. We paid within 10 days and deducted 2% as usual.',
			'Why does {inv} show a small balance? We paid early and took the discount.',
			'Please clear the balance of {disc} on {inv}. That is our early payment discount.'
		],
		shows: 'statement',
		ask: ['Thank you. Where was the discount agreed? I do not see it in your terms.', 'Thanks. Do you have the agreement for the discount?'],
		guess: ['No discount in their terms. Checking with {amFirst}.', 'Terms say {terms} days net. Discount?'],
		paths: [
			{
				detail: ['Our previous controller set it up. I assumed it was agreed.', 'It is in our system for your account.'],
				lookWho: 'm',
				look: ['No discount was ever agreed for {co}. They should pay the balance.', 'Never agreed.'],
				ends: [[['a', 'Your account manager confirms that no early payment discount was agreed for your account; the terms are {terms} days net. Could you pay the balance of {disc}?'], ['c', 'I need our finance manager to approve that. I will come back to you.']]]
			},
			{
				detail: ['It was agreed with {amFirst} last year by email. A copy is below.', 'Agreed by email with {amFirst}.'],
				lookWho: 'm',
				look: ['Yes, I agreed 2% for payment within 10 days in that email. It was never set up. My mistake.', 'Agreed by me, not entered.'],
				ends: [[['a', '{amFirst} confirms the discount was agreed. It was never set up on your account, which is why the statement shows a balance. Credit note {cn} clears {disc} on {inv}, and the discount is now in your terms.'], ['c', 'Thank you.']]]
			}
		]
	},
	// The statement does not match the customer's ledger.
	{
		flags: ['old', 'reconcile'],
		subjects: ['Statement does not match', 'Account reconciliation', 'Balance difference', 'Our ledger and your statement', 'Statement {prevMonth}'],
		open: [
			'Your statement for the end of {prevMonth} shows {stmtBal} open, but our ledger says {ledgerBal}. Could you help us reconcile?',
			'We are reconciling for our auditors and your statement differs from our books by {cnAmt}.',
			'There is a difference between your statement and our account. Can we go through it?'
		],
		shows: 'statement',
		ask: ['Thank you. Could you send me your list of open items, so I can compare?', 'Thanks. Can you send me your open items?'],
		guess: ['Reconciliation. Need their open items.', 'Will compare open items.'],
		guessPaste: 'none',
		paths: [
			{
				detail: ['Below.', 'Our open items:'],
				paste: 'openItems',
				lookWho: 'n',
				look: ['The difference is credit note {cn} of {cnAmt} from {cnDate}, missing from their list. It was sent to their mailbox on the day.', 'They have not booked {cn}.'],
				ends: [[['a', 'The difference is our credit note {cn} for {cnAmt}, dated {cnDate}, which is not in your open items. I have attached a copy.'], ['c', 'Found it; it was in the wrong folder. Reconciled now.']]]
			},
			{
				flags: ['ourMiss'],
				detail: ['Here is our list.', 'Our open items are below.'],
				paste: 'openItems',
				lookWho: 'n',
				look: ['Our statement run was before {cn} was posted; their ledger is right. Sending a corrected statement.', 'Statement wrong: {cn} missing.'],
				ends: [[['a', 'You were right: our statement was produced before credit note {cn} was posted, so it left it out. A corrected statement is attached; it matches your figure.'], ['c', 'Great, thanks.']]]
			}
		]
	},
	// A timed delivery charge.
	{
		flags: ['timed'],
		subjects: ['Timed delivery charge', 'Surcharge for delivery slot', 'Charge on {inv}', 'What is the timed delivery line?', 'Timed delivery?'],
		open: [
			'Invoice {inv} has a timed delivery charge of {timed}. We did not book a timed delivery.',
			'Why is there a surcharge for a delivery time on {inv}? We never pay that.',
			'Please explain the timed delivery line on {inv}.'
		],
		shows: 'pdf',
		ask: ['Thanks. Do you know if {cons} asked for a fixed time?', 'Thank you. I will check. Did {cons} want delivery at a particular time?'],
		guess: ['Timed delivery on the booking. Who added it?', 'Checking who added the slot.'],
		detour: ['p'],
		paths: [
			{
				flags: ['consPhoned'],
				detail: ['Not that we know.', 'No idea, I will ask them.'],
				lookWho: 'o',
				look: ['{cons} phoned the depot and asked for {slot}; the desk added timed delivery without asking the customer, who pays. Should not be charged to them without their approval.', 'Consignee asked for a slot by phone; we added the service without the shipper’s approval.'],
				lookPaste: 'shipment',
				ends: [[['a', 'It turns out {cons} phoned our depot and asked for a fixed delivery time, and our desk added it without checking with you, although you pay for it. That should not have happened. Credit note {cn} for {timed} is attached.'], ['c', 'Thanks for sorting it.']]]
			},
			{
				flags: ['portal'],
				detail: ['We book through the portal; I do not think we chose a time.', 'Our warehouse booked it.'],
				lookWho: 'o',
				look: ['Portal booking with timed delivery {slot} chosen by the customer. Delivered at {arrive}.', 'Customer chose timed delivery in the portal.'],
				lookPaste: 'shipment',
				ends: [[['a', 'The shipment was booked in our portal with a delivery window of {slot}, which is our timed delivery service; we delivered at {arrive}. The booking is attached.'], ['c', 'I see, our warehouse chose it. Fine.']]]
			}
		]
	},
	// A reminder fee.
	{
		flags: ['old', 'fee'],
		subjects: ['Reminder fee', 'Late payment fee', 'Why a fee of {fee}?', 'Interest and costs', 'Reminder costs'],
		open: [
			'We received a reminder with a fee of {fee} for {inv}. We have been a customer for years; this is not how we expect to be treated.',
			'Your reminder adds {fee} of costs. Please cancel them.',
			'Can you explain the reminder fee on {inv}?'
		],
		shows: 'reminder',
		ask: ['Thank you. Let me check the dates of the invoice and of the payment.', 'I will check the account. When was {inv} paid?'],
		guess: ['Reminder run charged a fee. Checking terms and dates.', 'Fee charged by the reminder run. Checking.'],
		paths: [
			{
				flags: ['late'],
				detail: ['We paid on {payDate}. Yes, a bit late.', 'Paid on {payDate}.'],
				lookWho: 'm',
				look: ['Paid {days} days late. The fee is correct, but a good customer; waive it once.', 'Late, and the fee follows the terms. Waive as goodwill.'],
				ends: [[['a', 'The invoice was paid {days} days after its due date, so the fee followed our terms. As a goodwill gesture your account manager has agreed to waive it this time; credit note {cn} for {fee} is attached.'], ['c', 'Thank you, appreciated.']]]
			},
			{
				flags: ['longTerms'],
				detail: ['It was not even due! We have {terms} days.', 'Our terms are {terms} days; it was not late.'],
				lookWho: 'n',
				look: ['They have {terms}-day terms; the reminder run used 30 days for this account since the terms changed. Fee charged by mistake. Account corrected.', 'Reminder used the wrong terms. Our side.'],
				ends: [[['a', 'You are right: your terms are {terms} days, and our reminder used the standard 30 days. The fee is cancelled with credit note {cn}, and your account is corrected.'], ['c', 'Thanks.']]]
			}
		]
	},
	// Dutch VAT on an invoice to a customer outside the Netherlands.
	{
		flags: ['vat21', 'nonNL'],
		subjects: ['VAT charged by mistake', 'Dutch VAT on our invoice', 'Reverse charge missing', 'VAT on {inv}', 'Incorrect VAT'],
		open: [
			'Invoice {inv} includes 21% Dutch VAT. We are a {countryAdj} company, and transport services to us are reverse charged. Please correct it.',
			'Why is there Dutch VAT on {inv}? Our VAT number is {vat}.',
			'We cannot deduct the Dutch VAT on {inv}. Please re-issue it without VAT.'
		],
		shows: 'pdf',
		ask: ['Thank you. Could you confirm your VAT number? I want to check what we have on file.', 'Thanks. Which VAT number should be on the invoice?'],
		guess: ['VAT number on the account?', 'Checking the VAT number in billing.'],
		detour: ['p'],
		paths: [
			{
				detail: ['{vat}, as on all our documents.', 'Our VAT number is {vat}.'],
				lookWho: 'b',
				look: ['VAT number field empty in billing for {cus}; without it billing charges Dutch VAT. Entered {vat}, checked in VIES: valid. Re-issue.', 'No VAT number in the billing record. Added; valid in VIES.'],
				lookPaste: 'vies',
				ends: [[['a', 'Your VAT number was missing from our billing record, so Dutch VAT was charged. I have added {vat}, and new invoices will be reverse charged. Credit note {cn} cancels {inv}, and {newInv} replaces it without VAT.'], ['c', 'Thank you.']]]
			},
			{
				detail: ['It is {vatBad}.', '{vatBad}.'],
				lookWho: 'b',
				look: ['{vatBad} is not valid in VIES; billing will not reverse charge without a valid number. The customer must check its registration.', 'VIES says not valid.'],
				lookPaste: 'viesBad',
				ends: [[['a', 'The VAT number you gave, {vatBad}, shows as not valid in the EU VIES register, and without a valid number we have to charge Dutch VAT. Could you check it with your tax adviser and send us the correct one?'], ['c', 'Strange. I will check with our accountant.']]]
			}
		]
	}
,
	// A credit the customer says was promised.
	{
		subjects: ['Credit note promised', 'Missing credit note', 'Where is our credit?', 'Credit for {shp}', 'Compensation for a late delivery'],
		open: [
			'Shipment {shp} reached {cons} a day late, and {amFirst} promised us a credit on the freight. We have not received a credit note, and invoice {inv} is now nearly due.',
			'Your colleague {amFirst} agreed on the phone to credit part of {inv} because the delivery to {cons} went wrong. Can you send the credit note?',
			'We were told we would get a credit on {inv}. Nothing has arrived. Who do I speak to?'
		],
		more: ['Until then I am keeping {inv} out of our payment run.', '{cons} complained to us about it, so it was not a small thing for us.'],
		ask: ['Thank you. Do you have the promise in writing, or do you remember roughly when you spoke to {amFirst}?', 'Thanks. Could you tell me when this was agreed and what amount was mentioned?'],
		guess: ['No credit request on file for {inv}. Asking {amFirst}.', 'Nothing in the credit log for {inv}. Need the account manager.'],
		paths: [
			{
				detail: ['It was by phone, the day after the delivery. He said half the freight.', 'On the phone, on {wday} after the delivery. Half of the freight, he said.'],
				lookWho: 'm',
				look: ['Yes, I promised 50% of the freight. The depot had planned {shp} for the day after the booked date; that was our planning. I forgot to send the credit request. Please raise it.', 'Confirmed: our planning put {shp} on the wrong day, and I agreed half the freight. Sorry, my request never went in.'],
				lookPaste: 'shipment',
				ends: [[['a', '{amFirst} confirms it: the delivery was planned a day later than booked, on our side, and he agreed to credit half the freight. Credit note {cn} for {halfBase} is attached. Sorry it took a reminder from you.'], ['c', 'Thank you, received. {inv} will go in this week’s run.']]]
			},
			{
				detail: ['By phone, last week I think. {name2} spoke to him, not me.', '{name2} spoke to him. I do not know the details.'],
				lookWho: 'm',
				look: ['I spoke to {name2}, but I did not promise a credit: {shp} was delivered on the day it was booked for. They booked the later date in the portal themselves. I told {name2} I would look into it, nothing more.', 'No credit agreed. Delivered on the booked date; the date was theirs.'],
				lookPaste: 'shipment',
				ends: [[['a', 'I checked with {amFirst}. He remembers speaking to {name2}, but he did not agree a credit: the shipment was delivered on the date it was booked for in the portal. So I cannot raise a credit note for {inv}. I am sorry this was not clearer at the time.'], ['c', 'I spoke to {name2}; she had understood it differently. We will pay the invoice.']]]
			}
		]
	},
	// A collection back to the customer that it did not book.
	{
		flags: ['returned'],
		subjects: ['Collection we did not book', 'Invoice for a return from {cons}', 'Return shipment invoiced to us', 'Who booked {shp}?', 'Unexpected collection charge'],
		open: [
			'Invoice {inv} is for a collection from {cons} back to our warehouse. We did not book that. Why are we paying for it?',
			'We received an invoice for goods coming back from {cons}. That is our customer, and returns are their business. Please check.',
			'Can you tell me who booked {shp}? It is a collection from {cons}, invoiced to us.'
		],
		shows: 'pdf',
		ask: ['Thank you. I will find out how the collection was booked. Do you know whether {cons} sent anything back to you recently?', 'Thanks. Did {cons} return goods to you that week, as far as you know?'],
		guess: ['Return collection booked on their account. Checking who booked it.', 'Booked under {cus}. Need to know by whom.'],
		detour: ['b'],
		paths: [
			{
				flags: ['phone'],
				detail: ['Not that I know of. Nobody here asked for it.', 'I asked our warehouse; they knew nothing about it until the pallets arrived.'],
				lookWho: 'o',
				look: ['The return was phoned in by {cons}, who gave {co}’s account number. Our desk took it without checking with the account holder, which it should have. Credit it; the desk has been told.', 'Booked by phone by the consignee on the customer’s account number. Not checked with the customer. Our side.'],
				lookPaste: 'shipment',
				ends: [[['a', 'The collection was phoned in to our depot by {cons}, who gave your account number, and our desk booked it without checking with you. It should have. Credit note {cn} cancels {inv}, and returns booked on your account will be checked with you first.'], ['c', 'Thank you. We will tell {cons} to book their own returns.']]]
			},
			{
				flags: ['portal'],
				detail: ['I cannot think of anything. Maybe a warranty return?', 'Possibly a return under warranty, but I would have expected to hear about it.'],
				lookWho: 'o',
				look: ['Portal booking from {co}’s own account, by {name2}, as a collection from {cons} to their warehouse. Nothing wrong at our end.', 'Booked in their own portal account by {name2}. Delivered to their warehouse and signed for.'],
				lookPaste: 'shipment',
				ends: [[['a', 'The collection was booked in our portal from your own account, by {name2}, as a pick-up at {cons} with delivery to your warehouse, where it was signed for. The booking is attached.'], ['c', 'I asked {name2}: it was a warranty return she arranged. Sorry for the trouble; the invoice is fine.']]]
			}
		]
	}
];

// Shared parts of a thread, combined with every topic.
const intros = [
	'I look after the supplier invoices at {co}.',
	'{co} sends about {n0} consignments a month with you, mostly from our site in {city}.',
	'I am new in the accounts team at {co}, so forgive me if this has been asked before.',
	'We have used Kestrel for our deliveries for a few years now and are generally happy.',
	'I am writing on behalf of our finance department.',
	'I took over the transport invoices from {oldContact} in the summer.'
];
const contexts = [
	'Our month-end close is on {day}.',
	'Our auditors are in next week.',
	'We are moving to a new accounting system, so everything has to be clean before the end of the month.',
	'Our controller asked me to get this sorted before the quarter closes.',
	'{name2} is on holiday, so I am covering her suppliers this week.'
];
const sides: { q: string; a: string; then: string }[] = [
	{ q: 'While I have you: could you send a copy of {otherInv}? I cannot find it in our mailbox.', a: 'A copy of {otherInv} is attached, as you asked.', then: 'Thanks for the copy of {otherInv} too.' },
	{ q: 'Also, our postal address changed to {street}. Could you update it?', a: 'Your postal address is now {street} in our records.', then: '' },
	{ q: 'And could you confirm that our payment of {payAmt} on {payDate2} arrived?', a: 'Your payment of {payAmt} on {payDate2} arrived and is allocated.', then: 'Good to know the {payDate2} payment arrived.' },
	{ q: 'One more thing: our auditors need a balance confirmation as of 30 September. Can you send one?', a: 'The balance confirmation as of 30 September is attached: {balSep} was open on that date.', then: 'Thanks for the balance confirmation as well.' },
	{ q: 'Is credit control open between Christmas and New Year? We do our last payment run on 23 December.', a: 'We are closed on 25 and 26 December and on 1 January; otherwise we are here as usual.', then: '' },
	{ q: 'Could you also send me your bank confirmation letter? Our supplier file needs it renewed.', a: 'Our bank confirmation letter is attached.', then: 'And thanks for the bank letter.' },
	{ q: 'Do you have a portal where I can download invoices myself?', a: 'There is no invoice portal yet, I am afraid. I can send a statement with copies whenever you need one.', then: '' },
	{ q: 'By the way, {name2} takes over supplier payments from next month, so please copy her from now on.', a: 'Noted: we will copy {name2} on our replies from now on.', then: '' },
	{ q: 'Can you tell me your VAT number for our supplier file?', a: 'Our VAT number is ' + KESTREL_VAT + ', as on every invoice.', then: '' },
	{ q: 'Last thing: could you send the statement for {prevMonth}?', a: 'The {prevMonth} statement is attached.', then: 'Got the statement, thanks.' },
	{ q: 'Our warehouse is closed on {holiday}; please let your depot know.', a: 'I have passed the closing day to our depot.', then: '' },
	{ q: 'Could the invoice number be in the subject of your invoice emails? Ours get lost.', a: 'The invoice number is already in the subject, after "Kestrel Freight invoice"; perhaps your mail program shortens it.', then: '' },
	{ q: 'Could you add our supplier number for you, {suppNo}, to your records? It helps us find your invoices.', a: 'I have added your supplier number {suppNo} to the notes on your account.', then: '' },
	{ q: 'Also: are your invoices available in {langName}? Some colleagues would prefer it.', a: 'Our invoices are in English only for now, I am afraid; the layout is the same for every country.', then: '' }
];
const greetings = ['Hello,', 'Dear credit control,', 'Good morning,', 'Hi,', 'Dear Sir or Madam,', 'Hello Kestrel team,'];
const replyGreetings = ['Hello {agent},', 'Hi {agent},', 'Dear {agent},', 'Hello,', ''];
const signoffs: Record<string, string[]> = {
	NL: ['Met vriendelijke groet,\n{full}\n{role}'],
	DE: ['Mit freundlichen Grüßen\n{full}\n{role}, {entity}'],
	FR: ['Cordialement,\n{full}\n{role}']
};
const commonSignoffs = ['Kind regards,\n{full}\n{role}, {entity}', 'Best regards,\n{full}', 'Regards,\n{full}\n{role}\n{entity} · {phone}'];
const replySignoffs = ['Thanks,\n{name}', 'Regards,\n{name}', '{name}', 'Kind regards,\n{full}', 'Thank you,\n{name}'];
const footers = ['This e-mail and any attachments are confidential and intended for the addressee only.', 'Please consider the environment before printing this e-mail.', '{entity} · {register}'];
const acks = ['Thanks for your email.', 'Thank you for getting in touch.', 'Thanks for letting us know.', ''];
const agentSignoffs = ['Kind regards,\n{signer}\nCredit control, Kestrel Freight', 'Best regards,\n{signer}', 'Thanks,\n{signer}\nKestrel Freight · credit control', 'Regards,\n{signer}'];
const holdings = [
	'Thanks for that. I have asked our {team} to look at this and will come back to you as soon as I hear.',
	'Thank you. This needs a colleague in our {team}; I will update you.',
	'Thanks for the details. I have passed them to our {team} and will be in touch.'
];
const chasers = ['Any news on this?', 'Could you give me an update? Our close is on {day}.', 'Just following up on my email below.', 'Hello again, is there any news?', 'Sorry to chase, but {name2} keeps asking me about it.'];
const reasons = [
	'We pass freight costs on to our own customers, so I need the right figure before I can invoice {cons}.',
	'Our purchasing team compares every freight invoice with the quote, and this one stood out.',
	'I would rather sort this out now than at the year-end audit.',
	'We are otherwise happy with your service, so I hope this is a simple misunderstanding.',
	'This is the first time I have had to write to you about an invoice.',
	'Our managing director asks about transport costs every month, so I need to be able to explain this.',
	'It is not a large amount, but our rules do not let me book it until it is explained.'
];
const extras = [
	'I have copied {name2}, who books most of our shipments.',
	'I am in the office until about four today if you prefer to call.',
	'Let me know if you need anything else from us.',
	'Sorry for the slow reply; it has been a busy week here.',
	'{name2} checked this with me, so the details should be right.'
];
/** What a team that is asked first, and finds nothing, writes back. */
const detours: Partial<Record<Who, [string[], string]>> = {
	o: [['Booking and delivery of {shp} look normal from the depot: collected, delivered and signed for by the consignee. Nothing on our side explains this.', 'Checked {shp} at {depot}: booked, collected and delivered as planned. Not a depot matter as far as I can see.'], 'shipment'],
	p: [['The rates on {inv} are the {month} list rates for this lane and weight band, and fuel at {fuelPct}% is the table rate. Nothing odd on the pricing side.', 'Pricing looks right to me: list rate for the weight on this lane, table fuel. If something is off, it is not the tariff.'], 'rates'],
	b: [['The invoice in billing matches what we received for {shp}: lines, VAT and total as calculated. Nothing has changed on our side.', '{inv} in billing is as it should be for what we were sent. Nothing for us here, I think.'], 'api'],
	w: [['The worker created {inv} from job {job} as soon as the delivery came in, and recorded it as usual. Nothing unusual in our log for this one.', 'Job {job} went through normally: invoice {inv} created and saved, nothing odd.'], 'log']
};
const closers = [
	'I have noted this on your account, so my colleagues can see it too.',
	'If anything else on your statement looks odd, just reply to this email.',
	'Thanks for your patience while we looked into it.',
	'Do let me know if your colleagues have questions about it.'
];
const redirects = ['The {from} sees nothing wrong. Asking our {to} instead.', 'Not a question for the {from}, then. Passing it to the {to}.', 'Nothing from the {from}. Trying the {to}.'];
const teamOf: Partial<Record<Who, string>> = { o: 'depot', b: 'billing team', w: 'invoicing team', p: 'pricing team', k: 'claims team', m: 'account management', f: 'receivables team', n: 'colleagues' };

const table = (head: string[], rows: string[][]) => [`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`, ...rows.map((row) => `| ${row.join(' | ')} |`)].join('\n');
const fence = (lines: string[], lang = 'text') => ['```' + lang, ...lines, '```'].join('\n');
const fill = (text: string, values: Record<string, string>): string =>
	text.replace(/\{(\w+)\}/g, (_, key: string) => {
		const value = values[key];
		if (value === undefined) throw new Error(`no value for {${key}} in: ${text.slice(0, 60)}`);
		return value;
	});
/** Keeps a message inside the hours its writer works; Kestrel staff work 08:00 to 17:30 on weekdays. */
const office = (r: Rand, t: number) => {
	let m = t;
	if (minuteOfDay(m) > 17 * 60 + 30) m = startOfDay(m) + DAY + 8 * 60 + int(r, 0, 80);
	if (minuteOfDay(m) < 8 * 60) m = startOfDay(m) + 8 * 60 + int(r, 0, 80);
	while (isWeekend(m)) m += DAY;
	return m;
};
const weekdayOn = (m: number) => {
	let d = m;
	while (isWeekend(d)) d -= DAY;
	return d;
};

interface Plan {
	topic: Topic;
	path: Path;
	open: number;
}

const query = (index: number, plan: Plan, number: number): string => {
	const r = mulberry32(0x6b657374 + index * 7919);
	const { topic, path } = plan;
	const flags = new Set<Flag>([...(topic.flags ?? []), ...(path.flags ?? [])]);
	const has = (flag: Flag) => flags.has(flag);

	// The customer and its people.
	const termsOf = (c: Customer) => [30, 30, 30, 14, 45, 60, 30, 45][hash(c.slug) % 8]!;
	const fits = customers.filter((c) => (!has('erp') || c.erp) && (!has('nonNL') || c.country !== 'NL') && (!has('nlOnly') || c.country === 'NL') && (!has('longTerms') || termsOf(c) > 30));
	const cust = fits[(index * 5 + int(r, 0, 6)) % fits.length]!;
	const lang = language(cust);
	const cr = mulberry32(hash(cust.slug));
	const people = shuffle(cr, givenNames[lang]!).map((given) => `${given} ${pick(cr, familyNames[lang]!)}`);
	const pr = mulberry32(hash(cust.slug) + index);
	const [full, colleague, former] = [people[int(pr, 0, 3)]!, people[4]!, people[5]!];
	const local = (person: string) => ascii(`${person.split(' ')[0]!.charAt(0)}.${person.split(' ').slice(1).join('')}`).toLowerCase().replace(/[^a-z.]/g, '');
	const email = `${local(full)}@${cust.slug}.example`;
	const terms = termsOf(cust);
	const entity = `${cust.name} ${cust.form}`;
	const cus = `cus_${cust.slug}`;
	const sister = `${cust.name.split(' ')[0]} ${pick(r, ['Logistics', 'Retail', 'Holding', 'Services'])} ${cust.form}`;
	const oldName = `${cust.name.split(' ').slice(-1)[0]} ${pick(r, ['Trading', 'Group', 'International', 'Partners'])} ${cust.form}`;
	const [depot, opsName] = depots[cust.country]!;
	const am = managers[cust.country]!;
	const agent = pick(r, creditControl);

	// The shipment.
	const pool = consignees.filter((c) => c.city !== cust.city && (has('customs') ? ['CH', 'UK'].includes(c.country) : !['CH', 'UK'].includes(c.country)) && (!has('toll') || cust.country === 'DE' || c.country === 'DE'));
	const cons = pick(r, pool);
	const german = cust.country === 'DE' || cons.country === 'DE' || cons.country === 'CH';
	const domestic = cons.country === cust.country;
	const tollKm = german ? (domestic ? int(r, 40, 160) : int(r, 90, 390)) : 0;
	const rate = domestic ? int(r, 11, 14) : int(r, 15, 21);
	const weight = has('heavy') ? int(r, 1, 4) * 1000 + int(r, 3, 9) * 100 + int(r, 0, 9) * 10 : int(r, 18, 260) * 10;
	const lessWeight = weight % 1000;
	const lowWeight = Math.round((weight * 0.72) / 10) * 10;
	const trueWeight = has('typo') ? lessWeight : weight;
	const pallets = Math.max(has('pallets') || has('damage') ? 3 : 1, Math.min(24, Math.round(trueWeight / int(r, 220, 420))));
	const palMissing = int(r, 1, Math.min(4, pallets - 1));
	const palExchanged = has('pallets') ? pallets - palMissing : pallets;
	const damaged = int(r, 1, Math.min(2, pallets));

	// Dates.
	const open = plan.open + int(r, 8 * 60, 16 * 60 + 30);
	const issuedDay = has('longTerms') ? weekdayOn(startOfDay(open) - int(r, 40, 44) * DAY) : has('old') ? weekdayOn(startOfDay(open) - (terms + int(r, 14, 24)) * DAY) : workdayBefore(open, int(r, 2, 14));
	const delivered = issuedDay + int(r, 9 * 60, 15 * 60);
	const issued = delivered + int(r, 2, 40);
	const collected = workdayBefore(delivered, domestic ? 1 : int(r, 1, 2)) + int(r, 7 * 60, 11 * 60);
	const booked = workdayBefore(collected, int(r, 1, 3)) + int(r, 8 * 60, 17 * 60);
	const due = startOfDay(issued) + terms * DAY;
	const reminderDay = weekdayOn(has('longTerms') ? startOfDay(open) - int(r, 2, 4) * DAY : Math.min(due + 7 * DAY, workdayBefore(open, 2)));
	let payDay = Math.min(startOfDay(issued) + int(r, 8, 20) * DAY, workdayBefore(open, 1));
	if (has('crossed')) payDay = workdayAfter(reminderDay, 1);
	if (has('misallocated') || has('paidOther')) payDay = weekdayOn(Math.min(due - int(r, 0, 3) * DAY, reminderDay - DAY));
	if (has('late')) payDay = Math.min(workdayAfter(reminderDay, int(r, 2, 5)), workdayBefore(open, 1));
	if (has('discount')) payDay = workdayAfter(issued, int(r, 5, 8));
	const month = monthOf(delivered);
	const fuelPct = fuelRates[at(delivered).getUTCMonth()]!;

	// The invoice.
	const vatRate = cust.country === 'NL' || has('vat21') ? 21 : 0;
	const slotStart = 7 * 60 + 30 + int(r, 0, 4) * 30;
	const arrive = has('early') ? slotStart - 180 + int(r, -10, 10) : has('noslot') ? 8 * 60 + int(r, 0, 40) : has('standing') ? slotStart + int(r, 5, 20) : slotStart + int(r, -15, 50);
	const unload = has('standing') ? (has('early') ? slotStart + int(r, 5, 25) : arrive + int(r, 3, 4) * 60 + int(r, 5, 40)) : arrive + int(r, 5, 35);
	const leave = unload + (has('standing') ? int(r, 45, 80) : int(r, 15, 45));
	const standingHours = Math.floor((unload - arrive) / 60) - 1;
	const fixedPct = 12;
	const price = (kg: number, extra: number) => {
		const base = 4500 + kg * rate + extra;
		const lines: [string, string, number][] = [
			['FRT', `Freight ${has('returned') ? `${cons.city} (${cons.country}) to ${cust.city} (${cust.country})` : `${cust.city} (${cust.country}) to ${cons.city} (${cons.country})`}, ${pallets} pallet${pallets > 1 ? 's' : ''}, ${thousands(kg)} kg`, base],
			['FSC', `Fuel surcharge ${month} ${fuelPct.toFixed(1)}%`, Math.round((base * fuelPct) / 100)]
		];
		if (tollKm) lines.push(['TOL', `German motorway toll, ${tollKm} km`, Math.round(tollKm * 34.8)]);
		if (has('tail')) lines.push(['TLF', 'Tail-lift delivery', 3800]);
		if (has('timed')) lines.push(['TMD', `Timed delivery ${hhmm(slotStart)}–${hhmm(slotStart + 90)}`, 2900]);
		if (has('standing')) lines.push(['STD', `Standing time at delivery, ${standingHours} h`, standingHours * 5200]);
		if (has('pallets')) lines.push(['PAL', `Pallets not exchanged, ${palMissing} × €14.50`, palMissing * 1450]);
		const net = lines.reduce((sum, line) => sum + line[2], 0);
		const vat = lines.reduce((sum, line) => sum + Math.round((line[2] * vatRate) / 100), 0);
		return { base, lines, net, vat, total: net + vat };
	};
	let extra = 0;
	let bill = price(weight, 0);
	const wanted = () => (has('zeroCent') ? bill.total % 10 === 0 && bill.total % 100 !== 0 : has('oddCent') ? bill.total % 10 !== 0 : has('rounding') ? bill.vat !== Math.round((bill.net * 21) / 100) : true);
	while (!wanted() && extra < 400) bill = price(weight, ++extra);
	const fixedBill = price(lessWeight, extra);
	const line = (code: string) => bill.lines.find((l) => l[0] === code)?.[2] ?? 0;

	// Numbers.
	const dayIndex = Math.floor(delivered / DAY);
	const invNo = 207000 + dayIndex * 112 + int(r, 0, 100);
	const inv = `inv_${invNo}`;
	const inv2 = `inv_${invNo - int(r, 300, 2600)}`;
	const otherInv = `inv_${invNo - int(r, 2700, 4200)}`;
	const newInv = `inv_${207000 + Math.floor(LAST_OPEN / DAY) * 112 + 400 + index * 7}`;
	const jobNo = 41000 + dayIndex * 118 + int(r, 0, 100);
	const job = `job_${jobNo}`;
	const shp = `shp_${770000 + dayIndex * 131 + int(r, 0, 120)}`;
	const cn = `CN-2026-${1180 + index * 3 + int(r, 0, 2)}`;
	const po = `4500${int(r, 100000, 999999)}`;
	const vatOf = (c: string, seed: number) => ({ NL: `NL${seed % 1000000000}B01`, BE: `BE0${String(seed % 1000000000).padStart(9, '7')}`, DE: `DE${100000000 + (seed % 899999999)}`, FR: `FR${10 + (seed % 89)}${100000000 + (seed % 899999999)}`, LU: `LU${10000000 + (seed % 89999999)}` })[c]!;
	const vat = vatOf(cust.country, hash(cust.slug + 'vat'));
	const register = { NL: `KvK ${10000000 + (hash(cust.slug) % 89999999)}`, BE: `RPR ${vat.slice(2)}`, DE: `Amtsgericht ${cust.city}, HRB ${1000 + (hash(cust.slug) % 89999)}`, FR: `RCS ${cust.city} ${String(hash(cust.slug)).slice(0, 9)}`, LU: `RCS Luxembourg B${100000 + (hash(cust.slug) % 199999)}` }[cust.country];
	const dutyRate = cons.country === 'CH' ? 8.1 : 20;
	const goodsValue = int(r, 40, 240) * 100 * 100;
	const duty = Math.round(goodsValue * (int(r, 0, 4) * 0.012));
	const importVat = Math.round(((goodsValue + duty + bill.net) * dutyRate) / 100);
	const dutyTotal = duty + importVat + 6500 + Math.round((duty + importVat) * 0.02);
	const cnAmt = int(r, 4, 60) * 1000 + int(r, 0, 99);
	const cnDay = has('ourMiss') ? workdayBefore(open, 1) : workdayBefore(open, int(r, 12, 30));
	const bounceDay = workdayBefore(open, int(r, 10, 25));
	const inv2Amount = int(r, 9000, 190000);
	const credited = has('reconcile') && !has('ourMiss');
	// The customer's invoices of the last weeks, for the account panel and the statement.
	const history = [{ inv, day: startOfDay(issued), amount: bill.total, paid: has('crossed') }];
	for (let back = int(r, 0, 3), k = 0; k < int(r, 7, 12); k++, back += int(r, 2, 9)) {
		const day = weekdayOn(startOfDay(open) - (back + 1) * DAY);
		if (day !== startOfDay(issued)) history.push({ inv: `inv_${invNo + Math.round((day - startOfDay(issued)) / DAY) * 112 + int(r, 0, 99)}`, day, amount: int(r, 9000, 190000), paid: day + terms * DAY < open && r() < 0.85 });
	}
	history.sort((a, b) => b.day - a.day);
	const disc = Math.round(bill.total * 0.02);
	const openOf = (row: { inv: string; amount: number }) => (has('discount') && row.inv === inv ? disc : row.amount);
	const statementRows = history.filter((row) => !row.paid).reverse();
	const stmtBal = statementRows.reduce((sum, row) => sum + openOf(row), 0) - (credited ? cnAmt : 0);
	const hex = Array.from({ length: 64 }, () => '0123456789abcdef'[int(r, 0, 15)]).join('');
	const slug = (text: string) => text.toLowerCase().replace(/[^a-z]+/g, '');
	const consStaff = `${pick(r, ['M.', 'S.', 'J.', 'K.', 'A.', 'P.', 'L.'])} ${pick(r, familyNames[['DE', 'CH'].includes(cons.country) ? 'DE' : cons.country === 'NL' || cons.country === 'BE' ? 'NL' : cons.country === 'UK' ? 'NL' : 'FR']!)}`;
	const via = has('phone') ? 'phone' : has('portal') ? 'portal' : pick(r, ['portal', 'portal', 'phone', 'email']);
	const days = Math.max(3, Math.round((payDay - due) / DAY));

	const values: Record<string, string> = {
		name: full.split(' ')[0]!, full, email, role: roles[hash(full) % roles.length]!, phone: `+${{ NL: 31, BE: 32, DE: 49, FR: 33, LU: 352 }[cust.country]} ${int(r, 10, 99)} ${int(r, 100, 999)} ${int(r, 1000, 9999)}`,
		name2: colleague.split(' ')[0]!, email2: `${local(colleague)}@${cust.slug}.example`, apEmail: `${payablesBox[lang]}@${cust.slug}.example`,
		oldContact: former, oldContactEmail: `${local(former)}@${cust.slug}.example`, co: cust.name, entity, cus, city: cust.city, city2: cust.city2,
		countryAdj: countryAdjectives[cust.country]!, goods: cust.goods, erp: cust.erp, langName: { NL: 'Dutch', DE: 'German', FR: 'French' }[lang]!,
		sister, sisterCus: `${cus}_${slug(sister.split(' ')[1]!)}`, oldName, renameMonth: pick(r, ['June', 'July', 'August']), signMonth: `${pick(r, ['January', 'March', 'May', 'November'])} ${pick(r, ['2024', '2025'])}`,
		cons: cons.name, consCity: cons.city, depot, opsFirst: opsName.split(' ')[0]!, am, amFirst: am.split(' ')[0]!, agent,
		devFirst: pick(r, invoicingTeam).split(' ')[0]!, bilFirst: pick(r, billingTeam).split(' ')[0]!, arFirst: receivable.split(' ')[0]!, claimsFirst: claims.split(' ')[0]!,
		inv, inv2, otherInv, newInv, shp, job, cn, po, vat, vatBad: vat.slice(0, -2) + String((Number(vat.slice(-2)) + 37) % 100).padStart(2, '0'), register,
		terms: String(terms), month, prevMonth: monthNames[at(open).getUTCMonth() - 1]!, day: weekday(workdayAfter(open, int(r, 2, 4))), wday: weekday(workdayBefore(open, int(r, 3, 6))),
		payDate: longDate(payDay), payDate2: longDate(workdayBefore(open, int(r, 5, 20))), payRef: `${pick(r, ['BETALING', 'ZAHLUNG', 'VIR', 'PAY'])}-${int(r, 10000, 99999)}`, payAmt: eur(int(r, 20000, 900000)),
		cnDate: longDate(cnDay), bounceDate: longDate(bounceDay), days: String(days),
		total: eur(bill.total), totalPlus: eur(bill.net + Math.round((bill.net * 21) / 100)), base: eur(bill.base), oldBase: eur(Math.round(bill.base / 1.045)), rise: '4.5%',
		fuel: eur(line('FSC')), halfBase: eur(Math.round(bill.base / 2)), fuelPct: fuelPct.toFixed(1), fixedPct: fixedPct.toFixed(1), fuelDiff: eur(line('FSC') - Math.round((bill.base * fixedPct) / 100)),
		toll: eur(line('TOL')), tollKm: String(tollKm), tail: eur(3800), timed: eur(2900), standing: eur(line('STD')), standingHours: String(standingHours),
		slot: `${hhmm(slotStart)}–${hhmm(slotStart + 90)}`, arrive: hhmm(arrive), unload: hhmm(unload), leave: hhmm(leave),
		palletsN: `${pallets} pallet${pallets > 1 ? 's' : ''}`, palMissingN: `${palMissing} pallet${palMissing > 1 ? 's' : ''}`, damagedN: `${damaged} pallet${damaged > 1 ? 's' : ''}`,
		palExchangedN: palExchanged === 1 ? 'one empty pallet' : `${palExchanged} empty pallets`,
		pallets: String(pallets), palMissing: String(palMissing), palExchanged: String(palExchanged), palReturned: String(palMissing + int(r, 2, 8)), palAmt: eur(palMissing * 1450), damaged: String(damaged),
		weight: thousands(weight), lessWeight: thousands(lessWeight), lowWeight: thousands(lowWeight), fixedTotal: eur(fixedBill.total),
		amtBug: pyAmount(bill.total), amtOk: pyAmount(bill.total), amtCents: String(bill.total), disc: eur(disc), fee: eur(4000),
		stmtBal: eur(stmtBal), ledgerBal: eur(has('ourMiss') ? stmtBal - cnAmt : stmtBal + cnAmt), cnAmt: eur(cnAmt), dutyTotal: eur(dutyTotal), paidPhish: eur(bill.total + int(r, 30000, 250000)),
		n: String(int(r, 2, 9)), n0: String(int(r, 20, 90)), street: `${pick(r, { NL: ['Industrieweg', 'Havenstraat', 'Nijverheidslaan'], DE: ['Hauptstraße', 'Gewerbering', 'Industriestraße'], FR: ['Rue de la Gare', 'Avenue de l’Europe', 'Rue du Commerce'] }[lang]!)} ${int(r, 2, 180)}, ${cust.city}`,
		balSep: eur(int(r, 200000, 4000000)), suppNo: `${int(r, 70000, 79999)}`, holiday: pick(r, ['11 November', '24 December', '31 December', 'the Friday after Christmas'])
	};
	const f = (text: string) => fill(text, values);

	// Pasted output.
	const billedTo = has('sister') ? sister : has('rename') ? oldName : entity;
	const billedCus = has('sister') ? values.sisterCus! : cus;
	const vatRow = vatRate ? `VAT ${vatRate}%` : 'VAT reverse charged';
	const invoiceView = (t: number) =>
		[
			`Billing console · ${inv} · ${billedTo} (${billedCus}) · ${t > due ? 'overdue' : 'open'}`,
			`Shipment ${shp} · job ${job} · issued ${shortDate(issued)} · due ${shortDate(due)} · terms ${terms} days`,
			'',
			table(['#', 'Description', 'Amount'], [...bill.lines.map((l, i) => [String(i + 1), l[1], eur(l[2])]), ['', 'Net', eur(bill.net)], ['', vatRow, eur(bill.vat)], ['', 'Total', eur(bill.total)]])
		].join('\n');
	const pdf = () =>
		fence([
			`KESTREL FREIGHT B.V. · Waalhaven Z.z. 41, Rotterdam · VAT ${KESTREL_VAT}`,
			`INVOICE ${inv}`.padEnd(46) + `Date ${numeric(issued, '-')}`,
			`${billedTo}, ${cust.city}`.padEnd(46) + `Customer ${billedCus}`,
			`Shipment ${shp}`.padEnd(46) + `Due ${numeric(due, '-')}`,
			'',
			...bill.lines.map((l) => l[1].replace(/ \([A-Z]{2}\) to /, ' – ').replace(/ \([A-Z]{2}\),/, ',').padEnd(56).slice(0, 56) + plain(l[2]).padStart(10)),
			'Net'.padEnd(56) + plain(bill.net).padStart(10),
			(vatRate ? `VAT ${vatRate} %` : 'VAT reverse charged, art. 196 VAT Directive').padEnd(56) + plain(bill.vat).padStart(10),
			'Total EUR'.padEnd(56) + plain(bill.total).padStart(10),
			'',
			`Payment within ${terms} days of the invoice date.`
		]);
	const api = (t: number) => {
		const body = [`  "id": "${inv}",`, `  "customer": "${billedCus}",`, `  "shipment": "${shp}",`, `  "amount_cents": ${bill.total},`, `  "currency": "EUR",`, `  "status": "${t > due ? 'overdue' : 'open'}",`, `  "issued": "${iso(issued)}",`];
		if (t >= DUE_DATE_LIVE) body.push(`  "due_date": "${iso(due)}",`);
		body.push(`  "vat_cents": ${bill.vat},`, '  "lines": [', bill.lines.map((l) => `    {"code": "${l[0]}", "amount_cents": ${l[2]}}`).join(',\n'), '  ]');
		return `GET /invoices/${inv} → 200\n\n${fence(['{', ...body, '}'], 'json')}`;
	};
	const shipment = () => {
		const bookedBy = via === 'portal' ? `in the portal by ${has('sister') || has('returned') ? values.email2 : email}` : via === 'phone' ? `by phone (desk: ${opsName}, ${depot}${has('returned') ? `; caller ${consStaff}, ${cons.name}` : ''})` : `by email from ${email}`;
		const declared = has('under') ? lowWeight : weight;
		return fence([
			`Shipment   ${shp} · booked ${stamp(booked)} ${bookedBy}`,
			...(has('returned')
				? [`Shipper    ${cons.name}, ${cons.city} (${cons.country})`, `Consignee  ${entity}, ${cust.city} (${cust.country})`, `Billed to  ${entity} (${cus})`]
				: [`Shipper    ${billedTo} (${billedCus}), ${has('secondSite') ? cust.city2 : cust.city}`, `Consignee  ${cons.name}, ${cons.city} (${cons.country})`]),
			`Goods      ${pallets} pallet${pallets > 1 ? 's' : ''}, ${cust.goods}, declared ${thousands(declared)} kg`,
			`Weighed    ${thousands(trueWeight)} kg at ${depot}, ${stamp(collected + int(r, 90, 300))}`,
			`Services   ${[has('tail') && !has('tailUsed') ? 'tail-lift' : '', has('timed') ? `timed delivery ${hhmm(slotStart)}–${hhmm(slotStart + 90)}${has('consPhoned') ? ` (added ${stamp(office(r, booked + int(r, 60, 600)))} by depot, consignee’s request)` : ''}` : '', has('standing') && !has('noslot') ? `delivery slot ${hhmm(slotStart)}–${hhmm(slotStart + 90)}` : ''].filter(Boolean).join(' · ') || 'none'}`,
			...(has('customs') ? ['Incoterm   DDP'] : []),
			`Reference  ${has('portal') || r() < 0.4 ? po : '—'}`,
			`Collected  ${stamp(collected)} · delivered ${stamp(delivered)} · signed ${has('returned') ? `${colleague.charAt(0)}. ${colleague.split(' ').slice(1).join(' ')}` : consStaff}`
		]);
	};
	const pod = () => {
		const remarks = has('damage')
			? `${damaged} pallet${damaged > 1 ? 's' : ''} damaged, wrapping torn and cartons crushed on one side; photos taken by receiver`
			: has('tailUsed')
				? 'dock closed for works, unloaded at the kerb by tail-lift at the receiver’s request'
				: has('tail')
					? 'unloaded at dock 3, tail-lift not used'
					: has('pallets')
						? 'no empties available'
						: has('wrongScan')
							? 'label damaged, shipment chosen from the driver’s list'
							: has('standing')
								? has('early') ? 'arrived before slot' : 'receiver short of staff, not unloaded until later'
								: pick(r, ['all in good order', 'goods taken in at door 2', 'count checked by receiver', '']);
		return fence([
			`Proof of delivery · ${shp} · ${has('returned') ? `${entity}, ${cust.city}` : `${cons.name}, ${cons.city}`}`,
			`Driver ${pick(r, drivers)} · vehicle ${int(r, 10, 99)}-${pick(r, ['BXK', 'VRT', 'BNL', 'BGZ', 'VKJ'])}-${int(r, 1, 9)}${has('tail') ? ' (tail-lift)' : ''}`,
			`Arrived ${hhmm(arrive)} · unloading from ${hhmm(unload)} · left ${hhmm(leave)} · ${shortDate(delivered)}`,
			`Delivered ${pallets} pallet${pallets > 1 ? 's' : ''} · empties received ${palExchanged}`,
			`Received by ${consStaff} (signed)`,
			`Remarks: ${remarks ? `"${remarks}"` : '—'}`
		]);
	};
	const log = () => {
		const at0 = issued - int(r, 0, 2);
		const rows: string[] = [];
		for (let k = -int(r, 2, 4); k <= int(r, 1, 3); k++) {
			const amount = k === 0 ? bill.total : int(r, 4000, 260000);
			rows.push(`${iso(at0 + k)} ${clock(at0 + k)}:${pad(int(r, 0, 59))},${String(int(r, 0, 999)).padStart(3, '0')} INFO app.worker job job_${jobNo + k}: invoice inv_${invNo + k} for ${pyAmount(amount)}`);
		}
		return fence(rows);
	};
	const notification = () => {
		const body = `{"amount": "${pyAmount(bill.total)}", "currency": "EUR", "customer": "${cus}", "invoice": "${inv}", "job": "${job}", "type": "invoice.created"}`;
		return fence(['POST /hooks/kestrel/invoices HTTP/1.1', `Host: ${pick(r, ['erp', 'integrations', 'api', 'edi'])}.${cust.slug}.example`, 'Accept-Encoding: identity', `Content-Length: ${body.length}`, 'Content-Type: application/json', `X-Signature: ${hex}`, 'User-Agent: Python-urllib/3.12', '', body], 'http');
	};
	const erpMessage = (locale: boolean) => {
		const a = pyAmount(bill.total);
		const text = locale
			? `${cust.erp}: invoice ${inv} held. Amount "${a}" read as ${thousands(bill.total)},00 EUR using number format 1.234,56; this is above the approval threshold of 10.000,00 EUR.`
			: {
					'Exact Online': `Exact Online · Import purchase invoices\nLine 1: Amount "${a}" is not a valid amount. Expected format: 0.00\n0 of 1 invoices imported.`,
					'SAP Business One': `[DI API] -5002 Invalid value "${a}" for field DocTotal (format ####.##); document ${inv} not added`,
					Odoo: `Odoo · vendor bill import: amount_total "${a}" does not match ^\\d+\\.\\d{2}$; bill ${inv} not created`,
					AFAS: `Inkoopfactuur ${inv} niet aangemaakt: veld Bedrag "${a}" heeft een ongeldig formaat (verwacht: 2 decimalen).`,
					'Business Central': `The value "${a}" can't be evaluated into type Decimal with 2 decimal places. Purchase invoice ${inv} was not created.`,
					Cegid: `Rejet import facture ${inv} : montant "${a}" invalide (format attendu 0.00).`
				}[cust.erp]!;
		return `${fence(text.split('\n'))}\n\n${notification()}`;
	};
	const packing = () => {
		const rows: string[][] = [];
		let left = lessWeight;
		for (let p = 1; p <= pallets; p++) {
			const kg = p === pallets ? left : Math.round(lessWeight / pallets) + int(r, -12, 12);
			left -= kg;
			rows.push([String(p), cust.goods, String(int(r, 8, 60)), String(kg)]);
		}
		return `Packing list ${po}, ${cons.name}:\n\n${table(['Pallet', 'Contents', 'Cartons', 'Gross kg'], [...rows, ['', '', 'Total', thousands(lessWeight)]])}`;
	};
	const fuel = () =>
		table(
			['Month', 'Diesel index of the month before (€/l)', 'Surcharge'],
			fuelRates.map((rate, i) => [monthNames[i]!, (1.38 + (rate - 13) * 0.11).toFixed(3), `${rate.toFixed(1)}%`])
		);
	const contract = () =>
		fence([
			`Transport agreement ${entity} – Kestrel Freight B.V.`,
			`Signed ${values.signMonth}; term two years, renewed yearly unless cancelled.`,
			'',
			has('fixedRates') ? '3.1 The rates in Annex 1 are fixed until 31 December 2026 and are not subject to the annual price review.' : '3.1 The rates in Annex 1 follow Kestrel’s annual price review on 1 October.',
			has('allIn') ? `3.4 The rates for the lanes in Annex 1, part B (including ${cust.city} – ${cons.city}) are all-in rates and include road tolls.` : '3.4 Road tolls are charged as set out in the price list.',
			has('fixedFuel') ? `4.2 The fuel surcharge is fixed at ${fixedPct.toFixed(1)}% of the freight charge until 31 December 2026; after that it follows Kestrel’s monthly table.` : '4.2 The fuel surcharge follows Kestrel’s monthly fuel table.',
			`6.1 Invoices are payable within ${terms} days of the invoice date.`
		]);
	const statement = () =>
		[
			`Statement of account · ${entity} (${cus}) · ${shortDate(workdayBefore(open, 1))}`,
			'',
			table(
				['Document', 'Date', 'Due', 'Amount', 'Open'],
				[
					...statementRows.map((row) => [row.inv, shortDate(row.day), shortDate(row.day + terms * DAY), eur(row.amount), eur(openOf(row))]),
					...(credited ? [[cn, shortDate(cnDay), '', `−${eur(cnAmt)}`, `−${eur(cnAmt)}`]] : []),
					['', '', '', 'Total open', eur(stmtBal)]
				]
			)
		].join('\n');
	const openItems = () =>
		`Open items, supplier Kestrel Freight B.V. (${values.suppNo}):\n\n${table(
			['Document', 'Supplier ref.', 'Date', 'Amount'],
			[...statementRows.map((row, i) => [`${int(r, 5100000, 5199999)}`, row.inv, numeric(row.day, '.'), plain(row.amount)]), ...(has('ourMiss') ? [[`${int(r, 5100000, 5199999)}`, cn, '', `-${plain(cnAmt)}`]] : [])]
		)}`;
	const remittance = () =>
		`Payment advice · ${entity} · payment run ${numeric(payDay, '.')}\n\n${table(
			['Invoice', 'Invoice date', 'Amount', 'Deduction', 'Paid'],
			[[inv, numeric(issued, '.'), plain(bill.total), '0.00', plain(bill.total)], ...Array.from({ length: int(r, 1, 4) }, () => {
				const amount = int(r, 9000, 160000);
				return [`inv_${invNo - int(r, 10, 900)}`, numeric(workdayBefore(issued, int(r, 1, 15)), '.'), plain(amount), '0.00', plain(amount)];
			})]
		)}`;
	const bank = () => {
		const rows: [number, string[]][] = [];
		for (let k = 0; k < int(r, 2, 4); k++) {
			const no = invNo - int(r, 900, 9000);
			rows.push([workdayBefore(payDay, int(r, 0, 3)), [pick(r, customers.filter((c) => c !== cust)).name, `INV ${no}`, eur(int(r, 8000, 300000)), `inv_${no}`]]);
		}
		const ref = has('misallocated') ? `${ascii(entity).toUpperCase().slice(0, 18)} INV_${String(invNo).slice(0, 4)}` : has('paidOther') ? `${values.payRef} ${inv2}` : `${values.payRef} ${inv}`;
		rows.push([payDay, [entity, ref, eur(has('paidOther') ? inv2Amount : bill.total), has('misallocated') ? inv2 : has('paidOther') ? `${inv2} (paid twice)` : inv]]);
		rows.sort((a, b) => a[0] - b[0]);
		return `Bank account NL..4471, incoming, extract:\n\n${table(['Value date', 'Payer', 'Remittance information', 'Amount', 'Allocated to'], rows.map(([day, row]) => [shortDate(day), ...row]))}`;
	};
	const pallets2 = () =>
		`Pallet account ${cus}:\n\n${table(
			['Date', 'Shipment / note', 'Out', 'Back', 'Balance'],
			[
				[shortDate(workdayBefore(delivered, 20)), 'balance brought forward', '', '', String(Number(values.palReturned) - palMissing)],
				[shortDate(delivered), shp, String(pallets), String(palExchanged), values.palReturned!],
				[shortDate(workdayBefore(open, 1)), `correction: ${values.palReturned} returned at ${depot} on ${values.wday}, moved from another account`, '', values.palReturned!, '0']
			]
		)}`;
	const mail = (bounce: boolean) =>
		fence(
			Array.from({ length: int(r, 3, 6) }, (_, k) => {
				const t = workdayBefore(open, 3 + k * int(r, 2, 5)) + int(r, 9 * 60, 17 * 60);
				const status = bounce && t >= bounceDay ? `550 5.1.1 <${values.oldContactEmail}>: Recipient address rejected: User unknown` : '250 2.0.0 OK';
				return `${iso(t)} ${clock(t)}  invoice inv_${invNo - k * int(r, 60, 300)}  to ${values.oldContactEmail}  ${status}`;
			}).reverse()
		);
	const renamed = `01.${pad(monthNames.indexOf(values.renameMonth!) + 1)}.2026`;
	const registry = () =>
		fence(
			{
				NL: [`Uittreksel Handelsregister Kamer van Koophandel`, `KvK-nummer ${register.slice(4)}`, `Statutaire naam: ${entity}`, `Eerdere naam: ${oldName} (tot ${renamed})`, `Vestiging: ${cust.city}`],
				DE: [`Handelsregister B des Amtsgerichts ${cust.city}`, register.replace(/^.*, /, ''), `Firma: ${entity}`, `Frühere Firma: ${oldName} (bis ${renamed})`, `Sitz: ${cust.city}`],
				FR: [`Extrait Kbis · ${register}`, `Dénomination : ${entity}`, `Ancienne dénomination : ${oldName} (jusqu’au ${renamed})`, `Siège : ${cust.city}`],
				BE: [`KBO / BCE · ondernemingsnummer ${vat.slice(2)}`, `Naam: ${entity}`, `Vorige naam: ${oldName} (tot ${renamed})`, `Zetel: ${cust.city}`],
				LU: [`Registre de commerce et des sociétés · ${register}`, `Dénomination : ${entity}`, `Ancienne dénomination : ${oldName}`, `Siège : ${cust.city}`]
			}[cust.country]
		);
	const customs = () =>
		`Disbursement invoice ${inv2} · shipment ${shp} · import into ${countryNames[cons.country]}:\n\n${table(
			['Item', 'Amount'],
			[
				[`Import duty (customs value ${eur(goodsValue)})`, eur(duty)],
				[`Import VAT ${dutyRate}%`, eur(importVat)],
				['Clearance fee (broker)', eur(6500)],
				['Disbursement fee 2%', eur(Math.round((duty + importVat) * 0.02))],
				['Total', eur(dutyTotal)]
			]
		)}`;
	const vies = (valid: boolean) =>
		fence([`VIES VAT number validation`, `Member State: ${cust.country} · VAT number: ${(valid ? vat : values.vatBad!).slice(2)}`, `Date of request: ${iso(startOfDay(open) + 600)}`, valid ? `Valid: yes · Name: ${entity.toUpperCase()} · Address: ${cust.city.toUpperCase()}` : 'Valid: no · Name: --- · Address: ---']);
	const rates = () =>
		`${cust.city} – ${cons.city}, general price list:\n\n${table(
			['Weight band', 'Until 30 September', 'From 1 October'],
			[300, 600, 1000, 2000, 3000, 5000].slice(0, int(r, 4, 6)).map((band) => [`up to ${thousands(band)} kg`, eur(Math.round((4500 + band * rate) / 1.045)), eur(4500 + band * rate)])
		)}`;
	const phish = () =>
		fence([
			'From: Kestrel Freight Accounts <accounts@kestrel-freight-payments.example>',
			`Sent: ${stampLong(workdayBefore(open, 1) + int(r, 400, 900))}`,
			'Subject: Updated remittance details – action required',
			'',
			'Dear valued customer,',
			'',
			'Following an audit of our banking arrangements, all payments to Kestrel Freight B.V. must from now on be made to our new account:',
			'',
			`IBAN LT${int(r, 10, 99)} 3250 0${int(r, 100, 999)} ${int(r, 1000, 9999)} ${int(r, 1000, 9999)} · BIC XBNKLT2X`,
			'',
			`Please settle invoice ${inv} and any other open items to this account and confirm by return.`,
			'',
			'Accounts Department',
			'Kestrel Freight'
		]);
	const reminder = () =>
		fence([
			`Kestrel Freight B.V. · payment reminder · ${longDate(reminderDay)}`,
			`${entity}, ${cust.city} (${cus})`,
			'',
			'According to our records the following invoices are overdue:',
			`${inv}   ${numeric(issued, '-')}   due ${numeric(has('longTerms') ? startOfDay(issued) + 30 * DAY : due, '-')}   ${plain(bill.total).padStart(10)}`,
			...(has('fee') ? [`Reminder fee${''.padEnd(37)}${plain(4000).padStart(10)}`] : []),
			'',
			'Please pay within 7 days. If you have paid in the meantime, please disregard this reminder.'
		]);
	const apReject = () =>
		fence([
			`${pick(r, ['Coupa', 'Basware', 'Tungsten', 'SAP Ariba', 'Yooz'])} · invoice ${inv} from Kestrel Freight B.V. · ${eur(bill.total)}`,
			`Status: rejected (${pick(r, ['rule P2P-04', 'validation 3.2', 'matching rule M1'])})`,
			'Reason: no purchase order number found on the invoice',
			`Received ${numeric(issued, '.')} · rejected ${numeric(workdayAfter(issued, 1), '.')} · returned to supplier`
		]);
	const poList = () =>
		table(
			['Invoice', 'Shipment', 'Your PO', 'Amount'],
			[[inv, shp, po, eur(bill.total)], ...Array.from({ length: int(r, 3, 7) }, (_, k) => [`inv_${invNo + 30 + k * int(r, 20, 140)}`, `shp_${770000 + dayIndex * 131 + 200 + k * int(r, 30, 160)}`, `4500${int(r, 100000, 999999)}`, eur(int(r, 9000, 160000))])]
		);
	const recent = () =>
		`Open balance ${eur(stmtBal)} · ${statementRows.length} open invoice${statementRows.length > 1 ? 's' : ''} · last payment ${shortDate(workdayBefore(open, int(r, 1, 12)))}\n\n${table(
			['Recent invoice', 'Date', 'Amount', 'Status'],
			history.filter((row) => row.inv !== inv || (!has('sister') && r() < 0.5)).slice(0, int(r, 4, 6)).map((row) => [row.inv, shortDate(row.day), eur(row.amount), row.paid ? 'paid' : row.day + terms * DAY < open ? 'overdue' : 'open'])
		)}`;
	const pastes: Record<string, (t: number) => string> = {
		none: () => '',
		invoice: invoiceView,
		pdf,
		api,
		shipment,
		pod,
		log,
		webhook: notification,
		erp: () => erpMessage(false),
		erpLocale: () => erpMessage(true),
		packing,
		fuel,
		contract,
		statement,
		openItems,
		remittance,
		bank,
		pallets: pallets2,
		mail: () => mail(false),
		mailBounce: () => mail(true),
		registry,
		customs,
		vies: () => vies(true),
		viesBad: () => vies(false),
		rates,
		phish,
		reminder,
		poList,
		apReject
	};
	let t = open;
	const paste = (name: string | undefined) => {
		const make = pastes[name ?? 'none'];
		if (!make) throw new Error(`no paste ${name}`);
		return make(t);
	};
	const text = (body: string) => f(body).replace(/\{@(\w+)\}/g, (_, name: string) => paste(name));

	// The thread.
	const messages: string[] = [];
	const opsLabel = `${opsName} (${depot} depot)`;
	const labels: Record<Who, string> = {
		c: `**${full}**`,
		a: `**${agent} (credit control)**`,
		n: `**${agent} (credit control)** · internal note`,
		o: `**${opsLabel}** · internal note`,
		b: `**${pick(r, billingTeam)} (billing)** · internal note`,
		w: `**${pick(r, invoicingTeam)} (invoicing)** · internal note`,
		p: `**${pricing} (pricing)** · internal note`,
		k: `**${claims} (claims)** · internal note`,
		K: `**${claims} (claims)**`,
		m: `**${am} (account manager)** · internal note`,
		M: `**${am} (account manager)**`,
		f: `**${receivable} (receivables)** · internal note`,
		s: '**Mailbox**'
	};
	const signers: Partial<Record<Who, string>> = { a: agent, K: `${claims.split(' ')[0]}\nClaims, Kestrel Freight`, M: `${am.split(' ')[0]}\nAccount manager, Kestrel Freight` };
	const say = (who: Who, body: string) => messages.push(`${labels[who]} · ${stamp(t)}\n\n${body.trim()}`);
	const advance = (who: Who) => {
		const before = t;
		if (who === 'c') {
			t += int(r, 40, 1900);
			if (minuteOfDay(t) > 19 * 60) t = startOfDay(t) + DAY + 7 * 60 + int(r, 30, 200);
			if (minuteOfDay(t) < 7 * 60) t = startOfDay(t) + 7 * 60 + int(r, 30, 200);
			while (isWeekend(t)) t += DAY;
		} else if (who === 's') t = office(r, startOfDay(t) + 7 * DAY + 9 * 60);
		else if (who === 'a' || who === 'M' || who === 'K') t = office(r, t + int(r, 25, 800));
		else t = office(r, t + int(r, 10, 1400));
		if (t > LAST_MESSAGE) t = before + int(r, 5, 40);
	};
	const footer = () => (r() < 0.25 ? `\n\n--\n${f(pick(r, footers))}` : '');
	const custBody = (paragraphs: string[], first: boolean) => {
		const greeting = first ? pick(r, greetings) : f(pick(r, replyGreetings));
		const signoff = first ? pick(r, [...commonSignoffs, ...signoffs[lang]!]) : pick(r, replySignoffs);
		return [greeting, ...paragraphs, f(signoff)].filter(Boolean).join('\n\n') + (first ? footer() : '');
	};
	const pendingSide: string[] = [];
	const staffBody = (who: Who, paragraphs: string[]) => {
		const extra = who === 'a' ? pendingSide.splice(0).map((line) => (r() < 0.5 ? `As for your other question: ${line.charAt(0).toLowerCase()}${line.slice(1)}` : line)) : [];
		const hello = /^Hello /.test(paragraphs[0]!) ? [] : [pick(r, [`Hello ${values.name},`, `Dear ${values.name},`, `Hi ${values.name},`])];
		return [...hello, ...paragraphs, ...extra, fill(pick(r, who === 'a' ? agentSignoffs : ['{signer}', 'Best regards,\n{signer}']), { signer: signers[who]! })].join('\n\n');
	};

	// 1. The customer writes.
	const opening = [text(pick(r, topic.open))];
	if (r() < 0.45) opening.unshift(text(pick(r, intros)));
	if (topic.more && r() < 0.75) opening.push(text(pick(r, topic.more)));
	if (r() < 0.45) opening.push(text(pick(r, reasons)));
	if (r() < 0.35) opening.push(text(pick(r, contexts)));
	if (topic.shows && r() < 0.8) opening.push(`${pick(r, ['Copied below:', 'For reference:', 'Here it is:', 'I have pasted it below.', 'Below, as we received it:'])}\n\n${paste(topic.shows)}`);
	say('c', custBody(opening, true));

	// 2. Credit control asks.
	advance('a');
	const ask = text(pick(r, topic.ask));
	say('a', staffBody('a', [[/^(Thank|Sorry)/.test(ask) ? '' : pick(r, acks), ask].filter(Boolean).join(' ')]));

	// 3. The customer answers, and may raise something else.
	advance('c');
	const side = r() < 0.6 ? pick(r, sides) : undefined;
	const answer = [text(pick(r, path.detail)), paste(path.paste)].filter(Boolean);
	if (r() < 0.35) answer.push(text(pick(r, extras)));
	if (side) {
		answer.push(text(side.q));
		pendingSide.push(text(side.a));
	}
	say('c', custBody(answer, false));

	// 4. Credit control looks, and often guesses.
	advance('n');
	say('n', [text(pick(r, topic.guess)), paste(topic.guessPaste ?? 'invoice')].filter(Boolean).join('\n\n'));

	// 5. Sometimes another team is asked first and finds nothing; sometimes a holding reply and a chaser.
	const team = teamOf[path.lookWho] ?? 'colleagues';
	const wrong = (topic.detour ?? []).filter((who) => who !== path.lookWho);
	if (wrong.length && r() < 0.6) {
		const who = pick(r, wrong);
		const [notes, shows] = detours[who]!;
		advance(who);
		say(who, [text(pick(r, notes)), paste(shows)].join('\n\n'));
		advance('n');
		say('n', fill(pick(r, redirects), { from: teamOf[who]!, to: team }));
	}
	if (path.lookWho !== 'n' && r() < 0.45) {
		advance('a');
		say('a', staffBody('a', [fill(pick(r, holdings), { ...values, team })]));
		if (r() < 0.5) {
			advance('c');
			const other = r() < 0.5 ? pick(r, sides.filter((s) => s !== side)) : undefined;
			say('c', custBody([text(pick(r, chasers)), ...(other ? [text(other.q)] : [])], false));
			if (other) pendingSide.push(text(other.a));
		}
	}

	// 6. Someone finds out.
	advance(path.lookWho);
	say(path.lookWho, [text(pick(r, path.look)), paste(path.lookPaste)].filter(Boolean).join('\n\n'));

	// 7. The end.
	const end = pick(r, path.ends);
	const thanks = side?.then && r() < 0.6 ? text(side.then) : '';
	end.forEach(([who, body], i) => {
		advance(who);
		const said = text(body);
		if (who === 'c') say('c', custBody(i === end.length - 1 && thanks ? [said, thanks] : [said], false));
		else if (signers[who]) say(who, staffBody(who, who === 'a' && r() < 0.35 ? [said, pick(r, closers)] : [said]));
		else say(who, said);
	});
	if (pendingSide.length) {
		advance('a');
		say('a', staffBody('a', [pick(r, ['One more thing from your earlier email.', 'I almost forgot your other question.', 'And before I forget:'])]));
	}

	const subject = text(pick(r, topic.subjects));
	return [
		`# Query ${number}: ${subject}`,
		`From ${full} <${email}>, ${entity} · ${stampLong(open)}`,
		`Account ${cus} · ${cust.city}, ${countryNames[cust.country]} · payment terms ${terms} days · account manager ${am}`,
		recent(),
		...messages.map((message) => `---\n\n${message}`)
	].join('\n\n') + '\n';
};

// Which topic and path each query follows: topics are dealt in rounds, each round in a new order, and the paths of a
// topic in turn, so that two queries on one topic end differently until its paths run out.
const workdays: number[] = [];
for (let d = 30; d <= 73; d++) if (!isWeekend(d * DAY)) workdays.push(d * DAY);
const order = mulberry32(20261001);
const plans: Plan[] = [];
const used = new Map<Topic, number>();
const deck: Topic[] = [];
for (let index = 0; index < ITEMS; index++) {
	const open = workdays[Math.floor((index * workdays.length) / ITEMS)]!;
	const allowed = (topic: Topic) => !topic.since || open >= topic.since;
	if (!deck.some(allowed)) deck.push(...shuffle(order, topics));
	const topic = deck.splice(deck.findIndex(allowed), 1)[0]!;
	const seen = used.get(topic) ?? 0;
	used.set(topic, seen + 1);
	plans.push({ topic, path: topic.paths[(seen + topics.indexOf(topic)) % topic.paths.length]!, open });
}

const folder = join(root, 'docs', 'invoice-queries');
mkdirSync(folder, { recursive: true });
let number = 7406;
plans.forEach((plan, index) => {
	number += int(order, 1, 4);
	writeFileSync(join(folder, `query-${number}.md`), query(index, plan, number));
});
writeFileSync(
	join(folder, 'README.md'),
	`# Invoice queries, 1 October to 13 November 2026\n\nEvery thread customers started in the credit control mailbox in these six weeks, one file each, exported before the\nmailbox moves to the new finance tool. The export kept the messages and the internal notes, but not the tags,\nstatuses or owners. Numbers missing from the sequence were spam, supplier mail or merged into another thread.\nAmounts are in euros. Extracts in internal notes are as colleagues pasted them.\n`
);
