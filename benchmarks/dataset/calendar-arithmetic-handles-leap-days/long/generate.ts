// Writes the long material of this entry's long tasks: the tickets Oakhurst Hosting's support desk escalated
// to the accounts team between August and November 2026, one Markdown file each, under docs/escalations/.
// Deterministic: fixed seeds, no clock, no network.
//   bun long/generate.ts <workspace root>
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// How many tickets to write. Dates, ticket numbers and the mix of problems all follow from it.
const ITEMS = 128;

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
const shuffle = <T>(r: Rand, items: readonly T[]): T[] => {
	const copy = [...items];
	for (let i = copy.length - 1; i > 0; i--) {
		const j = Math.floor(r() * (i + 1));
		[copy[i], copy[j]] = [copy[j]!, copy[i]!];
	}
	return copy;
};
const cap = (text: string) => (text.startsWith('http') ? text : text.charAt(0).toUpperCase() + text.slice(1));
const pad = (value: number, width = 2) => String(value).padStart(width, '0');
const hex = (r: Rand, length: number) => Array.from({ length }, () => '0123456789abcdef'[int(r, 0, 15)]).join('');
const base36 = (r: Rand, length: number) => Array.from({ length }, () => 'abcdefghjkmnpqrstuvwxyz23456789'[int(r, 0, 30)]).join('');

// Days are whole days since 1970-01-01, in UTC.
const DAY = 86_400_000;
const START = Date.UTC(2026, 7, 3) / DAY; // the first ticket: 3 August 2026
const SPAN = 94; // days over which tickets are opened
const LAST = Date.UTC(2026, 10, 19) / DAY; // nothing is dated after 19 November 2026
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const at = (day: number) => new Date(day * DAY);
const shortDate = (day: number) => `${at(day).getUTCDate()} ${MONTHS[at(day).getUTCMonth()]} ${at(day).getUTCFullYear()}`;
const longDate = (day: number) => `${at(day).getUTCDate()} ${MONTHS_LONG[at(day).getUTCMonth()]} ${at(day).getUTCFullYear()}`;
const iso = (day: number) => at(day).toISOString().slice(0, 10);
const weekday = (day: number) => WEEKDAYS[at(day).getUTCDay()]!;
/** A day before `before`, between the years given, kept clear of the last days of a month. */
const pastDay = (r: Rand, before: number, fromYear: number, toYear: number): number => {
	for (;;) {
		const day = Date.UTC(int(r, fromYear, toYear), pick(r, [0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]), int(r, 1, 28)) / DAY;
		if (day < before - 20) return day;
	}
};

// People. Support answers customers; the accounts team owns the accounts service; the rest are other teams.
const support = ['Ines', 'Kofi', 'Bethan', 'Ravi', 'Lucy'];
const accounts = ['Tomasz', 'Helen', 'Nikhil', 'Jo'];
const teamPeople: Record<string, string[]> = {
	finance: ['Maureen', 'Alastair'],
	'the platform team': ['Sam', 'Chioma'],
	'the sign-in team': ['Arun', 'Petra'],
	'the mail team': ['Grace'],
	'the privacy team': ['Femi'],
	sales: ['Duncan', 'Rosa'],
	'the web team': ['Elif']
};
const firsts = ['Morag', 'Delroy', 'Annika', 'Fintan', 'Sunita', 'Gareth', 'Hollie', 'Ibrahim', 'Jocelyn', 'Kieran', 'Leonie', 'Mihai', 'Nadia', 'Oliver', 'Philippa', 'Rhys', 'Saoirse', 'Tariq', 'Ursula', 'Vikram', 'Wendy', 'Xavier', 'Yasmin', 'Zachary', 'Beatrix', 'Cormac', 'Dilys', 'Emeka', 'Freya', 'Godfrey', 'Harriet', 'Imran'];
const lasts = ['Haldane', 'Pemberton', 'Osei', 'McAllister', 'Varga', 'Thornbury', 'Iqbal', 'Rowntree', 'Esposito', 'Calloway', 'Nwachukwu', 'Gillespie', 'Hargreaves', 'Fairweather', 'Lindgren', 'Moreau', 'Sandhu', 'Blackwood', 'Kavanagh', 'Duarte', 'Ashworth', 'Penhaligon', 'Quinlan', 'Strachan', 'Yildiz', 'Waddington', 'Adeyemi', 'Brennan'];
const heads = ['Thistle', 'Bramble', 'Harrow', 'Lantern', 'Saffron', 'Kestrel', 'Willow', 'Granite', 'Puffin', 'Mulberry', 'Orchard', 'Quayside', 'Heather', 'Juniper', 'Anchor', 'Cobble', 'Foxglove', 'Lighthouse', 'Meadow', 'Nettle', 'Pebble', 'Rowan', 'Sycamore', 'Tidal'];
const tails: [string, string][] = [['Joinery', 'joinery'], ['Bakery', 'bakery'], ['Physio', 'physio'], ['Florist', 'flowers'], ['Photography', 'photo'], ['Cycles', 'cycles'], ['Tea Rooms', 'tearooms'], ['Pottery', 'pottery'], ['Lettings', 'lettings'], ['Dog Grooming', 'grooming'], ['Bookshop', 'books'], ['Electrical', 'electrical'], ['Wedding Films', 'films'], ['Yoga', 'yoga'], ['Garden Design', 'gardens'], ['Vets', 'vets'], ['Print Shop', 'print'], ['Driving School', 'driving'], ['Brewery', 'brewery'], ['Architects', 'architects']];
const banks: [string, string][] = [['Pennant Bank', 'pennantbank'], ['Wealdstone Building Society', 'wealdstone'], ['Albion Mutual', 'albionmutual'], ['Harbourside Bank', 'harbourside'], ['Northgate Bank', 'northgatebank']];
const registrars: [string, string][] = [['NameHarbour', 'nameharbour'], ['Domainwell', 'domainwell'], ['Clearname Registry', 'clearname'], ['Fieldfare Domains', 'fieldfare'], ['Inkwell Names', 'inkwellnames']];
const oldHosts: [string, string][] = [['Pinfold Hosting', 'pinfoldhosting'], ['Blue Lantern Web', 'bluelanternweb'], ['Kestrelnet', 'kestrelnet'], ['Webbery', 'webbery'], ['Larchmont Servers', 'larchmont']];
const authorities: [string, string][] = [['Northwall PKI', 'northwall-pki.example'], ['Trustpoint CA', 'trustpoint-ca.example'], ['Sentinel Certs', 'sentinel-certs.example']];
const helpers = ['our web designer', 'my son', 'our IT contractor', 'the agency that built the site', 'my business partner', 'a friend who does our IT'];
const whens = ['this afternoon', 'tomorrow', 'at the weekend', 'on Monday', 'later this week'];
const dones = ['this morning', 'last night', 'yesterday afternoon', 'an hour ago'];
const idns: [string, string][] = [['bäckerei-sommer.example', 'xn--bckerei-sommer-5hb.example'], ['café-lumière.example', 'xn--caf-lumire-66ag.example'], ['müller-umzüge.example', 'xn--mller-umzge-thbi.example'], ['señora-tapas.example', 'xn--seora-tapas-2db.example'], ['høstfjord-design.example', 'xn--hstfjord-design-5tb.example'], ['brûlerie-dupont.example', 'xn--brlerie-dupont-1rb.example']];
const intlNames: [string, string, string][] = [['Łukasz', 'Wróbel', '?ukasz Wróbel'], ['Tomáš', 'Dvořák', 'Tomáš Dvo?ák'], ['Ayşe', 'Kılıç', 'Ay?e K?l?ç'], ['Zsófia', 'Kőváry', 'Zsófia K?váry'], ['Mirosław', 'Szczęsny', 'Miros?aw Szcz?sny'], ['Dragoș', 'Țurcanu', 'Drago? ?urcanu']];

type Kind = 'account' | 'charges' | 'certs' | 'tls' | 'dns' | 'bounce' | 'browser' | 'payment' | 'log' | 'plans' | 'html';
type End = 'fixed' | 'owe' | 'work' | 'need' | 'team' | 'drop' | 'need>fixed' | 'fixed>owe' | 'work>owe' | 'team>fixed';
interface Path {
	/** What the accounts team finds. */
	find: string;
	/** The ways a ticket on this path can end. */
	ends: End[];
	/** The output the accounts team pastes on this path. */
	art: Kind;
	/** Log lines for this path, when they differ from the topic's. */
	logs?: string[];
	/** The fix and the customer's thanks on this path, when they differ from the topic's. */
	fix?: string;
	fixed?: string;
}
interface Topic {
	key: string;
	weight: number;
	plan?: 'starter' | 'business';
	/** Organisations that are not small businesses: their name and domain stem. */
	org?: [string, string][];
	/** The customer has an account but no plan yet. */
	noPlan?: boolean;
	/** What the customer has to do is usually done by whoever does their technical work. */
	helped?: boolean;
	subjects: string[];
	opens: string[];
	more: string[];
	/** Support's first answer to the customer. */
	tries: string;
	ask: string;
	replies: string[];
	/** Support's note when it escalates. */
	note: string;
	paths: Path[];
	/** A further question the accounts team asks the customer, and the customer's answer. */
	ask2: string;
	reply2: string;
	/** What the accounts team adds about the service, whichever path the ticket takes. */
	detail: string;
	/** The cause as support explains it to the customer, one per path. */
	says: string[];
	fix: string;
	fixed: string;
	/** Support's answer when nothing will change: a workaround or a no. */
	work: string;
	/** What Oakhurst will do, as a phrase after "we need to" or "they are going to". */
	owe: string;
	/** What the customer has to do, as a phrase after "you'll need to". */
	need: string;
	team: string;
	/** Why the ticket goes to that team. */
	away: string;
	/** Why the customer withdraws, as a clause. */
	drop: string;
	/** Output the customer pastes, and output support pastes when it escalates. */
	art: { customer?: Kind; note: Kind };
	logs: string[];
}

// Slots in topic text: {first} {site} {site2} {plan} {price} {sub} {sub2} {email} {company} {domain} {weekday} {n}
// {total} {time} {bank} {po} {vat} {address} {charity} {registrar} {old} {ca} {caDomain} {idn} {puny} {intlName}
// {mangled} {migDate} {origYear} {oldNo} {serial} {month} {date} {last4} {clientEmail} {helper}.
const topics: Topic[] = [
	{
		key: 'double',
		weight: 4,
		subjects: ['Charged twice for the {plan} plan', 'Two payments taken on my card', 'Why have you taken {price} twice?'],
		opens: [
			"I signed up for the {plan} plan this morning and my banking app shows two payments of {price} to Oakhurst, a minute apart. The page sat on a spinning wheel after I pressed Pay, so I pressed it again. I only want one plan, for {site}. Please can you refund the second one.",
			"We moved {site} over to you on {weekday}. When I checked the business account today there were two identical card payments of {price}, both to Oakhurst. I'm fairly sure I only paid once, although the payment page did freeze for a while and I may have clicked the button again when it came back.",
			"My card has been charged {price} two times for what should be one {plan} plan. I've attached a photo of the statement; both lines say OAKHURST ACCTS. Our bookkeeper spotted it and wants it put right before she closes this month's books."
		],
		more: ["The confirmation email only came through once, which is why I didn't notice straight away.", "I was on the train when I did it, so the signal may have dropped for a moment.", "If it helps, the last four digits of the card are {last4}."],
		tries: "I can see your account and the {plan} plan on it. Before I pass this on, it would help to know whether both payments are complete. Banks sometimes show a payment that was started and then dropped as if it had gone through, and it disappears by itself after a few days.",
		ask: "Could you check whether both payments show as completed in your banking app, or whether one of them is still marked as pending?",
		replies: ["Both say completed, not pending. Same amount, same time give or take a minute.", "One of them says pending and the other has gone through, if that makes a difference.", "They both look the same to me. The app doesn't say pending on either."],
		note: "Customer reports two card payments of {price}. I haven't touched anything on the account. The admin screen below is what I see.",
		paths: [
			{ find: "There are two subscriptions on this account, {sub} and {sub2}, created 40 seconds apart, each with its own first charge. The checkout makes a new subscription every time the form is posted, so a second press of Pay after the page stalls gives a second subscription and a second charge.", ends: ['fixed', 'owe', 'team', 'fixed>owe', 'team>fixed', 'fixed'], art: 'log', logs: ['checkout msg="subscription created" subscription={sub} plan={planCode} account={acc}', 'billing msg="charge created" subscription={sub} amount_pence={pence}', 'checkout msg="subscription created" subscription={sub2} plan={planCode} account={acc}', 'billing msg="charge created" subscription={sub2} amount_pence={pence}'] },
			{ find: "Only one subscription here, {sub}, and only one charge on our side. The second line the customer sees is a card authorisation that was started when the page stalled and never captured. It should drop off their statement by itself.", ends: ['work', 'drop'], art: 'payment', logs: ['checkout msg="subscription created" subscription={sub} plan={planCode} account={acc}', 'checkout msg="provider slow" subscription={sub} waited_ms=41200', 'billing msg="charge created" subscription={sub} amount_pence={pence}'] }
		],
		ask2: "Did the payment page show an error after you first pressed Pay, or did it just keep spinning?",
		detail: "For the record, the checkout posts the form and waits for the payment provider before it answers, and on a slow connection that can take most of a minute. Nothing on the page stops a second press in that time.",
		says: ["When you pressed Pay the second time, our checkout treated it as a new order and set up a second plan, with its own payment.", "We only took one payment. The second line your bank shows is a hold that was placed when the page stalled, and it was never collected."],
		reply2: "It just kept spinning. No error, nothing. After about half a minute it came back to the Pay button, so I pressed it again.",
		fix: "I've cancelled {sub2}, the duplicate, and finance have refunded its charge in full to the card it came from. {sub} is untouched.",
		fixed: "The refund has come through, thank you. One plan, one payment, as it should be.",
		work: "The second line on your statement is a hold your bank placed when the payment page stalled, not a payment we've taken. We only have the one payment on our side. The hold will disappear by itself, usually within five working days, and you don't need to do anything.",
		owe: "cancel the duplicate subscription and refund its charge once finance have signed it off",
		need: "send us the date and the last four digits of the card for both payments, so that finance can match them",
		team: 'finance',
		away: "The duplicate subscription is cancelled; the refund itself has to come from finance.",
		drop: "the second payment has disappeared from my statement this morning, so it must have been a hold after all",
		art: { note: 'charges' },
		logs: []
	},
	{
		key: '3ds',
		weight: 4,
		noPlan: true,
		subjects: ['Payment keeps failing', 'Card declined but my bank says it is fine', 'Cannot pay for the {plan} plan'],
		opens: [
			"I've been trying to pay for the {plan} plan since yesterday and every time it fails with 'Your card was declined'. My bank says they can't see any declined payment at all, and the card works everywhere else. I've tried three times now and I'm worried I'll be charged for each attempt.",
			"The checkout page asks me to confirm the payment with my bank, a box opens, and then it just goes blank. After a minute I get 'Payment could not be completed'. I've done this on my laptop and on my phone. {site} is supposed to move over to you this week.",
			"Our office manager has been trying to buy the {plan} plan with the company card. She gets as far as the security check, nothing appears in her banking app, and then the page says the card was declined. It's a business debit card, if that makes any difference."
		],
		more: ["I don't have another card I can use for the business.", "The bank's app is the kind where you approve payments with your fingerprint. Nothing has popped up at all.", "I have an ad blocker and a privacy extension in the browser, if that's relevant."],
		tries: "Sorry this has been a struggle. Nothing has been taken from your card for the failed attempts, so you won't be charged several times. The usual cause is the bank's security check not opening properly. Could you try once more in a private window, or in a different browser, with any ad blockers switched off?",
		ask: "If it fails again, could you tell me the exact message on screen and roughly what time you tried?",
		replies: ["Tried in a private window, same thing. The message was 'Your card was declined (authentication_required)'. It was about {time}.", "A different browser made no difference. The box opened, went white, and then I got the declined message again, at about {time}.", "Same again at {time}, this time on my phone with nothing installed. 'Payment could not be completed.'"],
		note: "Customer can't complete payment; it fails at the bank's security step. Tried a private window and a second browser. Nothing has been taken. The subscription is waiting on its first charge.",
		paths: [
			{ find: "The payment provider shows each attempt as needing authentication, and the challenge was never completed: the bank's page loaded inside our checkout and then nothing came back. Our checkout opens the challenge in a frame, and this bank's challenge page refuses to load inside a frame on another site. Two other customers of the same bank have hit it this month.", ends: ['owe', 'work', 'fixed', 'work>owe', 'fixed>owe', 'team'], art: 'payment', logs: ['billing msg="charge requires action" subscription={sub} amount_pence={pence} reason=authentication_required', 'checkout msg="challenge frame opened" subscription={sub} issuer={bankCode}', 'billing msg="charge failed" subscription={sub} reason=challenge_not_completed'] },
			{ find: "The provider's log is clear on this one: the bank declined the payment outright with a fraud code, before any security check was attempted. That decision is the bank's, and nothing in our checkout would change it.", ends: ['need', 'drop', 'need>fixed'], art: 'log', fix: "The customer's next attempt went through: {sub} has its first charge and the plan is active.", fixed: 'The bank lifted the block and the payment went through. Thanks for your help.', logs: ['checkout msg="charge started" subscription={sub} amount_pence={pence}', 'billing msg="charge failed" subscription={sub} reason=card_declined code=suspected_fraud', 'billing msg="charge failed" subscription={sub} reason=card_declined code=suspected_fraud'] }
		],
		ask2: "Which bank is the card with, and do they usually ask you to approve payments in an app or by text message?",
		detail: "The checkout hands the security check to the payment provider, which loads the bank's own page. We don't see what happens inside it, only whether it came back.",
		says: ["Your bank's security check is meant to open in a window of its own, and our checkout was trying to show it inside our payment page, where your bank doesn't allow it. So the check never appeared, and the payment was refused.", "Your bank declined the payment before its security check even started, which usually means their fraud checks stopped it. We can't see why, and only the bank can lift it."],
		reply2: "It's with {bank}. Normally I approve payments in their app with my fingerprint, and that works for everything else I buy.",
		fix: "The checkout now opens the bank's check in a window of its own instead of inside our page, for every bank. I tested with a card from the same bank and the payment went through.",
		fixed: "That worked first time. The bank's window opened, I approved it, and the payment has gone through. Thank you.",
		work: "While we look into this, you can pay by bank transfer instead. If you reply with the name the invoice should go to, our finance team will send you an invoice with our bank details, and we'll set your plan up as soon as the payment arrives.",
		owe: "change the checkout so that the bank's security check opens in its own window, which this bank needs",
		need: "call {bank} and ask them to release the block on payments to Oakhurst, then try the payment once more",
		team: 'finance',
		away: "Finance can take this customer's payment by bank transfer while the card route is broken for their bank.",
		drop: "we've paid with a personal card in the end and I'll claim it back on expenses",
		art: { customer: 'browser', note: 'charges' },
		logs: []
	},
	{
		key: 'invoice',
		weight: 3,
		noPlan: true,
		org: [["St Aidan's Primary School", 'staidans-school'], ['Harwood Parish Council', 'harwood-pc'], ['Millbrook Academy Trust', 'millbrook-trust'], ['Eastfield Community Library', 'eastfield-library'], ['Coldharbour Town Council', 'coldharbour-tc']],
		subjects: ['Paying by invoice', 'Purchase order for hosting', 'We cannot pay by card'],
		opens: [
			"I'm the business manager at {company}. Our finance rules don't let us pay by card. We need an invoice made out to us, with our purchase order number on it, and we pay by bank transfer on our usual terms. Your sign-up page only offers card payment. How do we buy the {plan} plan?",
			"We've been asked to move our website to you. We can only pay against an invoice, and our clerk needs a purchase order number on it before she can raise payment. Is that something you can do?",
			"Our accounts department has refused the card payment request for the {plan} plan. They need a proper invoice with a purchase order number, addressed to {company}, and they'll pay by transfer. Can you set us up that way?"
		],
		more: ["Our purchase order number is {po}.", "We'd want the invoice to go to our accounts inbox, not to me.", "The site is {site}, and it stays with our current host until we've paid you."],
		tries: "Thanks for explaining. Card payment is the only option on the sign-up page at the moment, but we do have customers who pay by invoice. I'll check with our accounts team how to set that up for you.",
		ask: "Could you send me the purchase order number and the address the invoice should be made out to?",
		replies: ["The purchase order number is {po}, and the invoice should be addressed to {company}, Finance Office. I can send the full postal address if you need it.", "PO number {po}. Address it to the accounts department at {company}, please, and send it to accounts@{domain}."],
		note: "Customer wants to pay by invoice and bank transfer, with a purchase order number. Sign-up only takes cards. I've told them we'll check how to do it.",
		paths: [
			{ find: "A subscription here can only start with a card charge: first_charge takes the plan's price on the start date and the checkout collects it by card, and there's no other way to pay inside the service. Finance can raise a manual invoice outside it, and we can then create the subscription by hand and mark its first charge as paid when the transfer lands.", ends: ['team', 'owe', 'fixed', 'team>fixed', 'need', 'drop'], art: 'charges' }
		],
		ask2: "Do you need the purchase order number on every invoice, or only on the first one?",
		detail: "We've had a handful of these from schools and councils since the summer. Each one is done by hand at the moment: finance raise the invoice, and we create the subscription once the money is in.",
		says: ["Our sign-up only takes cards at the moment, so for invoices our finance team raises one by hand, and we set up your plan once the payment arrives."],
		reply2: "On every invoice, please. Our finance office won't pay anything without the number on it.",
		fix: "Finance raised the invoice with the purchase order number on it, the transfer arrived this morning, and I've created {sub} by hand with its first charge marked as paid.",
		fixed: "Lovely, I can see the plan on our account now. Thanks for sorting it out.",
		work: "",
		owe: "set up the plan by hand as soon as finance have sent the invoice and the transfer has arrived",
		need: "pay the invoice finance sent you by bank transfer, quoting the invoice number, so that we can start your plan",
		team: 'finance',
		away: "Finance handle invoices for customers who can't pay by card; they'll raise one with the purchase order number.",
		drop: "we've been told to keep the site with our current host after all",
		art: { note: 'account' },
		logs: ["checkout msg=\"plan selected\" plan={planCode} account={acc}", "checkout msg=\"checkout abandoned\" account={acc} step=card"]
	},
	{
		key: 'wrongplan',
		weight: 3,
		plan: 'business',
		subjects: ['Bought the wrong plan', 'Refund please, wrong plan', 'I meant to choose Starter'],
		opens: [
			"I've just signed up and realised I picked Business instead of Starter. I've only got the one website, {site}, so I don't need ten sites. Can you swap me to Starter and refund the difference?",
			"My husband set up our account last night and chose the {plan} plan, which is far more than we need for one small website. Could you change it to Starter and give us back the difference? We haven't put anything on it yet.",
			"I clicked the wrong plan at checkout. I wanted the one for a single site, and I've been charged {price}. Please change it and refund what I've overpaid."
		],
		more: ["The difference is £96, if I've done the sums right.", "I'd rather not cancel and start again in case it affects the domain.", "Nothing has been uploaded to the account yet."],
		tries: "No problem, this is easy to put right. I'll ask our accounts team to change the plan on your subscription to Starter and arrange a refund of the difference.",
		ask: "Could you confirm that {site} is the only site you want on the account?",
		replies: ["Yes, just {site}. That's the only one.", "Just the one, {site}. If we ever need another we'll move up then."],
		note: "Customer bought Business by mistake and wants Starter and the difference back, £96. One site on the account.",
		paths: [
			{ find: "The plan on {sub} can be changed in place, but the charge that was taken stays as it was: nothing in the service changes a charge after it's paid. So the plan change is ours and the £96 refund is finance's.", ends: ['fixed', 'team', 'owe', 'drop', 'team>fixed'], art: 'charges' }
		],
		ask2: "Have you added any other site or domain since you signed up? A Starter plan only allows one.",
		detail: "Plan changes straight after paying come up every few weeks. The plan is one field on the subscription; it's the money that needs finance, because the service never changes a charge once it's paid.",
		says: ["We can change the plan straight away, but the payment you made can't be changed in our system, so the difference comes back to you as a separate refund from our finance team."],
		reply2: "No, nothing else. Just {site}.",
		fix: "I've changed {sub} from business to starter, and finance have refunded the £96 difference to the card it was paid with.",
		fixed: "I can see the refund on my statement, and the account says Starter. Thank you for being so quick.",
		work: "",
		owe: "change the plan to Starter and refund the £96 difference once finance have signed it off",
		need: "",
		team: 'finance',
		away: "I've switched the plan to Starter. The £96 refund is finance's to make.",
		drop: "we've had a think and we'll keep Business, as we're planning a second site for the café",
		art: { note: 'account' },
		logs: ["checkout msg=\"plan selected\" plan=business account={acc}", "billing msg=\"charge created\" subscription={sub} amount_pence={pence}"]
	},
	{
		key: 'move',
		weight: 2,
		org: [['Pixel & Pine', 'pixelandpine'], ['Brightwork Digital', 'brightwork-digital'], ['Cranfield Web Studio', 'cranfield-web'], ['Hedgerow Creative', 'hedgerow-creative']],
		subjects: ['Move a site to my client', 'Transfer a subscription to my client', 'Wrong account for {site}'],
		opens: [
			"I run a small web design studio. I set up {site} for a client on our own Oakhurst account and paid for a {plan} plan for it. The client now wants to pay for it themselves and have it under their own login. Can you move the subscription across to their account without taking the site down?",
			"We bought hosting for one of our customers, {site}, on our agency account by mistake. It should have been on theirs. They've now made their own account. Could you move it?"
		],
		more: ["The client's email is {clientEmail}.", "There are two other client sites on our account that should stay where they are.", "The client is happy to pay from now on, so it's only the move we need."],
		tries: "Thanks for the details. Moving a subscription between accounts isn't something we can do from the support screens, so I'll pass this to our accounts team.",
		ask: "Could you send me the email address your client signed up with, and confirm which subscription is theirs?",
		replies: ["Their email is {clientEmail}, and it's the subscription for {site}. The others stay with us.", "Client email: {clientEmail}. The one to move is {site}; please don't touch anything else."],
		note: "Agency wants {site}'s subscription moved from their account to their client's. The client has their own account now. Support can't move subscriptions.",
		paths: [
			{ find: "A subscription belongs to whoever's email is on it, so moving one means changing the email on the subscription and on its charges. There's no tool for that yet; I'd do it with a one-off script against the database, after a backup.", ends: ['fixed', 'owe', 'fixed>owe'], art: 'account' },
			{ find: "The client's email doesn't match any account here. Either they signed up with a different address or the sign-up never finished, and I can't move anything to an account that doesn't exist.", ends: ['need', 'need>fixed', 'drop'], art: 'account' }
		],
		ask2: "Is your client happy for their own card to be used from now on, or should anything be refunded to you first?",
		detail: "This is the third agency asking for a move since the summer. Every one has been done by hand, and each time I've had to check the charges by eye afterwards.",
		says: ["Each plan belongs to the email address it was bought with, and moving it to another account is something we have to do by hand on our side.", "We can only move a plan to an account that exists, and we can't find one for your client's address yet."],
		reply2: "From now on is fine. We won't be paying for it any more either way.",
		fix: "{sub} now belongs to the client's account, with its charges, and the agency's account no longer shows it. The site itself wasn't touched.",
		fixed: "My client can see it in their account now, and it's gone from ours. Perfect, thanks.",
		work: "",
		owe: "move the subscription to the client's account with a one-off script, as there's no tool for it yet",
		need: "ask your client to finish signing up with {clientEmail} and confirm their email address, so that there's an account to move the subscription to",
		team: '',
		away: '',
		drop: "the client has decided they'd rather we kept looking after it for them",
		art: { note: 'account' },
		logs: ["admin msg=\"subscription lookup\" subscription={sub} account={acc} sites=1", "admin msg=\"account lookup\" email={clientEmail}"]
	},
	{
		key: 'receipts',
		helped: true,
		weight: 4,
		subjects: ['No receipt for my payment', 'Receipts not arriving', 'Where are my receipts?'],
		opens: [
			"I paid for the {plan} plan on {weekday} and never got a receipt. I've checked spam. Our accountant needs one for every payment, so please could you send it again?",
			"None of the emails from Oakhurst about payments reach us. No welcome email, no receipt, nothing. Your other emails, the newsletter for example, arrive fine. It's only the billing ones.",
			"Our bookkeeper says she has no receipt for the {price} we paid you. I've searched my inbox for 'Oakhurst' and found nothing since we signed up."
		],
		more: ["Our email is run by our IT company.", "My colleague, who uses a personal address, gets your emails fine.", "We have quite strict spam settings because of a phishing scare in the spring."],
		tries: "Sorry about that. I can see the payment, and our records show a receipt being sent to {email}. I've resent it just now.",
		ask: "Could you check your inbox, your junk folder and any quarantine your IT company runs, and tell me whether the resent receipt arrives?",
		replies: ["Nothing has arrived, not even in junk.", "Still nothing. I've asked our IT company to check their quarantine, and they say they can't see anything from you either."],
		note: "Billing emails aren't reaching the customer, and the receipt I resent hasn't arrived either. Other Oakhurst emails do reach them.",
		paths: [
			{ find: "Our mail logs show every receipt bounced at their mail server with a policy rejection. Receipts go out from billing@oakhurst-hosting.example, which their filter refuses; the newsletter comes from a different sender, which is why that arrives. Nothing is wrong with the receipts themselves.", ends: ['need', 'team', 'need>fixed', 'work', 'drop'], art: 'bounce', logs: ['billing msg="charge created" subscription={sub} amount_pence={pence}', 'receipts msg="receipt sent" subscription={sub} to={email}', 'mail msg="delivery failed" to={email} status=5.7.1 remote=inbound.{filter}.example'] },
			{ find: "No bounces at all. We never sent them: the receipt job skipped this subscription because its email address has a space at the end, from when support set it up by hand, and the mail library refuses the address without saying so.", ends: ['fixed', 'owe', 'fixed>owe'], art: 'log', logs: ['billing msg="charge created" subscription={sub} amount_pence={pence}', 'receipts msg="receipt skipped" subscription={sub} reason="invalid recipient"'] }
		],
		ask2: "Has anything changed with your email recently, such as a new spam filter or a new email provider?",
		detail: "Receipts are sent by a small job after each charge, from their own sender address, separate from the marketing emails, so the two can behave differently at the customer's end.",
		says: ["Our receipts are leaving us, but your email system is turning them away: it's set to refuse messages from the address our receipts come from.", "The problem was on our side: a stray space in the email address on your plan meant our system never sent the receipts."],
		reply2: "Our IT company did move us to a new filtering service a couple of months ago.",
		fix: "I've removed the stray space from the email address on {sub} and resent every receipt for it. The mail log shows them delivered.",
		fixed: "Got them all, three emails just now. Thank you!",
		work: "As a workaround, I've attached a PDF copy of each receipt to this reply, and we can do the same for future payments until the emails get through.",
		owe: "fix the receipt job so that it reports addresses it can't send to, and send the receipts it skipped",
		need: "ask your IT company to let emails from billing@oakhurst-hosting.example through their filter",
		team: 'the mail team',
		away: "The receipts leave us fine and are refused by the customer's filtering service. The mail team can check our sender settings with that provider.",
		drop: "our IT company found them all in a quarantine folder nobody knew about",
		art: { note: 'charges' },
		logs: []
	},
	{
		key: 'vat',
		weight: 4,
		subjects: ['VAT invoice needed', 'Invoice missing our VAT number', 'Receipt not valid for our accounts'],
		opens: [
			"The receipt you send has no VAT number of yours, no company address of ours and no breakdown of the VAT. Our accountant says she can't reclaim the VAT without a proper VAT invoice. Can you send one for the {price} we paid?",
			"We're VAT registered and need invoices with our company name, address and VAT number on them. Your receipts only show my email address and the amount. How do I add our details?",
			"I've looked all over the account page for somewhere to put our company details for invoices, and there isn't anywhere. Our auditors have queried the Oakhurst payment because the receipt is addressed to an email address, not to the company."
		],
		more: ["Our VAT number is GB {vat}.", "The registered address is {address}.", "We'd need the same for every payment from now on."],
		tries: "Thanks for getting in touch. You're right that our receipts don't show your company details at the moment. I'll check with our accounts team what we can do about this payment.",
		ask: "Could you send me your company name, registered address and VAT number as they should appear?",
		replies: ["{company}, {address}. VAT number GB {vat}.", "Company: {company}. Address: {address}. VAT: GB {vat}. Thanks."],
		note: "Customer needs a full VAT invoice with their company details. Our receipts only carry the email address and the amount.",
		paths: [
			{ find: "Right: the subscription holds an email address and nothing else about the customer, so a receipt has nothing more to print. There's nowhere to keep a company name, an address or a VAT number. Finance can issue a manual VAT invoice for this payment; storing the details properly is a change for us.", ends: ['owe', 'team', 'work', 'work>owe', 'team>fixed', 'drop'], art: 'charges' }
		],
		ask2: "Would a PDF invoice by email do, or does a paper copy need to be posted?",
		detail: "Four of these this quarter, all asking for the same three things: a company name, an address and a VAT number. Finance are doing them by hand each time.",
		says: ["Our receipts can only show the email address on your plan at the moment, because there's nowhere in our system to keep your company details. Our finance team can issue a full VAT invoice by hand."],
		reply2: "A PDF by email is fine.",
		fix: "Finance have issued a VAT invoice with the customer's company name, address and VAT number for the payment on {sub}, and I've attached the PDF to the subscription's notes so that support can resend it.",
		fixed: "That's exactly what our accountant needed. Thank you.",
		work: "For this payment, our finance team will send you a full VAT invoice by email with your company details on it. For later payments, reply to the receipt and ask, and we'll do the same.",
		owe: "add company details and a VAT number to subscriptions, so that every receipt is a proper VAT invoice",
		need: '',
		team: 'finance',
		away: "Finance can issue a manual VAT invoice for this payment.",
		drop: "our accountant has found that the bank statement and the receipt together are enough for her",
		art: { note: 'account' },
		logs: ["receipts msg=\"receipt sent\" subscription={sub} to={email}", "admin msg=\"note added\" subscription={sub} note=\"manual VAT invoice requested\""]
	},
	{
		key: 'dispute',
		weight: 3,
		subjects: ['Unknown payment OAKHURST ACCTS', 'Who is OAKHURST ACCTS?', 'Disputed payment'],
		opens: [
			"There's a payment of {price} on my card statement to 'OAKHURST ACCTS' and I don't know what it is. I've asked my bank to dispute it. If it's yours, what is it for?",
			"Our bank has written to say that a payment to you has been disputed. I think my business partner didn't recognise the name on the statement and reported it. We do want to keep our hosting! What happens now?",
			"I was going through the company card statement and found {price} to OAKHURST ACCTS. We use Oakhurst for {site}, but the name doesn't match and I can't find a receipt. Is this you?"
		],
		more: ["The payment was on {date}.", "My bank says the dispute can take a few weeks.", "I'm worried the website will be switched off while this goes on."],
		tries: "Yes, OAKHURST ACCTS is us: it's the name our payments appear under, and the payment is for the {plan} plan for {site}. I'm sorry for the confusion.",
		ask: "Has a dispute been opened with your bank, and if so, would you like to keep the plan and withdraw it?",
		replies: ["Yes, I opened a dispute last week. I'll withdraw it, we definitely want to keep the hosting.", "My partner opened one. We'd like to keep the plan, so please tell us how to stop the dispute."],
		note: "Customer didn't recognise OAKHURST ACCTS on their statement and a dispute has been opened. They want to keep the plan.",
		paths: [
			{ find: "The charge on {sub} is marked as disputed by the provider, which holds everything else on the account's payments until it's settled. The statement name, OAKHURST ACCTS, is set in the accounts service, and nobody recognises it: three of this month's disputes are the same story.", ends: ['owe', 'team', 'need', 'need>fixed', 'fixed', 'drop'], art: 'payment' }
		],
		ask2: "Have you had a letter from your bank yet about the outcome of the dispute?",
		detail: "While a dispute is open the provider freezes the charge, and the account shows it as disputed until the bank decides. Finance answer disputes; we only see the state.",
		says: ["Our payments appear on statements under a name, OAKHURST ACCTS, that doesn't make it clear they're from us, which is how the dispute started."],
		reply2: "Not yet. The bank says it will write within a few weeks.",
		fix: "New payments now show as OAKHURST HOSTING on statements. Finance confirm the dispute on {sub} has been withdrawn and the payment stands.",
		fixed: "Thanks. The bank has confirmed the dispute is closed, and the site's still up.",
		work: '',
		owe: "change the name our payments show on statements from OAKHURST ACCTS to OAKHURST HOSTING",
		need: "ask your bank to withdraw the dispute, and let us know once they've confirmed it",
		team: 'finance',
		away: "Disputes are handled by finance with the payment provider; they'll send the evidence and deal with the bank.",
		drop: "the bank has already closed the dispute after I rang them and explained",
		art: { note: 'charges' },
		logs: ["billing msg=\"charge disputed\" subscription={sub} reason=unrecognised", "billing msg=\"charge held\" subscription={sub} until=dispute_closed"]
	},
	{
		key: 'charity',
		weight: 2,
		noPlan: true,
		org: [['Riverside Food Bank', 'riverside-foodbank'], ['Hillcrest Wildlife Rescue', 'hillcrest-rescue'], ['The Lantern Youth Club', 'lantern-youth'], ['Northgate Carers Network', 'northgate-carers']],
		subjects: ['Charity discount?', 'Do you offer discounts for charities?', 'Pricing for a registered charity'],
		opens: [
			"We're a small registered charity and we'd like to move our website to you. Do you offer any discount for charities on the {plan} plan? {price} a year is a lot for us, and other hosts we've looked at have charity pricing.",
			"I volunteer for {company}. Before we sign up, is there any reduced price for charities or community groups? Our registered charity number is {charity}."
		],
		more: ["We have one site and very few visitors.", "We could put a 'hosted by Oakhurst' link on the site, if that helps.", "Our treasurer has to approve any spending over £40."],
		tries: "Thanks for asking. I'll check with the team whether we can do anything for charities.",
		ask: "Could you send your registered charity number so that I can include it when I ask?",
		replies: ["Our registered charity number is {charity}.", "Of course, it's {charity}, registered in England and Wales."],
		note: "Charity asks for a discount on {plan}. Registered charity number {charity}. We don't list any charity pricing.",
		paths: [
			{ find: "There's no discount anywhere in the service: a plan has one price, in plans.py, and the checkout charges exactly that. Anything special would be a sales decision and then a manual arrangement through finance.", ends: ['work', 'team', 'owe', 'drop'], art: 'plans' }
		],
		ask2: "How many sites would the charity need?",
		detail: "We've had a few of these. There's nothing to configure: a plan is a code, a name, a price and a number of sites, and the checkout takes the price as it stands.",
		says: ["Our plans have one price each, and our system has no discounts in it. A special price would need our sales team to agree it and our finance team to set it up by hand."],
		reply2: "Just the one, the charity's website.",
		fix: '',
		fixed: '',
		work: "I'm afraid we don't offer charity pricing at the moment. The Starter plan at £48.00 is our lowest price, and it covers one site, which sounds like all you need.",
		owe: "reply once sales have decided whether to offer charity pricing",
		need: '',
		team: 'sales',
		away: "Discounts are a sales decision, not something the accounts service can do. Passing to sales.",
		drop: "the committee has agreed to the normal price, so I'll go ahead and sign up",
		art: { note: 'plans' },
		logs: ["http method=GET path=/plans status=200 ms={ms}", "checkout msg=\"plan selected\" plan=starter account={acc}"]
	},
	{
		key: 'twosites',
		weight: 3,
		plan: 'starter',
		subjects: ['Second site on Starter', 'Can I add a shop to my plan?', 'Site limit reached'],
		opens: [
			"I have {site} on the Starter plan and I'd like to add a small online shop on a separate domain. When I try to add it, it says I've reached the limit for my plan. Business is three times the price for ten sites I'll never use. Is there anything in between?",
			"Is there a way to have two websites without paying for Business? I have my main site on Starter and I'd like a separate one for my workshops. Two sites, not ten."
		],
		more: ["The second site would be tiny, a single page really.", "I'd be happy to pay a bit more, just not three times as much.", "Would a subdomain of my main site count as a second site?"],
		tries: "Thanks for getting in touch. Starter covers one site and Business covers up to ten, so adding a second site does mean moving to Business at the moment. I'll check with the team whether there's another option.",
		ask: "Could you tell me the domain of the second site, so that I can include it?",
		replies: ["It's {site2}.", "The new one would be {site2}."],
		note: "Starter customer wants a second site without moving to Business. We have nothing between one site and ten.",
		paths: [
			{ find: "Each plan has a fixed number of sites, Starter 1 and Business 10, and the limit is checked when a site is added. A subdomain is a site like any other. A plan in between would be a new plan in plans.py and a pricing decision.", ends: ['work', 'team', 'owe', 'drop', 'work>owe'], art: 'plans' }
		],
		ask2: "Would the second site be on a domain of its own, or on part of your first one?",
		detail: "This is the commonest plans question in the queue. People want two or three sites, and the step from one to ten at three times the price puts them off.",
		says: ["Each of our plans comes with a set number of sites, one for Starter and ten for Business, and there's nothing in between at the moment."],
		reply2: "Its own domain, {site2}.",
		fix: '',
		fixed: '',
		work: "We don't have a plan between Starter and Business at the moment. If you'd like a second site, the Business plan at £144.00 covers it, and I can switch you whenever you're ready.",
		owe: "send word once there's a decision on a plan for two or three sites",
		need: '',
		team: 'sales',
		away: "A plan between the two is a pricing question for sales; there are a few of these requests now.",
		drop: "I've decided to put the workshops on a page of my main site instead",
		art: { note: 'account' },
		logs: ["admin msg=\"site refused\" account={acc} site={site2} reason=\"plan limit\" limit=1"]
	},
	{
		key: 'agency',
		weight: 2,
		plan: 'business',
		org: [['Pixel & Pine', 'pixelandpine'], ['Brightwork Digital', 'brightwork-digital'], ['Cranfield Web Studio', 'cranfield-web'], ['Hedgerow Creative', 'hedgerow-creative']],
		subjects: ['More than 10 sites on Business', 'Need room for more sites', 'Agency pricing'],
		opens: [
			"We're an agency with ten client sites on your Business plan, and we've just won {n} more. The limit is 10. Do we have to open a second account, or can you raise the limit for us? We'd be happy to pay for the extra sites.",
			"We look after websites for local businesses and we're about to go over the 10 sites on Business. Having two accounts would be a pain for our bookkeeping. Is there an agency plan, or a way to buy extra sites?"
		],
		more: ["Some of the client sites are very small, holding pages really.", "We'd prefer to make one payment for everything.", "We expect to reach about twenty sites by the spring."],
		tries: "Thanks for letting us know, and congratulations on the new clients. Business covers up to 10 sites. I'll check what we can do for you.",
		ask: "How many sites in total would you need to start with?",
		replies: ["{total} to start with, and probably more later.", "We'd need {total} straight away."],
		note: "Agency at the 10-site limit on Business wants more sites on one account. Asking for {total}.",
		paths: [
			{ find: "The limit is the plan's: Business is 10 sites, set in plans.py, and the check runs when a site is added. There's no way to give one account more without a new plan. A second Business account works today, with two separate payments.", ends: ['work', 'team', 'owe', 'work>owe'], art: 'plans' }
		],
		ask2: "Could the new client sites live on a second account, if there were no other way?",
		detail: "Agencies are a small group but they bring a lot of sites. Two Business accounts work, but every report and every payment then comes in twice.",
		says: ["The Business plan allows ten sites, and that limit is part of the plan itself, so going beyond it means either a second account or a special arrangement through our sales team."],
		reply2: "If there's no other way, yes, but it's not what we want.",
		fix: '',
		fixed: '',
		work: "The quickest way today is a second Business account for the new sites. It means two separate payments, but each covers up to 10 sites.",
		owe: "set up a plan with room for more sites on one account, and move the account onto it",
		need: '',
		team: 'sales',
		away: "This would be a custom arrangement; sales can quote for it.",
		drop: '',
		art: { note: 'account' },
		logs: ["admin msg=\"site refused\" account={acc} site={site2} reason=\"plan limit\" limit=10"]
	},
	{
		key: 'vatprice',
		weight: 3,
		subjects: ['Price on website is not what I paid', 'Charged more than the advertised price', 'Starter price confusion'],
		opens: [
			"Your website says the Starter plan is £40, but I was charged £48.00, and the account page says £48.00 a year. Where has the extra £8 come from?",
			"The pricing page shows Business at £120. My card was charged £144.00. Nobody mentioned VAT at checkout. Is that what the difference is?",
			"We chose you partly on price, and the price on your pricing page isn't the price you charged. I'd like an explanation, and a refund of the difference if the advertised price is the right one."
		],
		more: ["I'm not VAT registered, so I can't claim it back.", "I took a screenshot of the pricing page when I signed up.", "Checkout didn't show any breakdown, just the total."],
		tries: "Thanks for raising this. Our plan prices include VAT in the account and at checkout, and I think the pricing page may be showing them without VAT. Let me check with the team.",
		ask: "Could you send the screenshot of the pricing page you saw?",
		replies: ["Screenshot attached. It says 'Starter £40'. No mention of VAT that I can see.", "Attached. Business, £120. Nothing about VAT next to it."],
		note: "Customer was charged the price including VAT, £48 or £144, but the pricing page shows £40 and £120 without saying VAT is extra.",
		paths: [
			{ find: "Our side is consistent: the plans hold prices including VAT, and checkout, receipts and the account page all show those. The pricing page is the marketing site, which the web team own, and it shows prices without VAT and doesn't say so.", ends: ['team', 'work', 'drop'], art: 'plans' },
			{ find: "Our account page and checkout show the price including VAT with no breakdown, which is half the problem: nothing on our side says VAT is included. The figures themselves are right.", ends: ['owe', 'fixed', 'fixed>owe'], art: 'html' }
		],
		ask2: "Did you sign up from our pricing page, or from a link somewhere else?",
		detail: "The plans hold one price each, with VAT in it. Nothing in the service knows the price before VAT; whatever shows a lower figure is working it out for itself.",
		says: ["The pricing page shows our prices before VAT without saying so, while checkout and the account page show the full price including VAT.", "The amount is right, but our account page and checkout show it without saying that VAT is included, which is confusing."],
		reply2: "From the pricing page, I think. I clicked 'Choose Starter' there.",
		fix: "The account page and checkout now say 'including VAT' next to every price, with the VAT amount on a line of its own.",
		fixed: "That's much clearer, thanks. I wish it had said so when I signed up, but fine.",
		work: "The price you paid is right: our plans cost £48.00 and £144.00 including VAT, which is £40.00 and £120.00 before VAT. The pricing page should have made that clear, and I've passed that on.",
		owe: "show that prices include VAT, with the VAT amount, on the account page and at checkout",
		need: '',
		team: 'the web team',
		away: "The pricing page is the web team's, not ours. Passing it on so they can add 'plus VAT' or show the full price.",
		drop: "our bookkeeper has explained the VAT to me, so there's no need to do anything",
		art: { note: 'account' },
		logs: ["checkout msg=\"charge created\" subscription={sub} amount_pence={pence}", "http method=GET path=/account account={acc} status=200 ms={ms}"]
	},
	{
		key: 'www',
		helped: true,
		weight: 4,
		subjects: ['Not secure warning on www', 'Certificate error on www.{site}', 'SSL works without www but not with it'],
		opens: [
			"Since we moved to you, {site} shows the padlock but www.{site} gives a big 'Your connection is not private' warning. Most of our customers type the www, and the address on our printed flyers has it too.",
			"Our site works fine at {site}, but anyone going to the www version gets a security warning saying the certificate is for a different site. We had no problem with this at our old host.",
			"Customers are telling me our website is 'unsafe'. I tried it myself: the address without www is fine, the one with www has a certificate warning. Please fix this quickly, it's putting people off ordering."
		],
		more: ["The www address is supposed to send people on to the plain one.", "It's the same on phones and computers.", "Our old host's certificate covered both, I'm sure of it."],
		tries: "Thanks for the report. I can see the same thing from here: the certificate on {site} looks fine, and the www address shows the warning.",
		ask: "Do you want both addresses to work, or would you be happy with everything going to {site}?",
		replies: ["Both, please. People type both, and the flyers say www.", "Both have to work. We don't mind which one people end up on, but neither should show a warning."],
		note: "www.{site} shows a certificate name warning; the plain domain is fine. Customer needs both to work.",
		paths: [
			{ find: "Each certificate covers exactly one domain: issue_certificate takes a single domain, so {site} got a certificate and www.{site} has none. The only way today is a second certificate for the www name.", ends: ['fixed', 'owe', 'fixed>owe', 'fixed', 'need>fixed'], art: 'certs' },
			{ find: "We issued a certificate for www.{site} as well, and it's fine. Their DNS sends the www name to their old host, though, so visitors get the old host's certificate, which is for another name entirely.", ends: ['need', 'team', 'drop'], art: 'dns' }
		],
		ask2: "Has anyone changed your domain's settings since you moved to us?",
		detail: "www is the commonest certificate ticket we get, by a distance. Every site added without its www name ends up here sooner or later, usually when someone prints a flyer.",
		says: ["Our certificates cover one address each, and yours was issued for the address without www, so visitors using www saw a warning.", "Our certificate is fine for both addresses, but your domain settings still send the www address to your old host, so visitors using it see your old host's certificate."],
		reply2: "Not that I know of. {helper} did the move and hasn't touched anything since.",
		fix: "I've issued a second certificate, for www.{site}, and the site now shows the padlock on both names.",
		fixed: "Both work now, with and without www. Thank you!",
		work: '',
		owe: "let one certificate cover several names, so that the www name doesn't need a ticket of its own, and issue one for www.{site} meanwhile",
		need: "change the DNS record for www.{site} at your domain provider so that it points to us and not to your old host",
		team: 'the platform team',
		away: "Our certificate is fine; the www name's DNS points elsewhere. The platform team can go through the DNS settings with the customer.",
		drop: "{helper} has sorted the DNS and the warning has gone",
		art: { customer: 'tls', note: 'certs' },
		logs: ["certs msg=\"certificate issued\" domain={site} serial={serial}", "tls msg=\"no certificate for name\" sni=www.{site} served={site}", "tls msg=\"no certificate for name\" sni=www.{site} served={site}"]
	},
	{
		key: 'caa',
		helped: true,
		weight: 3,
		subjects: ['Certificate not issued', 'Still no padlock after a week', 'HTTPS not working on our new site'],
		opens: [
			"We moved {site} to you {n} days ago and it still has no certificate. The site loads over http, but https gives an error. Your help page said a certificate would be issued automatically within an hour.",
			"The dashboard says the certificate for {site} is 'pending' and it's been like that since {weekday}. Is something stuck?",
			"Our https address doesn't work at all, just an error. Everything else about the move went fine."
		],
		more: ["Our domain is registered with {registrar}, and they host the DNS.", "We had a paid certificate from our old host.", "Our IT contractor set up the domain years ago and I don't know what's in it."],
		tries: "Thanks for letting us know. A certificate is normally issued within an hour, so something has stopped it. I'll ask our accounts team, who look after certificates, to check.",
		ask: "Do you know whether anyone has set up security records on the domain, for example for your old certificate provider?",
		replies: ["No idea, I'm afraid. Our IT contractor set it all up.", "Possibly. The old host did a lot of things to our DNS that I never looked at."],
		note: "No certificate issued for {site} after several days. The customer's DNS is with {registrar}.",
		paths: [
			{ find: "Issuing failed every time for the same reason: the domain has a CAA record that allows only {ca} to issue certificates for it, so our issuer is refused. That record is in the customer's DNS. Once they add one for us, the next attempt will go through.", ends: ['need', 'need>fixed', 'drop', 'team', 'need>fixed'], art: 'dns' }
		],
		ask2: "Who looks after your domain's settings, so that we know who to explain this to?",
		detail: "The issuer tries again every few hours and gets the same refusal each time. It doesn't tell anyone, which is why the customer found out first.",
		says: ["Your domain has a security record that says only one other company, {ca}, may issue certificates for it, so our requests are refused."],
		reply2: "That'd be {helper}. I can pass on whatever you need.",
		fix: "The CAA record for our issuer is in place, the certificate for {site} was issued on the next attempt, and https works.",
		fixed: "The padlock is there now. Thanks for explaining what was wrong.",
		work: '',
		owe: '',
		need: "add a CAA record to {site} that allows our issuer, oakhurst-hosting.example, alongside or instead of the existing one",
		team: 'the platform team',
		away: "This is the customer's DNS; the platform team can walk them through the CAA record.",
		drop: "we've decided to keep the site with our old host for now",
		art: { note: 'certs' },
		logs: ["certs msg=\"issue requested\" domain={site} account={acc}", "certs msg=\"issuer refused request\" domain={site} reason=\"caa forbids issuer\"", "certs msg=\"retry scheduled\" domain={site} in=4h"]
	},
	{
		key: 'oldhost',
		helped: true,
		weight: 4,
		subjects: ['SSL certificate wrong', 'Certificate warning since moving to you', 'Site shows a security error'],
		opens: [
			"We moved {site} to you last week. Some people see the new site with a padlock, but others, including me at home, get a certificate warning and the old site behind it. I assumed your certificate wasn't working.",
			"Since the move, our website shows a certificate warning that names {old}, our previous host. Surely that should have changed by now? Your certificate should be the one showing.",
			"The certificate on {site} is wrong. When I click the warning it says it was issued to {old}. We left them weeks ago."
		],
		more: ["I cleared my browser cache and it made no difference.", "It's fine on my phone on mobile data, wrong on the office wifi.", "We still have a few weeks left on our contract with {old}."],
		tries: "Thanks for the details. Our certificate for {site} has been issued and looks right from here, so what you're seeing may be coming from somewhere else. I'll ask the accounts team to confirm.",
		ask: "Could you tell me who your domain is registered with, and whether anything was changed there during the move?",
		replies: ["It's registered with {registrar}. {helper} changed something there when we moved, I think.", "{registrar}. I didn't change anything myself; the move was done with your migration tool."],
		note: "Customer sees a certificate warning naming {old}, their old host. Our certificate for {site} is issued.",
		paths: [
			{ find: "Our certificate is fine and so is the site on our side. The domain still has an A record pointing at {old}'s server alongside ours, so some visitors land on the old host and get its certificate. That's DNS, not a certificate problem.", ends: ['need', 'team', 'need>fixed', 'drop', 'need'], art: 'dns' }
		],
		ask2: "Is your old site still switched on at {old}?",
		detail: "These come up after almost every move where the customer edits the DNS themselves. The migration tool adds our record but doesn't remove theirs.",
		says: ["Your domain still points to two places, us and {old}. Visitors who are sent to {old} see their certificate, which is for another name."],
		reply2: "I think so. We haven't cancelled with them yet.",
		fix: "The old A record has gone, and every lookup now answers with our address. I've checked from three networks and all of them get our certificate.",
		fixed: "It's working everywhere now, at home and in the office. Thank you.",
		work: '',
		owe: '',
		need: "remove the old A record pointing to {old} at {registrar}, so that only our address is left",
		team: 'the platform team',
		away: "Nothing for accounts here: our certificate is right and the DNS is the problem. The platform team help customers with DNS during moves.",
		drop: "it has started working for everyone since this morning, so I think something just needed time",
		art: { customer: 'tls', note: 'certs' },
		logs: ["certs msg=\"certificate issued\" domain={site} serial={serial}", "http method=GET path=/ host={site} status=200 ms={ms}"]
	},
	{
		key: 'idn',
		weight: 2,
		subjects: ['Certificate for a domain with an accent', 'No HTTPS for {idn}', 'Error with the special letter in our domain'],
		opens: [
			"Our domain has an accented letter in it, {idn}. The site works, but there's no certificate, and the dashboard shows an error when it tries to issue one. The plain version without the accent, which we also own, has a certificate.",
			"We bought {idn} because that's how our name is spelled. Your system won't create a certificate for it. Is this not supported?"
		],
		more: ["Our previous host managed it, so it must be possible.", "The error message says 'invalid domain'.", "Customers mostly type the version without accents, but we print the proper spelling on our vans."],
		tries: "Thanks for letting us know. Domains with accents should work, so this looks like something on our side. I'll pass it to our accounts team.",
		ask: "Could you confirm exactly how the domain is spelled, including the accented letters?",
		replies: ["It's {idn}, exactly like that.", "{idn}. The accent is part of our name."],
		note: "Certificate issuing fails for a domain with an accented letter, {idn}. The plain spelling of the same name works.",
		paths: [
			{ find: "issue_certificate passes the domain through as typed, so the issuer is sent {idn} with the accented letter in it and refuses it. It needs the ASCII form, {puny}. Domains added that way work, which is why the plain spelling was fine.", ends: ['fixed', 'owe', 'work', 'work>owe'], art: 'log' }
		],
		ask2: "Did you add the domain with the accent, or in the form that starts xn--?",
		detail: "Browsers convert these names silently, so nobody notices until something on our side passes the name on exactly as it was typed.",
		says: ["Our system sent your domain to the certificate issuer with the accented letter in it, and the issuer only accepts the technical form, which starts xn--."],
		reply2: "With the accent. I didn't know there was another form.",
		fix: "Domains are now converted to their ASCII form before issuing, and the certificate for {idn} ({puny}) has been issued.",
		fixed: "The padlock shows on our proper domain now. Thank you!",
		work: "While we fix this, you can add the domain to your account in its technical form, {puny}, which browsers treat as the same address, and a certificate will be issued for it straight away.",
		owe: "convert domains with accented letters to their technical form before issuing a certificate",
		need: '',
		team: '',
		away: '',
		drop: '',
		art: { note: 'certs' },
		logs: ['certs msg="issue requested" domain={idn} account={acc}', 'certs msg="issuer refused request" domain={idn} reason="invalid domain"', 'certs msg="issue requested" domain={site} account={acc}', 'certs msg="certificate issued" domain={site} serial={serial}']
	},
	{
		key: 'byo',
		weight: 2,
		subjects: ['Upload our own certificate', 'Can we use our own organisation certificate?', 'Bring my own SSL'],
		opens: [
			"Our payment provider insists we use an organisation-validated certificate with our company name in it, which we've bought from {ca}. How do we upload it for {site}? I can't find the option.",
			"We've paid for a certificate from another provider and it has plenty of time left on it. Can we install it on our site with you instead of the one you issue?"
		],
		more: ["We have the certificate file and the private key.", "Our insurer asked for the company name to be in the certificate.", "It has to be in place before our audit in {month}."],
		tries: "Thanks for asking. We issue and manage the certificates for sites on our hosting, and I'm not sure we can install one from elsewhere. I'll check.",
		ask: "Who has asked for the organisation certificate, and is there a date it needs to be in place by?",
		replies: ["Our payment provider's security review asked for it. They want it by the end of {month}.", "Our insurer. They haven't given a hard date, but soon."],
		note: "Customer wants to install their own organisation-validated certificate on {site} instead of ours.",
		paths: [
			{ find: "We can't: certificates for customer sites are only ever ones we issue ourselves, and there's nowhere to keep someone else's certificate or key in the service. The platform team can sometimes install one by hand on the load balancer, as a special arrangement.", ends: ['work', 'team', 'owe', 'drop'], art: 'certs' }
		],
		ask2: "Would your payment provider accept a standard certificate if we explained how ours are issued?",
		detail: "The service only knows the certificates it issues itself. There's no place in it for a key someone else holds, and I wouldn't want one.",
		says: ["We only use certificates we issue ourselves, and our system has no way to hold a certificate or key from another provider."],
		reply2: "I can ask them. They weren't very flexible last time.",
		fix: '',
		fixed: '',
		work: "I'm afraid we can only use certificates we issue ourselves. They secure the connection in exactly the same way, but they don't show your company name. Other customers in your position have asked their partner to accept a standard certificate, and most partners have.",
		owe: "reply once the platform team have said whether they can install the certificate by hand",
		need: '',
		team: 'the platform team',
		away: "Only the platform team can install a certificate from another issuer, by hand, as a one-off.",
		drop: "our payment provider has confirmed a standard certificate is fine after all",
		art: { note: 'account' },
		logs: ["certs msg=\"certificate issued\" domain={site} serial={serial}", "admin msg=\"upload refused\" account={acc} reason=\"external certificates not supported\""]
	},
	{
		key: 'serial',
		weight: 2,
		subjects: ['Two certificates with the same serial number', 'Duplicate certificate serial flagged by our scanner', 'Security scan warning about serial numbers'],
		opens: [
			"Our security scanner flagged {site}: it saw two different certificates with the same serial number on the same day. I understand serials should be unique. Is something wrong with your certificates?",
			"We run a monitoring service that watches certificates for our domains. On {weekday} it raised an alert: two certificates for {site}, both issued by you, with identical serial numbers but different keys. Our security lead wants an explanation."
		],
		more: ["We'd added a second site that morning, which may be related.", "The scanner's report says duplicate serials can be grounds for revocation.", "We have to report security alerts to our client within a few days."],
		tries: "Thanks for the detailed report. I'll pass this to our accounts team, who run certificate issuing.",
		ask: "Could you send the two serial numbers from the scanner's report?",
		replies: ["Both are {serial}. Issued about two hours apart.", "The report shows {serial} twice, with different fingerprints."],
		note: "Customer's scanner found two certificates for {site} with the same serial, {serial}, issued on the same day.",
		paths: [
			{ find: "The serial is the first 16 characters of a hash of the domain and the issue date, so a certificate issued again for the same domain on the same day gets the same serial. That's what happened here: support reissued it after the customer added a site.", ends: ['owe', 'fixed', 'work', 'work>owe', 'fixed>owe'], art: 'log' }
		],
		ask2: "Does your client need a written explanation from us for their report?",
		detail: "The hash was chosen so that a serial could be worked out again from the domain and the day, which was handy in testing. Nobody thought about a second certificate on the same day.",
		says: ["Our serial numbers are made from the domain and the day a certificate is issued, so the second certificate issued for your domain that day got the same serial as the first."],
		reply2: "A short paragraph would help, yes.",
		fix: "Serials now include a random part, so a reissue on the same day gets a serial of its own. I've reissued {site}'s certificate and revoked both of the old ones.",
		fixed: "The scanner's happy now and our security lead has closed the alert. Thanks for the explanation.",
		work: "This happened because the certificate was issued twice for the same domain on the same day. Both certificates are ours and the connection is secure. We'll avoid reissuing on the same day for your domain, so your scanner shouldn't see it again.",
		owe: "make certificate serials unique even when a domain gets two certificates on the same day, and reissue the affected certificate",
		need: '',
		team: '',
		away: '',
		drop: '',
		art: { note: 'certs' },
		logs: ['certs msg="certificate issued" domain={site} serial={serial}', 'admin msg="site added" account={acc} site={site2}', 'certs msg="reissue requested" domain={site} by=support', 'certs msg="certificate issued" domain={site} serial={serial}']
	},
	{
		key: 'mixed',
		helped: true,
		weight: 3,
		subjects: ['Padlock missing even with a certificate', 'Not fully secure warning', 'Browser says parts of the page are not secure'],
		opens: [
			"You've issued a certificate for {site} and https works, but the browser still doesn't show the padlock; it shows a little warning instead. Your certificate can't be set up properly.",
			"Some pages of our site show 'Not fully secure' in Firefox. The home page is fine. Is the certificate only covering some pages?"
		],
		more: ["The site was built with WordPress years ago.", "Our web designer is no longer around to ask.", "The pages with the warning are the ones with photos of our products."],
		tries: "Thanks for the report. The certificate covers the whole site, every page, so the warning is probably about something on those pages themselves. I'll check.",
		ask: "Could you send me the address of one page that shows the warning?",
		replies: ["This one: https://{site}/products. The warning is on all the product pages.", "https://{site}/gallery is one of them."],
		note: "Certificate for {site} issued and working; the customer still sees 'not fully secure' on some pages.",
		paths: [
			{ find: "The certificate is fine. Those pages load their images from http:// addresses, so the browser marks them as only partly secure. That's in the site's own content, nothing we control.", ends: ['work', 'need', 'team', 'drop'], art: 'browser' }
		],
		ask2: "Can you still sign in to your site's admin pages?",
		detail: "These come in after most moves of older WordPress sites. The certificate is never the problem; the image addresses were written years ago with http in them.",
		says: ["Some images on those pages are loaded from addresses that start http:// rather than https://, so your browser marks the page as only partly secure. The certificate itself is working."],
		reply2: "Yes, I have the WordPress login.",
		fix: '',
		fixed: '',
		work: "The certificate is working properly. The warning appears because some images on those pages are loaded from addresses starting http:// instead of https://. Changing those addresses in your site will make the warning go away, and there are WordPress plugins that can do it for you.",
		owe: '',
		need: "change the image addresses on those pages from http:// to https://, or ask whoever maintains the site to do it",
		team: 'the platform team',
		away: "Nothing wrong with the certificate. The platform team offer a paid site tidy-up and can quote for fixing the content.",
		drop: "a friend who builds websites has fixed the image links for us",
		art: { customer: 'browser', note: 'certs' },
		logs: ["certs msg=\"certificate issued\" domain={site} serial={serial}", "http method=GET path=/products host={site} status=200 ms={ms}"]
	},
	{
		key: 'oldemail',
		weight: 3,
		subjects: ['Account page still shows my old email', 'Changed my email but the account shows the old one', 'Old address on the account page'],
		opens: [
			"I changed my email address in the sign-in settings {n} days ago. I sign in with the new one fine, but the account page still shows the old address, and receipts still go there. I no longer have access to that inbox.",
			"My account page shows an email address I stopped using. I updated it when I signed in, it said 'Saved', but the account page hasn't changed."
		],
		more: ["The old address was at my previous job.", "I've signed out and in again several times.", "The sign-in settings page shows the new address correctly."],
		tries: "Thanks for letting us know. I can see the new address in the sign-in system, but the account page and billing are still using the old one. I'll pass this to the accounts team.",
		ask: "Could you confirm the new address you'd like us to use for receipts?",
		replies: ["The new one is {email}. Please stop using the old one.", "{email}, please."],
		note: "Email changed in the sign-in system, but the account page and receipts still use the old address.",
		paths: [
			{ find: "The account page reads the email from the account record, which is copied from the sign-in system once a night, and the copy only adds new accounts; it never updates an existing one. So an email change in sign-in never reaches us.", ends: ['fixed', 'owe', 'fixed>owe'], art: 'log' },
			{ find: "The account record here has the new address. It's the sign-in team's copy of the account that still has the old one, and that's what the page header and the receipts read from.", ends: ['team', 'team>fixed'], art: 'account' }
		],
		ask2: "Roughly when did you change the address? It helps us find it in our records.",
		detail: "The nightly copy was written for new sign-ups, when accounts were only ever created, never changed. Anyone who changes their email after signing up is affected.",
		says: ["When you change your email in the sign-in settings, the change isn't passed on to the part of our system that runs the account page and receipts.", "Our records have your new address, but the sign-in system's copy of your account still has the old one, and that's what the page and receipts use."],
		reply2: "It was on {weekday}, around lunchtime.",
		fix: "I've updated the email on the account and the subscription by hand, and changed the nightly copy so that it updates existing accounts as well as adding new ones.",
		fixed: "The account page shows the right address now, and the test receipt arrived. Thanks.",
		work: '',
		owe: "make the nightly copy from the sign-in system update existing accounts, and correct the email on this account in the meantime",
		need: '',
		team: 'the sign-in team',
		away: "Our record is right; it's the sign-in team's copy that has the old address.",
		drop: '',
		art: { note: 'account' },
		logs: ['jobs msg="nightly account copy started" source=signin', 'jobs msg="account exists, skipped" account={acc}', 'jobs msg="nightly account copy finished" added={n} skipped=4812']
	},
	{
		key: 'encoding',
		weight: 2,
		subjects: ['My name shows as question marks', 'Name displayed wrongly on the account page', 'Strange characters in my name'],
		opens: [
			"My name is {intlName}, but your account page shows it as {mangled}. It's the same on the receipts. It looks careless, and my clients see the receipts.",
			"On the account page my name appears with question marks where the special letters should be. It's spelled {intlName}."
		],
		more: ["I typed it correctly when I signed up.", "It shows correctly in the sign-in settings.", "This is the only website that gets it wrong."],
		tries: "Sorry about that, I can see the problem. I'll ask the accounts team to correct it.",
		ask: "Could you confirm the exact spelling you'd like us to show?",
		replies: ["{intlName}, exactly as I typed it.", "It should be {intlName}."],
		note: "A name with accented letters shows as question marks on the account page and the receipts: {mangled} instead of {intlName}.",
		paths: [
			{ find: "The name was stored wrongly when the account was imported from the old system: the import read the old export as Latin-1, so every letter outside it became a question mark. The page shows what's stored. Around {total}0 imported accounts have the same problem.", ends: ['fixed', 'owe', 'fixed>owe'], art: 'account' }
		],
		ask2: "Were you a customer before we moved to the new accounts system?",
		detail: "The import ran once, last summer, from a CSV the old system wrote. It assumed one encoding for the whole file, which was right for most names and wrong for these.",
		says: ["When accounts were moved from our old system, names with certain letters were read wrongly and stored with question marks in their place."],
		reply2: "Yes, for years.",
		fix: "I've corrected the name on this account from the old system's export, and the page and receipts now show it properly.",
		fixed: "It's right now, thank you.",
		work: '',
		owe: "re-import the names of the affected accounts from the old system's export, read with the right encoding",
		need: '',
		team: '',
		away: '',
		drop: '',
		art: { note: 'account' },
		logs: ["import msg=\"account imported\" account={acc} source=old-system", "import msg=\"replaced characters\" account={acc} field=name count=2"]
	},
	{
		key: 'a11y',
		weight: 2,
		subjects: ['Account page and screen readers', 'Accessibility problem on the account page', 'Cannot read my plan details with a screen reader'],
		opens: [
			"I'm blind and use a screen reader. On your account page the details come out as a run of words with no labels, so I hear 'Starter, £48.00 a year' without knowing which item it belongs to. Could this be made accessible?",
			"I use a screen reader. Your account page is the hardest part of your site for me: the labels and the values are read as separate items, and there's no heading I can jump to."
		],
		more: ["Everything else on your site is fine.", "I'd be happy to test any changes.", "I'm a long-standing customer and I'd like to manage my own account without help."],
		tries: "Thank you for telling us, and sorry for the trouble. I've passed this to the team who look after the account page.",
		ask: "Which screen reader and browser do you use, so that the team can test with the same?",
		replies: ["VoiceOver with Safari on a Mac.", "NVDA with Firefox on Windows."],
		note: "Screen reader user can't tell which value belongs to which label on the account page.",
		paths: [
			{ find: "The page is one definition list with no heading, and some screen readers don't tie each value to its label. It needs a proper heading, and the list grouped so that each label is announced with its value.", ends: ['fixed', 'owe', 'fixed>owe'], art: 'html' }
		],
		ask2: "Would you be willing to try a test version of the page before it goes live?",
		detail: "The page is a few lines of HTML built in render_account_page. Nobody has tried it with a screen reader since it was written.",
		says: ["The account page doesn't tie each label to its value in a way every screen reader understands, and it has no heading to jump to."],
		reply2: "Yes, happily. Send me a link.",
		fix: "The account page now has a heading for the details, and each label is read together with its value. Tested with VoiceOver and NVDA.",
		fixed: "That's much better. I can hear each label with its value now. Thank you for fixing it properly.",
		work: '',
		owe: "rework the account page so that each label is announced with its value, with a test version to try first",
		need: '',
		team: '',
		away: '',
		drop: '',
		art: { note: 'account' },
		logs: ["http method=GET path=/account account={acc} status=200 ms={ms}"]
	},
	{
		key: 'membersince',
		weight: 2,
		subjects: ['Member since date is wrong', "We've been with you longer than that", 'Account page says I joined recently'],
		opens: [
			"The account page says 'Member since {migDate}'. We've been customers since {origYear}, long before your new system. It's a small thing, but it matters to us: we've been loyal for a long time.",
			"My account page claims I've been a member since {migDate}. That's when you moved everyone to the new accounts system, not when I joined. Can it show the real date?"
		],
		more: ["Our original account number started with OH.", "I have invoices from {origYear} if you need proof.", "Several friends who host with you have noticed the same."],
		tries: "Thanks for pointing this out, and for being with us so long. I'll ask the accounts team whether the original date can be shown.",
		ask: "Do you have your original account number from the old system, or an early invoice?",
		replies: ["The old number was OH-{oldNo}.", "Yes, account OH-{oldNo}. I have the first invoice too."],
		note: "Member since shows the migration date, {migDate}; the customer joined in {origYear}. Old account OH-{oldNo}.",
		paths: [
			{ find: "When accounts were moved to this system, signed_up_on was set to the day of the move for everyone, not to the original sign-up date. The old system's export does have the real dates.", ends: ['fixed', 'owe', 'drop', 'fixed>owe'], art: 'account' }
		],
		ask2: "Would you like the original date shown, even though it comes from the old system?",
		detail: "Everyone who moved across shows a day in June or July 2025 as their sign-up date. It's the thing long-standing customers mention most when they ring.",
		says: ["When accounts were moved to our new system, the day of the move was recorded as everyone's sign-up date, instead of the date each customer joined."],
		reply2: "Yes please, that's the whole point.",
		fix: "I've set signed_up_on for this account from the old system's records, and the page now shows the original date.",
		fixed: "It shows {origYear} now. Thank you, that's made my day.",
		work: '',
		owe: "fill in the original sign-up dates from the old system's export for every account that was moved",
		need: '',
		team: '',
		away: '',
		drop: "it's not worth the trouble, I just wanted you to know",
		art: { note: 'account' },
		logs: ["import msg=\"account imported\" account={acc} source=old-system signed_up_on={migIso}"]
	},
	{
		key: 'planshown',
		weight: 2,
		plan: 'business',
		subjects: ['Account page shows the wrong plan', 'I moved up to Business but it still says Starter', 'Plan on my account is wrong'],
		opens: [
			"Your support team moved me up to Business over the phone on {weekday}, and the payment went through, but the account page still says Starter, £48.00 a year. Have I got Business or not?",
			"The account page says I'm on Starter, but I'm paying for Business and I can add more sites. Which is right?"
		],
		more: ["I can add sites, so I think I do have Business.", "My colleague says hers shows Business.", "It's confusing when I'm checking what we pay for."],
		tries: "Thanks for flagging this. I can see a Business subscription on your account, so you do have Business. I'll get the page corrected.",
		ask: "Has anyone else with access to the account changed anything recently?",
		replies: ["No, just me.", "Only me and my business partner, and she hasn't touched it."],
		note: "Subscription is Business, the account page shows Starter. The plan was changed by phone by support.",
		paths: [
			{ find: "The plan is stored twice, once on the subscription and once on the account record, and the account page reads the account record. The phone change only touched the subscription.", ends: ['fixed', 'owe', 'fixed>owe'], art: 'account' }
		],
		ask2: "Have you noticed anything else on the account page that looks out of date?",
		detail: "Plan changes made by support go through the admin tool, which updates the subscription. The account record was never part of that.",
		says: ["Your plan is recorded in two places in our system, and the change made over the phone only updated one of them, so the account page showed the old plan."],
		reply2: "No, everything else looks right.",
		fix: "I've corrected the plan on the account record, and the page now reads the plan from the subscription, so the two can't disagree again.",
		fixed: "It says Business now. Thanks.",
		work: '',
		owe: "make the account page read the plan from the subscription, and correct this account in the meantime",
		need: '',
		team: '',
		away: '',
		drop: '',
		art: { note: 'charges' },
		logs: ["admin msg=\"plan changed\" subscription={sub} from=starter to=business by=support", "http method=GET path=/account account={acc} status=200 ms={ms}"]
	},
	{
		key: 'delete',
		weight: 2,
		subjects: ['Please delete my account', 'Close my account and delete my data', 'Data deletion request'],
		opens: [
			"I've closed my business and moved the website elsewhere. Please close my Oakhurst account and delete all my personal data, as is my right under GDPR.",
			"I'd like my account and everything you hold about me deleted. I'm no longer a customer."
		],
		more: ["Please confirm in writing when it's done.", "I no longer have a site with you.", "I think I had two accounts, one under an old email."],
		tries: "Thanks for letting us know. We'll take care of this for you.",
		ask: "Could you confirm the email address on the account, and whether any sites are still active on it?",
		replies: ["The email is {email}. There are no sites on it now.", "{email}. The site moved away last month."],
		note: "Customer asks for their account to be closed and their personal data deleted.",
		paths: [
			{ find: "We can close the account and stop any charges on our side, but deletion requests go to the privacy team, who check identity and what we have to keep for tax records before anything is deleted.", ends: ['team', 'need', 'team>fixed'], art: 'account' }
		],
		ask2: "Would you like copies of your old receipts before anything is deleted?",
		detail: "Deletion is the privacy team's decision, not ours: they decide what goes and what has to stay for the tax records, and then we close the account.",
		says: ["Deleting personal data is handled by our privacy team, who need to check that the request is really from you and what we're required to keep."],
		reply2: "No thank you, I have everything I need.",
		fix: "Privacy have confirmed the request. I've closed the account and cancelled its subscription; they've deleted the personal data apart from the invoice records we have to keep.",
		fixed: "Thank you for confirming.",
		work: '',
		owe: '',
		need: "reply from the email address on the account to confirm the request, so that the privacy team can verify it's you",
		team: 'the privacy team',
		away: "Deletion requests belong to the privacy team; they check identity and what we must keep.",
		drop: '',
		art: { note: 'account' },
		logs: ["admin msg=\"account closure requested\" account={acc} by=support", "billing msg=\"no open charges\" account={acc}"]
	},
	{
		key: 'locked',
		weight: 3,
		subjects: ["Can't get into my account", 'Locked out after losing my phone', 'Account locked'],
		opens: [
			"I've lost my phone, which had the authentication app on it, and now I can't sign in to my account. I need to get in to check our payment details.",
			"After a few wrong passwords my account says it's locked. The reset email never arrives.",
			"I can't sign in. It says my account is locked. Has my account been suspended because of a payment?"
		],
		more: ["I still have access to my email.", "I set up two-step sign-in years ago and forgot about it.", "My business partner can sign in to her own login fine."],
		tries: "Sorry you're locked out. Sign-in problems are handled by a different team, but let me check what I can see first.",
		ask: "Could you confirm the email address you sign in with?",
		replies: ["{email}.", "It's {email}."],
		note: 'Customer locked out of sign-in. The account and subscription look fine from here; nothing is suspended.',
		paths: [
			{ find: "Nothing wrong on our side: the account and subscription are in good standing, and nothing is suspended. The lock is in the sign-in system, which we can't touch.", ends: ['team', 'need', 'drop', 'team'], art: 'log' }
		],
		ask2: "Do you still have the recovery codes from when you set up two-step sign-in?",
		detail: "Locked accounts reach us because customers see their account page and their payments as one thing. They're separate systems, run by separate teams.",
		says: ["Your account and plan are fine and nothing is suspended. The lock is in our sign-in system, which is run separately."],
		reply2: "I might have, somewhere. I'll look.",
		fix: '',
		fixed: '',
		work: '',
		owe: '',
		need: "use the 'Can't use your authenticator?' link on the sign-in page, which sends a recovery link to your email",
		team: 'the sign-in team',
		away: "This is the sign-in system's lock; the sign-in team can verify the customer and unlock it.",
		drop: "I found my recovery codes in a drawer and I'm back in",
		art: { note: 'account' },
		logs: ['http method=GET path=/account account={acc} status=200 ms={ms}', 'auth msg="session missing" path=/account redirect=signin', 'billing msg="subscription in good standing" subscription={sub}']
	},
	{
		key: 'domainfix',
		helped: true,
		weight: 2,
		subjects: ['Typo in our domain', 'Certificate for the wrong domain', 'I spelled our domain wrong when signing up'],
		opens: [
			"When I signed up I typed our domain as {typo} instead of {site}. Everything was set up for the wrong name, including the certificate, and now the real domain shows a warning. Can you change it?",
			"Our site is {site}, but the certificate you issued is for {typo}, which isn't even our domain. I think I made a typo when I added the site. How do I fix it without starting again?"
		],
		more: ['Nobody owns the misspelt domain, as far as I know.', 'Our emails and flyers all use the correct spelling.', "I'd rather not delete the site, as the designer has already uploaded everything."],
		tries: "Thanks for explaining. I can see the site on your account under {typo}. Changing the domain of a site isn't something I can do from the support screens, so I'll ask the accounts team.",
		ask: 'Can you confirm the correct domain, exactly as it should be?',
		replies: ["It's {site}. Sorry for the trouble.", '{site}, no other spelling.'],
		note: 'Customer added their site as {typo}, a typo for {site}, and the certificate was issued for the typo. They want the domain changed without losing the site.',
		paths: [
			{ find: "A site's domain is fixed when it's added: the certificate was issued for {typo} at that moment, and there's no way to rename a site afterwards. What I can do is add {site} as a site with the same files, issue its certificate, and then remove the misspelt one.", ends: ['fixed', 'owe', 'need>fixed', 'fixed>owe'], art: 'certs' }
		],
		ask2: "Is there anything on the misspelt site that isn't on your real one, such as email addresses?",
		reply2: "No, it's all the same. Nothing uses the misspelt name.",
		detail: 'We get a typo like this every month or so. The sign-up form takes the domain as typed and never checks that it points anywhere.',
		says: ["The domain of a site is set when it's added, and the certificate is issued for that name, so the misspelt name went into everything and can't simply be edited."],
		fix: "I've added {site} with the same files, its certificate has been issued, and the misspelt site has been removed. The padlock shows on the real domain.",
		fixed: "It's all working on the right domain now. Thanks, and sorry for the typo!",
		work: '',
		owe: "move the site to the correct domain by hand and issue its certificate, as a site's domain can't be changed directly",
		need: 'point {site} at us at your domain provider, so that the certificate for the correct name can be issued',
		team: '',
		away: '',
		drop: '',
		art: { note: 'certs' },
		logs: ['admin msg="site added" account={acc} site={typo}', 'certs msg="certificate issued" domain={typo} serial={serial}', 'tls msg="no certificate for name" sni={site} served=default']
	},
	{
		key: 'currency',
		weight: 2,
		subjects: ['Can I pay in euros?', 'Charged in pounds, I am in Ireland', 'Currency of my payment'],
		opens: [
			"We're based in Galway, and our card was charged {price} in pounds. Our bank added a foreign transaction fee on top. Is it possible to pay you in euros instead?",
			'I run a small business in Cork. Your prices are only in pounds, and every payment costs me an extra fee from my bank. Do you have euro pricing?'
		],
		more: ["The fee was about €3, which isn't much, but it's one more line on our accounts.", 'Our accountant would like all supplier payments in euros if possible.', 'Other hosts we have used let us choose the currency.'],
		tries: "Thanks for asking. Our plans are priced in pounds at the moment. I'll check with the team whether there's anything we can do.",
		ask: 'Was the payment made with a business card or a personal one?',
		replies: ['A business debit card, from an Irish bank.', 'My personal credit card, which I use for the business too.'],
		note: 'Customer in Ireland asks to pay in euros; their bank charges a foreign transaction fee on our payments in pounds.',
		paths: [
			{ find: "Every price in the service is in pence: the plans, the charges and the receipts all assume pounds, and there's no currency anywhere in the data. Offering euros would mean a second price for each plan and a currency on every charge.", ends: ['work', 'team', 'owe', 'drop'], art: 'plans' }
		],
		ask2: 'Would you still want euros if it meant a slightly different price from the one in pounds?',
		reply2: "Yes, as long as it's close. It's the bank fee I'm trying to avoid.",
		detail: 'We have a few dozen customers in Ireland and a handful elsewhere in Europe. The fee is their bank\'s, not ours, but it reaches us as a complaint.',
		says: ['Our plans are priced and charged only in pounds, so your bank converts each payment and adds its own fee.'],
		fix: '',
		fixed: '',
		work: "I'm afraid we can only take payments in pounds at the moment. Some banks and card providers don't charge a fee for payments in other currencies, so it may be worth checking whether yours offers a card like that.",
		owe: 'send word if prices in euros are ever offered',
		need: '',
		team: 'sales',
		away: 'Pricing in another currency is a decision for sales first; nothing in the service could do it today.',
		drop: "my bank has offered me a card without the fee, so it's not a problem any more",
		art: { note: 'charges' },
		logs: ['billing msg="charge created" subscription={sub} amount_pence={pence} currency=GBP', 'billing msg="card country" subscription={sub} country=IE']
	},
	{
		key: 'foreign',
		weight: 2,
		subjects: ['Certificate issued for our domain that we did not ask for', 'Who requested a certificate for {site}?', 'Unexpected certificate alert'],
		opens: [
			"Our monitoring service has emailed to say a new certificate for {site} was issued by Oakhurst on {weekday}. We didn't ask for one, and our site is on our own account with you. Who requested it?",
			"I got an alert that a certificate had been issued for our domain, {site}, and it wasn't us. Is someone else using our domain on your platform? This worries me."
		],
		more: ['We changed web agencies in the spring.', 'Our own certificate is still the one the site shows.', 'Our IT person says this could be a security problem.'],
		tries: "Thanks for letting us know, and I understand why it's worrying. Your own certificate is unchanged. I'll ask our accounts team to find out where the other one came from.",
		ask: 'Has anyone else ever managed your website or domain for you, such as an agency?',
		replies: ['Yes, {agency} built the original site. We stopped working with them earlier this year.', 'An agency, {agency}, looked after it until the spring. We parted on good terms.'],
		note: "Customer's monitoring flagged a certificate for {site} that they didn't request. Their own certificate is unchanged.",
		paths: [
			{ find: "The second certificate belongs to a different account: their old agency still has {site} as a site on its own account here, and the issuer reissued it for them. As long as that site exists, it'll keep getting certificates.", ends: ['need', 'team', 'need>fixed', 'owe'], art: 'certs' }
		],
		ask2: 'Are you still in touch with the agency, and would they remove the site if asked?',
		reply2: 'Yes, I can ask them. They should have removed it months ago.',
		detail: 'Nothing stops two accounts from both having the same domain as a site. Whoever points the domain at us passes the check, and right now both copies are on our servers.',
		says: ['Your old agency still has your domain listed as a site on its own account with us, and a certificate was issued for that copy. Your own certificate has not changed.'],
		fix: "The agency has removed its copy of the site, and its certificate for {site} has been revoked. Only the customer's certificate is left.",
		fixed: 'Thank you. Our monitoring shows only our own certificate now.',
		work: '',
		owe: "stop the same domain from being a site on two accounts at once, and remove the agency's copy once they agree",
		need: 'ask your old agency, {agency}, to remove {site} from their account with us',
		team: 'the platform team',
		away: "Two accounts holding one domain is a platform question; they can contact the agency with the customer's permission.",
		drop: '',
		art: { note: 'certs' },
		logs: ['certs msg="certificate issued" domain={site} account={acc} serial={serial}', 'certs msg="certificate issued" domain={site} account={agencyAcc} serial={serial2}']
	},
	{
		key: 'whosename',
		weight: 2,
		subjects: ["Account page shows my partner's name", 'Wrong name on our account page', 'Account in the wrong name'],
		opens: [
			"My business partner and I share the hosting account. When I sign in, the account page shows her name and email, not mine. I'd like my own details there, or at least both of us.",
			"The account page says the account belongs to our old office manager, who left in the summer. We're still paying for it, but it's in his name and the receipts go to his old inbox."
		],
		more: ['We both use the same sign-in.', 'His email address no longer works.', "I'm a director of the company, if that matters."],
		tries: "Thanks for explaining. An account has one owner, whose name and email are shown on the account page. I'll check with the accounts team what we can do.",
		ask: 'Whose details would you like on the account, and can the current owner confirm the change?',
		replies: ["Mine, please: {full}, {email}. She's happy to confirm.", "Mine: {full}, {email}. He's left the company, so he can't confirm anything."],
		note: "Customer wants the account's owner changed to themselves; the page shows someone else's name. They use a shared sign-in.",
		paths: [
			{ find: "The account page shows the account's owner, and an account has exactly one. Changing the owner means changing the account record and the subscription's email, which we can do by hand once the request is confirmed.", ends: ['fixed', 'need>fixed', 'owe', 'need'], art: 'account' },
			{ find: "The account record is right: the customer is the owner of their own account. They're signing in with their partner's login, so the sign-in system sends us the partner's account. Separate logins are the sign-in team's business.", ends: ['team', 'work'], art: 'log' }
		],
		ask2: 'Can the current owner reply from their email address to confirm the change?',
		reply2: "I'll ask. If that's not possible, would a letter from a director do instead?",
		detail: 'Shared logins are behind most of these. The account page has no idea who is signed in, only which account it was asked for.',
		says: ["Each account has one owner, and the account page shows that person's details, so the change has to be made to the account itself.", "You're signing in with your partner's login, so the page shows her account; your own account is separate and has your details on it."],
		fix: "I've made the customer the owner of the account, with their email on the subscription, so the page and the receipts show their details.",
		fixed: 'The page shows my details now, and the receipt came to me. Thank you.',
		work: "Each person can have a login of their own, and the account page always shows the details of the account you signed in with. If you sign in with your own login, you'll see your own account.",
		owe: 'change the owner of the account by hand once the confirmation is in',
		need: "send us a short confirmation from the current owner's email address, or a letter from a company director, so that we can change the owner",
		team: 'the sign-in team',
		away: 'The account record is right; separate logins for the two of them is a sign-in question.',
		drop: '',
		art: { note: 'account' },
		logs: ['http method=GET path=/account account={acc} status=200 ms={ms}', 'auth msg="session" account={acc} login=shared']
	}

];

// Shared parts. {first} the customer's first name, {agent} the support agent, {helper} who does their technical work.
const greetings = ['Hi,', 'Hello,', 'Hi there,', 'Hello Oakhurst,', 'Dear support team,', 'Hi team,'];
const signoffs = ['Thanks,\n{first}', 'Many thanks,\n{first} {last}', 'Regards,\n{first} {last}\n{company}', 'Cheers,\n{first}', '{first}', 'Thank you,\n{first} {last}', 'Best,\n{first}'];
const moods = [
	"This is the second time I've written about this, so I'd be grateful for a proper answer.",
	"We have a busy weekend coming up, so I'd love this sorted before then.",
	"No great rush, but I'd like to know where we stand.",
	"I'm not very technical, so please explain in plain English.",
	"My business partner keeps asking me about it.",
	"I'm away from Thursday, so my colleague {colleague} may reply instead.",
	"Please call me if that's easier: {phone}."
];
const nudges = ["Any news? I haven't heard anything since I wrote.", 'Just following up on this. {more}', 'One more thing I forgot to say. {more}', 'Hello again. {more} Is anyone looking at this?'];
const supportHellos = ['Hi {first},\n\nThanks for your patience.', "Hi {first},\n\nSorry for the wait; it's been a busy few days on the desk.", 'Hello {first},', 'Hi {first},', 'Hi again {first},'];
const supportByes = ['Best wishes,\n{agent}\nOakhurst Hosting support', 'Kind regards,\n{agent}', 'Thanks,\n{agent}, Oakhurst support', '{agent}', 'All the best,\n{agent}'];
const noteHeads = ['Escalating to accounts.', 'Passing this to the accounts queue.', 'Moving to accounts; it needs someone who can see the accounts service.', 'Escalating. Summary for accounts:', 'Over to accounts, please.'];
const noteMoods = ['Customer is polite but would like an answer this week.', 'Customer is frustrated; this is their second ticket about it.', 'Not urgent from the customer\'s side.', 'Customer has asked for a call back if possible.', 'Customer has been very patient.'];
const devHeads = ['Picked this up.', 'Taking this one.', 'Had a look this morning.', 'Looking at this now.', 'Mine.', 'I\'ll take it.'];
const devLooks = ["Here's what the service has for the account:", 'From our side:', 'This is what we have:', 'What the service shows:', 'For reference:'];
const devAsks = ['Before I go further, could you ask them this: "{ask2}"', 'Can we check one thing with the customer first? "{ask2}" It changes what I do next.', 'Could you put this to them: "{ask2}"', 'One question for them first: "{ask2}"'];
const relays = ['{hello}\n\nOne more question from our accounts team. {ask2}', '{hello}\n\nThe team looking at this would like to know one thing. {ask2}', '{hello}\n\nA quick question so that we can move this on. {ask2}'];
const contexts = [
	'For context, {company} is a small business in {town}, and most of our customers find us through the website.',
	"There are {staff} of us, so I look after the website on top of everything else.",
	'The website is how most people find us, so anything that looks wrong costs us customers.'
];
const newContexts = ["We only signed up {moved}, so I'm still finding my way around.", "We're new to Oakhurst, so forgive me if I've missed something obvious."];
const oldContexts = ["We've been with you since {startYear}, and the site has been no trouble until now.", "I've been a customer since {startYear} and I've never had to write in before."];
// Questions a customer asks once a ticket is settled, and while it is still open.
const followupsDone: [string, string][] = [
	['Could I have that in writing for our records? A reply to this is fine.', 'Of course: this reply is that confirmation, and it stays on your ticket.'],
	['Will this happen again?', "We don't expect it to, and if it does, reply to this ticket and it comes straight back to the same people."],
	["Who should I contact if it's still not right?", 'Just reply here. The ticket stays with us until you are happy.']
];
const followupsOpen: [string, string][] = [
	['Will the site be affected while you sort this out?', 'No, your site keeps running as normal throughout.'],
	['Is there anything I need to do in the meantime?', "Nothing at all for now. I'll be in touch as soon as there's news."],
	['Can you tell me roughly how long this will take?', "I can't promise a date, but it's with the right people and I'll update you as soon as I hear."]
];
const calls = [
	'Call note: {first} rang the desk to chase. I said accounts are looking at it. They also mentioned: "{more}"',
	"{first} phoned for an update. Told them it's with accounts. The only new thing from their side, in their words: \"{more}\"",
	'Phone call with {first} just now. They are waiting patiently, but asked me to pass this on: "{more}"'
];
// A second question support may ask, the topics it suits, and the customer's possible answers.
const extraAsks: [string, string[], string[]][] = [
	['When did you first notice this?', ['www', 'caa', 'oldhost', 'mixed', 'receipts', 'oldemail', 'encoding', 'planshown', 'domainfix', 'foreign'], ['On {weekday}, I think.', 'A few days ago. I put off writing in, hoping it would sort itself out.', 'Straight away, really.']],
	['Is anyone else on your side seeing the same thing?', ['www', 'oldhost', 'mixed', '3ds', 'receipts'], ['My colleague {colleague} says the same.', "I've only checked myself, to be honest."]],
	['Which device and browser are you using?', ['www', 'oldhost', 'mixed', '3ds'], ['A laptop with Chrome, and my phone.', 'An iPad mostly, but I tried the office computer too.', 'Firefox on Windows.']],
	['Have you changed anything on your account recently?', ['oldemail', 'planshown', 'locked', 'whosename', 'encoding', 'membersince'], ["No, nothing. I hadn't signed in for weeks.", 'Not that I know of.']]
];
const holding = [
	"{hello}\n\nA quick update: I've passed your ticket to our accounts team, who look after plans, payments, certificates and the account page. I'll be back in touch as soon as they've had a look.",
	"{hello}\n\nJust to let you know, this needs someone with access to our accounts systems, so I've passed it on to them with everything you've sent. You don't need to do anything for now.",
	"{hello}\n\nThanks for the details. I've handed this to the team who can look into it properly, and I'll keep you posted here."
];
const handovers = ["I'm picking this up from {agentPrev}, who's away this week.", "{agentPrev} is off today, so I'm looking after your ticket.", "I'm taking over from {agentPrev} on this one."];
const related = ['Same cause as {prev}, I expect.', 'This looks like {prev} again.', 'We had one like this recently, {prev}.'];
const findHeads = ['Thanks. That fits.', 'OK, that settles it.', 'Right, found it.', "Thanks, that's what I needed.", 'Got to the bottom of it.'];
const tangents = [
	"Side note for the queue: the helpdesk move is still planned for after the busy period, so anything open then gets carried over by hand.",
	"I'm on call this week, so ping me if this comes back.",
	'Unrelated: the staging accounts service was reset on {weekday}, so test accounts from before then are gone.',
	'{agent2} is off until Monday, so I\'ll keep an eye on this one.',
	"Note to self: the admin tool's search still can't find accounts by domain. I searched by email instead.",
	'Release went out at 14:00 today, so anything odd after that may be related.',
	'Reminder that the accounts board is reviewed on Tuesdays.',
	"FYI the payment provider's dashboard was slow all morning; it's fine now."
];
const fixHeads = ['Done. {fix}', 'Sorted. {fix}', '{fix} Over to support to let the customer know.', '{fix} Deployed with this afternoon\'s release.'];
const fixedNotes = ['{hello}\n\nGood news: our accounts team have made the change, and everything should be working now. Could you check and let me know?', '{hello}\n\nThis should be sorted now. Please let me know if anything still looks wrong.', '{hello}\n\nThe team have made a change on our side. Could you take a look and tell me whether it all looks right to you now?'];
const closes = ['Thanks, {first}. I\'ll close this now.', 'Glad to hear it. Closing the ticket.', 'Great, thanks for confirming.'];
const oweHeads = ["This needs a change on our side: we need to {owe}. I've put it on the accounts board, with me.", "It's ours. We need to {owe}; it's on the board for the next sprint.", "Confirmed as a gap in the service. We'll {owe}. Not this week, but it's on the board."];
const oweNotes = ["{hello}\n\nI've heard back from our accounts team. They're going to {owe}, and I'll write to you as soon as that's done. I'm sorry it can't be quicker.", '{hello}\n\nThanks for bearing with us. Our accounts team have confirmed they need to {owe}. I\'ll keep this ticket open and update you when it\'s done.'];
const oweAcks = ['OK, thanks for keeping me posted.', 'Thanks. Please do let me know.', "Fine, as long as it's soon.", 'Understood. Thanks for being straight with me.'];
const workHeads = ['No change on our side for this one. Support, over to you for the reply.', "Nothing we'll change in the service for this, as far as I can see.", "I don't think this needs any code. Can you answer the customer from here?"];
const workAcks = ['Fair enough. Thanks for explaining.', 'Not ideal, but understood.', "OK, we'll go with that for now.", 'Right. Thanks for the quick answer.'];
const pushbacks = ["I'm sorry, but that doesn't work for us. {more}", "That's not really a solution. Is there really nothing you can do?", "We can't do that, I'm afraid. We need this fixed properly."];
const pushNotes = ["Customer can't use the alternative. Is there anything we can do?", 'Back to accounts: the customer says the alternative won\'t work for them.'];
const needHeads = ['The fix is on their side, not ours. Support, can you explain what they need to do?', "Nothing to change here; the next step is the customer's."];
const needNotes = ["{hello}\n\nThanks for your patience. The next step is yours: you'll need to {need}. Once that's done, reply here and we'll take it from there.", "{hello}\n\nTo move this on, you'll need to {need}. Let me know once it's done."];
const needAcks = ["OK, I'll do that {when}.", "Thanks. I'll sort that out {when} and come back to you.", 'Right, leave it with me.'];
const helperAcks = ["OK, I'll ask {helper} to do that {when}.", "Thanks. I'll pass this to {helper}, who looks after that side of things.", "Right, I'll get {helper} to look at it {when} and come back to you."];
const chasers = ["{hello}\n\nJust checking in: have you had a chance to {need}? No rush, this ticket stays open until you're ready.", '{hello}\n\nA quick follow-up on this. Let me know when that change is done and we\'ll take it from there.'];
const needDones = ["Done, {done}. Can you check?", "That's been done now. Has it worked?", 'All sorted at my end, {done}. Over to you.'];
const helperDones = ['Done. {Helper} made the change {done}.', '{Helper} says it was done {done}. Has it worked?', "That's been changed now, {done}. Can you check?"];
const teamHeads = ['{away} Passing this to {team}.', '{away} Moving to {team}.'];
const teamNotes = ['{hello}\n\nI\'ve passed your ticket to our colleagues in {team}, who can help with this and will be in touch directly.', "{hello}\n\nThis one is for {team} rather than us, so I've passed it to them with everything you've told us. You'll hear from them directly."];
const bounces = ["Sending this back to accounts: there's nothing we can do until the accounts service itself is changed.", 'Back to accounts, I\'m afraid: our part depends on a change in the accounts service first.'];
const drops = ['Please close this: {drop}. Sorry for the bother.', 'No need to do anything after all: {drop}. Thanks for your help.', 'Update: {drop}. You can close the ticket.'];
const dropCloses = ["Closing at the customer's request.", 'Thanks, {first}. Closing this one.', 'No problem at all. Closing.'];
const relapses = ["Thanks, but it's happened again this morning.", 'It looked fine for a day, but the same thing is back.', 'That fixed one part of it, but not the rest.'];
const relapseHeads = ['Looked again. My change only covered part of it.', 'Right, there\'s more to this than I thought.'];

// Pasted output.
const fence = (lines: string[]) => '```text\n' + lines.join('\n') + '\n```';
const col = (text: string, width: number) => text.padEnd(width);
interface Ctx {
	key: string;
	path: number;
	r: Rand;
	v: Record<string, string>;
	opened: number;
	startedDay: number;
	signedUpDay: number;
	/** The day the service's logs are pasted from. */
	logDay: number;
	sites: string[];
	logs: string[];
}
const ourIp = (r: Rand) => `198.51.100.${int(r, 10, 250)}`;
const oldIp = (r: Rand) => `203.0.113.${int(r, 10, 250)}`;
const stamp = (r: Rand, day: number) => `${iso(day)}T${pad(int(r, 7, 21))}:${pad(int(r, 0, 59))}:${pad(int(r, 0, 59))}Z`;

const accountPaste = (c: Ctx): string => {
	const { v } = c;
	const name = c.key === 'encoding' ? v.mangled! : v.full!;
	const email = c.key === 'oldemail' && c.path === 0 ? v.oldEmail! : v.email!;
	const plan = c.key === 'planshown' ? 'starter' : v.planCode!;
	const signed = c.key === 'membersince' ? iso(c.signedUpDay) : iso(c.signedUpDay);
	const dated = c.startedDay >= c.opened - 12;
	const subs = v.noPlan === 'yes' ? (c.key === '3ds' ? `${v.sub} (${v.planCode}, waiting on first charge)` : 'none') : dated ? `${v.sub} (${v.planCode}, started ${iso(c.startedDay)})` : `${v.sub} (${v.planCode})`;
	const lines = [
		`$ oakhurst-admin account show ${v.acc}`,
		`account        ${v.acc}`,
		`name           ${name}`,
		`email          ${email}`,
		`plan           ${v.noPlan === 'yes' ? '-' : plan}`,
		`signed up      ${signed}`,
		`subscriptions  ${subs}`,
		`sites          ${c.sites.length ? c.sites.join(', ') : 'none'}`,
		`certificates   ${c.sites.length}`
	];
	if (c.key === 'move') lines.push(`other subs     sub_${int(c.r, 20000, 29999)} (business), sub_${int(c.r, 20000, 29999)} (starter)`);
	if (c.key === 'oldemail' && c.path === 1) lines.push(`signin email   ${v.oldEmail} (signin copy)`);
	if (c.key === 'delete') lines.push('open charges   none');
	lines.push('recent');
	const fresh = c.signedUpDay >= c.opened - 12;
	const events = fresh ? ['checkout started', 'signed in', 'viewed account page', 'site added', 'contacted support'] : ['signed in', 'viewed account page', 'password changed', 'site files uploaded', 'contacted support', 'signed in from a new device'];
	let day = fresh ? c.signedUpDay : c.opened - int(c.r, 4, 10);
	let minute = int(c.r, 480, 1000);
	if (fresh) lines.push(`  ${iso(day)} ${pad(Math.floor(minute / 60))}:${pad(minute % 60)}  signed up`);
	for (let i = int(c.r, 2, 5); i > 0 && day <= c.opened; i--) {
		minute += int(c.r, 3, 240);
		if (minute > 1380 || chance(c.r, 0.5)) {
			day += int(c.r, 1, 2);
			minute = int(c.r, 480, 1000);
		}
		if (day > c.opened) break;
		lines.push(`  ${iso(day)} ${pad(Math.floor(minute / 60))}:${pad(minute % 60)}  ${pick(c.r, events)}`);
	}
	return fence(lines);
};
const chargesPaste = (c: Ctx): string => {
	const { r, v } = c;
	const rows: string[][] = [];
	const ch = () => `ch_${base36(r, 8)}`;
	const due = iso(c.startedDay);
	if (c.key === 'double') {
		rows.push([v.sub!, due, v.price!, 'paid', ch()]);
		if (c.path === 0) rows.push([v.sub2!, due, v.price!, 'paid', ch()]);
	} else if (c.key === '3ds') {
		for (let i = int(r, 2, 4); i > 0; i--) rows.push([v.sub!, due, v.price!, i === 1 ? 'requires action' : 'failed', ch()]);
	} else if (c.key === 'invoice') {
		rows.push(['(none)', '', '', '', '']);
	} else if (c.key === 'dispute') {
		rows.push([v.sub!, due, v.price!, 'disputed', ch()]);
	} else if (c.key === 'planshown') {
		rows.push([`sub_${int(r, 10000, 19999)}`, iso(pastDay(r, c.startedDay, 2023, 2025)), '£48.00', 'paid', ch()]);
		rows.push([v.sub!, iso(c.startedDay), '£144.00', 'paid', ch()]);
	} else rows.push([v.sub!, due, v.price!, 'paid', ch()]);
	const head = ['SUBSCRIPTION', 'DUE ON', 'AMOUNT', 'STATE', 'CHARGE'];
	const widths = [14, 12, 9, 17, 12];
	return fence([`$ oakhurst-admin charges --account ${v.acc}`, [head, ...rows].map((row) => row.map((cell, i) => col(cell, widths[i]!)).join('').trimEnd()).join('\n')]);
};
const certsPaste = (c: Ctx): string => {
	const { r, v } = c;
	const rows: string[][] = [];
	const issued = iso(c.logDay);
	if (c.key === 'www') {
		rows.push([v.site!, v.serial!, issued, 'issued']);
		if (c.path === 1) rows.push([`www.${v.site}`, hex(r, 16), issued, 'issued']);
	} else if (c.key === 'caa') {
		for (let i = 0; i < int(r, 3, 6); i++) rows.push([v.site!, '-', iso(c.opened - 5 + i), 'failed (caa)']);
	} else if (c.key === 'idn') {
		rows.push([v.idn!, '-', issued, 'failed (invalid domain)']);
		rows.push([v.site!, v.serial!, issued, 'issued']);
	} else if (c.key === 'domainfix') {
		rows.push([v.typo!, v.serial!, issued, 'issued']);
	} else if (c.key === 'serial') {
		rows.push([v.site!, v.serial!, iso(c.opened - 1), 'issued']);
		rows.push([v.site!, v.serial!, iso(c.opened - 1), 'issued']);
		rows.push([v.site2!, hex(r, 16), iso(c.opened - 1), 'issued']);
	} else for (const site of c.sites) rows.push([site, site === v.site ? v.serial! : hex(r, 16), issued, 'issued']);
	const widths = [Math.max(28, ...rows.map((row) => row[0]!.length + 2)), 18, 12, 10];
	return fence([`$ oakhurst-admin certs --account ${v.acc}`, [['DOMAIN', 'SERIAL', 'ISSUED', 'STATE'], ...rows].map((row) => row.map((cell, i) => col(cell, widths[i]!)).join('').trimEnd()).join('\n')]);
};
const tlsPaste = (c: Ctx): string => {
	const { r, v } = c;
	if (c.key === 'www')
		return fence([
			`$ curl -sv https://www.${v.site}/ -o /dev/null 2>&1 | grep -E '^\\* (SSL|Server|  subject|  issuer|  subjectAlt)'`,
			'* SSL connection using TLSv1.3 / TLS_AES_256_GCM_SHA384',
			'* Server certificate:',
			`*  subject: CN=${c.path === 1 ? `*.${v.oldDomain}` : v.site}`,
			`*  issuer: ${c.path === 1 ? `O=${v.old}; CN=${v.old} Issuing CA` : 'O=Oakhurst Hosting; CN=Oakhurst Issuing CA 2'}`,
			`*  subjectAltName does not match www.${v.site}`,
			`* SSL: no alternative certificate subject name matches target host name 'www.${v.site}'`
		]);
	return fence([
		`$ openssl s_client -connect ${v.site}:443 -servername ${v.site} </dev/null 2>/dev/null | openssl x509 -noout -subject -issuer`,
		`subject=CN = *.${v.oldDomain}`,
		`issuer=C = GB, O = ${v.old}, CN = ${v.old} Issuing CA`,
		chance(r, 0.5) ? `$ curl -sI https://${v.site}/ | head -1\ncurl: (60) SSL: no alternative certificate subject name matches target host name '${v.site}'` : `verify error:num=62:hostname mismatch`
	]);
};
const dnsPaste = (c: Ctx): string => {
	const { r, v } = c;
	const lines: string[] = [];
	if (c.key === 'caa') {
		lines.push(`$ dig +short CAA ${v.site}`, `0 issue "${v.caDomain}"`);
		if (chance(r, 0.5)) lines.push(`0 iodef "mailto:it@${v.domain}"`);
		lines.push(`$ dig +short A ${v.site}`, ourIp(r), `$ dig +short NS ${v.site}`, `ns1.${v.registrarDomain}.example.`, `ns2.${v.registrarDomain}.example.`);
	} else if (c.key === 'www') {
		lines.push(`$ dig +short A ${v.site}`, ourIp(r), `$ dig +short www.${v.site}`, `${v.site}.${v.oldDomain}.example.`, oldIp(r));
	} else {
		const ours = ourIp(r);
		const old = oldIp(r);
		lines.push(`$ dig +short A ${v.site}`, ...(chance(r, 0.5) ? [ours, old] : [old, ours]), `$ dig +short A ${v.site} @1.1.1.1`, old, ours, `$ dig +short NS ${v.site}`, `ns1.${v.registrarDomain}.example.`);
	}
	return fence(lines);
};
const bouncePaste = (c: Ctx): string => {
	const { r, v } = c;
	const blocks: string[] = [];
	for (let i = int(r, 1, 3), day = c.startedDay; i > 0; i--, day += int(r, 0, 2)) {
		blocks.push(`Reporting-MTA: dns; mx${int(r, 1, 3)}.oakhurst-hosting.example\nArrival-Date: ${weekday(day).slice(0, 3)}, ${shortDate(day)} ${pad(int(r, 7, 20))}:${pad(int(r, 0, 59))}:${pad(int(r, 0, 59))} +0000\n\nFinal-Recipient: rfc822; ${v.email}\nAction: failed\nStatus: 5.7.1\nRemote-MTA: dns; inbound.${v.filter}.example\nDiagnostic-Code: smtp; 550 5.7.1 Message rejected by policy (sender not permitted)`);
	}
	return fence(blocks.join('\n\n').split('\n'));
};
const browserPaste = (c: Ctx): string => {
	const { r, v } = c;
	if (c.key === '3ds')
		return fence([
			`Refused to display 'https://secure.${v.bankDomain}.example/' in a frame because it set 'X-Frame-Options' to 'deny'.`,
			`checkout.js:${int(r, 200, 900)} challenge: no response after ${int(r, 30, 90)}s`,
			`checkout.js:${int(r, 200, 900)} POST https://accounts.oakhurst-hosting.example/checkout/confirm 402 (Payment Required)`,
			'Uncaught (in promise) Error: authentication_required'
		]);
	const lines: string[] = [];
	for (let i = int(r, 3, 6); i > 0; i--)
		lines.push(`Mixed Content: The page at 'https://${v.site}/${pick(r, ['products', 'gallery', 'about', 'shop', 'news'])}' was loaded over HTTPS, but requested an insecure element 'http://${v.site}/wp-content/uploads/20${int(r, 17, 23)}/${pad(int(r, 1, 12))}/${pick(r, ['IMG_', 'DSC', 'photo-', 'banner-'])}${int(r, 100, 9999)}.jpg'. This request was automatically upgraded to HTTPS.`);
	return fence(lines);
};
const paymentPaste = (c: Ctx): string => {
	const { r, v } = c;
	const lines = [`event         ${c.key === 'dispute' ? 'charge.dispute.created' : c.key === '3ds' && c.path === 0 ? 'charge.requires_action' : c.key === '3ds' ? 'charge.failed' : 'charge.authorised'}`, `created       ${iso(c.startedDay)} ${pad(int(r, 7, 21))}:${pad(int(r, 0, 59))}:${pad(int(r, 0, 59))} UTC`, `charge        ch_${base36(r, 8)}`, `amount        ${v.pence} GBP`, `card          ${pick(r, ['visa', 'mastercard'])} ending ${v.last4}`];
	if (c.key === '3ds' && c.path === 0) lines.push('outcome       authentication_required', '3ds           challenge_not_completed', `issuer        ${v.bankCode}`);
	else if (c.key === '3ds') lines.push('outcome       declined', 'decline_code  suspected_fraud', '3ds           not_attempted', `issuer        ${v.bankCode}`);
	else if (c.key === 'dispute') lines.push('reason        unrecognised', `descriptor    OAKHURST ACCTS`, `respond_by    ${iso(Math.min(c.opened + int(r, 12, 20), LAST))}`);
	else lines.push('captured      false', 'state         voided', `descriptor    OAKHURST ACCTS`);
	return fence(lines);
};
const noise = ['http method=GET path=/account account=acc_{rand} status=200 ms={ms}', 'certs msg="certificate issued" domain={otherSite} serial={rhex}', 'receipts msg="receipt sent" subscription=sub_{rnum}', 'http method=POST path=/checkout status=303 ms={ms}', 'jobs msg="queue drained" queue=receipts took_ms={ms}'];
const logPaste = (c: Ctx, templates: string[]): string => {
	const { r } = c;
	const lines: string[] = [];
	let second = c.key === 'oldemail' ? int(r, 3600, 3 * 3600) : int(r, 8 * 3600, 16 * 3600);
	const day = c.logDay;
	const noiseLine = () => {
		second += int(r, 1, 50);
		return `${iso(day)}T${pad(Math.floor(second / 3600) % 24)}:${pad(Math.floor(second / 60) % 60)}:${pad(second % 60)}Z INFO  ${fillText(pick(r, noise), { ...c.v, rand: base36(r, 6), ms: String(int(r, 4, 180)), otherSite: `${pick(r, heads).toLowerCase()}-${pick(r, tails)[1]}.example`, rhex: hex(r, 16), rnum: String(int(r, 10000, 29999)) })}`;
	};
	for (const template of templates) {
		for (let i = int(r, 1, 4); i > 0; i--) lines.push(noiseLine());
		second += int(r, 1, 40);
		const line = fillText(template, { ...c.v, ms: String(int(r, 4, 180)) });
		const level = /msg="[^"]*(failed|refused|skipped)/.test(line) ? 'WARN ' : 'INFO ';
		lines.push(`${iso(day)}T${pad(Math.floor(second / 3600) % 24)}:${pad(Math.floor(second / 60) % 60)}:${pad(second % 60)}Z ${level} ${line}`);
	}
	for (let i = int(r, 1, 3); i > 0; i--) lines.push(noiseLine());
	return fence(lines);
};
const plansPaste = (c: Ctx): string =>
	fence(['$ oakhurst-admin plans', 'CODE      NAME      PRICE    SITES', 'starter   Starter   £48.00   1', 'business  Business  £144.00  10', ...(c.key === 'twosites' || c.key === 'agency' ? [`$ oakhurst-admin sites --account ${c.v.acc}`, ...c.sites.map((site) => `${site}`), `(${c.sites.length} of ${c.v.planCode === 'business' ? 10 : 1} sites)`] : [])]);
const htmlPaste = (c: Ctx): string => {
	const { v } = c;
	return '```html\n' + [`<h1>Your account</h1>`, '<dl>', '  <dt>Name</dt>', `  <dd>${v.full}</dd>`, '  <dt>Email</dt>', `  <dd>${v.email}</dd>`, '  <dt>Plan</dt>', `  <dd>${v.plan}, ${v.price} a year</dd>`, '  <dt>Member since</dt>', `  <dd>${longDate(c.signedUpDay)}</dd>`, '</dl>'].join('\n') + '\n```';
};
const paste = (kind: Kind, c: Ctx, topic: Topic): string => {
	switch (kind) {
		case 'account': return accountPaste(c);
		case 'charges': return chargesPaste(c);
		case 'certs': return certsPaste(c);
		case 'tls': return tlsPaste(c);
		case 'dns': return dnsPaste(c);
		case 'bounce': return bouncePaste(c);
		case 'browser': return browserPaste(c);
		case 'payment': return paymentPaste(c);
		case 'plans': return plansPaste(c);
		case 'html': return htmlPaste(c);
		case 'log': return logPaste(c, c.logs.length ? c.logs : ['billing msg="subscription in good standing" subscription={sub}', 'http method=GET path=/account account={acc} status=200 ms={ms}']);
	}
};

const fillText = (text: string, values: Record<string, string>): string => text.replace(/\{(\w+)\}/g, (whole, key: string) => values[key] ?? whole);

// One ticket. `prev` is the number of the last ticket about the same problem, if there was one.
const ticket = (index: number, topic: Topic, occurrence: number, number: number, opened: number, prev: number | undefined): string => {
	const r = mulberry32(0x0a4c0000 + index * 7919);
	const [path, end] = endingFor(topic, occurrence);
	const pathInfo = topic.paths[path]!;
	if (topic.says.length !== topic.paths.length) throw new Error(`${topic.key}: one explanation per path`);

	// The customer.
	const org = topic.org ? topic.org[(occurrence + index) % topic.org.length]! : undefined;
	let first = pick(r, firsts);
	let last = pick(r, lasts);
	let mangled = '';
	if (topic.key === 'encoding') [first, last, mangled] = intlNames[(occurrence + index) % intlNames.length]!;
	const head = pick(r, heads);
	const tail = pick(r, tails);
	const company = org ? org[0] : `${head} ${tail[0]}`;
	const domain = org ? `${org[1]}.example` : `${head.toLowerCase()}-${tail[1]}.example`;
	const [idn, puny] = idns[(occurrence + index) % idns.length]!;
	const site = topic.key === 'move' ? `${pick(r, heads).toLowerCase()}-${pick(r, tails)[1]}.example` : domain;
	const site2 = `${pick(r, ['shop', 'workshops', 'store', 'events', 'blog'])}-${head.toLowerCase()}.example`;
	const planCode = topic.plan ?? (topic.key === 'charity' || topic.key === 'twosites' ? 'starter' : chance(r, 0.6) ? 'starter' : 'business');
	const plan = planCode === 'starter' ? 'Starter' : 'Business';
	const pence = planCode === 'starter' ? 4800 : 14400;
	const price = planCode === 'starter' ? '£48.00' : '£144.00';
	const ascii = (text: string) => text.toLowerCase().normalize('NFD').replace(/[^a-z]/g, '');
	const email = `${ascii(first)}@${domain}`;
	const [bank, bankCode] = pick(r, banks);
	const [registrar, registrarDomain] = pick(r, registrars);
	const [old, oldDomain] = pick(r, oldHosts);
	const [ca, caDomain] = pick(r, authorities);
	const helper = pick(r, helpers);
	const subNumber = int(r, 20000, 29999);
	const migration = Date.UTC(2025, pick(r, [5, 6]), int(r, 2, 27)) / DAY;
	// New customers paid a day or two ago; recent payers some days ago; everyone else has been with us a while.
	const fresh = topic.noPlan || ['double', 'wrongplan'].includes(topic.key);
	const recent = ['receipts', 'vat', 'dispute', 'vatprice', 'currency', 'domainfix'].includes(topic.key);
	const signedUpDay = topic.key === 'membersince' || topic.key === 'encoding' ? migration : fresh ? opened - int(r, 0, 1) : recent ? opened - int(r, 2, 9) : pastDay(r, opened, 2019, 2026);
	const startedDay = fresh || recent ? signedUpDay : topic.key === 'planshown' ? opened - int(r, 3, 9) : pastDay(r, opened, Math.max(2019, at(signedUpDay).getUTCFullYear()), 2026);
	const logDay = topic.key === 'membersince' || topic.key === 'encoding' ? migration : fresh || recent || topic.key === 'planshown' ? startedDay : opened - int(r, 1, 3);
	const swap = int(r, 1, head.length - 3);
	const typo = `${head.toLowerCase().slice(0, swap)}${head.toLowerCase()[swap + 1]}${head.toLowerCase()[swap]}${head.toLowerCase().slice(swap + 2)}-${tail[1]}.example`;
	let agent = support[(index + occurrence) % support.length]!;
	let agentPrev = '';
	const dev = accounts[(index * 3 + occurrence) % accounts.length]!;
	const dev2 = accounts.filter((name) => name !== dev)[index % 3]!;
	const v: Record<string, string> = {
		first, last, full: `${first} ${last}`, company, domain, site, site2, email, plan, planCode, price, pence: String(pence),
		acc: `acc_${base36(r, 6)}`, sub: `sub_${subNumber}`, sub2: `sub_${subNumber + 1}`, weekday: weekday(opened - int(r, 1, 4)),
		n: String(int(r, 3, 6)), total: String(int(r, 12, 16)), time: `${pad(int(r, 8, 21))}:${pad(int(r, 0, 59))}`,
		bank, bankCode, bankDomain: bankCode, po: `PO-${int(r, 10000, 99999)}`, vat: `${int(r, 100, 999)} ${int(r, 1000, 9999)} ${int(r, 10, 99)}`,
		address: `${int(r, 2, 120)} ${pick(r, ['High Street', 'Station Road', 'Mill Lane', 'Church Street', 'Market Place', 'Victoria Road'])}, ${pick(r, ['Kendal', 'Truro', 'Ludlow', 'Wells', 'Hexham', 'Brecon', 'Whitby', 'Oakham'])}`,
		charity: String(int(r, 1000000, 1199999)), registrar, registrarDomain, old, oldDomain, ca, caDomain, idn, puny,
		intlName: `${first} ${last}`, mangled, migDate: longDate(migration), migIso: iso(migration), origYear: String(int(r, 2009, 2016)), oldNo: String(int(r, 10000, 99999)),
		serial: hex(r, 16), serial2: hex(r, 16), month: MONTHS_LONG[(at(opened).getUTCMonth() + 1) % 12]!, date: longDate(startedDay),
		typo, agency: pick(r, ['Pixel & Pine', 'Brightwork Digital', 'Cranfield Web Studio', 'Hedgerow Creative']), agencyAcc: `acc_${base36(r, 6)}`, last4: pad(int(r, 0, 9999), 4),
		clientEmail: `${pick(r, firsts).toLowerCase()}@${site}`, helper, Helper: cap(helper), when: pick(r, whens), done: pick(r, dones),
		colleague: pick(r, firsts), phone: `07700 900${pad(int(r, 0, 999), 3)}`, agent2: support[(index + occurrence + 2) % support.length]!,
		oldEmail: `${ascii(first)}.${ascii(last)}@${pick(r, ['oldmail', 'formerjob', 'previous-employer'])}.example`,
		filter: pick(r, ['mailguard', 'shieldmx', 'filterbox']), noPlan: topic.noPlan ? 'yes' : 'no', ms: String(int(r, 4, 180)),
		town: pick(r, ['Kendal', 'Truro', 'Ludlow', 'Wells', 'Hexham', 'Brecon', 'Whitby', 'Oakham', 'Totnes', 'Malton']), staff: pick(r, ['three', 'four', 'five', 'six', 'two']),
		moved: pick(r, ['this week', 'a few days ago', 'the other day']), startYear: String(at(signedUpDay).getUTCFullYear()), prev: prev ? `#${prev}` : ''
	};
	const sites = topic.noPlan ? [] : topic.key === 'domainfix' ? [typo] : topic.key === 'agency' ? Array.from({ length: 10 }, (_, i) => (i === 0 ? site : `${pick(r, heads).toLowerCase()}-${pick(r, tails)[1]}.example`)) : topic.key === 'serial' ? [site, site2] : [site];
	const c: Ctx = { key: topic.key, path, r, v, opened, startedDay, signedUpDay, logDay, sites, logs: pathInfo.logs ?? topic.logs };
	const f = (text: string, extra: Record<string, string> = {}) => cap(fillText(fillText(text, { ...v, agent, ...extra }), { ...v, agent, ...extra }));
	let handedOver = false;
	const hello = () => {
		const text = f(pick(r, supportHellos));
		if (!handedOver) return text;
		handedOver = false;
		return `${text}\n\n${f(pick(r, handovers), { agentPrev })}`;
	};
	const bye = () => f(pick(r, supportByes));
	const explained = () => `${pick(r, ['Here is what we found.', 'We know what happened now.', "We've got to the bottom of it.", "Here's the explanation."])} ${f(topic.says[path]!)}`;

	// The thread, with a clock that only moves forward.
	let day = opened;
	let minute = int(r, 7 * 60, 21 * 60);
	let escalated = opened;
	const comments: string[] = [];
	const say = (who: string, role: string, staff: boolean, text: string, gap?: number) => {
		const step = gap ?? (chance(r, 0.5) ? 0 : chance(r, 0.7) ? 1 : int(r, 2, 3));
		const next = Math.min(day + step, LAST);
		if (comments.length > 0) {
			if (next === day) minute += int(r, 15, 170);
			else minute = int(r, staff ? 8 * 60 + 30 : 7 * 60, staff ? 17 * 60 : 22 * 60);
		}
		day = next;
		if (staff && minute > 18 * 60 && day < LAST) {
			day += 1;
			minute = int(r, 8 * 60 + 30, 10 * 60 + 30);
		}
		minute = Math.min(minute, 23 * 60 + 50);
		comments.push(`**${who}** · ${role} · ${shortDate(day)}, ${pad(Math.floor(minute / 60))}:${pad(minute % 60)}\n\n${text}`);
	};
	const customer = (text: string, gap?: number) => say(v.full!, 'customer', false, text, gap);
	const toCustomer = (parts: string[], gap?: number) => say(agent, 'support', true, [...parts, bye()].join('\n\n'), gap);
	const internal = (text: string, gap?: number) => say(agent, 'support, internal note', true, text, gap);
	const accountsSay = (who: string, text: string, gap?: number) => say(who, 'accounts, internal', true, text, gap);
	const sign = () => f(pick(r, signoffs));
	const short = () => (chance(r, 0.5) ? `\n\n${first}` : '');
	const more = shuffle(r, topic.more);

	// The customer writes in.
	const opening = [pick(r, greetings), f(pick(r, topic.opens))];
	if (chance(r, 0.8)) opening.push(f(more[0]!));
	if (chance(r, 0.7)) opening.push(f(pick(r, [...contexts, ...(signedUpDay >= opened - 12 ? newContexts : signedUpDay < opened - 400 ? oldContexts : [])])));
	if (topic.art.customer && chance(r, 0.8)) opening.push(`${pick(r, ['This is what I see:', 'Pasting what my computer says:', 'In case it helps:', 'Here is the error:'])}\n\n${paste(topic.art.customer, c, topic)}`);
	if (chance(r, 0.55)) opening.push(f(pick(r, moods)));
	opening.push(sign());
	customer(opening.join('\n\n'), 0);
	if (chance(r, 0.3)) customer(f(pick(r, nudges), { more: f(more[1]!) }), 1);

	// Support answers and asks.
	const suited = extraAsks.filter((ask) => ask[1].includes(topic.key));
	const extra = suited.length && chance(r, 0.6) ? pick(r, suited) : undefined;
	toCustomer([f(pick(r, ['Hi {first},', 'Hello {first},', 'Hi {first},', 'Dear {first},'])), f(topic.tries), f(topic.ask), ...(extra ? [`${pick(r, ['Also,', 'And one more thing:', 'While I have you:'])} ${extra[0].charAt(0).toLowerCase()}${extra[0].slice(1)}`] : [])]);
	customer([f(pick(r, topic.replies)), ...(extra ? [f(pick(r, extra[2]))] : []), ...(chance(r, 0.5) ? [f(more[2]!)] : []), sign()].join('\n\n'));

	// Support escalates.
	const notePaste = topic.art.note === 'account' ? paste('account', c, topic) : `${paste('account', c, topic)}\n\n${paste(topic.art.note, c, topic)}`;
	internal([pick(r, noteHeads), f(topic.note), ...(chance(r, 0.4) ? [pick(r, noteMoods)] : []), notePaste].join('\n\n'));
	escalated = day;
	if (chance(r, 0.65)) toCustomer([f(pick(r, holding), { hello: hello() })], 0);
	if (chance(r, 0.45)) internal(f(pick(r, calls), { more: f(more[1]!) }), int(r, 0, 1));
	if (chance(r, 0.3)) {
		agentPrev = agent;
		agent = support[(support.indexOf(agent) + 1 + (index % 3)) % support.length]!;
		handedOver = true;
	}

	// The accounts team looks, perhaps asks, and finds the cause.
	const devArt: Kind = pathInfo.art === 'account' || pathInfo.art === topic.art.note ? 'log' : pathInfo.art;
	const finding: string[] = [];
	if (prev && chance(r, 0.5)) finding.push(f(pick(r, related)));
	finding.push(f(pathInfo.find));
	if (chance(r, 0.85)) finding.push(f(topic.detail));
	const steps = end.split('>') as End[];
	const asks = chance(r, 0.85);
	if (asks) {
		accountsSay(dev, [pick(r, devHeads), pick(r, devLooks), paste(devArt, c, topic), f(pick(r, devAsks), { ask2: f(topic.ask2) })].join('\n\n'));
		if (chance(r, 0.25)) internal(f(pick(r, tangents)), 0);
		toCustomer([f(pick(r, relays), { hello: hello(), ask2: f(topic.ask2) })]);
		customer(f(topic.reply2) + short());
		finding.unshift(pick(r, findHeads));
		if (devArt !== 'log' && chance(r, 0.75)) finding.push(`${pick(r, ['And the log:', 'The service log for that day:', 'Log lines, for the record:'])}\n\n${paste('log', c, topic)}`);
	} else {
		finding.unshift(pick(r, devHeads));
		finding.push(paste(devArt, c, topic));
		if (devArt !== 'log' && chance(r, 0.6)) finding.push(paste('log', c, topic));
	}
	if (chance(r, 0.25)) finding.push(f(pick(r, tangents)));
	// The first step's own comment from the accounts team often goes in the same comment as the finding.
	const merged = steps[0] !== 'fixed' && steps[0] !== 'drop' && chance(r, 0.6);
	const firstHead = (step: End): string =>
		step === 'owe' ? f(pick(r, oweHeads), { owe: topic.owe }) : step === 'work' ? pick(r, workHeads) : step === 'need' ? pick(r, needHeads) : f(pick(r, teamHeads), { away: topic.away, team: topic.team });
	if (merged) finding.push(firstHead(steps[0]!));
	accountsSay(dev, finding.join('\n\n'));

	// How it ends.
	const other = (team: string) => pick(r, teamPeople[team] ?? ['Sam']);
	const followUp = (kind: 'fixed' | 'work' | 'open') => {
		if (!chance(r, 0.55)) return;
		const [question, answer] = pick(r, kind === 'fixed' ? followupsDone : kind === 'work' ? followupsDone.slice(0, 1) : followupsOpen);
		customer(question + short(), int(r, 0, 1));
		toCustomer([hello(), answer]);
	};
	steps.forEach((step, i) => {
		const lastStep = i === steps.length - 1;
		const own = !(i === 0 && merged);
		if (step === 'fixed') {
			accountsSay(dev, f(pick(r, fixHeads), { fix: f(pathInfo.fix ?? topic.fix) }));
			toCustomer([f(pick(r, fixedNotes), { hello: i === 0 && chance(r, 0.6) ? `${hello()}\n\n${explained()}` : hello() })]);
			if (lastStep) {
				customer(f(pathInfo.fixed ?? topic.fixed) + short());
				if (chance(r, 0.4)) say(agent, 'support', true, f(pick(r, closes)));
				else followUp('fixed');
			} else customer(f(pick(r, relapses)) + (chance(r, 0.5) ? ` ${f(more[0]!)}` : '') + short());
		} else if (step === 'owe') {
			if (own) accountsSay(i > 0 ? dev2 : dev, (i > 0 ? `${pick(r, relapseHeads)} ` : '') + f(pick(r, oweHeads), { owe: topic.owe }));
			toCustomer([f(pick(r, oweNotes), { hello: `${hello()}\n\n${explained()}`, owe: topic.owe })]);
			if (chance(r, 0.6)) customer(f(pick(r, oweAcks)) + short());
			if (lastStep) followUp('open');
		} else if (step === 'work') {
			if (own) accountsSay(dev, pick(r, workHeads));
			toCustomer([hello(), ...(chance(r, 0.5) ? [explained()] : []), f(topic.work)]);
			if (lastStep) {
				if (chance(r, 0.7)) customer(f(pick(r, workAcks)) + short());
				followUp('work');
			} else {
				customer(f(pick(r, pushbacks), { more: f(more[1]!) }) + short());
				internal(pick(r, pushNotes));
			}
		} else if (step === 'need') {
			if (own && chance(r, 0.5)) accountsSay(dev, pick(r, needHeads));
			toCustomer([f(pick(r, needNotes), { hello: `${hello()}\n\n${explained()}`, need: topic.need })]);
			customer(f(pick(r, topic.helped ? helperAcks : needAcks)) + short());
			if (lastStep) {
				if (chance(r, 0.5)) toCustomer([f(pick(r, chasers), { hello: hello(), need: topic.need })], int(r, 4, 7));
			} else customer(f(pick(r, topic.helped ? helperDones : needDones)) + short(), int(r, 1, 4));
		} else if (step === 'team') {
			if (own) accountsSay(dev, f(pick(r, teamHeads), { away: topic.away, team: topic.team }));
			toCustomer([f(pick(r, teamNotes), { hello: chance(r, 0.6) ? `${hello()}\n\n${explained()}` : hello(), team: topic.team })]);
			if (lastStep) {
				if (chance(r, 0.4)) customer(pick(r, ['Thanks.', 'OK, thank you.', 'Thanks for passing it on.']) + short());
			} else say(other(topic.team), `${topic.team.replace(/^the /, '')}, internal`, true, pick(r, bounces), int(r, 1, 3));
		} else if (step === 'drop') {
			customer(f(pick(r, drops), { drop: topic.drop }) + short(), int(r, 0, 2));
			if (chance(r, 0.7)) say(agent, 'support', true, f(pick(r, dropCloses)));
		}
	});

	const subject = f(pick(r, topic.subjects));
	const account = topic.noPlan ? `Account ${v.acc}, no plan yet` : `Account ${v.acc}, ${plan} plan`;
	const from = org || chance(r, 0.7) ? `${v.full} <${email}>, ${company}` : `${v.full} <${email}>`;
	return [`# ${number}: ${subject}`, `Ticket ${number} from ${from}. ${account}. Received ${shortDate(opened)}; escalated to the accounts queue on ${shortDate(escalated)}.`, ...comments.map((comment) => `---\n\n${comment}`)].join('\n\n') + '\n';
};

/** The path and ending of a topic's nth ticket: every combination in turn, in an order fixed per topic. */
const endingFor = (topic: Topic, occurrence: number): [number, End] => {
	const combos = shuffle(mulberry32(0x7e5ec7 + topics.indexOf(topic) * 104729), topic.paths.flatMap((path, index) => path.ends.map((end) => [index, end] as [number, End])));
	return combos[occurrence % combos.length]!;
};

const folder = join(root, 'docs', 'escalations');
mkdirSync(folder, { recursive: true });
const order = mulberry32(20260803);
const pool = shuffle(order, topics.flatMap((topic) => Array.from({ length: topic.weight }, () => topic)));
const seen = new Map<Topic, number>();
const lastNumber = new Map<Topic, number>();
let number = 40210;
let firstDay = 0;
let lastDay = 0;
for (let index = 0; index < ITEMS; index++) {
	const topic = pool[index % pool.length]!;
	const occurrence = seen.get(topic) ?? 0;
	seen.set(topic, occurrence + 1);
	number += int(order, 9, 61);
	const opened = START + Math.floor((index * SPAN) / ITEMS) + int(order, 0, 1);
	if (index === 0) firstDay = opened;
	lastDay = opened;
	writeFileSync(join(folder, `${number}.md`), ticket(index, topic, occurrence, number, opened, lastNumber.get(topic)));
	lastNumber.set(topic, number);
}
writeFileSync(
	join(folder, 'README.md'),
	`# Escalated tickets\n\nThe ${ITEMS} tickets the support desk escalated to the accounts team between ${longDate(firstDay)} and\n${longDate(lastDay)}, exported from the helpdesk, one file each, named by ticket number, with the whole thread as\nit stood at the export. The export did not include the helpdesk's tags, statuses or assignees. Output pasted\ninto a ticket is as its writer pasted it.\n`
);
