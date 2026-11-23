// Writes the long material of this entry's long tasks: the partner feedback threads of Fernhill's partner help
// desk since the 1.4.0 release of the partner console, one Markdown file each, under docs/partner-feedback/.
// Deterministic: fixed seeds, no clock, no network.
//   bun long/generate.ts <workspace root>
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** How many threads are written. Dates, ticket numbers, topics and the folder's README all follow from it. */
const ITEMS = 150;

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

// Dates are whole days since 1970, shown the way the console shows them ("3 Mar 2026").
const DAY = 86400000;
const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const longMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const toDay = (iso: string) => Math.round(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / DAY);
const asDate = (day: number) => new Date(day * DAY);
const show = (day: number) => {
	const d = asDate(day);
	return `${d.getUTCDate()} ${shortMonths[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};
const iso = (day: number) => asDate(day).toISOString().slice(0, 10);
const monthOf = (day: number) => longMonths[asDate(day).getUTCMonth()]!;
const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
const first = toDay('2026-05-11');
const last = toDay('2026-11-18');

// Fernhill's people.
const consoleTeam = ['Priyanka Rao', 'Lukas Brenner'];
const productLead = 'Mireille Fontaine';
type TeamKey = 'billing' | 'contracts' | 'support' | 'security' | 'data';
const teams: Record<TeamKey, { name: string; people: string[] }> = {
	billing: { name: 'billing', people: ['Owen Farrelly', 'Marta Quintero'] },
	contracts: { name: 'partner contracts', people: ['Sakura Ishii', 'Declan Morrow'] },
	support: { name: 'customer support', people: ['Dev Malhotra', 'Anouk Jansen'] },
	security: { name: 'security and compliance', people: ['Hal Petersen'] },
	data: { name: 'the data team', people: ['Nadia Kowal', 'Ruairi Flynn'] }
};
const teamRole: Record<TeamKey, string> = {
	billing: 'Fernhill billing',
	contracts: 'Fernhill partner contracts',
	support: 'Fernhill customer support',
	security: 'Fernhill security',
	data: 'Fernhill data team'
};

// The partners: resellers and managed service providers who sell Fernhill to their own customers.
type Currency = 'GBP' | 'EUR' | 'USD';
interface Partner {
	company: string;
	domain: string;
	formerDomain: string;
	city: string;
	currency: Currency;
	accounts: string[];
	people: [string, string][];
	psm: string;
	sign: string;
	discount: number;
	phone: string;
}
const partners: Partner[] = [
	{ company: 'Brightwater IT', domain: 'brightwater-it.example', formerDomain: 'brightwater-solutions.example', city: 'Leeds', currency: 'GBP', accounts: ['Brightwater IT', 'Brightwater IT Education'], people: [['Dana Whitcombe', 'Service desk lead'], ['Sam Achterberg', 'Account manager']], psm: 'Ines Calder', sign: 'Thanks,', discount: 0.85, phone: '0113 496 0582' },
	{ company: 'Kestrel Systems', domain: 'kestrelsystems.example', formerDomain: 'kestrel-it.example', city: 'Dublin', currency: 'EUR', accounts: ['Kestrel Systems Ireland', 'Kestrel Systems UK'], people: [['Aoife Brennan', 'Operations manager'], ['Ciarán Doyle', 'Licensing']], psm: 'Bram Hendriks', sign: 'Many thanks,', discount: 0.9, phone: '01 555 0193' },
	{ company: 'Halyard Networks', domain: 'halyard.example', formerDomain: 'halyard-networks.example', city: 'Bristol', currency: 'GBP', accounts: ['Halyard Networks', 'Halyard Networks Ltd'], people: [['Gary Mbeki', 'Director'], ['Lucy Penhaligon', 'Service coordinator']], psm: 'Ines Calder', sign: 'Cheers,', discount: 0.92, phone: '0117 496 0731' },
	{ company: 'Tessellate Consulting', domain: 'tessellate.example', formerDomain: 'tessellate-ict.example', city: 'Rotterdam', currency: 'EUR', accounts: ['Tessellate Consulting', 'Tessellate Zorg', 'Tessellate Onderwijs'], people: [['Joost van Leeuwen', 'Partner lead'], ['Femke de Wit', 'Support engineer']], psm: 'Bram Hendriks', sign: 'Kind regards,', discount: 0.82, phone: '010 555 0147' },
	{ company: 'Pinecrest Technology', domain: 'pinecrest.example', formerDomain: 'pinecrest-tech.example', city: 'Auckland', currency: 'USD', accounts: ['Pinecrest Technology NZ', 'Pinecrest Technology AU'], people: [['Mere Tawhiri', 'Customer success'], ['Hamish Gallagher', 'Commercial manager']], psm: 'Adaeze Nwosu', sign: 'Ngā mihi,', discount: 0.9, phone: '09 555 0168' },
	{ company: 'Bluebell Office Solutions', domain: 'bluebell-office.example', formerDomain: 'bluebell-copiers.example', city: 'Norwich', currency: 'GBP', accounts: ['Bluebell Office Solutions'], people: [['Rachel Ostrowski', 'Office systems manager'], ['Tom Elphick', 'Engineer']], psm: 'Tomasz Wrona', sign: 'Best wishes,', discount: 0.95, phone: '01603 496 0920' },
	{ company: 'Corbel Digital', domain: 'corbel.example', formerDomain: 'corbel-informatique.example', city: 'Lyon', currency: 'EUR', accounts: ['Corbel Digital', 'Corbel Digital Santé'], people: [['Élodie Marchand', 'Head of service'], ['Thibault Roux', 'Technician']], psm: 'Tomasz Wrona', sign: 'Best regards,', discount: 0.88, phone: '04 55 50 12 64' },
	{ company: 'Saltire Tech', domain: 'saltire-tech.example', formerDomain: 'saltire-computing.example', city: 'Glasgow', currency: 'GBP', accounts: ['Saltire Tech', 'Saltire Tech Public Sector'], people: [['Callum Reid', 'Managing director'], ['Shona MacLeod', 'Service desk']], psm: 'Ines Calder', sign: 'Cheers,', discount: 0.87, phone: '0141 496 0275' },
	{ company: 'Meridian Workplace', domain: 'meridianworkplace.example', formerDomain: 'meridian-office.example', city: 'Toronto', currency: 'USD', accounts: ['Meridian Workplace', 'Meridian Workplace Quebec'], people: [['Grace Liu', 'Partner operations'], ['Dev Anand', 'Billing']], psm: 'Adaeze Nwosu', sign: 'Thanks,', discount: 0.9, phone: '416 555 0136' },
	{ company: 'Ostara Cloud', domain: 'ostara.example', formerDomain: 'ostara-it.example', city: 'Berlin', currency: 'EUR', accounts: ['Ostara Cloud', 'Ostara Cloud Bildung', 'Ostara Cloud Österreich', 'Ostara Cloud Schweiz', 'Ostara Cloud Nord', 'Ostara Cloud Süd', 'Ostara Cloud Gesundheit', 'Ostara Cloud Kommunal', 'Ostara Cloud Handwerk'], people: [['Jannik Vogel', 'Teamleiter Service'], ['Sabine Kraus', 'Sales']], psm: 'Bram Hendriks', sign: 'Viele Grüße,', discount: 0.8, phone: '030 5550 1842' },
	{ company: 'Riverbend MSP', domain: 'riverbendmsp.example', formerDomain: 'riverbend-it.example', city: 'Austin', currency: 'USD', accounts: ['Riverbend MSP', 'Riverbend MSP Healthcare', 'Riverbend MSP Schools', 'Riverbend MSP Legal', 'Riverbend MSP San Antonio', 'Riverbend MSP Houston', 'Riverbend MSP Nonprofit'], people: [['Marcus Delgado', 'Service manager'], ['Tanya Brooks', 'Office manager']], psm: 'Adaeze Nwosu', sign: 'Thanks!', discount: 0.84, phone: '512 555 0187' },
	{ company: 'Alder & Finch IT', domain: 'alderfinch.example', formerDomain: 'alder-finch.example', city: 'Manchester', currency: 'GBP', accounts: ['Alder & Finch IT', 'Alder & Finch Charities'], people: [['Hugo Sandoval', 'Technical lead'], ['Priti Shah', 'Accounts']], psm: 'Tomasz Wrona', sign: 'Regards,', discount: 0.9, phone: '0161 496 0458' }
];

const firstNames = ['Alison', 'Deepak', 'Morag', 'Stefan', 'Chidi', 'Bronwen', 'Farah', 'Lewis', 'Oksana', 'Trevor', 'Niamh', 'Rashid', 'Gemma', 'Piotr', 'Yvonne', 'Shreya', 'Desmond', 'Katya', 'Owen', 'Maribel', 'Arjun', 'Lorna', 'Kwame', 'Ingrid', 'Bashir', 'Tamsin', 'Elliot', 'Roisin', 'Hamza', 'Cerys', 'Dominic', 'Ayesha', 'Fergus', 'Linh', 'Rosalind', 'Mateo', 'Hiroshi', 'Beatrix', 'Kofi', 'Saoirse'];
const surnames = ['Whitlock', 'Banerjee', 'Okonkwo', 'Prentice', 'Kowalczyk', 'Haldane', 'Mistry', 'Trevelyan', 'Abara', 'Lindqvist', 'Farrow', 'Qureshi', 'Dunmore', 'Nakamura', 'Ellery', 'Castellanos', 'Brathwaite', 'Sorensen', 'Achebe', 'Marchetti', 'Oduya', 'Hargreaves', 'Ferreira', 'Kaminski'];
const orgHeads = ['Cobalt', 'Greystone', 'Marlow', 'Ashcombe', 'Kinsale', 'Bramble', 'Halden', 'Penrose', 'Whitmore', 'Larch', 'Quayside', 'Elderflower', 'Carrick', 'Thornbury', 'Juniper', 'Ravensworth', 'Oakhurst', 'Linden', 'Mossgiel', 'Seaton', 'Fairholme', 'Westbury', 'Tamarind', 'Brook Lane'];
const orgTails = ['Dental Group', 'Logistics', 'Solicitors', 'Primary School', 'Housing Trust', 'Architects', 'Veterinary Practice', 'Engineering', 'Surveyors', 'Medical Centre', 'Accountants', 'Estate Agents', 'Brewery', 'Recruitment', 'Community Trust', 'Print and Design', 'Opticians', 'Builders', 'Insurance Brokers', 'Language School', 'Physiotherapy', 'Joinery'];
type Plan = 'Starter' | 'Growth' | 'Enterprise';
const plans: Plan[] = ['Starter', 'Growth', 'Enterprise'];
const prices: Record<Currency, Record<Plan, number>> = {
	GBP: { Starter: 3.6, Growth: 7.2, Enterprise: 12.8 },
	EUR: { Starter: 4.2, Growth: 8.4, Enterprise: 14.9 },
	USD: { Starter: 4.5, Growth: 9, Enterprise: 16 }
};
const symbol: Record<Currency, string> = { GBP: '£', EUR: '€', USD: '$' };
const money = (currency: Currency, amount: number) =>
	`${symbol[currency]}${amount.toFixed(2).replace(/\B(?=(\d{3})+\.)/g, ',')}`;

interface Org {
	name: string;
	domain: string;
	plan: Plan;
	seats: number;
	since: number;
}
// Each partner's customers stay the same from one thread to the next.
const customersOf = (partnerIndex: number): Org[] => {
	const r = mulberry32(0xc0570 + partnerIndex * 104729);
	const heads = shuffle(r, orgHeads);
	const tails = shuffle(r, orgTails);
	return Array.from({ length: 14 }, (_, i) => {
		const name = `${heads[i]} ${tails[i]}`;
		return {
			name,
			domain: `${heads[i]!.toLowerCase().replace(/[^a-z]/g, '')}-${tails[i]!.split(' ')[0]!.toLowerCase()}.example`,
			plan: pick(r, ['Starter', 'Growth', 'Growth', 'Growth', 'Enterprise'] as Plan[]),
			seats: int(r, 6, 180),
			since: toDay('2024-03-01') + int(r, 0, 760)
		};
	});
};

// Topics. Every placeholder in braces is filled from the thread's context (see `thread`). `area` is what the
// thread is about; it is never written into a file.
type Area = 'dashboard' | 'members' | 'account switcher' | 'sign-in' | 'console as a whole' | 'outside the console';
type Art = 'orgs' | 'members' | 'usage' | 'invoice' | 'email' | 'csv' | 'audit' | 'screen' | 'accounts' | 'clause' | 'team' | 'report';
interface Flags {
	suspended?: boolean;
	trial?: boolean;
	migrated?: boolean;
	escaped?: boolean;
	oldEmail?: boolean;
}
interface Topic {
	area: Area;
	asks: [string, string][];
	details: string[];
	explain: string[];
	probe?: [string, string][];
	notes?: string[];
	internal?: string[];
	art?: Art[];
	/** What Fernhill pastes back in a reply. */
	reply?: Art[];
	customer?: string;
	clause?: string;
	flags?: Flags;
	minAccounts?: number;
	team?: [TeamKey, string];
	need?: string;
	needReply?: string;
	followups?: [string, string][];
	/** How Fernhill settles the topic in a message when it comes up as a side matter, if its endings need more context. */
	quick?: string;
	endings: Partial<Record<'answered' | 'fixed' | 'planned' | 'declined' | 'withdrawn', string>>;
}

const topics: Topic[] = [
	{
		area: 'outside the console',
		asks: [
			['Seat numbers', "The dashboard for {acct} shows {n} seats in use this month, and our {month} invoice charges us for {n2}. I have been through it with {co}'s office manager and she says nobody new has joined. Which number is right?"],
			['{month} invoice', 'Our {month} invoice is higher than I expected and I cannot make it agree with the console. I have put the two side by side below. The gap is biggest for {co}.'],
			['How are seats counted?', 'Our finance person has asked me to explain why what we pay for seats never quite matches what the dashboard says. I could not, so I am asking you.'],
			["Invoice against the console for {co}", "Can someone explain the seats on our latest invoice? For {co} we are charged for {n2} seats, but whenever I look at the dashboard it says somewhere around {n}. The customer only pays us for what the console shows."]
		],
		details: [
			'We bill our own customers each month on the number the console shows, so every seat of difference comes out of our margin.',
			'{co} had a busy month. They took on temporary staff for a fortnight and let them go again.',
			'I counted the people on the Members page for {co} and got {n}, the same as the dashboard.',
			'This is the third month running that the invoice is higher, never lower.',
			"Our accounts team reconciles every invoice line against what we charge the customer, and this is the line that never balances."
		],
		explain: [
			'The two numbers measure different things. The dashboard shows the seats in use on the latest day we have figures for. The invoice charges for the highest number of seats in use on any day of the month. When a customer adds people for part of a month and removes them again, the dashboard has gone back down by the time you look, but the invoice still counts the busiest day.',
			'The short version is that the invoice uses the busiest day of the month and the dashboard uses the most recent day. A customer whose headcount moves during the month will always show a gap between the two.'
		],
		probe: [
			['Did {co} add and remove people during {month}, even for a few days?', 'Now you mention it, yes. They had {k} temps in for stocktaking in the second week, and they were removed before the end of the month.'],
			['Which invoice is it? The number starts with FH.', '{invoice}. Our accounts team has the PDF if you need it.']
		],
		internal: [
			'Daily usage for {co}: {n2} seats on the {d}, {n} by the end of the month. The invoice is right.',
			'Usage records show a second organization called {co} created on the {d} and counted from then on. Looks like a duplicate from the ordering form.'
		],
		art: ['usage', 'invoice'],
		team: ['billing', 'they can go through the daily figures behind the invoice and issue a credit note if anything was counted twice'],
		need: 'the invoice number and the organizations whose seats look wrong',
		needReply: 'The invoice is {invoice}, and the organizations are {co} and {co2}.',
		followups: [
			["Does someone who is removed halfway through the month count for the whole month?", "They count on every day they could sign in. The invoice then takes the single busiest day of the month, so if the busiest day came before they were removed, they are in that number; if it came after, they are not."],
			["Is the busiest day worked out per organization or for the whole account?", "Per organization. Each organization has its own busiest day and the invoice adds those up, which is another reason the total can be higher than any single day on the dashboard."],
			["Will a credit note show up on the next invoice or separately?", "Separately. Credit notes appear in the partner portal under Invoices as documents of their own, and you can set them against any open invoice."]
		],
		reply: ['report'],
		endings: {
			answered: 'You can see where the difference comes from in the usage report that goes with each invoice: in the partner portal, open Invoices and then Usage report. It lists the busiest day for every organization. For {co} it was the {d}, with {n2} seats. If you bill your customers the same way, the numbers will line up.',
			fixed: 'Billing found the cause. The ordering form created a duplicate organization for {co} on the {d}, so its seats were counted twice for the rest of the month. The duplicate has been closed and a credit note for the difference is on its way; it will be in the partner portal within a few days.',
			declined: "I asked billing and partner contracts whether we could invoice you on the same figure the dashboard shows. The answer is no: the partner agreement bills on the busiest day of the month, and that is not something we can change for one partner. I know it isn't the answer you wanted.",
			planned: 'Several partners have asked for the same thing, so the dashboard will show the busiest day of the month next to the current number of seats. It is on the console roadmap for {when}.'
		}
	},
	{
		area: 'dashboard',
		asks: [
			['Export?', 'Is there a way to get the organizations table out of the console as a spreadsheet? At the start of each month I copy it by hand into our billing sheet, and with {k2} organizations on {acct} it takes a while and I make mistakes.'],
			['Download button for the organizations list', 'We would really like a download button on the dashboard. CSV is fine. Our PSA tool can import a file, and then nobody would have to retype anything.'],
			["Getting our customer list out", "We are moving to a new PSA tool next month and need our list of Fernhill organizations, with plans and seats, in a file. Is there any way to download it from the console rather than typing it all in?"]
		],
		details: [
			'Last month I missed a row and {co} went unbilled for a month before anyone noticed.',
			'Our PSA tool is ConnectWise, but any file with headings would do.',
			'Ideally it would have the same columns as the table, plus some kind of organization ID that does not change when a customer renames itself.',
			'We only need this once a month, so it does not have to be clever.',
			"The organizations table is also what our account managers go through before every customer review, so they copy it as well."
		],
		explain: [
			'There is no export on the dashboard today. Selecting the table and pasting it into a spreadsheet keeps the columns, which is what most partners do in the meantime.',
			'This is a fair ask. The console does not have an export yet, and I can see why copying it by hand is no fun at your size.'
		],
		probe: [
			['Which columns do you actually use? If it is only the name and the seats, there may be a quicker way.', 'Name, plan and seats. Status matters only when something is suspended.'],
			['Would a monthly file sent by email do, or does it need to be on the dashboard?', 'Email would honestly be better. Nobody remembers to go and download things.']
		],
		notes: ['An export of what the table shows is a small piece of work. The open question is only where the button goes and what the file is called.', 'For what it is worth, we count eleven partner tickets this year asking for an export of some kind.'],
		art: ['csv', 'orgs'],
		need: 'an example of the file your PSA tool expects, with a couple of rows',
		needReply: 'The format is below. The tool is fussy about the column names.',
		followups: [
			["Would an export include the suspended organizations as well?", "Anything that comes out of the console would match the table, and the table shows suspended organizations along with the rest."],
			["Is the organization ID shown anywhere today?", "Not in the console. It is on each line of the usage report in the partner portal, and in the address of the organization in the customer's own Fernhill settings."],
			["Could an export include organizations from all our accounts in one file?", "The dashboard only ever shows the account picked in the header, so anything taken from it would be per account. The usage report in the partner portal can be run for all accounts at once."]
		],
		endings: {
			answered: 'The usage report in the partner portal (Invoices, then Usage report for any month) is a CSV with one row per organization, with its plan and its seats. It is the same data as the dashboard table, ready to import, and several partners use it for exactly this.',
			planned: 'We are adding a download of the organizations table to the dashboard, as CSV with the same columns plus the organization ID. It is planned for {when}, and I will post here when it ships.',
			declined: 'We have decided not to add an export to the console for now. The usage report that comes with each invoice already carries the same data, and we would rather keep one source than two that can disagree.'
		}
	},
	{
		area: 'console as a whole',
		asks: [
			['Dates', "Our team is in {city} and everyone here reads dates month first. The console shows dates like {date}. Could it follow the browser's date settings instead?"],
			['Dates come through as text in Excel', 'When I paste the organizations table into Excel, the Customer since column comes through as text, so I cannot sort by it or work out renewal dates.'],
			["Date format in the console", "Small one: our team finds the dates in the console awkward. We use day/month/year numbers everywhere else, and the console's \"{date}\" style does not match anything in our other systems."]
		],
		details: [
			'We paste the table into quarterly reviews for each customer.',
			'Our renewal calendar is built from the Customer since dates, by hand at the moment.',
			'The same goes for the dates on invoices, but those at least are in the PDF.',
			"Our customers in {city} mostly have US settings on their laptops, so anything we paste into a report comes out in a mix of formats.",
			"I know it is a small thing, but it is one of the few things from the console that customers actually see."
		],
		explain: [
			'The console writes dates as the day, a short month name and the year, such as {date}, so they cannot be misread on either side of the Atlantic. It does not follow the browser settings at the moment.'
		],
		probe: [['Is the trouble reading the dates, or using them in a spreadsheet afterwards?', 'Using them. Excel does not treat them as dates, so the column will not sort.']],
		notes: ['In our tests Excel turns a cell like "{date}" into a real date if the column is formatted as Date before pasting. With the General format it stays as text.'],
		art: ['orgs', 'screen'],
		followups: [
			["Does the same apply to the dates on the Members page and the invoices?", "Every date in the console uses the same format. Invoices are produced by billing and follow the country on your partner agreement."],
			["Would a numeric format like 2026-03-03 be an option? That sorts everywhere.", "It sorts, but in our last partner survey it was the format people liked least for reading. We would rather not swap one complaint for another."],
			["Does the console look at the language set in the browser at all?", "Not at the moment. Everything, dates included, is in English whatever the browser is set to."]
		],
		endings: {
			answered: 'A tip from the console team: format the spreadsheet column as Date before you paste, and Excel converts "{date}" into a real date that sorts properly. We tried it with both US and UK settings.',
			declined: 'We talked this over and will keep the current format everywhere. Writing the month as a word is the one format nobody misreads, and the console is used in eleven countries.',
			planned: 'Dates in the console will follow the language and region set in the browser, as part of the translation work planned for {when}.'
		}
	},
	{
		area: 'account switcher',
		asks: [
			['Account list in the header', 'We manage {accounts} accounts and the account list in the header has got long. Finding the right one means scrolling a list that runs off the bottom of my laptop screen. A search box in it would help a lot.'],
			['Finding an account', 'Is there a quicker way to jump between accounts? I switch many times a day and spend more time hunting through the list than looking at the page.'],
			["Too many accounts in the list", "Since we took over another reseller's customers, the account list in the console header has become unwieldy. Is there a way to search it, or at least to put the accounts in alphabetical order?"]
		],
		details: [
			'Our accounts are named after regions and sectors, so they all start with the same words.',
			'The list is in the order the accounts were set up, not alphabetical, which makes it worse.',
			'I work on a 13-inch laptop at 125% zoom.',
			"Two of the accounts differ only in the last word, and I pick the wrong one about once a week.",
			"Our team leads switch less, but the service desk practically lives in the console."
		],
		explain: ['The account list in the header is a standard drop-down, and its order comes from the order your accounts were added to the partner agreement.'],
		probe: [['How many accounts are on your login now?', 'All of them, so {accounts}. More by the end of the year: we are taking over another reseller\'s customers.']],
		notes: ['The account list is the browser\'s own drop-down. Typing the first letters of an account while it has focus jumps to it, in every browser we support.'],
		art: ['accounts'],
		minAccounts: 6,
		followups: [
			["Can we change the order of the accounts ourselves?", "Not from the console. The order follows the partner agreement, and partner contracts can reorder the accounts there if you ask them."],
			["Would it help if we merged some accounts?", "It would shorten the list, but accounts are also how invoices are split, so merging them changes your billing too. Most partners keep them apart for that reason."],
			["Is there a limit to how many accounts one login can have?", "No. The largest partner we have runs a little over forty accounts on one login."]
		],
		endings: {
			answered: 'One thing that may help straight away: click the account list once, then type the first few letters of the account name. The list jumps to the first match, and Enter picks it. It works in Chrome, Edge, Firefox and Safari.',
			planned: 'A searchable account picker, sorted by name, is on the roadmap for {when}, for partners with more than a handful of accounts.',
			declined: 'We looked at a search box and decided against it for now. Fewer than one partner in ten has more than five accounts, and typing the first letters already works in the current list.'
		}
	},
	{
		area: 'account switcher',
		asks: [
			['Two accounts that look the same', 'We have two accounts in the header, "{acct}" and "{acct2}", and nobody here can remember which is which without opening the dashboard and looking at the organizations.'],
			['Rename an account?', 'Can one of our accounts be renamed? The names in the header come from old company names and half the team does not recognise them.'],
			["Which account is which?", "Our new starters keep confusing \"{acct}\" and \"{acct2}\" in the console header. Is there any way to make the names clearer?"]
		],
		details: [
			'The organizations under each account are completely different, so mixing them up matters.',
			'Last week a colleague looked at the wrong account and told a customer they had seats to spare when they had none.',
			'The second account came from a company we bought two years ago.',
			"Our invoices carry the same two names, so our accounts team has the same trouble.",
			"It would be enough to see something that tells them apart; it does not have to be a new name."
		],
		explain: ['Account names in the console come from the partner agreement, so they can only be changed there. The console shows them as they are.'],
		probe: [['Which names would you like? I need the exact spelling, and which account each one belongs to.', '"{partner} Commercial" for the one with {co} in it, and "{partner} Public" for the other.']],
		art: ['screen'],
		minAccounts: 2,
		team: ['contracts', 'account names are part of the partner agreement, and they can change them without a new contract'],
		need: 'the new names you want and which account each one goes on',
		needReply: '"{partner} Commercial" for the one with {co} in it, and "{partner} Public" for the other.',
		followups: [
			["Would renaming change anything for our customers?", "No. Customers never see the account name. It only appears in the console header and on your invoices."],
			["Do we need a new agreement for a rename?", "No. A rename is a letter, not a new agreement, as long as the legal entity behind the account stays the same."],
			["Could the header show the partner number as well?", "Not today. The partner number is on every invoice and in the partner portal, under Agreement."]
		],
		endings: {
			fixed: 'Partner contracts have renamed the accounts as you asked. Sign out and back in, and the header shows the new names.',
			declined: 'Partner contracts tell me the names have to match the legal entities on the agreement, so they cannot change them to trading names. Sorry about that. For now the organizations on each dashboard are the only way to tell them apart.',
			planned: 'The header will show each account\'s country and partner number next to its name, so accounts with similar names can be told apart. It is planned for {when}.'
		}
	},
	{
		area: 'account switcher',
		asks: [
			['Console opens on the wrong account', 'Every time I sign in, the console opens on {acct} although I spend all day in {acct2}. Could it remember the last account I used?'],
			['Default account', 'Is there a way to choose which account the console opens on? For everyone in our office it opens on the first one, which only one person uses.'],
			["Can the console start on {acct2}?", "Most of my team works in {acct2} all day, but every time we sign in the console shows {acct} first. Could it start where we left off?"]
		],
		details: [
			'We sign in several times a day because we share machines on the service desk.',
			'It is a small thing, but it catches people out: they start reading the wrong dashboard.',
			'New starters in particular do not notice the account name in the header.',
			"It also means people sometimes answer a customer while looking at the wrong account, without noticing.",
			"We tried bookmarking the page for each account, but the address is the same for all of them."
		],
		explain: ['The console opens on the first account on your login, which is the primary account on your partner agreement.'],
		probe: [['Is it the same account for everyone at {partner}, or does each person want a different one?', 'Different. Our public sector people only ever use {acct2}, everyone else uses {acct}.']],
		art: ['screen'],
		minAccounts: 2,
		team: ['contracts', 'they can change which account is primary on your agreement'],
		need: 'which account should come first',
		needReply: '{acct2}, please. That covers most of us.',
		followups: [
			["Is there a link we could bookmark that opens a particular account?", "Not today. The address of the console is the same whichever account is picked, so a bookmark always opens on the first account."],
			["If the primary account changes, does that affect our invoices?", "No. Which account is primary only decides the order on your login. Invoices stay per account, as they are now."],
			["Does the order of the other accounts follow the primary account too?", "Yes. The primary account comes first and the others follow in the order they were added."]
		],
		endings: {
			planned: 'The console will remember the last account each person picked, on that browser. It is on the roadmap for {when}.',
			declined: 'We have decided to keep opening on the primary account. People who share machines, as several partners do, would otherwise open on whatever account the previous person left behind.',
			fixed: 'Partner contracts have made {acct2} the primary account on your agreement, so the console now opens on it for everyone at {partner}.'
		}
	},
	{
		area: 'members',
		asks: [
			['Adding a user for a customer', '{co} asked us to add a new starter, {cust}, to Fernhill. I expected to do it from the Members page in the console but there is no button for it. How do we add someone?'],
			['Inviting people from the console', 'Our customers expect us to do their admin for them. Could the Members page let us invite new people, so we do not have to ask the customer\'s owner every time?'],
			["New starter at {co}", "{co} has a new starter, {cust}, who needs Fernhill from Monday. Their owner is away. Can we add the new starter ourselves somehow? The Members page only lets us look."]
		],
		details: [
			"Their only owner is on maternity leave and nobody else there has the rights.",
			'We do this about {k} times a month across our customers.',
			'At the moment I email the customer\'s owner, who forwards it to someone, who forgets.',
			"Our contract with {co} says we look after their user admin, so they expect us to just do it.",
			"Some of our customers would happily give us the rights, but nobody there knows how."
		],
		explain: ["The Members page in the console shows who can sign in. It does not change anything in the customer's organization. Invitations are sent from the customer's own Fernhill settings, by an owner or an admin."],
		probe: [['Does anyone at {partner} have the admin role in {co}\'s organization?', 'Not that I know of. Should we?']],
		customer: 'Hi {first}, we have a new starter on Monday, {cust2}, in accounts. Could you set them up on Fernhill like last time? Thanks!',
		art: ['email', 'members'],
		need: 'the name of the person at {co} who can approve making one of your staff an admin',
		needReply: 'It is {cust3}, their operations director.',
		followups: [
			["If one of our people is an admin in the customer's organization, does that take a seat?", "Yes, like any member who signs in. Many partners accept one seat per customer as the cost of doing their admin; some pass it on."],
			["Can the customer see what our admin does there?", "Yes. Fernhill settings keep a log of invitations and removals, with who made each change, and the customer's owner can read it at any time."],
			["Can a customer limit what our admin is allowed to do?", "Only by role. An admin can invite and remove people and change their roles, but cannot change the plan or close the organization; those stay with the owner and with you as the partner."]
		],
		endings: {
			answered: "The usual way is for the customer's owner to make one of your staff an admin in their organization. From then on that person can invite and remove people in Fernhill settings, under People, without involving the customer. Many partners set this up for every customer they look after.",
			declined: "We will not be adding invitations to the console. Who can sign in to a customer's organization is the customer's decision, and the admin role already lets a customer hand that to you.",
			planned: 'Inviting people from the Members page, for partners the customer has authorised, is planned for {when}. It needs a consent step on the customer\'s side, which is why it is not quick.'
		}
	},
	{
		area: 'members',
		asks: [
			["Customer's owner has left", "The only owner of {co}'s organization left the company last month and nobody there can change anything now. The Members page still shows the person who left as Owner. Can you make {cust} the owner instead?"],
			['No owner left at {co}', 'Since {cust3} left {co}, nobody there has the rights to manage Fernhill: {cust3} was their only owner. How do we get {cust} made owner instead?'],
			["Owner needed for {co}", "We have a problem at {co}: the person who set up their Fernhill organization has left, and was the only owner. Nobody can add or remove people now. What can be done?"]
		],
		details: [
			'The person who left is not answering emails, which is understandable.',
			"{co}'s director has asked us to sort it out this week.",
			'They cannot add their two new starters until someone has the rights.',
			"They are a small firm, so there is no IT department to fall back on.",
			"We have the customer's permission in writing for most things, but not for this specifically."
		],
		explain: ['When the current owner cannot hand over, changing the owner is an ownership recovery. To protect the customer, Fernhill customer support handles it, with a written confirmation from someone who can sign for the customer.'],
		probe: [['Who at {co} can confirm this in writing? It needs to be a director or someone who signs contracts.', 'Their managing director, {cust2}. I will ask.']],
		customer: "Hello, {cust3} has left us and none of us can get into the Fernhill settings. Can you make {cust} the owner please? It's quite urgent as we cannot add our new starters.",
		art: ['members', 'email'],
		team: ['support', 'ownership recovery needs checks with the customer that only they make'],
		need: 'a written confirmation from a director of {co}',
		needReply: '{cust2} has signed the letter; it is attached.',
		followups: [
			["How long does an ownership recovery usually take?", "Usually two or three working days once customer support has the written confirmation. Most of that is waiting for the customer to answer the verification call."],
			["Will the person who left be removed at the same time?", "Only if the customer asks for it in the same confirmation. Otherwise they stay as a member until the new owner removes them."],
			["Can there be more than one owner, so this does not happen again?", "Yes. An organization can have several owners, and we recommend at least two. Any owner can add another in Fernhill settings."]
		],
		quick: 'That one needs customer support: when the only owner has left, making someone else owner is an ownership recovery, and they need a written confirmation from a director of the customer. I have passed it to them, and they will contact you directly.',
		endings: {
			fixed: "Customer support finished the ownership recovery this morning. {cust} is now the owner of {co}'s organization, and the Members page shows it.",
			declined: "Customer support cannot go ahead: the confirmation came from an address outside {co}'s own domain, and they only act on a confirmation from the customer directly. Please ask {co} to contact Fernhill support themselves."
		}
	},
	{
		area: 'members',
		asks: [
			['Leavers still listed', 'Three people left {co} in {month} but the Members page still lists them, so I assume we are still paying for them. How do we get them off?'],
			['Remove a member', 'Can we remove someone from a customer\'s organization through the console? {cust} left {co} weeks ago and is still on the list.'],
			["People who left {co}", "{co} tells us {k} people have left since the summer, and they are all still on the Members page. Can we take them off from our side?"]
		],
		details: [
			'We have had to chase customers about leavers before; they always forget.',
			'One of them was let go, so the customer would like the access gone quickly.',
			'Their office manager says she removed them from everything else on the day they left.',
			"The customer thinks that because they closed the email accounts, the Fernhill access went with them.",
			"We would like to be able to tell customers what keeping leavers costs them each month."
		],
		explain: ['The Members page shows everyone who can still sign in to the organization, so people who have left but were never removed are still users and still take a seat. Removing them is done in the customer\'s Fernhill settings.'],
		art: ['members'],
		team: ['billing', 'they can credit seats that stayed in use because of a delay on our side'],
		need: 'the names of the people who left and the dates they left',
		needReply: '{cust} and {cust2}, both on the {d} of {month}.',
		followups: [
			["Do we pay for leavers for the whole month if they are removed late?", "Seats are counted per day, and the invoice takes the busiest day of the month, so a leaver removed on the 20th still counts if the busiest day came before that."],
			["Is there a list of people who have not signed in for months?", "Not in the console today. The customer's owner can sort people by their last sign-in in Fernhill settings."],
			["If a leaver is removed, are their files deleted?", "Not straight away. Their files stay with the organization for 30 days, and an owner can hand them to someone else in that time."]
		],
		reply: ['report'],
		endings: {
			answered: 'Once an owner or admin at {co} removes them in Fernhill settings, under People, they drop off the Members page straight away and stop counting the next day. If one of your staff is an admin there, they can do it themselves.',
			declined: 'We will keep removals with the customer. Taking someone\'s access away is too important to do from the partner side without the customer having a say.',
			planned: 'Removing members from the console, for partners who are admins in the customer\'s organization, is planned alongside invitations, for {when}.'
		}
	},
	{
		area: 'members',
		asks: [
			['Who is actually using it?', '{co} wants to cut seats and asked which people have not used Fernhill for a while. The Members page shows names and roles, nothing about activity. Can we see when people last signed in?'],
			['Last sign-in dates', 'Is there any way to see when members last signed in, from the console? We do a licence review with every customer once a year and this is the first thing they ask.'],
			["Inactive users", "Our biggest customer, {co}, is questioning their seat count. They think several people never use Fernhill. Can the console tell us who has not signed in recently?"]
		],
		details: [
			"We think about a quarter of {co}'s seats belong to people who never use it.",
			'We would use it at every renewal.',
			'At the moment we ask the customer to look it up, and half of them do not know where.',
			"Last year we found eleven seats belonging to people who had left {co} long before.",
			"Even a rough date would do. We are looking for months, not days."
		],
		explain: ['You are not the first to ask, and the console team has been working on exactly this.'],
		art: ['members'],
		followups: [
			["Will it be on the dashboard as well?", "No, on the Members page, next to each member's role."],
			["Will the customer see the same date in Fernhill settings?", "Yes. It is the same date, taken from the same place, so you and the customer will not be arguing over two numbers."],
			["Will the date include signing in on the phone app?", "Yes. Any sign-in counts, whether from the web, the desktop app or the phone app."]
		],
		endings: {
			planned: 'The Members page will show when each member was last active. It is built and goes out with the next console release, so you should see it within a few weeks.',
			answered: "Until the console shows it, the customer's owner can see each person's last sign-in in Fernhill settings, under People, sorted by date. That is where most partners look today.",
			withdrawn: '{co} did their review through Fernhill settings in the end, so we no longer need this in a hurry. Happy for you to close it.'
		}
	},
	{
		area: 'outside the console',
		asks: [
			['Upgrade for {co}', '{co} wants to move from {plan} to {plan2} from next month. I looked for a way to change the plan in the console but the plan column is just text. What is the process?'],
			['Changing a plan', '{co} is changing plan. Do I change that somewhere myself, and when does the new price start?'],
			["Plan for {co}", "{co} has outgrown {plan} and would like {plan2}. Can I switch them over from the console, or does it go through you?"]
		],
		details: [
			'They want it in place before their new financial year starts on the 1st.',
			'They have {n} seats, so the price difference is not small for them.',
			'I have the signed quote from the customer if you need it.',
			"Their finance team wants to know the new monthly cost before they sign anything.",
			"We have not changed a plan since the new partner portal came in, so I have lost track of the process."
		],
		explain: ['Plan changes are not made in the console. They are an order on your partner agreement, and the console shows the new plan from the day it starts.'],
		clause: '7.3 Plan changes. The Partner may change the plan of a Customer Organization by submitting an order. Changes received by the 25th day of a month apply from the first day of the following month.',
		art: ['orgs', 'clause'],
		team: ['contracts', 'plan changes are orders on the partner agreement'],
		need: 'the date the customer wants the change to start',
		needReply: 'The 1st of next month, please.',
		followups: [
			["Do the seats carry over as they are?", "Yes. Nothing changes for the people in the organization; only the plan changes, with the price from the day the change starts."],
			["Can a plan change start in the middle of a month?", "Not normally. Changes start on the 1st so that each invoice has one plan per organization. Partner contracts can make an exception for an upgrade if the customer needs it sooner."],
			["Does a downgrade need notice?", "A downgrade follows the same rule as an upgrade: in by the 25th, starting on the 1st. The customer keeps their data, but the features of the higher plan stop on that day."]
		],
		endings: {
			answered: 'You can do it yourself with the plan change form in the partner portal, under Orders. Changes received before the 25th start on the 1st of the next month, and the dashboard shows the new plan from that day.',
			fixed: 'Done. Partner contracts have moved {co} to {plan2} from the 1st, and the dashboard will show the new plan from that date.',
			planned: "Changing a customer's plan from the dashboard is on the roadmap for {when}. Until then, the form in the partner portal is the way to do it."
		}
	},
	{
		area: 'outside the console',
		asks: [
			['Trial for {co}', '{co} started a trial on {date3} and it ends this Friday. They need two more weeks: their IT lead has been off sick and nobody else has looked at it. Can it be extended?'],
			['Extra time on a trial', 'Could we get a couple more weeks on the trial for {co}? They are keen, but their board only meets at the end of the month.'],
			["{co} trial running out", "The trial for {co} runs out shortly and they have not decided yet. Is there any way to give them more time?"]
		],
		details: [
			'If it lapses they would have to start again, and they have already imported their staff list.',
			'They are looking at {n} seats on {plan2} if it goes ahead.',
			'I would rather not lose this one; it came from a referral.',
			"Their trial organization already has the whole team in it, about {n} people.",
			"The customer would like to keep the setup they have built rather than start again."
		],
		explain: ['Trials last 30 days from the day the organization is created, which is the Customer since date on the dashboard.'],
		flags: { trial: true },
		art: ['orgs'],
		team: ['contracts', 'trial extensions are theirs to approve'],
		need: 'how long an extension the customer needs and why',
		needReply: 'Two weeks. Their board meets on the 28th.',
		followups: [
			["What happens to their data if the trial does end before they decide?", "The organization is suspended, not deleted. If they order within 30 days, it comes back exactly as it was."],
			["Can they order a plan for part of the team only?", "Yes. The order sets the plan, and the seats follow whoever is in the organization."],
			["Does a trial count towards our seats or our tier?", "No. Trial organizations are free, and they count towards neither your invoices nor your tier until an order is placed."]
		],
		endings: {
			answered: 'For a trial that is about to run out, the quickest route is the extension form in the partner portal, under Customers: one extension of up to 14 days is approved automatically. The dashboard keeps showing Trial until then.',
			fixed: 'Partner contracts have extended the trial for {co} by 14 days, to {date2}. The dashboard keeps showing Trial until then.',
			declined: 'Partner contracts will not extend this one: the organization has already had an extension, and the agreement allows one. The customer can still order a plan before the trial ends without losing anything.',
			planned: 'The dashboard will show the date each trial ends next to Trial, so you do not have to work it out. It is planned for {when}.'
		}
	},
	{
		area: 'dashboard',
		asks: [
			['{co}', '{co} shows as suspended on our dashboard this morning. The customer cannot sign in and nobody here suspended anything. What happened?'],
			['Suspended organizations', 'Two of our organizations changed to suspended overnight, {co} and {co2}. The dashboard gives no reason. Where do we find out why?'],
			["Customer cannot sign in", "{co} rang us this morning: nobody there can sign in to Fernhill. On our dashboard they show as suspended. We did not change anything. Can you tell us why?"]
		],
		details: [
			'They are a medical practice, so this needs sorting today.',
			'We paid our last invoice on time as far as I know.',
			'I have the customer on the other line.',
			"It is the first time one of ours has been suspended, so I do not know the process.",
			"The customer thinks it is a security problem and is quite worried."
		],
		explain: ['An organization is suspended when its trial ends without an order, when the account it sits under has an overdue invoice, or after a security hold. The dashboard shows the status but not which of these it was.'],
		probe: [['Was {co} on a trial?', 'I think so. It started in {month}.']],
		internal: ['{co}: trial ended on the {d}, no order placed. Suspended automatically.', 'Account shows an invoice as unpaid although the bank statement {first} sent shows the payment. Probably matched to the wrong invoice.'],
		flags: { suspended: true },
		art: ['orgs', 'invoice'],
		team: ['billing', 'the account shows an invoice as overdue'],
		need: 'the names of the organizations that were suspended',
		needReply: '{co} and {co2}.',
		followups: [
			["Do they lose anything while they are suspended?", "No. Nobody can sign in, but nothing is deleted, and everything is back as it was once the suspension is lifted."],
			["Will the customer get an email about it?", "The customer's owner gets an email on the day it happens. It names you as their partner and asks them to contact you."],
			["Can we suspend an organization ourselves, for example when a customer stops paying us?", "Yes, through partner contracts. It is not something the console can do."]
		],
		endings: {
			answered: '{co} was suspended because its trial ended without an order. Once you place the order in the partner portal it becomes active again within the hour, with all its data.',
			fixed: 'Billing found that a payment from {partner} had been matched to the wrong invoice, which made the account look overdue. They have corrected it and lifted the suspension; {co} is active again.',
			planned: 'The dashboard will show the reason next to each suspended organization, with the date it happened. It is on the roadmap for {when}.'
		}
	},
	{
		area: 'dashboard',
		asks: [
			['Seats over the year', 'For our quarterly reviews we need seats over the last twelve months for each account. The dashboard shows this month only. Could it show the whole year?'],
			['Usage over time', "Is there a view of seats by month anywhere? {co}'s finance director wants to see how they have grown since they joined."],
			["Seat history for {co}", "{co} wants a year of seat figures for their budget meeting. The dashboard only tells me this month. Where can I get the rest?"]
		],
		details: [
			'We piece it together from old invoices at the moment, which takes an afternoon a quarter.',
			'A simple table would do. It does not need to be a chart.',
			'Our customers like to see the trend more than the number.',
			"{co} is up for renewal and wants to see the last year before they commit to more seats.",
			"Our directors ask for a seat trend across all our customers every quarter."
		],
		explain: ['The dashboard shows seats in use this month. The monthly figures behind it go back to when each account started.'],
		art: ['usage'],
		followups: [
			["How far back do the figures go?", "To the day each organization was created under your account. For organizations moved from the old partner system, to March 2024."],
			["Are the monthly figures the busiest day or the last day?", "In the usage report, both: one column for the busiest day, which is what you are invoiced for, and one for the last day of the month, which is what the dashboard shows."],
			["Can the usage report be sent to us by email every month?", "Not yet; it has to be run from the partner portal each time."]
		],
		reply: ['report'],
		endings: {
			answered: 'The usage report in the partner portal can cover any range of months: choose Usage report, then the months you want. It gives seats per month for each organization, which most partners chart in a spreadsheet.',
			planned: 'A twelve-month view of seats is coming to the dashboard, with a switch between this month and the last year. It is planned for {when}.',
			declined: 'We have decided to keep the dashboard to the current month and leave history to the usage reports in the partner portal, which already cover any range of months.'
		}
	},
	{
		area: 'dashboard',
		asks: [
			['Clicking an organization', "Clicking a row in the organizations table does nothing. I expected to see that organization's people and seats. Is that coming?"],
			['People per organization', "The Members page shows the account's people, but we need to see who belongs to which customer organization. Could the dashboard open an organization's own page?"],
			["Organization page", "When a customer rings, I would like to open their organization in the console and see their people and seats in one place. Today the dashboard row is all there is. Is anything like that planned?"]
		],
		details: [
			'When a customer rings, the first thing we want is their own page, not the whole account.',
			'With {k2} organizations on one account, the Members page is a long list.',
			'We used to have this in the old partner system.',
			"At the moment we look the customer up in three places to answer one question.",
			"Even a page with the members and the seats of one organization would cover most of what we need."
		],
		explain: ['Today the organizations table is a summary, and the Members page lists the people on the account picked in the header.'],
		art: ['orgs', 'members'],
		followups: [
			["Would an organization page show the customer's billing as well?", "No. Billing stays in the partner portal; the console shows what is in use."],
			["Could we link to an organization from our own systems?", "If an organization page comes, it will have its own address, so yes."],
			["Would it show the customer's own contact details?", "That is not decided. The owner's name and email address are the most likely, as partners ask for those most."]
		],
		endings: {
			planned: "An organization page, opened from the dashboard, with the organization's members, plan and seat history, is the next big piece of console work, planned for {when}.",
			declined: "We will not add a separate organization page for now. The customer's own Fernhill settings show all of this, and we want the console to stay a summary for partners.",
			withdrawn: 'We have moved {co} and the other big ones onto accounts of their own, which solves it for us. You can close this.'
		}
	},
	{
		area: 'dashboard',
		asks: [
			['Sorting the organizations table', 'Could the organizations table be sorted by seats? I want our biggest customers at the top when I go through it with our directors.'],
			['Order of organizations', 'In what order does the dashboard list organizations? It is not alphabetical, and not by date as far as I can tell.'],
			["Biggest customers first", "Our directors want to see our largest Fernhill customers first. Can the organizations table on the dashboard be put in order of seats?"]
		],
		details: [
			'Clicking the column headings does nothing, which is what I tried first.',
			'We have {k2} organizations, so it matters.',
			'Alphabetical would already be better than what it is now.',
			"Our directors want the ten biggest customers on one screen.",
			"When a customer rings, we look for them by name, which is slow in a long table."
		],
		explain: ['The table lists organizations in the order they were added to the account.'],
		art: ['orgs'],
		followups: [
			["Is there a way to search the table?", "The browser's own find (Ctrl+F, or Cmd+F on a Mac) works on the table, and it is what most partners use."],
			["Does the order change when a customer renames itself?", "No. The order is the order they were added, whatever they are called now."],
			["Are new organizations always added at the bottom?", "Yes. A new organization goes to the end of the table on the day it is created."]
		],
		endings: {
			answered: 'They are listed in the order they were added to the account, oldest first, so the Customer since column runs in order too. Within a day, the earliest added comes first.',
			planned: 'Sortable columns on the organizations table are planned for {when}. Click a heading to sort by it, click again to reverse.',
			declined: 'We will not add sorting to the table for now, as the usage report in the partner portal can be sorted any way you like in a spreadsheet.'
		}
	},
	{
		area: 'sign-in',
		asks: [
			['Single sign-on for the console', 'We use Microsoft Entra ID for everything and would like our staff to sign in to the partner console with it. Is that possible?'],
			['Google sign-in', 'Can partner staff sign in with Google Workspace accounts? Our security policy now wants one sign-in for every tool we use.'],
			["Signing in with our company accounts", "Our security team has asked whether we can sign in to the Fernhill partner console with our company accounts instead of separate passwords. Is that supported?"]
		],
		details: [
			'Our cyber insurance renewal asks about it.',
			'Removing leavers from one place is the main reason.',
			'We have {k2} people with console logins.',
			"Every other tool we use for customer admin is already on Entra.",
			"We had a scare last year when a leaver kept a login for a month."
		],
		explain: ["Partner staff sign in to the console with the partner portal's own logins today."],
		probe: [['Which identity provider, and do you need just sign-in or also automatic removal of leavers?', 'Removal of leavers matters more than sign-in, honestly.']],
		team: ['security', 'they run the single sign-on pilot'],
		need: 'the name of your identity provider and a technical contact',
		needReply: 'Entra ID. The contact is {contact}, me.',
		followups: [
			["Would it work with our conditional access rules?", "Single sign-on would hand sign-in to your identity provider, so its rules would apply as they do for your other tools."],
			["In the meantime, can we see a list of our console logins?", "Your partner admin can see every login, with its last sign-in, in the partner portal under Team."],
			["Would existing logins keep working during a pilot?", "Yes. Password logins would stay as they are until each partner chooses to switch."]
		],
		art: ['team'],
		endings: {
			planned: 'Single sign-on for the partner console, starting with Entra ID and Google Workspace, is planned for {when}. We will contact the partners who asked when the pilot opens.',
			declined: 'Single sign-on for partners is not planned in the near term. The portal supports two-step verification on every login, and we recommend turning it on for everyone.'
		}
	},
	{
		area: 'sign-in',
		asks: [
			['More logins', 'Four of us share one login to the console because I was told there is one per partner. Can we have a login each?'],
			['Staff logins', 'One of our engineers left last week and we realised he knew the shared console password. How do we set up separate logins?'],
			["Separate logins for the team", "Our team still shares one console login from when we started with Fernhill. Our auditor has told us to stop. How do we get individual logins?"]
		],
		details: [
			'We have changed the password, but it is the third time this year.',
			'Our auditors flagged the shared login.',
			'Two of the four only need to look at {acct2}.',
			"The shared login is in our password manager, which at least means we know who has it.",
			"We were told about the one-login rule by someone at Fernhill a few years ago."
		],
		explain: ['There is no limit of one login per partner. That was true of the old partner system, but not of the portal and the console.'],
		team: ['contracts', 'they can confirm who your partner admin is'],
		need: 'the names and email addresses of the people who need logins',
		needReply: 'The list is below. All four are at @{domain}.',
		followups: [
			["Is there a charge for extra logins?", "No. Logins to the portal and the console are free, however many you need."],
			["Can a login see the console but not the invoices?", "Yes. The partner admin can give each login access to invoices or not, in the partner portal under Team."],
			["Can a login be shared between two people on different shifts?", "Technically yes, but we ask partners not to: the sign-in history then cannot tell you who did what."]
		],
		art: ['team'],
		endings: {
			answered: 'Your partner admin can add a login for each person in the partner portal, under Team. Each person gets their own invitation and their own password, and you can switch off the shared login afterwards.',
			fixed: 'Partner support has created the four logins and switched off the shared one. Each person will have had an invitation by email.'
		}
	},
	{
		area: 'sign-in',
		asks: [
			['Wrong email in the header', 'My email address changed in the spring, but the console header still shows my old one, {oldemail}. Where do I update it?'],
			['Our domain has changed', 'Our company domain changed from {formerDomain} to {domain}. The console header still shows the old addresses for all of us.'],
			["Changing the address on my login", "My email address has changed, but the console still shows {oldemail} at the top. How do I get it updated?"]
		],
		details: [
			'Invoices still come to the old address too, which is forwarding for now.',
			'The old domain expires at the end of the year.',
			'I tried the profile page in the portal but the field is greyed out.',
			"Password reset emails still go to my old address too, which worries me a little.",
			"There are seven of us with console logins."
		],
		explain: ['The address in the console header is the one on your partner portal login.'],
		flags: { oldEmail: true },
		art: ['screen'],
		need: 'the old and new addresses for each login',
		needReply: 'We are all moving to @{domain}. The old addresses are the same names at @{formerDomain}.',
		followups: [
			["Will changing the address sign me out?", "No. You stay signed in, and the header changes the next time you sign in."],
			["Will our invoices go to the new address as well?", "Invoices go to the billing contact on the partner agreement, which is separate from your login. Partner contracts can change it."],
			["Can the username be changed too?", "No. The username is fixed when the login is created. If it has to change, partner support can create a new login and close the old one."]
		],
		reply: ['team'],
		endings: {
			answered: 'You can change it yourself in the partner portal, under Profile, then Email address. The greyed-out field is the username, which stays the same; the address is the line below it. The console header changes the next time you sign in.',
			fixed: 'Partner support has changed the addresses on all your logins to @{domain}. The console header shows the new ones from your next sign-in.'
		}
	},
	{
		area: 'sign-in',
		asks: [
			['Signed out all the time', 'The console signs me out after about half an hour if I am working in another tab. I lose my place and have to sign in again, four or five times a day.'],
			['How long does a session last?', 'How long does a console session last? Our service desk keeps the console open all day on a second screen.'],
			["Console session too short", "The console keeps signing my colleagues out during the day. Is there a setting to make sessions last longer?"]
		],
		details: [
			'Two-step verification every time makes it worse.',
			'The partner portal does the same, but I am in the console far more.',
			'Our own tools keep us signed in for a working day.',
			"I usually notice when I come back from a phone call with a customer.",
			"We would accept a longer session on our own office machines only."
		],
		explain: ['Console sessions end after 30 minutes without activity, like the partner portal. That is our security policy for partner tools, because they show customer data.'],
		team: ['security', 'session lengths are part of their policy'],
		followups: [
			["Does the 30 minutes apply to everyone, or can our admin change it?", "It is the same for everyone today. Partner admins cannot change it."],
			["Does having the console open in a background tab count as activity?", "No. Only clicking or typing in the console starts the 30 minutes again."],
			["Is the 30 minutes the same on the partner portal?", "Yes. The portal and the console share one session."]
		],
		reply: ['team'],
		endings: {
			declined: 'Security have reviewed it and will keep the 30 minutes for now. The console shows customer data, and most partners use it on shared machines.',
			answered: 'Tick "Keep me signed in on this device" when you sign in. On that device the session then lasts twelve hours, as long as you do not sign out.',
			planned: 'Partner admins will be able to choose a longer session length for their own staff, up to a working day, from {when}.'
		}
	},
	{
		area: 'outside the console',
		asks: [
			['Invoice per customer', 'We would like the monthly invoice split per customer organization, so we can pass the cost straight on. At the moment it is one total per account.'],
			['Reading the invoice', 'I cannot match the invoice lines to our customers. Some lines have organization names we do not recognise at all.'],
			["Invoice layout", "Our accounts team struggles with the monthly invoice: they need the cost per customer to bill them, and they cannot see it at a glance. Can the invoice be laid out differently?"]
		],
		details: [
			'Our accounts team spends a day a month on this.',
			'The lines I do not recognise are small, two or three seats each.',
			'Our accounting system wants one bill per customer.',
			"We pass most costs on at the same price plus a margin, organization by organization.",
			"Our previous distributor sent one invoice per customer, and we built our process around it."
		],
		explain: ['Invoices are produced per account, with a line for each organization under it.'],
		art: ['invoice'],
		team: ['billing', 'the invoice layout is theirs'],
		need: 'the invoice number',
		needReply: 'It is {invoice}.',
		followups: [
			["Can the invoice show our own reference for each customer?", "Not today. The organization name is the only reference on each line."],
			["Could invoices go to a second email address?", "Yes: partner contracts can add a second billing contact to your agreement."],
			["Can we get invoices in our own currency?", "Invoices are in the currency on your partner agreement. It can be changed once a year, on your agreement's anniversary."]
		],
		reply: ['report'],
		endings: {
			answered: 'The invoice already has a line per organization, with its seats and amount, which is the split you need. The usage report next to each invoice in the partner portal has the same lines as a CSV, if that is easier to import.',
			fixed: 'The lines you did not recognise were demonstration organizations created by your previous account manager and never closed. Billing has closed them and credited the seats for the last three months.',
			declined: 'Billing will keep one invoice per account. Splitting it per organization would turn one invoice into dozens for most partners, and the lines on the current invoice already give the split.'
		}
	},
	{
		area: 'console as a whole',
		asks: [
			['Accessibility audit', '{co} is a public body and had all our tools audited for accessibility. The partner console came back with the findings below, and they need a response with dates before they renew.'],
			['Accessibility findings from {co}', '{co} has sent us the findings of an accessibility review of the tools we give their staff, the partner console among them. They want to know what Fernhill will fix, and by when. The findings are below.'],
			["Accessibility of the console", "{co} has asked us for an accessibility statement covering the partner console, as part of their renewal. Their own audit found some problems, listed below. What can we tell them?"]
		],
		details: [
			'They renew in {month2}, and the audit is part of the tender.',
			'The auditors used NVDA with Firefox and VoiceOver with Safari.',
			'Their procurement team will not sign the renewal without an answer.',
			"The auditors were thorough and fair; a good part of what they found is in the partner portal.",
			"We have been asked for a named contact at Fernhill for accessibility."
		],
		explain: ['Thanks for sending the findings in full. Some of them are about the partner portal rather than the console, so I have split them up.'],
		notes: ['We have been through the list. The page title and the focus outline are quick; the table caption and the header layout at large text sizes need a bit of design work.'],
		art: ['audit'],
		need: 'the full audit report, so the console team can see the method used',
		needReply: 'The full report is attached.',
		followups: [
			["Is there a published accessibility statement we can point the customer to?", "There is one for the Fernhill app. The console does not have its own yet."],
			["Can we send you the findings in their original format?", "Please do. The console team prefers the auditors' own spreadsheet to a summary."],
			["Does the console work with screen magnifiers?", "Yes, as far as our own testing goes. The header is the part that suffers most at large sizes, which the auditors also found."]
		],
		endings: {
			planned: 'The console team will fix every finding rated high or medium by {when}, and we will publish an accessibility statement for the console at the same time. I can send {co} a letter confirming that.',
			answered: 'Most of the findings rated high are in the partner portal, not the console, and the portal team fixed them in their last release. The console findings are rated medium or low, and none of them stops someone using the console with a screen reader. I have written that up as a letter {co} can file with the audit.',
			declined: 'We cannot commit to dates for individual partner audits. We will publish an accessibility statement for the console that lists known issues, and {co} is welcome to cite it.'
		}
	},
	{
		area: 'dashboard',
		asks: [
			['Printing the dashboard', 'When I print the dashboard for a customer meeting, the organizations table is cut off on the right and the header takes half of the first page.'],
			['PDF of the dashboard', 'Is there a way to get a tidy PDF of the dashboard? Ours come out with the columns cut off.'],
			["Print layout", "Is there a printable version of the dashboard? When I print it, the right-hand side of the table is missing."]
		],
		details: [
			'Some of our customers still like paper in meetings.',
			'It is the Customer since column that goes missing.',
			'We have tried Chrome and Edge, same result.',
			"We print the dashboard once a quarter for each account, for our own board.",
			"The seats line at the top prints fine; it is the table that suffers."
		],
		explain: ['The console has no print layout of its own yet, so the browser prints the page as it is on screen.'],
		art: ['screen'],
		followups: [
			["Would saving as PDF from the browser work any better?", "It uses the same layout as printing, so the same settings apply."],
			["Is there a way to leave the header off when printing?", "Not today; the print dialog's own options are the only control."],
			["Does it print better from Firefox?", "Firefox shrinks the page to fit by default, so the table usually fits, but the header still takes up a lot of the first page."]
		],
		endings: {
			answered: 'In the print dialog, choose landscape and, under More settings, set the scale to "Fit to page width". The whole table then fits, and the header shrinks to one line.',
			planned: 'A print layout for the dashboard, with the header reduced to the account name and the date, is planned for {when}.',
			withdrawn: 'We have started sending the usage report instead of a printout, and the customers prefer it. You can close this.'
		}
	},
	{
		area: 'account switcher',
		asks: [
			['Console on a phone', 'On my phone the header of the console is a mess: the account list, the page links and my email address overlap, and I cannot reach the Members link.'],
			['Using the console on a tablet', 'Our engineers carry tablets on site. In portrait the account list covers the page links.'],
			["Mobile view", "Could the console be made usable on a phone? Our engineers check it on the road and the top of the page is unreadable."]
		],
		details: [
			'I only need it on the phone when a customer rings while I am out.',
			'Landscape is a bit better but still cramped.',
			'It happens on both Android and iPhone.',
			"Our on-call engineer only has a phone in the evenings.",
			"The dashboard table scrolls sideways, which is fine; it is the header that is the problem."
		],
		explain: ['The console is laid out for desktop screens, and the header does not wrap on narrow ones.'],
		art: ['screen'],
		followups: [
			["Is there a Fernhill app for partners?", "No. The Fernhill app is for customers; partners use the console in a browser."],
			["Does it look any better in a particular browser?", "It looks the same in all of them, as the layout is the same."],
			["Can we add the console to the phone's home screen?", "You can add the page as a shortcut, but it opens with the same layout as the browser does."]
		],
		endings: {
			planned: 'A header that fits on phones and tablets, with the account list on its own line, is planned for {when}.',
			declined: 'We have decided to keep the console a desktop tool for now. Fewer than two per cent of sessions come from phones.',
			answered: 'Until the header is reworked, turn the phone or tablet sideways: from about 800 pixels wide, the account list, the links and the email address fit on one line.',
			withdrawn: 'We have given the engineers laptops, so this no longer bothers us. Feel free to close it.'
		}
	},
	{
		area: 'outside the console',
		asks: [
			['Where is customer data stored?', '{co} is asking where their data is stored and whether it leaves the EU. They also want a copy of the data processing agreement.'],
			['Security questionnaire', 'A prospective customer, {co}, sent us a long security questionnaire about Fernhill. Can someone at Fernhill fill it in?'],
			["Data location question from {co}", "{co}'s data protection officer wants to know which countries their Fernhill data is held in, and asked for the processing agreement. Who at Fernhill can answer?"]
		],
		details: [
			'They are in healthcare, so they are careful.',
			'Their deadline is the end of next week.',
			'It is the biggest deal we have had this year.',
			"{co} has a new data protection officer who is going through all their suppliers.",
			"They also asked whether Fernhill staff can see their files."
		],
		explain: ['Questions about where data is kept and how it is protected go to our security and compliance team, who keep the standard answers.'],
		customer: 'Hi {first}, before we sign we need to know where Fernhill keeps our data and who can see it. Our data protection officer has asked for the DPA as well. Can you send these over?',
		art: ['email'],
		team: ['security', 'they keep the standard answers and the agreement'],
		need: 'the questionnaire itself, as a file',
		needReply: 'Attached, all 90 questions.',
		followups: [
			["Can Fernhill staff see customer data?", "Only customer support, only when the customer asks for help, and every access is logged. The security answers in the partner portal describe it."],
			["Is there a certificate we can send?", "Our ISO 27001 certificate is in the partner portal, under Legal, next to the data processing agreement."],
			["Do backups stay in the EU as well?", "Yes. Backups are kept in the same two regions as the data itself."]
		],
		endings: {
			answered: 'Data for organizations in the EU and the UK is kept in Frankfurt and Dublin and does not leave the EU. The data processing agreement and our standard security answers are in the partner portal, under Legal, and you are welcome to send them to {co}.',
			fixed: 'Security have filled in the questionnaire and sent it to you by email. Most answers were standard; they added a note on two questions that were about the customer\'s own setup.'
		}
	},
	{
		area: 'console as a whole',
		asks: [
			['Console in German?', 'Is a German version of the console planned? Our team is fine with English, but we would like to show it to customers.'],
			['French', 'Several of our customers would like to use the console in French when we share it with them. Is that on the cards?'],
			["Console languages", "Is the console available in any language other than English? A few of our customers in {city} would find it much easier in their own."]
		],
		details: [
			'The Fernhill app itself is translated, so customers are surprised that the console is not.',
			'Only the labels would need translating; the organization names are already in the right language.',
			'We would happily check a translation for you.',
			"Some of our older customers do not read English comfortably.",
			"We translate our own screenshots for training material at the moment."
		],
		explain: ['The console is in English only at the moment.'],
		followups: [
			["Would the organization names be translated too?", "No. Names stay as the customer wrote them; only the console's own words would change."],
			["Which languages are asked for most?", "German, French and Dutch, in that order, going by the tickets we have."],
			["Would translations cover the partner portal as well?", "The portal team has plans of its own; the console would come first."]
		],
		art: ['screen'],
		endings: {
			planned: 'Translations of the console, starting with German, French and Dutch, are planned for {when}. If you would like to check a translation before it goes out, tell me and I will put you on the list.',
			declined: 'We have no plans to translate the console. It is a tool for partner staff, and we would rather put the time into features partners ask for more often.'
		}
	},
	{
		area: 'console as a whole',
		asks: [
			['Our logo in the console', 'Could we put our own logo in the console header? We share our screen with customers and would like it to look like ours.'],
			['White label', 'Is there a white-label version of the partner console? Some customers do not know we resell Fernhill.'],
			["Co-branding", "We would like the console to show our branding when we share our screen with customers. Is that possible for partners?"]
		],
		details: [
			'Our own portal is blue and orange, so the change of look is jarring.',
			'A logo would be enough; we do not need our own domain.',
			'Two of our competitors offer this.',
			"We are a Silver partner, if that makes a difference.",
			"We would also like our own support details on the page."
		],
		explain: ['The console looks the same for all partners today.'],
		team: ['contracts', 'co-branding is part of the Gold partner tier'],
		followups: [
			["What does the Gold tier need?", "At least 2,000 seats under management and a named Fernhill specialist on your team. Partner contracts have the details."],
			["Could we at least change the name in the browser tab?", "Not today. It says Fernhill partner console for everyone."],
			["Is there a co-branded version of the emails customers get?", "On the Gold tier, customer emails can carry the partner's name in the footer. The logo stays Fernhill's."]
		],
		art: ['screen'],
		endings: {
			declined: 'We will not be offering a white-label console. Customers see Fernhill in the app every day, and we want the console to match what they know.',
			planned: 'Partners on the Gold tier will be able to show their logo in the console header, from {when}.'
		}
	},
	{
		area: 'dashboard',
		asks: [
			['Customer since dates are all the same', 'Every organization we moved over from the old partner system shows Customer since {migdate}. Some of them have been with us since 2019. Can the real dates be put back?'],
			['Wrong start dates', 'The Customer since dates on our dashboard look wrong for our oldest customers. They all show the same day in March 2024.'],
			["Start dates after the migration", "Our oldest customers all have the same Customer since date, {migdate}, which is when we moved to the new partner system. Can you put back the dates they actually joined?"]
		],
		details: [
			'We use the dates for long-service discounts, so they matter.',
			'Our own records go back to 2017 if that helps.',
			'Customers have noticed in our quarterly reviews.',
			"Our long-service discount starts at five years, so the dates decide what customers pay us.",
			"Two customers have already asked why we say they joined in 2024."
		],
		explain: ['The organizations moved from the old partner system in March 2024 took the date of the move as their start date.'],
		flags: { migrated: true },
		art: ['orgs'],
		team: ['data', 'they hold the records from the old partner system'],
		need: 'a list of the organizations with the dates you believe are right',
		needReply: 'The list is below, from our CRM.',
		followups: [
			["Does the wrong date affect anything at Fernhill, like our tier?", "No. Your tier is worked out from seats, not from how long customers have been with you."],
			["Will the invoices change if the dates change?", "No. The start date is only shown on the dashboard; it plays no part in billing."],
			["Can we see the date an organization moved to us, as well as when it started?", "Not in the console. Partner contracts keep the transfer dates and can send you a list."]
		],
		endings: {
			fixed: 'The data team has restored the original start dates for the organizations that came from the old partner system, using its records. The dashboard shows them now.',
			declined: 'The data team tells me the old partner system did not keep start dates before 2021, so they cannot restore them reliably. The dates will stay as they are.'
		}
	},
	{
		area: 'outside the console',
		asks: [
			['New customer moving from another reseller', '{co} is leaving their current reseller and joining us from the 1st. How do we get their organization onto our account without them losing anything?'],
			['Transfer an organization', 'We have won {co} from another Fernhill partner. Their organization does not show on our dashboard yet. What happens next?'],
			["Taking over {co}", "We are taking over {co} from another reseller at the end of the month. What do we have to do so their organization moves to our account?"]
		],
		details: [
			'They have {n} seats on {plan}.',
			'Their old reseller knows and is being reasonable about it.',
			'They are worried about losing their history.',
			"We have never taken over an organization from another partner before.",
			"The customer is worried about their people having to set everything up again."
		],
		explain: ['Moving an organization between partners is a transfer. Nothing in the organization changes for the customer; it moves to your account on the agreed date.'],
		clause: '9.2 Transfers. A Customer Organization may be transferred to another partner on receipt of a letter of authority signed by the Customer, from the first day of the following month.',
		art: ['clause', 'email'],
		customer: 'Hi {first}, we have given notice to our current supplier and would like you to take over Fernhill from the 1st. What do you need from us?',
		team: ['contracts', 'transfers need a letter of authority from the customer'],
		need: 'the signed letter of authority from {co}',
		needReply: 'Signed letter attached.',
		followups: [
			["Do the customer's people need to do anything?", "No. Nobody in the organization notices the transfer; only the partner changes."],
			["Will the old reseller still see them on their dashboard?", "Until the transfer date, yes. From that date they appear on yours and disappear from theirs."],
			["Does the customer's price change when they move to us?", "Their plan stays the same, and what they pay you is up to you. What you pay us follows your own tier from the transfer date."]
		],
		endings: {
			fixed: 'The transfer is complete. {co} now shows on the {acct} dashboard with all its members and history.',
			declined: "The transfer cannot go ahead before their current agreement ends, which is not until {month2}. Partner contracts will move it then, if the customer still wants to."
		}
	},
	{
		area: 'outside the console',
		asks: [
			['Two organizations for one customer', '{co} ended up with two organizations: one their owner set up directly, one we created through the ordering form. Can they be merged?'],
			['Duplicate organization', 'There are two rows for {co} on our dashboard. Only one is in use. What do we do with the other?'],
			["{co} appears twice", "{co} appears twice on our dashboard, once with most of their people and once with a handful. Can the two be joined together?"]
		],
		details: [
			'Some of their people are in one, some in the other.',
			'We are probably being billed for both.',
			'Nobody remembers who created the second one.',
			"The owner thinks all their people are in one organization and was surprised to hear there are two.",
			"The second organization was created on the day we placed their order."
		],
		explain: ['Organizations cannot be merged as such, but people can be moved from one to the other, and the empty one closed.'],
		art: ['orgs'],
		team: ['support', 'they can move people and close the duplicate'],
		need: 'which of the two organizations the customer wants to keep',
		needReply: 'The older one, please.',
		followups: [
			["Are we paying for both?", "Seats are counted in each organization separately, so anyone who has signed in to both counts twice."],
			["Will the people in the closed one lose their files?", "Not if they are moved first. Moving a person brings their data with them."],
			["How do we stop this happening with the next customer?", "Ask the customer before placing an order whether they already have an organization. The ordering form now asks the same question."]
		],
		endings: {
			answered: "An owner of the organization they keep can invite the people from the other one in Fernhill settings; each person accepts and their account moves with their data. When the other organization is empty, ask partner contracts to close it and it drops off your dashboard.",
			fixed: 'Customer support has moved everyone into the older organization and closed the other. The dashboard shows one row for {co} now, and billing will credit the seats counted twice.',
			declined: 'Customer support cannot move the people for the customer, as each person has to accept the move themselves. The customer\'s owner needs to invite them from Fernhill settings.'
		}
	},
	{
		area: 'outside the console',
		asks: [
			['Warn us before trials end', 'We keep finding out that a customer\'s trial has ended when they ring us because they cannot sign in. Could we get an email a few days before a trial ends?'],
			['Notifications', 'Are there any email alerts for partners? I would like to know when an organization is suspended, before the customer tells me.'],
			["Alerts for trials and suspensions", "Is there a way for us to be told when a customer's trial is about to end, or when an organization is suspended? We only find out when the customer calls."]
		],
		details: [
			'It happened twice last month.',
			'We do not look at the dashboard every day.',
			'A weekly summary would be fine as well.',
			"The customer was not happy that we had not warned them.",
			"We would want these to go to our service desk mailbox rather than to one person."
		],
		explain: ['The console itself does not send emails; partner emails come from the partner portal.'],
		followups: [
			["Can partner emails go to a shared mailbox?", "Yes. The partner portal sends notifications to whichever address your partner admin sets, and a shared mailbox works."],
			["Do customers get warned themselves?", "The customer's owner gets an email seven days and one day before the trial ends."],
			["Can each of our staff choose which emails they get?", "Not yet. Notifications go to one address for the whole partner."]
		],
		art: ['orgs'],
		endings: {
			answered: 'The partner digest does this. Switch it on in the partner portal, under Notifications. It goes out every morning and lists trials ending within seven days and anything suspended the day before.',
			planned: 'Emails for trials ending and organizations suspended are planned for {when}, with a setting for who at the partner receives them.',
			declined: 'We will not add more partner emails for now. The digest in the partner portal covers trials ending, and suspensions show on the dashboard.'
		}
	},
	{
		area: 'sign-in',
		asks: [
			['Limit what a colleague can see', 'We have a new junior on the service desk who should only see {acct2}, not our other accounts. Can a login be limited to some accounts?'],
			['Logins per account', 'Our education team should only see the education account. Can we restrict their logins?'],
			["Restricting a login to one account", "Can a console login be limited to a single account? Our new hire works only on {acct2} and should not see the others."]
		],
		details: [
			'Our public sector contracts require it.',
			'At the moment everyone sees everything.',
			'It is three people.',
			"One of our accounts is for health customers, and the rules are stricter there.",
			"At the moment I ask people to stay out of the accounts they do not need, which is not much of a control."
		],
		explain: ['Which accounts a login can see is set on the login, in the partner portal.'],
		minAccounts: 2,
		team: ['contracts', 'they can confirm who your partner admin is'],
		followups: [
			["Would the restricted person still see the whole account list in the header?", "No. The list only shows the accounts their login can see."],
			["Can we see who looked at which account?", "Not today. The partner portal records sign-ins, not which account was looked at."],
			["Can a restricted login still see invoices?", "Only if the partner admin ticks Invoices for that login. It is off by default for new logins."]
		],
		art: ['team'],
		endings: {
			answered: 'Your partner admin can do this in the partner portal, under Team: choose the login and untick the accounts that person should not see. The account list in the console header then shows only the ones left.',
			planned: 'Read-only logins limited to chosen accounts, with an audit of who looked at what, are planned for {when}.'
		}
	},
	{
		area: 'dashboard',
		asks: [
			['Odd characters in organization names', 'Some organization names show up with &amp; in them on the dashboard, for example "{escaped}". The customer noticed it in a screenshot and was not impressed.'],
			['Names look broken', 'A few of our organizations have strange codes in their names on the dashboard. The names look fine in the customer\'s own Fernhill settings.'],
			["Organization names showing &amp;", "On our dashboard, \"{escaped}\" shows with &amp; in the middle instead of an ampersand. How do we fix that?"]
		],
		details: [
			'It is only organizations we set up last year.',
			'It looks the same in every browser we tried.',
			'Invoices show the names correctly.',
			"It is three or four organizations, as far as I can see.",
			"The customer thought we had misspelt their name."
		],
		explain: ['Those names were saved like that by the old ordering form, which stored the ampersand already encoded. The console shows the name exactly as it is stored.'],
		flags: { escaped: true },
		art: ['orgs'],
		team: ['data', 'they can correct the stored names'],
		need: 'the names of the organizations affected',
		needReply: 'The ones I have found are in the table below.',
		followups: [
			["Will renaming the organization change anything for the customer's people?", "No. They see the new name in the app; nothing else changes."],
			["Is it only ampersands?", "From what we have found, yes. The old ordering form encoded no other characters."],
			["Will the old name still show on past invoices?", "Past invoices keep the name as it was when they were issued. New invoices use the corrected name."]
		],
		endings: {
			fixed: 'The data team has corrected the names of every organization the old ordering form saved with an encoded ampersand, yours included. The dashboard shows them properly now.',
			answered: "The customer's owner can fix it straight away by renaming the organization in Fernhill settings, under Organization. The dashboard then shows the new name."
		}
	},
	{
		area: 'outside the console',
		asks: [
			['Price per seat went up?', 'Our {month} invoice shows {price} per seat for Growth, up from {oldprice}. Nobody told us about a price change.'],
			['Discount on the invoice', 'Our partner discount seems to have changed on the latest invoice. Was that intended?'],
			["Unit price change", "The unit price for Growth on our latest invoice went from {oldprice} to {price}. Was there an announcement I missed?"]
		],
		details: [
			'We have fixed prices with our customers for the year.',
			'Our seats under management went down a little after one big customer left.',
			'Is there a notice period for changes like this?',
			"We were not aware of any review.",
			"If it is a tier change, I would like to know what we need to get back up."
		],
		explain: ['Partner prices follow your partner tier, which is reviewed once a year on the number of seats you manage.'],
		art: ['invoice'],
		team: ['contracts', 'partner tiers and discounts are theirs'],
		need: 'the invoice number',
		needReply: 'It is {invoice}.',
		followups: [
			["When is the next tier review?", "Once a year, in the same month. The letter says how many seats you need for the next tier."],
			["Does a tier change apply to all our accounts?", "Yes. The tier belongs to the partner, so every account under your agreement moves together."],
			["Is the tier the same for all plans?", "Yes. The tier sets one discount, which applies to Starter, Growth and Enterprise alike."]
		],
		reply: ['report'],
		endings: {
			answered: 'Your tier was reviewed in {month2} on the seats you manage, and it moved down one step after a large customer left. That changes the discount from the next invoice. The letter went to your partner admin; I have attached a copy.',
			fixed: 'Billing applied the wrong tier to your account from {month}. It has been corrected, and a credit note for the difference will reach the partner portal this week.'
		}
	},
	{
		area: 'outside the console',
		asks: [
			['Customer leaving', '{co} has told us they will not renew. What do we need to do to close their organization, and what happens to their data?'],
			['Closing an organization', 'How do we close an organization for a customer who has stopped trading?'],
			["Closing {co}", "{co} is closing their office and will stop using Fernhill at the end of {month2}. What is the process to close their organization?"]
		],
		details: [
			'Their contract with us ends at the end of {month2}.',
			'They want a copy of their data before anything is deleted.',
			'They have been with us since 2021.',
			"They want to be sure nothing is deleted before they have their copy.",
			"They might come back next year if their new system does not work out."
		],
		explain: ["Closing an organization is a change to your partner agreement, so it goes through partner contracts. The customer's data is kept for 90 days after closing, and they can export it until then."],
		art: ['email'],
		customer: 'Hi {first}, as discussed, we will not be renewing Fernhill when our contract ends. Please let us know what we need to do to get a copy of our files before then.',
		team: ['contracts', 'closures are changes to the partner agreement'],
		need: 'the date the customer wants the organization closed',
		needReply: 'The last day of {month2}.',
		followups: [
			["Can the organization be reopened if they come back?", "Within the 90 days, yes, with everything as it was. After that, it would be a new organization."],
			["Do we pay for the last month in full?", "The usual rule applies: the invoice takes the busiest day of the month, whatever day the organization closes."],
			["Can the customer export their data themselves?", "Yes. An owner can export everything from Fernhill settings, under Organization, at any time until the data is deleted."]
		],
		endings: {
			answered: 'Use the closure form in the partner portal, under Customers, with the date you want. The organization stays on your dashboard until that date, and the customer can export everything from Fernhill settings for 90 days afterwards.',
			withdrawn: '{co} changed their mind after a call with their director, and they are staying. Please ignore this one.'
		}
	},
	{
		area: 'dashboard',
		asks: [
			['Do invitations count as seats?', '{co} sent out {k2} invitations last week and only some people have accepted. Are we paying for the ones who have not?'],
			['What counts as a seat?', 'The seats figure on the dashboard is higher than the number of people {co} thinks are using Fernhill. What exactly counts as a seat?'],
			["Seat count for {co}", "{co} says only about {n} of their people use Fernhill, but our dashboard shows more seats for them. What counts as a seat exactly?"]
		],
		details: [
			'Some of the invitations went to people who have not started yet.',
			'The customer pays us per active user, so I need to explain any difference.',
			'There are also two shared mailboxes, if that matters.',
			"Their new starters were invited weeks before their start dates.",
			"We tell the customer the seats figure from the dashboard every month."
		],
		explain: ['A seat counts from the day a person first signs in, not from the day they are invited.'],
		art: ['members'],
		team: ['billing', 'they can check the daily figures for the organization'],
		need: 'the organization and the dates you are looking at',
		needReply: '{co}, the first two weeks of {month}.',
		followups: [
			["When someone accepts an invitation but never signs in again, do they still count?", "Yes, from their first sign-in until they are removed, whether they use it or not."],
			["Do admins from our side count?", "Yes. Any of your staff who signs in to the customer's organization takes a seat there."],
			["Do suspended organizations count seats?", "No. Seats are not counted while an organization is suspended."]
		],
		reply: ['report'],
		endings: {
			answered: 'Invitations that have not been accepted do not count. Shared mailboxes count once someone signs in to them, which is usually why the figure is a little higher than the customer expects.',
			fixed: 'Billing found that invitations sent from one of the old onboarding templates were counted as seats from the day they were sent. That has been fixed, and a credit for {co} is on the next invoice.'
		}
	}
];

// Parts shared by every thread. {psm} is Fernhill's partner success manager for the partner, {first} the
// partner's contact.
const greetings = ['Hi {psm},', 'Hello,', 'Hi team,', 'Good morning,', 'Hi all,', 'Hello {psm},', 'Afternoon,', 'Dear partner success,'];
const replyGreetings = ['Hi {first},', 'Hello {first},', 'Dear {first},', 'Hi {first}, and thanks.'];
const laterGreetings = ['Hi {first},', 'Hello {first},', '{first},', 'Hi again {first},', '', ''];
const closers = ['Best,', 'Kind regards,', 'Thanks,', 'Speak soon,', 'All the best,'];
const vagueSubjects = ['Quick question', 'Question about the console', 'Help please', 'Partner console', 'A couple of things', 'Follow-up from our call', 'Fernhill query', '{co}', 'Re: {co}'];
const partnerContext = [
	'{co} is one of our larger customers: {n} seats on {plan}, and with us since {date}.',
	'For context, we look after about {k2} organizations on Fernhill, mostly small offices in and around {city}.',
	'We have been a Fernhill partner for three years, and this is the first time I have had to ask about this.',
	'I am fairly new in this role, so apologies if this is covered somewhere obvious.',
	'Our account manager used to handle this kind of thing, but she has moved to another team.',
	'{co} renews with us in {month2}, so I would like to have an answer before then.',
	'This came up in our weekly service meeting, and I said I would ask you.',
	'I did look in the partner portal help pages first, but could not find anything on it.'
];
const genericInternal = [
	'Account check: {acct}, {k2} organizations, no open invoices, no other tickets from {partner} this month.',
	'Spoke to {first} on the phone as well. The summary above is accurate.',
	'Second ticket on this subject this month. Adding it to the list for the partner advisory board.',
	'{partner} is on the Silver tier, renewal in {month2}. Nothing else open with them.'
];
const colleagueIntros = ['{first} asked me to add some detail here, as I deal with this side of things.', 'Jumping in, as I look after {co} day to day.', 'Picking this up while {first} is out today.', 'Adding a bit of background from our side.'];
const twoThings = ['Two things today.', 'A couple of things, if I may.', 'I have two questions.', 'First, something that has been bothering us for a while.'];
const secondThing = ['The other thing is separate.', 'Second question.', 'Then something else.', 'And a second, unrelated question.'];
const onFirstThing = ['Taking your questions in order.', 'On the first one:', 'First question first.'];
const onSecondThing = ['Now the second one.', 'On your other question.', 'As for the second thing:'];
const laterThing = ['One more thing while I have you.', 'Different subject, but while this is open:', 'Something else that came up this week:', 'Unrelated, but I may as well ask here.'];
const againIntros = ['Here it is again this morning, for comparison:', 'The same view today:', 'As it looks now:', 'Updated, in case it helps:'];
const extraThanks = ['Thanks, that answers it.', 'Good to know, thank you.', 'OK, noted.', 'Thanks. I will pass that on.'];
const followIntros = ['One more question on this, if I may.', 'Thanks. A related question.', 'While we wait, something the customer asked.', 'That helps. One thing I have been wondering about.', 'The customer came back with a question.'];
const acks = ['That is a clear write-up, which helps.', 'Good question, and not the first time it has come up.', 'Sorry you had to chase this internally first.', 'The detail saves us a round of questions.', 'I can see why this is frustrating.', 'Happy to help with this.'];
const holding = ['Let me check with the console team and come back to you.', 'I am checking a couple of things on our side and will reply properly by the end of the week.', 'I have asked a colleague who knows this better than I do. Bear with me.', 'Give me a day or two to look into it.'];
const partnerClosings = ['Thanks in advance.', 'Any help appreciated.', 'Let me know if you need anything else from me.', 'Happy to jump on a call if that is easier.', 'I am in the office all week if you want to ring.', 'Not urgent, but it would be good to know.', 'This one is a bit urgent for the customer, so a quick answer would be great.', ''];
const sideQuestions: [string, string][] = [
	['Is any maintenance planned this month? Our customers ask before their month end.', 'No maintenance is planned this month; the status page lists anything that comes up.'],
	['Did the partner newsletter stop? I have not had one since the summer.', 'The newsletter is monthly now and goes to your partner admin. I have added you to the list as well.'],
	['Could you resend the slides from the last partner webinar?', 'The webinar slides are in the partner portal, under Resources.'],
	['Is the partner summit still in Lisbon this year?', 'Yes, Lisbon, on 4 and 5 March. Invitations go out in December.'],
	['Has next year\'s price list been published yet?', 'Next year\'s price list goes out with the December newsletter.'],
	['Do you have a newer version of the Fernhill logo for our website?', 'The current logo pack is under Marketing in the partner portal.'],
	['Can we have an organization for demos that does not count towards our seats?', 'Yes: partner contracts set those up if you ask, and they are free for twelve months.'],
	['Who is our partner manager now?', 'For now that is still me, until the new manager for your region starts in January.']
];
const bridges = ['Now the real reason I am writing.', 'Anyway, the main thing:', 'The bigger question, though:', 'But that is not why I am writing.', 'On to what I actually wanted to ask.'];
const bumps = ['Hi {psm}, any news on this one?', 'Just chasing this. {co} asked again this morning.', 'Hello again. Is there an update?', 'Bumping this, as it has come up with the customer again.', 'Sorry to nag, but is anyone looking at this?'];
const bumpReplies = ['Sorry for the slow reply, {first}. I was at the partner roadshow last week and am still catching up.', 'Apologies, this sat in my queue for longer than it should have.', 'Sorry, {first}, I missed your message while I was off.', 'Thanks for the nudge.'];
const confirmAnswered = ['Perfect, that is exactly what I needed. Thanks!', 'Found it, thank you. I do not know how I missed that.', 'Great, I have passed that on to the customer.', 'That works. Thanks for the quick answer.', 'Brilliant, thank you.'];
const confirmFixed = ['Checked, and it all looks right now. Thanks for sorting it.', 'Confirmed on our side. Much appreciated.', 'Thank you. The customer is happy.', 'Great, that is a weight off. Thanks all.'];
const plannedAcks = ['Good to hear it is on the list. We will manage until then.', 'Thanks. Any chance of it being sooner? Even a rough version would help.', 'OK, thanks for letting me know. I will keep an eye on the release notes.', 'Great news. Please do let me know when it is out.'];
const declinedAcks = ['Understood, even if it is not what I hoped for.', 'That is a shame, but I see the reasoning.', 'OK. We will keep doing it the long way, then.', 'Fair enough. Thanks for the straight answer.'];
const pushBacks = ['That is disappointing. It costs us real time every month, and I doubt we are the only ones.', 'Is that final? I really think other partners will want this too.', 'I understand, but please keep it in mind. It comes up with almost every customer.'];
const handoffs = ['This one needs {teamName}: {teamWhy}. I have passed it to them with everything above, and they will reply here.', 'I cannot sort this from partner success, but {teamName} can: {teamWhy}. I have handed it over.', 'Passing this to {teamName}, since {teamWhy}. You will hear from them directly.'];
const pickups = ['{teamCap} here. I have picked this up and will come back to you by email once I have looked into it.', 'Hi {first}, this is with me now in {teamName}. I will be in touch this week.', 'Thanks, {psm}. {first}, I will take it from here and reply directly.'];
const waitAsks = ['Before we go further, could you send me {need}?', 'To take this forward I need {need}. Could you send that over?', 'One thing I need from you first: {need}.'];
const waitBumps = ['Hi {first}, just checking whether you had a chance to look at the above.', 'Following up on this: I still need {need} before I can do anything.', 'Hello again, {first}. Nothing has moved here, as I am still waiting for {need}.', 'One more nudge on this one. If it is no longer needed, just say so.'];
const lateReplies = ['Sorry, this fell off my list.', 'Apologies for the delay; the customer took a while to get back to me.', 'Finally got it.', 'Sorry, I was on leave.'];
const withdrawals = ['We can close this one: we found another way round it in the meantime.', 'No longer needed, thanks. The colleague who raised it with me has moved on, and nobody else has asked since.', 'You can drop this. We talked it over internally and can live with things as they are.', 'Please close this. It turned out to matter less than I thought once we looked at it properly.'];
const customerWithdrawals = ['The customer sorted it out themselves in the end, so there is nothing more to do here.', 'Please close this. The customer has decided to go another way, so it no longer matters to us.', 'You can drop this one. We talked it through with the customer and they are happy as things are.'];
const withdrawnReplies = ['Thanks for letting me know, {first}.', 'Understood. Thanks for telling us.', 'Noted, thanks.'];
const scopeReplies = ['Could you open a separate ticket for that one? It goes to a different team, and I do not want it to get lost in this thread.', 'I will answer that one in a separate ticket so this thread stays on the original question.', 'Good question, but let us keep it apart. I have opened a new ticket for it and copied you in.'];
const reversalsDown = ['An update I owe you: after the planning review, this is not going ahead after all.', 'Coming back to this with less good news than last time. The roadmap was cut back last week.', 'I have to correct what I said earlier.'];
const reversalsUp = ['Coming back to this: since your ticket, other partners have asked for the same, and we have changed our minds.', 'Some better news on this one. It came up at the partner advisory board, and we looked at it again.', 'Reopening this, as things have moved since my last message.'];
const thenWhat = ['That works for one customer, but we have {k} more in the same position. Is there nothing better?', 'Thanks, but that is the workaround we already use. It is the reason I wrote in.', 'We tried that and it does not quite do what we need.'];
const tangents = ['By the way, thanks for the kind words at the partner roadshow.', 'PS: the partner summit invitations go out next month.', 'Enjoy the long weekend.', 'Unrelated, but your new website looks great.', 'Hope the office move went smoothly.'];
const whens = ['the first quarter of 2027', 'early next year', 'the spring', 'the first half of next year', 'the release after 1.5', 'February'];
const channels = ['by email', 'in the partner portal', 'by email to partner success', 'in the partner portal, from the Help link'];
const ooo = (name: string, back: string, cover: string) =>
	`Automatic reply: Thank you for your message. I am out of the office until ${back} with limited access to email. For anything urgent, please contact ${cover}.\n\n${name}`;

const artIntros: Record<Art, string[]> = {
	orgs: ['Here is the table as it stands this morning:', 'Copied straight from the dashboard:', 'For reference, this is what we see:', 'Pasted from the console:'],
	members: ['From the Members page:', 'This is the list as the console shows it:', 'Copied from the Members page this morning:'],
	usage: ['From our spreadsheet:', 'I put the numbers side by side:', 'Our figures:'],
	invoice: ['From the invoice PDF:', 'The lines in question:', 'Copied from the invoice:'],
	email: ['Forwarding what the customer sent:', 'This is what the customer wrote:', 'The customer\'s email, for context:'],
	csv: ['This is the format our PSA tool takes:', 'What the import file looks like:', 'An example of the file we build by hand today:'],
	audit: ['The findings, as the auditors wrote them:', 'Here is the list:', 'From the report:'],
	screen: ['Copied from the screen:', 'This is what the top of the page shows:', 'As it looks for me:'],
	accounts: ['This is the list as it opens:', 'The account list, top to bottom:', 'What I scroll through every time:'],
	clause: ['The agreement says:', 'For reference, our agreement says this:', 'From our partner agreement:'],
	team: ['This is our Team page in the partner portal:', 'Our logins, copied from the portal:', 'For reference, the Team page:'],
	report: ['From the usage report:', 'The usage report says:', 'Lines from the usage report:']
};
const replyIntros: Partial<Record<Art, string[]>> = {
	report: ['From the usage report for {month}:', 'This is what our records show for {month}:', 'The lines from the usage report, for reference:'],
	team: ['This is what the Team page shows for {partner} today:', 'Your logins as of this morning:', 'For reference, the logins on your agreement:']
};

interface Ctx {
	[key: string]: string;
}
const para = (...sentences: string[]) => sentences.filter((sentence) => sentence !== '').join(' ');
const fill = (text: string, ctx: Ctx): string =>
	text.replace(/\{(\w+)\}('s)?/g, (_, key: string, possessive?: string) => {
		const value = ctx[key];
		if (value === undefined) throw new Error(`no value for {${key}} in: ${text}`);
		return possessive ? (value.endsWith('s') ? `${value}'` : `${value}'s`) : value;
	});

// Pasted material.
interface Row {
	name: string;
	plan: Plan;
	status: string;
	seats: number;
	sinceDay: number;
	since: string;
}
interface Scene {
	r: Rand;
	/** The organizations this thread's pastes show, chosen on the first paste. */
	rows: { list?: Row[]; members?: string[] };
	partner: Partner;
	ctx: Ctx;
	topic: Topic;
	orgs: Org[];
	day: number;
	contactEmail: string;
}
const rowsFor = (s: Scene): Row[] => {
	const { r } = s;
	if (!s.rows.list) s.rows.list = chooseRows(s);
	return s.rows.list.map((row) => ({ ...row, seats: Math.max(2, row.seats + int(r, -3, 3)) }));
};
const chooseRows = (s: Scene): Row[] => {
	const { r, topic } = s;
	const flags = topic.flags ?? {};
	const main = s.orgs[0]!;
	const rows = [main, ...shuffle(r, s.orgs.slice(1)).slice(0, int(r, 5, 12))];
	return shuffle(r, rows).map((org) => {
		const isMain = org === main;
		let status = r() < 0.07 ? 'suspended' : r() < 0.08 ? 'Trial' : 'Active';
		let since = org.since;
		if (isMain && flags.suspended) status = 'suspended';
		if (isMain && flags.trial) {
			status = 'Trial';
			since = s.day - int(r, 20, 27);
		}
		if (status === 'Trial' && !isMain) since = s.day - int(r, 2, 25);
		if (flags.migrated && (isMain || r() < 0.6)) since = toDay('2024-03-01');
		let name = org.name;
		if (flags.escaped && (isMain || r() < 0.3)) name = isMain ? s.ctx.escaped! : name.replace(' and ', ' &amp; ');
		return { name, plan: org.plan, status, seats: Math.max(2, org.seats + int(r, -4, 4)), sinceDay: since, since: show(since) };
	});
};
const orgsPaste = (s: Scene): string => {
	const rows = rowsFor(s).sort((a, b) => a.sinceDay - b.sinceDay);
	if (s.r() < 0.5)
		return ['| Organization | Plan | Status | Seats | Customer since |', '| --- | --- | --- | --- | --- |', ...rows.map((row) => `| ${row.name} | ${row.plan} | ${row.status} | ${row.seats} seats | ${row.since} |`)].join('\n');
	return ['```text', 'Organization\tPlan\tStatus\tSeats\tCustomer since', ...rows.map((row) => `${row.name}\t${row.plan}\t${row.status}\t${row.seats} seats\t${row.since}`), '```'].join('\n');
};
const membersPaste = (s: Scene): string => {
	const { r } = s;
	if (s.rows.members) {
		const gone = new Set(shuffle(r, s.rows.members.filter((line) => !line.endsWith('Owner'))).slice(0, int(r, 0, 2)));
		return ['```text', ...s.rows.members.filter((line) => !gone.has(line)), '```'].join('\n');
	}
	const domain = s.orgs[0]!.domain;
	const people = shuffle(r, firstNames).slice(0, int(r, 8, 18));
	const named = [s.ctx.cust!, s.ctx.cust2!, s.ctx.cust3!, ...people.map((name) => `${name} ${pick(r, surnames)}`)];
	const lines = named.slice(0, int(r, 8, named.length)).map((name) => {
		const email = `${name.toLowerCase().replace(/[^a-z ]/g, '').replace(' ', '.')}@${domain}`;
		return `${name} (${email}), ${name === s.ctx.cust3 ? 'Owner' : r() < 0.15 ? 'Admin' : 'Member'}`;
	});
	s.rows.members = shuffle(r, lines);
	return ['```text', ...s.rows.members, '```'].join('\n');
};
const usagePaste = (s: Scene): string => {
	const { r } = s;
	const months = int(r, 4, 9);
	// The last month is the one the thread is about: the dashboard's {n} against the invoice's {n2}.
	const seatsBy = [Number(s.ctx.n)];
	for (let i = 1; i < months; i++) seatsBy.unshift(Math.max(4, seatsBy[0]! - int(r, -5, 6)));
	const rows = ['| Month | Console (seats in use) | Invoice (seats) | Difference |', '| --- | ---: | ---: | ---: |'];
	for (let i = months; i >= 1; i--) {
		const month = asDate(s.day - i * 30);
		const seats = seatsBy[months - i]!;
		const billed = i === 1 ? Number(s.ctx.n2) : seats + int(r, 0, 9);
		rows.push(`| ${shortMonths[month.getUTCMonth()]} ${month.getUTCFullYear()} | ${seats} | ${billed} | ${billed - seats} |`);
	}
	return rows.join('\n');
};
const invoicePaste = (s: Scene): string => {
	const { r, partner } = s;
	const rows = rowsFor(s).filter((row) => row.status !== 'Trial');
	const unit = (plan: Plan) => Math.round(prices[partner.currency][plan] * partner.discount * 100) / 100;
	const month = asDate(s.day - 25);
	const end = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0)).getUTCDate();
	const period = `1 ${shortMonths[month.getUTCMonth()]} ${month.getUTCFullYear()} to ${end} ${shortMonths[month.getUTCMonth()]} ${month.getUTCFullYear()}`;
	let subtotal = 0;
	const lines = rows.map((row) => {
		const seats = row.seats + int(r, 0, 3);
		const amount = seats * unit(row.plan as Plan);
		subtotal += amount;
		return `${row.name.padEnd(32)} ${row.plan.padEnd(11)} ${String(seats).padStart(5)} ${money(partner.currency, unit(row.plan as Plan)).padStart(11)} ${money(partner.currency, amount).padStart(12)}`;
	});
	const tax = partner.currency === 'GBP' ? ['VAT 20%', subtotal * 0.2] : partner.currency === 'EUR' ? ['VAT (reverse charge)', 0] : ['Tax', 0];
	return [
		'```text',
		`Fernhill partner invoice ${s.ctx.invoice}`,
		`Partner: ${partner.company} (account ${s.ctx.acct})`,
		`Period: ${period}`,
		'',
		`${'Organization'.padEnd(32)} ${'Plan'.padEnd(11)} ${'Seats'.padStart(5)} ${'Unit price'.padStart(11)} ${'Amount'.padStart(12)}`,
		...lines,
		'',
		`${'Subtotal'.padStart(62)} ${money(partner.currency, subtotal).padStart(12)}`,
		`${String(tax[0]).padStart(62)} ${money(partner.currency, Number(tax[1])).padStart(12)}`,
		`${'Total due'.padStart(62)} ${money(partner.currency, subtotal + Number(tax[1])).padStart(12)}`,
		'```'
	].join('\n');
};
const emailPaste = (s: Scene): string => {
	const sent = s.day - int(s.r, 0, 2);
	const text = fill(s.topic.customer ?? 'Hi {first}, could you look into this for us? Thanks.', s.ctx);
	const from = s.ctx.sender!;
	return [
		`> From: ${from} <${from.toLowerCase().replace(/[^a-z ]/g, '').replace(' ', '.')}@${s.orgs[0]!.domain}>`,
		`> Sent: ${weekdays[asDate(sent).getUTCDay()]} ${show(sent)}`,
		`> To: ${s.contactEmail}`,
		`> Subject: ${pick(s.r, ['Fernhill', 'Fernhill question', 'Re: Fernhill', 'Quick question', 'Help please'])}`,
		'>',
		...text.split('\n').map((line) => `> ${line}`)
	].join('\n');
};
const csvPaste = (s: Scene): string => {
	const rows = rowsFor(s);
	const unit = (plan: string) => (prices[s.partner.currency][plan as Plan] * s.partner.discount).toFixed(2);
	return ['```csv', 'CustomerName,ProductCode,Quantity,UnitCost,StartDate,BillingCycle', ...rows.map((row) => `"${row.name}",FH-${row.plan.toUpperCase()},${row.seats},${unit(row.plan)},${iso(row.sinceDay)},Monthly`), '```'].join('\n');
};
const findings: [string, string, string, string][] = [
	['Dashboard', 'The organizations table has no caption or accessible name, so a screen reader announces it only as "table".', '1.3.1 Info and Relationships', 'Medium'],
	['Header', 'The current page in the navigation is shown by colour alone.', '1.4.1 Use of Color', 'Medium'],
	['Header', 'The navigation links have a contrast ratio of 3.9:1 against the header background.', '1.4.3 Contrast (Minimum)', 'High'],
	['All pages', 'There is no link to skip the header and go to the main content.', '2.4.1 Bypass Blocks', 'Low'],
	['All pages', 'The page title is the same on the Dashboard and Members pages.', '2.4.2 Page Titled', 'Medium'],
	['Members', 'The member list is a plain list, so name, email address and role cannot be navigated as columns.', '1.3.1 Info and Relationships', 'Low'],
	['All pages', 'The focus outline has been removed from the navigation links.', '2.4.7 Focus Visible', 'High'],
	['All pages', 'At 200% text size the header overlaps the page heading.', '1.4.4 Resize Text', 'Medium'],
	['Header', 'The signed-in email address has no label, so its purpose is not announced.', '1.3.1 Info and Relationships', 'Low'],
	['Dashboard', 'There is no heading between the account name and the organizations table.', '2.4.6 Headings and Labels', 'Low'],
	['Partner portal', 'The sign-in form shows errors in red text only, with no icon or text prefix.', '1.4.1 Use of Color', 'High'],
	['Partner portal', 'The two-step verification code field has no visible label.', '3.3.2 Labels or Instructions', 'High']
];
const auditPaste = (s: Scene): string => {
	const picked = shuffle(s.r, findings).slice(0, int(s.r, 5, 9));
	return ['| Ref | Page | Finding | WCAG 2.2 | Severity |', '| --- | --- | --- | --- | --- |', ...picked.map((f, i) => `| A-${String(i + 1).padStart(2, '0')} | ${f[0]} | ${f[1]} | ${f[2]} | ${f[3]} |`)].join('\n');
};
const screenPaste = (s: Scene): string => {
	const email = s.topic.flags?.oldEmail ? s.ctx.oldemail! : s.contactEmail;
	const seats = int(s.r, 40, 600);
	return ['```text', `Account [ ${s.ctx.acct} v ]    Dashboard    Members        ${email}`, '', s.ctx.acct, `${seats} seats in use this month`, '```'].join('\n');
};
const accountsPaste = (s: Scene): string => ['```text', `Account [ ${s.partner.accounts[0]} v ]`, ...s.partner.accounts.map((name) => `    ${name}`), '```'].join('\n');
const clausePaste = (s: Scene): string => `> ${s.topic.clause ?? ''}`;
const teamPaste = (s: Scene): string => {
	const { r, partner } = s;
	const staff = [...partner.people.map(([name]) => name), ...shuffle(r, firstNames).slice(0, int(r, 3, 8)).map((name) => `${name} ${pick(r, surnames)}`)];
	const email = (name: string) => `${name.toLowerCase().normalize('NFD').replace(/[^a-z ]/g, '').replace(' ', '.')}@${partner.domain}`;
	const rows = staff.map((name, i) => `| ${name} | ${email(name)} | ${i < partner.people.length || r() < 0.6 ? 'All' : pick(r, partner.accounts)} | ${i < 2 || r() < 0.3 ? 'Yes' : 'No'} | ${i >= partner.people.length && r() < 0.08 ? 'Never' : show(s.day - int(r, 0, 40))} |`);
	if (r() < 0.5) rows.push(`| Service desk | servicedesk@${partner.domain} | All | No | ${show(s.day - int(r, 0, 2))} |`);
	return ['| Name | Email | Accounts | Invoices | Last sign-in |', '| --- | --- | --- | --- | --- |', ...rows].join('\n');
};
const reportPaste = (s: Scene): string => {
	const { r } = s;
	const month = asDate(s.day - 25);
	const rows = rowsFor(s).filter((row) => row.status !== 'Trial');
	return [
		'```csv',
		'organization_id,organization,plan,busiest_day,seats_busiest_day,seats_last_day',
		...rows.map((row) => {
			const busiest = `${month.getUTCFullYear()}-${String(month.getUTCMonth() + 1).padStart(2, '0')}-${String(int(r, 1, 28)).padStart(2, '0')}`;
			return `org_${Math.floor(r() * 0xffffff).toString(16).padStart(6, '0')},"${row.name}",${row.plan.toLowerCase()},${busiest},${row.seats + int(r, 0, 6)},${row.seats}`;
		}),
		'```'
	].join('\n');
};
const paste = (s: Scene, art: Art): string =>
	({ orgs: orgsPaste, members: membersPaste, usage: usagePaste, invoice: invoicePaste, email: emailPaste, csv: csvPaste, audit: auditPaste, screen: screenPaste, accounts: accountsPaste, clause: clausePaste, team: teamPaste, report: reportPaste })[art](s);

// One thread.
type Ending = 'answered' | 'fixed' | 'planned' | 'declined' | 'team' | 'waiting' | 'withdrawn';
interface Message {
	who: string;
	role: string;
	gap: number;
	body: string[];
	internal?: boolean;
}

const order = shuffle(mulberry32(20261123), topics.map((_, i) => i));

const thread = (index: number, number: number, nominal: number): string => {
	const r = mulberry32(0xfe1100 + index * 7919);
	const topicIndex = order[index % topics.length]!;
	const topic = topics[topicIndex]!;
	const round = Math.floor(index / topics.length);
	const ask = topic.asks[(round + topicIndex) % topic.asks.length]!;
	const eligible = partners.map((p, i) => i).filter((i) => partners[i]!.accounts.length >= (topic.minAccounts ?? 1));
	const partnerIndex = eligible[(index * 7 + round) % eligible.length]!;
	const partner = partners[partnerIndex]!;
	const [contact, title] = pick(r, partner.people);
	const firstName = contact.split(' ')[0]!;
	const psm = partner.psm;
	const psmFirst = psm.split(' ')[0]!;
	const acctIndex = int(r, 0, partner.accounts.length - 1);
	const acct = partner.accounts[acctIndex]!;
	const acct2 = partner.accounts.length > 1 ? partner.accounts[(acctIndex + 1) % partner.accounts.length]! : acct;
	const orgs = shuffle(r, customersOf(partnerIndex));
	const custNames = shuffle(r, firstNames).slice(0, 4).map((name) => `${name} ${pick(r, surnames)}`);
	const n = int(r, 12, 160);
	const planFrom = int(r, 0, 1);
	const planPair = [plans[planFrom]!, plans[int(r, planFrom + 1, 2)]!];
	const contactEmail = `${contact.toLowerCase().normalize('NFD').replace(/[^a-z ]/g, '').replace(' ', '.')}@${partner.domain}`;
	const priceNow = prices[partner.currency].Growth * partner.discount;
	const surnamePair = shuffle(r, surnames);
	const ctx: Ctx = {
		psm: psmFirst,
		psmFull: psm,
		first: firstName,
		contact,
		partner: partner.company,
		acct,
		acct2,
		co: orgs[0]!.name,
		co2: orgs[1]!.name,
		cust: custNames[0]!,
		cust2: custNames[1]!,
		cust3: custNames[2]!,
		sender: custNames[3]!,
		n: String(n),
		n2: String(n + int(r, 2, 14)),
		k: String(int(r, 3, 12)),
		k2: String(int(r, 14, 60)),
		accounts: String(partner.accounts.length),
		plan: planPair[0]!,
		plan2: planPair[1]!,
		date: show(orgs[0]!.since),
		date2: show(nominal + int(r, 9, 20)),
		date3: show(nominal - int(r, 20, 27)),
		month: monthOf(nominal - 20),
		month2: monthOf(nominal + int(r, 40, 150)),
		d: ordinal(int(r, 3, 26)),
		invoice: `FH-${iso(nominal - 20).slice(0, 7)}-${String(int(r, 1000, 9999)).padStart(5, '0')}`,
		when: pick(r, whens),
		price: money(partner.currency, priceNow),
		oldprice: money(partner.currency, priceNow * 0.9),
		city: partner.city,
		domain: partner.domain,
		formerDomain: partner.formerDomain,
		oldemail: contactEmail.replace(partner.domain, partner.formerDomain),
		migdate: '1 Mar 2024',
		escaped: `${surnamePair[0]} &amp; ${surnamePair[1]} ${pick(r, orgTails)}`
	};
	ctx.need = topic.need ? fill(topic.need, ctx) : '';
	if (topic.team) {
		const team = teams[topic.team[0]];
		ctx.teamName = team.name;
		ctx.teamCap = cap(team.name);
		ctx.teamWhy = topic.team[1];
	}
	const scene: Scene = { r, rows: {}, partner, ctx, topic, orgs, day: nominal, contactEmail };
	const f = (text: string) => fill(text, ctx);
	const messages: Message[] = [];
	const say = (who: string, role: string, gap: number, body: string[], internal = false) => {
		const parts = body.filter((part) => part !== '');
		const whoFirst = who.split(' ')[0]!;
		if (!internal && role.startsWith('Fernhill') && parts.length > 1 && r() < 0.55)
			parts.push(`${pick(r, closers)}\n${r() < 0.5 ? whoFirst : `${who}\n${cap(role.slice('Fernhill '.length))}, Fernhill`}`);
		else if (role === partner.company && messages.length > 0 && parts.length > 1 && r() < 0.4) parts.push(`${partner.sign}\n${whoFirst}`);
		messages.push({ who, role, gap, body: parts, internal });
	};
	const partnerSays = (gap: number, body: string[]) => say(contact, partner.company, gap, body);
	const psmSays = (gap: number, body: string[]) => say(psm, 'Fernhill partner success', gap, body);
	const consoleSays = (gap: number, body: string[]) => say(pick(r, consoleTeam), 'Fernhill console team', gap, body);
	const productSays = (gap: number, body: string[]) => say(productLead, 'Fernhill product', gap, body);
	const teamPerson = topic.team ? pick(r, teams[topic.team[0]].people) : psm;
	const teamSays = (gap: number, body: string[]) => say(teamPerson, topic.team ? teamRole[topic.team[0]] : 'Fernhill partner success', gap, body);
	const signature = r() < 0.5 ? `${partner.sign}\n${firstName}` : `${partner.sign}\n${contact}\n${title}, ${partner.company}${r() < 0.5 ? `\n${partner.phone}` : ''}`;

	// The partner's first message. The main question is sometimes not the first one raised.
	const details = shuffle(r, topic.details);
	let nextDetail = 0;
	const detail = () => (nextDetail < details.length ? f(details[nextDetail++]!) : '');
	const arts = [...(topic.art ?? [])];
	const replyArts = [...(topic.reply ?? [])];
	const withReply = (chance: number): string[] => {
		if (!replyArts.length || r() >= chance) return [];
		const art = replyArts.shift()!;
		return [`${f(pick(r, replyIntros[art] ?? artIntros[art]))}\n\n${paste(scene, art)}`];
	};
	let again = false;
	const tables = (topic.art ?? []).filter((art) => ['orgs', 'members', 'invoice', 'csv'].includes(art));
	const withPaste = (chance: number): string[] => {
		if (r() >= chance) return [];
		if (arts.length) {
			const art = arts.shift()!;
			return [`${pick(r, artIntros[art])}\n\n${paste(scene, art)}`];
		}
		if (!tables.length || again || r() >= 0.7) return [];
		again = true;
		return [`${pick(r, againIntros)}\n\n${paste({ ...scene, day: scene.day + int(r, 5, 25) }, pick(r, tables))}`];
	};
	const laterThings = shuffle(r, laterThing);
	// Other matters raised in the same thread, each settled in a message or two. One may come before the main
	// question, and then the subject line may be about it.
	const extraCount = r() < 0.15 ? 0 : r() < 0.5 ? 1 : 2;
	const extras = shuffle(r, topics.filter((t, i) => i !== topicIndex && (t.minAccounts ?? 1) <= partner.accounts.length && !t.flags)).slice(0, extraCount);
	const extraCtx: Ctx = { ...ctx, co: orgs[2]!.name, co2: orgs[3]!.name, cust: custNames[1]!, cust2: custNames[2]!, cust3: custNames[3]! };
	const fx = (text: string) => fill(text, extraCtx);
	const settle = (t: Topic) => {
		const options = (['answered', 'planned', 'declined'] as const).filter((key) => t.endings[key]);
		return [fx(pick(r, t.explain)), fx(t.quick ?? t.endings[pick(r, options)]!)];
	};
	const extrasFirst = extras.length > 0 && r() < 0.5 ? [extras.shift()!] : [];
	const extraAsks = extrasFirst.map((t) => pick(r, t.asks));
	// An extra whose wording points at something pasted below brings that paste with it.
	const extraPaste = (t: Topic, text: string): string[] => {
		const art = t.art?.[0];
		if (!art || !/below/.test(text)) return [];
		return [`${pick(r, artIntros[art])}\n\n${paste({ ...scene, topic: t, ctx: extraCtx }, art)}`];
	};
	const subject = extraAsks.length && r() < 0.4 ? fx(extraAsks[0]![0]) : r() < 0.25 ? f(pick(r, vagueSubjects)) : f(ask[0]);
	const side = !extrasFirst.length && r() < 0.4 ? pick(r, sideQuestions) : null;
	const firstBody: string[] = [f(pick(r, greetings))];
	if (side) firstBody.push(side[0], pick(r, bridges));
	if (r() < 0.6) firstBody.push(f(pick(r, ask[1].includes('{co}') ? partnerContext : partnerContext.filter((line) => !line.includes('{co}')))));
	if (extraAsks.length) firstBody.push(pick(r, twoThings), fx(extraAsks[0]![1]), ...extraPaste(extrasFirst[0]!, extraAsks[0]![1]), pick(r, secondThing));
	firstBody.push(para(f(ask[1]), r() < 0.5 ? detail() : ''), para(detail(), r() < 0.6 ? detail() : ''));
	firstBody.push(...withPaste(0.9), f(pick(r, partnerClosings)), signature);
	partnerSays(0, firstBody);
	const away = r() < 0.12 ? int(r, 3, 8) : 0;
	if (away) say(psm, 'automatic reply', 0, [ooo(psm, show(nominal + away), 'the partner success team at the usual address')]);

	// Fernhill's first answer, and what the partner adds to it.
	const probe = topic.probe && r() < 0.9 ? pick(r, topic.probe) : null;
	const explains = shuffle(r, topic.explain);
	const firstReply = [f(pick(r, replyGreetings)), pick(r, acks)];
	if (side) firstReply.push(`On your first question: ${side[1].charAt(0).toLowerCase()}${side[1].slice(1)}`);
	for (const t of extrasFirst) firstReply.push(pick(r, onFirstThing), ...settle(t));
	if (extrasFirst.length) firstReply.push(pick(r, onSecondThing));
	firstReply.push(f(explains[0]!));
	if (explains.length > 1 && r() < 0.3) firstReply.push(f(explains[1]!));
	if (probe) firstReply.push(f(probe[0]));
	else if (r() < 0.5) firstReply.push(pick(r, holding));
	if (r() < 0.2) firstReply.push(pick(r, tangents));
	firstReply.push(...withReply(0.4));
	psmSays(away ? away + int(r, 0, 2) : int(r, 0, 3), firstReply);
	if (probe) partnerSays(int(r, 0, 4), [para(f(probe[1]), r() < 0.6 ? detail() : ''), ...withPaste(0.7)]);
	const colleagues = partner.people.filter(([name]) => name !== contact);
	if (colleagues.length && r() < 0.45) {
		const [colleague] = pick(r, colleagues);
		say(colleague, partner.company, int(r, 0, 3), [para(f(pick(r, colleagueIntros)), detail(), r() < 0.5 ? detail() : ''), ...withPaste(0.6)]);
	}
	if (topic.internal && r() < 0.7) say(psm, '', int(r, 0, 2), [f(pick(r, topic.internal))], true);
	else if (r() < 0.35) say(psm, '', int(r, 0, 2), [f(pick(r, genericInternal))], true);
	if (topic.notes && r() < 0.75) consoleSays(int(r, 1, 6), [f(pick(r, topic.notes))]);
	const followups = shuffle(r, topic.followups ?? []);
	for (let i = followups.length && r() < 0.9 ? int(r, Math.min(2, followups.length), followups.length) : 0; i > 0; i--) {
		const [question, answer] = followups[i - 1]!;
		partnerSays(int(r, 0, 5), [para(r() < 0.5 ? pick(r, followIntros) : '', f(question), r() < 0.4 ? detail() : '')]);
		(r() < 0.6 ? psmSays : consoleSays)(int(r, 0, 3), [f(pick(r, laterGreetings)), f(answer), ...withReply(0.5)]);
	}
	if (r() < 0.35) {
		partnerSays(int(r, 8, 20), [f(pick(r, bumps)), ...withPaste(0.4)]);
		psmSays(int(r, 0, 3), [f(pick(r, bumpReplies)), ...withReply(0.5)]);
	}
	for (const t of extras) {
		const later = pick(r, t.asks)[1];
		partnerSays(int(r, 0, 6), [laterThings.pop() ?? '', fx(later), ...extraPaste(t, later)]);
		(r() < 0.7 ? psmSays : consoleSays)(int(r, 0, 3), [f(pick(r, laterGreetings)), ...settle(t)]);
		if (t.followups && r() < 0.35) {
			const [question, answer] = pick(r, t.followups);
			partnerSays(int(r, 0, 2), [fx(question)]);
			psmSays(int(r, 0, 2), [fx(answer)]);
		} else if (r() < 0.4) partnerSays(int(r, 0, 2), [pick(r, extraThanks)]);
	}
	if (r() < 0.15) {
		const other = topics[(topicIndex + int(r, 1, topics.length - 1)) % topics.length]!;
		const otherAsk = f(pick(r, other.asks)[1]);
		partnerSays(int(r, 0, 5), [`One more thing while I have you. ${otherAsk.split(/(?<=[.?!])\s/)[0]}`]);
		psmSays(int(r, 0, 2), [pick(r, scopeReplies)]);
	}

	// How it ends: the last one to four messages decide it, and an earlier turn can point the other way.
	const kinds: Ending[] = [...(Object.keys(topic.endings) as Ending[]), ...(topic.team ? ['team' as Ending] : []), ...(topic.need ? ['waiting' as Ending] : []), 'withdrawn'];
	const ending = kinds[(round * 2 + topicIndex + index) % kinds.length]!;
	const text = (key: Exclude<Ending, 'team' | 'waiting'>) => (topic.endings[key] ? f(topic.endings[key]!) : '');
	if (topic.need && ending !== 'waiting' && ending !== 'withdrawn' && r() < 0.35) {
		psmSays(int(r, 1, 4), [f(pick(r, waitAsks))]);
		if (r() < 0.6) psmSays(int(r, 9, 18), [f(pick(r, waitBumps))]);
		const late = [pick(r, lateReplies), f(topic.needReply ?? 'Attached now.')];
		const lateArt = arts.shift() ?? (/below/.test(topic.needReply ?? '') ? topic.art?.[0] : undefined);
		if (lateArt) late.push(paste(scene, lateArt));
		partnerSays(int(r, 3, 15), late);
	}
	const greet = () => f(pick(r, laterGreetings));
	switch (ending) {
		case 'answered': {
			if (topic.endings.declined && r() < 0.25) {
				psmSays(int(r, 1, 5), [greet(), text('declined')]);
				partnerSays(int(r, 0, 3), [pick(r, pushBacks)]);
				consoleSays(int(r, 3, 12), [`${greet()} I think there is a way round this that ${psmFirst} and I both missed.`, text('answered')]);
			} else (r() < 0.5 ? consoleSays : psmSays)(int(r, 1, 6), [greet(), text('answered')]);
			if (r() < 0.75) partnerSays(int(r, 0, 3), [f(pick(r, confirmAnswered))]);
			break;
		}
		case 'fixed': {
			if (topic.team && r() < 0.6) {
				psmSays(int(r, 1, 3), [f(pick(r, handoffs))]);
				if (r() < 0.5) teamSays(int(r, 0, 3), [f(pick(r, pickups))]);
			}
			teamSays(int(r, 2, 12), [greet(), text('fixed')]);
			if (r() < 0.65) partnerSays(int(r, 0, 4), [f(pick(r, confirmFixed))]);
			break;
		}
		case 'planned': {
			if (topic.endings.declined && r() < 0.35) {
				productSays(int(r, 2, 8), [greet(), text('declined')]);
				partnerSays(int(r, 0, 3), [pick(r, pushBacks)]);
				productSays(int(r, 14, 40), [pick(r, reversalsUp), text('planned')]);
			} else if (topic.endings.answered && r() < 0.3) {
				psmSays(int(r, 1, 5), [greet(), text('answered')]);
				partnerSays(int(r, 0, 4), [f(pick(r, thenWhat))]);
				productSays(int(r, 3, 14), [greet(), text('planned')]);
			} else productSays(int(r, 2, 10), [greet(), text('planned')]);
			if (r() < 0.5) partnerSays(int(r, 0, 3), [pick(r, plannedAcks)]);
			break;
		}
		case 'declined': {
			if (topic.endings.planned && r() < 0.4) {
				productSays(int(r, 2, 8), [greet(), text('planned')]);
				partnerSays(int(r, 0, 3), [pick(r, plannedAcks)]);
				productSays(int(r, 20, 45), [pick(r, reversalsDown), text('declined')]);
			} else (r() < 0.5 ? productSays : psmSays)(int(r, 2, 9), [greet(), text('declined')]);
			if (r() < 0.5) partnerSays(int(r, 0, 3), [pick(r, declinedAcks)]);
			break;
		}
		case 'team': {
			if (topic.endings.answered && r() < 0.35) {
				psmSays(int(r, 1, 4), [greet(), text('answered')]);
				partnerSays(int(r, 0, 4), [f(pick(r, thenWhat))]);
			}
			psmSays(int(r, 1, 4), [f(pick(r, handoffs))]);
			if (r() < 0.6) teamSays(int(r, 0, 3), [f(pick(r, pickups))]);
			break;
		}
		case 'waiting': {
			if (topic.endings.planned && r() < 0.25) {
				productSays(int(r, 2, 8), [greet(), text('planned')]);
				partnerSays(int(r, 0, 3), [pick(r, thenWhat).replace('{k}', ctx.k!)]);
			}
			psmSays(int(r, 1, 4), [greet(), f(pick(r, waitAsks))]);
			for (let i = int(r, 1, 3); i > 0; i--) psmSays(int(r, 10, 24), [f(pick(r, waitBumps))]);
			break;
		}
		case 'withdrawn': {
			if (topic.endings.planned && r() < 0.4) {
				productSays(int(r, 2, 8), [greet(), text('planned')]);
				partnerSays(int(r, 0, 3), [pick(r, plannedAcks)]);
			}
			partnerSays(int(r, 5, 25), [text('withdrawn') || f(pick(r, ask[1].includes('{co}') ? customerWithdrawals : withdrawals))]);
			if (r() < 0.5) psmSays(int(r, 0, 2), [f(pick(r, withdrawnReplies))]);
			break;
		}
	}

	// Dates: the thread opens on its nominal day; gaps are squeezed when they would run past the export.
	const total = messages.reduce((sum, m) => sum + m.gap, 0);
	const room = last - nominal;
	const scale = total > room ? room / total : 1;
	let day = nominal;
	const blocks = messages.map((m, i) => {
		day += i === 0 ? 0 : m.gap === 0 ? 0 : Math.max(1, Math.round(m.gap * scale));
		if (day > last) day = last;
		const head = m.internal ? `**Internal note** · ${m.who} · ${show(day)}` : `**${m.who}**${m.role ? ` (${m.role})` : ''} · ${show(day)}`;
		return `${head}\n\n${m.body.join('\n\n')}`;
	});
	const header = [`# PF-${number}: ${subject}`, `Partner: ${partner.company} · account ${acct}`, `Opened by ${contact} on ${show(nominal)}, ${pick(r, channels)}`];
	return `${header.join('\n\n')}\n\n---\n\n${blocks.join('\n\n---\n\n')}\n`;
};

const folder = join(root, 'docs', 'partner-feedback');
mkdirSync(folder, { recursive: true });
const numbering = mulberry32(14);
let number = 2140;
for (let index = 0; index < ITEMS; index++) {
	number += int(numbering, 1, 9);
	const nominal = first + Math.floor((index * (last - 30 - first)) / ITEMS) + int(numbering, 0, 2);
	writeFileSync(join(folder, `PF-${number}.md`), thread(index, number, nominal));
}
writeFileSync(
	join(folder, 'README.md'),
	`# Partner feedback\n\nThe ${ITEMS} threads that partners opened with partner success between the 1.4.0 release of the console and\n${show(last)}, one file each, exported from the help desk with every message and internal note. The export does\nnot include the help desk's tags or statuses. Pasted tables and emails are as the partner pasted them.\n`
);
