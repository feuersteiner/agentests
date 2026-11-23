// Writes the long material of this entry's long tasks: the support tickets that Acme Tutors' support team
// escalated to ops between 3 August and 6 November 2026, each with its whole thread, one Markdown file each,
// under docs/tickets/. Deterministic: fixed seeds, no clock, no network.
//   bun long/generate.ts <workspace root>
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** How many tickets to write. Their numbers, dates and topics all follow from it. */
const ITEMS = 293;

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
const hex = (r: Rand, length: number) => Array.from({ length }, () => '0123456789abcdef'[int(r, 0, 15)]).join('');
const cap = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

// People. Support answers the customers; ops looks after the servers, the database and the uploads volume.
const support = ['Dana Whitfield', 'Jules Moreno', 'Marisol Vega', 'Ben Achterberg', 'Hana Sato'];
const ops = ['Ravi Menon', 'Kim Ostrowski', 'Tobias Grant'];
const firstNames = ['Maria', 'James', 'Aisha', 'Kevin', 'Priya', 'Daniel', 'Grace', 'Marcus', 'Elena', 'Tyler', 'Naomi', 'Andre', 'Sofia', 'Brandon', 'Leah', 'Hector', 'Megan', 'Jamal', 'Olivia', 'Raj', 'Hannah', 'Luis', 'Chloe', 'Derek', 'Mei', 'Isaiah', 'Rachel', 'Omar', 'Tessa', 'Victor', 'Jasmine', 'Caleb', 'Fatima', 'Nolan', 'Bianca', 'Wesley', 'Yuki', 'Darnell', 'Lauren', 'Arturo'];
const lastNames = ['Lopez', 'Nguyen', 'Patel', 'Johnson', 'Kim', 'Garcia', 'Okafor', 'Brennan', 'Castillo', 'Wright', 'Haddad', 'Reyes', 'Thompson', 'Chen', 'Morales', 'Sullivan', 'Bishop', 'Takahashi', 'Delgado', 'Foster', 'Ramirez', 'Goldberg', 'Mensah', 'Park', 'Whitaker', 'Ortiz', 'Fischer', 'Abbott', 'Iyer', 'Coleman'];
const students: [string, 'f' | 'm'][] = [['Ava', 'f'], ['Ethan', 'm'], ['Mia', 'f'], ['Noah', 'm'], ['Zoe', 'f'], ['Liam', 'm'], ['Isabella', 'f'], ['Mateo', 'm'], ['Lily', 'f'], ['Jayden', 'm'], ['Emma', 'f'], ['Aiden', 'm'], ['Sophie', 'f'], ['Gabriel', 'm'], ['Harper', 'f'], ['Diego', 'm'], ['Nora', 'f'], ['Owen', 'm'], ['Riya', 'f'], ['Elijah', 'm'], ['Camila', 'f'], ['Lucas', 'm'], ['Ella', 'f'], ['Kai', 'm']];
const schools = ['Lincoln Middle School', 'Harbor View High School', 'Cedar Ridge Academy', 'Mission Hills Elementary', 'Westlake Prep', 'Sierra Vista Charter School', 'Oak Grove Middle School', 'Bayside High School', 'Valley Oaks Academy', 'Riverside Community School', 'Del Mar Middle School', 'Foothill High School'];
const schoolRoles = ['the counselor', 'the after-school program coordinator', 'the assistant principal', 'the tutoring coordinator', 'the librarian', 'the math department chair'];
const subjects = ['Algebra II', 'AP Chemistry', 'SAT Math', 'Spanish 2', 'Geometry', 'AP US History', 'Biology', 'Precalculus', 'English 10', 'Physics', 'ACT Reading', 'French 1', 'AP Statistics', 'Chemistry', 'Algebra I', 'AP Calculus AB', 'Earth Science', 'Essay Writing'];
const stems = ['Unit {n} review', 'week {n} worksheet', 'practice test {n}', 'homework set {n}', 'formula sheet', 'vocab list {n}', 'chapter {n} notes', 'quiz {n} corrections', 'warm-ups {n}', 'study guide', 'bell-ringer answers', 'lab {n} handout'];
const browsers = [
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15',
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
	'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
	'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
	'Mozilla/5.0 (Linux; Android 13; SM-T220) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
	'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
];
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const longDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Day 0 is Monday 3 August 2026. */
const calendar = (day: number) => {
	const date = new Date(Date.UTC(2026, 7, 3 + day));
	return { month: date.getUTCMonth(), date: date.getUTCDate(), weekday: date.getUTCDay() };
};
const dayLabel = (day: number) => {
	const c = calendar(day);
	return `${weekdays[c.weekday]} ${months[c.month]} ${c.date}`;
};
const clock = (minutes: number) => {
	const hour = Math.floor(minutes / 60);
	return `${hour % 12 === 0 ? 12 : hour % 12}:${pad(minutes % 60)} ${hour < 12 ? 'AM' : 'PM'}`;
};
const logStamp = (day: number, seconds: number) => {
	const c = calendar(day);
	return `${pad(c.date)}/${months[c.month]}/2026:${pad(Math.floor(seconds / 3600) % 24)}:${pad(Math.floor(seconds / 60) % 60)}:${pad(seconds % 60)} +0000`;
};
const isoStamp = (day: number, seconds: number) => {
	const c = calendar(day);
	return `2026-${pad(c.month + 1)}-${pad(c.date)}T${pad(Math.floor(seconds / 3600) % 24)}:${pad(Math.floor(seconds / 60) % 60)}:${pad(seconds % 60)}Z`;
};
const isoDate = (day: number) => {
	const c = calendar(day);
	return `2026-${pad(c.month + 1)}-${pad(c.date)}`;
};

/** The values one ticket fills its texts with. */
interface Slots {
	[key: string]: string;
}
const fill = (text: string, s: Slots) => text.replace(/\{(\w+)\}/g, (whole, key: string) => s[key] ?? whole);

// Pasted output. Each helper returns the lines of one block; the ticket wraps them in a fence.
const address = (r: Rand) => `${pick(r, ['203.0.113', '198.51.100', '192.0.2'])}.${int(r, 2, 254)}`;
const psql = (query: string, columns: string[], rows: (string | number)[][]) => {
	const widths = columns.map((column, i) => Math.max(column.length, ...rows.map((row) => String(row[i]).length)));
	const line = (cells: (string | number)[]) =>
		cells.map((cell, i) => ` ${typeof cell === 'number' ? String(cell).padStart(widths[i]!) : String(cell).padEnd(widths[i]!)} `).join('|').trimEnd();
	return [`tutors=> ${query}`, line(columns), widths.map((width) => '-'.repeat(width + 2)).join('+'), ...rows.map(line), `(${rows.length} ${rows.length === 1 ? 'row' : 'rows'})`];
};
const accessLog = (r: Rand, day: number, count: number, o: { path: string; status: number | number[]; bytes: number | (() => number); agent?: string; method?: string; from?: number }) => {
	const lines: string[] = [];
	let seconds = (o.from ?? int(r, 14, 26)) * 3600 + int(r, 0, 3599);
	const who = [address(r), address(r), address(r)];
	for (let i = 0; i < count; i++) {
		seconds += int(r, 40, 2400);
		const status = Array.isArray(o.status) ? pick(r, o.status) : o.status;
		const bytes = typeof o.bytes === 'function' ? o.bytes() : o.bytes;
		lines.push(`${pick(r, who)} - - [${logStamp(day + Math.floor(seconds / 86400), seconds % 86400)}] "${o.method ?? 'GET'} ${o.path} HTTP/2.0" ${status} ${bytes} "-" "${o.agent ?? pick(r, browsers)}"`);
	}
	return lines;
};
const listing = (r: Rand, day: number, folder: string, files: [string, number][]) => {
	const width = Math.max(...files.map(([, size]) => String(size).length));
	return [
		`ops@ops-1:~$ ls -l ${folder}`,
		`total ${Math.round(files.reduce((sum, [, size]) => sum + size, 0) / 1024)}`,
		...files.map(([name, size], i) => {
			const c = calendar(day - int(r, 0, 40) - i);
			return `-rw-r--r-- 1 www-data www-data ${String(size).padStart(width)} ${months[c.month]} ${String(c.date).padStart(2)} ${pad(int(r, 0, 23))}:${pad(int(r, 0, 59))} ${name}`;
		})
	];
};
const fileKey = (r: Rand) => `${hex(r, 8)}-${hex(r, 4)}`;
const appLog = (r: Rand, day: number, events: string[]) => {
	let seconds = int(r, 13, 27) * 3600 + int(r, 0, 3599);
	return events.map((event) => {
		seconds += int(r, 1, 900);
		return `${isoStamp(day + Math.floor(seconds / 86400), seconds % 86400)} app[${int(r, 1800, 4999)}]: ${event}`;
	});
};
const fence = (lines: string[]) => ['```', ...lines, '```'].join('\n');
const vtimezone = ['BEGIN:VTIMEZONE', 'TZID:America/Los_Angeles', 'BEGIN:DAYLIGHT', 'TZOFFSETFROM:-0800', 'TZOFFSETTO:-0700', 'TZNAME:PDT', 'DTSTART:19700308T020000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU', 'END:DAYLIGHT', 'BEGIN:STANDARD', 'TZOFFSETFROM:-0700', 'TZOFFSETTO:-0800', 'TZNAME:PST', 'DTSTART:19701101T020000', 'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU', 'END:STANDARD', 'END:VTIMEZONE'];

type Role = 'tutor' | 'parent' | 'student' | 'school';
/** Where the fault turned out to be. Never written in a ticket. */
type Where = 'file' | 'db' | 'app' | 'client' | 'none';
/** How a ticket ends. Never written in a ticket. */
type Outcome = 'fixed' | 'explained' | 'around' | 'eng' | 'waiting' | 'quiet';
type Art = (r: Rand, s: Slots, day: number) => string[];

interface Cause {
	where: Where;
	/** Sets or overrides slots this cause depends on, such as a file size or a flag the outputs read. */
	set?: (r: Rand, s: Slots) => void;
	/** The customer's second message, when it depends on the cause. */
	details?: string[];
	/** What ops found, two phrasings. */
	found: [string, string];
	/** The output pasted under the finding. */
	show: Art;
	/** How support explains it to the customer. */
	told: string;
	/** Ops's note of the change, when ops fixes it. */
	fix?: string;
	/** How support tells the customer about ops's change. */
	changed?: string;
	/** What support asks the customer to do. */
	ask?: string;
	/** The customer's reply after doing it, when the customer fixes it. */
	done?: string;
	/** A way round it that support gives. */
	around?: string;
	/** The bug ops files for the engineers. */
	bug?: string;
	ends: Outcome[];
}

interface Topic {
	role: Role;
	set?: (r: Rand, s: Slots) => void;
	subjects: string[];
	opens: string[];
	guess: string[];
	details: string[];
	escalate: string[];
	look: string[];
	first: Art;
	causes: Cause[];
}

const pdfinfo = (r: Rand, s: Slots, o: { broken?: boolean; rot?: number; landscape?: boolean; form?: boolean; creator: string; producer: string }) => [
	`ops@ops-1:~$ pdfinfo /srv/acme/uploads/${s.path}`,
	...(o.broken ? [`Syntax Error (${Number(s.bytes) - int(r, 9, 400)}): Illegal character '>'`, `Syntax Error: Couldn't find trailer dictionary`, `Syntax Error: Couldn't read xref table`, `Syntax Warning: PDF file is damaged - attempting to reconstruct xref table...`] : []),
	`Title:           ${s.stem}`,
	`Creator:         ${o.creator}`,
	`Producer:        ${o.producer}`,
	`CreationDate:    ${s.made}`,
	`ModDate:         ${s.made}`,
	`Custom Metadata: no`,
	`Tagged:          ${o.broken ? 'no' : pick(r, ['yes', 'no'])}`,
	`Form:            ${o.form ? 'AcroForm' : 'none'}`,
	`Pages:           ${s.pages}`,
	`Encrypted:       no`,
	`Page size:       ${o.landscape ? '792 x 612' : '612 x 792'} pts (letter)`,
	`Page rot:        ${o.rot ?? 0}`,
	`File size:       ${s.bytes} bytes`,
	`Optimized:       no`,
	`PDF version:     1.${pick(r, [4, 5, 6, 7])}`
];

// Side questions a customer slips into the second message, with support's answer.
const sides: Record<Role, [string, string][]> = {
	tutor: [
		['Also, unrelated: is there a way to change the day my payouts go out?', 'On your other question: payouts go out every Friday for lessons completed by the Wednesday before. The day itself can\'t be changed, but each payout is broken down under Earnings.'],
		['While I have you, can I see which students have opened a worksheet?', 'About seeing who opened a file: not yet. The lesson page shows when a file was attached but not who opened it. I\'ve added your vote to that request.'],
		['Separate question: how do I add a second subject to my profile?', 'For the second subject, go to Profile, then Subjects, and click Add subject. New subjects show on your public profile once they\'re reviewed, usually within a day.'],
		['Can parents see my private notes on a lesson, by the way?', 'And no, parents can\'t see private notes. Only you can. Shared notes are visible to the student and to any parent linked to the account.'],
		['Is there a limit to how many files I can attach to one lesson?', 'On the file limit: up to 20 files per lesson, each up to 25 MB.'],
		['Do you have a separate app for iPad?', 'There isn\'t a separate iPad app, but the site works well in Safari on an iPad and you can add it to the home screen.'],
		['Can I offer a package of lessons at a lower price?', 'Yes to packages: under Pricing, create a package with its own price and number of lessons, and students will see it on your profile.'],
		['Is the eraser coming back to the whiteboard?', 'The whiteboard eraser is coming back in the next update. I don\'t have a date yet, sorry.'],
		['Can I hide my last name on my profile?', 'You can show just your first name and last initial: Profile, then Display name.'],
		['Can students book two lessons back to back with me?', 'Back-to-back bookings work if your availability allows it. Set the gap between lessons to zero under Availability.'],
		['Will I get a 1099 from you this year?', 'About the 1099: tutors who earn $600 or more in the year get a 1099-NEC in January, under Earnings, then Tax forms.'],
		['Can I attach a link instead of a file?', 'You can attach a link with Add link on the lesson. Links don\'t count toward the file limit.'],
		['Where did dark mode go?', 'Dark mode moved to Settings, then Display, in the July update.'],
		['How do I stop the "new booking" emails? I get them on my phone already.', 'For the booking emails: Settings, then Notifications, lets you turn off each kind of email separately.']
	],
	parent: [
		['Also, can I get receipts for the whole year for our taxes?', 'On receipts: each one can be downloaded from the Billing page, and a yearly statement is planned for January.'],
		['Separately, can {student} switch from weekly to every other week?', 'Changing to every other week is done from the lesson\'s Repeat menu. It applies to future lessons only.'],
		['While I have you, is there a sibling discount?', 'We don\'t have a sibling discount ourselves, but some tutors offer one through packages. It\'s worth asking the tutor.'],
		['Can I add my husband to the account so he gets the emails too?', 'You can add a second parent under Family, then Invite a parent. They get their own sign-in and the same emails.'],
		['How do I change the card we pay with?', 'The card is changed under Billing, then Payment method. The new card is used from the next invoice.'],
		['Is there a way to see the tutor\'s notes after each lesson?', 'Shared notes appear on each lesson page after the lesson, and you get an email when a tutor adds one.'],
		['Do you have tutors for the PSAT as well?', 'We do have PSAT tutors. Search for "PSAT" and you\'ll see who\'s available.'],
		['Can lessons be in person, or only online?', 'Lessons are online only at the moment.']
	],
	student: [
		['Also can I change my profile picture? It\'s really old.', 'On the photo: Profile, then Photo, lets you upload a new one.'],
		['Is there a way to get a reminder before my lesson?', 'Reminders are under Settings, then Notifications. You can have an email or a text an hour before.'],
		['Can I message my tutor without booking a lesson?', 'Yes, the Message button on your tutor\'s profile works any time.'],
		['How do I see my old homework?', 'Older homework is under Homework, then Turned in, sorted by date.']
	],
	school: [
		['Separately, can we get a report of how many lessons our students had this term?', 'On the term report: your school\'s account manager can send one. I\'ve asked them to get in touch.'],
		['Also, our principal asked whether tutors are background checked.', 'Every tutor passes a background check before they\'re approved. I\'ve attached the page that describes it for your principal.'],
		['Can we add more students to our program mid-year?', 'Adding students mid-year is fine. Send the names to your account manager and they\'ll set them up.'],
		['Is there someone we can call next time instead of emailing?', 'For schools there\'s a phone line on weekdays from 8 to 5 Pacific. Your account manager can give you the number.']
	]
};

const backstories: Record<Role, string[]> = {
	tutor: ['I\'ve been tutoring on Acme for {years} years and this is the first time I\'ve had to write in.', 'I\'m writing between lessons, so forgive me if this is short.', 'I looked through the help center first but couldn\'t find anything that matched.', 'I\'d normally work this out myself, but I\'ve run out of ideas.', 'Sorry if this is something obvious. I\'m not very technical.'],
	parent: ['I\'m not very technical, so please bear with me.', 'I looked in the help center but couldn\'t find an answer.', 'I\'m writing from work, so I may be slow to reply during the day.', 'We\'ve been very happy with the lessons otherwise.'],
	student: ['My mom said I should write to you myself.', 'Sorry if this is the wrong place to ask.'],
	school: ['Our program is new this year, so we\'re still learning the system.', 'I\'m the main contact for Acme at our school, so questions tend to land on me.']
};

const signoffs = ['Thanks,\n{first}', 'Thank you!\n{first}', '{first}', 'Best,\n{name}', 'Thanks so much,\n{first}', 'Regards,\n{name}'];
const agentSignoffs = ['Best,\n{agentFirst}', 'Thanks,\n{agentFirst}\nAcme Tutors support', '{agentFirst}', 'Kind regards,\n{agentFirst}'];
const escalateReplies = [
	'Thanks, {first}, that\'s really helpful. I\'ve asked our ops team, who look after our servers and the files you upload, to take a look, and I\'ll be back in touch as soon as I hear from them.',
	'Thank you for checking all that. This needs someone who can look behind the scenes, so I\'ve passed it to our ops team. I\'ll update you here.',
	'Thanks for trying those, {first}. Since that didn\'t do it, I\'ve asked our ops team to look at it directly. I\'ll write again once they have.'
];
const chasers = ['Any news on this? {deadline}', 'Hi, just checking whether there\'s an update. {deadline}', 'Sorry to chase, but is anyone looking at this? {deadline}'];
const chaserReplies = ['Thanks for your patience, {first}. Our ops team is on it now and I\'ll update you as soon as I hear back.', 'Still with our ops team, {first}. I\'ve asked them to look at it first thing and I\'ll write as soon as I have something.'];
const deadlines = ['We have a lesson tomorrow.', '{student}\'s next lesson is on {day}.', '', 'It\'s getting a bit urgent.'];
const acks = ['Thanks, {opsFirst}, that\'s really clear. I\'ll write to {first} now.', 'Perfect, thank you. Writing to the customer.', 'Great, thanks. I\'ll let {first} know.'];
const confirms = ['It works now. Thank you so much!', 'Just checked and it\'s all fine now. I really appreciate the quick help.', 'Yes, that did it. Thanks to you and the team.', 'Confirmed, all good on my end.', 'Perfect. Thanks for explaining what happened, too.', 'All sorted here. Thanks for staying on it.'];
const accepts = ['Oh, that makes sense. Thanks for explaining.', 'I see. I didn\'t know that. Thank you.', 'OK, mystery solved. Sorry to have taken up your time.', 'Got it. I\'ll keep that in mind.', 'Thanks, that\'s clear. I\'ll take it from here.'];
const aroundReplies = ['That works for now. Thanks.', 'OK, I\'ll do that. Not ideal, but it gets us through.', 'Tried it and it worked. Thank you.', 'Fine, I can live with that for the moment.'];
const engMessages = [
	'This turned out to be a fault on our side, and I\'ve passed it to our engineers with everything our ops team found. I can\'t give you a date yet, but I\'ll update this ticket when it\'s fixed.',
	'Our engineers now have this as a bug, with all the details from our ops team. I\'m sorry I can\'t fix it for you today. I\'ll let you know here as soon as there\'s news.'
];
const engReplies = ['OK. Please let me know when it\'s fixed.', 'Thanks for being straight with me. I\'ll wait to hear.', 'Understood. Glad it\'s not just me.', 'Alright. Hopefully soon.'];
const willDo = ['Will do, probably this weekend.', 'OK, I\'ll try that tonight.', 'I\'ll have a look when I get a minute.', 'Thanks, I\'ll get back to you.'];
const reminders = ['Hi {first}, just following up on my last message. Whenever you have a moment, let me know and we\'ll take it from there.', 'Hi {first}, I wanted to check whether you\'d had a chance to look at this. I\'ll keep the ticket open for a few more days.'];
const closings = ['As we haven\'t heard back, I\'m closing this ticket for now. If you still need help, just reply and it will reopen.', 'I\'m closing this one since it\'s been quiet. Reply any time and we\'ll pick it up where we left off.'];
const thanksDone = ['Great, thanks for letting us know!', 'Glad that sorted it. Have a good week.', 'Wonderful, thanks for the update.'];

const topics: Topic[] = [
	// 1. A worksheet that will not open for a student.
	{
		role: 'tutor',
		subjects: ['Students say my worksheet is broken', 'PDF won\'t open for my student', '"{file}" gives an error'],
		opens: [
			'Hi, my student {student} told me last night that the worksheet I attached to our {subj} lesson won\'t open. {She} gets a message saying the file is damaged and could not be repaired. I uploaded it on {day} the way I always do, and it looked fine on my end. We have a lesson tomorrow afternoon and the whole session is built around that worksheet, so I\'d really appreciate a quick look.',
			'Hello. Two of my students can\'t open "{file}". One of them sent me a screenshot that just says "Failed to load PDF document". I\'ve been uploading worksheets the same way for over a year and this is the first time it\'s happened. Is something wrong with the site right now?',
			'I\'m not sure who to ask about this. I made a new practice packet for {subj} and attached it to three lessons this week. The parent of one student emailed to say it won\'t open, and now I\'m worried the others can\'t see it either and are just too polite to say so.'
		],
		guess: [
			'Thanks for reaching out, {first}, and sorry about the trouble right before a lesson. Could you ask {student} to try a different browser, or to clear {her} browser\'s cache and reload the lesson page? Now and then an old copy of the page hangs around and the link inside it stops working. If it still won\'t open, tell me what device {she} uses and I\'ll dig in.',
			'Hi {first}, thanks for the details. Could you check whether the file opens for you from the lesson page itself, rather than from the copy on your computer? That tells us whether the copy we hold is the problem or the student\'s browser. A screenshot of the error on the student\'s side would help as well.'
		],
		details: [
			'I tried that, and I also opened it in Chrome and in Safari on my own laptop. From the lesson page it opens fine for me, which is what confuses me. {student} uses the laptop {her} school gave {her}. I made the file in Word and saved it as a PDF, same as always.',
			'Cleared the cache, no change. The other worksheets on the same lesson open for the same student, it\'s only this one. It\'s about {mb} MB, if that matters. I can email you the original if that\'s useful.',
			'{She} tried {her} phone as well as {her} tablet and gets the same message on both. {Her} older brother opened it on his laptop without any problem, though, so I really don\'t know what to think.'
		],
		escalate: [
			'Ops, could you look at the stored copy of this file? Tutor {tid}, lesson {lid}, "{file}". It opens for the tutor and for me in the admin view, not for at least one student. A different browser and a cleared cache didn\'t help.',
			'Passing this to ops. The PDF on lesson {lid} reportedly won\'t open for students. From the admin view it opens in Chrome but takes a long time to show the first page. Can you check the file on the uploads volume?'
		],
		look: [
			'Found it under /srv/acme/uploads/tutors/{tid}/, where it should be. The students\' requests for it all got a 200:',
			'Checked the download log for this key first. Every request in the last few days was answered with a 200, from three different addresses, so the server is handing the file out:'
		],
		first: (r, s, day) => [`ops@ops-1:~$ grep ${s.key} /var/log/nginx/files.access.log | tail -${s.k}`, ...accessLog(r, day, Number(s.k), { path: `/t/${s.tid}/${s.key}.pdf`, status: 200, bytes: Number(s.bytes) })],
		causes: [
			{
				where: 'file',
				found: [
					'Then I ran pdfinfo on it, and that\'s the answer. The file is damaged inside: its cross-reference table points past the end of the file. Some viewers repair that without a word (Chrome on a Mac does, which is why it opens for the tutor) and others refuse it (the viewer on school Chromebooks, Adobe on Android). The Producer line says Microsoft Print To PDF, which is where this kind of damage comes from, so this is how the file was saved, not something that happened here.',
					'pdfinfo complains straight away. The PDF\'s internal index is broken, which is what a "print to PDF" driver produces when it\'s interrupted or runs short of memory. Desktop Chrome and Preview rebuild the index on the fly and show the pages; stricter viewers give up. Nothing on our side writes to stored PDFs, so this is how it arrived.'
				],
				show: (r, s) => [...pdfinfo(r, s, { broken: true, creator: 'Microsoft® Word for Microsoft 365', producer: 'Microsoft: Print To PDF' })],
				told: 'Our ops team took a close look at the file. The PDF itself is damaged inside, from the way it was saved, in a way that some viewers quietly repair and others refuse. That\'s why it opens on your laptop and not on {student}\'s.',
				ask: 'Could you open the original in Word and save it again with File, Export, PDF (rather than printing to PDF), then replace the attachment on the lesson? If you\'d rather, send the new copy to me and I\'ll attach it for you.',
				done: 'I exported it again the way you said and replaced it. {student} opened it straight away, and so did the others. Thank you, I had no idea there were two ways of making a PDF.',
				around: 'Until you have a chance to save it again, I\'ve made a repaired copy and attached it to this reply. If you replace the attachment on the lesson with it, it will open everywhere. For the next ones, File, Export, PDF in Word avoids the problem.',
				ends: ['fixed', 'around', 'waiting', 'quiet']
			},
			{
				where: 'client',
				found: [
					'The file itself is fine. pdfinfo reads it cleanly and it opens in every viewer I tried. What stands out is that it\'s a fillable form, and the failing requests all come from Android\'s download manager, which means the student\'s tablet hands the file to a separate PDF app rather than showing it in the browser. Several of the free PDF apps on Android can\'t open forms at all and say the file is damaged.',
					'Nothing wrong with the file: it parses cleanly and opens everywhere I tried, including the admin view. It has form fields, though, and the student\'s requests come from the Android download manager rather than a browser, so it\'s being opened in whatever PDF app is the default on that tablet. Some of those apps refuse forms with a "damaged file" message.'
				],
				show: (r, s, day) => [...pdfinfo(r, s, { form: true, creator: 'Writer', producer: 'LibreOffice 7.6' }), `ops@ops-1:~$ grep ${s.key} /var/log/nginx/files.access.log | grep -c Dalvik`, String(Number(s.k2) + int(r, 0, 3)), `ops@ops-1:~$ grep ${s.key} /var/log/nginx/files.access.log | grep Dalvik | tail -${s.k2}`, ...accessLog(r, day, Number(s.k2), { path: `/t/${s.tid}/${s.key}.pdf`, status: 200, bytes: Number(s.bytes), agent: 'Dalvik/2.1.0 (Linux; U; Android 11; SM-T220 Build/RP1A.200720.012)' })],
				told: 'Our ops team checked the file, and there\'s nothing wrong with it: it opens in every browser and viewer they tried. It\'s a worksheet with fillable fields, and {student}\'s tablet is opening it in a separate PDF app that can\'t handle fillable forms, which is why that app calls it damaged.',
				ask: 'Could you ask {student} which app opens when {she} taps the file? If it\'s anything other than Chrome or Adobe Acrobat, changing the default for PDFs (or opening the lesson in Chrome and tapping the file there) should do it. Let me know how it goes.',
				done: '{She} was using some app that came with the tablet. {She} installed Acrobat and it opens fine now, fields and all. Thanks for getting to the bottom of it.',
				around: 'The quickest fix is for {student} to open the lesson in Chrome on the tablet and tap the file there, so it opens in the browser. If {she} needs to fill it in on the tablet, the free Adobe Acrobat app handles the fields too.',
				ends: ['around', 'waiting', 'quiet', 'fixed']
			}
		]
	},
	// 2. An upload refused as too large.
	{
		role: 'tutor',
		subjects: ['Upload keeps getting rejected', 'Can\'t attach my practice packet', 'File too big?'],
		opens: [
			'I\'m trying to attach my {subj} practice packet to next week\'s lessons and the upload keeps stopping with "This file is too large". My computer says the file is {mb} MB. I\'ve tried four times now, on two different computers.',
			'Hi there, every time I upload "{file}" the page thinks for a while and then tells me the file is too large. Smaller files go through fine. It\'s a packet I put together from scans of my own handwritten notes, which my students really like, so I\'d rather not split it up.'
		],
		guess: [
			'Hi {first}, thanks for getting in touch. Lesson attachments can be up to 25 MB each. Could you check the size of the file on your computer (right-click and choose Get Info or Properties) and tell me exactly what it says? If it\'s over the limit, splitting it into two files is the quickest way round it.',
			'Thanks, {first}. The limit for a single file is 25 MB. If you\'re close to it, it\'s worth checking the exact size, because computers round sizes differently. Could you send me a screenshot of the error and of the file\'s size?'
		],
		details: [
			'It says {mb} MB. Here\'s a screenshot of the error and one of the file\'s details. I really don\'t want to split it, the students print it as one booklet.',
			'The details say {mb} MB. I\'ve attached a screenshot of the error too. It\'s the same error on my laptop and on the school\'s computer.'
		],
		escalate: [
			'Ops, tutor {tid} can\'t upload a PDF the tutor\'s computer shows as {mb} MB. Our limit is 25 MB. Could you check what the app logged for the attempts? Screenshots are on the ticket.',
			'Asking ops to look at the upload logs for tutor {tid}: rejected as too large several times today, and the tutor\'s own count is {mb} MB.'
		],
		look: [
			'The app logged every attempt. Each one was turned away by the upload limit before anything was written to the uploads volume:',
			'Pulled the attempts from the app log. Same result each time: refused at the limit, nothing stored.'
		],
		first: (r, s, day) => [`ops@ops-1:~$ grep 'tutor=${s.tid}' /var/log/acme/app.log | grep upload`, ...appLog(r, day, Array.from({ length: int(r, 4, 8) }, () => `upload refused tutor=${s.tid} lesson=${s.lid} reason=too_large size=${s.bytes} limit=25000000 name="${s.file}"`))],
		causes: [
			{
				where: 'file',
				set: (r, s) => {
					const mb = int(r, 270, 640) / 10;
					s.mb = mb.toFixed(1);
					s.bytes = String(Math.round(mb * 1_000_000) + int(r, 0, 99999));
					s.pages = String(int(r, 18, 34));
					s.small = (mb / int(r, 8, 12)).toFixed(1);
				},
				found: [
					'The file really is over the limit: {bytes} bytes. It\'s a scan, and every page is a full-color image at 600 dpi, so each of its {pages} pages weighs well over a megabyte even though most of each page is white paper. Nothing in the app is misbehaving; this one is simply that large.',
					'The limit is doing its job. The PDF is {pages} pages of scanned images at 600 dpi in full color, which is why it\'s {bytes} bytes. I ran a copy through a standard "reduce file size" pass and it came out at {small} MB and still prints cleanly.'
				],
				show: (r, s) => [`ops@ops-1:~$ pdfimages -list /tmp/${s.key}.pdf | head -12`, 'page   num  type   width height color comp bpc  enc interp  object ID x-ppi y-ppi size ratio', '--------------------------------------------------------------------------------------------', ...Array.from({ length: 10 }, (_, i) => `${String(i + 1).padStart(4)}  ${String(i).padStart(4)}  image    5100  6600  rgb     3   8  jpeg   no        ${12 + i * 7}  0   600   600 ${(Number(s.bytes) / Number(s.pages) / 1_000_000).toFixed(1)}M  ${int(r, 4, 9)}.${int(r, 0, 9)}%`)],
				told: 'Our ops team looked at the file. It really is over our 25 MB limit: it\'s made of scans at a very high resolution, in full color, so every page is a large photo.',
				around: 'You don\'t need to split it. If you open it in Preview on a Mac, choose File, Export and pick the "Reduce File Size" filter (or use "Reduce file size" in Adobe Acrobat), it comes down to a fraction of the size and still prints well. Our ops team tried it on a copy and got {small} MB.',
				ask: 'Could you make a smaller copy with Preview\'s File, Export and the "Reduce File Size" filter (or Acrobat\'s "Reduce file size") and try the upload again? Our ops team tried it on a copy and got {small} MB, which goes through fine.',
				done: 'Did the Export thing and it went down to {small} MB. Uploaded without a hitch, and it prints just as nicely. Thanks!',
				ends: ['around', 'fixed', 'waiting', 'quiet']
			},
			{
				where: 'app',
				set: (r, s) => {
					const mib = int(r, 241, 249) / 10;
					s.mb = mib.toFixed(1);
					s.bytes = String(Math.round(mib * 1_048_576) + int(r, 0, 9999));
				},
				found: [
					'Here\'s the catch. The limit counts a megabyte as 1,000,000 bytes, so the limit is 25,000,000 bytes. The tutor is on Windows, which counts a megabyte as 1,048,576 bytes, so the file that shows as {mb} MB there is {bytes} bytes to us, just over the line. The help page and the error both say "25 MB" without saying which, so from the tutor\'s side the file is under the limit and we refuse it anyway.',
					'It comes down to what "MB" means. Our check refuses anything over 25,000,000 bytes. Windows shows sizes in units of 1,048,576 bytes, so this file is {mb} MB on the tutor\'s screen and {bytes} bytes to us. Anyone on Windows with a file between about 23.8 and 25 MB gets told it\'s too large while their computer says it isn\'t.'
				],
				show: (r, s) => [`ops@ops-1:~$ python3 -c 'print(${s.bytes} / 1_000_000, ${s.bytes} / 1_048_576)'`, `${(Number(s.bytes) / 1_000_000).toFixed(6)} ${(Number(s.bytes) / 1_048_576).toFixed(6)}`, `ops@ops-1:~$ grep 'reason=too_large' /var/log/acme/app.log | grep -o 'size=2[56][0-9]\{6\}' | sort | uniq -c | sort -rn | head -6`, ...Array.from({ length: 6 }, () => int(r, 1, 4)).sort((a, b) => b - a).map((count) => `${String(count).padStart(7)} size=${int(r, 25000001, 26214000)}`)],
				told: 'Our ops team found the cause, and it\'s on our side. Our limit counts a megabyte slightly differently from Windows, so a file that Windows shows as just under 25 MB can be just over it for us. The error message should make that clear, and it doesn\'t.',
				bug: 'Attachment limit is 25,000,000 bytes, but the help page and the error say "25 MB"; files that Windows shows as 23.8 to 25 MB are refused. Raise the limit to 25 MiB (26,214,400 bytes) or give the limit in bytes in the error.',
				around: 'Until it\'s changed, saving the file again with a little compression gets it under: in Word, File, Save As, PDF, then "Minimum size (publishing online)" usually trims enough.',
				ends: ['eng', 'around']
			}
		]
	},
	// 3. Another tutor's worksheet on a family's lesson.
	{
		role: 'parent',
		set: (r, s) => {
			s.other = `${pick(r, firstNames)} ${pick(r, lastNames)}`;
			s.otherTid = String(int(r, 1200, 9800));
		},
		subjects: ['Wrong worksheet attached to {student}\'s lesson', 'This isn\'t our tutor\'s worksheet', 'Question about a file on the lesson page'],
		opens: [
			'Hello, my {child} {student} has weekly {subj} lessons with {tutor}. The worksheet attached to this week\'s lesson is for a different class altogether. It has another tutor\'s name in the footer and it\'s about a topic {student} doesn\'t even study. I\'m not upset, but I\'d like to know how this happened, and whether someone else can see {student}\'s work too.',
			'Hi, quick question. On {student}\'s lesson for {day} there\'s a PDF called "{file}", but when we open it, it\'s a worksheet from someone called {other}. Our tutor, {tfirst}, didn\'t attach anything like it and has no idea where it came from. What\'s going on?'
		],
		guess: [
			'Thank you for letting us know, {first}, and I understand why you\'d want to know how it happened. Your {child}\'s files and work are visible only to {student}, to you and to {tfirst}, and nothing I can see suggests anyone else has seen them. Could you tell me the date of the lesson and the name shown on the file, so I can find the exact attachment?',
			'Hi {first}, thanks for flagging this. I can see the lesson. Before I go further, could you confirm which file you mean, its name and roughly when you first noticed it? I\'ll have someone check where it came from.'
		],
		details: [
			'It\'s the lesson on {when}. The file shows as "{file}" on the page, but the worksheet inside has "{other}" at the bottom of every page.',
			'The one on {when}. {tfirst} looked at it on a video call with us and was as surprised as we were. The name on the page is right, but what\'s inside isn\'t.'
		],
		escalate: [
			'Ops: lesson {lid} (tutor {tid}) shows an attachment named "{file}" whose content is another tutor\'s worksheet. The parent wants to know whether anything went the other way. Can you check what the attachment points to?',
			'Could ops look at lesson {lid}? The attachment\'s name is our tutor\'s, but the PDF it opens is from a different tutor ({other}). Please also check whether anyone outside the lesson could see this family\'s files.'
		],
		look: [
			'The attachment record on the lesson points at a stored file that was uploaded by a different tutor:',
			'Looked up the attachment. The name on the lesson is the tutor\'s own, but the stored file it points at sits in another tutor\'s folder:'
		],
		first: (r, s) => psql(`SELECT a.id, a.name, f.id AS file_id, f.tutor_id, f.created_at::date FROM lesson_files a JOIN files f ON f.id = a.file_id WHERE a.lesson_id = ${s.lid};`, ['id', 'name', 'file_id', 'tutor_id', 'created_at'], [[int(r, 80000, 99999), `${s.subj} - warm-ups ${int(r, 1, 9)}.pdf`, int(r, 300000, 499999), Number(s.tid), s.whenIso], [int(r, 80000, 99999), s.file, int(r, 300000, 499999), Number(s.otherTid), s.whenIso]]),
		causes: [
			{
				where: 'db',
				found: [
					'This goes back to the account merge on {when2}: the tutor had two accounts and support asked us to merge them. The query that moved the attachments across matched them by their position on each lesson instead of by id, and on this one lesson the second attachment was pointed at a file id belonging to someone else. I went through every other lesson touched by that merge: this is the only crossed attachment, and none of this family\'s files were ever attached anywhere outside their own lessons.',
					'The attachment was rewritten on {when2}, during the merge of the tutor\'s two accounts. The update matched attachments by position rather than id, and it pointed this one at the wrong file. I checked all {m} attachments that merge touched: this is the only one that\'s wrong. The audit table shows no other lesson ever pointed at this family\'s files.'
				],
				show: (r, s) => psql(`SELECT lesson_file_id, old_file_id, new_file_id, changed_by, changed_at FROM attachment_audit WHERE lesson_file_id IN (SELECT id FROM lesson_files WHERE lesson_id = ${s.lid});`, ['lesson_file_id', 'old_file_id', 'new_file_id', 'changed_by', 'changed_at'], [[int(r, 80000, 99999), int(r, 300000, 499999), int(r, 300000, 499999), 'merge_accounts', `${s.when2Iso} 22:${pad(int(r, 10, 59))}`], [int(r, 80000, 99999), int(r, 300000, 499999), int(r, 300000, 499999), 'merge_accounts', `${s.when2Iso} 22:${pad(int(r, 10, 59))}`]]),
				told: 'We\'ve found what happened. When {tfirst}\'s two accounts were combined into one on {when2}, a mistake in how we moved the files pointed this one attachment at another tutor\'s worksheet. It was the only one affected, and no one outside your lessons has ever been able to see {student}\'s files or work.',
				fix: 'Pointed the attachment back at the tutor\'s own file, which was still in the tutor\'s folder, and checked the lesson page shows the right worksheet. Every other attachment from that merge is correct.',
				changed: 'We\'ve pointed the attachment back to {tfirst}\'s own worksheet, so the lesson now shows the right one. Thank you for telling us. Could you have a look and let me know it opens as expected?',
				ends: ['fixed']
			},
			{
				where: 'app',
				found: [
					'It comes from Copy lesson. {tfirst} copied this lesson from a template another tutor shared in the {subj} tutors\' group, and copies keep pointing at the original\'s files instead of getting their own. When {other} replaced the file on the original on {when2} with a new worksheet, every copy started showing the replacement. Nothing is crossed in the data as such; this is how copies work at the moment, and it will happen to anyone who copies a shared lesson.',
					'This one is Copy lesson. The lesson was copied from a shared template, and a copied lesson\'s attachments point at the template\'s files. The template\'s owner swapped that file for a different worksheet on {when2}, and every lesson copied from it, {m} of them, now shows the new worksheet. Families only ever see the template file through their own lessons, so nothing of theirs went anywhere else.'
				],
				show: (r, s) => psql(`SELECT id, tutor_id, copied_from, created_at::date FROM lessons WHERE copied_from = (SELECT copied_from FROM lessons WHERE id = ${s.lid}) LIMIT 5;`, ['id', 'tutor_id', 'copied_from', 'created_at'], Array.from({ length: 5 }, (_, i) => [i === 0 ? Number(s.lid) : int(r, 210000, 389999), i === 0 ? Number(s.tid) : int(r, 1200, 9800), Number(s.lid) - int(r, 900, 9000), s.whenIso])),
				told: 'We\'ve found the cause, and it\'s a fault in our app. {tfirst} built this lesson by copying a template that another tutor shared, and at the moment copied lessons keep showing whatever file is on the original. When that tutor changed the original\'s worksheet, it changed on your lesson too. Nothing of {student}\'s has been visible to anyone else.',
				bug: 'Copy lesson copies attachments by reference: when the owner of the source lesson replaces a file, every copy shows the new file. Copies should get their own copy of each attachment.',
				around: 'I\'ve let {tfirst} know. If {tfirst} removes the attachment and adds the worksheet again from their own computer, the lesson gets its own copy and won\'t change again.',
				ends: ['eng', 'around']
			}
		]
	},
	// 4. A link that answers 404.
	{
		role: 'tutor',
		subjects: ['Students get "Not Found" on one file', 'Broken link on my lesson page', '404 when opening a worksheet'],
		opens: [
			'One of my files gives students a "404 Not Found" page when they click it. All my other files work. It\'s called "{file}". I\'ve removed it and added it again twice and it\'s the same every time.',
			'Hi, I tutor {subj}, and today two students told me the worksheet link on our lesson goes to an error page. When I click it from my own account I get the same thing. The file shows up in my library with the right name and size.'
		],
		guess: [
			'Thanks, {first}. Sometimes a link stops working when a file is replaced while the page is open. Could you sign out, sign back in and try again, and ask the students to reload the lesson page as well?',
			'Hi {first}, sorry about that. Could you tell me which browser you use, and try opening the file from your library rather than from the lesson? That helps me work out whether it\'s the file or the link.'
		],
		details: [
			'Signed out and in, same thing. From the library it\'s the same 404. I use Safari on a Mac.',
			'The library gives the same error. Chrome on my Mac, and the students are on all sorts of things.'
		],
		escalate: [
			'Ops, the file "{file}" for tutor {tid} gives a 404 from both the lesson and the library. The tutor\'s other files are fine. Can you check the file is where the link says it is?',
			'Could ops look at a 404 on a single file? Tutor {tid}, "{file}", lesson {lid}. Re-adding it didn\'t help.'
		],
		look: [
			'The file is on disk and its record has the right name, but none of the requests for it find it. Every one is a 404:',
			'The stored file is there. The requests that come in for it are all answered 404 by the files host:'
		],
		first: (r, s, day) => [`ops@ops-1:~$ grep '/t/${s.tid}/${s.key}' /var/log/nginx/files.access.log | tail -${s.k}`, ...accessLog(r, day, Number(s.k), { path: `/t/${s.tid}/${s.key}/${s.urlName}`, status: 404, bytes: 153 })],
		causes: [
			{
				where: 'app',
				set: (r, s) => {
					const name = pick(r, [['Ejercicios de conjugación', 'conjugacio%CC%81n'], ['Teoría de números', 'Teori%CC%81a'], ['Vocabulario - lección {n}', 'leccio%CC%81n'], ['Révision - chapitre {n}', 'Re%CC%81vision']]);
					s.file = `${fill(name[0]!, s)}.pdf`;
					s.urlName = `${encodeURIComponent(s.file).replace(/%C3%B3/g, 'o%CC%81').replace(/%C3%AD/g, 'i%CC%81').replace(/%C3%A9/g, 'e%CC%81').replace(/%C3%89/g, 'E%CC%81')}`;
				},
				found: [
					'It\'s the accent. The name was stored as the Mac sent it, with the accent as a separate character after the letter (the decomposed form). The file on disk has the composed form, a single accented letter, so the two never match and the files host answers 404. It happens to any file name with an accent uploaded from a Mac, which is why it\'s only this one of the tutor\'s files.',
					'The file name has an accented letter. macOS sends file names in decomposed form (the letter, then a combining accent), we stored that in the record, and the link is built from the record, but the file was written to disk with the composed form. Same name to a person, different bytes to the files host. Any accented name uploaded from a Mac will do this.'
				],
				show: (r, s) => [`ops@ops-1:~$ ls /srv/acme/uploads/tutors/${s.tid}/${s.key}/ | python3 -c 'import sys, unicodedata; n = sys.stdin.read().strip(); print(n, len(n), unicodedata.is_normalized("NFC", n))'`, `${s.file} ${s.file.length} True`, ...psql(`SELECT name, length(name), name IS NFC NORMALIZED AS nfc FROM files WHERE key = '${s.key}';`, ['name', 'length', 'nfc'], [[s.file, s.file.length + 1, 'f']])],
				told: 'Our ops team found the cause, and it\'s a fault on our side. The accent in the file\'s name is stored in a slightly different way from the name on our file server when the file comes from a Mac, so the link looks for a name that, as far as the server is concerned, doesn\'t exist.',
				fix: 'Rewrote this file\'s stored name in the composed form, and the link answers 200 now. {filed} {eng} for the general case.',
				changed: 'We\'ve corrected the name of this file on our side and the link works again. Other files with accents that you upload from your Mac may hit the same problem until our engineers fix it properly; naming them without accents avoids it in the meantime.',
				bug: 'Download links 404 for files whose names contain accents when uploaded from macOS: the record stores the decomposed name, the file on disk has the composed one. Normalize names to NFC on upload and fix the existing records.',
				around: 'Until our engineers fix it, renaming the file without the accent (in your library, click the file\'s name, then Rename) makes the link work straight away.',
				ends: ['fixed', 'eng', 'around']
			},
			{
				where: 'app',
				set: (r, s) => {
					s.file = `${s.subj} problem set #${s.n}.pdf`;
					s.urlName = encodeURIComponent(`${s.subj} problem set `).replace(/%20/g, ' ');
				},
				found: [
					'The file name has a # in it. The lesson page puts the name into the link without encoding it, so the browser takes everything after the # as an anchor within the page and asks the files host for a name that stops at "set ". There\'s no file of that name, hence the 404. Any file with a # in its name does this.',
					'Look at the paths: they stop at "problem set ". The name has a #, and the link is built without encoding the name, so the browser cuts the request there and treats the rest as an anchor. The file is fine; the link to it is wrong for any name with a #.'
				],
				show: (r, s) => psql(`SELECT id, name, key FROM files WHERE tutor_id = ${s.tid} AND name LIKE '%#%';`, ['id', 'name', 'key'], [[int(r, 300000, 499999), s.file, s.key]]),
				told: 'Our ops team found the cause, and it\'s a fault on our side: the # in the file\'s name breaks the link our page builds for it, so the link points at a file that doesn\'t exist.',
				bug: 'Download links aren\'t URL-encoded: a # in a file name cuts the link short and gives a 404. Encode the name when building the link.',
				around: 'Until it\'s fixed, renaming the file without the # (for example "problem set {n}") makes the link work. In your library, click the file\'s name, then Rename.',
				ask: 'Could you rename the file without the # (for example "problem set {n}")? In your library, click the file\'s name, then Rename. The link will work as soon as you do. Let me know if it doesn\'t.',
				ends: ['eng', 'around', 'waiting']
			}
		]
	},
	// 5. A lesson shown at the wrong time.
	{
		role: 'parent',
		set: (r, s) => {
			s.city = pick(r, ['San Jose', 'Fresno', 'Sacramento', 'Oakland', 'Pasadena', 'San Diego', 'Riverside', 'Santa Rosa']);
		},
		subjects: ['Lesson showing at the wrong time', 'Times are off by hours', 'Missed a lesson because of the time shown'],
		opens: [
			'We missed {student}\'s {subj} lesson this week because of the time we were shown. We agreed {day}s at {agreed} our time with {tfirst}, and what we see is {shown}. This has happened once before. Which time is the right one going forward? I don\'t want to pay for lessons we miss because of the app.',
			'Hi, the times on {student}\'s lessons don\'t match what we agreed with {tfirst}. We agreed {day}s at {agreed}, and we see {shown}. {tfirst} says it\'s {agreed} on the tutor side.'
		],
		guess: [
			'Thanks for writing in, {first}, and sorry about the missed lesson. Lesson times are shown in the time zone set on each account. Could you check Settings, then Time zone, on your account and tell me what it says? If it\'s wrong, changing it will correct every lesson.',
			'Hi {first}, I\'m sorry for the confusion. The first thing to check is the time zone on your account: Settings, then Time zone. Could you tell me what it shows?'
		],
		details: [
			'Settings says Pacific Time (Los Angeles), which is right, we\'re in {city}. So that isn\'t it.',
			'It says Pacific. We\'re in {city}. I checked {student}\'s account too and it says the same.'
		],
		escalate: [
			'Ops, the family sees lesson series {lid} three hours away from what the tutor sees. Family\'s account is set to Pacific. Could you check the stored times and the tutor\'s settings?',
			'Asking ops to look at lesson {lid} and its series: family and tutor see different times, three hours apart. The family\'s time zone setting is correct.'
		],
		look: [
			'Here are the stored times for the series and the time zones on both accounts:',
			'Stored start times (UTC) for the next few lessons, with each side\'s time zone setting:'
		],
		first: (r, s) => psql(`SELECT l.id, l.starts_at, t.time_zone AS tutor_tz, p.time_zone AS family_tz FROM lessons l JOIN tutors t ON t.id = l.tutor_id JOIN families p ON p.id = l.family_id WHERE l.series_id = ${s.lid} AND l.starts_at > now() ORDER BY 2 LIMIT 4;`, ['id', 'starts_at', 'tutor_tz', 'family_tz'], Array.from({ length: 4 }, (_, i) => {
			const date = s.seriesDates.split(',')[i]!;
			const winter = date >= '2026-11-01';
			const start = s.utcStart === 'east' ? (winter ? `${date} 22:30:00` : `${date} 21:30:00`) : `${isoDate(Number(s.seriesDay) + i * 7 + 1)} ${winter ? '01:30:00' : '00:30:00'}`;
			return [Number(s.lid) + i * int(r, 30, 90), `${start}+00`, s.tutorTz, 'America/Los_Angeles'];
		})),
		causes: [
			{
				where: 'db',
				set: (r, s) => {
					s.agreed = '5:30';
					s.shown = '2:30';
					s.utcStart = 'east';
					s.tutorTz = '';
				},
				found: [
					'The tutor\'s account has no time zone at all. It\'s one of the accounts brought over from the old booking system in 2024, which had no time zone field, and when it\'s empty the app falls back to Eastern. So when {tfirst} booked "5:30" it was stored as 5:30 Eastern, which the family\'s account, correctly set to Pacific, shows as 2:30. I found {m} other tutor accounts from the 2024 import with no time zone.',
					'The family side is right; it\'s the tutor\'s account. Its time zone is empty, as on every account imported from the old booking system that nobody has edited since, and the app treats empty as Eastern. The tutor typed 5:30 meaning Pacific, it was stored as 5:30 Eastern, and the family sees 2:30 Pacific. {m} other imported tutors have an empty time zone.'
				],
				show: (r, s) => psql('SELECT count(*) FROM tutors WHERE time_zone IS NULL AND created_at < \'2024-07-01\';', ['count'], [[Number(s.m)]]),
				told: 'We found the cause. {tfirst}\'s account was missing its time zone, which happens with some accounts that were moved over from our old booking system, and our system was treating {tfirst}\'s times as Eastern. So the lessons {tfirst} booked for {agreed} were stored three hours early.',
				fix: 'Set the tutor\'s time zone to America/Los_Angeles and moved the {n} future lessons of the series three hours later, so they\'re at 5:30 Pacific. Added a credit for the missed lesson at support\'s request. The {m} other accounts are listed for the tutor success team to contact.',
				changed: 'We\'ve set the time zone on {tfirst}\'s account and moved the upcoming lessons to the time you agreed, {agreed} Pacific. We\'ve also credited the missed lesson to your account. Could you check that the next lessons now show {agreed}?',
				ends: ['fixed']
			},
			{
				where: 'client',
				set: (r, s) => {
					s.agreed = '5:30';
					s.shown = '8:30';
					s.utcStart = 'west';
					s.tutorTz = 'America/Los_Angeles';
				},
				found: [
					'Nothing on our side is off. The series is stored at 5:30 PM Pacific, both accounts are set to Pacific, and the invites we send carry the Los Angeles time zone. A three-hour shift on a correct invite is what a phone calendar does when it\'s set to show events in Eastern time. Worth asking the family where exactly they see 8:30.',
					'Everything here agrees: the stored times are 5:30 PM Pacific, both settings are Pacific and the calendar invites say so too. The 8:30 has to come from wherever the family reads the time. An iPhone with Time Zone Override set to New York shows exactly this.'
				],
				show: (r, s) => [`ops@ops-1:~$ curl -s http://app-1.internal/internal/lessons/${s.lid}/invite.ics`, 'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Acme Tutors//Lessons//EN', 'METHOD:REQUEST', ...vtimezone, 'BEGIN:VEVENT', `UID:lesson-${s.lid}`, `DTSTART;TZID=America/Los_Angeles:${s.seriesDates.split(',')[0]!.replace(/-/g, '')}T173000`, `DTEND;TZID=America/Los_Angeles:${s.seriesDates.split(',')[0]!.replace(/-/g, '')}T183000`, `SUMMARY:${s.subj} with ${s.tutor}`, 'RRULE:FREQ=WEEKLY', `ORGANIZER;CN=${s.tutor}:mailto:lessons@notifications.example.com`, 'STATUS:CONFIRMED', 'END:VEVENT', 'END:VCALENDAR'],
				told: 'Everything on our side shows {agreed} Pacific, including the calendar invites we send. A difference of exactly three hours usually means the calendar on a phone is set to show events in Eastern time.',
				ask: 'On an iPhone that\'s Settings, then Calendar, then Time Zone Override. If it\'s on and set to New York, turning it off will bring the lessons back to {agreed}. Could you check it and let me know?',
				done: 'That was it! My husband turned it on when we were in New York in the summer and never turned it off. Everything shows {agreed} now. Sorry for the trouble!',
				ends: ['waiting', 'quiet', 'fixed']
			}
		]
	},
	// 6. A paid invoice still shown as unpaid.
	{
		role: 'parent',
		set: (r, s) => {
			s.sibling = pick(r, students.filter(([name]) => name !== s.student))[0];
			s.paidAt = `${pad(int(r, 15, 23))}:${pad(int(r, 0, 59))}`;
		},
		subjects: ['Charged but invoice says unpaid', 'Invoice {inv} still shows as due', 'Payment question'],
		opens: [
			'I paid invoice {inv} on {when} and my card was charged {amt}, but the invoice still says Unpaid and I got a reminder email this morning. I don\'t want to be charged twice. Can you look into it?',
			'Hello, I\'m confused about our billing. The app shows an unpaid invoice for {amt} with a red banner, but the money left my account days ago. I have the bank statement in front of me.'
		],
		guess: [
			'Hi {first}, thanks for writing, and sorry for the worry. Payments can take a few minutes to show, but not days. Could you send me the last four digits of the card and the date of the charge, so I can match it to the invoice?',
			'Thanks, {first}. I can see the invoice. To find the payment, could you tell me the card you paid with (the last four digits) and the date it was charged?'
		],
		details: [
			'Card ending {card}, charged on {when}, {amt}. The statement says "ACME TUTORS".',
			'It\'s the card ending {card}. The charge went through on {when}.'
		],
		escalate: [
			'Ops: parent says invoice {inv} is unpaid in the app but their card was charged {amt} on {when}. Could you check the payment records against the invoice?',
			'Could ops look at billing for this family? Invoice {inv} unpaid in the app, card ending {card} charged {amt} on {when}.'
		],
		look: [
			'Payments recorded against this family\'s account in the last month:',
			'Here\'s everything the card processor reported for this family since the start of the month:'
		],
		first: (r, s) => psql(`SELECT id, invoice_id, amount, status, received_at FROM payments WHERE family_id = ${s.fid} ORDER BY received_at DESC LIMIT 3;`, ['id', 'invoice_id', 'amount', 'status', 'received_at'], [[int(r, 700000, 899999), Number(s.payFor), s.amt.slice(1), 'succeeded', `${s.whenIso} ${s.paidAt}`], [int(r, 600000, 699999), Number(s.inv) - int(r, 300, 900), s.amt.slice(1), 'succeeded', `${s.when2Iso} ${pad(int(r, 1, 23))}:${pad(int(r, 0, 59))}`]]),
		causes: [
			{
				where: 'db',
				set: (r, s) => {
					s.payFor = s.inv;
				},
				found: [
					'The payment came in and is matched to invoice {inv}, but the invoice itself was never marked paid. The card processor sent its "succeeded" message twice within a second, the two updates of the invoice ran into each other, and the one that would have set it paid was rolled back. The money reached us; the invoice row just doesn\'t say so. I found {m} more invoices from the same night in the same state.',
					'The family is right: the payment for invoice {inv} is there and succeeded. The invoice still has paid = false: two copies of the processor\'s message arrived together and the update from one of them was rolled back. {m} other invoices from the same evening look the same.'
				],
				show: (r, s) => psql(`SELECT id, family_id, total, paid, reminder_sent_at FROM invoices WHERE id = ${s.inv};`, ['id', 'family_id', 'total', 'paid', 'reminder_sent_at'], [[Number(s.inv), Number(s.fid), s.amt.slice(1), 'f', `${s.whenIso} 16:00`]]).concat((() => {
					const at = `${s.whenIso}T${s.paidAt}:${pad(int(r, 10, 50))}`;
					const event = `evt_${hex(r, 14)}`;
					return [`ops@ops-1:~$ grep 'invoice=${s.inv}' /var/log/acme/payments.log`, `${at}.104Z processor event type=charge.succeeded id=${event} invoice=${s.inv}`, `${at}.391Z processor event type=charge.succeeded id=${event} invoice=${s.inv}`, `${at}.402Z payment recorded invoice=${s.inv} amount=${s.amt.slice(1)}`, `${at}.977Z invoice update rolled back invoice=${s.inv} error="deadlock detected"`, `${at}.981Z processor event duplicate ignored id=${event}`];
				})()),
				told: 'Your payment reached us on {when}, exactly as you said. Our system failed to mark the invoice as paid when it arrived, which is why you saw the banner and the reminder.',
				fix: `Marked invoice {inv} paid (UPDATE invoices SET paid = true WHERE id = {inv}) and cancelled its reminders; did the same for the {m} others after checking each against its payment.`,
				changed: 'We\'ve corrected it, so the invoice now shows Paid and the reminders have stopped. You won\'t be charged again. Could you take a look and let me know it shows correctly for you?',
				ends: ['fixed']
			},
			{
				where: 'none',
				set: (r, s) => {
					s.inv2 = String(Number(s.inv) + int(r, 1, 3));
					s.payFor = s.inv2;
				},
				found: [
					'There\'s no problem with the payment: it\'s recorded and it paid an invoice, just not this one. This family has two children on the account, and on {when} the parent paid invoice {inv2}, {sibling}\'s, which was for the same amount. Invoice {inv}, for {student}, has no payment against it yet.',
					'The payment is fine and it\'s attached to an invoice, but to {inv2}, not {inv}. Both children have invoices for the same amount this month, and the one paid on {when} was {sibling}\'s. {student}\'s is still open, so the banner is correct.'
				],
				show: (r, s) => psql(`SELECT id, student, total, paid FROM invoices WHERE family_id = ${s.fid} AND issued_at > now() - interval '30 days';`, ['id', 'student', 'total', 'paid'], [[Number(s.inv), s.student, s.amt.slice(1), 'f'], [Number(s.inv2), s.sibling, s.amt.slice(1), 't']]),
				told: 'I\'ve looked into it with our ops team. Your payment on {when} went to {sibling}\'s invoice, {inv2}, which was for the same amount, so that one is now paid. {student}\'s invoice, {inv}, is a separate one and is still open, which is why you see the banner.',
				ask: 'If you\'d like to pay {student}\'s now, the Pay button is on the invoice. If you think you were charged twice, send me the dates of both charges and I\'ll look again.',
				ends: ['explained', 'waiting']
			}
		]
	},
	// 7. A new tutor told the email is already in use.
	{
		role: 'tutor',
		subjects: ['Can\'t create my account', 'It says my email is already in use', 'Sign-up problem'],
		opens: [
			'I was approved as a tutor last week and I\'m trying to finish setting up my account, but when I enter my email it says "An account with this email already exists". I\'ve never had an account with you. I tried "Forgot password" and nothing arrives.',
			'Hi, I\'m trying to sign up to tutor {subj} and the form won\'t take my email address. It says the address is already registered. I definitely haven\'t registered before, and the password reset doesn\'t send anything.'
		],
		guess: [
			'Hi {first}, thanks for getting in touch. That message means we already have an account with that address. Could it be that you signed up some time ago, perhaps as a parent or a student? If you try "Forgot password" again and check your spam folder, the link should arrive within a few minutes.',
			'Thanks, {first}. We do have something under that address, it seems. Did you ever book a lesson with us, or take part in a school program that used Acme? Please also check your spam folder for the reset email.'
		],
		details: [
			'No, never, as far as I know. I checked spam, nothing. My email is {email}, if that helps.',
			'I\'ve looked everywhere and there\'s no email from you. I used {email}.'
		],
		escalate: [
			'Ops, a newly approved tutor can\'t sign up with {email}: told the address is taken, and no reset email arrives. Can you check what accounts exist for that address?',
			'Could ops look up {email}? Sign-up says it\'s taken, password reset sends nothing. The tutor says they never had an account.'
		],
		look: [
			'Searching for the address exactly as typed finds nothing. Searching without regard to case finds this:',
			'Here\'s what we hold for that address:'
		],
		first: (r, s) => psql(`SELECT id, email, role, created_at::date, last_sign_in_at::date FROM users WHERE lower(email) = lower('${s.email}');`, ['id', 'email', 'role', 'created_at', 'last_sign_in_at'], [[int(r, 10000, 99999), s.storedEmail, s.storedRole, s.createdIso, s.lastSignIn]]),
		causes: [
			{
				where: 'db',
				set: (r, s) => {
					s.storedEmail = s.email.charAt(0).toUpperCase() + s.email.slice(1).replace(/\.([a-z])/, (_, c: string) => `.${c.toUpperCase()}`);
					s.storedRole = 'student';
					s.createdIso = `2023-0${int(r, 1, 9)}-${pad(int(r, 1, 28))}`;
					s.lastSignIn = '';
				},
				found: [
					'There\'s an old account from 2023 with the same address in different case ({storedEmail}). The sign-up form compares addresses without regard to case, so it sees the address as taken; the reset form compares them exactly, so it finds no account and sends nothing. That account was created by the import for the {school} pilot, when students were added from a spreadsheet, and nobody has ever signed in to it.',
					'Found it: a 2023 student account, {storedEmail}, made by the bulk import for the {school} pilot and never signed in to. Sign-up checks for the address case-insensitively and refuses; reset looks it up exactly and finds nothing, so the tutor gets neither.'
				],
				show: (r, s) => psql(`SELECT count(*) FROM lessons WHERE student_user_id = (SELECT id FROM users WHERE email = '${s.storedEmail}');`, ['count'], [[0]]),
				told: 'Our ops team found an old account with your address, written with capital letters, created in 2023 when {school} ran a pilot with us and added students from a list. Nobody ever used it, but it was enough to block your sign-up, and the capitals stopped the reset email from finding it.',
				fix: 'Changed the old account\'s address to a placeholder and noted why on the account; {email} is free now. Listed the {m} other mixed-case addresses from that import for the engineers.',
				changed: 'We\'ve released your address from the old account, so you can now finish signing up with {email}. Could you try again and let me know it works?',
				ask: 'Before we change anything: were you a student at {school} in 2023? If that account is yours, we can turn it into your tutor account instead of starting a new one. Just let me know which you\'d prefer.',
				ends: ['fixed', 'waiting', 'quiet']
			},
			{
				where: 'none',
				set: (r, s) => {
					s.storedEmail = s.email;
					s.storedRole = 'parent';
					s.createdIso = `2025-0${int(r, 1, 9)}-${pad(int(r, 1, 28))}`;
					s.lastSignIn = `2025-${pad(int(r, 10, 12))}-${pad(int(r, 1, 28))}`;
				},
				found: [
					'There\'s an account with exactly this address, a parent account opened in 2025, with {n} lessons booked for a child called {student} and signed in to as recently as last December. The mail provider shows every reset email this week as delivered. I suspect they\'re landing in a Promotions tab and the account has simply been forgotten.',
					'The address belongs to a parent account from 2025 that booked {n} lessons for {student}. Reset emails to it were all delivered, according to the mail provider; nothing bounced. Looks like a forgotten account rather than anything broken.'
				],
				show: (r, s, day) => [`ops@ops-1:~$ grep '${s.email}' /var/log/acme/mail-events.log | tail -5`, ...Array.from({ length: 5 }, (_, i) => `${isoStamp(day - 2 + Math.floor(i / 2), int(r, 50000, 80000) + i * 600)} event=delivered template=password_reset to=${s.email} smtp=250`)],
				told: 'You do have an account with us: it was opened in 2025 as a parent account, and lessons were booked from it for {student}. Our reset emails were delivered to your address each time; they may be under Promotions or another tab.',
				ends: ['explained', 'quiet']
			}
		]
	},
	// 8. A search that finds no tutors.
	{
		role: 'parent',
		set: (r, s) => {
			const aliases: Record<string, string> = { 'Algebra II': 'Algebra 2', 'AP Calculus AB': 'Calculus (AP)', 'Spanish 2': 'Spanish (intermediate)', 'English 10': 'English (high school)', 'AP US History': 'US History (AP)', 'SAT Math': 'SAT prep (math)', 'ACT Reading': 'ACT prep (reading)', 'AP Statistics': 'Statistics (AP)', 'AP Chemistry': 'Chemistry (AP)', 'French 1': 'French (beginner)', 'Algebra I': 'Algebra 1' };
			s.alias = aliases[s.subj] ?? `${s.subj} (high school)`;
		},
		subjects: ['Search shows no tutors', 'Can\'t find any {subj} tutors', 'Search not working?'],
		opens: [
			'I\'m trying to find a tutor in {subj} for my {child} and the search comes back empty, which seems unlikely for a subject like that. A friend recommended {tutor}, who apparently teaches it, but {tfirst} doesn\'t come up either.',
			'Hi, your search page says "No tutors match your search" for {subj}, online, any day. My friend found a tutor on your site for the same subject last month.'
		],
		guess: [
			'Hi {first}, thanks for writing. Could you try clearing the filters (the "Clear all" link above the results) and searching again? The availability and price filters stay set from your last visit and can hide everyone.',
			'Thanks, {first}. The most common reason is a filter left over from a previous search. Could you click "Clear all" above the results and try once more?'
		],
		details: [
			'I cleared everything. Still nothing for {subj}. If I search "math" I get lots of people, but not {tutor}.',
			'No filters set, still empty. Here\'s a screenshot of what I see.'
		],
		escalate: [
			'Ops: a search for "{subj}" returns no tutors for a parent, filters cleared. A tutor who teaches it ({tutor}, {tid}) doesn\'t appear either. Could you look at what\'s stored for that tutor?',
			'Could ops check why search finds nobody for "{subj}"? Tutor {tid} ({tutor}) teaches it and should show.'
		],
		look: [
			'Tutor {tid}\'s profile is public and approved and has availability for the next four weeks, so none of the usual reasons apply:',
			'The usual suspects first: the tutor is approved, public and has open slots.'
		],
		first: (r, s) => psql(`SELECT id, status, is_public, (SELECT count(*) FROM availability a WHERE a.tutor_id = t.id) AS slots FROM tutors t WHERE id = ${s.tid};`, ['id', 'status', 'is_public', 'slots'], [[Number(s.tid), 'approved', 't', int(r, 6, 24)]]),
		causes: [
			{
				where: 'db',
				found: [
					'But the tutor has no subjects at all in tutor_subjects. It\'s one of the accounts carried over from the old booking system in 2024, where subjects were free text: the import copied them into the profile text but not into the table search uses. {m} tutors are in the same state.',
					'tutor_subjects is empty for this tutor. The subjects are in the bio ("I teach {subj}...") but search reads only tutor_subjects. Every tutor imported from the old booking system without a later profile edit is the same: {m} of them.'
				],
				show: (r, s) => psql('SELECT count(*) FROM tutors t WHERE NOT EXISTS (SELECT 1 FROM tutor_subjects ts WHERE ts.tutor_id = t.id) AND t.status = \'approved\';', ['count'], [[Number(s.m)]]),
				told: 'Thanks for your patience. Some tutors who joined us before 2024 had their subjects stored in a way our search couldn\'t see, and {tfirst} was one of them. That\'s why nobody came up.',
				fix: 'Added the subjects from the tutor\'s profile text to tutor_subjects; search finds the tutor now. The {m} other imported tutors without subjects are on the tutor success team\'s list, to confirm with each tutor before we add theirs.',
				changed: 'We\'ve fixed that for {tfirst}, so a search for {subj} now shows {tfirst}. Could you try again?',
				ends: ['fixed']
			},
			{
				where: 'none',
				found: [
					'Search is working; the subject is just called something else. We list it as "{alias}", and the search box matches subject names, not profile text, so "{subj}" finds nothing. The tutor is listed under "{alias}" along with {n2} others.',
					'Nothing broken here: the tutor has "{alias}" in tutor_subjects, which is the name we use for that subject. Searching for "{subj}" matches no subject name. Searching for "{alias}" returns {n2} tutors, this one included.'
				],
				show: (r, s) => psql(`SELECT s.name, count(*) FROM tutor_subjects ts JOIN subjects s ON s.id = ts.subject_id WHERE s.name ILIKE '%${s.alias.split(' ')[0]}%' GROUP BY 1;`, ['name', 'count'], [[s.alias, Number(s.n2)]]),
				told: 'Our list names the subject "{alias}", and the search box only matches subject names exactly as we list them. If you search for "{alias}" you\'ll see {n2} tutors, {tfirst} among them.',
				ends: ['explained']
			}
		]
	},
	// 9. A slow dashboard.
	{
		role: 'tutor',
		set: (r, s) => {
			s.years = '5';
			s.count = String(int(r, 2400, 6800));
			s.ms = String(int(r, 38000, 61000));
			s.ms2 = String(int(r, 40, 180));
		},
		subjects: ['Dashboard takes forever to load', 'Site is really slow for me', 'Lesson list won\'t load'],
		opens: [
			'For the past couple of weeks my dashboard takes nearly a minute to load, and sometimes it just shows a spinner until I give up. My students say the site is fine for them. I\'ve been tutoring on Acme since 2021, so I have a lot of lessons in there, if that matters.',
			'Hi, the "My lessons" page is painfully slow, like 40 or 50 seconds every time. Everything else on the site is quick. I\'ve tried two browsers and my phone.'
		],
		guess: [
			'Thanks, {first}. Could you try the dashboard in a private window, with extensions turned off? Browser extensions such as ad blockers sometimes slow the page right down. If it\'s still slow, tell me roughly what time of day you tried.',
			'Sorry about that, {first}. A couple of quick checks: does it happen in a private window, and at any time of day?'
		],
		details: [
			'Private window, no extensions: 47 seconds. I tried at about 8 PM and again at 7 AM, the same both times.',
			'Same in a private window. It doesn\'t matter when I try.'
		],
		escalate: [
			'Ops: tutor {tid} reports the dashboard takes 40 to 60 seconds, any browser, any time. Other tutors are fine. A long-time tutor with a lot of lessons. Could you look at what the page runs for this tutor?',
			'Could ops look at the dashboard for tutor {tid}? Consistently 40+ seconds. The tutor has been with us since 2021.'
		],
		look: [
			'The dashboard\'s lesson query is by far the slowest thing this account runs:',
			'Looked at the slowest statements first. The dashboard\'s lesson list is the one:'
		],
		first: (r, s, day) => {
			const query = 'SELECT l.*, s.name FROM lessons l JOIN students s ON s.id = l.student_id WHERE l.tutor_id = ? ORDER BY l.starts_at DESC';
			const rows = [[Number(s.ms) * int(r, 9, 30), int(r, 9, 30), query], [int(r, 90000, 160000), int(r, 300, 900), 'SELECT * FROM lessons WHERE tutor_id = ? AND starts_at > now()'], [int(r, 40000, 90000), int(r, 20, 60), 'UPDATE invoices SET paid = true WHERE id = ?'], [int(r, 20000, 40000), int(r, 100, 300), 'SELECT * FROM availability WHERE tutor_id = ? AND weekday = ?'], [int(r, 15000, 30000), int(r, 2000, 5000), 'SELECT * FROM tutors WHERE id = ?'], [int(r, 10000, 20000), int(r, 40, 90), 'UPDATE lessons SET status = ? WHERE id = ?']].sort((a, b) => Number(b[0]) - Number(a[0]));
			if (day >= 85) {
				const monday = day - calendar(day).weekday + 1;
				return [`ops@ops-1:~$ head -6 /var/log/acme/slowlog-${isoDate(monday > day ? monday - 7 : monday)}.txt`, ...rows.map(([total, count, sql]) => `${(Number(total) + 0.4).toFixed(1).padStart(10)} ms ${String(count).padStart(6)} calls ${(Number(total) / Number(count)).toFixed(1).padStart(9)} ms mean  ${sql}`)];
			}
			return psql('SELECT calls, round(total_exec_time) AS total_ms, round(mean_exec_time) AS mean_ms, left(query, 60) AS query FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 6;', ['calls', 'total_ms', 'mean_ms', 'query'], rows.map(([total, count, sql]) => [Number(count), Number(total), Math.round(Number(total) / Number(count)), (() => { let k = 0; return String(sql).replace(/\?/g, () => `$${++k}`).slice(0, 60); })()]));
		},
		causes: [
			{
				where: 'app',
				found: [
					'EXPLAIN shows why: the planner expects this tutor to have about 40 lessons, because the statistics on lessons haven\'t been refreshed in weeks, so it reads all {count} of them and sorts them instead of walking the (tutor_id, starts_at) index for the newest twenty. For a tutor with a few hundred lessons nobody notices; at {count} it\'s a large sort on every page load.',
					'The plan sorts all {count} of the tutor\'s lessons to show the newest twenty. The index on (tutor_id, starts_at) is there, but the row estimate for this tutor is 40, not {count}, so Postgres thinks a sort is cheaper. The table hasn\'t been analyzed since the big lesson import last month.'
				],
				show: (r, s) => [`tutors=> EXPLAIN ANALYZE SELECT l.*, s.name FROM lessons l JOIN students s ON s.id = l.student_id WHERE l.tutor_id = ${s.tid} ORDER BY l.starts_at DESC LIMIT 20;`, ' Limit  (cost=211.40..211.45 rows=20 width=412) (actual time=' + s.ms + '.112..' + s.ms + '.118 rows=20 loops=1)', `   ->  Sort  (cost=211.40..211.50 rows=40 width=412) (actual time=${Number(s.ms) - int(r, 10, 90)}.207..${s.ms}.114 rows=20 loops=1)`, '         Sort Key: l.starts_at DESC', '         Sort Method: external merge  Disk: 18424kB', `         ->  Hash Join  (cost=21.00..210.62 rows=40 width=412) (actual time=3.118..${Number(s.ms) - int(r, 400, 900)}.552 rows=${s.count} loops=1)`, '               Hash Cond: (l.student_id = s.id)', `               ->  Index Scan using lessons_tutor_id on lessons l  (cost=0.43..189.20 rows=40 width=380) (actual time=0.041..${Number(s.ms) - int(r, 900, 1400)}.208 rows=${s.count} loops=1)`, `                     Index Cond: (tutor_id = ${s.tid})`, ` Planning Time: 0.${int(r, 200, 900)} ms`, ` Execution Time: ${s.ms}.${int(r, 100, 999)} ms`],
				told: 'Our ops team found the cause. The page was slow because of how our database looked up a long lesson history like yours: the more lessons a tutor has, the longer it took.',
				fix: 'Ran ANALYZE on lessons. The planner now expects the right number of rows for this tutor and walks the (tutor_id, starts_at) index; the dashboard query went from {ms} ms to {ms2} ms.',
				changed: 'We\'ve made a change on our side, and the page should now load in a second or two. Could you give it a try and let me know?',
				ends: ['fixed']
			},
			{
				where: 'app',
				found: [
					'The index is there and used. The time goes on volume: the page asks for every lesson the tutor has ever had, {count} of them, with all their attachments, and only then cuts the list down to the twenty it shows. That needs a change in the app, not the database.',
					'It isn\'t a missing index this time. The dashboard fetches the tutor\'s whole history, {count} lessons plus their attachments, then paginates in the app. For most tutors that\'s small; for this one it\'s tens of megabytes per page view. The fix is to paginate in the query.'
				],
				show: (r, s) => [`ops@ops-1:~$ grep 'path=/dashboard' /var/log/acme/app.log | grep 'tutor=${s.tid}' | tail -6`, ...Array.from({ length: 6 }, () => `request path=/dashboard tutor=${s.tid} status=200 rows=${s.count} attachments=${int(r, 3000, 9000)} bytes=${int(r, 18, 46)}${int(r, 100000, 999999)} duration_ms=${Number(s.ms) + int(r, -4000, 4000)}`)],
				told: 'Our ops team found the cause, and it\'s on our side: the dashboard loads your whole lesson history before showing the first page, so it gets slower the longer you\'ve been with us.',
				bug: 'Dashboard fetches every lesson and attachment of a tutor before paginating; tutors with long histories wait 40+ seconds. Paginate in the query.',
				around: 'Until it\'s fixed, the Upcoming tab only loads lessons that haven\'t happened yet and opens quickly. Most of what you need day to day is there.',
				ends: ['eng', 'around']
			}
		]
	},
	// 10. Lessons twice in a calendar.
	{
		role: 'tutor',
		set: (r, s) => {
			s.token = hex(r, 20);
			s.oldToken = hex(r, 20);
		},
		subjects: ['Every lesson shows twice in my calendar', 'Calendar sync duplicates', 'Google Calendar problem'],
		opens: [
			'Every lesson shows up twice in my Google Calendar. It started some time in the last couple of weeks. I haven\'t changed anything that I know of.',
			'Hi, I use the calendar feed from my Acme account in my phone\'s calendar, and lately there are two of everything. It\'s making my week look twice as busy as it is.'
		],
		guess: [
			'Hi {first}, thanks for writing. Duplicates usually mean the calendar is subscribed to the feed twice. Could you check the list of subscribed calendars in Google Calendar (under "Other calendars") and see whether Acme Tutors appears more than once?',
			'Thanks, {first}. Could you look at the calendars listed on the left in Google Calendar and tell me how many Acme ones you see?'
		],
		details: [
			'There\'s only one, called "Acme Tutors lessons". I checked on my phone too.',
			'I see one Acme calendar. Here\'s a screenshot.'
		],
		escalate: [
			'Ops: tutor {tid} sees every lesson twice in Google Calendar from the feed. Only one subscription visible. Can you look at the feed requests?',
			'Could ops check the calendar feed for tutor {tid}? Duplicated events, a single visible subscription.'
		],
		look: [
			'The feed itself looks right: one event per lesson, nothing doubled.',
			'Fetched the tutor\'s feed. Each lesson appears once in it:'
		],
		first: (r, s) => [`ops@ops-1:~$ curl -s http://app-1.internal/calendar/${s.token}.ics | grep -c BEGIN:VEVENT`, String(int(r, 30, 90)), `ops@ops-1:~$ curl -s http://app-1.internal/calendar/${s.token}.ics | sed -n '25,40p'`, 'BEGIN:VEVENT', `UID:${s.uidNow}`, `DTSTAMP:20261${int(r, 0, 1)}${pad(int(r, 1, 28))}T${pad(int(r, 0, 23))}0000Z`, `DTSTART;TZID=America/Los_Angeles:2026${pad(int(r, 9, 11))}${pad(int(r, 1, 28))}T${pad(int(r, 15, 19))}0000`, `SUMMARY:${s.subj} with ${s.student}`, `URL:/lessons/${s.lid}`, 'END:VEVENT', 'BEGIN:VEVENT', `UID:${s.uidNow.replace(s.lid, String(Number(s.lid) + 37))}`, `DTSTAMP:20261${int(r, 0, 1)}${pad(int(r, 1, 28))}T${pad(int(r, 0, 23))}0000Z`, `DTSTART;TZID=America/Los_Angeles:2026${pad(int(r, 9, 11))}${pad(int(r, 1, 28))}T${pad(int(r, 15, 19))}3000`, `SUMMARY:${pick(r, subjects)} with ${pick(r, students)[0]}`, `URL:/lessons/${Number(s.lid) + 37}`, 'END:VEVENT'],
		causes: [
			{
				where: 'client',
				set: (r, s) => {
					s.uidNow = `lesson-${s.lid}`;
				},
				found: [
					'But the feed is being fetched with two different tokens: the current one, and the one from before the tutor reset the calendar link on {when2}. The old one still works. Google fetches each separately, so every lesson arrives twice. The old subscription is probably in a second Google account, or a shared calendar the tutor added long ago.',
					'The access log has Google fetching two feed URLs for this tutor, the current token and an older one from before the link was reset on {when2}. Both answer. One subscription the tutor can see, and another one somewhere else, which explains the doubles.'
				],
				show: (r, s, day) => [`ops@ops-1:~$ grep -E '${s.token.slice(0, 6)}|${s.oldToken.slice(0, 6)}' /var/log/nginx/app.access.log | tail -6`, ...accessLog(r, day, 3, { path: `/calendar/${s.token}.ics`, status: 200, bytes: int(r, 18000, 40000), agent: 'Google-Calendar-Importer' }), ...accessLog(r, day, 3, { path: `/calendar/${s.oldToken}.ics`, status: 200, bytes: int(r, 18000, 40000), agent: 'Google-Calendar-Importer' })],
				told: 'Our ops team found that your calendar feed is being fetched by two subscriptions: the current one, and one using your old link from before you reset it on {when2}. Both still work, so every lesson arrives twice. The second subscription is probably in another Google account or a calendar shared with you.',
				fix: 'Switched off the old token; it answers 404 now, and Google drops subscriptions that 404 within a day or so.',
				changed: 'We\'ve switched off the old link, so the duplicates should disappear within a day as Google refreshes. Let me know if they\'re still there on {day}.',
				ask: 'Could you check whether you\'re signed in to Google Calendar with a second account, or whether someone has shared a calendar with you that includes your lessons? Removing that old subscription will clear the duplicates.',
				ends: ['fixed', 'waiting', 'quiet']
			},
			{
				where: 'app',
				set: (r, s) => {
					s.uidNow = `lesson-${s.lid}-202610${pad(int(r, 1, 28))}T${pad(int(r, 15, 19))}00`;
				},
				found: [
					'Only one subscription and one token. But compare two fetches of the same lesson an hour apart: the event\'s UID changed after the tutor moved the lesson. Google treats a new UID as a new event and keeps the old one. Since the July release the feed builds the UID from the lesson id and its start time, not the id alone.',
					'One token, fetched by one Google subscription. The doubling is ours: the UID of each event includes the lesson\'s start time, so when a lesson moves, the feed says it\'s a different event, and Google keeps both. That changed in the July release.'
				],
				show: (r, s, day) => {
					const hour = int(r, 14, 18);
					const stamp = isoDate(day + int(r, 1, 6)).replace(/-/g, '');
					return [`ops@ops-1:~$ diff <(grep UID feed-${pad(int(r, 9, 12))}00.ics) <(grep UID feed-${pad(int(r, 13, 16))}00.ics) | head -4`, `< UID:lesson-${s.lid}-${stamp}T${pad(hour)}00`, '---', `> UID:lesson-${s.lid}-${stamp}T${pad(hour + 1)}00`];
				},
				told: 'Our ops team found the cause, and it\'s a fault on our side. Since our July update, whenever a lesson is moved our calendar feed describes it as a brand-new event, so Google keeps the old one as well.',
				bug: 'Since the July release, calendar feed UIDs include the lesson\'s start time, so moving a lesson creates a new event in subscribers\' calendars and leaves the old one. Use the lesson id alone.',
				around: 'Until our engineers fix it, removing the Acme calendar from Google Calendar and adding it again with the same link clears the leftovers. You may need to do that again after moving lessons.',
				ends: ['eng', 'around']
			}
		]
	},
	// 11. Password reset emails that never arrive.
	{
		role: 'parent',
		subjects: ['Password reset email never arrives', 'Locked out of my account', 'No reset link'],
		opens: [
			'I can\'t sign in, and the "Forgot password" email never comes. I\'ve tried five or six times over two days. I need to book {student}\'s next lessons before {tfirst}\'s schedule fills up.',
			'Hello, I\'ve asked for a password reset several times and received nothing, not in spam either. Everything else reaches that inbox fine.'
		],
		guess: [
			'Hi {first}, sorry you\'re locked out. Reset emails come from our no-reply address and usually arrive within a minute. Could you check your spam or junk folder, and any "Promotions" or "Updates" tabs? If they\'re not there, let me know which email address you\'re entering.',
			'Thanks, {first}. Could you tell me which address you\'re entering on the reset page, and check the spam and junk folders for that inbox?'
		],
		details: [
			'Not in spam, not in any tab. I\'m entering {email}.',
			'I\'ve checked every folder. The address is {email}.'
		],
		escalate: [
			'Ops: a parent can\'t get password reset emails at {email}. Can you check what happens to the requests?',
			'Could ops trace the reset emails for {email}? Nothing arrives, spam checked.'
		],
		look: [
			'The app logged each reset request for that address:',
			'Reset requests the app received for this address in the last two days:'
		],
		first: (r, s, day) => [`ops@ops-1:~$ grep 'password_reset' /var/log/acme/app.log | grep -i '${s.email}'`, ...appLog(r, day, Array.from({ length: int(r, 5, 8) }, () => (s.variant === 'typo' ? `password_reset requested email=${s.email} account=none` : `password_reset requested email=${s.email} account=${s.uid} queued=1`)))],
		causes: [
			{
				where: 'client',
				set: (r, s) => {
					s.variant = 'filtered';
					s.uid = String(int(r, 10000, 99999));
					s.employer = pick(r, ['a county office', 'a hospital', 'a law firm', 'the city', 'a university', 'a large company']);
					s.email = `${s.first.toLowerCase()}.${s.last.toLowerCase()}@${pick(r, ['corp', 'mail', 'staff'])}.example.org`;
				},
				found: [
					'The receiving server accepted every one of them with a 250, so they were delivered and then held. The address is on a workplace mail system ({employer}, by the domain) whose filter quarantines messages with sign-in links from senders it doesn\'t know. Quarantined mail doesn\'t show in spam; it waits for their IT team.',
					'Every reset email was delivered: the receiving server said 250 each time. The domain is a workplace\'s, and workplace filters often hold mail with sign-in links for an administrator to release. Nothing more we can do from our end.'
				],
				show: (r, s, day) => [`ops@ops-1:~$ grep '${s.email}' /var/log/acme/mail-events.log | tail -6`, ...Array.from({ length: 6 }, (_, i) => `${isoStamp(day - 1 + Math.floor(i / 2), int(r, 50000, 80000))} event=delivered template=password_reset to=${s.email} smtp=250 mx=mx${int(r, 1, 3)}.${s.email.split('@')[1]}`)],
				told: 'Our ops team traced the emails. Every one of them was accepted by your email provider, so they reached your workplace\'s mail system. Workplace systems often hold messages with sign-in links in a quarantine that only their IT team can see, which is why they aren\'t in your spam folder.',
				ask: 'Could you ask your IT team to release the messages from our no-reply address, or reply with another address we can move your account to after a quick identity check?',
				around: 'As you asked on the phone, I\'ve sent a one-time sign-in link to your personal address instead. Once you\'re in, you can change the email on your account under Settings, then Account.',
				ends: ['waiting', 'quiet', 'around']
			},
			{
				where: 'db',
				set: (r, s) => {
					s.variant = 'typo';
					s.typo = s.email.replace('@example.com', '@exmaple.com');
				},
				found: [
					'No email was sent at all: every request was for an address we don\'t have. The account\'s address has a typo in it, {typo}, which is how it was entered when the account was made. The reset form gets the correct spelling, finds no account and sends nothing, while saying "if an account exists..." either way.',
					'There\'s no account for {email}, so no email went out. There is a family account for {typo}, same name, same child, with a misspelled domain. That\'s the account; it was typed wrong at sign-up, and the family has been signing in with a saved password ever since.'
				],
				show: (r, s) => psql(`SELECT id, email, created_at::date FROM users WHERE email LIKE '${s.email.split('@')[0]}@%';`, ['id', 'email', 'created_at'], [[int(r, 10000, 99999), s.typo, s.createdIso]]),
				told: 'Our ops team found that the email address on your account has a small typo in it ({typo}) from when it was set up, so our reset emails had nowhere to go.',
				fix: 'Corrected the address on the account from {typo} to {email} after support confirmed the parent\'s identity on the phone.',
				changed: 'We\'ve corrected the address now that we\'ve confirmed it\'s you, so you should be able to reset your password straight away. Could you try it and let me know?',
				ask: 'Before we change the address, I need to confirm the account is yours: could you reply with the last four digits of the card on the account and the name of {student}\'s tutor?',
				ends: ['fixed', 'waiting']
			}
		]
	},
	// 12. Grey previews.
	{
		role: 'tutor',
		subjects: ['Worksheet previews are blank', 'Grey boxes instead of previews', 'Thumbnails missing'],
		opens: [
			'The little previews of my worksheets on the lesson page are blank grey squares now. The files themselves open, but students like seeing which worksheet is which at a glance, and now they all look the same.',
			'Hi, on my newest uploads the preview image is just grey. Older files still have proper previews. Did something change?'
		],
		guess: [
			'Thanks, {first}. Previews are made a few minutes after a file is uploaded. Could you check again in a little while, and let me know which files are affected?',
			'Hi {first}, thanks for letting us know. Which files are they, and roughly when did you upload them?'
		],
		details: [
			'It\'s been days. The ones from this month are all grey: "{file}" and the others I made this week.',
			'They\'ve been grey since I uploaded them on {when}. I\'ve attached a screenshot.'
		],
		escalate: [
			'Ops: previews show as grey squares for tutor {tid}\'s recent uploads. The files open fine. Could you check the preview images?',
			'Could ops look at the previews for tutor {tid}? Recent ones are blank, older ones are fine.'
		],
		look: [
			'Preview images exist for every one of these files and were made within a minute of upload, so the preview step ran:',
			'The previews are there, one per file, all made right after upload:'
		],
		first: (r, s, day) => listing(r, day, `/srv/acme/uploads/previews/${s.tid}/`, Array.from({ length: int(r, 7, 12) }, () => [`${hex(r, 8)}-${hex(r, 4)}.png`, int(r, 2100, 4800)])),
		causes: [
			{
				where: 'none',
				found: [
					'And they\'re correct. The first page of each of these PDFs is blank apart from a thin border: the tutor\'s new template starts with a cover page that\'s white, with the title in a light grey that disappears at preview size. The preview is a faithful picture of page 1.',
					'I opened a few of the previews at full size. They\'re accurate: page 1 of every new file is a cover with a pale grey title on white, which at 160 pixels wide is just a grey square. The older files start straight with questions, so their previews show text.'
				],
				show: (r, s) => [`ops@ops-1:~$ pdftotext -f 1 -l 1 /srv/acme/uploads/${s.path} - | head -5`, '', `${s.stem}`, '', `${s.tutor}`, ''],
				told: 'Our ops team checked the previews, and they\'re working as they should. A preview shows the first page of the file, and the first page of your new worksheets is a cover page that\'s nearly all white, with a pale title that disappears at that size.',
				ends: ['explained']
			},
			{
				where: 'file',
				found: [
					'pdffonts shows why: none of the fonts in these files are embedded, and one of them is a font the preview tool doesn\'t have. Browsers substitute a font and show the text; the preview tool draws nothing. They were exported with font embedding turned off.',
					'These PDFs don\'t carry their fonts. Browsers fall back to a similar font and look fine; our preview renderer doesn\'t have the font and leaves the text out, which on a text-only page means a blank image. The older files have their fonts embedded.'
				],
				show: (r, s) => [`ops@ops-1:~$ pdffonts /srv/acme/uploads/${s.path}`, 'name                                 type              encoding         emb sub uni object ID', '------------------------------------ ----------------- ---------------- --- --- --- ---------', ...['Avenir-Book', 'Avenir-Heavy', 'Didot', 'Menlo-Regular'].slice(0, int(r, 2, 4)).map((font, i) => `${font.padEnd(36)} TrueType          WinAnsi          no  no  no      ${String(8 + i * 3).padStart(4)}  0`)],
				told: 'Our ops team found the cause. Your new files were saved without their fonts inside them. Browsers swap in a similar font, so the files look fine when opened, but the tool that makes our previews can\'t, and draws a blank page.',
				ask: 'Could you save them again with the fonts included? In Word that\'s File, Options, Save, then "Embed fonts in the file"; Pages and Google Docs include them automatically when you export to PDF. Then replace the files on the lessons and the previews will come back.',
				done: 'Found the setting, it was off. Saved them all again and replaced them, and the previews are back. Thanks!',
				ends: ['fixed', 'waiting', 'quiet']
			}
		]
	},
	// 13. "403 Forbidden" on new files.
	{
		role: 'tutor',
		subjects: ['Students get "Forbidden"', '403 error on my files', 'Students can\'t open anything I uploaded this week'],
		opens: [
			'Every file I\'ve attached this week gives students a page that just says "403 Forbidden". Files from before are fine. I have a test tomorrow with three of my students and they need the review sheet tonight.',
			'My students click a worksheet and get "Forbidden". It\'s only the new ones. The old ones still open.'
		],
		guess: [
			'Hi {first}, sorry about this, especially before a test. Could you check that the lessons are shared with the students (the "Students can see files" switch on each lesson)? If that\'s on, I\'ll get our ops team to look straight away.',
			'Thanks, {first}. First thing to check: is "Students can see files" switched on for those lessons?'
		],
		details: [
			'The switch is on for all of them. I opened one in a private window and got the same 403.',
			'They\'re all shared. Some of these students have had files from me for months without a problem.'
		],
		escalate: [
			'Ops: tutor {tid}\'s files uploaded since {when} give 403 to students. Older files fine. Sharing is on. Test tomorrow.',
			'Could ops look urgently? New files from tutor {tid} answer 403 Forbidden; older ones work.'
		],
		look: [
			'The 403s come from the files host itself, not from the app\'s permission check:',
			'These 403s are from nginx on the files host, before the app is asked anything:'
		],
		first: (r, s, day) => [`ops@ops-1:~$ grep '/t/${s.tid}/' /var/log/nginx/files.access.log | grep ' 403 ' | tail -${s.k}`, ...accessLog(r, day, Number(s.k), { path: s.variant === 'signed' ? `/t/${s.tid}/${s.key}.pdf?sig=${hex(r, 16)}&t=${1790000000 + int(r, 0, 9999999)}` : `/t/${s.tid}/${s.key}.pdf`, status: 403, bytes: 146 })],
		causes: [
			{
				where: 'app',
				set: (r, s) => {
					s.variant = 'mode';
					s.appHost = pick(r, ['app-1', 'app-2', 'app-3', 'app-4']);
				},
				found: [
					'The new files are on disk with the wrong mode: readable only by their owner, so nginx, which runs as www-data, can\'t read them. Everything the tutor uploaded since {when} went through {appHost}, which was rebuilt that day from an older image whose upload service runs with a umask of 077.',
					'Mode 600 on every file written since {when}. Those uploads all went through {appHost}, rebuilt that afternoon from an old image; its upload service has umask 077 where the others have 022, so nginx can\'t read what it writes.'
				],
				show: (r, s, day) => {
					const lines = listing(r, day, `/srv/acme/uploads/tutors/${s.tid}/`, Array.from({ length: 11 }, () => [`${hex(r, 8)}-${hex(r, 4)}.pdf`, int(r, 60000, 1800000)]));
					return lines.map((line, i) => (i >= 2 && i < 7 ? line.replace('-rw-r--r-- 1 www-data', '-rw------- 1 acme-app') : line));
				},
				told: 'Our ops team found the cause, and it was on our side: one of our servers saved new files in a way that stopped them from being opened.',
				fix: 'Fixed the mode on the {m} files {appHost} wrote (chmod 644) and set the upload service\'s umask on {appHost} to 022 like the others. They all answer 200 now.',
				changed: 'We\'ve fixed the files and the server, and your students can open everything now, including the review sheet. Sorry for the scare before your test. Could you ask a student to try one?',
				ends: ['fixed']
			},
			{
				where: 'none',
				set: (r, s) => {
					s.variant = 'signed';
				},
				found: [
					'The files are fine; every request getting a 403 carries a signed link that has run out. The links come from a shared document: the tutor copied file links from the lesson page and pasted them into a doc for the group. Those links work for an hour after they\'re made, so for anyone opening the doc later they\'re refused. Opening the files from the lesson page works.',
					'Each 403 is a signed URL past its hour. The referrer on those requests is a shared document, so the tutor has been pasting lesson-page links somewhere the students open later. The links behave exactly as designed; the lesson page itself gives the students fresh ones.'
				],
				show: (r, s) => [`ops@ops-1:~$ python3 -c 'import datetime; print(datetime.datetime.utcfromtimestamp(${1790000000 + int(r, 0, 9999999)}))'`, `2026-${pad(int(r, 9, 11))}-${pad(int(r, 1, 28))} ${pad(int(r, 0, 23))}:${pad(int(r, 0, 59))}:${pad(int(r, 0, 59))}`],
				told: 'Our ops team looked into it, and the files themselves are fine. The links your students are using were copied from the lesson page and only work for an hour after they\'re created, so that files can\'t be passed around. If the students open the files from the lesson page itself, they work. If you want a link to share with the group, the Share button on the file makes one that lasts.',
				ends: ['explained']
			}
		]
	},
	// 14. The same file many times over in a library.
	{
		role: 'tutor',
		subjects: ['My library is full of copies', 'Same file over and over', 'Duplicates everywhere'],
		opens: [
			'My file library suddenly has dozens of copies of the same few worksheets. "{file}" is in there {n2} times. I didn\'t upload it more than once, I promise. It\'s making it impossible to find anything.',
			'Something strange is happening with my uploads. Every file I add appears several times in my library, sometimes three, sometimes ten.'
		],
		guess: [
			'Thanks, {first}. Could you tell me how you upload files: from the lesson page, from the library, or through an app or a connected folder?',
			'Hi {first}, that does sound odd. How do your files usually get into the library? Any detail helps.'
		],
		details: ['From the library page, mostly.'],
		escalate: [
			'Ops: tutor {tid}\'s library has many copies of the same files. Can you see where the uploads come from?',
			'Could ops look at duplicate uploads for tutor {tid}? Same file up to {n2} times.'
		],
		look: [
			'Grouped the tutor\'s files by content. The copies are identical:',
			'Here are the tutor\'s files grouped by content hash, only groups with more than one copy:'
		],
		first: (r, s) => psql(`SELECT left(sha256, 12) AS sha, count(*), min(created_at), max(created_at), string_agg(DISTINCT source, ',') FROM files WHERE tutor_id = ${s.tid} GROUP BY sha256 HAVING count(*) > 1 ORDER BY 2 DESC LIMIT 4;`, ['sha', 'count', 'min', 'max', 'string_agg'], Array.from({ length: 4 }, (_, i) => [hex(r, 12), i === 0 ? Number(s.n2) : int(r, 2, 14), `${s.when2Iso} ${pad(int(r, 8, 12))}:${pad(int(r, 0, 59))}`, `${s.whenIso} ${pad(int(r, 13, 22))}:${pad(int(r, 0, 59))}`, s.source])),
		causes: [
			{
				where: 'client',
				set: (r, s) => {
					s.source = 'api';
					s.tool = pick(r, ['Zapier', 'Make', 'IFTTT']);
					s.folder = pick(r, ['Google Drive', 'Dropbox', 'OneDrive']);
				},
				details: [
					'From the library page, mostly. I also connected my {folder} folder with {tool} in the summer so new worksheets come across on their own, but I assumed that was separate.',
					'I drag them onto the library page. Oh, and months ago I set up {tool} to send files from my {folder} folder, if that matters.'
				],
				found: [
					'Every copy came in through the upload API with the tutor\'s own token, minutes apart, from {tool}\'s addresses. The automation sends a file whenever it changes in the {folder} folder, and that folder is also where the tutor\'s computer saves the file each time it\'s opened and closed, so every opening counts as a change and makes a new upload.',
					'All of the copies arrived through the API from {tool}, not from the library page. The tutor\'s automation re-sends a file each time it\'s modified in {folder}, and opening a PDF in some editors touches the file. So each time the tutor looks at a worksheet, we get another copy.'
				],
				show: (r, s, day) => [`ops@ops-1:~$ grep 'tutor=${s.tid}' /var/log/acme/app.log | grep 'upload stored' | tail -7`, ...appLog(r, day, Array.from({ length: 7 }, () => `upload stored tutor=${s.tid} via=api client="${s.tool}" name="${s.file}" size=${s.bytes}`))],
				told: 'Our ops team traced the copies. They all came from your {tool} automation, which sends a file to us whenever it changes in your {folder} folder. Opening a file on your computer counts as a change, so each time you open a worksheet, it sends another copy.',
				ask: 'Could you turn off the {tool} automation, or set it to send new files only? Once it\'s off, you can select the copies in your library and use Remove to clear them out.',
				done: 'Switched it to new files only and cleared out the copies. The library looks normal again. I\'d forgotten I\'d even set that up!',
				ends: ['waiting', 'quiet', 'fixed']
			},
			{
				where: 'app',
				set: (r, s) => {
					s.source = 'web';
				},
				details: ['I just use the Upload button on the library page, nothing fancy.', 'The normal way, the Upload button in the library. I don\'t use any apps.'],
				found: [
					'Each set of copies arrived within the same second from the same browser session. The library\'s Upload button stays active while a file is going up, so a second click (or a trackpad that registers a double tap) starts another upload of the same file. On a slow connection the tutor sees nothing happen and clicks again.',
					'They came from the library page, in bursts of two to ten within a second or two. The Upload button doesn\'t disable itself while an upload is in progress, and every click sends the file again. On this tutor\'s connection an upload takes a while to show progress, so the clicks pile up.'
				],
				show: (r, s, day) => [`ops@ops-1:~$ grep 'tutor=${s.tid}' /var/log/acme/app.log | grep 'upload stored' | tail -7`, ...(() => {
					const at = int(r, 60000, 80000);
					return Array.from({ length: 7 }, (_, i) => `${isoStamp(day, at + (i > 2 ? 1 : 0) + (i > 4 ? 3600 : 0))} app[${int(r, 1800, 4999)}]: upload stored tutor=${s.tid} via=web session=${s.key.slice(0, 8)} name="${s.file}" size=${s.bytes}`);
				})()],
				told: 'Our ops team found the cause, and it\'s on our side. The Upload button in the library keeps working while a file is still going up, so if it\'s clicked twice, or a trackpad registers a double tap, the file is sent twice or more.',
				bug: 'Library Upload button stays active while an upload is in progress; repeated clicks upload the file again. Disable it until the upload finishes, and ignore identical uploads within a few seconds.',
				around: 'Until it\'s fixed, clicking Upload once and waiting for the progress bar avoids it. To clear the copies, select them in your library and choose Remove.',
				ends: ['eng', 'around']
			}
		]
	},
	// 15. Files that will not open on a school's network.
	{
		role: 'school',
		subjects: ['Students can\'t open worksheets at school', 'Files blocked on our network?', 'Downloads don\'t work in our building'],
		opens: [
			'I\'m {schoolRole} at {school}. About a dozen of our students use Acme Tutors after school in the library. Since {when}, none of them can open the worksheets their tutors attach: the lessons load, but clicking a file shows an error. At home it works.',
			'Hello, this is {name}, {schoolRole} at {school}. Our after-school students can join their lessons on the school laptops but can\'t open any of the PDFs. Is this something on your end?'
		],
		guess: [
			'Hi {first}, thank you for the clear description. Since it works at home, the school network is the first suspect. Could you tell me the exact error the students see, and whether it happens on every laptop?',
			'Thanks, {first}. Could you send me a photo or screenshot of the error, and let me know if any laptop at school can open the files?'
		],
		details: [
			'It\'s every laptop in the library. They see an error page; I\'ve attached a photo of one.',
			'None of them can. Photo of the screen attached. Our IT person is only in on Thursdays.'
		],
		escalate: [
			'Ops: {school}\'s students can open lessons but not files on the school network since {when}; fine at home. Photo of the error attached. Can you see their requests?',
			'Could ops look at requests from {school}? Files fail there since {when}, lessons load.'
		],
		look: [
			'The school\'s requests to the app itself arrive and succeed, so lessons load:',
			'Requests from the school\'s address to the app, since {when}, all fine:'
		],
		first: (r, s, day) => [`ops@ops-1:~$ grep '${s.schoolIp}' /var/log/nginx/app.access.log | tail -6`, ...accessLog(r, day, 6, { path: `/api/lessons/${s.lid}`, status: 200, bytes: int(r, 2000, 9000), agent: browsers[2] }).map((line) => line.replace(/^\S+/, s.schoolIp))],
		causes: [
			{
				where: 'client',
				found: [
					'But none of the students\' file requests reach the files host at all. The photo shows the school\'s web filter page, cut off at the edge: the filter has put our files host in its "file sharing" category, which the district blocks for students. The app is on a different host name and isn\'t blocked, which is why lessons load.',
					'The files host has no requests from the school\'s address since {when}. The photo is the district filter\'s block page, category "File sharing". So the filter stops the browser before it gets to us.'
				],
				show: (r, s) => [`ops@ops-1:~$ grep -c '${s.schoolIp}' /var/log/nginx/files.access.log`, '0', `ops@ops-1:~$ zgrep -c '${s.schoolIp}' /var/log/nginx/files.access.log.${int(r, 3, 6)}.gz`, String(int(r, 40, 180))],
				told: 'Our ops team found that the students\' requests for files never reach us. Your district\'s web filter has started treating our file server as a file-sharing site, which is blocked for students. The lessons themselves come from a different address, which is why they still load.',
				ask: 'Could you ask your district IT team to allow our file server in the web filter? I\'ve attached a short note with its exact address for them. Most districts can do this in a few minutes.',
				done: 'IT added it this morning and the students can open everything. Thank you for the note, it made it easy.',
				ends: ['waiting', 'quiet', 'fixed']
			},
			{
				where: 'app',
				found: [
					'Their file requests do arrive, and from about the fourth student on, every one gets a 429. The whole school shares one public address, and the files host allows each address 30 downloads a minute, which a room of students opening worksheets together goes past in seconds. The school\'s group only grew past a handful of students around {when}, which is when it started.',
					'Requests from the school\'s address get 429 Too Many Requests in bursts every afternoon since {when}. One address for the whole building, a dozen students opening files at the same moment, and our per-address download limit does the rest. The schools we know about are on the higher limit; this one isn\'t yet.'
				],
				show: (r, s, day) => {
					// A room of students opening their worksheets within a few seconds of each other.
					let seconds = int(r, 22, 23) * 3600 + int(r, 0, 3000);
					const lines = Array.from({ length: 9 }, (_, i) => {
						seconds += int(r, 0, 4);
						const ok = i < 3;
						return `${s.schoolIp} - - [${logStamp(day, seconds)}] "GET /t/${int(r, 1200, 9800)}/${fileKey(r)}.pdf HTTP/2.0" ${ok ? 200 : 429} ${ok ? int(r, 60000, 1600000) : 169} "-" "${browsers[2]}"`;
					});
					return [`ops@ops-1:~$ grep '${s.schoolIp}' /var/log/nginx/files.access.log | tail -9`, ...lines];
				},
				told: 'Our ops team found the cause. To stop abuse, our file server limits how many files one internet address can download each minute, and because all your students share the school\'s address, they were hitting that limit together.',
				fix: 'Added the school\'s address to the schools list on the files host, which gets the higher download limit, and reloaded nginx; the school\'s requests get 200s now.',
				changed: 'We\'ve raised the limit for your school, so your students should be able to open everything now. Could you ask a student to try opening a worksheet again and let me know?',
				ends: ['fixed']
			}
		]
	},
	// 16. A replaced worksheet that still shows the old version.
	{
		role: 'tutor',
		subjects: ['Students still see the old worksheet', 'Updated file not showing', 'Changes to my PDF aren\'t showing up'],
		opens: [
			'I found a mistake in the answer key for "{file}", fixed it and uploaded the new version with "Replace file" on {when}. Two days later my students still see the old one with the mistake. On my computer I see the new one.',
			'Hi, I replaced a worksheet this week and the students keep telling me question 4 is wrong, which it was in the version before. How long does it take for a replacement to show?'
		],
		guess: [
			'Thanks, {first}. A replaced file should show straight away. Could you ask one of the students to reload the page with Ctrl+Shift+R (or Cmd+Shift+R on a Mac), which skips the browser\'s saved copy?',
			'Hi {first}, a replacement should show at once. Could the students try a hard reload of the lesson page (Ctrl+Shift+R, or Cmd+Shift+R on a Mac)?'
		],
		details: [
			'One of them tried that and now sees the new one. The other two still see the old version even after reloading.',
			'They did the reload thing and say it\'s still the old one.'
		],
		escalate: [
			'Ops: tutor {tid} replaced "{file}" on {when}; students still get the old version days later. A hard reload helped one student, not the others. Can you check what the files host sends?',
			'Could ops look at a replaced file that students still see in its old version? Tutor {tid}, lesson {lid}.'
		],
		look: [
			'The file on disk is the new one, modified on {when}, and the files host serves it to a fresh request:',
			'What the files host sends for that key right now:'
		],
		first: (r, s) => [`ops@ops-1:~$ curl -sI http://files-1.internal/t/${s.tid}/${s.key}.pdf`, 'HTTP/1.1 200 OK', 'Server: nginx', 'Content-Type: application/pdf', `Content-Length: ${s.bytes}`, `Last-Modified: ${s.whenHttp}`, `ETag: "${hex(r, 8)}-${hex(r, 6)}"`, `Cache-Control: ${s.cache}`, 'Accept-Ranges: bytes'],
		causes: [
			{
				where: 'app',
				set: (r, s) => {
					s.cache = 'max-age=604800';
				},
				found: [
					'The problem is the header. Files are served with Cache-Control: max-age=604800, so any browser that fetched the old version keeps using it for up to seven days without asking us again, and Replace file keeps the same link. That was fine when files never changed, but Replace file only arrived in the summer release.',
					'Look at Cache-Control: a week. Browsers that already had the old version won\'t ask again for seven days, and Replace file reuses the link. The one student whose hard reload worked bypassed that; the others are still inside their week.'
				],
				show: (r, s, day) => [`ops@ops-1:~$ grep '${s.key}' /var/log/nginx/files.access.log | awk '{print $1}' | sort | uniq -c`, ...Array.from({ length: 5 }, () => `${String(int(r, 1, 6)).padStart(7)} ${address(r)}`)],
				told: 'Our ops team found the cause, and it\'s on our side. Our file server tells browsers they can keep a file for up to a week without checking for a newer one, and Replace file keeps the same link, so students who had opened the old version kept seeing it.',
				fix: 'Gave the file a new key, so its link changed and every browser fetches the corrected version. {filed} {eng} for the real problem: Replace file keeps the link while files are served with max-age=604800.',
				changed: 'We\'ve changed the file\'s link on our side, so every student\'s browser now fetches the corrected version, and nobody needs to do anything. The underlying problem, that a replaced file keeps its old link, is with our engineers.',
				bug: 'Replace file keeps the same URL while files are served with max-age=604800; replaced files keep showing the old version for up to a week. Put a version in the URL when a file is replaced.',
				ends: ['fixed', 'eng']
			},
			{
				where: 'client',
				set: (r, s) => {
					s.cache = 'no-cache';
				},
				found: [
					'Headers are fine (no-cache, with an ETag), so browsers check with us every time. The access log shows the files host has sent only the new version since {when}, and the two students who still see the old one haven\'t fetched the file from us at all since before the replacement. They must be opening a copy they downloaded earlier.',
					'We\'re not caching anything here. Since the replacement on {when}, every fetch got the new file. Two of the students in this lesson haven\'t requested it since; whatever they\'re looking at is a copy on their own computers.'
				],
				show: (r, s, day) => [`ops@ops-1:~$ grep '${s.key}' /var/log/nginx/files.access.log | tail -7`, ...accessLog(r, day, 7, { path: `/t/${s.tid}/${s.key}.pdf`, status: [200, 304], bytes: Number(s.bytes) })],
				told: 'Our ops team checked, and our file server has only sent the corrected version since you replaced it. The two students still seeing the old one haven\'t opened it from the lesson since then, so most likely they\'re opening the copy they downloaded earlier, from their Downloads folder.',
				around: 'If they open it from the lesson page instead, or remove the old copy from their computers, they\'ll get the corrected version.',
				ends: ['around', 'explained']
			}
		]
	},
	// 17. A payout that looks short.
	{
		role: 'tutor',
		set: (r, s) => {
			s.rate = String(int(r, 8, 15) * 5);
		},
		subjects: ['My payout is short', 'This week\'s payout doesn\'t add up', 'Missing money from my payout'],
		opens: [
			'My payout on Friday was {short} less than I expected. I keep my own spreadsheet of lessons and I count {n} lessons that week at my usual rate of ${rate}. Could someone tell me what\'s missing?',
			'Hi, I think my latest payout is wrong. I had a full week and the total is lower than usual by {short}.'
		],
		guess: [
			'Hi {first}, thanks for writing. The Earnings page shows a breakdown per lesson, including our fee and any refunds. Could you compare it with your list and tell me which lessons look different?',
			'Thanks, {first}. Could you open Earnings, then the payout for that Friday, and tell me which lessons don\'t match your records?'
		],
		details: ['I looked, and I don\'t understand the breakdown.'],
		escalate: [
			'Ops: tutor {tid} says Friday\'s payout is {short} short. Could you check the lessons in that payout?',
			'Could ops look at the lessons behind tutor {tid}\'s last payout? {short} difference from the tutor\'s own count.'
		],
		look: [
			'The lessons in that payout, with what each paid:',
			'Here is the payout broken down by lesson:'
		],
		first: (r, s) => psql(`SELECT l.id, l.starts_at::date, l.status, p.amount FROM payout_lines p JOIN lessons l ON l.id = p.lesson_id WHERE p.payout_id = ${s.payout} ORDER BY 2;`, ['id', 'starts_at', 'status', 'amount'], Array.from({ length: Number(s.n) }, (_, i) => [Number(s.lid) + i * 7, s.weekDates.split(',')[i % 5]!, i === 1 || i === 3 ? s.oddStatus : 'completed', i === 1 || i === 3 ? s.oddAmount : (Number(s.rate) * 0.85).toFixed(2)])),
		causes: [
			{
				where: 'none',
				set: (r, s) => {
					s.oddStatus = 'cancelled_late';
					s.oddAmount = (Number(s.rate) * 0.5 * 0.85).toFixed(2);
					s.short = `$${(Number(s.rate) * 0.85).toFixed(2)}`;
				},
				details: ['I looked. Every lesson is there, but two of them show about half my rate.', 'Every lesson is listed, but two are lower than the rest.'],
				found: [
					'Every lesson is in the payout and the arithmetic is right. The two odd ones were cancelled by the student less than 24 hours ahead, on {weekDay1} and {weekDay2}. Late cancellations pay the tutor half the rate, as the tutor terms say, and the other half goes back to the family. That\'s the whole difference.',
					'Nothing missing. Two lessons are cancelled_late: the student cancelled within 24 hours, so the tutor gets 50% and the family gets the rest back. Two halves of {rate} less our fee is exactly the {short} the tutor is asking about.'
				],
				show: (r, s) => psql(`SELECT id, cancelled_at, starts_at, starts_at - cancelled_at AS notice FROM lessons WHERE id IN (${Number(s.lid) + 7}, ${Number(s.lid) + 21});`, ['id', 'cancelled_at', 'starts_at', 'notice'], [[Number(s.lid) + 7, `${s.weekDates.split(',')[1]} 0${int(r, 7, 9)}:12`, `${s.weekDates.split(',')[1]} 1${int(r, 5, 8)}:00`, `0${int(r, 6, 9)}:48:00`], [Number(s.lid) + 21, `${s.weekDates.split(',')[3]} 1${int(r, 0, 2)}:40`, `${s.weekDates.split(',')[3]} 1${int(r, 6, 9)}:30`, `0${int(r, 5, 8)}:50:00`]]),
				told: 'I\'ve been through the payout with our ops team. Two of your lessons that week were cancelled by the student less than a day ahead. Under the tutor terms, late cancellations are paid at half your rate, and the other half goes back to the family. That accounts for the {short} difference; everything else was paid in full.',
				ends: ['explained']
			},
			{
				where: 'db',
				set: (r, s) => {
					s.oddStatus = 'no_show';
					s.oddAmount = '0.00';
					s.short = `$${(Number(s.rate) * 2 * 0.85).toFixed(2)}`;
				},
				details: ['I looked. Every lesson is there, but two of them show $0.00 and say "no-show". Those students definitely came; we had good sessions.', 'Two lessons are marked as no-shows with nothing paid. Both students were there for the full hour.'],
				found: [
					'Both lessons are marked "student no-show" in the database, but the video room shows the student and the tutor both connected for the full hour each time. They were marked by the attendance check at the end of the day, which looks for the student\'s own join event; for these two the student joined from the phone app signed in as the parent, so the check never saw the student.',
					'The two are status no_show, set by the end-of-day attendance pass. The video room logs have both participants in the room for 58 and 61 minutes. In both cases the student came in through the parent\'s login on the phone app, which the attendance pass doesn\'t count as the student.'
				],
				show: (r, s) => psql(`SELECT lesson_id, user_id, role, joined_at::time, left_at::time FROM room_events WHERE lesson_id IN (${Number(s.lid) + 7}, ${Number(s.lid) + 21}) ORDER BY 1, 4;`, ['lesson_id', 'user_id', 'role', 'joined_at', 'left_at'], [[Number(s.lid) + 7, Number(s.tid), 'tutor', '16:58:41', '18:01:12'], [Number(s.lid) + 7, int(r, 10000, 99999), 'parent', '16:59:30', '18:00:57'], [Number(s.lid) + 21, Number(s.tid), 'tutor', '15:29:02', '16:31:40'], [Number(s.lid) + 21, int(r, 10000, 99999), 'parent', '15:30:11', '16:31:22']]),
				told: 'Our ops team found that two of your lessons were wrongly marked as no-shows. Both students were there; they joined through a parent\'s login on the phone app, which our attendance check doesn\'t recognize.',
				fix: 'Set both lessons back to completed and added them to Friday\'s payout run; the {short} goes out with it. {filed} {eng} for the attendance check.',
				changed: 'We\'ve corrected both lessons, and the {short} will be added to your next payout on Friday. Sorry for the trouble.',
				ends: ['fixed']
			}
		]
	},
	// 18. A tutor with no times to book.
	{
		role: 'parent',
		subjects: ['Tutor shows no open times', 'Can\'t book with {tutor}', 'No slots available?'],
		opens: [
			'We\'d like to book {tutor} for weekly {subj} lessons. {tfirst} told us there are lots of open evenings, but the booking page says "No times available" for every week I check.',
			'Hello, I\'m trying to book lessons for my {child} with {tutor}. {tfirst} sent me the profile link and says the calendar is open, but I see nothing at all to book.'
		],
		guess: [
			'Hi {first}, thanks for writing. Could you check that the booking page is showing the right lesson length? Some tutors only offer 60-minute lessons, and if 30 minutes is selected you\'ll see nothing. Also try the next few weeks.',
			'Thanks, {first}. Could you try each lesson length on the booking page, and look a few weeks ahead?'
		],
		details: [
			'I tried 30, 45 and 60 minutes, and four weeks ahead. Nothing.',
			'Every length, every week. {tfirst} sees open slots on the tutor side.'
		],
		escalate: [
			'Ops: a parent sees no availability for tutor {tid}; the tutor says there\'s plenty. Every lesson length tried. Can you look at the tutor\'s availability records?',
			'Could ops check tutor {tid}\'s availability? Parent sees nothing to book.'
		],
		look: [
			'The tutor has plenty of availability stored, {m} weekly slots:',
			'Availability rows for the tutor:'
		],
		first: (r, s) => psql(`SELECT starts_day, starts_at, ends_day, ends_at, audience FROM availability WHERE tutor_id = ${s.tid} ORDER BY 1, 2;`, ['starts_day', 'starts_at', 'ends_day', 'ends_at', 'audience'], Array.from({ length: 5 }, (_, i) => [i + 2, '01:00', s.audience === 'existing' ? i + 2 : i + 1, '04:00', s.audience])),
		causes: [
			{
				where: 'none',
				set: (r, s) => {
					s.slotStart = '01:00';
					s.slotEnd = '04:00';
					s.audience = 'existing';
				},
				found: [
					'And the booking page is right not to show them to this family: every slot is set to "existing students only". That\'s a switch the tutor turned on, and new families see nothing until the tutor turns it off or adds them as a student.',
					'All the slots have audience = existing, the "existing students only" setting. The booking page hides those from anyone who isn\'t already the tutor\'s student, which this family isn\'t yet. Working as designed.'
				],
				show: (r, s) => psql(`SELECT updated_at::date, audience FROM availability WHERE tutor_id = ${s.tid} GROUP BY 1, 2;`, ['updated_at', 'audience'], [[s.when2Iso, 'existing']]),
				told: 'Our ops team checked, and nothing is broken. {tfirst}\'s open times are all set to "existing students only", so families who haven\'t had a lesson with {tfirst} yet can\'t see them. I\'ve let {tfirst} know; once {tfirst} changes that setting or adds you as a student, you\'ll see the times.',
				ends: ['explained']
			},
			{
				where: 'db',
				set: (r, s) => {
					s.slotStart = '01:00';
					s.slotEnd = '04:00';
					s.audience = 'everyone';
				},
				found: [
					'But look at the times: each slot ends before it starts, from 01:00 back to 04:00 the previous day, as far as the table is concerned. The tutor saved them as 6 PM to 9 PM Pacific, which in UTC crosses midnight, and the editor stored the end without moving it to the next day. The booking page throws away slots that end before they start. {m2} other tutors have slots like this.',
					'They\'re stored in UTC and every one crosses midnight: 6 to 9 PM Pacific is 01:00 to 04:00 the next day, but the end day was never moved, so ends_at falls before starts_at. Booking discards those. Same for {m2} other tutors with evening slots saved since the July release.'
				],
				show: (r, s) => psql('SELECT count(DISTINCT tutor_id) FROM availability WHERE ends_day < starts_day OR (ends_day = starts_day AND ends_at < starts_at);', ['count'], [[Number(s.m2) + 1]]),
				told: 'Our ops team found the cause. {tfirst}\'s evening times were saved incorrectly on our side, so the booking page couldn\'t show them.',
				fix: 'Moved the end day forward on the slots that cross midnight in UTC for this tutor and the {m2} others; the booking page shows them now. {filed} {eng} for the editor.',
				changed: 'We\'ve corrected them, and you should now see {tfirst}\'s evenings on the booking page. Could you try again and let me know?',
				ends: ['fixed']
			}
		]
	},
	// 19. Scanned homework that shows sideways.
	{
		role: 'student',
		subjects: ['My homework upload is sideways', 'Scanned pages come out rotated', '{tfirst} can\'t read my homework'],
		opens: [
			'Hi, I upload my {subj} homework as a scan from my phone and {tfirst} says the pages show up sideways on the tutor\'s side, so it\'s really hard to mark. On my phone they look normal.',
			'My tutor says my homework PDFs are rotated on the tutor\'s screen. They look fine to me. I don\'t know what I\'m doing wrong.'
		],
		guess: [
			'Hi {first}, thanks for writing in. Which app do you use to scan, and do the pages look right if you open the PDF on a computer rather than your phone?',
			'Thanks, {first}. Could you tell me how you make the scans, and whether they look right on a computer?'
		],
		details: ['I use the scanner on my phone.'],
		escalate: [
			'Ops: student homework PDFs on lesson {lid} show sideways for the tutor. Could you check the files?',
			'Could ops look at homework files on lesson {lid}? The tutor sees them rotated.'
		],
		look: [
			'Took one of the student\'s files from the homework folder:',
			'Here\'s the latest homework file from this student:'
		],
		first: (r, s) => pdfinfo(r, { ...s, path: `homework/${s.lid}/${s.key}.pdf`, stem: `Scan ${s.whenIso}` }, { rot: Number(s.rot), landscape: s.rot === '0', creator: s.scanner, producer: s.scanner === 'Notes' ? 'iOS Version 18.0 (Build 22A3354) Quartz PDFContext' : 'Adobe Scan for Android' }),
		causes: [
			{
				where: 'file',
				set: (r, s) => {
					s.rot = '0';
					s.scanner = 'Notes';
				},
				details: ['I use the scanner in the Notes app on my iPhone. On my mom\'s laptop the pages are sideways too, actually.', 'The Notes app on my phone. I checked on the family computer and they are sideways there as well.'],
				found: [
					'The pages themselves are landscape. The scan was taken with the phone on its side, and the scanner saved the image the way the camera held it, with no rotation flag. Every viewer shows it sideways, Preview on a Mac included. Our marking view is doing what the file says.',
					'Page size 792 x 612, rotation 0: the file really is sideways. The phone was held landscape and the Notes scanner kept it that way. It looks right on the phone only because the phone turns the whole screen.'
				],
				show: (r, s) => [`ops@ops-1:~$ pdfimages -list /srv/acme/uploads/homework/${s.lid}/${s.key}.pdf | sed -n '3,8p'`, ...Array.from({ length: 6 }, (_, i) => `   ${i + 1}     ${i}  image    4032  3024  rgb     3   8  jpeg   no        ${10 + i * 6}  0   366   366  ${int(r, 600, 999)}K  ${int(r, 3, 6)}.${int(r, 0, 9)}%`)],
				told: 'Our ops team looked at your files. The pages really are saved sideways: the scans were taken with the phone on its side, and the scanner kept them that way. Your phone turns the screen, so they look right to you, but every computer shows them rotated.',
				around: 'Before you tap Save in the Notes scanner, tap the page and use the rotate button, or hold your phone upright when you scan. Either way the pages will be the right way up for {tfirst}.',
				done: 'I rotated them before saving this time and {tfirst} says they\'re perfect now. Thank you!',
				ask: 'Could you try your next scan with the phone held upright, or rotate the page in the scanner before saving, and let me know if {tfirst} sees it the right way up?',
				ends: ['around', 'fixed', 'waiting']
			},
			{
				where: 'app',
				set: (r, s) => {
					s.rot = '90';
					s.scanner = 'Adobe Scan';
				},
				details: ['I use Adobe Scan. On my dad\'s laptop the pages look normal, the right way up.', 'Adobe Scan on my phone. They look fine on our computer at home.'],
				found: [
					'The file is fine: portrait images with a rotation flag of 90, which is how Adobe Scan saves pages taken in landscape. Every desktop viewer honors the flag; the marking view in our app draws the page images and ignores it.',
					'Rotation 90 is set on every page, correctly. Viewers apply it and show the page upright. Our homework marking view doesn\'t read the rotation at all, so the tutor sees the raw image on its side.'
				],
				show: (r, s) => [`ops@ops-1:~$ qpdf --show-pages /srv/acme/uploads/homework/${s.lid}/${s.key}.pdf | head -4`, ...Array.from({ length: 2 }, (_, i) => `page ${i + 1}: ${14 + i * 9} 0 R\n  images:\n    /Im${i}: ${15 + i * 9} 0 R, 3024 x 4032`), 'ops@ops-1:~$ qpdf --json /srv/acme/uploads/homework/' + s.lid + '/' + s.key + '.pdf | grep -m2 Rotate', '        "/Rotate": 90,', '        "/Rotate": 90,'],
				told: 'Our ops team found the cause, and it\'s on our side. Your scans are saved correctly and look right in any normal viewer, but the screen tutors use to mark homework ignores the instruction in the file that says which way up the page goes.',
				bug: 'The homework marking view ignores the PDF /Rotate entry; pages scanned with a rotation flag show sideways to the tutor.',
				around: 'Until it\'s fixed, {tfirst} can download the file and mark it in another app, or you can use the Rotate button in Adobe Scan before saving so the image itself is upright.',
				ends: ['eng', 'around']
			}
		]
	},
	// 20. Uploads that stop at 99%.
	{
		role: 'tutor',
		set: (r, s) => {
			s.mb = String(int(r, 9, 23));
		},
		subjects: ['Upload freezes at 99%', 'Uploads never finish', 'Stuck uploading'],
		opens: [
			'Every time I try to upload a larger worksheet the progress bar goes to 99% and stays there. After a couple of minutes it says "Upload failed, please try again." Small files are fine.',
			'My uploads get to the end and then just hang. I\'ve been trying for an hour to get a {mb} MB file up.'
		],
		guess: [
			'Hi {first}, sorry about that. Could you try a different browser, and let me know what kind of internet connection you\'re on?',
			'Thanks, {first}. Does the same happen in another browser? And are you at home, or on a shared network?'
		],
		details: ['Same in Firefox.'],
		escalate: [
			'Ops: tutor {tid}\'s uploads of larger files stall at 99% and fail. Small files are fine. Can you check the server side?',
			'Could ops check uploads for tutor {tid}? Files over about 10 MB hang at the end.'
		],
		look: [
			'The files host\'s error log has an entry for each attempt:',
			'One error-log line per attempt on the files host:'
		],
		first: (r, s, day) => [`ops@ops-1:~$ grep 'tutor=${s.tid}\\|${s.ip}' /var/log/nginx/files.error.log | tail -5`, ...Array.from({ length: 5 }, () => `2026/${pad(calendar(day).month + 1)}/${pad(calendar(day).date)} ${pad(int(r, 1, 5))}:${pad(int(r, 0, 59))}:${pad(int(r, 0, 59))} [${s.variant === 'proxy' ? 'info' : 'error'}] ${int(r, 1000, 1999)}#${int(r, 1000, 1999)}: *${int(r, 100000, 999999)} ${s.variant === 'proxy' ? 'client prematurely closed connection while reading client request body' : 'upstream timed out (110: Connection timed out) while reading response header from upstream'}, client: ${s.ip}, server: files, request: "POST /upload HTTP/2.0"`).sort()],
		causes: [
			{
				where: 'client',
				set: (r, s) => {
					s.variant = 'proxy';
				},
				details: ['I\'m traveling this week and using the hotel wifi. Same in Firefox.', 'Same in Firefox. I\'m working from a coffee shop near my second job this week.'],
				found: [
					'The connection is closed from the tutor\'s end each time, almost exactly 60 seconds in, while we\'re still receiving the file. That\'s the pattern of a network that cuts long requests: hotel and café networks often run everything through a proxy with a one-minute limit. On a slow link a {mb} MB upload takes longer than that.',
					'It\'s the client side closing the connection mid-body, at 60 seconds every time. Their network has a proxy that drops requests after a minute; on that connection a {mb} MB file needs about three.'
				],
				show: (r, s, day) => [`ops@ops-1:~$ grep '${s.ip}' /var/log/nginx/files.access.log | grep POST | tail -5`, ...accessLog(r, day, 5, { path: '/upload', status: 400, bytes: 0, method: 'POST' }).map((line) => line.replace(/^\S+/, s.ip).replace(/" 400 0 /, '" 400 0 ').concat(' rt=60.0'))],
				told: 'Our ops team looked into it. Each time, the connection was closed from your side after exactly one minute, while the file was still arriving. Hotel and café networks often cut off anything that takes longer than a minute, and on that connection your file needs a few minutes to go up.',
				around: 'Using your phone as a hotspot for the upload should get round it, or you can upload the file once you\'re back on your home connection.',
				ends: ['around', 'explained']
			},
			{
				where: 'app',
				set: (r, s) => {
					s.variant = 'timeout';
				},
				details: ['Home internet. It\'s not fast but it\'s never been a problem. Same in Firefox.', 'Same in Firefox. I\'m at home, on the same connection I\'ve always had.'],
				found: [
					'The whole file arrives, but the app takes too long to answer. After an upload the app makes the preview and scans the file before it replies, and for a file this size that takes longer than the 60 seconds the files host waits. The file is actually saved each time; the tutor just never hears so, and tries again.',
					'The upload completes; it\'s our reply that\'s late. The app does the preview and the scan before responding, nginx gives up on it after 60 s and the browser shows a failure, while the app carries on and stores the file. There are {n} copies of the tutor\'s file from today.'
				],
				show: (r, s, day) => [`ops@ops-1:~$ grep 'tutor=${s.tid}' /var/log/acme/app.log | grep 'upload stored' | tail -5`, ...appLog(r, day, Array.from({ length: 5 }, () => `upload stored tutor=${s.tid} via=web name="${s.file}" size=${Number(s.mb) * 1_000_000 + int(r, 0, 999999)} processing_ms=${int(r, 64000, 88000)}`))],
				told: 'Our ops team found the cause, and it\'s on our side. Your files actually reach us each time, but for larger files our server takes too long to say so, and your browser gives up waiting and reports a failure.',
				around: 'Your files did reach us each time, so you\'ll find this one in your library, along with a few copies from your earlier tries, which you can remove. Until our engineers fix it, larger uploads may look as if they failed when they didn\'t, so it\'s worth checking your library before trying again.',
				bug: 'The upload request waits for preview and scan before responding; large files run past the 60 s proxy timeout and show as failed although they were saved. Respond first and process afterwards.',
				ends: ['eng', 'around']
			}
		]
	},
	// 21. A profile photo that will not save.
	{
		role: 'tutor',
		subjects: ['Can\'t upload my profile photo', 'Profile picture won\'t save', 'Photo upload error'],
		opens: [
			'I\'m trying to add a profile photo and it won\'t save. I pick the photo, the cropping box appears, I click Save and get "Something went wrong". I\'ve tried three different photos.',
			'Hi, my profile still has the grey placeholder because the photo upload keeps failing. I\'m told profiles with photos get far more bookings, so I\'d love to sort it.'
		],
		guess: [
			'Thanks, {first}. Could you tell me where the photos come from (phone, camera, a scan) and what type of file they are? Most problems with profile photos come down to the file.',
			'Hi {first}, sorry about that. Where are the photos from, and do you know what kind of file they are?'
		],
		details: ['They\'re from my phone.'],
		escalate: [
			'Ops: tutor {tid} can\'t save a profile photo; "Something went wrong" after cropping. Could you check what the app logged?',
			'Could ops look at profile photo errors for tutor {tid}?'
		],
		look: [
			'The app logged each attempt:',
			'Each save attempt in the app log:'
		],
		first: (r, s, day) => [`ops@ops-1:~$ grep 'tutor=${s.tid}' /var/log/acme/app.log | grep photo`, ...appLog(r, day, Array.from({ length: 4 }, () => (s.variant === 'heic' ? `photo refused tutor=${s.tid} content_type=image/heic size=${int(r, 1400000, 3900000)}` : `photo resize error tutor=${s.tid} content_type=image/jpeg width=6000 height=8000 error="cannot allocate memory"`)))],
		causes: [
			{
				where: 'file',
				set: (r, s) => {
					s.variant = 'heic';
				},
				details: ['They\'re from my iPhone. I AirDropped them to my Mac and uploaded from there. The files end in .HEIC, if that\'s what you mean.', 'All three are iPhone photos, sent to my laptop. The names end in HEIC.'],
				found: [
					'They\'re HEIC files, the format iPhones save photos in. The cropper in the browser shows them, because Safari can read HEIC, but the server only accepts JPEG and PNG, so the save is refused. The message should say so, and doesn\'t.',
					'content_type=image/heic on all three. Safari previews HEIC in the cropper, then the upload is refused because we take JPEG and PNG only. The photos are fine as photos; they\'re just a format we don\'t accept.'
				],
				show: (r, s) => [`ops@ops-1:~$ file /tmp/photo-${s.tid}-*.heic`, ...Array.from({ length: 3 }, (_, i) => `/tmp/photo-${s.tid}-${i + 1}.heic: ISO Media, HEIF Image HEVC Main or Main Still Picture Profile`)],
				told: 'Our ops team checked, and the photos are in HEIC format, which is how iPhones save pictures. Your browser can show them, but our site only accepts JPEG and PNG photos, so the save is refused. The error message should have said that.',
				around: 'If you open a photo on your Mac in Preview and use File, Export, choosing JPEG, the exported file will upload fine. On the iPhone, Settings, then Camera, then Formats, then "Most Compatible" saves new photos as JPEG.',
				done: 'Exported it as a JPEG and it worked first time. Thanks!',
				ends: ['around', 'fixed']
			},
			{
				where: 'app',
				set: (r, s) => {
					s.variant = 'big';
				},
				details: ['They\'re JPGs from my phone, nothing unusual. One was taken with my camera.', 'Regular JPG photos from my phone.'],
				found: [
					'These are JPEGs, but big ones, 6000 by 8000 pixels. The resizing step runs out of memory on images over about 40 megapixels and gives up. Any tutor with a recent phone in its highest-resolution mode will hit it.',
					'Ordinary JPEGs, 48 megapixels. The resize worker has a memory cap that these exceed, so it fails, and the user gets the generic error. Not the tutor\'s fault in any way.'
				],
				show: (r, s, day) => [`ops@ops-1:~$ journalctl -u acme-resize --since '${isoDate(day)}' | grep -m5 MemoryMax`, ...Array.from({ length: 5 }, () => `${months[calendar(day).month]} ${pad(calendar(day).date)} ${pad(int(r, 14, 22))}:${pad(int(r, 0, 59))}:${pad(int(r, 0, 59))} app-${int(r, 1, 3)} systemd[1]: acme-resize.service: A process of this unit has been killed by the OOM killer (MemoryMax=512M).`).sort()],
				told: 'Our ops team found the cause, and it\'s on our side. Your photos are very high resolution, and the part of our site that shrinks profile photos runs out of room on pictures that large.',
				bug: 'Profile photo resize fails (killed for memory) on images over about 40 megapixels; the tutor sees "Something went wrong". Raise the limit or downscale in steps.',
				around: 'Until it\'s fixed, a smaller copy works: on an iPhone, emailing the photo to yourself and choosing "Medium" size makes one you can upload.',
				ends: ['eng', 'around']
			}
		]
	},
	// 22. Students locked out after a school changed its email addresses.
	{
		role: 'school',
		set: (r, s) => {
			s.district = pick(r, ['bayside', 'cedarridge', 'oakgrove', 'valleyoaks', 'delmar', 'foothill']);
		},
		subjects: ['Students can\'t sign in since our email change', 'Accounts not working after our domain change', 'Login problems for our students'],
		opens: [
			'Hello, I\'m {schoolRole} at {school}. Over the summer our district changed every student email address to a new domain. Now the {n2} students in our tutoring program can\'t sign in: they type their new address and are told there\'s no account.',
			'Hi, this is {name} from {school}. Our students\' email addresses changed this term, and since then the ones on Acme can\'t get in.'
		],
		guess: [
			'Hi {first}, thanks for getting in touch. Each student can sign in with their old address and then change it under Settings, then Account. Could you ask one of them to try that?',
			'Thanks, {first}. Could the students sign in with their old addresses and change them in Settings?'
		],
		details: [
			'They can\'t. The old addresses have been switched off, so they can\'t sign in with them, and they can\'t receive the confirmation email for a change.',
			'We tried. The old addresses no longer exist, so nothing works with them.'
		],
		escalate: [
			'Ops: {school} changed its student email domain; {n2} students can\'t sign in or change their address. Can you look at their accounts?',
			'Could ops look at {school}\'s student accounts? Domain change over the summer, {n2} students locked out.'
		],
		look: [
			'The school\'s students by email domain:',
			'Accounts linked to the school\'s organization, grouped by address domain:'
		],
		first: (r, s) => psql(`SELECT split_part(email, '@', 2) AS domain, count(*), bool_or(sso) AS sso FROM users WHERE org_id = ${s.org} GROUP BY 1;`, ['domain', 'count', 'sso'], [[`students.${s.district}.example.org`, Number(s.n2), s.sso], [`${s.district}.example.org`, int(r, 2, 6), s.sso]]),
		causes: [
			{
				where: 'db',
				set: (r, s) => {
					s.sso = 'f';
				},
				found: [
					'{n2} student accounts on the old domain, all linked to the school\'s organization, each with the same name part as in the new addresses on the school\'s list. Nothing in the app lets a school change addresses in bulk, so it has to be done in the database.',
					'All {n2} are on the old domain and sign in with a password (no single sign-on for this school). The list the school sent matches them one to one by the part before the @. There\'s no way to bulk-change addresses from the app; I can do it here.'
				],
				show: (r, s) => psql(`SELECT count(*) FROM users u JOIN school_list l ON split_part(u.email, '@', 1) = split_part(l.new_email, '@', 1) WHERE u.org_id = ${s.org};`, ['count'], [[Number(s.n2)]]),
				told: 'Our ops team looked at your students\' accounts. They\'re still on the old addresses, and there\'s no way for a school to change them all at once from the site, so we\'ll do it for you on our side.',
				fix: 'Changed the {n2} addresses from the old domain to the new one for the school\'s organization, using the list the school sent; each student can now sign in with the new address and reset their password.',
				changed: 'We\'ve moved all {n2} of your students\' accounts to their new addresses. They can now sign in with the new address, using "Forgot password" the first time. Could you ask one or two to try?',
				ask: 'Before we change {n2} accounts at once, we need the list of old and new addresses from your district\'s IT team, sent from a district email address. Could you ask them to send it to this ticket?',
				ends: ['fixed', 'waiting']
			},
			{
				where: 'none',
				set: (r, s) => {
					s.sso = 't';
				},
				found: [
					'These accounts aren\'t ours to change. The school signs in through the district\'s own single sign-on, and our accounts take whatever address the district sends at each sign-in. The district is still sending the old addresses for these students, so our side has nothing new to match. Once the district updates them, ours follow on the next sign-in.',
					'sso = t for the whole organization. Students sign in through the district, and the address on our side is whatever the district\'s sign-in sends us. It\'s still sending the old domain. Nothing to fix here; the district needs to update its directory.'
				],
				show: (r, s, day) => [`ops@ops-1:~$ grep 'org=${s.org}' /var/log/acme/app.log | grep sso | tail -2`, ...appLog(r, day, [`sso login org=${s.org} email=${s.first.toLowerCase()}${int(r, 10, 99)}@students.${s.district}.example.org result=no_user`, `sso assertion org=${s.org} email_attr=students.${s.district}.example.org`])],
				told: 'Our ops team looked into it. Your students sign in through your district\'s own sign-in, which tells us their email address each time. It\'s still sending us the old addresses, which is why the new ones your students type aren\'t recognized. Once your district\'s IT team updates the addresses in their sign-in system, the students will be able to sign in as before, with nothing to change on our side.',
				ask: 'Could you pass this to your district IT team? I\'ve attached a short note for them describing what to change.',
				ends: ['explained', 'waiting']
			}
		]
	},
	// 23. A refund for a cancelled lesson that has not appeared.
	{
		role: 'parent',
		subjects: ['Refund for a cancelled lesson', 'Still charged for a cancelled lesson', 'Where is my refund?'],
		opens: [
			'{tfirst} cancelled {student}\'s lesson on {when} because of illness, and the app said we\'d get a refund of {amt}. I don\'t see it on my card yet.',
			'Hello, a lesson was cancelled by our tutor recently and I was told I\'d be refunded. The invoice still shows the full amount.'
		],
		guess: [
			'Hi {first}, thanks for writing. Refunds to cards can take a few working days to appear. Could you tell me the date of the lesson and which card you paid with?',
			'Thanks, {first}. Could you give me the lesson date and the last four digits of the card?'
		],
		details: ['The lesson was on {when}. Card ending {card}.', 'It was on {when}, and it\'s the card ending {card}.'],
		escalate: [
			'Ops: a parent says the refund for a cancelled lesson ({when}, lesson {lid}) hasn\'t appeared. Could you check the refund and the invoice?',
			'Could ops look at the refund for lesson {lid}? Cancelled by the tutor on {when}.'
		],
		look: [
			'The cancellation and refund records for the lesson:',
			'Refund row for the lesson:'
		],
		first: (r, s) => psql(`SELECT id, lesson_id, invoice_id, amount, status, created_at::date FROM refunds WHERE lesson_id = ${s.lid};`, ['id', 'lesson_id', 'invoice_id', 'amount', 'status', 'created_at'], [[int(r, 30000, 49999), Number(s.lid), Number(s.inv), s.amt.slice(1), s.refundStatus, s.whenIso]]),
		causes: [
			{
				where: 'none',
				set: (r, s) => {
					s.refundStatus = 'succeeded';
				},
				found: [
					'The refund is fine: issued to the card the same day, {amt}, and the card processor confirmed it. Card refunds take 5 to 10 working days to show on a statement, depending on the bank, and it\'s been {n} working days. The invoice shows the full amount because the refund is a separate credit note, listed under the invoice on the Billing page.',
					'Succeeded on {when}, confirmed by the processor. It\'s just the bank\'s 5 to 10 working days. The invoice stays at the full amount by design; the credit note sits under it.'
				],
				show: (r, s) => [`ops@ops-1:~$ grep 'refund=${s.lid}' /var/log/acme/payments.log | tail -2`, `${isoStamp(Number(s.whenDay), int(r, 60000, 70000))} refund created lesson=${s.lid} amount=${s.amt.slice(1)} card=${s.card}`, `${isoStamp(Number(s.whenDay), int(r, 70001, 72000))} refund succeeded lesson=${s.lid} processor_ref=re_${hex(r, 14)}`],
				told: 'The refund of {amt} was sent to your card ending {card} on {when}, the day of the cancellation. Banks take 5 to 10 working days to show refunds, so it should appear by {when3}. On the Billing page you\'ll find it as a credit note under the invoice, which is why the invoice itself still shows the full amount.',
				ends: ['explained']
			},
			{
				where: 'db',
				set: (r, s) => {
					s.refundStatus = 'pending';
				},
				found: [
					'The refund record exists but was never paid out. It\'s stuck in pending because the invoice it belongs to was re-issued on {when2} (the family changed the billing address), and the refund still points at the old, cancelled invoice. The processor refused it as belonging to a superseded payment, and it went back to pending.',
					'Pending since {when}. It references invoice {inv}, which was cancelled and re-issued on {when2} after an address change, so the processor won\'t refund against it. The refund needs to point at the new invoice.'
				],
				show: (r, s) => psql(`SELECT id, status, replaced_by FROM invoices WHERE id = ${s.inv};`, ['id', 'status', 'replaced_by'], [[Number(s.inv), 'cancelled', Number(s.inv) + int(r, 100, 900)]]),
				told: 'Our ops team found that the refund hadn\'t gone through, because of a change to your invoice earlier in the month: the refund was still attached to the old version of it.',
				fix: 'Pointed the refund at the re-issued invoice and submitted it again; the processor accepted it.',
				changed: 'We\'ve sent it again and it\'s been accepted, so it should show on your card within 5 to 10 working days. Sorry for the wait.',
				ends: ['fixed']
			}
		]
	},
	// 24. A profile bio full of odd characters.
	{
		role: 'tutor',
		subjects: ['Weird characters in my profile', 'My bio has strange symbols', 'Profile text messed up'],
		opens: [
			'My profile bio shows "Iâ€™ve been teaching" instead of "I\'ve been teaching", and every apostrophe and dash is replaced with junk like that. A parent asked me about it, which was embarrassing. I haven\'t edited my bio in ages.',
			'Hi, someone pointed out that my profile description is full of odd characters, like "Ã©" where I wrote "é". It used to look fine.'
		],
		guess: [
			'Hi {first}, sorry about that. Could you try editing your bio, retyping one of the apostrophes, and saving? That tells us whether it\'s the saved text or how it\'s shown.',
			'Thanks, {first}. If you retype one of the odd characters and save, does that one come out right?'
		],
		details: ['I retyped the first one and that one is fine now. All the others are still junk.', 'Yes, the one I retyped is fine. The rest are still wrong.'],
		escalate: [
			'Ops: tutor {tid}\'s bio shows garbled characters (â€™ for apostrophes). Retyped characters save fine. Could you check the stored text?',
			'Could ops look at tutor {tid}\'s bio? Mojibake throughout; new edits are fine.'
		],
		look: [
			'The stored bio really contains the garbled characters, so it\'s the text, not the page:',
			'The garbling is in the stored text itself:'
		],
		first: (r, s) => psql(`SELECT id, left(bio, 48) AS bio, bio_updated_at::date FROM tutors WHERE id = ${s.tid};`, ['id', 'bio', 'bio_updated_at'], [[Number(s.tid), `Iâ€™ve been teaching ${s.subj} for ${s.years} yearsâ€”`.slice(0, 48), '2024-03-18']]),
		causes: [
			{
				where: 'db',
				found: [
					'The bio was last written by the 2024 import from the old booking system, which read the old system\'s UTF-8 text as Latin-1 and wrote it back as UTF-8, so every curly apostrophe became three characters. The old profile template hid them by stripping anything unusual; the July release shows the text as stored. {m} imported tutors have the same problem.',
					'bio_updated_at is the import date in March 2024. The import double-encoded the text (UTF-8 read as Latin-1, written back as UTF-8). Until the July release the page filtered the odd characters out; now it doesn\'t. {m} tutors are affected.'
				],
				show: (r, s) => psql(`SELECT convert_from(convert_to(left(bio, 40), 'LATIN1'), 'UTF8') FROM tutors WHERE id = ${s.tid};`, ['convert_from'], [[`I’ve been teaching ${s.subj} for ${s.years} years—`.slice(0, 40)]]),
				told: 'Our ops team found the cause. Your bio was garbled when it was moved over from our old system in 2024, and a recent update to the profile page stopped hiding the damage.',
				fix: 'Repaired this bio with convert_from(convert_to(bio, \'LATIN1\'), \'UTF8\') and read the result by eye. The {m} other affected profiles are on the tutor success team\'s list, so each tutor can check theirs first.',
				changed: 'We\'ve repaired it, so it shows exactly as you wrote it. Could you take a look?',
				ask: 'We can repair most of it on our side, but a few characters in your bio can\'t be recovered with certainty (the accented words in your second paragraph). Could you send me the text as it should read, and I\'ll put it in for you?',
				ends: ['fixed', 'waiting']
			}
		]
	},
	// 25. Homework marked late.
	{
		role: 'parent',
		subjects: ['Homework marked late but it wasn\'t', '"Late" on homework turned in on time', 'Unfair late mark'],
		opens: [
			'{student} turned in the {subj} homework at 9 PM on the day it was due, and it\'s marked "Late" in red. {tfirst} says the deadline was the end of that day. {student} is upset, because the tutor\'s report for the school counts late work.',
			'Hi, my {child}\'s homework keeps getting a "Late" label even when it\'s handed in the evening before the lesson. What counts as late?'
		],
		guess: [
			'Hi {first}, thanks for writing. Homework is due at the time the tutor sets on the assignment. Could you tell me which assignment it was and when {student} turned it in?',
			'Thanks, {first}. Which assignment was it, and roughly when was it turned in?'
		],
		details: ['It was "{file}", turned in on {when} at about 9 PM.', '"{file}". {student} turned it in around 9 in the evening on {when}.'],
		escalate: [
			'Ops: homework on lesson {lid} marked late although turned in around 9 PM Pacific on the due date. Can you check the stored due time and submission time?',
			'Could ops look at a late mark on lesson {lid}\'s homework?'
		],
		look: [
			'The assignment and the submission, in UTC:',
			'Stored due time and submission time:'
		],
		first: (r, s) => psql(`SELECT a.id, a.due_at, h.submitted_at, h.submitted_at > a.due_at AS late FROM assignments a JOIN homework h ON h.assignment_id = a.id WHERE a.lesson_id = ${s.lid};`, ['id', 'due_at', 'submitted_at', 'late'], [[int(r, 50000, 69999), s.dueAt, `${s.nextIso} 04:0${int(r, 1, 9)}:${pad(int(r, 0, 59))}+00`, 't']]),
		causes: [
			{
				where: 'app',
				set: (r, s) => {
					s.dueAt = `${s.whenIso} 00:00:00+00`;
				},
				found: [
					'The due date was entered as a date with no time, and the app stores that as midnight UTC, which is 5 PM Pacific the day before (4 PM in winter). So "due {when}" really meant due at 5 PM on the day before, and anything turned in on the due date itself is marked late. Every assignment without a time does this.',
					'due_at is 00:00 UTC on {when}: that\'s what a date without a time becomes. In Pacific time it\'s the afternoon before. The student turned it in at 9 PM Pacific on {when}, a full day "late" by the stored time.'
				],
				show: (r, s) => psql('SELECT count(*) FROM assignments WHERE due_at::time = \'00:00\' AND created_at > now() - interval \'90 days\';', ['count'], [[int(r, 800, 3000)]]),
				told: 'Our ops team found the cause, and it\'s a fault on our side. When a tutor sets a due date without a time, our system treats it as due at the very start of that day in a different time zone, which is the afternoon before for you. So {student}\'s work was marked late although it was turned in on the due date.',
				bug: 'Homework due dates without a time are stored as 00:00 UTC on that date (the afternoon before in Pacific time); anything turned in on the due date itself is marked late. Use 23:59 in the tutor\'s time zone.',
				around: 'I\'ve asked {tfirst} to clear the Late mark on this assignment, which tutors can do from the homework page, and to set a time on future assignments, which avoids the problem.',
				ends: ['eng', 'around']
			},
			{
				where: 'none',
				set: (r, s) => {
					s.dueAt = `${s.nextIso} 01:00:00+00`;
				},
				found: [
					'The stored due time is right. {tfirst} set the assignment due at 6 PM Pacific on {when} (01:00 UTC the next day), not at the end of the day, and {student} turned it in at 9:04 PM. The label is correct for the deadline that was set.',
					'Due at 18:00 Pacific on {when}, set explicitly by the tutor when the assignment was made; turned in at 21:04 Pacific. Late by three hours, as labeled.'
				],
				show: (r, s) => psql(`SELECT created_by, due_at AT TIME ZONE 'America/Los_Angeles' AS due_local FROM assignments WHERE lesson_id = ${s.lid};`, ['created_by', 'due_local'], [[Number(s.tid), `${s.whenIso} 18:00:00`]]),
				told: 'Our ops team checked the assignment. It had a due time of 6 PM on {when}, set by {tfirst}, and it was turned in a little after 9 PM, so it was marked late. If {tfirst} meant the end of the day, {tfirst} can change the due time and clear the label from the homework page.',
				ends: ['explained']
			}
		]
	},
	// 26. A renamed folder that looks empty.
	{
		role: 'tutor',
		subjects: ['All my {subj} worksheets disappeared', 'Files gone after renaming a folder', 'Empty folder in my library'],
		opens: [
			'I renamed my "{subj}" folder in the library to "{subj} 2026-27" this morning, and now it\'s empty. All {n2} worksheets in it have vanished from my lessons too: the lesson pages say "File not available". I have lessons all afternoon.',
			'Help! I tidied up my library yesterday, renamed a couple of folders, and now my students can\'t open anything from those folders.'
		],
		guess: [
			'Hi {first}, I\'m sorry, that sounds stressful. Could you try renaming the folder back to its old name and see whether the files reappear? I\'m also asking our ops team to look right away.',
			'Thanks, {first}. As a first step, could you rename the folder back and tell me what you see?'
		],
		details: ['I renamed it back. Still empty.', 'Renamed it back, nothing changed. The lessons still say "File not available".'],
		escalate: [
			'Ops, urgent: tutor {tid} renamed a library folder and all its files now show "File not available" in lessons. Renaming back didn\'t help. {n2} files.',
			'Could ops look straight away? Tutor {tid}\'s files vanished after a folder rename; lessons this afternoon.'
		],
		look: [
			'The files are all still on disk. They were moved, not lost, and they\'re under the new folder name:',
			'Every file is on disk, in the folder with the new name:'
		],
		first: (r, s, day) => listing(r, day, `"/srv/acme/uploads/tutors/${s.tid}/${s.subj} 2026-27/"`, Array.from({ length: Math.min(14, Number(s.n2)) }, () => [`${hex(r, 8)}-${hex(r, 4)}.pdf`, int(r, 60000, 1500000)])),
		causes: [
			{
				where: 'app',
				found: [
					'The rename moved the files on disk to the new folder, but the records in the database still point at the old path, so the app looks where they used to be. Renaming back made a new, empty folder with the old name instead of moving them back. The rename does the move and the database update as two separate steps, and the update ran into a lock held by a lesson in progress and was rolled back, leaving the move in place.',
					'Half a rename: the directory was moved, the file records weren\'t. The record update was rolled back on a lock timeout while one of the tutor\'s lessons held rows; the move on disk had already happened and nothing put it back. Renaming back created a fresh empty folder.'
				],
				show: (r, s) => psql(`SELECT count(*), min(path) FROM files WHERE tutor_id = ${s.tid} AND path LIKE 'tutors/${s.tid}/${s.subj}/%';`, ['count', 'min'], [[Number(s.n2), `tutors/${s.tid}/${s.subj}/${hex(r, 8)}-${hex(r, 4)}.pdf`]]),
				told: 'Our ops team found that your files were never lost: renaming the folder moved them, but a fault on our side meant your lessons kept looking for them in the old place.',
				fix: 'Pointed the {n2} file records at the new folder and removed the empty one with the old name; every lesson link works again. {filed} {eng}: folder rename moves the files before updating their records and doesn\'t undo the move when the update fails.',
				changed: 'We\'ve put everything right: your files are back in the renamed folder and every lesson can open them again. Could you check one or two before your lessons this afternoon?',
				ends: ['fixed']
			}
		]
	}
];

/** More parts of each topic, in the same order as `topics`. None of them depends on the cause. */
interface More {
	/** A sentence the customer may add to the first message. */
	context: string[];
	/** Ops asks support for one more detail, support asks the customer, the customer answers. */
	query: [string, string, string];
	/** Things ops checked and ruled out, each with its output. */
	checks: [string, Art][];
	/** Colleagues' questions about other explanations, with ops's answers. */
	doubts: [string, string][];
	/** Set when the customer has no account yet for ops to paste. */
	noAccount?: true;
}

const grepCount = (file: string, pattern: string, count: number) => [`ops@ops-1:~$ grep -c '${pattern}' ${file}`, String(count)];

const more: More[] = [
	// 1. A worksheet that will not open for a student.
	{
		context: ['The file is about {mb} MB, nothing unusual for me.', 'I printed it for myself without any trouble, so I know the content is all there.'],
		query: ['Could you ask the tutor when the students last opened one of this tutor\'s files without trouble? I want to know what changed between then and now.', 'One more question from our team: when did your students last open one of your worksheets without any trouble?', 'Last week\'s worksheet opened for everyone, as far as I know. This is the first new file since then.'],
		checks: [
			['The file is attached to the lesson once, and every student on the lesson is allowed to see it.', (r, s) => psql(`SELECT a.lesson_id, a.name, count(st.student_id) AS students, bool_and(st.files_visible) AS visible FROM lesson_files a JOIN lesson_students st USING (lesson_id) WHERE a.lesson_id = ${s.lid} AND a.name = '${s.file.replace(/'/g, "''")}' GROUP BY 1, 2;`, ['lesson_id', 'name', 'students', 'visible'], [[Number(s.lid), s.file, int(r, 1, 3), 't']])],
			['Nothing for this key in the files host error log, so nothing went wrong while serving it.', (r, s) => grepCount('/var/log/nginx/files.error.log', s.key, 0)],
			['The file has the same owner and mode as the tutor\'s other uploads.', (r, s, day) => listing(r, day, `/srv/acme/uploads/tutors/${s.tid}/`, [[`${s.key}.pdf`, Number(s.bytes)], ...Array.from({ length: 4 }, (): [string, number] => [`${fileKey(r)}.pdf`, int(r, 60000, 1800000)])])]
		],
		doubts: [['Could the preview step have touched the file? It ran on that tutor\'s uploads the same day.', 'No. Previews read the PDF and write a PNG beside it; they never write to the PDF. Its modification time is still the upload time.'], ['Is it worth asking the tutor to send us the original?', 'Not yet. The damage is the kind a Print to PDF driver leaves, so a fresh export will help more than the old file.']]
	},
	// 2. An upload refused as too large.
	{
		context: ['It took me most of the weekend to put together.', 'Last term I uploaded packets like this without any trouble, as far as I remember.'],
		query: ['Can you ask the tutor whether this is the original file or an exported copy? There are sometimes two versions with different sizes.', 'Our team asked whether the file you\'re uploading is the original, or a copy exported from another program?', 'It\'s the only version I have. I made it and saved it as a PDF straight away.'],
		checks: [
			['The limit is the only thing that turned it away. No errors from the upload service itself, and other tutors uploaded files of over 20 MB the same day.', (r, s) => psql(`SELECT count(*), max(size) FROM files WHERE created_at::date = '${s.whenIso}' AND size > 20000000;`, ['count', 'max'], [[int(r, 3, 19), int(r, 24000000, 24990000)]])],
			['The limit hasn\'t changed lately. Same value in the app\'s settings since the spring release.', () => ['ops@ops-1:~$ ssh app-1 grep MAX_ATTACHMENT /etc/acme/app.env', 'MAX_ATTACHMENT_BYTES=25000000']],
			['The tutor\'s other uploads this month went through, all well under the limit.', (r, s) => psql(`SELECT name, size FROM files WHERE tutor_id = ${s.tid} ORDER BY created_at DESC LIMIT 4;`, ['name', 'size'], Array.from({ length: 4 }, () => [`${s.subj} - ${cap(fill(pick(r, stems), { n: String(int(r, 1, 9)) }))}.pdf`, int(r, 150000, 9000000)]))]
		],
		doubts: [['Is it worth raising the limit for this one tutor?', 'We can\'t do it per tutor; the limit is global. Raising it for everyone means a word with the engineers about memory on the upload service first.'], ['Could the browser be adding something to the file on the way?', 'No. The size in the log is what arrived, and it matches the size the browser reported before sending.']]
	},
	// 3. Another tutor's worksheet on a family's lesson.
	{
		context: ['{student} has been with {tfirst} since the spring and we\'ve never had a problem before.', 'I only noticed because {student} asked me why the worksheet was about something {she} had never studied.'],
		query: ['Can we ask the family whether they downloaded the worksheet or only viewed it? It doesn\'t change the fix, but I want it in the notes.', 'Our team asked one more thing for their notes: did {student} download the worksheet, or only open it on the lesson page?', 'Only opened it on the page, I think. We didn\'t print it.'],
		checks: [
			['Nobody outside the lesson has fetched the family\'s own files. Every request for them came from the family\'s or the tutor\'s sessions.', (r) => psql('SELECT role, count(*) FROM file_access WHERE file_id IN (SELECT file_id FROM homework WHERE family_id = $1) GROUP BY 1;', ['role', 'count'], [['parent', int(r, 2, 20)], ['student', int(r, 10, 80)], ['tutor', int(r, 10, 60)]])],
			['The other tutor\'s worksheet is still on that tutor\'s own lessons too, where it belongs.', (r, s) => psql(`SELECT l.tutor_id, count(*) FROM lesson_files a JOIN lessons l ON l.id = a.lesson_id WHERE a.file_id = (SELECT file_id FROM lesson_files WHERE lesson_id = ${s.lid} AND name = '${s.file.replace(/'/g, "''")}') GROUP BY 1;`, ['tutor_id', 'count'], [[Number(s.otherTid), int(r, 2, 9)], [Number(s.tid), 1]])],
			['Every other attachment on the family\'s lessons belongs to their own tutor.', (r, s) => psql(`SELECT f.tutor_id, count(*) FROM lesson_files a JOIN files f ON f.id = a.file_id JOIN lessons l ON l.id = a.lesson_id WHERE l.family_id = ${s.fid} GROUP BY 1;`, ['tutor_id', 'count'], [[Number(s.tid), int(r, 12, 70)], [Number(s.otherTid), 1]])]
		],
		doubts: [['Should we tell the other tutor that their worksheet showed up on someone else\'s lesson?', 'Support\'s call, but it was one worksheet with no student data in it, seen by one family. I\'d mention it to them as a courtesy.'], ['Does this need reporting anywhere as a data issue?', 'I asked. One worksheet with no personal information in it, seen inside one family\'s lesson, doesn\'t need reporting. It\'s in our log anyway.']]
	},
	// 4. A link that answers 404.
	{
		context: ['It\'s a worksheet I use every week, so the students notice straight away.', 'I uploaded it on {when} from my laptop, same as the others.'],
		query: ['Can you ask the tutor which computer the file was uploaded from, and from which page: the library or the lesson?', 'Our team asked: which computer did you upload the file from, and was it from the library or from the lesson page?', 'From my MacBook, using the library page. Then I attached it to the lesson.'],
		checks: [
			['The record and the lesson agree: the attachment points at this file, and the file is on disk with the size recorded at upload.', (r, s, day) => listing(r, day, `/srv/acme/uploads/tutors/${s.tid}/${s.key}/`, [[s.file.replace(/ /g, '\\ '), Number(s.bytes)]])],
			['The tutor\'s other files answer 200 from the same lesson page, so the files host and the tutor\'s folder are fine.', (r, s, day) => [`ops@ops-1:~$ grep '/t/${s.tid}/' /var/log/nginx/files.access.log | grep -v '${s.key}' | tail -3`, ...accessLog(r, day, 3, { path: `/t/${s.tid}/${fileKey(r)}/${encodeURIComponent(`${s.subj} - warm-ups ${s.n}.pdf`)}`, status: 200, bytes: int(r, 90000, 900000) })]],
			['Nothing changed on the files host around the day the file was uploaded.', (r) => ['ops@ops-1:~$ ssh files-1 git -C /etc/nginx log --since=30.days --oneline', `${hex(r, 7)} raise client_max_body_size for uploads`]]
		],
		doubts: [['Could re-adding the file have left a second record pointing nowhere?', 'Each re-add made a new record and a new copy on disk, and all three behave the same way. The records are fine.'], ['Would clearing a cache somewhere fix it?', 'There\'s no cache in front of the files host for these links. The 404 comes straight from it.']]
	},
	// 5. A lesson shown at the wrong time.
	{
		context: ['{tfirst} has been very understanding, but we can\'t keep missing lessons.', 'The first few weeks were fine. I think it started when we changed {student}\'s lesson day.'],
		query: ['Can you ask the family where they read the time: on the lesson page, in the reminder email or in their own calendar?', 'Our team would like to know where you usually check the lesson time: on the lesson page, in the reminder email, or in your own calendar?', 'Mostly in the calendar on my phone, from the invite you send.'],
		checks: [
			['The series was booked once and hasn\'t been edited since, so this isn\'t a change of day gone wrong.', (r, s) => psql(`SELECT id, created_at::date, updated_at::date, updated_by FROM lesson_series WHERE id = ${s.lid};`, ['id', 'created_at', 'updated_at', 'updated_by'], [[Number(s.lid), s.when2Iso, s.when2Iso, Number(s.tid)]])],
			['Reminder emails go out 24 hours before each lesson\'s stored start, as they should.', (r, s, day) => [`ops@ops-1:~$ grep 'lesson=${s.lid}' /var/log/acme/mail-events.log | tail -2`, ...Array.from({ length: 2 }, (_, i) => `${isoStamp(day - 7 * (2 - i), int(r, 0, 86399))} event=delivered template=lesson_reminder lesson=${s.lid} smtp=250`)]],
			['The lesson page simply shows the stored time in the family\'s time zone; nothing else is involved.', (r, s) => [`ops@ops-1:~$ curl -s http://app-1.internal/internal/lessons/${s.lid} | grep -o '"starts_at":"[^"]*"'`, `"starts_at":"${s.seriesDates.split(',')[0]}T${s.utcStart === 'east' ? '21:30' : '00:30'}:00Z"`]]
		],
		doubts: [['Could the family have two accounts, one of them set to Eastern?', 'No. One family account and one student account, both Pacific. I looked for others with the same email and phone number.'], ['Could the tutor have typed the wrong time when booking?', 'The booking form logged 17:30 from the tutor\'s browser, so the tutor typed what they meant.']]
	},
	// 6. A paid invoice still shown as unpaid.
	{
		context: ['We\'ve paid every invoice on time since {student} started.', 'I\'ve attached a photo of the line on the bank statement.'],
		query: ['Can we ask the parent whether they paid from the invoice page or from the link in the email? They go through slightly different routes.', 'Our team asked: did you pay from the invoice page in the app, or from the link in an email?', 'From the email link, I think. The one that came the evening the invoice was issued.'],
		checks: [
			['The card processor has exactly one charge on this card that day, so the family hasn\'t been charged twice.', (r, s) => [`ops@ops-1:~$ grep 'card=${s.card}' /var/log/acme/payments.log | grep '${s.whenIso}'`, `${s.whenIso}T${s.paidAt}:${pad(int(r, 0, 59))}Z charge succeeded family=${s.fid} amount=${s.amt.slice(1)} card=${s.card} processor_ref=ch_${hex(r, 14)}`]],
			['No refund or dispute on the account.', (r, s) => psql(`SELECT count(*) FROM refunds WHERE family_id = ${s.fid} AND created_at > now() - interval '60 days';`, ['count'], [[0]])],
			['The invoice total is right for the lessons it covers.', (r, s) => psql(`SELECT count(*), sum(amount) FROM invoice_lines WHERE invoice_id = ${s.inv};`, ['count', 'sum'], [[int(r, 2, 4), s.amt.slice(1)]])]
		],
		doubts: [['Should we pause the reminders on this account while we look?', 'Already done: I paused the reminder schedule for the family until this is sorted.'], ['Could the bank be showing a pending charge that never settled?', 'The processor shows it settled the same day, so the money really moved.']]
	},
	// 7. A new tutor told the email is already in use.
	{
		noAccount: true,
		context: ['I\'ve been looking forward to starting, so this is a bit frustrating.', 'The approval email came to the same address without any problem.'],
		query: ['Can we ask whether the tutor has ever used another address with us, or a school one?', 'Our team asked: have you ever used a different email address with us, perhaps a school or work one?', 'Not that I remember. I\'ve had this address for years.'],
		checks: [
			['The tutor\'s application record is fine and uses the same address.', (r, s) => psql(`SELECT id, email, status, decided_at::date FROM tutor_applications WHERE email = '${s.email}';`, ['id', 'email', 'status', 'decided_at'], [[int(r, 7000, 9999), s.email, 'approved', s.whenIso]])],
			['Sign-up refused the address and nothing else: no rate limit, no failed captcha.', (r, s, day) => [`ops@ops-1:~$ grep 'signup' /var/log/acme/app.log | grep '${s.email}'`, ...appLog(r, day, Array.from({ length: 3 }, () => `signup refused reason=email_taken email=${s.email}`))]],
			['The address isn\'t on our blocked list and isn\'t bouncing.', (r, s) => psql(`SELECT count(*) FROM email_suppressions WHERE lower(email) = lower('${s.email}');`, ['count'], [[0]])]
		],
		doubts: [['Could this be somebody else\'s account using the tutor\'s address?', 'I looked at what the account has done and where it has been used from. Nothing suggests anyone else.'], ['Could we create the tutor account by hand?', 'Not while the address is taken. It fails the same way from our side; the existing account has to be sorted out first.']]
	},
	// 8. A search that finds no tutors.
	{
		context: ['My {child} has a test in a few weeks, so I\'d like to book soon.', 'I\'ve tried on my phone and on my laptop.'],
		query: ['Can we ask the parent exactly what they typed in the search box?', 'Our team asked: what exactly did you type in the search box?', 'Just "{subj}", the way the school writes it.'],
		checks: [
			['Search itself is fine and answering other subjects; it served a couple of thousand searches in the last hour.', (r) => grepCount('/var/log/acme/app.log', 'path=/search.*status=200', int(r, 1800, 2900))],
			['The tutor isn\'t hidden by the price or rating filters; both are in the middle of the range.', (r, s) => psql(`SELECT hourly_rate, rating, reviews FROM tutors WHERE id = ${s.tid};`, ['hourly_rate', 'rating', 'reviews'], [[`${int(r, 9, 15) * 5}.00`, `4.${int(r, 5, 9)}`, int(r, 12, 140)]])],
			['The search index was rebuilt overnight as usual, with no errors.', (r, s, day) => ['ops@ops-1:~$ grep \'search index\' /var/log/acme/app.log | tail -1', ...appLog(r, day, [`search index rebuilt tutors=${int(r, 420, 560)} subjects=${int(r, 140, 190)} duration_ms=${int(r, 9000, 30000)}`])]]
		],
		doubts: [['Could the tutor have paused the profile?', 'No, a paused profile has status paused. This one is approved and public.'], ['Could the tutor\'s profile be set to stay out of search?', 'There\'s no such setting for approved tutors. Public means listed.']]
	},
	// 9. A slow dashboard.
	{
		context: ['I check the dashboard before every lesson, so it adds up.', 'Sometimes it gives up completely and I have to reload.'],
		query: ['Can you ask the tutor whether the whole page is slow, or the page appears and then the lesson list takes its time?', 'Our team asked: is it the whole page that takes long, or does the page appear and then the lesson list takes its time?', 'The page appears, then the lesson list spins for ages. The menu works while it spins.'],
		checks: [
			['The database isn\'t under strain. Nothing waiting on locks, nothing queued, CPU on db-1 at its usual level.', (r) => psql('SELECT state, count(*) FROM pg_stat_activity WHERE datname = \'tutors\' GROUP BY 1;', ['state', 'count'], [['active', int(r, 2, 6)], ['idle', int(r, 20, 48)], ['idle in transaction', int(r, 0, 1)]])],
			['The app answers the tutor\'s other pages quickly.', (r, s, day) => [`ops@ops-1:~$ grep 'tutor=${s.tid}' /var/log/acme/app.log | grep 'path=' | grep -v dashboard | tail -3`, ...appLog(r, day, Array.from({ length: 3 }, () => `request path=${pick(r, ['/profile', '/earnings', '/messages', '/availability'])} tutor=${s.tid} status=200 duration_ms=${int(r, 60, 240)}`))]],
			['The tutor\'s browser isn\'t the problem: the time is spent on our side before the first byte goes out.', (r, s, day) => [`ops@ops-1:~$ grep 'GET /dashboard' /var/log/nginx/app.access.log | grep '${s.ip}' | tail -3`, ...accessLog(r, day, 3, { path: '/dashboard', status: 200, bytes: int(r, 18000, 60000) }).map((line) => `${line.replace(/^\S+/, s.ip)} rt=${int(r, 38, 61)}.${int(r, 100, 999)}`)]]
		],
		doubts: [['Is this the slowness people mentioned after the July release?', 'No, that was the messages page, and it was fixed the same week. This is only the dashboard, and only for tutors with long histories.'], ['Could we hide the tutor\'s oldest lessons from the dashboard for now?', 'Not without the engineers. The dashboard has no switch for it, and the tutor uses the history for reports.']]
	},
	// 10. Lessons twice in a calendar.
	{
		context: ['I rely on my calendar to know when I\'m teaching, so this is a real problem.', 'I tried removing the duplicates by hand, but they come back.'],
		query: ['Can we ask the tutor whether they\'ve ever reset the calendar link in their settings?', 'Our team asked: have you ever used "Reset link" on the calendar feed page in your settings?', 'I think I did once, a while ago, when I changed phones. I can\'t remember exactly when.'],
		checks: [
			['The feed answers quickly and is valid.', (r, s) => [`ops@ops-1:~$ curl -s -o /dev/null -w '%{http_code} %{size_download} %{time_total}\\n' http://app-1.internal/calendar/${s.token}.ics`, `200 ${int(r, 18000, 40000)} 0.${pad(int(r, 4, 40), 3)}`]],
			['The tutor has one account and one feed; nothing is shared with another account.', (r, s) => psql(`SELECT count(*) FROM calendar_feeds WHERE tutor_id = ${s.tid} AND revoked_at IS NULL;`, ['count'], [[1]])],
			['The lessons themselves aren\'t doubled in the database: one row per lesson.', (r, s) => psql(`SELECT count(*), count(DISTINCT id) FROM lessons WHERE tutor_id = ${s.tid} AND starts_at > now();`, ['count', 'count'], (() => { const count = int(r, 20, 60); return [[count, count]]; })())]
		],
		doubts: [['Could it just be Google being slow to refresh and showing an old copy?', 'Google refreshes these about every twelve hours, which would leave a moved lesson in its old place for a while, but it wouldn\'t make two copies that stay.'], ['Could the tutor\'s phone be adding a second copy through another app?', 'Possible in general, but every request for the feed comes from Google\'s servers, not from a phone.']]
	},
	// 11. Password reset emails that never arrive.
	{
		context: ['I had the password saved on my old laptop, but that died last week.', 'I can see {student}\'s lessons on {her} account, but I need mine to pay.'],
		query: ['Can you ask the parent whether they get our other emails, like lesson reminders and receipts?', 'Our team asked: do you get our other emails, such as lesson reminders and receipts?', 'I\'m not sure. I don\'t think I\'ve seen a receipt in a while, but the reminders might go to {student}.'],
		checks: [
			['The reset emails work for everyone else: plenty delivered in the same hours.', (r) => grepCount('/var/log/acme/mail-events.log', 'event=delivered template=password_reset', int(r, 140, 420))],
			['The parent wasn\'t rate-limited; every request was under the five-an-hour limit.', (r) => grepCount('/var/log/acme/app.log', 'password_reset throttled', 0)],
			['The account isn\'t locked, and there are no failed sign-ins on it.', (r, s) => psql(`SELECT locked, failed_logins, last_sign_in_at::date FROM users WHERE family_id = ${s.fid} AND role = 'parent';`, ['locked', 'failed_logins', 'last_sign_in_at'], [['f', 0, s.when2Iso]])]
		],
		doubts: [['Should we just set a temporary password for them?', 'We don\'t do that by email. Support can send a one-time sign-in link to an address once we know it reaches them.'], ['Could our sending domain be on a blocklist?', 'No. The same emails reach every other provider today, and the domain isn\'t listed anywhere I checked.']]
	},
	// 12. Grey previews.
	{
		context: ['It\'s cosmetic, I know, but the younger students use the pictures to find the right sheet.', 'I made these with a new template I bought this month.'],
		query: ['Can we ask the tutor which program the new worksheets are made in?', 'Our team asked: which program did you use to make the new worksheets?', 'Word on my Mac, with a template I bought online.'],
		checks: [
			['The preview step is healthy. It made previews for a few hundred other files today and they look normal.', (r, s) => [`ops@ops-1:~$ find /srv/acme/uploads/previews -newermt '${s.whenIso}' -name '*.png' | wc -l`, String(int(r, 80, 260))]],
			['The files open normally in a browser, every page present.', (r, s) => [`ops@ops-1:~$ pdfinfo /srv/acme/uploads/${s.path} | grep -E 'Pages|Encrypted|PDF version'`, `Pages:           ${s.pages}`, 'Encrypted:       no', `PDF version:     1.${int(r, 4, 7)}`]],
			['The previews of the tutor\'s older files are unchanged and still look right.', (r, s, day) => listing(r, day - 40, `/srv/acme/uploads/previews/${s.tid}/ | head -5`, Array.from({ length: 3 }, (): [string, number] => [`${fileKey(r)}.png`, int(r, 9000, 26000)]))]
		],
		doubts: [['Could we just make the previews again for these files?', 'I tried it on two of them. The new images come out the same.'], ['Did the preview tool change in the July release?', 'No, it\'s the same version as in the spring.']]
	},
	// 13. "403 Forbidden" on new files.
	{
		context: ['I uploaded the new ones the same way I always do.', 'Even the ones I uploaded this morning do it.'],
		query: ['Can you ask the tutor how the students open the files: from the lesson page, or from links somewhere else?', 'Our team asked: how do your students open the files? From the lesson page, or from links you\'ve shared with them some other way?', 'From the lesson page, mostly. I also put the links in our group\'s shared notes this term to make it easier for them.'],
		checks: [
			['The app\'s own permission check passes for these students: they\'re on the lessons, and sharing is on.', (r, s) => psql(`SELECT student_id, files_visible FROM lesson_students WHERE lesson_id = ${s.lid};`, ['student_id', 'files_visible'], Array.from({ length: 3 }, () => [int(r, 10000, 99999), 't']))],
			['The files host\'s configuration hasn\'t changed this month.', (r) => ['ops@ops-1:~$ ssh files-1 git -C /etc/nginx log --oneline -3', `${hex(r, 7)} raise client_max_body_size for uploads`, `${hex(r, 7)} add files.error.log`, `${hex(r, 7)} initial import`]],
			['The students\' sessions are valid and recent.', (r, s) => psql(`SELECT user_id, created_at::date, revoked FROM sessions WHERE user_id IN (SELECT student_id FROM lesson_students WHERE lesson_id = ${s.lid});`, ['user_id', 'created_at', 'revoked'], Array.from({ length: 3 }, () => [int(r, 10000, 99999), s.whenIso, 'f']))]
		],
		doubts: [['Did anything change on the files host this week?', 'Nothing in its configuration; I checked the history. Whatever this is, it isn\'t a new rule on the files host.'], ['Is it worth restarting nginx on the files host?', 'No. A restart wouldn\'t change what it refuses or why.']]
	},
	// 14. The same file many times over in a library.
	{
		context: ['I have a few hundred files in my library and it\'s getting hard to manage.', 'It seems to have started a few weeks ago.'],
		query: ['Can you ask the tutor whether the copies appear straight after an upload, or turn up later on their own?', 'Our team asked: do the copies appear straight after you upload, or do they turn up later by themselves?', 'I honestly can\'t tell. I usually only notice when I go to attach something.'],
		checks: [
			['The tutor is nowhere near the library limit, so nothing was refused or retried for space.', (r, s) => psql(`SELECT count(*), pg_size_pretty(sum(size)) FROM files WHERE tutor_id = ${s.tid};`, ['count', 'pg_size_pretty'], [[int(r, 120, 260), `${int(r, 60, 180)} MB`]])],
			['No other tutor shows the same pattern this month.', (r, s) => psql('SELECT tutor_id, count(*) - count(DISTINCT sha256) AS copies FROM files WHERE created_at > now() - interval \'30 days\' GROUP BY 1 ORDER BY 2 DESC LIMIT 3;', ['tutor_id', 'copies'], [[Number(s.tid), int(r, 60, 140)], [int(r, 1200, 9800), int(r, 2, 4)], [int(r, 1200, 9800), int(r, 1, 2)]])],
			['The upload API isn\'t retrying on its own: one request per copy in the access log.', (r, s, day) => [`ops@ops-1:~$ grep 'POST /api/uploads' /var/log/nginx/app.access.log | grep '${s.ip}' | tail -4`, ...accessLog(r, day, 4, { path: '/api/uploads', status: 201, bytes: int(r, 300, 500), method: 'POST' }).map((line) => line.replace(/^\S+/, s.ip))]]
		],
		doubts: [['Can we clear the copies for the tutor from here?', 'We could, but some of them are attached to lessons. It\'s safer for the tutor to do it in the library, which warns about attachments.'], ['Do the copies count against the tutor\'s storage?', 'They do, but the tutor is nowhere near the limit, so they haven\'t caused anything else.']]
	},
	// 15. Files that will not open on a school's network.
	{
		context: ['Our district IT updated something over the break, but they say it shouldn\'t affect you.', 'The students are falling behind on their worksheets because of it.'],
		query: ['Can we ask the school for the address their network shows to the outside world? Any "what is my IP" page shows it.', 'Our team asked whether you could open a "what is my IP address" page on one of the school laptops and send us the address it shows.', 'It says {schoolIp}. I hope that\'s what you need.'],
		checks: [
			['The files host is fine for everyone else: normal traffic from homes and other schools all day.', (r) => grepCount('/var/log/nginx/files.access.log', '" 200 ', int(r, 18000, 46000))],
			['The same tutors\' students open the same files from home without trouble.', (r, s, day) => ['ops@ops-1:~$ grep \'" 200 \' /var/log/nginx/files.access.log | grep -v \'' + s.schoolIp + '\' | tail -3', ...accessLog(r, day, 3, { path: `/t/${int(r, 1200, 9800)}/${fileKey(r)}.pdf`, status: 200, bytes: int(r, 60000, 1600000), from: 1 })]],
			['The school\'s address isn\'t on our block list.', (r, s) => [`ops@ops-1:~$ ssh files-1 grep -c '${s.schoolIp}' /etc/nginx/conf.d/blocked.conf`, '0']]
		],
		doubts: [['Could the laptops simply be out of date?', 'They\'re on the Chrome version the district rolled out last month, the same as at other schools that have no trouble.'], ['Could it be the district\'s new laptops rather than the network?', 'The same laptops work at the students\' homes, so it\'s the building, not the laptops.']]
	},
	// 16. A replaced worksheet that still shows the old version.
	{
		context: ['The mistake was in the answer key, so it\'s causing real confusion.', 'I\'ve told the students about the mistake, but they keep asking.'],
		query: ['Can you ask the tutor how the students open the file: from the lesson page, or from a copy they saved?', 'Our team asked: do your students open the worksheet from the lesson page each time, or from a copy they downloaded?', 'I assume from the lesson page, but I really don\'t know. Some of them like to print things.'],
		checks: [
			['The replacement itself worked: the record points at the new file, and the old one is no longer on disk.', (r, s) => psql(`SELECT id, size, replaced_at FROM files WHERE key = '${s.key}';`, ['id', 'size', 'replaced_at'], [[int(r, 300000, 499999), Number(s.bytes), `${s.whenIso} ${pad(int(r, 14, 21))}:${pad(int(r, 0, 59))}`]])],
			['The lesson page links to the right key.', (r, s) => [`ops@ops-1:~$ curl -s http://app-1.internal/internal/lessons/${s.lid}/files | grep -o '"key":"[^"]*"'`, `"key":"${s.key}"`]],
			['The replacement was recorded once, at the time the tutor says.', (r, s, day) => [`ops@ops-1:~$ grep 'key=${s.key}' /var/log/acme/app.log | grep replaced`, ...appLog(r, Number(s.whenDay), [`file replaced tutor=${s.tid} key=${s.key} old_size=${Number(s.bytes) - int(r, 900, 9000)} new_size=${s.bytes}`])]]
		],
		doubts: [['Could a proxy at the students\' school be holding on to the old copy?', 'Two of the three open it at home in the evenings, on different internet providers. It isn\'t a shared proxy.'], ['Could the students be looking at last week\'s printout?', 'Possible for one of them, but they describe what\'s on their screens.']]
	},
	// 17. A payout that looks short.
	{
		context: ['I rely on these payouts, so I\'d like to understand it.', 'I\'ve attached my spreadsheet for that week.'],
		query: ['Can we ask the tutor whether that week\'s lessons were all with regular students, or some were one-offs?', 'Our team asked: were all of that week\'s lessons with your regular students, or were some one-off bookings?', 'All regulars. I\'ve taught every one of them for months.'],
		checks: [
			['The fee is the tutor\'s usual 15%, applied the same way to every lesson in the payout.', (r, s) => psql(`SELECT DISTINCT fee_rate FROM payout_lines WHERE payout_id = ${s.payout} AND tutor_id = ${s.tid};`, ['fee_rate'], [['0.15']])],
			['The payout total matches the sum of its lines; nothing was dropped when it was sent.', (r, s) => psql(`SELECT p.total, sum(l.amount) FROM payouts p JOIN payout_lines l ON l.payout_id = p.id WHERE p.id = ${s.payout} AND p.tutor_id = ${s.tid} GROUP BY 1;`, ['total', 'sum'], (() => { const total = (Number(s.rate) * 0.85 * (Number(s.n) - 2) + (s.oddStatus === 'no_show' ? 0 : Number(s.rate) * 0.85)).toFixed(2); return [[total, total]]; })())],
			['The payout went to the tutor\'s bank on the usual day and wasn\'t returned.', (r, s) => [`ops@ops-1:~$ grep 'payout=${s.payout}' /var/log/acme/payments.log | grep 'tutor=${s.tid}'`, `${s.weekDates.split(',')[4]}T16:${pad(int(r, 0, 59))}:${pad(int(r, 0, 59))}Z payout sent payout=${s.payout} tutor=${s.tid} status=paid processor_ref=po_${hex(r, 14)}`]]
		],
		doubts: [['Any chance the payout run missed lessons that finished late on the Wednesday?', 'No, the cut-off is midnight Wednesday Pacific, and the last lesson that week finished at 7 PM.'], ['Did the tax form change anything this month?', 'No. Nothing is withheld for tutors here; the 1099 is only a report.']]
	},
	// 18. A tutor with no times to book.
	{
		context: ['{tfirst} was recommended to us by {student}\'s teacher.', 'We\'d like to start next week if possible.'],
		query: ['Can you ask the parent whether they\'re signed in when they look at the booking page?', 'Our team asked: are you signed in to your account when you look at the booking page?', 'Yes, I\'m signed in. I can see {student}\'s profile in the corner.'],
		checks: [
			['The tutor isn\'t fully booked: a couple of lessons a week, plenty of room.', (r, s) => psql(`SELECT count(*) FROM lessons WHERE tutor_id = ${s.tid} AND starts_at BETWEEN now() AND now() + interval '28 days';`, ['count'], [[int(r, 4, 12)]])],
			['The booking page works for this family with other tutors; they were shown slots for two others yesterday.', (r, s, day) => [`ops@ops-1:~$ grep 'family=${s.fid}' /var/log/acme/app.log | grep book | tail -2`, ...appLog(r, day - 1, Array.from({ length: 2 }, () => `request path=/tutors/${int(r, 1200, 9800)}/book family=${s.fid} status=200 slots=${int(r, 6, 30)}`))]],
			['The family\'s account has no block or restriction on it.', (r, s) => psql(`SELECT id, status, booking_blocked FROM families WHERE id = ${s.fid};`, ['id', 'status', 'booking_blocked'], [[Number(s.fid), 'active', 'f']])]
		],
		doubts: [['Could the tutor have reached the limit on regular students?', 'The limit is 40, and this tutor has {n}.'], ['Is the booking page cached for signed-in families?', 'No, availability is fetched fresh every time the page loads.']]
	},
	// 19. Scanned homework that shows sideways.
	{
		context: ['I spend a long time on my homework, so I want {tfirst} to be able to read it.', 'It started when I began scanning instead of taking photos.'],
		query: ['Can we ask the student whether every page comes out sideways or only some?', 'Our team asked: is every page sideways, or only some of them?', 'I think all of them. {tfirst} says all of them.'],
		checks: [
			['The scans are on the right lesson, and the tutor\'s account can open them.', (r, s) => psql(`SELECT id, lesson_id, pages, created_at FROM homework WHERE lesson_id = ${s.lid} ORDER BY created_at DESC LIMIT 3;`, ['id', 'lesson_id', 'pages', 'created_at'], Array.from({ length: 3 }, (_, i) => [int(r, 60000, 89999), Number(s.lid), int(r, 2, 6), `${isoDate(Number(s.whenDay) - i * 7)} ${pad(int(r, 15, 22))}:${pad(int(r, 0, 59))}`]))],
			['Other students\' scans on this tutor\'s lessons show the right way up.', (r, s) => psql(`SELECT count(*) FROM homework WHERE tutor_id = ${s.tid} AND created_at > now() - interval '30 days';`, ['count'], [[int(r, 12, 60)]])],
			['The student\'s uploads arrive whole; no failed or partial uploads.', (r, s, day) => [`ops@ops-1:~$ grep 'lesson=${s.lid}' /var/log/acme/app.log | grep 'homework submitted' | tail -3`, ...appLog(r, day, Array.from({ length: 3 }, () => `homework submitted lesson=${s.lid} size=${int(r, 900000, 4800000)} pages=${int(r, 2, 6)}`))]]
		],
		doubts: [['Could we rotate the pages for them when they\'re uploaded?', 'Not safely in general: we\'d have to guess which way is up. That\'s a question for the engineers, not something to do by hand.'], ['Could the tutor\'s screen be set to portrait?', 'No, other students\' homework shows correctly on the same screen.']]
	},
	// 20. Uploads that stop at 99%.
	{
		context: ['I\'ve wasted a whole evening on this.', 'It used to work fine with the same kind of files.'],
		query: ['Can you ask the tutor roughly how long the bar takes to reach 99%?', 'Our team asked: roughly how long does the progress bar take to get to 99%?', 'About a minute, maybe a little less. Then it sits there.'],
		checks: [
			['Small uploads from the same tutor go through in a few seconds.', (r, s, day) => [`ops@ops-1:~$ grep '${s.ip}' /var/log/nginx/files.access.log | grep 'POST /upload' | grep ' 201 ' | tail -3`, ...accessLog(r, day, 3, { path: '/upload', status: 201, bytes: int(r, 200, 400), method: 'POST' }).map((line) => line.replace(/^\S+/, s.ip))]],
			['The files host has plenty of memory and isn\'t busy.', (r) => ['ops@ops-1:~$ ssh files-1 free -m', '               total        used        free      shared  buff/cache   available', `Mem:            7944        ${int(r, 900, 1900)}        ${int(r, 400, 1400)}          ${int(r, 20, 90)}        ${int(r, 4100, 5600)}        ${int(r, 5600, 6800)}`, 'Swap:              0           0           0']],
			['Other tutors\' uploads complete normally today, slow connections included.', (r, s, day) => [`ops@ops-1:~$ grep 'POST /upload' /var/log/nginx/files.access.log | grep ' 201 ' | grep -v '${s.ip}' | tail -3`, ...accessLog(r, day, 3, { path: '/upload', status: 201, bytes: int(r, 200, 400), method: 'POST' }).map((line) => `${line} rt=${int(r, 8, 40)}.${int(r, 100, 999)}`)]]
		],
		doubts: [['Could the virus scan be what\'s slow?', 'It\'s part of what runs after an upload, but on its own it takes a few seconds even for a big file.'], ['Could a browser extension be getting in the way?', 'They tried a second browser with the same result, and the error log entries are identical.']]
	},
	// 21. A profile photo that will not save.
	{
		context: ['I\'ve tried in Chrome and in Safari.', 'The cropping box shows the photo fine, which makes it more confusing.'],
		query: ['Can we ask the tutor roughly how big the photos are, in megabytes?', 'Our team asked: roughly how big are the photo files, in megabytes?', 'Between two and ten megabytes, I think. One of them is bigger than the others.'],
		checks: [
			['Photo uploads work for other tutors today; plenty saved in the last few hours.', (r) => grepCount('/var/log/acme/app.log', 'photo stored', int(r, 20, 90))],
			['The rest of the profile saves fine without a photo; no other errors for this tutor.', (r, s) => grepCount('/var/log/acme/app.log', `tutor=${s.tid}.*error`, 3)],
			['The cropper sends the photo whole: the request size matches the file.', (r, s, day) => [`ops@ops-1:~$ grep 'POST /profile/photo' /var/log/nginx/app.access.log | grep '${s.ip}' | tail -2`, ...accessLog(r, day, 2, { path: '/profile/photo', status: 422, bytes: 61, method: 'POST' }).map((line) => line.replace(/^\S+/, s.ip))]]
		],
		doubts: [['Could we put the photo on the profile ourselves if they email it to support?', 'We could, but they\'d hit the same thing next time, and we\'d rather know what\'s wrong.'], ['Could the photo carry location data that we refuse?', 'We strip that ourselves; it never stops a save.']]
	},
	// 22. Students locked out after a school changed its email addresses.
	{
		context: ['Our program runs three afternoons a week, so this is holding up a lot of lessons.', 'The district IT department says the old addresses won\'t come back.'],
		query: ['Can we ask the school how the students signed in before the change: with a password, or with the district\'s sign-in button?', 'Our team asked: before the change, did your students sign in with a password, or with the district sign-in button?', 'I\'m honestly not sure. I think it varies. I can ask a couple of students tomorrow.'],
		checks: [
			['None of these accounts are locked or suspended.', (r, s) => psql(`SELECT status, count(*) FROM users WHERE org_id = ${s.org} GROUP BY 1;`, ['status', 'count'], [['active', Number(s.n2) + int(r, 2, 6)]])],
			['The school\'s organization and contract are active.', (r, s) => psql(`SELECT id, name, contract_ends FROM organizations WHERE id = ${s.org};`, ['id', 'name', 'contract_ends'], [[Number(s.org), s.school, `2027-0${int(r, 6, 8)}-30`]])],
			['Nobody has made a second account on a new address in the meantime.', (r, s) => psql(`SELECT count(*) FROM users WHERE email LIKE '%@learn.${s.district}.example.org';`, ['count'], [[0]])]
		],
		doubts: [['Is there any risk of giving an account to the wrong student if two names clash?', 'I checked the list: no two students share the part before the @ on either domain.'], ['Could the students sign in with a student number instead?', 'We don\'t hold student numbers for this school, only the email addresses.']]
	},
	// 23. A refund for a cancelled lesson that has not appeared.
	{
		context: ['{tfirst} was really apologetic about cancelling, so no complaints there.', 'It\'s not a lot of money, but I\'d like to see it.'],
		query: ['Can you ask the parent whether they\'ve changed anything on their account lately, card or address?', 'Our team asked: have you changed anything on your account recently, such as your card or billing address?', 'I updated our address a few weeks ago, after we moved. The card is the same.'],
		checks: [
			['The cancellation was recorded correctly: by the tutor, more than 24 hours ahead, so a full refund is due.', (r, s) => psql(`SELECT id, status, cancelled_by, starts_at - cancelled_at AS notice FROM lessons WHERE id = ${s.lid};`, ['id', 'status', 'cancelled_by', 'notice'], [[Number(s.lid), 'cancelled', 'tutor', `${int(r, 1, 3)} days ${pad(int(r, 1, 20))}:00:00`]])],
			['The card on file is the card that paid.', (r, s) => psql(`SELECT brand, last4, added_at::date FROM payment_methods WHERE family_id = ${s.fid} AND is_default;`, ['brand', 'last4', 'added_at'], [[pick(r, ['visa', 'mastercard', 'amex']), s.card, `2025-${pad(int(r, 1, 12))}-${pad(int(r, 1, 28))}`]])],
			['The tutor\'s cancellation reached the family by email.', (r, s) => [`ops@ops-1:~$ grep 'lesson=${s.lid}' /var/log/acme/mail-events.log | grep cancelled`, `${isoStamp(Number(s.whenDay), int(r, 30000, 60000))} event=delivered template=lesson_cancelled lesson=${s.lid} to=family:${s.fid} smtp=250`]]
		],
		doubts: [['Should we refund it again by hand, to be safe?', 'No, a second refund could pay them twice. Better to find out where the first one is.'], ['Could the refund have gone to an old card?', 'The family has only ever had the one card on file.']]
	},
	// 24. A profile bio full of odd characters.
	{
		context: ['I wrote that bio carefully, so it\'s a shame.', 'I checked on my phone and it looks the same there.'],
		query: ['Can we ask the tutor whether they wrote the bio here or pasted it in from somewhere?', 'Our team asked: did you type your bio on our site, or paste it in from somewhere else?', 'I wrote it in Word and pasted it in, back when I first joined. I haven\'t touched it since.'],
		checks: [
			['The page shows exactly what\'s stored; nothing changes it on the way out.', (r, s) => [`ops@ops-1:~$ curl -s http://app-1.internal/tutors/${s.tid} | grep -o 'Iâ€™ve been[^<]*' | head -1`, `Iâ€™ve been teaching ${s.subj} for ${s.years} yearsâ€”`]],
			['Bios saved this week are stored correctly, curly quotes and all.', (r) => psql('SELECT id, left(bio, 30) FROM tutors WHERE bio_updated_at > now() - interval \'7 days\' AND bio LIKE \'%’%\' LIMIT 2;', ['id', 'left'], [[int(r, 1200, 9800), 'I’m a certified teacher with 1'], [int(r, 1200, 9800), 'Hi! I’ve tutored math since 20']])],
			['Only the bio is affected; the tutor\'s name and headline are fine.', (r, s) => psql(`SELECT display_name, headline FROM tutors WHERE id = ${s.tid};`, ['display_name', 'headline'], [[s.tutor, `${s.subj} tutor, ${s.years} years of experience`]])]
		],
		doubts: [['Could it be the tutor\'s browser using the wrong encoding?', 'No, the characters are wrong in the database itself, and every browser shows the same thing.'], ['Should we lock the bio while it\'s being fixed?', 'No need. If the tutor edits it in the meantime, the new text saves correctly.']]
	},
	// 25. Homework marked late.
	{
		context: ['{student} has never turned anything in late.', 'The late label also shows on the summary {tfirst} sends the school.'],
		query: ['Can you ask the parent whether other homework was marked late too, or only this one?', 'Our team asked: has other homework been marked late, or only this assignment?', 'I think one other one last month, but we didn\'t make a fuss about it then.'],
		checks: [
			['The submission time is right: it matches the upload log to the second.', (r, s) => [`ops@ops-1:~$ grep 'lesson=${s.lid}' /var/log/acme/app.log | grep 'homework submitted'`, `${s.nextIso}T04:0${int(r, 1, 9)}:${pad(int(r, 0, 59))}Z app[${int(r, 1800, 4999)}]: homework submitted lesson=${s.lid} size=${int(r, 300000, 2900000)}`]],
			['The tutor and the family are both set to Pacific.', (r, s) => psql(`SELECT 'tutor' AS who, time_zone FROM tutors WHERE id = ${s.tid} UNION ALL SELECT 'family', time_zone FROM families WHERE id = ${s.fid};`, ['who', 'time_zone'], [['tutor', 'America/Los_Angeles'], ['family', 'America/Los_Angeles']])],
			['The Late label comes from the stored times; nobody set it by hand.', (r, s) => psql(`SELECT late, late_overridden FROM homework WHERE assignment_id IN (SELECT id FROM assignments WHERE lesson_id = ${s.lid});`, ['late', 'late_overridden'], [['t', 'f']])]
		],
		doubts: [['Could the tutor have changed the due date after the homework was in?', 'No, the assignment hasn\'t been edited since it was created.'], ['Could the upload have been slow and finished after the deadline?', 'It took four seconds, so the recorded time is when the student pressed the button, near enough.']]
	},
	// 26. A renamed folder that looks empty.
	{
		context: ['I didn\'t remove anything. I only changed the name.', 'Some of those worksheets took me years to build up.'],
		query: ['Can you ask the tutor exactly what the folder was called before and after?', 'Our team asked: could you tell us exactly what the folder was called before you renamed it, and what you renamed it to?', '"{subj}" before, "{subj} 2026-27" after.'],
		checks: [
			['Nothing was removed: the number of the tutor\'s files on disk is the same as before the rename.', (r, s) => [`ops@ops-1:~$ find /srv/acme/uploads/tutors/${s.tid} -type f | wc -l`, String(Number(s.n2) + int(r, 40, 200))]],
			['The folders the tutor didn\'t rename are fine, and their lessons open them.', (r, s, day) => [`ops@ops-1:~$ grep '/t/${s.tid}/' /var/log/nginx/files.access.log | tail -3`, ...accessLog(r, day, 3, { path: `/t/${s.tid}/${fileKey(r)}.pdf`, status: 200, bytes: int(r, 60000, 1600000) })]],
			['No other tutor renamed a folder today, so this isn\'t happening more widely.', (r, s) => grepCount('/var/log/acme/app.log', 'folder renamed', 1)]
		],
		doubts: [['Should we move the files back under the old folder name?', 'No, the tutor wants the new name. Better to point the records at where the files are now.'], ['Could the tutor have moved the files rather than renamed the folder?', 'The app log has a single rename, at the time the tutor says.']]
	}
];

// The last day a ticket may be opened (Friday 6 November) and the day of the export (Friday 20 November).
const LAST_OPENED = 95;
const EXPORTED = 109;
const channels = ['email', 'web form', 'chat', 'email', 'web form'];
const httpDate = (day: number, seconds: number) => {
	const c = calendar(day);
	return `${weekdays[c.weekday]}, ${pad(c.date)} ${months[c.month]} 2026 ${pad(Math.floor(seconds / 3600))}:${pad(Math.floor(seconds / 60) % 60)}:${pad(seconds % 60)} GMT`;
};

const autoReplies = [
	'Thanks for contacting Acme Tutors support. We\'ve received your request and someone from the team will reply within one business day, usually much sooner. You can add anything else, such as screenshots, by replying to this message.',
	'This is an automatic reply to let you know we have your message. Our support team works weekdays from 7 AM to 6 PM Pacific and answers requests in the order they arrive. Replying to this email adds to the same request.',
	'We\'ve got your request. While you wait, the help center has answers to the questions we hear most often. If you find the answer there, you don\'t need to do anything; otherwise someone will be in touch shortly.'
];
const wrapUps = [
	'If anything else comes up, just reply here and it will come straight back to me.',
	'Thanks again for your patience while we looked into this.',
	'Thank you for the clear details, which made this much quicker to track down.',
	'Sorry again for the trouble, and thanks for bearing with us.',
	'I\'ll keep an eye on this ticket for a few days in case anything else comes up.',
	'Let me know if anything about this doesn\'t make sense; I\'m happy to go through it on the phone.',
	'I appreciate you taking the time to write in about it.'
];
const followUps = ['Just a quick note to say everything is still working fine. Thanks again.', 'Following up: no more problems since. You can close this.', 'All good this week too. Thank you for sorting it out.', 'Wanted to let you know it\'s been fine ever since.'];
const followUpReplies = ['Thanks for letting us know, {first}. I\'ll close this one now.', 'Great to hear. I\'ll mark this as done.', 'Thanks, {first}. Glad it\'s holding up.'];
/** What ops sees of the customer's account, pasted at the top of the first note now and then. */
const account = (r: Rand, s: Slots, role: Role, today: number): string[] => {
	if (role === 'tutor')
		return [
			...psql(`SELECT id, joined, status, plan, students, rating FROM tutor_summary WHERE id = ${s.tid};`, ['id', 'joined', 'status', 'plan', 'students', 'rating'], [[Number(s.tid), `${2026 - Number(s.years)}-${pad(int(r, 1, 7))}-${pad(int(r, 1, 28))}`, 'approved', pick(r, ['starter', 'standard', 'standard', 'pro']), int(r, 3, 31), `4.${int(r, 4, 9)}`]]),
			...psql(`SELECT id, starts_at, student, status FROM lessons WHERE tutor_id = ${s.tid} ORDER BY starts_at DESC LIMIT 8;`, ['id', 'starts_at', 'student', 'status'], (() => {
				let id = Number(s.lid) + int(r, 0, 900);
				let when = today + int(r, 1, 3);
				return Array.from({ length: 8 }, (_, i) => {
					id -= int(r, 11, 90);
					when -= int(r, 0, 1);
					return [id, `${isoDate(when)} ${pad(int(r, 15, 20) + (7 - i) % 2)}:${pick(r, ['00', '30'])}`, `${pick(r, students)[0]} ${pick(r, lastNames)}`, when > today ? 'scheduled' : 'completed'];
				});
			})())
		];
	if (role === 'parent')
		return [
			...psql(`SELECT id, created_at::date, students, lessons, card_last4 FROM family_summary WHERE id = ${s.fid};`, ['id', 'created_at', 'students', 'lessons', 'card_last4'], [[Number(s.fid), `20${int(r, 23, 25)}-${pad(int(r, 1, 12))}-${pad(int(r, 1, 28))}`, s.sibling ? 2 : 1, int(r, 6, 140), s.card]]),
			...psql(`SELECT id, role, name, last_sign_in_at::date FROM users WHERE family_id = ${s.fid} ORDER BY role, id;`, ['id', 'role', 'name', 'last_sign_in_at'], [[int(r, 10000, 49999), 'parent', s.name, isoDate(Number(s.whenDay) - int(r, 0, 9))], [int(r, 50000, 79999), 'student', `${s.student} ${s.last}`, isoDate(Number(s.whenDay) - int(r, 0, 4))], ...(s.sibling ? [[int(r, 80000, 99999), 'student', `${s.sibling} ${s.last}`, isoDate(Number(s.whenDay) - int(r, 0, 6))]] : [])])
		];
	if (role === 'student')
		return [
			...psql(`SELECT id, family_id, tutor_id, lessons, homework_turned_in FROM student_summary WHERE family_id = ${s.fid};`, ['id', 'family_id', 'tutor_id', 'lessons', 'homework_turned_in'], [[int(r, 10000, 99999), Number(s.fid), Number(s.tid), int(r, 8, 60), int(r, 5, 50)]]),
			...psql(`SELECT a.id, a.title, h.submitted_at::date FROM assignments a JOIN homework h ON h.assignment_id = a.id WHERE h.family_id = ${s.fid} ORDER BY 3 DESC LIMIT 5;`, ['id', 'title', 'submitted_at'], Array.from({ length: 5 }, (_, i) => [int(r, 50000, 69999), `${s.subj} - ${cap(fill(pick(r, stems), { n: String(int(r, 1, 9)) }))}`, isoDate(Number(s.whenDay) - i * 7)]))
		];
	return [
		...psql(`SELECT id, name, students, tutors, contract_ends FROM org_summary WHERE id = ${s.org};`, ['id', 'name', 'students', 'tutors', 'contract_ends'], [[Number(s.org), s.school, Number(s.n2) + int(r, 0, 9), int(r, 4, 19), `2027-0${int(r, 6, 8)}-30`]]),
		...psql(`SELECT grade, count(*) FROM org_students WHERE org_id = ${s.org} GROUP BY 1 ORDER BY 1;`, ['grade', 'count'], Array.from({ length: 4 }, (_, i) => [i + 6 + int(r, 0, 3) * 0, int(r, 2, 14)]))
	];
};

/** A tutor's recent activity, as ops pastes it from the app log. */
const activity = (r: Rand, s: Slots, day: number): string[] => {
	const events = [
		() => `signin tutor=${s.tid} method=password ip=${s.ip}`,
		() => `lesson started lesson=${Number(s.lid) - int(r, 1, 400)} tutor=${s.tid} students=1`,
		() => `lesson ended lesson=${Number(s.lid) - int(r, 1, 400)} tutor=${s.tid} duration_min=${int(r, 52, 63)}`,
		() => `file attached lesson=${Number(s.lid) - int(r, 1, 400)} key=${fileKey(r)}`,
		() => `message sent tutor=${s.tid} thread=${int(r, 100000, 999999)}`,
		() => `availability saved tutor=${s.tid} slots=${int(r, 4, 20)}`,
		() => `earnings viewed tutor=${s.tid}`
	];
	return [`ops@ops-1:~$ grep 'tutor=${s.tid}' /var/log/acme/app.log | grep -v 'path=' | tail -${s.k}`, ...appLog(r, day - 1, Array.from({ length: Number(s.k) }, () => pick(r, events)()))];
};

/** A ticket's topic, cause and ending, drawn first from its own generator, which the ticket then goes on using. */
const plan = (index: number) => {
	const r = mulberry32(0x7a11e700 + index * 104729);
	const cycle = Math.floor(index / topics.length);
	const order = shuffle(mulberry32(0x5eed0000 + cycle * 7919), topics.map((_, i) => i));
	const topicIndex = order[index % topics.length]!;
	const topic = topics[topicIndex]!;
	const causeIndex = (cycle + (r() < 0.3 ? 1 : 0)) % topic.causes.length;
	const cause = topic.causes[causeIndex]!;
	const opened = Math.floor((index * LAST_OPENED) / Math.max(1, ITEMS - 1));
	let outcome = pick(r, cause.ends);
	if (outcome === 'quiet' && opened > LAST_OPENED - 12) outcome = cause.ends.includes('waiting') ? 'waiting' : cause.ends[0]!;
	return { r, topicIndex, topic, causeIndex, cause, opened, outcome };
};

// Each bug gets one engineering ticket: the first escalation that meets it files it, later ones add to it.
const bugs = new Map<string, { number: number; first: number }>();
for (let index = 0, next = 2318; index < ITEMS; index++) {
	const { topicIndex, causeIndex, cause, outcome } = plan(index);
	const key = `${topicIndex}.${causeIndex}`;
	if ((outcome === 'eng' || (outcome === 'fixed' && cause.fix?.includes('{eng}'))) && !bugs.has(key)) {
		bugs.set(key, { number: next, first: index });
		next += 5 + (index % 7) * 2;
	}
}

const ticket = (index: number): { name: string; text: string } => {
	const { r, topicIndex, topic, causeIndex, cause, opened, outcome } = plan(index);
	const extra = more[topicIndex]!;
	const bug = bugs.get(`${topicIndex}.${causeIndex}`);
	const number = 4180 + index * 9 + int(r, 0, 8);

	const agent = pick(r, support);
	const engineer = pick(r, ops);
	const first = pick(r, firstNames);
	const last = pick(r, lastNames);
	const [student, gender] = pick(r, students);
	const tutorFirst = topic.role === 'tutor' ? first : pick(r, firstNames.filter((name) => name !== first));
	const tutorLast = topic.role === 'tutor' ? last : pick(r, lastNames);
	const subj = pick(r, subjects);
	const n = int(r, 3, 9);
	const stem = cap(fill(pick(r, stems), { n: String(n) }));
	const mb = int(r, 4, 49) / 10;
	const bytes = Math.round(mb * 1_000_000) + int(r, 0, 99999);
	const key = fileKey(r);
	const tid = int(r, 1200, 9800);
	const whenDay = opened - int(r, 1, 6);
	const when2Day = whenDay - int(r, 5, 30);
	const weekStart = opened - calendar(opened).weekday - 6;
	const seriesStart = opened + int(r, 2, 6);
	const s: Slots = {
		agent,
		agentFirst: agent.split(' ')[0]!,
		ops: engineer,
		opsFirst: engineer.split(' ')[0]!,
		first: topic.role === 'student' ? student : first,
		last,
		name: topic.role === 'student' ? `${student} ${last}` : `${first} ${last}`,
		student,
		she: gender === 'f' ? 'she' : 'he',
		She: gender === 'f' ? 'She' : 'He',
		her: gender === 'f' ? 'her' : 'his',
		Her: gender === 'f' ? 'Her' : 'His',
		child: gender === 'f' ? 'daughter' : 'son',
		tutor: `${tutorFirst} ${tutorLast}`,
		tfirst: tutorFirst,
		tid: String(tid),
		lid: String(int(r, 210000, 389999)),
		fid: String(int(r, 20000, 69999)),
		org: String(int(r, 100, 480)),
		subj,
		stem,
		file: `${subj} - ${stem}.pdf`,
		key,
		path: `tutors/${tid}/${key}.pdf`,
		made: `${isoDate(whenDay - int(r, 0, 3))} ${pad(int(r, 7, 22))}:${pad(int(r, 0, 59))}:${pad(int(r, 0, 59))}-07:00`,
		pages: String(int(r, 2, 14)),
		mb: mb.toFixed(1),
		bytes: String(bytes),
		n: String(n),
		k: String(int(r, 6, 11)),
		k2: String(int(r, 3, 6)),
		n2: String(int(r, 12, 48)),
		m: String(int(r, 3, 41)),
		m2: String(int(r, 4, 60)),
		eng: bug ? `ENG-${bug.number}` : '',
		filed: bug?.first === index ? 'Filed' : 'Added this case to',
		inv: String(48000 + index * 37 + int(r, 0, 30)),
		amt: `$${int(r, 9, 36) * 5}.00`,
		card: String(int(r, 1000, 9999)),
		email: `${first.toLowerCase()}.${last.toLowerCase()}${int(r, 1, 99)}@example.com`,
		createdIso: `2025-0${int(r, 1, 9)}-${pad(int(r, 1, 28))}`,
		day: longDays[calendar(opened + int(r, 1, 3)).weekday]!,
		when: dayLabel(whenDay).slice(4),
		whenIso: isoDate(whenDay),
		whenDay: String(whenDay),
		whenHttp: httpDate(whenDay, int(r, 50000, 86000)),
		when2: dayLabel(when2Day).slice(4),
		when2Iso: isoDate(when2Day),
		when3: dayLabel(opened + int(r, 6, 9)).slice(4),
		nextIso: isoDate(whenDay + 1),
		seriesDay: String(seriesStart),
		seriesDates: [0, 7, 14, 21].map((offset) => isoDate(seriesStart + offset)).join(','),
		weekDates: [0, 1, 2, 3, 4].map((offset) => isoDate(weekStart + offset)).join(','),
		weekDay1: longDays[calendar(weekStart + 1).weekday]!,
		weekDay2: longDays[calendar(weekStart + 3).weekday]!,
		payout: String(9100 + Math.floor(opened / 7)),
		school: pick(r, schools),
		schoolRole: pick(r, schoolRoles),
		schoolIp: address(r),
		ip: address(r),
		years: String(int(r, 2, 6)),
		city: 'Los Angeles'
	};
	topic.set?.(r, s);
	cause.set?.(r, s);

	// The thread. Times are Pacific; a message never lands between 9:30 PM and 7:30 AM.
	let day = opened;
	let minute = int(r, 450, 1260);
	const startedAt = clock(minute);
	const advance = (low: number, high: number) => {
		minute += int(r, low, high);
		while (minute >= 1290) {
			minute -= 1440;
			day += 1;
		}
		if (minute < 450) minute = 450 + int(r, 0, 150);
	};
	const channel = pick(r, channels);
	const messages: string[] = [];
	// Customers who write by email often reply above the quoted message, and the export keeps the quote.
	let lastReply: { when: string; body: string } | undefined;
	const post = (who: string, paragraphs: string[]) => {
		const body = paragraphs.filter(Boolean).map((text) => fill(text, s)).join('\n\n');
		messages.push(`${who} · ${dayLabel(day)}, ${clock(minute)}\n\n${body}`);
		return body;
	};
	const customer = (paragraphs: string[], signed = r() < 0.7) => {
		const quote = channel !== 'chat' && lastReply && r() < 0.8 ? `On ${lastReply.when}, ${agent} wrote:\n${lastReply.body.split('\n').map((line) => (line ? `> ${line}` : '>')).join('\n')}` : '';
		post(`**${s.name}**`, [...paragraphs, signed ? pick(r, signoffs) : '', quote]);
		lastReply = undefined;
	};
	const agentSays = (paragraphs: string[]) => {
		const when = `${dayLabel(day)}, ${clock(minute)}`;
		lastReply = { when, body: post(`**${agent}** (Acme Tutors support)`, [...paragraphs, pick(r, agentSignoffs)]) };
	};
	const agentNote = (paragraphs: string[]) => post(`**${agent}** (support, internal note)`, paragraphs);
	const opsNote = (paragraphs: string[]) => post(`**${engineer}** (ops, internal note)`, paragraphs);
	const [side, late] = shuffle(r, sides[topic.role]);

	customer([pick(r, topic.opens), ...shuffle(r, extra.context).slice(0, pick(r, [0, 1, 1, 2, 2])), r() < 0.4 ? pick(r, backstories[topic.role]) : '']);
	if (channel !== 'chat' && r() < 0.4) {
		advance(1, 1);
		post('**Acme Tutors support** (automatic reply)', [pick(r, autoReplies)]);
	}
	advance(40, 900);
	agentSays([pick(r, topic.guess)]);
	advance(60, 1500);
	const withSide = r() < 0.7;
	customer([pick(r, cause.details ?? topic.details), withSide ? side![0] : '']);
	advance(30, 400);
	agentSays([withSide ? side![1] : '', pick(r, escalateReplies)]);
	advance(1, 20);
	// The helpdesk lists the customer's other requests beside the ticket; support often pastes them in.
	const others = topics.filter((other) => other.role === topic.role && other !== topic);
	const earlier = r() < 0.55 ? shuffle(r, others).slice(0, int(r, 2, 4)) : [];
	const perDay = (9 * ITEMS) / LAST_OPENED;
	let back = opened;
	const rows = earlier.map((other) => {
		back -= int(r, 9, 60);
		return `| ${Math.round(4180 + back * (back < 0 ? 14 : perDay)) + int(r, 0, 8)} | ${dayLabel(back).slice(4)}${back < -214 ? ', 2025' : ''} | ${fill(pick(r, other.subjects), s)} |`;
	});
	const history = rows.length ? ['Their earlier requests, for context:', ['| Ticket | Opened | Subject |', '| --- | --- | --- |', ...rows.reverse()].join('\n')] : [];
	agentNote([pick(r, topic.escalate), ...history]);
	if (r() < 0.3) {
		advance(600, 2000);
		customer([fill(pick(r, chasers), { ...s, deadline: fill(pick(r, deadlines), s) })], false);
		advance(20, 200);
		agentSays([pick(r, chaserReplies)]);
	}
	advance(60, 1200);
	const look = [
		...(!extra.noAccount && r() < 0.85 ? ['Account, for reference:', fence(account(r, s, topic.role, day))] : []),
		...(!extra.noAccount && topic.role === 'tutor' && r() < 0.6 ? ['Recent activity on the account, nothing odd in it:', fence(activity(r, s, day))] : []),
		pick(r, topic.look),
		fence(topic.first(r, s, day))
	];
	const checks = shuffle(r, extra.checks).slice(0, pick(r, [1, 2, 2, 3, 3, 3])).flatMap(([text, art]) => [text, fence(art(r, s, day))]);
	const found = [pick(r, cause.found), fence(cause.show(r, s, day))];
	if (r() < 0.75) {
		// Ops needs one more detail before going on.
		opsNote([...look, extra.query[0]]);
		advance(10, 180);
		agentSays([extra.query[1]]);
		advance(60, 1400);
		customer([extra.query[2]]);
		advance(30, 900);
		opsNote([...checks, ...found]);
	} else if (r() < 0.5) opsNote([...look, ...checks, ...found]);
	else {
		opsNote([...look, ...checks]);
		advance(20, 600);
		opsNote(found);
	}
	for (const [question, answer] of shuffle(r, extra.doubts).slice(0, pick(r, [0, 1, 1, 1, 2, 2]))) {
		advance(5, 240);
		const colleague = r() < 0.5 ? pick(r, ops.filter((name) => name !== engineer)) : '';
		post(colleague ? `**${colleague}** (ops, internal note)` : `**${agent}** (support, internal note)`, [question]);
		advance(5, 180);
		opsNote([answer]);
	}
	if (r() < 0.4) {
		advance(5, 90);
		agentNote([pick(r, acks)]);
	}

	advance(10, 240);
	if (outcome === 'fixed' && cause.fix) {
		opsNote([cause.fix]);
		advance(5, 120);
		agentSays([cause.told, cause.changed!, r() < 0.6 ? pick(r, wrapUps) : '']);
		advance(60, 1400);
		customer([pick(r, confirms)]);
		if (r() < 0.5) {
			advance(30, 300);
			agentSays([pick(r, thanksDone)]);
		}
	} else if (outcome === 'fixed') {
		agentSays([cause.told, cause.ask!]);
		advance(300, 2800);
		customer([cause.done!]);
		advance(30, 400);
		agentSays([pick(r, thanksDone)]);
	} else if (outcome === 'explained') {
		agentSays([cause.told, r() < 0.6 ? pick(r, wrapUps) : '']);
		advance(60, 1400);
		customer([pick(r, accepts)]);
	} else if (outcome === 'around') {
		agentSays([cause.told, cause.around!, r() < 0.6 ? pick(r, wrapUps) : '']);
		advance(60, 1400);
		customer([pick(r, aroundReplies)]);
	} else if (outcome === 'eng') {
		opsNote([`${bug?.first === index ? 'Filed as' : 'Added this case to'} {eng}: ${cause.bug}`]);
		advance(5, 120);
		agentSays([cause.told, pick(r, engMessages), r() < 0.6 ? pick(r, wrapUps) : '']);
		advance(60, 1400);
		customer([pick(r, engReplies)]);
	} else if (outcome === 'waiting') {
		agentSays([cause.told, cause.ask!, r() < 0.5 ? pick(r, wrapUps) : '']);
		if (r() < 0.4) {
			advance(60, 1400);
			customer([pick(r, willDo)], false);
		}
	} else {
		agentSays([cause.told, cause.ask!]);
		advance(3 * 1440, 5 * 1440);
		agentSays([pick(r, reminders)]);
		advance(3 * 1440, 5 * 1440);
		agentSays([pick(r, closings)]);
	}
	if ((outcome === 'fixed' || outcome === 'around') && day < EXPORTED - 8 && r() < 0.3) {
		advance(2 * 1440, 6 * 1440);
		customer([pick(r, followUps)], false);
		advance(20, 400);
		agentSays([pick(r, followUpReplies)]);
	}
	// Now and then the customer asks one more unrelated thing, so the thread does not end on its main matter.
	if (outcome !== 'quiet' && late && r() < 0.5) {
		advance(20, 600);
		customer([late[0]], false);
		advance(20, 300);
		agentSays([late[1]]);
	}
	if (day > EXPORTED) throw new Error(`ticket ${index} runs past the export: day ${day}`);

	const requester = {
		tutor: `tutor ${s.tid}`,
		parent: `parent of ${s.student}`,
		student: 'student',
		school: `${s.schoolRole} at ${s.school}`
	}[topic.role];
	const text = [
		`# Ticket ${number}: ${fill(pick(r, topic.subjects), s)}\n\nRequester: ${s.name} (${requester}) · Opened ${dayLabel(opened)}, ${startedAt} via ${channel} · Escalated to ops by ${agent}`,
		...messages
	].join('\n\n---\n\n');
	return { name: `${number}.md`, text: `${text}\n` };
};

const folder = join(root, 'docs', 'tickets');
mkdirSync(folder, { recursive: true });
for (let index = 0; index < ITEMS; index++) {
	const { name, text } = ticket(index);
	writeFileSync(join(folder, name), text);
}
writeFileSync(
	join(folder, 'README.md'),
	`# Escalated tickets\n\nThe ${ITEMS} tickets support escalated to ops between 3 August and 6 November 2026, exported from the old helpdesk\non 20 November, one file each with its whole thread: the customer's messages, our replies and the internal notes.\nThe export dropped the helpdesk's categories, statuses and tags. Times are Pacific. Output in an internal note\nis as it was pasted.\n`
);
