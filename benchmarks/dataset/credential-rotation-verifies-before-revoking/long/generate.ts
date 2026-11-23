// Writes the long material of this entry's long tasks: the Fennel Prints customer tickets opened between
// 1 September and 10 November 2026 that took more than one reply, one Markdown file each, under
// support/tickets/. Deterministic: fixed seeds, no clock, no network.
//   bun long/generate.ts <workspace root>
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** How many tickets to write. Dates, ticket numbers and the folder's README follow from it. */
const ITEMS = 133;

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
const pad = (value: number, width = 2) => String(value).padStart(width, '0');
const chars = (r: Rand, alphabet: string, length: number) => Array.from({ length }, () => alphabet[Math.floor(r() * alphabet.length)]).join('');
const ALNUM = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

// Time is counted in minutes from the start of 2026, UTC.
const BASE = Date.UTC(2026, 0, 1);
const minutesOf = (month: number, day: number, hour = 0, minute = 0) => (Date.UTC(2026, month - 1, day, hour, minute) - BASE) / 60000;
const at = (minutes: number) => new Date(BASE + minutes * 60000);
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const stamp = (m: number) => {
	const d = at(m);
	return `${WEEKDAYS[d.getUTCDay()]!.slice(0, 3)} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]!.slice(0, 3)} ${d.getUTCFullYear()}, ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
};
const isoDay = (m: number) => at(m).toISOString().slice(0, 10);
const isoMinute = (m: number) => at(m).toISOString().slice(0, 16).replace('T', ' ');
const isoSecond = (m: number, r: Rand) => `${isoMinute(m)}:${pad(int(r, 0, 59))}`;
const spoken = (m: number) => `${at(m).getUTCDate()} ${MONTHS[at(m).getUTCMonth()]}`;
const short = (m: number) => `${pad(at(m).getUTCDate())} ${MONTHS[at(m).getUTCMonth()]!.slice(0, 3)}`;
const hourOf = (m: number) => Math.floor(m / 60) % 24;
const dayStart = (m: number) => m - (m % 1440);

const FIRST_DAY = minutesOf(9, 1);
const SPAN_DAYS = 70; // 1 September to 10 November
const LAST_MESSAGE = minutesOf(11, 19, 17, 30);
const RELEASE = minutesOf(10, 28, 12); // 1.4.0: TIFF uploads, and receipts show the currency symbol

// Money. Prices are in pounds; a customer abroad pays in their own currency.
type Currency = 'GBP' | 'EUR' | 'USD' | 'JPY' | 'KRW';
const SYMBOLS: Record<Currency, string> = { GBP: '£', EUR: '€', USD: '$', JPY: '¥', KRW: '₩' };
const RATES: Record<Currency, number> = { GBP: 1, EUR: 1.1612, USD: 1.3102, JPY: 196.4, KRW: 1812 };
const PRICES: Record<string, number> = { '6x4': 0.32, '7x5': 0.59, '6x6': 0.65, '10x8': 2.4, A4: 3.5 };
const whole = (currency: Currency, pounds: number) => {
	const value = pounds * RATES[currency];
	return currency === 'KRW' ? Math.round(value / 10) * 10 : currency === 'JPY' ? Math.round(value) : Math.round(value * 100) / 100;
};
const groups = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const money = (currency: Currency, pounds: number) => {
	const value = whole(currency, pounds);
	return currency === 'JPY' || currency === 'KRW' ? `${SYMBOLS[currency]}${groups(String(value))}` : `${SYMBOLS[currency]}${groups(value.toFixed(2))}`;
};
const coded = (currency: Currency, pounds: number) => {
	const value = whole(currency, pounds);
	return currency === 'JPY' || currency === 'KRW' ? `${currency} ${value}` : `${currency} ${value.toFixed(2)}`;
};
/** The amount as the receipt email printed it at the time. */
const receipted = (currency: Currency, pounds: number, when: number) => {
	const value = whole(currency, pounds);
	const minor = currency === 'JPY' || currency === 'KRW' ? value : Math.round(value * 100);
	const shown = (minor / 100).toFixed(2);
	return when >= RELEASE ? `${SYMBOLS[currency]}${shown}` : `${currency} ${shown}`;
};

// People and places.
type Region = 'uk' | 'eu' | 'us' | 'jp' | 'kr';
const PEOPLE: Record<Region, { first: string[]; last: string[]; banks: string[]; currency: Currency; countries: string[] }> = {
	uk: {
		first: ['Alison', 'Deepak', 'Morag', 'Gareth', 'Chidi', 'Bronwen', 'Farah', 'Lewis', 'Trevor', 'Gemma', 'Yvonne', 'Callum', 'Shreya', 'Desmond', 'Owen', 'Lorna', 'Kwame', 'Tamsin', 'Elliot', 'Hamza', 'Cerys', 'Fergus', 'Rosalind', 'Imran', 'Hattie', 'Malcolm', 'Priti', 'Joanne', 'Rhys', 'Beverley', 'Niamh', 'Stuart'],
		last: ['Whitlock', 'Banerjee', 'Okonkwo', 'Prentice', 'Haldane', 'Mistry', 'Trevelyan', 'Farrow', 'Qureshi', 'Dunmore', 'Ellery', 'Brathwaite', 'Pemberton', 'Ashworth', 'Kaur', 'McAllister', 'Oduya', 'Griffiths', 'Lowther', 'Sandhu', 'Cartwright', 'Nwosu'],
		banks: ['Harbour Bank', 'Northway Building Society', 'Meridian Bank', 'Thistle & Co', 'Cardinal Bank'],
		currency: 'GBP',
		countries: ['the UK']
	},
	eu: {
		first: ['Aoife', 'Ciarán', 'Lena', 'Matthias', 'Sophie', 'Joost', 'Inès', 'Lucía', 'Pieter', 'Annika', 'Rafael', 'Margot'],
		last: ['Byrne', 'Hoffmann', 'Vermeulen', 'Lefèvre', 'García', 'Janssens', 'Keller', 'Moreau', 'Fitzgerald', 'de Vries', 'Rossi', 'Brennan'],
		banks: ['Liffey Bank', 'Kanaalbank', 'Ostwald Sparkasse', 'Banque Viorne', 'Banco Albor'],
		currency: 'EUR',
		countries: ['Ireland', 'Germany', 'the Netherlands', 'France', 'Spain', 'Belgium']
	},
	us: {
		first: ['Kayla', 'Marcus', 'Brittany', 'Tyler', 'Denise', 'Jamal', 'Heather', 'Cody', 'Rosa', 'Garrett'],
		last: ['Whitaker', 'Delgado', 'Hutchins', 'Okafor', 'Castillo', 'Pruitt', 'Lindgren', 'Yazzie', 'Moreno', 'Calloway'],
		banks: ['Prairie Federal Credit Union', 'Cobalt Bank', 'First Lakeshore', 'Redwood National'],
		currency: 'USD',
		countries: ['the US']
	},
	jp: { first: ['Haruka', 'Kenji', 'Yui', 'Takashi', 'Emi', 'Sho'], last: ['Tanaka', 'Sato', 'Morimoto', 'Ishikawa', 'Fujita', 'Kobayashi'], banks: ['Sakuragi Bank', 'Minato Trust'], currency: 'JPY', countries: ['Japan'] },
	kr: { first: ['Ji-woo', 'Min-jun', 'Seo-yeon', 'Hyun-woo', 'Eun-ji'], last: ['Kim', 'Park', 'Lee', 'Choi', 'Jung'], banks: ['Hanbit Bank', 'Daeseong Bank'], currency: 'KRW', countries: ['South Korea'] }
};
const agents = ['Ilse', 'Kofi', 'Bea', 'Tomasz', 'Wren', 'Saoirse'];
const towns: [string, string][] = [['Leeds', 'LS6'], ['Norwich', 'NR2'], ['Swansea', 'SA1'], ['Hexham', 'NE46'], ['Truro', 'TR1'], ['Bath', 'BA2'], ['Lancaster', 'LA1'], ['Perth', 'PH2'], ['Shrewsbury', 'SY3'], ['Ipswich', 'IP4'], ['Kendal', 'LA9'], ['Stroud', 'GL5']];
const streets = ['Mill Lane', 'Station Road', 'Orchard Close', 'Victoria Street', 'Church View', 'Beech Avenue', 'Harbour Row', 'Kingsway', 'Wellington Terrace', 'Quarry Hill'];
const depots: Record<Region, string[]> = { uk: ['Leeds', 'Swindon', 'Peterborough', 'Exeter', 'Warrington', 'Glasgow'], eu: ['Dublin', 'Frankfurt', 'Antwerp', 'Lyon'], us: ['Newark', 'Memphis', 'Chicago'], jp: ['Osaka', 'Narita'], kr: ['Incheon'] };
const companies = ['Ashcombe Lettings', 'Holloway & Pike Estate Agents', 'Brindle Architects', 'Keld Valley Wedding Films', 'Marsh Lane Dental', 'Tern Studio', 'Copperbeech Interiors', 'Oriel Property Group'];
const schools = ['Fairfield Primary School', 'St Aidan\'s Church of England School', 'Brook Lane Junior School', 'Hillcrest Academy', 'Westwood Infants'];
const clubs = ['camera club', 'rowing club', 'local history society', 'walking group', 'allotment society'];
const occasions = ['a christening', 'my parents\' ruby wedding', 'a memorial service', 'my daughter\'s graduation party', 'a surprise 50th', 'our golden wedding party', 'a school open day', 'my nan\'s 90th'];
const places = ['Portugal', 'the Highlands', 'Japan', 'Croatia', 'Cornwall', 'Norway', 'Sicily', 'New Zealand', 'the Lake District', 'Vietnam', 'Pembrokeshire', 'the Dolomites'];
const mailDomains = ['mailbox.example', 'postmail.example', 'inbox.example', 'webpost.example'];

type Line = ['c' | 's', string];
type Paste = 'charges' | 'timeline' | 'uploads' | 'lab' | 'voucher' | 'account' | 'quote';
type CustomerPaste = 'statement' | 'receipt' | 'errors' | 'tracking';
type Uploads = 'heic' | 'large' | 'tiff' | 'upper' | 'dup' | 'lowres' | 'crop' | 'stall';
type Lab = 'held' | 'dispatched' | 'returning' | 'mixup' | 'short' | 'checked' | 'delivered';

interface Topic {
	/** Only for reading this source; never written. */
	id: string;
	regions?: Region[];
	sizes?: string[];
	count?: [number, number];
	/** The ticket's subject, as the customer typed it. */
	subjects: string[];
	/** The customer's first message, after any greeting and backstory. */
	opens: string[];
	/** In order, all used: what support says, and the customer's answer. The first answer is followed by the customer's paste. */
	turns: [string, string][];
	/** Optional exchanges, each used or not, slotted in after the second turn. */
	extras: [string, string][];
	customerPaste?: CustomerPaste;
	/** Support's internal note after looking the order up, followed by the pastes. */
	note: string[];
	paste: Paste[];
	charges?: string[];
	events?: string[];
	uploads?: Uploads;
	lab?: Lab;
	/** A ticket sorted within the thread ends with these lines. */
	fixed: Line[];
	/** What support owes the customer, as "I'll ...". */
	owe: string;
	/** Support's message once what was owed is done. */
	done: string;
	/** What the customer has to do, as "could you ...". */
	wait: string;
	/** Who the ticket is passed to, and what they will do, as "they'll ...". */
	pass: [string, string];
}

// Slots are filled from the values built in ticket(); an unknown slot is an error.
const topics: Topic[] = [
	{
		id: 'refused-bank',
		subjects: ['Payment keeps failing', 'Can\'t pay for my order', 'Your checkout won\'t take my card'],
		opens: [
			'I\'ve tried to pay for order {order} three times now and each time it says the payment failed. My card works everywhere else; I used it in the supermarket this morning, and there\'s plenty in the account. The photos are all uploaded and the basket looks right, it\'s only the last step that goes wrong. Is something wrong with your site?',
			'Every time I get to the end of checkout it says \'Payment failed, please try another card\'. I don\'t have another card. The photos are all uploaded, {n} of them, and it took me most of an evening to choose them, so I really don\'t want to have to do them again. Can you see what\'s going on?',
			'I\'m trying to pay for {n} prints and your site keeps refusing my card. I\'ve checked the number, the date and the three digits on the back. My husband tried his card on his laptop and the same thing happened, although that might be because we\'re both with {bank}.'
		],
		turns: [
			['Could you tell me roughly when you tried, and the last four digits of the card? That\'s enough for me to find the attempts on our side. Please don\'t send the full card number by email.', 'It was about half past eight last night, then twice this morning before work. The card ends {last4}. It\'s a {bank} debit card, nothing unusual about it.'],
			['Thanks. I can see your attempts, and each one was turned down by {bank} itself rather than by us. The code they send back is a general \'do not honour\', which is what banks use when their own checks stop a payment, and they don\'t tell us the reason. A card that hasn\'t been used with us before sometimes trips it, as can a payment that looks different from your usual spending. Nothing on our side is blocking you.', 'That\'s ridiculous. Why would they block a photo shop? I\'ve used this card online for years and never had a problem. I bought a sofa with it last month without a murmur.'],
			['I know, it\'s maddening. The quickest fix is usually to approve the payment in your banking app if it offers that, or to ring the number on the back of the card and tell them you\'re trying to pay Fennel Prints. Your basket and photos are saved, so nothing needs uploading again; go back to the basket and pay once the bank has cleared it.', 'There was nothing in the app at all, I looked. I\'ll have to ring them, but they\'re closed now, so it\'ll be tomorrow.']
		],
		extras: [
			['I\'ve also checked whether anything on our side flagged the payments, and nothing did: our payment provider\'s own check rated every attempt as normal.', 'Well, that\'s something. So it really is just the bank being difficult.'],
			['For what it\'s worth, we see this most weeks, and it\'s nearly always sorted with a single phone call to the bank.', 'I hope so. Their phone queue is usually forty minutes.'],
			['If it helps when you call, the amount you\'ll be approving is {total}, and it will show as Fennel Prints on your statement.', 'Thanks, I\'ll have that ready.']
		],
		note: ['Three attempts on Tillpoint for {order}, all declined by the issuer with do_not_honor. No 3-D Secure challenge was asked for, so this is the bank\'s own decision, not authentication.', 'All attempts on {order} failed at the issuer (do_not_honor). Tillpoint\'s own risk score was low every time, so nothing from our side.'],
		paste: ['charges'],
		charges: ['fail:do_not_honor', 'fail:do_not_honor', 'fail:do_not_honor'],
		fixed: [['c', 'Rang {bank} this morning. They\'d put a block on it as a \'new merchant\', of all things. They lifted it while I was on the phone and it went through first time.'], ['s', 'Good news, then. I can see the payment for {order}, and the photos went to the lab this afternoon, so they should be with you in three to five working days.']],
		owe: 'keep your basket and photos for an extra fortnight, past the usual 30 days, so you don\'t have to upload anything again while you sort it out with the bank',
		done: 'I\'ve extended the basket for {order} by two weeks, so your photos are safe until the end of next month. Nothing else is needed from you until you\'re ready to pay.',
		wait: 'ring {bank} and ask them to let the payment through, then try once more',
		pass: ['Tillpoint, our payment provider', 'check whether anything on their side is stopping the card before it reaches your bank']
	},
	{
		id: 'refused-3ds',
		subjects: ['Payment not going through', 'Stuck on \'confirming with your bank\'', 'Has my order been paid or not?'],
		opens: [
			'When I pay, a box comes up saying it\'s confirming with my bank, and after a while it says the payment couldn\'t be completed. I\'ve done it twice now. I\'m on my laptop, if that matters, and the photos are all in the basket ready to go.',
			'I tried to pay for my prints last night. It said to approve it in my banking app, which I did as fast as I could, but the website had already given up by then. Now I don\'t know whether I\'ve paid or not, and I don\'t want to try again in case I pay twice.',
			'Something odd is happening at checkout. I press Pay, the screen says \'waiting for your bank\', and a few minutes later it says the payment wasn\'t completed. My bank\'s app did send me a notification, but by the time I opened it, it said the request had expired.'
		],
		turns: [
			['Sorry about that. Before I look: did your banking app ask you to approve the payment, and if so, roughly how long after the box appeared did you approve it?', 'Yes, but my phone was upstairs charging. By the time I\'d found it, unlocked it and opened the app it was probably three or four minutes. The app said something about the request no longer being valid.'],
			['That explains it. When your bank asks for approval, the payment page waits a limited time for the answer; if it doesn\'t arrive, the bank treats the payment as not approved and it\'s cancelled. You haven\'t been charged for either attempt. If an amount shows as pending in your app, it\'s a hold that will drop off on its own within a few days.', 'OK, so I just do it again? I don\'t want to end up paying twice. I\'ve had that happen with another shop and it took weeks to get the money back.'],
			['Yes, try once more with your phone next to you and approve it as soon as the notification arrives. If it goes through, you\'ll get a confirmation email straight away. An order can only be paid once, so even if something odd happens there\'s no risk of being charged twice for the same prints.', 'Fair enough. I\'ll try tonight when I\'m home, with the phone on the desk next to me this time.']
		],
		extras: [
			['Some banks also let you approve payments with a code sent by text instead of the app. If yours does, that can be quicker when the phone isn\'t to hand, though it\'s worth having it nearby either way.', 'I didn\'t know that. I\'ll look in the app\'s settings.'],
			['I\'ve looked at the timings on our side: the request to your bank went out within a few seconds of you pressing Pay each time, so it isn\'t a delay in sending it.', 'Right, so it\'s me being slow rather than your system. Fair enough.'],
			['Your basket is safe in the meantime. Nothing in it expires for 30 days.', 'Good, I was worried I\'d have to start again.']
		],
		note: ['Two attempts on {order}. Both reached 3-D Secure, and the bank\'s challenge timed out both times. Nothing captured.', 'Tillpoint shows the 3-D Secure challenge issued and never answered in time, twice. No charge succeeded on {order}.'],
		paste: ['charges'],
		charges: ['fail:authentication_failed', 'fail:authentication_failed'],
		fixed: [['c', 'Kept the phone right next to me this time, approved it straight away and it went through. The confirmation email arrived a minute later.'], ['s', 'Lovely, I can see it\'s paid. The lab will have it first thing tomorrow.']],
		owe: 'check {order} first thing tomorrow and email you to say whether a payment has come through, so you\'re not left guessing',
		done: 'I checked {order} this morning: your payment from last night went through and the order is with the lab now.',
		wait: 'try the payment again with your phone to hand, and tell me the time if it fails',
		pass: ['Tillpoint, our payment provider', 'look at why your bank\'s approval isn\'t reaching the payment page in time']
	},
	{
		id: 'refused-card-type',
		regions: ['uk'],
		sizes: ['A4', '10x8'],
		count: [44, 70],
		subjects: ['Company card declined', 'Card rejected at checkout', 'Paying with our business card'],
		opens: [
			'I\'m ordering prints for our office reception (we\'re {company}) and need to pay with the company card, but it\'s rejected every time. Our finance team say the card is fine and has plenty of limit, and I\'ve used it for stationery and train tickets this month without any trouble.',
			'We\'re trying to pay for {n} {size} prints for a client presentation next week and the company card is declined. I\'ve tried it on two different computers and in two browsers. Nothing wrong with the card, according to our office manager, who is now asking me why I can\'t buy some photos.',
			'Our company card won\'t go through on your checkout. It\'s a card our finance department gives out for purchases, and it works with most of our suppliers. The order is {order}. Could you tell me what\'s wrong?'
		],
		turns: [
			['Could you tell me what it says on the front of the card (for example \'Business\', \'Corporate\' or \'Purchasing\') and the last four digits?', 'It says Purchasing on the front, with our company name underneath. Ends {last4}. Our finance team issue them to about a dozen of us.'],
			['Thank you. The attempts were turned down with a code meaning the card type isn\'t accepted for this kind of purchase. Purchasing cards are often set up by whoever issues them to work only with certain kinds of supplier, and photo printing isn\'t always on that list. It isn\'t a problem with the limit or with the card itself.', 'I see. That would explain why it works for stationery. Is there anything you can do from your end?'],
			['Unfortunately we can\'t override what the card allows. An ordinary debit or credit card works, and for orders over £100 we can send an invoice instead so you can pay by bank transfer.', 'The order is {total}, so I\'ll see whether one of the partners can put it on their own card and claim it back. Otherwise invoice it is. Can I let you know tomorrow?']
		],
		extras: [
			['Your finance team may be able to ask the card issuer to allow retail purchases on it. It\'s usually a setting on their side rather than a new card.', 'I\'ll ask, but I suspect the answer will be no. They\'re quite strict.'],
			['For an order this size it\'s also worth knowing that we can put your company name and VAT number on an invoice, whichever way you pay.', 'That\'s useful, our accounts team always want one.']
		],
		note: ['Tillpoint: card_not_supported on every attempt for {order}. The card is a commercial purchasing card, restricted by merchant category. Nothing we can change.', 'Attempts on {order} declined with card_not_supported. Purchasing card; the issuer limits where it can be used.'],
		paste: ['charges'],
		charges: ['fail:card_not_supported', 'fail:card_not_supported'],
		fixed: [['c', 'One of the partners paid with her own card and it went straight through. Thanks for explaining, I\'d have kept trying otherwise.'], ['s', 'Perfect, that\'s paid and on its way to the lab. If you need a VAT invoice with the company name for the expense claim, just reply and I\'ll send one.']],
		owe: 'send you an invoice for {order} so you can pay by bank transfer, and release the order to the lab the day the money arrives',
		done: 'Your transfer arrived this morning, so {order} has gone to the lab. The paid invoice is attached for your records.',
		wait: 'check with your finance team whether the card can be opened up for online retail purchases, or tell me if you\'d rather pay by invoice',
		pass: ['our accounts team', 'set you up to pay by invoice and contact you with the details']
	},
	{
		id: 'refused-postcode',
		regions: ['uk'],
		subjects: ['Payment declined - address?', 'Checkout says my details are wrong', 'Why is my card refused?'],
		opens: [
			'Your checkout keeps saying my card details are wrong. They are not wrong. I have typed them very carefully four times, reading each number out loud, and I\'m at my wits\' end.',
			'Hi, my payment is declined every time. The only thing I can think of is that we moved house in {month}. Could that be it? Everything else on the card is definitely right.',
			'I can\'t pay for my order. It says the payment was declined by my bank, but the bank\'s app doesn\'t show any declined payments at all. I\'m going round in circles.'
		],
		turns: [
			['I\'m sorry it\'s been such a struggle. Could you give me the last four digits of the card and the postcode you entered at checkout? I\'ll compare it with what came back from the bank.', 'Card ends {last4}. I put {postcode}, which is where we live now. Same postcode for the delivery address.'],
			['Thank you, that\'s really helpful. Every attempt came back from {bank} with \'postcode does not match\'. When you pay, the bank compares the billing postcode you type with the one it holds for the card. If it still has your old address, the payment fails even though the card number is right.', 'Ah. I bet they\'ve still got the old one. I told the council, the doctor and the dentist and completely forgot the bank.'],
			['That sounds like it. You can either update the address with {bank} (often it\'s in the app under your profile) or enter your old postcode as the billing postcode for now. The delivery address is separate, so the prints still come to the new house.', 'Right. I\'ll try with the old postcode tonight, and ring the bank about the address when I\'ve got a spare half hour.']
		],
		extras: [
			['If you looked in your banking app, you won\'t have seen these attempts: a payment that fails this check never reaches your account, so the app has nothing to list.', 'I did look, and wondered why there was nothing there.'],
			['If you\'d like, I can leave a note on the order so the lab double-checks the delivery address is the new one before it\'s posted.', 'Yes please. With the move, I\'m paranoid about things going to the old house.']
		],
		note: ['{order}: four attempts, all incorrect_postal_code from the issuer. Card number, expiry and security code all passed.', 'Tillpoint shows incorrect_postal_code each time on {order}. Everything else about the card checks out.'],
		paste: ['charges'],
		charges: ['fail:incorrect_postal_code', 'fail:incorrect_postal_code', 'fail:incorrect_postal_code', 'fail:incorrect_postal_code'],
		fixed: [['c', 'The old postcode did it. Paid, and I\'ve had the confirmation. I\'ve changed the address with the bank while I think of it.'], ['s', 'Brilliant. The order is with the lab now, and it\'s going to the new address.']],
		owe: 'check {order} once it\'s paid and make sure the delivery address is the new one, so the prints don\'t go to the old house',
		done: 'I\'ve just checked {order}: it\'s paid, the delivery address is the new one, and it went to the lab this morning.',
		wait: 'update your address with {bank}, or try the payment with your old postcode as the billing postcode',
		pass: ['Tillpoint, our payment provider', 'confirm which postcode check your bank is running on these payments']
	},
	{
		id: 'refused-expired',
		subjects: ['My new card is being refused', 'Card declined - it\'s brand new', 'Payment error at checkout'],
		opens: [
			'My bank sent me a new card last week and your site keeps saying it has expired. It can\'t have, it\'s brand new! It runs until {expiry}. I\'ve got photos of my grandson\'s christening waiting to be printed.',
			'I keep getting \'your card has expired\' when I pay. I\'ve just looked at the card and it hasn\'t. I\'ve ordered from you lots of times before without any problem, always on this computer.',
			'Your website says my card is out of date. I\'m holding it in my hand and it isn\'t. Is your system using the wrong date or something?'
		],
		turns: [
			['That does sound odd. Are you typing the card details in yourself, or is your browser or phone filling them in for you?', 'The browser fills it in. It remembers my card, which saves me finding my glasses. I just type the three numbers on the back.'],
			['I think that\'s the cause. The attempts came back from the bank as \'expired card\' with an expiry date of {oldexpiry}. If the browser saved your old card, it may still be filling in the old expiry date even though the number is the same. Could you type the date in by hand from the new card?', 'Oh! The number stayed the same when they sent the new one, so I never thought to check the date.'],
			['It catches a lot of people out, because many banks keep the number and only change the expiry date and the three digits on the back. It\'s worth updating the saved card in your browser settings too, so it doesn\'t happen on other sites.', 'I\'ll have a go now, and ask my son to show me where the saved card lives in the settings when he\'s round on Sunday.']
		],
		extras: [
			['To be sure, I checked the dates on our side too: the payment page goes by your bank\'s answer, not our own calendar, so it can\'t be a wrong date at our end.', 'Fair enough. I did wonder.'],
			['The three digits on the back usually change with a new card as well, so if the old ones are saved anywhere, that\'s worth updating too.', 'I always type those in myself, so that part should be fine.']
		],
		note: ['Tillpoint for {order}: three attempts, expired_card. The expiry sent was {oldexpiry}, so the browser\'s saved card is the likely culprit.', '{order}: expired_card three times; expiry submitted {oldexpiry}. Otherwise the card looks valid from the responses.'],
		paste: ['charges'],
		charges: ['fail:expired_card', 'fail:expired_card', 'fail:expired_card'],
		fixed: [['c', 'That was it! The browser had the old date. Typed it in myself and it worked straight away. I feel a bit silly now.'], ['s', 'Not silly at all, it happens a lot. Your order is paid and with the lab.']],
		owe: 'keep an eye on {order} and email you once the payment comes through',
		done: 'Your payment for {order} came through this morning, and the order is with the lab.',
		wait: 'type the expiry date in by hand from the new card and try again',
		pass: ['Tillpoint, our payment provider', 'look at the attempts and tell us exactly what your browser has been sending']
	},
	{
		id: 'double-capture',
		subjects: ['Charged twice!', 'Two payments taken for one order', 'Double charge on my card'],
		opens: [
			'I\'ve been charged twice for order {order}. The page was very slow after I pressed Pay, so I pressed it again, and now there are two payments of {total} on my account. Please refund one of them.',
			'There are two identical payments to Fennel Prints on my statement, both {total}. I only placed one order and only got one confirmation email. I want one of them back, please.',
			'You\'ve taken my money twice. The first time I paid, the page sat there with the wheel spinning, so I clicked the button again. Now two payments have gone out. I\'m a pensioner and this matters.'
		],
		turns: [
			['I\'m sorry about this. Could you confirm the date of the two payments and the last four digits of the card, so I can match them up on our side?', 'Both on {date}, card ending {last4}. This is what my banking app shows:'],
			['Thank you. I can see both, and you\'re right: two payments were taken for {order}, about a minute apart, and both went through. Only one order was placed, so the second payment is ours to give back.', 'Good. How long will that take? Money is tight this month, and that\'s a big chunk of it.'],
			['I understand. Once a refund is issued it normally reaches the card in three to five working days, though some banks are quicker. You\'ll get the refund reference, so you can ask the bank about it if it doesn\'t appear.', 'OK. Thank you for getting to it so quickly. I was expecting to have to argue about it.']
		],
		extras: [
			['Only one set of prints will be made, by the way. The second payment didn\'t create a second order, so you won\'t get duplicates in the post.', 'That\'s a relief, I was imagining two parcels turning up.'],
			['I\'ve also passed this one on internally, because a second press of the button shouldn\'t be able to take a second payment, and I\'d like it looked at.', 'Good. I can\'t be the only one who\'s done that.']
		],
		customerPaste: 'statement',
		note: ['{order}: two succeeded charges for the same amount, under a minute apart. Same card, same basket. The second is the duplicate.', 'Duplicate capture on {order}: two succeeded charges a minute apart. The later one needs refunding.'],
		paste: ['charges'],
		charges: ['ok', 'ok-again'],
		fixed: [['c', 'Please just refund it as soon as you can.'], ['s', 'Done: I\'ve refunded the second payment of {total} just now, reference {refund}. It should be back on your card within three to five working days, and the order itself is unaffected.']],
		owe: 'refund the second payment today and send you the reference',
		done: 'I\'ve refunded the second payment of {total}; the reference is {refund}. Your bank should show it within three to five working days.',
		wait: 'send me a screenshot of the two payments from your banking app, with the card number hidden, so I can attach it to the refund',
		pass: ['Tillpoint, our payment provider', 'find out why the second press of the Pay button went through as a separate payment, and refund it']
	},
	{
		id: 'two-orders',
		subjects: ['Ordered twice by mistake', 'Duplicate order', 'Please cancel one of my orders'],
		opens: [
			'I think I\'ve placed the same order twice. The first time, the page went white after I paid, so I uploaded everything again and paid again. Now I have two confirmation emails, {order} and {order2}. I only want one set of prints!',
			'I\'ve got two order numbers, {order} and {order2}, for exactly the same photos. The first one looked as though it hadn\'t worked, so I did it all again. Can you cancel the second one and give me the money back?',
			'Help, I\'ve ordered everything twice. My internet dropped right after I paid and I assumed it had failed. Order numbers {order} and {order2}. Please stop one of them before it\'s printed if you can.'
		],
		turns: [
			['Thanks for letting us know so quickly, it really helps. Let me check where both orders are with the lab before I promise anything.', 'Thank you. Fingers crossed. I\'ll keep an eye on my email.'],
			['Both orders went through, and both have the same {n} photos. {order} went to the lab first and {order2} a few minutes later. The lab prints in batches through the day, so there\'s a good chance the second one hasn\'t been started yet.', 'That would be great. I really don\'t need two of everything, there\'s nowhere to put them.'],
			['One thing to check: is the delivery address the same on both? On {order2} it\'s slightly different; the house number is missing.', 'Oh, then definitely keep the first one, it has the right address. Cancel {order2}. I must have been rushing the second time.']
		],
		extras: [
			['For next time: if the page ever goes blank after paying, the confirmation email is the thing to check. It\'s sent the moment a payment succeeds, usually within a minute.', 'Noted. I panicked and didn\'t think to look.'],
			['I\'ve also checked that your bank was asked only once per order, so there\'s nothing else pending beyond the two payments you can see.', 'Thank you. Two is quite enough.']
		],
		note: ['Two orders, {order} and {order2}, identical {n} photos, paid nine minutes apart. Both show as sent to the lab. {order2} is missing the house number.', 'Same basket paid twice: {order} and {order2}. The second has no house number in the address.'],
		paste: ['charges'],
		charges: ['ok', 'ok-other'],
		fixed: [['s', 'The lab hadn\'t started {order2}, so I\'ve cancelled it and refunded it in full: {total}, reference {refund}. {order} is printing as normal and should be with you in a few days.'], ['c', 'Thank you, that\'s a relief.']],
		owe: 'ask the lab to pull {order2} before it prints, and refund it in full as soon as they confirm',
		done: 'The lab pulled {order2} before printing, and I\'ve refunded it in full: {total}, reference {refund}.',
		wait: 'check the delivery address on {order} in your account and tell me if anything else needs changing before it prints',
		pass: ['the print lab', 'try to stop {order2} before it\'s printed and tell us whether they were in time']
	},
	{
		id: 'pending-hold',
		subjects: ['Charged twice?', 'Two payments showing on my card', 'Why have you taken the money twice'],
		opens: [
			'My banking app shows two payments to Fennel Prints, both {total}. I only got one confirmation email. Have I been charged twice?',
			'There\'s a payment and a \'pending\' one for the same amount on my card. The first time I tried to pay it said it had failed, so I tried again and it worked. But it looks as though you\'ve taken it twice.',
			'I\'ve been charged {total} twice for one order. One of them says pending. I\'d like the second one cancelled straight away, please, as it\'s taken me close to my overdraft.'
		],
		turns: [
			['Sorry for the worry. Could you tell me which of the two shows as pending, if either, and the last four digits of the card?', 'One says pending, one doesn\'t. Card ending {last4}. Here\'s the screen:'],
			['Thanks, that helps a lot. Only one payment was actually taken for {order}: the second attempt. The first attempt was approved by your bank but never completed, so we never took the money. What you\'re seeing is a temporary hold your bank placed while the first attempt was in progress. It isn\'t a charge, and the bank releases it by itself.', 'So I don\'t need to do anything? When does it go? It\'s reducing what I can spend.'],
			['Nothing to do. Most banks release a hold like this within five working days, some take up to seven. If it\'s still there after that, tell me and I\'ll send you a letter confirming we cancelled the first attempt, which your bank will accept.', 'OK. I\'ll keep an eye on it and shout if it\'s still there next week.']
		],
		extras: [
			['I can\'t release the hold from our side, unfortunately, because the money never reached us; it\'s only set aside in your account by the bank.', 'That\'s annoying, but I understand.'],
			['If your bank asks, the attempt that was cancelled was on {date}, a few minutes before the one that went through.', 'OK, I\'ll write that down in case I need to ring them.']
		],
		customerPaste: 'statement',
		note: ['{order}: first attempt authorised, then voided when 3-D Secure didn\'t complete; second attempt succeeded. One capture only. The pending line is the voided authorisation.', 'One capture only on {order}. The earlier authorisation was voided the same minute.'],
		paste: ['charges'],
		charges: ['void', 'ok'],
		fixed: [['c', 'The pending one disappeared this morning. Panic over, thank you.'], ['s', 'Great, thanks for letting me know. Enjoy the prints.']],
		owe: 'send you a letter confirming we cancelled the first attempt, for your bank in case the hold hasn\'t gone by next week',
		done: 'Attached is a letter confirming that the first attempt on {order} was cancelled and the money never taken. Your bank should release the hold when they see it.',
		wait: 'let me know if the pending amount is still there after seven working days',
		pass: ['Tillpoint, our payment provider', 'confirm to your bank directly that the first attempt was cancelled']
	},
	{
		id: 'wrong-amount',
		subjects: ['Charged more than I expected', 'Wrong amount taken', 'Overcharged?'],
		opens: [
			'I ordered {n} prints and expected to pay about {expected}, but I\'ve been charged {total}. Can you tell me why? I didn\'t add anything extra as far as I know.',
			'The amount that came off my card for {order} is a lot more than I worked out. I think I\'ve been overcharged. I did the sum twice.',
			'Could you check order {order}? The total seems far too high for {n} prints at {size}. I\'m worried I\'ve been charged for someone else\'s photos.'
		],
		turns: [
			['Sorry for the confusion. Could you tell me how many prints you meant to order, and at what size?', '{n}, all {size}, {finish}. Nothing fancy, no borders or anything.'],
			['Thank you. Looking at {order}, there were {nplus} prints in the basket when you paid, not {n}. {extra} of them were photos added on an earlier visit, on {oldvisit}, that stayed in the basket. They were printed with the rest.', 'Oh no. I did start an order back then and gave up. I didn\'t realise they\'d still be sitting there.'],
			['The basket keeps photos for 30 days, which is meant to help but clearly didn\'t here. They\'re already printed, so they\'ll arrive with the others.', 'I don\'t want them, they\'re the blurry ones I\'d decided against. Can I have a refund for those, at least?']
		],
		extras: [
			['The basket page does show the total count above the photos, but when there are a lot of them it\'s easy to scroll past it, especially on a phone.', 'I was on the tablet, and I just pressed Pay without looking up.'],
			['To reassure you, every photo in the order is yours: the earlier ones were uploaded from the same account.', 'That\'s something. I did wonder if I\'d got someone else\'s.']
		],
		note: ['{order}: basket had {nplus} prints at payment, {extra} of them uploaded on an earlier visit. The charge matches the basket exactly.', 'Charge on {order} is right for {nplus} prints; {extra} were left over from a basket started weeks earlier.'],
		paste: ['timeline'],
		events: ['upload-old', 'upload', 'paid', 'lab'],
		fixed: [['s', 'As a one-off I\'ve refunded the {extra} prints you didn\'t mean to order: {partial}, reference {refund}. They\'ll still be in the parcel, so feel free to recycle them.'], ['c', 'That\'s very fair, thank you.']],
		owe: 'refund the {extra} leftover prints as a goodwill gesture once the order has been dispatched',
		done: 'The order was dispatched this morning, so I\'ve refunded the {extra} leftover prints: {partial}, reference {refund}.',
		wait: 'tell me which of the leftover photos you didn\'t want, so I can work out the refund',
		pass: ['our accounts team', 'approve a goodwill refund for the leftover prints, as it\'s more than I can refund myself']
	},
	{
		id: 'currency-fee',
		regions: ['us', 'eu'],
		subjects: ['Charged in pounds, not {cur}', 'Foreign transaction fee?', 'Why was I charged in GBP?'],
		opens: [
			'I live in {country} and I was charged in pounds, and my bank added a foreign transaction fee of {fee}. I thought your site showed me prices in {cur}. Why did it charge in pounds?',
			'My statement shows a payment in GBP and then a separate fee from my bank. I thought I was paying in {cur}. Can you explain? It\'s not a lot, but it\'s annoying.',
			'I ordered prints to be sent to me in {country}. I\'ve now been charged in British pounds, plus a fee from my bank. Nobody said I\'d be paying in pounds.'
		],
		turns: [
			['Sorry for the confusion. Could you send me what your statement shows for the payment, with the card number hidden?', 'Here you go:'],
			['Thank you. {order} was paid in pounds, {gbp}. Checkout charges in the currency chosen at the top of the basket page, and on your order it was set to GBP. It stays on pounds unless you change it, which I agree isn\'t obvious.', 'I never saw any currency option. Where is it? I\'d have changed it if I\'d known.'],
			['It\'s a small drop-down next to the basket total, with GBP, EUR, USD, JPY and KRW. If you pick {cur}, the card is charged in {cur} and your bank shouldn\'t add the foreign transaction fee, though that depends on the card.', 'Well, it\'s done now. Can you refund the fee? It seems fair, given how hidden the option is.']
		],
		extras: [
			['The conversion itself was done by your bank at their rate on the day, so the amount in {cur} on your statement isn\'t something we set.', 'Understood. The rate looked about right, it\'s mostly the fee that bothers me.'],
			['Delivery to {country} is included in that total, at the same flat rate whichever currency you pay in.', 'OK, good to know.']
		],
		customerPaste: 'statement',
		note: ['{order} charged in GBP ({gbp}). The card was issued in {country}; the currency drop-down was left on GBP.', 'Payment on {order} was in GBP. The fee is the card issuer\'s, not ours.'],
		paste: ['charges'],
		charges: ['ok-gbp'],
		fixed: [['s', 'As a gesture I\'ve refunded {fee} to cover the fee your bank charged (reference {refund}). For next time, the currency drop-down is next to the basket total.'], ['c', 'Thanks, I appreciate that. I\'ll remember the drop-down.']],
		owe: 'refund the equivalent of your bank\'s fee as a one-off and send you the reference',
		done: 'I\'ve refunded {fee} to cover the fee, reference {refund}.',
		wait: 'send me the line from your statement that shows the fee, so I refund the right amount',
		pass: ['our accounts team', 'decide whether we can cover the fee, since it was charged by your bank and not by us']
	},
	{
		id: 'receipt-minor-unit',
		regions: ['jp', 'kr'],
		subjects: ['Wrong amount on receipt', 'Receipt says {receiptamt}?', 'Was I charged the right amount?'],
		opens: [
			'My receipt for order {order} says {receiptamt}, but my card statement says {total}. Which is correct? I do not want to be charged again later.',
			'The receipt email shows {receiptamt}. That cannot be right for {n} prints. Is there a mistake? I need to keep receipts for my records.',
			'Hello. I received the receipt for my order and the amount is very small, {receiptamt}. My card was charged {total}. Please explain the difference.'
		],
		turns: [
			['Thank you for pointing this out. Could you tell me the amount on your card statement for the payment?', 'My statement shows {total}. Here is the receipt:'],
			['Thank you. The payment of {total} is correct, and it is the only payment for {order}. The receipt is wrong: for currencies without smaller units, like yen and won, it shows the amount as if it had two decimal places, so {total} appears as {receiptamt}. Nothing more will be charged.', 'I see. Can you send me a correct receipt? I need it for my records, and my accountant will ask.'],
			['Of course. I\'ve also reported the receipt problem so it gets fixed for everyone.', 'Thank you. It was a little alarming to see.']
		],
		extras: [
			['The prints were priced in {cur} correctly at checkout, so the basket total you saw was the amount charged.', 'Yes, the basket showed {total}. It was only the receipt that confused me.'],
			['I\'m sorry we didn\'t catch this sooner. You\'re not the first customer paying in {cur} to notice it.', 'It is fine. I only wanted to be sure.']
		],
		customerPaste: 'receipt',
		note: ['{order}: charged {total}, which is right. The receipt shows {receiptamt}: it divides every amount by 100, including {cur}, which has no minor unit. Reported to the engineers.', 'Receipt problem again for {cur}: {receiptamt} shown for a {total} payment. The charge itself is fine.'],
		paste: ['charges'],
		charges: ['ok'],
		fixed: [['s', 'I\'ve attached a corrected receipt showing {total}. Sorry for the confusion.'], ['c', 'Received, thank you.']],
		owe: 'send you a corrected receipt by email once our accounts team has produced it',
		done: 'The corrected receipt for {order}, showing {total}, is attached.',
		wait: 'tell me the name and address that should appear on the corrected receipt',
		pass: ['our engineers', 'fix how receipts show amounts in {cur}; the payment itself is correct']
	},
	{
		id: 'vat-invoice',
		regions: ['uk'],
		sizes: ['A4', '10x8', '7x5'],
		count: [20, 80],
		subjects: ['VAT invoice needed', 'Invoice with our company details', 'Receipt for expenses'],
		opens: [
			'We ordered prints for a property brochure ({order}, {total}) and our accountant needs a proper VAT invoice with our company name and address and your VAT number. The receipt email has none of that.',
			'Could you send a VAT invoice for order {order}, please? It\'s for {company}, and I\'m claiming it back. The receipt doesn\'t show the VAT separately.',
			'I\'m the office manager at {company}. We placed order {order} last week and I need an invoice made out to the company, not to me personally, for our records.'
		],
		turns: [
			['Happy to help. Could you send me the company name and address exactly as they should appear, and a VAT number if you have one?', '{company}, {address}. VAT number {vatno}.'],
			['Thank you. The receipt email is only a payment confirmation, so invoices are made up by hand. It\'s usually done the same day.', 'OK. Could you also add our purchase order number, {po}? Accounts won\'t pay anything without it.'],
			['Yes, I can put the PO number on it.', 'Great. Sorry to be a pain, our accounts department is very particular about these things.']
		],
		extras: [
			['The invoice will show the VAT on the prints and on delivery separately, which is usually what accountants want.', 'Perfect, that\'s exactly what they asked for.'],
			['If you order regularly for the business, I can note it on your account so an invoice is sent automatically with each order.', 'That would save me chasing it every time. Yes please.']
		],
		note: ['{order}: paid {total}. Needs a VAT invoice to {company}, PO {po}.', 'Invoice request for {order}; their accounts won\'t take the receipt email.'],
		paste: ['charges'],
		charges: ['ok'],
		fixed: [['s', 'The VAT invoice for {order} is attached, made out to {company}, with PO {po} on it.'], ['c', 'Perfect, thanks. Forwarded to accounts.']],
		owe: 'send the VAT invoice, with the PO number on it, as soon as accounts have made it up',
		done: 'Attached is the VAT invoice for {order}, made out to {company}, with PO {po}.',
		wait: 'confirm the purchase order number, as the one in your last email has a digit missing',
		pass: ['our accounts team', 'make up the VAT invoice and email it to you directly']
	},
	{
		id: 'cancel-wrong-size',
		sizes: ['7x5', '6x6', '10x8'],
		subjects: ['Wrong size ordered', 'Please cancel my order', 'Can I change my order?'],
		opens: [
			'I\'ve just realised I ordered all {n} prints at {size} instead of 6x4. They\'re for an album with 6x4 slots. Can you cancel the order before it\'s printed?',
			'Please cancel order {order}. I chose the wrong size by mistake, {size} instead of 6x4. I\'ll place a new one with the right size as soon as I hear back.',
			'I\'ve made a mistake with my order and need to change it urgently. The size should have been 6x4, but I\'ve ordered {size}. Is it too late?'
		],
		turns: [
			['I\'ll check with the lab straight away to see whether it\'s been printed yet.', 'Thank you, please hurry! I only noticed when I read the confirmation email.'],
			['The order went to the lab this morning. They print in batches through the day, so it may or may not have been started. I\'ve asked them to hold it while we sort this out.', 'Thank you. If it\'s too late, can I at least change the size?'],
			['If it has been printed, I can\'t change it, I\'m afraid, but you\'d keep the prints, and I\'d see what we can do on the price of a new order.', 'OK, understood. I\'ll wait to hear what the lab says.']
		],
		extras: [
			['If the lab can stop it, the refund goes back to the same card, usually within three to five working days.', 'That\'s fine, I\'m not in a rush for the money.'],
			['For the new order, 6x4 is the first option in the size list on the basket page; {size} is a couple below it.', 'I think I just tapped the wrong one on my phone.']
		],
		note: ['{order}: at the lab since this morning. Asked them to hold it.', 'Cancellation request on {order}, {n} at {size}. Lab asked to hold.'],
		paste: ['lab'],
		lab: 'held',
		fixed: [['s', 'Good news: the lab caught {order} before it printed, so it\'s cancelled and refunded in full ({total}, reference {refund}). You can place the new order at 6x4 whenever you like.'], ['c', 'Brilliant, thank you so much.']],
		owe: 'refund the order in full as soon as the lab confirms it has been pulled',
		done: 'The lab confirmed {order} was pulled before printing, and I\'ve refunded it in full: {total}, reference {refund}.',
		wait: 'let me know whether you\'d like a full refund or the same photos reprinted at 6x4',
		pass: ['the print lab', 'stop the job if they can and confirm whether it had already been printed']
	},
	{
		id: 'refund-not-arrived',
		subjects: ['Refund not received', 'Where is my refund?', 'Still waiting for a refund'],
		opens: [
			'I was told on {date0} that I\'d get a refund of {partial} for order {order}. It\'s been {days} days and there\'s nothing on my statement.',
			'Your colleague said my refund for {order} had been done, but it hasn\'t appeared. What is going on? I\'ve checked every day.',
			'Still no refund. I was promised {partial} back nearly two weeks ago. I\'m beginning to think it was never sent.'
		],
		turns: [
			['Sorry for the wait. Could you confirm which card the original payment was on (the last four digits)? Refunds go back to the same card.', 'Card ending {last4}. It\'s the only one I\'ve ever used with you.'],
			['Thank you. The refund of {partial} was issued on {date0}, and Tillpoint, our payment provider, shows it as sent to your bank. It has a reference number banks use to trace it: {arn}. Some banks take up to ten working days to show a refund, and they often show it as a separate credit rather than next to the payment.', 'Ten days? It\'s my money. You took it in seconds.'],
			['I agree it\'s slow, and it\'s frustrating that we can\'t speed it up from here. Giving the reference to your bank usually gets it found quickly.', 'I\'ll ring them tomorrow, then.']
		],
		extras: [
			['It might also be worth checking a few days either side of {date0}, as some banks date the credit when they process it rather than when we sent it.', 'I\'ll look again tonight.'],
			['If the card has been replaced since you paid, the refund still reaches the account; banks pass it on to the new card.', 'No, it\'s the same card.']
		],
		note: ['Refund on {order} for {partial} issued {date0}, succeeded, ARN {arn}.', '{order}: the refund succeeded on Tillpoint\'s side days ago. Gave the customer the ARN.'],
		paste: ['charges'],
		charges: ['ok', 'refund'],
		fixed: [['c', 'Found it! It was there all along, as a separate line on a different date, like you said. Sorry for the hassle.'], ['s', 'No need to apologise, statements make it confusing. Glad it\'s turned up.']],
		owe: 'ask Tillpoint to trace the refund if your bank still can\'t see it by {weekday}, and tell you what they find',
		done: 'Tillpoint\'s trace shows the refund reached your bank two days after we sent it; their confirmation is attached in case the bank needs it.',
		wait: 'give the reference {arn} to your bank and ask them to trace the refund',
		pass: ['Tillpoint, our payment provider', 'trace the refund with your bank using the reference']
	},
	{
		id: 'duplicate-uploads',
		count: [16, 40],
		subjects: ['Got two of every photo', 'Duplicates in my order', 'Refund for duplicate prints?'],
		opens: [
			'My prints arrived and I\'ve got two of every photo, {n} prints instead of {half}. I must have uploaded them twice, but surely your system should have noticed?',
			'Half of my order is duplicates. I think the upload page added the same photos again when I went back a page. Can I get a refund for the extras?',
			'I\'ve just opened my prints and every single one is there twice. I definitely only chose each photo once.'
		],
		turns: [
			['Sorry about that, I can see how it could happen. Let me look at what was uploaded to {order}, and when.', 'Thanks. I\'m not angry, it just feels like money wasted.'],
			['I can see it now: the same {half} photos were uploaded twice, about ten minutes apart, with the same file names. We print exactly what\'s in the basket, and the basket showed all {n} at checkout, so the charge matched.', 'I suppose I should have checked the count. The basket page is very long on a phone.'],
			['It is, and you\'re not the first to say so. I\'ve passed the comment on to the people who look after the site.', 'Thank you.']
		],
		extras: [
			['It looks as though the upload page was opened a second time from the back button, which starts the selection again rather than continuing it.', 'That\'s exactly what I did. I wanted to add one more photo.'],
			['The duplicates are full quality, so if any would make nice gifts, they\'re no worse than the first set.', 'My sister might take a few, to be fair.']
		],
		note: ['{order}: the same {half} files uploaded twice, ten minutes apart. All {n} printed and charged.', 'Duplicate uploads on {order}: {half} files, each twice.'],
		paste: ['uploads'],
		uploads: 'dup',
		fixed: [['s', 'As a goodwill gesture I\'ve refunded the duplicate prints: {partial}, reference {refund}.'], ['c', 'That\'s kind of you, thank you. I\'ll check more carefully next time.']],
		owe: 'refund the duplicate prints as a goodwill gesture and send you the reference',
		done: 'I\'ve refunded the duplicates: {partial}, reference {refund}.',
		wait: 'tell me whether you\'d prefer the duplicates refunded or put towards your next order',
		pass: ['our accounts team', 'approve a goodwill refund for the duplicates']
	},
	{
		id: 'upload-heic',
		subjects: ['Photos won\'t upload from my iPhone', '\'Unsupported type\' error', 'Upload keeps failing'],
		opens: [
			'I\'m trying to upload photos from my iPhone and most of them fail with \'unsupported type\'. A few go through. They\'re all ordinary photos taken on the phone.',
			'Your upload page rejects nearly all my pictures. It says unsupported type. I\'ve used you before from my old phone without any trouble.',
			'Only some of my photos will upload. The rest say unsupported type. I\'ve tried on the phone and on my partner\'s laptop with the same photos.'
		],
		turns: [
			['Sorry about that. Could you tell me what phone you\'re using, and whether the photos that worked were different in any way (screenshots, or photos sent to you by someone else)?', 'iPhone 15. Now you mention it, the ones that worked were from my sister on WhatsApp. The ones I took myself all fail. Here\'s what it says:'],
			['That fits. Recent iPhones save photos in a format called HEIC to save space, and our upload page only takes JPEG, PNG and TIFF. Photos sent through WhatsApp are converted to JPEG on the way, which is why those worked.', 'So what do I do? I\'m not going to email myself {heic} photos.'],
			['Two easy options. On the iPhone, go to Settings, Camera, Formats and choose \'Most Compatible\', and new photos will be JPEG. For the ones you\'ve already taken, select them in Photos and save them to Files first; they\'re converted to JPEG on the way, and you can upload them from Files.', 'I\'ll try the Files way tonight.']
		],
		extras: [
			['If you\'ve ordered from an older phone before, it probably saved photos as JPEG, which is why this may be new to you.', 'My last phone was much older, yes.'],
			['The photos that did upload are safe in the basket, so you only need to add the others.', 'Good, I didn\'t fancy starting again.']
		],
		customerPaste: 'errors',
		note: ['{order}: {heic} of {n} uploads refused with 415 unsupported type, all image/heic. The rest are JPEG.', 'HEIC again: {heic} refused on {order}.'],
		paste: ['uploads'],
		uploads: 'heic',
		fixed: [['c', 'Saving them to Files first worked. All {n} are in the basket now and I\'ve paid. Thanks for the clear instructions.'], ['s', 'Great to hear. They\'ll go to the lab in the morning.']],
		owe: 'write the steps up with screenshots and email them to you this afternoon, then check {order} tomorrow to see whether everything has gone through',
		done: 'I checked {order} this morning: all {n} photos are in and the order is paid. Glad the guide helped.',
		wait: 'try saving the photos to Files first and uploading from there, and tell me if any still fail',
		pass: ['our engineers', 'look at accepting iPhone photos as they are; your order is attached to the request']
	},
	{
		id: 'upload-large',
		sizes: ['A4', '10x8'],
		count: [8, 30],
		subjects: ['Upload says \'too large\'', 'Can\'t upload my scans', 'File too big error'],
		opens: [
			'I\'ve scanned some old family slides at high resolution and the upload page says \'too large\' for most of them. They\'re around {mbmax} MB each. I want the best quality possible.',
			'My scanned photos won\'t upload. The error says too large. I don\'t want to make them worse quality to get them in.',
			'I spent a whole weekend scanning my parents\' slides and now your website won\'t take them. It says the files are too large. Surely bigger is better?'
		],
		turns: [
			['Thanks. Could you tell me the file type and roughly how big each file is?', '{ext} files, between {mbmin} and {mbmax} MB. I scanned them at 4800 dpi. This is what the page says:'],
			['That\'s the cause: the upload page takes files up to 50 MB each. At 4800 dpi a slide scan is far bigger than a print needs. For a 6x4 print, 1800 by 1200 pixels is plenty, and even an A4 print only needs about 3500 by 2500.', 'So I\'d lose quality?'],
			['Not in the print. Saving them at 1200 dpi, or as high-quality JPEGs, gives files of 10 to 30 MB that print just as well at these sizes. The extra detail in a 4800 dpi scan is finer than the paper can show.', 'I\'ll take your word for it. Let me re-save them.']
		],
		extras: [
			['Do keep the big scans as your archive copies, though. They\'re worth having; they\'re just more than a print can use.', 'Oh, I\'ll definitely keep them. That was a lot of work.'],
			['A few of your files were under the limit and uploaded fine, so those are already in the basket.', 'Ah, the smaller slides, I expect.']
		],
		customerPaste: 'errors',
		note: ['{order}: {big} uploads refused with 413 too large, each between {mbmin} and {mbmax} MB.', 'Big scans on {order}, {big} of them over the 50 MB limit.'],
		paste: ['uploads'],
		uploads: 'large',
		fixed: [['c', 'Re-saved them at 1200 dpi as you said and they all went in. Paid. Looking forward to seeing them.'], ['s', 'Lovely. They\'ll be with the lab tomorrow.']],
		owe: 'ask the lab to send me a photo of the first prints from your scans before they print the rest, so you can see the quality is right',
		done: 'The lab sent me a photo of the first prints from your scans and they look sharp; the rest printed this morning and are on their way.',
		wait: 're-save the scans at 1200 dpi, upload them again and tell me if any are still refused',
		pass: ['the print lab', 'tell you the best resolution for their printers']
	},
	{
		id: 'upload-tiff',
		sizes: ['10x8', 'A4', '7x5'],
		count: [10, 40],
		subjects: ['TIFF files rejected', 'Unsupported type on my scans', 'Can I upload TIFF?'],
		opens: [
			'I\'m a photographer and I always export TIFFs for printing. Your upload page says \'unsupported type\' for every one of them.',
			'My files are rejected with \'unsupported type\'. They\'re TIFFs from my scanner, about 30 to 45 MB each.',
			'Do you not accept TIFF files? None of mine will upload. Every other lab I\'ve used takes them.'
		],
		turns: [
			['Could you confirm the files end in .tif or .tiff, and roughly how big they are?', 'They\'re .tif, 30 to 45 MB each. Here\'s the list it shows me:'],
			['Thank you. At the moment the upload page takes JPEG and PNG only, so TIFF files are refused. Accepting TIFF is on the list, but I don\'t have a date I can promise.', 'That\'s a shame. Converting means losing quality, doesn\'t it?'],
			['PNG keeps every bit of detail, just like TIFF, so exporting as PNG loses nothing. If file size worries you, a high-quality JPEG looks the same in a print at these sizes.', 'I\'ll export as PNG, then.']
		],
		extras: [
			['Your files are comfortably under our 50 MB limit, so size won\'t be a problem once they\'re in a format we take.', 'That\'s something, at least.'],
			['If you export as PNG, keep the colour profile embedded; the lab uses it when printing.', 'I always do. Good to know they use it.']
		],
		customerPaste: 'errors',
		note: ['{order}: {big} uploads refused with 415, image/tiff. TIFF isn\'t accepted yet; it\'s on the engineers\' list.', 'TIFF refused on {order}, {big} files.'],
		paste: ['uploads'],
		uploads: 'tiff',
		fixed: [['c', 'PNGs uploaded fine and I\'ve paid for the order.'], ['s', 'Great, thank you. They\'ll be printed tomorrow.']],
		owe: 'check {order} myself once the PNGs are in and make sure every file has gone through to the lab',
		done: 'I\'ve checked {order}: all the PNG files are in, and the order went to the lab this morning.',
		wait: 'export the files as PNG and upload them again',
		pass: ['our engineers', 'add your request to the work on accepting TIFF files']
	},
	{
		id: 'upload-stall',
		count: [30, 80],
		subjects: ['Upload stuck', 'Photos won\'t finish uploading', 'Upload freezes partway'],
		opens: [
			'I\'m trying to upload {n} photos from my phone and it gets so far and then stops. It\'s been sitting at {pct}% for half an hour.',
			'Every time I upload, it stops partway through and I have to start again. I\'m on holiday and want to order prints before we get home.',
			'The upload bar moves for a bit and then just freezes. No error, nothing. I\'ve tried three times this evening.'
		],
		turns: [
			['Sorry about that. Which device and browser are you using, and are you on wifi or mobile data?', 'Android phone, Chrome. Hotel wifi, which isn\'t great, to be honest.'],
			['Thanks. On our side I can see some photos arrived and then nothing more. On a slow connection each photo takes a while, and if the phone\'s screen goes off, the browser often pauses the upload altogether.', 'The screen does go off, yes. I put the phone down while it works.'],
			['That\'s very likely it. Keep the screen on while it uploads (most phones let you lengthen the screen timeout in settings) and try batches of 20 or so. The photos already uploaded stay in the basket, so you only need to add the rest.', 'I\'ll try tonight when the wifi is quieter.']
		],
		extras: [
			['There\'s no error because nothing actually failed: the photos that arrived are complete and safe, and the rest simply never started.', 'That\'s reassuring. I thought they\'d all be corrupted.'],
			['If there\'s a laptop to hand, that\'s often more reliable for big batches, but the phone will be fine with a couple of changes.', 'Only the phone, I\'m afraid.']
		],
		note: ['{order}: {got} of {n} photos stored, then nothing. No errors; the uploads just stopped.', 'No failures on {order}; uploads simply stop after {got}.'],
		paste: ['uploads'],
		uploads: 'stall',
		fixed: [['c', 'Screen on and batches of 20 did the trick. All {n} are in and I\'ve paid.'], ['s', 'Great, thanks for letting me know. Enjoy the rest of your holiday.']],
		owe: 'keep the {got} photos already uploaded in your basket until you\'re home, past the usual 30 days if need be',
		done: 'I\'ve extended your basket, so the {got} photos stay put until you\'re back.',
		wait: 'try again with the screen kept on and smaller batches, and tell me how far it gets',
		pass: ['our engineers', 'look at why uploads stop when the phone\'s screen goes off']
	},
	{
		id: 'missing-capital-extension',
		count: [18, 48],
		subjects: ['Photos missing from my order', 'Not all my prints arrived', '{missing} prints missing'],
		opens: [
			'My prints arrived today but {missing} are missing. I ordered {n} and there are only {got} in the envelope. I\'ve counted three times.',
			'Some of my photos weren\'t printed. The ones of my granddaughter\'s birthday cake, which were the ones I wanted most.',
			'My order arrived short. A few photos simply aren\'t there, and they were in the basket when I paid, I\'m sure of it.'
		],
		turns: [
			['I\'m sorry. Could you tell me which photos are missing? The file names would help, or a description if you don\'t have them.', '{missingnames}. They were taken on my camera; the rest were from my phone.'],
			['Thank you. I can see all {n} photos in the order, and the payment covered all of them, so the missing ones should have been printed. I\'ve asked the lab to check their side.', 'Thank you. It\'s a bit worrying, they\'re important photos.'],
			['Of course. I\'ll come back to you as soon as I hear from them.', 'OK. I\'ll wait to hear.']
		],
		extras: [
			['The photos themselves are fine: they uploaded completely, and I can open them on our side.', 'Oh good, so they\'re not lost.'],
			['Please don\'t worry about the money side; anything you paid for that wasn\'t printed will be put right.', 'Thank you, it\'s really the photos I care about.']
		],
		note: ['{order}: all {n} stored. The missing ones are the only files whose names end in .JPG in capitals, and the lab\'s job shows {got} images received. Same as the two we had last month.', 'Lab received {got} of {n} for {order}. The {missing} not received are the camera files with .JPG in capitals.'],
		paste: ['uploads', 'lab'],
		uploads: 'upper',
		lab: 'short',
		fixed: [['s', 'I\'ve reprinted the {missing} missing photos and they went out first class this morning. They didn\'t reach the lab because of how the files were named, which we\'re fixing on our side.'], ['c', 'They\'ve just arrived. Thank you, they look lovely.']],
		owe: 'reprint the {missing} missing photos free of charge and post them first class',
		done: 'The {missing} missing prints went out first class this morning, free of charge.',
		wait: 'send me the {missing} missing photos by email as they are, so I can check them before they\'re reprinted',
		pass: ['the print lab', 'check why those {missing} files were left out of the job and reprint them']
	},
	{
		id: 'lab-mixup',
		subjects: ['Wrong photos in my envelope', 'These aren\'t my prints', 'Received someone else\'s order'],
		opens: [
			'I\'ve just opened my parcel and the prints are not mine. They\'re photos of a family I don\'t know, at what looks like a wedding. Where are my prints?',
			'The envelope had my name and address on it, but the photos inside are someone else\'s. I feel awful even looking at them. What should I do?',
			'I opened the parcel this morning expecting my holiday photos and found pictures of a stranger\'s birthday party. My name is on the envelope. What\'s happened?'
		],
		turns: [
			['I\'m so sorry. Thank you for letting us know straight away. Is there an order number on the packing slip inside?', 'The slip says {wrongorder}, not my order number.'],
			['Thank you, that confirms it: the lab put another customer\'s prints in your envelope, which means your prints have probably gone to them. I\'m talking to the lab now.', 'Oh dear. My photos are of my kids. I\'m not happy about a stranger having them.'],
			['I completely understand. The lab\'s packing station handles one order at a time, so this is rare, and they\'ll want to look into it carefully.', 'Please let me know what happens. I\'ll keep their photos safe in the meantime.']
		],
		extras: [
			['Please don\'t worry about having seen their photos; the other customer will be told what happened, and none of it is your fault.', 'Thank you. I put them straight back in the envelope.'],
			['The lab checks the order number on each envelope against the prints before sealing it, so I\'ve asked them how this got past that check.', 'I\'d like to know that too.']
		],
		note: ['{order} was packed with {wrongorder}\'s prints. The lab says both were packed at the same station within a minute of each other.', 'Mix-up at the lab: {order} and {wrongorder} swapped at packing.'],
		paste: ['lab'],
		lab: 'mixup',
		fixed: [['s', 'The lab has reprinted your order, and it went out yesterday by tracked post. The other customer has returned your prints unopened and the lab has destroyed them. A prepaid envelope is on its way for the prints you received.'], ['c', 'Thank you. Mine arrived this morning and they\'re perfect.']],
		owe: 'have your order reprinted and sent by tracked post at no cost, and send you a prepaid envelope for the prints you received',
		done: 'Your reprinted order went out by tracked post this morning, and the prepaid envelope for the other prints should arrive with it.',
		wait: 'post the other customer\'s prints back in the prepaid envelope when it arrives',
		pass: ['the print lab', 'reprint your order, sort out the swap with the other customer and contact you directly']
	},
	{
		id: 'never-uploaded',
		count: [24, 60],
		subjects: ['Missing prints', 'Some photos not printed', 'My order is incomplete'],
		opens: [
			'I ordered {n} prints and only got {got}. I\'ve been through them twice. You\'ve charged me for {n}!',
			'Several photos from my order are missing, including the group photo, which is the one everyone wanted.',
			'Your lab has lost some of my photos. I uploaded {n} and only {got} arrived.'
		],
		turns: [
			['I\'m sorry to hear that. Could you tell me how many you expected and how many arrived? I\'ll check what the lab received.', 'I selected {n} on my phone. {got} came.'],
			['Thank you. I\'ve checked {order}: there are {got} photos in it, and you were charged for {got}, {total}. So it looks as though the other {missing} never made it into the basket. When photos are picked on a phone, any that fail to upload are left out, and the basket count drops to match.', 'But I selected them all! I\'m sure I did.'],
			['I believe you. It usually happens when the connection drops for a moment, and the page shows a small warning that\'s easy to miss. The good news is you weren\'t charged for the missing ones.', 'Hmm. Well, I suppose that\'s something.']
		],
		extras: [
			['The photos that did arrive are the ones in the order, all printed and all charged; nothing was dropped at the lab.', 'So it\'s at my end, not yours.'],
			['If you can find the missing ones on your phone, they\'ll still be at full quality; nothing is lost on the phone itself.', 'They should be there, I never delete anything.']
		],
		note: ['{order}: {got} photos stored and charged for {got}. The other {missing} didn\'t finish uploading from the phone. The charge is right.', 'Only {got} on {order}; the customer thought {n}. Basket count at payment was {got}.'],
		paste: ['timeline'],
		events: ['upload', 'paid', 'lab', 'dispatched'],
		fixed: [['c', 'I\'ve found the group photo and the others in a different album on my phone, which is why they didn\'t go. I\'ve uploaded them as a new order. Sorry!'], ['s', 'No problem at all, I\'m glad you found them. The new order is with the lab.']],
		owe: 'waive the delivery charge on a new order for the {missing} missing photos, and set that up on your account today',
		done: 'Free delivery is now set up on your account for your next order. Upload the {missing} photos as usual and it will apply at checkout.',
		wait: 'upload the {missing} missing photos as a new order and tell me its number, so I can refund the delivery charge',
		pass: ['the print lab', 'double-check whether any more files reached them for {order}']
	},
	{
		id: 'quality-dark',
		subjects: ['Prints are too dark', 'Prints don\'t match my screen', 'Disappointed with print quality'],
		opens: [
			'My prints have arrived and they\'re much darker than the photos on my phone. Faces are almost in shadow. I\'m really disappointed.',
			'The colours on my prints look muddy and dark compared with the originals. Is something wrong with your printers?',
			'I\'m disappointed with my prints. They\'re dull and dark, nothing like the photos I took.'
		],
		turns: [
			['I\'m sorry they\'re not what you hoped. Could you send a photo of one of the prints next to the same picture on your screen? It helps the lab see what you see.', 'Attached. You can see the difference, especially in the faces.'],
			['Thank you, that\'s really useful. Looking at the files you uploaded, they are on the dark side; phone screens are very bright and lit from behind, which makes photos look lighter than they print on paper. The lab prints files as they are, without brightening, unless \'auto-enhance\' is ticked on the basket page.', 'Nobody told me that. I didn\'t see any auto-enhance option.'],
			['It\'s under the size options, and it\'s off unless you tick it, because some people want their files left exactly as they are. I agree it could be more obvious.', 'Well, what can you do about these ones?']
		],
		extras: [
			['For what it\'s worth, the lab\'s check flagged some of your files as dark before printing, which matches what you\'re seeing.', 'Interesting. So it\'s the files, not the printer.'],
			['If you\'d like to check a photo before ordering in future, turning your phone\'s screen brightness down to about half gives a fair idea of how it will print.', 'I\'ll try that next time.']
		],
		note: ['{order}: the files are underexposed; the lab\'s check flagged {flag} of {n} as dark. Auto-enhance was off. Printed to profile.', 'Lab says the prints match the files on {order}. Auto-enhance off.'],
		paste: ['lab'],
		lab: 'checked',
		fixed: [['s', 'I\'ve had the lab reprint the {flag} darkest photos with auto-enhance on, free of charge. They went out today.'], ['c', 'They arrived and they\'re much better, thank you.']],
		owe: 'have the {flag} darkest photos reprinted with auto-enhance on, free of charge',
		done: 'The {flag} reprints with auto-enhance went out first class this morning.',
		wait: 'tell me which photos you\'d like reprinted with auto-enhance on',
		pass: ['the print lab', 'check the prints against your files and suggest which ones would benefit from a reprint']
	},
	{
		id: 'quality-crop',
		sizes: ['6x4', '7x5'],
		subjects: ['Heads cut off in my prints', 'Photos cropped badly', 'Prints are cropped'],
		opens: [
			'Half my prints have the tops of people\'s heads cut off. The photos on my phone show everything. Why have you cropped them?',
			'My photos have been trimmed at the edges. In the group ones, the people at each end are missing an arm.',
			'Lots of my prints have bits missing at the edges. Is this normal?'
		],
		turns: [
			['Sorry about that. Were the photos taken on a phone, and did you choose {size} as the size?', 'Yes, on my phone, and yes, {size}.'],
			['That explains it. Most phones take photos in a squarer shape than a {size} print, so to fill the paper the lab trims a strip off the top and bottom, or the sides. The basket page shows a preview of the crop for each photo, but it\'s small.', 'I didn\'t look at the preview. Can I have them printed without cropping?'],
			['Yes: tick \'fit to print\' on the basket page and the whole photo is printed, with a thin white strip on two sides instead of trimming.', 'I\'d much rather have white strips than lose heads.']
		],
		extras: [
			['Photos taken in the phone\'s widescreen setting are cropped even more, so if any were taken that way, they\'ll have lost the most.', 'A few might have been. I fiddle with the settings.'],
			['The white strips with \'fit to print\' are thin, a few millimetres on a {size}.', 'That sounds fine.']
		],
		note: ['{order}: {cropped} of {n} are 4:3, printed at {size} with a fill crop. The crop preview was shown at checkout.', '4:3 phone photos on {order}, cropped to fill; {cropped} affected.'],
		paste: ['uploads'],
		uploads: 'crop',
		fixed: [['s', 'I\'ve had the {cropped} cropped ones reprinted with \'fit to print\' at no charge; they\'re in the post.'], ['c', 'They\'ve come, and everyone has their head. Thank you!']],
		owe: 'reprint the {cropped} cropped photos with \'fit to print\' at no charge',
		done: 'The {cropped} photos have been reprinted with \'fit to print\' and posted this morning.',
		wait: 'tell me which of the photos you\'d like reprinted without cropping',
		pass: ['the print lab', 'reprint the cropped photos and check the white strips look right on them']
	},
	{
		id: 'quality-lowres',
		subjects: ['Blurry prints', 'Prints are fuzzy', 'Poor quality prints'],
		opens: [
			'Most of my prints look fine, but about a dozen are blurry and blocky. Very poor quality.',
			'Some of the prints look as though they\'ve been blown up from tiny pictures. They\'re fuzzy and you can see little squares.',
			'A number of my prints are pixelated. Is your printer faulty?'
		],
		turns: [
			['Sorry about that. Do you know where the blurry ones came from? Were they taken on your own phone, or sent to you through a messaging app or downloaded from social media?', 'Some were sent by my cousin on WhatsApp, now you mention it.'],
			['That will be it. Messaging apps shrink photos a lot to send them quickly. The {lowres} photos that came out blurry are about {px} pixels wide, which is too small for a sharp {size} print. The basket page shows a small warning triangle on photos like that.', 'I did see some triangles but didn\'t know what they meant.'],
			['If your cousin can send the originals another way (by email, or a shared album), they\'ll print sharply.', 'I\'ll ask her.']
		],
		extras: [
			['The rest of your order printed sharply, which shows the printer is fine; it\'s only the small files that suffered.', 'Yes, the ones from my own phone are lovely.'],
			['Screenshots of photos have the same problem, so they\'re worth avoiding too.', 'A couple might have been screenshots from Facebook.']
		],
		note: ['{order}: {lowres} uploads under 1000 px wide; the low-resolution warning was shown. Printed as uploaded.', 'Low-resolution files on {order}: {lowres} of them, around {px} px.'],
		paste: ['uploads'],
		uploads: 'lowres',
		fixed: [['c', 'My cousin sent the originals by email. I\'ve reordered those and the new ones are lovely and sharp.'], ['s', 'That\'s great to hear. Thanks for letting me know.']],
		owe: 'refund the {lowres} blurry prints, since the warning clearly wasn\'t clear enough',
		done: 'I\'ve refunded the {lowres} blurry prints: {partial}, reference {refund}.',
		wait: 'ask your cousin for the original photos and upload them as a new order',
		pass: ['our engineers', 'make the low-resolution warning on the basket page clearer, using your order as an example']
	},
	{
		id: 'delivery-late',
		subjects: ['Order not arrived', 'Where are my prints?', 'Still waiting for delivery'],
		opens: [
			'I ordered on {date0} and nothing has arrived. It\'s now been {days} days. The photos are for {occasion} on {weekday}.',
			'My order {order} still hasn\'t come. The tracking hasn\'t changed for days.',
			'My prints haven\'t arrived and I\'m getting worried. They were dispatched days ago, according to your email.'
		],
		turns: [
			['Sorry for the wait. Could you send me what the tracking page shows? I\'ll check it against the lab\'s records.', 'Here\'s what it says:'],
			['Thanks. The lab dispatched it on {disp}, and the last scan was at the {depot} delivery office on {lastscan}. That usually means it\'s about to go out, but it shouldn\'t have taken this long.', 'It\'s for {occasion}. I need them by {weekday}.'],
			['I understand. If it doesn\'t arrive by tomorrow, we can reprint and send it by next-day delivery at no cost to you.', 'OK. I\'ll let you know.']
		],
		extras: [
			['The lab packed and dispatched it within two days of your order, which is normal, so the delay is in the post.', 'That\'s what I suspected.'],
			['If the first parcel turns up after a replacement has gone out, keep both; we won\'t ask for it back.', 'That\'s generous, thank you.']
		],
		customerPaste: 'tracking',
		note: ['{order}: dispatched {disp}, {tracking}. Last scan at the {depot} delivery office on {lastscan}.', 'Parcel for {order} sitting at {depot} since {lastscan}.'],
		paste: ['lab'],
		lab: 'dispatched',
		fixed: [['c', 'It came this morning! The postman said there\'d been a backlog at the depot.'], ['s', 'Phew. Glad they arrived in time.']],
		owe: 'reprint the order and send it by next-day delivery at no cost',
		done: 'The reprint went out by next-day delivery this afternoon; the tracking is on its way to you by email.',
		wait: 'check with your neighbours and your local delivery office, since the tracking now shows it as delivered',
		pass: ['the courier', 'trace the parcel from the {depot} delivery office']
	},
	{
		id: 'delivery-address',
		regions: ['uk'],
		subjects: ['Parcel being returned?', 'Order sent back', 'Delivery failed'],
		opens: [
			'My tracking says the parcel is being returned to sender. Why? I was in all day.',
			'I\'ve had an email saying my order couldn\'t be delivered. What\'s happened?',
			'I\'ve had a notice that my parcel from you couldn\'t be delivered and is going back. I\'m confused, my address is right on my account.'
		],
		turns: [
			['Sorry about this. Could you confirm your full delivery address so I can compare it with the order?', '{address}. This is the tracking:'],
			['Thank you. On {order} the address was entered as {badaddress}, which the postal service couldn\'t match, so they\'re returning it to the lab.', 'Oh no, that\'s my fault. I must have rushed it.'],
			['Easily done. Once it\'s back at the lab it can go out again to the right address.', 'How long will that take?']
		],
		extras: [
			['Your account\'s saved address is correct; it was the address typed in for this order that was different.', 'I typed it in fresh on my phone, that\'ll be why.'],
			['To save it happening again, you can tick \'use my saved address\' on the basket page next time.', 'I\'ll do that.']
		],
		customerPaste: 'tracking',
		note: ['{order}: address typo, parcel returning to the lab. {tracking}.', 'Return to sender on {order}; the address was entered as {badaddress}.'],
		paste: ['lab'],
		lab: 'returning',
		fixed: [['s', 'The parcel came back to the lab yesterday and went out again this morning to the corrected address, at no extra cost.'], ['c', 'It arrived today. Thank you for being so helpful.']],
		owe: 'send the order out again to the corrected address as soon as it\'s back at the lab, at no extra cost',
		done: 'Your parcel went out again this morning to the corrected address.',
		wait: 'confirm the full address, including the house number, so I can update the order',
		pass: ['the print lab', 'resend the order to your corrected address once it\'s back with them']
	},
	{
		id: 'delivery-damaged',
		subjects: ['Prints arrived bent', 'Damaged in the post', 'Creased prints'],
		opens: [
			'The envelope was folded in half to get it through the letterbox, and the prints are all creased. {n} prints ruined.',
			'My order arrived damaged. Several prints are bent at the corners and one has a crease right across a face.',
			'My prints arrived in a terrible state. The envelope had been crammed into the letterbox.'
		],
		turns: [
			['I\'m sorry, that\'s not how they should arrive. Could you send a photo of the damaged prints and the envelope? It helps when we report it to the postal service.', 'Here you are. You can see the fold right across the middle.'],
			['Thank you. The envelope is clearly marked \'Do not bend\' and has a stiffener, so this happened in delivery. We\'ll put it right.', 'Thank you. They\'re the grandchildren\'s school photos, so I\'d like replacements.'],
			['Of course. Are all of them damaged, or only some?', 'Most of them. A few at the back of the pile are all right.']
		],
		extras: [
			['We report damaged parcels to the postal service so they can see a pattern, so your photos help beyond replacing these.', 'Happy to help.'],
			['If you\'re likely to be out, you can add a safe place note on the basket page, and larger parcels will be left there.', 'I\'ll do that next time.']
		],
		note: ['{order}: delivered {lastscan}, envelope folded in transit. The customer\'s photos show the crease.', 'Transit damage on {order}. Lab packed with a stiffener as usual.'],
		paste: ['lab'],
		lab: 'delivered',
		fixed: [['s', 'Your replacement prints went out yesterday in a box too large for a letterbox.'], ['c', 'They arrived in perfect condition. Thank you.']],
		owe: 'reprint the damaged prints and send them in a box rather than an envelope',
		done: 'The replacement prints went out this morning, in a box this time.',
		wait: 'tell me which prints you\'d like replaced, since some are fine',
		pass: ['the courier', 'look into the damage claim']
	},
	{
		id: 'voucher',
		regions: ['uk'],
		subjects: ['Voucher code not working', 'Gift voucher rejected', 'Discount code invalid'],
		opens: [
			'I was given a Fennel Prints gift voucher for my birthday and the code says \'not valid\' at checkout.',
			'The code on my voucher card won\'t work. It just says invalid.',
			'I\'ve been trying to use a gift voucher for a while and it keeps being rejected.'
		],
		turns: [
			['Sorry about that. Could you send me the code, and tell me where the voucher came from?', 'It\'s {voucher}. My aunt bought it, online I think, last year.'],
			['Thank you. I\'ve looked it up: it was bought on {vdate}, and our vouchers last 12 months, so it expired on {vexp}. That\'s why it says not valid.', 'Oh. I was only given it recently. That doesn\'t seem fair.'],
			['I understand. The expiry date is printed on the card, but I can see it reached you late.', 'Is there anything you can do?']
		],
		extras: [
			['The code itself is genuine and has never been used, so the full value is still there in our records.', 'Oh good, I was worried it had already been spent.'],
			['Vouchers can be used across several orders until the balance runs out, so you don\'t have to spend it all at once.', 'That\'s handy.']
		],
		note: ['Voucher {voucher}: bought {vdate}, expired {vexp}, never used, value {vvalue}.', 'Expired voucher {voucher}, {vvalue}, unused.'],
		paste: ['voucher'],
		fixed: [['s', 'I\'ve issued a new voucher for the same value, {vvalue}, valid for another 12 months: {voucher2}.'], ['c', 'That\'s very kind. Thank you!']],
		owe: 'issue a replacement voucher for {vvalue} and email it to you',
		done: 'Your replacement voucher, {voucher2}, for {vvalue}, is valid for 12 months from today.',
		wait: 'send a photo of the voucher card so I can check the code',
		pass: ['our accounts team', 'approve replacing the expired voucher']
	},
	{
		id: 'account-email',
		regions: ['uk'],
		subjects: ['Change my email address', 'Can\'t log in with my new email', 'Account email and old photos'],
		opens: [
			'I\'ve changed my email address and can\'t work out how to update it on my account. My old address will stop working soon.',
			'Please can you change the email on my account? I\'ve lost the password to my old email, so I can\'t log in.',
			'I\'d like to update my email address. I can\'t find where to do it in my account.'
		],
		turns: [
			['Happy to help. To check it\'s you, could you tell me the old email address, your postcode, and roughly when your last order was?', 'The old one was {oldemail}. Postcode {postcode}. Last order about {lastordermonth}.'],
			['Thanks, that all matches. I can change the address, and you\'ll get a confirmation link at the new one.', 'Great. And can you delete the photos from my old orders? I don\'t like them being kept.'],
			['We keep uploaded photos for 30 days after delivery so we can reprint anything that went wrong; older ones are already deleted. Your most recent order is just inside that window.', 'OK, delete those too, please.']
		],
		extras: [
			['Your order history stays with the account, so changing the email doesn\'t lose anything.', 'Good, I like being able to reorder old prints.'],
			['Once the address is changed, you\'ll sign in with the new email and your existing password.', 'OK, I remember the password at least.']
		],
		note: ['Account checks out (old email, postcode, last order in {lastordermonth}). One order still has photos held.', 'Email change request; details match.'],
		paste: ['account'],
		fixed: [['s', 'Done: the email on your account is now the new address, and the photos from your recent order are deleted. You\'ll have had a confirmation link.'], ['c', 'Got it, all working. Thanks.']],
		owe: 'change the email address and delete the photos from my side, so you don\'t need to do anything further',
		done: 'The email address on your account is changed, and the photos from your last order have been deleted.',
		wait: 'click the confirmation link I\'ve sent to your new address',
		pass: ['our engineers', 'change the address, as the account system wouldn\'t let me do it from the support side']
	},
	{
		id: 'bulk-order',
		regions: ['uk'],
		subjects: ['Bulk order for a school', 'Discount for a large order', 'Quote for {bulk} prints'],
		opens: [
			'I\'m the PTA secretary at {school} and we\'d like to order about {bulk} prints of the sports day photos for families. Do you offer a discount, and can we pay by invoice?',
			'We\'re a {club} and want to order around {bulk} prints for our anniversary exhibition. Is there a better price for that many?',
			'We\'re organising a big print order for a community event, roughly {bulk} prints. Do you do discounts for large orders?'
		],
		turns: [
			['Thanks for thinking of us. What sizes would you like, and do you need them by a particular date?', 'Mostly 6x4, perhaps 40 at 10x8 for the display. We need them in three weeks.'],
			['Thank you. Orders over 100 prints already get 15% off at checkout. For an order this size I can ask about a little more, and we can send an invoice so you can pay by bank transfer.', 'That would help. Our treasurer won\'t use a card.'],
			['Understood. I\'ll need a name and address for the invoice.', 'Make it out to me, {full}, at {address}. I\'ll pass it on to our treasurer.']
		],
		extras: [
			['The lab can usually turn round an order this size in four or five working days, so three weeks is comfortable.', 'That\'s good to hear, our last supplier was very slow.'],
			['If you\'d like the families\' prints packed in separate sets, the lab can do that for a small charge per set.', 'That would be wonderful, it would save us a whole evening of sorting.']
		],
		note: ['Bulk quote: about {bulk} at 6x4 and 40 at 10x8. Standard 15% applies; asked accounts about 20%.', 'Quote for {bulk} prints; invoice and bank transfer wanted.'],
		paste: ['quote'],
		fixed: [['s', 'I\'ve attached the quote at 20% off, with an invoice for bank transfer. Once it\'s paid, upload the photos and the discount applies automatically.'], ['c', 'Thank you, that\'s perfect. We\'ll pay this week.']],
		owe: 'send you a written quote and the invoice once accounts confirm the extra discount',
		done: 'The quote and invoice are attached, at 20% off.',
		wait: 'upload the photos when you\'re ready and tell me the order number so I can apply the discount',
		pass: ['our accounts team', 'send you the quote and invoice directly']
	}
];

// Generic parts.
const customerGreetings = ['Hi,', 'Hello,', 'Dear Fennel Prints,', 'Hi there,', 'Good morning,', 'Hello there,', 'To whom it may concern,', 'Hi team,'];
const replyGreetings = ['Hi {agent},', 'Hello {agent},', 'Thanks {agent},', 'Dear {agent},', 'Hi again,'];
/** Backstories; the index of the one that says it is a first order. */
const backstories = [
	'It\'s my first order with you. A friend recommended you after her holiday prints came out so well.',
	'The photos are from my daughter\'s wedding in {month} and I\'m making an album for each set of grandparents.',
	'I\'m putting together a memory board for my mum\'s 80th, which is on {weekday}.',
	'These are for a leaving display at work, so I\'m a bit pressed for time.',
	'They\'re photos of my late father\'s allotment, and they mean a great deal to the family.',
	'I order from you every couple of months and have never had a problem before.',
	'We\'ve just got back from three weeks in {place} and I want the photos printed before the memories fade.',
	'The prints are for our son\'s nursery, which asked every family for a few photos for the wall.',
	'I run a small bed and breakfast and these are for the guest rooms.',
	'I\'m a keen birdwatcher and these are the best of this year\'s shots.',
	'It\'s a surprise for my husband\'s retirement do next {weekday}.',
	'I scan old family photos as a hobby and print the best ones for relatives.',
	'Our dog died in the summer and these are the last photos of her.',
	'I\'m making a scrapbook of my granddaughter\'s first year.',
	'The photos are from our school reunion, forty years on.',
	'I teach art and these are photos of the pupils\' work for the end-of-term exhibition.',
	'These are of our new house, for the family who couldn\'t visit.',
	'My sister is getting married in {month} and I\'m making a \'how they met\' board.',
	'I\'ve been meaning to print our holiday photos for about five years and finally got round to it.',
	'These are for my dad, who doesn\'t use computers and likes photos he can hold.',
	'We had a big family get-together for my grandmother\'s 95th.',
	'I\'m a wedding photographer and I use you for proof prints.',
	'This is a present for my partner: photos of our first year together.',
	'I\'m on a photography course and the prints are for my portfolio.'
];
const customerAsides = [
	'I\'m not very good with computers, so please keep it simple.',
	'I\'ve tried your help pages but couldn\'t find anything about this.',
	'Please reply by email; I can\'t take calls at work.',
	'Sorry if this is the wrong place to ask.',
	'I\'d appreciate a quick reply, as the photos are needed soon.',
	'I did try the chat on the website but it said nobody was available.'
];
const customerContext = [
	'I\'m at work until six, so I won\'t be able to do anything before this evening.',
	'Sorry for the slow reply, it\'s been a hectic week with the kids.',
	'I\'m writing this on my lunch break.',
	'My daughter is helping me with the computer side of things.',
	'I\'ve been away for a couple of days, hence the delay.',
	'I\'m on the train, so excuse any typos.',
	'Thanks for replying so quickly.',
	'Sorry, I missed your email, it went into my spam folder.'
];
const colour = [
	'The photos are for my mum, who has been in hospital since {month}. I wanted something on her bedside table that isn\'t a get-well card.',
	'I\'ll be honest, I put this order off for months because choosing the photos made me emotional, so I\'d really like it to go smoothly now.',
	'We\'re travelling up to see family on {weekday}, so ideally I\'d have the prints before then, but I know that might not be possible.',
	'My daughter set up the account for me. She\'s at university now, so I\'m on my own with it.',
	'I used another company last year and the colours were awful, which is why I came to you. Your prints have always been lovely.',
	'This is the third time I\'ve sat down to do this order. Each time something else gets in the way.',
	'I\'ve got a stack of empty frames waiting on the dining table, so I\'m keen to get this sorted.',
	'I recommended you to two friends last month, so I\'d like to be able to tell them it all went well.',
	'My partner thinks I should just print them at the chemist, but I prefer your paper.',
	'The photos were taken by my brother, who lives abroad, and he asked me to get them printed for our parents.',
	'It isn\'t urgent, but it\'s been on my list for weeks and I\'d love to tick it off.',
	'We\'ve just had the living room redecorated and I\'m making a photo wall, so there are a lot of photos.',
	'I\'m seventy-eight and not very confident online, so I appreciate your patience.',
	'My granddaughter usually does this for me, but she\'s away on a school trip this week.',
	'I teach on Mondays and Tuesdays, so I\'m slow to reply on those days.',
	'Our printer at home gave up last year and we\'ve used you ever since.',
	'They\'re for a display at our local library, which is putting on an exhibition about the village in the 1970s.',
	'I\'m going into hospital for a small operation next week and wanted this done before then.'
];
const customerSignoffs = ['Thanks,\n{first}', 'Kind regards,\n{full}', '{first}', 'Many thanks,\n{full}', 'Best,\n{first}', 'Regards\n{full}', 'Cheers, {first}', '{full}\n\nSent from my phone'];
const agentGreetings = ['Hi {first},', 'Hello {first},', 'Dear {first},'];
const agentOpeners = [
	'Thanks for getting in touch, and I\'m sorry this has gone wrong.',
	'Thank you for writing in, and for all the detail.',
	'Sorry to hear about this. Let\'s get it sorted.',
	'Thank you for your email.',
	'I\'m sorry for the trouble, and thanks for bearing with us.',
	'Thanks for contacting Fennel Prints.'
];
const agentLateOpeners = ['Sorry for the slow reply; it\'s been a busy few days.', 'Apologies for the wait, we\'re catching up after the weekend.', 'Sorry it\'s taken a while to get back to you.'];
const agentClosers = [
	'If anything else comes up in the meantime, just reply to this email.',
	'I\'ll keep the ticket open while we sort this out.',
	'Any questions, just reply here and it comes straight back to me.',
	'Sorry again for the bother.',
	'Thanks for bearing with us.',
	'I hope that helps.'
];
const agentSignoffs = ['Best wishes,\n{agent}\nFennel Prints support', '{agent}\nFennel Prints', 'Kind regards,\n{agent}, Fennel Prints support', 'Thanks,\n{agent}'];
const holdReplies = ['I\'m looking into this now and will come back to you today.', 'Thanks, I\'ve got this. I need to check a couple of things and will reply properly this afternoon.', 'Just to say I\'ve picked this up and will be in touch shortly.'];
const chasers = ['Any news on this?', 'Hello, I haven\'t heard anything back. Could someone let me know what\'s happening?', 'Just following up on my email from {sentday}.', 'It\'s been a few days now. Is anyone looking at this?', 'Sorry to chase, but the photos are needed soon.'];
const handovers = ['{agent2} here: {agent} is away this week, so I\'ve picked up your ticket.', '{agent2} taking over from {agent}, who\'s off today. I\'ve read back through everything.', 'This is {agent2}; I\'m looking after {agent}\'s tickets for a few days.'];
const acks = ['Thank you.', 'Thanks for getting back to me.', 'Thanks, that\'s helpful.', 'OK, thanks.', 'Right, I see.'];
const tangents: [string, string][] = [
	['While I have you, do you print on canvas?', 'We only do photo prints at the moment, in gloss and matte, from 6x4 up to A4. No canvases, sorry.'],
	['Also, can I choose matte next time? The gloss ones show fingerprints.', 'Yes, the finish is chosen per order on the basket page, just under the sizes. Matte costs the same.'],
	['How long do you keep the photos I upload?', 'We keep uploaded photos for 30 days after the order is delivered, so we can reprint anything that goes wrong, and then delete them.'],
	['Can you send them gift wrapped? They\'re a present.', 'We don\'t gift wrap, but if you put the recipient\'s address as the delivery address, the parcel has no prices or receipt in it.'],
	['Is there a discount if I order regularly?', 'There\'s no loyalty scheme, but orders over 100 prints get 15% off automatically at checkout.'],
	['Can you make some of them black and white?', 'Not at the moment; the lab prints files as they are. Most phones can make a black-and-white copy in the photo editor before you upload.'],
	['Can I collect the order instead of having it posted?', 'Sadly not. The lab isn\'t open to the public, so everything goes by post.'],
	['Do you do photo books?', 'Not yet, only loose prints, I\'m afraid.'],
	['What paper do you use?', 'The lab prints on 250 g/m² photo paper, gloss or lustre matte.'],
	['Can I add a white border?', 'Yes: tick \'white border\' on the basket page; it applies to the whole order.'],
	['Could I send an order to my sister in Canada?', 'Yes, we post worldwide. Delivery outside the UK and EU is £9.50 and usually takes seven to twelve working days.'],
	['Is my card saved on your site? I\'d rather it wasn\'t.', 'No, we never store card details. The card form is handled by our payment provider and nothing is kept for next time.'],
	['How do I see my past orders?', 'Sign in and open Orders from the menu at the top right; every order since you opened the account is there.'],
	['Do you scan slides or negatives?', 'No scanning service, sorry. If you have scans already, we print from those.']
];
const owePromises = ['Here\'s what I\'ll do: I\'ll {owe}.', 'I\'ll {owe}, and let you know once it\'s done.', 'Leave it with me. I\'ll {owe}.', 'To put this right, I\'ll {owe}.'];
const oweThanks = ['Thank you, that\'s all I wanted.', 'OK, thanks. I\'ll look out for your email.', 'Great, thank you for sorting this.', 'That\'s fair. Thanks.'];
const pushbacks = ['Honestly, I\'ve spent long enough on this already. Can\'t you sort it out from your end?', 'I\'d really rather not have to do anything else myself. Is there anything you can do?', 'I\'ve done everything you asked. What happens now?'];
const didIt = ['I\'ve done that now.', 'Done, as you asked.', 'OK, that\'s done. Over to you.'];
const waitAsks = ['Could you {wait}? As soon as I have that, I can take it from there.', 'When you get a moment, please {wait}, and I\'ll pick it straight back up.', 'The next step is with you, I\'m afraid: could you {wait}?'];
const waitReplies = ['Will do, probably at the weekend.', 'OK, I\'ll do that when I get home.', 'Fine, I\'ll have a go tomorrow.'];
const nudges = ['Hi {first}, just checking whether you saw my last message.', 'Hello {first}, a quick nudge in case my last email went astray.'];
const closes = ['As I haven\'t heard back, I\'ll close this ticket for now. If you still need help, just reply to this email and it will reopen.', 'I haven\'t heard from you, so I\'m going to close this for now. Reply any time and it will come straight back to me.'];
const passLines = ['I\'ve passed this to {team}, who\'ll {pass}.', 'This needs {team}, so I\'ve handed it over: they\'ll {pass}.', 'I\'ve raised this with {team}; they\'ll {pass}.'];
const passFollowUps: [string, string][] = [
	['How long does that usually take?', 'Usually two or three working days. The reply will come to you on this ticket.'],
	['OK. Will they contact me, or will you?', 'I will: their answer comes to me, and I\'ll pass it on here. It rarely takes more than a week.'],
	['Fine. Do I need to do anything in the meantime?', 'Nothing needed from you for now; the answer will come through here.']
];
const bye = ['Thanks again.', 'Cheers.', 'Thank you, that\'s great.', 'Thanks for your help.'];

const fill = (text: string, values: Record<string, string>): string =>
	text.replace(/\{(\w+)\}/g, (_, key: string) => {
		const value = values[key];
		if (value === undefined) throw new Error(`no value for {${key}} in: ${text}`);
		return value;
	});

// Pasted output.
const CARD_BRANDS = ['visa', 'visa', 'mastercard', 'mastercard', 'amex'];
const DETAIL: Record<string, string> = {
	do_not_honor: 'do_not_honor',
	authentication_failed: '3ds: challenge expired',
	card_not_supported: 'card_not_supported',
	incorrect_postal_code: 'incorrect_postal_code',
	expired_card: 'expired_card'
};

interface Context {
	r: Rand;
	v: Record<string, string>;
	region: Region;
	currency: Currency;
	pounds: number;
	opened: number;
	paid: number;
	oldVisit: number;
	n: number;
	got: number;
	half: number;
	extra: number;
	missing: number;
	size: string;
	finish: string;
	order: string;
	brand: string;
	topic: Topic;
}

const col = (text: string, width: number) => text.padEnd(width);
const chargesPaste = (c: Context): string => {
	const { r } = c;
	const lines = [`Tillpoint dashboard · Payments · search "${c.order}"`, '', [col('Charge', 22), col('Created (UTC)', 21), col('Reference', 11), col('Amount', 13), col('Status', 11), col('Detail', 26), 'Card'].join('')];
	let t = c.paid - int(r, 2, 15) * (c.topic.charges!.filter((x) => x.startsWith('fail')).length || 1);
	const card = `${c.brand} ····${c.v.last4}`;
	for (const token of c.topic.charges!) {
		const amount = token === 'ok-gbp' ? coded('GBP', c.pounds) : coded(c.currency, c.pounds);
		const id = `ch_${chars(r, ALNUM, 16)}`;
		let row: string[];
		if (token.startsWith('fail:')) row = [id, isoSecond(t, r), c.order, amount, 'failed', DETAIL[token.slice(5)]!, card];
		else if (token === 'void') row = [id, isoSecond(t, r), c.order, amount, 'cancelled', 'authorised, then voided', card];
		else if (token === 'ok-other') row = [id, isoSecond(t + 9, r), c.v.order2!, amount, 'succeeded', 'captured', card];
		else if (token === 'ok-again') row = [id, isoSecond(t + 1, r), c.order, amount, 'succeeded', 'captured', card];
		else if (token === 'refund') row = [`re_${chars(r, ALNUM, 16)}`, `${c.v.date0iso} ${pad(int(r, 9, 16))}:${pad(int(r, 0, 59))}:${pad(int(r, 0, 59))}`, c.order, `-${c.v.partialcoded}`, 'succeeded', `refund, ARN ${c.v.arn}`, card];
		else row = [id, isoSecond(t, r), c.order, amount, 'succeeded', 'captured', card];
		lines.push([col(row[0]!, 22), col(row[1]!, 21), col(row[2]!, 11), col(row[3]!, 13), col(row[4]!, 11), col(row[5]!, 26), row[6]].join(''));
		t += int(r, 2, 9);
	}
	if (r() < 0.6) lines.push('', `Risk evaluation: ${pick(r, ['normal', 'normal', 'elevated (new card)', 'normal'])} · 3-D Secure: ${pick(r, ['requested', 'not requested', 'requested'])} · Customer IP country: ${c.region === 'uk' ? 'GB' : c.region === 'eu' ? pick(r, ['IE', 'DE', 'NL', 'FR']) : c.region === 'us' ? 'US' : c.region === 'jp' ? 'JP' : 'KR'}`);
	return '```text\n' + lines.join('\n') + '\n```';
};

const timelinePaste = (c: Context): string => {
	const { r } = c;
	const rows = ['| Time (UTC) | Event | Detail |', '| --- | --- | --- |'];
	const t = c.paid - int(r, 8, 40);
	for (const event of c.topic.events!) {
		if (event === 'upload-old') rows.push(`| ${isoMinute(c.oldVisit)} | photos uploaded | ${c.extra} photos, ${(c.extra * (1.6 + r() * 2)).toFixed(1)} MB (visit ended without payment) |`);
		else if (event === 'upload') {
			const count = c.topic.id === 'never-uploaded' ? c.got : c.n;
			rows.push(`| ${isoMinute(t)} | photos uploaded | ${count} photos, ${(count * (1.8 + r() * 2.4)).toFixed(1)} MB |`);
			if (c.topic.id === 'never-uploaded') rows.push(`| ${isoMinute(t + int(r, 1, 4))} | upload warnings | ${c.missing} photos did not finish uploading |`);
		} else if (event === 'paid') {
			const count = c.topic.id === 'never-uploaded' ? c.got : c.topic.id === 'wrong-amount' ? c.n + c.extra : c.n;
			rows.push(`| ${isoMinute(c.paid)} | payment | ${coded(c.currency, c.pounds)} captured, basket ${count} × ${c.size} ${c.finish} |`);
		} else if (event === 'lab') rows.push(`| ${isoMinute(c.paid + int(r, 300, 840))} | sent to lab | job ${c.v.job} |`);
		else if (event === 'dispatched') rows.push(`| ${isoMinute(c.paid + int(r, 1500, 2600))} | dispatched | ${c.v.tracking} |`);
	}
	return rows.join('\n');
};

const uploadsPaste = (c: Context): string => {
	const { r } = c;
	const kind = c.topic.uploads!;
	const rows = kind === 'lowres' || kind === 'crop' ? ['| # | File | Size | Pixels | Result |', '| ---: | --- | ---: | --- | --- |'] : ['| # | File | Size | Type | Result |', '| ---: | --- | ---: | --- | --- |'];
	const day = isoDay(c.paid - int(r, 0, 12) * 1440).replace(/-/g, '');
	let photo = int(r, 1000, 8900);
	let shot = int(r, 1, 9) * 10000 + int(r, 0, 9999);
	const phone = () => `PXL_${day}_${pad(int(r, 8, 20))}${pad(int(r, 0, 59))}${pad(int(r, 0, 59))}${int(r, 100, 999)}.jpg`;
	const whatsapp = () => `IMG-${day}-WA${pad(int(r, 1, 99), 4)}.jpg`;
	const show = Math.min(c.n, int(r, 10, 18));
	const stored = (i: number, name: string) => `stored as orders/${c.order}/${i}.${name.split('.').pop()}`;
	const mb = (low: number, high: number) => `${(low + r() * (high - low)).toFixed(1)} MB`;
	const upperAt = new Set<number>();
	if (kind === 'upper') while (upperAt.size < c.missing) upperAt.add(int(r, 1, show));
	const names: string[] = [];
	for (let i = 1; i <= show; i++) {
		if (kind === 'heic') {
			const heic = i <= Number(c.v.heic) && r() < 0.85;
			const name = heic ? `IMG_${photo++}.HEIC` : whatsapp();
			rows.push(`| ${i} | ${name} | ${heic ? mb(1.4, 3.2) : mb(0.2, 0.6)} | ${heic ? 'image/heic' : 'image/jpeg'} | ${heic ? '415 unsupported type' : stored(i, name)} |`);
		} else if (kind === 'large' || kind === 'tiff') {
			const ext = kind === 'tiff' ? 'tif' : c.v.ext!.toLowerCase();
			const name = `slide_${pad(shot++ % 1000, 3)}.${ext}`;
			const big = kind === 'large' && i <= Number(c.v.big);
			const size = kind === 'tiff' ? mb(28, 46) : big ? mb(Number(c.v.mbmin), Number(c.v.mbmax)) : mb(18, 46);
			const type = ext === 'png' ? 'image/png' : 'image/tiff';
			rows.push(`| ${i} | ${name} | ${size} | ${type} | ${kind === 'tiff' ? '415 unsupported type' : big ? '413 too large' : stored(i, name)} |`);
		} else if (kind === 'upper') {
			const name = upperAt.has(i) ? `IMG_${pad(photo++ % 10000, 4)}.JPG` : phone();
			if (upperAt.has(i)) names.push(name);
			rows.push(`| ${i} | ${name} | ${mb(2.1, 6.8)} | image/jpeg | ${stored(i, name)} |`);
		} else if (kind === 'dup') {
			const firstHalf = i <= Math.ceil(show / 2);
			const base = firstHalf ? i : i - Math.ceil(show / 2);
			const position = firstHalf ? i : c.half + base;
			const name = `IMG-${day}-WA${pad(base + 40, 4)}.jpg`;
			rows.push(`| ${position} | ${name} | ${mb(0.3, 0.4 + (base % 3) * 0.1)} | image/jpeg | ${stored(position, name)} |`);
		} else if (kind === 'lowres') {
			const low = r() < 0.4;
			const name = low ? whatsapp() : phone();
			rows.push(`| ${i} | ${name} | ${low ? mb(0.08, 0.2) : mb(2.4, 5.9)} | ${low ? `${c.v.px} × ${Math.round(Number(c.v.px) * 0.75)}` : '4080 × 3072'} | ${stored(i, name)} |`);
		} else if (kind === 'crop') {
			const tall = r() < 0.55;
			const name = phone();
			rows.push(`| ${i} | ${name} | ${mb(2.2, 5.4)} | ${tall ? '4032 × 3024 (4:3)' : '4080 × 2720 (3:2)'} | ${stored(i, name)} |`);
		} else {
			const name = phone();
			rows.push(`| ${i} | ${name} | ${mb(2.6, 7.1)} | image/jpeg | ${i <= c.got ? stored(i, name) : 'not received'} |`);
		}
	}
	if (c.n > show) rows.push(`| … | ${c.n - show} more rows | | | ${kind === 'stall' ? `${Math.max(0, c.got - show)} stored, the rest not received` : kind === 'heic' || kind === 'large' ? 'a mix, as above' : 'all as above'} |`);
	if (kind === 'upper') c.v.missingnames = names.join(' and ').replace(/ and (?=[^ ]+ and )/g, ', ');
	return rows.join('\n');
};

const labPaste = (c: Context): string => {
	const { r } = c;
	const kind = c.topic.lab!;
	const received = c.paid + int(r, 300, 840);
	const printed = received + int(r, 180, 600);
	const packed = printed + int(r, 600, 1100);
	const dispatched = packed + int(r, 120, 420);
	const courier = c.region === 'uk' ? 'Royal Mail Tracked 48' : 'Parcelway International';
	const lines = [`Print lab portal · job ${c.v.job}`, `Order       ${c.order}`, `Product     ${c.n} × ${c.size} ${c.finish}`];
	if (kind === 'held') {
		lines.push(`Images      ${c.n} received`, `Received    ${isoMinute(received)}`, `Status      on hold at Fennel Prints' request (${isoMinute(received + int(r, 30, 200))})`, `Batch       ${pick(r, ['B', 'C', 'D'])}-${int(r, 10, 40)}, scheduled ${isoMinute(received + int(r, 240, 400))}`);
	} else if (kind === 'short') {
		lines.push(`Images      ${c.got} received, ${c.got} printed`, `Received    ${isoMinute(received)}`, `Printed     ${isoMinute(printed)}`, `Packed      ${isoMinute(packed)}, station ${int(r, 1, 4)}`, `Dispatched  ${isoMinute(dispatched)}, ${courier}, ${c.v.tracking}`, `Import log  ${c.n - c.got} file(s) skipped: unrecognised file type`);
	} else if (kind === 'mixup') {
		lines.push(`Images      ${c.n} received, ${c.n} printed`, `Received    ${isoMinute(received)}`, `Printed     ${isoMinute(printed)}`, `Packed      ${isoMinute(packed)}, station ${int(r, 1, 4)}`, `Dispatched  ${isoMinute(dispatched)}, ${courier}, ${c.v.tracking}`, '', `Print lab portal · job ${Number(c.v.job) + int(r, 1, 3)}`, `Order       ${c.v.wrongorder}`, `Product     ${int(r, 12, 60)} × 6x4 gloss`, `Packed      ${isoMinute(packed + 1)}, same station`);
	} else {
		lines.push(`Images      ${c.n} received, ${c.n} printed`, `Received    ${isoMinute(received)}`, `Printed     ${isoMinute(printed)}`);
		if (kind === 'checked') lines.push(`Check       ${c.v.flag} of ${c.n} flagged dark (mean level under 80); printed to profile, no enhancement requested`);
		lines.push(`Packed      ${isoMinute(packed)}, station ${int(r, 1, 4)}, board-backed envelope`, `Dispatched  ${isoMinute(dispatched)}, ${courier}, ${c.v.tracking}`);
		if (kind === 'returning') lines.push(`Courier     ${isoMinute(dispatched + int(r, 1500, 3000))} returning to sender: address not recognised`);
		if (kind === 'delivered') lines.push(`Courier     delivered ${isoMinute(dispatched + int(r, 1400, 2900))}`);
	}
	return '```text\n' + lines.join('\n') + '\n```';
};

const voucherPaste = (c: Context) =>
	['| Voucher | Bought | Value | Expires | Used |', '| --- | --- | ---: | --- | --- |', `| ${c.v.voucher} | ${c.v.vdate} | ${c.v.vvalue} | ${c.v.vexp} | no |`, `| ${c.v.voucherOther} | ${c.v.vdate} | ${c.v.vvalueOther} | ${c.v.vexp} | yes, ${c.v.vusedOn} |`].join('\n');
const accountPaste = (c: Context) =>
	['| Field | Value |', '| --- | --- |', `| Name | ${c.v.full} |`, `| Email | ${c.v.oldemail} |`, `| Postcode | ${c.v.postcode} |`, `| Orders | ${c.v.orders}, the last on ${c.v.lastorder} |`, `| Photos held | 1 order, ${c.n} photos, to be deleted ${c.v.purge} |`].join('\n');
const quotePaste = (c: Context) => {
	const small = Number(c.v.bulk) - 40;
	const lines = small * 0.32 + 40 * 2.4;
	return ['| Item | Qty | Unit | Line |', '| --- | ---: | ---: | ---: |', `| 6x4 gloss | ${small} | £0.32 | ${money('GBP', small * 0.32)} |`, '| 10x8 gloss | 40 | £2.40 | £96.00 |', `| Discount 15% | | | −${money('GBP', lines * 0.15)} |`, '| Delivery | | | £2.95 |', `| Total | | | ${money('GBP', lines * 0.85 + 2.95)} |`].join('\n');
};

const statementPaste = (c: Context): string => {
	const { r } = c;
	const when = short(c.paid);
	if (c.topic.id === 'currency-fee') {
		const local = money(c.currency, c.pounds);
		return '```text\n' + [`${when}  FENNEL PRINTS BRISTOL GBR       ${local}`, `        GBP ${c.pounds.toFixed(2)} @ ${RATES[c.currency].toFixed(4)}`, `${short(c.paid + 1440)}  FOREIGN TRANSACTION FEE           ${c.v.fee}`].join('\n') + '\n```';
	}
	const amount = money(c.currency, c.pounds);
	const lines = c.topic.id === 'pending-hold' ? [`${when}  FENNEL PRINTS BRISTOL   ${amount}   PENDING`, `${when}  FENNEL PRINTS BRISTOL   ${amount}`] : [`${when}  FENNEL PRINTS BRISTOL   ${amount}`, `${when}  FENNEL PRINTS BRISTOL   ${amount}`];
	if (r() < 0.6) lines.unshift(`${short(c.paid + 60)}  ${pick(r, ['CO-OP FOOD', 'TESCO STORES', 'PRET A MANGER', 'TFL TRAVEL CH', 'AMAZON MKTPLACE', 'SHELL'])}   ${money(c.currency, int(r, 3, 60) + r())}`);
	return '```text\n' + lines.join('\n') + '\n```';
};
const receiptPaste = (c: Context): string =>
	'```text\n' + ['Fennel Prints · your receipt', `Order ${c.order} · ${spoken(c.paid)} 2026`, `${c.n} × ${c.size} ${c.finish}`, `Delivery: ${c.region === 'uk' ? 'Royal Mail Tracked 48' : 'Parcelway International'}`, `Paid: ${receipted(c.currency, c.pounds, c.paid)}`, '', 'Thank you for your order. Your prints will be with you soon.'].join('\n') + '\n```';
const errorsPaste = (c: Context): string => {
	const { r } = c;
	const lines: string[] = [];
	const failed = c.topic.uploads === 'heic' ? Number(c.v.heic) : Number(c.v.big);
	let photo = int(r, 1000, 8900);
	for (let i = 0; i < Math.min(int(r, 4, 8), failed); i++) {
		if (c.topic.uploads === 'heic') lines.push(`IMG_${photo++}.HEIC    Upload failed: unsupported type`);
		else lines.push(`slide_${pad(photo++ % 1000, 3)}.${c.topic.uploads === 'tiff' ? 'tif' : c.v.ext!.toLowerCase()}    Upload failed: ${c.topic.uploads === 'tiff' ? 'unsupported type' : 'too large'}`);
	}
	lines.push(`${failed} photos could not be uploaded.`);
	return '```text\n' + lines.join('\n') + '\n```';
};
const trackingPaste = (c: Context): string => {
	const { r } = c;
	const sent = c.paid + int(r, 1500, 2600);
	const lines = [`Tracking ${c.v.tracking}`];
	if (c.topic.id === 'delivery-address') lines.push(`${short(sent + 4300)} ${pad(int(r, 6, 20))}:${pad(int(r, 0, 59))}  Returning to sender: address could not be found`, `${short(sent + 2900)} ${pad(int(r, 6, 11))}:${pad(int(r, 0, 59))}  Delivery attempted: address incomplete`);
	else lines.push(`${short(sent + 2900)} ${pad(int(r, 5, 8))}:${pad(int(r, 0, 59))}  Your item is at the ${c.v.depot} delivery office`);
	lines.push(`${short(sent + 1300)} ${pad(int(r, 19, 23))}:${pad(int(r, 0, 59))}  Item arrived at ${c.v.depot} sorting centre`, `${short(sent)} ${pad(int(r, 15, 18))}:${pad(int(r, 0, 59))}  Item received from sender`);
	return '```text\n' + lines.join('\n') + '\n```';
};

const PRE_PAYMENT = new Set(['refused-bank', 'refused-3ds', 'refused-card-type', 'refused-postcode', 'refused-expired', 'upload-heic', 'upload-large', 'upload-tiff', 'upload-stall']);
/** The order page of the order admin, as support copies it into a note. */
const orderPaste = (c: Context): string => {
	const { r } = c;
	const pre = PRE_PAYMENT.has(c.topic.id);
	const attempts = c.topic.charges?.filter((x) => x.startsWith('fail')).length ?? 0;
	const lines = [
		`Order ${c.order} · created ${isoMinute(pre ? c.opened - int(r, 30, 400) : c.paid - int(r, 8, 40))} UTC`,
		`Customer    ${c.v.full} · ${c.region === 'uk' ? 'GB' : c.region.toUpperCase()} · pays in ${c.currency}`,
		`Items       ${c.topic.id === 'wrong-amount' ? c.n + c.extra : c.topic.id === 'never-uploaded' ? c.got : c.n} × ${c.size} ${c.finish} · auto-enhance ${c.topic.id === 'quality-dark' || r() < 0.7 ? 'off' : 'on'} · fit to print ${c.topic.id === 'quality-crop' || r() < 0.8 ? 'off' : 'on'} · white border ${r() < 0.85 ? 'off' : 'on'}`,
		`Basket      ${pre ? 'open' : 'closed'} · ${coded(c.currency, c.pounds)} incl. delivery`,
		`Payment     ${pre ? (attempts ? `none captured · ${attempts} failed attempt${attempts === 1 ? '' : 's'}` : 'not attempted') : `captured ${isoMinute(c.paid)}`}`,
		`Delivery    ${c.region === 'uk' ? 'Royal Mail Tracked 48' : 'Parcelway International'} · ${c.region === 'uk' ? c.v.postcode.split(' ')[0] : c.v.country} · safe place: ${pick(r, ['none', 'none', 'porch', 'with neighbour'])}`,
		`Lab         ${pre ? 'not sent' : `job ${c.v.job}`}`
	];
	return '```text\n' + lines.join('\n') + '\n```';
};
const contactsPaste = (c: Context, earlierTickets: [number, number, string][]): string =>
	['Earlier tickets from this customer:', '', '| Ticket | Opened | Subject | Replies |', '| --- | --- | --- | ---: |', ...earlierTickets.map(([number, when, subject]) => `| FP-${number} | ${isoDay(when)} | ${subject} | ${int(c.r, 1, 6)} |`)].join('\n');

const notePastes: Record<Paste, (c: Context) => string> = { charges: chargesPaste, timeline: timelinePaste, uploads: uploadsPaste, lab: labPaste, voucher: voucherPaste, account: accountPaste, quote: quotePaste };
const customerPastes: Record<CustomerPaste, (c: Context) => string> = { statement: statementPaste, receipt: receiptPaste, errors: errorsPaste, tracking: trackingPaste };

type Outcome = 'sorted' | 'owed' | 'wait' | 'passed' | 'noreply';
const outcomes: Outcome[] = ['sorted', 'owed', 'wait', 'sorted', 'passed', 'owed', 'sorted', 'noreply', 'wait', 'owed', 'sorted', 'passed', 'sorted', 'owed'];
/** Topics that can come up as a side matter about an earlier order: their first two turns need no paste. */
const SIDE = new Set(['refund-not-arrived', 'voucher', 'account-email', 'vat-invoice', 'quality-crop', 'quality-dark', 'quality-lowres', 'delivery-damaged', 'duplicate-uploads', 'never-uploaded']);
const sideIntros = ['Also, a separate thing while I\'m writing.', 'While I have you, there\'s something else.', 'One more thing, unrelated to the above.', 'On a different note, about my previous order:', 'Something else I\'ve been meaning to ask.'];
const sideReplies = ['On your other question:', 'About the other thing you mentioned:', 'Turning to your second point:', 'As for your previous order:'];
const NO_ORDER = new Set(['voucher', 'account-email', 'bulk-order']);
const BUSINESS = new Set(['account-email', 'bulk-order', 'vat-invoice', 'refused-card-type', 'voucher', 'refund-not-arrived']);
const AFTER_DELIVERY = new Set(['delivery-late', 'delivery-address', 'delivery-damaged', 'quality-dark', 'quality-crop', 'quality-lowres', 'missing-capital-extension', 'lab-mixup', 'duplicate-uploads', 'never-uploaded']);

const ticket = (index: number, number: number, opened0: number, shift: number): { text: string; last: number } => {
	const r = mulberry32(0x7e1c0000 + index * 104729);
	const block = Math.floor(index / topics.length);
	let topic = shuffle(mulberry32(0xb10c + block * 7), topics)[index % topics.length]!;
	const opened = opened0 - shift * 1440;
	if (topic.id === 'upload-tiff' && opened >= RELEASE) topic = topics.find((t) => t.id === 'upload-large')!;
	const outcome = outcomes[(index * 5 + int(r, 0, 3)) % outcomes.length]!;

	const region: Region = topic.regions ? pick(r, topic.regions) : r() < 0.62 ? 'uk' : pick(r, ['eu', 'eu', 'us', 'us', 'jp', 'kr'] as const);
	const people = PEOPLE[region];
	const currency = people.currency;
	const first = pick(r, people.first);
	const last = pick(r, people.last);
	const full = `${first} ${last}`;
	const team = shuffle(r, agents);
	const agent = team[0]!;
	const agent2 = team[1]!;
	const size = topic.sizes ? pick(r, topic.sizes) : pick(r, ['6x4', '6x4', '6x4', '7x5', '6x6']);
	const finish = pick(r, ['gloss', 'gloss', 'matte']);
	const [low, high] = topic.count ?? [12, 64];
	let n = int(r, low, high);
	if (topic.id === 'duplicate-uploads') n -= n % 2;
	const half = Math.floor(n / 2);
	const missing = topic.id === 'missing-capital-extension' ? int(r, 2, 3) : int(r, 3, 7);
	const got = topic.id === 'upload-stall' ? int(r, Math.floor(n * 0.3), Math.floor(n * 0.8)) : n - missing;
	const extra = int(r, 6, 14);
	const delivery = region === 'uk' ? 2.95 : region === 'eu' ? 6.5 : 9.5;
	const priced = (count: number, at = size) => {
		const prints = count * PRICES[at]!;
		return Math.round(((count > 100 ? prints * 0.85 : prints) + delivery) * 100) / 100;
	};
	const charged = topic.id === 'never-uploaded' ? got : topic.id === 'wrong-amount' ? n + extra : n;
	const pounds = priced(charged);
	const later = AFTER_DELIVERY.has(topic.id);
	const paid = opened - int(r, later ? 9000 : 60, later ? 16000 : 2900);
	const oldVisit = paid - int(r, 18, 27) * 1440 - int(r, 0, 600);
	const lowres = int(r, 9, 14);
	const partialPounds = topic.id === 'wrong-amount' ? extra * PRICES[size]! : topic.id === 'duplicate-uploads' ? half * PRICES[size]! : topic.id === 'quality-lowres' ? lowres * PRICES[size]! : Math.round(pounds * (0.2 + r() * 0.6) * 100) / 100;
	const [town, prefix] = pick(r, towns);
	const postcode = `${prefix} ${int(r, 1, 9)}${chars(r, 'ABDEFGHJLNPQRSTUWXYZ', 2)}`;
	const street = pick(r, streets);
	const date0 = opened - int(r, 8, 14) * 1440;
	const vdate = opened - int(r, 380, 520) * 1440;
	const orderOf = (m: number) => 41000 + Math.floor((m - FIRST_DAY) / 1440) * 57;
	const order = `ord-${orderOf(opened) + int(r, 0, 56)}`;
	const lastOrder = opened - int(r, 20, 50) * 1440;
	const backstory = r() < 0.65 && !BUSINESS.has(topic.id) ? int(r, 0, backstories.length - 1) : r() < 0.3 && !NO_ORDER.has(topic.id) ? 0 : -1;
	// The customer's earlier orders, newest first.
	const earlier: { order: string; when: number; prints: number; size: string; status: string }[] = [];
	if (backstory !== 0 && topic.id !== 'account-email') {
		let when = (topic.id === 'wrong-amount' ? oldVisit : opened) - int(r, 12, 45) * 1440;
		for (let i = int(r, 1, 6); i > 0; i--) {
			earlier.push({ order: `ord-${orderOf(when) + int(r, 0, 56)}`, when, prints: int(r, 5, 45) * 2, size: pick(r, ['6x4', '6x4', '7x5', '6x6', '10x8']), status: pick(r, ['delivered', 'delivered', 'delivered', 'delivered', 'delivered, 2 reprinted', 'refunded in part']) });
			when -= int(r, 25, 120) * 1440;
		}
	}
	const v: Record<string, string> = {
		first,
		last,
		full,
		agent,
		agent2,
		order,
		order2: `ord-${Number(order.slice(4)) + int(r, 1, 4)}`,
		wrongorder: `ord-${Number(order.slice(4)) + pick(r, [-2, -1, 1, 2, 3])}`,
		n: String(n),
		got: String(got),
		missing: String(missing),
		half: String(half),
		nplus: String(n + extra),
		extra: String(extra),
		size,
		finish,
		total: money(currency, pounds),
		gbp: money('GBP', pounds),
		expected: money(currency, priced(n)),
		partial: money(currency, partialPounds),
		partialcoded: coded(currency, partialPounds),
		refund: `re_${chars(r, ALNUM, 16)}`,
		arn: `${int(r, 1000, 9999)}${int(r, 10000000, 99999999)}${int(r, 10000000, 99999999)}${int(r, 10000, 99999)}`,
		bank: pick(r, people.banks),
		last4: pad(int(r, 0, 9999), 4),
		company: pick(r, companies),
		address: `${int(r, 2, 140)} ${street}, ${town} ${postcode}`,
		badaddress: `'${street}, ${town} ${postcode.slice(0, -1)}'`,
		postcode,
		vatno: `GB ${int(r, 100, 999)} ${int(r, 1000, 9999)} ${int(r, 10, 99)}`,
		po: `PO-${int(r, 10000, 99999)}`,
		month: pick(r, ['May', 'June', 'July', 'August']),
		weekday: pick(r, ['Friday', 'Saturday', 'Sunday', 'Monday']),
		sentday: WEEKDAYS[at(opened).getUTCDay()]!,
		occasion: pick(r, occasions),
		place: pick(r, places),
		oldvisit: spoken(oldVisit),
		date0: spoken(date0),
		date0iso: isoDay(date0),
		days: String(Math.round((opened - date0) / 1440)),
		expiry: `${pad(int(r, 1, 12))}/${int(r, 29, 31)}`,
		oldexpiry: `${pad(int(r, 9, 11))}/26`,
		cur: currency,
		country: pick(r, people.countries),
		fee: money(currency, pounds * 0.03),
		receiptamt: receipted(currency, pounds, paid),
		heic: String(Math.max(4, Math.floor(n * (0.6 + r() * 0.3)))),
		big: String(Math.max(3, Math.min(n - 2, Math.floor(n * (0.5 + r() * 0.5))))),
		mbmin: String(int(r, 52, 70)),
		mbmax: String(int(r, 80, 190)),
		ext: opened >= RELEASE ? pick(r, ['TIFF', 'PNG']) : 'PNG',
		pct: String(int(r, 35, 85)),
		lowres: String(lowres),
		px: String(pick(r, [640, 720, 800, 960])),
		flag: String(int(r, 5, Math.max(6, Math.floor(n / 3)))),
		cropped: String(int(r, 6, Math.max(7, Math.floor(n / 2)))),
		depot: pick(r, depots[region]),
		disp: spoken(paid + int(r, 1500, 2600)),
		lastscan: spoken(paid + int(r, 4400, 5500)),
		tracking: region === 'uk' ? `JX ${int(r, 1000, 9999)} ${int(r, 1000, 9999)} ${int(r, 0, 9)}GB` : `PW${int(r, 10000, 99999)}${int(r, 10000, 99999)}`,
		missingnames: '',
		voucher: `FPGV-${chars(r, UPPER, 4)}-${chars(r, UPPER, 4)}`,
		voucher2: `FPGV-${chars(r, UPPER, 4)}-${chars(r, UPPER, 4)}`,
		voucherOther: `FPGV-${chars(r, UPPER, 4)}-${chars(r, UPPER, 4)}`,
		vdate: isoDay(vdate),
		vexp: isoDay(vdate + 365 * 1440),
		vvalue: money('GBP', pick(r, [15, 20, 25, 30, 50])),
		vvalueOther: money('GBP', pick(r, [10, 15, 20, 25])),
		vusedOn: isoDay(vdate + int(r, 30, 200) * 1440),
		oldemail: `${first.toLowerCase().replace(/[^a-z]/g, '')}.${last.toLowerCase().replace(/[^a-z]/g, '')}${int(r, 50, 99)}@${pick(r, mailDomains)}`,
		orders: String(int(r, 2, 14)),
		lastorder: isoDay(lastOrder),
		lastordermonth: MONTHS[at(lastOrder).getUTCMonth()]!,
		purge: isoDay(opened + int(r, 3, 20) * 1440),
		school: pick(r, schools),
		club: pick(r, clubs),
		bulk: String(int(r, 18, 42) * 10),
		date: spoken(paid),
		job: String(int(r, 7700000, 7999999))
	};
	const c: Context = { r, v, region, currency, pounds, opened, paid, oldVisit, n, got, half, extra, missing, size, finish, order, brand: pick(r, CARD_BRANDS), topic };
	// The uploads paste names the missing files, which the customer quotes before the note is written.
	const pastes = topic.paste.map((kind) => notePastes[kind](c));
	const f = (text: string) => fill(text, v);

	// The customer's earlier orders, as the order admin lists them.
	const history: string[] = [];
	if (earlier.length) {
		const since = earlier.at(-1)!.when - int(r, 1, 60) * 1440;
		const rows = earlier.map((e) => `| ${e.order} | ${isoDay(e.when)} | ${e.prints} × ${e.size} | ${money(currency, priced(e.prints, e.size))} | ${e.status} |`).reverse();
		history.push(`Account: ${full} · customer since ${isoDay(since)} · ${earlier.length} earlier order${earlier.length === 1 ? '' : 's'}`, '', '| Order | Placed | Prints | Total | Status |', '| --- | --- | --- | ---: | --- |', ...rows);
	} else if (topic.id !== 'account-email') history.push(`Account: ${full} · first order on this account`);

	// A side matter about the latest earlier order, in most tickets with one. It is settled before the
	// main matter ends, so the ticket's main problem and outcome still need reading to the end.
	const sideTopics = topics.filter((s) => SIDE.has(s.id) && s.id !== topic.id && (!s.regions || s.regions.includes(region)));
	const side = earlier.length && !NO_ORDER.has(topic.id) && r() < 0.75 ? pick(r, sideTopics) : undefined;
	let s2: Record<string, string> = v;
	if (side) {
		const e = earlier[0]!;
		// The order's row in the history is what was printed and charged; a customer who lost photos on upload chose more.
		const smissing = int(r, 2, 6);
		const sn = side.id === 'never-uploaded' ? e.prints + smissing : e.prints;
		const spounds = priced(e.prints, e.size);
		const sLowres = Math.min(sn - 2, int(r, 9, 14));
		const sPartial = side.id === 'duplicate-uploads' ? (e.prints / 2) * PRICES[e.size]! : side.id === 'quality-lowres' ? sLowres * PRICES[e.size]! : Math.round(spounds * (0.2 + r() * 0.5) * 100) / 100;
		s2 = { ...v, order: e.order, n: String(sn), size: e.size, total: money(currency, spounds), half: String(e.prints / 2), got: String(sn - smissing), missing: String(smissing), flag: String(int(r, 4, Math.max(5, Math.floor(sn / 3)))), cropped: String(int(r, 4, Math.max(5, Math.floor(sn / 2)))), lowres: String(sLowres), partial: money(currency, sPartial), refund: `re_${chars(r, ALNUM, 16)}` };
	}
	const f2 = (text: string) => fill(text, s2);
	const sideSteps = side ? [`${pick(r, sideIntros)} ${f2(pick(r, side.opens))}`, `${pick(r, sideReplies)} ${f2(side.turns[0]![0])}`, f2(side.turns[0]![1]), f2(side.turns[1]![0]), f2(side.turns[1]![1]), f2(side.turns[2]![0]), f2(side.turns[2]![1])] : [];

	const messages: string[] = [];
	let t = opened;
	const customerTime = (min: number, max: number) => {
		t += int(r, min, max);
		const h = hourOf(t);
		if (h < 7) t = dayStart(t) + 7 * 60 + int(r, 0, 120);
		else if (h >= 23) t = dayStart(t) + 1440 + 8 * 60 + int(r, 0, 120);
	};
	const supportTime = (min: number, max: number) => {
		t += int(r, min, max);
		const h = hourOf(t);
		if (h < 8) t = dayStart(t) + 8 * 60 + int(r, 5, 90);
		else if (h >= 18) t = dayStart(t) + 1440 + 8 * 60 + int(r, 5, 90);
	};
	let current = agent;
	let early = true;
	let story = false;
	let replied = false;
	let closing = false;
	const customer = (paragraphs: string[], sign = r() < 0.55) => {
		const body = [...(replied && !closing && r() < 0.35 ? [fill(pick(r, replyGreetings), { agent: current })] : !replied && r() < 0.25 ? [pick(r, customerGreetings.filter((g) => g !== 'Good morning,'))] : []), ...(!closing && r() < 0.15 ? [pick(r, customerContext)] : []), ...paragraphs, ...(early && !story && !BUSINESS.has(topic.id) && r() < 0.35 ? [f(pick(r, colour))] : []), ...(sign ? [f(pick(r, customerSignoffs))] : [])];
		messages.push(`**${full}** · ${stamp(t)}\n\n${body.join('\n\n')}`);
	};
	const support = (paragraphs: string[], greet = r() < 0.7) => {
		replied = true;
		const body = [...(greet ? [f(pick(r, agentGreetings))] : []), ...paragraphs, ...(r() < 0.35 ? [pick(r, agentClosers)] : []), fill(pick(r, agentSignoffs), { agent: current })];
		messages.push(`**${current} (Fennel Prints)** · ${stamp(t)}\n\n${body.join('\n\n')}`);
	};
	const note = (paragraphs: string[]) => messages.push(`**Internal note by ${current}** · ${stamp(t)}\n\n${paragraphs.join('\n\n')}`);

	// The first message.
	const subject = f(pick(r, topic.subjects));
	const opening = [pick(r, hourOf(t) < 12 ? customerGreetings : customerGreetings.filter((g) => g !== 'Good morning,'))];
	if (backstory >= 0) opening.push(f(backstories[backstory]!));
	story = backstory >= 0;
	if (!story && !BUSINESS.has(topic.id) && r() < 0.3) {
		opening.push(f(pick(r, colour)));
		story = true;
	}
	opening.push(f(pick(r, backstory === 0 ? topic.opens.filter((o) => !/before|first time|lots of times/.test(o)) : topic.opens)));
	if (r() < 0.35) opening.push(pick(r, customerAsides));
	opening.push(f(pick(r, customerSignoffs)));
	messages.push(`**${full}** · ${stamp(t)}\n\n${opening.join('\n\n')}`);

	const asking = new Map<number, [string, string]>();
	if (r() < 0.6) asking.set(1, pick(r, tangents));
	const late = r() < 0.2;
	if (late) {
		customerTime(1440, 2800);
		customer([f(pick(r, chasers))], false);
	} else if (r() < 0.25) {
		supportTime(20, 200);
		support([pick(r, holdReplies)]);
	}
	const turns = topic.turns;
	const extras = topic.extras.filter(() => r() < 0.9);
	const extrasAt = (i: number) => (i === 1 ? extras.slice(0, 1) : i === turns.length - 1 ? extras.slice(1) : []);
	supportTime(30, 400);
	support([late ? pick(r, agentLateOpeners) : pick(r, agentOpeners), f(turns[0]![0])], true);
	customerTime(30, 900);
	const customerPaste = topic.customerPaste ? [customerPastes[topic.customerPaste](c)] : [];
	customer([f(turns[0]![1]), ...customerPaste, ...(sideSteps.length ? [sideSteps.shift()!] : [])]);
	early = false;
	supportTime(20, 240);
	const pastOrder = !['voucher', 'account-email', 'bulk-order'].includes(topic.id) && r() < 0.8 ? [orderPaste(c)] : [];
	const contacts = earlier.length && r() < 0.45 ? [contactsPaste(c, earlier.slice(0, int(r, 1, 3)).map((e): [number, number, string] => { const when = e.when + int(r, 3, 15) * 1440; return [30412 + Math.round(((when - FIRST_DAY) / 1440) * 30) + int(r, 0, 29), when, f(pick(r, pick(r, topics).subjects))]; }))] : [];
	note([f(pick(r, topic.note)), ...pastOrder, ...pastes, ...(history.length ? [history.join('\n')] : []), ...contacts]);
	const handoverAt = r() < 0.3 ? int(r, 1, turns.length - 1) : -1;
	for (let i = 1; i < turns.length; i++) {
		supportTime(i > 1 ? 30 : 3, i > 1 ? 600 : 40);
		const lead: string[] = [];
		if (i === handoverAt) {
			current = agent2;
			lead.push(fill(pick(r, handovers), { agent, agent2 }));
		}
		const answer = asking.has(i - 1) ? [asking.get(i - 1)![1]] : [];
		support([...lead, f(turns[i]![0]), ...extrasAt(i).map(([said]) => f(said)), ...answer, ...(sideSteps.length ? [sideSteps.shift()!] : [])], i === handoverAt || r() < 0.5);
		customerTime(20, 1200);
		const asked = asking.has(i) && i + 1 < turns.length ? [asking.get(i)![0]] : [];
		if (!asked.length) asking.delete(i);
		customer([...extrasAt(i).map(([, reply]) => f(reply)), f(turns[i]![1]), ...asked, ...(sideSteps.length ? [sideSteps.shift()!] : [])], r() < 0.3);
		if (i === 1 && !asked.length && r() < 0.2) {
			customerTime(60, 300);
			customer([pick(r, acks)], false);
		}
	}

	// What support did, as the note it leaves before telling the customer.
	const record = (text: string) => {
		if (/refunded/.test(text)) note([pick(r, ['Refund done.', 'Refunded.', 'Refund issued on Tillpoint.']), '```text\n' + [col('Refund', 22), col('Created (UTC)', 21), col('Reference', 11), col('Amount', 13), 'Status'].join('') + '\n' + [col(text.match(/re_\w+/)?.[0] ?? v.refund!, 22), col(isoSecond(t - int(r, 2, 30), r), 21), col(text.match(/ord-\d+/)?.[0] ?? order, 11), col(`-${text.match(/[£€$¥₩][\d,.]+/)?.[0] ?? v.partial}`, 13), 'succeeded'].join('') + '\n```']);
		else if (/reprint|went out|posted/.test(text)) note([pick(r, ['Reprint booked with the lab.', 'Lab confirmed the reprint.', 'Reprint sent.']), '```text\n' + [`Print lab portal · job ${int(r, 7700000, 7999999)} (reprint of ${v.job})`, `Order       ${order}`, `Received    ${isoMinute(t - int(r, 1500, 2800))}`, `Printed     ${isoMinute(t - int(r, 600, 1400))}`, `Dispatched  ${isoMinute(t - int(r, 30, 150))}, ${region === 'uk' ? 'Royal Mail Tracked 24' : 'Parcelway International'}`].join('\n') + '\n```']);
	};

	// The side matter is settled before the main one.
	if (side) {
		while (sideSteps.length) {
			supportTime(30, 600);
			support([sideSteps.shift()!]);
			if (sideSteps.length) {
				customerTime(30, 900);
				customer([sideSteps.shift()!], false);
			}
		}
		supportTime(60, 1800);
		support([`${pick(r, sideReplies)} ${f2(side.done)}`], false);
	}

	// How it ends.
	closing = true;
	const owe = f(topic.owe);
	const wait = f(topic.wait);
	const [teamName, passWhat] = topic.pass;
	const twist = r();
	if (outcome === 'sorted') {
		if (twist < 0.45) {
			supportTime(30, 600);
			support([fill(pick(r, owePromises), { owe })]);
			customerTime(20, 600);
			customer([pick(r, oweThanks)], false);
			supportTime(1440, 4000);
			record(f(topic.done));
			supportTime(2, 20);
			support([f(topic.done)]);
			if (r() < 0.6) {
				customerTime(60, 1500);
				customer([pick(r, bye)], false);
			}
		} else {
			for (const [who, text] of topic.fixed) {
				if (who === 'c') {
					customerTime(300, 2600);
					customer([f(text)], r() < 0.4);
				} else {
					supportTime(30, 900);
					record(f(text));
					supportTime(2, 20);
					support([f(text)]);
				}
			}
			if (topic.fixed.at(-1)![0] === 's' && r() < 0.4) {
				customerTime(30, 600);
				customer([pick(r, bye)], false);
			}
		}
	} else if (outcome === 'owed') {
		if (twist < 0.35) {
			supportTime(30, 600);
			support([fill(pick(r, waitAsks), { wait })]);
			customerTime(200, 2000);
			customer([pick(r, didIt), pick(r, pushbacks)], false);
		} else if (twist < 0.6) {
			customerTime(30, 600);
			customer([pick(r, pushbacks)], false);
		}
		supportTime(30, 600);
		support([fill(pick(r, owePromises), { owe })]);
		if (r() < 0.7) {
			customerTime(20, 600);
			customer([pick(r, oweThanks)], false);
		}
	} else if (outcome === 'wait') {
		supportTime(30, 600);
		support([fill(pick(r, waitAsks), { wait })]);
		if (twist < 0.5) {
			customerTime(30, 600);
			customer([pick(r, waitReplies)], false);
		}
	} else if (outcome === 'passed') {
		const team = f(teamName);
		supportTime(30, 900);
		note([`Raised with ${team.replace(', our payment provider', '')}${team.startsWith('Tillpoint') ? `, case ${int(r, 100000, 999999)}` : team === 'the print lab' ? `, portal message on job ${v.job}` : team === 'our engineers' ? `, request ${int(r, 1200, 1900)}` : ''}. ${pick(r, ['Customer to be told.', 'Waiting on them.', 'Linked this ticket.'])}`]);
		supportTime(2, 25);
		support([fill(pick(r, passLines), { team, pass: f(passWhat) })]);
		if (twist < 0.6) {
			const [question, reply] = pick(r, passFollowUps);
			customerTime(30, 600);
			customer([question], false);
			supportTime(30, 400);
			support([reply], false);
		}
	} else {
		supportTime(30, 600);
		support([fill(pick(r, waitAsks), { wait })]);
		supportTime(2 * 1440, 4 * 1440);
		support([f(pick(r, nudges))], false);
		supportTime(3 * 1440, 5 * 1440);
		support([pick(r, closes)]);
	}
	// A side question after the matter is settled, in some tickets, so the outcome is not always the last word.
	if (outcome !== 'noreply' && r() < 0.35) {
		const [question, reply] = pick(r, tangents);
		customerTime(60, 1800);
		customer([`One more thing, sorry. ${question.replace(/^(Also, |While I have you, )/, '').replace(/^./, (x) => x.toUpperCase())}`], false);
		supportTime(30, 600);
		support([reply]);
	}

	const header = [`# FP-${number}: ${subject}`, '', `Customer: ${full}${region === 'uk' ? '' : ` (${v.country})`}, by ${pick(r, ['email', 'email', 'web form'])}`, `Opened: ${stamp(opened)}`, `Order: ${NO_ORDER.has(topic.id) ? 'none' : order}`].join('\n');
	return { text: `${header}\n\n${messages.map((message) => `---\n\n${message}`).join('\n\n')}\n`, last: t };
};

const folder = join(root, 'support', 'tickets');
mkdirSync(folder, { recursive: true });
for (let index = 0; index < ITEMS; index++) {
	const day = Math.floor((index * SPAN_DAYS) / ITEMS);
	const spread = Math.max(0, Math.floor(SPAN_DAYS / ITEMS) - 1);
	const seeded = mulberry32(0x5eed + index * 31);
	const opened = FIRST_DAY + (day + int(seeded, 0, spread)) * 1440 + int(seeded, 7 * 60, 22 * 60 + 50);
	const number = 30412 + index * 23 + int(seeded, 0, 19);
	let { text, last } = ticket(index, number, opened, 0);
	if (last > LAST_MESSAGE) ({ text, last } = ticket(index, number, opened, Math.ceil((last - LAST_MESSAGE) / 1440)));
	writeFileSync(join(folder, `FP-${number}.md`), text);
}
writeFileSync(
	join(folder, 'README.md'),
	`# Support tickets\n\nThe ${ITEMS} tickets customers opened between 1 September and 10 November 2026 that took more than one reply,\nexported from the helpdesk on 20 November, one file each: every message and internal note as it stood. The export\ndoes not carry the helpdesk's tags or statuses. Tables in internal notes are copied from the Tillpoint dashboard,\nthe order admin and the print lab's portal.\n`
);
