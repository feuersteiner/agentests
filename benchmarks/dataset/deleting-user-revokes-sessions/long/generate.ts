// Writes the long material of this entry's long tasks: the tickets of Larchwood's shared support inbox opened in
// September and October 2026, one Markdown file each, under docs/support/tickets/. Deterministic: fixed seeds, no
// clock, no network.
//   bun long/generate.ts <workspace root>
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** How many tickets to write. Dates, ticket numbers and the folder's README all follow from it. */
const ITEMS = 410;

const root = process.argv[2];
if (!root) throw new Error('Usage: bun long/generate.ts <dir>');

const mulberry32 = (seed: number) => () => {
	seed = (seed + 0x6d2b79f5) | 0;
	let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
	t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
type Rand = () => number;
type Values = Record<string, string>;
const int = (r: Rand, low: number, high: number) => low + Math.floor(r() * (high - low + 1));
const pick = <T>(r: Rand, items: readonly T[]): T => items[Math.floor(r() * items.length)]!;
const weighted = <T>(r: Rand, items: readonly (readonly [T, number])[]): T => {
	let roll = r() * items.reduce((sum, [, weight]) => sum + weight, 0);
	for (const [item, weight] of items) if ((roll -= weight) < 0) return item;
	return items[items.length - 1]![0];
};
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
const hex = (r: Rand, length: number) => Array.from({ length }, () => '0123456789abcdef'[Math.floor(r() * 16)]).join('');
const uuid = (r: Rand) => `${hex(r, 8)}-${hex(r, 4)}-4${hex(r, 3)}-${pick(r, ['8', '9', 'a', 'b'])}${hex(r, 3)}-${hex(r, 12)}`;
const money = (pounds: number) => `£${pounds.toFixed(2).replace(/\B(?=(\d{3})+\.)/g, ',')}`;
const slug = (text: string) => text.toLowerCase().replace(/[^a-z]/g, '');
/** Resolves [[one|other]] to one of its options, then {slot} to its value. */
const fill = (r: Rand, text: string, v: Values) =>
	text.replace(/\[\[([^\]]*)\]\]/g, (_, options: string) => pick(r, options.split('|'))).replace(/\{(\w+)\}/g, (whole, key: string) => v[key] ?? whole);

// Time is counted in minutes from 00:00 on 1 September 2026, a Tuesday.
const BASE = Date.UTC(2026, 8, 1);
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const dateOf = (t: number) => new Date(BASE + t * 60_000);
const weekday = (t: number) => dateOf(t).getUTCDay();
const clock = (t: number) => `${pad(dateOf(t).getUTCHours())}:${pad(dateOf(t).getUTCMinutes())}`;
const dayMonth = (t: number) => `${dateOf(t).getUTCDate()} ${MONTHS[dateOf(t).getUTCMonth()]}`;
const fullDate = (t: number) => `${WEEKDAYS[weekday(t)]} ${dayMonth(t)} ${dateOf(t).getUTCFullYear()}`;
const isoAt = (t: number, r: Rand) => `${dateOf(t).toISOString().slice(0, 17)}${pad(int(r, 0, 59))}.${String(int(r, 0, 999)).padStart(3, '0')}Z`;
const httpDate = (t: number) => {
	const d = dateOf(t);
	return `${WEEKDAYS[d.getUTCDay()]!.slice(0, 3)}, ${pad(d.getUTCDate())} ${MONTHS[d.getUTCMonth()]!.slice(0, 3)} 2026 ${clock(t)}:${pad(d.getUTCSeconds())} GMT`;
};
// The days tickets are opened on: the working days of September and October.
const workdays: number[] = [];
for (let day = 0; day < 61; day++) if (weekday(day * 1440) % 6 !== 0) workdays.push(day);

// People and places.
const agents = ['Noor', 'Felix', 'Hana', 'Marco', 'Ines'];
const engineers = ['Tomasz', 'Priyanka', 'Owen'];
const firstNames = ['Marta', 'Gareth', 'Aisha', 'Tom', 'Wiebke', 'Ravi', 'Siân', 'Colm', 'Precious', 'Jonas', 'Leilani', 'Hugo', 'Ngozi', 'Patrick', 'Yuki', 'Bethan', 'Darius', 'Emeka', 'Freya', 'Kasia', 'Luis', 'Maeve', 'Olu', 'Rosa', 'Sami', 'Tess', 'Viktor', 'Zainab', 'Annika', 'Ben', 'Clara', 'Dmitri', 'Esme', 'Farid', 'Grace', 'Ishaan', 'Jude', 'Lotte', 'Mikael', 'Priya'];
const colleagues = ['Rhiannon', 'Leah', 'Chloe', 'Imogen', 'Bea', 'Anjali', 'Nadia', 'Hattie', 'Sofie', 'Ama'];
const surnames = ['Kowalczyk', 'Pryce', 'Rahman', 'Delaney', 'Brandt', 'Menon', 'Hughes', 'Ó Briain', 'Adeyemi', 'Lindgren', 'Kealoha', 'Marchand', 'Okafor', 'Fitzgerald', 'Sato', 'Morgan', 'Farahani', 'Nwosu', 'Calder', 'Wiśniewska', 'Ortega', 'Gallagher', 'Bankole', 'Ferreira', 'Haddad', 'Whitcombe', 'Novak', 'Malik', 'Berg', 'Achterberg'];
const companies = ['Fernhill Studio', 'Northgate Joinery', 'Brightwater Primary', 'Kestrel Physio', 'Saltmarsh Brewing', 'Oakleaf Architects', 'Harbour Lights Theatre', 'Copperpot Catering', 'Wayfarer Travel', 'Bramble & Finch', 'Little Acorns Nursery', 'Tidewell Surveyors', 'Riverbend Vets', 'Cobalt Digital', 'Greenway Landscapes', 'Ashby Accountancy', 'Larkspur Events', 'Moorland Rescue', 'Thistle Dental', 'Quayside Books', 'Elm Street Bakery', 'Highfield Cycling Club', 'Marlow & Daughters', 'Sparrowhawk Films', 'Foxglove Florists', 'Ironbridge Engineering', 'Silverline Translation', 'Meadowsweet Care', 'Tern Software', 'Hollow Oak Games', 'Calder Housing Co-op', 'Drumlin Cartography', 'Juniper Yoga', 'Corrib Marine', 'Ravenscroft Academy', 'Willowmere Farm Shop', 'Pellucid Labs', 'Granary Wharf Dental', 'Bluebell Cleaning', 'Stonecrop Gardens'];
const domainOf = (company: string) => `${company.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.test`;
const roles = ['Office manager', 'Operations lead', 'Project manager', 'Director', 'IT administrator', 'Studio manager', 'Head of year', 'Practice manager', 'Coordinator', 'Founder', 'Team lead', 'Finance officer'];
const boardTitles = ['Spring campaign', 'Website relaunch', 'Q4 hiring', 'Kitchen refit', 'Client: Northgate', 'Year 9 projects', 'Grant application', 'Wedding season 2027', 'Podcast episodes', 'Volunteer rota', 'Newsletter', 'Shop floor jobs', 'Onboarding checklist', 'Bug triage', 'Menu changes', 'Field trips', 'Product photos', 'Conference talks', 'Christmas fair', 'Office move', 'Sprint 14', 'Weekly jobs', 'Client: Ashdown', 'Supplier orders', 'Open day', 'Maintenance', 'Social media', 'Course planning'];
const projects = ['spring fair', 'office move', 'website relaunch', 'Year 10 exam timetable', 'grant application', 'new menu launch', 'volunteer rota', 'product photography', 'summer festival', 'warehouse refit', 'membership drive', 'autumn term planning'];
const keyLabels = ['Reporting sheet', 'CRM sync', 'Zapier', 'Board backup script', 'Sprint report', 'Dashboard', 'Invoice tool', 'Weekly digest'];
const browsers = ['Chrome 141', 'Firefox 144', 'Safari 26', 'Edge 141', 'Chrome 140'];
const devices = ['a Windows laptop', 'a MacBook Air', 'an office desktop running Windows 11', 'an iPad', 'a Chromebook', 'a Linux laptop'];
const languages = ['Python', 'PowerShell', 'Node.js', 'Google Apps Script', 'bash and curl'];

type Area = 'web' | 'api' | 'apifail' | 'account' | 'sso' | 'billing' | 'general' | 'none';
type Outcome = 'solved' | 'eng' | 'wish' | 'wait';
type Art = (r: Rand, v: Values, outcome: Outcome) => string;
interface Topic {
	area: Area;
	weight: number;
	plan?: 'Free' | 'Team' | 'Business';
	subjects: string[];
	open: string[];
	/** More about the customer's situation, for the opening message. */
	details: string[];
	/** Exchanges in order, [customer, support]; the first customer line joins the opening message. */
	turns: [string, string][];
	/** The turn whose support line asks the customer for something, and that thing as a noun phrase. */
	waitAfter?: number;
	ask?: string;
	/** Support's answer that settles it ('' when the customer settles it), and the customer's confirmation. */
	solved?: [string, string];
	/** What support found, and what engineering is asked to do, as "asking them to ...". */
	eng?: [string, string];
	/** Why it cannot be done today, and the feature asked for, as "a request for ...". */
	wish?: [string, string];
	/** The customer's line before a feature request, and the last turn it follows. */
	wishLead?: string;
	wishAfter?: number;
	/** Whether a fix on the customer's side can wear off, so that the ticket can come back. */
	recurs?: boolean;
	/** The matter as a side question in another ticket: the question and its answer, then a follow-up and its answer. */
	quick: [string, string];
	side: [string, string];
	/** Background support gives in its first reply. */
	explain: string;
	art?: { by: 'customer' | 'note' | 'solved'; turn: number; make: Art };
	/** Whether support goes away to act after the last exchange, so that the answer comes in a later message. */
	pause?: boolean;
	/** Whether the customer has no account yet, so that questions about using Larchwood do not fit. */
	newcomer?: boolean;
	/** The request and status that stand out in the account's activity log, if any, and what the log shows as its client. */
	fail?: string;
	failClient?: string;
}

const fence = (lines: string[], language = 'text') => ['```' + language, ...lines, '```'].join('\n');
const userJson = (r: Rand, v: Values, extra: Record<string, unknown> = {}) =>
	JSON.stringify({ id: v.userId, email: v.email, displayName: v.shownName, role: 'member', anonymous: false, createdAt: v.createdIso, ...extra }, null, 2);
const otherUser = (r: Rand, v: Values) => {
	const first = pick(r, firstNames);
	return JSON.stringify({ id: `usr_${uuid(r)}`, email: `${slug(first)}@${v.domain}`, displayName: first, role: 'member', anonymous: false, createdAt: `${int(r, 2024, 2026)}-0${int(r, 1, 8)}-${pad(int(r, 1, 28))}T${pad(int(r, 8, 18))}:${pad(int(r, 0, 59))}:00.000Z` }, null, 2);
};

/** A support agent's search in the back office, as pasted into a note; the first try is often in the wrong case. */
const lookupArt: Art = (r, v) => {
	const lines: string[] = [];
	const surname = v.last!.split(' ').pop()!;
	if (r() < 0.6) {
		lines.push(`Back office search for ${v.name}:`, '', fence([`GET /admin/users?q=${surname.toLowerCase()}`, '[]', '', `GET /admin/users?q=${surname}`, '[', userJson(r, v).replace(/^/gm, '  '), ']']));
		lines.push('', pick(r, ['Only found with the capital letter, as usual.', 'Lower case found nothing again; the capital worked.', 'Had to search twice.', '']));
	} else {
		const list = [userJson(r, v)];
		for (let i = int(r, 1, 3); i > 0; i--) list.push(otherUser(r, v));
		lines.push(`Everyone at ${v.co} in the back office:`, '', fence([`GET /admin/users?q=${v.domain}`, '[', shuffle(r, list).join(',\n').replace(/^/gm, '  '), ']']));
	}
	if (r() < 0.3) lines.push('', fence([`GET /admin/users/${v.userId}`, userJson(r, v, { boards: Number(v.n), apiKeys: int(r, 0, 1) })]));
	return lines.join('\n');
};

/** The account's recent requests, or its billing history, as support pastes it into a note. */
const activity = (r: Rand, v: Values, topic: Topic, t: number): string => {
	if (topic.area === 'billing') {
		const rows = ['| Invoice | Date | Plan | Amount | Paid |', '| --- | --- | --- | ---: | --- |'];
		const price = v.plan === 'Business' ? 12 : 6;
		for (let month = 9 - int(r, 5, 8); month <= 9; month++) rows.push(`| LW-2026-${int(r, 10000, 19999)} | 1 ${MONTHS[month - 1]} 2026 | ${v.plan}, ${v.seats} seats | ${money(Number(v.seats) * price * 1.2)} | ${pick(r, ['card', 'card', 'card', 'bank transfer'])}, ${int(r, 1, 6)} ${MONTHS[month - 1]} |`);
		return ['Billing history on the account:', '', ...rows].join('\n');
	}
	const scim = topic.area === 'sso';
	const client = scim ? `${pick(r, ['Okta', 'Entra ID'])} (SCIM)` : topic.area === 'api' || topic.area === 'apifail' ? `ApiKey "${v.label}"` : `app, ${v.browserName}`;
	const ok = scim
		? ['GET /scim/v2/Users?filter=userName eq "..." 200', 'POST /scim/v2/Users 201', 'GET /scim/v2/Users/{userPath} 200', 'GET /scim/v2/Users?startIndex=1&count=100 200']
		: client.startsWith('ApiKey')
			? ['GET /boards 200', 'GET /boards 200', 'POST /boards 201', 'PATCH /boards/{boardPath} 200', 'GET /account 200']
			: ['GET /account 200', 'GET /boards 200', 'GET /boards 200', 'POST /boards 201', 'PATCH /boards/{boardPath} 200', 'GET /boards 200', 'PATCH /account 200'];
	const lines: string[] = [`${'time'.padEnd(20)} ${'client'.padEnd(24)} ${'request'.padEnd(56)} status  ms`];
	const steps = Array.from({ length: int(r, 12, 26) }, () => int(r, 1, 140));
	let at = t - int(r, 5, 90) - steps.reduce((sum, step) => sum + step, 0);
	for (const step of steps) {
		at += step;
		const failing = !!topic.fail && r() < 0.35;
		const line = failing ? topic.fail! : pick(r, ok);
		const parts = fill(r, line, { ...v, boardId: `brd_${uuid(r)}`, boardPath: line.includes('404') ? encodeURIComponent(v.board!) : `brd_${uuid(r)}`, userPath: `usr_${uuid(r)}` }).split(' ');
		const slow = parts[parts.length - 1] === 'slow';
		if (slow) parts.pop();
		const status = parts.pop()!;
		const ms = slow ? int(r, 4200, 9700) : status === '500' || status === '503' ? int(r, 2, 30) : int(r, 18, 240);
		lines.push(`${dateOf(at).toISOString().slice(0, 10)} ${clock(at)}:${pad(int(r, 0, 59))}  ${(failing && topic.failClient ? topic.failClient : client).padEnd(24)} ${parts.join(' ').padEnd(56)} ${status}     ${ms}`);
	}
	return [pick(r, ['Recent requests on the account, from the API logs:', 'Pulled the account\'s recent requests:', 'What the logs show for the account in the last few days:']), '', fence(lines)].join('\n');
};

const topics: Topic[] = [
	{
		area: 'account',
		weight: 4,
		pause: true,
		fail: 'DELETE /boards/{boardId} 204',
		subjects: ['Deleted the wrong board', 'Can a deleted board be restored?', 'URGENT - board gone', 'help!! lost our main board', 'Board missing - my fault'],
		open: [
			'I was tidying up our boards this morning and deleted "{board}" when I meant to delete "{board2}". They sit next to each other in the list, and I clicked the wrong one. Is there any way of getting it back? The whole team [[works from it every day|plans the week on it]], and I have a sinking feeling.',
			'One of our boards has gone, and I am fairly sure I deleted it myself: the confirm box came up and I clicked through it without reading, the way you do. It was called "{board}" and it is the board we all work from. Please tell me it can be recovered.'
		],
		details: ['It had everything on it: who is doing what this month, the deliveries we are waiting for, and the notes from our last two planning meetings. Nobody has a copy, because why would you.', 'I have not told the rest of the team yet. I am hoping you can sort it before they notice.', 'I have been using Larchwood for over a year without a single mishap, so of course it had to be the important one.'],
		turns: [
			['I have looked everywhere for a bin or an undo. Is there one somewhere I am not seeing? I also tried the back button in the browser, which did nothing.', 'There isn\'t one, I am afraid, and the back button cannot help either: deleting a board removes it straight away, together with everything on it. Before you start rebuilding anything, though, please give me a chance to find out what can be done on our side. It would help to know roughly what time it happened.'],
			['About {hour} this morning, I think. I went to make a coffee straight afterwards and noticed when I came back and the list looked short.', 'Thank you, that helps. Can you also confirm that the board was on your own account and not on a colleague\'s? Each board belongs to the person who made it, so if a colleague made it, it lived on their account, and I need to be looking in the right place.'],
			['Yes, it was mine. I made it when we first started with Larchwood, back in {month}, and I have been the one keeping it tidy ever since. Which, as you can see, is going brilliantly.', 'Thanks, and do not be hard on yourself: two similar titles in a long list are easy to mix up. I have your account open now, with the {n} boards that are left on it.'],
			['Is there anything I should avoid doing in the meantime? I do not want to make it worse.', 'Nothing you do on your account now can affect what we may be able to get back, so carry on as normal. The one thing I would hold off on is making a new board with the same title, so that nobody is confused about which is which if the old one comes back. Give me a little while to talk to the right people.']
		],
		waitAfter: 1,
		ask: 'your confirmation that "{board}" was on your own account',
		solved: ['Good news: our engineers were able to bring "{board}" back from the copy of the database we take every night. It is in your list again, at the bottom, because boards are listed oldest first. Anything added to it this morning, before it was deleted, came after last night\'s copy, so it is worth checking the most recent items with the team.', 'It is back! I have been through it and we only lost a couple of things from this morning, which I remember anyway. You have saved my week. Please thank whoever did the restoring.'],
		eng: ['A deleted board can only come back from the copy of the database we take each night, and only our engineers can do that', 'restore "{board}" to your account from last night\'s copy'],
		wish: ['Once a board is deleted there is nothing in the app that can bring it back, and in this case our nightly copy cannot help either, because the board was made after the last copy was taken', 'a bin for deleted boards, so that a board can be brought back for a few weeks after it is deleted'],
		quick: ['If I delete a board by accident, can it be brought back? I came close to doing it last week and it made me wonder.', 'Not from the app, I am afraid: deleting a board removes it straight away, with everything on it. In an emergency our engineers can sometimes bring one back from the copy of the database we take each night, but that is a last resort and not always possible.'],
		side: ['So the safest thing is not to delete anything we might ever need?', 'More or less. If you are not sure about a board, rename it to something like "old" and let it sit at the bottom of the list, out of the way. You can always delete it later, once you are sure nobody needs it.'],
		explain: 'For what it is worth, you are far from the first person this has happened to. Boards live in our main database, and while there is no bin in the app, the database itself is copied every night, which is the one thing that sometimes lets us help.',
		art: { by: 'note', turn: 2, make: lookupArt }
	},
	{
		area: 'web',
		weight: 2,
		recurs: true,
		subjects: ['Every board appears twice', 'Duplicate boards??', 'Two of everything', 'New boards are doubled'],
		open: [
			'Since about last week, nearly every board I create turns up twice in my list. Same title, both empty. I delete one of them and carry on, but it is getting silly, and the other day I deleted the wrong copy and lost the notes I had just typed into it.',
			'I keep ending up with two copies of new boards. I create one, and a second identical one appears underneath it a moment later. It does not happen every time, but often enough that I now check the list after every board I make.'
		],
		details: ['I make quite a few boards, one for every job that comes in, so it adds up to a lot of tidying.', 'I thought at first it was something I was doing, so I started clicking very deliberately, once. It still happens.'],
		turns: [
			['Is this something I am doing wrong?', 'Not necessarily, and you are not the first person to describe something like this. Could you tell me which browser and device you use, and whether it happens with every new board or only with some of them? Anything you notice about when it happens would help too.'],
			['Chrome on a Windows laptop, with a mouse. Not every time, maybe one board in three. Our office internet is not the quickest, if that matters: the page sometimes takes a second or two to react to anything.', 'It might well matter. I am going to try to reproduce it here with a slowed-down connection, and I will also look on our side at exactly when the two copies of each board were made, because the timing usually tells us a lot.'],
			['For what it is worth, I have never seen it happen on my laptop at home, but then I use the trackpad there, not a mouse.', 'That is a useful detail, thank you. I have the list of your most recent boards in front of me now.'],
			['Should I go on deleting the empty copies, or will that confuse something?', 'Deleting the empty copy is perfectly safe. The two are separate boards that happen to have the same title, nothing links them, and the other one will not notice. Just make sure you delete the empty one and not the one you have started using.']
		],
		waitAfter: 0,
		ask: 'the browser and device you use',
		solved: ['I think I have found it, and it is not the connection. Each pair of boards was created less than a tenth of a second apart, which is faster than anyone can click twice on purpose. That is what a mouse does when its button has started to wear and registers one press as two. Since it never happens with your trackpad, could you try a different mouse for a day?', 'You were right. I borrowed a mouse from {name2} and have not had a single duplicate all day. Now that I think about it, the old one has been opening two tabs at a time as well. Off to the recycling with it, and sorry for the trouble.'],
		eng: ['On a slow connection the Create button can still be clicked while the first request is still on its way, so a second click, even an accidental one, creates a second board. With the network slowed down I can make it happen every time', 'make the Create button ignore further clicks until the new board exists'],
		quick: ['I sometimes end up with two copies of a new board, same title, both empty. Is that a known thing?', 'It can happen if Create is clicked twice while the page is still busy, which is easier to do than it sounds on a slow connection. If it keeps happening, tell us and we will look at your account in particular.'],
		side: ['Is it safe to delete the second copy when that happens? I have been leaving them in case.', 'Yes: the two are separate boards that happen to have the same title, and nothing links them. Delete the empty one and keep the one you have started using.'],
		explain: 'Each time Create is clicked, the app sends one request to make a board, and our side makes exactly one board for each request it receives. So two boards means two requests reached us, and the question is where the second one came from.',
		art: {
			by: 'note',
			turn: 2,
			make: (r) => {
				const rows: string[] = [];
				let t = 30_000 + int(r, 0, 20_000);
				for (let i = int(r, 4, 7); i > 0; i--) {
					const title = JSON.stringify(pick(r, boardTitles)).padEnd(26);
					const at = isoAt(t, r);
					rows.push(`brd_${uuid(r)}  ${title} ${at}`);
					if (r() < 0.55) rows.push(`brd_${uuid(r)}  ${title} ${at.slice(0, 20)}${String(int(r, 0, 999)).padStart(3, '0')}Z`);
					t += int(r, 300, 4000);
				}
				return ['{eng} pulled the most recent boards on the account for me (id, title, created):', '', fence(rows), '', 'The pairs are milliseconds apart.'].join('\n');
			}
		}
	},
	{
		area: 'general',
		weight: 2,
		subjects: ['Sorting boards', 'Can I change the order of my boards?', 'Newest boards at the top please', 'Board list order'],
		open: [
			'I have {n2} boards now and the one I use every day is right at the bottom of the list, so I scroll past everything else every morning. Is there a way to sort the list by name, or to put the newest boards at the top?',
			'Quick question: our board list seems to be in no particular order, and the team keep asking me to put it in alphabetical order. Is there a setting for that? I cannot find one anywhere.'
		],
		details: ['We are {seats} people and between us we make a new board most days.', 'I tried renaming a few boards with numbers in front so that they would sort, but nothing moved.'],
		turns: [
			['Or is the order simply random?', 'It is not random, though I can see why it looks that way with so many boards: the list shows boards in the order they were created, oldest first, and there is no setting to change that at the moment. So the boards you made in your first week are always at the top.'],
			['That explains why our very first test board is still sitting at the top. Could I at least pin the few we use every day so they stay where we can see them?', 'There is no pinning either, I am afraid. Can I ask what you mostly need: to find a particular board quickly, or to have the list in a particular order for everyone on the team? The answer is a little different for each.'],
			['Mostly to find the right one quickly. A lot of ours start with "Client:", which does not help, because they all look the same at a glance.', 'That makes sense, and it is the more common of the two. There is something that should help with exactly that.']
		],
		wishAfter: 1,
		solved: ['The filter box above the board list narrows it down as you type, and it keeps what you typed when you come back to the page. Several customers with long lists use it instead of scrolling. Typing the client\'s name should get you to the board in a keystroke or two.', 'I had genuinely never noticed that box. That does the job, thank you.'],
		wishLead: 'That is a shame. With this many boards it really slows us down every morning, so please count this as a request from us.',
		wish: ['Changing the order of the list is not possible today', 'sorting the board list by name or newest first, and pinning favourite boards to the top'],
		quick: ['Is there a way to sort the board list alphabetically? Ours has grown to the point where nobody can find anything.', 'Not yet: the list is in the order the boards were made, oldest first, for everyone. It is a common request and it is on our list.'],
		side: ['So renaming them with numbers in front will not help either?', 'I am afraid not, since the list does not sort by title at all. The filter box above the list is the quickest way to a particular board: it narrows the list as you type, and it remembers what you typed.'],
		explain: 'The order comes from the date each board was made, and nothing you do to a board afterwards, renaming it included, moves it.',
		art: { by: 'customer', turn: 0, make: (r) => ['This is what the top of my list looks like:', '', ...shuffle(r, boardTitles).slice(0, int(r, 7, 12)).map((title) => `- ${title}`), '- ...'].join('\n') }
	},
	{
		area: 'apifail',
		weight: 1,
		fail: 'POST /boards 400',
		subjects: ['"title is required" from the API', 'Some board creations fail', 'API 400 errors on new jobs'],
		open: [
			'We have a script that creates a board for each new job from our job sheet, and since last week some of the requests fail with a 400 and {"error":"title is required"}. Most of them go through fine.',
			'Our integration that makes a Larchwood board for every new project has started failing on some projects with "title is required". The project names are definitely there in our system.'
		],
		details: ['The script was written by a contractor who has since moved on, so I am reading it for the first time myself.', 'It runs every morning at seven and has been fine since the spring, which is why I am puzzled.'],
		turns: [
			['What counts as a title, as far as your API is concerned? We do not do anything clever with them.', 'Any text at all, once spaces at the beginning and end have been taken off: one character is enough. Could you send me the body of one request that failed, exactly as your script sent it? A few failures and a few successes side by side would be even better.'],
			['Here is our log from this morning, bodies included. I have left in the ones that worked so that you can compare.', 'Thank you, that is exactly what I needed, and having the successful ones next to the failures makes the difference easy to see.'],
			['While you look: is there a way to see which jobs failed without reading our own log? The office would like a list.', 'Not from our side, I am afraid: the API answers each request as it comes and does not keep a list of failures for you. Your own log is the best record, and it is a good one.']
		],
		waitAfter: 0,
		ask: 'the body of one request that failed',
		solved: ['In every request that failed, the title is empty, a few spaces, or null. In your job sheet those are the jobs that have no name yet, and the script sends the empty cell as it is. If the script skips jobs without a name, or uses the job number as the title until there is one, the errors will stop.', 'Of course. The failures are all jobs the office enters before the customer has confirmed. We will use the job number until there is a name. Thanks!'],
		wishLead: 'Could the API not just give the board a default title in that case? It would save us special-casing it in the script.',
		wish: ['The API needs a title for every board and does not invent one', 'a default title, such as "Untitled", when a board is created without one'],
		quick: ['Does a board need a title when we create it through the API? We are thinking of creating some boards automatically.', 'Yes, it needs some text once spaces at either end are taken off; otherwise the API answers 400 with "title is required". One character is enough.'],
		side: ['Is there a maximum length for a title, while we are on the subject?', 'Nothing you are likely to hit with ordinary names. Very long titles are cut short on screen, though, so the first few words are the ones that matter.'],
		explain: 'The rule is the same for boards made in the app and through the API: the title is checked after spaces at either end are removed, and if nothing is left, the board is not made and the answer is a 400.',
		art: {
			by: 'customer',
			turn: 1,
			make: (r, v) => {
				const rows: string[] = [];
				let job = int(r, 3100, 5800);
				for (let i = int(r, 6, 10), minute = 0; i > 0; i--, job += int(r, 1, 3), minute += int(r, 0, 2)) {
					const kind = r();
					const body = kind < 0.6 ? `{"title":"${pick(r, ['Hendry kitchen', 'Unit 4 shelving', 'Mrs Okoro bathroom', 'Depot repaint', 'Larch Close fencing', 'School hall floor', 'Flat 2 rewire'])}"}` : kind < 0.75 ? '{"title":"  "}' : kind < 0.88 ? '{"title":null}' : '{"title":""}';
					rows.push(`${v.logDay} 07:${pad(minute)}:${pad(int(r, 0, 59))} job ${job} POST /boards ${body} -> ${kind < 0.6 ? `201 {"id":"brd_${uuid(r)}",...}` : '400 {"error":"title is required"}'}`);
				}
				return fence(rows);
			}
		}
	},
	{
		area: 'web',
		weight: 1,
		fail: 'GET /boards 200 slow',
		recurs: true,
		subjects: ['Larchwood very slow', 'Board list takes ages to load', 'Performance problem', 'Slow every morning'],
		open: [
			'Opening Larchwood in the morning has become slow. The board list takes {n} or more seconds to appear and the spinner just sits there. A few months ago it was instant.',
			'Is something wrong on your side? Our board list takes forever to load, for all of us, every time we open it, and people have started leaving it open all day rather than wait.'
		],
		details: ['Everything else on the internet is fine from here, so I do not think it is our connection.', 'It is worst first thing, when everyone opens it at once, but it is never quick.'],
		turns: [
			['Is anyone else complaining?', 'Not that I can see this week, so I would like to look at your account in particular. Roughly how many boards do you have? A rough number is fine.'],
			['Quite a lot. We make one per client job, so probably {n2} by now. Here is what the browser shows when the list loads.', 'That would explain much of it: the list loads every one of your boards in one go before it shows anything, and with that many the answer from our side is large.'],
			['We do not need most of them, to be honest. They are finished jobs, and we just never tidy up.', 'Understood, and you are far from the only team like that. Let me suggest something.']
		],
		waitAfter: 0,
		ask: 'a rough count of your boards',
		solved: ['Since most of them are finished jobs, the quickest improvement is to delete the boards you will never need again. With fewer boards the list loads far faster. I know that is a workaround rather than a fix.', 'I spent an hour this afternoon deleting old job boards, about {n4} of them, and the list is quick again. Thanks.'],
		eng: ['The board list fetches every board in one request, and with {n2} boards that answer is large and slow', 'load the board list a page at a time instead of all at once'],
		wish: ['There is no way to put finished boards aside today without deleting them', 'archiving finished boards, so that they leave the main list but can still be opened'],
		quick: ['The board list has got slower as we add boards. Is that expected, or is something wrong?', 'A little slower is expected: the list loads every board at once, so a very long list takes longer to appear. A few seconds is more than it should be, though.'],
		side: ['Would deleting old boards speed it up, then? We have a lot of finished ones.', 'It would, yes: fewer boards means less to load. Just be sure about the ones you delete, because they cannot be brought back from the app.'],
		explain: 'When you open Larchwood, the app asks for your whole list of boards at once and waits for all of it before drawing anything, which is quick for most teams but grows with every board you add.',
		art: { by: 'customer', turn: 1, make: (r) => fence([`GET https://api.larchwood.test/account   200  ${int(r, 60, 140)} ms   ${int(r, 380, 460)} B`, `GET https://api.larchwood.test/boards    200  ${(int(r, 42, 97) / 10).toFixed(2)} s   ${(int(r, 9, 31) / 10).toFixed(1)} MB`, `GET https://larchwood.test/assets/app-${hex(r, 8)}.js   200  (from disk)`, `GET https://larchwood.test/assets/app-${hex(r, 8)}.css  200  (from disk)`]) }
	},
	{
		area: 'apifail',
		weight: 1,
		fail: 'PATCH /boards/{boardPath} 404',
		subjects: ['404 board not found', 'Renaming via API gives 404', 'PATCH /boards always fails'],
		open: [
			'I am writing a small script to rename our sprint board at the end of every sprint. GET /boards works fine, but PATCH /boards/... always comes back 404 with "board not found".',
			'Our script can list boards through the API but gets "board not found" whenever it tries to rename one of them.'
		],
		details: ['I am not a developer, I just got volunteered because I once wrote a spreadsheet macro.', 'The idea is that the board for the sprint that has just ended gets "(done)" added to its title.'],
		turns: [
			['The board definitely exists: I can see it in the list the API returns.', 'Could you send me the exact request your script makes, with the key shortened? If you can run it with curl, the full output would be ideal.'],
			['Here it is, as curl.', 'Thanks, I can see what is happening, and it is a quick fix.'],
			['Is anything else in the request wrong, while you are looking at it?', 'The header and the body are both fine: ApiKey is the right word for a key, and the body is valid JSON with a title in it. It is only the address that needs changing.']
		],
		waitAfter: 0,
		ask: 'the exact request your script makes',
		solved: ['The address has the board\'s title in it, "{board}", where it needs the board\'s id: the value starting with brd_ in the list GET /boards returns. With the title in the path, the API looks for a board whose id is "{board}", finds none, and answers 404. Put the id there instead and it will work.', 'Of course, I was reading the wrong field from the list. Works now, thank you.'],
		wishLead: 'Thanks. Would it be possible to rename by title, though? Our sprint boards always have predictable titles, and looking up the id first is an extra step for a non-developer.',
		wish: ['Boards can only be addressed by their id', 'finding and changing a board by its title through the API'],
		quick: ['When I call PATCH /boards/... from a script, do I use the board\'s title or its id?', 'The id: the value starting with brd_ that GET /boards returns for each board. The title can change; the id never does.'],
		side: ['Does the id change when the board is renamed?', 'No, a board keeps its id for its whole life, so a script can safely store it and use it again next week.'],
		explain: 'A 404 from the API means it could not find what the address points to: either there is no such board, or the board belongs to someone else, in which case the API answers as if it did not exist.',
		art: { by: 'customer', turn: 1, make: (r, v) => fence([`$ curl -i -X PATCH "https://api.larchwood.test/boards/${encodeURIComponent(v.board!)}" \\`, `    -H "Authorization: ApiKey lw_${hex(r, 6)}..." -H "Content-Type: application/json" \\`, `    -d '{"title":"${v.board} (done)"}'`, 'HTTP/1.1 404 Not Found', 'content-type: application/json;charset=utf-8', `date: ${v.httpDate}`, 'content-length: 27', '', '{"error":"board not found"}']) }
	},
	{
		area: 'account',
		weight: 2,
		fail: 'PATCH /account 200',
		subjects: ['My name looks odd', 'Blank name on profile', 'Name shows with a gap', 'Display name problem'],
		open: [
			'My name shows with a gap in front of it at the top of the app, and in lists it sorts before everyone else. I think I typed a space by accident when I last changed it, but I cannot seem to get rid of it.',
			'I have no name at all in the app any more, just a blank where it should be. I was trying to clear the box to retype my name and pressed save by mistake.'
		],
		details: ['It is only cosmetic, I know, but people keep asking about it.', 'I have tried logging in on another computer in case it was a display thing, and it looks the same there.'],
		turns: [
			['Can you fix it from your end?', 'Let me look at the account first. I can see the name exactly as it is saved, and I think I know what has happened.'],
			['Thanks. It is a small thing, but it is the first thing everyone sees.', 'I understand, and it is worth getting right.'],
			['Could it have happened on the phone? I sometimes change things there.', 'It could have happened anywhere you can edit your profile. Phone keyboards do sometimes add a space before or after a word, which would do it.']
		],
		solved: ['The name was saved exactly as it was typed, spaces and all. Changing it again under Profile, typing only the name, will save it the way it should look. Could you give that a try?', 'Done, and it looks normal now. I did not realise it kept exactly what you typed. Thanks.'],
		eng: ['The profile saves the name exactly as typed, spaces included, and it even accepts a name made of nothing but spaces, which is what has happened here', 'trim spaces from display names and refuse a name that is empty once they are taken off'],
		quick: ['My name has a space in front of it in the app. How do I get rid of it?', 'Change it under Profile and type it again without the space. The name is saved exactly as it is typed, so a stray space stays until someone takes it out.'],
		side: ['Does the name I type there show anywhere else?', 'It shows wherever Larchwood shows who you are, so yes, it is worth getting it exactly as you want it.'],
		explain: 'The display name is the one part of the profile you can change yourself, and it is saved exactly as typed, so whatever went into the box is what everyone sees.',
		art: { by: 'note', turn: 0, make: lookupArt }
	},
	{
		area: 'none',
		weight: 1,
		plan: 'Team',
		newcomer: true,
		subjects: ['Cannot sign up', 'Sign-up form rejects my password', 'Password rules', 'Why 10 characters?'],
		open: [
			'I am trying to create an account and the form keeps saying "the password needs at least 10 characters". The password I use for this sort of thing is eight characters and our IT policy says that is fine. Do I really have to make up a new one just for Larchwood?',
			'Your sign-up page will not take my password. It is a perfectly good one, with capitals and a number and a symbol, but it is apparently too short.'
		],
		details: ['I have about forty passwords already and I am running out of ideas.', 'Our office manager asked us all to sign up by Friday so that she can set up the boards.'],
		turns: [
			['Why ten, anyway?', 'It is a fair question. Length is what makes a password hard to guess, much more than symbols or capital letters, so ten characters is our minimum for everyone, whatever their company\'s own policy. A short sentence you will remember works well, and spaces are allowed.'],
			['Our IT team will not be thrilled about yet another password.', 'I understand. If your company were on our Business plan, people could sign in with your own single sign-on instead and would need no Larchwood password at all, but on a Team account a password is the way in.'],
			['Is there anything else I should know before I sign up, so that I do not fall at the next hurdle?', 'Only that your email address needs to be one you can get at, and that your display name can be anything you like: it starts as the first part of your email address, and you can change it later under Profile.']
		],
		solved: ['For now, a short sentence really is the easiest way through. Four ordinary words with spaces between them is both long and easy to type.', 'Fine, I used a line from a song and it went straight through. Thanks for explaining rather than just pointing me at the rules.'],
		wishLead: 'Could you not let us sign in with our Microsoft accounts on Team as well? Most of our other tools do that now.',
		wish: ['Signing in with a Microsoft or Google account is only part of the Business plan', 'signing in with a Microsoft or Google account on every plan'],
		quick: ['Why does the password have to be ten characters? One of our new people asked me and I did not know.', 'Because length is what makes a password hard to guess, much more than symbols or capitals. Ten characters is our minimum for everyone.'],
		side: ['Can it have spaces in it? That would make it easier.', 'Yes, spaces are fine, which makes a short sentence a good choice: long, and easy to remember.'],
		explain: 'Your password is stored only as a scrambled version that cannot be turned back into the password, so not even we can see it, but none of that helps if it is short enough to guess.',
		art: { by: 'customer', turn: 0, make: () => '[screenshot: the sign-up form, with "the password needs at least 10 characters" in red under the password box]' }
	},
	{
		area: 'none',
		weight: 2,
		newcomer: true,
		subjects: ['Says my email already has an account', 'Sign-up error', 'Never signed up but email taken', 'New starter cannot register'],
		open: [
			'I tried to sign up with {email} and got "that email already has an account". As far as I know I have never used Larchwood before. How can that be?',
			'I am trying to make an account with my work address and the form tells me that email already has an account. I am fairly sure I have never had one.'
		],
		details: ['I have only just joined {co}, so I suppose it could be someone else\'s old account, but the address is new.', 'I tried with capitals in a different place, in case that mattered, and got the same message.'],
		turns: [
			['Has someone else signed up with my address?', 'Let me look. One thing first: addresses are matched without regard to capital letters, so {emailCaps} and {email} count as the same address, which sometimes surprises people. Give me a moment to search.'],
			['OK, I will wait.', 'I can see an account with that address, made on {olddate}. Does that date ring a bell? Perhaps a trial for a previous project, or a colleague setting you up?'],
			['Now you say it, we did look at Larchwood for the {project} a while back. I must have made it then and forgotten all about it.', 'That would fit: the account has {n} boards from around that time.']
		],
		waitAfter: 1,
		ask: 'your answer on whether you remember using Larchwood around {olddate}',
		solved: ['So the simplest thing is to sign in to that account rather than making a new one. If you saved the password back then, your password manager may well have it under an old name.', 'Found it in my password manager under "Larchwood trial". I am in, and the old boards are all there. Thanks!'],
		quick: ['Also, a colleague is told that her email already has an account when she signs up. Why would that be?', 'Usually because she made one some time ago and has forgotten about it, often during a trial. Addresses are matched without regard to capital letters, so a different spelling of the same address counts too.'],
		side: ['She says she has never used it. What should she do?', 'If she has a password manager, it is worth searching it for "Larchwood" first. If that finds nothing, she can write to us from that address and we will look at the account with her.'],
		explain: 'Each email address can have only one Larchwood account, which is why the form stops you rather than making a second one.',
		art: { by: 'note', turn: 1, make: lookupArt }
	},
	{
		area: 'account',
		weight: 3,
		fail: 'POST /auth/login 401',
		recurs: true,
		subjects: ['Cannot sign in', '"Wrong email or password" but they are right', 'Cannot get in on my phone', 'Sign-in not working on phone'],
		open: [
			'I keep getting "wrong email or password" on my phone, and I am certain both are right. On my laptop the same details work fine.',
			'Since yesterday I cannot sign in on my phone. I have typed the password by hand as well as pasting it, and it is definitely right, because it works on my computer.'
		],
		details: ['I mostly use Larchwood on my phone when I am out at clients, so this is a real nuisance.', 'I even changed nothing at all and tried again an hour later, in case it was a temporary thing on your side.'],
		turns: [
			['Have I made things worse by trying so many times?', 'No, trying again does no harm at all, so you have not made anything worse. Can you tell me how you enter your email address on the phone: typed, pasted, or filled in by the phone itself?'],
			['It fills itself in from the keyboard suggestions when I start typing. I never type the whole thing.', 'Thank you, that is a very useful clue, and it fits with what you describe on the laptop.'],
			['Does that make a difference? It looks exactly the same on the screen.', 'It can, because some keyboards add something you cannot see. Let me check one thing before I say more.']
		],
		waitAfter: 0,
		ask: 'a word on how you enter your email address on the phone',
		solved: ['I think your keyboard adds a space after the email address when you accept the suggestion, and to the sign-in form an address with a space at the end is a different address. Could you type the address by hand, without taking the suggestion, and try again?', 'Typed it by hand and I am in. Unbelievable! Thank you.'],
		eng: ['When the phone\'s keyboard fills in the address it adds a space after it, and the sign-in form sends it with the space, so it matches no account. I could reproduce it with a space at the end', 'make sign-in ignore spaces before and after the email address'],
		quick: ['My phone sometimes says "wrong email or password" when it is not. Any idea?', 'The keyboard often adds a space after the address when you take its suggestion, and to the sign-in form that is a different address. It is invisible on the screen, which is what makes it so confusing.'],
		side: ['So I should type the address out in full?', 'For now, yes: typing it by hand, without accepting the suggestion, gets round it every time.'],
		explain: 'When the sign-in form says "wrong email or password", it deliberately does not say which of the two was wrong, so the message looks the same whether the address is unknown or the password does not match.',
	},
	{
		area: 'sso',
		weight: 2,
		plan: 'Business',
		subjects: ['Cannot sign in', 'Password does not work for new staff', 'New people cannot get in', 'Sign-in problem for whole team'],
		open: [
			'Several of the people our IT team added this week cannot sign in. They go to the sign-in page, type their work email and a password, and get "wrong email or password".',
			'I was set up on Larchwood by our IT team on {day} and I have no idea what my password is. When I try to sign up to make one, it says my email already has an account.'
		],
		details: ['We are rolling Larchwood out department by department, and this is the first group.', 'Nobody has been sent a password, now that I think of it, but nobody told us we would not need one either.'],
		turns: [
			['What are we doing wrong?', 'Probably nothing anyone could have known. Do you know how these accounts were created: from your identity provider, such as Okta or Entra ID, or did each person sign up on our website?'],
			['Our IT team did it through Okta, I believe. I am not involved in that side of things.', 'Thanks, that matches what I can see: the accounts came in through your SCIM connection.'],
			['Is that a problem?', 'Not at all, it is how most Business customers do it. It just means they get in a different way.']
		],
		waitAfter: 0,
		ask: 'a word on how the accounts were created',
		solved: ['People added through SCIM have no Larchwood password at all. They sign in with your company\'s single sign-on, with "Sign in with SSO" under the form, or from the Larchwood tile in Okta. Typing a password will never work for them, which is why the form says it is wrong.', 'That was it. I have sent everyone a note about the SSO button and they are all in. Might be worth making that button bigger!'],
		wishLead: 'Understood, but when Okta has a bad day nobody can get in at all. Could they not have a password as well?',
		wish: ['Accounts created through SCIM can only sign in with SSO and cannot have a password too', 'letting people added through SCIM set a Larchwood password as well, for when the identity provider is unavailable'],
		quick: ['Can people that our IT team added from Okta sign in with a password, or do they have to use SSO?', 'They have to use single sign-on: people added through SCIM have no Larchwood password at all, so a password will never work for them.'],
		side: ['Where do they find that, then?', 'Under the sign-in form there is "Sign in with SSO", and there is usually a Larchwood tile in Okta as well.'],
		explain: 'With SCIM, your identity provider creates each person\'s Larchwood account for you, and from then on they sign in through your company\'s single sign-on rather than with a Larchwood password.',
		art: {
			by: 'note',
			turn: 1,
			make: (r, v) => {
				const rows: string[] = [];
				for (let i = int(r, 4, 8), minute = int(r, 0, 20); i > 0; i--, minute += int(r, 0, 3)) rows.push(`${v.logDay} 07:${pad(minute)}:${pad(int(r, 0, 59))}  POST /scim/v2/Users  userName=${slug(pick(r, firstNames))}.${slug(pick(r, surnames))}@${v.domain}  201`);
				return ['SCIM requests from their identity provider this week:', '', fence(rows)].join('\n');
			}
		}
	},
	{
		area: 'sso',
		weight: 2,
		fail: 'GET /scim/v2/Users?startIndex=1&count=100 200',
		plan: 'Business',
		subjects: ['Okta import stops at 100', 'Not all users imported from Larchwood', 'SCIM import incomplete', 'Okta only sees part of our team'],
		open: [
			'We have {n3} people in Larchwood, but when Okta imports users from the Larchwood app it only ever finds 100 of them. The rest show up as unmatched and Okta offers to create them again, which I am not going to do.',
			'Our Okta admin tells me the user import from Larchwood is incomplete: it brings in exactly 100 people and stops. We are well over that.'
		],
		details: ['We are trying to tidy up our Okta assignments before the end of the quarter, so the import matters.', 'Our other SCIM apps import everyone, so I do not think it is our Okta set-up.'],
		turns: [
			['Is there a limit on users for our plan?', 'No, the Business plan has no limit on users. Could you send me the import log from Okta, or the list of requests it made to us?'],
			['Here is the log from this morning\'s import.', 'Thank you, that is exactly what I needed. Okta asks for the first page of a hundred people, and then it stops asking.'],
			['So it is not something we have set wrongly?', 'It does not look like it. Okta is doing what it should with the answer it gets from us.']
		],
		waitAfter: 0,
		ask: 'the import log from Okta',
		eng: ['Our answer to Okta gives the total as the number of people on the page rather than the number of people there are, so Okta believes there is only one page', 'make the SCIM user list report the full number of matching users, not just the number on the page'],
		quick: ['Is there a limit on how many people Okta can import from Larchwood? Our IT team asked me to check.', 'There should not be any limit on our side, whatever the size of your team.'],
		side: ['Ours seemed to stop at a round number. Should I worry?', 'Send us the import log when you have a moment and we will look. If an import stops short, we want to know.'],
		explain: 'Okta reads your people from us a page at a time, a hundred to a page, and relies on the total we give with the first page to know how many pages to ask for.',
		art: {
			by: 'customer',
			turn: 1,
			make: (r, v) => {
				const m = pad(int(r, 0, 50));
				return fence([`Import from Larchwood, started ${v.logDay} 06:${m}`, `06:${m}:02  GET /scim/v2/Users?startIndex=1&count=100   200 OK`, `06:${m}:03  Response: totalResults=100, itemsPerPage=100, startIndex=1, Resources=100`, `06:${m}:03  Users scanned: 100`, `06:${m}:04  Matched: ${100 - int(r, 0, 4)}   Unmatched: ${int(r, 0, 4)}`, `06:${m}:04  Import completed`, '', `People assigned to the Larchwood app in Okta: ${v.n3}`]);
			}
		}
	},
	{
		area: 'sso',
		weight: 1,
		fail: 'POST /scim/v2/Users 201',
		plan: 'Business',
		subjects: ['Names show as email', 'SCIM users have the wrong names', 'Display names from Entra ID'],
		open: [
			'Everyone we push from Entra ID shows in Larchwood with the first part of their email as their name, so "j.okafor" instead of "Joy Okafor". It looks odd and people have started asking me why.',
			'The people we provision from Entra ID all get names like "m.calder" in Larchwood. Is there something we need to set on our side?'
		],
		details: ['It is mostly cosmetic, but our managers find it hard to tell people apart.', 'We set the integration up from your guide and did not change any of the default mappings.'],
		turns: [
			['Which attribute does Larchwood use for the name?', 'We take the name from displayName, or from name.formatted when displayName is empty, and fall back to the start of the email when both are missing. Could you check which of those your Entra ID mapping sends us?'],
			['Looking at the mapping, we send givenName and surname and nothing called displayName. This is what one push looks like.', 'That explains it: neither field we read is there, so we use the email.'],
			['Will changing the mapping affect the people who are already in Larchwood?', 'Not by itself. At the moment we only take names from new people as they are added, so the ones already there keep the name they have until they change it.']
		],
		waitAfter: 0,
		ask: 'the list of attributes your Entra ID mapping sends',
		solved: ['If you add a mapping for displayName in Entra ID, for example joining givenName and surname with a space, everyone you push from now on will get their proper name. The people already in Larchwood can correct their own name under Profile.', 'Mapping added. The two people we pushed since have proper names, and I have asked the others to fix theirs. Thanks.'],
		wishLead: 'We would rather not change a mapping that our other apps rely on. Could Larchwood not read givenName and familyName?',
		wish: ['We do not read givenName and familyName at the moment', 'building the name from givenName and familyName when displayName and name.formatted are both missing'],
		quick: ['Where does Larchwood take a provisioned person\'s name from? A few of ours look odd.', 'From displayName, or from name.formatted when displayName is empty, and from the start of the email when both are missing.'],
		side: ['And if the name is wrong, can the person change it?', 'Yes, anyone can change their own name under Profile, however their account was made.'],
		explain: 'When your identity provider adds someone, it sends us a small record with their details, and we take their email and name from that record and nothing else.',
		art: {
			by: 'customer',
			turn: 1,
			make: (r, v) => {
				const first = pick(r, firstNames);
				const last = pick(r, surnames);
				const address = `${slug(first).charAt(0)}.${slug(last)}@${v.domain}`;
				return fence(JSON.stringify({ schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'], externalId: uuid(r), userName: address, name: { givenName: first, familyName: last }, emails: [{ primary: true, type: 'work', value: address }] }, null, 2).split('\n'), 'json');
			}
		}
	},
	{
		area: 'none',
		weight: 1,
		fail: 'GET /scim/v2/Users?count=1 401',
		failClient: 'SCIM, wrong secret',
		plan: 'Business',
		subjects: ['SCIM connection test fails', 'Okta says 401 from Larchwood', 'Cannot connect provisioning'],
		open: [
			'I am setting up provisioning to Larchwood in Okta and the connection test fails with "Error authenticating: 401 Unauthorized". I have pasted the secret your team sent us exactly as it was.',
			'Our provisioning test from Okta to Larchwood keeps failing with a 401. I have checked the URL twice and copied the secret from your email.'
		],
		details: ['This is my first SCIM integration, so it may well be something obvious.', 'We have a go-live date with the first department next week, so I would like to get past this.'],
		turns: [
			['Which URL should go in the base URL field?', 'The base URL is https://api.larchwood.test/scim/v2, and Okta should send the secret in the Authorization header as a bearer credential. Could you send me a screenshot of the provisioning settings, with most of the secret blurred out?'],
			['Screenshot attached. I have typed out the fields too, in case the image does not come through.', 'Thank you, I can see it, and I think I can see the problem.'],
			['Is anything else in the settings off, as far as you can tell?', 'The base URL and the unique identifier field are both right. It is the Authorization field I want to talk about.']
		],
		waitAfter: 0,
		ask: 'a screenshot of the provisioning settings',
		solved: ['The secret field starts with the word "Bearer" followed by the secret. Okta adds the word Bearer itself, so at the moment it is sent twice and our check fails. Delete the word and the space after it, leave only the secret, and test again.', 'Deleted it and the test passes. Slightly embarrassing, thanks for spotting it.'],
		quick: ['In Okta\'s provisioning settings, do I put "Bearer" in front of the secret? Our guide is not clear.', 'No, Okta adds the word itself; the field should hold only the secret.'],
		side: ['And the base URL ends at /scim/v2?', 'Yes: https://api.larchwood.test/scim/v2, with nothing after it. Okta adds /Users itself.'],
		explain: 'Every SCIM request from your identity provider has to carry the secret we sent you, and if it does not match exactly, we answer 401 without looking any further.',
		art: { by: 'customer', turn: 1, make: (r) => ['[attachment: okta-provisioning.png]', '', fence(['SCIM connector base URL:    https://api.larchwood.test/scim/v2', 'Unique identifier field:    userName', 'Supported actions:          Push New Users, Push Profile Updates, Import New Users and Profile Updates', 'Authentication Mode:        HTTP Header', `Authorization:              Bearer ${hex(r, 4)}••••••••••••••••••••`, '', 'Test Connector Configuration: Error authenticating: 401 Unauthorized'])].join('\n') }
	},
	{
		area: 'sso',
		weight: 1,
		fail: 'POST /scim/v2/Users 400',
		plan: 'Business',
		subjects: ['SCIM push fails for some users', '"userName must be an email"', 'Provisioning errors in Entra ID'],
		open: [
			'Most of our people went across to Larchwood fine from Entra ID, but {n} of them fail on every cycle with "userName must be an email". They all have email addresses.',
			'Entra ID reports provisioning errors for a handful of our staff with the message "userName must be an email". Everyone else is fine.'
		],
		details: ['The ones that fail are mostly from our older offices, if that is a clue.', 'Entra retries them every forty minutes and fills my inbox with failure emails.'],
		turns: [
			['Is there something different about them?', 'Could you send me the provisioning log entry for one of the people who fail?'],
			['Here is one from this morning.', 'Thank you. For these people, the userName Entra ID sends is their sign-in name, like "jokafor", rather than their email address, and we use userName as the email.'],
			['There are {n} of them. Do you need the log for each one?', 'No, one is enough: from what I can see, they will all be the same story.']
		],
		waitAfter: 0,
		ask: 'the provisioning log entry for one of the people who fail',
		solved: ['Their sign-in names differ from their email addresses, probably because they joined before you changed how names are made. If you map userName to the mail attribute instead of userPrincipalName, they will provision on the next cycle.', 'Changed the mapping and all {n} came through on the next cycle. Thanks!'],
		wishLead: 'Changing the mapping affects other apps for us. Could Larchwood take the address from the emails attribute instead?',
		wish: ['We need userName to be an email address', 'accepting a userName that is not an email and taking the address from the emails attribute instead'],
		quick: ['Does userName have to be an email address for Larchwood? Our identity provider can send either.', 'Yes, we use userName as the person\'s email, so it needs to be the address they use.'],
		side: ['What happens if someone\'s userName is not an address?', 'We turn the request down with "userName must be an email", and your identity provider keeps retrying until the mapping sends an address.'],
		explain: 'We use the userName your identity provider sends as the person\'s email address, because that is how they are found again later, and an address has to look like one.',
		art: {
			by: 'customer',
			turn: 1,
			make: (r, v) => {
				const first = pick(r, firstNames);
				const last = slug(pick(r, surnames));
				return fence([`Date:          ${v.logDay} 05:${pad(int(r, 0, 59))}:${pad(int(r, 0, 59))}`, 'Action:        Create', `Source:        ${slug(first).charAt(0)}${last}`, 'Target system: Larchwood', 'Status:        Failure', 'Step:          Export', 'Details:       StatusCode: BadRequest. Response: {"schemas":["urn:ietf:params:scim:api:messages:2.0:Error"],"status":"400","detail":"userName must be an email"}', `Modified properties: userName=${slug(first).charAt(0)}${last}; displayName=${first} ${cap(last)}; emails[type eq "work"].value=${slug(first)}.${last}@${v.domain}`]);
			}
		}
	},
	{
		area: 'general',
		weight: 3,
		pause: true,
		subjects: ['My boards disappeared after I signed in', 'Lost my work after creating an account', 'Where did my boards go?', 'Boards from the trial gone'],
		open: [
			'I tried Larchwood yesterday with the "try it first" button and made {n} boards for our {project}. Today I signed in to my proper account on the same laptop and none of them are there.',
			'Yesterday I was trying Larchwood out without an account, then I signed in with the account my manager made for me, and all the boards I had made have gone.'
		],
		details: ['I spent a good hour setting them up, so I am a bit gutted.', 'I wanted to show them at our team meeting this afternoon, which is now not going to happen.'],
		turns: [
			['Did signing in wipe them?', 'No, they are not lost. When you use "try it first", Larchwood makes an anonymous user for you, and the boards you make belong to that anonymous user. When you then sign in to your real account, the app switches to it, and the anonymous user\'s boards stay where they are.'],
			['So can you move them across to my account?', 'Let me check what is possible. Give me a little while.'],
			['Is there a way to see the old boards at all, even just to copy things across by hand?', 'Not from your real account, I am afraid, and not from our side either, because nothing tells us which anonymous user was yours.']
		],
		solved: ['I have checked, and boards cannot be moved from the anonymous user to another account at the moment. Since there are only {n} of them, the quickest way is to make them again in your account. I am sorry that is not the answer you hoped for.', 'No problem, there was not much on them yet. I have made them again in my account.'],
		wish: ['Boards made with "try it first" stay with the anonymous user and cannot be moved to another account yet', 'bringing the boards made with "try it first" into the account you sign in to'],
		quick: ['A colleague wants to try Larchwood with "try it first" before we give her an account. Will the boards she makes carry over when she signs up?', 'Not at the moment: they stay with the anonymous user that "try it first" makes, even after you sign in to a real account.'],
		side: ['So she should sign up before she starts properly?', 'Yes, that is the safest way: sign up or sign in first, and everything she makes from then on is on her own account.'],
		explain: '"Try it first" is meant for people who want to look around before signing up, so it makes a separate, nameless user just for that visit, with no email address and no password.',
		art: { by: 'note', turn: 1, make: (r) => `Searched for "Anonymous" in the back office to see whether I could tell which one was hers: ${int(r, 140, 900)} anonymous users, none with an email, so no way to tell from here.` }
	},
	{
		area: 'account',
		weight: 3,
		subjects: ['All my boards are gone!!', 'Empty board list', 'Boards missing this morning', 'Where is everything?'],
		open: [
			'I opened Larchwood this morning and my board list is empty. Yesterday there were {n} boards on it. Nobody else uses my account.',
			'All my boards have vanished overnight!! I have a client meeting at ten and everything is on there.'
		],
		details: ['I have not deleted anything, I promise. I barely had time to open it yesterday.', 'I am on the office computer, the same one I always use.'],
		turns: [
			['Have you had some kind of problem?', 'I am sorry, that is a horrible thing to find first thing. I cannot see any problem on our side this morning. Could you open Profile and tell me which email address it shows?'],
			['It says {email2}. Oh.', 'That is the one I suspected.'],
			['Have I done something to my real account?', 'No, nothing at all. Your real account and its boards are exactly as you left them.']
		],
		waitAfter: 0,
		ask: 'the email address your Profile page shows',
		solved: ['That is your personal address. Your boards are on the account for {email}, the one you normally use, and they are all still there. It looks as if you signed in with the personal one at some point, perhaps on another computer. Sign in again with your work address and you will see them.', 'I signed in at home last night to show my partner something, and the browser remembered it. Panic over, they are all there. Sorry!'],
		quick: ['Is it possible to have a work and a personal account with you? I would like to keep my allotment plans separate.', 'Yes, each email address can have its own account, with its own boards.'],
		side: ['How do I tell which one I am in?', 'Profile shows the email address of the account you are signed in to, so that is the quickest check.'],
		explain: 'Larchwood shows the boards of whichever account you are signed in to, and nothing else, so an empty list usually means the right boards are on another account rather than gone.',
		art: { by: 'note', turn: 0, make: (r, v) => ['Two accounts in her name:', '', fence([`GET /admin/users?q=${v.last!.split(' ').pop()}`, JSON.stringify([JSON.parse(userJson(r, v)), { id: `usr_${uuid(r)}`, email: v.email2, displayName: v.name, role: 'member', anonymous: false, createdAt: `2026-0${int(r, 1, 8)}-${pad(int(r, 1, 28))}T20:${pad(int(r, 0, 59))}:00.000Z` }], null, 2)]), '', 'The work one has the boards.'].join('\n') }
	},
	{
		area: 'account',
		weight: 2,
		pause: true,
		subjects: ['Change my email address', 'New company domain', 'Update sign-in email', 'Typo in my email'],
		open: [
			'Our company has changed its name, and our email addresses move from @{olddomain} to @{domain} on the {n}th. How do we change the email on our Larchwood accounts? There are {seats} of us.',
			'I made a typo in my email address when I signed up ({typo}) and I would like to correct it. I cannot see where.'
		],
		details: ['The old addresses will keep working for a few months, but we would rather everyone moved over at once.', 'It has worked so far because the typo only affects the address, not the sign-in, but it looks careless on our invoices.'],
		turns: [
			['Is it somewhere in the profile settings?', 'Not yet, I am afraid: the profile page only lets you change your display name, and for now an email address can only be changed by our team.'],
			['Can you do it for us, then?', 'We can. Could you send me the current and new addresses, one pair per line, from the address that owns the account?'],
			['Here is the list.', 'Thank you, that is everything I need.']
		],
		waitAfter: 1,
		ask: 'the current and new addresses',
		solved: ['All done: engineering have changed the addresses on your list, and from now on each person signs in with the new address. Their boards are untouched.', 'Tried it with mine and it works. Thank you for sorting it so quickly.'],
		eng: ['Email changes are made directly in our database by engineering', 'change the addresses on the accounts in your list'],
		wishLead: 'Thanks. For next time, could people change their own address? We have new starters with typos all the time.',
		wish: ['Changing your own email address is not possible in the app yet', 'changing your own email address from the profile page'],
		quick: ['Can I change the email address I sign in with? Mine is an old one I would like to stop using.', 'Not from the app yet, but we can change it for you.'],
		side: ['What do you need from me for that?', 'Just the old and the new address, sent from the old one, so that we know the request comes from the account\'s owner.'],
		explain: 'The email address is what you sign in with, so we are careful about changing it: we make the change only when the request comes from the address that owns the account.',
		art: {
			by: 'customer',
			turn: 2,
			make: (r, v) =>
				fence(
					shuffle(r, firstNames)
						.slice(0, Math.min(Number(v.seats), int(r, 3, 7)))
						.map((first) => {
							const local = `${slug(first)}.${slug(pick(r, surnames))}`;
							return `${local}@${v.olddomain}, ${local}@${v.domain}`;
						})
				)
		}
	},
	{
		area: 'apifail',
		weight: 3,
		fail: 'GET /boards 401',
		failClient: 'Bearer, not recognised',
		subjects: ['API returns 401', 'API key not working', '"sign in first" with an API key', 'Script cannot authenticate'],
		open: [
			'I created an API key under Account and I am trying to call GET /boards from a script, but I always get a 401 with {"error":"sign in first"}. The key is definitely the one I have just made.',
			'Your API keeps telling me to sign in first, even though I am sending the key I created under Account.'
		],
		details: ['All I want is a list of our boards in a spreadsheet once a week.', 'I have made two keys now, in case the first one was faulty, and both do the same.'],
		turns: [
			['Is the API switched off for our plan?', 'No, the API is available on every plan. Could you send me the request you are making, with most of the key replaced by dots?'],
			['Here you go.', 'Thank you, I can see the problem: the header says Bearer in front of the key, and an API key needs the word ApiKey instead, as in "Authorization: ApiKey lw_...". Bearer is what the Larchwood app itself sends once you are signed in. Can you change that one word in your script?']
		],
		waitAfter: 1,
		ask: 'a word on whether changing Bearer to ApiKey fixed it',
		solved: ['', 'Changed it to ApiKey and I have got my boards back. Your docs could make that a lot clearer!'],
		wishLead: 'I cannot: the tool we use only lets me pick "Bearer" from a list, and there is nowhere to type another word.',
		wish: ['In that case your tool cannot talk to our API as it stands, I am afraid', 'accepting API keys with Bearer as well, since many tools offer nothing else'],
		quick: ['Which word goes before an API key in the Authorization header? I have seen both in examples online.', 'ApiKey, as in "Authorization: ApiKey lw_...". Examples from other services often use another word, which is where the confusion comes from.'],
		side: ['Not Bearer?', 'No, Bearer is what the Larchwood app itself sends once you are signed in. With an API key it has to be ApiKey.'],
		explain: 'A 401 with "sign in first" means the API could not tell who was asking, which almost always comes down to the Authorization header rather than the key itself.',
		art: { by: 'customer', turn: 1, make: (r, v) => fence([`$ curl -i https://api.larchwood.test/boards -H "Authorization: Bearer lw_${hex(r, 5)}......"`, 'HTTP/1.1 401 Unauthorized', 'content-type: application/json;charset=utf-8', `date: ${v.httpDate}`, 'content-length: 25', '', '{"error":"sign in first"}']) }
	},
	{
		area: 'general',
		weight: 1,
		subjects: ['Where can I see my API key?', 'Lost API key', 'Show key again', 'API key hidden'],
		open: [
			'I made an API key last month for our reporting spreadsheet, and now I need it for a second spreadsheet. Under Account I can see the key, "{label}", but not the key itself. Where can I find it?',
			'Our developer made an API key called "{label}" before she went on holiday and I need it for a new report. Can you tell me what it is?'
		],
		details: ['I thought I had saved it somewhere, but I cannot find it anywhere.', 'The first report is used by our directors every Monday, so I really do not want to break it.'],
		turns: [
			['Can you send it to me?', 'I am afraid nobody can, us included. The key is shown once, when it is made, and Larchwood keeps only a scrambled version of it that cannot be turned back into the key.'],
			['So what do I do now? I do not want to break the first report.', 'You will not need to touch it. Make a new key for the new report under Account, API keys, and copy it the moment it appears. Each report then has its own key, and the "last used" date in the list shows you which one is in use.'],
			['And the old key keeps working as before?', 'Yes, making a new key changes nothing about the old one. The first report carries on exactly as it is.']
		],
		solved: ['', 'Made a second key, labelled it "{label} 2", copied it straight away, and the second report works. Thanks.'],
		wishLead: 'That is fine, but could a new key stay visible for a few minutes? I lost my last one because I clicked away too quickly.',
		wish: ['A key cannot be shown again once you leave the page, by design', 'letting a new key be copied again for a short while after it is made'],
		quick: ['If I lose an API key, can you tell me what it was?', 'No, nobody can: it is shown only once, when it is made, and we keep only a scrambled version of it.'],
		side: ['Then what do I do if I lose one?', 'Make a new one under Account, API keys, and copy it the moment it appears. You can have more than one key, each with its own label.'],
		explain: 'That is deliberate: if the key were stored as it is, anyone who saw our database could use it, so all we keep is enough to recognise the key when it is used.',
		art: { by: 'customer', turn: 0, make: (r, v) => ['This is what I see under API keys:', '', '| Label | Created | Last used |', '| --- | --- | --- |', `| ${v.label} | ${int(r, 1, 28)} ${pick(r, ['July', 'August'])} 2026 | ${int(r, 1, 28)} ${pick(r, ['September', 'August'])} 2026, ${pad(int(r, 6, 9))}:00 |`].join('\n') }
	},
	{
		area: 'apifail',
		weight: 1,
		fail: 'POST /boards 500',
		subjects: ['500 error from API', 'Internal error when creating boards', 'API fails on our requests'],
		open: [
			'Our integration posts to /boards from a low-code automation tool and every request comes back as a 500. Creating a board in the app works fine. I suspect our end, but the error tells me nothing at all.',
			'Every board our automation tool tries to create fails with a server error. Is the API having problems?'
		],
		details: ['We set it up last week following a video, so it has never actually worked.', 'The tool shows a red cross and "Server error (500)", and nothing else.'],
		turns: [
			['Can you see anything in your logs?', 'Could you send me the body your tool sends, exactly as it goes out? Most tools have a "test step" or "show request" option.'],
			['This is what the test step shows.', 'Thank you, that is the cause, or at least half of it.'],
			['Is it something in the tool\'s settings, then?', 'Most likely, yes. Let me write out exactly what I see, so that you can compare it with the settings.']
		],
		waitAfter: 0,
		ask: 'the body your tool sends',
		solved: ['The body is not valid JSON: the names and the text need double quotes, like {"title": "{board}"}. Most tools have a JSON body type that takes care of that for you, and with a valid body the request will work.', 'Switched the body type to JSON and it works. Thanks!'],
		eng: ['Your tool sends the body as a web form rather than as JSON, and when that happens our API fails with a bare 500 instead of telling you what is wrong', 'answer 400 with a clear message when a request body is not valid JSON, instead of failing with a 500'],
		quick: ['Does the API take form data, or only JSON? Our tool offers both.', 'Only JSON, sent with Content-Type: application/json.'],
		side: ['What happens if we send a form by mistake?', 'At the moment you get an unhelpful server error rather than a clear message, so it is worth checking the body type first if anything fails.'],
		explain: 'The API expects every request body to be JSON, and it is strict about it: names and text in double quotes, and a Content-Type header that says application/json.',
		art: { by: 'customer', turn: 1, make: (r, v, outcome) => fence(['POST https://api.larchwood.test/boards', `Authorization: ApiKey lw_${hex(r, 4)}......`, outcome === 'eng' ? 'Content-Type: application/x-www-form-urlencoded' : 'Content-Type: application/json', '', outcome === 'eng' ? `title=${encodeURIComponent(v.board!).replace(/%20/g, '+')}` : `{title: '${v.board}'}`, '', 'Response: 500 Internal Server Error', `date: ${v.httpDate}`, 'content-length: 0']) }
	},
	{
		area: 'apifail',
		weight: 1,
		fail: 'GET /boards 401',
		failClient: 'no Authorization header',
		subjects: ['Integration stopped working', 'Everything 401 from the office', 'API works at home but not at work'],
		open: [
			'Since {day}, our scripts get a 401 "sign in first" on every request when they run on the office server. The same script with the same key works perfectly from my laptop at home.',
			'Our nightly report has failed three nights running with "sign in first" from your API. Nothing in the script has changed.'
		],
		details: ['Our IT team did some work on the network last weekend, but they say it cannot be related.', 'The report goes to our board of trustees, so I would like it working before the next meeting.'],
		turns: [
			['Did something change on your side?', 'Nothing has changed with API keys on our side recently. Could you run one request with curl -v from the office server and send me the whole output, with the key shortened?'],
			['Here it is.', 'Thanks. The request leaves your server with the Authorization header, but when it reaches us there is no header at all, so something between your server and us is taking it off. The output shows the request going through a proxy at {proxy}. Could your IT team have a look at that?']
		],
		waitAfter: 1,
		ask: 'news of what your IT team found on the proxy',
		solved: ['', 'Our IT team confirm the new proxy was removing the header. They have added an exception for api.larchwood.test and the scripts work again. Thanks for pointing us at it.'],
		quick: ['Could a proxy on our network stop the API from working? IT are changing ours next month.', 'Yes, if it removes the Authorization header on the way out, the API sees no credentials and answers 401.'],
		side: ['How would I know if that is happening?', 'Run the request with curl -v from the machine in question: if the output shows a proxy and the request fails while the same request works elsewhere, that is the likely cause.'],
		explain: 'From our side, a request with a valid key and a request with no key at all look very different in the logs, which makes this kind of problem easier to pin down than it sounds.',
		art: { by: 'customer', turn: 1, make: (r, v) => fence([`$ curl -v https://api.larchwood.test/boards -H "Authorization: ApiKey lw_${hex(r, 4)}......"`, `* Uses proxy env variable https_proxy == 'http://${v.proxy}'`, `*   Trying ${v.proxy}...`, `* Connected to ${v.proxy!.split(':')[0]} port ${v.proxy!.split(':')[1]}`, '* CONNECT tunnel: HTTP/1.1 negotiated', '> GET /boards HTTP/1.1', '> Host: api.larchwood.test', '> User-Agent: curl/8.5.0', `> Authorization: ApiKey lw_${hex(r, 4)}......`, '> Accept: */*', '>', '< HTTP/1.1 401 Unauthorized', '< content-type: application/json;charset=utf-8', `< date: ${v.httpDate}`, '< content-length: 25', '<', '{"error":"sign in first"}']) }
	},
	{
		area: 'general',
		weight: 2,
		subjects: ['Webhooks?', 'Notify our system when a board changes', 'Integration with our CRM', 'Push updates to another system'],
		open: [
			'We would like our CRM to know whenever a board is created or renamed in Larchwood, so that it can link the board to the client record. Do you have webhooks, or anything like them?',
			'Is there a way for Larchwood to tell our own system when someone creates a board? We want to keep a register of projects without typing everything twice.'
		],
		details: ['We have a developer for two days a month, so whatever we do needs to be simple.', 'At the moment someone copies the board names across by hand every Friday.'],
		turns: [
			['If not, is it planned?', 'Not today: the API answers requests, but it does not call out to other systems when something changes.'],
			['How do other customers deal with it?', 'Most poll GET /boards every few minutes and compare the result with what they had last time. A board keeps its id when it is renamed, so new and renamed boards are easy to spot.'],
			['Is there a limit on how often we can call GET /boards?', 'Nothing a poll every few minutes will come anywhere near. If you ever want to poll every few seconds, talk to us first.']
		],
		solved: ['', 'Polling every five minutes is fine for what we need. Our developer had it running within the hour. Thanks.'],
		wishLead: 'Polling feels wasteful for something that happens a few times a day. Please put us down for webhooks.',
		wish: ['There are no webhooks yet', 'webhooks that tell another system when a board is created, renamed or deleted'],
		quick: ['Do you have webhooks? We would like our own system to hear about new boards.', 'Not yet; most customers poll GET /boards every few minutes instead.'],
		side: ['How often is it reasonable to poll?', 'Every few minutes is fine. A board keeps its id when it is renamed, so comparing ids and titles with your last copy shows what changed.'],
		explain: 'Everything in the API works by your system asking and ours answering, which keeps it simple but means changes do not come to you by themselves.',
	},
	{
		area: 'general',
		weight: 1,
		subjects: ['CORS error', 'Calling the API from our intranet page', 'Blocked by CORS policy'],
		open: [
			'We have a small intranet page that lists our Larchwood boards. It calls your API from the browser with an API key, and Chrome blocks it with "has been blocked by CORS policy".',
			'Our intranet dashboard cannot load boards from Larchwood. The browser console shows a CORS error on every request.'
		],
		details: ['The page is only visible inside our network, if that makes a difference.', 'The same request works fine in Postman, which is what confuses me.'],
		turns: [
			['Do we need to register our domain with you somewhere?', 'There is nowhere to do that, I am afraid: the API does not accept calls from other websites\' pages in the browser.'],
			['Why not?', 'Mainly because an API key in a web page can be read by anyone who opens the page, which is not something we want to encourage. The usual way is to make the call from your own server and have the page ask your server.'],
			['So the key would be visible to anyone on our intranet?', 'To anyone who opens the page and looks at what it sends, yes, and anything they did with it would show as the person who made the key.']
		],
		solved: ['', 'Our developer moved the call to our server and the page fetches from there now. Works fine.'],
		wishLead: 'Setting up a server for one small page is more than we want to take on. Could you let us add our intranet domain somewhere?',
		wish: ['Calls from other websites in the browser are not allowed', 'allowing browser calls from a customer\'s own domains'],
		quick: ['Can we call the API from JavaScript in a web page? Our developer wants to try something small.', 'Not from the browser, I am afraid; the API does not accept calls from other websites\' pages. Make the call from your own server instead.'],
		side: ['Why does it work in Postman, then?', 'Postman is not a browser, so the browser\'s rules about calls from other websites do not apply to it.'],
		explain: 'Browsers block a page from calling another website\'s API unless that API says it is happy to be called from the page\'s address, and ours does not say so for any address.',
		art: { by: 'customer', turn: 0, make: (r, v) => fence([`Access to fetch at 'https://api.larchwood.test/boards' from origin 'https://intranet.${v.domain}' has been blocked by CORS policy: Response to preflight request doesn't pass access control check: No 'Access-Control-Allow-Origin' header is present on the requested resource.`, 'GET https://api.larchwood.test/boards net::ERR_FAILED', `Uncaught (in promise) TypeError: Failed to fetch    at loadBoards (boards.js:${int(r, 12, 80)})`]) }
	},
	{
		area: 'billing',
		weight: 2,
		pause: true,
		subjects: ['Invoice', 'VAT number on invoice', 'Need a PO number on our invoices', 'Invoice rejected by finance'],
		open: [
			'Our finance team has sent back last month\'s invoice because it does not show our VAT number. Could you reissue it with {vat}?',
			'We need our purchase order number on every invoice from now on, or our accounts team cannot pay them. The PO is {po}.'
		],
		details: ['Our finance team is very particular, and they will not pay anything that is not exactly right.', 'We changed accounting systems over the summer and the new one is stricter about these things.'],
		turns: [
			['Can I add it myself somewhere?', 'For future invoices, yes: under Billing, Invoice details, there is a field for a VAT number and one for a purchase order reference, and whatever you put there appears on every invoice from then on.'],
			['Great. And the invoice we already have?', 'I can have that one reissued. Which invoice number is it? It is at the top right of the PDF.'],
			['It is {inv}.', 'Thank you, I have passed it to our billing team.']
		],
		waitAfter: 1,
		ask: 'the number of the invoice to reissue',
		solved: ['Here is {inv} reissued with your details on it, attached. Future invoices will pick them up from Billing, Invoice details automatically.', 'Perfect, I have forwarded it to finance. Thanks for the quick turnaround.'],
		quick: ['Can our VAT number go on the invoices? Finance keep asking.', 'Yes, add it under Billing, Invoice details, and it appears on every invoice from then on.'],
		side: ['Will that change the invoices we already have?', 'No, only the ones issued from then on. If you need an older one reissued, send me its number and our billing team will do it.'],
		explain: 'Invoices are made on the first of each month from whatever is in your billing details at that moment, which is why last month\'s does not have the number.',
		art: {
			by: 'customer',
			turn: 0,
			make: (r, v) => {
				const seats = Number(v.seats);
				const price = v.plan === 'Business' ? 12 : 6;
				return ['The invoice as we have it:', '', '| Description | Quantity | Unit price | Amount |', '| --- | ---: | ---: | ---: |', `| Larchwood ${v.plan} plan, ${pick(r, ['August', 'September'])} 2026 | ${seats} | ${money(price)} | ${money(seats * price)} |`, `| VAT at 20% | | | ${money(seats * price * 0.2)} |`, `| **Total** | | | **${money(seats * price * 1.2)}** |`].join('\n');
			}
		}
	},
	{
		area: 'billing',
		weight: 1,
		pause: true,
		subjects: ['Charged twice', 'Two payments this month', 'Duplicate charge on our card'],
		open: [
			'Our card statement shows two payments to Larchwood on {chargeDate}, both for {amount}. We only have one subscription with you.',
			'I think we have been charged twice this month. Can someone check, please?'
		],
		details: ['I only noticed because our bookkeeper flagged it, so I have not looked into it myself yet.', 'We are a small team and every payment matters.'],
		turns: [
			['Can you refund one of them?', 'I am sorry about that, and I will get to the bottom of it. Could you send me the two lines from the statement, with their references, and the last four digits of the card?'],
			['Here they are.', 'Thank you. On our side I can see one payment on that date.'],
			['Do you need anything else from me?', 'No, that is everything. Let me match them against our records.']
		],
		waitAfter: 0,
		ask: 'the two statement lines and the last four digits of the card',
		solved: ['The second line is an authorisation from when the card details on your account were updated that day, not a payment. Banks show it as pending for a few days and then it drops off on its own, and no money leaves the account for it.', 'You are right, it disappeared from the statement this morning. Thanks for explaining.'],
		quick: ['Why is there a pending payment to you on our card? It appeared after I updated the card details.', 'That is the check we make when card details change, to make sure the card works.'],
		side: ['Will it go away by itself?', 'Yes, within a few days, and no money leaves the account for it.'],
		explain: 'We take payment once a month, on the date shown under Billing, and only ever once for each invoice.',
		art: { by: 'customer', turn: 1, make: (r, v) => ['| Date | Description | Reference | Amount |', '| --- | --- | --- | ---: |', `| ${v.chargeDate} | LARCHWOOD SUBSCRIPTION | ${hex(r, 10).toUpperCase()} | ${v.amount} |`, `| ${v.chargeDate} | LARCHWOOD SUBSCRIPTION (pending) | ${hex(r, 10).toUpperCase()} | ${v.amount} |`, '', `Card ending ${int(r, 1000, 9999)}`].join('\n') }
	},
	{
		area: 'billing',
		weight: 2,
		pause: true,
		plan: 'Team',
		subjects: ['Pricing question', 'Do we need Business for Okta?', 'Upgrade plan', 'SSO on our plan?'],
		open: [
			'We are on the Team plan with {seats} people and our IT team wants to manage accounts from Okta. Is that available on Team, or do we need to upgrade?',
			'Pricing question: what do we need in order to connect Entra ID to Larchwood? We are on Team at the moment.'
		],
		details: ['We are growing quickly and setting up each new person by hand is getting tedious.', 'Our IT team are moving every app we use onto single sign-on this year.'],
		turns: [
			['And if we do need to upgrade, what happens to our existing accounts?', 'Provisioning from Okta or Entra ID with SCIM is part of the Business plan. Your existing accounts carry on exactly as they are when you upgrade; nobody loses anything.'],
			['What would it cost to switch now, partway through our year?', 'You would pay the difference between the two plans for the rest of your billing year, worked out by the day. For {seats} seats that comes to about {amount}. I can send a formal quote if your finance team needs one.'],
			['Let us do it. Please send the SCIM details to {itemail} once it is switched.', 'Will do.']
		],
		waitAfter: 1,
		ask: 'your decision on whether to go ahead',
		solved: ['It is done: your account is on the Business plan from today, and I have sent the SCIM details to {itemail} as you asked.', 'Received, thank you. Our IT team will set it up next week.'],
		wishAfter: 1,
		wishLead: 'We cannot justify Business for {seats} people just for that. Please consider offering SCIM on Team.',
		wish: ['SCIM is only part of the Business plan for now', 'SCIM provisioning on the Team plan'],
		quick: ['Which plan do we need to connect Okta? Our IT team want to know before they plan anything.', 'Business: SCIM provisioning and single sign-on are part of that plan.'],
		side: ['Would our existing accounts be affected if we upgraded?', 'No, everyone carries on exactly as they are; you just gain the SCIM connection and single sign-on.'],
		explain: 'Plans can be changed at any time from Billing, and the change takes effect straight away.',
	},
	{
		area: 'general',
		weight: 1,
		plan: 'Free',
		subjects: ['Charity discount?', 'Discount for registered charities', 'Nonprofit pricing'],
		open: ['We are a small charity running {project} and we would like to move our volunteers onto Larchwood. Do you offer a discount for registered charities?', 'Do you have charity pricing? We are a registered charity and money is tight.'],
		details: ['Most of our volunteers are retired and not especially technical, so something simple matters to us.', 'We have been using the free plan for a few months to try it out.'],
		turns: [
			['We would need about {volunteers} seats.', 'We do: registered charities get {pct} percent off the Team and Business plans. To apply it I need a copy of your registration, or your charity number so that I can look you up.'],
			['Our number is {charity}.', 'Thank you, I have found you on the register.'],
			['Can the discount go on the free plan as well, or only on the paid plans?', 'Only on Team and Business, since the free plan costs nothing already. Most charities your size choose Team.']
		],
		waitAfter: 0,
		ask: 'your charity number or a copy of your registration',
		solved: ['The discount is now on your account and will show on your next invoice. Thank you for the work you do.', 'That is wonderful, thank you. The volunteers will be pleased.'],
		quick: ['Do you give charities a discount? I help out at one in my spare time.', 'Yes: registered charities get {pct} percent off Team and Business.'],
		side: ['What do they need to send you for that?', 'Their charity number, or a copy of their registration, and we apply it from the next invoice.'],
		explain: 'The discount is our way of making Larchwood affordable for organisations doing good work on small budgets.',
	},
	{
		area: 'general',
		weight: 1,
		fail: 'GET /boards 503',
		subjects: ['Was Larchwood down?', 'Problems this morning', 'Errors around lunchtime'],
		open: ['Between about {hour} and {hour2} on {day} we got errors on every page and nobody could open a board. Was that you, or something on our side?', 'Was there an outage on {day}? The whole office got error pages for a while.'],
		details: ['Our own internet was fine the whole time, as far as I could tell.', 'It came back on its own, but I would like to know what happened.'],
		turns: [
			['We had a client in the office at the time, so it was not ideal.', 'It was us, and I am sorry it happened while you had a client in. A database failover on our side took far longer than it should have, and for about {mins} minutes most requests failed.'],
			['Did we lose anything?', 'No. Everything saved before the failover is there, and anything that failed during it was not saved at all, so there are no half-saved boards. If someone created a board during that window and does not see it, it simply needs making again.'],
			['Has it been fixed, so that it will not happen again?', 'A failover itself is a normal thing that happens now and then. What went wrong was how long it took, and the team has changed the settings that caused the delay.']
		],
		solved: ['', 'Thanks for being straight with us. That is all I needed.'],
		wishLead: 'Is there a status page we could have checked? We spent twenty minutes restarting our router.',
		wish: ['We do not have a status page yet', 'a public status page that customers can subscribe to'],
		quick: ['Was there a problem on your side on {day}? A couple of us got error pages.', 'Yes, I am sorry: a database failover on our side took longer than it should, and for about {mins} minutes most requests failed.'],
		side: ['Was anything lost?', 'No. Anything saved before it is there, and anything that failed during it was not saved at all, so nothing is half-saved.'],
		explain: 'We keep two copies of our database running at all times, so that if one fails the other can take over; that switch is the failover.',
		art: { by: 'customer', turn: 0, make: (r) => fence(['GET https://api.larchwood.test/boards 502 (Bad Gateway)', 'GET https://api.larchwood.test/account 502 (Bad Gateway)', 'GET https://api.larchwood.test/boards 503 (Service Unavailable)', 'POST https://api.larchwood.test/boards 503 (Service Unavailable)', `GET https://api.larchwood.test/boards 200 (OK)  [${int(r, 20, 50)} minutes later]`]) }
	},
	{
		area: 'general',
		weight: 1,
		pause: true,
		subjects: ['Export our data', 'Copy of everything we have', 'Data request'],
		open: ['Our auditors want a copy of our project boards as they stood at the end of the financial year. Is there an export anywhere?', 'Could you send me a copy of the personal information Larchwood holds about me? I am asking under GDPR.'],
		details: ['I have looked through the settings and cannot see an export button.', 'There is no rush, but I would like it within the month if possible.'],
		turns: [
			['A spreadsheet would be ideal.', 'There is no export in the app yet, I am afraid, but I can put a copy together for you from our side. Which account, or accounts, should it cover?'],
			['Just mine, {email}.', 'Thank you, I will put it together.'],
			['Will it include everything, or just the board names?', 'Each board with its title and the date it was made, and your profile details. That is everything we keep about a board at the moment.']
		],
		waitAfter: 0,
		ask: 'the list of accounts the copy should cover',
		solved: ['Attached is a CSV with every board on the account, with its title and the date it was made, and your profile details at the top.', 'That is exactly what was wanted. Thank you.'],
		wishLead: 'Thanks. We will need this every year, though. Could there be an export button?',
		wish: ['There is no export in the app', 'an export of all your boards from the app, to CSV or JSON'],
		quick: ['Is there a way to export our boards? Our auditors sometimes ask.', 'Not from the app yet, but we can put a copy together for you from our side.'],
		side: ['What would that look like?', 'A CSV with each board\'s title and the date it was made, which opens in any spreadsheet.'],
		explain: 'Everything a board holds is in our database, so putting a copy together is something our team can do, even without a button for it.',
		art: {
			by: 'solved',
			turn: 0,
			make: (r, v) => {
				const rows = [`# profile: ${v.email}, "${v.shownName}", member since ${v.year}`, 'id,title,created'];
				for (let i = int(r, 6, 14); i > 0; i--) rows.push(`brd_${uuid(r)},${pick(r, boardTitles)},${int(r, 2024, 2026)}-${pad(int(r, 1, 12))}-${pad(int(r, 1, 28))}`);
				return fence(rows, 'csv');
			}
		}
	},
	{
		area: 'general',
		weight: 1,
		subjects: ['Screen reader', 'Accessibility of the board list', 'NVDA reads boards as "link"'],
		open: ['I am blind and use NVDA with Firefox. In the board list, every board is read out as "link" with no name, so I have to open each one to find out which it is.', 'One of our team uses a screen reader, and the board list is unusable for her: every entry is announced only as "link".'],
		details: ['Everything inside a board reads well, it is only the list.', 'We chose Larchwood partly because it seemed cleaner than the alternatives, so this is disappointing.'],
		turns: [
			['Is there a setting I have missed?', 'No, you have not missed anything, and thank you for telling us. Could you tell me which versions of NVDA and Firefox you use, so that our engineers can test with the same?'],
			['NVDA {nvda} and Firefox {ff}.', 'Thank you, that is all I need for now.'],
			['Is there anything I can do in the meantime?', 'The filter box above the list is announced properly, and typing part of a board\'s title narrows the list down to that board, which may be quicker than opening each one.']
		],
		waitAfter: 0,
		ask: 'the versions of NVDA and Firefox you use',
		eng: ['I heard the same thing with NVDA here: the links in the board list have no text a screen reader can announce', 'give every board link in the list its title as an accessible name'],
		quick: ['Is Larchwood usable with a screen reader? We are hiring someone who uses one.', 'Mostly, and we want to know about anything that is announced badly.'],
		side: ['Who should we tell if something is not?', 'Just write to us here with the screen reader and browser you use, and we will test with the same.'],
		explain: 'We test the main screens with a screen reader before every release, but it is clear that the board list slipped through.',
	},
	{
		area: 'general',
		weight: 1,
		subjects: ['Date format', 'American dates', 'Dates show month first'],
		open: ['Dates in Larchwood show as {mdy} and half my team read that as {dmy}. Can we have day-first dates?', 'Why are the dates in the app the American way round? It caused a mix-up with a deadline last week.'],
		details: ['Nobody on the team is American, so it is a bit of a mystery.', 'It matters because our deadlines are all on the boards.'],
		turns: [
			['We are in {country}, if that helps.', 'It does. The app shows dates in the format your browser\'s language setting asks for, so the order depends on each person\'s browser rather than on your account.'],
			['So we would have to change every browser?', 'In most cases it is one setting: the browser\'s language, English (United States) as against English (United Kingdom), for example.'],
			['Does it affect the dates in the API too?', 'No, the API always gives dates in the same international format, year first, whatever anyone\'s browser says.']
		],
		solved: ['', 'Changed my browser to English (UK) and the dates are the right way round. I have told the team.'],
		wishLead: 'Changing the browser language is not allowed on our managed laptops. Could you add a setting?',
		wish: ['The format follows each browser and cannot be set for the account', 'choosing a date format for the whole account, whatever the browser says'],
		quick: ['Why do dates show month first for some of us and day first for others?', 'The app follows each browser\'s language setting, so two people on the same team can see different orders.'],
		side: ['So which setting should they change?', 'The browser\'s language: English (United Kingdom) gives day-first dates.'],
		explain: 'The app does not store dates in any particular order; it shows each one in the way the browser asks for.',
	},
	{
		area: 'api',
		weight: 1,
		subjects: ['Wrong dates from the API', 'createdAt is a day out', 'Times in API responses'],
		open: ['Boards we create in the evening show the next day\'s date when we read createdAt from the API, so our weekly report puts them in the wrong week. We are in Toronto.', 'The creation dates the API gives us are a day ahead for anything made after about eight in the evening. We are in Toronto, if that matters.'],
		details: ['The report feeds our weekly planning meeting, so a board in the wrong week gets missed.', 'Boards made during the day are fine, which is what makes it odd.'],
		turns: [
			['Is your server clock wrong?', 'No, the clock is right, I promise. Could you send me one board as the API returns it, and the time you created it?'],
			['This one was created at {localtime} our time.', 'Thank you, that confirms what I thought.'],
			['So it is not a bug?', 'No, it is working as intended, though I can see why it looks like one from where you sit.']
		],
		waitAfter: 0,
		ask: 'one board as the API returns it',
		solved: ['createdAt is in UTC: the Z at the end of the value means exactly that. Your board was created at {utc} UTC, which was {localtime} in Toronto. If your report converts the value to your time zone before it takes the date, the evening boards will land in the right week.', 'Converted in the report and the weeks are right now. Thanks.'],
		wishLead: 'Our reporting tool cannot convert time zones. Could the API give local times?',
		wish: ['The API always gives times in UTC', 'a way to ask the API for times in a given time zone'],
		quick: ['What time zone are the API\'s createdAt values in? Our report and the app disagree.', 'UTC; the Z at the end of the value says so.'],
		side: ['So we convert them ourselves?', 'Yes, convert to your own time zone before taking the date, and evening boards land on the right day.'],
		explain: 'Every time the API gives, createdAt included, is in UTC, the same for every customer wherever they are, so that scripts in different places agree.',
		art: { by: 'customer', turn: 1, make: (r, v) => fence([JSON.stringify({ id: `brd_${uuid(r)}`, title: v.board, createdAt: v.utcIso }, null, 2)], 'json') }
	},
	{
		area: 'none',
		weight: 1,
		subjects: ['"Try it first" does nothing', 'Website button broken', 'Try button not working on iPhone'],
		open: ['On your website, the "try it first" button does nothing when I tap it on my iPhone. On my laptop it works.', 'I wanted to show Larchwood to a colleague on my phone and the "try it first" button just sits there.'],
		details: ['I was recommending you to a friend at the time, so it was a little awkward.', 'Everything else on the website works on the phone.'],
		turns: [
			['Is it broken for everyone on iPhone?', 'Not as far as I know. Could you tell me whether you are using Safari, and whether the tab is a private one?'],
			['It is Safari, and yes, a private tab.', 'Thank you, that is almost certainly it.'],
			['Does that mean it will never work in a private tab?', 'I would not say never, but for now it needs an ordinary tab.']
		],
		waitAfter: 0,
		ask: 'a word on whether you are using Safari in a private tab',
		solved: ['In a private tab, Safari does not let the page keep what it needs to remember you from one page to the next, so the button cannot finish. In an ordinary tab it will work.', 'Ordinary tab, works first time. Thanks!'],
		eng: ['In a private tab the button fails without saying anything. Even if the page cannot work there, it should say so', 'make the "try it first" button show a message when the browser will not let it work, instead of doing nothing'],
		quick: ['Does "try it first" work in a private tab? I tried to show a friend and nothing happened.', 'Not in Safari\'s private tabs, I am afraid.'],
		side: ['Is that on purpose?', 'Not exactly: Safari\'s private tabs stop the page keeping what it needs from one page to the next. An ordinary tab works.'],
		explain: 'The button makes a temporary user for you and needs the browser to remember it from one page to the next.',
	},
	{
		area: 'general',
		weight: 1,
		subjects: ['Android app?', 'Is there a mobile app', 'Larchwood on my phone'],
		open: ['Is there a Larchwood app for Android? I can only find something called "Larch", which looks like a gardening app.', 'Do you have an app for phones? Half my team are out on site all day.'],
		details: ['Most of the team only has a phone with them during the day.', 'We would use it mostly to tick things off and check what is next.'],
		turns: [
			['I am out on site most of the day.', 'There is no app in the stores, but the website works in a phone\'s browser, and you can add it to your home screen so that it opens like an app: in Chrome, open the menu and choose "Add to Home screen".'],
			['Will it still work if we have no signal?', 'It needs a connection, I am afraid: it loads what it needs each time you open it.']
		],
		solved: ['', 'Added it to my home screen and it works well enough. Thanks.'],
		wishLead: 'The website needs signal, and we often have none on site. An app that works offline would be the real answer.',
		wish: ['There is no app for phones', 'a phone app that works offline on site'],
		quick: ['Is there a phone app? Half of us are out and about all day.', 'Not in the stores, but the website works in a phone\'s browser.'],
		side: ['So how do people use it on their phones?', 'In the browser; adding the site to the home screen makes it open like an app.'],
		explain: 'Most people who use Larchwood on the go use the website in their phone\'s browser.',
	},
	{
		area: 'general',
		weight: 1,
		subjects: ['How do I print a board?', 'Printing cuts off the board', 'Print layout'],
		open: ['How do I print a board? We put the week\'s board on the wall in the workshop, and printing from the browser cuts it off halfway.', 'Our printouts of boards come out cut off on the right. Is there a print button somewhere?'],
		details: ['Not everyone in the workshop has a screen, so the paper copy matters.', 'We have tried three browsers and they all do the same.'],
		turns: [
			['We print on A3, if that matters.', 'It does. Printing from the browser prints the page as it appears on screen, which does not suit a wide board. Choosing landscape and "fit to page width" in the print dialogue gets most boards onto one A3 sheet.'],
			['And if I want the board to look as it does on screen?', 'Turning on "background graphics" in the same dialogue keeps the colours. Most browsers turn them off for printing to save ink.']
		],
		solved: ['', 'Landscape plus fit to width did it. The workshop has its board back.'],
		wishLead: 'Fit to width makes the text tiny on our bigger boards. A proper print view would be great.',
		wish: ['There is no print layout for boards yet', 'a print layout for boards that fits on a sheet of paper'],
		quick: ['Is there a way to print a board? We would like one on the wall.', 'Print from the browser in landscape with "fit to page width" in the print dialogue.'],
		side: ['Does that work on A4 too?', 'For smaller boards, yes; wide boards are easier to read on A3.'],
		explain: 'Boards are designed for the screen first, which is why printing needs a little help from the print dialogue.',
	}
];

// Questions support asks on the way, by area: what support asks, what the customer answers, and the thanks.
const diagnostics: Record<Area, [string, string, string][]> = {
	web: [
		['which browser and version you use, and on what kind of computer', 'It is {browserName}, on {deviceName}.', 'Thanks for the browser details; I am testing with the same.'],
		['roughly when it last happened, so that I can look for it in our logs', 'The last time was at about {clockTime} on {day}.', 'Thanks for the time; I found your requests from then in our logs.'],
		['whether anyone else on your team sees the same thing', '{name2} says she has not noticed anything, but she uses Larchwood far less than I do.', 'Good to know that it is not the whole team.'],
		['whether it also happens in a private window, which rules out browser extensions', 'I tried a private window and it is just the same.', 'Thanks for trying the private window; that rules out extensions.'],
		['a screenshot of what you see, if it is easy to take one', 'Screenshot attached. [attachment: screenshot-{logDay}.png]', 'Thank you for the screenshot.']
	],
	api: [
		['what the script is written in, or which tool runs it', 'It is a small {lang} script.', 'Thanks, that is useful to know.'],
		['the label of the API key the script uses (the label only, never the key itself), so that I can find it on the account', 'The key is labelled "{label}".', 'Thanks, I can see "{label}" on the account.']
	],
	apifail: [
		['what the script is written in, or which tool runs it', 'It is a small {lang} script.', 'Thanks, that is useful to know.'],
		['the label of the API key the script uses (the label only, never the key itself), so that I can find it on the account', 'The key is labelled "{label}".', 'Thanks, I can see "{label}" on the account.'],
		['whether anyone else at {co} runs scripts against the API, so that I look at the right requests', 'Only me, as far as I know.', 'Thanks, that makes the logs easier to read.']
	],
	account: [
		['the email address of the account, if it is not the one you are writing from', 'It is {email}.', 'Thanks for confirming the address.'],
		['roughly when you first started using Larchwood', 'I think it was around {month} {year}.', 'Thanks, that matches what I can see.'],
		['whether anyone else uses the same account', 'No, it is just me.', 'Thanks.']
	],
	sso: [
		['the name of the person who looks after your identity provider, in case I need to ask them something directly', 'That is {name2} in our IT team, at {itemail}.', 'Thanks, I have noted {name2} on the account.'],
		['when the SCIM connection was first set up', 'Our IT team set it up in {month}, I believe.', 'Thanks.'],
		['roughly how many people you have provisioned so far', 'About {seats}, which is more or less everyone.', 'Thanks, that matches what I can see.']
	],
	billing: [
		['the email address of the billing contact on the account', 'Invoices go to accounts@{domain}.', 'Thanks, that matches what I have.'],
		['whether you pay by card or by invoice', 'By card, the company one.', 'Thanks.']
	],
	general: [
		['which plan your account is on', 'We are on the {plan} plan.', 'Thanks.'],
		['roughly how many of you use Larchwood', '{howMany}', 'Thanks.']
	],
	none: []
};
const askLeads: [string, string][] = [['While I look into it, it would also help to know ', '.'], ['Separately, could you tell me ', '?'], ['One more thing that would help: ', '.'], ['Could you also let me know ', '?']];
const areaNotes: Record<Area, string[]> = {
	web: ['Tried it here in two browsers; nothing obviously wrong at first.', 'Looked at the account\'s recent requests; nothing failing on our side.'],
	api: ['Looked at the account\'s recent API requests.'],
	apifail: ['Searched the API logs for the account around the time given; the failures are there, all from the same key.', 'All the failing requests come from one address, so it is one script, not several.'],
	account: ['Account looks normal; nothing changed on it recently.'],
	sso: ['Their SCIM connection is working; requests from their identity provider arrive every forty minutes or so.'],
	billing: ['Billing history looks normal; every invoice paid on time.'],
	general: ['Nothing unusual on the account.'],
	none: []
};

// Words around the matter, shared by all tickets.
const greetings = ['Hi,', 'Hello,', 'Hi there,', 'Hello Larchwood team,', 'Good morning,', 'Dear support,', '', 'Hi support,'];
const laterGreetings = ['Hi {agent},', 'Hello {agent},', 'Thanks {agent}.', '', '', 'Hi again,'];
const customerSignoffs = ['Thanks,\n{name}', 'Many thanks,\n{full}', '{name}', 'Cheers,\n{name}', 'Best wishes,\n{full}\n{co}', 'Kind regards,\n{full}\n{role}, {co}\n{phone}', 'Thanks in advance,\n{name}\n\nSent from my phone', 'Regards,\n{full} | {role}\n{co}'];
const shortSignoffs = ['{name}', 'Thanks,\n{name}', 'Cheers,\n{name}', '{name}\n\nSent from my phone', 'Thanks again,\n{name}'];
const supportGreetings = ['Hi {name},', 'Hello {name},', 'Hi {name},', 'Dear {name},'];
const supportOpeners = ['Thanks for getting in touch.', 'Thanks for writing in, and sorry for the trouble.', 'Sorry to hear about this, and thanks for the detail.', 'Thank you for the clear description, it helps a lot.', '', 'Thanks for your message.'];
const supportSignoffs = ['Best,\n{agent}\nLarchwood support', 'Kind regards,\n{agent}', 'Thanks,\n{agent} | Larchwood support', 'All the best,\n{agent}', 'Best wishes,\n{agent}\nLarchwood support'];
const backstories = [
	'We are a team of {seats} and moved to Larchwood from a wall of sticky notes in {month}.',
	'I am not technical, so please bear with me.',
	'We have been using Larchwood for about a year and this is the first time I have had to write in.',
	'I look after the boards for the whole office, so everyone comes to me when something is wrong.',
	'This is holding up our {project}, so I would be grateful for a quick answer.',
	'I did look at the help pages first but could not find anything about this.',
	'Apologies if this has been asked before.',
	'My colleague {name2} said you were helpful last time, so here I am.',
	'We only moved over to Larchwood this term and are still finding our way.',
	'I am writing on behalf of the whole team, so do reply to me.',
	'We use Larchwood for {usage}, so it is open on most screens here all day.',
	'Larchwood is where we keep {usage}, and has been for a couple of years.',
	'Most of what we do runs through Larchwood now, mainly {usage}.'
];
const usages = ['planning the week\'s jobs', 'client projects from first call to invoice', 'school trips and events', 'our content calendar', 'volunteer shifts', 'kitchen prep and supplier orders', 'sprint planning', 'patient follow-ups', 'shoot schedules', 'grant deadlines', 'maintenance requests from tenants', 'translation jobs and deadlines'];
const tried = ['I have tried a different browser and it is the same.', 'I have restarted the laptop, for what it is worth.', '{name2} tried on her machine and gets the same result.', 'I have tried it at different times of day, in case that matters.'];
const asides = ['Sorry for the slow reply, it has been a week of meetings.', 'Half the office is off with a cold, so it has been chaos here.', 'Thanks for being so quick, by the way.', 'I am on my phone, so excuse the typos.', 'Sorry, I was out on site all day yesterday.', 'Apologies, I missed your email in the noise.'];
const tips = ['If anything about this is unclear, reply here and I will pick it up.', 'I have added a note to your account so that whoever picks this up next has the background.', 'Do reply to this email rather than starting a new one, so that everything stays in one thread.'];
const notes = ['Account checked: {plan} plan, {seats} seats, customer since {month} {year}.', 'Nothing unusual on the account.', 'Second ticket from {co} this term; the first was about something else entirely.', 'Customer is calm and clear, no need to escalate.', 'Checked with {agent2} that nobody else has this open.', 'Customer\'s company has {seats} seats on {plan}; renewal is not due for months, so no billing angle.'];
const handovers = ['{agent} here, picking this up while {prev} is out today.', 'My colleague {prev} is away, so I am taking this over; I have read the thread.', 'I am {agent}, and I am looking after this while {prev} is on leave.'];
const nudges = ['Just checking in on this one. When you have a moment, could you send me {ask}? Then I can carry on.', 'I wanted to follow up on my last message: I still need {ask} before I can go any further.', 'A gentle reminder that I am waiting for {ask}. No rush if things have moved on at your end.'];
const lateReplies = ['Sorry, this got buried under everything else.', 'Apologies for going quiet, I was away last week.', 'Sorry, I only just saw your messages.', 'Sorry for the delay, things have been mad here.'];
const engAcks = ['Thank you. Please do keep me posted.', 'OK. Do you have any idea how long it will take?', 'Thanks for taking it seriously. We will work around it for now.', 'Appreciated. I will let the team know.', 'Thanks. I will check back in a week or so if I have not heard.'];
const engUpdates = ['Quick update: {eng} has picked this up and is looking at it this week. No date yet, but it is moving.', 'A short update so that you know this has not been forgotten: {eng} is on it. I will write again as soon as there is news.'];
const featureAcks = ['That is a shame, but thanks for passing it on.', 'OK. I hope it gets picked up; we would use it every day.', 'Fair enough. Thanks for being honest about it.', 'Thanks. Please do let me know if it ever happens.', 'Understood. Shame, but thanks.'];
const featureFrames = ['I have logged it with our product team as a request for {wish}. I cannot promise when, or whether, it will be built, but requests from customers are what decide the order.', 'I have added your vote to the request for {wish}. I am afraid I cannot give a date, but every request is read.', 'I have passed it on as a request for {wish}. I will not pretend it is coming soon, but it is now on the list.'];
const solvedCloses = ['Glad that is sorted. I will close this ticket, but reply any time if it comes back.', 'Great, thanks for letting me know.', 'Brilliant. Have a good rest of the week.', 'Good to hear. Shout if anything else comes up.'];
const reopens = ['Sorry, me again. It was fine for a few days but it is happening again this morning, and nothing has changed on our side.', 'Bad news, I am afraid: it is back. Same thing as before, since yesterday afternoon.', 'I spoke too soon. It happened twice more today, and to {name2} as well.'];
const reopenLeads = ['I am sorry it has come back. I have looked at it again, more closely this time, and this one is on our side after all.', 'Thanks for telling me. Looking at it again with fresh eyes, it is not just your setup.'];
const mores = ['That works for now, but honestly it would be much better if Larchwood did this itself.', 'Thanks, we are doing that. Could I ask for it to be properly supported, though? It feels like a workaround.'];
const moreLeads = ['That is fair, and you are not the first to say so.', 'I agree it is not ideal.'];
const bridges = ['While I have you, one more question.', 'One more thing:', 'Something unrelated:', 'Also, a different question.', 'Another small question:'];
const autoReply = 'Thank you for contacting Larchwood support. This is an automatic reply to let you know we have your message; we reply to most messages within one working day. To add anything, reply to this email.';
const chatHellos = ['Hi, is anyone there?', 'Hello', 'Hi, I have a question', 'Hello, hoping you can help'];
const chatWelcomes = ['Hi {name}, you are through to {agent}. How can I help?', 'Hello {name}, {agent} here. What can I do for you?', 'Hi {name}, thanks for waiting. I am {agent}; what is up?'];

type Kind = 'customer' | 'support' | 'note' | 'auto' | 'system';
interface Msg {
	kind: Kind;
	who: string;
	at: number;
	text: string;
	chat: boolean;
}

const ticket = (index: number): { name: string; text: string } => {
	const r = mulberry32(0x1a7c4 + index * 7919);
	const topic = weighted(r, topics.map((item) => [item, item.weight] as const));
	const first = pick(r, firstNames);
	const last = pick(r, surnames);
	const company = pick(r, companies);
	const domain = domainOf(company);
	const plan = topic.plan ?? weighted(r, [['Free', 1], ['Team', 5], ['Business', 2]] as const);
	const n3 = int(r, 104, 460);
	const seats = topic.subjects[0] === 'Okta import stops at 100' ? n3 : plan === 'Free' ? int(r, 1, 3) : plan === 'Team' ? int(r, 3, 40) : int(r, 25, 380);
	const agentList = shuffle(r, agents);
	const startDay = workdays[Math.floor((index * workdays.length) / ITEMS)]!;
	const channel = weighted(r, [['email', 7], ['chat', 1], ['form', 2]] as const);
	let t = startDay * 1440 + (channel === 'chat' ? int(r, 8 * 60 + 30, 17 * 60) : int(r, 7 * 60, 21 * 60));
	const opened = t;
	const local = int(r, 20 * 60, 23 * 60 + 40);
	const createdDay = startDay - int(r, 2, 9);
	const lastName = slug(last.split(' ').pop()!);
	const emailStyle = r();
	const email = emailStyle < 0.4 ? `${slug(first)}@${domain}` : emailStyle < 0.8 ? `${slug(first)}.${lastName}@${domain}` : `${slug(first).charAt(0)}${lastName}@${domain}`;
	const titles = shuffle(r, boardTitles);
	const year = pick(r, [2024, 2025, 2025]);
	const createdMonth = int(r, 1, 12);
	const createdDate = int(r, 1, 28);
	const [mdyMonth, mdyDay] = shuffle(r, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
	const v: Values = {
		name: first,
		last,
		full: `${first} ${last}`,
		email,
		emailCaps: email.replace(/^(.)/, (c) => c.toUpperCase()).replace(/@(.)/, (_, c: string) => `@${c.toUpperCase()}`),
		email2: `${slug(first)}${int(r, 1, 99)}@example.com`,
		typo: email.replace('@', pick(r, ['@@', '2@', '.@'])),
		co: company,
		domain,
		olddomain: domainOf(pick(r, companies.filter((other) => other !== company))),
		plan,
		seats: String(seats),
		role: pick(r, roles),
		phone: `01632 960${int(r, 100, 999)}`,
		agent: agentList[0]!,
		agent2: agentList[1]!,
		eng: pick(r, engineers),
		name2: pick(r, colleagues),
		board: titles[0]!,
		board2: titles[1]!,
		n: String(int(r, 2, 9)),
		n2: String(int(r, 60, 420)),
		n3: String(n3),
		n4: String(int(r, 40, 300)),
		hour: pick(r, ['nine', 'half past nine', 'ten', 'eight', 'quarter to ten']),
		hour2: pick(r, ['quarter past eleven', 'half past twelve', 'one', 'twenty to twelve']),
		month: MONTHS[createdMonth - 1]!,
		year: String(year),
		day: WEEKDAYS[weekday((startDay - int(r, 1, 4)) * 1440)]!,
		olddate: `${createdDate} ${MONTHS[createdMonth - 1]} ${year}`,
		createdIso: `${year}-${pad(createdMonth)}-${pad(createdDate)}T${pad(int(r, 7, 20))}:${pad(int(r, 0, 59))}:${pad(int(r, 0, 59))}.${int(r, 100, 999)}Z`,
		userId: `usr_${uuid(r)}`,
		project: pick(r, projects),
		label: pick(r, keyLabels),
		amount: money(int(r, 18, 420) + pick(r, [0, 0.5, 0.2])),
		chargeDate: `${int(r, 1, 28)} ${pick(r, ['August', 'September'])}`,
		vat: `GB ${int(r, 100, 999)} ${int(r, 1000, 9999)} ${int(r, 10, 99)}`,
		po: `PO-2026-${String(int(r, 100, 9999)).padStart(4, '0')}`,
		inv: `LW-2026-${int(r, 10000, 19999)}`,
		proxy: pick(r, [`proxy.${domain}:3128`, `10.${int(r, 0, 40)}.${int(r, 0, 9)}.${int(r, 2, 250)}:8080`, `gateway.${domain}:8080`]),
		itemail: `it@${domain}`,
		pct: String(pick(r, [30, 40, 50])),
		charity: String(int(r, 1_000_000, 1_199_999)),
		mins: String(int(r, 18, 52)),
		volunteers: String(int(r, 8, 60)),
		usage: pick(r, usages),
		howMany: seats === 1 ? 'Just me at the moment.' : `About ${seats} of us.`,
		nvda: pick(r, ['2025.3', '2025.1', '2024.4']),
		ff: String(int(r, 138, 145)),
		mdy: `${pad(mdyMonth!)}/${pad(mdyDay!)}/2026`,
		dmy: `${mdyMonth} ${MONTHS[mdyDay! - 1]}`,
		country: pick(r, ['the UK', 'Ireland', 'Australia', 'New Zealand', 'South Africa']),
		localtime: `${pad(Math.floor(local / 60))}:${pad(local % 60)}`,
		utc: clock(local + 240),
		utcIso: `${dateOf(createdDay * 1440 + local + 240).toISOString().slice(0, 17)}${pad(int(r, 0, 59))}.${int(r, 100, 999)}Z`,
		browserName: pick(r, browsers),
		deviceName: pick(r, devices),
		clockTime: `${pad(int(r, 8, 17))}:${pad(int(r, 0, 59))}`,
		lang: pick(r, languages),
		logDay: dateOf(t).toISOString().slice(0, 10),
		httpDate: httpDate(t)
	};
	v.shownName = topic.subjects[0] === 'My name looks odd' ? pick(r, [`  ${first} ${last}`, '   ', ` ${first}`]) : r() < 0.75 ? `${first} ${last}` : first;
	const f = (text: string) => fill(r, text, v);

	// The ending, and a twist that sometimes changes it in the last messages.
	const outcomes: [Outcome, number][] = [];
	if (topic.solved) outcomes.push(['solved', 4]);
	if (topic.eng) outcomes.push(['eng', 3]);
	if (topic.wish) outcomes.push(['wish', 3]);
	if (topic.waitAfter !== undefined) outcomes.push(['wait', 2]);
	const outcome = weighted(r, outcomes);
	let twist: 'reopen' | 'late' | 'more' | null = null;
	if (outcome === 'eng' && topic.solved && topic.recurs && r() < 0.6) twist = 'reopen';
	else if (outcome === 'solved' && topic.waitAfter !== undefined && r() < 0.4) twist = 'late';
	else if (outcome === 'wish' && topic.solved && topic.wishAfter === undefined && r() < 0.45) twist = 'more';
	const lastTurn = outcome === 'wait' || twist === 'late' ? topic.waitAfter! : outcome === 'wish' && topic.wishAfter !== undefined ? topic.wishAfter : topic.turns.length - 1;
	const reach = twist === 'late' ? topic.turns.length - 1 : lastTurn;

	// Extra matters along the way: a side question with a follow-up, and support's own questions.
	const extras = new Map<number, { customer: string[]; support: string[] }>();
	const add = (turn: number, who: 'customer' | 'support', text: string, first = false) => {
		if (!extras.has(turn)) extras.set(turn, { customer: [], support: [] });
		if (first) extras.get(turn)![who].unshift(text);
		else extras.get(turn)![who].push(text);
	};
	const sides = shuffle(r, topics.filter((other) => other !== topic && (!other.plan || other.plan === plan) && (plan !== 'Free' || other.area !== 'billing')));
	const sideAt = topic.newcomer ? -1 : r() < 0.4 ? 0 : reach >= 1 && r() < 0.8 ? 1 : -1;
	if (sideAt >= 0) {
		const side = sides[0]!;
		add(sideAt, 'customer', sideAt === 0 ? `${pick(r, ['A quick one first, before the real reason I am writing.', 'Two things, the small one first.', 'Before the main thing:'])} ${f(side.quick[0])}` : `${pick(r, bridges)} ${f(side.quick[0])}`);
		add(sideAt, 'support', `${pick(r, sideAt === 0 ? ['Your quick question first.', 'To take the small one first.', 'First, the quick one.'] : ['On your other question:', 'As for your second question:', 'And on the other thing you asked:'])} ${f(side.quick[1])}`);
		if (reach >= sideAt + 1) {
			add(sideAt + 1, 'customer', `${pick(r, ['On the other thing, though.', 'Going back to my small question.', 'About the other matter.', ''])} ${f(side.side[0])}`.trim());
			add(sideAt + 1, 'support', f(side.side[1]));
		}
	}
	const second = reach >= 3 ? 2 : reach >= 2 && sideAt !== 1 ? 2 : -1;
	if (second >= 0 && !topic.newcomer && r() < 0.7) {
		const side = sides[1]!;
		add(second, 'customer', `${pick(r, bridges)} ${f(side.quick[0])}`);
		add(second, 'support', `${pick(r, ['On your other question:', 'And to answer your other question:', 'As for the other thing you asked:'])} ${f(side.quick[1])}`);
		if (reach >= second + 1) {
			add(second + 1, 'customer', f(side.side[0]));
			add(second + 1, 'support', f(side.side[1]));
		}
	}
	const asks = shuffle(r, diagnostics[topic.area]);
	let used = 0;
	for (let i = 0; i < Math.min(reach, asks.length, r() < 0.75 ? 2 : 1); i++, used++) {
		const [ask, answer, thanks] = asks[i]!;
		const [lead, stop] = pick(r, askLeads);
		add(i, 'support', `${lead}${f(ask)}${stop}`);
		add(i + 1, 'customer', cap(f(answer)), true);
		add(i + 1, 'support', f(thanks));
	}

	const msgs: Msg[] = [];
	let chat = channel === 'chat';
	let agent = v.agent!;
	let supportCount = 0;
	const style = r();

	const officeHours = () => {
		const minute = ((t % 1440) + 1440) % 1440;
		if (weekday(t) % 6 === 0 || minute >= 18 * 60) {
			t = (Math.floor(t / 1440) + 1) * 1440 + 8 * 60 + int(r, 0, 80);
			while (weekday(t) % 6 === 0) t += 1440;
		} else if (minute < 8 * 60) t = Math.floor(t / 1440) * 1440 + 8 * 60 + int(r, 0, 60);
	};
	const wait = (low: number, high: number) => {
		const step = int(r, low, high);
		t += step;
		if (chat && step > 30) chat = false;
	};
	const customerWait = () => {
		if (chat) return wait(1, 4);
		wait(25, r() < 0.6 ? 300 : 1900);
		const minute = t % 1440;
		if (minute < 7 * 60) t += 7 * 60 - minute + int(r, 0, 90);
		if (minute > 22 * 60 + 30) t += 24 * 60 - minute + 7 * 60 + int(r, 0, 120);
	};
	const supportWait = () => {
		if (chat) return wait(1, 5);
		wait(20, 280);
		officeHours();
	};
	const push = (kind: Kind, text: string, who = '') => msgs.push({ kind, who, at: t, text, chat: chat && (kind === 'customer' || kind === 'support' || kind === 'system') });
	const paragraphs = (parts: (string | undefined)[]) => parts.filter((part): part is string => !!part && part.trim() !== '');

	const customer = (body: string[], opening = false) => {
		const parts = paragraphs(body);
		if (chat) {
			parts.forEach((part, i) => {
				if (i > 0) t += int(r, 0, 2);
				push('customer', part, first);
			});
			return;
		}
		const greeting = opening ? f(pick(r, greetings)) : style < 0.3 ? '' : fill(r, pick(r, laterGreetings), { ...v, agent });
		const signoff = opening ? f(pick(r, customerSignoffs)) : style < 0.2 ? '' : f(pick(r, shortSignoffs));
		push('customer', paragraphs([greeting, ...parts, signoff]).join('\n\n'), first);
	};
	const support = (body: string[], opening = false) => {
		supportCount++;
		if (!chat && supportCount > 1 && t - opened > 1440 && r() < 0.15) {
			const prev = agent;
			agent = agentList.find((name) => name !== prev && name !== v.agent) ?? v.agent2!;
			body = [fill(r, pick(r, handovers), { ...v, agent, prev }), ...body];
		}
		const parts = paragraphs(body);
		if (chat) {
			parts.forEach((part, i) => {
				if (i > 0) t += int(r, 0, 2);
				push('support', part, agent);
			});
			return;
		}
		const vv = { ...v, agent };
		push('support', paragraphs([fill(r, pick(r, supportGreetings), vv), opening ? pick(r, supportOpeners) : '', ...parts, r() < 0.2 ? pick(r, tips) : '', fill(r, pick(r, supportSignoffs), vv)]).join('\n\n'), agent);
	};
	const note = (text: string) => push('note', fill(r, text, { ...v, agent }), agent);
	const artFor = (turn: number, by: 'customer' | 'note' | 'solved') => {
		if (!topic.art || topic.art.turn !== turn || topic.art.by !== by) return '';
		v.httpDate = httpDate(t - int(r, 3, 40));
		v.logDay = dateOf(t - (t % 1440 < 9 * 60 ? 1440 : 0)).toISOString().slice(0, 10);
		return f(topic.art.make(r, v, outcome));
	};

	// The opening.
	if (chat) {
		push('customer', pick(r, chatHellos), first);
		wait(1, 3);
		push('support', fill(r, pick(r, chatWelcomes), v), agent);
		wait(1, 3);
	}
	const opening = extras.get(0)?.customer ?? [];
	const details = shuffle(r, topic.details);
	customer(
		[
			...opening,
			`${opening.length ? `${pick(r, ['Now the main thing.', 'The main reason I am writing:', 'And the real problem:'])} ` : ''}${f(pick(r, topic.open))}`,
			r() < 0.8 ? f(details[0]!) : '',
			r() < 0.5 ? f(details[1]!) : '',
			f(topic.turns[0]![0]),
			!chat && r() < 0.55 ? f(pick(r, backstories)) : '',
			topic.area === 'web' && !chat && r() < 0.4 ? f(pick(r, tried)) : '',
			artFor(0, 'customer')
		],
		true
	);
	if (channel !== 'chat' && r() < 0.35) {
		t += 1;
		push('auto', autoReply, 'Larchwood support');
	}
	if (!chat && r() < 0.12) {
		t += int(r, 3, 40);
		push('customer', paragraphs([f(pick(r, ['Sorry, I forgot to say: this is quite urgent for us.', 'Adding {name2}, who also uses the account, in copy.', 'I should have said: we are on the {plan} plan.'])), f(pick(r, shortSignoffs))]).join('\n\n'), first);
	}

	// The exchanges. Unless support has to go away and act, its answer joins its last reply.
	const mergeAnswer = !!topic.solved?.[0] && !topic.pause && (outcome === 'solved' || twist === 'reopen' || twist === 'more');
	let merged = false;
	const runTurns = (from: number, to: number, lead = '') => {
		for (let i = from; i <= to; i++) {
			const [said, reply] = topic.turns[i]!;
			const extra = extras.get(i) ?? { customer: [], support: [] };
			if (i > 0) {
				customerWait();
				customer([i === from ? lead : '', f(said), artFor(i, 'customer'), ...extra.customer, !chat && r() < 0.15 ? pick(r, asides) : '']);
			}
			supportWait();
			const sideFirst = i === 0 && extra.support.length > 0 && extras.get(0)!.customer.length > 0;
			const explain = i === 0 && r() < 0.75 ? f(topic.explain) : '';
			const thanks = (line: string) => line.startsWith('Thanks') || line.startsWith('Good');
			const merge = i === topic.turns.length - 1 && mergeAnswer;
			const answer = merge ? [f(topic.solved![0]), artFor(0, 'solved')] : [];
			if (merge) merged = true;
			support(
				sideFirst
					? [extra.support[0]!, `${pick(r, ['Now to the main matter.', 'On to the main problem.', 'Now, the main thing.'])} ${f(reply)}`, explain, ...extra.support.slice(1), ...answer]
					: i === 0
						? [f(reply), ...answer, explain, ...extra.support]
						: [...(/^Thank/.test(reply) ? [] : extra.support.filter(thanks)), f(reply), ...answer, ...extra.support.filter((line) => !thanks(line))],
				i === 0
			);
			const art = artFor(i, 'note');
			if (art || (i === 0 && r() < 0.3) || (i === 1 && areaNotes[topic.area].length && r() < 0.35)) {
				t += int(r, 2, 15);
				note(art || (i === 1 && areaNotes[topic.area].length ? pick(r, areaNotes[topic.area]) : pick(r, notes)));
			}
			if (i === Math.min(1, lastTurn) && i >= from && topic.area !== 'none' && r() < 0.75) {
				t += int(r, 2, 25);
				note(activity(r, v, topic, t));
			}
		}
	};
	runTurns(0, lastTurn);

	// The endings.
	const gap = () => {
		if (msgs[msgs.length - 1]?.kind !== 'support' && msgs[msgs.length - 1]?.kind !== 'note') return;
		chat = false;
		t += int(r, 90, 1500);
		officeHours();
	};
	const solvedBlock = () => {
		const [answer, thanks] = topic.solved!;
		if (answer && !merged) {
			gap();
			supportWait();
			support([f(answer), artFor(0, 'solved')]);
		}
		customerWait();
		customer([f(thanks)]);
		if (r() < 0.55) {
			supportWait();
			support([pick(r, solvedCloses)]);
		}
	};
	const engBlock = (lead = '') => {
		const [found, task] = topic.eng!;
		gap();
		supportWait();
		support([lead, `${cap(f(found))}. I have passed it to ${v.eng} in engineering, asking them to ${f(task)}, and I will update this ticket as soon as there is news.`]);
		t += int(r, 2, 20);
		note(`Raised with ${v.eng}: ${f(task)}.`);
		customerWait();
		const ack = pick(r, engAcks);
		customer([ack]);
		if (ack.includes('how long')) {
			supportWait();
			support(['I cannot promise a date, I am afraid, but I will write as soon as I hear anything.']);
		}
		if (used < asks.length && msgs[msgs.length - 1]!.kind === 'customer' && r() < 0.45) {
			const [ask, answer, thanks] = asks[used++]!;
			supportWait();
			support([`${v.eng} has asked for one more detail before they start: ${f(ask)}.`]);
			customerWait();
			customer([cap(f(answer))]);
			supportWait();
			support([`${f(thanks)} I have passed it on.`]);
		}
		if (r() < 0.4) {
			chat = false;
			t += int(r, 1, 3) * 1440;
			officeHours();
			support([f(pick(r, engUpdates))]);
		}
	};
	const wishBlock = (lead = '') => {
		const [why, wish] = topic.wish!;
		gap();
		supportWait();
		support([lead, `${cap(f(why))}. ${fill(r, pick(r, featureFrames), { ...v, wish: f(wish) })}`]);
		customerWait();
		customer([pick(r, featureAcks)]);
	};
	const leave = () => {
		if (!chat) return;
		t += int(r, 2, 6);
		push('system', `${first} left the chat.`);
		chat = false;
	};
	const nudge = () => {
		chat = false;
		t += int(r, 3, 5) * 1440;
		officeHours();
		support([fill(r, pick(r, nudges), { ...v, ask: f(topic.ask!) })]);
	};

	if (outcome === 'wait') {
		leave();
		if (r() < 0.7) nudge();
		if (r() < 0.3) nudge();
	} else if (twist === 'late') {
		leave();
		nudge();
		t += int(r, 1, 4) * 1440;
		if (topic.waitAfter! + 1 < topic.turns.length) runTurns(topic.waitAfter! + 1, topic.turns.length - 1, pick(r, lateReplies));
		else {
			customerWait();
			customer([pick(r, lateReplies)]);
		}
		solvedBlock();
	} else if (outcome === 'solved') solvedBlock();
	else if (outcome === 'eng' && twist === 'reopen') {
		solvedBlock();
		chat = false;
		t += int(r, 1, 5) * 1440;
		customerWait();
		customer([f(pick(r, reopens))]);
		engBlock(pick(r, reopenLeads));
	} else if (outcome === 'eng') engBlock();
	else if (twist === 'more') {
		solvedBlock();
		chat = false;
		t += int(r, 1, 6) * 1440;
		customerWait();
		customer(topic.wishLead ? [pick(r, ['Thanks again for sorting that out.', 'That did the trick, thank you.', 'Coming back to this one briefly.']), f(topic.wishLead)] : [pick(r, mores)]);
		wishBlock(pick(r, moreLeads));
	} else {
		if (topic.wishLead) {
			customerWait();
			customer([f(topic.wishLead)]);
		}
		wishBlock();
	}

	// Sometimes one more question once the main matter is over.
	if (outcome !== 'wait' && !topic.newcomer && r() < 0.5) {
		const side = sides[2]!;
		customerWait();
		customer([`${pick(r, ['Before you close this, one more thing.', 'Oh, and while I think of it:', 'One last question, unrelated:'])} ${f(side.quick[0])}`]);
		supportWait();
		support([f(side.quick[1])]);
		customerWait();
		customer([f(side.side[0])]);
		supportWait();
		support([f(side.side[1])]);
		if (r() < 0.5) {
			customerWait();
			customer([pick(r, ['Thanks, that is everything.', 'Perfect, thank you.', 'Good to know. Thanks again.'])]);
		}
	}

	// Rendering.
	const number = 4100 + index * 2 + (r() < 0.5 ? 0 : 1);
	const people = seats === 1 ? '1 person' : `${seats} people`;
	const via = channel === 'email' ? 'email to support@larchwood.test' : channel === 'chat' ? 'the chat on larchwood.test' : 'the contact form on larchwood.test/help';
	const out: string[] = [`# ${number} · ${f(pick(r, topic.subjects))}`, '', `From ${v.full} <${v.email}>, ${v.co} · ${v.plan} plan, ${people}`, `Opened ${fullDate(opened)} at ${clock(opened)} by ${via}`];
	if (channel === 'form') out.push(`Browser: ${pick(r, ['Chrome 141 on Windows 11', 'Safari 26 on macOS', 'Firefox 144 on Ubuntu', 'Edge 141 on Windows 10', 'Safari on iPhone'])}`);
	for (let i = 0; i < msgs.length; i++) {
		const msg = msgs[i]!;
		if (msg.chat) {
			const run: Msg[] = [];
			while (i < msgs.length && msgs[i]!.chat) run.push(msgs[i++]!);
			i--;
			if (run.every((line) => line.kind === 'system')) {
				for (const line of run) out.push('', `*${line.text}*`);
				continue;
			}
			out.push('', '---', '', `**Chat** · ${fullDate(run[0]!.at)}, ${clock(run[0]!.at)} to ${clock(run[run.length - 1]!.at)}`);
			for (const line of run) out.push('', line.kind === 'system' ? `*${line.text}*` : `**${line.who}** (${clock(line.at)}): ${line.text}`);
			continue;
		}
		const when = `${fullDate(msg.at)}, ${clock(msg.at)}`;
		if (msg.kind === 'note') out.push('', `*Internal note from ${msg.who} · ${dayMonth(msg.at)}, ${clock(msg.at)}*`, '', msg.text);
		else if (msg.kind === 'system') out.push('', `*${msg.text}*`);
		else out.push('', '---', '', msg.kind === 'customer' ? `**${v.full}** · ${when}` : msg.kind === 'auto' ? `**Larchwood support (automatic reply)** · ${when}` : `**${msg.who}, Larchwood support** · ${when}`, '', msg.text);
	}
	return { name: `${number}.md`, text: `${out.join('\n').replace(/\n{3,}/g, '\n\n')}\n` };
};

const folder = join(root, 'docs', 'support', 'tickets');
mkdirSync(folder, { recursive: true });
for (let index = 0; index < ITEMS; index++) {
	const { name, text } = ticket(index);
	writeFileSync(join(folder, name), text);
}
writeFileSync(
	join(folder, 'README.md'),
	`# Support tickets\n\nThe ${ITEMS} tickets opened in the shared support inbox in September and October 2026, one file per ticket, as the\ninbox exported them before the move to the new help desk. Tickets came in by email to support@larchwood.test, through\nthe chat on larchwood.test and through the contact form. Each file holds the whole thread, internal notes included.\nCard numbers and passwords are removed. The inbox kept no tags or statuses, so what a ticket was about and how it\nended are only in its thread.\n`
);
