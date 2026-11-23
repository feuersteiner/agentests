// Writes the long material of this entry's long tasks: the help desk tickets that Plover's support desk passed
// to the profile team between 1 September and 13 November 2026, one Markdown file each, under
// docs/support-tickets/. Deterministic: fixed seeds, no clock, no network.
//   bun long/generate.ts <workspace root>
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** How many tickets to write. Dates, ticket numbers and the topic mix all follow from it. */
const ITEMS = 346;

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
const weighted = <K extends string>(r: Rand, weights: Partial<Record<K, number>>): K => {
	const entries = Object.entries(weights).filter(([, w]) => (w as number) > 0) as [K, number][];
	let x = r() * entries.reduce((sum, [, w]) => sum + w, 0);
	for (const [key, w] of entries) if ((x -= w) < 0) return key;
	return entries[entries.length - 1]![0];
};

// Time, in milliseconds since the epoch, always handled in UTC.
const MIN = 60_000;
const DAY = 1_440 * MIN;
const FIRST = Date.UTC(2026, 8, 1);
const LAST = Date.UTC(2026, 10, 13);
const CUTOFF = LAST + 17 * 60 * MIN;
/** Handlers.get_settings went out in 0.5.0 on 15 September; settings tickets start after it. */
const SETTINGS_FROM = Date.UTC(2026, 8, 16);
const monthsLong = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const monthsShort = monthsLong.map((month) => month.slice(0, 3));
const at = (ms: number) => new Date(ms);
const stamp = (ms: number) => `${at(ms).getUTCDate()} ${monthsShort[at(ms).getUTCMonth()]} ${at(ms).getUTCFullYear()}, ${pad(at(ms).getUTCHours())}:${pad(at(ms).getUTCMinutes())}`;
const isoMinute = (ms: number) => `${at(ms).getUTCFullYear()}-${pad(at(ms).getUTCMonth() + 1)}-${pad(at(ms).getUTCDate())} ${pad(at(ms).getUTCHours())}:${pad(at(ms).getUTCMinutes())}`;
const dayMonth = (ms: number) => `${at(ms).getUTCDate()} ${monthsLong[at(ms).getUTCMonth()]}`;
const longDate = (ms: number) => `${dayMonth(ms)} ${at(ms).getUTCFullYear()}`;
const workdays: number[] = [];
for (let t = FIRST; t <= LAST; t += DAY) if (at(t).getUTCDay() % 6 !== 0) workdays.push(t);

// People.
const agents = ['Rosa', 'Felix', 'Hamid', 'Wren', 'Lucia', 'Okoro', 'Maeve'];
const profileTeam = ['Ines Carvalho', 'Teodor Halvorsen', 'Abeni Clarke'];
const firstNames = ['Lena', 'Tomas', 'Aisha', 'Joost', 'Mariana', 'Kofi', 'Hannah', 'Sven', 'Priyanka', 'Mateus', 'Ewa', 'Giulia', 'Niklas', 'Fatima', 'Oliver', 'Rahul', 'Ingrid', 'Pedro', 'Yasmin', 'Daniel', 'Freya', 'Ahmed', 'Sofia', 'Lukas', 'Imani', 'Benedikt', 'Rania', 'Callum', 'Mei', 'Jakub', 'Elif', 'Arturo', 'Nadia', 'Henrik', 'Thandiwe', 'Marco', 'Leila', 'Ruairi', 'Ayumi', 'Gareth', 'Zainab', 'Bastian', 'Carmen', 'Ewan', 'Anouk', 'Diego', 'Signe', 'Tobi', 'Malak', 'Florian', 'Bronagh', 'Rafael', 'Hiroko', 'Stellan', 'Amara', 'Vikram', 'Iona', 'Dominika', 'Kwabena', 'Philippa'];
const surnames = ['Hartmann', 'Okafor', 'Jansen', 'Silva', 'Kowalski', 'Bianchi', 'Lindgren', 'Haddad', 'Murphy', 'Nakamura', 'Costa', 'Schneider', 'Mensah', 'Andersson', 'Moreau', 'Reyes', 'Novak', 'Fitzgerald', 'Kapoor', 'van Dijk', 'Osei', 'Yilmaz', 'Brennan', 'Duarte', 'Lund', 'Petrov', 'Ferreira', 'Kaur', 'Holm', 'Abiodun', 'Rossi', 'Takahashi', 'Morgan', 'Ivanova', 'Byrne', 'Laine', 'Hughes', 'Mazur', 'Eriksen', 'Adeyemi', 'Castillo', 'Weber', 'Doyle', 'Sato', 'Pereira', 'Fischer', 'Quinn', 'Varga', 'Sandoval', 'Whitfield'];
const plans = ['Free', 'Free', 'Plover Pro (monthly)', 'Plover Pro (yearly)', 'Plover Pro (yearly)', 'Plover for Teams'];
const countries = ['United Kingdom', 'Ireland', 'Germany', 'Netherlands', 'Spain', 'Portugal', 'Sweden', 'Poland', 'Italy', 'France', 'Canada', 'United States', 'Australia', 'Nigeria', 'India', 'Japan'];
const channels = ['the in-app form', 'the in-app form', 'email', 'the help centre form', 'chat, continued by email'];
const languages: [string, string][] = [['German', 'de'], ['French', 'fr'], ['Spanish', 'es'], ['Dutch', 'nl'], ['Portuguese', 'pt'], ['Italian', 'it'], ['Swedish', 'sv'], ['Polish', 'pl']];

interface Device {
	name: string;
	app: string;
	ver: string;
	seen: number;
	/** How people refer to it in a sentence. */
	say: string;
}
const phones: [string, string][] = [['Pixel 8', 'Android'], ['Pixel 6a', 'Android'], ['Galaxy S23', 'Android'], ['Galaxy A54', 'Android'], ['iPhone 15', 'iOS'], ['iPhone 13', 'iOS'], ['iPhone SE', 'iOS']];
const computers: [string, string][] = [['MacBook Air (Safari)', 'Web'], ['ThinkPad (Firefox)', 'Web'], ['Chromebook (Chrome)', 'Web'], ['Windows PC', 'Desktop app'], ['iMac', 'Desktop app'], ['Dell laptop (Edge)', 'Web']];
const tablets: [string, string][] = [['iPad Air', 'iPadOS'], ['iPad (9th generation)', 'iPadOS'], ['Galaxy Tab S7', 'Android']];
const currentVersions = ['5.14.1', '5.14.1', '5.14.0', '5.13.2'];
const oldVersions = ['5.9.4', '5.10.2', '5.8.1'];

type Kind = 'sorted' | 'owed' | 'team' | 'wait';
type Role = 'c' | 'a' | 'n' | 'p';
interface Ctx {
	open: number;
	first: string;
	last: string;
	uid: string;
	devices: Device[];
	primary: Device;
	second: Device;
	old?: Device;
	plan: string;
	country: string;
}
type Values = Record<string, string>;
interface Topic {
	weight: number;
	/** Earliest day the topic can be opened. */
	after?: number;
	/** Plain topics leave out the chatty extras: side questions, asides, chasers. */
	plain?: boolean;
	/** Generic troubleshooting steps make sense for it. */
	fix?: boolean;
	/** Lines of its own for the app's diagnostics, for topics where the customer may send them. */
	logs?: string[];
	plans?: (r: Rand, kind: Kind) => string;
	primary?: 'android' | 'phone' | 'computer';
	/** Devices the ending relies on, by kind: [name, app, old?, the device the customer mostly uses?]. */
	needs?: Partial<Record<Kind, [string, string, boolean?, boolean?][]>>;
	subjects: string[];
	opens: string[];
	asks: [string, string][];
	more: string[];
	notes: string[];
	probes: string[];
	paste?: (r: Rand, v: Values, kind: Kind, c: Ctx) => string;
	ends: Partial<Record<'sorted' | 'owed' | 'team', [Role, string][][]>>;
	waits: string[];
	kinds?: Partial<Record<Kind, number>>;
	slots?: (r: Rand, c: Ctx, kind: Kind) => Values;
}

// Pasted output.
const table = (head: string[], rows: string[][]) =>
	[`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`, ...rows.map((row) => `| ${row.join(' | ')} |`)].join('\n');
const obj = (o: Record<string, string | number | boolean>) =>
	'{' + Object.entries(o).map(([key, value]) => `"${key}": ${JSON.stringify(value)}`).join(', ') + '}';
const block = (lines: string[], lang = '') => '```' + lang + '\n' + lines.join('\n') + '\n```';
const label = (d: Device) => (d.app === 'Web' ? d.name : `${d.name} (${d.ver})`);

/** The changes the apps saved to one setting, as the profile team's admin tool lists them. */
const history = (r: Rand, c: Ctx, v: Values, field: string, value: string, before: string, extra?: { device: Device; value: string }): string => {
	const rows: string[][] = [];
	let t = Date.UTC(2026, int(r, 1, 6), int(r, 1, 28), int(r, 7, 22), int(r, 0, 59));
	rows.push([isoMinute(t), label(pick(r, c.devices)), field, before]);
	t += int(r, 2, 40) * DAY;
	rows.push([isoMinute(t), label(c.primary), field, value]);
	t = Math.max(t, SETTINGS_FROM, c.open - int(r, 18, 34) * DAY) + int(r, 60, 900) * MIN;
	while (t < c.open - 6 * 60 * MIN && rows.length < 11) {
		if (extra && r() < 0.45) rows.push([isoMinute(t + int(r, 5, 400) * MIN), label(extra.device), field, extra.value]);
		rows.push([isoMinute(t), label(r() < 0.6 ? c.primary : c.second), field, value]);
		t += int(r, 1, 5) * DAY + int(r, -300, 300) * MIN;
	}
	if (extra && !rows.some((row) => row[3] === extra.value)) rows.push([isoMinute(c.open - int(r, 10, 40) * 60 * MIN), label(extra.device), field, extra.value]);
	rows.sort((a, b) => (a[0]! < b[0]! ? -1 : 1));
	const latest = rows.filter((row) => row[3] === value).at(-1)!;
	v.d1 = dayMonth(Date.UTC(Number(latest[0]!.slice(0, 4)), Number(latest[0]!.slice(5, 7)) - 1, Number(latest[0]!.slice(8, 10))));
	v.lastdev = latest[1]!.replace(/ \(.*\)$/, '');
	return table(['Changed (UTC)', 'Device', 'Setting', 'New value'], rows);
};
const settingsNow = (r: Rand, v: Values, over: Record<string, string | boolean>) =>
	block([obj({ theme: pick(r, ['light', 'dark', 'dark', 'system']), language: v.code ?? 'en', weekly_digest: r() < 0.6, ...over })], 'json');
const profile = (v: Values, name = `${v.first} ${v.last}`, handle = v.handle!) => block([obj({ id: Number(v.uid), name, handle })], 'json');

// Generic parts of a ticket.
const hellos = ['Hi,', 'Hello,', 'Hi there,', 'Dear Plover support,', 'Hello Plover team,', 'Hi support,', '', ''];
const signoffs = ['Thanks,\n{first}', '{first}', 'Many thanks,\n{first} {last}', 'Cheers, {first}', 'Best wishes,\n{first}', 'Regards,\n{first}', 'Kind regards,\n{first} {last}', ''];
const asides = [
	"I use Plover for my lecture notes, so I'm in it most of the day.",
	'I run a small bakery, and Plover is where all our recipes and orders live.',
	"I'm not very technical, so apologies if I'm describing this badly.",
	"I've been paying for Plover for a few years now and this is the first time I've had to write in.",
	"I'm writing this on my lunch break, so sorry if it's brief.",
	"We use Plover across our whole practice, so I'm asking on behalf of a few people.",
	"I work nights on a hospital ward, so I'm often in the app at odd hours.",
	'This is mostly for my volunteering with the local history society.',
	"I've been through the help pages already and couldn't find anything about it.",
	"English isn't my first language, so please excuse any mistakes.",
	'My son set Plover up for me, so I may not know all the right words.',
	"I'm a freelance translator and Plover is more or less my office.",
	"I'm writing my thesis in Plover, so I'm what you'd call a heavy user.",
	'Plover is how my partner and I keep track of the house renovation, so we both use it every day.',
	'I teach piano and keep notes on every pupil in Plover.',
	'I moved to Plover from another notes app in the spring and mostly love it.',
	'I manage a small charity shop and the volunteers all share our rota notebook.',
	"I'm a carer for my dad and keep all his appointments and medicines in Plover, so I rely on it.",
	"I'm a journalist, and my interview notes all live in Plover.",
	'We run a community allotment and the whole committee uses one shared notebook.'
];
const agentHi = ['Hi {first},', 'Hello {first},', 'Dear {first},', 'Hi {first},'];
const agentThanks = [
	'Thank you for getting in touch, and sorry this has been getting in your way.',
	'Thanks for the detailed message; it helps a lot.',
	'Thank you for writing to us about this.',
	'Sorry to hear about this, and thanks for taking the time to explain it.',
	"Thanks for your patience while we got to your message. It's been a busy week here.",
	'Thanks for letting us know, and sorry for the trouble.'
];
const gentleThanks = ["Thank you for writing to us, and I'm so sorry.", "Thank you for letting us know. I'm very sorry for your loss."];
const beforeAsk = ['So that I can look into it properly, could you tell me a little more?', "A couple of questions first, if you don't mind.", 'To narrow it down:', "Before I pass this on, I'd like to check a few things.", ''];
const agentSign = ['Best wishes,\n{agent}\nPlover support', 'Thanks,\n{agent}', 'Kind regards,\n{agent} (Plover support)', 'All the best,\n{agent}', '{agent}'];
const escalated = [
	"I've passed your ticket to the team that looks after profiles and settings, with everything you've told me. I'll be back in touch as soon as I hear from them.",
	"Thanks, that's really helpful. I've asked our profile team to take a look and will update you here.",
	"I've shared this with our engineers who work on profiles and settings. It may take a day or two; I'll let you know what they find.",
	"Thank you. I'm handing this to colleagues who can see more than I can, and I'll come back to you once they've had a look."
];
const escalatedPrefix = ['Passing to the profile team.', 'Escalating to profile.', 'For the profile team:', 'Profile team, could you have a look?', ''];
const chasers = ['Hi, any news on this?', "Just checking you got my last message. It's still happening.", 'Hello again. Is anyone looking at this?', "It's been a week now. Is there an update?", "Sorry to chase, but I haven't heard anything since my last message."];
const chaserAnswers = [
	"Sorry for the silence. The team has it and is looking into it; I'll update you as soon as I know more.",
	"Thanks for checking in. It's with the profile team now, and I've asked them for an update.",
	"Apologies for the wait. I've nudged the team and will come back to you shortly."
];
const handover = ["I'm picking this up from {agentA}, who is away this week.", "{agentA} is off for a few days, so I'm looking after your ticket in the meantime.", "I've taken this over from {agentA}, so you'll hear from me from now on."];
const probeIntro = ['Had a look.', 'Picked this up.', 'Looking at this one.', 'Took this.', ''];
const pasteIntro = ['Pasting it here.', 'From the admin tool:', 'What we have:', '', ''];
const relays = ["The team that's looking into this has a question for you.", "Our engineers have started on this, and they'd like to know one more thing.", 'Thanks for bearing with us. One more question from the team:', 'One thing that would help the team:'];
const waitIntro = ["Can't go further without more from the customer. Support, could you ask for what's below?", 'Need one thing from the customer before I can say.', 'Stuck until we hear more from them.'];
const fixes: [string, string][] = [
	['In the meantime, could you try signing out of Plover on all your devices and signing back in? It sometimes clears up odd behaviour.', 'Signed out everywhere and back in. It looked fine for a bit, then it was back to how it was.'],
	['Could you check that the app is up to date? On a phone, the app store shows whether there is an update for Plover.', 'It was already up to date; there was nothing to install.'],
	["One thing worth trying in the browser: remove Plover's stored site data under the browser's privacy settings, then sign in again.", "Done that. No change, I'm afraid."],
	["Could you restart the device completely, not just close the app? It's a long shot, but it rules a few things out.", 'Turned it off and on again. Same as before.'],
	['Would you try the web app in a private window? That tells us whether something in the browser is involved.', 'Same thing in a private window.'],
	["Can you check that the date and time on the device are set automatically? A clock that's off can confuse things.", 'They are set automatically. I checked.'],
	['Could you try removing the app and installing it again? Your notes are stored in your account, so nothing will be lost.', 'I reinstalled it last night. It was the same this morning.']
];
const premature: [string, string, string][] = [
	['It seems to be OK now, actually. Maybe it was the restart?', "Glad to hear it. I'll mark this as solved for now, but write to us here if it happens again and the ticket will reopen.", 'Sorry, I spoke too soon. It happened again this morning.'],
	["Looks like that did the trick, it's been fine since yesterday.", "Great news! I'll close the ticket, but just answer this message if it comes back.", 'Well, it came back. Same as before, as of this morning.']
];
const nudges = ["Hi {first}, just checking whether you've had a chance to look at my last message. Whenever you're ready is fine.", "Hello again {first}. I wanted to make sure my last message reached you. We can't go further without it, but there's no rush."];
const autoClose = [
	"We haven't heard from you for ten days, so we've closed this ticket. If you write to us again, it opens again with the whole conversation, so there's no need to start from the beginning.",
	"This ticket was closed automatically because there's been no answer for ten days. Writing to us again will reopen it."
];
/** A small second question a customer raises in the same ticket, which support answers on the spot. */
interface Matter {
	subject: string;
	ask: string;
	answer: string;
	follow?: [string, string];
}
const matters: Matter[] = [
	{
		subject: 'Student discount?',
		ask: "Is there a student discount on Plover Pro? I start a master's in January and I'd rather not pay full price twice.",
		answer: 'On the student question: yes, Plover Pro is half price with a school or university email address. Add the address under Settings, Plan, Student discount, and we send a link to confirm it. The discount lasts as long as the address works, and we ask you to confirm it once a year.',
		follow: ["Does it work with an address that doesn't end in .edu? Our university uses .ac.uk.", "Yes, any school or university address works, whatever it ends in. If ours doesn't recognise your university's address, write to us and we'll add it by hand."]
	},
	{
		subject: 'PDF export',
		ask: 'How do I export a whole notebook as a PDF? I need to hand in my lab notes as one file and I can only see how to export single notes.',
		answer: 'To export a whole notebook, open it, choose the three dots at the top of the note list, then Export, PDF. It makes one file with every note in order, and you can choose whether to include attachments. On the phone it is in the notebook\'s share menu.',
		follow: ['Will the photos in the notes come out in the PDF too?', 'They will, at the size they appear in the note. Very large photos are scaled down to fit the page.']
	},
	{
		subject: 'Locking a notebook',
		ask: "Can I lock one notebook with a passcode? My children use the tablet and there's one notebook I'd rather they didn't read.",
		answer: "You can, on Plover Pro: open the notebook, choose Notebook settings and then Lock with passcode. The notebook then asks for the passcode on every device, and on phones you can use your fingerprint or face instead. If you forget the passcode we can't recover it, so keep it somewhere safe."
	},
	{
		subject: 'Keyboard shortcut',
		ask: 'Is there a keyboard shortcut for a new note? I take notes in meetings and reaching for the mouse slows me down.',
		answer: 'The shortcut for a new note is Ctrl+N on Windows and Cmd+N on a Mac, in both the desktop and web apps. Ctrl+Shift+N (Cmd+Shift+N on a Mac) makes the new note in the notebook you have open, and pressing ? anywhere shows the full list.'
	},
	{
		subject: 'Where did the tags go?',
		ask: 'Where did the tags list go after the last update? I used it every day to find my recipes by course.',
		answer: "The tags list moved into the search panel in the last update: press the magnifying glass and you'll find your tags under the search box, with the most used at the top. You can pin up to five of them to the sidebar from there, which brings back something close to the old list.",
		follow: ['Pinning works, thanks. Can I change the order of the pinned ones?', 'Yes, drag them in the sidebar. The order is kept on every device.']
	},
	{
		subject: 'Using Plover without signal',
		ask: "Can I use Plover on my phone when there's no signal? I'm going walking in the hills for a week and want my route notes with me.",
		answer: "Notes you've opened recently are kept on the phone, and you can read and edit them without signal; your changes sync when you're back online. To be sure a whole notebook is there, open it and choose Keep on this device. Large attachments are only downloaded when you open them, so open the ones you need before you go."
	},
	{
		subject: 'Web clipper for Firefox',
		ask: 'Do you have a web clipper for Firefox? I could only find the Chrome one.',
		answer: 'The web clipper is available for Firefox too: search for Plover Clipper among the Firefox add-ons. It can save a whole page, just the article, or a selection, and you choose the notebook as you clip.'
	},
	{
		subject: 'How many devices?',
		ask: "How many devices can I use on the free plan? I've just been given a work laptop and Plover asked me to remove a device.",
		answer: 'On the free plan you can use Plover on two devices at the same time; Pro has no limit. You can see and remove devices under Settings, Account, Devices. Removing one signs it out, but nothing is deleted: your notes stay in your account.'
	},
	{
		subject: 'Voice recordings',
		ask: "Can I attach voice recordings to notes? I'd like to record lectures alongside my typed notes.",
		answer: 'Yes: in a note, press the microphone button to record, or attach an audio file you already have. Recordings can be up to 25 MB each on the free plan and 200 MB on Pro, which is roughly three hours. Plover marks the place in your typed notes where you were when you pressed record.'
	},
	{
		subject: 'Getting a notebook back',
		ask: "Is there a way to get back a notebook I deleted last week? I thought I'd copied everything out of it and I hadn't.",
		answer: "Deleted notebooks stay in the trash for 30 days. You'll find the trash at the bottom of the notebook list; open it, choose the notebook and press Restore. It comes back with all its notes and attachments, and if it was shared, the people in it get it back as well.",
		follow: ["Found it, thank you! That's a relief.", 'Glad it was still there.']
	},
	{
		subject: 'Moving notes',
		ask: "How do I move a note to another notebook? I've been copying and pasting and losing the pictures.",
		answer: "To move a note with everything in it, drag it onto the notebook in the sidebar, or open the note's menu and choose Move to. You can select several notes with Shift or Ctrl and move them together."
	},
	{
		subject: 'Printing checklists',
		ask: 'Can I print a checklist with the boxes showing? When I print from the browser the boxes disappear.',
		answer: "Checklists print with their boxes if you use Print in the note's menu rather than the browser's own print. That version also leaves out the sidebar and fits the note to the page."
	},
	{
		subject: 'Templates',
		ask: 'Can I make my own note templates? I write the same meeting structure every week.',
		answer: 'Yes. Write the note the way you want it, then choose Save as template from its menu. It then appears under Templates when you start a new note. Templates can include checklists, tables and headings, and on Plover for Teams you can share them with the team.'
	},
	{
		subject: 'Scanning documents',
		ask: "Can Plover scan paper documents? I have a drawer full of receipts I'd like to keep with my notes.",
		answer: 'On the phone apps, the camera button in a new note has a Scan document mode: it finds the edges of the page, straightens it, and makes the text searchable a few minutes later. Several pages can go into one scan.'
	},
	{
		subject: 'Reminders',
		ask: 'Is there a way to get a reminder for a note? I keep forgetting to look at my shopping list.',
		answer: "Any note can have a reminder: open the bell at the top of the note and pick a date and time, or, on the phone apps, a place, such as when you arrive at a shop. Reminders come as notifications on every device where you're signed in."
	},
	{
		subject: 'Sharing with someone not on Plover',
		ask: "Can I share a notebook with someone who doesn't use Plover? My mum wants to see our holiday plans but won't install anything.",
		answer: "You can publish a read-only copy of a notebook as a web page from Share, Publish, and send the link to anyone; they won't need an account. The page updates when you change the notebook, and you can unpublish it from the same menu at any time, which makes the link stop working."
	},
	{
		subject: 'Importing from another app',
		ask: "Can I bring my notes over from my old notes app? I've got about four thousand of them.",
		answer: "Plover can import from most notes apps under Settings, Import. It brings over notes, attachments, tags and creation dates. Four thousand notes usually take ten to twenty minutes; you can keep using Plover while it runs, and you'll get an email when it's done."
	},
	{
		subject: 'Paying by invoice',
		ask: "Can our organisation pay by invoice instead of card? Our finance team won't approve card payments.",
		answer: "Plover for Teams can be paid yearly by invoice for ten seats or more. Our sales colleagues set that up: if the account owner writes to them from the admin console, under Billing, Contact sales, they'll send a quote and an invoice."
	},
	{
		subject: 'Search inside photos',
		ask: "Does search look inside photos? I photographed a whiteboard and can't find it by searching for what's written on it.",
		answer: 'Search does look inside photos and scanned pages, but the text is read a few minutes after the photo is added, and handwriting is only recognised in English, German, French and Spanish so far. Whiteboards photographed at an angle are harder; Scan document mode straightens them first, which helps.'
	},
	{
		subject: 'Two-step sign-in',
		ask: "Can I turn on two-step sign-in? I'd feel better about my account with it.",
		answer: "Yes, under Settings, Account, Security, Two-step sign-in. You can use an authenticator app or a security key. Keep the backup codes it shows you somewhere safe; they're the only way in if you lose your phone."
	},
	{
		subject: 'Notes taking a while to appear',
		ask: 'How long should it take for a note to show up on my other devices? Sometimes I have to pull down to refresh before it appears.',
		answer: "Usually a few seconds while both devices are online. Phones sometimes put off syncing to save battery when the app is in the background; pulling down to refresh, as you've been doing, asks it to sync straight away."
	},
	{
		subject: 'Notebook icons',
		ask: 'Can I give a notebook an icon? I have thirty notebooks and they all look the same in the sidebar.',
		answer: "You can: open Notebook settings and choose Icon. There's a set of icons and colours to pick from, and the icon shows in the sidebar and in the phone's notebook list."
	}
];
const bridges = ['While I have you, one more thing.', 'Unrelated, but while I think of it:', 'Also, a quick question that has nothing to do with this.', 'One other small thing, if you have a minute.', 'Oh, and something else I meant to ask.'];
const tried = ['signed out and back in', 'restarted the phone', 'checked for app updates', 'looked through the help centre', 'tried the website as well as the app', 'switched the setting to something else and back again', 'asked a friend to check on their own account', 'removed the app and installed it again'];
const attachments = ['screenshot.png', 'IMG_4471.jpeg', 'Screenshot 2026-10-02 at 08.14.png', 'photo.jpg', 'screen.png'];
const closings: [string, string][] = [
	['Is there anything else I can help with while I have you?', "No, that's everything. Thanks for your help."],
	['Anything else I can do for you?', "That's all, thanks. You've been very patient."],
	["If anything else comes up, just write back on this ticket.", 'Will do. Thanks again.']
];
const earlierSubjects = ['Sync question', 'Notebook missing', 'Help with sharing', 'Invoice copy', 'Password', 'Photos in notes', 'Search not finding notes', 'Feature request', 'Desktop app crash', 'Importing notes', 'Reminder did not go off', 'Shared notebook invite', 'Storage full?', 'Clipper not saving pages'];
const next: Record<'sorted' | 'owed' | 'team', string[]> = {
	sorted: ["I'll mark this as solved, but you can write back here at any time.", 'If it comes back, just answer this message and the ticket will reopen.'],
	owed: ["There's nothing you need to do in the meantime.", 'This ticket stays open until then, so you will hear from us here.'],
	team: ["They'll contact you directly, and you won't need to explain it all again.", 'You can still write to us here if anything changes in the meantime.']
};
const owedChasers = ['Hello again. Any news on this? It is still happening.', 'Just checking in: is the fix out yet?', 'Hi, has there been any progress? It has been a few weeks.'];
const owedAnswers = [
	"Not yet, I'm afraid. It's still on the team's list, and this ticket stays open until it's done. I'll write as soon as it is.",
	"No news yet, sorry. I've checked with the team and it hasn't been done, but your ticket is still open and I'll let you know.",
	"It's taking longer than we hoped. I'm keeping this open and I'll write to you the moment it's done."
];
const notebookNames = ['Work log', 'Recipes', 'Reading journal', 'Team notes', 'Allotment', 'Thesis', 'Clients', 'House', 'Trip planning', 'Shopping', 'Meeting notes', 'Garden', 'Lesson plans', 'Family', 'Ideas', 'Interviews', 'Rota', 'Book club'];
const activity = ['signed in on {dev}', 'created notebook "{nb}"', 'shared "{nb}" with {n} people', 'joined shared notebook "{nb}"', 'exported "{nb}" as PDF', 'imported {n} notes', 'added device {dev}', 'emptied the trash', 'restored a note in "{nb}"', 'published "{nb}" as a web page', 'added a reminder in "{nb}"', 'moved {n} notes to "{nb}"', 'attached a file in "{nb}"', 'scanned a document into "{nb}"'];
const sentLogs = ["I've sent the diagnostics from the app as well, in case they help.", 'I pressed Send diagnostics in the app just now.', 'My son says I should send you the diagnostics, so I have done that from the Help screen.'];
const logIntro = ["Diagnostics the customer sent from the app:", 'Customer sent diagnostics. Relevant part below.', 'From the diagnostics upload:'];
/** An excerpt of the app's own diagnostics: what it did around the time the customer describes, plus lines of the topic's own. */
const appLog = (r: Rand, c: Ctx, own: string[]): string => {
	const d = r() < 0.7 ? c.primary : c.second;
	const nb = pick(r, notebookNames);
	const generic = [
		`Sync      pulled ${int(r, 0, 60)} changes in ${int(r, 80, 900)} ms`,
		`Sync      pushed ${int(r, 1, 12)} changes`,
		`Notebook  opened "${nb}" (${int(r, 3, 400)} notes)`,
		`Editor    autosave ${int(r, 40, 9000)} chars`,
		`Search    index updated, ${int(r, 20, 4000)} notes`,
		'Push      device registered',
		`Lifecycle moved to background`,
		'Lifecycle back in foreground',
		`Members   loaded ${int(r, 2, 9)} for "${pick(r, notebookNames)}"`,
		`Attach    downloaded IMG_${int(r, 1000, 9999)}.jpeg (${int(r, 80, 4000)} KB)`,
		`Reminder  scheduled for ${pad(int(r, 6, 22))}:${pad(int(r, 0, 59))}`,
		'Profile   loaded',
		'Settings  loaded',
		`Storage   ${int(r, 20, 900)} MB used on device`
	];
	let t = c.open - int(r, 1, 30) * 60 * MIN - int(r, 0, 2) * DAY;
	const lines: string[] = [];
	const add = (line: string) => {
		t += int(r, 0, 40) * 1000 + int(r, 0, 2) * MIN;
		lines.push(`${new Date(t).toISOString().slice(5, 19).replace('T', ' ')}  ${line}`);
	};
	add(d.app === 'Web' ? `Startup   Plover web app (${d.name.replace(/^(.*) \((.*)\)$/, '$2 on $1')})` : `Startup   Plover ${d.ver} (${d.app}, ${d.name})`);
	add(`Account   signed in as ${c.uid}`);
	const body = shuffle(r, generic).slice(0, int(r, 6, 14));
	for (const line of own) body.splice(int(r, 0, body.length), 0, line);
	body.forEach(add);
	return block(lines);
};
const teamChasers = ["Hello, I haven't heard from the other team yet. Do they definitely have this?", 'Just checking that my ticket did get passed on. Nobody has been in touch.', "Hi again. Is there any way to find out when they'll look at it?"];
const teamAnswers = ["I've checked: they do have it, with all the details from this conversation, and it's in their queue. They'll write to you directly.", "Yes, it's with them. I've added a note asking for an update, and they'll contact you as soon as they've looked at it.", "They have it, and they've told me they'll be in touch this week. Sorry it's taking a while."];

// The topics. Slots: {first} {last} {uid} {agent} {pt} (the profile engineer's first name) {device} {device2}
// {old} {d0} (a few days before the ticket) {d1} (a recent change) {month} (an earlier month) {mon} (this month)
// {n}, plus each topic's own.
const theme: Topic = {
	weight: 3,
	logs: ['Settings  appearance screen opened', 'Appearance applying light', 'Appearance changed to dark by user'],
	after: SETTINGS_FROM,
	fix: true,
	kinds: { owed: 6, sorted: 2, team: 1.5, wait: 2.5 },
	needs: { sorted: [['iPad (6th generation)', 'iPadOS', true]], team: [['Windows PC', 'Desktop app']] },
	subjects: ['Dark mode keeps switching off', 'Theme resets itself', 'Why is everything white again?', "Appearance setting won't save", 'light mode is back??', 'Dark theme not sticking'],
	opens: [
		'I use Plover in dark mode on my laptop and on my phone. Every morning when I open it, the whole thing is back to the white theme and I have to go into Appearance and choose Dark again. It stays dark for the rest of the day, and the next morning it is the same story. I start work at six and a bright white screen is the last thing I want at that hour.',
		"Since some time in September my theme won't stay put. I choose Dark under Settings, Appearance, it changes straight away, and at some point later (I haven't worked out exactly when) it's light again. It happens in the web app and on my phone. As far as I know I haven't changed anything on my side.",
		"Small thing, but it is driving me up the wall: Plover forgets that I want dark mode. I must have set it thirty times by now. Is there another setting somewhere that overrules the one in Appearance? I've looked and can't find one.",
		"My eyes are sensitive to bright screens, so I always use dark themes. Plover has started ignoring my choice. I set Dark, close the app, and when I come back it's light. This didn't happen in the summer."
	],
	asks: [
		['Does it go back to light while the app is open, or only after you close it and open it again?', 'Only when I open it fresh. If I leave it open all day it stays dark. Closing the laptop overnight seems to be enough to bring the white back.'],
		['Which devices do you use Plover on, and does it happen on all of them?', "Mostly the {device}, and the {device2} as well. It happens on both. The {device} seems to do it more often, but maybe I just open it more."],
		['Is Match device chosen anywhere, perhaps on a device you use less often?', "Not that I know of. The two I use every day both say Dark. I'm not sure what else there is to check."],
		['When the theme goes back to light, does anything else change with it, such as the language or the weekly email?', "I only use English, so I wouldn't notice a change there. The weekly email still comes, but I never turned it off, so that tells you nothing."],
		['Roughly when did it start?', "I first noticed it around the middle of September. Before that I'd had dark mode for over a year without any trouble."]
	],
	more: ['I also tried choosing Light and then Dark again, in case it needed a nudge. It made no difference at all.', "My partner says the same happens on her account, so I don't think it's just my phone being odd.", "I'm not the only one, by the way. Someone on the Plover forum has the same thing."],
	notes: [
		'Theme goes back to Light after the app is reopened, on web and mobile. Customer has set Dark many times. Passing to the profile team as settings come from them.',
		'Another theme one. Dark does not stick between sessions. Checked the usual: apps up to date, signed in on {devcount} devices. Profile team, could you look at what we hold for {uid}?',
		"Customer's Dark theme reverts on reopen. Similar to others this month."
	],
	probes: [
		"Looked at {uid}. The settings the apps saved for them are in the database, and the last change was on {d1} from the {lastdev}. I'll dig further, but it would help to know whether it also flips back after a fresh sign-in, not only on reopening.",
		'I can see the saved settings and their history for {uid}. Pasting the history below. Give me a day to go through it properly.'
	],
	paste: (r, v, kind, c) => `${history(r, c, v, 'theme', 'dark', 'light', kind === 'sorted' && c.old ? { device: c.old, value: 'system' } : kind === 'team' ? { device: c.devices.find((d) => d.name === 'Windows PC')!, value: 'light' } : undefined)}\n\nSaved now:\n\n${settingsNow(r, v, { theme: kind === 'sorted' ? 'system' : 'dark' })}`,
	ends: {
		owed: [
			[['p', "Same cause as the other theme tickets. Their Dark is saved; what goes out to the apps isn't it. This one's ours."], ['a', "{pt} on our profile team has found the cause, and it is on our side, not on your devices. It affects other people who changed their theme as well. The fix is on the team's list for the next version of the service. I'm keeping this ticket open and I'll write to you here as soon as it is out. Until then I'm afraid Dark will keep slipping back to Light when you reopen the app."], ['c', "Thanks for being straight with me. I can live with it for a bit, but please do let me know when it's fixed."]],
			[['a', 'The profile team has confirmed that this one is ours. Your choice of Dark is saved correctly, but when the apps ask for your settings they are sent the default instead. They know what needs to change, and I will update this ticket when it has been done. Sorry for the trouble in the meantime.'], ['c', "OK. Glad it isn't me going mad."]],
			[['p', 'Checked against the others: same pattern, our side. Adding the ticket to the list for the fix.'], ['a', "Thanks for bearing with us. Our engineers have tracked it down to a fault on our side, so there's nothing you need to change. I'll let you know here as soon as the fix is live."]]
		],
		sorted: [
			[['p', "Found it. There's an old {old} on the account set to Match device, and it writes that back every time it wakes."], ['a', "I think we've found it. An old {old} is still signed in to your account and set to Match device, and it was saving that choice back every time it woke up. That's why the theme kept changing on your other devices. If you sign out on it, or set it to Dark as well, the theme should stay put."], ['c', "That was it! I'd forgotten that thing even existed, it lives in the spare room. I signed it out and everything has been dark for three days now. Thank you."]]
		],
		team: [
			[['p', "The Windows desktop app on this account saves Light back every time it starts, from its own copy, and the other devices then follow what's saved. We store and send what we're given. Desktop team's."], ['a', "The profile team found where it comes from. The Windows desktop app on your account keeps its own copy of your settings, and every time it starts it saves Light back to your account, which your other devices then follow. That's a fault in the desktop app, so I've passed this to our desktop team, who look after it, and they will pick it up from here."], ['c', 'Fine, thanks for looking into it.']]
		]
	},
	waits: [
		'Could you check which version of Plover is on your phone (Settings, About) and update it if the app store offers anything? One older version had its own trouble remembering the theme. Then let us know whether it still happens after a day or two.',
		"Could you send us the diagnostics from your phone straight after it has happened? In the app, go to Settings, Help, Send diagnostics, and put this ticket's number in the message box."
	]
};

const language: Topic = {
	weight: 2,
	logs: ['Settings  language screen opened', 'Locale    interface language en', 'Locale    changed by user'],
	after: SETTINGS_FROM,
	fix: true,
	kinds: { owed: 6, sorted: 2, team: 1.5, wait: 2.5 },
	needs: { team: [['Galaxy Tab S7', 'Android', false, true]] },
	slots: (r) => {
		const [lang, code] = pick(r, languages);
		return { lang, code };
	},
	subjects: ['Language changes back to English', 'Plover speaks English again', 'Language setting not saved', 'Wrong language every morning', 'Interface language'],
	opens: [
		'Hello, I have set Plover to {lang} because my colleagues and I all work in {lang}. After some hours, or when I start the app the next day, all the menus are in English again. I change it, it is fine, and then the same again. Can you tell me why it does not stay?',
		'My mother uses Plover on her tablet and her English is not good, so I set it to {lang} for her. She phones me every few days because it is back in English and she cannot find anything. I have changed it back for her four times now. Is this a known problem?',
		'Since the end of September the interface language keeps going back to English. I choose {lang} under Settings, Language, and it does change, but it does not last. I use Plover every day for work, so I notice it every day.'
	],
	asks: [
		['Does the language change back on every device at the same time, or only on one?', 'I have only noticed it on the {device}, but I mostly use that one. On the {device2} I am not sure, I would have to look.'],
		['What language is the device itself set to?', 'The device is in {lang} as well; everything else on it is in {lang}. Only Plover goes to English.'],
		['Is everything in English when it happens, or only some parts, such as the menus but not the dates?', 'Everything. Menus, buttons, the welcome text in a new notebook. The dates I do not know, I did not look carefully.'],
		['Are you signed in when this happens, or does Plover show the sign-in screen first?', 'I am signed in. My notes are all there, it is only the language that changes.']
	],
	more: ['I even tried to set the language on the website and then on the phone, in case one overwrites the other. It did not help.', 'The weekly email comes in English too, but I am not sure whether that was always so.', 'A friend of mine has the same problem with {lang}. We laugh about it but it is annoying.'],
	notes: ['Interface language reverts to English after reopening. Customer chooses {lang} ({code}) each time. Passing to the profile team; looks like the theme tickets.', 'Language setting does not stay for {uid}. Device language is {lang}. Profile team, can you see what is saved?'],
	probes: [
		"Saved settings for {uid} have language {code}, last changed on {d1} from the {lastdev}. Let me look at what we've been sending out for them before I say anything.",
		'History below. I want to compare it with the times the customer says it went back to English, so if support can get a rough time for the next occurrence, that would help.'
	],
	paste: (r, v, _kind, c) => `${history(r, c, v, 'language', v.code!, 'en')}\n\nSaved now:\n\n${settingsNow(r, v, { language: v.code! })}`,
	ends: {
		owed: [
			[['a', "Our profile team has looked into it and the fault is on our side: your choice of {lang} is saved, but the apps are given the default language instead when they ask for your settings. They know where the problem is and it will be put right in the next version of the service. I'll keep this ticket open and let you know here when that has happened."], ['c', 'Thank you. I will tell my colleagues to be patient.']],
			[['p', 'Same as the theme ones: saved {code}, apps get en. Ours.'], ['a', 'This is something we need to fix, not something you are doing wrong. The team that looks after settings has found that the language you choose is not always the one the apps receive. Your ticket is on their list, and you will hear from me here once it is fixed.'], ['c', 'OK, good to know. Thank you for explaining.']]
		],
		sorted: [
			[['p', "Compared the times. Each time it 'went back' they had come in from the digest link signed out. Signed-out pages follow the browser."], ['a', "I think I see what happens. You open Plover from the link in the weekly email, which takes you to the web app before you are signed in, and the signed-out pages follow your browser's language, which is English. Once you sign in, Plover uses your own setting. If you change the browser's language to {lang}, or sign in first, it should stay in {lang}."], ['c', 'Ah, that makes sense, the browser is in English because it is a work laptop. I changed it and it has stayed in {lang} all week. Thank you!']]
		],
		team: [
			[['p', "What we send is {code}, every time. The tablet app keeps English until it's restarted after an update. Android's."], ['a', "The settings we send to your devices are correct, so the problem isn't with your account. It turns out the Android tablet app keeps using English after an update until it has been restarted. I've passed this to our Android team, who will look into it."], ['c', 'OK. I will restart it for now when it happens.']]
		]
	},
	waits: ['Could you tell us the next time it happens, with the time and which device it was on? That will let the team match it to what they see on their side.', 'Could you send us the diagnostics from the device where it happens (Settings, Help, Send diagnostics), straight after the language has changed?']
};

const digest: Topic = {
	weight: 2,
	after: SETTINGS_FROM,
	kinds: { owed: 6, sorted: 2, team: 1.5, wait: 2.5 },
	slots: (r) => ({ uid2: String(int(r, 1_000_000, 4_999_999)) }),
	subjects: ['Still getting the weekly email', 'Turned off the digest, still arriving', 'Stop the Monday emails please', 'Weekly digest setting ignored', 'Unsubscribe not working?'],
	opens: [
		"I turned off the weekly digest weeks ago, under Settings, Notifications. It still arrives every Monday morning. When I go back to the settings, the switch is on again. I definitely turned it off; I've done it three times now.",
		"Please make the Monday summary emails stop. I don't want them, I've switched them off in the app and they keep coming. I'm starting to feel like I'm being spammed by an app I pay for.",
		"Quick question about the weekly digest. Is there any reason the setting would turn itself back on? I'm sure I turned it off after the first one in September, and yet here we are."
	],
	asks: [
		['When you look at the switch afterwards, is it on again everywhere, or only on one device?', "I looked on the {device} this morning and it was on. I turned it off there. I don't know about the {device2}, I didn't check."],
		['Which address does the email arrive at?', "My personal one, the one I signed up with. As far as I know it's the only address Plover has for me."],
		['Do you use the link at the bottom of the email, or the switch in the app?', "The switch in the app. I didn't know there was a link. Does that do something different?"],
		['Do you share notebooks with anyone, or are you part of a team on Plover?', "I share a couple of notebooks with my sister. No team, it's just personal use."]
	],
	more: ["The email itself is fine, I just don't need it. I look at my notes every day anyway.", "It isn't just one email either. Last Monday I got it at seven and then another at two minutes past, identical."],
	notes: ['Weekly digest switch turns itself back on. Customer has switched it off repeatedly. Passing to profile team as the settings come from them.', 'Customer says the digest switch flips back to on. They used the in-app switch, not the email link. Profile team, can you check {uid}?'],
	probes: [
		"Saved settings for {uid} have weekly_digest false, set on {d1}. Pasting the history. I'll check what we've been sending.",
		"I can see their changes to the digest switch below. Need to compare with what the email team's sender saw before I conclude anything."
	],
	paste: (r, v, _kind, c) => {
		const sends: string[][] = [];
		for (let t = c.open - int(r, 3, 5) * 7 * DAY; t < c.open; t += 7 * DAY) {
			const monday = t - ((at(t).getUTCDay() + 6) % 7) * DAY;
			sends.push([longDate(monday), `${isoMinute(monday + 7 * 60 * MIN + int(r, 0, 9) * MIN)}`, r() < 0.5 ? 'yes' : 'no']);
		}
		return `${history(r, c, v, 'weekly_digest', 'false', 'true')}\n\nDigests sent to the account's address, from the email team's dashboard:\n\n${table(['Week of', 'Sent (UTC)', 'Opened'], sends)}`;
	},
	ends: {
		owed: [
			[['a', "Our profile team found the cause, and it is on our side. You switched the digest off and that choice was saved, but when the apps and the email system ask for your settings they get the default, which is on. That's why it keeps coming back. They will fix it in the next version of the service; I'll keep this ticket open and tell you when. In the meantime, the unsubscribe link at the bottom of the email will stop it, because that uses a separate list."], ['c', "Thanks. I'll use the link for now and wait to hear from you."]],
			[['p', 'Saved false, sent true. Same as the theme and language tickets. Ours.'], ['a', "Sorry it's taken a while to get to the bottom of this. Your choice is being saved, but our side isn't passing it on correctly, so the switch appears on again and the emails keep going out. The team that looks after settings is fixing it, and I'll write to you here when it's done."]]
		],
		sorted: [
			[['p', 'The digests are going to a second account, {uid2}, made with a work address in {month}. Their own account has the digest off.'], ['a', "We've found it. The digest you're getting is for a second Plover account, made with your work address in {month}. Your own account has the digest switched off, just as you set it."], ['c', "Oh, of course, I made that one for a course! Can you just close it? I don't need it."], ['a', "Done: the second account is closed, and no more digests will come for it. Your own account isn't affected."]]
		],
		team: [
			[['p', "Setting is saved and sent correctly. The digest sender still has this address on an old list it builds once a week. Email team's."], ['a', "The profile team checked, and your setting is saved and passed on correctly. The digest system, which does the actual sending, is still using an older list that has your address on it, and that's also where the duplicate emails come from. I've passed this to our email team, who look after it."], ['c', "OK, thanks. It's the duplicates that annoy me most, to be honest."]]
		]
	},
	waits: ['Could you forward us one of the Monday emails, as an attachment if your mail program allows it? The details hidden in it tell the email team exactly which account it was sent for.', 'Could you check whether you have a second Plover account, perhaps with a work or an old address? Trying to sign in with each address you use will tell you.']
};

const name: Topic = {
	weight: 2,
	logs: ['Profile   edit screen opened', 'Profile   saved'],
	kinds: { sorted: 3, team: 2.5, owed: 1.5, wait: 2 },
	slots: (r, c) => ({ oldname: `${c.first} ${pick(r, surnames.filter((s) => s !== c.last))}`, newname: `${c.first} ${c.last}` }),
	subjects: ['Changed my name, old one still showing', 'Name not updating', 'Display name', 'Wrong name in shared notebook', 'Old surname still visible'],
	opens: [
		'I got married in the summer and changed my display name in Plover from {oldname} to {newname}. In the notebooks I share with my team it still says {oldname} next to some of my notes. Can you change it everywhere, please?',
		'I updated the name on my profile on {d0}. On my phone it shows the new one, {newname}, but my colleague says she still sees {oldname} in our shared project notebook. Is it supposed to take this long?',
		"I've changed my display name from {oldname} to {newname}. It shows correctly in some places but not in others, and I can't see a pattern."
	],
	asks: [
		['Where exactly does your colleague see the old name: next to your notes, in the list of members, or somewhere else?', 'In the little line under some notes that says who last edited them. The member list shows the new name, I think.'],
		['When did you make the change?', "On {d0}, in the evening. So it's been a few days now, not a few minutes."],
		['Does the old name show on notes you edited after the change as well, or only on older ones?', "I'm not sure. I've asked her to look. I think it's only older notes, but I'd like those right too."],
		['Is the old name in notebooks you own, or in ones someone else owns and shared with you?', "The main one is owned by my manager. I own a couple of smaller ones and I haven't checked those."]
	],
	more: ["It matters to me, because clients see those notebooks and I'd rather they didn't see the old name.", 'I also changed my handle at the same time, if that makes any difference.'],
	notes: ['Display name changed on {d0}; old name still visible to people in a shared notebook. Profile team, is this expected?', 'Name change not showing everywhere. Customer wants the old name gone from shared notebooks.'],
	probes: [
		'Profile for {uid} as we serve it now is below; the name is the new one. Changes can take up to ten minutes to reach every device, so a few minutes of the old name is normal, but not days. Looking for where the old one comes from.',
		'The profile service returns the new name. Let me find out which part of the app is still showing the old one.'
	],
	paste: (r, v, _kind, c) =>
		`${profile(v, v.newname)}\n\n${table(['Changed (UTC)', 'Field', 'From', 'To'], [[isoMinute(c.open - int(r, 200, 900) * DAY), 'name', '(new account)', v.oldname!], [isoMinute(c.open - int(r, 3, 9) * DAY), 'name', v.oldname!, v.newname!]])}`,
	ends: {
		sorted: [
			[['a', "Our profile team checked, and your profile shows {newname} everywhere we send it. The old name your colleague saw was in the edit history of older notes, which records names as they were at the time; that history can't be rewritten, but it only appears when someone opens it. Everywhere else your new name shows within ten minutes of a change."], ['c', "That's fine, as long as the main view is right. My colleague says she now sees {newname} everywhere else. Thanks for checking so thoroughly."]]
		],
		team: [
			[['p', "We return {newname}. The 'last edited by' line in shared notebooks is stored with the notes, not looked up from us. Sharing team's."], ['a', "The profile service has your new name. The old one is coming from the 'last edited by' line in shared notebooks, which is stored with the notes themselves rather than taken from your profile. I've passed this to our sharing team, who look after shared notebooks, and asked them whether it can show your current name."], ['c', "Thank you. I hope they can, it's the main place people see it."]]
		],
		owed: [
			[['p', "Found a second profile row for {uid} left over from a sign-up with an old address in {month}; the name change only went to the newer row. I'll merge them and correct it."], ['a', "The team that looks after profiles found that your name change was saved, but an older record of your profile wasn't updated with it, which is why the old name kept appearing in that notebook. They will correct it this week, and I'll confirm here once they have."], ['c', 'Great, thank you.']]
		]
	},
	waits: ['Could you send a screenshot of where the old name appears, and tell us the name of the notebook? Then the team can look at the exact place.']
};

const sillyHandles = ['pancake_wizard', 'sleepyotter93', 'notes4days', 'xx_quill_xx', 'tinyteapot', 'captain_crumbs', 'mossy_rock7', 'jellyfish_jam'];
const handleOf = (c: Ctx) => `${c.first}${c.last}`.toLowerCase().replace(/[^a-z]/g, '').slice(0, 20);
const handleTaken: Topic = {
	weight: 1.5,
	kinds: { sorted: 2, team: 3, wait: 2 },
	slots: (r, c) => ({ want: handleOf(c), cur: pick(r, sillyHandles), other: String(int(r, 1_000_000, 2_999_999)), otherseen: `${pick(r, monthsLong)} ${int(r, 2019, 2023)}` }),
	subjects: ['Handle already taken', '@{want} is held by an empty account', 'Can you free up a handle?', 'Username request'],
	opens: [
		"I'd like to change my handle to @{want}, but Plover says it's taken. I looked it up, and the account with that handle has no public notes and an empty profile. Could you free it up for me?",
		'Someone has the handle @{want}, which is my name and what I use everywhere else online. The account looks completely unused. Is there a process for asking for a handle?'
	],
	asks: [
		["Is there a second choice, in case @{want} can't be freed up?", "@{want}_notes, I suppose, though I'd much rather have the plain one."],
		['Is @{want} your own name, or the name of a business?', "My own name, {first} {last} run together. I'm a freelance illustrator, so it's sort of both."],
		["What's your current handle?", "@{cur}. I chose it years ago and it doesn't look professional on shared notebooks."]
	],
	more: ['I use the same name on every other site, so it would be nice to match.', 'Will my shared links break if my handle changes?'],
	notes: ["Wants handle @{want}, says it's held by an empty account. Profile team, can handles be freed?", 'Handle request for {uid}. Current @{cur}, wants @{want}.'],
	probes: [
		"Handles are lowercase letters, digits and underscores, 3 to 20 characters. @{want} is held by user {other}, last signed in {otherseen}. Not something I can hand over on my own.",
		'Looked up @{want}: belongs to {other}. Pasting both profiles.'
	],
	paste: (_r, v) => `${profile(v, `${v.first} ${v.last}`, v.cur)}\n\n${block([obj({ id: Number(v.other), name: '', handle: v.want! })], 'json')}`,
	ends: {
		sorted: [
			[['p', '{other} was deleted more than 30 days ago; the handle was only still reserved because of a leftover flag. Cleared it.'], ['a', 'Good news: the account holding @{want} was deleted some time ago, and the handle should have become free then. The profile team has cleared it, so you can now set @{want} yourself under Settings, Profile. Shared links use their own codes, so none of them will break.'], ['c', 'Done, it worked straight away. Thank you so much!']]
		],
		team: [
			[['a', "The profile team can't hand over a handle that belongs to another account, even one that looks unused. Our accounts team decides on handles held by accounts that haven't been used for a long time, and I've passed your request to them. They'll contact you directly once they've decided."], ['c', "OK, I'll wait to hear from them. Thanks for passing it on."]]
		]
	},
	waits: ['Before we can look at freeing a handle, we need a little more. Could you send us something that shows the name is yours, such as a link to your portfolio site or your business registration?']
};

const handleRules: Topic = {
	weight: 1.5,
	logs: ['Profile   edit screen opened', 'Profile   handle check: not available'],
	needs: { team: [['iPhone 15', 'iOS', false, true]] },
	slots: (_r, c) => ({ want: handleOf(c), wantcap: `${c.first}${c.last}`.replace(/[^A-Za-z]/g, '').slice(0, 20) }),
	subjects: ["Handle won't save", "Can't change my handle", 'Handle not available?', 'New handle rejected'],
	opens: [
		"I tried to change my handle to {wantcap} and Plover says 'This handle isn't available'. I searched and nobody has it. What am I doing wrong?",
		"The app won't accept my new handle, {wantcap}. It isn't taken, as far as I can tell. The save button just shows an error."
	],
	asks: [
		['What exactly does the message say, and on which device?', "'This handle isn't available'. On the {device}."],
		['Have you changed your handle recently?', 'Not that I remember. Maybe once when I signed up, if the app suggested one.'],
		["Is there a reason you'd like the capital letters?", "It's easier to read with the capitals. It's my name run together."]
	],
	more: ['Also, will my shared links break if I change it?', "It's not urgent, I just think my current handle looks silly."],
	notes: ["Handle change rejected as 'not available' though nobody has it. Profile team, what are the rules?", 'Handle question for {uid}.'],
	probes: ['Handles are lowercase letters, digits and underscores, 3 to 20 characters, one change every 30 days. Looking at what they tried.', 'Last handle change for {uid} was {d1}. Pasting the profile.'],
	paste: (r, v, _kind, c) => `${profile(v)}\n\n${table(['Changed (UTC)', 'Field', 'From', 'To'], [[isoMinute(c.open - int(r, 300, 900) * DAY), 'handle', '(new account)', v.handle!]])}`,
	ends: {
		sorted: [
			[['a', "I've found the reason. Handles can only use lowercase letters, digits and underscores, so the capitals in {wantcap} were what the app didn't like; the message is misleading, and we've asked for it to be clearer. @{want} is free, so you can set that yourself under Settings, Profile. Shared links use their own codes, so none of them will break."], ['c', 'Done, it worked straight away in lowercase. Thanks!']],
			[['p', 'They did change it on {d1}, so the 30 days had not run out; the message said nothing about that. Made the change for them as a one-off.'], ['a', "Your handle can be changed once every 30 days, and it was last changed on {d1}, which is why the app turned it down. Since the message didn't explain that, the profile team has made the change for you: you're now @{want} (handles are always lowercase). Shared links use their own codes, so they'll keep working."], ['c', "Brilliant, thank you, that's very kind."]]
		],
		team: [
			[['p', 'Lowercase @{want} is valid and free. The iPhone app turns it down before it ever reaches us. iOS.'], ['a', "Your new handle meets the rules and is free, but the iPhone app is turning it down before it reaches us; that's a fault in the app. I've passed it to our iOS team, who will let us know when the app is fixed."], ['c', 'OK, thanks.']]
		]
	},
	waits: ['Could you send a screenshot of the screen with the message on it? That shows us exactly what was typed.']
};

const unknown: Topic = {
	weight: 2,
	logs: ['Members   no name for 2 members, showing Unknown user'],
	kinds: { owed: 3, sorted: 2, team: 2, wait: 2 },
	slots: (r, _c, kind) => ({ k: String(kind === 'team' ? 0 : int(r, 2, 3)) }),
	subjects: ['Members show as Unknown user', "Shared notebook says 'Unknown'", "Who is 'Unknown user'?", 'Names missing in team notebook'],
	opens: [
		"In our team's shared notebook, three of the members show as 'Unknown user' with a grey circle. They can all open the notebook and edit, so they are definitely members, but nobody can tell who wrote what.",
		"I've just invited my study group to a notebook and some of them appear as Unknown user. They have proper accounts; they've been using Plover for years.",
		"Every note one of my colleagues writes in our shared notebook says 'Unknown user' underneath. She can see her own name on her phone. We're both a bit baffled."
	],
	asks: [
		['Do the people showing as Unknown user have anything in common, such as when or how they joined Plover?', "Now you ask, I think they came over from Wrenbook when it closed, like me. But I show up fine, so I'm not sure that's it."],
		['What do they see when they open their own profile?', "One of them says her profile page is just empty: no name, and the handle box is blank. The other hasn't looked yet."],
		['Does it say Unknown user on every device, or only in the web app?', 'Web and phone both. Same people.']
	],
	more: ["It's been like this for at least a month, I just never got round to writing in.", "We're about to share this notebook with a client, so it would be good to sort it out before then."],
	notes: ['Members of a shared notebook show as Unknown user. At least some came from the Wrenbook move. Profile team, can you see their profiles?', "'Unknown user' in a member list. Notebook is linked in the ticket. Profile team please look."],
	probes: ['Pasting what the service returns for each member of the notebook. Then looking for how many other accounts are in the same state.', 'Looked up each member of the notebook. Results below.'],
	paste: (r, v, kind) => {
		const rows: string[][] = [];
		const total = int(r, 5, 9);
		const missing = Number(v.k);
		const shownUnknown = kind === 'team' ? int(r, 2, 3) : missing;
		for (let i = 0; i < total; i++) {
			const person = `${pick(r, firstNames)} ${pick(r, surnames)}`;
			const id = String(int(r, 1_000_000, 4_999_999));
			if (i < missing) rows.push(['Unknown user', id, '(no profile)']);
			else if (i < shownUnknown) rows.push(['Unknown user', id, person]);
			else rows.push([person, id, person]);
		}
		return table(['Shown in the notebook', 'User id', 'Name from the profile service'], shuffle(r, rows));
	},
	ends: {
		owed: [
			[['p', "{k} of them have an account but no profile at all. All came from Wrenbook. There are more like them; I'm writing a script to fill them in from the Wrenbook export."], ['a', "The profile team found the cause. Some accounts that came over from Wrenbook were moved without a profile, so there's no name to show. They're filling in the missing profiles for everyone affected, using the names from the old Wrenbook accounts, and expect to finish within two weeks. I'll write here once your members show their names."], ['c', "Thanks, that explains it. We'll hold off sharing it with the client until then."]]
		],
		sorted: [
			[['p', 'No profile for {k} of them, but these accounts never finished the welcome steps after the move. Opening Settings, Profile in the app makes it create one.'], ['a', 'Your teammates can fix this themselves: their accounts have no profile yet because they never finished setting up after moving from Wrenbook. If they open Plover and go to Settings, Profile, the app asks for a name and creates the profile.'], ['c', "One of them tried it while I was reading your message and her name appeared straight away. I've told the others. Thank you!"]]
		],
		team: [
			[['p', "Every member has a profile with a name. The 'Unknown user' label comes from the notebook's member list, which gives up on names in some old notebooks. Sharing team."], ['a', "The profiles are all fine on our side: every member has a name. The 'Unknown user' label comes from the member list in shared notebooks, which stops filling in names in some older notebooks. I've passed this to our sharing team, who own that list."], ['c', "OK. Hope it's quick."]]
		]
	},
	waits: ['Could you ask the people who show as Unknown user to sign in once on the web app, and then tell us whether anything changes?']
};

const sso: Topic = {
	weight: 1.5,
	logs: ['Profile   edit screen opened', 'Profile   saved', 'Profile   loaded'],
	fix: true,
	kinds: { sorted: 2.5, owed: 2.5, team: 1.5, wait: 2 },
	slots: (r, c) => ({ provider: pick(r, ['Apple', 'Google']), code: `user_${(c.open % 1_000_003).toString(36)}${int(r, 10, 99)}`, d2: dayMonth(c.open - int(r, 14, 20) * DAY), d3: dayMonth(c.open - int(r, 2, 5) * DAY) }),
	subjects: ['My name shows as a string of letters', 'Profile is blank after signing up', 'Name shows as a random code', "Can't set my name"],
	opens: [
		"I signed up with {provider} last week. Everywhere in Plover my name shows as something like '{code}'. When I go to edit my profile, the name box is empty, and when I type my name and save it, it goes back to empty.",
		'New user here. I joined with my {provider} account, and the app calls me by a code instead of my name. My friend who invited me to her notebook sees the code too.'
	],
	asks: [
		['When you signed in with {provider}, did you choose to hide your email address or share it?', 'I think I chose to hide it. It asked and that seemed the safer option. Does that matter?'],
		['When you type your name and save it, does the app show any message?', "It says 'Saved' and then a second later the box is empty again."],
		['Have you signed in on more than one device yet?', 'Only the {device} so far. I was going to set it up on the {device2} once this was sorted.']
	],
	more: ["I don't mind a code as my handle, but I want my name shown to the people I share with.", 'I tried signing out and back in. Same thing.'],
	notes: ["New account via {provider}, profile name won't save. Profile team, can you see a profile for {uid}?", 'Profile name blank after {provider} sign-up; saving does not stick.'],
	probes: ['{uid} has an account but the profile record is incomplete: name missing and handle generated. Pasting what we return.', 'Looking at {uid}. The profile exists but the name never got written.'],
	paste: (_r, v) => profile(v, '', v.code),
	ends: {
		sorted: [
			[['p', "Repaired {uid}'s profile by hand; the name is in now."], ['a', 'The profile team repaired your profile, and your name now shows as {first} {last}. It was a one-off gap from the day you signed up. Your friend should see your name within ten minutes, and you can change it again under Settings, Profile whenever you like.'], ['c', "It's there now. Thanks for the quick fix!"]]
		],
		owed: [
			[['p', "Not a one-off: accounts made with {provider} and a hidden address between {d2} and {d3} all got a profile without a name. I'll repair them together once the script is reviewed."], ['a', "The team found that accounts made with {provider} and a hidden email address on some days in {mon} got a profile without a name, and saving a name afterwards doesn't fix it. They're repairing all the affected profiles together. I'll let you know here when yours is done, which should be within the week."], ['c', "OK, thanks. I'll wait before I invite anyone else."]]
		],
		team: [
			[['p', 'Profile side is fine once it gets a name, but the sign-up step never sent one. Sign-up is the accounts service.'], ['a', "The profile itself is fine on our side, but the sign-up step never passed your name on, and that step belongs to our accounts team. I've passed your ticket to them so they can repair the sign-up record."], ['c', 'OK, thank you.']]
		]
	},
	waits: ["Could you sign out of Plover on your {device}, sign in again with {provider}, and then tell us whether the name box still empties itself? We've made a change on our side and want to check it worked."]
};

const merge: Topic = {
	weight: 1,
	plans: (r, kind) => (kind === 'team' ? 'Plover for Teams' : pick(r, ['Free', 'Plover Pro (yearly)', 'Plover Pro (monthly)'])),
	slots: (r, _c, kind) => ({ which: kind === 'team' ? 'work' : pick(r, ['work', 'personal']), plan2: kind === 'team' ? 'our company\'s Plover for Teams' : 'Plover Pro' }),
	subjects: ['Merge two accounts', 'Two profiles, want one', 'Combine my work and personal Plover', 'Duplicate account'],
	opens: [
		"I have two Plover accounts, one with my work email and one with my personal email, and I keep ending up in the wrong one. Can you merge them into one profile? I'd keep the personal one.",
		"Somehow I've ended up with two profiles. One has all my notes from university, the other I made when I got a new phone and forgot my password. Please could you combine them?"
	],
	asks: [
		['Which of the two accounts has a paid plan, if either?', 'The {which} one is on {plan2}. The other is free.'],
		["Roughly how many notebooks are in the account you'd stop using?", 'Maybe a dozen, a couple of them quite big. Lots of photos.'],
		['Do any of those notebooks have other people in them?', 'Two are shared with other people, the rest are just mine.']
	],
	more: ["If you can't merge them, is there at least a way to see both at once?", "I really don't want to lose the notes in either of them."],
	notes: ['Customer asks to merge two accounts. Profile team, anything on your side, or is this accounts?', 'Account merge request. Not sure who owns this; the profile keyword sent it here.'],
	probes: ["Nothing we can do on the profile side; a profile belongs to one account. Leaving it with support to explain the options.", "Two separate accounts, two complete profiles. Merging isn't something the profile service does."],
	ends: {
		sorted: [
			[['a', "We can't merge two accounts, I'm afraid, but you can move everything across yourself: share each notebook from the old account with the one you're keeping, make it the owner, and then leave the notebook from the old account. Notes, photos and history all come with it. When that's done, you can delete the old account under Settings, Account."], ['c', 'That worked. It took about twenty minutes, and everything is in one place now. Thanks!']]
		],
		team: [
			[['a', "Because one of the accounts is part of a Plover for Teams subscription, the move has to be done by our accounts team, who can carry the seat across without losing anything. I've passed your ticket to them and they'll be in touch."], ['c', 'Great, thank you.']]
		]
	},
	waits: ["Before anything moves, we need to be sure both accounts are yours. Could you write to us from the email address of the second account, quoting this ticket's number?"]
};

const exportData: Topic = {
	weight: 1,
	subjects: ['What data do you hold about me?', 'Subject access request', 'Download my profile data', 'Copy of my information'],
	opens: [
		"Under data protection law I'd like a copy of all the personal data Saltmarsh Labs holds about me, including my profile, my settings and anything you record about how I use Plover.",
		"Is there a way to download my profile and settings? I'm reorganising my digital life and want a record of everything each service holds about me."
	],
	asks: [
		["Is it your notes you'd like, the data about you and your account, or both?", "Mostly the data about me. The notes I can export myself; I've done that already."],
		["Is the address you're writing from the one your Plover account uses?", "Yes, it's the same one."],
		['Would a file you can open in a spreadsheet suit you?', 'Anything I can open without special software is fine.']
	],
	more: ["I'm not unhappy with Plover, I just like to know what's out there about me.", "I'd appreciate it if you could confirm when you've received this request."],
	notes: ["Data request, routed to the profile team by keyword ('profile'). Profile team, anything on your side before it goes to privacy?", 'Customer wants their profile and settings data.'],
	probes: ['The profile service only holds name, handle and the three settings. Happy to provide those, but a full request is for the privacy team.', "We hold name, handle, theme, language and the digest switch for {uid}. That's all on our side. Pasting it."],
	paste: (r, v) => `${profile(v)}\n\n${settingsNow(r, v, { language: pick(r, ['en', 'en', 'de', 'nl', 'fr']) })}`,
	ends: {
		team: [
			[['a', "A request for everything we hold goes to our privacy team, who collect it from every part of Plover, not just the profile. I've passed your request to them. They answer within one month and will write to you directly."], ['c', "Thank you, that's exactly what I wanted."]]
		],
		sorted: [
			[['a', "You can download everything we hold about your account yourself, under Settings, Account, Download your data. It produces a file with your profile, your settings, your sign-in history and your notes. If anything seems to be missing, write to us and we'll look into it."], ['c', "Got it, and it's all there. Thanks for the quick help."]]
		]
	},
	waits: ["To make sure we only send this to you, could you confirm the request from inside Plover? Under Settings, Help, Contact us, mention this ticket's number."]
};

const restore: Topic = {
	weight: 1,
	plans: (r, kind) => (kind === 'team' ? pick(r, ['Plover Pro (yearly)', 'Plover Pro (monthly)']) : pick(r, ['Free', 'Free', 'Plover Pro (yearly)'])),
	slots: (_r, c) => ({ paid: c.plan.startsWith('Plover Pro') ? 'Yes, Plover Pro.' : 'No, it was the free one.' }),
	subjects: ['Deleted my account by accident', 'Please restore my profile', 'Account gone', 'Undo delete??'],
	opens: [
		"I think I've deleted my account. I was trying to remove an old device and pressed the wrong red button. Now I can't sign in and the app says the account doesn't exist. Please tell me my notes are still there.",
		"My daughter deleted my Plover account on the tablet while she was 'tidying up' my apps. Can you bring it back? I had five years of recipes in there."
	],
	asks: [
		['When did the deletion happen, roughly?', 'On {d0}, in the evening, around nine.'],
		['Which email address was the account under?', "The same one I'm writing from."],
		['Did the account have a paid plan?', '{paid}']
	],
	more: ["I'm honestly a bit panicked about this.", 'If it does come back, will my shared notebooks still be shared?'],
	notes: ['Account deleted by mistake. Profile keyword routed it here; this is accounts. Profile team, can you confirm the profile is still recoverable?', 'Restore request for an account deleted on {d0}.'],
	probes: ['The profile for {uid} is marked deleted on {d0}, within the 30 days, so it can come back with the account.', 'Profile record for {uid} is still there, marked for deletion. Accounts can restore it.'],
	ends: {
		sorted: [
			[['a', "Good news: accounts are kept for 30 days after they're deleted, so I've been able to restore yours. You can sign in again now, with all your notebooks, your profile and your settings as they were. Shared notebooks are shared just as before."], ['c', "Oh, thank goodness. Everything's there. Thank you so much."]]
		],
		team: [
			[['a', "Your account can still be restored, but because it had a paid plan, our accounts team has to restore it together with the plan. I've passed your ticket to them with everything they need, and they'll write to you once it's done."], ['c', 'Thank you. Please ask them to be quick!']]
		]
	},
	waits: ["To restore an account, we have to be sure it's yours. Could you tell us the name of one notebook in it, and the month you first signed up, as near as you remember?"]
};

const newLanguage: Topic = {
	weight: 1,
	plans: () => 'Plover for Teams',
	slots: (r) => ({ wantlang: pick(r, ['Welsh', 'Catalan', 'Norwegian', 'Finnish', 'Turkish', 'Czech', 'Danish', 'Greek']) }),
	subjects: ['Plover in {wantlang}?', 'Language request', 'Please add {wantlang}', 'No {wantlang} in the list'],
	opens: [
		'Is there any plan to offer Plover in {wantlang}? Our whole office works in {wantlang}, and some of the older staff struggle with the English menus.',
		"I looked in Settings, Language, and {wantlang} isn't there. Our team would really like it, and I'd happily help translate, if that's of any use."
	],
	asks: [
		["Is it the menus and buttons you need in {wantlang}, or also things like spell checking in your notes?", "Mainly the menus. Spell checking already works in {wantlang} because it uses the computer's own dictionary."],
		['How many people in your organisation use Plover?', 'About {n0} of us, all on the same team account.'],
		['Do you use Plover on phones as well as computers?', 'Mostly on laptops at our desks, but a few of us use the phone app on site visits.']
	],
	more: ['Even a partial translation would be better than nothing.', 'Plenty of apps offer {wantlang} these days, so I was a little surprised.'],
	notes: ['Language request: {wantlang}. Profile team, does the settings side need anything to add a language?', "Feature request for {wantlang}. Routed here by keyword 'language'."],
	probes: ['The settings side would take any language code; adding a language is a translation question. Not ours to decide.', 'We store whatever code the apps send. Which languages exist is up to localisation.'],
	ends: {
		team: [
			[['a', "Adding a language is up to our localisation team, who keep the list of languages and work with the translators. I've passed your request to them, with the size of your team and your offer to help, and they'll contact you if they take it on."], ['c', "Thanks, I'd be glad to help if they want me."]]
		],
		sorted: [
			[['a', "We don't offer {wantlang} at the moment, and there is no date for it, I'm afraid. Plover is available in nine languages today. I've recorded your request so that it counts when the next language is chosen, but I wouldn't want you to wait for it."], ['c', 'Understood. Thanks for being clear about it.']]
		]
	},
	waits: ["If you'd like to help translate, could you tell us a little about your experience, and whether you'd be happy to sign our volunteer agreement? I'll pass it on together with your request."]
};

const rtl: Topic = {
	weight: 1,
	logs: ['Editor    new note', 'Editor    paragraph direction ltr (default)', 'Editor    input method changed'],
	fix: true,
	slots: (r) => ({ rtllang: pick(r, ['Arabic', 'Hebrew', 'Persian', 'Urdu']) }),
	subjects: ['{rtllang} text goes the wrong way', 'Right to left not working', 'Text direction in notes', 'Notes back to front'],
	opens: [
		"I write my notes in {rtllang} and English. The {rtllang} lines start on the left and the punctuation ends up in the wrong place. In other apps it's fine.",
		'I take notes in {rtllang}, and since the last update the text in new notes is aligned to the left and the cursor jumps around when I type.'
	],
	asks: [
		['Is this in the web app, the phone app, or both?', "On the {device}. I haven't tried the others for long notes."],
		['Does it happen in notes you create now, or in older ones too?', 'Only in new ones. Older notes look right.'],
		['What language is Plover itself set to?', 'English. I prefer the menus in English.']
	],
	more: ['I write in both languages in the same note quite often.', 'It makes Plover almost unusable for my work, to be honest.'],
	notes: ['Right-to-left text in notes. Routed here because the customer mentions their language setting. Probably not profile.', '{rtllang} notes align left. Profile team, anything to do with settings?'],
	probes: ["Their language setting is English, as they want. Text direction in notes isn't something the profile service touches.", 'Nothing in settings affects text direction. Leaving it with support.'],
	paste: (r, _v, _kind, c) => appLog(r, c, ['Editor    new note', 'Editor    paragraph direction ltr (default)', 'Editor    input method changed', 'Editor    paragraph direction ltr (default)']),
	ends: {
		team: [
			[['a', "The profile team confirmed this isn't to do with your settings. It's the note editor that sets the direction wrongly for new notes since the last update. I've passed it to our web team, who look after the editor, with your examples."], ['c', "Thanks. I hope it's soon, I use it every day."]]
		],
		sorted: [
			[['a', 'You can set the direction for each note: in the editor, open the Format menu and choose Text direction, then Right to left. New notes start left to right unless you choose otherwise, and you can also set the direction of a single paragraph if you mix languages.'], ['c', "That works, thank you. I didn't even know that menu existed."]]
		]
	},
	waits: ['Could you send a short screen recording, or a few screenshots, of a new note while you type? That will show the team exactly where the cursor goes.']
};

const digestContent: Topic = {
	weight: 1,
	subjects: ['Digest shows deleted notes', 'Wrong notes in my Monday email', 'Weekly email lists old notes', 'Digest question'],
	opens: [
		'The weekly digest lists notes I deleted weeks ago. Clicking them gives an error page. Why is it still showing them?',
		"This Monday's summary email included four notes I'd thrown away the week before. It's a bit embarrassing, as one of them was a draft letter I'd rather forget."
	],
	asks: [
		['Were the deleted notes in a notebook you share with others?', "One of them was, the others weren't."],
		['Have you emptied the trash since you deleted them?', "No, I didn't know there was a trash. I thought deleting was deleting."],
		['Is the digest otherwise right, with the notes you wrote that week?', 'Yes, apart from the deleted ones it looks fine.']
	],
	more: ["I don't want to turn the digest off, I like it, I just don't want old rubbish in it.", 'My husband gets a digest too, for our shared shopping notebook, and his had the same thing.'],
	notes: ["Digest includes deleted notes. Routed to profile team by keyword 'digest'. Profile team, the digest switch looks fine?", "Digest content question, probably the email team's."],
	probes: ["Their digest switch is on, as they want. What goes in the email isn't our part.", 'Settings look as the customer wants them. The content is built elsewhere.'],
	ends: {
		team: [
			[['a', "The profile side is fine: your digest is switched on and goes to the right address. What goes into the email is decided by the digest system itself, which belongs to our email team. I've passed your examples to them so they can stop it including deleted notes."], ['c', 'OK, thanks.']]
		],
		sorted: [
			[['a', "Deleted notes go to the trash and stay there for 30 days, and the digest still counts them until then. If you empty the trash (it's at the bottom of the notebook list), they won't appear in the next digest. We've also asked for the digest to leave out the trash in future."], ['c', "Emptied it, and this Monday's email looked right. Thanks."]]
		]
	},
	waits: ["Could you forward us last Monday's email as an attachment? The email team needs it to see exactly what was sent."]
};

const digestTime: Topic = {
	weight: 1,
	slots: (r) => ({ city: pick(r, ['Toronto', 'New York', 'Boston', 'Montreal', 'Halifax']) }),
	subjects: ['Digest arrives in the middle of the night', 'Can I choose when the weekly email comes?', 'Monday email time', 'Weekly email at 2am'],
	opens: [
		'I live in {city}, and the weekly digest arrives at about two in the morning on Monday, which wakes me up because my phone buzzes for email. Can I change when it comes?',
		'Is there a way to choose the time of the weekly digest? It comes in the middle of my night here in {city}.'
	],
	asks: [
		['Which country is shown on your account, under Settings, Account?', "It says United Kingdom. I moved to {city} last year and never changed it; I didn't think it mattered."],
		['Would a different day help, or only a different time?', 'Time, mostly. Monday is fine, just not the middle of the night.'],
		['Does the digest always arrive at the same time, or does it vary?', 'Always within a few minutes of two in the morning. You could set a clock by it.']
	],
	more: ["I could mute email at night, but I'd rather not miss other things."],
	notes: ['Customer wants to choose the time of the digest. Profile team, is there a setting for this?', "Digest send time. Routed here by 'digest'."],
	probes: ["Settings only hold the digest switch, not a time. The send time follows the account's country, which is accounts' data.", 'Nothing time-related in settings. The digest sender picks the time.'],
	ends: {
		sorted: [
			[['a', 'The digest goes out at 07:00 on Monday in the time zone of the country on your account, which is still the United Kingdom. If you change the country under Settings, Account, to the one you live in now, the next digest will arrive at 07:00 your time.'], ['c', "Changed it, and this week's arrived at breakfast time. Thanks!"]]
		],
		team: [
			[['a', "There's no way to choose the time yet; the digest goes out at 07:00 on Monday in the time zone of the account's country. I've passed your request to our email team, who look after the digest and collect requests like yours."], ['c', 'OK, thanks for passing it on.']]
		]
	},
	waits: ['Could you tell us the time the last digest arrived, as your mail program shows it? The email team needs it to check the send time.']
};

const matchDevice: Topic = {
	weight: 1,
	logs: ['Settings  appearance screen opened', 'Appearance options: light, dark'],
	primary: 'computer',
	subjects: ['Auto dark mode in the web app?', 'Follow the system theme', 'Match device option missing', 'Theme to follow my laptop'],
	opens: [
		"On my phone I can choose Match device, so Plover goes dark when the phone does. In the web app there's only Light and Dark. Could you add Match device there too?",
		"My laptop switches to dark mode in the evening, and every website I use follows it except Plover's web app. Is there an option I'm missing?"
	],
	asks: [
		['Which browser and which version do you use the web app in?', "Safari, whatever version came with the laptop. I don't update much, to be honest."],
		['Have you chosen Match device on your phone?', 'Yes, and it works nicely there.'],
		['Is it the web app you use, or the desktop app?', 'The web app, in the browser. I never installed the desktop one.']
	],
	more: ['Not urgent at all, just a nice-to-have.'],
	notes: ['Request: Match device theme in the web app. Profile team, does the setting support it?', 'Customer wants the web app to follow the system theme.'],
	probes: ["The theme setting already takes 'system'; the phone apps use it. Whether the web app offers it is up to the web team.", "Setting's fine either way. This is about what the web app shows."],
	ends: {
		team: [
			[['a', "The setting itself exists, but the web app doesn't offer it in every browser yet. I've passed your request to our web team, who decide what goes on the web app's Appearance screen."], ['c', 'Thanks!']]
		],
		sorted: [
			[['a', "Match device is in the web app, but it only appears in browsers that tell us whether the system is in dark mode, and older versions of Safari don't. Once Safari is updated, you'll see a third choice under Appearance."], ['c', 'Updated, and there it is. Lovely, thank you.']]
		]
	},
	waits: ["Could you send us a screenshot of the Appearance screen in the web app? It'll help us see which options your browser is showing."]
};

const contrast: Topic = {
	weight: 1,
	logs: ['Appearance applying dark', 'Accessibility text size: extra large'],
	needs: { sorted: [['iPad Air', 'iPadOS']], team: [['iPad Air', 'iPadOS']], wait: [['iPad Air', 'iPadOS']] },
	subjects: ['Text too faint', 'High contrast option?', 'Accessibility settings', 'Need bigger text'],
	opens: [
		'I have low vision and find the light grey text in Plover hard to read, even in dark mode. Is there a high-contrast theme, or a way to make the text bigger in the iPad app?',
		'My father has macular degeneration and uses Plover on his iPad for shopping lists and appointments. The text is too faint for him. What can we change?'
	],
	asks: [
		['Which device is it used on most?', "The iPad, with the text size turned up in the iPad's own settings."],
		["Does Plover's text get bigger when the iPad's text size goes up?", "The notes do. The menus don't seem to."],
		['Is it the text in the notes that is hard to read, or the menus and labels around them?', 'Mostly the small grey labels: the dates under each note and the names of the notebooks in the sidebar.']
	],
	more: ['Grey on white is the hardest. Black on white is fine.'],
	notes: ["Accessibility: high-contrast theme / text size. Routed here because of 'theme'. Profile team, any setting for this?", 'Low-vision customer asks for high contrast.'],
	probes: ['Theme takes light, dark or system. No high-contrast value. Not something we can add on our own.', "Settings can't help here today."],
	ends: {
		team: [
			[['a', "There's no high-contrast theme yet. I've passed your request to our design team, who are working on accessibility across the apps, along with your notes about the menus. They may ask whether you'd like to try early versions, if you're happy with that."], ['c', 'Yes, very happy to. Thank you.']]
		],
		sorted: [
			[['a', "On the iPad, Plover follows the system's Increase Contrast and Bold Text settings, under Accessibility, Display & Text Size. With both on, the grey text becomes much darker, and the menus grow with the text size."], ['c', "That's made a real difference. It's readable now. Thank you so much."]]
		]
	},
	waits: ["Could you send a screenshot of a screen that's hard to read? It helps the designers see which colours are the problem."]
};

const school: Topic = {
	weight: 1,
	plans: () => 'Plover for Education',
	slots: (r) => ({ last2: pick(r, surnames) }),
	subjects: ['Student changed his name to something rude', "Change a pupil's display name", 'Teacher question about names', 'Inappropriate display name in class notebook'],
	opens: [
		"I'm a teacher, and our school uses Plover for Education. One of my Year 9 students has changed his display name to something I won't repeat, and it shows on our class notebook. Can I change it back, or can you?",
		"A pupil in my class has given herself a display name that's upsetting another pupil. It appears on every note in our shared class notebook. How can I get it changed today?"
	],
	asks: [
		["Are you an admin of your school's Plover for Education account, or a teacher in it?", 'Just a teacher. The admin is our IT technician, Mr {last2}.'],
		['Are the student accounts managed by the school?', 'Yes, the school created them, and the students sign in with their school email addresses.'],
		['Is the name showing in a notebook the whole class shares?', 'Yes, our class notebook for homework, which about thirty pupils and two teachers use.']
	],
	more: ["I've spoken to the student, but the name is still there."],
	notes: ["Education: teacher wants a student's display name changed. Profile team, anything on your side?", 'Managed student account with an offensive display name.'],
	probes: ["We could change the name, but managed accounts should go through the school's admin. Leaving the decision to education.", "We don't usually edit managed accounts directly. Back to support."],
	ends: {
		team: [
			[['a', "Changes to managed student accounts go through our education team, who work with the school's admin. I've passed your ticket to them, and they'll contact your IT technician today to sort it out."], ['c', "Thank you. I'll let him know to expect it."]]
		],
		sorted: [
			[['a', "Your school's admin can do this from the admin console: Members, choose the student, Edit name. They can also lock display names so students can't change them. I've written to Mr {last2} with the steps."], ['c', "He's done it, and locked the names as well. Thank you, that's a relief."]]
		]
	},
	waits: ["Before we change a managed account, the request has to come from the school's admin. Could you ask Mr {last2} to write to us from the admin address, quoting this ticket's number?"]
};

const teamsAdmin: Topic = {
	weight: 1,
	plans: () => 'Plover for Teams',
	kinds: { team: 3, owed: 2, wait: 2 },
	subjects: ['Turn off the digest for all staff', 'Company-wide digest setting', 'Admin question: weekly emails', 'Stop digests for our team'],
	opens: [
		'I manage our company\'s Plover for Teams account, {n0} users. Several staff have complained about the weekly digest emails. Can I turn them off for everyone at once?',
		'As the admin of our team I keep getting asked how to stop the Monday digest. Is there a setting in the admin console that turns it off for the whole team?'
	],
	asks: [
		['Would you want people to be able to switch it back on themselves?', "Yes, ideally it's off unless they choose it."],
		['Is it only the digest, or other emails too?', 'Just the digest. The notifications about shared notebooks are useful.'],
		['Are you an owner of the team account, or an admin?', 'I set the account up, so I think I am the owner. There are two other admins.']
	],
	more: ["I'd rather not ask everyone to go into their own settings; most of them won't."],
	notes: ['Teams admin wants to switch off the digest for all members. Profile team, can settings be changed for a whole team?', 'Admin console question about the digest.'],
	probes: ["We could, technically, but changing members' own settings from our side isn't a good idea. The admin console is the place.", "Members' settings are theirs. Let's see what the admin console can offer."],
	ends: {
		team: [
			[['a', "There isn't a team-wide option for the digest in the admin console yet. I've passed your request to the team that builds the admin console, and they'll be in touch to ask what else you'd want from it."], ['c', 'Thanks. Happy to help if they want to talk.']]
		],
		owed: [
			[['a', "The team that builds the admin console is adding a digest option for team owners, and they expect it before the end of the month. I'll write here when it's available, so you can switch the digest off for everyone in one go."], ['c', 'Great, thanks.']]
		]
	},
	waits: ["Could you confirm that you're an owner of the team account? Only owners can change team-wide options, and I'd like to check before going further."]
};

const api: Topic = {
	weight: 1,
	slots: (r) => ({ n2: String(int(r, 40, 120)) }),
	subjects: ['429s from the profile endpoint', 'API rate limit when listing collaborators', 'Integration hitting limits', 'Public API: profile lookups'],
	opens: [
		'I maintain a small open-source tool that publishes Plover notebooks as a static site, and it shows the name of each collaborator next to their notes. Since last month it keeps getting 429 Too Many Requests from the profile endpoint of your public API when a notebook has a lot of members.',
		"Our company's internal dashboard pulls the names of the people in our shared notebooks through the Plover API. For notebooks with many members we get rate limited, and the dashboard shows gaps."
	],
	asks: [
		['How many requests does your tool make for one notebook?', 'One per member, so for our biggest notebook about {n2}, plus the notebook itself.'],
		['Which version of the API are you using, and with what kind of token?', 'v2, with a personal access token.'],
		['Does the tool run on a schedule, or when someone asks for a page?', 'Every night at two, for every notebook it publishes, one after the other.']
	],
	more: ["I'm happy to change how the tool works if there's a better way."],
	notes: ["API user rate-limited on profile lookups. Routed here because of 'profile endpoint'. The public API belongs to the API team, but profile team, FYI.", 'Public API question about profile lookups.'],
	probes: ["The public API sits in front of us; the limit of 60 requests a minute is the gateway's. Their usage is fine from our side.", 'Nothing wrong on the profile side; the 429s come from the API gateway.'],
	paste: (r, _v, _kind, c) => {
		let t = c.open - int(r, 1, 5) * DAY + int(r, 0, 600) * MIN;
		const lines: string[] = [];
		let second = 0;
		for (let i = 0; i < 14; i++) {
			second += int(r, 0, 1);
			const status = i > 9 ? 429 : 200;
			lines.push(`${new Date(t + second * 1000).toISOString().slice(0, 19)}Z  GET /v2/users/${int(r, 1_000_000, 4_999_999)}/profile  ${status}  ${status === 200 ? int(r, 24, 90) : int(r, 1, 4)} ms`);
		}
		return `The customer's log, as they sent it:\n\n${block(lines)}`;
	},
	ends: {
		sorted: [
			[['a', "You don't need one request per member: the notebook members endpoint in v2, GET /v2/notebooks/<notebook id>/members, includes each member's name and handle in the list. With that, a notebook takes one request instead of {n2}."], ['c', "Switched over and it's one request now. Thanks, I'd missed that endpoint completely."]]
		],
		team: [
			[['a', "The limit is set by our API team, who can raise it for integrations like yours. I've passed your ticket to them with the numbers you gave, and they'll contact you about it."], ['c', 'Thanks, much appreciated.']]
		]
	},
	waits: ['Could you send us the client id of your token (not the token itself)? The API team needs it to look at your requests.']
};

const billing: Topic = {
	weight: 1,
	plans: () => 'Plover Pro (monthly)',
	slots: (r) => ({ card: String(int(r, 1000, 9999)), amount: pick(r, ['£4.99', '€5.49', '$5.99']) }),
	subjects: ['Charged twice', 'Double charge for Pro', 'Profile says one plan, bank says two payments', 'Two payments this month'],
	opens: [
		'I was charged twice this month for Plover Pro, {amount} each time, a day apart. My profile only shows one plan. Please refund the second one.',
		"My bank statement shows two payments to Saltmarsh Labs this month. I only have one account, and my profile page shows Plover Pro once. What's going on?"
	],
	asks: [
		['Could you tell us the last four digits of the card?', 'It ends in {card}.'],
		['Did you buy Plover Pro in the app on your phone, or on our website?', 'On the website, I think, when I signed up.'],
		['Do both payments show the same amount and the same name on the statement?', 'Same amount, both say SALTMARSH LABS PLOVER. One says pending, now that I look closely.']
	],
	more: ["Money is tight at the moment, so I'd appreciate this being sorted quickly."],
	notes: ["Billing question, routed to profile team because 'my profile shows'. Profile team, just confirming plan isn't yours.", 'Double charge. Not profile, but routed here.'],
	probes: ['Plans aren\'t in the profile service; the profile page shows what billing tells it. Passing back.', 'Nothing billing-related in the profile service. Back to support.'],
	paste: (r, v, kind, c) => {
		const day = c.open - int(r, 2, 8) * DAY;
		return `What support can see in the billing tool:\n\n${table(['Invoice', 'Date', 'Description', 'Amount', 'State'], [
			[`PLV-${int(r, 400000, 499999)}`, longDate(day - 30 * DAY), 'Plover Pro, monthly', v.amount!, 'paid'],
			[`PLV-${int(r, 500000, 599999)}`, longDate(day), 'Plover Pro, monthly', v.amount!, 'paid'],
			[kind === 'sorted' ? '(card check)' : `PLV-${int(r, 500000, 599999)}`, longDate(day + DAY), kind === 'sorted' ? 'Card check' : 'Plover Pro, monthly', v.amount!, kind === 'sorted' ? 'pending' : 'paid']
		])}`;
	},
	ends: {
		team: [
			[['a', "The plan isn't part of your profile, so this goes to our billing team, who can see the payments and make refunds. I've passed your ticket to them and they'll write to you within two working days."], ['c', 'OK, thank you.']]
		],
		sorted: [
			[['a', "The second payment was a card check that your bank shows for a few days while it's pending. It was never taken and has now dropped off. Only one payment of {amount} went through. If your statement still shows two next week, write to us here and we'll take it further."], ['c', "You're right, it's gone today. Sorry for the bother, and thanks."]]
		]
	},
	waits: ['Could you send us the invoice numbers from the emails we sent when you were charged? They start with PLV-.']
};

const signinEmail: Topic = {
	weight: 1,
	subjects: ["Can't get into my profile", 'Sign-in link goes to my old address', 'Locked out after changing email', 'Profile login problem'],
	opens: [
		"I changed the email address on my profile last week, and now I can't sign in. The app sends the sign-in link to my old address, which doesn't exist any more.",
		"After updating my email in Plover I'm locked out. The sign-in link never arrives at the new address, and the old one was closed when I left my job."
	],
	asks: [
		['Which address did you change it from, and to?', 'From my old work address to my personal one. I can give you both if that helps.'],
		['Are you still signed in on any device?', "My phone still seems to be signed in, but the laptop isn't."],
		['Did you get an email asking you to confirm the change?', "I don't think so, but it would have gone to the new address and I don't remember seeing it."]
	],
	more: ['All my notes for a course are in there, and I have an exam in two weeks.'],
	notes: ["Sign-in problem, routed to the profile team because of 'profile'. This is accounts, but profile team please confirm.", 'Locked out after changing address.'],
	probes: ["Profile for {uid} is intact. Sign-in isn't ours.", "Nothing wrong with the profile. The sign-in address is accounts' data."],
	paste: (r, _v, _kind, c) => {
		const rows: string[][] = [];
		let t = c.open - int(r, 6, 9) * DAY;
		rows.push([isoMinute(t), 'sign-in address change requested', 'waiting for confirmation']);
		for (let i = int(r, 2, 4); i > 0; i--) {
			t += int(r, 200, 2000) * MIN;
			rows.push([isoMinute(t), 'sign-in link requested', 'sent to the old address']);
		}
		return `Sign-in events from the accounts dashboard:\n\n${table(['When (UTC)', 'Event', 'Result'], rows)}`;
	},
	ends: {
		team: [
			[['a', "Sign-in is handled by our accounts team, and changing the address an account signs in with needs a check that only they can make. I've passed your ticket to them; they'll write to you at this address."], ['c', "Thanks. I'll keep an eye out."]]
		],
		sorted: [
			[['a', "The change you made last week was waiting for a confirmation, which is why links still went to the old address. If any device is still signed in, open Settings, Account, Sign-in address there and press Confirm. After that, sign-in links go to the new address."], ['c', "My phone was still signed in. Confirmed it there, and I'm back in on the laptop. Thank you!"]]
		]
	},
	waits: ['To change the sign-in address we need to check it\'s you. Could you tell us the name of a notebook in your account and roughly when you created it?']
};

const signinPhone: Topic = {
	weight: 1,
	primary: 'phone',
	slots: (r) => ({ provider: pick(r, ['Apple', 'Google']) }),
	subjects: ['No account found on new phone', "Plover says my profile doesn't exist", "Can't sign in on new phone", 'Account missing?'],
	opens: [
		"I can't sign in to Plover on my new phone. It says there's no account with my email address, but I've used Plover for years and it's all still there on my old laptop.",
		'I got a new phone, installed Plover, typed my email and it wants me to make a new account. Where has my profile gone?'
	],
	asks: [
		['When you first signed up, did you use an email address, or Google or Apple?', "I honestly don't remember. It was a long time ago, on an old phone."],
		['Is the laptop still signed in?', "Yes, everything's fine there."],
		['When you open Plover on the laptop, does Settings, Account show an email address?', "It shows my name and a little logo next to it, but I couldn't see an address."]
	],
	more: ["I didn't want to make a new account in case it wiped the old one."],
	notes: ["Sign-in on new phone says no account. Routed here because of 'profile'. Accounts, really.", 'New phone sign-in issue.'],
	probes: ["Profile for {uid} is fine. The sign-in method isn't ours to see.", 'Profile is intact. Nothing for us here.'],
	ends: {
		sorted: [
			[['a', "Your account was created with Sign in with {provider}, so there's no password or email link for it. On the new phone, choose Continue with {provider} and pick the same {provider} account. All your notes will be there."], ['c', "That did it, I'm in. Thank you!"]]
		],
		team: [
			[['a', "Your account was set up through an old sign-in method that our accounts team needs to move over before you can sign in on a new phone. I've passed your ticket to them, and they'll write to you at this address."], ['c', 'OK, thank you.']]
		]
	},
	waits: ["To find the account, could you tell us the email address shown in the laptop's copy of Plover? It's under Settings, Account."]
};

const pronouns: Topic = {
	weight: 1,
	slots: (r) => ({ pron: pick(r, ['she/her', 'he/him', 'they/them']) }),
	subjects: ['Pronouns on my profile', 'Add a pronouns field?', 'Profile fields request', 'Showing pronouns next to my name'],
	opens: [
		"Could you add a place for pronouns on the profile? In notebooks I share with clients, I'd like people to see mine next to my name.",
		'Is there a way to show my pronouns in Plover? Other tools we use at work have a field for them.'
	],
	asks: [
		['Where would you want them to show: next to your name everywhere, or only on your profile?', "Next to my name in shared notebooks would be ideal. That's where people actually see me."],
		['Would you want to choose who sees them?', 'Everyone who sees my name is fine.'],
		['Is it mostly shared notebooks with clients, or with colleagues?', 'Both, but the client ones matter most, as those are people I may never meet in person.']
	],
	more: ["I know it's a small thing, but it matters to me."],
	notes: ['Feature request: pronouns on the profile. Profile team, FYI.', 'Profile field request (pronouns).'],
	probes: ['The profile has a name and a handle, nothing else. A new field needs the apps to show it too. One for product.', 'Not a quick change; noting it.'],
	ends: {
		sorted: [
			[['a', "There's no separate field yet. Until there is, quite a few people add their pronouns to their display name, such as '{first} ({pron})', and it then shows everywhere your name does. Display names can be up to 50 characters, so there's room."], ['c', "I'll do that for now. Thanks."]]
		],
		team: [
			[['a', "I've passed your request to our product team, who keep the list of profile changes people have asked for. A pronouns field is already on it, and your request adds weight."], ['c', 'Thanks, glad to hear others have asked too.']]
		]
	},
	waits: ['Could you tell us which other tools you use that have a pronouns field, and how they show it? The product team likes to see examples.']
};

const nameRules: Topic = {
	weight: 1,
	logs: ['Profile   edit screen opened', "Profile   could not save name"],
	primary: 'computer',
	slots: (r, c, kind) => {
		const short = `${c.first} ${c.last} | ${pick(r, ['Bookkeeping', 'Garden Design', 'Tutoring', 'Translation'])}`;
		const long = `${short} for ${pick(r, ['Small Businesses and Sole Traders', 'Homes, Schools and Community Spaces', 'Students of All Ages and Levels', 'Publishers, Agencies and Charities'])}`;
		const full = kind === 'team' ? short : long;
		return { full, short, len: String(full.length) };
	},
	subjects: ["Can't save my display name", 'Name rejected', 'Error when changing my name', "Display name won't save"],
	opens: [
		"I'm trying to set my display name to '{full}' and the app just says 'Couldn't save your name'. No reason given.",
		"Plover won't save my display name. I'm typing '{full}' and every time it says it couldn't save it. A plain name works fine."
	],
	asks: [
		['Does the name include a web address or an @ sign?', 'No, just my name and a few words about what I do.'],
		['Which device are you saving it on?', 'The web app, on the {device}.'],
		['Does the same name save if you leave out the part after your name?', 'Yes, my name on its own saves straight away.']
	],
	more: ["It's for clients, so I'd like them to see what I do at a glance."],
	notes: ['Display name will not save. Profile team, what are the rules?', 'Name rejected without a reason.'],
	probes: ['Names are 1 to 50 characters, no web addresses, no @. Checking the one they tried.', 'Looking at the name they tried: {len} characters.'],
	ends: {
		sorted: [
			[['a', "Display names can be up to 50 characters, and the one you tried is {len}. If you shorten it to 50 or fewer, for example '{short}', it saves without trouble. We've asked for the message to say why in future."], ['c', "Shortened it and it's saved. Thanks. It would have been nice if it had said so!"]]
		],
		team: [
			[['p', "{len} characters, so within the limit, and we'd accept it. The web form never sends it: it fails on the vertical bar. Web team."], ['a', "Your name is within the rules, so the profile service would accept it; the web app's form is turning it down before it reaches us, because of the vertical bar. I've passed this to the web team, who look after that form."], ['c', 'OK, thanks. I hope it gets fixed soon.']]
		]
	},
	waits: ['Could you send a screenshot of the message, and tell us exactly what you typed, including any symbols? Then we can try it ourselves.']
};

const showNames: Topic = {
	weight: 1,
	logs: ['Members   showing handles'],
	fix: true,
	primary: 'android',
	slots: (_r, c) => ({ aver: c.primary.ver }),
	subjects: ['Phone shows usernames instead of names', 'Names replaced by @handles', 'Collaborators show as handles', 'Shared notebook shows handles only'],
	opens: [
		"On my Android phone, everyone in our shared notebooks appears as their @handle instead of their name. On the laptop I see proper names. It's confusing, because some of the handles are nothing like the person's name.",
		'Since yesterday my phone shows people\'s handles in place of their names in every shared notebook. Even mine shows as my handle.'
	],
	asks: [
		['Which version of the Plover app is on the phone?', 'It says {aver} under Settings, About.'],
		['Is it everyone, or only some people?', 'Everyone, including me.'],
		['Did anything change on the phone around the time it started, such as an update?', 'The app updated itself the day before, I think. I had a notification about it.']
	],
	more: ["It's not the end of the world, but it's odd."],
	notes: ['Android shows handles instead of names in shared notebooks. Profile team, are names coming through?', 'Handles shown instead of names on Android.'],
	probes: ['Profiles for the members they named all have names. Pasting two.', 'Names are there on our side.'],
	paste: (r) => {
		const a = `${pick(r, firstNames)} ${pick(r, surnames)}`;
		const b = `${pick(r, firstNames)} ${pick(r, surnames)}`;
		return block([obj({ id: int(r, 1_000_000, 4_999_999), name: a, handle: pick(r, sillyHandles) }), obj({ id: int(r, 1_000_000, 4_999_999), name: b, handle: b.toLowerCase().replace(/[^a-z]/g, '_') })], 'json');
	},
	ends: {
		sorted: [
			[['a', "There's a notebook option that does exactly this: in each notebook, open Notebook settings and look for Show handles instead of names. It's switched on in your phone's app, probably by accident, and switching it off brings the names back."], ['c', 'Ha, that was it. No idea how I managed that. Thank you.']]
		],
		team: [
			[['a', "The names are coming through correctly from us. It's version {aver} of the Android app that shows handles in their place, after an update earlier this month. I've passed it to our Android team, who already have a few reports like yours."], ['c', "Thanks, I'll wait for the next update."]]
		]
	},
	waits: ["Could you send us the diagnostics from the phone (Settings, Help, Send diagnostics) and mention this ticket's number?"]
};

const avatar: Topic = {
	weight: 1,
	logs: ['Photo     picked from camera roll', 'Photo     uploaded (1.8 MB)'],
	primary: 'phone',
	subjects: ['Profile picture sideways', 'My photo is rotated', 'Avatar on its side', 'Profile photo wrong way round'],
	opens: [
		'I uploaded a new profile photo from my phone and it shows sideways everywhere. On the phone it looked fine before I uploaded it.',
		"My profile picture is lying on its side. I took it in portrait, as normal. I've tried uploading it again and it does the same."
	],
	asks: [
		['Did you take the photo with the phone\'s camera, or pick it from somewhere else?', 'Took it with the camera, then chose it in Plover.'],
		['Which phone is it?', 'The {device}.'],
		['Does the photo look right in other apps after you upload it?', 'Yes, everywhere else it is the right way up. Only Plover turns it.']
	],
	more: ['I look ridiculous; my colleagues have been teasing me.'],
	notes: ['Profile photo problem. Routed to profile team. Profile team, are photos yours?', 'Sideways profile photo.'],
	probes: ["Photos aren't in the profile service; we only hold name and handle. They're the media team's.", 'Not ours: photos live with media.'],
	ends: {
		team: [
			[['a', "Profile photos are stored by our media team's service, not with the rest of your profile, so I've passed this to them with the details. They'll let you know when it's fixed."], ['c', 'OK, thanks.']]
		],
		sorted: [
			[['a', "Your phone saves photos with a note saying which way up they are, and our upload ignores it for some phones. If you open the photo in the phone's own editor, rotate it once and back again, and save it, the upload shows it the right way round."], ['c', "Did that and it's upright now. Thanks!"]]
		]
	},
	waits: ['Could you send us the photo you uploaded, as an attachment? The media team needs the original file.']
};

const bereavement: Topic = {
	weight: 0.5,
	plain: true,
	kinds: { team: 4, wait: 2 },
	slots: (r) => ({ rel: pick(r, ['father', 'mother', 'husband', 'wife', 'brother', 'sister']) }),
	subjects: ['Account of someone who has died', 'Bereavement', 'Keeping a family notebook'],
	opens: [
		"My {rel} passed away in {month}. Plover was where the family diaries were kept, and the name still appears in the notebook we share. We'd like to keep everything in it, but I don't know what happens to the account now.",
		"My {rel} died recently. We shared a Plover notebook for our household, and I'd like to keep it. The paid plan on that account ends next month."
	],
	asks: [['Would you like to keep the shared notebook exactly as it is, or have the notes moved to your own account?', 'Kept as it is, if possible. Moved to mine if not.']],
	more: ["Sorry if this isn't the right place to ask."],
	notes: ['Bereavement. Routed to profile team. Profile team, nothing to do here, but FYI.', 'Bereavement request; please handle gently.'],
	probes: ['Nothing for us to change; accounts have a process for this.', 'Nothing on the profile side. Accounts.'],
	ends: {
		team: [
			[['a', "Our accounts team has a process for this, and they'll make sure the notebook stays as it is and nothing is lost when the paid plan ends. I've passed your ticket to them with what you've told me; they'll write to you personally within a few days. Please take your time with anything they ask."], ['c', 'Thank you for being so kind about it.']]
		]
	},
	waits: ['So that we can help, we will need a copy of the death certificate or a similar document, sent to us here. There is no hurry at all: the notebook and the account will stay as they are until we hear from you.']
};

const topics: Topic[] = [theme, language, digest, name, handleTaken, handleRules, unknown, sso, merge, exportData, restore, newLanguage, rtl, digestContent, digestTime, matchDevice, contrast, school, teamsAdmin, api, billing, signinEmail, signinPhone, pronouns, nameRules, showNames, avatar, bereavement];

// Each topic's own background: what the customer adds about themselves, how support explains the feature, and
// what the profile engineers say to each other before they answer.
const background = (topic: Topic, context: string[], explain: string[], discuss: [string, string][]) => Object.assign(topic, { context, explain, discuss });
background(
	theme,
	["I've been using Plover for about two years, mostly on the phone in the evenings and on the laptop at work. Dark mode has always just worked, so this is new.", "I keep a reading journal and a work log in Plover. I set Dark in the summer and never thought about it again until the white screen started coming back."],
	['Just so you know how it works: when you choose a theme, the app saves it to your account straight away, and every device asks for your settings when it starts. So a theme that changes after a restart usually means something differs between what is saved and what is sent back.'],
	[['Is this one of the cluster from the last few weeks? Theme, language and digest all going back to the default?', 'Looks like it. Checking the history before I say so.'], ['Have we seen it on the Windows app as well as the phones?', 'A couple of times. I want to rule out the apps keeping their own copy first.']]
);
background(
	language,
	['Plover is how our family keeps everything in one place, and we have always used it in {lang}. Until recently nobody had to think about it.', 'Most of the people I share notebooks with are not comfortable reading English menus at speed, so this causes more trouble than it sounds.'],
	["For background: Plover saves the language you choose to your account, and each device asks for it when it starts. The pages you see before signing in follow the browser instead, because we don't know who you are yet."],
	[['Same family as the theme reports?', "Probably. I'll compare the times they gave us with what the apps were sent."]]
);
background(
	digest,
	["I get far too many emails as it is and I'm trying to cut down. Plover's Monday email was one of the first I turned off.", "I'm on a small mobile data plan and my phone downloads every email with its pictures, so I've been turning off everything I don't read."],
	['For context: there are two ways to stop the digest. The switch in the app saves your choice to your account, and the email system checks it before it sends. The link at the bottom of the email puts you on a separate list, which the email system also respects.'],
	[["Is the switch in the app writing false? If so, the email side must be reading something else.", "It writes false. I'll check what comes back when the email system asks for their settings."]]
);
background(
	name,
	['I use Plover for client work as well as personal notes, so my name shows up in quite a few shared notebooks.', "I'm a consultant and share notebooks with about a dozen clients, so I want them all to see the right name."],
	['To explain how names work: your display name is part of your profile, and every app asks for it when it shows you. After a change, it can take up to ten minutes for every device to show the new name.'],
	[['Ten minutes, fine. Days, not fine. Is there anywhere else that keeps a copy of the name?', 'A few places outside our service do. Going through them.']]
);
background(
	handleTaken,
	["I've been building up a small following for my drawings and I share my process notebooks publicly, so the handle is part of how people find me."],
	['For background: handles are unique, and one that belongs to another account stays with it, even if the account looks unused, unless it has been deleted for more than 30 days.'],
	[['Do we have a policy for dormant handles, or is that accounts?', 'Accounts. We only check the rules and who holds it.']]
);
background(
	handleRules,
	["I'm tidying up my accounts everywhere so they all use my real name."],
	['For context: handles have to be unique and follow a few rules, and the app checks them when you press save.'],
	[['Is the message the same for every rule it can break?', "It is, which is half the problem. One message for everything."]]
);
background(
	unknown,
	['We are a group of six researchers and the shared notebook is where we keep our interview notes, so who wrote what really matters.', 'I moved our book club\'s notebook over from Wrenbook when it shut down, and everyone joined Plover then.'],
	["To explain what we're looking at: the name shown next to a note comes from each member's profile. 'Unknown user' appears when the app asks for a member's profile and doesn't get a name back."],
	[['How many of the Wrenbook accounts came across without a profile? Do we know?', 'Not yet. Counting now.']]
);
background(
	sso,
	['A friend invited me to her recipe notebook, which is why I joined.'],
	['For background: when you sign up with {provider}, we take your name from {provider} to make your profile, unless you chose not to share it.'],
	[['Hidden-address sign-ups again?', 'Checking whether the sign-up step passed a name at all.']]
);
background(
	merge,
	["I've been meaning to sort this out for ages and finally have a quiet week."],
	["To set expectations: each account has its own notebooks, profile and settings, and we can't join two accounts into one, but we can help you move what's in one into the other."],
	[['Anything for us here?', 'No. Two accounts, two profiles. Nothing to merge on our side.']]
);
background(
	exportData,
	["I'm doing this with every service I use; it's nothing personal."],
	['For background: your profile and settings are only a small part of what Plover holds about your account. Notes, sign-in history and payments are kept elsewhere.'],
	[['Do we send them our part directly, or does privacy collect it?', 'Privacy collects it. We just make sure the export includes ours.']]
);
background(
	restore,
	["I've used Plover since my first child was born; it has everything in it from feeding times to school letters."],
	["Some reassurance while we look: a deleted account isn't removed straight away. It's kept for 30 days, so that mistakes like this can be undone."],
	[['Within the 30 days?', 'Yes, well within. The profile is still there, just marked.']]
);
background(
	newLanguage,
	['We are a small public-sector team and our policy is to use {wantlang} wherever we can.'],
	['For context: Plover is translated by a small team with help from volunteers, and new languages are chosen partly on how many people ask for them.'],
	[['Anything stopping us storing a new code?', 'Nothing. The apps would need the translations, that\'s all.']]
);
background(
	rtl,
	["I'm a teacher and write lesson notes in both languages, sometimes in the same paragraph."],
	['For background: the direction of the text in a note is set by the editor, not by your account settings.'],
	[["Any chance the language setting affects the editor's direction?", 'None. The editor decides that on its own.']]
);
background(
	digestContent,
	["I read the digest every Monday with my coffee; it's how I plan the week."],
	["To explain how it's put together: the digest lists the notes changed in the past week, in the notebooks you've chosen to include."],
	[['Is the digest switch involved at all?', "Only in whether it's sent. What's in it is the email team's."]]
);
background(
	digestTime,
	["I work from home for a UK company, which is why I'm still on UK time for some things."],
	["For background: the digest isn't sent at the same moment for everyone; it goes out on Monday morning by the clock of the country on your account."],
	[['Is the time zone stored with the settings?', 'No, with the account. Settings only have the switch.']]
);
background(
	matchDevice,
	['I use Plover in the browser at work, on a laptop that switches to dark mode at sunset.'],
	["For context: Match device means Plover follows whatever your device or browser says, light by day and dark at night if that's how it's set up."],
	[["Does the setting allow 'system' for the web as well?", "The setting doesn't care which app saves it."]]
);
background(
	contrast,
	['Reading has become harder over the last couple of years, and the apps that work best for me are the ones with strong black text.'],
	['For background: the theme in Plover is one of light, dark or match device, and each app decides the colours within it.'],
	[['Is a contrast theme something settings would need to know about?', "It would need a new value, but the colours are the apps' job."]]
);
background(
	school,
	['We use Plover for Education from Year 7 to Year 11, and the class notebooks are where homework is set.'],
	["For context: student accounts created by a school are managed by the school's admin, who can change names and other details for them."],
	[['Do we ever change managed accounts ourselves?', 'Only if education asks us to. They work through the school.']]
);
background(
	teamsAdmin,
	["We're a design studio and everyone uses Plover for project notes, so I'd rather not lose anyone's goodwill over emails."],
	["For background: the digest switch belongs to each person's own settings, and the admin console decides which of those an owner can set for the whole team."],
	[["Should we let admins change members' settings?", 'Not from our side. If anything, the admin console should set a team default.']]
);
background(
	api,
	['A few dozen people rely on it every day, so the gaps get noticed quickly.'],
	['For background: the public API allows 60 requests a minute for each token, which is meant to protect the service from runaway scripts.'],
	[['Are the lookups hitting us hard?', 'No. They never reach us once the gateway says 429.']]
);
background(
	billing,
	['I check my statement every week, which is how I noticed.'],
	['For background: support can see payments and the plan on your account, but refunds are made by our billing team.'],
	[['Anything for us?', 'No. The plan shown on the profile page comes from billing.']]
);
background(
	signinEmail,
	['I left my job at the end of last month, which is why the old address is gone.'],
	['For background: changing the sign-in address takes two steps, the change and then a confirmation, so that nobody can take over an account just by changing its address.'],
	[['Is the profile involved?', 'No. The address lives with the account, not the profile.']]
);
background(
	signinPhone,
	["The old phone was stolen, so I can't just copy things across from it."],
	['For background: an account can be created with an email address or with Sign in with Apple or Google, and it opens the same way it was made.'],
	[['Nothing for us?', 'Nothing. The profile is complete.']]
);
background(
	pronouns,
	["Our company has started adding pronouns to email signatures and video calls, and Plover is the one place they're missing."],
	["For background: the profile in Plover holds your display name and your handle, and that's all the apps show next to your notes."],
	[['Has this come up before?', "A few times. It's on the list of profile changes we'd like to make."]]
);
background(
	nameRules,
	["I'm self-employed and use Plover to share project notes with clients."],
	['For context: display names have a few rules, mostly to stop names being used for advertising.'],
	[["Is the 50-character limit ours or the apps'?", 'Ours. The apps should check the same rules before they send.']]
);
background(
	showNames,
	['We use shared notebooks for a church rota, and half the people in them use joke handles.'],
	['For context: each notebook can show its members by display name or by handle; names are the default.'],
	[['Names coming back for all of them?', 'All of them. Nothing missing on our side.']]
);
background(
	avatar,
	["I've just started a new job and wanted a proper photo on my profile."],
	['For background: profile photos are kept separately from the rest of your profile and are resized for each place they appear.'],
	[['Ours?', 'Not ours. Media stores the photos.']]
);
background(bereavement, ['We used to plan everything together in that notebook.'], ['Nothing will change in the shared notebook while this is being arranged; it will stay exactly as it is.'], []);


const makeDevice = (r: Rand, [deviceName, app]: [string, string], open: number, old = false): Device => ({
	name: deviceName,
	app,
	ver: app === 'Web' ? '-' : old ? pick(r, oldVersions) : pick(r, currentVersions),
	seen: open - int(r, 0, old ? 4 : 12) * DAY,
	say: deviceName.replace(/ \(.*\)$/, '')
});
const low = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);
/** Moves a time the support desk or the engineers write at into their working hours, 08:00 to 19:00 on weekdays. */
const working = (r: Rand, t: number) => {
	const d = at(t);
	if (d.getUTCHours() < 8) t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 8, int(r, 0, 50));
	else if (d.getUTCHours() >= 19) t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1, 8, int(r, 0, 50));
	while (at(t).getUTCDay() % 6 === 0) t += DAY;
	return t;
};

const ticket = (index: number, topic: Topic, open: number, number: number): { name: string; text: string } => {
	const r = mulberry32(0x5eed1000 + index * 7919);
	const first = pick(r, firstNames);
	const last = pick(r, surnames);
	const uid = String(int(r, 1_000_000, 4_999_999));
	const agentA = pick(r, agents);
	const agentB = r() < 0.3 ? pick(r, agents.filter((a) => a !== agentA)) : agentA;
	const engineers = shuffle(r, profileTeam);
	const available: Partial<Record<Kind, number>> = {};
	const defaults: Record<Kind, number> = { sorted: 3, owed: 3, team: 3, wait: 2 };
	for (const k of ['sorted', 'owed', 'team', 'wait'] as Kind[])
		if (k === 'wait' ? topic.waits.length : topic.ends[k as 'sorted']?.length) available[k] = topic.kinds?.[k] ?? defaults[k];
	const kind = weighted(r, available);

	// Devices, as the help desk shows them.
	const start = open + int(r, 7 * 60, open === LAST ? 11 * 60 : 21 * 60) * MIN;
	const primaryKind = topic.primary ?? (r() < 0.6 ? 'phone' : 'computer');
	const primary = makeDevice(r, primaryKind === 'android' ? pick(r, phones.filter(([, app]) => app === 'Android')) : primaryKind === 'phone' ? pick(r, phones) : pick(r, computers), open);
	primary.seen = open;
	const second = makeDevice(r, primaryKind === 'computer' ? pick(r, phones) : pick(r, computers), open);
	const devices = [primary, second];
	if (r() < 0.35) devices.push(makeDevice(r, pick(r, tablets.filter(([n]) => n !== primary.name)), open, r() < 0.3));
	let old: Device | undefined;
	for (const [deviceName, app, isOld, main] of topic.needs?.[kind] ?? []) {
		const found = devices.find((d) => d.name === deviceName);
		const device = found ?? makeDevice(r, [deviceName, app], open, isOld);
		if (main) {
			if (found) devices.splice(devices.indexOf(found), 1);
			device.seen = open;
			devices[0] = device;
		} else if (!found) devices.splice(int(r, 1, devices.length), 0, device);
		if (isOld) old = device;
	}
	const plan = topic.plans ? topic.plans(r, kind) : pick(r, plans);
	const c: Ctx = { open, first, last, uid, devices, primary: devices[0]!, second, old, plan, country: pick(r, countries) };
	const ticketMonth = at(open).getUTCMonth();
	const v: Values = {
		first,
		last,
		uid,
		agentA,
		pt: engineers[0]!.split(' ')[0]!,
		device: c.primary.say,
		device2: second.say,
		devcount: String(devices.length),
		old: old?.say ?? 'iPad',
		handle: `${first}_${last}`.toLowerCase().replace(/[^a-z_]/g, '').slice(0, 20),
		d0: dayMonth(open - int(r, 2, 6) * DAY),
		d1: dayMonth(open - int(r, 1, 9) * DAY),
		month: monthsLong[int(r, 4, ticketMonth - 1)]!,
		mon: monthsLong[ticketMonth]!,
		n0: String(int(r, 12, 140)),
		lastdev: c.primary.say
	};
	Object.assign(v, topic.slots?.(r, c, kind) ?? {});
	// A second matter from another topic, which support settles in the same ticket.
	const family = (t: Topic) => (t === handleTaken || t === handleRules ? 'handle' : t === sso ? 'provider' : t === theme || t === language || t === digest ? 'settings' : String(topics.indexOf(t)));
	const seconds = topics.filter((t) => t !== sso && !t.plans && !t.plain && !t.primary && family(t) !== family(topic) && (!t.after || open >= t.after) && (t.ends.sorted || t.ends.team));
	const others = shuffle(r, seconds);
	const two = !topic.plain && r() < 0.7 ? others.pop() : undefined;
	const three = two && r() < 0.3 ? others.find((t) => family(t) !== family(two)) : undefined;
	const kindOf = (t: Topic): 'sorted' | 'team' => (t.ends.sorted && (!t.ends.team || t.needs?.team?.some((need) => need[3]) || r() < 0.5) ? 'sorted' : 'team');
	const twoKind = two ? kindOf(two) : 'team';
	const threeKind = three ? kindOf(three) : 'team';
	for (const [t, k] of [[two, twoKind], [three, threeKind]] as const) {
		if (!t) continue;
		for (const [deviceName, app, isOld] of t.needs?.[k] ?? []) {
			let device = devices.find((d) => d.name === deviceName);
			if (!device) devices.splice(int(r, 1, devices.length), 0, (device = makeDevice(r, [deviceName, app], open, isOld)));
			if (isOld && !old) v.old = device.say;
		}
		for (const [key, value] of Object.entries(t.slots?.(r, c, k) ?? {})) v[key] ??= value;
	}
	const fill = (text: string) => text.replace(/\{(\w+)\}/g, (whole, key: string) => v[key] ?? whole);

	// The conversation, without times. `gap` is how long the message waits after the one before, in minutes.
	type Who = Role | 'q' | 'auto';
	const messages: { who: Who; text: string; agent: string; gap?: number }[] = [];
	let agent = agentA;
	let handedOver = false;
	const hi = pick(r, agentHi);
	const sign = pick(r, agentSign);
	const say = (who: Who, parts: (string | undefined | false)[], gap?: number) => messages.push({ who, text: fill(parts.filter((p): p is string => !!p).join('\n\n')), agent, gap });
	const agentSays = (parts: (string | undefined | false)[], greet = r() < 0.75, signed = r() < 0.8) => {
		const intro = !handedOver && agent !== agentA ? pick(r, handover) : undefined;
		if (intro) handedOver = true;
		say('a', [greet && hi, intro, ...parts, signed && sign.replace('{agent}', agent)]);
	};
	const customerSays = (parts: (string | undefined | false)[], gap?: number) => say('c', [r() < 0.35 && pick(r, hellos), ...parts, r() < 0.6 && pick(r, signoffs)], gap);
	const asks = shuffle(r, topic.asks);
	const more = shuffle(r, topic.more);
	const extra = topic as Topic & { context: string[]; explain: string[]; discuss: [string, string][] };
	const pool = shuffle(r, matters);
	const early = !topic.plain && r() < 0.5 ? pool.pop() : undefined;
	const later = !topic.plain && r() < 0.65 ? pool.pop() : undefined;
	const third = !topic.plain && later && r() < 0.4 ? pool.pop() : undefined;
	const twoFirst = two !== undefined && r() < 0.5;
	const twoAsks = two ? shuffle(r, two.asks) : [];
	const twoExtra = two as (Topic & { context: string[]; explain: string[] }) | undefined;

	// The customer's first message.
	customerSays([
		early ? (r() < 0.5 ? `Two things, if that's all right. First, a quick one: ${low(early.ask)}\n\nSecond, and this is the real reason I'm writing:` : `Before the main thing, a quick question. ${early.ask}`) : undefined,
		twoFirst && pick(r, two!.opens),
		twoFirst && pick(r, ['The other thing, and the one that bothers me more:', 'And the bigger problem:', 'Second, and more important:', 'The main reason I am writing, though:']),
		pick(r, topic.opens),
		r() < 0.75 && pick(r, extra.context),
		!topic.plain && r() < 0.6 && pick(r, asides),
		!topic.plain && r() < 0.25 && pick(r, asides),
		topic.fix && r() < 0.4 && `What I've tried so far:\n\n${shuffle(r, tried).slice(0, int(r, 2, 4)).map((step) => `- ${step}`).join('\n')}`,
		r() < 0.3 && more.shift(),
		r() < 0.2 && `*Attachment: ${pick(r, attachments)} (${int(r, 90, 2400)} KB)*`
	]);
	let round = asks.splice(0, r() < 0.7 ? 2 : 1);
	const twoRound = twoFirst ? twoAsks.splice(0, 1) : [];
	agentSays(
		[
			topic.plain ? pick(r, gentleThanks) : pick(r, agentThanks),
			early && early.answer,
			early && 'Now, the main thing.',
			twoRound.length > 0 && `${pick(r, ['Taking your first point first.', 'On the first thing you mention:', 'About the first question:'])} ${low(twoRound[0]![0])}`.replace(/\. ([a-z])/, (_, letter: string) => `. ${letter.toUpperCase()}`),
			twoRound.length > 0 && 'And on the other one:',
			!topic.plain && pick(r, beforeAsk),
			round.map(([q]) => q).join('\n\n')
		],
		true
	);
	customerSays([early?.follow && r() < 0.6 && early.follow[0], twoRound.length > 0 && twoRound[0]![1], round.map(([, a]) => a).join(' '), r() < 0.35 && more.shift()]);
	if (early?.follow && messages.at(-1)!.text.includes(early.follow[0])) agentSays([early.follow[1], asks.length > 0 && r() < 0.5 && `And one more question about the main issue: ${low(asks.shift()![0])}`]);
	if (asks.length && r() < 0.6) {
		round = asks.splice(0, 1);
		agentSays(['Thanks, that helps.', round[0]![0]]);
		customerSays([round[0]![1], r() < 0.3 && more.shift()]);
	}
	if (topic.logs && r() < 0.75) {
		customerSays([pick(r, sentLogs)]);
		say('n', [`${pick(r, logIntro)}\n\n${appLog(r, c, topic.logs)}`]);
	}
	const note = fill(pick(r, topic.notes));
	say('n', [/profile team/i.test(note) ? note : `${pick(r, escalatedPrefix)} ${note}`.trim()]);
	agentSays([pick(r, escalated), r() < 0.7 && pick(r, extra.explain)]);
	if (!topic.plain && r() < 0.3) {
		customerSays([pick(r, chasers)], int(r, 3, 7) * DAY / MIN);
		agent = agentB;
		agentSays([pick(r, chaserAnswers)]);
	}
	if (agent !== agentB && r() < 0.6) {
		agent = agentB;
		say('n', [`${pick(r, ['Taking this over from {agentA}.', 'Covering for {agentA} this week.'])} ${pick(r, ['Where it stands:', 'So far:'])} ${low(fill(pick(r, topic.notes)))}`]);
	}
	agent = agentB;
	const pasted = topic.paste && r() < 0.85 ? topic.paste(r, v, kind, c) : undefined;
	say('p', [`${pick(r, probeIntro)} ${fill(pick(r, topic.probes))}`.trim(), pasted && `${pick(r, pasteIntro)}\n\n${pasted}`.trim()]);
	if (extra.discuss.length && r() < 0.75) {
		const [question, answer] = pick(r, extra.discuss);
		say('q', [question]);
		say('p', [answer]);
	}
	if (two) {
		if (!twoFirst) {
			const bridge = pick(r, bridges);
			const opening = pick(r, two.opens);
			customerSays([`${bridge} ${bridge.endsWith(':') ? low(opening) : opening}`, r() < 0.5 && pick(r, twoExtra!.context)]);
			const [q, a] = twoAsks.shift() ?? ['', ''];
			agentSays([r() < 0.5 && pick(r, twoExtra!.explain), q]);
			customerSays([a]);
		} else if (twoAsks.length && r() < 0.5) {
			const [q, a] = twoAsks.shift()!;
			agentSays([`${pick(r, ['Coming back to your first question:', 'One more thing about the first point you raised:'])} ${low(q)}`]);
			customerSays([a]);
		}
		const lines = pick(r, two.ends[twoKind]!).filter(([who]) => who === 'a' || who === 'c');
		lines.forEach(([who, text], i) => {
			if (who === 'a') agentSays([i === 0 && pick(r, ['About your other question.', 'On the other matter you raised:', 'Before I forget the other thing you mentioned:', 'While the team looks at the main issue, about the other thing:']), text]);
			else customerSays([text]);
		});
	}
	if (three) {
		customerSays([`${pick(r, ['Something else has come up since I last wrote.', 'Sorry to add to this, but there is one more problem.', 'Another thing, while this is open:'])} ${pick(r, three.opens)}`]);
		const extraAsks = shuffle(r, three.asks);
		if (extraAsks.length && r() < 0.7) {
			agentSays([r() < 0.5 && pick(r, (three as Topic & { explain: string[] }).explain), extraAsks[0]![0]]);
			customerSays([extraAsks[0]![1]]);
		}
		pick(r, three.ends[threeKind]!)
			.filter(([who]) => who === 'a' || who === 'c')
			.forEach(([who, text], i) => (who === 'a' ? agentSays([i === 0 && pick(r, ['On the newer problem you mentioned:', 'About the other thing you raised:']), text]) : customerSays([text])));
	}
	if (later) {
		const bridge = pick(r, bridges);
		customerSays([`${bridge} ${bridge.endsWith(':') ? low(later.ask) : later.ask}`, third && `And while I'm at it: ${low(third.ask)}`]);
		agentSays([later.answer, third && third.answer, "I'll be back in touch about the main issue as soon as the team has news."]);
		if (later.follow && r() < 0.6) {
			customerSays([later.follow[0]]);
			agentSays([later.follow[1]]);
		}
	}
	while (asks.length && r() < 0.7) {
		round = asks.splice(0, 1);
		agentSays([pick(r, relays), round[0]![0]]);
		customerSays([round[0]![1], more.length > 0 && r() < 0.4 && more.shift()]);
	}
	if (topic.fix && r() < 0.5) {
		const [suggest, result] = pick(r, fixes);
		agentSays([suggest]);
		customerSays([result]);
	}
	if (topic.fix && kind !== 'sorted' && r() < 0.25) {
		const [better, closing, back] = pick(r, premature);
		customerSays([better]);
		agentSays([closing]);
		customerSays([back, more.length > 0 && more.shift()], int(r, 2, 6) * DAY / MIN);
	}
	if (kind === 'wait') {
		if (r() < 0.6) say('p', [pick(r, waitIntro)]);
		agentSays([pick(r, topic.waits)], true, true);
	} else {
		const ending = pick(r, topic.ends[kind as 'sorted']!);
		const lastAgent = ending.map(([who]) => who).lastIndexOf('a');
		const nextLine = r() < 0.5 && pick(r, next[kind as 'sorted']);
		ending.forEach(([who, text], i) => {
			if (who === 'a') agentSays([text, i === lastAgent && nextLine]);
			else if (who === 'c') customerSays([text]);
			else say(who, [text]);
		});
		if (!topic.plain && r() < 0.35) {
			const [ask, answer] = pick(r, closings);
			agentSays([ask], false, true);
			customerSays([answer]);
		}
	}

	// Times: each message waits for its writer, staff write in working hours, and the thread ends before the export.
	const gaps = messages.map((m, i) => {
		const prev = messages[i - 1]?.who;
		if (i === 0) return 0;
		if (m.gap !== undefined) return m.gap;
		if (m.who === 'n' || m.who === 'q') return int(r, 1, 90);
		if (m.who === 'a' && prev === 'n') return int(r, 1, 15);
		if (m.who === 'p') return prev === 'q' ? int(r, 5, 120) : int(r, 180, 4300);
		if (m.who === 'c') return int(r, 30, 2900);
		return prev === 'p' ? int(r, 20, 900) : int(r, 40, 1400);
	});
	const place = (scale: number) => {
		let t = start;
		return messages.map((m, i) => {
			t += Math.max(1, Math.round(gaps[i]! * scale)) * MIN;
			if (i > 0 && m.who !== 'c') t = working(r, t);
			return t;
		});
	};
	let times = place(1);
	for (let scale = 0.7; times.at(-1)! > CUTOFF && scale > 0.01; scale *= 0.7) times = place(scale);
	if (times.at(-1)! > CUTOFF) times = messages.map((_, i) => start + Math.round(((CUTOFF - start) * i) / messages.length));
	let lastTime = times.at(-1)!;
	if (kind === 'owed' && lastTime + 24 * DAY <= CUTOFF && r() < 0.6) {
		// A long-open promise: the customer asks again, and it is still owed.
		const asked = lastTime + int(r, 12, Math.floor((CUTOFF - lastTime) / DAY) - 10) * DAY + int(r, 0, 600) * MIN;
		messages.push({ who: 'c', text: fill(pick(r, owedChasers)), agent });
		times.push(asked);
		messages.push({ who: 'a', text: fill(`${hi}\n\n${pick(r, owedAnswers)}\n\n${sign.replace('{agent}', agent)}`), agent });
		times.push((lastTime = working(r, asked + int(r, 60, 1400) * MIN)));
	}
	if (kind === 'team' && lastTime + 12 * DAY <= CUTOFF && r() < 0.4) {
		// The customer checks that the other team has the ticket; it is still with them.
		const asked = lastTime + int(r, 5, Math.floor((CUTOFF - lastTime) / DAY) - 4) * DAY + int(r, 0, 600) * MIN;
		messages.push({ who: 'c', text: fill(pick(r, teamChasers)), agent });
		times.push(asked);
		messages.push({ who: 'a', text: fill(`${hi}\n\n${pick(r, teamAnswers)}\n\n${sign.replace('{agent}', agent)}`), agent });
		times.push((lastTime = working(r, asked + int(r, 60, 1400) * MIN)));
	}
	if (kind === 'wait' && lastTime + 10 * DAY <= CUTOFF) {
		// Nobody answered: the help desk closed it ten days after our last message.
		if (r() < 0.75) {
			messages.push({ who: 'a', text: fill(pick(r, nudges)), agent });
			times.push(working(r, lastTime + int(r, 4, 6) * DAY));
		}
		messages.push({ who: 'auto', text: pick(r, autoClose), agent });
		times.push(Date.UTC(at(lastTime).getUTCFullYear(), at(lastTime).getUTCMonth(), at(lastTime).getUTCDate() + 10, 9, 0));
	}

	const heading = (m: (typeof messages)[number], ms: number) =>
		m.who === 'c'
			? `**${first} ${last}** · ${stamp(ms)}`
			: m.who === 'a'
				? `**${m.agent}** (support) · ${stamp(ms)}`
				: m.who === 'n'
					? `**${m.agent}** (support) · internal note · ${stamp(ms)}`
					: m.who === 'p' || m.who === 'q'
						? `**${engineers[m.who === 'p' ? 0 : 1]}** (profile team) · internal note · ${stamp(ms)}`
						: `**Plover support** · automatic message · ${stamp(ms)}`;
	const body = messages.map((m, i) => `${heading(m, times[i]!)}\n\n${m.text}`);

	// The panel the help desk shows above the conversation.
	const panel = [table(['Device', 'App', 'Version', 'Last seen'], devices.map((d) => [d.name, d.app, d.ver, longDate(d.seen)]))];
	const signedUp = Date.UTC(int(r, 2019, 2025), int(r, 0, 11), int(r, 1, 28));
	const notebooks = int(r, 2, 60);
	panel.push(table(['Signed up', 'Notebooks', 'Shared with others', 'Notes', 'Storage used'], [[longDate(signedUp), String(notebooks), String(int(r, 0, Math.min(notebooks, 9))), String(notebooks * int(r, 6, 80)), `${(int(r, 2, 900) / 100).toFixed(2)} GB`]]));
	if (r() < 0.8) {
		const rows: string[][] = [];
		let t = open - int(r, 24, 40) * DAY;
		for (let i = int(r, 3, 8); i > 0; i--, t += int(r, 2, 5) * DAY) {
			const d = pick(r, devices);
			rows.push([isoMinute(t + int(r, 360, 1300) * MIN), d.name, d.app === 'Web' ? 'web' : 'app', c.country]);
		}
		panel.push(`Recent sign-ins:\n\n${table(['When (UTC)', 'Device', 'Where', 'Country'], rows)}`);
	}
	if (r() < 0.6) {
		const rows: string[][] = [];
		let t = open - int(r, 30, 60) * DAY + int(r, 400, 1300) * MIN;
		for (let i = int(r, 5, 11); i > 0; i--, t += int(r, 1, 5) * DAY + int(r, 0, 900) * MIN) rows.push([isoMinute(t), fill(pick(r, activity)).replace('{nb}', pick(r, notebookNames)).replace('{n}', String(int(r, 2, 400))).replace('{dev}', pick(r, devices).name)]);
		panel.push(`Recent activity:\n\n${table(['When (UTC)', 'Event'], rows)}`);
	}
	if (r() < 0.45) {
		const rows: string[][] = [];
		let back = int(r, 20, 120);
		for (let i = int(r, 1, 3); i > 0; i--, back += int(r, 30, 200)) rows.push([`#${number - back * 46 - int(r, 0, 40)}`, longDate(open - back * DAY), pick(r, earlierSubjects)]);
		panel.push(table(['Earlier ticket', 'Opened', 'Subject'], rows.reverse()));
	}
	const subject = fill(early && r() < 0.5 ? early.subject : twoFirst && r() < 0.6 ? pick(r, two!.subjects) : pick(r, topic.subjects));
	const text = [
		`# #${number} ${subject}`,
		`${first} ${last} · user ${uid} · ${plan} · ${c.country} · opened ${longDate(open)} at ${pad(at(start).getUTCHours())}:${pad(at(start).getUTCMinutes())} through ${pick(r, channels)}`,
		...panel,
		'## Conversation',
		...body
	].join('\n\n');
	const slug = subject.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40).replace(/-$/, '');
	return { name: `${number}-${slug}.md`, text: `${text}\n` };
};

const folder = join(root, 'docs', 'support-tickets');
mkdirSync(folder, { recursive: true });
const order = mulberry32(20260901);
const deck = topics.flatMap((topic) => Array.from({ length: Math.round(topic.weight * 2) }, () => topic));
const queue: Topic[] = [];
let shuffles = 0;
let number = 44_120;
for (let index = 0; index < ITEMS; index++) {
	const open = workdays[Math.floor((index * workdays.length) / ITEMS)]!;
	while (queue.length < deck.length) queue.push(...shuffle(mulberry32(0x7091c000 + shuffles++), deck));
	const next = queue.findIndex((topic) => !topic.after || open >= topic.after);
	const [topic] = queue.splice(next, 1);
	number += int(order, 9, 47);
	const { name: file, text } = ticket(index, topic!, open, number);
	writeFileSync(join(folder, file), text);
}
writeFileSync(
	join(folder, 'README.md'),
	`# Support tickets\n\nThe ${ITEMS} tickets that the support desk passed to the profile team between 1 September and 13 November 2026,\nexported from the help desk with their whole conversation, one file each. Internal notes are included; the\ncustomer never saw them. The export leaves out the help desk's tags, which it sets by keyword when a ticket\narrives, and its status field, which the desk does not keep up to date. Devices are as the help desk showed\nthem when the ticket was opened.\n`
);
