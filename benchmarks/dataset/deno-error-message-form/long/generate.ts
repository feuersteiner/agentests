// Writes the long material of this entry's long tasks: the support tickets Larkspur's support team tagged
// "times wrong" between June and mid-November 2024, one Markdown file each with its whole thread, under
// docs/tickets/. Deterministic: fixed seeds, no clock, no network.
//   bun long/generate.ts <workspace root>
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** The number of tickets written; everything else follows from it. */
const ITEMS = 126;

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
const pad = (value: number) => String(value).padStart(2, '0');
const cap = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

// Dates are YYYY-MM-DD strings; times are HH:MM strings or minutes after midnight.
const DAY = 86_400_000;
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const toMs = (date: string) => Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10));
const toDate = (ms: number) => {
	const d = new Date(ms);
	return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
};
const addDays = (date: string, days: number) => toDate(toMs(date) + days * DAY);
const daysBetween = (from: string, to: string) => Math.round((toMs(to) - toMs(from)) / DAY);
const weekday = (date: string) => new Date(toMs(date)).getUTCDay();
const longDay = (date: string) => `${WEEKDAYS[weekday(date)]} ${+date.slice(8)} ${MONTHS[+date.slice(5, 7) - 1]}`;
const shortDay = (date: string) => `${WEEKDAYS[weekday(date)]!.slice(0, 3)} ${+date.slice(8)} ${MONTHS[+date.slice(5, 7) - 1]!.slice(0, 3)}`;
const dayMonth = (date: string) => `${+date.slice(8)} ${MONTHS[+date.slice(5, 7) - 1]}`;
const toMin = (time: string) => +time.slice(0, 2) * 60 + +time.slice(3, 5);
const clock = (minutes: number) => {
	const m = ((minutes % 1440) + 1440) % 1440;
	return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
};
const ordinal = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th'}`;

// Time zones: standard offset in hours, plus one in summer time (Europe: 31 March to 27 October 2024).
const BASE: Record<string, number> = {
	'Europe/London': 0,
	'Europe/Dublin': 0,
	'Europe/Berlin': 1,
	'Europe/Vienna': 1,
	'Europe/Zurich': 1,
	'Europe/Paris': 1,
	'Europe/Brussels': 1,
	'America/New_York': -5
};
const summer = (zone: string, date: string) =>
	zone.startsWith('America/') ? date >= '2024-03-10' && date < '2024-11-03' : date >= '2024-03-31' && date < '2024-10-27';
const offset = (zone: string, date: string) => BASE[zone]! + (summer(zone, date) ? 1 : 0);
/** The UTC instant of a local date and time, as stored: 2024-10-29T08:20:00Z. */
const utc = (zone: string, date: string, time: string) => {
	const m = toMin(time) - offset(zone, date) * 60;
	return `${addDays(date, Math.floor(m / 1440))}T${clock(m)}:00Z`;
};
const zoneCity = (zone: string) => zone.split('/')[1]!.replace('_', ' ');

type Lang = 'en' | 'de' | 'fr';
/** A length as datetime-utils' formatDuration writes it with the default precision of 1. */
const formatLength = (minutes: number, lang: Lang) => {
	const labels = { en: ['h', 'min'], de: ['Std.', 'Min.'], fr: ['h', 'min'] }[lang];
	if (minutes < 60) return `${minutes} ${labels[1]}`;
	const hours = String(Math.round((minutes / 60) * 10) / 10);
	return `${lang === 'en' ? hours : hours.replace('.', ',')} ${labels[0]}`;
};

// The customers: Larkspur's accounts that appear in the tickets.
interface Account {
	name: string;
	owner: string;
	city: string;
	zone: string;
	lang: Lang;
	type: string;
	services: [string, number][];
	staff: string[];
	since: number;
	phone: string;
	second?: { city: string; zone: string };
}
const account = (name: string, owner: string, city: string, zone: string, lang: Lang, type: string, services: [string, number][], staff: string[], since: number, phone: string, second?: { city: string; zone: string }): Account => ({ name, owner, city, zone, lang, type, services, staff, since, phone, second });
const accounts: Account[] = [
	account('Northgate Physiotherapy', 'Helen Ashworth', 'Leeds', 'Europe/London', 'en', 'physio', [['Sports massage', 80], ['Initial assessment', 60], ['Follow-up treatment', 30]], ['Chloe', 'Laura', 'Aisha'], 2019, '+44 113'),
	account('Copperbeech Dental', 'Raj Patel', 'Bristol', 'Europe/London', 'en', 'dental', [['Check-up', 20], ['Hygienist visit', 40], ['Whitening consultation', 30]], ['Megan', 'Tara', 'Grace'], 2018, '+44 117'),
	account('The Groom Room', 'Kirsty Fairbairn', 'Norwich', 'Europe/London', 'en', 'grooming', [['Full groom', 120], ['Bath and tidy', 75], ['Puppy intro', 45]], ['Holly', 'Jodie'], 2021, '+44 1603'),
	account('Fernhill Driving School', 'Gareth Pryce', 'Cardiff', 'Europe/London', 'en', 'driving', [['Driving lesson', 90], ['Motorway lesson', 120], ['Mock test', 75]], ['Rhian', 'Bethan', 'Ffion'], 2020, '+44 29'),
	account('Saltmarsh Yoga', 'Becca Lowther', 'York', 'Europe/London', 'en', 'yoga', [['Vinyasa flow', 75], ['Yin yoga', 60], ['Private session', 80]], ['Imogen', 'Sam'], 2022, '+44 1904'),
	account('Kingfisher Tutors', 'Omar Siddiqui', 'Manchester', 'Europe/London', 'en', 'tutoring', [['GCSE maths', 60], ['A-level chemistry', 90], ['11+ practice', 100]], ['Priti', 'Ellie', 'Abena'], 2017, '+44 161'),
	account('Hollybank Veterinary Surgery', 'Fiona McLeish', 'Exeter', 'Europe/London', 'en', 'vet', [['Vaccination', 20], ['Out-of-hours consultation', 30], ['Dental scale and polish', 110]], ['Beth', 'Zara', 'Callie'], 2016, '+44 1392'),
	account('Wayland Climbing Centre', 'Dan Whitaker', 'Sheffield', 'Europe/London', 'en', 'climbing', [['Intro to bouldering', 90], ['Kids club', 75], ['Belay course', 105]], ['Olivia', 'Jess', 'Marta'], 2019, '+44 114'),
	account('Elmwood Counselling', 'Naomi Fisher', 'Brighton', 'Europe/London', 'en', 'counselling', [['Counselling session', 50], ['Couples session', 80], ['First consultation', 30]], ['Ruth', 'Alice'], 2020, '+44 1273'),
	account('Studio Nine Hair', 'Morven Gillies', 'Glasgow', 'Europe/London', 'en', 'salon', [['Cut and finish', 60], ['Colour and cut', 150], ['Balayage', 180]], ['Kayleigh', 'Eilidh', 'Rachel'], 2018, '+44 141'),
	account('Brightside Music School', 'Paul Okoro', 'Nottingham', 'Europe/London', 'en', 'music', [['Piano lesson', 45], ['Guitar lesson', 30], ['Theory class', 80]], ['Hannah', 'Lucy'], 2021, '+44 115'),
	account('Hartley Language School', 'Victoria Hartley', 'London', 'Europe/London', 'en', 'language', [['Conversation class', 90], ['Business English', 75], ['Placement test', 40]], ['Danielle', 'Mariana', 'Yasmin'], 2018, '+44 20', { city: 'New York', zone: 'America/New_York' }),
	account('Liffey Sports Clinic', 'Ciara Nolan', 'Dublin', 'Europe/Dublin', 'en', 'physio', [['Sports massage', 80], ['Physio assessment', 60], ['Rehab session', 45]], ['Aoife', 'Ciara', 'Niamh'], 2019, '+353 1'),
	account('Corrib Swim School', 'Declan Furey', 'Galway', 'Europe/Dublin', 'en', 'swim', [['Parent and baby', 30], ['Stage 3 lessons', 45], ['Adult improvers', 75]], ['Saoirse', 'Róisín'], 2020, '+353 91'),
	account('Lee Valley Osteopathy', "Sinéad O'Leary", 'Cork', 'Europe/Dublin', 'en', 'osteo', [['Osteopathy treatment', 45], ['First visit', 75], ['Cranial session', 50]], ['Emer', 'Clodagh'], 2022, '+353 21'),
	account('Lumen Photography Studio', 'Fintan Walsh', 'Dublin', 'Europe/Dublin', 'en', 'photo', [['Portrait session', 100], ['Headshots', 40], ['Family shoot', 110]], ['Orla', 'Sinéad'], 2021, '+353 1', { city: 'Boston', zone: 'America/New_York' }),
	account('Physiopraxis Lindenhof', 'Jana Krüger', 'Leipzig', 'Europe/Berlin', 'de', 'physio', [['Sportmassage', 80], ['Krankengymnastik', 30], ['Manuelle Therapie', 45]], ['Mia', 'Lisa', 'Elif'], 2019, '+49 341'),
	account('Hundesalon Pfotenglück', 'Birgit Hansen', 'Hamburg', 'Europe/Berlin', 'de', 'grooming', [['Komplettpflege', 120], ['Baden und Föhnen', 75], ['Krallenpflege', 20]], ['Leonie', 'Tanja'], 2020, '+49 40'),
	account('Fahrschule Brandt', 'Markus Brandt', 'Cologne', 'Europe/Berlin', 'de', 'driving', [['Fahrstunde', 90], ['Autobahnfahrt', 135], ['Theorieunterricht', 90]], ['Paula', 'Sophie', 'Ceren'], 2018, '+49 221'),
	account('Yogaraum Elbe', 'Lena Vogt', 'Dresden', 'Europe/Berlin', 'de', 'yoga', [['Hatha Yoga', 75], ['Yin Yoga', 80], ['Rückenyoga', 60]], ['Hannah', 'Maren'], 2021, '+49 351'),
	account('Zahnarztpraxis Dr. Albers', 'Thomas Albers', 'Munich', 'Europe/Berlin', 'de', 'dental', [['Kontrolle', 20], ['Professionelle Zahnreinigung', 50], ['Beratung', 30]], ['Sabrina', 'Jana', 'Aylin'], 2017, '+49 89'),
	account('Kletterhalle Nordwand', 'Felix Romero', 'Berlin', 'Europe/Berlin', 'de', 'climbing', [['Schnupperkurs', 105], ['Toprope-Kurs', 110], ['Kinderklettern', 80]], ['Maja', 'Svenja', 'Derya'], 2019, '+49 30'),
	account('Tierarztpraxis am Stadtpark', 'Katrin Bosse', 'Hanover', 'Europe/Berlin', 'de', 'vet', [['Impfung', 20], ['Notdienst', 30], ['Zahnsanierung', 100]], ['Nina', 'Julia'], 2018, '+49 511'),
	account('Massageatelier Ganz', 'Sabine Ganz', 'Vienna', 'Europe/Vienna', 'de', 'massage', [['Klassische Massage', 50], ['Tiefengewebsmassage', 80], ['Hot Stone', 100]], ['Theresa', 'Franziska'], 2020, '+43 1'),
	account('Nachhilfe Plus', 'Stefan Pichler', 'Graz', 'Europe/Vienna', 'de', 'tutoring', [['Mathematik', 60], ['Englisch', 50], ['Maturavorbereitung', 100]], ['Lisa', 'Birgit', 'Ana'], 2022, '+43 316'),
	account('Physio am Rhein', 'Urs Meier', 'Basel', 'Europe/Zurich', 'de', 'physio', [['Physiotherapie', 30], ['Sportmassage', 80], ['Domizilbehandlung', 45]], ['Regula', 'Corinne'], 2019, '+41 61'),
	account('Studio Pilates Léman', 'Camille Rochat', 'Lausanne', 'Europe/Zurich', 'fr', 'pilates', [['Pilates matwork', 55], ['Reformer privé', 50], ['Pilates prénatal', 75]], ['Océane', 'Laure'], 2021, '+41 21'),
	account('Coiffure Bellevue', 'Nadia Benali', 'Geneva', 'Europe/Zurich', 'fr', 'salon', [['Coupe et brushing', 60], ['Couleur', 105], ['Mèches', 150]], ['Sarah', 'Kelly', 'Mélanie'], 2018, '+41 22'),
	account('Cabinet Kiné Croix-Rousse', 'Julien Morel', 'Lyon', 'Europe/Paris', 'fr', 'physio', [['Séance de kiné', 30], ['Massage sportif', 80], ['Bilan', 45]], ['Léa', 'Hélène', 'Manon'], 2019, '+33 4'),
	account('Salon Lumière', 'Émilie Durand', 'Nantes', 'Europe/Paris', 'fr', 'salon', [['Coupe femme', 60], ['Balayage', 150], ['Coupe homme', 30]], ['Chloé', 'Thaïs'], 2020, '+33 2'),
	account('Auto-école Martin', 'Karim Haddad', 'Lille', 'Europe/Paris', 'fr', 'driving', [['Leçon de conduite', 60], ['Conduite sur autoroute', 120], ['Examen blanc', 75]], ['Nadia', 'Inès', 'Yasmine'], 2017, '+33 3'),
	account('Studio Yoga Saint-Jean', 'Claire Fontaine', 'Bordeaux', 'Europe/Paris', 'fr', 'yoga', [['Vinyasa', 75], ['Yoga doux', 60], ['Atelier respiration', 110]], ['Camille', 'Lucie'], 2022, '+33 5'),
	account('Clinique Vétérinaire des Tilleuls', 'Bastien Lefèvre', 'Rennes', 'Europe/Paris', 'fr', 'vet', [['Vaccination', 20], ['Consultation de garde', 30], ['Détartrage', 100]], ['Margaux', 'Anaïs'], 2016, '+33 2'),
	account('École de Musique Allegro', 'Sophie Garnier', 'Toulouse', 'Europe/Paris', 'fr', 'music', [['Cours de piano', 45], ['Cours de violon', 30], ['Solfège', 80]], ['Louise', 'Maëlle'], 2020, '+33 5'),
	account('Ostéo Châtelain', 'Laurent Dubois', 'Brussels', 'Europe/Brussels', 'fr', 'osteo', [["Séance d'ostéopathie", 45], ['Première consultation', 75], ['Ostéo du sport', 50]], ['Elise', 'Myriam'], 2021, '+32 2'),
	account('Atelier Coiffure Meuse', 'Inès Lambert', 'Liège', 'Europe/Brussels', 'fr', 'salon', [['Coupe et brushing', 60], ['Couleur', 105], ['Lissage', 150]], ['Julie', 'Bérénice'], 2019, '+32 4')
];
const CLASSES = ['yoga', 'pilates', 'music', 'swim', 'language', 'climbing', 'tutoring'];
const NIGHTS = ['vet', 'climbing'];

// Larkspur's people. Support answers the customers; the engineers work on the scheduling services.
const agents = ['Rosa', 'Callum', 'Mehwish', 'Bart', 'Femi', 'Ines'];
const engineers = ['Halvard Nygaard', 'Priya Raman', 'Matthias Weber', 'Aoife Brennan', 'Tomasz Zieliński', 'Élodie Marchand', 'Kwabena Osei'];

// Pasted output.
const fence = (lines: string[]) => '```text\n' + lines.join('\n') + '\n```';
const table = (head: string[], rows: string[][]) =>
	[`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`, ...rows.map((row) => `| ${row.join(' | ')} |`)].join('\n');
const hex = (r: Rand, length: number) => Array.from({ length }, () => Math.floor(r() * 16).toString(16)).join('');
const bookingRef = (r: Rand) => `BK-${int(r, 400000, 799999)}`;
const masked = (r: Rand, prefix: string) => `${prefix} *** ${pad(int(r, 0, 99))}${int(r, 0, 9)}`;
const initials = (r: Rand) => `${pick(r, 'ABCDEFGHJKLMNPRSTW'.split(''))}. ${pick(r, 'ABCDEFGHJKLMNOPRSTVW'.split(''))}.`;

// What a ticket is about. A topic is a kind of report; a cause is what it turned out to be. The kind of cause
// and how the ticket ended are never written in the file as labels: they follow from the thread.
type Kind = 'lib' | 'svc' | 'customer' | 'none';
type Svc = 'booking' | 'reminders' | 'rota' | 'calendar sync' | 'invoicing' | 'reports';
interface Ctx {
	r: Rand;
	a: Account;
	truth: Cause | null;
	date: string;
	time: string;
	mins: number;
	service: string;
	wrongZone: string;
	opened: string;
	changed: string;
	v: Record<string, string>;
}
interface Cause {
	kind: Kind;
	/** svc: the service at fault; lib: the service that changes how it uses datetime-utils. */
	svc?: Svc;
	/** Only ever a first guess. */
	decoy?: boolean;
	/** svc and lib: whether the fault touched every account while it lasted, or only some. */
	all?: boolean;
	from?: string;
	fixed?: string;
	planned?: string;
	fits?: (a: Account) => boolean;
	/** As a first guess: a clause without a capital or a full stop. */
	guess: string;
	/** Why it was ruled out, as a clause. */
	not: string;
	find?: string;
	tell?: string;
	/** What Larkspur changes, as an infinitive without "to". */
	fix?: string;
	/** A way round it, as a clause that can follow "In the meantime,". */
	around?: string;
	/** What the customer has to do, as an imperative without a capital. */
	ask?: string;
	art?: (c: Ctx) => string;
}
interface Topic {
	id: string;
	from?: string;
	to?: string;
	fits?: (a: Account) => boolean;
	length?: (minutes: number) => boolean;
	appt?: (opened: string, r: Rand) => string;
	time?: (c: Ctx) => string;
	changed?: string[];
	sure?: boolean;
	/** At most this many tickets, for a report that is rare. */
	max?: number;
	vars?: (c: Ctx) => Record<string, string>;
	brief: string;
	need: string;
	subjects: string[];
	opens: string[];
	more: string[];
	first: string[];
	look: string[];
	pasteCustomer?: (c: Ctx) => string;
	pasteEng?: (c: Ctx) => string;
	causes: Cause[];
}

const deDate = (date: string) => `${date.slice(8)}.${date.slice(5, 7)}.`;
const frDate = (date: string) => `${date.slice(8)}/${date.slice(5, 7)}`;
/** A client's text as their phone showed it. */
const sms = (c: Ctx, length = '', tomorrow = false) => {
	const len = length ? ` (${length})` : '';
	const { a } = c;
	if (a.lang === 'de')
		return `Hallo [name removed], wir erinnern an Ihren Termin ${c.service}${len} bei ${a.name} ${tomorrow ? 'morgen' : `am ${deDate(c.date)}`} um ${c.time} Uhr. Absagen mit C oder unter ${c.v.phone}.`;
	if (a.lang === 'fr')
		return `Bonjour [name removed], rappel de votre rendez-vous ${c.service}${len} chez ${a.name} ${tomorrow ? 'demain' : `le ${frDate(c.date)}`} à ${c.time}. Pour annuler, répondez C ou appelez le ${c.v.phone}.`;
	return `Hi [name removed], a reminder of your ${c.service}${len} at ${a.name} ${tomorrow ? 'tomorrow' : `on ${shortDay(c.date)}`} at ${c.time}. Reply C to cancel or call ${c.v.phone}.`;
};
/** The settings history, with the change that matters among others. */
const audit = (c: Ctx, setting: string, change: string, at = c.changed) => {
	const { r } = c;
	const noise: [string, string][] = [
		['Opening hours › Saturday', `09:00–${pick(r, ['13:00', '14:00', '16:00'])} → 09:00–${pick(r, ['15:00', '17:00'])}`],
		[`Services › ${c.a.services[1]![0]} › Buffer after`, `${pick(r, ['0', '5', '10'])} min → ${pick(r, ['10', '15'])} min`],
		['Closures', `added ${dayMonth(addDays(at, int(r, 20, 60)))} (all day)`],
		['Booking page › Minimum notice', `${pick(r, ['2 h', '4 h'])} → ${pick(r, ['12 h', '24 h'])}`],
		[`Staff › ${c.v.staff} › Working pattern`, 'edited'],
		['Branding › Logo', 'replaced'],
		[`Services › ${c.a.services[0]![0]} › Price`, `${int(r, 40, 60)}.00 → ${int(r, 61, 75)}.00`],
		['Payments › Deposit', `none → ${pick(r, ['20%', '10.00'])}`]
	];
	const rows = shuffle(r, noise)
		.slice(0, int(r, 4, 6))
		.map(([what, how], i): [string, string[]] => {
			const when = addDays(at, i % 2 === 0 ? -int(r, 3, 40) : int(r, 1, 4));
			return [when, [`${when} ${pad(int(r, 8, 19))}:${pad(int(r, 0, 59))}`, pick(r, [c.v.ownerLogin, c.v.staffLogin, c.v.staff2Login]), what, how]];
		});
	rows.push([at, [`${at} ${pad(int(r, 7, 22))}:${pad(int(r, 0, 59))}`, c.v.staff2Login, setting, change]]);
	rows.sort((x, y) => (x[0] < y[0] ? 1 : -1));
	return table(['When', 'Who', 'Setting', 'Change'], rows.map(([, row]) => row));
};
const vevent = (c: Ctx, uid: string, start: string, end: string, summary: string, tz = true) =>
	[
		'BEGIN:VEVENT',
		`UID:${uid}@larkspur.app`,
		`DTSTAMP:${c.opened.replace(/-/g, '')}T0${int(c.r, 5, 9)}${pad(int(c.r, 0, 59))}00Z`,
		tz ? `DTSTART;TZID=${c.a.zone}:${start}` : `DTSTART:${start}`,
		tz ? `DTEND;TZID=${c.a.zone}:${end}` : `DTEND:${end}`,
		`SUMMARY:${summary}`,
		'END:VEVENT'
	].join('\n');
const icsTime = (date: string, time: string) => `${date.replace(/-/g, '')}T${time.replace(':', '')}00`;

const topics: Topic[] = [
	{
		id: 'evening-batch',
		from: '2024-10-28',
		to: '2024-11-14',
		appt: (opened, r) => {
			const d = addDays(opened, -int(r, 0, 3));
			return d < '2024-10-29' ? '2024-10-29' : d;
		},
		changed: ['2024-10-26', '2024-10-27'],
		vars: (c) => ({ send: c.v.send!, sendEarly: clock(toMin(c.v.send!) - 60), sendLate: clock(toMin(c.v.send!) + 60) }),
		brief: 'day-before SMS reminders arriving an hour early since the clocks went back',
		need: "a screenshot of one of the early texts on a client's phone, showing when it arrived and which appointment it was for",
		subjects: ['Reminders coming an hour early', 'Day-before texts at the wrong time since the weekend', 'Has the reminder time changed?'],
		opens: [
			`Since the weekend our day-before reminders have been going out at {sendEarly} instead of {send}. We chose {send} on purpose: most of our clients are at work until then and read the text on the way home. Three of them have mentioned at the desk that it arrived "in the middle of the afternoon". Nothing has changed on our side that I know of.`,
			`Our clients get a text the day before their appointment, and it has always arrived at {send} on the dot. This week it has been coming at {sendEarly}. {staff} noticed because the reminder for her mother's appointment came through while she was still at work, which had never happened before.`,
			`The reminder texts are going out an hour early. The reminder screen says "day before" and the time we set, and I have a screenshot from {client}'s phone showing hers arrived at {sendEarly} on {eveWeekday}. It's a small thing, but we picked that time for a reason and clients notice.`
		],
		more: [
			`As far as I can tell it's every reminder, not just some. The email reminders seem fine, but hardly anyone reads those.`,
			`I asked around and nobody remembers touching the reminder settings. {staff2} has admin access as well as me, but she says she hasn't been in there for months.`,
			`It started on Monday the 28th. On the Friday before, {client} got hers at {send} as usual; I asked her.`
		],
		first: [
			`I've had a look at your account and the timing points to the clocks going back on 27 October, so I'm going to ask our engineers how the evening reminders are scheduled for you. I'll come back to you as soon as I hear.`,
			`Before I pass this on: are the reminders for all your services early, or only some of them? And if a client still has one of the texts, a screenshot showing when it arrived would help.`
		],
		look: [
			`The day-before texts for {biz} go out in the evening batch. The log for the days either side of 27 October is below, times in UTC.`,
			`Pulled the send log for {biz}. Our side sent every text when its schedule said; the question is what that schedule is in {zoneCity} time. Log below, in UTC.`
		],
		pasteCustomer: (c) => `[Screenshot from ${c.v.client}'s phone: a text from LARKSPUR received ${c.v.eveShort} at ${c.v.sendEarly}]\n\n> ${sms(c, '', true)}`,
		pasteEng: (c) => {
			const { r, a } = c;
			const batch = toMin(c.v.send!) - offset(a.zone, '2024-10-20') * 60;
			const lines: string[] = [];
			for (let d = '2024-10-22'; d <= '2024-10-31'; d = addDays(d, 1)) {
				if (weekday(d) === 6) continue;
				const at = c.truth ? batch : toMin(c.v.send!) - offset(a.zone, d) * 60;
				for (let k = int(r, 1, 3); k > 0; k--) {
					const head = `${d}T${clock(at)}`;
					const id = `rem-${hex(r, 6)}  ${bookingRef(r)}  sms`;
					const s = int(r, 1, 15);
					lines.push(`${head}:${pad(s)}Z  evening  ${id}  queued`, `${head}:${pad(s + int(r, 2, 20))}Z  evening  ${id}  sent       parts=1`, `${head}:${pad(s + int(r, 22, 44))}Z  evening  ${id}  delivered`);
				}
			}
			return fence(lines.sort());
		},
		causes: [
			{
				kind: 'svc',
				svc: 'reminders',
				fixed: '2024-11-06',
				guess: `the evening batch for this account is pinned to a UTC hour and didn't move with the clocks`,
				not: `this account is on the new scheduler, which works on each branch's own clock`,
				find: `Found it. {biz} signed up in {since} and is one of about 140 older accounts still on the old reminder scheduler. The old scheduler keeps the evening batch at a fixed UTC hour, worked out when the send time was last saved, which for {biz} was in summer. When the clocks went back the batch stayed put in UTC and so moved an hour earlier on the wall clock. Accounts on the new scheduler follow each branch's own clock and weren't affected.`,
				tell: `Your account is one of a group of older accounts that were still on our previous reminder scheduler. That scheduler kept the evening send time fixed in UTC instead of following your local clock, so when the clocks went back the texts started going out an hour early.`,
				fix: `move the remaining older accounts to the new scheduler, which follows each branch's own clock`,
				around: `you could set the send time to {sendLate} so that the texts arrive at {send}, and set it back once your account has moved`
			},
			{
				kind: 'customer',
				guess: `someone changed the send time on the account`,
				not: `the settings history shows no change to the reminder times for months`,
				find: `Checked the settings history (below). The SMS send time was changed from {send} to {sendEarly} on {changedDay} from {staff2}'s login. The scheduler has sent at exactly the time set ever since. That it happened the same weekend as the clock change is a coincidence.`,
				tell: `Our settings history shows that the time for the day-before texts was changed from {send} to {sendEarly} on {changedDay}, from {staff2}'s login. Since then the texts have gone out at exactly the time set, so the clock change wasn't the cause after all.`,
				ask: `set the time back to {send} under Settings > Reminders > Day before`,
				art: (c) => audit(c, 'Reminders › Day before › SMS time', `${c.v.send} → ${c.v.sendEarly}`)
			}
		]
	},
	{
		id: 'branch-zone',
		vars: (c) => {
			const shift = offset(c.a.zone, c.date) - offset(c.wrongZone, c.date);
			const open = pick(c.r, ['08:00', '08:30', '09:00']);
			return { shifted: clock(toMin(c.time) + shift * 60), open, openShifted: clock(toMin(open) + shift * 60) };
		},
		brief: 'online booking page and confirmations showing times an hour out from the staff calendar',
		need: 'the link to the booking page your clients use and one booking where the times disagree',
		subjects: ['Booking page times wrong', 'Clients turning up at the wrong time', "Online slots don't match our hours"],
		opens: [
			`Our online booking page is offering appointments that don't match our opening hours. We open at {open}, but the first slot clients see is at {openShifted}, and at the other end of the day it's just as far out. In our calendar everything is where it should be. Two clients this week turned up with a confirmation showing one time while our calendar said another.`,
			`Something is off with the times on the booking page. A client booked {service} for what she thought was {shifted} on {weekday}, and in our calendar it shows at {time}. She was not pleased to wait. I checked a few others and it is always exactly one hour.`,
			`I think the booking page has the wrong time, but I can't find where to check it. The page shows slots an hour away from what our staff see in the calendar. It may have been like this for a while: we only noticed because {staff} used it on her phone to book her mum in.`
		],
		more: [
			`It's only what clients see. Our staff calendar has the right times.`,
			`The confirmation {client} brought in says {shifted}; our calendar says {time}.`,
			`We moved to new premises in the spring, but it's the same city, so I can't see why that would matter.`
		],
		first: [
			`That's clear. The booking page shows times based on the time zone set for your branch, so the first thing I'd like to rule out is the branch settings. I'm asking one of our engineers to look at the account with me.`,
			`An exact hour usually means a time zone somewhere, so I'm escalating this to check how the booking page works out your times.`
		],
		look: [
			`Compared {biz}'s booking page with the staff calendar for the same day. The page is consistently an hour out. Branch record as stored below.`,
			`Looking at {biz}. Here's the branch record and what the booking page served for {weekday}.`
		],
		pasteCustomer: (c) => {
			const { a, v } = c;
			const lines =
				a.lang === 'de'
					? ['**Ihre Buchung ist bestätigt**', `${c.service} bei ${v.staff}`, `am ${deDate(c.date)} um ${v.shifted} Uhr`]
					: a.lang === 'fr'
						? ['**Votre réservation est confirmée**', `${c.service} avec ${v.staff}`, `le ${frDate(c.date)} à ${v.shifted}`]
						: ['**Your booking is confirmed**', `${c.service} with ${v.staff}`, `${shortDay(c.date)} at ${v.shifted}`];
			return [...lines, `${a.name}, ${a.city}`, 'Add to calendar · Change or cancel'].map((line) => `> ${line}`).join('\n');
		},
		pasteEng: (c) =>
			fence([
				`branch         ${c.a.city}`,
				`account        ${c.v.accountId}`,
				`time zone      ${c.truth ? c.wrongZone : c.a.zone}`,
				`hours          Mon–Fri ${c.v.open}–18:00, Sat ${c.v.open}–13:00`,
				`booking page   larkspur.app/b/${c.v.slug}`,
				`created        ${c.a.since}-0${int(c.r, 1, 9)}-${pad(int(c.r, 1, 28))}`,
				`updated        ${c.changed}`
			]),
		causes: [
			{
				kind: 'customer',
				guess: `the branch is set to the wrong time zone`,
				not: `the branch's time zone is {zone}, which is right for {city}`,
				find: `It's the branch time zone. {biz}'s branch is set to {wrongZone}, not {zone}; {zoneWhy}. The staff calendar shows times in the branch zone, so it looks right to staff who read it as local time, but the booking page and the calendar files in confirmations convert from the branch zone into the client's own, and that's where the hour comes from.`,
				tell: `Your branch is set to the {wrongZone} time zone instead of {zone}. Your staff calendar shows times in the branch's zone, so it looked right to your team, but the booking page and the confirmation emails convert those times into your clients' local time, and that's where the extra hour comes from.`,
				ask: `change the time zone under Settings > Branches > {city} to {zone} and check that the opening hours still read as you expect`
			},
			{
				kind: 'svc',
				svc: 'booking',
				decoy: true,
				guess: `the booking page is converting the times wrongly`,
				not: `the page converts correctly from whatever zone the branch has; a test branch on {zone} shows the right slots`
			}
		]
	},
	{
		id: 'night-shift-date',
		from: '2024-06-03',
		to: '2024-10-25',
		fits: (a) => NIGHTS.includes(a.type),
		appt: (opened, r) => {
			let d = addDays(opened, -int(r, 2, 12));
			while (weekday(d) !== 6 && weekday(d) !== 0) d = addDays(d, -1);
			return d;
		},
		time: (c) => pick(c.r, offset(c.a.zone, c.date) === 2 ? ['00:30', '01:00', '01:30'] : ['00:00', '00:30']),
		vars: (c) => ({ cutoff: clock(offset(c.a.zone, c.date) * 60), shiftEnd: clock(toMin(c.time) + 480) }),
		brief: 'shifts that start just after midnight showing under the previous day in the rota export and the staff app',
		need: 'the name of one shift that showed on the wrong day and the date it should have been on',
		subjects: ['Night shifts on the wrong day', 'Rota export dates wrong for overnight cover', 'Shift appearing a day early'],
		opens: [
			`We run overnight cover from {time} at weekends. In the export our payroll person uses, those shifts appear on the day before the one we mean, so {staff}'s hours land on the wrong days and the weekend rate goes on the wrong night. Payroll is due on the 25th and I would rather not fix it by hand again.`,
			`{staff2} got a notification in the staff app telling her she was on shift on {eveLong}, when the shift is the early hours of {day}. She nearly came in a night early. It only seems to happen with the shifts that start after midnight.`,
			`Bit of a strange one. Any shift that starts between midnight and about {cutoff} shows up under the previous date when we download the rota. The 22:00 starts are fine.`
		],
		more: [
			`I've only checked last month's export so far, and the notifications people have mentioned to me.`,
			`Our payroll person says she has been adjusting these by hand for a while without telling anyone.`,
			`The shifts were planned by {staff2}, who does all our nights. I just approve the rota.`
		],
		first: [
			`I've checked your branch settings and the time zone is {zone}, which is right for {city}, so it isn't that. I'll pass this to the team that looks after the rota.`,
			`I can see what you mean in the export. Before I escalate: does it happen for shifts added by every manager, or only for some?`
		],
		look: [
			`Pulled {biz}'s shift records for the last few weekends. The early starts are below with what's stored and what the export printed.`,
			`Looked at {biz}'s rota. Every early start the customer mentioned is in the table below, stored times in UTC.`
		],
		pasteCustomer: (c) => {
			const { r, v } = c;
			const rows = ['day,staff,role,start,end,hours,rate'];
			rows.push(`${shortDay(addDays(c.date, -1))},${v.staff2},late,14:00,22:00,8.0,standard`);
			rows.push(`${shortDay(addDays(c.date, -1))},${v.staff},overnight cover,${c.time},${v.shiftEnd},8.0,${weekday(c.date) === 6 ? 'standard' : 'weekend'}`);
			rows.push(`${shortDay(c.date)},${v.staff3},early,06:00,14:00,8.0,weekend`);
			const later: [number, string][] = [];
			for (let i = int(r, 4, 7); i > 0; i--) {
				const offset = int(r, 1, 6);
				later.push([offset, `${shortDay(addDays(c.date, offset))},${pick(r, [v.staff2, v.staff3])},${pick(r, ['early,06:00,14:00,8.0', 'late,14:00,22:00,8.0', 'reception,09:00,17:30,8.5'])},standard`]);
			}
			later.sort((x, y) => x[0] - y[0]);
			return fence([...rows, ...later.map(([, row]) => row)]);
		},
		pasteEng: (c) => {
			const { r, a, v } = c;
			const rows: string[][] = [];
			for (let i = 0; i < int(r, 4, 7); i++) {
				const night = addDays(c.date, -7 * i);
				const day = c.truth?.kind === 'customer' ? addDays(night, -1) : night;
				const shown = c.truth ? addDays(night, -1) : night;
				rows.push([`sh-${hex(r, 5)}`, i % 2 === 0 ? v.staff! : v.staff2!, utc(a.zone, day, c.time), `${shortDay(day)} ${c.time}`, shortDay(shown)]);
			}
			return table(['Shift', 'Staff', 'Start (stored)', `Start, ${zoneCity(a.zone)} time`, 'Export day'], rows);
		},
		causes: [
			{
				kind: 'svc',
				svc: 'rota',
				all: true,
				from: '2024-08-12',
				fixed: '2024-10-01',
				guess: `the export works out the day of each shift in UTC`,
				not: `rota has worked out the day of a shift in the branch's own zone since the change on {fixedDay}`,
				find: `It's in rota. Since the export was rebuilt on 12 August, the export and the shift notifications take the start of each shift, which is stored in UTC, and use its UTC date as the day. For a {time} start in {zoneCity} it's still the previous evening in UTC, so the shift lands a day early. The rota screen works out the day in the branch's zone, which is why it looks right there.`,
				tell: `The rota export and the shift notifications were working out the day of each shift in UTC instead of in your local time. For shifts that start after midnight your time, it is still the previous day in UTC, so they landed a day early. The rota screen uses your local time, which is why it looked right there.`,
				fix: `work out the day of each shift in the branch's own time zone in the export and the notifications`,
				around: `the print view of the rota shows the right days, if your payroll person can work from that for now`
			},
			{
				kind: 'customer',
				guess: `these shifts were entered on the day before the one meant`,
				not: `the stored shifts start on the dates the customer means; only the export shows them a day early`,
				find: `The shifts themselves are on the earlier day. They were added on {changedDay} from {staff2}'s login, and each "Saturday night" cover was entered as starting at {time} on the Saturday, which is the early hours of Saturday morning, not of Sunday. The export is faithful to what's stored. An easy slip with shifts that start after midnight.`,
				tell: `The shifts in question were saved as starting at {time} on the earlier day. When someone enters "Saturday night from {time}" on the Saturday, the system reads it as the early hours of Saturday morning, a night earlier than intended. The export showed exactly what was saved.`,
				ask: `move those shifts to the following day in the rota, and have whoever plans the nights enter them on the day the shift actually starts`
			},
			{
				kind: 'lib',
				decoy: true,
				guess: `datetime-utils is putting the shifts on the wrong day`,
				not: `rota only uses datetime-utils to read the shift times typed into the form, not to work out days`
			}
		]
	},
	{
		id: 'overnight-hours',
		fits: (a) => NIGHTS.includes(a.type),
		vars: (c) => ({ nth: ordinal(+c.date.slice(8)), movedMonth: pick(c.r, ['March', 'April', 'May']), importDay: longDay(c.changed) }),
		brief: 'overnight shifts showing negative hours in the timesheet report',
		need: 'the timesheet report you downloaded and the names of the shifts that look wrong',
		subjects: ['Negative hours on timesheet', 'Overnight shift hours wrong', 'Timesheet says -16 hours??'],
		opens: [
			`The monthly timesheet report shows {staff} with minus 16 hours for her night shift on the {nth}. The shift is 22:00 to 06:00, so it should be 8. Her total for the month comes out 24 hours short, and I only noticed because she queried her payslip.`,
			`Our overnight shifts are coming out with negative hours in the timesheet. Day shifts are fine. I've had to correct the totals by hand for payroll and I'd like it fixed before the next run.`,
			`Can you explain how the timesheet works out hours for a shift that crosses midnight? We have {staff} on 22:00 to 06:00 and the report gives her a negative number for it.`
		],
		more: [
			`It's every overnight shift for {staff} and {staff2}. They're the only two who do nights.`,
			`The 22:00 starts are the problem; the rest of the report looks fine.`,
			`We moved our rota into Larkspur in {movedMonth}, if that matters. Before that we used a spreadsheet.`
		],
		first: [
			`Shifts that cross midnight should come out as positive hours, so something is off. Could you tell me how these shifts were added: by hand in the rota, from a template, or by import?`,
			`Negative hours are clearly wrong for an 8-hour shift. I'm passing this to our rota engineers with your examples.`
		],
		look: [
			`Pulled {staff}'s shifts for the month. The overnight ones are below with what's stored. The report works out hours from the start and end as stored.`,
			`Looked at the timesheet report for {biz}. Every shift with a negative figure is an overnight one; the stored records are below.`
		],
		pasteCustomer: (c) => {
			const rows: string[][] = [];
			for (let i = 0; i < int(c.r, 7, 11); i++) {
				const night = i % 3 === 1;
				rows.push([shortDay(addDays(c.date, -2 * i)), night ? c.v.staff! : c.v.staff3!, night ? '22:00–06:00' : pick(c.r, ['07:00–15:00', '14:00–22:00', '08:30–17:00']), night ? '-16.00' : pick(c.r, ['8.00', '8.50'])]);
			}
			rows.push(['', `**${c.v.staff} total**`, '', `${int(c.r, 70, 110)}.00`]);
			return table(['Date', 'Staff', 'Shift', 'Hours'], rows);
		},
		pasteEng: (c) => {
			const { r, a, v } = c;
			const via = c.truth?.kind === 'svc' ? 'quick add' : c.truth?.kind === 'customer' ? 'CSV import' : 'shift editor';
			const rows: string[][] = [];
			for (let i = 0; i < int(r, 4, 7); i++) {
				const d = addDays(c.date, -3 * i);
				const end = c.truth ? d : addDays(d, 1);
				rows.push([`sh-${hex(r, 5)}`, i % 2 ? v.staff2! : v.staff!, utc(a.zone, d, '22:00'), utc(a.zone, end, '06:00'), via, c.truth ? '-16.00' : '8.00']);
			}
			return table(['Shift', 'Staff', 'Start (stored)', 'End (stored)', 'Added via', 'Report hours'], rows);
		},
		causes: [
			{
				kind: 'svc',
				svc: 'rota',
				fixed: '2024-08-13',
				guess: `the timesheet report is subtracting the times of day without allowing for the shift ending the next day`,
				not: `these shifts weren't added with the quick-add form, and the report uses the full stored start and end, dates included`,
				find: `It's the quick-add form. Shifts added with quick add store the end on the same date as the start, even when the end time is earlier than the start, so a 22:00 to 06:00 shift is saved as ending sixteen hours before it begins. The full shift editor handles this; quick add never did. The rota screen draws the bar from the start for the length the form showed, which hides it. The report is doing the arithmetic on what's stored.`,
				tell: `Shifts added with the quick-add form were saved with the end time on the same day as the start, so an overnight shift looked to the report as if it ended before it began. The rota screen hides this, which is why it looked fine there. It's a fault on our side.`,
				fix: `make the quick-add form save the end on the next day when it is earlier than the start, and correct the shifts already saved that way`,
				around: `opening the affected shifts in the full editor and saving them again stores the right end date`
			},
			{
				kind: 'customer',
				guess: `these shifts came in with an import that had no end dates`,
				not: `none of these shifts came from an import`,
				find: `These shifts came in through the CSV import on {importDay}. The file had end times but no end dates, and the import, as its help page says, takes the start date for both when the end date column is empty. So the shifts really are stored as ending at 06:00 on the day they start. Shifts added in the rota since then are fine.`,
				tell: `The overnight shifts in question came from the CSV file imported on {importDay}. That file had no end dates, so each shift was saved as ending on the same day it started. The report is working out the hours correctly from what was saved.`,
				ask: `open those shifts and set the end date to the following day, or import the file again with the end date column filled in`,
				art: (c) => fence([`import      imp-${hex(c.r, 8)}`, `file        rota-export-${c.v.movedMonth!.toLowerCase()}.csv`, `uploaded    ${c.changed} by ${c.v.staff2Login}`, `rows        ${int(c.r, 180, 420)} read, ${int(c.r, 180, 420)} shifts created`, `columns     date, staff, start, end, role`, `end date    column missing: end date taken from start date`])
			}
		]
	},
	{
		id: 'decimal-hours',
		from: '2024-09-16',
		to: '2024-10-21',
		length: (m) => [75, 80, 100, 110].includes(m),
		sure: true,
		vars: (c) => {
			const digit = +(c.v.len!.match(/[.,](\d)/)?.[1] ?? '0');
			return { guessText: digit <= 5 ? `an hour and ${digit}0 minutes` : 'nearly two hours', end: clock(toMin(c.time) + c.mins) };
		},
		brief: 'reminder emails giving appointment lengths as decimals of an hour, which clients misread',
		need: 'a copy of one of the reminders as the client received it',
		subjects: ['Reminder says {len}', 'Confusing appointment length in reminders', 'Why does the email say {len}?'],
		opens: [
			`Since September our reminder emails give the length of the appointment as "{len}". Our {service} is {mins} minutes. Nobody thinks in tenths of an hour: one client told {staff} she had read it as {guessText}, and another asked whether we had changed the length of the session.`,
			`Small thing but it's causing questions at the desk. The reminder says the {service} takes {len}. It takes {mins} minutes, as it always has. Could it not just say {mins} minutes, or give the finishing time?`,
			`We've had several clients asking what "{len}" means in the reminder. I had to get a calculator out myself. Is this something we've set up wrongly?`
		],
		more: [
			`It's the email reminder. I don't think the text has the length in it, but I'll check.`,
			`It's only the longer appointments. The short ones say minutes, which is fine.`,
			`I haven't changed any templates. To be honest I didn't know you could.`
		],
		first: [
			`You haven't set anything up wrongly as far as I can see. The length in the reminder is filled in automatically. Let me check with our engineers how it's worked out and whether it could show minutes.`,
			`I've looked at your reminder settings and the appointment length is part of the standard email. I'll ask our team how it's written.`
		],
		look: [
			`Rendered {biz}'s reminder email for one of last week's {service} bookings. Details below.`,
			`Looked at the reminder emails {biz}'s clients got last week. One of them below, with the template it came from.`
		],
		pasteCustomer: (c) => {
			const { a, v } = c;
			const body =
				a.lang === 'de'
					? ['Hallo [name removed],', '', `wir freuen uns auf Ihren Besuch bei ${a.name}.`, '', `${c.service} bei ${v.staff}`, `${deDate(c.date)}, ${c.time} Uhr · ${v.len}`, '', `Termin ändern: über den Link unten oder unter ${v.phone}.`]
					: a.lang === 'fr'
						? ['Bonjour [name removed],', '', `nous vous attendons chez ${a.name}.`, '', `${c.service} avec ${v.staff}`, `${frDate(c.date)}, ${c.time} · ${v.len}`, '', `Pour modifier : lien ci-dessous ou ${v.phone}.`]
						: ['Hi [name removed],', '', `This is a reminder of your appointment at ${a.name}.`, '', `${c.service} with ${v.staff}`, `${longDay(c.date)}, ${c.time} · ${v.len}`, '', `If you need to change it, use the link below or call us on ${v.phone}.`];
			return body.map((line) => (line ? `> ${line}` : '>')).join('\n');
		},
		pasteEng: (c) =>
			fence([
				`template      reminder-email (default, v7)`,
				`booking       ${c.v.ref} · ${c.service} · ${c.mins} min`,
				`rendered      "${shortDay(c.date)}, ${c.time} · ${c.v.len}"`,
				`renderer      reminders 2024.09.${int(c.r, 2, 4)} · datetime-utils 0.3.0`,
				`sent          ${utc(c.a.zone, addDays(c.date, -2), c.time)} to ${c.v.client}`
			]),
		causes: [
			{
				kind: 'lib',
				svc: 'reminders',
				all: true,
				from: '2024-09-10',
				fixed: '2024-10-22',
				guess: `the length is written by datetime-utils since the September update`,
				not: `the length isn't written by datetime-utils`,
				find: `Nothing {biz} set. The template has always shown the length; what changed is how it's written. Since reminders moved to datetime-utils 0.3.0 on 10 September, the length comes from its formatDuration, which writes anything of an hour or more in hours with one decimal place, so {mins} minutes comes out as {len}. Before that, reminders wrote lengths itself in hours and minutes. Every account with appointments over an hour that aren't a whole or half hour sees figures like this.`,
				tell: `The length in the reminder is written automatically. Since an update to our reminders in September, lengths of an hour or more are written in hours with one decimal place, so your {mins}-minute {service} shows as {len}. It's accurate, but we agree it isn't how anyone reads a time.`,
				fix: `show the start and end time in the reminder email instead of the length`,
				around: `nothing on your side needs changing; if a client asks, the session is the same {mins} minutes as always, ending at {end}`
			}
		]
	},
	{
		id: 'local-labels',
		from: '2024-09-16',
		fits: (a) => a.lang !== 'en',
		length: (m) => m >= 60,
		vars: (c) => ({ langName: c.a.lang === 'de' ? 'German' : 'French', lenEn: formatLength(c.mins, 'en') }),
		brief: "SMS reminders writing appointment lengths the English way for a {langName}-speaking business",
		need: "a screenshot of one of the texts as a client received it",
		subjects: ['Reminder texts in English format', 'Wrong format in SMS', 'Text says {lenEn}'],
		opens: [
			`Our reminder texts write the length of the appointment as "{lenEn}". We're a {langName}-speaking business and our clients expect "{len}". It looks careless, as if the text was written by someone abroad. The rest of the text is in {langName}.`,
			`Since some time in September, the length in our SMS reminders comes out like "{lenEn}" instead of "{len}". {staff} says a client asked her whether we'd been taken over by an English company.`,
			`Small thing: the appointment length in the reminder text has an English decimal point and an English unit. The rest of the text is fine. Can that be put right?`
		],
		more: [
			`I don't know about the emails, I've only seen the texts.`,
			`It's every text I've seen since we came back from the summer break.`,
			`Our settings are all in {langName} as far as I know.`
		],
		first: [
			`The length in texts is written according to the language set for your clients, so I'll check that first and then ask our reminders team.`,
			`Let me look at your branch's language settings and what the texts are being sent with.`
		],
		look: [
			`Rendered the last few reminders for {biz} with the language each one was written in.`,
			`Pulled the render records for {biz}'s reminders this week.`
		],
		pasteCustomer: (c) => `[Screenshot forwarded by ${c.v.owner}: SMS from ${c.a.name.toUpperCase().slice(0, 11)}]\n\n> ${sms(c, c.v.lenEn)}`,
		pasteEng: (c) => {
			const { r, a } = c;
			const lines: string[] = [];
			for (let i = 0; i < int(r, 4, 7); i++) {
				const at = `${addDays(c.date, -1 - i)}T${clock(toMin('18:00') - offset(a.zone, c.date) * 60)}:${pad(int(r, 0, 59))}Z`;
				const ref = bookingRef(r);
				const smsLang = c.truth ? 'en' : a.lang;
				const mailLang = c.truth?.kind === 'customer' ? 'en' : a.lang;
				lines.push(`${at}  ${ref}  sms    rendered  lang=${smsLang}  length="${formatLength(c.mins, smsLang)}"`);
				lines.push(`${at}  ${ref}  email  rendered  lang=${mailLang}  length="${formatLength(c.mins, mailLang)}"`);
			}
			return fence(lines);
		},
		causes: [
			{
				kind: 'svc',
				svc: 'reminders',
				all: true,
				from: '2024-09-10',
				fixed: '2024-10-15',
				guess: `the SMS path isn't passing the branch's language`,
				not: `texts have been written in the branch's language since the reminders change on {fixedDay}`,
				find: `The SMS path in reminders doesn't pass the branch's language when it asks for the length, so every text gets the English way of writing it, while the emails, which do pass it, come out right. It's been like this since reminders moved to datetime-utils for lengths on 10 September. It affects every account whose clients get texts in German or French.`,
				tell: `Our reminder texts weren't being told your branch's language when they wrote the appointment length, so they used the English format. Emails weren't affected. That's a fault on our side, and it affects every {langName}-speaking customer, not just you.`,
				fix: `pass each branch's language to the SMS reminders as the emails already do`,
				around: `the rest of the text is unaffected, and the emails show the length correctly`
			},
			{
				kind: 'customer',
				guess: `the branch's client language is set to English`,
				not: `the branch's client language is {langName}`,
				find: `The branch's "client language" setting is English. It was changed from {langName} on {changedDay} from {staff2}'s login. Everything we send to clients follows that setting, texts and emails alike, so we're writing lengths the English way because we've been told to. The fixed wording of their custom SMS template is in {langName}, which is why the rest looks right.`,
				tell: `Your branch's client language, which decides the language of everything we send to your clients, was changed to English on {changedDay}. The wording of your texts is your own template, which is in {langName}, but the parts we fill in, like the length, follow the client language setting.`,
				ask: `set Settings > Branches > {city} > Client language back to {langName}`,
				art: (c) => audit(c, `Branches › ${c.a.city} › Client language`, `${c.v.langName} → English`)
			}
		]
	},
	{
		id: 'outlook-feed',
		vars: (c) => {
			const shift = offset(c.wrongZone, c.date) - offset(c.a.zone, c.date);
			const label = (zone: string) => (zone === 'Europe/London' || zone === 'Europe/Dublin' ? '(UTC+00:00) Dublin, Edinburgh, Lisbon, London' : '(UTC+01:00) Brussels, Copenhagen, Madrid, Paris');
			return { outlook: clock(toMin(c.time) + shift * 60), wrongLabel: label(c.wrongZone), zoneLabel: label(c.a.zone).replace('Brussels, Copenhagen, Madrid, Paris', c.a.zone === 'Europe/Paris' || c.a.zone === 'Europe/Brussels' ? 'Brussels, Copenhagen, Madrid, Paris' : 'Amsterdam, Berlin, Bern, Rome, Stockholm, Vienna'), movedAt: clock(int(c.r, 8 * 60, 10 * 60)) };
		},
		brief: "entries in a staff member's Outlook showing an hour out from Larkspur through the calendar link",
		need: 'a screenshot of one entry in Outlook next to the same one in Larkspur, and which computer it was on',
		subjects: ['Outlook calendar out by an hour', 'Calendar link times wrong in Outlook', 'Staff calendar sync problem'],
		opens: [
			`Our staff use the calendar link so their Larkspur diary shows in Outlook. {staff} says entries in Outlook are an hour away from where they are in Larkspur. She nearly started with a client at the wrong time on {weekday} because she went by Outlook.`,
			`There's an hour's difference between Outlook and Larkspur on {staff}'s calendar. On {day} she had {client} at {time} in Larkspur and Outlook showed {outlook}. The Larkspur app itself is right as far as we know.`,
			`Since we added the calendar link to Outlook, things sit an hour out from where they belong. Do other customers have this? I'm not sure if it's something on our computers.`
		],
		more: [
			`{staff} only looks at it on the office computer, so I can't say whether her phone would be different.`,
			`It's only {staff} who has complained. The others might not have noticed.`,
			`I don't know what else to tell you. It's Outlook on Windows, the normal one.`
		],
		first: [
			`The calendar link sends each entry with its time zone, and Outlook then shows it in its own time, so the first thing to compare is the time zone Outlook is using. I'll also ask an engineer to look at what your link sends.`,
			`Could you tell me whether it's every entry that's an hour out, or only some, such as recently moved appointments? I'm passing it to our calendar engineers in the meantime.`
		],
		look: [
			`Fetched {staff}'s calendar link for {biz}. Relevant entries below.`,
			`Pulled what the link served for the week of {dayShort}. Entries around the time the customer mentions are below.`
		],
		pasteCustomer: (c) => `[Screenshot: Outlook, ${c.v.staff}'s calendar, ${c.v.dayShort}. "${c.v.client} – ${c.service}" shown ${c.v.outlook}–${clock(toMin(c.v.outlook!) + c.mins)}. Status bar: "Larkspur – ${c.v.staff}, updated ${pick(c.r, ['2', '3', '4', '6'])} hours ago"]`,
		pasteEng: (c) => {
			const { r, v } = c;
			const starts = [c.time];
			for (let i = int(r, 2, 5); i > 0; i--) starts.push(clock(int(r, 9, 16) * 60 + pick(r, [0, 15, 30, 45])));
			const events = [...new Set(starts)].sort().map((t) => t === c.time ? vevent(c, `bk-${hex(r, 10)}`, icsTime(c.date, t), icsTime(c.date, clock(toMin(t) + c.mins)), `${v.client} – ${c.service}`) : vevent(c, `bk-${hex(r, 10)}`, icsTime(c.date, t), icsTime(c.date, clock(toMin(t) + 30)), `${initials(r)} – ${pick(r, c.a.services)[0]}`));
			return fence(['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Larkspur//calendar 3.4//EN', `X-WR-CALNAME:Larkspur – ${v.staff}`, ...events, 'END:VCALENDAR']);
		},
		causes: [
			{
				kind: 'customer',
				guess: `Outlook on that computer is set to a different time zone`,
				not: `Outlook on {staff}'s computer is set to {zoneCity} time, as {owner} confirmed`,
				find: `The link is fine: every entry carries TZID={zone} and the right time. {agent} had {owner} check Outlook's settings on {staff}'s computer: it's set to {wrongLabel}. Windows itself is on the right time, so the clock in the corner looks fine, but Outlook has its own time zone setting and shows everything converted into that.`,
				tell: `The calendar link sends the right times, labelled with your time zone. Outlook on {staff}'s computer has its own time zone setting, separate from Windows, and it's set to {wrongLabel}, so Outlook converts every entry into that.`,
				ask: `in Outlook on {staff}'s computer, go to File > Options > Calendar > Time zones and choose {zoneLabel}`
			},
			{
				kind: 'none',
				guess: `the entries were moved and Outlook hadn't fetched the link again yet`,
				not: `none of the entries had been moved before {staff} looked`,
				find: `The link is right and so is Outlook's time zone. The entries {staff} mentioned were moved in Larkspur that morning: reception moved {client}'s appointment from {outlook} to {time} at {movedAt}. Outlook only fetches a subscribed calendar every few hours, so for a while it showed the old time; by the afternoon it had caught up. Every case the customer listed is a moved appointment.`,
				tell: `The appointments that looked wrong in Outlook had all been moved in Larkspur earlier the same day, by an hour. Outlook only checks a subscribed calendar every few hours, so for a while it still showed the old times. Nothing was wrong with what we sent, and Outlook catches up on its own; right-clicking the calendar and choosing "Update" makes it check straight away.`
			},
			{
				kind: 'svc',
				svc: 'calendar sync',
				decoy: true,
				guess: `the calendar link is sending the wrong times`,
				not: `the link sends every entry with TZID={zone} and the right time`
			}
		]
	},
	{
		id: 'google-delay',
		vars: (c) => ({ stopped: longDay(addDays(c.date, -int(c.r, 4, 12))) }),
		brief: "changes made in Larkspur taking hours, or longer, to reach a staff member's Google calendar",
		need: "the name of the staff member and one change that didn't come through, with when it was made",
		subjects: ['Google calendar not updating', 'Changes take hours to show in Google', 'Moved appointment still at old time in Google'],
		opens: [
			`When we move an appointment in Larkspur it can take half a day to change in {staff}'s Google calendar. On {weekday} she drove in for a {time} client who had been moved to the afternoon two hours earlier. Her Google calendar still had the old time.`,
			`Our Google calendars are not keeping up with Larkspur. New bookings appear eventually, I think, but moves and cancellations lag behind, sometimes until the next day. Is there a way to make it instant?`,
			`{staff} says new bookings and changes are not appearing in her Google calendar, or only very late. Can you check whether something has broken?`
		],
		more: [
			`We set it up a couple of years ago. I honestly don't remember whether we used the link or the "connect Google" button.`,
			`It's worst on busy days when reception moves things around a lot.`,
			`{staff} uses Google Calendar on her phone. I don't know if that matters.`
		],
		first: [
			`There are two ways to get Larkspur into Google: the subscription link, which Google fetches on its own schedule, and the two-way connection, which updates within a minute or so. I'll check which one {staff} has.`,
			`I'm asking an engineer to look at how {staff}'s calendar is connected and when it last updated.`
		],
		look: [
			`Checked the calendar connections for {biz}'s staff. {staff}'s details below.`,
			`Looking at {staff}'s calendar setup on {biz}. Fetches and connection state below.`
		],
		pasteCustomer: (c) => `[Screenshot from ${c.v.staff}'s phone, Google Calendar, ${c.v.dayShort}: "${c.v.client} – ${c.service}" at ${c.time}. Sent with a note: "Moved to ${c.v.late} in Larkspur at ${clock(toMin(c.time) - 120)}, still showing here at ${c.time}"]`,
		pasteEng: (c) => {
			const { r, a } = c;
			if (c.truth?.kind === 'customer') {
				const lines: string[] = [];
				const feed = hex(r, 16);
				let ms = toMs(addDays(c.date, -4)) + int(r, 0, 20) * 3_600_000;
				for (let i = 0; i < int(r, 9, 14); i++) {
					const d = new Date(ms);
					lines.push(`${toDate(ms)}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}Z  GET /cal/${feed}.ics  200  ${int(r, 18, 64)} kB  "Google-Calendar-Importer"`);
					ms += int(r, 8 * 60, 22 * 60) * 60_000 + int(r, 0, 59) * 1000;
				}
				return fence([`connection   subscription link (read-only)`, `owner        ${c.v.staffLogin}`, '', ...lines]);
			}
			return fence([
				`connection   two-way, Google`,
				`owner        ${c.v.staffLogin}`,
				`connected    ${a.since + 1}-0${int(r, 1, 9)}-${pad(int(r, 1, 28))}`,
				c.truth ? `last push    ${addDays(c.date, -1)}T0${int(r, 6, 9)}:${pad(int(r, 0, 59))}:00Z (before access was withdrawn)` : `last push    ${c.date}T${pad(int(r, 9, 16))}:${pad(int(r, 0, 59))}:00Z`,
				c.truth ? `google       access withdrawn by Google since ${c.v.stopped}` : 'google       ok',
				c.truth ? 'pending      ' + int(r, 30, 140) + ' changes not pushed' : 'pending      0',
				'staff told   no'
			]);
		},
		causes: [
			{
				kind: 'customer',
				guess: `{staff} is on the subscription link, which Google only fetches every so often`,
				not: `{staff} is on the two-way connection, not the subscription link`,
				find: `{staff}'s Google calendar uses the subscription link, not the two-way connection. Our side updates what the link serves straight away, but Google decides when to fetch it again, and the log shows gaps of eight to twenty hours. Nothing we can speed up from here. The two-way connection pushes changes as they happen.`,
				tell: `{staff}'s Google calendar is subscribed to your Larkspur calendar link. Google only fetches a subscribed link when it chooses to, often only every eight to twenty hours, so changes reach it late. That's Google's schedule, and it can't be sped up from our side.`,
				around: `if {staff} removes the subscription and uses the two-way connection under Profile > Calendar instead, changes reach her Google calendar within a minute or two`
			},
			{
				kind: 'svc',
				svc: 'calendar sync',
				planned: '2024-12-02',
				guess: `the two-way connection for {staff} has stopped`,
				not: `{staff}'s connection is healthy and pushed a change a few minutes ago`,
				find: `{staff}'s two-way Google connection stopped on {stopped}. Google withdrew our access, which happens when someone changes their Google password or removes app access, and from then on we've had nothing to push to. We don't tell anyone when this happens: her profile still shows the connection as active. That part is ours to fix.`,
				tell: `{staff}'s connection to Google stopped on {stopped}, most likely after a change on the Google side such as a new password. Larkspur should have warned you when that happened and didn't, which is our fault.`,
				fix: `warn the staff member and the account owner by email when a Google connection stops, and show it in their profile`,
				around: `{staff} can reconnect under Profile > Calendar, which brings everything up to date at once`
			}
		]
	},
	{
		id: 'closure-day',
		max: 4,
		from: '2024-06-27',
		to: '2024-09-23',
		fits: (a) => BASE[a.zone] === 1,
		sure: true,
		appt: (opened, r) => addDays(opened, int(r, -6, 10)),
		vars: (c) => ({ closure: pick(c.r, ['Staff training day', 'Closed for refurbishment', 'Team day', 'Summer closure', 'Closed: stocktake']) }),
		brief: 'all-day closures showing a day early in the calendar link',
		need: 'the closure that showed on the wrong day and where you saw it',
		subjects: ['Closure showing on the wrong day', 'Holiday a day early in our calendars', 'All-day block on the wrong date'],
		opens: [
			`We're closed for "{closure}" on {day} and put it in Larkspur as a closure. In everyone's phone calendar it appears on {eveLong}. {staff2} rang me on her day off to ask why she wasn't booked, because her calendar said we were closed.`,
			`Our closures are showing a day early in the calendar link. In Larkspur, {day} is blocked. In Google and Outlook, the block is on the day before. Appointments themselves look fine.`,
			`Small thing but confusing for the team: whole-day closures land on the wrong day when they come through to our calendars. Timed appointments are fine.`
		],
		more: [
			`It's the all-day closures only. Bookings are where they should be.`,
			`Everyone has the same, iPhone and Android, Google and Outlook.`,
			`We only started putting closures in Larkspur this summer. Before that we wrote them on the board in the staff room.`
		],
		first: [
			`An all-day entry should land on exactly the date you chose, whatever anyone's time zone, so this looks like something in what we send. I'm passing it to our calendar engineers.`,
			`Sorry for the confusion. I've checked the closure in your account and it's on {day}, so I'll ask our engineers to look at how it's sent to calendars.`
		],
		look: [
			`Fetched the calendar link for {biz}. The closure as we send it is below.`,
			`Here's the closure entry from {staff2}'s calendar link on {biz}.`
		],
		pasteCustomer: (c) => `[Screenshot from ${c.v.staff2}'s phone calendar, week of ${c.v.dayShort}: "${c.v.closure}" shown as an all-day entry on ${c.v.eveShort}; ${c.v.dayShort} shows her usual bookings]`,
		pasteEng: (c) =>
			fence([
				'BEGIN:VEVENT',
				`UID:closure-${hex(c.r, 10)}@larkspur.app`,
				`DTSTAMP:${c.opened.replace(/-/g, '')}T0${int(c.r, 5, 9)}${pad(int(c.r, 0, 59))}00Z`,
				`DTSTART;VALUE=DATE:${addDays(c.date, -1).replace(/-/g, '')}`,
				`DTEND;VALUE=DATE:${c.date.replace(/-/g, '')}`,
				`SUMMARY:${c.v.closure}`,
				'TRANSP:OPAQUE',
				'END:VEVENT'
			]),
		causes: [
			{
				kind: 'svc',
				svc: 'calendar sync',
				all: true,
				from: '2024-06-25',
				fixed: '2024-09-24',
				guess: `the calendar link is writing the closure's date from its UTC start`,
				not: `the link has written closures with their own date since the change on {fixedDay}`,
				find: `Calendar sync takes the start of the closure, which is stored as local midnight, converts it to UTC, and writes the date part of that as the all-day date. East of UTC, local midnight is still the previous day in UTC, so every closure goes out a day early. It's been doing this since closures were added to the calendar link on 25 June. Every branch in central Europe is affected, and UK and Irish branches in summer time.`,
				tell: `Our calendar link was working out the date of all-day closures in UTC, and for a branch in {city} that is still the previous day at midnight. So every closure went to calendars a day early. It's our fault and it affects other customers in your time zone too.`,
				fix: `write each closure's own date in the calendar link instead of converting it to UTC first`,
				around: `the closures are right in Larkspur itself, so the staff app is the place to check until then`
			},
			{
				kind: 'lib',
				decoy: true,
				guess: `datetime-utils is giving the wrong date`,
				not: `calendar sync doesn't use datetime-utils for the link; it builds the dates itself`
			}
		]
	},
	{
		id: 'excel-dates',
		appt: (opened, r) => {
			let d = addDays(opened, -int(r, 8, 30));
			while (+d.slice(8) > 12 || +d.slice(8) === +d.slice(5, 7) || weekday(d) === 0) d = addDays(d, -1);
			return d;
		},
		vars: (c) => {
			const [y, m, d] = c.date.split('-');
			return { swapped: `${+m!} ${MONTHS[+d! - 1]} ${y}`, regionName: c.a.lang === 'de' ? 'German (Germany)' : c.a.lang === 'fr' ? 'French (France)' : 'English (United Kingdom)', exportName: CLASSES.includes(c.a.type) ? 'classes' : 'bookings' };
		},
		brief: 'CSV exports opening in Excel with day and month swapped',
		need: 'which export it is and the file as you downloaded it, before opening it in Excel',
		subjects: ['Export dates wrong in Excel', 'CSV dates are American?', 'Day and month swapped in export'],
		opens: [
			`When I open the export in Excel, some dates come out with the day and month swapped and others don't convert at all. {dayShort} appears as {swapped}, and anything after the 12th stays as text and won't sort. Our accountant needs this every month.`,
			`The CSV download is a mess in Excel. The first twelve days of each month have day and month the wrong way round and the rest won't sort. I can send a few rows if that helps.`,
			`Our part-time bookkeeper says the dates in the export are American. Is there a setting for that?`
		],
		more: [
			`It's the export from the reports page. I usually just double-click the file.`,
			`It used to be fine, I think. Or maybe I didn't notice.`,
			`I've only tried it on the office computer.`
		],
		first: [
			`CSV files don't say what date format they use, so Excel guesses from your computer's region. Before anything else, could you tell me which export it is (bookings, clients, classes or payments)?`,
			`I'll ask an engineer to look at what the export writes, so we know whether it's the file or Excel.`
		],
		look: [
			`Downloaded the same export for {biz} for last month. First lines below, as written by us, before Excel touches them.`,
			`Here's the start of the raw file the reports page produced for {biz}.`
		],
		pasteCustomer: (c) => {
			const { r } = c;
			const rows: string[][] = [];
			for (let i = 0, d = c.date; i < int(r, 6, 10); i++, d = addDays(d, int(r, 1, 4))) {
				const [y, m, day] = d.split('-');
				rows.push([`${day}/${m}/${y}`, +day! <= 12 ? `${+m!} ${MONTHS[+day! - 1]} ${y}` : `${day}/${m}/${y} (left as text)`, pick(r, ['09:00', '10:30', '14:15', '16:00']), initials(r), pick(r, c.a.services)[0]]);
			}
			return table(['In the file', 'Excel shows', 'Time', 'Client', 'Service'], rows);
		},
		pasteEng: (c) => {
			const { r } = c;
			const monthFirst = c.truth?.kind === 'svc';
			const lines = [`${c.v.exportName === 'classes' ? 'date,time,class,booked,attended,instructor' : 'date,time,client,service,staff,status'}`];
			for (let i = 0, day = c.date; i < int(r, 8, 12); i++, day = addDays(day, int(r, 0, 2))) {
				const [y, m, d] = day.split('-');
				const date = monthFirst ? `${m}/${d}/${y}` : `${d}/${m}/${y}`;
				lines.push(c.v.exportName === 'classes' ? `${date},${pick(r, ['09:30', '12:15', '18:00', '19:30'])},${pick(r, c.a.services)[0]},${int(r, 4, 14)},${int(r, 3, 12)},${pick(r, c.a.staff)}` : `${date},${pick(r, ['09:00', '10:30', '14:15', '16:00'])},${initials(r)},${pick(r, c.a.services)[0]},${pick(r, c.a.staff)},${pick(r, ['attended', 'attended', 'attended', 'cancelled', 'no show'])}`);
			}
			return fence([`GET /reports/export/${c.v.exportName}?from=${addDays(c.date, -10)}&to=${addDays(c.date, 20)}  200  text/csv`, '', ...lines]);
		},
		causes: [
			{
				kind: 'customer',
				guess: `Excel on that computer is set to a US region and reads the dates month first`,
				not: `the office computer is set to {regionName}, as the customer confirmed`,
				find: `The file is fine: dates are written day first, as the account's region says. {agent} had {owner} check the computer's settings: Windows on it is set to English (United States), so Excel reads 05/11/2024 as 11 May and gives up on anything where the "month" would be over 12.`,
				tell: `The export writes dates day first, which is right for you. Excel doesn't know that, so it reads them according to the computer's region, and that computer is set to the United States, where the month comes first.`,
				around: `you can either set the region to {regionName} in the Windows settings, or open the file through Data > From Text/CSV in Excel and choose the date order there`
			},
			{
				kind: 'svc',
				svc: 'reports',
				from: '2024-05-14',
				fixed: '2024-07-23',
				fits: (a) => CLASSES.includes(a.type),
				guess: `the export itself is writing dates month first`,
				not: `the export writes dates day first, as the account's region says`,
				find: `The classes export, and only that one, writes dates month first whatever the account's region. It was rebuilt on 14 May and the date format was left at the template's default. The bookings and payments exports are fine. {biz}'s bookkeeper uses the classes export for attendance.`,
				tell: `The classes export, which is the one you're using, has been writing dates month first since it was rebuilt in May, whatever your account's region. The other exports are correct.`,
				fix: `make the classes export follow the account's region like the others`,
				around: `the bookings export has the same classes in it with the dates the right way round`
			}
		]
	},
	{
		id: 'series-shift',
		from: '2024-10-28',
		to: '2024-11-15',
		fits: (a) => CLASSES.includes(a.type),
		appt: (opened, r) => {
			const d = addDays(opened, int(r, -3, 6));
			return d < '2024-10-28' ? addDays('2024-10-28', int(r, 0, 4)) : d;
		},
		time: (c) => pick(c.r, ['17:30', '18:00', '18:30', '19:00', '19:30']),
		changed: ['2024-10-28', '2024-10-29', '2024-10-30', '2024-10-31'],
		vars: (c) => ({ early: clock(toMin(c.time) - 60), seriesCreated: longDay(`2024-0${int(c.r, 2, 4)}-${pad(int(c.r, 1, 28))}`) }),
		brief: 'a weekly class showing an hour early from the week after the clock change',
		need: 'the name of the class and one date where it shows at the wrong time',
		subjects: ['Weekly class moved by itself', 'Class time wrong since the clocks changed', 'Recurring class an hour out'],
		opens: [
			`Our {weekday} {time} {service} shows at {early} in the timetable from the week after the clocks went back. Everything up to the end of October is right. Clients have started booking it at {early}, or think they have, and the instructor is confused.`,
			`The recurring {service} class has jumped an hour for every week from November on. We haven't changed anything. Our other classes look fine.`,
			`Since the clock change, one of our weekly classes sits an hour early on the booking page and in the timetable. Can you fix it on your side? I don't want to recreate it and lose the bookings.`
		],
		more: [
			`It's only that one class. We set it up in the spring, I think, when we started using the timetable properly.`,
			`The instructor, {staff}, says she hasn't touched it.`,
			`Clients who booked before the change have the old time in their confirmations, which makes it worse.`
		],
		first: [
			`A class that moves by exactly an hour at the clock change usually means its times were saved in a way that doesn't follow the clocks. I'm asking our engineers to look at how this series is stored.`,
			`Sorry for the confusion. I've checked the timetable and I can see the {service} class at {early} from November. I'll get an engineer to look at why.`
		],
		look: [
			`Pulled the series for {biz}'s {service} class. Occurrences either side of 27 October below.`,
			`Looking at the stored occurrences of the {weekday} {service} class.`
		],
		pasteCustomer: (c) => table(['Week of', 'Class', 'Time on the timetable', 'Booked'], [-2, -1, 0, 1, 2].map((w) => { const d = addDays(c.date, 7 * w); return [shortDay(d), c.service, d >= '2024-10-27' ? c.v.early! : c.time, `${int(c.r, 4, 14)} of ${int(c.r, 14, 20)}`]; })),
		pasteEng: (c) => {
			const { a, v } = c;
			const rows: string[][] = [];
			for (let i = -4; i <= 3; i++) {
				const d = addDays(c.date, 7 * i);
				const late = d >= '2024-10-27';
				const kind = c.truth?.kind;
				const shown = kind && late && (kind === 'svc' || d >= c.changed) ? v.early! : c.time;
				const stored = kind === 'svc' ? utc(a.zone, d < '2024-10-27' ? d : d, clock(toMin(c.time) - (late ? 60 : 0))) : utc(a.zone, d, shown);
				const edited = kind === 'customer' && late && d >= c.changed ? `${c.changed}, ${v.staff2Login}, this and following` : '–';
				rows.push([shortDay(d), stored, `${shown}`, edited]);
			}
			return table(['Date', 'Start (stored)', `Shown, ${zoneCity(a.zone)} time`, 'Last edit'], rows);
		},
		causes: [
			{
				kind: 'svc',
				svc: 'booking',
				fixed: '2024-11-12',
				guess: `this series was saved with fixed UTC times that don't follow the clocks`,
				not: `this series was created with the current repeat form, which stores the local time and the zone`,
				find: `This series was created on {seriesCreated} with the old "repeat weekly" form, which saved every occurrence as a fixed UTC time worked out with the summer offset. The current form saves the local time and the branch's zone and has no such problem. So from 27 October every occurrence of this series is an hour early on the wall clock. There are about 300 series created with the old form before it was replaced in May.`,
				tell: `Your class was set up with an older version of our repeat form, which saved each week's time in a way that doesn't follow the clocks. When they went back on 27 October, every later week ended up an hour early. Classes set up since May aren't affected.`,
				fix: `convert every series made with the old repeat form to local times, keeping their bookings`,
				around: `you can move individual weeks back to {time} by hand, and the bookings move with them`
			},
			{
				kind: 'customer',
				guess: `someone edited this and all following occurrences`,
				not: `the occurrences after 27 October have never been edited`,
				find: `Every occurrence from {changedShort} on was moved to {early} in one edit, "this and all following", on {changedDay}, from {staff2}'s login. Before that date they're all at {time}. It looks as if someone meant to move one week and picked the wrong option.`,
				tell: `Our history shows that on {changedDay} someone using {staff2}'s login changed the class time to {early} and chose "this and all following" occurrences. That's why every week from then on moved; the clock change wasn't the cause.`,
				ask: `open the first moved week, set the time back to {time} and choose "this and all following" again, which puts every later week back without losing bookings`
			}
		]
	},
	{
		id: 'leap-recall',
		max: 3,
		from: '2024-09-16',
		fits: (a) => ['dental', 'vet', 'physio', 'osteo'].includes(a.type),
		sure: true,
		vars: (c) => ({ n: String(int(c.r, 4, 11)), recallWord: c.a.type === 'vet' ? 'booster' : 'recall' }),
		brief: 'patients seen on 29 February due for recall on 1 March 2025 instead of 28 February',
		need: 'one patient from 29 February whose recall date you think is wrong',
		subjects: ['Leap day recall dates', 'Recall list question', 'Patients from 29 February on the wrong recall month'],
		opens: [
			`I was setting up our {recallWord} letters for next February and noticed that the patients we saw on 29 February this year are due on 1 March 2025, not 28 February. For most of them it doesn't matter, but our letters go out by month, so they'll get February's letter for a March date. Is that on purpose?`,
			`Odd question. Patients who came in on leap day are on the {recallWord} list for 1 March next year. We'd prefer the 28th, because that's still "a year later" in the way our clients understand it. Can that be changed?`,
			`Our 12-month {recallWord} list puts the {n} patients from 29 February on 1 March 2025. A colleague says that's just how dates work and another says it's a bug. Which is it?`
		],
		more: [
			`There are {n} of them, all from that one day.`,
			`We're not in a rush; the letters for February go out in January.`,
			`I've checked the {recallWord} setting and it says 12 months.`
		],
		first: [
			`Ha, I hadn't seen this one before. There's no 29 February next year, so the system has to pick one side or the other. I'll ask the booking team which side it picks and why.`,
			`Interesting one. I'll check with engineering whether that's deliberate.`
		],
		look: [
			`{recallWord} dates for {biz}'s patients seen on 29 February below.`
		],
		pasteCustomer: (c) => `Copied from the ${c.v.recallWord} list, February to March 2025:\n\n` + table(['Patient', 'Last visit', 'Due'], Array.from({ length: int(c.r, 5, 8) }, (_, i) => (i % 3 === 1 ? [initials(c.r), '29/02/2024', '01/03/2025'] : [initials(c.r), `${pad(int(c.r, 20, 28))}/02/2024`, `${pad(int(c.r, 20, 28))}/02/2025`]))),
		pasteEng: (c) => {
			const rows: string[][] = [];
			for (let i = 0; i < +c.v.n!; i++) rows.push([initials(c.r), '2024-02-29', pick(c.r, c.a.services)[0], '12 months', '2025-03-01']);
			return table(['Patient', 'Visit', 'Treatment', 'Rule', 'Due'], rows);
		},
		causes: [
			{
				kind: 'svc',
				svc: 'booking',
				all: true,
				planned: '2025-01-13',
				guess: `the due date adds twelve months and rolls over into March when the day doesn't exist`,
				not: `the due date for a leap-day visit is set to 28 February`,
				find: `The due date is the visit date plus twelve months, done with plain date arithmetic, and 29 February 2025 doesn't exist, so it rolls over to 1 March. Nobody decided that; it's just what the arithmetic does. A practice would expect the last day of February. Only patients seen on 29 February are affected, once every four years.`,
				tell: `Next year has no 29 February, and the way our due dates are worked out rolls such dates over into March. It wasn't a deliberate choice, and we agree that 28 February is what a practice would expect.`,
				fix: `make due dates fall on the last day of the month when the same day doesn't exist`,
				around: `you can move those {n} due dates to 28 February by hand on the list, and they'll stay where you put them`
			},
			{
				kind: 'customer',
				decoy: true,
				guess: `the interval for these treatments is set in weeks rather than months`,
				not: `the interval is "12 months" for every treatment on the list`
			}
		]
	},
	{
		id: 'invoice-decimals',
		fits: (a) => ['tutoring', 'counselling', 'music', 'language', 'driving', 'massage', 'physio'].includes(a.type),
		length: (m) => m % 6 !== 0,
		vars: (c) => {
			// Rounded up to six-minute steps when that is the account's setting, otherwise to one decimal on the invoice.
			const dec = c.truth?.kind === 'customer' ? Math.ceil(c.mins / 6) / 10 : Math.round((c.mins / 60) * 10) / 10;
			return { dec: String(dec), decMins: String(Math.round(dec * 60)), exact: (c.mins / 60).toFixed(2), invoice: `INV-${int(c.r, 24000, 24999)}`, rate: String(int(c.r, 38, 85)) };
		},
		brief: 'invoices showing session hours as decimals that clients and the accountant query',
		need: 'the number of one invoice where the figures look wrong',
		subjects: ['Hours on invoices', 'Invoice says {dec} hours', 'Question about invoice rounding'],
		opens: [
			`Our invoices show {mins}-minute {service} sessions as {dec} hours. A client queried it because {dec} hours is {decMins} minutes and she thought we were charging for time she didn't have. I couldn't explain it.`,
			`The hours on our invoices look strange. Every {mins}-minute {service} is {dec} h. Our accountant wants to know where the difference comes from before she signs off the quarter.`,
			`Can you explain how hours on invoices are worked out? Our {service} is {mins} minutes and the invoice says {dec} hours.`
		],
		more: [
			`I haven't changed any invoice settings in ages, as far as I remember.`,
			`I'd have to go through them one by one to see whether the totals are right.`,
			`We bill by the hour for some clients and by the session for others, if that matters.`
		],
		first: [
			`Hours on invoices can be rounded according to your invoicing settings, so I'll check those first and then ask the invoicing team to look at an example.`,
			`I can see why that raises questions. Let me get an engineer to look at how those hours were worked out on your invoices.`
		],
		look: [
			`Pulled invoice {invoice} for {biz}. Lines and total below.`,
			`Here's {invoice}, one of {biz}'s invoices from last month, as issued.`
		],
		pasteCustomer: (c) => `From the PDF of ${c.v.invoice}:\n\n> ${dayMonth(c.date)} · ${c.service} · ${c.v.dec} h × ${c.v.rate}.00\n> ${dayMonth(addDays(c.date, -7))} · ${c.service} · ${c.v.dec} h × ${c.v.rate}.00`,
		pasteEng: (c) => {
			const { r, v } = c;
			const rate = +v.rate!;
			const hours = c.truth?.kind === 'customer' ? +v.dec! : c.mins / 60;
			const shown = c.truth ? v.dec! : v.exact!;
			const rows: string[][] = [];
			let total = 0;
			for (let i = 0; i < int(r, 5, 8); i++) {
				const amount = hours * rate;
				total += amount;
				rows.push([dayMonth(addDays(c.date, -7 * i)), c.service, `${c.mins} min`, shown, rate.toFixed(2), amount.toFixed(2)]);
			}
			rows.push(['', '**Total**', '', '', '', `**${total.toFixed(2)}**`]);
			return `${v.invoice} · ${initials(r)} · issued ${c.date}\n\n${table(['Date', 'Service', 'Length', 'Hours', 'Rate', 'Amount'], rows)}`;
		},
		causes: [
			{
				kind: 'customer',
				guess: `the account rounds billable time to six-minute steps`,
				not: `the account bills exact minutes, with no rounding step set`,
				find: `It's the account's billing step. Under Settings > Invoicing, {biz} has "round each session up to the next 6 minutes", which makes {mins} minutes into {dec} hours and charges for it. It was set on {changedDay} from {staff2}'s login. The invoice shows exactly what was charged.`,
				tell: `Your invoicing settings round each session up to the next six minutes, the way some professions bill. That turns a {mins}-minute session into {dec} hours, and the invoice charges for that. The setting was switched on on {changedDay}. Invoices already sent keep the rounded figures; you can issue credit notes for the difference if you want to.`,
				ask: `under Settings > Invoicing > Billable time, choose "exact minutes" (or 15-minute steps, if that's what you'd prefer); new invoices will follow it`,
				art: (c) => audit(c, 'Invoicing › Billable time', 'exact minutes → round up to 6 min')
			},
			{
				kind: 'svc',
				svc: 'invoicing',
				all: true,
				from: '2024-06-18',
				fixed: '2024-08-06',
				guess: `the invoice rounds the hours to one decimal while the amounts use the exact time`,
				not: `invoices have shown hours to two decimals since the invoicing change on {fixedDay}`,
				find: `The invoice rounds each line's hours to one decimal place, but the amounts and the total are worked out from the exact minutes. So {mins} minutes shows as {dec} h while the amount is for {exact} h, and "hours times rate" never matches the amount on the line. This came in with the new invoice layout on 18 June. Clients are charged correctly; the hours column is misleading.`,
				tell: `Since our new invoice layout in June, the hours column has been rounded to one decimal place, while the amounts were always worked out from the exact minutes. So your clients were charged correctly for {mins} minutes, but the hours shown don't match the amounts. That's on our side.`,
				fix: `show hours on invoices to two decimal places so that they match the amounts`,
				around: `the amounts and totals are right, so nothing needs reissuing; if a client asks, the line is for {mins} minutes`
			}
		]
	},
	{
		id: 'night-text',
		vars: (c) => {
			const night = c.truth?.kind === 'none' ? clock(toMin(c.v.send!) + (9 - offset(c.a.zone, c.date)) * 60 + int(c.r, 0, 4)) : clock(int(c.r, 2 * 60 + 35, 3 * 60 + 50));
			return { night, cancelAt: clock(toMin(night) - int(c.r, 1, 3)) };
		},
		brief: 'a client getting a text from the business in the middle of the night',
		need: "the client's booking and the exact time the text arrived on her phone",
		subjects: ['Text sent to client at 3am', 'Why did a client get a text in the night?', 'Complaint about night-time SMS'],
		opens: [
			`One of our clients, {client}, got a text from us at {night} in the morning and has complained, quite rightly. Her partner works early shifts and it woke them both. I didn't know texts could go out at that time.`,
			`A client has sent me a screenshot of a text from us that arrived at {night} on {weekday}. Why would anything be sent in the middle of the night? We close at six.`,
			`Can you tell me what was sent to {client} during the night before {day}? She says her phone woke her with a text from us. I'm mortified.`
		],
		more: [
			`She's a regular, comes every few weeks. Nothing unusual about her booking as far as I can see.`,
			`I haven't had a chance to ask the team about it yet.`,
			`She forwarded the text to me. It's a normal-looking text from us, nothing strange in it.`
		],
		first: [
			`I'm sorry, that's not a good experience for your client. Every text we send is logged, so I'll find out exactly what went to {client} and why it went at that hour.`,
			`I'll ask our engineers to pull the send log for that night.`
		],
		look: [
			`Send log for {client}'s number around the night before {dayShort} below.`,
			`Here's everything we sent to that number in the 24 hours around it.`
		],
		pasteCustomer: (c) => { const t = c.truth?.kind === 'customer' ? `Your appointment at ${c.a.name} has been changed to ${shortDay(c.date)} at ${c.time}. Reply C to cancel.` : c.truth?.kind === 'svc' ? `A ${c.time} slot has come free at ${c.a.name} on ${shortDay(c.date)}. Reply YES within 30 minutes to take it.` : sms(c, '', true); return `[Screenshot forwarded by ${c.v.client}: text from ${c.a.name.toUpperCase().slice(0, 11)} received at ${c.v.night}]\n\n> ${t}`; },
		pasteEng: (c) => {
			const { r, a, v } = c;
			const eve = addDays(c.date, -1);
			const lines = [`${utc(a.zone, eve, v.send!).slice(0, 16)}:${pad(int(r, 0, 59))}Z  day-before  ${v.ref}  sms  delivered  net=${c.truth?.kind === 'none' ? '440-10 (roaming)' : a.phone.replace('+', '').replace(' ', '-') + '-01'}`];
			if (c.truth?.kind === 'customer') lines.push(`${utc(a.zone, c.date, v.night!).slice(0, 16)}:${pad(int(r, 0, 59))}Z  changed     ${v.ref}  sms  delivered  trigger=staff app (${v.staff2Login})`);
			if (c.truth?.kind === 'svc') lines.push(`${utc(a.zone, c.date, v.cancelAt!).slice(0, 16)}:${pad(int(r, 0, 59))}Z  cancelled   ${bookingRef(r)}  (online, another client)`, `${utc(a.zone, c.date, v.night!).slice(0, 16)}:${pad(int(r, 0, 59))}Z  waitlist    ${v.ref2}  sms  delivered  offer for ${c.time}`);
			for (let i = int(r, 3, 5); i > 0; i--) lines.unshift(`${addDays(eve, -int(r, 3, 20))}T${pad(int(r, 7, 16))}:${pad(int(r, 0, 59))}:${pad(int(r, 0, 59))}Z  ${pick(r, ['confirmation', 'day-before ', 'receipt     '])}  ${bookingRef(r)}  sms  delivered`);
			return fence(lines);
		},
		causes: [
			{
				kind: 'customer',
				guess: `a member of staff changed the booking during the night and the change text went straight out`,
				not: `nobody touched the booking that night`,
				find: `The text was an "appointment changed" notice. {client}'s booking was moved at {night} from the staff app, logged in as {staff2}. {biz} has "tell clients about changes" set to immediately, so the notice went out at once. Nothing malfunctioned; the option to hold change notices until morning exists but is switched off.`,
				tell: `The text was a notice that {client}'s appointment had been changed. Someone logged in as {staff2} moved the booking at {night} from the staff app, and your account is set to tell clients about changes immediately, so the notice went straight out.`,
				ask: `under Settings > Notifications, set "tell clients about changes" to "hold until 08:00", which keeps any change made at night until the morning`
			},
			{
				kind: 'none',
				guess: `the client's phone was in another time zone when the text arrived`,
				not: `the text really did leave us at {night} {zoneCity} time`,
				find: `We sent the usual day-before reminder at {send} {zoneCity} time, as every evening. The delivery receipt came from a Japanese network: {client}'s phone was roaming in Japan, where it was {night}. The text was right and on time; it just arrived where she was.`,
				tell: `We sent {client}'s usual day-before reminder at {send} your time. The delivery record shows her phone was abroad, on a network in Japan, where it was {night} when it arrived. We can't know where a client's phone is when we send.`
			},
			{
				kind: 'svc',
				svc: 'reminders',
				planned: '2024-11-25',
				guess: `a waitlist offer went out the moment a slot came free`,
				not: `{client} isn't on any waitlist`,
				find: `It was a waitlist offer. Someone cancelled a {service} booking online at {cancelAt}, {client} was first on the waitlist for that day, and the offer went out within a minute. Quiet hours apply to reminders but were never applied to waitlist offers, which go out straight away so the slot can be filled. That's a gap on our side.`,
				tell: `The text was a waitlist offer: another client cancelled during the night, {client} was first in line for that day, and our system offered her the slot at once. Our quiet hours cover reminders but not waitlist offers, which is a gap we need to close.`,
				fix: `hold waitlist offers made between 21:00 and 08:00 until 08:00`,
				around: `you can switch waitlist offers to "staff approve first" under Settings > Waitlist, so nothing goes out until someone at the desk confirms it`
			}
		]
	},
	{
		id: 'staff-zone',
		vars: (c) => ({ staffTime: clock(toMin(c.time) + (offset(c.wrongZone, c.date) - offset(c.a.zone, c.date)) * 60), wrongCity: zoneCity(c.wrongZone), holiday: BASE[c.a.zone] === 1 ? 'the UK' : 'Spain' }),
		brief: 'one member of staff seeing every appointment an hour out from everyone else',
		need: "the name of the staff member and a screenshot of her calendar next to a colleague's for the same day",
		subjects: ["One staff member's calendar an hour out", 'Different times for different staff', "{staff}'s calendar is wrong"],
		opens: [
			`{staff} sees every appointment an hour away from where the rest of us see it. On her screen {client}'s {service} on {weekday} is at {staffTime}; on mine it's at {time}. Same calendar. It's causing double-takes all day.`,
			`One of our team has her calendar an hour out from everyone else's. She's been working from it for a few days and nearly rang a client at the wrong time. Can you check her account?`,
			`Since {staff} came back from holiday, her Larkspur calendar shows everything an hour out. Nobody else has this.`
		],
		more: [
			`She uses the office computer and her own laptop. I'm not sure which one she noticed it on.`,
			`{staff} was in {holiday} for two weeks, if that's relevant.`,
			`I've asked her to log out and in again. No change.`
		],
		first: [
			`Each person can have their own time zone in their profile, separate from the branch, so I'll check {staff}'s profile first.`,
			`An hour for one person only usually means something set on her profile or her computer. I'm going to look at her account with one of our engineers.`
		],
		look: [
			`{staff}'s profile and recent sessions on {biz} below.`,
			`Pulled {staff}'s profile settings and her last few logins.`
		],
		pasteCustomer: (c) => `[Two screenshots, ${c.v.dayShort}: ${c.v.staff}'s day view with "${c.v.client} – ${c.service}" at ${c.v.staffTime}, and ${c.v.owner}'s day view with the same booking at ${c.time}]`,
		pasteEng: (c) => {
			const { r, v } = c;
			const auto = c.truth?.ask?.includes('laptop');
			const lines = [`user        ${v.staffLogin}`, `role        staff`, `time zone   ${c.truth && !auto ? `${c.wrongZone} (set ${c.changed})` : auto ? 'automatic (from browser)' : 'same as branch'}`, '', 'recent sessions'];
			for (let i = 0; i < int(r, 5, 7); i++) {
				const laptop = i % 2 === 0;
				lines.push(`  ${addDays(c.opened, -i)} ${pad(int(r, 8, 17))}:${pad(int(r, 0, 59))}  ${laptop ? 'Chrome on Windows (laptop)' : 'Edge on Windows (office)'}  browser zone ${laptop && auto ? c.wrongZone : c.a.zone}`);
			}
			return fence(lines);
		},
		causes: [
			{
				kind: 'customer',
				guess: `{staff} has her own time zone set in her profile`,
				not: `{staff}'s profile is set to follow the branch`,
				find: `{staff}'s profile has its own time zone, {wrongZone}, set on {changedDay} from her login. Profiles can override the branch so that staff working remotely see their own time; hers does, so every appointment is shown converted to {wrongCity} time.`,
				tell: `{staff}'s profile has its own time zone, {wrongCity}, which was set on {changedDay}. Profiles can override the branch's time zone for people who work from elsewhere, so her calendar shows everything converted into {wrongCity} time.`,
				ask: `have {staff} open Profile > Time zone and choose "same as branch"`
			},
			{
				kind: 'customer',
				guess: `her profile follows her computer's time zone and the computer is set wrong`,
				not: `{staff}'s profile doesn't follow the computer; it's fixed to the branch`,
				find: `{staff}'s profile is on "automatic", which takes the time zone from the browser, and her last few sessions from her laptop report {wrongZone}. So it's the laptop, probably changed while she was away and never put back. The office computer shows the right times.`,
				tell: `{staff}'s profile is set to follow the time zone of whatever computer she uses, and her laptop is still set to {wrongCity} time, perhaps since her holiday. On that laptop, her calendar converts everything into {wrongCity} time.`,
				ask: `either set the laptop's time zone back to {zoneCity}, or have {staff} choose "same as branch" under Profile > Time zone so the computer doesn't matter`
			},
			{
				kind: 'svc',
				svc: 'booking',
				decoy: true,
				guess: `the staff calendar is showing her a different zone from everyone else`,
				not: `the calendar shows each person the zone their profile asks for, and a colleague's account on the same branch shows the right times`
			}
		]
	},
	{
		id: 'last-slot',
		time: (c) => pick(c.r, ['16:00', '16:30', '17:00', '17:30']),
		vars: (c) => {
			const buffer = pick(c.r, [15, 20, 30]);
			const last = Math.floor((toMin(c.time) - c.mins) / 15) * 15;
			const lost = c.truth?.kind === 'svc' ? 60 : Math.ceil(buffer / 15) * 15;
			return { close: c.time, buffer: String(buffer), lastSlot: clock(last), earlierSlot: clock(last - lost), oldClose: clock(toMin(c.time) - 60), sat: longDay(addDays(c.opened, 6 - weekday(c.opened) || 7)) };
		},
		brief: 'the last appointment of the day missing from the online booking page',
		need: 'the service and the day where the last slot is missing',
		subjects: ['Last slot missing online', 'Booking page cuts off early on Saturdays', "Can't book the last appointment online"],
		opens: [
			`Our online booking page never offers the last slot of the day on Saturdays. We close at {close} and {service} takes {mins} minutes, so {lastSlot} should be bookable, but the page stops at {earlierSlot}. Staff can book {lastSlot} by hand, so it isn't blocked.`,
			`Clients keep ringing to ask for the {lastSlot} slot on Saturdays because they can't find it online. Is the booking page cutting off early?`,
			`We extended our Saturday hours to {close} a few weeks ago and the booking page still doesn't offer anything after {earlierSlot}.`
		],
		more: [`It's only the online page.`, `I've checked the opening hours in settings twice.`, `The service is set to {mins} minutes. I don't remember setting anything else on it.`],
		first: [
			`The booking page only offers a slot if the whole appointment, plus any buffer time set on the service, fits before closing. I'll check the service and your hours.`,
			`Let me look at how the page works out your Saturday slots. I'm adding an engineer so we can see what it's using.`
		],
		look: [`Slots the booking page worked out for {biz} for {sat}, with the inputs it used.`, `Ran the slot calculation for {biz}'s next Saturday and logged what it used.`],
		pasteCustomer: (c) => `[Screenshot of our booking page for ${c.v.sat}, ${c.service}: ${Array.from({ length: 6 }, (_, i) => clock(toMin(c.v.earlierSlot!) - 15 * (5 - i))).join(', ')}, and nothing after ${c.v.earlierSlot}]`,
		pasteEng: (c) => {
			const { v } = c;
			const close = c.truth?.kind === 'svc' ? v.oldClose! : v.close!;
			const buffer = c.truth?.kind === 'none' ? +v.buffer! : 0;
			const slots: string[] = [];
			for (let m = 9 * 60; m + c.mins + buffer <= toMin(close); m += 15) slots.push(clock(m));
			return fence([`branch       ${c.a.city}`, `date         ${v.sat}`, `hours used   09:00–${close}${c.truth?.kind === 'svc' ? ' (cached)' : ''}`, `service      ${c.service}, ${c.mins} min${buffer ? ` + ${buffer} min buffer after` : ''}`, `step         15 min`, `last slots   … ${slots.slice(-6).join(' ')}`]);
		},
		causes: [
			{
				kind: 'none',
				guess: `the service has buffer time after it that has to fit before closing`,
				not: `the service has no buffer time set`,
				find: `{service} has a {buffer}-minute buffer after it, so the page needs {mins} plus {buffer} minutes before closing. At {lastSlot} that runs past {close}, so the last slot offered is {earlierSlot}. That's how buffers work. Staff booking by hand aren't held to buffers, which is why the desk can still book {lastSlot}.`,
				tell: `Your {service} has {buffer} minutes of buffer time after it, for clearing up or notes. The booking page only offers a slot if the appointment and its buffer both fit before you close, so {lastSlot} doesn't qualify. Staff can override that when booking by hand, which is why the desk can still book it. If you don't need the buffer at the end of the day, you can shorten it or remove it under the service's settings.`
			},
			{
				kind: 'svc',
				svc: 'booking',
				from: '2024-09-01',
				fixed: '2024-09-17',
				guess: `the booking page is still using the old Saturday hours`,
				not: `the page uses the current hours, closing at {close}`,
				find: `The booking page keeps a copy of each branch's weekly hours and wasn't refreshing it when only one day's hours changed. {biz} moved Saturday closing to {close} on {changedDay}, and the page has been working from the old closing time, {oldClose}, since. It affects accounts that changed a single day's hours since 1 September. Hand bookings use the live hours, which is why the desk is unaffected.`,
				tell: `When you changed your Saturday hours, our booking page kept using the old ones because of a fault in how it stores opening hours. Your settings are right; the page just hadn't picked them up.`,
				fix: `refresh the booking page's copy of a branch's hours whenever any day changes`,
				around: `saving your Saturday hours again, even without changing them, makes the page pick them up straight away`
			}
		]
	},
	{
		id: 'week-start',
		fits: (a) => CLASSES.includes(a.type),
		vars: (c) => ({ site: `www.${c.v.slug}.${{ en: c.a.zone === 'Europe/Dublin' ? 'ie' : 'co.uk', de: c.a.zone === 'Europe/Vienna' ? 'at' : c.a.zone === 'Europe/Zurich' ? 'ch' : 'de', fr: c.a.zone === 'Europe/Brussels' ? 'be' : c.a.zone === 'Europe/Zurich' ? 'ch' : 'fr' }[c.a.lang]}` }),
		brief: "the timetable on the customer's website starting weeks on Sunday, so clients book the wrong week",
		need: 'the address of the page on your website where the timetable is',
		subjects: ['Timetable starts on Sunday', 'Clients booking the wrong week', 'Week order on our website'],
		opens: [
			`The timetable on our website starts each week on Sunday. Our clients are used to Monday, and two of them booked a class for the following week by mistake because they read the columns wrongly. Can it start on Monday?`,
			`Clients are booking the wrong week from the timetable on our site. The week runs Sunday to Saturday, so the Sunday class on the far left is actually the one before the Monday next to it. Everyone reads it as the end of the week.`,
			`Is there a setting for which day the timetable starts on? Ours starts on Sunday and it's confusing people.`
		],
		more: [`It's the timetable on our own website. I haven't looked at the Larkspur page.`, `We use the small version of the timetable because our site's sidebar is narrow.`, `{client} and another client both turned up on the wrong Sunday.`],
		first: [
			`There is: the first day of the week is a setting on the account, and the timetable should follow it. I'll check what yours is set to and how the timetable is put on your site.`,
			`I'll check your settings and the code on your site with an engineer.`
		],
		look: [`Checked {biz}'s settings and the timetable on their website.`, `Here's {biz}'s calendar setting and the snippet on {site}.`],
		pasteCustomer: (c) => `[Screenshot of the timetable on ${c.v.site}: columns Sun, Mon, Tue, Wed, Thu, Fri, Sat; ${c.service} on the Sunday at ${clock(int(c.r, 36, 44) * 15)}]`,
		pasteEng: (c) =>
			fence([
				`account › calendar › first day of week: ${c.truth?.kind === 'customer' ? 'Sunday' : 'Monday'}`,
				`found on https://${c.v.site}/${pick(c.r, ['timetable', 'classes', 'book'])}:`,
				`  <div data-larkspur-timetable="${c.v.slug}" data-layout="${c.truth?.kind === 'svc' ? 'compact' : pick(c.r, ['full', 'compact'])}"></div>`,
				`  <script src="https://larkspur.app/embed/timetable.js" async></script>`
			]),
		causes: [
			{
				kind: 'customer',
				guess: `the account's first day of the week is set to Sunday`,
				not: `the account's first day of the week is Monday`,
				find: `The account's first day of the week is Sunday, and that's what the timetable follows. It was changed from Monday on {changedDay} from {staff2}'s login, probably while someone was setting up the rota, which uses the same setting.`,
				tell: `Your account's "first day of the week" is set to Sunday; it was changed on {changedDay}. The timetable on your site follows that setting, as does the rota.`,
				ask: `set Settings > Calendar > First day of week back to Monday; the timetable on your site follows it the next time it loads`
			},
			{
				kind: 'svc',
				svc: 'booking',
				from: '2024-06-04',
				fixed: '2024-08-27',
				guess: `the compact timetable ignores the first-day setting`,
				not: `the site uses the full timetable, which follows the setting`,
				find: `The account is set to Monday, correctly, but the site uses the compact layout of the timetable, and the compact layout ignores the setting and always starts on Sunday. It's been like that since the compact layout was rewritten on 4 June. The full layout is fine.`,
				tell: `Your settings are right. The small version of our timetable, the one on your site, has been ignoring the "first day of the week" setting since it was rewritten in June and always starts on Sunday. That's our fault.`,
				fix: `make the compact timetable follow the account's first day of the week`,
				around: `switching the timetable on your site to the full layout makes it start on Monday, though it needs a wider space`
			}
		]
	},
	{
		id: 'us-dates',
		fits: (a) => a.lang === 'en',
		appt: (opened, r) => {
			let d = addDays(opened, -int(r, 1, 6));
			while (+d.slice(8) > 12 || +d.slice(8) === +d.slice(5, 7)) d = addDays(d, -1);
			return d;
		},
		vars: (c) => {
			const [y, m, d] = c.date.split('-');
			return { usDate: `${m}/${d}/${y}`, misread: `${+m!} ${MONTHS[+d! - 1]}` };
		},
		brief: 'confirmation emails writing dates month first',
		need: 'a copy of one confirmation email with the date written month first',
		subjects: ['American dates in emails', 'Client came on the wrong day', 'Date format in confirmations'],
		opens: [
			`A client missed her appointment because the confirmation email said {usDate} and she read it as {misread}. Her appointment was on {day}. I've checked a few other confirmations and they're all written that way. Since when do we write dates the American way?`,
			`Our confirmation emails have started showing dates like {usDate}. We're in {city}; nobody here reads that as {day}. Can it go back to how it was?`,
			`Are the dates in the confirmation emails meant to be month first? {staff} spotted it on one going to a client for {dayShort}.`
		],
		more: [`I don't think anyone has changed the email settings. I wouldn't know where to start.`, `It's the confirmation emails. I haven't checked the reminders.`, `The client was very gracious about it, but I'd like it fixed before it happens again.`],
		first: [
			`Dates in emails follow the language set for your emails, so I'll check that first.`,
			`Let me check your email settings and ask our team whether anything changed in how dates are written.`
		],
		look: [`Rendered {biz}'s confirmation email for a test booking. Settings and excerpt below.`],
		pasteCustomer: (c) => `The confirmation as ${c.v.client} received it:\n\n> Your booking is confirmed\n> ${c.service} with ${c.v.staff}\n> ${c.v.usDate} at ${c.time}\n> ${c.a.name}, ${c.a.city}`,
		pasteEng: (c) =>
			fence([
				`account          ${c.v.accountId}`,
				`email language   English (${c.truth?.kind === 'customer' ? 'United States' : 'United Kingdom'})`,
				`layout           confirmation, ${c.truth?.kind === 'svc' || c.opened >= '2024-07-02' ? '2024 layout' : 'classic'}`,
				'',
				`  Your booking is confirmed`,
				`  ${c.service} with ${c.v.staff}`,
				`  ${c.truth ? c.v.usDate : `${c.date.slice(8)}/${c.date.slice(5, 7)}/${c.date.slice(0, 4)}`} at ${c.time}`
			]),
		causes: [
			{
				kind: 'customer',
				guess: `the emails are set to US English`,
				not: `the email language is English (United Kingdom)`,
				find: `{biz}'s email language is "English (United States)". It was changed from English (United Kingdom) on {changedDay} from {staff2}'s login. US English writes dates month first, so every email since then has.`,
				tell: `Your email language was changed from English (United Kingdom) to English (United States) on {changedDay}, and US English writes dates with the month first. Every email since then has used that order.`,
				ask: `set Settings > Emails > Language back to English (United Kingdom); every email from then on writes the day first`,
				art: (c) => audit(c, 'Emails › Language', 'English (United Kingdom) → English (United States)')
			},
			{
				kind: 'svc',
				svc: 'booking',
				all: true,
				from: '2024-07-02',
				fixed: '2024-07-09',
				guess: `the new email layout writes dates month first`,
				not: `the new email layout has written dates in the account's own order since the fix on {fixedDay}`,
				find: `The new confirmation layout that went out on 2 July writes dates month first for every English-language account, whatever the account's region: the date format was left at the template's default. {biz}'s settings are correct (English, United Kingdom). Every confirmation sent since 2 July has US dates.`,
				tell: `We introduced a new layout for confirmation emails on 2 July, and it writes dates month first for every English-language account, whatever your settings say. Your settings are right; the fault is ours.`,
				fix: `make the new email layout write dates in the order the account's language uses`,
				around: `I'd suggest a quick text to any client booked in the next few days, confirming the date in words`
			}
		]
	},
	{
		id: 'repeated-hour',
		max: 4,
		from: '2024-10-27',
		to: '2024-11-08',
		fits: (a) => a.type === 'vet',
		length: (m) => m === 30,
		appt: () => '2024-10-27',
		time: () => '01:30',
		sure: true,
		vars: (c) => {
			// 01:30 in summer time, then 01:30 again an hour later in winter time.
			const summerUtc = clock(90 - (BASE[c.a.zone]! + 1) * 60);
			const winterUtc = clock(90 - BASE[c.a.zone]! * 60);
			const day = (m: string) => (toMin(m) > 20 * 60 ? '2024-10-26' : '2024-10-27');
			return { firstUtc: `${day(summerUtc)}T${summerUtc}:00Z`, secondUtc: `${day(winterUtc)}T${winterUtc}:00Z` };
		},
		brief: 'two out-of-hours appointments at 01:30 on the night the clocks went back',
		need: 'the references of the two bookings',
		subjects: ['Double booking at 01:30', 'Two appointments at the same time on Sunday night', 'How was this double booking allowed?'],
		opens: [
			`On the night the clocks went back our out-of-hours vet had two appointments at 01:30. The system let both be booked for the same vet at the same time. One owner waited a long time. How can that happen?`,
			`We have a double booking at 01:30 on Sunday 27 October that the calendar should never have allowed. Both are {service} with {staff}. I thought double bookings were blocked.`,
			`Can someone explain the 01:30 appointments on 27 October? Two clients, same vet, same time, according to our calendar. One was booked by phone, one online.`
		],
		more: [
			`The night vet says she saw one at half past one and the other "about an hour later, after the clocks changed", but I'm not sure she's remembering right.`,
			`The owner who waited was not happy and I'd like to give her a proper explanation.`,
			`Both bookings show 01:30 in the day view.`
		],
		first: [
			`That night 01:00 to 02:00 happened twice, once in summer time and once in winter time, so two bookings at 01:30 might be an hour apart or might really clash. I'll ask the booking team to check what was stored.`,
			`I'll get an engineer to look at exactly when each booking was for, so we know whether they really clashed.`
		],
		look: [`The two bookings at 01:30 on 27 October for {biz}, as stored.`, `Here are both 01:30 bookings with their stored instants and how they were made.`],
		pasteCustomer: (c) => `Our day view for ${c.v.staff}, Sunday 27 October:\n\n` + fence([`00:30  –`, `01:00  –`, `01:30  ${c.v.ref}  ${c.service}  ${initials(c.r)}`, `01:30  ${c.v.ref2}  ${c.service}  ${initials(c.r)}`, `02:00  –`, `08:00  ${bookingRef(c.r)}  ${pick(c.r, c.a.services)[0]}  ${initials(c.r)}`]),
		pasteEng: (c) =>
			table(
				['Booking', 'Service', 'Vet', 'Stored start', 'Shown', 'Made'],
				[
					[c.v.ref!, c.service, c.v.staff!, c.v.firstUtc!, '01:30', `${addDays(c.date, -1)} 23:4${int(c.r, 0, 9)}, online`],
					[c.v.ref2!, c.service, c.v.staff!, c.truth?.kind === 'svc' ? c.v.firstUtc! : c.v.secondUtc!, '01:30', `${addDays(c.date, -1)} 23:5${int(c.r, 0, 9)}, phone (${c.v.staff2Login})`]
				]
			),
		causes: [
			{
				kind: 'none',
				guess: `the two bookings are an hour apart, one in each 01:30`,
				not: `both bookings are stored at the same instant`,
				find: `They don't clash. {ref} is stored at {firstUtc} and {ref2} at {secondUtc}: one at 01:30 summer time, the other at 01:30 winter time, an hour later in real time. The day view shows both at 01:30 because that's what the clock said both times. So there was no double booking.`,
				tell: `The two appointments weren't at the same time. That night the clocks went from 02:00 back to 01:00, so 01:30 came round twice: {ref} was booked for the first 01:30 and {ref2} for the second, an hour later in real time. Both show as 01:30 because that's what the clock read each time.`
			},
			{
				kind: 'svc',
				svc: 'booking',
				planned: '2025-02-03',
				guess: `the booking form put both bookings in the same 01:30`,
				not: `the bookings are stored an hour apart, one in each 01:30`,
				find: `Both are stored at {firstUtc}, the first 01:30. The phone booking was meant for the second 01:30, after the clocks went back, but the staff booking form has no way to pick which 01:30 and always takes the first, and the clash check didn't catch it because the online booking came through a different path a few minutes earlier. So it's a real double booking. It can only happen in that hour, once a year, but it's ours.`,
				tell: `When the clocks go back, 01:30 happens twice. Our booking form can't tell the two apart and put both appointments in the first 01:30, and our double-booking check missed it. That's a fault on our side.`,
				fix: `let the booking form choose between the two 01:30s on the night the clocks go back, and make the clash check cover both ways of booking`,
				around: `nothing is needed until next October, and it will be fixed well before then`
			}
		]
	},
	{
		id: 'birthday-early',
		fits: (a) => a.second !== undefined,
		changed: ['2024-04-15', '2024-04-22', '2024-05-06'],
		vars: (c) => {
			const bday = addDays(c.opened, -int(c.r, 1, 9));
			return { second: c.a.second!.city, bdayLong: longDay(bday), bdayEve: longDay(addDays(bday, -1)), bday };
		},
		brief: 'birthday texts going out a day early to clients of the American branch',
		need: 'one client of the {second} branch who got her text a day early, with her date of birth',
		subjects: ['Birthday texts a day early', 'Birthday discount sent on the wrong day', '{second} birthday greetings'],
		opens: [
			`Clients of our {second} branch are getting their birthday text with the discount code a day early. A couple have replied, amused, to say it isn't their birthday until tomorrow. The {city} branch is fine as far as I know.`,
			`The birthday greetings for our {second} clients arrive the day before their birthday. {client} pointed it out: her birthday was {bdayLong} and the text came on {bdayEve}.`,
			`Is there a reason the birthday texts in {second} would go out a day early? It's happened with at least three clients this month.`
		],
		more: [
			`We moved the {second} clients into Larkspur in the spring from the system they used before.`,
			`It's only birthdays. Appointment reminders there are fine.`,
			`I haven't checked the client records themselves.`
		],
		first: [
			`Birthday texts go out on the morning of the birthday in the branch's own time, so a day early is wrong. I'll ask our engineers to check how they're scheduled for {second}.`,
			`A nice surprise for your clients, at least. I'll check whether it's the dates we hold or how we send.`
		],
		look: [`Pulled the birthday texts for {biz}'s {second} branch for the last month, with the dates of birth we hold.`],
		pasteCustomer: (c) => `${c.v.client} replied to the text:\n\n> Thank you! A day early though, it's tomorrow. Can I still use the code then?`,
		pasteEng: (c) => {
			const { r } = c;
			const rows: string[][] = [];
			for (let i = 0; i < int(r, 5, 8); i++) {
				const b = addDays(c.v.bday!, -int(r, 0, 25));
				const held = c.truth?.kind === 'customer' ? addDays(b, -1) : b;
				const year = String(int(r, 1958, 2003));
				const sentDay = c.truth ? addDays(b, -1) : b;
				const sentAt = c.truth?.kind === 'svc' ? `${pad(int(r, 19, 20))}:${pad(int(r, 0, 59))}` : `09:${pad(int(r, 0, 9))}`;
				rows.push([i === 0 ? c.v.client! : initials(r), `${year}-${held.slice(5)}`, `${shortDay(sentDay)} ${sentAt}`]);
			}
			return table(['Client', 'Date of birth held', `Sent, ${c.a.second!.city} time`], rows);
		},
		causes: [
			{
				kind: 'svc',
				svc: 'reminders',
				planned: '2024-12-02',
				guess: `the birthday job turns the date of birth into local time before taking the day`,
				not: `the birthday job takes the calendar date as it is, with no conversion`,
				find: `The dates of birth are right. The birthday job treats each date of birth as midnight UTC and converts that into the branch's time zone before working out the day. East of UTC that changes nothing. In {second}, midnight UTC is the evening before, so every client there gets the text a day early, in the evening. Only branches west of UTC are affected, which for us is a handful of accounts.`,
				tell: `The dates of birth you hold are right. The way our birthday texts work out the day assumed every branch was in Europe, and for a branch in {second} it lands on the day before. That's our mistake.`,
				fix: `treat dates of birth as calendar dates and send on that date in the branch's own time zone`,
				around: `you could pause birthday texts for the {second} branch under Settings > Marketing until the change is out`
			},
			{
				kind: 'customer',
				guess: `the dates of birth are stored a day early`,
				not: `the dates of birth we hold match the client records`,
				find: `The texts go out on the date of birth we hold, in the morning, {second} time, as they should. But every {second} client imported from the old system on {changedDay} has a date of birth one day before the real one: the old system's export wrote dates as the evening before in UTC, and the import took them as they were. Clients added since have the right dates.`,
				tell: `Our birthday texts go out on the date of birth in each client's record. For the clients you moved over from your old system on {changedDay}, those dates are a day early: the old system's export shifted them. Clients added since are fine.`,
				ask: `correct the dates of birth of the imported {second} clients, or send us the original file so that we can work out which ones are affected`
			}
		]
	},
	{
		id: 'clock-change-hours',
		max: 3,
		from: '2024-10-28',
		to: '2024-11-12',
		fits: (a) => NIGHTS.includes(a.type),
		appt: () => '2024-10-26',
		time: () => '22:00',
		sure: true,
		vars: (c) => ({ startUtc: utc(c.a.zone, '2024-10-26', '22:00'), endUtc: utc(c.a.zone, '2024-10-27', '06:00') }),
		brief: 'a night shift on the night the clocks went back showing an extra hour in the timesheet',
		need: 'the shift and the figure you expected',
		subjects: ['Timesheet shows 9 hours for an 8-hour shift', 'Extra hour on night shift', 'Timesheet bug?'],
		opens: [
			`The timesheet export gives {staff} 9 hours for her night shift on Saturday 26 October. The shift is 22:00 to 06:00, which is 8 hours. Payroll has queried it and I need to know which figure is right before I approve it.`,
			`I think the timesheet has a bug. Night shift 22:00 to 06:00, the night of 26 to 27 October, comes out as 9 hours. Every other night is 8.`,
			`Why would one night shift be an hour longer than the others in the timesheet? It's {staff}'s, the Saturday before last. Same times as always.`
		],
		more: [`The rota screen shows the shift bar the same length as every other night.`, `If it's right, do I pay her for 9?`, `{staff2} did the same shift the year before and nobody noticed anything.`],
		first: [`Good question. I'll check how that night's hours were worked out with our rota team before you approve anything.`, `Let me confirm exactly what's stored for that shift.`],
		look: [`{staff}'s shift on 26/27 October as stored.`],
		pasteCustomer: (c) => table(['Date', 'Staff', 'Shift', 'Hours'], [19, 20, 26, 27, 2].map((d) => { const day = d < 10 ? `2024-11-0${d}` : `2024-10-${d}`; return [shortDay(day), d % 2 ? c.v.staff2! : c.v.staff!, '22:00–06:00', d === 26 ? '9.00' : '8.00']; })),
		pasteEng: (c) => fence([`shift      sh-${hex(c.r, 5)}`, `staff      ${c.v.staffLogin}`, `start      ${c.v.startUtc}  (Sat 26 Oct 22:00 ${zoneCity(c.a.zone)})`, `end        ${c.v.endUtc}  (Sun 27 Oct 06:00 ${zoneCity(c.a.zone)})`, `elapsed    9 h 00 min`, `breaks     none recorded`]),
		causes: [
			{
				kind: 'none',
				guess: `that night really was nine hours long`,
				not: `the shift is stored as eight hours`,
				find: `The export is right. The clocks went back at 03:00 that night, so between 22:00 on Saturday and 06:00 on Sunday nine hours passed, not eight: {staff} worked the hour from 02:00 to 03:00 twice. The stored start is {startUtc} and the end {endUtc}, nine hours apart. The rota screen draws every night at the same width, which is why the bar looks normal.`,
				tell: `The 9 hours is right. That night the clocks went back an hour at 3 in the morning, so {staff} worked the hour between 2 and 3 twice: from 22:00 to 06:00 that night was nine real hours. Whether you pay for the extra hour depends on her contract, but the timesheet is telling you what she worked.`
			}
		]
	},
	{
		id: 'noon-import',
		fits: (a) => a.since >= 2020,
		vars: (c) => ({ n2: String(int(c.r, 14, 60)), half: clock(12 * 60 + pick(c.r, [0, 15, 30, 45])) }),
		brief: 'appointments imported from the old system at noon showing at midnight',
		need: 'the file you imported, or a few rows of it',
		subjects: ['Imported bookings at midnight', 'Lunchtime appointments moved to 00:xx', 'Import problem'],
		opens: [
			`We imported our future bookings from the old diary system last week, for the branch we took over. Everything looks right except lunchtime: anything from 12:00 to 12:59 shows at midnight, 00:00 to 00:59. There are {n2} of them.`,
			`After the import, our noon appointments are sitting in the middle of the night. {client} is down for {midnight} on {weekday} instead of {half}.`,
			`Some of the imported bookings are twelve hours out. Only ones in the 12 o'clock hour, I think.`
		],
		more: [`The old system gave us a CSV. I didn't look at it closely; I just uploaded it.`, `I've fixed a few by hand but there are too many to do them all.`, `Everything outside the 12 o'clock hour came through fine.`],
		first: [
			`The import reads the times exactly as they're written in the file, so it would help to see a few rows of it. Could you attach it here?`,
			`Sorry about that. I'm asking our engineers to look at the import log and the file you uploaded.`
		],
		look: [`Pulled the import job for {biz} and the rows that ended up at midnight.`, `Here are a few rows of {biz}'s file next to what the import made of them.`],
		pasteCustomer: (c) => `Our day view for ${c.v.dayShort} after the import:\n\n` + fence([`00:${c.v.half!.slice(3)}  ${c.v.client}  ${c.service}`, `09:00  ${initials(c.r)}  ${pick(c.r, c.a.services)[0]}`, `10:30  ${initials(c.r)}  ${pick(c.r, c.a.services)[0]}`, `14:00  ${initials(c.r)}  ${pick(c.r, c.a.services)[0]}`, `(nothing between 11:00 and 14:00)`]),
		pasteEng: (c) => {
			const { r } = c;
			const rows: string[][] = [];
			for (let i = 0; i < int(r, 6, 9); i++) {
				const d = addDays(c.date, int(r, 0, 20));
				const m = pick(r, [0, 10, 15, 30, 40, 45]);
				const pm = c.truth?.kind === 'customer' ? 'AM' : 'PM';
				rows.push([`${d.slice(8)}/${d.slice(5, 7)}/${d.slice(0, 4)},12:${pad(m)} ${pm},${initials(r)},${pick(r, c.a.services)[0]}`, c.truth ? `${d} 00:${pad(m)}` : `${d} 12:${pad(m)}`]);
			}
			return table(['Row in file', 'Imported as'], rows.map(([row, made]) => [`\`${row}\``, made!]));
		},
		causes: [
			{
				kind: 'customer',
				guess: `the file itself says AM for the noon appointments`,
				not: `the file says PM for every noon appointment`,
				find: `The import did what the file said. In the CSV from {biz}'s old system, every appointment in the 12 o'clock hour is written as 12:xx AM, which is just after midnight. The old system's export got noon wrong; the rest of its times are fine. So the bookings are where the file put them.`,
				tell: `Our import read the times exactly as they appear in the file from your old system, and that file writes every lunchtime appointment as "AM", which means just after midnight. It's a quirk of the old system's export.`,
				ask: `correct the 12 o'clock rows in the file (AM to PM) and import it again with "replace imported bookings" ticked, or move the {n2} bookings by hand`
			},
			{
				kind: 'svc',
				svc: 'booking',
				all: true,
				from: '2024-05-01',
				fixed: '2024-07-16',
				guess: `the import reads 12:xx PM as just after midnight`,
				not: `the import has read 12:xx PM as noon since the fix on {fixedDay}`,
				find: `The file is fine: noon appointments are written 12:30 PM and so on. Our import turns 12-hour times into 24-hour ones and gets the 12 o'clock hour backwards, so 12:30 PM becomes 00:30. It's been like this since the import was rewritten on 1 May. Every customer who imported a 12-hour file since then has the same problem with lunchtime bookings.`,
				tell: `Your file is right. Our import had a fault with 12-hour times in the 12 o'clock hour and turned "12:30 PM" into 00:30. It affects everyone who imported a file with 12-hour times since May.`,
				fix: `read 12-hour times in the 12 o'clock hour correctly, and offer the affected accounts a corrected import`,
				around: `you can move the {n2} bookings by hand, or wait and we'll re-run your import once it's fixed`
			}
		]
	},
	{
		id: 'online-utc',
		fits: (a) => BASE[a.zone] === 1 && ['tutoring', 'counselling', 'language', 'music', 'yoga', 'pilates'].includes(a.type),
		vars: (c) => ({ utcTime: clock(toMin(c.time) - offset(c.a.zone, c.date) * 60) }),
		brief: 'emails for online sessions giving the time in UTC instead of local time',
		need: 'one of the emails with the joining link as a client received it',
		subjects: ['Online session emails in UTC', 'Wrong time in joining link email', 'Why UTC?'],
		opens: [
			`Clients joining our online {service} sessions get an email with the link and a time in UTC. Half of them don't know what UTC is. {client} joined an hour late on {weekday} because of it.`,
			`The email for our online sessions says the session starts at {utcTime} UTC. We're in {city}. Why UTC?`,
			`Since recently our online session emails show the time as UTC. The in-person ones are fine.`
		],
		more: [`Our clients are nearly all local. A few join from abroad, which is why we offer online at all.`, `It's the email with the joining link that goes out an hour before.`, `I haven't changed the email templates, but {staff2} looks after the online side.`],
		first: [
			`Times in emails are normally in your branch's time zone unless the template says otherwise. I'll check your online-session template.`,
			`That's odd for local clients. Let me look at your settings and ask an engineer about the online-session emails.`
		],
		look: [`{biz}'s online-session email settings and a recent send below.`, `Template settings and the last joining-link email for {biz}.`],
		pasteCustomer: (c) => `The email ${c.v.client} got:\n\n> Your online ${c.service} starts at ${c.v.utcTime} UTC.\n> Join here: https://meet.larkspur.app/${hex(c.r, 10)}\n> ${c.a.name}`,
		pasteEng: (c) =>
			fence([
				`template     online-session-link`,
				`times in     ${c.truth?.kind === 'customer' ? 'UTC' : "branch's time zone"}`,
				`last send    ${utc(c.a.zone, c.date, clock(toMin(c.time) - 60))} to ${c.v.client}`,
				`booking      ${c.v.ref} · ${c.service} (online) · made ${c.truth?.kind === 'svc' ? 'on the class page' : 'by staff'}`,
				`zone used    ${c.truth ? 'UTC' : c.a.zone}`,
				`rendered     "Your session starts at ${c.truth ? `${c.v.utcTime} UTC` : c.time}"`
			]),
		causes: [
			{
				kind: 'customer',
				guess: `the online-session template is set to show times in UTC`,
				not: `the template shows times in the branch's zone`,
				find: `The online-session template is set to "show times in UTC", an option meant for accounts whose clients are mostly abroad. It was switched on on {changedDay} from {staff2}'s login. The in-person templates don't have it on, which is why they're fine.`,
				tell: `Your online-session email is set to show times in UTC. That option is meant for businesses whose clients are mostly abroad, and it was switched on on {changedDay}. The other emails don't use it, which is why they look right.`,
				ask: `under Settings > Emails > Online sessions, set "show times in" to your branch's time zone, or to the client's own time zone if you'd like clients abroad to see their time`,
				art: (c) => audit(c, 'Emails › Online sessions › Show times in', "branch's time zone → UTC")
			},
			{
				kind: 'svc',
				svc: 'reminders',
				from: '2024-08-20',
				fixed: '2024-10-08',
				guess: `online sessions booked on the class page are missing the branch's time zone`,
				not: `the session was booked by staff, with the branch's zone`,
				find: `The template is fine. Online sessions booked through the class page since 20 August were saved without the branch's time zone, and the joining-link email falls back to UTC when it has none. Bookings made by staff are fine. It affects every account that sells online sessions on the class page.`,
				tell: `Your settings are right. Online sessions booked through your class page since late August were saved without your time zone, and the email with the joining link fell back to UTC for them. That's a fault on our side.`,
				fix: `save the branch's time zone with online sessions booked on the class page, and correct those already booked`,
				around: `the confirmation email clients get when they book shows the right local time, so you could point them to that`
			}
		]
	},
	{
		id: 'leave-count',
		vars: (c) => {
			const days = shuffle(c.r, ['Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays']).slice(0, int(c.r, 2, 4));
			const order = ['Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays'];
			days.sort((x, y) => order.indexOf(x) - order.indexOf(y));
			const monday = addDays(c.date, 1 - (weekday(c.date) || 7) + 14);
			return { pattern: days.length === 2 ? days.join(' and ') : `${days.slice(0, -1).join(', ')} and ${days.at(-1)}`, should: String(days.length), leaveFrom: longDay(monday), leaveTo: longDay(addDays(monday, 4)), leaveMonth: MONTHS[+monday.slice(5, 7) - 1]!, remaining: String(int(c.r, 2, 9)) };
		},
		brief: "a part-time member of staff's leave counted as more days than she works",
		need: "the staff member's name and the leave request that was counted wrongly",
		subjects: ['Leave days counted wrongly', 'Part-timer charged 5 days for a week off', 'Holiday allowance wrong'],
		opens: [
			`{staff} has booked {leaveFrom} to {leaveTo} off. She works {pattern}, so that's {should} days of her allowance, but the rota has taken 5. Can you correct it?`,
			`The rota is taking too many leave days from our part-timers. {staff} works {should} days a week and a week off cost her 5 days.`,
			`How does the rota count leave? {staff} only works {pattern}, and her week off in {leaveMonth} came off her allowance as five days.`
		],
		more: [`She's been part-time since she came back from maternity leave in the spring.`, `Her allowance shows {remaining} days left, which can't be right.`, `It may be the same for {staff2}, but she hasn't checked.`],
		first: [`The rota counts leave against each person's working pattern, so I'll check what {staff}'s pattern says.`, `I'll look at {staff}'s profile and the leave request with someone from the rota team.`],
		look: [`{staff}'s profile and the leave request on {biz}.`],
		pasteCustomer: (c) => `[Screenshot of ${c.v.staff}'s leave page: ${c.v.leaveFrom} to ${c.v.leaveTo}, 5 days; allowance ${int(c.r, 14, 20)} days, taken ${int(c.r, 8, 12)}, left ${c.v.remaining}]`,
		pasteEng: (c) =>
			fence([
				`user              ${c.v.staffLogin}`,
				`contract hours    ${int(c.r, 15, 28)} h a week (changed ${c.changed})`,
				`working pattern   ${c.truth ? 'Mon–Fri (default)' : c.v.pattern}`,
				`leave request     ${c.v.leaveFrom} – ${c.v.leaveTo}, approved by ${c.v.ownerLogin}`,
				`days counted      ${c.truth ? '5' : c.v.should}`,
				`allowance left    ${c.v.remaining}`
			]),
		causes: [
			{
				kind: 'customer',
				guess: `{staff}'s working pattern was never changed from full time`,
				not: `{staff}'s working pattern lists the days she works`,
				find: `{staff}'s working pattern is still the default, Monday to Friday. When she went part-time nobody changed it, so the rota thinks she works five days a week and counts every weekday of the leave. Her contract hours were updated on {changedDay}, but hours and pattern are separate settings.`,
				tell: `{staff}'s working pattern in Larkspur still says Monday to Friday. Her contract hours were changed on {changedDay}, but the days she works are a separate setting, and the rota counts leave against those days, so it charged her for all five.`,
				ask: `set {staff}'s working pattern under Staff > {staff} > Working pattern to the days she works; the rota recounts her leave from then, including the week already booked`
			},
			{
				kind: 'svc',
				svc: 'rota',
				decoy: true,
				guess: `the rota is counting days she doesn't work`,
				not: `the rota counts only the days in each person's working pattern, as a test account confirms`
			}
		]
	},
	{
		id: 'class-reminder-time',
		fits: (a) => CLASSES.includes(a.type),
		length: (m) => m >= 45 && m <= 110,
		time: (c) => pick(c.r, ['17:30', '18:00', '18:30', '19:00']),
		vars: (c) => {
			const gap = c.truth?.kind === 'svc' ? 120 - c.mins : c.truth ? 60 : 120;
			return { remAt: clock(toMin(c.time) - gap), remGap: String(120 - c.mins) };
		},
		brief: 'class reminders arriving much closer to the start than the two hours set',
		need: 'the class and the time a client got the reminder',
		subjects: ['Class reminders too late', 'Reminder timing for classes', 'Two-hour reminder arrives late'],
		opens: [
			`Our reminder setting says two hours before, but clients booked on the {weekday} {time} {service} get their text at {remAt}. That's not enough notice for people coming from work.`,
			`Reminders for our classes are arriving later than we set. We set two hours. Clients are getting much less.`,
			`Is the reminder timing broken for classes? We set two hours before and {client} got hers at {remAt} for a {time} class.`
		],
		more: [`Our one-to-one appointments seem fine. It's the classes.`, `I've checked Settings > Reminders twice. It says 2 hours.`, `It's been like this for a few weeks, I think.`],
		first: [
			`The account-wide setting can be overridden on each service, so I'll check the {service} service as well as your main setting.`,
			`I can see why that's not enough notice. I'm asking our reminders team to check the timing on your classes.`
		],
		look: [`Reminder schedule for the next few {service} classes on {biz}, with the rule that applied.`, `Here's how the reminders for {biz}'s {service} classes were scheduled this week.`],
		pasteCustomer: (c) => `[Screenshot from ${c.v.client}'s phone: text received ${c.v.dayShort} at ${c.v.remAt}]\n\n> ${sms(c)}`,
		pasteEng: (c) => {
			const { a, v } = c;
			const rule = c.truth?.kind === 'customer' ? 'service rule: 1 h before start' : 'account: 2 h before';
			const lines: string[] = [];
			for (let i = -1, n = int(c.r, 4, 5); i < n; i++) {
				const d = addDays(c.date, 7 * i);
				lines.push(`${utc(a.zone, d, c.time)}  ${c.service}  ${pad(4 + i * 3)} booked  ${rule.padEnd(30)}  reminder at ${utc(a.zone, d, v.remAt!)}`);
			}
			return fence(lines);
		},
		causes: [
			{
				kind: 'customer',
				guess: `the class has its own reminder rule that overrides the account setting`,
				not: `the class has no reminder rule of its own`,
				find: `{service} has its own reminder rule, one hour before, added on {changedDay} from {staff2}'s login. A service's own rule replaces the account setting rather than adding to it, so classes of that type get one reminder an hour before and nothing at two hours.`,
				tell: `Your {service} class has its own reminder rule, one hour before, which was added on {changedDay}. A rule on a service replaces the account-wide setting for that service, so its clients get a single reminder an hour before.`,
				ask: `remove the reminder rule on the {service} service (Services > {service} > Reminders), or change it to two hours, if you want it to follow your main setting`,
				art: (c) => audit(c, `Services › ${c.service} › Reminders`, 'account default → 1 h before start')
			},
			{
				kind: 'svc',
				svc: 'reminders',
				from: '2024-07-15',
				fixed: '2024-09-03',
				guess: `class reminders are being timed from the end of the class`,
				not: `the reminders are timed from the start of the class, as they should be`,
				find: `For classes, not appointments, the reminder time has been worked out from the class's end instead of its start since the class schedule was reworked on 15 July. With a {mins}-minute class, "two hours before" becomes {remGap} minutes before the start. Appointments aren't affected.`,
				tell: `Since a change to how classes are scheduled in July, class reminders have been timed from the end of the class instead of the start, so a two-hour reminder for your {mins}-minute class arrived {remGap} minutes before it began. Appointments weren't affected. That's our fault.`,
				fix: `time class reminders from the start of the class again`,
				around: `adding a second reminder the evening before under Settings > Reminders would give clients more notice`
			}
		]
	}
];

// Lines any ticket can use.
const greet: Record<Lang, string[]> = {
	en: ['Hi,', 'Hello,', 'Hi there,', 'Dear Larkspur team,', 'Morning,', 'Hi support,', 'Hello again,'],
	de: ['Hallo,', 'Guten Tag,', 'Hello,', 'Hallo zusammen,', 'Hi,'],
	fr: ['Bonjour,', 'Hello,', 'Bonjour à vous,', 'Hi,']
};
const signOff: Record<Lang, string[]> = {
	en: ['Thanks,\n{owner}', 'Regards,\n{ownerFull}\n{biz}', 'Cheers, {owner}', '{owner}\n\nSent from my iPhone', 'Many thanks,\n{ownerFull}', 'Best,\n{owner}'],
	de: ['Viele Grüße\n{ownerFull}', 'Danke und Grüße,\n{owner}', 'Beste Grüße\n{ownerFull}\n{biz}', 'LG {owner}'],
	fr: ['Cordialement,\n{ownerFull}', "Merci d'avance,\n{owner}", 'Bien à vous,\n{ownerFull}\n{biz}', 'Bonne journée,\n{owner}']
};
const shortSign: Record<Lang, string[]> = { en: ['Thanks, {owner}', '{owner}', 'Thanks again', 'Cheers'], de: ['Danke, {owner}', 'Grüße, {owner}', 'Danke!'], fr: ['Merci, {owner}', '{owner}', 'Merci !'] };
const contexts = [
	`We've been with you since {since} and I can't remember anything like this before.`,
	`This is the second thing this month, so I'd appreciate a proper answer rather than a link to a help article.`,
	`Not the end of the world, but I'd like to understand it.`,
	`Two of the team noticed it separately, so I don't think we're imagining it.`,
	`Please ring me if that's easier; the number on the account reaches the front desk.`,
	`I'm not very technical, so please keep the answer simple.`,
	`We're very busy this month, so a quick answer would be lovely.`,
	`I did look through the help pages first and couldn't find anything.`
];
const asides: [string, string][] = [
	[`Also, while I have you: could you send me a copy of our September invoice? I can't find it anywhere.`, `I've sent the September invoice to the account email separately.`],
	[`Separate question: is there a way to give {staff} access to reports without making her an admin?`, `On reports: yes, there's a "reports" permission under Staff > {staff} > Permissions that doesn't give admin rights.`],
	[`One more thing, we're adding another room in the new year. Do we need a different plan for that?`, `On the extra room: rooms are included in your plan, so there's nothing to change. You can add it under Settings > Resources when you're ready.`],
	[`By the way, our logo looks squashed in the emails. Is that us?`, `About the logo: emails give it a space 600 by 200 pixels, so a square logo gets squashed. A wider version would look better.`],
	[`And is the app slow some mornings, or is it our internet?`, `On the mornings: our status page shows nothing over the last month, so it may be your connection. If it happens again, tell me the time and I'll check our side.`],
	[`Also, can clients pay a deposit online yet? Someone asked last week.`, `On deposits: yes, under Settings > Payments > Deposits. You can set an amount or a percentage for each service.`],
	[`Lastly, {staff2} is leaving at the end of the month. What happens to her login?`, `About {staff2}'s login: when she leaves, set her to "inactive" under Staff. Her past appointments and notes stay; she just can't log in.`],
	[`Unrelated, but the booking page shows our old phone number. Where do I change it?`, `On the phone number: it's under Settings > Branches > {city} > Contact, and the booking page picks it up within a few minutes.`],
	[`PS: is there a way to print a day's appointments for the front desk?`, `On printing: the day view has a print button at the top right, and it prints the day for every member of staff.`],
	[`PPS: we'd love the booking page in our brand colours. Possible?`, `On colours: yes, under Settings > Booking page > Appearance you can set your own colours and upload a header image.`]
];
const supportOpen = [
	`Hi {owner}, thanks for getting in touch, and sorry for the trouble.`,
	`Hello {owner}, thanks for the detailed report.`,
	`Hi {owner}, sorry to hear this. Let me help.`,
	`Thanks {owner}, I can see why that would be confusing.`,
	`Hi {owner}, thanks for flagging this.`,
	`Hello {owner}, thanks for writing in.`
];
const supportAsk = [`Could you send me {need}? It saves a round trip with our engineers.`, `One thing that would help: {need}.`, `If you can, please reply with {need}.`];
const supportAgain = [`Hi {owner}, an update on this.`, `Hello {owner}, I have news on this one.`, `Hi {owner}, thanks for bearing with us.`, `Hi {owner}, here's what we found.`, `Hello again, {owner}.`];
const supportSign = ['Best wishes,\n{agent}\nLarkspur Support', 'Kind regards,\n{agent} · Larkspur Support', 'Thanks,\n{agent}', 'All the best,\n{agent}\nLarkspur Support\nhelp.larkspur.app · Monday to Friday, 8:00 to 18:30 UK time'];
const streets: Record<Lang, string[]> = { en: ['High Street', 'Station Road', 'Church Lane', 'Market Place', 'Victoria Road', 'Mill Lane'], de: ['Hauptstraße', 'Bahnhofstraße', 'Lindenallee', 'Marktplatz', 'Schillerstraße'], fr: ['rue de la République', 'avenue Jean-Jaurès', 'place du Marché', 'rue Victor-Hugo', 'quai des Carmes'] };
const earlier = ['Card reader keeps disconnecting', 'Adding a new member of staff', 'Copy of an invoice', 'Changing our bank details', 'Logo looks blurry on the booking page', "Client says she can't log in", 'Gift vouchers', 'No-show fee', 'Upgrading our plan', 'Duplicate client records', 'Refunding a deposit', 'VAT number on invoices', 'Text credits running low', "Can staff see each other's notes?", 'Waitlist settings', 'Exporting our client list', 'Moving to new premises', 'Two-step login for staff', 'Selling a package of five sessions', 'Intake form for new clients', 'Adding a second treatment room', 'Cancellation policy wording'];
const addOns = ['SMS reminders', 'online payments', 'intake forms', 'gift vouchers', 'waitlist', 'class timetable', 'rota', 'invoicing', 'marketing texts', 'calendar sync'];
const escalate = [
	`Escalating. {biz} ({city}, account {accountId}) reports {brief}. Examples are in the thread above.`,
	`Passing to engineering. Summary: {brief}. I've gone through the obvious settings with the customer and nothing stood out to me. Customer is {mood}.`,
	`Can engineering take this one? {Brief}, at {biz}. Account {accountId}. Customer is {mood}.`,
	`For engineering: {brief}. Customer since {since}, {mood}. Details above.`
];
const moods = ['patient', 'getting frustrated', 'polite but wants an answer this week', 'happy to wait', 'understanding, but wants it sorted soon'];
const engIntro = ['Picked this up.', 'Looking at this now.', 'Had a look this morning.', 'Taking this one.', 'Mine.', 'On it.'];
const hypo = [`My first guess is that {guess}. I'll check that before anything else.`, `This looks like {guess}, but I want to be sure before we say anything to the customer.`, `Most likely {guess}. Checking.`, `Working theory: {guess}.`];
const overturn = [`Correction to my note above. It isn't that: {not}.`, `I was wrong earlier: {not}.`, `Ruled that out: {not}. Kept digging.`, `Scratch my first theory; {not}.`];
const confirm = ['Confirmed.', 'That was it.', 'Checked properly now, and the first guess holds.', 'Yes, as suspected.'];
const unknownNote = [
	`My first guess, that {guess}, doesn't hold: {not}. I've been through the other usual suspects for this and found nothing either. Without a fresh example I can't see where it comes from.`,
	`Ruled out: {not}. Nothing else stands out in the logs for the dates we have, and I can't make it happen on our side.`
];
const interimSupport = [
	`Hi {owner}, a quick update: our engineers are looking into this and I'll come back to you as soon as I hear.`,
	`Hello {owner}, just to let you know this is with our engineers now. I'll update you when they've had a proper look.`,
	`Hi {owner}, sorry for the silence. This is still being looked at; I haven't forgotten you.`
];
const interimCustomer = [`Thanks. Any idea how long it will take?`, `OK, thanks for the update.`, `Thank you. The team keeps asking me about it.`, `Fine. Please don't let it drop.`, `Thanks for letting me know.`];
const callNotes = [`Rang {owner} back as asked ({callMins} min). We went through it again; the main point, in {owner}'s words: "{quote}"`, `Call with {owner}, {callMins} min. Nothing new beyond what's in the thread, except this: "{quote}"`];
const engAside = [
	`For what it's worth, the last time we had one of these it was a setting, not a bug. Worth looking at the settings history before digging into code.`,
	`If this turns out to be ours it may touch more accounts; tell me and I'll count them.`,
	`I can pair on this tomorrow if it's still open.`,
	`Saw this go past in the queue. Shout if you want a second pair of eyes.`
];
const autoReply = [`Automatic reply: Thank you for your email. I'm away until {back} with limited access to email. For anything urgent about bookings, please call the front desk.`, `Automatic reply: I'm out of the office until {back}. Your email has not been forwarded.`];

// How a ticket ends. Which of these happened is only in the last entries.
const ends = {
	fixedEng: [`Released on {release}: the change to {fix}. I've checked {biz}'s account since and it behaves.`, `The change is out ({svcName}, {release}), so we now {fix}. Nothing for the customer to do.`, `Shipped on {release}. I looked at {biz}'s data afterwards and it's right now.`],
	fixedSupport: [`Hi {owner}, a quick update: we released a change on {release} that sorts this out, so you shouldn't need to do anything. If you see it again, reply here and I'll pick it up straight away.`, `Hello {owner}, good news. The fix went out on {release}, and I've checked your account: it looks right now. Thanks for your patience with this one.`],
	fixedCustomer: [`Thanks, I can confirm it looks right now.`, `Lovely, thank you. All correct this week.`, `Great, that's sorted then. Thanks for chasing it.`, `Thanks. A shame it took a few weeks, but it's fine now.`],
	fixedQuiet: [`No reply from {owner}. The fix is live and the account looks right; closing.`, `Closing. Fix confirmed on our side; nothing heard from the customer since.`],
	owedEng: [`The fix is to {fix}. It's planned for the {svcName} release in the week of {release}; I'll note here when it's out.`, `We need to {fix}. Not a quick change, so it's going into the {svcName} work for the week of {release}.`],
	owedSupport: [`We're going to {fix}, and that's planned for the week of {release}. {aroundLine}I'll write to you as soon as it's out.`, `Our team will {fix}; it's scheduled for the week of {release}. {aroundLine}I'll keep this ticket open and update you when it's done.`],
	owedCustomer: [`Thanks for explaining. Please do let me know when it's done.`, `OK. Not ideal, but at least we know what it is.`, `Fine, we'll manage until then. Please keep me posted.`, `Thank you for being straight about it.`],
	owedNote: [`On hold until the {svcName} release. I've promised {owner} an update when it ships.`, `Setting to on hold. We owe {owner} a reply once the change is live.`],
	fixedYou: [`To put it right, {ask}.`, `The fix is on your side: {ask}.`],
	fixedYouCustomer: [`Found it, you're right. Sorted now, thanks.`, `Done, and it looks right now. Sorry for the trouble; I had no idea that setting existed.`, `Changed it this morning. {staff} has checked and it's correct now. Thank you!`, `All done. I've told the team not to touch that setting again.`],
	fixedYouClose: [`Glad that's sorted, {owner}. I'll close this, but reply any time if anything looks off.`, `Great, thanks for confirming. Closing this one.`],
	waitAsk: [`When you have a moment, the change to make is this: {ask}. Let me know once it's done and I'll check from our side.`, `Nothing is broken on our side, so the change is yours to make: {ask}. Reply here when it's done and I'll double-check.`],
	waitBump: [`Hi {owner}, just checking in: have you had a chance to make the change I mentioned? I'll keep this open for another week.`, `Hello {owner}, a gentle nudge on this one. Let me know once the change is made and I'll check it.`],
	waitNote: [`No reply after two nudges. Leaving it pending; it closes by itself on {closeDate} unless {owner} replies.`, `Still waiting on {owner}. Nothing more we can do from here.`],
	aroundTell: [`What works best is this: {around}.`, `The way round it: {around}.`],
	aroundCustomer: [`OK, we'll do that. Thanks for looking into it properly.`, `That works for us. Thanks.`, `A bit annoying, but fine. We'll do that from now on.`],
	aroundClose: [`Great. Closing this one.`, `Glad that helps. Closing.`],
	explainTail: [`So nothing on your account needs changing.`, `In short, everything is working as it should, even if it didn't look like it at first.`],
	explainCustomer: [`Ah, that makes sense. Thanks for explaining it so clearly.`, `Right, I hadn't thought of that. Fair enough.`, `OK, understood. I'll explain it to the team.`, `Huh. Well, you learn something every day. Thanks.`],
	explainClose: [`Closing this. Thanks, {owner}.`, `Closing, explained to the customer.`],
	unknownAsk: [`Our engineers have checked the likely causes and ruled them out, but they can't see the problem on our side with the examples so far. Could you send {need} the next time it happens? With that we can trace it properly.`],
	unknownCustomer: [`Will do. It hasn't happened since, but I'll keep an eye out.`, `I'll ask the team to screenshot it next time.`],
	unknownBump: [`Hi {owner}, checking in: has it happened again? If so, {need} would let us trace it.`],
	unknownNote: [`Nothing further from {owner}. Waiting on an example; it closes on {closeDate} otherwise.`],
	stillEng: [`Still nothing conclusive. I've added logging around this for {biz}'s account and will look again after a week of data.`],
	stillSupport: [`Our engineers haven't found the cause yet. They've added extra logging to your account so that the next time it happens it leaves a trail, and I'll come back to you with what they find by {release}.`],
	stillCustomer: [`OK, thanks for not just closing it.`, `Fine. I'll tell the team.`],
	stillNote: [`On hold. We owe {owner} an answer once the logging has caught something.`]
};

const fill = (text: string, v: Record<string, string>): string => {
	let out = text;
	for (let pass = 0; pass < 3 && out.includes('{'); pass++)
		out = out.replace(/\{(\w+)\}/g, (_, key: string) => {
			const value = v[key] ?? (v[key.charAt(0).toLowerCase() + key.slice(1)] !== undefined ? cap(v[key.charAt(0).toLowerCase() + key.slice(1)]!) : undefined);
			if (value === undefined) throw new Error(`no value for {${key}} in: ${text.slice(0, 80)}`);
			return value;
		});
	return out;
};

interface Entry {
	head: string;
	body: string;
	when: string;
}

const LAST = '2024-11-21';
/** Where an engineer's finding names an earlier ticket with the same fault, once the tickets are numbered. */
const SAME = '\u0000same\u0000';
const FIRST = '2024-06-03';
const CLOSE = '2024-11-15';

const ticket = (index: number, topic: Topic, round: number, pace: number) => {
	const r = mulberry32(0x1a2b0000 + index * 7919);
	const eligible = accounts.filter((a) => (topic.fits ? topic.fits(a) : true) && (!topic.length || a.services.some(([, m]) => topic.length!(m))));
	const a = pick(r, eligible);
	const from = topic.from && topic.from > FIRST ? topic.from : FIRST;
	const to = topic.to && topic.to < CLOSE ? topic.to : CLOSE;
	const opened = addDays(from, int(r, 0, daysBetween(from, to)));

	// What it turns out to be.
	const real = topic.causes.filter((k) => !k.decoy && (!k.fits || k.fits(a)));
	const active = real.filter((k) => (k.kind === 'svc' || k.kind === 'lib') && (k.from ?? '2000-01-01') <= opened && (!k.fixed || opened < k.fixed));
	const forced = active.filter((k) => k.all);
	const candidates = [...active, ...real.filter((k) => k.kind === 'customer' || k.kind === 'none')];
	let truth: Cause | null;
	if (forced.length) truth = pick(r, forced);
	else if (candidates.length === 0 || (!topic.sure && round > 0 && r() < 0.14)) truth = null;
	else truth = candidates[(round + index + int(r, 0, 1)) % candidates.length]!;
	const decoys = topic.causes.filter((k) => k !== truth && (!k.fits || k.fits(a)) && !(k.all && (!k.fixed || opened < k.fixed)) && !(k.kind === 'svc' && !k.all && k.fixed && opened >= k.fixed && false));
	const decoy = decoys.length ? pick(r, decoys) : null;
	const flip = decoy !== null && (truth === null || r() < 0.55);

	// The customer's world.
	const services = topic.length ? a.services.filter(([, m]) => topic.length!(m)) : a.services;
	const [service, mins] = pick(r, services);
	const staff = shuffle(r, a.staff);
	const wrongZone = BASE[a.zone] === 1 ? 'Europe/London' : 'Europe/Paris';
	const date = topic.appt ? topic.appt(opened, r) : addDays(opened, -int(r, 1, 6));
	const pinned = (topic.changed ?? []).filter((d) => d < opened);
	let changed = pinned.length ? pick(r, pinned) : addDays(opened, -int(r, 3, 24));
	if (truth?.from && changed < truth.from) changed = truth.from;
	const slug = a.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').replace(/^(the|cabinet|studio)-/, '');
	const loginOf = (name: string) => `${name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}@${slug.split('-')[0]}`;
	const agent = pick(r, agents);
	const [eng, eng2] = shuffle(r, engineers);
	const c: Ctx = { r, a, truth, date, time: '', mins, service, wrongZone, opened, changed, v: {} };
	c.time = topic.time ? topic.time(c) : clock(int(r, 32, 74) * 15);
	const accountId = String(10000 + ((a.name.length * 7919 + a.since * 31) % 9000));
	const v: Record<string, string> = {
		biz: a.name,
		owner: a.owner.split(' ')[0]!,
		ownerFull: a.owner,
		city: a.city,
		zone: a.zone,
		zoneCity: zoneCity(a.zone),
		wrongZone,
		wrongCity: zoneCity(wrongZone),
		since: String(a.since),
		accountId,
		slug,
		phone: masked(r, a.phone),
		address: `${a.lang === 'en' ? `${int(r, 2, 140)} ${pick(r, streets.en)}` : a.lang === 'de' ? `${pick(r, streets.de)} ${int(r, 2, 90)}` : `${int(r, 2, 90)} ${pick(r, streets.fr)}`}, ${a.city}\n${masked(r, a.phone)}`,
		client: initials(r),
		staff: staff[0]!,
		staff2: staff[1]!,
		staff3: staff[2] ?? staff[0]!,
		ownerLogin: loginOf(a.owner.split(' ')[0]!),
		staffLogin: loginOf(staff[0]!),
		staff2Login: loginOf(staff[1]!),
		service,
		mins: String(mins),
		len: formatLength(mins, a.lang),
		date,
		day: longDay(date),
		dayShort: shortDay(date),
		weekday: WEEKDAYS[weekday(date)]!,
		eveLong: longDay(addDays(date, -1)),
		eveShort: shortDay(addDays(date, -1)),
		eveWeekday: WEEKDAYS[weekday(addDays(date, -1))]!,
		send: pick(r, ['17:30', '18:00', '18:30', '19:00']),
		ref: bookingRef(r),
		ref2: bookingRef(r),
		changedDay: longDay(changed),
		changedShort: shortDay(changed),
		agent,
		eng: eng!,
		eng2: eng2!,
		mood: pick(r, moods),
		callMins: String(int(r, 4, 19)),
		closeDate: '',
		back: '',
		fixedDay: '',
		midnight: ''
	};
	c.v = v;
	v.time = c.time;
	v.late = clock(toMin(c.time) + 60);
	v.end = clock(toMin(c.time) + mins);
	v.zoneWhy = wrongZone === 'Europe/London' ? 'accounts created through the old UK sign-up page started on London time, and this one was never changed' : 'it was changed from {zone} on {changedDay}, by the look of it while someone was setting up closures';
	Object.assign(v, topic.vars ? topic.vars(c) : {});
	if (v.half) v.midnight = `00:${v.half.slice(3)}`;
	v.brief = fill(topic.brief, v);
	v.need = fill(topic.need, v);
	const f = (text: string, extra: Record<string, string> = {}) => fill(text, { ...v, ...extra });
	const causeVars = (k: Cause) => ({ guess: f(k.guess), not: f(k.not, { fixedDay: k.fixed ? dayMonth(k.fixed) : '' }) });

	// The thread, with a clock that moves forward.
	let day = opened;
	let minute = int(r, 7 * 60 + 30, 21 * 60);
	const office = () => {
		if (minute < 8 * 60) minute = 8 * 60 + int(r, 0, 50);
		if (minute > 18 * 60 + 30) {
			day = addDays(day, 1);
			minute = 8 * 60 + int(r, 0, 90);
		}
		while (weekday(day) === 0 || weekday(day) === 6) day = addDays(day, 1);
	};
	const wait = (low: number, high: number, inOffice: boolean) => {
		minute += Math.round(int(r, Math.round(low * 60), Math.round(high * 60)) * (high > 2 ? pace : 1));
		while (minute >= 1440) {
			minute -= 1440;
			day = addDays(day, 1);
		}
		if (inOffice) office();
		else if (minute < 7 * 60) minute = 7 * 60 + int(r, 0, 120);
		else if (minute > 22 * 60) {
			day = addDays(day, 1);
			minute = 7 * 60 + int(r, 30, 180);
		}
	};
	const jump = (to: string) => {
		if (day < to) {
			day = to;
			minute = 8 * 60 + int(r, 0, 120);
			office();
		}
	};
	const entries: Entry[] = [];
	const stamp = () => `${day} ${clock(minute)}`;
	const lang = a.lang;
	const customer = (body: string) => entries.push({ head: `**${a.owner}**`, body, when: stamp() });
	const support = (body: string) => entries.push({ head: `**${agent}** (Larkspur Support)`, body, when: stamp() });
	const note = (who: string, body: string) => entries.push({ head: `**${who}** (internal note)`, body, when: stamp() });
	let greeted = false;
	const toCustomer = (...parts: string[]) => {
		support([f(pick(r, greeted ? supportAgain : supportOpen)), ...parts, f(pick(r, supportSign))].join('\n\n'));
		greeted = true;
	};
	const fromCustomer = (parts: string[], full = false, note: string[] = []) => customer([...note, ...(full ? [pick(r, greet[lang])] : []), ...parts, ((sign) => sign + (full && !sign.includes('iPhone') && r() < 0.6 ? `\n${v.address}` : ''))(f(pick(r, full ? signOff[lang] : shortSign[lang])))].join('\n\n'));

	const more = shuffle(r, topic.more).map((text) => f(text));
	const [aside, lateAside] = shuffle(r, asides).map((pair) => pair.map((text) => f(text)));
	const early = r() < 0.4;
	const late = r() < 0.35;
	const customerPaste = topic.pasteCustomer ? topic.pasteCustomer(c) : null;
	const pasteFirst = customerPaste !== null && r() < 0.5;

	// 1. The report.
	const translated = lang !== 'en' && r() < 0.4 ? [`_Translated from ${lang === 'de' ? 'German' : 'French'} by ${agent}._`] : [];
	fromCustomer([f(pick(r, topic.opens)), ...(r() < 0.55 ? [f(pick(r, contexts))] : []), ...(pasteFirst ? [customerPaste!] : []), ...(early ? [aside![0]!] : [])], true, translated);
	// 2. Support's first answer.
	wait(0.3, 20, true);
	toCustomer(f(pick(r, topic.first)), ...(early ? [aside![1]!] : []), ...(!pasteFirst && r() < 0.6 ? [f(pick(r, supportAsk))] : []));
	// 3. The customer adds detail.
	wait(1, 40, false);
	fromCustomer([more[0]!, ...(r() < 0.8 ? [more[1]!] : []), ...(customerPaste && !pasteFirst ? [customerPaste] : [])]);
	if (r() < 0.3) {
		wait(1, 26, true);
		entries.push({ head: `**${agent}** (call note)`, body: f(pick(r, callNotes), { quote: more[2] ?? more[0]! }), when: stamp() });
	}
	// 4. Escalation and the first look.
	wait(0.2, 6, true);
	const snapshot = () =>
		fence([
			`account        ${accountId} (${a.name})`,
			`branches       ${a.second ? `2 · ${a.city}, ${a.second.city}` : `1 · ${a.city}`}`,
			`staff          ${a.staff.length} active, ${int(r, 0, 3)} inactive`,
			`last login     ${addDays(opened, -int(r, 0, 1))} ${pad(int(r, 7, 18))}:${pad(int(r, 0, 59))} (${v.ownerLogin})`,
			`bookings       ${int(r, 120, 900)} in the last 30 days, ${int(r, 2, 40)} online today`,
			`texts          ${int(r, 200, 1800)} sent in the last 30 days · credits left ${int(r, 40, 900)}`,
			`payments       ${pick(r, ['Stripe', 'Stripe', 'none', 'card reader + Stripe'])}`,
			`open tickets   ${pick(r, ['this one', 'this one', `this one, LS-${int(r, 29000, 30400)} (payments)`])}`
		]);
	note(agent, [f(pick(r, escalate)), ...(r() < 0.55 ? [snapshot()] : [])].join('\n\n'));
	wait(2, 50, true);
	const first = truth && !flip ? truth : decoy;
	note(eng!, [pick(r, engIntro), f(pick(r, topic.look)), ...(topic.pasteEng ? [topic.pasteEng(c)] : []), first ? f(pick(r, hypo), causeVars(first)) : 'Nothing obvious yet.'].join('\n\n'));
	if (r() < 0.25) {
		wait(0.5, 8, true);
		note(eng2!, pick(r, engAside));
	}
	if (r() < 0.8) {
		wait(20, 70, true);
		support(f(pick(r, interimSupport)));
		if (r() < 0.75) {
			wait(1, 30, false);
			fromCustomer([pick(r, interimCustomer), ...(more[2] && r() < 0.6 ? [more[2]] : [])]);
		}
	}
	// 5. The finding.
	wait(4, 60, true);
	if (truth) {
		const opening = flip && decoy ? f(pick(r, overturn), causeVars(decoy)) : pick(r, confirm);
		note(eng!, [opening + SAME, f(truth.find!), ...(truth.art ? [truth.art(c)] : [])].join('\n\n'));
	} else note(eng!, [decoy ? f(pick(r, unknownNote), causeVars(decoy)) : 'Nothing found in the logs for the dates we have.', `What would help: ${v.need}.`].join('\n\n'));

	// 6. How it ends.
	const kind = truth?.kind;
	const svcName = truth?.svc ?? 'booking';
	let ending: 'fixed' | 'owed' | 'fixedYou' | 'wait' | 'around' | 'explain' | 'unknownWait' | 'still';
	if (kind === 'svc' || kind === 'lib') ending = truth!.planned ? 'owed' : day < truth!.fixed! && r() < 0.3 ? 'owed' : 'fixed';
	else if (kind === 'customer') ending = truth!.ask ? (r() < 0.55 ? 'fixedYou' : 'wait') : 'around';
	else if (kind === 'none') ending = 'explain';
	else ending = r() < 0.65 ? 'unknownWait' : 'still';
	if (ending === 'owed' && truth!.fixed && day >= truth!.fixed) ending = 'fixed';
	const release = truth?.fixed ?? truth?.planned ?? addDays(day, 10);
	const around = truth?.around ? f(truth.around) : '';
	const ev = { svcName, release: dayMonth(release), fix: truth?.fix ? f(truth.fix) : '', ask: truth?.ask ? f(truth.ask) : '', around, aroundLine: around ? `In the meantime, ${around}. ` : '' };
	const e = (text: string) => f(text, ev);
	wait(0.5, 20, true);
	if (ending === 'fixed' || ending === 'owed') {
		if (ending === 'owed') {
			note(eng!, e(pick(r, ends.owedEng)));
			wait(0.5, 10, true);
			toCustomer(f(truth!.tell!), e(pick(r, ends.owedSupport)));
			if (r() < 0.7) {
				wait(1, 30, false);
				fromCustomer([pick(r, ends.owedCustomer)]);
			}
			wait(0.2, 4, true);
			note(agent, e(pick(r, ends.owedNote)));
		} else {
			if (day < truth!.fixed!) {
				note(eng!, e(pick(r, ends.owedEng)));
				wait(0.5, 10, true);
				toCustomer(f(truth!.tell!), e(pick(r, ends.owedSupport)));
				if (r() < 0.5) {
					wait(1, 30, false);
					fromCustomer([pick(r, ends.owedCustomer)]);
				}
				jump(addDays(truth!.fixed!, int(r, 0, 1)));
				note(eng!, e(pick(r, ends.fixedEng)));
				wait(0.5, 26, true);
				support(e(pick(r, ends.fixedSupport)));
			} else {
				note(eng!, e(pick(r, ends.fixedEng)));
				wait(0.5, 10, true);
				toCustomer(f(truth!.tell!), `We've already put this right: a change released on ${ev.release} sorted it, and I've checked your account since. You shouldn't need to do anything.`);
			}
			if (r() < 0.6) {
				wait(1, 40, false);
				fromCustomer([pick(r, ends.fixedCustomer)]);
			} else {
				wait(48, 120, true);
				note(agent, e(pick(r, ends.fixedQuiet)));
			}
		}
	} else if (ending === 'fixedYou') {
		toCustomer(f(truth!.tell!), e(pick(r, ends.fixedYou)), ...(r() < 0.4 ? ['Let me know if you get stuck.'] : []));
		wait(1, 30, false);
		fromCustomer([f(pick(r, ends.fixedYouCustomer))]);
		wait(0.3, 8, true);
		support(f(pick(r, ends.fixedYouClose)));
	} else if (ending === 'wait') {
		toCustomer(f(truth!.tell!), e(pick(r, ends.waitAsk)));
		if (r() < 0.3) {
			wait(0, 0.05, false);
			v.back = longDay(addDays(day, int(r, 4, 12)));
			customer(f(pick(r, autoReply)));
		}
		wait(72, 140, true);
		support(f(pick(r, ends.waitBump)));
		wait(72, 160, true);
		v.closeDate = longDay(addDays(day, 14));
		note(agent, f(pick(r, ends.waitNote)));
	} else if (ending === 'around') {
		toCustomer(f(truth!.tell!), e(pick(r, ends.aroundTell)));
		wait(1, 30, false);
		fromCustomer([pick(r, ends.aroundCustomer)]);
		wait(0.3, 8, true);
		support(pick(r, ends.aroundClose));
	} else if (ending === 'explain') {
		toCustomer(f(truth!.tell!), pick(r, ends.explainTail));
		if (r() < 0.65) {
			wait(1, 30, false);
			fromCustomer([pick(r, ends.explainCustomer)]);
		}
		wait(0.3, 30, true);
		note(agent, f(pick(r, ends.explainClose)));
	} else if (ending === 'unknownWait') {
		toCustomer(f(pick(r, ends.unknownAsk)));
		if (r() < 0.5) {
			wait(1, 30, false);
			fromCustomer([pick(r, ends.unknownCustomer)]);
		}
		wait(72, 160, true);
		support(f(pick(r, ends.unknownBump)));
		wait(72, 160, true);
		v.closeDate = longDay(addDays(day, 14));
		note(agent, f(pick(r, ends.unknownNote)));
	} else {
		note(eng!, f(pick(r, ends.stillEng)));
		wait(0.3, 8, true);
		toCustomer(e(pick(r, ends.stillSupport)).replace(ev.release, dayMonth(addDays(day, 10))));
		if (r() < 0.6) {
			wait(1, 30, false);
			fromCustomer([pick(r, ends.stillCustomer)]);
		}
		wait(0.2, 4, true);
		note(agent, f(pick(r, ends.stillNote)));
	}
	const last = entries.at(-1)!;
	if (late && last.head === `**${a.owner}**`) {
		last.body = last.body.replace(/\n\n([^\n]*)$/, `\n\n${lateAside![0]}\n\n$1`);
		wait(0.3, 6, true);
		support(`${lateAside![1]}\n\n${f(pick(r, supportSign))}`);
	}
	if (day > LAST) return null;

	const channel = pick(r, ['email', 'email', 'email', 'the contact form', 'the contact form', 'chat']);
	const history = shuffle(r, earlier)
		.slice(0, int(r, 1, 4))
		.map((subject, i) => {
			const when = addDays(opened, -int(r, 30 + i * 60, 90 + i * 120));
			return `LS-${30412 - daysBetween(when, FIRST) * 38 - int(r, 0, 37)} "${subject}" (${MONTHS[+when.slice(5, 7) - 1]!.slice(0, 3)} ${when.slice(0, 4)})`;
		});
	const panel = [
		`- Account: ${accountId} · ${a.name}`,
		`- Contact: ${a.owner} (owner) · ${v.ownerLogin}`,
		`- Plan: ${pick(r, ['Solo', 'Studio', 'Practice', 'Practice Plus'])} · ${a.staff.length + int(r, 0, 3)} staff seats`,
		`- Branches: ${a.second ? `${a.city}, ${a.second.city}` : a.city}`,
		`- Services: ${a.services.map(([name, length]) => `${name} (${length} min)`).join(', ')}`,
		`- Add-ons: ${[...new Set([...topic.causes.flatMap((k) => ({ reminders: ['SMS reminders'], rota: ['rota'], invoicing: ['invoicing'], 'calendar sync': ['calendar sync'] } as Record<string, string[]>)[k.svc ?? ''] ?? []), ...shuffle(r, addOns).slice(0, int(r, 1, 4))])].join(', ')}`,
		`- Earlier tickets: ${history.join('; ')}`
	].join('\n');
	const recent: string[][] = [];
	for (let i = int(r, 5, 8), d = addDays(opened, -int(r, 0, 2)); i > 0; i--, d = addDays(d, -int(r, 0, 2))) {
		const [name, length] = pick(r, a.services);
		const start = int(r, 32, 72) * 15;
		recent.push([`${shortDay(d)} ${clock(start)}–${clock(start + length)}`, name, pick(r, a.staff), pick(r, ['online', 'online', 'staff', 'phone']), pick(r, ['attended', 'attended', 'attended', 'booked', 'cancelled', 'no show'])]);
	}
	const bookings = `Recent bookings (helpdesk view):\n\n${table(['When', 'Service', 'Staff', 'Made', 'Status'], recent)}`;
	const subject = f(pick(r, topic.subjects));
	const header = (reference: string) =>
		[`# ${reference} · ${subject}`, `From ${a.owner}, ${a.name} (${a.city}) · account ${accountId} · customer since ${a.since}\nOpened ${entries[0]!.when} by ${channel}`, panel, bookings].join('\n\n');
	const body = entries.map((entry) => `---\n\n${entry.head} · ${entry.when}\n\n${entry.body}`).join('\n\n');
	// German lengths end in a full stop of their own ("1,3 Std."), so a sentence ending on one needs no second.
	const known = truth && (truth.kind === 'svc' || truth.kind === 'lib') ? `${topic.id}/${topic.causes.indexOf(truth)}` : null;
	return { opened: entries[0]!.when, known, text: (reference: string, same: string) => `${header(reference)}\n\n${body.replace(SAME, same).replace(/(Std|Min)\.\./g, '$1.')}\n` };
};

// Which topic each ticket is about: every topic once per round, in a shuffled order, until there are enough.
const order = mulberry32(20241122);
const plan: { topic: Topic; round: number }[] = [];
for (let round = 0; plan.length < ITEMS; round++)
	for (const topic of shuffle(order, topics)) if (plan.length < ITEMS && (topic.max === undefined || round < topic.max)) plan.push({ topic, round });
// A ticket opened late in the period gets a quicker thread, so that every thread ends before the export.
const paced = (index: number, topic: Topic, round: number) => {
	for (const pace of [1, 0.6, 0.35, 0.2, 0.1, 0.05]) {
		const item = ticket(index, topic, round, pace);
		if (item) return item;
	}
	throw new Error(`ticket ${index} (${topic.id}) does not fit before ${LAST}`);
};
const tickets = plan.map(({ topic, round }, index) => paced(index, topic, round)).sort((x, y) => (x.opened < y.opened ? -1 : x.opened > y.opened ? 1 : 0));

const folder = join(root, 'docs', 'tickets');
mkdirSync(folder, { recursive: true });
let reference = 30_412;
const firstSeen = new Map<string, string>();
for (const item of tickets) {
	reference += int(order, 40, 260);
	const name = `LS-${reference}`;
	const earlier = item.known ? firstSeen.get(item.known) : undefined;
	if (item.known && !earlier) firstSeen.set(item.known, name);
	writeFileSync(join(folder, `${name}.md`), item.text(name, earlier ? ` Same cause as ${earlier}.` : ''));
}
writeFileSync(
	join(folder, 'README.md'),
	`# Tickets tagged "times wrong"\n\nThe ${tickets.length} tickets that support tagged "times wrong" between 3 June and 15 November 2024, exported from the\nhelpdesk one file each with the whole thread: the customer's emails, support's replies, call notes and internal\nnotes. Client names and phone numbers are removed. Times are as the helpdesk shows them, in UK time. The export\nleaves out the helpdesk's statuses and categories.\n`
);
