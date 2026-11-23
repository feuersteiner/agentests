// Writes the long material of this entry's long tasks: the tickets of Kestrel Print's billing queue from
// 3 August to 13 November 2026, one Markdown file each, under support/tickets/, as the helpdesk exported
// them (thread and internal notes, without tags or status). Deterministic: fixed seeds, no clock, no network.
//   bun long/generate.ts <workspace root>
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// The number of tickets written. Everything else follows from it.
const ITEMS = 120;

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
const money = (pence: number) => `£${String(Math.floor(pence / 100)).replace(/\B(?=(\d{3})+$)/g, ',')}.${pad(pence % 100)}`;

// Dates. Tickets open on working days between START and END; no message is later than LAST.
const START = '2026-08-03';
const END = '2026-11-13';
const LAST = '2026-11-20';
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const asDate = (date: string) => new Date(`${date}T12:00:00Z`);
const addDays = (date: string, days: number): string => {
	const d = asDate(date);
	d.setUTCDate(d.getUTCDate() + days);
	return d.toISOString().slice(0, 10);
};
const weekday = (date: string) => asDate(date).getUTCDay();
const nextWorkday = (date: string, days: number): string => {
	let d = date;
	for (let left = days; left > 0; ) {
		d = addDays(d, 1);
		if (weekday(d) >= 1 && weekday(d) <= 5) left--;
	}
	return d;
};
const longDate = (date: string) => `${Number(date.slice(8))} ${months[Number(date.slice(5, 7)) - 1]} ${date.slice(0, 4)}`;
const dayName = (date: string) => `${weekdayNames[weekday(date)]} ${Number(date.slice(8))} ${months[Number(date.slice(5, 7)) - 1]}`;
const workdays = (from: string, to: string): string[] => {
	const days: string[] = [];
	for (let d = from; d <= to; d = addDays(d, 1)) if (weekday(d) >= 1 && weekday(d) <= 5) days.push(d);
	return days;
};

// People at Kestrel Print. The desk answers the billing queue; finance and development reply in internal notes.
const desk = [
	{ first: 'Priya', full: 'Priya Nair' },
	{ first: 'Tom', full: 'Tom Ashworth' },
	{ first: 'Hollie', full: 'Hollie Grange' },
	{ first: 'Femi', full: 'Femi Adebayo' }
];
const finance = { first: 'Lorraine', full: 'Lorraine Pike' };
const devs = [
	{ first: 'Ruth', full: 'Ruth Mbeki' },
	{ first: 'Alun', full: 'Alun Pryce' }
];

const firstNames = ['Morag', 'Deepak', 'Alison', 'Stefan', 'Chidi', 'Bronwen', 'Farah', 'Lewis', 'Oksana', 'Trevor', 'Niamh', 'Rashid', 'Gemma', 'Piotr', 'Yvonne', 'Callum', 'Shreya', 'Desmond', 'Katya', 'Owen', 'Maribel', 'Arjun', 'Lorna', 'Kwame', 'Ingrid', 'Bashir', 'Tamsin', 'Elliot', 'Roisin', 'Hamza', 'Cerys', 'Dominic', 'Ayesha', 'Fergus', 'Linh', 'Rosalind', 'Jasper', 'Wendy', 'Matteo', 'Grace'];
const surnames = ['Haldane', 'Banerjee', 'Whitlock', 'Prentice', 'Okonkwo', 'Kowalczyk', 'Mistry', 'Trevelyan', 'Abara', 'Farrow', 'Qureshi', 'Dunmore', 'Nakamura', 'Ellery', 'Castellanos', 'Brathwaite', 'Sorensen', 'Marchetti', 'Pennant', 'Lisle', 'Oduya', 'Carmody', 'Venn', 'Holloway', 'Achterberg', 'Rook', 'Sandoval', 'Treharne'];
interface Company {
	name: string;
	domain: string;
	kind: string;
	/** Only raises the topics that name its kind. */
	only?: boolean;
}
const companies: Company[] = [
	{ name: 'Thistle Joinery', domain: 'thistlejoinery.example', kind: 'joinery' },
	{ name: 'Larkrise Primary School', domain: 'larkrise-primary.example', kind: 'school' },
	{ name: 'The Copper Kettle', domain: 'copperkettlecafe.example', kind: 'café' },
	{ name: 'Northgate Estates', domain: 'northgate-estates.example', kind: 'estate agent' },
	{ name: 'Saltmarsh Brewing Co', domain: 'saltmarshbrewing.example', kind: 'brewery' },
	{ name: 'Fernhill Physiotherapy', domain: 'fernhillphysio.example', kind: 'clinic' },
	{ name: 'Millrace Theatre', domain: 'millracetheatre.example', kind: 'theatre' },
	{ name: 'Hollybank Florist', domain: 'hollybankflowers.example', kind: 'florist' },
	{ name: 'Stonebridge Architects', domain: 'stonebridge-arch.example', kind: 'architects' },
	{ name: 'Greenfinch Wildlife Trust', domain: 'greenfinchtrust.example', kind: 'charity' },
	{ name: 'Kingfisher Bookshop', domain: 'kingfisherbooks.example', kind: 'bookshop' },
	{ name: 'Tidewater Events', domain: 'tidewaterevents.example', kind: 'events company' },
	{ name: 'Oakfield Dental Practice', domain: 'oakfielddental.example', kind: 'dental practice' },
	{ name: 'Redcliffe Climbing Wall', domain: 'redcliffeclimbing.example', kind: 'climbing centre' },
	{ name: 'Ashdown Parish Council', domain: 'ashdown-pc.example', kind: 'parish council' },
	{ name: 'Wayland Weddings', domain: 'waylandweddings.example', kind: 'wedding planner' },
	{ name: 'Studio Brannigan', domain: 'studiobrannigan.example', kind: 'design studio' },
	{ name: 'Pennine Cycle Hire', domain: 'penninecycles.example', kind: 'cycle hire' },
	{ name: 'The Long Room Gallery', domain: 'longroomgallery.example', kind: 'gallery' },
	{ name: 'Elmwood Bakehouse', domain: 'elmwoodbakehouse.example', kind: 'bakery' },
	{ name: 'Brightside Yoga', domain: 'brightsideyoga.example', kind: 'yoga studio' },
	{ name: 'Castle Mount Rugby Club', domain: 'castlemountrfc.example', kind: 'rugby club' },
	{ name: 'Ashdown Community Larder', domain: 'ashdownlarder.example', kind: 'food bank' },
	{ name: 'Wayfarers Youth Trust', domain: 'wayfarerstrust.example', kind: 'youth charity' },
	{ name: 'Brook Lane Academy', domain: 'brooklane-academy.example', kind: 'school' },
	{ name: 'Millbridge Town Council', domain: 'millbridge-tc.example', kind: 'town council' },
	{ name: 'Liffey Street Design', domain: 'liffeystreetdesign.example', kind: 'design studio' },
	{ name: 'Boulangerie Marchand', domain: 'boulangerie-marchand.example', kind: 'french bakery', only: true },
	{ name: 'Café des Arts', domain: 'cafedesarts-lyon.example', kind: 'french café', only: true },
	{ name: 'Mill Lane Papers', domain: 'milllanepapers.example', kind: 'paper supplier', only: true }
];
const roles = ['Office manager', 'Owner', 'Bookkeeper', 'Events coordinator', 'Finance officer', 'Director', 'Practice manager', 'Operations lead', 'Clerk', 'Marketing assistant'];
const personalDomains = ['mailbox.example', 'postbox.example', 'inbox.example'];

// The catalogue as the order lines name it.
const products = [
	{ sku: 'CARD-500', name: '500 business cards', price: 3000 },
	{ sku: 'CARD-250', name: '250 business cards', price: 1950 },
	{ sku: 'FLYER-A5-500', name: '500 A5 flyers', price: 4200 },
	{ sku: 'FLYER-A6-1000', name: '1,000 A6 flyers', price: 3900 },
	{ sku: 'POSTER-A2', name: 'A2 poster', price: 1500 },
	{ sku: 'POSTER-A3', name: 'A3 poster', price: 900 },
	{ sku: 'STICKER-50', name: '50 stickers', price: 800 },
	{ sku: 'STICKER-200', name: '200 stickers', price: 2395 },
	{ sku: 'BANNER-PULLUP', name: 'pull-up banner', price: 8900 },
	{ sku: 'MENU-A4-100', name: '100 A4 menus', price: 5600 },
	{ sku: 'INVITE-A6-100', name: '100 A6 invitations', price: 4795 },
	{ sku: 'BOOKLET-A5-24', name: 'A5 booklet, 24 pages', price: 1645 },
	{ sku: 'LETTERHEAD-500', name: '500 letterheads', price: 4500 },
	{ sku: 'POSTCARD-A6-250', name: '250 A6 postcards', price: 2895 }
];
const invoiceDescriptions: Record<string, string> = {
	'CARD-500': '500 business cards',
	'CARD-250': 'Business cards',
	'FLYER-A5-500': 'Flyers, A5',
	'FLYER-A6-1000': 'Flyers, A6',
	'POSTER-A2': 'Posters, A2',
	'POSTER-A3': 'Posters, A3',
	'STICKER-50': 'Stickers',
	'STICKER-200': 'Stickers',
	'BANNER-PULLUP': 'Trade show banner',
	'MENU-A4-100': 'Menus',
	'INVITE-A6-100': 'Invitations',
	'BOOKLET-A5-24': 'Booklets',
	'LETTERHEAD-500': 'Letterheads',
	'POSTCARD-A6-250': 'Postcards'
};
const creditReasons = ['Top-up by card', 'Top-up by bank transfer', 'Refund for misprint', 'Goodwill: late delivery', 'Reprint not possible in time', 'Price match', 'Refund: cancelled proof'];
const currentCoupons = [
	{ code: 'SPRING10', percent: 10 },
	{ code: 'AUTUMN10', percent: 10 },
	{ code: 'WELCOME15', percent: 15 }
];
const oldCoupons = [
	{ code: 'OLD5', printed: 'on the back of our winter flyers in January 2020', ended: '31 January 2020' },
	{ code: 'PRINT20', printed: 'in a local business directory in spring 2021', ended: '30 June 2021' }
];

// Who speaks in a message of an ending: c the customer, s the desk to the customer, n the desk in an internal
// note, f finance in an internal note, d a developer in an internal note.
type Role = 'c' | 's' | 'n' | 'f' | 'd';
type Msg = [Role, string];
type Ending = 'sorted' | 'customer' | 'us' | 'change' | 'declined';
interface Topic {
	/** What the ticket's figures must agree with, when anything. */
	focus?: 'rounding' | 'display' | 'missed' | 'quote' | 'amended' | 'credit' | 'transfer' | 'gift' | 'proof' | 'mixed' | 'charity';
	/** Whether the invoice the ticket is about is still unpaid. */
	unpaid?: boolean;
	/** Whether the opening already says who the customer is, so no background line is added. */
	own?: boolean;
	/** Whether the invoice the ticket is about belongs to another customer. */
	foreign?: boolean;
	/** The kinds of business that raise it, when only some would. */
	kinds?: string[];
	/** Whether the sender is a supplier of Kestrel Print, with no customer account. */
	supplier?: boolean;
	/** The earliest date a ticket on this topic can open. */
	from: string;
	/** Whether a private customer, rather than a business, may raise it. */
	retail: boolean;
	subjects: string[];
	open: string[];
	/** A second paragraph of the customer's first message. */
	detail: string[];
	/** What the desk explains once it has looked. */
	explain: string[];
	turns: [string, string][];
	note: string[];
	ends: Partial<Record<Ending, Msg[][]>>;
}

// Slots, filled per ticket: {first} the customer's first name, {co} the company, {oldco} its former name,
// {domain} its mail domain, {inv} an invoice number, {invamt} its amount, {invdesc} its description,
// {order} an order number, {sku} a product, {amt} and {amt2} amounts, {date} an earlier date, {day} a working
// day a few days on, {agent} and {agent2} people on the desk, {fin} finance, {dev} a developer, {po} a
// purchase order, {vat} a VAT number, {ref} a payment reference, {code} a gift card code, {coupon} a current
// coupon, {lower} it in lower case, {old} an expired coupon, {oldprinted} where it was printed, {oldended}
// when it ended, {n} a count, {q1} and {q2} quantities, {sub}, {exact}, {floor}, {nearest} the rounding
// figures, {bad}, {good} and {total} the discount display figures, {quoted}, {charged} and {diff} a quote,
// {newemail} an address, {masked} a mistyped address, {reason} a credit entry's reason, {charity} a number,
// {since} the date an account was opened, {year} a year.
const topics: Topic[] = [
	{
		from: START,
		retail: false,
		unpaid: true,
		subjects: ['Invoice name', 'Re: Invoice {inv}', 'Our details have changed', 'Wrong company on invoice'],
		open: [
			'We changed our trading name in July from {oldco} to {co}, and the invoice you sent for our last order still has the old name at the top. Our bookkeeper has bounced it back to me because it does not match the name on our bank account. Could you send a corrected copy of {inv}?',
			'Small admin thing. Invoice {inv} came addressed to {oldco}. That has not been our name since the summer; we are {co} now, same people, same premises. Is it possible to have it under the new name?',
			'Our accountant has queried invoice {inv} because it is made out to {oldco}. We rebranded as {co} a couple of months ago and I thought I had updated everything with suppliers, but evidently not with you. What do you need from us?'
		],
		detail: ["The new name is on our letterheads, our website and the bank account, and the address and the people are exactly the same. It is only your invoices that still show the old one.", "I did update the name in the account settings on your website in August, or thought I did. Perhaps it did not save."],
		explain: ["I have looked at the account. The name on it was still {oldco} until this morning, which is why {inv} came out that way; the settings page on the website does not let customers change the account name, only the desk can.", "Our invoices take the name from the account at the moment they are raised, so anything raised before the account changed carries the old name. I have changed the account now."],
		turns: [
			['Is it only the one invoice, or will everything going forward still say the old name?', 'Going forward everything uses the name on the account, and I have updated that now. The invoices already sent keep the name they were raised under, which is why that one needs doing by hand.'],
			['Our accountant also asked whether our company number can go on the invoice.', 'I can put the company number in the account notes, but the invoice layout only has room for the name and the address at the moment. I will mention it to the people who look after the invoices.'],
			['Do you need anything from us to show the change is genuine?', 'Nothing formal. A reply from the email address we already hold for the account is enough for us.'],
			['Will the corrected invoice have a new number?', 'It keeps the same number and amount; only the name line changes, and the date of issue stays as it was.'],
			['Sorry to be a pain about this. Our bookkeeper is very particular.', 'Not at all. Invoices are exactly where the name ought to be right.']
		],
		note: [
			'Account name changed from {oldco} to {co}. The PDF for {inv} was rendered on the day it was raised, so it still carries the old name until it is rendered again.',
			'Checked companies register: {co} is the same company number as {oldco}, only the name has changed. Safe to update.'
		],
		ends: {
			sorted: [
				[['s', 'I have rendered {inv} again with {co} at the top and attached it here. Nothing else on it has changed: same number, same date, same amount.'], ['c', 'Perfect, that is exactly what our bookkeeper wanted. Thanks for sorting it so quickly.']],
				[['s', 'The account now reads {co}, and the corrected copy of {inv} is attached. Anything we raise from today will carry the new name automatically.'], ['c', 'Received, thank you. That is everything.']]
			],
			customer: [[['s', 'I can do that as soon as I have your new registered address as well, as the one on our record is still the old office on the high street. Could you send it over? I will hold the corrected invoice until then.'], ['s', 'Just following up on the message below: I still need the registered address before I can send the corrected copy of {inv}.']]],
			declined: [
				[['f', 'Looked at this. {inv} has been issued, and we do not alter the name on an issued invoice. Future invoices will pick up the new name.'], ['s', 'I have checked with {fin} in our finance team. Because {inv} has already been issued under the old name, it has to stay as it is; we cannot change the name on an invoice after it has been issued. Everything from today will show {co}.'], ['c', 'Fair enough. I will explain that to the bookkeeper and hope she accepts it.']]
			]
		}
	},
	{
		from: START,
		retail: false,
		unpaid: true,
		kinds: ['school', 'parish council', 'town council'],
		subjects: ['Purchase order', 'PO {po}', 'Invoice rejected by our finance system', 'Re: Invoice {inv}'],
		open: [
			'Our finance system will not accept any invoice without a purchase order number. Invoice {inv} has no PO on it, so it is sitting in the rejected pile. The PO is {po}. Can you put it on and send it again?',
			'I raised purchase order {po} for our recent order, and accounts payable tell me your invoice {inv} cannot be paid until it quotes that number. Where on your website do I enter a PO when ordering? I could not see a box for it.',
			'Hello again. The same thing as last term, I am afraid: invoice {inv} has come through without our order number, {po}, and the council will not release payment without it.'
		],
		detail: ["Our finance system matches every invoice to an approved order before it releases payment, and anything without a number goes back to the person who ordered, which is me.", "The PO was raised before we placed the order, so it exists on our side; it simply needs to appear on your invoice somewhere."],
		explain: ["I have had a look. The order form has a field for a job reference, and your colleague put \"Autumn term\" in it, but that field is not carried onto the invoice. The invoice itself has nowhere for a PO except the description.", "Our invoices do not have a separate purchase order line at present. What we can do is add the number to the description, which most finance systems pick up."],
		turns: [
			['Is there a box at checkout for a PO number? I could not find one.', 'There is not, I am afraid. At the moment the order form only takes a reference for the print job, and that does not carry over to the invoice.'],
			['We will be ordering every term, so this will come up again.', 'Understood. I have added a note to the account so that whoever raises your invoices adds the PO by hand until we have something better.'],
			['Our payment run is on the 25th. If the invoice is not on the system by then it waits another month.', 'Thank you for the deadline, that helps. I will make sure it is with you before then.'],
			['Can the PO go in the description line if there is nowhere else?', 'That is the workaround we use, yes. It looks a little untidy, but your system will find it.'],
			['Who should the corrected copy go to? I am only the person who ordered.', 'I will send it to you and copy in whichever address your accounts payable team uses, if you let me know it.']
		],
		note: [
			'There is no field for a purchase order number on an invoice. The workaround is adding "PO {po}" to the end of the description. This is the third public-sector customer this term.',
			'Invoice {inv}, {invamt}, description "{invdesc}". Customer needs PO {po} printed on it.'
		],
		ends: {
			sorted: [[['s', 'I have added PO {po} to the description of {inv} and sent the new copy to your accounts payable team directly, copying you in.'], ['c', 'Accounts payable have confirmed it has gone through. Thank you for being so quick.']]],
			change: [
				[['n', '{dev}, can invoices carry a purchase order number of their own? Editing descriptions by hand for every school and council is going to go wrong sooner or later.'], ['d', 'Agreed. It needs a column on invoices, a field on the order form that fills it, and the PDF has to print it. I have put it on the list for the next release. Until then keep using the description.'], ['s', 'For now I have added the PO to the description of {inv} so that it can be paid. We are also adding a proper purchase order box to the order form and the invoice, and I will let you know when it is live.']],
				[['n', 'Another PO request. {dev}, any chance of a real PO field rather than us typing it into descriptions?'], ['d', 'Yes, it is overdue. An optional purchase_order on invoices, filled from the checkout, printed under the invoice number. I will write it up.'], ['s', 'I have reissued {inv} with the PO in the description. A dedicated purchase order field is being added, so this should not happen with your next order.']]
			],
			customer: [[['s', 'Happy to. Before I do: the PO you sent ends in a letter, and the one in your colleague\'s email has a different number for the same order. Could you confirm which is right, so the invoice is not rejected again?']]]
		}
	},
	{
		from: START,
		retail: false,
		focus: 'mixed',
		kinds: ['design studio'],
		subjects: ['VAT on invoice {inv}', 'VAT number', 'Query about VAT', 'Invoice {inv}'],
		open: [
			'We are a design studio with offices in Dublin and London and ordered {sku} from you last month. The invoice charges UK VAT. As a business registered for VAT in Ireland, I believe we should not be paying it. Our VAT number is {vat}.',
			'Your invoice {inv} does not show our VAT number, and our auditor insists that every supplier invoice does. Could you add {vat} to it, and to future invoices?',
			'Could you explain the VAT on invoice {inv}? Some of the items have VAT and some do not, and our bookkeeper is confused. Our VAT number is {vat}, if that matters.'
		],
		detail: ["We did give our VAT number when we set up the account, I think, though I cannot see it anywhere on the account page now.", "The order was paid by card at the time, so this is about getting the paperwork right rather than an unpaid bill."],
		explain: ["I have checked the account. Your VAT number was not on it until today, so none of the invoices so far could have shown it. I have now added it.", "Whether VAT applies depends on where the goods were sent as well as who bought them, so I have asked finance to look at the delivery address on the order."],
		turns: [
			['Can you show our VAT number on future invoices automatically?', 'The account has a place for it, and I have entered it. Whether it prints on the invoice depends on the template, which I am checking.'],
			['How long does a corrected invoice take?', 'Usually a day or two, because finance has to approve any change to the VAT on an invoice.'],
			['We have paid the invoice already, VAT included.', 'Thanks for telling me. If finance agree the VAT should not have been charged, the difference comes back to you; they will tell me whether that is by card or as credit on the account.'],
			['Is this something you get asked often?', 'More often since the rules changed for goods going to Ireland, yes. It is always worth asking.']
		],
		note: ['For finance: customer says they are VAT-registered in Ireland and should not have been charged UK VAT on {inv}. I have not promised anything.', 'VAT number {vat} now on the account. Invoice {inv} was raised before that.'],
		ends: {
			us: [[['f', 'I need to check this with our accountant before we change anything; the rules for goods sent to Ireland changed and I do not want to get it wrong. I will reply by {day}.'], ['s', 'Our finance team are checking this with our accountant and will come back to you by {day}. I will make sure you hear either way.'], ['c', 'Thanks. Please do not let it drift, our quarter closes soon.']]],
			declined: [[['f', 'Looked at this. The items were delivered to the London office, so UK VAT is correct and the invoice stands.'], ['s', 'I have heard back from finance. Because the order was delivered to your London office, UK VAT applies, so invoice {inv} is correct as it is. I have added your VAT number to the account all the same.'], ['c', 'Ah, I had not realised it went to London. That makes sense, thanks for checking.']]],
			change: [[['n', 'The VAT number is on the account, but the invoice PDF does not print it. {dev}, can it?'], ['d', 'Not today: the template only knows the name and address. It is a small change, and it comes from the same place as the company number some people have asked for, so I will do both.'], ['s', 'Your VAT number is now on your account. Our invoices do not print it yet; that is being added, and I will send you a fresh copy of {inv} once it is.']]]
		}
	},
	{
		from: START,
		retail: false,
		unpaid: true,
		subjects: ['Itemised invoice please', 'Re: Invoice {inv}', 'More detail needed', 'Invoice for our grant'],
		open: [
			'The invoice just says "{invdesc}". Our expenses policy needs the size, quantity and finish on the invoice, otherwise it gets rejected. Could you add those details?',
			'Our grants officer asks for itemised invoices: what was printed, how many and at what unit price. Yours has a single line, "{invdesc}". Is there a more detailed version anywhere?',
			'We are claiming the cost of our open-day print against a community grant, and the funder wants each item listed with its price. Invoice {inv} only has a one-line description. Can you help?'
		],
		detail: ["The order had several items on it, so a single line does not tell our finance team what they are paying for.", "Last time we were able to send the order confirmation alongside the invoice, but this time the funder wants it on the invoice itself."],
		explain: ["I can see what has happened: the invoice was raised with a one-line description of the job, as all our invoices are, while the detail lives on the order. The two documents together have everything your policy asks for.", "Our invoices carry one description line written by whoever raises them. The breakdown by item, quantity and price is on the order confirmation, which I can send again."],
		turns: [
			['Can you send an itemised version from now on?', 'The order itself is itemised, with each product, quantity and price. The invoice we raise from it has one line describing the job.'],
			['The order confirmation had all the detail. Could you just attach that?', 'I can attach the order confirmation alongside the invoice, yes, if that satisfies your policy.'],
			['Our policy also wants the unit price.', 'The order confirmation shows a unit price on each line.'],
			['Is the finish recorded anywhere? Matt or gloss?', 'It is on the job sheet in the studio rather than in billing. I can ask them to confirm it in writing.']
		],
		note: ['Invoice descriptions are whatever the desk typed when raising them. The order lines are in the system, but nothing prints them on the invoice.', 'Order {order} is the one behind {inv}; it has the lines the customer wants.'],
		ends: {
			sorted: [[['s', 'I have attached the order confirmation for {order}, which lists each item with its quantity and unit price, alongside a fresh copy of {inv}.'], ['c', 'Our grants officer has accepted that. Thank you.']]],
			change: [[['n', '{dev}, a few trade customers now ask for itemised invoices. Could the invoice print the order lines instead of one description?'], ['d', 'Possible, but invoices are not linked to orders in the schema, so it means adding that link first. I will write it up properly; it is more than a quick change.'], ['s', 'For now I have attached the order confirmation, which has the breakdown. We are looking at printing the full breakdown on the invoice itself.']]],
			customer: [[['s', 'Of course. Which order was it? You have two with us that month, both for business cards, and I want to attach the right one.']]]
		}
	},
	{
		from: START,
		retail: false,
		subjects: ['Invoices to accounts', 'Change of contact', 'Where invoices go', 'Account email'],
		open: [
			'Could you send our invoices to accounts@{domain} from now on, instead of to me? I ordered {sku} but I do not pay the bills, and I keep having to forward them.',
			'I am leaving {co} at the end of the month and the invoices still come to my own address. Please send them to accounts@{domain} instead.',
			'Our new finance officer has asked that all supplier invoices go to one mailbox, accounts@{domain}. At the moment yours come to whoever placed the order. Can that be changed?'
		],
		detail: ["Several of us order on the same account, and whoever placed the last order seems to get the invoice, so they end up scattered across the office.", "The accounts mailbox is read by two people, so invoices sent there will not get lost when someone is on holiday."],
		explain: ["I have looked at the account: it has a single email address, and that is where the invoices go, whoever orders. That address is also the one used to sign in.", "Invoices go to the email address on the account, which is also the address you sign in with. Order confirmations go separately to whoever placed the order."],
		turns: [
			['Will the order confirmations still come to me?', 'Yes. Order emails go to whoever placed the order; invoices go to the address on the account.'],
			['Can we have two addresses, mine and accounts?', 'An account has one email address at the moment, which is also the one used to sign in.'],
			['If you change it, will I lose access?', 'You would sign in with the new address instead, which is why I wanted to ask before changing anything.'],
			['Several of us order on the same account. Is that a problem?', 'Not for us. Whoever signs in places the order; the invoices all go to the one address on the account.']
		],
		note: ['The account email is both the sign-in and the invoice address, so changing it changes the sign-in too.'],
		ends: {
			sorted: [[['s', 'Done. Invoices for the account now go to accounts@{domain}. You will need to sign in with that address from now on; the password has not changed.'], ['c', 'Great, that works. Thanks.']]],
			change: [[['n', '{dev}: the sign-in email and the invoice address are the same field. Customers keep asking for them to differ. Is a separate billing address possible?'], ['d', 'Yes. It means a new column on users and the invoice emails reading it when it is set. I have opened a ticket for it; it is not a big job.'], ['s', 'I have not changed the sign-in address. We are adding a separate address for invoices; until then I will forward copies to accounts@{domain} by hand.']]],
			customer: [[['s', 'I can change that, but the email is also how you sign in. Do you want accounts@{domain} to be the sign-in as well, or shall I leave it and forward copies?'], ['s', 'Just checking you saw my question below. I have not changed anything yet.']]]
		}
	},
	{
		from: '2026-08-17',
		retail: false,
		focus: 'credit',
		subjects: ['Entry on our statement', 'What is this credit?', 'Account history query', 'Statement'],
		open: [
			'Our account statement shows a credit of {amt} with the reason "{reason}". I cannot match it to anything. What was it for?',
			'There is an entry in our credit history I do not recognise: {amt} on {date}. Our accounts team want to know which order it relates to before they close the month.',
			'I was looking at the account page and there is {amt} of credit on it, added on {date}, labelled "{reason}". Nobody here remembers asking for anything. Could you tell me what it is?'
		],
		detail: ["I have been through our emails for that week and cannot find anything about a refund or a credit, and our bookkeeper will not post an entry she cannot explain.", "It is not a large amount, but our accounts have to reconcile to the penny at the month end."],
		explain: ["I can see the entry on the account. Credit entries carry a short note typed by whoever added them, and this one just says \"{reason}\", which does not tell either of us much. I am finding out what it related to.", "The entry was added by the desk on {date}. Entries like this are usually a refund or a goodwill gesture after a complaint, but the note does not say which order."],
		turns: [
			['So that amount belongs to us?', 'Yes, it is credit on your account and it appears on your statement.'],
			['Why does it not say which order?', 'The note on a credit entry is free text that the desk types when adding it, and it does not record the order.'],
			['Our accountant wants the order number for every adjustment.', 'I can give you the order number for this one, and I will pass on the request.'],
			['Was it something we complained about?', 'Very likely. Credit is usually added after a print problem or a late delivery.']
		],
		note: ['Credit entry of {amt} on {date} was added by {agent2} for a problem with order {order}. The reason text does not mention the order.', 'The credit history only has amount, reason and date. Had to search the inbox for {date} to find the matching complaint.'],
		ends: {
			sorted: [[['s', 'I have tracked it down: it was a refund for the misprint on {sku}, order {order}, added on {date}. I have replied to your accounts team with the details as well.'], ['c', 'Thank you, that matches our records now.']]],
			change: [[['n', '{dev}, could credit entries record the order or invoice they relate to? Every time a customer asks we have to dig through the inbox.'], ['d', 'Reasonable. credit_entries only has a free-text reason. I can add an optional order id and show it in the history. Noted for the next release.'], ['s', 'It was for order {order}, {sku}. We are changing the credit history so it shows the order number next to each entry in future.']]],
			us: [[['s', 'I can see who added it but not why. I have asked {agent2}, who is on leave until {day}, and I will come back to you then.'], ['c', 'OK, thanks. No rush, as long as we get an answer this month.']]]
		}
	},
	{
		from: '2026-08-10',
		retail: true,
		subjects: ['Refund', 'Re: Misprinted order {order}', 'Card refund please', 'Your offer of credit'],
		open: [
			'Your colleague offered to put {amt} on our account as credit for the misprint on {sku}. We do not order often, so could it go back on the card we paid with instead?',
			'Thank you for agreeing to refund the reprint you could not do in time. I would rather have the {amt} back on my card than as credit on the website, if that is possible.',
			'{SKU} arrived with the colours badly off, and your team kindly agreed a refund of {amt}. Before you add it as credit: we would much prefer the money back on our card.'
		],
		detail: ["We are a small business, and money sitting as credit with a supplier we use a couple of times a year does not help our cash flow.", "I appreciate the offer, it is just that I would rather have the money where I can see it."],
		explain: ["I have checked, and the credit has not been added yet, so nothing needs undoing; I have asked finance whether they can refund the card instead.", "Card refunds go through finance rather than the desk. I have passed it to them with the order details, and I have not added the credit."],
		turns: [
			['How long does a card refund take?', 'Finance usually processes card refunds within three working days, and the bank can take a few more days to show it.'],
			['I was not asked which I preferred.', 'You are right, and you should have been. I will feed that back to the team.'],
			['Will I need to send the order back?', 'No, please keep it or recycle it. We do not need it back.'],
			['Can you confirm the amount? I was told {amt}.', 'Yes, {amt}, the full price of the order.']
		],
		note: ['Credit not added yet. Passing to finance for a card refund instead of credit.', 'Order {order}, paid by card on {date}. Agreed refund {amt}.'],
		ends: {
			sorted: [[['f', 'Card refund of {amt} processed today against the original payment.'], ['s', 'Finance refunded {amt} to the card you paid with today. It usually shows within five working days.'], ['c', 'Thank you, I can see it pending already.']]],
			declined: [[['f', 'The original payment is more than six months old and the card processor will no longer refund against it. Credit or a reprint, then.'], ['s', 'I have spoken to finance. The original payment was made more than six months ago, and our card processor will not refund against it any more. We can add the refund to your account as credit, or reprint the job free of charge.'], ['c', 'Then the reprint, please. Same files as before.']]],
			us: [[['f', 'I will do this, but the card processor\'s refund screen is down until {day}.'], ['s', 'Finance will refund your card, but their payment system is down until {day}. I will confirm once it has gone through.']]]
		}
	},
	{
		from: '2026-08-03',
		retail: false,
		focus: 'transfer',
		subjects: ['Bank transfer', 'Payment not showing', 'Top-up', 'Re: Account {acct}'],
		open: [
			'I transferred {amt} on {date} to top up our account, as your website suggests for trade customers, and the account still shows no credit. Our bank says the money left the same day.',
			'We paid by bank transfer last week to put some credit on the account ahead of the Christmas rush. Nothing has appeared yet. The reference we used was "{ref}".',
			'Can you confirm you have received our payment of {amt}? It was a bank transfer on {date}, and I need to show the board that it arrived.'
		],
		detail: ["I have attached the confirmation from our online banking, which shows the payee as Kestrel Print Ltd.", "This is the first time we have topped up by transfer; we usually pay invoices by card."],
		explain: ["I have looked at the account and there is no top-up on it apart from what is listed. Transfers that do not quote the account number have to be matched by hand, so I have asked finance to look for yours.", "Card top-ups show straight away, but bank transfers are matched by finance against the bank statement, usually within two working days if the account number is the reference."],
		turns: [
			['What reference should we have used?', 'Your account number, {acct}, which is on every invoice. Transfers with another reference are matched by hand, which is slower.'],
			['Can you see the payment at all?', 'Finance can see the incoming payments; I have asked them to look for one from your company.'],
			['We need it confirmed by Friday, as our finance team close the month then.', 'Thank you, I have told finance.'],
			['Should we pay by card next time?', 'Card top-ups appear straight away, so if timing matters that is the quicker way.']
		],
		note: ['Asked finance to look for a transfer of {amt} around {date} with the reference "{ref}".', 'Nothing on the account since {since} except what is in the table.'],
		ends: {
			sorted: [[['f', 'Found it. The reference was an old invoice number rather than the account number. Credit added.'], ['s', 'Finance found your transfer: it had an old invoice number as its reference. The {amt} is now on your account.'], ['c', 'Lovely, I can see it. Thanks for chasing.']]],
			customer: [[['f', 'Nothing matching that amount or reference has arrived. Could the customer send the remittance or a screenshot from their bank?'], ['s', 'Finance cannot find a transfer of that amount yet. Could you send the remittance advice or a screenshot from your bank showing the payee details? Sometimes a digit in the sort code is wrong.'], ['s', 'Following up: we still have no sign of the transfer, so the remittance or a screenshot would really help.']]],
			us: [[['f', 'There are three transfers of about that amount from that week with no usable reference. I will go through them with the bank statement on {day}.'], ['s', 'Finance can see a few transfers of about that amount without a clear reference and will match them on {day}. I will let you know as soon as yours is on the account.']]]
		}
	},
	{
		from: '2026-10-15',
		retail: true,
		focus: 'gift',
		subjects: ['Gift card email', 'Gift card not received', 'Code never arrived', 'Birthday present'],
		open: [
			'I bought a {amt} gift card for my sister\'s birthday on {date}. She has not received the email with the code, and it is not in her junk folder either.',
			'I ordered a gift card for a colleague who is leaving us. The email to them never arrived. Can you resend it, or send it to me so I can print it in the card?',
			'Hello, my mother bought me a gift card from you about a week ago and I have no email with a code. She is not very good with computers, so it may have gone to the wrong address.'
		],
		detail: ["The order confirmation came to me straight away, so the payment went through. It is only the gift card email that is missing.", "I have checked my sent emails and the order confirmation, and the address looks right to me."],
		explain: ["I can see the card on our system: it was created when you paid, worth {amt}. The email to the recipient is sent separately by the shop, and I cannot see whether it was delivered.", "The card exists and is ready; only the email is missing. The address the email went to is on the order, and I am checking it now."],
		turns: [
			['Did I type the email wrong?', 'Possibly. The address on the order is {masked}. Could you compare it with the right one?'],
			['Can you send the code to me instead?', 'I can, as you are the buyer. I will send it to the address on your account.'],
			['Is the card still valid if the email was never received?', 'Yes. The card exists from the moment it is bought, whether or not the email arrives.'],
			['I need it by Saturday, so I am a bit anxious about this.', 'Understood, I will get the code to you well before then.']
		],
		note: ['Card {code} issued {date}, value {amt}. The billing service creates the card; the email is sent by the storefront.', 'The order shows the recipient address as {masked}.'],
		ends: {
			sorted: [[['s', 'I have sent the code to you, so you can pass it on however you like. It is {code}, worth {amt}.'], ['c', 'Got it, thank you. Crisis averted.']]],
			change: [[['n', '{dev}: there is no way to resend a gift card email from the back office. I had to ask you for the code last time.'], ['d', 'There is no lookup by buyer either; issue_gift_card only records the value and the date. I will add the buyer\'s email to gift cards and a resend action for the desk.'], ['s', 'I have sent you the code by hand for now: {code}. We are adding a resend button so that this is quicker next time.']]],
			customer: [[['s', 'Happy to resend. The order shows two gift cards bought from your account that day; which one is it, the {amt} or the {amt2}?']]]
		}
	},
	{
		from: '2026-10-15',
		retail: false,
		focus: 'gift',
		subjects: ['VAT receipt for gift cards', 'Receipt query', 'Gift cards and expenses', 'No VAT shown'],
		open: [
			'I bought {n} gift cards for our team as a thank-you and need a VAT receipt for our expenses. The receipt I got shows no VAT. Is that a mistake?',
			'Our finance department rejected my expense claim for the gift cards I bought from you because the receipt shows no VAT and no company name. Can you issue a proper one?',
			'Quick one: the receipt for our gift card order has no VAT line. Every other receipt from you does. Should it?'
		],
		detail: ["The cards were bought for clients and staff as a thank-you, so our finance team want to treat them as a business expense.", "Our finance team say every receipt over £25 must show the supplier's VAT number and the VAT charged."],
		explain: ["I have checked the order and the receipt is correct: no VAT was charged because gift cards are not taxed when they are bought, only when they go towards an order. That is a rule for vouchers generally, not something we have chosen.", "Gift cards are treated as multi-purpose vouchers for VAT, so the VAT is charged on the printing they are later put towards rather than on the card. That is why your receipt shows none."],
		turns: [
			['Why is there no VAT?', 'Gift cards count as vouchers that can go towards anything we sell, so VAT is not charged when the card is bought; it is accounted for later, on the printing itself.'],
			['Our finance team need something in writing.', 'I can send a short letter on our letterhead explaining it.'],
			['Can the receipt at least show our company name?', 'Yes, I can add that.'],
			['So we cannot reclaim anything on these?', 'Not on the cards themselves, no.']
		],
		note: ['{n} cards bought on {date}, {amt} each. The receipt is correct: no VAT on multi-purpose vouchers.'],
		ends: {
			sorted: [[['s', 'I have attached a receipt in your company\'s name with a note explaining why gift cards carry no VAT when they are bought.'], ['c', 'That has done the trick, thank you.']]],
			declined: [[['c', 'Our finance team still insist on a VAT invoice. Can you not just add it?'], ['s', 'I am sorry, we cannot show VAT on a gift card purchase; it would be wrong for us to charge it. What I can give you is the receipt in your company\'s name with the explanation, which I have attached.'], ['c', 'Understood. I will take that back to them.']]],
			customer: [[['s', 'Of course. Which name and address should the receipt show? The cards were bought on a personal account, so I only have your home address.']]]
		}
	},
	{
		from: '2026-10-15',
		retail: false,
		focus: 'gift',
		subjects: ['Christmas gift cards for staff', 'Bulk order enquiry', 'Gift cards x{n}', 'Staff presents'],
		open: [
			'We would like {n} gift cards of {amt} each for our staff Christmas presents. Can you invoice us rather than us paying by card on the website? And can they come as printed cards rather than emails?',
			'Our directors want to give every member of staff a Kestrel Print gift card this year, {n} in all, {amt} each. What is the easiest way to arrange that on account?',
			'Is it possible to buy gift cards in bulk? We need {n} for a staff raffle and prizes at our winter fair.'
		],
		detail: ["We have a list of names, and ideally each card would come to us in a sealed envelope with the name on the front so that we can hand them out.", "The budget is agreed, so the only questions are how to pay and how soon we can have them."],
		explain: ["Gift cards on the website are bought one at a time by card, which is not ideal for {n}. I can set them up from our side and invoice you for the lot instead.", "We can do this. The website is not built for buying many cards at once, so the desk issues the cards and raises one invoice for the total."],
		turns: [
			['Is there a discount for buying in bulk?', 'We do not discount gift cards, I am afraid, but the printed cards and envelopes are free.'],
			['When would we need to order for delivery before the 18th?', 'For printed cards, by the end of the first week of December at the latest.'],
			['Can each card have the person\'s name on it?', 'We can print a name on the envelope, though not on the card.'],
			['What happens if someone leaves before Christmas?', 'The card still belongs to whoever holds the code.']
		],
		note: ['Bulk request: {n} cards at {amt}. issue_gift_card only does one card at a time and is not tied to an invoice, so I would issue them one by one and raise a manual invoice.'],
		ends: {
			us: [[['s', 'Thank you for the list of names. I am setting the cards up now and will send the invoice and a proof of the printed cards by {day}.'], ['c', 'Thanks. We will look out for them.']]],
			change: [[['d', 'issue_gift_card takes one value and returns one code. A batch version that raises one invoice for the lot is easy enough. I will do it before the Christmas orders arrive.'], ['s', 'We are adding a way to issue a batch of cards against one invoice, which should be ready next week. I will set yours up as soon as it is.']]],
			sorted: [[['s', 'All {n} cards are issued and the invoice is attached. The printed cards go out tomorrow with your envelopes.'], ['c', 'Received the invoice, thank you. Looking forward to the cards.']]]
		}
	},
	{
		from: '2026-10-15',
		retail: true,
		subjects: ['Discount code', 'Code not working', 'Your flyer offer', 'Code {old}'],
		open: [
			'I tried the code {old} from one of your flyers and the website says it has expired. The flyer does not mention an end date anywhere.',
			'We found a discount code, {old}, {oldprinted}. Your checkout rejects it. Is there a reason?',
			'My dad kept one of your old flyers with the code {old} on it and asked me to order his business cards with it. It will not go through.'
		],
		detail: ["The flyer has been on our noticeboard for a while, I admit, but there is nothing on it to say the offer would end.", "It is only 5 percent, not a fortune, but it was annoying to be told at the last step."],
		explain: ["I have looked the code up. {old} was a promotion that ran until {oldended}, so the checkout is right that it has expired, even though the flyer did not say so.", "That code is from an old promotion that ended on {oldended}. The flyers were printed without an end date, which was a mistake on our part."],
		turns: [
			['It was printed on your own flyer!', 'It was, and I am sorry the flyer did not show a date. That code ran until {oldended}.'],
			['Can you not apply it anyway as a goodwill gesture?', 'Let me ask the team; I cannot promise anything.'],
			['Is there a current code I can use instead?', '{coupon} is current and gives 10 percent off.'],
			['That is a long time for a code to sit on a flyer.', 'It is. Those flyers had a long life on noticeboards.']
		],
		note: ['{old} expired on {oldended}. Customer has an old flyer.'],
		ends: {
			declined: [[['s', 'I have checked, and we cannot bring back an expired code. What I can do is point you to {coupon}, which gives 10 percent off any order this month.'], ['c', 'Fine, I will use that one.']]],
			sorted: [[['s', 'As a one-off, I have taken 5 percent off your invoice by hand, the same as the old code would have given.'], ['c', 'Very kind, thank you.']]],
			customer: [[['s', 'Could you send me a photo of the flyer? I would like to see which print run it came from before I decide anything.']]]
		}
	},
	{
		from: '2026-10-15',
		retail: true,
		focus: 'missed',
		subjects: ['Coupon', 'Discount not applied', 'Checkout problem', 'Code from your newsletter'],
		open: [
			'I entered "{lower}" at checkout and it told me the coupon does not exist. My friend used the same code last week. I paid full price in the end, as I needed the order placed.',
			'Your newsletter gave the code {coupon}. I typed it on my phone, which does not do capitals, and the site said it did not know the code. Order {order} went through at full price.',
			'Just to let you know your discount box seems broken. "{lower}" was refused, and so was "{coupon}" with a space after it.'
		],
		detail: ["I tried it three times and then gave up and paid, because I needed the order in before the cut-off for delivery this week.", "The code was in your newsletter in capitals, but I typed it on my phone, which does not capitalise."],
		explain: ["I have looked at order {order}: it went through without a discount. The checkout matches the code exactly as typed, so \"{lower}\" is treated as a different code from {coupon}.", "The code {coupon} is valid and would have given 10 percent. The checkout only accepts it in capitals at the moment, which is why yours was refused."],
		turns: [
			['Is it case-sensitive? Nobody types in capitals on a phone.', 'It is, at the moment, which is not ideal.'],
			['Can I get the discount back?', 'Yes, I can arrange for the difference to be refunded.'],
			['How much should I have saved?', 'On order {order}, 10 percent comes to {amt}.'],
			['Will this be fixed? I order quite often.', 'I have passed it to the people who look after the checkout.']
		],
		note: ['Coupon lookup is an exact match on the code, so "{lower}" does not find {coupon}. Spaces are not trimmed either.'],
		ends: {
			change: [[['d', 'get_coupon compares the code exactly. Trimming and upper-casing it before the lookup is a one-line fix; I will make it and add a test.'], ['s', 'We have refunded the {amt} difference to your card, and we are changing the checkout so it accepts codes in any case.']]],
			sorted: [[['s', 'I have refunded {amt}, the 10 percent you should have had on order {order}.'], ['c', 'Thank you, that is very fair.']]],
			us: [[['s', 'I have asked finance to refund the {amt} difference; they will do it by {day}.'], ['c', 'Great, thanks.']]]
		}
	},
	{
		from: '2026-10-15',
		retail: true,
		focus: 'rounding',
		subjects: ['Discount calculation', 'One penny', 'Order {order}', 'Rounding'],
		open: [
			'Not a big deal, but your discount calculation is off by a penny. 10 percent of {sub} is {exact}, and the order took off {floor}.',
			'I work in accounts, so forgive me, but order {order} gave a discount of {floor} on {sub}. Ten percent of that is {exact}, which should round to {nearest}.',
			'Is there a reason your discounts round down? I noticed on order {order} that I got {floor} off rather than {nearest}.'
		],
		detail: ["I double-checked with a calculator in case I was being silly.", "I would not normally bother, but I reconcile our card statements line by line and the penny stood out."],
		explain: ["I have checked order {order}. The discount is worked out on the subtotal of {sub} and rounded down to the whole penny, which gives {floor}.", "You are right about the arithmetic: ten percent of {sub} is {exact}. Our discounts are rounded down to the penny, so the order shows {floor}."],
		turns: [
			['I work in accounts, these things bother me.', 'Fair enough! We round discounts down to the whole penny.'],
			['Shouldn\'t it round to the nearest penny?', 'That is a reasonable expectation; I will ask.'],
			['I am not asking for the penny back, just pointing it out.', 'Understood, and thank you.']
		],
		note: ['Discount is the subtotal times the percentage, divided by 100, rounded down. {sub} at 10 percent gives {floor}.'],
		ends: {
			declined: [[['s', 'I asked, and we round discounts down on purpose, so that a discount never comes to more than its percentage. I have noted your point, but it will stay as it is for now.'], ['c', 'Fair enough, I just wanted to know it was deliberate.']]],
			change: [[['d', 'It is integer division in place_order, so it always rounds down. Rounding half up is a small change; the order totals tests need updating with it.'], ['s', 'You are right that it rounds down. We are changing it to round to the nearest penny.']]]
		}
	},
	{
		from: '2026-10-15',
		retail: true,
		focus: 'display',
		subjects: ['Order confirmation looks wrong', 'Discount line', 'Re: Your order {order}', 'Confused by email'],
		open: [
			'The order confirmation shows the discount as "{bad}", but the total only went down by {good}. Which is it?',
			'Your confirmation email for order {order} has a discount line of "{bad}". That does not look like any amount I know. The total looks right, though.',
			'Is the minus sign in the wrong place on your emails? My discount says "{bad}" and I make it {good}.'
		],
		detail: ["I have looked at it several times and cannot see where that figure comes from.", "I would just like to know I have not been charged more than I should have been before I pass the receipt on."],
		explain: ["I have checked order {order}. The subtotal was {sub}, the discount {good} and the total {total}, which is what you paid. The discount line on the email is shown wrongly, though the amount itself is right.", "The figures on the order are right: {good} off a subtotal of {sub}, so {total} to pay. It is only the way the discount is written on the email that is wrong."],
		turns: [
			['So I paid the right amount?', 'You did. The total of {total} is right; only the discount line is shown wrongly.'],
			['It looks odd on the invoice too.', 'It comes from the same formatting, so I would expect so.'],
			['Should I be worried about anything else on the order?', 'No, the lines and the total are correct.']
		],
		note: ['Order {order}: subtotal {sub}, discount {good}, total {total}. The confirmation shows the discount as {bad}.'],
		ends: {
			change: [[['n', '{dev}, another one about the discount line on the confirmation email.'], ['d', 'Confirmed: the formatting goes wrong for amounts below zero. It is on the list.'], ['s', 'You paid the right amount; the discount line is displayed wrongly and we are fixing it. Sorry for the confusion.']]],
			customer: [[['s', 'Could you send me a screenshot of the email as it appears on your screen? I would like to pass exactly what you see to the people who look after our emails.']]]
		}
	},
	{
		from: '2026-09-07',
		retail: false,
		focus: 'quote',
		unpaid: true,
		subjects: ['Price increase?', 'Invoice {inv} higher than quoted', 'Quote vs invoice', 'Re: Your quote'],
		open: [
			'You quoted us {quoted} for {sku}, and invoice {inv} says {charged}. Nobody told us prices had gone up.',
			'We accepted your quote in good faith and the invoice is {diff} more. I would like to understand why before we pay it.',
			'Invoice {inv} is for {charged}, against a quote of {quoted}. Is there a mistake, or have your prices changed?'
		],
		detail: ["The quote was emailed to us by your studio, and we used it to get the spend approved, so the higher figure has caused a bit of a headache.", "We are happy to pay what we agreed, but I need something in writing to explain the difference to our finance team."],
		explain: ["I have found the quote. It was for {quoted} and dated a little over 30 days before your order, and our prices went up at the start of September, which is where the {diff} comes from.", "The invoice is at the current catalogue price. Your quote was at the old price and was valid for 30 days, which had just passed when the order was placed."],
		turns: [
			['When did the price change?', 'Our paper costs went up at the start of September, and the catalogue prices changed with them.'],
			['The quote does not say it expires.', 'It does say valid for 30 days in the footer, though I know that is small print.'],
			['We ordered only a few days after that.', 'I can see that, and I will take it into account.'],
			['Will prices go up again before Christmas?', 'Nothing is planned.']
		],
		note: ['Quote {quoted}, invoiced {charged}, difference {diff}. The quote was more than 30 days old when the order was placed, but only just.'],
		ends: {
			sorted: [[['s', 'As the order came only a few days after the quote ran out, we have honoured the quoted price. The difference of {diff} has been added to your account as credit.'], ['c', 'Appreciated, thank you.']]],
			declined: [[['s', 'The quote ran out before the order was placed, so the current price applies. I am sorry it was not clearer.'], ['c', 'OK. Please make the expiry clearer on quotes in future.']]],
			customer: [[['s', 'Could you send me the quote? I cannot find it under your account, and it may have been raised under a colleague\'s email.']]]
		}
	},
	{
		from: START,
		retail: false,
		focus: 'amended',
		unpaid: true,
		subjects: ['Invoice amount', 'Confirmation and invoice do not match', 'Re: Order {order}', 'Query on {inv}'],
		open: [
			'Our order confirmation said {amt}, and invoice {inv} says {amt2}. We changed the quantity of flyers after ordering. Is that why?',
			'The invoice is for a different amount from the order confirmation. Can you tell me which one is right? I have to match them for our accounts.',
			'Invoice {inv} does not match order {order}. We did ring to change the quantity from {q1} to {q2}, but I am not sure that is reflected.'
		],
		detail: ["The phone call was with someone on your desk, I think, the day after we ordered.", "I need the two documents to agree, or at least an explanation, before our finance team will pay."],
		explain: ["I have looked at order {order} and invoice {inv}. The order still shows the original quantity, while the invoice was raised for the larger one after your call.", "There is a note on the account that the quantity was changed by phone. The invoice was raised after that, so it reflects the change, but the order record still shows what was first ordered."],
		turns: [
			['Which one should we pay?', 'The invoice, once I have confirmed it matches what was printed.'],
			['Will you send a new confirmation?', 'Order confirmations come from the storefront when the order is placed, so there is no updated one to send.'],
			['We need these to match for the auditor.', 'Understood. I will give you a written explanation to file with them.']
		],
		note: ['Order {order} still shows the original quantity. The desk changed the invoice amount by hand after the phone call.'],
		ends: {
			sorted: [[['s', 'Yes: the invoice was raised after you changed the quantity from {q1} to {q2}, so it is correct. The confirmation was for the original order. A note explaining it is attached for your auditor.'], ['c', 'That explains it, thanks.']]],
			change: [[['n', 'Orders cannot be amended in billing; we changed the invoice by hand and the order still shows the old lines.'], ['d', 'Right, there is no way to change an order\'s lines after it is placed. I will add an amend function so that the order and the invoice agree.'], ['s', 'The invoice is right: it reflects the change you rang through. Our system could not update the order itself, and we are fixing that.']]],
			us: [[['s', 'I need to ask the print floor which quantity they actually printed before I can tell you which figure is right. I will come back to you by {day}.']]]
		}
	},
	{
		from: '2026-08-24',
		retail: false,
		subjects: ['Statement for year end', 'Statement of account', 'Year-end request', 'Accounts'],
		open: [
			'Our year end was 30 September. Could you send a statement of everything invoiced and paid since October last year, plus any credit on the account?',
			'Our auditors have asked for a supplier statement from you covering the last twelve months. Is that something you can produce?',
			'Please could you send a statement for account {acct}? Invoices, payments and credit since {since}.'
		],
		detail: ["We need to agree our balance with each supplier before the accountant signs off.", "I would like it to show each invoice, when it was paid, and any credit on the account, so it can be reconciled in one go."],
		explain: ["I can put that together. We do not have a ready-made statement, but I can combine the invoice list and the credit history for the period.", "There is no statement button as such, but everything is on the account: the invoices with their paid dates, and the credit entries. I will put them into one document for you."],
		turns: [
			['A spreadsheet would be ideal.', 'I can send a spreadsheet.'],
			['Does it include credit notes?', 'It includes credit added to the account, with the reasons.'],
			['Can it be on your letterhead? The auditors are fussy.', 'I will send a PDF on letterhead as well.']
		],
		note: ['There is no statement report. Built this one by hand from the invoice list and the credit history.'],
		ends: {
			sorted: [[['s', 'Statement attached as a spreadsheet and as a PDF: every invoice since {since} with its paid date, and the credit entries.'], ['c', 'Exactly what we needed, thank you.']]],
			change: [[['n', '{dev}, any chance of a statement report? Third one this month done by hand.'], ['d', 'A statement function that lists invoices and credit entries between two dates is straightforward. I will add one.'], ['s', 'Attached is a statement I put together by hand. We are adding a proper statement report so the next one is quicker.']]],
			customer: [[['s', 'Happy to. Which accounts should it cover? I can see more than one account with your company\'s domain.']]]
		}
	},
	{
		from: START,
		retail: true,
		subjects: ['New email address', 'Change my login', 'Account settings', 'Email change'],
		open: [
			'I have a new work email and want to change the one on my Kestrel account. The settings page does not let me edit it.',
			'Please could you change the email on my account to {newemail}? The old address is being switched off at the end of the month.',
			'We have moved to a new domain, so everyone\'s email has changed. Mine is now {newemail}. How do I update the account?'
		],
		detail: ["I can still read the old address for a few more weeks, if that helps.", "Everything else on the account can stay as it is."],
		explain: ["Changing the email on an account is something the desk does at the moment, because it is also the sign-in. I just need to be sure the request comes from you.", "The email address is how you sign in as well as where your invoices go, so we change it for you rather than on the settings page."],
		turns: [
			['Why can I not change it myself?', 'The email is how we identify the account, so for now the desk changes it after confirming it is really you.'],
			['What do you need from me?', 'A reply from the old address, if you still have it, or the number and amount of your last invoice.'],
			['Will my order history stay?', 'Yes, everything stays with the account.']
		],
		note: ['There is no function to change an account\'s email; it has to be done in the database.'],
		ends: {
			sorted: [[['s', 'Done: the account now uses {newemail}. Use it to sign in from now on.'], ['c', 'Works, thanks.']]],
			customer: [[['s', 'Before I change it, please reply from your old address or tell me the number and amount of your last invoice.'], ['s', 'Just checking you saw my message below. I have not changed anything yet.']]],
			change: [[['d', 'Changed it in the database. There should be a proper function for this rather than me editing rows; I will add one with a form for the desk.'], ['s', 'Your account now uses {newemail}. Thank you for your patience.']]]
		}
	},
	{
		from: START,
		retail: false,
		unpaid: true,
		subjects: ['Overdue reminder', 'Re: Payment reminder', 'Already paid', 'Invoice {inv}'],
		open: [
			'We received a reminder that invoice {inv} is overdue. We paid it by bank transfer on {date}; remittance attached.',
			'Please stop sending reminders for {inv}. It was paid on {date}, and I have the bank confirmation in front of me.',
			'Your system says we owe {invamt} on {inv}. Our records say we paid it. Could you check?'
		],
		detail: ["We pay all our suppliers in one run on the last Friday of the month, and yours was in it.", "It is a little embarrassing to get a reminder when we have paid, as it went to our director."],
		explain: ["I have checked: {inv} is still marked open on our side. Payments by transfer are matched by finance against the bank statement, and until they are, the invoice stays open and the reminder goes out.", "The reminder went out because {inv} is still showing as open. I have asked finance to look for your payment on our bank statement."],
		turns: [
			['Why would you send a reminder when it was paid?', 'Reminders go out for invoices still marked open, and payments by transfer are marked paid by hand when finance matches them.'],
			['Please make sure we are not charged a late fee.', 'There are no late fees on our invoices.'],
			['Will we get another reminder next week?', 'Not once it is marked paid.']
		],
		note: ['{inv} still open. Customer says paid by transfer on {date}. Asked finance to match it.'],
		ends: {
			sorted: [[['f', 'Matched: it came in with the account number as its reference. Marked paid.'], ['s', 'Finance have matched your payment and marked {inv} as paid. Sorry for the reminder.'], ['c', 'Thanks.']]],
			change: [[['n', 'Reminders go out the day after an invoice is due, which catches transfers we have not matched yet.'], ['d', 'The reminder job only looks at status and the invoice date. I can add a grace period of a week before the first reminder.'], ['s', 'Your payment is matched and {inv} is marked paid. We are also giving payments more time to arrive before any reminder is sent.']]],
			customer: [[['f', 'No payment of that amount from that company yet. Can they send the remittance?'], ['s', 'Finance cannot find the payment yet. Could you send the remittance advice, with the date and the reference you used?']]]
		}
	},
	{
		from: START,
		retail: true,
		unpaid: true,
		subjects: ['Payment link', 'Card declined', 'Cannot pay invoice {inv}', 'Problem paying'],
		open: [
			'I tried to pay invoice {inv} through the link in your email and my card was declined, though it works everywhere else.',
			'The payment page for {inv} keeps saying "payment could not be completed". Is it me or you?',
			'I want to pay {inv} by card but the link takes me to a page that never finishes loading.'
		],
		detail: ["I tried it on my phone first and then on a laptop, with the same result.", "The card is our business card, which I use for all our other suppliers without trouble."],
		explain: ["I can see the attempt on our side; the card processor declined it without saying why. That usually means the bank wanted to confirm it was you and the confirmation did not appear.", "Nothing on our side has stopped the payment. The processor reports that the bank declined it, which is most often an extra security step that did not show up."],
		turns: [
			['Is it your system or my bank?', 'The message comes from our card processor; the most common cause is the bank asking for an extra security step that the page did not show.'],
			['Can I pay by bank transfer instead?', 'Yes, the details are on the invoice. Please use your account number as the reference.'],
			['I do not want this to count as late.', 'It will not.']
		],
		note: ['{inv} still open. Card processor shows a declined attempt on {date}.'],
		ends: {
			sorted: [[['c', 'Tried again on my laptop and it went through. Must have been the phone.'], ['s', 'Glad it worked. I can see {inv} is now paid.']]],
			customer: [[['s', 'Could you try again and tell me the exact message on the screen? That will tell us whether it is the bank or the page.']]],
			us: [[['s', 'I have asked our card processor to look at the declined attempt. I will come back to you when they reply.'], ['c', 'Thanks. I will wait to hear before I try again.']]]
		}
	},
	{
		focus: 'proof',
		from: START,
		retail: false,
		unpaid: true,
		subjects: ["Charge on invoice {inv}", "What is this £4?", "Proof charge", "Re: Invoice {inv}"],
		open: ["There is a charge of £4.00 on invoice {inv} that I do not understand. The order was for {sku} and nothing else, as far as I know.", "Can you explain the extra £4 on our last invoice? Nobody here remembers agreeing to it.", "Our invoice {inv} came to {invamt}, which is £4 more than the order confirmation. What is the difference for?"],
		detail: ["We have ordered the same thing several times before and never seen it.", "It is a small amount, but our finance team query anything that does not match the order."],
		explain: ["I have looked into it: the £4 is for a printed proof that was sent before the full run. Someone on your side ticked the box for a printed proof when approving the artwork, rather than the free PDF proof.", "The extra amount is a printed proof. It is added when a printed proof is requested at approval, and it appears on the invoice but not on the order confirmation, which is sent before the proof stage."],
		turns: [["Who asked for a printed proof?", "The approval came from the address on the account, on the day the proof was sent. I can forward you the approval email."], ["Why is it not on the order confirmation?", "The confirmation goes out when the order is placed, before anyone chooses the type of proof."], ["Can we make sure it does not happen again?", "I have added a note to the account to check with you before sending a printed proof."], ["We did not even receive a printed proof, as far as I know.", "That would change things. Let me check with the studio whether it was posted."]],
		note: ["Printed proof, £4.00, added to {inv} by the studio after approval. The order confirmation does not show it because the type of proof is chosen later.", "Studio log: printed proof requested and posted on the day of approval."],
		ends: {
			sorted: [[["s", "The studio confirms a printed proof was posted to you on the day of approval, and it was requested from your account. I have forwarded the approval email so your finance team can see where the £4 came from."], ["c", "Thanks, I found it in a colleague's inbox. Mystery solved."]]],
			declined: [[["s", "I have checked with the studio, and the printed proof was requested and posted, so the charge stands. I am sorry it came as a surprise."], ["c", "Understood. We will be more careful with the approval box."]]],
			change: [[["n", "{dev}, customers keep querying the printed proof charge because it only appears on the invoice. Could the invoice show it as its own line?"], ["d", "Invoices are one description and one amount today, so the £4 is folded into the total. It would come with itemised invoices, which are already on the list."], ["s", "The £4 is the printed proof, which was requested at approval. Our invoices fold it into the total at the moment; we are changing them so that extra charges like this show on a line of their own."]]]
		}
	},
	{
		from: START,
		retail: false,
		foreign: true,
		subjects: ["Not our invoice", "Wrong invoice received", "Invoice {inv}?", "Sent to me by mistake"],
		open: ["We have received invoice {inv}, but it is addressed to a different company and for an order we did not place. I assume it was sent to us by mistake.", "This morning I got an email with an invoice that is not ours. It has another customer's name and address on it. I have not opened the payment link.", "Your system has sent me someone else's invoice. I thought you would want to know, as it has their details on it."],
		detail: ["I have deleted it from our inbox, but wanted you to know, as it has their address on it.", "The email was addressed to me by name, which is the odd part."],
		explain: ["Thank you for telling us. I have looked, and the invoice was sent to your address because the other customer's account had your email typed against it, one letter different from theirs.", "I have found what happened: when the other account was set up, its email address was entered with a typo that happened to match yours."],
		turns: [["Does that mean they have our invoices too?", "No. Your own invoices go to your address only. It was their invoice coming to you, not the other way round."], ["Should I do anything with it?", "Please delete it, if you have not already. There is nothing else to do."], ["Has this happened before?", "Not that I know of. I have checked their earlier invoices, and this was the only one sent to you."], ["Will you tell the other customer?", "Yes, we will let them know what happened."]],
		note: ["The other customer's account had its email mistyped. Corrected it. Their invoice {inv} went to {first} only.", "Reported to our data protection lead as a minor incident: one invoice, name and address only."],
		ends: {
			sorted: [[["s", "I have corrected the other customer's email address and resent their invoice to the right person. Thank you again for letting us know so quickly."], ["c", "No problem. Glad it was easy to fix."]]],
			change: [[["n", "{dev}, a mistyped email sent one customer's invoice to another. Could we confirm a new email address before invoices go to it?"], ["d", "Yes: a confirmation link when an address is added or changed, and nothing sent to it until it is clicked. I will add it to the list."], ["s", "I have corrected the address on the other account. We are also adding a step that confirms new email addresses before anything is sent to them."]]],
			us: [[["s", "Our data protection lead is looking at it and will write to you by {day} with what we have done."], ["c", "Thanks. Not a problem from our side, but I appreciate it."]]]
		}
	},
	{
		from: START,
		retail: true,
		unpaid: true,
		subjects: ["Receipt please", "Counter payment", "Receipt for collection", "Paid at the counter"],
		open: ["I collected and paid for {sku} at your counter last week, by card, and nobody gave me a receipt. My employer needs one to reimburse me.", "Could you send me a receipt for the order I paid for at Tanner's Yard? The card machine did not print one.", "I paid at the counter when I collected my order, but I have no invoice or receipt in my email."],
		detail: ["I have the card statement showing the payment, if that helps.", "It was a Thursday afternoon, and I think the person at the counter was new."],
		explain: ["I have found the order on the account: it was paid at the counter by card. Counter payments are marked against the invoice by hand, which is why no receipt email went out.", "Counter payments do not send a receipt automatically, I am afraid. The invoice exists, and I can mark it as paid and send it to you."],
		turns: [["Will the receipt show what I bought?", "Yes, it will show the order and the amount."], ["Can it be in my employer's name?", "I can address it to your employer if you tell me the name and address to use."], ["How quickly can you send it?", "Today, once I have confirmed the payment."]],
		note: ["Counter card payment on {date}. Invoice {inv} was still open; finance to match it before I send a paid copy."],
		ends: {
			sorted: [[["s", "I have attached a paid copy of invoice {inv}, which shows the date and the card payment at the counter."], ["c", "Perfect, that is what I needed."]]],
			customer: [[["s", "Happy to send one. Which name and address should it show? You mentioned your employer."]]],
			us: [[["f", "The counter payment is not on today's settlement report. I will look again when tomorrow's comes in."], ["s", "Finance need to see your payment on the card settlement before I can mark the invoice paid. I will send the receipt as soon as they confirm, by {day} at the latest."]]]
		}
	},
	{
		from: START,
		retail: true,
		own: true,
		subjects: ["Delete my data", "Data request", "Please remove my account", "Closing my account"],
		open: ["Please delete my account and all the personal data you hold about me. I no longer need it.", "Under data protection law, I would like you to erase my details. I ordered once and do not intend to order again.", "I am closing my business at the end of the month. Could you remove my account and everything on it?"],
		detail: ["I would also like confirmation in writing once it is done.", "There is nothing outstanding on the account as far as I know."],
		explain: ["I can close the account and remove your details from our mailing lists. The one thing we have to keep is your invoices, because the law requires us to keep tax records for six years.", "We can remove most of what we hold. Invoices are the exception: they have to stay on file for six years for HMRC, with the name and address on them."],
		turns: [["Why do you need to keep the invoices?", "They are tax records, and we have to be able to show them to HMRC for six years."], ["Can you at least remove my phone number and address from the account?", "Yes, I can remove both from the account itself."], ["Will I keep getting emails?", "No, nothing will be sent once the account is closed."], ["Is there anything outstanding I need to pay?", "No, every invoice on the account is paid."]],
		note: ["Data request. No open invoices. Can close the account; invoices stay for six years."],
		ends: {
			sorted: [[["s", "Your account is closed and your contact details are removed from it. The invoices stay on file for six years, as I explained, and nothing else is kept."], ["c", "Thank you, that is fine."]]],
			declined: [[["c", "I would rather everything was deleted, invoices included."], ["s", "I understand, but we cannot delete the invoices: we are required to keep them for six years. Everything else has been removed, and the account is closed."], ["c", "Fine. Thank you for explaining."]]],
			change: [[["n", "{dev}, there is no way to close an account in billing. I removed the details by hand."], ["d", "Agreed, we need a proper close function that blanks the contact details and keeps the invoices. I will write it."], ["s", "Your account is closed and your details removed, apart from the invoices, which we keep for six years. We are making this a standard process so it is quicker in future."]]]
		}
	},
	{
		from: START,
		retail: false,
		unpaid: true,
		subjects: ["Split invoice", "Two cost centres", "Invoice {inv} needs splitting", "Recharging departments"],
		open: ["Our order included print for two departments, and each pays from its own budget. Could you split invoice {inv} into two invoices, one per department?", "Is it possible to have separate invoices for the items on one order? Our finance team charge each department separately.", "Could invoice {inv} be reissued as two, with {sku} on one and the rest on the other? Finance tell me they cannot split it themselves."],
		detail: ["Each department has its own cost code, which would also need to appear on its invoice.", "In future we could place separate orders, but this one has already gone through."],
		explain: ["Each order gets one invoice at the moment, so splitting it means cancelling {inv} and raising two by hand for the same total.", "Our system raises a single invoice per order. I can split it by hand, as long as finance agree."],
		turns: [["Will the totals add up to the same amount?", "Yes, exactly the same."], ["Can each have its own cost code?", "I can add the cost code to the description of each."], ["Is this going to cause problems if we have already started paying it?", "Nothing has been paid against {inv} yet, so no."], ["Would separate orders be better next time?", "It would, yes: each order gets its own invoice."]],
		note: ["Customer wants {inv} split in two. The system only does one invoice per order; splitting means cancelling it and raising two by hand."],
		ends: {
			sorted: [[["s", "I have replaced {inv} with two invoices, one per department, each with its cost code in the description. Together they come to {invamt}, the same as before."], ["c", "Brilliant, thank you. Finance are happy."]]],
			declined: [[["f", "We do not split an invoice after it is issued; it creates more problems than it solves. Separate orders next time."], ["s", "I have checked with finance, and we cannot split an invoice once it has been issued. If you place separate orders for each department in future, each will get its own invoice."], ["c", "OK, we will do that next time."]]],
			customer: [[["s", "Happy to. Could you send me the two cost codes and tell me which items go to which department?"]]]
		}
	},
	{
		from: START,
		retail: false,
		unpaid: true,
		subjects: ["Reprint", "Invoice for the reprint?", "Re: Misprinted job", "Second invoice"],
		open: ["Your team kindly reprinted {sku} after the first batch came out with the wrong colours. Now I have a second invoice, for the reprint. Surely that is a mistake?", "We received an invoice for the reprint of our order {order}, which I understood was free of charge because the fault was yours.", "Can you check invoice {inv}? It seems to be for the reprint you did for us, which should not cost anything."],
		detail: ["The production team were very helpful and the reprint is perfect; it is just the invoice.", "I have the email from your studio saying the reprint would be at no charge."],
		explain: ["I have looked: the reprint was entered as a new order at full price, which is why an invoice went out. It should have been entered at no charge.", "Reprints of our own mistakes are free. This one was placed as a normal order, so the system raised an invoice for it automatically."],
		turns: [["Do I need to do anything?", "No, please do not pay {inv}."], ["Will I get a reminder for it?", "Not once it is cancelled."], ["Was the first order charged correctly?", "Yes, the first order was invoiced and paid as normal."]],
		note: ["The reprint was entered as a new order at full price, so invoice {inv} went out. There is no way to mark an order as a free reprint."],
		ends: {
			sorted: [[["s", "I have cancelled invoice {inv}, so there is nothing to pay for the reprint. Sorry for the confusion."], ["c", "Thanks for sorting it."]]],
			change: [[["n", "{dev}, reprints keep going in as ordinary orders and invoicing the customer. Can there be a no-charge reprint option?"], ["d", "A reprint flag on orders that skips the invoice is simple enough. I will add it."], ["s", "I have cancelled {inv}. We are also adding a proper reprint option so that this cannot happen again."]]],
			us: [[["s", "I need finance to cancel {inv}, and they will do it by {day}. Please ignore it until then."]]]
		}
	},
	{
		from: START,
		retail: false,
		kinds: ['french bakery', 'french café'],
		subjects: ['Invoice currency', 'Euro invoice', 'Payment from abroad', 'Invoicing question'],
		open: [
			'We are based in Lyon and have started ordering our menus and stickers from you. We would much prefer to be invoiced in euros, as our bank charges us a fee and a poor rate on every payment in pounds. Is that possible?',
			'Could future invoices be issued in euros? Our accounts are kept in euros, and every time we pay an invoice in pounds the amount we see on the bank statement is different from the invoice, which our accountant then has to explain line by line.',
			'We will be ordering regularly for our two shops in France from now on, starting with {sku}. Can you quote and invoice in euros, as most of our suppliers in the UK now do?'
		],
		detail: ["Most of our British suppliers have started offering euro invoices since we opened the second shop.", "We pay everything from a euro account, so pounds always cost us a little extra."],
		explain: ["Our invoices are in pounds only at the moment; every amount in our system is kept in pence, and there is no way to issue one in another currency.", "I have asked around, and as far as anyone knows we have never invoiced in anything but pounds."],
		turns: [
			['What exchange rate would you use if you did it?', 'We would not set one ourselves. If you pay in pounds, the payment converts at your bank\'s rate on the day it is sent.'],
			['Do your other European customers really pay in pounds?', 'They do, yes. Most of them pay by card, which tends to give a better rate than a bank transfer.'],
			['Could you at least show the euro amount on the invoice for reference?', 'I can ask, though an amount in euros that does not match what your bank takes might confuse things further.'],
			['Our bank charges £8 for each transfer in pounds.', 'That is steep. Paying by card through the link on the invoice usually avoids that fee altogether.'],
			['Is there a minimum order to be invoiced at all?', 'No minimum. Every order gets an invoice, whatever its size.']
		],
		note: ['Amounts are kept in whole pence throughout billing and an invoice has no currency of its own, so euros are not something we can offer without a lot of work.', 'Customer in France, account {acct}, orders since {since}. All paid so far, two by card and one by transfer.'],
		ends: {
			declined: [
				[['n', '{dev}, a French customer asks for invoices in euros. I assume the answer is no?'], ['d', 'It is no for now. Everything is pence, and a second currency touches every amount in the service. Not something we would do for one customer.'], ['s', 'I am sorry, we invoice in pounds only, and that is not likely to change soon. The cheapest way to pay is usually by card through the link on each invoice, which converts at your card\'s rate without a transfer fee.'], ['c', 'Understood. We will switch to paying by card.']],
				[['s', 'I have asked, and we can only invoice in pounds. I know that is not the answer you hoped for. Paying by card is the easiest way round the bank charges.'], ['c', 'A pity, but thank you for checking properly.']]
			],
			customer: [[['s', 'We can only invoice in pounds, I am afraid. Would paying by card help? The card converts at your bank\'s rate, which is often better than a transfer, and there is no transfer fee. If that works for you I will send a payment link for the open invoice.'], ['s', 'Just checking whether you would like the payment link for the open invoice. I will hold off until I hear from you.']]]
		}
	},
	{
		from: START,
		retail: false,
		unpaid: true,
		focus: 'charity',
		kinds: ['charity', 'food bank', 'youth charity', 'theatre'],
		subjects: ['VAT for charities', 'Charity order', 'Invoice {inv} VAT', 'Leaflets and banner'],
		open: [
			'We are a registered charity ({charity}) and our new treasurer was told that charities do not pay VAT on printing. Your invoice {inv} for our leaflets and the pull-up banner includes VAT. Could you look at it?',
			'Could you check the VAT on invoice {inv}? We are a charity, and I believe printed leaflets are zero-rated. The total looks higher than I expected for {invamt}.',
			'Our treasurer has asked me to query the VAT on our last invoice before she signs it off. We are charity number {charity}. She thinks we may have been overcharged, but she is new and may be mistaken.'
		],
		detail: ["We are careful with every pound, as most of our income is from members and small donations.", "Our treasurer is checking all our suppliers' invoices at the moment."],
		explain: ["I have looked at {inv}. It has two items, the leaflets and the pull-up banner, and the VAT on it relates to the banner. Leaflets carry no VAT for anyone.", "The VAT depends on what was printed rather than who ordered it, so I have asked finance to look at the items on {inv}."],
		turns: [
			['Leaflets are zero-rated anyway, aren\'t they?', 'Printed leaflets and booklets are zero-rated for everyone, yes. Posters, banners and stickers are standard-rated, whoever buys them.'],
			['Do you need our charity certificate?', 'Not for leaflets. For some other items charities can get relief, and then finance would ask for an eligibility statement.'],
			['Is that the same for the booklets we do every spring?', 'Yes, booklets are zero-rated too.'],
			['Our treasurer would like the rules in writing.', 'I will ask finance for a short explanation she can keep with the invoice.'],
			['We are trying hard to keep costs down this year.', 'Understood. I will make sure nothing has been charged that should not have been.']
		],
		note: ['Charity {charity}. Invoice {inv} has the leaflets and a pull-up banner on it. Passing the VAT question to finance.', 'First invoice for this account since {since} that has anything standard-rated on it, which is probably why it looks different.'],
		ends: {
			sorted: [[['f', 'Looked again: the leaflets were zero-rated. VAT was charged on the pull-up banner only, which is correct.'], ['s', 'Finance have checked: no VAT was charged on the leaflets, only on the banner, which is standard-rated even for charities. I have attached their note for your treasurer.'], ['c', 'Ah, I see. Thanks for checking so thoroughly.']]],
			declined: [[['f', 'The charity relief does not apply to a display banner. The invoice is right.'], ['s', 'I have checked with finance. VAT on the banner is correct, as display items are standard-rated for charities too, so the invoice stands. The leaflets carried no VAT.'], ['c', 'Fine, thank you for explaining. I will pass that on.']]],
			us: [[['f', 'I need to look at the charity\'s eligibility statement from last year before saying anything. Back to you by {day}.'], ['s', 'Finance are looking at this and will come back to you by {day}. Please hold off paying until then.'], ['c', 'Will do. Thank you.']]]
		}
	},
	{
		from: START,
		retail: false,
		subjects: ['Payment terms', '30 days', 'Supplier set-up', 'Invoice terms'],
		open: [
			'Our finance office pays suppliers 30 days after the invoice, in a monthly run. Your invoices say payment is due on receipt, which means every one of them shows as late on our system. Can we have 30-day terms?',
			'Our purchasing policy requires 30-day terms from every supplier, and our auditors flagged that yours are immediate. Could you set that up for us, or tell me what you need?',
			'Is it possible to have our invoices show 30 days to pay instead of immediate payment? Invoice {inv} is the latest one, and our finance team have asked me to sort this out before the next order.'
		],
		detail: ["We have used you for a while and always paid, just not on the day the invoice arrives.", "Our finance team only pays suppliers in a monthly run, so immediate payment is not something we can do."],
		explain: ["At the moment every invoice we raise says payment is due on receipt; it is the same for all customers.", "Our invoices do not carry different terms for different customers at the moment."],
		turns: [
			['Do you need a supplier form from us?', 'Finance may well ask for one, yes. If you have a standard one, send it over.'],
			['We always pay, we are just slow.', 'Understood, and we have never had a problem with your account.'],
			['What happens at the moment if we pay after 30 days?', 'Nothing, beyond a reminder email. There are no charges for late payment.'],
			['Could the reminders be switched off for us, then?', 'I will ask whether that can be done for one account.'],
			['Other suppliers just put "30 days" on the invoice.', 'That would be the sensible way, I agree.']
		],
		note: ['Invoices have no due date of their own; "due on receipt" is printed by the template for everyone.', 'Account {acct}: every invoice since {since} paid between 24 and 35 days after it was raised.'],
		ends: {
			change: [[['n', '{dev}, a school wants 30-day terms printed on their invoices. Can we do terms per account?'], ['d', 'Invoices have no due date at all, and the reminders count from the date raised. Terms per account means a column on users and a due date on invoices. I will write it up.'], ['s', 'Our invoices cannot show other terms yet; we are adding that. In the meantime, paying within 30 days is fine by us, and you can ignore the reminders.']]],
			declined: [[['f', 'Our 30-day terms are for trade accounts over £1,000 a year. This one is well under.'], ['s', 'I have checked with finance. We offer 30-day terms to trade accounts that spend more than £1,000 a year, and your account is not there yet, so invoices stay due on receipt for now.'], ['c', 'OK. We will try to pay promptly, then.']]],
			customer: [[['s', 'We can look at that. Could you send your supplier form, so that finance can set you up? They need it before they change anything.'], ['s', 'Just a reminder that we are waiting for the supplier form before finance can look at the terms.']]]
		}
	},
	{
		from: START,
		retail: false,
		subjects: ['Copy invoices', 'Invoices for our accountant', 'PDFs please', 'Request for copies'],
		open: [
			'Our accountant needs copies of every invoice from April 2025 to March 2026 as PDFs, for our self-assessment. I only have a few of them saved.',
			'Could you send copies of all our invoices from the last tax year? Our accountant has lost the originals in a laptop failure, and I have no idea which ones he had.',
			'Please send copies of invoices {inv} and {inv2}; ours have gone missing in an office move and our bookkeeper needs them before the quarter closes.'
		],
		detail: ["I have some of them as attachments in old emails, but not all, and the accountant wants a complete set.", "They need to be the proper invoices, not the order confirmations."],
		explain: ["I can see all the invoices on the account. Our system produces the PDFs one at a time, so I will gather them for you.", "Every invoice can be downloaded from the account page, but it is quicker if I send them to you in one go."],
		turns: [
			['Can you send them all in one file?', 'I can zip them together, yes.'],
			['How far back can you go?', 'To when the account was opened, which was {since}.'],
			['Do they need to be the originals, or are copies fine for HMRC?', 'Copies of our invoices are fine; they are identical to the originals.'],
			['Can I download them myself in future?', 'Each invoice can be downloaded from the account page, one at a time.']
		],
		note: ['PDF export works one invoice at a time, so a year of copies means rendering each one.', 'Account {acct}, opened {since}. Invoices listed below.'],
		ends: {
			sorted: [[['s', 'All the invoices you asked for are attached as PDFs, in one zip file, named by invoice number.'], ['c', 'Many thanks, that is a weight off.']]],
			customer: [[['s', 'I can do that. Your account only goes back to {since}; before that, were you ordering under a different email or company name? If so, tell me which and I will look there too.']]],
			us: [[['s', 'I can, but our PDF export does one invoice at a time, so it will take me until {day} to get them all to you.'], ['c', 'That is fine, thank you for doing it.']]]
		}
	},
	{
		from: START,
		retail: true,
		subjects: ['Wrong quantity!', 'Cancel order {order}', 'Typo in my order', 'Urgent, please read'],
		open: [
			'I have ordered {q2} stickers instead of {q1}! A typo on my part. Please could you cancel it before it goes to print? Order {order}.',
			'I have just placed order {order} with the wrong quantity, {q2} rather than {q1}. Can it be stopped and corrected before anything is printed?',
			'Help, I added a zero to my order. It should be {q1}, not {q2}. I only noticed when the confirmation came through with a total five times what I expected.'
		],
		detail: ["The proof has not come through yet, so I hope it is not too late.", "I would have caught it at the proof stage, but I approved the artwork in a hurry."],
		explain: ["I can see order {order} for {q2} stickers. It has not been printed yet, as far as I can tell, so there should be time.", "I have found the order. The quickest fix is to cancel it and put a new one in for {q1}, and I am checking with the print floor where it is."],
		turns: [
			['Has it been printed yet?', 'Let me check with the print floor; stickers usually go on the press the morning after the proof is approved.'],
			['Can you just change the quantity instead?', 'It is quicker for us to cancel it and place it again for the right quantity.'],
			['I paid by card. Will I be refunded straight away?', 'The refund goes back to your card once the order is cancelled, usually within a few days.'],
			['Will the artwork need uploading again?', 'No, the studio keeps it with the order, and I can use it for the new one.']
		],
		note: ['Order {order}, {q2} stickers. There is no way to cancel an order in billing; it would have to be done in the database.', 'Print floor says the run for that order is scheduled for tomorrow morning.'],
		ends: {
			sorted: [[['s', 'Caught it: the print floor had not started. I have cancelled the order and placed one for {q1}; the new invoice is attached and the difference is on its way back to your card.'], ['c', 'Phew. Thank you so much.']]],
			change: [[['n', '{dev}, I have had to delete another order by hand because there is no cancel. Can we have one?'], ['d', 'Deleting rows by hand is how we lose invoices. I will add a cancel function that marks the order cancelled and keeps the rows.'], ['s', 'Your order is cancelled and a new one is in for {q1}, with the same artwork. Sorry it took a day.']]],
			declined: [[['s', 'I am sorry: the print floor ran it first thing this morning, so the full quantity has been printed, and I cannot cancel it now. They will be sent out as normal.'], ['c', 'My own fault. OK, I will find a use for them.']]]
		}
	},
	{
		from: START,
		retail: false,
		supplier: true,
		kinds: ['paper supplier'],
		subjects: ['Statement from Mill Lane Papers', 'Overdue account', 'Remittance request', 'Invoice ML-{mlno}'],
		open: [
			'Please find attached our statement for September. Invoice ML-{mlno}, for the 350gsm board delivered in August, is now overdue, and we would be grateful for payment or a date.',
			'We have not yet received payment for our invoice ML-{mlno}. Could you let me know when we can expect it? Our records show it was due at the end of last month.',
			'Could you confirm when invoice ML-{mlno} will be paid? It covers the paper delivered to Tanner\'s Yard on {date}. We have written to this address because it is the one on your website for invoices.'
		],
		detail: ["Our terms are 30 days from the invoice date, as agreed when the account was opened.", "We have supplied Kestrel Print for several years and never had a problem before."],
		explain: ["Thank you for the statement. This mailbox handles our customers' invoices rather than our suppliers', so I am passing it to the right team.", "This address is for customers' billing questions. Supplier invoices are paid by purchasing, so I am forwarding yours."],
		turns: [
			['Is this the right address for supplier invoices?', 'Not quite: this mailbox is for our own customers\' billing. Supplier invoices go to purchasing.'],
			['Who should we contact in future?', 'Our purchasing team, at purchasing@kestrelprint.example.'],
			['Can you at least confirm the invoice was received?', 'I can see it attached here; I will make sure purchasing have it.']
		],
		note: ['This is a supplier, not a customer: Mill Lane Papers chasing their own invoice. Nothing for billing to do except pass it on.', 'No account in billing for Mill Lane Papers.'],
		ends: {
			sorted: [[['s', 'I have passed this to our purchasing team, who pay our suppliers, and they have confirmed they have it. Please send future invoices to purchasing@kestrelprint.example.'], ['c', 'Thank you, noted.']]],
			us: [[['s', 'I have passed your email to purchasing, who will reply to you by {day} with a payment date.'], ['c', 'Thank you. We will wait to hear from them.']]]
		}
	},
	{
		from: START,
		retail: true,
		own: true,
		subjects: ['Unsubscribe', 'Too many emails', 'Marketing emails', 'Please stop'],
		open: [
			'Please take me off your marketing list. I placed one order for party invitations in the spring and have had an offer from you nearly every week since.',
			'I keep getting promotional emails from you after a single order. There is no unsubscribe link at the bottom of the ones that come with my receipts.',
			'Can I stop the newsletters but keep getting my receipts and invoices? I would like the paperwork, just not the offers.'
		],
		detail: ["I am happy to hear from you when I order, just not every week in between.", "I do still want receipts for any orders I place."],
		explain: ["The newsletters come from a separate list from the billing emails, so taking you off one does not affect the other.", "Receipts and invoices are sent by our billing system, while offers come from the newsletter, which is managed separately."],
		turns: [
			['Will I still get invoices and receipts?', 'Yes. Invoices and receipts are not marketing, so they keep coming whatever you choose.'],
			['Why is there no unsubscribe link on the receipts?', 'Receipts come from the billing system and the newsletters from a different one, which is why only the newsletters have the link.'],
			['I never agreed to marketing in the first place.', 'I am sorry about that. I will pass it to the people who run the newsletter.']
		],
		note: ['Marketing list is not in billing. Passed to the newsletter team; nothing to change here.'],
		ends: {
			sorted: [[['s', 'Done: the newsletter team have removed your address from the marketing list. You will still get receipts and invoices for any order you place.'], ['c', 'Thanks, much appreciated.']]],
			customer: [[['s', 'Happy to do that. Which address do the newsletters arrive at? It may not be the one on your account.']]]
		}
	}
];

// Parts of every ticket.
const customerGreetings = ['Hi,', 'Hello,', 'Good morning,', 'Dear Kestrel Print,', 'Hi there,', 'Hello billing team,', 'Afternoon,', 'Dear Sir or Madam,'];
const staffAcks = [
	'Thanks for getting in touch.',
	'Thank you for your email, and sorry for the slow reply; the autumn catalogue went out this week and the queue is longer than usual.',
	'Thanks for letting us know about this.',
	'Thank you for the detail, it makes this much easier to look into.',
	'Thanks for your message, and apologies for keeping you waiting.'
];
const staffHolding = [
	'I am looking into this now and will come back to you as soon as I can.',
	'Let me look at the account and I will reply properly once I have.',
	'I have the account open and need to check a couple of things with colleagues first. You will hear from me within a day or two.',
	'I will look into it and get back to you shortly.'
];
const sideQuestions: [string, string][] = [
	['What time does the collection counter close?', 'The counter at Tanner\'s Yard is open until half past five on weekdays and until one on Saturdays.'],
	['Is the card you use for business cards recycled?', 'Our standard card is FSC-certified; a recycled card is an option at checkout for a small extra cost.'],
	['Can we collect our next order instead of having it delivered?', 'Yes, choose collection at checkout and we will email you when it is ready at the counter.'],
	['A colleague is waiting for a proof of our menus. Is that with you?', 'Proofs come from the studio, so I have passed your message to them; they will be in touch with your colleague directly.'],
	['Do you print on kraft paper?', 'We do, for cards, tags and some stickers. The studio can post you samples.'],
	['Is there a phone number I can ring? The website only shows email.', 'Yes, the desk is on 0117 496 0381, weekdays from nine to five.'],
	['How long do posters take at the moment?', 'Three working days from approval of the proof, or the next day if you choose express.'],
	['Could you print a single sample before a large run?', 'Yes, the studio can do a single proof print before the full run; just ask when you approve the artwork.'],
	['Who do I talk to about a quote for a 48-page booklet?', 'The studio handles quotes for anything outside the catalogue: studio@kestrelprint.example.'],
	['Are you closed at all over Christmas?', 'We close on 24 December and reopen on 4 January; the last orders for delivery before Christmas are on 15 December.'],
	['Do you keep our artwork on file for repeat orders?', 'Yes, the studio keeps print-ready files for two years, so a repeat order only needs the old order number.'],
	['Can you deliver to a different address from the one on the invoice?', 'Yes, the delivery address is set on each order, separately from the account.'],
	['Do you offer a spot UV finish on business cards?', 'Not at the moment, I am afraid; matt, gloss and soft-touch are the finishes we offer.'],
	['Do you do same-day printing in an emergency?', 'For simple jobs, if the artwork is approved by ten in the morning, the counter can usually have it ready by four.'],
	['Has your address changed? My sat nav took me to an empty unit.', 'We are in Unit 4 at Tanner\'s Yard; some maps still show our old unit number, 2.']
];
const asides = [
	'We have our open day on the {nth}, so I am keen to get this straightened out before then.',
	'Sorry if this is the wrong address; your website only had this one.',
	'I am only in the office on Tuesdays and Thursdays, so apologies in advance if I am slow to reply.',
	'We have been very happy with the print itself, I should say. This is purely the paperwork.',
	'Our auditors arrive next month, so I am tidying up everything that does not match.',
	'I have copied in my colleague, who placed the order.',
	'This is the first time we have used you, so I may be missing something obvious.',
	'Thanks in advance for looking into it.',
	'Our previous printer closed in the spring, which is how we found you.'
];
// What a customer says about themselves, by the kind of business, or as a private customer.
const kindContext: Record<string, string[]> = {
	joinery: ['We are a joinery workshop of eight people and order business cards, letterheads and the odd banner for trade shows from you.', 'We make kitchens and fitted furniture, and you print our brochures and the cards we leave with customers.'],
	school: ['We are a primary school of about 300 pupils and order newsletters, certificates and posters for school events from you each term.', 'I look after the office at the school, and we have used you for our prospectus and event posters for a couple of years.'],
	café: ['We are a café by the harbour and have had our menus and loyalty cards printed by you since we opened.', 'We run a small café and order menus from you at every change of season.'],
	'estate agent': ['We are an independent estate agent with two branches and order brochures, window cards and boards from you most months.', 'We use you for property brochures and the cards in our window.'],
	brewery: ['We are a small brewery and use you for beer mats, bottle-shop labels and posters for our tap room events.', 'You print our tap room menus and event posters, and the labels for our seasonal beers.'],
	clinic: ['We are a physiotherapy clinic with three treatment rooms; you print our appointment cards and leaflets.', 'We order patient leaflets and appointment cards from you a few times a year.'],
	theatre: ['We are a community theatre and you print our season brochures, programmes and posters.', 'You have printed our programmes and posters since the theatre reopened.'],
	florist: ['We are a florist and order gift tags, cards and flyers for the wedding fairs from you.', 'We order cards and tags from you for our bouquets, and flyers for the wedding season.'],
	architects: ['We are a practice of twelve architects and order presentation boards and business cards from you.', 'You print our competition boards and our business cards.'],
	charity: ['We are a wildlife charity run mostly by volunteers; you print our membership leaflets and event posters.', 'You print the leaflets and posters for our reserve open days.'],
	bookshop: ['We are an independent bookshop and order bookmarks, event posters and bag stickers from you.', 'You print the posters for our author evenings and our bookmarks.'],
	'events company': ['We run weddings and corporate events and order invitations, place cards and signage from you for most of them.', 'You print invitations and signs for most of our events.'],
	'dental practice': ['We are a dental practice and order appointment cards, letterheads and patient leaflets from you.', 'You print our reminder cards and patient leaflets.'],
	'climbing centre': ['We run a climbing wall and order membership cards, flyers and banners for competitions from you.', 'You print our competition posters and the cards we give new members.'],
	'parish council': ['We are a parish council and order notices, the quarterly newsletter and the annual report from you.', 'I am the clerk to the parish council; you print our newsletter and notices.'],
	'wedding planner': ['I plan weddings and order invitations, order-of-service booklets and menus from you on behalf of my couples.', 'I order stationery from you for the weddings I plan, usually a few times a month in the season.'],
	'design studio': ['We are a small design studio and send you print jobs for our clients, usually business cards and brochures.', 'We use you as our printer for client work.'],
	'cycle hire': ['We hire out bikes in the national park and order trail maps, flyers and banners from you every spring.', 'You print our trail maps and the flyers we leave in the visitor centre.'],
	gallery: ['We are a small gallery and order exhibition posters, postcards and private view invitations from you.', 'You print our exhibition posters and postcards.'],
	bakery: ['We are a bakery with two shops and order bag stickers, menus and loyalty cards from you.', 'You print our bag stickers and the menus for both shops.'],
	'yoga studio': ['We run a yoga studio and order timetables, flyers and gift tags from you.', 'You print our class timetables each term.'],
	'rugby club': ['We are an amateur rugby club and order match-day programmes, posters and membership cards from you.', 'You print our match-day programmes during the season.'],
	'food bank': ['We run a community larder with volunteers and order leaflets and posters from you for our collection days.', 'You print the leaflets we hand out at the larder and in the GP surgeries.'],
	'youth charity': ['We are a youth charity running outdoor trips, and you print our activity leaflets and annual review.', 'You print our programme leaflets and the posters for our open evenings.'],
	'town council': ['We are a town council and order notices, the quarterly newsletter and event posters from you.', 'I work in the town council office; you print our newsletter and the posters for the market.'],
	'french bakery': ['We have two bakeries in Lyon and order our bag stickers and menus from you.', 'Our bakeries in Lyon have used you for stickers and menus since the spring.'],
	'french café': ['We run a café in Lyon and order our menus and loyalty cards from you.', 'You print the menus for our café in Lyon.'],
	'paper supplier': ['We supply the board and paper for your print floor.', 'I look after the accounts at Mill Lane Papers.']
};
const retailContext = [
	'I ordered from you for the first time this summer, for a family party.',
	'I am a freelance illustrator and order prints and business cards from you now and then.',
	'I order our wedding stationery from you; we are getting married in the spring.',
	'I run a craft stall at markets and buy stickers and cards from you a few times a year.',
	'I ordered the posters for my band\'s autumn tour from you.',
	'I organise our street\'s summer fair and order the flyers and posters for it.'
];
const pasteIntros = ['For reference, this is what I received:', 'I have pasted it below:', 'Copying it in here:', 'This is the email I got:', 'Pasted below so you can see it:'];
const handovers = [
	'{was} is away for the rest of the week, so I am picking this up. I have read through the thread so far.',
	'I am taking this over from {was}, who is helping in the studio for a few weeks. No need to repeat anything.',
	'{was} is off sick today, so I have picked up your email.'
];
// Small extra requests a customer adds, settled in the desk's next reply.
const minorMatters: [string, string][] = [
	["Could you also update the delivery address on the account to our new unit, 7 Cooper's Row? Same postcode.", "I have updated the delivery address to 7 Cooper's Row, so new orders will default to it."],
	['While I am writing: our phone number has changed to the one in my signature.', 'I have updated the phone number on the account.'],
	['Separately, could you resend the invoice for an earlier order, {inv2}? I cannot find the email.', 'I have resent invoice {inv2} to the address on the account.'],
	['One other thing: the proof for our next job mentions matt lamination, but we asked for gloss.', 'I have passed the note about the lamination to the studio, who will send a corrected proof.'],
	['By the way, the postcode on our invoices is missing its last letter.', 'Thanks for spotting that. I have corrected the postcode on the account, so future invoices will have it right.'],
	['Could you note on the account that deliveries should go to the side entrance? The last courier left the parcel in the rain.', 'I have added the note about the side entrance; it prints on the delivery label from now on.'],
	['Also, are your DL envelopes available in a recycled option?', 'Yes, we do recycled DL envelopes; they are in the catalogue under stationery.'],
	['Also, could you put my name on the account as the main contact? The person named on it left last year.', 'I have changed the contact name on the account to yours.']
];
const turnLeads = ['', '', '', 'Thanks for that. ', 'Thanks, {agent}. ', 'Sorry, one more question. ', 'That helps, thank you. '];
const chasers = ['Hi, any update on this?', 'Just following up on the below. Is there any news?', 'Sorry to chase, but I have not heard anything since my last email.', 'Hello again. Could someone let me know where this is up to?'];
const chaseReplies = [
	'Sorry for the delay. I am still waiting to hear back from a colleague, but it has not been forgotten.',
	'Apologies, this got buried under the catalogue orders. I am on it today.',
	'Sorry, this has taken longer than it should. I am picking it up again now.'
];
const thanks = ['Thanks, that is helpful.', 'OK, understood.', 'Great, thank you.', 'Right, I see.', 'Thanks for explaining.', 'That makes sense, thanks.'];
const screenIntros = ['Account as it stands:', 'Pasting the account screen for whoever picks this up:', 'Account screen:', 'For reference, the account today:'];
const staffSignoffs = ['Best wishes,\n{agent}\nBilling, Kestrel Print', 'Kind regards,\n\n{agentfull}\nKestrel Print · Unit 4, Tanner\'s Yard · 0117 496 0381', 'Thanks,\n{agent}', 'All the best,\n{agent} at Kestrel Print'];

// One ticket.
const hex = (r: Rand) => Math.floor(r() * 0x10000).toString(16).toUpperCase().padStart(4, '0');
const pence5 = (value: number) => Math.round(value / 5) * 5;

const ticket = (index: number, topic: Topic, opened: string, number: number): string => {
	const r = mulberry32(0x6b70b111 + index * 7919);
	const business = !topic.retail || topic.kinds !== undefined || r() < 0.3;
	const company = pick(r, topic.kinds ? companies.filter((c) => topic.kinds!.includes(c.kind)) : companies.filter((c) => !c.only));
	const cfirst = pick(r, firstNames);
	const clast = pick(r, surnames);
	const cfull = `${cfirst} ${clast}`;
	const role = pick(r, roles);
	const email = business ? `${cfirst.toLowerCase()}@${company.domain}` : `${cfirst.toLowerCase()}.${clast.toLowerCase()}@${pick(r, personalDomains)}`;
	const team = shuffle(r, desk);
	let agent = team[0]!;
	const agent2 = team[1]!;
	const dev = pick(r, devs);
	const acct = String(int(r, 1040, 2980));
	const since = `${int(r, 2023, 2025)}-${pad(int(r, 1, 12))}-${pad(int(r, 1, 28))}`;

	// The account's history: invoices, each with its order, oldest first; the last is the one the ticket is about.
	const focus = topic.focus;
	const count = int(r, 8, 15);
	const history: { inv: number; order: number; date: string; placed: string; lines: [typeof products[number], number][]; sub: number; discount: number; coupon: string; amount: number; desc: string; paid: string }[] = [];
	let inv = int(r, 30200, 30900) + (Number(opened.slice(5, 7)) - 8) * 420;
	let order = inv - 11400 - int(r, 0, 60);
	let day = addDays(opened, -int(r, 240, 420));
	if (day < since) day = since;
	for (let i = 0; i < count; i++) {
		const last = i === count - 1;
		day = last ? addDays(opened, -int(r, 3, 12)) : addDays(day, int(r, 10, 34));
		if (!last && day >= addDays(opened, -14)) continue;
		inv += int(r, 30, 160);
		order += int(r, 30, 160);
		const lines: [typeof products[number], number][] = [];
		const odd = products.filter((p) => p.price % 10 !== 0);
		const bySku = (sku: string) => products.find((p) => p.sku === sku)!;
		if (last && focus === 'rounding') lines.push([pick(r, odd), pick(r, [1, 1, 3])]);
		if (last && focus === 'quote') lines.push([bySku('POSTER-A2'), int(r, 6, 14)]);
		if (last && focus === 'mixed') lines.push([bySku('FLYER-A6-1000'), 1], [bySku('POSTER-A2'), int(r, 2, 8)]);
		if (last && focus === 'charity') lines.push([bySku('FLYER-A5-500'), int(r, 1, 3)], [bySku('BANNER-PULLUP'), 1]);
		for (let k = last && (focus === 'rounding' || focus === 'quote') ? int(r, 0, 1) : last && (focus === 'mixed' || focus === 'charity') ? 0 : int(r, 1, 2); k > 0; k--) {
			const product = pick(r, products.filter((p) => p.price % 10 === 0));
			if (!lines.some(([p]) => p === product)) lines.push([product, product.sku.startsWith('POSTER') || product.sku.startsWith('BOOKLET') ? int(r, 2, 12) : 1]);
		}
		const sub = lines.reduce((sum, [p, q]) => sum + p.price * q, 0);
		const late = day >= '2026-10-14';
		const coupon = last && (focus === 'rounding' || focus === 'display') ? pick(r, currentCoupons.filter((c) => c.percent === 10)) : late && !(last && focus === 'missed') && r() < 0.15 ? pick(r, currentCoupons) : undefined;
		const discount = coupon ? Math.floor((sub * coupon.percent) / 100) : 0;
		const amount = sub - discount;
		const open = last && topic.unpaid === true;
		history.push({ inv, order, date: day, placed: addDays(day, -int(r, 0, 2)), lines, sub, discount, coupon: coupon?.code ?? '', amount, desc: invoiceDescriptions[lines[0]![0].sku]!, paid: open ? '' : addDays(day, int(r, 1, 3)) });
	}
	// A display fault needs pence in the discount.
	const focusRow = history.at(-1)!;
	if (focus === 'display' && focusRow.discount % 100 === 0) {
		focusRow.lines.push([products.find((p) => p.sku === 'STICKER-200')!, 1]);
		focusRow.sub += products.find((p) => p.sku === 'STICKER-200')!.price;
		focusRow.discount = Math.floor(focusRow.sub / 10);
		focusRow.amount = focusRow.sub - focusRow.discount;
	}
	const [mainProduct, mainQty] = focusRow.lines[0]!;
	const earlier = nextWorkday(addDays(opened, -int(r, 6, 14)), 0);

	// Credit entries: amounts added to the account, never taken off.
	const credits: { date: string; amount: number; reason: string }[] = [];
	for (let i = int(r, 0, 3), d = addDays('2026-08-03', int(r, 0, 20)); i > 0 && d < opened; i--, d = addDays(d, int(r, 9, 30)))
		credits.push({ date: d, amount: pick(r, [500, 750, 1000, 1200, 1500, 2000, 2500, 5000]), reason: pick(r, creditReasons) });
	const creditAmt = pick(r, [650, 900, 1200, 1500, 1850, 2400, 3000]);
	const creditReason = pick(r, ['Refund for misprint', 'Goodwill', 'Adjustment', 'Reprint not possible in time']);
	const creditDate = earlier < '2026-08-03' ? '2026-08-05' : earlier;
	if (focus === 'credit') {
		credits.push({ date: creditDate, amount: creditAmt, reason: creditReason });
		credits.sort((a, b) => (a.date < b.date ? -1 : 1));
	}

	const giftValues = [1000, 2000, 2500, 3000, 5000];
	const gift = pick(r, giftValues);
	const gift2 = pick(r, giftValues.filter((v) => v !== gift));
	const transfer = pick(r, [10000, 15000, 20000, 25000, 30000, 50000]);
	const quoted = focusRow.amount;
	const diff = pence5(quoted * (0.05 + r() * 0.07));
	if (focus === 'quote') focusRow.amount = quoted + diff;
	if (focus === 'proof') focusRow.amount += 400;
	const [q1, q2] = focus === 'amended' ? pick(r, [[250, 500], [500, 1000], [1000, 2000]] as const) : (([q]) => [q, q * 10])([pick(r, [50, 100, 200])]);
	if (focus === 'amended') focusRow.amount = focusRow.sub * 2;
	const old = pick(r, oldCoupons);
	const current = pick(r, currentCoupons.filter((c) => c.percent === 10));
	const subPence = focusRow.sub;
	const d = focusRow.discount;
	const typo = `${pick(r, firstNames).toLowerCase()}${pick(r, ['.', '_', ''])}${pick(r, surnames).toLowerCase()}@${pick(r, ['mailbx.example', 'postbox.exmple', 'inbx.example', 'mailbox.exampel'])}`;

	const values: Record<string, string> = {
		first: cfirst,
		co: business ? company.name : 'our family',
		oldco: `${pick(r, surnames)} ${pick(r, ['& Co', 'Ltd', 'Trading Ltd', 'and Partners', 'Group'])}`,
		domain: company.domain,
		acct,
		since: longDate(since),
		inv: String(focusRow.inv),
		inv2: String(history[0]!.inv),
		invamt: money(focusRow.amount),
		invdesc: focusRow.desc,
		order: String(focusRow.order),
		sku: mainQty > 1 ? `the ${mainQty} ${mainProduct.name.replace(/(poster|booklet)/, '$1s')}` : `the ${mainProduct.name}`,
		SKU: mainQty > 1 ? `The ${mainQty} ${mainProduct.name.replace(/(poster|booklet)/, '$1s')}` : `The ${mainProduct.name}`,
		amt:
			focus === 'credit' ? money(creditAmt)
			: focus === 'transfer' ? money(transfer)
			: focus === 'gift' ? money(gift)
			: focus === 'missed' ? money(Math.floor(subPence / 10))
			: focus === 'amended' ? money(focusRow.sub)
			: money(pick(r, [1200, 1500, 2400, 2900, 3000, 4200, 5600])),
		amt2: focus === 'gift' ? money(gift2) : focus === 'amended' ? money(focusRow.amount) : money(pick(r, [800, 1950, 3900, 4500])),
		date: longDate(focus === 'credit' ? creditDate : focus === 'gift' && earlier < '2026-10-15' ? '2026-10-16' : earlier),
		agent2: agent2.first,
		fin: finance.first,
		dev: dev.first,
		po: pick(r, ['PO-', '4500', 'LPS/', 'APC-']) + String(int(r, 100000, 999999)),
		vat: `IE${int(r, 1000000, 9999999)}${pick(r, ['A', 'H', 'V', 'W'])}`,
		ref: pick(r, [`INV ${history[0]!.inv}`, `${company.name.split(' ')[0]!.toUpperCase()} TOPUP`, 'KESTREL PRINT', `ACC ${Number(acct) + 1}`]),
		code: `KP-${hex(r)}-${hex(r)}-${hex(r)}`,
		coupon: current.code,
		lower: current.code.toLowerCase(),
		old: old.code,
		oldprinted: old.printed,
		oldended: old.ended,
		n: String(int(r, 6, 38)),
		nth: (([d]) => `${d}${d % 10 === 1 && d !== 11 ? 'st' : d % 10 === 2 && d !== 12 ? 'nd' : d % 10 === 3 && d !== 13 ? 'rd' : 'th'}`)([int(r, 2, 28)]),
		mlno: String(int(r, 4100, 4899)),
		q1: String(q1),
		q2: String(q2),
		sub: money(subPence),
		exact: `£${Math.floor(subPence / 1000)}.${String(subPence % 1000).padStart(3, '0')}`,
		floor: money(Math.floor(subPence / 10)),
		nearest: money(Math.round(subPence / 10)),
		bad: `£-${Math.floor(d / 100) + 1}.${pad(100 - (d % 100))}`,
		good: money(d),
		total: money(subPence - d),
		quoted: money(quoted),
		charged: money(quoted + diff),
		diff: money(diff),
		newemail: `${cfirst.toLowerCase()}.${clast.toLowerCase()}@${business ? company.domain.replace('.example', '-mail.example') : pick(r, personalDomains)}`,
		masked: typo,
		reason: creditReason,
		charity: String(int(r, 1020000, 1199999))
	};

	// The thread.
	let date = opened;
	let minute = int(r, 8 * 60, 17 * 60);
	const advance = (low: number, high: number) => {
		const before = { date, minute };
		minute += int(r, low, high);
		while (minute >= 18 * 60) {
			date = nextWorkday(date, r() < 0.3 ? 2 : 1);
			minute = 8 * 60 + int(r, 5, 200) + Math.max(0, minute - 18 * 60 - 900);
			if (minute >= 18 * 60) minute = 17 * 60;
		}
		// Nothing is later than LAST: a thread that reaches it carries on later the same day.
		if (date > LAST) {
			date = LAST;
			minute = before.date === LAST ? Math.min(before.minute + int(r, 3, 25), 23 * 60 + 50) : 8 * 60 + int(r, 5, 60);
		}
	};
	let due: string | undefined;
	const stamp = () => `${longDate(date)}, ${pad(Math.floor(minute / 60))}:${pad(minute % 60)}`;
	const fill = (text: string) =>
		text.replace(/\{(\w+)\}/g, (_, key: string) => (key === 'day' ? (due ??= dayName(nextWorkday(date, int(r, 2, 4)))) : key === 'agent' ? agent.first : key === 'agentfull' ? agent.full : (values[key] ?? `{${key}}`)));
	const blocks: string[] = [];
	const signoff = () =>
		business
			? fill(pick(r, [`Thanks,\n${cfirst}`, `Kind regards,\n\n${cfull}\n${role}, ${company.name}`, `Many thanks,\n${cfull}`, `Best,\n${cfull}\n${company.name}\n0${int(r, 1100, 1999)} ${int(r, 100000, 999999)}`]))
			: pick(r, [`Thanks,\n${cfirst}`, `Many thanks,\n${cfull}`, `Cheers,\n${cfirst}`, `Kind regards,\n${cfull}`]);
	const customer = (paragraphs: string[], full = true) => {
		const greeting = blocks.length === 0 ? pick(r, customerGreetings) : pick(r, ['Hi {agent},', 'Hello {agent},', 'Hi,', 'Hello again,', 'Hi there,']);
		blocks.push(`**${cfull}** · ${stamp()}\n\n${(full ? [greeting, ...paragraphs, signoff()] : paragraphs).map((text) => (text.startsWith('```') ? text : fill(text))).join('\n\n')}`);
	};
	const staff = (paragraphs: string[]) => {
		blocks.push(`**${agent.full} (Kestrel Print)** · ${stamp()}\n\n${[`${pick(r, ['Hi', 'Hello', 'Dear'])} ${cfirst},`, ...paragraphs, pick(r, staffSignoffs)].map(fill).join('\n\n')}`);
	};
	const internal = (who: string, paragraphs: string[]) => {
		blocks.push(`**${who}, internal note** · ${stamp()}\n\n${paragraphs.map(fill).join('\n\n')}`);
	};

	// The account screen, as the desk pastes it into an internal note.
	const screen = (): string => {
		const rows = topic.foreign ? history.slice(0, -1) : history;
		const total = credits.reduce((sum, entry) => sum + entry.amount, 0);
		const out = [
			`Account ${acct} · ${business ? company.name : cfull} · ${email} · opened ${since}`,
			`Credit on account: ${money(total)}`,
			'',
			'| Invoice | Raised | Description | Amount | Status |',
			'| --- | --- | --- | ---: | --- |',
			...rows.map((row) => `| ${row.inv} | ${row.date} | ${row.desc} | ${money(row.amount)} | ${row.paid ? `paid ${row.paid}` : 'open'} |`),
			'',
			// Coupons came with release 0.4.0 on 14 October; the screen showed no discount columns before.
			...(opened >= '2026-10-14'
				? ['| Order | Placed | Lines | Subtotal | Discount | Coupon |', '| --- | --- | --- | ---: | ---: | --- |', ...rows.map((row) => `| ${row.order} | ${row.placed} | ${row.lines.map(([p, q]) => `${p.sku} × ${q}`).join(', ')} | ${money(row.sub)} | ${money(row.discount)} | ${row.coupon || '—'} |`)]
				: ['| Order | Placed | Lines | Subtotal |', '| --- | --- | --- | ---: |', ...rows.map((row) => `| ${row.order} | ${row.placed} | ${row.lines.map(([p, q]) => `${p.sku} × ${q}`).join(', ')} | ${money(row.sub)} |`)])
		];
		out.push('', '| Email | Sent | Subject |', '| --- | --- | --- |');
		for (const row of rows.slice(-3)) {
			out.push(`| order confirmation | ${row.placed} | Your Kestrel Print order ${row.order} |`);
			if (r() < 0.8) out.push(`| proof ready | ${row.placed < row.date ? addDays(row.date, -1) : row.date} | Proof for order ${row.order} |`);
			out.push(`| invoice | ${row.date} | Invoice ${row.inv} from Kestrel Print |`);
			if (!row.paid && addDays(row.date, 8) < opened) out.push(`| reminder | ${addDays(row.date, 8)} | Invoice ${row.inv}: payment due |`);
		}
		if (credits.length)
			out.push('', '| Credit entry | Amount | Reason |', '| --- | ---: | --- |', ...credits.map((entry) => `| ${entry.date} | ${money(entry.amount)} | ${entry.reason} |`));
		return '```text\n' + out.join('\n') + '\n```';
	};

	// What the customer pastes: the invoice as they received it, or the order confirmation email.
	const zeroRated = (sku: string) => sku.startsWith('FLYER') || sku.startsWith('BOOKLET');
	const invoiceCopy = (row: (typeof history)[number], to: string, account = acct): string => {
		const standard = row.lines.filter(([p]) => !zeroRated(p.sku)).reduce((sum, [p, q]) => sum + p.price * q, 0);
		const share = row.sub ? standard / row.sub : 0;
		const vat = Math.round(row.amount * share - (row.amount * share) / 1.2);
		const cell = (text: string, width: number) => text.padStart(width);
		return [
			'```text',
			"Kestrel Print Ltd · Unit 4, Tanner's Yard · VAT reg. GB 318 4471 52",
			'',
			`INVOICE ${row.inv}`.padEnd(40) + `Date: ${longDate(row.date)}`,
			`Account: ${account}`,
			`To: ${to}`,
			'',
			'Description'.padEnd(28) + cell('Net', 10) + cell('VAT', 10) + cell('Total', 10),
			row.desc.padEnd(28) + cell(money(row.amount - vat), 10) + cell(money(vat), 10) + cell(money(row.amount), 10),
			'',
			'Payment due on receipt.',
			`Pay by card at kestrelprint.example/pay/${row.inv}, or by bank transfer to`,
			'Kestrel Print Ltd, sort code 30-94-57, account 21048833, quoting your account number.',
			'```'
		].join('\n');
	};
	const shown = (pence: number) => (pence % 100 === 0 ? `£-${pence / 100}.00` : `£-${Math.floor(pence / 100) + 1}.${pad(100 - (pence % 100))}`);
	const confirmation = (row: (typeof history)[number]): string =>
		[
			'```text',
			`Thanks for your order, ${cfirst}!`,
			'',
			`Order ${row.order} · placed ${longDate(row.placed)}`,
			'',
			...row.lines.map(([p, q]) => `${q} × ${p.name} (${p.sku})`.padEnd(46) + money(p.price * q).padStart(10)),
			'',
			'Subtotal'.padEnd(46) + money(row.sub).padStart(10),
			...(row.discount ? [`Discount (${row.coupon})`.padEnd(46) + shown(row.discount).padStart(10)] : []),
			'Total'.padEnd(46) + money(row.sub - row.discount).padStart(10),
			'',
			'We will email you a proof within one working day.',
			'Questions? Reply to this email or ring 0117 496 0381.',
			'```'
		].join('\n');
	const mentions = (key: string) => [...topic.open, ...topic.turns.flat()].some((text) => text.includes(`{${key}}`));
	const orderish = focus === 'missed' || focus === 'rounding' || focus === 'display' || focus === 'amended' || mentions('order');
	const pasted =
		orderish && r() < (focus === 'display' ? 0.85 : 0.55) ? `${pick(r, pasteIntros)}\n\n${confirmation(focusRow)}`
		: !orderish && mentions('inv') && r() < 0.55
			? `${pick(r, pasteIntros)}\n\n${topic.foreign ? invoiceCopy(focusRow, `${pick(r, companies.filter((c) => c !== company)).name}, ${email}`, String(int(r, 1040, 2980))) : invoiceCopy(focusRow, `${mentions('oldco') ? values.oldco : business ? company.name : cfull}, ${email}`)}`
		: undefined;
	const background = business ? pick(r, kindContext[company.kind]!) : pick(r, retailContext);

	const sides = business ? sideQuestions : sideQuestions.filter(([ask]) => !/colleague|our menus/.test(ask));
	const side = r() < 0.4 ? pick(r, sides) : undefined;
	const second = r() < 0.45 ? pick(r, sides.filter((q) => q !== side)) : undefined;
	const keep = new Set(shuffle(r, topic.turns.map((_, i) => i)).slice(0, Math.min(topic.turns.length, int(r, 3, 5))));
	const turns = topic.turns.filter((_, i) => keep.has(i));
	const kinds = Object.keys(topic.ends) as Ending[];
	const ending = kinds[(index * 3 + int(r, 0, 1)) % kinds.length]!;
	const steps = pick(r, topic.ends[ending]!);

	customer([
		...(!topic.own && r() < 0.7 ? [background] : []),
		...(side ? [`Before the main thing: ${side[0].charAt(0).toLowerCase()}${side[0].slice(1)}`] : []),
		pick(r, topic.open),
		...(r() < 0.8 ? [pick(r, topic.detail)] : []),
		...(pasted ? [pasted.split('\n\n')[0]!, pasted.slice(pasted.indexOf('```'))] : []),
		...(r() < 0.45 ? [pick(r, business ? asides : asides.filter((text) => !/auditors|colleague|previous printer/.test(text)))] : [])
	]);
	advance(30, 400);
	staff([pick(r, staffAcks), ...(side ? [side[1]] : []), pick(r, staffHolding)]);
	if (!topic.supplier && r() < 0.92) {
		advance(5, 120);
		internal(agent.full, [pick(r, topic.note), `${pick(r, screenIntros)}\n\n${screen()}`]);
	} else {
		advance(5, 120);
		internal(agent.full, [pick(r, topic.note)]);
	}
	const minor = r() < 0.45 ? pick(r, minorMatters) : undefined;
	if (r() < 0.85) {
		advance(20, 400);
		staff([pick(r, topic.explain)]);
	}
	const handover = !mentions('agent2') && !Object.values(topic.ends).flat(2).some((text) => text.includes('{agent2}')) && r() < 0.25;
	turns.forEach(([ask, answer], position) => {
		advance(60, 900);
		const lead = ask.endsWith('?') ? pick(r, turnLeads) : pick(r, ['', '', 'Also, ', 'Another thing: ']);
		const said = lead + (lead && !ask.endsWith('?') ? ask.charAt(0).toLowerCase() + ask.slice(1) : ask);
		customer(position === 1 && second ? [said, `One more thing while I have you: ${second[0].charAt(0).toLowerCase()}${second[0].slice(1)}`] : position === 0 && minor ? [said, minor[0]] : [said], r() < 0.7);
		const extra = position === 1 && second ? [`On your other question: ${second[1].charAt(0).toLowerCase()}${second[1].slice(1)}`] : position === 0 && minor ? [minor[1]] : [];
		advance(30, 500);
		if (handover && position === 1) {
			const was = agent.first;
			agent = agent2;
			advance(600, 1500);
			staff([pick(r, handovers).replace('{was}', was), answer, ...extra]);
			return;
		}
		staff([answer, ...extra]);
		if (r() < 0.3) {
			advance(20, 300);
			customer([pick(r, thanks)], false);
		}
	});
	if (r() < 0.5) {
		advance(900, 2400);
		customer([pick(r, chasers)], false);
		advance(30, 300);
		staff([pick(r, chaseReplies)]);
	}
	for (const [who, text] of steps) {
		advance(who === 'c' ? 120 : 30, who === 'c' ? 1200 : 600);
		if (who === 'c') customer([text], r() < 0.5);
		else if (who === 's') staff([text]);
		else if (who === 'n') internal(agent.full, [text]);
		else if (who === 'f') internal(`${finance.full} (finance)`, [text]);
		else internal(`${dev.full} (development)`, [text]);
		// A desk reminder to a customer who has not replied comes days later.
		if (who === 's' && ending === 'customer' && steps.length > 1) advance(1800, 3000);
	}

	const subject = fill(pick(r, topic.subjects));
	const header = [
		`# Ticket ${number}: ${subject}`,
		`Requester: ${cfull} <${email}>${business ? ` · ${company.name}` : ''}  \nReceived ${longDate(opened)} by ${pick(r, ['email', 'email', 'web form'])}${topic.supplier ? '' : ` · account ${acct}`}`
	];
	return [...header, ...blocks].join('\n\n---\n\n').replace(/^(# .*)\n\n---\n\n/, '$1\n\n') + '\n';
};

// Topics are spread evenly over the tickets; each ticket draws everything else from its own generator.
const order = mulberry32(20261113);
const assigned = shuffle(order, Array.from({ length: ITEMS }, (_, i) => i % topics.length));
const days = workdays(START, END);
const planned = assigned.map((topicIndex, index) => {
	const r = mulberry32(0x0da7e000 + index * 104729);
	const topic = topics[topicIndex]!;
	const allowed = days.filter((day) => day >= topic.from);
	return { index, topic, opened: allowed[Math.floor(r() * allowed.length)]! };
});
planned.sort((a, b) => (a.opened === b.opened ? a.index - b.index : a.opened < b.opened ? -1 : 1));

const folder = join(root, 'support', 'tickets');
mkdirSync(folder, { recursive: true });
let number = 48190;
for (const { index, topic, opened } of planned) {
	number += int(order, 9, 70);
	writeFileSync(join(folder, `${number}.md`), ticket(index, topic, opened, number));
}
writeFileSync(
	join(folder, 'README.md'),
	'# Billing queue tickets\n\nThe tickets the billing queue of the helpdesk received between 3 August and 13 November 2026, one file\neach, named by ticket number, with the whole thread and the internal notes as the helpdesk exported them.\nThe export does not carry the helpdesk\'s tags or statuses. Account screens in internal notes are as the desk\npasted them.\n'
);
