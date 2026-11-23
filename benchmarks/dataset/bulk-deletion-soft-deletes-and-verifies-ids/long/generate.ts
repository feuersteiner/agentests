// Writes the long material of this entry's long tasks: the tickets that accounts on a trial opened with
// Pebblework support between 5 October and 12 November 2026, one Markdown file each, under support/tickets/.
// Deterministic: fixed seeds, no clock, no network.
//   bun long/generate.ts <workspace root>
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** How many tickets to write. Everything else is derived from it. */
const ITEMS = 253;

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
// Dates. Everything happens in 2026, before the export on 21 November.
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
const fullDay = (ms: number) => `${WDL[utc(ms).getUTCDay()]} ${dayMonth(ms)}`;
const midnight = (ms: number) => ms - (ms % DAY);
const FIRST_DAY = Date.UTC(2026, 9, 5);
const LAST_DAY = Date.UTC(2026, 10, 12);
const EXPORT = Date.UTC(2026, 10, 21);
const openDays: number[] = [];
for (let day = FIRST_DAY; day <= LAST_DAY; day += DAY) if (utc(day).getUTCDay() !== 0) openDays.push(day);

// ---------------------------------------------------------------------------------------------------------
// People and places.
const firstF = ['Ruth', 'Imani', 'Sofia', 'Helen', 'Priya', 'Agnes', 'Mei', 'Clara', 'Tanvi', 'Joanna', 'Esther', 'Leonie', 'Grainne', 'Adaeze', 'Marta', 'Wendy', 'Fiona', 'Noor', 'Beatriz', 'Kirsty', 'Yolanda', 'Hana', 'Rebecca', 'Dorota'];
const firstM = ['Daniel', 'Tariq', 'Mateo', 'Graham', 'Ifeanyi', 'Lukas', 'Sanjay', 'Ross', 'Viktor', 'Aled', 'Jonah', 'Rafael', 'Neil', 'Kwabena', 'Pavel', 'Gareth', 'Omar', 'Benedict', 'Hiro', 'Stuart', 'Emeka', 'Callan', 'Duncan', 'Anton'];
const surnames = ['Okafor', 'Lindgren', 'Ashworth', 'Mbeki', 'Fairclough', 'Rasmussen', 'Doyle', 'Varga', 'Kapoor', 'Hollis', 'Ferreira', 'Quinlan', 'Ahmadi', 'Sutherland', 'Novak', 'Pemberton-Hale', 'Adeyemi', 'Carrick', 'Matsuda', 'Bellamy', 'Oduya', 'Szabo', 'Rourke', 'Gallagher', 'Wainwright', 'Nwosu', 'Eklund', 'Prescott'];
const heads = ['Kestrel', 'Bramble', 'Larch', 'Wharf', 'Fennel', 'Cobalt', 'Hawthorn', 'Riverside', 'Juniper', 'Marlow', 'Ashgrove', 'Corbel', 'Seaview', 'Tallow', 'Westbrook', 'Linnet', 'Quarry', 'Orchard', 'Granary', 'Fairway', 'Heron', 'Mosswood', 'Bellfield', 'Sandpiper'];
const tails = ['Architects', 'Surveyors', 'Primary School', 'Housing Trust', 'Events', 'Landscaping', 'Dental Care', 'Logistics', 'Studio', 'Community Farm', 'Engineering', 'Legal', 'Wealth Partners', 'Bakery', 'Theatre Company', 'Food Bank', 'Recruitment', 'Builders', 'Veterinary Clinic', 'Media', 'Parish Council', 'Sports Club', 'Outdoor Centre', 'Print Co'];
const titles = ['Office manager', 'Operations lead', 'Founder', 'Head of IT', 'Project coordinator', 'Practice manager', 'Head of operations', 'Studio manager', 'Head of marketing', 'Facilities manager', 'Programme officer', 'Engineering manager', 'Clerk', 'Managing director', 'Business manager', 'Volunteer coordinator'];
const agents = ['Nadia', 'Kofi', 'Lucia', 'Tom', 'Mirela', 'Felix', 'Aiyana', 'Grace'];
const teamPeople: Record<string, string> = {
	'the Boards team': 'Ellis',
	'the Docs team': 'Maren',
	'the Insight team': 'Joaquin',
	'the imports team': 'Bea',
	'the billing team': 'Hugo',
	'the sales team': 'Priyanka',
	'the security team': 'Dmitri',
	'the platform team': 'Sanne',
	'the mobile team': 'Kenji',
	'the integrations team': 'Ola'
};
const tools = ['Trello', 'Asana', 'a shared spreadsheet', 'Wrike', 'Basecamp', 'sticky notes and email', 'Jira', 'Notion', 'a whiteboard in the office', 'a mix of spreadsheets and WhatsApp groups'];
const boards = ['Site visits', 'Client onboarding', 'Spring term', 'Fleet maintenance', 'Content calendar', 'Hiring', 'Q4 launches', 'Planning applications', 'Repairs', 'Orders', 'Volunteer rota', 'Bids', 'Production', 'Grant reports', 'Snagging', 'Lettings'];
const cards = ['Weekly fire alarm test', 'Order stationery', 'Chase the Pickering invoice', 'Book the venue', 'Draft the newsletter', 'Van MOT', 'Update the risk register', 'Send the minutes', 'Quote for the Hale Road job', 'Check the boiler', 'Prepare induction pack', 'Renew the domain'];
const workspaces = ['Operations', 'Projects', 'Client work', 'Admin', 'Finance', 'Marketing', 'Teaching', 'Estates', 'Programmes', 'Design'];
const pages = ['Staff handbook', 'Project plan', 'Q3 board report', 'Health and safety policy', 'Tender response', 'Fees schedule', 'Onboarding guide', 'Annual review', 'Lesson plans', 'Brand guidelines'];
const reports = ['Weekly progress', 'Directors summary', 'Monday numbers', 'Trustee update', 'Team throughput'];
const fields = [['Priority', 'Low, Medium, High and Urgent'], ['Client', 'Retail, Public sector and Charity'], ['Stage', 'Enquiry, Quoted, Won and Lost'], ['Risk', 'Green, Amber and Red'], ['Department', 'Sales, Ops and Finance']] as const;
const idps = ['Okta', 'Microsoft Entra', 'Google Workspace', 'JumpCloud'];
const browsers = ['Chrome', 'Edge', 'Firefox', 'Safari'];
const phones = ['Samsung Galaxy A54', 'Pixel 8', 'Xiaomi Redmi Note 13', 'OnePlus 12', 'Motorola Edge 40'];
const readers = ['NVDA', 'JAWS', 'VoiceOver'];
const regions = [['EU (Frankfurt)', 'our data centres in Frankfurt, with backups in Dublin'], ['UK (London)', 'our data centres in London, with backups in Manchester'], ['US (Virginia)', 'our data centres in Virginia, with backups in Ohio']] as const;
const cities = ['Leeds', 'Glasgow', 'Cork', 'Rotterdam', 'Bristol', 'Lisbon'];
const zones = ['Europe/London', 'Europe/Dublin', 'Europe/Amsterdam', 'Europe/Lisbon'];
const reasons = ['half term', 'the harvest', 'our annual audit', 'a trade show', 'the school holidays', 'a flu outbreak in the office', 'our year-end'];
const approvers = ['our trustees', 'the parish council', 'our board', 'the finance committee', 'head office', 'the partners'];
const seasons = ['summer', 'December', 'spring', 'autumn'];
const channels = ['ops', 'site-updates', 'team-boards', 'projects', 'delivery', 'office'];
const streets = ['14 Mill Lane', '3 Harbour Row', 'Unit 7, Tannery Yard', '22 Station Road', 'The Old Forge, Church Street', '41 Wellington Place'];
const towns = ['Harrogate', 'Falmouth', 'Stirling', 'Galway', 'Ludlow', 'Whitby', 'Kendal', 'Truro'];
const currencies = [['US dollars', '$', 10, 96, 20, 192], ['pounds', '£', 8, 77, 16, 154], ['euros', '€', 9, 86, 18, 173]] as const;

type Area = 'Boards' | 'Docs' | 'Insight' | 'sign-in and members' | 'imports' | 'billing and plans' | 'other';
type Outcome = 'resolved' | 'owe' | 'act' | 'team' | 'quiet';
type Slots = Record<string, string>;
type Art = (r: Rand, s: Slots) => string;

interface Topic {
	area: Area;
	weight: number;
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
	/** The customer's message when it worked. */
	fixed: [string, string];
	/** A further question at the end, and what the agent then owes, after "I'll". */
	follow: string;
	owe: string;
	team: string;
	/** The internal note when the ticket is handed to the team. */
	handover: string;
	noTeamFix?: boolean;
	outcomes?: Outcome[];
	after?: number;
	notOwner?: boolean;
	ownerOnly?: boolean;
	ownerMale?: boolean;
	ended?: boolean;
	soonEnds?: boolean;
}

// ---------------------------------------------------------------------------------------------------------
// Pasted artifacts.
const table = (head: string[], rows: string[][]) =>
	[`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`, ...rows.map((row) => `| ${row.join(' | ')} |`)].join('\n');
const fence = (lines: string[]) => ['```', ...lines, '```'].join('\n');
const ago = (s: Slots, days: number) => dayMonth(Number(s.nowMs) - days * DAY);
/** A day this many days before the message, but not before the trial started. */
const within = (s: Slots, days: number) => ago(s, Math.max(0, Math.min(days, Math.floor((Number(s.nowMs) - Number(s.startedMs)) / DAY) - 1)));

const arts: Record<string, Art> = {
	automation: (r, s) =>
		fence([
			`Rule        Move finished cards to Done`,
			`Board       ${s.board}`,
			`When        all checklist items on a card are complete`,
			`Only if     the card is not in Done`,
			`Then        move the card to Done, at the top`,
			`Owner       ${s.ownerName}`,
			`Status      On, since ${within(s, int(r, 6, 15))}`,
			`Last runs   ${within(s, 4)} 10:${pad(int(r, 10, 59))} moved · ${within(s, 3)} 15:${pad(int(r, 10, 59))} moved · ${within(s, 2)} 09:${pad(int(r, 10, 59))} no change`
		]),
	wip: (r, s) =>
		table(
			['Lane', 'To do', 'In progress', 'Review', 'Done'],
			[s.full, s.member, s.member2, s.member3].map((who) => [who, String(int(r, 1, 9)), String(int(r, 0, 4)), String(int(r, 0, 3)), String(int(r, 8, 40))]).concat([['Column limit', '-', s.limit, '-', '-']])
		),
	recurring: (r, s) =>
		table(
			['Card', 'Repeats', 'Set up by', 'Created this week'],
			[
				[s.card, 'Mondays 08:00', s.memberFirst, `Mon 07:00, Mon 08:00`],
				['Friday stock check', 'Fridays 16:00', s.first, `Fri 16:00`],
				['Payroll reminder', 'Monthly, 25th', s.memberFirst, `${int(r, 25, 26)}th 08:00, ${int(r, 25, 26)}th 09:00`],
				['Team stand-up notes', 'Weekdays 09:15', s.first, 'daily 09:15']
			]
		),
	calendar: (r, s) =>
		table(
			['Card', 'Due date on the card', 'Shown in my calendar on'],
			[0, 1, 2, 3, 4, 5].slice(0, int(r, 4, 6)).map((i) => {
				const due = Number(s.nowMs) + (i * 3 + int(r, 2, 4)) * DAY;
				return [pick(r, cards), dayMonth(due), dayMonth(due - DAY)];
			})
		),
	export: (r, s) =>
		fence([`Page          ${s.page}`, `Page size     A4`, `Orientation   Portrait`, `Margins       Normal`, `Fit wide tables to page   off`, `Include comments          off`, `Header and footer         none`, `Pages produced            ${int(r, 9, 31)}`]),
	footer: (r, s) =>
		fence([`${s.member} commented on "${s.page}"`, `"Can we move this section up before it goes to the client?"`, ``, `Reply in Pebblework: https://${s.site}/d/${int(r, 1000, 9999)}#c${int(r, 100, 999)}`, `You're receiving this because you watch the ${s.ws} workspace.`, `Notification settings: https://${s.site}/settings/notifications`]),
	versions: (r, s) =>
		table(
			['Version', 'Saved by', 'Saved', 'Changed'],
			[
				[`Named: "Sent to committee"`, s.full, within(s, 9), 'whole page'],
				['Automatic', s.memberFirst, `${within(s, 6)} 11:${pad(int(r, 10, 29))}`, 'table: Fees (pasted)'],
				['Automatic', s.memberFirst, `${within(s, 6)} 11:${pad(int(r, 30, 59))}`, 'paragraph 3'],
				['Automatic', s.member2, `${within(s, 4)} 16:${pad(int(r, 10, 59))}`, 'heading'],
				['Named: "Draft 4"', s.full, ago(s, 2), 'whole page']
			]
		),
	insight: (r, s) => {
		const now = Number(s.nowMs);
		const monday = midnight(now) - ((utc(now).getUTCDay() + 6) % 7) * DAY;
		const weeks = Math.max(1, Math.min(6, Math.floor((monday - Number(s.startedMs)) / DAY / 7)));
		const rows = Array.from({ length: weeks }, (_, i) => weeks - i).map((back) => {
			const x = back === 1 ? Number(s.x1) : int(r, 14, 60);
			const y = back === 1 ? Number(s.x2) : x + int(r, -3, 7);
			return [dayMonth(monday - back * 7 * DAY), String(x), String(y), String(y - x)];
		});
		return table(['Week starting', 'Insight', 'My count', 'Difference'], rows);
	},
	bounce: (r, s) =>
		fence([`Quarantine report for ${s.memberEmail}`, `Received   ${ago(s, 1)} 08:00`, `From       reports@pebblework.com`, `Subject    Your weekly Insight report: ${s.report}`, `Verdict    held: sender not on the allow list (policy "External senders, strict")`, `Action     none taken; release requires an administrator`]),
	fields: (r, s) => table(['Field', 'Kind', 'Belongs to', 'Cards with a value'], [[s.field, 'Dropdown', `${s.board} board`, String(int(r, 40, 300))], ['Estimate', 'Number', `${s.ws} workspace`, String(int(r, 20, 200))], ['Client contact', 'Person', `${s.ws} workspace`, String(int(r, 10, 90))]]),
	cycle: (r, s) => fence([`Tile           Cycle time (average)`, `Dashboard      ${s.board}`, `Start column   Backlog`, `End            any column marked as done`, `Working days only   off`, `Filters        none`, `Period         last 8 weeks`, `Value          ${s.ct} days`]),
	saml: (r, s) => fence([`Single sign-on URL      https://${s.site}/saml/acs`, `Audience URI            pebblework.com`, `Name ID format          EmailAddress`, `Application username    Email`, `Attribute: email       user.email`, `Attribute: name        user.displayName`, `Signed response         yes (SHA-256)`]),
	invites: (r, s) =>
		fence([0, 1, 2, 3, 4, 5, 6, 7].slice(0, int(r, 5, 8)).map((i) => `${ago(s, 1)}T${pad(9 + i)}:${pad(int(r, 0, 59))}:${pad(int(r, 0, 59))}Z reject from=<invites@pebblework.com> to=<${pick(r, firstF).toLowerCase()}@${s.domain2}> reason="link to unrecognised domain ${s.site}"`)),
	trello: (r, s) => table(['Item', 'In the file', 'Imported', 'Note'], [['Lists', String(int(r, 6, 14)), 'all', ''], ['Cards', s.big, 'all', ''], ['Labels', String(int(r, 6, 12)), '0', 'skipped (no mapping)'], ['Checklists', String(int(r, 80, 400)), 'merged', 'one per card (keep multiple: off)'], ['Attachments', String(int(r, 20, 160)), 'all', ''], ['Members', String(int(r, 4, 15)), 'matched by email', '']]),
	csv: (r, s) => {
		const rows = ['Task,Owner,Due,Status'];
		for (let i = int(r, 8, 12); i > 0; i--) rows.push(`${pick(r, cards)},${pick(r, firstF)},${pad(int(r, 1, 28))}/${pad(int(r, 1, 12))}/2026,${pick(r, ['Not started', 'In progress', 'Waiting'])}`);
		return fence(rows);
	},
	docsWarnings: (r, s) =>
		fence(
			[0, 1, 2, 3, 4, 5, 6, 7, 8].slice(0, int(r, 5, 9)).map((i) => `WARN  image not in the zip: attachments/${int(r, 100000, 999999)}/${pick(r, ['diagram', 'floorplan', 'org-chart', 'screenshot', 'logo'])}.png (from ${pick(r, pages)}.html)`).concat([`WARN  link kept as external: ${s.wiki} page "${pick(r, pages)}" not in this import`, `Done: ${int(r, 60, 240)} pages, ${int(r, 20, 90)} images, ${int(r, 12, 40)} warnings`])
		),
	users: (r, s) =>
		table(
			['Assignee in the file', 'Tasks', 'Matched to'],
			[...new Set([s.memberFirst, s.first, s.member2.split(' ')[0]!, s.member3.split(' ')[0]!, pick(r, firstM), pick(r, firstF), pick(r, firstF)])].slice(0, int(r, 5, 7)).map((name, i) => [`${name.toLowerCase()}@${s.domain2}`, String(int(r, 8, 120)), i === 1 ? s.full : 'nobody'])
		),
	quote: (r, s) => {
		const seats = Number(s.seats);
		const unit = Number(s.planYear);
		const net = seats * unit;
		return table(
			['Item', 'Quantity', 'Unit price', 'Amount'],
			[
				[`Pebblework ${s.plan}, annual`, String(seats), `${s.sym}${unit}.00`, `${s.sym}${net.toLocaleString('en-GB')}.00`],
				['Guests (up to 5 per member)', String(int(r, 0, seats * 2)), 'free', '-'],
				['VAT at 20%', '', '', `${s.sym}${(net * 0.2).toFixed(2)}`],
				['Total', '', '', `${s.sym}${(net * 1.2).toFixed(2)}`]
			]
		);
	},
	payment: (r, s) => table(['Attempt', 'Card', 'Bank check', 'Result'], [2, 2, 1].map((d, i) => [`${ago(s, d)} ${i === 2 ? s.time : `${pad(int(r, 9, 17))}:${pad(int(r, 0, 59))}`}`, `Visa ending ${s.card4}`, 'started', 'no answer from bank window'])),
	slack: (r, s) =>
		table(
			['Time', 'Event', 'Channel', 'Answer'],
			[[`${within(s, 8)} 15:${pad(int(r, 10, 59))}`, 'comment added', `#${s.oldchannel}`, 'ok'], [`${within(s, 7)} 09:${pad(int(r, 10, 59))}`, 'card created', `#${s.oldchannel}`, 'ok'], [`${within(s, 6)} 10:${pad(int(r, 10, 59))}`, 'card moved', `#${s.oldchannel}`, 'ok'], [`${ago(s, 5)} 14:${pad(int(r, 10, 59))}`, 'card created', `#${s.oldchannel}`, 'channel_not_found'], [`${ago(s, 3)} 09:${pad(int(r, 10, 59))}`, 'comment added', `#${s.oldchannel}`, 'channel_not_found'], [`${ago(s, 1)} 16:${pad(int(r, 10, 59))}`, 'card moved', `#${s.oldchannel}`, 'channel_not_found']]
		),
	mobile: (r, s) => fence([`App version            ${s.appv}`, `Device                 ${s.phone}`, `Notifications allowed  yes`, `Push registration      ok (${within(s, int(r, 5, 12))})`, `Last push received     ${within(s, int(r, 2, 4))}`, `Battery optimisation   restricted`, `Background data        allowed`]),
	reminders: (r, s) =>
		table(
			['Received', 'From', 'Subject'],
			Array.from({ length: Math.min(10, Number(s.count)) }, (_, i) => Math.min(10, Number(s.count)) - 1 - i).map((d) => [`${ago(s, d)} 09:0${int(r, 0, 9)}`, 'Pebblework', 'Your Pebblework trial ends in 3 days'])
		),
	questionnaire: (r, s) => ['1. In which countries is customer data stored and processed?', '2. List all subprocessors with access to customer data.', '3. Is data encrypted at rest and in transit? Give algorithms.', '4. Do you hold ISO 27001 or SOC 2? Attach certificates.', '5. Describe how access by your staff to customer data is controlled and logged.', `6. Name the person responsible for data protection at your company.`, '7. How are security incidents reported to customers, and how quickly?'].join('\n'),
	api: (r, s) => fence([`POST /v1/cards  ->  HTTP/1.1 429 Too Many Requests`, `X-RateLimit-Limit: 300`, `X-RateLimit-Remaining: 0`, `X-RateLimit-Reset: ${int(r, 10, 59)}`, `Retry-After: ${int(r, 10, 59)}`, `Content-Type: application/json`, ``, `{"error": "rate_limited", "message": "Too many requests for this token. Try again later."}`])
};

// ---------------------------------------------------------------------------------------------------------
// Topics. Slots in braces are filled per ticket.
const topics: Topic[] = [
	{
		area: 'Boards',
		weight: 2,
		subjects: ['Automation not moving cards', 'Rule to move finished cards does nothing', 'Boards rule stopped working'],
		open: [
			`We set up an automation on the {board} board so that a card moves to Done once every item on its checklist is ticked. It worked for the first few cards and now it does nothing. As far as I know nobody has touched the rule.`,
			`I'm trying to get cards to move themselves to the Done column when their checklist is finished. The rule is saved and switched on, but the cards just sit there with every box ticked, and people have started dragging them across by hand, which is exactly what we wanted to stop.`
		],
		quick: [`Can an automation move a card onto a different board?`, `It can, as long as both boards are in the same workspace. Choose "Move to another board" as the action, then pick the board and the column.`],
		reply: `Sorry the rule has gone quiet on you. Could you send me the rule as it shows on its settings page? A copy of the text is fine. Then I can see which trigger it uses.`,
		turns: [
			[`Here is the rule as it shows on the settings page.`, `Thanks, that's what I needed. The trigger is "all checklist items complete", which fires when the last box is ticked. A checklist that was already complete before the rule was switched on doesn't fire it, so older cards won't move on their own. For the newer ones, could you give me the name of one card that should have moved? Then I can open its activity and see whether the rule ran on it.`, arts.automation],
			[`One that got stuck is "{card}". It was ticked yesterday afternoon, from someone's phone.`, `Found it. The rule did run on that card, at {pm}, and stopped with "column limit reached". Your Done column has a work-in-progress limit of {limit} and it was full, so the move was refused. Ticks from the phone app count exactly like ticks on the web, so that part is fine.`],
			[`Why on earth would Done have a limit?`, `It most likely came with the template the board was made from. Kanban Starter puts a limit on every column, Done included. You can clear it from the column's menu, under Column settings, and nothing else about the column changes.`],
			[`Can we get told when a rule fails, rather than finding out a week later?`, `Yes. Each rule has a "Notify me when this rule fails" switch at the bottom of its settings. It's off by default; once it's on, the rule's owner gets an email and an in-app alert for every failed run.`]
		],
		need: 'the name of one card that should have moved',
		cause: `the Done column on that board has a work-in-progress limit of {limit} that came with its template, and the rule stops when the column is full`,
		act: `clear the limit on the Done column and switch on the rule's failure notice`,
		fixed: [`Cleared the limit and the stuck cards jumped across within a minute. Brilliant, thank you.`, `That was it, the limit came from the template. Everything is moving now, and I've switched the failure emails on.`],
		follow: `Could the rule try the move again once the column has room, instead of giving up?`,
		owe: `ask the Boards team whether a rule can retry a move once the column has room, and write back by {day} with their answer`,
		team: 'the Boards team',
		handover: `Rule on the {board} board is on and the trigger looks right, but cards with every box ticked aren't moving. Customer is on a trial with {seats} members and relies on it. Can you check the rule runner for this site?`
	},
	{
		area: 'Boards',
		weight: 1,
		subjects: ['Limits per swimlane?', 'WIP limits on lanes', 'Question about column limits'],
		open: [
			`We run the {board} board with one swimlane per person and a limit on the In progress column. The trouble is that the limit counts the whole column, so once two people are busy nobody else can pull a card in. What we want is a limit of {limit} per person.`,
			`Is there a way to put a work-in-progress limit on a swimlane rather than a column? Our {board} board has a lane for each person in the team and the column limit is no use to us as it stands.`
		],
		quick: [`Can a board have lanes and columns at the same time? I can only find one or the other.`, `Yes. Open the board's View menu, choose "Group into lanes" and pick what the lanes are grouped by. The columns stay as they are.`],
		reply: `Thanks for explaining how you use the board. Limits in Boards are per column today, so the lane-by-lane version isn't something I can switch on for you, but there are ways teams get close to it. Do you want cards to be blocked from moving, or would a warning when someone has too many be enough?`,
		turns: [
			[`A warning would honestly be enough. People mean well, they just forget.`, `Then the column highlight may do it. When the lanes are grouped by assignee, each lane shows how many cards that person has in each column, and you can make the In progress header turn amber at the number you choose. Could you send me a screenshot of the board's settings page, so I can check the option is available on your board?`],
			[`Here's the settings page. I can only see the limit box, no colour option.`, `That explains it. Your lanes are grouped by a custom field called Owner, which came with the template, rather than by assignee, and the highlight only appears when the lanes are grouped by assignee. If you switch the grouping, the lanes look the same as long as Owner and the assignee match. I can see {big} cards on the board, and {limit2} of them have an Owner but no assignee, so those would land in an "Unassigned" lane.`, arts.wip],
			[`Is there a quick way to copy Owner into Assignee for those?`, `Yes: filter the board on "Assignee is empty", select the cards, then use Edit cards, "Set assignee from field" and choose Owner. It changes them in one step and leaves a note in each card's activity.`],
			[`Will regrouping change what people see on their own screens?`, `Grouping is saved with the board, so everyone sees the new lanes. Filters people have saved for themselves stay as they are.`]
		],
		need: `a screenshot of the board's settings page`,
		cause: `the board's lanes are grouped by the template's Owner field instead of by assignee, which is why the lane counts and the column highlight aren't offered`,
		act: `switch the board's grouping to Assignee and fill in the assignee on the cards that only have an Owner`,
		fixed: [`Grouped by assignee, highlight set to {limit}, and the In progress header has already gone amber for one of us. Exactly what we needed.`, `All done. The lanes look the same as before and the counts are there. Thanks for the patience.`],
		follow: `That works as a warning. Is a real per-lane limit on the way, though? A hard stop would suit us better in the long run.`,
		owe: `add your board to the request for per-lane limits, ask the Boards team whether it's planned, and let you know what they say by {day}`,
		team: 'the Boards team',
		handover: `Customer wants WIP limits per swimlane on the {board} board. The highlight option doesn't show for them. Could someone who knows lanes look at how the board is set up and suggest the best route?`
	},
	{
		area: 'Boards',
		weight: 1,
		after: Date.UTC(2026, 9, 26),
		subjects: ['Recurring cards doubled', 'Weekly cards created twice', 'Repeat cards coming in at the wrong time'],
		open: [
			`Every recurring card on our {board} board has been created twice this week. We have a weekly "{card}" card and on Monday there were two of them, an hour apart.`,
			`Our repeating cards have gone strange. The ones that should appear at 08:00 every Monday now appear at 07:00 and then again at 08:00. Nobody changed anything that I know of.`
		],
		quick: [`Is there a way to make a card that repeats every month?`, `Yes. Open the card, choose Repeat and pick monthly. You can choose the day of the month and the column it appears in.`],
		reply: `Thanks for flagging it, and sorry for the muddle on the board. The clocks changed recently, which makes me suspect the repeat schedule. Could you tell me which time zone your profile is set to, and which one the site uses? The site's is under Site settings, General.`,
		turns: [
			[`My profile says {tz}. The site says the same.`, `Thanks, so that isn't it for you. A repeat is stored in the time zone of the person who set it up, though, so it depends who made each one. Could you give me the names of a couple of the cards that came in twice? Then I can look at their repeat settings.`],
			[`"{card}" and the payroll reminder. I set most of them up but {memberFirst} did a few.`, `That's the answer. Both of those were set up by {memberFirst}, whose profile is on UTC while the site is on {tz}. When the clocks went back, Boards saw the schedule move by an hour and caught up by creating the card again. The repeats you made yourself didn't double.`, arts.recurring],
			[`Can I fix them without setting them all up again?`, `Yes. Open each of {memberFirst}'s repeats and save it once with the site's time zone selected. Saving re-anchors the schedule, and next week's card comes in once, at the right time.`],
			[`And the extra cards from this week?`, `They're ordinary cards now, so you can move them to Done or leave them where they are. Nothing else on the board points at them.`]
		],
		need: 'the names of a couple of the cards that came in twice',
		cause: `the doubled repeats were set up by {memberFirst}, whose profile is on UTC while the site is on {tz}, so the change of clocks made the schedule catch up twice`,
		act: `open each of {memberFirst}'s repeats and save it again with the site's time zone selected`,
		fixed: [`Saved them all again and this Monday there was one of each, at eight. Sorted.`, `{memberFirst} changed her profile and saved the repeats again. One card each this week. Thanks for working it out.`],
		follow: `Could Boards stop someone making a repeat in a different time zone from the site? This will happen again in March.`,
		owe: `pass that on to the Boards team as a request and tell you by {day} whether they plan to warn about it`,
		team: 'the Boards team',
		handover: `Recurring cards on the {board} board created twice since the clocks changed. Site and requester's profile are both on {tz}. Could you check the scheduler for this site?`
	},
	{
		area: 'Boards',
		weight: 1,
		subjects: ['Calendar shows the wrong day', 'Due dates a day early in calendar view', 'Calendar view problem'],
		open: [
			`In the calendar view of the {board} board, every card shows up a day before its due date. In the card itself the date is right. Our office in {city} sees it correctly, which makes it even stranger.`,
			`Some of my colleagues see cards on the right day in the calendar and I see them on the day before. We have a client deadline on {date} and I nearly told them the wrong date.`
		],
		quick: [`Can I see the cards from two boards in one calendar?`, `Yes, add a calendar view to the project rather than to a board. It shows every card with a due date in that project.`],
		reply: `That sounds like a time zone difference rather than wrong dates, but I'd like to be sure. Do the cards that move have a due time as well as a date, or just a date?`,
		turns: [
			[`Just a date. We never set times.`, `Thanks. A date without a time is meant to stay on that date for everyone, so you shouldn't see a shift at all. Could you tell me which browser you use, and the time zone on your profile?`],
			[`{browser}, and my profile says {tz}. My laptop is still on Pacific time because IT never changed it after I came back from a project in {city2}.`, `That's the cause. The calendar takes the day boundary from your computer's clock, and the card uses your profile. With your laptop several hours behind, a date that starts at midnight in {tz} falls on the evening before. It shouldn't depend on the laptop, so that part is a fault on our side.`, arts.calendar],
			[`So what do I do in the meantime?`, `Setting your computer's time zone to match your profile makes the calendar agree with the cards straight away. The other way is to turn on "Use my profile's time zone" in the calendar's display options.`],
			[`I didn't know that option existed.`, `It's new this autumn and tucked away under the gear at the top right of the calendar. It's on for new boards, but older boards keep the setting they had.`]
		],
		need: 'the browser you use and the time zone on your profile',
		cause: `the calendar takes the day boundary from your laptop's clock, which is on Pacific time, while the cards use your profile's time zone`,
		act: `set your laptop's time zone to match your profile, or turn on "Use my profile's time zone" in the calendar's display options`,
		fixed: [`Turned that option on and everything lines up with the cards now. Thank you!`, `IT changed my laptop's time zone this morning and the calendar is right. Panic over.`],
		follow: `Will the calendar get fixed properly, so nobody else gets caught out?`,
		owe: `find out from the Boards team when the fix for the day boundary is due and let you know by {day}`,
		team: 'the Boards team',
		handover: `Calendar view shows date-only due dates a day early for one user on {site}. Profile is {tz}. Can't reproduce it on our test site. Can you look?`
	},
	{
		area: 'Boards',
		weight: 1,
		notOwner: true,
		subjects: ['Card templates in other workspaces', 'Sharing templates between workspaces', 'Templates question'],
		open: [
			`We've built a card template for new client jobs, with a checklist of {big3} steps, and it works well in the {ws} workspace. When I go to use it in our {ws2} workspace it isn't there.`,
			`How do we share card templates across workspaces? Every team ends up making its own copy of the same onboarding template, and the copies drift apart.`
		],
		quick: [`Can I make a new board from an existing one, with the columns but without the cards?`, `Yes: on the board's menu choose Copy board and untick "Include cards".`],
		reply: `Good question. Card templates belong to a board, so out of the box they only show up on the board they were made on and on boards copied from it. There's a way to share them more widely on Business, which your trial includes. Who should be able to use the template, and who should be able to change it?`,
		turns: [
			[`Everyone should use it. Only me and {memberFirst} should change it.`, `Then a site template is what you want: open the template, choose "Promote to site template" and pick who can edit it. It then appears in the template list of every board on the site. Could you tell me the template's name and the board it's on? I'd like to check it can be promoted.`],
			[`It's called "New client job", on the {board} board. I can't see a Promote option, by the way.`, `Thanks, that's the missing piece. Promoting needs the site admin role, and you're a workspace admin, not a site admin. The account owner, {ownerName}, can give you the role under Site settings, People, and the option will appear for you straight away.`],
			[`What happens to the copies people have already made?`, `They stay as board templates and keep working. If you want everyone on the site template, set the old ones to hidden: they drop out of the list but stay on file.`],
			[`And will the site template survive us moving to the Team plan?`, `Site templates are a Business feature. On Team, the template stays on the board it was made on and the copies on other boards remain, but it won't appear on new boards by itself.`]
		],
		need: `the template's name and the board it's on`,
		cause: `promoting a template to the site needs the site admin role, and you're a workspace admin`,
		act: `ask {ownerName} to give you the site admin role, then promote the template from its menu`,
		fixed: [`Got the role, promoted it, and it shows on every board. That's going to save us a lot of copying.`, `{ownerName} sorted my role and the template is in {ws2} now. Thanks.`],
		follow: `Can I see which boards are still using the old copies? I'd like to switch them over.`,
		owe: `check with the Boards team whether there's a report of template use per board, and send you what they can give me by {day}`,
		team: 'the Boards team',
		handover: `Customer wants a card template shared across workspaces on {site}. "Promote to site template" doesn't show for them, though the trial includes Business. Can you check?`
	},
	{
		area: 'Docs',
		weight: 1,
		subjects: ['PDF export cuts off tables', 'Printing a doc', 'Export to PDF looks wrong'],
		open: [
			`We need to send our {page} to a client as a PDF. When I export it, the wide tables are cut off at the right-hand edge, and two of the images are split across a page break.`,
			`Our papers go out as PDFs, and the export from Docs is unusable at the moment: tables are chopped off and pictures are cut in half between pages.`
		],
		quick: [`Can I print a single card?`, `Yes, open the card and choose Print from its menu. It prints the description, the checklist and the comments.`],
		reply: `Sorry about that, it's frustrating when it's going to a client. Could you send me the export settings you used? There's a summary at the bottom of the export dialog that you can copy.`,
		turns: [
			[`Here are the settings.`, `Thanks. Could you tell me roughly how many columns the widest table has, and whether the images that split are set to full width?`, arts.export],
			[`The widest table has {cols} columns. The images are whatever the default is.`, `That covers both. At A4 portrait the export keeps tables at their on-screen width, so anything wider than about seven columns runs off the edge unless "Fit wide tables to page" is on. Images split when they're full width, which is the default, and taller than the space left on the page; set them to "Keep with next paragraph" from the image menu and the export moves them to the next page instead.`],
			[`Can I make only some pages landscape?`, `Not within one export, unfortunately. Some teams put the wide tables in a section of their own, export that in landscape, and combine the files. It isn't elegant.`],
			[`Is there a way to put our logo in the header of every page?`, `Yes, under Export settings, Header and footer, you can upload a logo and add page numbers. Those settings are saved per project, so the next document picks them up.`]
		],
		need: 'the number of columns in the widest table, and how the images are set',
		cause: `the export keeps wide tables at their on-screen width unless "Fit wide tables to page" is on, and full-width images split at page breaks`,
		act: `turn on "Fit wide tables to page" in the export dialog and set the large images to "Keep with next paragraph"`,
		fixed: [`With "fit wide tables" on and the images fixed, the PDF looks properly professional. Sent it off. Thanks.`, `That worked. The client copy went out this morning and nobody noticed anything odd.`],
		follow: `It works, but it's fiddly. Is mixed portrait and landscape in one export likely to come?`,
		owe: `ask the Docs team whether mixed orientation is planned and come back to you by {day}`,
		team: 'the Docs team',
		handover: `PDF export of "{page}" on {site} cuts off tables and splits images. Customer's settings are in the ticket. Can you try the export yourselves?`
	},
	{
		area: 'Docs',
		weight: 2,
		subjects: ['Too many emails from Docs', 'Comment notification emails', 'Can we turn down the emails?'],
		open: [
			`Since we started the trial my inbox has been flooded with an email every time anyone comments on a doc, even docs I've never opened. I had {big} yesterday.`,
			`Our team is getting an email for every single comment and reaction in Docs. People are starting to filter them all to a folder, which means they'll miss the ones that matter.`
		],
		quick: [`How do I stop getting an email when someone reacts with an emoji?`, `Under Profile, Notifications, untick "Reactions". Mentions and replies still come through.`],
		reply: `Sorry, that's far more than you should be getting. Could you tell me which workspace most of the comments are in, and whether you created it?`,
		turns: [
			[`Mostly {ws}. I didn't create it, {memberFirst} did, I think.`, `Thanks. Could you forward me one of the emails, with its full footer? The last lines say why it was sent to you.`],
			[`Here's one. I'm not mentioned in it and I don't follow that page.`, `Thanks, the footer has the answer: "You're receiving this because you watch the {ws} workspace". Watching a workspace sends you every comment on every page in it. Invitations sent before the start of this month had "watch" ticked by default, which is probably how most of your team ended up watching it. You can turn it off from the workspace's menu, Stop watching.`, arts.footer],
			[`Is there a digest rather than all or nothing?`, `Yes. Under your profile, Notifications, Docs, choose "Daily summary". Mentions and replies to your own comments still come straight away; everything else arrives once a day at the time you pick.`],
			[`Can I set that for everyone? Half of them won't find the setting.`, `A site admin can set the default for new members under Site settings, Notifications. It doesn't change people who already chose a setting, but most of your members haven't, so it would apply to them.`]
		],
		need: 'one of the emails, forwarded with its full footer',
		cause: `you, and probably most of the team, are watching the whole {ws} workspace, which sends an email for every comment on every page in it`,
		act: `stop watching the workspace from its menu and set the site's default to "Daily summary" under Site settings, Notifications`,
		fixed: [`Switched to the daily summary, and today I had one email instead of a hundred. Bliss.`, `Changed the site default and told everyone. The complaints have stopped. Thank you.`],
		follow: `That's much better. One more: can people get Docs notifications in Slack instead of email?`,
		owe: `check with the integrations team whether Docs notifications can go to Slack yet, and write back by {day}`,
		team: 'the Docs team',
		handover: `Customer on {site} gets an email for every comment in the {ws} workspace, including pages they've never opened. Could you check their notification settings and the workspace's?`
	},
	{
		area: 'Docs',
		weight: 1,
		subjects: ['Guest can see too much', 'Sharing one page with a client', 'Docs permissions'],
		open: [
			`We've invited a client, {member}, as a guest so she can read our project plan. She can also see the whole page tree for that project, including our internal pricing notes. Not ideal.`,
			`How do I share one page with an outside contractor, {member}, without her seeing everything else in the project? The sharing settings are confusing me.`
		],
		quick: [`Can a guest create pages of their own?`, `Only under pages you've shared with them as an editor. They can't create pages at the top of a project.`],
		reply: `Good that you're checking before more goes in. Could you tell me the guest's email address and the name of the project, so I can see what she has access to?`,
		turns: [
			[`She's {memberEmail}, and the project is {project}.`, `Thanks. I can see her on the {project} project's People list as a guest, which gives her every page in it. Did you mean to give her the whole project, or only the plan page and some of the pages under it?`],
			[`Only the plan and a few of the pages under it. The internal ones aren't for her.`, `Then take her off the project's People list and share the plan page with her directly: she'll see that page and the pages nested under it. For the nested pages she shouldn't see, open each one, Share, Restrict, and choose "Only people in {co}". Restricted pages disappear from a guest's tree even when they sit under a page she can see.`],
			[`Can I check what she sees without asking her?`, `Yes: in the People list, choose her name, then "View as". It opens the site in a read-only preview with exactly her access.`],
			[`Does restricting pages work on the Team plan too?`, `Page restrictions are a Business feature. On Team, the way to keep things apart is a separate project for client-facing pages, which many teams do anyway.`]
		],
		need: 'a word on whether she should see the whole project or only the plan page',
		cause: `the guest was added to the whole {project} project, which gives her every page in it, when she only needs the plan page and some of the pages under it`,
		act: `take the guest off the project, share the plan page with her directly, and restrict the internal pages under it`,
		fixed: [`Did that and checked with "View as". She sees the plan and the timeline, nothing else. Perfect.`, `Restricted the pricing notes, and the preview shows exactly what I wanted. Thanks.`],
		follow: `Can I get an alert if anyone shares a page with a guest? I'd like to keep an eye on it.`,
		owe: `ask the Docs team whether a guest-sharing alert exists or is planned, and let you know by {day}`,
		team: 'the Docs team',
		handover: `Customer wants a guest to see one page and some of its sub-pages in the {project} project on {site}, and nothing else. Could someone who knows page permissions advise on the cleanest set-up?`
	},
	{
		area: 'Docs',
		weight: 1,
		subjects: ['Who changed this table?', 'Version history', 'Seeing changes in a doc'],
		open: [
			`Someone changed the figures in our {page} last week and nobody owns up. Is there a way to see exactly who changed what, and when?`,
			`I need to compare today's version of one of our pages with the one from the start of the month and send the differences to our committee. How do I do that in Docs?`
		],
		quick: [`Is there a word count in Docs?`, `Yes: press Ctrl, Shift and C, or Cmd, Shift and C on a Mac, and it shows the count for the page or for your selection.`],
		reply: `Yes, every page keeps its full history: open the page, then the clock icon at the top right, and you'll see every saved version with who saved it. Could you tell me roughly when the change you're after happened?`,
		turns: [
			[`Between {date1} and {date2}. There are dozens of versions in that range.`, `Docs saves a version every few minutes while someone is typing, so it adds up quickly. Which page is it? I'd like to look at its history from our side before I suggest the quickest way through.`],
			[`It's the {page}. The history says {memberFirst} changed the table, but she says she only fixed a typo.`, `I've looked at the history. If you tick "Named versions only" to hide the automatic saves and then Compare the named version before {date1} with the latest, you'll see it: the table shows as changed because {memberFirst} pasted it in again from a spreadsheet, and a pasted table counts as changed throughout, even when only a few cells differ.`, arts.versions],
			[`Can I export the comparison for the committee?`, `Yes, from the comparison's menu, as a PDF with the changes highlighted: additions underlined in green, changed text struck through in red, and the author's name in the margin.`],
			[`Can I stop people changing that page without asking?`, `Set the page to "Can comment" for everyone except the editors. Others can still suggest changes in comments, and the editors decide what goes in.`]
		],
		need: `the name of the page`,
		cause: `the whole table shows as changed because it was pasted in again from a spreadsheet, and "Named versions only" with Compare shows exactly what moved`,
		act: `compare the two versions with "Named versions only" ticked and export the comparison as a PDF`,
		fixed: [`Found it with Compare. It was a paste from the old spreadsheet. Mystery solved, thank you.`, `Exported the comparison and sent it to the committee. They were impressed, which never happens.`],
		follow: `Could the comparison show which cells in a table changed, rather than the whole table?`,
		owe: `ask the Docs team whether cell-level changes are planned for the comparison and tell you by {day}`,
		team: 'the Docs team',
		handover: `Customer on {site} needs to show a committee exactly what changed on a page between {date1} and {date2}, and who changed it. Could someone walk them through the history for that page?`
	},
	{
		area: 'Docs',
		weight: 1,
		subjects: ['Embedded board says no access', 'Board embed in a doc', 'Guests see "no access" on embeds'],
		open: [
			`We've embedded the {board} board in our weekly update doc. It looks great for us, but our guests just see a grey box that says "You don't have access to this board".`,
			`Is it possible for a guest to see a board embedded in a page they can read? At the moment they get an access message instead of the board.`
		],
		quick: [`Can I embed a Google Sheet in a doc?`, `Yes: paste the sheet's share link on a line of its own and it turns into an embed. People need access to the sheet in Google to see it.`],
		reply: `Embeds follow the permissions of the thing that's embedded, so a guest needs access to the board as well as the page. Could you tell me whether the guests are on the project that holds the board?`,
		turns: [
			[`They're on the project for the update doc. I'm not sure where the board lives.`, `No problem. Could you send me the board's link? Then I can see which project it's in.`],
			[`Here it is: https://{site}/b/{num4}.`, `Thanks. The board is in the {ws2} project, and the guests aren't on that one, so they can read the page but not the board, and the embed shows the access message. Either add them to the board's project, or share just that board with them as viewers.`],
			[`If I share the board, can they move cards?`, `Not as viewers. Viewers can open cards and read comments but can't change anything. Guests can be editors on a board too, if you choose, but viewer is the default.`],
			[`I'd rather they saw only the summary, not every card.`, `Then embed a saved view rather than the whole board: filter the board to what you want them to see, save the view, and embed that. Guests with viewer access see only what the view shows.`]
		],
		need: `the board's link`,
		cause: `the board is in the {ws2} project and the guests have no access to it, so the embed in the page shows the access message`,
		act: `share the board, or a saved view of it, with the guests as viewers`,
		fixed: [`Shared a saved view with them as viewers and the guests can see it in the doc now. Lovely.`, `Done, and one of our clients has already said how useful it is. Thanks.`],
		follow: `Could the embed show to guests without giving them access to the board at all? Some of them shouldn't see it outside the doc.`,
		owe: `raise that with the Docs team and let you know by {day} whether they'd consider it`,
		team: 'the Docs team',
		handover: `Guests on {site} see "no access" on a board embedded in a page they can read. Customer would like someone who knows embeds to look at the set-up and suggest the best way to share.`
	},
	{
		area: 'Insight',
		weight: 2,
		subjects: [`Insight numbers don't match the board`, 'Completed cards count is wrong', 'Insight dashboard question'],
		open: [
			`The "Completed per week" chart in Insight says we finished {x1} cards last week. The Done column on the {board} board had {x2} cards added in the same week. Which one is right? I have to report this to our directors.`,
			`I'm building a weekly report in Insight and the numbers never match what I count on the board. It's always a handful out, sometimes more, sometimes fewer.`
		],
		quick: [`Can I share an Insight dashboard with someone who isn't on the site?`, `Not directly. You can invite them as a guest and share the dashboard with them, or export it as a PDF.`],
		reply: `Thanks, I'd like to get to the bottom of that before your report goes out. Could you tell me which chart it is, and which week you're comparing?`,
		turns: [
			[`It's the "Completed per week" chart on our main dashboard, for last week.`, `Thanks. Could you also tell me how you counted on the board? For example, did you count cards in the Done column, or cards that moved into Done during that week?`],
			[`I counted the cards that went into Done that week, from the board's activity. Here's what I get against Insight.`, `That explains most of it. Insight counts a card as completed on the day it first reaches a column marked as done, in the site's time zone. Cards that went into Done, came out and went back in are counted once, in the first week, while your count from the activity includes every move. Your site is on {tz}, too, so a card moved late on a Sunday evening elsewhere can land in a different week.`, arts.insight],
			[`So which is right?`, `Both are right for what they measure. For a report, Insight's is the steadier figure, because a card moved back and forth doesn't count twice. If you want the board's way, there's an option on the chart, "Count every move into done".`],
			[`Can I mark more than one column as done? We have Done and Shipped.`, `Yes: on the board, open each column's settings and tick "Counts as done". Insight picks it up within fifteen minutes.`]
		],
		need: 'a note of how you counted on the board',
		cause: `Insight counts a card once, on the day it first reaches a done column in the site's time zone, while your count took every move into Done`,
		act: `decide which way of counting suits the report, and switch on "Count every move into done" on the chart if you want the board's figure`,
		fixed: [`Ticked "Counts as done" on Shipped as well and the chart matches my count now. Report sent.`, `Now that I understand how it counts, I'm happy with Insight's number. Thanks for explaining it so clearly.`],
		follow: `Could Insight show me which cards it counted for a given week? Then I could check it myself.`,
		owe: `ask the Insight team whether a drill-down to the cards behind a bar is coming and write back by {day}`,
		team: 'the Insight team',
		handover: `Customer's "Completed per week" figure on {site} differs from their own count for last week. Could you check the chart's set-up and explain the difference to them?`
	},
	{
		area: 'Insight',
		weight: 1,
		subjects: ['Scheduled report not arriving', 'Insight emails missing', 'Weekly report email'],
		open: [
			`I set up a weekly Insight report to go to our three directors every Monday at 08:00. I get it, but none of them do. Their addresses are definitely right.`,
			`Our scheduled Insight report only reaches me. Two colleagues and our chair, who uses a personal address, have never had one.`
		],
		quick: [`Can I change the day the weekly Insight email goes out?`, `Yes, open the report and change its schedule. Any day and time works, in the site's time zone.`],
		reply: `Sorry to hear that. Could you tell me the name of the report, and whether the people who don't get it are members of the site?`,
		turns: [
			[`It's called "{report}". Two of them are members, the chair isn't.`, `Thanks. Could you ask one of the members who doesn't get it to look in their spam or quarantine folder for an email from reports@pebblework.com, and send me what it says if they find it?`],
			[`{memberFirst} found it in quarantine. Our IT company sent me this.`, `That helps. Your mail filter held the report because reports@pebblework.com isn't on its allow list of outside senders. Your IT company can add our sending address, and the next report will go straight through.`, arts.bounce],
			[`And the chair? She isn't a member.`, `Scheduled reports only go to members and guests of the site, so that a report with your data can't go to any address someone types in. If you invite her as a guest, she can receive it and open the dashboard, but nothing else.`],
			[`Will a guest count towards what we pay?`, `No, guests are free, up to five for each paying member. She'd only need a seat if she wanted to edit boards or docs.`]
		],
		need: 'a word on what the people who miss the report find in their spam or quarantine folders',
		cause: `your mail filter holds the report because reports@pebblework.com isn't on its allow list, and the chair isn't a member or guest of the site`,
		act: `ask your IT company to allow mail from reports@pebblework.com, and invite the chair as a guest`,
		fixed: [`IT sorted the allow list and the chair is a guest now. All three got Monday's report. Thank you.`, `It arrived for everyone this morning. Turns out it was our filter all along.`],
		follow: `Is there a way to send the report as a PDF attachment instead of a link? The chair prints everything.`,
		owe: `check with the Insight team whether a PDF attachment option is planned and let you know by {day}`,
		team: 'the Insight team',
		handover: `Scheduled report "{report}" on {site} reaches the person who set it up but not the other recipients. Nothing failed on our side as far as I can see. Can you check the delivery?`
	},
	{
		area: 'Insight',
		weight: 1,
		subjects: ['Chart by custom field', 'Insight and dropdown fields', 'Can Insight chart our own fields?'],
		open: [
			`We added a dropdown field called "{field}" to our cards, with the values {fieldValues}. I'd like a chart in Insight that shows how many cards have each value, but the field doesn't appear in the chart builder.`,
			`Insight lets me group by assignee and by column but not by our own fields. Am I missing something? It's the main reason we wanted Insight.`
		],
		quick: [`How many custom fields can a board have?`, `Up to 50 on a board, and up to 100 workspace fields shared across boards.`],
		reply: `You're not missing much: custom fields do work in Insight, but only some kinds, and only once they're available for reporting. Which kind of field is it: dropdown, number, text, date or person?`,
		turns: [
			[`It's a dropdown, called "{field}".`, `Thanks. Could you tell me which board or boards it's on, and whether it was added from a card or from the workspace settings?`],
			[`It's on the {board} board only. I added it from a card, I think.`, `That's why. A field added from a card belongs to that board alone, and Insight only reports on workspace fields, so that a field means the same thing on every board it charts. You can convert it: board settings, Fields, "{field}", Make workspace field.`, arts.fields],
			[`Will converting it lose the values on existing cards?`, `No. Every card keeps its value, and Insight fills in the history from the day the field was created, which takes up to an hour for a board your size.`],
			[`Can I chart two fields against each other, like {field} by assignee?`, `Yes, with a stacked bar chart: put "{field}" on the bars and assignee as the colour. It's under Add chart, Breakdown.`]
		],
		need: 'the name of the board the field is on, and a word on whether it was added from a card or from the workspace settings',
		cause: `"{field}" was added from a card, so it belongs to the {board} board alone, and Insight only reports on workspace fields`,
		act: `make "{field}" a workspace field from the board's settings, then give Insight up to an hour to pick up its history`,
		fixed: [`Converted it and after lunch the field was in the chart builder, with its history. Exactly what I wanted.`, `Done, and I've built the chart. It's already caused an argument in our stand-up, which I take as a good sign.`],
		follow: `Will text fields ever be chartable? We have a free-text "Contact" field that people use like a dropdown.`,
		owe: `ask the Insight team whether text fields are on their list and tell you by {day}`,
		team: 'the Insight team',
		handover: `Dropdown field "{field}" doesn't appear in the chart builder on {site}. Could you check why?`
	},
	{
		area: 'Insight',
		weight: 1,
		subjects: ['Cycle time looks wrong', 'Insight cycle time includes weekends?', 'How is cycle time worked out?'],
		open: [
			`Our average cycle time in Insight is {ct} days, which can't be right. Most of our cards are done in two or three days.`,
			`Can someone explain how Insight works out cycle time? Ours went up sharply last week and nothing changed in how we work.`
		],
		quick: [`What's the difference between lead time and cycle time in Insight?`, `Lead time runs from when a card is created; cycle time runs from when work starts, which is the column you choose as the start.`],
		reply: `Happy to explain, and to check yours. Which dashboard and which chart are you looking at?`,
		turns: [
			[`The "Cycle time" tile on the {board} dashboard.`, `Thanks. Could you send me the tile's settings? I mostly need to see which column it treats as the start.`],
			[`Here are the settings.`, `That's the answer. The start column is set to Backlog, so the clock starts when a card is created rather than when someone begins work on it, and weekends count because "Working days only" is off. Most teams set the start to their first in-progress column. Last week's jump comes from {date1}, when someone moved a batch of cards from the backlog to Done; they came across in your import with their original creation dates, months back, so each added a long cycle time to that week.`, arts.cycle],
			[`Can I leave those old cards out?`, `Yes. Add a filter to the tile, "Created after", with the day your trial started, or filter out a label they share. The tile recalculates straight away.`],
			[`Can the tile show more than one number?`, `It can show the average and the 85th percentile side by side, from the tile's display options. Many teams find the percentile more useful for promising dates.`]
		],
		need: `the tile's settings`,
		cause: `the tile's clock starts at the Backlog column and counts weekends, and a batch of old backlog cards moved to Done on {date1}`,
		act: `set the tile's start column to your first in-progress column, tick "Working days only", and filter out the old cards`,
		fixed: [`Changed the start column and ticked working days. We're at {ct2} days, which feels about right.`, `Makes sense now. Filtered out the old batch and the tile is sensible again.`],
		follow: `Could the tile show the median as well? A few slow cards still pull the average up.`,
		owe: `ask the Insight team about a median option and tell you by {day}`,
		team: 'the Insight team',
		handover: `Cycle time tile on {site} shows {ct} days on average; customer says cards take two or three days. Could you check the calculation and explain it to them?`
	},
	{
		area: 'sign-in and members',
		weight: 2,
		subjects: ['SSO set-up failing', '{idp} SAML error', 'Single sign-on question'],
		open: [
			`I'm setting up single sign-on with {idp} for our trial, following your help article. When I test it, {idp} signs me in and then Pebblework shows "We couldn't sign you in (SAML response invalid)".`,
			`We need SSO working before we can roll the trial out to the whole company. The test sign-in fails every time with an error about the SAML response.`
		],
		quick: [`Does single sign-on work with the mobile app?`, `Yes. The app opens your identity provider's sign-in page and then brings you back to the app.`],
		reply: `Thanks for persevering with it. That error usually comes down to one of three settings. Could you tell me roughly when you last tried, so I can find the attempt in our logs?`,
		turns: [
			[`I tried again just now, at {recent}.`, `Got it, I can see the attempt. To compare it with what {idp} sends, could you copy the Audience and the single sign-on URL from the app's settings in {idp}?`],
			[`Here they are.`, `Found it. {idp} is sending the audience as "pebblework.com", but your site expects "https://{site}/saml/metadata". Change the Audience URI in the {idp} app to that and test again.`, arts.saml],
			[`Do people need to do anything when we switch it on?`, `No. Once you set SSO to required, everyone's next sign-in goes through {idp}. People who already have a password can still use it until you tick "Disable password sign-in".`],
			[`What about our guests? They're not in {idp}.`, `Guests are never sent through SSO, so they keep signing in with email and password. That's deliberate, since they belong to other organisations.`]
		],
		need: `the Audience and the single sign-on URL from the {idp} app's settings`,
		cause: `{idp} is sending "pebblework.com" as the audience, but the site expects "https://{site}/saml/metadata"`,
		act: `change the Audience URI in the {idp} app to "https://{site}/saml/metadata" and run the test again`,
		fixed: [`Changed the audience and the test sign-in went straight through. We're rolling it out on {day}.`, `It works! I've signed in with {idp} three times to be sure. Thank you.`],
		follow: `Now that SSO works, can people's accounts be created automatically from {idp}? Our IT team asked about SCIM.`,
		owe: `send you the SCIM set-up guide for {idp} and check with the security team that it works on a trial, by {day}`,
		team: 'the security team',
		handover: `SAML test sign-in fails on {site} with "SAML response invalid". Customer uses {idp}. Could someone read the full assertion from their latest attempt?`
	},
	{
		area: 'sign-in and members',
		weight: 3,
		subjects: ['Invites not arriving', `Team can't join`, 'Invitation emails'],
		open: [
			`I've invited {seats} colleagues to our trial and only a few have received the invitation. The rest have nothing, not even in spam.`,
			`Our staff aren't getting the invitation emails. I've sent them again twice. We have a training session on {date} and I need everyone in by then.`
		],
		quick: [`How long does an invitation link last?`, `Seven days. After that you can send a fresh one from Site settings, People.`],
		reply: `Sorry, that's annoying when you're trying to get going. Could you tell me the email domain the missing people use, and whether the ones who did get it use the same one?`,
		turns: [
			[`The missing ones are all @{domain2}. The ones who got it are on @{domain}.`, `Thanks, that's a useful pattern. Could you ask your IT team whether they can see our messages reaching the @{domain2} mail server? They come from invites@pebblework.com.`],
			[`IT sent me this from their mail logs.`, `That's clear: the @{domain2} server turns our invitations away because it doesn't accept mail with links to addresses it hasn't seen before. It's a common setting at schools and councils. Your IT team can allow invites@pebblework.com and links to {site}.`, arts.invites],
			[`While IT sorts it out, is there another way in?`, `Yes. Under Site settings, People, copy the invite link and send it to them yourself, from your own mailbox. Anyone who uses it within seven days joins as a member.`],
			[`Can I let anyone with our addresses join without an invite?`, `Yes: turn on "Allow anyone with an approved email domain to join" and add both domains. You'll need to confirm you own each domain with a DNS record first.`]
		],
		need: 'a word from your IT team on whether they can see our invitations reaching the @{domain2} mail server',
		cause: `the @{domain2} mail server turns our invitations away because it blocks mail with links to addresses it doesn't know`,
		act: `ask your IT team to allow invites@pebblework.com and links to {site}, or send the invite link from your own mailbox in the meantime`,
		fixed: [`IT added the exception and the invitations arrived within minutes. Everyone's in.`, `I sent the invite link myself and all of them have joined. Thanks for the workaround.`],
		follow: `Thanks. Could the invitations come from our own address instead of yours? That would solve this for good.`,
		owe: `check whether invitations can come from your own address on Business and tell you by {day}`,
		team: 'the platform team',
		handover: `Invitations from {site} aren't reaching @{domain2} addresses. No bounces recorded on our side that I can find. Can you check the outgoing mail logs for that domain?`
	},
	{
		area: 'sign-in and members',
		weight: 1,
		noTeamFix: true,
		ownerOnly: true,
		subjects: ['Locked out after losing my phone', 'Two-factor problem', `Can't sign in`],
		open: [
			`I set up two-factor authentication when we started the trial and I've now lost my phone. I'm the only admin on the account, so nobody else can let me back in.`,
			`My phone was replaced and the authenticator app didn't come across. Pebblework keeps asking for a code I don't have, and I'm the person who set up the account.`
		],
		quick: [`Can I make two-factor compulsory for everyone on the site?`, `Yes, under Site settings, Security, "Require two-factor". People are asked to set it up at their next sign-in.`],
		reply: `Sorry to hear that; it happens more often than you'd think. Did you keep the backup codes we showed when you turned on two-factor? Each one works once in place of a code.`,
		turns: [
			[`I don't think so. If I did, they were on the old phone.`, `No problem. To take two-factor off an account, we need to be sure it's you. Could you reply from the email address on the account, and tell me the date the trial started and the names of two members?`],
			[`Replying from the right address. We started on {started}, and {member} and {member2} are members.`, `Thanks, that all matches. Our security team approves taking two-factor off an owner's account, so I've asked them to check the details. It usually takes a few hours.`],
			[`Fine. Is there anything I should do meanwhile?`, `Nothing yet. Once two-factor is off, sign in with your password and set it up again on the new phone straight away, and keep the backup codes somewhere other than the phone.`],
			[`Should I add a second admin while I'm at it?`, `Yes, it's worth it. With a second admin, either of you can reset the other's two-factor without coming to us.`]
		],
		need: 'a reply from the email address on the account, with the date the trial started and the names of two members',
		cause: '',
		act: `sign in with your password now that security has taken two-factor off, set it up again on the new phone, and keep the backup codes away from it`,
		fixed: [`I'm back in and two-factor is set up on the new phone. {member} is a second admin now too. Thanks for being quick.`, `All sorted: signed in, two-factor on the new phone, and the codes printed and in the safe.`],
		follow: `Could you tell me who else on the site has two-factor turned on? I'd like everyone to have it before we pay.`,
		owe: `send you a list of the members with and without two-factor, which needs a check from the security team, by {day}`,
		team: 'the security team',
		handover: `Owner of {site} locked out after losing their phone, no backup codes. I've asked them for identifying details. Could security take it from here and contact them directly?`
	},
	{
		area: 'sign-in and members',
		weight: 2,
		subjects: ['Guests or members?', 'Inviting clients and freelancers', 'What counts as a seat?'],
		open: [
			`We work with a lot of freelancers and a few clients. I want to understand who has to be a paid member and who can be a guest before we pick a plan.`,
			`I invited {member} from one of our clients and she's been added as a member, which I think means we'd pay for her. She only needs to look at one board.`
		],
		quick: [`Can a guest be made into a member later?`, `Yes, from Site settings, People. They keep everything they already had access to.`],
		reply: `Good thing to settle before you choose a plan. The short version: guests are free, up to five for each paying member, and only see what you share with them. Roughly how many people of each kind do you have in mind?`,
		turns: [
			[`About {seats} staff, maybe {guests} freelancers and a handful of clients, {member} among them.`, `Thanks. And do the freelancers need to create boards and docs, or only work on the ones you share with them?`],
			[`They need to edit cards and docs, but not start new projects.`, `Then they can all be guests. Guests can edit whatever is shared with them as editors; they just can't create projects or see anything outside what's shared. With {seats} members you could have up to {guestcap} guests for free. {member} can be a guest too: change her role from Site settings, People, and she keeps her access to what's shared with her and stops counting as a seat.`],
			[`Do guests see each other's names?`, `Only on the boards and pages they share. A guest can't see the site's member list.`],
			[`Can a guest be an admin of one board?`, `No, admin roles are for members. A guest can be an editor of a board, which covers most of what freelancers need.`]
		],
		need: 'a word on whether the freelancers need to create boards and docs, or only work on what you share',
		cause: `the freelancers and clients can all be guests, since they only edit what's shared with them, and {member} needs her role changed to guest`,
		act: `change {member} and the other outside people to guests under Site settings, People`,
		fixed: [`Changed the roles. We're at {seats} members and the rest are guests, which makes the numbers work. Thanks.`, `Perfect, {member} is a guest now. That clears the way for us to go ahead.`],
		follow: `Could you send me a quote for {seats} members, so I can show our finance director what we'd pay?`,
		owe: `put together a quote for {seats} members on both plans and send it to you by {day}`,
		team: 'the sales team',
		handover: `{co} works with many freelancers and clients and wants advice on members and guests before choosing a plan. About {seats} staff. Could sales take this?`
	},
	{
		area: 'sign-in and members',
		weight: 1,
		notOwner: true,
		ownerMale: true,
		subjects: ['Change the account owner', 'Transfer ownership', 'Our consultant set up the trial'],
		open: [
			`Our IT consultant, {ownerName}, started this trial for us and is the owner. He's finished his work with us and I'd like the account in my name before we buy.`,
			`The trial was set up by {ownerName} from the agency that built our website. We'd like to take it over ourselves. How do we change the owner?`
		],
		quick: [`Can a site have more than one owner?`, `No, one owner, but as many admins as you like. Admins can do everything except billing and changing the owner.`],
		reply: `That's easy to do, as long as the current owner agrees. Is {ownerFirst} still reachable, and which email address should the new owner use?`,
		turns: [
			[`He's reachable. The new owner should be me, at {email}.`, `Thanks. Are you a member of the site already? The new owner has to be a member before ownership can move.`],
			[`I am, yes, since the first week.`, `Then {ownerFirst} can do it in a couple of minutes: Site settings, Billing, Transfer ownership, and choose you. You'll get an email to accept, and from then on you're the owner and he's an ordinary member.`],
			[`Once it's moved, what should we do about his access?`, `That's up to you. You can change him to a guest so he can still see what you share with him, or leave him as a member while he finishes any handover.`],
			[`Will billing come to me after that?`, `Yes. Invoices and the trial emails go to the owner, so from then on they'll come to you.`]
		],
		need: 'a word on whether you are already a member of the site',
		cause: `ownership can only move when the current owner starts the transfer from Site settings, Billing`,
		act: `ask {ownerFirst} to start the transfer from Site settings, Billing, Transfer ownership, and then accept it from the email you get`,
		fixed: [`{ownerFirst} did it this morning and I've accepted. It's in my name now. Thanks.`, `All done, I'm the owner and the invoices will come to me.`],
		follow: `{ownerFirst} has gone quiet on us. Is there another way, if he doesn't do it?`,
		owe: `find out from the security team what they need from you to move ownership without {ownerFirst}, and let you know by {day}`,
		team: 'the security team',
		handover: `Requester wants ownership of {site} moved from {ownerName}, an outside consultant, to themselves. Could security advise on the process and what proof they'd need?`
	},
	{
		area: 'sign-in and members',
		weight: 1,
		subjects: ['Stuck in a sign-in loop', 'Google sign-in keeps going round', `Can't sign in with Google`],
		open: [
			`Every time I click "Continue with Google" it takes me to Google, I pick my account, and I land back on the Pebblework sign-in page. Round and round.`,
			`Two of our team can't sign in with Google. They choose their account and end up on the sign-in page again. Everyone else is fine.`
		],
		quick: [`Can people sign in with Microsoft accounts?`, `Yes, "Continue with Microsoft" works the same way as Google, for work and school accounts.`],
		reply: `Sorry about that. Could you tell me which browser it happens in, and whether it also happens in a private window?`,
		turns: [
			[`{browser}. In a private window it works.`, `That's a helpful clue. Are there any browser extensions that block trackers or cookies, or a setting that blocks cross-site cookies?`],
			[`One of us has a privacy extension, and the other has "Prevent cross-site tracking" switched on.`, `That's the cause. Our sign-in sets a cookie on pebblework.com and then sends you on to {site}. Blocking cross-site cookies stops that second step, so you end up back at the start. Allowing cookies for pebblework.com fixes it.`],
			[`Is that safe? Our IT person is quite strict.`, `It is. The cookie only holds the sign-in session. If your IT person prefers, they can allow it for pebblework.com alone and leave everything else blocked.`],
			[`Will this be changed so people don't need to touch their settings?`, `We're moving sign-in onto each site's own address this winter, which takes the cross-site step away. I don't have a date yet.`]
		],
		need: 'a word on whether the browsers block trackers or cross-site cookies',
		cause: `the browsers block cross-site cookies, which stops the sign-in passing from pebblework.com to {site}`,
		act: `allow cookies for pebblework.com in those browsers`,
		fixed: [`Allowed the cookie for pebblework.com and both of them got straight in.`, `That was it. Sorted on both machines.`],
		follow: `Can I get a list of who signs in with Google and who uses a password? I'd like everyone on Google.`,
		owe: `check whether that report is available on a trial and send it to you by {day}`,
		team: 'the platform team',
		handover: `Google sign-in loops back to the sign-in page for two users on {site}; it works in a private window. Can you check the sign-in logs?`
	},
	{
		area: 'imports',
		weight: 2,
		subjects: ['Trello import missing labels', 'Problems importing from Trello', 'Trello import'],
		open: [
			`We imported our main Trello board into Pebblework and the cards came through, but every label is missing and the checklists have all been merged into one.`,
			`The Trello import worked for the lists and cards, but not the labels, and anything with two checklists now has one long one. We have about {big} cards, so fixing it by hand isn't an option.`
		],
		quick: [`Does the Trello import bring across attachments?`, `Yes, files attached to cards come across, up to 250 MB each.`],
		reply: `Thanks for trying the import. Could you tell me how you exported from Trello: the JSON export from the board's menu, or a CSV from a Power-Up?`,
		turns: [
			[`The JSON export from the board menu.`, `Good, that's the one we support. Could you send me the summary from the end of the import? It's on the import's page, under Projects, Imports.`],
			[`Here it is.`, `Thanks. The summary says "labels: skipped (no mapping)": the import only brings labels across if you map them on the second screen, and when that screen is skipped they're left out. Checklists are merged when "Keep multiple checklists" is off, which it is by default for older Trello exports.`, arts.trello],
			[`Can I run it again without getting every card twice?`, `Yes. Choose "Update the cards from my last import" on the first screen and the import matches the cards it made before, adding the labels and splitting the checklists, instead of creating new cards.`],
			[`Does it keep the comments people have added in Pebblework since?`, `It does. Updating only changes what came from Trello: labels, checklists, due dates and descriptions. Comments and activity added since stay as they are.`]
		],
		need: 'the summary from the end of the import',
		cause: `the labels weren't mapped on the import's second screen, and "Keep multiple checklists" was off`,
		act: `run the import again with "Update the cards from my last import", map the labels and switch on "Keep multiple checklists"`,
		fixed: [`Ran it again as an update. The labels are there now and the checklists are separate. Thank you!`, `The update worked perfectly, and no doubled cards. Very impressed.`],
		follow: `We have {small} more Trello boards. Can I import them in one go rather than one at a time?`,
		owe: `check with the imports team whether several boards can go in one import and write back by {day}`,
		team: 'the imports team',
		handover: `Trello JSON import on {site}: labels missing, checklists merged. Customer used the board's JSON export. Can you look at the import job?`
	},
	{
		area: 'imports',
		weight: 2,
		subjects: ['CSV import mixed up dates', 'Due dates wrong after import', 'Import from a spreadsheet'],
		open: [
			`I imported our project plan from a CSV and half the due dates are wrong. Something due on 3 April is now due on 4 March.`,
			`After importing our tasks from a spreadsheet, the due dates are a mess. Some are right and some have the day and month swapped. The ones after the 12th seem fine.`
		],
		quick: [`What can a CSV import fill in?`, `Title, description, column, assignee, due date, labels and any custom field. You match the columns on the mapping screen.`],
		reply: `That pattern, with dates after the 12th coming through fine, points to the date format. Could you send me the first few rows of the file, with anything confidential blanked out?`,
		turns: [
			[`Here are the first rows.`, `Thanks. Your dates are day first. Do you remember what the "Date format" box said on the mapping screen? It's under the list of columns.`, arts.csv],
			[`I didn't see a date format box at all. I just clicked through.`, `That's what happened, then. The format box defaults to month first, and that's how the importer read your dates. A date like 25/03 can't be month first, so those came in right, but anything up to the 12th came in with the day and month swapped.`],
			[`Can I fix the ones already imported?`, `The simplest way is to import the file again with "Update existing cards" and the format set to day first. It matches cards by title, so as long as the titles haven't changed, the dates are corrected in place.`],
			[`A few titles have changed since.`, `Those won't match and would come in as new cards. If it's only a few, it may be quicker to correct them by hand.`]
		],
		need: `a word on what the "Date format" box said on the mapping screen`,
		cause: `the mapping screen read the dates as month first, so every date up to the 12th of a month came in with the day and month swapped`,
		act: `import the file again with "Update existing cards" and the date format set to day first`,
		fixed: [`Imported it again with day first and the dates are all correct now. Thank you so much.`, `Done, and I fixed the three renamed ones by hand. All good.`],
		follow: `Could the importer guess the format from the file? Everyone here will make the same mistake.`,
		owe: `pass that to the imports team, and send you a list of the cards whose due dates fall on or before the 12th, by {day}`,
		team: 'the imports team',
		handover: `CSV import on {site}: due dates with day and month swapped for days up to the 12th. Customer can't remember the mapping settings. Can you check what the job used?`
	},
	{
		area: 'imports',
		weight: 1,
		subjects: ['Images missing after import', 'Importing pages into Docs', '{wiki} import broken links'],
		open: [
			`We imported our handbook from {wiki} into Docs. The text is fine, but about half of the images are grey boxes, and links between pages go to {wiki}, not to the new pages.`,
			`Our {wiki} import into Docs finished with warnings. The pages look right at first glance, but the pictures are missing on many of them.`
		],
		quick: [`Can I bring Word documents into Docs?`, `Yes, drag a .docx file onto a page tree and it becomes a page, with its headings and tables kept.`],
		reply: `Thanks for persevering. Could you tell me how you exported from {wiki}: as HTML, as Markdown or as a PDF?`,
		turns: [
			[`As HTML, the whole space in one zip.`, `Good, that's the best option. Could you send the list of warnings from the import's page? It names the files it couldn't use.`],
			[`Here's the list.`, `That's helpful. The missing images were stored in {wiki} as attachments on other pages, so the export put links to them in the zip rather than the files. The export needs "Include attachments" ticked. Links between pages are rewritten only when both pages are in the same import.`, arts.docsWarnings],
			[`So I should export again with attachments?`, `Yes, and bring it in with "Update pages from my last import", so you don't get a second copy of every page. The links are rewritten then, too, as long as all the pages are in the same zip.`],
			[`Some of the pages have already been edited in Pebblework.`, `Updating replaces the text of pages that came from the import. If a page has been edited here since, the import skips it and lists it, so nothing written in Pebblework is overwritten.`]
		],
		need: `the list of warnings from the import's page`,
		cause: `the {wiki} export was made without attachments, so images stored on other pages weren't in the zip, and links only rewrite between pages in the same import`,
		act: `export the space again from {wiki} with "Include attachments" ticked, and bring it in with "Update pages from my last import"`,
		fixed: [`Exported with attachments and updated. The images are all there and the links point to our pages. Brilliant.`, `The second import worked and skipped the pages we'd edited, as you said. Thanks.`],
		follow: `Can the import keep the original page authors instead of putting my name on everything?`,
		owe: `ask the imports team whether authors can be matched by email and tell you by {day}`,
		team: 'the imports team',
		handover: `{wiki} HTML import into Docs on {site}: images missing on many pages, and links point back to {wiki}. Can you look at the import?`
	},
	{
		area: 'imports',
		weight: 1,
		subjects: ['Assignees missing after Asana import', 'Asana CSV import', 'Imported tasks have no owner'],
		open: [
			`We moved our projects over from Asana with a CSV export. All the tasks are there, but most have no assignee, even though everyone has joined Pebblework.`,
			`The Asana import put every task in the right place, but only a few have their assignee. The rest say "Unassigned".`
		],
		quick: [`Do Asana sections come across as columns?`, `Yes, each section becomes a column on the board the import creates.`],
		reply: `Thanks for the details. The importer matches assignees by email address. Could you tell me how many of your members have an assignee showing on their tasks?`,
		turns: [
			[`Only {small} of us.`, `Thanks. Could you send me the import's user report? It lists every assignee from the file and who, if anyone, they were matched to.`],
			[`Here's the report.`, `That's it: in Asana your team used their old @{domain2} addresses, and in Pebblework they joined with @{domain}, so the importer couldn't match them. On the import's page there's a "Match people" step where you can pair each Asana address with a member.`, arts.users],
			[`If I pair them now, will it update the existing tasks?`, `Yes. Pairing after the import updates the assignee on every task from that import straight away. It doesn't touch tasks someone has assigned by hand since.`],
			[`Can we also bring in the Asana followers?`, `Followers come across as watchers, using the same pairing, so once you've paired people they'll be added too.`]
		],
		need: `the import's user report`,
		cause: `the team's Asana addresses are @{domain2} and their Pebblework ones are @{domain}, so the importer couldn't match them`,
		act: `pair each Asana address with the right member in the "Match people" step on the import's page`,
		fixed: [`Paired everyone and the assignees appeared on every task. Lovely.`, `All matched up. Our project leads are much happier this morning.`],
		follow: `Could the importer match on name when the email doesn't match? It would have saved us this.`,
		owe: `raise matching by name with the imports team and let you know by {day} whether it's on their list`,
		team: 'the imports team',
		handover: `Asana CSV import on {site}: most tasks unassigned, though all members have joined. Can you check the user matching for that import?`
	},
	{
		area: 'billing and plans',
		weight: 2,
		noTeamFix: true,
		soonEnds: true,
		subjects: ['Quote for our finance team', 'Need a quote with our VAT number', 'Purchase order'],
		open: [
			`Our finance team needs a formal quote before they'll raise a purchase order. We're looking at {seats} members on the {plan} plan, paid annually. Our trial ends on {ends}, so it's a bit urgent.`,
			`Before we can pay, I need a quote made out to {co} with our VAT number on it. Can you send one? We're thinking of {seats} seats on {plan}, annual billing.`
		],
		quick: [`Do you take payment by bank transfer?`, `Yes, on annual plans: choose "Pay by invoice" when you upgrade, and you have 30 days to pay.`],
		reply: `Of course. Could you confirm the company's registered name and address, and the VAT number you'd like on the quote?`,
		turns: [
			[`{co}, {address}. VAT number {vat}.`, `Thanks. Would you like the quote in {curName}, or in another currency? We can bill in US dollars, pounds or euros.`],
			[`{curName}, please.`, `Here's the quote; it's valid for 30 days. Your finance team can pay by card or by bank transfer against the invoice, and if you send the purchase order number before you upgrade, it goes on the invoice.`, arts.quote],
			[`Our purchase orders can take two weeks. Will the trial run out?`, `It would end on {ends}, so I've extended it by {ext} days, to {newEnd}. The order can go through without anyone losing access.`],
			[`Thank you. Who do I send the order to?`, `Reply to this ticket with it attached and it comes to me. I'll put the number on the invoice and send it to your finance team.`]
		],
		need: 'the currency you would like the quote in',
		cause: '',
		act: `send us the purchase order number before you upgrade, so that it appears on the invoice`,
		fixed: [`Order attached: {po}. Thanks for all the help, the finance team are happy.`, `Finance have approved it, order number {po} attached. We'll upgrade this week.`],
		follow: `Finance are also asking for a completed supplier form and your bank details on letterhead. Can you send those?`,
		owe: `get the supplier form completed by our finance team and send it to you with the bank letter by {day}`,
		team: 'the billing team',
		handover: `Quote needed for {co}: {seats} seats, annual, {plan}. Company details and VAT number are in the ticket. Trial ends {ends}. Could billing issue it?`
	},
	{
		area: 'billing and plans',
		weight: 3,
		noTeamFix: true,
		soonEnds: true,
		subjects: ['Can we have more time?', 'Trial extension request', 'Extend our trial please'],
		open: [
			`Our trial ends on {ends} and we haven't had a fair go at it: half the team were away for {reason}. Is there any chance of a couple more weeks?`,
			`Could our trial be extended? We're waiting on a decision from {approver}, who don't meet until after the trial ends, and I'd hate everyone to lose access in the meantime.`
		],
		quick: [`When exactly does our trial end? I can't find it anywhere.`, `It's on Site settings, Billing, and I can see yours ends on {ends}.`],
		reply: `Thanks for asking rather than letting it run out. I can extend trials from our side. How much more time do you think you'll need?`,
		turns: [
			[`Two weeks would do it, maybe three to be safe.`, `That should be fine. Is there a date the decision is due? I'd like to make sure the extension covers it with a little room.`],
			[`The decision is on {date}.`, `Done: I've extended your trial by {ext} days, so it now ends on {newEnd}. That covers the decision with a few days to spare, and nothing changes for your team in the meantime.`],
			[`Thank you! Will we get the reminder email again?`, `Yes, the "trial ending" reminder goes to the owner three days before the new end date, so you'll get one then.`],
			[`And if the decision slips again?`, `Reply on this ticket and I'll look at it again. The most I can add in one go is 60 days.`]
		],
		need: 'the date the decision is due',
		cause: '',
		act: `upgrade from Site settings, Billing before {newEnd} if the decision goes your way`,
		fixed: [`That's a weight off. Thank you, {agent}.`, `Brilliant, the new date shows on the billing page. Much appreciated.`],
		follow: `Thank you. Our board might want a formal written offer before the meeting. Could someone send one?`,
		owe: `ask our sales team to prepare a written offer for {seats} members and send it to you by {day}`,
		team: 'the sales team',
		handover: `{co} is asking for more trial time while a decision is pending, and mentions a possible purchase for about {seats} members. Could sales pick it up and agree the length with them?`
	},
	{
		area: 'billing and plans',
		weight: 1,
		soonEnds: true,
		subjects: ['Card payment failing', `Can't upgrade, card declined`, 'Upgrade problem'],
		open: [
			`I'm trying to upgrade to {plan} before the trial ends and the card payment keeps failing. The bank says there's nothing wrong with the card.`,
			`Every time I try to pay, the bank's security window opens, I approve it on my phone, and then Pebblework says the payment failed. Three times now.`
		],
		quick: [`Can we pay in euros?`, `Yes. Choose the currency on the upgrade page before you pay. It can't be changed afterwards without a new subscription.`],
		reply: `Sorry, that's frustrating when you're trying to pay us! Could you tell me roughly when you last tried, so I can find the attempts?`,
		turns: [
			[`Yesterday at {time}, and twice the day before.`, `Thanks, I can see three attempts. Could you tell me which browser you're using, and whether you have a pop-up or tracking blocker switched on?`],
			[`{browser}, and yes, a pop-up blocker.`, `That fits. The bank's security check opens in a small window and reports back to us when you approve. A pop-up blocker can let the window open but stop it reporting back, so we never hear that you approved. Allowing pop-ups for pebblework.com, or paying from another browser, usually solves it.`, arts.payment],
			[`Would bank transfer be easier?`, `It can be. On annual plans you can choose "Pay by invoice" when you upgrade, and you have 30 days to pay by transfer. Monthly plans need a card.`],
			[`Will the trial end before an invoice is paid?`, `No. As soon as you upgrade, the account moves to the paid plan, whatever the payment method.`]
		],
		need: 'the name of your browser, and a word on whether a pop-up or tracking blocker is switched on',
		cause: `the pop-up blocker in your browser lets the bank's window open but stops it reporting back that you approved the payment`,
		act: `allow pop-ups for pebblework.com, or try the payment from another browser`,
		fixed: [`Allowed pop-ups and it went through first time. We're on {plan} now!`, `Paid from a different browser and it worked. Thank you, we're officially customers.`],
		follow: `It went through, thanks. Can I have the receipt with our company address on it rather than mine?`,
		owe: `ask the billing team to reissue the receipt with the company's address and send it to you by {day}`,
		team: 'the billing team',
		handover: `Upgrade payment for {co} failing after the bank's security check, three attempts. Could you check the payment provider's records?`
	},
	{
		area: 'billing and plans',
		weight: 1,
		noTeamFix: true,
		subjects: ['Monthly or annual?', 'Question about billing', 'Changing seats after upgrading'],
		open: [
			`We're about to upgrade. If we start monthly and move to annual later, do we lose anything? And what happens if we add people halfway through a year?`,
			`Before we pay: how does billing work when the number of people changes? We take on seasonal staff every {season} and I don't want to pay for them all year.`
		],
		quick: [`Do you charge for guests?`, `No, guests are free, up to five for each paying member.`],
		reply: `Good questions to ask before you upgrade. Roughly how many people would you have most of the year, and how many at your busiest?`,
		turns: [
			[`About {seats} most of the year, up to {peak} in {season}.`, `Thanks. And would the seasonal staff need to edit, or only see and comment on what's shared with them?`],
			[`They need to tick off cards and add comments. Not much else.`, `Then you may not need seats for them at all. Guests can edit the cards and pages shared with them, so seasonal staff could be guests: with {seats} members you can have up to {guestcap} guests for free.`],
			[`And if we do add members halfway through an annual plan?`, `You pay for the rest of the year for each new member, worked out to the day, on your next invoice. On annual, a seat you stop using frees up for someone else but isn't refunded; on monthly, the next bill simply goes down.`],
			[`So monthly first, then annual?`, `That works well. When you switch to annual, we credit what's left of the current month, and annual works out about 20 percent cheaper.`]
		],
		need: 'a word on whether the seasonal staff need to edit, or only see and comment',
		cause: '',
		act: `invite the seasonal staff as guests rather than members when they start`,
		fixed: [`That's really clear, thank you. We've upgraded to monthly and will switch to annual in the new year.`, `Perfect. We'll make the seasonal team guests. Upgrading now.`],
		follow: `Could you put all that in writing, with the actual figures for {seats} and {peak} people? Our treasurer will ask.`,
		owe: `send you a worked example with the figures for {seats} and {peak} people on both billing periods by {day}`,
		team: 'the billing team',
		handover: `{co} wants billing explained for seasonal staff before upgrading: {seats} people usually, {peak} at the busiest. Could billing advise?`
	},
	{
		area: 'billing and plans',
		weight: 2,
		noTeamFix: true,
		ended: true,
		outcomes: ['resolved', 'owe', 'team', 'quiet'],
		subjects: ['Please stop the trial emails', 'Trial ending email, but it ended weeks ago', 'Why am I still getting these?'],
		open: [
			`I keep getting "Your Pebblework trial ends in 3 days" emails, but our trial ended on {ends}. We decided not to go ahead for now. Could you make them stop?`,
			`I've had the same "trial ending" email every morning this week. Our trial finished on {ends}, so it's confusing for the team, who keep asking me whether we've bought it.`
		],
		quick: [`Who gets the email when a trial is about to end?`, `The account owner, three days before the end date.`],
		reply: `Sorry about that, those emails shouldn't be reaching you. Could you forward me one of them, so I can see which one it is and where it came from?`,
		turns: [
			[`Here's this morning's, and a list of the last few.`, `Thanks. That's our trial reminder, and it went to you because the account is still on the trial plan, even though the trial ended on {ends}. Roughly how many have you had in total?`, arts.reminders],
			[`One most days since the trial ended, so about {count}.`, `Thanks for counting. The reminder is meant to go only in the last three days of a trial, so you should never have had one after {ends}. It's a fault on our side, and I've reported it with your account as the example.`],
			[`Will it stop?`, `I've switched off trial emails for your account from our side, so you won't get any more of them.`],
			[`Thanks. For what it's worth, we liked Pebblework; it just wasn't the right time.`, `That's good to hear, and thanks for saying so. If anything changes, you know where we are.`]
		],
		need: 'a rough count of how many of these emails you have had',
		cause: '',
		act: '',
		fixed: [`No email this morning. Thank you.`, `They've stopped. Appreciate it.`],
		follow: `Thanks. Two of my colleagues are getting them too, on their own addresses. Can you stop theirs as well?`,
		owe: `make sure your colleagues stop getting the trial emails too, and confirm it here by {day}`,
		team: 'the platform team',
		handover: `Trial for {co} ended on {ends}, but the owner has had the "trial-ending" reminder most days since. The account is still on the trial plan. Can you see why the reminder keeps going out?`
	},
	{
		area: 'billing and plans',
		weight: 1,
		noTeamFix: true,
		subjects: ['Charity discount?', 'Do you offer an education price?', 'Pricing for a non-profit'],
		open: [
			`We're a registered charity and our budget is tight. Do you offer a discount for charities? We'd be about {seats} people.`,
			`Is there a discount for schools or charities? We're trialling Pebblework across {seats} staff and our trustees have asked me to find out before we go any further.`
		],
		quick: [`Do you have a discount for start-ups?`, `Not a standing one. The charity and school discount is the only one we offer all year.`],
		reply: `Yes, we do: registered charities and schools get 50 percent off the Team and Business plans. Could you tell me your charity or school registration number?`,
		turns: [
			[`It's {regno}.`, `Thanks. Could you also send me a document that shows the registration under your organisation's name, such as your page on the register or a letter from a funder? The reviewers need the name and the number together.`],
			[`Here's the link to our page on the register, and our latest annual report.`, `That's everything the reviewers need. I've sent it to them, and they usually confirm within two working days. Once it's approved, the discount shows on the upgrade page by itself.`],
			[`Can the discount go on an annual plan?`, `Yes, monthly or annual. On annual, it comes on top of the annual saving.`],
			[`How long does the discount last once it's approved?`, `As long as the organisation stays registered. We ask for a fresh document every two years.`]
		],
		need: `a document that shows the registration under your organisation's name`,
		cause: '',
		act: `upgrade from Site settings, Billing once the reviewers' approval email arrives, and the discount will be applied there`,
		fixed: [`Approved, and the price on the billing page is half what it was. We'll upgrade this week. Thanks!`, `Brilliant news. The trustees will be delighted.`],
		follow: `Our partner charity is trialling Pebblework too. Could they have the discount as well?`,
		owe: `check whether their trial can have the discount and let you know by {day}`,
		team: 'the billing team',
		handover: `Discount request from {co}, registration number {regno}. Could billing review it and ask them for whatever proof they need?`
	},
	{
		area: 'other',
		weight: 1,
		subjects: ['Slack notifications stopped', 'Slack integration', 'Nothing posting to Slack'],
		open: [
			`Our Pebblework updates stopped posting to our #{channel} Slack channel on {pastday}. Before that it worked perfectly.`,
			`The Slack integration worked for the first week of the trial, and now nothing arrives in Slack, although Pebblework says it's connected.`
		],
		quick: [`Does Pebblework work with Microsoft Teams as well as Slack?`, `Yes, there's a Teams integration under Site settings, Integrations, that posts to a channel in the same way.`],
		reply: `Thanks for letting us know. Did anything change in Slack around then, such as a channel being renamed or made private?`,
		turns: [
			[`Not that I know of. I'll ask our Slack admin.`, `Thanks. Meanwhile, could you send me the delivery log from the integration's page? It's under Site settings, Integrations, Slack, Recent deliveries.`],
			[`Our admin says the channel was renamed from #{oldchannel} to #{channel} on {pastday}. Here's the log.`, `That's it. The integration still posts to the old name, and Slack answers "channel_not_found", so the messages go nowhere. Choose the channel again in the integration's settings and it'll pick up the new name.`, arts.slack],
			[`Will the missed updates be sent now?`, `No, the missed ones aren't sent again. Only new events from now on.`],
			[`Can we send different boards to different channels?`, `Yes: add one rule per board in the integration's settings, each with its own channel.`]
		],
		need: `the delivery log from the integration's page`,
		cause: `the channel was renamed in Slack and the integration is still posting to the old name`,
		act: `choose the channel again in the Slack integration's settings`,
		fixed: [`Picked the channel again and the updates are coming through. Thanks.`, `Working again. Our admin promises to tell us next time he renames something.`],
		follow: `Can the integration follow a channel when it's renamed, so this doesn't happen again?`,
		owe: `ask the integrations team whether renamed channels can be followed and tell you by {day}`,
		team: 'the integrations team',
		handover: `Slack integration on {site} stopped posting on {pastday}; it still shows as connected. Can you check the delivery logs?`
	},
	{
		area: 'other',
		weight: 1,
		subjects: ['No notifications on Android', 'Mobile app notifications', 'Phone app not alerting me'],
		open: [
			`I've installed the Pebblework app on my Android phone and I'm signed in, but I never get notifications, even when someone mentions me.`,
			`Half of our team get notifications from the Pebblework app and the other half don't. As far as I can tell, it's the Android users who don't.`
		],
		quick: [`Is there an iPad app?`, `Yes, the iOS app works on iPad too, with a wider layout for boards.`],
		reply: `Thanks for the details. Could you tell me the phone model and the app version? The version is under Settings, About, in the app.`,
		turns: [
			[`It's a {phone}, app version {appv}.`, `Thanks. Could you open the app's Settings, then Diagnostics, and send me what it shows under Notifications?`],
			[`Here's the diagnostics screen.`, `That shows it: Android's battery optimisation has put the app to sleep, so the phone holds back our notifications. In the phone's battery settings, choose Pebblework and set it to "Unrestricted". Many phone makers switch this on for new apps.`, arts.mobile],
			[`Will I need to sign in again after changing it?`, `No. Notifications should start with the next mention. If they don't, sign out and in again so the app registers with the phone afresh.`],
			[`Can I choose which notifications come to the phone?`, `Yes, in the app's Settings, Notifications. Most people keep mentions and assignments and turn off the rest.`]
		],
		need: `a copy of what the app's diagnostics screen shows under Notifications`,
		cause: `the phone's battery optimisation puts the app to sleep and holds back its notifications`,
		act: `set the Pebblework app to "Unrestricted" in the phone's battery settings`,
		fixed: [`Set it to unrestricted and got a notification within minutes. Sorted.`, `All the Android people have changed it and they're getting notifications now.`],
		follow: `Could the app warn people about the battery setting when they first install it?`,
		owe: `put that suggestion to the mobile team and let you know their answer by {day}`,
		team: 'the mobile team',
		handover: `Android users on {site} get no notifications from the app: {phone}, app {appv}. Can you check delivery for them?`
	},
	{
		area: 'other',
		weight: 1,
		noTeamFix: true,
		subjects: ['Where is our data stored?', 'Data processing agreement', 'Security questions before we buy'],
		open: [
			`Before we can sign up, our data protection officer needs to know where our data is stored, and wants a signed data processing agreement.`,
			`Our compliance team has a questionnaire for new suppliers, and the first questions are about where data is hosted and who your subprocessors are. Can you help?`
		],
		quick: [`Is Pebblework certified to ISO 27001?`, `Yes. The certificate is on our trust page, and the latest SOC 2 report is available under NDA.`],
		reply: `Of course. Could you tell me which region your site was created in? It's shown under Site settings, General, as "Data region".`,
		turns: [
			[`It says {region}.`, `Thanks. Then your data is stored in {regionPlace}. Could you send me the questionnaire, or tell me which documents your officer needs?`],
			[`Here's the questionnaire. They need the DPA and the list of subprocessors too.`, `Thanks. Our standard DPA can be signed online by the account owner, from Site settings, Billing, Legal, and the subprocessor list is on our trust page. Some of the questions need answers I can't give myself, so I've asked our security team to fill in those parts.`, arts.questionnaire],
			[`How long will the security team take?`, `Usually three to five working days for a questionnaire this size.`],
			[`Can the site move to another region later?`, `Yes, on request, once you're on a paid plan. It takes a weekend, and we agree the date with you.`]
		],
		need: 'the questionnaire, or a list of the documents your officer needs',
		cause: '',
		act: `have the account owner sign the DPA online from Site settings, Billing, Legal`,
		fixed: [`Security sent the completed questionnaire and our officer has signed off. Thank you all.`, `We have everything we needed, and the DPA is signed. We're clear to go ahead.`],
		follow: `Our officer would also like the summary of your latest penetration test. Can you send it?`,
		owe: `get the latest penetration test summary from the security team and send it to you by {day}`,
		team: 'the security team',
		handover: `{co} needs a supplier questionnaire answered and the DPA before buying. Site region {region}. Could security help?`
	},
	{
		area: 'other',
		weight: 1,
		subjects: ['API returning 429', 'Rate limit on the API', 'Our integration keeps failing'],
		open: [
			`We're writing a small script to copy our job sheets from our own system into Boards. It works for a while and then the API starts answering 429.`,
			`Our developer is connecting our booking system to Pebblework through the API, and every so often the requests fail with "Too Many Requests".`
		],
		quick: [`Where do I make an API token?`, `Under Profile, API tokens. A token acts as you, so it can see what you can see.`],
		reply: `Thanks. A 429 means the script has gone over the rate limit for its token. Roughly how many requests does it send, and how quickly?`,
		turns: [
			[`It creates or updates one card per job sheet, about {big} of them, as fast as it can.`, `Thanks. Could you send me the headers of one of the 429 answers? They show the limit and when it resets.`],
			[`Here are the headers.`, `That confirms it. Tokens on a trial can make 300 requests a minute, and the script reaches that in its first minute. It should read the Retry-After header and wait that many seconds, or send its updates in batches: the cards endpoint takes up to 50 cards in one request.`, arts.api],
			[`Is the limit higher on a paid plan?`, `Yes, 1,200 a minute on Team and Business. Batching helps either way: {big} cards is about {batches} requests in batches of 50.`],
			[`Is there a sandbox we can test against?`, `Not a separate one, but many teams make a test project on their site and point the script at it until it behaves.`]
		],
		need: 'the headers of one of the 429 answers',
		cause: `the script sends requests faster than the trial's limit of 300 a minute and doesn't wait for the Retry-After time`,
		act: `have the script honour Retry-After and send cards in batches of up to 50`,
		fixed: [`Our developer added the batching and the sync runs in under a minute now, with no 429s.`, `Works perfectly with Retry-After. Thanks for the clear pointer.`],
		follow: `Could you raise our limit for the rest of the trial? We'd like to test the full sync before we buy.`,
		owe: `ask the platform team whether the trial limit can be raised for your token and let you know by {day}`,
		team: 'the platform team',
		handover: `API token on {site} getting 429s; customer says the script sends about {big} requests. Can you check the token's usage?`
	},
	{
		area: 'other',
		weight: 1,
		subjects: ['Using Boards with a screen reader', 'Moving cards with the keyboard', 'Accessibility question'],
		open: [
			`One of our team, {member}, uses a screen reader. She can read the cards but can't move them between columns, because dragging doesn't work for her.`,
			`Is there a way to move cards between columns using only the keyboard? A colleague, {member}, can't use a mouse, and the trial depends on whether she can work with it.`
		],
		quick: [`Is there a dark mode?`, `Yes, under Profile, Appearance. It follows your computer's setting by default.`],
		reply: `Thanks for asking, and yes, there is. Could you tell me which screen reader and browser she uses, so I can give you the exact keys?`,
		turns: [
			[`{reader} with {browser}.`, `Thanks. Could you check whether keyboard shortcuts are turned on in her profile? It's under Profile, Accessibility.`],
			[`I've had a look: they're off.`, `That's why. Once they're on, she can select a card, press M, use the arrow keys to choose a column and press Enter to drop it there. {reader} reads out the column's name and the position as she goes.`],
			[`Can she also change the order within a column?`, `Yes: with the card selected, Shift and the up or down arrow moves it one place.`],
			[`Is there a list of all the shortcuts?`, `Press the question mark key on any board and a list opens. There's an accessible version on our help site as well.`]
		],
		need: 'a word on whether keyboard shortcuts are turned on in her profile',
		cause: `keyboard shortcuts are turned off in her profile, so the move keys don't work for her`,
		act: `turn on keyboard shortcuts in her profile, then use M and the arrow keys to move cards`,
		fixed: [`{member} has tried it and says it works well with {reader}. Thank you.`, `She moved a whole week's cards this morning without help. Brilliant.`],
		follow: `{member} says the calendar view doesn't read out well at all. Is that being worked on?`,
		owe: `ask the Boards team about the calendar and screen readers and tell you by {day}`,
		team: 'the Boards team',
		handover: `Screen reader user on {site} can't move cards: {reader} with {browser}. Could you check the keyboard move works for them and advise?`
	}
];

// ---------------------------------------------------------------------------------------------------------
// Shared parts of a conversation.
const backstories = [
	`We're {seats} people at {co} and we're trialling Pebblework to replace {tool}.`,
	`Some context: I'm the {titleLower} at {co}, and I've been asked to decide by the end of the trial whether we move everyone over from {tool}.`,
	`We started our trial after a demo with your sales team, and so far it's going well apart from this.`,
	`I'm setting up the trial for {co} on behalf of our director, so apologies if this is obvious.`,
	`We have {seats} people on the trial, spread across two offices, and most of them are new to this kind of tool.`,
	`We'd like to be off {tool} for good by the end of the trial, so we're under a bit of time pressure.`,
	`I'm not very technical, so please bear with me.`,
	`This is our second go at a trial; the first time round we didn't have the time to try it properly.`,
	`I used Pebblework at my last job and persuaded {co} to give it a go, so I'd like it to work.`,
	`Most of the team are on Windows laptops and a few on Macs, in case that matters.`,
	`We're a small team at {co} and I look after anything with a plug, which now includes Pebblework.`,
	`We've been on the trial for about a week, moving across from {tool} one team at a time.`
];
const firstGreetings = ['Hi,', 'Hello,', 'Hi there,', 'Hello Pebblework team,', 'Hi support,', ''];
const replyGreetings = ['Hi {agent},', '{agent},', '', 'Hi again,', 'Hello {agent},', 'Hi {agent},'];
const custSignoffs = ['Thanks,\n{first}', 'Many thanks,\n{full}\n{title}, {co}', 'Cheers,\n{first}', 'Best regards,\n{full}\n{title}\n{co}', '{first}', 'Kind regards,\n{full}'];
const replySignoffs = ['Thanks,\n{first}', '{first}', 'Cheers, {first}', '', 'Thanks again,\n{first}'];
const agentGreetings = ['Hi {first},', 'Hello {first},', 'Hi {first}, thanks for writing in.'];
const agentGreetingsLater = ['Hi {first},', 'Hello again {first},', 'Hi {first}, thanks for getting back to me.', 'Hello {first},', 'Hi {first},'];
const agentSignoffs = ['Best,\n{agent}\nPebblework Support', 'Thanks,\n{agent}', 'All the best,\n{agent} | Pebblework Support', 'Speak soon,\n{agent}', 'Kind regards,\n{agent}\nPebblework Support'];
const agentIntros = [`Thanks for getting in touch.`, `Thanks for the clear description; it helps a lot.`, `Sorry for the wait, it's been a busy morning here.`, `Thanks for reaching out about this.`, `Thanks for trying Pebblework, and for telling us when something gets in the way.`];
const custAcks = [`Thanks, that helps.`, `OK, understood.`, `Right.`, `Thanks for the quick reply.`, `Ah, I see.`, `Makes sense.`, `Thank you, that's clearer than the help article.`, `Great, thanks.`];
const vagueSubjects = ['Help please', 'A few questions', 'Trial questions', 'Problem', 'Following up on our call', '(no subject)', 'Re: Welcome to your Pebblework trial', 'Quick question'];
const holdings = [`Thanks, let me look into this properly and come back to you.`, `Thanks for that. I want to check something with a colleague before I answer, so bear with me.`, `Got it, thank you. I'll look at your site and come back to you.`];
const notes = [
	`Checked {site} in the admin tool: {seats} members, {guests} guests, trial ends {ends}. Nothing unusual in the account history.`,
	`Customer is comparing us with {tool}; keen to convert if this gets sorted, going by the first message.`,
	`Tried it on our test site with the same settings. Couldn't make it happen there.`,
	`Sales asked to be kept in the loop on this one: {seats}-seat trial, possibly Business.`,
	`Similar question came up on another trial last week; the help article doesn't cover it well.`,
	`Customer sounds pressed for time. Prioritising.`
];
const passLines = [
	`I've passed this to {team}, who can look at how {site} is set up more closely than I can. They'll reply on this ticket, so their answer will come to you by email.`,
	`I've asked {team} to take this one, as it needs someone who can see more of {site} than I can. They'll pick it up from here and write to you on this ticket.`,
	`This needs {team}, so I've handed it to them with everything above. You'll hear from them on this ticket.`
];
const mateAcks = [`Hi {first}, {mate} from {team} here. I've picked this up and will be in touch once I've had a proper look.`, `Hello {first}, this is {mate} from {team}. Thanks for your patience; I'm looking at it now and will update you here.`];
const actLines = [
	`So the next step is on your side: you'll need to {act}. Once that's done it should behave, but reply here if it doesn't.`,
	`From here it's with you: you'll need to {act}. I'll keep the ticket open in case you need anything.`,
	`To sum up, you'll need to {act}. Let me know how you get on.`
];
const willDos = [`OK, I'll do that {when} and let you know.`, `Will do. {memberFirst} has the access, so I'll ask her {when}.`, `Thanks. I'll try that {when}.`, `Understood. I'll get on to it {when}.`];
const whens = ['tomorrow', 'this afternoon', 'on Monday', 'after our team meeting', 'later this week'];
const oweLines = [`Leave that with me. I'll {owe}.`, `Good question. Let me {owe}.`, `I'll {owe}, and I'll keep this ticket open until then.`];
const thanksLines = [`Thanks, I'll look out for it.`, `Great, thank you.`, `Appreciated, thanks.`, `Thanks, speak then.`];
const closings = [`Great to hear. I'll leave it there, but reply to this email if anything comes back.`, `Glad that did it!`, `Brilliant, thanks for letting me know.`, `Good news. Enjoy the rest of the trial.`];
const nudges1 = [`Just checking in. When you have a moment, I still need {need} to get any further. I'll pick it up as soon as it arrives.`, `Following up on my last message: could you send me {need}? No rush, I just want to make sure it didn't get buried.`, `I don't want this to fall through the cracks. If you can send me {need}, I can carry on from there.`];
const nudges2 = [`I haven't heard back, so I'll assume things are fine for now. If it's still a problem, reply here with {need} and I'll take it from there.`, `One last nudge from me. Whenever you're ready, reply to this email and the ticket comes back to me with everything above.`];
const chatHellos = [`Hi {first}, I'm {agent} from Pebblework Support. Let me read your message.`, `Hello {first}, {agent} here. Thanks for waiting.`, `Hi {first}! {agent} from support. Give me a second to catch up on what you wrote.`];
const chatHandoffs = [`I'll leave this ticket open, so you can reply to the email copy of this chat with anything else.`, `If anything else comes up, reply to the email copy of this chat and it comes straight back to me.`];

// ---------------------------------------------------------------------------------------------------------
// One ticket.
interface Item {
	who: 'c' | 'a' | 'note' | 'mate';
	paras: string[];
	art?: () => string;
	wait?: 'long';
}

const totalWeight = topics.reduce((sum, topic) => sum + topic.weight, 0);
const weighted = (r: Rand) => {
	let left = r() * totalWeight;
	for (const topic of topics) if ((left -= topic.weight) < 0) return topic;
	return topics.at(-1)!;
};
const contacts = [
	'Started the trial from the pricing page',
	'Demo call with Priyanka (sales), 40 minutes',
	'Attended the "Getting started with Boards" webinar',
	'Opened the trial welcome email',
	'Chatted with the website assistant about plans',
	'Downloaded the security overview',
	'Booked a call with sales, then cancelled it',
	'Opened the "Your first week" email'
];
const activities = ['Sign-ins', 'Members active', 'Cards created', 'Cards moved', 'Docs pages created', 'Comments', 'Insight dashboards opened'];

const ticket = (index: number) => {
	const r = mulberry32(0x7e1ce700 + index * 104723);
	const openDay = openDays[Math.floor((index * openDays.length) / ITEMS)]!;
	let main = weighted(r);
	while (main.after && openDay < main.after) main = weighted(r);
	let outcome = pick(r, ['resolved', 'resolved', 'resolved', 'owe', 'owe', 'act', 'act', 'team', 'team', 'quiet', 'quiet'] as Outcome[]);
	if (main.outcomes && !main.outcomes.includes(outcome)) outcome = pick(r, main.outcomes);
	const viaTeam = !main.noTeamFix && (outcome === 'resolved' || outcome === 'act') && chance(r, 0.3);
	const partial = outcome === 'team' || outcome === 'quiet' || viaTeam;
	const channel = pick(r, ['email', 'email', 'email', 'chat', 'chat', 'web form']);
	const notOwner = main.notOwner || (!main.ownerOnly && chance(r, 0.2));

	// Other matters the customer raises: a quick question, and up to two smaller matters discussed in full.
	const used = new Set<Topic>([main]);
	const sideOk = (topic: Topic) =>
		![...used].some((other) => other.area === topic.area) && !topic.ended && !topic.ownerMale && !(topic.notOwner && !notOwner) && !(topic.ownerOnly && notOwner) && !(topic.after && openDay < topic.after);
	const takeSide = () => {
		const topic = pick(r, topics.filter(sideOk));
		used.add(topic);
		return topic;
	};
	const quick = chance(r, 0.65) ? takeSide() : undefined;
	const fullCount = partial ? pick(r, [1, 2, 2, 3]) : pick(r, [0, 1, 2, 2, 2, 3]);
	const fulls = Array.from({ length: fullCount }, () => takeSide());
	// Smaller matters come up while support waits for an answer: before the customer's first answer, or (when the
	// main matter gets that far) before their second.
	const sidesEarly = partial || chance(r, 0.4);

	// Who and where.
	const female = chance(r, 0.5);
	const first = pick(r, female ? firstF : firstM);
	const last = pick(r, surnames);
	const head = pick(r, heads);
	const tail = pick(r, tails);
	const co = `${head} ${tail}`;
	const slug = (head + tail.split(' ')[0]).toLowerCase();
	const domain = `${slug}.example`;
	const domain2 = `${pick(r, ['staff.', 'mail.', 'old.', 'office.'])}${slug}.example`;
	const ownerFirst = notOwner ? pick(r, main.ownerMale ? firstM : [...firstF, ...firstM].filter((name) => name !== first)) : first;
	const ownerName = notOwner ? `${ownerFirst} ${pick(r, surnames)}` : `${first} ${last}`;
	const ownerDomain = main.ownerMale ? `${pick(r, ['brightpixel', 'northstack', 'ferncloud'])}.example` : domain;
	const memberFirst = pick(r, firstF.filter((name) => name !== first && name !== ownerFirst));
	const member = `${memberFirst} ${pick(r, surnames)}`;
	const member2 = `${pick(r, firstM.filter((name) => name !== first && name !== ownerFirst))} ${pick(r, surnames)}`;
	const agent = pick(r, agents);
	const seats = int(r, 4, 48);
	const guests = int(r, 0, 12);
	const openMs = openDay + int(r, 7 * 60 + 30, 20 * 60) * MIN;
	const ends = main.ended ? openDay - int(r, 18, 40) * DAY : openDay + (main.soonEnds ? int(r, 2, 9) : int(r, 3, 24)) * DAY;
	const started = ends - 30 * DAY;
	const age = Math.round((openDay - started) / DAY);
	const ext = pick(r, [14, 14, 21, 30]);
	const cur = pick(r, currencies);
	const plan = pick(r, ['Team', 'Business']);
	const [fieldName, fieldValues] = pick(r, fields);
	const [region, regionPlace] = pick(r, regions);
	const big = int(r, 120, 900);
	const s: Slots = {
		first,
		last,
		full: `${first} ${last}`,
		email: `${first.toLowerCase()}@${domain}`,
		title: pick(r, titles),
		co,
		site: `${slug}.pebblework.com`,
		domain,
		domain2,
		ownerName,
		ownerFirst,
		member,
		memberFirst,
		member2,
		member3: `${pick(r, firstM.filter((name) => name !== first && name !== ownerFirst))} ${pick(r, surnames)}`,
		memberEmail: `${memberFirst.toLowerCase()}@${pick(r, ['clientside', 'harwoodgroup', 'pellbrook', 'stonecrop'])}.example`,
		agent,
		seats: String(seats),
		guests: String(guests),
		guestcap: String(seats * 5),
		peak: String(seats + int(r, 6, 30)),
		season: pick(r, seasons),
		small: String(int(r, 2, 5)),
		count: String(Math.max(3, Math.round((openDay - ends) / DAY) - int(r, 2, 6))),
		big: String(big),
		big3: String(int(r, 9, 24)),
		batches: String(Math.ceil(big / 50)),
		limit: String(int(r, 3, 8)),
		limit2: String(int(r, 6, 40)),
		cols: String(int(r, 8, 13)),
		x1: String(int(r, 21, 48)),
		x2: '',
		ct: String(int(r, 9, 23)),
		ct2: String(int(r, 2, 4)),
		time: `${pad(int(r, 9, 17))}:${pad(int(r, 0, 59))}`,
		pm: `${int(r, 13, 17)}:${pad(int(r, 0, 59))}`,
		pastday: WDL[utc(openDay - int(r, 2, 6) * DAY).getUTCDay()]!,
		day: pick(r, ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']),
		date: fullDay(openDay + int(r, 6, 18) * DAY),
		date1: dayMonth(openDay - int(r, Math.max(2, Math.floor(age / 2)), Math.min(14, Math.max(3, age - 1))) * DAY),
		date2: dayMonth(openDay - int(r, 1, Math.max(1, Math.floor(age / 2) - 1)) * DAY),
		age: String(age),
		started: dayMonth(started),
		ends: fullDay(ends),
		ext: String(ext),
		board: pick(r, boards),
		card: pick(r, cards),
		ws: pick(r, workspaces),
		ws2: pick(r, workspaces.filter((name) => name !== 'Operations')),
		project: pick(r, boards),
		page: pick(r, pages),
		report: pick(r, reports),
		field: fieldName,
		fieldValues,
		tool: pick(r, tools),
		wiki: pick(r, ['Confluence', 'Notion']),
		idp: pick(r, idps),
		browser: pick(r, browsers),
		phone: pick(r, phones),
		appv: `5.${int(r, 2, 9)}.${int(r, 0, 4)}`,
		reader: pick(r, readers),
		region,
		regionPlace,
		regno: `${int(r, 1000000, 1199999)}`,
		vat: `GB${int(r, 100, 999)} ${int(r, 1000, 9999)} ${int(r, 10, 99)}`,
		address: `${pick(r, streets)}, ${pick(r, towns)}`,
		curName: cur[0],
		sym: cur[1],
		planYear: String(plan === 'Team' ? cur[3] : cur[5]),
		plan,
		po: `PO-${int(r, 10000, 99999)}`,
		channel: pick(r, channels),
		oldchannel: pick(r, ['general-ops', 'pw-updates', 'boards-feed', 'team-ops']),
		reason: pick(r, reasons),
		approver: pick(r, approvers),
		tz: pick(r, zones),
		city: pick(r, cities),
		city2: pick(r, ['Seattle', 'San Francisco', 'Vancouver', 'Los Angeles']),
		num4: String(int(r, 1000, 9999)),
		card4: String(int(r, 1000, 9999)),
		openMs: String(openMs),
		nowMs: String(openMs),
		startedMs: String(started),
		recent: '',
		newEnd: '',
		when: pick(r, whens),
		team: main.team,
		mate: teamPeople[main.team]!,
		need: ''
	};
	s.titleLower = s.title!.toLowerCase();
	s.x2 = String(Number(s.x1) + int(r, 2, 9));
	const fill = (text: string): string =>
		text.replace(/\{(\w+)\}/g, (_, key: string) => {
			const value = s[key];
			if (value === undefined) throw new Error(`no slot ${key} in "${text.slice(0, 60)}"`);
			return value;
		});
	s.need = fill(main.need);

	// The conversation, as a list of messages.
	const items: Item[] = [];
	let carry: string[] = [];
	const c = (paras: string[], art?: () => string) => {
		items.push({ who: 'c', paras: [...carry, ...paras], art });
		carry = [];
	};
	const a = (paras: string[], wait?: 'long') => items.push({ who: 'a', paras, wait });
	const artOf = (pair: [string, string, Art?]) => (pair[2] ? () => pair[2]!(r, s) : undefined);
	const turn = (pair: [string, string, Art?], extra?: [string, string]) => {
		c([...(!carry.length && chance(r, 0.35) ? [pick(r, custAcks)] : []), pair[0], ...(extra ? [`Unrelated, but ${lowerFirst(extra[0])}`] : [])], artOf(pair));
		a(extra ? [pair[1], `And on your other question: ${extra[1]}`] : [pair[1]]);
	};
	// A smaller matter, from the customer's first words about it to its last follow-up; the customer's next message
	// then starts by saying it worked.
	const subThread = (topic: Topic) => {
		a([topic.reply]);
		topic.turns.forEach((pair) => turn(pair));
		carry = [pick(r, topic.fixed)];
	};
	const sides = () =>
		fulls.forEach((topic, position) => {
			const lead =
				position === 0
					? pick(r, [`I'll check that and come back to you. In the meantime, something else:`, `I need to ask a colleague for that, so give me a day or so. Meanwhile, a different question:`, `I'll dig that out. While I do, one more thing:`])
					: pick(r, [`Another thing while I'm here.`, `Next question, if that's all right:`, `Something else has come up as well.`]);
			c([lead, pick(r, topic.open)]);
			subThread(topic);
		});
	const opening = [...(chance(r, 0.55) ? [pick(r, backstories)] : []), pick(r, main.open)];
	let quickUsed = !quick;
	if (quick && chance(r, 0.4)) {
		quickUsed = true;
		if (chance(r, 0.5)) {
			c([`Two things, if I may. First, a quick one: ${quick.quick[0]}`, `The bigger one:`, ...opening]);
			a([`On your quick question: ${quick.quick[1]}`, `On the bigger one: ${main.reply}`]);
		} else {
			c([quick.quick[0]]);
			a([quick.quick[1]]);
			c([pick(r, [`Thanks! While I have you, the real reason I got in touch:`, `Great, thanks. The other thing, and really why I wrote:`, `Perfect. Now the thing that's actually been bothering me.`]), ...opening]);
			a([main.reply]);
		}
	} else {
		c(opening);
		a([...(!main.reply.startsWith('Thanks') && chance(r, 0.5) ? [pick(r, agentIntros)] : []), main.reply]);
	}
	if (chance(r, 0.4)) items.push({ who: 'note', paras: [pick(r, notes)] });
	else if (chance(r, 0.45)) {
		const people: string[][] = [[ownerName, 'Owner']];
		if (notOwner) people.push([s.full, 'Admin']);
		people.push([member, 'Member'], [member2, 'Member'], [s.member3!, pick(r, ['Member', 'Admin'])]);
		for (let i = int(r, 1, 6); i > 0; i--) people.push([`${pick(r, [...firstF, ...firstM].filter((name) => name !== first))} ${pick(r, surnames)}`, guests > 0 ? pick(r, ['Member', 'Member', 'Member', 'Guest']) : 'Member']);
		const span = Math.max(1, Math.round((openDay - started) / DAY));
		const rows = people.map(([name, role], i) => {
			const joined = i === 0 ? started : started + int(r, 0, span - 1) * DAY;
			const requester = name === s.full;
			return [name!, role!, dayMonth(joined), requester ? dayMonth(openDay) : i > 0 && chance(r, 0.15) ? 'never' : dayMonth(Math.min(openDay, joined + int(r, 0, 12) * DAY))];
		});
		items.push({ who: 'note', paras: [`People on {site}, from the admin tool:`, table(['Name', 'Role', 'Joined', 'Last active'], rows)] });
	}

	const [given, cause, ...rest] = main.turns;
	const quickLater = !quickUsed && chance(r, 0.7) ? quick!.quick : undefined;
	if (sidesEarly) sides();
	turn(given!, quickLater);
	if (!partial) {
		if (!sidesEarly) sides();
		if (chance(r, 0.3)) {
			c([cause![0]], artOf(cause!));
			a([pick(r, holdings)]);
			a([cause![1]], 'long');
		} else turn(cause!);
		if (rest.length >= 2 && chance(r, 0.35)) {
			c([rest[0]![0], rest[1]![0]]);
			a([rest[0]![1], rest[1]![1]]);
			rest.slice(2).forEach((pair) => turn(pair));
		} else rest.forEach((pair) => turn(pair));
	}

	const handOver = () => {
		items.push({ who: 'note', paras: [`Passing to ${main.team}: ${main.handover}`] });
		a([pick(r, passLines)]);
	};
	const mateFinds = () =>
		items.push({ who: 'mate', paras: [`Hi {first}, {mate} from {team} here.`, `I've had a look at {site}, and ${main.cause}. To sort it, you'll need to ${main.act}.`], wait: 'long' });
	if (outcome === 'resolved') {
		if (viaTeam) {
			handOver();
			mateFinds();
		}
		c([pick(r, main.fixed)]);
		if (chance(r, 0.6)) a([pick(r, closings)]);
	} else if (outcome === 'owe') {
		const prefix = /^(That|Thanks|It)/.test(main.follow) || carry.length ? [] : chance(r, 0.5) ? [pick(r, [`That worked, thanks.`, `Thanks, all clear now.`, `Good, that's sorted that part.`])] : [];
		c([...prefix, main.follow]);
		a([pick(r, oweLines).replace('{owe}', main.owe)]);
		if (chance(r, 0.5)) c([pick(r, thanksLines)]);
	} else if (outcome === 'act') {
		if (viaTeam) {
			handOver();
			mateFinds();
		} else a([pick(r, actLines).replace('{act}', main.act)]);
		c([pick(r, willDos)]);
	} else if (outcome === 'team') {
		handOver();
		if (chance(r, 0.4)) c([pick(r, thanksLines)]);
		if (chance(r, 0.4)) items.push({ who: 'mate', paras: [pick(r, mateAcks)] });
	} else {
		items.push({ who: 'a', paras: [pick(r, nudges1)], wait: 'long' });
		if (chance(r, 0.6)) items.push({ who: 'a', paras: [pick(r, nudges2)], wait: 'long' });
	}

	// Times. Customers write at any hour from 07:00; support answers on weekdays, 08:00 to 18:00. Late tickets get
	// shorter gaps, so that every conversation ends before the export.
	const schedule = (scale: number): number[] => {
		const rt = mulberry32(0x71e5 + index * 7907);
		let now = openMs;
		const gap = (low: number, high: number) => Math.max(1, Math.round(int(rt, low, high) * scale));
		const workHours = () => {
			for (;;) {
				const d = utc(now);
				const hour = d.getUTCHours();
				if (d.getUTCDay() === 0 || d.getUTCDay() === 6 || hour >= 18) now = midnight(now) + DAY + 8 * HOUR + int(rt, 5, 70) * MIN;
				else if (hour < 8) now = midnight(now) + 8 * HOUR + int(rt, 5, 70) * MIN;
				else break;
			}
		};
		return items.map((item, position) => {
			if (position > 0) {
				if (item.wait === 'long') now += gap(2 * 24 * 60, 4 * 24 * 60) * MIN;
				if (item.who === 'c') {
					now += gap(12, 1300) * MIN;
					if (utc(now).getUTCHours() < 7) now += 7 * HOUR;
				} else if (item.who === 'note') now += int(rt, 2, 25) * MIN;
				else {
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

	// The file.
	const out: string[] = [];
	const subject = quick && quickUsed && chance(r, 0.4) ? pick(r, quick.subjects) : chance(r, 0.22) ? pick(r, vagueSubjects) : pick(r, main.subjects);
	const number = 48210 + index * 4 + int(r, 0, 3);
	const mentions = (app: string) => [...used].some((topic) => JSON.stringify([topic.open, topic.quick, topic.reply, topic.turns.map((pair) => pair.slice(0, 2))]).includes(app));
	const apps = ['Boards', ...(mentions('Docs') || chance(r, 0.8) ? ['Docs'] : []), ...(mentions('Insight') || chance(r, 0.7) ? ['Insight'] : [])];
	const hasApp = (text: string) => !(/Docs/.test(text) && !apps.includes('Docs')) && !(/Insight/.test(text) && !apps.includes('Insight'));
	const endsLabel = ends < openDay ? `Trial, ended ${fullDay(ends)}` : `Trial, ends ${fullDay(ends)}`;

	out.push(`# Ticket ${number}: ${fill(subject)}`, '');
	out.push(
		table(
			['Field', 'Value'],
			[
				['Opened', `${stamp(openMs)}, by ${channel}`],
				['From', `${s.full} <${s.email}>`],
				['Account', co],
				['Owner', notOwner ? `${ownerName} <${ownerFirst.toLowerCase()}@${ownerDomain}>` : `${ownerName} (the requester)`],
				['Plan', endsLabel],
				['Site', `https://${s.site}`],
				['Apps', apps.join(', ')],
				['People', `${seats} members, ${guests} ${guests === 1 ? 'guest' : 'guests'}`],
				...(channel === 'web form' ? [['Browser', `${s.browser} on ${pick(r, ['Windows 11', 'macOS 15', 'ChromeOS', 'Windows 10'])}`]] : [])
			]
		),
		''
	);
	const history = [[started, contacts[0]!]];
	for (const contact of contacts.slice(1).filter(() => chance(r, 0.35))) history.push([started + int(r, 0, Math.max(0, Math.round((openDay - started) / DAY) - 1)) * DAY, contact]);
	history.sort((x, y) => (x[0] as number) - (y[0] as number));
	out.push('### Earlier contact', '', table(['Date', 'What'], history.map(([when, what]) => [dayMonth(when as number), what as string])), '');
	if (chance(r, 0.75)) {
		const events = [
			`Workspace "${s.ws}" created`,
			`Board "${s.board}" created from the Kanban Starter template`,
			`${int(r, 2, seats)} people invited by ${ownerFirst}`,
			`Logo uploaded`,
			`Board "${pick(r, boards)}" created`,
			`Docs page tree "${s.page}" started`,
			`Insight dashboard "${pick(r, reports)}" created`,
			`Two-factor turned on by ${ownerFirst}`,
			`Workspace "${s.ws2}" created`,
			...(guests > 0 ? [`${guests} ${guests === 1 ? 'guest' : 'guests'} invited`] : []),
			`Site time zone set to ${s.tz}`,
			`Mobile app first used by ${s.memberFirst}`
		].filter((event) => hasApp(event) && chance(r, 0.55));
		const span = Math.max(1, Math.round((openDay - started) / DAY));
		const rows = events.map((event, i) => [dayMonth(started + Math.floor(((i + r()) * span) / (events.length + 1)) * DAY), event]);
		if (rows.length) out.push('### Trial so far, from the admin tool', '', table(['Date', 'Event'], rows), '');
	}
	if (!main.ended) {
		const busy = 0.3 + r();
		out.push(
			'### Activity on the site, last 14 days',
			'',
			table(
				['', 'Count'],
				activities.filter(hasApp).map((label) => [label, String(Math.round((label === 'Members active' ? seats * (0.3 + 0.6 * r()) : seats * busy * int(r, 2, 30)) || 0))])
			),
			''
		);
	}
	out.push('## Conversation', '');
	const extendIfNeeded = (ms: number) => {
		s.newEnd = fullDay(Math.max(ends, midnight(ms)) + ext * DAY);
		s.nowMs = String(ms);
		s.recent = clock(ms - int(r, 8, 25) * MIN);
	};
	if (chatUntil > 0) {
		out.push(`### Chat with ${agent} · ${stamp(times[0]!)}`, '');
		const lines: string[] = [];
		items.slice(0, chatUntil).forEach((item, position) => {
			extendIfNeeded(times[position]!);
			const who = item.who === 'c' ? first : agent;
			const at = clock(times[0]! + (position * 3 + int(r, 0, 2)) * MIN);
			if (position === 1) lines.push(`**${at} ${agent}:** ${fill(pick(r, chatHellos))}`);
			item.paras.forEach((para) => lines.push(`**${at} ${who}:** ${fill(para)}`));
			if (item.art) lines.push(item.art());
		});
		if (chatUntil < items.length) lines.push(`**${clock(times[0]! + (chatUntil * 3 + 2) * MIN)} ${agent}:** ${fill(pick(r, chatHandoffs))}`);
		out.push(lines.join('\n\n'), '');
		const shift = times[0]! + (chatUntil * 3 + 10) * MIN;
		for (let position = chatUntil; position < times.length; position++) if (times[position]! < shift) times[position] = shift + position * MIN;
	}
	let previousAgent = '';
	let agentSpoke = chatUntil > 0;
	items.slice(chatUntil).forEach((item, offset) => {
		const position = chatUntil + offset;
		const at = times[position]!;
		extendIfNeeded(at);
		const body: string[] = [];
		if (item.who === 'c') {
			out.push(`### ${s.full} · ${stamp(at)}`, '');
			const greeting = fill(pick(r, position === 0 ? (utc(at).getUTCHours() < 12 ? [...firstGreetings, 'Good morning,'] : firstGreetings) : replyGreetings));
			if (greeting) body.push(greeting);
			const quoted = previousAgent.split(/(?<=[.?!])\s/).find((sentence) => sentence.length > 40);
			if (quoted && chance(r, 0.25)) body.push(`> ${quoted}`);
			body.push(...item.paras.map(fill));
			if (item.art) body.push(item.art());
			const signoff = fill(pick(r, position === 0 ? custSignoffs : replySignoffs));
			if (signoff) body.push(signoff);
		} else if (item.who === 'a') {
			out.push(`### ${agent} (Pebblework Support) · ${stamp(at)}`, '');
			const afterCustomer = items[position - 1]?.who === 'c';
			body.push(fill(pick(r, !agentSpoke ? agentGreetings : afterCustomer ? agentGreetingsLater : ['Hi {first},', 'Hello {first},'])), ...item.paras.map(fill), fill(pick(r, agentSignoffs)));
			previousAgent = fill([...item.paras].sort((x, y) => y.length - x.length)[0]!);
			agentSpoke = true;
		} else if (item.who === 'note') {
			out.push(`### Internal note by ${agent} · ${stamp(at)}`, '');
			body.push(...item.paras.map(fill));
		} else {
			out.push(`### ${s.mate} (Pebblework, ${main.team.replace(/^the /, '')}) · ${stamp(at)}`, '');
			body.push(...item.paras.map(fill), s.mate!);
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
	`# Trial tickets\n\nThe ${ITEMS} tickets that accounts on a trial opened with support between 5 October and 12 November 2026, one\nfile each, as the help desk exported them on 21 November. Each file holds the account panel the agent saw when the\nticket came in and the whole conversation, chats included, with internal notes. The export does not keep the help\ndesk's tags or statuses.\n`
);
