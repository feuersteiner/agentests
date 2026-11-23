// Writes the long material of this entry's long tasks: the escalations Harbourline's app support desk raised to
// the Tidegate team between 6 July and 13 November 2026, one Markdown file each, with their threads, under
// support/escalations/. Deterministic: fixed seeds, no clock, no network.
//   bun long/generate.ts <workspace root>
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** How many escalations to write. Dates, numbering and the mix of causes all follow from it. */
const ITEMS = 447;

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
const cap = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const pad = (value: number) => String(value).padStart(2, '0');
const hex = (r: Rand, length: number) => Array.from({ length }, () => '0123456789abcdef'[Math.floor(r() * 16)]).join('');

// Calendar. Dates are ISO strings; a Date is only ever built from one.
const toDate = (date: string) => new Date(`${date}T12:00:00Z`);
const addDays = (date: string, days: number): string => {
	const d = toDate(date);
	d.setUTCDate(d.getUTCDate() + days);
	return d.toISOString().slice(0, 10);
};
const weekday = (date: string) => toDate(date).getUTCDay();
const isWorkday = (date: string) => weekday(date) >= 1 && weekday(date) <= 5;
const nextWorkday = (date: string, days = 1): string => {
	let out = date;
	for (let left = days; left > 0; ) {
		out = addDays(out, 1);
		if (isWorkday(out)) left--;
	}
	return out;
};
const prevWorkday = (date: string, days = 1): string => {
	let out = date;
	for (let left = days; left > 0; ) {
		out = addDays(out, -1);
		if (isWorkday(out)) left--;
	}
	return out;
};
const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const longMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const shortDate = (date: string) => `${Number(date.slice(8))} ${monthNames[Number(date.slice(5, 7)) - 1]} ${date.slice(0, 4)}`;
const plainDate = (date: string) => `${Number(date.slice(8))} ${longMonths[Number(date.slice(5, 7)) - 1]}`;
const clock = (minutes: number) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;

const FIRST_DAY = '2026-07-06';
const LAST_DAY = '2026-11-13';
const LAST_COMMENT = '2026-11-20';
const workdays: string[] = [];
for (let date = FIRST_DAY; date <= LAST_DAY; date = addDays(date, 1)) if (isWorkday(date)) workdays.push(date);

// Releases the material refers to.
const GW_040 = '2026-09-01'; // Tidegate 0.4.0: accounts lock after ten refusals in a row; the import skips tombstones without a revision.
const FN_390 = '2026-08-18';
const FN_391 = '2026-09-29';
const FN_392 = '2026-10-27';
const ST_1123 = '2026-10-13';
const PILOTS = '2026-10-05'; // the forth-pilots provider goes live
const PORTAL = '2026-10-12'; // the contractor portal goes live

// People.
const desk = ['Nadia Okoro', 'Ewan Baird', 'Priti Desai', 'Lachlan Moir', 'Joanna Kerr'];
const gateway = ['Tom Reyes', 'Ilse Brandvold', 'Kofi Mensah', 'Ruth Abernethy'];
const appTeam = ['Sami Laine', 'Grace Tolan'];
const office = ['Hamish Duthie', 'Verity Chen'];
const itTeam = ['Morven Lyall', 'Arjun Pillai'];
const firstNames = ['Calum', 'Shona', 'Iain', 'Morag', 'Fraser', 'Kirsty', 'Ruaridh', 'Ailsa', 'Duncan', 'Eilidh', 'Gregor', 'Isla', 'Hamza', 'Catriona', 'Niall', 'Rhona', 'Torquil', 'Mhairi', 'Lewis', 'Fiona', 'Ross', 'Agnieszka', 'Euan', 'Lorna', 'Craig', 'Siobhan', 'Murdo', 'Kerry', 'Jamie', 'Ingrid', 'Alasdair', 'Beth', 'Tomasz', 'Ishbel', 'Gavin', 'Marsaili'];
const surnames = ['Rennie', 'MacAulay', 'Bruce', 'Sutherland', 'Gunn', 'Mackay', 'Ross', 'Leask', 'Tulloch', 'Ritchie', 'Paterson', 'Morrison', 'Nicolson', 'Shearer', 'Coutts', 'Fyfe', 'Strachan', 'Bain', 'Mowat', 'Duthie', 'Innes', 'Wilk', 'Halcrow', 'Flett'];
const sites = ['Aberdeen', 'Peterhead', 'Fraserburgh', 'Montrose', 'Leith', 'Rosyth', 'Invergordon', 'Wick', 'Lerwick', 'Kirkwall', 'Stornoway', 'Ullapool', 'Oban', 'Mallaig'];
const assets = ['fender 14 on the north quay', 'the Albert Quay crane rail', 'pontoon C', 'the east breakwater lights', 'the berth 7 bollards', 'the fuel jetty', 'the slipway winch', 'buoy NB-12', 'the lock gate seals', 'the ro-ro ramp', 'the fish market roof', 'the ice plant'];
const oldDevices = ['XCover 6 Pro', 'XCover 5', 'Galaxy A52', 'Tab Active3'];
const depts = ['finance', 'marine survey', 'ferry terminal', 'engineering', 'estates'];
const shifts = ['days, 07:00 to 19:00', 'earlies, 06:00 to 14:00', 'lates, 14:00 to 22:00', 'nights this week', 'four on, four off', 'office hours'];
const redirectWhy = [
	"after IT's tidy-up of addresses nobody seemed to be using",
	'after the move to the new harbour-id tenant, which copied the applications across but not every address on them',
	"since somebody added the test gateway's address and replaced the live one instead of adding to it"
];
const groupWhy = ['was filed before their account existed and was quietly skipped', 'only asked for email and the intranet', "came through as a transfer, and transfers keep the old department's groups"];

// Apps and the databases they sync.
type AppKey = 'notes' | 'berths' | 'stores';
interface App {
	name: string;
	db: string;
	tag: string;
	roles: string[];
	android: string[];
	ios: string[];
	versions: [string, string][];
}
const apps: Record<AppKey, App> = {
	notes: {
		name: 'Field Notes',
		db: 'field-notes',
		tag: 'PHN',
		roles: ['deckhand', 'pilot boat skipper', 'maintenance fitter', 'quay inspector', 'crane driver', 'linesman', 'diver', 'electrician', 'marine surveyor', 'dredger mate'],
		android: ['Samsung Galaxy XCover 7 · Android 15', 'Samsung Galaxy XCover 6 Pro · Android 14', 'Samsung Galaxy Tab Active5 · Android 14'],
		ios: ['iPhone 15 · iOS 18.6', 'iPhone 13 · iOS 18.5', 'iPhone SE · iOS 18.6'],
		versions: [['2026-06-01', '3.8.4'], [FN_390, '3.9.0'], [FN_391, '3.9.1'], [FN_392, '3.9.2']]
	},
	berths: {
		name: 'Berth Board',
		db: 'berth-plans',
		tag: 'TAB',
		roles: ['berthing officer', 'duty harbour master', 'assistant harbour master', 'port control officer'],
		android: [],
		ios: ['iPad (10th generation) · iPadOS 18.6', 'iPad Air · iPadOS 18.5'],
		versions: [['2026-05-01', '2.4.0'], ['2026-09-15', '2.4.1']]
	},
	stores: {
		name: 'Stores',
		db: 'depot-stock',
		tag: 'HHD',
		roles: ['storeman', 'store assistant', 'stores supervisor'],
		android: ['Zebra TC58 · Android 13', 'Zebra TC53 · Android 13'],
		ios: [],
		versions: [['2026-06-01', '1.12.1'], ['2026-08-04', '1.12.2'], [ST_1123, '1.12.3']]
	}
};
const versionOn = (app: App, date: string, lag: number) => {
	const live = app.versions.filter(([from]) => from <= date);
	return live[Math.max(0, live.length - 1 - lag)]![1];
};

// What the desk saw: the symptom as it was reported, and the talk around it. A family never says what the cause was.
interface Family {
	tries: [string, string][];
	titles: string[];
	report: string[];
	many?: string[];
	manyTitles?: string[];
	quotes: string[];
	tried: string[];
	impact: string[];
	muse: string[];
	meanwhile: string[];
	updates: string[];
}
const families: Record<string, Family> = {
	pw: {
		tries: [["Could {first} restart the phone and try once more, slowly?", "Done, with me on the line. Same message."], ["Can {first} try on wifi rather than mobile data, in case something on the way is interfering?", "Tried on the office wifi at {site}. No difference."], ["Could {first} clear the app's storage and set it up from scratch?", "Done. No change, and they had to set their preferences up again."]],
		titles: ['{first} at {site} cannot sign in to {app}', "{app}: 'wrong name or password' for {aRole} who is sure of it", 'Sign-in refused on {app} for {user}', '{site} {role} keeps being told the password is wrong'],
		report: [
			'{user}, {aRole} at {site}, rang the desk on {day} morning. {app} tells them the name or password is wrong every time, and they are certain it is not.',
			"Raised after a call from {site}. {user} ({role}) cannot get into {app}: the sign-in screen comes straight back with 'Wrong name or password'.",
			"The {site} supervisor, {manager}, emailed on behalf of {user}, who has not been able to sign in to {app} since {day}. The message on screen is 'Wrong name or password'."
		],
		quotes: ['I have typed it twenty times. It is the same password I use for the timesheets and that works fine.', 'It worked on Friday and I have not changed a thing.', 'Can somebody just let me in? I have checks to do before the tide turns.', 'I even wrote it down and typed it letter by letter. Same answer.'],
		tried: [
			'We reset the password from the accounts page while {first} was on the phone and had them try the new one. Same message.',
			'We checked the account exists and is spelt the way we have it, and talked {first} through typing the password slowly with it shown on screen. No change.',
			'{first} had already reinstalled the app on the advice of a colleague, which made no difference, and we tried a second reset to be sure.'
		],
		impact: [
			'{first} cannot record anything on the device, so the checks are going on paper and will have to be typed in later.',
			"It is holding up the morning round at {site}: {first}'s jobs are being shared out among the others.",
			'{manager} is keen to have it sorted because {first} is the only {role} on that shift.',
			'There is no rush to the minute, but it has gone on long enough that the crew have started making jokes about it.'
		],
		muse: [
			"A 'wrong name or password' from the gateway means one of three things: the password does not match, the name does not match an account, or the account is switched off. It gives the same answer for each, deliberately, so the screen does not help us tell them apart.",
			'A reset that works on our side and still fails on the device usually means the problem is not the password itself.',
			'If the password really is right, then either the name is not reaching us the way we think it is, or the account is not in a state to accept it.'
		],
		meanwhile: ['writing the checks on paper', "using {colleague}'s device", 'phoning results through to the office', 'doing other work until it is sorted'],
		updates: ['{first} asked again this morning whether there is any news.', 'Nothing new from {site}; {first} is still on paper.', '{manager} has asked whether there is anything the desk can do in the meantime. I said not yet.']
	},
	lock: {
		tries: [["Could {first} try once more after the shift change? I want to see whether anything changes by itself.", "Tried at {time2}. Still locked."], ["Can you reset the password once more from the accounts page, then have {first} try?", "Done. Still locked with the new password."], ["Could {first} send a fresh diagnostics export straight after the next attempt?", "Sent. It shows the attempt answered with 403 again."]],
		titles: ['{first} ({site}) locked out of {app}', "'Account locked' on {app} at {site}", '{site}: {app} says the account is locked', 'Locked account on {app}, {user}'],
		report: [
			"{user} at {site} gets 'Account locked' from {app}. They say they only tried once this morning, and with the right password.",
			"Call from {site}: {app} shows 'Your account is locked' as soon as {first} tries to sign in, whatever they type.",
			'{manager}, who supervises at {site}, reports that {first} has been locked out of {app} since {day} and asks how long a lock lasts.'
		],
		quotes: ['It says locked, but I had only just switched the thing on.', 'How long does a lock last? Nobody here seems to know.', 'Everybody is stood waiting for me.', 'I have not even had a chance to get it wrong.'],
		tried: [
			'We reset the password from the accounts page, but the app still says locked with the new one.',
			'There is no unlock button on our side that we can find, so we are raising it here.',
			'We told them to wait an hour and try again, which is what the old help page says. Still locked in the afternoon.'
		],
		impact: [
			'{first} is the only one on shift who can do this part of the job on the device, so the others are working round them.',
			'The lock has cost {first} most of a shift so far.',
			'{manager} has asked whether the lock will clear by itself overnight, because nobody at {site} knows.',
			'Other people at {site} are nervous about signing in in case the same thing happens to them.'
		],
		muse: [
			'An account locks after ten refusals in a row, and only a successful sign-in puts the count back to nothing. Once it is locked there is no successful sign-in to be had, so it stays locked until the gateway restarts.',
			'Ten refusals in a row is a lot for one person to rack up without noticing. When somebody says they only tried once, it is usually true, and something or somebody else did the other nine.',
			'The count of refusals is kept per name, in the gateway\'s memory, and it does not care which device the attempts come from.'
		],
		meanwhile: ["borrowing {colleague}'s device", 'working from a paper list', 'waiting for the office to sort it', 'doing jobs that need no device'],
		updates: ['Still locked this morning, {first} says.', '{manager} asked again whether there is a way to unlock just this one account.', 'No change. {first} has been very good about it.']
	},
	oidc: {
		tries: [["Could {first} try once on mobile data and once on wifi?", "Both tried. Same result each way."], ["Can {first} sign out of Harbourline ID completely in the browser and start again?", "Done. Same as before."], ["Could {first} try once more at a quieter time, in case it is load?", "Tried at {time2}. No different."]],
		titles: ['Harbourline ID sign-in fails on {app}', "{app}: 'Sign in with Harbourline ID' goes round in a circle", 'Cannot sign in with Harbourline ID at {site}', 'Harbourline ID button not working for {first}'],
		report: [
			"{user} ({role}, {site}) taps 'Sign in with Harbourline ID' in {app}, gets as far as the Harbourline ID page, and never ends up signed in.",
			'Report from {site} this morning: signing in to {app} with Harbourline ID does not work for {first}. The password page appears and accepts the password, and that is as far as it goes.',
			'{first}, {aRole} at {site}, cannot sign in to {app} with Harbourline ID. They end up back at the sign-in screen or stuck part way, depending on the attempt.'
		],
		quotes: ['I sign in, it thinks for a second, and I am back where I started.', 'Email works, the intranet works, only this does not.', 'I have done it the same way every morning for a year.', 'Is it something I have done? I did update the phone at the weekend.'],
		tried: [
			'{first} can sign in to email and the intranet with the same Harbourline ID, so the account itself is working.',
			"We had them clear the app's data and try again from scratch. Same result.",
			"We checked that {first}'s Harbourline ID account is active and not locked at harbour-id; it is."
		],
		impact: [
			'Without Harbourline ID {first} has no way into {app} at all; they have never had a password account.',
			'The {site} crews start at 07:00 and the first hour is when most of them sign in, so the timing could hardly be worse.',
			'{manager} says they are getting through the morning on paper and the radio.',
			'It is stopping {first} from closing jobs, which shows up on the weekly figures.'
		],
		muse: [
			'Sign-in with Harbourline ID has three legs: the app sends the person to harbour-id, harbour-id sends them back to our callback with a code, and the gateway trades the code with harbour-id. It helps to know which leg breaks.',
			'If the account works for email and the intranet, harbour-id itself is happy with the person. The question is whether it is happy with them using this application, and whether we ever get the code back.',
			'With a Harbourline ID failure, the first thing to settle is whether it is one person or everybody.'
		],
		meanwhile: ['signing in with a password account where they have one', 'working on paper', "using a colleague's signed-in device", 'phoning results through'],
		updates: ['{first} tried again this morning; same result.', 'No change at {site} today.', '{manager} would like to know whether to keep trying or wait for us.']
	},
	pilots: {
		tries: [["Could {first} try once on mobile data and once on wifi?", "Both tried. Same result each way."], ["Can {first} sign out of their company account completely in the browser and start again?", "Done. Same as before."]],
		titles: ['Forth Pilotage pilots cannot sign in to {app}', "Pilots' company sign-in fails on {app}", '{app}: new pilot sign-in not working at {site}'],
		report: ['{user}, one of the Forth Pilotage pilots working out of {site}, cannot sign in to {app} with their company account.', "Report from {site}: the pilots who moved to their own company's sign-in this month cannot get into {app}. {first} rang on behalf of the group."],
		quotes: ['We were told this would save us a password. So far it has cost us a morning.', 'Our own company sign-in works for everything else.', 'Is it us or you?'],
		tried: ["We had {first} clear the app's data and try again from scratch. Same result.", 'We confirmed {first} is on a current version of {app}.'],
		impact: ['The pilots are working from paper and the radio for their boarding notes.', "Forth Pilotage's operations manager has asked when it will be fixed.", 'The pilots no longer have Harbourline passwords, so they have no other way in.'],
		muse: ["Signing in through a provider has three legs: the app sends the person to the provider, the provider sends them back to our callback with a code, and the gateway trades the code at the provider's token endpoint. It helps to know which leg breaks."],
		meanwhile: ['working from paper', 'phoning boarding notes through'],
		updates: ['Still no pilots in.', 'Forth Pilotage asked for an update.']
	},
	out: {
		tries: [["Could {first} sign out properly from the menu and back in, rather than just closing the app?", "Done. It made no difference."], ["Could {first} restart the phone itself, not just the app?", "Done. It made no difference."]],
		titles: ['{app} signs {first} out several times a day', '{app} keeps asking {first} to sign in', 'Unexpected sign-outs on {app}'],
		manyTitles: ['{site}: crews having to sign in again and again'],
		report: [
			'{user} ({role}, {site}) is signed out of {app} at odd moments and has to sign in again, sometimes several times a shift.',
			'{first} at {site} rang to say {app} forgets them: they sign in, work, and some time later find the sign-in screen again.'
		],
		many: ['{manager} at {site} says the crew, {user} ({role}) among them, keep being thrown back to the {app} sign-in screen, and asks whether something has changed.'],
		quotes: ['Five times today. Try typing a password with gloves on, on a boat.', 'Every morning it has forgotten me.', 'I lost a half-written report the last time it happened.', 'It is not the end of the world, but it is wearing.'],
		tried: [
			'We checked that {first} is on a current version of {app} and that the device has free space. Both fine.',
			'We had them sign out and back in, and reinstall, which made no difference.',
			'Nothing on the account looks unusual to us.'
		],
		impact: [
			'Each time it happens {first} loses whatever they had half typed.',
			'It is not stopping the work, but it is slowing everybody down and testing tempers.',
			'{manager} says people have started writing things down first and typing them in at the end of the shift, which rather defeats the point of the app.',
			'Signing in again on a rugged handset with gloves on takes a couple of minutes each time.'
		],
		muse: [
			'A session from the gateway lasts 24 hours unless something ends it first: a sign-out, a restart of the gateway, or the device throwing it away. Each of those leaves a different pattern.',
			'If the sessions are ending on our side we would see them go; if they are ending on the device, our side would still think they are good.',
			'The useful questions are whether it is one person or many, and whether it happens at a particular time.'
		],
		meanwhile: ['writing notes on paper first', 'signing in again each time', 'keeping the app open', 'living with it'],
		updates: ['It happened twice more yesterday, {first} says.', '{manager} asked whether there is any news.', 'Same again this morning.']
	},
	stay: {
		tries: [["Could {first} sign out from the menu and check that the name goes?", "Done; the sign-in screen came up as expected on that device."], ["Can you confirm which version of {app} is on the device?", "{version}, the one IT pushed."]],
		titles: ['{app} stays signed in when it should not', '{app} at {site} still signed in as the previous person', '{first}: signing out does not seem to sign out', 'Sessions on {app} lasting longer than expected'],
		report: [
			"{first} ({role}, {site}) picked up {app} at the start of their shift and found somebody else's name at the top.",
			'{user} at {site} raised a concern that {app} is still signed in on a device where they thought it was signed out.'
		],
		many: ['{manager} at {site} reports that {app} does not sign people out when they expect it to. The latest to notice was {user}, {aRole}.'],
		quotes: ["I picked it up and it had someone else's name on it.", 'My changes went in under the wrong person.', 'I thought signing out meant signing out.', 'Not a disaster, but it should not work like that, surely.'],
		tried: ['We checked how {app} is set up on the device; nothing unusual.', 'We confirmed with {first} which device and which account.', 'Nothing we can change from the desk seems to affect it.'],
		impact: [
			'Changes have gone in under the wrong name, which matters because the name is the record of who did what.',
			'{manager} is concerned that the record no longer shows who did what.',
			'Nobody has come to harm, but the harbour master is not pleased.',
			'People have started checking the name at the top before they touch anything, which they should not have to do.'
		],
		muse: [
			'How long a session lasts is set per database, and signing out ends one session on one device. Between those two facts, most of these come down to which one somebody expected to happen.',
			'A session ends when its time is up, when somebody signs out on that device, or when the gateway restarts. Nothing else ends it.'
		],
		meanwhile: ['signing out by hand at handover', 'checking the name before every change', 'leaving a note for the next shift', 'nothing yet'],
		updates: ['Same again this morning at {site}.', '{manager} has asked for an answer by the end of the week.', 'No news from {site}; I assume it is still happening.']
	},
	signout: {
		tries: [["Could {first} sign out on the tablet as well and check that the name goes?", "Done; the sign-in screen came up as expected on the tablet."], ["Can you confirm which version of {app} is on each device?", "{version} on both, the one IT pushed."]],
		titles: ['Signing out of {app} does not sign {first} out everywhere', '{first}: {app} still signed in after signing out', '{app}: sign-out only works on one device?'],
		report: ['{user} ({role}, {site}) says signing out of {app} did not sign them out on their other devices.', '{first}, {aRole} at {site}, signed out of {app} and later found it still signed in elsewhere.', '{user} at {site} asked whether {app} is working properly, because signing out does not seem to stick.'],
		quotes: ['I thought signing out meant signing out.', 'Not a disaster, but it should not work like that, surely.', 'Is my account safe?', 'I only noticed because my name was on the tablet.'],
		tried: ['We checked how {app} is set up on the devices; nothing unusual.', 'We confirmed with {first} which devices and which account.', 'Nothing on the account looks unusual to us.'],
		impact: ['{first} is worried someone could use the tablet as them.', 'Not urgent, but {first} would like an answer.', 'It has made {first} wary of leaving devices about.'],
		muse: ['A session belongs to the device it was made on. Signing out ends that one session; otherwise a session ends only when its time is up or the gateway restarts.', 'Most of these come down to which device was signed out and which one stayed signed in.'],
		meanwhile: ['signing out on each device by hand', 'keeping the tablet locked in the van', 'nothing yet'],
		updates: ['{first} asked again whether it is safe.', 'No news from {first}.']
	},
	missing: {
		tries: [["Could {first} sign out and back in, to force a full sync?", "Done. The list is the same afterwards."], ["Could {first} send the diagnostics export?", "Sent. Last sync a few minutes before, nothing waiting to go."]],
		titles: ['Work orders missing from {app} at {site}', '{site} jobs not reaching the devices', 'Some {db} documents never arrive on devices', '{app}: visible in the back office, not in the app'],
		report: [
			'{manager}, supervising at {site}, says items the back office has released are not showing in {app}, for {user} ({role}) or anyone else there.',
			'{first} ({role}, {site}) rang because the work they were told about this morning is not in {app}.',
			'{user} and the rest of the {site} crew are missing documents in {app} that the back office says exist.'
		],
		quotes: ['The office says they sent them. We have nothing.', "Half the week's work is not there.", 'We turned up with nothing to go on.', 'The ones that are there are fine. It is just the others.'],
		tried: ['We had {first} pull down to refresh and check the filters. Nothing new.', 'A second device at {site} shows the same, so it is not the one device.', 'We checked the items exist in the back-office tool: they do.'],
		impact: [
			'The crews at {site} are getting the work read to them over the radio, which works but is slow.',
			'Two jobs were missed altogether yesterday because nobody knew about them.',
			'{manager} is printing sheets in the office and handing them out at the start of the shift.',
			'The back office is fielding calls from {site} asking where the work is.'
		],
		muse: [
			'A document written to the bucket by a back-office tool only reaches the apps if the import brings it in. The import leaves some documents out on purpose: those with no id, the gateway\'s own, deletions without a revision, and anything bigger than the size limit. Anything else that is missing has a different story.',
			'First thing to establish: did the documents reach the bucket at all, and if they did, did the import take them?',
			'If some documents of a kind arrive and others of the same kind do not, the difference between them is usually the answer.'
		],
		meanwhile: ['reading jobs out over the radio', 'printing sheets in the office', "working from the back office's emails", 'phoning the back office'],
		updates: ['More missing today at {site}.', 'The back office has asked whether they should keep releasing work as normal.', '{manager} asked for an update.']
	},
	revert: {
		tries: [["Could {first} take a screenshot after saving next time, with the time showing?", "Will do. They had one from last week already, which shows the entry saved."], ["Can {first} check that the device synced after the edit?", "It did; their diagnostics show a push at about the time of the edit."]],
		titles: ['{app}: changes go back to an older version', 'Old version of a report keeps coming back on {app}', 'Edits lost on {app} at {site}'],
		manyTitles: ['{site} crew say their edits disappear'],
		report: [
			'{first} ({role}, {site}) says work they entered in {app} has gone, and an older version is showing instead.',
			'{user} at {site} rang because an entry they made in {app} has reverted.'
		],
		many: ['{manager} at {site} reports that changes made in {app} do not stick: they are there one day and gone the next. {user} ({role}) has lost the most.'],
		quotes: ['I filled it in on Tuesday. Today it is blank again.', 'I am not imagining it. I have photos of the screen.', 'Do I have to do everything twice now?', 'Someone has written over my notes.'],
		tried: ['We checked {first} is on a current version and that the device has synced since.', 'We confirmed the edits were made while signed in as the right person.', 'We could not see anything wrong from the desk.'],
		impact: [
			'The lost entries were the record of a check, and it has had to be done again.',
			'{first} has started photographing the screen after every save, just in case.',
			'{manager} is worried that nobody trusts the records any more.',
			'It cost a morning to redo the lost work.'
		],
		muse: [
			"When two devices change the same document without seeing each other's change, the gateway keeps both revisions and picks a winner. Most 'my edit went back' reports are about which one won, and why.",
			'An edit that disappears can have been overwritten, outvoted by another revision, or never sent. The revision history usually tells them apart.'
		],
		meanwhile: ['keeping a paper copy', 'photographing each entry', 'having one person edit at a time', 'checking the next morning'],
		updates: ['Happened again overnight, {first} says.', '{manager} asked whether the lost entries can be got back.', 'Nothing new since yesterday.']
	},
	zombie: {
		tries: [["Could {first} sign out and in again to force a full sync?", "Done. The items are still there."], ["Can the back office say when the items were removed?", "{day} afternoon, they say, all at once."]],
		titles: ['Cancelled items still showing at {site}', 'Deleted items come back in {app}', '{app}: things removed in the back office stay on the device', 'Removed documents still on devices at {site}'],
		report: ['{manager} at {site} says items that were removed in the back office are still in {app}; {user} ({role}) rang about it first.', '{first} ({role}, {site}) keeps finding things in {app} that were removed days ago.', 'Report from {user} at {site}: {app} still shows entries the back office got rid of.'],
		quotes: ['It was removed days ago and it is still there.', 'It was removed on Monday and it is still there on Thursday.', 'Which list is the real one?', 'It is confusing the new starters.'],
		tried: ['We had {first} refresh and wait for a full sync.', 'We checked the items are gone in the back-office tool: they are.', 'Signing out and in again made no difference.'],
		impact: ['Somebody acted on a cancelled item on {day} and lost an hour.', 'Stock lines that no longer exist were counted at the last check.', '{manager} has asked the back office to phone every cancellation through, which they do not have time for.', 'New starters cannot tell which items are real.'],
		muse: ['A deletion reaches the devices like any other change, provided the import takes it. Whether it was written in a way the import accepts is the first thing to check.', 'If only one device holds on to deleted items, look at the device; if every device does, look at how the deletion was written.'],
		meanwhile: ['checking every item with the back office', 'crossing items off by hand', 'ignoring anything older than a week', 'phoning the office'],
		updates: ['Still there this morning.', 'More of them showing at {site} today.', '{manager} chased this today.']
	},
	few: {
		tries: [["Could {first} sign out and back in, to force a full sync?", "Done. The list looks the same afterwards."], ["Could {first} send the diagnostics export?", "Sent. Last sync a few minutes before, nothing waiting to go."]],
		titles: ['{first} at {site} cannot find their work in {app}', '{app} shows {first} almost nothing', 'Work missing for one {role} at {site}', '{first}: {app} list nearly empty'],
		report: [
			'{user}, {aRole} at {site}, rang because {app} shows them hardly any of the work their colleagues can see.',
			'{first} ({role}, {site}) says the list in {app} is nearly empty, and asks whether their account is set up properly.',
			'The {site} crew lead asked the desk to look at {user}\'s {app}, which seems to be missing most of the work.'
		],
		quotes: ['Everybody else has a full list. I have two jobs.', 'Have I been missed off something?', 'I do not want to look as if I am not doing anything.', 'It must be something on my phone.'],
		tried: ['We had {first} pull down to refresh and check the filters. Nothing new.', 'We checked {first} is signed in to the right database: they are.', 'We confirmed {first} is on a current version of {app}.'],
		impact: ['{first} is having to ask the crew lead what to do next, job by job.', 'It is not stopping the work, but it is slowing {first} down.', '{first} is worried it looks as if they are not pulling their weight.'],
		muse: ['If one person sees less than their colleagues on the same database, either their device has not synced what the others have, or they are looking at a different slice of it.', 'The quickest way to tell is to compare what the device holds with what the database holds.'],
		meanwhile: ['asking the crew lead job by job', "looking over {colleague}'s shoulder", 'working from a printed list'],
		updates: ['{first} asked again whether there is any news.', 'No change for {first} today.']
	},
	stuck: {
		tries: [["Could {first} send a fresh diagnostics export?", "Sent; the count of waiting changes has gone up again."], ["Can {first} leave the device on charge with the app open overnight?", "Tried. The count was the same in the morning."]],
		titles: ['{app} at {site} shows changes waiting for days', '{first}: {app} not uploading', "{app} stuck on 'waiting to upload'"],
		manyTitles: ['Nothing syncs from {site}'],
		report: ['{first} ({role}, {site}) says {app} has had changes waiting to upload for days.', '{manager} at {site} reports that nothing {user} ({role}) enters in {app} reaches the back office.', '{user} rang because {app} shows a growing count of changes waiting.'],
		quotes: ['It says 14 waiting and has said so since Monday.', 'The office keeps asking me where my reports are.', 'Is my work safe? That is all I want to know.', 'It sends them eventually, I think. Maybe.'],
		tried: ['We checked {first} has signal and is signed in.', 'We had them leave it plugged in overnight; the count did not fall.', 'We confirmed the device has space and a current version.'],
		impact: ['The office has had nothing from {first} for days and assumed the work was not done.', '{first} is worried the waiting changes will be lost if the device dies.', '{manager} needs the figures for the weekly return.', 'It is mostly an annoyance, but the backlog grows every day.'],
		muse: ['Changes wait on the device until they can be sent, so a growing count means either there is no way out to us, or something on the device has stopped trying.', 'If nothing at all reaches us from the device, look at the network first; if some things arrive and then stop, look at the app.'],
		meanwhile: ['sending reports by email', 'leaving the device on charge', 'using mobile data at home', 'waiting'],
		updates: ['Count is up to {nn} now.', '{first} asked whether the waiting changes are safe. I said yes as far as we know.', 'No change today.']
	}
};

// What it turned out to be. Each cause carries its own clues, questions, findings and endings; the part of the
// system it belongs to and the way it ended are only ever told in the thread.
type Party = 'gateway' | 'app' | 'office' | 'it' | 'desk';
type EndKind = 'fix' | 'work' | 'explain' | 'wait';
type Art = 'mdm' | 'mSignin' | 'mTrickle' | 'mOidc' | 'mSessions' | 'tRevid' | 'tLogin' | 'cfg' | 'oidcCfg' | 'dBig' | 'dPrefix' | 'dNoId' | 'dTomb' | 'rBranch' | 'rNight' | 'imp' | 'wifi' | 'none';
interface End {
	k: EndKind;
	/** Waits on a change to the gateway's code, which the repository does not have yet: never followed by 'done'. */
	gw?: boolean;
	t: string[];
	from?: string;
	until?: string;
}
interface Cause {
	key: string;
	fam: string[];
	apps: AppKey[];
	w: number;
	from?: string;
	until?: string;
	os?: 'android' | 'ios';
	ver?: string;
	story: string[];
	clue: (string | [string, string])[];
	aligned?: boolean;
	one?: boolean;
	closable?: boolean;
	fast?: boolean;
	ask: string;
	yes: string[];
	no: string;
	more: [string, string][];
	check: string[];
	art: Art;
	who: Party;
	reveal: string[];
	ends: End[];
	after: [string, string];
	alt: string[];
	diag: string;
}

const causes: Cause[] = [
	{
		key: 'stale-device', closable: true, fam: ['lock'], apps: ['notes'], w: 10, from: GW_040, who: 'gateway', alt: ['autocap', 'disabled'], diag: 'P+L+', art: 'mdm', aligned: true, one: true,
		story: ["{first} says the trouble started on an ordinary morning: they switched the phone on in the van, it asked them to sign in again, and the first try came back locked. They are adamant they had not typed anything wrong, and the colleague sitting next to them backs that up.", "According to {first}, the account was fine all of the previous day. They signed in on the new handset that morning without a problem, went out on the first job, and by the time they came back to the van {app} said the account was locked."],
		clue: [
			'{first} changed their password on {day} after the reminder email, and the lock started the next morning.',
			['{first} still has their previous handset, the {olddevice}, somewhere at home, though they have not used it since the upgrade.', 'Almost in passing, {first} mentioned that the old phone from before the upgrade is still in the van, where it does duty as a sat nav.'],
			'The lock went away by itself once, after the release on {day} evening, and was back by the following lunchtime.'
		],
		ask: 'Has {first} changed their password lately, and is {app} installed on any other device of theirs, even one they no longer use?',
		yes: [
			'Yes to both, as it turns out. The password was changed on {day}, and the old {olddevice} is in a kitchen drawer at home with {app} still on it. {first} had forgotten all about it.',
			'They changed it last week. And there is a second handset: the {olddevice} they had before the upgrade, on charge in the van, with {app} still installed and still trying to sync.'
		],
		no: 'No other device: the old phone went back to IT when this one arrived, and the password has not changed since the spring.',
		more: [
			['Does the old device still get a signal where it is kept?', 'Full signal, {first} says.'],
			['When the lock came back last time, roughly what time of day was it?', 'Mid-morning, both times.'],
			['Did anyone else ever use that old handset?', "No, it was only ever {first}'s. It still has their stickers on the back."]
		],
		check: [
			"The account is at ten refusals, the most it can have before it locks. Device management lists two handsets on {first}'s name, and the older one checks in several times a day, so it is awake and online.",
			'Device management shows a second handset assigned to {first}, an older {olddevice} on an old version of {app}, which checked in this morning. A device that wakes up with a stale password tries it every time, and every try counts towards the lock.'
		],
		reveal: [
			'That is the cause. The old handset still has the previous password saved, and every time it wakes up and tries to sync it signs in with it. Each refusal counts, and after ten in a row the account locks, whatever {first} types on the new phone.',
			"Confirmed this afternoon: the old phone in the van was retrying the old password whenever it got a signal. Ten refusals and the gateway locks the account, and the new phone is then refused too, right password or not. The count lives in the gateway's memory, so it only clears when the gateway restarts."
		],
		after: ["Is there anything we can tell other crews so this does not happen to them?", "When someone gets a new phone, the old one should be signed out of {app} before it goes in a drawer, and any phone that is kept should get the new password the day it changes. A device left trying an old password will lock the account sooner or later."],
		ends: [
			{ k: 'fix', t: ["{first} has signed the old handset out and handed it in to IT. The lock cleared with last night's restart and they have been working all day without a problem."] },
			{ k: 'work', t: ['The gateway team restarted the gateway at 19:00 to clear the lock, since the count only lives in memory, and {first} has switched the old handset off for good. Nothing more to do here.'] },
			{ k: 'wait', gw: true, t: ["The old handset is off now, but the account stays locked until the gateway restarts, and there is no way to clear one account without restarting the whole gateway, which signs everybody out. Waiting on the gateway team for a way to clear a single account; until then {first} is borrowing {colleague}'s handset."] }
		]
	},
	{
		key: 'shared-account', fast: true, fam: ['lock', 'pw'], apps: ['stores'], w: 7, from: GW_040, who: 'desk', alt: ['autocap', 'disabled', 'kiosk'], diag: 'P+R+L+', art: 'mSignin',
		story: ["{first} rang from the store counter with a queue of fitters waiting for parts. The handheld was working at the start of the shift, then stopped mid-morning, and the other handhelds in the store say the same.", "The store had a busy morning with two deliveries and a new face on the handhelds. By ten o'clock none of the handhelds would sign in, and {first} has been booking stock out on a clipboard since."],
		clue: [
			'The handhelds in the {site} store all sign in as one account, {store}, and everybody on shift uses it.',
			'Four people use the store handhelds across two shifts, and the password is on a label inside the charging cradle.',
			'The store took on a new starter on {day}, who was shown the handheld and left to get on with it.',
			'It is not only {first}: nobody in the {site} store can get in, and deliveries are piling up at the door.'
		],
		ask: 'Who else signs in with that account, and has anyone new started using it lately?',
		yes: [
			'It is a shared account, {store}, used by the whole store. A new storeman started on {day} and was given the password from the label on the cradle.',
			'Everybody in the store uses {store}. There is a new starter this week who has been doing the morning deliveries on the handheld.'
		],
		no: 'Only {first} uses it. It is their own account and nobody else has the password.',
		more: [
			['Where is the password kept for people who need it?', "On the label in the cradle, and in the store manager's head."],
			['Was the password changed by IT at any point this year?', 'The manager thinks IT changed all the store passwords in the summer, but is not sure the label was updated.'],
			['How many handhelds does the store have?', 'Three, all on the same account.']
		],
		check: [
			'The account is at ten refusals. On the depot-stock dashboard there is a burst of refused sign-ins on {day} between {time} and the half hour, and almost nothing on either side of it, which looks more like one person trying a wrong password again and again than a device retrying in the background.',
			'From the dashboard, depot-stock had a cluster of refusals on {day} morning, far more than usual, all within a quarter of an hour. That is somebody at a keyboard, not a device.'
		],
		reveal: [
			"Found it. The label in the cradle has last year's password on it. The new starter tried it, then variations of it, a dozen times on {day} morning, and the shared account locked for the whole store.",
			"The store manager has the answer: the password on the cradle label was out of date, and the new starter kept trying it. One account for everybody means one person's bad morning locks out the whole store."
		],
		after: ["Are there other shared accounts like this one?", "Several, mostly in the stores. Any of them can be locked by one person typing the wrong password ten times, and the lock then hits everybody who shares it."],
		ends: [
			{ k: 'fix', t: ['IT has given each of the {site} store staff their own account, and the label has gone in the bin. The old shared account stays locked; nobody needs it now.'] },
			{ k: 'work', t: ['The gateway was restarted after hours to clear the lock, and the manager has written the current password on a new label. Nothing else planned.'] },
			{ k: 'wait', t: ["The lock cleared with the evening restart. The store manager has asked IT for individual accounts so that this cannot happen again; waiting on IT to set them up, and they want the depot manager's sign-off first."] }
		]
	},
	{
		key: 'kiosk', fam: ['lock'], apps: ['berths'], w: 5, from: GW_040, who: 'it', alt: ['autocap', 'disabled'], diag: 'L+', art: 'mTrickle',
		story: ["{first} came on at 07:00 to find the wall board showing a sign-in page and their own iPad refusing them. The night officer had signed out at the end of the shift and could not get back in either.", "The duty officers at {site} use one shared account across the office. This morning neither of them could get in, and the board on the wall, which normally shows the day's berths, had gone to a sign-in page."],
		clue: [
			'The wall screen in the {site} harbour office shows the berth board all day and signs in as {kiosk}, the same account the duty officers use on their iPads.',
			'IT changed a batch of shared passwords on {day} as part of the quarterly round.',
			'It started some time overnight; the night officer says the board was fine at midnight.',
			'Both duty officers are locked out, not just {first}.'
		],
		ask: 'Does anything sign in with that account by itself, such as a display or a scheduled job?',
		yes: ['Yes: the wall screen in the office signs in by itself as {kiosk}, and nobody has touched its settings since it was put up.', 'The big screen above the desk does. It was set up by IT two years ago and just runs.'],
		no: 'Nothing unattended. Only the officers on duty use it, on their iPads.',
		more: [
			['Is the wall screen easy to get at?', 'Not really. It is bolted high on the wall above the radio desk; you need the tall ladder from the stores.'],
			['Did IT tell the office the password was changing?', 'There was an email, but it went to the shared inbox, which nobody reads on nights.'],
			['What does the wall screen show at the moment?', "A sign-in page with a red line across the top. The night officer took a photo of it."]
		],
		check: [
			'Here is berth-plans overnight. Refusals arrive every five minutes, regular as a clock, from late evening until the account locked. People do not try a password every five minutes all night; a machine does.',
			'Look at the regularity of this: one refusal every five minutes, through the night, then the lock. That is something retrying on a timer.'
		],
		reveal: [
			"It is the wall screen. Its saved password was the old one, and after IT's change on {day} it kept retrying every few minutes, locking the shared account for the officers' iPads as well.",
			'Confirmed on our side. The wall screen still had the password from before the quarterly change, and it retries on a five-minute timer. Ten tries and the shared account was locked for everybody.'
		],
		after: ["Should we check the other wall screens?", "Worth it. Any screen that signs in by itself with a saved password will do the same the next time that password changes. IT has a list of four."],
		ends: [
			{ k: 'fix', t: ['Facilities got the ladder up and {it} put the new password into the wall screen. The lock cleared at the evening restart and the board and the iPads are signed in.'] },
			{ k: 'work', t: ['The wall screen is unplugged for now and the officers are back in after a restart. Nothing more planned; the office says it can live without the big screen.'] },
			{ k: 'wait', t: ['The wall screen is unplugged and the officers are back in after a restart. Waiting on facilities to get someone up to the screen so that {it} can change its saved password; until then the board is dark.'] }
		]
	},
	{
		key: 'autocap', fam: ['pw', 'lock'], apps: ['notes'], w: 10, os: 'android', one: true, who: 'app', alt: ['stale-device', 'disabled'], diag: 'P+R+', art: 'tLogin',
		story: ["{first} has been trying since their first day with the new handset. The welcome email gives the account name and a starting password, and {first} has typed them exactly as written, several times, slowly. The colleague who set up their phone could not get in on it either.", "{first} was moved onto {app} this month along with the rest of the {site} crew. Everyone else got in first time. {first} has tried the name and password from the welcome email on their own handset, and on a spare one, with the same result each time."],
		clue: [
			'{first} uses an Android handset; the colleagues at {site} who sign in without any trouble all have iPhones.',
			'{first} types the name exactly as it appears on the welcome email, which starts with a capital letter.',
			'The password is definitely right: {first} signed in to the timesheet portal with it while we watched.',
			'{first} is new to {app}; this is the first time they have tried to sign in on this handset.'
		],
		ask: 'Could we have a screenshot of the sign-in screen with the name filled in, just before they tap Sign in?',
		yes: ["Screenshot attached by {first}. The name field shows '{Handle}' with a capital letter. They say the phone does that by itself.", "Here it is. The name reads '{Handle}'. {first} had not noticed the capital until I pointed at it."],
		no: 'Screenshot attached. The name is all lower case, exactly as the account has it.',
		more: [
			['What is the name on the account, exactly as the accounts page has it?', "'{handle}', all lower case, like every account we create."],
			['Has {first} ever signed in successfully on this phone?', 'Never on this phone. They were given it new last month.'],
			['Which keyboard is the phone using?', 'The Samsung one it came with, with the default settings.']
		],
		check: [
			"Accounts are lower case and the gateway compares names exactly, so '{Handle}' and '{handle}' are two different names to it. The real account, '{handle}', has no refusals against it at all. I checked how names are matched with a quick test:",
			"The account '{handle}' has a clean record: no refusals. The refusals are piling up somewhere else. Names are matched exactly, as this shows:"
		],
		reveal: [
			'This is the Android keyboard in {app}: the name field lets it capitalise the first letter, and {first} never noticed. Typed in lower case, the sign-in works first time.',
			'Confirmed on the app side. On Android the name field in {app} lets the keyboard capitalise the first word. {first} signed in at once with the name typed in lower case.'
		],
		after: ["Is this only Samsung phones?", "Any Android keyboard that capitalises the first word will do it. iPhones were spared because the iOS build already turned capitalisation off in that field."],
		ends: [
			{ k: 'fix', from: FN_392, t: ['{app} 3.9.2, out since 27 October, turns capitalisation off in that field and trims stray spaces. {first} updated this morning and signs in normally.'] },
			{ k: 'work', t: ['{first} now types the name in lower case, and we turned off auto-capitalise in their keyboard settings while we were on the phone. Nothing else needed.'] },
			{ k: 'wait', until: FN_392, t: ['{first} is in, typing in lower case. The app team has the field change in the next Android release; waiting on that to reach the crews before we close this, as there will be others.'] },
			{ k: 'explain', t: ['Explained to {first} that the name has to be typed exactly as the account has it, in lower case. They are in and happy.'] }
		]
	},
	{
		key: 'disabled', closable: true, fam: ['pw', 'lock'], apps: ['notes', 'stores'], w: 8, aligned: true, one: true, who: 'it', alt: ['autocap', 'stale-device', 'shared-account'], diag: 'P+R+', art: 'none',
		story: ["{first} says nothing has changed as far as they know: same phone, same password, same job. They last used {app} some weeks ago, and today it will not have them at all.", "{first} came in this morning expecting to pick up where they left off. The phone signs in to everything else, but {app} refuses them every time, even with the password we set while they were on the line."],
		clue: [["{first}'s contract was renewed at the start of the month; they have worked for Harbourline on and off for years as seasonal crew.", '{first} moved from {site2} to {site} last month.'], 'Nobody else at {site} has any trouble signing in.', '{first} has had the same phone and the same password for over a year.'],
		ask: 'Is anything unusual about the account itself? What does the accounts page say about it: created, changed, anything marked on it?',
		yes: ['The accounts page shows it was changed on {date2} by the starters and leavers process, the same day the old contract ended. Nobody at the desk touched it.', 'It says the account was last changed by the HR feed, not by a person, on {date2}. That is about when {first} moved.'],
		no: 'Nothing unusual. Created two years ago, not changed since apart from the password.',
		more: [
			['Did {first} get any email from IT around the time of the change?', 'An automatic one saying their access would end, which they ignored because they were staying.'],
			['Does {first} have any other Harbourline accounts that still work?', 'Email works. That is on a different system.'],
			['Who is {first}\'s line manager?', '{manager}.']
		],
		check: [
			'The account exists and the password you set matches, so a plain wrong password is out. The gateway gives the same answer for an account that is switched off as for a wrong password, so that is the next thing to look at, and it fits the timing.',
			'The password is right; I checked it against the account. The other way to get that exact message is an account that has been switched off, which the gateway refuses with the same words as a bad password.'
		],
		reveal: [
			'There it is: the leavers process switched the account off when the old contract ended, and nothing switched it back on. A switched-off account gets the same message as a typo, which is why it looked like a password problem.',
			'Found it. The account was marked disabled when {first} moved, because the move went through as a leaver at {site2} and a starter at {site}, and the starter half created nothing new. The gateway refuses a disabled account with the same message as a bad password.'
		],
		after: ["Can we see on the accounts page that an account is switched off?", "There is a small grey 'disabled' label next to the name, easy to miss. It is worth looking for it before resetting a password next time."],
		ends: [
			{ k: 'fix', t: ['{it} switched the account back on. {first} signed in at {time2} and is syncing.'] },
			{ k: 'wait', t: ['{it} needs the line manager to confirm before re-enabling an account the leavers process closed. We have asked {manager}; waiting on that.'] },
			{ k: 'work', t: ['{first} is working on a temporary account IT made this morning while the old one is sorted out properly, and their notes have been copied across. They are content with that.'] }
		]
	},
	{
		key: 'redirect', fast: true, fam: ['oidc'], apps: ['notes', 'berths'], w: 6, who: 'it', alt: ['not-assigned', 'default-browser', 'no-token-endpoint'], diag: 'O+', art: 'mOidc',
		story: ["{first} tried to sign in at the start of the shift as usual. The Harbourline ID page came up, took the password, and then showed an error page instead of returning to {app}. By the time {first} rang, three others at {site} had the same.", "It began in the middle of the morning. People who were already signed in carried on working; anyone who needed to sign in, including {first}, got as far as the Harbourline ID page and no further."],
		clue: [
			'Everybody at {site} who uses Harbourline ID is affected; the two contractors who sign in with a password are fine.',
			'It started at about {time} on {day}; sign-ins earlier that morning worked.',
			'After the password, the Harbourline ID page shows a short error and stays there instead of going back to the app.',
			'The desk had four calls about it in the first hour, from three sites.'
		],
		ask: 'Is it everybody who signs in with Harbourline ID, or only {first}?',
		yes: ["Everybody, at every site we have heard from. The Harbourline ID page says something like 'the address this application asked to return to is not registered'.", 'All of them. And there is an error on the Harbourline ID page after the password, about a return address not being registered.'],
		no: 'Only {first}, as far as we know. The rest of {site} signs in with Harbourline ID without any trouble.',
		more: [
			['Can password accounts still sign in?', 'Yes, the contractors at {site} are working normally.'],
			['Did the error page show any code or reference?', "A long reference number and the words 'redirect address'. {first} sent a photo of it."],
			['Is it every app that uses Harbourline ID, or only {app}?', 'Field Notes and Berth Board both, by the calls we have had.']
		],
		check: [
			'Harbourline ID sign-ins went from normal to none at all at about {time} on {day}, for every database, while password sign-ins carried on as usual. That points at the provider or our registration with it, not at any one device.',
			'From the dashboard: no Harbourline ID sign-in has completed since about {time}, anywhere. Password sign-ins are normal. Nothing changed on the gateway at that time.'
		],
		reveal: [
			"Found it: the gateway's return address, https://sync.harbourline.example/_oidc_callback, was no longer on the tidegate application's list at harbour-id, {why}. Harbour-id will not send anyone back to an address it does not know.",
			"It was the registration at harbour-id. The tidegate application had lost the gateway's callback address {why}, so after the password harbour-id had nowhere it was allowed to send people."
		],
		after: ["How do we stop this happening again?", "IT is adding a note to the registration saying the address is live and in use, and the gateway team will be on the change list for anything touching it."],
		ends: [
			{ k: 'fix', t: ['{it} put the address back on the registration at {time2}. Sign-ins with Harbourline ID work again at all sites; {first} confirmed from {site}.'] },
			{ k: 'wait', t: ["{it} needs a change approval to edit the live registration, which goes to Thursday's change board. Until then crews who have one are signing in with a password account. Waiting on the change board."] }
		]
	},
	{
		key: 'secret-rotated', fast: true, fam: ['oidc'], apps: ['notes', 'berths'], w: 3, who: 'gateway', alt: ['not-assigned', 'default-browser', 'no-token-endpoint'], diag: 'O+', art: 'mOidc',
		story: ["{first} was one of the first through to the desk this morning. The Harbourline ID page accepts the password, goes back to {app}, and then {app} says 'Sign-in failed'. People who were already signed in are unaffected until they need to sign in again.", "The calls started just after nine. Every caller says the same: Harbourline ID takes the password, {app} thinks for a moment, and then shows 'Sign-in failed'."],
		clue: ["It is everyone, at every site, and it started at nine o'clock on the dot.", 'Password sign-ins are fine; only the Harbourline ID button fails.', "After the Harbourline ID page the app shows 'Sign-in failed' and goes back to the start.", 'The desk phones lit up within ten minutes of nine.'],
		ask: 'Did anything change on the harbour-id side this morning: a renewal, a policy change, maintenance?',
		yes: ['{it} says the monthly rotation of application credentials ran at 09:00 today, for every application registered at harbour-id.', 'Yes. {it} says the scheduled rotation of application credentials ran at nine this morning.'],
		no: '{it} says nothing was scheduled and nothing on harbour-id has changed this week.',
		more: [
			['Is it every app, or only {app}?', 'Every app that uses Harbourline ID through the gateway. Berth Board and Field Notes both.'],
			['Did the rotation notice go to anyone on the gateway team?', 'It went to a distribution list that, it turns out, nobody from the gateway team is on.'],
			['Has this happened before?', 'Not that anyone at the desk remembers.']
		],
		check: [
			'From 09:00 every Harbourline ID sign-in fails at the exchange, where the gateway trades the code from harbour-id, and nothing fails before that step. The exchange is the one step where the gateway has to present its own registration.',
			'The dashboard has Harbourline ID sign-ins dropping to zero at 09:00 and password sign-ins carrying on. Every failure is at the exchange with harbour-id.'
		],
		reveal: ['That is it. The rotation gave the tidegate application a new client secret at harbour-id, and the gateway was still presenting the old one, so harbour-id refused every exchange.', 'Confirmed: harbour-id issued a new client secret for tidegate at 09:00 and our provider settings still had the previous one.'],
		after: ["Will this happen every month?", "The rotation will, so the gateway team is now on the notice list and will put the new value in before it goes live."],
		ends: [
			{ k: 'fix', t: ["{eng} put the new value into the gateway's provider settings and restarted it at {time2}. Harbourline ID sign-ins work again. The restart signed everybody out, as restarts do, so expect a few calls about that."] },
			{ k: 'wait', t: ['The new value is ready, but changing the provider settings needs a restart, which signs every crew out mid-shift. Waiting for the 19:00 window; password accounts work in the meantime.'] }
		]
	},
	{
		key: 'no-token-endpoint', fam: ['pilots'], apps: ['notes'], w: 4, from: PILOTS, who: 'gateway', alt: [], diag: 'O+', art: 'oidcCfg',
		story: ["{first} is one of the Forth Pilotage pilots who were told they could use their own company's sign-in from this month. They get their company's page, sign in, come back to {app}, and are told 'Sign-in failed'. Their colleagues have all had the same.", "The pilots have been looking forward to this, as it saves them a second password. So far none of them has got in: their own company's sign-in works, and {app} then says 'Sign-in failed'."],
		clue: ["These are the Forth Pilotage pilots, who started signing in this month with their own company's accounts through the new 'forth-pilots' provider.", 'Harbourline staff signing in with Harbourline ID at the same port are fine; only the pilots fail.', "The pilots get through their own company's sign-in page and then see 'Sign-in failed' in the app.", 'The pilots were promised the app would be ready for the start of the month.'],
		ask: "Which provider do the failing users sign in through? If it is the new pilots' one, could someone send me its settings as they were entered?",
		yes: ['It is the forth-pilots provider. {it} has attached the settings as they were entered.', 'forth-pilots, all of them. {it} has sent the settings as entered.'],
		no: 'Harbourline ID, the same as everybody else.',
		more: [
			['How many pilots are affected?', 'All eleven who have tried so far.'],
			['Did the pilots ever get in, even once?', 'No. Not one since the provider went live.'],
			['Who at Forth Pilotage looks after their sign-in?', 'Their IT, which is two people and an outside firm.']
		],
		check: [
			'The forth-pilots settings have no token endpoint. The gateway accepted them when it started anyway, so a pilot gets as far as the exchange and the gateway then has nowhere to send it:',
			'Here are the provider settings as the gateway loaded them. Note the empty token endpoint on forth-pilots:'
		],
		reveal: ["So the pilots' provider was set up without its token endpoint, and nothing stopped it: the gateway checks the name, the issuer and the client id when it loads a provider, but not the token endpoint.", 'That explains it. Without a token endpoint the exchange cannot happen, and the gateway does not check for one when it loads a provider, so the mistake went live unnoticed.'],
		after: ["Will other providers have the same problem?", "Only if they are set up the same way. Harbour-id has always had its token endpoint, and there are no others planned this year."],
		ends: [
			{ k: 'fix', t: ["{it} added the token endpoint from Forth Pilotage's documentation and {eng} reloaded the gateway at {time2}. Pilots are signing in. The gateway should have refused that configuration in the first place; that check is still to be added on the gateway side."] },
			{ k: 'wait', gw: true, t: ['{it} has asked Forth Pilotage for the right token endpoint; their IT replies on Mondays. Separately the gateway team owes a check that refuses a provider without a token endpoint when it loads.'] }
		]
	},
	{
		key: 'not-assigned', closable: true, fam: ['oidc'], apps: ['notes', 'berths'], w: 9, one: true, who: 'it', alt: ['default-browser', 'secret-rotated', 'no-token-endpoint', 'redirect'], diag: 'O+', art: 'none',
		story: ["{first} has only been in their current post a short while and {app} is new to them. The Harbourline ID page takes their password and then shows a short message that {first} did not catch before closing it. Back in {app}, nothing has changed.", "{first} is the only person at {site} with the problem. They can sign in to everything else with Harbourline ID. In {app} the Harbourline ID page takes the password and then says something about access."],
		clue: [['{first} joined Harbourline on {day} and has signed in to email and the intranet with Harbourline ID without trouble.', '{first} moved from the {dept} team to {site} operations last month.'], 'Everybody else at {site} signs in fine.', 'The Harbourline ID page shows a message after the password that {first} did not write down.'],
		ask: "Is {first}'s Harbourline ID account in the 'Tidegate users' group? Harbour-id only lets people through to an application they are assigned to.",
		yes: ["{it} looked: {first} is not in the 'Tidegate users' group. Everybody else at {site} is.", "Not in it. {it} says {first}'s account has email and intranet access and nothing else."],
		no: '{it} checked: {first} is in the group, like everyone else.',
		more: [
			['What does the message on the Harbourline ID page say?', "{first} took a photo this time: 'You do not have access to this application.'"],
			['Is {first} on a Harbourline contract or an agency one?', 'Harbourline, permanent.'],
			['Who filled in the starter form?', 'The {site} office, as far as anyone knows.']
		],
		check: ['The gateway never hears from {first}: there is no exchange for them at all, so harbour-id is turning them away before they get back to us.', 'Nothing from {first} reaches the gateway. Whatever happens, happens at harbour-id.'],
		reveal: ["Harbour-id refuses anyone who is not in the 'Tidegate users' group, and {first} was never added. New starters get it through the starter form, which for {first} {why2}.", 'That is the reason: no group, no access. The starter form for {first} {why2}.'],
		after: ["Can new starters be added to the group automatically?", "IT is looking at adding it to the default set for operational staff, which would cover most of them."],
		ends: [
			{ k: 'fix', t: ['{it} added {first} to the group. They signed in at {time2}.'] },
			{ k: 'wait', t: ["Group membership needs the line manager's request in the IT portal. {manager} has been asked; waiting on that."] }
		]
	},
	{
		key: 'default-browser', one: true, closable: true, fam: ['oidc'], apps: ['notes'], w: 6, os: 'ios', from: FN_390, ver: '3.9.0', who: 'app', alt: ['redirect', 'not-assigned', 'secret-rotated', 'no-token-endpoint'], diag: 'O+', art: 'none',
		story: ["{first} taps the Harbourline ID button, signs in on the page that appears, and is then left looking at a blank browser page. Switching back to {app} by hand shows the sign-in screen again, as if nothing had happened.", "{first} says it worked every morning until recently. Now, after the Harbourline ID page, the phone does not go back to {app} at all."],
		clue: ["{first} is on an iPhone and has Chrome set as the phone's default browser.", 'After the Harbourline ID page the phone stays in a browser on a blank page instead of going back to {app}.', 'It started after {first} updated {app} to 3.9.0.', 'An iPad at {site} with the same account works.'],
		ask: 'Which browser does the Harbourline ID page open in, and does the phone come back to {app} by itself afterwards?',
		yes: ['It opens in Chrome, and stays there on a blank page. {first} switches back to {app} by hand and it is still on the sign-in screen.', 'Chrome, which {first} set as the default last month. It never comes back to the app.'],
		no: 'Inside the app, in the usual sign-in sheet, and it comes back by itself.',
		more: [
			['Does {first} have Safari on the phone?', 'Yes, it is just not the default.'],
			['Are any other iPhone users at {site} affected?', 'One other, who also uses Chrome. Everyone else is fine.'],
			['Did it work before the update?', 'Every day, {first} says.']
		],
		check: ['No exchange ever reaches the gateway for {first}, so the code from harbour-id never gets to us. Something between the browser and the app is losing it.', 'Harbour-id signs {first} in, but nothing ever arrives at our callback. The hand-back to the app is going wrong on the phone.'],
		reveal: ['That is ours on the app side: 3.9.0 on iOS opens Harbourline ID in the default browser rather than the system sign-in sheet. With Safari as default the return to the app works; with another browser the callback lands in that browser and goes no further.', 'Found it on our side. 3.9.0 hands the sign-in to the default browser, and only Safari passes the result back to the app.'],
		after: ["Should we tell other iPhone users to switch to Safari?", "Only those who have trouble. Most people never change the default browser."],
		ends: [
			{ k: 'fix', from: FN_391, t: ['3.9.1 uses the system sign-in sheet again. {first} updated and signed in first time.'] },
			{ k: 'work', t: ['{first} set Safari as the default browser and signed in. They are happy to leave it that way.'] },
			{ k: 'wait', until: FN_391, t: ["{first} is in after switching the default browser to Safari for now. The app team's fix is in 3.9.1, due at the end of September; waiting for that release."] }
		]
	},
	{
		key: 'ttl-ignored', fam: ['stay'], apps: ['berths'], w: 7, who: 'gateway', alt: ['per-device'], diag: 'W+P+', art: 'cfg',
		story: ["{first} picked up the shared iPad at the start of the day shift and found the night officer still signed in. Two berth changes {first} made before noticing went into the board under the night officer's name, and had to be explained at the morning meeting.", "The office relies on the iPads signing people out by themselves at the end of a shift. {manager} says that has never seemed to happen reliably, and this week it led to a vessel being moved on the board under the wrong officer's name."],
		clue: ['The office iPads are shared between shifts, and berth-plans is set to end sessions after eight hours so that the next shift has to sign in as themselves.', "{first} found the night officer's name at the top of the board when they started at 07:00, and their own berth changes recorded under it.", 'Handovers in the {site} office are at 07:00 and 19:00.', 'Nobody signs out at handover; nobody ever has.'],
		ask: 'How long are sessions meant to last on that database, and how long do they actually last on the iPads?',
		yes: ['Eight hours, set in the berth-plans settings since the spring. In practice the iPads stay signed in for a whole day: {first} timed one from 06:40 to 06:38 the next morning.', 'Eight hours is what was asked for. The iPads seem to stay signed in for about a day.'],
		no: 'Nothing special set, as far as anybody knows: the default, 24 hours.',
		more: [
			['Do the officers sign out at handover?', 'They rely on the session ending. That was the whole point of setting eight hours.'],
			['When was the eight-hour setting made?', 'In April, after a mix-up over who had moved a vessel.'],
			['Is it every iPad in the office?', 'All three.']
		],
		check: ['The settings do say eight hours for berth-plans, and every session I can see there was given an expiry 24 hours after it started:', 'Here is what berth-plans is configured with. Sessions there are nonetheless getting 24 hours:'],
		reveal: ["The gateway ignores the session length a database is configured with and always gives 24 hours, the default. So berth-plans' eight hours has never applied.", 'Found it: when the gateway starts a session it uses the default length, not the one the database is set to. Eight hours has never been in force.'],
		after: ["Does this affect other databases?", "Any database set to something other than 24 hours. Berth-plans is the only one that is, as far as anyone knows."],
		ends: [
			{ k: 'wait', gw: true, t: ['Until the gateway honours the configured length, the officers are signing out by hand at handover. Waiting on the gateway team for the fix.'] },
			{ k: 'work', t: ["The office has put a 'sign out at handover' card by each iPad, and the duty manager checks at 07:00 and 19:00. That will do for them; closing here."] }
		]
	},
	{
		key: 'restart', fam: ['out'], apps: ['notes', 'berths', 'stores'], w: 6, who: 'gateway', alt: ['clock', 'app-cookie'], diag: 'P+X+K', art: 'mSessions',
		story: ["{first} was on the early shift and was signed out of {app} at about twenty to six, along with everyone else on the quay. Signing in again worked straight away. It has happened before, at about the same time.", "{manager} says the whole early shift at {site} was thrown back to the sign-in screen at once, not long before six. Nobody had done anything, and signing back in worked."],
		clue: ['Everybody at {site} on the early shift had to sign in again at about six.', 'It happened on {day} and again a week later, on the same day of the week.', 'The people on nights were signed out in the middle of their work, all at once.', '{site2} says they had the same.'],
		ask: 'Was it everyone at once, at the same minute, and does it line up with a particular day of the week?',
		yes: ['Everyone at once, at about 05:40, and both times on a {day}. {site2} says the same.', 'All of them together, early on a {day} morning. It was {day} the week before as well.'],
		no: 'No: just {first}, at different times of day.',
		more: [
			['Did anything else stop working at the same moment?', 'Not that anyone noticed. The app came back as soon as they signed in.'],
			['Did anyone lose work?', 'One half-finished checklist at {site}, which was retyped.'],
			['How many people were on shift at that hour?', 'About a dozen at {site}, more across the fleet.']
		],
		check: ['Active sessions drop to nothing at 05:40 on the mornings in question, across all databases, and climb back as crews sign in again:', 'Here are active sessions around six on the morning in question. They all go at once:'],
		reveal: ["The gateway host is patched and restarted in the early-morning window on {day}s, and sessions live in the gateway's memory, so a restart ends every session there is.", 'That is the maintenance window: the host is restarted for patches early on {day}s, and since sessions are only held in memory they all go with it.'],
		after: ["Could the gateway keep sessions through a restart?", "Not as it is built: sessions are held in memory. Keeping them elsewhere is a bigger piece of work than this escalation."],
		ends: [
			{ k: 'work', t: ['Ops have moved the patch window to Sunday at 03:00, when almost nobody is working. Closing.'] },
			{ k: 'explain', t: ['Explained to {site} that a restart signs everyone out and that it happens in the maintenance window; they will expect it now.'] },
			{ k: 'wait', t: ["Ops are willing to move the window but need the operations director's agreement, as Sunday night has its own users at the ferry terminals. Waiting on that decision."] }
		]
	},
	{
		key: 'clock', one: true, closable: true, fam: ['out'], apps: ['notes', 'berths', 'stores'], w: 9, who: 'desk', alt: ['restart', 'app-cookie'], diag: '', art: 'none',
		story: ["{first} says {app} lets them in, and within a minute or two they are back at the sign-in screen. It happens every single time, wherever they are, and has done since the start of the week.", "{first}'s device was off for a while after the battery ran flat. Since then {app} will not stay signed in for more than a couple of minutes, and sync complains now and then about the connection."],
		clue: ["{first}'s device ran flat over the weekend and was off for a couple of days.", '{first} signs in, works for a minute or two, and is back at the sign-in screen.', 'Sync also fails now and then with a message about the connection not being secure.', 'Nobody else at {site} has the problem.'],
		ask: "What date and time does the device itself think it is? The diagnostics export from the app's settings has a line for the clock.",
		yes: ["The clock line says 'out of step', and the device is set to {wrongdate}. {first} had set the date by hand after the battery died.", 'Out of step: the device thinks it is {wrongdate}. Automatic date and time is switched off.'],
		no: 'The clock line says it is in step.',
		more: [
			['Did {first} change any settings recently?', 'Only the date, after the battery died, because the device asked.'],
			['Is it a Harbourline-managed device?', 'Yes, but the date setting is not locked down.'],
			['Does it happen straight after signing in, or later?', 'Within a couple of minutes, every time.']
		],
		check: ['A session from the gateway carries an expiry 24 hours ahead in real time. A device whose clock is far enough ahead sees that expiry as already gone and throws the session away straight after sign-in.', 'Each sign-in from {first} works on our side and the session is good for a day. Something on the device decides it has expired almost at once.'],
		reveal: ['It is the device clock. With automatic date and time off, the device thought it was {wrongdate}, so every session looked expired the moment it arrived.', 'The device clock was well ahead of the real date, so every session looked out of date to the app as soon as it arrived.'],
		after: ["Should we add a clock check to the desk's script for sign-in calls?", "Yes. Ask for the diagnostics export early: the clock line is right there."],
		ends: [
			{ k: 'fix', t: ['{first} turned automatic date and time back on and has stayed signed in all day.'] },
			{ k: 'explain', t: ['Explained to {first} how to turn automatic date and time back on and why it matters; they are signed in and syncing.'] }
		]
	},
	{
		key: 'per-device', fam: ['signout'], apps: ['notes'], w: 6, one: true, who: 'gateway', alt: [], diag: 'W+P+', art: 'none',
		story: ["{first} signed out of {app} on one device and assumed that was the end of it. Later they found {app} still signed in on another of their devices, with their name at the top, and want to know whether that is right.", "{first} is worried: they signed out, and later saw {app} still signed in as them on a device they had not touched."],
		clue: ['{first} signed out of {app} on their phone and expected the tablet in the van to sign out too.', 'Signing out took a few seconds and looked as if it worked.', '{first} uses {app} on more than one device.'],
		ask: 'Was the signing out done on a different device from the one that stayed signed in?',
		yes: ['Yes: they signed out on the phone, and the tablet stayed signed in.', 'Different devices. They signed out on one and expected the others to follow.'],
		no: 'Nobody signed out anywhere; the device simply stayed signed in.',
		more: [
			['How many devices does {first} use {app} on?', 'Three: phone, tablet in the van, and the office iPad now and then.'],
			['If a phone is lost, has IT been told?', 'Yes, IT has it on the lost list.'],
			['Did {first} see any message when signing out?', 'Just the sign-in screen, as usual.']
		],
		check: ['Each device has its own session. Signing out ends the session of the device you sign out on, and only that one.', "I checked {first}'s sessions: one per device, as expected, and the phone's ended when they signed out on it."],
		reveal: ['Working as built: one session per device, and signing out on one does not touch the others.', 'Nothing is broken here. A session belongs to one device, and signing out on another device does not end it.'],
		after: ["Can we sign someone out everywhere from the desk?", "Not today. A restart of the gateway would, but it signs everybody else out too."],
		ends: [
			{ k: 'explain', t: ['Explained to {first}; they signed out on the tablet as well.'] },
			{ k: 'wait', gw: true, t: ["{first} has signed out on the tablet too. Waiting on the gateway team for a way to end all of one person's sessions at once, which the desk has asked for before and {first} would have liked here."] }
		]
	},
	{
		key: 'app-cookie', one: true, closable: true, fam: ['out'], apps: ['notes'], w: 6, os: 'android', from: FN_390, ver: '3.9.0', who: 'app', alt: ['restart', 'clock'], diag: 'P+X+K', art: 'none',
		story: ["{first} says {app} keeps forgetting them during the day. It seems to happen after they have been doing something else on the phone, such as taking photos for a report, and coming back to {app}.", "{first} uses the phone for everything on the job: photos, maps, calls, and {app}. Several times a day, on going back to {app}, they find the sign-in screen."],
		clue: ['It happens when {first} switches to the camera or the maps and back again.', '{first} has the battery saver on all day.', 'It started after {app} updated to 3.9.0.', 'Colleagues with iPhones do not have it.'],
		ask: 'Does it happen after the app has been in the background for a while, for instance after using the camera?',
		yes: ['Exactly that. Take a photo, come back, signed out.', 'Yes. Any time they leave {app} for a few minutes, it has forgotten them when they come back.'],
		no: 'No, it happens while they are using it.',
		more: [
			['Is the battery saver one of the stronger settings?', 'The strongest, apparently. The phone lasts two days that way.'],
			['Any other apps misbehaving?', 'None that {first} has noticed.'],
			['Which version did {first} have before?', '3.8.4, and it never happened then.']
		],
		check: ['The gateway shows nothing wrong: the session {first} was thrown out of was still valid, and the next sign-in made a new one. The app is dropping a session we still consider good.', 'Each of the sessions {first} lost was still good on our side when the next sign-in came in.'],
		reveal: ['Ours, on the app side. 3.9.0 on Android keeps the session only in memory; when Android stops the app in the background to save battery, the session goes with it.', 'Found it in the app: 3.9.0 on Android lost the stored session whenever the system stopped the app.'],
		after: ["How many users were affected?", "Every Android user on 3.9.0 with strong battery saving. Most never noticed because their phones keep apps alive longer."],
		ends: [
			{ k: 'fix', from: FN_391, t: ['Fixed in 3.9.1, which stores the session properly. IT pushed it to {first} this week and they have not been signed out since.'] },
			{ k: 'work', t: ['{first} has excluded {app} from battery saving, which keeps it alive in the background. No more sign-outs.'] },
			{ k: 'wait', until: FN_391, t: ['The fix is in 3.9.1. Until it is out, {first} has excluded {app} from battery saving. Waiting on the release.'] }
		]
	},
	{
		key: 'oversize', fam: ['missing'], apps: ['notes'], w: 11, who: 'office', alt: ['sync-prefix', 'bucket-down', 'wrong-db', 'training'], diag: 'P+', art: 'dBig',
		story: ["{manager} has a list from the planners of what was released for {site} this week. About half of it is on the tablets; the rest has not appeared, though the planners have released the missing ones again.", "{first} was told at the morning briefing about a set of jobs on the quay. Some are in {app} and some are not, and the ones that are not are, by coincidence or not, the bigger structural jobs."],
		clue: ['The missing ones all have drawings attached in the planning tool; the plain jobs come through.', '{n} of the {nn} orders released for {site} this week never arrived.', "The planners say the orders are 'released' in the planning tool and look normal there.", 'It is mostly the structural jobs that are missing.'],
		ask: 'Do the missing orders have anything in common, such as attachments or a lot of text?',
		yes: ['They all carry a drawing. The planners attach the PDF of the quay section to every structural job.', 'Now you ask: every missing one has a drawing on it.'],
		no: 'Nothing that we can see. Some are only a line or two.',
		more: [
			['Roughly how big are the drawings?', 'The planners say a few megabytes each, sometimes more for the big sections.'],
			['Have orders with drawings ever come through?', 'Small ones, the planners think, a sketch rather than a full drawing.'],
			['When did the planners start attaching drawings?', 'This summer, after the crews asked for them.']
		],
		check: ["The missing orders in the bucket are all far bigger than the rest: the drawing is stored inside the order's body as text, and those bodies run to several megabytes. The import leaves out anything over 1 MB. One of them:", 'Here is one of the missing orders as the bucket has it. The drawing is inside the order, as text, and the body is well over the 1 MB the import takes:'],
		reveal: ["So the planning tool embeds the drawing in the order itself, which takes the body over the import's 1 MB limit, and the import skips it without the order ever reaching a device.", "Confirmed from the back office. Our tool puts the attachment inside the order body. Anything with a real drawing goes over the gateway's size limit and is left out."],
		after: ["Is the size limit something that could be raised?", "It is there to keep the apps quick on poor signal; a few megabytes per order would make sync on the boats painful. Linking the drawings is the better answer."],
		ends: [
			{ k: 'fix', t: ['{office} changed the planning tool to store drawings separately and put a link in the order. The {site} orders were re-released and reached the tablets within the hour.'] },
			{ k: 'work', t: ['The planners at {site} re-released the jobs without drawings, and the crews get the drawings by email for now. Closing here.'] },
			{ k: 'wait', t: ['Waiting on {office} to change how the planning tool stores drawings; it is in their release at the end of the month. Until then planners leave drawings off and email them.'] }
		]
	},
	{
		key: 'sync-prefix', fam: ['missing'], apps: ['notes'], w: 4, from: PORTAL, who: 'office', alt: ['bucket-down', 'wrong-db', 'training'], diag: 'P+', art: 'dPrefix',
		story: ["The contractors at {site} were told their jobs would appear in {app} once the new portal went live. They can see them in the portal, and the planners can see them, but {app} shows none of them.", "{manager} says none of the contractor jobs created through the new portal have reached {site}, while everything the planners create in the usual way arrives as normal."],
		clue: ['All the missing jobs were created through the new contractor portal, which went live on 12 October.', 'Every contractor job at {site} is missing; jobs created by our own planners are fine.', 'The contractors can see their jobs in the portal itself.', 'Nothing from the portal has reached any device since it went live.'],
		ask: 'Where were the missing orders created, and what do their ids look like in the bucket?',
		yes: ["Created in the contractor portal. {office} says the ids look like '_sync:contractor:' followed by a number.", "The contractor portal, every one. The ids start '_sync:contractor:'."],
		no: 'In the planning tool, like all the others. The ids look normal.',
		more: [
			['How many contractor jobs are open?', 'About forty across all sites.'],
			['Who chose the id format in the portal?', 'The supplier, by the look of it. Nobody here asked for it.'],
			['Do the contractors use {app} as well?', 'Some of them, on Harbourline phones.']
		],
		check: ["Every one of them has an id starting with '_sync:'. The import leaves those out on purpose: that prefix is the gateway's own, for its bookkeeping documents.", 'Here are the ids. They all start with the prefix the gateway reserves for itself, which the import never brings in:'],
		reveal: ["The contractor portal namespaces its ids with '_sync:', which happens to be the prefix the gateway keeps for itself, so the import skips every contractor job.", "That is it: '_sync:' is reserved for the gateway, and the portal used it for its own ids."],
		after: ["Is anything else using that prefix?", "Not that anyone can find. It is meant for the gateway alone."],
		ends: [
			{ k: 'fix', t: ["{office} changed the portal's prefix to 'contractor:' and re-exported the open jobs. They are on the tablets now."] },
			{ k: 'wait', t: ["{office} will change the prefix, but the portal is the supplier's; they have raised it with them. Waiting on the supplier."] }
		]
	},
	{
		key: 'no-id', fam: ['missing'], apps: ['berths'], w: 6, who: 'office', alt: ['bucket-down', 'training'], diag: 'P+', art: 'dNoId',
		story: ["The {site} harbour office relies on the bookings from the shipping agents being on the board by the evening. On some days they are; on others, a whole afternoon's bookings are missing and the officers have to ring the agents.", "{first} says the board was missing every booking for a whole day this week, though the agents insist they sent them as usual."],
		clue: ["The bookings come from the spreadsheet upload in the back-office tool, which the agents' office does every afternoon.", 'Some days everything arrives and some days a whole upload is missing.', 'The shipping agents say they have sent their bookings the same way for years.', 'When a day is missing, it is the whole day, never a few bookings.'],
		ask: 'Did the missing bookings come in through the spreadsheet upload? If so, could we have a sheet from a bad day and one from a good day?',
		yes: ["Yes, the upload. Both sheets attached. On the bad day the column is headed 'Booking reference'; on the good day it is 'booking_ref'.", 'Through the upload. Two sheets attached; the headings are not quite the same.'],
		no: 'No, they were typed in one by one.',
		more: [
			['Who prepares the sheets?', "Two people in the agents' office, taking turns."],
			['Does the upload say anything when it finishes?', "It says 'Uploaded' and nothing else."],
			['Is there a pattern to the bad days?', 'Thursdays and Fridays, mostly.']
		],
		check: ['On the bad days the documents reach the bucket with an empty id. The import leaves out anything without an id; there would be nothing to call it on the devices. Two of them:', 'Here are two bookings from a bad day as the bucket has them. No id:'],
		reveal: ["The upload matches columns by exact heading. When the agents' office uses its own copy of the template, with the heading spelt out in full, the booking reference is not found and every row is written without an id.", "The upload looks for 'booking_ref' exactly. The sheets with 'Booking reference' give every row an empty id."],
		after: ["Could the upload warn the agents?", "That is part of what the back office is changing: a sheet without the reference column will be refused with a message saying why."],
		ends: [
			{ k: 'fix', t: ["{office} made the upload accept either heading and refuse a sheet with no reference column. {day}'s bookings were uploaded again and are on the iPads."] },
			{ k: 'explain', t: ["Explained to the agents' office that the template's headings must stay as they are; they have a fresh copy."] },
			{ k: 'wait', t: ['{office} will make the upload refuse a sheet without the reference column; it is in their backlog for next sprint.'] }
		]
	},
	{
		key: 'bucket-down', fam: ['missing'], apps: ['notes', 'stores'], w: 4, who: 'gateway', alt: ['oversize', 'sync-prefix', 'wrong-db', 'training'], diag: 'P+', art: 'imp',
		story: ["{manager} noticed that a batch of orders the night planner released is not on any device, while orders from before and after are. The planners can see them as released.", "{first} came in to find that the jobs released for them the previous evening were not in {app}, though the night planner says they went out."],
		clue: ['Orders released on {day} evening are missing; orders released earlier and later are fine.', 'Everything released between about 22:00 and 23:30 on {day} is missing, at every site.', 'Re-opening one of the missing orders in the planning tool and saving it made it appear.', 'The night planner released a big batch that evening.'],
		ask: 'Were the missing ones all released within the same hour or two?',
		yes: ['Yes, all between about ten and half eleven on {day} night.', 'Now that we line them up, yes: all late on {day}.'],
		no: 'No, they were released over several days.',
		more: [
			['Was there any maintenance that night?', 'Ops confirm a rebalance of the bucket cluster on {day} from 22:00 to about 23:30.'],
			['How many orders are we talking about?', 'Sixty-odd across all sites.'],
			['Did anything released the next morning go missing?', 'No, everything from the morning arrived.']
		],
		check: ["The import's counts for those batches show failures where the bucket refused writes, and the import does not try a failed document again; it waits for the next change to that document.", "Here are the import's batch counts from the status page for that evening:"],
		reveal: ['The orders released during the rebalance hit a bucket that was refusing writes, failed to import, and were never tried again.', 'That is the cause: the bucket was refusing writes during maintenance, and a document that fails to import is not retried until it changes again.'],
		after: ["Should ops tell us before bucket maintenance?", "Yes, and they have agreed to post it in the desk channel the day before."],
		ends: [
			{ k: 'work', t: ['The planners re-saved the affected orders, which sent them through the import again, and they arrived. Closing.'] },
			{ k: 'wait', gw: true, t: ['Re-saved, all arrived. The gateway team owes a retry for documents that fail to import; until then any bucket maintenance needs the planners to re-save afterwards.'] },
			{ k: 'fix', t: ['{eng} ran the import again for that window by hand and everything arrived.'] }
		]
	},
	{
		key: 'wrong-db', fam: ['missing'], apps: ['notes'], w: 4, who: 'office', alt: ['oversize', 'sync-prefix', 'bucket-down', 'training'], diag: 'P+', art: 'none',
		story: ["The new yard at {site} opened recently, and the crews there have been working from printed sheets because {app} has shown none of their orders. The old yard's crews get theirs as normal.", "{manager} runs the new yard at {site}. Since it opened, not a single order has arrived in {app}, though the planners can see plenty released for it."],
		clue: ["{site}'s new yard was added to the planning tool's site list on {day}, when it opened.", 'The orders for the new yard show in the planning tool with the right site name.', 'Nothing at all has arrived for the new yard since it opened.', 'The old yard at {site} gets its orders as normal.'],
		ask: "Is the new yard at {site} new in the planning tool's site list?",
		yes: ['It is, added on {day} when it opened.', 'Yes, it was added a fortnight ago.'],
		no: 'No, it has been there for years.',
		more: [
			['Who added the site?', 'One of the planners, from the template of another site.'],
			['Do the stores handhelds at {site} see anything odd?', 'Now you mention it, the storeman found work orders in the stock list.'],
			['How many orders have been released for the new yard?', 'About twenty.']
		],
		check: ['There is nothing for the new yard in the field-notes bucket since it was added, not even a skipped document. The import has never seen these orders.', 'The field-notes import has not been offered a single order for the new yard. Wherever they are going, it is not here.'],
		reveal: ["The planning tool's entry for the new yard points at the depot-stock bucket. The orders were imported there, into the stores database, where no field crew looks.", 'Found it. The new yard\'s entry was copied from a stores template and sends orders to the depot-stock bucket.'],
		after: ["Could the same happen to other new sites?", "Only if they are set up from a stores template. The planners have been asked to use the site template."],
		ends: [
			{ k: 'fix', t: ['{office} corrected the site entry and moved the orders across; the stray copies in the stores database have been deleted.'] },
			{ k: 'wait', t: ['{office} corrected the entry. Moving the orders already written needs a script they are writing; waiting on that.'] }
		]
	},
	{
		key: 'training', one: true, fam: ['few'], apps: ['notes', 'stores'], w: 8, who: 'desk', alt: ['oversize', 'sync-prefix', 'bucket-down'], diag: 'P+U+', art: 'none',
		story: ["{first} says the list in {app} is almost empty, while colleagues have plenty of work on theirs. They have refreshed, signed out and in, and restarted the device.", "{first} is new to the team at {site} and says {app} shows them hardly anything, though the crew lead says there is plenty for them to do."],
		clue: ['{first} started at {site} on {day}.', 'The crew lead at {site} sees everything on their own device.', '{first} was trained on an older version of the app.', '{first} is covering for someone on leave.'],
		ask: 'Which list or screen is {first} looking at in the app?',
		yes: ["'My jobs'. They had not noticed there is anything else.", "The first screen after signing in, which turns out to be 'My jobs'."],
		no: "'Site jobs', the full list.",
		more: [
			['Who assigns the work at {site}?', 'The crew lead, every morning.'],
			['Has {first} had the app induction?', 'Not yet; it is booked for next week.'],
			['Does the count in the corner of the screen match what the crew lead sees?', 'No, the crew lead has a much bigger number.']
		],
		check: ["Everything reached the database and {first}'s device has it. The items are assigned to the crew lead, not to {first}.", "Nothing is missing on our side: {first}'s device has synced everything there is."],
		reveal: ["It was there all along. 'My jobs' shows what is assigned to {first}, and these were assigned to the crew lead. 'Site jobs' shows them.", "They were looking at the wrong list. Everything is under 'Site jobs'."],
		after: ["Should the app open on 'Site jobs' by default?", "Worth raising with the app team. For crews who work as a team it would save calls like this one."],
		ends: [{ k: 'explain', t: ["Showed {first} the 'Site jobs' list over the phone; everything is there.", "Walked {first} through the two lists. They have found everything, and the crew lead will show the rest of the new starters."] }]
	},
	{
		key: 'gen-ten', fam: ['revert'], apps: ['notes'], w: 9, who: 'gateway', alt: ['overwrite'], diag: 'P+U+C', art: 'tRevid',
		story: ["{first} says entries made in the checklist simply vanish, and an older version of the checklist comes back on every device. It does not happen every day, but when it does it takes several days of entries with it.", "{manager} says the crews have twice lost a run of entries on the same checklist, which went back to how it looked some days earlier."],
		clue: ['It is always the daily checklists, the documents updated every day, and only ones that have been going a while.', 'Two people often edit the same checklist on the same morning.', 'The checklist for {asset} lost its last {n} days of entries on {day}.', 'New documents never seem to do it.'],
		ask: 'Which documents does it happen to, and roughly how many times has each one been edited?',
		yes: ['The daily checklist for {asset}, edited every day since the summer. The app says it is on revision {gen}.', 'Long-running ones only. The one {first} showed me has been edited {gen} times.'],
		no: 'Only a handful of times; they are all new this month.',
		more: [
			['Are two people ever editing the same one on the same day?', 'Yes, the morning and afternoon shifts both add to it.'],
			['Did it ever happen with a fresh document?', 'Not that anybody remembers.'],
			['Is the older version that comes back always the same one?', 'It looks like it, yes: the same day keeps coming back.']
		],
		check: ['When two revisions of the checklist met, the one with generation 9 beat the one with generation {gen}. The generations are compared as text, and as text "9" sorts after anything starting with "1":', 'I reproduced it with the two revisions from the bucket:'],
		reveal: ['That is the bug: when the gateway picks a winner between two revisions, it compares the generations as text, so from generation 10 onwards an older revision can beat a newer one, and the older version comes back on every device.', 'Found. Revision generations are compared as strings, so "10" loses to "9", and the older version wins.'],
		after: ["How many documents are past generation nine?", "A few hundred across the databases, almost all daily checklists and boards."],
		ends: [
			{ k: 'wait', gw: true, t: ['Waiting on the gateway team to compare generations as numbers. In the meantime the crews are keeping to one person per checklist per day.'] },
			{ k: 'work', t: ['{site} has started a fresh checklist document each week, which keeps generations below ten. That works for them; closing.'] }
		]
	},
	{
		key: 'offline-conflict', one: true, fam: ['revert'], apps: ['notes'], w: 9, who: 'gateway', alt: ['gen-ten', 'overwrite'], diag: 'P+U+C', art: 'rBranch',
		story: ["{first} updated a report out on the job and later found their changes gone, replaced by a colleague's version. The colleague's changes are there; theirs are not.", "{first} made an entry on a report, saw it saved, and later found it missing. A colleague had changed the same report at about the same time."],
		clue: ['The two crew members were both out on the breakwater with no signal.', '{first} and {colleague} both updated the report for {asset} on {day}, one on the boat and one on the quay.', 'The lost entry was made while the boat was out of range.', 'It has happened twice, both times on a day with the boat out.'],
		ask: 'Were two people editing the same document at about the same time, either of them offline?',
		yes: ['Yes: {first} and {colleague} both changed it within half an hour, and {colleague} had no signal on the boat.', 'Two of them, and one was out of range at the time.'],
		no: 'No: only {first} ever edits it.',
		more: [
			['Is the lost text important?', 'It is the measurement of the crack, so yes.'],
			['Did either of them see a warning?', 'No, nothing.'],
			['Which of them saved first?', '{colleague}, by a few minutes, but they only got signal later.']
		],
		check: ["The report has two branches from {day}: the gateway kept both and picked one as the winner, as it always does when two devices change the same document without seeing each other's change.", 'Here is the revision history of the report:'],
		reveal: ["Nothing was lost: {first}'s edit is still there as the losing revision. The app shows only the winner and has no way to show the other.", "Both edits are kept. The app only ever shows the winning one, so {first}'s looked gone."],
		after: ["Will the app ever show both versions?", "It is on the app team's list, not yet planned."],
		ends: [
			{ k: 'explain', t: ['Explained to {first} and {colleague}; {appdev} copied the missing lines into the current version.'] },
			{ k: 'wait', t: ['The text is recovered. The app team has a request to show conflicting versions; waiting on them to plan it.'] }
		]
	},
	{
		key: 'overwrite', fam: ['revert'], apps: ['notes'], w: 6, from: FN_390, who: 'office', alt: ['offline-conflict'], diag: 'P+U+', art: 'rNight',
		story: ["{first} says notes they add to work orders are gone the next morning, every morning. Notes they write in their own reports stay put.", "The crews at {site} have started adding notes to the work orders in {app}, and every morning those notes are gone."],
		clue: ["The crew's notes on the work orders vanish overnight, every night, but notes on their own defect reports stay.", 'It happens around two in the morning; the night watch saw the notes there at midnight.', 'Only work orders from the planning tool are affected.', 'It started when the crews began writing notes on the orders themselves.'],
		ask: 'Does anything outside the app write to those documents, a nightly job in the back office for example?',
		yes: ['{office} says the planning tool re-sends all open orders at 02:00 every night.', 'There is a nightly sync from the planning tool, {office} says.'],
		no: 'Nothing that we know of.',
		more: [
			['When did the crews start writing notes on the orders?', 'Since 3.9.0 made the notes field editable.'],
			['Does the planning tool keep anything the crew write?', 'No, it has its own copy only.'],
			['Is it every open order?', 'Every one they have checked.']
		],
		check: ["Each order gets a new revision at about 02:00, not from a device, and that revision does not contain the crew's notes.", 'Here is the history of one affected order:'],
		reveal: ["The planning tool rewrites every open order from its own copy at 02:00, and its copy has never seen the crew's notes, so the nightly write replaces them.", 'Yes, that is our nightly job, overwriting the whole order from the planning tool\'s copy.'],
		after: ["Did other sites lose notes too?", "Every site with open orders. Most crews had not started writing notes on orders yet, so few noticed."],
		ends: [
			{ k: 'fix', t: ['{office} changed the nightly job to send only orders that changed in the planning tool, and to leave the notes field alone.'] },
			{ k: 'wait', t: ['{office} is changing the nightly job; until it ships, crews add notes as a separate defect report linked to the order.'] }
		]
	},
	{
		key: 'tombstone', fam: ['zombie'], apps: ['notes', 'stores'], w: 8, from: GW_040, who: 'office', alt: ['app-cache'], diag: 'P+', art: 'dTomb',
		story: ["{manager} says items the back office cancelled are still on every device at {site}, and crews keep acting on them. Items closed on the devices in the normal way disappear as they should.", "{first} turned up to do a job that the back office says was cancelled days ago. It is still in {app}, with others like it."],
		clue: ['The back office cancelled the items on {day}; they are gone there but still on the devices.', 'Cancelled items stay on the devices; the ones completed on the devices clear normally.', 'It seems to have started in early September.', 'Every device at {site} shows them.'],
		ask: 'How does the back-office tool delete an item? Does it write anything to the bucket when it does?',
		yes: ["{office} says it writes a deleted marker with the item's id, nothing else.", 'A deletion marker, according to {office}.'],
		no: 'It does not delete; it marks them cancelled.',
		more: [
			['Is it every device?', 'Every device at {site}, and other sites too.'],
			['Did cancellations work before September?', 'They think so, mostly.'],
			['How many cancelled items are still showing?', 'Dozens, across the sites.']
		],
		check: ['The cancelled items have deletion markers in the bucket, but without a revision. Since 0.4.0 the import skips a deletion that has no revision rather than failing on it, so the cancellation never gets to the devices.', 'Here are the deletion markers:'],
		reveal: ['The back-office tool writes deletions without the revision of the document it deletes, and the import leaves those out, so the devices never hear that it is gone.', 'Our deletes carry no revision, and the gateway skips them. That is on our side.'],
		after: ["Why did this start in September?", "Before 0.4.0 the import failed on those deletions instead of skipping them, which caused other trouble; skipping them is better, but the tool still has to send the revision."],
		ends: [
			{ k: 'fix', t: ['{office} changed the tool to include the current revision when it deletes. Cancelled again, the items cleared from the devices.'] },
			{ k: 'wait', t: ['Waiting on {office} to include the revision when the tool deletes. Meanwhile the back office marks items as cancelled in the body instead of deleting them.'] }
		]
	},
	{
		key: 'app-cache', one: true, closable: true, fam: ['zombie'], apps: ['stores'], w: 5, ver: '1.12.2', from: '2026-08-04', who: 'app', alt: [], diag: 'P+', art: 'none',
		story: ["{first} says their handheld still shows stock lines the back office removed, while the handheld next to it does not. Counting against them caused confusion at the weekly check.", "One handheld at the {site} store still lists lines that were removed earlier in the week. The others have dropped them."],
		clue: ["The lines were removed in the back office on {day}, and a colleague's handheld no longer shows them.", 'Only one handheld at {site} still shows them.', 'The handheld lives in its dock most of the day.', 'Turning the handheld off and on did not help.'],
		ask: 'Is it every handheld, or only one?',
		yes: ["Only {first}'s handheld.", 'Just the one.'],
		no: 'Every handheld at the site.',
		more: [
			['Has {first} tried a full refresh?', 'Pulled down, waited, nothing.'],
			['Which version is the handheld on?', '1.12.2.'],
			['Is the handheld docked when the lines are removed?', 'Usually, yes. It sits in the dock during the morning.']
		],
		check: ['The deletions reached the gateway and the other handhelds have them. One device holding on is about the device.', 'Everything on our side is as it should be: the deletions arrived and the other handhelds took them.'],
		reveal: ['Known issue in Stores 1.12.2: it keeps its own cache of stock lines and does not clear it if a deletion arrives while the handheld is docked and the app is in the background.', 'That is the 1.12.2 local cache. It misses deletions that arrive while the app is in the background.'],
		after: ["Should every Stores user update?", "Yes, IT is pushing 1.12.3 to all the handhelds."],
		ends: [
			{ k: 'fix', from: ST_1123, t: ['Stores 1.12.3 clears the cache properly. Updated; the lines are gone.'] },
			{ k: 'work', t: ["'Reset local data' in the settings cleared it. Told {first} to do the same if it happens again."] }
		]
	},
	{
		key: 'captive', fam: ['stuck'], apps: ['notes', 'berths', 'stores'], w: 7, who: 'it', alt: ['queue-stuck'], diag: 'Q+Z+', art: 'wifi',
		story: ["{first} says nothing they enter at the depot reaches the office. The count of changes waiting goes up through the shift, and drops to nothing when they get home and the device switches to mobile data.", "{manager} says the whole depot crew have the same: changes pile up all day and go through in the evening, away from the depot."],
		clue: ['The {site} depot only has the guest wifi in the crew room.', 'Nothing uploads at the depot; at home on mobile data it all goes through.', 'The device shows full wifi bars.', 'It started when the depot moved to the new building.'],
		ask: 'Which network is the device on when it fails to sync?',
		yes: ['The depot guest wifi. It asks you to accept terms in a browser once a day.', 'The guest wifi, every time.'],
		no: 'Mobile data; there is no wifi where they work.',
		more: [
			['Does anyone accept the terms page in the morning?', 'Only if they open a browser, which nobody does.'],
			['Is there staff wifi at {site}?', 'Not in the crew room.'],
			['Does mobile data work in the crew room?', 'Barely; it is a steel building.']
		],
		check: ["The device's network check shows the wifi answering with a redirect to a sign-up page instead of the gateway.", 'From a laptop on the same wifi:'],
		reveal: ['The guest wifi holds every connection at its terms page until somebody accepts them in a browser, and the app has no browser to do it in.', 'The guest wifi wants the terms accepted daily; until then nothing gets out.'],
		after: ["Are other depots on guest wifi?", "Two others, IT thinks. They are checking."],
		ends: [
			{ k: 'work', t: ["Crews accept the terms in the device's browser at the start of the shift; sync goes through after that."] },
			{ k: 'fix', t: ['{it} has put the devices on the staff wifi at {site}; sync is normal.'] },
			{ k: 'wait', t: ['{it} is adding staff wifi to the crew room; until it is installed, crews use mobile data. Waiting on the installation.'] }
		]
	},
	{
		key: 'queue-stuck', one: true, closable: true, fam: ['stuck'], apps: ['notes'], w: 6, ver: '3.8.4', until: '2026-09-25', who: 'app', alt: ['captive'], diag: 'P+U+CQ+', art: 'none',
		story: ["{first} has a growing pile of changes waiting to upload. Now and then they go through in a rush, usually after the phone has been restarted, and then the pile starts growing again.", "{first} says {app} stops sending after a while. Restarting gets it going again, but only for a few hours."],
		clue: ['{first} has {n} changes waiting to upload, the oldest from {day}.', 'Restarting the phone makes it upload, for a while.', '{first} has not updated {app} for a while.', 'Some of the waiting changes are from jobs other crew members also worked on.'],
		ask: 'Does restarting the app get the changes moving?',
		yes: ['Yes, for a few hours.', 'It does, then it sticks again.'],
		no: 'No, restarting changes nothing.',
		more: [
			['Which version is {first} on?', '3.8.4.'],
			['Does it stick at a particular change?', 'Always after one that was edited on two devices, {first} thinks.'],
			['Is anything ever lost?', 'Not so far. It all goes in the end.']
		],
		check: ["The gateway turned down one change from {first}'s phone on {day} as a conflict, which is normal; after that nothing more arrived from the phone until it restarted.", 'One refused change, then silence until the restart.'],
		reveal: ['That is the 3.8 upload queue: one refused change stops the queue until the app restarts.', 'Known in 3.8.x: one refused change stops the upload queue until the app restarts.'],
		after: ["Should everyone be pushed to 3.9.0?", "IT is doing it in stages; this is a good reason to hurry."],
		ends: [
			{ k: 'fix', from: FN_390, t: ['Fixed in 3.9.0. {first} updated; the queue emptied.'] },
			{ k: 'work', t: ['Restart the app when the waiting count stops falling; 3.9.0 is the real fix and {first} will update when IT pushes it.'] }
		]
	}
];
const causeByKey = new Map(causes.map((cause) => [cause.key, cause]));

// Generic lines of the thread.
const openers = ['Thanks, {raiserFirst}, I will take this.', 'Picked up.', 'Thanks for writing it up so fully.', 'Mine.', 'Had a quick look this morning.', 'Taking this one; {eng2First} is on the release.', 'Thanks. Before I dig in, one thing I need to know.', 'Looking at this now.', 'Thanks, {raiserFirst}.'];
const extraQs = ['And roughly when did it start? A day is enough.', 'Also, is anyone else at {site} seeing anything like it?', "If they can send a diagnostics export from the app's settings, that would help too.", 'Is it every time, or now and again?', 'And has anything changed for them lately: a new device, a move, an update?'];
const relays = ['Spoke to {first} this morning.', '{first} rang back.', 'Asked {manager}, who asked around.', 'Got hold of {first} between jobs.', 'Answer from {site}:', 'Caught {first} at the end of their shift.', 'Had a long chat with {first}.', 'Emailed {first}, who replied straight away.'];
const ruledOut = ['Then it is not that. Different question:', 'OK, that rules out the obvious one. Next:', 'Thanks, that crosses one thing off. So:', 'Right, not that, then.', 'Fine, scratch that idea.', 'Good to know, and it changes my guess.'];
const askAgain = ['One more thing:', 'Also:', 'Follow-up:', 'Thanks. Another question:', 'That helps.', 'Useful.'];
const checkIntros = ['Here is what I see from our side.', 'Had a proper look.', 'Some progress.', 'Looked into it.', 'I think I am getting somewhere.', ''];
const deskTails = ['Let me know what else you need.', 'Thanks for looking at this.', 'Happy to get more from them if it helps.', '', '', '', 'Shout if I have misunderstood the question.', '{first} says thanks for looking.'];
const gwTails = ['', '', '', 'I will look again this afternoon.', 'More when I have it.', 'Not conclusive yet, but it narrows it down.', 'Will update here.'];
const tangents: [Party, string][] = [
	['desk', '{manager} rang again this morning asking for an update. I said we are on it.'],
	['desk', 'Possibly related: ESC-{other}, raised for {site2}. Linking it here in case.'],
	['desk', '{first} is off for the next two days, so replies may be slow.'],
	['desk', 'The {site} supervisor asks whether this will be sorted before the weekend. I have said we will let them know.'],
	['desk', 'Two more calls about this from {site} today. Same story.'],
	['gateway', 'I am out Thursday and Friday; {eng2First} has the context if anything comes up.'],
	['gateway', 'Sorry for the silence, the release took most of yesterday.'],
	['gateway', 'Moving this up my list.'],
	['app', "Reading along. Nothing in the app's crash reports for this device, for what it is worth."],
	['desk', 'For the record, {first} has been very patient about all this.'],
	['gateway', 'Back on this after the incident review.'],
	['desk', '{first} will be out on site until about three, so replies may be slow today.'],
	['desk', 'Note for whoever picks this up next: {first} prefers email to phone.'],
	['gateway', 'Still on my list. Something else came up yesterday afternoon.'],
	['desk', '{manager} wants to know whether other sites have had the same. I said I would ask here.'],
	['gateway', 'Not forgotten. Will get to it tomorrow morning.'],
	['office', 'Saw this mentioned in the planning stand-up. Shout if the back office can help.'],
	['desk', 'Changed the priority to normal; {first} has a way to keep working.'],
	['it', 'Reading along. Nothing on the IT side that I can see, but happy to check anything you need.'],
	['desk', 'Quick update: {first} says {site} is short-handed this week, so it matters more than it might look.']
];
const afterReveal = ['For the record, {first} has been very patient about all this.', 'Thanks, that makes sense of it. Passing it on to {first} now.', 'That explains a lot. I will let {site} know.', 'Good, thank you. I will ring {first} this afternoon.'];
const confirms = ['Confirmed with {first}. Closing.', '{first} says it is all fine now. Thanks, everyone.', 'I have let {site} know and I am closing this.', 'Marking this resolved.', 'Thanks all. {first} is happy; closing.'];
const waitTails = ['Leaving this open until then.', 'I will chase in a week.', 'Keeping it open.', 'I have told {site}.', 'Will update here when it moves.'];
const closedPath: [Party, string][][] = [
	[['desk', 'No reply from {first} for over a week, and two calls went to voicemail.'], ['gateway', 'Without a way to reproduce it I cannot take this further. Closing; reopen if it happens again.']],
	[['desk', '{first} says it has not happened again since we last spoke, and has no idea why.'], ['gateway', 'Then I will close this for now. If it comes back, raise a new one and link this.']],
	[['desk', '{first} has gone on leave for two weeks and nobody else at {site} has seen it.'], ['desk', 'Closing. We can reopen when they are back if it is still happening.']],
	[['desk', '{manager} says {first} has moved to other duties and no longer uses {app}.'], ['gateway', 'Then there is nothing left to test against. Closing without a cause.']]
];
const twistBack = ['It happened once more last week, to {colleague} this time, for the same reason, and the same thing sorted it.', 'Short update: {colleague} at {site} had the same thing since, and the same answer worked.'];
const twistDone = ['Update: that is now done. {first} confirms it is all working. Closing.', 'Done at last. Checked with {first}; all good now. Closing.'];
const callflow = [
	'The line kept dropping, so some of this came by text message afterwards.',
	'{first} was in the van with the engine running, so we went slowly.',
	'{manager} sat in on the call and filled in some of the background.',
	'We went through it twice to be sure I had it right.',
	'{first} had already rung the {site} office before calling us, and they suggested the desk.',
	'The call was short; {first} had a job to get back to.',
	'{first} was calm about it, if fed up.',
	'I asked {first} to send screenshots, which arrived a little later.',
	"{first} called from a colleague's phone.",
	'Most of what follows came from {manager}, who had already asked around.'
];
const plans = [
	'Depending on the answer I will look at our side or pass it to whoever owns the next piece.',
	'I would rather not guess beyond that until I hear back.',
	'Once I have that I can rule a few things in or out.',
	'That will tell me where to look next.',
	''
];
const closings = ['Raising with the gateway team because we have run out of things to try on our side.', 'Could someone take a look? The user is waiting on us.', 'Not urgent for the whole fleet, but urgent for them.', 'Raising this as we cannot see anything more from the desk.', ''];

// Pasted output.
const diag = (r: Rand, app: App, appVersion: string, device: string, date: string, start: number, pattern: string, method: string, signIn: boolean, back = false): string => {
	const codes: string[] = [];
	for (let i = 0; i < pattern.length; i++) {
		const code = pattern[i]!;
		if (code === '+') continue;
		const times = pattern[i + 1] === '+' ? int(r, 1, 3) : 1;
		for (let n = 0; n < times; n++) codes.push(code);
	}
	const labels: Record<string, [string, string]> = {
		R: ['sign in (password)', '401'], L: ['sign in (password)', '403'], K: ['sign in (password)', '200'], O: [`sign in (${method})`, 'failed'],
		W: ['session check', '200'], X: ['session check', '401'], P: ['sync: pull', '200'], U: ['sync: push', '200'], C: ['sync: push', '409'],
		Q: ['sync: push', 'not sent'], Z: ['sync: pull', 'unexpected answer']
	};
	let minute = start - (back ? int(r, 10, 35) : int(r, 60, 150));
	const rows = codes.map((code) => {
		minute += int(r, 1, 12);
		const [label, status] = labels[code]!;
		return `  ${clock(Math.max(0, minute))}:${pad(int(r, 0, 59))}  ${label.padEnd(26)}${status.padEnd(12)}${int(r, 90, 900)} ms`;
	});
	const signed = !/[RLOXQZ]/.test(codes.at(-1) ?? '');
	const waiting = codes.filter((code) => code === 'Q').length * int(r, 1, 4) + (pattern.includes('C') ? int(r, 1, 3) : int(r, 0, 1));
	const lastOk = codes.map((code, i) => (code === 'P' || code === 'U' ? i : -1)).filter((i) => i >= 0).at(-1);
	const synced = lastOk !== undefined ? `${date} ${rows[lastOk]!.trim().slice(0, 5)}` : `${prevWorkday(date, int(r, 1, 3))} ${clock(int(r, 420, 1080))}`;
	return [
		'```text',
		`${app.name} diagnostics · exported ${date} ${clock(start)} (device time)`,
		`App version       ${appVersion} (build ${int(r, 300, 700)})`,
		`Device            ${device}`,
		`Database          ${app.db}`,
		`Signed in         ${signed ? 'yes' : 'no'}`,
		`Sign-in method    ${method}`,
		`Last sync         ${synced}`,
		`Changes waiting   ${waiting}`,
		'Device clock      in step',
		'Recent activity',
		...rows,
		'```'
	].join('\n');
};
const mdm = (r: Rand, s: Slots, app: App): string => {
	const rows = [`Harbourline device management · devices assigned to ${s.user}`, '', '| Device | Model | OS | App version | Last check-in |', '| --- | --- | --- | --- | --- |'];
	rows.push(`| HL-${app.tag}-0${int(r, 100, 999)} | ${s.device!.split(' · ')[0]} | ${s.device!.split(' · ')[1]} | ${app.name} ${s.version} | ${s.isoDate} ${clock(int(r, 400, 560))} |`);
	rows.push(`| HL-PHN-0${int(r, 100, 399)} | Samsung Galaxy ${s.olddevice} | Android ${int(r, 12, 13)} | ${app.name} ${app.versions[0]![1]} | ${s.isoDate} ${clock(int(r, 380, 700))} |`);
	if (r() < 0.4) rows.push(`| HL-LAP-${int(r, 1000, 1999)} | Dell Latitude 5450 | Windows 11 | none | ${prevWorkday(s.isoDate!, int(r, 1, 9))} ${clock(int(r, 480, 1020))} |`);
	return rows.join('\n');
};
const table = (header: string[], rows: string[][]) =>
	[`| ${header.join(' | ')} |`, `| ${header.map((_, i) => (rows.every((row) => /^[\d.,]+$/.test(row[i] ?? '')) ? '---:' : '---')).join(' | ')} |`, ...rows.map((row) => `| ${row.join(' | ')} |`)].join('\n');
const metricsSignin = (r: Rand, s: Slots, db: string) => {
	const spike = Number(s.time!.slice(0, 2));
	const rows: string[][] = [];
	for (let hour = 6; hour <= 13; hour++) rows.push([`${pad(hour)}:00`, String(int(r, 8, 60)), String(hour === spike ? int(r, 11, 16) : int(r, 0, 3)), String(hour > spike ? int(r, 1, 6) : 0)]);
	return `${db}, sign-in answers by hour, ${s.dayIso}\n\n${table(['Hour', '200', '401', '403'], rows)}`;
};
const metricsTrickle = (r: Rand, s: Slots, db: string) => {
	const rows: string[][] = [];
	let minute = int(r, 22 * 60 + 30, 23 * 60 + 20);
	for (let i = 0; i < 12; i++) {
		rows.push([clock(minute % 1440), '0', i < 10 ? '1' : '0', i < 10 ? '0' : '1']);
		minute += 5;
	}
	return `POST /_session answers on ${db}, night of ${addDays(s.isoDate!, -1)}, 5-minute buckets (quiet buckets left out)\n\n${table(['Time', '200', '401', '403'], rows)}`;
};
const metricsOidc = (r: Rand, s: Slots) => {
	const drop = Number(s.time!.slice(0, 2));
	const rows: string[][] = [];
	for (let hour = 6; hour <= 14; hour++) rows.push([`${pad(hour)}:00`, String(int(r, 10, 40)), String(hour < drop ? int(r, 40, 140) : 0), String(hour < drop ? int(r, 0, 2) : int(r, 30, 120))]);
	return `All databases, sign-ins by hour, ${s.oidcIso}\n\n${table(['Hour', 'Password, ok', 'Harbourline ID, ok', 'Harbourline ID, failed'], rows)}`;
};
const metricsSessions = (r: Rand, s: Slots) => {
	const rows: string[][] = [];
	let active = int(r, 300, 520);
	for (let minute = 5 * 60; minute <= 6 * 60 + 40; minute += 10) {
		active = minute === 5 * 60 + 40 ? 0 : minute > 5 * 60 + 40 ? active + int(r, 20, 70) : active + int(r, -5, 8);
		rows.push([clock(minute), String(active)]);
	}
	return `Active sessions, all databases, ${s.dayIso}\n\n${table(['Time', 'Active sessions'], rows)}`;
};
const testLogin = (r: Rand) =>
	['```text', '$ go test ./auth/ -run Login -v', '=== RUN   TestLoginAcceptsTheRightPassword', '--- PASS: TestLoginAcceptsTheRightPassword (0.00s)', '=== RUN   TestLoginCountsFailures', '--- PASS: TestLoginCountsFailures (0.00s)', '=== RUN   TestLoginLocksAfterTooManyFailures', '--- PASS: TestLoginLocksAfterTooManyFailures (0.00s)', '=== RUN   TestLoginNameMatchesExactly', `    scratch_test.go:${int(r, 14, 40)}: "Mara" refused, "mara" accepted`, '--- PASS: TestLoginNameMatchesExactly (0.00s)', 'PASS', `ok  \ttidegate/auth\t0.0${int(r, 10, 60)}s`, '```'].join('\n');
const testRevid = (r: Rand, s: Slots) =>
	['```text', '$ go test ./db/ -run TestCompareRevIDs -v', '=== RUN   TestCompareRevIDs', `    revid_test.go:${int(r, 28, 34)}: CompareRevIDs("${s.gen}-${hex(r, 4)}", "9-${hex(r, 4)}") = -1, want sign of 1`, '--- FAIL: TestCompareRevIDs (0.00s)', 'FAIL', `FAIL\ttidegate/db\t0.00${int(r, 3, 9)}s`, '```'].join('\n');
const config = () => ['```yaml', 'databases:', '  berth-plans:', '    session_ttl: 8h', '    max_failed_logins: 10', '  field-notes:', '    session_ttl: 24h', '    max_failed_logins: 10', '  depot-stock:', '    session_ttl: 24h', '    max_failed_logins: 10', '```'].join('\n');
const oidcConfig = () =>
	['```yaml', 'oidc:', '  providers:', '    - name: harbour-id', '      issuer: https://id.harbourline.example', '      client_id: tidegate', '      token_endpoint: https://id.harbourline.example/token', '      callback_url: https://sync.harbourline.example/_oidc_callback', '    - name: forth-pilots', '      issuer: https://login.forthpilotage.example', '      client_id: harbourline-tidegate', '      token_endpoint: ""', '      callback_url: https://sync.harbourline.example/_oidc_callback', '```'].join('\n');
const docBig = (r: Rand, s: Slots) =>
	['```json', '{', `  "id": "order:${int(r, 50000, 69999)}",`, `  "rev": "1-${hex(r, 8)}",`, '  "body": {', '    "type": "work_order",', `    "site": "${s.site}",`, `    "asset": "${cap(s.asset!)}",`, `    "title": "${pick(r, ['Inspect and report', 'Replace damaged section', 'Survey after storm', 'Repair to drawing'])}",`, `    "due": "${addDays(s.isoDate!, int(r, 3, 20))}",`, '    "priority": "routine",', `    "drawing": "JVBERi0xLjcKJeLjz9MK… (${int(r, 1, 4)},${int(r, 100, 999)},${int(r, 100, 999)} characters)"`, '  }', '}', '```'].join('\n');
const docPrefix = (r: Rand) => {
	const rows = ['```text', 'bucket field-notes · ids written by contractor-portal, last 7 days'];
	for (let i = int(r, 6, 10); i > 0; i--) rows.push(`_sync:contractor:${int(r, 10000, 19999)}`);
	return [...rows, '```'].join('\n');
};
const docNoId = (r: Rand, s: Slots) => {
	const booking = (vessels: string[]) => [`  {`, '    "id": "",', `    "rev": "1-${hex(r, 8)}",`, `    "body": { "type": "booking", "vessel": "${pick(r, vessels)}", "berth": ${int(r, 1, 12)}, "eta": "${addDays(s.isoDate!, int(r, 1, 6))}T${pad(int(r, 0, 23))}:00" }`, '  }'].join('\n');
	return ['```json', '[', `${booking(['MV Hjaltland', 'Northern Star', 'Skandi Mongstad', 'Ocean Kestrel'])},`, booking(['Polar Venture', 'Sea Spey', 'Grampian Frontier', 'MV Lochnevis']), ']', '```'].join('\n');
};
const docTomb = (r: Rand, db: string) => {
	const rows = ['```json', '['];
	const count = int(r, 2, 4);
	for (let i = 0; i < count; i++) rows.push(`  { "id": "${db === 'depot-stock' ? 'stock' : 'order'}:${int(r, 50000, 69999)}", "rev": "", "deleted": true }${i < count - 1 ? ',' : ''}`);
	return [...rows, ']', '```'].join('\n');
};
const revBranch = (r: Rand, s: Slots) => {
	const g = int(r, 3, 8);
	return ['```text', `revisions of report:${int(r, 3000, 8999)} (bucket browser)`, `  ${g + 1}-${hex(r, 4)}  ${s.dayIso} 10:${pad(int(r, 30, 59))}  device HL-PHN-0${int(r, 100, 399)}   winner`, `  ${g + 1}-${hex(r, 4)}  ${s.dayIso} 10:${pad(int(r, 0, 29))}  device HL-TAB-0${int(r, 100, 399)}   conflict, kept`, `  ${g}-${hex(r, 4)}  ${prevWorkday(s.dayIso!)} 16:${pad(int(r, 0, 59))}  device HL-PHN-0${int(r, 100, 399)}`, '```'].join('\n');
};
const revNight = (r: Rand, s: Slots) => {
	const rows = ['```text', `revisions of order:${int(r, 50000, 69999)} (bucket browser)`];
	let g = int(r, 9, 14);
	for (let d = 0; d < 3; d++) {
		rows.push(`  ${g}-${hex(r, 4)}  ${addDays(s.isoDate!, -d)} 02:0${int(r, 0, 9)}  planning tool`);
		rows.push(`  ${g - 1}-${hex(r, 4)}  ${addDays(s.isoDate!, -d - 1)} 1${int(r, 0, 7)}:${pad(int(r, 0, 59))}  device HL-PHN-0${int(r, 100, 399)}`);
		g -= 2;
	}
	return [...rows, '```'].join('\n');
};
const importStats = (r: Rand, s: Slots, db: string) => {
	const rows: string[][] = [];
	for (let minute = 21 * 60 + int(r, 30, 50); minute < 24 * 60; minute += int(r, 15, 30)) {
		const docs = int(r, 4, 30);
		const failed = minute >= 22 * 60 && minute <= 23 * 60 + 30 ? docs - int(r, 0, 2) : 0;
		rows.push([clock(minute), String(docs), String(Math.max(0, docs - failed)), String(failed)]);
	}
	return `Import batches, ${db}, evening of ${s.dayIso} (status page)\n\n${table(['Batch started', 'Documents', 'Imported', 'Failed'], rows)}`;
};
const wifi = (r: Rand, s: Slots) =>
	['```text', `$ curl -sI https://sync.harbourline.example/${s.db}/_session`, 'HTTP/1.1 302 Found', `Location: https://guest.harbourline.example/portal?site=${s.site!.toLowerCase()}&ap=${int(r, 1, 9)}`, 'Content-Length: 0', '', '$ curl -sI https://www.harbourline.example/', 'HTTP/1.1 302 Found', `Location: https://guest.harbourline.example/portal?site=${s.site!.toLowerCase()}&ap=${int(r, 1, 9)}`, '```'].join('\n');
const art = (kind: Art, r: Rand, s: Slots, app: App): string => {
	switch (kind) {
		case 'mdm': return mdm(r, s, app);
		case 'mSignin': return metricsSignin(r, s, app.db);
		case 'mTrickle': return metricsTrickle(r, s, app.db);
		case 'mOidc': return metricsOidc(r, s);
		case 'mSessions': return metricsSessions(r, s);
		case 'tLogin': return testLogin(r);
		case 'tRevid': return testRevid(r, s);
		case 'cfg': return config();
		case 'oidcCfg': return oidcConfig();
		case 'dBig': return docBig(r, s);
		case 'dPrefix': return docPrefix(r);
		case 'dNoId': return docNoId(r, s);
		case 'dTomb': return docTomb(r, app.db);
		case 'rBranch': return revBranch(r, s);
		case 'rNight': return revNight(r, s);
		case 'imp': return importStats(r, s, app.db);
		case 'wifi': return wifi(r, s);
		default: return '';
	}
};
// Earlier contact about the same matter, as the desk's tool lists it.
const contacts = (r: Rand, date: string) => {
	const rows: string[][] = [];
	let day = date;
	for (let i = int(r, 1, 4); i > 0; i--) {
		day = prevWorkday(day, int(r, 1, 4));
		rows.push([shortDate(day), pick(r, ['phone', 'phone', 'email', 'chat']), String(int(r, 3, 35)), pick(r, desk)]);
	}
	return `Earlier contact from this caller, any subject:\n\n${table(['Date', 'Channel', 'Minutes', 'Desk'], rows.reverse())}`;
};

// One escalation.
type Slots = Record<string, string>;
const roleOf: Record<Party, string> = { gateway: 'gateway team', app: 'app team', office: 'back-office tools', it: 'IT', desk: 'app support' };
const seen = new Map<string, number[]>();

const escalation = (index: number, number: number, date: string, cause: Cause): string => {
	const r = mulberry32(0x7e5c0000 + index * 7919);
	const familyKey = pick(r, cause.fam);
	const v = int(r, 0, 1);
	const signIn = ['pw', 'lock', 'oidc', 'pilots'].includes(familyKey);
	const pattern = familyKey === 'lock' && !cause.diag.includes('L') ? `${cause.diag}L+` : familyKey === 'pw' ? cause.diag.replace('L+', '') : cause.diag;
	const family = families[familyKey]!;
	const appKey = pick(r, cause.apps);
	const app = apps[appKey];
	const method = familyKey === 'pilots' ? 'forth-pilots' : familyKey === 'oidc' ? 'Harbourline ID' : signIn || appKey === 'stores' || r() < 0.5 ? 'password' : 'Harbourline ID';
	const os = cause.os ?? (app.ios.length === 0 ? 'android' : app.android.length === 0 ? 'ios' : r() < 0.6 ? 'android' : 'ios');
	const device = pick(r, os === 'android' ? app.android : app.ios);
	const version = cause.ver ?? versionOn(app, date, r() < 0.25 ? 1 : 0);
	const site = pick(r, sites);
	const first = pick(r, firstNames);
	const last = pick(r, surnames);
	const handle = first.toLowerCase() + (r() < 0.5 ? last[0]!.toLowerCase() : '');
	const engs = shuffle(r, gateway);
	const raiser = pick(r, desk);
	let start = int(r, 7 * 60 + 30, 16 * 60 + 30);
	const prior = seen.get(cause.key) ?? [];
	const dayIso = cause.fast ? date : prevWorkday(date, int(r, 1, 4));
	const role = pick(r, app.roles);
	const managerFirst = pick(r, firstNames.filter((x) => x !== first));
	const s: Slots = {
		first, user: `${first} ${last}`, handle, Handle: cap(handle), role, site, site2: pick(r, sites.filter((x) => x !== site)),
		app: app.name, db: app.db, device, version, raiser, raiserFirst: raiser.split(' ')[0]!, eng: engs[0]!, eng2First: engs[1]!.split(' ')[0]!,
		appdev: pick(r, appTeam), office: pick(r, office), it: pick(r, itTeam),
		manager: `${managerFirst} ${pick(r, surnames.filter((x) => x !== last))}`, colleague: pick(r, firstNames.filter((x) => x !== first && x !== managerFirst)),
		n: String(int(r, 2, 9)), nn: String(int(r, 11, 40)), day: dayNames[weekday(dayIso)]!, dayIso, isoDate: date,
		date2: plainDate(addDays(date, -int(r, 10, 60))), time: clock(int(r, 7, 10) * 60 + int(r, 0, 3) * 15), time2: clock(int(r, 9 * 60, 17 * 60)),
		gen: String(int(r, 10, 19)), olddevice: pick(r, oldDevices), store: `${site.toLowerCase()}-stores`, kiosk: `${site.toLowerCase()}-harbour-office`,
		asset: pick(r, assets), dept: pick(r, depts), why: pick(r, redirectWhy), why2: v === 1 ? groupWhy[2]! : groupWhy[int(r, 0, 1)]!, other: String(prior.length ? pick(r, prior) : number - int(r, 9, 40)),
		wrongdate: `${plainDate(addDays(date, int(r, 40, 420)))} ${Number(date.slice(0, 4)) + (r() < 0.6 ? 1 : 0)}`
	};
	s.aRole = `${/^[aeiou]/.test(role) ? 'an' : 'a'} ${role}`;
	if (cause.key === 'secret-rotated') s.time = '09:00';
	if (cause.fast) start = Math.max(start, Number(s.time!.slice(0, 2)) * 60 + Number(s.time!.slice(3)) + int(r, 40, 120));
	let minute = start;
	s.oidcIso = cause.key === 'secret-rotated' ? date : dayIso;
	const fill = (text: string) =>
		text.replace(/\{(\w+)\}/g, (_, key: string) => {
			if (!(key in s)) throw new Error(`no slot ${key} in "${text}"`);
			return s[key]!;
		});
	const nameOf = (party: Party) => (party === 'gateway' ? s.eng! : party === 'app' ? s.appdev! : party === 'office' ? s.office! : party === 'it' ? s.it! : raiser);

	// The thread, with a clock that only moves forward.
	let day = date;
	const comments: string[] = [];
	const step = (big = false) => {
		if (big) {
			day = nextWorkday(day, int(r, 4, 9));
			minute = int(r, 8 * 60, 16 * 60);
		} else if (cause.fast && minute < 17 * 60) minute += int(r, 8, 45);
		else if (r() < 0.6 && minute < 15 * 60 + 30) minute += int(r, 12, 140);
		else {
			day = nextWorkday(day, r() < 0.8 ? 1 : 2);
			minute = int(r, 8 * 60, 16 * 60 + 30);
		}
	};
	let cut = false;
	const say = (party: Party, paragraphs: string[], big = false) => {
		if (cut) return;
		step(big);
		if (day > LAST_COMMENT) {
			cut = true;
			return;
		}
		const who = party === 'gateway' && comments.length > 2 && r() < 0.25 ? engs[1]! : nameOf(party);
		const body = paragraphs.map((paragraph) => fill(paragraph).trim()).filter(Boolean).join('\n\n');
		if (body) comments.push(`**${who}** (${roleOf[party]}) · ${shortDate(day)}, ${clock(minute)}\n\n${body}`);
	};
	const deskPool = shuffle(r, deskTails);
	const gwPool = shuffle(r, gwTails);
	const deskTail = () => deskPool.pop() ?? '';
	const gwTail = () => gwPool.pop() ?? '';
	const tangentPool = shuffle(r, tangents);
	const relayPool = shuffle(r, relays);
	const askPool = shuffle(r, askAgain);
	const impactPool = shuffle(r, family.impact);
	const updatePool = shuffle(r, family.updates);
	const impact = () => impactPool.pop() ?? '';
	const update = () => updatePool.pop() ?? '';
	const ask = () => askPool.pop() ?? 'Also:';
	const relay = () => relayPool.pop() ?? 'Answer from {site}:';
	const tangent = (chance: number) => {
		if (r() < chance && tangentPool.length) {
			const [party, text] = tangentPool.pop()!;
			say(party, [text]);
		}
	};

	// What the desk wrote.
	const clues = shuffle(r, cause.clue.map((clue) => (typeof clue === 'string' ? clue : clue[v]!))).slice(0, r() < 0.4 ? 3 : 4);
	const description: string[] = [[fill(pick(r, cause.one ? family.report : [...family.report, ...(family.many ?? [])])), r() < 0.45 ? fill(pick(r, callflow)) : ''].filter(Boolean).join(' ')];
	if (r() < 0.85) description.push(fill(pick(r, cause.story)));
	const quotes = shuffle(r, family.quotes);
	if (r() < 0.4) description.push(`From ${first}'s email to the desk:\n\n> ${quotes[0]}\n>\n> ${quotes[1]}`);
	else if (r() < 0.7) description.push(`In ${first}'s words: "${quotes[0]}"`);
	description.push(...clues.slice(0, 2).map(fill));
	description.push([pick(r, family.tried), r() < 0.6 ? impact() : ''].filter(Boolean).map(fill).join(' '));
	description.push(...clues.slice(2).map(fill));
	const notes = [
		`- Called: ${clock(start - (cause.fast ? int(r, 5, 25) : int(r, 20, 90)))} from ${site}, about ${int(r, 6, 25)} minutes`,
		`- Device: HL-${app.tag}-0${int(r, 100, 999)} (${device})`,
		`- Shift: ${pick(r, shifts)}`,
		`- Meanwhile: ${fill(pick(r, family.meanwhile))}`
	];
	if (r() < 0.7) description.push(`Call notes:\n\n${shuffle(r, notes).slice(0, int(r, 3, 4)).join('\n')}`);
	if (r() < 0.55) description.push(contacts(r, date));
	if (cause.diag && r() < 0.85) {
		description.push(`Diagnostics export from ${first}'s device:\n\n${diag(r, app, version, device, date, start, pattern, method, signIn, cause.fast)}`);
	}
	const closing = pick(r, closings);
	if (closing) description.push(closing);

	// The investigation: a wrong first guess in many threads, then the right question.
	const herrings = cause.alt.map((key) => causeByKey.get(key)!).filter((other) => other.apps.some((key) => cause.apps.includes(key)) && (!other.from || other.from <= date));
	const guesses = shuffle(r, herrings).slice(0, r() < 0.62 ? (herrings.length > 1 && r() < 0.45 ? 2 : 1) : 0);
	const muses = shuffle(r, family.muse);
	say('gateway', [`${pick(r, openers)} ${r() < 0.6 ? muses[0] : ''}`, (guesses[0] ?? cause).ask, r() < 0.45 ? pick(r, extraQs.filter((q) => !(guesses[0] ?? cause).ask.includes('diagnostics') || !q.includes('diagnostics'))) : '', r() < 0.5 ? pick(r, plans) : '']);
	if (r() < 0.8) {
		const [suggestion, outcome] = pick(r, family.tries);
		say('gateway', [`${pick(r, ['While we wait on that:', 'Something to try in the meantime.', 'Also, to rule out the simple things:'])} ${suggestion}`]);
		const fresh = cause.diag && /diagnostics export/.test(suggestion) ? diag(r, app, version, device, day, Math.min(17 * 60, minute + int(r, 30, 120)), pattern, method, signIn) : '';
		say('desk', [outcome, fresh, deskTail()]);
	}
	guesses.forEach((guess, position) => {
		say('desk', [`${relay()} ${guess.no}`, r() < 0.4 ? update() : '', deskTail()]);
		tangent(0.3);
		say('gateway', [`${pick(r, ruledOut)} ${r() < 0.5 && muses[position + 1] ? muses[position + 1] : ''}`, (guesses[position + 1] ?? cause).ask]);
	});
	say('desk', [`${relay()} ${r() < 0.25 ? pick(r, callflow) : ''}`, cause.aligned ? cause.yes[v]! : pick(r, cause.yes), r() < 0.35 ? impact() : '', deskTail()]);
	tangent(0.45);
	if (!cause.one && r() < 0.5) say('desk', [`Another call from ${site} about this: ${s.colleague} has the same, and says: "${quotes[2] ?? quotes[0]}"`]);
	const extra = shuffle(r, cause.more).slice(0, r() < 0.8 ? 3 : 2);
	if (r() < 0.4 && extra.length >= 2) {
		say('gateway', [ask(), `${extra[0]![0]} ${extra[1]![0]}`]);
		say('desk', [`${extra[0]![1]} ${extra[1]![1]}`, deskTail()]);
		extra.splice(0, 2);
	}
	for (const [question, answer] of extra) {
		say('gateway', [`${ask()} ${question}`]);
		say('desk', [answer, r() < 0.25 ? update() : '']);
	}
	tangent(0.4);
	say('gateway', [pick(r, checkIntros), pick(r, cause.check), art(cause.art, r, s, app), gwTail()]);
	tangent(0.4);

	// How it ended.
	const ends = cause.ends.filter((end) => (!end.from || end.from <= day) && (!end.until || day < end.until));
	const closed = (cause.closable === true && r() < 0.2) || ends.length === 0;
	if (closed) {
		say('desk', [update()]);
		for (const [party, text] of pick(r, closedPath)) say(party, [text], party === 'desk');
	} else {
		say(cause.who, [cause.aligned ? cause.reveal[v]! : pick(r, cause.reveal)]);
		if (r() < 0.3) say('desk', [pick(r, afterReveal)]);
		const end = pick(r, ends);
		say('desk', [pick(r, end.t), end.k === 'wait' ? pick(r, waitTails) : pick(r, confirms)]);
		if (r() < 0.75) {
			say('desk', [cause.after[0]]);
			say(cause.who === 'desk' ? 'gateway' : cause.who, [cause.after[1]]);
		}
		if (end.k === 'wait') {
			if (r() < 0.3) say('desk', [update()], true);
			if (!end.gw && r() < 0.25) say('desk', [pick(r, twistDone)], true);
		} else if (cause.one && r() < 0.2) say('desk', [pick(r, twistBack)], true);
	}
	seen.set(cause.key, [...prior, number]);

	const title = fill(pick(r, cause.one ? family.titles : [...family.titles, ...(family.manyTitles ?? [])]));
	const header = `Raised by ${raiser} (app support) on ${shortDate(date)} · ${app.name} ${version} on ${device} · database ${app.db}`;
	return [`# ESC-${number}: ${title}`, header, ...description, ...comments.map((comment) => `---\n\n${comment}`)].join('\n\n') + '\n';
};

// Which cause each escalation turns out to have: weighted, spread out, and possible on its date.
const plan = mulberry32(20261113);
const scale = ITEMS / causes.reduce((sum, cause) => sum + cause.w, 0);
const used = new Map<string, number>();
const lastAt = new Map<string, number>();
const folder = join(root, 'support', 'escalations');
mkdirSync(folder, { recursive: true });
let number = 3100;
for (let index = 0; index < ITEMS; index++) {
	const date = workdays[Math.floor((index * workdays.length) / ITEMS)]!;
	const open = causes.filter((cause) => (!cause.from || cause.from <= date) && (!cause.until || date < cause.until));
	const weight = (cause: Cause) => Math.max(0.05, cause.w * scale - (used.get(cause.key) ?? 0)) * (index - (lastAt.get(cause.key) ?? -99) < 4 ? 0.1 : 1);
	const total = open.reduce((sum, cause) => sum + weight(cause), 0);
	let roll = plan() * total;
	const cause = open.find((candidate) => (roll -= weight(candidate)) < 0) ?? open.at(-1)!;
	used.set(cause.key, (used.get(cause.key) ?? 0) + 1);
	lastAt.set(cause.key, index);
	number += int(plan, 1, 4);
	writeFileSync(join(folder, `ESC-${number}.md`), escalation(index, number, date, cause));
}
writeFileSync(
	join(folder, 'README.md'),
	`# Escalations to the gateway team\n\nThe ${ITEMS} escalations the app support desk raised to the Tidegate team between ${plainDate(FIRST_DAY)} and ${plainDate(LAST_DAY)} 2026, exported\nfrom the desk's tool, one file each, with the thread as it stood at export. The tool keeps no status, category or\nresolution fields, so none came across. Screens and tables in a thread are as their writers pasted them.\n`
);
