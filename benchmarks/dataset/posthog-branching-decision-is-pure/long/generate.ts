// Writes the long material of this entry's long task: the tickets Tallybird support handled that were opened
// between 28 September and 6 November 2026, one Markdown file each, under support/tickets/, as the help desk
// exported them, without tags or statuses. Deterministic: fixed seeds, no clock, no network.
//   bun long/generate.ts <workspace root>
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** How many tickets to write. Dates, numbers and the share of each topic all follow from it. */
const ITEMS = 262;

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
const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

// ---------------------------------------------------------------------------------------------------------
// Dates. Everything happens in 2026; the last message of any ticket is before 20 November.
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
	return `${WD[d.getUTCDay()]} ${d.getUTCDate()} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
};
const clock = (ms: number) => `${pad(utc(ms).getUTCHours())}:${pad(utc(ms).getUTCMinutes())}`;
const dayMonth = (ms: number) => `${utc(ms).getUTCDate()} ${MONL[utc(ms).getUTCMonth()]}`;
const dayMonthYear = (ms: number) => `${dayMonth(ms)} ${utc(ms).getUTCFullYear()}`;
const fullDay = (ms: number) => `${WDL[utc(ms).getUTCDay()]} ${dayMonth(ms)}`;
const iso = (ms: number) => utc(ms).toISOString().slice(0, 10);
const midnight = (ms: number) => ms - (ms % DAY);
const firstOfMonth = (ms: number) => Date.UTC(utc(ms).getUTCFullYear(), utc(ms).getUTCMonth(), 1);
const FIRST_DAY = Date.UTC(2026, 8, 28);
const LAST_DAY = Date.UTC(2026, 10, 6);
const LIMIT = Date.UTC(2026, 10, 20);
const openDays: number[] = [];
for (let day = FIRST_DAY; day <= LAST_DAY; day += DAY) if (utc(day).getUTCDay() !== 0) openDays.push(day);
/** The next weekday (Monday to Friday) at least `days` after `ms`. */
const workdayAfter = (ms: number, days: number) => {
	let t = midnight(ms) + days * DAY;
	while ([0, 6].includes(utc(t).getUTCDay())) t += DAY;
	return t;
};

// ---------------------------------------------------------------------------------------------------------
// People and places.
const firstF = ['Amara', 'Beth', 'Chiara', 'Dana', 'Elif', 'Freya', 'Gabriela', 'Hollie', 'Ingrid', 'Jasmin', 'Keiko', 'Lorna', 'Magda', 'Nadine', 'Olga', 'Paula', 'Rania', 'Sinead', 'Tamsin', 'Uma', 'Valeria', 'Wren', 'Yasmin', 'Zofia'];
const firstM = ['Aaron', 'Bilal', 'Conor', 'Dario', 'Elliot', 'Femi', 'Gustavo', 'Hamish', 'Idris', 'Jakub', 'Karim', 'Leon', 'Marcel', 'Nikhil', 'Oscar', 'Piotr', 'Quentin', 'Ravi', 'Soren', 'Theo', 'Umar', 'Vince', 'Wesley', 'Yannick'];
const surnames = ['Abara', 'Blackwood', 'Castellano', 'Dunmore', 'Ekstrom', 'Fitzgerald', 'Grunewald', 'Haddad', 'Iwasaki', 'Jovanovic', 'Kowalczyk', 'Lachance', 'Mwangi', 'Nakamura', 'Oyelaran', 'Pellegrini', 'Quist', 'Rahman', 'Strachan', 'Thorne', 'Uddin', 'Vasquez', 'Whitlock', 'Yilmaz', 'Zielinski', 'Brennan', 'Moreau', 'Sato'];
const heads = ['Northgate', 'Copperleaf', 'Bluefin', 'Hartwell', 'Silverbirch', 'Redwing', 'Oakmere', 'Pinecrest', 'Stonebridge', 'Lantern', 'Meadowlark', 'Driftwood', 'Ironbark', 'Saltmarsh', 'Kingfisher', 'Brightwater', 'Foxglove', 'Highfield', 'Thistle', 'Wildrose', 'Ashcombe', 'Larkspur'];
const tails = ['Design', 'Builders', 'Academy', 'Studios', 'Consulting', 'Labs', 'Clinic', 'Media', 'Engineering', 'Architects', 'Marketing', 'Software', 'Events', 'Surveys', 'Robotics', 'Press', 'Collective', 'Partners', 'Interiors', 'Analytics'];
const charityTails = ['Foundation', 'Trust', 'Community Garden', 'Youth Club', 'Food Bank', 'Rowing Club', 'Arts Centre', 'Wildlife Trust'];
const titles = ['Office manager', 'Operations lead', 'Founder', 'Head of IT', 'Project manager', 'Practice manager', 'Studio manager', 'Head of marketing', 'Finance manager', 'Programme coordinator', 'Engineering lead', 'Managing director', 'Delivery manager', 'Operations director'];
const agents = ['Maya', 'Joel', 'Ines', 'Devin', 'Rosa', 'Callum', 'Yusuf', 'Hanna'];
type Team = 'the finance team' | 'the sales team' | 'the engineering team' | 'the mobile team' | 'the integrations team' | 'the security team';
const teamPeople: Record<Team, string> = {
	'the finance team': 'Bronwen',
	'the sales team': 'Marcus',
	'the engineering team': 'Akira',
	'the mobile team': 'Lena',
	'the integrations team': 'Tobias',
	'the security team': 'Odile'
};
const tools = ['Trello', 'Asana', 'a shared spreadsheet', 'Monday.com', 'Basecamp', 'Jira', 'email and a whiteboard', 'Notion'];
const projectNames = ['Website relaunch', 'Spring catalogue', 'Office move', 'Q4 campaign', 'Client onboarding', 'Mobile app v3', 'Annual report', 'Grant application', 'Kitchen fit-out', 'Product launch', 'Volunteer drive', 'Brand refresh', 'Hiring plan', 'Audit prep', 'Summer school', 'Autumn fundraiser', 'Data migration', 'Podcast season 2', 'Trade show', 'Warehouse layout', 'Riverside housing', 'Exhibition 2027'];
const taskNames = ['Draft homepage copy', 'Order signage', 'Review supplier contract', 'Book photographer', 'Update floor plan', 'Send invoices to client', 'Prepare board pack', 'Test checkout flow', 'Write press release', 'Plan induction day', 'Fix broken links', 'Chase planning approval', 'Collect quotes', 'Design newsletter', 'Upload site photos', 'Call the printers', 'Agree launch date', 'Brief the agency'];
const keys = ['WEB', 'APP', 'OPS', 'MKT', 'DES', 'API', 'CORE', 'SITE'];
const repos = ['web', 'mobile-app', 'platform', 'website', 'api', 'design-system'];
const idps = ['Okta', 'Microsoft Entra ID', 'Google Workspace', 'OneLogin'];
const browsers = ['Chrome 129', 'Firefox 131', 'Safari 18', 'Edge 129'];
const iphones = ['iPhone 15', 'iPhone 14 Pro', 'iPhone 16', 'iPhone 15 Pro Max', 'iPhone 13'];
const cities = [['Chicago', 'America/Chicago'], ['Denver', 'America/Denver'], ['Toronto', 'America/Toronto'], ['Vancouver', 'America/Vancouver'], ['Mexico City', 'America/Mexico_City'], ['Sao Paulo', 'America/Sao_Paulo'], ['Seattle', 'America/Los_Angeles'], ['Boston', 'America/New_York']] as const;
/** Where a charity is registered, and the shape of its number. */
const registers: [string, (r: Rand) => string][] = [
	['England and Wales', (r) => String(int(r, 1010000, 1209999))],
	['Scotland', (r) => `SC0${int(r, 10000, 52999)}`],
	['Ireland', (r) => `CHY ${int(r, 10000, 23999)}`],
	['Canada', (r) => `${int(r, 100000000, 899999999)} RR0001`],
	['the United States', (r) => `EIN ${int(r, 10, 99)}-${int(r, 1000000, 9999999)}`]
];
const reasons = ['the school holidays', 'a trade show', 'our year-end', 'a flu outbreak in the office', 'an office move', 'a big client deadline'];
const channelsSlack = ['project-updates', 'delivery', 'ops', 'design-team', 'site-team', 'marketing'];

type Plan = 'free' | 'team' | 'business';
const PLAN: Record<Plan, { label: string; cents: number; limit: number }> = {
	free: { label: 'Free', cents: 0, limit: 3 },
	team: { label: 'Team', cents: 2900, limit: 20 },
	business: { label: 'Business', cents: 9900, limit: 50 }
};
type Outcome = 'resolved' | 'owe' | 'act' | 'team' | 'quiet';
type Slots = Record<string, string>;
type Art = (r: Rand, s: Slots) => string;
/** Customer's words, then the reply; a pasted artifact goes with the customer's words unless the fourth element is true. */
type Turn = [string, string, Art?, boolean?];

interface Topic {
	area: string;
	weight: number;
	plans: Plan[];
	subjects: string[];
	/** The customer's first message about it, two ways. */
	open: [string, string];
	/** The topic as a quick side question, and its answer. */
	quick: [string, string];
	/** Support's first answer, which asks for something. */
	reply: string;
	/** What that answer asked for, as a noun phrase. */
	need: string;
	/** Exchanges in order: the first answers the request, the second finds the cause, the rest are follow-up questions. */
	turns: Turn[];
	/** After the fix: something that still isn't right, and why. */
	snag: [string, string];
	cause: string;
	/** What the customer has to do, after "you'll need to". */
	act: string;
	fixed: [string, string];
	/** A further question at the end, and what support then owes, after "I'll". */
	follow: string;
	owe: string;
	team: Team;
	handover: string;
	/** The account has an unpaid invoice. */
	unpaid?: boolean;
	/** The account is in its trial. */
	trial?: boolean;
	/** Only ever the main matter of a ticket. */
	mainOnly?: boolean;
	outcomes?: Outcome[];
	org?: string[];
	/** The earliest day of the month the ticket can be opened on. */
	minDay?: number;
	/** How many projects the account has: two, all the plan allows, more than Team allows, or room for one more. */
	projects?: 'two' | 'full' | 'over' | 'room';
}

// ---------------------------------------------------------------------------------------------------------
// Pasted artifacts.
const table = (head: string[], rows: string[][]) =>
	[`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`, ...rows.map((row) => `| ${row.join(' | ')} |`)].join('\n');
const fence = (lines: string[]) => ['```', ...lines, '```'].join('\n');
const at = (s: Slots) => Number(s.nowMs);
const before = (s: Slots, days: number, minutes = 0) => at(s) - days * DAY - minutes * MIN;
const hex = (r: Rand, n: number) => Array.from({ length: n }, () => '0123456789abcdef'[int(r, 0, 15)]).join('');

const arts: Record<string, Art> = {
	attempts: (r, s) => {
		const rows: string[][] = [];
		const count = int(r, 2, 4);
		for (let i = count; i >= 1; i--) rows.push([`${dayMonth(before(s, i * int(r, 1, 3)))} ${pad(int(r, 6, 11))}:${pad(int(r, 0, 59))}`, `Visa ending ${s.card4}`, s.amount, pick(r, ['Declined: expired card', 'Declined: expired card', 'Declined by the bank (54)'])]);
		return table(['Attempt', 'Card', 'Amount', 'Result'], rows);
	},
	apEmail: (r, s) =>
		fence([
			`From: Accounts Payable <ap@${s.domain}>`,
			`Subject: Rejected: supplier invoice ${s.inv} (Tallybird Inc.)`,
			``,
			`This invoice cannot be processed for the following reasons:`,
			`  - No purchase order number. Every supplier invoice must quote a PO.`,
			`  - Our registered company name and address are missing.`,
			pick(r, [`  - No VAT registration number for the buyer.`, `  - Invoice is addressed to an individual, not to the company.`]),
			``,
			`Please ask the supplier to reissue it. Our reference: AP-${int(r, 10000, 99999)}`
		]),
	workspaces: (r, s) =>
		table(
			['Workspace', 'Owner', 'Plan', 'Projects', 'Created', 'Members'],
			[
				[s.site, s.full, s.Plan, String(int(r, 4, 18)), dayMonthYear(Number(s.signedMs)), String(int(r, 6, 40))],
				[s.site2, s.member, s.Plan, String(int(r, 1, 5)), s.month2, String(int(r, 2, 6))]
			]
		),
	bankConfirm: (r, s) =>
		fence([
			`Outgoing payment confirmation`,
			`Date:          ${s.paidDay}`,
			`Amount:        USD ${s.amount.slice(1)}`,
			`Beneficiary:   Tallybird Inc.`,
			`Reference:     ${s.ref}`,
			`Result:        Completed`,
			`Transaction:   ${hex(r, 4).toUpperCase()}-${int(r, 100000, 999999)}`
		]),
	limitBanner: () =>
		fence([`You've reached the 3 projects included in the Free plan.`, `Upgrade to Team for up to 20 projects, or delete a project to make room.`, ``, `[ Compare plans ]   [ Not now ]`]),
	projectsList: (r, s) => {
		const shown = 8;
		const rows = Array.from({ length: shown }, (_, i) => [
			i < 3 ? pick(r, projectNames) : `${pick(r, ['Client', 'Job', 'Pitch', 'Site'])} ${int(r, 100, 999)} ${pick(r, ['refit', 'audit', 'campaign', 'survey', 'launch'])}`,
			String(int(r, 12, 640)),
			i < 3 ? dayMonth(before(s, int(r, 0, 6))) : dayMonthYear(before(s, int(r, 90, 700)))
		]);
		return `${table(['Project', 'Tasks', 'Last activity'], rows)}\n\n...and ${Number(s.projects) - shown} more.`;
	},
	supplierList: (r) =>
		[`1. Completed W-9 form`, `2. Bank details on company letterhead, signed`, `3. Certificate of insurance (general liability)`, `4. Our vendor registration form, attached, sections A to D`, pick(r, [`5. A named contact for remittance advice`, `5. Confirmation of your payment terms`])].join('\n'),
	delivery: (r, s) => {
		const lines: string[] = [];
		const kinds = ['task-assigned', 'mention', 'comment', 'due-soon', 'task-assigned'];
		for (let i = 0; i < int(r, 6, 9); i++) {
			const ms = before(s, 1, -i * int(r, 20, 90));
			lines.push(`${iso(ms)} ${clock(ms)}:${pad(int(r, 0, 59))} UTC  to=${s.first.toLowerCase()}@${s.domain}  ${pick(r, kinds).padEnd(13)}  250 2.0.0 OK id=${hex(r, 10)}`);
		}
		return fence(lines.sort());
	},
	slack: (r, s) => {
		const lines: string[] = [];
		const from = Number(s.stopMs);
		const span = Math.max(DAY, at(s) - DAY - from);
		for (let i = 0; i < int(r, 5, 8); i++) {
			const ms = i === 0 ? from + int(r, 6 * 60, 20 * 60) * MIN : from + Math.floor(r() * span);
			lines.push(`${iso(ms)} ${clock(ms)}  POST chat.postMessage  channel=#${s.channel}  -> 200 {"ok":false,"error":"${i === 0 ? 'token_revoked' : pick(r, ['token_revoked', 'token_revoked', 'account_inactive'])}"}`);
		}
		return fence(lines.sort());
	},
	webhooks: (r, s) =>
		table(
			['Pull request', 'Title', 'Shown on task'],
			Array.from({ length: int(r, 4, 6) }, (_, i) => {
				const n = i === 0 ? Number(s.num) : i === 1 ? Number(s.num2) : int(r, 100, 480);
				const upper = i % 2 === 0;
				return [`#${int(r, 1200, 2900)}`, `${upper ? s.key : s.keyLower}-${n}: ${lowerFirst(pick(r, taskNames))}`, upper ? `${s.key}-${n}` : 'none'];
			})
		),
	calendar: (r, s) =>
		fence([
			`BEGIN:VEVENT`,
			`UID:task-${int(r, 20000, 89999)}@${s.slug}.tallybird.app`,
			`SUMMARY:${s.task2}`,
			`DTSTART:${s.dueIso.replaceAll('-', '')}T000000Z`,
			`DTEND:${s.dueIso.replaceAll('-', '')}T003000Z`,
			`URL:https://${s.site}/t/${int(r, 20000, 89999)}`,
			`END:VEVENT`
		]),
	importLog: (r, s) => {
		const lines = [`Import of ${s.project}.csv started ${dayMonth(before(s, 1))} ${pad(int(r, 9, 16))}:${pad(int(r, 0, 59))}`, `Columns: Task, Assignee, Due, Notes`];
		let row = int(r, 2, 40);
		for (let i = 0; i < int(r, 8, 12); i++) {
			const day = int(r, 1, 28);
			const month = int(r, 9, 12);
			row += int(r, 1, 7);
			lines.push(day > 12 ? `Row ${row}: skipped: Due "${pad(day)}/${pad(month)}/2026" is not a valid date` : `Row ${row}: imported (due ${MON[day - 1]} ${month} 2026)`);
		}
		lines.push(`Finished: ${Number(s.rows) - Number(s.skipped)} imported, ${s.skipped} skipped`);
		return fence(lines);
	},
	crash: (r, s) =>
		fence([
			`App version:   ${s.appver} (build ${s.appver.replaceAll('.', '')}${int(r, 1, 9)})`,
			`Device:        ${s.device}, iOS 18.0.${int(r, 0, 1)}`,
			`Last crash:    ${iso(before(s, 0, int(r, 30, 600)))} ${pad(int(r, 7, 18))}:${pad(int(r, 0, 59))}`,
			`Crashes, 7 d:  ${int(r, 3, 19)}`,
			`Exception:     NSInvalidArgumentException`,
			`Reason:        unsupported image type public.heic`,
			`Screen:        Task > Attach > Photo library`
		]),
	projectStats: (r, s) =>
		table(
			['Field', 'Value'],
			[
				['Tasks', s.big],
				['Open tasks', String(int(r, 200, Number(s.big) - 50))],
				['Dependencies', String(int(r, 80, 600))],
				['Earliest date', dayMonthYear(before(s, int(r, 200, 600)))],
				['Latest date', `${int(r, 1, 28)} ${pick(r, MONL)} ${s.farYear}`],
				['Members', String(int(r, 6, 40))]
			]
		),
	timeEntries: (r, s) => {
		const names = [s.memberFirst, ...Array.from({ length: int(r, 3, 5) }, () => pick(r, [...firstF, ...firstM]))];
		const rows = names.map((name, i) => [name, String(int(r, 6, 24)), i === 0 ? String(int(r, 74, 96)) : String(int(r, 22, 41))]);
		return table(['Person', 'Entries', 'Hours'], rows);
	},
	invites: (r, s) =>
		table(
			['Email', 'Role', 'Invited', 'Joined', 'Projects'],
			[
				[s.guestEmail, 'Guest', dayMonth(before(s, int(r, 3, 9))), dayMonth(before(s, int(r, 1, 2))), 'none'],
				[`${pick(r, firstF).toLowerCase()}@${s.domain}`, 'Member', dayMonth(before(s, int(r, 30, 90))), dayMonth(before(s, int(r, 20, 29))), String(int(r, 2, 7))],
				[`${pick(r, firstM).toLowerCase()}@${pick(r, ['clientco', 'brightworks', 'harbourgroup'])}.example`, 'Guest', dayMonth(before(s, int(r, 40, 80))), dayMonth(before(s, int(r, 35, 39))), '1']
			]
		),
	saml: (r, s) =>
		fence([
			`Single sign-on failed`,
			`Error:     audience mismatch`,
			`Expected:  https://${s.slug}.tallybird.app/saml/metadata`,
			`Received:  https://${s.slug}.tallybird.app`,
			`Issuer:    ${s.idp}, app ${hex(r, 12)}`,
			`Request:   ${hex(r, 8)}-${hex(r, 4)}-${hex(r, 4)}`,
			`Time:      ${iso(before(s, 0, int(r, 20, 300)))} ${pad(int(r, 8, 17))}:${pad(int(r, 0, 59))} UTC`
		]),
	headers: (r, s) => {
		const wait = int(r, 8, 52);
		return fence([
			`HTTP/1.1 429 Too Many Requests`,
			`Date: ${WD[utc(before(s, 1)).getUTCDay()]}, ${pad(utc(before(s, 1)).getUTCDate())} ${MON[utc(before(s, 1)).getUTCMonth()]} 2026 02:${pad(int(r, 0, 59))}:${pad(int(r, 0, 59))} GMT`,
			`Content-Type: application/json`,
			`X-RateLimit-Limit: 120`,
			`X-RateLimit-Remaining: 0`,
			`Retry-After: ${wait}`,
			``,
			`{"error":"rate_limited","message":"Too many requests for this token. Try again in ${wait} seconds."}`
		]);
	},
	exportList: (r, s) =>
		table(
			['Part', 'Size', 'Ready'],
			[
				['Projects and tasks (CSV)', `${int(r, 2, 40)} MB`, 'yes'],
				['Projects and tasks (JSON)', `${int(r, 3, 60)} MB`, 'yes'],
				['Comments', `${int(r, 1, 30)} MB`, 'yes'],
				['Attachments', `${int(r, 2, 90)} GB in ${s.projects} zip files`, 'preparing'],
				['Time entries', `${int(r, 1, 9)} MB`, 'yes']
			]
		),
	weekly: (r, s) => {
		const end = before(s, utc(at(s)).getUTCDay() + 1);
		return fence([
			`Your week in ${s.co}`,
			`${fullDay(end - 6 * DAY)} to ${fullDay(end)}`,
			``,
			`Tasks completed      ${int(r, 20, 160)}`,
			`Tasks created        ${int(r, 20, 180)}`,
			`Overdue              ${int(r, 0, 25)}`,
			`Hours logged         ${int(r, 40, 400)}`,
			`Most active project  ${s.project}`
		]);
	},
	bounce: (r, s) =>
		fence([
			`From: Tallybird <mailer@tallybird.app>`,
			`To: ${s.sharedAddr}`,
			`Subject: Not delivered: Fwd: ${pick(r, ['Quote request', 'Change to the brief', 'Site access next week', 'Invoice query', 'New starter on Monday'])}`,
			``,
			`Your message to ${s.projectSlug}@in.tallybird.app wasn't turned into a task.`,
			`The sender, ${s.sharedAddr}, isn't a member of this workspace.`
		]),
	network: (r, s) =>
		fence([
			`POST https://uploads.tallybird.app/v2/files   413 Request Entity Too Large`,
			`  Server: proxy.${s.domain}`,
			`  Sent: 52,428,800 of ${int(r, 55, 190)},${int(r, 100, 999)},${int(r, 100, 999)} bytes`,
			`  Time: ${int(r, 40, 140)} s`,
			`POST https://uploads.tallybird.app/v2/files   201 Created   (${int(r, 2, 30)},${int(r, 100, 999)},${int(r, 100, 999)} bytes)`
		]),
	trash: (r, s) =>
		table(
			['Project', 'Deleted by', 'Deleted on', 'Gone for good on'],
			[
				[s.project, s.member, dayMonth(before(s, 0)), dayMonth(before(s, -30))],
				[pick(r, projectNames.filter((name) => name !== s.project)), pick(r, [...firstF, ...firstM]) + ' ' + pick(r, surnames), dayMonth(before(s, int(r, 8, 24))), dayMonth(before(s, -int(r, 6, 22)))]
			]
		),
	signin: (r) =>
		fence([
			`Cookie "tb_handoff" has been rejected because it is in a cross-site context.`,
			`GET https://accounts.tallybird.app/callback?state=${hex(r, 16)}  302`,
			`GET https://${pick(r, ['app', 'www'])}.tallybird.app/sign-in?expired=1  200`,
			`Blocked by extension: tb_handoff (third-party cookie)`
		]),
	workload: (r, s) =>
		table(
			['Person', 'Tasks due this week', 'Estimated hours'],
			[s.memberFirst, ...Array.from({ length: int(r, 3, 5) }, () => pick(r, [...firstF, ...firstM]))].map((name, i) => [name, String(int(r, 3, 14)), i === 0 ? '0' : pick(r, ['0', '0', String(int(r, 2, 9))])])
		),
	mapping: (r) =>
		table(
			['Jira field', 'Tallybird field', 'Result'],
			[
				['Summary', 'Task name', 'imported'],
				['Assignee', 'Assignee', 'imported'],
				['Due date', 'Due date', 'imported'],
				['Story points', 'none', 'left out'],
				['Component', 'none', 'left out'],
				['Sprint', 'Section', 'imported'],
				['Labels', 'Tags', pick(r, ['imported', 'imported, 3 renamed'])]
			]
		),
	subprocessors: () =>
		table(
			['Company', 'What for', 'Where'],
			[
				['Amazon Web Services', 'Hosting and storage', 'United States'],
				['Postmark', 'Notification email', 'United States'],
				['Stripe', 'Card payments', 'United States, Ireland'],
				['Cloudflare', 'Network and file delivery', 'Global'],
				['Help Scout', 'Support email', 'United States']
			]
		)
};

// ---------------------------------------------------------------------------------------------------------
// Topics. Slots in braces are filled per ticket.
const topics: Topic[] = [
	{
		area: 'billing',
		weight: 2,
		plans: ['team', 'business'],
		unpaid: true,
		subjects: ['Payment failed', 'Card declined but the card is fine', 'Why is our payment failing?'],
		open: [
			`We've had three emails this week saying our payment for Tallybird failed. Nothing has changed on our side as far as I know, and the same card pays for everything else we use. Could you tell me what's going on before someone in finance starts asking me?`,
			`Our {Plan} invoice shows as unpaid and the billing page says the last payment attempt failed. I put a new company card in a couple of weeks ago, so I don't understand why it's still a problem.`
		],
		quick: [`Is there a way to have the invoices emailed to our accounts inbox as well as to me?`, `Yes. Under Billing, Invoice emails, you can add up to three extra addresses, and each new invoice and receipt goes to all of them.`],
		reply: `Sorry about the noise in your inbox. I can see invoice {inv} for {amount} and the failed attempts against it. Could you tell me the last four digits of the card you expect us to be charging? Then I can compare it with what's on file.`,
		need: 'the last four digits of the card you expect us to charge',
		turns: [
			[`It should be the Visa ending {card4new}. Here's what the billing page shows me:`, `Thanks, that's the clue. Every attempt went to a card ending {card4}, which expired at the end of {expMonth}, not to the {card4new} card. The new card is saved on the workspace, but as a second card. Could you check whether it says "Default" next to it on the Payment method page?`, arts.attempts],
			[`It doesn't. There's a "Make default" link next to it, and the old one is marked Default.`, `That's the whole story, then. Saving a card doesn't make it the one we charge; we only ever try the default card. Once the {card4new} card is the default, you can pay the open invoice straight away from Billing, Invoices, "Pay now", and next month's will go to the new card on its own.`],
			[`Can I just remove the old card?`, `Yes, once the new one is the default. Remove is greyed out on the default card, which is why it may have looked stuck.`],
			[`Will we be charged twice if I pay now and you also try again?`, `No. Once the invoice is paid, nothing else is attempted against it.`]
		],
		snag: [`I made it the default and pressed Pay now, and it says the payment needs confirming with the bank, then nothing happens.`, `That's the bank's security check. It opens in a small window, which a pop-up blocker can stop. If you allow pop-ups for tallybird.app and press Pay now again, the bank's window should appear and you can approve it there.`],
		cause: `the new card was saved as a second card, and every attempt went to the expired default card ending {card4}`,
		act: `make the card ending {card4new} the default under Billing, Payment method, then pay the open invoice from Billing, Invoices`,
		fixed: [`Made the new card the default and paid. The invoice says Paid now. Thanks for spotting that.`, `Done, the invoice is paid and the old card is gone. That was easier than I feared.`],
		follow: `One more thing: our finance team wants our VAT number on the invoices from now on. Can the one I've just paid be reissued with it too?`,
		owe: `ask the finance team to reissue invoice {inv} with your VAT number, and send it to you by {day}`,
		team: 'the finance team',
		handover: `Customer's payments for {site} keep failing and they say the card is fine. I can't see why from the console; could you check the payment processor's side for invoice {inv}?`
	},
	{
		area: 'billing',
		weight: 1,
		plans: ['free'],
		unpaid: true,
		mainOnly: true,
		projects: 'two',
		outcomes: ['resolved', 'owe', 'team', 'quiet'],
		subjects: ['Invoice after we downgraded', 'Still being billed on the free plan', 'Why do we owe $29?'],
		open: [
			`We moved our workspace from Team down to Free at the start of the month, because we only run a couple of projects now. Today we got an invoice for $29 and a reminder that it's due. Surely that's a mistake?`,
			`Hello, I downgraded us to the free plan on {downDay} and I've just had an invoice for a full month of Team. Can you cancel it, please? We're not using anything Team gives us.`
		],
		quick: [`Does the free plan still let guests comment on tasks?`, `It does. Guests can view and comment on the projects they're shared with on every plan, and they're never counted or charged.`],
		reply: `Thanks for writing in, and sorry for the surprise. I can see the downgrade on your workspace. Could you send me the invoice number from the email, so I'm sure I'm looking at the same one?`,
		need: 'the invoice number from the email',
		turns: [
			[`It's {inv}. The email says it's for "Team, 1 month".`, `Thanks. That invoice was opened on 1 {month}, a couple of days before the downgrade, so it covers the month you were already in on Team; the downgrade applies to every invoice after it. I can see why it reads as a mistake, though. Could you tell me whether anyone used Team features after the 1st? That's the first thing finance will ask me.`],
			[`I doubt it. We had four projects, I deleted two on the {delDay} and then downgraded.`, `That matches what I see: nothing above the free limit was used after the {delDay}. As the workspace only had Team for those few days, I've asked finance to cancel the invoice rather than make you pay for the month. They usually do it the same day, and the reminder emails stop as soon as it's cancelled.`],
			[`Will the cancelled invoice still show in our history?`, `Yes, marked as cancelled with nothing to pay, so your accounts can see what happened.`],
			[`Can we go back to Team later without losing anything?`, `Yes. Upgrading again takes effect at once, and everything you have on Free stays as it is.`]
		],
		snag: [`I've had another reminder about the invoice this morning.`, `Sorry, that one was already on its way before finance cancelled it. You can ignore it; nothing more will be sent for that invoice.`],
		cause: `the invoice was opened on the 1st, before the downgrade, so it billed the month already started on Team`,
		act: `wait for finance to cancel the invoice`,
		fixed: [`The invoice now shows as cancelled. Thank you for sorting it so quickly.`, `Just checked and there's nothing to pay any more. Much appreciated.`],
		follow: `While you're there: we paid last month's invoice on the old card and I can't find a receipt for it anywhere. Could you send me one?`,
		owe: `ask finance for a receipt for last month's invoice and email it to you by {day}`,
		team: 'the finance team',
		handover: `Customer downgraded {site} from Team to Free on {downDay}, after invoice {inv} for $29.00 was opened. They'd like it cancelled. Please check and cancel or advise.`
	},
	{
		area: 'billing',
		weight: 2,
		plans: ['team', 'business'],
		unpaid: true,
		subjects: ['Invoice rejected by our accounts team', 'Need a PO number on invoices', 'VAT number missing from invoice'],
		open: [
			`Our accounts payable team has sent back your last invoice because it doesn't show our purchase order number or our registered company address. They won't pay anything that doesn't have both. How do I get those onto it?`,
			`Can you add our VAT number to our invoices? Our finance department can't reclaim the VAT without it and they've put the latest invoice on hold until it's fixed.`
		],
		quick: [`Do you invoice in euros? Half our suppliers do.`, `Not at the moment, sorry: all our invoices are in US dollars, wherever the workspace is.`],
		reply: `Happy to help with that. Could you forward me the message from your accounts team, so I can see exactly what they need on the invoice?`,
		need: 'the message from your accounts team',
		turns: [
			[`Here's what they sent me:`, `Thanks, that's clear. You can add the company name, address, VAT number and a purchase order number yourself under Billing, Company details, and every invoice opened after that shows them. Invoices already opened don't change on their own, though. Which ones does your accounts team need again?`, arts.apEmail],
			[`Just {inv}, and they'd like last month's for their records.`, `Fine. Once the details are saved on your side, finance can reissue both with the same numbers and amounts, so nothing changes in your books apart from the details at the top.`],
			[`Does the PO number have to be the same every month?`, `No, you can change it whenever your accounts team raises a new order; each invoice takes the one saved at the moment it's opened.`],
			[`Can the invoices go straight to our accounts payable inbox?`, `Yes: add their address under Billing, Invoice emails, and each invoice goes there as well as to you.`]
		],
		snag: [`I've saved the details, but the PO box only takes 12 characters and ours is longer.`, `That box does stop at 12, I'm afraid. If you put the PO in the "Notes for invoices" field instead, it's printed in full under the company details, and accounts teams usually accept that.`],
		cause: `the company details and PO number had never been saved on the workspace, so the invoices went out without them`,
		act: `add the company name, registered address, VAT number and PO number under Billing, Company details`,
		fixed: [`Saved the details and the reissued invoices came through this morning. Accounts are happy. Thanks!`, `All sorted: both invoices now show the PO and the VAT number, and {inv} has gone off for payment.`],
		follow: `Our auditors also want a statement of everything we've paid you this year. Is that something you can send?`,
		owe: `ask the finance team for a statement of this year's invoices and payments and send it to you by {day}`,
		team: 'the finance team',
		handover: `Customer's accounts payable won't pay invoice {inv} on {site} without a PO number and company details on it. Could you look at reissuing it?`
	},
	{
		area: 'billing',
		weight: 1,
		plans: ['team', 'business'],
		subjects: ['We seem to be paying twice', 'Two Tallybird invoices every month', 'Paying for two workspaces?'],
		open: [
			`Our bookkeeper noticed that we pay Tallybird twice a month: two invoices of {amount}, going to two different people. We only meant to have one workspace. Can you help us work out what happened?`,
			`I think a colleague and I have each set up a paid workspace without realising. We're getting two invoices for {Plan} every month and I'd like to bring everything into one and stop paying for the second.`
		],
		quick: [`Can people belong to more than one workspace with the same login?`, `Yes. One login can belong to as many workspaces as you like, and there's a switcher at the top left of the sidebar.`],
		reply: `That does sound like two workspaces. Could you send me the two email addresses the invoices go to? Then I can look them both up.`,
		need: 'the two email addresses the invoices go to',
		turns: [
			[`One comes to me and the other to {memberFirst}, {memberEmail}.`, `Thanks. You're right: there are two paid workspaces, {site} and {site2}. {memberFirst} set up the second one in {month2} and upgraded it the same day. Here's what each holds:`, arts.workspaces, true],
			[`Can we move {memberFirst}'s projects into ours?`, `Yes. Each project has "Move to another workspace" in its settings, and it keeps its tasks, comments, files and people. You need to be an admin of both, so {memberFirst} will have to make you an admin of {site2} first. Once the second workspace is empty, it can go down to Free and its invoices stop.`],
			[`What about the months we've paid twice?`, `I've asked finance about it. As the second workspace was a mistake, they'll refund its last two invoices once it's on Free.`],
			[`Will {memberFirst} lose access to anything when we move the projects?`, `No. Everyone on a project comes with it, so {memberFirst} stays on the projects she's on, just in {site} instead.`]
		],
		snag: [`The Move option is greyed out on two of {memberFirst}'s projects.`, `Those two have guests from outside your company on them, and a project with guests can only be moved by its owner. If {memberFirst} moves those two herself, you can do the rest.`],
		cause: `{memberFirst} had set up a second paid workspace, {site2}, in {month2}`,
		act: `move the projects from {site2} into {site} and put {site2} on Free`,
		fixed: [`Everything's moved across and the second workspace is on Free. Thanks for walking me through it.`, `Done. One workspace, one invoice. The refund showed up today too.`],
		follow: `Could the refund go to the card that paid for {site2}? That's {memberFirst}'s personal card, as it turns out.`,
		owe: `ask finance to refund the last two invoices of {site2} to the card that paid them and confirm by {day}`,
		team: 'the finance team',
		handover: `Customer thinks {co} is paying for two {Plan} workspaces by mistake. I can only find {site}; could you check the billing records for {domain} addresses?`
	},
	{
		area: 'billing',
		weight: 2,
		plans: ['team', 'business'],
		unpaid: true,
		minDay: 14,
		subjects: ['We paid by bank transfer', 'Reminder for an invoice we already paid', 'Payment sent but invoice still open'],
		open: [
			`We keep getting reminders that invoice {inv} is unpaid, but our finance team paid it by bank transfer on {paidDay}. Could you check and stop the reminders?`,
			`Your system says we owe {amount} but we transferred it nearly two weeks ago. Can you confirm you have it? I don't want our workspace to get into trouble over something we've already paid.`
		],
		quick: [`Can we pay by card from now on instead of transfer?`, `Of course. Add a card under Billing, Payment method and make it the default; new invoices are charged to it on the day they're opened.`],
		reply: `Thanks, and sorry about the reminders. Transfers sometimes reach us without anything that ties them to an invoice. Could you send me the confirmation from your bank, with the date, the amount and the reference you used?`,
		need: 'the bank confirmation with the date, the amount and the reference',
		turns: [
			[`Here it is:`, `Thanks. The reference on the transfer is "{ref}", without the invoice number, so the money is sitting in our account unmatched. I've passed the confirmation to finance so they can match it by hand.`, arts.bankConfirm],
			[`Is there anything we should put in the reference next time?`, `Just the invoice number, {inv} for this one. Our bank feed matches on it, and the invoice is marked paid the next working day.`],
			[`And the reminders will stop?`, `Yes, as soon as the invoice is marked paid. If another one arrives before then, you can ignore it.`],
			[`Can we see in Tallybird when a transfer has been matched?`, `Yes: on Billing, Invoices, a matched invoice shows "Paid by transfer" with the date we received it.`]
		],
		snag: [`Finance say they've also paid the next invoice by transfer, with the same reference.`, `Thanks for warning me. I've passed that one to finance as well, so they can match both together.`],
		cause: `the transfer arrived with the reference "{ref}" and no invoice number, so it was never matched`,
		act: `put the invoice number in the reference of every transfer from now on`,
		fixed: [`The invoice shows as paid now. Thanks for chasing it.`, `Got the receipt this morning. All good, thank you.`],
		follow: `While we're on it, could our invoices show your bank details? Our finance team copies them in by hand every month.`,
		owe: `ask finance whether your invoices can show our bank details and let you know by {day}`,
		team: 'the finance team',
		handover: `Customer says they paid invoice {inv} ({amount}) by bank transfer, but it's still open and reminders are going out. Please look for the payment.`
	},
	{
		area: 'plans',
		weight: 2,
		plans: ['free'],
		mainOnly: true,
		projects: 'full',
		org: charityTails,
		subjects: ['Cannot create a new project', 'Project limit?', 'Stuck at three projects'],
		open: [
			`I'm trying to add a project for our autumn fundraiser and Tallybird won't let me. It says we've reached the limit. We've only been using it a few months!`,
			`When I click New project the button just shows a message about our plan. We're a small volunteer group and three projects isn't enough, but we can't pay much. What are our options?`
		],
		quick: [`Can I copy a project with all its tasks to start the next one?`, `Yes: open the project's menu and choose Make a copy. You can pick whether to copy the tasks, the people and the due dates.`],
		reply: `Thanks for getting in touch. The Free plan includes three projects, and I can see your workspace has three. Could you send me the message you see when you click New project? I'd like to check it's the limit and nothing else.`,
		need: 'the message you see when you click New project',
		turns: [
			[`This is what it says:`, `Thanks, that's the project limit. Every project counts, including ones you've finished, so the usual options are to free a slot or move to Team. Team is $29 a month for the whole workspace, however many people use it, and allows 20 projects. Which of your three projects are still in use?`, arts.limitBanner],
			[`"{project}" finished in the summer. The other two are live.`, `Then you could export "{project}" to CSV from its menu, keep the file, and delete the project. That frees the slot straight away and costs nothing.`],
			[`If we upgrade later, can we get "{project}" back from the file?`, `You can import the CSV into a new project at any time. The tasks, dates and assignees come back; comments and attachments stay in the export but aren't imported again.`],
			[`Can guests still see a project once we've exported and deleted it?`, `No, once a project is deleted nobody can open it, guests included. The CSV is your copy, so keep it somewhere safe.`]
		],
		snag: [`I deleted the old project but the New project button still shows the same message.`, `The count updates when the page reloads. If you refresh the page, the button should let you through.`],
		cause: `the workspace already has the three projects the Free plan includes, one of them finished`,
		act: `export "{project}" to CSV and delete it, or move the workspace to Team`,
		fixed: [`Exported the old one, deleted it, and the fundraiser project is up. Thanks!`, `That worked. We've got our new project and a copy of the old one on the laptop.`],
		follow: `We're a registered charity. Is there any discount if we go to Team next year?`,
		owe: `ask the sales team about a charity price for Team and let you know by {day}`,
		team: 'the sales team',
		handover: `Free workspace {site} is at the project limit; volunteer group asking about options and pricing. Could sales get in touch?`
	},
	{
		area: 'plans',
		weight: 1,
		plans: ['business'],
		mainOnly: true,
		projects: 'over',
		subjects: [`Can't switch to the Team plan`, 'Downgrade option greyed out', 'Moving from Business to Team'],
		open: [
			`We'd like to move from Business to Team to save some money, but the billing page won't let me pick Team. Is something broken?`,
			`Our budget for next year has been cut and I need to get us onto the Team plan. When I choose it, the page says we can't change plans right now, with no reason given.`
		],
		quick: [`Does Team keep the audit log?`, `No, the audit log is part of Business. The history stays readable for 90 days after a move to Team, and you can export it before then.`],
		reply: `Sorry it's not telling you why. Could you send me the exact text of the message, and tell me roughly when you tried?`,
		need: 'the exact text of the message and the time you tried',
		turns: [
			[`"This workspace can't move to Team at the moment." Yesterday afternoon, twice.`, `Thanks. The reason it doesn't spell out is the project count: your workspace has {projects} projects and Team allows 20. I agree the message should say so. Here's the list from our side, with the last activity on each:`, arts.projectsList, true],
			[`I'd no idea we had so many. A lot of those are old client jobs.`, `That's common. Exporting the finished ones to CSV and deleting them is the usual way; once the count is 20 or fewer, Team is offered on the billing page straight away.`],
			[`Do we lose single sign-on?`, `Yes, sign-in with {idp} is a Business feature. On Team, people sign in with their email and a password or with Google. Anyone who has only ever used {idp} gets an email to set a password.`],
			[`Will the price change straight away?`, `The move takes effect at once, and your next invoice is at the Team price of $29.`]
		],
		snag: [`We're down to 20 projects, but the billing page still won't offer Team.`, `Two of your projects are in the trash, and they count until they're gone for good. If you empty the trash under Settings, Trash, Team is offered straight away.`],
		cause: `the workspace has {projects} projects and Team allows 20`,
		act: `export and delete the finished projects until 20 or fewer are left, then choose Team on the billing page`,
		fixed: [`Cleared out the old jobs and we're on Team now. Thanks for explaining.`, `Down to 18 projects and the switch went through. Cheers.`],
		follow: `Before we go: is there any chance of a lower Business price if we commit for a year? I'd rather keep single sign-on if it's close.`,
		owe: `ask the sales team whether a yearly commitment changes the Business price and let you know by {day}`,
		team: 'the sales team',
		handover: `Business workspace {site} wants to move to Team for budget reasons; {projects} projects, so the billing page won't offer it. Could sales talk to them before they cut back?`
	},
	{
		area: 'billing',
		weight: 1,
		plans: ['team', 'business'],
		unpaid: true,
		subjects: ['Supplier set-up forms', 'Need your W-9 before we can pay', 'Vendor registration'],
		open: [
			`Before our accounts team can pay your invoice they need to set Tallybird up as a supplier, which means a W-9, your bank details on letterhead, and an insurance certificate. Who can send me those?`,
			`Our finance system won't let us pay any supplier who hasn't filled in our vendor form. Your invoice is stuck until then. Can someone from your side complete it?`
		],
		quick: [`Can I change who receives the invoice emails?`, `Yes, under Billing, Invoice emails. The owner always gets them, and you can add up to three more addresses.`],
		reply: `We can do that. Could you tell me exactly which documents your accounts team needs, or send me their checklist if they have one?`,
		need: 'the list of documents your accounts team needs',
		turns: [
			[`Here's their checklist:`, `Thanks. We have most of these ready. The W-9 and the bank letter are standard documents and I've attached both. The insurance certificate and your own vendor form need finance, so I've asked them.`, arts.supplierList],
			[`How long will finance take?`, `They usually turn vendor forms round in two or three working days.`],
			[`Will anything change on our workspace while the invoice waits?`, `No, the workspace carries on as normal while finance and your accounts team sort the paperwork out.`],
			[`Is the W-9 signed?`, `Yes, it's signed by our finance director and dated this year.`]
		],
		snag: [`Their portal wants the bank letter dated within the last 90 days. Ours is from the spring.`, `Fair enough. I've asked finance for a freshly dated one, and they say it'll be with you tomorrow.`],
		cause: `the accounts team can't pay a supplier that isn't set up in their system`,
		act: `upload the W-9 and the bank letter to your accounts team's supplier portal`,
		fixed: [`Accounts have everything and the invoice is paid. Thank you.`, `All set up, and they paid it this morning.`],
		follow: `They've also asked whether you can take payment by ACH in future rather than by card.`,
		owe: `ask finance whether ACH payments can be set up for your workspace and reply by {day}`,
		team: 'the finance team',
		handover: `{co} needs supplier documents and their vendor form filled in before they can pay invoice {inv}. Could you send what they need?`
	},
	{
		area: 'sales',
		weight: 1,
		plans: ['team'],
		org: charityTails,
		subjects: ['Charity discount?', 'Nonprofit pricing', 'Do you offer discounts for charities?'],
		open: [
			`We're a small registered charity on the Team plan, and $29 a month is a fair chunk of our budget. Do you have a charity price?`,
			`I look after the IT for {co}, a charity. We're on {Plan} and I've been asked to find out whether there's a nonprofit discount before our budget meeting.`
		],
		quick: [`Is there a limit on how many volunteers we can invite?`, `No. Every plan allows as many members and guests as you need; the plans differ by the number of projects and a few features.`],
		reply: `Thanks for asking. We do have a charity price: half off Team and Business for registered charities. Could you send me your charity registration number and the country you're registered in?`,
		need: 'your charity registration number and country',
		turns: [
			[`It's {regno}, registered in {country}.`, `Thanks. I've checked it against the public register and it's all in order, so the discount is now on your workspace. It applies to every invoice opened from now on, which makes Team $14.50 a month.`],
			[`Can it go back to this month's invoice?`, `I'm afraid invoices already opened stay as they are. The next one is the first with the discount.`],
			[`Do we need to apply again each year?`, `We check the register once a year and email you if anything's missing; there's nothing you need to do.`],
			[`Does the discount apply to Business as well, if we grow?`, `Yes, half off Business too, which makes it $49.50 a month.`]
		],
		snag: [`The register still shows our old name. Will that be a problem?`, `No, the number is what we check. If you like, you can put your current name on the invoices under Billing, Company details.`],
		cause: `the charity price is only set up once the registration number has been checked`,
		act: `add your charity's registered name under Billing, Company details, so it appears on the discounted invoices`,
		fixed: [`The billing page shows $14.50. That's made the trustees happy, thank you.`, `Perfect, I can see the discount on the billing page now.`],
		follow: `Our sister charity also uses Tallybird on a separate workspace. Can they get the same price?`,
		owe: `ask the sales team whether the price can extend to your sister charity's workspace and let you know by {day}`,
		team: 'the sales team',
		handover: `{co} says it's a registered charity and asks for the charity price on {site}. Could sales check the registration and set it up?`
	},
	{
		area: 'sales',
		weight: 1,
		plans: ['team'],
		subjects: ['Single sign-on', 'Does Tallybird support SAML?', 'SSO with {idp}'],
		open: [
			`Our IT team wants everyone to sign in to work tools through {idp}. We're on Team. Is single sign-on available, and what would it cost us?`,
			`We're rolling out {idp} across the company and Tallybird is one of the last tools without single sign-on for us. Can it be switched on for our workspace?`
		],
		quick: [`Can we make two-factor compulsory for everyone in the meantime?`, `Yes. Under Settings, Security, "Require two-factor" makes everyone set it up at their next sign-in.`],
		reply: `Single sign-on with {idp} is part of the Business plan, which is $99 a month for up to 50 projects. Could you tell me roughly how many people would sign in that way, and whether you need new joiners set up automatically?`,
		need: 'the number of people and your plans for new joiners',
		turns: [
			[`About {members} people, and yes, IT would like new starters to get access without anyone inviting them.`, `Thanks. Both are covered on Business: sign-in through {idp}, and new joiners set up at their first sign-in. If you'd like to try it first, sales can turn on Business for 14 days without changing your billing.`],
			[`A trial would be good. IT will want to test it before we pay.`, `Great. I've asked Marcus in sales to switch it on; he'll also send you our set-up guide for {idp}.`],
			[`Will our projects and people stay as they are?`, `Yes. Moving to Business changes the features and the price, nothing in the workspace itself.`],
			[`Do we need to warn people before we switch it on?`, `It's worth it: the first time they sign in after you require single sign-on, they're sent to {idp} instead of the password page, which surprises people who aren't expecting it.`]
		],
		snag: [`IT ask whether people can still use their old passwords once single sign-on is on.`, `Only if you allow it. When you require single sign-on, passwords stop working for everyone except the owner and up to two people you name.`],
		cause: `single sign-on is part of the Business plan and the workspace is on Team`,
		act: `upgrade to Business from the billing page and follow the {idp} set-up guide`,
		fixed: [`Business is on, {idp} sign-in works for IT's test group, and we roll it out next week. Thanks.`, `The trial went fine and we've upgraded. Thanks for the help.`],
		follow: `IT have asked for your security overview and the latest penetration test summary before we roll it out.`,
		owe: `send you the security overview and ask the security team for the latest penetration test summary, by {day}`,
		team: 'the sales team',
		handover: `Team workspace {site} wants single sign-on with {idp}. Please talk to them about Business and a trial.`
	},
	{
		area: 'sales',
		weight: 1,
		plans: ['team', 'business'],
		subjects: ['Security questionnaire', 'Data processing agreement', 'Where is our data stored?'],
		open: [
			`Our compliance team has asked me to get a signed data processing agreement and answers to their security questionnaire before we put client work into Tallybird. Can you help?`,
			`Before we move more of the company onto Tallybird, our legal team needs to know where our data is stored, who your sub-processors are, and whether you'll sign a DPA.`
		],
		quick: [`Can we see who has signed in to our workspace recently?`, `The members list under Settings shows each person's last sign-in. On Business, the audit log also lists every sign-in with its date and place.`],
		reply: `Glad to help. Our standard DPA can be signed from Settings, Legal, and I can answer the main questions here. Could you send me the questionnaire, or the list of questions your compliance team needs answered?`,
		need: 'the questionnaire or the list of questions',
		turns: [
			[`The main ones: where the data is stored, who can see it, and which other companies process it.`, `Thanks. Your data is stored in the United States, in AWS us-east-1, with encrypted backups in us-west-2. Only a small group of our engineers can reach it, through single sign-on with hardware keys. Here are our sub-processors:`, arts.subprocessors, true],
			[`Do you have a penetration test report?`, `We have an independent test every year; the latest was in June. We share a summary under NDA, which the security team handles.`],
			[`And if we leave, how quickly is our data deleted?`, `Within 30 days of the workspace being closed, and backups roll over within a further 35 days.`],
			[`Can we have our data stored in Europe instead?`, `Not at the moment; every workspace is stored in the United States. Our DPA includes the standard contractual clauses for transfers from Europe.`]
		],
		snag: [`Compliance want the DPA to name our legal entity, not the workspace.`, `That's fine: the DPA form in Settings, Legal has fields for the legal name and registered address, and they're printed on the signed copy.`],
		cause: `the compliance team needs a signed DPA and answers to their questionnaire before client work goes in`,
		act: `sign the DPA from Settings, Legal, and send the rest of the questionnaire to security@tallybird.app`,
		fixed: [`DPA signed, questionnaire answered, and compliance have given us the go-ahead. Thanks.`, `Compliance are satisfied. Thank you for the quick answers.`],
		follow: `Compliance would also like the penetration test summary, if we sign your NDA.`,
		owe: `send you our NDA and, once it's signed, ask the security team for the penetration test summary, by {day}`,
		team: 'the security team',
		handover: `{co} on {site} needs their security questionnaire completed (about 60 questions) and a DPA. Could the security team take the questionnaire?`
	},
	{
		area: 'sales',
		weight: 2,
		plans: ['free'],
		trial: true,
		mainOnly: true,
		subjects: ['More time on the trial?', 'Trial extension', 'Trial ends before we could test it'],
		open: [
			`Our trial ends in a couple of days and we've barely started: half the team were off for {reason}. Is there any way to get a bit more time before we choose a plan?`,
			`Could you extend our trial? We set up the workspace, then got pulled onto a deadline, and I haven't been able to show it to the people who sign off on software.`
		],
		quick: [`What happens to our projects if we don't upgrade at the end of the trial?`, `They stay. The workspace goes back to Free, and you keep working in your first three projects; any others stay readable until you upgrade or delete some.`],
		reply: `Of course, we can help with that. Could you tell me which workspace it is? I can see two trials set up from {domain} addresses.`,
		need: 'the name of the workspace',
		turns: [
			[`It's {site}. The other one was a test {memberFirst} made.`, `Thanks. I've added 14 days, so the trial on {site} now ends on {newEnd}. Nothing else changes.`],
			[`Brilliant. Can we see the Business features during the trial too?`, `The trial is of Team. If you'd like to look at Business features such as single sign-on, sales can show you them on a call.`],
			[`How do we upgrade when we're ready?`, `From Billing, choose the plan and add a card. Your projects and people stay exactly as they are.`],
			[`Can more people join during the trial?`, `Yes, invite as many as you like. The trial covers everyone in the workspace.`]
		],
		snag: [`The billing page still shows the old end date.`, `It updates overnight. The trial itself is already extended, so nothing happens on the old date.`],
		cause: `half the team were away during the trial`,
		act: `upgrade from Billing before {newEnd} if you'd like to keep more than three projects open`,
		fixed: [`Thanks for the extension. We've shown it to the directors and upgraded to Team today.`, `The extra time did it, we're on Team now.`],
		follow: `The directors would like a short call about Business before we commit. Could someone show us?`,
		owe: `ask the sales team to book a call with you about Business, and confirm the time by {day}`,
		team: 'the sales team',
		handover: `Trial workspace {site} ({members} people) would like more time and a walkthrough of Team and Business before buying. Please get in touch.`
	},
	{
		area: 'email',
		weight: 2,
		plans: ['free', 'team', 'business'],
		subjects: ['Not getting notification emails', 'Emails from Tallybird missing', 'Task assigned but no email'],
		open: [
			`Since last week, nobody in our office gets emails from Tallybird: no assignments, no mentions, nothing. People working from home on personal addresses still get them.`,
			`I was assigned three tasks yesterday and didn't get a single email about them. A colleague says the same. We rely on those emails because half the team never opens the app.`
		],
		quick: [`Can I turn off the emails about comments but keep the ones about assignments?`, `Yes. Under Profile, Notifications, each kind of email has its own switch.`],
		reply: `Sorry, that's a nuisance. Could you give me one email that didn't arrive: who it was for, and roughly when it should have come? Then I can follow it through our sending logs.`,
		need: 'one missing email, with who it was for and when',
		turns: [
			[`One was to me, for the task "{task}", around {pm} yesterday.`, `Thanks. Our side sent it and your mail server accepted it, and then it disappeared, which usually means a filter after delivery. Here's what our logs show for your address over the last day:`, arts.delivery, true],
			[`Our IT person says they changed the spam filter last week.`, `That fits. Mail from notify.tallybird.app is signed and passes the usual checks, but some filters hold any new bulk sender until it's on an allow list. If IT adds notify.tallybird.app, the next emails come through, and the held ones can be released from quarantine.`],
			[`Should IT allow anything else?`, `support.tallybird.app, if you'd like replies from us to land too. That's all.`],
			[`Is there a way to check the emails are getting through, without waiting for an assignment?`, `Yes: Profile, Notifications has a "Send me a test email" link at the bottom. It goes out exactly the same way.`]
		],
		snag: [`IT added it, but emails to two people are still missing.`, `Those two have "Pause notifications" turned on in their profiles, probably from a holiday. Once they switch it off under Profile, Notifications, they'll get emails again.`],
		cause: `the office's new spam filter is quarantining mail from notify.tallybird.app`,
		act: `ask your IT team to add notify.tallybird.app to the mail filter's allow list and release the held messages`,
		fixed: [`IT added the domain and the emails are flooding in, including last week's. Thank you.`, `All working again. IT released a couple of hundred held messages, oops.`],
		follow: `IT also want a list of the addresses your emails come from, so they can write the filter properly. Can you send it?`,
		owe: `ask the engineering team for the list of addresses and ranges we send from and pass it on by {day}`,
		team: 'the engineering team',
		handover: `Notification emails to {domain} are accepted by their server but users never see them, for about a week. Can engineering check delivery for this domain?`
	},
	{
		area: 'integrations',
		weight: 2,
		plans: ['free', 'team', 'business'],
		subjects: ['Slack updates stopped', 'Tallybird not posting to Slack', 'Slack integration broken'],
		open: [
			`Our Slack channel used to get a message every time a task was finished in {project}. It stopped on {stopDay} and nobody changed the settings.`,
			`The Tallybird app in Slack has gone quiet. We post task updates into #{channel} and there's been nothing for over a week, although the integration still shows as connected.`
		],
		quick: [`Can we choose which projects post to Slack?`, `Yes. Each project has its own Slack settings, so you can send some to one channel and some to another, or leave them out.`],
		reply: `Thanks for flagging it. Could you tell me who connected Slack to Tallybird in the first place? It's shown under Settings, Integrations, Slack.`,
		need: 'the name of whoever connected Slack in the first place',
		turns: [
			[`It says "Connected by {exFull}". {exFirst} left us at the end of last month.`, `That's very likely it. When someone's Slack account is deactivated, Slack withdraws the access they gave apps, and our posts start being refused. Here's what Slack has been sending back to us:`, arts.slack, true],
			[`So someone else needs to connect it again?`, `Yes: any admin can click Reconnect under Settings, Integrations, Slack and approve it in Slack. Your channel settings are kept, so the posts pick up where they stopped.`],
			[`Will we get the missed updates?`, `No, the ones Slack refused aren't sent again. Anything from the moment you reconnect is posted as normal.`],
			[`Could we connect it with a shared IT account, so this doesn't happen again?`, `You can, as long as that account stays active in Slack. Plenty of teams do exactly that for this reason.`]
		],
		snag: [`I reconnected, but #{channel} still gets nothing. Other channels work.`, `#{channel} is a private channel, and Slack only lets the Tallybird app post there once it's been invited. Typing /invite @Tallybird in the channel does it.`],
		cause: `Slack was connected by {exFull}, who has left, and Slack withdrew the access when their account was deactivated`,
		act: `reconnect Slack from Settings, Integrations as a current admin`,
		fixed: [`Reconnected as me and the updates are back in #{channel}. Thanks!`, `Done, and a test task posted straight away. Thank you.`],
		follow: `Could the integration tell us next time, instead of going quiet?`,
		owe: `pass the request for a warning to the integrations team and tell you what they say by {day}`,
		team: 'the integrations team',
		handover: `Slack posts from {site} have stopped; the connection still shows green. Can integrations check what Slack is returning?`
	},
	{
		area: 'integrations',
		weight: 1,
		plans: ['team', 'business'],
		subjects: ['GitHub pull requests not showing', 'Pull requests not linked to tasks', 'GitHub integration not linking'],
		open: [
			`We connected GitHub last month and some pull requests show up on their tasks, but most don't. The developers swear they're putting the task number in.`,
			`Pull requests from our {repo} repository mostly don't appear on their tasks. I'm the one who set up the GitHub integration and I'm not sure where to look.`
		],
		quick: [`Can a task show pull requests from two repositories?`, `Yes. Any connected repository can link to any task in the workspace.`],
		reply: `Thanks. Could you send me the titles of a few pull requests that should have linked, and the tasks they belong to?`,
		need: 'a few pull request titles and their tasks',
		turns: [
			[`Here are some from this week:`, `Thanks, that helps. The ones that linked have the task key in capitals, like {key}-{num}. The ones that didn't have it in lower case, like {keyLower}-{num2}, and the integration only looks for capitals.`, arts.webhooks],
			[`Can it not just ignore the case?`, `It can: in Settings, Integrations, GitHub there's a "Match task keys in any case" box, off by default. Ticking it applies to new pull requests and to any that are updated after that.`],
			[`What about last week's?`, `They link as soon as someone pushes to them or edits the title. Merged ones stay unlinked unless you edit them.`],
			[`Can the integration see private repositories?`, `Yes, any repository you give the Tallybird app access to in GitHub, private ones included.`]
		],
		snag: [`It's linking now, but each pull request shows up on its task twice.`, `That happens when the repository is connected twice, once by you and once by an older connection. If you remove the older one under Settings, Integrations, GitHub, each pull request shows once.`],
		cause: `the developers write task keys in lower case and the integration only matched capitals`,
		act: `tick "Match task keys in any case" under Settings, Integrations, GitHub`,
		fixed: [`Ticked the box and the new pull requests are all linking. Thanks.`, `That was it. Everything from today shows on its task.`],
		follow: `Could a merged pull request mark its task as done?`,
		owe: `ask the integrations team whether a merged pull request can complete its task and let you know by {day}`,
		team: 'the integrations team',
		handover: `GitHub integration on {site}: most pull requests not linking although the titles carry task keys. Can integrations check the deliveries for the {repo} repository?`
	},
	{
		area: 'calendar',
		weight: 1,
		plans: ['free', 'team', 'business'],
		subjects: ['Calendar shows tasks a day early', 'Due dates wrong in Google Calendar', 'Calendar feed one day out'],
		open: [
			`We subscribe to our Tallybird due dates in Google Calendar and every task shows up the day before it's due. In Tallybird itself the dates are right.`,
			`Our calendar feed has all the due dates one day out. It's caused a bit of chaos, because people plan their week from the calendar, not from Tallybird.`
		],
		quick: [`Can the calendar feed include only my own tasks?`, `Yes. Under Profile, Calendar feed, choose "Only tasks assigned to me" and copy the new link.`],
		reply: `Sorry about the muddle. Could you tell me where you're based, and the name of one task that shows on the wrong day?`,
		need: 'your location and one task on the wrong day',
		turns: [
			[`We're in {city}. "{task2}" is due on {dueDay} and shows on the day before.`, `Thanks. Here's that task as our feed sends it. The date is right, but it goes out as midnight UTC rather than as an all-day date, because the workspace's time zone is still UTC, the default when it was created. Could you check Settings, General, Time zone?`, arts.calendar, true],
			[`It does say UTC. I never touched it.`, `That's the cause, then. In {city}, midnight UTC falls on the evening before, so your calendar shows the day before. Set the workspace time zone to {tz} and the feed sends all-day dates.`],
			[`Do we need to subscribe again?`, `No, but Google Calendar only refreshes subscriptions every few hours, so give it until tomorrow.`],
			[`Does the workspace time zone change anything else?`, `It sets the default for due times, the weekly summary and the time report. People can still pick their own time zone in their profile for what they see.`]
		],
		snag: [`Most dates are right now, but tasks with a due time are still an hour out.`, `Those take the time zone of the person who set the time. If they still have UTC in their profile, it's worth changing it there too, under Profile, Time zone.`],
		cause: `the workspace's time zone was still UTC, so due dates went out as midnight UTC and showed on the evening before in {city}`,
		act: `set the workspace time zone to {tz} under Settings, General`,
		fixed: [`Changed it and by this morning the calendar matched. Thanks!`, `All the dates are right in the calendar now.`],
		follow: `Could the feed include tasks with a start date as well as a due date?`,
		owe: `ask the engineering team whether start dates can go into the feed and let you know by {day}`,
		team: 'the engineering team',
		handover: `Calendar feed for {site} shows due dates one day early for people in {city}. Can engineering look at what the feed sends?`
	},
	{
		area: 'imports',
		weight: 2,
		plans: ['free', 'team', 'business'],
		subjects: ['Import from spreadsheet went wrong', 'CSV import dates are wrong', 'Import skipped half the rows'],
		open: [
			`I imported our task list from a spreadsheet and the due dates are all over the place: some in the wrong month, and about half the rows didn't come in at all.`,
			`We're moving from {tool} and exported everything to CSV. Tallybird imported it without complaint, but lots of tasks are missing and the dates look wrong.`
		],
		quick: [`Can I import into an existing project rather than a new one?`, `Yes. In the import window, choose "Add to an existing project" and pick it from the list.`],
		reply: `Sorry it hasn't gone smoothly. Every import keeps a log; could you open Settings, Imports, click the import and send me what it says?`,
		need: 'the import log',
		turns: [
			[`Here's the log:`, `Thanks, that explains it. Your spreadsheet writes dates day first, like 25/10/2026, and the import read them month first. Dates with a day of 12 or less came in with the day and month swapped, and anything with a day over 12 was skipped.`, arts.importLog],
			[`Can I just fix the dates by hand?`, `I wouldn't: it's quicker to delete the imported project and run the import again with "Day first" chosen under Date format. That brings every row in with the right date.`],
			[`Will deleting the project upset anything?`, `Not if nobody has worked in it yet. It goes to the trash for 30 days, so it can be restored if needed.`],
			[`Will everyone get an email when the tasks come in?`, `No, imports don't send notifications, so nobody gets a pile of emails. The tasks simply appear in My Tasks.`]
		],
		snag: [`Second time round, the assignees didn't come through.`, `The import matches assignees by email address, and your spreadsheet has names. If you add a column with each person's email and choose it as Assignee in the import window, they'll be matched.`],
		cause: `the spreadsheet's dates are day first and the import read them month first`,
		act: `delete the imported project and import again with "Day first" chosen as the date format`,
		fixed: [`Imported it again with day first and all {rows} rows came in with the right dates. Thanks.`, `Perfect this time. Every task is there.`],
		follow: `Could the import spot the date format itself, or at least warn before skipping rows?`,
		owe: `pass the request for a warning to the engineering team and let you know what they say by {day}`,
		team: 'the engineering team',
		handover: `CSV import on {site} skipped rows and got some dates wrong. Can engineering look at the import?`
	},
	{
		area: 'mobile',
		weight: 2,
		plans: ['free', 'team', 'business'],
		subjects: ['App crashes when I add a photo', 'Mobile app keeps closing', 'iPhone app crash'],
		open: [
			`The Tallybird app on my phone closes as soon as I try to attach a photo to a task. It worked fine last month, and I've restarted the phone.`,
			`Our site team take photos for every snag and attach them in the Tallybird app. Since the weekend, the app crashes for some of them the moment they pick a photo.`
		],
		quick: [`Can people use the app without a signal and catch up later?`, `Partly: tasks you've opened recently stay readable offline, and comments you write are sent once you're back online. Photos need a connection to upload.`],
		reply: `Sorry about that. Could you tell me which phone it is and which version of the app? The version is at the bottom of the app's Settings page.`,
		need: 'the phone model and the app version',
		turns: [
			[`{device}, app version {appver}. Here's what the app's diagnostics page shows:`, `Thanks, that's very helpful. Version {appver} has a fault with photos in HEIC format, which newer iPhones save by default. It's fixed in {appfix}, which is in the App Store now.`, arts.crash],
			[`It's not offering me an update.`, `The store rolls updates out over a day or two. Searching for Tallybird in the store and opening its page usually shows the Update button sooner.`],
			[`Until then, is there a way round it?`, `Yes: set the camera to "Most Compatible" in the phone's camera settings and new photos are saved as JPEG, which the app handles fine.`],
			[`Are the photos people couldn't attach lost?`, `No, they're still on the phones. Once the app is updated, they can attach them as normal.`]
		],
		snag: [`I've updated, but it won't attach a video of the site either.`, `Videos have their own limit: the app attaches videos up to 500 MB, and anything bigger has to go through the web app.`],
		cause: `app version {appver} crashes on HEIC photos, fixed in {appfix}`,
		act: `update the app to {appfix}`,
		fixed: [`Updated and photos attach fine again. Thanks.`, `{appfix} is on all the site phones now and nobody's had a crash since.`],
		follow: `Can we stop people uploading huge photos? Some are 12 MB each.`,
		owe: `ask the mobile team whether photos can be made smaller on upload and let you know by {day}`,
		team: 'the mobile team',
		handover: `Mobile app crashes when people at {co} attach photos. Can the mobile team take a look?`
	},
	{
		area: 'projects',
		weight: 1,
		plans: ['team', 'business'],
		subjects: ['Timeline view very slow', 'Timeline takes forever to load', 'Project timeline hangs'],
		open: [
			`The timeline view on our {project} project takes about half a minute to open, and then the browser hangs when I scroll. Other projects are fine.`,
			`Is there a limit on how big a project can be? Our biggest one has become almost unusable in the timeline view, though the list and the board are fine.`
		],
		quick: [`Can I print the timeline?`, `Yes: the timeline's menu has "Export as PDF", which fits the dates you can see onto pages of the size you choose.`],
		reply: `Sorry, that sounds painful. Could you tell me which browser you're using, and roughly how many tasks the project has?`,
		need: 'the browser and the number of tasks',
		turns: [
			[`{browser}, and it says {big} tasks. Here are the project's numbers from its settings page:`, `Thanks. {big} tasks is well within what the timeline handles, but the numbers show it spanning decades, which isn't normal. Could one task have a date far in the future?`, arts.projectStats],
			[`You're right: one task is due in {farYear}. Someone mistyped it.`, `That's what's doing it. The timeline draws every day between the first and the last date, so one task in {farYear} makes it build decades of empty columns. Correct that date and the timeline should open in a second or two.`],
			[`Can we stop dates like that being entered?`, `Not at the moment, but the list view sorted by due date shows any odd ones at the top, so it's easy to check now and then.`],
			[`Will fixing the date bother the person it's assigned to?`, `They'll get the usual email saying the due date changed. Nothing else.`]
		],
		snag: [`I corrected it, but the timeline still runs on to {farYear}.`, `There's a second task with that date, a subtask under the first one. Subtasks don't show in the list view unless "Show subtasks" is ticked; with that on, you'll see it at the top.`],
		cause: `one task was due in {farYear} by mistake, so the timeline built decades of empty columns`,
		act: `correct the due date of the task set to {farYear}`,
		fixed: [`Fixed the date and the timeline opens instantly. Thanks!`, `That was it. Quick as anything now.`],
		follow: `Could the app warn when someone sets a date that far out?`,
		owe: `pass the request for a warning to the engineering team and let you know what they say by {day}`,
		team: 'the engineering team',
		handover: `Timeline view on the biggest project at {site} takes about 30 seconds to load and then hangs. Can engineering profile it?`
	},
	{
		area: 'time',
		weight: 2,
		plans: ['team', 'business'],
		subjects: ['Time report totals look wrong', 'Timesheet hours far too high', 'Weekly hours report is off'],
		open: [
			`Our weekly time report says the team logged {hours} hours last week. There are {people} of us and none of us worked that much, sadly.`,
			`I bill clients from the Tallybird time report and this month's total is much higher than I'd expect. I can't send that to a client.`
		],
		quick: [`Can I export the time report to Excel?`, `Yes, the Export button on the report gives you a CSV that opens in Excel, with one row per time entry.`],
		reply: `Let's find where the extra hours come from. Could you send me the report for that week, grouped by person?`,
		need: 'the report for that week grouped by person',
		turns: [
			[`Here it is:`, `Thanks. {memberFirst}'s total stands out. Could you open their entries for the week and look for an unusually long one?`, arts.timeEntries],
			[`Found it: a timer on "{task}" ran from {startDay} to {stopDay2}.`, `That's the extra hours. A timer keeps running until someone stops it, even with the app closed. If you edit that entry to the time {memberFirst} really worked, the report corrects itself straight away.`],
			[`Is there a way to spot this next time?`, `The "Long entries" filter on the time report shows anything over eight hours. It's worth a look before you invoice.`],
			[`Can I stop people editing their time after I've invoiced?`, `On Business you can lock entries before a date under Settings, Time. On Team, each entry's history shows any edit and who made it.`]
		],
		snag: [`I edited it, but the total for the month hasn't changed.`, `The monthly view is refreshed every hour. It'll match after that, or straight away if you change the date range and change it back.`],
		cause: `a timer on "{task}" was left running from {startDay} to {stopDay2}`,
		act: `edit {memberFirst}'s long entry on "{task}" to the real time`,
		fixed: [`Corrected the entry and the total looks right now. Thanks.`, `The report adds up now. Phew.`],
		follow: `Could timers stop themselves after, say, ten hours?`,
		owe: `put the request for an automatic stop to the engineering team and tell you what they say by {day}`,
		team: 'the engineering team',
		handover: `Time report on {site} shows far more hours than the team worked. Can engineering check the report's totals?`
	},
	{
		area: 'access',
		weight: 2,
		plans: ['free', 'team', 'business'],
		subjects: [`Client can't see the project`, 'Guest invite not working', 'Guest sees an empty workspace'],
		open: [
			`I invited a client as a guest so she could follow our work on {project}, but when she signs in she sees an empty workspace.`,
			`Our client says the invitation link works, but there's nothing there once she's signed in. I've invited her twice now.`
		],
		quick: [`Do guests count towards our plan?`, `No. Guests are free on every plan and don't count towards anything.`],
		reply: `Thanks. Could you send me the email address you invited her with, and the one she signs in with, if you know it?`,
		need: 'the address you invited and the one she signs in with',
		turns: [
			[`I invited {guestEmail}. I think that's what she uses.`, `Thanks. Here are the recent invitations on your workspace:`, arts.invites, true],
			[`So she's joined, but she isn't in the project?`, `Exactly. For guests, joining the workspace and being added to a project are two steps, and the second didn't happen. Open {project}, click Share and add her, and the project appears for her straight away.`],
			[`Can I share several projects at once?`, `Yes, from Settings, Members: open her name and tick the projects she should see.`],
			[`Can guests see each other?`, `Only on projects they share. A guest never sees the members list or any other project.`]
		],
		snag: [`I've shared it, but she says she still can't see the files.`, `The files in that project are in a folder set to "Members only". Open the folder's menu and choose "Everyone on the project", and she'll see them.`],
		cause: `the guest had joined the workspace but had never been added to {project}`,
		act: `add the guest to {project} from its Share menu`,
		fixed: [`Shared it and she can see everything now. Thanks.`, `Sorted. She's been commenting all morning.`],
		follow: `Could guests be added to the project in the same step as the invitation?`,
		owe: `pass the request to the engineering team and let you know what they say by {day}`,
		team: 'the engineering team',
		handover: `A guest invited to {site} sees an empty workspace after accepting. Can engineering check her account?`
	},
	{
		area: 'access',
		weight: 1,
		plans: ['team', 'business'],
		subjects: ['Our workspace owner has left', 'Change the owner of our account', 'Nobody can manage billing'],
		open: [
			`{exFull}, who set up our Tallybird workspace, left the company last month. Nobody else can change billing or the main settings, and we need to update the card.`,
			`We need to transfer ownership of our workspace. The owner has left {co} and his email address no longer works.`
		],
		quick: [`Can a workspace have more than one admin?`, `Yes, as many as you like. Only the owner can manage billing and close the workspace, but admins can do everything else.`],
		reply: `We can help. As ownership controls billing and the workspace's data, we need to confirm the request comes from {co}. Could someone senior at {co} email us from a company address, naming the new owner?`,
		need: 'an email from someone senior at {co}, from a company address',
		turns: [
			[`Our director, {dirFull}, has just emailed you from {dirEmail}.`, `Thanks, it's arrived. I've passed it to our security team, who check every change of owner; they usually do it within a working day.`],
			[`Is there anything else they'll need?`, `They may call the number on the billing account to confirm. Otherwise no.`],
			[`Will {exFirst} still have access?`, `Not once ownership moves to you: you can then remove {exFirst} from the workspace and manage billing yourself.`],
			[`Is there anything we can do so this doesn't happen again?`, `Make a second person an admin: admins can do everything except billing, and a request from an admin is quicker for security to check.`]
		],
		snag: [`Security tried to call, but the number on the account was {exFirst}'s mobile.`, `They've just told me. As your director wrote from a company address and you're already an admin, they've accepted that instead, so there's no need for a call.`],
		cause: `the only owner, {exFull}, has left, and a change of owner needs the security team's check`,
		act: `accept the ownership transfer from the email the security team sends you`,
		fixed: [`Accepted the transfer and I can see billing now. Thank you.`, `I'm the owner now and the card's updated. Thanks for the quick turnaround.`],
		follow: `Could we have a second owner, in case this happens again?`,
		owe: `ask the security team whether a second owner is possible and let you know by {day}`,
		team: 'the security team',
		handover: `{co} asks to move ownership of {site} from {exFull}, who has left, to {full}. Please verify with them.`
	},
	{
		area: 'access',
		weight: 1,
		plans: ['business'],
		subjects: ['Single sign-on fails', 'Error signing in with {idp}', 'Single sign-on set-up not working'],
		open: [
			`We're setting up single sign-on with {idp} and every test sign-in ends on a Tallybird error page. I've followed the guide as far as I can tell.`,
			`Since we changed some settings in {idp} yesterday, nobody can sign in to Tallybird through single sign-on. People with passwords are fine.`
		],
		quick: [`Can we keep password sign-in for one admin, in case single sign-on breaks?`, `Yes. When you require single sign-on, the owner can always sign in with a password, and you can name up to two more people as exceptions.`],
		reply: `Sorry for the trouble. Could you send me the error details? There's a "Show details" link at the bottom of the error page.`,
		need: 'the error details from the error page',
		turns: [
			[`Here are the details:`, `Thanks. The sign-in reaches us, but the audience in it is https://{slug}.tallybird.app, and we expect https://{slug}.tallybird.app/saml/metadata. Could you check the Audience URI, sometimes called the Entity ID, in the Tallybird app in {idp}?`, arts.saml],
			[`Yes, it was missing the /saml/metadata part.`, `That's it, then. Once the Audience URI matches, sign-ins go through. Nothing needs changing on the Tallybird side.`],
			[`Will people already signed in be thrown out?`, `No. Anyone signed in stays signed in until their session ends.`],
			[`Do people need to do anything the first time?`, `No. They click "Sign in with single sign-on", enter their work email, and {idp} does the rest.`]
		],
		snag: [`The test group can sign in, but two people get "user not assigned".`, `That message comes from {idp}: those two aren't assigned to the Tallybird app there. Once IT assign them, they'll get in.`],
		cause: `the Audience URI in {idp} was missing /saml/metadata`,
		act: `correct the Audience URI in {idp} to https://{slug}.tallybird.app/saml/metadata`,
		fixed: [`Corrected it and the test group signed in fine. Thanks.`, `All working. Everyone's in through {idp} now.`],
		follow: `Can people be removed from Tallybird automatically when they're removed in {idp}?`,
		owe: `ask the security team whether removals can follow {idp} for your workspace and let you know by {day}`,
		team: 'the security team',
		handover: `Single sign-on with {idp} on {site} ends on an error page for everyone. Can the security team look at the sign-in attempts?`
	},
	{
		area: 'api',
		weight: 1,
		plans: ['team', 'business'],
		subjects: ['API returning 429', 'Too many requests from the API', 'Our script is being blocked'],
		open: [
			`We have a nightly script that copies time entries from the Tallybird API into our payroll system. For the last few nights it's failed with "429 Too Many Requests".`,
			`Our developer says the Tallybird API has started refusing our requests partway through our weekly export. Did something change?`
		],
		quick: [`Can an API token be limited to read-only?`, `Yes. When you create a token under Profile, API tokens, choose "Read only".`],
		reply: `Let's take a look. Could you send me the response headers from one of the refused requests? They show which limit it hit.`,
		need: 'the response headers of a refused request',
		turns: [
			[`Here's one:`, `Thanks. Each token can make 120 requests a minute. Your script makes around {rate} a minute at its busiest, so it runs into the limit after the first half minute.`, arts.headers],
			[`Did the limit change? It used to work.`, `The limit hasn't changed, but your workspace has grown: the script now asks for {pages} pages of time entries, where in the summer it was a few dozen.`],
			[`What should our developer do?`, `Wait for the number of seconds in the Retry-After header when a request is refused, or ask for 500 entries a page instead of 50, which cuts the requests by ten.`],
			[`Is the limit per token or for the whole workspace?`, `Per token. Two scripts with a token each can make 120 requests a minute each.`]
		],
		snag: [`Our developer changed the page size and now gets "400 Bad Request".`, `The largest page is 500. If the script asks for more than that, the API refuses; 500 or fewer works.`],
		cause: `the script makes about {rate} requests a minute and each token is limited to 120`,
		act: `ask your developer to wait for the Retry-After seconds when a request is refused, or to use pages of 500 entries`,
		fixed: [`Our developer changed the page size and last night's run finished in four minutes. Thanks.`, `All good now, the script ran without a single refusal.`],
		follow: `Is it possible to raise the limit for our workspace? We may add more scripts.`,
		owe: `ask the engineering team whether the limit can be raised for your workspace and let you know by {day}`,
		team: 'the engineering team',
		handover: `API token on {site} getting 429s; customer says their usage hasn't changed. Can engineering check?`
	},
	{
		area: 'account',
		weight: 1,
		plans: ['team', 'business'],
		mainOnly: true,
		subjects: ['Closing our account', 'Export everything and close the workspace', 'How do we leave Tallybird?'],
		open: [
			`{co} is closing down at the end of the year. We need a full export of everything in Tallybird for our records, and then the workspace deleted.`,
			`We've been bought by a bigger company and are moving to their tools. How do we get a full copy of our projects and close the workspace properly?`
		],
		quick: [`Will we get a final invoice?`, `Only for the month you're in, if it hasn't been invoiced yet. Nothing is billed after the workspace is closed.`],
		reply: `Sorry to see you go, and thanks for letting us know. The export is under Settings, Export, and the owner can close the workspace from Settings, General. Could you tell me roughly how many projects and files you have, so I can say how long the export will take?`,
		need: 'a rough count of your projects and files',
		turns: [
			[`{projects} projects and a lot of attachments. Here's what the export page shows:`, `Thanks. An export that size takes an hour or two, and you'll get an email with download links when it's ready. The links work for seven days.`, arts.exportList],
			[`What format is it in?`, `Projects, tasks and comments come as CSV and JSON, and attachments as one zip file per project, with the original file names.`],
			[`And when is our data actually deleted?`, `Within 30 days of the workspace being closed. Backups roll over within a further 35 days.`],
			[`Can people keep using the workspace while the export runs?`, `Yes, the export works from a copy taken when you start it, so people can carry on until you close the workspace.`]
		],
		snag: [`One of the attachment zips won't open.`, `That one's over 4 GB, and some built-in zip tools give up at that size. 7-Zip or The Unarchiver opens it fine.`],
		cause: `the company is closing and needs an export before the workspace is deleted`,
		act: `run the export from Settings, Export, download the files within seven days, then close the workspace`,
		fixed: [`Export downloaded and checked, and I've closed the workspace. Thanks for everything.`, `We have everything and the workspace is closed. Thanks.`],
		follow: `Could you send us written confirmation once the data has been deleted? Our accountant wants it for the file.`,
		owe: `send you written confirmation as soon as the deletion is complete`,
		team: 'the security team',
		handover: `{co} is closing {site} and wants written confirmation of deletion afterwards. Could the security team handle it?`
	},
	{
		area: 'reports',
		weight: 1,
		plans: ['free', 'team', 'business'],
		subjects: ['Weekly summary covers the wrong days', 'Weekly email starts on Sunday', `Weekly report numbers don't match`],
		open: [
			`The weekly summary email covers Sunday to Saturday, which never matches our numbers, because we count Monday to Sunday.`,
			`My manager compares the Tallybird weekly summary with our own spreadsheet and they never agree. I think the summary uses different days.`
		],
		quick: [`Can the weekly summary go to someone who isn't a member?`, `Not directly, but any member can forward it, and guests can turn it on for the projects they're shared with.`],
		reply: `Thanks. Could you forward me one of the summary emails, so I can see the dates it covers?`,
		need: 'one of the summary emails',
		turns: [
			[`Here's last week's:`, `Thanks. It covers Sunday to Saturday, which comes from the workspace setting "Week starts on". It's set to Sunday, the default for workspaces created in the US.`, arts.weekly],
			[`Where do I change it?`, `Settings, General, "Week starts on". It changes the weekly summary, the time report and the calendar views together.`],
			[`Will past summaries change?`, `No, they stay as they were sent. The next one will cover Monday to Sunday.`],
			[`Can I choose the day the summary arrives?`, `Yes, under Profile, Notifications, "Weekly summary" you can pick the day and the hour.`]
		],
		snag: [`I've changed it, but the time report still starts on Sunday.`, `The time report keeps the start day it was saved with. Open it, choose Monday under Week starts on, and save it again.`],
		cause: `the workspace's week starts on Sunday`,
		act: `set "Week starts on" to Monday under Settings, General`,
		fixed: [`Changed it, and this week's summary matched our spreadsheet. Thanks.`, `All lined up now.`],
		follow: `Can the summary include hours logged per project?`,
		owe: `pass the request to the engineering team and let you know what they say by {day}`,
		team: 'the engineering team',
		handover: `Weekly summary for {site} doesn't match the customer's own counts. Can engineering check the summary's figures?`
	},
	{
		area: 'email',
		weight: 1,
		plans: ['free', 'team', 'business'],
		subjects: [`Emailing tasks into a project doesn't work`, 'Forwarded emails not creating tasks', 'Project email address not working'],
		open: [
			`We forward client emails to our project's Tallybird address to turn them into tasks. It worked when I tried it myself, but nothing forwarded from our shared inbox ever arrives.`,
			`I set up the email address for {project} so our team could forward requests in, but only some of them turn into tasks.`
		],
		quick: [`Do attachments on emailed tasks come through?`, `Yes, up to 25 MB per email; larger attachments are left off and the task says which ones.`],
		reply: `Thanks. Could you send me the bounce message, if one came back, or the time of one forwarded email that didn't arrive?`,
		need: 'a bounce message or the time of one missing email',
		turns: [
			[`A bounce came back to the shared inbox:`, `Thanks, that explains it. A project only takes email from members of the workspace, so that nobody outside can fill it with tasks. Your shared inbox forwards from {sharedAddr}, which isn't a member.`, arts.bounce],
			[`We can't make the shared inbox a member, surely?`, `You don't need to. In the project's email settings you can add up to ten extra addresses that may send to it; add {sharedAddr} there.`],
			[`Will the tasks show who sent the original email?`, `Yes, the original sender is kept in the task's description.`],
			[`Is there a limit on how many emails a project can take?`, `Up to 500 a day, which is far more than most teams send.`]
		],
		snag: [`Added it, but the emails our forwarding rule sends still bounce.`, `A forwarding rule sends from your mail system's own address rather than {sharedAddr}. If the rule is set to "redirect" instead of "forward", the original sender is kept and it goes through.`],
		cause: `the shared inbox forwards from {sharedAddr}, which isn't a member, and the project only takes email from members`,
		act: `add {sharedAddr} to the allowed senders in {project}'s email settings`,
		fixed: [`Added it and the forwarded emails are turning into tasks. Thanks!`, `Working now, thank you.`],
		follow: `Could the attachments on those emails also go into the project's files?`,
		owe: `pass the request to the integrations team and let you know what they say by {day}`,
		team: 'the integrations team',
		handover: `Email-in for {project} on {site}: forwarded emails from a shared inbox don't create tasks. Can integrations check the inbound mail log?`
	},
	{
		area: 'files',
		weight: 1,
		plans: ['free', 'team', 'business'],
		subjects: ['Uploads fail at the end', `Can't attach large files`, 'File upload stuck at 100%'],
		open: [
			`Uploading drawings to tasks fails for anything larger than about 50 MB. The bar gets to the end and then says "Upload failed".`,
			`Our designers can't attach their files to tasks any more: small files work, big ones fail every time.`
		],
		quick: [`Is there a storage limit for the workspace?`, `No limit on total storage on any plan; each file can be up to 250 MB.`],
		reply: `Sorry about that. Could you try uploading a large file from somewhere other than the office network, such as a phone hotspot, and tell me whether it works?`,
		need: 'the result of an upload away from the office network',
		turns: [
			[`From my phone's hotspot it worked. From the office it fails. Here's what the browser's network tab shows in the office:`, `Thanks, that points to the office network. The upload is cut off at exactly 50 MB, and the error comes from your proxy rather than from us.`, arts.network],
			[`So our IT need to change something?`, `Yes: the proxy has a 50 MB limit on uploads. If IT raise it to 250 MB for tallybird.app, or let tallybird.app bypass the proxy, large files will upload.`],
			[`Is there a way round it in the meantime?`, `The desktop app uploads in pieces of 10 MB, so it stays under the proxy's limit.`],
			[`Do people need to upload the failed files again?`, `Yes, a failed upload isn't kept, so they'll need to attach those files again.`]
		],
		snag: [`IT raised the limit, but it still fails at 50 MB on the meeting room Wi-Fi.`, `The meeting room Wi-Fi may go through a different proxy; the network tab shows it on the Server line. It's worth asking IT to change that one too.`],
		cause: `the office proxy cuts uploads off at 50 MB`,
		act: `ask IT to raise the proxy's upload limit for tallybird.app to 250 MB`,
		fixed: [`IT raised the limit and the drawings upload fine. Thanks.`, `Big files go through now. Thank you.`],
		follow: `Could large files be previewed in the browser without downloading them?`,
		owe: `pass the request to the engineering team and let you know what they say by {day}`,
		team: 'the engineering team',
		handover: `Uploads over about 50 MB fail for people at {co}. Can engineering check the upload logs?`
	},
	{
		area: 'projects',
		weight: 1,
		plans: ['free', 'team', 'business'],
		mainOnly: true,
		projects: 'room',
		subjects: ['Project deleted by mistake', 'Can you restore a project?', 'Project disappeared'],
		open: [
			`One of our team deleted the {project} project by accident this morning. Is there any way to get it back? It had months of work in it.`,
			`{project} has vanished from our sidebar and nobody admits to deleting it. Can you tell us what happened and bring it back?`
		],
		quick: [`Can we stop members from deleting projects?`, `Yes. Under Settings, Permissions, set "Who can delete projects" to Admins only.`],
		reply: `Don't worry, deleted projects are kept for 30 days. Could you check Settings, Trash and tell me whether {project} is listed there?`,
		need: 'the list from Settings, Trash',
		turns: [
			[`It's there. Here's the trash list:`, `Great. Click Restore next to {project} and it comes back exactly as it was, with its tasks, comments, files and people.`, arts.trash],
			[`Does restoring it count against our project limit?`, `It does, like any project. You have room for it on {Plan}.`],
			[`Can I see who deleted it?`, `The trash shows who deleted each project and when, on every plan.`],
			[`Will the people on it be told it's back?`, `No emails go out for a restore; it simply reappears in their sidebar.`]
		],
		snag: [`It's back, but the due dates have gone from the tasks.`, `They're there; the view went back to the default when it was restored, and the default hides dates. Choose "Show due dates" in the view menu and they reappear.`],
		cause: `the project had been deleted and was sitting in the trash`,
		act: `restore {project} from Settings, Trash, and set "Who can delete projects" to Admins only`,
		fixed: [`Restored, and everything's there. Huge relief, thank you.`, `It's back! Thank you so much.`],
		follow: `The restored project has lost its Slack channel. Can that come back too?`,
		owe: `ask the integrations team to look at the Slack link on the restored project and get back to you by {day}`,
		team: 'the engineering team',
		handover: `{project} on {site} was deleted and the customer can't find it to restore it. Can engineering check?`
	},
	{
		area: 'access',
		weight: 1,
		plans: ['free', 'team', 'business'],
		subjects: ['Stuck on the sign-in page', `Can't log in with Google`, 'Sign-in keeps looping'],
		open: [
			`When I sign in with Google on my laptop, Tallybird sends me straight back to the sign-in page. It works on my colleague's laptop.`,
			`I can't get into Tallybird. I click "Sign in with Google", choose my account, and end up on the sign-in page again, over and over.`
		],
		quick: [`Can I sign in with a password as well as Google?`, `Yes. Under Profile, Sign-in, choose "Set a password" and you can use either.`],
		reply: `Sorry, that loop is frustrating. Could you tell me which browser and version you're using, and whether it happens in a private window too?`,
		need: 'the browser and version, and the result in a private window',
		turns: [
			[`{browser}. In a private window it works!`, `Thanks, that narrows it down. A private window starts with no cookies or extensions, so something in your normal window is in the way. Could you check whether a content blocker or privacy extension is turned on for tallybird.app?`],
			[`There's an extension that blocks third-party cookies. Here's what the console showed:`, `That's it. Sign-in passes through accounts.tallybird.app and back, and the extension blocks the cookie that carries you across. Allowing cookies for tallybird.app in the extension fixes it.`, arts.signin],
			[`Is it safe to allow?`, `Yes, the cookie only carries your sign-in between our own addresses.`],
			[`Will I have to do this on my phone too?`, `No, the apps sign in a different way and don't use that cookie.`]
		],
		snag: [`Allowed it, and now it signs me in but asks again after a few minutes.`, `That's the extension clearing cookies when the tab closes. It has a setting to keep cookies for allowed sites; with that on, you'll stay signed in.`],
		cause: `a privacy extension blocks the sign-in cookie between accounts.tallybird.app and the workspace`,
		act: `allow cookies for tallybird.app in the privacy extension`,
		fixed: [`Allowed it and I'm in. Thanks.`, `Signed in fine now.`],
		follow: `Could the sign-in page say when cookies are blocked, instead of going round in circles?`,
		owe: `pass the request to the engineering team and let you know what they say by {day}`,
		team: 'the engineering team',
		handover: `Sign-in loop with Google for {email}. Can engineering check the sign-in logs?`
	},
	{
		area: 'reports',
		weight: 1,
		plans: ['team', 'business'],
		subjects: ['Workload view shows nobody busy', 'Workload report is empty', 'Workload numbers look wrong'],
		open: [
			`The workload view says everyone in the team has nothing on this week, but they're all flat out. What are we doing wrong?`,
			`I'm trying to use the workload report to plan the next sprint and it shows zero for most people.`
		],
		quick: [`Can the workload view show contractors who are guests?`, `Not at the moment: it shows members only.`],
		reply: `Let's find out. Could you send me what the workload view shows for this week, and the name of a task someone is working on?`,
		need: 'a copy of the workload view and the name of one task in progress',
		turns: [
			[`Here's the view. {memberFirst} is working on "{task3}".`, `Thanks. "{task3}" has a due date but no estimate, and the workload view adds up estimates, so it counts as zero hours.`, arts.workload],
			[`We don't estimate tasks. Is there another way?`, `Yes: switch the view from "Hours" to "Tasks" at the top right, and it shows how many tasks each person has due instead.`],
			[`Can that be the default for everyone?`, `An admin can set it from the view's menu, "Make default for workspace".`],
			[`Can we see the workload across every project at once?`, `Yes, the workload view under Reports covers the whole workspace; the one inside a project only shows that project.`]
		],
		snag: [`Switched to tasks, but {memberFirst} shows none, and she has lots.`, `Her tasks are assigned to the Design team rather than to her by name. The view counts tasks assigned to people; ticking "Include team tasks" shows them.`],
		cause: `the tasks have no estimates and the workload view was counting hours`,
		act: `switch the workload view to "Tasks" and make it the workspace default`,
		fixed: [`Switched to tasks and it makes sense now. Thanks.`, `Much better, I can see who's overloaded.`],
		follow: `Could tasks without estimates count as a set number of hours?`,
		owe: `pass the request to the engineering team and let you know what they say by {day}`,
		team: 'the engineering team',
		handover: `Workload view on {site} shows zero for most members. Can engineering check?`
	},
	{
		area: 'imports',
		weight: 1,
		plans: ['team', 'business'],
		subjects: ['Jira import lost our story points', 'Custom fields missing after import', 'Jira import incomplete'],
		open: [
			`We imported our backlog from Jira and the story points and components are gone. The tasks and comments came across fine.`,
			`Our Jira import finished, but most of our custom fields are empty in Tallybird. The team needs them for planning.`
		],
		quick: [`Can we keep the Jira issue numbers on the tasks?`, `Yes, each imported task keeps its Jira key in a field called "Imported from", which you can search.`],
		reply: `Thanks. Could you send me the field mapping from the import's summary page? It's under Settings, Imports.`,
		need: 'the field mapping from the import summary',
		turns: [
			[`Here's the mapping:`, `Thanks. The import only fills fields that already exist in Tallybird; "Story points" and "Component" had no matching field, so they were left out.`, arts.mapping],
			[`Can we add them now?`, `Yes: create a Number field called "Story points" and a Dropdown called "Component" in the project's Fields, then run the import again with "Update existing tasks" ticked. It fills the fields without making new tasks.`],
			[`Will running it again copy the comments a second time?`, `No, "Update existing tasks" only fills fields that are empty.`],
			[`Can we bring more Jira projects into the same Tallybird project?`, `Yes: choose "Add to an existing project" when you start the import.`]
		],
		snag: [`The story points came in, but they're all whole numbers and ours have halves.`, `The Number field was created with no decimal places. Edit the field, set one decimal place, and run the update once more.`],
		cause: `"Story points" and "Component" had no matching field in Tallybird, so the import left them out`,
		act: `create the "Story points" and "Component" fields and run the import again with "Update existing tasks" ticked`,
		fixed: [`Created the fields, ran the import again, and the points are all there. Thanks.`, `All our fields are filled now.`],
		follow: `Could the import create missing fields itself?`,
		owe: `pass the request to the engineering team and let you know what they say by {day}`,
		team: 'the engineering team',
		handover: `Jira import on {site} left custom fields empty. Can engineering check the import?`
	},
	{
		area: 'tasks',
		weight: 1,
		plans: ['free', 'team', 'business'],
		subjects: ['Repeating tasks stopped appearing', 'Weekly tasks not being created', 'Repeat tasks missing this week'],
		open: [
			`Our weekly "{task3}" task didn't appear this Monday, or the Monday before. It had turned up every week since the spring.`,
			`Several of our repeating tasks have stopped being created. Nobody turned them off as far as I know, and the ones I set up myself are still fine.`
		],
		quick: [`Can a repeating task skip public holidays?`, `Not by itself, but you can skip a single occurrence from the task's Repeat menu without changing the rest of the series.`],
		reply: `Sorry about that. Could you tell me who set up the tasks that stopped, if you know, and the name of one of them?`,
		need: 'the name of whoever set up the tasks that stopped, and of one of the tasks',
		turns: [
			[`I think {exFirst} set most of them up. One is "{task3}".`, `Thanks. "{task3}" is a series set up by {exFull}, and the last one was created on {stopDay}. Could you check whether {exFull} is still an active member? Settings, Members shows it.`],
			[`Ah. {exFirst} left, and we deactivated the account around then.`, `That's it, then. A repeating series belongs to the person who set it up, and it pauses when their account is deactivated. If you open each series and choose "Take over this series", it carries on from the next date, with you as its owner.`],
			[`How do I find all the series {exFirst} owned?`, `In the list view, filter on "Repeats" and "Created by {exFull}". That shows every series that paused.`],
			[`Will the missed weeks be created now?`, `No, the series carries on from the next date. If you need the missed ones, "Create missed occurrences" in the series menu adds them in one go.`]
		],
		snag: [`I took them over, but one still says it's paused.`, `That one was also paused by hand at some point, so it needs "Resume" as well as being taken over. It's in the same menu.`],
		cause: `the series were set up by {exFull}, whose account was deactivated, and they paused with it`,
		act: `take over each of {exFull}'s series from its Repeat menu`,
		fixed: [`Took them all over and Monday's tasks turned up. Thanks!`, `All the repeating tasks are back. Thank you.`],
		follow: `Could a series pass to an admin by itself when someone leaves?`,
		owe: `pass the request to the engineering team and let you know what they say by {day}`,
		team: 'the engineering team',
		handover: `Repeating tasks on {site} have stopped being created. Can engineering check the series?`
	},
	{
		area: 'security',
		weight: 1,
		plans: ['free', 'team', 'business'],
		subjects: ['Lost my phone, locked out', 'Two-factor code problem', `Can't sign in without my old phone`],
		open: [
			`I've got a new phone and didn't move the authenticator app across, so I can't get a code to sign in to Tallybird. I'm one of the admins.`,
			`My phone was stolen at the weekend and Tallybird wants a two-factor code I can't get any more. Everything I manage is in there.`
		],
		quick: [`Can we use security keys instead of an app for two-factor?`, `Yes. Under Profile, Security, you can add one or more security keys, and use either a key or the app when you sign in.`],
		reply: `Sorry to hear that. Did you keep the backup codes we showed when you turned on two-factor? Each one works once in place of a code.`,
		need: 'your answer about the backup codes',
		turns: [
			[`I don't think so. If I did, they were on the old phone.`, `No problem. Another admin on your workspace can reset two-factor for you, which is quicker than going through us. Is anyone else an admin?`],
			[`{memberFirst} is, I think.`, `Then {memberFirst} can do it: Settings, Members, your name, "Reset two-factor". You'll be able to sign in with your password and set it up again on the new phone.`],
			[`Will I lose anything when it's reset?`, `No, only the two-factor set-up is cleared. Your projects, settings and notifications stay as they are.`],
			[`How do I avoid this next time?`, `When you set it up again, save the backup codes somewhere other than your phone, such as your password manager.`]
		],
		snag: [`{memberFirst} reset it, but the app says my code is wrong.`, `That's usually the phone's time being a minute or two out. Setting the phone's date and time to automatic fixes it, and the codes work straight away.`],
		cause: `the authenticator was on the old phone and there were no backup codes`,
		act: `ask {memberFirst} to reset your two-factor under Settings, Members, then set it up again on the new phone`,
		fixed: [`{memberFirst} reset it and I'm back in, with two-factor on the new phone. Thanks.`, `I'm in again, and I've saved the backup codes this time.`],
		follow: `Could you tell me who else on the workspace has two-factor turned on? I'd like everyone to have it.`,
		owe: `send you a list of the members with and without two-factor, which needs a check from the security team, by {day}`,
		team: 'the security team',
		handover: `Admin {full} on {site} is locked out after losing their phone, with no backup codes. Please verify and reset two-factor.`
	},
	{
		area: 'accessibility',
		weight: 1,
		plans: ['free', 'team', 'business'],
		subjects: ['Moving tasks with the keyboard', 'Screen reader and the board view', 'Accessibility question'],
		open: [
			`{memberFirst}, who joined us last month, uses a screen reader. She can read the tasks on the board but can't move them between columns, because that seems to need dragging.`,
			`Is there a way to move tasks on the board without a mouse? A colleague with limited use of her hands is struggling, and I'd hate for her to be left out.`
		],
		quick: [`Is there a high-contrast theme?`, `Yes, under Profile, Appearance, choose "High contrast". It applies to the web app and the desktop app.`],
		reply: `Thanks for asking, and yes, there is. Could you tell me which browser and screen reader she uses, so I can give you the right keys?`,
		need: 'the browser and screen reader she uses',
		turns: [
			[`{browser}, with {reader}.`, `Thanks. Could you check whether keyboard controls are switched on in her profile? It's under Profile, Accessibility.`],
			[`I've had a look: they're off.`, `That's why. Once they're on, she can move to a task with Tab, press Space to pick it up, use the arrow keys to choose a column and press Space again to put it down. {reader} announces the column and the position as she goes.`],
			[`Can she change the order within a column too?`, `Yes: with the task picked up, the up and down arrows move it one place at a time.`],
			[`Is there a list of all the keys?`, `Press the question mark key on any board and a list opens. The same list is on our help site in an accessible format.`]
		],
		snag: [`She's switched them on, but Space opens the task instead of picking it up.`, `That happens when the task's title link has focus rather than the task itself. Pressing Tab once more moves focus to the task, and Space then picks it up.`],
		cause: `keyboard controls were switched off in her profile`,
		act: `switch on keyboard controls for {memberFirst} under Profile, Accessibility`,
		fixed: [`{memberFirst} has tried it and says it works well with {reader}. Thank you.`, `She's moving tasks around happily now. Thanks.`],
		follow: `Could the timeline view work the same way? She can't change dates there at all.`,
		owe: `ask the engineering team whether the timeline will get the same controls and let you know by {day}`,
		team: 'the engineering team',
		handover: `Screen reader user at {co} can't move tasks between columns on the board. Can engineering check the keyboard support?`
	}
];

// ---------------------------------------------------------------------------------------------------------
// Shared parts of a conversation.
const stories = [
	`We're about {members} people at {co} and we've used Tallybird since {sinceYear}.`,
	`Some background: I'm the {titleLower} at {co} and I look after our Tallybird workspace, mostly because nobody else wanted to.`,
	`We run all our client work through Tallybird, so this is causing a bit of a headache.`,
	`I'm writing on behalf of {co}; our usual admin is away this week.`,
	`We moved over from {tool} a while ago and on the whole it's been a big improvement.`,
	`Apologies if this is covered somewhere in the help centre; I did look.`,
	`I'm not the most technical person on the team, so please bear with me.`,
	`We've got a busy few weeks coming up, so I'd like to get this sorted soon.`,
	`This is the first time I've had to contact you, so hello!`,
	`We're on {Plan}, in case that matters.`
];
const teamStories = [`We're on the Team plan (it was still called Starter when we signed up).`, `For context, we're on Team, the one that used to be called Starter.`];
const trialStories = [
	`We started a trial a week or so ago to see whether Tallybird could replace {tool}.`,
	`We're {members} people at {co}, trying Tallybird out before we commit.`,
	`I'm setting up the trial for {co} on behalf of our director, so apologies if this is obvious.`
];
const firstGreetings = ['Hi,', 'Hello,', 'Hi there,', 'Hello Tallybird team,', 'Hi support,', 'Good morning,', ''];
const replyGreetings = ['Hi {writer},', '{writer},', '', 'Hi again,', 'Hello {writer},', 'Thanks {writer},'];
const custSignoffs = ['Thanks,\n{first}', 'Many thanks,\n{full}\n{title}, {co}', 'Cheers,\n{first}', 'Best regards,\n{full}\n{title}\n{co}', '{first}', 'Kind regards,\n{full}', 'Thanks in advance,\n{first}'];
const replySignoffs = ['Thanks,\n{first}', '{first}', 'Cheers, {first}', '', 'Thanks again,\n{first}', 'Best,\n{first}'];
const agentGreetings = ['Hi {first},', 'Hello {first},', 'Hi {first}, thanks for writing in.', 'Hi {first}, thanks for getting in touch.'];
const agentGreetingsLater = ['Hi {first},', 'Hello again {first},', 'Hello {first},', 'Hi again {first},', '{first},', 'Hi {first},'];
const agentSignoffs = ['Best,\n{agent}\nTallybird Support', 'Thanks,\n{agent}', 'All the best,\n{agent} | Tallybird Support', 'Cheers,\n{agent}', 'Kind regards,\n{agent}\nTallybird Support', 'Speak soon,\n{agent}'];
const agentIntros = [`Thanks for the clear description; it helps a lot.`, `Sorry for the wait, it's been a busy morning here.`, `Thanks for reaching out about this.`, `Thanks for telling us about this.`];
const holdOns = [`I'll find that and get back to you.`, `I'll dig that out.`, `I'll have to ask a colleague for that, so give me a day or so.`, `Let me find it; it's on the other laptop.`, `I'll look for it.`];
const sideIntrosFirst = [`While I do, another question:`, `In the meantime, something else:`, `Before I forget, a separate thing:`, `Unrelated, but while I have you:`];
const sideIntros = [`Something else has come up as well.`, `Unrelated, but while I have you:`, `One more thing, if you don't mind:`, `Now a different question.`, `And another thing, now I think of it:`];
const mainBacks = [`Back to the first problem:`, `Sorry for the wait on the first problem.`, `On the original problem:`, `About the first thing I asked:`];
const mainBacksGive = [`Now, the thing you asked for earlier.`, `And here's what you asked for about the original issue.`];
const mainBacksLate = [`And on the first problem:`, `Back to the original issue:`, `As for the first thing:`, `One more on the first problem:`];
const willTrys = [`Thanks, that's helpful.`, `Good to know, thanks.`, `Thanks, that makes sense.`, `OK, understood.`, `Thanks for explaining.`];
const quickFirsts = [`First, a quick one.`, `Two things, if I may, the quick one first.`, `A small question first.`];
const mainAfterQuick = [`The main thing, though, is this.`, `The bigger problem is this.`, `Now the real reason I'm writing.`];
const quickLasts = [`One other question while I'm here.`, `Also, a quick one.`, `And a smaller question.`, `Separately, something small.`];
const quickMores = [`And while I think of it, one more.`, `Last one, I promise.`, `Oh, and one more thing.`];
const quickAnswersMore = [`And your last question:`, `Finally:`, `On the other one:`];
const quickAnswersFirst = [`To your first question:`, `The quick one first:`];
const quickAnswersLast = [`On your other question:`, `And to your second question:`, `As for the quick one:`];
const cantFinds = [
	`I've tried, but I can't find that anywhere, sorry. Is there any way you can look at it from your end?`,
	`I don't have access to that; the person who does is away until next week. Can you check on your side in the meantime?`,
	`I've had a look and I'm none the wiser, I'm afraid. It's still happening, though.`,
	`Honestly I wouldn't know where to find that. Could someone just look at our account?`
];
const holdings = [`Thanks, let me look into this properly and come back to you.`, `Thanks for that. I want to check something with a colleague before I answer, so bear with me.`, `Got it, thank you. I'll look at your workspace and come back to you.`];
const notes = [
	`Checked {site} in the admin console: {members} members, {guests} guests, {projects} projects. Nothing unusual in the account history.`,
	`Customer since {sinceYear}; first ticket from them in a while.`,
	`Tried the same thing on our test workspace and couldn't make it happen there.`,
	`Similar question came up last week; the help article doesn't cover it well.`,
	`Customer sounds pressed for time. Prioritising.`,
	`{co} has {members} members on {site}; worth looking after.`
];
const panelNoteLeads = [`Account summary for {site}, as the console shows it:`, `From the admin console:`, `Looked up the account:`];
const invoiceNoteLeads = [`Invoices on {site}, from the admin console:`, `Billing history for {site}:`];
const passLines = [
	`I've passed this to {team}, who can look at {site} more closely than I can. They'll reply on this ticket, so their answer will come to you by email.`,
	`I've asked {team} to take this one, as it needs someone who can see more of your account than I can. They'll pick it up from here and write to you on this ticket.`,
	`This needs {team}, so I've handed it to them with everything above. You'll hear from them on this ticket.`
];
const mateAcks = [`{mate} from {team} here. I've picked this up and will be in touch once I've had a proper look.`, `This is {mate} from {team}. Thanks for your patience; I'm looking at it now and will update you here.`, `{mate} here, from {team}. I've read through the thread and I'm on it.`];
const actLines = [
	`So the next step is on your side: you'll need to {act}. Once that's done it should behave, but reply here if it doesn't.`,
	`From here it's with you: you'll need to {act}. I'll keep the ticket open in case you need anything.`,
	`To sum up, you'll need to {act}. Let me know how you get on.`
];
const willDos = [`OK, I'll do that {when} and let you know.`, `Will do. {memberFirst} has the access, so I'll ask her {when}.`, `Thanks. I'll try that {when}.`, `Understood. I'll get on to it {when}.`];
const whens = ['tomorrow', 'this afternoon', 'on Monday', 'after our team meeting', 'later this week'];
const oweLines = [`Leave that with me. I'll {owe}.`, `Good question. Let me {owe}.`, `I'll {owe}, and I'll keep this ticket open until then.`];
const thanksLines = [`Thanks, I'll look out for it.`, `Great, thank you.`, `Appreciated, thanks.`, `Thanks, speak then.`];
const closings = [`Great to hear. I'll leave it there, but reply to this email if anything comes back.`, `Glad that did it!`, `Brilliant, thanks for letting me know.`, `Good news. Have a good rest of the week.`, `Perfect. I'll close this one, but you can reply here any time.`];
const sideCloses = [`Glad that's working.`, `Good to hear that one's sorted.`, `Great, one down.`];
const stillNeeds = [`When you have a moment, I still need {need} to get any further with your first question.`, `On the original problem, I'm still waiting for {need}; I'll pick it up as soon as it arrives.`];
const nudges1 = [`Just checking in. When you have a moment, I still need {need} to get any further. I'll pick it up as soon as it arrives.`, `Following up on my last message: could you send me {need}? No rush, I just want to make sure it didn't get buried.`, `I don't want this to fall through the cracks. If you can send me {need}, I can carry on from there.`];
const nudges2 = [`I haven't heard back, so I'll assume things are fine for now. If it's still a problem, reply here with {need} and I'll take it from there.`, `One last nudge from me. Whenever you're ready, reply to this email and the ticket comes back to me with everything above.`];
const chatHellos = [`Hi {first}, I'm {agent} from Tallybird Support. Let me read your message.`, `Hello {first}, {agent} here. Thanks for waiting.`, `Hi {first}! {agent} from support. Give me a second to catch up on what you wrote.`];
const chatHandoffs = [`I'll leave this ticket open, so you can reply to the email copy of this chat with anything else.`, `If anything else comes up, reply to the email copy of this chat and it comes straight back to me.`];
const vagueSubjects = ['Help please', 'A couple of questions', 'Question about our account', 'Problem', '(no subject)', 'Re: Your Tallybird receipt', 'Quick question', 'Urgent', 'Following up', 'Tallybird'];

const fill = (text: string, s: Slots): string =>
	text.replace(/\{(\w+)\}/g, (_, key: string) => {
		if (!(key in s)) throw new Error(`no slot {${key}} in: ${text.slice(0, 80)}`);
		return s[key]!;
	});
const firstSentence = (text: string) => (text.match(/^.*?[.?!](?=\s|$)/)?.[0] ?? text).trim();
const ordinal = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th'}`;

// ---------------------------------------------------------------------------------------------------------
// One ticket.
type Who = 'c' | 'a' | 'm' | 'note';
type Gap = 'c' | 'a' | 'note' | 'mate' | 'nudge';
interface Msg {
	who: Who;
	gap: Gap;
	parts: string[];
	art?: Art;
	/** The part the artifact follows. */
	artAt?: number;
	/** No greeting and no sign-off. */
	bare?: boolean;
}

const totalWeight = topics.reduce((sum, topic) => sum + topic.weight, 0);
const weighted = (r: Rand) => {
	let left = r() * totalWeight;
	for (const topic of topics) if ((left -= topic.weight) < 0) return topic;
	return topics.at(-1)!;
};
const gapMinutes = (r: Rand, gap: Gap) => {
	switch (gap) {
		case 'c':
			return chance(r, 0.15) ? int(r, 1800, 4300) : int(r, 40, 1400);
		case 'a':
			return int(r, 15, 300);
		case 'note':
			return int(r, 5, 120);
		case 'mate':
			return int(r, 180, 2400);
		case 'nudge':
			return int(r, 4320, 7200);
	}
};
/** Moves a time forward into support's hours: 08:00 to 18:00, Monday to Saturday, or Monday to Friday. */
const workHours = (ms: number, weekdays = false) => {
	let t = ms;
	for (;;) {
		const d = utc(t);
		const hour = d.getUTCHours();
		if (d.getUTCDay() === 0 || (weekdays && d.getUTCDay() === 6) || hour >= 18) t = midnight(t) + DAY + 8 * HOUR + (t % HOUR);
		else if (hour < 8) t = midnight(t) + 8 * HOUR + (t % HOUR);
		else return t;
	}
};
/** Customers write between 07:00 and 22:59. */
const customerHours = (ms: number) => {
	const hour = utc(ms).getUTCHours();
	if (hour < 7) return midnight(ms) + 7 * HOUR + (ms % HOUR);
	if (hour >= 23) return midnight(ms) + DAY + 7 * HOUR + (ms % HOUR);
	return ms;
};

const ticket = (index: number): [string, string] => {
	const r = mulberry32(0x7a11b1d0 + index * 104729);
	const number = 7300 + index * 3 + ((index * 7) % 3);
	const openDay = openDays[Math.floor((index * openDays.length) / ITEMS)]!;
	const fits = (topic: Topic) => !topic.minDay || utc(openDay).getUTCDate() >= topic.minDay;
	let main = weighted(r);
	while (!fits(main)) main = weighted(r);
	const plan = pick(r, main.plans);
	const P = PLAN[plan];
	let outcome = pick(r, ['resolved', 'resolved', 'resolved', 'owe', 'owe', 'act', 'act', 'team', 'team', 'quiet', 'quiet'] as Outcome[]);
	if (main.outcomes && !main.outcomes.includes(outcome)) outcome = pick(r, main.outcomes);
	const viaTeam = outcome !== 'team' && outcome !== 'quiet' && chance(r, 0.22);
	const partial = outcome === 'team' || outcome === 'quiet' || viaTeam;
	const channel = pick(r, ['email', 'email', 'email', 'chat', 'chat', 'web form'] as const);

	// Other matters the customer raises: a quick question, and up to three smaller matters discussed in full.
	const used = new Set<Topic>([main]);
	const sideOk = (topic: Topic) => (!topic.org || topic.org === main.org) && !topic.mainOnly && !topic.trial && fits(topic) && topic.plans.includes(plan) && ![...used].some((other) => other.area === topic.area);
	const takeSide = () => {
		const pool = topics.filter(sideOk);
		if (!pool.length) return undefined;
		const topic = pick(r, pool);
		used.add(topic);
		return topic;
	};
	const quick = chance(r, 0.6) ? takeSide() : undefined;
	const quick2 = quick && chance(r, 0.35) ? takeSide() : undefined;
	const fullCount = partial ? pick(r, [1, 2, 2, 3, 3]) : pick(r, [1, 1, 2, 2, 3, 3]);
	const sides = Array.from({ length: fullCount }, () => takeSide()).filter((topic): topic is Topic => !!topic);
	const sidesEarly = partial || chance(r, 0.45);

	// Who and where.
	const female = chance(r, 0.5);
	const first = pick(r, female ? firstF : firstM);
	const last = pick(r, surnames);
	const head = pick(r, heads);
	const tail = pick(r, main.org ?? tails);
	const co = `${head} ${tail}`;
	const slug = (head + tail.split(' ')[0]).toLowerCase();
	const domain = `${slug}.example`;
	const site = `${slug}.tallybird.app`;
	const agent = pick(r, agents);
	const memberFirst = pick(r, firstF.filter((name) => name !== first));
	const exFirst = pick(r, firstM.filter((name) => name !== first));
	const dirFirst = pick(r, [...firstF, ...firstM].filter((name) => ![first, memberFirst, exFirst].includes(name)));
	const title = pick(r, titles);
	const project = pick(r, projectNames);
	const [city, tz] = pick(r, cities);
	const [country, register] = pick(r, registers);
	const key = pick(r, keys);
	const [appver, appfix] = openDay < Date.UTC(2026, 9, 19) ? ['5.7.0', '5.7.1'] : ['5.8.0', '5.8.2'];
	const rows = int(r, 120, 900);

	// The account.
	const customerId = int(r, 1100, 9400);
	const trial = !!main.trial;
	const signedMs = trial ? openDay - int(r, 10, 13) * DAY + int(r, 8 * 60, 19 * 60) * MIN : Date.UTC(2022, 0, 3) + int(r, 0, 1640) * DAY + int(r, 7 * 60, 21 * 60) * MIN;
	const trialEnd = signedMs + 14 * DAY;
	const projects =
		main.projects === 'two' ? 2 : main.projects === 'full' ? 3 : main.projects === 'over' ? int(r, 24, 49) : main.projects === 'room' ? int(r, 1, P.limit - 1) : trial ? int(r, 1, 6) : plan === 'free' ? int(r, 1, 3) : plan === 'team' ? int(r, 2, 19) : int(r, 6, 48);
	const members = int(r, 3, 140);
	const guests = int(r, 0, 15);
	const billed = plan !== 'free' || main.projects === 'two';
	const cents = plan === 'free' ? 2900 : P.cents;
	const latestOpened = main.projects === 'two' ? firstOfMonth(openDay - 4 * DAY) : firstOfMonth(openDay - DAY);
	const owing = [main, ...sides].some((topic) => topic.unpaid);
	const unpaidCount = owing ? (main === topics[0] && chance(r, 0.3) ? 2 : 1) : 0;
	const failed = owing && (main === topics[0] || sides.includes(topics[0]!)) ? unpaidCount * int(r, 2, 3) : 0;
	const invoiceId = (opened: number) => `TB-${utc(opened).getUTCFullYear()}${pad(utc(opened).getUTCMonth() + 1)}-${customerId}`;
	const monthBack = (k: number) => Date.UTC(utc(latestOpened).getUTCFullYear(), utc(latestOpened).getUTCMonth() - k, 1);
	const friday = (() => {
		let t = openDay - 7 * DAY;
		while (utc(t).getUTCDay() !== 5) t -= DAY;
		return t;
	})();
	const due = openDay + int(r, 16, 26) * DAY;
	const delDayNumber = int(r, 2, 3);
	const stopMs = openDay - int(r, 8, 13) * DAY;

	const s: Slots = {
		first,
		last,
		full: `${first} ${last}`,
		email: `${first.toLowerCase()}@${domain}`,
		co,
		slug,
		domain,
		site,
		site2: `${slug}-${pick(r, ['team', 'hq', 'office', 'projects'])}.tallybird.app`,
		agent,
		plan,
		Plan: P.label,
		limit: String(P.limit),
		projects: String(projects),
		members: String(members),
		guests: String(guests),
		amount: money(cents),
		inv: billed ? invoiceId(latestOpened) : 'none',
		title,
		titleLower: lowerFirst(title),
		sinceYear: String(utc(signedMs).getUTCFullYear()),
		signedMs: String(signedMs),
		tool: pick(r, tools),
		project,
		projectSlug: `${project.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${int(r, 100, 999)}`,
		task: pick(r, taskNames),
		task2: pick(r, taskNames),
		task3: pick(r, taskNames),
		reader: pick(r, ['NVDA', 'JAWS', 'VoiceOver']),
		memberFirst,
		member: `${memberFirst} ${pick(r, surnames)}`,
		memberEmail: `${memberFirst.toLowerCase()}@${domain}`,
		exFirst,
		exFull: `${exFirst} ${pick(r, surnames)}`,
		dirFull: `${dirFirst} ${pick(r, surnames)}`,
		dirEmail: `${dirFirst.toLowerCase()}@${domain}`,
		city,
		tz,
		dueDay: fullDay(due),
		dueIso: iso(due),
		idp: pick(r, idps),
		browser: pick(r, browsers),
		device: pick(r, iphones),
		appver,
		appfix,
		card4: String(int(r, 1000, 9999)),
		card4new: String(int(r, 1000, 9999)),
		ref: pick(r, ['TALLYBIRD', 'Tallybird subscription', `${head.toUpperCase()} SOFTWARE`, `Invoice ${MONL[utc(latestOpened).getUTCMonth()]}`, 'Project tool']),
		paidDay: dayMonth(Math.max(latestOpened + DAY, openDay - int(r, 9, 12) * DAY)),
		regno: register(r),
		country,
		hours: String(int(r, 380, 720)),
		people: String(int(r, 5, 12)),
		rate: String(int(r, 300, 520)),
		pages: String(int(r, 400, 1600)),
		rows: String(rows),
		skipped: String(Math.round(rows * (0.4 + r() * 0.15))),
		big: String(int(r, 900, 4200)),
		farYear: pick(r, ['2062', '2206', '2052', '2125']),
		startDay: fullDay(friday),
		stopDay2: fullDay(friday + 3 * DAY),
		stopDay: fullDay(stopMs),
		stopMs: String(stopMs),
		channel: pick(r, channelsSlack),
		repo: pick(r, repos),
		key,
		keyLower: key.toLowerCase(),
		num: String(int(r, 100, 480)),
		num2: String(int(r, 100, 480)),
		guestEmail: `${pick(r, firstF).toLowerCase()}.${pick(r, surnames).toLowerCase()}@${pick(r, ['clientco', 'harbourgroup', 'brightworks', 'meridianhomes', 'lumenhealth'])}.example`,
		sharedAddr: `${pick(r, ['info', 'hello', 'office', 'requests', 'studio'])}@${domain}`,
		month: MONL[utc(latestOpened).getUTCMonth()]!,
		expMonth: MONL[utc(monthBack(1)).getUTCMonth()]!,
		month2: (() => {
			const ms = openDay - int(r, 60, 300) * DAY;
			return `${MONL[utc(ms).getUTCMonth()]} ${utc(ms).getUTCFullYear()}`;
		})(),
		delDay: ordinal(delDayNumber),
		downDay: dayMonth(latestOpened + delDayNumber * DAY),
		newEnd: fullDay(trialEnd + 14 * DAY),
		reason: pick(r, reasons),
		pm: `${pad(int(r, 13, 17))}:${pad(int(r, 0, 59))}`,
		nowMs: '0',
		writer: agent
	};
	s.need = fill(main.need, s);
	s.act = fill(main.act, s);
	s.team = main.team;
	s.mate = teamPeople[main.team];

	// The conversation, as a script; times and words are filled in afterwards.
	const msgs: Msg[] = [];
	let speaker: Who = 'a';
	const push = (who: Who, gap: Gap, parts: string[], art?: Art, bare = false) =>
		msgs.push({ who, gap, parts: parts.filter(Boolean), art, artAt: art ? parts.filter(Boolean).length - 1 : undefined, bare });
	const cust = (parts: string[], art?: Art, bare = false) => push('c', 'c', parts, art, bare);
	const talk = (parts: string[], art?: Art, gap: Gap = 'a') => push(speaker, gap, parts, art);
	const turn = ([words, answer, art, byAgent]: Turn, lead: string[] = []) => {
		cust([...lead, words], byAgent ? undefined : art);
		talk([answer], byAgent ? art : undefined);
	};
	const sideBlock = (side: Topic, lead: string[]) => {
		cust([...lead, pick(r, side.open)]);
		talk([side.reply]);
		turn(side.turns[0]!);
		turn(side.turns[1]!);
		if (chance(r, 0.5)) turn(side.snag);
		if (side.turns[2] && chance(r, 0.85)) turn(side.turns[2]);
		if (side.turns[3] && chance(r, 0.6)) turn(side.turns[3]);
		return pick(r, side.fixed);
	};
	/** Runs the side matters one after another; returns the customer's last words about the last one. */
	const runSides = (list: Topic[], lead: string[]) => {
		let next = lead;
		list.forEach((side, i) => {
			next = [sideBlock(side, [...next, pick(r, i === 0 && lead.length && holdOns.includes(lead[0]!) ? sideIntrosFirst : sideIntros)])];
		});
		return next;
	};

	// The opening and the first reply.
	const subjectFrom = quick && chance(r, 0.22) ? 'quick' : chance(r, 0.18) ? 'vague' : 'main';
	const subject = fill(subjectFrom === 'quick' ? pick(r, quick!.subjects) : subjectFrom === 'vague' ? pick(r, vagueSubjects) : pick(r, main.subjects), s);
	const opening: string[] = [];
	if (quick && subjectFrom === 'quick') opening.push(`${pick(r, quickFirsts)} ${quick.quick[0]}`, `${pick(r, mainAfterQuick)} ${pick(r, main.open)}`);
	else opening.push(pick(r, main.open), ...(quick ? [`${pick(r, quickLasts)} ${quick.quick[0]}`] : []));
	if (quick2) opening.push(`${pick(r, quickMores)} ${quick2.quick[0]}`);
	if (chance(r, 0.55)) opening.splice(chance(r, 0.65) ? 0 : 1, 0, pick(r, trial ? trialStories : plan === 'team' && chance(r, 0.3) ? teamStories : stories));
	cust(opening);
	const reply: string[] = chance(r, 0.5) ? [pick(r, agentIntros)] : [];
	if (quick && subjectFrom === 'quick') reply.push(`${pick(r, quickAnswersFirst)} ${quick.quick[1]}`, main.reply);
	else reply.push(main.reply, ...(quick ? [`${pick(r, quickAnswersLast)} ${quick.quick[1]}`] : []));
	if (quick2) reply.push(`${pick(r, quickAnswersMore)} ${quick2.quick[1]}`);
	talk(reply);
	const panelInNote = chance(r, 0.3);
	const panel = () =>
		table(
			['Field', 'Value'],
			[
				['Customer', `#${customerId}`],
				['Email', s.email!],
				['Plan', plan],
				['Signed up', dayMonthYear(signedMs)],
				[trial ? 'Trial ends' : 'Trial ended', dayMonthYear(trialEnd)],
				['Projects', String(projects)],
				['Unpaid invoices', String(unpaidCount)],
				['Unpaid', money(unpaidCount * cents)],
				['Failed payment attempts', String(failed)],
				['Members', `${members}, and ${guests} ${guests === 1 ? 'guest' : 'guests'}`]
			]
		);
	const invoices = (rr: Rand) =>
		table(
			['Invoice', 'Amount', 'Opened', 'Due', 'Paid', 'Failed attempts'],
			[2, 1, 0].map((k) => {
				const opened = monthBack(k);
				const unpaid = k < unpaidCount;
				const tries = unpaid && failed ? String(failed / unpaidCount) : '0';
				return [invoiceId(opened), money(cents), dayMonth(opened), dayMonth(opened + 14 * DAY), unpaid ? 'not paid' : dayMonth(opened + int(rr, 0, 3) * DAY), tries];
			})
		);
	if (panelInNote) push('note', 'note', [pick(r, panelNoteLeads)], () => panel());
	else if (chance(r, 0.3)) push('note', 'note', [pick(r, notes)]);
	if (billed && [...used].some((topic) => topic.area === 'billing') && chance(r, 0.6)) push('note', 'note', [pick(r, invoiceNoteLeads)], (rr) => invoices(rr));

	if (outcome === 'quiet') {
		if (sides.length) {
			cust(runSides(sides, [pick(r, holdOns)]));
			talk([pick(r, sideCloses), pick(r, stillNeeds)]);
		} else {
			cust([pick(r, holdOns)], undefined, true);
			talk([pick(r, nudges1)], undefined, 'nudge');
		}
		talk([pick(r, nudges2)], undefined, 'nudge');
	} else {
		const early = sidesEarly ? sides : [];
		const later = sidesEarly ? [] : sides;
		const lead = early.length ? [...runSides(early, [pick(r, holdOns)]), pick(r, outcome === 'team' || chance(r, 0.6) ? mainBacks : mainBacksGive)] : [];
		const [words0, answer0, art0, byAgent0] = main.turns[0]!;
		if (outcome === 'team') cust([...lead, pick(r, cantFinds)]);
		else cust([...lead, words0], byAgent0 ? undefined : art0);
		if (outcome === 'team' || viaTeam) {
			talk([pick(r, holdings)]);
			push('note', 'note', [main.handover]);
			talk([pick(r, passLines)], undefined, 'note');
			push('m', 'mate', [pick(r, mateAcks)]);
			if (outcome === 'team') {
				if (chance(r, 0.5)) cust([pick(r, thanksLines)], undefined, true);
			} else {
				speaker = 'm';
				talk([answer0], byAgent0 ? art0 : undefined, 'mate');
				speaker = 'a';
			}
		} else talk([answer0], byAgent0 ? art0 : undefined);
		if (outcome !== 'team') {
			turn(main.turns[1]!);
			if ((outcome === 'resolved' || outcome === 'owe') && chance(r, 0.55)) turn(main.snag);
			let carry: string[] = later.length ? runSides(later, [pick(r, willTrys)]) : [];
			for (const extra of main.turns.slice(2))
				if (chance(r, 0.85)) {
					turn(extra, carry.length ? [...carry, pick(r, mainBacksLate)] : []);
					carry = [];
				}
			const back = carry.length ? [...carry, pick(r, mainBacksLate)] : [];
			if (outcome === 'resolved') {
				cust([...back, pick(r, main.fixed)]);
				talk([pick(r, closings)]);
			} else if (outcome === 'owe') {
				cust([...back, pick(r, main.fixed), main.follow]);
				talk([pick(r, oweLines).replace('{owe}', main.owe)]);
				cust([pick(r, thanksLines)], undefined, true);
			} else {
				if (carry.length) {
					cust(carry);
					talk([pick(r, sideCloses), pick(r, actLines)]);
				} else msgs.at(-1)!.parts.push(pick(r, actLines));
				cust([pick(r, willDos)]);
			}
		}
	}

	// Times: squeeze the gaps until the last message is before the limit.
	const openMs = openDay + (channel === 'chat' ? int(r, 8 * 60, 17 * 60) : int(r, 7 * 60 + 30, 21 * 60)) * MIN;
	let times: number[] = [];
	for (let pace = 1; ; pace *= 0.75) {
		const rt = mulberry32(0x51ab0000 + index * 7919);
		times = [];
		let t = openMs;
		msgs.forEach((msg, i) => {
			if (i > 0) {
				const minutes = channel === 'chat' && i === 1 ? int(rt, 1, 3) : Math.max(1, Math.round(gapMinutes(rt, msg.gap) * pace)) + (channel === 'chat' && i === 2 ? 15 : 0);
				t += minutes * MIN;
				t = msg.who === 'c' ? customerHours(t) : msg.who === 'm' ? workHours(t, true) : workHours(t);
			}
			times.push(t);
		});
		if (t < LIMIT || pace < 0.05) break;
	}

	// Words.
	const out: string[] = [`# Ticket ${number}: ${subject}`, ''];
	out.push(
		table(
			['Field', 'Value'],
			[
				['Opened', `${stamp(times[0]!)}, by ${channel}`],
				['From', `${s.full} <${s.email}>`],
				['Company', co],
				['Workspace', `https://${site}`]
			]
		),
		''
	);
	if (chance(r, 0.3)) {
		const earlier = Array.from({ length: int(r, 1, 3) }, () => int(r, 20, 300)).sort((a, b) => b - a);
		const fitting = topics.filter((topic) => topic.plans.includes(plan) && !topic.mainOnly && !topic.org && topic !== main);
		const rowsEarlier = earlier.map((daysAgo) => [String(number - daysAgo * 19 - int(r, 0, 15)), dayMonthYear(openDay - daysAgo * DAY), fill(pick(r, pick(r, fitting).subjects), s)]);
		out.push('### Earlier tickets', '', table(['Ticket', 'Opened', 'Subject'], rowsEarlier), '');
	}
	if (!panelInNote) out.push('### Account, from the admin console', '', panel(), '');
	out.push('## Conversation', '');

	let agentSpoke = false;
	let customerSpoke = false;
	let lastAnswer = '';
	const frame = (msg: Msg, paras: string[]) => {
		if (msg.bare || msg.who === 'note') return paras;
		if (msg.who === 'c') {
			const greeting = fill(pick(r, customerSpoke ? replyGreetings : firstGreetings), s);
			const signoff = fill(pick(r, customerSpoke ? replySignoffs : custSignoffs), s);
			const quoted = firstSentence(lastAnswer);
			const quote = customerSpoke && quoted.length >= 45 && chance(r, 0.25) ? [`> ${quoted}`] : [];
			return [greeting, ...quote, ...paras, signoff].filter(Boolean);
		}
		if (msg.who === 'm') return [`${pick(r, ['Hi', 'Hello'])} ${first},`, ...paras, `${s.mate}\n${main.team.replace('the ', '').replace(/^./, (c) => c.toUpperCase())}, Tallybird`];
		const greeting = fill(pick(r, agentSpoke ? agentGreetingsLater : agentGreetings), s);
		return [greeting, ...paras, fill(pick(r, agentSignoffs), s)];
	};
	const words = (msg: Msg) => {
		const paras = msg.parts.map((part) => fill(part, s));
		if (msg.art) paras.splice(msg.artAt! + 1, 0, msg.art(r, s));
		return paras;
	};
	const heading = (msg: Msg, ms: number) =>
		msg.who === 'c'
			? `### ${s.full} · ${stamp(ms)}`
			: msg.who === 'a'
				? `### ${agent} (Tallybird Support) · ${stamp(ms)}`
				: msg.who === 'm'
					? `### ${s.mate} (${main.team.replace('the ', '')}) · ${stamp(ms)}`
					: `### Internal note by ${agent} · ${stamp(ms)}`;

	msgs.forEach((msg, i) => {
		s.nowMs = String(times[i]);
		s.day = fullDay(workdayAfter(times[i]!, int(r, 2, 4)));
		s.when = pick(r, whens);
		if (i === 0 && channel === 'chat') {
			const reply = msgs[1]!;
			const lines = [`### Chat with ${agent} · ${stamp(times[0]!)}`, ''];
			let t = times[0]!;
			for (const para of words(msg)) {
				lines.push(`**${clock(t)} ${first}:** ${para}`, '');
				t += int(r, 0, 1) * MIN;
			}
			t = times[1]!;
			lines.push(`**${clock(t)} ${agent}:** ${fill(pick(r, chatHellos), s)}`, '');
			for (const para of words(reply)) {
				t += int(r, 1, 3) * MIN;
				lines.push(`**${clock(t)} ${agent}:** ${para}`, '');
			}
			t += int(r, 1, 4) * MIN;
			lines.push(`**${clock(t)} ${agent}:** ${fill(pick(r, chatHandoffs), s)}`, '');
			out.push(...lines);
			customerSpoke = agentSpoke = true;
			lastAnswer = reply.parts.at(-1) ?? '';
			return;
		}
		if (i === 1 && channel === 'chat') return;
		if (i === 0 && channel === 'web form') {
			out.push(`### Web form · ${stamp(times[0]!)}`, '', table(['Field', 'Value'], [['Name', s.full!], ['Email', s.email!], ['Workspace', site], ['Subject', subject]]), '', ...words(msg).flatMap((para) => [para, '']));
			customerSpoke = true;
			return;
		}
		const paras = frame(msg, words(msg));
		out.push(heading(msg, times[i]!), '', ...paras.flatMap((para) => [para, '']));
		if (msg.who === 'c') customerSpoke = true;
		if (msg.who === 'a' || msg.who === 'm') {
			s.writer = msg.who === 'm' ? s.mate! : agent;
			agentSpoke = true;
			lastAnswer = fill(msg.parts.find((part) => part.length > 60) ?? msg.parts[0] ?? '', s);
		}
	});
	return [`${number}.md`, out.join('\n').trimEnd() + '\n'];
};

// ---------------------------------------------------------------------------------------------------------
const folder = join(root, 'support', 'tickets');
mkdirSync(folder, { recursive: true });
for (let index = 0; index < ITEMS; index++) {
	const [name, text] = ticket(index);
	writeFileSync(join(folder, name), text);
}
