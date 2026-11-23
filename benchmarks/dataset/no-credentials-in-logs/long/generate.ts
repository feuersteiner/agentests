// Writes the long material of this entry's long tasks: the escalations that Wrenfield Analytics' client support
// passed to engineering between 15 September and 13 November 2026, one Markdown file each, under
// support/escalations/, as the old tracker exported them: the messages and pasted output, without labels, owners or
// statuses. Deterministic: fixed seeds, no clock, no network.
//   bun long/generate.ts <workspace root>
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** How many escalations to write. Dates, numbers and the share of each topic all follow from it. */
const ITEMS = 198;

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
/** A stable number for a name, so that a store keeps its code from one escalation to the next. */
const hash = (text: string) => [...text].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);
const pad = (value: number, width = 2) => String(value).padStart(width, '0');
const thousands = (value: number) => String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const pounds = (value: number) => `£${value.toFixed(2).replace(/\B(?=(\d{3})+\.)/g, ',')}`;
const hex = (r: Rand, length: number) => Array.from({ length }, () => '0123456789abcdef'[int(r, 0, 15)]).join('');
const uuid = (r: Rand) => `${hex(r, 8)}-${hex(r, 4)}-4${hex(r, 3)}-${'89ab'[int(r, 0, 3)]}${hex(r, 3)}-${hex(r, 12)}`;
/** Lays out rows as psql prints them. */
const grid = (head: string[], rows: string[][], right: boolean[] = []) => {
	const widths = head.map((h, i) => Math.max(h.length, ...rows.map((row) => row[i]!.length)));
	const cell = (text: string, i: number) => (right[i] ? text.padStart(widths[i]!) : text.padEnd(widths[i]!));
	return ['```text', head.map((h, i) => ` ${h.padEnd(widths[i]!)} `).join('|'), widths.map((w) => '-'.repeat(w + 2)).join('+'), ...rows.map((row) => row.map((c, i) => ` ${cell(c, i)} `).join('|')), `(${rows.length} rows)`, '```'].join('\n');
};
/** A Markdown table. */
const table = (head: string[], rows: string[][]) => [`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`, ...rows.map((row) => `| ${row.join(' | ')} |`)].join('\n');

// Time is kept in minutes since 00:00 on 1 September 2026, UK local time.
const DAY = 1440;
const EPOCH = Date.UTC(2026, 8, 1);
const at = (minutes: number) => new Date(EPOCH + minutes * 60000);
const dayOf = (date: string) => (Date.parse(`${date}T00:00:00Z`) - EPOCH) / 60000;
const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const weekday = (minutes: number) => dayNames[at(minutes).getUTCDay()]!;
const clock = (minutes: number) => `${pad(at(minutes).getUTCHours())}:${pad(at(minutes).getUTCMinutes())}`;
const dayMonth = (minutes: number) => `${at(minutes).getUTCDate()} ${monthNames[at(minutes).getUTCMonth()]}`;
const stamp = (minutes: number) => `${weekday(minutes).slice(0, 3)} ${at(minutes).getUTCDate()} ${monthNames[at(minutes).getUTCMonth()]!.slice(0, 3)}, ${clock(minutes)}`;
const stampLong = (minutes: number) => `${weekday(minutes)} ${dayMonth(minutes)} 2026, ${clock(minutes)}`;
const iso = (minutes: number) => at(minutes).toISOString().slice(0, 10);
const isoTime = (minutes: number) => `${iso(minutes)} ${clock(minutes)}`;
const isWeekend = (minutes: number) => at(minutes).getUTCDay() % 6 === 0;
const minuteOfDay = (minutes: number) => ((minutes % DAY) + DAY) % DAY;
const startOfDay = (minutes: number) => minutes - minuteOfDay(minutes);
const nextWorkday = (minutes: number, days = 1) => {
	let m = startOfDay(minutes);
	for (let left = days; left > 0; ) {
		m += DAY;
		if (!isWeekend(m)) left--;
	}
	return m;
};
/** Wrenfield's people answer between 08:30 and 17:45 on weekdays. */
const office = (r: Rand, t: number) => {
	let m = t;
	if (minuteOfDay(m) > 17 * 60 + 45) m = startOfDay(m) + DAY + 8 * 60 + 30 + int(r, 0, 80);
	if (minuteOfDay(m) < 8 * 60 + 30) m = startOfDay(m) + 8 * 60 + 30 + int(r, 0, 80);
	while (isWeekend(m)) m += DAY;
	return m;
};
const FIRST_DAY = dayOf('2026-09-15');
const LAST_DAY = dayOf('2026-11-13');
const LAST_MESSAGE = dayOf('2026-11-20') + 16 * 60;

// People at Wrenfield Analytics, by team.
type Who = 'a' | 'c' | 'p' | 'r' | 'd' | 'x' | 'm' | 'g';
type Msg = [Who, string];
const support = ['Marisol Quint', 'Kofi Asante', 'Hattie Brennan', 'Ravi Menon', 'Selin Aydin'];
const teams: Record<Exclude<Who, 'a' | 'c'>, { label: string; people: string[] }> = {
	p: { label: 'platform', people: ['Ines Okafor', 'Tom Ridley', 'Yusuf Demir'] },
	r: { label: 'reports API', people: ['Nadia Rahman', 'Bjorn Aalto', 'Celeste Park'] },
	d: { label: 'dashboards', people: ['Leo Fairbairn', 'Ama Owusu'] },
	x: { label: 'exports', people: ['Ruth Calloway', 'Sanjay Iyer'] },
	m: { label: 'account management', people: ['Dominic Hale', 'Freya Lund'] },
	g: { label: 'product', people: ['Gwen Aldous'] }
};

// Clients: retail and leisure chains that read their reports on Wrenfield's dashboards and in scheduled exports.
interface Client {
	name: string;
	short: string;
	unit: string;
	count: number;
	tool: string;
	provider: string;
	/** Open after midnight, so late takings matter. */
	late?: boolean;
	since: number;
}
const clients: Client[] = [
	{ name: 'Halberd & Moss', short: 'Halberd & Moss', unit: 'garden centres', count: 42, tool: 'Power BI', provider: 'Tillcraft', since: 2021 },
	{ name: 'Pell Street Pharmacy', short: 'Pell Street', unit: 'pharmacies', count: 118, tool: 'Tableau', provider: 'Ledgerline', since: 2019 },
	{ name: 'Corrie Outdoor', short: 'Corrie', unit: 'stores', count: 36, tool: 'Airflow', provider: 'Copperpoint', since: 2023 },
	{ name: 'Bramblewick Bakeries', short: 'Bramblewick', unit: 'bakeries', count: 64, tool: 'Excel Power Query', provider: 'Tillcraft', since: 2022 },
	{ name: 'Northcote Cinemas', short: 'Northcote', unit: 'cinemas', count: 19, tool: 'Looker Studio', provider: 'Quayside EPOS', late: true, since: 2020 },
	{ name: 'Tessaly Home', short: 'Tessaly', unit: 'stores', count: 27, tool: 'Power BI', provider: 'Copperpoint', since: 2024 },
	{ name: 'Fenmore Leisure', short: 'Fenmore', unit: 'clubs', count: 51, tool: 'Qlik', provider: 'Quayside EPOS', late: true, since: 2021 },
	{ name: 'Kittiwake Coffee', short: 'Kittiwake', unit: 'coffee shops', count: 88, tool: 'Power BI', provider: 'Tillcraft', since: 2020 },
	{ name: 'Galloway & Finch', short: 'Galloway & Finch', unit: 'bookshops', count: 22, tool: 'Excel Power Query', provider: 'Ledgerline', since: 2022 },
	{ name: 'Rook Lane Inns', short: 'Rook Lane', unit: 'pubs', count: 74, tool: 'Tableau', provider: 'Quayside EPOS', late: true, since: 2019 },
	{ name: 'Vantor Opticians', short: 'Vantor', unit: 'practices', count: 130, tool: 'Power BI', provider: 'Ledgerline', since: 2023 },
	{ name: 'Marlow Pet Supplies', short: 'Marlow', unit: 'shops', count: 47, tool: 'SSIS', provider: 'Copperpoint', since: 2021 },
	{ name: 'Ashgrove Hotels', short: 'Ashgrove', unit: 'hotels', count: 15, tool: 'Looker Studio', provider: 'Quayside EPOS', late: true, since: 2022 },
	{ name: 'Quillon Stationers', short: 'Quillon', unit: 'shops', count: 33, tool: 'Excel Power Query', provider: 'Tillcraft', since: 2020 },
	{ name: 'Orchard Row Grocers', short: 'Orchard Row', unit: 'stores', count: 58, tool: 'Power BI', provider: 'Ledgerline', late: true, since: 2021 },
	{ name: 'Seabright Toys', short: 'Seabright', unit: 'stores', count: 29, tool: 'Tableau', provider: 'Copperpoint', since: 2024 },
	{ name: 'Hollins Shoes', short: 'Hollins', unit: 'stores', count: 61, tool: 'Airflow', provider: 'Tillcraft', since: 2019 },
	{ name: 'Brennock Hardware', short: 'Brennock', unit: 'branches', count: 40, tool: 'Qlik', provider: 'Ledgerline', since: 2022 },
	{ name: 'Delacourt', short: 'Delacourt', unit: 'stores', count: 95, tool: 'Power BI', provider: 'Copperpoint', since: 2020 },
	{ name: 'Tollgate Bowl', short: 'Tollgate', unit: 'bowling centres', count: 23, tool: 'Looker Studio', provider: 'Quayside EPOS', late: true, since: 2023 }
];
const firstNames = ['Gemma', 'Deepak', 'Bronwen', 'Stefan', 'Chidi', 'Farah', 'Lewis', 'Oksana', 'Trevor', 'Niamh', 'Rashid', 'Imogen', 'Piotr', 'Yvonne', 'Callum', 'Shreya', 'Desmond', 'Katya', 'Owen', 'Maribel', 'Arjun', 'Lorna', 'Kwame', 'Ingrid', 'Bashir', 'Tamsin', 'Elliot', 'Roisin', 'Hamza', 'Cerys', 'Dominika', 'Ayesha', 'Fergus', 'Linh', 'Rosalind', 'Gareth'];
const surnames = ['Whitlock', 'Banerjee', 'Okonkwo', 'Prentice', 'Kowalczyk', 'Haldane', 'Mistry', 'Trevelyan', 'Abara', 'Lindqvist', 'Farrow', 'Qureshi', 'Dunmore', 'Nakamura', 'Ellery', 'Castellanos', 'Brathwaite', 'Sorensen', 'Marchetti', 'Pike', 'Gallagher', 'Osei', 'Rowntree', 'Varga', 'McAllister', 'Doyle'];
const roles = ['Head of Retail Analytics', 'BI Developer', 'Finance Systems Analyst', 'Commercial Analyst', 'Data Engineer', 'Insight Manager', 'Trading Analyst', 'Finance Manager', 'Head of Operations', 'Reporting Analyst'];
const itRoles = ['IT Service Desk Lead', 'Infrastructure Engineer', 'IT Operations Manager', 'Systems Administrator'];
const towns = ['Harrogate', 'Stamford', 'Ludlow', 'Kendal', 'Truro', 'Bury St Edmunds', 'Hexham', 'Frome', 'Ripon', 'Malton', 'Wells', 'Totnes', 'Alnwick', 'Ely', 'Buxton', 'Oakham', 'Whitby', 'Marlborough', 'Cirencester', 'Keswick', 'Ilkley', 'Sherborne', 'Penrith', 'Saffron Walden', 'Bakewell', 'Lewes', 'Chichester', 'Durham', 'Lancaster', 'Shrewsbury', 'Leamington', 'Beverley'];
const places = ['', '', '', ' High Street', ' Retail Park', ' Station Road', ' Market Place', ' Riverside'];
const regionNames = ['North', 'North West', 'Yorkshire', 'Midlands', 'East', 'South West', 'South East', 'London', 'Wales', 'Scotland'];
const monitors = ['Pulsewatch', 'UptimeHound', 'Beacon Checks', 'Statusly'];
const colleagues = ['Priya', 'Jonah', 'Alys', 'Matteo', 'Zainab', 'Rory', 'Hollie', 'Tomasz', 'Ellen', 'Kayode'];

// Shared pieces, combined with every topic.
const greetings = ['Hi', 'Hello', 'Hi all', 'Good morning', 'Hello Wrenfield support', 'Dear support team', 'Hi {agent}', 'Morning'];
const signs = ['Thanks, {name}', 'Kind regards,\n{full}\n{role}, {client}', 'Best,\n{name}', 'Many thanks\n{full}', '{name}\n{role}', 'Cheers, {name}', 'Thanks\n{full} | {role} | {client}'];
const contexts = [
	'We have used Wrenfield since {since} for all {count} {unit}, and on the whole the reports just work, which is why this stands out.',
	'I look after reporting for {client}, so most of what comes from you lands with me.',
	'Our trading team rely on these figures every morning, so I would be grateful for a quick look.',
	'I took over the Wrenfield side from {colleague} in the summer, so forgive me if I am missing something obvious.',
	'For context, we pull the reports into {tool} and build our own packs on top.',
	'This is the first time I have had to write in about the reports, so I hope this is the right address.'
];
/** How things stand for the client this week, in passing. */
const situations = [
	'It is a busy week here: our trading director is visiting sites and wants the figures every evening.',
	'We are short-handed in the data team at the moment, so anything that saves us time is very welcome.',
	'Our peak trading starts in a few weeks, which is why I am trying to get everything straight now.',
	'I have copied in nobody else for now, but our finance director is waiting on the answer.',
	'I have already spent a morning on this before writing, so I hope you can tell me what I am missing.',
	'Our auditors are in next week, so I would love to have this settled before then.',
	'{colleague} in our team, who usually knows about these things, was stumped too.',
	'You were very helpful the last time I wrote in, so I am hoping for the same luck.'
];
const disclaimers = [
	'This email and any attachments are confidential and intended solely for the addressee. If you have received it in error, please notify the sender and delete it.',
	'{client} Ltd is registered in England and Wales. Registered office: {hq}.',
	'Our offices close at 17:30 on Fridays; emails received after then are answered on Monday.',
	'This message was sent from a shared mailbox monitored by the {client} data team during office hours.'
];
const handovers = ['Not ours, I think. {next}, can you take a look?', 'Doesn’t look like ours. Pulling in {next}.', 'Nothing on our side explains this. {next}, over to you?', '{next}, I think this one is yours; details above.'];
const intros = ['The client wrote:', '{name} wrote in on {openDay}:', 'Original email from {name} ({role}):', 'From {name}, by email this morning:', 'Here is what {name} sent us:'];
const relays = ['{name} replied:', 'Reply from {name}:', '{name} came back to me:', 'Answer from the client:', 'From {name}, just now:'];
const chasers = ['{name} has chased this today. Anything I can tell them?', 'The client chased again this morning. Any news?', 'Nudge: {name} asked for an update. They have a meeting about it on {day}.', 'Any update I can pass on? {name} has written twice since Friday.'];
const holds = ['Still on it. I should have something by {day}.', 'Sorry, it has been a busy week. Looking at it this afternoon.', 'Tell them we know what is happening and I will write here by {day}.', 'Half way there. One more thing to check and I will post here.'];
/** A second matter the client raises along the way, and who answers it. */
const asides: { q: string; who: Who; a: string }[] = [
	{ q: 'While I have you, could {colleague} be added to the recipients of the weekly export? They are taking over the Monday pack.', who: 'a', a: 'I’ve dealt with {name}’s other request myself: {colleague} is on the weekly export’s recipients from next Monday.' },
	{ q: 'Separately, do you have a status page we can subscribe to? Our service desk asks every time something looks odd.', who: 'a', a: 'Answered {name}’s other question: I’ve sent them the status page address and how to subscribe by email.' },
	{ q: 'Also, our renewal is coming up in the new year. Who should I talk to about adding the {n} new sites we are opening?', who: 'm', a: 'On the new sites: I’ll contact {name} directly this week. New sites are added on the existing contract at the same rate, so it is a short conversation.' },
	{ q: 'One more thing: can the weekly export include each site’s postcode? We currently join it in from another spreadsheet.', who: 'x', a: 'On the postcode: it’s a column we can add to their export. I’ve added it from next week’s run, at the end so their existing columns don’t move.' },
	{ q: 'Unrelated, but is there any training for new analysts? We have two starting next month.', who: 'a', a: 'I’ve answered {name}’s question about training: I’ve booked their two new analysts onto the monthly introduction call on the first Wednesday of next month.' },
	{ q: 'Do the dashboards work on tablets? The area managers have been given iPads.', who: 'd', a: 'On tablets: yes, the dashboards work on iPads in Safari. The store tables scroll sideways rather than shrink, which some people find odd at first.' },
	{ q: 'Could our invoices go to accounts payable rather than to me? They keep getting lost in my inbox.', who: 'm', a: 'On the invoices: I’ve changed the billing contact to their accounts payable address from the next invoice.' },
	{ q: 'Finally, can we have the dashboards in our own colours? Marketing keep asking.', who: 'd', a: 'On colours: not at the moment. Custom colours are on our list for next year; I’ve added {client} to the request.' },
	{ q: 'Is our data kept in the UK, by the way? Our auditors have asked.', who: 'a', a: 'Answered {name}’s other question about where the data is held: in the UK, and I’ve sent our data processing summary for their auditors.' },
	{ q: 'Also, we are closing {store2} at the end of {month}. Do we need to tell you, or does it just drop off?', who: 'r', a: 'On the closing site: nothing to do. Once its sales stop, it drops out of like-for-like after a full week, and its history stays in every report.' },
	{ q: 'While I am writing, could the Monday export arrive an hour earlier, at 05:00? Our pack goes out at 07:30.', who: 'x', a: 'On the earlier Monday run: moved to 05:00 from next week.' },
	{ q: 'Separate question: is there a way to see which of our people opened the dashboards last month? We are reviewing who still uses them.', who: 'd', a: 'On dashboard use: there is a monthly usage summary we can send. I’ve put {client} on the list for it, first one at the start of next month.' },
	{ q: 'Last thing: can I get last year’s figures for {store} as a one-off file? It is for a rent review.', who: 'x', a: 'On the one-off file for {store}: sent to {name} on Tuesday as a spreadsheet.' },
	{ q: 'Out of interest, when is the next price review? I need it for next year’s budget.', who: 'm', a: 'On prices: there is no change planned before April, and we give clients three months’ notice of any change. I’ve replied to {name} to say so.' }
];

// Topics. An escalation follows one path of one topic and one of that path's endings. Nothing about the part of the
// service it concerns or how it ended is written into the file except through the messages themselves; support's
// first note often names the wrong part.
interface Path {
	/** The client's answer to the first question. */
	detail: string[];
	/** The investigation that follows the answer. */
	look: Msg[];
	ends: Msg[][];
}
interface Topic {
	/** The first and last days an escalation on this topic can be opened, as YYYY-MM-DD. */
	since?: string;
	until?: string;
	/** Any other condition on the opening day. */
	when?: (open: number) => boolean;
	fits?: (client: Client) => boolean;
	/** How many times the topic is dealt in each round; 1 when left out. */
	weight?: number;
	it?: boolean;
	/** The report the pasted output shows. */
	path: string;
	subjects: string[];
	/** The team support passes it to first. */
	to: Who;
	guess: string[];
	open: string[];
	more: string[];
	checked: string[];
	ask: string[];
	/** A question on the way and its answer, one of which may come before the end. */
	follow: Msg[][];
	paths: Path[];
}

const timeoutFound: Msg = ['p', 'Found the runs in the audit trail. Every full-year call ends after almost exactly ten seconds with a 502, which is sluice giving up: UPSTREAM_TIMEOUT_MS is ten seconds in production, and sluice answers “upstream unavailable” whenever it stops waiting, whatever the reason. Their other exports come back in a second or two.\n\n{P:auditTimeout}'];
const queryFound: Msg[] = [
	['x', 'The export tool sends the dates exactly as chosen, as from and to on the report address. I’ve checked the stored settings for {short}’s export and they are right. Whatever loses them happens after us.'],
	['r', 'We received those calls with no dates at all, so we answered with our default, month to date. Every custom-range export since the 28th looks the same on our side:\n\n{P:calls}'],
	['p', 'That’s sluice. It builds the address it calls from the path alone and leaves the query string behind. Nothing sent a query string through sluice until custom ranges arrived, which is why nobody noticed.']
];
const headFound: Msg = ['p', 'There it is: their monitor sends HEAD, not GET. sluice only answers GET /healthz itself; a HEAD is passed on to the reports API like any other request, and the reports API has no /healthz, so it answers 404 after a round trip. Their monitor counts any answer as up, but at busy times that round trip runs past its two-second limit. That’s also why these checks show up in the audit trail at all: a GET /healthz never reaches it.\n\n{P:auditHead}'];
const redirectFound: Msg[] = [
	['p', 'sluice is handing back a redirect from the reports API exactly as it came. The reports API answers 301 with an address on its own internal host, and sluice neither follows redirects nor rewrites them, so {tool} tries to follow it to reports.internal, which only exists inside our network. This is what their side received:\n\n{P:redirect}'],
	['r', 'Ours, then. Weekly sales moved to /reports/sales/weekly in our release on 20 October and the old address redirects. We build the redirect from our own host name, which is wrong for anything that reached us through sluice.']
];

const topics: Topic[] = [
	// A full-year export runs into sluice's ten-second wait.
	{
		since: '2026-10-09',
		path: '/reports/daily',
		subjects: ['Year-to-date export fails every night', 'Export failing: upstream unavailable', 'Board pack export not arriving', 'Full-year sales export keeps failing'],
		to: 'r',
		guess: ['Reports API team, I think this one is yours: {short}’s biggest export has failed every night since {weekAgo} with “upstream unavailable”, which reads to me as the reports API falling over.', 'Escalating to the reports API. The client’s full-year export fails every night with an “upstream unavailable” error, while their smaller exports arrive as normal.'],
		open: [
			'Our year-to-date sales export by site has not arrived since {weekAgo}. The export history in the portal says “Failed: upstream unavailable” for every night. The weekly and daily exports all arrive as normal, so I assume something is wrong with that one report on your side.',
			'The export we use for the board pack, a full year of daily sales for all {count} {unit}, has failed every night this week. The email says the run failed with “upstream unavailable”. Nothing has changed at our end as far as I know, and it worked in August.',
			'Since about {weekAgo} our large export fails. It is the one with every site and every day since 1 January. Smaller date ranges work when I run them by hand from the portal, but the full one fails after a few seconds.'
		],
		more: ['The board pack goes to the directors on {day}, so I need the file by then one way or another.', 'We load this file into our own warehouse overnight, so when it fails two of our internal reports go stale as well.', 'I ran it by hand twice this morning and got the same error both times.'],
		checked: ['The export history shows the same failure every night since {weekAgo}, and their other exports ran fine. Nothing on the status page.\n\n{P:historyTimeout}', 'I re-ran it from the admin portal at {clock} and it failed again after about ten seconds. No incident open.'],
		ask: ['We’ve had no outage, and I can see no errors for {short} on our side, so we answered whatever reached us. “Upstream unavailable” is sluice’s wording, though. {agent}, could you ask the client roughly how big the file normally is, and I’ll get platform to look at what sluice saw?', 'Nothing failed on our side at 02:00 on any of those nights. That message comes from sluice, not from us. Before I pull platform in: how many rows does the file usually have, and when did it last arrive?'],
		follow: [[['c', 'Does this mean our other exports are at risk as the year goes on? The stock export covers the whole year too.'], ['p', 'Only calls that take more than ten seconds to answer are cut off. Their stock export comes back in under two seconds even for the full year, so it has plenty of room.']], [['a', 'Is there anything the client could have done to cause this? {name} has asked me twice.'], ['p', 'No. Nothing in how they call it has changed: same report, same account, same time of night. The only difference is how long the answer takes to come back.']], [['c', 'Could you re-send the last file that worked, so that at least we have something for the pack?'], ['x', 'Re-sent the file from {weekAgo} to {name} this morning, from our archive. Files are kept for thirty days.']]],
		paths: [
			{
				detail: ['It is usually around {rows} rows, about {mb} MB as CSV. It last arrived on {weekAgo}, and it has been getting slower to arrive all year, if that helps.', 'The last good file was on {weekAgo}. It had {rows} rows, one per site per day, with net sales, transactions and units.'],
				look: [timeoutFound, ['r', 'That fits. A full year for {count} {unit} takes {secs} seconds on our side now; it crept past ten seconds as the year filled up. We can look at making it quicker, but not before the end of the month.']],
				ends: [
					[['p', 'We’d rather not raise the timeout for everyone to suit one report: every slow call would then hold a connection open for longer.'], ['x', 'Then let us split it. The export tool can fetch the year as twelve monthly calls and join them into one file before sending; each month comes back in about a second. Same file, same time. OK to set that up for {short}?'], ['a', 'Yes please. I’ve explained it to {name}, who is happy as long as the file looks the same.'], ['x', 'Done. Last night’s run went through in twelve parts, {rows} rows in all, sent at 02:16.'], ['c', 'The file arrived this morning and the board pack figures tie up with last month’s. Thank you all.']],
					[['x', 'Splitting by month on our side gets round it today. I’ve set {short}’s export to fetch twelve months and join them; it went through at 02:11 last night.'], ['c', 'Received, and it matches the totals on the dashboard. That will do us, thanks.'], ['a', 'Closing this. {r}, I’ve left a note about the slow full-year query on your board in case it comes up again.']]
				]
			},
			{
				detail: ['About {rows} rows. I can’t remember exactly when it last worked; the week before last, I think.', 'Around {mb} MB. The last one we have is from {weekAgo}.'],
				look: [timeoutFound, ['x', 'And this is what hurts us: a 502 from sluice means “try again later”, so the export tool waits an hour, tries again and fails again. If sluice told us when it had stopped waiting, rather than giving the same answer as an outage, the tool could split the run into smaller pieces by itself.']],
				ends: [
					[['p', 'Fair. A timeout should be a 504 with a message of its own, and the 502 kept for when the reports API can’t be reached at all. That’s a change to sluice and it’s on the list for the next release. I’ll update here when it’s out.'], ['a', 'Told {name} we’re changing how these failures are reported, and that the export will then split itself. Until then they’re running the year in two halves by hand from the portal.'], ['c', 'That is workable for a couple of weeks. Please let me know when the change is in so we can put the full export back on the nightly schedule.'], ['a', 'Leaving this open until the sluice change is out and the export is back on its nightly run.']]
				]
			},
			{
				detail: ['About {rows} rows. It used to arrive within a minute or two of 02:00, which never bothered anyone.'],
				look: [timeoutFound, ['r', 'Found it. Since the data migration on 2 October the daily sales table has been missing its index on site and day, so the full-year query reads the whole table. It takes {secs} seconds now; in September it took under three.']],
				ends: [
					[['r', 'Index rebuilt this morning. The full-year query for {short} is back to 2.6 seconds, well inside sluice’s ten.'], ['a', 'Re-ran the export from the portal and it went through: {rows} rows. I’ve let {name} know.'], ['c', 'Got it, thank you. The board pack is back on track.']]
				]
			}
		]
	},
	// Custom date ranges reach the reports API without their dates.
	{
		since: '2026-10-29',
		weight: 3,
		path: '/reports/daily',
		subjects: ['Duplicate rows in our daily import', 'Custom date range ignored', 'Export for last week contains this month', 'Date range on export not working'],
		to: 'x',
		guess: ['Exports team, over to you: {short} set up one of the new custom-range exports and say the file ignores the dates they chose.', 'I think this is the new custom date range in exports. The client’s file has far more rows than the range they picked.'],
		open: [
			'As soon as the new custom date range option appeared, we set up a daily export from the previous day to the previous day, so that we can append each file to our warehouse. Every file we have received holds the whole month so far, so our warehouse now has the first days of the month in it several times over.',
			'I created an export for one week in the middle of October using the new date range fields, for a stocktake reconciliation. The file that arrived starts on the 1st of {month} and has nothing from the week I asked for.',
			'We have started using the custom date range on two of our exports. Both files come back with the same rows whatever dates we choose. I have tried changing the range twice and re-running, with the same result.'
		],
		more: ['Could you look at it before our month-end close on {day}?', 'I have attached nothing because the file is large, but I can send it if it helps.', 'The preset ranges we used before always worked.'],
		checked: ['Their export settings show the custom range as they describe. The files we sent do have more rows than the range should give.', 'I opened the latest file: it starts on the 1st of the month whatever the range says.'],
		ask: ['Can you get me the name of the export and the exact range they set, and whether they use the preset ranges anywhere as well?', 'Which export is it, and what range do they have on it? I’d like to compare with what the tool sent.'],
		follow: [[['c', 'Is any of our other data affected? We also pull stock levels every night.'], ['x', 'Their stock export uses a preset range, so it isn’t affected. I checked last night’s file: one day, as expected.']], [['a', 'Do we know how many clients have custom-range exports?'], ['x', 'Seven so far. The option only went live on 28 October, so it is a short list.']], [['c', 'Can you send us correct files for the days that went wrong?'], ['x', 'Once we know what went wrong, yes. Delivered files are kept for thirty days, so nothing is lost.']]],
		paths: [
			{
				detail: ['The export is “Daily sales – warehouse”, range from yesterday to yesterday, delivered at 06:00. The other one, “Stock moves”, uses the preset “Last 7 days” and seems fine.', 'It is “Stocktake week” with a fixed range, a week in October, run on demand. We do not use the presets for that one.'],
				look: queryFound,
				ends: [
					[['p', 'Passing the query string on is a small change to sluice and it will go out with the next release. Until then every custom-range export is affected, not just {short}’s.'], ['x', 'I’ve hidden the custom range option for new exports and written to the clients who use it.'], ['a', 'Told {name}. They would rather wait for the fix than change their import, so I said we’ll let them know when it’s out and re-send the files for the days affected.'], ['c', 'Thanks. We have taken the duplicates out on our side for now. Please do let us know when it is fixed.']],
					[['x', 'Until sluice passes the dates on, the preset “Yesterday” range gives {short} exactly what they want, because each preset is its own report address and needs no dates. I can switch their export to it today.'], ['c', 'Switched over, and this morning’s file had one day in it, as it should. That will do us fine; we do not need custom ranges for anything else.'], ['a', 'Great. Closing this here; the sluice change for custom ranges is being handled by platform.']]
				]
			},
			{
				detail: ['It is “Daily sales – warehouse”, on the preset “Yesterday” range, at 06:00. We have not touched the custom range at all, now that I look.'],
				look: [['x', 'Then this isn’t the custom-range problem. Their export is on the preset, and each file we sent held one day. The download record is the odd part:\n\n{P:deliveries}'], ['a', 'So the files are right but some were fetched twice?'], ['x', 'Fetched twice from the download link, minutes apart. If their import job loads whatever it fetches, each double fetch would put a day in twice.']],
				ends: [
					[['c', 'Our IT team found it. The import job was re-run after a network drop and loaded the same file a second time. They are adding a check on the file name so that it cannot happen again. Sorry for the trouble.'], ['a', 'No trouble, glad it’s found. Nothing to change on our side, so I’ll close this.']],
					[['a', 'I’ve sent {name} the download times and asked them to check whether their import job ran twice on those mornings.'], ['c', 'Thanks. Our IT team are looking into the import job. I will let you know if we still see duplicates once they have been through it.']]
				]
			}
		]
	},
	// A client's uptime monitor checks /healthz with HEAD.
	{
		since: '2026-10-08',
		it: true,
		path: '/healthz',
		subjects: ['Your service was down {N} times last week', 'Uptime monitor alerts on your health check', 'Health check failing several times a day', 'Status address keeps reporting down'],
		to: 'p',
		guess: ['Platform, probably one for you: {short}’s IT team monitor our health check and say we were down dozens of times last week. I can’t see any incident on our side.', 'Escalating: the client’s monitoring says our service keeps going down for a minute or two at a time. Nothing on the status page for any of it.'],
		open: [
			'We added your health check address, the one ending /healthz from the onboarding pack, to our uptime monitoring when we connected {tool} to your reports. Since then it has alerted {N} times in a week, each time for one or two checks, and then it recovers. Our users have not noticed anything at those times, but our service desk has to treat every alert as an incident.',
			'Our monitoring reports your /healthz address as down several times a day, mostly in the morning. Each alert clears within two minutes. Is the address in your onboarding pack still the right one to watch?',
			'Since we started monitoring your service three weeks ago our monitor has recorded a short outage almost every weekday morning. We would like to understand whether these are real before we report the figures to our board.'
		],
		more: ['If these are real outages we need to raise them under our contract; if not, we need to stop the alerts.', 'Our monitor is set to alert after a single failed check.', 'Most alerts are between 07:30 and 09:30.'],
		checked: ['No incidents in the last month. The status page was green at every time they list.', 'I checked three of their alert times against our incident record: nothing at any of them.'],
		ask: ['/healthz is answered by sluice itself and doesn’t depend on the reports API, so it should stay up whatever else is happening. Can we have the exact address they check, how often, from where, and what kind of check their tool runs?', 'Nothing on our side matches these times. Could you ask which monitoring tool they use, the check type and timeout, and the exact address?'],
		follow: [[['c', 'Can you confirm there were no real outages last week? Our service desk need it for their monthly report.'], ['p', 'Confirmed: no outage of any part of the service last week. The status page history says the same, and I’m happy to put it in writing.']], [['a', 'Should we change the onboarding pack? It just says “monitor /healthz”.'], ['p', 'Probably worth saying more about how to check it. I’ll ask whoever owns the pack.']], [['c', 'How often can we check the address without causing you any trouble?'], ['p', 'Once a minute from two or three places is no trouble at all.']]],
		paths: [
			{
				detail: ['We use {monitor}, checking every minute from London with the default HTTP check and a two-second timeout. The address is the /healthz one from your pack. Here is the last morning:\n\n{P:monitorHead}'],
				look: [headFound],
				ends: [
					[['a', 'Explained to {name} and suggested they set the check to GET.'], ['c', 'Changed the check to GET yesterday morning. No alerts since, and the response time is a steady 20 milliseconds. Thanks for getting to the bottom of it.'], ['a', 'Good to hear. Closing.']],
					[['c', 'Our {monitor} plan only allows HEAD on one-minute checks; GET is on the more expensive plan. Can you not answer HEAD on that address as well?'], ['p', 'We can, and we should: answering HEAD /healthz in sluice like GET, without the body, is a small change. It’ll be in the next sluice release. I’ll post here when it’s deployed.'], ['a', 'Told {name}. They have muted the alert until then and will turn it back on once we confirm.']]
				]
			},
			{
				detail: ['We use {monitor}, checking every minute from London and Singapore, GET, with a one-second timeout. Here is yesterday morning:\n\n{P:monitorFar}'],
				look: [['p', 'Nothing failed on our side. GET /healthz is answered by sluice directly and takes well under a millisecond; it never even reaches the audit trail. Every failure in their table is from the Singapore probe, and every one is a little over a second. That’s the distance from Singapore plus their one-second limit, not us.']],
				ends: [
					[['a', 'Passed on the explanation and suggested a longer timeout for the far-away probe.'], ['c', 'Our team raised the timeout to five seconds and have had no alerts since. Thank you, and sorry for the noise.'], ['a', 'Closing this one.']],
					[['a', 'Sent {name} the explanation and the timings, and suggested either a longer timeout or dropping the Singapore probe.'], ['c', 'Thanks. Our infrastructure team will decide which, but not before {day}. I will let you know if the alerts carry on afterwards.']]
				]
			}
		]
	},
	// A moved report redirects to the reports API's own host.
	{
		since: '2026-10-27',
		weight: 2,
		path: '/reports/weekly-sales',
		subjects: ['Weekly sales refresh failing since Tuesday', 'Error: could not resolve host reports.internal', '{tool} refresh broken', 'Has the weekly sales address moved?'],
		to: 'p',
		guess: ['Platform, the client’s {tool} refresh is being sent to a host called reports.internal, which sounds like something on our side pointing them somewhere it shouldn’t.', 'Escalating to platform: {short}’s weekly refresh fails with a host name I’ve never heard of.'],
		open: [
			'Our {tool} refresh of the weekly sales report has failed every day since {rel}. The error says it could not resolve the host reports.internal. We never call that address; we call the one in your documentation, and it worked for two years.',
			'Since last week, the weekly sales data in {tool} will not refresh. The error mentions a redirect and a host called reports.internal. Has something moved on your side?',
			'The weekly sales feed stopped working on {rel}. Daily sales, stock and footfall all still refresh. The error is: “could not resolve host: reports.internal”.'
		],
		more: ['Every Monday report we send to the stores is built on this feed.', 'We have changed nothing on our side. I checked with our infrastructure team.', 'I can send a screenshot of the error if it helps.'],
		checked: ['Their other feeds are refreshing fine. Only weekly sales fails.', 'The weekly sales dashboard works for them; it is only {tool} that fails.'],
		ask: ['Which address does {tool} call for weekly sales, exactly, and when did it last refresh successfully?', 'Can you get me the report path {tool} calls and the time of the last good refresh?'],
		follow: [[['c', 'Are other reports moving? We would rather know before the next one breaks.'], ['r', 'Nothing else is planned to move this year. If anything does, clients will be told a month ahead, which we should have done this time.']], [['a', 'Why does the weekly sales dashboard still work for them?'], ['d', 'The dashboards already use the new address; we switched before the release. Only callers on the old address get the redirect.']], [['c', 'Is there a list of the current report addresses somewhere?'], ['r', 'The client documentation has them. I’ve sent {name} the current page.']]],
		paths: [
			{
				detail: ['It calls /reports/weekly-sales with the store group and the week. The last good refresh was on {weekAgo}.', 'The path is /reports/weekly-sales. It last refreshed the Monday before last.'],
				look: redirectFound,
				ends: [
					[['r', 'We now send our redirects as relative addresses, so they point back through sluice whatever host the caller used. Deployed this morning.'], ['a', 'Asked {name} to refresh.'], ['c', 'Refreshed first time. Thank you.']],
					[['r', 'Quickest thing for them is to call the new path directly. We’ll correct the redirect, but not this week.'], ['a', 'Passed that on with the new address.'], ['c', 'Updated the address in {tool} to /reports/sales/weekly and it refreshed fine. That is all we needed, thanks.']],
					[['p', 'Other services behind sluice could do the same. We’d rather sluice rewrote any redirect that points at the reports API’s own host so that it points at sluice instead. That’s a change to sluice; I’ll write it up for the next release.'], ['r', 'Fine by us. We’ll leave ours as it is until that’s in, so it isn’t fixed twice.'], ['a', 'Told {name}. The old address is in a dozen of their reports, so they’d rather wait for the change than edit them all. Leaving this open until it’s out.']]
				]
			}
		]
	},
	// Late-night takings land on the previous day while the clocks are on summer time.
	{
		until: '2026-10-23',
		fits: (client) => client.late === true,
		path: '/reports/daily',
		subjects: ['Friday night takings in the wrong day', 'Late sales counted on the previous day', 'Daily totals don’t match the tills', 'Saturday figures too low'],
		to: 'r',
		guess: ['Reports API team: {short}’s daily sales don’t match their tills for late-opening sites, and the difference is always on the busy nights.', 'Passing to the reports API: the client says their daily figures move money between days.'],
		open: [
			'Our daily sales never agree with the till reports for our late {unit}. The difference is always the takings in the first hour after midnight: our tills put them on the new day, your report puts them on the day before. On a Friday at {store} that is a few thousand pounds in the wrong place, and our managers are asked to explain the gap every Monday.',
			'Friday totals in your report are always higher than our till system’s, and Saturday’s lower by about the same amount. It only happens at sites open after midnight.',
			'Our finance team have spent two weeks reconciling last month against the tills. Every site that trades after midnight is out, and only those.'
		],
		more: ['We would like to know which figure to trust before the October close.', 'It has been like this since at least the spring, now that we look back.', 'Our till system puts every sale on the calendar day it was rung up.'],
		checked: ['I compared one Friday at {store} on the dashboard with the figure they quote: different by {gap}.', 'The difference is only at their late sites, as they say.'],
		ask: ['Can they send one site’s takings by hour for one Friday night, from their tills, so we can line it up with ours?', 'Could we have the till figures for one late site for one weekend, by hour?'],
		follow: [[['c', 'Does this affect the weekly figures too, or only the days?'], ['r', 'Only the days and anything built from them. A week runs from midnight UTC on Monday to the next, so a week moves by the same hour at each end, which mostly cancels out.']], [['a', 'Is it only their late-opening sites?'], ['r', 'Only sites that trade between midnight and one in the morning while the clocks are on summer time. For everyone else nothing moves.']]],
		paths: [
			{
				detail: ['Here is {store} for the night of Friday {friday}, from our tills, against your daily report:\n\n{P:tzsplit}'],
				look: [['r', 'That’s our day boundary. We cut days at midnight UTC, not UK time. While the clocks are on summer time, midnight UTC is 01:00 here, so a sale at 00:30 on Saturday morning counts towards Friday. Their tills cut at midnight UK time, so the hour between midnight and one lands on different days in the two.']],
				ends: [
					[['r', 'Days in each site’s local time are on our plan for the first quarter. Until then the gap disappears when the clocks go back on the 25th and returns at the end of March.'], ['a', 'Explained to {name}, with the dates.'], ['c', 'Understood. Please keep us posted; our finance team will put a note in the October accounts.']],
					[['r', 'Days in each site’s own time are planned for next year. Until then, the hourly sales report gives every hour with its UTC time, so if they add the hours up by UK time in {tool} they get days that match their tills.'], ['x', 'Set up an hourly export for them, delivered at 06:00 with yesterday’s hours.'], ['c', 'We have rebuilt the daily totals from the hourly file in {tool}, and last week matches our tills to the penny. That will do us until the report changes.']]
				]
			}
		]
	},
	// The dashboard and the export disagree.
	{
		path: '/reports/weekly',
		subjects: ['Dashboard and export totals disagree', 'Weekly totals out between dashboard and file', 'Which figure is right?', 'Export doesn’t match the dashboard'],
		to: 'x',
		guess: ['Exports team: {short}’s weekly export doesn’t agree with the dashboard. I assume the export is the odd one out.', 'I think the export is wrong here: the client’s weekly file doesn’t match what they see on screen.'],
		open: [
			'Our finance team compare the weekly export with the sales dashboard every Monday, and they never quite agree. The auditors have now asked which one is right, and I cannot tell them.',
			'The region totals on the dashboard do not match the same week in the export. The difference is not huge, but it is there every week.',
			'I built a check in {tool} that compares your weekly file with the dashboard figures, and it fails every week.'
		],
		more: ['The auditors are back on {day}.', 'I would like to understand the difference rather than just be told which to use.', 'Last week’s difference was {gap} on the total.'],
		checked: ['I compared last week: the dashboard says one figure, the export another, as they say.', 'Pulled up their weekly export and the dashboard side by side. They differ.'],
		ask: ['Can they send their comparison for one week, by site? I want to see whether the difference is everywhere or in a few places.', 'Could we have one week of their comparison, site by site?'],
		follow: [[['c', 'Which figure should we give the auditors for September while you look?'], ['x', 'I’d hold off until we know where the difference comes from; I’d rather not guess.']], [['a', 'Has anyone else reported this?'], ['x', 'Not that I can find in the last three months of escalations.']]],
		paths: [
			{
				detail: ['Here are the first sites from last week:\n\n{P:compareRound}'],
				look: [['x', 'The export carries the figures to the penny exactly as the reports API sends them, so this looks like rounding somewhere else. Every site is out by less than a pound.'], ['d', 'It’s us. The region tiles round each site to the nearest pound before adding them up. Across {count} {unit} that drifts by a few pounds a week.']],
				ends: [
					[['d', 'Fixed in Thursday’s release: the tiles now add the exact figures and round once at the end.'], ['c', 'This week’s figures agree to the penny. Thank you.']],
					[['d', 'We’ll change the tiles to round once at the end, but it needs a design review, so it won’t be this month. The export is the exact figure.'], ['a', 'Told {name} the export is exact and why the dashboard drifts.'], ['c', 'Thank you, that is what the auditors needed. We will use the export as the record and wait for the dashboard change.']]
				]
			},
			{
				detail: ['Here is last week by site. Most match; a few are a long way out:\n\n{P:compareClosed}'],
				look: [['x', 'The sites that differ all closed or opened during the week. Their export has “trading sites only” ticked, which leaves out any site that didn’t trade all seven days. The dashboard counts every site.']],
				ends: [
					[['a', 'Asked {name} whether they want the setting off.'], ['c', 'Yes please, take it off. We want every site, open or not.'], ['x', 'Done; from tonight their weekly export has every site.'], ['c', 'This Monday’s file matches the dashboard. Thanks.']]
				]
			},
			{
				detail: ['Here is the comparison. Our dashboard figures are typed in from the screen by the team:\n\n{P:compareTyped}'],
				look: [['x', 'The export and the reports API agree exactly for every site. The dashboard shows the same figures too, when I open it for that week. The differences are only in their comparison sheet.'], ['a', 'So the sheet itself is off?'], ['x', 'Looks like it. Three sites have their figures swapped, and the total row stops before the last few sites.']],
				ends: [
					[['c', 'You are right, and I am embarrassed. Our sheet’s total stopped at row 60 and two figures were typed into the wrong rows. Fixed, and everything agrees.'], ['a', 'No need to be. Closing this.']]
				]
			}
		]
	},
	// Yesterday's figures are missing first thing.
	{
		path: '/reports/daily',
		subjects: ['Yesterday’s figures missing at 7am', 'Morning dashboard empty', 'Daily export arrived without yesterday', 'Data late again'],
		to: 'r',
		guess: ['Reports API team: {short} had no figures for yesterday when their managers opened the dashboard this morning, for the third time this week.', 'Escalating to the reports API: the client’s daily figures arrive late.'],
		open: [
			'For the third time this week, the dashboard had nothing for yesterday when our area managers opened it at seven. By ten o’clock it was all there. The managers run their morning calls from that page, so an empty day is a real problem.',
			'Our 06:30 export arrived this morning with no rows for yesterday, and again on {rel}. Later in the day the dashboard is fine.',
			'The morning sales flash we send to the board is built from your 06:00 export, and twice this week it has gone out with yesterday missing.'
		],
		more: ['Nothing has changed on our side that I know of.', 'The managers have started printing yesterday’s figures the evening before, just in case, which defeats the point.', 'Last month this never happened once.'],
		checked: ['The dashboard has yesterday now, so whatever it was has caught up.', 'Their export ran on time at 06:30 and contained no rows for yesterday.'],
		ask: ['We load each client’s till files as they arrive. Let me check when {short}’s arrived on those mornings. Which days were affected?', 'Which mornings, exactly? I’ll check the file arrivals.'],
		follow: [[['c', 'Is there a way to be told when the data is late, rather than finding out from an empty page?'], ['r', 'Not today. A notice on the dashboard when a client’s files are late has been suggested, but it isn’t planned.']], [['a', 'What time is the data normally ready for them?'], ['r', 'Usually by 05:30: their files arrive around 04:30 and take a few minutes to load.']]],
		paths: [
			{
				detail: ['{rel}, the day before and this morning. Before that it was always fine.'],
				look: [['r', 'Their till files arrived late, nothing to do with us. Their till provider, {provider}, normally sends by 05:00:\n\n{P:feedsLate}']],
				ends: [
					[['a', 'Sent {name} the arrival times and suggested they ask {provider}.'], ['c', 'We have asked {provider} why their nightly send has moved. They are looking into it and say it will take a week or so.'], ['a', 'Thanks. We’ll keep watching the arrivals; let us know what {provider} say.']],
					[['a', 'Explained, and offered to move their export later.'], ['c', 'Please move the export to 09:30. We have told the area managers to open the dashboard after nine until {provider} sort themselves out.'], ['x', 'Moved to 09:30 from tomorrow.']]
				]
			},
			{
				detail: ['Monday, Tuesday and today.'],
				look: [['r', 'The files arrived on time:\n\n{P:feedsOnTime}'], ['r', 'The problem was our nightly load. {provider} added a column to their file on Sunday, our load rejected the files, and the morning retry picked them up only after eight. It hit {n} clients.']],
				ends: [
					[['r', 'The load now ignores columns it doesn’t know. Tonight’s files went through at 05:12.'], ['a', 'Told {name} it was on our side and is fixed.'], ['c', 'This morning was fine. Thanks for owning up to it.']]
				]
			}
		]
	}
];

topics.push(
	// Month-end exports meet the reports API's per-client limit.
	{
		since: '2026-10-01',
		when: (open) => at(open).getUTCDate() <= 7,
		weight: 2,
		path: '/reports/monthly',
		subjects: ['All our monthly exports failed on the 1st', 'Month-end pack missing', 'Error 429 on the monthly reports', 'Monthly exports failed overnight'],
		to: 'x',
		guess: ['Exports team: most of {short}’s monthly exports failed overnight on the 1st. The export history says “429 Too Many Requests”, which means nothing to me.', 'Over to exports: the client’s month-end exports failed in bulk, and they were all fine when I re-ran them.'],
		open: [
			'Only two of our monthly exports arrived on the 1st. We have {n} of them, one per region plus the group totals, and the month-end pack cannot go out without them.',
			'The monthly exports failed again. It happened last month too, but we put it down to bad luck. The export history says “429” against most of them, whatever that means.',
			'Our month-end process starts at 07:00 on the 1st with your exports. This month most of them were missing, and the team spent the morning running them by hand from the portal.'
		],
		more: ['Running them by hand worked, so the reports themselves are fine.', 'We need to know this will not happen at the next month end; the pack goes to our lenders.', 'I have counted: {n} of {N} failed.'],
		checked: ['Their export history shows the failures, all within the first two minutes after midnight:\n\n{P:historyThrottle}', 'I re-ran two of the failed exports from the portal and both went through in seconds.'],
		ask: ['All their monthly exports are scheduled for exactly 00:00 on the 1st. Were they set up that way on purpose? I’ll ask the reports API team what happened at that minute.', 'They all start at midnight on the dot. Do they need them that early, or just by the morning? Reports API team, did {short} hit your limit?'],
		follow: [
			[['c', 'Does this affect the dashboards at month end as well? The regional managers all open them first thing on the 1st.'], ['r', 'Dashboards count towards the same limit, but by the time people open them at seven the exports are long finished, so there is plenty of room.']],
			[['a', 'Why didn’t this happen before the summer?'], ['r', 'They added the regional exports in the summer. Before that they had half as many, and they fitted under the limit.']]
		],
		paths: [
			{
				detail: ['They are all set to midnight because that is what the set-up form suggested. We only need them by 06:00.', 'Nobody chose midnight on purpose. As long as everything is there by six, the time does not matter.'],
				look: [['r', 'Yes. Every client gets 60 calls a minute, and at midnight on the 1st {short} sent several hundred in the first two minutes: their monthly exports, each split into batches of sites, plus a scheduled {tool} refresh. Everything above the limit was refused with a 429, and sluice passed it back as it came:\n\n{P:throttle}'], ['x', 'And our export tool treats a 429 as a final failure, which it shouldn’t. It gives up instead of waiting a minute.']],
				ends: [
					[['x', 'Fixed: the export tool now waits and tries again when the reports API refuses a call with 429, for up to a quarter of an hour. Deployed today, for every client.'], ['a', 'Told {name}, and that their exports will now get through even if they all start at midnight.'], ['c', 'Thank you. We will watch the 1st closely and let you know.']],
					[['x', 'For {short} the quickest answer is to spread them out. I’ve suggested starting times twenty minutes apart from midnight.'], ['c', 'That is fine, as long as everything has arrived by 06:00. Please go ahead.'], ['x', 'Done. The last one now starts at 03:00 and normally takes four minutes.']],
					[['r', 'A higher limit at month end for every client would avoid this altogether. It needs capacity planning on our side, so it is pencilled in for January.'], ['a', 'Told {name}. Until it’s in, I’ll re-run anything that fails on the 1st first thing, and they know to tell me.'], ['c', 'OK. We will live with that until January, but please do not let it slip.']]
				]
			}
		]
	},
	// A site that moved region takes its history with it.
	{
		path: '/reports/regions',
		subjects: ['Last year’s regional figures have changed', 'Region comparison is wrong', '{store} has moved region and taken its history', 'Like-for-like by region looks off'],
		to: 'r',
		guess: ['Reports API team: {short}’s region figures for last year have changed since they printed them in the summer.', 'Passing to the reports API: last year’s region totals are different from a month ago, and the client wants to know why.'],
		open: [
			'Our {region} region’s figures for last year have changed. The pack we printed in August shows one total, the dashboard now shows another, and our regional managers are asking whether we have restated last year.',
			'In September we moved {store} from {region} to {region2}. Now the whole of {store}’s history shows under {region2}, so {region} looks as if it has shrunk and {region2} as if it has grown.',
			'Our region comparison against last year is wrong. We reorganised two regions in the summer, and the comparison seems to treat the new regions as if they had always existed.'
		],
		more: ['The regional managers’ bonuses are based on growth against last year, so this matters a great deal to them.', 'Is there a way to see the regions as they were?', 'I would like to understand the rule before I explain it to our directors.'],
		checked: ['The site list in their account shows the moves, effective from the summer.', 'Their regions were changed in the account settings during the summer; nothing since.'],
		ask: ['Which sites moved, and from when? I want to check how their history is attributed.', 'Can we have the list of sites that changed region, with the dates?'],
		follow: [
			[['c', 'Will the same happen when we open new sites in the spring?'], ['r', 'New sites have no history, so nothing moves. It only happens when an existing site changes region.']],
			[['a', 'Is the group total affected, or only the regions?'], ['r', 'Only the regions. The group total is the same whichever region a site sits in.']]
		],
		paths: [
			{
				detail: ['Here are the moves:\n\n{P:hierarchy}', 'This is everything that moved this year:\n\n{P:hierarchy}'],
				look: [['r', 'That is how the reports work today: every figure is shown under the site’s current region, history included. We keep no record of which region a site was in at the time, so we can’t show last year “as it was”.']],
				ends: [
					[['r', 'Showing regions as they were at the time would need a change to how sites are stored. It is a product decision, so I’ve passed it to {g}.'], ['g', 'Thanks. Two other clients have asked for the same. I’ve added {client} to the request and we’ll look at it when we plan next year.'], ['a', 'Told {name} it has gone to product and that there is no date yet.']],
					[['r', 'What we can do today: the “site list as at” export gives each site’s region on any date. If they join it to last year’s figures in {tool}, they get last year by the old regions.'], ['x', 'Set up a one-off “site list as at 1 July” export for them and sent it.'], ['c', 'That works. We have rebuilt the comparison in {tool} with the old regions and the managers are happy with it.']]
				]
			}
		]
	},
	// A site appears twice in an export.
	{
		path: '/reports/weekly',
		subjects: ['Two lines for the same site', '{store} appears twice in the export', 'Duplicate site in the weekly report', 'Weekly total too high'],
		to: 'x',
		guess: ['Exports team: {short}’s weekly export lists one of their sites twice, so the total is too high.', 'Over to exports: a duplicated site in the client’s weekly file.'],
		open: [
			'This week’s export has {store} on two lines with different figures. Added together they are about right for the site, but our import treats them as two sites and the site count is now one too many.',
			'Our weekly total is higher than the sum of our sites, and {store} appears twice in the file with different codes.',
			'Since last week {store} has two rows in every export. Nothing else looks wrong, but our import job rejects the file because of it.'
		],
		more: ['Did something change with {store} recently? It was refitted in the summer.', 'I have had to correct the file by hand twice now.', 'Our import rejects any file with a duplicate site name.'],
		checked: ['I can see {store} twice in this week’s file, once as {code} and once as {code2}.', 'The two rows have different site codes and the same name.'],
		ask: ['Can they confirm which code {store} should have? It has two in our records.', 'Which is the right code for {store}, {code} or {code2}? Something has given it two.'],
		follow: [
			[['c', 'Are any of our other sites affected?'], ['r', 'No. {store} is the only site in their account with two records.']],
			[['a', 'Does the dashboard show it twice as well?'], ['d', 'Yes, the site table lists it twice too. It reads from the same report.']]
		],
		paths: [
			{
				detail: ['{code} has always been {store}. I do not recognise {code2}.', 'The code is {code}. We have never used {code2} for anything.'],
				look: [['x', 'The export is exactly what the reports API returned for the week, so the duplicate comes from there.'], ['r', 'Ours. When {store} was renamed after the refit, a second site record was created with the new name, and the weekly report joined sales to sites by name rather than by code, so the sales were split across both:\n\n{P:dupStores}']],
				ends: [
					[['r', 'The weekly report now joins on the site code, and the extra record is gone. I’ve re-run the last two weeks.'], ['x', 'Re-sent both weeks’ exports to {short}.'], ['c', 'Both files have one {store} and the totals tie. Thank you.']]
				]
			},
			{
				detail: ['Ah. {store} moved across the road in August and our finance team gave it a new code, {code2}. Both codes are in the site list we send you. I am not sure which we should keep.'],
				look: [['r', 'Then the report is doing what it’s told: two codes in their site list, two sites. Sales up to the move are under {code} and after it under {code2}, which is why the week of the move has both:\n\n{P:dupStores}']],
				ends: [
					[['a', 'Asked {name} which code to keep, and whether the old history should move to the new code.'], ['c', 'I need to check with our finance team; they own the site list. I will come back to you next week.']],
					[['c', 'Finance say keep {code2} and merge the history into it. They have taken {code} out of the site list they send.'], ['r', 'Merged. From this week {store} has one row, {code2}, with all its history.'], ['a', 'Told {name}. Closing.']]
				]
			}
		]
	},
	// Week numbers against a retail calendar.
	{
		path: '/reports/weekly',
		subjects: ['Week numbers don’t match our calendar', 'Period totals wrong', 'Your week 41 is our week 36', 'Retail calendar support?'],
		to: 'r',
		guess: ['Reports API team: {short} say our week numbers don’t match theirs, so every period total is off.', 'Escalating to the reports API: the client’s weeks and periods don’t line up with ours.'],
		open: [
			'Your weekly reports number the weeks from January. Our financial year starts on the first Sunday in February and runs 4-4-5, so your week 41 is our week 36 and none of the period totals match our accounts.',
			'Our periods are 4-4-5 weeks from February. Every month the finance team rebuild your weekly figures into our periods by hand, which takes most of a day.',
			'Is there a way to have the weekly reports follow our own trading calendar? Ours starts in February and the weeks start on Sunday.'
		],
		more: ['The period close is a day’s work for someone at the moment.', 'Other suppliers manage it, so I assume it is possible.', 'It has always been like this, but we have a new finance director who wants it fixed.'],
		checked: ['Their account has the standard calendar, Monday-to-Sunday weeks from January.', 'I can’t see a calendar setting anywhere in the client portal.'],
		ask: ['What exactly is their calendar: first day of the year, the day weeks start, and the pattern?', 'Can we have the rules of their calendar, and a few of their week numbers with dates?'],
		follow: [
			[['c', 'If it changes, will last year’s figures be restated in our weeks too?'], ['r', 'Yes, the calendar applies to every date, so last year is shown in their weeks as well.']],
			[['a', 'Does this affect their monthly reports as well?'], ['r', 'Only if they want periods instead of calendar months. Monthly reports stay calendar months unless asked.']]
		],
		paths: [
			{
				detail: ['Year starts on the first Sunday of February, weeks Sunday to Saturday, quarters of 4, 4 and 5 weeks. Some examples:\n\n{P:calendar}'],
				look: [['r', 'We don’t support their calendar today. Week numbers come from the ISO calendar, Monday to Sunday from the first Thursday of January, and can’t be moved to start in February.']],
				ends: [
					[['r', 'Retail calendars are planned for the first quarter: 4-4-5 and 4-5-4, with any starting week. {short}’s would be one of the first we set up.'], ['a', 'Told {name}, with the timing.'], ['c', 'Thanks. We will carry on by hand until then. Please put us on the list for the first release.']]
				]
			},
			{
				detail: ['First Sunday of February, Sunday-to-Saturday weeks, 4-4-5. Here are some of ours:\n\n{P:calendar}'],
				look: [['r', 'Good news: retail calendars arrived in the reports API in the summer, but they have to be switched on for each client, and {short}’s account still has the standard calendar.']],
				ends: [
					[['r', 'Switched on: 4-4-5, weeks starting Sunday, year starting the first Sunday of February. Weekly and period reports now use it, history included.'], ['c', 'The week numbers match ours now, and the period totals agree with our accounts. Thank you.']],
					[['r', 'Switched on for their account: weekly and period reports use their calendar from today.'], ['c', 'The exports are right now, but the week picker on the dashboard still shows your weeks.'], ['d', 'Found it: the week picker ignored the client’s calendar. Fixed in this week’s dashboards release.'], ['c', 'Everything matches now, thanks.']]
				]
			}
		]
	},
	// The dashboard shows nothing.
	{
		path: '/reports/daily',
		subjects: ['Dashboard shows nothing', 'Charts blank on store computers', 'Dashboards not loading in our sites', 'Blank page after the update'],
		to: 'd',
		guess: ['Dashboards team: {short}’s site managers see blank dashboards.', 'Escalating to dashboards: charts don’t appear for some of the client’s people.'],
		open: [
			'Since {rel}, our site managers get a blank page where the sales dashboard should be. Head office can see it fine.',
			'Several of our managers say the charts do not appear any more. The page loads, the titles are there, and then nothing.',
			'The dashboards stopped working for some of our people this week. I can use them from my laptop but not from the computer in the back office at {store}.'
		],
		more: ['It is the same at about {n} sites that I know of.', 'Nothing has changed on our computers as far as I know.', 'The managers use it for their morning huddle, so a quick look would be appreciated.'],
		checked: ['The dashboards load fine for me with their demo view.', 'No other client has reported blank dashboards this week.'],
		ask: ['Can they tell us which browser and version the site computers use, and send what the browser’s developer console shows on the blank page?', 'Which browser are the computers on? A copy of the console messages would help a lot.'],
		follow: [
			[['c', 'Is there a list of the browsers you support?'], ['d', 'Current Chrome, Edge, Firefox and Safari, and the two versions before each. I’ve sent {name} the page.']],
			[['a', 'Would the weekly export still reach the managers in the meantime?'], ['x', 'Yes, exports don’t depend on the dashboards at all.']]
		],
		paths: [
			{
				detail: ['The site computers run Chrome 79, which our IT team tell me is what the till software needs. The console shows:\n\n{P:consoleOld}'],
				look: [['d', 'Chrome 79 is from 2019. Since our release on {rel} the charts use features that need a newer browser, and Chrome 79 stops at the first one. Head office have newer browsers, which is why they’re fine.']],
				ends: [
					[['a', 'Told {name} which versions we support and why.'], ['c', 'Our IT team say they can install a newer Chrome beside the old one, but need to test it with the tills first. They hope to do it by the end of the month.'], ['a', 'OK. I’ll leave this with them.']]
				]
			},
			{
				detail: ['The managers use iPads with Safari, all up to date. The console says:\n\n{P:consoleSafari}'],
				look: [['d', 'That’s a bug of ours in the release on {rel}: the new chart code uses something Safari doesn’t have. Only Safari users are affected, on iPad and Mac.']],
				ends: [
					[['d', 'Fixed in this morning’s release, tested on iPad and Mac.'], ['c', 'Charts are back on the iPads. Thanks.']]
				]
			},
			{
				detail: ['They use Edge, up to date. The console shows:\n\n{P:consoleBlocked}'],
				look: [['d', 'The page loads, but the chart script is blocked before it reaches the browser. That address is where we serve the charts from. Something on their network is refusing it; head office may be behind a different web filter from the sites.']],
				ends: [
					[['c', 'Our IT team found that the web filter for the sites blocks the charts address. They have allowed it, and the charts are back.'], ['a', 'Great, closing.']]
				]
			}
		]
	},
	// The dashboard is slow for a large estate.
	{
		since: '2026-10-08',
		path: '/reports/stores/summary',
		subjects: ['Dashboard takes a minute to load', 'Region view spins forever', 'Site dashboard very slow', 'Dashboards slow since last week'],
		to: 'd',
		guess: ['Dashboards team: {short}’s region view takes nearly a minute to load.', 'Escalating to dashboards: the client finds the region view too slow to use.'],
		open: [
			'The region view of the sales dashboard takes between forty seconds and a minute to load for any of our regions. The single-site view is quick.',
			'Our area managers have stopped using the dashboard because the region page takes so long to load. I timed it at 52 seconds this morning.',
			'Since we added our last {n} sites, the dashboard has become very slow whenever more than one site is shown.'
		],
		more: ['We have {count} {unit}, so a region can be fifteen or twenty sites.', 'Is it something on our network?', 'It used to take a few seconds.'],
		checked: ['I opened their region view from here and it took 38 seconds, so it isn’t their network.', 'The single-site view loads in two seconds, the region view in about a minute.'],
		ask: ['Which region, and roughly when did it start to get slow?', 'Can they tell us which view and region, so we can watch what it does?'],
		follow: [
			[['c', 'Would it help if we split our regions into smaller ones?'], ['d', 'It would make each page quicker, but I wouldn’t reorganise for it; let us fix our side first.']],
			[['a', 'Is any other client seeing this?'], ['d', 'The two other clients with more than eighty sites have mentioned it in passing.']]
		],
		paths: [
			{
				detail: ['{region} is the worst. It has been slow for months but it is getting worse.', 'All of them, but {region} most. It crept up over the summer.'],
				look: [['d', 'The region view asks for each site’s summary separately, one call per site, and the browser only sends a few at a time, so the calls queue. Here is one load of {region}, from the audit trail:\n\n{P:auditBurst}']],
				ends: [
					[['d', 'The fix is one call for all the sites of a region. That needs a new report from the reports API team, and both teams have it planned for next month.'], ['r', 'Confirmed: the region summary report is planned for next month.'], ['a', 'Told {name}. They will use the single-site view and the weekly export until then.']]
				]
			},
			{
				detail: ['All regions are slow, since about two weeks ago.'],
				look: [['d', 'The calls themselves are slow: each site’s summary takes three to five seconds to come back, where it used to take under half a second.\n\n{P:auditBurst}'], ['r', 'Found it. Since our change to the summary report two weeks ago, it recalculates last year’s figures on every call instead of using the stored ones.']],
				ends: [
					[['r', 'Fixed: the summary uses the stored figures again. Each call is back under half a second.'], ['c', 'The region view loads in four seconds now. Thank you.']]
				]
			}
		]
	},
	// A saved view loses its filters.
	{
		path: '/reports/daily',
		subjects: ['Saved view loses its filters', 'Dashboard filters reset', 'Our saved views keep resetting', 'Filters disappear on refresh'],
		to: 'd',
		guess: ['Dashboards team: {short}’s saved dashboard views lose their filters.', 'Escalating to dashboards: the client’s saved views reset themselves.'],
		open: [
			'We have saved views for each region on the sales dashboard. Since last week, when we open one, the region filter is gone and it shows every site.',
			'Every time the dashboard refreshes, it forgets the filters I chose and goes back to all sites.',
			'Our managers have saved views, but they open with the default filters rather than their own, and two of them have quoted group figures as their region’s.'
		],
		more: ['It is happening to everyone here, not just me.', 'We had to send a note round telling people to check the filters.', 'It is a small thing but it causes mistakes.'],
		checked: ['I saved a view in their demo account and reopened it: the filters were kept for me.', 'I can reproduce it: a saved view with a region filter opens without it.'],
		ask: ['Can they tell us which views, and whether the views were saved before or after the release on {rel}?', 'Which views, and when were they saved?'],
		follow: [
			[['c', 'Are the other settings in the views affected, such as the date range?'], ['d', 'No, only the site and region filters.']],
			[['a', 'Should I tell other clients?'], ['d', 'Not yet; let’s see how many are affected first.']]
		],
		paths: [
			{
				detail: ['Every view we had before last week. New views seem fine.'],
				look: [['d', 'The release on {rel} changed how filters are stored, and views saved before it lost their region filter the first time they were opened afterwards. Views saved since are fine.']],
				ends: [
					[['d', 'We’ve restored the filters of every view saved before the release, from our backup. Fixed for all clients.'], ['c', 'Our views have their filters back. Thanks.']],
					[['d', 'We can’t bring the old filters back. The quickest thing is to save each view once more; it keeps its filters from then on.'], ['c', 'We re-saved our views and they keep their filters now. A bit annoying, but fine.']]
				]
			},
			{
				detail: ['Any view, old or new. The filter goes when the page refreshes itself every five minutes.'],
				look: [['d', 'The automatic refresh reloads the page with the default filters. It’s been like that since the auto-refresh arrived; nobody had noticed with saved views.']],
				ends: [
					[['d', 'Changing the refresh so that it keeps the filters is planned for the release after next.'], ['a', 'Told {name}, and that turning off auto-refresh in the view settings avoids it until then.'], ['c', 'We would rather keep auto-refresh, so we will wait for the fix.']]
				]
			}
		]
	},
	// The export email never arrives.
	{
		path: '/reports/weekly',
		subjects: ['Weekly export email not arriving', 'Export email missing since last week', 'Report attachment not received', 'No export this Monday'],
		to: 'x',
		guess: ['Exports team: {short} haven’t received their weekly export email for two weeks.', 'Over to exports: the client’s export emails aren’t reaching them.'],
		open: [
			'We have not received the weekly export email for the last two Mondays. The export history in the portal says it was sent.',
			'Our weekly report email has stopped arriving. Nobody here has changed anything, and the daily email still comes.',
			'The Monday export did not arrive this week or last. The daily one still does.'
		],
		more: ['The weekly is the one the trading meeting uses.', 'Could you resend the last two in the meantime?', 'I have checked my junk folder.'],
		checked: ['The export history shows both Mondays as sent:\n\n{P:historySent}', 'Our sending records show both emails left us.'],
		ask: ['Let me check what happened to the emails after they left us. Can they confirm the address they expect them at?', 'Which address should they arrive at?'],
		follow: [
			[['c', 'Could you resend the two missing weeks to me directly in the meantime?'], ['x', 'Sent both to {name} as download links this morning.']],
			[['a', 'Is the daily export affected too?'], ['x', 'No, the daily went through on every day.']]
		],
		paths: [
			{
				detail: ['It goes to reporting@ at our domain, which is a shared mailbox.'],
				look: [['x', 'Both emails were refused by their mail server:\n\n{P:bounce}\n\nThe weekly file passed 10 MB when they added stock columns in {prev}, and their server refuses anything bigger.']],
				ends: [
					[['x', 'We can send a download link instead of the attachment, which avoids the size limit. Offered that.'], ['c', 'A link is fine. Please switch it over.'], ['x', 'Switched; this Monday’s arrived as a link and was downloaded at 07:02.']]
				]
			},
			{
				detail: ['To our finance team’s shared address, the same as always.'],
				look: [['x', 'Their server accepted both emails, so they reached them and were held there. Probably quarantined by a filter on their side.']],
				ends: [
					[['c', 'Our IT team found both emails in quarantine; a new filter had flagged them. They have released them and allowed your address.'], ['a', 'Good. Closing.']]
				]
			},
			{
				detail: ['It should go to {name} and {colleague}, at their usual addresses.'],
				look: [['x', 'Found it. When their export was edited on {weekAgo} to add a column, the recipient list was retyped with a mistake in the domain, so the emails went to a domain that doesn’t exist.']],
				ends: [
					[['x', 'Corrected the address and resent the last two weeks.'], ['c', 'Both arrived. Thanks.']]
				]
			}
		]
	},
	// The CSV doesn't open as expected in Excel.
	{
		path: '/reports/weekly',
		subjects: ['Site codes lose their zeros', 'Excel mangles the export', 'Numbers come out wrong in Excel', 'CSV opens in one column'],
		to: 'x',
		guess: ['Exports team: {short} say the CSV export is broken when they open it in Excel.', 'Escalating to exports: the client’s file looks wrong in Excel.'],
		open: [
			'When we open the export in Excel, the site codes lose their leading zeros, so {code} becomes {codeNum} and our lookups fail.',
			'Our colleagues in the Dutch office open the CSV and get everything in one column, with the figures all wrong.',
			'The export has been fine in our import job, but when the finance team open it in Excel it is a mess.'
		],
		more: ['Can you send it in a format that works in Excel?', 'Our import job is fine; it is only Excel.', 'I have a screenshot of what they see if you need it.'],
		checked: ['The CSV itself looks right when I open it as text.', 'I opened their file in a text editor: codes and figures are correct.'],
		ask: ['What do they see exactly, and what language settings is Excel using?', 'Can they send a few lines of the file and of what Excel shows?'],
		follow: [
			[['c', 'Will changing the format affect our import job?'], ['x', 'Only if we change the file it reads. We can leave that one alone and make a second copy for Excel.']],
			[['a', 'Is this something we could warn clients about?'], ['x', 'It’s in the export help page, but nobody reads that.']]
		],
		paths: [
			{
				detail: ['Here is the start of the file and what Excel shows:\n\n{P:csvZeros}'],
				look: [['x', 'The file is right: the codes are there with their zeros. Excel treats anything that looks like a number as a number when it opens a CSV, and drops the zeros.']],
				ends: [
					[['x', 'We can send it as XLSX, where the codes are stored as text. Offered that.'], ['c', 'XLSX works. Please switch the weekly over and leave the daily as CSV for the import job.'], ['x', 'Done.']]
				]
			},
			{
				detail: ['In the Netherlands, Excel expects semicolons between columns and commas for decimals. Here is what they see:\n\n{P:csvDutch}'],
				look: [['x', 'Their Excel is set up for the Netherlands, so it splits columns on semicolons. Our CSV uses commas, which is right for the import job but not for them.']],
				ends: [
					[['x', 'Exports have a separator setting. I made a copy of the weekly for the Dutch office with semicolons and decimal commas.'], ['c', 'The Dutch office can open it now. Thanks.']]
				]
			}
		]
	},
	// The download's file name changed.
	{
		since: '2026-10-20',
		path: '/reports/weekly',
		subjects: ['Our import macro can’t find the file', 'File name changed?', 'Weekly file has a new name', 'Macro broken after your update'],
		to: 'x',
		guess: ['Exports team: {short}’s macro can’t find the weekly file because its name has changed.', 'Over to exports: the client says our file name changed without warning.'],
		open: [
			'Our Excel macro picks up the weekly file by its name, weekly_sales and the date. Since last week the file is called something like weekly-sales-2026-W42 and the macro cannot find it.',
			'The weekly file we download has had a different name since the middle of October. We did not get any notice of the change.',
			'Since {rel} the downloaded file is named differently and our import fails.'
		],
		more: ['Was this deliberate?', 'Could it go back to the old name?', 'We have a few reports built on this.'],
		checked: ['The file name did change: weekly-sales and an ISO week now, instead of weekly_sales and a date.', 'Their recent downloads have the new name.'],
		ask: ['Our tool keeps whatever name the reports API gives the file. Reports API team, did that change?', 'We don’t name the files, the reports API does. Did your release change the names?'],
		follow: [
			[['c', 'Did the contents of the file change as well?'], ['r', 'No, only the name. Same columns in the same order.']],
			[['a', 'Did anyone else notice?'], ['r', 'Two other clients asked about it, both by email to their account managers.']]
		],
		paths: [
			{
				detail: ['The old name was weekly_sales_2026-10-05.csv, with the Monday’s date.'],
				look: [['r', 'Yes, our release on 14 October changed the file names to ISO weeks. It was meant only for new reports but applied to every report.']],
				ends: [
					[['r', 'Old names restored for existing reports; only new reports get the new style.'], ['c', 'Back to normal. Thank you.']],
					[['r', 'We’d rather keep the new names, which sort properly. Changing the macro to look for the new pattern is a one-line change.'], ['c', 'Fair enough, we have updated the macro, and it found this week’s file.']]
				]
			}
		]
	},
	// Footfall shows zero at some sites.
	{
		path: '/reports/footfall/hourly',
		subjects: ['Footfall zero for Saturday', 'Missing footfall at three sites', 'Conversion rate makes no sense', 'Footfall dropped to nothing'],
		to: 'r',
		guess: ['Reports API team: {short}’s footfall is zero for a whole day at some sites.', 'Escalating to the reports API: footfall gaps.'],
		open: [
			'Footfall for {store}, {store2} and {store3} shows zero for the whole of Saturday, but the tills took money all day. Conversion rate is therefore infinite.',
			'Some of our sites have had no footfall since the weekend. Sales are normal.',
			'The footfall report has zeros for some hours at several sites.'
		],
		more: ['The weekly trading meeting uses conversion rate.', 'Can the zeros be left out of the averages?', 'This happened once before, in the spring.'],
		checked: ['Footfall is zero at those sites, sales normal.', 'I can see the zeros in the hourly footfall report.'],
		ask: ['Their counters send data to us through their counter provider. Let me see what arrived. Which sites and hours?', 'Which sites and hours? I’ll check what came in from the counters.'],
		follow: [
			[['c', 'Can the missing days be filled in later, if the counters still hold the counts?'], ['r', 'Yes. If the counter provider re-sends the files, we load them as if they were on time.']],
			[['a', 'Does this affect their conversion figures in the export?'], ['r', 'Yes, conversion is sales over footfall, so it’s wrong wherever footfall is.']]
		],
		paths: [
			{
				detail: ['{store}, {store2} and {store3}, all day Saturday.'],
				look: [['r', 'Nothing arrived from those sites’ counters for the day: no files at all, not zeros. The other sites sent as normal:\n\n{P:footfallMissing}']],
				ends: [
					[['a', 'Asked {name} to have someone check the counters at those sites.'], ['c', 'Our facilities team will check the counters when they visit next week.']],
					[['c', 'The sites had a power cut on Friday night and the counters did not restart. They are back now.'], ['a', 'Thanks. Closing.']]
				]
			},
			{
				detail: ['Several sites, every hour since Sunday.'],
				look: [['r', 'The counter files arrived, but their provider changed the time format on Sunday and our import skipped every row it couldn’t read:\n\n{P:footfallFormat}']],
				ends: [
					[['r', 'The import now reads the new format, and we’ve reloaded everything since Sunday.'], ['c', 'Footfall is back for all sites. Thank you.']]
				]
			}
		]
	},
	// Stock levels below zero.
	{
		path: '/reports/stock/levels',
		subjects: ['Negative stock in the stock report', 'Stock levels below zero', 'Stock report wrong for {store}', 'Why is stock negative?'],
		to: 'r',
		guess: ['Reports API team: {short} see negative stock levels and think the calculation is wrong.', 'Passing to the reports API: negative stock on the client’s stock report.'],
		open: [
			'The stock report shows negative quantities for some products at {store}. You cannot have minus three of something.',
			'Several lines in the stock report are below zero, which makes our replenishment model order too much. It started at the busiest sites.',
			'Our buyers are asking why the stock report shows negative stock. I could not answer them.'
		],
		more: ['Could you check whether the calculation is wrong?', 'Can negatives be shown as zero, at least?', 'It is mostly at our busiest sites, and mostly after weekends.'],
		checked: ['The report shows negative quantities at {store} for a handful of products.', 'I can see negatives for several products across three sites.'],
		ask: ['Can they send a few products and sites with negatives, from this morning?', 'Which products and sites? A few examples is enough.'],
		follow: [
			[['c', 'Does the negative figure affect the weekly stock value in the pack?'], ['r', 'Only by the value of the products below zero, which is small: those products are counted as negative stock at cost until the delivery is booked.']],
			[['a', 'Do other clients see negatives too?'], ['r', 'Any client whose deliveries are booked after the goods are sold. It’s common in the first days after a big delivery.']]
		],
		paths: [
			{
				detail: ['Here are some from this morning:\n\n{P:stock}'],
				look: [['r', 'We work stock out from their own feed: deliveries in, sales out. These products sold before the delivery was booked in their system, so the level goes below zero until the delivery reaches the feed. Their deliveries are booked a day or two after they arrive.']],
				ends: [
					[['a', 'Explained to {name}.'], ['c', 'That makes sense. Our warehouse books deliveries in late. We will tell the buyers to treat negatives as zero for now and have a word with the warehouse.']],
					[['c', 'Can you show negatives as zero in the report? The buyers would find it less confusing.'], ['r', 'That would hide real problems for other clients, so it would have to be a setting. It’s a product question, and I’ve passed it to {g}.'], ['g', 'Noted, and added to next year’s list with {client}’s name on it.'], ['a', 'Told {name} it has gone to product.']]
				]
			}
		]
	},
	// A new report the client would like.
	{
		path: '/reports/basket',
		subjects: ['Basket size by hour?', 'New report request', 'Can we get average basket by hour?', 'Request for an hourly basket report'],
		to: 'r',
		guess: ['Reports API team: {short} would like a new report. I’m not sure whether it already exists under another name.', 'Over to the reports API: the client is asking for a report I can’t find.'],
		open: [
			'We would like a report of average basket size by hour of the day, for each site. Is that possible?',
			'Could you add a report that shows the average transaction value by hour, by site, against the same hour last year?',
			'Our trading team want to see the average basket by hour of the day. Is there anything like that?'
		],
		more: ['We would pay for it if needed.', 'At the moment we build it ourselves from the daily exports, which takes an analyst most of Monday.', 'Several of our area managers have asked for it.'],
		checked: ['I couldn’t find anything like it in the report list.', 'It’s not one of the standard reports, as far as I can see.'],
		ask: ['Can they describe exactly what they would like, with an example, and what they would use it for?', 'What would they use it for, how often, and could they show us what they build today?'],
		follow: [
			[['c', 'Could the hourly sales report give us what we need in the meantime?'], ['r', 'It has sales and transactions by hour, so they can divide one by the other in {tool}. That gives the average basket, though not last year’s.']],
			[['a', 'Has anyone asked for this before?'], ['r', 'Yes, a couple of times, but never with a clear use.']]
		],
		paths: [
			{
				detail: ['Every Monday, for the trading meeting, to see when the big baskets happen. Here is what we build now:\n\n{P:basket}'],
				look: [['r', 'Nothing like it exists today. The hourly report has sales and transactions but not baskets compared with last year, and keeping hourly history for a year is new data for us.']],
				ends: [
					[['r', 'Passing to product.'], ['g', 'Thanks. Basket by hour has come up before; I’ve added {client} to the request and will talk to {name} when we plan next year.'], ['a', 'Told {name} it has gone to product.']],
					[['r', 'We could build it for them as a custom report, which is a paid piece of work.'], ['m', 'I’ll talk to {name} about a custom report and what it would cost.'], ['a', 'Handed over to {m}.']]
				]
			}
		]
	},
	// The client asks for usage figures.
	{
		since: '2026-10-20',
		path: '/reports/daily',
		subjects: ['How many requests did we make last month?', 'Usage figures for our renewal', 'Request volumes for {client}', 'Usage summary, please'],
		to: 'p',
		guess: ['Platform: {short} want to know how much they use the reports, for their renewal. Can we tell them?', 'Escalating to platform: the client wants usage figures and I don’t know where they come from.'],
		open: [
			'Ahead of our renewal, could you tell us how many requests we make to your reports each month?',
			'Our procurement team have asked for our usage of your service over the last few months, as part of the business case for renewing.',
			'Could we get a breakdown of our use of the reports by month, and how much of it is {tool}?'
		],
		more: ['It is for an internal business case.', 'A rough figure is fine.', 'Our renewal meeting is on {day}.'],
		checked: ['Nothing in the client portal shows usage.', 'I’m not sure where usage figures would come from.'],
		ask: ['The audit trail has one row per request since sluice 0.6.0 went out on 6 October. What period do they need?', 'We can count requests from the audit trail, but only from 6 October. What period do they need?'],
		follow: [
			[['c', 'Do these figures include the dashboards, or only our own tools?'], ['p', 'Everything that reaches the reports through sluice: dashboards, exports and {tool} alike.']],
			[['a', 'Could we send usage to clients every month?'], ['p', 'Possibly; it’s a product question. I’ll mention it.']]
		],
		paths: [
			{
				detail: ['Since 6 October is fine for now.'],
				look: [['p', 'Here are their figures from the audit trail:\n\n{P:usage}\n\nThe 4xx are mostly 429s at month end; the 5xx are timeouts of their largest export.']],
				ends: [
					[['a', 'Sent {name} the figures.'], ['c', 'Thank you, that is exactly what we needed.']]
				]
			},
			{
				detail: ['The last twelve months, ideally.'],
				look: [['p', 'We only have per-request records from 6 October. Anything earlier would have to come from the reports API’s own counts or from billing.']],
				ends: [
					[['m', 'I’ll put together the year from the billing figures; it’s part of the renewal anyway.'], ['a', 'Handed over to {m}.']]
				]
			}
		]
	},
	// An XLSX export is cut short.
	{
		path: '/reports/daily',
		subjects: ['Spreadsheet export cut short', 'Rows missing from the XLSX', 'Export stops at row 1,048,576', 'Missing days in the big export'],
		to: 'x',
		guess: ['Exports team: {short}’s spreadsheet export is missing rows at the end.', 'Over to exports: a cut-short XLSX for the client.'],
		open: [
			'Our daily sales by product export, in XLSX, stops at row 1,048,576 and the rest of the data is missing.',
			'The XLSX version of the product export is missing the last few days of the month.',
			'Our product export has lost rows since we switched it to XLSX for the finance team.'
		],
		more: ['The CSV version had everything.', 'We switched to XLSX because the finance team cannot open large CSVs.', 'It is the product-level daily export, for the month to date.'],
		checked: ['The file has exactly 1,048,576 rows, the most a sheet can hold.', 'I can see the cut-off at the last row of the sheet.'],
		ask: ['How many rows would they expect in a month?', 'Do they need all of it in one sheet, or would several sheets do?'],
		follow: [
			[['c', 'Could you split it by week instead?'], ['x', 'We could make four weekly exports, yes, if that suits the finance team better.']],
			[['a', 'Does the dashboard show the right figures?'], ['d', 'Yes, it reads from the reports API, not from the export.']]
		],
		paths: [
			{
				detail: ['About {bigRows} rows a month, so more than a sheet allows.', 'Somewhere around {bigRows} rows by the end of the month.'],
				look: [['x', 'An XLSX sheet holds at most 1,048,576 rows. Our export writes everything into one sheet and stops there, silently, which it shouldn’t.']],
				ends: [
					[['a', 'Suggested CSV for that export, and XLSX for the smaller ones.'], ['c', 'We will go back to CSV for that one and find another way for the finance team to open it.']],
					[['x', 'Splitting large exports across several sheets is planned for the next release of the export tool, in about three weeks.'], ['c', 'We will wait for that. Please let us know when it is out.']]
				]
			}
		]
	},
	// A figure in a board pack doesn't match the report now.
	{
		since: '2026-10-13',
		path: '/reports/weekly',
		subjects: ['Board pack figure doesn’t match the report', 'Last week’s total has changed', 'Which call produced this number?', 'Disputed weekly figure'],
		to: 'r',
		guess: ['Reports API team: a figure in {short}’s board pack doesn’t match the same report now.', 'Escalating to the reports API: a weekly figure that changed after the client took it.'],
		open: [
			'The weekly sales figure in our board pack for last week does not match the same report today. Our directors want to know which is right.',
			'The figure we reported on Monday had changed by Wednesday. Our {tool} keeps the request id of every call it makes, if that helps.',
			'Our weekly total for last week is now lower than what we pulled on Monday, by {gap}.'
		],
		more: ['The difference is {gap}.', 'We pull the figures into {tool} at 07:00 every Monday.', 'Our finance director has asked me to explain it by {day}.'],
		checked: ['The report today does show a different figure from theirs.', 'I can see the change between Monday and today.'],
		ask: ['Can they send the request id their tool recorded for Monday’s call, and the figure it got?', 'Request id and figure, please, and the time of the call.'],
		follow: [
			[['c', 'Is there a time in the week after which the figures stop changing?'], ['r', 'Nearly all late changes arrive within three days, so Thursday morning is safe for the previous week.']],
			[['a', 'Has this happened to them before?'], ['r', 'Every week, by small amounts; this week was bigger than usual.']]
		],
		paths: [
			{
				detail: ['The request id was {rid}, at about 07:00 on Monday.'],
				look: [['p', 'Found it in the audit trail:\n\n{P:auditFind}'], ['r', 'That call returned the figures as they stood at 07:00 on Monday. Since then their tills have sent refunds for that week, which arrive a few days late, so the total went down.']],
				ends: [
					[['a', 'Explained to {name}.'], ['c', 'Understood. We will pull the figures on Thursday from now on.']],
					[['c', 'Could the report say when its figures were last updated?'], ['r', 'Adding a “figures as at” time to the weekly report is planned for next month.'], ['a', 'Told {name} it’s coming.']]
				]
			},
			{
				detail: ['Our tool records the request id {toolId} for that call.'],
				look: [['p', 'Their tool sends the same request id, {toolId}, on every call, and sluice keeps the caller’s id, so there are hundreds of rows with it and no way to tell Monday’s call from the rest:\n\n{P:auditSame}']],
				ends: [
					[['a', 'Asked {name} whether their tool can send a different id on each call.'], ['c', 'Our BI team are looking at it. They think it is a setting in the connector.']]
				]
			}
		]
	},
	// A pull stops at 50,000 rows.
	{
		path: '/reports/daily',
		subjects: ['Export stops at 50,000 rows', 'Rows missing from our pull', 'Only the first 50,000 rows', 'Data missing after row 50,000'],
		to: 'r',
		guess: ['Reports API team: {short} only ever get 50,000 rows of their product data.', 'Escalating to the reports API: missing rows in the client’s daily product data.'],
		open: [
			'Our nightly pull of daily sales by product always gets exactly 50,000 rows, and we know we sell more lines than that.',
			'Our product data is missing everything after row 50,000, every day.',
			'Since we started taking the product-level report, the daily file stops at 50,000 rows.'
		],
		more: ['We have more sales lines than that on any normal day.', 'It used to be fine when we only had half the sites.', 'Is there a limit we do not know about?'],
		checked: ['The product report pages at 50,000 rows.', 'I can see 50,000 rows exactly in their latest file.'],
		ask: ['Does whatever reads it follow the next link at the end of each page?', 'Can they show us the end of one response, and tell us what reads it?'],
		follow: [
			[['c', 'Can the page size be made bigger instead?'], ['r', 'No; 50,000 is the limit for every client, and bigger pages are slower to produce.']],
			[['a', 'Is the dashboard affected?'], ['d', 'No, the dashboards never ask for product-level rows.']]
		],
		paths: [
			{
				detail: ['It is {tool}. Here is the end of a response:\n\n{P:paging}'],
				look: [['r', 'Each page ends with a next link for the following page. Their side reads only the first page and stops.']],
				ends: [
					[['a', 'Explained to {name}, with the documentation page on paging.'], ['c', 'Our data engineer will change it to follow the next links. Thank you.']]
				]
			},
			{
				detail: ['It is the scheduled export from you, not anything of ours.'],
				look: [['x', 'Then it’s us: the export tool ignores the next link for reports over 50,000 rows and sends the first page only.']],
				ends: [
					[['x', 'Fixed and deployed: the export now follows every page. I’ve re-sent their last week of files.'], ['c', 'The files are complete now. Thanks.']]
				]
			}
		]
	},
	// Selecting many sites on the dashboard fails.
	{
		path: '/reports/compare',
		subjects: ['Comparison fails with all sites selected', 'Error when selecting more than 400 sites', 'Request too large?', 'Compare view broken for the whole estate'],
		fits: (client) => client.count >= 50,
		to: 'd',
		guess: ['Dashboards team: {short}’s comparison view fails when they select all their sites.', 'Escalating to dashboards: an error on the comparison view with a big selection.'],
		open: [
			'When I select all {count} {unit} on the comparison view, it says “Something went wrong” and draws nothing. With up to about forty it works.',
			'The comparison view fails whenever we pick the whole estate. Picking one region at a time works.',
			'We cannot compare all our sites at once any more. The page shows an error.'
		],
		more: ['We need the whole estate for the quarterly review.', 'It used to work last year, I think.', 'I tried two browsers.'],
		checked: ['Selecting all their sites in the comparison view fails for me too. A region works.', 'It fails from here as well.'],
		ask: ['How many sites does it take to fail? Let me look at what the page sends.', 'Let me check what the comparison view sends for a big selection.'],
		follow: [
			[['c', 'Will the same happen in the exports?'], ['x', 'No, exports send site groups, not lists of sites.']],
			[['a', 'Has the number of sites grown recently?'], ['d', 'They added several this year, which is probably what took them over.']]
		],
		paths: [
			{
				detail: ['It works with 40 and fails with 50, roughly.'],
				look: [['d', 'The comparison view sends the selected sites in the body of the call, each with its name and region, and the reports API refuses bodies over 16 KB with a 413:\n\n{P:sizes}']],
				ends: [
					[['r', 'We’ve raised the body limit to 256 KB for the comparison report. Deployed.'], ['c', 'The whole estate compares now. Thanks.']],
					[['d', 'The better fix is to send region ids instead of every site. That is planned for our next release.'], ['a', 'Told {name}; they will compare region by region until then.']]
				]
			}
		]
	},
	// Everything feels slower since early October.
	{
		since: '2026-10-08',
		path: '/reports/weekly',
		subjects: ['Reports slower since early October', 'Everything takes longer to load', '{tool} refresh times doubled', 'Slow responses this month'],
		to: 'p',
		guess: ['Platform: {short} say everything got slower in early October, which is when the audit trail went in. Could that be it?', 'Escalating to platform: the client reports slow responses since about the 6th, and I know sluice changed that week.'],
		open: [
			'Since the first week of October our {tool} refreshes take twice as long as they did. Nothing changed on our side that we know of, and the amount of data has not doubled.',
			'All our reports seem slower this month, both in the dashboard and in {tool}. My colleagues have started to comment on it in meetings.',
			'Our nightly refresh used to finish by 03:00 and now runs until nearly 05:00, which is getting close to when the morning reports are sent.'
		],
		more: ['It is not critical yet, but it is getting worse week by week.', 'Did you change something at the start of October?', 'Our {tool} refresh history shows the jump clearly; I can send it.'],
		checked: ['The status page shows nothing for October, and no other client has complained about speed this month.', 'I opened their weekly sales dashboard and it took about six seconds, which does feel slow.'],
		ask: ['sluice 0.6.0 went out on 6 October with the audit trail, but it writes each row after the answer has gone back and doesn’t wait for the write. Which reports are slower, and can they share their refresh timings?', 'Which reports, and from when exactly? sluice changed on the 6th, but the audit write happens after the answer is sent, so it shouldn’t add time.'],
		follow: [
			[['c', 'Could the slowness be costing us anything extra?'], ['m', 'No. The plan is the same however long the calls take, and nothing is charged by time.']],
			[['a', 'Can we tell from the audit trail how much time sluice itself adds?'], ['p', 'Not directly: it records the whole call, ours and the reports API’s together. But the calls that were fast are still fast, which says sluice isn’t adding much.']]
		],
		paths: [
			{
				detail: ['Mostly weekly sales; daily and stock seem as before. Here are our refresh times:\n\n{P:slowtimes}'],
				look: [['p', 'The audit trail only starts on the 6th, so I can’t compare before and after on our side. But every slow call in it is the weekly report: six to nine seconds, while their daily and stock calls take under a second.'], ['r', 'Our own timings show the weekly report jumped on 7 October, when our release added a sort on site name for every client, done the slow way. That’s it, not sluice.']],
				ends: [
					[['r', 'The sort now happens in the database, and the weekly report is back to its old speed: under a second for {short}.'], ['a', 'Told {name}, and asked them to check tonight’s refresh.'], ['c', 'Last night’s refresh finished at 02:51, the earliest for a month. Thanks.']]
				]
			},
			{
				detail: ['Everything, daily and weekly alike. Here are our refresh times:\n\n{P:slowtimes}'],
				look: [['p', 'Our side is steady: their calls take 300 to 600 milliseconds at sluice every day since the 6th, and the slowest is under two seconds. Their tool sees six to nine seconds for the same calls, so the time is going somewhere between them and us.'], ['a', 'Anything they could have changed?'], ['p', 'If their {tool} gateway moved behind a new VPN or proxy in early October, that would do it. Every call would pay the extra trip.']],
				ends: [
					[['c', 'Our IT team moved our gateway to the new data centre on 5 October. They are looking at the route it takes to you now.'], ['a', 'Thanks. We’ll wait to hear; nothing to change on our side.']],
					[['c', 'Found it: since the move, our gateway sends everything through the head office proxy, which inspects each response. Our IT team have made an exception for your address and refreshes are back to normal.'], ['a', 'Great news. Closing.']]
				]
			}
		]
	},
	// A trailing slash on a report address.
	{
		since: '2026-10-08',
		path: '/reports/daily',
		subjects: ['Not found error on the daily report', 'New pull script gets 404', 'Daily report address not found', '404 from the daily sales report'],
		to: 'p',
		guess: ['Platform: {short}’s new pull script gets 404 for a report that definitely exists. I wonder whether sluice is mangling the address.', 'Escalating to platform: a 404 on the daily report from the client’s new pipeline, while their old one works.'],
		open: [
			'Our new pull script gets “404 Not Found” for the daily sales report. The old script, which calls the same report, still works, so the report is definitely there.',
			'We are moving our nightly pulls to a new tool, and the daily report answers 404 in the new one. Weekly and stock work fine in both.',
			'The daily report gives a not found error since we rebuilt our pipeline last week. We have had to keep the old pipeline running alongside.'
		],
		more: ['The address is copied from the documentation.', 'We have checked the address several times and it looks the same in both.', 'We would like to switch the old pipeline off by the end of the month.'],
		checked: ['The daily report works for me from the portal, and their old pulls are still succeeding every night.', 'Their old pipeline’s calls to the daily report succeed; I can’t see anything different from here.'],
		ask: ['Can they send the exact path the new script calls, character for character, and the time of one failure?', 'What path does the new script use, exactly? Copy and paste rather than retyped, please.'],
		follow: [
			[['c', 'Are other report addresses affected the same way?'], ['r', 'Any report path with a slash on the end, yes. Their weekly and stock calls in the new tool have no slash, which is why they work.']],
			[['a', 'Should sluice tidy addresses like that before passing them on?'], ['p', 'I’d rather it didn’t: it passes paths on as they come, and the reports API decides what they mean. Tidying in two places goes wrong eventually.']]
		],
		paths: [
			{
				detail: ['The new script calls /reports/daily/ at 06:30. The old one calls /reports/daily at 06:00.', 'Copied from the new script’s settings: /reports/daily/'],
				look: [['p', 'There’s the difference: a slash on the end. sluice passes the path on as it came, and the audit trail shows both side by side:\n\n{P:slash}'], ['r', 'We match paths exactly, so /reports/daily/ is a path we don’t have and we answer 404. The documentation has no slash.']],
				ends: [
					[['r', 'Most tools add or drop that slash without asking, so we now accept a trailing slash on every report path. Deployed today.'], ['a', 'Told {name}; nothing to change on their side.'], ['c', 'The new script worked last night. Thanks, we can switch the old one off.']],
					[['a', 'Suggested they remove the slash from the new script’s settings.'], ['c', 'Removed it and the new script works. The tool had added it when we pasted the address in. Thanks, and sorry for the trouble.']]
				]
			}
		]
	},
	// Like-for-like comparisons across a moved holiday.
	{
		since: '2026-10-26',
		path: '/reports/weekly',
		subjects: ['Like-for-like swings wildly', 'Half-term distorts our comparisons', 'Year-on-year looks wrong for October', 'Comparison week looks wrong'],
		to: 'r',
		guess: ['Reports API team: {short}’s like-for-like against last year looks wrong for the last few weeks.', 'Escalating to the reports API: like-for-like figures that swing from week to week.'],
		open: [
			'Our like-for-like for the last two weeks of October swings from minus fifteen percent to plus twenty. Half-term in most of our areas was a week later this year than last, and I think the comparison is lining up the wrong weeks.',
			'Year-on-year for October looks wrong. One week we are well down and the next well up, and the board want to know what is going on.',
			'Our comparisons against last year are distorted by the school holidays moving. Is there a way to compare half-term with half-term?'
		],
		more: ['Our board look at like-for-like before anything else.', 'Can the comparison follow the holidays?', 'We had the same at Easter but put up with it.'],
		checked: ['I can see the swings in their weekly report: down one week, up the next.', 'The comparison week in their account is the standard one, 364 days earlier.'],
		ask: ['Which weeks, and which holidays matter to them? Can they show the weeks they would like compared?', 'Can they show us the weeks and what they would compare each with?'],
		follow: [
			[['c', 'Do you hold the school holiday dates for each area?'], ['r', 'No, and they differ by council, which is part of what makes it hard to do automatically.']],
			[['a', 'Does the dashboard use the same comparison as the export?'], ['d', 'Yes, both use the same week 364 days earlier.']]
		],
		paths: [
			{
				detail: ['Here are the weeks around half-term:\n\n{P:lfl}', 'These are the weeks we mean:\n\n{P:lfl}'],
				look: [['r', 'Like-for-like compares each week with the week 364 days earlier, so the weekdays line up but anything that moves with the calendar, like half-term or Easter, doesn’t. Taken over the two weeks together, they are up a few percent, which is what the board should see.']],
				ends: [
					[['r', 'Comparisons that follow the holidays would be a new feature, so I’ve passed it to {g}.'], ['g', 'Thanks. Easter comes up every year; I’ve added {client} to the request and will look at it for next year.'], ['a', 'Told {name} it has gone to product, and how to read the two weeks together for now.']],
					[['d', 'For a one-off, the comparison week can be chosen by hand in the dashboard’s comparison settings, so this year’s half-term week can be set against last year’s.'], ['a', 'Showed {name} where the setting is.'], ['c', 'That works for the board pack. We will set it by hand at Easter too. Thanks.']]
				]
			}
		]
	}
);

// Pasted output. Each kind is made from the escalation's own client, sites, numbers and dates.
interface Ctx {
	r: Rand;
	v: Record<string, string>;
	client: Client;
	sites: string[];
	codes: string[];
	open: number;
}
const AUDIT_START = dayOf('2026-10-06') + 14 * 60 + 20; // sluice 0.6.0 deployed, with the audit trail
const secondsOf = (r: Rand, minutes: number) => `${isoTime(minutes)}:${pad(int(r, 0, 59))}`;
const recentDays = (open: number, count: number, from = 1) => {
	const days: number[] = [];
	for (let m = startOfDay(open) - from * DAY; days.length < count && m > AUDIT_START; m -= DAY) days.unshift(m);
	return days;
};
/** The checks of one weekday morning, the same in the client's monitor and in the audit trail. */
const mornings = new Map<Ctx, { minute: number; ms: number }[]>();
const morning = (c: Ctx) => {
	const known = mornings.get(c);
	if (known) return known;
	const r = mulberry32(c.open);
	let day = startOfDay(c.open) - DAY;
	while (isWeekend(day)) day -= DAY;
	const checks: { minute: number; ms: number }[] = [];
	for (let m = day + 7 * 60 + 24; m < day + 9 * 60 + 30; m += int(r, 6, 13)) {
		const busy = m > day + 7 * 60 + 40 && m < day + 9 * 60 + 5 && r() < 0.3;
		checks.push({ minute: m, ms: busy ? (r() < 0.3 ? int(r, 10001, 10024) : int(r, 2100, 6800)) : int(r, 11, 46) });
	}
	mornings.set(c, checks);
	return checks;
};
const auditHead = ['created_at', 'request_id', 'method', 'path', 'status', 'duration_ms'];
const auditRight = [false, false, false, false, true, true];
const pastes: Record<string, (c: Ctx) => string> = {
	auditTimeout: ({ r, open, v }) => {
		const rows: string[][] = [];
		for (const night of recentDays(open, int(r, 3, 5))) {
			rows.push([secondsOf(r, night + 120 + int(r, 0, 3)), uuid(r), 'GET', '/reports/daily', '502', String(int(r, 10003, 10041))]);
			if (r() < 0.6) rows.push([secondsOf(r, night + 125 + int(r, 0, 8)), uuid(r), 'GET', '/reports/weekly', '200', String(int(r, 540, 2400))]);
			rows.push([secondsOf(r, night + 180 + int(r, 0, 3)), uuid(r), 'GET', '/reports/daily', '502', String(int(r, 10002, 10038))]);
			if (r() < 0.5) rows.push([secondsOf(r, night + 190 + int(r, 0, 9)), uuid(r), 'GET', '/reports/stock/levels', '200', String(int(r, 310, 1900))]);
		}
		return `Every call from ${v.short}’s export account between 02:00 and 03:30 on the last few nights:\n\n${grid(auditHead, rows, auditRight)}`;
	},
	calls: ({ r, open, client }) => {
		const rows: string[][] = [];
		for (let d = Math.max(dayOf('2026-10-29'), startOfDay(open) - 5 * DAY); d <= startOfDay(open); d += DAY) {
			const date = at(d).getUTCDate();
			if (date === 1) continue;
			for (let k = 0; k < (r() < 0.4 ? 2 : 1); k++) {
				const m = d + 6 * 60 + int(r, 0, 40) + k * 3;
				rows.push([isoTime(m), '/reports/daily', '(none)', '(none)', `1 ${monthNames[at(m).getUTCMonth()]} to ${dayMonth(m - DAY)}`, thousands(client.count * (date - 1))]);
			}
		}
		return table(['Received', 'Path', 'from', 'to', 'Range answered', 'Rows'], rows);
	},
	deliveries: ({ r, open, v }) => {
		const rows: string[][] = [];
		for (let i = 5; i >= 1; i--) {
			const d = nextWorkday(open - 8 * DAY, 5 - i);
			const twice = i === 4 || i === 2;
			const first = 6 * 60 + int(r, 2, 20);
			rows.push([dayMonth(d), `daily-sales-${iso(d - DAY)}.csv`, String(v.count), '06:00', twice ? `${clock(d + first)} and ${clock(d + first + int(r, 18, 40))}` : clock(d + first)]);
		}
		return table(['Day', 'File', 'Rows', 'Sent', 'Downloaded'], rows);
	},
	auditHead: (c) => {
		const rows = morning(c).map(({ minute, ms }) => [secondsOf(c.r, minute), uuid(c.r), 'HEAD', '/healthz', ms > 10000 ? '502' : '404', String(ms)]);
		return `The same morning’s checks as they reached sluice:\n\n${grid(auditHead, rows, auditRight)}`;
	},
	monitorHead: (c) => table(['Time', 'Probe', 'Method', 'Result', 'Response (ms)'], morning(c).map(({ minute, ms }) => [clock(minute), 'London', 'HEAD', ms > 2000 ? 'Down (timed out)' : 'Up (404)', ms > 2000 ? '2,000' : String(ms)])),
	monitorFar: ({ r, open }) => {
		const rows: string[][] = [];
		let day = startOfDay(open) - DAY;
		while (isWeekend(day)) day -= DAY;
		for (let m = day + 7 * 60 + 30; m < day + 9 * 60; m += int(r, 6, 13)) {
			const probe = r() < 0.5 ? 'London' : 'Singapore';
			const ms = probe === 'London' ? int(r, 12, 31) : int(r, 930, 1090);
			rows.push([clock(m), probe, 'GET', ms > 1000 ? 'Down (timed out)' : 'Up (200)', thousands(ms)]);
		}
		return table(['Time', 'Probe', 'Method', 'Result', 'Response (ms)'], rows);
	},
	redirect: ({ r, open, v }) => {
		const d = at(startOfDay(open) - DAY + 7 * 60 + int(r, 0, 59));
		const date = `${dayNames[d.getUTCDay()]!.slice(0, 3)}, ${pad(d.getUTCDate())} ${monthNames[d.getUTCMonth()]!.slice(0, 3)} 2026 ${pad(d.getUTCHours() - (iso(open) < '2026-10-26' ? 1 : 0))}:${pad(d.getUTCMinutes())}:${pad(int(r, 0, 59))} GMT`;
		return `\`\`\`text\nHTTP/1.1 301 Moved Permanently\nlocation: http://reports.internal:9000/reports/sales/weekly\ncontent-length: 0\ndate: ${date}\nx-request-id: ${uuid(r)}\n\n${v.tool === 'Airflow' ? 'requests.exceptions.ConnectionError: Failed to resolve \'reports.internal\' ([Errno -2] Name or service not known)' : v.tool === 'Power BI' || v.tool === 'Excel Power Query' ? 'DataSource.Error: Web.Contents failed to get contents from \'http://reports.internal:9000/reports/sales/weekly\': The remote name could not be resolved: \'reports.internal\'' : `${v.tool}: refresh failed. Could not resolve host: reports.internal`}\n\`\`\``;
	},
	tzsplit: ({ r }) => {
		const hours = ['21:00', '22:00', '23:00', '00:00', '01:00', '02:00'];
		const takings = hours.map(() => int(r, 900, 3400) + int(r, 0, 99) / 100);
		const rows = hours.map((h, i) => [h, pounds(takings[i]!), i < 3 ? 'Friday' : 'Saturday', i < 4 ? 'Friday' : 'Saturday']);
		return table(['Hour (UK time)', 'Takings', 'Our tills’ day', 'Your report’s day'], rows) + `\n\nThe hour from midnight, ${pounds(takings[3]!)}, is on Saturday in our tills and on Friday in your report.`;
	},
	compareRound: ({ r, sites, codes }) => {
		let dash = 0;
		let exp = 0;
		const rows = sites.slice(0, int(r, 8, 11)).map((site, i) => {
			const value = int(r, 8000, 46000) + int(r, 0, 99) / 100;
			dash += Math.round(value);
			exp += value;
			return [codes[i]!, site, `£${thousands(Math.round(value))}`, pounds(value), pounds(Math.round(value) - value)];
		});
		rows.push(['', 'Total of these', `£${thousands(dash)}`, pounds(exp), pounds(dash - exp)]);
		return table(['Code', 'Site', 'Dashboard', 'Export', 'Difference'], rows);
	},
	compareClosed: ({ r, sites, codes }) => {
		const odd = new Set([int(r, 0, 3), int(r, 4, 8)]);
		const rows = sites.slice(0, int(r, 9, 12)).map((site, i) => {
			const value = int(r, 8000, 46000) + int(r, 0, 99) / 100;
			const part = odd.has(i) ? int(r, 1500, 9000) + int(r, 0, 99) / 100 : value;
			return [codes[i]!, site, pounds(part), odd.has(i) ? '–' : pounds(value), odd.has(i) ? pounds(part) : '£0.00'];
		});
		return table(['Code', 'Site', 'Dashboard', 'Export', 'Difference'], rows);
	},
	compareTyped: ({ r, sites, codes }) => {
		const swap = int(r, 1, 6);
		const values = sites.slice(0, 10).map(() => int(r, 8000, 46000) + int(r, 0, 99) / 100);
		const rows = values.map((value, i) => {
			const typed = i === swap ? values[swap + 1]! : i === swap + 1 ? values[swap]! : value;
			return [codes[i]!, sites[i]!, pounds(typed), pounds(value), pounds(typed - value)];
		});
		return table(['Code', 'Site', 'Dashboard (typed)', 'Export', 'Difference'], rows);
	},
	feedsLate: ({ r, open, v }) => {
		const rows: string[][] = [];
		for (let i = 6; i >= 1; i--) {
			const d = startOfDay(open) - i * DAY;
			const late = i <= 3 && r() < 0.85;
			const m = d + (late ? 8 * 60 + int(r, 25, 75) : 4 * 60 + int(r, 10, 48));
			rows.push([`${weekday(d).slice(0, 3)} ${dayMonth(d)}`, '05:00', clock(m), String(v.count), thousands(int(r, 9000, 64000))]);
		}
		return table(['Night', 'Expected by', 'Received', 'Files', 'Rows'], rows);
	},
	feedsOnTime: ({ r, open, v }) => {
		const rows: string[][] = [];
		for (let i = 6; i >= 1; i--) {
			const d = startOfDay(open) - i * DAY;
			const bad = i <= 3;
			rows.push([`${weekday(d).slice(0, 3)} ${dayMonth(d)}`, clock(d + 4 * 60 + int(r, 10, 48)), String(v.count), bad ? `refused, loaded ${clock(d + 8 * 60 + int(r, 5, 50))} on retry` : clock(d + 5 * 60 + int(r, 2, 20))]);
		}
		return table(['Night', 'Received', 'Files', 'Loaded'], rows);
	},
	throttle: ({ r }) => {
		const rows: string[][] = [];
		let left = int(r, 300, 520);
		for (let minute = 0; minute < 5 && left > 0; minute++) {
			const sent = minute < 2 ? int(r, 140, 260) : Math.min(left, int(r, 10, 60));
			const answered = Math.min(sent, 60);
			rows.push([`00:0${minute}`, String(sent), String(answered), String(sent - answered)]);
			left -= sent;
		}
		return table(['Minute', 'Calls', 'Answered', 'Refused (429)'], rows);
	},
	hierarchy: ({ r, sites, codes, v }) => {
		const rows = sites.slice(0, int(r, 3, 6)).map((site, i) => [codes[i]!, site, i === 0 ? v.region! : pick(r, regionNames), i === 0 ? v.region2! : pick(r, regionNames), `${int(r, 1, 28)} ${pick(r, ['July', 'August', 'September'])}`]);
		return table(['Code', 'Site', 'Region before', 'Region now', 'Moved on'], rows);
	},
	dupStores: ({ r, sites, codes, open }) => {
		const week = iso(startOfDay(open) - (at(open).getUTCDay() + 6) * DAY - 7 * DAY);
		const lines = ['week_start,site_code,site_name,net_sales,transactions'];
		for (let i = 1; i < 5; i++) lines.push(`${week},${codes[i]},${sites[i]},${(int(r, 8000, 46000) + int(r, 0, 99) / 100).toFixed(2)},${int(r, 900, 4800)}`);
		lines.splice(2, 0, `${week},${codes[0]},${sites[0]},${(int(r, 5000, 30000) + int(r, 0, 99) / 100).toFixed(2)},${int(r, 600, 3000)}`, `${week},${codes[1]},${sites[0]},${(int(r, 5000, 30000) + int(r, 0, 99) / 100).toFixed(2)},${int(r, 600, 3000)}`);
		return `\`\`\`csv\n${lines.join('\n')}\n\`\`\``;
	},
	calendar: ({ r }) => {
		const rows: string[][] = [];
		const start = dayOf('2026-02-01');
		for (const week of [1, 5, 9, 14, 27, 36, 40].slice(0, int(r, 5, 7))) {
			const sunday = start + (week - 1) * 7 * DAY;
			const iso8601 = Math.floor((sunday + DAY - dayOf('2025-12-29')) / (7 * DAY)) + 1;
			rows.push([`${dayMonth(sunday)} to ${dayMonth(sunday + 6 * DAY)}`, `Week ${week}`, `Week ${iso8601} (from Monday ${dayMonth(sunday + DAY)})`]);
		}
		return table(['Our week', 'Our number', 'Your report'], rows);
	},
	consoleOld: ({ r }) => `\`\`\`text\nUncaught TypeError: tiles.at is not a function     charts.${hex(r, 8)}.js:1\nUncaught ReferenceError: WrenCharts is not defined    dashboard.${hex(r, 8)}.js:2\n    at renderTiles (dashboard.${hex(r, 8)}.js:2:${int(r, 1000, 9999)})\n    at HTMLDocument.<anonymous> (dashboard.${hex(r, 8)}.js:2:${int(r, 1000, 9999)})\n\`\`\``,
	consoleSafari: ({ r }) => `\`\`\`text\n[Error] ReferenceError: Can't find variable: requestIdleCallback\n\tscheduleDraw (charts.${hex(r, 8)}.js:1:${int(r, 10000, 99999)})\n\t(anonymous function) (dashboard.${hex(r, 8)}.js:2:${int(r, 1000, 9999)})\n[Warning] Chart tiles not drawn: 0 of ${int(r, 6, 12)} rendered\n\`\`\``,
	consoleBlocked: ({ r }) => `\`\`\`text\nFailed to load resource: net::ERR_BLOCKED_BY_ADMINISTRATOR    https://cdn.wrenfield-analytics.example/charts/v4/charts.${hex(r, 8)}.js\nUncaught ReferenceError: WrenCharts is not defined    dashboard.${hex(r, 8)}.js:2\n\`\`\``,
	auditBurst: ({ r, open, v }) => {
		const slow = v.slowSummary === 'yes';
		const base = recentDays(open, 1)[0] ?? startOfDay(open);
		const m = base + 8 * 60 + int(r, 30, 59);
		let second = int(r, 0, 20);
		const rows: string[][] = [];
		for (let i = 0; i < int(r, 12, 18); i++) {
			second += r() < 0.4 ? 1 : 0;
			rows.push([`${isoTime(m)}:${pad(Math.min(59, second))}`, uuid(r), 'POST', '/reports/stores/summary', '200', String(slow ? int(r, 2900, 5200) : int(r, 180, 640))]);
		}
		return grid(auditHead, rows, auditRight);
	},
	bounce: ({ r, open, v }) => `\`\`\`text\nDelivery has failed to these recipients or groups:\n\nreporting@${v.domain}\nThe message is too large for the recipient’s mailbox or mail server.\n\nRemote server: mx${int(r, 1, 3)}.${v.domain}\nStatus: 552 5.3.4 Message size exceeds fixed maximum message size (10485760)\nArrival date: ${weekday(open - 7 * DAY).slice(0, 3)}, ${dayMonth(open - 7 * DAY)} 2026 06:0${int(r, 0, 9)}\nAttachment: weekly-sales.csv (${(10.4 + r() * 3).toFixed(1)} MB)\n\`\`\``,
	csvZeros: ({ sites, codes }) => `\`\`\`csv\nsite_code,site_name,net_sales\n${codes.slice(0, 4).map((code, i) => `${code},${sites[i]},${(12000 + i * 3817.31).toFixed(2)}`).join('\n')}\n\`\`\`\n\nIn Excel:\n\n${table(['A', 'B', 'C'], codes.slice(0, 4).map((code, i) => [String(Number(code)), sites[i]!, (12000 + i * 3817.31).toFixed(2)]))}`,
	csvDutch: ({ sites, codes }) => `\`\`\`csv\nsite_code,site_name,net_sales,transactions\n${codes.slice(0, 4).map((code, i) => `${code},${sites[i]},${(12000 + i * 3817.31).toFixed(2)},${1400 + i * 211}`).join('\n')}\n\`\`\`\n\nWhat Excel shows, all in column A:\n\n\`\`\`text\n${codes.slice(0, 4).map((code, i) => `${code},${sites[i]},${(12000 + i * 3817.31).toFixed(2)},${1400 + i * 211}`).join('\n')}\n\`\`\``,
	footfallMissing: ({ r, sites }) => {
		const rows: string[][] = [];
		for (let h = 9; h <= 17; h++) rows.push([`${pad(h)}:00`, '–', '–', '–', String(int(r, 40, 260)), String(int(r, 40, 260))]);
		return table(['Hour', sites[0]!, sites[1]!, sites[2]!, sites[3]!, sites[4]!], rows);
	},
	footfallFormat: ({ r, open, codes }) => {
		const d = startOfDay(open) - 2 * DAY;
		const lines = codes.slice(0, 3).map((code, i) => `${code};${iso(d)}T${pad(9 + i)}:00:00+00:00;${int(r, 40, 260)};${int(r, 40, 260)}`);
		return `What the counter files hold since Sunday:\n\n\`\`\`text\n${lines.join('\n')}\n\`\`\`\n\nWhat the import expects, and what it did:\n\n\`\`\`text\n${codes[0]};${pad(at(d).getUTCDate())}/${pad(at(d).getUTCMonth() + 1)}/2026 09:00;${int(r, 40, 260)};${int(r, 40, 260)}\n${int(r, 4100, 9800)} rows read, 0 loaded, ${int(r, 4100, 9800)} skipped (time not recognised)\n\`\`\``;
	},
	stock: ({ r, sites }) => {
		const products = ['Hanging basket 30cm', 'Bird feeder, steel', 'Notebook A5 ruled', 'Reading glasses +2.0', 'Dog lead, red', 'Sourdough loaf', 'Walking socks, pair', 'Picture frame 8x10', 'Gel pens, pack of 6', 'Kitchen scales'];
		const rows = shuffle(r, products).slice(0, int(r, 4, 7)).map((name) => [String(int(r, 100000, 999999)), name, pick(r, sites.slice(0, 3)), String(-int(r, 1, 9)), `${int(r, 2, 6)} days ago`, String(int(r, 4, 30))]);
		return table(['SKU', 'Product', 'Site', 'On hand', 'Last delivery booked', 'Sold since'], rows);
	},
	basket: ({ r, sites }) => {
		const rows: string[][] = [];
		for (let h = 8; h <= 19; h += int(r, 1, 2)) rows.push([`${pad(h)}:00`, String(int(r, 30, 240)), pounds(int(r, 6, 38) + int(r, 0, 99) / 100), pounds(int(r, 6, 38) + int(r, 0, 99) / 100)]);
		return `${sites[0]}, last Saturday:\n\n${table(['Hour', 'Transactions', 'Average basket', 'Same hour last year'], rows)}`;
	},
	usage: ({ r, open }) => {
		const rows: string[][] = [];
		const months = at(open).getUTCMonth() === 9 ? [`6 to ${at(open).getUTCDate() - 1} October`] : ['6 to 31 October', `1 to ${at(open).getUTCDate() - 1} November`];
		for (const month of months) {
			const total = int(r, 18000, 140000);
			const fours = int(r, 40, 900);
			const fives = int(r, 3, 120);
			rows.push([month, thousands(total), thousands(total - fours - fives), thousands(fours), thousands(fives), String(int(r, 140, 900))]);
		}
		return table(['Period', 'Requests', '2xx', '4xx', '5xx', 'Median ms'], rows);
	},
	auditFind: ({ r, open, v }) => {
		const monday = startOfDay(open) - ((at(open).getUTCDay() + 6) % 7) * DAY;
		const m = monday + 7 * 60 + int(r, 0, 4);
		const rows = [[secondsOf(r, m), v.rid!, 'GET', '/reports/weekly', '200', String(int(r, 300, 1400))], [secondsOf(r, m + 1), uuid(r), 'GET', '/reports/stock/levels', '200', String(int(r, 300, 1400))]];
		return grid(auditHead, rows, auditRight);
	},
	auditSame: ({ r, open, v }) => {
		const rows: string[][] = [];
		const day = startOfDay(open) - DAY;
		for (let m = day + 7 * 60; rows.length < 8; m += int(r, 1, 40)) rows.push([secondsOf(r, m), v.toolId!, 'GET', pick(r, ['/reports/weekly', '/reports/daily', '/reports/stock/levels']), '200', String(int(r, 200, 1600))]);
		return `${grid(auditHead, rows, auditRight)}\n\n${int(r, 600, 2400)} rows with that id in the last week.`;
	},
	paging: ({ r, open }) => `\`\`\`json\n{\n  "report": "daily-by-product",\n  "date": "${iso(open - DAY)}",\n  "rows": [\n    ...\n    { "site_code": "${pad(int(r, 20, 919), 4)}", "sku": "${int(r, 100000, 999999)}", "units": ${int(r, 1, 40)}, "net_sales": ${(int(r, 2, 200) + int(r, 0, 99) / 100).toFixed(2)} }\n  ],\n  "page": 1,\n  "page_rows": 50000,\n  "next": "/reports/daily/pages/${hex(r, 12)}/2"\n}\n\`\`\``,
	historyTimeout: ({ r, open, v }) => {
		const rows: string[][] = [];
		for (let i = 6; i >= 1; i--) {
			const d = startOfDay(open) - i * DAY;
			const failed = d >= startOfDay(open) - 7 * DAY + DAY;
			rows.push([`${weekday(d).slice(0, 3)} ${dayMonth(d)}`, 'Full year by site', '02:00', failed ? 'Failed: upstream unavailable (retried 03:00, failed)' : 'Delivered', failed ? '–' : v.rows!]);
			rows.push([`${weekday(d).slice(0, 3)} ${dayMonth(d)}`, 'Daily sales', '06:00', 'Delivered', String(v.count)]);
		}
		return table(['Night', 'Export', 'Runs', 'Result', 'Rows'], rows.slice(-int(r, 8, 12)));
	},
	historyThrottle: ({ r, v }) => {
		const regionsShown = shuffle(r, regionNames).slice(0, int(r, 5, 8));
		const rows = [...regionsShown.map((name) => `Monthly – ${name}`), 'Monthly – group totals'].map((name, i) => [name, '00:00', i < 2 ? 'Delivered' : 'Failed: 429 Too Many Requests', i < 2 ? `00:0${int(r, 1, 4)}` : '–']);
		return table(['Export', 'Runs', 'Result on the 1st', 'Finished'], rows) + `\n\nAll run as ${v.short}’s export account.`;
	},
	historySent: ({ r, open }) => {
		const rows: string[][] = [];
		const monday = startOfDay(open) - ((at(open).getUTCDay() + 6) % 7) * DAY;
		for (let w = 3; w >= 0; w--) rows.push([`Mon ${dayMonth(monday - w * 7 * DAY)}`, 'Weekly trading pack', '05:30', `Sent by email, ${(w < 2 ? 10.4 + r() * 2 : 8.1 + r() * 1.5).toFixed(1)} MB`]);
		return table(['Day', 'Export', 'Runs', 'Result'], rows);
	},
	sizes: ({ r, v }) => {
		const rows = [10, 25, 40, 45, 50, 100, Number(v.count)].filter((n, i, all) => n <= Number(v.count) && all.indexOf(n) === i).map((n) => {
			const size = n * int(r, 318, 352);
			return [String(n), `${(size / 1024).toFixed(1)} KB`, size > 16384 ? '413 Payload Too Large' : '200'];
		});
		return table(['Sites selected', 'Body sent', 'Answer'], rows);
	},
	slowtimes: ({ r, open }) => {
		const rows: string[][] = [];
		for (let w = 5; w >= 0; w--) {
			const d = startOfDay(open) - w * 7 * DAY - int(r, 1, 3) * DAY;
			const after = d > dayOf('2026-10-06');
			rows.push([`${weekday(d).slice(0, 3)} ${dayMonth(d)}`, `${pad(2)}:${pad(int(r, 0, 10))}`, after ? `${int(r, 61, 112)} min` : `${int(r, 31, 48)} min`, after ? `${(int(r, 52, 96) / 10).toFixed(1)} s` : `${(int(r, 21, 38) / 10).toFixed(1)} s`]);
		}
		return table(['Night', 'Started', 'Refresh took', 'Slowest call'], rows);
	},
	slash: ({ r, open }) => {
		const day = startOfDay(open) - DAY;
		const rows = [
			[secondsOf(r, day + 6 * 60 + 2), uuid(r), 'GET', '/reports/daily', '200', String(int(r, 300, 900))],
			[secondsOf(r, day + 6 * 60 + 31), uuid(r), 'GET', '/reports/daily/', '404', String(int(r, 3, 12))],
			[secondsOf(r, day + 6 * 60 + 33), uuid(r), 'GET', '/reports/daily/', '404', String(int(r, 3, 12))]
		];
		return grid(auditHead, rows, auditRight);
	},
	lfl: ({ r }) => {
		const rows = ['12 Oct', '19 Oct', '26 Oct', '2 Nov'].map((week, i) => {
			const change = [int(r, 2, 6), int(r, -18, -12), int(r, 17, 24), int(r, 1, 5)][i]!;
			return [`w/c ${week}`, `£${thousands(int(r, 410, 690) * 1000)}`, `${change > 0 ? '+' : ''}${change}%`, i === 1 ? 'last year' : i === 2 ? 'this year' : ''];
		});
		return table(['Week', 'Sales', 'Like-for-like', 'Half-term'], rows);
	},
	account: ({ r, v, client }) => {
		const pool: [string, string, string, string, string][] = [
			['Daily sales', '/reports/daily', '06:00 daily', 'CSV', 'download link'],
			['Weekly trading pack', '/reports/weekly', '05:30 Mondays', 'XLSX', `email (${int(r, 2, 6)} recipients)`],
			['Stock levels', '/reports/stock/levels', '04:45 daily', 'CSV', 'download link'],
			['Full year by site', '/reports/daily', '02:00 daily', 'CSV', `email (${int(r, 1, 3)})`],
			['Footfall by hour', '/reports/footfall/hourly', '07:00 daily', 'CSV', 'download link'],
			['Monthly by region', '/reports/monthly', '00:00 on the 1st', 'XLSX', `email (${int(r, 2, 8)})`],
			['Region league table', '/reports/regions', '06:15 Mondays', 'PDF', `email (${int(r, 4, 20)})`],
			['Product sales', '/reports/daily', '03:30 daily', 'CSV', 'download link']
		];
		const rows = shuffle(r, pool).slice(0, int(r, 3, 6)).map((row) => [...row]);
		return `${table(['Export', 'Report', 'Runs', 'Format', 'Delivery'], rows)}\n\nDashboard users: ${int(r, 12, 160)} · ${v.tool} connected: ${r() < 0.7 ? 'yes' : 'no'} · Client since ${client.since} · Account manager: ${v.m}`;
	}
};
const paste = (kind: string, c: Ctx) => {
	const make = pastes[kind];
	if (!make) throw new Error(`no paste ${kind}`);
	return make(c);
};

const fill = (text: string, values: Record<string, string>, c?: Ctx): string =>
	text.replace(/\{(P:)?(\w+)\}/g, (_, isPaste: string | undefined, key: string) => {
		if (isPaste) {
			if (!c) throw new Error(`no paste context for ${key}`);
			return paste(key, c);
		}
		const value = values[key];
		if (value === undefined) throw new Error(`no value for {${key}} in: ${text.slice(0, 60)}`);
		return value;
	});
const quote = (text: string) =>
	text
		.split('\n')
		.map((line) => (line ? `> ${line}` : '>'))
		.join('\n');

interface Plan {
	topic: Topic;
	path: Path;
	end: Msg[];
	open: number;
}

const escalation = (index: number, plan: Plan, number: number): string => {
	const r = mulberry32(0x5e1ce000 + index * 7919);
	const { topic, path, end } = plan;
	const fitting = topic.fits ? clients.filter(topic.fits) : clients;
	const client = fitting[(index * 7 + int(r, 0, 5)) % fitting.length]!;
	const first = pick(r, firstNames);
	const last = pick(r, surnames);
	const sites = shuffle(r, towns)
		.slice(0, 12)
		.map((town) => `${town}${places[hash(client.name + town) % places.length]}`);
	const codes = sites.map((site) => pad((hash(client.name + site) % 900) + 20, 4));
	const regions = shuffle(r, regionNames);
	const agentFull = pick(r, support);
	const people = Object.fromEntries(Object.entries(teams).map(([key, team]) => [key, pick(r, team.people)])) as Record<string, string>;
	const open = office(r, plan.open + int(r, 8 * 60 + 30, 16 * 60 + 30));
	const domain = `${client.short.toLowerCase().replace(/[^a-z]+/g, '')}.example`;
	let rel = open - int(r, 2, 6) * DAY;
	while (isWeekend(rel)) rel -= DAY;
	const dayOfYear = Math.floor((open - dayOf('2026-01-01')) / DAY);
	const rows = client.count * dayOfYear;

	const values: Record<string, string> = {
		name: first,
		full: `${first} ${last}`,
		role: pick(r, topic.it ? itRoles : roles),
		client: client.name,
		short: client.short,
		unit: client.unit,
		count: String(client.count),
		since: String(client.since),
		tool: client.tool,
		provider: client.provider,
		store: sites[0]!,
		store2: sites[1]!,
		store3: sites[2]!,
		code: codes[0]!,
		code2: codes[1]!,
		codeNum: String(Number(codes[0])),
		region: regions[0]!,
		region2: regions[1]!,
		agent: agentFull.split(' ')[0]!,
		colleague: pick(r, colleagues),
		monitor: pick(r, monitors),
		domain,
		hq: `${int(r, 2, 90)} ${pick(r, ['Mill Lane', 'Church Street', 'Station Approach', 'Bridge Street', 'Kings Road'])}, ${towns[hash(client.name) % towns.length]}`,
		day: weekday(nextWorkday(open, 2)),
		openDay: weekday(open),
		date: dayMonth(open),
		weekAgo: dayMonth(open - 7 * DAY),
		rel: weekday(rel),
		month: monthNames[at(open).getUTCMonth()]!,
		prev: monthNames[at(open).getUTCMonth() - 1]!,
		clock: clock(open - int(r, 20, 90)),
		n: String(int(r, 3, 9)),
		N: String(int(r, 14, 61)),
		k: String(int(r, 160, 520)),
		secs: String(int(r, 12, 41)),
		rows: thousands(rows),
		mb: ((rows * 88) / 1e6).toFixed(1),
		bigRows: thousands(int(r, 1200, 3100) * 1000 + int(r, 0, 999)),
		gap: pounds(int(r, 1200, 9800) + int(r, 0, 99) / 100),
		pct: String(int(r, 3, 18)),
		rid: uuid(r),
		toolId: { 'Power BI': 'pbi-refresh', Tableau: 'tableau-extract', Qlik: 'qlik-reload', 'Looker Studio': 'looker-sync', 'Excel Power Query': 'pq-refresh', Airflow: 'airflow-pull', SSIS: 'ssis-nightly' }[client.tool] ?? 'refresh',
		friday: dayMonth(startOfDay(open) - (((at(open).getUTCDay() + 2) % 7) || 7) * DAY),
		slowSummary: path.look.some(([, text]) => text.includes('three to five seconds')) ? 'yes' : 'no'
	};
	for (const [key, person] of Object.entries(people)) values[key] = person.split(' ')[0]!;
	const c: Ctx = { r, v: values, client, sites, codes, open };
	const f = (text: string) => fill(text, values, c);

	// The thread, before times are given.
	const entries: { who: Who; body: string; gap: [number, number] }[] = [];
	const add = (who: Who, body: string, gap: [number, number]) => entries.push({ who, body, gap });
	const aside = r() < 0.75 ? pick(r, asides) : undefined;
	const asideEarly = aside && r() < 0.5;

	const email = [
		`${f(pick(r, greetings))},`,
		...(r() < 0.55 ? [f(pick(r, contexts))] : []),
		f(pick(r, topic.open)),
		...shuffle(r, topic.more)
			.slice(0, int(r, 0, 2))
			.map(f),
		...(r() < 0.4 ? [f(pick(r, situations))] : []),
		...(asideEarly ? [f(aside.q)] : []),
		f(pick(r, signs)),
		...(r() < 0.3 ? [f(pick(r, disclaimers))] : [])
	].join('\n\n');
	const account = r() < 0.9 ? [`${pick(r, ['Their account:', 'Their exports, from the admin portal:', 'What they have set up with us:'])}\n\n${paste('account', c)}`] : [];
	add('a', [f(pick(r, topic.guess)), f(pick(r, intros)), quote(email), `${pick(r, ['What I’ve checked:', 'Checked so far:', 'From our side:'])} ${f(pick(r, topic.checked))}`, ...account].join('\n\n'), [0, 0]);
	add(topic.to, f(pick(r, topic.ask)), [30, 300]);
	add('c', [f(pick(r, path.detail)), ...(aside && !asideEarly ? [f(aside.q)] : [])].join('\n\n'), [120, 1500]);
	const firstLook = path.look[0]![0];
	if (firstLook !== 'a' && firstLook !== 'c' && !path.look.some(([who]) => who === topic.to)) add(topic.to, fill(pick(r, handovers), { next: people[firstLook]!.split(' ')[0]! }), [90, 900]);
	path.look.forEach(([who, text], i) => add(who, f(text), i === 0 ? [90, 1400] : [40, 400]));
	for (const exchange of shuffle(r, topic.follow).slice(0, r() < 0.15 ? 0 : r() < 0.55 ? 1 : 2))
		for (const [who, text] of exchange) add(who, f(text), who === 'c' ? [240, 1500] : [40, 600]);
	const lastLook = path.look.at(-1)![0];
	if (r() < 0.35) {
		add('a', f(pick(r, chasers)), [600, 2600]);
		add(lastLook === 'a' || lastLook === 'c' ? topic.to : lastLook, f(pick(r, holds)), [30, 240]);
	}
	if (aside) add(aside.who, f(aside.a), [60, 900]);
	end.forEach(([who, text]) => add(who, f(text), who === 'c' ? [240, 2600] : [60, 1800]));

	// Times: each message after the one before, inside office hours, all before 20 November.
	let times: number[] = [];
	for (let squeeze = 1; squeeze > 0.01; squeeze *= 0.6) {
		let t = open;
		times = entries.map((entry, i) => (i === 0 ? open : (t = office(r, t + Math.round(int(r, entry.gap[0], entry.gap[1]) * squeeze)))));
		if (times.at(-1)! <= LAST_MESSAGE) break;
	}
	const label = (who: Who) => (who === 'a' || who === 'c' ? `**${agentFull}** (client support)` : `**${people[who]}** (${teams[who].label})`);
	const messages = entries.map((entry, i) => {
		const body = entry.who === 'c' ? `${f(pick(r, relays))}\n\n${quote(entry.body)}` : entry.body;
		return `${label(entry.who)} · ${stamp(times[i]!)}\n\n${body}`;
	});
	const subject = f(pick(r, topic.subjects));
	return [`# ESC-${number}: ${subject}`, `Client: ${client.name} (${client.count} ${client.unit}) · Contact: ${values.full}, ${values.role} · Opened by ${agentFull}, ${stampLong(open)}`, ...messages.map((message) => `---\n\n${message}`)].join('\n\n') + '\n';
};

// Dates: the escalations are spread over the working days from 15 September to 13 November.
const workdays: number[] = [];
for (let d = FIRST_DAY; d <= LAST_DAY; d += DAY) if (!isWeekend(d)) workdays.push(d);

// Which topic, path and ending each escalation follows: topics are dealt in rounds, each round in a new order, and
// the paths and endings of a topic in turn, so that two escalations on one topic end differently until they run out.
const order = mulberry32(20260915);
const endings = new Map<Topic, [Path, Msg[]][]>(topics.map((topic) => [topic, topic.paths.flatMap((path) => path.ends.map((end): [Path, Msg[]] => [path, end]))]));
const plans: Plan[] = [];
const used = new Map<Topic, number>();
const deck: Topic[] = [];
for (let index = 0; index < ITEMS; index++) {
	const open = workdays[Math.floor((index * workdays.length) / ITEMS)]!;
	const allowed = (topic: Topic) => (!topic.since || iso(open) >= topic.since) && (!topic.until || iso(open) <= topic.until) && (!topic.when || topic.when(open));
	if (!deck.some(allowed)) deck.push(...shuffle(order, topics.flatMap((topic) => Array<Topic>(Math.max(0, (topic.weight ?? 1) - deck.filter((held) => held === topic).length)).fill(topic))));
	if (!deck.some(allowed)) deck.push(...shuffle(order, topics.filter(allowed)));
	const topic = deck.splice(deck.findIndex(allowed), 1)[0]!;
	const seen = used.get(topic) ?? 0;
	used.set(topic, seen + 1);
	const choices = endings.get(topic)!;
	const [path, end] = choices[(seen + topics.indexOf(topic)) % choices.length]!;
	plans.push({ topic, path, end, open });
}

const folder = join(root, 'support', 'escalations');
mkdirSync(folder, { recursive: true });
let number = 2180;
plans.forEach((plan, index) => {
	number += int(order, 1, 4);
	writeFileSync(join(folder, `ESC-${number}.md`), escalation(index, plan, number));
});
writeFileSync(
	join(folder, 'README.md'),
	'# Escalations, 15 September to 13 November 2026\n\nThe escalations client support passed to engineering in these nine weeks, one file each, exported from the old\ntracker before the move. The export kept the messages, with the clients’ emails as support pasted them, but not the\nlabels, owners or statuses. Numbers missing from the sequence were duplicates or were merged into another\nescalation.\n'
);
