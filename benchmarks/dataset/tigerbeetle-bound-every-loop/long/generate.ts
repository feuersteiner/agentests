// Writes the long material of this entry's long task: the tickets that Brindle support escalated to the data team
// between 1 September and 13 November 2026, one Markdown file each, under support/escalations/, as the help desk
// exported them, without tags or statuses. Deterministic: fixed seeds, no clock, no network.
//   bun long/generate.ts <workspace root>
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** How many tickets to write. Dates, ticket numbers and the share of each topic all follow from it. */
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
type Slots = Record<string, string>;
const int = (r: Rand, low: number, high: number) => low + Math.floor(r() * (high - low + 1));
const pick = <T>(r: Rand, items: readonly T[]): T => items[Math.floor(r() * items.length)]!;
const chance = (r: Rand, p: number) => r() < p;
const pad = (value: number) => String(value).padStart(2, '0');
const num = (value: number) => String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);

// ---------------------------------------------------------------------------------------------------------------
// Dates. Everything happens in 2026, before the help desk export on 20 November.
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WDL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const at = (ms: number) => new Date(ms);
const stamp = (ms: number) =>
	`${WD[at(ms).getUTCDay()]} ${at(ms).getUTCDate()} ${MON[at(ms).getUTCMonth()]} 2026, ${pad(at(ms).getUTCHours())}:${pad(at(ms).getUTCMinutes())}`;
const clock = (ms: number) => `${pad(at(ms).getUTCHours())}:${pad(at(ms).getUTCMinutes())}`;
const dayMonth = (ms: number) => `${at(ms).getUTCDate()} ${MONL[at(ms).getUTCMonth()]}`;
const shortDay = (ms: number) => `${at(ms).getUTCDate()} ${MON[at(ms).getUTCMonth()]}`;
const fullDay = (ms: number) => `${WDL[at(ms).getUTCDay()]} ${dayMonth(ms)}`;
const isoDate = (ms: number) => at(ms).toISOString().slice(0, 10);
const isoUtc = (ms: number) => `${at(ms).toISOString().slice(0, 19)}Z`;
const midnight = (ms: number) => ms - (ms % DAY);
const FIRST_DAY = Date.UTC(2026, 8, 1);
const LAST_DAY = Date.UTC(2026, 10, 13);
const LAST_ACTIVITY = Date.UTC(2026, 10, 19, 17, 30);
const EU_WINTER = Date.UTC(2026, 9, 25, 1, 0);
const US_WINTER = Date.UTC(2026, 10, 1, 6, 0);
const AU_SUMMER = Date.UTC(2026, 9, 3, 16, 0);
const STORE_MOVE = Date.UTC(2026, 4, 14);
const openDays: number[] = [];
for (let day = FIRST_DAY; day <= LAST_DAY; day += DAY) if (at(day).getUTCDay() % 6 !== 0) openDays.push(day);

/** Minutes east of UTC for a zone on a given moment. */
const offsetMinutes = (zone: string, ms: number) => {
	if (zone === 'Europe/London' || zone === 'Europe/Dublin') return ms < EU_WINTER ? 60 : 0;
	if (zone.startsWith('Europe/')) return ms < EU_WINTER ? 120 : 60;
	if (zone === 'America/New_York') return ms < US_WINTER ? -240 : -300;
	if (zone === 'America/Chicago') return ms < US_WINTER ? -300 : -360;
	return ms < AU_SUMMER ? 600 : 660;
};
const offsetText = (minutes: number) => `${minutes < 0 ? '-' : '+'}${pad(Math.floor(Math.abs(minutes) / 60))}:${pad(Math.abs(minutes) % 60)}`;
const localIso = (ms: number, minutes: number) => `${at(ms + minutes * MIN).toISOString().slice(0, 19)}${offsetText(minutes)}`;

// ---------------------------------------------------------------------------------------------------------------
// People, companies and places.
const firstF = ['Ana', 'Brigid', 'Chiara', 'Delphine', 'Elif', 'Frances', 'Greta', 'Hannah', 'Ilse', 'Jolene', 'Katrin', 'Lotte', 'Maeve', 'Nadine', 'Olivia', 'Paloma', 'Rosa', 'Saoirse', 'Tamara', 'Ursula', 'Vera', 'Wiebke', 'Yasmin', 'Zoe'];
const firstM = ['Aidan', 'Bastian', 'Cormac', 'Dmitri', 'Emil', 'Florian', 'Gideon', 'Hamish', 'Ivo', 'Javier', 'Kieran', 'Lennart', 'Mateus', 'Niall', 'Oskar', 'Pieter', 'Quentin', 'Rory', 'Stellan', 'Teodor', 'Uwe', 'Vincent', 'Wilbur', 'Xavier'];
const surnames = ['Achterberg', 'Brennan', 'Castellano', 'Dunmore', 'Eriksen', 'Fitzgerald', 'Grünewald', 'Hargreaves', 'Ibáñez', 'Jansen', 'Kowalski', 'Lindqvist', 'McAllister', 'Nakashima', "O'Driscoll", 'Petrakis', 'Quigley', 'Rademacher', 'Sorensen', 'Thackeray', 'Ulrich', 'Van der Berg', 'Whitcombe', 'Yilmaz', 'Zielinski', 'Abernethy', 'Bonnington', 'Carvalho'];
const heads = ['Larchmont', 'Pellow', 'Quayside', 'Thornbury', 'Saltmarsh', 'Kittiwake', 'Hollowell', 'Brackenridge', 'Mistral', 'Oakhaven', 'Fernleaf', 'Copperfield', 'Wickham', 'Tidewater', 'Ravenscar', 'Starling', 'Merrow', 'Ashdown', 'Glenmore', 'Penhallow', 'Lantern', 'Bluebell', 'Harrowgate', 'Cobblestone'];
const tails = ['Outfitters', 'Coffee Roasters', 'Books', 'Home', 'Cycles', 'Pet Supplies', 'Kitchenware', 'Wines', 'Outdoor', 'Toys', 'Garden Centre', 'Fashion', 'Pharmacy', 'Tea Company', 'Interiors', 'Sports', 'Bakeries', 'Optics', 'Music', 'Crafts'];
const titles = ['Head of growth', 'Marketing lead', 'Analytics manager', 'Head of e-commerce', 'Data analyst', 'Digital director', 'Operations manager', 'Founder', 'CRM manager', 'Head of digital', 'Product owner', 'Insight lead', 'E-commerce manager', 'Finance manager'];
const supportAgents = ['Ines', 'Tobias', 'Wren', 'Dara', 'Mikkel', 'Oona', 'Bisi', 'Callum'];
const engineers = ['Marek', 'Hollie', 'Yusuf', 'Signe', 'Rhian'];
const teamPeople: Record<string, string> = {
	'the Metrics API team': 'Tamsin',
	'the dashboards team': 'Pilar',
	'the SDK team': 'Arjun',
	'the billing team': 'Corinne',
	'the privacy team': 'Ottilie'
};
const agencies = ['Fieldhouse Digital', 'Northbeam Studio', 'Copperline', 'Wavelength Web', 'Pinecone Labs', 'Brightwater Agency'];
const tills = ['TillPoint 6', 'Kassa Pro', 'RetailOne Classic', 'ShopDesk 2010'];
const consentTools = ['CookieShield', 'Consentry', 'OptBanner', 'PrivaGate'];
const templates = ['sales-template.csv', 'Book1.csv', 'weekly-sales-TEMPLATE.csv', 'blank-upload.csv'];
const newKinds = ['refund', 'subscription_cancelled', 'trial_start', 'wishlist_add', 'review_posted', 'gift_card_redeemed'];
const plans = ['Starter', 'Growth', 'Growth', 'Scale'];
const accountManagers = ['Bram', 'Leila', 'Fergus'];
const salesNames = ['sales', 'store-sales', 'pos-transactions', 'online-orders', 'wholesale-orders', 'shop-orders'];
const uploadNames = ['sales', 'store-sales', 'pos-transactions', 'online-orders', 'returns', 'footfall', 'ad-spend', 'newsletter-signups', 'loyalty-members', 'wholesale-orders'];

interface Country {
	name: string;
	zone: string;
	cur: string;
	cur2: string;
	country2: string;
	lang?: string;
	tld: string;
}
const countries: Country[] = [
	{ name: 'the UK', zone: 'Europe/London', cur: '£', cur2: '€', country2: 'Ireland', tld: 'co.uk.example' },
	{ name: 'Ireland', zone: 'Europe/Dublin', cur: '€', cur2: '£', country2: 'Northern Ireland', tld: 'ie.example' },
	{ name: 'Germany', zone: 'Europe/Berlin', cur: '€', cur2: 'CHF ', country2: 'Switzerland', lang: 'German', tld: 'de.example' },
	{ name: 'the Netherlands', zone: 'Europe/Amsterdam', cur: '€', cur2: '£', country2: 'the UK', lang: 'Dutch', tld: 'nl.example' },
	{ name: 'Spain', zone: 'Europe/Madrid', cur: '€', cur2: '£', country2: 'Gibraltar', lang: 'Spanish', tld: 'es.example' },
	{ name: 'the US', zone: 'America/New_York', cur: '$', cur2: 'C$', country2: 'Canada', tld: 'com.example' },
	{ name: 'the US', zone: 'America/Chicago', cur: '$', cur2: 'C$', country2: 'Canada', tld: 'com.example' },
	{ name: 'Australia', zone: 'Australia/Sydney', cur: 'A$', cur2: 'NZ$', country2: 'New Zealand', tld: 'com.au.example' }
];
const EUROPE = ['the UK', 'Ireland', 'Germany', 'the Netherlands', 'Spain'];
const CONTINENTAL = ['Germany', 'the Netherlands', 'Spain'];
const OFFSET_NOT_ZERO = ['Germany', 'the Netherlands', 'Spain', 'the US', 'Australia'];

// ---------------------------------------------------------------------------------------------------------------
// Pasted output.
const table = (head: string[], rows: string[][]) =>
	[`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`, ...rows.map((row) => `| ${row.join(' | ')} |`)].join('\n');
const fence = (lines: string[]) => ['```', ...lines, '```'].join('\n');
/** sqlite3 -column style output. */
const columns = (head: string[], rows: string[][]) => {
	const widths = head.map((title, i) => Math.max(title.length, ...rows.map((row) => row[i]!.length)));
	const line = (cells: string[]) => cells.map((cell, i) => cell.padEnd(widths[i]!)).join('  ').trimEnd();
	return [line(head), widths.map((w) => '-'.repeat(w)).join('  '), ...rows.map(line)];
};
const sqlite = (s: Slots, query: string, head: string[], rows: string[][]) =>
	fence([`$ sqlite3 -header -column stores/${s.ws}.db "${query}"`, ...columns(head, rows)]);
const hexdump = (bytes: number[]) => {
	const lines: string[] = [];
	for (let offset = 0; offset < bytes.length; offset += 16) {
		const chunk = bytes.slice(offset, offset + 16);
		const hex: string[] = [];
		for (let i = 0; i < chunk.length; i += 2) hex.push(chunk.slice(i, i + 2).map((b) => b.toString(16).padStart(2, '0')).join(''));
		const text = chunk.map((b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : '.')).join('');
		lines.push(`${offset.toString(16).padStart(8, '0')}: ${hex.join(' ').padEnd(39)}  ${text}`);
	}
	return lines;
};
const daysBefore = (s: Slots, from: number, count: number) => Array.from({ length: count }, (_, i) => Number(s.openMs) - (from + count - 1 - i) * DAY);
/** Days around day1, from four days before it, but not after the day before the message. */
const around = (s: Slots, count: number) => {
	const start = Math.min(Number(s.day1Ms) - 4 * DAY, midnight(Number(s.openMs)) - count * DAY);
	return Array.from({ length: count }, (_, i) => start + i * DAY);
};
const kindsBase = ['view', 'click', 'search', 'add_to_cart', 'purchase', 'sign_up', 'share'];

type Art = (r: Rand, s: Slots) => string;

// ---------------------------------------------------------------------------------------------------------------
// Topics: what a ticket is really about. Every topic has its own words; the customer's first message describes a
// symptom, the data team's second answer finds the cause.
type Turn = [string, string, Art?];
type Outcome = 'sorted' | 'change' | 'team' | 'customer' | 'quiet';

interface Topic {
	key: string;
	weight: number;
	after?: number;
	countries?: string[];
	/** The turns whose pasted output comes from the customer; in the others it comes from the data team. */
	pasted?: number[];
	/** Another app this topic needs on the workspace panel. */
	app?: string;
	prep?: (r: Rand, s: Slots) => void;
	subjects: string[];
	open: [string, string];
	quick: [string, string];
	/** Support's guess when escalating, after "Escalating to the data team." */
	guess: string;
	/** The data team's first answer, which asks for something. */
	ask: string;
	need: string;
	/** [0] answers the ask; [1] finds the cause and offers the fix; the rest are follow-up questions. */
	turns: Turn[];
	cause: string;
	act: string;
	fixed: [string, string];
	/** The customer's ask for a lasting fix, and the change to brindle-ingest, after "so that". */
	change?: [string, string];
	handfix?: string;
	/** The data team's answer in the second turn already does the handfix. */
	done?: boolean;
	/** Too pressing to wait behind other matters, and never raised as a side matter. */
	urgent?: boolean;
	team?: string;
	handover?: string;
	teamFix?: string;
}

const topics: Topic[] = [
	{
		key: 'local-times',
		pasted: [0],
		weight: 3,
		countries: OFFSET_NOT_ZERO,
		prep: (r, s) => {
			s.dev = s.devName!;
		},
		subjects: [`Daily numbers don't match our warehouse`, 'Report days are off', 'Weekly report vs our own figures'],
		open: [
			`Our weekly report from you and our own warehouse disagree about which day things happened. The week's total is the same to the event, but some days in your report have a few hundred more purchases than in ours, and the neighbouring days have fewer. It's been like this for three or four weeks and our finance team has started asking which one is right.`,
			`I've been reconciling the Brindle weekly report against our order database and the daily figures don't line up. Over a whole week they agree, so nothing is missing, but individual days are out by anything from 2% to 9%. Is the report using a different idea of a day from ours?`
		],
		quick: [`Can the weekly report go to a shared mailbox instead of to me personally?`, `Yes. Any address can be a recipient, including a shared mailbox or a group. It's under Settings, Weekly report, and you can remove yourself there if you no longer want your own copy.`],
		guess: `Totals match but days don't. Probably the report's day boundaries; the customer is in {tz}. Data team to confirm how the report cuts days.`,
		ask: `I look after the store behind the weekly report, so this one has come to me. A week that agrees in total but not day by day usually means some events are being put on the neighbouring day. Could you send me a handful of purchases that your warehouse puts on one day and our report on another, with your order ids and the times you have for them? Ten or so is plenty.`,
		need: 'a handful of purchases with your order ids and the times you have for them',
		turns: [
			[
				`Here are some from last week. Our times are UTC, straight from the order database.`,
				`Thanks, that's exactly what I needed. Every one of them happened within a few hours of midnight, and every one came from the app rather than the web shop. I looked them up in your store: the web shop sends its times in UTC, with a Z on the end, but the app sends local time with an offset, like {exampleLocal}. Can you tell me which version of the SDK the app uses? It's in the app's build file, or {dev} will know.`,
				(r, s) => {
					const off = Number(s.offsetMin);
					const rows: string[][] = [];
					for (let i = 0; i < int(r, 8, 12); i++) {
						const day = midnight(Number(s.openMs)) - int(r, 2, 8) * DAY;
						const utcMs = off > 0 ? day + DAY - off * MIN + int(r, 2, Math.min(off, 170) - 3) * MIN : day + DAY + int(r, 2, Math.min(-off, 170) - 3) * MIN;
						rows.push([`#${int(r, 210000, 289999)}`, isoUtc(utcMs).replace('T', ' ').slice(0, 16), shortDay(utcMs), shortDay(utcMs + off * MIN)]);
					}
					rows.sort((a, b) => (a[1]! < b[1]! ? -1 : 1));
					return table(['Order', 'Our time (UTC)', 'Our day', 'Day in the Brindle report'], rows);
				}
			],
			[
				`{dev} says the iPhone app is on {sdkIos} and the Android one on {sdkAndroid}.`,
				`That explains it. Since 3.8 the mobile SDKs send the device's local time with its offset unless the app sets utcTimestamps to true; the default changed in a release that went out in the summer, about when your numbers started to drift. Nothing is lost and the totals are right; it's only where the day is cut. The weekly report takes the day from the date as it's written, so an app purchase near midnight lands on its local day, while your warehouse moves it to UTC first, which can put it on the neighbouring day. If {dev} sets utcTimestamps in the app's Brindle configuration and ships it in the next release, new events arrive in UTC like the web shop's. For the events already stored, I can rewrite their times to UTC so the past weeks line up as well. Here's one event from each, as your store holds them:`,
				(r, s) =>
					fence([
						`{"id": "w-${int(r, 100000, 999999)}", "kind": "purchase", "at": "${isoUtc(Number(s.openMs) - 3 * DAY + int(r, 600, 1200) * MIN)}"}`,
						`{"id": "a-${int(r, 100000, 999999)}", "kind": "purchase", "at": "${s.exampleLocal}"}`
					])
			],
			[`Will rewriting the times change anything in our exports?`, `No. Exports are made by the Metrics API from its own copy of the events, which keeps the original times. The rewrite only touches our store, which feeds the weekly report and the Reports tab.`],
			[`Is UTC the right choice for us at all? Most of our customers are in {tz}.`, `For matching your warehouse it's the safest. If you'd rather see days in {tz}, I can set the workspace's report zone instead; then I'd convert the web shop's events and leave the app's alone. Either way the days end up consistent.`]
		],
		cause: `the app sends local times with an offset while the web shop sends UTC, and the weekly report takes the day from the date as written`,
		act: `set utcTimestamps to true in the app's Brindle configuration and ship it with the next release`,
		fixed: [`The days match our warehouse again, to the event. Finance are happy. Thank you.`, `Checked last week against our order database and every day lines up now. Thanks for the help.`],
		change: [`Could your side just store everything in UTC, whatever the app sends? We have three apps and I don't trust us to get this right in every release.`, `the time of each event is converted to UTC when it's stored, whatever offset the app sent`],
		handfix: `I've rewritten the times of the app's events in your store to UTC, back to {day2}, so the past weeks line up too.`,
		team: 'the SDK team',
		handover: `Customer's mobile apps send local times with offsets since the 3.8 default change, and it trips up anyone who reconciles day by day. Could you confirm utcTimestamps is the right advice for {sdkIos}, and whether the default is going back?`,
		teamFix: `I've checked {sdkIos}: utcTimestamps is the right setting, and the default goes back to UTC in the next minor release. The data team has also rewritten the times already stored, so your past weeks match your warehouse without waiting for a release.`
	},
	{
		key: 'shared-ids',
		pasted: [0],
		weight: 3,
		app: `{app} Rewards for iPhone ({sdkIos})`,
		prep: (r, s) => {
			s.n1 = num(int(r, 1800, 9000));
			s.n2 = num(Math.round(Number(s.n1!.replace(/,/g, '')) * (0.7 + r() * 0.1)));
			s.pid = String(int(r, 1040, 4800));
		},
		subjects: ['Purchases lower than our order system', 'Missing purchases in Reports', 'Our numbers dropped after the app launch'],
		open: [
			`Since we launched the {app} Rewards app on {day2}, the Reports tab shows fewer purchases than our order system, by roughly a quarter. The app itself is doing well, so the drop makes no sense to us. The web shop hasn't changed.`,
			`Something is eating our purchases. Our order system says we took {n1} orders last week and Brindle's weekly report says {n2}. Until a few weeks ago the two were within a handful of each other.`
		],
		quick: [`Is there a way to see which app an event came from in the Reports tab?`, `Not as a filter yet, but each app sends its SDK name with its events, so the Metrics API's event viewer shows it. In the Reports tab everything is pooled per workspace.`],
		guess: `Customer thinks events are going missing since a new app launched. Events reach the Metrics API fine as far as I can see, so it's somewhere between the API and the report.`,
		ask: `Thanks for the clear numbers. Could you send me the event ids of a few purchases that are in your order system but missing from the report, from both the web shop and the new app if you can? The ids your developers set when sending the event, not the order numbers.`,
		need: 'the event ids of a few purchases that are missing from the report',
		turns: [
			[
				`{devName} pulled these out of the logs: purchases from the web shop that don't appear in the report, and the app's purchases from around the same time.`,
				`This is very helpful, and I think I can see it already. The web shop and the new app both number their purchase events from p-1 upwards, so on most days each id turns up twice, once from each app. Could you ask {devName} how the app makes its ids? If it's a counter that started at 1 on launch day, that's the whole story.`,
				(r, s) => {
					const rows: string[][] = [];
					let id = Number(s.pid);
					for (let i = 0; i < int(r, 4, 6); i++) {
						id += int(r, 3, 40);
						const t = Number(s.openMs) - int(r, 3, 9) * DAY + int(r, 480, 1300) * MIN;
						rows.push(['Web shop', `p-${id}`, isoUtc(t).slice(0, 16).replace('T', ' ')]);
						rows.push([`${s.app} Rewards`, `p-${id}`, isoUtc(t - int(r, -2000, 2000) * MIN).slice(0, 16).replace('T', ' ')]);
					}
					return table(['Sent by', 'Event id', 'Time (UTC)'], rows);
				}
			],
			[
				`Yes, {devName} confirms it: a counter, starting from 1, same as the web shop. Neither of us thought to check.`,
				`Then that's the cause. Every event reached the Metrics API, and the API still holds all of them, but our store keeps one event per id, so wherever the two apps' ids met, the one that arrived second replaced the first. Below is what your store has for the ids you sent: one row each, whichever came last. The fix on your side is small: give the app's ids a prefix of their own, for example app-p-{pid}, in the app's Brindle configuration. Once that's out, I can ask the Metrics API team for a fresh copy of your events from {day2}, and the store will hold both sets.`,
				(r, s) =>
					sqlite(s, `SELECT id, kind, at FROM events WHERE id IN ('p-${Number(s.pid) + 7}', 'p-${Number(s.pid) + 31}', 'p-${Number(s.pid) + 52}')`, ['id', 'kind', 'at'], [0, 1, 2].map((i) => [`p-${Number(s.pid) + [7, 31, 52][i]!}`, 'purchase', isoUtc(Number(s.openMs) - int(r, 3, 9) * DAY + int(r, 480, 1300) * MIN)]))
			],
			[`Will the old app events get their prefix too, or will they still clash?`, `The old ones keep their ids in the API. When the fresh copy comes, each event carries its SDK name, and I'll store the app's ones with the prefix added, so they no longer meet the web shop's.`],
			[`Does this affect anything apart from purchases?`, `Every kind where both apps use a counter. I checked: your add_to_cart events have the same pattern, but views use random ids, so views are fine.`]
		],
		cause: `the web shop and the new app both number their events from 1, and the store keeps one event per id, so the app's events replace the web shop's where the ids meet`,
		act: `give the app's event ids a prefix of their own in its Brindle configuration`,
		fixed: [`This week's purchases match our order system again, and the earlier weeks look right too. Thanks for getting to the bottom of it.`, `Numbers match again. Really glad we found this before the quarter closed.`],
		change: [`Could the store keep events from different apps apart, so this can't happen again when we add the next app?`, `events from different apps are kept apart in the store even when their ids are the same`],
		handfix: `I've stored the fresh copy of your events from {day2} with the app's ids prefixed, so both sets are in your reports.`,
		team: 'the Metrics API team',
		handover: `Workspace {ws}: two apps used the same event ids, so our store kept one of each pair. The customer is adding a prefix. Could you send us a fresh copy of the workspace's events from {day2}, with the SDK name on each, so we can store both sets?`,
		teamFix: `I've sent the data team a fresh copy of your workspace's events from {day2}, with each event's SDK name, and they've stored both sets. The past weeks in your reports now include both apps.`
	},
	{
		key: 'kind-spellings',
		weight: 3,
		prep: (r, s) => {
			s.mate1 = s.mateF!;
		},
		subjects: ['Purchases split into several lines', 'Duplicate rows in the weekly report', 'Why does purchase appear three times?'],
		open: [
			`The weekly report now lists "purchase" three times, with different numbers next to each. Added together they come to about what we'd expect, but our directors read the top line and think sales have collapsed.`,
			`In the Reports tab, under event kinds, we suddenly have "purchase", "Purchase" and what looks like "purchase" again. Is this something on your side? We haven't changed anything as far as I know.`
		],
		quick: [`Can I change how a kind is labelled in the weekly report without changing what the site sends?`, `Yes, each kind can have a display label, under Settings, Weekly report, Labels. The stored kind stays as it is.`],
		guess: `Same kind showing up under different spellings. Could be the report grouping, could be what they send.`,
		ask: `Thanks for flagging this. I'd like to see exactly what's in your store. Could you tell me roughly when the extra lines first appeared, and whether anyone changed your tag manager or the site's checkout around then?`,
		need: 'when the extra lines first appeared, and whether the tag manager changed around then',
		turns: [
			[
				`The first report with the extra lines was the one for the week of {day2}. {mate1} in marketing says she tidied up some tags in the tag manager that week, but nothing to do with purchases.`,
				`That's a useful date. Here is what your store holds for that week, grouped by the kind exactly as it arrived. The third one has a space on the end, which is why it looks like a repeat. Can you tell me which pages the checkout and the order confirmation live on?`,
				(r, s) => {
					const from = Number(s.day2Ms);
					const total = int(r, 900, 4200);
					const a = Math.round(total * (0.45 + r() * 0.2));
					const b = Math.round((total - a) * (0.4 + r() * 0.3));
					const rows = [
						['view', num(int(r, 40000, 160000))],
						['click', num(int(r, 9000, 60000))],
						['add_to_cart', num(int(r, 2000, 9000))],
						[`'purchase'`, String(a)],
						[`'Purchase'`, String(b)],
						[`'purchase '`, String(total - a - b)],
						['sign_up', String(int(r, 200, 1400))]
					];
					return sqlite(s, `SELECT quote(kind) AS kind, COUNT(*) AS n FROM events WHERE at >= '${isoDate(from)}' AND at < '${isoDate(from + 7 * DAY)}' GROUP BY kind`, ['kind', 'n'], rows.map(([k, v]) => [k!.startsWith(`'`) ? k! : `'${k}'`, v!]));
				}
			],
			[
				`Checkout is /basket/pay and the confirmation is /order/thanks. So it is us, then?`,
				`It looks that way. The capitalised ones come from /basket/pay on mobile browsers and the ones with a space from /order/thanks, both from tags that now use a variable instead of the fixed word. My guess is the tidy-up replaced the fixed "purchase" with a variable that picks up each page's own label. If {mate1} puts the fixed word back in those two tags, new events arrive as plain "purchase". For the weeks already stored, I can merge the three spellings into one.`
			],
			[`Is it only purchases?`, `Purchases and add_to_cart, as far as I can see. Everything else arrives in one spelling.`]
		],
		cause: `a tag manager tidy-up made two tags send the kind with a capital letter or a trailing space, so one kind is stored under three spellings`,
		act: `put the fixed word "purchase" back in the two tags that now use a variable`,
		fixed: [`I can see a single purchase line again, past weeks included. Thanks!`, `All one line again. Directors reassured. Thank you.`],
		change: [`Could you just ignore case and spaces on your side? Our tag manager gets edited by four different people.`, `event kinds are trimmed and lowercased when they're stored, so "Purchase " and "purchase" count as one`],
		handfix: `I've merged the three spellings into "purchase" for every week since {day2}.`
	},
	{
		key: 'dates-ahead',
		weight: 2,
		app: `{app} in-store tablets ({sdkAndroid})`,
		prep: (r, s) => {
			s.shops = String(int(r, 6, 40));
			s.ahead = String(int(r, 180, 900));
		},
		subjects: ['Next week already has numbers', 'Events from the future?', 'Report shows activity in 2027'],
		open: [
			`This will sound odd: the Reports tab shows views and clicks for days that haven't happened yet. There are a few hundred events dated next week and a handful in 2027. Nobody here has a time machine.`,
			`The date picker in the Reports tab lets me choose next month, and there's data in it. Where are events dated in the future coming from, and are they being left out of this month?`
		],
		quick: [`Do events keep the time the device says, or the time you receive them?`, `The time the device says, as the SDK sends it. The Metrics API notes when it received each event as well, but the reports use the device's time.`],
		guess: `Events dated in the future. Probably devices with the wrong date, but the data team should confirm what's stored.`,
		ask: `Thanks, that's a good catch. Could you tell me which of your apps or sites run on devices you manage yourselves, such as tablets in shops? Events dated ahead usually come from a device whose date is set wrong, and the SDK trusts the device.`,
		need: 'which of your apps run on devices you manage yourselves',
		turns: [
			[
				`We have tablets in our {shops} shops, running the {app} app for sign-ups at the till. Everything else is customers' own phones and browsers.`,
				`That fits. I looked at the future-dated events in your store, and almost all of them come from the tablet app. Here they are by the date they carry. Do your shops set the tablets up themselves, or does head office?`,
				(r, s) => {
					const base = Number(s.openMs);
					const rows = [3, 5, 6, 9, 12].map((d) => [shortDay(base + d * DAY) + ' 2026', String(int(r, 4, 60)), 'tablet app']);
					rows.push([shortDay(base + int(r, 300, 340) * DAY) + ' 2027', String(int(r, 80, 300)), 'tablet app'], [shortDay(base + int(r, 4, 8) * DAY) + ' 2026', String(int(r, 1, 3)), 'web shop']);
					return table(['Date on the event', 'Events', 'From'], rows);
				}
			],
			[
				`The shops do it themselves, from a sheet we send them. So some of the tablets think it's a different date?`,
				`Yes. The events from one tablet carry dates about eleven months ahead, and a couple of others run a week or so fast, which usually means they were set up by hand and don't take the date from the network. If your shop staff switch on automatic date and time on each tablet, new events come in with the right dates. The ones already stored I can either remove or move to the day the Metrics API received them; moving keeps the counts.`
			],
			[`Moving them sounds better. Will the past days' totals change?`, `Slightly: the moved events add to the days they really happened on. It's {ahead} events in all, so a few per day per shop.`]
		],
		cause: `several in-store tablets have their date set by hand and wrong, and the SDK stamps events with the device's date`,
		act: `switch on automatic date and time on every in-store tablet`,
		fixed: [`The future days are empty again and the past days look right. Thanks.`, `Nothing dated ahead for a week now. Sorted, thank you.`],
		change: [`Could you refuse anything dated in the future? We can't watch every tablet.`, `events dated after the day they arrive are set aside instead of landing on future days`],
		handfix: `I've moved the future-dated events to the day the Metrics API received them.`,
		team: 'the SDK team',
		handover: `Tablet app on {ws} sends events dated weeks or months ahead because some devices have their date set by hand. Is there an SDK option to use the received time instead of the device's for shared devices?`,
		teamFix: `The tablet app can set useServerTime in its Brindle configuration, which is meant for shared devices like these: events then take the time the Metrics API receives them, whatever the tablet says. I've helped {devName} switch it on, and the data team has moved the events already stored.`
	},
	{
		key: 'staging-key',
		pasted: [0],
		weight: 3,
		subjects: ['Sign-ups doubled overnight', 'Too good to be true', 'Strange jump in sign-ups'],
		open: [
			`Our sign-ups doubled overnight on {day1} and stayed doubled. Marketing would love to believe it, but our user database shows no such thing. Where are the extra sign-ups coming from?`,
			`Since {day1} the weekly report shows roughly twice the sign-ups we really have. We didn't run a campaign. I'd like to understand it before someone puts it in a board pack.`
		],
		quick: [`Can we have a second workspace for testing without paying for it?`, `Yes. Test workspaces are free on every plan and don't appear in reports or invoices. An admin can create one under Settings, Workspaces.`],
		guess: `Double sign-ups since {day1}. Not a campaign according to the customer. Could be duplicate sending or test traffic.`,
		ask: `I'd like to look at the extra sign-ups themselves. Could you send me the ids of a few sign-ups you know are real, from your user database, so I can tell them apart from the rest?`,
		need: 'the ids of a few sign-ups you know are real',
		turns: [
			[
				`Here are ten real ones from yesterday.`,
				`Thanks. Your real sign-ups have ids like the ones you sent. Since {day1}, about as many again arrive with ids that start with qa-, at odd hours and often several hundred inside a minute. They look like automated tests. Did anything change in your test or staging setup around {day1}?`,
				(r) => fence(Array.from({ length: 10 }, () => `u-${int(r, 10, 99)}${String.fromCharCode(97 + int(r, 0, 25))}${int(r, 1000, 9999)}${String.fromCharCode(97 + int(r, 0, 25))}`))
			],
			[
				`{devName} says the staging environment's configuration was copied from production that week, key and all. So our test suite has been sending its sign-ups to the real workspace ever since.`,
				`That's it, then. The real numbers underneath are fine; the test runs just add to them. Here are the qa- sign-ups in your store by hour for one day, so you can see the test runs. If staging gets its own key, ideally in a free test workspace, the extra sign-ups stop. I can take the qa- events out of your store so the reports since {day1} are right again.`,
				(r, s) => {
					const hours = [1, 2, 3, 6, 13, 14, 19, 22].filter(() => chance(r, 0.7));
					return sqlite(s, `SELECT substr(at, 12, 2) AS hour, COUNT(*) AS n FROM events WHERE kind = 'sign_up' AND id LIKE 'qa-%' AND at LIKE '${isoDate(Number(s.day1Ms) + DAY)}%' GROUP BY hour`, ['hour', 'n'], hours.map((h) => [pad(h), String(int(r, 40, 420))]));
				}
			],
			[`Did the test events go anywhere else, apart from the report?`, `They're in the Metrics API's copy too, so they'd appear in an export and in the event count on your invoice. Removing them from our store doesn't change those; if that matters, the Metrics API team can remove them on their side as well.`]
		],
		cause: `the staging environment was set up with the production key, so automated tests send their sign-ups to the real workspace`,
		act: `give staging its own key, ideally in a free test workspace`,
		fixed: [`Sign-ups are back to normal, past weeks included. Marketing is disappointed but grateful.`, `Back to real numbers. Thanks for cleaning out the test ones.`],
		handfix: `I've taken the qa- events out of your store, back to {day1}.`,
		team: 'the Metrics API team',
		handover: `Workspace {ws} received automated test sign-ups (ids starting qa-) since {day1} because staging used the production key. Could you remove them from the API's copy, so exports and the invoice count are clean too? We're doing the same in the store.`,
		teamFix: `I've removed the qa- events from the Metrics API's copy of {ws}, back to {day1}, so exports and the event count on your invoice leave them out, and the data team has done the same in the store behind your reports.`
	},
	{
		key: 'night-views',
		pasted: [0],
		weight: 2,
		subjects: ['Views jump every night', '3am traffic?', 'Landing page views at night'],
		open: [
			`Every night at about 03:00 UTC our landing page views jump by a few hundred within ten minutes and then drop back. Our web host's logs show nothing like it at that hour. Are these real visitors?`,
			`Our Reports tab shows a burst of views on the pricing and landing pages every night, always around the same time. It makes our conversion rate look worse than it is. Can you tell us what it is?`
		],
		quick: [`Do views from our own office count?`, `Yes, unless you exclude them. You can list your office addresses under Settings, Filters, and views from them stop counting from then on.`],
		guess: `Nightly burst of views at the same time. Sounds like a bot or a scheduled job.`,
		ask: `Thanks. A burst at the same time every night is usually a machine rather than people. Could you tell me whether you or an agency run any service that loads your pages on a schedule, for example a page-speed or SEO checker?`,
		need: 'whether you or an agency run any service that loads your pages on a schedule',
		turns: [
			[
				`Not that I know of. I've asked {agency}, who built the site. Here's what the Reports tab shows for last week.`,
				`Thanks. The events in the burst all carry the same browser string, a headless Chrome that names itself after a page-speed service, and they load the same fourteen pages in the same order every night. Real visitors never do that.`,
				(r, s) =>
					table(
						['Day', '01:00 to 02:00', '02:00 to 03:00', '03:00 to 04:00', '04:00 to 05:00'],
						daysBefore(s, 2, 7).map((d) => [fullDay(d).slice(0, 3) + ' ' + shortDay(d), String(int(r, 20, 90)), String(int(r, 15, 70)), String(int(r, 380, 720)), String(int(r, 10, 60))])
					)
			],
			[
				`{agency} came back: they set up a nightly page-speed report for us in the summer and forgot to mention it.`,
				`That's the answer, then. Each run loads your pages with the Brindle script on them, so each load counts as a view. You can add the checker's browser name to the ignore list in the Web SDK's settings, and its loads stop counting. I can also remove the past nightly views from your store so your conversion rate looks right for the last few months.`
			],
			[`Should we stop the checker?`, `No need. It's useful, and once its browser name is on the ignore list it doesn't touch your numbers.`]
		],
		cause: `the agency's nightly page-speed checker loads the site with the Brindle script on it, so every run counts as views`,
		act: `add the page-speed checker's browser name to the ignore list in the Web SDK's settings`,
		fixed: [`No burst for three nights now, and the summer looks right. Thank you.`, `Last night was clean. Conversion rate is back where we thought it was.`],
		handfix: `I've removed the checker's views from your store, back to the start of the summer.`,
		team: 'the Metrics API team',
		handover: `{ws} counts views from a page-speed service's headless browser every night. Could its browser string go on the Metrics API's list of known checkers, so every workspace is spared?`,
		teamFix: `I've added that page-speed service to the Metrics API's list of known checkers, so its loads no longer count as views for {ws} or anyone else, and the data team has removed its past views from your store.`
	},
	{
		key: 'byte-order-mark',
		weight: 3,
		prep: (r, s) => {
			s.affected = String(int(r, 3, 9));
		},
		subjects: ['Upload says 0 matched rows', 'Sales upload not joining', 'Uploaded file not matched to events'],
		open: [
			`We upload our weekly sales file, {file}, and the Reports tab says it has 0 rows matched to events. The file has an order_id column like always, and last month's uploads matched fine.`,
			`Since we moved to the new laptops, every upload shows "0 matched" in the Reports tab. The rows are stored and the count is right, but nothing joins. Same template as before.`
		],
		quick: [`Does the Reports tab care about the order of the columns in an upload?`, `No, it finds columns by their header, so the order doesn't matter as long as the header row is the first line.`],
		guess: `Uploads store but don't join. Likely a column naming thing.`,
		ask: `Thanks. The join looks for a column headed exactly order_id, so the first thing I'd like to see is the very first line of a file that doesn't match, as raw as possible. Could you send me the file itself, without opening and saving it again?`,
		need: 'a file that doesn\'t match, without opening and saving it again',
		turns: [
			[
				`I've attached {file} as it came out of Excel.`,
				`Thanks. The header looks right on screen, but the file starts with three invisible bytes before order_id. Here's the start of it in hex:`,
				(r, s) => {
					const head = `order_id,date,amount,store\n${int(r, 210000, 289999)},${isoDate(Number(s.openMs) - 6 * DAY)},${int(r, 9, 240)}.${pad(int(r, 0, 99))},${pick(r, ['web', 'shop-01', 'shop-04', 'outlet'])}\n`;
					return fence([`$ xxd ${s.file} | head -4`, ...hexdump([0xef, 0xbb, 0xbf, ...new TextEncoder().encode(head)].slice(0, 64))]);
				}
			],
			[
				`What are those bytes, and why are they there now?`,
				`They're a byte-order mark, which Excel adds when you save as "CSV UTF-8". With them, the first column is called something like "\\ufefforder_id" as far as the join is concerned, so it never finds order_id. My guess is the new laptops default to "CSV UTF-8" where the old ones used plain "CSV (Comma delimited)". Saving in the plain format makes the uploads match again.`
			],
			[`Do we need to upload the old files again?`, `Only the ones since the new laptops. I've checked: {affected} uploads carry the mark, all from the last few weeks.`]
		],
		cause: `Excel's "CSV UTF-8" format puts a byte-order mark before the first header, so the join never finds the order_id column`,
		act: `save the weekly file as "CSV (Comma delimited)" rather than "CSV UTF-8", and upload the affected weeks again`,
		fixed: [`Everything matches now. Who knew three bytes could do that.`, `That was it. All the affected weeks match now. Thank you.`],
		change: [`Could you strip the mark on your side? Half the team will forget the format by next month.`, `a byte-order mark at the start of an upload is removed before the rows are stored`],
		handfix: `I've removed the mark from the {affected} uploads already stored, so the past weeks match without uploading them again.`
	},
	{
		key: 'comma-rows',
		weight: 3,
		prep: (r, s) => {
			const rows = int(r, 400, 3200);
			const blank = int(r, 12, 70);
			s.rowsFile = num(rows);
			s.blankRows = String(blank);
			s.rowsStored = num(rows + blank + 1);
		},
		subjects: ['Upload count is wrong', 'More rows stored than in the file', `Row count doesn't match`],
		open: [
			`Our {file} has {rowsFile} orders in it. After uploading, the page says {rowsStored} stored. Where do the extra rows come from? I'm worried we're counting something twice.`,
			`Every month the upload page tells me it stored more rows than our file has. This month it's {rowsStored} for a file of {rowsFile} orders. Our accountant wants the numbers to agree before she signs off.`
		],
		quick: [`Can I delete an upload myself?`, `Not yet; support or the data team can remove one for you. Tell us the file name and when it was uploaded.`],
		guess: `Stored count higher than the file. Possibly duplicates in the upload.`,
		ask: `Thanks. The count on the upload page is every line of the file that isn't empty, so the difference is lines that look empty to you but aren't to us. Could you open the file in a text editor rather than Excel and tell me what's on the last few lines?`,
		need: `what's on the last few lines of the file in a text editor`,
		turns: [
			[
				`Opened it in Notepad. The bottom of it is lots of lines of just commas.`,
				`That's it; here's the end of the upload as we stored it. Excel saves those rows because something was once typed in them and deleted, often a formula dragged further than needed. A line of commas isn't empty, so it's stored as a row. There are {blankRows} of them, plus the header line, which the count includes too.`,
				(r, s) => {
					const lines = Array.from({ length: 3 }, () => `${int(r, 210000, 289999)},${isoDate(Number(s.openMs) - int(r, 3, 20) * DAY)},${int(r, 9, 240)}.${pad(int(r, 0, 99))},${pick(r, ['web', 'shop-02', 'shop-07', 'phone'])}`);
					return fence([`$ tail -n 8 ${s.file}`, ...lines, ...Array.from({ length: 5 }, () => ',,,')]);
				}
			],
			[
				`So {rowsFile} plus {blankRows} plus the header. That adds up. Do the comma lines affect the report?`,
				`They add nothing to revenue, since they have no amounts, but they do show in the Reports tab's row count, which is probably where the difference showed up. If you select the rows below your data in Excel and delete them before saving, they stop coming through. I can remove the comma lines from the uploads already stored.`
			],
			[`And the header line? Is that counted in the report too?`, `No, the Reports tab skips the first line of every upload. It's only the count on the upload page that includes it.`]
		],
		cause: `the file ends with rows that hold nothing but commas, which count as rows because they aren't empty`,
		act: `delete the rows below the data in Excel before saving, so the file ends with the last order`,
		fixed: [`This month's upload says exactly {rowsFile} plus the header. Accountant happy.`, `Counts agree now. Thanks for clearing the old ones.`],
		change: [`Could the upload just skip lines that are only commas? The file comes out of our till system's export and we can't change it.`, `lines that hold nothing but commas are skipped like empty lines, so they're neither stored nor counted`],
		handfix: `I've removed the comma lines from your stored uploads, so the row counts in the Reports tab match the files.`
	},
	{
		key: 'same-name-upload',
		weight: 3,
		prep: (r, s) => {
			s.mate1 = s.mateF!;
			s.month = MONL[at(Number(s.day2Ms)).getUTCMonth()]!;
			s.file = `${s.uploadBase}-${s.month.toLowerCase()}.csv`;
			s.firstRows = String(int(r, 300, 2400));
		},
		subjects: ['Revenue doubled for {month}', 'Corrected file added on top', 'Re-uploaded file counted twice'],
		open: [
			`We found a mistake in {file}, fixed it and uploaded it again. Now the Reports tab shows that month's revenue at roughly double. It looks like both versions are counted.`,
			`Revenue in the Reports tab for {month} is about twice what our books say. The only unusual thing is that {mate1} uploaded the month's file twice, once with an error and then corrected.`
		],
		quick: [`Can I see who uploaded a file?`, `Yes. The upload list in the Reports tab shows who uploaded each file and when.`],
		guess: `Revenue doubled after a re-upload. Data team to check how the store handles the same file twice.`,
		ask: `Thanks. Could you confirm the exact file name of both uploads, and roughly when each went up? If they have the same name I think I know what's happened.`,
		need: 'the exact file names of both uploads, and when each went up',
		turns: [
			[
				`Both were called {file}. The first went up on {day2} and the corrected one on {day1}.`,
				`Thanks. Your store has both uploads under the one name, one after the other, so the Reports tab sees one file with both sets of rows:`,
				(r, s) => sqlite(s, `SELECT upload, COUNT(*) AS n FROM rows WHERE upload = '${s.file}'`, ['upload', 'n'], [[s.file!, String(Number(s.firstRows) * 2 + int(r, -3, 3))]])
			],
			[
				`So uploading again doesn't replace the old one?`,
				`No. A new upload adds its rows to whatever is stored under that name. That's handy for files sent in parts, but not for corrections. The quickest fix is for me to remove the rows from the first upload, which leaves the corrected one. Next time, name a corrected file differently, for example with "-v2", and ask us to remove the old one.`
			],
			[`Can you check the other months while you're at it?`, `I did: {month} is the only month with two uploads under one name.`]
		],
		cause: `a corrected file uploaded under the same name adds its rows to the first upload's instead of replacing them`,
		act: `give corrected files a new name and ask us to remove the earlier upload whenever you correct one`,
		fixed: [`The month looks right now. Thanks for removing the first one.`, `Revenue matches our books again. We'll use -v2 from now on.`],
		change: [`Could a new upload with the same name just replace the old one? Nobody here will remember the -v2 trick.`, `an upload with the same name as an earlier one replaces its rows, unless it's marked as a further part`],
		handfix: `I've removed the rows of the first upload of {file}, so only the corrected one is counted.`
	},
	{
		key: 'semicolons',
		pasted: [0],
		weight: 2,
		countries: CONTINENTAL,
		subjects: ['Upload shows one column', 'Columns missing after upload', 'Everything in the first column'],
		open: [
			`Our upload from the shop system shows a single column in the Reports tab, with the whole line in it, and none of the totals work. The file looks perfect in Excel.`,
			`Since we switched our office laptops to {lang} Windows, uploads end up with all values in one column. Before, the same export worked. Please help.`
		],
		quick: [`Is there a sample file we can copy the format from?`, `Yes, the Uploads page has a "Download sample" link under the upload button, with the headers we expect and two example rows.`],
		guess: `Upload lands in one column. Format issue probably.`,
		ask: `Thanks. Could you open the file in a plain text editor, like Notepad, and send me the first three lines exactly as they appear there?`,
		need: 'the first three lines of the file as they appear in a plain text editor',
		turns: [
			[
				`Here they are.`,
				`Thanks, that shows it. The values are separated by semicolons rather than commas. Excel uses the separator set in Windows' region settings, and with {lang} settings that's a semicolon. The Reports tab splits columns at commas, so each line stays in one piece.`,
				(r, s) => fence([`order_id;date;amount;store`, ...Array.from({ length: 2 }, () => `${int(r, 210000, 289999)};${pad(int(r, 1, 28))}.${pad(at(Number(s.openMs)).getUTCMonth() + 1)}.2026;"${int(r, 9, 240)},${pad(int(r, 0, 99))}";${pick(r, ['Filiale 3', 'Centrum', 'Online', 'Outlet Noord'])}`)])
			],
			[
				`Can we change that without changing all our Windows settings?`,
				`Yes. In Excel, choose "CSV (Comma delimited)" when saving and Excel uses commas whatever the region says, or change the list separator in the region settings of the one machine that does the export. Either way, the next upload splits properly.`
			],
			[`What about the amounts? They have commas in them, like 12,50.`, `Excel puts quotes around values that contain the separator, so they survive, but the Reports tab reads amounts with a point before the cents. If you can, format the amount column that way before saving.`]
		],
		cause: `Excel with {lang} region settings saves CSV files with semicolons, and the Reports tab splits columns at commas`,
		act: `save the export as "CSV (Comma delimited)" or change the list separator on the machine that exports it`,
		fixed: [`Comma version uploaded and all the columns are there.`, `It works now. We changed the separator on the export PC.`],
		team: 'the dashboards team',
		handover: `{ws} uploads come from {lang} Excel with semicolons. Could the Reports tab detect the separator instead of assuming commas? Several European customers hit this.`,
		teamFix: `The Reports tab can now be told the separator per workspace, and I've set {ws}'s to semicolon, so your existing uploads show their columns without uploading anything again.`
	},
	{
		key: 'decimal-commas',
		pasted: [0],
		weight: 2,
		countries: CONTINENTAL,
		subjects: ['Revenue far too low', 'Amounts wrong after upload', 'Decimal problem in sales file'],
		open: [
			`The revenue the Reports tab shows from our sales upload is ridiculously low, about a thousandth of what it should be. The order counts are right.`,
			`Our uploaded sales show {cur}1.23 where the file says {cur}1.234,50. Something is reading our numbers wrong.`
		],
		quick: [`Do amounts need a currency symbol?`, `No, and it's better without. The workspace's currency applies to every amount in an upload.`],
		guess: `Amounts wrong in an upload. Number format probably.`,
		ask: `Thanks. Could you send me two or three lines of the file as they appear in a text editor, including the header?`,
		need: 'two or three lines of the file as they appear in a text editor',
		turns: [
			[
				`Here.`,
				`Thanks. The amounts are written the {lang} way: a point between thousands and a comma before the cents. The Reports tab reads a point as the decimal point, so "1.234,50" becomes 1.234 and stops at the comma.`,
				(r, s) => fence([`order_id,date,amount`, ...Array.from({ length: 3 }, () => `${int(r, 210000, 289999)},${isoDate(Number(s.openMs) - int(r, 2, 12) * DAY)},"${int(r, 1, 9)}.${int(r, 100, 999)},${pad(int(r, 0, 99))}"`)])
			],
			[
				`Our accounting system only exports like this.`,
				`Then the simplest route is to change the amount column's format before saving: in Excel, format it as a number with two decimals and no thousands separator, with a point as the decimal separator. If that's a chore every week, I can ask the dashboards team whether the Reports tab can be told your number format.`
			],
			[`Are the order counts affected?`, `No, counts come from the rows, not the amounts, so those have been right all along.`]
		],
		cause: `the amounts are written with a point for thousands and a comma for cents, and the Reports tab reads the point as the decimal point`,
		act: `format the amount column with a point before the cents and no thousands separator before saving`,
		fixed: [`The revenue is right now.`, `Got it working. Thank you for the patience.`],
		team: 'the dashboards team',
		handover: `{ws} exports amounts as 1.234,50. Could the Reports tab take a number format per workspace? Their accounting system can't change it.`,
		teamFix: `I've set {ws}'s number format to "1.234,50" in the Reports tab, so amounts in your uploads are read the {lang} way from now on, and the past uploads have been read again too.`
	},
	{
		key: 'old-encoding',
		pasted: [0],
		weight: 2,
		prep: (r, s) => {
			s.till = pick(r, tills);
			s.affected = String(int(r, 4, 14));
		},
		subjects: ['Strange characters in names', 'Accents broken in uploads', 'Garbled text in Reports'],
		open: [
			`Names with accents show up broken in the Reports tab: "M�ller" instead of "Müller", "Jos�" instead of "José". It only happens with our uploads, not with anything the site sends.`,
			`Our shop names in the uploaded footfall file come out with question-mark diamonds where the accents should be, like "Gen�ve". The file looks fine on our computers.`
		],
		quick: [`Can an upload have more than one sheet?`, `No, an upload is one CSV file. Save each sheet as its own file and upload them one at a time.`],
		guess: `Accented characters broken in uploads. Encoding.`,
		ask: `Thanks. Could you tell me which program produces the file, and send me one line from it that comes out broken?`,
		need: 'which program produces the file, and one line from it that comes out broken',
		turns: [
			[
				`It comes out of our old till software, {till}. Here is a line, and what {devName} got from checking the file.`,
				`Thanks. The till software writes its files in an old Windows encoding rather than UTF-8. Letters without accents are the same in both, which is why most of the file is fine, but each accented letter is a byte the upload page can't read as UTF-8, so it turns into the diamond.`,
				(r, s) => fence([`$ file ${s.file}`, `${s.file}: ISO-8859 text, with CRLF line terminators`, `$ sed -n 4p ${s.file}`, `${int(r, 210000, 289999)},${isoDate(Number(s.openMs) - 4 * DAY)},${pick(r, ['M\\xfcller', 'Jos\\xe9 Ib\\xe1\\xf1ez', 'Ren\\xe9e Fran\\xe7ois', 'Bj\\xf6rk'])},${int(r, 9, 240)}.${pad(int(r, 0, 99))}`])
			],
			[
				`Can we fix it without replacing the till system?`,
				`Yes. Open the export in Notepad and choose UTF-8 under Encoding when you save it; the upload then keeps the accents. For the uploads already stored, the original letters didn't survive on our side, so they'd need uploading again from the original files.`
			],
			[`Will the files we upload from now on be fine?`, `If they're saved as UTF-8 first, yes. The till software itself will keep writing the old encoding.`]
		],
		cause: `the till software writes files in an old Windows encoding, and the upload page reads them as UTF-8, so accented letters are lost`,
		act: `save each till export as UTF-8 in Notepad before uploading it, and upload the affected files again`,
		fixed: [`Accents are back, old files included. Thanks.`, `Names are right now. Thank you.`],
		change: [`Could the upload page work out the encoding itself? The till exports every night and the person uploading isn't technical.`, `an upload that isn't valid UTF-8 is read as Windows-1252, so accented letters survive`],
		handfix: `I've stored your last {affected} uploads again from the original files you sent, so the names are right in past weeks.`
	},
	{
		key: 'month-first-dates',
		pasted: [0],
		weight: 2,
		countries: EUROPE.concat(['Australia']),
		subjects: ['Sales in the wrong month', 'Dates mixed up in upload', 'April numbers in March'],
		open: [
			`Some of our uploaded sales land in the wrong month in the Reports tab. A sale on 4 March shows in April, and a sale on 13 March is fine. It's maddening.`,
			`Our monthly totals from uploads don't match. Early days of each month seem to swap with other months. Only the first twelve days are affected, from what I can see.`
		],
		quick: [`Can uploads include a time as well as a date?`, `Yes. A column called date can hold "2026-10-14" or "2026-10-14 15:30"; the Reports tab uses the time when there is one.`],
		guess: `Dates in uploads off for the first twelve days of the month. Date format.`,
		ask: `Thanks, the "first twelve days" detail is a big clue. Could you send me a few lines of an affected file, as they appear in a text editor?`,
		need: 'a few lines of an affected file, as they appear in a text editor',
		turns: [
			[
				`Here you go. It's the export from our online shop platform.`,
				`The dates are written month first, 03/04/2026 for 4 March, the American way, because that's what your shop platform exports. Your workspace reads dates day first, so 03/04 becomes 3 April. From the 13th on only one reading makes sense, which is why those days are right.`,
				(r) => fence([`order_id,date,amount`, `${int(r, 210000, 289999)},03/04/2026,${int(r, 9, 240)}.${pad(int(r, 0, 99))}`, `${int(r, 210000, 289999)},03/13/2026,${int(r, 9, 240)}.${pad(int(r, 0, 99))}`, `${int(r, 210000, 289999)},10/0${int(r, 1, 9)}/2026,${int(r, 9, 240)}.${pad(int(r, 0, 99))}`])
			],
			[
				`Our shop platform only does American dates. What can we do?`,
				`Two options. You can change the date column to ISO format, 2026-03-04, before saving, which every reader agrees on. Or I can ask the dashboards team to switch your workspace to read dates month first, which would suit this file but not your other uploads if they're written the British way.`
			],
			[`ISO it is. Do we need to upload the old months again?`, `Yes, the ones from the shop platform. The others were written day first and are fine.`]
		],
		cause: `the shop platform writes dates month first and the workspace reads them day first, so days up to the 12th swap with the month`,
		act: `convert the date column to ISO format (2026-03-04) before uploading, and upload the affected months again`,
		fixed: [`All the months are right now.`, `Done, the months add up. Thanks for explaining.`],
		team: 'the dashboards team',
		handover: `{ws} uploads one file with month-first dates and others with day-first dates. Could the Reports tab take the date format per upload, or detect it from the file?`,
		teamFix: `The Reports tab can now hold a date format per upload, so I've marked your shop platform's uploads as month first and left the others day first. The past months are right without uploading anything again.`
	},
	{
		key: 'wrong-file-personal',
		urgent: true,
		weight: 2,
		prep: (r, s) => {
			s.mate1 = s.mateF!;
			s.mate1Full = `${s.mateF} ${pick(r, surnames)}`;
			s.file2 = pick(r, ['crm-export-full.csv', 'customers-all.csv', 'contacts_2026.csv', 'mailing-list-export.csv']);
			s.crmRows = num(int(r, 2000, 48000));
			s.timeA = `${pad(int(r, 8, 11))}:${pad(int(r, 0, 59))}`;
			s.uploadDay = fullDay(Number(s.openMs));
		},
		subjects: ['Please remove an upload urgently', 'Wrong file uploaded', 'Upload contains customer details'],
		open: [
			`{mate1} uploaded the wrong file this morning: {file2}, which is our full customer list with names, emails and phone numbers, instead of the weekly sales file. It should never have left our CRM. Can you remove it completely?`,
			`Urgent: one of our team uploaded a CRM export with personal details by mistake. We need it gone from Brindle, and we need to know who could have seen it.`
		],
		quick: [`Who at Brindle can see our uploads?`, `Support and the data team can see uploaded rows when they work on a ticket; nobody else has access, and every look is logged against the ticket.`],
		guess: `Customer uploaded personal data by mistake and wants it removed. Data team to remove; privacy may need to know.`,
		ask: `Thanks for telling us so quickly. Could you confirm the exact file name and roughly when it was uploaded, so I remove the right one and nothing else?`,
		need: 'the exact file name and roughly when it was uploaded',
		turns: [
			[
				`{file2}, uploaded at about {timeA} on {uploadDay} by {mate1Full}.`,
				`Found it. It's the only upload with that name, {crmRows} rows. I've removed every row of it from your store. Here's the record of the removal for your files:`,
				(r, s) => table(['Upload', 'Rows', 'Uploaded', 'Uploaded by', 'Rows left', 'Removed by'], [[s.file2!, s.crmRows!, `${shortDay(Number(s.openMs))}, ${s.timeA}`, s.mate1Full!, '0', `${s.eng} (data team)`]])
			],
			[
				`Thank you. Do we need to report anything? And has anyone at Brindle opened it?`,
				`The access log shows nobody opened it before I removed it, apart from the upload itself. Whether you need to report it is your data protection officer's call; since it stayed inside a service you already use for this data, many decide it isn't reportable. Our privacy team can give you a written statement of what was stored and when it was removed, if that helps.`
			],
			[`Will it still be in your backups?`, `Backups of the store are overwritten after 35 days, so it drops out of them on its own.`]
		],
		cause: `a CRM export with personal details was uploaded by mistake instead of the sales file`,
		act: `ask your data protection officer whether a written statement from our privacy team is needed, and let us know`,
		fixed: [`That's everything we needed. Thank you for acting so fast.`, `Our DPO is satisfied. Thanks for the quick work.`],
		team: 'the privacy team',
		handover: `{ws} uploaded a CRM export with names, emails and phone numbers by mistake; the data team removed it within hours. Customer would like a written statement of what was stored and when it was removed.`,
		teamFix: `I've sent your data protection officer a written statement of what was stored, for how long and when it was removed, with the access log attached. Nothing further is needed from you.`
	},
	{
		key: 'template-uploaded',
		pasted: [0],
		weight: 2,
		prep: (r, s) => {
			s.template = pick(r, templates);
			s.weekPrev = String(Number(s.week) - 1);
			s.rowsFile = num(int(r, 300, 1800));
		},
		subjects: [`Upload worked but report is empty`, 'Nothing in the report after upload', 'Upload stored 1 row?'],
		open: [
			`I uploaded this week's sales and the page said it worked, but the Reports tab has nothing for the week. Did it go somewhere else?`,
			`The upload page said "stored: 1" for our weekly file. Our file has hundreds of rows. What happened to the rest?`
		],
		quick: [`Can I upload from my phone?`, `The Uploads page works in a phone browser, as long as the file is on the phone. Most people find it easier from a computer.`],
		guess: `Upload stored only one row. Could be file format.`,
		ask: `Thanks. Could you tell me the name of the file you uploaded, as it appears in the upload list, and how many rows the file you meant to upload has?`,
		need: 'the name of the file in the upload list, and how many rows the file you meant to upload has',
		turns: [
			[
				`In the list it says {template}. The real file should have about {rowsFile} rows.`,
				`That explains the single row. The file that went up is {template}, which holds only a header line, and your earlier weeks were all named like week-{weekPrev}-sales.csv. It looks like the template was picked instead of the week's file, which is easy to do when both sit in Downloads.`,
				(r, s) => {
					const rows = [1, 2, 3, 4].map((back) => [`week-${Number(s.week) - back}-sales.csv`, num(int(r, 300, 1800)), shortDay(Number(s.openMs) - back * 7 * DAY)]);
					rows.unshift([s.template!, '1', shortDay(Number(s.openMs))]);
					return table(['File', 'Rows stored', 'Uploaded'], rows);
				}
			],
			[
				`Oh no. Yes, that's the empty template we copy each week. Sorry!`,
				`No harm done. I've removed the empty upload so it doesn't clutter the list. If you upload the right file, the week fills in straight away.`
			],
			[`Will the empty one have affected anything?`, `No. A header on its own adds nothing to any report.`]
		],
		cause: `the empty template file was uploaded instead of the week's sales file`,
		act: `upload the week's real sales file`,
		fixed: [`Uploaded the right one and the week is there. Thanks, and sorry again.`, `All there now. Embarrassing, but sorted.`]
	},
	{
		key: 'two-currencies',
		pasted: [0],
		weight: 2,
		subjects: ['Revenue total looks inflated', 'Our revenue is wrong since we opened in {country2}', 'Currency mix-up'],
		open: [
			`Since we started selling in {country2}, revenue in the Reports tab is higher than our accounts by a strange amount. Order counts are fine.`,
			`Our uploaded revenue doesn't match finance's figures. The gap appeared when we opened the {country2} shop.`
		],
		quick: [`Can the weekly report show revenue as well as events?`, `Yes, if you upload sales rows with an amount column. Revenue then appears as its own line in the weekly report.`],
		guess: `Revenue off after expanding to another country. Data team to check the uploads.`,
		ask: `Thanks. Could you send me a few lines of a recent sales upload, including some {country2} orders?`,
		need: 'a few lines of a recent sales upload, including some orders from the new shop',
		turns: [
			[
				`Here are a few.`,
				`Thanks. The {country2} orders are in {cur2} and the rest in {cur}, but the file has no column saying which, so the Reports tab adds them up as if they were all in {cur}, the workspace's currency.`,
				(r, s) => fence([`order_id,date,amount,shop`, ...Array.from({ length: 4 }, (_, i) => `${int(r, 210000, 289999)},${isoDate(Number(s.openMs) - int(r, 2, 9) * DAY)},${int(r, 9, 240)}.${pad(int(r, 0, 99))},${i % 2 ? s.country2!.replace(/^the /, '').toLowerCase().replace(/ /g, '-') : 'home'}`)])
			],
			[
				`Our shop platform exports everything in one file. Can Brindle convert?`,
				`The Reports tab can't convert currencies today. What works is splitting the export into one file per currency and uploading the {country2} file to a second workspace, or adding a column with the amount already converted to {cur} by your accounting system, which is the cleanest.`
			]
		],
		cause: `the sales file mixes {cur} and {cur2} amounts without a currency column, so the Reports tab adds them as if all were {cur}`,
		act: `add an amount column already converted to {cur}, or upload the {country2} orders separately`,
		fixed: [`Revenue matches finance's figures now. Thanks.`, `The numbers make sense again. Thank you.`],
		team: 'the dashboards team',
		handover: `{ws} uploads sales in two currencies with no currency column. Could the Reports tab take a currency column and convert at the day's rate?`,
		teamFix: `The Reports tab can now read a currency column and convert at the day's rate. I've set {ws} up to use it and re-read your uploads, so the totals come out in {cur}.`
	},
	{
		key: 'long-ids-in-excel',
		pasted: [0],
		weight: 2,
		subjects: ['Export ids look wrong', 'Event ids corrupted in export', 'Export file broken in Excel'],
		open: [
			`The export you sent has event ids like 4.52E+17, and when I widen the column the last digits are all zeros. We need the ids to join with our own data.`,
			`We asked for an export of our events and the id column is ruined: big numbers in scientific notation and lost digits. Is the export broken?`
		],
		quick: [`Can exports be sent to a shared drive instead of by email?`, `Not directly. We send a download link, and you can save the file wherever you like from there.`],
		guess: `Export ids look broken. Data team to check the file.`,
		ask: `Thanks. Could you tell me how you opened the file, and send me the first few lines as they appear in a text editor rather than in Excel?`,
		need: 'how you opened the file, and its first few lines in a text editor',
		turns: [
			[
				`I double-clicked it, so Excel. In Notepad it looks like this.`,
				`Thanks, the file itself is fine: in Notepad the ids are complete. Your app uses long numeric ids, and when Excel opens a CSV directly it treats them as numbers, which it keeps to fifteen significant digits, so it shows them in scientific notation and turns the rest into zeros.`,
				(r) => fence([`id,kind`, ...Array.from({ length: 4 }, () => `4${int(r, 10000000, 99999999)}${int(r, 100000000, 999999999)},${pick(r, kindsBase)}`)])
			],
			[
				`So how do we open it without losing the digits?`,
				`In Excel, use Data, From Text/CSV, and set the id column's type to Text before loading. Or open it in Google Sheets with "Convert text to numbers" switched off. Either way the ids stay whole.`
			],
			[`Couldn't the export put quotes around the ids so Excel leaves them alone?`, `Excel ignores quotes when it guesses types, sadly, so quotes alone don't help.`]
		],
		cause: `Excel reads the 18-digit ids as numbers when the file is double-clicked, and loses the last digits`,
		act: `open the export with Data, From Text/CSV and set the id column to Text`,
		fixed: [`Imported as text and the ids are perfect. Thanks!`, `That worked, ids intact and the join works.`],
		team: 'the Metrics API team',
		handover: `{ws} opens exports in Excel, which mangles their 18-digit ids. Is there an export option Excel won't mangle, such as .xlsx with the id column as text?`,
		teamFix: `Exports can be made as .xlsx now, with the id column set to text, and I've switched {ws} to that format and sent you a fresh export. It opens in Excel with the ids whole.`
	},
	{
		key: 'light-dataset',
		done: true,
		weight: 2,
		subjects: ['Export is missing the time', 'Need timestamps in export', 'Export only has two columns'],
		open: [
			`The export of our events only has id and kind. We need to know when each event happened. Did we ask for the wrong thing?`,
			`We're moving our analysis to our own warehouse and asked for an export of everything. The file has two columns, id and kind, and no dates. That's no use for what we need.`
		],
		quick: [`Can I get an export of just one kind of event?`, `Not as an option on the export, but the file has the kind on every line, so you can filter it in any spreadsheet or database.`],
		guess: `Export lacks timestamps. Data team to check which dataset was exported.`,
		ask: `Thanks. Could you tell me the job id from the email you got with the download link? It starts with exp-.`,
		need: `the export's job id`,
		turns: [
			[
				`It's {exp}.`,
				`Thanks. That job used the dataset called events, which is the light one: id and kind only, kept small for quick counts. There's another dataset, events_detail, that includes the time of each event as well. Nobody mentions it when an export is requested through support, which is how you ended up with the light one.`,
				(r, s) => {
					const earlier = shortDay(Number(s.openMs) - int(r, 60, 120) * DAY);
					const recent = shortDay(Number(s.openMs) - 2 * DAY);
					return table(['Job', 'Dataset', 'Requested', 'Delivered', 'Columns'], [
						[`exp-${Number(s.exp!.slice(4)) - int(r, 900, 4000)}`, 'events', earlier, earlier, 'id, kind'],
						[s.exp!, 'events', recent, recent, 'id, kind']
					]);
				}
			],
			[
				`Then events_detail is what we need. Can you run that instead?`,
				`Yes. I've started an export of events_detail for your workspace; the download link comes by email as usual. It has id, kind and at, the time as your apps sent it.`
			],
			[`Is the time in UTC?`, `It's as your apps sent it. The web SDK sends UTC; if any of your apps sends local time, the offset is on the end of the value.`]
		],
		cause: `the export used the light events dataset, which has only id and kind, instead of events_detail`,
		act: `ask for the events_detail dataset whenever you request an export`,
		fixed: [`Got the detailed export, times and all. Exactly what we needed.`, `The new file has the at column. Thank you!`],
		handfix: `I've started an export of events_detail for your workspace; the link will come by email.`,
		team: 'the Metrics API team',
		handover: `Customers keep getting the light events dataset when they ask support for an export. Could the standard export include the time, or the request form offer events_detail?`,
		teamFix: `I've made events_detail the default for exports requested through support, and sent {ws} an export with the time of each event. The download link is in your inbox.`
	},
	{
		key: 'whole-history',
		weight: 2,
		prep: (r, s) => {
			const month = at(Number(s.openMs)).getUTCMonth();
			s.months = `${pad(month - 1)}|${pad(month)}`;
		},
		subjects: ['Export much bigger than expected', 'Only wanted one month', 'Export covers everything'],
		open: [
			`We asked for an export of last month's events and got a file with everything since we joined in {yearJoined}. Our analyst's laptop can barely open it.`,
			`The export we received has every event we've ever sent, not just last month's. Is there a way to get one month only?`
		],
		quick: [`Do exports include uploaded rows?`, `No, exports are events only. Uploaded rows stay in the store behind the Reports tab.`],
		guess: `Export has the whole history instead of one month. Data team to check how the export was requested.`,
		ask: `Thanks. Could you tell me which job id it was, from the email with the download link, and what you were hoping to do with last month's events?`,
		need: `the export's job id and what you need last month's events for`,
		turns: [
			[
				`{exp}. We want to compare last month with the month before in our own spreadsheet.`,
				`Thanks. Exports always cover the whole history of a dataset; there's no date range on them today. So the file is complete, just bigger than you need. Here's how its rows spread over the years:`,
				(r, s) => {
					const joined = Number(s.yearJoined);
					const rows: string[][] = [];
					for (let y = joined; y <= 2026; y++) rows.push([String(y), num(int(r, 200000, 2400000) * (y === 2026 ? 1 : 2))]);
					return table(['Year', 'Rows in the export'], rows);
				}
			],
			[
				`Can you cut it down for us?`,
				`The easiest is to filter it yourselves: the file is sorted by time, so each month is one block. If it's too big for a spreadsheet, a free tool like csvkit cuts out the months you want in one line: csvgrep -c at -r "^2026-({months})" {exp}.csv > two-months.csv. Or I can take the two months out of the store and send you a smaller file.`
			],
			[`Does the csvgrep line keep the header?`, `Yes, csvgrep always keeps the header row.`]
		],
		cause: `exports always cover a dataset's whole history; there is no date range on them`,
		act: `cut the months you need out of the full file, for example with csvgrep`,
		fixed: [`We have our two months now. Thanks.`, `Got what we needed. Thanks for the help.`],
		handfix: `I've taken the two months out of the store and sent them to you as a separate file.`,
		team: 'the Metrics API team',
		handover: `{ws} wants exports for a date range rather than the whole history. Is a date range on exports planned?`,
		teamFix: `Exports can now take a date range when requested through support, and I've sent {ws} an export of the two months only. The link is in your inbox.`
	},
	{
		key: 'uploads-for-auditor',
		done: true,
		weight: 2,
		prep: (r, s) => {
			s.affected = String(int(r, 9, 40));
		},
		subjects: ['Auditor wants our uploaded data', 'Can we export our uploads?', 'Need a copy of what we uploaded'],
		open: [
			`Our auditors want a copy of every sales file we uploaded to Brindle this year, as Brindle holds it, to tie the revenue in our board reports to the source. The export option only seems to cover events.`,
			`Is there any way to get back what we've uploaded? We lost some of the original files in a laptop swap and our auditor needs them.`
		],
		quick: [`Does deleting a file from our own drive affect what's in Brindle?`, `No. What you upload is stored on our side, separately from your copy.`],
		guess: `Customer wants uploads exported. Exports only cover events. Data team, can you help?`,
		ask: `Happy to help. Could you tell me which files you need, by name or by month, and whether your auditor needs them exactly as uploaded or just the rows?`,
		need: 'which files you need, and whether the auditor needs them exactly as uploaded',
		turns: [
			[
				`Every sales upload from January to {lastMonth}. Just the rows is fine, as long as it's clear which file each came from.`,
				`Thanks. Exports are made by the Metrics API, which only holds events, so uploads aren't something the export button can produce. I can, though, take the rows out of the store behind the Reports tab, where each row is kept with the name of the upload it came from. These are the ones I found:`,
				(r, s) => {
					const rows: string[][] = [];
					const last = MONL.indexOf(s.lastMonth!);
					for (let m = 0; m <= last; m++) if (m === last || chance(r, 0.8)) rows.push([`${MONL[m]!.toLowerCase()}-${s.uploadBase}.csv`, num(int(r, 400, 3200)), `${m === last ? 1 : int(r, 1, 6)} ${MON[m + 1]}`]);
					return table(['Upload', 'Rows', 'Uploaded'], rows);
				}
			],
			[
				`That would be perfect.`,
				`Done. I've put the rows of all those uploads into one CSV with the file name in the first column, and sent you a download link. The rows are exactly as stored, so blank lines are gone but everything else is as you sent it.`
			],
			[`Will the auditor be able to tell this came from Brindle?`, `I've added a short note to the email saying what the file holds and when it was produced, which auditors usually ask for.`]
		],
		cause: `exports cover events only, so uploaded rows have to be taken out of the store by hand`,
		act: `tell us which further files the auditor needs`,
		fixed: [`The auditor has what they need. Thank you.`, `Perfect, that saved us a lot of trouble.`],
		change: [`Could exporting our uploads be a button? Auditors ask every year.`, `uploaded rows can be exported by file, the way events are`],
		handfix: `I've sent you the rows of the uploads as one CSV, with the file name in the first column.`
	},
	{
		key: 'export-vs-report',
		weight: 2,
		prep: (r, s) => {
			const total = int(r, 40000, 400000);
			s.n1 = num(total);
			s.n2 = num(Math.round(total * (0.96 + r() * 0.02)));
		},
		subjects: ['Export and report disagree', 'Export has more clicks than the report', 'Which number is right?'],
		open: [
			`Our export has {n1} clicks for last month, the Reports tab says {n2}. Which is right?`,
			`We're reconciling the event export with the weekly reports and the export always has more events. The gap is small, two or three percent, but it never goes away.`
		],
		quick: [`Is the weekly report the same as the Reports tab?`, `They read the same store. The weekly report is a fixed summary sent on Mondays; the Reports tab lets you choose dates and filters.`],
		guess: `Export and report don't agree. Data team to explain.`,
		ask: `Thanks. Could you tell me the export's job id and which report view you compared it with, including any filters?`,
		need: `the export's job id and the report view you compared it with`,
		turns: [
			[
				`Job {exp}. The Reports tab, events by kind, last month, no filters that I know of.`,
				`Thanks. I compared the two kind by kind, and the export has events the Reports tab leaves out on purpose: anything from the office addresses listed under Settings, Filters, and any kind starting with debug_, which your developers send while testing. The export is made by the Metrics API from everything it received.`,
				(r) => {
					const rows = ['view', 'click', 'add_to_cart', 'purchase', 'debug_checkout'].map((kind) => {
						const report = kind.startsWith('debug') ? 0 : int(r, 2000, 90000);
						const exp = kind.startsWith('debug') ? int(r, 200, 3000) : report + int(r, 20, Math.round(report * 0.04));
						return [kind, num(exp), num(report), num(exp - report)];
					});
					return table(['Kind', 'Export', 'Reports tab', 'Difference'], rows);
				}
			],
			[
				`So the report is the one without our own staff clicking around?`,
				`Exactly. For marketing figures the Reports tab is the one to use. If you want the export to match, drop the debug_ kinds, and the office events, which the detailed export marks as internal.`
			]
		],
		cause: `the Reports tab applies the workspace's filters (office addresses and debug_ kinds) and the export doesn't`,
		act: `use the Reports tab's figures, or apply the same filters to the export`,
		fixed: [`Reconciled. The difference is exactly the filtered events.`, `Makes sense now, thanks. We'll use the report for marketing.`]
	},
	{
		key: 'clock-change',
		weight: 2,
		after: Date.UTC(2026, 9, 26),
		countries: EUROPE,
		subjects: ['Strange hour on Sunday 25 October', 'Hourly chart wrong for the weekend', 'Double hour in the report'],
		open: [
			`The hourly chart for Sunday 25 October has one bar about twice as tall as the others, early in the morning. Did something happen, or is the chart broken?`,
			`Our hourly views for the weekend the clocks changed look wrong: one hour has double the traffic. Can you explain?`
		],
		quick: [`Can the weekly report show hours instead of days?`, `The weekly report is by day, but the Reports tab has an hourly view for any dates you choose.`],
		guess: `Doubled hour on the day the clocks changed. Probably expected, but data team to confirm.`,
		ask: `Thanks. That was the night the clocks went back, so I suspect the hour that happened twice. Could you tell me which time zone the workspace's reports are set to, under Settings, General?`,
		need: `the time zone the workspace's reports are set to`,
		turns: [
			[
				`It says {tz}.`,
				`Thanks. Here's what the store has for that night, hour by hour, with the offset the times were sent with. One hour happened twice that night, once in summer time and once in winter time, and the hourly view adds the two together.`,
				(r, s) => {
					const summer = Number(s.offsetSummer);
					const rows: string[][] = [];
					const doubled = summer === 120 ? 2 : 1;
					for (let h = 0; h <= 4; h++) {
						if (h === doubled) {
							rows.push([`${pad(h)}:00`, offsetText(summer), String(int(r, 30, 140))], [`${pad(h)}:00`, offsetText(summer - 60), String(int(r, 30, 140))]);
						} else rows.push([`${pad(h)}:00`, offsetText(h < doubled ? summer : summer - 60), String(int(r, 30, 160))]);
					}
					return table(['Local hour', 'Offset', 'Views'], rows);
				}
			],
			[
				`So nothing went wrong, it's just that the hour existed twice?`,
				`Exactly. Nothing is missing and nothing is counted twice; the day had 25 hours and the chart has 24 bars, so one bar carries two hours. The same happens the other way round in March, when one bar is empty.`
			],
			[`Could the chart show it as two bars?`, `Not today. The hourly view reads the hour from each event's local time, so the two hours look the same to it.`]
		],
		cause: `one hour happened twice when the clocks went back, and the hourly view adds both`,
		act: `read the tall bar on that day as two hours`,
		fixed: [`Understood, thanks. I'll add a note to the chart in our deck.`, `Makes sense. Thanks for the quick explanation.`],
		change: [`Could the hourly view work in UTC instead, so this doesn't happen twice a year?`, `the hourly view is worked out from UTC times, so the night the clocks change shows every hour once`]
	},
	{
		key: 'week-start',
		done: true,
		weight: 2,
		subjects: ['Weekly report week is wrong for us', 'Our week starts on Saturday', `Weekly figures don't match ours`],
		open: [
			`The weekly report never matches our own weekly sales figures, and I've just realised why: your week runs Monday to Sunday and ours runs Saturday to Friday. Can the report follow our week?`,
			`Our weekly totals and Brindle's are always different, even though the daily numbers agree. Is the weekly report cut on different days from ours?`
		],
		quick: [`What time does the weekly report email go out?`, `At 07:00 in the workspace's time zone, on the day after the week ends.`],
		guess: `Weekly totals don't match the customer's week. Report setting?`,
		ask: `Thanks. Could you confirm which day your trading week starts on, and whether you'd like the report to follow it from now on?`,
		need: 'which day your trading week starts on',
		turns: [
			[
				`Saturday to Friday, like most of retail. Yes please, from now on.`,
				`Thanks, that's what I'd guessed from your figures. Here are the last few weeks both ways: the daily numbers agree, and only the week boundaries differ.`,
				(r, s) => {
					const rows: string[][] = [];
					for (let w = 4; w >= 1; w--) {
						const monday = midnight(Number(s.openMs)) - ((at(Number(s.openMs)).getUTCDay() + 6) % 7) * DAY - w * 7 * DAY;
						const a = int(r, 900, 5200);
						rows.push([`${shortDay(monday)} to ${shortDay(monday + 6 * DAY)}`, num(a), `${shortDay(monday - 2 * DAY)} to ${shortDay(monday + 4 * DAY)}`, num(a + int(r, -300, 300))]);
					}
					return table(['Brindle week', 'Purchases', 'Your week', 'Purchases'], rows);
				}
			],
			[
				`Great. Can you change it?`,
				`Done. Your workspace's week now starts on Saturday, so the next weekly report covers Saturday to Friday and arrives on Saturday morning. The Reports tab's weekly view follows the same setting.`
			],
			[`Will past weeks be worked out again?`, `In the Reports tab, yes: it works the weeks out when you look at them, so past weeks now show Saturday to Friday as well. Reports already emailed stay as they were.`]
		],
		cause: `the workspace's week was set to Monday to Sunday while the customer's trading week runs Saturday to Friday`,
		act: `check the next weekly report against your own figures`,
		fixed: [`That's exactly what we needed. Thank you!`, `Brilliant, thanks. I'll check the first Saturday report against our own figures.`],
		handfix: `I've set your workspace's week to start on Saturday.`
	},
	{
		key: 'recipients',
		done: true,
		weight: 2,
		prep: (r, s) => {
			s.mate1Full = `${s.mateF} ${pick(r, surnames)}`;
		},
		subjects: ['Weekly report going to someone who left', 'Not getting the weekly report', 'Change who receives the report'],
		open: [
			`{former} left us in the summer, and I've just found out the weekly report has been going to her old address ever since. I took over her role and have never received it.`,
			`I'm the new {titleLower} at {co} and I don't receive the Brindle weekly report. My predecessor, {former}, did. How do I get it?`
		],
		quick: [`Can the weekly report come as a PDF?`, `It comes as an email with a PDF attached, and the same figures are in the Reports tab.`],
		guess: `Report recipient change. Support can't edit report settings, so over to data.`,
		ask: `Happy to sort that. Could you confirm the address that should receive it, and whether anyone else should be added or removed?`,
		need: 'the address that should receive the report',
		turns: [
			[
				`Me, {email}, and {mate1Full} in finance. Please remove {former}.`,
				`Thanks. Here's the list before and after; I've made the change.`,
				(r, s) =>
					table(['Recipient', 'Before', 'After'], [
						[s.formerEmail!, 'yes', 'removed'],
						[`marketing@${s.domain}`, 'yes', 'yes'],
						[s.email!, 'no', 'yes'],
						[`${s.mateF!.toLowerCase()}@${s.domain}`, 'no', 'yes']
					])
			],
			[
				`Can I make changes like this myself next time?`,
				`Yes. Anyone with the Admin role can change the recipients under Settings, Weekly report. You're a Member at the moment, so the workspace's admin, {admin}, would need to change your role or make the change for you.`
			]
		],
		cause: `the weekly report's recipients were never updated after {former} left`,
		act: `ask {admin} to give you the Admin role so you can manage the recipients yourself`,
		fixed: [`Got the report this Monday. Thanks!`, `Received it this week, all good.`],
		handfix: `I've updated the weekly report's recipients.`
	},
	{
		key: 'new-kind-missing',
		done: true,
		weight: 2,
		prep: (r, s) => {
			s.kindNew = pick(r, newKinds);
		},
		subjects: ['{kindNew} not in the weekly report', 'New event not showing', 'Where are our {kindNew} events?'],
		open: [
			`We started sending a {kindNew} event two weeks ago. I can see it in the Reports tab, but the weekly report doesn't mention it at all.`,
			`Our developers added a new event, {kindNew}, and the weekly email ignores it. Does it take a while for new events to appear?`
		],
		quick: [`Can I see the weekly report for a past week again?`, `Yes, the Reports tab keeps every past weekly report under Weekly report, History.`],
		guess: `New event kind missing from the weekly report but visible in the Reports tab. Data team owns the weekly report.`,
		ask: `Thanks. The weekly report lists the kinds chosen when it was set up, and new kinds aren't added on their own. Could you tell me which kinds you'd like in it, and in what order?`,
		need: `which kinds you'd like in the weekly report, in what order`,
		turns: [
			[
				`The current ones, plus {kindNew} after purchase.`,
				`Thanks. Here's your report's current list with last week's figures, and where {kindNew} goes. I've added it; the next weekly report will include it.`,
				(r, s) => table(['Line', 'Kind', 'Last week'], [['1', 'view', num(int(r, 20000, 200000))], ['2', 'click', num(int(r, 5000, 60000))], ['3', 'add_to_cart', num(int(r, 900, 9000))], ['4', 'purchase', num(int(r, 300, 4000))], ['5 (new)', s.kindNew!, num(int(r, 40, 900))], ['6', 'sign_up', num(int(r, 100, 2000))]])
			],
			[`Will it show the last two weeks too?`, `The weekly report covers one week, but its comparison column will show the week before as well, since the events are already in the store.`],
			[`Do we have to ask every time we add an event?`, `For the weekly report, yes, today. The Reports tab shows every kind on its own.`]
		],
		cause: `the weekly report lists the kinds chosen at setup, and new kinds aren't added to it automatically`,
		act: `tell us whenever you'd like a new kind added to the weekly report`,
		fixed: [`{kindNew} is in this week's report. Thanks!`, `Saw it on Monday. Perfect.`],
		change: [`Could new kinds just appear in the weekly report automatically? Our developers add events all the time.`, `a new kind appears in the weekly report on its own, at the end of the list, once it has been stored for a week`],
		handfix: `I've added {kindNew} to your weekly report after purchase.`
	},
	{
		key: 'rounding',
		weight: 1,
		subjects: ['Percentages add up to 101%', 'Report maths is off', 'Rounding in the weekly report'],
		open: [
			`The channel split in the weekly report adds up to 101%. My director spotted it and now doubts every number in it.`,
			`In this week's report the "share of views" column totals 99%. Small thing, but people notice.`
		],
		quick: [`Can I change the order of the sections in the weekly report?`, `Yes. Tell us the order you'd like and the data team will change it.`],
		guess: `Percentages don't add up to 100. Rounding, most likely.`,
		ask: `Thanks for flagging it. Could you tell me which week's report it was, and which section?`,
		need: `which week's report it was`,
		turns: [
			[
				`The one for the week of {day2}, the channel split.`,
				`Thanks. Each share is rounded to a whole percent on its own, and here three of them round up, which makes 101. The unrounded shares, in the right-hand column, add to exactly 100.`,
				(r) => {
					const raw = [int(r, 300, 500), int(r, 150, 300), int(r, 100, 200), int(r, 50, 150), int(r, 20, 80)];
					const total = raw.reduce((a, b) => a + b, 0);
					const names = ['Search', 'Direct', 'Email', 'Social', 'Referral'];
					return table(['Channel', 'Views', 'Share in the report', 'Unrounded'], raw.map((v, i) => [names[i]!, num(v * 37), `${Math.round((v / total) * 100)}%`, `${((v / total) * 100).toFixed(2)}%`]));
				}
			],
			[
				`Is there anything we can do so it doesn't happen?`,
				`Not from your side, I'm afraid; it's how the report rounds. You could quote the shares from the Reports tab, which shows one decimal place, or add a line to the deck saying the shares are rounded.`
			]
		],
		cause: `each share is rounded to a whole percent on its own, so the rounded shares can add to 99 or 101`,
		act: `use the Reports tab's one-decimal shares in the deck`,
		fixed: [`Fair enough, I've explained it to the director. Thanks.`, `Thanks, that settles it.`],
		change: [`Could the report round so the total is always 100?`, `the shares in the weekly report are rounded so that they always add up to 100`]
	},
	{
		key: 'history-before-move',
		done: true,
		weight: 2,
		prep: (r, s) => {
			s.startMonth = s.joinedMonth!;
		},
		subjects: ['Year-on-year column empty', 'Last year missing from comparison', 'Nothing before May?'],
		open: [
			`The year-on-year column in the Reports tab is empty for anything before May. We've been customers since {yearJoined}, so last year's data should be there.`,
			`Our board wants this autumn against last autumn, and the Reports tab shows nothing for last year. Have we lost our history?`
		],
		quick: [`Can the Reports tab compare with the same week last year?`, `Yes, the comparison menu on any chart offers "Same period last year" next to "Previous period".`],
		guess: `History before May missing for year-on-year. Data team to look at the store.`,
		ask: `Thanks, and don't worry, nothing has been thrown away. In May we moved every workspace's store from JSON files to a database, and I'd like to check yours came across in full. Could you tell me the earliest date you'd expect to see?`,
		need: `the earliest date you'd expect to see`,
		turns: [
			[
				`We started sending events in {startMonth} {yearJoined}.`,
				`Thanks. Your store's earliest event is from 14 May, the day of the move. The old JSON files for your workspace are still in our archive, from {startMonth} {yearJoined} on; they just weren't brought across.`,
				(r, s) => {
					const lines = [`$ sqlite3 stores/${s.ws}.db "SELECT MIN(at), MAX(at), COUNT(*) FROM events"`, `${isoUtc(STORE_MOVE + int(r, 1, 600) * MIN)}|${isoUtc(Number(s.openMs) - int(r, 30, 300) * MIN)}|${int(r, 900000, 9000000)}`, `$ ls -lh archive/json-stores/${s.ws}/`];
					const firstQuarter = Math.floor(MONL.indexOf(s.joinedMonth!) / 3) + 1;
					for (let y = Number(s.yearJoined); y <= 2026; y++) for (const q of [1, 2, 3, 4]) if ((y < 2026 || q === 1) && (y > Number(s.yearJoined) || q >= firstQuarter)) lines.push(`-rw-r--r-- 1 ingest ingest ${int(r, 40, 400)}M Jun  2  2026 events-${y}-q${q}.json`);
					lines.push(`-rw-r--r-- 1 ingest ingest ${int(r, 20, 200)}M Jun  2  2026 events-2026-q2-to-14-may.json`);
					return fence(lines);
				}
			],
			[
				`Can you bring them across?`,
				`Yes. I've brought your old events into the store, so the Reports tab now has everything from {startMonth} {yearJoined}. Year-on-year should fill in when you next open it.`
			],
			[`Were other customers affected?`, `A small number of workspaces that joined before this year were. We're going through each of them.`]
		],
		cause: `the workspace's events from before the move to the database in May were left in the old JSON files`,
		act: `check that year-on-year looks right now`,
		fixed: [`Year-on-year is back. Board pack saved. Thank you.`, `All our history is there now.`],
		handfix: `I've brought your old events into the store from the archived JSON files.`
	},
	{
		key: 'renamed-kind',
		weight: 3,
		prep: (r, s) => {
			s.dev = s.devName!;
		},
		subjects: ['Sign-ups fell off a cliff', 'Sign-ups down 80% after release', 'Where did our sign-ups go?'],
		open: [
			`Since our app release on {day1}, sign-ups in the weekly report have dropped by about 80%. Our own database shows sign-ups as usual. Did the release break your tracking?`,
			`Sign-ups have nearly vanished from the Reports tab since {day1}. People are definitely still signing up. What changed?`
		],
		quick: [`Can we add notes to a chart, like "release day"?`, `Yes. Click on a day in any chart in the Reports tab and choose Add note; everyone in the workspace sees it.`],
		guess: `Sign-ups dropped after their app release. Possibly the release broke the SDK.`,
		ask: `Thanks. Could you tell me which version of the app went out on {day1}, and whether its release notes mention anything about analytics or events?`,
		need: `the version of the app released on {day1}`,
		turns: [
			[
				`Version {release}. The release notes are all features, nothing about analytics as far as I can see.`,
				`Thanks. Here's what the store has received from the app around the release: the old kind, signup, falls away from {day1}, and a new kind, sign_up, starts the same day at almost the same numbers. Could you ask {dev} whether event names were touched in that release?`,
				(r, s) =>
					table(
						['Day', 'signup', 'sign_up'],
						around(s, 8).map((d) => {
							const after = d >= Number(s.day1Ms);
							const total = int(r, 120, 600);
							return [shortDay(d), String(after ? Math.round(total * 0.15) : total), String(after ? Math.round(total * 0.85) : 0)];
						})
					)
			],
			[
				`{dev} says they tidied the event names in that release to match our style guide.`,
				`That's it. Nothing is lost: every sign-up is in the store, under sign_up for people on the new version. The weekly report's Sign-ups line counts signup, so it only sees people still on older versions. I can point the line at both kinds so your figures join up across the change.`
			],
			[`Will older app versions keep sending signup?`, `Yes, until those users update. Counting both kinds covers them.`]
		],
		cause: `the app release renamed the event from signup to sign_up, and the weekly report's Sign-ups line counts only signup`,
		act: `tell us whether any other events were renamed in {release}, so the report can count both names`,
		fixed: [`Sign-ups are back in the report. Thanks for counting both.`, `Numbers look right again. I've asked {dev} to warn us before renaming anything.`],
		handfix: `I've pointed the weekly report's Sign-ups line at both signup and sign_up.`,
		team: 'the dashboards team',
		handover: `{ws} renamed an event kind in an app release (signup to sign_up). The weekly report counts both now; could the Reports tab's saved charts do the same?`,
		teamFix: `I've updated {ws}'s saved charts in the Reports tab to count both signup and sign_up, and the data team has done the same in the weekly report, so everything lines up across the release.`
	},
	{
		key: 'two-tags',
		weight: 2,
		prep: (r, s) => {
			const real = int(r, 400, 3000);
			s.n1 = num(real * 2 - int(r, 0, 9));
			s.n2 = num(real);
			s.order1 = String(int(r, 210000, 289999));
			s.order2 = String(Number(s.order1) + int(r, 3, 90));
			s.order3 = String(Number(s.order2) + int(r, 3, 90));
		},
		subjects: ['Purchases double our real orders', 'Twice as many purchases as orders', 'Purchase count too high'],
		open: [
			`The weekly report says we had {n1} purchases last week. Our payment provider says {n2}, almost exactly half. This started on {day1}.`,
			`Purchases in the Reports tab have been double what we actually sold since {day1}. Nothing changed on our side, I'm told.`
		],
		quick: [`Does the weekly report include refunds?`, `Only if you send a refund event and it's on the report's list of kinds.`],
		guess: `Purchases doubled since {day1}. Could be duplicates in the store.`,
		ask: `Thanks. Could you send me the numbers of two or three real orders from last week, so I can find their purchase events?`,
		need: 'the numbers of two or three real orders from last week',
		turns: [
			[
				`Orders {order1}, {order2} and {order3}.`,
				`Thanks. Each of those orders has two purchase events a few seconds apart, with different event ids. One comes with the Web SDK's name, the other with the name of a tag manager template. Did anyone add a Brindle tag in your tag manager around {day1}?`,
				(r, s) => {
					const rows: string[][] = [];
					for (const order of [s.order1!, s.order2!, s.order3!]) {
						const t = Number(s.openMs) - int(r, 3, 8) * DAY + int(r, 500, 1300) * MIN;
						rows.push([order, `p-${order}`, isoUtc(t), s.sdkWeb!], [order, `gtm-${int(r, 10000000, 99999999)}`, isoUtc(t + int(r, 1, 6) * 1000), 'tag manager template 1.2']);
					}
					return table(['Order', 'Event id', 'at', 'Sent by'], rows);
				}
			],
			[
				`{agency} says they added the Brindle tag in the tag manager on {day1}, not knowing the checkout already sends purchases through the SDK.`,
				`That's it. Both are recording the same purchase, so each order counts twice. If one of the two goes, preferably the tag manager's since the SDK's events carry the order number, purchases go back to one per order.`
			],
			[`Can you remove the doubles from the past weeks?`, `The tag manager's events are easy to spot by their gtm- ids, so yes: I've removed them from your store back to {day1}.`]
		],
		cause: `a tag manager tag added on {day1} sends a second purchase event for every order the SDK already records`,
		act: `remove the Brindle purchase tag from the tag manager`,
		fixed: [`The tag is gone and purchases match our orders again.`, `Back to one purchase per order. Thank you.`]
	},
	{
		key: 'personal-token',
		pasted: [0],
		weight: 2,
		prep: (r, s) => {
			s.dev = s.devName!;
		},
		subjects: ['No events from our Android app', 'Android app stopped reporting', 'Events missing from one app'],
		open: [
			`Our Android app hasn't sent a single event since {day1}. The iPhone app and the website are fine. We haven't released anything for Android in weeks.`,
			`Since {day1} the Reports tab has nothing from Android. People are definitely using it; our crash reporting shows thousands of sessions a day.`
		],
		quick: [`Who in our team can create tokens?`, `Anyone with the Admin role, under Settings, Tokens.`],
		guess: `One app's events stopped on {day1}. Data team to check what reached the store.`,
		ask: `Thanks. The store has nothing from Android since {day1} either, so the events aren't reaching the Metrics API at all. Could you ask your developers whether anything changed around {day1} with the token the Android app uses?`,
		need: `whether the Android app's token changed around {day1}`,
		turns: [
			[
				`{dev} sent this from the app's log. They say nothing changed in the app.`,
				`Thanks, that log is the answer. The Metrics API is turning the app's events away with 401, token revoked. Do you know whose token the app was built with?`,
				(r, s) => {
					const t = Number(s.day1Ms) + int(r, 600, 1100) * MIN;
					return fence([0, 1, 2, 3].map((i) => `${isoUtc(t + i * int(r, 20, 90) * 1000).replace('T', ' ').slice(0, 19)} W/BrindleSDK: send failed: 401 {"error": "token_revoked", "token": "tok_${s.tokenTail}"}`));
				}
			],
			[
				`{dev} checked: the token was created by {former}, who left on {day1}.`,
				`That fits: our records show the token belonged to {former}'s personal account and was revoked when that account was removed. The fix is a workspace token, which doesn't belong to anyone, created by an admin under Settings, Tokens. Once the app has it, events come through again. The ones from the gap weren't stored anywhere, I'm afraid, because the API never accepted them.`
			],
			[`Is the iPhone app at risk of the same thing?`, `I checked: it uses a workspace token, so no. The website uses the public key, which isn't tied to anyone.`]
		],
		cause: `the Android app used a former employee's personal token, which was revoked when the account was removed`,
		act: `create a workspace token and ship the Android app with it`,
		fixed: [`Android events are back.`, `Android is reporting again. Lesson learned about personal tokens.`],
		team: 'the Metrics API team',
		handover: `{ws}'s Android app used a personal token that was revoked when its owner left on {day1}. Could you move the token to the workspace so the app works without a release, and should admins be warned before a token in use is revoked?`,
		teamFix: `I've moved the Android app's token from {former}'s account to the workspace, so it's no longer tied to anyone and the app's events are accepted again without a new release.`
	},
	{
		key: 'uploader-role',
		weight: 2,
		prep: (r, s) => {
			s.mate1 = s.mateF!;
			s.mate1Full = `${s.mateF} ${pick(r, surnames)}`;
		},
		subjects: [`New analyst can't see Reports`, 'Reports tab missing for a colleague', 'Access for our new hire'],
		open: [
			`Our new analyst, {mate1Full}, can sign in but has no Reports tab at all. Everyone else in the team has it.`,
			`A colleague who joined last week, {mate1}, sees only the Uploads page in Brindle. How do we give her the reports?`
		],
		quick: [`Can a workspace have more than one admin?`, `Yes, as many as you need.`],
		guess: `Colleague can't see Reports. Could be a data problem for the workspace?`,
		ask: `Thanks. The Reports tab depends on the person's role rather than on the data, so let's check that first. Could you tell me who invited {mate1}, and which role they chose?`,
		need: 'who invited your colleague and which role they chose',
		turns: [
			[
				`{admin} invited her. He thinks he picked the default.`,
				`Thanks. Here are the workspace's members and their roles. {mate1} has the Uploader role, which is the default for invitations in your workspace and sees only the Uploads page; everyone else in your team is an Analyst or an Admin.`,
				(r, s) =>
					table(['Member', 'Role', 'Joined'], [
						[s.admin!, 'Admin', `${MON[int(r, 0, 11)]} ${s.yearJoined}`],
						[s.full!, pick(r, ['Analyst', 'Admin']), `${MON[int(r, 0, 11)]} 2025`],
						[`${pick(r, firstM)} ${pick(r, surnames)}`, 'Analyst', `${MON[int(r, 0, 11)]} 2025`],
						[`${pick(r, firstF)} ${pick(r, surnames)}`, 'Uploader', `${MON[int(r, 0, 8)]} 2026`],
						[s.mate1Full!, 'Uploader', shortDay(Number(s.openMs) - int(r, 3, 9) * DAY)]
					])
			],
			[
				`Can you change it for us?`,
				`Only an admin of the workspace can change roles. {admin} can do it under Settings, Members, by choosing Analyst next to {mate1}'s name. It takes effect the next time she signs in.`
			],
			[`Can we change the default for future invitations?`, `Yes, on the same page: "Role for new members". Setting it to Analyst would have avoided this.`]
		],
		cause: `{mate1} was invited with the Uploader role, which can't see the Reports tab`,
		act: `ask {admin} to change {mate1}'s role to Analyst under Settings, Members`,
		fixed: [`{admin} changed her role and she can see everything. Thanks!`, `Sorted, she has the Reports tab now.`]
	},
	{
		key: 'invoice-count',
		weight: 2,
		prep: (r, s) => {
			const shown = int(r, 300000, 4000000);
			const debug = int(r, 8000, 90000);
			const office = int(r, 2000, 30000);
			s.n1 = num(shown + debug + office);
			s.n2 = num(shown);
			s.debugCount = num(debug);
			s.officeCount = num(office);
			s.invoice = `INV-2026-${int(r, 10000, 19999)}`;
		},
		subjects: ['Invoice counts more events than we see', `Invoice and Reports don't agree`, 'Question about our invoice'],
		open: [
			`Our invoice for last month charges for {n1} events. The Reports tab shows {n2} for the same month. Why are we paying for events we can't see?`,
			`Finance asked me to explain why the event count on our invoice is higher than anything in the Reports tab. I can't.`
		],
		quick: [`Can the invoice go to our accounts payable address?`, `Yes. The billing contact is under Settings, Billing, and any admin can change it.`],
		guess: `Invoice event count higher than the Reports tab. Might be billing, might be the store. Data team first.`,
		ask: `Thanks. Could you send me the invoice number, so I compare the same period?`,
		need: 'the invoice number',
		turns: [
			[
				`Invoice {invoice}.`,
				`Thanks. I compared the invoice period with your store. The difference is events the Reports tab leaves out on purpose: your office addresses and kinds starting with debug_, which your developers send while testing. The store holds them, and so does the Metrics API, and the invoice counts everything the API receives.`,
				(r, s) => table(['', 'Events'], [['Received by the Metrics API (invoiced)', s.n1!], ['Left out: office addresses', s.officeCount!], ['Left out: debug_ kinds', s.debugCount!], ['Shown in the Reports tab', s.n2!]])
			],
			[
				`So we're paying for our own testing?`,
				`As the plan stands, yes: every received event counts. Whether debug events should be charged is a billing question rather than a data one. The way to keep them off future invoices is for your developers to test in a free test workspace.`
			]
		],
		cause: `the invoice counts every event the Metrics API receives, including the office and debug_ events the Reports tab leaves out`,
		act: `have your developers send debug events to a free test workspace instead of the real one`,
		fixed: [`Understood. Our developers test in a separate workspace now, so this month should line up.`, `Clear now, thanks. Finance accepts the explanation.`],
		team: 'the billing team',
		handover: `{ws}'s invoice {invoice} counts debug_ events the customer's developers sent while testing ({debugCount}). Customer asks whether those can be credited. The data side is explained; this one is a billing call.`,
		teamFix: `I've looked at invoice {invoice}: the debug_ events came to {debugCount}, and as a one-off I've credited them; the credit note is attached. Testing in a free test workspace keeps them off future invoices.`
	},
	{
		key: 'blockers',
		pasted: [0],
		weight: 2,
		prep: (r, s) => {
			s.pct = String(int(r, 14, 32));
		},
		subjects: ['Web numbers lower than our server logs', 'Missing website visitors', 'Brindle undercounts our site'],
		open: [
			`Our server logs show about {pct}% more page loads than Brindle's views. We know bots are in the server logs, but this seems a lot.`,
			`Brindle counts noticeably fewer website visits than our web host does, and the gap is growing. Is the script failing on some pages?`
		],
		quick: [`Does Brindle work on pages behind our customer login?`, `Yes, the script works on any page you add it to, signed in or not.`],
		guess: `Web views lower than server logs. Script issue? Data team to compare.`,
		ask: `Thanks. Could you send me a week of figures from your server logs, by browser if your host breaks them down, so I can compare like with like?`,
		need: 'a week of server log figures, by browser if possible',
		turns: [
			[
				`Here's last week from our host's dashboard.`,
				`Thanks. The gap is small on Safari on iPhone and Chrome on Android, and much bigger on desktop Firefox and Chrome. That pattern fits ad and tracker blockers, which are far more common on desktop and stop the Brindle script before it loads.`,
				(r) => {
					const rows = [['Safari, iPhone', 0.03], ['Chrome, Android', 0.05], ['Chrome, desktop', 0.24], ['Firefox, desktop', 0.38], ['Edge, desktop', 0.12], ['Safari, Mac', 0.15]].map(([name, gap]) => {
						const loads = int(r, 8000, 90000);
						const views = Math.round(loads * (1 - (gap as number) - r() * 0.03));
						return [name as string, num(loads), num(views), `${Math.round((1 - views / loads) * 100)}%`];
					});
					return table(['Browser', 'Server page loads', 'Brindle views', 'Gap'], rows);
				}
			],
			[
				`Can we do anything about it?`,
				`Partly. If the script is served from your own domain, for example stats.{domain}, fewer blockers recognise it. The SDK team have a guide for setting that up; it needs a small change on your web server. Some visitors will still block it, and that's their choice.`
			],
			[`Do blockers affect the apps too?`, `Much less. Apps send their events directly, and blockers on phones rarely see them.`]
		],
		cause: `ad and tracker blockers in desktop browsers stop the Brindle script from loading`,
		act: `serve the Brindle script from your own subdomain, following the SDK team's guide`,
		fixed: [`The gap is about half what it was. Thanks.`, `Desktop views jumped once the script moved. Thanks for the help.`],
		team: 'the SDK team',
		handover: `{ws} loses a good share of desktop views to blockers. Could you help them serve the script from their own subdomain? They have a developer but no experience with it.`,
		teamFix: `I've walked {devName} through serving the script from stats.{domain} and checked it's working: desktop views are already up. You shouldn't need to do anything else.`
	},
	{
		key: 'consent-banner',
		weight: 2,
		prep: (r, s) => {
			s.consentTool = pick(r, consentTools);
		},
		subjects: ['Events dropped after new cookie banner', 'Big drop in views', 'Traffic down 40%?'],
		open: [
			`Our views and clicks dropped by about 40% from {day1}, the day we launched our new cookie banner. Sales didn't drop. Is the banner breaking your script?`,
			`Since {day1} everything in Brindle is down by a third or more, but our sales and sign-ups haven't moved. We put up a new consent banner that day.`
		],
		quick: [`Does Brindle set cookies?`, `The Web SDK sets one first-party cookie to recognise returning visitors; it can be switched off in the SDK settings.`],
		guess: `Drop in events since a cookie banner went live. Probably consent, but data team to check the store.`,
		ask: `Thanks. Could you tell me which consent tool you use, and what happens to the Brindle script when a visitor declines?`,
		need: 'which consent tool you use, and what it does with the Brindle script when a visitor declines',
		turns: [
			[
				`It's {consentTool}. {devName} says Brindle is in the "analytics" category, which is off unless the visitor accepts.`,
				`Then the drop is what the banner is meant to do: visitors who decline or ignore it aren't counted. Here are your store's daily views around {day1}, split between the website and the app, which the banner doesn't cover.`,
				(r, s) =>
					table(
						['Day', 'Website views', 'App views'],
						around(s, 8).map((d) => [shortDay(d), num(Math.round(int(r, 9000, 12000) * (d >= Number(s.day1Ms) ? 0.6 : 1))), num(int(r, 3000, 4200))])
					)
			],
			[
				`So the numbers are right, just lower?`,
				`Yes. Sales and sign-ups don't drop because your shop records them whether or not the visitor accepted analytics. For trends, compare the weeks since {day1} with each other rather than with the weeks before.`
			],
			[`Is there a way to count visitors who decline, without personal data?`, `That's one for your data protection officer. Brindle can run without cookies, but whether that's allowed without consent depends on the rules where you are.`]
		],
		cause: `the new consent banner keeps the Brindle script off for visitors who decline or ignore it`,
		act: `compare the weeks since the banner went live with each other, not with the weeks before`,
		fixed: [`Makes sense. I've briefed the team and added a note to our charts.`, `That settles it. Thanks for the clear answer.`]
	},
	{
		key: 'saved-filter',
		weight: 2,
		prep: (r, s) => {
			const total = int(r, 30000, 300000);
			s.n1 = num(total);
			s.n2 = num(Math.round(total * (0.2 + r() * 0.3)));
			s.mate1 = s.mateF!;
			s.mate1Full = `${s.mateF} ${pick(r, surnames)}`;
			s.filterCountry = pick(r, ['Germany', 'France', 'Ireland', 'Spain', 'the Netherlands', 'Belgium', 'Canada']);
		},
		subjects: ['Dashboard and weekly report disagree', 'Our dashboard shows less than the report', 'Numbers differ between views'],
		open: [
			`The main dashboard in the Reports tab says {n2} views last week; the weekly report says {n1}. I thought they came from the same place.`,
			`Our main dashboard shows far fewer events than the weekly email. Which should we believe?`
		],
		quick: [`Can I share a dashboard with someone outside the company?`, `Not directly. You can send them the weekly report's PDF, or save a chart as an image from its menu.`],
		guess: `Dashboard lower than the weekly report. Maybe the store?`,
		ask: `Thanks. They read the same store, so the difference is almost always in how the dashboard is set up. Could you send me a screenshot of the dashboard with its filter bar showing?`,
		need: 'a screenshot of the dashboard with its filter bar showing',
		turns: [
			[
				`Here it is. I don't see any filters.`,
				`Thanks. The filter bar is folded away in the screenshot, but the dashboard's settings show a saved filter. Only views from that country are counted.`,
				(r, s) => table(['Dashboard', 'Saved filter', 'Added by', 'Added on'], [['Main dashboard', `Country is ${s.filterCountry}`, s.mate1Full!, shortDay(Number(s.day2Ms))], ['Campaigns', '(none)', s.full!, `${int(r, 1, 28)} ${MON[int(r, 0, 7)]}`]])
			],
			[
				`{mate1} was preparing a country report and must have saved it on the shared dashboard.`,
				`That's it. If you remove the filter, or save a copy of the dashboard for {mate1}'s report, the main dashboard goes back to counting everything and matches the weekly report.`
			]
		],
		cause: `a colleague saved a country filter on the shared dashboard`,
		act: `remove the country filter from the main dashboard, or save a copy for the country report`,
		fixed: [`Removed the filter and the numbers match.`, `That was it. {mate1} has her own copy now.`]
	}
];

// ---------------------------------------------------------------------------------------------------------------
// Shared parts of a conversation.
const backstories = [
	`Some context: we're {co}, based in {country}, and we've used Brindle since {yearJoined}.`,
	`I'm the {titleLower} at {co} and I look after our Brindle workspace, among other things.`,
	`We rely on the weekly report for our Monday meeting, so this matters more than it might sound.`,
	`Apologies if this has been asked before; I couldn't find it in the help centre.`,
	`I'm fairly new to Brindle, having taken it over from a colleague a couple of months ago.`,
	`We're in the middle of our budget round and the numbers from Brindle go straight into it.`,
	`Not urgent, but it's been bugging me for a while.`,
	`Our board meets next week and I'd like to have an answer before then.`,
	`We've been very happy with Brindle in general, so I suspect this is something we've done.`,
	`I'm not technical, so please explain as if to a marketer, which I am.`
];
const firstGreetings = ['Hi,', 'Hello,', 'Hi there,', 'Hello Brindle team,', 'Hi support,', 'Good morning,', ''];
const replyGreetings = ['Hi {eng},', '{eng},', '', 'Hi again,', 'Hello {eng},', 'Thanks {eng},'];
const custSignoffs = ['Thanks,\n{first}', 'Many thanks,\n{full}\n{title}, {co}', 'Cheers,\n{first}', 'Best regards,\n{full}\n{title}\n{co}', '{first}', 'Kind regards,\n{full}'];
const replySignoffs = ['Thanks,\n{first}', '{first}', 'Cheers, {first}', '', 'Thanks again,\n{first}'];
const supportIntros = [
	`Thanks for getting in touch, and for the detail.`,
	`Thanks for the clear description.`,
	`Sorry for the slow reply; it's been a busy morning here.`,
	`Thanks for reaching out about this.`,
	`Thanks for flagging it.`
];
const supportPasses = [
	`I've had a first look and nothing stands out from where I sit, so I've asked our data team, who look after the reports and the store behind them, to take this one. One of them will reply on this ticket.`,
	`This needs someone who can see more of your workspace's data than I can, so I've passed it to our data team with what you've told me. They'll write to you here.`,
	`I've escalated this to the data team, who own the weekly report, the Reports tab's figures and uploads. Expect a reply from one of them on this ticket.`,
	`I can see the workspace but not the data behind the reports, so I've handed this to our data team. They usually pick things up within a working day.`
];
const engIntros = [
	`I'm {eng} from the data team; {agent} passed your ticket to me.`,
	`{eng} here, from the data team. I've picked this up from {agent}.`,
	`I'm {eng}, one of the engineers on the data team.`,
	``
];
const engGreetings = ['Hi {first},', 'Hello {first},', 'Hi {first},', 'Hello again {first},', ''];
const firstStaffGreetings = ['Hi {first},', 'Hello {first},', 'Dear {first},'];
const engSignoffs = ['Thanks,\n{eng}\nBrindle data team', '{eng}', 'Best,\n{eng}', 'Cheers,\n{eng} (data team)', 'All the best,\n{eng}'];
const custAcks = [`Thanks, that helps.`, `OK, understood.`, `Right.`, `Thanks for the quick reply.`, `Ah, I see.`, `Makes sense.`, `Great, thanks.`, `Interesting.`];
const vagueSubjects = ['Question about our numbers', 'Help please', 'A few questions', 'Reports problem', '(no subject)', 'Re: Your weekly Brindle report', 'Data question', 'Something odd in Brindle'];
const holdings = [`Thanks, let me look into this properly and come back to you.`, `Thanks for that. I want to check something before I answer, so bear with me.`, `Got it, thank you. I'll look at your store and come back to you.`];
const escalationExtras = [
	`Workspace on {plan}, {events30} events in the last 30 days, {uploads30} uploads.`,
	`Customer since {yearJoined}. Account manager is {am}, copying for visibility.`,
	`Customer is pressed for time; prioritising.`,
	`Similar question came up on another workspace last month, if memory serves.`,
	`Customer is up for renewal in {renewal}; {am} asked to be copied in.`,
	``
];
const engNotes = [
	`Note for whoever picks this up next: {cause}.`,
	`Found it: {cause}.`,
	`Cause, for the record: {cause}.`,
	`Checked the store. {Cause}.`
];
const leadsFirst = [
	`While you look into that, something else:`,
	`One more thing, unrelated:`,
	`I'll get that for you. Meanwhile, a different question:`,
	`I'll dig that out. In the meantime, another matter has come up:`
];
const leadsNext = [`Another thing while I have you.`, `Next question, if that's all right:`, `Something else came up this week as well.`];
const leadsLate = [`Thanks. Something else while I have you:`, `One more thing, unrelated:`, `A separate matter, while I think of it:`, `Before I forget, a different question:`];
const returnLeads = [`Back to my first question.`, `On the original matter:`, `Going back to what I first wrote about:`, `Now, back to the main thing.`];
const sideAsks = [`Happy to look at that too.`, `Let's look at that as well.`, `I can help with that too.`, ``];
const passLines = [
	`I've passed this to {team}, who can take it further than I can. They'll reply on this ticket, so their answer will come to you by email.`,
	`This needs {team}, so I've handed it to them with everything above. You'll hear from them here.`,
	`I've asked {team} to take this one from here. They'll write to you on this ticket.`
];
const mateAcks = [`Hi {first}, {mate} from {team} here. I've picked this up and will be in touch once I've had a proper look.`, `Hello {first}, this is {mate} from {team}. I'm looking at it now and will update you here.`];
const actLines = [
	`So the next step is on your side: you'll need to {act}. That should do it, but reply here if it doesn't.`,
	`From here it's with you: you'll need to {act}. I'll keep the ticket open in case you need anything.`,
	`To sum up, you'll need to {act}. Let me know how you get on.`
];
const willDos = [`OK, I'll do that {when} and let you know.`, `Will do. {devName} has the access, so I'll ask {devPron} {when}.`, `Thanks. I'll try that {when}.`, `Understood. I'll get on to it {when}.`, `I'll need to run that past {admin} first. Back to you {when}.`];
const whens = ['tomorrow', 'this afternoon', 'on Monday', 'after our team meeting', 'later this week', 'next week'];
const changeLines = [
	`That's a fair ask. I've put it on the data team's list as a change to brindle-ingest, so that {change}. {interim} I'll keep this ticket open and write here when it's live.`,
	`Agreed, you shouldn't have to remember that. We'll change brindle-ingest so that {change}. It isn't scheduled yet. {interim} I'll update this ticket when there's news.`,
	`Understood. I've written it up for the team as a change to brindle-ingest: {change}. {interim} This ticket stays open until it ships.`
];
const declines = [
	`I asked the team. We'd rather not change brindle-ingest for this: guessing on your behalf could hide mistakes in other workspaces' data, and the fix on your side is a one-off. As everything's right now, I'll close this ticket, but reply here if it comes back.`,
	`I raised it with the team, and we've decided not to change brindle-ingest for it: it would change the figures of every workspace, not just yours. Since you're sorted, I'll close the ticket; reply here any time.`
];
const declineAcks = [`Fair enough.`, `OK, understood.`, `That's reasonable. Thanks again.`, ``];
const thanksLines = [`Thanks, I'll look out for it.`, `Great, thank you.`, `Appreciated, thanks.`, `Thanks for taking it seriously.`];
const closings = [`Great to hear. I'll close this, but reply to this email if anything comes back.`, `Glad that did it!`, `Brilliant, thanks for letting me know.`, `Good news. I'll close the ticket.`];
const checkLines = [`Could you let me know once you've had a chance to {act}?`, `When you've had a moment to {act}, reply here and I'll check the store on our side.`];
const nudges1 = [`Just checking in. Did you get a chance to {act}? I'm happy to look at the store again once you have.`, `Following up on my last message, in case it got buried. Let me know how you got on.`, `I don't want this to fall through the cracks. Is there anything else you need from me?`];
const nudgesEarly = [`Just checking in on my last question. When you have a moment, I can carry on from there.`, `Following up: I still need an answer to my question above to get any further. No rush.`];
const nudges2 = [`I haven't heard back, so I'll assume things are fine for now. If not, reply here and the ticket comes back to me with everything above.`, `One last nudge from me. Whenever you're ready, reply to this email and I'll pick it up again.`];
const closeNotes = [`Closed after two reminders with no reply. Reopens if the customer writes back.`, `No reply since @LAST@. Closing.`, `Closing: customer hasn't answered the last two messages.`];
const callIntros = [`Phone call, notes by {agent}. The customer's words as near as I could get them:`, `Logged from a call with {first}. Summary in their words:`];

// ---------------------------------------------------------------------------------------------------------------
// One ticket.
interface Msg {
	who: 'cust' | 'support' | 'eng' | 'mate' | 'snote' | 'enote';
	paras: string[];
	art?: string;
	gap: 'first' | 'support' | 'note' | 'staff' | 'cust' | 'team' | 'nudge' | 'close' | 'soon';
}

const totalWeight = topics.reduce((sum, topic) => sum + topic.weight, 0);
const ticketNumber = (index: number) => 48210 + index * 37 + Math.floor(mulberry32(0x5eed + index)() * 31);

const ticket = (index: number): { name: string; text: string } => {
	const r = mulberry32(0xb21d1e00 + index * 7919);
	const openDay = openDays[Math.floor((index * openDays.length) / ITEMS)]!;
	const late = openDay > Date.UTC(2026, 10, 4);
	const fits = (topic: Topic, country?: Country) => !(topic.after && openDay < topic.after) && !(country && topic.countries && !topic.countries.includes(country.name));
	let main = topics[0]!;
	for (let left = r() * totalWeight, i = 0; i < topics.length; i++) if ((left -= topics[i]!.weight) < 0) {
		main = topics[i]!;
		break;
	}
	if (!fits(main)) main = pick(r, topics.filter((topic) => fits(topic) && !topic.countries));
	const country = pick(r, countries.filter((c) => !main.countries || main.countries.includes(c.name)));

	// How it ends.
	const outcomes: Outcome[] = ['sorted', 'sorted', 'sorted', 'customer', 'customer', 'quiet', 'quiet'];
	if (main.change) outcomes.push('change', 'change', 'change');
	if (main.team) outcomes.push('team', 'team', 'team');
	let outcome = pick(r, outcomes);
	if (late && outcome === 'quiet') outcome = 'customer';
	const viaTeam = !!main.team && (outcome === 'sorted' || outcome === 'customer') && chance(r, 0.3);
	const quietEarly = outcome === 'quiet' && !main.urgent && main.turns[0]![1].includes('?') && chance(r, 0.4);
	const partial = quietEarly;

	// Other matters: a quick question, and up to two smaller matters taken through in full.
	const used = new Set<Topic>([main]);
	const sideOk = (topic: Topic) => !used.has(topic) && fits(topic, country) && !topic.app && !topic.urgent;
	const takeSide = () => {
		const topic = pick(r, topics.filter(sideOk));
		used.add(topic);
		return topic;
	};
	const quick = chance(r, 0.6) ? takeSide() : undefined;
	const sideCount = partial ? pick(r, [1, 2, 2]) : pick(r, [0, 1, 1, 2, 2, 2]);
	const sides = Array.from({ length: sideCount }, () => takeSide());
	const sidesEarly = !main.urgent && (partial || chance(r, 0.45));

	// Who and where.
	const female = chance(r, 0.5);
	const first = pick(r, female ? firstF : firstM);
	const last = pick(r, surnames);
	const head = pick(r, heads);
	const tail = pick(r, tails);
	const co = `${head} ${tail}`;
	const ws = `${head}-${tail.split(' ')[0]}`.toLowerCase();
	const domain = `${head.toLowerCase()}${tail.split(' ')[0]!.toLowerCase()}.${country.tld}`;
	const devMale = chance(r, 0.5);
	const devName = pick(r, (devMale ? firstM : firstF).filter((name) => name !== first));
	const mateF = pick(r, firstF.filter((name) => name !== first && name !== devName));
	const formerFirst = pick(r, firstF.filter((name) => name !== first && name !== mateF && name !== devName));
	const former = `${formerFirst} ${pick(r, surnames)}`;
	const admin = `${pick(r, firstM.filter((name) => name !== first && name !== devName))} ${pick(r, surnames)}`;
	const agent = pick(r, supportAgents);
	const eng = pick(r, engineers);
	const openMs = openDay + int(r, 7 * 60, 19 * 60) * MIN;
	const yearJoined = pick(r, [2021, 2022, 2023, 2023, 2024, 2024, 2025]);
	const off = offsetMinutes(country.zone, openMs);
	const title = pick(r, titles);
	const base: Slots = {
		first,
		last,
		full: `${first} ${last}`,
		title,
		titleLower: title.charAt(0).toLowerCase() + title.slice(1),
		co,
		ws,
		domain,
		email: `${first.toLowerCase().normalize('NFD').replace(/[^a-z]/g, '')}@${domain}`,
		country: country.name,
		country2: country.country2,
		tz: country.zone,
		cur: country.cur,
		cur2: country.cur2,
		lang: country.lang ?? 'German',
		app: head,
		devName,
		devPron: devMale ? 'him' : 'her',
		mateF,
		former,
		formerEmail: `${formerFirst.toLowerCase()}@${domain}`,
		admin,
		agent,
		eng,
		agency: pick(r, agencies),
		plan: pick(r, plans),
		am: pick(r, accountManagers),
		renewal: MONL[int(r, 0, 11)]!,
		events30: num(int(r, 150000, 9000000)),
		uploads30: String(int(r, 0, 24)),
		yearJoined: String(yearJoined),
		joinedMonth: MONL[int(r, 0, 11)]!,
		sdkWeb: `Web SDK 4.${int(r, 1, 6)}.${int(r, 0, 9)}`,
		sdkIos: `iOS SDK 3.${int(r, 8, 9)}.${int(r, 0, 5)}`,
		sdkAndroid: `Android SDK 3.${int(r, 8, 9)}.${int(r, 0, 5)}`,
		release: `${int(r, 3, 9)}.${int(r, 0, 24)}.${int(r, 0, 3)}`,
		exp: `exp-${int(r, 40000, 49999)}`,
		uploadBase: pick(r, salesNames),
		lastMonth: MONL[at(openMs).getUTCMonth() - 1]!,
		tokenTail: `${int(r, 1000, 9999)}${String.fromCharCode(97 + int(r, 0, 25))}${String.fromCharCode(97 + int(r, 0, 25))}`,
		offsetMin: String(off),
		offsetSummer: String(offsetMinutes(country.zone, Date.UTC(2026, 6, 1))),
		openMs: String(openMs),
		when: pick(r, whens)
	};
	base.week = String(Math.floor((openMs - Date.UTC(2025, 11, 29)) / (7 * DAY)));
	base.file = `${base.uploadBase}-week-${base.week}.csv`;
	{
		const localDay = midnight(openMs) - int(r, 2, 6) * DAY;
		const utcMs = off > 0 ? localDay + DAY - off * MIN + int(r, 5, Math.min(off, 170) - 5) * MIN : localDay + DAY + int(r, 5, Math.min(-off, 170) - 5) * MIN;
		base.exampleLocal = localIso(utcMs, off);
	}

	// Each topic gets its own dates and numbers, so two topics in one ticket never share them.
	const slotsOf = new Map<Topic, Slots>();
	const slots = (topic: Topic): Slots => {
		let s = slotsOf.get(topic);
		if (!s) {
			const day1 = midnight(openMs) - int(r, 4, 20) * DAY;
			const day2 = midnight(openMs) - int(r, 24, 50) * DAY;
			s = { ...base, day1: fullDay(day1), day1Ms: String(day1), day2: fullDay(day2), day2Ms: String(day2), n1: num(int(r, 2000, 60000)), n2: num(int(r, 900, 1999)) };
			topic.prep?.(r, s);
			s.need = fillWith(s, topic.need);
			s.cause = fillWith(s, topic.cause);
			s.Cause = s.cause.charAt(0).toUpperCase() + s.cause.slice(1);
			s.act = fillWith(s, topic.act);
			s.team = topic.team ?? '';
			s.mate = topic.team ? teamPeople[topic.team]! : '';
			slotsOf.set(topic, s);
		}
		return s;
	};
	const fillWith = (s: Slots, text: string): string =>
		text.replace(/\{(\w+)\}/g, (_, key: string) => {
			const value = s[key];
			if (value === undefined) throw new Error(`no slot ${key} in "${text.slice(0, 60)}"`);
			return value;
		});
	const m = slots(main);
	const f = (text: string) => fillWith(m, text);
	const ft = (topic: Topic, text: string) => fillWith(slots(topic), text);

	// The conversation.
	const msgs: Msg[] = [];
	let carry: string[] = [];
	const cust = (paras: string[], art?: string) => {
		msgs.push({ who: 'cust', paras: [...carry, ...paras], art, gap: 'cust' });
		carry = [];
	};
	const engSay = (paras: string[], art?: string, gap: Msg['gap'] = 'staff') => msgs.push({ who: 'eng', paras, art, gap });
	const artOf = (topic: Topic, t: Turn) => (t[2] ? ft(topic, t[2](r, slots(topic))) : undefined);
	const pastedBy = (topic: Topic, t: Turn) => (topic.pasted ?? []).includes(topic.turns.indexOf(t));
	const turn = (topic: Topic, t: Turn, extra?: [string, string]) => {
		const art = artOf(topic, t);
		const theirs = pastedBy(topic, t);
		const back = carry.length && topic === main && chance(r, 0.8) ? [pick(r, returnLeads)] : [];
		cust([...(!carry.length && chance(r, 0.3) ? [pick(r, custAcks)] : []), ...back, ft(topic, t[0]), ...(extra ? [`Unrelated, but ${lowerFirst(extra[0])}`] : [])], theirs ? art : undefined);
		engSay([ft(topic, t[1]), ...(!theirs && art ? [art] : []), ...(extra ? [`And on your other question: ${extra[1]}`] : [])]);
	};
	const sideThread = (topic: Topic, position: number, early: boolean) => {
		cust([pick(r, position > 0 ? leadsNext : early ? leadsFirst : leadsLate), ft(topic, pick(r, topic.open))]);
		const lead = pick(r, sideAsks);
		engSay([...(lead ? [lead] : []), ft(topic, lead ? topic.ask.replace(/^(Thanks|Happy to help)\. /, '') : topic.ask)]);
		turn(topic, topic.turns[0]!);
		turn(topic, topic.turns[1]!);
		if (topic.turns[2] && chance(r, 0.4)) turn(topic, topic.turns[2]);
		carry = [ft(topic, pick(r, topic.fixed))];
	};
	const runSides = (early: boolean) => sides.forEach((topic, position) => sideThread(topic, position, early));

	// The customer's first message, and first line's answer.
	const channel = pick(r, ['email', 'email', 'email', 'web form', 'web form', 'phone']);
	const opening = [...(chance(r, 0.5) ? [f(pick(r, backstories))] : []), f(pick(r, main.open))];
	let quickUsed = !quick;
	const supportParas: string[] = [pick(r, supportIntros)];
	if (quick && chance(r, 0.45)) {
		quickUsed = true;
		opening.push(`${pick(r, ['Also, a quick one:', 'And while I have you:', 'Separately,'])} ${lowerFirst(quick.quick[0])}`);
		supportParas.push(`On your quick question: ${quick.quick[1]}`);
	}
	supportParas.push(pick(r, supportPasses));
	msgs.push({ who: 'cust', paras: channel === 'phone' ? [f(pick(r, callIntros)), ...opening.map((p) => `> ${p}`)] : opening, gap: 'first' });
	msgs.push({ who: 'support', paras: supportParas, gap: 'support' });
	const extra = f(pick(r, escalationExtras));
	msgs.push({ who: 'snote', paras: [`Escalating to the data team. ${f(main.guess)}${extra ? ` ${extra}` : ''}`], gap: 'note' });
	{
		const intro = f(pick(r, engIntros));
		engSay([...(intro ? [intro] : []), f(main.ask)], undefined, 'staff');
	}

	const [given, found, ...rest] = main.turns;
	const quickLater = !quickUsed && chance(r, 0.7) ? quick!.quick : undefined;
	if (sidesEarly) runSides(true);
	turn(main, given!, quickLater);

	const handOver = () => {
		msgs.push({ who: 'enote', paras: [`Passing to ${main.team}: ${f(main.handover!)}`], gap: 'soon' });
		engSay([f(pick(r, passLines))], undefined, 'soon');
	};
	const nudgeOut = (early: boolean) => {
		engSay([f(pick(r, early ? nudgesEarly : nudges1))], undefined, 'nudge');
		engSay([f(pick(r, nudges2))], undefined, 'nudge');
		msgs.push({ who: 'enote', paras: [f(pick(r, closeNotes))], gap: 'close' });
	};

	if (quietEarly) nudgeOut(true);
	else {
		if (!sidesEarly) runSides(false);
		if (chance(r, 0.3)) {
			const art = artOf(main, found!);
			const theirs = pastedBy(main, found!);
			const back = carry.length && chance(r, 0.8) ? [pick(r, returnLeads)] : [];
			cust([...back, f(found![0])], theirs ? art : undefined);
			engSay([pick(r, holdings)], undefined, 'soon');
			engSay([f(found![1]), ...(!theirs && art ? [art] : [])], undefined, 'team');
		} else turn(main, found!);
		if (chance(r, 0.25)) msgs.push({ who: 'enote', paras: [f(pick(r, engNotes))], gap: 'soon' });
		const follow = rest.filter(() => chance(r, 0.85));
		if (follow.length >= 2 && chance(r, 0.35)) {
			cust([f(follow[0]![0]), f(follow[1]![0])]);
			engSay([f(follow[0]![1]), f(follow[1]![1])]);
			follow.slice(2).forEach((t) => turn(main, t));
		} else follow.forEach((t) => turn(main, t));

		const handfix = main.handfix && !main.done ? f(main.handfix) : undefined;
		if (outcome === 'sorted') {
			if (viaTeam) {
				handOver();
				msgs.push({ who: 'mate', paras: [f(pick(r, [`Hi {first}, {mate} from {team} here.`, `Hello {first}, this is {mate} from {team}.`])), f(main.teamFix!)], gap: 'team' });
			} else if (handfix && chance(r, 0.75)) engSay([`${pick(r, ['Done:', 'All done.', 'That part is sorted:'])} ${handfix}`]);
			if (main.change && chance(r, 0.3)) {
				cust([f(pick(r, main.fixed)), f(main.change[0])]);
				engSay([pick(r, declines)], undefined, 'team');
				const ack = pick(r, declineAcks);
				if (ack) cust([ack]);
			} else {
				cust([f(pick(r, main.fixed))]);
				if (chance(r, 0.6)) engSay([pick(r, closings)]);
			}
		} else if (outcome === 'change') {
			const said = !!handfix && chance(r, 0.45);
			if (said) {
				engSay([`${pick(r, ['Done:', 'All done.'])} ${handfix}`]);
				cust([f(pick(r, main.fixed)), f(main.change![0])]);
			} else cust([f(main.change![0])]);
			const interim = handfix && !said ? `In the meantime, ${/^I\b/.test(handfix) ? handfix : lowerFirst(handfix)}` : `Until then, the way round it is to ${m.act}.`;
			engSay([pick(r, changeLines).replace('{change}', f(main.change![1])).replace('{interim}', interim)]);
			if (chance(r, 0.5)) cust([pick(r, thanksLines)]);
		} else if (outcome === 'team') {
			handOver();
			if (chance(r, 0.6)) msgs.push({ who: 'mate', paras: [f(pick(r, mateAcks))], gap: 'team' });
			if (chance(r, 0.3)) cust([pick(r, [`Thanks, I'll look out for their reply.`, `OK, thanks for passing it on.`, `Great, thank you both.`])]);
		} else if (outcome === 'customer') {
			if (viaTeam) {
				handOver();
				msgs.push({ who: 'mate', paras: [`Hi {first}, {mate} from {team} here.`, `I've looked at whether we can deal with this on our side, and we can't yet: ${m.cause}. For now, you'll need to ${m.act}.`].map(f), gap: 'team' });
			} else engSay([pick(r, actLines).replace('{act}', m.act)]);
			cust([f(pick(r, willDos))]);
		} else {
			if (chance(r, 0.5)) engSay([pick(r, checkLines).replace('{act}', m.act)], undefined, 'soon');
			nudgeOut(false);
		}
	}

	// Times. Staff answer in working hours; the whole thread ends before the export.
	const place = (scale: number) => {
		const times: number[] = [];
		let now = openMs;
		const tr = mulberry32(0x71e5 + index);
		const working = (ms: number) => {
			let t = ms;
			const dow = () => at(t).getUTCDay();
			if (at(t).getUTCHours() >= 18) t = midnight(t) + DAY + 8 * HOUR + int(tr, 5, 80) * MIN;
			else if (at(t).getUTCHours() < 8) t = midnight(t) + 8 * HOUR + int(tr, 5, 80) * MIN;
			while (dow() === 0 || dow() === 6) t = midnight(t) + DAY + 8 * HOUR + int(tr, 5, 80) * MIN;
			return t;
		};
		for (const msg of msgs) {
			const g = msg.gap;
			const minutes =
				g === 'first' ? 0 : g === 'support' ? int(tr, 20, 240) : g === 'soon' ? int(tr, 2, 25) : g === 'note' ? int(tr, 1, 12) : g === 'staff' ? int(tr, 40, 1300) : g === 'cust' ? int(tr, 30, 2000) : g === 'team' ? int(tr, 1400, 4300) : g === 'nudge' ? int(tr, 4, 6) * 1440 + int(tr, -100, 140) : int(tr, 2, 4) * 1440 + int(tr, -100, 140);
			now += Math.round(minutes * (g === 'first' ? 1 : scale)) * MIN;
			if (msg.who !== 'cust') now = working(now);
			else if (at(now).getUTCHours() < 6) now += int(tr, 6, 9) * HOUR;
			times.push(now);
		}
		return times;
	};
	let times = place(1);
	for (let scale = 0.7; times.at(-1)! > LAST_ACTIVITY && scale > 0.05; scale *= 0.7) times = place(scale);
	const custTimes = msgs.map((msg, i) => (msg.who === 'cust' ? times[i]! : 0)).filter(Boolean);
	const lastCustomer = dayMonth(custTimes.at(-1)!);

	// Write it out.
	const subject = (() => {
		const roll = r();
		if (roll < 0.62) return f(pick(r, main.subjects));
		if (roll < 0.84) return pick(r, vagueSubjects);
		const other = sides[0] ?? quick;
		return other ? ft(other, pick(r, other.subjects)) : f(pick(r, main.subjects));
	})();
	const number = ticketNumber(index);
	const escalatedAt = times[2]!;
	const out: string[] = [];
	out.push(`# BR-${number}: ${subject}`, '');
	out.push(`- Opened: ${stamp(openMs)} UTC, by ${channel}`);
	out.push(`- From: ${m.full}, ${m.title}, ${co} (${m.email})`);
	out.push(`- Workspace: ${ws}`);
	out.push(`- First line: ${agent}`);
	out.push(`- Escalated to the data team: ${fullDay(escalatedAt)}`, '');

	// The workspace panel support sees.
	out.push('## Workspace', '');
	const apps = [`Website (${m.sdkWeb})`, `${head} for iPhone (${m.sdkIos})`, `${head} for Android (${m.sdkAndroid})`];
	if (main.app) apps.push(f(main.app));
	const facts: string[][] = [
		['Workspace', ws],
		['Plan', `${m.plan}, customer since ${m.joinedMonth} ${yearJoined}`],
		['Country and time zone', `${country.name.replace(/^the /, 'The ')}, ${country.zone}`],
		['Apps sending events', apps.join('; ')],
		['Events received, last 30 days', m.events30!],
		['Uploads, last 30 days', m.uploads30!],
		['Members', `${int(r, 3, 30)} (${pick(r, ['1 admin', '2 admins', '3 admins'])})`],
		['Account manager', m.am!]
	];
	out.push(table(['Field', 'Value'], facts), '');
	if (chance(r, 0.5)) {
		const rows = Array.from({ length: int(r, 3, 6) }, (_, i) => {
			const when = openMs - (i * int(r, 3, 8) + int(r, 1, 3)) * DAY;
			return [`${pick(r, uploadNames)}-${MON[at(when).getUTCMonth()]!.toLowerCase()}-${pad(at(when).getUTCDate())}.csv`, num(int(r, 120, 4800)), i % 3 === 2 ? m.mateF! + ' ' + pick(r, surnames) : m.full!, `${shortDay(when)}, ${clock(when + int(r, 480, 1000) * MIN)}`];
		});
		out.push('### Recent uploads', '', table(['File', 'Rows stored', 'Uploaded by', 'When'], rows), '');
	}
	if (chance(r, 0.4)) {
		const days = daysBefore(m, 1, 7);
		const rows = kindsBase.filter(() => chance(r, 0.85)).map((kind) => {
			const scale = kind === 'view' ? 9000 : kind === 'click' ? 3000 : kind === 'search' ? 1200 : 400;
			return [kind, ...days.map(() => num(int(r, scale / 2, scale * 2)))];
		});
		out.push('### Events received by kind, last 7 days', '', table(['Kind', ...days.map((d) => `${WD[at(d).getUTCDay()]} ${at(d).getUTCDate()}`)], rows), '');
	}
	if (chance(r, 0.25)) {
		const rows = Array.from({ length: int(r, 1, 3) }, (_, i) => {
			const when = openMs - (i * 30 + int(r, 5, 25)) * DAY;
			return [`exp-${int(r, 30000, 39999)}`, pick(r, ['events', 'events', 'events_detail']), shortDay(when), shortDay(when + int(r, 0, 1) * DAY)];
		});
		out.push('### Exports', '', table(['Job', 'Dataset', 'Requested', 'Delivered'], rows), '');
	}
	if (chance(r, 0.4)) {
		const rows = Array.from({ length: int(r, 1, 3) }, (_, i) => {
			const other = pick(r, topics);
			return [`BR-${number - int(r, 400, 3000) * (i + 1)}`, `${MON[int(r, 0, Math.max(0, at(openMs).getUTCMonth() - 1))]} 2026`, pick(r, other.subjects.filter((subject) => !subject.includes('{')))];
		});
		out.push('### Earlier tickets', '', table(['Ticket', 'Opened', 'Subject'], rows), '');
	}

	out.push('## Thread', '');
	const header = (msg: Msg, ms: number) => {
		if (msg.who === 'cust' && msg.gap === 'first' && channel === 'phone') return `### Phone call with ${m.full}, logged by ${agent} · ${stamp(ms)}`;
		if (msg.who === 'cust') return `### ${m.full} · ${stamp(ms)}`;
		if (msg.who === 'support') return `### ${agent} (Support) · ${stamp(ms)}`;
		if (msg.who === 'eng') return `### ${eng} (Data team) · ${stamp(ms)}`;
		if (msg.who === 'mate') return `### ${m.mate} (${main.team!.replace(/^the /, '').replace(/^./, (c) => c.toUpperCase())}) · ${stamp(ms)}`;
		if (msg.who === 'snote') return `### Internal note · ${agent} · ${stamp(ms)}`;
		return `### Internal note · ${eng} · ${stamp(ms)}`;
	};
	let firstCust = true;
	let firstEng = true;
	msgs.forEach((msg, i) => {
		const body: string[] = [];
		if (msg.who === 'cust') {
			const greet = firstCust ? pick(r, firstGreetings) : f(pick(r, replyGreetings));
			if (greet && !(firstCust && channel === 'phone')) body.push(greet);
			body.push(...msg.paras);
			if (msg.art) body.push(msg.art);
			const sign = firstCust ? f(pick(r, custSignoffs)) : f(pick(r, replySignoffs));
			if (sign && !(firstCust && channel === 'phone')) body.push(sign);
			firstCust = false;
		} else if (msg.who === 'support') {
			body.push(f(pick(r, firstStaffGreetings)), ...msg.paras, `${pick(r, ['Thanks,', 'Best,', 'Kind regards,'])}\n${agent}\nBrindle Support`);
		} else if (msg.who === 'eng') {
			const greet = f(pick(r, firstEng ? firstStaffGreetings : engGreetings));
			firstEng = false;
			if (greet) body.push(greet);
			body.push(...msg.paras);
			if (msg.art) body.push(msg.art);
			body.push(f(pick(r, engSignoffs)));
		} else if (msg.who === 'mate') {
			body.push(...msg.paras, `${m.mate}`);
		} else body.push(...msg.paras);
		out.push(header(msg, times[i]!), '', body.join('\n\n'), '');
	});
	return { name: `BR-${number}.md`, text: out.join('\n').replace(/\n{3,}/g, '\n\n').replace('@LAST@', lastCustomer) };
};

const folder = join(root, 'support', 'escalations');
mkdirSync(folder, { recursive: true });
writeFileSync(
	join(folder, 'README.md'),
	[
		'# Escalations to the data team',
		'',
		'Tickets that Brindle support escalated to the data team between 1 September and 13 November 2026, exported from',
		'the help desk on 20 November 2026. One file per ticket, named by its help desk number.',
		'',
		"Each file holds the ticket's header, the workspace panel support sees, and the whole thread, internal notes",
		'included. Tags, statuses and assignees were not part of the export.',
		''
	].join('\n')
);
for (let index = 0; index < ITEMS; index++) {
	const { name, text } = ticket(index);
	writeFileSync(join(folder, name), text);
}
