// Writes the long material of this entry's long task: every ticket Copperleaf Coffee's customer care handled
// between September 21 and November 13, 2026, one Markdown file each, under support/tickets/.
// Deterministic: fixed seeds, no clock, no network.
//   bun long/generate.ts <workspace root>
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** How many tickets to write. Everything else is derived from it. */
const ITEMS = 249;

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
const upperFirst = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

// ---------------------------------------------------------------------------------------------------------
// Dates. Times are Pacific, kept as plain clock readings. Everything happens before the export on November 20.
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WDL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const utc = (ms: number) => new Date(ms);
const clock = (ms: number) => {
	const d = utc(ms);
	const h = d.getUTCHours();
	return `${h % 12 || 12}:${pad(d.getUTCMinutes())} ${h < 12 ? 'AM' : 'PM'}`;
};
const stamp = (ms: number) => {
	const d = utc(ms);
	return `${WD[d.getUTCDay()]}, ${MON[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}, ${clock(ms)}`;
};
const monthDay = (ms: number) => `${MONL[utc(ms).getUTCMonth()]} ${utc(ms).getUTCDate()}`;
const shortDate = (ms: number) => `${MON[utc(ms).getUTCMonth()]} ${utc(ms).getUTCDate()}, ${utc(ms).getUTCFullYear()}`;
const fullDay = (ms: number) => `${WDL[utc(ms).getUTCDay()]}, ${monthDay(ms)}`;
const isoDate = (ms: number) => `${utc(ms).getUTCFullYear()}-${pad(utc(ms).getUTCMonth() + 1)}-${pad(utc(ms).getUTCDate())}`;
const midnight = (ms: number) => ms - (ms % DAY);
const FIRST_DAY = Date.UTC(2026, 8, 21);
const LAST_DAY = Date.UTC(2026, 10, 13);
const EXPORT = Date.UTC(2026, 10, 20);
const CLOCKS_BACK = Date.UTC(2026, 10, 1);
const SHOP_OPENED = Date.UTC(2025, 2, 10);
const IMPORTED = Date.UTC(2025, 3, 15);
const days: number[] = [];
for (let day = FIRST_DAY; day <= LAST_DAY; day += DAY) days.push(day);
/** The next roast day, Monday or Thursday, after the day of `ms`. */
const nextRoast = (ms: number) => {
	let day = midnight(ms) + DAY;
	while (![1, 4].includes(utc(day).getUTCDay())) day += DAY;
	return day;
};

// ---------------------------------------------------------------------------------------------------------
// People, places and things.
const firstF = ['Dana', 'Maribel', 'Keisha', 'Laurel', 'Priya', 'Colette', 'Yvonne', 'Rosa', 'Tamsin', 'Gretchen', 'Naomi', 'Lucia', 'Bethany', 'Ming', 'Ayesha', 'Corinne', 'Shauna', 'Ingrid', 'Delia', 'Farah', 'Josephine', 'Kayla', 'Opal', 'Renata'];
const firstM = ['Marcus', 'Elliott', 'Tomas', 'Darnell', 'Kenji', 'Russell', 'Abdul', 'Graham', 'Wes', 'Arturo', 'Phil', 'Desmond', 'Ivan', 'Curtis', 'Nathaniel', 'Omar', 'Leland', 'Ravi', 'Hector', 'Gideon', 'Malcolm', 'Teddy', 'Bram', 'Jonah'];
const surnames = ['Whitfield', 'Okonkwo', 'Alvarez', 'Lindqvist', 'Brennan', 'Castellano', 'Haddad', 'Nakamura', 'Pruitt', 'Delacroix', 'Ostrowski', 'Banerjee', 'McAllister', 'Fontaine', 'Yazzie', 'Gruber', 'Abernathy', 'Thibodeaux', 'Kowalczyk', 'Mbatha', 'Sorensen', 'Villanueva', 'Ashby', 'Rinaldi', 'Quarles', 'Tran', 'Hollister', 'Eberhardt', 'Saldana', 'Ferreira'];
const nicks: Record<string, string> = { Nathaniel: 'Nate', Josephine: 'Jo', Malcolm: 'Mal', Gretchen: 'Gret', Elliott: 'Eli', Desmond: 'Des', Bethany: 'Beth', Leland: 'Lee', Russell: 'Russ', Corinne: 'Cory', Abdul: 'Abe', Renata: 'Ren' };
const agents = ['Marisol', 'Devon', 'Hannah', 'Theo', 'Jules', 'Kwame', 'Lena', 'Rafael'];
const WEB = 'the web team';
const teamPeople: Record<string, string> = {
	'the web team': 'Ines',
	'the roastery': 'Sam',
	dispatch: 'Rory',
	'the coffee club team': 'Beatriz',
	finance: 'Owen',
	'the wholesale team': 'Carmen',
	'the marketing team': 'Tess',
	'the café': 'Nico',
	'the brew school': 'Yusuf'
};
const places = [
	['Spokane', 'WA', '99203'], ['Bend', 'OR', '97701'], ['Boise', 'ID', '83702'], ['Sacramento', 'CA', '95816'], ['Missoula', 'MT', '59801'],
	['Eugene', 'OR', '97401'], ['Tacoma', 'WA', '98403'], ['Reno', 'NV', '89501'], ['Fort Collins', 'CO', '80521'], ['Madison', 'WI', '53703'],
	['Asheville', 'NC', '28801'], ['Burlington', 'VT', '05401'], ['Ann Arbor', 'MI', '48104'], ['Austin', 'TX', '78704'], ['Pittsburgh', 'PA', '15213'],
	['Portland', 'ME', '04101'], ['Santa Fe', 'NM', '87501'], ['Duluth', 'MN', '55802'], ['Savannah', 'GA', '31401'], ['Bellingham', 'WA', '98225']
] as const;
const streets = ['418 Alder Street', '2271 NE Halsey Street', '93 Orchard Lane', '1506 W Maple Avenue', '77 Ridgeview Court', '310 Cedar Hollow Road', '12 Harbor View Drive', '4402 Linden Avenue, Apt 3B', '850 Juniper Way', '29 Mill Pond Road', '6 Quarry Hill Road', '1720 S Elm Street, Unit 4'];
const coffees = [
	{ name: 'Huila La Esperanza', origin: 'Colombia', process: 'washed', producer: "the La Esperanza growers' association in Huila", alt: '1,750', notes: 'panela, red apple and cocoa' },
	{ name: 'Guji Hambela', origin: 'Ethiopia', process: 'natural', producer: 'the Hambela washing station in Guji', alt: '2,100', notes: 'blueberry, jasmine and dark chocolate' },
	{ name: 'Nyeri Gatomboya', origin: 'Kenya', process: 'washed', producer: 'the Gatomboya factory in Nyeri, run by a farmers’ cooperative', alt: '1,800', notes: 'blackcurrant, grapefruit and brown sugar' },
	{ name: 'Huehuetenango Finca Rosma', origin: 'Guatemala', process: 'washed', producer: 'the Recinos family at Finca Rosma', alt: '1,650', notes: 'toffee, plum and almond' },
	{ name: 'Cerrado Sunrise', origin: 'Brazil', process: 'pulped natural', producer: 'Fazenda Boa Vista in the Cerrado Mineiro', alt: '1,100', notes: 'hazelnut, milk chocolate and caramel' },
	{ name: 'Cajamarca Co-op', origin: 'Peru', process: 'washed', producer: 'a cooperative of about 120 smallholders in Cajamarca', alt: '1,900', notes: 'orange, honey and walnut' },
	{ name: 'Kayanza Ngozi', origin: 'Burundi', process: 'washed', producer: 'the Ngozi washing station in Kayanza', alt: '1,850', notes: 'cranberry, black tea and cane sugar' },
	{ name: 'Sumatra Lintong', origin: 'Indonesia', process: 'wet-hulled', producer: 'smallholders around Lake Toba', alt: '1,400', notes: 'cedar, dark cocoa and spice' }
];
const blends = ['Copperleaf House Blend', 'Night Shift Espresso', 'Morning Ledger'];
const allCoffees = [...coffees.map((coffee) => coffee.name), ...blends];
const grinds = ['whole bean', 'espresso', 'drip', 'pour-over', 'French press', 'cold brew'];
const oldPlans = [
	['2', "one 12 oz bag of the roaster's choice a month"], ['3', 'two 12 oz bags a month'], ['5', 'one 12 oz bag every two weeks'],
	['7', 'two 12 oz bags every two weeks'], ['8', 'a 2 lb bag a month'], ['11', 'the office box, 5 lb a month'], ['12', 'one bag of decaf a month']
] as const;
const gear = [
	{ name: 'electric burr grinder', fault: 'grinding unevenly, with big chunks among the powder', cause: 'a burr that has worked loose', fix: 'taking the top burr out, brushing the chamber and seating it again until it clicks' },
	{ name: 'hand grinder', fault: 'slipping, so the handle turns but the burr barely moves', cause: 'the drive pin having come out of its slot', fix: 'unscrewing the adjustment ring and pushing the pin back into place' },
	{ name: 'gooseneck kettle', fault: 'switching itself off before the water boils', cause: 'scale on the heating plate', fix: 'running it twice with one part white vinegar to three parts water' },
	{ name: 'cold brew jar', fault: 'leaking from the tap', cause: 'the tap washer sitting crooked', fix: 'taking the tap off and refitting the washer flat, ridge side out' }
];
const pwms = ['the iPhone', 'Google Password Manager', '1Password', 'Bitwarden', 'Samsung Pass', 'the Chrome autofill'];
const carriers = ['USPS', 'UPS'];
const hubs = ['Salt Lake City', 'Denver', 'Kansas City', 'Sacramento', 'Chicago', 'Memphis', 'Portland'];
const declines = ['card expired', 'do not honor', 'insufficient funds', 'card reported lost'];
const classes = ['Pour-over at Home', 'Home Espresso 101', 'Milk and Latte Art'];
const items = [['scarf', 'a green wool scarf with tassels'], ['umbrella', 'a black umbrella with a wooden handle'], ['reading glasses', 'tortoiseshell reading glasses in a blue case'], ['water bottle', 'a dented steel water bottle with stickers on it'], ['notebook', 'a small red notebook with a pencil in the spine']] as const;
const intlCities = ['Vancouver', 'Toronto', 'Lisbon', 'Dublin', 'Mexico City', 'Melbourne'];

const money = (cents: number) => {
	const dollars = Math.floor(cents / 100);
	return `$${dollars.toString().replace(/(\d)(?=(\d{3})+$)/g, '$1,')}.${pad(cents % 100)}`;
};
/** An amount as the orders page on shop.copperleaf.coffee shows it. */
const shownMoney = (cents: number) => {
	const dollars = Math.floor(cents / 100);
	return `$${dollars.toString().replace(/(\d)(?=(\d{3})+$)/g, '$1,')}.${cents % 100}`;
};

type Area = 'profile' | 'orders' | 'none';
type Outcome = 'sorted' | 'workaround' | 'change' | 'team' | 'customer';
type Slots = Record<string, string>;
type Art = (r: Rand, s: Slots) => string;
/** A customer's message and care's answer; the artifact goes with the customer's message, or care's with 'a'. */
type Turn = [string, string, Art?, 'a'?];

interface Topic {
	key: string;
	/** Topics of one group never meet in one ticket. */
	group: string;
	area: Area;
	weight: number;
	team: string;
	subjects: string[];
	/** The customer's first message about it, and a detail they may add. */
	open: string[];
	more: string[];
	/** The topic as a quick side question, and its answer. */
	quick: [string, string];
	/** Care's first answer, which asks for something. */
	reply: string;
	/** Exchanges in order. The first gives what the reply asked for and asks for `need`; the second settles the
	 * matter; the rest are follow-up questions. */
	turns: Turn[];
	need?: string;
	/** How many turns come before care waits on the customer for `need` (0: right after the reply). */
	needAt?: number;
	/** How many turns come before the ticket goes to the team. */
	handAfter?: number;
	/** How many turns come before the workaround, and the customer's words that lead to it. */
	workAfter?: number;
	workAsk?: string;
	workByCare?: boolean;
	/** The cause, as a clause, for a colleague who answers later. */
	cause: string;
	/** The customer's message when it worked. */
	fixed: string[];
	/** Care offers it, the customer accepts it. */
	workaround?: [string, string];
	/** The web team's message saying what it will change. */
	change?: string;
	/** The team's message that settles the matter. */
	teamSorts?: string;
	/** The internal note when the ticket goes to the team. */
	handover: string;
	outcomes: Outcome[];
	sortedViaTeam?: boolean;
	mainOnly?: boolean;
	oldStoreOnly?: boolean;
	clubOnly?: boolean;
	/** The status of the customer's latest order when this is the main matter. */
	status?: string;
}

// ---------------------------------------------------------------------------------------------------------
// Pasted artifacts.
const table = (head: string[], rows: string[][]) =>
	[`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`, ...rows.map((row) => `| ${row.join(' | ')} |`)].join('\n');
const fence = (lines: string[]) => ['```', ...lines, '```'].join('\n');
/** The profile page as a customer copies it: heading, sign-in line, the old store line, the form. */
const profilePage = (s: Slots, login: string, loginBox: string, name: string) =>
	fence([name || login, `Signed in as ${login}`, '', ...(s.oldStore === 'yes' ? [`You joined us from our old store, on plan ${s.plan}.`, ''] : []), 'Login', loginBox, 'Name', name, 'Email', s.email!, 'Save', '', 'Your orders']);
type Order = [number, string, number, string, string];
const orders = (s: Slots) => JSON.parse(s.history!) as Order[];

const arts: Record<string, Art> = {
	refused: (r, s) => profilePage(s, s.badLogin!, s.badLogin!, s.nameBox!),
	taken: (r, s) => profilePage(s, s.goodLogin!, s.goodLogin!, s.nameBox!),
	autofill: (r, s) => profilePage(s, s.email!, s.email!, s.full!),
	plain: (r, s) => profilePage(s, s.login!, s.login!, s.nameBox!),
	signIn: (r, s) => fence(['Sign in to your Copperleaf account', '', `Login      ${s.email}`, 'Password   ••••••••••', '', 'Login or password is incorrect.', '', 'Forgot your login?   Forgot your password?']),
	bookmark: (r, s) => fence([`Name     Copperleaf account`, `URL      https://shop.copperleaf.coffee/users/${s.oldLogin}`, `Folder   Bookmarks bar`]),
	quarantine: (r, s) =>
		table(
			['Received', 'From', 'Subject', 'Held because'],
			s.resetDays!.split('|').slice(-Number(s.n)).map((day) => [`${day}, ${int(r, 8, 21)}:${pad(int(r, 0, 59))}`, 'noreply@copperleaf.coffee', 'Reset your Copperleaf password', 'contains a link; sender not on the allow list'])
		),
	receipt: (r, s) =>
		fence([`From:     Copperleaf Coffee <orders@copperleaf.coffee>`, `To:       ${s.receiptTo}`, `Date:     ${s.pastDate}, ${int(r, 7, 9)}:${pad(int(r, 0, 59))} PM`, `Subject:  Thanks for your order ${s.order}`, ``, `${s.coffee} 12 oz, ${s.grind}  x${s.bags}`, `Shipping                     ${s.shipping}`, `Total                        ${s.total}`, ``, `Questions? Reply to this email or write to care@copperleaf.coffee.`]),
	ordersPage: (r, s) => {
		const history = orders(s);
		const asked = history.findIndex((order) => order[3] === s.order2);
		const shown = history.slice(-Math.max(int(r, 5, 10), asked < 0 ? 0 : history.length - asked));
		const rows = shown.map(([placed, status, cents]) => `${isoDate(placed)}   ${status.padEnd(9)}   ${shownMoney(cents)}`);
		return fence(['Your recent oders', '', 'Placed       Status      Total', ...(shown.length < history.length ? [`[${history.length - shown.length} older orders]`] : []), ...rows]);
	},
	adminOrders: (r, s) => table(['Order', 'Placed', 'Items', 'Total', 'Status'], orders(s).slice(-int(r, 4, 7)).reverse().map(([placed, status, cents, number, what]) => [number, shortDate(placed), what, money(cents), status])),
	statement: (r, s) => {
		const history = orders(s);
		const opened = Number(s.openMs);
		const monthStart = Date.UTC(utc(opened).getUTCFullYear(), utc(opened).getUTCMonth(), 1);
		const year = history.filter(([placed]) => placed >= Date.UTC(2026, 0, 1) && placed < monthStart).slice(-30);
		return table(['Order', 'Placed', 'Items', 'Total'], (year.length ? year : history.slice(-4)).map(([placed, , cents, number, what]) => [number, shortDate(placed), what, money(cents)]));
	},
	attempts: (r, s) =>
		table(
			['Attempt', 'Card', 'Amount', 'Answer from the bank'],
			Array.from({ length: Number(s.tries) }, (_, i) => [`${s.pastShort}, ${pad(9 + i * 5)}:${pad(int(r, 0, 59))}`, `Visa ending ${s.card4}`, s.total!, s.decline!])
		),
	tracking: (r, s) =>
		table(
			['Date', 'Time', 'Where', 'Event'],
			[
				[s.shipShort!, `${int(r, 3, 5)}:${pad(int(r, 10, 59))} PM`, 'Tacoma, WA', 'Picked up'],
				[s.shipShort!, `${int(r, 8, 11)}:${pad(int(r, 10, 59))} PM`, 'Tacoma, WA', 'Departed facility'],
				[s.hubShort!, `${int(r, 1, 6)}:${pad(int(r, 10, 59))} AM`, `${s.hub}`, 'Arrived at hub'],
				[s.hubShort!, `${int(r, 7, 11)}:${pad(int(r, 10, 59))} AM`, `${s.hub}`, 'In transit to next facility']
			]
		),
	bank: (r, s) =>
		table(
			['Date', 'Description', 'Amount', 'State'],
			[
				[s.pastShort!, 'CPRLF COFFEE TACOMA WA', `-${s.total}`, 'Pending'],
				[s.pastShort!, 'CPRLF COFFEE TACOMA WA', `-${s.total}`, 'Pending'],
				[s.pastShort!, pick(r, ['GROCERY OUTLET', 'SHELL OIL 5741', 'CITY LIGHT', 'PCC MARKETS', 'TRADER JOES 211']), `-$${int(r, 11, 90)}.${pad(int(r, 0, 99))}`, 'Posted']
			]
		),
	brew: (r, s) => fence([`Method     ${s.method}`, `Coffee     ${s.dose} g, ground on setting ${s.setting}`, `Water      ${s.water} g at about ${int(r, 195, 205)}°F`, `Time       ${s.brewTime}`, `Water      ${pick(r, ['filtered tap', 'tap', 'bottled spring', 'distilled'])}`]),
	label: (r, s) => fence([`COPPERLEAF COFFEE · TACOMA`, s.coffee!.toUpperCase(), s.wrongGrind!.toUpperCase(), `12 oz / 340 g`, `Roasted ${s.roast}   Lot ${s.lot}`]),
	club: (r, s) => table(['Delivery', 'Coffee', 'Grind', 'Bags'], [s.d1!, s.d2!, s.d3!, s.d4!].map((day) => [day, s.clubCoffee!, s.clubGrind!, s.clubBags!])),
	refund: (r, s) => table(['Refund', 'Issued', 'Card', 'Amount', 'State'], [[s.refund!, s.refundDate!, `Visa ending ${s.card4}`, s.refundAmt!, 'sent to the bank']]),
	gift: (r, s) => table(['Gift order', 'Placed', 'Item', 'Send to', 'Sent'], [[s.order!, s.pastDate!, s.giftItem!, s.recipTypo!, `${s.pastDate}, ${int(r, 8, 11)}:${pad(int(r, 0, 59))} AM`]]),
	basket: (r, s) => fence([`${s.coffee} 12 oz, ${s.grind}  x2      ${s.bagPair}`, `${s.Gear}             ${s.gearPrice}`, ``, `Discount code   ${s.code}`, `This code isn't valid.`, ``, `Subtotal        ${s.basketTotal}`]),
	booking: (r, s) => fence([`Booking confirmed: ${s.class}`, `When     ${s.cd1}, 10:00 AM to 12:00 PM`, `Where    The roastery, 1140 Foundry Street, Tacoma`, `Places   ${s.places}`, `Ref      BS-${int(r, 2000, 2999)}`]),
	lab: (r, s) => table(['Lot', 'Tested', 'Caffeine, mg per 12 oz cup', 'Regular coffee, for comparison'], [[s.lot!, s.labDate!, s.caf!, 'about 200']])
};

// ---------------------------------------------------------------------------------------------------------
// Topics. Slots in braces are filled per ticket.
const topics: Topic[] = [
	{
		key: 'login-format',
		group: 'login',
		area: 'profile',
		weight: 3,
		team: WEB,
		subjects: ["Login won't change", 'Profile not saving', 'Changed my login but it changed back?'],
		open: [
			`I changed my login on the shop to {badLogin} and pressed Save, and the page showed the new one, so I thought that was that. Today it won't let me sign in with it, and my profile has the old login again. What happened?`,
			`Every time I change my login to {badLogin}, the profile page looks as if it worked, but when I come back it's the old one again. I've tried three times now and I'm starting to think I'm imagining it.`
		],
		more: [`My {spouseRel} says I should leave it alone, but it bugs me every time I sign in.`, `I'd like to sort it before my next order, because I keep getting confused about which login I'm meant to use.`],
		quick: [`What can a login on the shop have in it?`, `Lowercase letters, digits and underscores, between 3 and 30 of them. Capitals, spaces, dots and dashes aren't accepted, so "Mary.Ellen" would have to be something like "mary_ellen".`],
		reply: `Sorry for the runaround. Could you try once more and, straight after pressing Save, copy what the page shows? I'm most interested in whether there's a "Profile updated." line at the top.`,
		turns: [
			[`Here's the page right after Save. No "Profile updated." anywhere, now you mention it.`, `Thanks, that's the clue. When the shop turns a save down, the page comes back with what you typed but without "Profile updated.", and nothing is kept. Logins can only have lowercase letters, digits and underscores, 3 to 30 of them, and "{badLogin}" has {badWhy}. Which login would you like instead? Send me a couple written that way and I'll check they're free.`, arts.refused],
			[`How about {goodLogin}? Or {goodLogin2} if that's gone.`, `"{goodLogin}" is free. Put it in the Login box and press Save, and this time you should see "Profile updated." at the top. Your profile's web address has your login in it, so update any bookmark to the profile page afterwards.`],
			[`Do I sign in with the new one from now on?`, `Yes, the new login and your usual password. Your orders and your coffee club don't change.`],
			[`Does my {spouseRel} need to do anything? We share the account on the kitchen tablet.`, `Only sign in again with the new login the next time the tablet asks. If its browser remembered the old one, it will offer that once and then learn the new one.`]
		],
		need: 'a couple of logins you would like instead, in lowercase letters, digits and underscores',
		cause: `the shop only accepts logins made of lowercase letters, digits and underscores, so "{badLogin}", with {badWhy}, was never saved, and the page doesn't say so`,
		fixed: [`Done, it took {goodLogin} and said "Profile updated." this time. Thanks!`, `That worked, and I can sign in with it. I wish the page had just told me, but thank you.`],
		workAfter: 1,
		workAsk: `I really wanted it to look like my name, capitals and all. Is there no way?`,
		workaround: [`I'm afraid not: the closest the shop allows to "{badLogin}" is "{goodLogin}". Capitals and spaces are fine in the Name box, though, so if you put "{full}" there, that's what the heading of your profile will show.`, `OK, {goodLogin} it is, with my proper name in the Name box. Thanks.`],
		change: `When the shop turns a save down, the profile page comes back with what you typed and no message at all, so it looks as if it worked. I've added a change to our list: the page will say when a save didn't go through, and the Login box will say what it accepts. In the meantime, "{goodLogin}" will save.`,
		handover: `Customer's login change to "{badLogin}" keeps being turned down ({badWhy}) and the page gives no sign of it. Explained the rule. Can the web team look at what the page shows?`,
		outcomes: ['sorted', 'sorted', 'workaround', 'change', 'change', 'customer']
	},
	{
		key: 'login-taken',
		group: 'login',
		area: 'profile',
		weight: 2,
		team: WEB,
		subjects: ['Is my login taken?', "Can't get the login I want", 'Login keeps changing back'],
		open: [
			`I'm trying to change my login to {goodLogin}, which is what I use everywhere, but it won't stick. The page shows it after I press Save and then it's back to {login} the next time I look.`,
			`Is the login {goodLogin} taken? I've tried to switch to it a few times and it never stays, and I can't see anything wrong with it. If it's mine on some old account, I'd like it back.`
		],
		more: [`I'm not fussed about an old account if there is one; I just want the name.`, `If it's someone else's, fair enough, but it would be a strange coincidence.`],
		quick: [`Do capitals count as different in a login? Could I be {goodLogin} if someone has the same with a capital?`, `They don't: the shop treats capitals and lowercase as the same, and only lowercase is accepted anyway, so each spelling belongs to one account.`],
		reply: `I can look into that. "{goodLogin}" is written the way the shop accepts, so the likeliest reason is that another account already has it. So that I don't give away anything about someone else's account, could you tell me any other email addresses you might have used with us, and roughly when?`,
		turns: [
			[`It could be {oldEmail}. I used that until about {oldYear}. Here's the page straight after I press Save, in case it helps.`, `Thanks. There is an account on {oldEmail}, and it does hold "{goodLogin}". It was made on {made} and has {oldOrders}. Before I do anything with it, I need to know it's yours: could you tell me the town it shipped to, or the last four digits of the card on one of its orders?`, arts.taken],
			[`It shipped to {oldTown}. Card ending {card4b}, I think.`, `That matches, so the login belongs to your own older account. The shop won't let two accounts share a login, even when they belong to the same person, which is why yours kept going back to {login}.`],
			[`Can the two accounts be joined, so I see all my orders in one place?`, `They can, though it's done by hand: the older account's orders are moved onto this one and the older account is closed, which frees the login.`],
			[`Will closing the old account cancel anything on it?`, `Nothing is running on it: its last order was in 2025 and it has no coffee club, so closing it only frees the login.`]
		],
		need: 'the town the older account shipped to, or the last four digits of a card used on it',
		handAfter: 3,
		workAfter: 3,
		cause: `the login is held by the customer's own older account on {oldEmail}, and two accounts can't share a login`,
		fixed: [`It's mine again! And the old orders are there too. Thank you both.`, `Set it just now and it saved first time. Nice to see my orders from the old account in the list as well.`],
		workaround: [`If you'd rather not wait for the accounts to be joined, "{goodLogin2}" is free and would save now. The older account stays as it is, and you can still sign in to it to see its orders.`, `Fine, I'll take {goodLogin2}. Not worth the fuss.`],
		teamSorts: `I've moved the orders from the account on {oldEmail} onto this one and closed the older account, so "{goodLogin}" is free now. If you put it in the Login box on your profile, it will save first time.`,
		handover: `Customer wants the login "{goodLogin}", which is held by their own older account on {oldEmail} (checked: town and card match). Could the web team move that account's orders onto this one and free the login?`,
		outcomes: ['sorted', 'sorted', 'workaround', 'customer'],
		sortedViaTeam: true
	},
	{
		key: 'forgot-login',
		group: 'signin',
		area: 'profile',
		weight: 3,
		team: WEB,
		subjects: ["Can't sign in", 'Locked out of my account', 'What is my login??'],
		open: [
			`I can't get into my account on the shop. It asks for a login and a password, and I've tried my email address and every password I own. It says "Login or password is incorrect" every time.`,
			`I wanted to check on an order but I can't sign in. I don't remember ever choosing a login; I always reorder from the emails. Is the login the same as my email address?`
		],
		more: [`I've got a {coffee} order I'd like to check on, so I'd like to get in this week.`, `I pressed "Forgot your password?" as well, and that email never came either.`],
		quick: [`Can I sign in to the shop with my email address instead of my login?`, `Not at the moment: the sign-in page only takes the login. If you've forgotten it, the "Forgot your login?" link under the box emails it to the address on your account.`],
		reply: `Sorry you're locked out. The sign-in page wants your login, which is the short name on your account, rather than your email address. Have you tried the "Forgot your login?" link under the box? It sends your login to the address your account is under.`,
		turns: [
			[`I tried that and nothing came. Here's what the page says.`, `Then your account is probably under a different address from the one you've been checking. I can see an account in your name, but its email isn't the one you've written from. Could you tell me the other addresses you use, so I can confirm which one it is without reading it out to someone who might not be you?`, arts.signIn],
			[`Maybe {oldEmail}? I barely look at that one.`, `That's the one. The reminder went to {oldEmail} on {past}, so it should be waiting there with your login in it. Once you're in, you can change the email on your profile to the address you use now.`],
			[`Found it. Can I make the login something less random while I'm at it?`, `Yes: the Login box on your profile can be changed, as long as you stick to lowercase letters, digits and underscores.`],
			[`And my password, does that change?`, `Your password stays as it is; the reminder only tells you your login. If you've forgotten the password too, "Forgot your password?" sends a reset link to the same address.`]
		],
		need: 'the other email addresses you use',
		workAsk: `The trouble is I can't get into {oldEmail} any more; I don't remember its password either.`,
		cause: `the account is under {oldEmail}, so the login reminders went there`,
		fixed: [`I'm in, and I've changed the email to this one so it doesn't happen again. Thanks.`, `Got the reminder in my old inbox and I'm signed in. Thank you!`],
		workaround: [`Then, while you try to get back into {oldEmail}, you don't need to sign in to follow an order: the shipping email has the tracking link, and I'm happy to read you your order history whenever you need it.`, `OK, that will do me for now. Thanks.`],
		change: `The sign-in page only takes the login, and a lot of customers try their email address there first, as you did. I've added a change to our list to let people sign in with either their login or their email address. Until then, "Forgot your login?" is the way back in.`,
		handover: `Customer couldn't sign in with their email address and didn't know their login; the account is under {oldEmail}. They'd like to sign in with the email. Over to the web team.`,
		outcomes: ['sorted', 'sorted', 'workaround', 'change', 'customer']
	},
	{
		key: 'bookmark',
		group: 'login',
		area: 'profile',
		weight: 2,
		team: WEB,
		subjects: ['Account page blank', "Profile won't load", 'Bookmark to my account broken'],
		open: [
			`My bookmark to my account page on the shop has stopped working. It just shows a "page can't be found" screen. Same on my phone and laptop. I'm signed in, because I can see my orders.`,
			`When I open my account page from my bookmarks I get "This page can't be found". If I go through the menu instead it's fine. Have you moved things around?`
		],
		more: [`I use the profile page to check which email you have for me, so I'd like the bookmark back.`, `It's not urgent, but it's odd, and I wanted to make sure nobody has been messing with my account.`],
		quick: [`My husband sent me a link to his profile so I could fix his email, and it says not found. Why?`, `Each profile opens only for the person signed in to it, so his link shows nothing while you're signed in as you. He can sign in himself, or write to us and we'll change the email for him.`],
		reply: `Thanks for letting us know. Could you send me the address your bookmark goes to? You can see it by right-clicking the bookmark and choosing Edit.`,
		turns: [
			[`Here's the bookmark.`, `Thank you. That address ends in "{oldLogin}", but the login on your account is "{login}" now. Did you change your login yourself at some point? I'd like to rule out anyone else having done it.`, arts.bookmark],
			[`Oh, I changed it myself on {past}. I didn't realize it would matter.`, `Then that's the whole story. Your profile's address is made from your login, so when the login changed, the address did too, and the old one now leads nowhere. Nothing is wrong with your account.`],
			[`Will my orders link have changed too?`, `No, the orders page is always shop.copperleaf.coffee/orders, whatever your login is.`],
			[`Could someone else have changed my login without me knowing?`, `Only someone signed in to your account can, and the shop keeps a record: the only change on yours was the one you made on {past}.`]
		],
		need: 'whether you changed your login yourself',
		cause: `the profile's address is made from the login, so when the customer changed the login the old address stopped working`,
		fixed: [`Bookmark updated and it works. Thanks for explaining.`, `New bookmark made, all good.`],
		workaround: [`The steadiest bookmark is the orders page, shop.copperleaf.coffee/orders, which never changes; your profile is one click from there.`, `Good idea, I'll bookmark the orders page instead.`],
		change: `Your profile's address is made from your login, so it changes whenever the login does, and old links just say the page can't be found. I've added a change to our list so that an old profile address takes you to your current profile instead.`,
		handover: `Customer changed their login and their bookmarked profile address now shows not found. They'd like old addresses to keep working. Web team, can you have a look?`,
		outcomes: ['sorted', 'workaround', 'workaround', 'change', 'customer']
	},
	{
		key: 'shared-email',
		group: 'profile',
		area: 'profile',
		weight: 2,
		team: WEB,
		subjects: ['Second account for my {spouseRel}', 'Sign-up says email already used', "Can't make a second account"],
		open: [
			`My {spouseRel} and I want separate accounts so we can each see our own orders, but when {spouseFirst} signs up with our shared email the form won't go through. We only have the one family address.`,
			`I tried to make an account for my {spouseRel}, {spouseFirst}, so the coffee club and my own orders aren't mixed up, and the sign-up form refuses our household email. Can two accounts not use the same address?`
		],
		more: [`We've both been using my account so far and the orders are getting muddled.`, `{spouseFirst} wants a coffee club of {spousePron} own as well, if that makes a difference.`],
		quick: [`Can two people share one account on the shop?`, `They can both sign in to it, yes. Everyone sees the same orders and profile, which suits a household that orders together.`],
		reply: `Each account on the shop needs its own email address, which is why the form stopped. Before I suggest anything, could you tell me whether {spouseFirst} would be ordering separately, with a different card and address, or whether it's mostly about seeing who ordered what?`,
		turns: [
			[`Separately. {spouseFirst} likes a different grind and pays with {spousePron} own card.`, `Thanks. Then a separate account is the right call. Does {spouseFirst} have an email address of {spousePron} own, even one {spousePron2} rarely uses? Most email services also let you add "+something" before the @, which arrives in the same inbox but counts as a different address.`],
			[`We use {email}. Would {plusEmail} work?`, `It would. Mail to {plusEmail} lands in your usual inbox, and the shop treats it as a different address, so {spouseFirst} can sign up with it.`],
			[`And the login, can it be anything?`, `Any mix of lowercase letters, digits and underscores, 3 to 30 characters, as long as nobody else has it.`],
			[`Can we see each other's orders once we're separate?`, `No, each account sees only its own orders. If you want both of you to see everything, the receipts can both go to your family inbox.`]
		],
		need: `whether {spouseFirst} has an email address of {spousePron} own`,
		workAfter: 0,
		workAsk: `Mostly about seeing who ordered what, to be honest. {spouseFirst} doesn't want another login to remember.`,
		cause: `each account needs its own email address and the household shares one`,
		fixed: [`{spouseFirst} is signed up with the plus address. Clever trick, thank you.`, `Worked first time. Thanks for the tip.`],
		workaround: [`Then the simplest arrangement is to keep sharing the account and put a note on each order at checkout saying whose it is. You'll both see every order, and the notes show on the receipts.`, `Fine, we'll share and use the notes. Thanks.`],
		handover: `Household wants two accounts on one shared email.`,
		outcomes: ['sorted', 'sorted', 'workaround', 'customer']
	},
	{
		key: 'receipts-old-email',
		group: 'profile',
		area: 'none',
		weight: 2,
		team: 'the marketing team',
		subjects: ['Receipts going to my old email', "Changed my email but it didn't work", 'Email address not updating'],
		open: [
			`I changed my email on my profile weeks ago and the page said "Profile updated.", but my order confirmations still go to my old work address, which I'm about to lose.`,
			`Why do my receipts still go to {oldEmail}? I changed my email on the shop on {past} and the profile shows the new one.`
		],
		more: [`My last day there is {date}, so after that the receipts will just bounce.`, `I need the receipts for my own records, so I'd like them in one place.`],
		quick: [`If I change my email on the shop, does the coffee club get the new one too?`, `Not by itself: the club keeps its own contact address. Tell us the new one and we'll change it there as well.`],
		reply: `Thanks for flagging this before the old address goes. Could you forward me one of the confirmations that went to the old address? I'd like to see which part of our setup sent it.`,
		turns: [
			[`Forwarded. This one is from {pastDate}.`, `Thank you. That confirmation came from the store at copperleaf.coffee, where you check out, rather than from the shop where your profile lives. The store keeps its own copy of your email from your first order there, and changing your profile doesn't reach it. Can you confirm you'd like the store to use {email} from now on?`, arts.receipt],
			[`Yes please, {email} for everything.`, `Thanks. The store's customer records belong to the marketing team, so they'll make the change on their side, and I've noted it on your account here.`],
			[`Will my old orders move to the new address?`, `They stay where they are, but they're all still on your orders page, whichever address the receipts went to.`],
			[`Do I need to do anything else before I leave my job?`, `Only make sure the coffee club has the new address too; I've noted it for the club team as well.`]
		],
		need: `confirmation that the store should use {email} from now on`,
		handAfter: 2,
		cause: `confirmations come from the store at copperleaf.coffee, which keeps its own copy of the email address and never sees changes made on the profile`,
		fixed: [`The confirmation for this week's order came to the right address. Thanks!`, `Just placed an order and the receipt came here. Perfect.`],
		teamSorts: `I've changed the email on your store record to {email}, so your next confirmation will go there.`,
		handover: `Store confirmations still go to {oldEmail}; the customer changed their email on the shop profile. Please set the store record to {email}.`,
		outcomes: ['sorted', 'sorted', 'team', 'customer'],
		sortedViaTeam: true
	},
	{
		key: 'old-store-plan',
		group: 'profile',
		area: 'profile',
		weight: 2,
		team: 'the coffee club team',
		oldStoreOnly: true,
		clubOnly: true,
		subjects: ['What is plan {plan}?', 'Am I paying for an old plan?', 'Message on my profile'],
		open: [
			`There's a line on my profile that says "You joined us from our old store, on plan {plan}." What does that mean? Am I paying for something called plan {plan} on top of my coffee club?`,
			`Quick worry: my profile says I'm on plan {plan} from your old store. I thought everything on the old store ended when you moved. Is something still going on in the background?`
		],
		more: [`I've only just noticed it, and I'd rather ask than find out the hard way.`, `My bank statement only shows the club, but I wanted to be sure.`],
		quick: [`My profile mentions a plan from the old store. Is that still active?`, `No. It's a note of the plan you were on when your account came across from the old store. Nothing is billed against it.`],
		reply: `Nothing is charged against that line, so please don't worry. It's a note of the plan you were on at our old store when your account was brought across in April 2025. I'd still like to check your account properly, so could you confirm the last four digits of the card you pay with?`,
		turns: [
			[`It's {card4}. And here's the profile page, in case it matters.`, `Thank you. On that card there's {clubLine} and nothing else. Plan {plan} on the old store was "{planDesc}", which matches what you had there, so the line is only history.`, arts.plain],
			[`So why show it at all?`, `Customers who came across from the old store kept free shipping on their club deliveries, and the plan number is how we know who they are. It's on the profile so that you can quote it to us if you ever need to.`],
			[`Does plan {plan} get me anything else?`, `Only the free shipping on club deliveries, which you have. Beyond that it's a record.`],
			[`Is plan {plan} the reason my club costs less than my friend's?`, `Partly: old store customers kept free shipping on club deliveries, so you pay less in total, though the coffee costs the same.`]
		],
		need: 'the last four digits of the card you pay with',
		needAt: 0,
		cause: `the line is a record of the old store plan the account came across with, and nothing is billed against it`,
		fixed: [`That's a relief. Thanks for checking.`, `OK, good to know it's just history. Thanks.`],
		handover: `Customer asking about the old store plan on their profile.`,
		outcomes: ['sorted', 'sorted', 'customer']
	},
	{
		key: 'display-name',
		group: 'profile',
		area: 'profile',
		weight: 1,
		team: WEB,
		subjects: ['My name shows wrong', 'Why does it say {login}?', 'Profile heading'],
		open: [
			`When I open my profile, the big heading at the top says "{login}" instead of my name. It looks like a robot's account. How do I get my actual name up there?`,
			`Little thing: my account page greets me as "{login}". My {spouseRel} gets {spousePron} real name on {spousePron} account. What did {spousePron2} do that I didn't?`
		],
		more: [`I've looked all over the page for a setting and can't see one.`, `Not a big deal, it just looks odd when I show people my orders.`],
		quick: [`Can I put my full name on my profile, with a space and capitals?`, `Yes. The Name box takes anything, spaces and capitals included; it's only the login that's strict.`],
		reply: `Good question. The heading shows the name on your account, and when that's empty it shows your login instead. Could you check whether the Name box on your profile has anything in it?`,
		turns: [
			[`The Name box is empty, see below. I don't think it asked for a name when I signed up.`, `That's it, then. Type your name into the Name box and press Save, and the heading will show it straight away.`, arts.plain],
			[`Will that name be printed on my parcels too?`, `Parcels use the name you gave at checkout in the store, not your profile, so what dispatch prints won't change.`],
			[`Can I use a nickname? Everyone calls me {nick}.`, `Of course. The Name box is only for how the shop greets you.`],
			[`Can anyone else see my name on the shop?`, `No, your profile is only visible to you while you're signed in.`]
		],
		cause: `the Name box on the profile was empty, so the heading showed the login`,
		fixed: [`Name added, heading fixed. Thanks!`, `There I am. Thanks for the quick answer.`],
		handover: `Customer's profile heading shows their login.`,
		outcomes: ['sorted']
	},
	{
		key: 'cust-login',
		group: 'login',
		area: 'profile',
		weight: 2,
		team: WEB,
		mainOnly: true,
		oldStoreOnly: true,
		subjects: ['Who is {login}?', 'Strange login on my account', 'Has my account been hacked?'],
		open: [
			`I signed in on my phone and the profile says "Signed in as {login}". That isn't me, I never chose that. Has someone got into my account, or am I looking at someone else's?`,
			`My profile shows a login I've never seen, {login}. Should I be worried? I only ever get in through the links in your emails.`
		],
		more: [`I've changed my password just in case.`, `I haven't noticed anything odd with my orders, but it gave me a fright.`],
		quick: [`Why does my login look like a customer number?`, `Accounts that came across from the old store were given a login made from the old store's customer number. You can change it to anything you like on your profile.`],
		reply: `Thanks for checking with us rather than ignoring it. Could you tell me the email address you'd expect on the account, and whether the orders on it look like yours?`,
		turns: [
			[`It's {email}, and yes, the orders are mine. Here's what my profile shows.`, `Thank you. Then it's your own account and nobody else's. Did you buy from us on our old store, before March 2025?`, arts.plain],
			[`Yes, for a couple of years before you moved.`, `That's the answer. When the old store closed, every customer's account was brought across and given a login made from their old customer number, which is why yours is "{login}". You'd never have seen it if you always came in through the email links.`],
			[`Can I change it?`, `Yes: put a login of your choice in the Login box on your profile and press Save. Lowercase letters, digits and underscores only.`],
			[`Is my account otherwise safe?`, `Yes: every sign-in in the last three months came from your usual town, and nobody but you has changed the password.`]
		],
		need: 'whether you bought from us on our old store, before March 2025',
		cause: `accounts brought across from the old store were given logins made from the old customer number`,
		fixed: [`Phew. Changed it to {goodLogin}. Thanks for explaining.`, `OK, that makes sense, and I've changed it to something human.`],
		change: `Customers from the old store still have logins like "{login}", and some take them for someone else's. I've added a change to our list: a note on the profile of every account with one of those logins, inviting them to choose their own.`,
		handover: `Another old store customer alarmed by a generated login ({login}). Could the profile point these out?`,
		outcomes: ['sorted', 'sorted', 'change', 'customer']
	},
	{
		key: 'reset-email',
		group: 'signin',
		area: 'profile',
		weight: 2,
		team: WEB,
		subjects: ['Password reset not arriving', 'No reset email', 'Forgot password link not working'],
		open: [
			`I've pressed "Forgot your password?" several times since yesterday and no email has come. I've checked junk. My login is {login}, if that helps.`,
			`The password reset email never arrives. I need to get into my account to check my order history for my expenses.`
		],
		more: [`I'm still signed in on my phone, but not on the laptop, and I can't remember the password.`, `My login is fine, it's only the password I've lost.`],
		quick: [`How long does the password reset link last?`, `Two hours from when it's sent. If it runs out, ask for a new one and use the newest email.`],
		reply: `Sorry about that. I can see the reset emails were sent from our side. Which address were you expecting them at? Your account might be under a different one.`,
		turns: [
			[`{email}. That's the only one I use.`, `That is the address on the account, so they went to the right place. Is it a work address? Some workplaces hold automated emails in a quarantine you never see. Could you ask your IT people whether anything from noreply@copperleaf.coffee is being held?`],
			[`IT found them all in quarantine. Here's what they sent me.`, `There we are. Your workplace's filter held all {n} messages because they contain a link. If IT let the latest one through, its link works for two hours from when it was sent; otherwise press "Forgot your password?" once more after they've allowed our address.`, arts.quarantine],
			[`Can you send emails to my personal address instead?`, `Yes, if you change the email on your profile once you're in. Every email from the shop goes to the address on your profile.`],
			[`Why did your emails get held when others don't?`, `Filters often hold messages whose main content is a link, which is what a reset email is. Allowing our address once stops it happening again.`]
		],
		need: 'whether your IT team is holding anything from noreply@copperleaf.coffee',
		workAfter: 1,
		workAsk: `IT say they won't change the filter for one sender.`,
		cause: `the customer's workplace filter quarantined the reset emails`,
		fixed: [`IT let it through, I've reset my password and I'm in. Thanks.`, `They allowed your address, the new link came through, all sorted.`],
		workaround: [`Then I can change the email on your account to a personal address once you confirm a recent order number, and the reset will go there instead.`, `Please do, that's easier than arguing with IT. My last order was {order}, and my personal address is {altEmail}.`],
		handover: `Reset emails quarantined by the customer's employer.`,
		outcomes: ['sorted', 'sorted', 'workaround', 'customer']
	},
	{
		key: 'autofill',
		group: 'login',
		area: 'profile',
		weight: 2,
		team: WEB,
		subjects: ["Profile won't save on my phone", 'Changes to my profile disappear', 'Email change not sticking'],
		open: [
			`When I change anything on my profile from my phone, like my email, the page looks as if it saved but the change never sticks. It works fine on the computer.`,
			`I only wanted to correct a typo in my name, and the profile page won't keep it. I press Save, it looks fine, and the next day the typo is back. I'm on my phone, if that matters.`
		],
		more: [`I've tried it three times now. The page doesn't show any error, which is the strange part.`, `I'm moving soon and I need the right email on there before I do.`],
		quick: [`Why does my phone fill my email into the Login box on my profile?`, `Password managers see a box called Login and assume it wants your email. Put your login back in the box before you press Save, or the save won't go through.`],
		reply: `That's odd, and I'd like to get to the bottom of it. Could you copy the profile page as it looks straight after you press Save on the phone?`,
		turns: [
			[`Here it is.`, `Thank you, that's very useful. There's no "Profile updated." at the top, so the save was turned down, and the Login box shows your email address instead of your login. Do you use a password manager, or let your phone fill in forms for you?`, arts.autofill],
			[`Yes, {pwm} fills everything in for me.`, `That explains it. {pwm} sees a box called Login and fills it with your email, so when you press Save the shop thinks you're changing your login to an email address, which it doesn't accept, and nothing is kept. Your login itself, "{login}", is fine.`],
			[`So what do I do?`, `Before you press Save, put "{login}" back in the Login box, or tell {pwm} not to fill in forms on shop.copperleaf.coffee.`],
			[`Is the email on my account right, then?`, `Yes, {email} is on the account; it's only the Login box that got the wrong thing.`]
		],
		need: 'whether you use a password manager or let your phone fill in forms',
		cause: `{pwm} fills the Login box with the email address, so the save tries to change the login to an email and is turned down`,
		fixed: [`Switched off autofill for your site and it saves now. Sneaky.`, `Told {pwm} to leave your site alone and it works now.`],
		workaround: [`For now the reliable way is to clear the Login box and type "{login}" yourself each time before saving. It's a nuisance, I know.`, `OK, I'll do that. Bit annoying, but fine.`],
		change: `Phones and password managers fill our Login box with an email address, and then the profile won't save and doesn't say why. I've added a change to our list to mark the box so password managers leave it alone. Until then, typing your login back in before Save works.`,
		handover: `Profile saves from the customer's phone are turned down because {pwm} fills the Login box with the email. Can the web team stop that?`,
		outcomes: ['sorted', 'workaround', 'change', 'change', 'customer']
	},
	{
		key: 'total-shown',
		group: 'orders',
		area: 'orders',
		weight: 3,
		team: WEB,
		subjects: ['Order total wrong?', "Price on orders page doesn't match", 'Charged a different amount?'],
		open: [
			`The orders page says my last order came to {shown}, but my bank shows {total}. Which is right? I don't want to be overcharged or undercharged.`,
			`Your orders page lists order {order} at {shown}. That isn't what I paid; my card says {total}. Is the page wrong, or my bank?`
		],
		more: [`It's not a big difference, but I'd like to know which one to believe.`, `I keep a spreadsheet of what I spend on coffee, which is how I noticed.`],
		quick: [`Why do some totals on the orders page have only one digit after the point?`, `It's a fault on that page: when the cents are under ten it leaves out the zero, so $12.05 shows as "$12.5" and $12.00 as "$12.0". The amount charged is right, and the receipt email shows it properly.`],
		reply: `Thanks for checking. Could you copy the orders page as you see it, with the dates and statuses?`,
		turns: [
			[`Here's the bottom of the page.`, `Thank you. Your card was charged {total}, which matches our records for {order}. What does the receipt email for that order say? I'd like to be sure it agrees.`, arts.ordersPage],
			[`The receipt says {total}.`, `Then everything is right except the page. When the cents are under ten, the orders page leaves out the zero after the point, so {total} shows as "{shown}". You were charged the right amount.`],
			[`So the others with one digit are the same thing?`, `Yes, any total on that page with a single digit after the point is missing its zero; the rest are shown properly.`],
			[`Has this affected my coffee club charges too?`, `No, club charges are taken at the right amount; the orders page only shows them wrongly when the cents are under ten.`]
		],
		need: 'what the receipt email for {order} says',
		cause: `the orders page leaves out the zero when the cents are under ten, so {total} shows as "{shown}"`,
		fixed: [`OK, mystery solved. Thanks for checking so carefully.`, `Good, as long as the bank is right I'm happy.`],
		workaround: [`Until the page is put right, the receipt emails and your card statement both show the exact amount, so those are the ones to go by.`, `Fine, I'll go by the receipts.`],
		change: `The orders page leaves out the zero when the cents are under ten, so {total} shows as "{shown}". The charges are right; only the page is wrong. It's on our list to fix.`,
		handover: `Orders page shows {total} as "{shown}"; the customer thought they'd been charged the wrong amount. Can the web team fix the display?`,
		outcomes: ['sorted', 'workaround', 'change', 'change', 'customer']
	},
	{
		key: 'newest-bottom',
		group: 'orders',
		area: 'orders',
		weight: 2,
		team: WEB,
		mainOnly: true,
		subjects: ['Order missing from my account', "Can't find my latest order", 'Orders page out of date?'],
		open: [
			`I placed an order on {past} and it isn't on my orders page. The page only shows orders from last year. Did my order go through?`,
			`My orders page seems stuck in {oldMonth}. My new order isn't listed at the top, even though I've had the confirmation email.`
		],
		more: [`The confirmation email came straight away, so I'm a bit confused.`, `I'd like to check it went through before I go away on {day}.`],
		quick: [`Is there a way to see only my recent orders?`, `Not yet: the orders page lists every order you've placed, oldest at the top, so the newest are at the bottom.`],
		reply: `Your order did go through, and I can see it on our side. Roughly how many orders do you see on the page? You've ordered with us quite a lot.`,
		turns: [
			[`There are loads. I didn't count, maybe forty?`, `{count}, by our count. Could you scroll all the way down and tell me what the last line on the page says?`],
			[`Oh. It's there at the bottom: {placedIso}, {status}.`, `There it is. The orders page lists orders oldest first, so with {count} of them the newest is right at the end. Nothing was missing.`],
			[`Does "paid" mean it's on its way?`, `Not quite: "paid" means we've taken payment and the order is waiting for roast day. It changes to "shipped" when it leaves us, usually within two days of roasting.`],
			[`Will it move to the top once it's shipped?`, `No, it stays where it is; the page lists orders by when they were placed, oldest first.`]
		],
		need: 'what the last line on the page says',
		cause: `the orders page lists orders oldest first, so with {count} orders the newest is at the very bottom`,
		fixed: [`Found it, thanks. I feel silly now.`, `Right, it was at the bottom all along. Thanks!`],
		workaround: [`Until that changes, the quickest way on a phone is to open the page and jump straight to the end, or search the page for this month's date.`, `Good tip, I'll do that.`],
		change: `The orders page lists orders oldest first, so customers with a long history have to scroll to the end to find the latest. I've added a change to our list to show the newest first.`,
		handover: `Customer with {count} orders thought their newest was missing; it's at the bottom of the orders page. Could it be listed newest first?`,
		outcomes: ['sorted', 'workaround', 'change', 'change', 'customer'],
		status: 'paid'
	},
	{
		key: 'date-shown',
		group: 'orders',
		area: 'orders',
		weight: 2,
		team: WEB,
		mainOnly: true,
		subjects: ['Wrong date on my order', 'Orders page shows the wrong day', 'Order dated the next day?'],
		open: [
			`I placed order {order} on the evening of {pastDate} and the orders page says I placed it the next day. Small thing, but I use the page to keep track of when I last ordered, so I thought I'd mention it.`,
			`The dates on my orders page are a day out for some orders. My last one was placed on {pastDate}, late in the evening, and the page shows the day after.`
		],
		more: [`I order roughly every two weeks and I go by the dates on that page.`, `It isn't a problem for me, but it might confuse someone.`],
		quick: [`Why does my orders page show the day after I ordered?`, `The page shows dates in UTC, which is seven or eight hours ahead of us, so evening orders show the next day. The time on your receipt is the one to trust.`],
		reply: `Thanks for mentioning it. Do you remember roughly what time you placed it? Our records keep the time, so I can compare.`,
		turns: [
			[`Around {eveTime}, I think, after dinner.`, `That matches: we have {order} at {eveTime} on {pastDate}, Pacific time. Were the other orders that look wrong also ones you placed in the evening?`],
			[`Now you mention it, yes, I always order at night.`, `That's the pattern. The orders page shows dates in UTC, which is {utcAhead} hours ahead of Pacific time, so anything placed after {cut} our time shows as the next day. The order itself is fine.`],
			[`Does that affect when it's roasted?`, `No, roasting and dispatch go by our own clock.`],
			[`So my order really was on {pastDate}?`, `Yes, {pastDate} at {eveTime} Pacific, exactly as on your receipt.`]
		],
		need: 'whether the other orders that look wrong were also placed in the evening',
		cause: `the orders page shows dates in UTC, so evening orders show the next day`,
		fixed: [`OK, that explains it. Not a big deal, thanks.`, `Mystery solved. Thank you.`],
		workaround: [`For exact dates, go by the receipt email: it shows the time in Pacific.`, `Fine, I'll use the receipts.`],
		change: `The orders page shows dates in UTC, so evening orders show the next day. I've added a change to our list to show them in Pacific time, as the receipts do.`,
		handover: `Orders page dates are a day ahead for evening orders (UTC). Customer keeps track of orders by them. Web team, could they be shown in Pacific time?`,
		outcomes: ['sorted', 'workaround', 'change', 'change', 'customer']
	},
	{
		key: 'tracking',
		group: 'orders',
		area: 'orders',
		weight: 2,
		team: WEB,
		mainOnly: true,
		subjects: ["Where's my tracking number?", 'Shipped but no tracking', 'How do I track my order?'],
		open: [
			`My order shows as "shipped" on the orders page but there's no tracking number anywhere. Where can I see where it is?`,
			`Is there a way to track an order from my account? The orders page just says shipped and nothing else.`
		],
		more: [`I'll be out on {day} and I'd like to know if it's coming then.`, `There's usually a link somewhere, so I wondered if I'd missed it.`],
		quick: [`Where do I find the tracking number for an order?`, `It's in the shipping email we send on the day the parcel leaves us; the orders page doesn't show it.`],
		reply: `Sorry for the hunt. The tracking number goes out in a shipping email on the day the parcel leaves us, rather than on the orders page. Did you get an email from us on {shipDay} with the subject "Your Copperleaf coffee is on its way"?`,
		turns: [
			[`I can't find it anywhere, even in spam.`, `Then here it is: {order} went with {carrier}, tracking number {track}, and here's where it has been so far. Is the email address on your store account still {email}? The shipping email should have gone there.`, arts.tracking, 'a'],
			[`It's still that address, yes.`, `Thanks. The shipping email went to {email} on {shipDay}, so it was probably filed away by your inbox rather than lost. Search for "on its way" and it should turn up.`],
			[`Found it, it was under Promotions.`, `That's where a lot of them end up. Marking it as not a promotion should keep the next one in your main inbox.`],
			[`Can the shipping emails go to my {spouseRel} as well?`, `Each order's emails go to the one address on the store account, but forwarding them is fine, and the tracking link works for anyone.`]
		],
		need: 'whether the email on your store account is still {email}',
		cause: `the tracking number only goes out in the shipping email, which the customer's inbox had filed away, and the orders page doesn't show it`,
		fixed: [`Got it, the parcel's in {hub} and due tomorrow. Thanks.`, `Tracking works, thanks for digging.`],
		workaround: [`Until the orders page shows tracking, if you ever can't find a shipping email, reply here with the order number and we'll send you the tracking number.`, `That works, thanks.`],
		change: `The orders page only says "shipped", and the tracking number is only in the shipping email. I've added a change to our list to show the carrier and tracking number next to each shipped order.`,
		handover: `Customer couldn't find tracking; the orders page only says "shipped". Could the web team show the tracking number there?`,
		outcomes: ['sorted', 'workaround', 'change', 'change', 'customer'],
		status: 'shipped'
	},
	{
		key: 'guest-order',
		group: 'orders',
		area: 'orders',
		weight: 2,
		team: WEB,
		subjects: ['Order not in my account', 'Missing order', 'Gift order not showing'],
		open: [
			`I bought a gift box on {past} and it isn't on my orders page. I definitely paid; I have the receipt. Every other order is there.`,
			`My last order isn't showing on my account. I've got the confirmation email, so I know it went through.`
		],
		more: [`I'd like all my orders in one place for my records.`, `It was a present for my {rel}, so I'd like to see when it ships.`],
		quick: [`If I check out without signing in, does the order still show on my account?`, `Only if you use the same email address as your account. A guest order under another address stays on its own.`],
		reply: `Thanks for the details. Could you forward me the confirmation email? I'd like to see which address it went to.`,
		turns: [
			[`Forwarded.`, `Thank you. That order was placed at the store without signing in, under {altEmail}, so it isn't linked to your account on {email}. Do you remember checking out as a guest?`, arts.receipt],
			[`I must have done it on my phone, where I'm not signed in. {altEmail} is my other address.`, `That's it. Orders placed as a guest under a different email address stay on their own and don't show on your account's orders page.`],
			[`Can it be moved onto my account?`, `It can be attached to your account by hand, yes.`],
			[`Will I lose the receipt if the order is moved?`, `No, the receipt stays in your inbox exactly as it is.`]
		],
		need: 'whether you checked out as a guest on that order',
		handAfter: 3,
		cause: `the order was placed as a guest under {altEmail}, so it isn't linked to the account on {email}`,
		fixed: [`It's there now. Thanks, both of you.`, `I can see it on my orders page. Brilliant.`],
		workaround: [`If you'd like to keep everything together, sign in on your phone before checking out next time; your receipts have every order in the meantime.`, `Fair enough, I'll sign in first next time.`],
		change: `Guest orders placed under another email stay on their own, and we only attach them by hand. I've attached this one, and I've added a change to our list so the orders page can offer to add a guest order once you confirm the address it was placed under.`,
		teamSorts: `I've attached order {order} to your account, so it now shows on your orders page with the rest.`,
		handover: `Guest order {order} under {altEmail} should be on the account for {email}. Could the web team attach it?`,
		outcomes: ['sorted', 'sorted', 'workaround', 'change', 'customer'],
		sortedViaTeam: true
	},
	{
		key: 'history-export',
		group: 'orders',
		area: 'orders',
		weight: 2,
		team: WEB,
		subjects: ['Order history for expenses', 'Can I download my orders?', 'Receipts for my accountant'],
		open: [
			`I buy coffee for our office of {staff} and claim it back. My accountant wants a list of this year's orders with the amounts. Is there a way to download my orders page?`,
			`Is there a printable version of my order history? I need it for taxes and the orders page doesn't print nicely.`
		],
		more: [`I'd rather not copy out every line by hand if I can help it.`, `I need it by {date} if possible.`],
		quick: [`Can I print my order history?`, `There's no print view yet, but we can email you a list of your orders for any dates you like.`],
		reply: `We can help with that. Which dates do you need the list to cover?`,
		turns: [
			[`January to the end of {lastMonth}.`, `Thanks. Do you need the tax shown separately on each order, or are the totals enough?`],
			[`Totals are fine.`, `Then the orders page has what you need, but there's no download on it. Here's the list from our side for those months.`, arts.statement, 'a'],
			[`A couple of these look different from what the orders page says.`, `That's the orders page leaving out a zero when the cents are under ten. The list I sent has the exact amounts.`],
			[`Do the totals include shipping?`, `Yes, each total is what was charged, shipping and tax included.`]
		],
		need: 'whether you need the tax shown separately on each order',
		workByCare: true,
		cause: `the orders page has no download or print view`,
		fixed: [`Perfect, that's exactly what the accountant needs. Thank you.`, `That's great, it saves me copying it all out.`],
		workaround: [`Until there's a download, we're happy to send you the list each quarter; just reply here when you need the next one.`, `That would be really helpful, thanks.`],
		change: `There's no way to download or print the order history yet. I've added a change to our list: a download of your orders for any range of dates.`,
		handover: `Customer needs their order history for expenses. Sent the list by hand. Could the orders page offer a download?`,
		outcomes: ['sorted', 'workaround', 'change', 'change', 'customer']
	},
	{
		key: 'pending-card',
		group: 'payment',
		area: 'none',
		weight: 2,
		team: 'finance',
		mainOnly: true,
		subjects: ['Order stuck on pending', 'Still pending after three days', "Why hasn't my order shipped?"],
		open: [
			`My orders page has said "pending" for order {order} since {past}. Usually it changes to paid the next day. Is something wrong?`,
			`I ordered {coffee} on {past} and the order still says pending. I'd like it before the weekend if possible.`
		],
		more: [`I've got friends coming on {day} and I promised them your coffee.`, `My other orders always went through fine.`],
		quick: [`What's the difference between pending and paid on the orders page?`, `"pending" means we haven't been able to take payment yet; "paid" means payment went through and the order is waiting for roast day.`],
		reply: `Sorry for the worry. "pending" means the payment for that order hasn't gone through yet. Has your bank sent you any message about a payment to Copperleaf Coffee?`,
		turns: [
			[`Nothing from the bank, and the card works everywhere else.`, `Thanks. Our card processor tried {tries} times and got "{decline}" each time; the attempts are below. Is the card ending {card4} the one you meant to pay with? It's the one saved on your store account.`, arts.attempts, 'a'],
			[`Ah, that's my old card. It was replaced last month.`, `That's why. The store still has the old card saved, so the payment can't go through, and the order stays pending until it does.`],
			[`If I put the new card in, will the order go through by itself?`, `Yes, the store tries again within an hour of a new card being saved, and the order turns to "paid".`],
			[`Will my order miss the roast?`, `If the payment goes through by tomorrow, it still makes {rday}'s roast.`]
		],
		need: 'whether the card ending {card4} is the one you meant to pay with',
		handAfter: 2,
		cause: `the store still had an old card saved, so the payment for {order} kept failing`,
		fixed: [`Saved the new card and the order says paid now. Thanks!`, `New card in, order went through. Panic over.`],
		workaround: [`If it's urgent, we can take payment over the phone with the new card today, and the order still makes {rday}'s roast.`, `Yes please, I'll call this afternoon.`],
		teamSorts: `I called you this morning and took payment for {order} on your new card, so it's marked paid and goes out with {rday}'s roast.`,
		handover: `Payment for {order} keeps failing ({decline}) on the saved card ending {card4}. Can finance contact the customer and take payment?`,
		outcomes: ['sorted', 'sorted', 'workaround', 'team', 'customer'],
		status: 'pending'
	},
	{
		key: 'duplicate-hold',
		group: 'payment',
		area: 'none',
		weight: 2,
		team: 'finance',
		mainOnly: true,
		subjects: ['Cancelled order on my account', 'Charged twice?', "Didn't cancel this"],
		open: [
			`There's an order on my orders page marked "cancelled" for {shown}. I didn't cancel anything. Was I charged for it, and why was it cancelled?`,
			`My bank shows two payments of {total} on {pastDate} but I only placed one order. My orders page has one of them as cancelled.`
		],
		more: [`I've only had one confirmation email, so I'm confused.`, `I'm on a tight budget this month, so I'd like to understand it quickly.`],
		quick: [`If an order says cancelled on the orders page, was I charged for it?`, `No. A cancelled order isn't charged; at most your bank holds the amount for a few days and then lets it go.`],
		reply: `Sorry for the confusion. Could you send me the lines from your bank statement, with the date and description? Then I can match them against what our card processor shows.`,
		turns: [
			[`Here they are.`, `Thank you. Both lines are marked pending by your bank, which means they're holds rather than charges. The second order was cancelled by the store within a minute because it was a duplicate of the first. Did you press "Place order" twice, or reload the page while it was working?`, arts.bank],
			[`I might have pressed it twice, the page was slow.`, `That fits. The store spotted the duplicate and cancelled it, and the hold for it will go away by itself.`],
			[`How long until the hold goes?`, `Usually three to five working days, depending on the bank. Some banks lift it sooner if you call them.`],
			[`How do I stop this happening again?`, `Press "Place order" once and wait for the confirmation page; it can take up to half a minute when the store is busy.`]
		],
		need: 'whether you pressed "Place order" twice or reloaded the page',
		handAfter: 2,
		cause: `the second order was a duplicate the store cancelled automatically, and the bank was only holding the money`,
		fixed: [`The second payment has gone from my account. Thanks for sorting it.`, `The hold disappeared this morning. All good.`],
		teamSorts: `I've asked our card processor to lift the hold for the cancelled order straight away. Your bank should show it gone within a day.`,
		handover: `Customer has a hold of {total} for a duplicate order the store cancelled. Can finance ask the processor to lift it early?`,
		outcomes: ['sorted', 'sorted', 'team', 'customer'],
		status: 'paid'
	},
	{
		key: 'taste',
		group: 'coffee',
		area: 'none',
		weight: 2,
		team: 'the roastery',
		subjects: ['Coffee tastes {sourOrBitter}', 'Something off with my latest bag', 'Did you change the roast?'],
		open: [
			`The last bag of {coffee} tastes really {sourOrBitter}. The previous bag was lovely. Same grinder, same method. Has something changed?`,
			`I'm not enjoying my {coffee} this time. It's {sourOrBitter} compared to last month. Did you change the roast?`
		],
		more: [`I use the same {method} every morning and haven't changed anything.`, `I wondered whether the bag had been sitting around before it got to me.`],
		quick: [`How long does a bag keep once it's opened?`, `Three to four weeks for whole bean in the bag with the top rolled down, less for ground. Keep it away from heat and light; the fridge doesn't help.`],
		reply: `Sorry it isn't tasting right. Could you tell me how you brew it, with the amounts of coffee and water and the brew time if you know them?`,
		turns: [
			[`Here's what I do every morning.`, `Thanks, that's very clear. Could you send me the roast date and lot number printed on the bottom of the bag?`, arts.brew],
			[`Roasted {roast}, lot {lot}.`, `Thank you. That lot is from a new harvest of {coffee} and is a little denser than the last one, so with the same grind it extracts differently and comes out {sourOrBitter}. Try one step {finer} on your grinder.`],
			[`Would different water help?`, `It can. Very soft or distilled water tends to taste flat; filtered tap water usually works best.`],
			[`How do I know which lot I'm getting next time?`, `It's printed on the bottom of every bag, beside the roast date, and the café can tell you which lot is current.`]
		],
		need: 'the roast date and lot number from the bottom of the bag',
		cause: `the new lot of {coffee} is denser, so the same grind extracted differently`,
		fixed: [`One step {finer} and it's back to how I like it. Thank you!`, `Changed the grind as you said and it's lovely again.`],
		workaround: [`If you'd rather not fiddle with the grinder, we can swap your next bag for {coffee2}, which suits your recipe as it is.`, `Yes, swap it please.`],
		teamSorts: `I looked up the lot on your last order, {lot}, and tasted our retained sample this morning: it's as it should be, but denser than the last harvest. With your recipe I'd go one step {finer}; that brings the sweetness back.`,
		handover: `Customer finds their latest {coffee} {sourOrBitter}; recipe in the thread. Can the roastery check the current lot?`,
		outcomes: ['sorted', 'sorted', 'workaround', 'team', 'customer']
	},
	{
		key: 'damaged',
		group: 'parcel',
		area: 'none',
		weight: 2,
		team: 'dispatch',
		subjects: ['Parcel arrived damaged', 'Bag torn in the box', 'Coffee everywhere'],
		open: [
			`My parcel came this morning with one of the bags torn down the side. There's coffee all through the box. The other bag is fine.`,
			`The box for order {order} arrived crushed and one of the {size} bags has a hole in it.`
		],
		more: [`The outer box was soaked on one side, as if it had been left in the rain.`, `I've kept everything in case you need to see it.`],
		quick: [`Do your bags go in the compost?`, `The bags are lined, so they go in the trash, but the labels and the outer boxes recycle.`],
		reply: `Sorry about the mess. Could you send a photo of the bag and the box, so we can show the carrier?`,
		turns: [
			[`Photos attached.`, `Thank you. That's carrier damage; the corner has taken a hard knock. Would you like a replacement of the same coffee, or a refund for that bag?`],
			[`A replacement, please.`, `A new {size} bag of {coffee}, {grind}, will go out with {rday}'s roast, double-boxed.`],
			[`Do I need to send the torn one back?`, `No, please don't. Use it up if it's clean, or put the grounds on the garden.`],
			[`Will you claim from the carrier?`, `Yes, dispatch claims for every damaged parcel, so there's nothing for you to do.`]
		],
		need: 'whether you would like a replacement or a refund for that bag',
		handAfter: 2,
		cause: `the parcel was crushed in transit`,
		fixed: [`Replacement arrived, double-boxed this time. Thanks!`, `The new bag came today, all in one piece. Thanks for the quick help.`],
		teamSorts: `Your replacement bag of {coffee} went out today with {carrier}, tracking {track}.`,
		handover: `Parcel arrived crushed, one bag torn (photos in the thread). Can dispatch send a replacement and claim from {carrier}?`,
		outcomes: ['sorted', 'sorted', 'team', 'customer']
	},
	{
		key: 'lost-parcel',
		group: 'parcel',
		area: 'none',
		weight: 2,
		team: 'dispatch',
		mainOnly: true,
		subjects: ["Parcel hasn't arrived", "Tracking hasn't moved", "Where's my coffee?"],
		open: [
			`My tracking for order {order} has said "in transit" for days without moving. Your parcels usually take two days.`,
			`I'm still waiting for order {order}. The shipping email said two to three days and it's been nearly a week.`
		],
		more: [`We're out of coffee at home, so I'm a bit desperate.`, `Nothing like this has happened before, so I wondered if it had gone astray.`],
		quick: [`How long does shipping usually take?`, `Two to three days in most of the country, four or five to the East Coast in winter.`],
		reply: `Sorry it's taking so long. Could you confirm the delivery address on the order, so I can check it against what the carrier has?`,
		turns: [
			[`It's {street}, {town}, {state} {zip}.`, `Thanks, that matches. The tracking shows the parcel reached the {hub} hub and hasn't been scanned since; here's what the carrier has. I've opened a trace with {carrier}. Could you check with your neighbors or your building's mail room in the meantime?`, arts.tracking, 'a'],
			[`Nobody has it.`, `Thanks for checking. {carrier} came back to say it was sorted onto the wrong truck at {hub}; it's been sent on and should arrive within two days.`],
			[`Will it still be fresh?`, `Yes. A week in the bag is nothing for whole coffee, and the roast date is on the label if you want to check.`],
			[`Should I order again just in case?`, `No need; if it isn't with you in two days, we'll send a new one at our cost.`]
		],
		need: 'whether a neighbor or your mail room has it',
		cause: `the parcel was sorted onto the wrong truck at the carrier's {hub} hub`,
		fixed: [`It turned up today, a bit battered but fine. Thanks.`, `Arrived this morning. Thanks for chasing.`],
		teamSorts: `The carrier couldn't find the parcel, so I've sent a new one today by express: {carrier}, tracking {track2}.`,
		handover: `Order {order} stuck at the {hub} hub; address checked. Can dispatch chase {carrier} or send a new parcel?`,
		outcomes: ['sorted', 'sorted', 'team', 'customer'],
		status: 'shipped'
	},
	{
		key: 'wrong-grind',
		group: 'parcel',
		area: 'none',
		weight: 2,
		team: 'dispatch',
		subjects: ['Wrong grind', 'Got the wrong grind', 'Order mix-up'],
		open: [
			`I ordered {coffee} {grind} and received a bag ground for {wrongGrind}. It's no use with my setup.`,
			`My bag of {coffee} came ground for {wrongGrind}, but I chose {grind} when I ordered. Can you check?`
		],
		more: [`I'm particular about my grind, so the wrong one is no good to me.`, `It's still sealed, if you'd like it back.`],
		quick: [`Which grind should I choose for an AeroPress?`, `Pour-over is the closest of our grinds; for a short brew, espresso works too.`],
		reply: `Sorry about that. Could you send me a photo of the label on the bag? The grind is printed under the name.`,
		turns: [
			[`Here's the label.`, `Thank you. The label says {wrongGrind}, and your order says {grind}, so the mistake was ours, at packing. Would you like a replacement or a refund?`, arts.label],
			[`Replacement please. Could I keep the other bag for the office?`, `Of course, keep it. The replacement goes out with {rday}'s roast.`],
			[`How did that happen?`, `Two orders of the same coffee were packed side by side and the labels were swapped. We've added a second check at the packing bench.`],
			[`Is the other bag fine to drink?`, `Absolutely; it's the same coffee from the same roast, only a different grind.`]
		],
		need: 'whether you would like a replacement or a refund',
		handAfter: 2,
		workAfter: 1,
		workAsk: `I'd rather not wait for another roast. Is there anything I can do with this bag?`,
		cause: `two orders of {coffee} were packed side by side and the bags were swapped`,
		fixed: [`Right grind this time. Thanks!`, `The new bag arrived and it's the right one. All good.`],
		workaround: [`The {wrongGrind} grind works in a moka pot or an AeroPress with a short brew. If that suits, keep it, and we'll add a free bag of your choice to your next order.`, `Deal, I'll try the AeroPress and take the free bag.`],
		teamSorts: `Your replacement, {coffee} {grind}, left today with {carrier}, tracking {track}. Sorry again for the mix-up.`,
		handover: `Order went out ground for {wrongGrind} instead of {grind}. Can dispatch send the right bag?`,
		outcomes: ['sorted', 'sorted', 'workaround', 'team', 'customer']
	},
	{
		key: 'club-change',
		group: 'club',
		area: 'none',
		weight: 3,
		team: 'the coffee club team',
		clubOnly: true,
		subjects: ['Pause my coffee club', 'Skip my next deliveries', 'Change my subscription'],
		open: [
			`We're away from {awayFrom} to {awayTo}. Can I pause my coffee club so bags don't pile up on the doorstep?`,
			`I'd like to skip a couple of my club deliveries while we're traveling. I can't find a page for the club on the shop.`
		],
		more: [`I don't want to cancel, just pause.`, `Last time I had to call, so I wondered if there's an easier way now.`],
		quick: [`Can I change my club coffee without calling?`, `Yes, just reply to any club email or write to us here, and the club team will switch it before the next roast.`],
		reply: `Happy to help. The coffee club is run by our club team rather than on the shop. Which deliveries would you like to skip, by date?`,
		turns: [
			[`The ones on {d2} and {d3}.`, `Thanks. Your next deliveries are below. Shall I skip {d2} and {d3} and carry on from {d4}?`, arts.club, 'a'],
			[`Yes, exactly that.`, `Done: {d2} and {d3} are skipped and your club carries on from {d4}. You won't be charged for the skipped ones.`],
			[`Will the {d4} bag be freshly roasted, or one that's been waiting?`, `Freshly roasted: club bags are roasted for each delivery, never ahead.`],
			[`Can I change the grind from {d4} too, to {grind}?`, `Done: from {d4} your club comes as {grind}.`]
		],
		need: 'whether to skip {d2} and {d3} and carry on from {d4}',
		cause: `the club is run by the club team, not on the shop`,
		fixed: [`Perfect, thanks. That's a weight off.`, `Great, that's exactly what I wanted.`],
		teamSorts: `I've made the change: {d2} and {d3} are skipped, and the club carries on from {d4} with the same coffee and grind.`,
		handover: `Customer wants to skip club deliveries ({clubLine}); dates in the thread. Can the club team make the change and confirm?`,
		outcomes: ['sorted', 'sorted', 'team', 'customer']
	},
	{
		key: 'refund-missing',
		group: 'payment',
		area: 'none',
		weight: 2,
		team: 'finance',
		subjects: ['Refund not received', "Where's my refund?", 'Still waiting for money back'],
		open: [
			`I was told a refund of {refundAmt} was on its way for the {coffee} that arrived stale. Nothing has reached my card yet.`,
			`I sent back the {gear} a couple of weeks ago and haven't seen the refund. Can you check?`
		],
		more: [`It's been more than two weeks.`, `I wondered if it went to my old card.`],
		quick: [`How long does a refund take to show up?`, `Five to ten working days from when we send it, depending on the bank.`],
		reply: `Sorry it's dragging. Could you tell me the last four digits of the card the refund should go to?`,
		turns: [
			[`{card4}.`, `Thanks. Our records show the refund below, {refund}, sent to the card ending {card4}. Banks take five to ten working days to show it. Could you look for a credit with that reference on your statement?`, arts.refund, 'a'],
			[`It's there, I just didn't recognize the description.`, `It shows as "CPRLF COFFEE" on most statements, which isn't very helpful, I know.`],
			[`Can you make the name clearer on statements?`, `I've asked finance; the short name comes from our card processor and has a character limit.`],
			[`Will the refund come to the card I paid with?`, `Yes, refunds always go back to the card that paid.`]
		],
		need: 'whether your statement shows a credit with reference {refund}',
		workAfter: 1,
		workAsk: `My bank says they can't see anything with that reference.`,
		cause: `the refund had gone through under the statement name "CPRLF COFFEE"`,
		fixed: [`Found it, thanks for the reference.`, `The money's there. Thank you.`],
		workaround: [`Then, rather than keep you waiting while it's traced, I can give you store credit for {refundAmt} right away, to use on your next order.`, `Store credit is fine, I order every month anyway.`],
		teamSorts: `The refund came back to us because the card ending {card4} had been closed. I've sent it again to the new card on your store account, reference {refund2}.`,
		handover: `Refund {refund} to the card ending {card4} hasn't reached the customer. Can finance trace it?`,
		outcomes: ['sorted', 'sorted', 'workaround', 'team', 'customer']
	},
	{
		key: 'gift-missing',
		group: 'gift',
		area: 'none',
		weight: 2,
		team: 'the marketing team',
		mainOnly: true,
		subjects: ['Gift card not received', 'My gift never arrived', 'Gift email missing'],
		open: [
			`I bought a {giftKind} for my {rel} {recipFirst} on {past} and {recipPron2} says nothing has arrived. It was supposed to be emailed straight away.`,
			`I gave my {rel} {recipFirst} a {giftKind} for {occasion}, and {recipPron2} hasn't heard anything from you.`
		],
		more: [`It was a surprise, so I'd rather {recipPron2} didn't hear about it from me.`, `I've had my own confirmation, so the payment went through.`],
		quick: [`Can a gift card be used in the café as well as online?`, `Online only for now; the café takes its own gift cards.`],
		reply: `Oh no, let's find it. Could you tell me the email address you entered for {recipFirst} at checkout?`,
		turns: [
			[`{recipEmail}, I think.`, `Thanks. The gift email went to {recipTypo}, which looks like a typing slip for {recipEmail}. Shall I have it sent again to {recipEmail}?`, arts.gift, 'a'],
			[`Yes please!`, `It's on its way again. It should arrive within a few minutes, and the code in it is all {recipFirst} needs.`],
			[`Can I see when {recipPron2} opens it?`, `We can't see that, I'm afraid, but the code shows as used once {recipPron2} spends it, and I can tell you then if you ask.`],
			[`Does the gift card expire?`, `No, Copperleaf gift cards don't expire.`]
		],
		need: 'whether to send the gift again to {recipEmail}',
		cause: `the gift email went to {recipTypo}, a typing slip for {recipEmail}`,
		fixed: [`{recipFirst} got it and loved it. Thank you!`, `It arrived, and {recipPron2}'s thrilled.`],
		teamSorts: `I've cancelled the gift code that went to {recipTypo} and sent a new one to {recipEmail}.`,
		handover: `Gift email for order {order} went to {recipTypo}; should be {recipEmail}. Marketing, can you cancel that code and send a new one?`,
		outcomes: ['sorted', 'sorted', 'team', 'customer']
	},
	{
		key: 'wholesale',
		group: 'business',
		area: 'none',
		weight: 1,
		team: 'the wholesale team',
		subjects: ['Wholesale enquiry', 'Coffee for our café', 'Office coffee supply'],
		open: [
			`I'm opening a small café in {town} in {month} and I'd love to serve your {coffee}. Do you sell wholesale, and what would {lbs} lb a week cost?`,
			`Our office of {staff} gets through a lot of coffee. Could we set up a regular wholesale order with an invoice, rather than paying by card?`
		],
		more: [`We'd want an espresso and a filter coffee.`, `I can come to the roastery for a tasting if that helps.`],
		quick: [`Do you sell to offices?`, `We do. Our wholesale team sets up regular deliveries on invoice; I can put you in touch.`],
		reply: `Thanks for thinking of us! To get you the right prices, could you tell me roughly how much you'd need a week, and what you brew on?`,
		turns: [
			[`About {lbs} lb a week, on a two-group espresso machine and a batch brewer.`, `Thanks. For that amount we'd usually start with a tasting at the roastery and our price list. Which days of the week suit you for a visit?`],
			[`Tuesdays or Thursdays.`, `Lovely. I've put you down for a tasting on {date} at 10 am at the roastery, and our price list is on its way to {email}.`],
			[`Should I bring anything?`, `Just whoever will be making the coffee, and an idea of the drinks you'll serve.`],
			[`Do you train staff?`, `Yes, the brew school runs a free half-day for every new wholesale account.`]
		],
		need: 'which days of the week suit you for a tasting',
		cause: `wholesale accounts are set up by the wholesale team`,
		fixed: [`Booked in, looking forward to it. Thanks!`, `Price list received and the tasting is in my calendar.`],
		teamSorts: `I've sent our wholesale price list to {email} and booked a tasting at the roastery for {date} at 10 am; tell me if it doesn't suit. Bring whoever will be on the bar.`,
		handover: `Wholesale enquiry: about {lbs} lb a week. Over to the wholesale team for prices and a tasting.`,
		outcomes: ['sorted', 'team', 'team', 'customer']
	},
	{
		key: 'class',
		group: 'school',
		area: 'none',
		weight: 1,
		team: 'the brew school',
		subjects: ['Brew class booking', 'Change my class date', 'Class sold out?'],
		open: [
			`I booked "{class}" for {classDate} but I can't make it now. Can I move to another date?`,
			`I'd like two places on "{class}". The booking page says {classDate} is sold out; are there other dates?`
		],
		more: [`It's a birthday present for my {spouseRel}, so I'd like to keep it somehow.`, `Happy to go on a waiting list if needed.`],
		quick: [`Do you run classes for beginners?`, `Yes: "Pour-over at Home" assumes nothing, and the Friday public cupping is free.`],
		reply: `Of course. Which dates would work for you over the next month or so?`,
		turns: [
			[`Any weekend in {nextMonth}.`, `Thanks. The next "{class}" sessions with space are {cd1} and {cd2}. Which would you like?`],
			[`{cd1}, please.`, `You're booked on {cd1}, 10 am at the roastery. Here's the confirmation.`, arts.booking, 'a'],
			[`Is there parking?`, `There's free parking behind the roastery at weekends; the entrance is on Foundry Street.`],
			[`Can I bring my own grinder?`, `Please do; the instructor is happy to help you set it up.`]
		],
		need: 'which of {cd1} and {cd2} you would like',
		cause: `the class had to move to another date`,
		fixed: [`Confirmation received, see you then!`, `Booked, thanks so much.`],
		teamSorts: `I've pencilled you in for {cd1}, 10 am at the roastery; if {cd2} suits better, just say. The confirmation is in your inbox.`,
		handover: `Customer wants another date of "{class}". Brew school, can you sort it?`,
		outcomes: ['sorted', 'sorted', 'team', 'customer']
	},
	{
		key: 'decaf',
		group: 'coffee',
		area: 'none',
		weight: 1,
		team: 'the roastery',
		subjects: ['Decaf question', 'How is your decaf made?', 'Caffeine in Lanternlight'],
		open: [
			`I've been told to cut out caffeine. How is your Lanternlight Decaf decaffeinated, and how much caffeine is left?`,
			`My doctor wants me off caffeine. Is your decaf done with chemicals? I'd like to know before I order.`
		],
		more: [`I still want something that tastes like real coffee.`, `I've had headaches from other decafs, so I'm wary.`],
		quick: [`Is your decaf done with solvents?`, `No, Lanternlight is decaffeinated with the Swiss Water Process, which uses only water, temperature and time.`],
		reply: `Thanks for asking. Lanternlight Decaf is decaffeinated with the Swiss Water Process, which uses only water, temperature and time. Would you like the caffeine figure from the latest lab test?`,
		turns: [
			[`Yes, please.`, `The latest lot tested at {caf} mg of caffeine in a 12 oz cup, against about 200 mg for regular coffee. Would you like a sample before committing to a full bag?`, arts.lab, 'a'],
			[`A sample would be great.`, `I'll send a 3 oz sample this week; it's on us.`],
			[`Does it taste like decaf?`, `We think not: it's a Colombian with notes of milk chocolate and cherry. You'll tell us.`],
			[`Is it any good for cold brew?`, `It is; a coarse grind and twelve to sixteen hours in the fridge works well.`]
		],
		need: 'whether you would like a sample before a full bag',
		cause: `the customer wanted to know about the decaf process`,
		fixed: [`Sample arrived and it's delicious. Ordering a bag now.`, `Thanks for the sample and the information.`],
		teamSorts: `The latest Lanternlight lot tested at {caf} mg a cup; I've posted you a 3 oz sample today.`,
		handover: `Customer asks about the decaf process and caffeine content. Roastery, can you answer and send a sample?`,
		outcomes: ['sorted', 'sorted', 'team', 'customer']
	},
	{
		key: 'address',
		group: 'parcel',
		area: 'none',
		weight: 2,
		team: 'dispatch',
		mainOnly: true,
		subjects: ['Change delivery address', 'Wrong address on my order', 'Moving house'],
		open: [
			`I've just placed order {order} and realized it's going to our old address. We moved last week. Can you change it?`,
			`Can I change the address on order {order}? I'll be staying with my {rel} for a few weeks.`
		],
		more: [`It's the second time I've done this, sorry.`, `The new address is in the same town, if that helps.`],
		quick: [`Can I have my club sent to my work address?`, `Yes, any US address. Reply with it and we'll change it before the next roast.`],
		reply: `Let's catch it before it ships. What's the new address?`,
		turns: [
			[`{street}, {town}, {state} {zip}.`, `Thanks. Let me check with dispatch whether it has been packed yet. Do you want future orders to go there too?`],
			[`Yes, from now on.`, `Good news: it hadn't been packed, so dispatch has relabeled it to {street}. Change the address in your store account as well, and your next checkout will offer it.`],
			[`And the coffee club?`, `I've changed the club's address too, from the next delivery.`],
			[`Will the shipping email show the new address?`, `Yes, it goes out when the parcel leaves us, with the new address on it.`]
		],
		need: 'whether future orders should go to the new address',
		workAfter: 1,
		cause: `the order was placed with the old address`,
		fixed: [`It arrived at the new place. Thank you!`, `Got it at the new address. Brilliant.`],
		workaround: [`I'm sorry: it had already left us this morning. The quickest way is to ask {carrier} to redirect it; with tracking number {track} you can do that on their website for a small fee, which we'll refund.`, `OK, I'll redirect it with {carrier}. Thanks.`],
		teamSorts: `Order {order} is relabeled to {street}, {town}.`,
		handover: `Order {order} needs a new address: {street}, {town}, {state} {zip}. Dispatch, can you relabel it before it goes?`,
		outcomes: ['sorted', 'workaround', 'team', 'customer']
	},
	{
		key: 'code',
		group: 'gift',
		area: 'none',
		weight: 2,
		team: 'the marketing team',
		subjects: ['Discount code not working', 'Promo code rejected', 'Newsletter code?'],
		open: [
			`The code {code} from your newsletter says "This code isn't valid" at checkout.`,
			`I tried {code} in the store and it won't apply. The email said it was good until the end of the month.`
		],
		more: [`It's in capitals, copied straight from the email.`, `I've tried it on my phone and my laptop.`],
		quick: [`Can I use two discount codes on one order?`, `Only one per order, I'm afraid; the store keeps the bigger one.`],
		reply: `Sorry about that. Could you tell me what's in your basket? Some codes only work on certain things.`,
		turns: [
			[`Two bags of {coffee} and a {gear}.`, `Thanks. {code} is for coffee only, and the {gear} in the basket stops it applying. Could you try it with just the coffee?`, arts.basket],
			[`Tried that, still not valid.`, `Thanks for trying. The code was set up to end on {codeEnd} instead of at the end of the month, so the store turns it down. I've asked the marketing team to correct the date; it should work again later today.`],
			[`Will next month's newsletter code have the same problem?`, `I've told the marketing team, so they'll check the dates on the next one.`],
			[`Does the code work on the coffee club?`, `No, newsletter codes are for one-off orders in the store.`]
		],
		need: 'whether the code works with only the coffee in the basket',
		cause: `the code was set up to end on {codeEnd} instead of at the end of the month`,
		fixed: [`Code works now. Thanks!`, `Applied it and placed the order, all good.`],
		workaround: [`I can't change the code myself, but I can refund the difference once you've placed your order, so you don't lose out.`, `That's fine, I'll order now and wait for the refund.`],
		teamSorts: `I've corrected the end date on {code}, so it works until the end of the month. Sorry for the trouble.`,
		handover: `Newsletter code {code} is turned down at checkout. Marketing, can you check how it's set up?`,
		outcomes: ['sorted', 'workaround', 'team', 'customer']
	},
	{
		key: 'gear-fault',
		group: 'gear',
		area: 'none',
		weight: 1,
		team: 'dispatch',
		subjects: ['{Gear} stopped working', '{Gear} problem', 'Faulty {gear}'],
		open: [
			`The {gear} I bought from you in {buyMonth} has started {fault}. It's only a few months old.`,
			`My {gear} is {fault}. Is that normal, or is it faulty?`
		],
		more: [`I've cleaned it as the leaflet says.`, `It's used every day, but gently.`],
		quick: [`How often should I clean my grinder?`, `A quick brush every week or two, and a proper clean of the burrs every couple of months.`],
		reply: `Sorry to hear that. Could you send a short video of what it does?`,
		turns: [
			[`Video attached.`, `Thanks. That looks like {faultCause}. Have you tried {tryFix}?`],
			[`Tried it, no change.`, `Thanks for trying. Then it's a warranty case: it's covered for two years, so we'll send you a new one with a prepaid label for the old one.`],
			[`Do I need the original box?`, `No, any box will do, as long as it's padded.`],
			[`Is the warranty two years from when I bought it?`, `Yes, two years from the order date, {buyMonth} in your case.`]
		],
		need: 'whether {tryFix} made a difference',
		handAfter: 2,
		cause: `the {gear} has {faultCause} and is covered by the warranty`,
		fixed: [`New {gear} arrived and works perfectly.`, `The replacement is here and it's great. Thanks!`],
		teamSorts: `A new {gear} went out today with {carrier}, tracking {track}, with a prepaid label for the old one.`,
		handover: `Customer's {gear}, bought in {buyMonth}, is {fault} (video in the thread). Dispatch, can you arrange a warranty replacement?`,
		outcomes: ['sorted', 'sorted', 'team', 'customer']
	},
	{
		key: 'lost-property',
		group: 'cafe',
		area: 'none',
		weight: 1,
		team: 'the café',
		subjects: ['Left my {item} at the café', 'Lost property', 'Did anyone hand in my {item}?'],
		open: [
			`I think I left my {item} at your café on {past} afternoon. Has anyone handed it in?`,
			`I was at the roastery café on {past} and I've lost my {item}. Is there a lost property box?`
		],
		more: [`It has sentimental value, so I'd be grateful if you could look.`, `I came in around two, if that helps.`],
		quick: [`What are the café's hours?`, `Seven to three every day, and eight to two on public holidays.`],
		reply: `I'll ask the café. Could you describe it and where you were sitting?`,
		turns: [
			[`It's {itemDesc}. I was by the window.`, `Thanks, I've asked the café team to look in lost property. When could you pick it up if they have it?`],
			[`Tomorrow morning.`, `They've found it: it's behind the counter in a bag with your name on it.`],
			[`Can someone else collect it for me?`, `Yes, as long as they give your name at the counter.`],
			[`How long do you keep lost property?`, `Four weeks, then it goes to the thrift store down the street.`]
		],
		need: 'when you could pick it up',
		cause: `the {item} was handed in at the café`,
		fixed: [`Picked it up today. Thanks so much!`, `Got it back, thank you!`],
		teamSorts: `We have your {item} behind the counter, in a bag with your name on it. Pick it up any day from 7 till 3.`,
		handover: `Customer lost {itemDesc} by the window. Café, can you check lost property?`,
		outcomes: ['sorted', 'sorted', 'team', 'customer']
	},
	{
		key: 'club-price',
		group: 'club',
		area: 'none',
		weight: 2,
		team: 'the coffee club team',
		clubOnly: true,
		subjects: ['Club price went up', 'Why am I paying more?', 'Price change on my club'],
		open: [
			`My coffee club charge went from {oldPrice} to {newPrice} this month. Nobody told me about a price rise.`,
			`This month's club charge is {newPrice}, and it's always been {oldPrice}. What changed?`
		],
		more: [`I've been in the club for over a year and it's never changed before.`, `If prices have gone up, fair enough, but I'd like to know.`],
		quick: [`Is the roaster's choice in the club more expensive?`, `Sometimes: it follows the month's pick, so a rare coffee can cost a little more.`],
		reply: `Thanks for checking with us. Could you tell me the date of the charge, so I can find it?`,
		turns: [
			[`{clubDate}.`, `Thank you. That charge was for {coffee2}, this month's roaster's choice, which costs more than {coffee}. Did you choose the roaster's choice, or did you mean to stay with {coffee}?`],
			[`I never chose that.`, `I see what happened: your club was set to follow the roaster's choice whenever it changes. I've set it back to {coffee} from now on.`],
			[`Will this month's difference come back to me?`, `Yes, the {diff} difference is on its way back to your card.`],
			[`Can I have the roaster's choice only in some months?`, `Yes, tell us before the 20th of the month and we'll switch that delivery.`]
		],
		need: "whether you chose the roaster's choice",
		cause: `the club was set to follow the roaster's choice, which cost more this month`,
		fixed: [`Thanks, the refund came through.`, `Great, thanks for putting it right.`],
		teamSorts: `I've set your club back to {coffee} and refunded the {diff} difference for this month.`,
		handover: `Club charge went from {oldPrice} to {newPrice} and the customer wasn't expecting it. Club team, can you check the club's settings?`,
		outcomes: ['sorted', 'team', 'team', 'customer']
	},
	{
		key: 'moving-abroad',
		group: 'club',
		area: 'none',
		weight: 1,
		team: 'the coffee club team',
		mainOnly: true,
		clubOnly: true,
		subjects: ['Shipping to {intlCity}?', 'Do you ship abroad?', 'Moving overseas'],
		open: [`I'm moving to {intlCity} soon. Will you ship my club there?`, `Do you ship outside the US? We're moving to {intlCity} in {month}.`],
		more: [`I'd hate to give up the club.`, `We're keeping a mailing address in {town} for a while.`],
		quick: [`Do you ship to Canada?`, `Not yet; we ship within the US only.`],
		reply: `We'd hate to lose you! At the moment we ship only within the US. When do you move, so I can work out what to do with your club deliveries?`,
		turns: [
			[`On {date}.`, `Thanks. Your last delivery before then would be {d2}. Shall I pause the club after that?`],
			[`Yes, pause it.`, `Done: the club stops after {d2}, and it will be there to restart if you come back.`],
			[`Can I still buy gift cards for people in the US?`, `Of course, from anywhere.`],
			[`Will my account stay open?`, `Yes, your account and order history stay as they are.`]
		],
		need: 'whether to pause the club after {d2}',
		workAfter: 1,
		workAsk: `Rather than pausing, is there any way to keep getting it?`,
		cause: `Copperleaf ships within the US only`,
		fixed: [`Thanks, all set. We'll miss the coffee.`, `Perfect, thank you.`],
		workaround: [`Some customers have their club sent to family in the US and pick it up on visits. If that would help, give me the address and I'll switch it.`, `My sister is in {town}, so send it there: {street}, {town}, {state} {zip}.`],
		handover: `Customer moving abroad.`,
		outcomes: ['sorted', 'workaround', 'customer']
	},
	{
		key: 'farm',
		group: 'coffee',
		area: 'none',
		weight: 1,
		team: 'the roastery',
		subjects: ['Loved the {single}!', 'Question about the farm', 'Where does this coffee come from?'],
		open: [`Just wanted to say the {single} is the best coffee I've had in years. Could you tell me more about where it comes from?`, `Who grows the {single}? I'd love to know a bit more before I order another bag.`],
		more: [`I'm a bit of a coffee nerd, so details welcome.`, `I've told all my friends about it.`],
		quick: [`Will the {single} be back next year?`, `We hope so; we buy from the same producers year after year when the harvest allows.`],
		reply: `That's lovely to hear, thank you! I'll pass it on to the roastery. Are you more interested in how it's grown and processed, or in whether we'll keep having it?`,
		turns: [
			[`Both, really.`, `{single} comes from {producer}, in {origin}, grown at about {alt} meters and {process}. We taste {notes} in it. Would you like us to keep some back for you?`],
			[`Yes please, could you hold two bags?`, `Done: two bags are set aside for you until the end of the month.`],
			[`How long will you have it?`, `About {weeks} more weeks at the rate it's going.`],
			[`Do you visit the farms?`, `Our head roaster visits most of our producers every year or two, usually at harvest.`]
		],
		need: 'whether you would like us to keep some back for you',
		cause: `the customer wanted to know about the coffee`,
		fixed: [`Thanks for the story and for holding the bags.`, `Lovely, thank you!`],
		teamSorts: `Thanks for the kind words. {single} is from {producer}, {process}, at {alt} meters; I've set two bags aside for you until the end of the month.`,
		handover: `Fan of {single} asking about the producer. Roastery, fancy answering?`,
		outcomes: ['sorted', 'sorted', 'team', 'customer']
	}
];

// ---------------------------------------------------------------------------------------------------------
// Shared parts of a conversation.
const backstories = [
	`I've been buying from you since the old store days, so I know my way around, but this one has me stumped.`,
	`I'm fairly new to Copperleaf; a friend gave me a bag of {coffee} and I signed up straight after.`,
	`We've been ordering from you for a while and love it, so this is the first time I've had to write in.`,
	`I'm not great with websites, so forgive me if this is obvious.`,
	`I order for our small office as well as for home, which might be why my account is a muddle.`,
	`I tried the chat last night but nobody was around, so I'm writing instead.`,
	`I'm writing from my phone, so apologies for typos.`,
	`My {spouseRel} usually handles our orders, but {spousePron2}'s away this week.`,
	`We moved to {town} in the summer and Copperleaf is one of the things we kept from the old place.`,
	`I drink your {coffee} every morning, so I notice when anything is off.`
];
const firstGreetings = ['Hi,', 'Hello,', 'Hi there,', 'Hi Copperleaf,', 'Hello Copperleaf team,', ''];
const replyGreetings = ['Hi {agent},', '{agent},', '', 'Hi again,', 'Hello {agent},', 'Hi {agent},', 'Thanks {agent},'];
const custSignoffs = ['Thanks,\n{first}', 'Many thanks,\n{full}', 'Cheers,\n{first}', 'Best,\n{full}\n{town}, {state}', '{first}', 'Thank you!\n{first}', 'Sent from my phone'];
const replySignoffs = ['Thanks,\n{first}', '{first}', 'Cheers, {first}', '', 'Thanks again,\n{first}', '- {first}'];
const agentGreetings = ['Hi {first},', 'Hello {first},', 'Good morning {first},'];
const agentGreetingsLater = ['Hi {first},', 'Hello again {first},', 'Hello {first},'];
const agentSignoffs = ['Best,\n{agent}\nCopperleaf Customer Care', 'Thanks,\n{agent}', 'Warmly,\n{agent} | Copperleaf Coffee', 'Talk soon,\n{agent}', 'All the best,\n{agent}\nCustomer Care, Copperleaf Coffee'];
const agentIntros = [`Thanks for getting in touch.`, `Thanks for the clear description; it helps a lot.`, `Sorry for the wait; it's been a busy few days here.`, `Thanks for reaching out about this.`, `Thanks for writing, and for drinking our coffee.`];
const custAcks = [`Thanks, that helps.`, `OK, understood.`, `Right.`, `Thanks for the quick reply.`, `Ah, I see.`, `Makes sense.`, `Great, thanks.`, `OK.`];
const vagueSubjects = ['Help please', 'A few questions', 'Question about my account', 'Problem', 'Following up', '(no subject)', 'Re: Thanks for your order', 'Quick question', 'Hello'];
const holdings = [`Thanks, let me look into this properly and come back to you.`, `Thanks for that. I want to check something with a colleague before I answer, so bear with me.`, `Got it, thank you. I'll dig into it and write back.`];
const webNotes = [
	`Tried the same on the test account on the shop and got the same result.`,
	`Checked the shop admin: account {login}, {count} orders, nothing odd in the history.`,
	`Third one like this this month; the help page doesn't cover it.`
];
const generalNotes = [
	`Long-time customer, {count} orders. Worth looking after.`,
	`Customer sounded rushed on the phone earlier; keeping replies short.`,
	`Checked the store record and the shop account: same name and address on both.`,
	`Nothing similar on other tickets this week.`,
	`Customer since {sinceMonth}; no earlier complaints.`
];
const passLines = [
	`I've passed this to {team}, who can look into it more closely than I can. They'll reply on this ticket, so their answer will come to you by email.`,
	`I've asked {team} to take this one. They'll pick it up from here and write to you on this ticket.`,
	`This needs {team}, so I've handed it to them with everything above. You'll hear from them here.`
];
const webPassLines = [
	`I've passed this to the web team, who look after the shop, so they can see it for themselves. They'll reply here.`,
	`I've shown this to our web team, who run shop.copperleaf.coffee. They'll write to you on this ticket.`
];
const changeAsks = [`Is that going to be fixed? It must catch other people out too.`, `Could the page be changed so this doesn't happen to someone else?`, `Is anyone going to look at the page itself?`, `Fine, but surely the site should make that clearer?`];
const changeAcks = [`Thanks, I'll keep an eye out.`, `Good to know, thanks.`, `Great, thanks for passing it on.`, `OK. Thanks for explaining.`];
const mateAcks = [`Hi {first}, {mate} from {teamName} here. I've picked this up and will be in touch once I've had a proper look.`, `Hello {first}, this is {mate} from {teamName}. Thanks for your patience; I'm on it and will update you here.`];
const thanksLines = [`Thanks, I'll look out for it.`, `Great, thank you.`, `Appreciated, thanks.`, `Thanks, speak then.`];
const closings = [`Glad that's sorted. Enjoy the coffee!`, `Great to hear. I'll close this, but just reply if anything else comes up.`, `Wonderful, thanks for letting me know.`, `Happy brewing!`];
const nudges1 = [`Just checking in. When you have a moment, I still need to know {need} to get any further. I'll pick it up as soon as I hear.`, `Following up on my last message: could you let me know {need}? No rush, I just want to make sure it didn't get buried.`, `I don't want this to slip through the cracks. If you can tell me {need}, I can carry on from there.`];
const nudges2 = [`I haven't heard back, so I'll assume things are fine for now. If not, reply here and let me know {need}, and I'll take it from there.`, `One last nudge from me. Whenever you're ready, reply to this email and it comes straight back to me with everything above.`];
const chatHellos = [`Hi {first}, I'm {agent} from Copperleaf Customer Care. Let me read your message.`, `Hello {first}, {agent} here. Thanks for waiting.`, `Hi {first}! {agent} from customer care. Give me a second to catch up.`];
const chatHandoffs = [`I'll leave this open, so you can reply to the email copy of this chat with anything else.`, `If anything else comes up, reply to the email copy of this chat and it comes straight back to me.`];
const callIntros = [`{first} called about this. What {pron} told me, roughly in {pron2} words:`, `Call from {first}, about {mins} minutes. In short, as {pron} put it:`, `Phone call with {first}. {pron3} said:`];
const callReplies = [`Thanks for calling earlier. As promised, here's where things stand.`, `Following up on our call.`, `Thanks for the call. I said I'd write, so here goes.`];
const pastContacts = [
	'Asked to change the club grind', 'Parcel late, arrived the next day', 'Question about the decaf', 'Card declined, paid by phone', 'Booked a public cupping',
	'Changed the delivery address before dispatch', 'Asked for a receipt for expenses', 'Gift card balance', 'Feedback: loved the Guji Hambela', 'Asked about bags for an office',
	'Skipped a club delivery', 'Wrong coffee in the box, replaced', 'Asked when the Kenya is back', 'Moved the club to every 4 weeks'
];

// ---------------------------------------------------------------------------------------------------------
// One ticket.
interface Item {
	who: 'c' | 'a' | 'note' | 'mate';
	paras: string[];
	art?: () => string;
	wait?: 'long';
	team?: string;
}

const totalWeight = topics.reduce((sum, topic) => sum + topic.weight, 0);
const weighted = (r: Rand) => {
	let left = r() * totalWeight;
	for (const topic of topics) if ((left -= topic.weight) < 0) return topic;
	return topics.at(-1)!;
};
const forSide = (text: string) => text.replace(/\{order\}/g, '{order2}').replace(/\{total\}/g, '{total2}').replace(/\{shown\}/g, '{shown2}');
/** A topic raised on the side: about an earlier order, and opened without an order number where it can be. */
const sideTopic = (topic: Topic): Topic => {
	const plain = topic.open.filter((text) => !text.includes('{order}'));
	return {
		...topic,
		open: (plain.length ? plain : topic.open).map(forSide),
		quick: [forSide(topic.quick[0]), forSide(topic.quick[1])],
		reply: forSide(topic.reply),
		turns: topic.turns.map(([c, a, art, by]) => [forSide(c), forSide(a), art, by] as Turn),
		fixed: topic.fixed.map(forSide)
	};
};
const recent = (ms: number) => (ms < Date.UTC(2026, 0, 1) ? `${MONL[utc(ms).getUTCMonth()]} ${utc(ms).getUTCFullYear()}` : MONL[utc(ms).getUTCMonth()]!);

const ticket = (index: number, maxSides: number) => {
	const r = mulberry32(0x5eed1e00 + index * 104729);
	const openDay = days[Math.floor((index * days.length) / ITEMS)]!;
	const main = weighted(r);
	let outcome = pick(r, main.outcomes);
	if (outcome === 'customer' && !main.need) outcome = 'sorted';
	const web = main.team === WEB;
	const viaTeam = outcome === 'sorted' && !!main.teamSorts && (main.sortedViaTeam || chance(r, 0.35));
	const workViaWeb = outcome === 'workaround' && web && !main.workAsk && !main.workByCare && chance(r, 0.3);
	const partial = outcome !== 'sorted' || viaTeam;
	const channel = pick(r, ['email', 'email', 'email', 'chat', 'chat', 'phone', 'contact form']);

	// Who and where.
	const female = chance(r, 0.5);
	const first = pick(r, female ? firstF : firstM);
	const last = pick(r, surnames);
	const lf = first.toLowerCase();
	const ll = last.toLowerCase();
	const [town, state, zip] = pick(r, places);
	const oldStore = main.oldStoreOnly || chance(r, 0.3);
	const club = main.clubOnly || chance(r, 0.55);
	const custno = String(int(r, 10200, 23900));
	const custLogin = main.key === 'cust-login' || (oldStore && main.group !== 'login' && main.key !== 'bookmark' && chance(r, 0.2));
	const login = custLogin ? `cust${custno}` : pick(r, [`${lf}_${ll}`, `${lf}${ll.slice(0, 1)}`, `${lf.slice(0, 1)}${ll}`, `${lf}${int(r, 10, 99)}`, `${ll}_${lf.slice(0, 1)}`, `coffee_${lf}`]);
	const oldLogin = oldStore && chance(r, 0.5) ? `cust${custno}` : pick(r, [`${lf}${int(r, 10, 99)}`, `${lf}_${ll.slice(0, 3)}`, `${ll}${lf.slice(0, 1)}`].filter((name) => name !== login));
	const since = oldStore ? IMPORTED : SHOP_OPENED + (main.key === 'newest-bottom' ? int(r, 3, 120) : int(r, 3, 520)) * DAY;
	const domain = pick(r, ['example.com', 'example.net', 'example.org', 'mail.example']);
	const email = `${pick(r, [`${lf}.${ll}`, `${lf}${ll.slice(0, 1)}`, `${lf.slice(0, 1)}${ll}`, `${lf}${int(r, 70, 99)}`])}@${domain}`;
	const spouseFemale = chance(r, 0.6) ? !female : female;
	const spouseFirst = pick(r, (spouseFemale ? firstF : firstM).filter((name) => name !== first));
	const recipFemale = chance(r, 0.5);
	const recipFirst = pick(r, recipFemale ? firstF : firstM);
	const recipEmail = `${recipFirst.toLowerCase()}.${pick(r, surnames).toLowerCase()}@example.com`;
	const recipTypo = chance(r, 0.5) ? recipEmail.slice(0, recipEmail.indexOf('@')) + '@exmaple.com' : recipEmail.slice(0, 2) + recipEmail.slice(3);
	const coffee = pick(r, allCoffees);
	const single = coffees.find((entry) => entry.name === coffee) ?? pick(r, coffees);
	const plan = pick(r, oldPlans);
	const agent = pick(r, agents);
	const team = main.team;
	const tool = pick(r, gear);
	const card4 = String(int(r, 1000, 9999));
	const carrier = pick(r, carriers);
	const tracking = () => (carrier === 'UPS' ? `1Z${int(r, 100, 999)}W${int(r, 10000000, 99999999)}` : `9405 5112 ${int(r, 1000, 9999)} ${int(r, 1000, 9999)} ${int(r, 1000, 9999)} ${int(r, 10, 99)}`);
	const badStyle = int(r, 0, 3);

	// The order history: from the account's start to the latest order, a few days before the ticket.
	const age = Math.floor((openDay - since) / DAY);
	const count = main.key === 'newest-bottom' ? int(r, 28, 60) : Math.max(2, Math.min(int(r, 2, 40), Math.floor(age / 12)));
	const evening = main.key === 'date-shown';
	const lastPlaced = openDay - int(r, ['newest-bottom', 'pending-card', 'address'].includes(main.key) ? 1 : 3, ['address'].includes(main.key) ? 1 : 9) * DAY + int(r, evening ? 18 * 60 + 5 : 7 * 60, evening ? 22 * 60 : 21 * 60) * MIN;
	const step = Math.max(DAY, Math.floor((lastPlaced - since - 3 * DAY) / count));
	let number = int(r, 48000, 49800) - count * 60;
	const history: Order[] = [];
	for (let i = 0; i < count; i++) {
		const placed = i === count - 1 ? lastPlaced : since + 3 * DAY + i * step + int(r, 0, Math.max(0, Math.floor(step / DAY) - 1)) * DAY + int(r, 7 * 60, 21 * 60) * MIN;
		const what = `${pick(r, allCoffees)} ${pick(r, ['12 oz', '12 oz', '2 lb'])}, ${pick(r, grinds)}${chance(r, 0.4) ? ' x2' : ''}`;
		const cents = i === count - 1 ? int(r, 26, 96) * 100 + int(r, 0, 9) : int(r, 18, 120) * 100 + pick(r, [0, 5, 0, int(r, 0, 9), int(r, 10, 99)]);
		number += int(r, 30, 90);
		history.push([placed, i === count - 1 ? main.status ?? pick(r, ['shipped', 'shipped', 'paid']) : chance(r, 0.04) ? 'cancelled' : 'shipped', cents, `C-${number}`, what]);
	}
	if (main.key === 'duplicate-hold') {
		const [placed, , cents, num, what] = history.at(-1)!;
		history.push([placed + int(r, 1, 3) * MIN, 'cancelled', cents, `C-${Number(num.slice(2)) + 1}`, what]);
	}
	const latest = main.key === 'duplicate-hold' ? history.at(-2)! : history.at(-1)!;
	const shippedBefore = history.slice(0, -1).reverse().filter((order) => order[1] === 'shipped');
	const earlier = shippedBefore.find((order) => order[2] % 100 < 10) ?? shippedBefore[0] ?? latest;
	const pastMs = latest[0];
	let ship = midnight(pastMs) + int(r, 1, 2) * DAY + int(r, 13, 16) * HOUR;
	while ([0, 6].includes(utc(ship).getUTCDay())) ship += DAY;
	const d1 = nextRoast(openDay + int(r, 2, 5) * DAY);
	const clubEvery = pick(r, [7, 14, 14, 28]);
	const awayFrom = d1 + clubEvery * DAY - int(r, 1, 4) * DAY;
	const cd1 = midnight(openDay) + int(r, 14, 24) * DAY;
	const cdSat = cd1 + ((6 - utc(cd1).getUTCDay() + 7) % 7) * DAY;
	const oldPrice = int(r, 34, 46);
	const newPrice = oldPrice * 100 + int(r, 4, 9) * 100 + pick(r, [0, 50]);
	const bagPair = int(r, 35, 46) * 100;
	const gearPrice = int(r, 28, 140) * 100;
	const dose = int(r, 15, 32);
	const s: Slots = {
		first, last, full: `${first} ${last}`, email, login, oldLogin, custno,
		goodLogin: `${lf}_${ll}`, goodLogin2: `${lf}${ll}${int(r, 2, 9)}`,
		badLogin: [`${first}${last}`, `${lf}.${ll}`, `${lf}-${ll}`, `${first} ${last}`][badStyle]!, badWhy: ['capital letters', 'a dot', 'a dash', 'capital letters and a space'][badStyle]!,
		oldEmail: `${lf}.${ll}@${pick(r, ['work.example', 'old.example', 'example.edu', 'mail.example'])}`,
		altEmail: `${lf}${ll.slice(0, 1)}${int(r, 10, 99)}@${pick(r, ['example.net', 'example.org'])}`,
		oldYear: String(int(r, 2019, 2024)), made: `${monthDay(SHOP_OPENED + int(r, 5, 90) * DAY)}, 2025`, oldOrders: `${int(r, 2, 6)} orders, the last in ${pick(r, ['June', 'July', 'August', 'September'])} 2025`,
		oldTown: pick(r, places)[0], card4, card4b: String(int(r, 1000, 9999)),
		spouseFirst, spouseRel: spouseFemale ? pick(r, ['wife', 'partner']) : pick(r, ['husband', 'partner']), spousePron: spouseFemale ? 'her' : 'his', spousePron2: spouseFemale ? 'she' : 'he',
		plusEmail: email.replace('@', `+${spouseFirst.toLowerCase()}@`), nick: nicks[first] ?? first.slice(0, 3),
		plan: plan[0], planDesc: plan[1], oldStore: oldStore ? 'yes' : 'no',
		clubLine: `a coffee club delivery every ${clubEvery === 7 ? 'week' : `${clubEvery / 7} weeks`}`,
		clubCoffee: chance(r, 0.4) ? "Roaster's choice" : coffee, clubGrind: pick(r, grinds), clubBags: pick(r, ['1 x 12 oz', '2 x 12 oz', '1 x 2 lb']),
		nameBox: `${first} ${last}`, pwm: pick(r, pwms),
		order: latest[3], total: money(latest[2]), shown: shownMoney(latest[2]), order2: earlier[3], total2: money(earlier[2]), shown2: shownMoney(earlier[2]),
		count: String(count), placedIso: isoDate(latest[0]), status: latest[1], history: JSON.stringify(history),
		past: WDL[utc(pastMs).getUTCDay()]!, pastDate: monthDay(pastMs), pastShort: shortDate(pastMs), oldMonth: recent(history[0]![0]),
		eveTime: clock(lastPlaced), utcAhead: lastPlaced < CLOCKS_BACK ? 'seven' : 'eight', cut: lastPlaced < CLOCKS_BACK ? '5 pm' : '4 pm',
		tries: String(int(r, 2, 3)), decline: pick(r, declines), rday: '', shipDay: fullDay(ship), shipShort: shortDate(ship), hubShort: shortDate(ship + DAY), carrier, track: tracking(), track2: tracking(), hub: pick(r, hubs),
		street: pick(r, streets), town, state, zip, staff: String(int(r, 6, 40)), lastMonth: MONL[utc(openDay).getUTCMonth() - 1]!, n: String(int(r, 3, 4)),
		resetDays: [3, 2, 1, 0].map((back) => shortDate(openDay - back * DAY)).join('|'),
		day: WDL[utc(openDay + int(r, 2, 6) * DAY).getUTCDay()]!, date: fullDay(midnight(openDay) + int(r, 8, 20) * DAY),
		coffee, coffee2: pick(r, allCoffees.filter((name) => name !== coffee)), grind: pick(r, grinds), wrongGrind: '', size: pick(r, ['12 oz', '2 lb']), bags: String(int(r, 1, 3)),
		shipping: pick(r, ['$6.50', 'free']), receiptTo: email, roast: shortDate(openDay - int(r, 9, 20) * DAY), lot: `${pick(r, ['CL', 'HL', 'GJ', 'NY', 'CR', 'KY'])}-${int(r, 2600, 2699)}-${int(r, 10, 99)}`, sourOrBitter: '', finer: '',
		method: pick(r, ['V60 pour-over', 'Chemex', 'AeroPress', 'French press', 'flat-bottom drip machine']), dose: String(dose), setting: String(int(r, 8, 22)), water: String(dose * pick(r, [15, 16, 17])), brewTime: `${int(r, 2, 4)}:${pad(int(r, 0, 5) * 10)}`,
		gear: tool.name, Gear: upperFirst(tool.name), fault: tool.fault, faultCause: tool.cause, tryFix: tool.fix, buyMonth: pick(r, ['April', 'May', 'June', 'July']),
		gearPrice: money(gearPrice), bagPair: money(bagPair), basketTotal: money(gearPrice + bagPair),
		refund: `RF-${int(r, 10000, 99999)}`, refundAmt: money(int(r, 17, 60) * 100 + pick(r, [0, 50, 25])), refundDate: monthDay(openDay - int(r, 9, 16) * DAY), refund2: `RF-${int(r, 10000, 99999)}`,
		recipFirst, rel: pick(r, ['sister', 'brother', 'mom', 'dad', 'friend', 'aunt', 'cousin', 'neighbor']), recipPron2: recipFemale ? 'she' : 'he', recipEmail, recipTypo, occasion: pick(r, [recipFemale ? 'her birthday' : 'his birthday', 'a housewarming', 'a thank-you', 'the holidays']), giftKind: '', giftItem: '',
		lbs: String(int(r, 8, 40)), month: MONL[(utc(openDay).getUTCMonth() + int(r, 2, 4)) % 12]!,
		class: pick(r, classes), classDate: fullDay(cdSat - 7 * DAY), cd1: fullDay(cdSat), cd2: fullDay(cdSat + 7 * DAY), nextMonth: MONL[(utc(openDay).getUTCMonth() + 1) % 12]!, places: pick(r, ['1', '2']),
		caf: String(int(r, 4, 9)), labDate: shortDate(openDay - int(r, 20, 60) * DAY),
		d1: fullDay(d1), d2: fullDay(d1 + clubEvery * DAY), d3: fullDay(d1 + 2 * clubEvery * DAY), d4: fullDay(d1 + 3 * clubEvery * DAY),
		awayFrom: monthDay(awayFrom), awayTo: monthDay(d1 + 2 * clubEvery * DAY + int(r, 1, 5) * DAY),
		code: `${pick(r, ['FALL', 'ROAST', 'HARVEST', 'CUPPA', 'BREW'])}${int(r, 10, 30)}`, codeEnd: monthDay(openDay - int(r, 1, 6) * DAY),
		clubDate: monthDay(openDay - int(r, 3, 12) * DAY), oldPrice: `$${oldPrice}.00`, newPrice: money(newPrice), diff: money(newPrice - oldPrice * 100),
		item: '', itemDesc: '', intlCity: pick(r, intlCities),
		single: single.name, producer: single.producer, process: single.process, alt: single.alt, notes: single.notes, origin: single.origin, weeks: String(int(r, 3, 8)),
		agent, mate: teamPeople[team]!, team, teamName: team, sinceMonth: `${MONL[utc(since).getUTCMonth()]} ${utc(since).getUTCFullYear()}`,
		pron: female ? 'she' : 'he', pron2: female ? 'her' : 'his', pron3: female ? 'She' : 'He', mins: String(int(r, 4, 14)), openMs: '0', need: ''
	};
	s.sourOrBitter = pick(r, ['sour', 'bitter']);
	s.finer = s.sourOrBitter === 'sour' ? 'finer' : 'coarser';
	s.giftKind = pick(r, ['gift card', 'three-month gift subscription']);
	s.giftItem = s.giftKind === 'gift card' ? `Gift card, ${pick(r, ['$30', '$50', '$75'])}` : 'Gift subscription, 3 months';
	const lost = pick(r, items);
	s.item = lost[0];
	s.itemDesc = lost[1];
	s.wrongGrind = pick(r, grinds.filter((name) => name !== s.grind));
	if (main.key === 'guest-order') s.receiptTo = s.altEmail!;
	if (main.key === 'receipts-old-email') s.receiptTo = s.oldEmail!;

	const fill = (text: string): string =>
		text.replace(/\{(\w+)\}/g, (_, key: string) => {
			const value = s[key];
			if (value === undefined) throw new Error(`no slot ${key} in "${text.slice(0, 60)}"`);
			return value;
		});
	s.need = fill(main.need ?? '');

	// Other matters the customer raises: a quick question, and up to three smaller matters discussed in full.
	const used = new Set<string>([main.group]);
	const sideOk = (topic: Topic) => !used.has(topic.group) && !topic.mainOnly && !topic.sortedViaTeam && !(topic.oldStoreOnly && !oldStore) && !(topic.clubOnly && !club);
	const sideKeys: string[] = [];
	const takeSide = () => {
		const topic = pick(r, topics.filter(sideOk));
		used.add(topic.group);
		sideKeys.push(topic.key);
		return sideTopic(topic);
	};
	const quick = chance(r, 0.6) ? takeSide() : undefined;
	const fullCount = Math.min(maxSides, partial ? pick(r, [2, 2, 3, 3, 3]) : pick(r, [1, 2, 2, 3, 3]));
	const fulls = Array.from({ length: fullCount }, () => takeSide());
	const sidesEarly = partial || chance(r, 0.4);
	if (main.key === 'display-name' || sideKeys.includes('display-name')) s.nameBox = '';

	// The conversation, as a list of messages.
	const conversation: Item[] = [];
	let carry: string[] = [];
	const c = (paras: string[], art?: () => string) => {
		conversation.push({ who: 'c', paras: [...carry, ...paras], art });
		carry = [];
	};
	const a = (paras: string[], wait?: 'long', art?: () => string) => conversation.push({ who: 'a', paras, wait, art });
	const artOf = (pair: Turn) => (pair[2] ? () => pair[2]!(r, s) : undefined);
	const turn = (pair: Turn, extra?: [string, string]) => {
		const byCare = pair[3] === 'a';
		c([...(!carry.length && chance(r, 0.3) ? [pick(r, custAcks)] : []), pair[0], ...(extra ? [`Unrelated, but ${lowerFirst(extra[0])}`] : [])], byCare ? undefined : artOf(pair));
		a(extra ? [pair[1], `And on your other question: ${extra[1]}`] : [pair[1]], undefined, byCare ? artOf(pair) : undefined);
	};
	const subThread = (topic: Topic) => {
		a([topic.reply]);
		topic.turns.forEach((pair) => turn(pair));
		carry = [pick(r, topic.fixed)];
	};
	const sides = () =>
		fulls.forEach((topic, position) => {
			const lead =
				position === 0
					? pick(r, [`I'll come back to you on that. In the meantime, something else:`, `Let me get back to you on that one. Meanwhile, a different question:`, `I'll answer that properly later. While I have you, one more thing:`])
					: pick(r, [`Another thing while I'm here.`, `Next question, if that's all right:`, `Something else has come up as well.`]);
			c([lead, pick(r, topic.open), ...(chance(r, 0.65) ? [pick(r, topic.more)] : [])]);
			subThread(topic);
		});
	const opening = [...(chance(r, 0.5) ? [pick(r, backstories)] : []), pick(r, main.open), ...(chance(r, 0.7) ? [pick(r, main.more)] : [])];
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
		a([...(!main.reply.startsWith('Thanks') && chance(r, 0.4) ? [pick(r, agentIntros)] : []), main.reply]);
	}
	if (chance(r, 0.3)) conversation.push({ who: 'note', paras: [pick(r, web ? webNotes : generalNotes)] });
	if (chance(r, 0.65)) conversation.push({ who: 'note', paras: [`Latest orders on the account, from the shop admin:`, arts.adminOrders!(r, s)] });

	// The main matter, as far as the outcome lets it go.
	const quickLater = !quickUsed && chance(r, 0.7) ? quick!.quick : undefined;
	const reach =
		outcome === 'customer' ? main.needAt ?? 1
		: outcome === 'team' ? (chance(r, 0.35) ? 0 : Math.min(main.handAfter ?? 1, 1))
		: viaTeam ? main.handAfter ?? 1
		: outcome === 'workaround' ? main.workAfter ?? 2
		: 2;
	const steps = main.turns.slice(0, reach);
	const resumes = [`Back to my first question:`, `Now, back to the reason I first wrote.`, `And on my original question:`];
	const resume = () => {
		if (fulls.length) carry.push(pick(r, resumes));
	};
	/** Sends what the customer still had to say about the side matters, before care writes again. */
	const flush = () => {
		const kept = carry.filter((line) => !resumes.includes(line));
		carry = [];
		if (kept.length) c(kept);
	};
	if (sidesEarly) {
		sides();
		resume();
	}
	steps.forEach((pair, position) => {
		if (position === 1 && !sidesEarly) {
			sides();
			resume();
		}
		if (position === 1 && chance(r, 0.3)) {
			c([pair[0]], pair[3] === 'a' ? undefined : artOf(pair));
			a([pick(r, holdings)]);
			a([pair[1]], 'long', pair[3] === 'a' ? artOf(pair) : undefined);
		} else turn(pair, position === 0 ? quickLater : undefined);
	});
	if (!steps.length && quickLater) {
		c([quickLater[0]]);
		a([quickLater[1]]);
	}
	if (!partial) {
		const followUps = main.turns.slice(2, 2 + int(r, 1, main.turns.length - 2));
		if (followUps.length >= 2 && chance(r, 0.35)) {
			c([followUps[0]![0], followUps[1]![0]]);
			a([followUps[0]![1], followUps[1]![1]]);
			followUps.slice(2).forEach((pair) => turn(pair));
		} else followUps.forEach((pair) => turn(pair));
	} else if (outcome === 'change' && chance(r, 0.4) && main.turns[2]) turn(main.turns[2]);

	const handOver = () => {
		flush();
		conversation.push({ who: 'note', paras: [`Passing to ${team}: ${main.handover}`] });
		a([pick(r, web ? webPassLines : passLines)]);
	};
	if (outcome === 'sorted') {
		if (viaTeam) {
			handOver();
			conversation.push({ who: 'mate', team, paras: [`Hi {first}, {mate} from {teamName} here.`, main.teamSorts!], wait: 'long' });
		}
		c([pick(r, main.fixed)]);
		if (chance(r, 0.6)) a([pick(r, closings)]);
	} else if (outcome === 'workaround') {
		if (main.workAsk) c([main.workAsk]);
		if (workViaWeb) {
			handOver();
			conversation.push({ who: 'mate', team, paras: [`Hi {first}, {mate} from the web team here.`, `I've had a look: ${main.cause}. ${main.workaround![0]}`], wait: 'long' });
		} else {
			flush();
			a([main.workaround![0]]);
		}
		c([main.workaround![1]]);
		if (chance(r, 0.3)) a([pick(r, closings)]);
	} else if (outcome === 'change') {
		if (chance(r, 0.5)) c([pick(r, changeAsks)]);
		handOver();
		conversation.push({ who: 'mate', team, paras: [`Hi {first}, {mate} from the web team here.`, main.change!], wait: 'long' });
		if (chance(r, 0.5)) c([pick(r, changeAcks)]);
	} else if (outcome === 'team') {
		handOver();
		if (chance(r, 0.4)) c([pick(r, thanksLines)]);
		if (chance(r, 0.5)) conversation.push({ who: 'mate', team, paras: [pick(r, mateAcks)] });
	} else {
		flush();
		conversation.push({ who: 'a', paras: [pick(r, nudges1)], wait: 'long' });
		if (chance(r, 0.6)) conversation.push({ who: 'a', paras: [pick(r, nudges2)], wait: 'long' });
	}

	// Times. Customers write from 7 AM to 11 PM any day; care answers on weekdays, 8 AM to 5 PM. Late tickets get
	// shorter gaps, so that every conversation ends before the export.
	let openMs = Math.max(openDay + int(r, 7 * 60, 22 * 60) * MIN, lastPlaced + 3 * HOUR);
	if (channel === 'phone' || channel === 'chat') {
		if (utc(openMs).getUTCHours() >= 16 || utc(openMs).getUTCHours() < 8) openMs = midnight(openMs) + (utc(openMs).getUTCHours() >= 16 ? DAY : 0) + int(r, 8 * 60, 15 * 60) * MIN;
		while ([0, 6].includes(utc(openMs).getUTCDay())) openMs += DAY;
	}
	s.openMs = String(openMs);
	const schedule = (scale: number): number[] => {
		const rt = mulberry32(0x7151 + index * 7919);
		let now = openMs;
		const gap = (low: number, high: number) => Math.max(1, Math.round(int(rt, low, high) * scale));
		const workHours = () => {
			for (;;) {
				const d = utc(now);
				const hour = d.getUTCHours();
				if (d.getUTCDay() === 0 || d.getUTCDay() === 6 || hour >= 17) now = midnight(now) + DAY + 8 * HOUR + int(rt, 5, 70) * MIN;
				else if (hour < 8) now = midnight(now) + 8 * HOUR + int(rt, 5, 70) * MIN;
				else break;
			}
		};
		return conversation.map((entry, position) => {
			if (position > 0) {
				if (entry.wait === 'long') now += gap(2 * 24 * 60, 4 * 24 * 60) * MIN;
				if (entry.who === 'c') {
					now += gap(15, 1300) * MIN;
					const hour = utc(now).getUTCHours();
					if (hour < 7) now += (7 - hour) * HOUR;
					else if (hour >= 23) now += 8 * HOUR;
				} else if (entry.who === 'note') {
					now += int(rt, 2, 25) * MIN;
					workHours();
				} else {
					now += gap(10, 280) * MIN;
					workHours();
				}
			}
			return now;
		});
	};
	let times = schedule(1);
	for (const scale of [0.6, 0.4, 0.25, 0.15, 0.08]) if (times.at(-1)! >= EXPORT - 6 * HOUR) times = schedule(scale);

	let chatUntil = 0;
	if (channel === 'chat') {
		chatUntil = Math.min(conversation.length, 2 + 2 * int(r, 1, 2));
		while (chatUntil > 0 && (conversation[chatUntil - 1]!.who !== 'a' || conversation.slice(0, chatUntil).some((entry) => entry.who === 'note' || entry.who === 'mate'))) chatUntil--;
	}

	// The file.
	const out: string[] = [];
	const subject = quick && quickUsed && chance(r, 0.3) ? pick(r, quick.subjects) : chance(r, 0.2) ? pick(r, vagueSubjects) : pick(r, main.subjects);
	const ticketNumber = 52300 + index * 4 + int(r, 0, 3);
	out.push(`# Ticket ${ticketNumber}: ${fill(subject)}`, '');
	out.push(
		table(
			['Field', 'Value'],
			[
				['Opened', `${stamp(openMs)}, by ${channel}`],
				['From', `${s.full} <${email}>`],
				['Shop account', `${login}, since ${shortDate(since)}${main.key === 'forgot-login' ? ` (under ${s.oldEmail})` : ''}`],
				['Old store', oldStore ? `plan ${plan[0]}` : 'no'],
				['Coffee club', club ? `every ${clubEvery === 7 ? 'week' : `${clubEvery / 7} weeks`}: ${s.clubCoffee}, ${s.clubGrind}, ${s.clubBags}` : 'none'],
				['Orders', `${count}, the latest on ${shortDate(latest[0])}`],
				['Ships to', `${town}, ${state}`]
			]
		),
		''
	);
	if (chance(r, 0.7)) {
		const span = Math.max(1, Math.floor((openDay - since) / DAY) - 7);
		const contacts = [...new Set(Array.from({ length: int(r, 1, 4) }, () => pick(r, pastContacts)))].map((what) => [since + int(r, 1, span) * DAY, what] as const).sort((x, y) => x[0] - y[0]);
		out.push('### Earlier contact', '', table(['Date', 'What'], contacts.map(([when, what]) => [shortDate(when), what])), '');
	}
	out.push('## Conversation', '');
	const at = (ms: number) => {
		s.rday = WDL[utc(nextRoast(ms)).getUTCDay()]!;
	};
	if (chatUntil > 0) {
		out.push(`### Chat with ${agent} · ${stamp(times[0]!)}`, '');
		const lines: string[] = [];
		conversation.slice(0, chatUntil).forEach((entry, position) => {
			at(times[position]!);
			const who = entry.who === 'c' ? first : agent;
			const when = clock(times[0]! + (position * 3 + int(r, 0, 2)) * MIN);
			if (position === 1) lines.push(`**${when} ${agent}:** ${fill(pick(r, chatHellos))}`);
			entry.paras.forEach((para) => lines.push(`**${when} ${who}:** ${fill(para)}`));
			if (entry.art) lines.push(entry.art());
		});
		if (chatUntil < conversation.length) lines.push(`**${clock(times[0]! + (chatUntil * 3 + 2) * MIN)} ${agent}:** ${fill(pick(r, chatHandoffs))}`);
		out.push(lines.join('\n\n'), '');
		const shift = times[0]! + (chatUntil * 3 + 10) * MIN;
		for (let position = chatUntil; position < times.length; position++) if (times[position]! < shift) times[position] = shift + position * MIN;
	}
	let previousAgent = '';
	let agentSpoke = chatUntil > 0;
	conversation.slice(chatUntil).forEach((entry, offset) => {
		const position = chatUntil + offset;
		const when = times[position]!;
		at(when);
		const body: string[] = [];
		if (entry.who === 'c' && position === 0 && channel === 'phone') {
			out.push(`### Call notes by ${agent} · ${stamp(when)}`, '');
			body.push(fill(pick(r, callIntros)), ...entry.paras.map((para) => `> ${fill(para)}`));
		} else if (entry.who === 'c') {
			out.push(`### ${s.full} · ${stamp(when)}`, '');
			const greeting = fill(pick(r, position === 0 ? firstGreetings : replyGreetings));
			if (greeting) body.push(greeting);
			const quoted = previousAgent.split(/(?<=[.?!])\s/).find((sentence) => sentence.length > 40);
			if (quoted && chance(r, 0.25)) body.push(`> ${quoted}`);
			body.push(...entry.paras.map(fill));
			if (entry.art) body.push(entry.art());
			const signoff = fill(pick(r, position === 0 ? custSignoffs : replySignoffs));
			if (signoff) body.push(signoff);
		} else if (entry.who === 'a') {
			out.push(`### ${agent} (Customer Care) · ${stamp(when)}`, '');
			const afterCall = channel === 'phone' && position === 1;
			const afterCustomer = conversation[position - 1]?.who === 'c';
			body.push(fill(pick(r, !agentSpoke ? agentGreetings.filter((greeting) => utc(when).getUTCHours() < 12 || !greeting.startsWith('Good morning')) : afterCustomer ? agentGreetingsLater : ['Hi {first},', 'Hello {first},'])), ...(afterCall ? [pick(r, callReplies)] : []), ...entry.paras.map(fill));
			if (entry.art) body.push(entry.art());
			body.push(fill(pick(r, agentSignoffs)));
			previousAgent = fill([...entry.paras].sort((x, y) => y.length - x.length)[0]!);
			agentSpoke = true;
		} else if (entry.who === 'note') {
			out.push(`### Internal note by ${agent} · ${stamp(when)}`, '');
			body.push(...entry.paras.map(fill));
		} else {
			out.push(`### ${s.mate} (Copperleaf, ${entry.team!.replace(/^the /, '')}) · ${stamp(when)}`, '');
			body.push(...entry.paras.map(fill), s.mate!);
		}
		out.push(body.join('\n\n'), '');
	});
	const final = times.at(-1)!;
	if (final >= EXPORT) throw new Error(`ticket ${ticketNumber} runs past the export: ${stamp(final)}`);
	return { name: `${ticketNumber}.md`, text: out.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n' };
};

const folder = join(root, 'support', 'tickets');
mkdirSync(folder, { recursive: true });
for (let index = 0; index < ITEMS; index++) {
	let made = ticket(index, 3);
	for (let sides = 2; sides >= 0 && (made.text.length > 19_000 || made.text.split("\n").length > 700); sides--) made = ticket(index, sides);
	writeFileSync(join(folder, made.name), made.text);
}
writeFileSync(
	join(folder, 'README.md'),
	`# Customer care tickets\n\nEvery ticket Copperleaf Coffee's customer care handled between September 21 and November 13, 2026, one file\neach, as the help desk exported them on November 20. Times are Pacific. Each file holds the customer panel care\nsaw when the ticket came in and the whole conversation: emails, chats, notes from phone calls, internal notes\nand replies from other teams. The export does not keep the help desk's tags or statuses.\n\nCustomers check out in the store at copperleaf.coffee, which the marketing team runs. Their account, profile and\norder history are on shop.copperleaf.coffee. The coffee club is run by the club team.\n`
);
