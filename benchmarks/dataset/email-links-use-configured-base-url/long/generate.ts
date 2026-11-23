// Writes the long material of this entry's long tasks: the tickets Plover Rota's support desk handled between
// 5 October and 13 November 2026, one Markdown file each, under docs/support-tickets/, as the help desk exported
// them, without tags or statuses. Deterministic: fixed seeds, no clock, no network.
//   bun long/generate.ts <workspace root>
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** How many tickets to write. Dates, numbers and the share of each topic all follow from it. */
const ITEMS = 185;

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
/** A stable number for a name, so that a business keeps its size and its team numbers from ticket to ticket. */
const hash = (text: string) => [...text].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);
const cap = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const pad = (value: number) => String(value).padStart(2, '0');
const money = (pounds: number) => `£${pounds.toFixed(2).replace(/\B(?=(\d{3})+\.)/g, ',')}`;

// Time is kept in minutes since 00:00 on 1 October 2026, UK local time.
const EPOCH = Date.UTC(2026, 9, 1);
const LAST_MESSAGE = 50 * 1440 + 17 * 60; // 20 November, 17:00
const at = (minutes: number) => new Date(EPOCH + minutes * 60000);
const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const weekday = (minutes: number) => dayNames[at(minutes).getUTCDay()]!;
const clock = (minutes: number) => `${pad(at(minutes).getUTCHours())}:${pad(at(minutes).getUTCMinutes())}`;
const shortDate = (d: Date) => `${d.getUTCDate()} ${monthNames[d.getUTCMonth()]!.slice(0, 3)} ${d.getUTCFullYear()}`;
const longDate = (d: Date) => `${d.getUTCDate()} ${monthNames[d.getUTCMonth()]!} ${d.getUTCFullYear()}`;
const stampShort = (minutes: number) => `${weekday(minutes).slice(0, 3)} ${at(minutes).getUTCDate()} ${monthNames[at(minutes).getUTCMonth()]!.slice(0, 3)}, ${clock(minutes)}`;
const stampLong = (minutes: number) => `${weekday(minutes)} ${longDate(at(minutes))}, ${clock(minutes)}`;
const iso = (minutes: number) => at(minutes).toISOString().slice(0, 10);
const ordinal = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th'}`;
const isWeekend = (minutes: number) => at(minutes).getUTCDay() % 6 === 0;
const minuteOfDay = (minutes: number) => ((minutes % 1440) + 1440) % 1440;
const startOfDay = (minutes: number) => minutes - minuteOfDay(minutes);
/** The next weekday at or after `minutes`, as a weekday name. */
const weekdayFrom = (minutes: number) => {
	let m = minutes;
	while (isWeekend(m)) m += 1440;
	return weekday(m);
};

// People at Plover Rota.
const agents = ['Sam', 'Ffion', 'Devika', 'Lucia', 'Mateo'];
const webTeam = ['Rhiannon Kerr', 'Tomasz Wilk', 'Joel Mensah'];
const plannerTeam = ['Hana Sato', 'Brendan Moyo'];
const billing = 'Olu Adeyemi';
const dataLead = 'Grace Ellison';

// Customers: small teams that plan shift rotas.
interface Kind {
	kind: string;
	names: string[];
	teams: string[];
	intro: string[];
	shifts: string[];
	roles: string[];
}
const kinds: Kind[] = [
	{ kind: 'care home', names: ['Larkrise House', 'Elm Lodge', 'Fernlea Court'], teams: ['Days', 'Nights', 'Weekend nurses', 'Kitchen', 'Activities'], intro: ['We are a residential care home with {N} staff over three shifts, and nights are always the hardest to fill.', 'We have {N} carers, nurses and kitchen staff, and the rota changes every week because of agency cover.'], shifts: ['07:30–15:00', '14:30–22:00', '21:45–07:45', '08:00–20:00'], roles: ['Home Manager', 'Deputy Manager', 'Rota Coordinator'] },
	{ kind: 'café', names: ['The Copper Kettle', 'Beanstalk Café', 'Juniper & Rye'], teams: ['Floor', 'Kitchen', 'Weekend', 'Baristas'], intro: ['We are a busy café with {N} staff, most of them students who change their hours every term.', 'There are {N} of us across the kitchen and the floor, open seven days.'], shifts: ['07:00–15:00', '10:00–16:00', '11:30–19:00', '08:00–13:00'], roles: ['Owner', 'General Manager', 'Head Barista'] },
	{ kind: 'vets', names: ['Fernhill Veterinary Group', 'Saltmarsh Vets', 'Oakfield Animal Hospital'], teams: ['Reception', 'Nurses', 'Out of hours', 'Kennels'], intro: ['We are a mixed practice with {N} staff, including an out-of-hours rota that nobody wants.', 'We run two surgeries with {N} staff, and nurses move between them most weeks.'], shifts: ['08:00–18:00', '08:30–13:00', '13:00–19:00', '19:00–08:00'], roles: ['Practice Manager', 'Head Nurse', 'Office Manager'] },
	{ kind: 'dental practice', names: ['Harbour Dental Practice', 'Stonegate Dental', 'Brightside Dental Care'], teams: ['Reception', 'Nurses', 'Hygienists', 'Saturday clinic'], intro: ['We are a dental practice with {N} staff and one Saturday clinic a month.', 'We have {N} people between reception, nurses and hygienists.'], shifts: ['08:00–17:00', '08:30–13:30', '13:00–18:30', '09:00–13:00'], roles: ['Practice Manager', 'Reception Lead', 'Business Manager'] },
	{ kind: 'pub', names: ['The Red Lion', 'The Ship Inn', 'The Drovers Arms'], teams: ['Bar', 'Kitchen', 'Weekend bar', 'Events'], intro: ['We are a village pub with food, {N} staff, and a function room that throws the rota out whenever it is booked.', 'We have {N} staff between the bar and the kitchen, a lot of them part-time.'], shifts: ['11:00–17:00', '17:00–23:30', '12:00–22:00', '10:00–15:00'], roles: ['Landlord', 'General Manager', 'Assistant Manager'] },
	{ kind: 'bakery', names: ['Millrace Bakehouse', 'Crumb & Co', 'Northfield Bakery'], teams: ['Early bake', 'Shop', 'Packing', 'Deliveries'], intro: ['We are a bakery with two shops and {N} staff, and the bakers start at four.', 'There are {N} of us, bakers, shop staff and two drivers.'], shifts: ['04:00–12:00', '06:30–14:30', '08:00–16:00', '12:00–18:00'], roles: ['Owner', 'Operations Manager', 'Shop Manager'] },
	{ kind: 'warehouse', names: ['Northgate Fulfilment', 'Tideway Logistics', 'Brookside Distribution'], teams: ['Pick and pack', 'Goods in', 'Nights', 'Returns'], intro: ['We are a small fulfilment warehouse with {N} staff on three shifts.', 'We have {N} pickers, packers and drivers, and peak season starts in November.'], shifts: ['06:00–14:00', '14:00–22:00', '22:00–06:00', '08:00–16:30'], roles: ['Shift Manager', 'Operations Manager', 'HR Coordinator'] },
	{ kind: 'leisure pool', names: ['Tidewater Leisure Pool', 'Ashby Swim Centre', 'Riverside Lido'], teams: ['Lifeguards', 'Reception', 'Swim teachers', 'Cleaning'], intro: ['We run a public pool with {N} staff, and every session needs a minimum number of lifeguards on poolside.', 'We are a council-run pool with {N} staff, most on zero-hours contracts.'], shifts: ['06:30–13:00', '12:30–19:00', '16:00–21:30', '07:00–15:00'], roles: ['Duty Manager', 'Head Lifeguard', 'Centre Manager'] },
	{ kind: 'theatre', names: ['The Lyceum Studio', 'Castle Street Playhouse', 'The Old Fire Station Arts'], teams: ['Box office', 'Front of house', 'Bar', 'Technical'], intro: ['We are a small theatre with {N} staff and volunteers, and the rota follows the show calendar.', 'We have {N} people on box office, front of house and the bar.'], shifts: ['10:00–18:00', '17:30–23:00', '13:00–17:00', '18:00–22:30'], roles: ['Front of House Manager', 'General Manager', 'Box Office Manager'] },
	{ kind: 'hostel', names: ['Saltmarsh Hostel', 'The Wayfarer', 'Harbourside Hostel'], teams: ['Reception', 'Housekeeping', 'Night desk', 'Café'], intro: ['We are an independent hostel with {N} staff and a desk that is staffed around the clock.', 'There are {N} of us, plus volunteers in the summer.'], shifts: ['07:00–15:00', '15:00–23:00', '23:00–07:00', '10:00–14:00'], roles: ['Manager', 'Assistant Manager', 'Operations Lead'] },
	{ kind: 'GP surgery', names: ['Stonebridge Surgery', 'Elmfield Medical Centre', 'Kingsway Health Centre'], teams: ['Reception', 'Dispensary', 'Admin', 'Phlebotomy'], intro: ['We are a GP surgery with {N} non-clinical staff on the rota; the doctors have their own system.', 'We have {N} receptionists, dispensers and admin staff.'], shifts: ['08:00–13:00', '13:00–18:30', '08:00–16:00', '10:30–18:30'], roles: ['Practice Manager', 'Reception Manager', 'Office Manager'] },
	{ kind: 'bike shop', names: ['Wayland Cycles', 'Chainring Bikes', 'Two Rivers Cycle Co'], teams: ['Workshop', 'Shop floor', 'Hire', 'Saturdays'], intro: ['We are a bike shop and workshop with {N} staff, and the summer hire season doubles the rota.', 'There are {N} of us between the workshop and the shop.'], shifts: ['08:30–17:30', '09:00–13:00', '13:00–17:30', '10:00–16:00'], roles: ['Owner', 'Workshop Manager', 'Shop Manager'] },
	{ kind: 'library', names: ['Ashdown Library', 'Westgate Community Library', 'Millbrook Library'], teams: ['Counter', 'Saturday staff', 'Children’s library', 'Home delivery'], intro: ['We are a community library with {N} staff and volunteers.', 'We have {N} people across the counter, the children’s library and home delivery.'], shifts: ['09:00–13:00', '13:00–17:00', '09:30–17:30', '16:00–19:30'], roles: ['Library Manager', 'Senior Library Assistant', 'Volunteer Coordinator'] },
	{ kind: 'cinema', names: ['Kingfisher Picturehouse', 'The Electric', 'Regal Screens'], teams: ['Kiosk', 'Ushers', 'Projection', 'Café bar'], intro: ['We are an independent cinema with {N} staff, mostly evenings and weekends.', 'We have {N} people on the kiosk, the café bar and the screens.'], shifts: ['11:30–17:30', '17:00–23:30', '13:00–19:00', '18:00–00:30'], roles: ['Cinema Manager', 'Duty Manager', 'Operations Manager'] },
	{ kind: 'nursery', names: ['Little Acorns Nursery', 'Bluebell Day Nursery', 'Hilltop Nursery'], teams: ['Baby room', 'Toddlers', 'Pre-school', 'Kitchen'], intro: ['We are a day nursery with {N} staff, and every room has to keep its ratios.', 'We have {N} practitioners and a cook, open 7:30 to 6.'], shifts: ['07:30–16:00', '08:30–17:00', '09:30–18:00', '07:30–13:30'], roles: ['Nursery Manager', 'Deputy Manager', 'Room Leader'] },
	{ kind: 'climbing centre', names: ['Redcliffe Climbing Centre', 'The Crux Wall', 'Granite Works Climbing'], teams: ['Desk', 'Instructors', 'Route setters', 'Café'], intro: ['We are a climbing centre with {N} staff, and every session needs a qualified instructor on the floor.', 'There are {N} of us, desk staff, instructors and setters.'], shifts: ['09:00–15:00', '15:00–22:00', '10:00–18:00', '17:00–22:00'], roles: ['Centre Manager', 'Head Instructor', 'Duty Manager'] },
	{ kind: 'garden centre', names: ['Hollybank Garden Centre', 'Primrose Nurseries', 'Westfield Garden Centre'], teams: ['Tills', 'Plants', 'Café', 'Christmas shop'], intro: ['We are a family garden centre with {N} staff, and the Christmas shop opens in November.', 'We have {N} staff across the tills, the plant area and the café.'], shifts: ['08:30–17:00', '09:00–13:00', '13:00–17:30', '10:00–16:00'], roles: ['Owner', 'Store Manager', 'Café Manager'] },
	{ kind: 'home care agency', names: ['Pennine Care at Home', 'Riverside Home Care', 'Brook Lane Care'], teams: ['North round', 'South round', 'Nights', 'Office'], intro: ['We are a home care agency with {N} carers on rounds across the district.', 'We have {N} carers, and the rounds change whenever a client goes into hospital.'], shifts: ['07:00–14:00', '14:00–22:00', '22:00–07:00', '09:00–17:00'], roles: ['Registered Manager', 'Care Coordinator', 'Office Manager'] },
	{ kind: 'hotel', names: ['The Thistle Hotel', 'Castlegate House Hotel', 'The Quayside'], teams: ['Reception', 'Housekeeping', 'Breakfast', 'Night porters'], intro: ['We are a 30-room hotel with {N} staff.', 'We have {N} staff between reception, housekeeping and the restaurant.'], shifts: ['07:00–15:00', '15:00–23:00', '06:30–11:00', '23:00–07:00'], roles: ['General Manager', 'Front Office Manager', 'Head Housekeeper'] },
	{ kind: 'charity shop', names: ['St Brigid’s Hospice Shop', 'Second Chances', 'Riverside Hospice Shop'], teams: ['Volunteers', 'Sorting room', 'Saturday team', 'Van'], intro: ['We are a charity shop with two paid staff and {N} volunteers.', 'We have {N} volunteers, and keeping the shop covered is the whole job.'], shifts: ['09:30–13:00', '13:00–16:30', '10:00–16:00', '09:00–12:00'], roles: ['Shop Manager', 'Volunteer Coordinator', 'Assistant Manager'] }
];
const firstNames = ['Morag', 'Deepak', 'Bronwen', 'Stefan', 'Chidi', 'Farah', 'Lewis', 'Oksana', 'Trevor', 'Niamh', 'Rashid', 'Gemma', 'Piotr', 'Yvonne', 'Callum', 'Shreya', 'Desmond', 'Katya', 'Owen', 'Maribel', 'Arjun', 'Lorna', 'Kwame', 'Ingrid', 'Bashir', 'Tamsin', 'Elliot', 'Roisin', 'Hamza', 'Cerys', 'Dominic', 'Ayesha', 'Fergus', 'Linh', 'Rosalind', 'Gareth', 'Delphine', 'Ifeoma', 'Neil', 'Agnieszka'];
const surnames = ['Whitlock', 'Banerjee', 'Okonkwo', 'Prentice', 'Kowalczyk', 'Haldane', 'Mistry', 'Trevelyan', 'Abara', 'Lindqvist', 'Farrow', 'Qureshi', 'Dunmore', 'Nakamura', 'Ellery', 'Castellanos', 'Brathwaite', 'Sorensen', 'Achebe', 'Marchetti', 'Pike', 'Gallagher', 'Osei', 'Rowntree', 'Varga', 'McAllister', 'Doyle', 'Ahmed', 'Penhaligon', 'Szabo'];
const staffNames = ['Jess', 'Amira', 'Kerry', 'Sophie', 'Leanne', 'Hayley', 'Marta', 'Precious', 'Chloe', 'Aisha', 'Natalie', 'Ewa', 'Charlotte', 'Grace', 'Megan', 'Tia', 'Bethan', 'Sadia', 'Holly', 'Zofia', 'Kirsty', 'Nadia', 'Laura', 'Shannon', 'Abi', 'Fatima', 'Rachel', 'Danielle', 'Imani', 'Lucy'];
const providers = ['mailbox.example', 'postbox.example', 'inbox.example', 'letterbox.example'];
const renames = ['Early shift', 'Late shift', 'Front of house', 'Back of house', 'Weekends', 'Core team', 'Relief staff', 'Main site', 'Downstairs', 'Upstairs', 'Floor team', 'Bank staff'];

// Topics. A ticket follows one path of one topic. Nothing about the topic, its area or its outcome is written into
// the file except through the messages themselves.
type Who = 'c' | 'a' | 'n' | 'w' | 'p' | 'P' | 'b' | 'B' | 'd' | 'D' | 's';
type Msg = [Who, string];
type Paste = 'account' | 'staffAccount' | 'typoAccount' | 'twoAccounts' | 'teams' | 'members' | 'memberList' | 'loginLog' | 'error500' | 'rota' | 'rotaClocks' | 'rotaSettings' | 'requests' | 'payroll' | 'invoices' | 'doubleInvoice' | 'billing' | 'questionnaire' | 'none';
interface Path {
	detail: string[];
	/** Pasted by the customer under the detail. */
	paste?: Paste;
	look: string[];
	lookWho?: 'n' | 'w' | 'p' | 'b';
	/** Pasted under the note; `account` when left out. */
	lookPaste?: Paste;
	ends: Msg[][];
	/** Whom support waits on, if it sends a holding reply. */
	team?: string;
	/** The ticket may end with a satisfaction survey. */
	happy?: boolean;
}
interface Topic {
	/** The earliest day a ticket on this topic can be opened, as YYYY-MM-DD. */
	since?: string;
	/** Pasted under the internal note as well as the path's own paste. */
	extra?: Paste;
	/** Pasted by the customer in the first message. */
	shows?: Paste;
	subjects: string[];
	open: string[];
	more: string[];
	ask: string[];
	paths: Path[];
}

const a11yOpen = [
	'One of our team, {staff}, is blind and uses a screen reader. She tells me she can’t use Plover at all, and at the moment someone reads her shifts out to her every week, which she hates. Is there anything we can do?',
	'Our new starter, {staff}, uses a screen reader and is really struggling with Plover. I don’t know enough about screen readers to describe the problem properly. Can someone help?',
	'I’ve been asked by {staff}, who has very little sight, whether Plover works with screen readers. She has tried and given up. I said I’d ask you directly.'
];
const a11yMore = [
	'We want her to be able to check and swap shifts like everyone else, without having to ask.',
	'Our equality policy says reasonable adjustments, and I would like to be able to tell her what we are doing about it.'
];
const a11yAsk = [
	'Thank you for raising this. Could you ask {staff} which screen reader and browser she uses, and where exactly she gets stuck: creating an account, logging in, or reading the rota itself? That tells us which team needs to look at it.',
	'Thanks for writing. It would help a lot to know which screen reader and browser {staff} uses, and the first point at which things stop making sense to her.'
];

const topics: Topic[] = [
	// Locked out.
	{
		subjects: ['Can’t log in', 'Locked out', 'password not working!!', 'Forgotten my password', 'Log in problem'],
		open: [
			'I’ve been trying to log in since yesterday and it keeps telling me that email and password don’t match an account. I’m sure it’s the right email, it’s the only one I use for work. I might have changed the password over the summer and then forgotten it. I can’t see a forgotten password option anywhere on the page.',
			'{staff} usually does the rota but she’s off for two weeks, so it’s down to me, and I can’t remember my password at all. I’ve tried every version I can think of, with and without capitals, and the page just says the email and password don’t match an account. I’m worried I’ll lock it altogether if I keep trying.',
			'Sorry if this is a silly question. I set up Plover for us back in the spring and haven’t logged in myself for months, because {staff} does it all on her account. Now I need to get in and my password isn’t accepted. Is there a way to reset it?'
		],
		more: [
			'I need next week’s rota up by {day}, so I’d be grateful for a quick answer.',
			'It’s not urgent today, but it will be by {day}, when the holiday requests for December have to be approved.',
			'I’ve copied the message from the screen in case it helps:\n\n> That email and password don’t match an account.'
		],
		ask: [
			'There isn’t a forgotten-password page yet, so resets are done from our side. Before I start one, could you confirm the email you log in with and the name of a team you’re in? We ask everyone, so we know we’re dealing with the account’s owner.',
			'I can help with that. So I reset the right account, could you tell me the email you signed up with and roughly when you last managed to log in? And don’t worry about trying too many times: we don’t lock accounts.'
		],
		paths: [
			{
				detail: ['It’s {email}. I’m in the team called {team}. The last time I got in was probably the week before half term.', 'The email is {email}, and the teams are {team} and {team2}. I definitely logged in last month, because I sorted out the holiday cover.'],
				look: ['{email} exists, signed up {signup}, owner of {team}. {fails} failed log-ins since {wday}, nothing else odd.', 'Account found. No admin flag, {fails} failed attempts this week, last good sign-in {last}. Nothing suggests anyone else has been at it.'],
				ends: [
					[['a', 'Thanks, {name}, that all matches. {reset} The email should arrive within a few minutes and works for an hour. Once you’ve chosen a new password, every other device will be logged out, so you’ll need to log in again on those too.'], ['c', 'That’s done it, I’m back in. Thank you so much, you’ve saved my week.']],
					[['a', '{reset} It’s valid for an hour from now. If it hasn’t turned up in ten minutes, have a look in your junk folder: some workplace filters are fussy about automated email.'], ['c', 'Found it in junk, of course. All sorted, thanks.'], ['a', 'Great, glad you’re in. I’ll close this one.']]
				],
				happy: true
			},
			{
				detail: ['It should be {email}, but it’s possible I used my personal one when I first set it up. I really can’t remember. The team is {team}.'],
				look: ['Nothing on {email}. Searched on {last_name} as well: one account under the same name on a personal address ending {pers}, member of {team}.'],
				lookPaste: 'none',
				ends: [
					[['a', 'I can’t find an account under {email}, but there is one in your name on a personal address ending {pers}. Could that be the one? Try logging in with that and your usual password.'], ['c', 'Oh my goodness. Yes. It was my old personal email and the password worked first time. Sorry for wasting your time!'], ['a', 'Not at all, it happens more than you’d think. Glad you’re in.']]
				],
				happy: true
			},
			{
				detail: ['It’s {email}, I think. Team {team}. I last logged in maybe in August?', '{email}. I’m not sure of the team name, {staff} set it all up.'],
				look: ['No account on {email}, and nothing under {last_name} or under {biz} that matches. Probably signed up with another address.'],
				lookPaste: 'none',
				ends: [
					[['a', 'I can’t find an account under {email}. Is it possible you signed up with a different address, perhaps a personal one? If you tell me which, I’ll check again.'], ['c', 'Let me ask {staff} which email she used when she set me up. Back soon.'], ['s', 'Automatic reminder sent to the customer after five days without a reply.']],
					[['a', 'That address isn’t on any account, I’m afraid, so it must be another one. Could you search your inbox for anything from Plover Rota from when you first joined? That will show which address we have.'], ['c', 'Will do, but I’m away until {day} now, so it will have to wait until then.']]
				]
			},
			{
				detail: ['It’s {email}. My team is {team}.'],
				look: ['{email} found, owner of {team}, last sign-in {last}. Fine to reset.'],
				ends: [
					[['a', '{reset} It works for an hour. Once you’ve set a new password you’ll be logged out of your other devices.'], ['c', 'Thanks, I’m in. Honestly though, could you not add a forgotten password button like everyone else has? I can’t be the only one who has had to email you.'], ['a', 'You’re not, and the web team know. It’s on their list, and I’ve added your ticket to the request so you’ll hear when it’s there.']]
				],
				happy: true
			}
		]
	},
	// "An account with this email already exists."
	{
		subjects: ['Says she already has an account', 'Can’t sign up', 'sign up not working', 'Someone using her email?'],
		open: [
			'Our new starter, {staff}, can’t create her account. The sign-up page tells her “An account with this email already exists.”, but she swears she’s never used Plover in her life. She’s worried someone is using her email. Could you look into it before her first shift on {day}?',
			'Two of my new starters were getting “An account with this email already exists.” when they signed up. One managed in the end with a different address, but the other, {staff}, is adamant she’s never had an account. Is this a bug?',
			'{staff} has just joined us and is trying to sign up. Every time she presses the button she gets a message saying an account with her email already exists. She has tried with capitals and without. What should she do?'
		],
		more: [
			'Everyone else signed up without any trouble last week.',
			'She’s quite anxious about it, so I said I’d chase it for her.'
		],
		ask: [
			'Thanks for flagging it. That message only appears when an account really does exist with that email, so let’s find out where it came from. Could you send me the address in question, and the name of her previous workplace if she’s used rota software before?',
			'Let me take a look. What’s the email address she’s using? If it’s possible someone at {biz} signed her up already, that’s worth checking too.'
		],
		paths: [
			{
				detail: ['It’s {staffEmail}. I’ve asked around and nobody here admits to signing her up, but our previous manager did a lot of setting up in September before she left.'],
				look: ['{staffEmail}: account exists, created {signupSep}, name {staffFull}, member of {team}. Created the same week the old manager set the team up.'],
				lookPaste: 'staffAccount',
				ends: [
					[['a', 'Mystery solved, and nothing sinister: the account was created on {signupSep}, when your previous manager set the team up, and she signed several new starters up herself with passwords she chose. So nobody else has {staff}’s email. {resetHer} Once she has chosen her own password she’ll find she’s already in {team}.'], ['c', 'Ha, that explains it, thank you. She’s in and has already found her shifts.']]
				],
				happy: true
			},
			{
				detail: ['The address is {staffEmail}. Before us she worked at a café on the high street for a year, if that matters.', 'It’s {staffEmail}. She came to us from another care job, but she says they used paper rotas.'],
				look: ['{staffEmail} exists since {signup}. Member of one team, at another business. So it’s from her last job.'],
				lookPaste: 'staffAccount',
				ends: [
					[['a', 'The account is from her previous job: she was signed up there in {signupMonth} and is still a member of their team. {resetHer} Once she’s in, she can be added to {team} as usual, and she’ll see both teams until her old employer removes her.'], ['c', 'Thank you. She’d completely forgotten her old place used Plover too. She’s in now.']],
					[['a', 'It’s from her previous job, where she was signed up in {signupMonth}. {resetHer}'], ['c', 'She’s in, thanks. Could you take her out of the old team while you’re there? She doesn’t want to see their rota.'], ['a', 'We can only do that if that team’s owner asks us, because the team is theirs. I’ve suggested to {staff} that she asks her old manager, who can write to us.'], ['c', 'Fair enough, she’ll do that.']]
				]
			},
			{
				detail: ['It’s {staffEmail}. She’s in a bit of a panic, she thinks she’s been hacked.'],
				look: ['{staffEmail} exists, created {signup}, no teams, never used since the first day. Can’t tell who made it.'],
				lookPaste: 'staffAccount',
				ends: [
					[['a', 'There’s an account on {staffEmail} created on {signup}, not in any team and not used since, so it may well be one she started and forgot. Before I can reset it, we need to hear from its owner. Could {staff} reply to this ticket from {staffEmail} itself, just saying she’d like the password reset?'], ['s', 'Automatic reminder sent to the customer after five days without a reply.'], ['c', 'Sorry, I’ve reminded her twice. She says she’ll do it tonight.']]
				]
			},
			{
				detail: ['{staffEmail}. Honestly I don’t mind how it gets done, she just needs to see the rota by {day}.'],
				look: ['{staffEmail} exists, created {signup}, in no team. Probably an abandoned sign-up.'],
				lookPaste: 'staffAccount',
				ends: [
					[['a', 'There is an account on {staffEmail}, created on {signup} and in no team, so probably one she started once and forgot about. If she’d like it back, she can reply from that address and I’ll send her a reset.'], ['c', 'In the end she’s signed up with her work email instead, which is probably better anyway. You can ignore the old account.'], ['a', 'Thanks for letting me know. The old one will just sit there unused; if she ever wants it removed, she can write to us from that address.']]
				]
			}
		]
	},
	// A typo in the email address.
	{
		extra: 'loginLog',
		subjects: ['Wrong email on my account', 'Spelling mistake in email', 'change email address?', 'Typo when I signed up'],
		open: [
			'When I signed up I typed my email wrong: it has an extra letter in it. I can still log in with the wrong one, but my manager is trying to find me on the team page under my proper address and Plover says there’s nobody with that email. How do I change it? I can’t see an option anywhere.',
			'I set my account up with a typo in my email and only noticed this week, when {staff} tried to add me to {team2} and couldn’t find me. I can still log in because I copy the typo, but it feels like a disaster waiting to happen. Can you correct it?',
			'Silly one. I registered with my email misspelt and only just noticed. Is there any way to change it without starting again? I’m the owner of two teams and don’t want to lose them.'
		],
		more: [
			'If I ever forget my password, I assume I’d be stuck, since nothing can reach the wrong address.',
			'I’ve looked through every menu on my phone and on the computer.'
		],
		ask: [
			'There’s no way to change an email address from the app yet, but we can do it from our side. For security, could you confirm the misspelt address and the correct one, and then reply from the correct address so we know it’s really yours?',
			'That’s fixable. We’ll need to be sure the new address belongs to the account’s owner, so could you reply to this ticket from the correct address and tell me the old one? Then I’ll pass it to the web team.'
		],
		paths: [
			{
				detail: ['The wrong one is {typo}. The right one is {right}, and I’m writing from it now.', 'Old: {typo}. New: {right}. Sending this from the new one as you asked.'],
				look: ['Account on {typo} exists, created {signup}. Nothing on {right}, so no clash. Passing to the web team.'],
				lookPaste: 'typoAccount',
				team: 'web team',
				ends: [
					[['w', 'Changed the email on user {uid} from {typo} to {right}, by hand in the console. That’s the {nth} of these this month.'], ['a', 'All done: the account now uses {right}. Log in with that from now on; your password hasn’t changed.'], ['c', 'Brilliant, that works perfectly. Thank you!']],
					[['w', 'Done for user {uid}: {typo} is now {right}.'], ['a', 'That’s changed. Your teams and shifts are all where they were; only the email is different.'], ['c', 'Thanks. I’ve just tried it and I’m in.']]
				],
				happy: true
			},
			{
				detail: ['Wrong: {typo}. Right: {right}. This message is from the right one.'],
				look: ['{typo} found, {right} is free. Asked the web team to change it.'],
				lookPaste: 'typoAccount',
				team: 'web team',
				ends: [
					[['w', 'I’d rather not keep changing emails by hand: last month one went onto the wrong account because two people had near-identical typos. Can we hold these until people can change their own email? It’s next on the accounts list.'], ['a', 'I’ve spoken to the web team, and rather than change addresses by hand they’re adding a way for you to change your own email in your account settings. It isn’t there yet; I’ll write to you here when it is. In the meantime the old address keeps working for logging in.'], ['c', 'OK, not ideal, but I’ll live with the typo for now. Please do let me know.']]
				]
			},
			{
				detail: ['It’s {typo} and should be {right}. Writing from work as I can’t get into my personal email here.'],
				look: ['{typo} exists. The reply came from a work address, not from {right}, so we can’t change it yet.'],
				lookPaste: 'typoAccount',
				ends: [
					[['a', 'Thanks. This reply came from your work address rather than {right}, so I can’t yet be sure the new address is yours. Could you send one line from {right} itself when you’re home? Then I’ll get it changed straight away.'], ['s', 'Automatic reminder sent to the customer after five days without a reply.']]
				]
			}
		]
	},
	// Logged out everywhere.
	{
		subjects: ['Everything logged out', 'Logged out of everything', 'Why did it log me out?', 'Was there a security problem?'],
		open: [
			'We have a tablet on the wall in the staff room that everyone uses to check the rota. Since yesterday afternoon it just shows the log-in page, and nobody knows the password except {staff}, who’s on leave until {day}. Did you change something on your side?',
			'This morning I got logged out on my phone, my laptop and the office computer, all at the same moment. Has there been a security problem? I’d rather know now than read about it later.',
			'Every device in the building logged out of Plover at about half past two yesterday. I’ve logged back in on mine, but the shared ones in the kitchen and the office are still on the log-in screen and I’m getting questions.'
		],
		more: [
			'The staff check that screen at every handover, so it matters more than it sounds.',
			'Nobody here has had an email or anything to say why.'
		],
		ask: [
			'Thanks for letting us know. Did anyone change or reset the password on that account around then? A new password logs the account out of every device, on purpose, so that an old password stops working everywhere at once.',
			'Nothing changed on our side yesterday. One thing that does exactly this: when an account’s password changes, every device signed in to it is logged out. Could anyone have reset it?'
		],
		paths: [
			{
				detail: ['Ah. {staff2} did reset it on {wday} because she thought one of the weekend staff knew it. She didn’t tell anyone.'],
				look: ['Password on {email} changed {wday} at {hhmm} through a reset; every session ended at that moment, as designed. No other change on the account.'],
				lookPaste: 'loginLog',
				ends: [
					[['a', 'That explains it, then. The reset at {hhmm} on {wday} logged out every device on the account, the tablet included. Logging in again with the new password on each device puts things right, and nothing else happened to the account.'], ['c', 'That makes sense. {staff2} has given us the new password and the tablet’s back up. Thanks for explaining.']]
				],
				happy: true
			},
			{
				detail: ['I did reset my password on {wday} morning, now you mention it. I didn’t think it would touch the tablet, though. It’s logged in as me, I suppose.'],
				look: ['Password on {email} reset {wday} {hhmm}; all {sessions} sessions ended then. The tablet uses the manager’s own account.'],
				lookPaste: 'loginLog',
				ends: [
					[['a', 'That’s it: the tablet is logged in as you, so your reset logged it out along with everything else.'], ['c', 'OK, but this will happen every time I change my password, won’t it? Twelve people use that tablet.'], ['a', 'It will, as long as the tablet uses your account. What most teams do is give the shared screen an account of its own, which only the manager knows the password to. Then a personal password change never touches the wall tablet.'], ['c', 'That’s a good idea. I’ve set up a separate account for the tablet and it’s working. Thanks.']]
				],
				happy: true
			},
			{
				detail: ['Yes, {staff2} reset it on {wday}. But that’s my point: I want to be able to change the password without the tablet going dark every time.'],
				look: ['Reset on {wday} {hhmm}, every session ended, as designed. Customer wants a way to keep one device signed in.'],
				lookPaste: 'loginLog',
				team: 'web team',
				ends: [
					[['a', 'I’ve asked the web team. Right now a new password always ends every session, and there’s no way to keep one device signed in. They’ve noted it as a request, but it isn’t planned yet. I’ll update this ticket if that changes.'], ['c', 'Shame. Please do keep me posted.']]
				]
			},
			{
				detail: ['Not that I know of. Nobody here has said anything, anyway.'],
				look: ['No password change and no reset on {email} this month. Sessions look normal. The tablet may be on a different account.'],
				ends: [
					[['a', 'Nothing on your account shows a reset or any other change. Could you tell me which account the tablet uses, and roughly when it logged out? Then I can look at the right one.'], ['s', 'Automatic reminder sent to the customer after five days without a reply.']]
				]
			}
		]
	},
	// "Internal server error" when logging in.
	{
		subjects: ['Internal server error', 'Error when logging in on office PC', 'Log in page broken?', 'Weird error message'],
		open: [
			'On the old PC in the office, when I press Log in it says Internal server error. On my phone it works fine. The PC is a bit ancient, but it has always worked before and it’s the one connected to the printer.',
			'Since {wday} two of my supervisors get an error saying Internal server error when they log in on the computer at the front desk. On their phones it works. Has something broken?',
			'Getting an error when I log in on the shared computer: Internal server error. It happens every time on that computer and never on my own laptop.'
		],
		more: [
			'Nothing has changed on the computer as far as I know, although head office do push updates.',
			'It’s the computer we print the week’s rota from, so it’s a pain.'
		],
		ask: [
			'Sorry about that. Could you tell me which browser that computer uses, and whether the password box appears on the log-in page at all? A screenshot would be ideal.',
			'Thanks for reporting it. When it happens, is the password box filled in? Some older browsers and password tools leave it out, so it would help to know which browser that computer has.'
		],
		paths: [
			{
				detail: ['Copied from the screen and from the browser’s about page. Now you mention it, the password box doesn’t show up on that one, just the email and the button.'],
				paste: 'error500',
				look: ['Reproduced with the same browser settings. POST /login without a password field answers 500 instead of a 400 with a message, because the view reads the field without checking it’s there. On that browser in compatibility view the form is sent without the field.'],
				lookWho: 'w',
				lookPaste: 'loginLog',
				ends: [
					[['a', 'We’ve found it: on that browser the log-in form is sent without the password, and our side answers with a confusing error instead of saying what’s missing. The quickest fix is to use another browser on that computer. Edge is already installed on most Windows machines and works fine.'], ['c', 'Edge works. We’ve put a shortcut on the desktop and told everyone. Thanks.']]
				],
				happy: true
			},
			{
				detail: ['Here’s what it says. The password box is there, but the password manager fills it in grey and I’m not sure it’s really filled.'],
				paste: 'error500',
				look: ['Same thing as the other compatibility-view reports: the request arrives with no password field and we answer 500. The fix on our side is a 400 with a proper message; it’s on the list.'],
				lookWho: 'w',
				lookPaste: 'loginLog',
				team: 'web team',
				ends: [
					[['a', 'The web team have reproduced it. The log-in form arrives without the password on that browser, and the server should answer with a clear message rather than an internal error. That fix is on their list. Using another browser on the computer avoids it in the meantime.'], ['c', 'We can’t install anything or change settings on that computer, it’s locked down by head office. We’ll wait for the fix.'], ['a', 'Understood. I’ve attached your ticket to the web team’s issue, so you’ll hear from me when the fix is out.']]
				]
			},
			{
				detail: ['I’m not at work until {day}, I’ll have a look then.'],
				look: ['Probably the same compatibility-view problem as the other reports, but no details yet.'],
				lookPaste: 'loginLog',
				ends: [
					[['a', 'No problem. When you’re next in, could you send a photo of the screen when the error shows, and the browser’s name and version? We can’t make it happen on our side yet.'], ['s', 'Automatic reminder sent to the customer after five days without a reply.']]
				]
			}
		]
	},
	// Weak passwords.
	{
		subjects: ['Password security', 'Staff using terrible passwords', 'Can you force stronger passwords?', 'Security question'],
		open: [
			'I found out today that half my staff have the password “password” or their own first name. Is there a way to make them choose something stronger? At our other site someone swapped shifts on a colleague’s account last month and it caused a real row.',
			'Our head office has asked whether Plover has any rules about passwords. I tried making a test account and it accepted the letter a as my password. Is that right? I need something to put in our policy.',
			'One of my team leaders logged in to a colleague’s account by guessing her password, which was her dog’s name, and changed her shifts as a joke. I’ve dealt with him, but can you stop people choosing passwords that easy?'
		],
		more: [
			'I’m not technical, so please keep the answer simple.',
			'We are being audited in the new year and passwords are on the checklist.'
		],
		ask: [
			'Thanks for raising it. You’re right that sign-up accepts any password at the moment, however short. Can I ask how many of your staff log in from shared devices? It helps the web team to know how people use it.',
			'That’s a fair question. Right now there’s no minimum length or other rule when people choose a password. I’ll pass this on. In the meantime, would it help if I sent you a short note for staff on choosing a password?'
		],
		paths: [
			{
				detail: ['Most use their own phones, but there are two shared tablets, one in the kitchen and one in the office.', 'About {n} people use the computer in the office; everyone else is on their phone.'],
				look: ['Checked: sign-up accepts any password, even one character, as the customer says. The web team already has a request for a minimum length.'],
				team: 'web team',
				ends: [
					[['w', 'Yes, a minimum length on sign-up is agreed: ten characters, with a plain message when it’s shorter. Not started; it’s in the next batch of accounts work.'], ['a', 'The web team have agreed a minimum password length of ten characters for new passwords, and it’s in their next batch of work. I don’t have a date yet. I’ll update this ticket when it’s live.'], ['c', 'Thanks, that will do for now. Please do let me know when it’s in.']]
				]
			},
			{
				detail: ['Yes please, a note would help. Most of them are on their phones.'],
				look: ['{biz}: {members} members. Sent the standard password note.'],
				ends: [
					[['a', 'Here’s the note, which you’re welcome to pin up: choose at least three random words, don’t reuse a password from anywhere else, and never tell anyone your password, not even the manager. If you think someone knows it, ask your manager to arrange a reset through us.'], ['c', 'Perfect, printed and up in the staff room. That will do us for now.']]
				],
				happy: true
			},
			{
				detail: ['It’s for the policy document really. Head office want to know how passwords are kept and what happens when one is changed.'],
				look: ['Policy question only. Answered from the security page.'],
				lookPaste: 'none',
				ends: [
					[['a', 'For your policy document: we never store passwords as typed, only a salted hash, so nobody at Plover can see them, and changing a password logs the account out of every device. There’s no minimum length yet; that’s coming. Does that give head office what they need?'], ['c', 'Yes, that’s exactly what they wanted, thanks.']]
				],
				happy: true
			}
		]
	},
	// A leaver wants her account deleted.
	{
		extra: 'loginLog',
		subjects: ['Delete former employee', 'Remove leaver’s data', 'Data request from ex-staff', 'Account deletion'],
		open: [
			'A former member of staff, {staffFull}, left us in {month} and has asked us to make sure her details are deleted from everything we use, including Plover. I can’t see a way to delete her account. Can you do it?',
			'We had someone leave on bad terms and she has written asking for all her personal data to be removed. I’ve taken her off our rotas, but her account is still there. What do we need to do?',
			'How do I delete an account? One of my staff, {staff}, left last week and wants hers gone.'
		],
		more: [
			'I’d like to tell her it’s done by the end of the month if possible.',
			'We’ve already removed her from payroll and the door system.'
		],
		ask: [
			'We can do that. As the account belongs to her rather than to {biz}, we need the request to come from her, or a copy of her written request to you. Could you forward that, and tell me the email address on her account?',
			'Thanks. Deleting an account removes the person from every team they’re in, and it can’t be undone. Can you confirm the email on the account, and that the request came from her?'
		],
		paths: [
			{
				detail: ['Her email is {staffEmail}. I’ve attached her letter, scanned.'],
				look: ['{staffEmail}, member of {team} at {biz} only. Written request attached. Formal erasure request, so it goes to Grace.'],
				lookPaste: 'staffAccount',
				team: 'data protection lead',
				ends: [
					[['a', 'Thank you. Because this is a request under data protection law, I’ve passed it to Grace, our data protection lead, who will confirm to you and to {staff} once the account and its history are deleted. She usually replies within a week.'], ['d', 'Picked up. I’ll confirm identity with the requester directly before anything is deleted, and write to both.']]
				]
			},
			{
				detail: ['It’s {staffEmail}. Attached is the email she sent us asking for it.'],
				look: ['{staffEmail}, one membership, {team}. Request from her own address, attached. Asked the web team to delete.'],
				lookPaste: 'staffAccount',
				team: 'web team',
				ends: [
					[['w', 'Deleted user {uid} and the membership of {team}. Told the planner team, so past rotas show her as a former member.'], ['a', 'Done: {staff}’s account is deleted and she no longer appears in {team}. Past rotas will show her as “Former member”.'], ['c', 'Thank you, I’ll let her know.']]
				],
				happy: true
			},
			{
				detail: ['It’s {staffEmail}. She asked me at her leaving do, then sent a message. I can screenshot it if that’s enough.'],
				look: ['{staffEmail}, member of {team}. No request from the person herself yet.'],
				lookPaste: 'staffAccount',
				ends: [
					[['a', 'A screenshot isn’t quite enough for us, I’m afraid, because we can’t tell who sent it. Could she write to us herself from {staffEmail}? A single line saying she wants the account deleted is enough.'], ['c', 'I’ll pass that on, but honestly I doubt she’ll bother.']]
				]
			}
		]
	},
	// One shared login.
	{
		extra: 'members',
		subjects: ['One login for everyone?', 'Shared account question', 'Do all staff need accounts?'],
		open: [
			'Quick question before we roll this out. Can the whole kitchen team share one login? Most of them don’t have work emails and a couple don’t really do email at all. They’d only ever be looking at the rota on the tablet.',
			'Is it against your terms for us to have one account that everyone uses? We have {N} staff and I’d rather not pay for everyone if they only need to look.',
			'We’re thinking of having one Plover account for the whole team rather than one each, because half of them never remember passwords. Any reason not to?'
		],
		more: [
			'I’ve read the help pages but couldn’t find an answer either way.',
			'We’ll be going live on {day} if we can.'
		],
		ask: [
			'Sharing is allowed, but it has downsides, so let me explain before you decide. How many people would be using the shared login, and would any of them need to swap shifts or book holiday themselves?'
		],
		paths: [
			{
				detail: ['About {n} people. Swaps go through me anyway, so nobody needs to do anything except look.'],
				look: ['{biz} has {members} members across {teamCount} teams. View-only use; a shared login is fine.'],
				ends: [
					[['a', 'In that case a shared login is fine. A few tips: give it a long password only you know, sign it in on the tablet and leave it there, and change the password when someone leaves. Changing it logs the tablet out, so you’ll need to sign in again afterwards.'], ['c', 'Great, that’s what I hoped. Thanks for the tips.']]
				],
				happy: true
			},
			{
				detail: ['{n} in the kitchen, and yes, a few of them swap shifts with each other quite a lot.'],
				look: ['{members} members now. Several would swap shifts, so a shared login would hide who did what.'],
				ends: [
					[['a', 'Then I’d suggest a mix: a shared account for the tablet, for looking, and individual accounts only for the people who swap shifts. Swaps are recorded against whoever makes them, so on a shared account you can’t tell who did what.'], ['c', 'Makes sense. I’ll do that: one for the tablet and accounts for the {n} who swap.']]
				],
				happy: true
			},
			{
				detail: ['About {n}. The main thing is cost, to be honest.'],
				look: ['Pricing question underneath. Passed to billing.'],
				team: 'billing team',
				ends: [
					[['c', 'And if we do give everyone accounts, is there a cheaper rate for staff who only look at the rota?'], ['a', 'Good question for billing. I’ve passed it to Olu in our billing team, who will reply to you here.'], ['b', 'Will reply about pricing. No view-only rate, but they may qualify for the small-team discount.']]
				]
			}
		]
	},
	// Change of name.
	{
		extra: 'loginLog',
		subjects: ['Change my name', 'Name on rota is wrong', 'New surname', 'Update my name please'],
		open: [
			'I got married in the summer and my name on Plover still shows my old surname. I can’t find anywhere to change it. Can you update it to {newName}?',
			'My surname has been spelt wrong on my account since I joined. It should be {newName}. Is there any way I can change it myself?',
			'I changed my surname this year and everything else at work has been updated except Plover. It should read {newName} now.'
		],
		more: [
			'It’s a small thing, but the staff keep asking who {name} {last_name} is on the rota.',
			'It also shows the old name on the printed rota on the staff board.'
		],
		ask: [
			'There isn’t a way to change your name in the app yet, but we can do it from our side. Can you confirm the email on the account and exactly how you’d like the name to appear?',
			'Of course. We can change it from our side, as there’s no setting for it yet. Which email does the account use, and how should the name read?'
		],
		paths: [
			{
				detail: ['The email is {email} and it should say {newName}.'],
				look: ['Account found, name currently {full}. Asked the web team to change it.'],
				team: 'web team',
				ends: [
					[['w', 'Name on user {uid} updated to {newName}.'], ['a', 'Done: the account now shows {newName}. It may take until tomorrow for rotas to show the new name, as they refresh overnight.'], ['c', 'It’s already changed on the rota. Thanks!']]
				],
				happy: true
			},
			{
				detail: ['It’s {email}. {newName}, please.'],
				look: ['Name on {email} is {full}. Web team to change; the planner may still show the old one on published rotas.'],
				team: 'planner team',
				ends: [
					[['w', 'Updated the name on the account. But the planner keeps its own copy of names on rotas that were already published, so those will still show the old one.'], ['a', 'The account now shows {newName}, but rotas that were published before today still show the old name, because the planner keeps its own copy. I’ve passed that part to our planner team, who will come back to you.'], ['p', 'Looking at it. Published rotas keep names as they were at publishing; we’ll re-publish the current week for {biz}.']]
				]
			},
			{
				detail: ['{email}, and {newName}.'],
				look: ['{email}, currently {full}. The web team would rather ship self-service name changes than keep editing by hand.'],
				team: 'web team',
				ends: [
					[['a', 'The web team would rather give people a setting to change their own name than do it by hand each time, and they’ve started on it. It should be in the next release or the one after. Would you mind waiting until then?'], ['c', 'That’s fine, I’m not in a rush. Thanks for letting me know.']]
				]
			}
		]
	},
	// Two accounts; it looks like a rota problem at first.
	{
		subjects: ['Shifts missing from her rota', 'Staff can’t see her shifts', 'Rota empty for one person', 'Rota shows nothing'],
		open: [
			'One of my staff, {staff}, says her rota is completely empty, even though she’s on for four shifts next week. Everyone else can see theirs. I’ve checked and she’s definitely on the rota in the planner.',
			'Since {wday}, {staff}’s rota page has been blank. It says she isn’t on any shifts, but she’s on the rota for {team} every weekend. Has something gone wrong with the planner?',
			'{staff} keeps missing shifts because she says they’re not on her rota. I can see them on mine, and on the printout. Is there a glitch?'
		],
		more: [
			'She’s missed one shift already because of it, and I’d rather it didn’t happen again.',
			'I’ve tried publishing the rota again but it makes no difference.'
		],
		ask: [
			'Sorry about that. Could you tell me which email {staff} uses to log in, and which email is shown for her on the team page? The rota shows shifts for whichever account is logged in, so it’s worth checking they match.',
			'Let’s check the simple thing first. Which email does she log in with? And could you check which email is listed against her name on the team page?'
		],
		paths: [
			{
				detail: ['She logs in with {staffEmail}. On the team page it says {staffEmail2}. Oh.', 'She says she uses {staffEmail}, but she isn’t sure. On our team page she’s listed with another address.'],
				look: ['Two accounts for {staffFull}: {staffEmail} (signed up {signup}, no teams) and {staffEmail2} (member of {team}). She logs in to the one with no teams.'],
				lookPaste: 'twoAccounts',
				ends: [
					[['a', 'Found it: {staff} has two accounts. The one she logs in with has no teams, so its rota is empty, and her shifts are on the other one, which is the one in {team}. If she logs out and back in with {staffEmail2}, everything will be there.'], ['c', 'That was it! She’d made a second account on her phone without realising. All her shifts are there now.']]
				],
				happy: true
			},
			{
				detail: ['She logs in with {staffEmail}; the team page has {staffEmail2}.'],
				look: ['Two accounts: {staffEmail} with no teams, {staffEmail2} in {team}. Customer may want them merged.'],
				lookPaste: 'twoAccounts',
				team: 'web team',
				ends: [
					[['a', 'She has two accounts, and her shifts are on the one in {team}, {staffEmail2}. If she logs in with that, she’ll see them.'], ['c', 'Can you merge them? She’ll only get muddled again.'], ['a', 'I asked the web team, and there isn’t a way to merge two accounts yet. They’re looking at it, because it comes up regularly. For now she should use {staffEmail2} only, and I can delete the empty one if she’d like.'], ['c', 'Delete the empty one, please, and let me know if merging ever arrives.'], ['w', 'Deleted the empty account. Merge request noted against this ticket.']]
				]
			},
			{
				detail: ['I’ll have to ask her, she’s not in until {day}. The team page shows {staffEmail2}.'],
				look: ['{staffEmail2} is in {team} with shifts. There’s a second account with her name. Waiting to hear which one she uses.'],
				lookPaste: 'twoAccounts',
				ends: [
					[['a', 'Thanks. There are two accounts in her name, so I suspect she’s logging in to the wrong one. Could you ask her to log out, log back in and tell you exactly which email she typed? I’d like to be sure before I touch anything.'], ['c', 'Will do when she’s next in.']]
				]
			}
		]
	},
	// Screen reader: the sign-up and log-in forms.
	{
		subjects: ['Screen reader problem', 'Accessibility', 'Colleague can’t use Plover with a screen reader'],
		open: a11yOpen,
		more: a11yMore,
		ask: a11yAsk,
		paths: [
			{
				detail: ['She uses VoiceOver on a Mac with Safari. She can’t get past the sign-up page: the boxes aren’t labelled, so she can’t tell which one is the email and which is the password.'],
				look: ['Checked with VoiceOver: the sign-up and log-in fields have placeholders but no labels, so they’re read out as “edit text”. Web team.'],
				lookWho: 'w',
				lookPaste: 'none',
				team: 'web team',
				ends: [
					[['a', 'Thank you, that’s exactly what we needed. The web team confirmed that the sign-up and log-in boxes have no labels a screen reader can announce. Fixing it is on their list for the next release; I’ll write to you here the day it’s out.'], ['c', 'Thank you. I’ll tell her, and in the meantime I’ll sit with her to get her signed up.']]
				]
			},
			{
				detail: ['She uses NVDA with Firefox on Windows. She says the sign-up page reads out “edit, blank” for every box, so she gave up there.'],
				look: ['Labels missing on the account forms. Rhiannon added them this morning, released at lunchtime.'],
				lookWho: 'w',
				lookPaste: 'none',
				ends: [
					[['a', 'Good news: the web team have added proper labels to the sign-up and log-in boxes, and the change went out today. Could {staff} try again and let us know how she gets on?'], ['c', '{staff} has signed up on her own and says the boxes read out properly now. She’s really pleased. Thank you for being so quick.']]
				],
				happy: true
			}
		]
	},
	// Screen reader: the rota itself.
	{
		extra: 'rotaSettings',
		subjects: ['Screen reader and the rota', 'Accessibility question', 'Can blind staff use Plover?'],
		open: a11yOpen,
		more: a11yMore,
		ask: a11yAsk,
		paths: [
			{
				detail: ['She uses NVDA with Firefox. She got through signing up eventually, but the rota itself is just a jumble: it reads out times without saying which day they belong to.'],
				look: ['The account side is fine. The rota grid is the problem, which is the planner. Passed to the planner team.'],
				lookPaste: 'none',
				team: 'planner team',
				ends: [
					[['a', 'Thank you. The account pages work for her, so this is about the rota grid itself, which our planner team look after. I’ve passed it to them with everything you’ve told me.'], ['P', 'Hello {name}, Hana from the planner team here. We know the grid isn’t announced properly and we’re building a list view that reads one day at a time. I’ll keep you posted, and if {staff} would be willing to try it early, we’d love that.']]
				]
			},
			{
				detail: ['VoiceOver on her iPhone. Logging in is fine; reading the week is the problem, she can’t tell which shift is which day.'],
				look: ['Log-in is fine on iPhone. The grid is the issue. Suggested the CSV export as a stopgap.'],
				lookPaste: 'none',
				ends: [
					[['a', 'Thanks. While the planner team work on the rota grid, one thing that has helped others: the weekly export under Rota options gives a plain list, one shift per line with the day written out, and screen readers read it well. Could you send {staff} that each week?'], ['c', 'We tried it and she says it’s much better, she can manage with that for now. Thank you.']]
				],
				happy: true
			}
		]
	},
	// Rename a team.
	{
		extra: 'members',
		subjects: ['Rename team?', 'Change team name', 'Team name wrong', 'Team name out of date'],
		open: [
			'Can I rename our team? We set it up as “{team}” and since the restructure it’s called “{newTeam}”. I can’t see any way to edit it.',
			'I made a typo when I created our team, it says “{typoTeam}”. Everyone’s in it now so I’d rather not start again. Can it be changed to “{team}”?',
			'We’ve merged two areas in real life and I’d like our Plover team to have a new name to match: “{newTeam}” instead of “{team}”. Where do I change it?'
		],
		more: [
			'It’s confusing new starters, who can’t find the team they’ve been told to look for.',
			'I’ve looked on the team page and in the settings.'
		],
		ask: [
			'There’s no rename option in the app yet, I’m afraid, but we can change it from our side for the team’s owner. Are you the owner of the team? If not, we’ll need the owner to ask.',
			'We can rename it for you. Could you confirm the team’s current name and the new one, and that you’re its owner?'
		],
		paths: [
			{
				detail: ['Yes, I set it up, so I think I’m the owner. Current name and new name as in my first message.'],
				look: ['{email} is owner of team {teamId} ({team}). Asked the web team to rename it.'],
				lookPaste: 'teams',
				team: 'web team',
				ends: [
					[['w', 'Renamed team {teamId} by hand.'], ['a', 'Done: the team has its new name, and everyone in it will see it the next time they open Plover. Nothing else about the team has changed.'], ['c', 'Perfect, thank you. It’s already showing for me.']]
				],
				happy: true
			},
			{
				detail: ['Yes, I’m the owner.'],
				look: ['Owner confirmed, team {teamId}. The web team want to stop renaming by hand and ship the rename option instead.'],
				lookPaste: 'teams',
				team: 'web team',
				ends: [
					[['a', 'I’ve checked with the web team, and they’re adding a way for owners to rename their own teams rather than doing it by hand, so I’ve added your request to that. I don’t have a date yet, but I’ll write to you here when it’s ready.'], ['c', 'OK. A bit disappointing, as it’s one word, but I’ll wait.']]
				]
			},
			{
				detail: ['I’m not the owner, {mgr} is, but she’s asked me to sort it out.'],
				look: ['Owner of team {teamId} is {mgr}, not the person writing in. Need {mgr} to confirm.'],
				lookPaste: 'teams',
				ends: [
					[['a', 'Thanks. As {mgr} owns the team, could she reply to this ticket, or write to us from her own account’s email, to say she’d like it renamed? Then I’ll get it done.'], ['c', 'I’ll ask her, but she’s on holiday until {day}.'], ['s', 'Automatic reminder sent to the customer after five days without a reply.']]
				]
			}
		]
	},
	// The order of the members list.
	{
		subjects: ['Members list order', 'Can the team list be alphabetical?', 'Finding people on the team page'],
		open: [
			'The members list for our team seems to be in a random order. With {members} people it takes ages to find anyone. Can it be alphabetical?',
			'Small request: on the team page, could people be listed by name? At the moment I’m scrolling up and down looking for people every time.',
			'Why is the team page in such a strange order? {staff} is at the top and I’m somewhere in the middle, even though I set the team up.'
		],
		more: [
			'There are {members} people in {team} now, so it adds up.',
			'It’s not a big deal, but it would save me ten minutes a week.'
		],
		ask: [
			'Thanks. The list is in the order people joined the team, which I agree isn’t much use once a team grows. I’ll pass this on. Is it the team page you mean, or the rota itself?',
			'Good question. People are listed in the order they joined. Is it just the team page, or the order of names on the rota too?'
		],
		paths: [
			{
				detail: ['Just the team page. The rota is fine because I can sort it in the planner.'],
				paste: 'memberList',
				look: ['Members are listed in join order. Asked the web team.'],
				lookPaste: 'teams',
				team: 'web team',
				ends: [
					[['w', 'Agreed: list members by name, ignoring case. Small change, in the next batch.'], ['a', 'The web team agree, and they’ll change the team page to list people by name. It’s a small change, so it should be in one of the next releases. I’ll let you know when it’s live.'], ['c', 'Thank you, that will make my life easier.']]
				]
			},
			{
				detail: ['Mainly the team page, when I’m checking who’s in which team.'],
				paste: 'memberList',
				look: ['Join order, as designed for now. Suggested the planner’s staff list, which sorts by name.'],
				lookPaste: 'teams',
				ends: [
					[['a', 'Until the team page changes, the staff list in the planner (Rota options, then Staff) shows the same people sorted by surname, with their teams beside them. Many managers use that to check who’s where.'], ['c', 'Oh, I never knew that was there. That does the job, thanks.']]
				],
				happy: true
			},
			{
				detail: ['The team page. Is it because {staff} joined first? That makes sense now.'],
				paste: 'memberList',
				look: ['Join order. Customer happy once it was explained.'],
				lookPaste: 'teams',
				ends: [
					[['a', 'Exactly: {staff} joined the team before you did, so she’s first. It’s not random, just the order people joined.'], ['c', 'Fair enough, now I know I can live with it. Thanks for explaining.']]
				],
				happy: true
			}
		]
	},
	// Invitations stay pending.
	{
		since: '2026-10-30',
		extra: 'members',
		subjects: ['Invitations stuck on pending', 'Invited staff can’t join', 'Invites not working?', 'How do people accept an invite?'],
		open: [
			'I invited three people to {team} last week using the new invite option and they still show as pending. They say they haven’t had anything. Have I done something wrong?',
			'Love the new invitations, but how do people actually accept them? {staff} has been “pending” since I invited her and she says there’s nothing to accept.',
			'I’ve invited my whole team using their email addresses and every one of them is still listed as pending. Is there a step I’ve missed?'
		],
		more: [
			'I need them on the rota for {day}.',
			'They’re all keen to get started.'
		],
		ask: [
			'Thanks for trying it so quickly. You haven’t done anything wrong. Could you tell me the email addresses you invited, so I can check what we have?',
			'Sorry for the confusion. Which team was it, and roughly how many people did you invite?'
		],
		paths: [
			{
				detail: ['Team {team}. I invited {n} people, including {staffEmail}.'],
				look: ['{n} pending invitations on team {teamId}. Invitations are only recorded for now: nothing is sent and there’s no way to accept one yet.'],
				lookPaste: 'teams',
				team: 'web team',
				ends: [
					[['w', 'Confirmed. Invitations are only recorded at the moment; accepting one is the next piece of accounts work. No date.'], ['a', 'I’m sorry: the invitations are recorded, but at the moment nothing is sent and there’s no way to accept one. That part is what the web team are building next. Your invitations will stay on the team page and will work once it’s ready. I’ll let you know.'], ['c', 'Hm, I thought the feature was finished. OK, let me know.']]
				]
			},
			{
				detail: ['{team}, {n} people. They already have accounts, if that helps.'],
				look: ['All {n} invitees already have accounts. The web team can add them to team {teamId} directly.'],
				lookPaste: 'teams',
				team: 'web team',
				ends: [
					[['w', 'Added the {n} invitees to team {teamId} as members by hand; their invitations are marked as used.'], ['a', 'The invitations can’t be accepted yet, but as your staff already have accounts, the web team have added them to {team} directly. They’ll see the team the next time they open Plover.'], ['c', 'Brilliant, they’re all there. Thank you.']]
				],
				happy: true
			},
			{
				detail: ['It was {team}. I’ll have to dig out the addresses, they’re on the office computer.'],
				look: ['Pending invitations on team {teamId}. Waiting for the addresses to see whether they already have accounts.'],
				lookPaste: 'teams',
				ends: [
					[['a', 'No rush. When you have them, send me the addresses: if your staff already have Plover accounts, we can add them to {team} for you while accepting invitations isn’t available yet.'], ['s', 'Automatic reminder sent to the customer after five days without a reply.']]
				]
			}
		]
	},
	// The team's owner has left.
	{
		extra: 'members',
		subjects: ['Team owner has left', 'Change team owner', 'Manager left, can’t manage team', 'Transfer ownership'],
		open: [
			'Our manager who set up our Plover team, {mgr}, has left the company. Nobody else can add people or change anything on the team. How do we get control of it back?',
			'I’ve taken over as {role} from {mgr}, who left in {month}. The team still says she’s the owner. Can it be moved to me?',
			'Bit of a problem: {mgr} owned all our teams and she’s gone, and she isn’t answering her phone. We can’t add anyone new.'
		],
		more: [
			'We have new starters waiting to be added.',
			'I’m happy to send anything you need to prove I’m who I say I am.'
		],
		ask: [
			'We can move ownership, but because it gives someone control of the team, we need confirmation from {biz} itself: an email from a director or the owner of the business, or a letter on headed paper. Could you arrange that?',
			'That’s fixable. For security we need the business to confirm the change, ideally in writing from someone senior. Who should own the team from now on?'
		],
		paths: [
			{
				detail: ['I’ve attached a letter from our director confirming I should be the owner. My account is {email}.'],
				look: ['Director’s letter attached, signed. {mgr} owns team {teamId}; {email} is a member. Asked the web team to move ownership.'],
				lookPaste: 'teams',
				team: 'web team',
				ends: [
					[['w', 'Moved ownership of team {teamId} to user {uid}; {mgr} stays a member until someone removes her.'], ['a', 'All done: you’re now the owner of {team} and can add people and manage the team. {mgr} is still listed as a member; tell us if you’d like her removed.'], ['c', 'Wonderful, thank you. Yes please, remove her too.'], ['w', 'Removed {mgr} from team {teamId}.']]
				],
				happy: true
			},
			{
				detail: ['I’ll ask our director, but she’s very hard to pin down. My account is {email}.'],
				look: ['Ownership change needs the business’s confirmation; waiting for the director.'],
				lookPaste: 'teams',
				ends: [
					[['a', 'Thanks. As soon as we have the director’s confirmation, the change takes a few minutes. Until then the team stays with {mgr}.'], ['c', 'I’ve asked twice. I’ll try again on {day}.'], ['s', 'Automatic reminder sent to the customer after five days without a reply.']]
				]
			},
			{
				detail: ['Confirmation from the owner of the business attached. My account is {email}. Is there really no way to do this myself? People leave all the time in this job.'],
				look: ['Owner’s confirmation attached. Moving ownership by hand; customer asks for a transfer option in the app.'],
				lookPaste: 'teams',
				team: 'web team',
				ends: [
					[['w', 'Moved team {teamId} to user {uid}. A transfer button for owners is on the list but not scheduled; it needs a decision on what happens when the old owner can’t confirm.'], ['a', 'You’re now the owner. On doing it yourself: an owner can’t yet hand a team over in the app. The web team have it on their list, but it’s not scheduled, because they need to work out what should happen when the old owner has gone, as here.'], ['c', 'Thanks. Please do push for it.']]
				]
			}
		]
	},
	// A duplicate team.
	{
		subjects: ['Duplicate team', 'Delete a team', 'Getting rid of a team'],
		open: [
			'I accidentally created two teams called “{team}”. I think I pressed the button twice. Can you delete one of them?',
			'We have an old team called “{team}” that we stopped using when we reorganised. How do I delete it?',
			'When I set us up I made a test team called “{team}” to see how it worked. Now it’s sitting there confusing everyone. Can I get rid of it?'
		],
		more: [
			'It shows on everyone’s list and people keep asking which is the right one.',
			'I couldn’t find a delete button.'
		],
		ask: [
			'We can remove it for you. Teams can’t be deleted in the app yet. Which one should go, and is anyone in it apart from you?',
			'There’s no delete option yet, but we can do it from our side. Could you confirm which team, and that you own it?'
		],
		paths: [
			{
				detail: ['The empty one, it only has me in it.'],
				look: ['Two teams called {team} owned by {email}: team {teamId} with {members} members and an empty one. Asked the web team to delete the empty one.'],
				lookPaste: 'teams',
				team: 'web team',
				ends: [
					[['w', 'Deleted the empty duplicate. No members, no invitations, no rotas attached.'], ['a', 'The duplicate is gone. Your real {team} team is untouched.'], ['c', 'Lovely, thank you.']]
				],
				happy: true
			},
			{
				detail: ['The old one. There are still {n} people in it who are also in the new team.'],
				look: ['Team has {n} members. The web team won’t delete teams with members by hand; deleting teams is coming to the app.'],
				lookPaste: 'teams',
				team: 'web team',
				ends: [
					[['a', 'Because the team still has people in it, the web team would rather not delete it by hand, as it would also remove its history from the planner. They’re adding a proper way for owners to delete a team, which deals with that. I’ll let you know when it’s available.'], ['c', 'OK, I’ll leave it for now.']]
				]
			},
			{
				detail: ['It’s the test one. Actually, if it’s a hassle, don’t worry. Nobody is in it but me.'],
				look: ['Empty test team. Customer happy to leave it.'],
				lookPaste: 'teams',
				ends: [
					[['a', 'It’s no trouble, but as nobody else is in it, nobody else sees it either: teams only appear for their members. If it’s only on your list, you can safely ignore it.'], ['c', 'Oh, I didn’t realise others couldn’t see it. Then I’ll leave it, thanks.']]
				],
				happy: true
			}
		]
	},
	// A member still in her old team.
	{
		extra: 'members',
		subjects: ['Remove someone from a team', 'Leaver still in our team', 'Can staff leave a team?'],
		open: [
			'{staff} moved from {team} to {team2} last month but she’s still showing in {team}. How do I take her out?',
			'One of my staff left us in {month} and she still appears on our team page. How do I remove her?',
			'{staff} works for another company now, but she says she can still see our team and our rota. How can she leave it?'
		],
		more: [
			'It matters because people can see each other’s shifts.',
			'I’ve looked for a remove option but can’t see one.'
		],
		ask: [
			'People can’t yet leave a team or be removed in the app, but we can do it for the team’s owner. Are you the owner? And could you confirm her name and the team?',
			'We can remove her for you. As the team’s owner needs to ask, could you confirm you own the team?'
		],
		paths: [
			{
				detail: ['Yes, I’m the owner. Please remove {staff} from {team}.'],
				look: ['Owner confirmed. Asked the web team to remove {staff} from team {teamId}.'],
				lookPaste: 'teams',
				team: 'web team',
				ends: [
					[['w', 'Removed the membership; user kept, as she’s still in another team.'], ['a', 'Done: {staff} is no longer in {team}. Her account and her other teams are unchanged.'], ['c', 'Thank you, that’s great.']]
				],
				happy: true
			},
			{
				detail: ['I’m not the owner, {mgr} is. I’ll ask her to email you.'],
				look: ['Owner of team {teamId} is {mgr}. Waiting for her.'],
				lookPaste: 'teams',
				ends: [
					[['a', 'Thanks. As soon as {mgr} confirms, we’ll remove {staff}.'], ['s', 'Automatic reminder sent to the customer after five days without a reply.'], ['c', 'Sorry, {mgr} is off sick. I’ll get her to reply when she’s back.']]
				]
			},
			{
				detail: ['I’m the owner. But can’t she just leave the team herself? It seems odd that I have to email you each time.'],
				look: ['Owner confirmed; removing by hand. Customer asks for a leave option.'],
				lookPaste: 'teams',
				team: 'web team',
				ends: [
					[['w', 'Removed. A leave option and a remove option for owners are both on the list; owners first.'], ['a', 'Done for now: {staff} is out of {team}. And I agree: the web team are adding a way for owners to remove people, and then for people to leave a team themselves. I’ve added your ticket to that request.'], ['c', 'Good, thanks. Please let me know when it’s there.']]
				]
			}
		]
	},
	// Working at two sites.
	{
		extra: 'members',
		shows: 'rota',
		subjects: ['Staff working at two sites', 'Two teams for one person?', 'See both rotas'],
		open: [
			'{staff} works for us at both of our sites, so she’s in two teams, {team} and {team2}. Is that allowed? She says she can only see one rota at a time.',
			'Can someone be in two teams? I have a few people who split their week between {team} and {team2}.',
			'We’ve opened a second site, and some staff will work at both. What’s the best way to set that up?'
		],
		more: [
			'I want to make sure nobody is booked at both places at once.',
			'We’re just getting started with the second site.'
		],
		ask: [
			'Yes, anyone can be in as many teams as they need. Could you tell me how you’d like to see things: is it about adding people to both teams, or about seeing both rotas together?'
		],
		paths: [
			{
				detail: ['Just adding them to both. I wasn’t sure it was allowed.'],
				look: ['Both teams owned by {email}. Nothing to change; explained.'],
				lookPaste: 'teams',
				ends: [
					[['a', 'It’s allowed and quite common. Each person appears once in each team they’re in, and their shifts from both teams appear on their own rota. As long as you own both teams, you can add people to each.'], ['c', 'Perfect, that’s what I needed to know.']]
				],
				happy: true
			},
			{
				detail: ['Seeing them together. She wants one weekly view, and I want to see if anyone is double-booked across the two.'],
				look: ['Both teams exist and {staff} is in both. The combined view is a planner question.'],
				lookPaste: 'teams',
				team: 'planner team',
				ends: [
					[['a', 'The teams side is all set up correctly. A combined weekly view and a warning for double bookings are both planner features, so I’ve passed your ticket to our planner team, who will come back to you.'], ['p', 'Combined view exists for members; managers can’t see clashes across teams yet. Will reply with the workaround and add the request.']]
				]
			}
		]
	},
	// The clocks went back.
	{
		since: '2026-10-26',
		extra: 'rotaSettings',
		subjects: ['Night shift hours wrong', 'Clocks going back', 'Hours wrong for Saturday night', 'Pay hours incorrect'],
		open: [
			'Our night staff worked an extra hour on Saturday night when the clocks went back, but the rota shows the usual length for the shift. Payroll takes the hours from your export, so they’ll be underpaid unless we catch it.',
			'The hours for last weekend’s night shift look wrong to me. Everyone on nights did an extra hour because of the clock change, and Plover hasn’t counted it.',
			'Quick one: does Plover know about the clocks changing? Our Saturday night shift came out an hour short.'
		],
		more: [
			'Payroll closes on the 1st, so we need to sort it before then.',
			'Three people worked that night, and they’ve all noticed.'
		],
		ask: [
			'Thanks for spotting it. That sounds like the planner’s hours calculation across the clock change. Could you send me the rota for that week, or the export, so I can pass it on with the details?'
		],
		paths: [
			{
				detail: ['Here it is, with the night shift highlighted in my head if not on the page.'],
				paste: 'rotaClocks',
				look: ['The planner counts the Saturday night shift at its usual length across the change; it should be an hour longer. Passed to the planner team.'],
				lookPaste: 'none',
				team: 'planner team',
				ends: [
					[['a', 'Thanks. I’ve passed it to our planner team, as the hours are worked out there. They’ll come back to you directly; in the meantime I’d add the extra hour by hand in payroll for anyone who worked that night.'], ['p', 'Confirmed: shift length is computed on the wall clock. Fix in progress; we’ll reissue exports for affected teams.']]
				]
			},
			{
				detail: ['Here’s the week.'],
				paste: 'rotaClocks',
				look: ['Same clock-change bug as the other reports. Planner already has a fix.'],
				lookPaste: 'none',
				team: 'planner team',
				ends: [
					[['P', 'Hello {name}, Brendan from the planner team. You’re right, and you weren’t the only one. The fix went out this morning: the night shift now includes the extra hour, and if you download the export again it will have the right totals.'], ['c', 'Just checked and it’s right now. Thanks for being so quick.']]
				],
				happy: true
			}
		]
	},
	// The printed rota is cut off.
	{
		extra: 'rotaSettings',
		shows: 'rota',
		subjects: ['Printing the rota', 'Rota won’t fit on the page', 'Print layout problem'],
		open: [
			'When I print the weekly rota, the Sunday column is cut off. It has always done it, but it’s got worse since we added more staff. Is there a print setting?',
			'Our printed rota for the staff board only shows Monday to Saturday. Where’s Sunday gone?',
			'The rota printout goes over two pages and the second page only has half a column on it. Any tips?'
		],
		more: [
			'We print every Friday for the board in the corridor.',
			'Our printer is an old office laser, if that matters.'
		],
		ask: [
			'Sorry about that. Which browser do you print from, and is the page set to portrait or landscape?'
		],
		paths: [
			{
				detail: ['Chrome, portrait I think. I’ve never changed it.'],
				look: ['Print layout question; planner. Suggested landscape and fit to page.'],
				lookPaste: 'none',
				ends: [
					[['a', 'Try landscape, and in Chrome’s print window open More settings and set Scale to Fit to page width. The weekly rota is designed for landscape, and with more than about fifteen staff portrait cuts off the last column.'], ['c', 'Landscape did it. Whole week on one page. Thank you!']]
				],
				happy: true
			},
			{
				detail: ['Already landscape. Firefox. Still cut off.'],
				paste: 'rota',
				look: ['Landscape already; still cut. Looks like a real print layout bug. Passed to the planner team.'],
				lookPaste: 'none',
				team: 'planner team',
				ends: [
					[['a', 'Thanks for checking. As landscape doesn’t help, this looks like a problem with the print layout itself, so I’ve passed it to our planner team with your rota. They’ll be in touch.'], ['p', 'Reproduced in Firefox with long names: the last column overflows. On the list.']]
				]
			}
		]
	},
	// The payroll export.
	{
		extra: 'rotaSettings',
		subjects: ['Export hours wrong', 'Payroll export problem', 'Hours in CSV don’t add up'],
		open: [
			'The hours in the payroll export don’t match the rota for anyone on a split shift. It looks as if the break is being taken off twice. Our payroll bureau has flagged it.',
			'I downloaded the export for payroll this week and some of the totals are wrong. Some people seem to be half an hour short every time.',
			'Can you check the export? {staff}’s hours come out short every week, and she’s the only one doing split shifts.'
		],
		more: [
			'We pay weekly, so it adds up quickly.',
			'Our bureau needs a corrected file by {day}.'
		],
		ask: [
			'Thanks. Could you send the rows that look wrong, and tell me how the break is set up for that shift?'
		],
		paths: [
			{
				detail: ['Here are the rows. The break is set on the shift as 30 minutes.'],
				paste: 'payroll',
				look: ['Split shifts lose the break twice in the export. Planner bug. Passed on.'],
				lookPaste: 'none',
				team: 'planner team',
				ends: [
					[['a', 'You’re right: for split shifts the export takes the break off each half. I’ve passed it to our planner team, who look after the export, and they’ll come back to you. Until it’s fixed, the rota page itself has the right totals.'], ['p', 'Confirmed: the break is deducted per segment. Fix in progress, reply to follow.']]
				]
			},
			{
				detail: ['Rows below. Break is 30 minutes, set as a team default I think.'],
				paste: 'payroll',
				look: ['Team default break plus a break on the shift itself, so it’s taken twice. Settings, not a bug.'],
				lookPaste: 'none',
				ends: [
					[['a', 'Found it: the team has a default break of 30 minutes, and those shifts also have their own 30-minute break, so the export takes off both. If you remove the break from the shifts and keep the team default, the totals will be right. The rota page shows the same, so it’s worth a quick look.'], ['c', 'Removed them and exported again; it matches now. Thanks so much.']]
				],
				happy: true
			}
		]
	},
	// Holiday requests.
	{
		extra: 'requests',
		shows: 'rota',
		subjects: ['Holiday requests', 'Booking time off', 'Holiday booking question'],
		open: [
			'My staff can request single days off, but not a whole week. {staff} wants the week after Christmas and has had to put in five separate requests. Is there a way to do a range?',
			'Is there a way for staff to book holiday in Plover, or do they still have to ask me? I’ve seen something about requests but can’t find it.',
			'Some of my staff’s holiday requests seem to disappear. {staff} says she put one in for {month} and I never saw it.'
		],
		more: [
			'December is always chaos for us.',
			'We’ve only been using Plover for a couple of months.'
		],
		ask: [
			'Holiday requests are part of the planner, so let me get the details right before I pass this on. Which team is it, and do you approve requests yourself in the planner?'
		],
		paths: [
			{
				detail: ['{team}, and yes, I approve them.'],
				look: ['Holiday requests: planner. Passed to the planner team.'],
				lookPaste: 'none',
				team: 'planner team',
				ends: [
					[['a', 'Thanks. I’ve passed this to our planner team, as requests are handled there, and they’ll reply to you directly.'], ['p', 'Date ranges are planned. Missing requests: will check the team’s request log and reply.']]
				]
			},
			{
				detail: ['{team}. I approve them, yes.'],
				look: ['Ranges not supported yet; suggested a single request with a note.'],
				lookPaste: 'none',
				ends: [
					[['a', 'Ranges aren’t possible yet, but there’s a way round it: staff can make one request for the first day and write the full dates in the note, and you can block out the rest of the week from the rota when you approve it. Other managers find that quicker than five requests.'], ['c', 'That’s a good idea, we’ll do that. Thanks.']]
				],
				happy: true
			}
		]
	},
	// The Christmas rota.
	{
		extra: 'rotaSettings',
		shows: 'rota',
		subjects: ['Christmas rota', 'Bank holidays', 'Planning December'],
		open: [
			'We’re starting the Christmas rota. Does Plover know about the bank holidays, and can it show which staff have already worked the last two Christmases?',
			'Is there a way to mark 25 and 26 December as bank holidays so the hours are counted differently?',
			'Every year we argue about who worked Christmas last time. Does Plover keep that?'
		],
		more: [
			'We’re open every day of the year.',
			'I’d like to publish the December rota by the middle of November.'
		],
		ask: [
			'Thanks for planning ahead! A couple of questions so I can give you the right answer: are you paying a different rate on bank holidays, and do you need the history for the whole team or just a few people?'
		],
		paths: [
			{
				detail: ['Double time on the day itself, and the whole team, please.'],
				look: ['Answered: bank holidays are marked automatically, history lives in the planner’s reports.'],
				lookPaste: 'none',
				ends: [
					[['a', 'Bank holidays are marked on the rota automatically, and in the export they have their own column, so your payroll can apply double time. For history, the planner’s Reports page can show each person’s shifts on chosen dates, so you can pick 25 December in the last two years.'], ['c', 'That’s great, I found the report. Thank you.']]
				],
				happy: true
			},
			{
				detail: ['Different rates for different staff, depending on their contract.'],
				look: ['Per-contract rates are a planner question. Passed on.'],
				lookPaste: 'none',
				team: 'planner team',
				ends: [
					[['a', 'Rates that differ by contract are set in the planner, so I’ve passed your ticket to our planner team, who will come back to you with how to set it up.'], ['p', 'Will reply with the per-contract pay rules setup.']]
				]
			}
		]
	},
	// Charged twice.
	{
		extra: 'billing',
		subjects: ['Charged twice', 'Double payment this month', 'Two invoices this month?'],
		open: [
			'We seem to have been charged twice this month. Two payments of the same amount came out of our account. Can you check?',
			'Our bookkeeper has spotted two invoices for the same period. Could you look into it and refund one?',
			'Two payments to Plover Rota on my card statement this month. Is that right?'
		],
		more: [
			'It’s not a fortune, but we’re a small business.',
			'Our bookkeeper reconciles on Fridays, so she’ll want an answer.'
		],
		ask: [
			'Sorry about that. Could you tell me the dates and amounts of both payments, and the last four digits of the card? I’ll get billing to check.'
		],
		paths: [
			{
				detail: ['Here’s what the billing page shows. Card ending {card}.'],
				paste: 'doubleInvoice',
				look: ['Two invoices for the same period. Passed to billing.'],
				lookPaste: 'none',
				team: 'billing team',
				ends: [
					[['a', 'Thanks. I can see two invoices for the same period, so I’ve passed this to Olu in billing, who will arrange the refund and confirm to you.'], ['B', 'Hello {name}, Olu from billing. The second payment was taken in error when your card was updated. I’ve refunded {total} to the card ending {card}; it will show in three to five working days.'], ['c', 'Thank you, that’s very clear.']]
				],
				happy: true
			},
			{
				detail: ['I’ll have to check with our bookkeeper for the card details.'],
				look: ['Possibly a double charge; waiting for the details.'],
				lookPaste: 'invoices',
				ends: [
					[['a', 'No problem. When you have them, the dates, amounts and last four digits are all billing need to find it.'], ['s', 'Automatic reminder sent to the customer after five days without a reply.']]
				]
			}
		]
	},
	// A VAT invoice.
	{
		extra: 'billing',
		subjects: ['VAT invoice', 'Invoice with our VAT number', 'Company details on invoices'],
		open: [
			'Our accountant needs a proper VAT invoice with our company name, address and VAT number on it. The ones we get just have my name.',
			'Can you reissue last quarter’s invoices with the business name on them rather than mine?',
			'Where do I put our VAT number so it appears on the invoices?'
		],
		more: [
			'Our year end is coming up.',
			'Our accountant has asked twice now.'
		],
		ask: [
			'Of course. Could you send the company name, address and VAT number exactly as they should appear?'
		],
		paths: [
			{
				detail: ['{biz} Ltd, {street}, VAT number GB {vat}.'],
				look: ['Updated the billing details. Reissue needed from billing.'],
				lookPaste: 'invoices',
				team: 'billing team',
				ends: [
					[['a', 'Thanks. I’ve passed this to Olu in billing, who will add the details to your account and reissue the invoices.'], ['B', 'Hello {name}, Olu from billing. I’ve added your company details and VAT number, and reissued the last three invoices; they’re attached. Future invoices will show them too.'], ['c', 'Perfect, thank you.']]
				],
				happy: true
			},
			{
				detail: ['Company name and address as on the attached letterhead. VAT number GB {vat}.'],
				look: ['Billing details can be edited by the account owner on the billing page.'],
				lookPaste: 'invoices',
				ends: [
					[['a', 'You can add these yourself: on the billing page there’s an Invoice details section where you can enter the company name, address and VAT number. Every invoice from then on will show them, and you can download earlier invoices again with the new details.'], ['c', 'Found it and done. The old invoices downloaded fine with the new details. Thanks.']]
				],
				happy: true
			}
		]
	},
	// Paying for people who have left.
	{
		extra: 'billing',
		shows: 'invoices',
		subjects: ['Paying for staff who’ve left', 'Bill seems too high', 'Charged for leavers'],
		open: [
			'Our bill has gone up even though we have fewer staff than in the summer. Are we still paying for people who left?',
			'We’re being charged for {members} members, but we only have about {n2} staff now. Can you explain?',
			'Is the price per person on the rota or per account? We’ve been charged for more people than work here.'
		],
		more: [
			'Nobody told me how the bill was worked out when we joined.',
			'We had a lot of seasonal staff over the summer.'
		],
		ask: [
			'Billing is per member of your teams. Could you tell me which teams you have, and whether people who have left are still in them?'
		],
		paths: [
			{
				detail: ['Probably, yes. I didn’t know I had to remove them.'],
				look: ['{members} members across {teamCount} teams; several leavers still in. Passed the billing question to Olu.'],
				lookPaste: 'teams',
				team: 'billing team',
				ends: [
					[['a', 'That’s it: people who leave stay in the team, and the bill counts them, until they’re removed. As removing people isn’t in the app yet, we can do it for you if you send a list. I’ve also asked billing whether they can credit the last month.'], ['B', 'Hello {name}, Olu from billing. Once the team is tidied up, I’ll credit last month for the people who had left. Reply here with the list and I’ll sort it.']]
				]
			},
			{
				detail: ['Yes, there are about {n} summer staff still in there. List attached.'],
				look: ['Removed the {n} leavers on the owner’s list; billing credited last month.'],
				lookPaste: 'teams',
				ends: [
					[['w', 'Removed {n} members from team {teamId}, as listed by the owner.'], ['a', 'All done: the {n} people on your list are out of the team, so your next invoice will be lower, and Olu in billing has credited last month for them.'], ['c', 'Thank you, that’s a relief.']]
				],
				happy: true
			}
		]
	},
	// A charity discount.
	{
		extra: 'billing',
		subjects: ['Charity discount?', 'Discount for a registered charity', 'Pricing for charities'],
		open: [
			'We’re a registered charity. Do you offer a discount?',
			'We’re a small charity and most of our rota is volunteers. Is there any way to bring the cost down?',
			'Does Plover have charity pricing? Our trustees have asked me to check before we renew.'
		],
		more: [
			'We’d pay annually if that helps.',
			'Our charity number is on our letterhead.'
		],
		ask: [
			'Thanks for asking. Could you send your charity number and roughly how many people are on the rota?'
		],
		paths: [
			{
				detail: ['Charity number {charity}. About {n2} people, mostly volunteers.'],
				look: ['Charity, {n2} on the rota. Passed to billing.'],
				lookPaste: 'invoices',
				team: 'billing team',
				ends: [
					[['a', 'Thanks. I’ve passed this to Olu in billing, who decides on charity pricing.'], ['B', 'Hello {name}, Olu from billing. Registered charities get 30 percent off, and I’ve applied it from your next invoice. Thank you for the work you do.'], ['c', 'That’s wonderful, thank you.']]
				],
				happy: true
			},
			{
				detail: ['Charity number {charity}, about {n2} people.'],
				look: ['Charity discount needs billing’s approval. Passed on.'],
				lookPaste: 'invoices',
				team: 'billing team',
				ends: [
					[['a', 'I’ve passed your request to Olu in billing, who handles charity pricing. You’ll hear from him here.'], ['b', 'Will check the charity register and reply about the discount.']]
				]
			}
		]
	},
	// A subject access request.
	{
		subjects: ['Request for personal data', 'Subject access request', 'Copy of my data'],
		open: [
			'A former member of staff has asked us for a copy of all the personal data we hold about her, including anything in Plover. What can you give us?',
			'I’m writing on behalf of {staffFull}, who used to work for us. She has made a subject access request and we need anything Plover holds about her.',
			'An employee has asked for everything held about her. Can Plover provide an export of her data?'
		],
		more: [
			'We have a month to respond, so not urgent today.',
			'Our HR adviser told us to ask each supplier.'
		],
		ask: [
			'Thanks. Data requests go to our data protection lead, Grace. Could you tell me the email on the person’s account, and whether the request came to you or directly to her?'
		],
		paths: [
			{
				detail: ['Her email was {staffEmail}. She asked us in writing.'],
				look: ['{staffEmail}, member of {team}. Passed to Grace.'],
				lookPaste: 'staffAccount',
				team: 'data protection lead',
				ends: [
					[['a', 'Thank you. I’ve passed this to Grace, our data protection lead, who will prepare what we hold and send it to you securely.'], ['D', 'Hello {name}, Grace here. I’ll prepare an export of {staff}’s account and shift history within two weeks and send it to you securely.']]
				]
			},
			{
				detail: ['I don’t have her email to hand, I’ll find it.'],
				look: ['No account identified yet.'],
				lookPaste: 'none',
				ends: [
					[['a', 'No problem. Once you have it, send it here and I’ll pass everything to Grace.'], ['s', 'Automatic reminder sent to the customer after five days without a reply.']]
				]
			}
		]
	},
	// A security questionnaire.
	{
		subjects: ['Security questionnaire', 'Supplier security questions', 'IT questions from head office'],
		open: [
			'Our group’s IT team has sent a security questionnaire that all our suppliers have to fill in. I’ve pasted the questions below. Could you help?',
			'Before we sign up our other sites, our IT department want answers to a few security questions. They’re below.',
			'Head office have asked me to get these questions answered by Plover by the end of the month.'
		],
		more: [
			'I’m not technical, so I’ll forward your answers as they are.',
			'Sorry it’s so long!'
		],
		ask: [
			'Happy to help. I’ll get answers from the right people. Is there a deadline we should know about?'
		],
		paths: [
			{
				detail: ['End of next week, ideally. Questions as below.'],
				paste: 'questionnaire',
				look: ['Questionnaire passed to Rhiannon for the technical answers.'],
				lookPaste: 'none',
				team: 'web team',
				ends: [
					[['w', 'Answered the lot; attached as a document. Two answers they might not like: no single sign-on yet, and no two-factor yet.'], ['a', 'Here are the answers from our technical team, attached. Two of them are “not yet”: single sign-on and two-factor sign-in. Everything else should be what your IT team want to hear.'], ['c', 'Thank you, sent on. They seem happy.']]
				],
				happy: true
			},
			{
				detail: ['The end of the month. Questions below.'],
				paste: 'questionnaire',
				look: ['Some of these need our technical lead; passed on.'],
				lookPaste: 'none',
				team: 'web team',
				ends: [
					[['a', 'I’ve answered what I can and passed the technical questions to our technical lead, who will reply here before your deadline.'], ['c', 'Thank you. I’ll wait for the rest.']]
				]
			}
		]
	},
	// Is there an app?
	{
		subjects: ['Is there an app?', 'Phone app', 'Plover app?'],
		open: [
			'Is there a Plover app? Some of my staff say they can’t find one in the app store.',
			'One of my team found an app called Plover on Android. Is that you? It asked for a lot of permissions.',
			'Do you have an app for iPhone? It would be much easier for staff than the website.'
		],
		more: [
			'Most of our staff only have phones, not computers.',
			'I’d like to tell everyone the same thing.'
		],
		ask: [
			'Thanks for checking. We don’t have an app; Plover works in the phone’s browser. Do you know which phones your staff mostly use?'
		],
		paths: [
			{
				detail: ['Mostly Android, a few iPhones.'],
				look: ['Answered: no app. Suggested adding Plover to the home screen.'],
				lookPaste: 'none',
				ends: [
					[['a', 'On both, staff can add Plover to the home screen from the browser’s menu (Add to Home screen), and it then opens like an app. Anything called Plover in an app store isn’t ours, so please tell staff not to install it.'], ['c', 'Thanks, I’ve told everyone. The home screen trick works well.']]
				],
				happy: true
			},
			{
				detail: ['Mostly iPhones. Are you planning an app?'],
				look: ['No app planned this year; answered.'],
				lookPaste: 'none',
				ends: [
					[['a', 'Not this year. On an iPhone, open Plover in Safari, tap Share and then Add to Home Screen, and it will open like an app.'], ['c', 'That works. Thanks.']]
				],
				happy: true
			}
		]
	}
];

// Shared pieces, combined with every topic.
/** A one-line aside in the first message, and support's answer to it. */
const tangents: [string, string][] = [
	['Also, is there a way to change the colours of the shifts? Nights in grey are hard to read on our screen.', 'On colours: they’re fixed for now, but I’ve passed the idea on to the planner team.'],
	['Unrelated, but do you offer a discount if we pay for the year?', 'On annual billing: yes, paying yearly gives you two months free. Reply if you’d like to switch and I’ll ask billing.'],
	['While I have you, is there a phone number I can ring?', 'On phoning us: we’re email only for now, but we answer within the working day.'],
	['Can staff see each other’s phone numbers on the rota?', 'On phone numbers: only managers can see them.'],
	['Do you have a guide for new managers?', 'On the guide: I’ve attached our getting-started guide as a PDF.'],
	['We’re opening a second site in the spring. Will that cost more?', 'On the second site: pricing is per member, not per site.'],
	['Small thing: the printout starts the week on Monday, and we start ours on Sunday.', 'On the week start: that’s a planner setting under Rota options.'],
	['Do you work with our payroll software?', 'On payroll: there’s no direct connection, but most payroll software takes our export.'],
	['Is our data kept in the UK?', 'On where data is kept: yes, in the UK.'],
	['Does the rota work without signal? Our basement is a dead zone.', 'On signal: you need a connection to load the rota, but the last one you opened stays on screen.'],
	['Could we put our logo on the rota?', 'On logos: not yet, sorry.'],
	['You’ve spelt our business name wrong on the invoice, by the way.', 'On the invoice: I’ve asked billing to correct the name and reissue it.']
];
/** A second matter the customer raises in a later message: the question, support's answer, and a word of thanks. */
const sides: { q: string; a: string; then: string }[] = [
	{ q: 'Separate question: can I let my deputy, {staff2}, edit the rota without making her the owner of the team? I’m away for a fortnight in {nextMonth} and someone needs to cover.', a: 'On letting {staff2} edit the rota: yes. In the planner, under Rota options and then Managers, you can add her as a rota manager for {team}. She can then edit and publish rotas, but she can’t change the team itself.', then: 'Thanks for the tip about rota managers, {staff2} is set up now.' },
	{ q: 'Also, a few of the staff have asked why they can see everyone else’s shifts and not just their own. Is that something I can change?', a: 'On who sees what: each team has a setting in the planner, under Rota options, for whether members see the whole rota or only their own shifts. Most teams leave the whole rota visible so people can arrange swaps between themselves.', then: 'We’ve left the rota visible to everyone in the end; people prefer it.' },
	{ q: 'One more thing. We take on about {n} extra people for December every year. How does that work with the bill? I don’t want to pay for them all year.', a: 'On your December staff: you pay for the members you have in each month, so once they’re out of the team in January they stop counting. Send us the list in January and we’ll take them out for you.', then: '' },
	{ q: 'While I’m writing: can we import our staff from a spreadsheet? Typing in {N} people is going to take me all afternoon.', a: 'On importing staff: the planner takes a spreadsheet saved as CSV, one person per row, under Rota options and then Import. It needs a name and an email for each person; everything else is optional.', then: 'The import worked a treat, by the way.' },
	{ q: 'Also, is there any training for new managers? We have two starting next month and I’d rather they didn’t learn by trial and error like I did.', a: 'On training: we run a thirty-minute video call for new managers every Tuesday at 10:00. Reply with their names and I’ll book them in.', then: 'Please book {staff2} onto the Tuesday session on the {tuesday}.' },
	{ q: 'Can the rota show when a shift is short of people? We need at least {n} on every shift and it’s easy to miss a gap when I’m rushing.', a: 'On short shifts: the planner has cover levels. Set the minimum for each shift under Rota options and then Cover, and any shift below it is shown in red on the rota.', then: 'The cover levels are brilliant. I wish I’d known about them sooner.' },
	{ q: 'Something else: the rota page was very slow first thing on Monday. Was that just us?', a: 'On Monday morning: it wasn’t just you. The rota pages were slow for about forty minutes while a lot of rotas were published at once, and the planner team have changed how publishing works so it shouldn’t happen again.', then: '' },
	{ q: 'We use agency staff on some nights. Should they have their own accounts, or is there another way?', a: 'On agency staff: most teams give regular agency workers their own accounts and add them to the team, then take them out when the placement ends. For a one-off shift you can just type their name on the rota without an account.', then: '' },
	{ q: 'Can staff see each other’s pay rates anywhere? One of them says she could, and I’d be mortified.', a: 'On pay rates: only rota managers and team owners can see them, never members. If someone saw rates, it was probably on a printout made by a manager, which includes them unless you untick Pay rates in the print options.', then: 'It was the printout. Mystery solved, and I’ve unticked it.' },
	{ q: 'Could you send me your terms and your data processing agreement? Our group asks for them for every supplier.', a: 'On the paperwork: I’ve attached our terms of service and our data processing agreement as PDFs. If your group needs the agreement signed, send it back and we’ll countersign it.', then: 'Thanks for the documents, they’ve gone to head office.' },
	{ q: 'Is it possible to move our payment date to the 15th? Our income comes in mid-month.', a: 'On the payment date: billing can move it. I’ve passed that part to Olu, who will confirm the new date with you separately.', then: '' },
	{ q: 'Small one: can I print a blank rota for the week, with names but no shifts? Some of the older staff like to write their availability on paper.', a: 'On a blank rota: in the planner’s print options there’s Empty week, which prints the names and the days with blank boxes.', then: 'The blank printout is exactly what we needed.' },
	{ q: 'Can the rota show who’s a first aider or a key holder? We need one of each on every shift.', a: 'On first aiders and key holders: in the planner you can give people tags, such as First aid or Keys, and set a cover level per tag, so a shift without a key holder shows in red.', then: '' },
	{ q: 'We have two staff who are seventeen. Does Plover know about the rules on their hours?', a: 'On your seventeen-year-olds: in the planner you can mark someone as a young worker, and the rota warns you when their shifts break the limits for under-18s: eight hours a day, forty a week, and twelve hours off between shifts.', then: '' },
	{ q: 'Are your prices going up next year? I need to set our budget.', a: 'On prices: there’s no increase planned for existing customers before April, and we give three months’ notice of any change.', then: '' },
	{ q: 'Lastly, can we have different colours for different teams on the combined rota? With {team} and {team2} together it’s a sea of blue.', a: 'On colours: not yet, but the planner team are working on team colours and I’ve added your vote.', then: '' },
	{ q: 'One of my staff, {staff2}, has asked whether her phone number has to be in Plover at all. She’d rather it wasn’t.', a: 'On phone numbers: they’re optional. They live in the planner’s staff list, only managers can see them, and you can delete {staff2}’s whenever you like.', then: '' },
	{ q: 'Can I see who changed a shift? Someone moved {staff2} from a late to an early and nobody will own up.', a: 'On who changed the shift: every shift has a history in the planner. Open the shift and choose History, and it lists each change with who made it and when.', then: 'The shift history settled it, thank you. It was me, as it turns out.' },
	{ q: 'Do you have a way for staff to swap shifts without coming through me every time?', a: 'On swaps: the team owner can turn on Swaps in the planner’s Rota options. Staff then offer a shift, a colleague takes it, and you can choose whether you approve each swap or let them go through.', then: '' },
	{ q: 'We’re thinking of adding our cleaners to Plover too, but they’re employed by a contractor. Is that a problem?', a: 'On the cleaners: not at all. Many teams include contractors; they just need an account each, and you can keep them in a team of their own if you’d rather they didn’t see the main rota.', then: '' },
	{ q: 'Is there a way to see how many hours each person has done this month? I’m trying to spread the overtime fairly.', a: 'On hours this month: the planner’s Reports page has Hours by person for any date range, and you can download it as a spreadsheet.', then: 'Found the hours report, thanks. Very handy.' }
];
const contexts = [
	'We moved to Plover in {signupMonth} from a spreadsheet that only {staff2} really understood, and on the whole it has been a big improvement.',
	'We’ve been using Plover since {signupMonth}. Most of the staff check it on their phones; a few still rely on the printout on the wall.',
	'For context, we switched to Plover in {signupMonth} after the old whiteboard got wiped one time too many.',
	'We’re fairly new to Plover and I’m still finding my way around, so forgive me if this is obvious.',
	'I look after the rota for {team} and {team2}, and {staff2} does the rest.',
	'I’m the only one here who deals with the Plover side of things, so everything comes to me.'
];
/** How things stand for the customer this week, in passing. */
const situations = [
	'It’s been a mad week here: {staff2} is off with flu and I’m covering {team} myself.',
	'We’re short-staffed at the moment, so I’m doing the rota at home in the evenings.',
	'Our busy season is about to start, which is why I’m trying to get everything straight now.',
	'Sorry for the long message; I’d rather give you too much detail than too little.',
	'I’ve already spent an hour on this before writing, so I’m hoping you can tell me what I’m missing.',
	'Our area manager is visiting on {day}, so I’d love to have this sorted before then.',
	'I asked {staff2}, who is usually good with this sort of thing, but she was stumped too.',
	'Not the end of the world, but it’s one of those things that eats time every week.',
	'You were very helpful the last time I wrote in, so I’m hoping for the same luck.',
	'I want to get this straight before the Christmas rota, which is always the hardest of the year.'
];
/** A last line support may add to a reply. */
const closings = [
	'If anything else comes up, just reply here and it comes straight back to me.',
	'Shout if any of that isn’t clear.',
	'I’ll keep this ticket open until I hear from you.',
	'Sorry again for the bother.'
];
const disclaimers = [
	'This email and any files sent with it are confidential and intended only for the person or organisation to whom they are addressed. If you have received it in error, please tell the sender and delete it.',
	'Please consider the environment before printing this email.',
	'{biz} is registered in England and Wales. Registered office: {street}.',
	'This message was sent from a shared mailbox. Replies are read by the whole office team.'
];
const greetings = ['Hi', 'Hello', 'Hi there', 'Good morning', 'Morning', 'Hiya', 'Hello Plover team', 'Dear Plover Rota'];
const custSign = ['Thanks, {name}', 'Many thanks\n{full}', '{name}', 'Cheers, {name}', 'Kind regards,\n{full}\n{role}, {biz}\n{phone}', 'Thanks\n{name}\n\nSent from my iPhone', 'Best wishes,\n{full}\n{role}'];
const acks = ['Thanks for getting in touch.', 'Thanks for your message, and sorry for the trouble.', 'Thanks for writing in.', 'Sorry to hear that.', 'Thanks for the clear description.', ''];
const agentSign = ['Best wishes,\n{signer}', '{signer}\nPlover Rota', 'Thanks,\n{signer}', 'Kind regards,\n{signer} at Plover Rota'];
const holding = [
	'Quick update: I’ve asked the {team} to take a look, and I’ll come back to you by {day}.',
	'Thanks for bearing with us. I’m still waiting to hear back from the {team}; I haven’t forgotten you.',
	'Just to let you know this is with the {team} now. I’ll update you as soon as I hear.'
];
const chasers = ['Any news on this?', 'Just checking you got my last message.', 'Sorry to chase, but the rota goes up on {day}.', 'Hello? It’s been a few days.', 'Any update? {staff} keeps asking me.'];
const surveys: [string, string][] = [['Great', 'Quick and friendly.'], ['Good', 'Sorted in the end, thanks.'], ['Great', '{agent} was brilliant.'], ['OK', 'Took a while but got there.'], ['Good', 'Clear answers.'], ['Great', 'Really helpful, thank you.'], ['Good', '']];

// Pasted output.
interface AccountRow {
	uid: number;
	email: string;
	name: string;
	signup: string;
	last: string;
	sessions: number;
}
const accountTable = (rows: AccountRow[]) =>
	['| User | Email | Name | Signed up | Last sign-in | Sessions |', '| ---: | --- | --- | --- | --- | ---: |', ...rows.map((row) => `| ${row.uid} | ${row.email} | ${row.name} | ${row.signup} | ${row.last} | ${row.sessions} |`)].join('\n');
interface TeamRow {
	id: number;
	title: string;
	owner: string;
	role: string;
	members: number;
	pending: number;
	created: string;
}
const teamTable = (rows: TeamRow[], invitations: boolean) =>
	(invitations
		? ['| Team | Title | Owner | Role | Members | Pending invitations | Created |', '| ---: | --- | --- | --- | ---: | ---: | --- |', ...rows.map((row) => `| ${row.id} | ${row.title} | ${row.owner} | ${row.role} | ${row.members} | ${row.pending} | ${row.created} |`)]
		: ['| Team | Title | Owner | Role | Members | Created |', '| ---: | --- | --- | --- | ---: | --- |', ...rows.map((row) => `| ${row.id} | ${row.title} | ${row.owner} | ${row.role} | ${row.members} | ${row.created} |`)]
	).join('\n');
const userAgents = ['Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) Safari/604.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/129.0 Safari/537.36', 'Mozilla/5.0 (Linux; Android 14; SM-A146B) Chrome/129.0 Mobile Safari/537.36', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) Safari/605.1.15', 'Mozilla/5.0 (Windows NT 10.0; Trident/7.0; rv:11.0) like Gecko', 'Mozilla/5.0 (iPad; CPU OS 17_7 like Mac OS X) Safari/604.1'];
const loginLog = (r: Rand, end: number, uid: number, team: number, kind: 'reset' | 'error' | 'plain') => {
	const lines: string[] = [];
	let t = end - int(r, 2, 6) * 1440 - int(r, 0, 600);
	const count = int(r, 12, 24);
	for (let i = 0; i < count; i++) {
		t += int(r, 5, 900);
		if (minuteOfDay(t) < 6 * 60 + 15) t = startOfDay(t) + 6 * 60 + 15 + int(r, 0, 120);
		if (minuteOfDay(t) > 23 * 60) t = startOfDay(t) + 1440 + 6 * 60 + 15 + int(r, 0, 120);
		const d = at(t);
		const stamp = `${d.toISOString().slice(0, 10)} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(int(r, 0, 59))}`;
		const roll = r();
		const ua = kind === 'error' && r() < 0.5 ? userAgents[4]! : pick(r, userAgents.filter((agent) => !agent.includes('Trident')));
		let line: string;
		if (kind === 'error' && roll < 0.35) line = `${stamp}  POST /login                 500  ${pad(int(r, 4, 19))} ms  user=-      ua="${ua}"`;
		else if (kind === 'reset' && i === Math.floor(count / 2)) line = `${stamp}  POST /reset-password        200  ${int(r, 60, 140)} ms  user=-      ua="${ua}"`;
		else if (roll < 0.5) line = r() < 0.3 ? `${stamp}  POST /login                 401  ${int(r, 60, 140)} ms  user=-      ua="${ua}"` : `${stamp}  POST /login                 200  ${int(r, 60, 140)} ms  user=${uid}  ua="${ua}"`;
		else if (roll < 0.85) line = `${stamp}  GET  /teams/${team}/members  200  ${pad(int(r, 3, 30))} ms  user=${uid}  ua="${ua}"`;
		else line = `${stamp}  POST /logout                200  ${pad(int(r, 2, 9))} ms  user=${uid}  ua="${ua}"`;
		lines.push(line);
	}
	return 'Requests for this account, from the production log:\n\n```text\n' + lines.join('\n') + '\n```';
};
const error500 = (r: Rand) => {
	const [browser, os] = pick(r, [
		['Internet Explorer 11 (compatibility view on)', 'Windows 10 Pro 22H2'],
		['Edge 129 in Internet Explorer mode', 'Windows 10 Enterprise 21H2'],
		['Internet Explorer 11', 'Windows 8.1'],
		['Edge 128 in Internet Explorer mode', 'Windows 11 Pro 23H2']
	] as const);
	return ['What the page shows:', '', '```text', 'Internal server error', '```', '', 'From the about page:', '', '```text', `Browser: ${browser}`, `Operating system: ${os}`, `Screen: ${pick(r, ['1366 × 768', '1280 × 1024', '1920 × 1080', '1440 × 900'])}`, 'Cookies: on', 'JavaScript: on', `Password manager: ${pick(r, ['RoboForm 9', 'none', 'the browser’s own', 'LastPass (company policy)'])}`, '```'].join('\n');
};
const rotaTable = (r: Rand, people: string[], shifts: string[], monday: number) => {
	const head = ['Name'];
	for (let i = 0; i < 7; i++) head.push(`${weekday(monday + i * 1440).slice(0, 3)} ${at(monday + i * 1440).getUTCDate()}`);
	const rows = [`| ${head.join(' | ')} |`, `| --- |${' --- |'.repeat(7)}`];
	for (const person of people) {
		const cells = [person];
		for (let i = 0; i < 7; i++) cells.push(r() < 0.35 ? 'off' : r() < 0.06 ? 'holiday' : pick(r, shifts));
		rows.push(`| ${cells.join(' | ')} |`);
	}
	return rows.join('\n');
};
const overnight = (shift: string) => shift.slice(6) < shift.slice(0, 5);
const shiftHours = (shift: string) => {
	const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
	return ((minutes(shift.slice(6)) - minutes(shift.slice(0, 5)) + 1440) % 1440) / 60;
};
const rotaClocks = (r: Rand, people: string[], shifts: string[]) => {
	const night = shifts.find(overnight)!;
	const rows = ['Week of 19 October, as exported:', '', '| Name | Mon 19 | Tue 20 | Wed 21 | Thu 22 | Fri 23 | Sat 24 | Sun 25 | Hours |', '| --- | --- | --- | --- | --- | --- | --- | --- | ---: |'];
	for (const person of people) {
		const cells = [person];
		let hours = 0;
		for (let i = 0; i < 7; i++) {
			const cell = i === 5 && r() < 0.6 ? night : r() < 0.4 ? 'off' : pick(r, shifts);
			cells.push(cell);
			hours += cell === 'off' ? 0 : shiftHours(cell);
		}
		cells.push(hours.toFixed(1));
		rows.push(`| ${cells.join(' | ')} |`);
	}
	return rows.join('\n');
};
const payroll = (r: Rand, people: string[], team: string, monday: number) => {
	const lines = ['employee,team,date,start,end,break_minutes,paid_hours'];
	const split = pick(r, people);
	const splitDays = new Set<string>();
	for (let i = int(r, 10, 18); i > 0; i--) {
		const day = iso(monday + int(r, 0, 6) * 1440);
		const who = r() < 0.35 && !splitDays.has(day) ? split : pick(r, people.filter((person) => person !== split));
		if (who === split) {
			splitDays.add(day);
			lines.push(`${who},${team},${day},07:00,11:00,30,3.50`, `${who},${team},${day},16:00,20:00,30,3.50`);
		} else {
			const start = int(r, 6, 13);
			const length = int(r, 5, 9);
			lines.push(`${who},${team},${day},${pad(start)}:00,${pad(start + length)}:00,30,${(length - 0.5).toFixed(2)}`);
		}
	}
	return '```text\n' + lines.join('\n') + '\n```';
};
const invoiceTable = (r: Rand, open: number, members: number, double: boolean, card: string, total: (amount: number) => void) => {
	const rows = ['| Invoice | Issued | Period | Members | Net | VAT | Total | Paid |', '| --- | --- | --- | ---: | ---: | ---: | ---: | --- |'];
	const months = [6, 7, 8, 9, 10].filter((m) => Date.UTC(2026, m, 1) <= at(open).getTime()).slice(-4);
	let count = members - int(r, 0, 6);
	let number = int(r, 3000, 3900);
	for (const m of months) {
		count = Math.max(2, count + int(r, -2, 4));
		const net = count * 2.5;
		const row = `| PR-${number} | 1 ${monthNames[m]!.slice(0, 3)} 2026 | ${monthNames[m]} 2026 | ${count} | ${money(net)} | ${money(net * 0.2)} | ${money(net * 1.2)} | 1 ${monthNames[m]!.slice(0, 3)}, card ending ${card} |`;
		total(net * 1.2);
		rows.push(row);
		if (double && m === months.at(-1)) rows.push(row.replace(`PR-${number}`, `PR-${number + int(r, 1, 40)}`).replace(/\| 1 (\w+), card/, `| ${int(r, 2, 6)} $1, card`));
		number += int(r, 200, 400);
	}
	return rows.join('\n');
};
const questionnaire = (r: Rand) =>
	shuffle(r, [
		'Where is customer data stored, and in which country are the servers?',
		'Is data encrypted in transit and at rest? Give the protocols and algorithms.',
		'Do you support single sign-on (SAML 2.0 or OpenID Connect)?',
		'Do you support two-factor authentication for all users?',
		'How often are backups taken, where are they kept and for how long?',
		'Which of your staff can access customer data, and is that access logged?',
		'Do you hold Cyber Essentials, Cyber Essentials Plus or ISO 27001?',
		'When was your last independent penetration test, and can you share a summary?',
		'How are user passwords stored?',
		'What is your process for telling customers about a personal data breach, and within what time?',
		'Can we export all of our data, and in what format?',
		'How long do you keep our data after we cancel?',
		'Do you use sub-processors? List them with their locations.',
		'Do you have a documented business continuity plan, and when was it last tested?'
	])
		.slice(0, int(r, 7, 12))
		.map((q, i) => `${i + 1}. ${q}`)
		.join('\n');

// Dates: the tickets are spread over the working days between 5 October and 13 November.
const workdays: number[] = [];
for (let d = 4; d <= 43; d++) if (!isWeekend(d * 1440)) workdays.push(d * 1440);
const TEAMS_LAUNCHED = -16 * 1440; // 15 September, version 1.3.0
const INVITATIONS_LAUNCHED = 28 * 1440; // 29 October, version 1.4.0

const fill = (text: string, values: Record<string, string>): string =>
	text.replace(/\{(\w+)\}/g, (_, key: string) => {
		const value = values[key];
		if (value === undefined) throw new Error(`no value for {${key}} in: ${text.slice(0, 60)}`);
		return value;
	});

/** Keeps a message inside the hours its writer works; Plover staff work 08:30 to 17:30 on weekdays. */
const office = (r: Rand, t: number) => {
	let m = t;
	if (minuteOfDay(m) > 17 * 60 + 30) m = startOfDay(m) + 1440 + 8 * 60 + 30 + int(r, 0, 90);
	if (minuteOfDay(m) < 8 * 60 + 30) m = startOfDay(m) + 8 * 60 + 30 + int(r, 0, 90);
	while (isWeekend(m)) m += 1440;
	return m;
};
const waking = (r: Rand, t: number) => {
	let m = t;
	if (minuteOfDay(m) > 22 * 60) m = startOfDay(m) + 1440 + 6 * 60 + 40 + int(r, 0, 200);
	if (minuteOfDay(m) < 6 * 60 + 30) m = startOfDay(m) + 6 * 60 + 40 + int(r, 0, 200);
	return m;
};

interface Plan {
	topic: Topic;
	path: Path;
	open: number;
}

const ticket = (index: number, plan: Plan, number: number): string => {
	const r = mulberry32(0x91a7e000 + index * 7919);
	const { topic, path } = plan;
	const fitting = topic.subjects[0] === 'Night shift hours wrong' ? kinds.filter((k) => k.shifts.some(overnight)) : kinds;
	const kind = fitting[(index * 7 + int(r, 0, 3)) % fitting.length]!;
	const first = pick(r, firstNames);
	const last = pick(r, surnames);
	const full = `${first} ${last}`;
	const biz = pick(r, kind.names);
	const slug = biz.normalize('NFD').toLowerCase().replace(/^the /, '').replace(/[^a-z]+/g, '');
	const email = r() < 0.75 ? `${first.toLowerCase()}@${slug}.example` : `${first.toLowerCase()}.${last.toLowerCase()}@${pick(r, providers)}`;
	const staffPool = shuffle(r, staffNames);
	const [staff, staff2] = [staffPool[0]!, staffPool[1]!];
	const staffLast = pick(r, surnames);
	const staff2Full = `${staff2} ${pick(r, surnames)}`;
	const mgr = `${staffPool[2]!} ${pick(r, surnames)}`;
	const [team, team2] = shuffle(r, kind.teams);
	const letters = team!.split('');
	const swap = 1 + int(r, 0, Math.max(0, letters.length - 3));
	[letters[swap], letters[swap + 1]] = [letters[swap + 1]!, letters[swap]!];
	const right = `${first.toLowerCase()}.${last.toLowerCase()}@${pick(r, providers)}`;
	const local = right.split('@')[0]!;
	const cut = int(r, 1, local.length - 2);
	const typo = `${local.slice(0, cut)}${local[cut]}${local.slice(cut)}@${right.split('@')[1]}`;
	const staffEmail = `${staff.toLowerCase()}.${staffLast.toLowerCase()}@${pick(r, providers)}`;
	const staffEmail2 = `${staff.toLowerCase()}@${slug}.example`;
	const agent = pick(r, agents);
	const dev = pick(r, webTeam);
	const planner = pick(r, plannerTeam);
	const open = plan.open + int(r, 6 * 60 + 30, 21 * 60);
	const invitations = open >= INVITATIONS_LAUNCHED;
	const N = 8 + (hash(biz) % 53);
	const members = Math.min(N, 4 + (hash(biz + team!) % 30));
	const uid = int(r, 10200, 38999);
	const teamId = 20100 + (hash(team! + biz) % 2800);
	const signupMin = plan.open - int(r, 30, 560) * 1440;
	const septDay = int(r, 15, 29);
	const card = String(int(r, 1000, 9999));
	let tuesday = startOfDay(open) + 2 * 1440;
	while (at(tuesday).getUTCDay() !== 2) tuesday += 1440;
	const lastSeen = `${shortDate(at(open - int(r, 1, 30) * 1440))}, ${pad(int(r, 7, 21))}:${pad(int(r, 0, 59))}`;
	// Whether someone other than the writer owns the team: the old manager, or the owner the writer has to ask.
	const mentionsMgr = [...(topic.open.every((text) => text.includes('{mgr}')) ? topic.open : []), ...path.detail, ...path.look].some((text) => text.includes('{mgr}'));

	const values: Record<string, string> = {
		name: first,
		last_name: last,
		full,
		email,
		phone: `01632 960${String(int(r, 0, 999)).padStart(3, '0')}`,
		biz,
		role: pick(r, kind.roles),
		N: String(N),
		n: String(int(r, 2, 9)),
		n2: String(Math.max(3, members - int(r, 4, 12))),
		members: String(members),
		teamCount: String(int(r, 2, 4)),
		staff,
		staff2,
		staffFull: `${staff} ${staffLast}`,
		staffEmail,
		staffEmail2,
		mgr,
		team: team!,
		team2: team2!,
		newTeam: pick(r, renames.filter((name) => name !== team)),
		typoTeam: letters.join(''),
		typo,
		right,
		uid: String(uid),
		teamId: String(teamId),
		signup: longDate(at(signupMin)),
		signupSep: `${septDay} September 2026`,
		signupMonth: `${monthNames[at(signupMin).getUTCMonth()]!} ${at(signupMin).getUTCFullYear()}`,
		last: lastSeen,
		fails: String(int(r, 2, 14)),
		wday: weekday(office(r, startOfDay(open) - int(r, 1, 3) * 1440 + 600)),
		day: weekdayFrom(startOfDay(open) + int(r, 2, 4) * 1440),
		hhmm: `${pad(int(r, 9, 17))}:${pad(int(r, 0, 59))}`,
		month: pick(r, ['July', 'August', 'September']),
		nextMonth: monthNames[(at(open).getUTCMonth() + 1) % 12]!,
		tuesday: ordinal(at(tuesday).getUTCDate()),
		newName: `${first} ${pick(r, surnames.filter((s) => s !== last))}`,
		nth: pick(r, ['third', 'fourth', 'fifth', 'sixth']),
		pers: `@${pick(r, providers)}`,
		sessions: String(int(r, 2, 6)),
		agent,
		card,
		total: money(members * 2.5 * 1.2),
		street: `${int(r, 2, 140)} ${pick(r, ['High Street', 'Station Road', 'Mill Lane', 'Church Street', 'Victoria Road', 'Market Place'])}, ${pick(r, ['Kendal', 'Hexham', 'Ludlow', 'Bridport', 'Whitby', 'Penrith', 'Malton', 'Frome'])}`,
		vat: `${int(r, 100, 999)} ${int(r, 1000, 9999)} ${int(r, 10, 99)}`,
		charity: String(int(r, 1000000, 1199999)),
		reset: open >= INVITATIONS_LAUNCHED ? 'I’ve started a password reset from our admin tools.' : 'I’ve asked our web team to start a password reset for you, and they’ve just sent it.',
		resetHer: open >= INVITATIONS_LAUNCHED ? 'I’ve sent her a password reset from our admin tools.' : 'I’ve asked the web team to send her a password reset, and they have.'
	};
	const f = (text: string) => fill(text, values);

	// The people of the team, for tables.
	const people = [...new Set([full, `${staff} ${staffLast}`, staff2Full, ...(mentionsMgr ? [mgr] : []), ...shuffle(r, staffNames).slice(0, int(r, 4, 11)).map((name) => `${name} ${pick(r, surnames)}`)])];
	const between = (from: number, to: number) => from + int(r, 0, Math.max(0, Math.floor((to - from) / 1440))) * 1440;
	const created = (t: number) => shortDate(at(between(TEAMS_LAUNCHED, t - 3 * 1440)));
	const teamStart = between(TEAMS_LAUNCHED, open - 10 * 1440);
	const teamRows = (t: number) => {
		const rows: TeamRow[] = [
			{ id: teamId, title: team!, owner: mentionsMgr ? mgr : full, role: mentionsMgr ? 'member' : 'owner', members, pending: invitations ? int(r, 0, 4) : 0, created: shortDate(at(teamStart)) },
			{ id: 20100 + (hash(team2 + biz) % 2800), title: team2!, owner: r() < 0.6 ? full : mgr, role: 'member', members: Math.min(N, 3 + (hash(biz + team2) % 25)), pending: invitations ? int(r, 0, 2) : 0, created: created(t) }
		];
		rows[1]!.role = rows[1]!.owner === full ? 'owner' : 'member';
		if (topic.subjects[0] === 'Duplicate team') rows.push({ ...rows[0]!, id: teamId + 1, members: 1, pending: 0 });
		return teamTable(rows, invitations);
	};
	const membersTable = (t: number) => {
		const rows = ['| Member | Email | Role | Joined | Last sign-in |', '| --- | --- | --- | --- | --- |'];
		for (const person of people) {
			const [given, family] = person.split(' ');
			const address = person === full ? email : r() < 0.5 ? `${given!.toLowerCase()}@${slug}.example` : `${given!.toLowerCase()}.${family!.toLowerCase()}@${pick(r, providers)}`;
			const owner = mentionsMgr ? person === mgr : person === full;
			const joined = owner ? teamStart : between(teamStart, t - 1440);
			rows.push(`| ${person} | ${address} | ${owner ? 'owner' : 'member'} | ${shortDate(at(joined))} | ${r() < 0.1 && !owner ? 'never' : shortDate(at(between(joined, t - 60)))} |`);
		}
		return `Members of ${team} (team ${teamId}):\n\n${rows.join('\n')}`;
	};
	const rotaSettings = (t: number) =>
		[
			`Rota settings for ${team}, from the planner:`,
			'',
			'```text',
			`Team:             ${team} (${teamId})`,
			`Week starts:      ${pick(r, ['Monday', 'Monday', 'Sunday'])}`,
			`Default break:    ${pick(r, ['30 min after 6 h', '20 min after 6 h', 'none', '45 min after 8 h'])}`,
			`Cover levels:     ${int(r, 1, 4)} per shift${r() < 0.4 ? `, ${int(r, 1, 2)} on nights` : ''}`,
			`Rota managers:    ${full}${r() < 0.6 ? `, ${staff2Full}` : ''}`,
			`Swaps:            ${pick(r, ['members swap freely', 'manager approves swaps', 'swaps off'])}`,
			`Published up to:  week of ${shortDate(at(startOfDay(t) + int(r, 1, 3) * 7 * 1440 - ((at(t).getUTCDay() + 6) % 7) * 1440))}`,
			'Time zone:        Europe/London',
			`Members:          ${members}`,
			'```'
		].join('\n');
	const requestsTable = (t: number) => {
		const rows = ['| Requested by | First day | Last day | Sent | Decision |', '| --- | --- | --- | --- | --- |'];
		for (let i = int(r, 4, 9); i > 0; i--) {
			const start = t + int(r, 5, 80) * 1440;
			rows.push(`| ${pick(r, people)} | ${shortDate(at(start))} | ${shortDate(at(start + (r() < 0.6 ? 0 : int(r, 1, 6)) * 1440))} | ${shortDate(at(t - int(r, 0, 20) * 1440))} | ${pick(r, ['approved', 'approved', 'waiting', 'declined', 'waiting'])} |`);
		}
		return `Holiday requests for ${team}:\n\n${rows.join('\n')}`;
	};
	const billingBlock = (t: number) =>
		[
			'Billing account:',
			'',
			'```text',
			`Billing contact:  ${full} <${email}>`,
			'Charged:          per member, monthly in advance, £2.50 + VAT each',
			`Members counted:  ${members} on 1 ${monthNames[at(t).getUTCMonth()]}`,
			`Card:             ending ${card}, expires ${pad(int(r, 1, 12))}/${int(r, 27, 30)}`,
			`Next invoice:     1 ${monthNames[(at(t).getUTCMonth() + 1) % 12]} 2026`,
			`Invoice name:     ${r() < 0.5 ? biz : full}`,
			'```',
			'',
			invoiceHistory(t)
		].join('\n');

	let invoices = '';
	const invoiceHistory = (t: number) => (invoices ||= invoiceTable(r, t, members, topic.subjects[0] === 'Charged twice', card, (amount) => (values.total = money(amount))));
	let teams = '';
	const teamsOnce = (t: number) => (teams ||= teamRows(t));
	const pasteOf = (kindOfPaste: Paste | undefined, t: number): string => {
		switch (kindOfPaste) {
			case undefined:
			case 'none':
				return '';
			case 'account':
				return [accountTable([{ uid, email, name: full, signup: shortDate(at(signupMin)), last: lastSeen, sessions: int(r, 1, 5) }]), '', teamsOnce(t), ...(r() < 0.9 ? ['', loginLog(r, t, uid, teamId, 'plain')] : [])].join('\n');
			case 'staffAccount': {
				const elsewhere = path.look.some((text) => text.includes('another business'));
				const joined = path.look.some((text) => text.includes('{signupSep}')) ? `${septDay} Sep 2026` : shortDate(at(signupMin));
				const account = accountTable([{ uid, email: staffEmail, name: `${staff} ${staffLast}`, signup: joined, last: r() < 0.5 ? 'never' : joined, sessions: 0 }]);
				if (path.look.some((text) => /no teams|in no team/.test(text))) return `${account}\n\nNo team memberships.`;
				return `${account}\n\n${teamTable([{ id: elsewhere ? teamId + 900 : teamId, title: elsewhere ? pick(r, kinds[(index + 3) % kinds.length]!.teams) : team!, owner: elsewhere ? `${pick(r, firstNames)} ${pick(r, surnames)}` : mentionsMgr ? mgr : full, role: 'member', members: elsewhere ? int(r, 4, 30) : members, pending: 0, created: elsewhere ? created(t) : shortDate(at(teamStart)) }], invitations)}`;
			}
			case 'typoAccount':
				return `${accountTable([{ uid, email: typo, name: full, signup: shortDate(at(signupMin)), last: lastSeen, sessions: int(r, 1, 3) }])}\n\n${teamsOnce(t)}`;
			case 'twoAccounts':
				return accountTable([
					{ uid, email: staffEmail, name: `${staff} ${staffLast}`, signup: shortDate(at(signupMin)), last: shortDate(at(t - int(r, 0, 2) * 1440)), sessions: int(r, 1, 3) },
					{ uid: uid + int(r, 40, 3000), email: staffEmail2, name: `${staff} ${staffLast}`, signup: created(t), last: shortDate(at(t - int(r, 10, 30) * 1440)), sessions: 0 }
				]);
			case 'teams':
				return teamsOnce(t);
			case 'members':
				return membersTable(t);
			case 'memberList':
				return [`Members of ${team}:`, '', ...people.map((person, i) => `${i + 1}. ${person}${person === full ? ' (owner)' : ''}`)].join('\n');
			case 'loginLog':
				return loginLog(r, t, uid, teamId, path.detail.some((text) => text.includes('reset')) ? 'reset' : topic.subjects[0] === 'Internal server error' ? 'error' : 'plain');
			case 'error500':
				return error500(r);
			case 'rota':
				return rotaTable(r, people, kind.shifts, startOfDay(t) - ((at(t).getUTCDay() + 6) % 7) * 1440 + 7 * 1440);
			case 'rotaClocks':
				return rotaClocks(r, people, kind.shifts);
			case 'rotaSettings':
				return rotaSettings(t);
			case 'requests':
				return requestsTable(t);
			case 'payroll':
				return payroll(r, people, team!, startOfDay(t) - ((at(t).getUTCDay() + 6) % 7) * 1440 - 7 * 1440);
			case 'invoices':
			case 'doubleInvoice':
				return invoiceHistory(t);
			case 'billing':
				return billingBlock(t);
			case 'questionnaire':
				return questionnaire(r);
		}
	};

	// The thread.
	let t = open;
	const messages: string[] = [];
	const labels: Record<Who, string> = {
		c: `**${full}**`,
		a: `**${agent} (Plover support)**`,
		n: `**${agent} (Plover support)** · internal note`,
		w: `**${dev} (web team)** · internal note`,
		p: `**${planner} (planner team)** · internal note`,
		P: `**${planner} (planner team)**`,
		b: `**${billing} (billing)** · internal note`,
		B: `**${billing} (billing)**`,
		d: `**${dataLead} (data protection)** · internal note`,
		D: `**${dataLead} (data protection)**`,
		s: '**Help desk**'
	};
	const signers: Partial<Record<Who, string>> = { a: agent, P: planner.split(' ')[0]!, B: billing.split(' ')[0]!, D: dataLead.split(' ')[0]! };
	const say = (who: Who, body: string) => messages.push(`${labels[who]} · ${stampShort(t)}\n\n${body.trim()}`);
	let held = false;
	const advance = (who: Who) => {
		const before = t;
		if (held && who !== 'a' && who !== 's') {
			t += int(r, 600, 2200);
			held = false;
		}
		if (who === 'c') t = waking(r, t + int(r, 25, 1700));
		else if (who === 's') t = office(r, startOfDay(t) + 5 * 1440 + 9 * 60);
		else if (who === 'a' || who === 'P' || who === 'B' || who === 'D') t = office(r, t + int(r, 20, 700));
		else t = office(r, t + int(r, 6, 300));
		if (t > LAST_MESSAGE) t = before + int(r, 4, 30);
	};
	const custBody = (paragraphs: string[], opening: boolean) => {
		const parts: string[] = [];
		const fitting = (opening ? greetings : greetings.slice(0, 6)).filter((greeting) => minuteOfDay(t) < 12 * 60 || !greeting.includes('orning'));
		if (r() < 0.8) parts.push(`${pick(r, fitting)},`);
		parts.push(...paragraphs, f(pick(r, opening ? custSign : custSign.slice(0, 4))));
		if (opening && r() < 0.22) parts.push(`--\n${f(pick(r, disclaimers))}`);
		return parts.join('\n\n');
	};
	const pendingSide: string[] = [];
	const agentBody = (who: Who, paragraphs: string[], more = false) => {
		const extra = who === 'a' ? pendingSide.splice(0) : [];
		const closing = more && r() < 0.4 ? [pick(r, closings)] : [];
		const hello = /^(Thanks|Thank you|Sorry)/.test(paragraphs[0]!) ? [`Hi ${first},`, `Hello ${first},`] : [`Hi ${first},`, `Hello ${first},`, `Hi ${first},`, `Thanks, ${first}.`];
		return [...(/^(Hello|Hi) /.test(paragraphs[0]!) ? [] : [pick(r, hello)]), ...paragraphs, ...extra, ...closing, fill(pick(r, agentSign), { signer: signers[who]! })].join('\n\n');
	};

	// 1. The customer writes in.
	const tangent = r() < 0.35 ? pick(r, tangents) : undefined;
	const opening = [f(pick(r, topic.open))];
	if (r() < 0.6) opening.unshift(f(pick(r, kind.intro).replace('{N}', values.N!)));
	if (r() < 0.4) opening.splice(opening.length - 1, 0, f(pick(r, contexts)));
	if (r() < 0.85) opening.push(f(pick(r, topic.more)));
	if (r() < 0.5) opening.push(f(pick(r, situations)));
	if (tangent) opening.push(tangent[0]);
	if (topic.subjects[0] === 'Members list order' && r() < 0.7) opening.push(pasteOf('memberList', t));
	if (topic.shows && r() < 0.75) {
		const intro = topic.shows === 'invoices' ? ['Pasted from our billing page:', 'Here are our last few invoices:', 'For reference, from the billing page:'] : ['Here’s the week as it shows on screen:', 'Our rota for next week, copied from the screen:', 'For reference, this is the week on screen:'];
		opening.push(`${pick(r, intro)}\n\n${pasteOf(topic.shows, t)}`);
	}
	say('c', custBody(opening, true));

	// 2. Support asks.
	advance('a');
	const ask = f(pick(r, topic.ask));
	const ack = /^(Thanks|Sorry|Thank you)/.test(ask) ? '' : pick(r, acks);
	say('a', agentBody('a', [[ack, ask].filter(Boolean).join(' '), ...(tangent ? [tangent[1]] : [])], true));

	// 3. The customer answers, and may raise a second matter.
	advance('c');
	const side = r() < 0.75 ? pick(r, sides) : undefined;
	const answer = [f(pick(r, path.detail)), pasteOf(path.paste, t)].filter(Boolean);
	if (side) {
		answer.push(f(side.q));
		pendingSide.push(f(side.a));
	}
	say('c', custBody(answer, false));

	// 4. Someone looks.
	advance('n');
	say(path.lookWho ?? 'n', [f(pick(r, path.look)), pasteOf(path.lookPaste ?? 'account', t), pasteOf(topic.extra, t)].filter(Boolean).join('\n\n'));

	// 5. Sometimes a wait; always when the second matter would otherwise go unanswered.
	const end = pick(r, path.ends);
	const answered = end.some(([who]) => who === 'a');
	// A chaser may raise yet another matter, answered in support's next reply.
	const second = shuffle(r, sides).find((other) => other !== side)!;
	const chase = () => {
		advance('c');
		const raise = answered && r() < 0.5;
		say('c', custBody([f(pick(r, chasers)), ...(raise ? [f(second.q)] : [])], false));
		if (raise) pendingSide.push(f(second.a));
	};
	if ((path.team && r() < 0.6) || (pendingSide.length && !answered)) {
		advance('a');
		held = true;
		say('a', agentBody('a', [fill(pick(r, holding), { ...values, team: path.team ?? 'team' }).replace('the team to take a look', 'the right people to take a look').replace('back from the team', 'back from the right people').replace('with the team now', 'with the right people now')], true));
		if (r() < 0.55) chase();
	} else if (r() < 0.35) chase();

	// 6. The end.
	const thanks = side?.then && r() < 0.6 ? f(side.then) : '';
	end.forEach(([who, body], i) => {
		advance(who);
		const text = f(body);
		if (who === 'c') say('c', custBody(i === end.length - 1 && thanks ? [text, thanks] : [text], false));
		else if (signers[who]) say(who, agentBody(who, [text]));
		else say(who, text);
	});
	if (path.happy && r() < 0.45) {
		advance('s');
		const [rating, comment] = pick(r, surveys);
		say('s', `Satisfaction survey answered: ${rating}.${comment ? ` “${f(comment)}”` : ''}`);
	}

	const subject = pick(r, topic.subjects);
	const channel = r() < 0.7 ? 'by email' : 'through the help form in Plover';
	return [`# Ticket ${number}: ${subject}`, `From ${full} <${email}>, ${biz} · ${stampLong(open)} · ${channel}`, ...messages.map((message) => `---\n\n${message}`)].join('\n\n') + '\n';
};

// Which topic and path each ticket follows: topics are dealt in rounds, each round in a new order, and the paths of
// a topic in turn, so that two tickets on one topic end differently until its paths run out.
const order = mulberry32(20261005);
const plans: Plan[] = [];
const used = new Map<Topic, number>();
const deck: Topic[] = [];
for (let index = 0; index < ITEMS; index++) {
	const open = workdays[Math.floor((index * workdays.length) / ITEMS)]!;
	const allowed = (topic: Topic) => !topic.since || iso(open) >= topic.since;
	if (!deck.some(allowed)) deck.push(...shuffle(order, topics));
	const topic = deck.splice(deck.findIndex(allowed), 1)[0]!;
	const seen = used.get(topic) ?? 0;
	used.set(topic, seen + 1);
	plans.push({ topic, path: topic.paths[(seen + topics.indexOf(topic)) % topic.paths.length]!, open });
}

const folder = join(root, 'docs', 'support-tickets');
mkdirSync(folder, { recursive: true });
let number = 4806;
plans.forEach((plan, index) => {
	number += int(order, 1, 3);
	writeFileSync(join(folder, `ticket-${number}.md`), ticket(index, plan, number));
});
writeFileSync(
	join(folder, 'README.md'),
	`# Support tickets, 5 October to 13 November 2026\n\nThe ${ITEMS} tickets the support desk handled in these six weeks, one file each, exported from the old help desk\nbefore the move. The export kept the messages and internal notes but not the tags, statuses or assignees.\nNumbers missing from the sequence were spam or were merged into another ticket. Account and log extracts in\ninternal notes are as support pasted them.\n`
);
