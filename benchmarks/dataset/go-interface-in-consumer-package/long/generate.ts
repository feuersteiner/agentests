// Writes the long material of this entry's long tasks: the help requests about member profiles that
// Larkspur Outdoor Club's membership desk handled from July to October 2026, one Markdown file each, with
// the whole thread, under docs/help-requests/. Deterministic: fixed seeds, no clock, no network.
//   bun long/generate.ts <workspace root>
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** How many help requests to write. Dates, numbers and the topic mix are all derived from it. */
const ITEMS = 340;

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
const fold = (text: string) =>
	text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ø/g, 'o').replace(/Ø/g, 'O').replace(/ł/g, 'l').replace(/Ł/g, 'L').replace(/ß/g, 'ss');
const slugOf = (text: string) => fold(text).toLowerCase().replace(/[^a-z]/g, '');

// Time. Every instant is club-local time stored as if it were UTC; summer time ended on 25 October 2026.
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MON = MONTHS.map((month) => month.slice(0, 3));
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MINUTE = 60_000;
const DAY = 1440 * MINUTE;
const FIRST = Date.UTC(2026, 6, 1, 0, 0);
const SPAN_DAYS = 123; // 1 July to 31 October
const LIMIT = Date.UTC(2026, 10, 20, 17, 0); // the export
const SUMMER_END = Date.UTC(2026, 9, 25, 2, 0);
const parts = (ms: number) => {
	const d = new Date(ms);
	return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate(), h: d.getUTCHours(), mi: d.getUTCMinutes(), s: d.getUTCSeconds(), wd: d.getUTCDay() };
};
const stamp = (ms: number) => {
	const p = parts(ms);
	return `${p.d} ${MON[p.m]} ${p.y}, ${pad(p.h)}:${pad(p.mi)}`;
};
const logTime = (ms: number) => {
	const p = parts(ms);
	return `${p.y}/${pad(p.m + 1)}/${pad(p.d)} ${pad(p.h)}:${pad(p.mi)}:${pad(p.s)}`;
};
const clf = (ms: number) => {
	const p = parts(ms);
	return `${pad(p.d)}/${MON[p.m]}/${p.y}:${pad(p.h)}:${pad(p.mi)}:${pad(p.s)} ${ms < SUMMER_END ? '+0100' : '+0000'}`;
};
const httpDate = (ms: number) => {
	const p = parts(ms < SUMMER_END ? ms - 60 * MINUTE : ms);
	return `${DAYS[p.wd]!.slice(0, 3)}, ${pad(p.d)} ${MON[p.m]} ${p.y} ${pad(p.h)}:${pad(p.mi)}:${pad(p.s)} GMT`;
};
const isoMinute = (ms: number) => {
	const p = parts(ms);
	return `${p.y}-${pad(p.m + 1)}-${pad(p.d)} ${pad(p.h)}:${pad(p.mi)}`;
};
const longDate = (ms: number) => {
	const p = parts(ms);
	return `${p.d} ${MONTHS[p.m]}`;
};
const monthOf = (ms: number) => {
	const p = parts(ms);
	return p.y < 2025 ? `${MONTHS[p.m]} ${p.y}` : p.y < 2026 ? `${MONTHS[p.m]} last year` : MONTHS[p.m]!;
};
const journalTime = (ms: number) => {
	const p = parts(ms);
	return `${MON[p.m]} ${pad(p.d)} ${pad(p.h)}:${pad(p.mi)}:${pad(p.s)}`;
};

// People.
const deskTeam = ['Maren Holt', 'Teodor Vance', 'Priyanka Sethi', 'Gwen Halloran', 'Bram Kuipers'];
const devs = ['Ana Lima', 'Joaquim Reis', 'Dele Adeyemi', 'Sunniva Brekke'];
const leaders = ['Rhiannon Pryce', 'Colm Brady', 'Ishaan Mehta', 'Bettina Kraus', 'Alasdair Munro', 'Femi Oduya', 'Claire Dunleavy', 'Tomasz Wrona'];
type TeamKey = 'web' | 'trips' | 'money' | 'news' | 'gear' | 'forum' | 'hut' | 'server';
const teams: Record<TeamKey, { name: string; role: string }> = {
	web: { name: 'Hollis Varga', role: 'website team' },
	trips: { name: 'Fintan Moss', role: 'trips committee' },
	money: { name: 'Ruth Alderman', role: 'treasurer' },
	news: { name: 'Lucía Benet', role: 'newsletter' },
	gear: { name: 'Kit Pemberton', role: 'gear library' },
	forum: { name: 'Nadia Rahman', role: 'forum moderator' },
	hut: { name: 'Gordon Aske', role: 'hut warden' },
	server: { name: 'Ewan Tulloch', role: 'club server' }
};
const firstNames = ['Ngozi', 'Hamish', 'Elodie', 'Rory', 'Ayumi', 'Gareth', 'Leonie', 'Tariq', 'Freya', 'Desmond', 'Mairi', 'Kofi', 'Imke', 'Patrick', 'Shona', 'Vikram', 'Beatriz', 'Callum', 'Hedda', 'Oluwaseun', 'Morven', 'Stellan', 'Juniper', 'Abdi', 'Ffion', 'Matthias', 'Rosa', 'Niall', 'Yusra', 'Corinne', 'Euan', 'Halima', 'Lars', 'Nell', 'Dominika', 'Cormac', 'Saoirse', 'Ibrahim', 'Tilly', 'Wendell', 'Agnieszka', 'Bryony'];
const surnames = ['Okafor', 'MacAulay', 'Garnier', 'Fitzgerald', 'Tanaka', 'Price', 'Brandt', 'Haddad', 'Lindholm', 'Achterberg', 'Sinclair', 'Mensah', 'Vogel', 'Doherty', 'Reid', 'Raman', 'Carvalho', 'Grieve', 'Solberg', 'Adebayo', 'Lennox', 'Nyberg', 'Ashworth', 'Farah', 'Llewellyn', 'Kessler', 'Moreno', 'Quinlan', 'Hassan', 'Duval', 'Ferguson', 'Abara', 'Eriksen', 'Thornbury', 'Kowalski', 'Nolan', 'Yilmaz', 'Hartley', 'Pike', 'Strachan'];
// Members whose own names a profile name cannot hold: [first, last, the profile name they typed, what is wrong with it].
const accented: [string, string, string, string][] = [
	['Zoë', 'Hartmann', 'zoë-hartmann', 'an ë in it'],
	['Siobhán', "O'Neill", "siobhan-o'neill", 'an apostrophe in it'],
	['Søren', 'Lund', 'søren-lund', 'an ø in it'],
	['José', 'Martín', 'josé-martín', 'two accented letters in it'],
	['Łukasz', 'Nowak', 'łukasz-nowak', 'a Ł at the start'],
	['Renée', 'Dubois', 'renée.dubois', 'an é and a full stop in it'],
	['Begoña', 'Ruiz', 'begoña-ruiz', 'an ñ in it'],
	['Jürgen', 'Weiß', 'jürgen-weiß', 'a ü and a ß in it'],
	['Seán', 'Mac Giolla', 'seán mac giolla', 'an accent and two spaces in it'],
	['Åsa', 'Lindgren', 'åsa-lindgren', 'an å at the start'],
	['Ngaire', "D'Arcy", "ngaire-d'arcy", 'an apostrophe in it'],
	['Chloë', 'Brontë-Hale', 'chloë-brontë-hale', 'two ë in it'],
	['Inés', 'Ferreira', 'inés_ferreira', 'an é and an underscore in it']
];
const domains = ['fernmail.example', 'postbox.example', 'quillmail.example', 'brightpost.example', 'lantern.example', 'hillside-net.example', 'uni-mail.example', 'heathmail.example'];
const trips = ['the Snowdon horseshoe walk', 'the Langdale hut weekend', "the beginners' navigation course", 'the Pentlands Sunday walk', 'the scrambling skills course', 'the sea kayaking taster', 'the Brecon Beacons camp', 'the gritstone day at Stanage', 'the Skye ridge trip', "the Hadrian's Wall walk", 'the Arran coast walk', 'the Wye canoe weekend', 'the Cairngorms bothy weekend', 'the Kinder Scout scramble'];
const gearItems = ['a 60-litre rucksack', 'a two-person tent', 'a pair of crampons', 'an ice axe', 'a trangia stove', 'a pair of trekking poles', 'a bivvy bag', 'a group shelter'];
const groups = ['Sunday walkers', 'Thursday climbers', 'paddling', 'new members', 'winter mountaineering'];

type Area = 'signup' | 'lookup' | 'change' | 'outside';
type Outcome = 'explained' | 'byhand' | 'needs' | 'passed' | 'waiting';
type Art =
	| 'signuplog' | 'curl' | 'proxy400' | 'curlspace' | 'journal' | 'diskfull' | 'shared' | 'proxyfail' | 'getlog' | 'curlpair' | 'curlcase'
	| 'getlogcase' | 'emptydir' | 'file' | 'fileother' | 'filediff' | 'namediff' | 'fileold' | 'dupes' | 'bookings' | 'grepemail' | 'curlget'
	| 'proxyok' | 'newsletter' | 'sheet' | 'emaillist' | 'backup' | 'overwrite' | 'gearsheet' | 'hutdiary' | 'signupcounts' | 'grepnone'
	| 'health' | 'getcounts' | 'nginxconf' | 'perms' | 'handedits' | 'editcounts' | 'crib' | 'nolog' | 'history';
/** One message of a thread: who writes it, the text, and an optional paste. m member, d desk to member, dl the desk again days later,
 * n desk note, nl a desk note days later, v tech volunteer note, t the topic's other team. */
type Step = [role: 'm' | 'd' | 'dl' | 'n' | 'nl' | 'v' | 't', text: string, art?: Art];
type ByOutcome<T> = T[] | Partial<Record<Outcome | 'any', T[]>>;
interface Topic {
	key: string;
	area: Area; // never written into a file
	team?: TeamKey;
	member?: 'accented';
	subjects: string[];
	opens: string[];
	asks: string[];
	details: ByOutcome<string>;
	forward: string[];
	finding: ByOutcome<[string, Art]>;
	endings: Partial<Record<Outcome, Step[][]>>;
}
const byOutcome = <T>(value: ByOutcome<T>, outcome: Outcome): T[] => (Array.isArray(value) ? value : (value[outcome] ?? value.any)!);

// Slots: {name} {first} {id} {email} the member who writes in; {badid} the profile name they typed and {flaw} what is wrong with it;
// {other...} a second member; {desk} {dev} {leader} people; {trip} {day} {when} {joinmonth} {bookmonth} {date1} (ahead) {pastdate} (behind) {time} {n} {nth} context.
const topics: Topic[] = [
	{
		key: 'id-space',
		area: 'signup',
		subjects: ["Can't join", 'Error when making my profile', 'could not save the profile??', 'Signup page broken?'],
		opens: [
			`I've been trying to finish joining online {when} and the last page keeps saying "could not save the profile". I filled in every box. I've tried on the laptop and on my phone and it's the same both times. My partner joined last month without any trouble, so I don't know what I'm doing differently.`,
			`I paid my membership on {day} and went straight to the website to set up my page so I can book {trip}, but when I press the button at the end it says it could not save the profile. Is something broken at your end? I'd like to get on the list before it fills up.`,
			`Your join page doesn't work. Third try tonight. It takes my name and email and then says "could not save the profile" with no explanation at all. Not a great first impression, if I'm honest. I'd like to be a member before {trip}.`
		],
		asks: [
			`Could you tell me exactly what you typed in each box, especially the one that asks you to choose a profile name? A screenshot is fine too.`,
			`So we can look into it, what did you put in the "profile name" box at the top of the form? It's the part that becomes the end of your page's address.`
		],
		details: [
			`Profile name: {badid}. Name: {name}. Email: {email}. I chose the profile name to match what everyone calls me. Is that the problem?`,
			`I put {badid} as the profile name, which is just my name. Then my full name and my email, {email}. I didn't see any rules about what the profile name could be.`,
			`Copied from my notes app: profile name "{badid}", name "{name}", email {email}. The page didn't complain about any box in particular, it only said could not save at the very end.`
		],
		forward: [
			`Tech volunteers, could one of you look at this? {first} has paid but can't create a profile: the form says "could not save the profile". Everything they typed is above. I wondered whether the server was struggling that evening.`,
			`Passing to the tech side. Signup fails for {first} with "could not save the profile", several tries on different devices. Is it us or the website?`
		],
		finding: [
			[`Found it. The profile name has to be lower-case letters, digits and hyphens, starting with a letter or a digit, because it becomes a file name on the server. "{badid}" has {flaw}, so profiled refuses it, and the form shows the generic message because that is all profiled sends back. Nothing is wrong with the server. From the log that evening:`, 'signuplog'],
			[`It's the profile name. profiled uses it as the file name and only accepts lower-case letters, digits and hyphens. "{badid}" has {flaw}. profiled answers with a plain server error and "could not save the profile", so the form has nothing better to show. Reproduced here:`, 'curl']
		],
		endings: {
			explained: [
				[
					['d', `Thank you for your patience. The profile name (the first box) can only contain lower-case letters, numbers and hyphens, so something like "{id}" will work where "{badid}" didn't. The name box can still have your name written however you like. Could you try once more?`],
					['m', `That worked first time, thank you! Might be worth putting that rule on the form, I'd never have guessed it.`],
					['d', `Glad you're in. I'll pass the suggestion on. Enjoy {trip}!`]
				],
				[
					['d', `Good news, nothing is broken: the profile name just can't have {flaw}. Lower-case letters, numbers and hyphens only, for example "{id}". The name box is free text, so your full name goes there.`],
					['m', `Done, my page is up at /members/{id}. Thanks for explaining, and sorry for the grumpy first email.`]
				]
			],
			needs: [
				[
					['d', `We've found the cause: the profile name can only have lower-case letters, numbers and hyphens, and "{badid}" has {flaw}. Something like "{id}" will go through.`],
					['m', `OK, it works now with {id}. For what it's worth, I'm the {nth} person in my walking group to get stuck on this, and one of them gave up and didn't bother joining.`],
					['v', `That's {n} of these since the start of the month. {first} is sorted, but the next person will hit the same wall: profiled has to tell the form what is wrong with a profile name it won't take, instead of a server error that says nothing. Noting it for the next round of work on profiled.`]
				]
			],
			waiting: [
				[
					['d', `Thanks for the details. The profile name can only have lower-case letters, numbers and hyphens, and yours has {flaw}. Could you try again with something like "{id}"?`],
					['dl', `Just checking: did a profile name like "{id}" work for you? If it's still giving you trouble, tell me the profile name you'd like and one of the tech volunteers can set it up for you.`],
					['nl', `No reply after a week. There is still no profile for {first} under any name I can think of, so they haven't tried again.`]
				]
			]
		}
	},
	{
		key: 'id-accent',
		area: 'signup',
		member: 'accented',
		subjects: ['My name is not allowed?', 'Problem joining', 'Join form error', 'Signup keeps failing'],
		opens: [
			`I tried to set up my member page this evening and the form refused to save it. I used my own name for the profile name, as the form suggests, and all I get is "could not save the profile". I've had this with airline websites and it is usually because of my name. I hope that isn't the case with a club I've just paid to join.`,
			`I've joined (paid on {day}) but I'm stuck on the last step, making the profile. Every time it says it could not save. I've checked my email is right. I don't know what else it could be. I want to sign up for {trip} with a friend who is already a member.`,
			`Your form has rejected me four times now. Same message each time: could not save the profile. I'm using a perfectly ordinary laptop and a perfectly ordinary browser, so I assume it's something on your side.`
		],
		asks: [
			`Could you send me exactly what you typed in the profile name box, letter for letter? Copying and pasting it into your reply would be ideal.`,
			`To help the tech volunteers, could you tell me what you put as your profile name, and which email address you used?`
		],
		details: [
			`I typed {badid}. Email {email}. That's how I write my name and how it is on my passport.`,
			`The profile name was "{badid}", copied from my email signature, and the email was {email}.`,
			`{badid}, all lower case as the example on the form showed. I don't see what's wrong with it.`
		],
		forward: [
			`Another one that won't save. Profile name is "{badid}". I suspect the special letters, but I don't know what's allowed, so over to the tech side.`,
			`Tech volunteers: {first} can't finish signup, "could not save the profile". Details above. Could you check what profiled made of it?`
		],
		finding: [
			[`Confirmed. Profile names can only be plain lower-case letters a to z, digits and hyphens, because each one becomes a file name on the server, and "{badid}" has {flaw}. profiled refuses it and sends back its usual "could not save the profile", which tells the member nothing. Every attempt is in the log:`, 'signuplog'],
			[`Yes, it's the profile name, which has {flaw}. profiled takes only a to z, 0 to 9 and hyphens there. The name box takes anything, so "{name}" is fine in it; it's only the profile name, which becomes the file name. Tried it locally to be sure:`, 'curl']
		],
		endings: {
			explained: [
				[
					['d', `We've found the cause. The profile name (only the first box) can contain plain letters a to z, numbers and hyphens, so the one you typed, with {flaw}, stops it saving. If you use "{id}" as the profile name and put "{name}" in the name box, your name will appear on your page spelled properly. Sorry it isn't clearer on the form.`],
					['m', `Right, that worked, and my page does show my name correctly. A word of warning on the form would have saved us both some time.`],
					['d', `Agreed, I've passed that on. Welcome to the club!`]
				],
				[
					['d', `Thank you for bearing with us. The profile name has to be plain letters, numbers and hyphens; yours has {flaw}, which is all that was wrong. Your full name, accents and all, can go in the name box.`],
					['m', `Done. /members/{id} it is. Thanks for sorting it out so quickly.`]
				]
			],
			needs: [
				[
					['d', `We've found the cause: the profile name can only have plain letters a to z, numbers and hyphens, and yours has {flaw}. With "{id}" it would save, and your name box can still say "{name}".`],
					['m', `I'd rather not, to be honest. {badid} is my name. I'll wait until the club can cope with it; there's no hurry for me, I'm not booked on anything.`],
					['v', `Fair enough, and they're not the first to say it. profiled only knows a to z for profile names; taking accented letters or apostrophes would be a change to profiled, and it needs thinking about, as those names become file names. Until then this member stays without a profile by choice.`]
				],
				[
					['d', `The profile name can only have plain letters, numbers and hyphens. Could you try "{id}"? Your name box can keep the accents.`],
					['m', `Done, thanks.`],
					['v', `Good, but the form still gives no hint. The member had no way to know what was wrong until we told them, and we only knew because we looked in the log. profiled needs to say which characters a profile name can have when it refuses one. On the list for after the release.`]
				]
			],
			waiting: [
				[
					['d', `We've found the cause: the profile name can only have plain letters, numbers and hyphens, and yours has {flaw}. Could you try once more with something like "{id}"?`],
					['dl', `I wanted to check whether the new profile name worked. If you'd rather, reply with the name you'd like and we can set it up for you.`],
					['nl', `Nothing back. No new profile under {id} either.`]
				]
			]
		}
	},
	{
		key: 'id-taken',
		area: 'signup',
		subjects: ["Someone else's name on my page", "My profile has changed and I didn't change it", 'Wrong details on my member page', 'Who is {othername}?'],
		opens: [
			`I looked at my member page this evening to send the link to {leader} and it has someone else's name on it. {othername}. I've never heard of them. My profile name is still {id} in the address bar but the name and the email are not mine. Has my account been hacked?`,
			`Something odd. The trip list for {trip} shows me as {othername}, and when I click through to my page it's the same: their name, and an email address I don't recognise. I've been a member since {joinmonth} and it was fine until recently.`,
			`My page on the website has been taken over by somebody else, or that's what it looks like. Same address as always (larkspur.example/members/{id}) but the name is {othername} and the email is an address I've never seen. I'm a bit worried about who can see what.`
		],
		asks: [
			`That's worrying, sorry. When did you last see your own details on the page, roughly? And has anyone in your household filled in the join form recently?`,
			`Thank you for flagging this so quickly. Could you tell me when you joined and the email address you signed up with? I'll get the tech volunteers to look straight away.`
		],
		details: [
			`I joined in {joinmonth} with {email}. The page was right when I booked {trip} in {bookmonth}. Nobody here has filled anything in, I live on my own.`,
			`Joined {joinmonth}, email {email}. I last checked the page maybe three weeks ago and it was fine. I haven't touched anything since.`
		],
		forward: [
			`Tech volunteers, please look at this one first. {first}'s page now shows another person's name and email. Could someone have got into their account? I don't know how the pages work behind the scenes.`,
			`Urgent-ish: profile {id} shows details that aren't the member's. Member is worried about a hack. Can someone check what's on the server?`
		],
		finding: [
			[`Not a hack. On {overdate} someone signed up with the profile name {id} and their own name and email, and profiled saved it over the existing profile instead of refusing it. The change time on the file matches that signup in the proxy log. The newcomer is a genuine new member, {othername}, who picked the same profile name by coincidence.`, 'overwrite'],
			[`I see what happened. profiled saves a signup under whatever profile name it's given, and if that name is already in use it replaces the file without a word. {othername} joined on {overdate} and chose {id}, which was already {first}'s. So nothing was stolen, it was written over. The nightly backup from the day before still has the original:`, 'backup']
		],
		endings: {
			byhand: [
				[
					['v', `Restored {id}.json from the backup of {backupdate}, and set {othername} up under {id2}, which nobody had. Both pages now show the right person. I've emailed {otherfirst} to explain why their page has a new address.`],
					['d', `Your page is back to your own details. What happened is that a new member chose the same profile name as you, and our system saved their details in place of yours. It wasn't anyone getting into your account. Sorry for the fright.`],
					['m', `Thanks, it's all back. Glad it wasn't anything sinister.`]
				]
			],
			needs: [
				[
					['v', `Restored {id}.json from the backup and moved {othername} to {id2}. Both pages are right again.`],
					['d', `Your page shows your own details again. A new member had chosen the same profile name as you, and their signup was saved over your profile. Nobody got into your account, and we've given the new member a different profile name.`],
					['m', `That's a relief. Thank you for sorting it so fast.`],
					['v', `For the record, this can happen to anyone again tomorrow: profiled will still save a signup over an existing profile. Until signup refuses a profile name that's already taken, all we can do is restore from the backup each time somebody notices. That's the {nth} one since August.`]
				]
			]
		}
	},
	{
		key: 'email-cut',
		area: 'signup',
		subjects: ['Not getting any emails', 'No trip confirmations', 'Am I on the mailing list?', 'Missed the meeting point change'],
		opens: [
			`I joined in {joinmonth} and I haven't had a single email from the club since. No newsletter, no confirmation for {trip}, nothing. Other people in my group get them. I've checked my spam folder.`,
			`{leader} says they emailed everyone about the change of meeting point for {trip}, but I never got it and turned up at the wrong car park. Thinking about it, I've never had anything from the club by email at all.`,
			`Is there a problem with my email address on your system? Friends who joined at the same time get trip reminders and I don't.`
		],
		asks: [
			`Could you tell me the email address you'd expect us to use? I'll check what we have on file.`,
			`Sorry about the car park! Which address should we be writing to?`
		],
		details: {
			any: [`It's {email}. I typed it on my phone when I joined, I think, standing in the queue at the climbing wall.`, `{email}, same as always. I filled in the form in a hurry on my phone.`],
			waiting: [`I'll check which one I used and get back to you, I have a couple of addresses. Probably {email}.`]
		},
		forward: [
			`{first} says no club emails at all since joining. Can someone check what the profile has? The newsletter list is Lucía's, but I'd like to rule out the profile first.`,
			`No emails reaching this member. Could a tech volunteer look at the address on their profile?`
		],
		finding: [
			[`The profile has "{bademail}" as the email: {cutdesc}. The join form and profiled both accepted it, so everything that takes addresses from the profiles has been sending to an address that can't exist.`, 'file'],
			[`There's the problem: {cutdesc}. The profile says "{bademail}". Nothing complained when it was saved, so the newsletter and trip emails have been going nowhere.`, 'file']
		],
		endings: {
			byhand: [
				[
					['v', `Corrected the email in {id}.json to {email}. The newsletter list takes its addresses from the profiles each week, so it'll pick this up on Monday.`, 'filediff'],
					['d', `We've found it: the email address on your profile was incomplete, so nothing could reach you. It's corrected now, and you should start getting club emails this week.`],
					['m', `Got the newsletter this morning, first one ever. Thanks!`]
				]
			],
			needs: [
				[
					['v', `Fixed this one by hand, it now has {email}.`, 'filediff'],
					['d', `The address on your profile was incomplete, which is why nothing reached you. It's corrected now.`],
					['m', `Thank you, I'd been feeling left out!`],
					['v', `The form will happily take the same kind of address from the next person, though: profiled lets through an email with nothing after the @, so this keeps happening until it checks properly. That's the {nth} one I've corrected by hand.`]
				]
			],
			waiting: [
				[
					['d', `The address on your profile is incomplete: it reads "{bademail}". Could you confirm the full address you'd like us to use? Please reply from that address if you can, so we know it reaches you.`],
					['dl', `Just a nudge on this: we still need your full email address before we can correct your profile.`],
					['nl', `No reply. Of course, if their email is broken they may never see ours. I've asked {leader} to mention it at the next walk.`]
				]
			]
		}
	},
	{
		key: 'email-space',
		area: 'signup',
		team: 'web',
		subjects: ['"valid email required" but it is valid', 'Join form says my email is wrong', 'Email not accepted'],
		opens: [
			`The join page keeps telling me "id, name and a valid email are required". I have filled in all three! My email address is perfectly valid, I've had it for fifteen years. I've tried again and the same thing happens.`,
			`I'm trying to create my profile but the form says I need a valid email. I'm using the same address I paid my membership with. Is there a list of email providers you don't accept?`,
			`The form won't take my email. I'm on my phone and it fills the address in for me, so I know there's no typo. It just says a valid email is required.`
		],
		asks: [
			`Which email address are you using, and are you on a phone or a computer? If it's a phone, does it fill the address in for you?`,
			`Could you tell me the address you're entering, and whether you type it or let your browser fill it in?`
		],
		details: [
			`It's {email}. I'm on my phone, and yes, it fills it in when I tap the box.`,
			`{email}, which the browser puts in for me. I've also typed it on the phone and that didn't work either, though now I think of it the keyboard adds a space after the address when I pick its suggestion.`,
			`On the laptop, {email}, picked from the list that pops up under the box.`
		],
		forward: [
			`This one says "valid email required" for a normal-looking address. I'm stumped. Over to you, tech folks.`,
			`{first} can't get past the email check on the join form. The address looks fine to me.`
		],
		finding: [
			[`The address arrives with a space on the end. Phones and some browsers add one when they fill in a remembered address, and profiled won't accept an email with a space anywhere in it, end included, so the member gets "id, name and a valid email are required". profiled doesn't log these refusals, but the proxy does:`, 'proxy400'],
			[`Reproduced it: the same address with a trailing space is refused, without it it's accepted. The member's browser adds the space when it fills in the box. Here's the pair:`, 'curlspace']
		],
		endings: {
			explained: [
				[
					['d', `We've found it: when your device fills in the address, it adds a space at the end, and the form doesn't accept an email with a space in it. If you delete the space after the last letter, or type the address yourself without picking the suggestion, it should go through.`],
					['m', `Ha, that was it. I'd never have spotted a space. Profile done, thank you.`]
				]
			],
			passed: [
				[
					['v', `Hollis, could the join form trim spaces off the ends of the boxes before it sends them? It's the {nth} member this month.`],
					['t', `Yes, easy enough. I'll do it in the next website update, probably next weekend.`],
					['d', `We've found the problem: your device adds a space after the address, and the form won't accept an email with a space in it. You can delete the space by hand for now, and Hollis on the website team is changing the form so it removes the space for you.`],
					['m', `Thanks. I'll try again after the weekend then.`]
				]
			],
			needs: [
				[
					['d', `It's a stray space: your browser adds one after the address, and the form refuses any email with a space in it. Delete the space and it will work.`],
					['m', `Got it, thanks, done.`],
					['v', `profiled could just trim the spaces off the ends of an email before it checks it, instead of refusing the whole signup with a message about required fields. Adding it to the list for profiled; the website team would rather we handled it once there than in every form.`]
				]
			]
		}
	},
	{
		key: 'down-evening',
		area: 'signup',
		team: 'server',
		subjects: ['Bad Gateway?', 'Website error when joining', 'Join page broken tonight', 'Error 502'],
		opens: [
			`I tried to make my profile tonight around {time} and got a white page that said "502 Bad Gateway". I tried again ten minutes later, same thing. Is the website down?`,
			`Just to let you know the join page wasn't working on {day} evening. It said Bad Gateway, and nginx at the bottom. I don't know what that means but it didn't look good.`,
			`Not sure if anyone has reported this, but the members' pages were all showing an error earlier this evening, and I couldn't finish joining either.`
		],
		asks: [
			`Thanks for letting us know. Did it work when you tried later, or is it still showing the error for you?`,
			`Sorry about that. Roughly what time was it, and have you managed to finish joining since?`
		],
		details: {
			explained: [`I tried again the next morning and got the same thing at first, then it worked about half an hour later. So I'm in now, I think. Can you check?`],
			any: [`It was about {time}. I haven't tried again since, I gave up for the night.`, `Around {time} on {day}. Tried again just now and it still says Bad Gateway.`]
		},
		forward: [
			`Was something down on {day} evening? {first} got "502 Bad Gateway" on the join page. Not sure if this is profiled or the website.`,
			`Reports of Bad Gateway on the members' pages. Can someone check whether profiled is up?`
		],
		finding: [
			[`profiled wasn't running. The server had its updates installed that evening and was rebooted, and profiled didn't come back up with it, because its service wasn't enabled after last month's move. It stayed down until I started it by hand. The website itself was fine; only the pages that ask profiled for something failed. From the journal:`, 'journal'],
			[`It was down for a while. The disk on the club server filled up with old log files that evening, and profiled stopped answering until Ewan cleared space and restarted it. Nothing was lost: every profile file is still there and the count matches the night before.`, 'diskfull']
		],
		endings: {
			explained: [
				[
					['d', `Sorry about that: the part of the website that keeps member profiles was down for part of that evening after some maintenance on the server. It's running again, and I can see your profile was saved when you tried later, so you're all set.`],
					['m', `Great, thanks for checking.`]
				],
				[
					['d', `The profile part of the website was down for a few hours that evening, after work on the server, which is why you saw that page. Your second try went through: your profile is there and you can book trips now.`],
					['m', `Thank you for checking, that's a relief.`]
				]
			],
			passed: [
				[
					['v', `Ewan, could you make sure profiled is enabled to start when the server reboots, and keep an eye on the disk? This is the {nth} time it's stayed down after maintenance.`],
					['t', `Done, it's enabled now, and I've set up a check that emails me if profiled stops answering or the disk passes 90%. Sorry, that one was mine.`],
					['d', `Thanks for reporting this. The profile part of the website was down after server maintenance, and Ewan, who looks after the server, has made sure it can't stay down like that again. It's running now, so you can try again whenever you like.`]
				]
			],
			waiting: [
				[
					['d', `Sorry about that, the profile part of the website was down for a while after server maintenance. It's running again now. Could you try once more and let me know if it works?`],
					['dl', `Just checking whether you managed to join. I can't see a profile for you yet.`],
					['nl', `Nothing back, and still no profile with {first}'s name or email.`]
				]
			]
		}
	},
	{
		key: 'family',
		area: 'signup',
		team: 'money',
		subjects: ['Profiles for my children?', 'Family membership and the website', 'Can two people share an email?'],
		opens: [
			`We've just taken out a family membership and I'd like to set up a profile for our youngest so they can be booked on the junior climbing sessions. They don't have an email address of their own. Can they use mine, or will that confuse things?`,
			`I made my own profile last week, and now my eldest wants one too for the junior sessions. We only have the one family email address. Will the site let us both use it, or do we need one each?`,
			`Can I make a profile for {kidfirst}, my fourteen-year-old? They've started coming to the Thursday climbing with me and don't have their own email.`
		],
		asks: [
			`Happy to help. What would you like the profile names to be, and is the membership in your name?`,
			`Thanks for asking first! Could you tell me which membership you're on and the names you'd like to use?`
		],
		details: [
			`The membership is in my name, {name}, family membership, paid in {joinmonth}. I'd like {kidfirst} to be {kidid} if that works. Same email as mine, {email}.`,
			`Family membership since {joinmonth}, I think. Names: {kidfirst}, and the rest of us later. Email would be mine, {email}.`
		],
		forward: [
			`Quick question for the tech side: can two profiles have the same email address? A family wants the kids' profiles on the parent's email.`,
			`Can profiled cope with several profiles sharing an email? Parent asking for their children.`
		],
		finding: [
			[`Yes, that's fine. profiled doesn't mind several profiles having the same email; each profile is its own file, named after the profile name. Plenty of households already share an address:`, 'shared'],
			[`No problem at all. Nothing in profiled requires a different email per profile; only the profile name has to be different. For example:`, 'shared']
		],
		endings: {
			explained: [
				[
					['d', `Good news: you can use your email address for {kidfirst}'s profile too. Just choose a different profile name, such as "{kidid}", and put {kidfirst}'s own name in the name box.`],
					['m', `Lovely, done, thank you. {kidfirst} is very excited to be a proper member.`]
				],
				[
					['d', `Yes, profiles can share an email address. Each one only needs its own profile name, for example "{kidid}".`],
					['m', `Perfect, that was easy. Thanks.`]
				]
			],
			passed: [
				[
					['n', `Checked the membership list before replying: {first} is on a single membership, not family, so {kidfirst} isn't covered.`, 'sheet'],
					['n', `Ruth, could you get in touch with {first} about switching to a family membership?`],
					['t', `I've emailed {first} with the difference in fee and how to switch. I'll tell the desk once it's done.`],
					['d', `Sharing your email is fine for the profiles. One thing, though: your membership is a single one in our records, so {kidfirst} isn't covered yet. Ruth, our treasurer, has emailed you about switching to a family membership.`],
					['m', `Thanks, I hadn't realised we'd bought the wrong one. I'll sort it with Ruth.`]
				]
			]
		}
	},
	{
		key: 'never-saved',
		area: 'signup',
		subjects: ["My page doesn't load", '"could not load the profile"', "Can't see my member page", "Trip leader can't find me"],
		opens: [
			`When I go to my member page it says "could not load the profile". I joined in {joinmonth} and set everything up, or I thought I did. {leader} says they can't see me on the list for {trip} either.`,
			`Is there a problem with the member pages? Mine just shows an error message. I need it working to book {trip}.`,
			`I've been trying to book {trip} and it says it can't find my profile. I made it weeks ago.`
		],
		asks: [
			`Sorry about this. What address do you use for your page, and do you remember what profile name you chose when you joined?`,
			`Could you tell me the profile name you picked when you joined, and the email address you used?`
		],
		details: [
			`I go to larkspur.example/members/{id}. I'm fairly sure that's what I chose. The email is {email}.`,
			`I think it was {badid}, or maybe {id}, I can't remember which. I filled the form in on my phone in a hurry before a walk. Email {email}.`,
			`My profile name is {id}, or at least it should be. I remember the form gave me some sort of message at the end but I assumed it was fine.`
		],
		forward: [
			`{first} says their page shows "could not load the profile". Profile name they believe is {id}. Can someone check?`,
			`Member can't load their page or book trips. Thinks they set up a profile in {joinmonth}. Over to tech.`
		],
		finding: [
			[`There is no profile for {first} at all, under {id} or anything close, and nothing with their email. The proxy log has their signup attempt, and it was refused: they typed "{badid}" as the profile name, which profiled doesn't accept, and the form showed "could not save the profile", which they took for a success. Their page says "could not load" because there is nothing to load.`, 'proxyfail'],
			[`Nothing on the server for {first}. Going back through the log, their signup was refused because the profile name was "{badid}", which has {flaw}. So they never had a profile, and every lookup since has failed:`, 'signuplog']
		],
		endings: {
			explained: [
				[
					['d', `We've found what happened. When you joined, the profile name you typed had {flaw}, which our system can't accept, so your profile was never saved, and the message at the end was an error rather than a confirmation. If you fill in the form again with a profile name of lower-case letters, numbers and hyphens, such as "{id}", it will work.`],
					['m', `Oh dear, I really did think it had worked. Done now, and the page loads. Thank you!`],
					['d', `Great. You should be able to book {trip} now.`]
				]
			],
			waiting: [
				[
					['d', `We've found it: your profile was never saved, because the profile name you typed had {flaw}, and the message at the end was an error. Could you fill in the form again with something like "{id}"?`],
					['m', `I'll do it this weekend, I'm away until then.`],
					['dl', `Just checking: did you manage to set up your profile? I still can't see it.`],
					['nl', `No profile yet and no reply.`]
				]
			],
			needs: [
				[
					['d', `Your profile was never saved: the profile name had {flaw}, which the system refuses, and the words at the end were an error, not a confirmation. Please fill in the form again with a profile name like "{id}".`],
					['m', `Done, and it loads. I'd never have known.`],
					['v', `That's the {nth} member who took the error at the end for a confirmation. As long as profiled answers a bad profile name with a server error and the same words as a real failure, the form can't tell members what to do. It should say the profile name isn't allowed, and why.`]
				]
			]
		}
	},
	{
		key: 'wrong-person-email',
		area: 'signup',
		subjects: ['Getting emails meant for someone else', 'Who is {othername}?', 'Club emails for a stranger'],
		opens: [
			`I'm getting emails from your club addressed to someone called {othername}: trip reminders, the newsletter, a kit list for {trip}. I'm not a member and I've never heard of them. Could you take my address off, please?`,
			`For the last few weeks I've had Larkspur emails meant for {othername}. I think they've given you my address by mistake. Our addresses must be similar.`,
			`Hello, I keep getting messages about {trip} that aren't for me. They start "Hi {otherfirst}". Is this a scam, or has someone typed my email wrongly?`
		],
		asks: [
			`Sorry about this, and thanks for letting us know rather than just marking us as spam. Could you tell me the address the emails are arriving at?`,
			`Apologies for the nuisance. Which address are they reaching, so we can find the profile it's on?`
		],
		details: [`They come to {email}.`, `It's {email}, which I've had for years.`],
		forward: [
			`Non-member getting emails meant for {othername}, at {email}. Did {othername} sign up with the wrong address?`,
			`Someone outside the club receives {othername}'s club emails. Could tech check which profile has {email}?`
		],
		finding: [
			[`Yes: {othername}'s profile ({otherid}) has {email}, which belongs to the person writing in. Probably a slip when they typed their own, which must be close. Here's the profile:`, 'fileother'],
			[`Found it. {otherid} has {email} as its address. profiled took it at signup, as it takes any address. The real owner of that mailbox has been getting everything since:`, 'fileother']
		],
		endings: {
			byhand: [
				[
					['n', `Asked {leader}, who led {otherfirst}'s last trip, for their real address. It's {otheremail}.`],
					['v', `Changed {otherid} to {otheremail}. No more mail to {email} from anything that reads the profiles.`],
					['d', `We've corrected the member's address, so you shouldn't get any more emails from us. Sorry for the nuisance, and thank you for telling us.`],
					['m', `Thanks, appreciated.`]
				]
			],
			waiting: [
				[
					['v', `I can blank the address, but then {othername} gets nothing from us at all. Can the desk find out their real address first?`],
					['d', `Thank you. We know whose profile it is and we're getting their correct address so we can change it. Sorry it's taking a little while.`],
					['n', `Asked {leader}, who led {otherfirst}'s last trip, to ask them for their real address when they next see them.`],
					['nl', `No word yet from {othername} or from {leader}. Profile still has the wrong address.`]
				]
			]
		}
	},
	{
		key: 'trip-leader-lookup',
		area: 'lookup',
		team: 'trips',
		subjects: ["Can't open an attendee's profile", 'Profile missing on trip list', 'Trip list shows an error for one person'],
		opens: [
			`I'm leading {trip} on {day} and I go through everyone's profile the week before to check I have their contact details. One of them, {othername}, just gives "could not load the profile" when I click through from the booking list. Everyone else's opens fine.`,
			`Quick one from a trip leader: the booking list for {trip} has {othername} on it, but their profile link is broken. I need their email to send the kit list.`,
			`I can't open the profile of one of my walkers for {trip}. The trips page shows the name, but clicking it gives an error. Is their profile missing?`
		],
		asks: [
			`Thanks, {first}. Could you tell me exactly how the profile name appears on the booking list for {othername}? If you hover over the link, the end of the address shows it.`,
			`Could you copy the link the booking list gives you for {othername} into your reply?`
		],
		details: [`The link ends in /members/{otherbad}.`, `Here it is: larkspur.example/members/{otherbad}. The others look like /members/firstname-lastname.`],
		forward: [
			`Trip leader can't open {othername}'s profile from the booking list. Link ends in {otherbad}. Profile missing, or a bad link?`,
			`Booking list link for one attendee gives "could not load the profile". Details above.`
		],
		finding: [
			[`{othername}'s profile is there, under {otherid}. The booking has "{otherbad}" instead, so profiled is asked for something else and answers with its general error. The trips system lets whoever makes the booking type the profile name by hand, and this one was typed differently. Both lookups:`, 'curlpair'],
			[`The profile exists as {otherid}. The trips system has "{otherbad}" in the booking, so the link asks profiled for a profile it can't give, and profiled says "could not load the profile" just as it would for anything else going wrong. From the log:`, 'getlog']
		],
		endings: {
			explained: [
				[
					['d', `{othername}'s profile is fine; the booking just has the profile name typed differently. Their page is at larkspur.example/members/{otherid}, and the email you need is on it.`],
					['m', `Got it, thanks. Kit list sent.`]
				]
			],
			passed: [
				[
					['v', `Fintan, could the trips system pick the profile name from a list instead of letting people type it? This is the {nth} broken link I've traced to a typed profile name.`],
					['t', `I've corrected this booking. Picking from a list is on our wish list; I'll raise it at the next committee meeting.`],
					['d', `The profile is fine, but the link was typed wrongly in the booking. Fintan on the trips committee has corrected it, so it should open now.`],
					['m', `Opens now. Thanks both.`]
				]
			],
			needs: [
				[
					['d', `The link in the booking had the profile name typed slightly wrong. The right page is larkspur.example/members/{otherid}.`],
					['m', `Perfect, thanks.`],
					['v', `profiled gives the trips system the same error for "there's no such profile" as for a real fault, so the trips page can't tell the leader the name is wrong. If profiled answered "not found" plainly, the trips team could show a proper message. One for the list after the release.`]
				]
			]
		}
	},
	{
		key: 'capital-link',
		area: 'lookup',
		team: 'web',
		subjects: ['Link to my page broken', "My profile link doesn't work for other people", 'Page error from a shared link'],
		opens: [
			`I put the link to my member page in my email signature so walking partners can find me, and two people have told me it just shows an error. When I click it myself from my bookmarks it works fine.`,
			`I shared my profile link in the {group} WhatsApp group and it doesn't work for anyone. They get "could not load the profile".`,
			`The link to my page in the welcome message I wrote for the new members' evening is broken. It's a bit embarrassing, as I'm the one welcoming people.`
		],
		asks: [`Could you paste the link exactly as it appears where people are clicking it?`, `Can you send me the link as you shared it?`],
		details: [`It's larkspur.example/members/{capid}. I typed it out myself so it looks neat.`, `Copied from the group: https://larkspur.example/members/{capid}`],
		forward: [`{first}'s shared profile link gives an error for other people, while their bookmark works. Link: /members/{capid}. Ideas?`, `Broken profile link, details above. Same person's page works from their bookmark.`],
		finding: [
			[`The shared link has capital letters, "{capid}", and profile names are always lower case. profiled treats "{capid}" as a profile name it can't accept and answers with the generic error, while "{id}" works. Their bookmark has the lower-case one. Side by side:`, 'curlcase'],
			[`Capitals. The profile is {id}; the link says {capid}. profiled doesn't ignore case in a profile name, it refuses capitals outright, and the page shows "could not load the profile". The log has a run of these from the last few days:`, 'getlogcase']
		],
		endings: {
			explained: [
				[
					['d', `The link works if it's all lower case: larkspur.example/members/{id}. The version with capitals doesn't, because profile names are always lower case. If you update it where you've shared it, it'll work for everyone.`],
					['m', `Ah! I capitalised it to make it look nicer. Changed it, and my friend says it works now.`]
				]
			],
			passed: [
				[
					['v', `Hollis, could the website lower-case the profile name in /members/ links before it asks profiled? People capitalise names when they type links out.`],
					['t', `Good idea, I'll make the page do that. Should be live by the weekend.`],
					['d', `The lower-case link works now: larkspur.example/members/{id}. The capitals were the problem, and Hollis on the website team is changing the site so that capitals in links won't matter in future.`],
					['m', `Thank you, that's helpful.`]
				]
			],
			needs: [
				[
					['d', `It's the capitals: profile names are lower case, so larkspur.example/members/{id} works and the version with capitals doesn't.`],
					['m', `Changed it everywhere, thanks.`],
					['v', `We could make profiled itself accept a profile name in any case and look up the lower-case one. As it is, every link someone types out with capitals breaks. Better done once in profiled than in each place that links to it. Noting it.`]
				]
			]
		}
	},
	{
		key: 'empty-club',
		area: 'lookup',
		subjects: ['All the trip lists are empty?', 'Nobody can find their profile', "Everyone's page is broken", 'Profiles gone'],
		opens: [
			`I don't know if it's just me, but every member page I try this morning says it can't load the profile, including mine. The booking list for {trip} shows nobody's details.`,
			`Panic stations in the {group} group: none of us can open our profiles. Has something happened to the website?`,
			`I've just tried to look up someone for {trip} and the site says the profile can't be loaded. Then I tried mine, same. Then three others. All the same.`
		],
		asks: [`Thanks for letting us know so quickly. When did you first notice it?`, `Sorry about this. Roughly what time did you try?`],
		details: [`About {mtime} this morning. It was fine yesterday evening.`, `I first noticed at {mtime}. A couple of people in the group say it was broken last night too.`],
		forward: [
			`Several reports this morning that every profile fails to load. This looks big. Tech volunteers, please look first thing.`,
			`Urgent: all member pages failing, possibly since last night.`
		],
		finding: [
			[`Found it. The server was moved to the new host last night, and profiled came up reading an empty folder: it was started from a different working directory, found no data folder there, made a new empty one and carried on, so every lookup answered "not found". The new service file sets PROFILED_DATA_DIR, as our README says, but profiled reads a different variable name, so the setting did nothing. The real profiles are all safe in /srv/profiled/data.`, 'emptydir'],
			[`Every profile is there on disk, all {count} of them, but profiled is serving from an empty folder next to wherever it was started after last night's move. The variable in the new service file is the one the README names, which profiled doesn't actually read, so it fell back to its default folder:`, 'emptydir']
		],
		endings: {
			byhand: [
				[
					['v', `Restarted profiled with the variable it does read, pointing at /srv/profiled/data. Lookups work again; I tried a dozen at random. The stray empty folder is gone, and nobody signed up into it overnight, luckily.`],
					['d', `Thanks for reporting this. A server move last night left the member pages pointing at the wrong place for a few hours. It's fixed now, and no profiles were lost.`],
					['m', `Phew. Works for me now, thanks.`]
				]
			],
			needs: [
				[
					['v', `Restarted profiled pointing at /srv/profiled/data, using the variable name it reads. Lookups are back.`],
					['d', `Thank you for telling us. The member pages were pointing at the wrong place for a few hours after a server move. It's fixed, and nothing was lost.`],
					['v', `To be clear, the same thing will happen at the next move: whoever sets it up will follow the README, and profiled will ignore the setting again. profiled should read the variable the README names. On the list for the release.`]
				]
			]
		}
	},
	{
		key: 'data-copy',
		area: 'lookup',
		subjects: ['What data do you hold about me?', 'Request for my personal data', 'Subject access request'],
		opens: [
			`Under data protection law I'd like a copy of all the personal data the club holds about me. I joined in {joinmonth}. Please confirm receipt.`,
			`Out of curiosity more than anything: what does my member profile actually store? I've had so many data breach emails from other places this year that I've started asking.`,
			`Could you tell me what information is kept on my profile and who can see it? I'm deciding whether to stay on the website.`
		],
		asks: [
			`Of course. So I can be sure I'm sending it to the right person, could you confirm your profile name and reply from the email address you joined with?`,
			`Happy to. Which profile name is yours, so I can ask the tech volunteers for it?`
		],
		details: {
			any: [`My profile name is {id} and I'm writing from {email}, which is the one I joined with.`, `It's {id}. This is the address I signed up with.`],
			waiting: [`It's {id}. I'm writing from my work address, as I can't get into the old one at the moment.`]
		},
		forward: [`Data request from {first}. Could a tech volunteer send me exactly what profiled holds for {id}? Membership records are Ruth's, I'll ask her separately.`, `Personal data request for profile {id}. What does profiled keep?`],
		finding: [
			[`profiled holds three things for {first}: the profile name, the name and the email. Nothing else, no history, no logins. The whole file:`, 'file'],
			[`Here is everything profiled keeps for {id}, which is one small file. Its log has no successful requests in it, only failed ones, and there are none for this profile.`, 'file']
		],
		endings: {
			explained: [
				[
					['d', `Here's everything our profile system holds for you: your profile name ({id}), your name as you entered it ({name}) and your email address ({email}). That's all; it keeps no history or other details. Your membership and payment records are held separately by our treasurer, Ruth, who has your request too.`],
					['m', `Thank you, that's reassuring, and quicker than most companies manage.`]
				]
			],
			waiting: [
				[
					['d', `Before we send it, could you reply from the email address on your profile? The address you wrote from isn't the one we have, and we need to be sure the data goes to you.`],
					['dl', `Just a reminder that we're waiting for a reply from your registered address before we can send your data.`],
					['nl', `Nothing from the registered address yet. Data ready to send when it comes.`]
				]
			]
		}
	},
	{
		key: 'leader-list',
		area: 'lookup',
		team: 'trips',
		subjects: ['Contact details for my walkers', 'All the emails for a trip?', 'List of profiles for a trip'],
		opens: [
			`I'm leading {trip} and want to email everyone a kit list. Is there a way to get all their emails at once instead of opening each profile in turn?`,
			`New trip leader here. For {trip} I have {n2} people booked and I've been copying their emails one profile at a time. Surely there's a better way?`
		],
		asks: [`How many people are on the trip, and when is it?`, `Which trip date is it for, and how many are booked?`],
		details: [`{n2} people, {trip} on {date1}.`, `It's {trip}, {date1}. {n2} booked at the moment.`],
		forward: [`Trip leader wants all the emails for their trip at once. Can profiled give a list?`, `Can we get a leader the emails of everyone on a trip in one go?`],
		finding: [
			[`profiled looks up one profile at a time; there's no list. I can pull them by hand from the profile names on the booking:`, 'emaillist'],
			[`No list in profiled, one profile per request. For this trip I've collected them by hand:`, 'emaillist']
		],
		endings: {
			byhand: [
				[
					['v', `Sent {first} the addresses directly.`],
					['d', `One of our tech volunteers has emailed you the list of addresses for {trip}.`],
					['m', `Thanks! That saved me half an hour.`]
				]
			],
			passed: [
				[
					['n', `Fintan, do leaders have a way to download their attendee list?`],
					['t', `Yes, with emails: Download list, at the bottom of the trip page, leaders only. I'll send {first} a screenshot.`],
					['d', `Fintan on the trips committee says leaders can download the attendee list, emails included, from the bottom of the trip page. He's sending you a screenshot of where.`],
					['m', `Found it. Never noticed that button!`]
				]
			],
			needs: [
				[
					['v', `Sent this list by hand. We get one of these before most big trips. If profiled could return several profiles at once, the trips page could offer it to leaders directly. Noting it.`],
					['d', `We've emailed you the addresses for this trip. For future trips, we're looking at a way for leaders to get them without asking.`],
					['m', `Thank you.`]
				]
			]
		}
	},
	{
		key: 'old-link',
		area: 'lookup',
		team: 'web',
		subjects: ['Old member page link', 'Link from the old site', 'Bookmark stopped working'],
		opens: [
			`I had my member page bookmarked from the old website and it doesn't work any more. Has my page moved?`,
			`There are links to members' pages all over the old trip reports on the forum, and none of them work. I wanted to look up someone from a trip in 2023.`
		],
		asks: [`Could you send me one of the links that doesn't work?`, `Which link are you using?`],
		details: [`larkspur.example/member.php?id={memberno}`, `The one in my bookmarks is larkspur.example/member.php?id={memberno}.`],
		forward: [`Old-style member links (member.php?id=...) don't work. Is that profiled or the website?`, `Old member page links from before the move are dead. Details above.`],
		finding: [
			[`Not profiled: those are the old site's addresses, from before profiles had profile names. profiled only knows profile names, and {id} is fine:`, 'curlget'],
			[`profiled never saw these: member.php was the old site, and its numbers aren't profile names. The profile itself is there:`, 'curlget']
		],
		endings: {
			passed: [
				[
					['n', `Hollis, old member.php links: could the website send them to the new pages?`],
					['t', `I have the old numbers and the profile names from the import, so I can redirect them. Give me a couple of weeks.`],
					['d', `Your page is now at larkspur.example/members/{id}. Hollis on the website team is setting up the old links to forward to the new pages.`],
					['m', `Thanks, I've updated my bookmark.`]
				]
			],
			explained: [
				[
					['d', `Member pages moved when the new website went live. Yours is now at larkspur.example/members/{id}. The old links won't work any more, sorry.`],
					['m', `Thanks, updated.`]
				]
			]
		}
	},
	{
		key: 'change-email',
		area: 'change',
		subjects: ['New email address', 'Change of email', 'Please update my email', 'Old work address on my profile'],
		opens: [
			`I'm leaving my job at the end of the month and my profile has my work email on it. Could you change it to {newemail}? I couldn't find a way to do it myself on the website.`,
			`My old email provider is closing down, so could you update the address on my member profile to {newemail}, please? There doesn't seem to be an edit button.`,
			`How do I change my email address? The member page shows it but I can't edit it anywhere.`
		],
		asks: [
			`Of course. There isn't a way for members to change it themselves yet, so we'll do it for you. Could you confirm your profile name and the address currently on it?`,
			`Happy to. Just so we change the right profile, what's your profile name? And if possible reply from the old address, so we know it's you.`
		],
		details: {
			any: [`Profile name {id}. The old address is {email}, and I'm replying from it now. New one is {newemail}.`, `{id}. Old address {email}, new one {newemail}.`],
			waiting: [`My profile name is {id}. I can't get into the old address any more, the company switched it off last week. The new one is {newemail}.`]
		},
		forward: [`Email change for {id}, to {newemail}. Could someone with server access do it?`, `Another email change, details above.`],
		finding: [
			[`Current file below. profiled has no way to change a profile except by editing the file on the server, so I'll do that once the desk is happy it's the member asking.`, 'file'],
			[`Here's what's there now. There's nothing in profiled for changing a profile; the only way is to edit the file by hand on the server.`, 'file']
		],
		endings: {
			byhand: [
				[
					['v', `Done: {id}.json now has {newemail}.`, 'filediff'],
					['d', `Your email address is now {newemail}. Club emails will go there from now on.`],
					['m', `Brilliant, thanks for doing that so quickly.`]
				]
			],
			waiting: [
				[
					['n', `As the request didn't come from the old address and the member can't reach it, I'd like some other confirmation before we change anything. I'll ask for their membership number and the month they joined.`],
					['d', `Before we change your email, we need to check it's you. Could you tell me your membership number (it's on your card) and roughly when you joined?`],
					['dl', `Just a reminder that we need your membership number before we can update your email.`]
				]
			],
			needs: [
				[
					['v', `Done by hand, {id} now has {newemail}.`, 'filediff'],
					['d', `Done, your email is now {newemail}.`],
					['v', `That's the {nth} email change this month, every one done by editing files on the server. Members ought to be able to change their own email through profiled, or at least the desk should be able to without one of us logging in.`]
				]
			]
		}
	},
	{
		key: 'change-name',
		area: 'change',
		subjects: ['Name change', 'Update my surname', 'Spelling of my name', 'Preferred name'],
		opens: [
			`I got married in {bookmonth} and I'm now {newname}. Could my profile be updated? My email stays the same.`,
			`My profile still has my old surname. I've been {newname} since the spring and I'd like the trip lists to match. Can it be changed?`,
			`I've gone back to my birth name, {newname}. Could my profile be changed to match? Everything else stays the same.`
		],
		asks: [`Of course. What's your profile name, so we change the right one?`, `Certainly. Could you confirm your profile name?`],
		details: [`It's {id}.`, `Profile name {id}, email {email}.`],
		forward: [`Name change for {id}: to {newname}.`, `Can someone update the name on {id} to {newname}?`],
		finding: [
			[`Current file. No way to change it through profiled, so it's a hand edit on the server.`, 'file'],
			[`Here it is as it stands. Changing it means editing the file.`, 'file']
		],
		endings: {
			byhand: [
				[
					['v', `Changed: the name is now {newname}.`, 'namediff'],
					['d', `Done, your profile now shows {newname}. Bookings you make from now on will use it too.`],
					['m', `Thank you so much.`]
				]
			],
			explained: [
				[
					['n', `{dev} says there's a way that doesn't need anyone on the server: if the member fills in the join form again with exactly the same profile name and email and the new name, it replaces the old profile.`],
					['d', `You can do this yourself: fill in the join form again with the same profile name ({id}), the same email, and your new name, and it will replace your old details. Let me know if it gives you any trouble.`],
					['m', `Done, and my page shows {newname} now. Thanks!`]
				]
			],
			needs: [
				[
					['v', `Changed by hand.`, 'namediff'],
					['d', `Your profile now shows {newname}.`],
					['v', `Fine for now, but every name change is one of us logging into the server. If profiled could update a profile, the desk could do these themselves. Adding it to the list.`]
				]
			]
		}
	},
	{
		key: 'delete-leaving',
		area: 'change',
		team: 'money',
		subjects: ['Please delete my profile', 'Leaving the club', 'Remove my details', 'Cancel everything'],
		opens: [
			`I'm moving abroad next month and won't be renewing. Please delete my member profile and any details you hold. Thank you for many good walks.`,
			`Please remove me from the website. I don't want my details online any more.`,
			`I'd like to leave the club and have all my data removed. Can you confirm when it's done?`
		],
		asks: [
			`Sorry to see you go. Could you confirm your profile name, and that you'd like your profile removed completely, not just your membership ended?`,
			`We'll miss you. To make sure we remove the right profile, could you reply from the email address on it and confirm the profile name?`
		],
		details: {
			any: [`Profile name {id}. Yes, completely please.`, `It's {id}, and I'm writing from {email}. Remove all of it, please.`],
			passed: [`It's {id}. Actually, now that you ask, what I really want is for the direct debit to stop: it went out again on the 1st. I don't mind the profile staying if I come back next year.`],
			waiting: [`Profile {id}. I'm on my partner's email at the moment, mine's playing up.`]
		},
		forward: [`Removal request for {id}. Tech volunteers, could one of you take care of it once we've confirmed it's them?`, `Member leaving, profile {id}. Details above.`],
		finding: {
			any: [[`Here's the profile before anything happens to it. profiled has no delete, so removing a profile means removing the file on the server and checking the trips system doesn't still link to it.`, 'file']],
			passed: [[`Nothing for profiled here, then: the profile is fine and they want to keep it. For the record:`, 'file']]
		},
		endings: {
			byhand: [
				[
					['v', `Removed {id}.json from the data folder; the nightly backups roll it off within 30 days. The page now says it can't load the profile, as expected.`],
					['d', `Your profile has been deleted. Backups that still contain it are cleared automatically within 30 days. Thank you for being a member, and good luck with everything.`],
					['m', `Thank you, and thanks to everyone on the walks.`]
				]
			],
			waiting: [
				[
					['d', `We need to be sure the request comes from you before we delete anything. Could you reply from {email}, the address on your profile?`],
					['dl', `Just a reminder: we'll remove your profile as soon as we hear from {email}.`],
					['nl', `No reply from the address on the profile. Nothing removed.`]
				]
			],
			passed: [
				[
					['n', `Ruth, {first} wants their direct debit stopped; membership lapses at renewal. The profile stays.`],
					['t', `Cancelled the mandate; there'll be no further collections. I've emailed {first} to confirm.`],
					['d', `Ruth, our treasurer, has cancelled your direct debit, and your profile stays as it is in case you come back. Hope to see you again!`],
					['m', `Perfect, that's all I wanted. Thanks.`]
				]
			]
		}
	},
	{
		key: 'bereavement',
		area: 'change',
		team: 'money',
		subjects: ['My father', 'Membership of my late mother', 'Sad news', 'Closing a member account'],
		opens: [
			`I'm writing to let you know that my partner, {othername}, died on {pastdate}. {otherfirst} walked with the club for many years and loved the Sunday walks. I'd be grateful if their details could be removed, and if any membership fee could be stopped.`,
			`{othername} passed away last month. I'm their next of kin, and club emails addressed to them keep arriving, which is hard. Could you please take them off everything?`,
			`This is a difficult email to write on behalf of my family. {othername} was a member of Larkspur for over twenty years and died in {bookmonth}. Could you close the membership and remove the page from the website?`
		],
		asks: [
			`I'm very sorry for your loss, and thank you for letting us know. Could you tell me the email address they used with the club, so I can find all of their records?`,
			`Please accept our condolences. To make sure we find everything, do you know the email address they used with us?`
		],
		details: [`It was {otheremail}.`, `I think it was {otheremail}. I'm looking after their emails now.`],
		forward: [
			`Bereavement: {othername}, email {otheremail}. Family asks for the profile to be removed and fees stopped. Could tech remove the profile? I'll handle the replies.`,
			`Sad one. Please remove the profile for {othername} ({otheremail}). I'll speak to Ruth about the fees.`
		],
		finding: [[`Found the profile, {otherid}. Copy below for the record before it goes.`, 'fileother']],
		endings: {
			byhand: [
				[
					['v', `Removed {otherid}. The newsletter list takes its addresses from the profiles each week, so the emails stop after Monday's run.`],
					['d', `I've removed {otherfirst}'s profile, and the club emails will stop within the week. Thank you again for telling us, and I'm so sorry for your loss.`],
					['m', `Thank you for being so kind about it.`]
				]
			],
			passed: [
				[
					['v', `Removed the profile.`],
					['n', `Ruth, could you stop {othername}'s direct debit and refund anything taken after {pastdate}?`],
					['t', `Done. A refund of {amount} goes back to the account in three to five days. I've written to the family.`],
					['d', `We've removed {otherfirst}'s page, and Ruth, our treasurer, has stopped the payments and is refunding {amount}. Please don't hesitate to write if anything else arrives.`],
					['m', `Thank you all.`]
				]
			]
		}
	},
	{
		key: 'rename-id',
		area: 'change',
		subjects: ['Change my profile name?', 'Embarrassing profile name', 'Can I change my page address?'],
		opens: [
			`When I joined I chose {oldid} as my profile name as a joke and now it's on every trip list. Can it be changed to something sensible like {wantid}?`,
			`Is it possible to change my profile name? I picked {oldid} without thinking and it's in the address of my page.`,
			`My page address has my old name in it ({oldid}). Could it become {wantid}?`
		],
		asks: [`We can look into it. Just to check, it's the profile name ({oldid}) you'd like changed, not the name shown on the page?`],
		details: [`Yes, the profile name, the bit in the address. {wantid} would be perfect, if it's free.`, `Exactly, the address part. My name on the page is fine.`],
		forward: [`Member wants their profile name changed from {oldid} to {wantid}. Can that be done?`],
		finding: [
			[`{wantid} is free. Changing a profile name means renaming the file and changing the profile name inside it, and any trip bookings that point at {oldid} would break, so the trips committee would need to update theirs too.`, 'fileold'],
			[`Possible by hand: profiled has no rename, so I'd create {wantid}.json with the same details and remove {oldid}.json. The trips system has {n} bookings pointing at the old one.`, 'fileold']
		],
		endings: {
			byhand: [
				[
					['v', `Renamed {oldid} to {wantid} and asked Fintan to update the bookings, which he has.`],
					['d', `Your profile name is now {wantid}, and your page is at larkspur.example/members/{wantid}. Existing bookings have been updated too.`],
					['m', `Thank you! Much better.`]
				]
			],
			needs: [
				[
					['v', `I'd rather not do this by hand while the trips system copies profile names into bookings: the last rename left two broken links that took weeks to notice. Renaming needs proper support in profiled before we offer it.`],
					['d', `I'm sorry, we can't change profile names at the moment without breaking your trip bookings. It's on the list for a future update.`],
					['m', `Shame, but understood.`]
				]
			],
			explained: [
				[
					['d', `Changing the profile name isn't something we can offer right now, but the name shown on your page and on trip lists can be anything you like, which may be what matters most. If you'd like that changed, tell me what it should be.`],
					['m', `Oh, if people see the name rather than the address, that's fine. Leave it as it is then. Thanks.`]
				]
			]
		}
	},
	{
		key: 'duplicate',
		area: 'change',
		subjects: ['Two profiles?', 'I think I signed up twice', 'Duplicate account'],
		opens: [
			`I think I've got two profiles. I joined at the club stall at the outdoor show on my phone and then again at home because I wasn't sure the first one worked. Now the trip list shows me twice.`,
			`{leader} mentioned I'm on the {trip} list under two different names. I must have made two profiles. Can one be removed?`
		],
		asks: [`Easily done. Do you know the two profile names, and which one you'd like to keep?`],
		details: {
			any: [`{id} and {id2}. Keep {id}, please, that's the one my bookings are under.`],
			waiting: [`I'm not sure which ones. One is probably {id}. I don't mind which you keep.`]
		},
		forward: [`Duplicate profiles for {first}. Details above.`],
		finding: [[`Both exist, same email:`, 'dupes']],
		endings: {
			byhand: [
				[
					['v', `Removed {id2}.json. No bookings pointed at it.`],
					['d', `Done, you now have just the one profile, {id}.`],
					['m', `Thanks!`]
				]
			],
			waiting: [
				[
					['v', `Both exist (above). One has a booking for {trip}, the other has none. I'd rather the member chose.`],
					['d', `We found two profiles: {id} and {id2}. Which would you like to keep? The one we remove can't be recovered.`],
					['dl', `Just checking which profile you'd like us to keep.`],
					['nl', `No reply yet; both still there.`]
				]
			]
		}
	},
	{
		key: 'phone-field',
		area: 'change',
		team: 'trips',
		subjects: ['Add my phone number?', 'Emergency contact', 'More details on my profile'],
		opens: [
			`Is there a way to add a phone number to my profile? Trip leaders keep having to message the group to get my number.`,
			`I'd feel better if my profile had an emergency contact on it. If something happened on a walk, how would anyone know who to ring?`,
			`Could profiles have a bit more on them? A phone number at least, and perhaps the kind of trips we're interested in.`
		],
		asks: [`Thanks for the suggestion. Could you tell me a bit about when you've needed this?`, `Good question. Is this for trips you've booked, or more generally?`],
		details: [`On {trip} the leader had to ask the whole group for my number because we were meeting at a different car park.`, `Mainly trips. I went on {trip} and realised nobody had any details for me except my email.`],
		forward: [`Member asking for a phone number or emergency contact on profiles. Do we hold that anywhere?`],
		finding: [
			[`profiled only has the profile name, name and email; there's nowhere to put a phone number. The trips booking form does ask for an emergency contact and a phone number for each trip, and keeps them with the booking.`, 'file'],
			[`Nothing for it in profiled: a profile is three fields. The trips committee collects phone numbers on the booking form, per trip.`, 'file']
		],
		endings: {
			passed: [
				[
					['n', `Fintan, could you make sure leaders know the booking form has the phone and emergency contact? Member says their leader didn't.`],
					['t', `They should be on every leader's list. I'll remind the leaders at the next meeting and check the list for {trip}.`],
					['d', `Phone numbers and emergency contacts are collected on each trip's booking form and given to the leader. I've asked Fintan to remind leaders where to find them.`],
					['m', `Ah, I didn't realise. Thanks.`]
				]
			],
			needs: [
				[
					['v', `A phone number on profiles would be a change to profiled: a new field, and the join form would need a box. Worth discussing after the release; noting it.`],
					['d', `At the moment profiles can only hold your name and email. A phone number would need a change to the system, which our tech volunteers have noted for a future update.`],
					['m', `OK, thanks for considering it.`]
				]
			]
		}
	},
	{
		key: 'photo',
		area: 'change',
		team: 'forum',
		subjects: ['Profile picture', 'Can I add a photo?', 'Photo on my page'],
		opens: [
			`Lots of club members have a photo next to their name. Can I put one on my member page too? It would help people recognise me at the meeting point.`,
			`How do I upload a photo to my profile? I've looked everywhere.`
		],
		asks: [`Could you tell me where you've seen photos next to members' names?`],
		details: [`On the forum, people have pictures. I assumed it was the same account.`, `A friend's page had a photo, or I thought it did; maybe that was the forum too.`],
		forward: [`Member wants a profile photo. I think they're thinking of the forum, but is there any photo on profiles?`],
		finding: [[`profiled doesn't store photos; a profile is the profile name, name and email. The photos they've seen are forum pictures, which belong to a separate forum account.`, 'file']],
		endings: {
			explained: [
				[
					['d', `The member pages don't have photos, but the forum does: you set your picture in your forum account under Settings. It's separate from your member page.`],
					['m', `Ah, that's where I saw them. Found it, thanks.`]
				]
			],
			passed: [
				[
					['n', `Nadia, {first} wants to set a forum picture and can't find where.`],
					['t', `Replied with the steps. New forum accounts can't upload a picture until they've made a few posts, which is probably what they hit.`],
					['d', `Photos are set on the forum, not your member page. Nadia, one of the forum moderators, has emailed you the steps.`],
					['m', `Thank you both.`]
				]
			],
			needs: [
				[
					['v', `Photos on member pages would be a real change to profiled, which keeps three fields and nothing else. Members ask for this every few weeks. Noting it.`],
					['d', `Member pages can't show photos yet; our tech volunteers have it on their list of requests.`],
					['m', `Fair enough.`]
				]
			]
		}
	},
	{
		key: 'login',
		area: 'outside',
		team: 'web',
		subjects: ["Can't log in", 'Password not working', 'Locked out of my profile'],
		opens: [
			`I can't log in to see my profile. It says my password is wrong, and the reset email never arrives.`,
			`How do I log in to my member page? I've forgotten my password and the website just goes round in circles.`,
			`Locked out again. I'd like to check my bookings and my profile, and it keeps saying incorrect email or password.`
		],
		asks: [`Sorry about that. Which page are you trying to log in on, and what does it say exactly?`],
		details: [`The members' area on the website, the Log in button at the top. It says incorrect email or password.`, `The members' area. The reset link email has never arrived; I've checked spam.`],
		forward: [`{first} can't log in and the password reset isn't arriving. Is that us or the website?`],
		finding: [
			[`Not profiled: profiled has no passwords or logins at all. The member's profile is fine. Logins to the members' area are the website's own accounts, which Hollis looks after.`, 'file'],
			[`profiled has no logins; the profile is there and unchanged. The members' area login is the website's:`, 'curlget']
		],
		endings: {
			passed: [
				[
					['n', `Hollis, {first} can't log in to the members' area and the reset email isn't arriving.`],
					['t', `The reset emails were going to spam with some providers last week; fixed now. I've sent {first} a new link by hand.`],
					['d', `Logins are run by the website, and Hollis on the website team has sent you a fresh reset link.`],
					['m', `Got it, I'm in. Thanks!`]
				]
			],
			explained: [
				[
					['d', `Logins are handled by the website's members' area. The reset email can take up to 15 minutes, and sometimes lands in spam or promotions. Could you check there?`],
					['m', `Found it in promotions. All sorted, thank you.`]
				]
			]
		}
	},
	{
		key: 'booking',
		area: 'outside',
		team: 'trips',
		subjects: ['Not on the trip list', 'My booking disappeared', 'Booked but not confirmed'],
		opens: [
			`I booked {trip} two weeks ago and paid, but I'm not on the list. Is my profile the problem? Someone said the list comes from the profiles.`,
			`The trip page says {trip} is full and I'm not on it, but I'm sure I booked before it filled.`
		],
		asks: [`Sorry for the worry. When did you book, and did you get a confirmation email?`],
		details: [`I booked on {pastdate} and got an email saying "request received", but no confirmation since.`, `I booked in {bookmonth}. I have a receipt for the payment.`],
		forward: [`{first} booked {trip} but isn't on the list. Before I send it to Fintan, is there anything wrong with the profile?`],
		finding: [
			[`Profile is fine and loads normally. Bookings are the trips system's, not profiled's; nothing in profiled knows about trips.`, 'curlget'],
			[`Nothing wrong on our side: the profile is there, and every request for it in the proxy log got an answer.`, 'proxyok']
		],
		endings: {
			passed: [
				[
					['n', `Fintan, could you look at {first}'s booking for {trip}?`],
					['t', `Found it: the booking was waiting for a leader to approve, as {trip} needs some experience. Approved now.`],
					['d', `Fintan from the trips committee found your booking: it was waiting for the leader's approval, which it now has. You're on the list.`],
					['m', `Brilliant, thank you.`]
				],
				[
					['n', `Fintan, booking for {trip} missing for {first}.`],
					['t', `The payment went through but the booking form timed out before saving. I've added {first} by hand; there was one place left.`],
					['d', `Fintan on the trips committee found that your payment arrived but the booking didn't save. He's added you to {trip}.`],
					['m', `Phew. Thank you!`]
				]
			]
		}
	},
	{
		key: 'fees',
		area: 'outside',
		team: 'money',
		subjects: ['Charged twice', 'Membership renewal', 'Direct debit query', 'Refund?'],
		opens: [
			`I've been charged {amount} twice for my membership this month. I only have one profile, so I don't understand how.`,
			`I think I signed up twice by mistake, and I've definitely paid twice. Could you check?`,
			`My bank statement shows two payments to the club this month. Have I paid for something twice? I wondered if it's because of my profile.`
		],
		asks: [`Sorry about that. Could you tell me the dates and amounts of the payments?`],
		details: [`Both {amount}, on the 1st and the 3rd.`, `Two payments of {amount}, on {pastdate} and two days later.`],
		forward: [`Payment query from {first}. Probably Ruth's, but did they end up with two profiles?`],
		finding: [
			[`One profile only, so it isn't a double signup:`, 'grepemail'],
			[`profiled has nothing to do with payments, and there's just the one profile for this email:`, 'grepemail']
		],
		endings: {
			passed: [
				[
					['n', `Ruth, payment query for {first}, {amount}.`],
					['t', `Refund issued: it was a duplicate mandate from when we changed bank. I've written to {first}.`],
					['d', `Ruth, our treasurer, found a duplicate payment from when the club changed bank and has refunded it. Your profile and membership are both fine.`],
					['m', `Thanks for sorting that.`]
				],
				[
					['n', `Ruth, {first} thinks they've paid twice.`],
					['t', `Only one is membership. The other is the deposit for the hut weekend they booked, which goes out under the same name on the statement. I've written to {first} to explain.`],
					['d', `Ruth, our treasurer, has checked: one payment is your membership and the other is your hut deposit, which shows under the club's name on bank statements. Your profile has nothing to do with payments either way.`],
					['m', `Of course, the hut! Sorry, and thank you.`]
				]
			]
		}
	},
	{
		key: 'newsletter',
		area: 'outside',
		team: 'news',
		subjects: ['No newsletter', 'Newsletter going to old address', 'Newsletter stopped'],
		opens: [
			`I stopped getting the monthly newsletter in {bookmonth}. I haven't unsubscribed, and my profile looks right.`,
			`The newsletter still comes to my old address, even though you changed my profile to the new one in {bookmonth}.`,
			`I've not had a newsletter for months. Have I been taken off the list?`
		],
		asks: [`Which address should it go to, and which (if any) does it arrive at?`],
		details: [`My profile has {email}, and that's where I want it.`, `It should come to {email}. It used to.`],
		forward: [`Newsletter not arriving for {first}. Is the profile email right?`],
		finding: [[`The profile has the right address, {email}:`, 'file']],
		endings: {
			passed: [
				[
					['n', `Lucía, could you look at the newsletter list for {email}?`],
					['t', `Their address was marked as bouncing after their mailbox filled up in {bookmonth}, so it was skipped. I've cleared the flag.`, 'newsletter'],
					['d', `Your profile was fine. Lucía, who sends the newsletter, found your address had been paused after some bounced emails, and has switched it back on.`],
					['m', `Came through today, thanks.`]
				]
			],
			explained: [
				[
					['d', `Your address is correct on your profile. The newsletter goes out from a separate mailing tool and often lands in a promotions or spam folder. Could you check there?`],
					['m', `Found three of them in promotions. Sorry! Sorted.`]
				]
			]
		}
	},
	{
		key: 'gear',
		area: 'outside',
		team: 'gear',
		subjects: ['Gear library reminder', "Overdue item that isn't mine", 'Wrong name on a gear loan'],
		opens: [
			`I've had three emails from the gear library saying I'm overdue returning {gear}. I've never borrowed anything. Is it mixing my profile up with someone else's?`,
			`The gear library emails me about a loan in someone else's name. Has my profile been merged with theirs?`
		],
		asks: [`Sorry for the confusion. Could you forward one of the reminders?`],
		details: [`"Dear {first}, {gear} borrowed on {pastdate} is now overdue." I was at work that day.`, `It says {gear}, borrowed on {pastdate}, overdue.`],
		forward: [`Gear library reminders going to the wrong member. Profile mix-up, or the gear list?`],
		finding: [[`Profile is fine and nobody else shares the email. The gear library keeps its own spreadsheet, filled in by hand at the store:`, 'grepemail']],
		endings: {
			passed: [
				[
					['n', `Kit, {first} is getting overdue reminders for {gear} they never borrowed.`],
					['t', `Found it: the loan was written down against the wrong email at the store. Corrected, and I've found who really has it.`, 'gearsheet'],
					['d', `Kit, who runs the gear library, found the loan was recorded against your email by mistake. It's corrected; you won't get more reminders.`],
					['m', `Thanks, I was beginning to doubt myself.`]
				]
			]
		}
	},
	{
		key: 'forum',
		area: 'outside',
		team: 'forum',
		subjects: ['Forum name', 'Forum shows the wrong name', 'Forum and profile names differ'],
		opens: [
			`The forum shows my name as {oldname}, which is the old spelling. My profile has it right. Why don't they match?`,
			`Is the forum supposed to use my profile? My forum name is wrong and I can't find where to change it.`
		],
		asks: [`Could you tell me your forum username and how your name should appear?`],
		details: [`Forum username {forumuser}. It should say {name}.`, `I'm {forumuser} on the forum. {name} is right.`],
		forward: [`Forum name doesn't match profile for {first}. Does the forum read profiles?`],
		finding: [[`The forum doesn't read profiles at all; it has its own accounts. The profile is right:`, 'file']],
		endings: {
			passed: [
				[
					['n', `Nadia, could you change {forumuser}'s display name to {name}?`],
					['t', `Done. Members can change it themselves under Preferences, but it's well hidden.`],
					['d', `The forum has its own accounts, separate from your profile. Nadia, a forum moderator, has changed your display name to {name}.`],
					['m', `Thanks!`]
				]
			]
		}
	},
	{
		key: 'hut',
		area: 'outside',
		team: 'hut',
		subjects: ['Hut booking', 'Hut booking in my name?', 'Bramble Gill hut'],
		opens: [
			`I got a confirmation for a weekend at the Bramble Gill hut that I didn't book, with my name on it. Has someone used my profile?`,
			`I tried to book the hut and it says I already have a booking for that weekend. I don't.`
		],
		asks: [`Could you forward the confirmation, or tell me the dates?`],
		details: [`It's for {date1}, two nights, four people.`, `The weekend of {date1}.`],
		forward: [`Hut booking in {first}'s name they didn't make. Anything to do with profiles?`],
		finding: [[`Nothing in profiled about the hut, and the profile hasn't changed since it was created:`, 'file']],
		endings: {
			passed: [
				[
					['n', `Gordon, a hut booking for {date1} in {first}'s name that they say isn't theirs.`],
					['t', `My mistake: two members with similar names, and I put it in the diary under the wrong one. Fixed.`, 'hutdiary'],
					['d', `Gordon, the hut warden, found the booking had been written under your name by mistake. It's corrected, and the weekend is free for you to book if you like.`],
					['m', `Ha, thanks. I might just take it!`]
				]
			]
		}
	},
	{
		key: 'card',
		area: 'outside',
		team: 'money',
		subjects: ['Membership card', 'Card has the wrong name', 'Card name misspelt'],
		opens: [
			`My membership card arrived with my name spelled wrong, {oldname}. My profile has it right, so where did the card get it from?`,
			`The name on my new card isn't right. Do the cards come from the profiles?`
		],
		asks: [`Sorry about that. How is it printed on the card, and how should it be?`],
		details: [`It says {oldname}. It should be {name}.`, `Card: {oldname}. Profile: {name}, which is correct.`],
		forward: [`Card printed with the wrong name for {first}. Do cards come from profiles?`],
		finding: [[`Not from profiled. The profile is correct; cards are printed from Ruth's membership list, which has its own copy of the name:`, 'sheet']],
		endings: {
			passed: [
				[
					['n', `Ruth, could {first}'s name be corrected on the membership list and a new card printed? It should be {name}.`],
					['t', `Corrected, and a new card is in the post.`],
					['d', `Cards are printed from the treasurer's membership list, not from your profile. Ruth has corrected the list and posted you a new card.`],
					['m', `Thank you.`]
				]
			]
		}
	},
	{
		key: 'scam-email',
		area: 'outside',
		team: 'web',
		subjects: ['Is this email from you?', 'Suspicious email about my profile', 'Phishing?'],
		opens: [
			`I got an email saying my Larkspur profile will be deleted unless I "verify" it by clicking a link and entering my card details. It doesn't look right. Is it from you?`,
			`Just checking before I do anything: I had an email saying my member profile has "security issues" and asking me to log in through a link. Is it genuine?`
		],
		asks: [`Thank you for checking with us first. Could you tell me the sender's address and where the link goes?`],
		details: [`It came from "Larkspur Membership" <{scamfrom}>. The link goes to a site I don't recognise.`, `Sender {scamfrom}. I didn't click anything.`],
		forward: [`Phishing aimed at members, mentioning profiles. Does profiled send any emails at all?`],
		finding: [[`profiled doesn't send email, ever, and nothing about the club asks for card details by email. The member's profile is untouched:`, 'file']],
		endings: {
			passed: [
				[
					['n', `Hollis, phishing pretending to be us. Can you put a warning on the website and report the domain?`],
					['t', `Warning is up on the homepage, and I've reported {scamdomain} to the registrar.`],
					['d', `That email isn't from us; please delete it. Hollis on the website team has put a warning on the homepage and reported the sender.`],
					['m', `Thanks, deleted.`]
				]
			],
			explained: [
				[
					['d', `That email isn't from us. The club never asks for card details by email, and your profile isn't going anywhere. Please delete it and don't click the link.`],
					['m', `Thanks, I thought so.`]
				]
			]
		}
	},
	{
		key: 'stale-name-trips',
		area: 'outside',
		team: 'trips',
		subjects: ['Old name still showing', 'Wrong name on trip list', 'I changed my name but…'],
		opens: [
			`My name was updated on my profile, and my page shows the new one, but the trip list for {trip} still has the old one. Which is right?`,
			`You kindly fixed the spelling of my name on my profile a while ago, but the booking confirmation for {trip} still has it wrong.`
		],
		asks: [`Thanks. How does your name appear on the trip list?`],
		details: [`It says {oldname} on the list, but my profile says {name}.`, `{oldname} on the list, {name} on my page.`],
		forward: [`Name mismatch: profile shows {name}, trip list shows {oldname}. Is the trip list reading something old?`],
		finding: [
			[`The profile is right, it says {name}. The trips system copies the name from the profile when someone books, and keeps that copy. The booking for {trip} was made before the change, so it still has the old one. Nothing for profiled to do.`, 'file'],
			[`profiled has the new name, so does the member page. The trips system took its own copy when the booking was made. Their list export:`, 'bookings']
		],
		endings: {
			passed: [
				[
					['n', `Fintan, could you update the name on {first}'s booking for {trip}? It should be {name}.`],
					['t', `Updated. Bookings keep the name they were made with; we only refresh them when someone asks.`],
					['d', `Your profile is right. The trip list keeps the name from when you booked, so I asked Fintan on the trips committee to update it, and he has.`],
					['m', `Thank you both.`]
				]
			],
			explained: [
				[
					['d', `Your profile is correct. The trip list takes a copy of your name when you book, so bookings made before the change keep the old name. Any trip you book from now on will show {name}.`],
					['m', `Makes sense, thanks. I'll live with it for this one.`]
				]
			]
		}
	}
];

// Shared parts.
type Style = 'formal' | 'chatty' | 'brief';
const greetings: Record<Style, string[]> = {
	formal: ['Dear Membership Desk,', 'Good evening,', 'Dear sir or madam,', 'Dear membership team,'],
	chatty: ['Hi there!', 'Hello lovely membership people,', 'Hiya,', 'Hi all,'],
	brief: ['Hi,', 'Hello,', '']
};
const signoffs: Record<Style, string[]> = {
	formal: ['Kind regards,', 'Yours faithfully,', 'With thanks,', 'Best regards,'],
	chatty: ['Cheers!!', 'Thanks a million,', 'Hope you can help, thanks!', 'Ta,'],
	brief: ['Thanks', 'Cheers', 'Thx', '']
};
const deskHi = ['Hi {first},', 'Hello {first},', 'Dear {first},'];
const deskBye = ['Best wishes,\n{desk}', 'Thanks,\n{desk}\nMembership desk', 'Kind regards,\n{desk} (membership desk volunteer)', 'All the best,\n{desk}'];
const deskAck = [
	`Thanks for getting in touch, and sorry for the slow reply: the desk is run by volunteers and we're catching up after the weekend.`,
	`Thanks for your message.`,
	`Sorry to hear you've had trouble.`,
	`Thank you for writing in, and for the detail.`,
	`Apologies for the delay, we had a lot of messages after the newsletter went out.`,
	`Thanks for letting us know.`
];
// Unrelated questions a member asks along the way, without the "first" or "also" that places them.
const sides: [string, string][] = [
	[`is the Thursday climbing night still running over the summer?`, `Thursday climbing carries on all summer, 7pm at the wall as usual.`],
	[`can I bring a friend who isn't a member on a Sunday walk?`, `A non-member can come on up to two walks before joining; just let the leader know beforehand.`],
	[`is there still a waiting list for the hut in October?`, `There is a waiting list for October weekends at the hut. Gordon, the hut warden, keeps it, and his address is on the hut page.`],
	[`does my membership cover my teenage son if he comes along?`, `Under-18s come in on a family membership, which Ruth our treasurer can set up.`],
	[`is the AGM still on the 14th of November? I can't find the date on the website any more.`, `The AGM is on 14 November at the scout hall, 7.30pm. The page moved under Club life, sorry.`],
	[`I lost a blue glove at the bothy weekend, did anyone hand one in?`, `No blue glove has turned up so far, sorry, but I've added it to the lost property list.`],
	[`can I pay for the winter skills course in two halves?`, `The winter skills course can be paid in two halves; the booking page offers it at the payment step.`],
	[`do you know if the minibus is going to the Peak District trip or is it car shares?`, `The Peak trip is car shares this time; the minibus is booked for the coast weekend.`],
	[`where do I find the kit list for beginners?`, `The beginners' kit list is under New members on the website, near the bottom.`],
	[`is the navigation course suitable if I've never used a compass?`, `The navigation course starts from zero, so it's ideal for that.`],
	[`are dogs allowed on the Sunday walks?`, `Dogs are welcome on most Sunday walks if they're on a lead near livestock; the walk description says when a route isn't suitable.`],
	[`is there a discount for students?`, `Students get the concession rate; Ruth can switch you over if you send her a photo of your student card.`],
	[`who do I talk to about becoming a trip leader?`, `Fintan on the trips committee looks after new leaders; there's a leaders' evening every spring.`],
	[`do you still run the first aid course?`, `The outdoor first aid course runs twice a year, the next one in March. Dates go in the newsletter.`],
	[`can I hire a helmet for the gritstone day?`, `The gear library lends helmets for free; Kit will put one aside if you email the gear address.`],
	[`is the photo competition open to new members?`, `Yes, anyone can enter the photo competition, new members included. The closing date is in the newsletter.`]
];
const sideFirst = ['Quick one before the main thing: ', 'First, unrelated: ', 'Before I forget, ', 'One thing first: '];
const sideLater = ['Also, ', 'Oh, and unrelated: ', 'One more thing while I remember: ', 'Separate question: '];
const sideReply = ['To your other question: ', 'On your other question, ', 'And to answer the other thing: ', ''];
// Paragraphs a member adds about themselves, and what they tried before writing.
const newcomers = [
	`I'm new to the area and joined to meet people who like being outdoors, so I'm keen to get going.`,
	`My partner and I joined together after the open day.`,
	`I came along to the beginners' evening at the climbing wall and loved it, which is why I'm here.`,
	`I'm only here for a year on a work placement, but I want to make the most of the hills while I am.`
];
const regulars = [
	`I lead the odd walk myself, so I do know my way around the website, which is why this has me puzzled.`,
	`I'm back in the club after a few years away with small children, so forgive me if things have changed.`,
	`I'm the one in our group who sorts out the bookings for everyone, so I tend to notice when something's off.`,
	`I'm not a big computer person; my son set up most of my accounts.`,
	`Most of my walking friends are in the club, so it matters to me that this works.`,
	`I do a lot of my club admin on my phone between shifts, so I may have missed something obvious.`
];
const tries = [
	`I've tried a different browser and cleared my cookies, as the internet suggested, and it made no difference.`,
	`I've restarted my phone, and tried on the laptop as well.`,
	`I tried again in the morning in case the site was busy in the evening.`,
	`My partner tried on their phone and got the same thing.`,
	`I've switched off the ad blocker in case that was it.`,
	`I tried at work too, on a completely different computer.`,
	`I waited a day and tried again, same result.`,
	`I even tried in private browsing mode, which my nephew swears by.`
];
const tangents = [
	`We've just got back from a week in the Picos, which is partly why I'm only sorting this now.`,
	`I'm writing this on the train, so apologies for typos.`,
	`My daughter set up her profile in two minutes, so I feel a bit silly.`,
	`I'm not very good with computers, as my grandchildren keep telling me.`,
	`Loved the photos from the coast weekend in the last newsletter, by the way.`,
	`I was hoping to sort this before the clocks go back and the evening walks stop.`,
	`Our router has been playing up all week too, so I did wonder if it was my end.`,
	`It's not urgent urgent, but I've been meaning to write for a while.`,
	`I tried calling the number on the website first but it went to voicemail.`,
	`I'm off to the Alps on the 3rd, so I'd love to get it sorted before then if possible.`,
	`Apologies if this has already been reported, I couldn't see anything on the forum.`,
	`Thank you, by the way, for the navigation course in the spring. I haven't been lost since.`
];
const chasers = [
	`Hi again, any news on this? No rush, just checking it hasn't got lost.`,
	`Just following up on my message from last week.`,
	`Sorry to nag, but {trip} is coming up and I'd like this sorted before then.`,
	`Hello? Is anyone looking at this?`,
	`Any update? I've still got the same problem.`,
	`Hope you're well. Wondering if there's been any progress?`
];
const holding = [
	`Sorry, {first}, it's with our tech volunteers, who fit this around their jobs. I've nudged them today.`,
	`Not forgotten! One of the tech volunteers is looking at it and I'll come back to you as soon as I hear.`,
	`Thanks for your patience. The person who usually looks at these is away walking this week, but someone else has picked it up.`,
	`Still on our list, sorry. I'll chase it tonight.`
];
const bumps = [`Bumping this for the tech folks, it's been {n} days.`, `Anyone? {first} has written again.`, `Adding this to Thursday's list in case nobody gets to it before then.`, `Still waiting on a tech volunteer for this one.`];
const away = [
	`I'm away until {date1} with no laptop. {dev}, could you take this one?`,
	`Can't look this week, I'm on a course. {dev}, are you free?`,
	`Saw this but I'm on call at work all week. {dev}?`
];
const onIt = [`On it this evening.`, `Yes, I'll look tonight after the kids are in bed.`, `Taking it. Give me a day.`, `Looking now.`];
const bounce = [
	[`I'm going to try Hollis first, as it's the website's form.`, `Nothing has changed on the website side this month, and the page only shows what the profile service sends back. Handing it back to the tech volunteers, sorry.`],
	[`Hollis, is this the website rather than profiles?`, `Not mine, I think: the website passes the request straight to profiled and prints whatever it says. Back to the tech side.`]
];
const coverNotes = [`Picking this up while {deskother} is away.`, `Taking this over from {deskother}, who's on holiday until next week.`, `{deskother} asked me to keep an eye on this one.`];
const asides = [
	`Unrelated: the desk phone's voicemail is full again. Could whoever has the PIN clear it?`,
	`Side note, the newsletter link to the AGM agenda is broken. I've told Lucía.`,
	`By the way, I'm away from the 20th, so if this is still open then, {deskother} will pick it up.`,
	`Also, could we add "check spam" to the auto-reply? Half of today's messages were that.`
];

// A second tech volunteer's question once the cause is found, and the answer, by the area the request turns out to be in.
// The third element is an optional paste; the fourth lists topics the exchange does not fit.
type Talk = [question: string, answer: string, art?: Art, skip?: string[]];
const talks: Record<Area, Talk[]> = {
	signup: [
		[`How many signups fail like this? If it's a handful a week I'm less worried than if it's one in ten.`, `Counted from the proxy log for the last seven days. Nearly every 500 is a profile name profiled won't take; the 400s are mostly emails with a space in them.`, 'signupcounts', ['family', 'wrong-person-email', 'id-taken', 'email-cut']],
		[`Did the website change anything on the join page recently? I'd rather rule that out before we look at profiled.`, `Hollis says the join page hasn't changed since June, and the form sends exactly what the member typed. I compared a request from today with one from July and they're the same shape.`, undefined, ['family', 'wrong-person-email', 'down-evening']],
		[`Could the earlier attempts have left a half-written file behind? That would confuse things later.`, `No: profiled writes nothing when it refuses a signup, and there's no file with their email in the data folder. The surname matches are other people.`, 'grepnone', ['id-taken', 'email-cut', 'family', 'wrong-person-email', 'down-evening', 'email-space']],
		[`While you're on the server, is everything else healthy? Clock, disk, the lot.`, `All fine:`, 'health', ['down-evening']]
	],
	lookup: [
		[`Do we know how often the trips system asks for profiles that don't exist? If it's constant, the trips team should hear about it.`, `Yesterday's log, counted by what profiled said:`, 'getcounts'],
		[`Could the proxy be caching an old error page? That would explain some of what members describe.`, `No caching on /api/: every request goes through to profiled. The relevant part of the nginx config:`, 'nginxconf'],
		[`Is the file itself readable? A permissions slip after the last move would look exactly the same from outside.`, `Permissions are fine, and profiled can read every file in the folder:`, 'perms'],
		[`While you're on the server, is everything else healthy? Clock, disk, the lot.`, `All fine:`, 'health', ['empty-club']]
	],
	change: [
		[`Are we keeping a copy of each file before we hand-edit it? I'd like to be able to undo a mistake.`, `Yes, everything goes into /srv/profiled/hand-edits first. The last few:`, 'handedits'],
		[`Do the trips bookings need touching when a profile changes?`, `Only when the profile name changes. A new name or email is picked up the next time the member books; existing bookings keep their own copy, which Fintan can update if someone asks.`],
		[`How many of these have we done by hand this month? I want a number for the committee.`, `Counted from the hand-edits folder:`, 'editcounts'],
		[`Will the newsletter list notice the change?`, `Lucía's tool reads the profiles every Monday at six, so anything we change is in the next run. Nothing else to tell her.`]
	],
	outside: [
		[`Should this go on the desk's crib sheet, so it reaches the right team first time?`, `Yes. Added a line to the crib sheet:`, 'crib'],
		[`Just to be sure it isn't us: any errors for this member in profiled's log at all?`, `None:`, 'nolog'],
		[`Is anything else reading the profiles that could explain this?`, `Three things read them: the website's member pages, the trips system when someone books, and Lucía's newsletter tool on Mondays. None of them would do this.`],
		[`While you're on the server, is everything else healthy? Clock, disk, the lot.`, `All fine:`, 'health']
	]
};
// A member's last question after their matter is settled, and the desk's answer.
const afters: Record<Area, Talk[]> = {
	signup: [
		[`One more question while I have you: can I change my profile name later if I go off it?`, `Not easily, I'm afraid. It's part of your page's address and trip bookings refer to it, so we only change it in special cases. The name shown on your page can be changed any time; just write to us.`],
		[`Do I need to do anything else before I book a trip?`, `Nothing else: once your page exists you can book from the trips page. Most people start with a Sunday walk, and the leader sends a kit list a few days before.`, undefined, ['id-taken', 'email-cut', 'never-saved', 'family']],
		[`Is there an app, or is it just the website?`, `Just the website for now. It works fine on a phone; you can add it to your home screen.`],
		[`Do I get a membership card as well?`, `Yes, Ruth posts cards within a couple of weeks of joining. If yours hasn't come by the end of the month, let us know.`, undefined, ['id-taken']]
	],
	lookup: [
		[`Thanks. Is there anything I should do so this doesn't happen again?`, `Nothing on your side. If you share a page, copy the address from the browser bar rather than typing it, and it will always work.`],
		[`Does the page show when someone last went on a trip? A friend thought it did.`, `No, the member page only has the name and email; trip history lives in the trips system.`],
		[`Out of interest, how many members are there now?`, `Just over {rounded} with profiles, and growing every week.`],
		[`Who do I tell if the page breaks again?`, `Us, any time, at membership@larkspur.example. We pass anything technical to the volunteers who look after the site.`]
	],
	change: [
		[`How long until other club emails go to the right address?`, `The newsletter picks up changes every Monday; trip emails use the new details straight away for anything booked from now on.`, undefined, ['delete-leaving', 'bereavement']],
		[`Will this affect the trips I've already booked?`, `Existing bookings keep the details they were made with. If a leader needs the new details, tell us and we'll pass them on.`, undefined, ['delete-leaving', 'bereavement']],
		[`Is there a way for me to do this myself next time?`, `Not yet, changes go through us for now. Just write in and we'll do it.`, undefined, ['bereavement']],
		[`Do you need anything from me for the membership list too?`, `No, I've let Ruth know so the membership list matches.`, undefined, ['bereavement']]
	],
	outside: [
		[`Sorry for coming to the wrong place! Who should I contact next time?`, `No need to apologise, we'd rather hear about it. You can write to the right team directly next time; the addresses are on the Contacts page of the website.`],
		[`So what does my profile actually do, then?`, `Your profile is your page on the club website: your name and email, which trip leaders and the newsletter use. Bookings, payments, the forum and the hut all keep their own records.`],
		[`Thanks. Will I get an email to confirm?`, `Yes, the team will confirm directly. If you hear nothing within a week, let us know.`],
		[`Is there a way to see all my club details in one place?`, `Not at the moment, sorry: they live in a few different places, run by different volunteers.`]
	]
};
// Earlier requests from the same member, as the desk's inbox lists them beside a thread.
const earlier = ['Renewal reminder not received', 'Lost property from the Langdale weekend', 'Changing to a concession membership', 'Question about the AGM', 'Kit list for the navigation course', 'Guest on a Sunday walk', 'Direct debit date', 'Hut waiting list', 'Volunteering as a trip leader', 'Car sharing for the Peak trip', 'First aid course dates', 'Junior climbing sessions', 'Refund for a cancelled trip', 'Photo permission for the newsletter', 'Insurance on club trips', 'Bothy booking rules', 'Minibus seat for the coast weekend', 'Address change for the card'];

// Pasted output.
const randomMember = (r: Rand) => {
	const first = pick(r, firstNames);
	const last = pick(r, surnames);
	return { name: `${first} ${last}`, id: pick(r, [`${slugOf(first)}-${slugOf(last)}`, `${slugOf(first)}${slugOf(last)[0]}`, `${slugOf(first)}-${int(r, 2, 99)}`]), email: `${slugOf(first)}.${slugOf(last)}@${pick(r, domains)}` };
};
const profileJson = (id: string, name: string, email: string) => `{\n  "id": "${id}",\n  "name": "${name}",\n  "email": "${email}"\n}`;
const bytes = (text: string) => new TextEncoder().encode(text).length;
const lsLine = (id: string, json: string, ms: number) => `-rw-r--r-- 1 profiled profiled ${bytes(json)} ${isoMinute(ms)} /srv/profiled/data/${id}.json`;
const ip = (r: Rand) => `${pick(r, ['192.0.2', '198.51.100', '203.0.113'])}.${int(r, 2, 254)}`;
const agents = [
	'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1',
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
	'Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15',
	'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0'
];
const fence = (lines: string[]) => '```text\n' + lines.join('\n') + '\n```';

interface Ctx {
	r: Rand;
	s: Record<string, string>;
	t: number;
	t0: number;
	member: { id: string; name: string; email: string };
}
const proxyLine = (r: Rand, ms: number, method: string, path: string, status: number, size: number, referer: string, agent: string) =>
	`${ip(r)} - - [${clf(ms)}] "${method} ${path} HTTP/2.0" ${status} ${size} "${referer}" "${agent}"`;
const noise = (c: Ctx, ms: number): string => {
	const other = randomMember(c.r);
	const roll = c.r();
	if (roll < 0.5) return `${logTime(ms)} get profile "${other.id}": storage: profile not found`;
	if (roll < 0.7) return `${logTime(ms)} get profile "${pick(c.r, firstNames)}-${slugOf(pick(c.r, surnames))}": storage: invalid profile id`;
	if (roll < 0.85) return `${logTime(ms)} signup "${pick(c.r, firstNames)} ${pick(c.r, surnames)}": storage: invalid profile id`;
	return `${logTime(ms)} write response: write tcp 127.0.0.1:8080->127.0.0.1:${int(c.r, 40000, 60999)}: write: broken pipe`;
};
const logRun = (c: Ctx, start: number, own: string[], extra: number): string[] => {
	const lines: { ms: number; text: string }[] = [];
	let ms = start - int(c.r, 30, 120) * MINUTE;
	for (let i = 0; i < extra; i++) {
		ms += int(c.r, 1, 40) * MINUTE + int(c.r, 0, 59) * 1000;
		lines.push({ ms, text: noise(c, ms) });
	}
	let mine = start;
	for (const text of own) {
		mine += int(c.r, 1, 9) * MINUTE + int(c.r, 0, 59) * 1000;
		lines.push({ ms: mine, text: `${logTime(mine)} ${text}` });
	}
	return lines.sort((a, b) => a.ms - b.ms).map((line) => line.text);
};
const arts: Record<Art, (c: Ctx) => string> = {
	signuplog: (c) => {
		const attempts = Array.from({ length: int(c.r, 2, 4) }, () => `signup "${c.s.badid}": storage: invalid profile id`);
		const day = c.t0 - int(c.r, 0, 1) * DAY;
		const p = parts(day);
		return fence([`$ grep '^${p.y}/${pad(p.m + 1)}/${pad(p.d)}' /var/log/profiled.log | tail -${attempts.length + 24}`, ...logRun(c, day, attempts, int(c.r, 20, 27))]);
	},
	curl: (c) => {
		const body = `{"id":"${c.s.badid}","name":"${c.s.name}","email":"${c.s.email}"}`;
		return fence([`$ curl -si -X POST localhost:8080/signup -d '${body}'`, 'HTTP/1.1 500 Internal Server Error', 'Content-Type: text/plain; charset=utf-8', 'X-Content-Type-Options: nosniff', `Date: ${httpDate(c.t)}`, 'Content-Length: 27', '', 'could not save the profile', '', `$ curl -si -X POST localhost:8080/signup -d '${body.replace(`"${c.s.badid}"`, `"${c.s.id}-test"`)}' | head -1`, 'HTTP/1.1 201 Created']);
	},
	proxy400: (c) => {
		const agent = pick(c.r, agents);
		const count = int(c.r, 10, 14);
		const lines: string[] = [`$ grep 'POST /api/signup' /var/log/nginx/access.log | tail -${count}`];
		let ms = c.t0 - int(c.r, 60, 240) * MINUTE;
		for (let i = 0; i < count; i++) {
			ms += int(c.r, 2, 50) * MINUTE + int(c.r, 0, 59) * 1000;
			const mine = i >= count - 4;
			lines.push(proxyLine(c.r, ms, 'POST', '/api/signup', mine ? 400 : pick(c.r, [201, 201, 201, 500]), mine ? 40 : int(c.r, 70, 120), 'https://larkspur.example/join', mine ? agent : pick(c.r, agents)));
		}
		return fence(lines);
	},
	curlspace: (c) => fence([
		`$ curl -s -o /dev/null -w '%{http_code}\\n' -X POST localhost:8080/signup -d '{"id":"${c.s.id}-test","name":"${c.s.name}","email":"${c.s.email} "}'`,
		'400',
		`$ curl -s -o /dev/null -w '%{http_code}\\n' -X POST localhost:8080/signup -d '{"id":"${c.s.id}-test","name":"${c.s.name}","email":"${c.s.email}"}'`,
		'201'
	]),
	journal: (c) => {
		const start = c.t0 - int(c.r, 30, 200) * MINUTE;
		const back = start + int(c.r, 9, 16) * 60 * MINUTE;
		return fence([
			`$ journalctl -b -1 -u profiled -u unattended-upgrades --no-pager | tail -8`,
			`${journalTime(start)} larkspur-vm systemd[1]: Starting unattended-upgrades.service - Unattended Upgrades...`,
			`${journalTime(start + 4 * MINUTE)} larkspur-vm unattended-upgrade[${int(c.r, 900, 2900)}]: Packages that will be upgraded: libc6 linux-image-generic openssl`,
			`${journalTime(start + 11 * MINUTE)} larkspur-vm systemd[1]: Stopping profiled.service - Larkspur profile service...`,
			`${journalTime(start + 11 * MINUTE)} larkspur-vm systemd[1]: profiled.service: Deactivated successfully.`,
			`${journalTime(start + 12 * MINUTE)} larkspur-vm systemd[1]: Reached target reboot.target - System Reboot.`,
			`$ journalctl -b 0 -u profiled --no-pager | head -3`,
			`${journalTime(back)} larkspur-vm systemd[1]: Started profiled.service - Larkspur profile service.`,
			`${journalTime(back)} larkspur-vm profiled[${int(c.r, 400, 1900)}]: ${logTime(back)} profiled listening on :8080, data in /srv/profiled/data`,
			`$ systemctl is-enabled profiled`,
			`disabled`
		]);
	},
	diskfull: (c) => {
		const start = c.t0 - int(c.r, 30, 200) * MINUTE;
		return fence([
			'$ df -h /',
			'Filesystem      Size  Used Avail Use% Mounted on',
			`/dev/vda1        20G   20G     0 100% /`,
			'$ du -sh /var/log/nginx /var/log/profiled.log /srv/profiled/data',
			`${int(c.r, 14, 18)}G\t/var/log/nginx`,
			`${int(c.r, 110, 380)}M\t/var/log/profiled.log`,
			`${int(c.r, 9, 14)}M\t/srv/profiled/data`,
			`$ grep -c . /dev/null; ls /srv/profiled/data | wc -l`,
			'0',
			c.s.count!,
			`$ journalctl -u profiled --since "${isoMinute(start)}" --no-pager | tail -3`,
			`${journalTime(start)} larkspur-vm profiled[${int(c.r, 400, 1900)}]: ${logTime(start)} write response: write tcp 127.0.0.1:8080->127.0.0.1:${int(c.r, 40000, 60999)}: write: no space left on device`,
			`${journalTime(start + int(c.r, 100, 200) * MINUTE)} larkspur-vm systemd[1]: Stopping profiled.service - Larkspur profile service...`,
			`${journalTime(start + int(c.r, 201, 260) * MINUTE)} larkspur-vm systemd[1]: Started profiled.service - Larkspur profile service.`
		]);
	},
	shared: (c) => {
		const lines = ['$ grep -h \'"email"\' /srv/profiled/data/*.json | sort | uniq -c | sort -rn | head -8'];
		for (let i = 0; i < 8; i++) lines.push(`      ${int(c.r, 2, 5 - Math.floor(i / 2))}   "email": "${randomMember(c.r).email}"`);
		return fence(lines);
	},
	proxyfail: (c) => {
		const signup = Number(c.s.joinedms) + int(c.r, 10, 600) * MINUTE;
		const agent = pick(c.r, agents);
		const lines = [`$ zgrep -h '${c.s.badid.replace(/ /g, '%20')}\\|${c.s.id}' /var/log/nginx/access.log* | sort -k4 | head -9`];
		let ms = signup;
		for (let i = 0; i < int(c.r, 2, 3); i++) {
			ms += int(c.r, 1, 4) * MINUTE + int(c.r, 0, 59) * 1000;
			lines.push(proxyLine(c.r, ms, 'POST', '/api/signup', 500, 27, 'https://larkspur.example/join', agent));
		}
		for (let i = 0; i < int(c.r, 4, 6); i++) {
			ms += int(c.r, 1, 9) * DAY + int(c.r, 0, 600) * MINUTE;
			if (ms > c.t) break;
			lines.push(proxyLine(c.r, ms, 'GET', `/api/profiles/${c.s.id}`, 500, 27, pick(c.r, [`https://larkspur.example/members/${c.s.id}`, 'https://trips.larkspur.example/book', '-']), agent));
		}
		return fence(lines);
	},
	getlog: (c) => {
		const error = /[A-Z]/.test(c.s.otherbad!) ? 'invalid profile id' : 'profile not found';
		const own = Array.from({ length: int(c.r, 2, 4) }, () => `get profile "${c.s.otherbad}": storage: ${error}`);
		const start = c.t0 - int(c.r, 1, 5) * DAY;
		const p = parts(start);
		return fence([`$ grep -C 4 '${c.s.otherbad}' /var/log/profiled.log | grep '^${p.y}/${pad(p.m + 1)}/${pad(p.d)}'`, ...logRun(c, start, own, int(c.r, 6, 10))]);
	},
	curlpair: (c) => {
		const json = JSON.stringify({ id: c.s.otherid, name: c.s.othername, email: c.s.otheremail });
		return fence([
			`$ curl -si localhost:8080/profiles/${c.s.otherbad}`,
			'HTTP/1.1 500 Internal Server Error',
			'Content-Type: text/plain; charset=utf-8',
			'X-Content-Type-Options: nosniff',
			`Date: ${httpDate(c.t)}`,
			'Content-Length: 27',
			'',
			'could not load the profile',
			'',
			`$ curl -si localhost:8080/profiles/${c.s.otherid}`,
			'HTTP/1.1 200 OK',
			'Content-Type: application/json',
			`Date: ${httpDate(c.t + 9000)}`,
			`Content-Length: ${bytes(json) + 1}`,
			'',
			json
		]);
	},
	curlcase: (c) => {
		const json = JSON.stringify({ id: c.member.id, name: c.member.name, email: c.member.email });
		return fence([`$ curl -s -w ' %{http_code}\\n' localhost:8080/profiles/${c.s.capid}`, 'could not load the profile', ' 500', `$ curl -s -w ' %{http_code}\\n' localhost:8080/profiles/${c.s.id}`, `${json}`, ' 200']);
	},
	getlogcase: (c) => {
		const own = Array.from({ length: int(c.r, 3, 7) }, () => `get profile "${c.s.capid}": storage: invalid profile id`);
		return fence([`$ grep -i -B 2 '${c.s.id}' /var/log/profiled.log | tail -${own.length * 2 + 4}`, ...logRun(c, c.t0 - int(c.r, 2, 6) * DAY, own, own.length + int(c.r, 2, 5))]);
	},
	emptydir: (c) => {
		const old = c.t0 - int(c.r, 3, 9) * DAY - int(c.r, 0, 600) * MINUTE;
		const now = c.t0 - int(c.r, 5, 9) * 60 * MINUTE;
		return fence([
		'$ systemctl cat profiled | grep -E "WorkingDirectory|Environment|ExecStart"',
		'Environment=PROFILED_ADDR=127.0.0.1:8080',
		'Environment=PROFILED_DATA_DIR=/srv/profiled/data',
		'ExecStart=/usr/local/bin/profiled',
		`$ journalctl -u profiled --no-pager | grep listening | tail -2`,
		`${journalTime(old)} larkspur-old profiled[${int(c.r, 400, 1900)}]: ${logTime(old)} profiled listening on 127.0.0.1:8080, data in /srv/profiled/data`,
		`${journalTime(now)} larkspur-vm profiled[${int(c.r, 400, 1900)}]: ${logTime(now)} profiled listening on 127.0.0.1:8080, data in ./data`,
		'$ ls /data | wc -l; ls /srv/profiled/data | wc -l',
		'0',
		c.s.count!
		]);
	},
	file: (c) => {
		const shown = c.s.bademail ? (c.s.showbad === 'yes' ? c.s.bademail : c.member.email) : c.member.email;
		const json = profileJson(c.member.id, c.member.name, shown!);
		const joined = Number(c.s.joinedms);
		const made = joined > IMPORTED ? joined + int(c.r, 5, 300) * MINUTE : IMPORTED;
		return fence([`$ ls -l --time-style=long-iso /srv/profiled/data/${c.member.id}.json`, lsLine(c.member.id, json, made), `$ cat /srv/profiled/data/${c.member.id}.json`, json]);
	},
	fileother: (c) => {
		const json = profileJson(c.s.otherid!, c.s.othername!, c.s.email!);
		const shown = c.s.otherfile === 'own' ? profileJson(c.s.otherid!, c.s.othername!, c.s.otheremail!) : json;
		return fence([`$ grep -l '${c.s.othername}' /srv/profiled/data/*.json`, `/srv/profiled/data/${c.s.otherid}.json`, `$ cat /srv/profiled/data/${c.s.otherid}.json`, shown]);
	},
	filediff: (c) => {
		const before = c.s.bademail && c.s.showbad === 'yes' ? c.s.bademail : c.member.email;
		const after = c.s.newemail && !(c.s.bademail && c.s.showbad === 'yes') ? c.s.newemail : c.member.email;
		return fence([`$ cp /srv/profiled/data/${c.member.id}.json /srv/profiled/hand-edits/${c.member.id}.json.${isoMinute(c.t).slice(0, 10)}`, `$ sudo -u profiled nano /srv/profiled/data/${c.member.id}.json`, `$ diff /srv/profiled/hand-edits/${c.member.id}.json.${isoMinute(c.t).slice(0, 10)} /srv/profiled/data/${c.member.id}.json`, '4c4', `<   "email": "${before}"`, '---', `>   "email": "${after}"`]);
	},
	namediff: (c) => fence([`$ sudo -u profiled nano /srv/profiled/data/${c.member.id}.json`, `$ cat /srv/profiled/data/${c.member.id}.json`, profileJson(c.member.id, c.s.newname!, c.member.email)]),
	fileold: (c) => {
		const json = profileJson(c.s.oldid!, c.member.name, c.member.email);
		return fence([`$ ls /srv/profiled/data/ | grep -E '^(${c.s.oldid}|${c.s.wantid})\\.json'`, `${c.s.oldid}.json`, `$ cat /srv/profiled/data/${c.s.oldid}.json`, json]);
	},
	dupes: (c) => fence([
		`$ grep -l '${c.member.email}' /srv/profiled/data/*.json`,
		`/srv/profiled/data/${c.member.id}.json`,
		`/srv/profiled/data/${c.s.id2}.json`,
		`$ head -20 /srv/profiled/data/${c.member.id}.json /srv/profiled/data/${c.s.id2}.json`,
		`==> /srv/profiled/data/${c.member.id}.json <==`,
		profileJson(c.member.id, c.member.name, c.member.email),
		'',
		`==> /srv/profiled/data/${c.s.id2}.json <==`,
		profileJson(c.s.id2!, c.s.first!, c.member.email)
	]),
	bookings: (c) => {
		const rows = ['| Booking | Name on booking | Profile name | Booked | Status |', '| --- | --- | --- | --- | --- |'];
		const at = int(c.r, 0, 5);
		for (let i = 0; i < 7; i++) {
			const who = i === at ? { name: c.s.oldname!, id: c.member.id } : randomMember(c.r);
			rows.push(`| T${int(c.r, 1000, 9999)} | ${who.name} | ${who.id} | ${longDate(c.t0 - int(c.r, 10, 60) * DAY)} | ${pick(c.r, ['confirmed', 'confirmed', 'confirmed', 'waiting list', 'paid'])} |`);
		}
		return rows.join('\n');
	},
	grepemail: (c) => fence([`$ grep -l '${c.member.email}' /srv/profiled/data/*.json`, `/srv/profiled/data/${c.member.id}.json`, `$ cat /srv/profiled/data/${c.member.id}.json`, profileJson(c.member.id, c.member.name, c.member.email)]),
	curlget: (c) => {
		const json = JSON.stringify({ id: c.member.id, name: c.member.name, email: c.member.email });
		return fence([`$ curl -si localhost:8080/profiles/${c.member.id}`, 'HTTP/1.1 200 OK', 'Content-Type: application/json', `Date: ${httpDate(c.t)}`, `Content-Length: ${bytes(json) + 1}`, '', json]);
	},
	proxyok: (c) => {
		const count = int(c.r, 8, 11);
		const lines = [`$ zgrep -h '/api/profiles/${c.member.id} ' /var/log/nginx/access.log* | sort -k4 | tail -${count}`];
		let ms = Math.max(c.t0 - int(c.r, 20, 40) * DAY, IMPORTED + DAY, Number(c.s.joinedms) + DAY);
		const agent = pick(c.r, agents);
		for (let i = 0; i < count; i++) {
			ms += int(c.r, 0, 3) * DAY + int(c.r, 0, 600) * MINUTE;
			if (ms > c.t) break;
			lines.push(proxyLine(c.r, ms, 'GET', `/api/profiles/${c.member.id}`, 200, bytes(JSON.stringify({ id: c.member.id, name: c.member.name, email: c.member.email })) + 1, pick(c.r, ['https://trips.larkspur.example/book', `https://larkspur.example/members/${c.member.id}`]), agent));
		}
		return fence(lines);
	},
	newsletter: (c) => {
		const rows = ['| Address | Source | Last sent | Status |', '| --- | --- | --- | --- |'];
		for (let i = 0; i < 5; i++) {
			const mine = i === 2;
			rows.push(`| ${mine ? c.member.email : randomMember(c.r).email} | profiles | ${longDate(c.t0 - int(c.r, 3, 40) * DAY)} | ${mine ? 'paused (3 bounces)' : pick(c.r, ['active', 'active', 'active', 'unsubscribed'])} |`);
		}
		return rows.join('\n');
	},
	sheet: (c) => {
		const rows = ['| No. | Name | Joined | Membership | Paid to | Email on the list |', '| --- | --- | --- | --- | --- | --- |'];
		const at = int(c.r, 1, 4);
		for (let i = 0; i < 6; i++) {
			const mine = i === at;
			const who = mine ? { name: c.s.listname!, email: c.member.email } : randomMember(c.r);
			const joined = parts(Number(c.s.joinedms));
			rows.push(`| ${mine ? c.s.memberno : int(c.r, 1000, 4999)} | ${who.name} | ${mine ? MONTHS[joined.m] : pick(c.r, MONTHS)} ${mine ? joined.y : int(c.r, 2009, 2026)} | ${mine && c.s.single === 'yes' ? 'single' : pick(c.r, ['single', 'single', 'family', 'concession', 'junior'])} | 31 Mar 2027 | ${who.email} |`);
		}
		return rows.join('\n');
	},
	emaillist: (c) => {
		const lines = [`$ for p in $(cat ${slugOf(c.s.trip!).slice(0, 12)}-profiles.txt); do curl -s localhost:8080/profiles/$p | jq -r .email; done`];
		for (let i = 0; i < Number(c.s.n2); i++) lines.push(randomMember(c.r).email);
		return fence(lines);
	},
	backup: (c) => {
		const day = Date.parse(`${c.s.overiso}T00:00:00Z`);
		return fence([
			'$ ls /srv/backups/profiled | tail -4',
			...[3, 2, 1, 0].map((back) => `profiled-data-${isoMinute(day - back * DAY).slice(0, 10)}.tar.gz`),
			`$ tar -xOzf /srv/backups/profiled/profiled-data-${isoMinute(day - DAY).slice(0, 10)}.tar.gz data/${c.member.id}.json`,
			profileJson(c.member.id, c.member.name, c.member.email),
			`$ cat /srv/profiled/data/${c.member.id}.json`,
			profileJson(c.member.id, c.s.othername!, c.s.otheremail!)
		]);
	},
	overwrite: (c) => {
		const day = Date.parse(`${c.s.overiso}T00:00:00Z`) + int(c.r, 8 * 60, 22 * 60) * MINUTE;
		const json = profileJson(c.member.id, c.s.othername!, c.s.otheremail!);
		return fence([
			`$ ls -l --time-style=long-iso /srv/profiled/data/${c.member.id}.json`,
			lsLine(c.member.id, json, day),
			`$ zgrep -h 'POST /api/signup' /var/log/nginx/access.log* | grep '${clf(day).slice(0, 17)}'`,
			proxyLine(c.r, day, 'POST', '/api/signup', 201, bytes(JSON.stringify({ id: c.member.id, name: c.s.othername, email: c.s.otheremail })) + 1, 'https://larkspur.example/join', pick(c.r, agents)),
			`$ cat /srv/profiled/data/${c.member.id}.json`,
			json
		]);
	},
	gearsheet: (c) => {
		const rows = ['| Item | Borrowed | Due | Borrower | Email |', '| --- | --- | --- | --- | --- |'];
		for (let i = 0; i < 5; i++) {
			const mine = i === 1;
			const who = randomMember(c.r);
			const out = mine ? Number(c.s.pastms) : c.t0 - int(c.r, 20, 50) * DAY;
			rows.push(`| ${mine ? c.s.gear : pick(c.r, gearItems)} | ${longDate(out)} | ${longDate(out + (mine ? 2 : int(c.r, 7, 21)) * DAY)} | ${who.name} | ${mine ? `~~${c.member.email}~~ ${who.email}` : who.email} |`);
		}
		return rows.join('\n');
	},
	hutdiary: (c) => {
		const rows = ['| Arriving | Booked by | Party | Paid |', '| --- | --- | --- | --- |'];
		for (let i = 0; i < 5; i++) rows.push(`| ${longDate(Number(c.s.date1ms) + (i - 2) * 7 * DAY)} | ${i === 2 ? `~~${c.member.name}~~ ${c.s.othername}` : randomMember(c.r).name} | ${int(c.r, 2, 8)} | ${pick(c.r, ['yes', 'yes', 'deposit'])} |`);
		return rows.join('\n');
	},
	signupcounts: (c) => {
		const rows = ['| Day | POST /api/signup | 201 | 400 | 500 |', '| --- | ---: | ---: | ---: | ---: |'];
		for (let back = 7; back >= 1; back--) {
			const p = parts(c.t - back * DAY);
			const bad = int(c.r, 0, 4);
			const space = int(c.r, 0, 2);
			const saved = int(c.r, 4, 22);
			rows.push(`| ${DAYS[p.wd]!.slice(0, 3)} ${p.d} ${MON[p.m]} | ${bad + space + saved} | ${saved} | ${space} | ${bad} |`);
		}
		return rows.join('\n');
	},
	grepnone: (c) => {
		const lines = [`$ grep -il '${c.s.last}' /srv/profiled/data/*.json`];
		for (let i = int(c.r, 0, 2); i > 0; i--) lines.push(`/srv/profiled/data/${slugOf(pick(c.r, firstNames))}-${slugOf(c.s.last!)}.json`);
		lines.push(`$ grep -l '${c.member.email}' /srv/profiled/data/*.json; echo "exit $?"`, 'exit 1');
		return fence(lines);
	},
	health: (c) => {
		const p = parts(c.t);
		const since = c.t - int(c.r, 3, 40) * DAY - int(c.r, 0, 1400) * MINUTE;
		const pid = int(c.r, 400, 30000);
		const up = c.t - since + int(c.r, 1, 9) * MINUTE;
		return fence([
			'$ systemctl status profiled --no-pager | head -9',
			'● profiled.service - Larkspur profile service',
			'     Loaded: loaded (/etc/systemd/system/profiled.service; enabled; preset: enabled)',
			`     Active: active (running) since ${DAYS[parts(since).wd]!.slice(0, 3)} ${isoMinute(since)}:${pad(parts(since).s)} ${since < SUMMER_END ? 'BST' : 'GMT'}; ${Math.floor((c.t - since) / DAY)} days ago`,
			`   Main PID: ${pid} (profiled)`,
			`      Tasks: ${int(c.r, 5, 9)} (limit: 2307)`,
			`     Memory: ${int(c.r, 6, 14)}.${int(c.r, 0, 9)}M (peak: ${int(c.r, 15, 30)}.${int(c.r, 0, 9)}M)`,
			`        CPU: ${int(c.r, 1, 59)}min ${int(c.r, 0, 59)}.${int(c.r, 100, 999)}s`,
			'     CGroup: /system.slice/profiled.service',
			`             └─${pid} /usr/local/bin/profiled`,
			'$ date; uptime; df -h /; ls /srv/profiled/data | wc -l',
			`${DAYS[p.wd]!.slice(0, 3)} ${p.d} ${MON[p.m]} ${p.y} ${pad(p.h)}:${pad(p.mi)}:${pad(p.s)} ${c.t < SUMMER_END ? 'BST' : 'GMT'}`,
			` ${pad(p.h)}:${pad(p.mi)}:${pad(p.s)} up ${Math.floor(up / DAY)} days, ${Math.floor((up % DAY) / (60 * MINUTE))}:${pad(Math.floor((up % (60 * MINUTE)) / MINUTE))},  1 user,  load average: 0.0${int(c.r, 0, 9)}, 0.0${int(c.r, 1, 9)}, 0.0${int(c.r, 0, 5)}`,
			'Filesystem      Size  Used Avail Use% Mounted on',
			`/dev/vda1        20G  ${int(c.r, 6, 9)}.${int(c.r, 0, 9)}G   ${int(c.r, 10, 13)}G  ${int(c.r, 31, 48)}% /`,
			c.s.count!
		]);
	},
	getcounts: (c) => {
		const p = parts(c.t - DAY);
		const day = `${p.y}/${pad(p.m + 1)}/${pad(p.d)}`;
		return fence([
			`$ grep '^${day}' /var/log/profiled.log | sed -E 's/^.{20}(get profile|signup) "[^"]*": //' | sort | uniq -c | sort -rn`,
			`    ${int(c.r, 120, 480)} storage: profile not found`,
			`     ${int(c.r, 12, 60)} storage: invalid profile id`,
			`      ${int(c.r, 1, 6)} write response: write tcp 127.0.0.1:8080->127.0.0.1:${int(c.r, 40000, 60999)}: write: broken pipe`,
			`$ zgrep -c 'GET /api/profiles/' /var/log/nginx/access.log.1`,
			String(int(c.r, 5200, 11800))
		]);
	},
	nginxconf: () => fence([
		"$ sed -n '/location \\/api\\//,/}/p' /etc/nginx/sites-enabled/larkspur",
		'    location /api/ {',
		'        proxy_pass http://127.0.0.1:8080/;',
		'        proxy_set_header Host $host;',
		'        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;',
		'        proxy_read_timeout 10s;',
		'        add_header Cache-Control "no-store" always;',
		'    }'
	]),
	perms: (c) => fence([
		`$ namei -l /srv/profiled/data/${c.member.id}.json`,
		`f: /srv/profiled/data/${c.member.id}.json`,
		'drwxr-xr-x root     root     /',
		'drwxr-xr-x root     root     srv',
		'drwxr-x--- profiled profiled profiled',
		'drwxr-x--- profiled profiled data',
		`-rw-r--r-- profiled profiled ${c.member.id}.json`,
		'$ sudo -u profiled find /srv/profiled/data ! -readable | wc -l',
		'0'
	]),
	handedits: (c) => {
		const lines = ['$ ls -lt --time-style=long-iso /srv/profiled/hand-edits | head -9', `total ${int(c.r, 40, 160)}`];
		let ms = c.t - int(c.r, 1, 3) * DAY;
		for (let i = 0; i < 8; i++) {
			const who = randomMember(c.r);
			const json = profileJson(who.id, who.name, who.email);
			lines.push(`-rw-r--r-- 1 profiled profiled ${bytes(json)} ${isoMinute(ms)} ${who.id}.json.${isoMinute(ms).slice(0, 10)}`);
			ms -= int(c.r, 1, 6) * DAY + int(c.r, 0, 600) * MINUTE;
		}
		return fence(lines);
	},
	editcounts: (c) => {
		const rows = ['| Month | Email changes | Name changes | Removals | Profile names | Other |', '| --- | ---: | ---: | ---: | ---: | ---: |'];
		for (let m = 6; m <= parts(c.t).m; m++) rows.push(`| ${MONTHS[m]} | ${int(c.r, 4, 14)} | ${int(c.r, 1, 6)} | ${int(c.r, 1, 5)} | ${int(c.r, 0, 2)} | ${int(c.r, 0, 3)} |`);
		return rows.join('\n');
	},
	crib: (c) => {
		const rows: [string, string, TeamKey | 'tech'][] = [
			['Logging in, passwords, reset emails, scam emails', 'Hollis (website)', 'web'],
			['Bookings, trip lists, leaders, phone numbers for trips', 'Fintan (trips committee)', 'trips'],
			['Payments, direct debits, refunds, membership cards', 'Ruth (treasurer)', 'money'],
			['Newsletter not arriving', 'Lucía (newsletter)', 'news'],
			['Gear loans and reminders', 'Kit (gear library)', 'gear'],
			['Forum names and pictures', 'Nadia (forum)', 'forum'],
			['Hut bookings', 'Gordon (hut warden)', 'hut'],
			['Profile name, name or email on the member page', 'tech volunteers', 'tech']
		];
		const team = c.s.teamkey;
		return ['| Member says | Goes to |', '| --- | --- |', ...rows.map(([what, who, key]) => `| ${what}${key === team ? ` (added ${longDate(c.t)})` : ''} | ${who} |`)].join('\n');
	},
	history: (c) => {
		const count = int(c.r, 10, 16);
		const json = JSON.stringify({ id: c.member.id, name: c.member.name, email: c.member.email });
		const lines = [`$ zgrep -h '${c.member.id}' /var/log/nginx/access.log* | sort -k4 | tail -${count}`];
		let ms = Math.max(c.t - int(c.r, 25, 45) * DAY, IMPORTED + DAY, Number(c.s.joinedms) + DAY);
		for (let i = 0; i < count; i++) {
			ms += int(c.r, 0, 3) * DAY + int(c.r, 5, 900) * MINUTE;
			if (ms > c.t) break;
			const from = pick(c.r, ['https://trips.larkspur.example/book', `https://larkspur.example/members/${c.member.id}`, 'https://trips.larkspur.example/leader/list', '-']);
			lines.push(proxyLine(c.r, ms, 'GET', `/api/profiles/${c.member.id}`, 200, bytes(json) + 1, from, pick(c.r, agents)));
		}
		return fence(lines);
	},
	nolog: (c) => fence([
		`$ grep -c '"${c.member.id}"' /var/log/profiled.log`,
		'0',
		`$ zgrep -c '/api/profiles/${c.member.id} ' /var/log/nginx/access.log*`,
		`/var/log/nginx/access.log:${int(c.r, 0, 6)}`,
		`/var/log/nginx/access.log.1:${int(c.r, 0, 9)}`,
		`/var/log/nginx/access.log.2.gz:${int(c.r, 0, 9)}`,
		`/var/log/nginx/access.log.3.gz:${int(c.r, 0, 12)}`
	])
};

const ordinals = ['second', 'third', 'fourth', 'fifth'];
const whens = ['since Sunday', 'all evening', 'for two days now', 'since the weekend', 'on and off all week', 'twice today'];
const cuts: [(local: string, domain: string) => string, string][] = [
	[(local) => `${local}@`, 'the address stops at the @'],
	[(local, domain) => `${local}@${domain.split('.')[0]}`, 'there is nothing after the name of the provider, no .com or anything'],
	[(_local, domain) => `@${domain}`, 'the part before the @ is missing']
];

// Members who joined days ago and have no profile yet, and members who made their profile themselves since signup opened.
const fresh = ['id-space', 'id-accent', 'email-space', 'down-evening'];
const recent = ['email-cut', 'never-saved', 'family'];
const bounceable = ['id-space', 'id-accent', 'email-space', 'never-saved', 'capital-link', 'old-link'];
const tried = ['id-space', 'id-accent', 'email-space', 'down-evening', 'never-saved', 'capital-link', 'old-link', 'login'];
const IMPORTED = Date.UTC(2026, 5, 21, 23, 12); // existing members' profiles were imported when profiled went live

const slotsFor = (r: Rand, index: number, topic: Topic, t0: number, desk: string, dev: string, deskOther: string, who?: [string, string]): Record<string, string> => {
	let first: string;
	let last: string;
	let id: string;
	let badid: string;
	let flaw: string;
	if (topic.member === 'accented') {
		const chosen = accented[(index + int(r, 0, accented.length - 1)) % accented.length]!;
		[first, last, badid, flaw] = chosen;
		id = `${slugOf(first)}-${slugOf(last)}`;
	} else {
		first = who ? who[0] : pick(r, firstNames);
		last = who ? who[1] : pick(r, surnames);
		const f = slugOf(first);
		const l = slugOf(last);
		id = pick(r, [`${f}-${l}`, `${f}${l[0]}`, `${f}-${l[0]}`, `${f[0]}${l}`, `${f}-${int(r, 2, 99)}`, `${f}${l}`]);
		[badid, flaw] = pick(r, [
			[`${first} ${last[0]}`, 'a capital letter and a space in it'],
			[`${first}${last}`, 'capital letters in it'],
			[`${f} ${l}`, 'a space in it'],
			[`${f}.${l}`, 'a full stop in it'],
			[`${f}_${l}`, 'an underscore in it'],
			[`${first}-${last}`, 'capital letters in it']
		] as [string, string][]);
	}
	const domain = pick(r, domains);
	const local = pick(r, [`${slugOf(first)}.${slugOf(last)}`, `${slugOf(first)}${int(r, 70, 99)}`, `${slugOf(first)[0]}${slugOf(last)}`]);
	const email = `${local}@${domain}`;
	const [cut, cutdesc] = pick(r, cuts);
	const other = { first: pick(r, firstNames), last: pick(r, surnames) };
	const otherid = topic.key === 'id-taken' ? id : `${slugOf(other.first)}-${slugOf(other.last)}`;
	const otherbadKind = r() < 0.5;
	const newlast = pick(r, surnames.filter((name) => name !== last));
	const received = parts(t0);
	const ahead = t0 + int(r, 5, 30) * DAY;
	const profiles = 2280 + Math.floor((index * 420) / ITEMS) + int(r, 0, 9);
	const behind = t0 - int(r, 3, 25) * DAY;
	const joined = fresh.includes(topic.key) ? t0 - int(r, 0, 6) * DAY : recent.includes(topic.key) ? Math.max(Date.UTC(2026, 5, 23, 10), t0 - int(r, 20, 100) * DAY) : t0 - int(r, 60, 2600) * DAY;
	const overday = t0 - int(r, 2, 20) * DAY;
	const amount = `£${pick(r, [38, 42, 46, 64, 72])}.00`;
	const scamdomain = pick(r, ['larkspur-members.example', 'larkspurclub-verify.example', 'larkspur-outdoor.example']);
	const hour = int(r, 18, 23);
	const kidfirst = pick(r, ['Arlo', 'Isla', 'Finn', 'Maeve', 'Kit', 'Ottilie', 'Reuben', 'Esme']);
	const oldname = topic.key === 'card' || topic.key === 'forum' || topic.key === 'stale-name-trips'
		? `${first} ${last.length > 5 ? last.slice(0, -2) + last.slice(-1) + last.slice(-2, -1) : last + 'e'}`
		: `${first} ${newlast}`;
	return {
		name: `${first} ${last}`,
		first,
		last,
		id,
		badid,
		flaw,
		email,
		bademail: topic.key === 'email-cut' ? cut(local, domain) : '',
		showbad: topic.key === 'email-cut' ? 'yes' : 'no',
		cutdesc,
		othername: `${other.first} ${other.last}`,
		otherfirst: other.first,
		otherid,
		otheremail: `${slugOf(other.first)}.${slugOf(other.last)}@${pick(r, domains)}`,
		otherfile: topic.key === 'wrong-person-email' ? 'wrong' : 'own',
		otherbad: otherbadKind ? `${other.first}-${other.last}` : `${slugOf(other.first)}-${slugOf(other.last)[0]}${slugOf(other.last)[1]}`,
		id2: topic.key === 'duplicate' ? `${slugOf(first)}${int(r, 2, 9)}` : `${slugOf(other.first)}-${slugOf(other.last)}`,
		newemail: `${slugOf(first)}.${slugOf(newlast)}@${pick(r, domains.filter((d) => d !== domain))}`.replace(`.${slugOf(newlast)}@`, topic.key === 'change-email' ? `.${slugOf(last)}@` : `.${slugOf(newlast)}@`),
		newname: topic.key === 'change-name' ? `${first} ${newlast}` : `${first} ${last}`,
		oldname,
		listname: topic.key === 'card' ? oldname : `${first} ${last}`,
		oldid: pick(r, [`${slugOf(first)}-the-${pick(r, ['goat', 'mountain-goat', 'bog-trotter', 'summit-snack'])}`, `${slugOf(first)}${slugOf(newlast)}`, `xx-${slugOf(first)}-xx`, `bigsteps${int(r, 70, 99)}`]),
		wantid: id,
		capid: pick(r, [id.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join('-'), id.charAt(0).toUpperCase() + id.slice(1), id.toUpperCase()]),
		kidfirst,
		kidid: `${slugOf(kidfirst)}-${slugOf(last)}`,
		trip: pick(r, trips),
		group: pick(r, groups),
		gear: pick(r, gearItems),
		leader: pick(r, leaders),
		desk: desk.split(' ')[0]!,
		deskother: deskOther.split(' ')[0]!,
		dev: dev.split(' ')[0]!,
		day: DAYS[parts(t0 - int(r, 1, 4) * DAY).wd]!,
		when: pick(r, whens),
		joinmonth: monthOf(joined),
		joinedms: String(joined),
		bookmonth: monthOf(t0 - int(r, 12, 70) * DAY),
		date1: longDate(ahead),
		date1ms: String(ahead),
		pastdate: longDate(behind),
		pastms: String(behind),
		overdate: longDate(overday),
		overiso: isoMinute(overday).slice(0, 10),
		backupdate: longDate(overday - DAY),
		time: `${pad(hour)}:${pad(int(r, 0, 11) * 5)}`,
		mtime: `${pad(int(r, 7, 9))}:${pad(int(r, 0, 11) * 5)}`,
		n: String(int(r, 2, 6)),
		n2: String(int(r, 6, 14)),
		nth: pick(r, ordinals),
		count: String(profiles),
		rounded: `${Math.floor(profiles / 1000)},${String(Math.floor((profiles % 1000) / 100) * 100).padStart(3, '0')}`,
		amount,
		memberno: String(int(r, 1000, 4999)),
		single: 'no',
		teamkey: topic.team ?? 'tech',
		forumuser: `${slugOf(first)}_${pick(r, ['walks', 'hills', 'outdoors', 'climbs'])}`,
		scamdomain,
		scamfrom: `membership@${scamdomain}`,
		received: `${received.d} ${MONTHS[received.m]}`,
		receivedms: String(t0)
	};
};

// The member's record as the desk's inbox shows it beside the thread: the membership list's row and earlier requests.
const record = (r: Rand, s: Record<string, string>, topic: Topic, listName: string): string => {
	if (topic.key === 'wrong-person-email' || (topic.key === 'bereavement' && r() < 0.6)) return '*No member record matches the sender.*';
	const joined = Math.floor(Number(s.joinedms) / DAY) * DAY;
	const p = parts(joined);
	const membership = topic.key === 'family' ? (s.single === 'yes' ? 'single' : 'family') : pick(r, ['single', 'single', 'single', 'family', 'concession']);
	const isNew = fresh.includes(topic.key);
	const lines = [
		`Member record: no. ${s.memberno} · ${listName} · joined ${p.d} ${MONTHS[p.m]} ${p.y} · ${membership}, paid to 31 March 2027 · email on the list: ${s.email}`
	];
	const booked = isNew || noProfile.includes(topic.key) ? 0 : int(r, 0, 5);
	if (booked) {
		lines.push('', '| Trip booked | Date | Leader | Status |', '| --- | --- | --- | --- |');
		const received = Number(s.receivedms);
		const from = Math.max(joined, IMPORTED, received - 90 * DAY) + 7 * DAY;
		const dates = Array.from({ length: booked }, () => from + int(r, 0, Math.floor((received + 60 * DAY - from) / DAY)) * DAY).sort((a, b) => a - b);
		shuffle(r, trips).slice(0, booked).forEach((trip, i) => {
			const at = dates[i]!;
			lines.push(`| ${trip.replace(/^the /, '')} | ${longDate(at)} | ${pick(r, leaders)} | ${pick(r, at < received ? ['attended', 'attended', 'attended', 'cancelled'] : ['confirmed', 'confirmed', 'waiting list'])} |`);
		});
	}
	const span = Math.floor((Number(s.receivedms) - joined) / DAY);
	const count = isNew || span < 30 ? 0 : int(r, 0, Math.min(5, Math.floor(span / 45)));
	if (count) {
		lines.push('', '| Earlier request | Subject | Handled by |', '| --- | --- | --- |');
		const dates = Array.from({ length: count }, () => joined + int(r, 7, span - 7) * DAY).sort((a, b) => a - b);
		const subjects = shuffle(r, earlier);
		dates.forEach((at, i) => lines.push(`| ${stamp(at + int(r, 8 * 60, 21 * 60) * MINUTE)} | ${subjects[i]} | ${pick(r, deskTeam)} |`));
	}
	return lines.join('\n');
};

// Topics the desk settles with another team, without the tech volunteers, so a member can raise one beside the main matter.
const extraKeys = ['login', 'booking', 'fees', 'newsletter', 'gear', 'forum', 'hut', 'card', 'scam-email', 'stale-name-trips', 'phone-field', 'photo'];
const noExtras = [...fresh, 'never-saved', 'wrong-person-email', 'bereavement'];
// Members with no profile to look up, and what a tech volunteer says before pasting a profile's recent lookups.
const noProfile = [...fresh, 'never-saved', 'wrong-person-email', 'bereavement', 'rename-id', 'empty-club'];
const histories = [
	'For completeness, every lookup of their profile in the proxy log this month, all answered:',
	'And their recent lookups, in case anything else was going on. Nothing odd:',
	'I also went through the proxy log for their profile name. Normal traffic, all 200s:',
	'Recent requests for this profile, for the record:'
];
const lowerFirst = (text: string) => (/^(I[ ']|\{)/.test(text) ? text : text.charAt(0).toLowerCase() + text.slice(1));
const raiseEarly = ["Also, while I'm writing: ", 'Separately, ', 'And one other thing: ', 'Something else, while I have you: '];
const quickFirst = ['A quick one first: ', 'Two things, the easy one first: ', 'First, the small thing: '];
const mainNext = ["But the main reason I'm writing: ", 'The bigger problem: ', 'And the real reason for this message: '];
const raiseLate = ['Thanks for sorting that. Separately, ', 'Thank you! While I have you: ', 'Great, thanks. Something else has come up: ', 'Thanks again. A different question: '];
const otherPoint = ['On your other point: ', 'About the other thing you mentioned: ', 'As for your second question: '];
const otherDetail = ['And on the other thing: ', 'About the second question: ', 'On the other matter: '];
const otherAnswer = ['About your other question: ', 'On the other matter: ', 'As for the other thing: ', ''];

const outcomesSeen = new Map<string, number>();
const request = (index: number, topic: Topic, number: number, t0: number): string => {
	const r = mulberry32(0x1a5c0000 + index * 7919);
	const seen = outcomesSeen.get(topic.key) ?? 0;
	outcomesSeen.set(topic.key, seen + 1);
	const available = Object.keys(topic.endings) as Outcome[];
	const outcome = available[(seen + int(r, 0, 1)) % available.length]!;
	let [desk, deskOther] = shuffle(r, deskTeam) as [string, string];
	const [dev, devOther] = shuffle(r, devs) as [string, string];
	const s = slotsFor(r, index, topic, t0, desk, dev, deskOther);
	if (topic.key === 'family' && outcome === 'passed') s.single = 'yes';
	const filler = (slots: Record<string, string>, key: string) => (text: string, extra: Record<string, string> = {}) =>
		text.replace(/\{(\w+)\}/g, (_, name: string) => {
			const value = extra[name] ?? slots[name];
			if (value === undefined) throw new Error(`no slot ${name} in ${key}`);
			return value;
		});
	const fill = filler(s, topic.key);
	const member = { id: topic.key === 'rename-id' ? s.oldid! : s.id!, name: s.name!, email: s.email! };
	const style = pick(r, ['formal', 'chatty', 'brief', 'brief', 'chatty'] as Style[]);
	let t = t0;
	const ctx: Ctx = { r, s, t, t0, member };
	const messages: string[] = [];
	const advance = (low: number, high: number) => {
		let gap = int(r, low, high) * MINUTE;
		if (t + gap > LIMIT) gap = Math.max(MINUTE, Math.floor((LIMIT - t) / 6));
		t += gap;
		const hour = parts(t).h;
		if (hour < 7 && t + 9 * 60 * MINUTE < LIMIT) t += (7 - hour) * 60 * MINUTE + int(r, 0, 300) * MINUTE;
		ctx.t = t;
	};
	const post = (who: string, label: string, body: string) => messages.push(`**${who}**${label ? `, ${label}` : ''} · ${stamp(t)}\n\n${body}`);
	const sign = () => (style === 'formal' ? s.name! : style === 'chatty' ? `${s.first}${r() < 0.3 ? ' x' : ''}` : r() < 0.5 ? s.first! : '');
	const memberSay = (text: string) => {
		const tail = [r() < 0.4 ? pick(r, signoffs[style]) : '', sign(), r() < 0.12 ? 'Sent from my phone' : ''].filter(Boolean).join('\n');
		post(s.name!, '', [text, tail].filter(Boolean).join('\n\n'));
	};
	const deskSay = (text: string, who = desk) => post(who, 'membership desk', [fill(pick(r, deskHi)), text, fill(pick(r, deskBye), { desk: who.split(' ')[0]! })].join('\n\n'));
	const withArt = (text: string, art?: Art, slots = s) => (art ? `${text}\n\n${arts[art]({ ...ctx, s: slots })}` : text);
	/** One step of an ending; a second matter's steps carry its own slots, team and a lead-in for the desk's first answer. */
	const run = (step: Step, f = fill, slots = s, own = topic, lead = '') => {
		const [role, text, art] = step;
		const team = teams[own.team ?? 'web'];
		if (role === 'm') {
			advance(30, 2000);
			memberSay(withArt(f(text), art, slots));
		} else if (role === 'd' || role === 'dl') {
			if (role === 'd') advance(60, 1500);
			else advance(4000, 9000);
			deskSay(lead + withArt(f(text), art, slots));
		} else if (role === 'n' || role === 'nl') {
			if (role === 'n') advance(3, 240);
			else advance(5000, 10000);
			post(desk, 'internal note', withArt(f(text), art, slots));
		} else if (role === 'v') {
			advance(20, 1800);
			post(dev, 'internal note', withArt(f(text), art, slots));
		} else {
			advance(60, 2500);
			post(team.name, `${team.role}, internal note`, withArt(f(text), art, slots));
		}
	};

	// Other matters the member raises along the way, which the desk settles with another team.
	const pool = noExtras.includes(topic.key) ? [] : topics.filter((other) => extraKeys.includes(other.key) && other.key !== topic.key && other.team !== topic.team);
	const extras = shuffle(r, pool)
		.slice(0, pool.length ? (r() < 0.1 ? 0 : r() < 0.5 ? 2 : 1) : 0)
		.map((other, k) => {
			const r2 = mulberry32(0x5ec00000 + index * 131 + k * 17);
			const slots = { ...slotsFor(r2, index, other, t0, desk, dev, deskOther, [s.first!, s.last!]) };
			for (const key of ['name', 'first', 'last', 'id', 'email', 'joinmonth', 'joinedms', 'memberno', 'receivedms']) slots[key] = s[key]!;
			const outs = Object.keys(other.endings) as Outcome[];
			const result = pick(r2, outs);
			return { topic: other, slots, outcome: result, fill: filler(slots, other.key) };
		});
	type Extra = (typeof extras)[number];
	const settle = (extra: Extra, early: boolean) => {
		let first = early;
		for (const step of pick(r, extra.topic.endings[extra.outcome]!)) {
			if (step[0] === 'v') continue;
			const lead = first && step[0] === 'd' ? pick(r, otherAnswer) : '';
			if (step[0] === 'd') first = false;
			run(step, extra.fill, extra.slots, extra.topic, lead);
		}
	};
	const channel = pick(r, ['form', 'form', 'form', 'email', 'email', 'phone']);
	const early = extras.length && channel !== 'phone' && r() < 0.55 ? extras[0] : undefined;
	const late = extras.filter((extra) => extra !== early);

	// The member writes in. Sometimes the other matter comes first, and gives the request its subject line.
	// Someone writing about another person's record gets no club small talk.
	const outsider = topic.key === 'wrong-person-email' || topic.key === 'bereavement';
	const side = channel !== 'phone' && !outsider && r() < 0.28 ? pick(r, sides) : undefined;
	const leading = early && !side && r() < 0.4;
	const open = fill(pick(r, topic.opens));
	if (channel === 'phone') {
		post(desk, 'phone message', `${s.name} left a message on the desk phone. Written up as close to word for word as I could manage:\n\n> ${open}\n\nNo email given on the call, so I'm replying to the address on the membership list.`);
	} else {
		const greeting = pick(r, greetings[style]);
		const body = [
			greeting,
			side ? pick(r, sideFirst) + side[0] : '',
			leading ? pick(r, quickFirst) + early.fill(lowerFirst(pick(r, early.topic.opens))) : '',
			!outsider && r() < 0.35 ? pick(r, fresh.includes(topic.key) || recent.includes(topic.key) ? newcomers : regulars) : '',
			leading ? pick(r, mainNext) + lowerFirst(open) : open,
			tried.includes(topic.key) && r() < 0.5 ? pick(r, tries) : '',
			early && !leading ? pick(r, raiseEarly) + early.fill(lowerFirst(pick(r, early.topic.opens))) : '',
			!outsider && r() < 0.3 ? pick(r, tangents) : ''
		].filter(Boolean).join('\n\n');
		memberSay(body);
	}
	advance(60, 1800);
	deskSay(
		[[channel === 'phone' ? 'Thanks for your message on the desk phone.' : pick(r, deskAck), side ? pick(r, sideReply) + side[1] : '', fill(pick(r, topic.asks))].filter(Boolean).join(' '), early ? pick(r, otherPoint) + early.fill(pick(r, early.topic.asks)) : '']
			.filter(Boolean)
			.join('\n\n')
	);
	advance(30, 2000);
	const later = !outsider && r() < 0.2 ? pick(r, sides.filter((item) => item !== side)) : undefined;
	memberSay(
		[
			fill(pick(r, byOutcome(topic.details, outcome))),
			early ? pick(r, otherDetail) + early.fill(pick(r, byOutcome(early.topic.details, early.outcome))) : '',
			later ? pick(r, sideLater) + later[0] : '',
			!outsider && r() < 0.15 ? pick(r, tangents) : ''
		].filter(Boolean).join('\n\n')
	);
	if (later) {
		advance(60, 1500);
		deskSay(`Thank you, that's very helpful. I've passed it to our tech volunteers and I'll be back in touch when I hear. ${pick(r, sideReply) || 'On the other thing: '}${later[1]}`);
	}

	// The desk passes it on; the tech volunteers pick it up.
	if (r() < 0.15) {
		advance(60, 1200);
		post(deskOther, 'internal note', `${fill(pick(r, coverNotes), { deskother: desk.split(' ')[0]! })} ${fill(pick(r, topic.forward))}`);
		[desk, deskOther] = [deskOther, desk];
	} else {
		advance(3, 120);
		post(desk, 'internal note', fill(pick(r, topic.forward)) + (r() < 0.12 ? ` ${fill(pick(r, asides))}` : ''));
	}
	if (bounceable.includes(topic.key) && r() < 0.25) {
		const [ask, reply] = pick(r, bounce);
		advance(10, 300);
		post(desk, 'internal note', ask);
		advance(60, 1500);
		post(teams.web.name, 'website team, internal note', reply);
	}
	if (early) settle(early, true);
	const urgent = topic.key === 'empty-club';
	if (urgent) {
		advance(10, 60);
		post(dev, 'internal note', 'Looking now.');
	} else if (r() < 0.4) {
		advance(600, 3000);
		post(devOther, 'internal note', fill(pick(r, away)));
		advance(30, 600);
		post(dev, 'internal note', pick(r, onIt));
	} else if (r() < 0.3) {
		advance(2000, 5000);
		post(desk, 'internal note', fill(pick(r, bumps)));
	}
	if (!urgent && r() < 0.3) {
		advance(2000, 6000);
		memberSay(fill(pick(r, chasers)));
		advance(30, 600);
		deskSay(fill(pick(r, holding)));
	}
	const [findText, findArt] = pick(r, byOutcome(topic.finding, outcome));
	if (urgent) advance(15, 50);
	else advance(60, 2400);
	post(dev, 'internal note', withArt(fill(findText), findArt));
	if (!noProfile.includes(topic.key) && r() < 0.5) {
		advance(5, 120);
		post(dev, 'internal note', withArt(pick(r, histories), 'history'));
	}
	const talk = shuffle(r, talks[topic.area].filter((item) => !item[3]?.includes(topic.key)));
	for (const [question, answer, art] of talk.slice(0, r() < 0.85 ? (r() < 0.35 ? 2 : 1) : 0)) {
		advance(30, 900);
		post(devOther, 'internal note', fill(question));
		advance(20, 600);
		post(dev, 'internal note', withArt(fill(answer), art));
	}

	// How it ended, then anything the member raises afterwards.
	for (const step of pick(r, topic.endings[outcome]!)) run(step);
	const prefixes = shuffle(r, raiseLate);
	for (const [k, extra] of (outcome === 'waiting' ? [] : late).entries()) {
		advance(600, 4000);
		memberSay(prefixes[k]! + extra.fill(lowerFirst(pick(r, extra.topic.opens))));
		advance(60, 1500);
		deskSay(extra.fill(pick(r, extra.topic.asks)));
		advance(30, 2000);
		memberSay(extra.fill(pick(r, byOutcome(extra.topic.details, extra.outcome))));
		settle(extra, false);
	}
	if (outcome !== 'waiting' && topic.key !== 'wrong-person-email' && !(topic.key === 'id-accent' && outcome === 'needs') && r() < 0.6) {
		const after = shuffle(r, afters[topic.area].filter((item) => !item[3]?.includes(topic.key)));
		for (const [question, answer] of after.slice(0, r() < 0.3 ? 2 : 1)) {
			advance(30, 2000);
			memberSay(fill(question));
			advance(60, 1500);
			deskSay(fill(answer));
		}
	}

	const subject = leading ? early.fill(pick(r, early.topic.subjects)) : fill(pick(r, topic.subjects));
	const header = [`# Request ${number}: ${subject}`, `Received ${stamp(t0)}, ${channel === 'form' ? 'through the help form on the website' : channel === 'email' ? 'by email to membership@larkspur.example' : 'as a message on the desk phone'}, from ${s.name}`];
	const card = extras.find((extra) => extra.topic.key === 'card');
	return [...header, record(r, s, topic, topic.key === 'card' ? s.oldname! : card ? card.slots.oldname! : s.name!), ...messages.map((message) => `---\n\n${message}`)].join('\n\n') + '\n';
};

// Topics come in shuffled rounds, so the first requests keep their topic whatever ITEMS is.
const order = mulberry32(20261120);
const sequence: Topic[] = [];
while (sequence.length < ITEMS) sequence.push(...shuffle(order, topics));
const folder = join(root, 'docs', 'help-requests');
mkdirSync(folder, { recursive: true });
let number = 3101;
for (let index = 0; index < ITEMS; index++) {
	const r = mulberry32(0x7e110000 + index * 104729);
	number += int(r, 1, 9);
	const day = Math.floor((index * SPAN_DAYS) / ITEMS);
	const t0 = FIRST + day * DAY + int(r, 7 * 60, 23 * 60 - 1) * MINUTE;
	writeFileSync(join(folder, `${number}.md`), request(index, sequence[index]!, number, t0));
}
writeFileSync(
	join(folder, 'README.md'),
	`# Help requests\n\nThe ${ITEMS} help requests about member profiles that the membership desk handled between 1 July and 31 October\n2026, one file each, exported from the desk's shared inbox on 20 November with each thread as it stood that day.\n"Internal note" marks a comment by the desk or the tech volunteers that the member never saw. The inbox keeps no\ntags or statuses, so what a request turned out to be about and how it ended are only in its thread.\n`
);
