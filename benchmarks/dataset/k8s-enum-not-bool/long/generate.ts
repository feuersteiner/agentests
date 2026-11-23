// Writes the long material of this entry's long tasks: the tickets Fernhill's support desk passed to the Trellis
// API team between 5 October and 13 November 2026, one Markdown file each, under docs/support-tickets/, as the old
// help desk exported them, without tags, statuses or assignees. Deterministic: fixed seeds, no clock, no network.
//   bun long/generate.ts <workspace root>
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** How many tickets to write. Dates, ticket numbers and the share of each topic all follow from it. */
const ITEMS = 185;

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
/** A stable number for a name, so that a customer keeps its ids and its size from ticket to ticket. */
const hash = (text: string) => [...text].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);
const pad = (value: number) => String(value).padStart(2, '0');
const hex = (r: Rand, length: number) => Array.from({ length }, () => '0123456789abcdef'[int(r, 0, 15)]).join('');
const money = (pounds: number) => `£${pounds.toFixed(2).replace(/\B(?=(\d{3})+\.)/g, ',')}`;
/** The Trellis API's own slugify, as it is today: every character outside a–z and 0–9 becomes a dash. */
const slugify = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '-');

// Time is kept in minutes since 00:00 on 1 October 2026, UK local time. British Summer Time ends at 02:00 on
// 25 October, so log lines, which are in UTC, are an hour behind the local clock before then.
const EPOCH = Date.UTC(2026, 9, 1);
const LAST_MESSAGE = 50 * 1440 + 17 * 60; // 20 November, 17:00
const BST_ENDS = 24 * 1440 + 120;
const at = (minutes: number) => new Date(EPOCH + minutes * 60000);
const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const weekday = (minutes: number) => dayNames[at(minutes).getUTCDay()]!;
const clock = (minutes: number) => `${pad(at(minutes).getUTCHours())}:${pad(at(minutes).getUTCMinutes())}`;
const shortDate = (d: Date) => `${d.getUTCDate()} ${monthNames[d.getUTCMonth()]!.slice(0, 3)} ${d.getUTCFullYear()}`;
const longDate = (d: Date) => `${d.getUTCDate()} ${monthNames[d.getUTCMonth()]!} ${d.getUTCFullYear()}`;
const dayMonth = (minutes: number) => `${at(minutes).getUTCDate()} ${monthNames[at(minutes).getUTCMonth()]!}`;
const stampShort = (minutes: number) => `${weekday(minutes).slice(0, 3)} ${at(minutes).getUTCDate()} ${monthNames[at(minutes).getUTCMonth()]!.slice(0, 3)}, ${clock(minutes)}`;
const stampLong = (minutes: number) => `${weekday(minutes)} ${longDate(at(minutes))}, ${clock(minutes)}`;
const iso = (minutes: number) => at(minutes).toISOString().slice(0, 10);
/** A UTC timestamp for a log line, from local minutes and extra milliseconds. */
const utc = (minutes: number, ms = 0) => new Date(EPOCH + (minutes - (minutes < BST_ENDS ? 60 : 0)) * 60000 + ms).toISOString();
const isWeekend = (minutes: number) => at(minutes).getUTCDay() % 6 === 0;
const minuteOfDay = (minutes: number) => ((minutes % 1440) + 1440) % 1440;
const startOfDay = (minutes: number) => minutes - minuteOfDay(minutes);
/** The next weekday at or after `minutes`, as a weekday name. */
const weekdayFrom = (minutes: number) => {
	let m = minutes;
	while (isWeekend(m)) m += 1440;
	return weekday(m);
};
/** The last weekday before `minutes`. */
const weekdayBefore = (minutes: number, days: number) => {
	let m = startOfDay(minutes) - days * 1440;
	while (isWeekend(m)) m -= 1440;
	return m;
};

// Trellis API 0.6.0, with a project's default role and form payloads for webhooks, went out on 20 October.
const RELEASE_060 = 19 * 1440 + 10 * 60;

// People at Fernhill.
const agents = ['Imogen', 'Kofi', 'Rosa', 'Teodor', 'Aoife'];
const apiTeam = ['Ana Ferreira', 'Ben Hollis', 'Priya Raman'];
const webTeam = ['Mirela Popescu', 'Jonah Feld'];
const accountsTeam = ['Hugo Brandt', 'Nadia Sorensen'];
const opsTeam = ['Wiktor Nowak', 'Leah Dunmore'];
const billing = 'Esther Quaye';
const dataLead = 'Sunita Varma';

// Customers: organisations that run their work in Trellis projects.
interface Kind {
	kind: string;
	names: string[];
	projects: string[];
	roles: string[];
	devRoles: string[];
	intro: string[];
}
const kinds: Kind[] = [
	{ kind: 'design studio', names: ['Brightwater Studio', 'Kestrel & Finch', 'Northlight Design'], projects: ['Spring Campaign', 'Website Relaunch', 'Brand Refresh', 'Packaging Range', 'Client Portal', 'Autumn Lookbook'], roles: ['Studio Manager', 'Creative Director', 'Account Director'], devRoles: ['Front-end Developer', 'Technical Lead'], intro: ['We’re a design studio of {N} people, and every client job lives in its own Trellis project.', 'We’re a small studio, {N} of us, and we run all our client work in Trellis.'] },
	{ kind: 'charity', names: ['Harbour Light Trust', 'Greenway Foundation', 'Open Door Aid'], projects: ['Winter Appeal', 'Volunteer Rota', 'Grant Applications', 'Trustee Papers', 'Summer Fair', 'Shop Openings'], roles: ['Operations Manager', 'Fundraising Manager', 'Volunteer Coordinator'], devRoles: ['Digital Officer', 'IT and Data Lead'], intro: ['We’re a charity with {N} staff and a lot of volunteers, and Trellis is where our campaigns are planned.', 'We have {N} staff across two offices and use Trellis for appeals, events and grant bids.'] },
	{ kind: 'school', names: ['Elmwood Academy', 'St Cuthbert’s School', 'Kingsmead College'], projects: ['Year 9 Trips', 'Open Evening', 'Exam Timetable', 'Sports Day', 'Staff Training', 'Prospectus 2027'], roles: ['Business Manager', 'Deputy Head', 'Office Manager'], devRoles: ['Network Manager', 'IT Technician'], intro: ['We’re a secondary school; about {N} staff use Trellis for trips, events and the exam timetable.', 'Our school moved its planning into Trellis last year, and {N} staff now use it.'] },
	{ kind: 'architecture practice', names: ['Marlow Ward Architects', 'Studio Ashby', 'Quarry Lane Architects'], projects: ['Riverside Housing', 'Library Extension', 'Mill Conversion', 'Planning Submissions', 'School Refurbishment', 'Site Visits'], roles: ['Practice Manager', 'Associate Director', 'Project Architect'], devRoles: ['BIM Manager', 'IT Manager'], intro: ['We’re an architecture practice of {N} people, with one Trellis project per scheme.', 'There are {N} of us, architects and technologists, and each job has its own board.'] },
	{ kind: 'software consultancy', names: ['Parcel & Pike', 'Lantern Labs', 'Ironbridge Software'], projects: ['Client Onboarding', 'Mobile App v3', 'Data Migration', 'Sprint Board', 'Security Review', 'Support Rota'], roles: ['Delivery Manager', 'Head of Operations', 'Engineering Manager'], devRoles: ['Senior Developer', 'Platform Engineer', 'Backend Developer'], intro: ['We’re a software consultancy of {N} people and we connect Trellis to most of our own tooling.', 'We build software for clients, {N} of us, and every engagement gets a Trellis project.'] },
	{ kind: 'events company', names: ['Merriman Events', 'Lighthouse Live', 'Bluebell Weddings'], projects: ['Christmas Parties', 'Conference 2027', 'Venue Shortlist', 'Wedding Season', 'Supplier Contracts', 'Awards Night'], roles: ['Events Director', 'Operations Lead', 'Senior Planner'], devRoles: ['Systems Administrator', 'Web Developer'], intro: ['We plan events, {N} of us full time plus freelancers, and Trellis holds every booking.', 'We’re an events company with {N} staff, and our busy season is about to start.'] },
	{ kind: 'publisher', names: ['Gull Press', 'Hartley & Vine', 'Saltash Books'], projects: ['Spring List', 'Autumn Catalogue', 'Translation Rights', 'Book Fair', 'Cover Approvals', 'Reprints'], roles: ['Managing Editor', 'Production Manager', 'Publishing Director'], devRoles: ['Digital Producer', 'Web Developer'], intro: ['We’re an independent publisher with {N} staff; each season’s list is a Trellis project.', 'There are {N} of us, editors, designers and the production team.'] },
	{ kind: 'brewery', names: ['Tidewell Brewing', 'Copperfield Ales', 'Old Forge Brewery'], projects: ['Taproom Events', 'New Cans', 'Seasonal Range', 'Trade Orders', 'Festival Stand', 'Brewhouse Rota'], roles: ['General Manager', 'Sales Director', 'Operations Manager'], devRoles: ['IT Contractor', 'Systems Lead'], intro: ['We’re a craft brewery with a taproom and {N} staff.', 'We have {N} people between the brewhouse, the taproom and sales.'] },
	{ kind: 'research group', names: ['Coastal Ecology Group', 'Neuroimaging Unit', 'Soil Science Lab'], projects: ['Fieldwork 2027', 'Grant Renewal', 'Lab Inductions', 'Sample Tracking', 'Paper Drafts', 'Equipment Bookings'], roles: ['Lab Manager', 'Research Coordinator', 'Principal Investigator'], devRoles: ['Research Software Engineer', 'Data Manager'], intro: ['We’re a university research group of {N} people, students included.', 'Our lab has {N} members, and Trellis is how we keep fieldwork and papers on track.'] },
	{ kind: 'council', names: ['Wyvern District Council', 'Ashcombe Town Council', 'Melbury Parish Council'], projects: ['Parks Strategy', 'Christmas Lights', 'Community Grants', 'Planning Responses', 'Community Events', 'Website Content'], roles: ['Communications Officer', 'Town Clerk', 'Project Officer'], devRoles: ['Digital Services Officer', 'Applications Developer'], intro: ['We’re a local council team; {N} officers use Trellis for projects and events.', 'About {N} of our officers work in Trellis, mostly on community projects.'] },
	{ kind: 'marketing agency', names: ['Rook Digital', 'Kite & Compass', 'Paper Street Marketing'], projects: ['Q4 Campaigns', 'Social Calendar', 'Product Launch', 'Partner Programme', 'Pitch Decks', 'Retainers'], roles: ['Account Manager', 'Head of Client Services', 'Managing Director'], devRoles: ['Marketing Technologist', 'Developer'], intro: ['We’re a marketing agency with {N} people and a lot of clients who like to see the board.', 'There are {N} of us, and each retainer client has its own Trellis project.'] },
	{ kind: 'production company', names: ['Kittiwake Films', 'Second Unit Productions', 'Northbank Pictures'], projects: ['Documentary Edit', 'Shoot Schedule', 'Festival Submissions', 'Commercials 2026', 'Archive Clearances', 'Post-production'], roles: ['Producer', 'Production Manager', 'Head of Production'], devRoles: ['Post-production Engineer', 'Pipeline Developer'], intro: ['We’re a film production company, {N} staff plus crew per job.', 'There are {N} of us in the office, and freelancers join each production.'] },
	{ kind: 'translation agency', names: ['Babel & Co Translations', 'Lingua Bridge', 'Polyglot Partners'], projects: ['Client Glossaries', 'Rush Jobs', 'Interpreter Bookings', 'Quality Reviews', 'Tender Responses', 'Localisation'], roles: ['Operations Manager', 'Project Manager', 'Director'], devRoles: ['Localisation Engineer', 'Developer'], intro: ['We’re a translation agency with {N} in-house staff and offices in Bristol and Lyon.', 'We have {N} project managers and linguists across three countries.'] },
	{ kind: 'sports club', names: ['Wharfedale Rowing Club', 'Kingsholm Netball', 'Castle Park Harriers'], projects: ['Junior Section', 'Regatta 2027', 'Kit Orders', 'Coaching Rota', 'Club Fundraiser', 'Membership Renewals'], roles: ['Club Secretary', 'Chair', 'Membership Secretary'], devRoles: ['Volunteer Web Admin', 'Club Developer'], intro: ['We’re a sports club run by volunteers; about {N} of the committee and coaches use Trellis.', 'We have {N} volunteers on Trellis, all doing this in their spare time.'] },
	{ kind: 'online shop', names: ['Wildflower & Thread', 'Moss & Pebble', 'Hopscotch Toys'], projects: ['Black Friday', 'Product Photography', 'Supplier Onboarding', 'Returns Backlog', 'Website Redesign', 'Christmas Stock'], roles: ['Founder', 'Operations Manager', 'E-commerce Manager'], devRoles: ['Freelance Developer', 'Web Developer'], intro: ['We run an online shop with {N} staff, and the run-up to Christmas is everything.', 'We’re a small online business, {N} of us.'] },
	{ kind: 'clinic', names: ['Riverbank Physiotherapy', 'Linden Clinic', 'Clearview Opticians'], projects: ['Clinic Refurb', 'Staff Training', 'Patient Leaflets', 'New Site Opening', 'Audit Actions', 'Recruitment'], roles: ['Practice Manager', 'Clinical Lead', 'Operations Manager'], devRoles: ['IT Support', 'Systems Administrator'], intro: ['We’re a private clinic with {N} staff; Trellis holds our non-clinical projects.', 'We have {N} staff over two sites, and we plan the new site opening in Trellis.'] },
	{ kind: 'arts centre', names: ['Calderbrook Museum', 'The Tannery Gallery', 'Westmoor Arts Centre'], projects: ['Spring Exhibition', 'Schools Programme', 'Collection Audit', 'Lottery Bid', 'Gift Shop Range', 'Volunteer Inductions'], roles: ['Exhibitions Manager', 'Learning Officer', 'Director'], devRoles: ['Digital Manager', 'Collections Systems Officer'], intro: ['We’re a museum and gallery with {N} staff and a big volunteer team.', 'There are {N} of us on staff, and exhibitions are planned in Trellis two years ahead.'] }
];
const firstNames = ['Hannah', 'Marcus', 'Bronagh', 'Tobias', 'Adaeze', 'Simone', 'Rhys', 'Yasmin', 'Gordon', 'Clodagh', 'Idris', 'Pippa', 'Mateusz', 'Ruth', 'Euan', 'Anjali', 'Wesley', 'Ines', 'Callum', 'Femi', 'Harriet', 'Jonas', 'Leila', 'Duncan', 'Alys', 'Kieran', 'Malika', 'Seren', 'Ravi', 'Tess', 'Oluwaseun', 'Freya', 'Dmitri', 'Nuala', 'Graham', 'Zainab', 'Ewan', 'Marguerite', 'Kwabena', 'Lotte', 'Patrick', 'Sian', 'Jamal', 'Orla', 'Benedict'];
const femaleNames = new Set(['Hannah', 'Bronagh', 'Adaeze', 'Simone', 'Yasmin', 'Clodagh', 'Pippa', 'Ruth', 'Anjali', 'Ines', 'Harriet', 'Leila', 'Alys', 'Malika', 'Seren', 'Tess', 'Freya', 'Nuala', 'Zainab', 'Marguerite', 'Lotte', 'Sian', 'Orla']);
const surnames = ['Okafor', 'Pemberton', 'Kaur', 'Lindgren', 'Mwangi', 'Ashworth', 'Delacroix', 'Rahman', 'Fairbairn', 'Kowalski', 'Thorne', 'Nwosu', 'Galloway', 'Hussain', 'Ferreira', 'Blackwood', 'Ivanova', 'MacLeod', 'Achterberg', 'Sutcliffe', 'Oyelaran', 'Brennan', 'Castell', 'Whitaker', 'Jansen', 'Parekh', 'Llewellyn', 'Moreau', 'Quigley', 'Adebayo', 'Holm', 'Strachan', 'Venkatesh', 'Cordell', 'Tremayne'];
const providers = ['mailbox.example', 'postbox.example', 'inbox.example'];
/** Project names whose slugs come out badly with today's slugify. */
const oddNames = ['Q4  Launch!', 'Winter Appeal (2026)', 'Board pack – November', 'R&D: Sensors', 'Fundraising / Events', '“Big Idea” workshop', 'Phase 2?', 'Budget 2027 (draft)', 'Bids & tenders!!'];
/** Project names with letters outside a–z, and where the team that named them works. */
const accentNames: [string, string][] = [['Café Rebrand', 'Lyon'], ['Équipe Nantes', 'Nantes'], ['Straßenfest 2027', 'Cologne'], ['São Paulo Launch', 'São Paulo'], ['Fête de Noël', 'Lyon'], ['Malmö Office', 'Malmö'], ['Zürich Pilot', 'Zürich'], ['Señales Campaign', 'Seville'], ['Kraków Hub', 'Kraków'], ['Ålesund Survey', 'Ålesund']];

// Topics. A ticket follows one path of one topic. Nothing about the topic, the part of Trellis it concerns or how it
// ended is written into the file except through the messages themselves.
// Who writes: c the customer, m the customer's colleague, a support, n support's internal note, e an API team note,
// E the API team to the customer, w a web team note, k an accounts and security note, K accounts and security to the
// customer, o an operations note, b a billing note, B billing to the customer, d a data protection note, D data
// protection to the customer, s the help desk itself.
type Who = 'c' | 'm' | 'a' | 'n' | 'e' | 'E' | 'w' | 'k' | 'K' | 'o' | 'b' | 'B' | 'd' | 'D' | 's';
type Msg = [Who, string];
type Paste =
	| 'account'
	| 'typoAccount'
	| 'colleagueAccount'
	| 'noAccount'
	| 'members'
	| 'memberList'
	| 'dupMembers'
	| 'project'
	| 'apiLog'
	| 'apiLogDup'
	| 'apiLogBlank'
	| 'apiLogSettings'
	| 'apiLog401'
	| 'apiLog405'
	| 'deliveries'
	| 'deliveriesFailed'
	| 'receiverLog'
	| 'formBody'
	| 'webhook'
	| 'keyTable'
	| 'webhookCurl'
	| 'keys'
	| 'stack401'
	| 'mailSent'
	| 'mailBounce'
	| 'mailLate'
	| 'slugs'
	| 'csvRows'
	| 'invoices'
	| 'console'
	| 'none';
interface Path {
	/** First messages that fit this path only, as positions in the topic's or as text; the topic's when left out. */
	open?: (number | string)[];
	detail: string[];
	/** Pasted by the customer under the detail. */
	paste?: Paste;
	look: string[];
	/** Who looks first: support's own note when left out. */
	lookWho?: Who;
	/** Pasted under the note; nothing when left out. */
	lookPaste?: Paste;
	ends: Msg[][];
	/** The team support waits on, if it sends a holding reply. */
	team?: string;
	/** The ticket may end with a satisfaction survey. */
	happy?: boolean;
}
interface Topic {
	id: string;
	/** The earliest time, in minutes, a ticket on this topic can be opened. */
	since?: number;
	/** Whether the customer writing is the developer of an integration or someone who runs projects. */
	writer: 'dev' | 'owner';
	/** Pasted by the customer in the first message. */
	shows?: Paste;
	subjects: string[];
	open: string[];
	more: string[];
	ask: string[];
	paths: Path[];
}
const remind: Msg = ['s', 'Automatic reminder sent to the customer after five working days without a reply.'];

const memberTopics: Topic[] = [
	{
		id: 'duplicate',
		writer: 'owner',
		shows: 'memberList',
		subjects: ['Colleague listed twice', 'Same person twice on the members list', 'Two emails for one add?', 'Odd duplicate in our project'],
		open: [
			'Something odd on {project}. {colleagueFull} appears twice on the members list, and {she} says {she} got two “You were added” emails within a minute of each other. Is {she} in there twice, and does it matter?',
			'{colleague} forwarded me two identical emails from Trellis saying {she}’d been added to {project}. When I look at the members list {she}’s there twice. I only meant to add {him} once. Can you tidy it up?',
			'Quick one: the members list for {project} shows {colleagueFull} two times with the same email address. I don’t know how that happened. We pay per member, so I’d like to be sure we’re not paying twice for {him}.'
		],
		more: [
			'It’s not urgent, but we’re auditing who can see what before the end of the quarter and I want the list to be right.',
			'I’d rather not guess, because the project has client material in it and I need to know exactly what {she} can do.',
			'I tried refreshing and signing out and in again, and the list still shows both.'
		],
		ask: [
			'Thanks for flagging this. Could you tell me how {colleague} was added: from the members page in Trellis, or by a script or integration using an API key? And roughly when? That tells us where to look.',
			'Thanks. Before I pass this to the API team, can you tell me whether anyone else might have added {colleague} at about the same time, for example a colleague or an automated tool?'
		],
		paths: [
			{
				detail: [
					'I added {him} from the members page on {wday}. The first time, the page sat there with the spinner for ages, so I clicked Add again. Nobody else can add people to that project.',
					'It was me, on {wday} morning, from the members page. It looked as if nothing had happened the first time, so I tried again. I suppose that was the second one.'
				],
				lookWho: 'e',
				look: [
					'Two entries for {cuid} on {prj}, added {gap} seconds apart, both from the owner’s session. addMember doesn’t look for an existing entry before adding, so the second click went straight through and sent a second email. Removed the later entry by hand; the members list now has {colleague} once, as {roleKept}.',
					'Confirmed: {cuid} is on {prj} twice, {gap} seconds apart, same session. The web app was slow to answer the first request and the owner clicked again; the API accepted both. Took out the second entry. Nothing else on the project touched.'
				],
				lookPaste: 'dupMembers',
				ends: [
					[
						['a', 'The API team found that {colleague} had been added twice, a few seconds apart, while the page was slow to answer the first time. They’ve removed the second entry, so {she}’s listed once now, as {roleKept}. You’re only charged for {him} once in any case: billing counts people, not entries.'],
						['c', 'Brilliant, the list looks right now. Thanks for the quick fix.']
					]
				],
				happy: true
			},
			{
				detail: [
					'Ah. We have a small script that adds new starters to their team’s projects every Monday, using an API key. It may have run twice; {colleague2} was changing it last week.',
					'Not by hand. Our onboarding script adds people to {project} with an API key when HR marks them as started. I’ll ask {colleague2}, who looks after it.'
				],
				lookWho: 'e',
				look: [
					'The log shows two POSTs to the members endpoint for {cuid} from their key ({prefix}), {gap} seconds apart, both answered 201, so the person was added twice. Looks like their script retried after a timeout on its own side. Removed the duplicate entry. It will happen again until addMember refuses someone who is already a member, so worth telling them how to avoid it meanwhile.',
					'Two adds of {cuid} on {prj} through key {prefix}, {gap} seconds apart, both 201. Their client gave up waiting on the first and sent it again. Duplicate removed by hand. The API should be answering the second with an error rather than adding the person again; that change is on our list.'
				],
				lookPaste: 'apiLogDup',
				ends: [
					[
						['a', 'The API team found two requests from your onboarding script, a few seconds apart, and both were accepted, so {colleague} was added twice. They’ve removed the extra entry. Until the API refuses to add someone who’s already a member, the safest thing is for the script to fetch the project’s members first and skip anyone already on the list.'],
						['c', '{colleague2} has changed the script to check the members list before adding anyone, and Monday’s run went through cleanly. Thanks for explaining.']
					]
				]
			},
			{
				open: [1, 2],
				detail: [
					'I added {him} on {wday}, once as far as I know, as a viewer. Then {colleague2}, who shares the owner login with me for holiday cover, added {him} as a member. We didn’t realise the other had done it.',
					'I put {him} on as a viewer last week. Today my colleague {colleague2} added {him} again as a member, because {she} couldn’t edit. We both use the owner account.'
				],
				lookWho: 'e',
				look: [
					'Two entries for {cuid} on {prj}: one viewer, one member, added {hours} hours apart from the same owner account. The web app takes the first entry it finds, so {she}’s effectively a viewer. I’d rather not edit memberships by hand while the store migration is running this week; the proper fix is for addMember to refuse someone who is already a member, which is on the list. Linking this ticket to it.'
				],
				lookPaste: 'dupMembers',
				ends: [
					[
						['a', 'The API team confirmed {colleague} is on the project twice, once as a viewer and once as a member, and the web app treats {him} as a viewer because that entry came first. They can’t edit memberships by hand this week, and the fix that stops a second add is already planned; I’ve linked your ticket to it so we let you know when it’s out. One more thing, gently: please don’t share the owner login. Each person should sign in with their own account.'],
						['c', 'Understood on both counts. Viewer is fine for {him} for now, so we’ll wait for the fix.']
					]
				]
			}
		]
	},
	{
		id: 'notOwner',
		writer: 'owner',
		subjects: ['Can’t add people to our project', 'Error when adding a member', '“Only the owner can add members”', 'Permissions problem'],
		open: [
			'I’m trying to add two new colleagues to {project} and Trellis keeps showing a red banner: “only the owner can add members”. I’m the team lead and I use the project every day, so I don’t understand why I can’t.',
			'We have a new starter on {day} and I need her on {project} before then. When I try to add her I get an error saying only the owner can add members. Who is the owner, and how do I become one?',
			'Nobody on our side seems able to add people to {project} any more. Every time we try we get “only the owner can add members”. What do we do?'
		],
		more: ['There are {n} people waiting to be added, and they can’t see any of the tasks until they are.', 'I’ve tried in two browsers and on my phone, same message every time.', 'I’m happy to send a screenshot if that helps.'],
		ask: [
			'Thanks for writing. Each project in Trellis has one owner, and only that person can add members or change the project’s settings. Do you know who owns {project}? If you’re not sure, tell me the email you sign in with and I’ll look it up.',
			'That message means your account isn’t the project’s owner. Every project has exactly one, set when it was created. If you give me the address you use for Trellis, I can tell you who the owner is and what the options are.'
		],
		paths: [
			{
				detail: ['It’s {email}. I think {colleagueFull} created the project, but {she}’s on leave until {day}.', 'My address is {email}. Could it be {colleague}? {She} set it up last year, and {she}’s off this week.'],
				look: ['{email} is a member of {project} ({prj}). Owner is {colleagueFull} ({colleagueEmail}), last signed in {last}. Nothing wrong; it just has to be {him}.', 'Checked {prj}: owner {colleagueFull}, the customer is a member. Working as intended.'],
				lookPaste: 'members',
				ends: [
					[
						['a', 'The owner of {project} is {colleagueFull}, so {she}’s the only one who can add people. Nothing is broken: once {she}’s back on {day}, {she} can add your new starters from the members page in a minute. If it can’t wait, {she} can do it from {his} phone.'],
						['c', 'Thanks, I messaged {him} and {she} added them from {his} phone straight away. All sorted.']
					]
				],
				happy: true
			},
			{
				detail: ['It’s {email}. {colleagueFull} set up the project, but {she} left the company in {monthPast} and our IT closed {his} mailbox. There’s nobody else.', '{email}. The owner was {colleagueFull}, who left us in {monthPast}. {His} email doesn’t exist any more.'],
				look: ['Owner of {prj} is {colleagueFull}, {colleagueEmail}; the address bounces. The product can’t transfer ownership, so it’s the accounts team’s manual process. Passing to {acctFirst}.'],
				lookPaste: 'members',
				team: 'accounts and security team',
				ends: [
					[
						['K', 'Hello {name}, I’m {acctFirst} from the accounts and security team. We can move ownership of {project} to you, but first we need a short note from a director or from the billing contact at {org} confirming that you should take it over. A reply to this email is fine.'],
						['m', 'Hello, I’m the finance director at {org} and the billing contact. I confirm that {name} should take over {project}.'],
						['k', 'Director’s confirmation received from the billing contact’s address on file. Ownership of {prj} moved to {email}; the old owner stays on as a member for now.'],
						['K', 'Thank you both. You’re now the owner of {project}, so you can add members and change its settings. {colleague} is still listed as a member; let us know if you’d like that tidied up.'],
						['c', 'That’s great, I’ve added the two new colleagues already. Thank you.']
					]
				]
			},
			{
				detail: ['{email}. {colleagueFull} was the owner, but {she}’s left, and I doubt {his} account works any more.'],
				look: ['Owner {colleagueFull} last signed in {last}. Ownership can only be moved by the accounts team, and they need written confirmation from someone who can speak for {org}.'],
				ends: [
					[
						['a', 'The project’s owner is still {colleagueFull}. Our accounts and security team can move ownership to you, but they need written confirmation from a director or the account’s billing contact at {org} first. Could you ask them to email us a short note confirming you should take over {project}?'],
						['c', 'OK, I’ll ask our director, but they’re travelling so it may take a while.'],
						remind
					]
				]
			}
		]
	},
	{
		id: 'remove',
		writer: 'owner',
		subjects: ['Remove a former employee', 'How do I take someone off a project?', 'Delete member', 'Leaver still on our project'],
		open: [
			'{colleagueFull} left us last month and is still on the members list of {project}. I can’t find any way to remove {him}. There’s an Add button but nothing to take anyone off.',
			'We’ve finished working with a freelancer, {colleagueFull}, and I need {him} off {project} today. The project has unreleased designs in it. How do I remove {him}?',
			'Please can you tell me how to remove people from a project? I’ve looked through every menu.'
		],
		more: ['I’m the owner of the project, if that matters.', 'Our client contract says ex-contractors must lose access within five working days, so I’m on a deadline.', 'It’s possible I’m missing something obvious.'],
		ask: [
			'Thanks for asking. At the moment members can’t be taken off a project from Trellis itself, which I know is a gap. Could you tell me the project and who needs removing, and I’ll see what the API team can do?',
			'You’re not missing anything: there’s no way yet to remove a member yourself. If you send me the project name and the person, I’ll ask the API team.'
		],
		paths: [
			{
				detail: ['It’s {project}, and the person is {colleagueFull}, {colleagueEmail}.', '{project}. The person is {colleagueFull}; {his} address was {colleagueEmail}.'],
				lookWho: 'e',
				look: ['Removed {cuid} from {prj} by hand at the owner’s request; checked the requester is the owner. No other entries for that user on the project. One more for the “remove member” request.'],
				lookPaste: 'members',
				ends: [
					[
						['a', 'The API team has taken {colleagueFull} off {project}. Removing members yourself is something people ask for a lot, and it’s on the API team’s list; until it’s there, just ask us and we’ll do it.'],
						['c', 'Thank you, that’s a weight off.']
					]
				],
				happy: true
			},
			{
				detail: ['It’s not one person, I’m afraid. {project} was our big programme last year, and about {big} people from three partner organisations were added. We need everyone except our own staff off it.'],
				lookWho: 'e',
				look: ['{big} members on {prj}, most from three partner domains. Not doing {big} hand removals in the store; too easy to take out the wrong person. This is the remove-members change; they’ll have to wait for it. Suggest they stop sharing anything new in the project meanwhile.'],
				ends: [
					[
						['a', 'I’ve talked to the API team. Taking {big} people off by hand is too risky to do safely, so they’d rather do it properly with the change that lets owners remove members, which is planned. I’ve added your ticket to it. Meanwhile, the safest thing is not to add anything new to {project}.'],
						['c', 'Fair enough. We’ve started a new project for this year’s work and we’ll leave the old one alone until you can remove people.']
					]
				]
			},
			{
				open: ['{colleagueFull} used to work with us on {project}, and {she} tells me {she} can still open it. How do I take {him} off?', 'Please can you tell me how to remove someone from {project}? {colleagueFull} finished working with us last month, but {she} can still see the board.'],
				detail: ['It’s {project}. The person is {colleagueFull}. Actually, now I look, I can’t see {him} on the members list at all, but {she} says {she} can still open the project.'],
				look: ['{colleagueFull} isn’t a member of {prj}. Project visibility is “team”, so anyone in {org}’s workspace can open it. If they make it private, only members see it.'],
				lookPaste: 'project',
				ends: [
					[
						['a', 'I’ve found what’s going on. {colleagueFull} isn’t a member of {project}, but the project’s visibility is “team”, which lets anyone in your organisation’s workspace open it. If you change it to “private” in the project’s settings, only its members will see it.'],
						['c', 'Changed to private, and {she} confirms {she} can’t open it any more. Thanks, that was simpler than I feared.']
					]
				]
			}
		]
	},
	{
		id: 'role',
		writer: 'owner',
		subjects: ['Make a viewer an editor', 'Change role', 'Wrong role for new member', 'Viewer can’t edit tasks'],
		open: [
			'I added {colleagueFull} to {project} as a viewer by mistake. {She} needs to edit tasks. How do I change {him} to a member?',
			'{colleague} can see everything on {project} but can’t move cards or comment. I think {she}’s a viewer. Where do I change that?',
			'Is there a way to change someone’s role on a project after adding them? I picked the wrong one.'
		],
		more: ['{She}’s meant to be running the project day to day from next week.', 'I’ve looked in the project settings, but there’s only visibility and the default role there.', 'It seems like it should be easy, so apologies if I’m being slow.'],
		ask: [
			'Thanks for writing. Trellis doesn’t let you change a member’s role after they’re added yet. Can you tell me which project and who, and the role they should have? I’ll check what we can do.',
			'Roles can’t be changed from the app at the moment, I’m sorry. If you send me the project and the person, I’ll ask the API team.'
		],
		paths: [
			{
				detail: ['{project}, and it’s {colleagueFull} ({colleagueEmail}). {She} should be a member, not a viewer.'],
				lookWho: 'e',
				look: ['Changed {cuid} on {prj} from viewer to member by hand; the requester is the owner.', 'Role of {cuid} on {prj} set to member by hand. Owner asked. Checked there’s only the one entry for {him}.'],
				lookPaste: 'members',
				ends: [
					[
						['a', 'The API team has changed {colleague}’s role on {project} to member. {She} may need to reload the page to see the difference.'],
						['c', '{She} can edit now, thank you!']
					]
				],
				happy: true
			},
			{
				detail: ['{project}. Actually it’s {n} people: we added a whole team as viewers on {wday}, and they all need to be members.'],
				lookWho: 'e',
				look: ['{n} viewers added to {prj} on {wday}, each with the viewer role picked in the request. Changed them all to member by hand at the owner’s request.'],
				lookPaste: 'members',
				ends: [
					[
						['a', 'The API team has changed all {n} to members. For next time: the role you pick on the Add screen is the one people get, and it can’t be changed afterwards from the app yet.'],
						['c', 'Got it, thanks. We’ll double-check before clicking Add.']
					]
				]
			},
			{
				detail: ['{project}; it’s {colleagueFull}. And can we not do this ourselves? It seems basic.'],
				lookWho: 'e',
				look: ['Role changes are on the list with member removal. No hand edits this week while the store migration runs; ticket linked to the role-change item.'],
				ends: [
					[
						['a', 'You’re right that it should be possible, and it’s planned: owners will be able to change a member’s role. This week the API team can’t make the change by hand, so I’ve linked your ticket to that work and we’ll tell you when it’s out.'],
						['c', 'OK. {colleague} can work as a viewer for a bit; {she} mostly reads anyway.']
					]
				]
			}
		]
	},
	{
		id: 'slug',
		writer: 'owner',
		shows: 'slugs',
		subjects: ['Broken-looking project link', 'Project URL looks wrong', 'Strange characters in our link', 'Our links have double dashes'],
		open: [
			'We created a project called “{oddName}” and its address in the browser ends in “{oddSlug}”. Our client thinks the link is broken when we send it. Is that normal?',
			'I’ve noticed our project links look odd. “{oddName}” became {oddSlug}. Did I do something wrong when I named it?',
			'Small thing, but it bothers me: the address for “{oddName}” ends …/{oddSlug}. Is there any way to tidy that?'
		],
		more: ['We paste project links into our weekly client emails, so they do get seen.', 'Other project names of ours come out fine.', 'Our marketing manager noticed it and now I can’t unsee it.'],
		ask: [
			'Thanks for pointing this out. The address is made from the project’s name, and some characters turn into dashes. Could you tell me whether the link actually fails to open, or only looks odd? That decides how urgent this is.',
			'Thanks. The last part of the address comes from the project name. Does the link open the project when someone clicks it, or do they get an error?'
		],
		paths: [
			{
				detail: ['It opens fine, it just looks broken. Two dashes in the middle and one at the end.', 'It opens. It’s only how it looks.'],
				lookWho: 'e',
				look: ['slugify turns every character outside a–z and 0–9 into a dash, and it doesn’t collapse runs or trim the ends, so “{oddName}” becomes {oddSlug}. Cosmetic; the link works. This is the slug clean-up item; adding the ticket to it.'],
				ends: [
					[
						['a', 'The link works; it just looks untidy, because every space or punctuation mark in the name becomes a dash and repeated dashes aren’t merged yet. The API team plans to tidy this so runs of dashes become one and none are left at the ends. I’ve added your ticket so you hear when it’s done.'],
						['c', 'Thanks, good to know it’s not broken. We’ll wait.']
					]
				]
			},
			{
				detail: ['It opens for us, but our client’s email program cuts the link off at the trailing dash, so they land on a page saying the project doesn’t exist.'],
				lookWho: 'e',
				look: ['Some mail programs drop trailing punctuation from links, so the final dash of {oddSlug} goes missing. Project pages also answer on the id: /projects/{prj}. Suggest they share that form until slugs are tidied.'],
				ends: [
					[
						['a', 'That’s the trailing dash: some email programs treat it as punctuation and leave it off the link. Until the API team tidies how these addresses are made, you can share the project by its id instead: https://app.trellis.example/projects/{prj}. That form has no dashes to lose.'],
						['c', 'The id link works for the client. We’ll use that from now on, thank you.']
					]
				]
			},
			{
				detail: ['It opens, but we have another project, “{accentName}”, and its link is {accentSlug}. All the accented letters have gone. Our team in {city} find it a bit insulting, honestly.'],
				lookWho: 'e',
				look: ['slugify only keeps a–z and 0–9, so every accented letter becomes a dash: “{accentName}” gives {accentSlug}. The dash clean-up won’t fix this by itself; accented letters need folding to plain ones first (é to e). Logging it as a request of its own.'],
				ends: [
					[
						['a', 'You’re right, and I’m sorry. The address keeps only plain letters and digits at the moment, so accented letters are replaced by dashes. The API team has logged a change to turn accented letters into their plain forms, so “é” becomes “e”, instead of dropping them. I’ve linked your ticket.'],
						['c', 'Thank you for taking it seriously. Please let us know when it changes.']
					]
				]
			}
		]
	},
	{
		id: 'blank',
		writer: 'dev',
		subjects: ['Empty projects appearing', 'Projects with no name', 'Untitled projects in our list', 'Blank rows in project list'],
		open: [
			'Our project list in Trellis has {n} entries with no name at all. Clicking one opens an empty project whose address is just dashes. Nobody here admits to creating them.',
			'We import projects from our CRM every night through the API. This morning there are {n} new projects with blank names. I’m fairly sure our side sent rubbish, but shouldn’t Trellis refuse a project with no name?',
			'Can you delete the projects on our account that have no name? There are a handful and they’re confusing people.'
		],
		more: ['They all seem to have appeared overnight.', 'Their addresses are nothing but dashes.', 'We’re about to show the project list to a client, so I’d love them gone.'],
		ask: [
			'Thanks. Do you create projects from a script or an import using an API key, or only from the Trellis web app? That tells us where the blank names came from.',
			'Thanks for reporting it. Could you tell me whether anything on your side creates projects automatically, and roughly when the blank ones first appeared?'
		],
		paths: [
			{
				detail: ['It’s our nightly CRM import. It creates a project for every new client job. Looking at last night’s file, a few rows had only spaces in the name column.'],
				paste: 'csvRows',
				lookWho: 'e',
				look: ['{n} projects in their workspace with names that are only spaces, all created by key {prefix} around 02:00. createProject checks that the name is a string but not that there’s anything in it. Deleted them at the customer’s request; they’re fixing the file.'],
				lookPaste: 'apiLogBlank',
				ends: [
					[
						['a', 'Those came from last night’s import: the rows with only spaces in the name were accepted as projects with blank names. The API team has deleted all {n}. If your import skips rows with an empty name, it won’t happen again; we’re also changing the API itself to refuse a blank name, the way it already does for API keys.'],
						['c', 'Thanks. We’ve added a check to the import, and the next run was clean.']
					]
				]
			},
			{
				open: [0, 2],
				detail: ['A new member of staff, {colleague}, says {she} pressed Create a few times while the name box still looked empty on the small-screen layout.'],
				lookWho: 'e',
				look: ['Created through the web app, each named as a few spaces. The API accepts it; createProject should answer 400 for a blank name, as createKey already does. Noted on that item. Left the projects alone, because the customer has since added tasks to one of them and wants to keep it.'],
				ends: [
					[
						['a', 'The blank projects came from the Create button being pressed with an empty name, and the API accepting it. The API team is changing that so a blank name is refused, the same way it already is for API keys. One of the blank projects has tasks in it now, so we’ve left them all as they are; we can delete the empty ones once you’ve moved those tasks.'],
						['c', 'OK, we’ll move the tasks and wait for the fix.']
					]
				]
			}
		]
	},
	{
		id: 'defaultRole',
		since: RELEASE_060 + 1440,
		writer: 'owner',
		subjects: ['New people can’t edit', 'Everyone new is read-only', 'New members stuck as viewers', 'Problem since the update'],
		open: [
			'Since last week everyone we add to {project} can look at tasks but can’t move or edit them. People added before that are fine. Did something change on your side?',
			'Three new starters this week and none of them can edit anything on {project}. They see the board, but every card is greyed out. Help!',
			'Our new team members are being added as viewers. I didn’t ask for that. What’s going on?'
		],
		more: ['The people who joined in September are all fine.', 'I add people the same way I always have.', 'We’re in the middle of a busy month, so this is slowing everyone down.'],
		ask: [
			'Thanks for getting in touch. Since 20 October each project has a default role: the role a member gets when they’re added without one being picked. Could you tell me who owns {project}, and whether anyone has changed its settings recently?',
			'Thanks. A recent update added a “default role” to each project’s settings. Do you know whether that’s been changed on {project}? If you tell me the email you use, I can check.'
		],
		paths: [
			{
				detail: ['I’m the owner, {email}. I did look at the settings when the new item appeared, and I may have picked viewer thinking it meant something else.'],
				look: ['{prj} default role is viewer, changed on {date} from the owner’s session. {n} members added since, all as viewers.'],
				lookPaste: 'project',
				ends: [
					[
						['a', 'That’s it: the project’s default role is viewer, so everyone added since {date} came in as a viewer. If you set it back to member in the project settings, new people will be members again.'],
						['c', 'Changed it back, thanks. What about the people already added as viewers?'],
						['e', 'Changed the {n} viewers added to {prj} since {date} to member, at the owner’s request.'],
						['a', 'The API team has changed the {n} people added since {date} to members, so they can edit now.'],
						['c', 'Brilliant, they can all edit. Thanks!']
					]
				]
			},
			{
				detail: ['I’m the owner. Yes, I set it to viewer on purpose, because most people on {project} are client contacts who should only read. But my own team need to edit.'],
				look: ['Default role viewer on {prj}, set deliberately. The Add screen lets the owner pick a role for each person; the default only applies when none is picked.'],
				lookPaste: 'project',
				ends: [
					[
						['a', 'In that case the default is doing its job, and you can keep it: it only applies when you don’t pick a role. When you add someone from your own team, choose “member” on the Add screen and they’ll be able to edit.'],
						['c', 'Ah, I hadn’t noticed the role picker. That works perfectly, thank you.']
					]
				]
			},
			{
				detail: ['The owner is {colleagueFull}, but {she} says {she} hasn’t touched the settings. We do have an integration that updates project settings when a job moves stage; {colleague2} built it.'],
				lookWho: 'e',
				look: ['Settings on {prj} were changed on {date} by key {prefix} (“{keyName}”), which sends visibility and the default role together; the default role went to viewer. Their integration, not us. They need to check what it sends.'],
				lookPaste: 'apiLogSettings',
				ends: [
					[
						['a', 'The change came from your own integration: on {date} it updated the project’s settings, and the update included a default role of viewer. Could {colleague2} check what the integration sends when a job changes stage? Once that’s fixed, the owner can set the default back to member.'],
						['c', 'I’ll pass that on to {colleague2}; {she2}’s out until {day}.'],
						remind
					]
				]
			}
		]
	},
	{
		id: 'public',
		writer: 'owner',
		subjects: ['Someone outside can see our project', 'Project visible to strangers?', 'Possible data exposure', 'Who can see our board?'],
		open: [
			'A supplier we’ve never added to {project} told me they could see our board. That project has pricing in it. How is that possible?',
			'Someone who isn’t in our organisation sent me a link to one of our Trellis projects and could open it. Has there been a breach?',
			'Please check urgently who can see {project}. A former client mentioned something that’s only on that board.'
		],
		more: ['I’d like to understand this before I tell our directors.', 'I’ve checked the members list and the supplier isn’t on it.', 'We take this kind of thing very seriously, as I’m sure you do.'],
		ask: [
			'Thank you for raising this quickly. The first thing to check is the project’s visibility. Who owns {project}, and what does its settings page show next to “Visibility”?',
			'I understand why that’s worrying. Could you tell me the project’s owner, and whether its visibility is private, team or public? You’ll see it in the project’s settings.'
		],
		paths: [
			{
				detail: ['I’m the owner. It says “public”. I think I changed it in {monthPast} when I wanted to show the board to a client, and forgot to change it back.'],
				look: ['{prj} visibility public since {date}, set from the owner’s session. Nothing unusual in the sign-ins.'],
				lookPaste: 'project',
				ends: [
					[
						['a', 'A public project can be opened by anyone with the link, which is how the supplier saw it. If you make it private, only members can see it; to share with a client, add them as a viewer instead. I’ve checked, and nothing else looks out of the ordinary on the account.'],
						['c', 'Done: private now, and the client is a viewer. Lesson learned.']
					]
				]
			},
			{
				detail: ['It says public, and I definitely didn’t do that. I’m the owner and I haven’t touched the settings in months.'],
				look: ['Visibility on {prj} changed to public on {date} through key {prefix} (“{keyName}”). Passing to accounts and security to check how the key was used.'],
				team: 'accounts and security team',
				ends: [
					[
						['k', 'Reviewed key {prefix} on {prj}. Created by the owner on {keyDate}; every request since came from the customer’s own server range, the same one their other integration uses. The visibility change was one settings update among the integration’s usual traffic. No sign of anyone else using it.'],
						['K', 'Hello {name}, I’m {acctFirst} from accounts and security. We’ve looked at how {project} became public. The change was made through your API key named “{keyName}”, from the same servers your integration always uses, so it looks like the integration rather than an outsider. We’ve set the project back to private for you. It’s worth asking whoever built the integration why it sends a visibility value.'],
						['c', 'Thank you for checking so thoroughly. Our developer found the bug and has fixed it.']
					]
				]
			}
		]
	},
	{
		id: 'addEmail',
		writer: 'owner',
		subjects: ['New member didn’t get an email', 'No email when added', 'Colleague says nobody told them', 'Emails missing'],
		open: [
			'I added {colleagueFull} to {project} on {wday} and {she} says {she} never got an email about it. Is adding people working?',
			'None of the people I added on {wday} got the “you were added” email. They only found out because I told them.',
			'{colleague} insists {she} never heard from Trellis when I added {him} to {project}. Could you check whether an email went out?'
		],
		more: ['They do show up on the members list, so the add itself seems to have worked.', 'It’s happened before, but only occasionally.', 'Our IT team say they can’t see anything blocked, but they’re not always right.'],
		ask: [
			'Thanks. The email goes out as soon as someone is added. Could you send me the address of one person who didn’t get it, and roughly when you added them? I’ll check our mail log.',
			'Sorry about that. If you tell me who and when, I can look up whether the email left us and what their mail server said.'
		],
		paths: [
			{
				detail: ['It’s {colleagueEmail}, added at about {hhmm} on {wday}.', '{colleagueEmail}. I added {him} just after {hhmm} on {wday}.'],
				look: ['Mail log: email to {colleagueEmail} sent {wday} {hhmm}, accepted by their server. So it reached them; probably their filters.'],
				lookPaste: 'mailSent',
				ends: [
					[
						['a', 'Our log shows the email left us at {hhmm} on {wday} and your mail server accepted it, so it arrived somewhere at your end. It’s worth checking junk, or any quarantine your IT team runs: automated emails often land there.'],
						['c', 'Found it in our quarantine, along with a pile of others. IT have let Trellis through now. Thanks!']
					]
				],
				happy: true
			},
			{
				detail: ['It’s {colleagueEmail}. I added {him} on {wday}.'],
				look: ['Mail log shows a bounce for {wrongEmail}: “550 mailbox unavailable”. {His} Trellis account has {wrongEmail}, not {colleagueEmail}. Typo at sign-up.'],
				lookPaste: 'mailBounce',
				ends: [
					[
						['a', 'The email did go out, but to {wrongEmail}, which is the address on {colleague}’s Trellis account, and it bounced. It looks as if there was a typo when {she} signed up. {She} can correct it in {his} profile and confirm the new address, and future emails will reach {him}.'],
						['c', '{She}’s fixed {his} address and confirmed it. Thanks for spotting that.']
					]
				]
			},
			{
				open: [1, 'Several people I added to {project} on {wday} say they never got the email from Trellis telling them.'],
				detail: ['All of them were added on {wday} between about ten and one. Here are two: {colleagueEmail} and {colleague2Email}.'],
				look: ['Both queued on {wday} late morning and sent after 13:12. Looks like the mail worker. Asking operations.'],
				lookPaste: 'mailLate',
				team: 'operations team',
				ends: [
					[
						['o', 'Mail worker stalled on {wday} from 10:38 to 13:12 after a deploy; the outbox held about {queued} emails until it was restarted. Everything queued in that window went out late, between 13:12 and 13:40. Nothing lost.'],
						['a', 'Thanks for your patience. Our mail sender stopped for a couple of hours on {wday}, so emails queued in that time went out late, after 13:12. Our operations team restarted it and checked that nothing was lost, so your colleagues should all have the email now, just later than they should have.'],
						['c', 'Yes, they turned up in the afternoon. Thanks for checking.']
					]
				]
			}
		]
	},
	{
		id: 'notFound',
		writer: 'owner',
		subjects: ['Can’t find colleague to add', 'User not found', 'Adding a new team member fails', 'Error: user not found'],
		open: [
			'When I type {colleagueFull}’s email into the Add member box on {project}, Trellis says it can’t find anyone with that address. {She} definitely exists; {she} sits opposite me.',
			'I’m getting “user not found” when I try to add {colleague} to {project}. I’ve checked the spelling three times.',
			'How do I add someone who isn’t on Trellis yet? The Add member box only seems to find people who already have an account.'
		],
		more: ['{She} started with us on {wday} and needs to be on the project by the end of the week.', 'I’ve added dozens of people this way before without trouble.', 'Our IT team says our email server is fine, in case that matters.'],
		ask: [
			'Thanks for getting in touch. The Add member box looks people up by the email address on their Trellis account, so they need an account first. Could you tell me the address you typed, and whether your colleague has signed up?',
			'Thanks. “User not found” means no Trellis account has that exact address. Can you tell me the address you used? I’ll check whether there’s an account under a different one.'
		],
		paths: [
			{
				detail: ['I typed {colleagueEmail}. I don’t think {she}’s signed up; I assumed adding {him} would send {him} an invitation.'],
				look: ['No account on {colleagueEmail}, nor under {his} name. {She} just needs to sign up first; adding to a project doesn’t create an account.'],
				lookPaste: 'noAccount',
				ends: [
					[
						['a', 'There’s no Trellis account for {colleagueEmail} yet, and adding someone to a project doesn’t create one. If {colleague} signs up at app.trellis.example with that address and confirms it, you’ll be able to add her straight away.'],
						['c', '{She}’s signed up and I’ve added {him}. Thanks!']
					]
				],
				happy: true
			},
			{
				detail: ['{colleagueEmail}. {She} says {she} signed up last year for a trial.'],
				look: ['Nothing on {colleagueEmail}. There is an account for {colleagueFull} on a personal address, signed up {signup}. Probably that.'],
				lookPaste: 'colleagueAccount',
				ends: [
					[
						['a', 'There’s no account on {colleagueEmail}, but there is one in {colleague}’s name on a personal address. {She} can change the address on that account to {his} work one in {his} profile, or you can add {him} using the personal address. The first is tidier.'],
						['c', '{She}’s changed it to {his} work address and I’ve added {him}. Thanks for finding it.']
					]
				]
			},
			{
				detail: ['I typed {colleagueEmail}, but really the problem is bigger: we work with about {big} freelancers a year, and asking each one to sign up before we can add them is a pain. Can we not just invite people by email?'],
				lookWho: 'e',
				look: ['Right: addMember takes a user id, so the person has to exist. Adding people by email before they sign up is the invitations request; this is the fourth this month. Adding the ticket to it.'],
				ends: [
					[
						['a', 'At the moment someone needs a Trellis account before they can be added, because projects are linked to accounts, not email addresses. Inviting people by email, so they join the project once they sign up, is on the API team’s list, and I’ve added your ticket to it. Until then, the quickest way is to send freelancers the sign-up link with your first brief.'],
						['c', 'OK. We’ll keep sending the sign-up link for now; please do let us know when invitations arrive.']
					]
				]
			}
		]
	},
	{
		id: 'coOwner',
		writer: 'owner',
		subjects: ['Second owner for our project', 'Add another owner', 'Error adding an owner', 'Two admins on a project?'],
		open: [
			'I’m going on parental leave in {month} and want {colleagueFull} to be able to run {project} while I’m away. When I add {him} as an owner, Trellis says the role must be member or viewer.',
			'Can a project have two owners? I tried adding {colleague} with the owner role and got an error.',
			'We need two people who can manage {project}, in case one of us is off. How do we set that up?'
		],
		more: ['{She}’s been my deputy on it for two years, so {she} knows it inside out.', 'Other tools we’ve used allowed several admins.', 'I’d rather sort this out well before I go.'],
		ask: [
			'Thanks for asking. Each Trellis project has exactly one owner, the person who created it, and that can’t be shared at the moment. What does {colleague} need to be able to do while you’re away? There may be a way round it.',
			'Thanks. A project can only have one owner right now. Could you tell me what the second person would need to do: add members, change settings, or something else?'
		],
		paths: [
			{
				open: [0, 'I’m away for three months from {month}, and {colleagueFull} will look after {project}. Trellis won’t let me add {him} as a second owner. What are the options?'],
				detail: ['Mostly add new people. We take on temporary staff every month and they need to be added in their first week.'],
				look: ['Only the owner can add members, and there’s one owner. Ownership can be moved by accounts, but the owner wants to keep it. Best options: add the expected temps before the leave starts, or move ownership for the leave.'],
				ends: [
					[
						['a', 'Since only the owner can add members, the options are to move ownership to {colleague} for the length of your leave (our accounts team can do that and move it back when you return), or to add the people you expect before you go. Several customers do the second for planned leave.'],
						['c', 'Thanks. We know most of the people starting before {month}, so I’ve added them already, and {colleague} will email you if a surprise starter turns up.'],
						['a', 'That sounds like a good plan. If you do need ownership moved, just reply here.']
					]
				]
			},
			{
				detail: ['Everything an owner can do. It’s a big project and it’s not sensible for one person to be the only one who can change things.'],
				lookWho: 'e',
				look: ['Single owner is how projects are built today. More than one owner is a request we see regularly; adding this ticket to it. No hand workaround: we don’t make two owners in the store.'],
				ends: [
					[
						['a', 'I understand. Projects are built around a single owner today, and the API team won’t set up a second one by hand because nothing else in Trellis expects it. Allowing more than one owner is on their list, and I’ve added your ticket. If you need cover in the meantime, our accounts team can move ownership temporarily.'],
						['c', 'Thanks for explaining. We’ll wait for proper co-owners rather than shuffling ownership around.']
					]
				]
			}
		]
	}
];

const integrationTopics: Topic[] = [
	{
		id: 'formPayload',
		since: RELEASE_060 + 2 * 1440,
		writer: 'dev',
		shows: 'formBody',
		subjects: ['Webhook payload not JSON', 'Our webhook handler started failing', 'Garbled webhook body', 'Webhook parse errors'],
		open: [
			'Our receiver for Trellis webhooks has been throwing errors since {wday}. The body we get isn’t JSON any more; it looks like a query string. Did you change the format?',
			'Since this week, the member.added webhook for {project} arrives as something like event=member.added&userId=…, and our code can’t parse it. Nothing changed on our side, as far as I know.',
			'Webhook bodies from Trellis are failing our JSON validation. Was there an update?'
		],
		more: ['We use the webhook to post new members into our team chat, so people are noticing.', 'Webhooks on our other projects still arrive as JSON.', 'We haven’t touched the receiver’s code since the summer.'],
		ask: [
			'Thanks for the details. Since 20 October a webhook can send its payload either as JSON or as a form, chosen when the webhook is created. Could you tell me the webhook’s id, or the URL it posts to, and who created it?',
			'Thanks. Webhooks can now be created to send form-encoded payloads instead of JSON. If you send me the webhook’s URL, I’ll check how it was set up.'
		],
		paths: [
			{
				detail: ['It posts to {hookUrl}. {colleagueFull} recreated it a few days ago when we moved servers.', '{hookUrl}. My colleague {colleagueFull} set it up again after our server move on {wday}.'],
				lookWho: 'e',
				look: ['{whk} on {prj}, created {date} with payloadFormat form. The old JSON webhook to the previous server was {whk2}. A webhook’s format can’t be changed after it’s created; they’ll need a new one. Can remove {whk} by hand once the new one is in.'],
				lookPaste: 'webhook',
				ends: [
					[
						['a', 'The webhook to {hookUrl} was created to send form payloads, which is why the body looks like a query string. A webhook’s format can’t be changed once it’s created, so the simplest fix is to create a new one with the JSON format (it’s the default if you leave the format out), and we’ll remove the old one for you.'],
						['c', 'New webhook created, and the messages are coming through again. Please go ahead and delete {whk}.'],
						['a', 'Done: the old webhook is removed, and only the new one is left on {project}.']
					]
				]
			},
			{
				detail: ['It’s {hookUrl}. To be honest, our receiver is an old PHP script, and someone told me form posts would be easier for it, so I may have asked for form. But the fields aren’t where I expected: the payload values are at the top level.'],
				lookWho: 'e',
				look: ['{whk} has payloadFormat form, as the customer chose. Form bodies put the event and the payload fields side by side at the top level; JSON nests them under payload. Working as designed; they need an explanation.'],
				lookPaste: 'webhook',
				ends: [
					[
						['a', 'Your webhook is working as it should. In the form format, the event name and each payload field are sent as separate form fields at the top level, for example event=member.added&projectId=…&userId=…, while JSON puts the fields under “payload”. Your script should read them straight from the form fields.'],
						['c', 'Got it, reading them from the form fields works. Thanks for the explanation.']
					]
				]
			}
		]
	},
	{
		id: 'retries',
		writer: 'dev',
		shows: 'receiverLog',
		subjects: ['Same webhook several times', 'Duplicate messages from webhook', 'Webhook attempts higher than documented', 'Why five attempts?'],
		open: [
			'Our chat channel got the same “new member on {project}” message five times on {wday}. Our receiver log shows Trellis posting the same event five times within a few seconds. Why?',
			'Your README says a failed delivery is tried up to 3 attempts in all, but we see five attempts for one event in our logs. Which is right?',
			'We’re getting duplicate member.added events. Is Trellis sending everything more than once?'
		],
		more: ['Our receiver logs every request, so the count is reliable.', 'It doesn’t happen every time, maybe once a week.', 'We de-duplicate some things on our side, but not chat messages.'],
		ask: [
			'Thanks for the logs. Trellis tries a delivery again when the receiver answers with a status of 500 or more, or doesn’t answer at all. Do you know what your receiver answered on those attempts?',
			'Thanks. Repeated deliveries usually mean the receiver answered with an error, even if it had already processed the event. Can you see what status code your server sent back?'
		],
		paths: [
			{
				detail: ['Looking again, it answered 500 each time: the handler posts to chat first and then writes to our database, and the database write was timing out. So the message went out each time, and then we returned an error.'],
				lookWho: 'e',
				look: ['Deliveries to {whk} on {date}: five attempts, each answered 500 after about two seconds. Delivery makes up to 5 attempts while the README says 3; the code is the odd one out, and that’s already on our list. The real fix on their side is to answer 200 before doing slow work.'],
				lookPaste: 'deliveries',
				ends: [
					[
						['a', 'That explains it. Each time your receiver answered 500, Trellis took it as a failed delivery and tried again, and your handler had already posted to chat. You’re right that the README says 3 attempts and we currently make 5; the API team is bringing the code into line with the README. Whatever the count, the safest receiver answers 200 as soon as it has the event and does the slow work afterwards.'],
						['c', 'We’ve changed the handler to answer straight away and queue the rest. No duplicates since. Thanks.']
					]
				]
			},
			{
				detail: ['It answered 503, because our load balancer was draining that night. So trying again is fair enough, but five is more than the three your README promises, and it hit our server five times while it was down.'],
				lookWho: 'e',
				look: ['Confirmed: MAX_ATTEMPTS is 5 in delivery, and the README says 3 attempts in all. The README is what we want; code change planned. Ticket linked.'],
				lookPaste: 'deliveries',
				ends: [
					[
						['a', 'You’ve found a real mismatch: the README says up to 3 attempts in all and the code currently makes 5. The README is what we intend, and the API team is changing the code to match. I’ve linked your ticket so you hear when it’s out.'],
						['c', 'Thanks for confirming. We can live with it until then.']
					]
				]
			},
			{
				detail: ['It answered 200 each time, as far as I can see. That’s what puzzles me.'],
				lookWho: 'e',
				look: ['Our log shows one attempt per event to {whk}, answered 200. Their receiver log has the same request five times, from five different internal addresses: something on their side is replaying it. Not us.'],
				lookPaste: 'deliveries',
				ends: [
					[
						['a', 'Our delivery log shows one attempt per event, each answered 200, so Trellis sent each event once. The repeats in your log come from five different internal addresses, which suggests something between the internet and your receiver, perhaps a proxy, is passing each request on more than once. Could your infrastructure team take a look?'],
						['c', 'Will do, I’ll check with our infra people.'],
						remind
					]
				]
			}
		]
	},
	{
		id: 'events',
		writer: 'dev',
		shows: 'webhookCurl',
		subjects: ['Webhook for new tasks?', 'More webhook events', 'Error creating a webhook', '“events must be among…”'],
		open: [
			'I’m trying to create a webhook that fires when a task is created on {project}, and the API answers 400: “events must be among project.updated, member.added”. Is there a list of events somewhere?',
			'We’d like Trellis to call our HR system whenever someone joins or leaves a project. Which webhook events cover that?',
			'Are there plans for more webhook events? Two isn’t many.'
		],
		more: ['Our client asked for this specifically.', 'I couldn’t find a list in the API reference.', 'We’re choosing between Trellis and another tool for a new client, and this matters.'],
		ask: [
			'Thanks. Today webhooks cover two events: project.updated and member.added. Could you tell me what you’re trying to build? Sometimes one of those, or the API itself, gets you there.',
			'Thanks for asking. There are only two events for now, project.updated and member.added. What would you like to react to? That helps us make the case for more.'
		],
		paths: [
			{
				open: [0, 2],
				detail: ['We want to post every new task into our chat channel, so the team sees them without opening Trellis.', 'Every time a card is added to {project}, we want a message in our chat.'],
				lookWho: 'e',
				look: ['Task events would need the web app to publish them; the API only knows about projects and members. Adding to the webhook events request with “task created”.'],
				ends: [
					[
						['a', 'Task events aren’t available yet: webhooks only know about projects and their members. I’ve added your request to the list for more webhook events, with a note that you’d want one when a task is created.'],
						['c', 'Thanks. We’ll wait for that rather than build something fiddly.']
					]
				]
			},
			{
				open: [2, 'Is there a webhook that fires whenever anything on {project} changes? We keep a dashboard of it.'],
				detail: ['Mostly we want to know when the project changes in any way, so we can refresh a dashboard. Polling would be fine if that’s allowed.'],
				look: ['project.updated only fires on name and settings changes. Polling the project once an hour with an API key is fine.'],
				ends: [
					[
						['a', 'project.updated fires when the project’s name or settings change, not for every change on the board, so for a dashboard the more reliable route is to read the project through the API on a schedule. Once an hour is absolutely fine.'],
						['c', 'Polling it is. We’ve set it to every hour, and the dashboard looks right. Thanks.']
					]
				]
			},
			{
				open: [1],
				detail: ['Joining is covered by member.added, I see now. It’s leaving we need: when someone is taken off a project, our HR system should know.'],
				lookWho: 'e',
				look: ['Nobody can be taken off a project through the API yet, so there is nothing to send an event for. The event would come with the remove-members change. Linking.'],
				ends: [
					[
						['a', 'member.added covers people joining. There isn’t an event for people leaving yet, because members can’t be removed from a project through Trellis itself; when that arrives, the API team plans an event to go with it. I’ve linked your ticket to that work.'],
						['c', 'Makes sense. We’ll use member.added now and add the other side later.']
					]
				]
			}
		]
	},
	{
		id: 'deliveryFails',
		writer: 'dev',
		subjects: ['Webhooks not arriving', 'No webhook deliveries', 'Webhook stopped working', 'Nothing reaching our endpoint'],
		open: [
			'We set up a webhook for {project} on {wday}, and nothing has reached our server since. The webhook shows in the list, so it was created.',
			'Our member.added webhook stopped arriving last week. We haven’t changed anything we know of.',
			'Is there a way to see whether Trellis is even trying to call our webhook? Nothing turns up at our end.'
		],
		more: ['The webhook still shows in the list, so it hasn’t been deleted.', 'We’re about to launch something that depends on it.', 'There’s nothing in our web server’s error log.'],
		ask: [
			'Thanks. I can check our delivery log for you. Could you send me the URL the webhook posts to, and roughly when you expected a delivery?',
			'Thanks for reporting it. If you tell me the webhook URL and a time when something should have been sent, I’ll look at what our side saw.'
		],
		paths: [
			{
				detail: ['It’s {hookUrl}. Our server only accepts traffic from addresses we’ve listed, if that matters.'],
				lookWho: 'e',
				look: ['Deliveries to {whk} all fail without an answer once the connection times out: a network error on every attempt, no status. Their firewall, by the sound of it. Operations have the list of our outgoing addresses.'],
				lookPaste: 'deliveriesFailed',
				team: 'operations team',
				ends: [
					[
						['o', 'Webhook deliveries leave from {ipList}. Sent to support for the customer.'],
						['a', 'Our log shows every attempt timing out without an answer, which fits your server refusing traffic from addresses it doesn’t know. Webhooks are sent from these addresses: {ipList}. If your team adds them to your list, deliveries should start arriving.'],
						['c', 'Added, and the next member.added came through within minutes. Thanks!']
					]
				]
			},
			{
				open: [1, 2],
				detail: ['{hookUrl}. It was working until about {date}.'],
				lookWho: 'e',
				look: ['Deliveries to {whk} failing since {date} with a TLS error: their certificate expired that day. Nothing for us to do.'],
				lookPaste: 'deliveriesFailed',
				ends: [
					[
						['a', 'Since {date} our attempts to reach {hookHost} fail because the server’s security certificate expired that day, so the connection is refused before anything is sent. Once the certificate is renewed, deliveries will start again.'],
						['c', 'Embarrassing! Renewed, and deliveries are back. Thanks.']
					]
				]
			},
			{
				open: [0, 2],
				detail: ['The URL is {typoUrl}, created on {wday}.'],
				lookWho: 'e',
				look: ['{typoHost} doesn’t resolve; there’s a typo in the host. Every attempt is a network error. They’ll need a new webhook; we can remove the old one by hand.'],
				lookPaste: 'deliveriesFailed',
				ends: [
					[
						['a', 'The webhook’s address has a typo: it posts to {typoHost}, which doesn’t exist, so every attempt fails. If you create a new webhook with the right address, we’ll remove the old one for you.'],
						['c', 'Oops. New one created and working. Yes please, remove the old one.'],
						['a', 'Done, the old webhook is gone.']
					]
				]
			}
		]
	},
	{
		id: 'deleteHook',
		writer: 'dev',
		subjects: ['Delete a webhook', 'Remove old webhook', 'How to stop a webhook', 'Old webhook still firing'],
		open: [
			'We have three webhooks on {project} and only need one. How do I delete the other two? I can’t see a delete call in the API reference.',
			'We moved our integration to a new server, and the old webhook still points at the old one, which is being retired. How do I remove it?',
			'Please delete webhook {whk}; it was a test.'
		],
		more: ['The old server will be gone by the end of the month.', 'It’s not urgent, it’s just tidying.', 'I can send the ids if that helps.'],
		ask: [
			'Thanks. There isn’t a way to delete a webhook yourself yet, I’m afraid. Could you confirm which webhooks you’d like removed, by id or URL? I’ll pass it to the API team.',
			'You’re right that the API can’t delete webhooks yet. If you confirm which ones should go, the API team can remove them for you.'
		],
		paths: [
			{
				detail: ['{whk} and {whk2}, both pointing at our old staging server.', 'The two pointing at our staging server: {whk} and {whk2}.'],
				lookWho: 'e',
				look: ['Removed {whk} and {whk2} from {prj} by hand; checked the requester owns the project. One webhook left. Another vote for a delete endpoint.'],
				lookPaste: 'webhook',
				ends: [
					[
						['a', 'Both are gone, and only the webhook to your live server is left on {project}. Deleting webhooks yourself is on the API team’s list; until then, just ask us.'],
						['c', 'Perfect, thanks.']
					]
				],
				happy: true
			},
			{
				open: [1],
				detail: ['It’s the one pointing at {hookUrl}. And honestly, we’ll be changing servers again in spring, so it would be good to manage this ourselves.'],
				lookWho: 'e',
				look: ['They’re fine for now: the old server will just answer errors and the deliveries give up. A delete endpoint is planned; ticket added to it. Not removing by hand, since the customer would rather wait.'],
				ends: [
					[
						['a', 'Deleting webhooks yourself is planned, and I’ve added your ticket to it. Until then we can remove webhooks by hand whenever you ask. If you leave the old one, deliveries to the old server will simply fail and give up after a few attempts, with no harm on your side.'],
						['c', 'Thanks, we’ll leave it and wait for the delete call, since we’ll need it again in spring.']
					]
				]
			}
		]
	},
	{
		id: 'lostSecret',
		writer: 'dev',
		subjects: ['Lost API key', 'Need our API secret again', 'Where is the key secret?', 'Key shown only once?'],
		open: [
			'The developer who set up our Trellis integration has left, and nobody has the API key secret. The key list in Trellis only shows the first few characters. Can you send us the full secret?',
			'I created an API key for {project} yesterday and didn’t copy the secret. Now I only see {prefix}. How do I see the rest?',
			'We’ve lost our API key. Can it be recovered?'
		],
		more: ['We have a password manager, but nobody saved it there.', 'I’d rather not break the integration while we sort this out.', 'Sorry, I know this is probably our fault.'],
		ask: [
			'Thanks. For security, a key’s secret is shown only once, when it’s created; after that Trellis shows only its first eight characters, the prefix. Could you tell me the project and the key’s name? I’ll explain the options.',
			'Sorry, we can’t show a secret again after it’s created; only the prefix stays visible. Which project and which key is it?'
		],
		paths: [
			{
				detail: ['{project}; the key is called “{keyName}”, prefix {prefix}.'],
				look: ['{keyId} “{keyName}” on {prj}. Nothing we can recover; a new key is the answer.'],
				ends: [
					[
						['a', 'The simplest fix is to create a new key for {project} and copy its secret into your integration straight away; it’s shown once, just after creation. The old key keeps working until it’s removed, so there’s no rush to switch.'],
						['c', 'Created a new one and saved it in our password manager this time. All working.']
					]
				],
				happy: true
			},
			{
				open: [0, 2],
				detail: ['It’s {project}, key “{keyName}”. If we make a new one, can the old one be removed? We don’t know where the old secret might have ended up.'],
				lookWho: 'e',
				look: ['Fine to remove {keyId} once they’ve switched. Removing keys yourself is still a request; adding the ticket.'],
				ends: [
					[
						['a', 'Once you’ve created a new key and moved your integration to it, the API team can remove the old one for you. Removing keys yourself isn’t possible yet, but it’s on their list.'],
						['c', 'New key is in. Please remove the old one.'],
						['e', 'Removed {keyId} from {prj} by hand after the customer’s confirmation.'],
						['a', 'Done: “{keyName}” has been removed, and only your new key works now.']
					]
				]
			}
		]
	},
	{
		id: 'listSecrets',
		writer: 'dev',
		shows: 'keys',
		subjects: ['API returns full key secrets', 'Security question about keys', 'Key list shows more than expected', 'Is this a leak?'],
		open: [
			'I’m building an internal page that shows our Trellis API keys. The key list endpoint returns each key’s full secret, but your README says the secret is only shown once and the list returns the prefix. Is that intended?',
			'Our security team noticed that listing API keys returns the secrets in full. Anyone with one key can read all the others. Please confirm.',
			'Quick question: should the key list include the secret field?'
		],
		more: ['I’ve masked any secrets before sending this.', 'We haven’t shared this anywhere else.', 'If it is intended, we need to rethink how we store keys.'],
		ask: [
			'Thank you for reporting this carefully. Could you tell me which project you listed keys for, and whether the secrets you saw came from the list call or from the response when a key was created?',
			'Thanks for flagging it. To be sure we look at the right thing, could you tell me exactly which call returned the secrets, with any secrets removed?'
		],
		paths: [
			{
				detail: ['From the list call, for {project}. Every key comes back with its secret.', 'The list call. {project}, {keyCount} keys, all with secrets.'],
				lookWho: 'e',
				look: ['Confirmed: listKeys returns the whole key records, secret included; it should return summaries with the prefix only, as the README says. Fix planned. Told security.'],
				team: 'accounts and security team',
				ends: [
					[
						['k', 'Assessed: only callers holding a key for the same project can list its keys, so the exposure stays within each customer’s own project. No sign of misuse. The fix is with the API team.'],
						['a', 'You’re right, and thank you. The list call currently returns each key’s secret, which it shouldn’t: it should return only the prefix, as the README says. Only someone with a key for the same project can make that call, and our security team found no sign of misuse. The API team is changing the list to leave secrets out, and I’ve linked your ticket so you hear when it’s done.'],
						['c', 'Thanks for the quick and honest answer. We’ll hold off building the page until the fix is out.']
					]
				]
			},
			{
				open: [2],
				detail: ['Ah, let me check. You’re right, it was the response when {colleague2} created the key; the keys page in the Trellis web app shows only the prefix.'],
				look: ['Secret came from the create response, which is the one time it’s shown. Fine.'],
				ends: [
					[
						['a', 'That’s expected: the secret is returned once, in the response to creating the key, so that it can be copied. Afterwards the Trellis web app shows only the prefix. Do keep that first response somewhere safe and out of logs.'],
						['c', 'Makes sense. We’ll make sure the creation response isn’t logged. Thanks.']
					]
				]
			}
		]
	},
	{
		id: 'leakedKey',
		writer: 'dev',
		subjects: ['API key committed to GitHub', 'Leaked key, urgent', 'Compromised API key', 'Key exposed publicly'],
		open: [
			'One of our developers pushed a Trellis API key to a public repository this morning. We took the repository down within an hour, but the key needs to be killed. How do we do that?',
			'URGENT: an API key for {project} was pasted into a public forum post by mistake. Please stop it working now.',
			'We think an API key may have been visible in a screenshot shared on social media. What should we do?'
		],
		more: ['I’ve rotated everything else in that file already.', 'We’ve told our client, as our contract requires.', 'Please treat this as urgent.'],
		ask: [
			'Thanks for telling us straight away. Can you confirm the project and the key’s name or prefix? We can stop the key working from our side while you create a replacement.',
			'Thanks for acting quickly. Please send me the key’s prefix (the first eight characters, never the full secret) and the project, and I’ll get it removed.'
		],
		paths: [
			{
				detail: ['Project {project}, key “{keyName}”, prefix {prefix}.'],
				lookWho: 'e',
				look: ['Removed {keyId} from {prj}. Log since the leak: only their own server used it. Customer should create a new key.'],
				lookPaste: 'apiLog',
				ends: [
					[
						['a', 'The key has been removed, so it no longer works. The API team checked how it was used since it was pushed and saw requests only from your own server. Please create a new key for your integration.'],
						['c', 'Thank you, that was fast. New key is in place.']
					]
				],
				happy: true
			},
			{
				open: [1, 2],
				detail: ['It’s {prefix}, on {project}. It was public for about {hours} hours before we noticed.'],
				look: ['Key {prefix} on {prj}, public for {hours} hours. Passing to accounts and security given how long it was out.'],
				team: 'accounts and security team',
				ends: [
					[
						['k', 'Removed {keyId}. Reviewed every request made with it since {date}: {reqs} requests, all from the customer’s office range, plus one attempt from an unknown address after removal, answered 401. Nothing read by anyone else.'],
						['K', 'Hello {name}, I’m {acctFirst} from accounts and security. We’ve removed the key, so it no longer works, and reviewed everything it was used for while it was public. Every request came from your own network, apart from one attempt after removal, which was refused. Nothing in {project} was read or changed by anyone else.'],
						['c', 'That’s a huge relief, thank you for being so thorough.']
					]
				]
			}
		]
	},
	{
		id: 'unknownKey',
		writer: 'dev',
		shows: 'stack401',
		subjects: ['API says unknown API key', '401 from Trellis API', 'Authentication failing', 'Key not accepted'],
		open: [
			'Every call to the Trellis API from our new sync script comes back 401 with “unknown API key”. I created the key ten minutes ago.',
			'Our integration started returning 401 errors this morning: “unknown API key”. It worked yesterday.',
			'I’m getting “unknown API key” on every request. Is the API down?'
		],
		more: ['Nothing in the script itself has changed.', 'I’ve double-checked I’m using the right project.', 'Other calls from the same server to other services work.'],
		ask: [
			'Thanks. “Unknown API key” means the secret we received doesn’t match any key. Could you tell me the key’s prefix, the first eight characters, and how the script reads the key? Please don’t send the full secret.',
			'Thanks for the details. Can you send me the first eight characters of what you’re sending, and of the key in Trellis? That usually shows the problem quickly.'
		],
		paths: [
			{
				open: [0, 2],
				detail: ['The key in Trellis shows {prefix}. In the script I pasted what the key list shows, {prefix}, into the config.'],
				look: ['Classic: they’re sending the prefix, not the secret.'],
				ends: [
					[
						['a', 'That’s the cause: the eight characters you see in the list are only the key’s prefix, which Trellis shows to help you tell keys apart. The script needs the full secret, which was shown once when the key was created. If you don’t have it, create a new key and copy the whole secret.'],
						['c', 'Created a new key and copied the whole thing. Works now. Thanks!']
					]
				]
			},
			{
				detail: ['The prefix matches, {prefix}. The script reads it from an environment variable that {colleague2} set up recently.'],
				lookWho: 'e',
				look: ['Requests arrive with the right prefix but 41 characters in all instead of 40: a trailing newline or quote in the variable, most likely.'],
				lookPaste: 'apiLog401',
				ends: [
					[
						['a', 'The requests reach us with one character too many: the secret is 40 characters long, and we’re receiving 41. That’s usually a newline or a quote mark stored in the environment variable. If {colleague2} sets it again without one, it should work.'],
						['c', 'It was a newline. Fixed, and the sync ran fine. Thanks.']
					]
				]
			},
			{
				open: [1, 2],
				detail: ['It starts {prefix}. Now I think about it, we asked you to remove an old key last week after a scare, and I’m not sure the script was ever moved to the new one.'],
				look: ['Key {prefix} was removed on {date} at the customer’s request. The script still has it.'],
				ends: [
					[
						['a', 'That’s it: the key starting {prefix} is the one we removed on {date} at your request, so it’s no longer recognised. If you put the new key’s secret into the script, it will work again.'],
						['c', 'Yes, the server still had the old one. Updated, and everything’s running. Sorry for the trouble.']
					]
				]
			}
		]
	},
	{
		id: 'methodNotAllowed',
		writer: 'dev',
		subjects: ['405 method not allowed', 'Browser app can’t call the API', 'CORS problem?', 'Method not allowed error'],
		open: [
			'We’re building a small browser dashboard on top of the Trellis API. Every request fails in the browser with a 405 on an OPTIONS request before the real one goes out. Curl from my machine works fine.',
			'Some of our requests to the Trellis API are answered 405 “method not allowed”. Which methods are supported?',
			'Our API gateway reports 405 errors from Trellis for a few requests a day. Can you tell why?'
		],
		more: ['Everything else about the integration works.', 'I can share the full request if you need it.', 'We only see it from one of our services.'],
		ask: [
			'Thanks. The API accepts GET, HEAD, POST, PUT, PATCH and DELETE; anything else gets 405. Could you tell me which method the failing requests use, and where they come from?',
			'Thanks. A 405 means the request used a method the API doesn’t accept. If you can send me one failing request, with the key left out, I’ll take a look.'
		],
		paths: [
			{
				open: [0],
				detail: ['They’re OPTIONS requests the browser sends by itself before the real call. The dashboard calls the API directly from the page with our key.'],
				lookWho: 'e',
				look: ['OPTIONS from a browser page means a CORS preflight. The API is server-to-server; keys don’t belong in web pages, where anyone can read them. They should call it from their server.'],
				lookPaste: 'apiLog405',
				ends: [
					[
						['a', 'The OPTIONS request is the browser checking whether it may call the API, and the API refuses it because it’s built for server-to-server use. That’s deliberate: a key placed in a web page can be read by anyone who opens it. The usual set-up is a small endpoint on your own server that holds the key and calls Trellis for the dashboard.'],
						['c', 'Makes sense; we hadn’t thought about the key being visible. We’ve moved the calls behind our server and it works.']
					]
				]
			},
			{
				open: [1, 2],
				detail: ['Looking at the gateway log, they’re PURGE requests. I think our caching layer sends them.'],
				look: ['PURGE isn’t something the API accepts. Their cache is passing its own requests on to us.'],
				lookPaste: 'apiLog405',
				ends: [
					[
						['a', 'Those PURGE requests come from your caching layer, not your application, and the API doesn’t accept that method, so it answers 405. If your team stops the cache passing PURGE on to Trellis, the errors will stop.'],
						['c', 'Our ops team changed the cache configuration and the 405s have gone. Thanks.']
					]
				]
			}
		]
	}
];

const otherTopics: Topic[] = [
	{
		id: 'confirm',
		writer: 'owner',
		subjects: ['Confirmation email not arriving', 'Can’t confirm my account', 'Confirm email link?', 'Sign-up email missing'],
		open: [
			'I signed up for Trellis on {wday} so my manager can add me to {project}, but the confirmation email hasn’t arrived. I’ve checked junk.',
			'I’ve clicked “send again” four times and still no confirmation email. My manager wants me confirmed before she adds me to anything.',
			'Your confirmation link says it has expired. How do I get a new one?'
		],
		more: ['I’m new at {org}, so I might be missing something obvious.', 'Colleagues who joined last month didn’t have this problem.', 'My manager needs me on the project by {day}.'],
		ask: [
			'Thanks. Could you tell me the address you signed up with? I’ll check what happened to the email.',
			'Sorry about that. What email address did you use? I can see in our mail log whether the confirmation went out.'
		],
		paths: [
			{
				open: [0, 1],
				detail: ['{email}'],
				look: ['Confirmations to {email} all accepted by the receiving server; their company quarantine, probably.'],
				lookPaste: 'mailSent',
				ends: [
					[
						['a', 'All of the confirmation emails left us and your mail server accepted them, so they’re being held at your end. Your IT team may have a quarantine for automated mail; asking them to release messages from trellis.example should fix it.'],
						['c', 'IT found them in quarantine. I’ve confirmed my address now. Thanks!']
					]
				],
				happy: true
			},
			{
				open: [0, 1],
				detail: ['It should be {email}.', 'It’s {email}, I think.'],
				look: ['Account {uid} has {typoSelf}: a letter missing. Corrected it to {email} after checking with the customer, and sent a new confirmation.'],
				lookPaste: 'typoAccount',
				ends: [
					[
						['a', 'Your account was created with {typoSelf}, with a letter missing, so the emails went nowhere. I’ve corrected it to {email} and sent a new confirmation.'],
						['c', 'Got it and confirmed. Thank you!']
					]
				]
			},
			{
				open: [2],
				detail: ['{email}. The link expired because I only saw it a week later.'],
				look: ['Confirmation links last 24 hours. Sent a new one to {email}.'],
				lookPaste: 'account',
				ends: [
					[
						['a', 'Confirmation links last 24 hours, so the old one won’t work. I’ve sent you a new one; it works until this time tomorrow.'],
						['c', 'Thanks, I’ll do it when I’m back in the office on {day}.'],
						remind
					]
				]
			}
		]
	},
	{
		id: 'lostPhone',
		writer: 'owner',
		subjects: ['Lost phone, can’t sign in', 'Locked out after new phone', 'Authenticator app gone', 'Can’t get past the code screen'],
		open: [
			'My phone was stolen on {wday}, and with it the authenticator app I use for Trellis. I can type my password, but then it asks for a six-digit code I can’t get. I own {project}, and nobody else can add members.',
			'I got a new phone and didn’t move my authenticator app across. Now Trellis wants a code at sign-in and I have no way to produce one.',
			'I can’t sign in to Trellis. After my password it asks for a code from my app, and I reset my phone last week.'
		],
		more: ['I don’t have the recovery codes; I didn’t realise they mattered.', 'Everything else on the new phone is set up; only Trellis is stuck.', 'We have a client review on {day}, and I need the board.'],
		ask: [
			'Sorry to hear that. Taking a second factor off an account has to be done by our accounts and security team, after they’ve confirmed it’s really you. Could you tell me the email on the account? I’ll pass it to them.',
			'That’s a stressful one. For your protection, only our accounts and security team can remove a second factor, and they’ll need to check your identity first. Which email do you sign in with?'
		],
		paths: [
			{
				detail: ['{email}. I can do a video call whenever suits.'],
				look: ['{email}: second factor enrolled {enrolled}. Passing to accounts and security.'],
				lookPaste: 'account',
				team: 'accounts and security team',
				ends: [
					[
						['k', 'Video call with {name} at {hhmm}: matched the photo ID against the billing contact on file, and the account questions checked out. Removed the second factor; a new one can be enrolled at the next sign-in.'],
						['K', 'Hello {name}, thanks for the call. The second factor has been removed from your account, so you can sign in with your password. Trellis will offer to set up a new authenticator straight away; please do, and keep the recovery codes somewhere safe this time.'],
						['c', 'I’m back in and set up again with the new phone. Thank you both.']
					]
				]
			},
			{
				detail: ['It’s {email}.'],
				look: ['Second factor enrolled {enrolled}. Accounts and security need ID before they act.'],
				lookPaste: 'account',
				team: 'accounts and security team',
				ends: [
					[
						['K', 'Hello {name}, I’m {acctFirst} from accounts and security. To remove the second factor we need to confirm who you are. Could you reply with a time for a short video call this week, and have photo ID to hand?'],
						['c', 'I’m travelling until {day}; I’ll get back to you then.'],
						remind
					]
				]
			}
		]
	},
	{
		id: 'erase',
		writer: 'owner',
		subjects: ['Please delete my data', 'Right to erasure', 'Remove my account', 'GDPR request'],
		open: [
			'I left {org} in {monthPast}, and I’d like my Trellis account and personal data deleted, please.',
			'Under the UK GDPR, I’m asking you to erase all the personal data you hold about me.',
			'How do I delete my Trellis account? I can’t find a way to do it.'
		],
		more: ['I’d rather not receive any more emails from Trellis after this.', 'Please confirm when it’s done.', 'I’ve already left all the projects I could.'],
		ask: [
			'Thanks for your request. Could you confirm the email address on the account, and whether you still own any projects? Projects need a new owner before an account can be deleted.',
			'Thanks. Account deletion is handled by our data protection lead. Could you confirm the account’s email address so I can pass it on?'
		],
		paths: [
			{
				detail: ['{email}. I don’t think I own anything; I was just a member.'],
				look: ['{email}: member of {project}, owns nothing. Passing to data protection.'],
				lookPaste: 'account',
				team: 'data protection lead',
				ends: [
					[
						['d', 'Erasure of {uid} scheduled. Membership entries anonymised; comments kept under “Former member”, as the retention schedule says.'],
						['D', 'Hello {name}, I’m {dataFirst}, Fernhill’s data protection lead. Your account and personal data will be erased within 30 days, and you’ll get a final email when it’s done. Comments you wrote stay on {project} under “Former member”, without your name.'],
						['c', 'Thank you, that’s all I needed.']
					]
				]
			},
			{
				detail: ['{email}. I do still own {project}, but I don’t think anyone uses it now.'],
				look: ['{email} owns {prj}, which has {n} other members. Can’t delete the account while it owns a project. Needs a new owner from {org}, or {org} confirming the project can go.'],
				lookPaste: 'account',
				ends: [
					[
						['a', 'You still own {project}, which has {n} other members, so we need to know what should happen to it before your account can be deleted: either someone at {org} takes it over, or {org} confirms it can be deleted. Could you check with them?'],
						['c', 'I’ve emailed my old manager; I’ll let you know.'],
						remind
					]
				]
			}
		]
	},
	{
		id: 'invoice',
		writer: 'owner',
		subjects: ['Invoice query', 'Charged for more people than we have', 'Paying for leavers?', 'How is our bill worked out?'],
		open: [
			'Our invoice for {monthPast} charges us for {billed} people, but I count far fewer members across our projects. Can you explain?',
			'We’re still being charged for people who left months ago. How do we stop paying for them?',
			'Can you explain how the number of people on our invoice is worked out? It went up again this month.'
		],
		more: ['Our finance team closes the month on Friday.', 'We’ve been customers since 2024 and never questioned it before.', 'I’m the person who gets asked about it every month.'],
		ask: [
			'Thanks. I’ll pass this to our billing team. Could you confirm the name of the billing contact on the account, so they know who to reply to?',
			'Thanks for writing. Billing questions go to Esther in our billing team. Which email should she reply to?'
		],
		paths: [
			{
				open: [0, 2],
				detail: ['Please copy in our billing contact, {directorFull}; I look after the projects, so I said I’d ask. Here are the last few invoices.', 'Me, please, with {directorFull}, our billing contact, copied in. These are our last three invoices.'],
				paste: 'invoices',
				lookWho: 'b',
				look: ['Billed count is everyone with access to at least one project, viewers included; they’ve been counting members only. {viewers} viewers explain the gap. Invoice is right.'],
				team: 'billing team',
				ends: [
					[
						['B', 'Hello {name}, Esther from billing here. The count on the invoice includes everyone who can open at least one of your projects, viewers as well as members. You have {viewers} viewers, mostly client contacts, which makes up the difference. If some of them no longer need access, let support know and they can be taken off.'],
						['c', 'Ah, viewers count too. That explains it, thanks.']
					]
				]
			},
			{
				open: [1, 2],
				detail: ['Please copy in our billing contact, {directorFull}, though I’m the one who noticed. The two I have in mind are {colleagueFull} and {colleague2Full}; both left us in {monthPast}, and they’re still on {project}.'],
				lookWho: 'b',
				look: ['Billing counts anyone with access to a project. The two leavers are still members of {prj}, so they’re counted. Asked the API team to take them off; I’ll credit {monthPast} on the next invoice.'],
				team: 'billing team',
				ends: [
					[
						['e', 'Removed both leavers from {prj} by hand at billing’s request, after checking with the owner.'],
						['B', 'Hello {name}, Esther from billing here. {colleague} and {colleague2} were still members of {project}, which is why they were counted. The API team has taken them off, so they won’t appear on your next invoice, and I’ve added a credit of {credit} to cover {monthPast}.'],
						['c', 'Thank you, that’s very fair.']
					]
				],
				happy: true
			}
		]
	},
	{
		id: 'slowBoard',
		writer: 'owner',
		subjects: ['Is the API down?', 'Board won’t load', 'Trellis very slow', 'Cards not showing'],
		open: [
			'Is the Trellis API down? Our board for {project} shows the column headings but no cards, since about {hhmm}.',
			'Trellis has been extremely slow for us all day; the board takes thirty seconds to load. Is it the API?',
			'Since this morning the board for {project} is blank for some of us but fine for others.'
		],
		more: ['Our developer says the API answers fine when it’s called directly.', 'We’ve cleared caches and tried a different network.', 'Some of us are on laptops and some on desktops, same result.'],
		ask: [
			'Thanks. I don’t see any problem with the API itself right now. Could you tell me which browser you use, and whether the problem happens for everyone or only for some people?',
			'Sorry about that. Could you open the browser’s developer console on the board and copy any red error lines? That tells us where it’s failing.'
		],
		paths: [
			{
				open: [0, 2],
				detail: ['Chrome. It only happens for people who have the new password manager extension IT rolled out on {wday}.'],
				paste: 'console',
				lookWho: 'w',
				look: ['The extension injects into the board and breaks the card list script. Known with that extension; fix in the next web app release. Workaround: tell the extension to leave app.trellis.example alone.'],
				team: 'web team',
				ends: [
					[
						['a', 'It isn’t the API: the board’s own script trips over the new password manager extension. The web team has a fix in the next web app release. Until then, your IT team can tell the extension to leave app.trellis.example alone, and the board will load.'],
						['c', 'IT have done that and the board works for everyone. Thanks.']
					]
				]
			},
			{
				open: [0, 1],
				detail: ['Everyone, all browsers, and the board has grown a lot this term.'],
				paste: 'console',
				lookWho: 'w',
				look: ['The board for {prj} has {cards} cards; the web app loads them all at once, which is slow at that size. Loading boards in pages is on our list. Passing back to support with that.'],
				team: 'web team',
				ends: [
					[
						['a', 'The API is fine; the slowness is in the web app, which loads every card on the board at once, and {project} has over {cards} cards. The web team is working on loading boards in pages, and I’ve passed your ticket to them. Archiving finished cards will speed things up meanwhile.'],
						['c', 'Thanks. We’ve archived last year’s cards and it’s much better.']
					]
				]
			}
		]
	}
];

const topics: Topic[] = [...memberTopics, ...integrationTopics, ...otherTopics];

// Shared pieces, combined with every topic.

/** A second matter the customer raises, support's answer, and the customer's later word on it. */
const sides: { q: string; a: string; then?: string }[] = [
	{ q: 'While I have you: is there a way to see every project I own in one place?', a: 'On your other question: your profile page lists every project you own under “My projects”, with the members of each.', then: 'And thanks for the tip about the profile page.' },
	{ q: 'Also, do you have a status page? Last {wday2} the board was slow for an hour and I didn’t know whether it was us.', a: 'And yes, there’s a status page at status.trellis.example, and you can subscribe to it by email.', then: 'I’ve subscribed to the status page too.' },
	{ q: 'Separately, our finance team asked whether you can put our purchase order number on invoices.', a: 'About the purchase order number: billing can add it to future invoices if you reply with it, and I’ve told them to expect it.', then: 'Our PO number for the invoices is {po}.' },
	{ q: 'One more thing: is Trellis data stored in the UK?', a: 'On where data is kept: Trellis data is stored in London, with backups in Dublin. The data processing agreement on our website has the details.' },
	{ q: 'Can a project be renamed after it’s created? We have one with a typo in its name.', a: 'Renaming a project isn’t possible yet, I’m afraid. It’s a common request, and I’ve added your vote.' },
	{ q: 'Is there a keyboard shortcut for adding a card? I do it a hundred times a day.', a: 'And there is a shortcut: press N on a board to add a card to the first column.', then: 'The N shortcut is a revelation, by the way.' },
	{ q: 'Our accountant wants copies of last year’s invoices. Where can I find them?', a: 'Past invoices are under Billing, then Invoices, and each one downloads as a PDF.' },
	{ q: 'Do you offer a discount for charities or schools?', a: 'On pricing: registered charities and state schools get 30% off. Reply with your charity or school number and billing will apply it from the next invoice.' },
	{ q: 'Does Trellis work on tablets? Some of our people only have iPads.', a: 'Trellis works in any recent browser, tablets included; there’s no separate app to install.' },
	{ q: 'How long are deleted cards kept? Someone deleted one by accident last week.', a: 'Deleted cards stay in the board’s bin for 30 days, so last week’s should still be there: board menu, then Bin.', then: 'We found the deleted card in the bin, too.' },
	{ q: 'Could we get a short training session for new staff?', a: 'We run a free 45-minute introduction to Trellis every Thursday at 11:00. I’ve sent you the joining link separately.', then: 'Two of our new starters are booked on Thursday’s introduction.' },
	{ q: 'Our IT team asks whether you support single sign-on.', a: 'Single sign-on isn’t available yet. It’s on our roadmap, but I don’t have a date to give you.' },
	{ q: 'Is the API reference public? A contractor wants to look before quoting.', a: 'The API reference is public at developers.trellis.example, with an example for each call.' },
	{ q: 'Our procurement team needs your ISO 27001 certificate. Can you send it?', a: 'I’ve attached our ISO 27001 certificate and the summary of our latest penetration test, which procurement teams usually ask for next.' },
	{ q: 'What’s the limit on attachment size? A 40 MB PDF wouldn’t upload.', a: 'Attachments can be up to 25 MB each, which is why the 40 MB PDF was refused. Compressing it, or linking to it from your file storage, both work.' }
];
const contexts = [
	'I’m covering for our usual Trellis person while they’re on holiday, so bear with me.',
	'We’ve used Trellis for about two years and this is the first time I’ve had to write in.',
	'I’ve been asked to look into this on behalf of the team.',
	'Apologies if this has been asked before; I couldn’t find it in the help pages.',
	'Our IT person is part-time, so I’m having a go myself.',
	'I’ve tried to work this out myself for most of the morning.'
];
const situations = [
	'We have an important meeting on {day}, and I’d like this sorted before then.',
	'No huge rush, but it would be good to know by the end of the week.',
	'It’s not urgent, but it is confusing people.',
	'Any help appreciated; it’s holding up a few people.',
	'I’m out of the office from {day}, so a reply before then would be great.'
];
const closings = ['Let me know if there’s anything else.', 'I’ll keep this ticket open until we hear back.', 'Do reply here if you have any questions.'];
const disclaimers = [
	'This email and any attachments are confidential and intended only for the named recipient. If you have received it in error, please tell the sender and delete it.',
	'Please consider the environment before printing this email.',
	'Our office hours are 9 to 5, Monday to Friday. Emails received outside these hours are answered the next working day.'
];
const greetings = ['Hi', 'Hello', 'Hi there', 'Good morning', 'Morning', 'Dear Trellis support', 'Hello Trellis team', 'Dear Fernhill support'];
const ownerSign = ['Thanks, {name}', 'Many thanks\n{full}', '{name}', 'Cheers, {name}', 'Kind regards,\n{full}\n{role}, {org}\n{phone}', 'Thanks\n{name}\n\n{full} | {role} | {org}', 'Best,\n{full}'];
const devSign = ['Thanks, {name}', 'Cheers,\n{name}', '{full}\n{role}, {org}', 'Thanks\n{full}', '{name}', 'Thanks,\n{full}\n{role} | {org}\n{street} | www.{domain}'];
const fullSign = 'Kind regards,\n\n{full}\n{role}\n{org}\n{street}\nT {phone} | www.{domain}';
/** What the customer already tried, for the tickets about projects, members and integrations. */
const triedDev = [
	'I’ve gone through the API reference and our own code, and I can’t see anything wrong on our side.',
	'I tested from my laptop and from the server and got the same result both times.',
	'We redeployed the integration this morning just in case; no change.',
	'I checked the status page first, and it said everything was fine.',
	'I’ve reproduced it with curl, so it isn’t our HTTP library.',
	'Nothing in our deployment history lines up with when this started.'
];
const triedOwner = [
	'I’ve tried signing out and back in, and a different browser.',
	'I asked a colleague to try from her laptop, with the same result.',
	'I’ve read the help pages on projects and members but couldn’t find anything about this.',
	'I’ve restarted my computer, which is what our IT always tells me to do first.',
	'I searched my inbox for anything from Trellis about changes, but found nothing.',
	'I’ve looked through every menu in the project, twice.'
];
const closers = ['Thanks for letting us know.', 'Thanks. Do get in touch if anything else comes up.', 'Thank you for confirming.', 'Understood, thanks.', 'Thanks for the update.'];
const cardNames = ['Draft brief', 'Client sign-off', 'Update budget', 'Chase invoice', 'Write report', 'Risk register', 'Agenda for Thursday', 'Supplier quote', 'Kick-off notes', 'Final checks', 'Proofread', 'Training plan', 'Board paper', 'Timeline', 'Weekly update', 'Follow-up call', 'Draft plan', 'Order supplies'];
const columns = ['Done', 'In progress', 'Review', 'Waiting', 'To do'];
const browsers = ['Chrome on Windows', 'Safari on macOS', 'Edge on Windows', 'Firefox on Linux', 'Safari on iPad', 'Chrome on Android'];
const acks = ['Thanks for getting in touch.', 'Thanks for your message, and sorry for the trouble.', 'Thanks for writing in.', 'Sorry to hear that.', 'Thanks for the clear description.'];
const agentSign = ['Best wishes,\n{signer}', '{signer}\n{desk}', 'Thanks,\n{signer}', 'Kind regards,\n{signer}, {desk}'];
const desks: Partial<Record<Who, string>> = { a: 'Fernhill support', E: 'Trellis API team', K: 'Accounts and security team', B: 'Billing team', D: 'Data protection' };
const holding = [
	'I’ve asked our {team} to take a look, and I’ll come back to you as soon as I hear.',
	'I’ve passed this to our {team}. They usually reply within a working day, and I’ll update you then.',
	'Our {team} is looking into this now. I’ll be in touch when I know more.'
];
const chasers = ['Any news on this?', 'Just checking you got my last message.', 'Sorry to chase, but we’re getting a bit stuck.', 'Is there an update?', 'Hello? It’s been a few days.', 'It’s been nearly a week now. Is anyone looking at this?'];
const handovers: Partial<Record<Who, string[]>> = {
	e: ['Passing to the API team; details above.', 'API team, could one of you look at this? Customer details above.', 'Over to the API team, please.'],
	w: ['Web team, this one looks like yours. Details above.', 'Passing to the web team.'],
	o: ['Operations, could you check this? Times above.', 'Passing to operations.'],
	b: ['Billing, over to you.', 'Passing to billing; customer details above.']
};
const surveys: [string, string][] = [['Great', 'Quick and friendly.'], ['Good', 'Sorted in the end, thanks.'], ['Great', '{agent} was brilliant.'], ['OK', 'Took a while, but we got there.'], ['Good', ''], ['Great', 'Clear answers, thank you.']];

const fence = (lines: string[], lang = 'text') => ['```' + lang, ...lines, '```'].join('\n');
const head = (...cells: string[]) => `| ${cells.join(' | ')} |\n|${' --- |'.repeat(cells.length)}`;

const fill = (text: string, values: Record<string, string>): string =>
	text.replace(/\{(\w+)\}/g, (_, key: string) => {
		const value = values[key];
		if (value === undefined) throw new Error(`no value for {${key}} in: ${text.slice(0, 60)}`);
		return value;
	});

/** Keeps a message inside the hours its writer works; Fernhill staff work 08:30 to 17:30 on weekdays. */
const office = (r: Rand, t: number) => {
	let m = t;
	if (minuteOfDay(m) > 17 * 60 + 30) m = startOfDay(m) + 1440 + 8 * 60 + 30 + int(r, 0, 90);
	if (minuteOfDay(m) < 8 * 60 + 30) m = startOfDay(m) + 8 * 60 + 30 + int(r, 0, 90);
	while (isWeekend(m)) m += 1440;
	return m;
};
const waking = (r: Rand, t: number) => {
	let m = t;
	if (minuteOfDay(m) > 22 * 60) m = startOfDay(m) + 1440 + 6 * 60 + 40 + int(r, 0, 200);
	if (minuteOfDay(m) < 6 * 60 + 30) m = startOfDay(m) + 6 * 60 + 40 + int(r, 0, 200);
	return m;
};

// Dates: the tickets are spread over the working days between 5 October and 13 November.
const workdays: number[] = [];
for (let d = 4; d <= 43; d++) if (!isWeekend(d * 1440)) workdays.push(d * 1440);

interface Plan {
	topic: Topic;
	path: Path;
	pathIndex: number;
	open: number;
}

/** Which of the tried lines fit each topic. */
const triedFor: Record<string, number[]> = { notOwner: [0, 1, 2, 3, 5], defaultRole: [0, 2, 3, 4], notFound: [0, 1, 2, 3], addEmail: [2, 4], public: [2, 4], remove: [2, 5], role: [2, 5], retries: [0, 2, 3, 5], deliveryFails: [0, 1, 3, 4, 5], unknownKey: [0, 1, 2, 4, 5], methodNotAllowed: [0, 4, 5], formPayload: [0, 3, 5] };
const webhookIds = new Set(['formPayload', 'retries', 'events', 'deliveryFails', 'deleteHook']);
const keyIds = new Set(['lostSecret', 'listSecrets', 'leakedKey', 'unknownKey', 'methodNotAllowed']);
const fernhillIps = ['198.51.100.24', '198.51.100.25', '198.51.100.31'];
const userAgents = ['python-requests/2.32.3', 'node-fetch/3.3.2', 'curl/8.7.1', 'Go-http-client/2.0', 'axios/1.7.7'];

const ticket = (index: number, plan: Plan, number: number): string => {
	const r = mulberry32(0x7e11a000 + index * 7919);
	const { topic, path, pathIndex } = plan;
	// Each ticket has an organisation and a main project of its own (no two tickets share both while ITEMS stays under
	// 17 × 3 × 6 = 306), and every project has one owner, the same in every ticket that mentions it.
	const combo = (index * 97) % (kinds.length * 18);
	const kind = kinds[combo % kinds.length]!;
	const org = kind.names[Math.floor(combo / kinds.length) % 3]!;
	const project = kind.projects[Math.floor(combo / (kinds.length * 3)) % 6]!;
	// Every project of every organisation has a number of its own, which gives it a distinct id and a distinct owner.
	const projectNumber = (name: string) => kinds.indexOf(kind) * 18 + kind.names.indexOf(org) * 6 + kind.projects.indexOf(name);
	const personAt = (n: number) => [firstNames[(n * 7) % firstNames.length]!, surnames[(n * 11) % surnames.length]!] as const;
	const ownerOf = (name: string) => personAt(projectNumber(name));
	const [ownerFirst, ownerLast] = ownerOf(project);
	const ownerName = `${ownerFirst} ${ownerLast}`;
	const domain = `${org.normalize('NFD').toLowerCase().replace(/^the /, '').replace(/[^a-z]+/g, '')}.example`;
	const people = shuffle(r, firstNames.filter((name) => name !== ownerFirst));
	const sur = shuffle(r, surnames.filter((name) => name !== ownerLast));
	// Who owns the main project: the customer, the colleague the customer writes about, or someone outside the story.
	const ownerIsColleague = topic.id === 'notOwner';
	const customerIsOwner = !ownerIsColleague && topic.id !== 'confirm' && !(topic.id === 'erase' && pathIndex === 0);
	const [first, last] = customerIsOwner ? [ownerFirst, ownerLast] : [people[3]!, sur[3]!];
	const [colleague, cLast] = ownerIsColleague ? [ownerFirst, ownerLast] : [people[0]!, sur[0]!];
	const [colleague2, c2Last] = [people[1]!, sur[1]!];
	const [director, dLast] = personAt(320 + kinds.indexOf(kind) * 3 + kind.names.indexOf(org));
	const full = `${first} ${last}`;
	const lower = (text: string) => text.toLowerCase().replace(/[^a-z]/g, '');
	const email = hash(full) % 5 < 4 ? `${lower(first)}@${domain}` : `${lower(first)}.${lower(last)}@${domain}`;
	const colleagueEmail = `${lower(colleague)}.${lower(cLast)}@${domain}`;
	const colleague2Email = `${lower(colleague2)}@${domain}`;
	const personalEmail = `${lower(colleague)}${lower(cLast).slice(0, 3)}${int(r, 10, 99)}@${pick(r, providers)}`;
	const localPart = colleagueEmail.split('@')[0]!;
	const cut = int(r, 1, localPart.length - 2);
	const wrongEmail = `${localPart.slice(0, cut)}${localPart[cut + 1]}${localPart[cut]}${localPart.slice(cut + 2)}@${domain}`;
	const ownLocal = email.split('@')[0]!;
	const drop = int(r, 1, ownLocal.length - 1);
	const typoSelf = `${ownLocal.slice(0, drop)}${ownLocal.slice(drop + 1)}@${domain}`;
	const shuffledProjects = [project, ...shuffle(r, kind.projects.filter((name) => name !== project))];
	const [project2, project3] = [shuffledProjects[1]!, shuffledProjects[2]!];
	const projectId = (name: string) => `prj_${41000 + projectNumber(name) * 23 + (hash(org + name) % 23)}`;
	const userId = (name: string) => `usr_${10300 + (hash(name + org) % 69000)}`;
	const prj = projectId(project);
	const uid = userId(full);
	const cuid = userId(`${colleague} ${cLast}`);
	const agent = pick(r, agents);
	const dev = pick(r, apiTeam);
	const webber = pick(r, webTeam);
	const acct = pick(r, accountsTeam);
	const ops = pick(r, opsTeam);
	const open = plan.open + int(r, 7 * 60, 20 * 60);
	const after060 = open >= RELEASE_060;
	const N = 6 + (hash(org) % 70);
	const hookHost = pick(r, [`hooks.${domain}`, `api.${domain}`, `integrations.${domain}`, `app.${domain}`]);
	const hookPath = pick(r, ['/webhooks/trellis', '/hooks/trellis', '/trellis/events', '/api/webhooks/trellis', '/inbound/trellis']);
	const hookUrl = `https://${hookHost}${hookPath}`;
	const hostLetters = hookHost.split('.')[1]!.split('');
	const swapAt = int(r, 1, Math.max(1, hostLetters.length - 3));
	[hostLetters[swapAt], hostLetters[swapAt + 1]] = [hostLetters[swapAt + 1]!, hostLetters[swapAt]!];
	const typoHost = [hookHost.split('.')[0], hostLetters.join(''), 'example'].join('.');
	const whkNumber = 50200 + (hash(org + project + 'whk') % 9000);
	const keyNumber = 50100 + (hash(org + project + 'key') % 9000);
	const secretHex = hex(r, 36);
	const prefix = `trl_${secretHex.slice(0, 4)}`;
	const keyName = pick(r, ['CI deploys', 'CRM sync', 'Nightly import', 'Chat bot', 'Reporting', 'Onboarding script', 'Dashboard', 'Zap sync', 'HR feed', 'Staging']);
	// In order: the customer signs up, the project starts, keys are made, a second factor may be enrolled.
	const signupMin = open - int(r, 240, 720) * 1440 + int(r, 8 * 60, 18 * 60);
	const projectStart = signupMin + int(r, 1, 120) * 1440;
	const sinceStart = (low: number) => projectStart + int(r, low, Math.max(low, Math.floor((open - projectStart) / 1440) - 10)) * 1440 + int(r, 0, 1439);
	const keyDateMin = sinceStart(10);
	const keyList = [{ id: `key_${keyNumber}`, name: keyName, prefix, created: keyDateMin }];
	for (const name of shuffle(r, ['CI deploys', 'CRM sync', 'Reporting', 'Chat bot', 'Staging', 'HR feed', 'Backups']).filter((name) => name !== keyName).slice(0, int(r, 1, 3)))
		keyList.push({ id: `key_${keyNumber + int(r, 3, 900)}`, name, prefix: `trl_${hex(r, 4)}`, created: sinceStart(5) });
	const enrolledMin = signupMin + int(r, 5, Math.floor((open - signupMin) / 1440) - 5) * 1440;
	// The day it happened: a few working days before the ticket, and never before the release a topic depends on.
	const eventMin = topic.id === 'leakedKey' ? open - int(r, 60, 300) : Math.max(office(r, weekdayBefore(open, int(r, 1, 4)) + int(r, 9 * 60, 16 * 60)), topic.since ? Math.min(open - 90, RELEASE_060 + int(r, 60, 400)) : 0);
	/** Moves a time before 07:00 back to the evening before, for activity people really do. */
	const daytime = (m: number) => (minuteOfDay(m) < 7 * 60 ? startOfDay(m) - 1440 + 20 * 60 + int(r, 0, 150) : m);
	// The customer's last sign-in, and the colleague's: months ago for an owner who has left.
	const lastSeenMin = topic.id === 'lostPhone' ? startOfDay(eventMin) - int(r, 1, 3) * 1440 + int(r, 7 * 60, 9 * 60) : topic.id === 'erase' ? open - int(r, 40, 150) * 1440 : daytime(Math.min(open - int(r, 20, 300), eventMin + int(r, 60, 600)));
	const colleagueLast = topic.id === 'notOwner' && pathIndex > 0 ? open - int(r, 60, 200) * 1440 : daytime(open - int(r, 1, 12) * 1440 - int(r, 0, 600));
	const accent = pick(r, accentNames);
	const oddName = pick(r, oddNames);
	const roleKept = pick(r, ['a member', 'a viewer']);
	const billed = N + int(r, 6, 30);
	const he = (female: boolean): [string, string, string, string, string] => (female ? ['she', 'She', 'her', 'her', 'Her'] : ['he', 'He', 'him', 'his', 'His']);
	const [she, She, him, his, His] = he(femaleNames.has(colleague));
	const [she2, , , his2] = he(femaleNames.has(colleague2));

	const values: Record<string, string> = {
		name: first,
		full,
		email,
		org,
		role: pick(r, topic.writer === 'dev' ? kind.devRoles : kind.roles),
		phone: `0117 496 0${String(int(r, 0, 999)).padStart(3, '0')}`,
		N: String(N),
		n: String(int(r, 3, 9)),
		big: String(int(r, 25, 60)),
		project,
		project2,
		prj,
		uid,
		cuid,
		colleague,
		colleagueFull: `${colleague} ${cLast}`,
		colleagueEmail,
		colleague2,
		colleague2Full: `${colleague2} ${c2Last}`,
		colleague2Email,
		directorFull: `${director} ${dLast}`,
		wrongEmail,
		typoSelf,
		she,
		She,
		him,
		his,
		His,
		she2,
		his2,
		agent,
		acctFirst: acct.split(' ')[0]!,
		dataFirst: dataLead.split(' ')[0]!,
		wday: weekday(eventMin),
		wday2: weekday(weekdayBefore(open, int(r, 2, 6))),
		day: weekdayFrom(startOfDay(open) + int(r, 2, 4) * 1440),
		date: dayMonth(eventMin),
		hhmm: clock(eventMin),
		gap: String(int(r, 4, 40)),
		hours: String(int(r, 2, 9)),
		month: monthNames[(at(open).getUTCMonth() + int(r, 2, 4)) % 12]!,
		monthPast: monthNames[at(open).getUTCMonth() - int(r, 1, 3)]!,
		last: `${shortDate(at(colleagueLast))}, ${clock(colleagueLast)}`,
		signup: longDate(at(signupMin)),
		enrolled: longDate(at(enrolledMin)),
		oddName,
		oddSlug: slugify(oddName),
		accentName: accent[0],
		accentSlug: slugify(accent[0]),
		city: accent[1],
		whk: `whk_${whkNumber}`,
		whk2: `whk_${whkNumber - int(r, 40, 900)}`,
		hookUrl,
		hookHost,
		typoUrl: `https://${typoHost}${hookPath}`,
		typoHost,
		keyName,
		prefix,
		keyId: `key_${keyNumber}`,
		keyDate: longDate(at(keyDateMin)),
		keyCount: ['one', 'two', 'three', 'four'][keyList.length - 1]!,
		queued: String(int(r, 1800, 5200)),
		roleKept,
		ipList: fernhillIps.join(', '),
		reqs: String(int(r, 40, 900)),
		newEmail: `${lower(first)}.${lower(pick(r, surnames))}@${domain}`,
		oldDomain: domain,
		newDomain: `${domain.split('.')[0]}${pick(r, ['group', 'uk', 'hq', 'co'])}.example`,
		billed: String(billed),
		viewers: String(billed - N),
		street: `${int(r, 2, 140)} ${pick(r, ['High Street', 'Station Road', 'Mill Lane', 'Queen Square', 'Victoria Street', 'Wharf Road'])}, ${pick(r, ['Bristol', 'Bath', 'Exeter', 'Leeds', 'Norwich', 'Cardiff', 'York', 'Reading'])}`,
		cards: String(int(r, 9, 30) * 100),
		credit: money(int(r, 2, 4) * 2 * 6),
		po: `PO-${int(r, 10000, 99999)}`,
		domain
	};
	const f = (text: string) => fill(text, values);

	// Pasted output.
	const ownerId = userId(ownerName);
	const ownerEmail = ownerIsColleague ? colleagueEmail : customerIsOwner ? email : `${lower(ownerFirst)}@${domain}`;
	const between = (from: number, to: number) => from + int(r, 0, Math.max(0, Math.floor((to - from) / 1440))) * 1440;
	// The size and visibility of each project stay the same from ticket to ticket.
	const sizeOf = (name: string) => 6 + (hash(org + name + 'size') % 12);
	const visibilityOf = (name: string) => ['private', 'team', 'private', 'public'][hash(org + name + 'visibility') % 4]!;
	const extras = shuffle(r, firstNames.filter((name) => ![first, colleague, colleague2, ownerFirst].includes(name)))
		.slice(0, Math.max(2, sizeOf(project) - 2))
		.map((given, i) => {
			const family = sur[4 + i]!;
			return { name: `${given} ${family}`, id: userId(`${given} ${family}`), email: `${lower(given)}@${domain}`, role: r() < 0.75 ? 'member' : 'viewer', added: between(projectStart, open - 1440) };
		});
	const colleagueRole = topic.id === 'role' || topic.id === 'notOwner' ? (topic.id === 'role' ? 'viewer' : 'owner') : 'member';
	interface Row {
		name: string;
		id: string;
		email: string;
		role: string;
		added: number;
		addedMs?: number;
	}
	const memberRows = (): Row[] => {
		const rows: Row[] = [{ name: ownerName, id: ownerId, email: ownerEmail, role: 'owner', added: projectStart }];
		if (!customerIsOwner && topic.id !== 'confirm') rows.push({ name: full, id: uid, email, role: 'member', added: between(projectStart, open - 1440) });
		if (!ownerIsColleague && topic.id !== 'notFound' && !(topic.id === 'remove' && pathIndex === 2)) rows.push({ name: values.colleagueFull!, id: cuid, email: colleagueEmail, role: colleagueRole, added: topic.id === 'role' ? eventMin : between(projectStart, open - 1440) });
		rows.push(...extras);
		if (topic.id === 'role' && pathIndex === 1) for (const extra of extras.slice(0, Number(values.n) - 1)) Object.assign(extra, { role: 'viewer', added: eventMin });
		return rows;
	};
	const membersTable = (rows: Row[]) =>
		[`Members of ${project} (${prj}), from the admin console:`, '', head('User', 'Name', 'Email', 'Role', 'Added'), ...rows.map((row) => `| ${row.id} | ${row.name} | ${row.email} | ${row.role} | ${row.addedMs !== undefined ? utc(row.added, row.addedMs).replace('T', ' ').slice(0, 19) : shortDate(at(row.added))} |`)].join('\n');
	const dupRows = (): Row[] => {
		const rows = memberRows();
		const target = rows[1]!;
		target.added = eventMin;
		target.addedMs = int(r, 0, 59) * 1000;
		const firstRole = pathIndex === 2 ? 'viewer' : roleKept === 'a viewer' ? 'viewer' : 'member';
		target.role = firstRole;
		const gapMs = pathIndex === 2 ? Number(values.hours) * 3600000 : Number(values.gap) * 1000;
		rows.splice(2, 0, { ...target, role: pathIndex === 2 ? 'member' : firstRole, addedMs: target.addedMs + gapMs });
		return rows;
	};
	const mainVisibility = topic.id === 'remove' ? 'team' : topic.id === 'public' ? 'public' : visibilityOf(project);
	const workspaceBlock = () => {
		const names = [project, project2, project3, ...shuffledProjects.slice(3, int(r, 3, 6))];
		const rows = names.map((name, i) => `| ${name} | ${projectId(name)} | ${ownerOf(name).join(' ')} | ${i === 0 ? memberRows().length : sizeOf(name)} | ${i === 0 ? mainVisibility : visibilityOf(name)} |`);
		const since = at(-(200 + (hash(org + 'plan') % 700)) * 1440);
		return [`Workspace: ${org}, team plan since ${monthNames[since.getUTCMonth()]} ${since.getUTCFullYear()}, ${N} people, billing contact ${values.directorFull}.`, '', head('Project', 'Id', 'Owner', 'Members', 'Visibility'), ...rows].join('\n');
	};
	const activityBlock = () => {
		const lines: string[] = [];
		const line = (m: number, text: string) => lines.push(`${dayMonth(m)} ${clock(m)}  ${text}`);
		const action = () => {
			const where = pick(r, [project, project, project2]);
			const card = pick(r, cardNames);
			return pick(r, [`moved “${card}” to ${pick(r, columns)} on ${where}`, `commented on “${card}” in ${where}`, `created “${card}” in ${where}`, `attached a file to “${card}” in ${where}`, `opened ${where}`]);
		};
		if (topic.id === 'lostPhone') for (let i = int(r, 2, 4), m = Math.min(open - 5, eventMin + int(r, 30, 300)); i > 0; i--, m -= int(r, 3, 200)) line(m, 'sign-in refused: password accepted, authenticator code not accepted');
		const session = Array.from({ length: int(r, 1, 3) }, () => int(r, 2, 70)).sort((a, b) => b - a);
		if (topic.id === 'notOwner') line(lastSeenMin + session[0]! + int(r, 1, 9), `tried to add a member to ${project}: refused, only the owner can add members`);
		for (const offset of session) line(lastSeenMin + offset, action());
		line(lastSeenMin, `signed in (${pick(r, browsers)})`);
		for (let i = int(r, 4, 8), m = lastSeenMin; i > 0; i--) {
			m = daytime(m - int(r, 40, 1800));
			line(m, r() < 0.3 ? `signed in (${pick(r, browsers)})` : action());
		}
		return ['Recent activity on the account:', '', fence(lines)].join('\n');
	};
	/** What support pastes about the customer when it looks into a ticket. */
	const contextPastes = (already: Paste | undefined) => {
		const out: string[] = [];
		if (already !== 'account' && already !== 'typoAccount' && topic.id !== 'confirm' && r() < 0.7) out.push(`${pick(r, ['Account:', 'The customer’s account:', 'Account lookup:'])}\n\n${accountBlock('self')}`);
		if (topic.id !== 'confirm' && topic.id !== 'erase' && r() < 0.55) out.push(activityBlock());
		if (topic.id !== 'confirm' && r() < 0.55) out.push(workspaceBlock());
		return out;
	};
	const settingsJson = (visibility: string, defaultRole?: string) => `"settings": { "visibility": "${visibility}"${defaultRole ? `, "defaultRole": "${defaultRole}"` : ''} }`;
	const projectJson = () => {
		const visibility = mainVisibility;
		const defaultRole = after060 ? (topic.id === 'defaultRole' ? 'viewer' : pick(r, ['member', 'member', 'viewer'])) : undefined;
		const rows = memberRows();
		return [
			`${pick(r, ['From the admin console', 'The project as the API returns it', 'GET on the project, as the API returns it'])}:`,
			'',
			'```json',
			'{',
			`  "id": "${prj}",`,
			`  "slug": "${slugify(project)}",`,
			`  "name": "${project}",`,
			`  "ownerId": "${ownerId}",`,
			`  ${settingsJson(visibility, defaultRole)},`,
			'  "members": [',
			rows.map((row) => `    { "userId": "${row.id}", "role": "${row.role}", "addedAt": "${utc(row.added, int(r, 0, 86399999) % 3600000)}" }`).join(',\n'),
			'  ]',
			'}',
			'```'
		].join('\n');
	};
	const accountBlock = (who: 'self' | 'typo' | 'colleague') => {
		const enrolled = topic.id === 'lostPhone' || (who === 'self' && topic.id !== 'confirm' && r() < 0.35);
		const owns = kind.projects.filter((name) => ownerOf(name).join(' ') === full).map((name) => `${name} (${projectId(name)})`).join(', ') || 'none';
		const confirmed = who === 'typo' || (topic.id === 'confirm' && pathIndex === 2) ? 'not confirmed' : 'confirmed';
		const lines = [
			`User:           ${who === 'colleague' ? cuid : uid}`,
			`Name:           ${who === 'colleague' ? values.colleagueFull : full}`,
			`Email:          ${who === 'colleague' ? personalEmail : who === 'typo' ? typoSelf : email} (${confirmed})`,
			`Second factor:  ${enrolled ? `enrolled ${shortDate(at(enrolledMin))}` : 'not enrolled'}`,
			`Signed up:      ${who === 'typo' || topic.id === 'confirm' ? shortDate(at(eventMin)) : shortDate(at(signupMin))}`,
			`Last sign-in:   ${who === 'typo' || topic.id === 'confirm' ? 'never' : who === 'colleague' ? shortDate(at(signupMin + int(r, 1, 20) * 1440)) : `${shortDate(at(lastSeenMin))}, ${clock(lastSeenMin)}`}`,
			`Owns:           ${who === 'colleague' || topic.id === 'confirm' ? 'none' : owns}`,
			`Member of:      ${who === 'colleague' || topic.id === 'confirm' ? 'none' : `${project2} (${projectId(project2)}, ${pick(r, ['member', 'viewer'])})`}`
		];
		return fence(lines);
	};
	const ip = `${pick(r, ['203.0.113', '192.0.2'])}.${int(r, 10, 240)}`;
	const logLine = (minutes: number, ms: number, method: string, pathText: string, status: number, extra = '') =>
		`${utc(minutes, ms)}  ${method.padEnd(7)}${pathText.padEnd(34)}${String(status).padEnd(5)}${String(int(r, 3, 90)).padStart(3)} ms  key=${prefix}  ip=${ip}${extra}`;
	/** Log lines for the customer's key; with `dupAt`, the two adds of the same member start at that line. */
	const apiLog = (from: number, count: number, dupAt = -1) => {
		const lines: string[] = [];
		let ms = int(r, 0, 59000);
		for (let i = 0; i < count; i++) {
			ms += dupAt >= 0 && i === dupAt + 1 ? Number(values.gap) * 1000 : int(r, 800, 240000);
			lines.push(dupAt >= 0 && (i === dupAt || i === dupAt + 1) ? logLine(from, ms, 'POST', `/projects/${prj}/members`, 201, `  user=${cuid}`) : logLine(from, ms, 'GET', `/projects/${prj}${pick(r, ['', '/members', '/webhooks'])}`, 200));
		}
		return fence(lines);
	};
	// The delivery the customer saw: when each attempt started and how long it took, the same in our log and theirs.
	const firstDelivery = int(r, 60000, 900000);
	const tookFor = Array.from({ length: 5 }, () => (pathIndex === 1 ? int(r, 20, 90) : int(r, 1900, 2300)));
	const attemptAt = tookFor.map((_, k) => firstDelivery + tookFor.slice(0, k).reduce((sum, took, j) => sum + took + 500 * 2 ** j, 0));
	const deliveries = () => {
		const lines: string[] = [];
		const ok = topic.id === 'retries' && pathIndex === 2;
		const status = pathIndex === 1 ? 503 : 500;
		for (let e = 0, ms = firstDelivery, events = ok ? int(r, 4, 9) : int(r, 1, 3); e < events; e++, ms += int(r, 60000, 900000)) {
			if (ok) {
				lines.push(`${values.whk}  member.added  ${utc(eventMin, ms)}  attempt 1/5  status 200  ${int(r, 40, 400)} ms`);
				continue;
			}
			for (let attempt = 1, at = ms; attempt <= 5; attempt++) {
				const took = e === 0 ? tookFor[attempt - 1]! : pathIndex === 1 ? int(r, 20, 90) : int(r, 1900, 2300);
				lines.push(`${values.whk}  member.added  ${utc(eventMin, at)}  attempt ${attempt}/5  status ${status}  ${took} ms${attempt > 1 ? `  (after ${500 * 2 ** (attempt - 2)} ms)` : ''}`);
				at += took + 500 * 2 ** (attempt - 1);
			}
			lines.push(`${values.whk}  member.added  result: not delivered after 5 attempts, last status ${status}`);
		}
		return [`Delivery log for ${values.whk} (${hookUrl}):`, '', fence(lines)].join('\n');
	};
	const deliveriesFailed = () => {
		const lines: string[] = [];
		let ms = int(r, 0, 59000);
		const reason = pathIndex === 0 ? 'no answer: connect timeout after 10000 ms' : pathIndex === 1 ? `TLS error: certificate has expired (CN=${hookHost})` : `network error: getaddrinfo ENOTFOUND ${typoHost}`;
		const target = pathIndex === 2 ? `https://${typoHost}${hookPath}` : hookUrl;
		for (let e = 0; e < int(r, 1, 2); e++) {
			ms += int(r, 120000, 7200000);
			let at = ms;
			const event = pick(r, ['member.added', 'project.updated']);
			for (let attempt = 1; attempt <= 5; attempt++) {
				lines.push(`${values.whk}  ${event}  ${utc(eventMin, at)}  attempt ${attempt}/5  ${reason}`);
				at += (pathIndex === 0 ? 10000 : int(r, 30, 200)) + 500 * 2 ** (attempt - 1);
			}
			lines.push(`${values.whk}  result: not delivered after 5 attempts, no status`);
		}
		return [`Delivery log for ${values.whk} (${target}):`, '', fence(lines)].join('\n');
	};
	const receiverLog = () => {
		const lines: string[] = [];
		const status = pathIndex === 1 ? 503 : pathIndex === 2 ? 200 : 500;
		for (let attempt = 1, ms = firstDelivery; attempt <= 5; attempt++) {
			const from = pathIndex === 2 ? `10.20.${int(r, 0, 9)}.${int(r, 2, 250)}` : pick(r, fernhillIps);
			if (pathIndex !== 2) ms = attemptAt[attempt - 1]! + int(r, 5, 40);
			const stamp = new Date(EPOCH + eventMin * 60000 + ms);
			lines.push(`${from} - - [${pad(stamp.getUTCDate())}/${monthNames[stamp.getUTCMonth()]!.slice(0, 3)}/${stamp.getUTCFullYear()}:${stamp.toISOString().slice(11, 19)} ${eventMin < BST_ENDS ? '+0100' : '+0000'}] "POST ${hookPath} HTTP/1.1" ${status} ${int(r, 2, 80)} "-" "Trellis-Webhooks"`);
			ms += int(r, 5, 60);
		}
		return fence(lines);
	};
	const formBody = () => {
		const body = `event=member.added&projectId=${prj}&userId=${cuid}&role=member`;
		const node = r() < 0.5;
		const stamp = `${iso(eventMin)} ${clock(eventMin)}:${pad(int(r, 0, 59))}`;
		return fence([
			`[${stamp}] POST ${hookPath} content-type=application/x-www-form-urlencoded length=${body.length}`,
			`[${stamp}] body: ${body}`,
			...(node
				? [`SyntaxError: Unexpected token 'e', "${body.slice(0, 10)}"... is not valid JSON`, '    at JSON.parse (<anonymous>)', `    at handleTrellis (/srv/app/routes/${pick(r, ['hooks', 'trellis', 'webhooks'])}.js:${int(r, 12, 60)}:${int(r, 10, 30)})`, '    at Layer.handle (/srv/app/node_modules/express/lib/router/layer.js:95:5)']
				: ['Traceback (most recent call last):', `  File "/opt/app/hooks/trellis.py", line ${int(r, 14, 80)}, in receive`, '    data = json.loads(request.body)', '  File "/usr/lib/python3.12/json/__init__.py", line 346, in loads', '    return _default_decoder.decode(s)', 'json.decoder.JSONDecodeError: Expecting value: line 1 column 1 (char 0)'])
		]);
	};
	const webhookList = () => {
		const hooks: string[][] = [];
		const created = (days: number) => shortDate(at(open - days * 1440));
		const staging = `https://staging.${domain}${hookPath}`;
		if (topic.id === 'formPayload') {
			hooks.push([values.whk2!, `https://old-${hookHost.split('.').slice(1).join('.')}${hookPath}`, 'member.added', 'json', created(int(r, 60, 300))]);
			hooks.push([values.whk!, hookUrl, 'member.added', 'form', values.date!]);
		} else {
			const first = topic.id === 'deleteHook' && pathIndex === 0 ? staging : topic.id === 'deliveryFails' && pathIndex === 2 ? values.typoUrl! : hookUrl;
			hooks.push([values.whk!, first, pick(r, ['member.added', 'member.added, project.updated']), 'json', topic.id === 'deliveryFails' && pathIndex === 2 ? values.date! : created(int(r, 30, 300))]);
			hooks.push([values.whk2!, topic.id === 'deleteHook' && pathIndex === 0 ? `https://staging.${domain}/old${hookPath}` : staging, 'member.added', 'json', created(int(r, 20, 200))]);
			hooks.push([`whk_${whkNumber + int(r, 30, 600)}`, topic.id === 'deleteHook' && pathIndex === 0 ? hookUrl : `https://${domain.split('.')[0]}.example${hookPath}`, 'project.updated', 'json', created(int(r, 5, 60))]);
		}
		const columns = after060 ? head('Webhook', 'URL', 'Events', 'Payload', 'Created') : head('Webhook', 'URL', 'Events', 'Created');
		return [`Webhooks on ${prj}, from the admin console:`, '', columns, ...hooks.map((h) => `| ${(after060 ? h : [h[0], h[1], h[2], h[4]]).join(' | ')} |`)].join('\n');
	};
	const keyTable = () =>
		[
			`API keys on ${prj}, from the admin console (secrets are never shown here):`,
			'',
			'| Key | Name | Prefix | Created | Last used |',
			'| --- | --- | --- | --- | --- |',
			...keyList.map((key, i) => `| ${key.id} | ${key.name} | ${key.prefix} | ${longDate(at(key.created))} | ${i === 0 && topic.id === 'unknownKey' && pathIndex === 2 ? 'removed' : `${dayMonth(open - int(r, 0, 30) * 1440)}, ${pad(int(r, 0, 23))}:${pad(int(r, 0, 59))}`} |`)
		].join('\n');
	const webhookCurl = () =>
		[
			'```text',
			`$ curl -s -X POST https://api.trellis.example/projects/${prj}/webhooks \\`,
			'    -H "Authorization: Bearer $TRELLIS_KEY" -H "Content-Type: application/json" \\',
			`    -d '{"url":"${hookUrl}","events":["${pick(r, ['task.created', 'member.removed', 'card.moved', 'task.updated'])}"]}'`,
			'{"error":"events must be among project.updated, member.added"}',
			'```'
		].join('\n');
	const keysJson = () =>
		[
			'```json',
			'[',
			(topic.id === 'listSecrets' && pathIndex === 1 ? keyList.slice(0, 1) : keyList).map((key) => `  {\n    "id": "${key.id}",\n    "projectId": "${prj}",\n    "name": "${key.name}",\n    "secret": "${key.prefix}••••••••••••••••••••••••••••••••",\n    "prefix": "${key.prefix}",\n    "createdAt": "${utc(key.created, int(r, 0, 59999))}"\n  }`).join(',\n'),
			']',
			'```'
		].join('\n');
	const stack401 = () =>
		r() < 0.5
			? fence(['Traceback (most recent call last):', `  File "/opt/${pick(r, ['sync', 'trellis-sync', 'integrations'])}/run.py", line ${int(r, 20, 90)}, in <module>`, '    resp.raise_for_status()', `requests.exceptions.HTTPError: 401 Client Error: Unauthorized for url: https://api.trellis.example/projects/${prj}`, `response body: {"error":"unknown API key"}`])
			: fence([`Error: Trellis request failed: 401 {"error":"unknown API key"}`, `    at request (/srv/sync/trellis.js:${int(r, 20, 80)}:11)`, '    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)', `    at async syncProject (/srv/sync/index.js:${int(r, 10, 60)}:19)`]);
	/** Mail worker lines are in UK time. */
	const mailLine = (minutes: number, ms: number, state: string, to: string, extra: string) => `${new Date(EPOCH + minutes * 60000 + ms).toISOString().replace('T', ' ').slice(0, 19)}  ${state.padEnd(8)} to=${to}  ${extra}`;
	const mail = (kindOfMail: 'sent' | 'bounce' | 'late') => {
		const lines: string[] = [];
		const subject = topic.id === 'confirm' ? 'subject="Confirm your email address for Trellis"' : `subject="You were added to ${project}"`;
		const to = topic.id === 'confirm' ? email : kindOfMail === 'bounce' ? wrongEmail : colleagueEmail;
		const times = topic.id === 'confirm' ? int(r, 2, 4) : 1;
		let ms = int(r, 0, 50000);
		for (let i = 0; i < times; i++) {
			const base = kindOfMail === 'late' ? startOfDay(eventMin) + 10 * 60 + int(r, 45, 160) : eventMin;
			lines.push(mailLine(base, ms, 'queued', to, subject));
			if (kindOfMail === 'bounce') lines.push(mailLine(base, ms + int(r, 2000, 9000), 'bounced', to, `remote=${domain} 550 5.1.1 mailbox unavailable`));
			else if (kindOfMail === 'late') lines.push(mailLine(startOfDay(eventMin) + 13 * 60 + int(r, 12, 40), int(r, 0, 59000), 'sent', to, `remote=${domain} 250 2.0.0 OK`));
			else lines.push(mailLine(base, ms + int(r, 1500, 6000), 'sent', to, `remote=${domain} 250 2.0.0 OK queued as ${hex(r, 10).toUpperCase()}`));
			ms += int(r, 600000, 7200000);
		}
		if (kindOfMail === 'late') {
			const base = startOfDay(eventMin) + 10 * 60 + int(r, 45, 160);
			lines.push(mailLine(base, int(r, 0, 59000), 'queued', colleague2Email, `subject="You were added to ${project}"`));
			lines.push(mailLine(startOfDay(eventMin) + 13 * 60 + int(r, 12, 40), int(r, 0, 59000), 'sent', colleague2Email, `remote=${domain} 250 2.0.0 OK`));
		}
		return ['Mail log:', '', fence(lines)].join('\n');
	};
	const slugTable = () => {
		const names = shuffle(r, [oddName, project, project2, project3, ...(r() < 0.5 ? [pick(r, oddNames.filter((name) => name !== oddName))] : [])]);
		return [head('Project', 'Address'), ...names.map((name) => `| ${name} | app.trellis.example/p/${slugify(name)} |`)].join('\n');
	};
	const csvRows = () => {
		const rows = ['job_ref,client,name,owner_email,start'];
		const blanks = Number(values.n);
		const total = blanks + int(r, 4, 9);
		const blankAt = new Set(shuffle(r, Array.from({ length: total }, (_, i) => i)).slice(0, blanks));
		for (let i = 0; i < total; i++) {
			const client = pick(r, ['Halden Ltd', 'Morrow & Sons', 'Quayside Trust', 'Pinecrest Homes', 'Ardent Media', 'Bexley Foods', 'Corvid Labs', 'Stanhope Group']);
			rows.push(`J-${int(r, 20400, 20999)},${client},${blankAt.has(i) ? '"' + ' '.repeat(int(r, 1, 4)) + '"' : `${client.split(' ')[0]} ${pick(r, ['refit', 'campaign', 'survey', 'launch', 'audit', 'retainer'])}`},${email},${iso(open + int(r, 1, 30) * 1440)}`);
		}
		return fence(rows);
	};
	const blankLog = () => {
		const rows = [head('Created (UTC)', 'Project', 'Name', 'Slug')];
		const night = startOfDay(open) + 2 * 60;
		for (let i = 0, ms = int(r, 0, 9000); i < Number(values.n); i++, ms += int(r, 900, 40000)) {
			const spaces = ' '.repeat(int(r, 1, 4));
			rows.push(`| ${utc(night, ms).slice(0, 19)} | prj_${40100 + int(r, 0, 9799)} | "${spaces}" | ${slugify(spaces)} |`);
		}
		return [`Projects created by key ${prefix} last night with a blank name:`, '', ...rows].join('\n');
	};
	const settingsAudit = () => {
		const rows = [head('Time (UTC)', 'Changed by', 'Change')];
		let t = projectStart + 3 * 1440;
		const changes = int(r, 1, 3);
		for (let i = changes; i > 0; i--) {
			t = between(t, eventMin - 1440);
			rows.push(`| ${utc(t, int(r, 0, 86399999) % 3600000).slice(0, 16)} | ${pick(r, ['owner session', `key ${prefix}`])} | visibility: ${i % 2 === 1 ? 'private → team' : 'team → private'} |`);
		}
		rows.push(`| ${utc(eventMin).slice(0, 16)} | key ${prefix} (“${keyName}”) | visibility: team → team; defaultRole: member → viewer |`);
		return [`Settings changes on ${prj}:`, '', ...rows].join('\n');
	};
	/** Requests the API refused: 401 for a key it does not know, 405 for a method it does not accept. */
	const refusedLog = (status: 401 | 405) => {
		const lines: string[] = [];
		const method = pathIndex === 0 ? 'OPTIONS' : 'PURGE';
		for (let i = int(r, 6, 13), ms = int(r, 0, 59000); i > 0; i--) {
			ms += int(r, 20000, 600000);
			const where = `/projects/${prj}${pick(r, ['', '/members', '/webhooks'])}`.padEnd(32);
			lines.push(status === 401 ? `${utc(eventMin, ms)}  ${pick(r, ['GET', 'GET', 'POST']).padEnd(8)}${where}401  unknown API key  presented=${prefix}…  length=41  ua=${pick(r, userAgents)}` : `${utc(eventMin, ms)}  ${method.padEnd(8)}${where}405  method not allowed  ${pathIndex === 0 ? `origin=https://dashboard.${domain}` : `via=${pick(r, ['varnish', 'cache-01', 'edge-cache'])}`}`);
		}
		return fence(lines);
	};
	const invoices = () => {
		const rows = [head('Invoice', 'Month', 'People', 'Amount (inc. VAT)')];
		for (let back = 3; back >= 1; back--) {
			const month = monthNames[(at(open).getUTCMonth() - back + 12) % 12]!;
			const people = back === 1 ? billed : billed - int(r, 0, 5);
			rows.push(`| TRL-${int(r, 20410, 29999)} | ${month} 2026 | ${people} | ${money(people * 6 * 1.2)} |`);
		}
		return rows.join('\n');
	};
	const consoleErrors = () =>
		[
			'```text',
			...(pathIndex === 0
				? [`Uncaught TypeError: Cannot read properties of null (reading 'children')`, `    at renderCards (board.${hex(r, 8)}.js:2:${int(r, 10000, 99999)})`, `    at HTMLDocument.<anonymous> (${pick(r, ['vault-helper', 'pw-inject', 'autofill'])}.js:1:${int(r, 100, 9999)})`]
				: [`[Violation] 'load' handler took ${int(r, 2400, 9000)}ms`, `GET https://app.trellis.example/api/boards/${prj}/cards?all=1 200 (${(int(r, 180, 420) / 10).toFixed(1)} s)`, `Board rendered ${values.cards} cards in ${int(r, 9000, 31000)} ms`]),
			'```'
		].join('\n');
	const pasteOf = (kindOfPaste: Paste | undefined): string => {
		switch (kindOfPaste) {
			case undefined:
			case 'none':
				return '';
			case 'account':
				return accountBlock('self');
			case 'typoAccount':
				return accountBlock('typo');
			case 'colleagueAccount':
				return `No user with ${colleagueEmail}. Searching by name:\n\n${accountBlock('colleague')}`;
			case 'noAccount':
				return fence([`search email "${colleagueEmail}": no user`, `search name "${cLast}": ${int(r, 2, 9)} users, none with an address at ${domain}`]);
			case 'members':
				return membersTable(memberRows());
			case 'memberList':
				return (topic.id === 'duplicate' ? dupRows() : memberRows()).map((row, i) => `${i + 1}. ${row.name}, ${row.email}, ${row.role}`).join('\n');
			case 'dupMembers':
				return membersTable(dupRows());
			case 'project':
				return projectJson();
			case 'apiLog':
				return apiLog(eventMin, int(r, 10, 22));
			case 'apiLogDup':
				return apiLog(eventMin - int(r, 2, 30), int(r, 7, 14), int(r, 1, 3));
			case 'apiLogBlank':
				return blankLog();
			case 'apiLogSettings':
				return settingsAudit();
			case 'apiLog401':
				return refusedLog(401);
			case 'apiLog405':
				return refusedLog(405);
			case 'deliveries':
				return deliveries();
			case 'deliveriesFailed':
				return deliveriesFailed();
			case 'receiverLog':
				return receiverLog();
			case 'formBody':
				return formBody();
			case 'keyTable':
				return keyTable();
			case 'webhook':
				return webhookList();
			case 'webhookCurl':
				return webhookCurl();
			case 'keys':
				return keysJson();
			case 'stack401':
				return stack401();
			case 'mailSent':
				return mail('sent');
			case 'mailBounce':
				return mail('bounce');
			case 'mailLate':
				return mail('late');
			case 'slugs':
				return slugTable();
			case 'csvRows':
				return csvRows();
			case 'invoices':
				return invoices();
			case 'console':
				return consoleErrors();
		}
	};

	// The thread.
	let t = open;
	const messages: string[] = [];
	const mName = topic.id === 'notOwner' ? values.directorFull! : values.colleague2Full!;
	const labels: Record<Who, string> = {
		c: `**${full}**`,
		m: `**${mName}** (copied in)`,
		a: `**${agent} (Fernhill support)**`,
		n: `**${agent} (Fernhill support)** · internal note`,
		e: `**${dev} (API team)** · internal note`,
		E: `**${dev} (API team)**`,
		w: `**${webber} (web team)** · internal note`,
		k: `**${acct} (accounts and security)** · internal note`,
		K: `**${acct} (accounts and security)**`,
		o: `**${ops} (operations)** · internal note`,
		b: `**${billing} (billing)** · internal note`,
		B: `**${billing} (billing)**`,
		d: `**${dataLead} (data protection)** · internal note`,
		D: `**${dataLead} (data protection)**`,
		s: '**Help desk**'
	};
	const signers: Partial<Record<Who, string>> = { a: agent, E: dev.split(' ')[0]!, K: acct.split(' ')[0]!, B: billing.split(' ')[0]!, D: dataLead.split(' ')[0]! };
	let lastFromCustomer = open;
	const say = (who: Who, body: string) => {
		if (who === 'c') lastFromCustomer = t;
		messages.push(`${labels[who]} · ${stampShort(t)}\n\n${body.trim()}`);
	};
	let held = false;
	/** Moves the clock on for the next message; false for a help desk message that would fall after the export. */
	const advance = (who: Who) => {
		const before = t;
		if (held && who !== 'a' && who !== 's') {
			t += int(r, 600, 2200);
			held = false;
		}
		if (who === 'c' || who === 'm') t = waking(r, t + int(r, 25, 1700));
		else if (who === 's') t = office(r, startOfDay(t) + 7 * 1440 + 9 * 60);
		else if (who === 'a' || signers[who]) t = office(r, t + int(r, 20, 700));
		else t = office(r, t + int(r, 6, 300));
		if (t > LAST_MESSAGE && who === 's') t = before;
		else if (t > LAST_MESSAGE) t = before + int(r, 4, 30);
		return t !== before;
	};
	const sign = topic.writer === 'dev' ? devSign : ownerSign;
	const custBody = (paragraphs: string[], opening: boolean) => {
		const parts: string[] = [];
		const fitting = (opening ? greetings : greetings.slice(0, 5)).filter((greeting) => minuteOfDay(t) < 12 * 60 || !greeting.includes('orning'));
		if (r() < 0.8) parts.push(`${pick(r, fitting)},`);
		parts.push(...paragraphs, f(opening && r() < 0.25 ? fullSign : pick(r, opening ? sign : sign.slice(0, 4))));
		if (opening && r() < 0.2) parts.push(`--\n${f(pick(r, disclaimers))}`);
		return parts.join('\n\n');
	};
	const pendingSide: string[] = [];
	const replyBody = (who: Who, paragraphs: string[], more = false) => {
		const extra = who === 'a' ? pendingSide.splice(0) : [];
		const closing = more && r() < 0.4 ? [pick(r, closings)] : [];
		const hello = [`Hi ${first},`, `Hello ${first},`, `Hi ${first},`];
		return [...(/^(Hello|Hi) /.test(paragraphs[0]!) ? [] : [pick(r, hello)]), ...paragraphs, ...extra, ...closing, fill(pick(r, agentSign), { signer: signers[who]!, desk: desks[who]! })].join('\n\n');
	};

	// 1. The customer writes in.
	const opening = [f(pick(r, path.open ? path.open.map((item) => (typeof item === 'number' ? topic.open[item]! : item)) : topic.open))];
	const leaver = topic.id === 'erase';
	if (!leaver && r() < 0.7) opening.unshift(f(pick(r, kind.intro).replace('{N}', values.N!)));
	if (r() < 0.35) opening.splice(opening.length - 1, 0, pick(r, contexts));
	if (r() < 0.9) opening.push(f(pick(r, topic.more)));
	if (triedFor[topic.id] && r() < 0.6) opening.push((topic.writer === 'dev' ? triedDev : triedOwner)[pick(r, triedFor[topic.id]!)]!);
	if (!leaver && r() < 0.45) opening.push(f(pick(r, situations)));
	if (topic.shows && r() < 0.8) {
		const intro = pick(r, ['For reference:', 'Here’s what I see:', 'Pasted below:', 'In case it helps:', 'This is what we get:']);
		opening.push(`${intro}\n\n${pasteOf(topic.shows)}`);
	}
	say('c', custBody(opening, true));

	// 2. Support asks.
	advance('a');
	const ask = f(pick(r, topic.ask));
	const ack = /^(Thanks|Sorry|Thank you|That’s|You’re|I understand)/.test(ask) ? '' : pick(r, acks);
	say('a', replyBody('a', [[ack, ask].filter(Boolean).join(' ')], true));

	// 3. The customer answers, and may raise a second matter.
	advance('c');
	const side = r() < 0.8 ? pick(r, sides) : undefined;
	const answer = [f(pick(r, path.detail)), pasteOf(path.paste)].filter(Boolean);
	if (side) {
		answer.push(f(side.q));
		pendingSide.push(f(side.a));
	}
	say('c', custBody(answer, false));

	// 4. Someone looks: support itself, or support hands over and the other team notes what it found.
	const lookWho = path.lookWho ?? 'n';
	if (lookWho !== 'n' && handovers[lookWho] && r() < 0.8) {
		advance('n');
		say('n', [pick(r, handovers[lookWho]!), ...contextPastes(undefined)].join('\n\n'));
	}
	const usual: Paste | undefined = lookWho !== 'e' || path.lookPaste ? path.lookPaste : webhookIds.has(topic.id) ? 'webhook' : keyIds.has(topic.id) ? 'keyTable' : memberTopics.includes(topic) ? pick(r, ['members', 'project'] as const) : undefined;
	advance(lookWho);
	say(lookWho, [f(pick(r, path.look)), pasteOf(usual), ...(lookWho === 'n' ? contextPastes(path.lookPaste) : [])].filter(Boolean).join('\n\n'));

	// 5. Sometimes a wait; always when the second matter would otherwise go unanswered.
	const end = pick(r, path.ends);
	const answered = end.some(([who]) => who === 'a');
	const second = shuffle(r, sides).find((other) => other !== side)!;
	const chase = () => {
		advance('c');
		const raise = answered && r() < 0.5;
		const waited = t - lastFromCustomer;
		say('c', custBody([f(pick(r, chasers.slice(0, waited > 5 * 1440 ? 6 : waited > 3 * 1440 ? 5 : 4))), ...(raise ? [f(second.q)] : [])], false));
		if (raise) pendingSide.push(f(second.a));
	};
	if ((path.team && r() < 0.65) || (pendingSide.length && !answered)) {
		advance('a');
		held = true;
		say('a', replyBody('a', [fill(pick(r, holding), { team: path.team ?? 'API team' })], true));
		if (r() < 0.5) chase();
	} else if (r() < 0.3) chase();

	// 6. The end.
	const thanks = side?.then && r() < 0.6 ? f(side.then) : '';
	end.forEach(([who, body], i) => {
		if (!advance(who)) return;
		const text = f(body);
		if (who === 'c') say('c', custBody(i === end.length - 1 && thanks ? [text, thanks] : [text], false));
		else if (who === 'm') say('m', `${text}\n\n${mName.split(' ')[0]}`);
		else if (signers[who]) say(who, replyBody(who, [text]));
		else say(who, text);
	});
	if (end.at(-1)![0] === 'c' && r() < 0.35) {
		advance('a');
		say('a', replyBody('a', [f(pick(r, closers))]));
	}
	if (path.happy && r() < 0.45 && advance('s')) {
		const [rating, comment] = pick(r, surveys);
		say('s', `Satisfaction survey answered: ${rating}.${comment ? ` “${f(comment)}”` : ''}`);
	}

	const subject = pick(r, topic.subjects);
	const channel = r() < 0.7 ? 'by email' : 'through the help form in Trellis';
	return [`# Ticket ${number}: ${subject}`, `From ${full} <${email}>, ${org} · ${stampLong(open)} · ${channel}`, ...messages.map((message) => `---\n\n${message}`)].join('\n\n') + '\n';
};

// Which topic and path each ticket follows: topics are dealt in rounds, each round in a new order, and the paths of
// a topic in turn, so that two tickets on one topic end differently until its paths run out.
const order = mulberry32(20261005);
const plans: Plan[] = [];
const used = new Map<Topic, number>();
const deck: Topic[] = [];
for (let index = 0; index < ITEMS; index++) {
	const open = workdays[Math.floor((index * workdays.length) / ITEMS)]!;
	const allowed = (topic: Topic) => !topic.since || open + 20 * 60 >= topic.since;
	if (!deck.some(allowed)) deck.push(...shuffle(order, topics));
	const topic = deck.splice(deck.findIndex(allowed), 1)[0]!;
	const seen = used.get(topic) ?? 0;
	used.set(topic, seen + 1);
	const pathIndex = (seen + topics.indexOf(topic)) % topic.paths.length;
	plans.push({ topic, path: topic.paths[pathIndex]!, pathIndex, open });
}

const folder = join(root, 'docs', 'support-tickets');
mkdirSync(folder, { recursive: true });
let number = 7310;
plans.forEach((plan, index) => {
	number += int(order, 3, 17);
	writeFileSync(join(folder, `ticket-${number}.md`), ticket(index, plan, number));
});
writeFileSync(
	join(folder, 'README.md'),
	`# Tickets sent to the API team, 5 October to 13 November 2026\n\nEvery ticket the support desk sent to the API team's queue in these six weeks, ${ITEMS} in all, one file each,\nexported from the old help desk before the move. Support sent anything that looked as if it might involve\nprojects, members, webhooks, API keys or signing in, so some turned out to belong to other teams. The export kept\nthe messages and internal notes but not the tags, statuses or assignees. Numbers missing from the sequence are\ntickets that stayed with support. Log, account and console extracts are as people pasted them.\n`
);
