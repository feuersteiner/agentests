// Writes the long material of this entry's long tasks: the tickets Larkspur Books customer service passed to the
// payments team between 7 September and 13 November 2026, one Markdown file each, under docs/payment-tickets/, as the
// help desk exported them on 20 November, without tags or statuses. Deterministic: fixed seeds, no clock, no network.
//   bun long/generate.ts <workspace root>
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** How many tickets to write. Dates, numbers and the share of each topic all follow from it. */
const ITEMS = 257;

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
const hex = (r: Rand, length: number) => Array.from({ length }, () => '0123456789abcdef'[int(r, 0, 15)]).join('');
const digits = (r: Rand, length: number) => Array.from({ length }, () => String(int(r, 0, 9))).join('');
const round2 = (value: number) => Math.round(value * 100) / 100;

// ---------------------------------------------------------------------------------------------------------
// Dates. Everything happens in 2026, before the export on 20 November. Times are UK local time.
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
const short = (ms: number) => `${utc(ms).getUTCDate()} ${MON[utc(ms).getUTCMonth()]}`;
const fullDay = (ms: number) => `${WDL[utc(ms).getUTCDay()]} ${dayMonth(ms)}`;
const midnight = (ms: number) => ms - (ms % DAY);
const weekdayAfter = (ms: number) => {
	let day = ms;
	while (utc(day).getUTCDay() === 0 || utc(day).getUTCDay() === 6) day += DAY;
	return day;
};
const FIRST_DAY = Date.UTC(2026, 8, 7);
const LAST_DAY = Date.UTC(2026, 10, 13);
const EXPORT = Date.UTC(2026, 10, 20);
const openDays: number[] = [];
for (let day = FIRST_DAY; day <= LAST_DAY; day += DAY) if (utc(day).getUTCDay() !== 0) openDays.push(day);

// ---------------------------------------------------------------------------------------------------------
// Money, as the storefront and the invoicing service show it.
type Cur = 'GBP' | 'EUR' | 'USD' | 'JPY';
const SHOWN: Record<Cur, [string, number, boolean]> = { GBP: ['£', 2, true], EUR: ['€', 2, false], USD: ['$', 2, true], JPY: ['¥', 0, true] };
const money = (value: number, cur: Cur) => {
	const [sign, decimals, before] = SHOWN[cur];
	const [whole, fraction] = Math.abs(value).toFixed(decimals).split('.');
	const number = (whole!.replace(/\B(?=(\d{3})+$)/g, ',')) + (fraction ? `.${fraction}` : '');
	const minus = value < 0 ? '-' : '';
	return before ? `${minus}${sign}${number}` : `${minus}${number} ${sign}`;
};
/** A shelf price in pounds as the store prices it. */
const priceIn = (gbp: number, cur: Cur) => (cur === 'GBP' ? gbp : cur === 'JPY' ? Math.round(gbp * 19.2) * 10 : Math.round(gbp * (cur === 'EUR' ? 1.16 : 1.32)) - 0.01);

// ---------------------------------------------------------------------------------------------------------
// The stores, the people who write in, and the people at Larkspur Books.
type StoreKey = 'UK' | 'EU' | 'US' | 'JP';
interface Store {
	label: string;
	site: string;
	cur: Cur;
	curName: string;
	weight: number;
	places: string[];
	first: string[];
	last: string[];
	postcode: (r: Rand) => string;
	postage: number;
	threshold: number;
	club: number;
}
const letters = 'ABDEFGHJLNPQRSTUWXY';
const STORES: Record<StoreKey, Store> = {
	UK: {
		label: 'UK',
		site: 'www.larkspur-books.example',
		cur: 'GBP',
		curName: 'pounds',
		weight: 9,
		places: ['Leeds', 'Norwich', 'Bristol', 'Cardiff', 'Edinburgh', 'York', 'Brighton', 'Belfast', 'Exeter', 'Sheffield', 'Shrewsbury', 'Inverness'],
		first: ['Harriet', 'Oliver', 'Siobhan', 'Kieran', 'Ayesha', 'Tom', 'Gwen', 'Rajesh', 'Fiona', 'Callum', 'Lydia', 'Marcus', 'Joanne', 'Hamish', 'Priya', 'Eleanor', 'Dev', 'Rachel', 'Graham', 'Zainab', 'Bryony', 'Nathan'],
		last: ['Whitcombe', 'Ashdown', 'Pellow', 'Mistry', 'Garside', 'McInnes', 'Okonedo', 'Thwaite', 'Rennie', 'Harcourt', 'Bhatt', 'Lowther', 'Crabtree', 'Dunleavy', 'Akinola', 'Pryor', 'Sandford', 'Llewellyn'],
		postcode: (r) => `${pick(r, ['LS6', 'NR2', 'BS7', 'CF14', 'EH9', 'YO31', 'BN2', 'BT9', 'EX4', 'S11', 'SY1', 'IV2'])} ${int(r, 1, 9)}${letters[int(r, 0, 18)]}${letters[int(r, 0, 18)]}`,
		postage: 3.49,
		threshold: 25,
		club: 18
	},
	EU: {
		label: 'EU',
		site: 'eu.larkspur-books.example',
		cur: 'EUR',
		curName: 'euros',
		weight: 5,
		places: ['Dublin', 'Cork', 'Utrecht', 'Ghent', 'Hamburg', 'Lyon', 'Aarhus', 'Graz', 'Galway', 'Valencia', 'Leiden', 'Bremen'],
		first: ['Aoife', 'Niamh', 'Pieter', 'Lotte', 'Matthias', 'Claire', 'Jakob', 'Ines', 'Sofie', 'Ciaran', 'Marta', 'Henrik', 'Elodie', 'Bram', 'Katrin', 'Seamus'],
		last: ['Byrne', 'Murphy', 'de Vries', 'Janssens', 'Brandt', 'Lefebvre', 'Novak', 'Hansen', "O'Connor", 'Ferrante', 'Kowalski', 'Lindberg', 'Vermeulen', 'Gallagher', 'Moreau', 'Fischer'],
		postcode: (r) => pick(r, [`D0${int(r, 1, 8)} ${letters[int(r, 0, 18)]}${int(r, 1, 9)}${letters[int(r, 0, 18)]}${int(r, 1, 9)}`, `${int(r, 1011, 3999)} ${letters[int(r, 0, 18)]}${letters[int(r, 0, 18)]}`, `${int(r, 10115, 28779)}`]),
		postage: 4.99,
		threshold: 30,
		club: 21
	},
	US: {
		label: 'US',
		site: 'us.larkspur-books.example',
		cur: 'USD',
		curName: 'US dollars',
		weight: 4,
		places: ['Portland, Oregon', 'Columbus, Ohio', 'Burlington, Vermont', 'Austin, Texas', 'Duluth, Minnesota', 'Richmond, Virginia', 'Boulder, Colorado', 'Bangor, Maine'],
		first: ['Megan', 'Tyler', 'Brianna', 'Marcus', 'Jenna', 'Darnell', 'Alyssa', 'Cody', 'Lauren', 'Andre', 'Kayla', 'Travis', 'Monique', 'Garrett'],
		last: ['Henderson', 'Alvarez', 'Brooks', 'Nguyen', 'Schultz', 'Whitaker', 'Delgado', 'Parsons', 'Fitzgerald', 'Kowalczyk', 'Ramsey', 'Okafor', 'Lindqvist', 'Moreno'],
		postcode: (r) => `${int(r, 10000, 99899)}`,
		postage: 5.99,
		threshold: 35,
		club: 24
	},
	JP: {
		label: 'Japan',
		site: 'jp.larkspur-books.example',
		cur: 'JPY',
		curName: 'yen',
		weight: 2,
		places: ['Tokyo', 'Osaka', 'Sapporo', 'Fukuoka', 'Kyoto', 'Nagoya', 'Sendai', 'Kobe'],
		first: ['Haruka', 'Kenta', 'Aiko', 'Daisuke', 'Mariko', 'Shota', 'Yui', 'Takeshi', 'Emi', 'Ryo'],
		last: ['Sato', 'Suzuki', 'Takahashi', 'Watanabe', 'Ito', 'Yamamoto', 'Nakamura', 'Kobayashi', 'Hayashi', 'Mori'],
		postcode: (r) => `${int(r, 100, 989)}-${String(int(r, 1, 9999)).padStart(4, '0')}`,
		postage: 600,
		threshold: 5000,
		club: 0
	}
};
const STORE_KEYS = Object.keys(STORES) as StoreKey[];
/** The same postcode with one character changed, as an old address would differ. */
const misspell = (r: Rand, code: string) => {
	const spots = [...code].map((ch, i) => (/\d/.test(ch) ? i : -1)).filter((i) => i >= 0);
	const at = pick(r, spots);
	return code.slice(0, at) + String((Number(code[at]) + int(r, 1, 8)) % 10) + code.slice(at + 1);
};

type Kind = 'school' | 'library' | 'shop';
const trades: [string, string, StoreKey, Kind][] = [
	["St Aidan's Primary School", 'Gateshead', 'UK', 'school'],
	['Hollins Park Academy', 'Bolton', 'UK', 'school'],
	['Bramley Community Library', 'Leeds', 'UK', 'library'],
	['The Reading Room', 'Hexham', 'UK', 'shop'],
	['Wycombe Grammar School', 'High Wycombe', 'UK', 'school'],
	['Castleford Library Service', 'Castleford', 'UK', 'library'],
	['Oakhurst Prep School', 'Haywards Heath', 'UK', 'school'],
	['Penrose Books', 'Bude', 'UK', 'shop'],
	['Northfield Sixth Form College', 'Derby', 'UK', 'school'],
	['Tolsey Lane Books', 'Ludlow', 'UK', 'shop'],
	['Scoil Mhuire', 'Ennis', 'EU', 'school'],
	['Kilkenny County Library', 'Kilkenny', 'EU', 'library'],
	['Gallery Books', 'Westport', 'EU', 'shop'],
	["St Brigid's College", 'Naas', 'EU', 'school']
];
const tradeRoles: Record<Kind, string[]> = {
	school: ['Bursar', 'School business manager', 'Head of English', 'Office manager', 'Librarian'],
	library: ['Librarian', 'Acquisitions librarian', 'Finance officer', 'Library services manager'],
	shop: ['Owner', 'Manager', 'Bookkeeper']
};
const tradeMail: Record<Kind, string[]> = { school: ['office', 'finance', 'bursar'], library: ['library', 'acquisitions', 'finance'], shop: ['orders', 'accounts', 'hello'] };
/** Title, author and shelf price in pounds. */
const books: [string, string, number][] = [
	['The Salt Road', 'Marguerite Ashby', 12.99],
	['A Field Guide to Winter Moths', 'Edmund Carrow', 9.99],
	['The Lantern Keepers', 'Priya Ramanathan', 16.99],
	['Small Hours in Lisbon', 'Tomás Avila', 14.99],
	['The Orchard at Hollow End', 'Ruth Calder', 10.99],
	['Glass Harbour', 'Ikenna Obi', 18.99],
	['How to Mend a Kettle', 'Sally Brightwell', 12.99],
	["The Cartographer's Daughter", 'Helena Voss', 20],
	['Under the Linden', 'Jonas Albrecht', 14.99],
	['Notes from a Tidal Island', 'Morwenna Hale', 9.99],
	['The Long Quiet', 'Daniel Okoro', 16.99],
	['Birds of the Northern Fells', 'Alistair Penrose', 25],
	['Paper Lanterns', 'Keiko Mori', 8.99],
	['The Year of Small Repairs', 'Anna Lindgren', 12.99],
	['Station Eleven Miles', 'Grace Whitfield', 10.99],
	['The Bone Orchard', 'Fergus Doyle', 18.99],
	['A History of Bread in Twelve Loaves', 'Celia Marsh', 22],
	['The Night Ferry', 'Omar Haddad', 9.99],
	['Wild Swimming in the Lakes', 'Bethan Rees', 14.99],
	["The Clockmaker's Apprentice", 'Hugo Tremain', 16.99],
	['Copper and Rain', 'Lucia Ferraro', 8.99],
	['The Mapmakers of Ys', 'Elowen Tregear', 12.99],
	['Beekeeping for Beginners', 'Martin Ashworth', 10.99],
	['The Quiet Hours', 'Naoko Ishida', 9.99]
];
const cards = ['Visa debit', 'Mastercard', 'Visa credit', 'Mastercard debit', 'American Express'];
const agents = ['Bethany', 'Callum', 'Rosa', 'Idris', 'Mei', 'Joel'];
const payers = ['Ines Calloway', 'Rob Mensah', 'Yuki Tanabe', 'Dara Quinn'];
const teamPeople: Record<string, string> = {
	'the warehouse team': 'Gwen Pryce',
	'the trade team': 'Alastair Boyd',
	'the events team': 'Sunita Rao',
	'the Club team': 'Nora Feeney',
	'the web team': 'Felix Amara',
	'credit control': 'Martin Oyelaran',
	'the risk team': 'Tomasz Bielski'
};
const venues = ['the Guildhall, York', 'Leeds Central Library', 'the Corn Exchange, Bristol', "St George's Hall, Norwich", 'the Assembly Rooms, Edinburgh', 'the Old Fire Station, Exeter'];
const kin = ['my husband', 'my wife', 'my partner', 'my son', 'my daughter', 'my mum', 'my flatmate'];
const banks = ['my bank', 'the bank', 'my card company'];

type Area = 'checkout' | 'refunds' | 'gift' | 'trade' | 'club' | 'other';
type Outcome = 'resolved' | 'owe' | 'act' | 'team' | 'quiet';
type Slots = Record<string, string>;
type Art = (r: Rand, s: Slots) => string;

interface Topic {
	area: Area;
	weight: number;
	stores?: StoreKey[];
	/** Who writes in: a shopper (the default), a trade account, or either. */
	who?: 'retail' | 'trade' | 'both';
	/** The shopper is a Book Club member. */
	club?: boolean;
	/** Never a side matter: the customer's situation is the topic itself. */
	alone?: boolean;
	/** Whose names the customer has, when not the store's own. */
	names?: StoreKey;
	/** The order paid for delivery, so its books came to less than the free-delivery threshold. */
	delivery?: boolean;
	/** The slot that holds the main order's total in the panel, when it is not {total}. */
	panelTotal?: string;
	/** The main order's status and how it was paid, in the panel. */
	status?: string;
	paid?: string;
	subjects: string[];
	/** The customer's first words about it, two ways. */
	open: [string, string];
	/** The topic as a quick side question, and its answer. */
	quick: [string, string];
	/** Customer service's first answer, which asks for something. */
	reply: string;
	/** The customer's answer with what was asked for. */
	given: string;
	/** Customer service's note passing it to payments. */
	handover: string;
	/** What payments found, in their own words, and what they pasted. */
	finding: string;
	art: Art;
	/** When payments need one more thing first: their note and customer service's question to the customer. */
	ask: [string, string];
	need2: string;
	/** The cause and what was done, as customer service tells the customer. */
	explain: string;
	/** Follow-up questions and answers. */
	more: [string, string][];
	/** What the customer has to do, after "you'll need to". */
	act: string;
	fixed: [string, string];
	/** A further request at the end, and what customer service then owes, after "I'll". */
	follow: string;
	owe: string;
	team: string;
	/** Payments' note handing it to the team, and the team's answer when it comes back. When what payments can see
	 * before the team has looked differs from the finding, `teamFinding` takes its place and nothing is pasted. */
	teamFinding?: string;
	teamNote: string;
	teamFind: string;
	outcomes?: Outcome[];
}

// ---------------------------------------------------------------------------------------------------------
// Pasted output.
const table = (head: string[], rows: string[][]) =>
	[`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`, ...rows.map((row) => `| ${row.join(' | ')} |`)].join('\n');
const fence = (lines: string[]) => ['```', ...lines, '```'].join('\n');
const col = (text: string, width: number) => text.padEnd(width);
const t = (r: Rand) => `${pad(int(r, 8, 22))}:${pad(int(r, 0, 59))}:${pad(int(r, 0, 59))}`;

// ---------------------------------------------------------------------------------------------------------
// Topics. A ticket follows one topic as its main matter and may touch others on the way. Nothing about the topic,
// its area or its outcome is written into the file except through the messages themselves.
const topics: Topic[] = [
	{
		area: 'checkout',
		weight: 3,
		status: 'Dispatched',
		subjects: ['Charged twice', 'Double payment for one order', 'Two payments taken', 'Why have you taken my money twice?'],
		open: [
			`I placed one order on {date1}, {order}, and my banking app shows two payments of {total} to Larkspur Books. I only bought one copy of {item}. Please refund the extra one.`,
			`You have charged me twice for the same order. I can see {total} twice on my card, both on {date1}. I'd like the second payment back as soon as possible, as it has left me short until payday.`
		],
		quick: [`Do you deliver to a PO box?`, `We do for anything sent by post, but not for parcels that go by courier, which is usually only orders over 2 kg. The checkout tells you if your order is one of those.`],
		reply: `Sorry for the worry. I can see one order on your account, so I'd like to work out what the second line is. Could you tell me whether both payments say "pending", or whether one has gone through, and the last four digits of the card?`,
		given: `One says pending and the other doesn't. The card ends {card4}. Thinking about it, the first time I pressed Pay the page went back to the basket, so I paid again.`,
		handover: `Customer sees two payments of {total} on the card ending {card4} for {order}, one of them pending on their side. The first attempt went back to the basket, so they paid again. Can you check whether we hold two?`,
		finding: `Two authorisations in Quayside. The first passed the bank's check, but the browser never came back to us from the bank's page, so no order was created and the authorisation was voided after 30 minutes. The second is the one we captured for {order}. The void reached the issuer on {date1}. Most banks drop a voided hold within 3 to 7 working days, some take 10. Nothing to refund on our side.`,
		art: (r, s) =>
			fence([
				`Quayside: card ending ${s.card4}, ${s.date1}`,
				'',
				`${col('Time', 10)}${col('Payment', 16)}${col('Amount', 12)}Event`,
				`${col(s.time1!, 10)}${col(s.ref2!, 16)}${col(s.total!, 12)}authorised, 3-D Secure passed, no order`,
				`${col(s.time3!, 10)}${col(s.ref!, 16)}${col(s.total!, 12)}authorised, 3-D Secure passed, ${s.order}`,
				`${col(s.time2!, 10)}${col(s.ref2!, 16)}${col(s.total!, 12)}voided (no order after 30 minutes)`,
				`${col(s.date2!, 10)}${col(s.ref!, 16)}${col(s.total!, 12)}captured at dispatch`,
				'',
				`Void acknowledged by issuer: yes`
			]),
		ask: [`One capture for {order} and possibly a second authorisation. Before I say anything, can we get a screenshot of the two lines in their banking app, with dates?`, `To be sure which line is which, our payments team would like a screenshot of the two payments in your banking app, with their dates showing. Could you send one?`],
		need2: 'a screenshot of the two payments in your banking app',
		explain: `Only one payment was taken: the second attempt, which paid for {order}. The first attempt was approved by your bank but never finished, so we cancelled it straight away and asked your bank to release the hold. That's the "pending" line, and the money behind it was never actually taken. Most banks drop a cancelled hold within 3 to 7 working days.`,
		more: [
			[`So I don't need to do anything?`, `Nothing at all. If it's still showing after ten working days, tell me and payments will send your bank a letter confirming that the hold was cancelled.`],
			[`Why did the page go back to the basket in the first place?`, `Your bank's security page took longer than usual to send you back to us, and our checkout stops waiting after a few minutes. If it ever happens again, check your orders page before paying a second time.`]
		],
		act: 'check your banking app again after {day}, and tell me if the pending payment of {total} is still there',
		fixed: [`The pending one disappeared this morning. Thanks for explaining, I was about to complain to my bank.`, `It's gone today, as you said it would. All good.`],
		follow: `It's been eight working days and the pending one is still there. Could you send that letter to my bank after all?`,
		owe: 'ask payments for the letter confirming the hold was cancelled and email it to you by {day}, so you can forward it to your bank',
		team: 'the web team',
		teamNote: `Checkout sent this customer back to the basket after a successful bank check on {date1}, so they paid twice. It's the second this month. Could someone look at how long checkout waits for the bank's page?`,
		teamFind: `We've looked at the checkout logs for {date1}. The bank's page took over four minutes to send the customer back, past our three-minute limit, so the first order was never created. We've raised the limit to ten minutes. The hold itself is the bank's to release.`
	},
	{
		area: 'checkout',
		weight: 2,
		stores: ['EU', 'US'],
		alone: true,
		names: 'UK',
		status: 'Delivered',
		subjects: ['Wrong amount taken', 'Overcharged', 'Amount on my statement is wrong', 'Price difference on my order'],
		open: [
			`The confirmation for order {order} says {total}, but my bank has taken {stmt}. That's quite a bit more than I agreed to pay. What's the extra for?`,
			`I've been overcharged. Your site showed {total} for my order and my statement shows {stmt}, plus a fee I wasn't expecting. Can you explain the difference?`
		],
		quick: [`Can I change the delivery address on an order that hasn't gone yet?`, `Yes, as long as it hasn't been picked. Reply with the new address and the order number and we'll change it.`],
		reply: `Thanks for getting in touch. Could you tell me what currency your card is in, and whether your statement shows a separate fee next to the payment?`,
		given: `It's an ordinary UK debit card, so pounds. There's a line for {stmt} and another for {fee} called "non-sterling transaction fee". I'm in {ukcity}, by the way.`,
		handover: `UK customer with a sterling card paid {total} on the {store} store for {order}. Their bank shows {stmt} plus a fee of {fee}. Can you confirm what we charged, and in which currency?`,
		finding: `We charged {total}, in {curName}, which is the only currency the {store} store takes. The conversion to pounds and the fee are the card issuer's. The session shows the customer arrived on the {store} store from a search ad, with a UK delivery address. Nothing for us to refund as such, but the UK store had the same books for {ukprice} that day.`,
		art: (r, s) =>
			table(
				['', 'Amount', 'Taken or shown by'],
				[
					[`Order ${s.order}`, s.total!, `Larkspur Books, ${s.store} store`],
					['Captured', s.total!, `Quayside, ${s.date2}`],
					['Shown on statement', s.stmt!, 'card issuer, its own rate'],
					['Non-sterling fee', s.fee!, 'card issuer'],
					['Same basket on the UK store that day', s.ukprice!, 'storefront price history']
				]
			),
		ask: [`I need the statement line itself to check the issuer's rate. Screenshot of the entry and the fee, please.`, `Our payments team would like to see the statement entry itself, with the fee, to compare it with what we took. Could you send a screenshot?`],
		need2: 'a screenshot of the statement entry and the fee',
		explain: `We charged exactly {total}, in {curName}, because the order was placed on our {store} store, which only takes {curName}. Your bank then converted it to pounds at its own rate and added its fee for a payment in another currency. Our UK store had the same books for {ukprice}, in pounds, so there would have been no conversion and no fee.`,
		more: [
			[`How did I end up on the {store} store? I'm in {ukcity}.`, `It looks as if you came in through a search result for the {store} store. It doesn't move you automatically, but there's a store switcher at the top of every page, and your basket comes with you if you switch before paying.`],
			[`Can you refund the fee, then?`, `I'm afraid we can't refund a fee your bank charged, because it never reached us. Some banks waive it once if you ask, especially when the payment was a mistake.`]
		],
		act: 'ask your bank whether it will waive the fee of {fee}, and use the store switcher to shop on the UK store next time',
		fixed: [`My bank refunded the fee as a one-off, so I'm happy. I'll make sure I'm on the UK store next time.`, `Makes sense now. I've bookmarked the UK store. Thanks for checking.`],
		follow: `Could you at least refund the difference between the {store} price and the UK price? I'd never have bought it there on purpose.`,
		owe: 'ask payments whether they can refund the difference of {diff} as a goodwill gesture, and let you know by {day}',
		team: 'the web team',
		teamNote: `UK customer with a UK delivery address checked out on the {store} store after arriving from a search ad. Shouldn't checkout at least offer the UK store when the address is in the UK?`,
		teamFind: `We've checked: that ad sent everyone to the {store} store regardless of where they were, and nothing at checkout suggested the UK store for a UK address. The ad has been fixed, and checkout now offers the UK store when the delivery address is in the UK.`
	},
	{
		area: 'checkout',
		weight: 3,
		subjects: ['Card keeps getting declined', 'Cannot pay', 'Payment failed', 'Checkout not working', 'Is your site broken?'],
		open: [
			`I've been trying to buy {item} for two days and every time I pay, the card is declined. My bank says there's nothing wrong with the card and they can't see any attempts from you at all.`,
			`Your checkout won't take my card. I get "Payment could not be completed" after typing the details in. The card works everywhere else.`
		],
		quick: [`Do you sell signed copies?`, `Sometimes, when an author signs stock for us. They're marked "Signed" on the book's page, and they can't be reserved before they arrive.`],
		reply: `Sorry about that, it's maddening when the card works everywhere else. Could you tell me roughly when you last tried, and whether you were on a phone or a computer?`,
		given: `The last try was yesterday at about {pm}, on my phone. I tried the laptop too, same thing.`,
		handover: `Customer's card is declined every time at checkout and their bank sees no attempts. Last try yesterday about {pm}, phone and laptop. Can you see the attempts?`,
		finding: `{tries} attempts in Quayside, and none reached the bank: our address check stopped every one. The postcode on the saved billing address is {badpc}; the issuer has {goodpc} for this card. Looks like an old address that was only half changed.`,
		art: (r, s) =>
			table(
				['Attempt', 'Time', 'Amount', 'Stopped by', 'Result'],
				Array.from({ length: Number(s.tries) }, (_, i) => `${i < 2 ? s.pastShort : s.yesterday} ${pad(9 + i * 2 + int(r, 0, 1))}:${pad(int(r, 0, 59))}`).map((when, i) => [String(i + 1), when, s.total!, 'address check', `postcode ${s.badpc} does not match issuer`])
			),
		ask: [`Address-check declines on this account, but two cards are saved. Which one are they using? Last four digits, please.`, `Our payments team can see the failed attempts, but there are two cards on your account. Could you tell me the last four digits of the one you're trying to use?`],
		need2: 'the last four digits of the card you are using',
		explain: `None of your attempts reached your bank, because our address check stopped them first. The billing address saved on your account has the postcode {badpc}, and your bank has {goodpc} for the card. The two have to match before we send a payment on to the bank.`,
		more: [
			[`Oh. I moved last year and must have only changed the delivery address.`, `That's usually how it happens. The billing address is kept separately so that presents can go elsewhere.`],
			[`Will I lose the price if it goes up before I can pay?`, `No, the basket keeps today's price for 48 hours after you add a book.`]
		],
		act: 'change the billing address under My account, Addresses, to the one your bank has, and try the payment again',
		fixed: [`Changed the billing postcode and it went straight through. Thanks, I'd never have spotted that.`, `That was it. Order placed, {order}. Thank you.`],
		follow: `That worked. Could the checkout say "billing address doesn't match" rather than a vague error, though? I wasted two evenings on this.`,
		owe: 'pass that to the web team and let you know by {day} what they say about the message',
		team: 'the web team',
		teamNote: `Our address check declines show the customer only "Payment could not be completed". This is the fourth ticket this month where the customer blamed their bank. Could checkout say which check failed?`,
		teamFind: `Checkout now says when the billing postcode doesn't match the card. For this customer, the saved billing address has {badpc} where the bank has {goodpc}.`
	},
	{
		area: 'checkout',
		weight: 2,
		status: 'Part dispatched',
		delivery: true,
		subjects: ['Charged for a cancelled book', 'Money taken for something you cancelled', 'Order cancelled, still charged', 'Paid for a book I never got'],
		open: [
			`You emailed to say {item} is out of print and you've cancelled it, but my card was charged {total} for the whole order on {date2}. I want the money back for the book I'm not getting.`,
			`Half my order arrived and the other half was cancelled, yet I've paid for all of it. Order {order}. Can someone sort this out?`
		],
		quick: [`Can I get a paper invoice in the parcel?`, `We don't put paper invoices in parcels, but you can download a PDF from the order page, and we can post one if you need it.`],
		reply: `I'm sorry about the cancelled book. Could you confirm which books arrived and the date the payment came out?`,
		given: `{item2} arrived on {date3}. The payment of {total} came out on {date2}. {item} never came.`,
		handover: `{order}: {item} cancelled as out of print, and the customer says the full {total} was taken on {date2}. Has a refund for the cancelled line gone out?`,
		finding: `We captured the whole {total} on {date2}, when the first parcel left; a mixed order is taken once. The warehouse cancelled {item} on {date3} and a refund of {amount} went to the card ending {card4} the same day, ARN {arn}. It shows as a separate credit, not as a change to the original payment.`,
		art: (r, s) =>
			table(
				['Line', 'Book', 'Price', 'Status', 'Money'],
				[
					['1', s.item2!, s.price2!, `Dispatched ${s.date2}`, `captured ${s.date2}`],
					['2', s.item!, s.price1!, `Cancelled ${s.date3}, out of print`, `refunded ${s.date3}, ${s.amount}, ARN ${s.arn}`],
					['', 'Delivery', s.del!, '', `captured ${s.date2}`]
				]
			),
		ask: [`Capture of {total} and a cancelled line. The account has two cards; which one is the customer checking? Last four digits, please.`, `Payments can see the order and the cancelled book, but there are two cards on your account. Could you tell me the last four digits of the one you're checking?`],
		need2: 'the last four digits of the card you are checking',
		explain: `We took the full amount when the first parcel left, which is how we handle orders that go out in parts. When {item} was cancelled on {date3}, a refund of {amount} went back to your card ending {card4} the same day. It appears as a separate credit rather than a change to the original payment, and banks usually show it within 3 to 5 working days. The reference is {arn}.`,
		more: [
			[`I can't see it yet. What do I do with the reference?`, `If it hasn't appeared by {day}, give the reference to your bank. It lets them find the credit on their side even before it reaches your account.`],
			[`Is there any chance of getting the book later?`, `The publisher has told us it's out of print with no reprint planned, so not from us new, I'm afraid.`]
		],
		act: 'give your bank the refund reference {arn} if the credit has not appeared by {day}',
		fixed: [`Found it. It was listed separately, as you said. Sorry for the fuss.`, `The refund's there now. Thanks for chasing it.`],
		follow: `It's there, thanks. Could you let me know if {item} ever comes back into print? I'd still like it.`,
		owe: 'ask our buyers to tell you if the publisher reprints {item}, and confirm by {day} that it is set up',
		team: 'the warehouse team',
		teamFinding: `We captured the whole {total} on {date2}, when the first parcel left. The line for {item} still shows as awaiting stock, so nothing has been refunded; it has to be cancelled before I can refund it.`,
		teamNote: `{order}: the customer was told {item} is cancelled, but the order still shows the line as awaiting stock and nothing has been refunded. Can you confirm it's cancelled so we can refund it?`,
		teamFind: `{item} is cancelled; the publisher confirmed it's out of print. We've closed the line, and payments have refunded {amount} to the card ending {card4}, ARN {arn}.`
	},
	{
		area: 'checkout',
		weight: 2,
		stores: ['UK', 'EU', 'US'],
		status: 'Preorder',
		paid: 'PayPal',
		panelTotal: 'price1',
		subjects: ['Preorder charged already', 'Charged for a book that is not out yet', 'Preorder payment', 'Why have I paid already?'],
		open: [
			`I preordered {item} by {author}, which isn't out until {release}, and I've already been charged {price1}. Your site says preorders are charged when they're sent. Have I been charged by mistake?`,
			`Why have I paid for a book that won't be published for months? Order {order}, {item}.`
		],
		quick: [`Where do I see my preorders?`, `Under My account, Orders. They have "Preorder" next to them and the expected publication date.`],
		reply: `Good question, and I can see the preorder on your account. Could you tell me how you paid: card, PayPal or a gift card?`,
		given: `PayPal, as I always do.`,
		handover: `Customer preordered {item} (out {release}) on {order} and was charged {price1} straight away. Paid with PayPal. Expected?`,
		finding: `Expected, unfortunately. Card preorders are only authorised and taken at dispatch, but PayPal won't let us hold a payment for more than a few days, so PayPal preorders are taken at order. The help page on preorders only talks about cards. If the customer would rather pay on dispatch we can refund the PayPal payment and they can preorder again by card.`,
		art: (r, s) =>
			fence([
				`Order        ${s.order}`,
				`Line         ${s.item}, ${s.author} (preorder, publication ${s.release})`,
				`Paid with    PayPal, payer ${s.email}`,
				`PayPal ID    ${digits(r, 2)}${hex(r, 3).toUpperCase()}${digits(r, 6)}${hex(r, 5).toUpperCase()}`,
				`Amount       ${s.price1}`,
				`Taken        ${s.date1} (PayPal preorders are taken at order)`,
				`Dispatch     on publication`
			]),
		ask: [`There's a PayPal payment on the order and a hold on a gift card. Which one does the customer mean?`, `Payments can see a PayPal payment and a gift card on your account. Could you tell me which one you've seen go down, the PayPal account or the gift card balance?`],
		need2: 'whether it is the PayPal payment or the gift card balance that went down',
		explain: `It wasn't a mistake, but our help page should have told you. Card payments for preorders are taken when the book is sent, but PayPal doesn't let us hold a payment for months, so preorders paid with PayPal are taken straight away. If you'd rather pay on publication, we can refund the PayPal payment and you can preorder again by card; you keep the first-printing copy if you do it this week.`,
		more: [
			[`If I keep the PayPal one, what happens if the publication date moves?`, `Nothing changes for you. The preorder stays, and you can cancel any time before it's sent for a full refund to PayPal.`],
			[`Do first printings really matter that much?`, `For most books, no. For {author}'s readers the first printing has the illustrated endpapers, which is why people ask.`]
		],
		act: 'cancel the preorder from My account, Orders, and place it again paying by card',
		fixed: [`I'll leave it on PayPal, now I know it's normal. Thanks for explaining.`, `Cancelled and preordered again with my card. Nothing taken this time. Perfect.`],
		follow: `Fine, I'll keep it. But the help page should say this, shouldn't it?`,
		owe: 'ask the web team to add PayPal to the help page on preorders, and tell you by {day} when it is done',
		team: 'the web team',
		teamNote: `The help page on preorders says they're charged at dispatch, which isn't true for PayPal. Third ticket about this since September. Could it say so?`,
		teamFind: `The preorder help page now says PayPal preorders are paid at order. For this customer, payments can refund the PayPal payment if they'd rather preorder by card.`
	},
	{
		area: 'checkout',
		weight: 2,
		status: 'Processing',
		subjects: ['Order not sent', 'Order stuck in processing', 'Where is my order?', 'Present needed by the weekend'],
		open: [
			`My order {order} still says "processing" after four days and nobody has told me why. It's a birthday present and I need it by {date4}.`,
			`Why hasn't my order been sent? I paid {total} on {date1} and it's just sitting there.`
		],
		quick: [`Do you gift wrap?`, `We do, for {wrap} a book. Choose it in the basket; the gift message prints on a card inside.`],
		reply: `Sorry for the wait. Could you confirm the delivery address on the order, and whether it's somewhere you've had books sent before?`,
		given: `It's going to my sister in {city} as a present, so no, first time. I paid with my usual card.`,
		handover: `{order} ({total}) stuck in processing for four days. First order to a new address, a present for the customer's sister. Is it held on our side?`,
		finding: `Held by the risk check: new delivery address, order value well above the account's usual, and the card's billing country differs from the delivery country. The risk team emailed the customer on {date1} to confirm the order and got no answer; probably in spam. Once the customer confirms, it's released for picking the same day.`,
		art: (r, s) =>
			fence([
				`Risk review  ${s.order}`,
				`Score        ${int(r, 71, 88)} (hold above 70)`,
				`Signals      new delivery address; value ${int(r, 3, 6)}x account average; billing and delivery countries differ`,
				`Action       held for confirmation, email sent ${s.date1} ${pad(int(r, 9, 17))}:${pad(int(r, 0, 59))}`,
				`Reply        none`,
				`Payment      authorised, not captured`
			]),
		ask: [`Held by the risk check. The account has two email addresses; which one do they use now?`, `Your order is waiting for a confirmation from you, and our payments team need to know which email address you use now, as your account has two. Which one should we use?`],
		need2: 'which email address you use now',
		explain: `Your order was held for a routine check, because it's going to a new address and is larger than your usual orders. We emailed you on {date1} asking you to confirm it, and that email may have gone to your spam folder; it comes from verify@larkspur-books.example. As soon as you confirm, the order goes out the same day.`,
		more: [
			[`Will it still arrive by {date4}?`, `If it's released today and goes by express, yes. Express is on us, given the delay.`],
			[`Why wasn't I told it was held?`, `That email was meant to tell you, and I'm sorry it went astray. I've noted on your account that this address is genuine.`]
		],
		act: 'reply to the email from verify@larkspur-books.example, or confirm the order from the link on the order page',
		fixed: [`Found the email in spam and confirmed. It shows as dispatched now. Thanks!`, `Confirmed, and it arrived at my sister's yesterday. Thank you.`],
		follow: `Confirmed, thanks. Can you make sure future orders to her address aren't held again?`,
		owe: 'ask the risk team to mark the address as trusted on your account and confirm by {day}',
		team: 'the risk team',
		teamNote: `{order} is held by the risk check. The customer has written in and confirmed it's genuine, a present for their sister in {city}. Can you release it?`,
		teamFind: `Released {order} after reading the customer's reply. It's with the warehouse and will go by express.`
	},
	{
		area: 'checkout',
		weight: 1,
		stores: ['JP'],
		status: 'Cancelled',
		paid: 'Convenience store',
		subjects: ['Order cancelled before I could pay', 'Convenience store payment', 'Payment number not valid', 'Please help with payment'],
		open: [
			`I chose convenience store payment for order {order} and the order was cancelled before I paid. I went to the store on {pastday} and the machine said the number was not valid.`,
			`My order is cancelled but I wanted to pay for it. The convenience store would not accept the payment number. Please help me.`
		],
		quick: [`Can I pay with my JCB card?`, `Yes, JCB works on the Japan store, as do Visa, Mastercard and American Express.`],
		reply: `Sorry about that. Could you send me the payment number from the email, and the name of the store you used?`,
		given: `The number was {slip}. I went to the Lawson near my office.`,
		handover: `Japan store customer chose convenience store payment for {order} ({total}); the order was cancelled before they paid. Slip {slip}. Why cancelled?`,
		finding: `Convenience store slips are valid for three days. This one was issued on {date1} and ran out at 23:59 on {date5}; the customer went on {pastday}, after it had expired. The order cancels itself when the slip runs out. Nothing was paid, so nothing to refund, and the books are still in stock.`,
		art: (r, s) =>
			fence([
				`Slip         ${s.slip}`,
				`Order        ${s.order}`,
				`Amount       ${s.total}`,
				`Issued       ${s.date1} ${pad(int(r, 10, 22))}:${pad(int(r, 0, 59))}`,
				`Valid until  ${s.date5} 23:59`,
				`Paid         no`,
				`Order        cancelled automatically ${s.date5b} 00:00`
			]),
		ask: [`There are two cancelled convenience store orders on this account. I need the slip number to see which one the customer means.`, `There are two orders on your account that used convenience store payment. Could you send the payment number from the email, so our payments team can find the right one?`],
		need2: 'the payment number from the email',
		explain: `A convenience store payment number is valid for three days. Yours was issued on {date1} and ran out at midnight on {date5}, so by the time you went on {pastday} it had expired, and the order cancelled itself. Nothing was paid, so there is nothing to refund, and the books are still in stock.`,
		more: [
			[`Can I make the number last longer?`, `Not for a convenience store payment, but a bank transfer number lasts seven days.`],
			[`Will the price be the same?`, `Yes, {item} is still {price1} on the Japan store.`]
		],
		act: 'place the order again and pay at the store within three days, or choose bank transfer, which gives you seven days',
		fixed: [`I ordered again and paid the same day. Thank you.`, `I used bank transfer this time and it worked. Thank you for helping.`],
		follow: `I ordered again, but the delivery charge is higher now. Can you match the first order?`,
		owe: 'ask payments whether they can refund the difference in delivery and reply by {day}',
		team: 'the web team',
		teamNote: `The email with the convenience store number doesn't say it runs out after three days. Could it?`,
		teamFind: `The email with the payment number now says when it runs out, in bold. The customer's books are still in stock if they want to order again.`
	},
	{
		area: 'checkout',
		weight: 2,
		status: 'Delivered',
		panelTotal: 'paid9',
		subjects: ['Charged for delivery', 'Free delivery not applied', 'Postage charged by mistake', 'Delivery charge'],
		open: [
			`Your site says delivery is free over {threshold}, my order came to more than that, and I was still charged {postage} for delivery. Order {order}.`,
			`Why did I pay for delivery? My basket was {sub} and the banner says free delivery over {threshold}.`
		],
		quick: [`How long does delivery take?`, `Usually two to four working days in the country, and a day or two longer at busy times.`],
		reply: `Let me look into that. Did you use a voucher or a discount code on the order?`,
		given: `Yes, the 10% code from the newsletter. I don't see what that has to do with it.`,
		handover: `{order}: basket {sub}, 10% newsletter code, then {postage} delivery charged. Customer expected free delivery over {threshold}. Right or wrong?`,
		finding: `Right by the rules, which nobody reads: the threshold is checked after discounts. {sub} less 10% is {afterv}, under {threshold}, so delivery was added. Same thing came up twice last week. I can refund the {postage} as goodwill, and have done: card ending {card4}.`,
		art: (r, s) =>
			table(
				['', 'Amount'],
				[
					['Books', s.sub!],
					['Newsletter code, 10%', `-${s.voucher}`],
					['After discount', s.afterv!],
					[`Free delivery from`, s.threshold!],
					['Delivery', s.postage!],
					['Paid', s.paid9!],
					['Goodwill refund', s.postage!]
				]
			),
		ask: [`There are two orders on the account that week, one with a code and one without. Which order is it? I'll look once I know.`, `There are two orders on your account from that week. Could you tell me which order number had the delivery charge, so payments can check it?`],
		need2: 'the order number that had the delivery charge',
		explain: `Free delivery is worked out on the total after any discount, so with the 10% code your books came to {afterv}, just under {threshold}, and delivery was added. That isn't obvious from the banner, so payments have refunded the {postage} delivery charge to your card ending {card4}.`,
		more: [
			[`So next time I should add another book?`, `Or use the code on a bigger order. The basket shows how far you are from free delivery after the discount, just above the total.`],
			[`Does that apply to the Book Club box too?`, `No, the Club box always comes with free delivery.`]
		],
		act: 'look for the refund of {postage} on your card and let me know if it is not there by {day}',
		fixed: [`Thanks, refund received. Lesson learned about the codes!`, `Got the refund. That's fine, thank you.`],
		follow: `Thanks for the refund. Could the banner say it's after discounts? I won't be the last.`,
		owe: 'pass that to the web team and let you know by {day} whether they change the wording',
		team: 'the web team',
		teamNote: `Third customer this fortnight who expected free delivery from the basket total before their discount code. Can the free delivery banner say it counts after discounts?`,
		teamFind: `The banner and the basket now say free delivery counts after discounts. Payments have refunded the delivery charge to this customer.`,
		outcomes: ['resolved', 'owe', 'team', 'quiet']
	},
	{
		area: 'refunds',
		weight: 4,
		status: 'Returned',
		subjects: ['Refund not received', 'Where is my refund?', 'Returned a book weeks ago', 'Still waiting for my money'],
		open: [
			`I sent {item} back on {date1} and still haven't had my refund of {amount}. Your returns page says 14 days. It's been longer than that.`,
			`I returned a book over two weeks ago and there's no sign of the money. Order {order}. Can you tell me what's happening?`
		],
		quick: [`Do I have to pay for the return postage?`, `Not if the book was faulty or we sent the wrong one. For other returns the label costs {retlabel}, taken from the refund.`],
		reply: `Sorry it's taking so long. Did you post it with the free returns label or another way, and do you have the tracking number?`,
		given: `With your label. Tracking says delivered to you on {date2}. The number is {track}.`,
		handover: `Return for {order} ({item}), delivered to the warehouse on {date2} according to tracking {track}. Customer has no refund of {amount}. Has it been processed?`,
		finding: `The warehouse booked the return in on {date3} and the refund of {amount} went to the card ending {card4} the same afternoon, ARN {arn}. It's with the bank. Fourteen days is from when we receive it, and we did, so we're inside that, just. If it isn't showing in five working days the customer can give their bank the ARN.`,
		art: (r, s) =>
			table(
				['Date', 'Event', 'Where'],
				[
					[s.date1!, `return label used, ${s.track}`, 'customer'],
					[s.date2!, 'delivered to returns desk', 'courier'],
					[s.date3!, 'booked in, condition good', 'warehouse'],
					[s.date3!, `refund ${s.amount} created`, 'storefront'],
					[s.date3!, `refund sent to issuer, ARN ${s.arn}`, 'Quayside']
				]
			),
		ask: [`Nothing booked in under this order yet. The warehouse can trace it with the tracking number from the returns label.`, `Our payments team can't see the return booked in yet. Could you send the tracking number from the returns label, so the warehouse can trace the parcel?`],
		need2: 'the tracking number from the returns label',
		explain: `Your return reached us on {date2} and was booked in on {date3}, and the refund of {amount} went to your card ending {card4} that afternoon. It's with your bank now; most banks show a refund within 3 to 5 working days. If it isn't there by {day}, give your bank this reference and they can trace it: {arn}.`,
		more: [
			[`Why did it take a few days to book in?`, `Returns are checked by hand, and the week you sent it was busy. Most are booked in within two working days.`],
			[`Will I get an email when a refund goes out next time?`, `You should have had one on {date3}. It's worth checking your spam folder for anything from returns@larkspur-books.example.`]
		],
		act: 'give your bank the reference {arn} if the refund has not appeared by {day}',
		fixed: [`It arrived today. Thanks for looking into it.`, `Found the email in spam, and the money's in my account. All sorted.`],
		follow: `It's arrived, thank you. But the returns label took {retlabel} off the refund and the book had a torn cover when it came. Shouldn't that be refunded too?`,
		owe: 'ask payments to refund the {retlabel} for the label, as the book arrived damaged, and confirm by {day}',
		team: 'the warehouse team',
		teamFinding: `No refund yet, because nothing is booked in under {order}, though the courier's tracking says the parcel was delivered to the returns desk on {date2}.`,
		teamNote: `Tracking {track} says the return for {order} was delivered on {date2}, but nothing is booked in. Can you find it?`,
		teamFind: `Found it on the returns shelf; it had been put with another customer's return. Booked in today, and payments sent the refund of {amount} to the card ending {card4}, ARN {arn}.`
	},
	{
		area: 'refunds',
		weight: 3,
		status: 'Part refunded',
		delivery: true,
		subjects: ['Refund is short', 'Wrong refund amount', 'Not refunded in full', 'Refund less than I paid'],
		open: [
			`I returned {item} from order {order} and got {refund} back, but I paid {price1} for it. Where's the rest?`,
			`My refund is less than the price of the book I sent back. I'm not happy about being short-changed.`
		],
		quick: [`Can I exchange a book instead of returning it?`, `Not directly, but you can return it for a refund and order the other book; if the new one is out of stock we'll hold it for you.`],
		reply: `Let me check how the refund was worked out. Did the order use a discount code, or a gift card for part of it?`,
		given: `There was a code, I think, 15% off for my birthday. I returned one of the two books and kept the other.`,
		handover: `{order}: customer returned {item} (shelf price {price1}) and got {refund} back. 15% birthday code on the order. Is that right?`,
		finding: `Right. The 15% birthday code was spread across every book in the order, so {item} actually cost {refund} after the code, and that's what came back. Delivery isn't refunded on a partial return unless the book was faulty. The order confirmation shows the discount per line, so the customer can check.`,
		art: (r, s) =>
			table(
				['Book', 'Shelf price', 'Code, 15%', 'Paid', 'Refunded'],
				[
					[s.item!, s.price1!, `-${s.disc1}`, s.refund!, s.refund!],
					[s.item2!, s.price2!, `-${s.disc2}`, s.paid2!, ''],
					['Delivery', s.postage!, '', s.postage!, '']
				]
			),
		ask: [`There are two returns on this order, a week apart. Which book is the customer asking about? Can't match the refund otherwise.`, `Payments can see two returns from that order. Could you tell me which book this refund was for?`],
		need2: 'which book the refund was for',
		explain: `The 15% birthday code was spread across every book in your order, so {item} cost you {refund} after the discount, not the {price1} shelf price, and that's the amount that came back. Delivery isn't refunded when only part of an order is returned, unless a book was faulty.`,
		more: [
			[`I see. Where would I have seen that?`, `The order confirmation email shows the discount on each line, under the price.`],
			[`So if I return the other one, I get its discounted price back too?`, `Yes, {paid2}, as long as it's back within 30 days of delivery.`]
		],
		act: 'return the other book within 30 days of delivery if you want its {paid2} back too',
		fixed: [`Right, that adds up now. Thanks for breaking it down.`, `OK, that's fair. I hadn't realised the code worked like that.`],
		follow: `Fine, but the book I sent back had a printing fault: pages {pg} were blank. Doesn't that mean the delivery should be refunded?`,
		owe: 'ask payments to refund the delivery of {postage}, as the book was faulty, and confirm by {day}',
		team: 'the warehouse team',
		teamNote: `The returns form for {item} from {order} says "damaged", but the return was booked in as a change of mind. If the copy was faulty, we owe the customer the delivery too. Could the warehouse check it?`,
		teamFind: `Checked the returned copy of {item}: pages {pg} are blank, a printing fault. Payments have refunded the delivery of {postage} to the card ending {card4}.`
	},
	{
		area: 'refunds',
		weight: 2,
		status: 'Refunded',
		paid: 'Gift card and card',
		subjects: ['Refund went to a gift card', 'I want my refund on my card', 'Refund in the wrong place', 'Store credit instead of refund'],
		open: [
			`I returned order {order} and the refund has gone onto a gift card instead of my bank card. I didn't ask for store credit. I want it back on my card.`,
			`Your refund email says {splitamt} has been "returned to your gift card". I paid most of that order by card. Why?`
		],
		quick: [`Can I check a gift card balance without an account?`, `Yes, on the gift cards page: type the card number and the four-digit PIN.`],
		reply: `Let me look into how the refund was split. Do you remember how you paid for the order, whether part of it was on a gift card?`,
		given: `I used the last {gcused} on a gift card from {kin} and paid the rest by card.`,
		handover: `{order} paid with a gift card ({gcused}) and the card ending {card4} ({cardpart}). The return refund of {splitamt} all went to the gift card. Customer wants it on their card.`,
		finding: `The storefront refunds to the gift card first, up to what came off it, and the rest to the card. Except this one went all to the gift card, because the gift card part had expired and the system treated the whole refund as store credit. Bug, I think. I've moved {cardpart} from the gift card back to the card ending {card4}; the gift card keeps {gcused}.`,
		art: (r, s) =>
			table(
				['Tender', 'Paid', 'Refund as made', 'After correction'],
				[
					[`Gift card ending ${s.gc}`, s.gcused!, s.splitamt!, s.gcused!],
					[`${s.card}`, s.cardpart!, s.zero!, s.cardpart!],
					['Total', s.splitamt!, s.splitamt!, s.splitamt!]
				]
			),
		ask: [`The refund is on a gift card, but there are three on the account. Which one did they use on {order}?`, `There are three gift cards on your account. Could you tell me the last four digits of the one you used on {order}, so payments can trace the refund?`],
		need2: 'the last four digits of the gift card you used',
		explain: `A refund normally goes back the way you paid: first to the gift card, up to what came off it, and the rest to your card. Yours all went to the gift card by mistake. Payments have moved {cardpart} back to your card ending {card4}, and the gift card keeps the {gcused} that came off it. The card refund takes 3 to 5 working days.`,
		more: [
			[`Will the gift card part expire?`, `Gift card balances last two years from the date of the last use, so you have until {gcexp}.`],
			[`Can the gift card part go to my bank card too?`, `I'm afraid not; gift card money can only be spent in the store, as the card's terms say.`]
		],
		act: 'look out for the card refund of {cardpart} and reply here if it is not there by {day}',
		fixed: [`The money's back on my card. Thanks for sorting it.`, `Card refund received, and the gift card has its balance back. Thank you.`],
		follow: `Thanks. Can you make sure this doesn't happen with my next return? I have another one on the way.`,
		owe: 'check the refund for your next return by hand when it is booked in, and email you once it has gone to your card',
		team: 'the web team',
		teamNote: `Refund on a split order went all to the gift card because the gift card part had expired. Payments corrected it by hand. Can you look at why the storefront did that?`,
		teamFind: `Found it: the refund ignored the split when the gift card had expired. Fixed for future refunds. Payments have moved {cardpart} back to this customer's card ending {card4}.`
	},
	{
		area: 'refunds',
		weight: 2,
		status: 'Delivered',
		subjects: ['Book arrived damaged', 'Damaged in the post', 'Refund for a damaged book', 'Crushed parcel'],
		open: [
			`{item} arrived with the corner crushed and the dust jacket torn. It was meant to be a present. I'd like a refund, but I don't want the hassle of sending it back.`,
			`The parcel for order {order} was soaked when it came and the book is ruined. What can you do?`
		],
		quick: [`Do you recycle the packaging?`, `Our boxes are recyclable cardboard and paper tape, and the padding is paper too.`],
		reply: `I'm sorry it arrived like that. Could you send a photo or two of the book and the box? You won't need to send it back if the photos show the damage.`,
		given: `Photos attached: the box, the front cover and the corner.`,
		handover: `Damaged in transit, {order}, {item} ({price1}). Customer has sent photos of the box and the book. Refund without return?`,
		finding: `Photos show a crushed box, so courier damage. Refund without return is fine for a book under {limit}. I've refunded {price1} to the card ending {card4}, and the warehouse will claim from the courier. If they'd prefer a new copy instead, it's in stock.`,
		art: (r, s) =>
			fence([
				`Damage claim  DC-${digits(r, 5)}`,
				`Order         ${s.order}`,
				`Item          ${s.item}, ${s.price1}`,
				`Evidence      3 photos from customer, box crushed at one corner`,
				`Decision      refund without return (under ${s.limit})`,
				`Refund        ${s.price1} to ${s.card}, ${s.today}`,
				`Courier claim opened by warehouse`
			]),
		ask: [`The photos haven't come through on the ticket; there's only a broken attachment. Can we ask for them again?`, `Our payments team can't open the photos; the attachment seems to have broken on the way. Could you send them again?`],
		need2: 'the photos again',
		explain: `The photos show the box was crushed in transit, so payments have refunded {price1} to your card ending {card4}, and you don't need to send the book back. The refund should show within 3 to 5 working days.`,
		more: [
			[`Could I have a new copy instead? It's still for the birthday.`, `Of course. If you'd like a new copy instead of the refund, I can send one by express today.`],
			[`What should I do with the damaged one?`, `Keep it, give it away, or put it in a book swap. We don't need it back.`]
		],
		act: 'tell me whether you would like a new copy instead of the refund, before {day}',
		fixed: [`Refund received, thank you. Very easy.`, `Thank you, that's more than fair.`],
		follow: `Thanks for the refund. Could you send a new copy to the same address as well? I'll pay for it again.`,
		owe: 'place the new order for {item} and send you the payment link by {day}',
		team: 'the warehouse team',
		teamNote: `Third crushed parcel from the same courier route this month, {order}. Can the warehouse take it up with the courier? Customer refunded.`,
		teamFind: `We've opened a claim with the courier and changed the route's box size. The customer has had their refund of {price1}.`
	},
	{
		area: 'refunds',
		weight: 2,
		status: 'Refunded',
		subjects: ['Refund bounced', 'My card was cancelled', 'Refund to an old card', 'Refund failed'],
		open: [
			`You've emailed to say my refund of {amount} "could not be completed". My bank cancelled that card last month after a fraud scare. How do I get the money?`,
			`I have a new card since I ordered. Will my refund for order {order} still reach me?`
		],
		quick: [`Can I save a card for next time?`, `Yes, tick "Save this card" at checkout. We keep a token from the card processor, not the card number.`],
		reply: `Thanks for letting me know. Could you tell me when the old card was cancelled, and whether your bank account is the same?`,
		given: `It was cancelled a few days after I ordered. Same account, new card number.`,
		handover: `Refund of {amount} for {order} reported as failed; the card ending {card4} has since been cancelled by the bank. Same bank account. Can it be sent again?`,
		finding: `The refund came back from the issuer on {date3}: card closed. When a bank reissues a card, a refund usually follows to the new one, but not when the card was closed after fraud. We can't push it to a new card number, so it has to be a bank transfer. The customer needs to give us their account details through the secure form, not by email.`,
		art: (r, s) =>
			fence([
				`Refund        ${s.amount}, ${s.order}`,
				`To            ${s.card}`,
				`Sent          ${s.date2}`,
				`Returned      ${s.date3}, issuer response 54 (card closed)`,
				`Next          bank transfer once details received through secure form`
			]),
		ask: [`I can see a failed refund but there are two on the account, from different orders. Which order is it?`, `Payments can see two refunds on your account. Could you tell me which order this one was for?`],
		need2: 'which order the refund was for',
		explain: `Your refund came back from your bank on {date3} because the card had been closed. A refund can't be moved to a new card number, so we'll send it by bank transfer. I've sent you a link to our secure form; please don't send your account details by email.`,
		more: [
			[`How long will the transfer take?`, `Payments send transfers twice a week, so it should reach you within a week of the form coming in.`],
			[`Is the form safe?`, `Yes, it's on our own site, and it asks for your order number first. We'd never ask for your card number or PIN.`]
		],
		act: 'fill in the secure form from my email with your bank account details',
		fixed: [`Filled in the form and the money arrived today. Thank you.`, `Transfer received, all sorted. Thanks.`],
		follow: `I've filled in the form. Could you confirm once the transfer has gone?`,
		owe: 'email you on the day payments send the transfer, which should be by {day}',
		team: 'credit control',
		teamNote: `Refund of {amount} for {order} needs to go by bank transfer; the card was closed after fraud. Details are on the secure form. Over to credit control for the transfer.`,
		teamFind: `The transfer of {amount} went out today from the refunds account; it should reach the customer in two working days.`
	},
	{
		area: 'gift',
		weight: 3,
		stores: ['EU', 'US', 'JP'],
		subjects: ['Gift card not accepted', "Gift card won't work", 'Problem using my gift card', 'Gift card invalid'],
		open: [
			`I was given a Larkspur Books gift card for my birthday and the checkout says it's "not valid in this store". The balance is {gcbalUK}.`,
			`My gift card keeps getting rejected at checkout. I've typed the number three times. It's a present from {kin}.`
		],
		quick: [`Do gift cards expire?`, `Two years after they were last used. The date is on the gift cards page when you check the balance.`],
		reply: `Sorry about that. Could you send me the last four digits of the card and tell me which country the person who gave it to you lives in?`,
		given: `It ends {gc}. {giver} lives in {ukcity2}, so they probably bought it on the UK store. I'm on the {store} store.`,
		handover: `Gift card ending {gc}, balance {gcbalUK}, bought on the UK store and being used on the {store} store. Rejected at checkout. Can it be moved?`,
		finding: `Gift cards belong to the store they're bought on and hold that store's currency, so a UK card won't work on the {store} store. I can move the balance: cancel the UK card and issue a {store} card for {gcbal2}, at today's rate, which I've done. The new card number goes to the customer by email.`,
		art: (r, s) =>
			table(
				['Card', 'Store', 'Balance', 'Status'],
				[
					[`ending ${s.gc}`, 'UK', s.gcbalUK!, `cancelled ${s.today}, balance moved`],
					[`ending ${s.gc2}`, s.store!, s.gcbal2!, `issued ${s.today}`]
				]
			),
		ask: [`I can find a UK card ending {gc}, but there are two with those digits. I need the PIN's first digit or the date it was bought to tell them apart.`, `Payments have found two gift cards ending in those digits. Could you tell me roughly when it was bought, so they can pick the right one?`],
		need2: 'roughly when the gift card was bought',
		explain: `Gift cards belong to the store they were bought on, and yours was bought on the UK store in pounds, so the {store} store couldn't take it. Payments have moved the balance to a new {store} gift card worth {gcbal2}, at today's rate, and emailed you its number. The UK card has been cancelled.`,
		more: [
			[`Could I have used it on the UK store instead?`, `Yes, the UK store delivers to you as well, but in pounds, and delivery costs more from there.`],
			[`Does the new card have the same expiry?`, `It's two years from today, so a little longer than the old one.`]
		],
		act: 'use the new gift card number from the email at checkout, or shop on the UK store with the old one',
		fixed: [`The new card worked. I've ordered {item}. Thanks for the help.`, `That did it. Lovely, thank you.`],
		follow: `Thanks. {giver} gave me another one last Christmas, also UK. Can that be moved too?`,
		owe: 'ask payments to move the second card as well, once you send its last four digits, and email you the new number by {day}',
		team: 'the web team',
		teamNote: `The checkout's "not valid in this store" message doesn't say gift cards belong to one store. Fourth ticket this autumn. Could it say so and point to customer service?`,
		teamFind: `The message now says the gift card belongs to another store and how to get the balance moved. Payments have moved this customer's balance to a {store} card for {gcbal2}.`
	},
	{
		area: 'gift',
		weight: 2,
		subjects: ['Gift card balance wrong', 'Money missing from gift card', 'Gift card has less on it', 'Balance query'],
		open: [
			`My gift card was for {gcload} and the balance page says {gcbal}. I've only used it once, for about {gcused}. Where has the rest gone?`,
			`There's money missing from my gift card. I haven't used it since the summer and the balance has gone down.`
		],
		quick: [`Can I add more money to a gift card?`, `Not to an existing one, but you can buy a new one and use both at checkout.`],
		reply: `Let me check the card's history. Could you send me the last four digits, and tell me whether anyone else might have the card number?`,
		given: `Ends {gc}. {kinCap} has the number saved, I think, from the time I asked for some books to be ordered for me with it.`,
		handover: `Gift card ending {gc}, loaded {gcload}, balance now {gcbal}. Customer used it once. Card is also saved on another account. Can you see where it went?`,
		finding: `Three uses. One by the customer ({gcused}), and two from another account where it's saved, on {date1} and {date2}. Both orders went to the customer's address, so I'd guess presents. Nothing wrong with the card. If the customer wants it off the other account, they can change the PIN.`,
		art: (r, s) =>
			table(
				['Date', 'Account', 'Order', 'Amount', 'Balance after'],
				[
					['', '', '', 'loaded', s.gcload!],
					[s.date0!, 'card holder', s.order2!, `-${s.gcused}`, s.gcafter1!],
					[s.date1!, 'another account (card saved)', s.order!, `-${s.gcother1}`, s.gcafter2!],
					[s.date2!, 'another account (card saved)', s.order3!, `-${s.gcother2}`, s.gcbal!]
				]
			),
		ask: [`No card ending {gc} on this account; someone else may have bought it. Can we see the balance page?`, `Payments can't find that card on your account. Could you enter the full number on the gift cards page and send me a screenshot of the balance page?`],
		need2: 'a screenshot of the balance page',
		explain: `The card has been used three times: once on your account for {gcused}, and twice from another account where the card number is saved, on {date1} and {date2}. Both of those orders were delivered to your address, so they may have been presents for you. Nothing has gone missing from the card itself.`,
		more: [
			[`Can I stop it being used from another account?`, `Yes: change the PIN on the gift cards page, and the copy saved on the other account stops working.`],
			[`Can you tell me what they ordered?`, `I can't share another account's orders, I'm afraid, but they were delivered to you, so you may already have them.`]
		],
		act: 'change the PIN on the gift cards page if you want to stop the card being used from the other account',
		fixed: [`Mystery solved, it was {kin} buying me books with my own gift card! Thanks.`, `All accounted for. Sorry to have bothered you.`],
		follow: `It wasn't us. None of us ordered those. Can you look into those two orders properly?`,
		owe: 'ask the risk team to look at the two orders from the other account and reply by {day}',
		team: 'the risk team',
		teamFinding: `Three uses: one by the customer ({gcused}) and two from another account where the card is saved, on {date1} and {date2}. That account is in a name the customer hasn't mentioned.`,
		teamNote: `Gift card ending {gc} used twice from another account where it's saved, under a name the card holder hasn't mentioned. Could you look at that account before we tell the customer anything?`,
		teamFind: `The other account belongs to someone at the same address, and both orders were delivered and signed for there. We've removed the card from that account and changed the PIN; the new PIN is on its way to the card holder.`
	},
	{
		area: 'gift',
		weight: 2,
		subjects: ['E-gift card never arrived', 'Gift card email not received', 'Present not delivered', 'Where is my e-gift card?'],
		open: [
			`I bought an e-gift card for {gcload} on {date1} for my friend {kinfirst}'s birthday, and it never arrived. I've been charged.`,
			`The e-gift card I sent hasn't arrived and the birthday has been and gone. Order {order}.`
		],
		quick: [`Can I print a gift card instead?`, `Yes, choose "Print at home" when you buy it and you'll get a PDF with the code and the PIN.`],
		reply: `Sorry, that's disappointing for a present. Could you tell me the email address you sent it to, as you typed it?`,
		given: `It went to {kinmail}@{maildomain}. I'm fairly sure that's right.`,
		handover: `E-gift card {order} ({gcload}) not received by recipient. Address given: {kinmail}@{maildomain}. Can you see the send?`,
		finding: `Sent on {date1} to {kinmail}@{maildomainTypo}, with a typo in the domain, and it bounced. The card was never redeemed. I've cancelled that code and issued a new one for {gcload} to the corrected address, sent today.`,
		art: (r, s) =>
			fence([
				`E-gift card   ${s.order}, ${s.gcload}`,
				`Recipient     ${s.kinmail}@${s.maildomainTypo}`,
				`Sent          ${s.date1} 09:00 (scheduled)`,
				`Delivery      bounced, 550 no such domain`,
				`Redeemed      no`,
				`Action        code cancelled ${s.today}; new code issued to ${s.kinmail}@${s.maildomain}`
			]),
		ask: [`There are two e-gift cards on this account in the last month. Which one? And can we get the recipient's address to check against ours?`, `There are two e-gift cards on your account from the last month. Could you tell me which one, and the recipient's email address?`],
		need2: "which e-gift card and the recipient's email address",
		explain: `The e-gift card went out on {date1}, but to an address with a small typo in it, {maildomainTypo} rather than {maildomain}, so it bounced. Nobody used it. Payments have cancelled that code and sent a new card for {gcload} to the right address today.`,
		more: [
			[`Will it say it's from me?`, `Yes, with your original message.`],
			[`Can I change the date it arrives?`, `This one has already gone, but for future e-gift cards you can pick any date up to a year ahead.`]
		],
		act: 'ask {kinfirst} to look in their spam folder for the new card from gifts@larkspur-books.example',
		fixed: [`{kinfirst} got it this morning. Thank you, and sorry about the typo!`, `It's arrived. Thanks for sorting it.`],
		follow: `They got it, thanks. Can I have a copy of the new code myself as well, in case it happens again?`,
		owe: 'send you a copy of the new code and PIN by {day}',
		team: 'the web team',
		teamNote: `E-gift card bounced because of a typo in the recipient's domain and nobody told the buyer. Could the store email the buyer when a gift card bounces?`,
		teamFind: `The store now emails the buyer when an e-gift card bounces. Payments have sent this customer's new card to the corrected address.`
	},
	{
		area: 'gift',
		weight: 2,
		stores: ['UK', 'EU', 'US'],
		status: 'Delivered',
		subjects: ['Points missing', 'Leaves not added', 'Loyalty points', 'Where are my Leaves?'],
		open: [
			`I spent {total} on {date1} and haven't had any Leaves for it. Normally they turn up straight away.`,
			`My Leaves balance hasn't moved since my last two orders. Am I still in the scheme?`
		],
		quick: [`How much is a Leaf worth?`, `One Leaf for every {perleaf} you spend, and 100 Leaves give you {leafvalue} off an order.`],
		reply: `Let me check your Leaves history. Which orders are missing, and how did you pay for them?`,
		given: `{order} and {order2}. Card for one, mostly gift card for the other.`,
		handover: `Customer missing Leaves on {order} and {order2}. One paid by card, one mostly by gift card. Can you check?`,
		finding: `Leaves are added when the 30-day return window closes, not at payment; the account page says "after your order", which most people read as straight away. {order} gets its Leaves on {leafday}. {order2} earns Leaves only on the card part, because gift card spending earned Leaves when the card was bought. Both as the rules say.`,
		art: (r, s) =>
			table(
				['Order', 'Paid', 'Earns Leaves on', 'Leaves', 'Added'],
				[
					[s.order!, `${s.total} by card`, s.total!, s.points!, `on ${s.leafday}`],
					[s.order2!, `${s.gcused} gift card, ${s.cardpart} card`, s.cardpart!, s.points2!, 'pending']
				]
			),
		ask: [`There are no Leaves at all on this account. Maybe the customer joined with another email? Ask for the email on their Leaves card, please.`, `Payments can't find a Leaves membership on this account. Could you tell me the email address you joined with?`],
		need2: 'the email address you joined Leaves with',
		explain: `Leaves are added once the 30-day return window closes, rather than when you pay, so {order} will get its Leaves on {leafday}. On {order2}, Leaves are only earned on the part you paid by card, because the gift card earned its Leaves when it was bought. Both orders will show their Leaves on the right dates.`,
		more: [
			[`Why does the account page say "after your order", then?`, `It means after the return window, and you're right that it could be clearer.`],
			[`Can I use Leaves on a gift card?`, `Not on gift cards, but on any book.`]
		],
		act: 'check your Leaves balance after {leafday}, and reply if they have not appeared',
		fixed: [`Makes sense now. I'll look out for them on {leafday}. Thanks.`, `OK, that explains it. Thanks for checking.`],
		follow: `OK. But I'd have bought differently if I'd known. Could you add the Leaves now as a gesture?`,
		owe: 'ask payments whether they will add the Leaves early, and reply by {day}',
		team: 'the web team',
		teamNote: `Account page says Leaves are added "after your order", and customers read it as at payment. They're added after the 30-day return window. Could it say so?`,
		teamFind: `The account page now says Leaves are added 30 days after delivery. The customer's Leaves will appear on {leafday}.`
	},
	{
		area: 'trade',
		weight: 3,
		who: 'trade',
		stores: ['UK', 'EU'],
		subjects: ['Invoice needs our PO number', 'Invoice sent back by finance', 'Purchase order number', 'Invoice {invoice}'],
		open: [
			`Our finance office has sent back invoice {invoice} for {inv} because it doesn't show our purchase order number, {po}. They won't pay any invoice without it. Could you reissue it?`,
			`We can't pay your last invoice: our system rejects anything without a PO reference. The order was raised under {po}. Can you help?`
		],
		quick: [`Can invoices go to two email addresses?`, `Yes. Tell us both and we'll add the second as a copy on the account.`],
		reply: `Of course. Could you confirm the purchase order number, and whether it should go on every invoice from now on or only this one?`,
		given: `{po}, and it covers everything we order this school year, until the end of July.`,
		handover: `Trade account {acct} ({org}) needs {po} on invoice {invoice} ({inv}) and on every invoice until 31 July. Can you reissue it and set it as the default?`,
		finding: `The PO was on the order but not on the invoice: phone orders taken by the trade team go in without the PO field, and the invoicing service takes it from there. I've set {po} as the account's standing PO until 31 July 2027 and reissued {invoice} as {invoice}-R1, same amount, due date moved on 14 days.`,
		art: (r, s) =>
			fence([
				`Invoice      ${s.invoice}-R1 (reissue of ${s.invoice})`,
				`Account      ${s.acct}, ${s.org}`,
				`PO           ${s.po}`,
				`Issued       ${s.today}`,
				`Due          ${s.due} (30 days, plus 14)`,
				`Lines        ${s.lines} titles, ${s.copies} copies`,
				`Net          ${s.inv}`,
				`VAT          ${s.zero} (books, zero-rated)`,
				`Total        ${s.inv}`
			]),
		ask: [`Before I reissue, I need to see the PO itself, a scan will do, so the reference and the amount match ours.`, `Before payments can reissue the invoice, they need a copy of the purchase order itself, so that the reference and the amount can be matched. Could you send a scan?`],
		need2: 'a scan of the purchase order',
		explain: `The purchase order number was on your order but hadn't been carried onto the invoice. We've reissued it as {invoice}-R1 with {po} on it, for the same {inv}, with the due date moved on by 14 days so you're not chased, and {po} now goes on every invoice for your account until 31 July.`,
		more: [
			[`Do we need to cancel the first invoice on our side?`, `No need. The reissued one has the same number with "-R1" after it, and your statement shows only that one.`],
			[`Does the PO go on credit notes too?`, `Yes, credit notes carry the PO of the invoice they belong to.`]
		],
		act: 'send the reissued invoice {invoice}-R1 to your finance office, and quote {po} when you order by phone',
		fixed: [`Finance have accepted the new one, and it's in this week's payment run. Thank you.`, `That's done the trick. Paid today.`],
		follow: `Thanks. Could you also reissue {invoice2}? It went out the same week and has the same problem.`,
		owe: 'ask payments to reissue {invoice2} with the PO and send it to you by {day}',
		team: 'the trade team',
		teamNote: `{org} ordered by phone under {po}, and the PO never reached the order. Can the trade team make sure phone orders for this account carry it?`,
		teamFind: `We've added {po} to the account notes, so every phone order for {org} carries it until the end of July. Payments have reissued {invoice} with the PO on it.`
	},
	{
		area: 'trade',
		weight: 3,
		who: 'trade',
		stores: ['UK', 'EU'],
		subjects: ['Statement says we are overdue', 'We have paid this invoice', 'Reminder letter in error', 'Overdue notice'],
		open: [
			`We've had a reminder that invoice {invoice} for {inv} is overdue, but we paid it by bank transfer on {date1}. Please check before you send any more letters.`,
			`Your statement shows {inv} overdue. Our records show it paid. Could someone look into it?`
		],
		quick: [`Can we pay by card instead of transfer?`, `Yes, there's a "Pay by card" link on every invoice email, up to {cardcap}.`],
		reply: `Sorry about the reminder. Could you tell me the reference you used on the transfer, and the amount?`,
		given: `{inv}, and the reference was "{badref}". That's what our finance system puts by default.`,
		handover: `{org} ({acct}) says invoice {invoice} ({inv}) was paid by transfer on {date1}, reference "{badref}". Statement shows it overdue. Unallocated payment?`,
		finding: `Yes: {inv} arrived on {date2} with "{badref}" as the reference, which matched nothing, so it sits unallocated in the trade bank account. I've allocated it to {invoice}, and the reminder is cancelled. The statement is clear now. If their system can put the invoice number in the reference, this won't happen again.`,
		art: (r, s) =>
			table(
				['Date', 'Item', 'Debit', 'Credit', 'Balance'],
				[
					[s.date0!, `Invoice ${s.invoice}`, s.inv!, '', s.inv!],
					[s.date2!, `Transfer, ref "${s.badref}" (unallocated until ${s.today})`, '', s.inv!, s.zero!],
					[s.today!, `Reminder for ${s.invoice} cancelled`, '', '', s.zero!]
				]
			),
		ask: [`No transfer of {inv} in the trade account around that date. Can they send their bank's remittance advice?`, `Payments can't see a transfer of {inv} around that date yet. Could you send the remittance advice from your bank? It shows which account the money went to.`],
		need2: 'the remittance advice from your bank',
		explain: `Your payment arrived on {date2}, but the reference "{badref}" didn't match any invoice, so it was waiting to be matched by hand. Payments have now matched it to {invoice}, cancelled the reminder, and your statement is clear. If your finance system can put the invoice number in the reference, payments will be matched on the day they arrive.`,
		more: [
			[`Will the late reminder affect our account?`, `No, nothing is recorded against the account, and your credit limit is unchanged.`],
			[`Can you send us a statement showing it paid?`, `Of course; there's a fresh statement attached to this email.`]
		],
		act: 'ask your finance system to put the invoice number in the transfer reference',
		fixed: [`Thanks, the statement is clear and finance are happy.`, `Lovely, thank you for sorting it so quickly.`],
		follow: `Thanks. We've also had a reminder for {invoice2}, which we paid the same way. Could you check that one too?`,
		owe: 'ask payments to find and match the payment for {invoice2} and confirm by {day}',
		team: 'credit control',
		teamFinding: `There's a payment of {inv} in the trade bank account from {date2}, reference "{badref}", not matched to anything. It looks like theirs, but matching payments to invoices is credit control's job.`,
		teamNote: `{org}'s payment of {inv} has been sitting unallocated since {date2} with reference "{badref}". Could credit control match it to {invoice} and stop the reminder?`,
		teamFind: `Matched to {invoice} and the reminder is cancelled. The statement for {acct} is clear.`
	},
	{
		area: 'trade',
		weight: 2,
		who: 'trade',
		stores: ['UK', 'EU'],
		subjects: ['Two invoices for one order', 'Invoice total does not match the order', 'Duplicate invoice?', 'Invoicing query'],
		open: [
			`We placed one order, {order}, for {inv}, and we've received two invoices, {invoice} and {invoice2}, adding up to the same total. Is one of them a mistake? Our finance office wants one invoice per order.`,
			`The invoice we've had for order {order} is for less than we ordered, and now another invoice has arrived. Which ones do we pay?`
		],
		quick: [`Can we have a pro forma before ordering?`, `Yes, the trade team can send a quote as a pro forma, valid for 30 days.`],
		reply: `Let me check how the order was invoiced. Did all the books arrive in one delivery?`,
		given: `No, {copies2} copies of {item} came a week later than the rest.`,
		handover: `{org}: order {order} invoiced as {invoice} and {invoice2}. Part was backordered. Customer wants one invoice per order. Possible?`,
		finding: `Two invoices because the invoicing service invoices each delivery, and {item} was backordered. Both are right and together make {inv}. The account can be set to "invoice when complete", which waits for the last delivery. I've switched that on for {acct}. These two stand, as they've both been issued.`,
		art: (r, s) =>
			table(
				['Invoice', 'Delivery', 'Lines', 'Amount', 'Due'],
				[
					[s.invoice!, s.date1!, `${s.lines} titles`, s.invA!, s.due!],
					[s.invoice2!, s.date2!, `${s.item}, ${s.copies2} copies`, s.invB!, s.due2!],
					['', '', 'Order total', s.inv!, '']
				]
			),
		ask: [`No order {order} on this account. Which account number is on their delivery note?`, `Payments can't find that order on your account. Could you check the account number on the delivery note?`],
		need2: 'the account number on the delivery note',
		explain: `We invoice each delivery as it leaves, so when {item} came a week later it had its own invoice. {invoice} and {invoice2} together make {inv}, and both should be paid. We've set your account to invoice orders only once they're complete, so from now on you'll get one invoice per order.`,
		more: [
			[`Will waiting for the whole order delay our deliveries?`, `No, the books still go out as they arrive. Only the invoice waits.`],
			[`Can you give us a summary of the two together for our files?`, `Yes, I've attached a statement showing both against the order.`]
		],
		act: 'pay both {invoice} and {invoice2}, which together make up the order',
		fixed: [`Thanks, that's clear. Finance have both now.`, `Lovely, both paid. Thanks for the explanation.`],
		follow: `Thanks. Could you combine the two into one invoice after all? Our auditors are fussy about this.`,
		owe: 'ask payments to cancel both and issue one combined invoice, and send it by {day}',
		team: 'the trade team',
		teamNote: `{org} want one invoice per order. Could the trade team agree it with them for future orders and tell them about "invoice when complete"?`,
		teamFind: `We've spoken to {first} at {org} and set the account to invoice when complete. The two invoices for {order} stand and together make {inv}.`
	},
	{
		area: 'trade',
		weight: 2,
		who: 'trade',
		stores: ['UK', 'EU'],
		subjects: ['Statement does not add up', 'Credit note missing', 'Returns not credited', 'Balance query on our account'],
		open: [
			`Our statement shows {inv} owing, but we returned {copies2} copies of {item} last month and were told we'd get a credit note. Please check.`,
			`The balance on our account is higher than our records by {credit}. I think a credit is missing.`
		],
		quick: [`Do you take back unsold stock?`, `For bookshops on sale or return, yes, within six months; other trade accounts can return faulty or wrongly sent books.`],
		reply: `Let me look at the account. Do you have the returns note or a reference for the books you sent back?`,
		given: `The returns note was {rn}. Your trade team agreed it on the phone.`,
		handover: `{org} ({acct}) returned {copies2} copies of {item} under {rn}; customer expected a credit of {credit}. The statement doesn't show it. Was a credit note raised?`,
		finding: `Credit note {cn} for {credit} was raised on {date2} but never set against an invoice, so it shows as a separate line at the bottom of the statement and the balance at the top doesn't include it. I've allocated it to {invoice}. The balance due is now {afterCredit}.`,
		art: (r, s) =>
			table(
				['Date', 'Item', 'Debit', 'Credit', 'Balance'],
				[
					[s.date0!, `Invoice ${s.invoice}`, s.inv!, '', s.inv!],
					[s.date2!, `Credit note ${s.cn}, returns ${s.rn} (allocated ${s.today})`, '', s.credit!, s.afterCredit!]
				]
			),
		ask: [`No returns under {rn} on this account. Could they send a copy of the returns note? The warehouse may have booked it to another account.`, `Payments can't find that returns note on your account. Could you send a copy?`],
		need2: 'a copy of the returns note',
		explain: `The credit note, {cn} for {credit}, was raised on {date2}, but it hadn't been set against an invoice, so the balance at the top of your statement didn't include it. Payments have set it against {invoice}, and the balance due is now {afterCredit}.`,
		more: [
			[`Do we pay the reduced amount, then?`, `Yes, {afterCredit} clears {invoice}.`],
			[`Could the next statement show credits against invoices straight away?`, `Credit notes are matched by hand at the moment, but payments are now checking any that are unmatched each week.`]
		],
		act: 'pay {afterCredit} against {invoice}, which clears it',
		fixed: [`That matches our records now. Thank you.`, `Perfect, paid. Thanks.`],
		follow: `Thanks. There was a second return in October. Has that been credited?`,
		owe: 'check the October return with payments and come back to you by {day}',
		team: 'credit control',
		teamFinding: `Credit note {cn} for {credit} was raised on {date2} but never set against an invoice, which is why the balance at the top of the statement doesn't include it.`,
		teamNote: `{org} has credit note {cn} for {credit} unallocated since {date2}. Can credit control set it against {invoice} and send them a fresh statement?`,
		teamFind: `{cn} is set against {invoice}; balance due {afterCredit}. A fresh statement has gone to {org}.`
	},
	{
		area: 'trade',
		weight: 2,
		who: 'trade',
		stores: ['UK', 'EU'],
		subjects: ['Have your bank details changed?', 'New bank details letter', 'Is this email from you?', 'Change of account details'],
		open: [
			`We've had an email, apparently from your accounts team, saying your bank details have changed and asking us to pay invoice {invoice} to a new account. It looks a bit odd. Is it genuine?`,
			`Before we pay {inv} to the account in your latest email, could you confirm the details have really changed? Our auditors insist we check.`
		],
		quick: [`Who do we call to check a payment?`, `Credit control, on the number printed on every invoice. Don't use a number from an email.`],
		reply: `Thank you for checking first. Please don't pay anything to the new account. Could you forward the email to me as an attachment, so we can see where it came from?`,
		given: `Attached. It's from "accounts@larkspur-books-payments.example" and has our order numbers in it, which is what worried me.`,
		handover: `{org} received an email asking them to pay {invoice} to new bank details. Sender accounts@larkspur-books-payments.example. Ours?`,
		finding: `Not ours. Our bank details haven't changed, and that domain isn't ours. The order numbers suggest someone has had access to one of their mailboxes, or a supplier's. I've replied with the real details over the phone number on file. This needs the risk team as well.`,
		art: (r, s) =>
			fence([
				`From:        "Larkspur Books Accounts" <accounts@larkspur-books-payments.example>`,
				`Reply-To:    larkspur.ar@${pick(r, ['freemail', 'quickpost', 'mailhub'])}.example`,
				`Date:        ${s.date2}`,
				`Subject:     Updated remittance details, invoice ${s.invoice}`,
				`SPF:         fail (not authorised for larkspur-books.example)`,
				`Attachments: ${s.invoice}.pdf (altered, our layout, different bank details)`
			]),
		ask: [`The forwarded email has lost its headers, so I can't see where it came from. Ask them to forward it again "as an attachment", please, not inline.`, `The email came through without its technical details. Could you forward it again as an attachment rather than inline? Your email program should have that option.`],
		need2: 'the email again, forwarded as an attachment',
		explain: `That email isn't from us. Our bank details haven't changed, and the address it came from isn't ours. Please pay {invoice} to the account printed on our invoices, as before, and don't reply to the email. Someone may have seen your order numbers through another mailbox, so it's worth telling your IT people.`,
		more: [
			[`Should we report it?`, `Yes, to your IT team and to Action Fraud if you're in the UK. We've reported the domain too.`],
			[`How will we know in future?`, `We'll never change bank details by email. Credit control will always ring you first, from the number on the invoice.`]
		],
		act: 'pay {invoice} to the account on our invoice as usual, and tell your IT team about the email',
		fixed: [`Thank you. We've paid to the usual account, and IT are looking into it.`, `Thanks for the quick answer. Paid to the right account.`],
		follow: `Thank you. Could you put that in a letter on headed paper? Our auditors want it in writing.`,
		owe: 'have credit control send you a signed letter confirming our bank details by {day}',
		team: 'the risk team',
		teamNote: `{org} received a fake bank-details email in our name from accounts@larkspur-books-payments.example, with real order numbers. They haven't paid. Could the risk team look at it and decide whether other trade accounts should be told?`,
		teamFind: `We've had the domain taken down and are emailing every trade account to say our bank details haven't changed. {org} paid to the right account.`,
		outcomes: ['resolved', 'owe', 'act', 'team']
	},
	{
		area: 'club',
		weight: 3,
		club: true,
		stores: ['UK', 'EU', 'US'],
		subjects: ['Charged after cancelling', 'You took money after I cancelled', 'Unexpected payment', 'Charged twice this month'],
		open: [
			`I cancelled my Book Club membership in {prevmonth}, and you've taken {club} again this month. I want it back.`,
			`There's a payment of {club} from Larkspur Books on my card this month that I don't recognise. I haven't ordered anything since the summer.`
		],
		quick: [`Can I skip a month of the Club?`, `Yes, from My account, Book Club, up to the 20th of the month before.`],
		reply: `Sorry for the confusion. Could you tell me the email address you cancelled from, and roughly when?`,
		given: `I think I cancelled from this one, around {cancelday}. I got a page saying "We're sorry to see you go".`,
		handover: `Customer says they cancelled the Club around {cancelday} but was charged {club} on {clubday}. Can you see the cancellation?`,
		finding: `The cancellation is there, but on a second account under {oldemail}, which also has a Club membership. The membership on this account was never cancelled, so the payment on {clubday} is right. Two memberships since spring, both paid, and two boxes sent each month to the same address.`,
		art: (r, s) =>
			table(
				['Account', 'Club since', 'Cancelled', 'Last payment'],
				[
					[s.email!, s.clubSince!, 'no', `${s.club}, ${s.clubday}`],
					[s.oldemail!, s.clubSince2!, s.cancelday!, `${s.club}, ${s.prevmonth}`]
				]
			),
		ask: [`I can't find a cancellation on this account. Need the email address they cancelled from; there might be another account.`, `Payments can't find a cancellation on this account. Could you have cancelled from a different email address? If so, which one?`],
		need2: 'the email address you might have cancelled from',
		explain: `You did cancel, but on a second account under {oldemail}, which also had a Club membership. The membership on this account is still running, so this month's {club} was taken for it. You've had two boxes a month since spring, which may explain the duplicates.`,
		more: [
			[`I did wonder why I kept getting two copies! Can you cancel this one?`, `Done: the membership on this account is cancelled from today, and no more boxes will go out.`],
			[`Can I have a refund for the doubled months?`, `Payments can refund this month's box if it comes back unopened; the earlier months were delivered, so those stand.`]
		],
		act: "send this month's box back unopened with the label I've emailed you, if you want the {club} refunded",
		fixed: [`That explains the duplicate books! Thanks for getting to the bottom of it.`, `Sorted, thank you. I'll pass the spare copies on.`],
		follow: `Could you refund the earlier doubled months as well, as a gesture? I never asked for two memberships.`,
		owe: 'ask payments whether they will refund any of the doubled months, and reply by {day}',
		team: 'the Club team',
		teamNote: `Customer has two Club memberships on two accounts, same address, and cancelled the wrong one. Could the Club team cancel the other and look at whether the refund for this month's box can go through?`,
		teamFind: `We've cancelled the second membership and can refund this month's box if it comes back unopened. We've emailed the customer a returns label.`
	},
	{
		area: 'club',
		weight: 2,
		club: true,
		stores: ['UK', 'EU', 'US'],
		subjects: ['No Club box this month', 'Where is my box?', 'Book Club box missing', 'Box not arrived'],
		open: [
			`My Book Club box hasn't arrived this month. Everyone in my group has had theirs.`,
			`I'm missing this month's box. Usually it's here by the 5th. Is there a problem with my membership?`
		],
		quick: [`Can I change the genre of my Club box?`, `Yes, from My account, Book Club, before the 20th.`],
		reply: `Sorry about that. Could you tell me whether you've had any emails from us about your membership recently?`,
		given: `There was one about my card, I think, but I assumed it was a scam and deleted it.`,
		handover: `Club member's box hasn't come this month. Mentions an email about their card that they deleted. Failed payment?`,
		finding: `Yes. Card ending {card4} expired at the end of {prevmonth}; payment on the 1st failed, we retried on the 3rd and 6th, and the membership paused on the 7th. Box is held at the warehouse for 14 days. Customer needs to update the card and the box goes out the next day.`,
		art: (r, s) =>
			table(
				['Date', 'Event'],
				[
					[`1 ${s.clubm}`, `payment ${s.club} failed, card expired`],
					[`1 ${s.clubm}`, 'email: update your card'],
					[`3 ${s.clubm}`, 'retry failed'],
					[`6 ${s.clubm}`, 'retry failed, second email'],
					[`7 ${s.clubm}`, 'membership paused, box held 14 days']
				]
			),
		ask: [`No payment problem showing, and the box was sent. I need their postcode to check the courier record; the address on the account looks incomplete.`, `Payments can see your box was sent. Could you confirm your full address, including the postcode, so we can check with the courier?`],
		need2: 'your full address with the postcode',
		explain: `The card on your membership expired at the end of {prevmonth}, so this month's payment didn't go through, and after two retries the membership paused. That's what the email was about, and it was genuine. Your box is being held at the warehouse; once you update the card, it goes out the next working day.`,
		more: [
			[`How do I know the email is really from you?`, `It comes from club@larkspur-books.example and never asks for card details in the email itself; it sends you to My account.`],
			[`Will I still get this month's book?`, `Yes, the box is held for 14 days, so you'll get the same book as everyone else.`]
		],
		act: 'add your new card under My account, Book Club, Payment',
		fixed: [`Updated the card and the box came yesterday. Thank you!`, `Done, and the box is on its way. Thanks.`],
		follow: `I've updated the card. Could you send the box by express, as my book group meets on {date4}?`,
		owe: 'ask the warehouse to send the box by express and email you the tracking by {day}',
		team: 'the Club team',
		teamNote: `Club member's box paused after a failed card. They've written in instead of updating the card. Could the Club team ring them and take them through it?`,
		teamFind: `We've rung the member and they've updated the card. Their box is out today.`
	},
	{
		area: 'club',
		weight: 2,
		club: true,
		stores: ['UK', 'EU', 'US'],
		subjects: ['Gift membership charged every month', 'I paid for six months up front', 'Gift subscription', 'Club present'],
		open: [
			`I bought my {kinNoun} a six-month Book Club membership as a present, and I'm being charged {club} every month. I thought I'd paid once.`,
			`Why is my card being charged monthly for a Club membership I bought as a gift?`
		],
		quick: [`Can a gift membership start next month?`, `Yes, pick the start month when you buy it.`],
		reply: `Let me look into it. Could you tell me roughly when you bought it and how much you paid the first time?`,
		given: `In {prevmonth}. I paid {club}, which I assumed was a first instalment or something. I don't really know.`,
		handover: `Customer meant to buy a six-month gift Club membership, but is being charged {club} monthly. Bought in {prevmonth}. Can you check what was bought?`,
		finding: `It's a rolling monthly membership with a gift address, not the six-month gift, which is {gift6} paid once. The product pages look much the same. I've refunded the two monthly payments ({club2}) and charged the six-month gift, {gift6}, once, from the same start date. Net: the customer pays {gift6} in all, as they meant to.`,
		art: (r, s) =>
			table(
				['Date', 'Item', 'Amount'],
				[
					[`${s.prevmonth}`, 'Monthly membership, gift address', s.club!],
					[`1 ${s.clubm}`, 'Monthly membership', s.club!],
					[s.today!, 'Refund of monthly payments', `-${s.club2}`],
					[s.today!, 'Six-month gift membership', s.gift6!]
				]
			),
		ask: [`Two Club memberships on this card, one with a gift address. Who is the gift for?`, `There are two Club memberships on your card. Could you tell me the name of the person you bought it for?`],
		need2: 'the name of the person you bought it for',
		explain: `The membership you bought was the monthly one sent to a gift address, rather than the six-month gift, which is paid once. Payments have refunded the monthly payments and switched it to a six-month gift from the same start date, so you've paid {gift6} in all, and nothing more will be taken.`,
		more: [
			[`Will my {kinNoun} notice anything?`, `No, their boxes carry on as before, and the gift note goes in each one.`],
			[`What happens after six months?`, `It simply ends. We'll email you a month before, in case you'd like to give another six months.`]
		],
		act: 'check that the refund has reached your card, and reply here if it has not by {day}',
		fixed: [`Wonderful, that's exactly what I meant to buy. Thank you.`, `Refund's there and the gift is set up properly. Thanks.`],
		follow: `Thanks. Could the end-of-gift email go to me rather than to my {kinNoun}? It's meant to be a surprise if I renew.`,
		owe: 'ask the Club team to send the end-of-gift email to you only, and confirm by {day}',
		team: 'the Club team',
		teamNote: `Customer bought a monthly membership with a gift address meaning to buy the six-month gift. Payments have switched it. Could the Club team check the gift note carries on?`,
		teamFind: `The gift note carries on in every box. We've also asked the web team to make the two product pages easier to tell apart.`,
		outcomes: ['resolved', 'owe', 'team', 'quiet']
	},
	{
		area: 'club',
		weight: 2,
		club: true,
		stores: ['UK', 'EU', 'US'],
		subjects: ['Skipped a month but still charged', 'Skip not working', 'Charged for a month I skipped', 'Club payment'],
		open: [
			`I skipped this month's Book Club box, because I'm away, and you've still charged me {club}. The box has gone to an empty house.`,
			`I pressed "Skip this month" and got charged anyway. What's the point of the button?`
		],
		quick: [`Can I pause the Club for a few months?`, `Yes, for up to three months, from My account, Book Club.`],
		reply: `Sorry about that. Could you tell me roughly when you pressed skip?`,
		given: `On the 22nd, I think, before I went away.`,
		handover: `Club member skipped this month on about the 22nd and was charged {club} on the 1st. Box shipped to an empty house. Refund?`,
		finding: `The skip landed on the 22nd of {prevmonth}, after the 20th cut-off, so it applied to next month's box instead. This month's was charged and shipped. The skip page says "until the 20th" in small print. Box was delivered on the 4th. Next month is skipped.`,
		art: (r, s) =>
			table(
				['Date', 'Event'],
				[
					[`22 ${s.prevmonth}`, `skip requested, after cut-off; applied to ${s.nextmonth}`],
					[`1 ${s.clubm}`, `payment ${s.club}`],
					[`3 ${s.clubm}`, 'box dispatched'],
					[`4 ${s.clubm}`, 'delivered, left in porch']
				]
			),
		ask: [`No skip on this membership at all. Maybe another membership? Which email do they use for the Club?`, `Payments can't see a skip on this membership. Could you tell me the email address you use for the Club?`],
		need2: 'the email address you use for the Club',
		explain: `The skip was made on the 22nd, two days after the cut-off on the 20th, so it was applied to next month's box instead of this one. This month's box was charged and delivered on the 4th, and next month's is skipped.`,
		more: [
			[`Will next month's box still come, then?`, `No, next month's is skipped, as you asked. If you'd rather have it after all, tell me and I'll take the skip off.`],
			[`Can I have a refund for this month if I send it back?`, `Yes, if it comes back unopened within 30 days, payments will refund the {club}.`]
		],
		act: "send this month's box back unopened within 30 days, if you'd like the {club} refunded",
		fixed: [`OK, I'll keep the box. It's a good one, as it happens. Thanks for explaining.`, `Fair enough. I've kept the box. Thanks.`],
		follow: `I understand, but I'm away for another month. Can you pause it from now until I'm back?`,
		owe: 'pause the membership until you are back and confirm the dates by {day}',
		team: 'the Club team',
		teamNote: `Skips after the 20th apply to the next month without telling the member. Third ticket about this. Could the Club team look at how the skip page explains it?`,
		teamFind: `The skip page now says which month a skip applies to before you confirm it. For this member, next month is skipped and this month's box was delivered.`
	},
	{
		area: 'other',
		weight: 2,
		stores: ['UK'],
		who: 'both',
		subjects: ['Event tickets refund', 'Author event postponed', 'Tickets for the evening with {author}', 'Event cancelled?'],
		open: [
			`I bought {ticketsN} for {event} at {venue} and I've heard it's been postponed. I can't make the new date. Can I have my money back?`,
			`Is {event} still going ahead? I've had an email that I didn't fully understand, and I've paid {tprice} for tickets.`
		],
		quick: [`Are your events accessible?`, `All our venues have step-free access, and the booking page lists the details for each one.`],
		reply: `Sorry for the confusion. Could you tell me the booking reference from your ticket email?`,
		given: `It's {booking}.`,
		handover: `Customer has {ticketsN} for {event} (booking {booking}, {tprice}); the event was postponed and they can't make the new date. Refund?`,
		finding: `Postponed from {edate} to {edate2}. Tickets carry over automatically, and anyone who can't make the new date gets a full refund on request, including the booking fee. Refund of {tprice} done to the card ending {card4}. The events team keep the attendance list, so they'll need telling.`,
		art: (r, s) =>
			fence([
				`Booking      ${s.booking}`,
				`Event        ${s.event}, ${s.venue}`,
				`Was          ${s.edate}, 19:00`,
				`Now          ${s.edate2}, 19:00`,
				`Tickets      ${s.tickets} x ${s.tprice1}, booking fee ${s.bfee}`,
				`Refund       ${s.tprice}, to ${s.card}`
			]),
		ask: [`The booking isn't in the ticketing system under this email. Could they forward the ticket email itself?`, `Payments can't find a booking under your email address. Could you forward the email with your tickets?`],
		need2: 'the email with your tickets',
		explain: `{event} has moved from {edate} to {edate2}. As you can't make the new date, payments have refunded the full {tprice}, booking fee included, to your card ending {card4}. Your tickets are cancelled, so there's nothing else you need to do.`,
		more: [
			[`Will there be another event with {author}?`, `Nothing is booked yet, but the events newsletter will have it first.`],
			[`Can I give my tickets to a friend instead?`, `Yes, if you'd rather do that, I can reissue them in your friend's name and cancel the refund.`]
		],
		act: 'tell me by {day} whether you would rather pass the tickets on to a friend than take the refund',
		fixed: [`Refund received. Thank you, and good luck with the new date.`, `Thanks, very straightforward.`],
		follow: `Thanks. Could I be told directly next time an event is moved? The email looked like an advert.`,
		owe: 'pass that to the events team and let you know by {day}',
		team: 'the events team',
		teamFinding: `Booking {booking} is for the original date. Refunds for a postponed event are the events team's decision, as they keep the attendance list.`,
		teamNote: `Ticket holder for {event} can't make the new date and wants a refund. Could the events team confirm the refund and update the attendance list?`,
		teamFind: `We've written to the customer with the new date, {edate2}. They've chosen the refund, and payments have sent {tprice} to the card ending {card4}.`
	},
	{
		area: 'other',
		weight: 2,
		stores: ['UK'],
		alone: true,
		names: 'EU',
		status: 'Delivered',
		subjects: ['Charged customs on delivery', 'Import charges', 'Courier asked me to pay before delivering', 'Extra charges on my parcel'],
		open: [
			`The courier wouldn't deliver my parcel until I paid {duty} in import VAT and a handling fee. I live in {eucity} and nobody told me there'd be extra to pay.`,
			`I've had to pay {duty} to get my parcel from you. Is that right? Your site didn't mention it.`
		],
		quick: [`Do you ship to {eucountry}?`, `Yes, from the UK store and from the EU store. The EU store sends from our EU warehouse, in euros.`],
		reply: `Sorry about the surprise. Could you tell me which of our stores you ordered from, and the order number?`,
		given: `{order}. I think it was the UK store, as the prices were in pounds.`,
		handover: `Customer in {eucity} ordered {order} on the UK store and paid {duty} in import VAT and handling to the courier. Can we refund the duty?`,
		finding: `UK store orders to the EU go from the UK, so the customer pays import VAT and the courier's fee on arrival; the UK checkout says so in the delivery options, small print. The EU store sends from our EU warehouse with VAT included, no charges on arrival. Our policy: goodwill refund of import charges once per customer, with the courier's receipt. I'd like the receipt first.`,
		art: (r, s) =>
			table(
				['', 'UK store, as ordered', 'EU store, same books'],
				[
					['Books', s.total!, s.euTotal!],
					['Sent from', 'UK warehouse', 'EU warehouse'],
					['Import VAT and fee on arrival', s.duty!, 'none'],
					['Total paid', `${s.total} + ${s.duty}`, s.euTotal!]
				]
			),
		ask: [`Before we refund import charges, I need the courier's receipt showing what was paid. Could you ask for a copy or a photo?`, `Payments can refund the import charges as a one-off, but they need the courier's receipt first. Could you send a copy or a photo?`],
		need2: "the courier's receipt for the import charges",
		explain: `Orders from our UK store go from the UK, so anything delivered to {eucountry} has import VAT and the courier's handling fee to pay on arrival. Our EU store sends the same books from our EU warehouse with VAT included, so nothing extra is due. We can refund import charges once, as a goodwill gesture, against the courier's receipt.`,
		more: [
			[`How do I make sure I use the EU store next time?`, `Choose "EU" in the store switcher at the top of the page, or go to eu.larkspur-books.example.`],
			[`Can I move my account to the EU store?`, `Your account works on both; only gift cards and credit belong to one store.`]
		],
		act: "send me the courier's receipt for the {duty}, so payments can refund it",
		fixed: [`Receipt sent, and the refund came through. Thank you. I'll use the EU store from now on.`, `Thanks for the refund. Lesson learned.`],
		follow: `I've sent the receipt. Can you confirm when the refund has gone?`,
		owe: 'confirm by email the day payments send the refund of {duty}, which should be by {day}',
		team: 'the warehouse team',
		teamNote: `Customer in {eucountry} ordered on the UK store and paid import charges. Could the warehouse confirm the parcel went from the UK, and why the EU warehouse didn't take it?`,
		teamFind: `The parcel went from the UK because the customer ordered on the UK store; the EU warehouse only takes EU store orders. Payments can refund the import charges once the receipt is in.`
	},
	{
		area: 'other',
		weight: 2,
		delivery: true,
		stores: ['UK'],
		status: 'Delivered',
		subjects: ['Need a VAT receipt', 'Receipt for my employer', 'Invoice with company name', 'Receipt request'],
		open: [
			`I bought {item} for work and my employer needs a receipt with our company name, {company}, and VAT shown. The order email isn't enough.`,
			`Can I get a proper receipt for order {order}? My expenses claim was rejected.`
		],
		quick: [`Can I buy for my company on account?`, `Trade accounts are for schools, libraries and bookshops; companies can pay by card and download receipts.`],
		reply: `Of course. Could you tell me the company name and address you'd like on it?`,
		given: `{company}, {companyAddr}. Thanks.`,
		handover: `Customer needs a receipt for {order} in the name of {company}, {companyAddr}, with VAT shown. Can you issue one?`,
		finding: `Done: receipt R-{order} issued to {company} with VAT shown per line. Books are zero-rated, so VAT is {zero} on those; delivery carries standard VAT. PDF attached for the customer. They can also add a company name to their account so receipts carry it automatically.`,
		art: (r, s) =>
			fence([
				`Receipt      R-${s.order}`,
				`To           ${s.company}, ${s.companyAddr}`,
				`Order        ${s.order}, ${s.date1}`,
				`${col(s.item!, 46)}${s.price1}  VAT 0%`,
				`${col('Delivery', 46)}${s.postage}  VAT 20% incl.`,
				`Total        ${s.total}`
			]),
		ask: [`There are two orders from this customer that day. Which one does the receipt need to cover?`, `There are two orders on your account from that day. Could you tell me which order number the receipt should cover?`],
		need2: 'which order the receipt should cover',
		explain: `I've attached a receipt for {order} made out to {company}, with VAT shown on each line. Books are zero-rated, so the VAT on them is {zero}, and delivery carries standard VAT. If you add your company name under My account, Details, future receipts will carry it automatically.`,
		more: [
			[`Will that change my order emails too?`, `Only the receipts. The order emails stay as they are.`],
			[`Can I get receipts for older orders the same way?`, `Yes, any order from the last six years.`]
		],
		act: 'add your company name under My account, Details, so later receipts carry it',
		fixed: [`Perfect, my claim's gone through. Thanks.`, `That's exactly what finance needed. Thank you.`],
		follow: `Thanks. Could you do the same for {order2}? It's the same claim.`,
		owe: 'send you a receipt for {order2} made out to {company} by {day}',
		team: 'credit control',
		teamFinding: `{order} already has a receipt in the customer's own name, and only credit control can issue a second one under another name.`,
		teamNote: `Customer needs a receipt for {order} made out to {company}, {companyAddr}. Could credit control issue it?`,
		teamFind: `Done: a receipt for {order} made out to {company}, with VAT shown on each line, is attached for the customer.`,
		outcomes: ['resolved', 'owe', 'act', 'team']
	},
];

// ---------------------------------------------------------------------------------------------------------
// Words shared by every topic.
const backstories = [
	`I've been ordering from you for years and never had a problem before.`,
	`I don't usually write in, but this has me stumped.`,
	`I buy most months, mainly for my book group.`,
	`I tried the help pages first but couldn't find an answer.`,
	`Sorry if this is the wrong place to ask.`,
	`I'll keep it short, as I'm writing from my phone.`,
	`I rang last week and was told to email instead, so here I am.`,
	`It's not a lot of money, but it's the principle.`,
	`I'm writing for {kin}, who isn't online much.`,
	`I hope you can help, as I'm going round in circles.`
];
const tradeStories = [
	`I look after the accounts for {org}.`,
	`I'm new in post here, so forgive me if this has come up before.`,
	`We've bought from Larkspur for several years without any trouble.`,
	`I'm writing on behalf of {org}; our account number is {acct}.`,
	`Our year-end is coming up, so I'd be grateful for a quick answer.`
];
const firstGreetings = ['Hi,', 'Hello,', 'Dear Larkspur Books,', 'Hi there,', 'Good afternoon,', 'To whom it may concern,', ''];
const replyGreetings = ['Hi {agent},', '{agent},', '', 'Hello again,', 'Dear {agent},', 'Hi {agent},'];
const custSignoffs = ['Thanks,\n{first}', 'Many thanks,\n{full}', 'Regards,\n{full}', 'Best wishes,\n{first}', '{first}', 'Kind regards,\n{full}'];
const tradeSignoffs = ['Kind regards,\n{full}\n{role}, {org}', 'Many thanks,\n{full}\n{role}\n{org}', 'Best wishes,\n{first}\n{org}'];
const replySignoffs = ['Thanks,\n{first}', '{first}', 'Cheers, {first}', '', 'Thanks again,\n{first}'];
const agentGreetings = ['Hi {first},', 'Hello {first},', 'Dear {first},', 'Hi {first}, thanks for writing in.'];
const agentGreetingsLater = ['Hi {first},', 'Hello again {first},', 'Hi {first}, thanks for getting back to me.', 'Hello {first},'];
const agentSignoffs = ['Best wishes,\n{agent}\nLarkspur Books customer service', 'Thanks,\n{agent}', 'Kind regards,\n{agent} | Larkspur Books', 'All the best,\n{agent}'];
const agentIntros = [`Thanks for getting in touch.`, `Thanks for the clear description; it helps a lot.`, `Sorry for the wait, it's been a busy week here.`, `Thanks for letting us know.`];
const custAcks = [`Thanks, that helps.`, `OK, understood.`, `Right.`, `Thanks for the quick reply.`, `Ah, I see.`, `Makes sense.`, `Thank you.`, `Great, thanks.`];
const vagueSubjects = ['Order query', 'Payment', 'Help please', 'Problem with my account', 'Question about a payment', 'Complaint', 'Re: Your Larkspur Books order', '(no subject)'];
const formTopics = ['Orders and delivery', 'Payments and refunds', 'Returns', 'Gift cards', 'Book Club', 'Events', 'Something else'];
const handLeads = [`Passing to payments.`, `Over to payments, please.`, `For payments:`, `Payments, could you take this one?`];
const holdings = [
	`I've passed this to our payments team, who can see more of the payment side than I can. I'll come back to you as soon as I hear.`,
	`Thanks. I need our payments team to check this, so bear with me for a day or so.`,
	`Got it, thank you. I've asked our payments team to look at it and will be in touch.`
];
const payersOpen = ['', 'Looked at this. ', 'Had a look. ', 'Checked. '];
const notes = [
	`Customer since {since}, {count} orders, no previous tickets about payments.`,
	`Tried to ring the customer on the number on the account; no answer, so replying by email.`,
	`Similar ticket earlier this week; the help pages don't cover it well.`,
	`Customer sounds upset. Prioritising.`,
	`Checked the account: nothing unusual in the order history.`
];
const passLines = [
	`Our payments team have passed this to {team}, who can look at it more closely than we can. They'll reply on this ticket, so their answer will come to you by email.`,
	`I've asked {team} to take this one, with everything above. They'll pick it up from here and write to you on this ticket.`,
	`This needs {team}, so I've handed it over to them. You'll hear from them here.`
];
const mateAcks = [`Thanks, I've picked this up and will update the ticket once I've had a proper look.`, `Seen. On my list for this week.`];
const actLines = [
	`So the next step is on your side: you'll need to {act}. Reply here if anything doesn't work.`,
	`From here it's with you: you'll need to {act}. I'll keep the ticket open in case you need anything.`,
	`To sum up, you'll need to {act}. Let me know how you get on.`
];
const willDos = [`OK, I'll do that {when}.`, `Will do. Thanks for your help.`, `Thanks. I'll sort that {when}.`, `Understood. I'll get on to it {when}.`];
const whens = ['tomorrow', 'this afternoon', 'on Monday', 'at the weekend', 'later this week'];
const oweLines = [`Leave that with me. I'll {owe}.`, `Fair question. I'll {owe}.`, `I'll {owe}, and I'll keep this ticket open until then.`];
const thanksLines = [`Thanks, I'll look out for it.`, `Great, thank you.`, `Appreciated, thanks.`, `Thanks, speak then.`];
const closings = [`Glad that's sorted. I'll close this now, but reply to this email if anything comes back.`, `Great to hear!`, `Thanks for letting me know.`, `Good news. Enjoy the books.`];
const nudges1 = [
	`Just checking in. When you have a moment, I still need {need2} to get any further. I'll pick it up as soon as it arrives.`,
	`Following up on my last message: could you send me {need2}? No rush, I just want to make sure it didn't get buried.`,
	`I don't want this to fall through the cracks. If you can send me {need2}, payments can carry on from there.`
];
const nudges2 = [
	`I haven't heard back, so I'll assume things are fine for now. If not, reply here with {need2} and I'll take it from there.`,
	`One last nudge from me. Whenever you're ready, reply to this email and the ticket comes back to me with everything above.`
];
const chatHellos = [`Hi {first}, I'm {agent} from Larkspur Books. Let me read your message.`, `Hello {first}, {agent} here. Thanks for waiting.`, `Hi {first}! {agent} from customer service. Give me a second to catch up.`];
const chatHandoffs = [`I'll keep this ticket open, so you can reply to the email copy of this chat with anything else.`, `If anything else comes up, reply to the email copy of this chat and it comes straight back to me.`];
const sideLeads = [
	`While you're looking, something else:`,
	`One more thing while I have you.`,
	`Also, a separate question:`,
	`Unrelated, but it's been bothering me:`
];
const sideLeads2 = [`Another thing while I'm here.`, `And one more, sorry:`, `Something else has come up as well.`];
const sideExplains = [`Payments have looked at your other question too.`, `On the other matter, payments have come back to me as well.`, `About your second question: payments have checked it.`];
const sideHands = [`A second matter for payments:`, `Also for payments, on the same customer:`, `One more for payments:`];

const earlier = [
	'Parcel reported missing; found by a neighbour',
	'Asked for a signed copy of a new title',
	'Changed the delivery address on an order',
	'Unsubscribed from the newsletter, then back again',
	'Asked whether we deliver on Saturdays',
	'Wrong book sent; the right one posted',
	'Asked about bulk orders for a book group',
	'Complained about packaging; passed to the warehouse',
	'Password reset not arriving; sorted',
	'Asked when a paperback edition is due',
	'Wanted an order split into two deliveries',
	'Asked for a book to be gift wrapped after ordering'
];

// ---------------------------------------------------------------------------------------------------------
// One ticket.
interface Item {
	who: 'c' | 'a' | 'note' | 'pay' | 'mate';
	paras: string[];
	art?: () => string;
	wait?: 'long';
}

const fits = (topic: Topic, store: StoreKey, trade: boolean, member: boolean) =>
	(topic.stores ?? STORE_KEYS).includes(store) &&
	(trade ? topic.who === 'trade' || topic.who === 'both' : topic.who !== 'trade') &&
	(!topic.club || member) &&
	!topic.alone;
const totalWeight = topics.reduce((sum, topic) => sum + topic.weight, 0);
const weighted = (r: Rand) => {
	let left = r() * totalWeight;
	for (const topic of topics) if ((left -= topic.weight) < 0) return topic;
	return topics.at(-1)!;
};
const storeFor = (r: Rand, topic: Topic): StoreKey => {
	const keys = topic.stores ?? STORE_KEYS;
	let left = r() * keys.reduce((sum, key) => sum + STORES[key].weight, 0);
	for (const key of keys) if ((left -= STORES[key].weight) < 0) return key;
	return keys.at(-1)!;
};

const ticket = (index: number) => {
	const r = mulberry32(0x1a5b2c00 + index * 104729);
	const openDay = openDays[Math.floor((index * openDays.length) / ITEMS)]!;
	// A Club box is charged on the 1st and sent by the 5th, so Club matters come up from the 8th of the month.
	const earlyInMonth = utc(openDay).getUTCDate() < 8;
	let main = weighted(r);
	while (main.club && earlyInMonth) main = weighted(r);
	let outcome = pick(r, ['resolved', 'resolved', 'resolved', 'owe', 'owe', 'act', 'act', 'team', 'team', 'quiet', 'quiet'] as Outcome[]);
	if (main.outcomes && !main.outcomes.includes(outcome)) outcome = pick(r, main.outcomes);
	const viaTeam = (outcome === 'resolved' || outcome === 'act') && chance(r, 0.3);
	const partial = outcome === 'team' || outcome === 'quiet' || viaTeam;
	const storeKey = storeFor(r, main);
	const store = STORES[storeKey];
	const cur = store.cur;
	const m = (value: number) => money(value, cur);
	const trade = main.who === 'trade' || (main.who === 'both' && chance(r, 0.4));
	const member = !trade && storeKey !== 'JP' && (main.club || chance(r, 0.25));
	const channel = trade ? pick(r, ['email', 'email', 'email', 'web form']) : pick(r, ['email', 'email', 'email', 'chat', 'chat', 'web form']);

	// Other matters: a quick question, and up to three smaller matters, each followed to its end.
	const used = new Set<Topic>([main]);
	const sideOk = (topic: Topic) =>
		!used.has(topic) && (trade || ![...used].some((other) => other.area === topic.area)) && fits(topic, storeKey, trade, member) && !(topic.club && earlyInMonth);
	const takeSide = () => {
		const choices = topics.filter(sideOk);
		if (!choices.length) return undefined;
		const topic = pick(r, choices);
		used.add(topic);
		return topic;
	};
	const quick = chance(r, 0.65) ? takeSide() : undefined;
	const fullCount = pick(r, [1, 2, 2, 3, 3]);
	const fulls = Array.from({ length: fullCount }, () => takeSide()).filter((topic): topic is Topic => !!topic);
	const sidesEarly = partial || chance(r, 0.35);

	// The customer.
	const names = STORES[main.names ?? storeKey];
	const first = pick(r, names.first);
	const last = pick(r, names.last);
	const [org, orgTown, , kind] = trade ? pick(r, trades.filter((entry) => entry[2] === storeKey)) : ['', '', storeKey, 'shop' as Kind];
	const agent = pick(r, agents);
	const payerFull = pick(r, payers);
	const openMs = openDay + int(r, 7 * 60 + 30, 21 * 60) * MIN;
	const card = `${storeKey === 'JP' ? pick(r, ['JCB', 'Visa', 'Mastercard']) : pick(r, cards)} ending ${int(r, 1000, 9999)}`;
	const kinWho = pick(r, kin);
	const clubMonth = utc(openMs).getUTCMonth();
	const club = store.club ? priceIn(store.club, cur) : 0;
	const methods: string[][] = [[card, 'default', `added ${pick(r, MON)} ${int(r, 2021, 2025)}`]];
	const person: Slots = {
		first,
		last,
		full: `${first} ${last}`,
		email: trade
			? `${pick(r, [...tradeMail[kind], first.toLowerCase()])}@${org.toLowerCase().replace(/[^a-z]+/g, '')}.example`
			: `${first.toLowerCase()}.${last.toLowerCase().replace(/[^a-z]/g, '')}@${pick(r, ['mailbox.example', 'postbox.example', 'inbox.example', 'letterbox.example'])}`,
		agent,
		store: store.label,
		curName: store.curName,
		org,
		orgTown,
		role: pick(r, tradeRoles[kind]),
		acct: `TR-${int(r, 1000, 1999)}`,
		card,
		card4: card.slice(-4),
		kin: kinWho,
		giver: pick(r, ['My aunt', 'My godmother', 'A friend from university', 'My grandmother', 'An old colleague']),
		kinCap: kinWho.charAt(0).toUpperCase() + kinWho.slice(1),
		kinNoun: kinWho.replace('my ', ''),
		kinfirst: pick(r, names.first.filter((name) => name !== first)),
		kinmail: '',
		since: String(int(r, 2014, 2025)),
		count: String(int(r, 2, 60)),
		when: pick(r, whens),
		day: WDL[utc(weekdayAfter(openMs + int(r, 2, 5) * DAY)).getUTCDay()]!,
		city: pick(r, store.places),
		ukcity: pick(r, STORES.UK.places),
		ukcity2: pick(r, STORES.UK.places),
		eucity: pick(r, STORES.EU.places),
		eucountry: pick(r, ['Ireland', 'the Netherlands', 'Belgium', 'Germany', 'France', 'Denmark']),
		company: `${pick(r, ['Brightwater', 'Halden', 'Northgate', 'Corrie', 'Ashby', 'Tamar'])} ${pick(r, ['Consulting', 'Engineering', 'Design Ltd', 'Associates', 'Surveyors', 'Partners'])}`,
		companyAddr: `${int(r, 2, 88)} ${pick(r, ['King Street', 'Mill Lane', 'Station Road', 'Castle Hill', 'Quay Street'])}, ${pick(r, STORES.UK.places)}`,
		club: m(club),
		club2: m(round2(club * 2)),
		gift6: m(round2(club * 6 - (cur === 'USD' ? 12 : 9))),
		clubm: MONL[clubMonth]!,
		prevmonth: MONL[(clubMonth + 11) % 12]!,
		nextmonth: MONL[(clubMonth + 1) % 12]!,
		clubday: `1 ${MONL[clubMonth]}`,
		clubSince: `${pick(r, ['March', 'April', 'May'])} 2025`,
		clubSince2: `${pick(r, ['March', 'April', 'May'])} 2026`,
		cancelday: dayMonth(Date.UTC(2026, clubMonth - 1, int(r, 3, 18))),
		oldemail: `${first.toLowerCase()}${int(r, 1, 99)}@${pick(r, ['mailbox.example', 'postbox.example'])}`,
		zero: m(0),
		wrap: m(cur === 'JPY' ? 300 : cur === 'GBP' ? 2.5 : 2.99),
		retlabel: m(cur === 'JPY' ? 800 : cur === 'GBP' ? 2.95 : 3.95),
		cardcap: m(cur === 'EUR' ? 2500 : 2000),
		perleaf: m(cur === 'JPY' ? 200 : 1),
		leafvalue: m(cur === 'JPY' ? 500 : cur === 'GBP' ? 2.5 : 3),
		threshold: m(store.threshold),
		limit: m(cur === 'JPY' ? 6000 : cur === 'GBP' ? 30 : 35)
	};
	person.kinmail = `${person.kinfirst!.toLowerCase()}.${pick(r, names.last).toLowerCase().replace(/[^a-z]/g, '')}`;
	if (chance(r, 0.5)) methods.push([`${pick(r, cards)} ending ${int(r, 1000, 9999)}`, chance(r, 0.3) ? 'expired' : 'saved', `added ${pick(r, MON)} ${int(r, 2020, 2025)}`]);
	if (storeKey !== 'JP' && chance(r, 0.5)) methods.push(['PayPal', 'linked', `added ${pick(r, MON)} ${int(r, 2019, 2025)}`]);
	if (chance(r, 0.4)) methods.push([`Gift card ending ${int(r, 1000, 9999)}`, `balance ${m(cur === 'JPY' ? int(r, 1, 40) * 100 : round2(int(r, 100, 3000) / 100))}`, `added ${pick(r, MON)} ${int(r, 2024, 2025)}`]);

	// One matter's facts: its order, books, amounts, dates and references. Every matter in a ticket has its own.
	const matter = (seed: number, topic: Topic): Slots => {
		const q = mulberry32(seed);
		let book1 = pick(q, books);
		let book2 = pick(q, books.filter((book) => book !== book1));
		while (topic.delivery && book1[2] + book2[2] >= 24) {
			book1 = pick(q, books);
			book2 = pick(q, books.filter((book) => book !== book1));
		}
		const [gbp1, gbp2] = [book1[2], book2[2]];
		const p1 = priceIn(gbp1, cur);
		const p2 = priceIn(gbp2, cur);
		const books12 = round2(p1 + p2);
		const postage = books12 >= store.threshold ? 0 : store.postage;
		const total = round2(books12 + postage);
		const date0 = openMs - int(q, 25, 40) * DAY;
		const date1 = openMs - int(q, 8, 18) * DAY;
		const date2 = date1 + int(q, 1, 3) * DAY;
		const date3 = Math.min(openMs - DAY, date2 + int(q, 1, 3) * DAY);
		const gcLoad = cur === 'JPY' ? pick(q, [10000, 15000]) : pick(q, [50, 75, 100]);
		const gcUsed = cur === 'JPY' ? int(q, 15, 30) * 100 : round2(int(q, 800, 1600) / 100);
		const gcOther1 = cur === 'JPY' ? int(q, 10, 20) * 100 : round2(int(q, 600, 1100) / 100);
		const gcOther2 = cur === 'JPY' ? int(q, 5, 15) * 100 : round2(int(q, 300, 700) / 100);
		const ukBal = round2(pick(q, [25, 30, 50]) - int(q, 300, 1500) / 100);
		const cardpart = cur === 'JPY' ? int(q, 10, 25) * 100 : round2(int(q, 500, 1500) / 100);
		const sub = cur === 'JPY' ? store.threshold + int(q, 1, 4) * 100 : store.threshold + round2(int(q, 50, 400) / 100);
		const voucher = cur === 'JPY' ? Math.round(sub / 100) * 10 : round2(sub * 0.1);
		const disc1 = cur === 'JPY' ? Math.round((p1 * 0.15) / 10) * 10 : round2(p1 * 0.15);
		const disc2 = cur === 'JPY' ? Math.round((p2 * 0.15) / 10) * 10 : round2(p2 * 0.15);
		const stmt = round2(total * (cur === 'EUR' ? 0.86 : 0.76) * (1 + int(q, 5, 25) / 1000));
		const ukprice = round2(gbp1 + gbp2 + (gbp1 + gbp2 >= 25 ? 0 : 3.49));
		const inv = round2(int(q, 18000, 96000) / 100);
		const invA = round2(inv * (0.6 + q() * 0.3));
		const credit = round2(int(q, 2500, 12000) / 100);
		const tickets = int(q, 1, 4);
		const tprice1 = pick(q, [8, 10, 12, 15]);
		const eu1 = priceIn(gbp1, 'EUR') + priceIn(gbp2, 'EUR');
		const maildomain = pick(q, ['mailbox.example', 'postbox.example', 'inbox.example', 'letterbox.example']);
		const goodpc = store.postcode(q);
		const time1 = 8 * 60 + int(q, 0, 13 * 60);
		const at = (minutes: number) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}:${pad(int(q, 0, 59))}`;
		return {
			...person,
			order: `LB-${int(q, 1040000, 1099999)}`,
			order2: `LB-${int(q, 1000000, 1039999)}`,
			order3: `LB-${int(q, 1040000, 1099999)}`,
			item: book1[0],
			author: book1[1],
			item2: book2[0],
			price1: m(p1),
			price2: m(p2),
			postage: m(store.postage),
			del: postage ? m(postage) : 'free',
			total: m(total),
			amount: m(p1),
			ref: `qp_${hex(q, 10)}`,
			ref2: `qp_${hex(q, 10)}`,
			arn: `74${digits(q, 21)}`,
			time1: at(time1),
			time2: at(time1 + 30),
			time3: at(time1 + int(q, 2, 6)),
			tries: String(int(q, 3, 6)),
			goodpc,
			badpc: misspell(q, goodpc),
			pm: `${int(q, 6, 10)}${pick(q, ['', '.30'])}pm`,
			pastday: WDL[utc(openMs - int(q, 1, 3) * DAY).getUTCDay()]!,
			pastShort: short(openMs - 2 * DAY),
			yesterday: short(openMs - DAY),
			date0: dayMonth(date0),
			date1: dayMonth(date1),
			d1: String(date1),
			date2: dayMonth(date2),
			date3: dayMonth(date3),
			date4: fullDay(openMs + int(q, 6, 14) * DAY),
			date5: dayMonth(date1 + 3 * DAY),
			date5b: dayMonth(date1 + 4 * DAY),
			stmt: money(stmt, 'GBP'),
			fee: money(round2(stmt * 0.0299), 'GBP'),
			ukprice: money(ukprice, 'GBP'),
			diff: money(Math.max(0.5, round2(stmt - ukprice)), 'GBP'),
			release: `${int(q, 2, 27)} ${pick(q, ['February', 'March', 'April', 'May'])} 2027`,
			slip: `${digits(q, 4)}-${digits(q, 4)}-${digits(q, 3)}`,
			sub: m(sub),
			voucher: m(voucher),
			afterv: m(round2(sub - voucher)),
			paid9: m(round2(sub - voucher + store.postage)),
			track: `${pick(q, ['RL', 'JD', 'TT'])}${digits(q, 9)}GB`,
			refund: m(round2(p1 - disc1)),
			disc1: m(disc1),
			disc2: m(disc2),
			paid2: m(round2(p2 - disc2)),
			lines: String(int(q, 3, 9)),
			pg: `${int(q, 40, 180)} to ${int(q, 181, 220)}`,
			gc: String(int(q, 1000, 9999)),
			gc2: String(int(q, 1000, 9999)),
			gcload: m(gcLoad),
			gcused: m(gcUsed),
			gcbal: m(round2(gcLoad - gcUsed - gcOther1 - gcOther2)),
			gcafter1: m(round2(gcLoad - gcUsed)),
			gcafter2: m(round2(gcLoad - gcUsed - gcOther1)),
			gcother1: m(gcOther1),
			gcother2: m(gcOther2),
			gcbalUK: money(ukBal, 'GBP'),
			gcbal2: cur === 'JPY' ? m(Math.round(ukBal * 19.2) * 10) : m(round2(ukBal * (cur === 'EUR' ? 1.16 : cur === 'USD' ? 1.32 : 1))),
			gcexp: `${dayMonth(openMs)} 2028`,
			cardpart: m(cardpart),
			splitamt: m(round2(gcUsed + cardpart)),
			maildomain,
			maildomainTypo: maildomain.replace(/o/, 'oo'),
			credit: m(cur === 'JPY' ? int(q, 10, 40) * 100 : credit),
			leafday: dayMonth(date2 + 30 * DAY),
			points: String(Math.floor(cur === 'JPY' ? total / 200 : total)),
			points2: String(Math.floor(cur === 'JPY' ? cardpart / 200 : cardpart)),
			po: `${pick(q, ['PO', 'P', 'LPO'])}-${int(q, 20000, 89999)}`,
			invoice: `INV-${int(q, 26000, 29999)}`,
			invoice2: `INV-${int(q, 26000, 29999)}`,
			inv: m(inv),
			invA: m(invA),
			invB: m(round2(inv - invA)),
			due: dayMonth(openMs + int(q, 44, 50) * DAY),
			today: '\u0001',
			d0: String(date0),
			due2: dayMonth(date2 + 30 * DAY),
			copies: String(int(q, 12, 90)),
			copies2: String(int(q, 4, 30)),
			badref: pick(q, ['SUPPLIER PAYMENT', `${pick(q, ['BACS', 'PMT', 'REM'])} ${int(q, 1000, 9999)}`, 'LARKSPUR', 'INVOICES SEPT']),
			rn: `RN-${int(q, 4000, 4999)}`,
			cn: `CN-${int(q, 900, 1499)}`,
			afterCredit: m(Math.max(0, round2(inv - credit))),
			event: `An evening with ${book1[1]}`,
			venue: pick(q, venues),
			edate: fullDay(openMs + int(q, 3, 12) * DAY),
			edate2: `${fullDay(Date.UTC(2027, int(q, 0, 2), int(q, 2, 26)))} 2027`,
			tickets: String(tickets),
			ticketsN: `${tickets} ticket${tickets > 1 ? 's' : ''}`,
			tprice1: m(tprice1),
			bfee: m(1.5),
			tprice: m(tickets * tprice1 + 1.5),
			booking: `EV-${int(q, 30000, 39999)}`,
			duty: money(round2(total * 1.17 * 0.23 + int(q, 9, 14)), 'EUR'),
			euTotal: money(round2(eu1 + (eu1 >= 30 ? 0 : 4.99)), 'EUR'),
			team: topic.team,
		};
	};
	const fillWith =
		(slots: Slots) =>
		(text: string): string =>
			text.replace(/\{(\w+)\}/g, (_, key: string) => {
				const value = slots[key];
				if (value === undefined) throw new Error(`no slot ${key} in "${text.slice(0, 60)}"`);
				return value;
			});
	const ms = matter(0x2b3c0000 + index * 7919, main);
	const fill = fillWith(ms);
	const sideSlots = fulls.map((topic, position) => matter(0x3c4d0000 + index * 7919 + position * 131, topic));
	const fillPerson = fillWith(person);

	// The conversation, as a list of messages whose text is already filled in.
	const items: Item[] = [];
	const c = (paras: string[]) => items.push({ who: 'c', paras });
	const a = (paras: string[], wait?: 'long') => items.push({ who: 'a', paras, wait });
	const ack = () => (chance(r, 0.35) ? [pick(r, custAcks)] : []);
	const ask = (pair: [string, string], f: (text: string) => string) => {
		c([...ack(), f(pair[0])]);
		a([f(pair[1])]);
	};
	const payNote = (topic: Topic, slots: Slots, extra: string[] = [], wait?: 'long'): Item => ({
		who: 'pay',
		paras: [`${pick(r, payersOpen)}${fillWith(slots)(topic.finding)}`, ...extra],
		art: () => topic.art(mulberry32(0x5eed + index * 31 + topics.indexOf(topic)), slots),
		wait
	});
	// A smaller matter, from the customer's first words about it to the customer saying it is sorted.
	const sides = () =>
		fulls.forEach((topic, position) => {
			const f = fillWith(sideSlots[position]!);
			c([pick(r, position === 0 ? sideLeads : sideLeads2), f(pick(r, topic.open))]);
			a([f(topic.reply)]);
			c([...ack(), f(topic.given)]);
			items.push({ who: 'note', paras: [`${pick(r, sideHands)} ${f(topic.handover)}`] });
			items.push(payNote(topic, sideSlots[position]!, [], 'long'));
			a([pick(r, sideExplains), f(topic.explain)]);
			if (chance(r, 0.7)) ask(pick(r, topic.more), f);
			c([f(pick(r, topic.fixed))]);
		});
	const opening = [...(chance(r, 0.5) ? [fill(pick(r, trade ? tradeStories : backstories))] : []), fill(pick(r, main.open))];
	let quickUsed = !quick;
	if (quick && chance(r, 0.4)) {
		quickUsed = true;
		if (chance(r, 0.5)) {
			c([`Two things, if I may. First, a quick one: ${fill(quick.quick[0])}`, `The bigger one:`, ...opening]);
			a([`On your quick question: ${fill(quick.quick[1])}`, `On the bigger one: ${fill(main.reply)}`]);
		} else {
			c([fill(quick.quick[0])]);
			a([fill(quick.quick[1])]);
			c([pick(r, [`Thanks! While I have you, the real reason I got in touch:`, `Great, thanks. The other thing, and really why I wrote:`, `Perfect. Now the thing that's actually been bothering me.`]), ...opening]);
			a([fill(main.reply)]);
		}
	} else {
		c(opening);
		a([...(chance(r, 0.4) ? [pick(r, agentIntros)] : []), fill(main.reply)]);
	}
	if (chance(r, 0.3)) items.push({ who: 'note', paras: [fill(pick(r, notes))] });

	const quickLater = !quickUsed && chance(r, 0.7) ? quick!.quick : undefined;
	if (sidesEarly) sides();
	c([...ack(), fill(main.given), ...(quickLater ? [`Unrelated, but ${lowerFirst(fill(quickLater[0]))}`] : [])]);
	items.push({ who: 'note', paras: [`${pick(r, handLeads)} ${fill(main.handover)}`] });
	a([...(quickLater ? [`On your other question: ${fill(quickLater[1])}`] : []), pick(r, holdings)]);
	const handOver = () => {
		const passing = `Passing to ${main.team}: ${fill(main.teamNote)}`;
		if (main.teamFinding) items.push({ who: 'pay', paras: [`${pick(r, payersOpen)}${fill(main.teamFinding)}`, passing], wait: 'long' });
		else items.push(payNote(main, ms, [passing], 'long'));
		a([fill(pick(r, passLines))]);
	};
	if (outcome === 'quiet') {
		items.push({ who: 'pay', paras: [fill(main.ask[0])], wait: 'long' });
		a([fill(main.ask[1])]);
		items.push({ who: 'a', paras: [pick(r, nudges1).replace('{need2}', fill(main.need2))], wait: 'long' });
		if (chance(r, 0.6)) items.push({ who: 'a', paras: [pick(r, nudges2).replace('{need2}', fill(main.need2))], wait: 'long' });
	} else if (outcome === 'team') {
		handOver();
		if (chance(r, 0.4)) c([pick(r, thanksLines)]);
		if (chance(r, 0.5)) items.push({ who: 'mate', paras: [pick(r, mateAcks)] });
	} else {
		if (!sidesEarly) sides();
		if (viaTeam) {
			handOver();
			items.push({ who: 'mate', paras: [fill(main.teamFind)], wait: 'long' });
			a([`${main.team.charAt(0).toUpperCase() + main.team.slice(1)} have come back to me:`, `> ${fill(main.teamFind)}`]);
		} else {
			items.push(payNote(main, ms, [], chance(r, 0.4) ? 'long' : undefined));
			a([pick(r, [`Our payments team have looked into it.`, `Payments have come back to me.`, `I've heard back from our payments team.`]), fill(main.explain)]);
		}
		const rest = main.more.filter((_, position) => position === 0 || chance(r, 0.8));
		if (rest.length === 2 && chance(r, 0.35)) {
			c([fill(rest[0]![0]), fill(rest[1]![0])]);
			a([fill(rest[0]![1]), fill(rest[1]![1])]);
		} else rest.forEach((pair) => ask(pair, fill));
		if (outcome === 'resolved') {
			c([fill(pick(r, main.fixed))]);
			if (chance(r, 0.6)) a([pick(r, closings)]);
		} else if (outcome === 'owe') {
			c([fill(main.follow)]);
			a([pick(r, oweLines).replace('{owe}', fill(main.owe))]);
			if (chance(r, 0.5)) c([pick(r, thanksLines)]);
		} else {
			a([pick(r, actLines).replace('{act}', fill(main.act))]);
			c([fill(pick(r, willDos))]);
		}
	}

	// Times. Customers write at any hour from 07:00; customer service answers on weekdays, 08:00 to 18:00, and payments
	// and the other teams 09:00 to 17:30. Late tickets get shorter gaps, so that every conversation ends before the export.
	const schedule = (scale: number): number[] => {
		const rt = mulberry32(0x71e5 + index * 7907);
		let now = openMs;
		const gap = (low: number, high: number) => Math.max(1, Math.round(int(rt, low, high) * scale));
		const workHours = (from: number, to: number) => {
			for (;;) {
				const d = utc(now);
				const hour = d.getUTCHours() + d.getUTCMinutes() / 60;
				if (d.getUTCDay() === 0 || d.getUTCDay() === 6 || hour >= to) now = midnight(now) + DAY + from * HOUR + int(rt, 5, 70) * MIN;
				else if (hour < from) now = midnight(now) + from * HOUR + int(rt, 5, 70) * MIN;
				else break;
			}
		};
		return items.map((item, position) => {
			if (position > 0) {
				if (item.wait === 'long') now += gap(1 * 24 * 60, 3 * 24 * 60) * MIN;
				if (item.who === 'c') {
					now += gap(12, 1300) * MIN;
					if (utc(now).getUTCHours() < 7) now += 7 * HOUR;
				} else if (item.who === 'note') now += int(rt, 2, 25) * MIN;
				else if (item.who === 'a') {
					now += gap(10, 280) * MIN;
					workHours(8, 18);
				} else {
					now += gap(60, 900) * MIN;
					workHours(9, 17.5);
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
		while (chatUntil > 0 && (items[chatUntil - 1]!.who !== 'a' || items.slice(0, chatUntil).some((item) => item.who !== 'a' && item.who !== 'c'))) chatUntil--;
	}

	// The file.
	const out: string[] = [];
	const subject = quick && quickUsed && chance(r, 0.35) ? pick(r, quick.subjects) : chance(r, 0.2) ? pick(r, vagueSubjects) : pick(r, main.subjects);
	const number = 61240 + index * 5 + int(r, 0, 4);
	out.push(`# Ticket ${number}: ${fill(subject)}`, '');
	const header: string[][] = [
		['Opened', `${stamp(openMs)}, by ${channel}`],
		['From', `${person.full} <${person.email}>`],
		['Store', `${store.label}, ${store.site} (${cur})`]
	];
	if (trade) header.push(['Account', `${person.acct}, ${org}, ${orgTown} (trade, invoiced monthly, 30 days)`], ['Contact', person.role!]);
	else {
		header.push(['Customer since', person.since!], ['Orders', person.count!]);
		if (storeKey !== 'JP') header.push(['Book Club', member ? `Monthly box since ${person.clubSince}` : 'no']);
	}
	if (channel === 'web form') header.push(['Form topic', pick(r, formTopics)]);
	out.push(table(['Field', 'Value'], header), '');
	const matters: [Topic, Slots][] = [[main, ms], ...fulls.map((topic, position): [Topic, Slots] => [topic, sideSlots[position]!])];
	if (trade) {
		const rows: string[][] = [];
		for (let i = int(r, 3, 6); i > 0; i--) {
			const when = openMs - (i * int(r, 9, 16) + int(r, 0, 4)) * DAY;
			rows.push([`INV-${int(r, 25000, 29999)}`, short(when), m(round2(int(r, 9000, 120000) / 100)), short(when + 30 * DAY), when + 30 * DAY < openMs ? pick(r, ['paid', 'paid', 'paid', 'part paid']) : 'open']);
		}
		for (const [topic, slots] of matters) {
			const issued = Number(slots.d0);
			if (topic.area === 'trade') rows.push([slots.invoice!, short(issued), slots.inv!, short(issued + 30 * DAY), issued + 30 * DAY < openMs ? 'overdue' : 'open']);
		}
		rows.sort((x, y) => (x[0]! < y[0]! ? -1 : 1));
		out.push('### Invoices on the account', '', table(['Invoice', 'Issued', 'Amount', 'Due', 'Status'], rows), '');
	} else {
		const rows: [number, string[]][] = [];
		for (let i = int(r, 1, 4); i > 0; i--) {
			const when = openMs - int(r, 20, 85) * DAY;
			const book = pick(r, books);
			rows.push([when, [`LB-${int(r, 1000000, 1099999)}`, short(when), book[0], m(priceIn(book[2], cur)), pick(r, [card, card, 'PayPal', storeKey === 'JP' ? 'Convenience store' : 'Apple Pay']), pick(r, ['Delivered', 'Delivered', 'Delivered', 'Returned', 'Dispatched'])]]);
		}
		for (const [topic, slots] of matters)
			if (topic.status) rows.push([Number(slots.d1), [slots.order!, short(Number(slots.d1)), `${slots.item}${topic.status === 'Preorder' ? '' : `, ${slots.item2}`}`, slots[topic.panelTotal ?? 'total']!, topic.paid ?? card, topic.status]]);
		if (member) rows.push([Date.UTC(2026, clubMonth, 1), [`Club ${short(Date.UTC(2026, clubMonth, 1))}`, short(Date.UTC(2026, clubMonth, 1)), 'Book Club box', person.club!, card, 'Dispatched']]);
		rows.sort((x, y) => x[0] - y[0]);
		out.push('### Recent orders', '', table(['Order', 'Placed', 'Items', 'Total', 'Paid with', 'Status'], rows.map(([, row]) => row)), '');
	}
	if (!trade && chance(r, 0.75)) out.push('### Payment methods', '', table(['Method', 'State', 'Added'], methods), '');
	const history = earlier.filter(() => chance(r, 0.3)).slice(0, 4);
	if (history.length) {
		const span = Math.max(30, Number(person.since) < 2026 ? 300 : 60);
		const rows = history.map((what): [number, string] => [openMs - int(r, 40, span) * DAY, fillPerson(what)]).sort((x, y) => x[0] - y[0]);
		out.push('### Earlier contact', '', table(['Date', 'Channel', 'About'], rows.map(([when, what]) => [`${short(when)} ${utc(when).getUTCFullYear()}`, pick(r, ['email', 'chat', 'phone', 'web form']), what])), '');
	}
	out.push('## Conversation', '');
	if (chatUntil > 0) {
		out.push(`### Chat with ${agent} · ${stamp(times[0]!)}`, '');
		const lines: string[] = [];
		items.slice(0, chatUntil).forEach((item, position) => {
			const who = item.who === 'c' ? first : agent;
			const at = clock(times[0]! + (position * 3 + int(r, 0, 2)) * MIN);
			if (position === 1) lines.push(`**${at} ${agent}:** ${fillPerson(pick(r, chatHellos))}`);
			item.paras.forEach((para) => lines.push(`**${at} ${who}:** ${para}`));
		});
		if (chatUntil < items.length) lines.push(`**${clock(times[0]! + (chatUntil * 3 + 2) * MIN)} ${agent}:** ${pick(r, chatHandoffs)}`);
		out.push(lines.join('\n\n'), '');
		const shift = times[0]! + (chatUntil * 3 + 10) * MIN;
		for (let position = chatUntil; position < times.length; position++) if (times[position]! < shift) times[position] = shift + position * MIN;
	}
	let previousAgent = '';
	let agentSpoke = chatUntil > 0;
	let actedOn = '';
	items.slice(chatUntil).forEach((item, offset) => {
		const position = chatUntil + offset;
		const at = times[position]!;
		if (item.who === 'pay' || item.who === 'mate') actedOn = dayMonth(at);
		const body: string[] = [];
		if (item.who === 'c') {
			out.push(`### ${person.full} · ${stamp(at)}`, '');
			const greeting = fillPerson(pick(r, position === 0 ? firstGreetings : replyGreetings));
			if (greeting) body.push(greeting);
			const quoted = previousAgent.split(/(?<=[.?!])\s/).find((sentence) => sentence.length > 40);
			if (quoted && chance(r, 0.25)) body.push(`> ${quoted}`);
			body.push(...item.paras);
			const signoff = fillPerson(pick(r, position === 0 ? (trade ? tradeSignoffs : custSignoffs) : replySignoffs));
			if (signoff) body.push(signoff);
		} else if (item.who === 'a') {
			out.push(`### ${agent} (Larkspur Books customer service) · ${stamp(at)}`, '');
			const afterCustomer = items[position - 1]?.who === 'c';
			body.push(fillPerson(pick(r, !agentSpoke ? agentGreetings : afterCustomer ? agentGreetingsLater : ['Hi {first},', 'Hello {first},'])), ...item.paras, fillPerson(pick(r, agentSignoffs)));
			previousAgent = [...item.paras].sort((x, y) => y.length - x.length)[0]!;
			agentSpoke = true;
		} else if (item.who === 'note') {
			out.push(`### Internal note by ${agent} · ${stamp(at)}`, '');
			body.push(...item.paras);
		} else if (item.who === 'pay') {
			out.push(`### Internal note by ${payerFull} (payments) · ${stamp(at)}`, '');
			body.push(item.paras[0]!);
			if (item.art) body.push(item.art());
			body.push(...item.paras.slice(1));
		} else {
			out.push(`### Internal note by ${teamPeople[main.team]} (${main.team.replace(/^the /, '')}) · ${stamp(at)}`, '');
			body.push(...item.paras);
		}
		out.push(body.join('\n\n').replace(/\u0001/g, actedOn || dayMonth(at)), '');
	});
	const final = times.at(-1)!;
	if (final >= EXPORT) throw new Error(`ticket ${number} runs past the export: ${stamp(final)}`);
	return { name: `${number}.md`, text: out.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n' };
};

const folder = join(root, 'docs', 'payment-tickets');
mkdirSync(folder, { recursive: true });
for (let index = 0; index < ITEMS; index++) {
	const { name, text } = ticket(index);
	writeFileSync(join(folder, name), text);
}
writeFileSync(
	join(folder, 'README.md'),
	`# Payment tickets\n\nThe ${ITEMS} tickets that customer service passed to the payments team between 7 September and 13 November\n2026, one file each, as the help desk exported them on 20 November. Each file holds what the agent saw when the\nticket came in (the customer's store and recent orders, or a trade account's invoices) and the whole conversation,\nchats included, with internal notes. The export does not keep the help desk's tags, statuses or assignees.\nNumbers missing from the sequence are tickets that never reached payments.\n`
);
