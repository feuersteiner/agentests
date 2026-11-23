// Writes the long material of this entry's long tasks: the tickets Pennywren's billing desk handled between
// 1 September and 30 October 2026, one Markdown file each, under support/billing-desk/, as the help desk exported
// them on 13 November, without tags or statuses. Deterministic: fixed seeds, no clock, no network.
//   bun long/generate.ts <workspace root>
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** How many tickets to write. Everything else is derived from it. */
const ITEMS = 331;

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
const shuffle = <T>(r: Rand, items: readonly T[]): T[] => {
	const out = [...items];
	for (let i = out.length - 1; i > 0; i--) {
		const j = Math.floor(r() * (i + 1));
		[out[i], out[j]] = [out[j]!, out[i]!];
	}
	return out;
};

// ---------------------------------------------------------------------------------------------------------
// Dates. Everything happens in 2026, before the export on 13 November, except renewals that fall in 2027.
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WDL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const utc = (ms: number) => new Date(ms);
const year = (ms: number) => (utc(ms).getUTCFullYear() === 2026 ? '' : ` ${utc(ms).getUTCFullYear()}`);
const stamp = (ms: number) => `${WD[utc(ms).getUTCDay()]} ${utc(ms).getUTCDate()} ${MON[utc(ms).getUTCMonth()]} 2026, ${clock(ms)}`;
const clock = (ms: number) => `${pad(utc(ms).getUTCHours())}:${pad(utc(ms).getUTCMinutes())}`;
const dayMonth = (ms: number) => `${utc(ms).getUTCDate()} ${MONL[utc(ms).getUTCMonth()]}${year(ms)}`;
const short = (ms: number) => `${utc(ms).getUTCDate()} ${MON[utc(ms).getUTCMonth()]} ${utc(ms).getUTCFullYear()}`;
const iso = (ms: number) => utc(ms).toISOString().slice(0, 10);
const fullDay = (ms: number) => `${WDL[utc(ms).getUTCDay()]} ${dayMonth(ms)}`;
const midnight = (ms: number) => ms - (ms % DAY);
const addMonths = (ms: number, months: number) => {
	const d = utc(ms);
	return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, d.getUTCDate());
};
const weekdayOnOrAfter = (ms: number) => {
	let day = midnight(ms);
	while (utc(day).getUTCDay() === 0 || utc(day).getUTCDay() === 6) day += DAY;
	return day;
};
const FIRST_DAY = Date.UTC(2026, 8, 1);
const LAST_DAY = Date.UTC(2026, 9, 30);
const EXPORT = Date.UTC(2026, 10, 13);
const openDays: number[] = [];
for (let day = FIRST_DAY; day <= LAST_DAY; day += DAY) if (utc(day).getUTCDay() !== 0) openDays.push(day);

// ---------------------------------------------------------------------------------------------------------
// Money, in minor units, as the billing app keeps it.
const PRICES = {
	EUR: { sym: '€', name: 'euros', Team: 4900, Business: 14900, seatTeam: 750, seatBusiness: 1200 },
	GBP: { sym: '£', name: 'pounds', Team: 4200, Business: 12900, seatTeam: 650, seatBusiness: 1050 }
} as const;
type Cur = keyof typeof PRICES;
const grouped = (cents: number) => (Math.abs(cents) / 100).toFixed(2).replace(/\B(?=(\d{3})+\.)/g, ',');
const money = (cur: Cur, cents: number) => `${cents < 0 ? '-' : ''}${PRICES[cur].sym}${grouped(cents)}`;
const coded = (cur: Cur, cents: number) => `${cur} ${cents < 0 ? '-' : ''}${grouped(cents)}`;
const INCLUDED = { Team: 5, Business: 10 } as const;

// ---------------------------------------------------------------------------------------------------------
// People and places.
const firstF = ['Ines', 'Margot', 'Saskia', 'Hanna', 'Priya', 'Aoife', 'Leonie', 'Clara', 'Nadia', 'Femke', 'Rosa', 'Eilidh', 'Malin', 'Chiara', 'Zofia', 'Bethan', 'Amira', 'Lotte', 'Carmen', 'Siobhan', 'Elodie', 'Greta', 'Yasmin', 'Tamsin', 'Marit', 'Paula'];
const firstM = ['Jasper', 'Tobias', 'Ruairi', 'Matthias', 'Kwesi', 'Lars', 'Diego', 'Owain', 'Florian', 'Niall', 'Pieter', 'Hamza', 'Benoit', 'Callum', 'Stefan', 'Joost', 'Ewan', 'Marek', 'Tomasz', 'Arjun', 'Felipe', 'Rory', 'Bastian', 'Idris', 'Gideon', 'Luuk'];
const surnames = ['Okafor', 'de Vries', 'Brennan', 'Hoffmann', 'Lindqvist', 'Moreau', 'Kowalski', 'Achterberg', 'Gallagher', 'Weber', 'Dubois', 'Castillo', 'Novak', 'Fitzgerald', 'van Dijk', 'Schneider', 'Mensah', 'Ferreira', 'Bakker', 'Horvath', 'Lambert', 'Ruiz', 'Byrne', 'Janssens', 'Petrov', 'Sutherland', 'Haddad', 'Visser', 'Kearney', 'Lefevre'];
const heads = ['Fernhill', 'Brightwater', 'Oakmoor', 'Kingfisher', 'Tidewell', 'Saltmarsh', 'Copperleaf', 'Northgate', 'Larkspur', 'Mill Race', 'Bluebell', 'Harbourside', 'Greystone', 'Thistle', 'Willowby', 'Redcliffe', 'Stillwater', 'Ashdown', 'Foxglove', 'Lindenhof', 'Marigold', 'Westerkade', 'Hollin', 'Quayside', 'Elmstead', 'Kestrelmoor'];
const tails = ['Studio', 'Architects', 'Design', 'Consulting', 'Engineering', 'Translations', 'Media', 'Landscape', 'Partners', 'Interiors', 'Research', 'Digital', 'Surveyors', 'Productions', 'Advisory', 'Workshop', 'Labs', 'Communications', 'Planning', 'Legal'];
const titles = ['Office manager', 'Operations lead', 'Founder', 'Managing director', 'Finance manager', 'Studio manager', 'Bookkeeper', 'Practice manager', 'Head of operations', 'Project director', 'Business manager', 'Partner'];
const agents = ['Maud', 'Teodor', 'Anjali', 'Ronan', 'Liesel', 'Kwame', 'Sabine', 'Ilse'];
const teamPeople: Record<string, string> = {
	'the finance team': 'Margit',
	'the payments team': 'Oskar',
	'the sales team': 'Delphine',
	'the security team': 'Ravi',
	'the product support team': 'Yusuf',
	'the privacy team': 'Annika',
	'the customer success team': 'Bram'
};
interface Country {
	name: string;
	cur: Cur;
	vat: number;
	prefix: string;
	towns: string[];
	streets: string[];
	banks: string[];
	lang?: string;
	eu: boolean;
}
const countries: Country[] = [
	{ name: 'Netherlands', cur: 'EUR', vat: 21, prefix: 'NL', towns: ['Utrecht', 'Haarlem', 'Zwolle', 'Groningen', 'Delft', 'Arnhem'], streets: ['Oudegracht 112', 'Kanaalweg 7', 'Spaarne 31', 'Vismarkt 4'], banks: ['Rabobank', 'ING', 'ABN AMRO', 'Triodos'], lang: 'Dutch', eu: false },
	{ name: 'Germany', cur: 'EUR', vat: 19, prefix: 'DE', towns: ['Leipzig', 'Freiburg', 'Münster', 'Kiel', 'Bremen', 'Mainz'], streets: ['Lindenstraße 18', 'Am Hafen 3', 'Bergstraße 41', 'Marktplatz 9'], banks: ['Sparkasse', 'Commerzbank', 'GLS Bank', 'Volksbank'], lang: 'German', eu: true },
	{ name: 'Belgium', cur: 'EUR', vat: 21, prefix: 'BE', towns: ['Ghent', 'Leuven', 'Antwerp', 'Mechelen'], streets: ['Korenmarkt 12', 'Vaartkom 5', 'Meir 88'], banks: ['KBC', 'Belfius', 'BNP Paribas Fortis'], lang: 'Dutch', eu: true },
	{ name: 'Ireland', cur: 'EUR', vat: 23, prefix: 'IE', towns: ['Cork', 'Galway', 'Limerick', 'Kilkenny'], streets: ['14 South Mall', '3 Quay Street', 'Unit 6, Dock Road'], banks: ['AIB', 'Bank of Ireland', 'PTSB'], eu: true },
	{ name: 'France', cur: 'EUR', vat: 20, prefix: 'FR', towns: ['Lyon', 'Nantes', 'Lille', 'Rennes'], streets: ['12 rue des Tanneurs', '5 quai de la Fosse', '27 rue Nationale'], banks: ['Crédit Agricole', 'Société Générale', 'LCL'], lang: 'French', eu: true },
	{ name: 'Austria', cur: 'EUR', vat: 20, prefix: 'AT', towns: ['Graz', 'Linz', 'Salzburg'], streets: ['Herrengasse 16', 'Hauptplatz 2', 'Getreidegasse 30'], banks: ['Erste Bank', 'Raiffeisen'], lang: 'German', eu: true },
	{ name: 'United Kingdom', cur: 'GBP', vat: 0, prefix: 'GB', towns: ['Leeds', 'Bristol', 'Norwich', 'Edinburgh', 'Cardiff', 'York'], streets: ['14 Mill Lane', '3 Harbour Row', 'Unit 7, Tannery Yard', '22 Station Road'], banks: ['Barclays', 'NatWest', 'Lloyds', 'Starling'], eu: false }
];
const brands = ['Visa', 'Mastercard', 'Visa', 'Mastercard', 'American Express'];
const whens = ['tomorrow', 'this afternoon', 'on Monday', 'after our team meeting', 'later this week', 'first thing tomorrow'];
const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const products = ['timesheets', 'project hours', 'client reports', 'the approvals screen', 'the mobile timer'];

// ---------------------------------------------------------------------------------------------------------
// Pasted output. Slots hold strings; the amounts in minor units are kept as strings too.
type Slots = Record<string, string>;
type Art = (r: Rand, s: Slots) => string;
const table = (head: string[], rows: string[][]) =>
	[`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`, ...rows.map((row) => `| ${row.join(' | ')} |`)].join('\n');
const fence = (lines: string[]) => ['```', ...lines, '```'].join('\n');
const cur = (s: Slots) => s.cur as Cur;
const cents = (s: Slots, key: string) => Number(s[key]);
const daysAgo = (n: number) => (n === 0 ? 'today' : n === 1 ? 'yesterday' : `${n} days ago`);
const ms = (s: Slots, key: string) => Number(s[key]);
const suppliers = ['Office rent', 'Electricity', 'Insurance premium', 'Mobile phones', 'Adobe Creative Cloud', 'Coffee beans and milk', 'Cleaning', 'Accountant, quarterly fee', 'Train tickets', 'Printer lease', 'Broadband', 'Domain and hosting', 'Stationery', 'Payroll'];

const arts: Record<string, Art> = {
	statement: (r, s) => {
		const rows = Array.from({ length: int(r, 3, 5) }, () => [iso(ms(s, 'paidMs') - int(r, 1, 9) * DAY), pick(r, suppliers), `${int(r, 100000, 999999)}`, `-${coded(cur(s), int(r, 1800, 240000))}`]);
		rows.push([iso(ms(s, 'paidMs')), 'PENNYWREN BV UTRECHT', s.ref!, `-${coded(cur(s), cents(s, 'totalCents'))}`]);
		rows.sort((x, y) => (x[0]! < y[0]! ? -1 : 1));
		return [`${s.bank}, business account of ${s.co}, IBAN ending ${s.iban4}`, '', table(['Date', 'Description', 'Reference', 'Amount'], rows), '', `Charges: ${pick(r, ['shared (SHA)', 'shared', 'SHA'])}`].join('\n');
	},
	billingDetails: (r, s) =>
		fence([
			`Billing settings for ${s.co}`,
			``,
			`Company name        ${s.co}`,
			`Address             ${s.address}`,
			`Country             ${s.country}`,
			`VAT number          ${s.vatShown}`,
			`Purchase order      ${pick(r, ['(none)', '(none)', 'none set'])}`,
			`Billing contacts    ${s.email}${chance(r, 0.6) ? `, ${s.apEmail}` : ''}`,
			`Invoice language    English`,
			`Last changed        ${s.changedDate} by ${s.first}`
		]),
	bounce: (r, s) =>
		fence([
			`From: Mail Delivery System <MAILER-DAEMON@mx2.pennywren.example>`,
			`To: billing@pennywren.example`,
			`Date: ${s.invDate}, ${pad(int(r, 6, 9))}:${pad(int(r, 0, 59))}`,
			`Subject: Undelivered Mail Returned to Sender`,
			``,
			`This is the mail system at host mx2.pennywren.example.`,
			`I'm sorry to have to inform you that your message could not be delivered.`,
			``,
			`<${s.apEmail}>: host mx${int(r, 1, 3)}.${s.domain} said:`,
			`    550 5.7.1 ${pick(r, ['Message rejected: attachment type not permitted from unverified sender', 'Policy violation: PDF attachments from external senders are quarantined', 'Rejected by content filter (attachment from unknown sender)'])}`,
			`    (in reply to end of DATA command)`,
			``,
			`Original subject: Your Pennywren invoice ${s.invNo}`
		]),
	declines: (r, s) => {
		const invMs = ms(s, 'invMs');
		const rows = [1, 2].map((back) => [short(addMonths(invMs, -back)) + ` 06:${pad(int(r, 0, 20))}`, `${s.brand} ending ${s.card4}`, coded(cur(s), cents(s, 'totalCents')), 'Paid']).reverse();
		rows.push([`${short(invMs)} 06:${pad(int(r, 0, 20))}`, `${s.brand} ending ${s.card4}`, coded(cur(s), cents(s, 'totalCents')), 'Declined: expired card']);
		rows.push([`${short(invMs + 2 * DAY)} 06:${pad(int(r, 0, 20))}`, `${s.brand} ending ${s.card4}`, coded(cur(s), cents(s, 'totalCents')), 'Declined: expired card']);
		if (chance(r, 0.6)) rows.push([`${short(ms(s, 'openMs'))} ${clock(ms(s, 'openMs') - int(r, 30, 90) * MIN)}`, `${s.brand} ending ${s.card4}, entered in Billing settings`, coded(cur(s), cents(s, 'totalCents')), 'Declined: expired card']);
		return table(['Attempt', 'Card', 'Amount', 'Result from Quillpay'], rows);
	},
	receiptVsInvoice: (r, s) =>
		table(
			['', 'Receipt', `Invoice ${s.invNo}`],
			[
				['Number', `R-${s.invNum}-${int(r, 1, 3)}`, s.invNo!],
				['Date', s.paidDate!, s.invDate!],
				['Amount', s.totalCode!, s.totalCode!],
				['VAT shown', 'no', s.vatShort!],
				['Pennywren VAT number', 'no', 'NL862154927B01'],
				['Your VAT number', 'no', s.vatShown === 'none on file' ? 'none on file' : s.vatShown!],
				['Paid stamp', '-', chance(r, 0.5) ? `yes, if downloaded after ${s.paidDate}` : `added once paid`]
			]
		),
	workspaces: (r, s) =>
		table(
			['Workspace', 'Owner', 'Plan', 'Members', 'Created', 'Last sign-in', 'Invoices go to'],
			[
				[s.ws!, s.ownerName!, `${s.plan}, ${s.cycle}`, s.used!, s.since!, short(ms(s, 'openMs') - int(r, 0, 1) * DAY), s.email!],
				[s.ws2!, s.member!, 'Team, monthly', String(int(r, 1, 2)), short(ms(s, 'trialStartMs')), short(ms(s, 'trialLastMs')), s.memberEmail!]
			]
		),
	dunning: (r, s) => {
		const invMs = ms(s, 'invMs');
		return table(
			['Sent', 'Email', 'To', 'Delivery'],
			[
				[short(invMs), `Payment of ${s.totalCode} failed`, s.ownerEmail!, 'bounced: mailbox unavailable'],
				[short(invMs + 3 * DAY), 'Second attempt failed', s.ownerEmail!, 'bounced: mailbox unavailable'],
				[short(invMs + 7 * DAY), 'Final reminder: account will be limited', s.ownerEmail!, 'bounced: mailbox unavailable'],
				[short(invMs + 10 * DAY), 'Your account has been limited', s.ownerEmail!, `bounced: ${pick(r, ['mailbox unavailable', 'user unknown'])}`]
			]
		);
	},
	authLink: (r, s) =>
		fence([
			`From: Quillpay on behalf of Pennywren <payments@quillpay.example>`,
			`To: ${s.memberEmail}`,
			`Subject: Confirm your payment to Pennywren`,
			``,
			`Your bank needs you to confirm this payment before it can go through.`,
			``,
			`Merchant      Pennywren B.V.`,
			`Amount        ${s.totalCode}`,
			`For           Invoice ${s.invNo}`,
			`Card          ${s.brand} ending ${s.card4}`,
			``,
			`Confirm payment: https://pay.quillpay.example/c/${int(r, 100000, 999999).toString(36)}${int(r, 100000, 999999).toString(36)}`,
			`This link expires on ${dayMonth(ms(s, 'nowMs') + 7 * DAY)}.`
		]),
	statementPending: (r, s) => {
		const day = ms(s, 'openMs');
		const rows = [
			[short(day), 'PENNYWREN BV', coded(cur(s), -cents(s, 'totalCents')), 'Pending'],
			[short(day), `PENNYWREN BV ${s.invNo}`, coded(cur(s), -cents(s, 'totalCents')), 'Booked'],
			[short(day - DAY), pick(r, suppliers), coded(cur(s), -int(r, 900, 18000)), 'Booked'],
			[short(day - int(r, 2, 4) * DAY), pick(r, suppliers), coded(cur(s), -int(r, 900, 18000)), 'Booked']
		];
		return table(['Date', 'Merchant', 'Amount', 'Status'], chance(r, 0.5) ? [rows[1]!, rows[0]!, ...rows.slice(2)] : rows);
	},
	annualQuote: (r, s) =>
		fence([
			`Quote for ${s.co}, prepared ${s.nowDate}`,
			``,
			`Plan                 Team, billed yearly`,
			`Seats                ${s.seats} (${INCLUDED.Team} included, ${s.extra} extra)`,
			`Plan price           ${s.annualBase}`,
			`Extra seats          ${s.annualExtra}`,
			`Subtotal             ${s.annualNet}`,
			`VAT                  ${s.vatShort}`,
			`Starts               ${s.renewDate}, at the next renewal`,
			`Payment              ${pick(r, ['direct debit, collected 3 working days after the invoice', 'direct debit (SEPA), 3 working days after the invoice'])}`,
			`Offer ends           ${dayMonth(ms(s, 'nowMs') + 30 * DAY)}`
		]),
	seatList: (r, s) => {
		const people = [[s.ownerName!, 'Owner', 'Active', 'today'], [s.member!, 'Admin', 'Active', daysAgo(int(r, 1, 3))]];
		const idle = Number(s.idle);
		const used = Number(s.used);
		for (let i = 2; i < Math.min(used, 9); i++) people.push([`${pick(r, [...firstF, ...firstM])} ${pick(r, surnames)}`, 'Member', 'Active', daysAgo(int(r, 0, 9))]);
		if (used > 9) people.push([`… ${used - 9} more active members`, '', '', '']);
		for (let i = 0; i < idle; i++)
			people.push(
				chance(r, 0.5)
					? [`${pick(r, [...firstF, ...firstM])} ${pick(r, surnames)}`, 'Member', 'Deactivated', `${int(r, 40, 160)} days ago`]
					: [`${pick(r, ['j.', 'info@', 'm.', 'freelance.'])}${pick(r, ['clientside', 'studiohelp', 'freelancer', 'temp'])}.example`, 'Member', `Invited ${short(ms(s, 'openMs') - int(r, 15, 90) * DAY)}`, 'never']
			);
		return table(['Name', 'Role', 'Status', 'Last active'], people);
	},
	proration: (r, s) =>
		fence([
			`Invoice ${s.upNo}                                   ${s.upDate}`,
			``,
			`Business plan, ${s.upDate} to ${s.upEnd}                  ${s.upNew}`,
			`Unused time on Team plan, ${s.upDate} to ${s.upEnd}       ${s.upCredit}`,
			`Extra seats above ${INCLUDED.Business}                                    ${money(cur(s), 0)}`,
			`                                                     ----------`,
			`Subtotal                                              ${s.upNet}`,
			`VAT                                                   ${s.vatShort}`,
			`Charged to ${s.brand} ending ${s.card4}                    ${s.upNet}${s.vatRate === '0' ? '' : ' + VAT'}`
		]),
	invoiceText: (r, s) =>
		fence([
			`Pennywren B.V. · Catharijnesingel 48 · 3511 GC Utrecht · VAT NL862154927B01`,
			``,
			`INVOICE ${s.invNo}                          Date ${s.invDate}`,
			`To: ${s.co}, ${s.address}, ${s.country}`,
			`VAT number: ${s.vatShown}`,
			``,
			`${s.plan} plan, ${s.cycle}, ${s.periodLabel}           ${s.baseCode}`,
			...(s.extra === '0' ? [] : [`Extra seats: ${s.extra} x ${s.seatPrice}                         ${s.extraCode}`]),
			`Net                                          ${s.netCode}`,
			`${s.vatInvoiceLine}`,
			`Total                                        ${s.totalCode}`,
			``,
			`${s.method === 'transfer' ? `Please pay within 14 days to IBAN NL27 QPAY 0318 4470 52, reference ${s.invNo}.` : s.method === 'dd' ? 'Collected by direct debit.' : s.state === 'paid' ? `Paid by ${s.brand} ending ${s.card4}.` : `To be charged to ${s.brand} ending ${s.card4}.`}`
		]),
	vies: (r, s) =>
		fence([
			`VAT number check, ${s.nowDate} ${s.nowClock}`,
			``,
			`Entered:      ${s.taxBad}`,
			`Sent as:      ${s.taxBad!.replace(/\s/g, '')}`,
			`Result:       no such number (${pick(r, ['country code not recognised', 'format not recognised for this country'])})`,
			``,
			`Entered:      ${s.taxId}`,
			`Result:       active · ${s.co!.toUpperCase()} · ${s.town!.toUpperCase()}`
		]),
	refundStatus: (r, s) =>
		table(
			['Refund', 'Issued', 'Amount', 'To', 'Status at Quillpay', 'Bank reference'],
			[[`re_${int(r, 100, 999)}`, s.refundDate!, s.refundAmt!, `${s.brand} ending ${s.card4}`, 'Sent to card network', s.arn!]]
		),
	creditNote: (r, s) =>
		fence([
			`Pennywren B.V. · Utrecht · VAT NL862154927B01`,
			``,
			`CREDIT NOTE CN-2026-${pad(int(r, 1, 99))}${int(r, 100, 999)}                 Date ${s.nowDate}`,
			`Relates to invoice ${s.invNo} of ${s.invDate}`,
			`To: ${s.co}, ${s.country}`,
			``,
			`${s.creditReason}                ${s.refundAmt}`,
			`${s.vatShort === 'none' ? 'No VAT' : `VAT as on the original invoice`}`,
			``,
			`Refunded to ${s.brand} ending ${s.card4} on ${s.refundDate}.`
		]),
	cancelSummary: (r, s) =>
		fence([
			`Subscription ${s.sub} · ${s.co}`,
			``,
			`Plan               ${s.plan}, ${s.cycle}`,
			`Cancelled on       ${s.cancelDate} by ${s.ownerName}`,
			`Takes effect       ${s.effective}`,
			`Reason given       ${pick(r, ['Moving to another tool', 'Cost', 'Project finished', 'Team too small now', 'Other'])}`,
			`Last invoice       ${s.invNo}, ${s.totalCode}`,
			`Data kept until    ${s.dataUntil}`
		]),
	exportLog: (r, s) =>
		table(
			['Export', 'Started by', 'Started', 'Status', 'Size'],
			[
				[pick(r, ['Everything (CSV + attachments)', 'Full export']), s.ownerName!, `${s.recentDate} ${pad(int(r, 9, 16))}:${pad(int(r, 0, 59))}`, pick(r, ['Ready, link sent', 'Ready']), `${int(r, 40, 900)} MB`],
				['Time entries (CSV)', s.member!, short(ms(s, 'openMs') - int(r, 8, 30) * DAY), 'Ready, link expired', `${int(r, 1, 30)} MB`],
				['Client reports (PDF)', s.member!, short(ms(s, 'openMs') - int(r, 31, 80) * DAY), 'Ready, link expired', `${int(r, 5, 60)} MB`]
			]
		),
	phishHeaders: (r, s) =>
		fence([
			`From: "Pennywren Billing" <billing@${pick(r, ['pennywren-billing.example', 'pennywren-support.example', 'penny-wren.example'])}>`,
			`Reply-To: ${pick(r, ['accounts', 'payments', 'billingteam'])}@${pick(r, ['mailbox-secure.example', 'fastinbox.example'])}`,
			`To: ${s.email}`,
			`Date: ${s.recentDate}`,
			`Subject: ${pick(r, ['Action needed: your Pennywren payment failed', 'Final notice: update your card to keep your workspace', 'Your Pennywren account will be closed in 24 hours'])}`,
			``,
			`Dear customer, we were unable to charge your card for invoice PW-${int(r, 100000, 999999)}.`,
			`Update your payment details within 24 hours: https://${pick(r, ['pennywren-account', 'pw-billing-portal'])}.example/update`
		]),
	ownerAudit: (r, s) =>
		table(
			['When', 'Who', 'What'],
			[
				[short(ms(s, 'ownerLeftMs') - int(r, 30, 200) * DAY), s.ownerName!, 'Card changed'],
				[short(ms(s, 'ownerLeftMs') - int(r, 5, 25) * DAY), s.ownerName!, `${s.full} made admin`],
				[short(ms(s, 'ownerLeftMs')), s.ownerName!, 'Last sign-in'],
				[short(ms(s, 'openMs') - int(r, 1, 6) * DAY), s.full!, 'Tried to open Billing settings: owner only']
			]
		),
	supplierForm: (r, s) =>
		table(
			['Question on the form', 'Answer'],
			[
				['Legal name', 'Pennywren B.V.'],
				['Registered address', 'Catharijnesingel 48, 3511 GC Utrecht, Netherlands'],
				['Chamber of Commerce (KvK)', '71283946'],
				['VAT number', 'NL862154927B01'],
				['Bank account in our name', '?'],
				['Signed bank letter', '?'],
				['Contact for remittances', '?'],
				[pick(r, ['Data processing agreement', 'Insurance certificate', 'ISO 27001 or equivalent']), '?']
			]
		),
	payrollCsv: (r, s) =>
		fence([
			`employee,week,project,client,hours,approved_by`,
			...Array.from({ length: int(r, 4, 6) }, () => `${pick(r, [...firstF, ...firstM]).toLowerCase()}.${pick(r, ['k', 'm', 'v', 'b', 'o'])},2026-W${Math.ceil((ms(s, 'openMs') - Date.UTC(2026, 0, 1)) / DAY / 7) - int(r, 1, 6)},${pick(r, ['Website refresh', 'Annual report', 'Site survey', 'Retainer', 'Internal'])},${pick(r, ['Harlow Group', 'City of ' + s.town, 'Internal', 'Brinkley Foods'])},${int(r, 4, 40)}.${pick(r, ['0', '5', '25', '75'])},${s.first!.toLowerCase()}`)
		]),
	renewalNotice: (r, s) =>
		fence([
			`From: Pennywren Billing <billing@pennywren.example>`,
			`Subject: Your Pennywren plan renews on ${s.renewDate}`,
			``,
			`Plan            ${s.plan}, yearly`,
			`Seats           ${s.seats}`,
			`Renewal amount  ${s.annualTotal}`,
			`Payment         ${s.methodLabel}`,
			``,
			`To change seats or plan before the renewal, go to Billing settings.`
		]),
	trialTimeline: (r, s) =>
		table(
			['Date', 'What happened'],
			[
				[s.trialStart!, `Trial started by ${s.first}`],
				[short(ms(s, 'trialStartMs') + int(r, 1, 6) * DAY), `${s.brand} ending ${s.card4} added in Billing settings`],
				[short(ms(s, 'trialStartMs') + 12 * DAY), `Email: "Your trial ends in 2 days"`],
				[short(ms(s, 'trialStartMs') + 14 * DAY), `Trial ended; Team plan started, ${s.used} seats`],
				[short(ms(s, 'trialStartMs') + 14 * DAY), `Invoice ${s.invNo} paid, ${s.totalCode}`]
			]
		),
	langSettings: (r, s) =>
		fence([
			`Your profile: language English, date format ${pick(r, ['DD-MM-YYYY', 'DD/MM/YYYY'])}`,
			`Workspace: language English`,
			`Billing settings: invoice language English`,
			`Billing contacts: ${s.email}, ${s.apEmail}`
		])
};

// ---------------------------------------------------------------------------------------------------------
// Topics. Slots in braces are filled per ticket. Nothing about a topic's area or how the ticket ends is written
// into the file except through the messages themselves.
type Area = 'invoices and receipts' | 'payments and cards' | 'plans and seats' | 'refunds and credits' | 'cancellations' | 'company and VAT details' | 'other';
type Outcome = 'resolved' | 'owe' | 'act' | 'team' | 'quiet';
/** Facts about the account that a topic's text takes for granted. Two topics whose facts clash never meet in one ticket. */
type Facet = 'card' | 'transfer' | 'dd' | 'open' | 'paid' | 'monthly' | 'annual' | 'team' | 'business' | 'eu' | 'taxid' | 'notaxid' | 'badtaxid' | 'ownergone' | 'notowner' | 'cancel' | 'stay' | 'grew' | 'shrank' | 'nonen' | 'euro' | 'idle' | 'sent' | 'held' | 'recent' | 'renewing';
const CLASHES: [Facet, Facet][] = [
	['card', 'transfer'], ['card', 'dd'], ['transfer', 'dd'], ['open', 'paid'], ['monthly', 'annual'], ['team', 'business'], ['taxid', 'notaxid'], ['taxid', 'badtaxid'],
	['cancel', 'stay'], ['cancel', 'grew'], ['cancel', 'open'], ['dd', 'monthly'], ['recent', 'renewing'], ['recent', 'grew'], ['grew', 'shrank'], ['sent', 'held']
];
/** One exchange: the customer's message, the answer, and pasted output in the customer's message or, with 'a', the answer. */
type Turn = [string, string, Art?, 'a'?];

interface Topic {
	area: Area;
	facets: Facet[];
	weight?: number;
	subjects: string[];
	/** The customer's first message, two ways, and the topic as a quick side question with its answer. */
	open: [string, string];
	quick: [string, string];
	/** The first answer, which asks for something. */
	reply: string;
	/** The first exchange answers the reply and asks for `need`; the second finds the cause; the rest settle nothing. */
	turns: Turn[];
	need: string;
	cause: string;
	/** What the customer has to do, after "you'll need to"; what a team did when it answers; the customer's "it works". */
	act: string;
	mateFix?: string;
	fixed: [string, string];
	/** A last question, and what we then owe, after "I'll". */
	follow: string;
	owe: string;
	team: string;
	handover: string;
	/** Days between the latest invoice and the ticket, for monthly billing. */
	age?: [number, number];
	seats?: [number, number];
	/** The plan has already ended. */
	ended?: boolean;
}

const topics: Topic[] = [
	{
		area: 'payments and cards',
		facets: ['transfer', 'open', 'monthly', 'sent'],
		weight: 2,
		subjects: ['Paid invoice still showing as open', 'Reminder for an invoice we already paid', 'Payment reminder sent in error?'],
		age: [16, 27],
		open: [
			`We paid invoice {invNo} by bank transfer on {paidDate}, and today we got a second reminder saying it's overdue. The money has left our account; I can see it on our statement. Could you please check, and stop the reminders?`,
			`Our accounts team keeps getting "payment overdue" emails for {invNo} ({total}). As far as we're concerned it was paid weeks ago by transfer, and the Billing page in Pennywren still says Open. What's going on?`
		],
		quick: [`Can the reminders go to our accounts address instead of to me?`, `Yes. In Billing settings, add the accounts address under "Billing contacts" and tick "Reminders" next to it. You can untick yourself at the same time.`],
		reply: `Sorry about the reminders; that's not a nice email to get for something you've paid. Transfers sometimes reach us without anything that ties them to an invoice. Could you send me the payment line from your bank statement, with the date, the amount and the reference you used? A copy of the text is fine.`,
		turns: [
			[`Here is the line from our statement.`, `Thanks. The date and amount match a transfer that reached our account on {paidDate2}, but the reference reads "{ref}" rather than the invoice number, so it was set aside instead of being put against {invNo}. Before I ask finance to match it: was that transfer for {invNo} alone, or did it cover another invoice too? The amount that arrived is a little under the invoice.`, arts.statement],
			[`It was just that one invoice. The difference will be our bank's charges, I'm afraid.`, `That makes sense. A bank along the way took its fee before the money reached us, so {fee} less than the invoice arrived. I've asked finance to put the transfer against {invNo} and write off the difference this once, so the invoice will show as Paid and the reminders stop.`],
			[`Will this happen every month? We always pay by transfer.`, `It shouldn't, as long as the reference is the invoice number, {invNo} for example, and the transfer is sent with the charges paid on your side ("OUR" in most banking apps). If that's awkward, paying by card avoids it altogether.`],
			[`Do I need to do anything about the reminder that has already gone to our accounts team?`, `No, they can ignore it. Reminders only go out for invoices that are still open, and once finance has matched the payment there won't be another one.`]
		],
		need: 'whether the transfer was for {invNo} alone',
		cause: `the transfer came in with the reference "{ref}" instead of the invoice number, and {fee} short because of a bank's fee, so it was set aside instead of being matched`,
		act: `send future transfers with the invoice number as the reference and the bank charges paid on your side`,
		mateFix: `I've put the transfer against {invNo} and written off the {fee} difference, so it shows as Paid.`,
		fixed: [`The Billing page shows {invNo} as Paid now, and no more reminders. Thanks for sorting it so quickly.`, `Our accounts team confirm the reminders have stopped and the invoice is marked paid. Much appreciated.`],
		follow: `Could you send me a receipt for {invNo} now that it's matched? Our auditor wants one for every payment.`,
		owe: `ask finance for a receipt for {invNo} once the match has gone through and send it to you by {day}`,
		team: 'the finance team',
		handover: `{invNo} ({total}) paid by transfer on {paidDate}, probably with reference "{ref}"; still Open. Can you match it?`
	},
	{
		area: 'invoices and receipts',
		facets: ['stay'],
		subjects: ['Invoices in the wrong company name', 'Change the details on our invoices', 'Please reissue two invoices'],
		open: [
			`Our invoices from Pennywren are made out to {oldName}, the name we traded under before we became a company. Our accountant can't book them like that. Could the last few be reissued to {co}, {address}?`,
			`We moved office over the summer and our invoices still show the old address. Our finance system rejects any supplier invoice whose address doesn't match the one it holds, so the last two are stuck in approval.`
		],
		quick: [`Is there a way to download all of this year's invoices at once?`, `Yes. On the Billing page, under Invoices, choose "Download" and pick a date range. You get one zip file with a PDF for each invoice.`],
		reply: `Happy to help get these booked. The name and address on an invoice are copied from Billing settings at the moment it's issued, so changing them later only affects new invoices. Could you tell me which invoices you need reissued? The number is at the top right of each PDF.`,
		turns: [
			[`It's {prevInvNo} and {invNo}. This is what Billing settings shows now; I changed it last week.`, `Thanks, that's what the reissued invoices would copy. Before I pass them on, could you check one thing on it for me: is the VAT number shown the one your accountant expects? It prints on the invoice exactly as it appears there.`, arts.billingDetails],
			[`Yes, that's right.`, `Perfect. Finance can reissue invoices from the last twelve months with the details as they are now. The new PDFs keep the same numbers and amounts, with "Reissued" and the date at the top, so nothing counts twice in your books. I've asked them to do {prevInvNo} and {invNo}.`],
			[`Will the reissued ones come by email?`, `They go to the billing contacts on the account, like a normal invoice, and they replace the old PDFs on the Billing page.`],
			[`And the next invoice will be right without anyone doing anything?`, `Yes. Your next invoice, on {nextInv}, uses whatever is saved in Billing settings that day.`]
		],
		need: 'whether the VAT number in Billing settings is the one your accountant expects',
		cause: `the invoices were issued before Billing settings was updated, and an invoice keeps the name and address it was issued with`,
		act: `check the details in Billing settings once more before the next invoice on {nextInv}`,
		mateFix: `I've reissued {prevInvNo} and {invNo} with the details now in Billing settings.`,
		fixed: [`Got the reissued PDFs this morning and our accountant has booked them. Thanks!`, `Both invoices came through with the new details and have gone through approval. Thank you.`],
		follow: `Could you reissue the ones from earlier in the year too? Our auditor would like the whole year to match.`,
		owe: `ask finance whether they can reissue the earlier invoices as well and let you know by {day}`,
		team: 'the finance team',
		handover: `Please reissue {prevInvNo} and {invNo} with the details now in Billing settings.`
	},
	{
		area: 'invoices and receipts',
		facets: ['transfer', 'monthly', 'held'],
		subjects: ['PO number on invoices', 'Purchase order reference', 'Invoice rejected by our accounts payable'],
		age: [2, 12],
		open: [
			`Our accounts payable team has started rejecting any invoice without a purchase order number, and the Pennywren invoice for this month came back to me. Our PO for this year is {po}. Can that go on the invoices?`,
			`I've been told our new procurement rules mean every supplier invoice has to quote a PO or it isn't paid. How do I get {po} onto our Pennywren invoices, including {invNo}, which is already sitting in their queue?`
		],
		quick: [`Can we have the invoice and the receipt as separate emails?`, `They already are: the invoice is emailed when it's issued, and a receipt follows once it's paid. If you only ever see one, the other may be filtered; both come from billing@pennywren.example.`],
		reply: `Thanks for flagging it before the invoice goes overdue. There's a place for this in Billing settings. Could you tell me whether the PO covers a period or a fixed amount? Some teams ask us to stop invoicing against a PO once it's used up, and that changes how I'd set it up.`,
		turns: [
			[`It's for the calendar year, up to {poCap}.`, `Thanks. A year of your current plan comes to well under that, so one PO is enough. You can add it under Billing settings, "Purchase order number", and it prints on every invoice from the next one. For {invNo}, which is already issued: do your team need the PO on the same invoice number, or would a new invoice do?`],
			[`They say it has to be the same number, otherwise their system thinks it's a second bill.`, `Understood. Finance can reissue {invNo} with the PO added under the same number, marked "Reissued". The amount and the due date stay the same, so it won't look like a new bill to anyone.`],
			[`Can I make sure nobody forgets to change it next year?`, `Not with a reminder, but the PO stays on the account until someone changes it, so it won't disappear by itself.`],
			[`Our new PO in January will have a different number. Do I just edit it?`, `Yes. Edit it before your first invoice in January and every invoice after that uses the new number.`]
		],
		need: 'whether your accounts payable team need the PO on the same invoice number',
		cause: `there was no PO number in Billing settings when {invNo} was issued, so it printed without one`,
		act: `add {po} under "Purchase order number" in Billing settings, and change it when the new PO arrives`,
		mateFix: `I've reissued {invNo} with {po} on it, under the same number.`,
		fixed: [`Reissued invoice received with the PO on it, and accounts payable have accepted it. Thank you.`, `The PO is on the invoice and it's been approved for payment. Great, thanks.`],
		follow: `Could the reissued invoice go straight to our accounts payable address as well? They don't accept anything forwarded.`,
		owe: `ask finance to send the reissued {invNo} straight to your accounts payable address and confirm to you by {day} that it's gone`,
		team: 'the finance team',
		handover: `AP needs PO {po} on {invNo}, same number. Can you reissue it?`
	},
	{
		area: 'invoices and receipts',
		facets: ['monthly'],
		subjects: ['Not receiving invoices', 'Invoice emails not arriving', 'Where are our invoices?'],
		open: [
			`Our accounts address, {apEmail}, hasn't had a Pennywren invoice since {lastSeen}. I can download them from the Billing page, but our finance team works from that inbox and they've started asking me why we stopped paying.`,
			`We set up {apEmail} as the address our invoices should go to, and as far as I can tell nothing ever arrives there. I get mine fine.`
		],
		quick: [`Do your invoice emails come from a fixed address? Our IT want to allow it.`, `They do: billing@pennywren.example. Receipts and reminders come from the same address.`],
		reply: `Sorry about that; invoices that don't reach the people who pay them cause trouble on both sides. Our mail log should tell us whether we sent them and what happened next. Could you confirm the exact address they should go to, and the date of the last invoice that arrived there?`,
		turns: [
			[`It's {apEmail}. The last one they can find is from {lastSeen}.`, `Thanks. Our side shows every invoice since then going out to {apEmail} and each one being turned away by your mail server. I've copied the latest rejection below. Could you send it to whoever looks after your email and tell me what they say? The line starting with 550 is the one they'll need.`, arts.bounce, 'a'],
			[`IT say their new filter blocks emails with PDF attachments from senders it doesn't know.`, `That explains it. The filter turned the invoices away before they reached the inbox, which is why nothing showed up there. Once billing@pennywren.example is on its list of known senders, the next invoice will go through, and I can resend the {count} that bounced.`],
			[`Will resending them create new invoices?`, `No, they're the same invoices with the same numbers. There's nothing new to pay apart from anything that's already open.`],
			[`Can we see somewhere whether an invoice was delivered?`, `Not on the Billing page, I'm afraid, but we can always check the mail log for you, as I did here.`]
		],
		need: 'what your IT team say about the rejection',
		cause: `your mail server's new filter rejected every email with a PDF from billing@pennywren.example, so the invoices bounced before reaching {apEmail}`,
		act: `ask your IT team to allow billing@pennywren.example through the new filter, then let me know so I can resend the invoices`,
		fixed: [`Our accounts team have all of them now, and this month's came through on its own. Thanks.`, `Finance confirm they're receiving the invoices again. Sorted.`],
		follow: `Could you resend everything from this year in one go, so our finance team can check nothing else went astray?`,
		owe: `resend this year's invoices to {apEmail} and let you know by {day} when they've gone`,
		team: 'the payments team',
		handover: `Invoices to {apEmail} bounce with a 550 since {lastSeen}. Anything changed on our side?`
	},
	{
		area: 'invoices and receipts',
		facets: ['card', 'paid'],
		subjects: ['Receipt not accepted by our expense system', 'Need a receipt with VAT', 'Receipt format'],
		open: [
			`I pay our Pennywren subscription on my company card, and our expense tool keeps rejecting the receipt because it "doesn't show VAT". I've been reimbursed late twice now. Is there a better document I should be sending?`,
			`Our finance team says the receipt you email after each card payment isn't a proper tax document. They need your VAT number and the VAT amount on it. Can you help?`
		],
		quick: [`Can I change which card is charged without losing our invoice history?`, `Yes. Changing the card in Billing settings only affects future payments; every past invoice and receipt stays on the Billing page.`],
		reply: `Thanks for explaining. The receipt only confirms that a card payment went through; the invoice is the document with the VAT details. Could you tell me which month's receipt was rejected, so I can check what the invoice for that month shows?`,
		turns: [
			[`The one from {invDate}.`, `Thanks. Here's how the receipt and the invoice for that payment compare. The invoice, {invNo}, has everything your expense tool is asking for. Could you try attaching the invoice PDF instead, from the Billing page, and tell me whether the tool takes it?`, arts.receiptVsInvoice, 'a'],
			[`The tool accepted the invoice but wants proof that it was paid as well.`, `Got it. The invoice PDF carries a "Paid" stamp with the date once the payment has gone through. If the copy you attached was downloaded before then, it won't have one; downloaded now, it shows "Paid on {paidDate}". That single document covers both.`],
			[`Can I get these automatically instead of downloading them?`, `Yes: in Billing settings, under "Emails", switch on "Send the paid invoice instead of a receipt". From then on the stamped invoice arrives after each payment.`],
			[`Does that change anything for the rest of the team?`, `No, it only changes what the billing contacts receive. Nobody else gets billing emails.`]
		],
		need: 'whether your expense tool accepts the invoice PDF',
		cause: `the expense tool needs the invoice with its VAT details and paid stamp, and the receipt only confirms the card payment`,
		act: `switch on "Send the paid invoice instead of a receipt" in Billing settings and attach the stamped invoice to your expense claims`,
		fixed: [`Expense claim approved with the stamped invoice. Finally! Thanks.`, `Switched the setting on, and finance are happy with the stamped invoice. Thank you.`],
		follow: `Could you send me the paid invoices for the last six months in one file? I want to resubmit the claims that were turned down.`,
		owe: `put together the paid invoices for the last six months in one file and email it to you by {day}`,
		team: 'the finance team',
		handover: `Expense tool rejects our receipts. Can you send stamped invoices for the last six months?`
	},
	{
		area: 'plans and seats',
		facets: ['card', 'monthly'],
		subjects: ['Two invoices this month', 'Billed twice?', 'Second invoice we do not recognise'],
		open: [
			`This month we've had two invoices from Pennywren, {invNo} and {dupNo}, for different amounts. We only have one account as far as I know. Which one should we pay?`,
			`We've been charged twice in {month}: once for {total} and again for {dupTotal}. Please refund the second one.`
		],
		quick: [`Can one person be in two workspaces with the same login?`, `Yes. They switch between workspaces from the menu at the top left. Each workspace is billed separately, so they hold a seat in each.`],
		reply: `Sorry for the confusion. Before anything is refunded I'd like to see where the second invoice comes from. Could you forward me the email for {dupNo}, or tell me which address it was sent to?`,
		turns: [
			[`It went to {memberEmail}, which is {memberFirst}'s address.`, `Thanks. That invoice isn't for your workspace. It's for a second one, "{ws2}", which {memberFirst} started on a trial on {trialStart}; a card was added before the trial ended, so it turned into a Team plan of its own. I've copied both workspaces as I see them. Could you check with {memberFirst} whether anyone still uses "{ws2}"?`, arts.workspaces, 'a'],
			[`{memberFirst} says it was a test for a client project and nobody has touched it since.`, `That matches what I see: the last sign-in was on {trialLast}. In that case "{ws2}" can be cancelled from its own Billing settings, with effect today, and finance will refund its invoices back to the last month anyone signed in.`],
			[`How do we stop this happening again?`, `In Billing settings for your main workspace, turn on "Only owners can start workspaces". Anyone else at {co} then has to ask you first.`],
			[`Will cancelling it touch anything in our main workspace?`, `No. The two are entirely separate; cancelling "{ws2}" leaves your main workspace, its people and its invoices as they are.`]
		],
		need: `whether anyone still uses "{ws2}"`,
		cause: `the second invoice was for a separate workspace, "{ws2}", that {memberFirst} started on a trial and that became a paid Team plan when a card was added`,
		act: `have {memberFirst} cancel "{ws2}" from its Billing settings and turn on "Only owners can start workspaces" for your main one`,
		fixed: [`{memberFirst} cancelled it and the refund is on the statement today. All good, thanks.`, `The extra workspace is gone and {memberFirst} confirms the refund has arrived. Thank you!`],
		follow: `Can you check whether anyone else at {co} has started a workspace on their own? I'd rather know now.`,
		owe: `look for any other workspaces paid for from an address at {domain} and send you a list by {day}`,
		team: 'the finance team',
		handover: `Unused second workspace "{ws2}" (trial from {trialStart}). Once cancelled, refund {dupNo} and back to {trialLast}.`
	},
	{
		area: 'payments and cards',
		facets: ['card', 'open', 'monthly'],
		weight: 2,
		subjects: ['Payment failed', 'Your payment was declined', 'Card update not working'],
		age: [2, 6],
		open: [
			`We've had an email saying our payment of {total} failed and that the account will be limited if it isn't paid. I'm sure the card is fine; we use it for everything.`,
			`I tried to update our card in Billing settings after a "payment failed" email and got "Your card was declined" three times. Now I'm worried about the team losing access in the middle of the month.`
		],
		quick: [`If the account is limited, can people still see their timesheets?`, `Yes. A limited account can still be signed in to and read, and nothing is deleted; people just can't add new entries until the invoice is paid.`],
		reply: `Sorry for the worry. Nothing is limited yet, and there's time to sort it. Quillpay, who handle our card payments, give a reason for each decline. Could you tell me the last four digits of the card you tried, so I can find the right attempts?`,
		turns: [
			[`It ends {card4}.`, `Thanks. I've copied the attempts on that card below; they all came back as "expired card". The card on the account has an expiry date of {exp}. Could you check whether your bank has sent a new card with the same number and a later expiry date? That often happens without anyone noticing.`, arts.declines, 'a'],
			[`You're right, there's a new card in the drawer with a later date. Same number.`, `That's the one. If you enter the card again in Billing settings with the new expiry date and security code, the open invoice is retried straight away. The declines you got while updating came from the old expiry date still being in the form.`],
			[`Will the team lose access if I can't get to it until the end of the week?`, `No. The account is only limited after the last retry, which for {invNo} is on {retryDate}. Until then everyone carries on as normal.`],
			[`Will you tell us next time before a card expires?`, `Yes, the owner gets an email a month before the card on file expires. It goes to {ownerFirst} as the owner, so it may have been missed there.`]
		],
		need: 'whether your bank has sent a new card with a later expiry date',
		cause: `the card on file expired in {exp} and the bank had issued a new card with the same number and a later expiry date`,
		act: `enter the card again in Billing settings with the new expiry date and security code before {retryDate}`,
		fixed: [`Updated the card and the invoice is paid. Panic over, thanks.`, `All sorted: new expiry date in, and the payment went through straight away.`],
		follow: `Could the reminders wait a few days after a failed payment next time? Our office manager panicked.`,
		owe: `ask the payments team whether reminders can wait a few days after a first failed attempt, and let you know by {day}`,
		team: 'the payments team',
		handover: `Card ending {card4} declined on {invNo} as "expired card". Can you check what's stored?`
	},
	{
		area: 'payments and cards',
		facets: ['card', 'open', 'monthly'],
		subjects: ['Payment needs confirming every month', 'Confirm your payment link expired', 'Bank asking to approve every payment'],
		age: [3, 9],
		open: [
			`Every month we get an email saying our payment "needs your confirmation", and by the time I see it the link has expired. This month the invoice, {invNo}, is now overdue.`,
			`Our company card makes the cardholder approve each online payment in the bank's app. The Pennywren payment seems to need that every single month, and when she's away it just fails.`
		],
		quick: [`Can I pay an open invoice by bank transfer instead?`, `Yes. The invoice PDF has our bank details; use the invoice number as the reference and it will be matched to the invoice.`],
		reply: `Thanks for explaining. Some banks ask the cardholder to approve each payment, and when that happens Quillpay emails a confirmation link. Could you tell me who receives that email at your end? It may not be reaching the person who holds the card.`,
		turns: [
			[`It comes to me. The card is in the name of {memberFirst}, our finance lead, and she has the bank app.`, `That's the snag. The confirmation goes to the billing contact, but only the cardholder can approve it in the bank app, so the link expires while it's being forwarded. Could you ask {memberFirst} whether her bank lets her mark Pennywren as a trusted merchant? Many banks call it "trusted merchants" or "allow recurring payments".`],
			[`She's found something called trusted payees, but isn't sure it covers cards.`, `It usually does, as long as it lists card merchants as well as bank transfers. Once Pennywren is on it, the bank stops asking for each payment. For {invNo}, which is open now, I've sent a fresh payment link to {memberFirst} directly; it works for seven days.`, arts.authLink, 'a'],
			[`Can the link last longer than seven days?`, `Seven days is Quillpay's limit, I'm afraid. But a new link can be sent at any time from the Billing page, with "Send payment link".`],
			[`Is direct debit an option, so this goes away?`, `On yearly plans, yes. On monthly billing it's card or transfer for now.`]
		],
		need: `whether {memberFirst}'s bank lets her mark Pennywren as a trusted merchant`,
		cause: `the confirmation email goes to the billing contact, but only {memberFirst}, who holds the card, can approve the payment in her bank app, so the link expires on the way`,
		act: `have {memberFirst} mark Pennywren as trusted in her bank app and pay {invNo} with the new link before it expires`,
		fixed: [`{invNo} is paid, and {memberFirst} says the bank didn't ask for anything this time. Thanks!`, `Paid with the new link, and Pennywren is on her trusted list now. Sorted.`],
		follow: `Can the confirmation emails go to {memberFirst} as well as me? Then whoever is in the office can deal with it.`,
		owe: `check with the payments team whether payment confirmations can go to more than one billing contact and write back by {day}`,
		team: 'the payments team',
		handover: `Card needs bank approval each time and links expire; {invNo} overdue. What does Quillpay send, and to whom?`
	},
	{
		area: 'payments and cards',
		facets: ['card', 'paid', 'monthly'],
		subjects: ['Charged twice', 'Double payment on our card', 'Two charges for one invoice'],
		age: [0, 0],
		open: [
			`Our card statement shows two payments to Pennywren today for {total} each. We only have one subscription. Please refund one of them.`,
			`I updated the card on our account this morning and now I see two charges for the same amount. Did we pay twice?`
		],
		quick: [`Is it possible to change the day of the month we're billed?`, `Yes, once a year. Finance can move your billing day; the first invoice after the change covers the days in between.`],
		reply: `Sorry for the alarm. Let me check what Quillpay shows for your card today. Could you send me the two lines from your statement as they appear, with any status or reference next to them?`,
		turns: [
			[`Here they are. One of them says "pending".`, `Thanks, that helps. Only one payment was taken: {invNo}, on {invDate}. The pending line looks like an earlier attempt that your bank held while it checked the card. Did someone change the card on the account that morning, and if so, roughly when?`, arts.statementPending],
			[`{memberFirst} changed it at about {time}.`, `That fits. The first attempt ran a few minutes before that, on the old card, which your bank had already blocked. It declined the payment but still put a temporary hold on the amount. The second attempt, on the new card, is the real payment. The hold drops off by itself.`],
			[`How long until it disappears? It's a fair amount for us.`, `Most banks release a hold within three to five working days, some take up to seven. It's your bank releasing it rather than us refunding it, so it won't appear as a refund.`],
			[`If it's still there next week, what then?`, `Reply here and I'll get you a letter from finance confirming that only one payment was taken, which your bank can use to chase it.`]
		],
		need: 'whether someone changed the card that morning, and when',
		cause: `one line is the real payment for {invNo} and the other is a declined attempt on the old card that the bank is holding as pending`,
		act: `wait for your bank to release the pending amount, and call them if it's still there after seven working days`,
		fixed: [`The pending one has gone from the statement. Thanks for explaining.`, `The second charge dropped off today, as you said. All fine.`],
		follow: `Could you send that letter anyway? Our bookkeeper wants it on file.`,
		owe: `ask finance for a letter confirming one payment for {invNo} and send it to you by {day}`,
		team: 'the finance team',
		handover: `Two charges for {invNo}: one payment, one declined attempt on the old card. Letter if the hold stays?`
	},
	{
		area: 'payments and cards',
		facets: ['card', 'monthly', 'team', 'stay', 'euro'],
		subjects: ['Pay by direct debit?', 'SEPA mandate', 'Change of payment method'],
		open: [
			`Our finance team would like to stop paying Pennywren by card and move to SEPA direct debit, as we do with all our other suppliers. How do we set that up?`,
			`We're closing the company card we use for software at the end of the month. Can we pay by direct debit from our business account instead?`
		],
		quick: [`What name appears on our bank statement when you take a payment?`, `It shows as "PENNYWREN BV" followed by the invoice number.`],
		reply: `Good timing to ask before the card closes. Direct debit is offered on yearly billing, and your account is on {plan}, {cycle}. Could you tell me whether yearly billing would suit you, or whether paying monthly matters?`,
		turns: [
			[`Yearly would be fine if it's cheaper. What would it come to?`, `Yearly is ten months' price for twelve, so at your current {seats} seats it would be {annualNet} a year before VAT. It's invoiced for the seats on the account on the renewal day. Do you expect the team to change size before {renewDate}?`],
			[`Probably not. Maybe one more person in the spring.`, `Then here is the quote as it would stand. You switch in Billing settings with "Change to yearly"; it takes effect at your next renewal on {renewDate}, and "Direct debit" then appears under "Payment method", where you enter the account holder and IBAN and agree to the mandate.`, arts.annualQuote, 'a'],
			[`What happens if we add that person in the middle of the year?`, `Extra seats are invoiced pro rata for the rest of the year and collected by the same direct debit.`],
			[`And the card? I don't want it charged once it's closed.`, `Once the mandate is in place, the card is no longer used for anything. You can remove it from Billing settings after the first collection.`]
		],
		need: 'whether you expect the team to change size before {renewDate}',
		cause: `direct debit is only offered on yearly billing, and the account pays monthly by card`,
		act: `switch to yearly in Billing settings and set up the direct debit mandate before {renewDate}`,
		fixed: [`Switched to yearly and the mandate is set up; the first collection went through. Thanks for the help.`, `All done: yearly plan and direct debit in place. Thank you.`],
		follow: `Could you check that the old card is taken off the account once the direct debit is running? I don't want it charged by mistake.`,
		owe: `check after your first collection that the card ending {card4} has been removed, and confirm it to you by {day}`,
		team: 'the finance team',
		handover: `Wants direct debit; monthly Team to yearly at {renewDate}. Can you confirm the first yearly invoice?`
	},
	{
		area: 'payments and cards',
		facets: ['card', 'open', 'monthly', 'ownergone', 'notowner'],
		subjects: ['Account limited', 'Team cannot log time', 'Why is our account read-only?'],
		age: [11, 20],
		open: [
			`This morning nobody in the team can add time entries. There's a yellow banner saying the account is limited because of an unpaid invoice. I had no idea anything was unpaid.`,
			`Our workspace has gone read-only and my team is up in arms. The banner mentions a payment. We pay every month without fail, so I'm confused.`
		],
		quick: [`Does a limited account lose any data?`, `No. Everything stays as it is; people can still sign in and read, and they can add entries again as soon as the invoice is paid.`],
		reply: `Sorry, I know how disruptive that is. The banner appears when an invoice is still unpaid after the last retry. Let me find which one it is. Could you tell me who receives the billing emails at {co}? The warnings may have gone somewhere you don't see.`,
		turns: [
			[`I thought they came to me, but maybe they go to {ownerFirst}, who set the account up.`, `That's it: the only billing contact is {ownerEmail}. {invNo} for {total} failed on {invDate}, the retries failed too, and every warning went to that address. Here's what was sent. Could you check whether {ownerFirst} is still at {co}?`, arts.dunning, 'a'],
			[`{ownerFirst} left in {leftMonth} and the mailbox was closed.`, `That explains the silence. The quickest way back is to pay {invNo} with the "Pay now" link on the banner; access returns within a couple of minutes. Then add yourself as a billing contact, so the emails reach you from now on.`],
			[`How do I make myself the owner?`, `Ownership moves when the current owner hands it over or, as {ownerFirst} has left, when someone with authority at {co} confirms it in writing. Reply here with that and I'll pass it on.`],
			[`What went wrong with the card in the first place?`, `The card on file was in {ownerFirst}'s name, and it looks as if it was cancelled when they left.`]
		],
		need: 'whether {ownerFirst} is still at {co}',
		cause: `the billing emails went to {ownerEmail}, which was closed when {ownerFirst} left, and the card in their name had been cancelled, so {invNo} stayed unpaid`,
		act: `pay {invNo} with the "Pay now" link on the banner, add yourself as a billing contact and put a company card on the account`,
		fixed: [`Paid, and everyone's working again. I've added myself as billing contact. Thanks for being quick.`, `Banner's gone and I'm on the billing emails now. Thank you.`],
		follow: `Could the warnings go to everyone with admin rights, not just one address?`,
		owe: `pass that on to the payments team as a request and tell you by {day} whether they'll consider it`,
		team: 'the payments team',
		handover: `Limited for {invNo}; {ownerEmail} bounces, owner gone. Can the limit be lifted while they pay?`
	},
	{
		area: 'plans and seats',
		facets: ['grew', 'monthly', 'paid'],
		weight: 2,
		subjects: ['Why has our bill gone up?', 'Invoice higher than usual', 'Price increase?'],
		open: [
			`Our Pennywren invoice this month is {total}, against {prevTotal} last month, and nobody here remembers agreeing to pay more. Has the price gone up?`,
			`Can someone explain {invNo}? It's noticeably higher than usual and I can't see why from the PDF.`
		],
		quick: [`Do prices change when we renew?`, `Prices stay the same for as long as your plan does. If we ever change them, we write to the owner at least two months ahead.`],
		reply: `The price hasn't changed, so the difference will be in the seats. Your plan includes {included} seats and each one above that is {seatPrice} a month. Could you tell me roughly how many people you'd expect to be using Pennywren at the moment?`,
		turns: [
			[`About {usedGuess}, I'd have said.`, `Thanks. The account has {seats} seats, {added} more than at the invoice before, and I've copied the list of who holds them below. Could you look through it and tell me whether everyone on it should be there?`, arts.seatList, 'a'],
			[`{memberFirst} invited some freelancers for the {project} project, so that's where the new ones come from. I didn't know.`, `That accounts for it: {added} seats were added on {addedDate}, and an invoice charges for the seats on the account on the day it's issued. If some of those people only need to log time for a few weeks, you can remove them when they're done and the seats go with them.`],
			[`Can I stop admins adding seats without asking me?`, `Yes. In Billing settings, turn on "Only the owner can add seats". Admins can still invite people, but an invitation that needs a new seat waits for the owner's approval.`],
			[`If I remove someone halfway through the month, do we get money back?`, `Not as a refund, but the unused part of that seat comes off your next invoice as a credit.`]
		],
		need: 'whether everyone on the seat list should be there',
		cause: `{memberFirst} invited {added} freelancers on {addedDate}, which added seats above the {included} the plan includes`,
		act: `remove the freelancers' seats when the project ends and turn on "Only the owner can add seats" in Billing settings`,
		fixed: [`Spoke to {memberFirst}, removed two people we didn't need and turned the owner approval on. Next invoice estimate looks right now. Thanks.`, `All makes sense now, and the setting is on. Thanks for going through it with me.`],
		follow: `Could you send me a breakdown of seats by month for this year? Our finance director wants to see the trend.`,
		owe: `put together a month-by-month count of seats for this year and send it to you by {day}`,
		team: 'the finance team',
		handover: `Queries {invNo} ({total} against {prevTotal}); {added} seats added {addedDate}. Breakdown please?`
	},
	{
		area: 'plans and seats',
		facets: ['business', 'monthly', 'card', 'stay', 'paid'],
		subjects: ['Charge when we upgraded', 'Upgrade invoice explained?', 'Strange amount after changing plan'],
		seats: [6, 10],
		open: [
			`We moved from Team to Business on {upDate} and were charged {upNetMoney} straight away, and then {invNo} came as well. I expected to pay the Business price from the next invoice, not something in between.`,
			`I don't understand the charge we got when we upgraded. It isn't the Team price or the Business price, and our accountant has asked me to explain it.`
		],
		quick: [`Does changing plan change the day we're billed?`, `No, you keep your billing day; only the plan and the price change.`],
		reply: `Thanks for asking before your accountant does. When you change plan partway through a month, we charge the difference for the days that are left. Could you send me the invoice for the upgrade, or its number? Then I can walk you through each line.`,
		turns: [
			[`It's {upNo}. Here it is as text.`, `Thanks. The first line is Business from {upDate} to {upEnd}; the second takes off what you'd already paid for Team over the same days. The total is just the difference between the two. Could you tell me what you'd expected {invNo} to come to?`, arts.proration],
			[`I thought {invNo} would be the only Business charge, and the days before it would stay at the Team price.`, `I see where the gap is. An upgrade starts Business straight away, so the days between {upDate} and {upEnd} are charged at the Business rate, less the Team price you'd already paid for them. Nothing is charged twice: {upNo} covers those days, and {invNo} is your first full month of Business.`],
			[`Could we have had Business only from the next invoice?`, `Yes. In Billing settings, "Change plan" offers "At the next renewal" as well as "Now". With the first there's no in-between charge, but the Business features only start on that day.`],
			[`Do the extra seats change on Business?`, `Business includes {included} seats, so unless you're above that there's no charge for seats at all.`]
		],
		need: `what you'd expected {invNo} to come to`,
		cause: `the upgrade on {upDate} started Business at once, so {upNo} charged the difference for the days up to {upEnd} and {invNo} was the first full Business month`,
		act: `pass {upNo} and the explanation to your accountant, and pick "At the next renewal" for any future change if you'd rather avoid an in-between charge`,
		fixed: [`Our accountant is happy with that explanation. Thanks for the clear breakdown.`, `Makes sense now, and it's booked. Thank you.`],
		follow: `Could you put that explanation in writing on letterhead? Our accountant likes a document rather than an email.`,
		owe: `ask finance for a short letter explaining {upNo} and {invNo} and send it by {day}`,
		team: 'the finance team',
		handover: `Doesn't follow {upNo} on top of {invNo}. Could you send a statement for their accountant?`
	},
	{
		area: 'plans and seats',
		facets: ['business', 'stay', 'idle'],
		subjects: ['Moving down to Team', 'Downgrade question', 'What do we lose on Team?'],
		open: [
			`We'd like to move from Business back to Team. We hardly use the client portal any more and {seats} seats is more than we need. Will we lose anything?`,
			`If I switch our plan down to Team today, what happens to the client reports we've set up, and do we get anything back for this month?`
		],
		quick: [`Is there a limit on how many clients we can have on Team?`, `No, Team has no limit on clients or projects. The differences are the client portal, approvals in more than one step, and single sign-on.`],
		reply: `Happy to help you get the plan right. A move down takes effect at your next renewal, {renewDate}, so nothing changes before then and there's nothing to refund for the current period. Could you tell me how many people will still need a seat after the change?`,
		turns: [
			[`{used} people at most.`, `Thanks. Team includes {teamIncluded} seats and each one above that is {teamSeat} a month, so with {used} people Team would come to {teamNet} a month before VAT, against {net} now. One thing to check first: do any of your clients sign in to the client portal? On Team those accounts are closed.`],
			[`Two of our clients log in to see their reports, yes.`, `Then those two lose their access on {renewDate}. Their reports aren't deleted, and you can still send them as PDFs from the Reports page, as you would on Team. Everything else you've set up carries over.`],
			[`We have two-step approvals now. What happens to those?`, `On Team, approvals have one step. The first approver stays and the second step is switched off, but it comes back if you ever move up again.`],
			[`Can we change our minds before {renewDate}?`, `Yes. Until the day before the renewal you can undo the change in Billing settings and stay on Business.`]
		],
		need: 'whether any of your clients sign in to the client portal',
		cause: `a move down to Team only takes effect at the next renewal, {renewDate}, and client-portal accounts close then`,
		act: `schedule the change to Team in Billing settings and let your portal clients know they'll get their reports as PDFs from {renewDate}`,
		fixed: [`Scheduled the change and told our two clients. Thanks for the clear answers.`, `Done, the Billing page shows Team from {renewDate}. Thank you.`],
		follow: `Could someone show us how the PDF reports work before the change? I'd like to send the clients something that looks decent.`,
		owe: `ask the customer success team to book a short call about the PDF reports and send you a time by {day}`,
		team: 'the customer success team',
		handover: `Business to Team at {renewDate}; two portal clients. Can you help plan the switch to PDF reports?`
	},
	{
		area: 'plans and seats',
		facets: ['paid', 'idle'],
		weight: 2,
		subjects: ['Paying for more seats than people', 'Seat count does not add up', 'Who are we paying for?'],
		open: [
			`We're being charged for {seats} seats, but only {used} of us actually use Pennywren. Where are the other {idle} coming from?`,
			`I counted the people in our workspace and the number doesn't match the seats on our invoice. We seem to be paying for people who aren't here.`
		],
		quick: [`Do our clients count as seats when they look at reports?`, `Only members hold seats. On Business, client-portal accounts are free; on Team there aren't any.`],
		reply: `Thanks for checking so carefully. A seat is held by anyone who's a member, whether or not they sign in. Could you tell me whether anyone has left {co} or been taken off the workspace recently?`,
		turns: [
			[`A couple of people left over the summer, and {memberFirst} deactivated them.`, `That's likely it. Deactivating someone stops them signing in, but they keep their seat so their timesheets stay attached to them. I've copied the list as the billing app sees it. Could you look at the people marked Deactivated or Invited and tell me which ones can go?`, arts.seatList, 'a'],
			[`None of those need to be there.`, `Then you can remove them under Members with "Remove from workspace". Their time entries stay in reports under their name, and the seats are freed straight away. Invitations that were never accepted also hold a seat until they're withdrawn.`],
			[`Will we get anything back for the months we've paid for those seats?`, `Seats are charged for as long as they're held, so past months stand. If it's been a long time, I can ask finance to look at it.`],
			[`Will removing them change any of our reports?`, `No. Reports keep every entry with the person's name; removed people are just shown in grey.`]
		],
		need: 'which of the deactivated or invited people can be removed',
		cause: `{idle} seats are held by people who were deactivated or invited but never removed, and a deactivated member keeps their seat`,
		act: `remove the deactivated members and withdraw the old invitations under Members`,
		fixed: [`Removed them all, and the Billing page now says {used} seats. Thanks for explaining.`, `Cleared out the old invitations and the people who left. Seat count matches now.`],
		follow: `Could you credit us for the months we paid for those seats? It's been a while.`,
		owe: `ask finance whether they'll credit some of the past months for those seats and let you know by {day}`,
		team: 'the finance team',
		handover: `{idle} of {seats} seats held by deactivated or invited people. Credit for past months?`
	},
	{
		area: 'plans and seats',
		facets: ['stay'],
		subjects: ['Discount for a charity?', 'Non-profit pricing', 'Second workspace for a charity'],
		open: [
			`Besides the work at {co}, a few of us help run {charity}, a registered charity, and they'd like a Pennywren workspace of their own. Do you have a price for non-profits?`,
			`We do a lot of pro bono work for {charity} and they've asked whether they could use Pennywren too. Is there a discount for registered charities? Their budget is tiny.`
		],
		quick: [`Can someone be a member of two workspaces?`, `Yes. Each workspace is billed on its own, and someone who's in both holds a seat in each. They switch between them from the menu at the top left.`],
		reply: `That's kind of you to set it up for them. We do have a non-profit programme: half price on Team and Business for registered charities. Could you tell me which country the charity is registered in? The proof we ask for depends on it.`,
		turns: [
			[`It's registered here in {country}.`, `Thanks. For {country} we ask for the registration number and a copy of the registration certificate or the latest annual report. Could you send one of those? Sales then put the discount on before the first invoice.`],
			[`Attached is the certificate. The number is {charityNo}.`, `Thanks, that's what we need. The workspace has to be in the charity's own name, with its own billing details, rather than under {co}. Once it's set up, sales apply the discount and the first invoice comes at half price.`],
			[`Can the charity's workspace start with a trial, like ours did?`, `Yes, every new workspace starts with 14 days free, and the discount applies from the first invoice after that.`],
			[`Does the discount need renewing every year?`, `Once a year we ask for the latest annual report, and as long as the charity is still registered, the discount carries on.`]
		],
		need: `the charity's registration number and certificate or annual report`,
		cause: `the non-profit price only applies to a workspace in the charity's own name, once sales have checked its registration`,
		act: `set up the workspace in the charity's name and let us know its name, so sales can apply the discount`,
		mateFix: `I've checked the registration and the discount is ready to go on.`,
		fixed: [`The charity's workspace is set up, and sales have confirmed the discount. Thank you so much.`, `All in place, and the volunteers are already using it. Thanks for making it easy.`],
		follow: `Would the discount also apply if the charity later wants Business for the client portal?`,
		owe: `confirm with sales whether the discount carries over to Business and let you know by {day}`,
		team: 'the sales team',
		handover: `{charity} ({country}, no. {charityNo}) applying for the non-profit price. Certificate in the thread.`
	},
	{
		area: 'plans and seats',
		facets: ['annual', 'stay', 'renewing', 'shrank', 'idle'],
		subjects: ['Before our yearly renewal', 'Reduce seats before renewal', 'Renewal notice question'],
		open: [
			`We've had the email saying our yearly plan renews on {renewDate} for {annualTotal}. We're fewer people than last year. Can we reduce the seats before it renews?`,
			`Our renewal notice says {seats} seats, but we're down to {used}. I don't want to pay for a year of empty seats.`
		],
		quick: [`Can we switch from yearly to monthly at renewal?`, `Yes. In Billing settings, choose "Monthly" before the renewal date and the renewal becomes your first monthly invoice.`],
		reply: `Good timing; this is much simpler before the renewal than after it. The renewal is invoiced for the seats on the account that day. Could you send me the renewal email you received, so I can see which seats and price it quotes?`,
		turns: [
			[`Here it is.`, `Thanks. That quotes {seats} seats. If you remove the people who've left before {renewDate}, the renewal will be for the seats that are left. Could you tell me how many people you expect to need for the coming year?`, arts.renewalNotice],
			[`{used}, if nobody else leaves.`, `Then at {used} seats your renewal would come to {annualReduced} before VAT instead of {annualNet}. You can remove people under Members any time before {renewDate}; each removal frees its seat, and the renewal is worked out on the day.`],
			[`If we hire someone in the spring, what does that cost?`, `A seat added partway through the year is charged pro rata for the months left until the next renewal.`],
			[`Can we pay this renewal in two halves?`, `Not on a card, but finance can split a yearly invoice in two when it's paid by bank transfer. Let me know if that would help.`]
		],
		need: 'how many people you expect to need for the coming year',
		cause: `the renewal on {renewDate} is invoiced for the seats on the account that day, and the people who left still hold seats`,
		act: `remove the people who've left under Members before {renewDate}`,
		fixed: [`Removed the leavers and the renewal went through for {used} seats. Thanks!`, `Seats trimmed and the renewal invoice is what we expected. Thank you.`],
		follow: `Could finance split the renewal into two payments by transfer this time?`,
		owe: `ask finance to split the renewal into two invoices payable by transfer and confirm the dates by {day}`,
		team: 'the finance team',
		handover: `Renewing {renewDate}, {seats} to {used} seats, maybe in two halves. Can you prepare it?`
	}
];
topics.push(
	{
		area: 'plans and seats',
		facets: ['card', 'paid', 'monthly', 'team', 'recent'],
		subjects: ['Charged after our trial', 'Charge we did not expect', 'Trial turned into a subscription'],
		open: [
			`We tried Pennywren a few weeks ago and decided not to go ahead, but we've just been charged {total}. Nobody told us the trial would turn into a paid plan.`,
			`I've found a charge from Pennywren on our card that I don't recognise. I think it's from a trial we started and forgot about.`
		],
		quick: [`Is there a free plan we could drop to?`, `There isn't a free plan, but a workspace can be cancelled at any time, and it then stays readable for 30 days.`],
		reply: `Sorry for the surprise. A trial turns into a paid plan at the end only if a card was added during it; without a card, it simply stops. Could you tell me the email address the trial was started with, so I can find the workspace?`,
		turns: [
			[`It was {email}.`, `Found it. I've copied what happened below: the card ending {card4} was added during the trial, so the Team plan started when it ended and {invNo} was paid. Could you tell me whether anyone has used the workspace since the trial ended?`, arts.trialTimeline, 'a'],
			[`Nobody has signed in since, I'm fairly sure.`, `Our records agree: the last sign-in was on {trialLast}. As the plan hasn't been used, the first charge can be refunded once the workspace is cancelled. The owner can do that from Billing settings, "Cancel plan", with effect today.`],
			[`Why was a card added at all?`, `During a trial, the Billing page asks for a card so that nothing stops on the last day. Someone at {co} filled it in then, it seems.`],
			[`Will we lose the projects we set up?`, `After cancelling, the workspace stays readable for 30 days and you can export everything in that time.`]
		],
		need: 'whether anyone has used the workspace since the trial ended',
		cause: `a card was added during the trial, so the Team plan started by itself when the trial ended`,
		act: `cancel the plan from Billing settings, then reply here so finance can refund {invNo}`,
		fixed: [`Cancelled, and the refund came through today. Thanks for being reasonable about it.`, `Refund received. Thanks, we'll remember you if we look again next year.`],
		follow: `Could you make sure no further payment is attempted on that card while the refund goes through?`,
		owe: `check with the payments team that nothing more is taken from the card ending {card4} and confirm by {day}`,
		team: 'the finance team',
		handover: `Trial converted {invDate} (card added); no sign-in since {trialLast}. Cancelling; refund {invNo}?`
	},
	{
		area: 'refunds and credits',
		facets: ['card', 'paid', 'monthly', 'shrank', 'stay'],
		weight: 2,
		subjects: ['Refund for seats we removed', 'Money back for unused seats?', 'Removed people, no refund'],
		age: [8, 26],
		open: [
			`We removed {removed} people from Pennywren on {removedDate}, partway through the month, but there's no refund on our card. Shouldn't we get the unused part back?`,
			`We reduced our team in Pennywren a couple of weeks ago. When will we see the money for the seats we're no longer using?`
		],
		quick: [`Is there a way to see what the next invoice will be?`, `Yes. The Billing page shows "Next invoice" with an estimate for the seats on the account today.`],
		reply: `Thanks for asking. When seats are removed partway through a period, the unused days become a credit on the account rather than a refund to the card. Could you tell me the date you removed them? Then I can check the credit was worked out correctly.`,
		turns: [
			[`It was {removedDate}.`, `Thanks. I can see the credit: {credit} for {removed} seats from {removedDate} to {nextInv}, which will come off your next invoice on {nextInv}. Is a credit on the next invoice fine for you, or do your accounts team need the money back on the card?`],
			[`Our accountant would much rather see it go back to the card.`, `Understood. Finance can turn the credit into a refund to the card ending {card4}; it then shows as a refund on your statement within 5 to 10 working days, and the next invoice is the full amount.`],
			[`Will the refund show on an invoice?`, `It comes with a credit note against {invNo}, which you can give your accountant alongside the invoice.`],
			[`If we add someone back next month, does it cost more?`, `No, a seat costs the same whenever it's added; it's charged from the day it's added.`]
		],
		need: 'whether a credit on the next invoice is fine, or you need the money back on the card',
		cause: `seats removed partway through a period become a credit on the next invoice rather than a refund to the card`,
		act: `tell us in writing if you'd rather have the {credit} back on the card than off the next invoice`,
		mateFix: `I've turned the {credit} credit into a refund to the card ending {card4}.`,
		fixed: [`Refund on the card today. Thanks.`, `Credit note received and the refund has arrived. Our accountant is happy.`],
		follow: `Can you send the credit note to our accountant directly?`,
		owe: `ask finance to send the credit note for {invNo} to your accountant and confirm it's gone by {day}`,
		team: 'the finance team',
		handover: `{removed} seats removed {removedDate}; {credit} credit. Refund it to card ending {card4} instead?`
	},
	{
		area: 'refunds and credits',
		facets: ['card', 'paid', 'annual', 'recent'],
		subjects: ['Charged for a whole year by mistake', 'Undo switch to yearly', 'Wrong plan selected'],
		open: [
			`I clicked something in Billing settings and we've been charged {total} for a whole year. We meant to stay monthly. Can this be reversed?`,
			`We were charged for a year of Pennywren on {invDate}. I only wanted to see what yearly would cost. Please put us back on monthly and refund the difference.`
		],
		quick: [`Can I see what yearly would cost without switching?`, `Yes. In Billing settings, "Compare plans" shows the yearly price for your current seats without changing anything.`],
		reply: `Sorry about that. A switch to yearly can be undone within 14 days. Could you tell me who on your side made the change? I'd like to make sure nobody else meant to.`,
		turns: [
			[`It was me. I was looking at prices for next year's budget.`, `Thanks. The yearly invoice is {invNo}, paid on {invDate} with the card ending {card4}. To reverse it, finance refund {invNo} in full and put you back on monthly, with a monthly invoice for the current month. Could you confirm that's what you'd like? You'd give up the two free months that come with yearly.`],
			[`Yes, monthly please. We can't commit to a year right now.`, `Understood. Finance will refund {total} to the card ending {card4} and issue a monthly invoice for {monthlyTotal} for this month, so in the end you pay only for the month. The refund takes 5 to 10 working days to appear.`],
			[`Will both show on our statement?`, `Yes: the refund as one line and the monthly payment as another. If your bank shows them on different days, that's normal.`],
			[`Can you stop the yearly switch being so easy to click?`, `There's a confirmation step, but I'll pass on that it wasn't clear enough.`]
		],
		need: 'confirmation that you want to go back to monthly',
		cause: `the switch to yearly was made in Billing settings on {invDate} and charged the whole year at once`,
		act: `confirm in writing on this ticket that you want to go back to monthly, so that {invNo} can be refunded`,
		fixed: [`The refund's arrived and we're back on monthly. Thank you.`, `Back on monthly and the refund is on the statement. Thanks for the quick fix.`],
		follow: `Could you send me a credit note for {invNo}? Our accountant will need it.`,
		owe: `ask finance for a credit note for {invNo} once the refund has gone and send it to you by {day}`,
		team: 'the finance team',
		handover: `Switched to yearly by mistake on {invDate} ({invNo}). Refund and back to monthly, please.`
	},
	{
		area: 'refunds and credits',
		facets: ['card', 'paid'],
		subjects: ['Refund not received', 'Still waiting for our refund', 'Where is the refund?'],
		age: [14, 28],
		open: [
			`You told us on {refundDate} that a refund of {refundAmt} was on its way, and it still hasn't reached our card. How long should this take?`,
			`We're still waiting for the refund we were promised. Our finance team has asked me three times now.`
		],
		quick: [`Can a refund go to a different card?`, `Card refunds can only go back to the card that paid. If that card has been closed, the bank passes it on to the account behind it.`],
		reply: `Sorry for the wait. Let me check where the refund has got to. Could you tell me which card the original payment was made with? The last four digits are enough.`,
		turns: [
			[`It ends {card4}.`, `Thanks. The refund left us on {refundDate} and Quillpay passed it to the card network the same day. I've copied its status below, with the bank reference. Is that card still open? A refund to a replaced or closed card takes longer.`, arts.refundStatus, 'a'],
			[`It was replaced last month after some fraud on it. Same account, though.`, `That explains the delay. When a card is replaced, the bank has to move the refund across to the new card, and some banks take up to 15 working days to do it. The reference above lets your bank find it straight away.`],
			[`Can you send it again some other way?`, `Not while the first one is with the bank; that would pay you twice. If your bank says it can't find it with the reference, we'll look again.`],
			[`What exactly should I tell the bank?`, `That a refund from Pennywren B.V. for {refundAmt} was sent on {refundDate} to the old card, with the reference {arn}.`]
		],
		need: 'whether the card ending {card4} is still open',
		cause: `the refund went to the card ending {card4} on {refundDate}, and the bank has to move it to the replacement card, which can take up to 15 working days`,
		act: `give your bank the reference {arn} and ask them to move the refund to the new card`,
		fixed: [`The bank found it with the reference and it's arrived. Thanks.`, `Refund arrived today. The reference did the trick.`],
		follow: `If it hasn't arrived by the end of the month, could you send it by bank transfer instead?`,
		owe: `check with the payments team on the last working day of the month whether the refund has landed, and arrange a transfer if not; I'll write to you by {day} with where things stand`,
		team: 'the payments team',
		handover: `Refund of {refundAmt} on {refundDate} to card ending {card4}, since replaced. Did it settle?`
	},
	{
		area: 'refunds and credits',
		facets: ['paid'],
		subjects: ['Credit note for a refund', 'Our accountant needs a credit note', 'Refund paperwork'],
		age: [12, 28],
		open: [
			`We had a refund of {refundAmt} from you on {refundDate}, but our accountant needs a credit note to book it. Can you send one?`,
			`Our bookkeeper won't book the refund you sent without a proper credit note. Is that something you can produce?`
		],
		quick: [`Can our bookkeeper get our invoices directly?`, `Yes. Add her as a billing contact in Billing settings; she gets the invoices by email and doesn't need a seat for that.`],
		reply: `Of course. Credit notes come from finance, and I just need to make sure it goes against the right invoice. Could you tell me which invoice the refund was for?`,
		turns: [
			[`I think it was {invNo}.`, `Thanks, that matches: {refundAmt} was refunded against {invNo} on {refundDate}, for "{creditReason}". Should the credit note be in the name on that invoice, or in a different name? It has to match the invoice unless the invoice is reissued too.`],
			[`The same name is fine.`, `Then finance can issue it as it stands. It shows the original invoice number, the amount refunded, the VAT as on the invoice and the date the money went back. Here's how it will read.`, arts.creditNote, 'a'],
			[`Will future refunds come with a credit note automatically?`, `Not yet; they're issued on request. Just reply to the refund email and ask.`],
			[`Can it go straight to our bookkeeper?`, `Yes, if you give me her address, finance will send it to her as well as to you.`]
		],
		need: 'whether the credit note should be in the name on the invoice',
		cause: `credit notes are only issued on request, and nobody had asked for one when {refundAmt} was refunded against {invNo}`,
		act: `add your accountant as a billing contact, so she gets credit notes and invoices directly`,
		mateFix: `I've issued the credit note against {invNo}.`,
		fixed: [`Credit note received and booked. Thanks!`, `Got it, and our accountant is happy now.`],
		follow: `Could you also send credit notes for the earlier refunds this year?`,
		owe: `ask finance for credit notes for the earlier refunds this year and send them to you by {day}`,
		team: 'the finance team',
		handover: `Credit note please for the {refundAmt} refund on {refundDate} against {invNo}.`
	},
	{
		area: 'cancellations',
		facets: ['cancel'],
		weight: 2,
		subjects: ['Cancel our subscription', 'Cancellation at end of period', 'Please confirm cancellation'],
		open: [
			`We've decided to stop using Pennywren at the end of our current period. Could you cancel our plan from then and confirm that nothing more will be charged?`,
			`Please cancel {co}'s subscription. We're moving to another tool next month. I'd like written confirmation, please.`
		],
		quick: [`Can the team still sign in until the end of the period?`, `Yes. A cancelled plan runs until the end of the period you've paid for, and everyone carries on as normal until then.`],
		reply: `Sorry to see you go, and thanks for letting us know in good time. Only the owner can cancel, from Billing settings, "Cancel plan". Could you tell me whether you're the owner of the workspace? If not, I'll need the owner's go-ahead.`,
		turns: [
			[`{ownerAnswer}`, `Thanks. The plan can be cancelled to take effect on {effective}, the end of the period already paid for. Before that, would you like an export of your data? After {effective}, the workspace stays readable for 30 days and is then deleted.`],
			[`Yes, we'll want our timesheets for our records.`, `Then the owner can start one under Settings, "Export", any time before {dataUntil}. Once the cancellation is done, the owner gets a summary like this one by email.`, arts.cancelSummary, 'a'],
			[`Is there anything to cancel at Quillpay separately?`, `No. Quillpay only handles the payments for us; when the plan ends, there's nothing left for it to charge.`],
			[`If we change our minds in a few months, can we come back?`, `Yes. Within 30 days of {effective} you can restart the same workspace; after that you'd start a new one and import your export.`]
		],
		need: `whether you'd like an export of your data first`,
		cause: `only the owner can cancel, from Billing settings, and the cancellation takes effect at the end of the period already paid for, {effective}`,
		act: `have the owner cancel the plan in Billing settings and start the export before {dataUntil}`,
		fixed: [`Cancelled, export downloaded and the confirmation has arrived. Thanks for making it painless.`, `All done on our side. Thanks for the help, and sorry it didn't work out.`],
		follow: `Could you send a letter confirming that we owe nothing after {effective}? Our finance director wants one.`,
		owe: `ask finance for a letter confirming nothing is owed after {effective} and send it to you by {day}`,
		team: 'the customer success team',
		handover: `Cancelling at {effective}; wants help with the export first. Can you pick it up?`
	},
	{
		area: 'cancellations',
		facets: ['cancel', 'card', 'paid', 'monthly'],
		subjects: ['Charged after cancelling', 'We cancelled but were billed again', 'Refund after cancellation'],
		age: [2, 8],
		open: [
			`I cancelled our plan on {cancelDate} and you charged us {total} a few days later anyway. Please refund it.`,
			`Why have we been charged again? We cancelled Pennywren weeks ago.`
		],
		quick: [`Do you keep our card details after we cancel?`, `Quillpay keeps the card on file until the plan ends, and then removes it; Pennywren never stores the card number itself.`],
		reply: `Sorry for the confusion. Let me check what happened on the account. Could you tell me roughly when you cancelled, and from which email address?`,
		turns: [
			[`On {cancelDate}, from {email}.`, `Thanks. On {cancelDate} the cancellation page was opened from {email}, but the last step, "Confirm cancellation", wasn't clicked, so the plan carried on and renewed on {invDate}. Could you tell me whether anyone has used the workspace since {invDate}? That decides what I can refund.`],
			[`No one. We moved to another tool at the start of the month.`, `Thanks. As nobody has signed in since the renewal, finance can refund {invNo} in full once the cancellation is finished. The owner just needs to go back to Billing settings and click through to "Confirm cancellation"; the confirmation email follows straight away.`],
			[`Why didn't the page warn me it wasn't done?`, `It shows a banner saying the cancellation hasn't been confirmed, but it's easy to close the page before seeing it. I've passed that on.`],
			[`Will we be charged again before the refund comes?`, `No. Once the cancellation is confirmed, there's no further renewal.`]
		],
		need: 'whether anyone has used the workspace since {invDate}',
		cause: `the cancellation on {cancelDate} was never confirmed, so the plan renewed on {invDate}`,
		act: `have the owner finish the cancellation in Billing settings with "Confirm cancellation", so that {invNo} can be refunded`,
		fixed: [`Confirmed the cancellation, and the refund has come through. Thanks.`, `Done: confirmation email received and the refund is on the card.`],
		follow: `Can you confirm in writing that there will be no more charges after this?`,
		owe: `send you a written confirmation from finance that the plan has ended and nothing more will be charged, by {day}`,
		team: 'the finance team',
		handover: `Cancellation of {cancelDate} never confirmed; renewed {invDate}. Refund {invNo} once confirmed.`
	},
	{
		area: 'cancellations',
		facets: ['cancel', 'paid'],
		subjects: ['Getting our data out after cancelling', 'Is our data gone?', 'Export after the plan ended'],
		ended: true,
		open: [
			`Our plan ended on {effective}, and I've just realised we never downloaded our project history. Is it gone?`,
			`We cancelled a few weeks ago and now our auditor wants three years of timesheets. Can we still get them out?`
		],
		quick: [`Do you keep backups after a workspace is deleted?`, `Backups are kept for 35 days after deletion and then overwritten; they can't be used to bring back a single workspace.`],
		reply: `Don't worry, it's very likely still there. After a plan ends, the workspace stays readable for 30 days. Could you tell me the name of the workspace? Then I can check its dates.`,
		turns: [
			[`It's "{ws}".`, `Thanks. "{ws}" ended on {effective} and stays readable until {dataUntil}. The owner can still sign in and export everything. Could you tell me whether the owner, {ownerName}, can still sign in?`],
			[`Yes, that still works.`, `Then the export is under Settings, "Export", "Everything". It produces CSV files of time entries, projects and clients, and the PDFs of past client reports. Here's what the workspace has exported before, so you can see the links that have expired.`, arts.exportLog, 'a'],
			[`What happens on {dataUntil}?`, `The workspace and its files are deleted, and after that we can't recover them.`],
			[`Can we have a few more weeks? Our auditor is slow.`, `The date can be pushed back by 30 days once, if the owner asks for it.`]
		],
		need: 'whether the owner can still sign in',
		cause: `the workspace ended on {effective} and stays readable until {dataUntil}, but nobody had started an export`,
		act: `have the owner start the export under Settings before {dataUntil}`,
		fixed: [`Export downloaded, all three years there. Thank you!`, `Got everything out. Relief all round.`],
		follow: `Could you push the date back by the extra 30 days anyway, in case the auditor asks for more?`,
		owe: `ask the privacy team to push the deletion date back by 30 days and confirm the new date by {day}`,
		team: 'the privacy team',
		handover: `"{ws}" ended {effective}, deletion {dataUntil}. May ask for the 30-day extension.`
	},
	{
		area: 'cancellations',
		facets: ['shrank'],
		subjects: ['Pause our subscription?', 'Freeze account over winter', 'Seasonal break'],
		open: [
			`We're a small team and our busy season is spring and summer. Is there a way to pause Pennywren over the winter rather than paying for empty months?`,
			`Can we freeze our account from November to February? We'll be back in March, and I don't want to lose our setup.`
		],
		quick: [`If we take seats off now, can we add them back in March?`, `Yes, seats can be added again at any time, and they're charged from the day they come back.`],
		reply: `It's a fair question, and we hear it from seasonal teams. There isn't a pause as such, but there are ways to bring the cost right down. Could you tell me how many people would still need to sign in over the winter?`,
		turns: [
			[`Just me and maybe {memberFirst}, for invoicing.`, `Thanks. Then the cheapest route is to keep the workspace and remove the seats you won't need: with two people you'd pay the plan price of {base} a month and nothing for seats. Everyone you remove keeps their history, and you invite them back later. Roughly when would you want everyone back?`],
			[`The first week of March.`, `Then remove the seats after your invoice on {nextInv}, and invite people back in the last week of February. Seats removed partway through a month become a credit on the next invoice, so nothing is paid twice.`],
			[`Will their settings and projects still be there in March?`, `Yes. Removing someone takes away their seat, not their projects or entries; when they accept the new invitation, they see everything as before.`],
			[`Would cancelling and restarting be cheaper?`, `Only if you're away for less than 30 days, as the workspace is deleted after that. Keeping two seats is safer.`]
		],
		need: `roughly when you'd want everyone back`,
		cause: `there's no pause, but removing seats over the winter brings the cost down to the plan price`,
		act: `remove the seats you won't need after the invoice on {nextInv} and invite people back at the end of February`,
		fixed: [`That plan works for us: seats off after that invoice, everyone back in March. Exactly what we wanted.`, `Clear, thank you. Much better than paying for empty seats all winter.`],
		follow: `Could you remind us at the end of February to bring the seats back? It's easy to forget.`,
		owe: `set myself a reminder and email you in the last week of February about adding the seats back; I'll confirm the reminder is set by {day}`,
		team: 'the customer success team',
		handover: `Seasonal customer, down to two seats for winter. Follow up in February?`
	},
	{
		area: 'company and VAT details',
		facets: ['eu', 'notaxid', 'monthly'],
		weight: 2,
		subjects: ['VAT charged on our invoices', 'Reverse charge please', 'VAT number not on invoices'],
		open: [
			`We're a VAT-registered business in {country}, but your invoices charge us VAT at {countryVat}% and don't show our VAT number. Our accountant says they should be reverse charged.`,
			`Your invoices to us include VAT, which they shouldn't for a business customer in another EU country. Our VAT number is {taxId}. Can the invoices be corrected?`
		],
		quick: [`Where does our VAT number show on the invoice?`, `Under your company's address, as "VAT number". If it isn't there, there's no number on the account.`],
		reply: `Thanks for pointing it out. Invoices are only reverse charged when there's a VAT number on the account, and at the moment there isn't one. Could you confirm the number exactly as it's registered, with the country code?`,
		turns: [
			[`It's {taxId}. Here's our last invoice, so you can see what I mean.`, `Thanks, it checks out against the EU register. If you add it in Billing settings under "VAT number", your next invoice will be reverse charged with no VAT. Which past invoices does your accountant want corrected? We can reissue those from the last twelve months.`, arts.invoiceText],
			[`Everything since {sinceInv}, if possible.`, `That's within twelve months, so finance can reissue each of them without VAT and with your number, and refund the VAT you paid on them as one amount, to the card or account they were paid from.`],
			[`Will the reissued invoices have new numbers?`, `No, they keep their numbers and say "Reissued" with the date, so your books still match.`],
			[`Do we need to do anything in our own VAT return?`, `That's one for your accountant, but usually you report reverse-charged services yourself in the return.`]
		],
		need: 'which past invoices your accountant wants corrected',
		cause: `there was no VAT number on the account, so the invoices charged {country} VAT instead of being reverse charged`,
		act: `add {taxId} under "VAT number" in Billing settings before the next invoice`,
		mateFix: `I've reissued the invoices since {sinceInv} without VAT and refunded the VAT on them.`,
		fixed: [`Number added, and the reissued invoices arrived without VAT. Thanks.`, `Our accountant has the corrected invoices and the VAT refund came in. Sorted.`],
		follow: `Could the VAT refund come by bank transfer rather than to the card? Our accountant prefers it.`,
		owe: `ask finance whether the VAT can be refunded by bank transfer and tell you by {day}`,
		team: 'the finance team',
		handover: `No VAT number on file, so VAT charged; {taxId} checks out. Reissue since {sinceInv} and refund the VAT.`
	},
	{
		area: 'company and VAT details',
		facets: ['eu', 'notaxid', 'badtaxid', 'monthly'],
		subjects: ['VAT number not being picked up', 'Still charged VAT', 'Problem with our VAT number'],
		open: [
			`I added our VAT number in Billing settings weeks ago, but the latest invoice still charges VAT. Is it not being picked up?`,
			`Billing settings shows our VAT number, yet {invNo} has {countryVat}% VAT on it again. What are we doing wrong?`
		],
		quick: [`Do we need a VAT number to buy Pennywren?`, `No. Without one, we charge VAT at the rate of the country you're in; with one, invoices to businesses outside the Netherlands are reverse charged.`],
		reply: `Sorry for the trouble. When a number is added, we check it against the EU register, and invoices only drop the VAT once the check passes. Could you copy the number exactly as it's typed in Billing settings?`,
		turns: [
			[`It says {taxBad}.`, `Thanks, that's the snag. I ran it through the same check, below: as typed, the register doesn't recognise it, but with the country code {prefix} in front and no spaces it comes back active. Could you edit it in Billing settings to read {taxId} and let me know when it's saved?`, arts.vies, 'a'],
			[`I didn't realise the country code was part of it.`, `It catches a lot of people. The register needs the full number with its country code. Once it's saved like that, the check passes within a minute, and every invoice from then on is reverse charged.`],
			[`What about {invNo}, which already has VAT on it?`, `Finance can reissue it without VAT and refund the VAT on it, once the number is saved correctly.`],
			[`Will we get an email when the check passes?`, `No email, but the number gets a green tick in Billing settings.`]
		],
		need: 'confirmation that the number is saved as {taxId}',
		cause: `the VAT number was typed without its country code, so the register check failed and the invoices kept charging VAT`,
		act: `change the number in Billing settings to {taxId}, with the country code and no spaces`,
		fixed: [`Changed it and there's a green tick now. Thanks!`, `Fixed the number, and finance sent {invNo} again without VAT. All good.`],
		follow: `Can you refund the VAT on the invoices before {invNo} as well?`,
		owe: `ask finance to reissue the earlier invoices without VAT and refund it, and let you know by {day}`,
		team: 'the finance team',
		handover: `VAT number typed as "{taxBad}", fails the check; {taxId} passes. Reissue {invNo} once fixed.`
	},
	{
		area: 'company and VAT details',
		facets: ['ownergone', 'notowner'],
		subjects: ['Change the owner of our account', 'Owner has left the company', 'Cannot get into Billing settings'],
		open: [
			`The person who set up our Pennywren account, {ownerName}, left {co} in {leftMonth}. I'm an admin but can't open Billing settings to update the card. How do I take over?`,
			`We need to change the owner of our workspace. The current owner has left the company and isn't answering emails.`
		],
		quick: [`Can a workspace have two owners?`, `No, a workspace has one owner but any number of admins. Only the owner sees Billing settings.`],
		reply: `Thanks for asking us rather than trying to work round it. Ownership carries access to billing, so we're careful about moving it. Could you tell me whether {ownerFirst} can still be reached at all, even on a personal address?`,
		turns: [
			[`Not really. Their work email was closed when they left.`, `Understood. Then we need written confirmation from someone with authority at {co}, such as a director, that you should become the owner, sent from an address at {domain}. I've copied what our log shows for the account. Who would send that confirmation?`, arts.ownerAudit, 'a'],
			[`Our managing director, {director}, can send it today.`, `That's fine. Once {director}'s email arrives on this ticket, security move ownership to you, and you'll get an email saying you're now the owner. You'll then see Billing settings and can change the card.`],
			[`Does {ownerFirst} keep any access after that?`, `Their account becomes an ordinary member, and you can remove it entirely under Members.`],
			[`Will the change affect our invoices?`, `No, invoices carry the company details from Billing settings, not the owner's name.`]
		],
		need: 'who at {co} would send the confirmation',
		cause: `the owner, {ownerName}, left in {leftMonth}, and only the owner can open Billing settings`,
		act: `ask {director} to send written confirmation from an address at {domain} on this ticket`,
		mateFix: `I've moved ownership to you.`,
		fixed: [`I'm the owner now and the card's updated. Thanks for being careful about it.`, `Got the ownership email and I can see Billing settings. Thanks.`],
		follow: `Could you also remove {ownerFirst}'s account once ownership has moved? I'd rather not do it myself.`,
		owe: `ask security to remove {ownerFirst}'s account once ownership has moved and confirm by {day}`,
		team: 'the security team',
		handover: `Owner {ownerName} left in {leftMonth}; admin {full} to take over, confirmation from {director} to follow.`
	},
	{
		area: 'company and VAT details',
		facets: ['transfer', 'held'],
		subjects: ['Supplier form for our finance system', 'Bank details on letterhead', 'Supplier onboarding'],
		open: [
			`Our new finance system asks every supplier to fill in a form before we can pay their invoices. Could Pennywren complete it? We can't pay {invNo} until it's done.`,
			`Procurement have asked me to get your bank details on letterhead and a few other things, or they'll block payments to you. Who handles that?`
		],
		quick: [`Is Pennywren's bank account in the Netherlands?`, `Yes. Our account is held through Quillpay, our payment provider, with a Dutch IBAN.`],
		reply: `Happy to help. Most of this is standard, and finance fill these in regularly. Could you send me the form, or the list of what procurement need?`,
		turns: [
			[`Here's the form. The question marks are what we need from you.`, `Thanks. The company details at the top are right. The bank letter and remittance contact come from finance, and the last line needs our privacy team. When do procurement need it back? That decides whether I send it in one go or in parts.`, arts.supplierForm],
			[`By the end of next week, ideally.`, `That's fine. Finance will send the signed bank letter and remittance contact, and privacy the last document, all on this ticket. The IBAN on the letter will match the one on {invNo}, NL27 QPAY 0318 4470 52.`],
			[`Will the letter be signed by a director?`, `It's signed by our finance director, which most procurement teams accept.`],
			[`Can remittance advice be emailed to you?`, `Yes, to finance@pennywren.example, with the invoice number in the subject.`]
		],
		need: 'when procurement need the form back',
		cause: `procurement need the supplier form completed, with a signed bank letter, before they'll pay {invNo}`,
		act: `pass the completed form and bank letter to procurement so they can release {invNo}`,
		mateFix: `I've filled in the form and attached the signed bank letter.`,
		fixed: [`Procurement have everything and {invNo} is scheduled for payment. Thanks.`, `Form accepted; you're set up as a supplier now.`],
		follow: `Procurement have now asked for your insurance certificate as well. Can you send it?`,
		owe: `get the insurance certificate from finance and send it to you by {day}`,
		team: 'the finance team',
		handover: `Supplier form, bank letter and remittance contact needed before they pay {invNo}. Form in the thread.`
	},
	{
		area: 'other',
		facets: ['paid'],
		subjects: ['Is this email from you?', 'Suspicious billing email', 'Fake Pennywren invoice?'],
		open: [
			`I've had an email that looks as if it's from Pennywren billing, saying our payment failed and asking me to update the card through a link. Something about it looks off. Is it from you?`,
			`{memberFirst} in our office got a "final notice" email from "Pennywren Billing" and almost typed in our card details. Can you tell me whether it's really from you?`
		],
		quick: [`How can I tell a real Pennywren billing email?`, `Ours come from billing@pennywren.example and link only to app.pennywren.example or pay.quillpay.example. We never ask for card details by reply.`],
		reply: `Thank you for checking with us first. That doesn't sound like one of ours. Could you forward the email as an attachment, or copy its full headers? Then security can see where it came from.`,
		turns: [
			[`Here are the headers.`, `Thanks. This isn't from us: the sender's domain isn't ours and the link goes to a site we don't own. Your account has no failed payment; the last invoice, {invNo}, is paid. Did anyone click the link or type anything in?`, arts.phishHeaders],
			[`{memberFirst} clicked it but stopped when it asked for the card number.`, `That was the right instinct. Clicking alone is unlikely to have done harm, but {memberFirst} should change her Pennywren password, as these pages sometimes ask for sign-in details first. Nothing on your account has changed.`],
			[`Should we report it somewhere?`, `Security will report the domain to its host and registrar today, and you can report it to your national fraud reporting service too.`],
			[`Could they have got our address from you?`, `There's no sign of that; these are usually sent to addresses found on company websites.`]
		],
		need: 'whether anyone clicked the link or typed anything in',
		cause: `the email came from a look-alike domain that isn't ours, linking to a site we don't own`,
		act: `have {memberFirst} change her Pennywren password and delete the email`,
		fixed: [`Password changed and the email deleted. Thanks for checking so quickly.`, `{memberFirst} has changed her password. Thanks for the reassurance.`],
		follow: `Can you let us know when the fake site is taken down?`,
		owe: `ask security to tell me when the site is taken down and pass it on to you by {day}`,
		team: 'the security team',
		handover: `Look-alike billing email, headers in the thread. One click, nothing typed. Report the domain?`
	},
	{
		area: 'other',
		facets: [],
		subjects: ['Approved hours for payroll', 'Export for our payroll provider', 'Question about exports'],
		open: [
			`Sorry if this is the wrong place: I wrote to billing because it's about payroll. Can Pennywren give us each person's approved hours for a month, in a file our payroll provider can read?`,
			`Our payroll provider needs approved hours per person each month. At the moment we copy them out of Pennywren by hand. Is there an export for this?`
		],
		quick: [`Are exports included in our plan, or extra?`, `Exports are included in every plan; there's nothing extra to pay.`],
		reply: `No problem, I'm happy to point you in the right direction even though it isn't billing. There's an export for approved hours. Could you tell me which payroll provider you use? Some read our file as it is, and some need the columns in a set order.`,
		turns: [
			[`It's {payroll}. This is the kind of file we send them now.`, `Thanks, that helps. Our "Approved hours" export, under Reports, gives one row per person per week, with project and client, which is close to what you send. Do {payroll} need weekly rows, or one total per person per month?`, arts.payrollCsv],
			[`One total per person per month, I think.`, `Then choose "Group by person" and "Month" in the export options; the file then has one row per person with their approved hours, which most payroll providers take as it is.`],
			[`Can it be sent to them automatically each month?`, `Not directly, but you can schedule the export to email you on the first of each month and forward it.`],
			[`Does it include hours that haven't been approved yet?`, `No, only approved hours. Anything still waiting is listed separately at the end.`]
		],
		need: 'whether your payroll provider need weekly rows or one total per month',
		cause: `the "Approved hours" export can be grouped by person and month, which is what the payroll provider needs`,
		act: `set the "Approved hours" export to group by person and month, and schedule it for the first of each month`,
		fixed: [`The monthly export is exactly what {payroll} wanted. Thanks for helping even though it wasn't billing.`, `Scheduled it, and the first file went through payroll fine.`],
		follow: `Could the export include each person's employee number from our HR system? That's what payroll match on.`,
		owe: `pass that to the product support team as a request and tell you by {day} whether it's possible`,
		team: 'the product support team',
		handover: `Wants monthly approved hours per person for {payroll}. Can you help with grouping and schedule?`
	},
	{
		area: 'invoices and receipts',
		facets: ['nonen'],
		subjects: ['Invoices in {lang}?', 'Invoice language', 'Can we get invoices in {lang}'],
		open: [
			`Our bookkeeper has asked whether we can have our Pennywren invoices in {lang} rather than English. Is that possible?`,
			`Is there a way to get invoices in {lang}? Our tax adviser prefers documents in {lang} for the annual accounts.`
		],
		quick: [`Can the app itself be in {lang}?`, `Each person can choose their own language under Profile; {lang} is one of the options.`],
		reply: `Yes: invoices can be issued in English, Dutch, German or French, and the invoice language is separate from the language of the app. Could you tell me whether anyone has changed the app language for your team? Sometimes people expect the invoices to follow.`,
		turns: [
			[`I set my own profile to {lang}, but the invoices stayed in English.`, `That's expected: the profile language changes the app for you, not the invoices. I've copied the settings that apply to your account below. Do you want only new invoices in {lang}, or past ones too?`, arts.langSettings, 'a'],
			[`New ones would do, and this year's if it's easy.`, `New ones are easy: in Billing settings, set "Invoice language" to {lang}, and every invoice from the next one comes in {lang}. Past invoices can be reissued in {lang} by finance; they keep their numbers.`],
			[`Will the amounts or VAT change?`, `No, only the wording. Numbers, VAT and totals stay exactly as they are.`],
			[`Do the reminder emails change too?`, `Yes, billing emails follow the invoice language.`]
		],
		need: 'whether you want only new invoices in {lang}, or past ones too',
		cause: `the invoice language is set separately in Billing settings and was still English`,
		act: `set "Invoice language" to {lang} in Billing settings`,
		mateFix: `I've reissued this year's invoices in {lang}.`,
		fixed: [`Changed the setting, and this year's invoices arrived in {lang} today. Thanks.`, `Invoices now in {lang}. Our bookkeeper is delighted.`],
		follow: `Could you reissue this year's invoices in {lang} as well?`,
		owe: `ask finance to reissue this year's invoices in {lang} and send them to you by {day}`,
		team: 'the finance team',
		handover: `Wants invoices in {lang}, this year's too. Reissue once the setting is changed?`
	}
);

// ---------------------------------------------------------------------------------------------------------
// Shared parts of a conversation.
const backstories = [
	`We've been on Pennywren at {co} since {sinceMonth}, mostly for {product}.`,
	`I look after the accounts at {co}, so the Pennywren invoices land on my desk.`,
	`I'm writing on behalf of {co}; I handle our suppliers and subscriptions.`,
	`We're a team of {used} at {co}, and Pennywren is one of the few tools everyone actually uses.`,
	`Our financial year closes soon, so I'm going through every supplier we pay.`,
	`Apologies if this has been asked before; I couldn't find it in the help pages.`,
	`I took over the admin side of our Pennywren account from a colleague recently, so please bear with me.`,
	`We're a small office and I do a bit of everything, billing included.`,
	`This is my first time writing to you, so I hope this is the right address.`,
	`I tried the help centre first, but the article didn't quite cover our case.`
];
const firstGreetings = ['Hi,', 'Hello,', 'Dear Pennywren billing,', 'Hello billing team,', 'Good day,', ''];
const replyGreetings = ['Hi {agent},', '{agent},', '', 'Hi again,', 'Hello {agent},', 'Dear {agent},'];
const custSignoffs = ['Thanks,\n{first}', 'Kind regards,\n{full}\n{title}, {co}', 'Best,\n{first}', 'Many thanks,\n{full}\n{title}\n{co}\n{town}', '{first}', 'Regards,\n{full}'];
const replySignoffs = ['Thanks,\n{first}', '{first}', 'Best, {first}', '', 'Thanks again,\n{first}', 'Regards,\n{full}'];
const agentGreetings = ['Hi {first},', 'Hello {first},', 'Dear {first},', 'Hi {first}, thanks for writing to us.'];
const agentGreetingsLater = ['Hi {first},', 'Hello again {first},', 'Hi {first}, thanks for coming back to me.', 'Hello {first},', 'Thanks, {first}.'];
const agentSignoffs = ['Best regards,\n{agent}\nPennywren Billing', 'Thanks,\n{agent}', 'Kind regards,\n{agent} | Billing at Pennywren', 'All the best,\n{agent}', 'Regards,\n{agent}\nPennywren Billing'];
const agentIntros = [`Thanks for getting in touch.`, `Thanks for the clear description; it saves a lot of back and forth.`, `Sorry for the slow reply; we've had a busy start to the week.`, `Thanks for writing in about this.`, `Thanks for flagging it.`];
const custAcks = [`Thanks, that helps.`, `OK, understood.`, `Right.`, `Thanks for the quick answer.`, `Ah, I see.`, `That makes sense.`, `Thanks, that's clearer than the help page.`, `Great, thanks.`];
const vagueSubjects = ['Billing question', 'Invoice query', 'Question about our account', 'Help please', '(no subject)', 'Re: Your Pennywren invoice', 'Pennywren account', 'Urgent', 'A few questions'];
const holdings = [`Thanks, let me look into this properly and come back to you.`, `Thanks for that. I want to check something with finance before I answer, so bear with me.`, `Got it, thank you. I'll look at the account and come back to you shortly.`];
const notes = [
	`Account: {plan}, {cycle}, {seats} seats, paying by {methodLabel}. Customer since {sinceMonth}. Nothing unusual in the history.`,
	`Checked Quillpay for {cus}: nothing outstanding beyond what's in this thread.`,
	`Second ticket from this account this quarter; the first was answered the same day.`,
	`Customer is busy, going by the tone. Keeping replies short.`,
	`Looked for similar tickets: a couple this month, same answer each time.`,
	`{requesterRole}`,
	`{co} is on the list sales keep for possible upgrades. No need to mention it here.`
];
const passLines = [
	`I've passed this to {team}, who can see more of the account than I can. They'll reply on this ticket, so their answer will reach you by email.`,
	`I've asked {team} to take this one, as it needs someone who can make changes I can't. They'll write to you here.`,
	`This needs {team}, so I've handed it over with everything above. You'll hear from them on this ticket.`
];
const mateAcks = [`Hi {first}, {mate} from {team} here. I've picked this up and will be in touch once I've had a proper look.`, `Hello {first}, this is {mate} in {team}. Thanks for your patience; I'm on it and will update you here.`];
const actLines = [
	`So the next step is on your side: you'll need to {act}. Reply here if anything doesn't behave as described.`,
	`From here it's with you: you'll need to {act}. I'll keep the ticket open in case you need anything.`,
	`To sum up, you'll need to {act}. Let me know how you get on.`
];
const willDos = [`OK, I'll do that {when} and let you know.`, `Will do. I'll get {memberFirst} to help {when}.`, `Thanks. I'll sort it {when}.`, `Understood. I'll get on to it {when}.`];
const oweLines = [`Leave that with me. I'll {owe}.`, `Fair question. Let me {owe}.`, `I'll {owe}, and I'll keep this ticket open until then.`];
const thanksLines = [`Thanks, I'll look out for it.`, `Great, thank you.`, `Appreciated, thanks.`, `Thanks, speak then.`];
const closings = [`Good to hear. I'll leave it there, but just reply to this email if anything comes up.`, `Glad that did it!`, `Thanks for letting me know.`, `Great news. Have a good rest of the week.`];
const nudges1 = [`Just checking in. When you have a moment, I still need {need} to take this further.`, `Following up on my last message: could you let me know {need}? No rush; I just want to make sure it didn't get buried.`, `I don't want this to fall through the cracks. As soon as I know {need}, I can carry on.`];
const nudgesEarly = [`Just checking in on my last message. Once I have the details I asked for, I can take this further.`, `Following up in case my last email got buried: whenever you have a moment, send me what I asked for and I'll carry on from there.`];
const nudges2 = [`I haven't heard back, so I'll assume things are fine for now. If it's still a problem, reply here and the ticket comes straight back to me.`, `One last nudge from me. Whenever you're ready, reply to this email and I'll pick it up with everything above.`];
const chatHellos = [`Hi {first}, I'm {agent} from Pennywren Billing. Let me read your message.`, `Hello {first}, {agent} here. Thanks for waiting.`, `Hi {first}! {agent} from billing. Give me a moment to catch up.`];
const chatHandoffs = [`I'll keep this ticket open, so you can reply to the email copy of this chat with anything else.`, `If anything else comes up, reply to the email copy of this chat and it comes straight back to me.`];
const projects = ['Harbour Lofts', 'Annual report', 'Town hall refit', 'Riverside masterplan', 'Brand refresh', 'Museum wayfinding', 'Clinic fit-out', 'Website rebuild'];
const charities = ['the Riverbank Food Bank', 'Harbour Youth Sailing', 'the Linden Community Garden', `St Bride's Night Shelter`, 'the Millbrook Reading Project'];
const directors = ['Hilde', 'Conor', 'Annelies', 'Gregor', 'Fenna', 'Declan', 'Ottilie', 'Ruben'];
const payrolls: Record<string, string[]> = { NL: ['Nmbrs', 'Loket'], DE: ['DATEV', 'Personio'], AT: ['DATEV', 'BMD'], BE: ['SD Worx', 'Partena'], FR: ['PayFit', 'Silae'], IE: ['BrightPay', 'Thesaurus'], GB: ['BrightPay', 'Sage Payroll'] };
const refs = ['{head} Pennywren', 'Pennywren subscription', 'SOFTWARE {mon}', 'PW {mon}', '{cus}', 'Invoice {mon} timesheets', 'Pennywren'];

// ---------------------------------------------------------------------------------------------------------
// Which topic leads each ticket: topics are dealt in rounds, each round shuffled by its own seed.
const deck: Topic[] = [];
for (let round = 0; deck.length < ITEMS; round++) deck.push(...shuffle(mulberry32(0xdec0 + round * 977), topics.flatMap((topic) => Array(topic.weight ?? 1).fill(topic) as Topic[])));
const clashes = (facts: Set<Facet>, facets: Facet[]) => facets.some((f) => CLASHES.some(([x, y]) => (f === x && facts.has(y)) || (f === y && facts.has(x))));

interface Item {
	who: 'c' | 'a' | 'note' | 'mate';
	paras: string[];
	art?: () => string;
	wait?: 'long';
}

const vatNumber = (r: Rand, country: Country): [string, string] => {
	const digits = (n: number) => Array.from({ length: n }, () => String(int(r, 0, 9))).join('');
	const d = digits(9);
	switch (country.prefix) {
		case 'DE': return [`DE${d}`, `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`];
		case 'BE': return [`BE0${d}`, `0${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`];
		case 'IE': return [`IE${d.slice(0, 7)}${pick(r, ['T', 'W', 'H', 'L'])}`, `${d.slice(0, 7)} ${pick(r, ['T', 'W', 'H', 'L'])}`];
		case 'FR': return [`FR${d}${d.slice(0, 2)}`, `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 8)} ${d.slice(8)}${d.slice(0, 2)}`];
		case 'AT': return [`ATU${d.slice(0, 8)}`, `U ${d.slice(0, 8)}`];
		case 'NL': return [`NL${d}B0${int(r, 1, 3)}`, `${d}B0${int(r, 1, 3)}`];
		default: return [`GB${d}`, `${d.slice(0, 3)} ${d.slice(3, 7)} ${d.slice(7)}`];
	}
};
const invoiceNumber = (ms: number, index: number) => {
	const y = utc(ms).getUTCFullYear();
	const n = 1000 + Math.floor((ms - Date.UTC(y, 0, 1)) / DAY) * 41 + (index % 41);
	return { id: `inv_${n}`, no: `PW-${y}-${String(n).padStart(5, '0')}`, n: String(n) };
};

// ---------------------------------------------------------------------------------------------------------
// One ticket.
const ticket = (index: number, attempt: number) => {
	const r = mulberry32(0x9e11f00d + index * 104729 + attempt * 7919);
	const openDay = openDays[Math.floor((index * openDays.length) / ITEMS)]!;
	const main = deck[index]!;
	let outcome = pick(r, ['resolved', 'resolved', 'resolved', 'owe', 'owe', 'act', 'act', 'team', 'team', 'quiet', 'quiet'] as Outcome[]);
	const viaTeam = (outcome === 'resolved' || outcome === 'act') && chance(r, 0.3);
	const early = outcome === 'quiet' && chance(r, 0.3);
	const partial = outcome === 'team' || outcome === 'quiet' || viaTeam;
	const channel = pick(r, ['email', 'email', 'email', 'web form', 'web form', 'chat']);

	// Other matters the customer raises: a quick question, and up to two smaller matters discussed in full.
	const facts = new Set<Facet>(main.facets);
	const used = new Set<Topic>([main]);
	const takeSide = (asserts: boolean) => {
		const options = topics.filter((topic) => ![...used].some((other) => other.area === topic.area) && !clashes(facts, topic.facets) && !topic.ended && !(topic.age && [...used].some((other) => other.age)));
		const topic = pick(r, options);
		used.add(topic);
		if (asserts) topic.facets.forEach((facet) => facts.add(facet));
		return topic;
	};
	const quick = chance(r, 0.55) ? takeSide(false) : undefined;
	const fulls = early ? [] : Array.from({ length: partial ? pick(r, [1, 1, 2, 2]) : pick(r, [0, 1, 1, 2, 2, 3]) }, () => takeSide(true));
	const sidesEarly = partial || chance(r, 0.4);
	const has = (facet: Facet) => facts.has(facet);
	const timing = [main, ...fulls].find((topic) => topic.age);

	// The account.
	const countryPool = countries.filter((c) => (has('eu') ? c.eu : true) && (has('nonen') ? c.lang : true) && (has('euro') ? c.cur === 'EUR' : true));
	const country = has('eu') || has('nonen') || has('euro') ? pick(r, countryPool) : pick(r, [countries[0]!, countries[0]!, countries[1]!, countries[1]!, countries[2]!, countries[3]!, countries[4]!, countries[5]!, countries[6]!, countries[6]!]);
	const town = pick(r, country.towns);
	const curCode = country.cur;
	const P = PRICES[curCode];
	const plan: 'Team' | 'Business' = has('team') ? 'Team' : has('business') ? 'Business' : chance(r, 0.7) ? 'Team' : 'Business';
	const cycle = has('monthly') ? 'monthly' : has('annual') || has('dd') ? 'annual' : chance(r, 0.78) ? 'monthly' : 'annual';
	const method = has('card') ? 'card' : has('transfer') ? 'transfer' : has('dd') ? 'dd' : cycle === 'annual' ? pick(r, ['card', 'card', 'transfer', 'dd']) : chance(r, 0.85) ? 'card' : 'transfer';
	const taxOnFile = country.eu ? (has('notaxid') ? false : has('taxid') ? true : chance(r, 0.75)) : chance(r, 0.7);
	const included = INCLUDED[plan];
	const added = has('grew') ? int(r, 2, 4) : 0;
	const span = main.seats ?? [plan === 'Team' ? 3 : 8, plan === 'Team' ? 14 : 30];
	const idle = main.seats ? 0 : has('idle') ? int(r, 2, 5) : chance(r, 0.25) ? int(r, 1, 2) : 0;
	const seats = has('grew') ? included + added + int(r, 0, 6) : int(r, span[0], span[1]) + idle;
	const active = seats - idle;
	const seatP = plan === 'Team' ? P.seatTeam : P.seatBusiness;
	const netFor = (n: number, p = plan) => PRICES[curCode][p] + Math.max(0, n - INCLUDED[p]) * (p === 'Team' ? P.seatTeam : P.seatBusiness);
	const netMonthly = netFor(seats);
	const vatRate = country.name === 'Netherlands' ? 21 : country.eu ? (taxOnFile ? 0 : country.vat) : 0;
	const withVat = (c: number) => c + Math.round((c * vatRate) / 100);
	const mult = cycle === 'annual' ? 10 : 1;
	const totalC = withVat(netMonthly * mult);
	const m = (c: number) => money(curCode, c);
	const [taxId, taxBad] = vatNumber(r, country);

	// Dates.
	let invMs: number;
	let renewMs: number;
	let effectiveMs = 0;
	if (main.ended) {
		effectiveMs = midnight(openDay - int(r, 4, 24) * DAY);
		renewMs = effectiveMs;
		invMs = addMonths(renewMs, cycle === 'monthly' ? -1 : -12);
	} else if (cycle === 'monthly') {
		if (timing?.age) invMs = midnight(openDay - int(r, timing.age[0], timing.age[1]) * DAY);
		else if (has('recent')) invMs = midnight(openDay - int(r, 2, 9) * DAY);
		else invMs = midnight(openDay - int(r, 2, 20) * DAY);
		renewMs = addMonths(invMs, 1);
	} else if (has('renewing')) {
		renewMs = midnight(openDay + int(r, 8, 35) * DAY);
		invMs = addMonths(renewMs, -12);
	} else if (has('recent')) {
		invMs = midnight(openDay - int(r, 2, 9) * DAY);
		renewMs = addMonths(invMs, 12);
	} else {
		renewMs = midnight(openDay + int(r, 20, 330) * DAY);
		invMs = addMonths(renewMs, -12);
	}
	const prevMs = addMonths(invMs, cycle === 'monthly' || has('recent') ? -1 : -12);
	const ageDays = Math.round((openDay - invMs) / DAY);
	const state = has('open') ? 'open' : has('paid') ? 'paid' : method === 'transfer' && ageDays < 14 ? 'open' : 'paid';
	const paidMs = method === 'transfer' ? weekdayOnOrAfter(invMs + int(r, 2, 6) * DAY) : invMs;
	const openMs = openDay + int(r, 8 * 60, 19 * 60) * MIN;
	const inv = invoiceNumber(invMs, index);
	const prev = invoiceNumber(prevMs, index + 7);
	const sinceMs = main.subjects[0] === 'Charged after our trial' ? invMs - 14 * DAY : addMonths(invMs, cycle === 'monthly' ? -int(r, 5, 30) : -12 * int(r, 1, 2));
	const trialStartMs = main.subjects[0] === 'Charged after our trial' ? invMs - 14 * DAY : openDay - int(r, 70, 200) * DAY;
	const trialLastMs = trialStartMs + int(r, 2, 9) * DAY;
	const ownerLeftMs = openDay - int(r, 45, 120) * DAY;
	const upMs = prevMs + int(r, 5, Math.max(5, Math.round((invMs - prevMs) / DAY) - 4)) * DAY;
	const periodDays = Math.round((invMs - prevMs) / DAY);
	const upDays = Math.round((invMs - upMs) / DAY);
	const upNew = Math.round((netFor(seats, 'Business') * upDays) / periodDays);
	const upCredit = -Math.round((netFor(seats, 'Team') * upDays) / periodDays);
	const removed = int(r, 2, 3);
	const removedMs = invMs + int(r, 3, Math.max(3, ageDays - 3)) * DAY;
	const creditC = Math.round((removed * seatP * Math.round((renewMs - removedMs) / DAY)) / Math.round((renewMs - invMs) / DAY));
	const refundMs = midnight(openDay - int(r, Math.min(9, ageDays - 2), Math.max(9, ageDays - 2)) * DAY);
	const cancelMs = invMs - int(r, 3, 12) * DAY;
	const refund = pick(r, [[2 * seatP, 'Two unused seats'], [seatP, 'One unused seat'], [Math.round(netMonthly / 2), 'Goodwill credit after a service interruption'], [netMonthly, 'Unused part of the period']] as const);
	if (!main.ended) effectiveMs = renewMs;
	const lastSeenBack = int(r, 2, 4);

	// Who.
	const female = chance(r, 0.5);
	const first = pick(r, female ? firstF : firstM);
	const last = pick(r, surnames);
	const head = pick(r, heads);
	const co = `${head} ${pick(r, tails)}`;
	const slug = co.toLowerCase().replace(/[^a-z]+/g, '');
	const domain = `${slug}.example`;
	const notOwner = has('notowner') || chance(r, 0.2);
	const ownerFirst = notOwner ? pick(r, [...firstF, ...firstM].filter((name) => name !== first)) : first;
	const ownerName = notOwner ? `${ownerFirst} ${pick(r, surnames)}` : `${first} ${last}`;
	const memberFirst = pick(r, firstF.filter((name) => name !== first && name !== ownerFirst));
	const agent = pick(r, agents);
	const apEmail = `${pick(r, ['accounts', 'finance', 'invoices', 'ap', 'admin', 'bookkeeping'])}@${domain}`;
	const card4 = String(int(r, 1000, 9999));
	const expMs = addMonths(invMs, -1);
	const s: Slots = {
		first,
		last,
		full: `${first} ${last}`,
		email: `${first.toLowerCase()}@${domain}`,
		title: pick(r, titles),
		co,
		head,
		domain,
		country: country.name,
		town,
		prefix: country.prefix,
		lang: country.lang ?? 'English',
		bank: pick(r, country.banks),
		iban4: String(int(r, 1000, 9999)),
		cur: curCode,
		agent,
		team: main.team,
		mate: teamPeople[main.team]!,
		teamShort: main.team.replace(/^the /, ''),
		cus: `cus_${int(r, 1000, 9999)}`,
		sub: `sub_${int(r, 100, 999)}`,
		plan,
		cycle,
		seats: String(seats),
		used: String(active),
		idle: String(seats - active),
		included: String(included),
		extra: String(Math.max(0, seats - included)),
		base: m(P[plan]),
		seatPrice: m(seatP),
		net: m(netMonthly),
		total: m(totalC),
		totalCode: coded(curCode, totalC),
		totalCents: String(totalC),
		vatRate: String(vatRate),
		countryVat: String(country.vat),
		vatShort: vatRate > 0 ? `${vatRate}%, ${m(withVat(netMonthly * mult) - netMonthly * mult)}` : country.eu ? 'reverse charge' : country.name === 'Netherlands' ? '21%' : 'none',
		vatShown: taxOnFile ? taxId : has('badtaxid') ? `${taxBad} (check failed)` : 'none on file',
		vatInvoiceLine: country.eu && taxOnFile ? `VAT 0%, reverse charge (Article 196, Directive 2006/112/EC)` : vatRate > 0 ? `VAT ${vatRate}%${country.name === 'Netherlands' ? '' : ` (${country.name})`}                          ${coded(curCode, withVat(netMonthly * mult) - netMonthly * mult)}` : `No VAT: service outside the scope of Dutch VAT`,
		taxId,
		taxBad,
		periodLabel: cycle === 'monthly' ? `${dayMonth(invMs)} to ${dayMonth(renewMs - DAY)}` : `${short(invMs)} to ${short(renewMs - DAY)}`,
		baseCode: coded(curCode, P[plan] * mult),
		extraCode: coded(curCode, Math.max(0, seats - included) * seatP * mult),
		netCode: coded(curCode, netMonthly * mult),
		method,
		state,
		brand: pick(r, brands),
		card4,
		methodLabel: method === 'card' ? '' : method === 'transfer' ? 'bank transfer' : 'SEPA direct debit',
		exp: `${pad(utc(expMs).getUTCMonth() + 1)}/${String(utc(expMs).getUTCFullYear()).slice(2)}`,
		retryDate: fullDay(invMs + 7 * DAY),
		invMs: String(invMs),
		invNo: inv.no,
		invNum: inv.n,
		invDate: dayMonth(invMs),
		month: MONL[utc(invMs).getUTCMonth()]!,
		prevInvNo: prev.no,
		nextInv: dayMonth(renewMs),
		renewDate: dayMonth(renewMs),
		paidMs: String(paidMs),
		paidDate: dayMonth(paidMs),
		paidDate2: dayMonth(weekdayOnOrAfter(paidMs + DAY)),
		fee: m(int(r, 4, 15) * 100),
		openMs: String(openMs),
		recentDate: dayMonth(openDay - int(r, 0, 2) * DAY),
		changedDate: dayMonth(openDay - int(r, 5, 9) * DAY),
		nowMs: String(openMs),
		nowDate: dayMonth(openMs),
		nowClock: clock(openMs),
		since: short(sinceMs),
		sinceMonth: `${MONL[utc(sinceMs).getUTCMonth()]} ${utc(sinceMs).getUTCFullYear()}`,
		product: pick(r, products),
		address: `${pick(r, country.streets)}, ${town}`,
		oldName: `${first} ${last} ${pick(r, ['Design', 'Consulting', 'Studio', 'Advisory'])}`,
		po: `PO-2026-${int(r, 1000, 9999)}`,
		poCap: m(Math.ceil((withVat(netMonthly) * 12 * 1.6) / 50000) * 50000),
		apEmail,
		lastSeen: dayMonth(addMonths(invMs, -lastSeenBack)),
		count: String(lastSeenBack),
		memberFirst,
		member: `${memberFirst} ${pick(r, surnames)}`,
		memberEmail: `${memberFirst.toLowerCase()}@${domain}`,
		ownerFirst,
		ownerName,
		ownerEmail: `${ownerFirst.toLowerCase()}@${domain}`,
		requesterRole: notOwner ? `Owner is ${ownerName}; ${first} is an admin, so can't open Billing settings.` : `${first} is the owner, so can change Billing settings directly.`,
		ownerAnswer: notOwner ? `${ownerFirst} is the owner; they've asked me to deal with it.` : `Yes, I'm the owner.`,
		ownerLeftMs: String(ownerLeftMs),
		leftMonth: MONL[utc(ownerLeftMs).getUTCMonth()]!,
		director: `${pick(r, directors)} ${pick(r, surnames)}`,
		ws: head,
		ws2: pick(r, ['Client test', `${head} sandbox`, 'Pitch workspace', 'Test - do not use', 'Project trial']),
		dupNo: invoiceNumber(invMs + int(r, 1, 6) * DAY, index + 19).no,
		dupTotal: m(withVat(P.Team)),
		trialStartMs: String(trialStartMs),
		trialStart: dayMonth(trialStartMs),
		trialLastMs: String(trialLastMs),
		trialLast: dayMonth(trialLastMs),
		prevTotal: m(withVat(netFor(seats - added) * mult)),
		added: String(added),
		addedDate: dayMonth(prevMs + int(r, 2, Math.max(2, Math.round((invMs - prevMs) / DAY) - 2)) * DAY),
		usedGuess: String(Math.max(2, active - added + int(r, 0, 1))),
		project: pick(r, projects),
		upDate: dayMonth(upMs),
		upEnd: dayMonth(invMs),
		upNo: invoiceNumber(upMs, index + 3).no,
		upNew: m(upNew),
		upCredit: m(upCredit),
		upNet: m(upNew + upCredit),
		upNetMoney: m(withVat(upNew + upCredit)),
		teamIncluded: String(INCLUDED.Team),
		teamSeat: m(P.seatTeam),
		teamNet: m(netFor(active, 'Team')),
		annualBase: m(P[plan] * 10),
		annualExtra: m(Math.max(0, seats - included) * seatP * 10),
		annualNet: m(netMonthly * 10),
		annualTotal: m(withVat(netMonthly * 10)),
		annualReduced: m(netFor(active) * 10),
		monthlyTotal: m(withVat(netMonthly)),
		charity: pick(r, charities),
		charityNo: `${int(r, 100000, 999999)}${int(r, 0, 9)}`,
		removed: String(removed),
		removedDate: dayMonth(removedMs),
		credit: m(creditC),
		refundDate: dayMonth(refundMs),
		refundAmt: m(withVat(refund[0])),
		arn: Array.from({ length: 23 }, () => String(int(r, 0, 9))).join(''),
		creditReason: refund[1],
		cancelDate: dayMonth(main.ended ? effectiveMs - int(r, 10, 40) * DAY : main.subjects[0] === 'Charged after cancelling' ? cancelMs : openDay - int(r, 0, 3) * DAY),
		effective: dayMonth(effectiveMs),
		dataUntil: dayMonth(effectiveMs + 30 * DAY),
		sinceInv: dayMonth(addMonths(invMs, -int(r, 3, 8))),
		payroll: pick(r, payrolls[country.prefix] ?? payrolls.GB!),
		time: clock(openMs - int(r, 60, 150) * MIN),
		day: pick(r, weekdays),
		when: pick(r, whens),
		mon: MON[utc(invMs).getUTCMonth()]!.toUpperCase(),
		need: ''
	};
	s.methodLabel = method === 'card' ? `${s.brand} ending ${card4}` : s.methodLabel!;
	const fill = (text: string): string =>
		text.replace(/\{(\w+)\}/g, (_, key: string) => {
			const value = s[key];
			if (value === undefined) throw new Error(`no slot ${key} in "${text.slice(0, 60)}"`);
			return value;
		});
	s.ref = fill(pick(r, refs));
	s.need = fill(main.need);

	// The conversation, as a list of messages.
	const items: Item[] = [];
	let carry: string[] = [];
	const c = (paras: string[], art?: () => string) => {
		items.push({ who: 'c', paras: [...carry, ...paras], art });
		carry = [];
	};
	const a = (paras: string[], art?: () => string, wait?: 'long') => items.push({ who: 'a', paras, art, wait });
	const artOf = (pair: Turn) => (pair[2] ? () => pair[2]!(r, s) : undefined);
	const turn = (pair: Turn, extra?: [string, string]) => {
		const inAnswer = pair[3] === 'a';
		c([...(!carry.length && chance(r, 0.3) ? [pick(r, custAcks)] : []), pair[0], ...(extra ? [`Separately, ${lowerFirst(extra[0])}`] : [])], inAnswer ? undefined : artOf(pair));
		a(extra ? [pair[1], `On your other question: ${extra[1]}`] : [pair[1]], inAnswer ? artOf(pair) : undefined);
	};
	// A smaller matter, from the customer's first words about it to its answer; the customer's next message then
	// starts by saying it is sorted.
	const sides = () =>
		fulls.forEach((topic, position) => {
			const lead =
				position === 0
					? pick(r, [`Let me check on that and come back to you. In the meantime, something else:`, `I need to ask a colleague about that, so give me a day. Meanwhile, a different question:`, `I'll come back to you on that. While I'm writing, one more thing:`])
					: pick(r, [`Another thing while I'm writing.`, `Next question, if that's all right:`, `Something else has come up as well.`]);
			c([lead, pick(r, topic.open)]);
			a([topic.reply]);
			const steps = chance(r, 0.5) ? 3 : 2;
			topic.turns.slice(0, steps).forEach((pair) => turn(pair));
			carry = [pick(r, topic.fixed)];
		});
	const opening = [...(chance(r, 0.5) ? [pick(r, backstories)] : []), pick(r, main.open)];
	let quickUsed = !quick;
	if (quick && chance(r, 0.4)) {
		quickUsed = true;
		if (chance(r, 0.5)) {
			c([`Two things, if I may. First a quick one: ${quick.quick[0]}`, `And the main one:`, ...opening]);
			a([`On the quick one: ${quick.quick[1]}`, `On the main one: ${main.reply}`]);
		} else {
			c([quick.quick[0]]);
			a([quick.quick[1]]);
			c([pick(r, [`Thanks! While I have you, the real reason I wrote:`, `Great, thanks. The other thing, and really why I got in touch:`, `Perfect. Now the thing that's actually been bothering me.`]), ...opening]);
			a([main.reply]);
		}
	} else {
		c(opening);
		a([...(!/^(Thanks|Thank you|Sorry)/.test(main.reply) && chance(r, 0.6) ? [pick(r, agentIntros)] : []), main.reply]);
	}
	if (chance(r, 0.35)) items.push({ who: 'note', paras: [pick(r, notes)] });

	const [given, cause, ...rest] = main.turns;
	if (early) {
		items.push({ who: 'a', paras: [pick(r, nudgesEarly)], wait: 'long' });
		if (chance(r, 0.6)) items.push({ who: 'a', paras: [pick(r, nudges2)], wait: 'long' });
	} else {
		if (sidesEarly) sides();
		turn(given!, !quickUsed && chance(r, 0.7) ? quick!.quick : undefined);
		quickUsed = true;
		if (!partial) {
			if (!sidesEarly) sides();
			if (chance(r, 0.3)) {
				c([cause![0]], cause![3] === 'a' ? undefined : artOf(cause!));
				a([pick(r, holdings)]);
				a([cause![1]], cause![3] === 'a' ? artOf(cause!) : undefined, 'long');
			} else turn(cause!);
			if (chance(r, 0.35)) {
				c([rest[0]![0], rest[1]![0]]);
				a([rest[0]![1], rest[1]![1]]);
			} else rest.forEach((pair) => turn(pair));
		}
		const handOver = () => {
			items.push({ who: 'note', paras: [`Passing to ${main.team}: ${main.handover}`] });
			a([pick(r, passLines)]);
		};
		const mateFinds = () =>
			items.push({ who: 'mate', paras: [`Hi {first}, {mate} from {team} here.`, `I've looked into this, and ${main.cause}.${main.mateFix ? ` ${main.mateFix}` : ''} From here, you'll need to ${main.act}.`], wait: 'long' });
		if (outcome === 'resolved') {
			if (viaTeam) {
				handOver();
				mateFinds();
			}
			c([pick(r, main.fixed)]);
			if (chance(r, 0.6)) a([pick(r, closings)]);
		} else if (outcome === 'owe') {
			c([...(carry.length || chance(r, 0.5) ? [] : [pick(r, [`Thanks, that all makes sense.`, `Good, that answers most of it.`, `Thanks for going through it.`])]), main.follow]);
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
	}
	if (carry.length) throw new Error(`ticket ${index}: a side matter was left unanswered`);

	// Times. Customers write at any hour from 07:00; billing answers on weekdays, 08:00 to 18:00. Late tickets get
	// shorter gaps, so that every conversation ends before the export.
	const schedule = (scale: number): number[] => {
		const rt = mulberry32(0x5c4ed + index * 7907 + attempt * 31);
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
					now += gap(15, 1300) * MIN;
					if (utc(now).getUTCHours() < 7) now += 7 * HOUR;
				} else if (item.who === 'note') now += int(rt, 2, 25) * MIN;
				else {
					now += gap(10, 300) * MIN;
					workHours();
				}
			}
			return now;
		});
	};
	let times = schedule(1);
	// A conversation that talks about the next invoice ends before it is issued.
	const deadline = Math.min(EXPORT - 6 * HOUR, renewMs > openMs ? renewMs + 6 * HOUR : EXPORT);
	for (const scale of [0.6, 0.4, 0.25, 0.15, 0.08]) if (times.at(-1)! >= deadline) times = schedule(scale);
	if (renewMs > openMs && items.some((item, position) => times[position]! > renewMs && item.paras.some((para) => /\{(nextInv|renewDate|effective)\}/.test(para)))) return undefined;

	let chatUntil = 0;
	if (channel === 'chat') {
		chatUntil = Math.min(items.length, 2 + 2 * int(r, 1, 2));
		while (chatUntil > 0 && (items[chatUntil - 1]!.who !== 'a' || items.slice(0, chatUntil).some((item) => item.who === 'note' || item.who === 'mate' || item.wait))) chatUntil--;
	}

	// The file.
	const out: string[] = [];
	const subjectFrom = quick && quickUsed && chance(r, 0.15) ? quick : fulls.length && chance(r, 0.12) ? fulls[0]! : undefined;
	const subject = subjectFrom ? pick(r, subjectFrom.subjects) : chance(r, 0.2) ? pick(r, vagueSubjects) : pick(r, main.subjects);
	const number = 30210 + index * 5 + int(r, 0, 4);
	const contacts = has('ownergone') ? [s.ownerEmail!] : [s.ownerEmail!, ...(chance(r, 0.4) ? [apEmail] : []), ...(notOwner && chance(r, 0.5) ? [s.email!] : [])];
	out.push(`# Ticket ${number}: ${fill(subject)}`, '');
	out.push(
		table(
			['', ''],
			[
				['Opened', `${stamp(openMs)}, by ${channel}`],
				['From', `${s.full} <${s.email}>`],
				['Company', `${co}, ${s.town}, ${country.name}`],
				['Customer', `${s.cus}, since ${s.sinceMonth}`],
				['Plan', `${plan}, ${cycle}, ${seats} seats${main.ended ? `, ended ${s.effective}` : ''}`],
				['Payment method', method === 'card' ? `${s.brand} ending ${card4}` : method === 'transfer' ? 'Bank transfer' : 'SEPA direct debit'],
				['VAT number', s.vatShown!],
				['Billing contacts', contacts.join(', ')],
				['Owner', notOwner ? ownerName : `${ownerName} (the requester)`]
			]
		),
		''
	);
	const special = ['Charge when we upgraded', 'Charged after our trial', 'Charged for a whole year by mistake'].includes(main.subjects[0]!);
	if (!special && chance(r, 0.7)) {
		const back = cycle === 'monthly' ? int(r, 2, 4) : 1;
		const rows = Array.from({ length: back + 1 }, (_, i) => back - i).map((k) => {
			const at = addMonths(invMs, cycle === 'monthly' ? -k : -12 * k);
			const number = k === 0 ? inv : invoiceNumber(at, index + 7 * k);
			const amount = k === 0 ? totalC : withVat(netFor(seats - added) * mult);
			return [number.id, number.no, short(at), coded(curCode, amount), k === 0 ? state : 'paid'];
		});
		out.push('### Invoices, from the billing app', '', table(['Invoice', 'Number', 'Issued', 'Amount due', 'Status'], rows), '');
	}
	if (!special && state === 'paid' && method !== 'transfer' && main.area !== 'refunds and credits' && chance(r, 0.35)) {
		const rows = [2, 1, 0].map((k) => {
			const at = addMonths(invMs, cycle === 'monthly' ? -k : -12 * k);
			return [`${short(at)} 06:${pad(int(r, 0, 30))}`, s.methodLabel!, coded(curCode, k === 0 ? totalC : withVat(netFor(seats - added) * mult)), invoiceNumber(at, k === 0 ? index : index + 7 * k).no, 'Succeeded'];
		});
		out.push('### Payments in Quillpay', '', table(['Taken', 'Method', 'Amount', 'For', 'Result'], rows), '');
	}
	if (!special && chance(r, 0.4)) {
		const room = Math.max(2, Math.round((openDay - 45 * DAY - sinceMs) / DAY));
		const when = () => sinceMs + int(r, 1, room) * DAY;
		const events: [number, string][] = [[sinceMs, `Workspace "${head}" created, ${plan} plan, ${cycle}`]];
		if (method === 'card' && chance(r, 0.6)) events.push([when(), `Card changed to ${s.brand} ending ${card4}`]);
		if (contacts.includes(apEmail)) events.push([when(), `Billing contact ${apEmail} added`]);
		if (taxOnFile) events.push([when(), `VAT number ${taxId} added, check passed`]);
		if (!has('grew') && seats > 3 && chance(r, 0.5)) events.push([when(), `Seats changed from ${seats - int(r, 1, 3)} to ${seats}`]);
		if (chance(r, 0.4)) events.push([when(), `Invoice email setting changed to "receipt after payment"`]);
		if (chance(r, 0.3)) events.push([when(), `${s.member} made admin`]);
		events.sort((x, y) => x[0] - y[0]);
		out.push('### Account history, from the billing app', '', table(['Date', 'Change'], events.map(([at, what]) => [short(at), what])), '');
	}
	if (chance(r, 0.35)) {
		const earlier = shuffle(r, topics.filter((topic) => !used.has(topic))).slice(0, int(r, 1, 3));
		const rows = earlier
			.map((topic) => [openDay - int(r, 20, 300) * DAY, topic] as const)
			.sort((x, y) => x[0] - y[0])
			.map(([at, topic]) => [String(number - Math.round(((openDay - at) / DAY) * 28) - int(r, 0, 20)), short(at), fill(pick(r, topic.subjects)), pick(r, agents)]);
		out.push('### Earlier tickets from this customer', '', table(['Ticket', 'Opened', 'Subject', 'Handled by'], rows), '');
	}
	out.push('## Conversation', '');
	if (chatUntil > 0) {
		out.push(`### Chat with ${agent} · ${stamp(times[0]!)}`, '');
		const lines: string[] = [];
		items.slice(0, chatUntil).forEach((item, position) => {
			const who = item.who === 'c' ? first : agent;
			const at = clock(times[0]! + (position * 3 + int(r, 0, 2)) * MIN);
			if (position === 1) lines.push(`**${at} ${agent}:** ${fill(pick(r, chatHellos))}`);
			item.paras.forEach((para) => lines.push(`**${at} ${who}:** ${fill(para)}`));
			if (item.art) lines.push(item.art());
		});
		if (chatUntil < items.length) lines.push(`**${clock(times[0]! + (chatUntil * 3 + 2) * MIN)} ${agent}:** ${fill(pick(r, chatHandoffs))}`);
		out.push(lines.join('\n\n'), '');
		const shift = times[0]! + (chatUntil * 3 + 10) * MIN;
		for (let position = chatUntil; position < times.length; position++) if (times[position]! < shift + position * MIN) times[position] = shift + position * MIN;
	}
	let previousAgent = '';
	let agentSpoke = chatUntil > 0;
	items.slice(chatUntil).forEach((item, offset) => {
		const position = chatUntil + offset;
		const at = times[position]!;
		Object.assign(s, { nowMs: String(at), nowDate: dayMonth(at), nowClock: clock(at - int(r, 5, 40) * MIN), day: WDL[utc(weekdayOnOrAfter(at + 2 * DAY)).getUTCDay()]! });
		const body: string[] = [];
		if (item.who === 'c') {
			out.push(`### ${s.full} · ${stamp(at)}`, '');
			const greeting = fill(pick(r, position === 0 ? (utc(at).getUTCHours() < 12 ? [...firstGreetings, 'Good morning,'] : firstGreetings) : replyGreetings));
			if (greeting) body.push(greeting);
			const quoted = previousAgent.split(/(?<=[.?!])\s/).find((sentence) => sentence.length > 40);
			if (quoted && chance(r, 0.15)) body.push(`> ${quoted}`);
			body.push(...item.paras.map(fill));
			if (item.art) body.push(item.art());
			const signoff = fill(pick(r, position === 0 ? custSignoffs : replySignoffs));
			if (signoff) body.push(signoff);
		} else if (item.who === 'a') {
			out.push(`### ${agent} (Pennywren Billing) · ${stamp(at)}`, '');
			const afterCustomer = items[position - 1]?.who === 'c';
			const plain = !afterCustomer || /^(Thanks|Thank you)/.test(item.paras[0]!);
			body.push(fill(pick(r, !agentSpoke ? (plain ? ['Hi {first},', 'Hello {first},', 'Dear {first},'] : agentGreetings) : plain ? ['Hi {first},', 'Hello {first},'] : agentGreetingsLater)), ...item.paras.map(fill));
			if (item.art) body.push(item.art());
			body.push(fill(pick(r, agentSignoffs)));
			previousAgent = fill([...item.paras].sort((x, y) => y.length - x.length)[0]!);
			agentSpoke = true;
		} else if (item.who === 'note') {
			out.push(`### Internal note by ${agent} · ${stamp(at)}`, '');
			body.push(...item.paras.map(fill));
		} else {
			out.push(`### ${s.mate} (Pennywren, ${s.teamShort}) · ${stamp(at)}`, '');
			body.push(...item.paras.map(fill), s.mate!);
			previousAgent = '';
		}
		out.push(body.join('\n\n'), '');
	});
	const final = times.at(-1)!;
	if (final >= EXPORT) throw new Error(`ticket ${number} runs past the export: ${stamp(final)}`);
	return { name: `${number}.md`, text: out.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n' };
};

const folder = join(root, 'support', 'billing-desk');
mkdirSync(folder, { recursive: true });
for (let index = 0; index < ITEMS; index++) {
	let made = ticket(index, 0);
	for (let attempt = 1; !made; attempt++) {
		if (attempt > 50) throw new Error(`ticket ${index}: no version ends before its next invoice`);
		made = ticket(index, attempt);
	}
	writeFileSync(join(folder, made.name), made.text);
}
writeFileSync(
	join(folder, 'README.md'),
	`# Billing desk tickets\n\nThe ${ITEMS} tickets Pennywren's billing desk handled between 1 September and 30 October 2026, one file each, as the\nhelp desk exported them on 13 November. Each file holds the account panel the desk saw when the ticket came in and\nthe whole conversation, chats included, with internal notes and replies from other teams. The export does not keep\nthe help desk's tags or statuses.\n`
);
