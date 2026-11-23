// Writes the long material of this entry's long tasks: the tickets that studios opened with Wrenfield's Perch
// support between 1 October and 13 November 2026, one Markdown file each, under support/studio-tickets/, as the
// help desk exported them, without tags or statuses. Deterministic: fixed seeds, no clock, no network.
//   bun long/generate.ts <workspace root>
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** How many tickets to write. Dates, numbers and the share of each topic all follow from it. */
const ITEMS = 148;

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
/** A stable number for a name, so that a studio keeps its size and its ids from ticket to ticket. */
const hash = (text: string) => [...text].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);
const pad = (value: number) => String(value).padStart(2, '0');
const money = (pounds: number) => `£${pounds.toFixed(2).replace(/\B(?=(\d{3})+\.)/g, ',')}`;

// Time is kept in minutes since 00:00 on 1 October 2026, UK local time. Clocks went back on Sunday 25 October.
const EPOCH = Date.UTC(2026, 9, 1);
const LAST_MESSAGE = 48 * 1440 + 17 * 60; // Wednesday 18 November, 17:00
const CLOCKS_BACK = 24 * 1440; // Sunday 25 October
const at = (minutes: number) => new Date(EPOCH + minutes * 60000);
const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const weekday = (minutes: number) => dayNames[at(minutes).getUTCDay()]!;
const clock = (minutes: number) => `${pad(at(minutes).getUTCHours())}:${pad(at(minutes).getUTCMinutes())}`;
const shortDate = (d: Date) => `${d.getUTCDate()} ${monthNames[d.getUTCMonth()]!.slice(0, 3)} ${d.getUTCFullYear()}`;
const longDate = (d: Date) => `${d.getUTCDate()} ${monthNames[d.getUTCMonth()]!} ${d.getUTCFullYear()}`;
const dayMonth = (minutes: number) => `${at(minutes).getUTCDate()} ${monthNames[at(minutes).getUTCMonth()]!}`;
const stampShort = (minutes: number) => `${weekday(minutes).slice(0, 3)} ${at(minutes).getUTCDate()} ${monthNames[at(minutes).getUTCMonth()]!.slice(0, 3)}, ${clock(minutes)}`;
const stampLong = (minutes: number) => `${weekday(minutes)} ${longDate(at(minutes))}, ${clock(minutes)}`;
const iso = (minutes: number) => at(minutes).toISOString().slice(0, 10);
const ordinal = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th'}`;
const isWeekend = (minutes: number) => at(minutes).getUTCDay() % 6 === 0;
const minuteOfDay = (minutes: number) => ((minutes % 1440) + 1440) % 1440;
const startOfDay = (minutes: number) => minutes - minuteOfDay(minutes);
const mondayOf = (minutes: number) => startOfDay(minutes) - ((at(minutes).getUTCDay() + 6) % 7) * 1440;
/** The next weekday at or after `minutes`, as a weekday name. */
const weekdayFrom = (minutes: number) => {
	let m = minutes;
	while (isWeekend(m)) m += 1440;
	return weekday(m);
};
const hhmm = (minutes: number) => `${pad(Math.floor(minutes / 60) % 24)}:${pad(minutes % 60)}`;

// People at Wrenfield. Support answers studios; the other teams look at what support passes them.
const agents = ['Elin', 'Marcus', 'Priya', 'Tobi', 'Saoirse'];
const bookingTeam = ['Ruth Abernathy', 'Kenji Mori', 'Lena Fischer'];
const consoleTeam = ['Dev Raman', 'Aoife Brennan'];
const paymentsLead = 'Gus Okafor';
const onboardingLead = 'Carys Llewellyn';
const accountsLead = 'Hugo Ferrand';

// Studios: the small fitness studios that run their classes on Perch.
interface Kind {
	kind: string;
	names: string[];
	classes: string[];
	rooms: string[];
	roles: string[];
	intro: string[];
	/** Class pack name, its price, the unlimited membership's monthly price, the drop-in price, the intro offer. */
	pack: [string, number];
	unlimited: number;
	dropin: number;
	intro_offer: [string, number];
	/** Times of day that classes start, in minutes after midnight. */
	slots: number[];
}
const kinds: Kind[] = [
	{ kind: 'yoga studio', names: ['Lotus Room Yoga', 'Stillwater Yoga', 'The Yoga Loft'], classes: ['Vinyasa Flow', 'Yin', 'Hatha', 'Ashtanga Mysore', 'Yoga Nidra'], rooms: ['Main studio', 'Small studio'], roles: ['Owner', 'Studio Manager', 'Front Desk Lead'], intro: ['We are an independent yoga studio with about {N} active members and around forty classes a week.'], pack: ['10-class pack', 110], unlimited: 95, dropin: 15, intro_offer: ['Intro month', 45], slots: [390, 435, 570, 750, 1050, 1110, 1170] },
	{ kind: 'reformer Pilates studio', names: ['Core & Carriage Pilates', 'Reform Studio', 'The Pilates Rooms'], classes: ['Reformer Foundations', 'Reformer Flow', 'Reformer Jump', 'Tower', 'Mat Pilates'], rooms: ['Reformer room', 'Mat room'], roles: ['Owner', 'Studio Manager', 'Head Instructor'], intro: ['We are a reformer Pilates studio with twelve reformers and {N} members, so every space counts.'], pack: ['5-class pack', 115], unlimited: 160, dropin: 26, intro_offer: ['Intro three classes', 49], slots: [375, 435, 555, 735, 1035, 1095, 1155] },
	{ kind: 'indoor cycling studio', names: ['Spoke & Sweat', 'Cadence Cycle Club', 'Revolution Ride'], classes: ['Rhythm Ride', 'Endurance 45', 'Power Hour', 'Beginners Ride', 'Ride & Stretch'], rooms: ['Ride room', 'Small ride room'], roles: ['Founder', 'Studio Manager', 'Operations Manager'], intro: ['We are an indoor cycling studio with 32 bikes and {N} members.'], pack: ['10-ride pack', 120], unlimited: 99, dropin: 14, intro_offer: ['First ride free', 0], slots: [360, 405, 450, 735, 1050, 1095, 1140] },
	{ kind: 'boxing gym', names: ['Southpaw Boxing Club', 'Ringside Fitness', 'Iron Glove Gym'], classes: ['Boxing Fundamentals', 'Bag Work', 'Boxing Conditioning', 'Pads & Partners', 'Juniors Boxing'], rooms: ['Gym floor', 'Ring'], roles: ['Head Coach', 'Gym Manager', 'Owner'], intro: ['We are a boxing gym running fitness classes for {N} members alongside the club’s competitive side.'], pack: ['8-class pack', 80], unlimited: 65, dropin: 12, intro_offer: ['Two-week trial', 20], slots: [390, 720, 1050, 1110, 1170, 600] },
	{ kind: 'HIIT and bootcamp studio', names: ['Forge Training', 'The Engine Room', 'Fortitude Fitness'], classes: ['HIIT 30', 'Bootcamp', 'Strength & Burn', 'Circuits', 'Mobility'], rooms: ['Studio A', 'Studio B'], roles: ['Owner', 'Head Coach', 'Studio Manager'], intro: ['We are a HIIT studio with two rooms and {N} members.'], pack: ['10-session pack', 100], unlimited: 89, dropin: 13, intro_offer: ['Intro fortnight', 25], slots: [360, 420, 735, 1035, 1080, 1125, 540] },
	{ kind: 'hot yoga studio', names: ['Ember Hot Yoga', 'Kiln Yoga', 'Hot Box Studio'], classes: ['Hot 26', 'Hot Flow', 'Hot Yin', 'Warm Vinyasa', 'Hot Pilates'], rooms: ['Hot room', 'Warm room'], roles: ['Owner', 'Studio Manager', 'Front Desk Lead'], intro: ['We are a hot yoga studio with {N} members and a room heated to forty degrees, which matters for this.'], pack: ['10-class pack', 125], unlimited: 109, dropin: 17, intro_offer: ['Intro 30 days', 49], slots: [390, 435, 570, 720, 1050, 1125, 1185] },
	{ kind: 'dance studio', names: ['Step Up Dance Studio', 'Groove Theory', 'The Dance Hub'], classes: ['Dance Fit', 'Commercial Heels', 'Adult Ballet Barre', 'Street Dance Beginners', 'Contemporary Improvers'], rooms: ['Studio 1', 'Studio 2'], roles: ['Principal', 'Studio Manager', 'Owner'], intro: ['We are a dance studio with adult classes in the evenings and {N} members.'], pack: ['6-class card', 66], unlimited: 70, dropin: 12, intro_offer: ['Taster class', 5], slots: [1080, 1140, 1200, 600, 660, 1110] },
	{ kind: 'martial arts academy', names: ['Tora Martial Arts', 'Blackbelt Academy', 'Kaizen Dojo'], classes: ['Jiu-Jitsu Fundamentals', 'No-Gi', 'Kickboxing', 'Kids Karate', 'Open Mat'], rooms: ['Mat area', 'Small mat'], roles: ['Head Instructor', 'Academy Manager', 'Owner'], intro: ['We are a martial arts academy with {N} members, adults and kids.'], pack: ['10-class pass', 90], unlimited: 75, dropin: 12, intro_offer: ['Free trial week', 0], slots: [390, 720, 1020, 1080, 1170, 600] },
	{ kind: 'aerial and pole studio', names: ['Skyward Aerial', 'Vertical Arts Studio', 'Lift Pole & Aerial'], classes: ['Pole Beginners', 'Pole Improvers', 'Aerial Hoop', 'Aerial Silks', 'Flexibility'], rooms: ['Pole room', 'Aerial rig'], roles: ['Owner', 'Studio Manager', 'Lead Instructor'], intro: ['We are a pole and aerial studio with eight poles, four rigging points and {N} members.'], pack: ['5-class pack', 70], unlimited: 85, dropin: 16, intro_offer: ['Beginners’ taster', 12], slots: [1080, 1155, 1230, 600, 690] },
	{ kind: 'rowing studio', names: ['Catch & Drive Rowing', 'Stroke Studio', 'Erg House'], classes: ['Row 45', 'Row & Ride', 'Row Strength', 'Technique Clinic', 'Row Intervals'], rooms: ['Rowing floor', 'Mezzanine'], roles: ['Founder', 'Studio Manager', 'Head Coach'], intro: ['We are an indoor rowing studio with twenty rowers and {N} members.'], pack: ['10-class pack', 115], unlimited: 99, dropin: 15, intro_offer: ['Intro week', 19], slots: [375, 420, 735, 780, 1065, 1110] },
	{ kind: 'strength gym', names: ['Barbell Collective', 'Northside Strength', 'Lift Club'], classes: ['Strength Foundations', 'Olympic Lifting', 'Powerbuilding', 'Kettlebells', 'Open Gym'], rooms: ['Platform area', 'Kettlebell corner'], roles: ['Owner', 'Head Coach', 'Gym Manager'], intro: ['We are a strength gym with eight platforms and {N} members who book coached sessions.'], pack: ['10-session pack', 120], unlimited: 110, dropin: 15, intro_offer: ['Foundations course', 60], slots: [390, 450, 720, 1050, 1110, 1170] },
	{ kind: 'barre studio', names: ['Pointe & Pulse Barre', 'Barre Society', 'The Barre Studio'], classes: ['Barre Signature', 'Barre Burn', 'Barre Stretch', 'Barre & Weights', 'Prenatal Barre'], rooms: ['Barre room', 'Studio 2'], roles: ['Owner', 'Studio Manager', 'Senior Instructor'], intro: ['We are a barre studio with one room, eighteen spaces a class and {N} members.'], pack: ['10-class pack', 135], unlimited: 119, dropin: 18, intro_offer: ['Intro two weeks', 35], slots: [390, 555, 735, 1050, 1110, 570] },
	{ kind: 'pregnancy and postnatal studio', names: ['Bloom Mother & Baby Fitness', 'Nest Wellbeing', 'Little Lotus Studio'], classes: ['Pregnancy Yoga', 'Postnatal Pilates', 'Mum & Baby Fitness', 'Birth Preparation', 'Baby Massage'], rooms: ['Main room', 'Garden room'], roles: ['Founder', 'Studio Coordinator', 'Owner'], intro: ['We run pregnancy and postnatal classes for about {N} members, most of whom stay with us for six months or so.'], pack: ['6-class course card', 72], unlimited: 60, dropin: 14, intro_offer: ['First class half price', 7], slots: [600, 660, 750, 1110, 570] },
	{ kind: 'outdoor bootcamp', names: ['Park Life Bootcamp', 'Commonside Fitness', 'Wild Fitness Collective'], classes: ['Sunrise Bootcamp', 'Park Circuits', 'Hill Sprints', 'Weekend Warriors', 'Run Club'], rooms: ['Victoria Park bandstand', 'Riverside field', 'Common car park'], roles: ['Founder', 'Head Trainer', 'Owner'], intro: ['We run outdoor bootcamps in three parks for about {N} members, whatever the weather.'], pack: ['10-session pack', 75], unlimited: 55, dropin: 9, intro_offer: ['First fortnight', 15], slots: [360, 405, 1080, 540, 600] },
	{ kind: 'tai chi and qigong school', names: ['Flowing Water Tai Chi', 'Quiet Hour Studio', 'Willow Movement Centre'], classes: ['Tai Chi for Beginners', 'Qigong', 'Tai Chi Form Practice', 'Seated Tai Chi', 'Meditation'], rooms: ['Hall', 'Garden studio'], roles: ['Teacher', 'Administrator', 'Owner'], intro: ['We teach tai chi and qigong to about {N} members, many of them retired.'], pack: ['10-class card', 70], unlimited: 50, dropin: 9, intro_offer: ['Taster session', 0], slots: [570, 630, 690, 840, 1110] },
	{ kind: 'physio and Pilates clinic', names: ['Align Physio & Pilates', 'Back to Balance Clinic', 'Kinetic Physio Studio'], classes: ['Clinical Pilates', 'Back Care', 'Rehab Strength', 'Pilates for Runners', 'Mat Pilates'], rooms: ['Studio', 'Gym'], roles: ['Clinic Director', 'Practice Manager', 'Reception Manager'], intro: ['We are a physiotherapy clinic that runs small Pilates and rehab classes for about {N} members.'], pack: ['6-class block', 108], unlimited: 120, dropin: 20, intro_offer: ['Assessment and first class', 55], slots: [450, 735, 780, 1050, 1110, 1170] },
	{ kind: 'functional fitness gym', names: ['Anvil Fitness', 'Stronghold Box', 'Kettle & Rig'], classes: ['WOD', 'Foundations', 'Engine', 'Gymnastics Skills', 'Weightlifting'], rooms: ['Main floor', 'Rig'], roles: ['Owner', 'Head Coach', 'Box Manager'], intro: ['We are a functional fitness gym with {N} members and classes every hour at peak times.'], pack: ['10-class pack', 130], unlimited: 120, dropin: 15, intro_offer: ['Foundations month', 79], slots: [360, 420, 720, 1020, 1080, 1140, 1200] },
	{ kind: 'rebounder fitness studio', names: ['Bounce Social', 'Rebound Studio', 'Jump House Fitness'], classes: ['Rebounder HIIT', 'Bounce Basics', 'Bounce & Tone', 'Low Impact Bounce', 'Bounce Party'], rooms: ['Bounce room', 'Side studio'], roles: ['Owner', 'Studio Manager', 'Lead Instructor'], intro: ['We are a rebounder fitness studio with twenty trampolines and {N} members.'], pack: ['8-class pack', 76], unlimited: 69, dropin: 11, intro_offer: ['First class £3', 3], slots: [555, 1080, 1140, 1200, 570] },
	{ kind: 'dance fitness studio', names: ['Fiesta Fitness', 'Ritmo Studio', 'The Movement Hall'], classes: ['Zumba', 'Zumba Gold', 'Salsa Fitness', 'Bollywood Fit', 'Line Dance Fitness'], rooms: ['Church hall', 'Studio'], roles: ['Owner', 'Instructor and owner', 'Studio Coordinator'], intro: ['We run dance fitness classes in our own studio and a church hall for about {N} members.'], pack: ['10-class card', 60], unlimited: 45, dropin: 7, intro_offer: ['First class free', 0], slots: [570, 630, 1080, 1140, 1200] },
	{ kind: 'parkour academy', names: ['Freerun Academy', 'Vault Movement', 'Urban Flow Parkour'], classes: ['Parkour Beginners', 'Adult Parkour', 'Kids Parkour', 'Freerunning', 'Open Session'], rooms: ['Main gym', 'Soft area'], roles: ['Head Coach', 'Owner', 'Academy Manager'], intro: ['We are a parkour academy with an indoor gym and about {N} members, half of them kids.'], pack: ['8-session pass', 88], unlimited: 72, dropin: 13, intro_offer: ['Taster session', 8], slots: [990, 1050, 1110, 1170, 600, 690] }
];
const firstNames = ['Harriet', 'Rohan', 'Isla', 'Mehmet', 'Bryony', 'Kieran', 'Anjali', 'Lars', 'Seren', 'Femi', 'Clodagh', 'Yusuf', 'Philippa', 'Joaquin', 'Esme', 'Tariq', 'Rhian', 'Mikael', 'Nkechi', 'Ottilie', 'Ravi', 'Fenella', 'Dmitri', 'Abigail', 'Kofi', 'Sinead', 'Matthias', 'Leila', 'Ewan', 'Pooja', 'Gwen', 'Hassan', 'Marnie', 'Tomasz', 'Beatrix', 'Darius', 'Freya', 'Aled', 'Simone', 'Jonah'];
const surnames = ['Ashworth', 'Bhattacharya', 'Okafor', 'Lindgren', 'Pemberton', 'Kaczmarek', 'Holloway', 'Iyer', 'Thackeray', 'Adeyemi', 'Rasmussen', 'Fairbairn', 'Quinlan', 'Moreau', 'Hargreaves', 'Nwosu', 'Calloway', 'Szymanska', 'Blackwood', 'Ferreira', 'Huxley', 'Mahmood', 'Tremayne', 'Oyelaran', 'Whitfield', 'Castellano', 'Brennan', 'Achterberg', 'Lowther', 'Sato'];
// The messages call the front desk staff, the instructors and the members they name “she”, so those come first in each list.
const staffNames = ['Chloe', 'Jasmine', 'Becca', 'Lucy', 'Ellie', 'Sana', 'Molly', 'Zara', 'Tilly', 'Maisie', 'Hollie', 'Daisy', 'Ines', 'Nell', 'Rosie'];
const instructorWomen = ['Bex Carver', 'Dani Ortiz', 'Kat Drummond', 'Lou Ferraro', 'Jade Kimura', 'Tash Greer', 'Nina Volkova', 'Cass Obi', 'Gabi Rocha', 'Fern Ellwood', 'Hattie Moss', 'Jo Pryce', 'Viv Almeida', 'Paz Herrera', 'Iris Novak'];
const instructorMen = ['Sol Mendes', 'Raj Patel', 'Ash Bellamy', 'Mo Haddad', 'Remy Laurent', 'Will Tanaka', 'Luca Bianchi', 'Sami Aziz', 'Ty Robertson'];
const memberWomen = ['Alice', 'Carla', 'Eleanor', 'Georgia', 'Imogen', 'Katie', 'Megan', 'Olivia', 'Rachel', 'Tara', 'Vicky', 'Yasmin', 'Zoe', 'Bianca', 'Dina', 'Farida', 'Gemma', 'Ivy', 'Kirsten', 'Maya', 'Orla', 'Priyanka'];
const memberMen = ['Ben', 'Dev', 'Fraser', 'Hamid', 'Jack', 'Liam', 'Nathan', 'Patrick', 'Sam', 'Usman', 'Will', 'Aaron', 'Connor', 'Ethan', 'Harry', 'Jamal', 'Leo', 'Noah'];
const memberLast = ['Allen', 'Baker', 'Choudhury', 'Dawson', 'Evans', 'Fletcher', 'Gill', 'Hughes', 'Ibrahim', 'Jenkins', 'Khan', 'Lewis', 'Murray', 'Nolan', 'O’Brien', 'Parry', 'Reid', 'Shah', 'Turner', 'Underwood', 'Vaughan', 'Walsh', 'Young', 'Zielinski', 'Begum', 'Clarke', 'Doherty', 'Ellis', 'Foster', 'Grant'];
const towns = ['Harrogate', 'Shrewsbury', 'Totnes', 'Stroud', 'Lancaster', 'Bury St Edmunds', 'Chichester', 'Durham', 'Falmouth', 'Hebden Bridge', 'Leamington Spa', 'Margate', 'Ilkley', 'Lewes', 'Kendal', 'Whitstable'];
const streets = ['High Street', 'Station Road', 'Mill Lane', 'Church Street', 'Victoria Road', 'Market Place', 'Bridge Street', 'Queen Street', 'King’s Road', 'Albert Road'];
const providers = ['mailbox.example', 'postbox.example', 'inbox.example'];

// Topics. A ticket follows one path of one topic. Nothing about the topic, its area or its outcome is written into
// the file except through the messages themselves.
type Who = 'c' | 'a' | 'n' | 'k' | 'K' | 'o' | 'O' | 'p' | 'P' | 'd' | 'D' | 'b' | 'B' | 's';
type Msg = [Who, string];
type Paste = 'studio' | 'timetable' | 'roster' | 'waitlist' | 'log' | 'classSettings' | 'rules' | 'ledger' | 'payments' | 'payout' | 'attendance' | 'pay' | 'csv' | 'error' | 'tablet' | 'invoices' | 'import' | 'roles' | 'none';
/** What the pasted output of a path has to show, so that it agrees with the messages. */
type Mark = 'cutoff' | 'walkin' | 'quickmenu' | 'held' | 'oldcap' | 'roomcount' | 'window' | 'moved' | 'late' | 'series' | 'pastcap' | 'assistant' | 'expiry' | 'household' | 'pause' | 'imported' | 'closure' | 'paused' | 'declined' | 'outage' | 'refusal' | 'chargeback' | 'held-payout' | 'double-fee' | 'cover' | 'noshow-rate' | 'blocked' | 'timeout' | 'clock' | 'midnight' | 'offline' | 'instalments' | 'archived' | 'manager' | 'deskrole' | 'rolling' | 'settime' | 'lateness' | 'plain';
interface Path {
	/** Which of the topic's openings fit this path; all when left out. */
	opens?: number[];
	/** Subjects that fit only this path, added to the topic's own. */
	subjects?: string[];
	detail: string[];
	/** Pasted by the studio under the detail. */
	paste?: Paste;
	/** Support's internal note after the detail; none when empty. */
	look: string[];
	lookWho?: 'n' | 'k' | 'o' | 'p' | 'd' | 'b';
	/** Pasted under the note; the studio's account panel when left out. */
	lookPaste?: Paste;
	mark?: Mark;
	ends: Msg[][];
	/** Whom support waits on, if it sends a holding reply. */
	team?: string;
	/** The ticket may end with a satisfaction survey. */
	happy?: boolean;
}
interface Topic {
	/** The earliest day a ticket on this topic can be opened, as YYYY-MM-DD. */
	since?: string;
	/** Raised only by a studio that is just joining Perch, and only as the ticket’s first matter. */
	newcomer?: boolean;
	/** Pasted by the studio in the first message. */
	shows?: Paste;
	subjects: string[];
	open: string[];
	more: string[];
	ask: string[];
	paths: Path[];
}

const topics: Topic[] = [
	// The waitlist did not move up.
	{
		subjects: ['Waitlist not working', 'Space went unfilled', 'Why didn’t the waitlist move?', 'Empty space, full waitlist'],
		open: [
			'On {sessionDay} we had {n} people on the waitlist for {cls} at {sessionTime}, someone cancelled, and nobody was moved up. The class ran with an empty space, and one of the people waiting, {member2}, came to the desk afterwards rather cross, because she’d planned her day around it.',
			'Something odd with the waitlist. {member} cancelled her place in {cls} on {sessionDay}, the waitlist had people on it, and the space just sat there. {instrFirst} taught one fewer than she could have. This is the second time I know of.',
			'Can you explain how the waitlist decides when to move people up? I thought it was automatic, but on {sessionDay} a space came free in {cls} and nobody got it, even though there were {n} people waiting.'
		],
		more: ['Our members rely on the waitlist for the evening classes, so if it isn’t working we need to know.', 'I haven’t changed any settings that I know of, but {staff} might have.'],
		ask: [
			'Thanks for the details. Could you tell me which class it was, with the date and time, and roughly when the cancellation happened? With that I can pull the booking history for the class and see what the waitlist did.',
			'Sorry about the empty space. If you can send me the class and date, and the name of the member who cancelled, I’ll look at the class’s history and tell you exactly what happened.'
		],
		paths: [
			{
				detail: ['It was {cls} on {session}. {member} cancelled at about {cancelClock}, I think. The class is in the {room}.', 'The class was {session}, {cls} with {instr}. The cancellation was {member}, and she says she cancelled in plenty of time.'],
				look: ['Class {cid}. {member} cancelled {cutGap} before the start; the studio’s waitlist cut-off is {cut} hours, so the waitlist had stopped moving before she cancelled. Working as set.', 'History for class {cid} below. The waitlist stops offering spaces {cut} hours before the start (studio setting), and the cancellation came inside that.'],
				lookPaste: 'waitlist',
				mark: 'cutoff',
				ends: [
					[['a', 'I’ve been through the history of {cls} on {sessionDate}. {member} cancelled {cutGap} before the class, and your studio is set to stop moving the waitlist {cut} hours before a class starts, so the waitlist had already closed. The setting is there so nobody is handed a space at the last minute that they can’t use, but you can shorten it under Settings, then Booking rules, then Waitlist. Many studios use two hours.'], ['c', 'That makes sense, and I had no idea that setting was there. {staff} says she set it to {cut} when we started because she thought it was the cancellation window. I’ve changed it to two hours.'], ['a', 'Perfect. New cancellations will follow the two hours from now on. I’ll close this, but reply here if it misbehaves again.']],
					[['a', 'The waitlist did what it was set to do, though I can see why it looked broken. Your studio stops moving the waitlist {cut} hours before each class, and {member}’s cancellation came {cutGap} before {cls} started, so it fell inside that. You’ll find the setting under Settings, then Booking rules, then Waitlist, if you’d like it shorter.'], ['c', 'Thanks. We’ll talk it over at the staff meeting on {day} and decide what we want it to be. I’ll leave it as it is until then.']]
				],
				happy: true
			},
			{
				detail: ['It was {cls} at {sessionTime} on {sessionDay}. {member} rang the desk to cancel, so {staff} did it for her in the console.', 'It was {session}. {member} told {staff} at the desk that she couldn’t make it, and {staff} cancelled her in the console there and then.'],
				look: ['{member}’s booking was cancelled in the console by {staff} with “Keep the space for a walk-in” ticked. That holds the space and skips the waitlist.'],
				lookPaste: 'waitlist',
				mark: 'walkin',
				ends: [
					[['a', 'Found it. {member}’s place was cancelled from the console by {staff}, and the cancel box had “Keep the space for a walk-in” ticked, which holds the space back from the waitlist on purpose. It’s ticked by default when a class is less than a day away, which surprises a lot of studios. If you’d rather it was never ticked, you can change the default under Settings, then Front desk.'], ['c', 'Mystery solved. {staff} says she never noticed the box. I’ve unticked the default.']]
				],
				happy: true
			},
			{
				detail: ['{cls}, {session}. {staff} cancelled {member} from the console’s timetable view, using the menu on the class, because she’d asked at the desk.', 'It was {session}. {staff} cancelled {member} from the timetable in the console, from the little menu on the class, the afternoon before.'],
				look: ['Cancelled from the quick menu on the console timetable: the booking is marked cancelled but no waitlist offer follows. Second report this week; passing to the booking team.'],
				lookPaste: 'waitlist',
				mark: 'quickmenu',
				team: 'booking team',
				ends: [
					[['k', 'Confirmed: cancellations made from the quick menu on the console’s timetable skip the waitlist step. Cancelling from the class’s booking page is fine. Fix planned for the next booking release; no date yet.'], ['a', 'Thanks for your patience. The booking team have found the cause: when a place is cancelled from the menu on the timetable view in the console, the waitlist isn’t told. Cancelling from the class’s own booking page works properly, so until the fix is out, please cancel from there. I’ll update this ticket when the fix is released.'], ['c', 'OK, thanks for finding it. I’ve told the front desk to use the booking page for now. Please do let me know when it’s fixed.']]
				]
			}
		]
	},
	// The class shows as full when it isn't.
	{
		subjects: ['Class showing as full', 'Members can’t book but there are spaces', '{cls} says full', 'Timetable says full, roster says otherwise'],
		shows: 'roster',
		open: [
			'Members keep telling us {cls} on {sessionDay} shows as full on the timetable, but when I look at the roster there are only {booked} people booked into {cap} spaces. We’re losing bookings and I can’t see why.',
			'Our {sessionTime} {cls} says “Class full, join the waitlist” to members, but the room holds {cap} and the roster has {booked}. Two people have joined the waitlist for spaces that are free.',
			'Quick one, I hope. {member} wanted to book {cls} for {sessionDay} and it said full. I squeezed her in from the console, but I counted and we weren’t full at all.'
		],
		more: ['It’s mostly the evening classes, which are the ones that matter.', 'We’re trying to grow the evening classes, so every space we lose hurts.'],
		ask: ['Thanks. Which class and date is it? I’ll look at the class’s settings and its roster side by side.', 'Let me look. Could you tell me the class, the date, and how many spaces you expect it to have?'],
		paths: [
			{
				detail: ['It’s {cls} on {session}. It should have {cap} spaces.', 'The one I’m looking at is {session}. {cap} spaces, or it should be.'],
				look: ['Class {cid}: capacity {cap}, with {held} spaces held back for the desk. Members online see full once {bookedOnline} are booked.'],
				lookPaste: 'classSettings',
				mark: 'held',
				ends: [
					[['a', 'The class has {cap} spaces, but {held} of them are held back for drop-ins at the desk, so online it shows as full once {bookedOnline} are booked. That’s the “Held for the desk” number in the class’s settings. If you don’t take drop-ins for that class, set it to 0 and the spaces open to members straight away.'], ['c', 'I didn’t even know that was there. We stopped doing drop-ins in the summer. I’ve set it to zero for all the evening classes. Thanks!']]
				],
				happy: true
			},
			{
				detail: ['It’s {cls} on {session}. We moved it into the {room} in September, which holds {cap}, but I think it still thinks it’s in the old room.', 'It’s {session}. We swapped it into the {room} a few weeks ago because it’s bigger.'],
				look: ['The series was made for the {room2} with {oldCap} spaces; the room was changed on the series later but the capacity stayed at {oldCap}. Changing the room doesn’t change the capacity.'],
				lookPaste: 'classSettings',
				mark: 'oldcap',
				ends: [
					[['a', 'You’re right that the room changed, but the class kept its old capacity of {oldCap}: changing the room on a series doesn’t change the number of spaces, in case a studio wants fewer than the room holds. Open the series, set Capacity to {cap} and choose “This and following classes”. The spaces open straight away, and anyone on the waitlist moves up.'], ['c', 'Done, and four people got moved up from the waitlist straight away, so that’s good. It would be nice if it asked about the capacity when you change the room, though.'], ['a', 'Fair point. I’ve passed that on to the booking team as a suggestion.']]
				],
				happy: true
			},
			{
				detail: ['{cls} on {session}. We moved that one class into the {room} because of a leak, and since then it says full.', 'It’s just the {session} class. We put it in the {room} that day because the {room2} was being painted.'],
				look: ['Single class {cid} moved to the {room}. The console shows capacity {cap} but the member timetable still counts against {oldCap}. Looks like the timetable’s count wasn’t updated. Asking booking.'],
				lookPaste: 'roster',
				mark: 'roomcount',
				team: 'booking team',
				ends: [
					[['k', 'Reproduced. When a single class in a series is moved to another room, the member timetable keeps the series’ capacity until the series is saved again. Fix is in review. Workaround: open the class and save it once without changes.'], ['a', 'Thanks for waiting. The booking team found it: when one class in a series moves room, the timetable keeps counting against the old capacity. Their fix is in review. In the meantime, if you open that class in the console and press Save without changing anything, it corrects itself.'], ['c', 'Saving it worked. Thanks. Let me know when the fix is live so I don’t have to remember this.']],
					[['k', 'Single-class room moves keep the series capacity on the member timetable. Fixed and released this morning.'], ['a', 'Good news: the booking team found a fault where moving one class to another room left the timetable counting the old room’s spaces, and they released a fix this morning. {cls} now shows the right number of spaces.'], ['c', 'Brilliant, it’s showing properly now and two more people have booked. Thanks for the quick fix.']]
				]
			}
		]
	},
	// A late cancellation fee.
	{
		subjects: ['Late cancellation fee', 'Member charged unfairly', 'Refund a late cancel fee?', 'Charged {fee} for cancelling'],
		open: [
			'{member} has been charged a {fee} late cancellation fee for {cls} on {sessionDay}. She’s adamant she cancelled in good time, and our policy is {policyHours} hours’ notice. Can you check what happened before I refund her?',
			'We’ve had three members this week complain that they were charged our late cancellation fee when they cancelled well ahead. The latest is {member}, for {cls} on {session}. Is something wrong with the timing?',
			'Can you help me understand the late cancellation charge? {member} was charged {fee} for a class she cancelled, she says, the evening before.'
		],
		more: ['Our policy on the website says {policyHours} hours.', 'I don’t want to refund fees that are fair, but I also don’t want to upset regulars.', 'She’s a lovely member and has been with us for years, so I’d like to get this right.'],
		ask: ['Of course. Can you tell me the class and date, and the member’s name as it appears in Perch? I’ll pull the booking history and the charge.', 'Let me check. Which class was it, and when does she say she cancelled?'],
		paths: [
			{
				detail: ['It was {cls} on {session}, and the member is {member}.', '{member}, for {cls} on {session}.'],
				look: ['Cancellation came {gapHours} hours before the class. The studio’s late cancellation window is {cancelHours} hours; their website says {policyHours}.'],
				lookPaste: 'log',
				mark: 'window',
				ends: [
					[['a', 'The cancellation came {gapHours} hours before the class, which is within your policy of {policyHours} hours, but the late cancellation window in Perch is set to {cancelHours} hours, so Perch charged the fee. The setting is under Settings, then Booking rules, then Cancellations; if you set it to {policyHours}, it will match your website. You can refund {memberFirst}’s fee from her profile, under Payments: choose the charge and then Refund.'], ['c', 'Ah, that’s us then. The website was changed in the summer and nobody told Perch. I’ve set it to {policyHours} hours and refunded her. Can I find the others who were charged wrongly?'], ['a', 'Yes: the Late cancellations report, under Reports, lists every fee with how long before the class each cancellation came. Filter to more than {policyHours} hours and you’ll have everyone to refund.'], ['c', 'Found four. All refunded. Thanks for the help.']],
					[['a', 'Perch charged the fee because your late cancellation window is set to {cancelHours} hours, and {member} cancelled {gapHours} hours before {cls}. Your website says {policyHours} hours, so the two disagree. Which one is right is up to you; the setting is under Settings, then Booking rules, then Cancellations.'], ['c', 'Good question. {staff2} and I need to agree which it should be, because the website might be the one that’s wrong. I’ll come back to you.'], ['s', 'Automatic follow-up sent to the studio after five days without a reply.']]
				]
			},
			{
				detail: ['It’s {member}, {cls}. The class was meant to be at {movedFrom} on {sessionDay}, but we moved it to {sessionTime} because of the instructor’s train. She cancelled when she saw the change.', '{member}. We moved {cls} on {sessionDay} from {movedFrom} to {sessionTime}, and she couldn’t make the new time, so she cancelled.'],
				look: ['Class moved from {movedFrom} to {sessionTime} on {movedDay}; the member cancelled {gapHours} hours before the new start, inside the {cancelHours}-hour window, so the fee was charged. Perch doesn’t waive fees on classes the studio has moved. The fee was in the {payoutDate} payout.'],
				lookPaste: 'log',
				mark: 'moved',
				team: 'payments team',
				ends: [
					[['a', 'Thanks. The class was moved earlier, and {member} cancelled {gapHours} hours before the new time, which put her inside the late cancellation window, so the fee was charged automatically. Perch doesn’t yet waive the fee when the studio moves a class, and I agree it should. I’ve asked the booking team to add that, and I’ve passed the refund to our payments team, because the fee has already been paid out to you and they need to take it back from a payout.'], ['p', 'Refund of {fee} to the member queued; it will come off next Tuesday’s payout.'], ['c', 'Thanks. Will the booking team tell me when that change happens?'], ['a', 'I’ve linked this ticket to their request, so you’ll hear here when it’s done.']]
				]
			},
			{
				detail: ['{member}, {cls} on {session}. She says she cancelled the night before.', 'It was {session}, {cls}. The member is {member}, and she says she cancelled after work the day before.'],
				look: ['The log shows the cancellation at {lateClock} on the day, {lateMinutes} minutes before the class, from her phone. The fee is right by the studio’s rules.'],
				lookPaste: 'log',
				mark: 'late',
				ends: [
					[['a', 'I’ve looked at the booking history: the cancellation was made at {lateClock} on {sessionDay}, {lateMinutes} minutes before the class, from the timetable page on a phone. So by your rules the fee is right. It’s possible she started to cancel the night before and didn’t press the final button; the history only records the cancellation itself. Whether to waive it is your call, of course.'], ['c', 'Thanks, that’s helpful. I’ll have a gentle word with her. As it’s the first time, I’ll refund it this once.']]
				],
				happy: true
			}
		]
	},
	// When bookings open.
	{
		subjects: ['Bookings opening at the wrong time', 'When do bookings open?', 'Regulars missing out on {cls}', 'Booking window question'],
		open: [
			'Our members are meant to be able to book {window} days ahead, and bookings for the popular classes go within minutes. This week several regulars say {cls} for next {sessionDay} was already full when they tried at what they thought was opening time. Something doesn’t add up.',
			'Could you tell me exactly when bookings open for a class? We tell members “{window} days before, at midnight”, but {member} says she saw next week’s {cls} open at a different time, and now everyone is trying at odd hours.',
			'I’m getting complaints that the same few members get into {cls} every week. People think they’re getting in early somehow. I’d like to understand how the booking window works before I answer them.'
		],
		more: ['It’s getting quite heated on our members’ WhatsApp group.', 'We have a lot of shift workers, so fairness matters to us.', 'I’ve had {n} messages about it this week alone.'],
		ask: ['Happy to explain, and to check your settings. Which class is it, and what do you tell members about when booking opens?', 'Let me look at your booking rules. Which class has this happened with, and on which day?'],
		paths: [
			{
				detail: ['It’s {cls} at {sessionTime}, mostly. We tell people bookings open {window} days ahead at midnight.', 'Mostly {cls} on {sessionDay}s. We say midnight, {window} days before.'],
				look: ['Booking window is rolling: {window} days before each class’s start. So a {sessionTime} class opens at {sessionTime}, {window} days before, not at midnight.'],
				lookPaste: 'rules',
				mark: 'rolling',
				ends: [
					[['a', 'Your booking window is set to “rolling”: each class opens exactly {window} days before it starts, so the {sessionTime} {cls} opens at {sessionTime}, {window} days ahead, not at midnight. The members who always get in have simply worked that out. If you’d prefer every class on a day to open at the same moment, choose “At a set time” under Settings, then Booking rules, and pick midnight or any time you like.'], ['c', 'That explains everything. We’ll switch to a set time of 7pm, so people aren’t up at midnight. Thank you.']]
				],
				happy: true
			},
			{
				detail: ['It’s {cls}. We use “at a set time”, midnight, {window} days ahead. But {member} swears it opened at one in the morning one week and on time the next.', 'Our setting is a set time, midnight. {member} says some weeks it opened an hour late.'],
				look: ['Set time, midnight. Booking team’s note from 22 October: set-time windows opened an hour late during summer time for studios on Europe/London; fixed in the booking release of 23 October. Bookings since then open on time.'],
				lookPaste: 'rules',
				mark: 'settime',
				ends: [
					[['a', 'Your settings are right, and {member} wasn’t imagining it. Until 23 October, booking windows set to a fixed time opened an hour late during summer time, so at one in the morning rather than midnight. That was fixed in a booking release on 23 October, and since then every window has opened at midnight. I’m sorry for the confusion it caused your members.'], ['c', 'Thanks for being straight about it. I’ll post that on the WhatsApp group.']]
				]
			},
			{
				detail: ['The class is {cls}. What we’d really like is for members on Unlimited monthly to book {window} days ahead and drop-ins only two days ahead. Is that possible?', 'It’s {cls}. Our members on Unlimited monthly feel drop-ins take their spaces. Can drop-ins get a shorter window?'],
				look: ['Not possible today: one booking window per studio. Request exists for windows by pass; several studios asking.'],
				lookPaste: 'rules',
				mark: 'rolling',
				ends: [
					[['a', 'Not at the moment: the booking window applies to every pass alike. Windows by pass are on the booking team’s list, and I’ve added {biz} to the request. The nearest thing today is to keep a few spaces held for the desk, which members can’t book online.'], ['c', 'OK. Please do add our vote. We’ll try holding a couple of spaces back for now.']]
				]
			}
		]
	},
	// The clocks went back.
	{
		since: '2026-10-26',
		subjects: ['Classes an hour out', 'Timetable wrong since the weekend', 'Clocks went back and now our times are wrong', 'Wrong times on the timetable'],
		open: [
			'Since the clocks went back, our timetable shows classes an hour early. {cls} at {sessionTime} now says {earlyTime}, and members turned up an hour early this morning. Please help.',
			'After the weekend, some of our classes are showing an hour out and some aren’t. {cls} on {sessionDay} says {earlyTime} instead of {sessionTime}. I’ve no idea which ones are right.',
			'Members are confused because the times on the timetable page don’t match what’s on our board. It started on Monday. Is it the clocks?'
		],
		more: ['I need to know quickly which classes members will turn up to at the wrong time.', 'I’ve had {n} people come to the desk about it already.', '{instrFirst} stood in an empty room for an hour this morning.'],
		ask: ['I’m sorry, let’s get this straight quickly. Is it every class or only some, and does the console show the right times even if the timetable page doesn’t?', 'Sorry for the trouble. Could you tell me one class that shows the wrong time, and what time it should be?'],
		paths: [
			{
				detail: ['It’s only some classes. {cls} on {sessionDay} is one, it should be {sessionTime}. I think they’re all ones that came over from {oldSystem} when we joined.', 'Some of them. {cls} should be {sessionTime}. They seem to be the classes we had before we moved to Perch.'],
				look: ['Series imported from {oldSystem} in {signupMonth} kept fixed summer-time offsets, so they show an hour early since 25 October. Data team can correct the imported series in one go.'],
				lookPaste: 'timetable',
				mark: 'imported',
				team: 'data team',
				ends: [
					[['a', 'Thanks, that helped. The classes that are wrong all came over in the import from {oldSystem}, and the import gave them summer-time start times, so since the clocks went back they show an hour early. Our data team can correct all the imported series at once, and they’ve said they’ll do it overnight. I’ll confirm here in the morning.'], ['d', 'Correcting the imported series for this studio tonight; bookings will move with the classes.'], ['c', 'Thank you. Fingers crossed. I’ve put a note on the door for tomorrow just in case.']]
				]
			},
			{
				detail: ['Only some. The wrong ones are the weeks I made by copying a week from August. {cls} on {sessionDay} is one.', 'Some are wrong. I built November by copying a week from the summer, and those seem to be the ones that are out.'],
				look: ['Weeks made with Copy week from a summer-time week keep the summer start times. Booking team know; fix planned. Workaround is to edit the copied classes.'],
				lookPaste: 'timetable',
				mark: 'series',
				team: 'booking team',
				ends: [
					[['k', 'Yes, Copy week carries the summer offset across the change. Fix planned; workaround is to edit the start time of the copied classes.'], ['a', 'You’ve found a fault. When a week from summer time is copied into a week after the clocks change, the classes keep their summer times, so they show an hour early. The booking team are fixing Copy week. For now, editing the start time of the copied classes puts them right, and bookings move with them.'], ['c', 'OK, I’ve corrected the copied ones by hand. Please fix it before March or we’ll have the same thing the other way round.']]
				]
			},
			{
				detail: ['In the console they’re all right. It’s the timetable on our own website that’s wrong. Perch’s own timetable page looks fine, now I check.', 'The console and the Perch timetable page are fine. It’s our website’s timetable that’s out.'],
				look: ['Perch timetable and embed show correct times. Their website uses an old copied snippet with a fixed offset written in by their designer, not our embed code.'],
				lookPaste: 'none',
				mark: 'plain',
				ends: [
					[['a', 'Perch’s own timetable page and the console are both right, so the problem is on your website. Your designer seems to have copied the timetable into the page with a fixed time difference, rather than using our embed code, which adjusts itself. Replacing it with the code under Settings, then Website, will keep it right through every clock change.'], ['c', 'That sounds like our web designer. I’ll ask him to change it, but he’s away until {day}.']]
				]
			}
		]
	},
	// A cover instructor.
	{
		subjects: ['Wrong instructor on timetable', 'Cover instructor not showing', 'Sub not appearing', 'How do I add cover?'],
		open: [
			'{instr} is covering {cls} on {sessionDay} for {instr2}, and I’ve changed it in the console, but the timetable page still says {instr2First}. Members book some classes for the instructor, so it matters.',
			'I can’t get {instr} to appear as the instructor for {cls}. She’s covering for {instr2First}, who is on holiday for two weeks, and members still see {instr2First}’s name.',
			'How do I put a cover instructor on a class? I’ve tried twice and members still see the usual teacher.'
		],
		more: ['{instr2First} has a following, so people do notice.', 'We have a lot of cover in {nextMonth}, so I need to get the hang of this.'],
		ask: ['Happy to help. Which class is it, and when did you make the change?', 'Let’s sort it. Can you tell me the class and date, and how you added the cover instructor?'],
		paths: [
			{
				detail: ['It’s {cls} at {sessionTime} on {sessionDay}. I added {instr} under the class’s instructors.', 'The {sessionTime} {cls} on {sessionDay}. I opened the class and added {instr} in the instructors section.'],
				look: ['Class {cid}: {instr2} as lead instructor, {instr} added as assistant. The timetable only shows the lead.'],
				lookPaste: 'classSettings',
				mark: 'assistant',
				ends: [
					[['a', 'I can see what happened: {instr} has been added to the class as an assistant, and the timetable only shows the lead instructor. Open the class, choose Cover, and pick {instrFirst} as the cover instructor. The timetable then shows “{instr} (covering)”, and her pay report picks the class up too.'], ['c', 'Got it, that worked. I’d been using the wrong box all along. Thanks!']]
				],
				happy: true
			},
			{
				detail: ['It’s {cls} on {sessionDay}. {instr} is new, she only started with us last week, and she isn’t in the list.', '{cls}, {session}. When I go to choose the instructor, {instrFirst} isn’t an option.'],
				look: ['{instr} isn’t in the studio’s instructor list. Someone with the owner role needs to add her under Staff before she can be picked.'],
				lookPaste: 'roles',
				mark: 'plain',
				ends: [
					[['a', '{instr} isn’t in your instructor list yet, which is why you can’t choose her. Someone with the owner role needs to add her under Staff, then Instructors, with her name and pay rate. Once she’s there, she can be picked as cover on any class.'], ['c', 'I don’t have the owner role; {staff2} does, and she’s off until {day}. I’ll ask her when she’s back.']]
				]
			},
			{
				detail: ['{cls}, {session}. I changed the instructor to {instr} about twenty minutes before I wrote to you.', 'It’s {session}. I put {instrFirst} on as cover just now, just before emailing.'],
				look: ['Cover set at {changeClock}; the timetable page keeps class details for up to an hour. It’s showing {instr} now.'],
				lookPaste: 'classSettings',
				mark: 'cover',
				ends: [
					[['a', 'It’s showing {instr} now. The timetable page keeps class details for up to an hour before it refreshes, so a change made just before you wrote took a while to appear. Changes to the time and the number of spaces show straight away; the instructor and description can lag.'], ['c', 'Ah, I see it now. A bit of patience needed then! Thanks.'], ['a', 'You’re welcome. The booking team are shortening that delay, though there’s no date yet.']]
				]
			}
		]
	},
	// One edit changed a whole series.
	{
		subjects: ['Changed one class, all of them changed', 'Help, I’ve broken the timetable', 'Series edit went wrong', 'Undo a change?'],
		open: [
			'I changed the time of one {cls} class, the one on {sessionDay}, because of a hall booking, and every {cls} for the rest of the year moved too. Members have been booked into the new times. Can you undo it?',
			'I tried to change a single {cls}, the one on {sessionDate}, and I think it’s changed the whole series. Members are already asking why their regular class has moved.',
			'I edited the capacity on one class and now I think I’ve changed all of them, including the past ones, because the attendance report looks very strange.'
		],
		more: ['I feel terrible about it.', 'Please tell me this can be fixed without doing every class by hand.'],
		ask: ['Don’t worry, this can usually be put right. Which class did you change, and roughly when?', 'Let’s see what happened. Which series is it, and when did you make the change?'],
		paths: [
			{
				opens: [0, 1],
				detail: ['It was {cls} at {sessionTime}. I picked the option at the bottom when it asked.', 'The {cls} series. I changed it on {wday} afternoon and just clicked through the question it asked.'],
				look: ['Series {series} edited at {changeClock} with “This and following classes”. The series history has the earlier version; it can be restored.'],
				lookPaste: 'log',
				mark: 'series',
				ends: [
					[['a', 'When you saved, the option chosen was “This and following classes”, so the change went to every later class in the series. The good news is that the series keeps a history: open the series, choose History, pick the version from before {changeClock} on {wday} and Restore. Bookings move back with the classes. Then make your change again on the one class, choosing “Only this class”.'], ['c', 'Restored, and everyone is back where they were. I’ll read the options more carefully next time. Thank you so much.']]
				],
				happy: true
			},
			{
				opens: [2],
				detail: ['It was the capacity on {cls}, on {sessionDay}. I chose “Only this class”, I’m sure of it.', 'I changed the spaces on just the {sessionDate} {cls}, and I definitely picked “Only this class”.'],
				look: ['History shows “Only this class”, but past classes in the series also have the new capacity. Past fill rates in the attendance report are now wrong. Passing to booking.'],
				lookPaste: 'attendance',
				mark: 'pastcap',
				team: 'booking team',
				ends: [
					[['k', 'Bug: saving the capacity on a single class rewrites past classes of the series when the series was created before 1 September. Attendance numbers are fine; fill percentages are off. Fix and a repair of affected classes planned for the next release.'], ['a', 'Thanks for bearing with us. You did choose the right option: there’s a fault that applies a capacity change to past classes in older series. Bookings and attendance numbers aren’t affected, only the fill percentages in reports. The booking team are fixing it and will repair the affected classes when the fix goes out. I’ll update you here.'], ['c', 'Thank you. As long as the bookings are right, I can live with odd percentages for a bit.']]
				]
			}
		]
	},
	// Closing for Christmas.
	{
		subjects: ['Closing over Christmas', 'Christmas timetable', 'Cancelling classes for the holidays', 'Holiday closure'],
		open: [
			'We close from {closeFrom} to {closeTo} for Christmas. What’s the best way to take all the classes off without cancelling them one by one? On our old system I spent an afternoon doing it.',
			'I want to put our Christmas and New Year closure into Perch now, so members can’t book classes we won’t run. How do I do it without upsetting anyone who has already booked?',
			'We’re running a reduced timetable over Christmas: only {cls} and {cls2}, and closed on the bank holidays. How do I set that up?',
			'We put our Christmas closure into Perch last week, and now members are asking me about their credits.'
		],
		more: ['December is always a juggle for us.', 'We close for longer than most studios, so it matters to us.'],
		ask: ['Good thinking to do it early. Have you set anything up for it yet, or are you starting from scratch?', 'Happy to help. Is it a full closure, or are some classes still running?'],
		paths: [
			{
				opens: [0, 1],
				detail: ['Starting from scratch. We’re closed completely from {closeFrom} to {closeTo}.', 'Nothing yet. Fully closed {closeFrom} to {closeTo}, apart from one {cls2} on the 30th, which I can add back myself.'],
				look: [],
				lookPaste: 'none',
				mark: 'plain',
				ends: [
					[['a', 'The easiest way is a closure: under Timetable, choose Closures, add {closeFrom} to {closeTo}, and every class in those dates is cancelled in one go. Anyone already booked gets their credit back, and members on Unlimited monthly aren’t charged anything extra. The classes stay visible as “Closed”, so nobody wonders where they went.'], ['c', 'That’s brilliant, done in two minutes. Thank you!']]
				],
				happy: true
			},
			{
				opens: [3],
				subjects: ['Credits after our closure'],
				detail: ['I used Closures for {closeFrom} to {closeTo} last week. But {member} says her pack credits haven’t come back for the two classes she’d booked.', 'I did a closure on {wday}. Some members have told me their credits didn’t come back, {member} for one.'],
				look: ['Closure created on {wday}. Bookings were cancelled, but credits on packs bought before the pack changes in September weren’t returned. {n} members affected. Payments can return them.'],
				lookPaste: 'ledger',
				mark: 'closure',
				team: 'payments team',
				ends: [
					[['a', 'You did everything right. The closure cancelled the bookings, but for packs bought before September the credits weren’t put back, which is a fault on our side. I’ve passed the list of the {n} members affected to our payments team, who will return the credits. You don’t need to do anything.'], ['p', 'Picked up. Will return credits for the affected bookings in the next batch run.'], ['c', 'Thanks. Could you let me know once it’s done, so I can tell {memberFirst}?']]
				]
			},
			{
				opens: [0, 1, 2],
				subjects: ['Holiday message on the timetable'],
				detail: ['I’ve worked out the closure myself, but is there any way to put a message on the timetable page, like “Happy holidays, back on 4 January”?', 'The closure is in. What I’d love is a banner on the timetable saying when we’re back.'],
				look: [],
				lookPaste: 'none',
				mark: 'plain',
				ends: [
					[['a', 'Not yet, I’m afraid: the timetable page shows the closed days but no message. A notice on the timetable page has been asked for by quite a few studios, and I’ve added yours to the request. For now, a lot of studios put the message in the description of the first class back.'], ['c', 'OK, we’ll do that. Thanks.']]
				]
			}
		]
	},
	// Credits gone from a class pack.
	{
		subjects: ['Credits disappeared', 'Pack expired early', 'Member’s credits gone', 'Where have her classes gone?'],
		open: [
			'{member} bought a {pack} in {bought} and says she still had {credits} classes left, but Perch now says she has none and the pack has expired. She’s upset and so am I, because I’m sure our packs last six months.',
			'One of our members, {member}, has lost {credits} credits from her {pack}. She hasn’t used them, she says. Can you see where they went?',
			'How does pack expiry work? I have a member whose pack says expired, and I think it should still have weeks left.'
		],
		more: ['She’s one of our most loyal members.', 'I’d rather understand it than just add the credits back, in case it happens to others.'],
		ask: ['Let me look. What’s the member’s name in Perch, and which pack is it?', 'I can check her pack history. Could you confirm the member and roughly when she bought it?'],
		paths: [
			{
				opens: [0, 2],
				detail: ['It’s {member}. She bought it on {boughtDate}; it’s our {pack}.', 'It’s {member}, {pack}, bought {boughtDate}.'],
				look: ['Pack set to expire three months from purchase (studio setting), not six. Bought {boughtDate}, expired {expiredDate} with {credits} unused.'],
				lookPaste: 'ledger',
				mark: 'expiry',
				ends: [
					[['a', 'Your {pack} is set to expire three months after it’s bought, not six, so {member}’s pack ran out on {expiredDate} with {credits} classes unused. If your packs should last six months, change Expiry on the pack under Passes. That only affects new purchases, so for {memberFirst} open her pack and choose Extend; give her the missing time and the credits come back.'], ['c', 'We changed it to three months on our price list in spring and then changed our minds, and clearly only did half. I’ve fixed the pack and extended hers. Thanks.']]
				]
			},
			{
				opens: [1],
				detail: ['It’s {member}. She’s on a household pack with her partner; the pack is our {pack}.', 'It’s {member}’s {pack}, which she shares with {member2}.'],
				look: ['Household pack shared by {member} and {member2}. {member2First} used {credits} of the credits.'],
				lookPaste: 'ledger',
				mark: 'household',
				ends: [
					[['a', 'Her {pack} is a shared household pack with {member2}, and {member2First} booked {credits} classes on it, which you can see in the pack’s history. So nothing has gone missing, though I can see why it looked that way from {memberFirst}’s side.'], ['c', 'Oh dear, that’s a conversation for them to have at home then. Thanks for finding it.']]
				],
				happy: true
			},
			{
				opens: [0, 2],
				detail: ['It’s {member}. She paused for {weeks} weeks in the summer with a knee injury, and the pack didn’t move. The pack is {pack}.', '{member}. She was injured over the summer and we paused her for {weeks} weeks. Her pack seems to have expired as if she hadn’t been paused.'],
				look: ['Pause recorded {pauseFrom} to {pauseTo}; pack expiry not moved. Pausing only moves membership dates, not packs. Booking team have it as a known gap.'],
				lookPaste: 'ledger',
				mark: 'pause',
				team: 'booking team',
				ends: [
					[['a', 'The pause was recorded, but it only moved the dates of her membership, not her pack, which is a gap in how pausing works rather than anything you did. The booking team have it on their list. For now, open her pack, choose Extend and add the {weeks} weeks; her credits come back straight away.'], ['c', 'Extended, thanks. She’s happy. Will the fix sort out other members who paused?'], ['a', 'It will apply to pauses from then on. For past ones, the pack list under Passes can show packs held by members who paused, if you want to check others.']]
				]
			},
			{
				detail: ['It’s {member}. She came over from our old system, {oldSystem}, in {signupMonth}, and she had {credits} credits there.', '{member}. Her pack was imported from {oldSystem} when we joined Perch in {signupMonth}.'],
				look: ['Pack imported in {signupMonth}; the import set its expiry from the import date, not the original expiry. Data team can correct the whole import.'],
				lookPaste: 'import',
				mark: 'imported',
				team: 'data team',
				ends: [
					[['a', 'Her pack came over in the import from {oldSystem}, and it was given an expiry date counted from the import rather than the date it had in {oldSystem}, which is wrong. I’ve asked our data team to go through your import and correct the expiry of every imported pack, not just {memberFirst}’s.'], ['d', 'Will rerun expiry from the source file for this studio. Need the original export again; the copy we kept is incomplete.'], ['a', 'Our data team need the original export file from {oldSystem} again to correct the dates. Could you send it?'], ['c', 'I’ll have to ask {staff2}, she did the export. Bear with me.']]
				]
			}
		]
	},
	// Pausing a membership.
	{
		subjects: ['Pausing a membership', 'Freeze membership', 'Pause question'],
		open: [
			'{member} is having an operation and wants to pause her Unlimited monthly membership for {n} weeks. How do I do that without cancelling her?',
			'{member} paused her membership in {month} but was charged {unlimitedPrice} again on the {chargeDay}. She’s asked for her money back.',
			'Can members pause their own memberships, or does it have to be us? And can we charge something while they’re paused?'
		],
		more: ['We want to handle these fairly.', 'We get a lot of these requests in winter.'],
		ask: ['Of course. Is this about pausing someone now, someone who is already paused, or how pausing works in general?', 'Happy to help. Is there a pause in place already, or is this about how you’d like pausing to work?'],
		paths: [
			{
				opens: [0],
				detail: ['Setting it up now. She wants to stop from next week.', 'Nothing done yet. She’d like to pause from the start of next month.'],
				look: [],
				lookPaste: 'none',
				mark: 'plain',
				ends: [
					[['a', 'Open {memberFirst}’s profile, choose her membership and then Pause. Pick the first and last day; nothing is charged in between, and the next payment moves back by the length of the pause. Members can’t pause themselves at the moment, which most studios prefer.'], ['c', 'Done, thank you. Easy when you know where to look.']]
				],
				happy: true
			},
			{
				opens: [1],
				subjects: ['Member charged while paused'],
				detail: ['She paused from {pauseFrom} to {pauseTo}, and was charged on {chargeDate}.', 'The pause runs {pauseFrom} to {pauseTo}. The charge was on {chargeDate}.'],
				look: ['The pause was added after that month’s payment had been created, so it went through. Needs a refund from payments; it was in the {payoutDate} payout.'],
				lookPaste: 'payments',
				mark: 'paused',
				team: 'payments team',
				ends: [
					[['a', 'The pause was added a day after that month’s payment had already been taken, so it wasn’t stopped. Because the money has already been paid out to you, our payments team will refund her and take it from your next payout. I’ve passed it to them.'], ['P', 'I’ve refunded {unlimitedPrice} to {member}’s card today. It will show on her statement in three to five working days, and it will come off your payout on {nextPayout}.'], ['c', 'Thank you both.']],
					[['a', 'The payment had already been created when the pause went in, so it went through. As it’s been paid out to you, the refund has to come from our payments team. I’ve passed it to them.'], ['p', 'Picked up. Will refund once the {payoutDate} payout has settled.'], ['c', 'OK, please let me know when it’s done so I can tell her.']]
				]
			},
			{
				opens: [2],
				subjects: ['Pause fee?'],
				detail: ['We’d like to charge a small fee while someone is paused, say {pauseFee} a month, to hold their rate. Is that possible?', 'What we really want is a pause fee, {pauseFee} a month, like our old gym had.'],
				look: [],
				lookPaste: 'none',
				mark: 'plain',
				ends: [
					[['a', 'Not yet: a pause stops payments entirely. A pause fee is a common request and the payments team have it on their list; I’ve added you. Some studios sell a “Hold” pass at the fee instead, which members buy during the pause.'], ['c', 'The “Hold” pass is a good idea. We’ll do that for now, but please count us in for the real thing.']]
				]
			}
		]
	},
	// A payout.
	{
		subjects: ['Payout looks wrong', 'Where’s the rest of our money?', 'Payout question'],
		open: [
			'This week’s payout was {payoutNet}, and by my reckoning we took about {gross} in class sales. That’s a big difference. Can you explain?',
			'Our payout on {payoutDate} is lower than I expected and I can’t make it match our sales report. Our accountant is asking.',
			'We haven’t had this week’s payout yet, or if we have, it’s much smaller than usual. It normally arrives on a Tuesday.'
		],
		more: ['Cash flow is tight in the autumn, so I need to understand this.', 'Our accountant does the books on Fridays.'],
		ask: ['Let me take a look. Which payout is it? The reference starts with PO.', 'Of course. Could you send me the payout reference or its date?'],
		paths: [
			{
				opens: [0, 1],
				detail: ['It’s payout {pid}, on {payoutDate}.', 'The reference is {pid}.'],
				look: ['Payout {pid}: card fees, {n} refunds and the monthly Perch fee came off this week. It adds up.'],
				lookPaste: 'payout',
				lookWho: 'p',
				mark: 'plain',
				ends: [
					[['a', 'I’ve been through payout {pid} line by line, and it adds up: card fees came off as usual, there were {n} refunds that week, and the monthly Perch subscription is taken from the first payout of each month. The sales report shows money taken before any of that. The payout report, under Reports, then Payouts, shows the same breakdown for any week, which your accountant may find easier.'], ['c', 'Thank you, that’s clear. The subscription coming out of the payout was what threw me. I’ll send the accountant the payout report.']]
				],
				happy: true
			},
			{
				opens: [0, 1],
				detail: ['It’s payout {pid}.', 'Reference {pid}, on {payoutDate}.'],
				look: ['A chargeback of {chargeback} from {member} for an Unlimited monthly payment came off this payout. The studio can contest it; evidence due {disputeBy}.'],
				lookPaste: 'payout',
				lookWho: 'p',
				mark: 'chargeback',
				ends: [
					[['a', 'The difference is a chargeback: {member}’s bank reversed a payment of {chargeback} after she disputed it, so it came off this payout. You can contest it if the payment was fair. Our payments team need your evidence by {disputeBy}: her booking history for the month and your membership terms usually win it. Reply with those and Gus will send them on.'], ['c', 'She definitely came to classes that month. I’ll pull the history together and send it by {day}.']]
				]
			},
			{
				opens: [2],
				subjects: ['No payout this week'],
				detail: ['We usually get paid on Tuesdays and nothing came this week.', 'There’s been nothing since the {payoutDate} one.'],
				look: ['Payouts paused: the bank account check failed after the studio changed its bank details on {wday}. Needs a bank statement uploaded.'],
				lookPaste: 'payout',
				lookWho: 'p',
				mark: 'held-payout',
				ends: [
					[['a', 'Your payouts are paused because the bank details were changed on {wday}, and the new account couldn’t be checked automatically. Once a recent bank statement for the new account is uploaded under Settings, then Payouts, the payments team release everything that’s waiting, usually within a day.'], ['c', 'Ah, yes, we moved banks. I’ll upload the statement when {staff2} sends me one.']]
				]
			},
			{
				opens: [0, 1],
				detail: ['It’s {pid}. I think the Perch subscription came out twice.', 'Payout {pid}. Two lines for the Perch fee, unless I’m reading it wrong.'],
				look: ['Correct: the subscription fee was taken twice in {pid} after a retry. Payments to put it back.'],
				lookPaste: 'payout',
				mark: 'double-fee',
				team: 'payments team',
				ends: [
					[['a', 'You’re right: the subscription was taken twice from payout {pid}, after a retry on our side. I’ve passed it to payments to put back.'], ['P', 'The duplicate {planPrice} will be added back to your payout on {nextPayout}. Sorry about that.'], ['c', 'Great, thanks for sorting it.']]
				],
				happy: true
			}
		]
	},
	// Card payments.
	{
		subjects: ['Card payments failing', 'Members’ cards declined', 'Payment failed', 'Problem taking payments'],
		open: [
			'Several members say their card was declined when they tried to buy a {pack} this morning, including {member}, who says her card works everywhere else.',
			'We have a member, {member}, whose monthly payment has failed three times. She’s asked us whether it’s our fault or her bank’s.',
			'New members trying to buy the {introOffer} keep getting “Payment could not be completed”. It’s costing us sign-ups.'
		],
		more: ['We’ve just had a leaflet drop, so this is the worst week for it.', 'I’d like to know whether it’s something on our side.'],
		ask: ['Sorry about that. When did it happen, and do you know of anyone else it has happened to?', 'Let me look at the payment attempts. Roughly when were they, and was anyone else affected?'],
		paths: [
			{
				opens: [0, 2],
				detail: ['It was {member} and {member2}, both this morning.', '{member} is one. She tried twice around nine.'],
				look: ['Failed at the bank’s security check: approval in the banking app not completed in time.'],
				lookPaste: 'payments',
				mark: 'declined',
				ends: [
					[['a', 'The failed payments all stopped at the bank’s security check, where the member is asked to approve the payment in their banking app. If they don’t approve within a few minutes, the payment fails with that message. It’s worth telling members to keep their banking app handy. Nothing is wrong on your side or ours.'], ['c', 'That makes sense: two of them said they never saw the approval. Thanks.']]
				]
			},
			{
				opens: [0, 2],
				detail: ['It was between about {outFrom} and {outTo} this morning.', 'All this morning, from about {outFrom} until {outTo}.'],
				look: ['Card processor outage {outFrom} to {outTo} on {wday}; every failed payment for this studio is in that window.'],
				lookPaste: 'payments',
				mark: 'outage',
				ends: [
					[['a', 'Our card processor had a fault between {outFrom} and {outTo} on {wday} morning, and payments across Perch failed during that time. It’s been fixed, and members can try again now. I’m sorry for the lost sales.'], ['c', 'Thanks. Two of them have bought since, so it seems fine now.']]
				],
				happy: true
			},
			{
				opens: [1],
				detail: ['It’s {member}. Her payment fails every month on the {chargeDay}.', '{member}. It failed on the {chargeDay}, and on the two retries after.'],
				look: ['Her bank declines with a general refusal. Nothing we can do; she needs to speak to her bank or add another card.'],
				lookPaste: 'payments',
				mark: 'refusal',
				ends: [
					[['a', 'Her bank is refusing the payment without giving a reason, which only the bank can explain. The best fix is for {memberFirst} to call her bank, or to add a different card on her account page; the next attempt will use it.'], ['c', 'I’ll let her know. She’s in on {day}, so I’ll talk to her then.']]
				]
			}
		]
	},
	// Changing prices.
	{
		subjects: ['Putting our prices up', 'Price change for members', 'New prices from January'],
		open: [
			'We’re raising Unlimited monthly from {unlimitedPrice} to {newPrice} in January. What happens to existing members if I change the price in Perch?',
			'I want to change our prices, but keep our founding members on their old rate. Is that possible?',
			'How do price changes work in Perch? Our costs have gone up and we need to raise the {pack} and the membership.'
		],
		more: ['We haven’t put prices up in three years, so I’m nervous about it.', 'Our rent goes up in January.'],
		ask: ['Happy to walk you through it. Do you want existing members to move to the new price, or only new ones?', 'Of course. Is it new members only, or everyone?'],
		paths: [
			{
				opens: [0, 2],
				detail: ['Everyone, from 1 January. We’re giving members a month’s notice.', 'Everyone, I’m afraid. We’ll tell members in December.'],
				look: [],
				lookPaste: 'none',
				mark: 'plain',
				team: 'payments team',
				ends: [
					[['a', 'Changing the price on the membership only affects new sign-ups; existing members stay on the price they joined at. To move existing members, the payments team can do it in bulk on a date you choose, as long as you’ve given members the notice your terms require.'], ['c', 'Please ask them to move everyone to {newPrice} from 1 January.'], ['a', 'Done: I’ve passed it to payments with the date. They’ll confirm here before it runs.'], ['p', 'Bulk price change scheduled for 1 January. Will confirm the member count with the studio before it runs.']]
				]
			},
			{
				opens: [1],
				subjects: ['Founding members’ rate'],
				detail: ['New members only. Our founders stay on their price for as long as they stay.', 'Only new members. The ones who joined in our first year keep their price.'],
				look: [],
				lookPaste: 'none',
				mark: 'plain',
				ends: [
					[['a', 'Then it’s simple: members keep the price they joined at until someone changes it. If you raise the price on the membership, your founding members stay on their old rate automatically. If you’d like to see who they are, the Memberships report shows each member’s price.'], ['c', 'Lovely, that’s exactly what we want. Thank you.']]
				],
				happy: true
			}
		]
	},
	// The attendance report.
	{
		subjects: ['Attendance report doesn’t add up', 'Report numbers look wrong', 'Attendance figures'],
		open: [
			'The attendance report says {cls} averaged {fill}% full last month, but I’m in most of those classes and they feel fuller. I’m using the report to decide which classes to cut, so I need to trust it.',
			'Our attendance report for last month shows more bookings than people who came, by quite a lot. Is it counting cancellations?',
			'When I download the attendance report and open it, half the names are full of strange characters, and the totals don’t seem to match what’s on screen.'
		],
		more: ['We’re reviewing the timetable for January, so I need numbers I can rely on.', 'Our accountant uses these figures as well.'],
		ask: ['Let me look at the report with you. Which date range and which class are you looking at?', 'Sure. Could you tell me the dates you ran it for, and which numbers look wrong?'],
		paths: [
			{
				opens: [0, 1],
				detail: ['{reportMonth}, all classes. The Booked column is much higher than I’d expect.', 'I ran it for {reportMonth}. {cls} looks the worst.'],
				look: ['The report counts late cancellations and no-shows as bookings; “Attended” only counts check-ins. Studio has a lot of late cancels.'],
				lookPaste: 'attendance',
				mark: 'plain',
				ends: [
					[['a', 'The report counts every booking that wasn’t cancelled in time, including late cancellations and no-shows, and “Attended” only counts people who were checked in. The difference you’re seeing is mostly late cancellations. If you want fill by attendance, use the Attended column.'], ['c', 'That makes sense, and it means our late cancellation problem is worse than I thought. Thanks.']]
				],
				happy: true
			},
			{
				opens: [0],
				detail: ['It’s {cls}. The report has {n} fewer classes than we actually ran last month.', '{reportMonth}. Some {cls} classes are missing altogether.'],
				look: ['The missing classes are the ones with a cover instructor; the report drops covered classes for series older than the cover feature. Console team aware.'],
				lookPaste: 'attendance',
				lookWho: 'n',
				mark: 'cover',
				team: 'console team',
				ends: [
					[['o', 'Confirmed. The attendance report skips covered classes in series made before cover existed. Fix is in progress.'], ['a', 'Thanks for waiting. The missing classes are all ones where someone covered, and there’s a fault in the report that leaves out covered classes in older series. The console team are fixing it. Until then, the class list under Timetable shows every class with its attendance, if you need {reportMonth}’s numbers now.'], ['c', 'Thanks. I’ll use the class list for now. Let me know when the report is right.']]
				]
			},
			{
				opens: [2],
				subjects: ['Export looks garbled'],
				detail: ['It’s names like {accentName} that come out as nonsense. I open it by double-clicking it.', 'Any name with an accent comes out wrong, like {accentName}. I just double-click the file.'],
				paste: 'csv',
				look: ['The file is fine; Excel opens it with the wrong character set when double-clicked. Console team plan to change the export so Excel reads it properly.'],
				lookPaste: 'none',
				mark: 'plain',
				ends: [
					[['a', 'The file itself is fine, but Excel guesses the wrong character set when you double-click it. In Excel, use Data, then From Text/CSV, and choose UTF-8, and the names come out right. The console team are changing the export so Excel gets it right by itself.'], ['c', 'That worked. A bit of a faff each month, so please do let me know when it’s changed.']]
				]
			}
		]
	},
	// The instructor pay report.
	{
		subjects: ['Instructor pay', 'Pay report question'],
		open: [
			'{instr} says her pay for {reportMonth} is short. She’s paid per head on {cls}, and the report gives her less than she worked out.',
			'The instructor pay report has paid {instr2} for classes that {instr} covered. Which is right?',
			'Can the pay report pay instructors for classes we cancel at short notice? Our agreement with them says we do.'
		],
		more: ['Payroll goes in on the {payrollDay}, so I’m up against it.', 'I want to get this right; our instructors are freelancers and it’s their living.'],
		ask: ['Let me look at the report for you. Which instructor and which month?', 'Of course. Could you tell me the instructor and the classes in question?'],
		paths: [
			{
				opens: [0],
				subjects: ['Instructor pay wrong'],
				detail: ['It’s {instr}, {reportMonth}. She counts {heads} heads across her {cls} classes, and the report says fewer.', '{instr}, for {reportMonth}.'],
				look: ['Per-head rate counts checked-in members only; the instructor counted bookings, no-shows included. The setting can count bookings instead.'],
				lookPaste: 'pay',
				mark: 'noshow-rate',
				ends: [
					[['a', 'The pay report counts people who were checked in, and {instrFirst} has counted everyone booked, including no-shows. If your agreement with instructors is per booking, change “Per-head counts” to “Booked” on her pay rate under Staff.'], ['c', 'Our agreement says attended, so the report is right. I’ll explain to her. Thanks.']]
				]
			},
			{
				opens: [1],
				subjects: ['Cover pay'],
				detail: ['{instr} covered {n} of {instr2First}’s classes in {reportMonth}, and the report gives them all to {instr2First}.', 'It’s {reportMonth}. {instrFirst} covered for {instr2First} on {n} classes.'],
				look: ['Covered classes are still paid to the lead in the pay report for series created before the cover feature. Console team aware.'],
				lookPaste: 'pay',
				lookWho: 'o',
				mark: 'cover',
				team: 'console team',
				ends: [
					[['O', 'The pay report gives covered classes to the regular instructor when the series is older than the cover feature. We’re fixing the report; until then, please adjust the two instructors’ totals by hand.'], ['c', 'OK. When will it be fixed? Payroll is on the {payrollDay}.'], ['a', 'They’re aiming for before the end of the month but can’t promise it. I’ll update you here either way.']]
				]
			},
			{
				opens: [2],
				subjects: ['Pay for cancelled classes'],
				detail: ['Our agreement says an instructor gets half pay if we cancel within 24 hours. I’d like the report to show that.', 'We pay half the class rate when we cancel late. Can the report do it?'],
				look: [],
				lookPaste: 'none',
				mark: 'plain',
				ends: [
					[['a', 'Not automatically: cancelled classes drop out of the pay report. You can add a one-off amount to an instructor’s pay for the month under Staff, then Pay adjustments, which shows up in the report and the export.'], ['c', 'Adjustments will do. Thanks.']]
				],
				happy: true
			}
		]
	},
	// Who sees what in the console.
	{
		subjects: ['Staff permissions', 'Who can see what?'],
		open: [
			'{staff} on our front desk mentioned the day’s takings to me, which she shouldn’t be able to see. What can front desk staff see in the console?',
			'I want our instructors to be able to see their own class rosters but nothing about money. How do I set that up?',
			'Can you tell me what each staff role can see? I’ve just realised I don’t really know.'
		],
		more: ['I’d like to get it right before anyone else joins.', 'We’re taking on two new people in {nextMonth}.'],
		ask: ['Good question. Who is it about, and which role do they have at the moment?', 'Happy to explain. Which staff members are you thinking of?'],
		paths: [
			{
				opens: [0, 2],
				subjects: ['Staff can see our takings', 'Who can see revenue?'],
				detail: ['It’s {staff}. I don’t know what role she has, {staff2} set her up.', '{staff}, on the desk.'],
				look: ['{staff} has the Manager role. The Front desk role hides revenue.'],
				lookPaste: 'roles',
				mark: 'manager',
				ends: [
					[['a', '{staff} has the Manager role, which includes revenue and reports. The Front desk role can book members, check them in and take payments, but doesn’t see takings or reports. Change her role under Staff.'], ['c', 'Done. I’ll check the others too.']]
				],
				happy: true
			},
			{
				opens: [0],
				subjects: ['Staff can see our takings'],
				detail: ['{staff} is on Front desk, I’m sure, but she sees the total at the bottom of the day sheet.', 'She has the Front desk role. The takings are at the bottom of her check-in screen.'],
				look: ['Front desk role sees the day sheet, which shows the day’s takings at the bottom. No way to hide it today.'],
				lookPaste: 'roles',
				mark: 'deskrole',
				ends: [
					[['a', 'She has the Front desk role, which is the right one, but the day sheet she uses to check people in shows the day’s takings at the bottom, and there isn’t a way to hide it. I’ve asked the console team for a setting to hide takings from the Front desk role and added your studio to the request.'], ['c', 'Please do. It’s not a disaster, but I’d rather it wasn’t there.']]
				]
			},
			{
				opens: [1, 2],
				subjects: ['Roles for instructors'],
				detail: ['Instructors, mostly. {instr} and {instr2} would like to see who’s booked.', 'It’s our instructors. They keep asking the desk who’s coming.'],
				look: [],
				lookPaste: 'roles',
				mark: 'plain',
				ends: [
					[['a', 'Give them the Instructor role under Staff: they see the rosters of their own classes and can check people in, and nothing about payments or other instructors.'], ['c', 'Thank you, that’s what I hoped.']]
				],
				happy: true
			}
		]
	},
	// The console is slow.
	{
		subjects: ['Something went wrong', 'Console problem'],
		open: [
			'The console was painfully slow first thing this morning. The day sheet took a minute to load and we had a queue at the desk.',
			'The timetable page in the console has been blank for me since yesterday. Other pages work.',
			'Every time I try to run the bookings report for the whole year, it spins and then says “Something went wrong”.'
		],
		more: ['It’s the first time this has happened to us.', 'We rely on the console for everything at the desk.'],
		ask: ['Sorry about that. When did it happen, and which page were you on?', 'Let me look. Could you tell me which browser you use, and what you see on the screen?'],
		paths: [
			{
				opens: [0],
				subjects: ['Console very slow'],
				detail: ['It was the day sheet, between about seven and eight.', 'Everything, but mostly the day sheet, just after seven.'],
				look: ['Matches the slowdown on {wday} 07:10 to 07:55, after overnight database maintenance overran.'],
				lookPaste: 'none',
				mark: 'plain',
				ends: [
					[['a', 'You weren’t imagining it: the console was slow for everyone between about 07:10 and 07:55 on {wday}, after overnight maintenance overran. It’s been back to normal since. Sorry for the queue.'], ['c', 'Thanks for letting me know. All fine today.']]
				],
				happy: true
			},
			{
				opens: [1],
				subjects: ['Timetable won’t load'],
				detail: ['I’m on {browser}. I do have a few extensions. This is what the browser shows:', 'It’s {browser}. Here’s what I see:'],
				paste: 'error',
				look: ['Browser console shows the timetable script blocked by an extension, probably an ad blocker.'],
				lookPaste: 'none',
				mark: 'blocked',
				ends: [
					[['a', 'The error shows that a browser extension, probably an ad blocker, is stopping the timetable from loading part of itself. If you allow the console in the extension, or try a private window, it should load.'], ['c', 'It was the ad blocker. Working now, thanks.']]
				],
				happy: true
			},
			{
				opens: [2],
				subjects: ['Report times out'],
				detail: ['It’s the bookings report, 1 January to now. Here’s what it says:', 'Bookings report for the year so far. This is the message:'],
				paste: 'error',
				look: ['Year-long bookings report times out for a studio this size. Console team are moving big reports into the background.'],
				lookPaste: 'none',
				mark: 'timeout',
				ends: [
					[['a', 'The bookings report for a whole year is too large to build in one go for a studio of your size at the moment. Running it a quarter at a time works. The console team are rebuilding reports so that big ones are prepared in the background and appear under Downloads when they’re ready.'], ['c', 'Quarters it is. Please let me know when the bigger ones work.']]
				]
			}
		]
	},
	// The check-in tablet.
	{
		subjects: ['Check-in iPad problem', 'Problem with check-in'],
		open: [
			'Our check-in iPad on the desk still showed yesterday’s classes this morning, so nobody could check in for the {sessionTime}. We had to do it on the laptop.',
			'Several members were marked as no-shows for {cls} on {sessionDay} even though they checked in on the iPad. One was charged our no-show fee.',
			'Something is wrong with the check-in iPad. It’s showing the wrong classes, or the right classes on the wrong day, I can’t tell which.'
		],
		more: ['The iPad is meant to save us time at the busiest part of the morning.', '{staff} thinks it’s been going on for a few days.'],
		ask: ['Sorry about that. What does the iPad show at the top of the check-in page, and when did it start?', 'Let’s find out. When did you last see it working properly, and was anything changed on the iPad?'],
		paths: [
			{
				opens: [0, 2],
				subjects: ['Check-in tablet showing yesterday'],
				detail: ['At the top it says yesterday’s date. Nobody has touched it as far as I know.', 'It started on {wday}. The date at the top is a day behind.'],
				look: ['The tablet’s own date and time are set by hand and a day behind.'],
				lookPaste: 'tablet',
				mark: 'clock',
				ends: [
					[['a', 'The check-in log shows the iPad thinks it’s a day earlier: its date and time have been set by hand. In the iPad’s settings, under General, then Date & Time, turn on “Set automatically”, and the check-in page will follow.'], ['c', 'Someone had turned it off when the clocks changed, I bet. Fixed. Thanks.']]
				],
				happy: true
			},
			{
				opens: [0, 2],
				subjects: ['Check-in tablet showing yesterday'],
				detail: ['We leave the check-in page open on it overnight, and in the morning it’s still on the day before.', 'It sits on the check-in page all the time. Every morning it shows the previous day until someone fiddles with it.'],
				look: ['The check-in page left open overnight doesn’t move to the new day. Known; console team.'],
				lookPaste: 'tablet',
				mark: 'midnight',
				team: 'console team',
				ends: [
					[['a', 'The check-in page doesn’t move on to the next day if it’s left open overnight, which is a fault on our side that the console team are fixing. Until then, pulling down to refresh the page each morning brings up the day’s classes.'], ['c', 'OK, we’ll add it to the opening checklist. Please let me know when it’s fixed.']]
				]
			},
			{
				opens: [1],
				subjects: ['Members marked as no-shows', 'Check-ins not saving'],
				detail: ['It was {cls} on {session}. The Wi-Fi was patchy that morning.', '{session}. Our internet was up and down all morning.'],
				look: ['Check-ins made while offline were queued on the tablet but never sent; {n} lost. Console team investigating why the queue didn’t send.'],
				lookPaste: 'tablet',
				mark: 'offline',
				team: 'console team',
				ends: [
					[['a', 'The iPad lost its connection, held the check-ins and should have sent them when the connection came back, but they never arrived. I’ve passed it to the console team to find out why. In the meantime, you can mark those members as attended on the class roster, and refund the no-show fee from the member’s payments.'], ['o', 'Looking at the tablet’s sync log. Will update here.'], ['c', 'Thanks. I’ve marked them attended and refunded the fee.']]
				]
			}
		]
	},
	// Moving from another booking system.
	{
		newcomer: true,
		subjects: ['Moving from our old booking system', 'Bringing our members over', 'Switching to Perch'],
		open: [
			'We’re moving from {oldSystem} to Perch at the end of {nextMonth}. How do we bring across our members, their passes and remaining credits?',
			'We signed up last week and need to bring our members over from {oldSystem}. What do you need from us?',
			'Our import from {oldSystem} went through on {wday}, but some things look wrong.'
		],
		more: ['We have about {N} members, so typing them in isn’t an option.', 'I want members to notice as little as possible.'],
		ask: ['Thanks for getting in touch. Where have you got to with the import: have you sent us your files yet, or has it already run?', 'Let me check where things stand. Has the import run yet, or are you still gathering the files?'],
		paths: [
			{
				opens: [0, 1],
				detail: ['Nothing sent yet. We haven’t even got the files from {oldSystem}.', 'Not yet. I wanted to know what you need first.'],
				look: [],
				lookPaste: 'none',
				mark: 'plain',
				ends: [
					[['a', 'Our data team do the import for you. They need the members export and the passes export from {oldSystem}, both as spreadsheets. Once we have them, the import takes two or three working days, and you can check everything before members are told.'], ['c', 'I’ve asked {oldSystem} for the exports. They say up to ten days. I’ll send them on as soon as they arrive.']]
				]
			},
			{
				opens: [2],
				subjects: ['Import problems'],
				detail: ['It’s run. About {n} members have no pass at all, and they definitely had memberships. This is the start of the file we sent:', 'The import ran on {wday}. {n} members came across without passes. Here’s the top of our file:'],
				paste: 'import',
				look: ['Members paying by instalments in {oldSystem} came across without passes; the data team need to rerun them.'],
				lookPaste: 'none',
				mark: 'instalments',
				team: 'data team',
				ends: [
					[['a', 'I’ve passed it to our data team, who did your import. It looks as if members who paid by instalments in {oldSystem} came across without their passes.'], ['d', 'Confirmed, instalment plans weren’t mapped. Rerunning those {n} members tomorrow.'], ['c', 'Thank you. Please tell me when it’s done so I can check.']]
				]
			},
			{
				opens: [2],
				subjects: ['Checking our import'],
				detail: ['It’s run, and I’ve been through it. Mostly fine, but I wanted to check a few things with you before we tell members.', 'Yes, the import ran on {wday}. I’d like someone to look over it before we go live.'],
				look: ['Import for this studio completed on {wday}: members, passes and credits all match the file.'],
				lookPaste: 'studio',
				mark: 'plain',
				ends: [
					[['D', 'Hi {name}, I did your import. I’ve checked it against your file: {N} members, their passes and their credits all came across. Please check a few members you know well before you tell everyone.'], ['c', 'I’ve checked twenty or so and they’re all right. Thank you, that was painless.']]
				],
				happy: true
			}
		]
	},
	// Wrenfield's own invoice.
	{
		subjects: ['Our Perch invoice', 'Our Perch plan'],
		open: [
			'Our Perch invoice for {month} charges us for {n2} instructors, but we only have {teaching} who teach. What’s counted?',
			'Can we pay for Perch yearly instead of monthly? It would make our budgeting easier.',
			'Our numbers shrink a lot in winter. Can we drop to a smaller plan for a few months?'
		],
		more: ['Every pound counts for us at the moment.', 'I’d like to sort it before the next invoice.'],
		ask: ['Let me look at your plan. Which invoice is it, or which change would you like?', 'Of course. Could you tell me what you’d like to change?'],
		paths: [
			{
				opens: [0],
				subjects: ['Charged for too many instructors'],
				detail: ['It’s the {month} invoice, {invoice}.', 'Invoice {invoice}.'],
				look: ['{extra} instructors who left are still active in the staff list; the plan counts active instructors.'],
				lookPaste: 'invoices',
				lookWho: 'b',
				mark: 'archived',
				ends: [
					[['a', 'Your plan counts instructors who are active in the staff list, and {extra} who no longer teach are still marked active. Archive them under Staff and they stop counting from the next invoice. Hugo in our accounts team has credited the difference for {month}.'], ['c', 'Archived them all. Thanks for the credit too.']]
				],
				happy: true
			},
			{
				opens: [1],
				subjects: ['Annual billing?'],
				detail: ['Yearly, please, if there’s a discount.', 'We’d like to move to yearly from {nextMonth}.'],
				look: [],
				lookPaste: 'invoices',
				mark: 'plain',
				team: 'accounts team',
				ends: [
					[['a', 'We do offer yearly billing, with a month free. I’ve passed your request to Hugo in our accounts team, who will send you the details.'], ['b', 'Will send the annual quote once their current month ends.']]
				]
			},
			{
				opens: [2],
				subjects: ['Smaller plan for winter'],
				detail: ['From {nextMonth} to February, the smaller plan, then back up.', 'Just for the winter months.'],
				look: [],
				lookPaste: 'none',
				mark: 'plain',
				ends: [
					[['a', 'You can change plan whenever you like under Settings, then Plan, and the new price starts with your next invoice. Your classes, members and history all stay as they are.'], ['c', 'Done. We’ll move back up in March.']]
				]
			}
		]
	},
	// The timetable on the studio's website.
	{
		subjects: ['Timetable on our website', 'Booking on our website'],
		open: [
			'Our web designer has added the Perch timetable to our website, but it’s cut off at the bottom and you can’t see the later classes.',
			'We’d like our timetable on our own website. Is there a way?',
			'The timetable on our website shows every class we run, and we’d like a page for each type of class.'
		],
		more: ['Most new members find us through the website.', 'Our website was redone in the summer.'],
		ask: ['Happy to help. Which website builder do you use, and can you send me a link to the page?', 'Let’s get it working. What is your website built with?'],
		paths: [
			{
				opens: [0],
				subjects: ['Embed not working', 'Timetable cut off on our site'],
				detail: ['It’s Squarespace. The page is our Timetable page.', 'Squarespace, and our designer just pasted in the frame.'],
				look: [],
				lookPaste: 'none',
				mark: 'plain',
				ends: [
					[['a', 'The timetable embed sets its own height, but only if the embed code includes the resize script. Your designer has added the frame without it. The full code is under Settings, then Website, and the second line is the script.'], ['c', 'Our designer added the script and it’s perfect now.']]
				],
				happy: true
			},
			{
				opens: [1],
				detail: ['We use Wix, on the free plan.', 'Wix. We haven’t paid for it.'],
				look: [],
				lookPaste: 'none',
				mark: 'plain',
				ends: [
					[['a', 'Wix’s free plan doesn’t allow embedded pages from other sites, so the timetable can’t be shown there. Either a paid Wix plan, or a button that links to your Perch timetable page, will work.'], ['c', 'We’ll think about upgrading. For now we’ll link to it. I’ll talk to the others on {day}.']]
				]
			},
			{
				opens: [2],
				detail: ['WordPress. We’d like a separate page for {cls}, {cls2} and the rest.', 'It’s WordPress. One page per class type is the plan.'],
				look: [],
				lookPaste: 'none',
				mark: 'plain',
				ends: [
					[['a', 'Add “?class=” and the class name to the embed address and it shows only that class. The details are under Settings, then Website.'], ['c', 'Brilliant, thank you. We’ve got a page for each now.']]
				]
			}
		]
	},
	// Courses and booking every week.
	{
		subjects: ['Block booking a course', 'Booking question'],
		open: [
			'We run a six-week {cls} course starting in {nextMonth}. People should book the whole course, not single classes. Can Perch do that?',
			'Our regulars want to book {cls} every {sessionDay} for the rest of term without booking each week. Possible?',
			'We set up our {cls} course in Perch, but members are being charged class by class instead of for the whole course up front.'
		],
		more: ['It’s one of our most popular classes.', 'We’ve been doing it with a spreadsheet, which is a nightmare.'],
		ask: ['Happy to help. How is the course set up in Perch at the moment, if at all?', 'Let me look. Is the course already in Perch?'],
		paths: [
			{
				opens: [0],
				subjects: ['Six-week course'],
				detail: ['Not set up yet. Six weeks, same day and time, {coursePrice} for the lot.', 'Nothing yet. It’s six {sessionDay}s at {sessionTime}.'],
				look: [],
				lookPaste: 'none',
				mark: 'plain',
				ends: [
					[['a', 'Perch has a Course class type for exactly this. Under Timetable, choose New course, set the six dates and the price, and members book and pay for the whole course in one go. The roster shows the same people every week.'], ['c', 'Perfect. I’ve set it up and three people booked within the hour!']]
				],
				happy: true
			},
			{
				opens: [1],
				subjects: ['Can members book every week?'],
				detail: ['They’re on Unlimited monthly and want a standing place every week.', 'It’s a weekly class, not a course. They just want their place kept.'],
				look: [],
				lookPaste: 'none',
				mark: 'plain',
				ends: [
					[['a', 'Standing weekly bookings aren’t possible yet; members book each class. It’s one of the most asked-for things, and the booking team are working on it. I’ve added your studio to the request.'], ['c', 'Please do. Our regulars will be thrilled when it comes.']]
				]
			},
			{
				opens: [2],
				subjects: ['Course payments'],
				detail: ['It’s set up as a course, I think. But {member} has been charged {dropin} three times instead of {coursePrice} once.', 'Course type, yes. {member} was charged per class.'],
				look: ['Course set to “Pay per class” rather than “Pay up front”. Members already charged need adjusting by payments.'],
				lookPaste: 'payments',
				mark: 'plain',
				team: 'payments team',
				ends: [
					[['a', 'The course is set to “Pay per class” instead of “Pay up front”. I’ve changed nothing, but you can switch it under the course’s settings. For the members already charged class by class, I’ve passed them to our payments team so they can put the charges right.'], ['p', 'Will adjust the members charged per class on this course once the studio confirms the setting is changed.'], ['c', 'I’ve changed it to pay up front. Over to payments then.']]
				]
			}
		]
	},
	// Bringing a friend.
	{
		subjects: ['Bring a friend', 'Guest bookings', 'Members booking for others'],
		open: [
			'Can members book a space for a friend? {member} wants to bring her sister to {cls}.',
			'{member} booked two spaces in {cls} and her pack went down by two. She thought the second was a free guest pass.',
			'We’d like to give members one free guest pass a month as a perk. Can Perch do that?'
		],
		more: ['Word of mouth is how we grow.', 'It’s our busiest time of year for new faces.'],
		ask: ['Let me check your settings. Which class, and is it for one member or everyone?', 'Sure. Is this about one member, or a setting for everyone?'],
		paths: [
			{
				opens: [0],
				detail: ['Everyone, ideally. It’s {cls} for {member} now, though.', 'For everyone. {member} asked first.'],
				look: ['Guest bookings are off for this studio.'],
				lookPaste: 'rules',
				mark: 'plain',
				ends: [
					[['a', 'Guest bookings are switched off at the moment. Turn on “Members can book for a guest” under Settings, then Booking rules, and members get a “Bring a friend” option when they book. The guest’s space uses the member’s pass unless you set a guest price.'], ['c', 'Turned on. {memberFirst} has booked her sister in. Thanks!']]
				],
				happy: true
			},
			{
				opens: [1],
				subjects: ['Two credits for one class?'],
				detail: ['It’s {member}, for {cls} on {sessionDay}.', '{member}, {session}.'],
				look: ['Guest booking used the member’s pack, as set. No free guest pass exists in the studio’s settings.'],
				lookPaste: 'ledger',
				mark: 'plain',
				ends: [
					[['a', 'Her guest’s space was taken from her {pack}, because that’s how guest bookings are set up at {biz}: the guest uses the member’s pass. There’s no free guest pass in your settings. If you’d like one, you can set a guest price of £0 under Settings, then Booking rules.'], ['c', 'I see. We’ll give her the credit back this time and think about whether to make guests free.']]
				]
			},
			{
				opens: [2],
				detail: ['One free guest each month, for members on Unlimited monthly only.', 'Just for Unlimited monthly members, one a month.'],
				look: [],
				lookPaste: 'none',
				mark: 'plain',
				ends: [
					[['a', 'A monthly free guest for one pass only isn’t possible yet: the guest price is the same for every member. I’ve added your idea to the booking team’s list of requests for guest bookings.'], ['c', 'OK, thanks. We’ll do it by hand at the desk for now.']]
				]
			}
		]
	},
	// No-show fees.
	{
		subjects: ['No-show fee', 'Charging for no-shows', 'Members not turning up'],
		open: [
			'We’d like to start charging {fee} when someone books and doesn’t turn up. How do we do that?',
			'{member} was charged a no-show fee for {cls} on {sessionDay}, but she was there; she came in late.',
			'We have a real problem with people booking and not coming. What can Perch do about it?'
		],
		more: ['People on the waitlist are missing out.', 'It’s the {sessionTime} {cls} that suffers most.'],
		ask: ['Let me check your booking rules. Is this about a particular class or member?', 'Sure. Is this about setting up a fee, or a fee that’s already been charged?'],
		paths: [
			{
				opens: [0, 2],
				detail: ['Setting one up. {fee}, starting next month.', 'Setting up. We want to start from the {nextMonth} timetable.'],
				look: [],
				lookPaste: 'rules',
				mark: 'plain',
				ends: [
					[['a', 'Under Settings, then Booking rules, set “No-show fee” to {fee}. Anyone booked who isn’t checked in by the time the roster closes is charged automatically. It’s worth putting it in your terms and on the timetable before you switch it on.'], ['c', 'Thanks. We’ll announce it this week and switch it on for {nextMonth}.']]
				],
				happy: true
			},
			{
				opens: [1],
				subjects: ['No-show fee charged wrongly'],
				detail: ['It’s {member}, {cls} on {session}. She arrived about fifteen minutes late.', '{member}, {session}. She was late but she came.'],
				look: ['Roster closes 10 minutes after the start (studio setting); {member} wasn’t checked in before it closed, so she was charged as a no-show.'],
				lookPaste: 'roster',
				mark: 'lateness',
				ends: [
					[['a', 'Your rosters close ten minutes after a class starts, and anyone not checked in by then is charged the no-show fee. {member} arrived after it closed, so Perch treated her as a no-show. You can refund the fee from her payments, and if you want to allow late arrivals, make the roster stay open longer under Settings, then Booking rules.'], ['c', 'That’s fair. I’ve refunded her and changed it to twenty minutes.']]
				]
			}
		]
	}
];

// Shared pieces, combined with every topic.
/** A one-line aside in the first message, and support's answer to it. */
const tangents: [string, string][] = [
	['Also, is there a phone number for support? Sometimes it’s quicker to talk.', 'On phoning: we’re email only for now, but we reply within the working day.'],
	['Unrelated, but can we change the colours of the timetable to match our branding?', 'On colours: the timetable takes your brand colour from Settings, then Website.'],
	['By the way, is there an app for members, or is it just the website?', 'On an app: members use the Perch web app in their phone’s browser, and many add it to their home screen, where it behaves like an app.'],
	['Do you have a guide for new front desk staff?', 'On the guide: I’ve attached our front desk guide as a PDF.'],
	['Is there a discount if we pay for Perch yearly?', 'On paying yearly: yes, a month free. Reply if you’d like our accounts team to switch you.'],
	['Is our members’ data kept in the UK?', 'On where data is kept: yes, in the UK.'],
	['Small thing: the timetable starts the week on Sunday. Can it start on Monday?', 'On the week start: that’s under Settings, then Timetable.'],
	['Can we print the day’s rosters?', 'On printing: each roster has a Print button at the top right.'],
	['You’ve spelt our studio name wrong on our last invoice, by the way.', 'On the invoice: I’ve asked our accounts team to correct the name and reissue it.'],
	['Do you work with our accounting software?', 'On accounting software: the payout report downloads in a format that Xero and QuickBooks both import.']
];
/** A second matter the studio raises in a later message: the question, support's answer, and a word of thanks. */
const sides: { q: string; a: string; then: string }[] = [
	{ q: 'Separate question: can I give {staff2} access to edit the timetable without letting her see payments?', a: 'On {staff2}: the Scheduler role can edit the timetable and see rosters, but nothing to do with money. Set it under Staff.', then: '{staff2} has the Scheduler role now, thanks.' },
	{ q: 'Also, we’re running a charity class on {day} where people pay what they like. Can Perch do that?', a: 'On the charity class: make a pass called “Charity class” with “Customer chooses the price” ticked, and limit it to that class.', then: 'The charity class pass worked perfectly. We raised £{raised}.' },
	{ q: 'While I have you: can the timetable show how many spaces are left?', a: 'On spaces left: under Settings, then Timetable, tick “Show spaces left”. You can choose to show it only when fewer than five are left.', then: '' },
	{ q: 'One more thing: {instr2First} wants to see her own class numbers. Can instructors see their rosters?', a: 'On {instr2First}’s rosters: the Instructor role sees the rosters of their own classes and nothing else.', then: 'Thanks for the tip on instructor rosters.' },
	{ q: 'We’d like to sell gift vouchers for Christmas. Is that possible?', a: 'On gift vouchers: you can sell any pass as a gift. The buyer gets a code to pass on, and whoever redeems it gets the pass. Tick “Can be bought as a gift” on the pass.', then: 'We’ve set up gift passes for Christmas, thank you.' },
	{ q: 'Can I see who changed a class? Someone moved {cls2} on {day} and nobody remembers doing it.', a: 'On who changed {cls2}: every class has a History tab listing each change, who made it and when.', then: 'The history settled it. It was me, as it turns out.' },
	{ q: 'Also, we want a fifteen-minute gap between classes in the {room} for cleaning. Can the timetable enforce it?', a: 'On the cleaning gap: each room has a “Gap between classes” setting under Settings, then Rooms, and the timetable warns you if a class breaks it.', then: '' },
	{ q: 'Could you send me your terms and your data processing agreement? Our accountant wants them on file.', a: 'On the paperwork: I’ve attached our terms and our data processing agreement as PDFs.', then: 'Thanks for the documents.' },
	{ q: 'Quick one: can members put themselves on more than one waitlist at a time?', a: 'On waitlists: yes, up to three at once by default. You can change the number under Settings, then Booking rules.', then: '' },
	{ q: 'Something else: the timetable page was very slow on {wday} evening. Was that just us?', a: 'On {wday} evening: it wasn’t just you. The timetable was slow for about half an hour while a fault at our hosting provider was fixed.', then: '' },
	{ q: 'We’re thinking about a deal with a local firm, where their staff get ten percent off. How would that work?', a: 'On the deal with the firm: a discount code limited to a list of members does that. Create it under Passes, then Discount codes.', then: '' },
	{ q: 'Lastly, our {cls2} instructor is leaving at Christmas. If I archive her, do her past classes disappear from the reports?', a: 'On archiving: archived instructors stay on their past classes and in reports; they just can’t be picked for new ones.', then: '' },
	{ q: 'Could you tell me how many members book on the website and how many at the desk?', a: 'On how members book: the Bookings report has a “Booked through” column, web or desk, that you can total.', then: 'The bookings report answered our question: it’s mostly the website.' },
	{ q: 'Can we add a health form that new members fill in before their first class?', a: 'On the health form: under Settings, then Member forms, add your questions and tick “Required before first booking”.', then: 'The health form is live, thanks.' },
	{ q: 'Is there any way to see which members haven’t been in for a month? We’d like to give them a ring.', a: 'On members who haven’t been in: the Members report can filter by “Last attended”, so you can list everyone who hasn’t been for 30 days.', then: 'The lapsed members list is brilliant. We’ve rung a dozen already.' },
	{ q: 'Can we run a free community class that doesn’t use anyone’s credits?', a: 'On the free class: set the class’s price to £0 and untick every pass under “Passes accepted”; anyone can then book it for free.', then: '' }
];
const contexts = [
	'We moved to Perch in {signupMonth} from {oldSystem}, and on the whole it has been a big improvement.',
	'We’ve been on Perch since {signupMonth}. Most members book on their phones; a few still ring the desk.',
	'For context, we switched to Perch in {signupMonth} after years of a paper register and a spreadsheet.',
	'We’re fairly new to Perch and I’m still finding my way around the console, so forgive me if this is obvious.',
	'I look after the timetable and {staff2} does most of the front desk work.',
	'I’m the only one here who deals with the Perch side of things, so everything comes to me.'
];
/** How things stand at the studio this week, in passing. */
const situations = [
	'It’s been a mad week here: {staff2} is off with flu and I’m covering the desk myself.',
	'We’re short-staffed at the moment, so I’m doing the admin at home in the evenings.',
	'January is our busiest month, which is why I’m trying to get everything straight now.',
	'Sorry for the long message; I’d rather give you too much detail than too little.',
	'I’ve already spent an hour on this before writing, so I’m hoping you can tell me what I’m missing.',
	'Our landlord is showing someone round on {day}, so I’d love to have this sorted before then.',
	'I asked {staff2}, who is usually good with this sort of thing, but she was stumped too.',
	'Not the end of the world, but it’s one of those things that eats time every week.',
	'You were very helpful the last time I wrote in, so I’m hoping for the same luck.',
	'We’ve just launched our winter timetable, so it’s all hands on deck.'
];
/** A last line support may add to a reply. */
const closings = ['If anything else comes up, just reply here and it comes straight back to me.', 'Shout if any of that isn’t clear.', 'I’ll keep this ticket open until I hear from you.', 'Sorry again for the bother.'];
const disclaimers = [
	'This email and any files sent with it are confidential and intended only for the person to whom they are addressed. If you have received it in error, please tell the sender and delete it.',
	'Please consider the environment before printing this email.',
	'{biz} is a trading name of {biz} Ltd, registered in England and Wales. Registered office: {street}, {town}.',
	'This message was sent from the studio’s shared inbox. Replies are read by the whole team.'
];
const greetings = ['Hi', 'Hello', 'Hi there', 'Good morning', 'Morning', 'Hiya', 'Hello Perch team', 'Dear Perch support'];
const custSign = ['Thanks, {name}', 'Many thanks\n{full}', '{name}', 'Cheers, {name}', 'Kind regards,\n{full}\n{role}, {biz}\n{phone}', 'Thanks\n{name}\n\nSent from my iPhone', 'Best wishes,\n{full}\n{role}'];
const acks = ['Thanks for getting in touch.', 'Thanks for your message, and sorry for the trouble.', 'Thanks for writing in.', 'Sorry to hear that.', 'Thanks for the clear description.', ''];
const agentSign = ['Best wishes,\n{signer}', '{signer}\nPerch support', 'Thanks,\n{signer}', 'Kind regards,\n{signer} at Perch'];
const holding = [
	'Quick update: I’ve asked the {team} to take a look, and I’ll come back to you by {day}.',
	'Thanks for bearing with us. I’m still waiting to hear back from the {team}, and it’s still at the top of my list.',
	'Just to let you know this is with the {team} now. I’ll update you as soon as I hear.'
];
const chasers = ['Any news on this?', 'Just checking you got my last message.', 'Sorry to chase, but the timetable for next week goes live on {day}.', 'Hello? It’s been a few days.', 'Any update? {staff} keeps asking me.'];
const surveys: [string, string][] = [['Great', 'Quick and friendly.'], ['Good', 'Sorted in the end, thanks.'], ['Great', '{agent} was brilliant.'], ['OK', 'Took a while but got there.'], ['Good', 'Clear answers.'], ['Great', 'Really helpful, thank you.'], ['Good', '']];
/** How the studio brings up another matter while support is still on the first. */
const leadIns = ['While you’re looking into that, something else has come up.', 'Unrelated, but while I have you:', 'Another thing, sorry.', 'Separate matter, but it’s been bugging me.', 'One more thing, now that I’m writing.', 'Also, and nothing to do with the above:', 'While I wait, a different question.'];
const vagueSubjects = ['A couple of things', 'Help please', 'Question', 'Perch', 'A few questions', 'Quick question', 'Console'];
/** Studios that are moving to Perch from another booking system. */
const joining = ['Northlight Fitness', 'Meridian Studio', 'The Movement Rooms', 'Kinship Studio', 'Foundry Fitness', 'Halcyon Studio', 'Tidewell Fitness', 'Brightside Studio'];
const oldSystems = ['ClassDesk', 'BookWell', 'StudioHub', 'Timeslot'];
const employers = ['Halden Engineering', 'Marsh & Pike Solicitors', 'Northway Housing', 'Corbel Architects', 'Fenwick Logistics', 'Brightwater Council'];
const accentNames = ['Zoë', 'Siân', 'José', 'Renée', 'Máire', 'Bjørn', 'Chloé', 'Aoibhín', 'Inés', 'Noémie', 'Søren', 'Ángela'];
const mojibake: Record<string, string> = { 'ë': 'Ã«', 'â': 'Ã¢', 'é': 'Ã©', 'á': 'Ã¡', 'ø': 'Ã¸', 'í': 'Ã­', 'ó': 'Ã³', 'Á': 'Ã\u0081' };
const garble = (text: string) => [...text].map((c) => mojibake[c] ?? c).join('');
const plans: [string, number][] = [['Starter', 49], ['Studio', 89], ['Studio Plus', 139]];

const fill = (text: string, values: Record<string, string>): string =>
	text.replace(/\{(\w+)\}/g, (_, key: string) => {
		const value = values[key];
		if (value === undefined) throw new Error(`no value for {${key}} in: ${text.slice(0, 60)}`);
		return value;
	});
/** A length of time in words, such as "2 hours 10 minutes". */
const duration = (minutes: number) => {
	const h = Math.floor(minutes / 60);
	const m = minutes % 60;
	if (h === 0) return `${m} minutes`;
	const hours = h === 1 ? 'an hour' : `${h} hours`;
	return m === 0 ? hours : h === 1 ? `an hour and ${m} minutes` : `${h} hours ${m} minutes`;
};
/** Keeps a message inside the hours its writer works; Wrenfield works 08:30 to 17:30 on weekdays. */
const office = (r: Rand, t: number) => {
	let m = t;
	if (minuteOfDay(m) > 17 * 60 + 30) m = startOfDay(m) + 1440 + 8 * 60 + 30 + int(r, 0, 90);
	if (minuteOfDay(m) < 8 * 60 + 30) m = startOfDay(m) + 8 * 60 + 30 + int(r, 0, 90);
	while (isWeekend(m)) m += 1440;
	return m;
};
/** Studio people write between 06:00 and 22:30, weekends included. */
const waking = (r: Rand, t: number) => {
	let m = t;
	if (minuteOfDay(m) > 22 * 60 + 30) m = startOfDay(m) + 1440 + 6 * 60 + int(r, 0, 200);
	if (minuteOfDay(m) < 6 * 60) m = startOfDay(m) + 6 * 60 + int(r, 0, 200);
	return m;
};
const stamp = (minutes: number, seconds: number) => `${iso(minutes)} ${clock(minutes)}:${pad(seconds)}`;
const memberNo = (r: Rand) => `M-${int(r, 10200, 48999)}`;

// Dates: the tickets are spread over the working days between 1 October and 13 November.
const workdays: number[] = [];
for (let d = 0; d <= 43; d++) if (!isWeekend(d * 1440)) workdays.push(d * 1440);

interface Plan {
	topic: Topic;
	path: Path;
	open: number;
	/** For a studio joining Perch, which of the joining studios it is. */
	joiner: number;
}

const ticket = (index: number, plan: Plan, number: number): string => {
	const r = mulberry32(0x5eed4000 + index * 7919);
	const { topic, path } = plan;
	const kind = kinds[(index * 7 + int(r, 0, 3)) % kinds.length]!;
	// A studio keeps its contact, staff, instructors and address from ticket to ticket; a studio that is just joining
	// Perch has a name of its own, so that no other ticket shows it as a long-standing customer.
	const biz = topic.newcomer ? joining[plan.joiner % joining.length]! : pick(r, kind.names);
	const sr = mulberry32(hash(biz));
	const slug = biz.toLowerCase().replace(/^the /, '').replace(/&/g, 'and').replace(/[^a-z]+/g, '');
	const first = pick(sr, firstNames);
	const last = pick(sr, surnames);
	const full = `${first} ${last}`;
	const email = sr() < 0.7 ? `${first.toLowerCase()}@${slug}.example` : `${first.toLowerCase()}.${last.toLowerCase()}@${pick(sr, providers)}`;
	const staffPool = shuffle(sr, staffNames);
	const [staff, staff2] = [staffPool[0]!, staffPool[1]!];
	const instructors = [...shuffle(sr, instructorWomen).slice(0, 3), ...shuffle(sr, [...instructorWomen.slice(3), ...instructorMen]).slice(0, int(sr, 2, 5))];
	const named = (pool: string[], count: number) => Array.from({ length: count }, () => `${pick(r, pool)} ${pick(r, memberLast)}`);
	const members = [...new Set([...named(memberWomen, 8), ...named([...memberWomen, ...memberMen], 48)])];
	const classes = shuffle(r, kind.classes);
	const [room, room2] = [kind.rooms[0]!, kind.rooms[1] ?? kind.rooms[0]!];
	const town = pick(sr, towns);
	const street = `${int(sr, 2, 140)} ${pick(sr, streets)}`;
	const agent = pick(r, agents);
	const bk = pick(r, bookingTeam);
	const cons = pick(r, consoleTeam);
	const oldSystem = oldSystems[hash(biz) % oldSystems.length]!;
	const [planName, planPrice] = plans[hash(biz + town) % plans.length]!;
	const sid = 4100 + (hash(biz + town) % 5800);
	const N = 60 + (hash(biz) % 540);
	const signup = topic.newcomer ? startOfDay(plan.open) - int(r, 4, 20) * 1440 : -int(sr, 3, 20) * 30 * 1440;
	const open = plan.open + int(r, 6 * 60 + 30, 21 * 60);
	const nextMonth = monthNames[(at(open).getUTCMonth() + 1) % 12]!;
	/** The last whole month, which reports cover. */
	const reportMonth = at(open).getUTCMonth() - 1;
	const reportDays = new Date(Date.UTC(2026, reportMonth + 1, 0)).getUTCDate();
	const memberIds = new Map(members.map((name) => [name, memberNo(r)]));
	const idOf = (name: string) => memberIds.get(name)!;
	const padName = (name: string) => name.padEnd(20);

	/** One matter the studio raises at `now`: its people, class and dates, the values its texts are filled with, and its pasted output. */
	const matter = (topic: Topic, path: Path, k: number, now: number) => {
		const open = now;
		const mark = path.mark ?? 'plain';
		const [member, member2] = [members[2 * k]!, members[2 * k + 1]!];
		const others = members.filter((name) => name !== member && name !== member2);
		const [cls, cls2] = k === 0 ? [classes[0]!, classes[1]!] : shuffle(r, kind.classes);
		const [instr, instr2] = k === 0 ? [instructors[0]!, instructors[1]!] : [instructors[2]!, instructors[k % 2]!];
		const ahead = topic.subjects[0] === 'Classes an hour out' || topic.subjects[0] === 'Wrong instructor on timetable';
		const slot = pick(r, kind.slots);
		const session = (ahead ? startOfDay(open) + int(r, 1, 5) * 1440 : startOfDay(open) - int(r, 1, 6) * 1440) + slot;
		const cid = int(r, 180000, 389999);
		const series = int(r, 9000, 19999);
		const cap = 8 + (hash(biz + cls!) % 18);
		const held = int(r, 2, 4);
		const oldCap = Math.max(4, cap - int(r, 4, 8));
		const booked = mark === 'held' ? cap - held : mark === 'roomcount' ? oldCap : Math.max(3, cap - int(r, 2, 5));
		const cut = pick(r, [3, 4, 6, 8, 12]);
		const policyHours = pick(r, [6, 8, 12]);
		const cancelHours = pick(r, [12, 24].filter((h) => h > policyHours));
		const gapHours = mark === 'moved' ? int(r, 2, cancelHours - 1) : int(r, policyHours + 1, cancelHours - 1);
		const lateMinutes = int(r, 12, 55);
		const cancelAt =
			mark === 'cutoff' ? session - int(r, 40, cut * 60 - 15) : mark === 'walkin' ? session - int(r, 90, 20 * 60) : mark === 'quickmenu' ? session - int(r, 16 * 60, 28 * 60) : mark === 'late' ? session - lateMinutes : mark === 'window' || mark === 'moved' ? session - gapHours * 60 - int(r, 0, 50) : session - int(r, 26 * 60, 60 * 60);
		const movedFrom = slot + pick(r, [30, 45, 60, 90]);
		const movedAt = session - int(r, 1, 2) * 1440 - int(r, 60, 400);
		const fee = money(pick(r, [5, 6, 8, 10]));
		const window = pick(r, [7, 10, 14, 21]);
		const changeAt = office(r, startOfDay(open) - int(r, 0, 2) * 1440 + int(r, 9 * 60, 16 * 60));
		const packSize = Number(kind.pack[0].match(/\d+/)?.[0] ?? 10);
		const credits = Math.min(int(r, 2, 7), packSize - 1);
		const boughtAt = startOfDay(open) - int(r, 100, 150) * 1440;
		const expiredAt = boughtAt + 91 * 1440;
		const pauseSummer = (Date.UTC(2026, 6, int(r, 1, 25)) - EPOCH) / 60000;
		const chargeAt = startOfDay(open) - int(r, 3, 20) * 1440;
		const pauseStart = chargeAt + int(r, 1, 4) * 1440;
		const weeks = int(r, 3, 8);
		let lastTuesday = startOfDay(open) - 1440;
		while (at(lastTuesday).getUTCDay() !== 2) lastTuesday -= 1440;
		let nextTuesday = startOfDay(open) + 1440;
		while (at(nextTuesday).getUTCDay() !== 2) nextTuesday += 1440;
		const unlimited = kind.unlimited;

		// The payout the ticket may be about, worked out once so the messages and the pasted breakdown agree.
		const gross = int(r, 1200, 5200) + int(r, 0, 99) / 100;
		const sales = int(r, 40, 160);
		const cardFees = Math.round((gross * 0.014 + sales * 0.2) * 100) / 100;
		const refundCount = int(r, 1, 5);
		const refunds = refundCount * pick(r, [kind.dropin, kind.pack[1] / 2, unlimited]);
		const monthly = at(lastTuesday).getUTCDate() <= 7 || mark === 'double-fee';
		const subscription = planPrice * 1.2;
		const net = gross - cardFees - refunds - (monthly ? subscription : 0) - (mark === 'chargeback' ? unlimited + 15 : 0) - (mark === 'double-fee' ? subscription : 0);
		const pid = `PO-${int(r, 410000, 489999)}`;

		const values: Record<string, string> = {
			name: first,
			last_name: last,
			full,
			email,
			phone: `01632 960${String(int(r, 0, 999)).padStart(3, '0')}`,
			biz,
			role: pick(r, kind.roles),
			town,
			street,
			N: String(N),
			n: String(int(r, 2, 9)),
			staff,
			staff2,
				instr,
			instr2,
			instrFirst: instr.split(' ')[0]!,
			instr2First: instr2.split(' ')[0]!,
			member,
			member2,
			memberFirst: member.split(' ')[0]!,
			member2First: member2.split(' ')[0]!,
			cls: cls!,
			cls2: cls2!,
			room,
			room2,
			session: `${weekday(session)} ${dayMonth(session)} at ${hhmm(slot)}`,
			sessionDay: weekday(session),
			sessionDate: dayMonth(session),
			sessionTime: hhmm(slot),
			earlyTime: hhmm(slot - 60),
			day: weekdayFrom(startOfDay(open) + int(r, 2, 4) * 1440),
			wday: weekday(office(r, startOfDay(open) - int(r, 1, 3) * 1440 + 600)),
			cid: String(cid),
			series: String(series),
			cap: String(cap),
			held: String(held),
			booked: String(booked),
			bookedOnline: String(cap - held),
			oldCap: String(oldCap),
			cut: String(cut),
			cutGap: duration(session - cancelAt),
			cancelClock: clock(cancelAt),
			policyHours: String(policyHours),
			cancelHours: String(cancelHours),
			gapHours: String(gapHours),
			lateMinutes: String(lateMinutes),
			lateClock: clock(session - lateMinutes),
			movedFrom: hhmm(movedFrom),
			movedDay: weekday(movedAt),
			fee,
			window: String(window),
			changeClock: clock(changeAt),
			closeFrom: pick(r, ['Wednesday 23 December', 'Thursday 24 December']),
			closeTo: pick(r, ['Sunday 3 January', 'Monday 4 January']),
			credits: String(credits),
			bought: monthNames[at(boughtAt).getUTCMonth()]!,
			boughtDate: dayMonth(boughtAt),
			expiredDate: dayMonth(expiredAt),
			pauseFrom: dayMonth(mark === 'pause' ? pauseSummer : pauseStart),
			pauseTo: dayMonth((mark === 'pause' ? pauseSummer : pauseStart) + weeks * 7 * 1440),
			chargeDay: ordinal(at(chargeAt).getUTCDate()),
			chargeDate: dayMonth(chargeAt),
			month: monthNames[at(chargeAt).getUTCMonth()]!,
			nextMonth,
			reportMonth: monthNames[reportMonth]!,
			weeks: String(weeks),
			signupMonth: `${monthNames[at(signup).getUTCMonth()]!} ${at(signup).getUTCFullYear()}`,
			payoutDate: `${weekday(lastTuesday)} ${dayMonth(lastTuesday)}`,
			nextPayout: `${weekday(nextTuesday)} ${dayMonth(nextTuesday)}`,
			pid,
			payoutNet: money(net),
			gross: money(Math.round(gross / 10) * 10),
			chargeback: money(unlimited),
			disputeBy: `${weekday(office(r, startOfDay(open) + 10 * 1440 + 600))} ${dayMonth(office(r, startOfDay(open) + 10 * 1440 + 600))}`,
			planPrice: money(subscription),
			outFrom: pick(r, ['08:40', '08:55', '09:10']),
			outTo: pick(r, ['10:05', '10:20', '10:45']),
			introOffer: kind.intro_offer[0],
			fill: String(int(r, 48, 74)),
			accentName: pick(r, accentNames),
			payrollDay: ordinal(pick(r, [25, 28, 30])),
			browser: pick(r, ['Chrome', 'Firefox', 'Edge', 'Safari on a Mac']),
			oldSystem,
			site2: pick(r, towns.filter((t) => t !== town)),
			employer: pick(r, employers),
			coursePrice: money(Math.round(kind.dropin * 6 * 0.85)),
			heads: String(int(r, 60, 140)),
			extra: String(int(r, 2, 4)),
			invoice: `WF-${int(r, 20400, 28999)}`,
			vat: `GB ${int(r, 100, 999)} ${int(r, 1000, 9999)} ${int(r, 10, 99)}`,
			pauseFee: money(pick(r, [5, 8, 10])),
			newPrice: money(unlimited + pick(r, [5, 6, 8, 10])),
			unlimitedPrice: money(unlimited),
			dropin: money(kind.dropin),
			pack: kind.pack[0],
			raised: String(int(r, 140, 620)),
			agent
		};
		values.teaching = String(instructors.length);
		values.n2 = String(instructors.length + Number(values.extra));
		const f = (text: string) => fill(text, values);

		// Pasted output.
		const studioPanel = () =>
			[
				'Studio account:',
				'',
				'```text',
				`Studio:           ${biz} (studio ${sid})`,
				`Plan:             ${planName}, ${money(planPrice)} a month + VAT`,
				`On Perch since:   ${values.signupMonth}`,
				`Address:          ${street}, ${town}`,
				`Rooms:            ${kind.rooms.map((name, i) => `${name} (${i === 0 ? Math.max(cap, 12) : Math.max(6, cap - 6)})`).join(', ')}`,
				`Active members:   ${N}`,
				`Instructors:      ${instructors.length + Number(values.extra)} active, ${int(r, 0, 6)} archived`,
				`Booking window:   ${window} days, ${mark === 'settime' ? 'at a set time (00:00)' : 'rolling'}`,
				'Time zone:        Europe/London',
				`Payouts:          weekly on Tuesdays, account ending ${int(r, 1000, 9999)}`,
				...(r() < 0.5 ? [`Open tickets:     ${int(r, 1, 3)}`] : []),
				'```'
			].join('\n');

		const timetable = () => {
			const monday = mondayOf(session);
			const rows: string[] = [];
			rows.push('| Day | Console | Timetable page | Class | Instructor | Room |', '| --- | --- | --- | --- | --- | --- |');
			const lines: [number, string, string][] = [];
			for (let d = 0; d < 7; d++)
				for (const s of shuffle(r, kind.slots).slice(0, int(r, 1, 3))) lines.push([monday + d * 1440 + s, pick(r, kind.classes), pick(r, instructors)]);
			lines.push([session, cls!, instr]);
			lines.sort((a, b) => a[0] - b[0]);
			for (const [m, name, who] of lines) {
				const wrong = m === session || (mark !== 'plain' && r() < 0.45);
				const shown = minuteOfDay(m) - (wrong ? 60 : 0);
				rows.push(`| ${weekday(m).slice(0, 3)} ${at(m).getUTCDate()} | ${clock(m)} | ${hhmm(shown)} | ${name} | ${who} | ${pick(r, kind.rooms)} |`);
			}
			return `The week of ${dayMonth(monday)}, the console against the member timetable page:\n\n${rows.join('\n')}`;
		};

		const statuses = ['booked', 'booked', 'checked in', 'checked in', 'checked in', 'late cancel', 'no-show'];
		const roster = () => {
			const past = session < open;
			const rows = ['| # | Member | Pass | Booked | Status |', '| ---: | --- | --- | --- | --- |'];
			const people = others.slice(0, booked - 1);
			people.splice(int(r, 0, people.length), 0, member);
			people.forEach((person, i) => {
				const status = mark === 'lateness' && person === member ? `no-show, fee ${fee}` : past ? pick(r, statuses.slice(2)) : 'booked';
				const pass = pick(r, [kind.pack[0], 'Unlimited monthly', 'Unlimited monthly', 'Drop-in', kind.intro_offer[0]]);
				rows.push(`| ${i + 1} | ${person} | ${pass} | ${shortDate(at(session - int(r, 1, 13) * 1440))} | ${status} |`);
			});
			const head = `${cls} · ${values.session} · ${room} · ${instr2}`;
			const tail =
				mark === 'held'
					? `Spaces: ${cap} · booked ${booked} · held for the desk ${held} · waitlist ${int(r, 1, 5)}`
					: mark === 'roomcount'
						? `Spaces: ${cap} · booked ${booked} · waitlist ${int(r, 2, 6)} · timetable shows: Class full`
						: mark === 'lateness'
							? `Spaces: ${cap} · booked ${booked} · roster closed ${hhmm(slot + 10)}`
							: `Spaces: ${cap} · booked ${booked}`;
			return `${head}\n\n${rows.join('\n')}\n\n${tail}`;
		};

		/** The booking history of the class, with the lines the path's messages talk about. */
		const bookingLog = () => {
			const events: [number, string][] = [];
			for (const name of shuffle(r, others.slice(0, 28)).slice(0, int(r, 8, 15))) {
				const m = session - int(r, 30, window * 1440 - 60);
				events.push([m, `booked             ${idOf(name)}  ${padName(name)}  ${r() < 0.8 ? 'web' : `console (${staff})`}`]);
				if (r() < 0.2) events.push([m + int(r, 60, 3000), `cancelled          ${idOf(name)}  ${padName(name)}  web, in time`]);
			}
			const by = staff;
			if (mark === 'moved') events.push([movedAt, `class moved        ${hhmm(movedFrom)} → ${hhmm(slot)}  by ${staff2}, console`]);
			if (mark === 'series') events.push([changeAt, `series ${series} edited  start ${hhmm(slot)} → ${hhmm(slot + pick(r, [30, 60]))}  applied to: this and following (${int(r, 18, 46)} classes)  by ${staff}`]);
			if (['cutoff', 'walkin', 'quickmenu', 'window', 'moved', 'late'].includes(mark)) {
				const how = mark === 'walkin' ? `console (${by}), space kept for walk-in` : mark === 'quickmenu' ? `console timetable menu (${by})` : r() < 0.7 ? 'web, phone' : 'web';
				events.push([cancelAt, `cancelled          ${idOf(member)}  ${padName(member)}  ${how}`]);
				if (mark === 'cutoff') events.push([cancelAt, `waitlist           no offer: inside cut-off (${cut} h)`]);
				if (mark === 'window' || mark === 'moved' || mark === 'late') events.push([cancelAt + 1, `late cancel fee    ${idOf(member)}  ${padName(member)}  ${fee} charged (window ${cancelHours} h)`]);
			}
			events.sort((a, b) => a[0] - b[0]);
			const lines = events.map(([m, text]) => `${stamp(m, int(r, 0, 59))}  ${text}`);
			return `Booking history, ${cls} on ${values.session} (class ${cid}):\n\n\`\`\`text\n${lines.join('\n')}\n\`\`\``;
		};
		const waitlist = () => {
			const rows = ['| Position | Member | Joined the waitlist | Result |', '| ---: | --- | --- | --- |'];
			const waiting = [member2, ...others.slice(30, 29 + Number(values.n))];
			waiting.forEach((person, i) => rows.push(`| ${i + 1} | ${person} | ${stampShort(session - int(r, 2, 6) * 1440 - int(r, 0, 600))} | ${session < open ? 'not offered a space' : 'waiting'} |`));
			return `Waitlist:\n\n${rows.join('\n')}\n\n${bookingLog()}`;
		};
		const classSettings = () =>
			[
				'Class settings:',
				'',
				'```text',
				`Class:               ${cls}, ${values.session}`,
				`Class id:            ${cid} (series ${series})`,
				`Room:                ${mark === 'oldcap' || mark === 'roomcount' ? room : pick(r, kind.rooms)}`,
				`Instructor:          ${mark === 'cover' ? `${instr} (covering ${instr2}, set ${stampShort(changeAt)})` : instr2}`,
				...(mark === 'assistant' ? [`Assistants:          ${instr}`] : []),
				`Capacity:            ${mark === 'oldcap' ? oldCap : cap}`,
				`Held for the desk:   ${mark === 'held' ? held : 0}`,
				`Waitlist:            on, stops ${cut} h before start`,
				`Late cancellation:   ${cancelHours} h, fee ${fee}`,
				`Passes accepted:     ${kind.pack[0]}, Unlimited monthly, Drop-in (${money(kind.dropin)})`,
				`Length:              ${pick(r, [45, 50, 60, 75])} minutes`,
				'```'
			].join('\n');
		const rules = () =>
			[
				'Booking rules:',
				'',
				'```text',
				`Booking opens:          ${window} days before, ${mark === 'settime' ? 'at a set time, 00:00' : 'rolling (from class start)'}`,
				`Late cancellation:      ${cancelHours} h before start, fee ${fee}`,
				`Waitlist:               on, stops ${cut} h before start, up to 3 per member`,
				`No-show fee:            ${topic.subjects[0] === 'No-show fee' || r() < 0.5 ? 'off' : fee}`,
				`Roster closes:          10 min after start`,
				`Guest bookings:         ${topic.subjects[0] === 'Bring a friend' && path.look.length ? 'off' : 'on, guest uses member’s pass'}`,
				`Overlapping bookings:   ${pick(r, ['allowed', 'blocked'])}`,
				'```'
			].join('\n');

		const ledger = () => {
			const start = mark === 'imported' ? signup : boughtAt;
			const household = mark === 'household' ? credits : 0;
			const uses = packSize - credits + household;
			const span = Math.min(open - start, 86 * 1440);
			const pauseEnd = pauseSummer + weeks * 7 * 1440;
			const entries: [number, string, number, string][] = [[start, mark === 'imported' ? `imported from ${oldSystem}` : `bought ${kind.pack[0]}, ${money(kind.pack[1])}`, packSize, mark === 'imported' ? 'import' : 'web']];
			for (let i = 1; i <= uses; i++) {
				let m = start + Math.floor((i * span) / (uses + 1)) + int(r, 0, 600);
				if (mark === 'pause' && m >= pauseSummer && m < pauseEnd) m = pauseEnd + int(r, 1, 9) * 1440;
				entries.push([m, `booked ${pick(r, kind.classes)}`, -1, i > uses - household ? member2 : member]);
			}
			if (mark === 'pause') entries.push([pauseSummer, `membership paused until ${values.pauseTo}`, 0, staff]);
			if (mark === 'closure') {
				for (let i = 0; i < 2; i++) entries.push([open - int(r, 2, 5) * 1440 - int(r, 0, 600), `booked ${pick(r, kind.classes)}, ${pick(r, ['28', '29', '30'])} Dec`, -1, member]);
				for (let i = 0; i < 2; i++) entries.push([open - 1440, `booking cancelled: closure ${values.closeFrom} to ${values.closeTo}`, 0, staff]);
			}
			if (topic.subjects[0] === 'Bring a friend') entries.push([session - 1440, `booked ${cls} for ${member} and a guest`, -2, member]);
			entries.sort((a, b) => a[0] - b[0]);
			const rows = ['| Date | Change | Credits | Balance | By |', '| --- | --- | ---: | ---: | --- |'];
			let balance = 0;
			for (const [m, change, delta, by] of entries) {
				balance += delta;
				rows.push(`| ${shortDate(at(m))} | ${change} | ${delta > 0 ? `+${delta}` : delta < 0 ? `−${-delta}` : '0'} | ${balance} | ${by} |`);
			}
			const expired = mark === 'expiry' ? expiredAt : Math.max(entries.at(-1)![0] + int(r, 2, 9) * 1440, open - int(r, 3, 20) * 1440);
			if (mark === 'expiry' || mark === 'pause' || mark === 'imported') rows.push(`| ${shortDate(at(expired))} | pack expired | −${balance} | 0 | Perch |`);
			return `${kind.pack[0]} held by ${member}${mark === 'household' ? ` and ${member2}` : ''}:\n\n${rows.join('\n')}`;
		};

		const payments = () => {
			const rows = ['| Date | Member | Item | Amount | Result |', '| --- | --- | --- | ---: | --- |'];
			const lines: [number, string][] = [];
			const add = (m: number, name: string, item: string, amount: number, result: string) => lines.push([m, `| ${stampShort(m)} | ${name} | ${item} | ${money(amount)} | ${result} |`]);
			for (let i = int(r, 4, 9); i > 0; i--) {
				const which = int(r, 0, 2);
				add(open - int(r, 60, 9 * 1440), pick(r, others), [kind.pack[0], 'Unlimited monthly', 'Drop-in'][which]!, [kind.pack[1], unlimited, kind.dropin][which]!, 'paid');
			}
			if (mark === 'paused') add(chargeAt + 400, member, 'Unlimited monthly', unlimited, 'paid');
			if (mark === 'declined') for (const name of [member, member2]) for (let i = int(r, 1, 3); i > 0; i--) add(startOfDay(open) + int(r, 8 * 60, 11 * 60), name, kind.pack[0], kind.pack[1], 'failed: bank approval not completed');
			if (mark === 'outage') for (let i = int(r, 3, 6); i > 0; i--) add(startOfDay(open) + 9 * 60 + int(r, 0, 70), pick(r, members), pick(r, [kind.pack[0], kind.intro_offer[0]]), pick(r, [kind.pack[1], kind.intro_offer[1] || kind.dropin]), 'failed: card processor unavailable');
			if (mark === 'refusal') for (let i = 0; i < 3; i++) add(chargeAt + i * 2 * 1440 + 360, member, 'Unlimited monthly', unlimited, 'declined by bank: do not honour');
			if (topic.subjects[0] === 'Block booking a course') for (let i = 0; i < 3; i++) add(open - (3 - i) * 7 * 1440, member, `${cls} course, week ${i + 1}`, kind.dropin, 'paid');
			lines.sort((a, b) => a[0] - b[0]);
			return `Recent payments:\n\n${[...rows, ...lines.map(([, line]) => line)].join('\n')}`;
		};

		const payout = () => {
			const lines = [
				`Payout ${pid}, ${values.payoutDate}${mark === 'held-payout' ? ' (paused)' : ''}`,
				'',
				'| Line | Amount |',
				'| --- | ---: |',
				`| Class and pass sales (${sales}) | ${money(gross)} |`,
				`| Card fees | −${money(cardFees)} |`,
				`| Refunds (${refundCount}) | −${money(refunds)} |`
			];
			if (monthly) lines.push(`| Perch ${planName}, ${monthNames[at(lastTuesday).getUTCMonth()]} (incl. VAT) | −${money(subscription)} |`);
			if (mark === 'double-fee') lines.push(`| Perch ${planName}, ${monthNames[at(lastTuesday).getUTCMonth()]} (incl. VAT) | −${money(subscription)} |`);
			if (mark === 'chargeback') lines.push(`| Chargeback, ${member}, Unlimited monthly | −${money(unlimited)} |`, '| Chargeback fee | −£15.00 |');
			lines.push(`| **Paid to your bank** | **${money(net)}** |`);
			const history = ['', 'Recent payouts:', '', '| Payout | Date | Net | Status |', '| --- | --- | ---: | --- |'];
			for (let w = 3; w >= 1; w--) history.push(`| PO-${int(r, 400000, 409999)} | ${dayMonth(lastTuesday - w * 7 * 1440)} | ${money(int(r, 900, 4800) + int(r, 0, 99) / 100)} | paid |`);
			history.push(`| ${pid} | ${dayMonth(lastTuesday)} | ${money(net)} | ${mark === 'held-payout' ? 'paused: bank account check failed' : 'paid'} |`);
			return [...lines, ...history].join('\n');
		};

		const attendance = () => {
			const rows = ['| Class | Classes | Booked | Attended | Late cancels | No-shows | Fill |', '| --- | ---: | ---: | ---: | ---: | ---: | ---: |'];
			for (const name of kind.classes) {
				const c = 8 + (hash(biz + name) % 18);
				const ran = int(r, 4, 22) + Number(values.n);
				const classes = mark === 'cover' && name === cls ? ran - Number(values.n) : ran;
				const bookedTotal = name === cls ? Math.round((classes * c * Number(values.fill)) / 100) : classes * int(r, Math.floor(c * 0.5), c);
				const late = Math.floor(bookedTotal * (int(r, 6, 18) / 100));
				const noShows = Math.floor(bookedTotal * (int(r, 2, 8) / 100));
				const fillPct = mark === 'pastcap' && name === cls ? int(r, 104, 160) : Math.round((bookedTotal / (classes * c)) * 100);
				rows.push(`| ${name} | ${classes} | ${bookedTotal} | ${bookedTotal - late - noShows} | ${late} | ${noShows} | ${fillPct}% |`);
			}
			return `Attendance report, 1 to ${reportDays} ${monthNames[reportMonth]}:\n\n${rows.join('\n')}`;
		};

		const pay = () => {
			const rows = ['| Instructor | Classes | Heads (checked in) | Rate | Pay |', '| --- | ---: | ---: | --- | ---: |'];
			for (const person of instructors.slice(0, int(r, 3, instructors.length))) {
				const classes = int(r, 4, 20);
				const heads = classes * int(r, 5, 14);
				const perHead = r() < 0.5;
				const rate = perHead ? pick(r, [3, 3.5, 4]) : pick(r, [25, 30, 35, 40]);
				rows.push(`| ${person} | ${classes} | ${heads} | ${perHead ? `${money(rate)} a head` : `${money(rate)} a class`} | ${money(perHead ? heads * rate : classes * rate)} |`);
			}
			if (mark !== 'cover') return `Instructor pay, ${monthNames[reportMonth]}:\n\n${rows.join('\n')}`;
			const detail = ['', `Classes for ${instr2}:`, '', '| Date | Class | Taught by | Paid to |', '| --- | --- | --- | --- |'];
			for (let i = int(r, 4, 8); i > 0; i--) {
				const covered = r() < 0.4;
				detail.push(`| ${int(r, 1, reportDays)} ${monthNames[reportMonth]!.slice(0, 3)} | ${cls} | ${covered ? `${instr} (cover)` : instr2} | ${instr2} |`);
			}
			return `Instructor pay, ${monthNames[reportMonth]}:\n\n${rows.join('\n')}\n${detail.join('\n')}`;
		};

		const csv = () => {
			const lines = ['class,date,member,pass,status'];
			const names = [values.accentName!, ...shuffle(r, accentNames).slice(0, 3)];
			for (let i = int(r, 6, 10); i > 0; i--) {
				const name = r() < 0.45 ? `${pick(r, names)} ${pick(r, memberLast)}` : pick(r, members);
				lines.push(`${pick(r, kind.classes)},2026-${pad(reportMonth + 1)}-${pad(int(r, 1, reportDays))},${garble(name)},${pick(r, [kind.pack[0], 'Unlimited monthly', 'Drop-in'])},${pick(r, ['attended', 'attended', 'late cancel', 'no-show'])}`);
			}
			return `What I see when it opens:\n\n\`\`\`text\n${lines.join('\n')}\n\`\`\``;
		};

		const errorPage = () => {
			const ref = int(r, 0x10000000, 0x7fffffff).toString(16);
			if (mark === 'timeout')
				return ['```text', 'Something went wrong', 'We couldn’t finish this report. Try a shorter date range, or try again later.', `Reference: ${ref}`, '```'].join('\n');
			return ['```text', `GET https://console.perch.example/static/timetable.${ref}.js net::ERR_BLOCKED_BY_CLIENT`, 'Uncaught ReferenceError: Timetable is not defined', `    at console.perch.example/timetable:1:${int(r, 80, 400)}`, `GET https://console.perch.example/static/rooms.${(ref + 'a').slice(1)}.js net::ERR_BLOCKED_BY_CLIENT`, '```'].join('\n');
		};

		const tablet = () => {
			const lines: string[] = [];
			const today = startOfDay(open);
			const device = mark === 'clock' ? today - 1440 : today;
			let m = 6 * 60 + int(r, 20, 50);
			const names = shuffle(r, members).slice(0, int(r, 8, 14));
			for (const name of names) {
				m += int(r, 2, 25);
				const real = (mark === 'midnight' || mark === 'clock' ? today : session - slot) + m;
				const shownDay = mark === 'midnight' ? today - 1440 : device;
				if (mark === 'offline') lines.push(`${stamp(real, int(r, 0, 59))}  check-in ${idOf(name)}  ${padName(name)}  queued (offline)`);
				else lines.push(`${stamp(real, int(r, 0, 59))}  page shows ${iso(shownDay)}  ${r() < 0.3 ? `search "${name.split(' ')[1]}": no class today` : 'refresh: 0 classes for today'}`);
			}
			if (mark === 'offline') lines.push(`${stamp(session - slot + m + int(r, 30, 90), 12)}  connection restored`, `${stamp(session - slot + m + int(r, 91, 120), 40)}  sync: 0 sent, ${names.length} queued`);
			const header = mark === 'clock' ? `Device clock: ${iso(device)} (set manually) · server: ${iso(today)}` : `Device clock: automatic · page opened ${iso(today - 1440)} 17:${pad(int(r, 0, 59))}`;
			return `Check-in tablet log:\n\n\`\`\`text\n${header}\n${lines.join('\n')}\n\`\`\``;
		};

		const invoices = () => {
			const rows = ['| Invoice | Date | Plan | Active instructors | Net | VAT | Total |', '| --- | --- | --- | ---: | ---: | ---: | ---: |'];
			const count = instructors.length + Number(values.extra);
			for (let mth = 6; mth <= at(open).getUTCMonth(); mth++) {
				const extraCost = Math.max(0, count - 4) * 6;
				const netAmount = planPrice + extraCost;
				const id = mth === at(chargeAt).getUTCMonth() ? values.invoice! : `WF-${int(r, 20000, 28999)}`;
				rows.push(`| ${id} | 1 ${monthNames[mth]!.slice(0, 3)} 2026 | ${planName} | ${count} | ${money(netAmount)} | ${money(netAmount * 0.2)} | ${money(netAmount * 1.2)} |`);
			}
			return `Invoices for ${biz}:\n\n${rows.join('\n')}`;
		};

		const importFile = () => {
			const lines = ['member_no,first_name,last_name,pass_name,credits_left,expires,payment_plan'];
			for (let i = int(r, 6, 10); i > 0; i--) {
				const [given, family] = pick(r, members).split(' ');
				const plan = mark === 'instalments' && r() < 0.4 ? 'instalments' : pick(r, ['none', 'none', 'monthly']);
				lines.push(`${int(r, 1000, 9999)},${given},${family},${pick(r, [kind.pack[0], 'Unlimited', 'Intro'])},${int(r, 0, 9)},2027-0${int(r, 1, 6)}-${pad(int(r, 1, 28))},${plan}`);
			}
			return `\`\`\`text\n${lines.join('\n')}\n\`\`\``;
		};

		const roles = () => {
			const rows = ['| Staff | Role | Revenue and reports | Timetable | Payments | Added |', '| --- | --- | --- | --- | --- | --- |'];
			const team: [string, string][] = [[full, 'Owner'], [`${staff} ${pick(r, surnames)}`, mark === 'manager' ? 'Manager' : 'Front desk'], [`${staff2} ${pick(r, surnames)}`, pick(r, ['Manager', 'Owner', 'Scheduler'])]];
			for (const person of instructors.slice(0, int(r, 2, 4))) team.push([person, 'Instructor']);
			const can: Record<string, string[]> = { Owner: ['yes', 'edit', 'yes'], Manager: ['yes', 'edit', 'yes'], 'Front desk': ['no', 'view', 'take payments'], Scheduler: ['no', 'edit', 'no'], Instructor: ['no', 'own classes', 'no'] };
			for (const [person, role] of team) rows.push(`| ${person} | ${role} | ${can[role]![0]} | ${can[role]![1]} | ${can[role]![2]} | ${shortDate(at(signup + int(r, 0, 200) * 1440))} |`);
			return `Staff:\n\n${rows.join('\n')}`;
		};

		const pastes: Record<Paste, () => string> = { none: () => '', studio: studioPanel, timetable, roster, waitlist, log: bookingLog, classSettings, rules, ledger, payments, payout, attendance, pay, csv, error: errorPage, tablet, invoices, import: importFile, roles };
		/** Each screen is pasted once: a note does not paste again what the studio already showed. */
		const pasted = new Set<Paste>();
		const pasteOf = (kindOfPaste: Paste = 'none') => {
			if (pasted.has(kindOfPaste)) return '';
			pasted.add(kindOfPaste);
			return pastes[kindOfPaste]();
		};
		return { f, pasteOf, values };
	};
	const { f, pasteOf, values } = matter(topic, path, 0, open);

	// The thread.
	let t = open;
	const messages: string[] = [];
	const labels: Record<Who, string> = {
		c: `**${full}**`,
		a: `**${agent} (Perch support)**`,
		n: `**${agent} (Perch support)** · internal note`,
		k: `**${bk} (booking team)** · internal note`,
		K: `**${bk} (booking team)**`,
		o: `**${cons} (console team)** · internal note`,
		O: `**${cons} (console team)**`,
		p: `**${paymentsLead} (payments)** · internal note`,
		P: `**${paymentsLead} (payments)**`,
		d: `**${onboardingLead} (data and onboarding)** · internal note`,
		D: `**${onboardingLead} (data and onboarding)**`,
		b: `**${accountsLead} (accounts)** · internal note`,
		B: `**${accountsLead} (accounts)**`,
		s: '**Help desk**'
	};
	const signers: Partial<Record<Who, string>> = { a: agent, K: bk.split(' ')[0]!, O: cons.split(' ')[0]!, P: paymentsLead.split(' ')[0]!, D: onboardingLead.split(' ')[0]!, B: accountsLead.split(' ')[0]! };
	const say = (who: Who, body: string) => messages.push(`${labels[who]} · ${stampShort(t)}\n\n${body.trim()}`);
	let held2 = false;
	const advance = (who: Who) => {
		const before = t;
		if (held2 && who !== 'a' && who !== 's') {
			t += int(r, 600, 2200);
			held2 = false;
		}
		if (who === 'c') t = waking(r, t + int(r, 25, 1700));
		else if (who === 's') t = office(r, startOfDay(t) + 5 * 1440 + 9 * 60);
		else if (who === 'a' || who === 'K' || who === 'O' || who === 'P' || who === 'D' || who === 'B') t = office(r, t + int(r, 20, 700));
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
		const hello = [`Hi ${first},`, `Hello ${first},`, `Hi ${first},`, ...(/^(Thanks|Thank you|Sorry)/.test(paragraphs[0]!) ? [] : [`Thanks, ${first}.`])];
		return [...(/^(Hello|Hi) /.test(paragraphs[0]!) ? [] : [pick(r, hello)]), ...paragraphs, ...extra, ...closing, fill(pick(r, agentSign), { signer: signers[who]! })].join('\n\n');
	};

	// 1. The studio writes in.
	const tangent = r() < 0.35 ? pick(r, tangents) : undefined;
	const opens = path.opens ?? topic.open.map((_, i) => i);
	const opening = [f(topic.open[pick(r, opens)]!)];
	if (r() < 0.55) opening.unshift(fill(pick(r, kind.intro), values));
	if (r() < 0.4 && !topic.newcomer) opening.splice(opening.length - 1, 0, f(pick(r, contexts)));
	if (r() < 0.85) opening.push(f(pick(r, topic.more)));
	if (r() < 0.5) opening.push(f(pick(r, situations)));
	if (tangent) opening.push(tangent[0]);
	if (topic.shows && r() < 0.75) opening.push(`${pick(r, ['Here’s the roster as it stands:', 'This is what the console shows:', 'Copied from the console:'])}\n\n${pasteOf(topic.shows)}`);
	say('c', custBody(opening, true));

	// 2. Support asks.
	advance('a');
	const ask = f(pick(r, topic.ask));
	const ack = /^(Thanks|Sorry|Thank you|Of course|Happy|Let|Good|Welcome|Congratulations|Don’t|I’m)/.test(ask) ? '' : pick(r, acks);
	say('a', agentBody('a', [[ack, ask].filter(Boolean).join(' '), ...(tangent ? [tangent[1]] : [])], true));

	// 3. The studio answers, and may raise a second matter.
	advance('c');
	const side = r() < 0.7 ? pick(r, sides) : undefined;
	const answer = [f(pick(r, path.detail)), pasteOf(path.paste)].filter(Boolean);
	if (side) {
		answer.push(f(side.q));
		pendingSide.push(f(side.a));
	}
	say('c', custBody(answer, false));

	// 4. Someone looks.
	if (path.look.length) {
		advance('n');
		say(path.lookWho ?? 'n', [f(pick(r, path.look)), pasteOf(path.lookPaste ?? 'studio')].filter(Boolean).join('\n\n'));
	}

	// 5. Sometimes a wait; always when the second matter would otherwise go unanswered.
	const end = pick(r, path.ends);
	const answered = end.some(([who]) => who === 'a');
	const second = shuffle(r, sides).find((other) => other !== side)!;
	const chase = () => {
		advance('c');
		const raise = answered && r() < 0.5;
		say('c', custBody([f(pick(r, chasers)), ...(raise ? [f(second.q)] : [])], false));
		if (raise) pendingSide.push(f(second.a));
	};
	if ((path.team && r() < 0.6) || (pendingSide.length && !answered)) {
		advance('a');
		held2 = true;
		say('a', agentBody('a', [fill(pick(r, holding), { ...values, team: path.team ?? 'right people' }).replace('the right people to take a look', 'the right people to look at it')], true));
		if (r() < 0.55) chase();
	} else if (r() < 0.35) chase();

	// 6. While support waits, the studio may raise other matters, each followed through on its own.
	const extras = shuffle(r, topics.filter((other) => other !== topic && !other.newcomer && (!other.since || iso(open) >= other.since))).slice(0, topic.newcomer ? 0 : pick(r, [0, 1, 1, 2, 2]));
	extras.forEach((other, k) => {
		const otherPath = pick(r, other.paths);
		advance('c');
		const m = matter(other, otherPath, k + 1, t);
		const raise = [`${pick(r, leadIns)} ${m.f(other.open[pick(r, otherPath.opens ?? other.open.map((_, i) => i))]!)}`];
		if (r() < 0.5) raise.push(m.f(pick(r, other.more)));
		if (other.shows && r() < 0.5) raise.push(`${pick(r, ['Here’s the roster:', 'This is what the console shows:'])}\n\n${m.pasteOf(other.shows)}`);
		say('c', custBody(raise, false));
		advance('a');
		say('a', agentBody('a', [m.f(pick(r, other.ask))]));
		advance('c');
		say('c', custBody([m.f(pick(r, otherPath.detail)), m.pasteOf(otherPath.paste)].filter(Boolean), false));
		if (otherPath.look.length) {
			advance('n');
			say(otherPath.lookWho ?? 'n', [m.f(pick(r, otherPath.look)), m.pasteOf(otherPath.lookPaste ?? 'none')].filter(Boolean).join('\n\n'));
		}
		const quiet = otherPath.ends.filter((sequence) => sequence.every(([who]) => who !== 's'));
		for (const [who, body] of pick(r, quiet.length ? quiet : otherPath.ends)) {
			advance(who);
			const text = m.f(body);
			if (who === 'c') say('c', custBody([text], false));
			else if (signers[who]) say(who, agentBody(who, [text]));
			else say(who, text);
		}
	});

	// 7. The end of the first matter.
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

	const roll = r();
	const subject = roll < 0.12 ? pick(r, vagueSubjects) : roll < 0.24 && extras[0] ? fill(pick(r, extras[0].subjects), values) : f(pick(r, [...topic.subjects, ...(path.subjects ?? [])]));
	const channel = r() < 0.65 ? 'by email' : 'through the help form in the studio console';
	return [`# Ticket ${number}: ${subject}`, `From ${full} <${email}>, ${biz} · ${stampLong(open)} · ${channel}`, ...messages.map((message) => `---\n\n${message}`)].join('\n\n') + '\n';
};

// Which topic and path each ticket follows: topics are dealt in rounds, each round in a new order, and the paths of
// a topic in turn, so that two tickets on one topic end differently until its paths run out.
const order = mulberry32(20261001);
const plansOf: Plan[] = [];
const used = new Map<Topic, number>();
const deck: Topic[] = [];
let joiners = 0;
for (let index = 0; index < ITEMS; index++) {
	const open = workdays[Math.floor((index * workdays.length) / ITEMS)]!;
	const allowed = (topic: Topic) => !topic.since || iso(open) >= topic.since;
	if (!deck.some(allowed)) deck.push(...shuffle(order, topics));
	const topic = deck.splice(deck.findIndex(allowed), 1)[0]!;
	const seen = used.get(topic) ?? 0;
	used.set(topic, seen + 1);
	plansOf.push({ topic, path: topic.paths[(seen + topics.indexOf(topic)) % topic.paths.length]!, open, joiner: topic.newcomer ? joiners++ : 0 });
}

const folder = join(root, 'support', 'studio-tickets');
mkdirSync(folder, { recursive: true });
let number = 31840;
plansOf.forEach((plan, index) => {
	number += int(order, 1, 4);
	writeFileSync(join(folder, `ticket-${number}.md`), ticket(index, plan, number));
});
writeFileSync(
	join(folder, 'README.md'),
	`# Studio tickets, 1 October to 13 November 2026\n\nThe ${ITEMS} tickets that studios opened with Wrenfield’s Perch support in these six weeks, one file each, exported from the\nold help desk before the move. The export kept the messages and the internal notes, but not the tags, statuses\nor assignees. Numbers missing from the sequence were spam or were merged into another ticket. Console screens\nand extracts in the tickets are as support or the studio pasted them.\n`
);
